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
import { combineLatest as observableCombineLatest, concat as observableConcat, merge as observableMerge, of as observableOf, Subject, } from "rxjs";
import { ignoreElements, map, mergeMap, startWith, switchMap, takeUntil, tap, } from "rxjs/operators";
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import throttle from "../../utils/rx-throttle";
import ABRManager from "../abr";
import { createManifestPipeline, SegmentPipelinesManager, } from "../pipelines";
import createEMEManager from "./create_eme_manager";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime from "./get_initial_time";
import createMediaErrorManager from "./media_error_manager";
import StreamLoader from "./stream_loader";
/**
 * Returns pipeline options based on the global config and the user config.
 * @param {Object} networkConfig
 * @returns {Object}
 */
function getManifestPipelineOptions(networkConfig) {
    return {
        maxRetry: networkConfig.manifestRetry != null ?
            networkConfig.manifestRetry : config.DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
        maxRetryOffline: networkConfig.offlineRetry != null ?
            networkConfig.offlineRetry : config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
    };
}
/**
 * Central part of the player. Play a given stream described by the given
 * manifest with given options.
 *
 * On subscription:
 *  - Creates the MediaSource and attached sourceBuffers instances.
 *  - download the content's manifest
 *  - Perform EME management if needed
 *  - get Buffers for each active adaptations.
 *  - give choice of the adaptation to the caller (e.g. to choose a language)
 *  - returns Observable emitting notifications about the stream lifecycle.
 * @param {Object} args
 * @returns {Observable}
 */
export default function Stream(_a) {
    var adaptiveOptions = _a.adaptiveOptions, autoPlay = _a.autoPlay, bufferOptions = _a.bufferOptions, clock$ = _a.clock$, keySystems = _a.keySystems, mediaElement = _a.mediaElement, networkConfig = _a.networkConfig, speed$ = _a.speed$, startAt = _a.startAt, textTrackOptions = _a.textTrackOptions, transport = _a.transport, url = _a.url;
    var reloadedStreamBecauseOfMediaErrors = 0;
    // Subject through which warnings will be sent
    var warning$ = new Subject();
    // Fetch and parse the manifest from the URL given.
    // Throttled to avoid doing multiple simultaneous requests.
    var fetchManifest = throttle(createManifestPipeline(transport, getManifestPipelineOptions(networkConfig), warning$));
    // Subject through which network metrics will be sent by the segment
    // pipelines to the ABR manager.
    var network$ = new Subject();
    // Subject through which each request progression will be sent by the
    // segment pipelines to the ABR manager.
    var requestsInfos$ = new Subject();
    // Creates pipelines for downloading segments.
    var segmentPipelinesManager = new SegmentPipelinesManager(transport.pipelines, requestsInfos$, network$, warning$);
    // Create ABR Manager, which will choose the right "Representation" for a
    // given "Adaptation".
    var abrManager = new ABRManager(requestsInfos$, network$, adaptiveOptions);
    // Create EME Manager, an observable which will manage every EME-related
    // issue.
    var emeManager$ = createEMEManager(mediaElement, keySystems);
    // Translate errors coming from the media element into RxPlayer errors
    // through a throwing Observable.
    var mediaErrorManager$ = createMediaErrorManager(mediaElement);
    // Start the whole Stream.
    var stream$ = observableCombineLatest(openMediaSource(mediaElement), fetchManifest(url)).pipe(mergeMap(function (_a) {
        var mediaSource = _a[0], manifest = _a[1];
        var loadStream = StreamLoader({
            mediaElement: mediaElement,
            manifest: manifest,
            clock$: clock$,
            speed$: speed$,
            abrManager: abrManager,
            segmentPipelinesManager: segmentPipelinesManager,
            refreshManifest: fetchManifest,
            bufferOptions: objectAssign({
                textTrackOptions: textTrackOptions,
                offlineRetry: networkConfig.offlineRetry,
                segmentRetry: networkConfig.segmentRetry,
            }, bufferOptions),
        });
        log.debug("calculating initial time");
        var initialTime = getInitialTime(manifest, startAt);
        log.debug("initial time calculated:", initialTime);
        var reloadStreamSubject$ = new Subject();
        var reloadStreamAfterMediaError$ = mediaErrorManager$.pipe(tap(function (_a) {
            var fatal = _a.fatal, errorDetail = _a.errorDetail;
            if (fatal || reloadedStreamBecauseOfMediaErrors > 3) {
                log.error("stream: media element MEDIA_ERR(" + errorDetail + ")");
                throw new MediaError(errorDetail, null, true);
            }
            reloadedStreamBecauseOfMediaErrors++;
            log.warn("stream: relaunching stream after MEDIA_ERR_DECODE");
            reloadStreamSubject$.next(true);
        }), ignoreElements());
        var onStreamLoaderEvent = streamLoaderEventProcessor(reloadStreamSubject$);
        var reloadStream$ = reloadStreamSubject$.pipe(switchMap(function (reloadCauseOfError) {
            var currentPosition = mediaElement.currentTime;
            var autoPlayWhenReload = reloadCauseOfError || !mediaElement.paused;
            return openMediaSource(mediaElement).pipe(mergeMap(function (newMS) {
                return loadStream(newMS, currentPosition, autoPlayWhenReload);
            }), map(onStreamLoaderEvent), startWith(EVENTS.reloadingStream()));
        }));
        var initialLoad$ = observableConcat(observableOf(EVENTS.manifestReady(abrManager, manifest)), loadStream(mediaSource, initialTime, autoPlay).pipe(takeUntil(reloadStreamSubject$), map(onStreamLoaderEvent)));
        return observableMerge(reloadStreamAfterMediaError$, initialLoad$, reloadStream$);
    }));
    return observableMerge(stream$, emeManager$, warning$.pipe(map(EVENTS.warning)));
}
/**
 * Generate function reacting to StreamLoader events.
 * @param {Subject} reloadStreamSubject$
 * @returns {Function}
 */
function streamLoaderEventProcessor(reloadStreamSubject$) {
    /**
     * React to StreamLoader events.
     * @param {Object} evt
     * @returns {Object}
     */
    return function onStreamLoaderEvent(evt) {
        if (evt.type === "needs-stream-reload") {
            reloadStreamSubject$.next(false);
        }
        return evt;
    };
}
