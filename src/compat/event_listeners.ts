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
 * This file provides browser-agnostic event listeners under the form of
 * RxJS Observables
 */

import {
  combineLatest as observableCombineLatest,
  defer as observableDefer,
  fromEvent as observableFromEvent,
  interval as observableInterval,
  merge as observableMerge,
  NEVER,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  mergeMap,
  startWith,
  switchMap,
} from "rxjs/operators";
import config from "../config";
import log from "../log";
import { IEventEmitter } from "../utils/event_emitter";
import {
  HTMLElement_,
  ICompatDocument,
  ICompatPictureInPictureWindow,
} from "./browser_compatibility_types";

const BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];

const INACTIVITY_DELAY = config.INACTIVITY_DELAY;
const pixelRatio = window.devicePixelRatio || 1;

/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {string} eventNameSuffix
 * @returns {Boolean}
 */
function isEventSupported(
  element : HTMLElement,
  eventNameSuffix : string
) : boolean {
  const clone = document.createElement(element.tagName);
  const eventName = "on" + eventNameSuffix;
  if (eventName in clone) {
    return true;
  } else {
    clone.setAttribute(eventName, "return;");
    return typeof (clone as any)[eventName] === "function";
  }
}

/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {Array.<string>} eventNames
 * @returns {string|undefined}
 */
function findSupportedEvent(
  element : HTMLElement,
  eventNames : string[]
) : string|undefined {
  return eventNames
    .filter((name) => isEventSupported(element, name))[0];
}

/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Array.<string>}
 */
function eventPrefixed(eventNames : string[], prefixes? : string[]) : string[] {
  return eventNames.reduce((parent : string[], name : string) =>
    parent.concat((prefixes || BROWSER_PREFIXES)
          .map((p) => p + name)), []);
}

export interface IEventEmitterLike {
  addEventListener : (eventName: string, handler: () => void) => void;
  removeEventListener: (eventName: string, handler: () => void) => void;
}

export type IEventTargetLike = HTMLElement |
                               IEventEmitterLike |
                               IEventEmitter<any>;

/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Observable}
 */
function compatibleListener<T extends Event>(
  eventNames : string[],
  prefixes? : string[]
) : (element : IEventTargetLike) => Observable<T> {
  let mem : string|undefined;
  const prefixedEvents = eventPrefixed(eventNames, prefixes);
  return (element : IEventTargetLike) => {
    // if the element is a HTMLElement we can detect
    // the supported event, and memoize it in `mem`
    if (element instanceof HTMLElement_) {
      if (typeof mem === "undefined") {
        mem = findSupportedEvent(element, prefixedEvents);
      }

      if (mem) {
        return observableFromEvent(element, mem) as Observable<T>;
      } else {
        if (__DEV__) {
          log.warn(`compat: element ${element.tagName}` +
                   " does not support any of these events: " +
                   prefixedEvents.join(", "));
        }
        return NEVER;
      }
    }

    // otherwise, we need to listen to all the events
    // and merge them into one observable sequence
    return observableMerge(...prefixedEvents.map(eventName =>
                             observableFromEvent(element, eventName))
    );
  };
}

/**
 * Returns an observable:
 *   - emitting true when the document is visible
 *   - emitting false when the document is hidden
 * @returns {Observable}
 */
function visibilityChange() : Observable<boolean> {
  let prefix : string|undefined;

  const doc = document as ICompatDocument;
  if (doc.hidden != null) {
    prefix = "";
  } else if (doc.mozHidden != null) {
    prefix = "moz";
  } else if (doc.msHidden != null) {
    prefix = "ms";
  } else if (doc.webkitHidden != null) {
    prefix = "webkit";
  }

  const hidden = prefix ? prefix + "Hidden" :
                          "hidden";
  const visibilityChangeEvent = prefix ? prefix + "visibilitychange" :
                                         "visibilitychange";
  return observableDefer(() => {
    const isHidden = document[hidden as "hidden"];
    return observableFromEvent(document, visibilityChangeEvent)
      .pipe(
        map(() => !(document[hidden as "hidden"])),
        startWith(!isHidden)
      );
  });
}

/**
 * @returns {Observable}
 */
function videoSizeChange() : Observable<unknown> {
  return observableFromEvent(window, "resize");
}

// Emit `true` when visible
const isVisible$ = visibilityChange()
  .pipe(filter((x) => x));

// Emit `false` if the page is hidden for `INACTIVITY_DELAY` seconds
const isInactive$ = visibilityChange()
  .pipe(
    debounceTime(INACTIVITY_DELAY),
    filter((x) => !x)
  );

/**
 * Emit `true` if the page is considered active.
 * `false` when considered inactive.
 * Emit the original value on subscription.
 * @returns {Observable}
 */
function isActive() : Observable<boolean> {
  return observableMerge(isVisible$, isInactive$);
}

/**
 * Get video width from Picture-in-Picture window
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipWindow
 * @returns {number}
 */
function getVideoWidthFromPIPWindow(
  mediaElement: HTMLMediaElement,
  pipWindow: ICompatPictureInPictureWindow
): number {
  const { width, height } = pipWindow;
  const videoRatio = mediaElement.clientHeight / mediaElement.clientWidth;
  const calcWidth = height / videoRatio;
  return Math.min(width, calcWidth);
}

export interface IPictureInPictureEvent {
  isEnabled : boolean;
  pipWindow : ICompatPictureInPictureWindow | null;
}

/**
 * Emit when video enters and leaves Picture-In-Picture mode.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export function onPictureInPictureEvent$(
  mediaElement: HTMLMediaElement
): Observable<IPictureInPictureEvent> {
  return observableDefer(() => {
    if ((mediaElement as any).webkitSupportsPresentationMode &&
        typeof (mediaElement as any).webkitSetPresentationMode === "function")
    {
      const isWebKitPIPEnabled =
        (mediaElement as any).webkitPresentationMode === "picture-in-picture";
      return observableFromEvent(mediaElement, "webkitpresentationmodechanged")
          .pipe(
            map(() => ({ isEnabled: (mediaElement as any)
                           .webkitPresentationMode === "picture-in-picture",
                         pipWindow: null })),
            startWith({ isEnabled: isWebKitPIPEnabled, pipWindow: null })
          );
    }

    const isPIPEnabled = (
      (document as any).pictureInPictureElement &&
      (document as any).pictureInPictureElement === mediaElement
    );
    const initialState = { isEnabled: isPIPEnabled, pipWindow: null };
    return observableMerge(
      observableFromEvent(mediaElement, "enterpictureinpicture")
        .pipe(map((evt: any) => ({ isEnabled: true,
                                   pipWindow: evt.pictureInPictureWindow }))),
      observableFromEvent(mediaElement, "leavepictureinpicture")
        .pipe(mapTo({ isEnabled: false, pipWindow: null }))
    ).pipe(startWith(initialState));
  });
}

/**
 * Returns `true` when video is considered as visible (the page is visible and/or
 * the Picture-In-Picture is activated). Returns `false` otherwise.
 * @param {Observable} pip$
 * @returns {Observable}
 */
function isVideoVisible(
  pip$ : Observable<IPictureInPictureEvent>
) : Observable<boolean> {
  return observableCombineLatest([visibilityChange(), pip$]).pipe(
    mergeMap(([ isVisible, pip ]) => {
      const videoVisible = pip.isEnabled || isVisible;
      return observableOf(videoVisible).pipe(
        debounceTime((!videoVisible) ? INACTIVITY_DELAY : 0)
      );
    }),
    distinctUntilChanged()
  );
}

/**
 * Get video width from HTML video element, or video estimated dimensions
 * when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function videoWidth$(
  mediaElement : HTMLMediaElement,
  pip$ : Observable<IPictureInPictureEvent>
) : Observable<number> {
  return observableCombineLatest([
    pip$,
    observableInterval(20000).pipe(startWith(null)),
    videoSizeChange().pipe(debounceTime(500), startWith(null)),
  ]).pipe(
    switchMap(([ pip ]) : Observable<number> => {
      if (!pip.isEnabled) {
        return observableOf(mediaElement.clientWidth * pixelRatio);
      } else if (pip.pipWindow != null) {
        const { pipWindow } = pip;
        const firstWidth = getVideoWidthFromPIPWindow(mediaElement, pipWindow);

        // RxJS typing issue (for the "as any")
        return observableFromEvent(pipWindow as any, "resize").pipe(
          startWith(firstWidth * pixelRatio),
          map(() => getVideoWidthFromPIPWindow(mediaElement, pipWindow) * pixelRatio)
        );
      } else {
        return observableOf(Infinity);
      }
    }),
    distinctUntilChanged()
  );
}

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onLoadedMetadata$ = compatibleListener(["loadedmetadata"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onSeeking$ = compatibleListener(["seeking"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onSeeked$ = compatibleListener(["seeked"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onEnded$ = compatibleListener(["ended"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onTimeUpdate$ = compatibleListener(["timeupdate"]);

/**
 * @param {HTMLElement} element
 * @returns {Observable}
 */
const onFullscreenChange$ = compatibleListener(
  ["fullscreenchange", "FullscreenChange"],

  // On IE11, fullscreen change events is called MSFullscreenChange
  BROWSER_PREFIXES.concat("MS")
);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onPlayPause$ = (mediaElement : HTMLMediaElement) : Observable<Event> =>
  observableMerge(compatibleListener(["play"])(mediaElement),
                  compatibleListener(["pause"])(mediaElement));

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onTextTrackChanges$ =
  (textTrackList : TextTrackList) : Observable<TrackEvent> =>
    observableMerge(compatibleListener<TrackEvent>(["addtrack"])(textTrackList),
                    compatibleListener<TrackEvent>(["removetrack"])(textTrackList));

/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
const onSourceOpen$ = compatibleListener(["sourceopen", "webkitsourceopen"]);

/**
 * @param {SourceBuffer} sourceBuffer
 * @returns {Observable}
 */
const onUpdate$ = compatibleListener(["update"]);

/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
const onRemoveSourceBuffers$ = compatibleListener(["onremovesourcebuffer"]);

/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
const onEncrypted$ = compatibleListener<MediaEncryptedEvent>(["encrypted", "needkey"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyMessage$ = compatibleListener<MediaKeyMessageEvent>(["keymessage", "message"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyAdded$ = compatibleListener(["keyadded", "ready"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyError$ = compatibleListener(["keyerror", "error"]);

/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
const onKeyStatusesChange$ = compatibleListener(["keystatuseschange"]);

export {
  isActive,
  isVideoVisible,
  videoWidth$,
  onPlayPause$,
  onTextTrackChanges$,
  onLoadedMetadata$,
  onSeeking$,
  onSeeked$,
  onEnded$,
  onTimeUpdate$,
  onFullscreenChange$,
  onSourceOpen$,
  onUpdate$,
  onRemoveSourceBuffers$,
  onEncrypted$,
  onKeyMessage$,
  onKeyAdded$,
  onKeyError$,
  onKeyStatusesChange$,
};
