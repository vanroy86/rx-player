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
export interface IRequestProgress {
    type: "progress";
    value: {
        currentTime: number;
        duration: number;
        size: number;
        sentTime: number;
        url: string;
        totalSize?: number;
    };
}
export interface IRequestResponse<T, U> {
    type: "response";
    value: {
        duration: number;
        receivedTime: number;
        responseData: T;
        responseType: U;
        sentTime: number;
        size: number;
        status: number;
        url: string;
    };
}
export interface IRequestOptions<T, U> {
    url: string;
    method?: string;
    headers?: {
        [header: string]: string;
    } | null;
    responseType?: T;
    timeout?: number;
    ignoreProgressEvents?: U;
    body?: any;
}
/**
 * # request function
 *
 * Translate AJAX Requests into Rx.js Observables.
 *
 * ## Overview
 *
 * Perform the request on subscription, the Rx.js way.
 * Emit progress and response. Throw if an error happened or if the status code
 * is not in the 200 range. Complete after emitting the response.
 * Abort the xhr on unsubscription.
 *
 * ## Emitted Objects
 *
 * The emitted objects are under the following form:
 * ```
 *   {
 *     type {string}: the type of event
 *     value {Object}: the event value
 *   }
 * ```
 *
 * The type of event can either be "progress" or "response". The value is under
 * a different form depending on the type.
 *
 * For "progress" events, the value should be the following object:
 * ```
 *   {
 *     url {string}: url on which the request is being done
 *     sentTime {Number}: timestamp at which the request was sent.
 *     currentTime {Number}: timestamp at which the progress event was
 *                           triggered
 *     size {Number}: current size downloaded, in bytes (without
 *                          overhead)
 *     totalSize {Number|undefined}: total size to download, in bytes
 *                                   (without overhead)
 *   }
 * ```
 *
 * For "response" events, the value should be the following object:
 * ```
 *   {
 *     status {Number}: xhr status code
 *     url {string}: url on which the request was done
 *     responseType {string}: the responseType of the request
 *                            (e.g. "json", "document"...)
 *     sentTime {Number}: timestamp at which the request was sent.
 *     receivedTime {Number}: timestamp at which the response was received.
 *     size {Number}: size of the received data, in bytes
 *     responseData {*}: Data in the response. Format depends on the
 *                       responseType.
 *   }
 * ```
 *
 * For any succesful request you should have 0+ "progress" events and 1
 * "response" event.
 *
 * ## Errors
 *
 * Several errors can be emitted (the Rx.js way). Namely:
 *   - timeout error (code RequestErrorTypes.TIMEOUT_ERROR)
 *   - parse error (code RequestErrorTypes.PARSE_ERROR)
 *   - http code error (RequestErrorTypes.ERROR_HTTP_CODE)
 *   - error from the xhr's "error" event (RequestErrorTypes.ERROR_EVENT)
 *
 * @param {Object} options
 * @returns {Observable}
 */
declare function request(options: IRequestOptions<undefined | null | "" | "text", false | undefined>): Observable<IRequestResponse<string, "text"> | IRequestProgress>;
declare function request(options: IRequestOptions<undefined | null | "" | "text", true>): Observable<IRequestResponse<string, "text">>;
declare function request(options: IRequestOptions<"arraybuffer", false | undefined>): Observable<IRequestResponse<ArrayBuffer, "arraybuffer"> | IRequestProgress>;
declare function request(options: IRequestOptions<"arraybuffer", true>): Observable<IRequestResponse<ArrayBuffer, "arraybuffer">>;
declare function request(options: IRequestOptions<"document", false | undefined>): Observable<IRequestResponse<Document, "document"> | IRequestProgress>;
declare function request(options: IRequestOptions<"document", true>): Observable<IRequestResponse<Document, "document">>;
declare function request(options: IRequestOptions<"json", false | undefined>): Observable<IRequestResponse<object, "json"> | IRequestProgress>;
declare function request(options: IRequestOptions<"json", true>): Observable<IRequestResponse<object, "json">>;
declare function request(options: IRequestOptions<"blob", false | undefined>): Observable<IRequestResponse<Blob, "blob"> | IRequestProgress>;
declare function request(options: IRequestOptions<"blob", true>): Observable<IRequestResponse<Blob, "blob">>;
declare function request<T>(options: IRequestOptions<XMLHttpRequestResponseType | null | undefined, false | undefined>): Observable<IRequestResponse<T, XMLHttpRequestResponseType> | IRequestProgress>;
declare function request<T>(options: IRequestOptions<XMLHttpRequestResponseType | null | undefined, true>): Observable<IRequestResponse<T, XMLHttpRequestResponseType>>;
export default request;
