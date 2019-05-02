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
 * @param {number} timeInMs
 * @param {Object} manifest
 * @returns {number}
 */
export default function fromWallClockTime(timeInMs, manifest) {
    return normalizeWallClockTime(timeInMs, manifest) / 1000
        - (manifest.availabilityStartTime || 0);
}
/**
 * @param {number|date}
 * @param {Object} manifest
 * @retunrs {number}
 */
function normalizeWallClockTime(_time, manifest) {
    if (!manifest.isLive) {
        return +_time;
    }
    var spd = manifest.suggestedPresentationDelay || 0;
    var plg = manifest.presentationLiveGap || 0;
    var tsbd = manifest.timeShiftBufferDepth || 0;
    var timeInMs = typeof _time === "number" ?
        _time : +_time;
    var now = Date.now();
    var max = now - (plg + spd) * 1000;
    var min = now - (tsbd) * 1000;
    return Math.max(Math.min(timeInMs, max), min);
}
