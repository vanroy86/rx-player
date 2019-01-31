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
import { BehaviorSubject, Observable } from "rxjs";
import { ISegment, Representation } from "../../manifest";
import { IBufferType } from "../source_buffers";
export interface IABREstimation {
    bitrate: undefined | number;
    manual: boolean;
    representation: Representation;
    urgent: boolean;
    lastStableBitrate?: number;
}
interface IRepresentationChooserClockTick {
    downloadBitrate: number | undefined;
    bufferGap: number;
    currentTime: number;
    speed: number;
    duration: number;
}
interface IProgressEventValue {
    duration: number;
    id: string;
    size: number;
    timestamp: number;
    totalSize: number;
}
declare type IRequest = IProgressRequest | IBeginRequest | IEndRequest;
interface IProgressRequest {
    type: IBufferType;
    event: "progress";
    value: IProgressEventValue;
}
interface IBeginRequest {
    type: IBufferType;
    event: "requestBegin";
    value: {
        id: string;
        time: number;
        duration: number;
        requestTimestamp: number;
    };
}
interface IEndRequest {
    type: IBufferType;
    event: "requestEnd";
    value: {
        id: string;
    };
}
interface IBufferEventRepresentationChange {
    type: "representation-buffer-change";
    value: {
        representation: Representation;
    };
}
interface IBufferEventAddedSegment {
    type: "added-segment";
    value: {
        buffered: TimeRanges;
    };
}
export declare type IABRBufferEvents = IBufferEventRepresentationChange | IBufferEventAddedSegment;
interface IRepresentationChooserOptions {
    limitWidth$?: Observable<number>;
    throttle$?: Observable<number>;
    initialBitrate?: number;
    manualBitrate?: number;
    maxAutoBitrate?: number;
}
/**
 * Choose the right Representation thanks to "choosers":
 *
 * - The throughput chooser choose the Representation relatively to the current
 *   user's bandwidth.
 *
 * - The buffer-based chooser choose the Representation relatively to the
 *   current size of the buffer.
 *
 * To have more control over which Representation should be choosen, you can
 * also use the following exposed subjects:
 *
 *   - manualBitrate$ {Subject}: Set the bitrate manually, if no representation
 *     is found with the given bitrate. An immediately inferior one will be
 *     taken instead. If still, none are found, the representation with the
 *     minimum bitrate will be taken.
 *     Set it to a negative value to go into automatic bitrate mode.
 *
 *   - maxBitrate$ {Subject}: Set the maximum automatic bitrate. If the manual
 *     bitrate is not set / set to a negative value, this will be the maximum
 *     switch-able bitrate. If no representation is found inferior or equal to
 *     this bitrate, the representation with the minimum bitrate will be taken.
 *
 * @class RepresentationChooser
 */
export default class RepresentationChooser {
    readonly manualBitrate$: BehaviorSubject<number>;
    readonly maxAutoBitrate$: BehaviorSubject<number>;
    private readonly _dispose$;
    private readonly _limitWidth$;
    private readonly _throttle$;
    private readonly _networkAnalyzer;
    private readonly _pendingRequests;
    private _mediaElement;
    /**
     * Score estimator for the current Representation.
     * null when no representation has been chosen yet.
     * @type {BehaviorSubject}
     */
    private _scoreEstimator;
    /**
     * @param {Object} options
     */
    constructor(mediaElement: HTMLMediaElement, options: IRepresentationChooserOptions);
    get$(representations: Representation[], clock$: Observable<IRepresentationChooserClockTick>, bufferEvents$: Observable<IABRBufferEvents>): Observable<IABREstimation>;
    /**
     * Add bandwidth and "maintainability score" estimate by giving:
     *   - the duration of the request, in s
     *   - the size of the request in bytes
     *   - the content downloaded
     * @param {number} duration
     * @param {number} size
     * @param {Object} content
     */
    addEstimate(duration: number, size: number, content: {
        segment: ISegment;
    }): void;
    /**
     * Add informations about a new pending request.
     * This can be useful if the network bandwidth drastically changes to infer
     * a new bandwidth through this single request.
     * @param {string} id
     * @param {Object} payload
     */
    addPendingRequest(id: string, payload: IBeginRequest): void;
    /**
     * Add progress informations to a pending request.
     * Progress objects are a key part to calculate the bandwidth from a single
     * request, in the case the user's bandwidth changes drastically while doing
     * it.
     * @param {string} id
     * @param {Object} progress
     */
    addRequestProgress(id: string, progress: IProgressRequest): void;
    /**
     * Remove a request previously set as pending through the addPendingRequest
     * method.
     * @param {string} id
     */
    removePendingRequest(id: string): void;
    /**
     * Free up the resources used by the RepresentationChooser.
     */
    dispose(): void;
}
export { IRequest, IRepresentationChooserClockTick, IRepresentationChooserOptions, };
