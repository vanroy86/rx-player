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

import { of as observableOf } from "rxjs";
import features from "../../features";
import request from "../../utils/request";
import {
  IImageParserObservable,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
  ISegmentParserArguments,
} from "../types";

export function imageLoader(
  { segment } : ISegmentLoaderArguments
) : ISegmentLoaderObservable< ArrayBuffer | null > {
  if (segment.isInit || segment.mediaURL == null) {
    return observableOf({ type: "data-created" as const,
                          value: { responseData: null } });
  }
  const { mediaURL } = segment;
  return request({ url: mediaURL,
                   responseType: "arraybuffer",
                   sendProgressEvents: true });
}

export function imageParser(
  { response, content } : ISegmentParserArguments<Uint8Array|ArrayBuffer|null>
) : IImageParserObservable {
  const { segment } = content;
  const { data, isChunked } = response;

  if (isChunked) {
    throw new Error("Image data should not be downloaded in chunks");
  }

  // TODO image Parsing should be more on the sourceBuffer side, no?
  if (data === null || features.imageParser == null) {
    return observableOf({
      chunkData: null,
      chunkInfos: segment.timescale > 0 ? {
        duration: segment.isInit ? 0 : segment.duration,
        time: segment.isInit ? -1 : segment.time,
        timescale: segment.timescale,
      } : null,
      chunkOffset: segment.timestampOffset || 0 });
  }
  const bifObject = features.imageParser(new Uint8Array(data));
  const thumbsData = bifObject.thumbs;
  return observableOf({ chunkData: { data: thumbsData,
                                     start: 0,
                                     end: Number.MAX_VALUE,
                                     timescale: 1,
                                     type: "bif" },
                        chunkInfos: { time: 0,
                                      duration: Number.MAX_VALUE,
                                      timescale: bifObject.timescale },
                        chunkOffset: segment.timestampOffset || 0 });
}
