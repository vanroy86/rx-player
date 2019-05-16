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
/**
 * This file is used to abstract the notion of text, audio and video tracks
 * switching for an easier API management.
 */
import { BehaviorSubject, Subject } from "rxjs";
import { Adaptation, Period } from "../../manifest";
export declare type IAudioTrackPreference = null | {
    language: string;
    audioDescription: boolean;
};
export declare type ITextTrackPreference = null | {
    language: string;
    closedCaption: boolean;
};
export interface ITMAudioTrack {
    language: string;
    normalized: string;
    audioDescription: boolean;
    id: number | string;
}
export interface ITMTextTrack {
    language: string;
    normalized: string;
    closedCaption: boolean;
    id: number | string;
}
interface ITMVideoRepresentation {
    id: string | number;
    bitrate: number;
    width?: number;
    height?: number;
    codec?: string;
    frameRate?: string;
}
export interface ITMVideoTrack {
    id: number | string;
    representations: ITMVideoRepresentation[];
}
export interface ITMAudioTrackListItem extends ITMAudioTrack {
    active: boolean;
}
export interface ITMTextTrackListItem extends ITMTextTrack {
    active: boolean;
}
export interface ITMVideoTrackListItem extends ITMVideoTrack {
    active: boolean;
}
/**
 * Manage audio and text tracks for all active periods.
 * Chose the audio and text tracks for each period and record this choice.
 * @class TrackManager
 */
export default class TrackManager {
    private _periods;
    private _preferredAudioTracks;
    private _preferredTextTracks;
    private _audioChoiceMemory;
    private _textChoiceMemory;
    private _videoChoiceMemory;
    /**
     * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
     * of audio track preferences
     * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
     * of text track preferences
     */
    constructor(defaults: {
        preferredAudioTracks: BehaviorSubject<IAudioTrackPreference[]>;
        preferredTextTracks: BehaviorSubject<ITextTrackPreference[]>;
    });
    /**
     * Add Subject to choose Adaptation for new "audio" or "text" Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     * @param {Subject.<Object|null>} adaptation$ - A subject through which the
     * choice will be given
     */
    addPeriod(bufferType: "audio" | "text" | "video", period: Period, adaptation$: Subject<Adaptation | null>): void;
    /**
     * Remove Subject to choose an "audio" or "text" Adaptation for a Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     */
    removePeriod(bufferType: "audio" | "text" | "video", period: Period): void;
    resetPeriods(): void;
    /**
     * Update the choice of all added Periods based on:
     *   1. What was the last chosen adaptation
     *   2. If not found, the preferences
     */
    update(): void;
    /**
     * Emit initial audio Adaptation through the given Subject based on:
     *   - the preferred audio tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    setInitialAudioTrack(period: Period): void;
    /**
     * Emit initial text Adaptation through the given Subject based on:
     *   - the preferred text tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    setInitialTextTrack(period: Period): void;
    /**
     * Emit initial video Adaptation through the given Subject based on:
     *   - the preferred video tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    setInitialVideoTrack(period: Period): void;
    /**
     * Set audio track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     */
    setAudioTrackByID(period: Period, wantedId: string): void;
    /**
     * Set text track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     */
    setTextTrackByID(period: Period, wantedId: string): void;
    /**
     * Set video track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     *
     * @throws Error - Throws if the period given has not been added
     * @throws Error - Throws if the given id is not found in any video adaptation
     * of the given Period.
     */
    setVideoTrackByID(period: Period, wantedId: string): void;
    /**
     * Disable the given audio track for a given Period.
     *
     * @param {Period} period - The concerned Period.
     *
     * @throws Error - Throws if the period given has not been added
     */
    disableAudioTrack(period: Period): void;
    /**
     * Disable the current text track for a given period.
     *
     * @param {Period} period - The concerned Period.
     *
     * @throws Error - Throws if the period given has not been added
     */
    disableTextTrack(period: Period): void;
    /**
     * Returns an object describing the chosen audio track for the given audio
     * Period.
     *
     * Returns null is the the current audio track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The audio track chosen for this Period
     */
    getChosenAudioTrack(period: Period): ITMAudioTrack | null;
    /**
     * Returns an object describing the chosen text track for the given text
     * Period.
     *
     * Returns null is the the current text track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The text track chosen for this Period
     */
    getChosenTextTrack(period: Period): ITMTextTrack | null;
    /**
     * Returns an object describing the chosen video track for the given video
     * Period.
     *
     * Returns null is the the current video track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The video track chosen for this Period
     */
    getChosenVideoTrack(period: Period): ITMVideoTrack | null;
    /**
     * Returns all available audio tracks for a given Period, as an array of
     * objects.
     *
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks(period: Period): ITMAudioTrackListItem[];
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * @param {Period} period
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(period: Period): ITMTextTrackListItem[];
    /**
     * Returns all available video tracks for a given Period, as an array of
     * objects.
     *
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks(period: Period): ITMVideoTrackListItem[];
    private _updateAudioTrackChoices;
    private _updateTextTrackChoices;
    private _updateVideoTrackChoices;
}
export {};
