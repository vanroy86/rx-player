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
import {
  ILoaderObservable,
  ILoaderObserver,
} from "../types";

export type ILocalManifestSegmentLoader = (
  callbacks : {
    resolve : (args: {
      data : ArrayBuffer|Uint8Array;
      size : number;
      duration : number;
    }) => void;

    reject : (err? : Error) => void;
  }
) =>
  // returns either the aborting callback or nothing
  (() => void)|void;

/**
 * @param {Function} customSegmentLoader
 * @returns {Observable}
 */
export default function loadSegment(
  customSegmentLoader : ILocalManifestSegmentLoader
) : ILoaderObservable<Uint8Array|ArrayBuffer|null> {
  return new Observable((obs : ILoaderObserver<Uint8Array|ArrayBuffer>) => {
    let hasFinished = false;

    /**
     * Callback triggered when the custom segment loader has a response.
     * @param {Object} args
     */
    const resolve = (_args : {
      data : ArrayBuffer|Uint8Array;
      size : number;
      duration : number;
    }) => {
      hasFinished = true;
      obs.next({
        type: "response",
        value: {
          responseData: _args.data,
          size: _args.size,
          duration: _args.duration,
        },
      });
      obs.complete();
    };

    /**
     * Callback triggered when the custom segment loader fails
     * @param {*} err - The corresponding error encountered
     */
    const reject = (err? : Error) => {
      hasFinished = true;
      obs.error(err);
    };

    const abort = customSegmentLoader({ resolve, reject });

    return () => {
      if (!hasFinished && typeof abort === "function") {
        abort();
      }
    };
  });
}
