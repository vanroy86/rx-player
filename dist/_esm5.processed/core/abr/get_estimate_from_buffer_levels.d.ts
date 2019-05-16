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
export interface IBufferBasedChooserClockTick {
    bufferGap: number;
    currentBitrate?: number;
    currentScore?: number;
    speed: number;
}
/**
 * From the buffer gap, choose a representation.
 * @param {Object} clockTick
 * @param {Array.<Number>} bitrates
 * @param {Array.<Number>} levels
 * @returns {Object|undefined}
 */
export default function getEstimateFromBufferLevels(clockTick: IBufferBasedChooserClockTick, bitrates: number[], bufferLevels: number[]): number | undefined;
