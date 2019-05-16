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
import log from "../../log";
import arrayFindIndex from "../../utils/array_find_index";
/**
 * From the buffer gap, choose a representation.
 * @param {Object} clockTick
 * @param {Array.<Number>} bitrates
 * @param {Array.<Number>} levels
 * @returns {Object|undefined}
 */
export default function getEstimateFromBufferLevels(clockTick, bitrates, bufferLevels) {
    var bufferGap = clockTick.bufferGap, currentBitrate = clockTick.currentBitrate, currentScore = clockTick.currentScore, speed = clockTick.speed;
    if (currentBitrate == null) {
        return undefined;
    }
    var currentBitrateIndex = arrayFindIndex(bitrates, function (b) { return b === currentBitrate; });
    if (currentBitrateIndex < 0 || bitrates.length !== bufferLevels.length) {
        log.error("ABR: Current Bitrate not found in the calculated levels");
        return bitrates[0];
    }
    var scaledScore;
    if (currentScore != null) {
        scaledScore = speed === 0 ? currentScore : (currentScore / speed);
    }
    if (scaledScore != null && scaledScore > 1) {
        var currentBufferLevel_1 = bufferLevels[currentBitrateIndex];
        var nextIndex = (function () {
            for (var i = currentBitrateIndex + 1; i < bufferLevels.length; i++) {
                if (bufferLevels[i] > currentBufferLevel_1) {
                    return i;
                }
            }
        })();
        if (nextIndex != null) {
            var nextBufferLevel = bufferLevels[nextIndex];
            if (bufferGap >= nextBufferLevel) {
                return bitrates[nextIndex];
            }
        }
    }
    if (scaledScore == null || scaledScore < 1.15) {
        var currentBufferLevel = bufferLevels[currentBitrateIndex];
        if (bufferGap < currentBufferLevel) {
            for (var i = currentBitrateIndex - 1; i >= 0; i--) {
                if (bitrates[i] < currentBitrate) {
                    return bitrates[i];
                }
            }
            return currentBitrate;
        }
    }
    return currentBitrate;
}
