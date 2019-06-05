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
import fetchRequest from "./fetch";
import {
  IRequestOptions,
  IRequestProgress,
  IRequestResponse,
} from "./types";
import xhrRequest from "./xhr_request";

/**
 * @param {*} options
 * @param {*} lowLatencyMode
 */
export default function request(
  options : IRequestOptions<undefined|null|""|"text", false|undefined>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<string, "text">|IRequestProgress>;
export default function request(
  options : IRequestOptions<undefined|null|""|"text", true>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<string, "text">>;
export default function request(
  options : IRequestOptions<"arraybuffer", false|undefined>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<ArrayBuffer, "arraybuffer">|IRequestProgress>;
export default function request(
  options : IRequestOptions<"arraybuffer", true>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<ArrayBuffer, "arraybuffer">>;
export default function request(
  options : IRequestOptions<"document", false|undefined>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<Document, "document">|IRequestProgress>;
export default function request(
  options : IRequestOptions<"document", true>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<Document, "document">>;
export default function request(
  options : IRequestOptions<"json", false|undefined>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<object, "json">|IRequestProgress>;
export default function request(
  options : IRequestOptions<"json", true>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<object, "json">>;
export default function request(
  options : IRequestOptions<"blob", false|undefined>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<Blob, "blob">|IRequestProgress>;
export default function request(
  options : IRequestOptions<"blob", true>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<Blob, "blob">>;
export default function request<T>(
  options : IRequestOptions<
    XMLHttpRequestResponseType|null|undefined, false|undefined
  >,
  lowLatencyMode? : boolean
) : Observable<
  IRequestResponse<T, XMLHttpRequestResponseType>|IRequestProgress
>;
export default function request<T>(
  options : IRequestOptions<XMLHttpRequestResponseType|null|undefined, true>,
  lowLatencyMode? : boolean
) : Observable<IRequestResponse<T, XMLHttpRequestResponseType>>;
export default function request<T>(
  options : IRequestOptions<XMLHttpRequestResponseType|null|undefined, boolean|undefined>,
  useFetchAPI? : boolean
): Observable<
IRequestResponse<T, XMLHttpRequestResponseType>|IRequestProgress
> {
  // XXX TODO TS ?
  if (useFetchAPI) {
    return fetchRequest<T>(options as any);
  }
  return xhrRequest<T>(options as any);
}
