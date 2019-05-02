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
import { ISegment } from "../../../../manifest";
interface IIndexSegment {
    start: number;
    duration: number;
    repeatCount: number;
    range?: [number, number];
}
/**
 * Convert from `presentationTime`, the time of the segment at the moment it
 * is decoded to `mediaTime`, the original time the segments point at.
 * @param {Object} index
 * @param {number} time
 * @returns {number}
 */
declare function toIndexTime(index: {
    timescale: number;
    indexTimeOffset: number;
}, time: number): number;
/**
 * Convert from `mediaTime`, the original time the segments point at to
 * `presentationTime`, the time of the segment at the moment it is decoded.
 * @param {Object} index
 * @param {number} time
 * @returns {number}
 */
declare function fromIndexTime(index: {
    timescale: number;
    indexTimeOffset: number;
}, time: number): number;
/**
 * @param {Object} index
 * @param {Number} start
 * @param {Number} duration
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
declare function getTimescaledRange(index: {
    timescale?: number;
}, start: number, duration: number): {
    up: number;
    to: number;
};
/**
 * Get start of the given index range, timescaled.
 * @param {Object} element
 * @returns {Number} - absolute start time of the range
 */
declare function getTimelineItemRangeStart({ start, duration, repeatCount, }: IIndexSegment): number;
/**
 * Get end of the given index range, timescaled.
 * @param {Object} element
 * @returns {Number} - absolute end time of the range
 */
declare function getTimelineItemRangeEnd({ start, duration, repeatCount, }: IIndexSegment): number;
/**
 * Construct init segment for the given index.
 * @param {Object} index
 * @returns {Object}
 */
declare function getInitSegment(index: {
    timescale: number;
    initialization?: {
        mediaURL: string;
        range?: [number, number];
    };
    indexRange?: [number, number];
    indexTimeOffset: number;
}): ISegment;
/**
 * Get a list of Segments for the time range wanted.
 * @param {Object} index - index object, constructed by parsing the manifest.
 * @param {number} from - starting timestamp wanted, in seconds
 * @param {number} duration - duration wanted, in seconds
 * @param {number} indexTimeOffset - offset used to convert from decoding
 * time (used by the `from` argument) to manifest time (used in the `index`
 * argument). Basically, we should be able to convert the `from` argument into
 * manifest time by doing something like:
 * ``from * index.timescale + indexTimeOffset``
 */
declare function getSegmentsFromTimeline(index: {
    mediaURL: string;
    startNumber?: number;
    timeline: IIndexSegment[];
    timescale: number;
    indexTimeOffset: number;
}, from: number, durationWanted: number): ISegment[];
export { IIndexSegment, getInitSegment, getSegmentsFromTimeline, getTimelineItemRangeEnd, getTimelineItemRangeStart, getTimescaledRange, fromIndexTime, toIndexTime, };
