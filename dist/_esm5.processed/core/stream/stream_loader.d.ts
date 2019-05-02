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
import { Observable } from "rxjs";
import Manifest from "../../manifest";
import ABRManager from "../abr";
import { IPeriodBufferManagerEvent } from "../buffer";
import { SegmentPipelinesManager } from "../pipelines";
import { ITextTrackSourceBufferOptions } from "../source_buffers";
import { IManifestUpdateEvent, ISpeedChangedEvent, IStalledEvent, IStreamClockTick, IStreamLoadedEvent, IStreamWarningEvent } from "./types";
export interface IStreamLoaderArgument {
    mediaElement: HTMLMediaElement;
    manifest: Manifest;
    clock$: Observable<IStreamClockTick>;
    speed$: Observable<number>;
    abrManager: ABRManager;
    segmentPipelinesManager: SegmentPipelinesManager<any>;
    refreshManifest: (url: string) => Observable<Manifest>;
    bufferOptions: {
        wantedBufferAhead$: Observable<number>;
        maxBufferAhead$: Observable<number>;
        maxBufferBehind$: Observable<number>;
        offlineRetry?: number;
        segmentRetry?: number;
        textTrackOptions: ITextTrackSourceBufferOptions;
        manualBitrateSwitchingMode: "seamless" | "direct";
    };
}
export declare type IStreamLoaderEvent = IManifestUpdateEvent | IStalledEvent | ISpeedChangedEvent | IStreamLoadedEvent | IStreamWarningEvent | IPeriodBufferManagerEvent;
/**
 * Returns a function allowing to load or reload the content in arguments into
 * a single or multiple MediaSources.
 * @param {Object} loadStreamArguments
 * @returns {Observable}
 */
export default function StreamLoader({ mediaElement, manifest, clock$, speed$, bufferOptions, abrManager, segmentPipelinesManager, refreshManifest, }: IStreamLoaderArgument): (mediaSource: MediaSource, position: number, autoPlay: boolean) => Observable<IStreamLoaderEvent>;
