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
  Observable,
} from "rxjs";
import config from "../../config";
import {
  RequestError,
  RequestErrorTypes
} from "../../errors";
import log from "../../log";
import {
  IRequestDataChunk,
  IRequestOptions,
  IRequestProgress,
  IRequestResponse,
} from "./types";

const { DEFAULT_REQUEST_TIMEOUT } = config;

// const DEFAULT_RESPONSE_TYPE : XMLHttpRequestResponseType = "json";

// /**
//  * @param {string} data
//  * @returns {Object|null}
//  */
// function toJSONForIE(data : string) : unknown|null {
//   try {
//     return JSON.parse(data);
//   } catch (e) {
//     return null;
//   }
// }

//
// overloading to the max
function fetchRequest(options:
  IRequestOptions<undefined | null | "" | "text", false | undefined>
): Observable<IRequestResponse<string, "text"> | IRequestProgress>;
function fetchRequest(options: IRequestOptions<undefined | null | "" | "text", true>):
  Observable<IRequestResponse<string, "text">>;
function fetchRequest(options: IRequestOptions<"arraybuffer", false | undefined>):
  Observable<
    IRequestResponse<ArrayBuffer, "arraybuffer"> |
    IRequestDataChunk<ArrayBuffer, "arraybuffer"> |
    IRequestProgress
  >;
function fetchRequest(options: IRequestOptions<"arraybuffer", true>):
  Observable<IRequestResponse<ArrayBuffer, "arraybuffer">>;
function fetchRequest(options: IRequestOptions<"document", false | undefined>):
  Observable<IRequestResponse<Document, "document"> | IRequestProgress>;
function fetchRequest(options: IRequestOptions<"document", true>):
  Observable<IRequestResponse<Document, "document">>;
function fetchRequest(options: IRequestOptions<"json", false | undefined>):
  Observable<IRequestResponse<object, "json"> | IRequestProgress>;
function fetchRequest(options: IRequestOptions<"json", true>):
  Observable<IRequestResponse<object, "json">>;
function fetchRequest(options: IRequestOptions<"blob", false | undefined>):
  Observable<IRequestResponse<Blob, "blob"> | IRequestProgress>;
function fetchRequest(options: IRequestOptions<"blob", true>):
  Observable<IRequestResponse<Blob, "blob">>;
function fetchRequest<T>(
  options: IRequestOptions<
    XMLHttpRequestResponseType | null | undefined, false | undefined
  >
): Observable<
  IRequestResponse<T, XMLHttpRequestResponseType> | IRequestProgress
>;
function fetchRequest<T>(
  options: IRequestOptions<XMLHttpRequestResponseType | null | undefined, true>
): Observable<IRequestResponse<T, XMLHttpRequestResponseType>>;

function fetchRequest<T>(
  options: IRequestOptions<
    XMLHttpRequestResponseType | null | undefined, boolean | undefined
  >
): Observable<
  IRequestResponse<T, XMLHttpRequestResponseType> |
  IRequestProgress |
  IRequestDataChunk<T, XMLHttpRequestResponseType>
> {
  const headers: Headers =
    typeof (window as any).Headers === "function" ?
      new (window as any).Headers() : null;

  if (options.headers != null) {
    const headerNames = Object.keys(options.headers);
    for (let i = 0; i < headerNames.length; i++) {
      const headerName = headerNames[i];
      headers.append(headerName, options.headers[headerName]);
    }
  }

  return new Observable((obs) => {
  let timeouted = false;

  const sendingTime = performance.now();
  let lastSentTime = sendingTime;

    const abortController: AbortController | null =
      typeof (window as any).AbortController === "function" ?
        new (window as any).AbortController() : null;

    /**
     * Abort current request by triggering AbortController signal.
     * @returns {void}
     */
    function abortRequest(): void {
      if (abortController) {
        return abortController.abort();
      }
      log.warn("Fetch Request: AbortController API not available.");
    }

    const timeout = window.setTimeout(() => {
      timeouted = true;
      abortRequest();
    }, options.timeout == null ? DEFAULT_REQUEST_TIMEOUT : options.timeout);

    /* tslint:disable no-floating-promises */
    fetch(
      options.url, {
        headers,
        method: "GET",
        signal: abortController ? abortController.signal : undefined,
      }
    ).then((response) => {
      if (response.status >= 300) {
        const errorCode = RequestErrorTypes.ERROR_EVENT;
        obs.error(new RequestError(response, response.url, errorCode));
      }
      if (timeout != null) {
        clearTimeout(timeout);
      }

      const responseType =
        !options.responseType || options.responseType === "document" ?
          "text" : options.responseType;

      if (
        responseType === "arraybuffer" &&
        response.body
      ) {
        const reader = response.body.getReader();

        /**
         * Read last bytes from readable bytstream.
         * @return {Observable}
         */
        function readBuffer() {
          reader.read().then((data) => {
            handleFetchedBytes(data);
          }).catch((e) => {
            obs.error(e);
          });
        }

        /**
         * Handle fetched bytes from response's reader
         * @param {Object} chunk
         * @return {Observable}
         */
        function handleFetchedBytes(
          chunk: { done: boolean; value: Uint8Array }
        ) {
          const receivedTime = performance.now();
          const duration = receivedTime - lastSentTime;
          lastSentTime = receivedTime;
          const { value, done } = chunk;
          if (!done) {
            if (value != null && responseType === "arraybuffer") {
              const _response: IRequestResponse<ArrayBuffer, "arraybuffer"> = {
                type: "response" as "response",
                value: {
                  responseType,
                  status: response.status,
                  url: response.url,
                  sendingTime,
                  receivedTime,
                  duration,
                  size: value.length,
                  responseData: value.buffer,
                },
              };
              obs.next(_response as any); // XXX TODO
              readBuffer();
            }
          } else {
            console.log("!!! URL", options.url);
            obs.complete();
          }
        }

        readBuffer();
      } else {
        return (() => {
          switch (responseType) {
            case "arraybuffer":
              return response.arrayBuffer();
            case "json":
              return response.json();
            case "blob":
              return response.blob();
            case "text":
              return response.text();
          }
        })().then((responseData) => {
          const receivedTime = performance.now();
          obs.next({
            type: "response" as "response",
            value: {
              responseType,
              status: response.status,
              url: response.url,
              sendingTime,
              receivedTime,
              duration: receivedTime - sendingTime,
              size: responseData instanceof ArrayBuffer ?
                responseData.byteLength : 0,
              responseData,
            },
          });
        });
      }
      // XXX TODO how to handle HTTP errors ?
    }).catch((e) => {
      if (timeouted) {
        const errorCode = RequestErrorTypes.TIMEOUT;
        obs.error(new RequestError({ status: 0 },
          options.url,
          errorCode)); // XXX TODO
        return;
      } else if (e.message === "Failed to fetch") {
        obs.error(new RequestError({ status: 404 },
          options.url,
          RequestErrorTypes.ERROR_EVENT));
        return;
      }
      obs.error();
      return;
    });
    /* tslint:disable no-floating-promises */

    return () => {
      abortRequest();
    };
  });
}

/**
 * Returns true if fetch should be supported in the current browser.
 * @return {boolean}
 */
export function fetchIsSupported() {
  return !!(
    window.fetch &&
    (window as any).AbortController &&
    (window as any).Headers
  );
}

export default fetchRequest;
