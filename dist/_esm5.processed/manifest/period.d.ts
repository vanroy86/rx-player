import { Subject } from "rxjs";
import { ICustomError } from "../errors";
import Adaptation, { IAdaptationArguments, IAdaptationType, IRepresentationFilter } from "./adaptation";
export declare type IManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;
export declare type IAdaptationsArguments = Partial<Record<IAdaptationType, IAdaptationArguments[]>>;
export interface ISupplementaryImageTrack {
    mimeType: string;
    url: string;
}
export interface ISupplementaryTextTrack {
    mimeType: string;
    codecs?: string;
    url: string;
    language?: string;
    languages?: string[];
    closedCaption: boolean;
}
export interface IPeriodArguments {
    id: string;
    adaptations: IAdaptationsArguments;
    start: number;
    duration?: number;
}
export default class Period {
    readonly id: string;
    readonly adaptations: IManifestAdaptations;
    duration?: number;
    start: number;
    end?: number;
    /**
     * @constructor
     * @param {Object} args
     */
    constructor(args: IPeriodArguments, warning$: Subject<Error | ICustomError>, representationFilter?: IRepresentationFilter);
    /**
     * @returns {Array.<Object>}
     */
    getAdaptations(): Adaptation[];
    /**
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType: IAdaptationType): Adaptation[];
    /**
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getAdaptation(wantedId: number | string): Adaptation | undefined;
}
