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

import config from "../../config";
import Manifest from "../../manifest";

const { DEFAULT_LIVE_GAP } = config;

export interface IInitialTimeOptions { position? : number;
                                       wallClockTime? : number;
                                       fromFirstPosition? : number;
                                       fromLastPosition? : number;
                                       percentage? : number; }

/**
 * Returns the calculated initial time for the content described by the given
 * Manifest:
 *   1. if a start time is defined by user, calculate starting time from the
 *      manifest informations
 *   2. else if the media is live, use the live edge and suggested delays from
 *      it
 *   3. else returns the minimum time announced in the manifest
 * @param {Manifest} manifest
 * @param {Object} startAt
 * @returns {Number}
 */
export default function getInitialTime(
  manifest : Manifest,
  startAt? : IInitialTimeOptions
) : number {
  if (startAt) {
    const min = manifest.getMinimumPosition();
    const max = manifest.getMaximumPosition();
    if (startAt.position != null) {
      return Math.max(Math.min(startAt.position, max), min);
    }
    else if (startAt.wallClockTime != null) {
      const position = manifest.isLive ?
        startAt.wallClockTime - (manifest.availabilityStartTime || 0) :
        startAt.wallClockTime;

      return Math.max(Math.min(position, max), min);
    }
    else if (startAt.fromFirstPosition != null) {
      const { fromFirstPosition } = startAt;
      return fromFirstPosition <= 0 ? min :
                                      Math.min(max, min + fromFirstPosition);
    }
    else if (startAt.fromLastPosition != null) {
      const { fromLastPosition } = startAt;
      return fromLastPosition >= 0 ? max :
                                     Math.max(min, max + fromLastPosition);
    } else if (startAt.percentage != null) {
      const { percentage } = startAt;
      if (percentage > 100) {
        return max;
      } else if (percentage < 0) {
        return min;
      }
      const ratio = +percentage / 100;
      const extent = max - min;
      return min + extent * ratio;
    }
  }

  if (manifest.isLive) {
    const sgp = manifest.suggestedPresentationDelay;
    const defaultStartingPos = manifest.getMaximumPosition() -
                               (sgp == null ? DEFAULT_LIVE_GAP :
                                              sgp);
    return Math.max(defaultStartingPos, manifest.getMinimumPosition());
  }

  return manifest.getMinimumPosition();
}
