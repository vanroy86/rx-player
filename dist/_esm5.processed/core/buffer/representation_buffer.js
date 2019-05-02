/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import objectAssign from "object-assign";
import { combineLatest as observableCombineLatest, concat as observableConcat, defer as observableDefer, EMPTY, merge as observableMerge, of as observableOf, ReplaySubject, } from "rxjs";
import { finalize, map, mapTo, mergeMap, share, switchMap, tap, } from "rxjs/operators";
import log from "../../log";
import SimpleSet from "../../utils/simple_set";
import appendDataInSourceBuffer from "./append_data";
import EVENTS from "./events_generators";
import getBufferPaddings from "./get_buffer_paddings";
import getSegmentPriority from "./get_segment_priority";
import getSegmentsNeeded from "./get_segments_needed";
import getWantedRange from "./get_wanted_range";
import shouldDownloadSegment from "./segment_filter";
/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SourceBuffer and where the playback currently is.
 *
 * Multiple RepresentationBuffer observables can be ran on the same
 * SourceBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} opt
 * @returns {Observable}
 */
export default function RepresentationBuffer(_a) {
    var clock$ = _a.clock$, // emit current playback informations
    content = _a.content, // all informations about the content we want to play
    queuedSourceBuffer = _a.queuedSourceBuffer, // allows to interact with the SourceBuffer
    segmentBookkeeper = _a.segmentBookkeeper, // keep track of what segments already are in the SourceBuffer
    segmentFetcher = _a.segmentFetcher, // allows to download new segments
    wantedBufferAhead$ = _a.wantedBufferAhead$;
    // unwrap components of the content
    var period = content.period, adaptation = content.adaptation, representation = content.representation;
    var bufferType = adaptation.type;
    var initSegment = representation.index.getInitSegment();
    // Compute paddings, then used to calculate the wanted range of Segments
    // wanted.
    var paddings = getBufferPaddings(adaptation);
    // Saved initSegment state for this representation.
    var initSegmentObject = initSegment == null ?
        { segmentData: null, segmentInfos: null, segmentOffset: 0 } : null;
    // Subject to start/restart a Buffer Queue.
    var startQueue$ = new ReplaySubject(1);
    // Segments queued for download in the BufferQueue.
    var downloadQueue = [];
    // Keep track of the informations about the pending Segment request.
    // null if no request is pending.
    var currentSegmentRequest = null;
    // Keep track of downloaded segments currently awaiting to be appended to the
    // SourceBuffer.
    //
    // This is to avoid scheduling another download for that segment.
    // The ID of each segment (segment.id) is thus added before each append and
    // removed after it.
    var sourceBufferWaitingQueue = new SimpleSet();
    /**
     * Request every Segment in the ``downloadQueue`` on subscription.
     * Emit the data of a segment when a request succeeded.
     * @returns {Observable}
     */
    function loadSegmentsFromQueue() {
        var requestNextSegment$ = observableDefer(function () {
            var currentNeededSegment = downloadQueue.shift();
            if (currentNeededSegment == null) { // queue finished
                return EMPTY;
            }
            var segment = currentNeededSegment.segment, priority = currentNeededSegment.priority;
            var request$ = segmentFetcher
                .createRequest(objectAssign({ segment: segment }, content), priority);
            currentSegmentRequest = { segment: segment, priority: priority, request$: request$ };
            var response$ = request$.pipe(mergeMap(function (fetchedSegment) {
                var initInfos = initSegmentObject &&
                    initSegmentObject.segmentInfos || undefined;
                return fetchedSegment.parse(initInfos);
            }), map(function (args) { return ({ segment: segment, value: args }); }));
            return observableConcat(response$, requestNextSegment$);
        });
        return requestNextSegment$
            .pipe(finalize(function () {
            currentSegmentRequest = null;
        }));
    }
    /**
     * Append the given segment to the SourceBuffer.
     * Emit the right event when it succeeds.
     * @param {Object} loadedSegment
     * @returns {Observable}
     */
    function appendSegment(loadedSegment) {
        return observableDefer(function () {
            var segment = loadedSegment.segment;
            if (segment.isInit) {
                initSegmentObject = loadedSegment.value;
            }
            var _a = loadedSegment.value, segmentInfos = _a.segmentInfos, segmentData = _a.segmentData, segmentOffset = _a.segmentOffset;
            if (segmentData == null) {
                // no segmentData to add here (for example, a text init segment)
                // just complete directly without appending anything
                return EMPTY;
            }
            var initSegmentData = initSegmentObject && initSegmentObject.segmentData;
            var dataToAppend = { initSegmentData: initSegmentData, segmentData: segmentData, segment: segment, segmentOffset: segmentOffset };
            var append$ = appendDataInSourceBuffer(clock$, queuedSourceBuffer, dataToAppend);
            sourceBufferWaitingQueue.add(segment.id);
            return append$.pipe(mapTo(EVENTS.addedSegment(bufferType, segment, segmentData)), tap(function () {
                if (segment.isInit) {
                    return;
                }
                var _a = segmentInfos != null ?
                    segmentInfos : segment, time = _a.time, duration = _a.duration, timescale = _a.timescale;
                // current segment timings informations are used to update
                // bufferedRanges informations
                segmentBookkeeper.insert(period, adaptation, representation, segment, time / timescale, // start
                duration != null ? (time + duration) / timescale : undefined // end
                );
            }), finalize(function () {
                sourceBufferWaitingQueue.remove(segment.id);
            }));
        });
    }
    /**
     * Perform a check-up of the current status of the RepresentationBuffer:
     *   - synchronize the SegmentBookkeeper with the current buffered
     *   - checks if the manifest should be refreshed
     *   - checks if a discontinuity is encountered
     *   - check if segments need to be downloaded
     *   - Emit a description of the current state of the buffer
     *
     * @param {Array} arr
     * @returns {Object}
     */
    function getBufferStatus(_a) {
        var timing = _a[0], bufferGoal = _a[1];
        var buffered = queuedSourceBuffer.getBuffered();
        var neededRange = getWantedRange(period, buffered, timing, bufferGoal, paddings);
        var discontinuity = getCurrentDiscontinuity(content, timing);
        var shouldRefreshManifest = representation.index
            .shouldRefresh(neededRange.start, neededRange.end);
        // /!\ Side effect to the SegmentBookkeeper
        segmentBookkeeper.synchronizeBuffered(buffered);
        var neededSegments = getSegmentsNeeded(representation, neededRange)
            .filter(function (segment) {
            return shouldDownloadSegment(segment, content, segmentBookkeeper, neededRange, sourceBufferWaitingQueue);
        })
            .map(function (segment) { return ({
            priority: getSegmentPriority(segment, timing),
            segment: segment,
        }); });
        if (initSegment != null && initSegmentObject == null) {
            neededSegments = [
                {
                    segment: initSegment,
                    priority: getSegmentPriority(initSegment, timing),
                }
            ].concat(neededSegments);
        }
        var state = (function () {
            if (!neededSegments.length) {
                return period.end != null && neededRange.end >= period.end ?
                    { type: "full-buffer", value: undefined } :
                    { type: "idle-buffer", value: undefined };
            }
            return {
                type: "need-segments",
                value: { neededSegments: neededSegments },
            };
        })();
        return { discontinuity: discontinuity, shouldRefreshManifest: shouldRefreshManifest, state: state };
    }
    /**
     * Exploit the status given by ``getBufferStatus``:
     *   - emit needed actions
     *   - mutates the downloadQueue
     *   - start/restart the current BufferQueue
     *   - emit the state of the Buffer
     * @param {Object} status
     * @returns {Observable}
     */
    function handleBufferStatus(status) {
        var discontinuity = status.discontinuity, shouldRefreshManifest = status.shouldRefreshManifest, state = status.state;
        var neededActions = getNeededActions(bufferType, discontinuity, shouldRefreshManifest);
        var downloadQueueState = updateQueueFromInternalState(state);
        return downloadQueueState.type === "idle-buffer" ? observableOf.apply(void 0, neededActions) :
            observableConcat(observableOf.apply(void 0, neededActions), observableOf(downloadQueueState));
    }
    /**
     * Update the downloadQueue and start/restart the queue depending on the
     * internalState and the current RepresentationBuffer's data.
     *
     * Returns the new state of the Downloading Queue.
     *
     * @param {Object} state
     * @returns {Object}
     */
    function updateQueueFromInternalState(state) {
        if (state.type !== "need-segments" || !state.value.neededSegments.length) {
            if (currentSegmentRequest) {
                log.debug("interrupting segment request.");
            }
            downloadQueue = [];
            startQueue$.next(); // (re-)start with an empty queue
            return state.type === "full-buffer" ?
                EVENTS.fullBuffer(bufferType) : {
                type: "idle-buffer",
                value: { bufferType: bufferType },
            };
        }
        var neededSegments = state.value.neededSegments;
        var mostNeededSegment = neededSegments[0];
        if (!currentSegmentRequest) {
            log.debug("starting downloading queue", adaptation.type);
            downloadQueue = neededSegments;
            startQueue$.next(); // restart the queue
        }
        else if (currentSegmentRequest.segment.id !== mostNeededSegment.segment.id) {
            log.debug("canceling old downloading queue and starting a new one", adaptation.type);
            downloadQueue = neededSegments;
            startQueue$.next(); // restart the queue
        }
        else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
            log.debug("updating pending request priority", adaptation.type);
            segmentFetcher.updatePriority(currentSegmentRequest.request$, mostNeededSegment.priority);
        }
        else {
            log.debug("updating downloading queue", adaptation.type);
            // Update the previous queue to be all needed segments but the first one,
            // for which a request is already pending
            var newQueue = neededSegments
                .slice() // clone previous
                .splice(1, neededSegments.length); // remove first element
            // (pending request)
            downloadQueue = newQueue;
        }
        return EVENTS.activeBuffer(bufferType);
    }
    // State Checker:
    //   - indicates when the manifest should be refreshed
    //   - indicates if a discontinuity is encountered
    //   - emit state updates
    //   - update the downloadQueue
    //   - start/restart the BufferQueue
    var bufferState$ = observableCombineLatest(clock$, wantedBufferAhead$).pipe(map(getBufferStatus), mergeMap(handleBufferStatus));
    // Buffer Queue:
    //   - download segment
    //   - append them to the SourceBuffer
    var bufferQueue$ = startQueue$.pipe(switchMap(loadSegmentsFromQueue), mergeMap(appendSegment));
    return observableMerge(bufferState$, bufferQueue$)
        .pipe(share());
}
/**
 * Emit the current discontinuity encountered.
 * Inferior or equal to 0 if no discontinuity is currently happening.
 * @param {Object} content
 * @param {Object} timing
 * @returns {number}
 */
function getCurrentDiscontinuity(_a, timing) {
    var manifest = _a.manifest, representation = _a.representation;
    return !timing.stalled || !manifest.isLive ?
        -1 : representation.index.checkDiscontinuity(timing.currentTime);
}
/**
 * @param {string} bufferType
 * @param {number} discontinuity
 * @param {boolean} shouldRefreshManifest
 * @returns {Array.<Object>}
 */
function getNeededActions(bufferType, discontinuity, shouldRefreshManifest) {
    var neededActions = [];
    if (discontinuity > 1) {
        neededActions.push(EVENTS.discontinuityEncountered(bufferType, discontinuity + 1));
    }
    if (shouldRefreshManifest) {
        neededActions.push(EVENTS.needsManifestRefresh(bufferType));
    }
    return neededActions;
}
