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
import {
  BehaviorSubject,
  concat as observableConcat,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
} from "rxjs";
import {
  catchError,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  startWith,
  switchMap,
  take,
} from "rxjs/operators";
import { formatError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
} from "../../../manifest";
import { getLeftSizeOfRange } from "../../../utils/ranges";
import WeakMapMemory from "../../../utils/weak_map_memory";
import ABRManager from "../../abr";
import { SegmentPipelinesManager } from "../../pipelines";
import SourceBuffersManager, {
  IBufferType,
  ITextTrackSourceBufferOptions,
  QueuedSourceBuffer,
} from "../../source_buffers";
import AdaptationBuffer from "../adaptation";
import EVENTS from "../events_generators";
import SegmentBookkeeper from "../segment_bookkeeper";
import {
  IAdaptationBufferEvent,
  IBufferWarningEvent,
  IPeriodBufferEvent,
} from "../types";
import createEmptyBuffer from "./create_empty_adaptation_buffer";
import getAdaptationSwitchStrategy from "./get_adaptation_switch_strategy";

export interface IPeriodBufferClockTick {
  currentTime : number; // the current position we are in the video in s
  duration : number; // duration of the HTMLMediaElement
  isLive : boolean; // If true, we're playing a live content
  isPaused: boolean; // If true, the player is on pause
  liveGap? : number; // gap between the current position and the live edge of
                     // the content. Not set for non-live contents
  readyState : number; // readyState of the HTMLMediaElement
  speed : number; // playback rate at which the content plays
  stalled : object|null; // if set, the player is currently stalled
  wantedTimeOffset : number; // offset in s to add to currentTime to obtain the
                             // position we actually want to download from
}

export interface IPeriodBufferArguments {
  abrManager : ABRManager;
  bufferType : IBufferType;
  clock$ : Observable<IPeriodBufferClockTick>;
  content : { manifest : Manifest;
              period : Period; };
  garbageCollectors : WeakMapMemory<QueuedSourceBuffer<unknown>, Observable<never>>;
  segmentBookkeepers : WeakMapMemory<QueuedSourceBuffer<unknown>, SegmentBookkeeper>;
  segmentPipelinesManager : SegmentPipelinesManager<any>;
  sourceBuffersManager : SourceBuffersManager;
  options: { manualBitrateSwitchingMode : "seamless" | "direct";
             offlineRetry? : number;
             segmentRetry? : number;
             textTrackOptions? : ITextTrackSourceBufferOptions; };
  wantedBufferAhead$ : BehaviorSubject<number>;
}

/**
 * Create single PeriodBuffer Observable:
 *   - Lazily create (or reuse) a SourceBuffer for the given type.
 *   - Create a Buffer linked to an Adaptation each time it changes, to
 *     download and append the corresponding Segments in the SourceBuffer.
 *   - Announce when the Buffer is full or is awaiting new Segments through
 *     events
 * @param {Object} args
 * @returns {Observable}
 */
export default function PeriodBuffer({
  abrManager,
  bufferType,
  clock$,
  content,
  garbageCollectors,
  segmentBookkeepers,
  segmentPipelinesManager,
  sourceBuffersManager,
  options,
  wantedBufferAhead$,
} : IPeriodBufferArguments) : Observable<IPeriodBufferEvent> {
  const { period } = content;

  // Emits the chosen Adaptation for the current type.
  // `null` when no Adaptation is chosen (e.g. no subtitles)
  const adaptation$ = new ReplaySubject<Adaptation|null>(1);
  return adaptation$.pipe(
    switchMap((adaptation) => {
      if (adaptation == null) {
        log.info(`Buffer: Set no ${bufferType} Adaptation`, period);
        const previousQSourceBuffer = sourceBuffersManager.get(bufferType);
        let cleanBuffer$ : Observable<unknown>;

        if (previousQSourceBuffer != null) {
          log.info(`Buffer: Clearing previous ${bufferType} SourceBuffer`);
          cleanBuffer$ = previousQSourceBuffer.removeBuffer(period.start,
                                                            period.end || Infinity);
        } else {
          cleanBuffer$ = observableOf(null);
        }

        return observableConcat<IPeriodBufferEvent>(
          cleanBuffer$.pipe(mapTo(EVENTS.adaptationChange(bufferType, null, period))),
          createEmptyBuffer(clock$, wantedBufferAhead$, bufferType, { period })
        );
      }

      log.info(`Buffer: Updating ${bufferType} adaptation`, adaptation, period);

      const newBuffer$ = clock$.pipe(
        take(1),
        mergeMap((tick) => {
          const qSourceBuffer = createOrReuseQueuedSourceBuffer(sourceBuffersManager,
                                                                bufferType,
                                                                adaptation,
                                                                options);
          const strategy = getAdaptationSwitchStrategy(qSourceBuffer.getBuffered(),
                                                       period,
                                                       bufferType,
                                                       tick);
          if (strategy.type === "needs-reload") {
            return observableOf(EVENTS.needsMediaSourceReload(tick));
          }

          const cleanBuffer$ = strategy.type === "clean-buffer" ?
            observableConcat(...strategy.value.map(({ start, end }) =>
                               qSourceBuffer.removeBuffer(start, end))
                            ).pipe(ignoreElements()) :
            EMPTY;

          const bufferGarbageCollector$ = garbageCollectors.get(qSourceBuffer);
          const adaptationBuffer$ = createAdaptationBuffer(adaptation, qSourceBuffer);

          return observableConcat(cleanBuffer$,
                                  observableMerge(adaptationBuffer$,
                                                  bufferGarbageCollector$));
        }));

      return observableConcat<IPeriodBufferEvent>(
        observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)),
        newBuffer$
      );
    }),
    startWith(EVENTS.periodBufferReady(bufferType, period, adaptation$))
  );

  /**
   * @param {Object} adaptation
   * @param {Object} qSourceBuffer
   * @returns {Observable}
   */
  function createAdaptationBuffer<T>(
    adaptation : Adaptation,
    qSourceBuffer : QueuedSourceBuffer<T>
  ) : Observable<IAdaptationBufferEvent<T>|IBufferWarningEvent> {
    const { manifest } = content;
    const segmentBookkeeper = segmentBookkeepers.get(qSourceBuffer);
    const adaptationBufferClock$ = clock$.pipe(map(tick => {
      const buffered = qSourceBuffer.getBuffered();
      return objectAssign({},
                          tick,
                          { bufferGap: getLeftSizeOfRange(buffered,
                                                          tick.currentTime) });
    }));
    return AdaptationBuffer({ abrManager,
                              clock$: adaptationBufferClock$,
                              content: { manifest, period, adaptation },
                              options,
                              queuedSourceBuffer: qSourceBuffer,
                              segmentBookkeeper,
                              segmentPipelinesManager,
                              wantedBufferAhead$ })
    .pipe(catchError((error : unknown) => {
      // non native buffer should not impact the stability of the
      // player. ie: if a text buffer sends an error, we want to
      // continue playing without any subtitles
      if (!SourceBuffersManager.isNative(bufferType)) {
        log.error(`Buffer: Custom ${bufferType} buffer crashed. Aborting it.`, error);
        sourceBuffersManager.disposeSourceBuffer(bufferType);

        const formattedError = formatError(error, {
          defaultCode: "NONE",
          defaultReason: "Unknown `AdaptationBuffer` error",
        });
        return observableConcat<IAdaptationBufferEvent<T>|IBufferWarningEvent>(
          observableOf(EVENTS.warning(formattedError)),
          createEmptyBuffer(clock$, wantedBufferAhead$, bufferType, { period })
        );
      }
      log.error(`Buffer: Native ${bufferType} buffer crashed. Stopping playback.`, error);
      throw error;
    }));
  }
}

/**
 * @param {string} bufferType
 * @param {Object} adaptation
 * @returns {Object}
 */
function createOrReuseQueuedSourceBuffer<T>(
  sourceBuffersManager : SourceBuffersManager,
  bufferType : IBufferType,
  adaptation : Adaptation,
  options: { textTrackOptions? : ITextTrackSourceBufferOptions }
) : QueuedSourceBuffer<T> {
  const currentQSourceBuffer = sourceBuffersManager.get(bufferType);
  if (currentQSourceBuffer != null) {
    log.info("Buffer: Reusing a previous SourceBuffer for the type", bufferType);
    return currentQSourceBuffer;
  }
  const codec = getFirstDeclaredMimeType(adaptation);
  const sbOptions = bufferType === "text" ?  options.textTrackOptions : undefined;
  return sourceBuffersManager.createSourceBuffer(bufferType, codec, sbOptions);
}

/**
 * Get mimetype string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation : Adaptation) : string {
  const { representations } = adaptation;
  return (representations[0] && representations[0].getMimeTypeString()) || "";
}
