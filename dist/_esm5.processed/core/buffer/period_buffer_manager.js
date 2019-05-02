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
import { concat as observableConcat, EMPTY, merge as observableMerge, of as observableOf, ReplaySubject, Subject, } from "rxjs";
import { catchError, exhaustMap, filter, ignoreElements, map, mapTo, mergeMap, share, switchMap, take, takeUntil, tap, } from "rxjs/operators";
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import arrayIncludes from "../../utils/array-includes";
import InitializationSegmentCache from "../../utils/initialization_segment_cache";
import SortedList from "../../utils/sorted_list";
import WeakMapMemory from "../../utils/weak_map_memory";
import SourceBufferManager, { BufferGarbageCollector, getBufferTypes, } from "../source_buffers";
import ActivePeriodEmitter from "./active_period_emitter";
import AdaptationBuffer from "./adaptation_buffer";
import areBuffersComplete from "./are_buffers_complete";
import createFakeBuffer from "./create_fake_buffer";
import EVENTS from "./events_generators";
import getAdaptationSwitchStrategy from "./get_adaptation_switch_strategy";
import SegmentBookkeeper from "./segment_bookkeeper";
var MAXIMUM_MAX_BUFFER_AHEAD = config.MAXIMUM_MAX_BUFFER_AHEAD, MAXIMUM_MAX_BUFFER_BEHIND = config.MAXIMUM_MAX_BUFFER_BEHIND, DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR = config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR, DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE = config.DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;
/**
 * Create and manage the various Buffer Observables needed for the content to
 * stream:
 *
 *   - Create or dispose SourceBuffers depending on the chosen adaptations.
 *
 *   - Concatenate Buffers for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Emit events as Period or Adaptations change or as new Period are
 *     prepared.
 *
 * Here multiple buffers can be created at the same time to allow smooth
 * transitions between periods.
 * To do this, we dynamically create or destroy buffers as they are needed.
 * @param {Object} content
 * @param {Observable} clock$ - Emit position informations
 * @param {Object} abrManager - Emit bitrate estimation and best Representation
 * to play.
 * @param {Object} sourceBufferManager - Will be used to lazily create
 * SourceBuffer instances associated with the current content.
 * @param {Object} segmentPipelinesManager - Download segments
 * @param {Object} options
 * @returns {Observable}
 *
 * TODO Special case for image Buffer, where we want data for EVERY active
 * periods.
 *
 * TODO Special garbage collection for text and image buffers, as we want to
 * clean it for potentially very long sessions.
 */
export default function PeriodBufferManager(content, clock$, abrManager, sourceBufferManager, segmentPipelinesManager, options) {
    var manifest = content.manifest, initialPeriod = content.initialPeriod;
    var wantedBufferAhead$ = options.wantedBufferAhead$, maxBufferAhead$ = options.maxBufferAhead$, maxBufferBehind$ = options.maxBufferBehind$;
    /**
     * Keep track of a unique BufferGarbageCollector created per
     * QueuedSourceBuffer.
     * @type {WeakMapMemory}
     */
    var garbageCollectors = new WeakMapMemory(function (qSourceBuffer) {
        var bufferType = qSourceBuffer.bufferType;
        var defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ?
            MAXIMUM_MAX_BUFFER_BEHIND[bufferType] : Infinity;
        var defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ?
            MAXIMUM_MAX_BUFFER_AHEAD[bufferType] : Infinity;
        return BufferGarbageCollector({
            queuedSourceBuffer: qSourceBuffer,
            clock$: clock$.pipe(map(function (tick) { return tick.currentTime; })),
            maxBufferBehind$: maxBufferBehind$
                .pipe(map(function (val) { return Math.min(val, defaultMaxBehind); })),
            maxBufferAhead$: maxBufferAhead$
                .pipe(map(function (val) { return Math.min(val, defaultMaxAhead); })),
        });
    });
    /**
     * Keep track of a unique segmentBookkeeper created per
     * QueuedSourceBuffer.
     * @type {WeakMapMemory}
     */
    var segmentBookkeepers = new WeakMapMemory(function () {
        return new SegmentBookkeeper();
    });
    var addPeriodBuffer$ = new Subject();
    var removePeriodBuffer$ = new Subject();
    var bufferTypes = getBufferTypes();
    /**
     * Every PeriodBuffers for every possible types
     * @type {Array.<Observable>}
     */
    var buffersArray = bufferTypes
        .map(function (bufferType) {
        return manageEveryBuffers(bufferType, initialPeriod)
            .pipe(tap(function (evt) {
            if (evt.type === "periodBufferReady") {
                addPeriodBuffer$.next(evt.value);
            }
            else if (evt.type === "periodBufferCleared") {
                removePeriodBuffer$.next(evt.value);
            }
        }), share());
    });
    /**
     * Emits the active Period every time it changes
     * @type {Observable}
     */
    var activePeriod$ = ActivePeriodEmitter(bufferTypes, addPeriodBuffer$, removePeriodBuffer$)
        .pipe(filter(function (period) { return !!period; }));
    /**
     * Emits the activePeriodChanged events every time the active Period changes.
     * @type {Observable}
     */
    var activePeriodChanged$ = activePeriod$
        .pipe(tap(function (period) {
        log.info("new active period", period);
    }), map(function (period) { return EVENTS.activePeriodChanged(period); }));
    /**
     * Emits an "end-of-stream" event once every PeriodBuffer are complete.
     * @type {Observable}
     */
    var streamHasEnded$ = areBuffersComplete.apply(void 0, buffersArray).pipe(map(function (areComplete) {
        return areComplete ? EVENTS.endOfStream() : EVENTS.resumeStream();
    }));
    return observableMerge.apply(void 0, [activePeriodChanged$].concat(buffersArray, [streamHasEnded$]));
    /**
     * Manage creation and removal of Buffers for every Periods.
     *
     * Works by creating consecutive buffers through the
     * manageConsecutivePeriodBuffers function, and restarting it when the clock
     * goes out of the bounds of these buffers.
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     * @returns {Observable}
     */
    function manageEveryBuffers(bufferType, basePeriod) {
        /**
         * Keep a SortedList for cases such as seeking ahead/before the buffers
         * already created.
         * When that happens, interrupt the previous buffers and create one back
         * from the new initial period.
         * @type {SortedList}
         */
        var periodList = new SortedList(function (a, b) { return a.start - b.start; });
        /**
         * Returns true if the given time is either:
         *   - less than the start of the chronologically first Period
         *   - more than the end of the chronologically last Period
         * @param {number} time
         * @returns {boolean}
         */
        function isOutOfPeriodList(time) {
            var head = periodList.head();
            var last = periodList.last();
            if (head == null || last == null) { // if no period
                return true;
            }
            return head.start > time ||
                (last.end || Infinity) < time;
        }
        // Destroy the current set of consecutive buffers.
        // Used when the clocks goes out of the bounds of those, e.g. when the user
        // seeks.
        // We can then re-create consecutive buffers, from the new point in time.
        var destroyCurrentBuffers = new Subject();
        // trigger warnings when the wanted time is before or after the manifest's
        // segments
        var outOfManifest$ = clock$.pipe(mergeMap(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            var position = wantedTimeOffset + currentTime;
            if (position < manifest.getMinimumPosition()) {
                var warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", null, false);
                return observableOf(EVENTS.warning(warning));
            }
            else if (position > manifest.getMaximumPosition()) {
                var warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST", null, false);
                return observableOf(EVENTS.warning(warning));
            }
            return EMPTY;
        }));
        // Restart the current buffer when the wanted time is in another period
        // than the ones already considered
        var restartBuffers$ = clock$.pipe(filter(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            return !!manifest.getPeriodForTime(wantedTimeOffset + currentTime) &&
                isOutOfPeriodList(wantedTimeOffset + currentTime);
        }), take(1), tap(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            log.info("Current position out of the bounds of the active periods," +
                "re-creating buffers.", bufferType, currentTime + wantedTimeOffset);
            destroyCurrentBuffers.next();
        }), mergeMap(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            var newInitialPeriod = manifest
                .getPeriodForTime(currentTime + wantedTimeOffset);
            if (newInitialPeriod == null) {
                throw new MediaError("MEDIA_TIME_NOT_FOUND", null, true);
            }
            else {
                // Note: For this to work, manageEveryBuffers should always emit the
                // "periodBufferReady" event for the new InitialPeriod synchronously
                return manageEveryBuffers(bufferType, newInitialPeriod);
            }
        }));
        var currentBuffers$ = manageConsecutivePeriodBuffers(bufferType, basePeriod, destroyCurrentBuffers).pipe(tap(function (message) {
            if (message.type === "periodBufferReady") {
                periodList.add(message.value.period);
            }
            else if (message.type === "periodBufferCleared") {
                periodList.removeElement(message.value.period);
            }
        }), share() // as always, with side-effects
        );
        return observableMerge(currentBuffers$, restartBuffers$, outOfManifest$);
    }
    /**
     * Manage creation and removal of Buffers for consecutive Periods.
     *
     * This function is called recursively for each successive Periods as needed.
     *
     * This function does not guarantee creation/destruction of the right Buffers
     * when the user seeks or rewind in the content.
     * It only manages regular playback, another layer should be used to manage
     * those cases.
     *
     * You can know about buffers creation and destruction respectively through
     * the "periodBufferReady" and "periodBufferCleared" events.
     *
     * The "periodBufferReady" related to the given period should be sent synchronously
     * on subscription.
     * Further "periodBufferReady" for further Periods should be sent each time the
     * Buffer for the previous Buffer is full.
     *
     * Buffers for each Period are cleared ("periodBufferCleared" event) either:
     *   - when it has finished to play (currentTime is after it)
     *   - when one of the older Buffers becomes active again, in which case the
     *     Buffers coming after will be cleared from the newest to the oldest.
     *   - when the destroy$ observable emits, in which case every created Buffer
     *     here will be cleared from the newest to the oldest.
     *
     * TODO The code here can surely be greatly simplified.
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     * @param {Observable} destroy$ - Emit when/if all created Buffer from this
     * point should be destroyed.
     * @returns {Observable}
     */
    function manageConsecutivePeriodBuffers(bufferType, basePeriod, destroy$) {
        log.info("creating new Buffer for", bufferType, basePeriod);
        // Emits the chosen adaptation for the current type.
        var adaptation$ = new ReplaySubject(1);
        // Emits the Period of the next Period Buffer when it can be created.
        var createNextPeriodBuffer$ = new Subject();
        // Emits when the Buffers for the next Periods should be destroyed, if
        // created.
        var destroyNextBuffers$ = new Subject();
        // Emits when the current position goes over the end of the current buffer.
        var endOfCurrentBuffer$ = clock$
            .pipe(filter(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            return !!basePeriod.end && (currentTime + wantedTimeOffset) >= basePeriod.end;
        }));
        // Create Period Buffer for the next Period.
        var nextPeriodBuffer$ = createNextPeriodBuffer$
            .pipe(exhaustMap(function (nextPeriod) {
            return manageConsecutivePeriodBuffers(bufferType, nextPeriod, destroyNextBuffers$);
        }));
        // Allows to destroy each created Buffer, from the newest to the oldest,
        // once destroy$ emits.
        var destroyAll$ = destroy$.pipe(take(1), tap(function () {
            // first complete createNextBuffer$ to allow completion of the
            // nextPeriodBuffer$ observable once every further Buffers have been
            // cleared.
            createNextPeriodBuffer$.complete();
            // emit destruction signal to the next Buffer first
            destroyNextBuffers$.next();
            destroyNextBuffers$.complete(); // we do not need it anymore
        }), share() // share side-effects
        );
        // Will emit when the current buffer should be destroyed.
        var killCurrentBuffer$ = observableMerge(endOfCurrentBuffer$, destroyAll$);
        var periodBuffer$ = createPeriodBuffer(bufferType, basePeriod, adaptation$).pipe(mergeMap(function (evt) {
            var type = evt.type;
            if (type === "full-buffer") {
                /**
                 * The Period coming just after the current one.
                 * @type {Period|undefined}
                 */
                var nextPeriod = manifest.getPeriodAfter(basePeriod);
                if (nextPeriod == null) {
                    // no more period, emits  event
                    return observableOf(EVENTS.bufferComplete(bufferType));
                }
                else {
                    // current buffer is full, create the next one if not
                    createNextPeriodBuffer$.next(nextPeriod);
                }
            }
            else if (type === "active-buffer") {
                // current buffer is active, destroy next buffer if created
                destroyNextBuffers$.next();
            }
            return observableOf(evt);
        }), share());
        // Buffer for the current Period.
        var currentBuffer$ = observableConcat(observableOf(EVENTS.periodBufferReady(bufferType, basePeriod, adaptation$)), periodBuffer$.pipe(takeUntil(killCurrentBuffer$)), observableOf(EVENTS.periodBufferCleared(bufferType, basePeriod))
            .pipe(tap(function () {
            log.info("destroying buffer for", bufferType, basePeriod);
        })));
        return observableMerge(currentBuffer$, nextPeriodBuffer$, destroyAll$.pipe(ignoreElements()));
    }
    /**
     * Create single PeriodBuffer Observable:
     *   - Lazily create (or reuse) a SourceBuffer for the given type.
     *   - Create a Buffer linked to an Adaptation each time it changes, to
     *     download and append the corresponding Segments in the SourceBuffer.
     *   - Announce when the Buffer is full or is awaiting new Segments through
     *     events
     *
     * /!\ This Observable has multiple side-effects (creation of SourceBuffers,
     * downloading and appending of Segments etc.) on subscription.
     *
     * @param {string} bufferType
     * @param {Period} period - The period concerned
     * @param {Observable} adaptation$ - Emit the chosen adaptation.
     * Emit null to deactivate a type of adaptation
     * @returns {Observable}
     */
    function createPeriodBuffer(bufferType, period, adaptation$) {
        return adaptation$.pipe(switchMap(function (adaptation) {
            if (adaptation == null) {
                log.info("set no " + bufferType + " Adaptation", period);
                var cleanBuffer$ = void 0;
                if (sourceBufferManager.has(bufferType)) {
                    log.info("clearing previous " + bufferType + " SourceBuffer");
                    var _qSourceBuffer = sourceBufferManager.get(bufferType);
                    cleanBuffer$ = _qSourceBuffer
                        .removeBuffer(period.start, period.end || Infinity)
                        .pipe(mapTo(null));
                }
                else {
                    cleanBuffer$ = observableOf(null);
                }
                return observableConcat(cleanBuffer$.pipe(mapTo(EVENTS.adaptationChange(bufferType, null, period))), createFakeBuffer(clock$, wantedBufferAhead$, bufferType, { manifest: manifest, period: period }));
            }
            log.info("updating " + bufferType + " adaptation", adaptation, period);
            var newBuffer$ = clock$.pipe(take(1), mergeMap(function (tick) {
                var qSourceBuffer = createOrReuseQueuedSourceBuffer(bufferType, adaptation);
                var strategy = getAdaptationSwitchStrategy(qSourceBuffer.getBuffered(), period, bufferType, tick);
                if (strategy.type === "reload-stream") {
                    return observableOf(EVENTS.needsStreamReload());
                }
                var cleanBuffer$ = strategy.type === "clean-buffer" ?
                    observableConcat.apply(void 0, strategy.value.map(function (_a) {
                        var start = _a.start, end = _a.end;
                        return qSourceBuffer.removeBuffer(start, end);
                    })).pipe(ignoreElements()) : EMPTY;
                var bufferGarbageCollector$ = garbageCollectors.get(qSourceBuffer);
                var adaptationBuffer$ = createAdaptationBuffer(bufferType, period, adaptation, qSourceBuffer);
                return observableConcat(cleanBuffer$, observableMerge(adaptationBuffer$, bufferGarbageCollector$));
            }));
            return observableConcat(observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)), newBuffer$);
        }));
    }
    /**
     * @param {string} bufferType
     * @param {Object} adaptation
     * @returns {Object}
     */
    function createOrReuseQueuedSourceBuffer(bufferType, adaptation) {
        if (sourceBufferManager.has(bufferType)) {
            log.info("reusing a previous SourceBuffer for the type", bufferType);
            return sourceBufferManager.get(bufferType);
        }
        var codec = getFirstDeclaredMimeType(adaptation);
        var sbOptions = bufferType === "text" ? options.textTrackOptions : undefined;
        return sourceBufferManager.createSourceBuffer(bufferType, codec, sbOptions);
    }
    /**
     * @param {string} bufferType
     * @param {Object} period
     * @param {Object} adaptation
     * @param {Object} qSourceBuffer
     * @returns {Observable}
     */
    function createAdaptationBuffer(bufferType, period, adaptation, qSourceBuffer) {
        var segmentBookkeeper = segmentBookkeepers.get(qSourceBuffer);
        var pipelineOptions = getPipelineOptions(bufferType, options.segmentRetry, options.offlineRetry);
        var pipeline = segmentPipelinesManager
            .createPipeline(bufferType, pipelineOptions);
        return AdaptationBuffer(clock$, qSourceBuffer, segmentBookkeeper, pipeline, wantedBufferAhead$, { manifest: manifest, period: period, adaptation: adaptation }, abrManager, options).pipe(catchError(function (error) {
            // non native buffer should not impact the stability of the
            // player. ie: if a text buffer sends an error, we want to
            // continue streaming without any subtitles
            if (!SourceBufferManager.isNative(bufferType)) {
                log.error("custom buffer: ", bufferType, "has crashed. Aborting it.", error);
                sourceBufferManager.disposeSourceBuffer(bufferType);
                return observableConcat(observableOf(EVENTS.warning(error)), createFakeBuffer(clock$, wantedBufferAhead$, bufferType, { manifest: manifest, period: period }));
            }
            log.error("native " + bufferType + " buffer has crashed. Stopping playback.", error);
            throw error;
        }));
    }
}
/**
 * @param {string} bufferType
 * @param {number|undefined} retry
 * @param {number|undefined} offlineRetry
 * @returns {Object} - Options to give to the Pipeline
 */
function getPipelineOptions(bufferType, retry, offlineRetry) {
    var cache = arrayIncludes(["audio", "video"], bufferType) ?
        new InitializationSegmentCache() : undefined;
    var maxRetry;
    var maxRetryOffline;
    if (bufferType === "image") {
        maxRetry = 0; // Deactivate BIF fetching if it fails
    }
    else {
        maxRetry = retry != null ?
            retry : DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;
    }
    maxRetryOffline = offlineRetry != null ?
        offlineRetry : DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;
    return {
        cache: cache,
        maxRetry: maxRetry,
        maxRetryOffline: maxRetryOffline,
    };
}
/**
 * Get mimetype string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation) {
    var representations = adaptation.representations;
    return (representations[0] && representations[0].getMimeTypeString()) || "";
}
