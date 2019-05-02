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
import { IRepresentationIndex } from "../../manifest";
export interface IContentProtection {
    systemId?: string;
    keyId: string;
}
export interface IParsedRepresentation {
    bitrate: number;
    index: IRepresentationIndex;
    id: string;
    audioSamplingRate?: string;
    audiotag?: number;
    bitsPerSample?: number;
    channels?: number;
    codecPrivateData?: string;
    codecs?: string;
    codingDependency?: boolean;
    contentProtections?: IContentProtection[];
    frameRate?: string;
    height?: number;
    maxPlayoutRate?: number;
    maximumSAPPeriod?: number;
    mimeType?: string;
    packetSize?: number;
    profiles?: string;
    qualityRanking?: number;
    samplingRate?: number;
    segmentProfiles?: string;
    width?: number;
}
export declare type IParsedAdaptations = Partial<Record<string, IParsedAdaptation[]>>;
export interface IParsedAdaptation {
    id: string;
    representations: IParsedRepresentation[];
    type: string;
    audioDescription?: boolean;
    bitstreamSwitching?: boolean;
    closedCaption?: boolean;
    language?: string;
    maxBitrate?: number;
    maxFrameRate?: number;
    maxHeight?: number;
    maxWidth?: number;
    minBitrate?: number;
    minFrameRate?: number;
    minHeight?: number;
    minWidth?: number;
    name?: string;
    normalizedLanguage?: string;
    par?: string;
    segmentAlignment?: number | boolean;
    subsegmentAlignment?: number | boolean;
}
export interface IParsedPeriod {
    id: string;
    start: number;
    end?: number;
    adaptations: IParsedAdaptations;
    duration?: number;
    bitstreamSwitching?: boolean;
}
export interface IParsedManifest {
    availabilityStartTime: number;
    duration: number;
    id: string;
    periods: IParsedPeriod[];
    transportType: string;
    isLive: boolean;
    uris: string[];
    availabilityEndTime?: number;
    maxSegmentDuration?: number;
    maxSubsegmentDuration?: number;
    minBufferTime?: number;
    minimumTime?: number;
    minimumUpdatePeriod?: number;
    presentationLiveGap?: number;
    profiles?: string;
    publishTime?: number;
    suggestedPresentationDelay?: number;
    timeShiftBufferDepth?: number;
}
