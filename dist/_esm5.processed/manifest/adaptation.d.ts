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
import { Subject } from "rxjs";
import { ICustomError } from "../errors";
import Representation, { IRepresentationArguments } from "./representation";
export declare type IAdaptationType = "video" | "audio" | "text" | "image";
export declare const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[];
interface IRepresentationInfos {
    bufferType: IAdaptationType;
    language?: string;
    isAudioDescription?: boolean;
    isClosedCaption?: boolean;
    normalizedLanguage?: string;
}
export declare type IRepresentationFilter = (representation: Representation, adaptationInfos: IRepresentationInfos) => boolean;
export interface IAdaptationArguments {
    representations: IRepresentationArguments[];
    type: IAdaptationType;
    audioDescription?: boolean;
    closedCaption?: boolean;
    id?: number | string;
    language?: string;
    manuallyAdded?: boolean;
    normalizedLanguage?: string;
}
/**
 * Normalized Adaptation structure.
 * @class Adaptation
 */
export default class Adaptation {
    readonly id: string | number;
    readonly representations: Representation[];
    readonly type: IAdaptationType;
    isAudioDescription?: boolean;
    isClosedCaption?: boolean;
    language?: string;
    manuallyAdded?: boolean;
    normalizedLanguage?: string;
    /**
     * @constructor
     * @param {Object} args
     */
    constructor(args: IAdaptationArguments, warning$: Subject<Error | ICustomError>, representationFilter?: IRepresentationFilter);
    /**
     * @returns {Array.<Number>}
     */
    getAvailableBitrates(): number[];
    /**
     * @param {Number|string} wantedId
     * @returns {Representation}
     */
    getRepresentation(wantedId: number | string): Representation | undefined;
    /**
     * @param {Number} bitrate
     * @returns {Array.<Representations>|null}
     */
    getRepresentationsForBitrate(bitrate: number): Representation[] | null;
}
export {};
