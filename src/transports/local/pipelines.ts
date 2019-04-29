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
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import { of as observableOf } from "rxjs";
import Manifest from "../../manifest";
import parseLocalManifest, {
  ILocalManifest,
} from "../../parsers/manifest/local";
import { imageParser } from "../dash/image_pipelines";
import segmentParser from "../dash/segment_parser";
import {
  parser as textTrackParser,
} from "../dash/text_pipelines";
import {
  ILoaderObservable,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader";
import loadSegment from "./load_segment";

/**
 * Generic segment loader for the local Manifest.
 * @param {Object} arg
 * @returns {Observable}
 */
function segmentLoader(
  { segment } : ISegmentLoaderArguments
) : ILoaderObservable<ArrayBuffer|Uint8Array|null> {
  const privateInfos = segment.privateInfos;
  if (!privateInfos || privateInfos.localManifestSegment == null) {
    throw new Error("Segment is not an local Manifest segment");
  }
  return loadSegment(privateInfos.localManifestSegment.load);
}

/**
 * Returns pipelines used for local Manifest streaming.
 * @param {Object} options
 * @returns {Object}
 */
export default function getLocalManifestPipelines(
  options : ITransportOptions = {}
) : ITransportPipelines {
  const customManifestLoader = options.manifestLoader;

  const manifestPipeline = {
    loader() : ILoaderObservable<ILocalManifest> {
      if (customManifestLoader == null) {
        throw new Error("A local Manifest is not loadable through regular HTTP " +
          "calls. You have to set a `customManifestLoader` when calling `loadVideo`");
      }
      return callCustomManifestLoader<ILocalManifest>(
        customManifestLoader,
        () : never => {
          throw new Error(
          "Cannot fallback from the customManifestLoader of a `local` transport");
        });
    },

    parser({ response } : IManifestParserArguments) : IManifestParserObservable {
      const manifestData = response.responseData;
      if (typeof manifestData !== "object") {
        throw new Error("Wrong format for the manifest data");
      }
      const parsed = parseLocalManifest(response.responseData as ILocalManifest);
      const manifest = new Manifest(parsed, options);
      return observableOf({ manifest, url: undefined });
    },
  };

  const segmentPipeline = {
    loader: segmentLoader,
    parser: segmentParser,
  };

  const textTrackPipeline = {
    loader: segmentLoader,
    parser: textTrackParser,
  };

  const imageTrackPipeline = {
    loader: segmentLoader,
    parser: imageParser,
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
  };
}
