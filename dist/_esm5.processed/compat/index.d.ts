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
import { ICompatMediaKeySystemAccess, ICompatMediaKeySystemConfiguration, ICompatTextTrack, ICompatVTTCue, isFirefox, isIE, MediaSource_, VTTCue_ } from "./constants";
import * as events from "./events";
import { exitFullscreen, isFullscreen, requestFullscreen } from "./fullscreen";
import { CustomMediaKeySystemAccess, getInitData, ICustomMediaKeys, ICustomMediaKeySession, ICustomMediaKeySystemAccess, requestMediaKeySystemAccess, setMediaKeys } from "./eme";
/**
 * Returns true if the given codec is supported by the browser's MediaSource
 * implementation.
 * @returns {Boolean}
 */
declare function isCodecSupported(codec: string): boolean;
declare function isVTTCue(cue: ICompatVTTCue | TextTrackCue): cue is ICompatVTTCue;
/**
 * Returns true if the browser has the minimum needed EME APIs to decrypt a
 * content.
 * @returns {Boolean}
 */
declare function hasEMEAPIs(): boolean;
/**
 * Returns true if the current target require the media keys to be renewed on
 * each content.
 * @returns {Boolean}
 */
declare function shouldRenewMediaKeys(): boolean;
/**
 * Returns true if the mediakeys associated to a media element should be
 * unset once the content is stopped.
 * Depends on the target.
 * @returns {Boolean}
 */
declare function shouldUnsetMediaKeys(): boolean;
/**
 * Wait for the MediaSource's sourceopen event and emit. Emit immediatelly if
 * already received.
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
declare function onSourceOpen$(mediaSource: MediaSource): Observable<Event | null>;
/**
 * Returns an observable emitting a single time, as soon as a seek is possible
 * (the metatada are loaded).
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare function hasLoadedMetadata(mediaElement: HTMLMediaElement): Observable<void>;
/**
 * Returns ane observable emitting a single time, as soon as a play is possible.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare function canPlay(mediaElement: HTMLMediaElement): Observable<void>;
/**
 * Add text track to the given media element.
 * Returns an object with the following properties:
 *   - track {TextTrack}: the added text track
 *   - trackElement {HTMLElement|undefined}: the added <track> element.
 *     undefined if no trackElement was added.
 * @param {HTMLMediaElement} mediaElement
 * @param {Boolean} hidden
 * @returns {Object}
 */
declare function addTextTrack(mediaElement: HTMLMediaElement, hidden: boolean): {
    track: ICompatTextTrack;
    trackElement?: HTMLTrackElement;
};
/**
 * firefox fix: sometimes the stream can be stalled, even if we are in a
 * buffer.
 *
 * TODO This seems to be about an old Firefox version. Delete it?
 * @param {number} time
 * @param {Object|null} currentRange
 * @param {string} state
 * @param {Boolean} isStalled
 * @returns {Boolean}
 */
declare function isPlaybackStuck(time: number, currentRange: {
    start: number;
    end: number;
} | null, state: string, isStalled: boolean): boolean;
/**
 * Clear element's src attribute.
 *
 * On IE11, element.src = "" is not sufficient as it
 * does not clear properly the current MediaKey Session.
 * Microsoft recommended to use element.removeAttr("src").
 * @param {HTMLMediaElement} element
 */
declare function clearElementSrc(element: HTMLMediaElement): void;
/**
 * Set an URL to the element's src.
 * Emit ``undefined`` when done.
 * Unlink src on unsubscription.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {string} url
 * @returns {Observable}
 */
declare function setElementSrc$(mediaElement: HTMLMediaElement, url: string): Observable<void>;
/**
 * Some browsers have a builtin API to know if it's connected at least to a
 * LAN network, at most to the internet.
 *
 * /!\ This feature can be dangerous as you can both have false positives and
 * false negatives.
 *
 * False positives:
 *   - you can still play local contents (on localhost) if isOffline == true
 *   - on some browsers isOffline might be true even if we're connected to a LAN
 *     or a router (it would mean we're just not able to connect to the
 *     Internet). So we can eventually play LAN contents if isOffline == true
 *
 * False negatives:
 *   - in some cases, we even might have isOffline at false when we do not have
 *     any connection:
 *       - in browsers that do not support the feature
 *       - in browsers running in some virtualization softwares where the
 *         network adapters are always connected.
 *
 * Use with these cases in mind.
 * @returns {Boolean}
 */
declare function isOffline(): boolean;
/**
 * Creates a cue using the best platform-specific interface available.
 *
 * @param {Number} startTime
 * @param {Number} endTime
 * @param {string} payload
 * @returns {VTTCue|TextTrackCue|null} Text track cue or null if the parameters
 * were invalid.
 */
declare function makeCue(startTime: number, endTime: number, payload: string): ICompatVTTCue | TextTrackCue | null;
/**
 * Call play on the media element on subscription and return the response as an
 * observable.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare function play$(mediaElement: HTMLMediaElement): Observable<void>;
export { CustomMediaKeySystemAccess, ICompatMediaKeySystemAccess, ICompatMediaKeySystemConfiguration, ICompatTextTrack, ICompatVTTCue, ICustomMediaKeySession, ICustomMediaKeySystemAccess, ICustomMediaKeys, MediaSource_, VTTCue_, addTextTrack, canPlay, clearElementSrc, events, exitFullscreen, getInitData, hasEMEAPIs, hasLoadedMetadata, isCodecSupported, isFirefox, isFullscreen, isIE, isOffline, isPlaybackStuck, isVTTCue, makeCue, onSourceOpen$, play$, requestFullscreen, requestMediaKeySystemAccess, setElementSrc$, setMediaKeys, shouldRenewMediaKeys, shouldUnsetMediaKeys, };
