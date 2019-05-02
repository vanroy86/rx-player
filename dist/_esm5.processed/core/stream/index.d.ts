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
import { IKeySystemOption } from "../eme/types";
import { IManifestTransportInfos } from "../pipelines";
import { IBufferType, ITextTrackSourceBufferOptions } from "../source_buffers";
import { IEMEManagerEvent } from "./create_eme_manager";
import { IInitialTimeOptions } from "./get_initial_time";
import { IStreamLoaderEvent } from "./stream_loader";
import { IManifestReadyEvent, IReloadingStreamEvent, IStreamClockTick, IStreamWarningEvent } from "./types";
export interface IStreamOptions {
    adaptiveOptions: {
        initialBitrates: Partial<Record<IBufferType, number>>;
        manualBitrates: Partial<Record<IBufferType, number>>;
        maxAutoBitrates: Partial<Record<IBufferType, number>>;
        throttle: Partial<Record<IBufferType, Observable<number>>>;
        limitWidth: Partial<Record<IBufferType, Observable<number>>>;
    };
    autoPlay: boolean;
    bufferOptions: {
        wantedBufferAhead$: Observable<number>;
        maxBufferAhead$: Observable<number>;
        maxBufferBehind$: Observable<number>;
        manualBitrateSwitchingMode: "seamless" | "direct";
    };
    clock$: Observable<IStreamClockTick>;
    keySystems: IKeySystemOption[];
    mediaElement: HTMLMediaElement;
    networkConfig: {
        manifestRetry?: number;
        offlineRetry?: number;
        segmentRetry?: number;
    };
    speed$: Observable<number>;
    startAt?: IInitialTimeOptions;
    textTrackOptions: ITextTrackSourceBufferOptions;
    transport: IManifestTransportInfos;
    url: string;
}
export declare type IStreamEvent = IManifestReadyEvent | IStreamLoaderEvent | IEMEManagerEvent | IReloadingStreamEvent | IStreamWarningEvent;
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
export default function Stream({ adaptiveOptions, autoPlay, bufferOptions, clock$, keySystems, mediaElement, networkConfig, speed$, startAt, textTrackOptions, transport, url, }: IStreamOptions): Observable<IStreamEvent>;
