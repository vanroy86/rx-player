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

import {
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  filter,
  ignoreElements,
  map,
  mergeMap,
  shareReplay,
  tap,
} from "rxjs/operators";
import {
  events,
  generateKeyRequest,
  getInitData,
} from "../../compat/";
import { EncryptedMediaError } from "../../errors";
import log from "../../log";
import getSession, {
  IEncryptedEvent,
} from "./get_session";
import initMediaKeys from "./init_media_keys";
import SessionEventsListener from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import {
  IEMEManagerEvent,
  IKeySystemOption,
} from "./types";
import InitDataStore from "./utils/init_data_store";

const { onEncrypted$ } = events;

/**
 * EME abstraction and event handler used to communicate with the Content-
 * Description-Module (CDM).
 *
 * The EME handler can be given one or multiple systems and will choose the
 * appropriate one supported by the user's browser.
 * @param {HTMLMediaElement} mediaElement - The MediaElement which will be
 * associated to a MediaKeys object
 * @param {Array.<Object>} keySystems - key system configuration
 * @returns {Observable}
 */
export default function EMEManager(
  mediaElement : HTMLMediaElement,
  keySystemsConfigs: IKeySystemOption[]
) : Observable<IEMEManagerEvent> {
  log.debug("EME: Starting EMEManager logic.");

   // Keep track of all initialization data handled here.
   // This is to avoid handling multiple times the same encrypted events.
  const handledInitData = new InitDataStore();

  // store the mediaKeys when ready
  const mediaKeysInfos$ = initMediaKeys(mediaElement, keySystemsConfigs)
    .pipe(shareReplay()); // cache success

  const attachedMediaKeys$ = mediaKeysInfos$.pipe(filter(evt => {
    return evt.type === "attached-media-keys";
  }));

  const encryptedEvents$ = onEncrypted$(mediaElement).pipe(
    tap((evt) => {
      log.debug("EME: Encrypted event received from media element.", evt);
    }),
    map((evt) : IEncryptedEvent => {
      const { initData, initDataType } = getInitData(evt);
      return { type: initDataType, data: initData };
    }));

  const bindSession$ = observableCombineLatest([encryptedEvents$,
                                                attachedMediaKeys$]
  ).pipe(
    /* Attach server certificate and create/reuse MediaKeySession */
    mergeMap(([encryptedEvent, mediaKeysEvent], i) => {
      const mediaKeysInfos = mediaKeysEvent.value;
      const { keySystemOptions, mediaKeys } = mediaKeysInfos;
      const { serverCertificate } = keySystemOptions;

      const { type: initDataType, data: initData } = encryptedEvent;
      if (handledInitData.has(initData, initDataType)) {
        log.debug("EME: Init data already received. Skipping it.");
        return EMPTY; // Already handled, quit
      }
      handledInitData.add(initData, initDataType);

      const session$ = getSession(encryptedEvent, mediaKeysInfos)
        .pipe(map((evt) => ({
          type: evt.type,
          value: { initData: evt.value.initData,
                   initDataType: evt.value.initDataType,
                   mediaKeySession: evt.value.mediaKeySession,
                   sessionType: evt.value.sessionType,
                   keySystemOptions: mediaKeysInfos.keySystemOptions,
                   sessionStorage: mediaKeysInfos.sessionStorage },
        })));

      if (i === 0) { // first encrypted event for the current content
        return observableMerge(
          serverCertificate != null ?
            observableConcat(setServerCertificate(mediaKeys, serverCertificate),
                             session$) :
            session$
        );
      }

      return session$;
    }),

    /* Trigger license request and manage MediaKeySession events */
    mergeMap((sessionInfosEvt) =>  {
      if (sessionInfosEvt.type === "warning") {
        return observableOf(sessionInfosEvt);
      }

      const { initData,
              initDataType,
              mediaKeySession,
              sessionType,
              keySystemOptions,
              sessionStorage } = sessionInfosEvt.value;

      const generateRequest$ = sessionInfosEvt.type !== "created-session" ?
          EMPTY :
          generateKeyRequest(mediaKeySession, initData, initDataType).pipe(
            tap(() => {
              if (sessionType === "persistent-license" && sessionStorage != null) {
                sessionStorage.add(initData, initDataType, mediaKeySession);
              }
            }),
            catchError((error: unknown) => {
              throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR",
                                            error instanceof Error ? error.toString() :
                                                                     "Unknown error");
            }),
            ignoreElements());

      return observableMerge(SessionEventsListener(mediaKeySession, keySystemOptions),
                             generateRequest$);
    }));

  return observableMerge(mediaKeysInfos$, bindSession$);
}
