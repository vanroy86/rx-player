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
/**
 * This file allows to create AdaptationBuffers.
 *
 * An AdaptationBuffer downloads and push segment for a single Adaptation.
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrate the various RepresentationBuffer, which will
 * download and push segments for a single Representation.
 */
import objectAssign from "object-assign";
import { concat as observableConcat, merge as observableMerge, of as observableOf, ReplaySubject, timer as observableTimer, } from "rxjs";
import { catchError, distinctUntilChanged, filter, map, mergeMap, multicast, refCount, switchMap, tap, } from "rxjs/operators";
import { ErrorTypes } from "../../errors";
import log from "../../log";
import createFakeBuffer from "./create_fake_buffer";
import EVENTS from "./events_generators";
import RepresentationBuffer from "./representation_buffer";
/**
 * Create new Buffer Observable linked to the given Adaptation.
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SourceBuffer.
 *
 * It will emit various events to report its status to the caller.
 *
 * @param {Observable} clock$ - Clock at which the Buffer will check for
 * segments download
 * @param {QueuedSourceBuffer} queuedSourceBuffer - QueuedSourceBuffer used
 * to push segments and know about the current real buffer's health.
 * @param {SegmentBookkeeper} segmentBookkeeper - Used to synchronize and
 * retrieve the Segments currently present in the QueuedSourceBuffer
 * @param {Function} segmentFetcher - Function used to download segments
 * @param {Observable} wantedBufferAhead$ - Emits the buffer goal
 * @param {Object} content - Content to download
 * @param {Object} abrManager
 * @returns {Observable}
 */
export default function AdaptationBuffer(clock$, queuedSourceBuffer, segmentBookkeeper, segmentFetcher, wantedBufferAhead$, content, abrManager, options) {
    var directManualBitrateSwitching = options.manualBitrateSwitchingMode === "direct";
    var manifest = content.manifest, period = content.period, adaptation = content.adaptation;
    var abr$ = getABRForAdaptation(adaptation, abrManager, clock$).pipe(
    // equivalent to a sane shareReplay:
    // https://github.com/ReactiveX/rxjs/issues/3336
    // TODO Replace it when that issue is resolved
    multicast(function () { return new ReplaySubject(1); }), refCount());
    /**
     * Emit at each bitrate estimate done by the ABRManager
     * @type {Observable}
     */
    var bitrateEstimate$ = abr$.pipe(filter(function (_a) {
        var bitrate = _a.bitrate;
        return bitrate != null;
    }), map(function (_a) {
        var bitrate = _a.bitrate;
        return EVENTS.bitrateEstimationChange(adaptation.type, bitrate);
    }));
    /**
     * Emit the chosen representation each time it changes.
     * @type {Observable}
     */
    var estimateChanges$ = abr$.pipe(distinctUntilChanged(function (a, b) {
        return a.manual === b.manual && a.representation.id === b.representation.id;
    }));
    /**
     * @type {Observable}
     */
    var adaptationBuffer$ = estimateChanges$.pipe(switchMap(function (estimate, i) {
        // Manual switch needs an immediate feedback.
        // To do that properly, we need to reload the stream
        if (directManualBitrateSwitching && estimate.manual && i !== 0) {
            return observableOf(EVENTS.needsStreamReload());
        }
        var representation = estimate.representation;
        return observableConcat(observableOf(EVENTS.representationChange(adaptation.type, period, representation)), createRepresentationBuffer(representation));
    }));
    return observableMerge(adaptationBuffer$, bitrateEstimate$);
    /**
     * Create and returns a new RepresentationBuffer Observable, linked to the
     * given Representation.
     * @param {Representation} representation
     * @returns {Observable}
     */
    function createRepresentationBuffer(representation) {
        log.info("changing representation", adaptation.type, representation);
        return RepresentationBuffer({
            clock$: clock$,
            content: {
                representation: representation,
                adaptation: adaptation,
                period: period,
                manifest: manifest,
            },
            queuedSourceBuffer: queuedSourceBuffer,
            segmentBookkeeper: segmentBookkeeper,
            segmentFetcher: segmentFetcher,
            wantedBufferAhead$: wantedBufferAhead$,
        }).pipe(catchError(function (error) {
            // TODO only for smooth/to Delete? Do it in the stream?
            // for live adaptations, handle 412 errors as precondition-
            // failed errors, ie: we are requesting for segments before they
            // exist
            // (In case of smooth streaming, 412 errors are requests that are
            // performed to early).
            if (!manifest.isLive ||
                error.type !== ErrorTypes.NETWORK_ERROR ||
                !error.isHttpError(412)) {
                throw error;
            }
            manifest.updateLiveGap(1); // go back 1s for now
            log.warn("precondition failed", manifest.presentationLiveGap);
            return observableTimer(2000).pipe(mergeMap(function () { return createRepresentationBuffer(representation); }));
        }));
    }
}
/**
 * Returns ABR Observable.
 * @param {Object} adaptation
 * @param {Object} abrManager
 * @param {Observable} abrBaseClock$
 * @returns {Observable}
 */
function getABRForAdaptation(adaptation, abrManager, abrBaseClock$) {
    var representations = adaptation.representations;
    /**
     * Keep track of the current representation to add informations to the
     * ABR clock.
     * TODO isn't that a little bit ugly?
     * @type {Object|null}
     */
    var currentRepresentation = null;
    var abrClock$ = abrBaseClock$.pipe(map(function (tick) {
        var bitrate = currentRepresentation ?
            currentRepresentation.bitrate : undefined;
        return objectAssign({ bitrate: bitrate }, tick);
    }));
    return abrManager.get$(adaptation.type, abrClock$, representations).pipe(tap(function (_a) {
        var representation = _a.representation;
        currentRepresentation = representation;
    }));
}
// Re-export RepresentationBuffer events used by the AdaptationBufferManager
export { createFakeBuffer, };
