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
import Adaptation, { IAdaptationType, IRepresentationFilter } from "./adaptation";
import Period, { IPeriodArguments } from "./period";
import Representation from "./representation";
import IRepresentationIndex, { ISegment } from "./representation_index";
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
    availabilityStartTime?: number;
    duration: number;
    isLive: boolean;
    minimumTime?: number;
    id: string;
    periods: IPeriodArguments[];
    presentationLiveGap?: number;
    suggestedPresentationDelay?: number;
    timeShiftBufferDepth?: number;
    transportType: string;
    uris: string[];
}
interface IManifestParsingOptions {
    supplementaryTextTracks?: ISupplementaryTextTrack[];
    supplementaryImageTracks?: ISupplementaryImageTrack[];
    representationFilter?: IRepresentationFilter;
}
/**
 * Normalized Manifest structure.
 * @class Manifest
 */
export default class Manifest {
    readonly id: string;
    readonly transport: string;
    readonly adaptations: ManifestAdaptations;
    readonly periods: Period[];
    readonly isLive: boolean;
    uris: string[];
    suggestedPresentationDelay?: number;
    availabilityStartTime?: number;
    minimumTime?: number;
    presentationLiveGap?: number;
    timeShiftBufferDepth?: number;
    private _duration;
    /**
     * @constructor
     * @param {Object} args
     */
    constructor(args: IManifestArguments, warning$: Subject<Error | ICustomError>, options: IManifestParsingOptions);
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
     * @returns {Number}
     */
    getDuration(): number;
    /**
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
     * @param {number} delta
     */
    updateLiveGap(delta: number): void;
    /**
     * Update the current manifest properties
     * @param {Object} Manifest
     */
    update(newManifest: Manifest): void;
    /**
     * Get minimum position currently defined by the Manifest.
     * @returns {number}
     */
    getMinimumPosition(): number;
    /**
     * Get maximum position currently defined by the Manifest.
     * @returns {number}
     */
    getMaximumPosition(): number;
    /**
     * Get minimum AND maximum positions currently defined by the manifest.
     * @returns {Array.<number>}
     */
    getCurrentPositionLimits(): [number, number];
    /**
     * Add supplementary image Adaptation(s) to the manifest.
     * @param {Object|Array.<Object>} imageTracks
     */
    private addSupplementaryImageAdaptations;
    /**
     * Add supplementary text Adaptation(s) to the manifest.
     * @param {Object|Array.<Object>} textTracks
     */
    private addSupplementaryTextAdaptations;
}
export { Period, Adaptation, Representation, IManifestArguments, IManifestParsingOptions, IRepresentationFilter, IRepresentationIndex, ISegment, ISupplementaryImageTrack, ISupplementaryTextTrack, };
