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
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  identity,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
  TimeoutError,
} from "rxjs";
import {
  catchError,
  concatMap,
  map,
  mapTo,
  mergeMap,
  startWith,
  takeUntil,
  timeout,
} from "rxjs/operators";
import {
  events,
  ICustomMediaKeySession,
} from "../../compat";
import {
  EncryptedMediaError,
  ErrorTypes,
  ICustomError,
  isKnownError,
} from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import retryObsWithBackoff from "../../utils/rx-retry_with_backoff";
import tryCatch from "../../utils/rx-try_catch";
import {
  IEMEWarningEvent,
  IKeySystemOption,
  IMediaKeySessionHandledEvents,
  TypedArray,
} from "./types";

const { onKeyError$,
        onKeyMessage$,
        onKeyStatusesChange$ } = events;

const KEY_STATUSES = { EXPIRED: "expired",
                       INTERNAL_ERROR: "internal-error",
                       OUTPUT_RESTRICTED: "output-restricted" };

/**
 * @param {Error|Object} error
 * @returns {Error|Object}
 */
function licenseErrorSelector(error : unknown) : ICustomError {
  if (isKnownError(error)) {
    if (error.type === ErrorTypes.ENCRYPTED_MEDIA_ERROR) {
      return error;
    }
  }

  return new EncryptedMediaError("KEY_LOAD_ERROR",
                                 error instanceof Error ? error.toString() :
                                                          "`getLicense` failed");
}

/**
 * listen to "message" events from session containing a challenge
 * blob and map them to licenses using the getLicense method from
 * selected keySystem.
 * @param {MediaKeySession} session
 * @param {Object} keySystem
 * @returns {Observable}
 */
export default function handleSessionEvents(
  session: MediaKeySession|ICustomMediaKeySession,
  keySystem: IKeySystemOption
) : Observable<IMediaKeySessionHandledEvents | IEMEWarningEvent> {
  log.debug("EME: Handle message events", session);

  const sessionWarningSubject$ = new Subject<IEMEWarningEvent>();
  const { getLicenseConfig = {}, fallbackOn = {} } = keySystem;
  const getLicenseRetryOptions = { totalRetry: getLicenseConfig.retry != null ?
                                                 getLicenseConfig.retry :
                                                 2,
                                   retryDelay: 200,

                                   errorSelector: licenseErrorSelector,
                                   onRetry: (error: unknown) =>
                                     sessionWarningSubject$.next({
                                       type: "warning",
                                       value: licenseErrorSelector(error),
                                     }) };

  const keyErrors : Observable<never> = onKeyError$(session)
    .pipe(map((error) => {
      throw new EncryptedMediaError("KEY_ERROR", error.type);
    }));

  const keyStatusesChanges : Observable< IMediaKeySessionHandledEvents |
                                         IEMEWarningEvent > =
    onKeyStatusesChange$(session)
      .pipe(mergeMap((keyStatusesEvent: Event) => {
        log.debug("EME: keystatuseschange event", session, keyStatusesEvent);

        const warnings : IEMEWarningEvent[] = [];
        const blacklistedKeyIDs : ArrayBuffer[] = [];
        (session.keyStatuses as any).forEach((_arg1 : unknown, _arg2 : unknown) => {
          const [keyStatus, keyId] = (() => {
            return (typeof _arg1  === "string" ? [_arg1, _arg2] :
                                                 [_arg2, _arg1]
                   ) as [MediaKeyStatus, ArrayBuffer];
          })();

          switch (keyStatus) {
            case KEY_STATUSES.EXPIRED: {
              const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                                    "A decryption key expired");

              if (keySystem.throwOnLicenseExpiration !== false) {
                throw error;
              }
              warnings.push({ type: "warning", value: error });
              break;
            }

            case KEY_STATUSES.INTERNAL_ERROR: {
              const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                                    "An invalid key status has been " +
                                                    "encountered: " + keyStatus);
              if (fallbackOn.keyInternalError !== true) {
                throw error;
              }
              warnings.push({ type: "warning", value: error });
              blacklistedKeyIDs.push(keyId);
              break;
            }

            case KEY_STATUSES.OUTPUT_RESTRICTED: {
              const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                                    "An invalid key status has been " +
                                                    "encountered: " + keyStatus);
              if (fallbackOn.keyOutputRestricted !== true) {
                throw error;
              }
              warnings.push({ type: "warning", value: error });
              blacklistedKeyIDs.push(keyId);
              break;
            }
          }
        });

        const warnings$ = warnings.length ? observableOf(...warnings) :
                                            EMPTY;

        const blackListUpdate$ = blacklistedKeyIDs.length > 0 ?
          observableOf({ type: "blacklist-key" as const,
                         value: blacklistedKeyIDs }) :
          EMPTY;

        const handledKeyStatusesChange$ = tryCatch(() => {
          return keySystem && keySystem.onKeyStatusesChange ?
                   castToObservable(
                     keySystem.onKeyStatusesChange(keyStatusesEvent, session)
                   ) as Observable<TypedArray|ArrayBuffer|null> :
                   EMPTY;
        }, undefined).pipe(
          map(licenseObject => ({ type: "key-status-change-handled" as const,
                                  value : { session, license: licenseObject } })),
          catchError((error: unknown) => {
            let message;
            if (error instanceof Error) {
              message = error.toString();
            } else if (error != null &&
                       typeof (error as { message : string }).message === "string")
            {
              message = (error as { message : string }).message;
            } else {
              message = "Unknown `onKeyStatusesChange` error";
            }
            throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", message);
          })
        );
        return observableConcat(warnings$, blackListUpdate$, handledKeyStatusesChange$);
      }));

  const keyMessages$ : Observable<IMediaKeySessionHandledEvents> =
    onKeyMessage$(session).pipe(mergeMap((messageEvent: MediaKeyMessageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType ||
                          "license-request";

      log.debug(`EME: Event message type ${messageType}`, session, messageEvent);

      const getLicense$ = observableDefer(() => {
        const getLicense = keySystem.getLicense(message, messageType);
        const getLicenseTimeout = getLicenseConfig.timeout != null ?
          getLicenseConfig.timeout :
          10 * 1000;
        return (castToObservable(getLicense) as Observable<TypedArray|ArrayBuffer|null>)
          .pipe(
            getLicenseTimeout >= 0 ? timeout(getLicenseTimeout) :
                                     identity /* noop */,
            catchError((error : unknown) : never => {
              if (error instanceof TimeoutError) {
                throw new EncryptedMediaError("KEY_LOAD_TIMEOUT",
                                              "The license server took more " +
                                              "than 10 seconds to respond.");
              }
              if (error instanceof Error) {
                throw error;
              }
              throw new Error("An error occured when calling `getLicense`.");
            })
        );
      });

      return retryObsWithBackoff(getLicense$, getLicenseRetryOptions)
        .pipe(map(licenseObject => ({
          type: "key-message-handled" as const,
          value : { session, license: licenseObject },
        })));
    }));

  const sessionUpdates = observableMerge(keyMessages$, keyStatusesChanges)
    .pipe(
      concatMap((
        evt : IMediaKeySessionHandledEvents | IEMEWarningEvent
      ) : Observable<IMediaKeySessionHandledEvents | IEMEWarningEvent > => {
          if (evt.type !== "key-message-handled" &&
              evt.type !== "key-status-change-handled")
          {
            return observableOf(evt);
          }

          const license = evt.value.license;

          if (license == null) {
            log.info("EME: No license given, skipping session.update");
            return observableOf(evt);
          }

          log.debug("EME: Update session", evt);
          return castToObservable(session.update(license)).pipe(
            catchError((error: unknown) => {
              const reason = error instanceof Error ? error.toString() :
                                                      "`session.update` failed";
              throw new EncryptedMediaError("KEY_UPDATE_ERROR", reason);
            }),
            mapTo({ type: "session-updated" as const,
                    value: { session, license }, }),
            startWith(evt)
          );
        }));

  const sessionEvents : Observable<IMediaKeySessionHandledEvents |
                                   IEMEWarningEvent> =
    observableMerge(sessionUpdates, keyErrors, sessionWarningSubject$);

  return session.closed ?
           sessionEvents.pipe(takeUntil(castToObservable(session.closed))) :
           sessionEvents;
}
