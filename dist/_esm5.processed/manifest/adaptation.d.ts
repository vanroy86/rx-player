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
import { ICustomError } from "../errors";
import Representation, { IRepresentationArguments } from "./representation";
export declare type IAdaptationType = "video" | "audio" | "text" | "image";
export declare const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[];
export interface IRepresentationInfos {
    bufferType: IAdaptationType;
    language?: string;
    isAudioDescription?: boolean;
    isClosedCaption?: boolean;
    normalizedLanguage?: string;
}
export declare type IRepresentationFilter = (representation: Representation, adaptationInfos: IRepresentationInfos) => boolean;
export interface IAdaptationArguments {
    id: string;
    representations: IRepresentationArguments[];
    type: IAdaptationType;
    audioDescription?: boolean;
    closedCaption?: boolean;
    language?: string;
    manuallyAdded?: boolean;
}
/**
 * Normalized Adaptation structure.
 * An Adaptation describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
export default class Adaptation {
    readonly id: string;
    readonly representations: Representation[];
    readonly type: IAdaptationType;
    isAudioDescription?: boolean;
    isClosedCaption?: boolean;
    language?: string;
    normalizedLanguage?: string;
    manuallyAdded: boolean;
    readonly parsingErrors: Array<Error | ICustomError>;
    /**
     * @param {Object} args
     * @param {Function|undefined} [representationFilter]
     */
    constructor(args: IAdaptationArguments, representationFilter?: IRepresentationFilter);
    /**
     * Returns unique bitrate for every Representation in this Adaptation.
     * @returns {Array.<Number>}
     */
    getAvailableBitrates(): number[];
    /**
     * Returns the Representation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getRepresentation(wantedId: number | string): Representation | undefined;
}
