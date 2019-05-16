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
import EventEmitter from "../utils/event_emitter";
import Adaptation, { IAdaptationType, IRepresentationFilter } from "./adaptation";
import Period, { IPeriodArguments } from "./period";
declare type ManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;
interface ISupplementaryImageTrack {
    mimeType: string;
    url: string;
}
interface ISupplementaryTextTrack {
    mimeType: string;
    codecs?: string;
    url: string;
    language?: string;
    languages?: string[];
    closedCaption: boolean;
}
interface IManifestArguments {
    id: string;
    isLive: boolean;
    periods: IPeriodArguments[];
    transportType: string;
    availabilityStartTime?: number;
    baseURL?: string;
    clockOffset?: number;
    duration?: number;
    lifetime?: number;
    maximumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    minimumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    suggestedPresentationDelay?: number;
    uris?: string[];
}
interface IManifestParsingOptions {
    supplementaryTextTracks?: ISupplementaryTextTrack[];
    supplementaryImageTracks?: ISupplementaryImageTrack[];
    representationFilter?: IRepresentationFilter;
}
export interface IManifestEvents {
    manifestUpdate: null;
}
/**
 * Normalized Manifest structure.
 * @class Manifest
 */
export default class Manifest extends EventEmitter<IManifestEvents> {
    id: string;
    transport: string;
    adaptations: ManifestAdaptations;
    readonly periods: Period[];
    isLive: boolean;
    uris: string[];
    suggestedPresentationDelay?: number;
    baseURL?: string;
    lifetime?: number;
    availabilityStartTime?: number;
    minimumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    maximumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    parsingErrors: Array<Error | ICustomError>;
    private _duration;
    private _clockOffset;
    /**
     * @param {Object} args
     */
    constructor(args: IManifestArguments, options: IManifestParsingOptions);
    /**
     * Returns Period encountered at the given time.
     * Returns undefined if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Period|undefined}
     */
    getPeriodForTime(time: number): Period | undefined;
    /**
     * Returns period coming just after a given period.
     * Returns undefined if not found.
     * @param {Period} period
     * @returns {Period|null}
     */
    getPeriodAfter(period: Period): Period | null;
    /**
     * Returns the duration of the whole content described by that Manifest.
     * @returns {Number}
     */
    getDuration(): number | undefined;
    /**
     * Returns the most important URL from which the Manifest can be refreshed.
     * @returns {string|undefined}
     */
    getUrl(): string | undefined;
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptations(): Adaptation[];
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType: IAdaptationType): Adaptation[];
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptation(wantedId: number | string): Adaptation | undefined;
    /**
     * Update the current manifest properties
     * @param {Object} Manifest
     */
    update(newManifest: Manifest): void;
    /**
     * Get minimum position currently defined by the Manifest, in seconds.
     * @returns {number}
     */
    getMinimumPosition(): number;
    /**
     * Get maximum position currently defined by the Manifest, in seconds.
     * @returns {number}
     */
    getMaximumPosition(): number;
    /**
     * If true, this Manifest is currently synchronized with the server's clock.
     * @returns {Boolean}
     */
    hasClockSynchronization(): boolean;
    /**
     * Add supplementary image Adaptation(s) to the manifest.
     * @private
     * @param {Object|Array.<Object>} imageTracks
     */
    private addSupplementaryImageAdaptations;
    /**
     * Add supplementary text Adaptation(s) to the manifest.
     * @private
     * @param {Object|Array.<Object>} textTracks
     */
    private addSupplementaryTextAdaptations;
}
export { IManifestArguments, IManifestParsingOptions, ISupplementaryImageTrack, ISupplementaryTextTrack, };
