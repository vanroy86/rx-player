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

import idGenerator from "../../../utils/id_generator";
import {
  IParsedAdaptation,
  IParsedManifest,
  IParsedPeriod,
  IParsedRepresentation,
} from "../types";
import createRepresentationIndex from "./representation_index";
import {
  ILocalAdaptation,
  ILocalManifest,
  ILocalPeriod,
  ILocalRepresentation,
} from "./types";

const generateNewId = idGenerator();

/**
 * @param {Object} localManifest
 * @returns {Object}
 */
export default function parseLocalManifest(
  localManifest : ILocalManifest
) : IParsedManifest {
  const manifest = {
    availabilityStartTime: 0,
    duration: localManifest.duration,
    id: "local-manifest_" + generateNewId(),
    transportType: "local",
    isLive: false,
    uris: [],
    periods: localManifest.periods.map(parsePeriod),
  };
  return manifest;
}

/**
 * @param {Object} period
 * @returns {Object}
 */
function parsePeriod(period : ILocalPeriod) : IParsedPeriod {
  return {
    id: period.id,
    start: period.start,
    end: period.duration - period.start,
    duration: period.duration,
    adaptations: period.adaptations
      .reduce<Partial<Record<string, IParsedAdaptation[]>>>((acc, ada) => {
        const type = ada.type;
        if (acc[type] == null) {
          acc[type] = [];
        }
        (acc[type] as IParsedAdaptation[]).push(parseAdaptation(ada));
        return acc;
      }, {}),
  };
}

/**
 * @param {Object} adaptation
 * @returns {Object}
 */
function parseAdaptation(adaptation : ILocalAdaptation) : IParsedAdaptation {
  return {
    id: adaptation.id,
    type: adaptation.type,
    audioDescription: adaptation.audioDescription,
    closedCaption: adaptation.closedCaption,
    representations: adaptation.representations.map(parseRepresentation),
  };
}

/**
 * @param {Object} representation
 * @returns {Object}
 */
function parseRepresentation(
  representation : ILocalRepresentation
) : IParsedRepresentation {
  return {
    id: representation.id,
    bitrate: representation.bitrate,
    height: representation.height,
    width: representation.width,
    codecs: representation.codecs,
    mimeType: representation.mimeType,
    index: createRepresentationIndex(representation.index, representation.id),
  };
}
