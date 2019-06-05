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

// Interface for "progress" events
export interface IRequestProgress {
  type : "progress";
  value : {
    currentTime : number;
    duration : number;
    size : number;
    sendingTime : number;
    url : string;
    totalSize? : number;
  };
}

// Interface for "response" events
export interface IRequestResponse<T, U> {
  type : "response";
  value : {
    duration : number;
    receivedTime : number;
    responseData : T;
    responseType : U;
    sendingTime : number;
    size : number;
    status : number;
    url : string;
  };
}

// Interface for "response" events
export interface IRequestDataChunk<T, U> {
  type : "dataChunk";
  value : {
    duration : number;
    receivedTime : number;
    responseData : T;
    responseType : U;
    sendingTime : number;
    size : number;
    status : number;
    url : string;
  };
}

// Arguments for the "request" utils
export interface IRequestOptions<T, U> {
  url : string;
  headers? : { [ header: string ] : string }|null;
  responseType? : T;
  timeout? : number;
  sendProgressEvents? : U;
}
