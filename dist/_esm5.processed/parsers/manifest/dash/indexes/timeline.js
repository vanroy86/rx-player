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
import { createIndexURL } from "../helpers";
import { fromIndexTime, getInitSegment, getSegmentsFromTimeline, getTimelineItemRangeEnd, toIndexTime, } from "./helpers";
/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} start
 * @returns {Number}
 */
function getSegmentIndex(index, start) {
    var timeline = index.timeline;
    var low = 0;
    var high = timeline.length;
    while (low < high) {
        var mid = (low + high) >>> 1;
        if (timeline[mid].start < start) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    return (low > 0)
        ? low - 1
        : low;
}
/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} newSegment
 * @param {Object} currentSegmentInfos
 * @param {Number} indexTimeOffset
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(index, newSegment, currentSegmentInfos) {
    var timeline = index.timeline, timescale = index.timescale;
    var timelineLength = timeline.length;
    var lastItem = timeline[timelineLength - 1];
    var scaledNewSegment = newSegment.timescale === timescale ? {
        time: newSegment.time,
        duration: newSegment.duration,
    } : {
        time: (newSegment.time / newSegment.timescale) * timescale,
        duration: (newSegment.duration / newSegment.timescale) * timescale,
    };
    var scaledCurrentTime;
    if (currentSegmentInfos && currentSegmentInfos.timescale) {
        scaledCurrentTime = (currentSegmentInfos.timescale === timescale ?
            currentSegmentInfos.time :
            (currentSegmentInfos.time / currentSegmentInfos.timescale) * timescale) + index.indexTimeOffset;
    }
    // in some circumstances, the new segment informations are only
    // duration informations that we can use to deduct the start of the
    // next segment. this is the case where the new segment are
    // associated to a current segment and have the same start
    var shouldDeductNextSegment = scaledCurrentTime != null &&
        (scaledNewSegment.time === scaledCurrentTime);
    if (shouldDeductNextSegment) {
        var newSegmentStart = scaledNewSegment.time + scaledNewSegment.duration;
        var lastSegmentStart = (lastItem.start + lastItem.duration * lastItem.repeatCount);
        var startDiff = newSegmentStart - lastSegmentStart;
        if (startDiff <= 0) { // same segment / behind the lastItem
            return false;
        }
        // try to use the compact notation with @r attribute on the lastItem
        // to elements of the timeline if we find out they have the same
        // duration
        if (lastItem.duration === -1) {
            var prev = timeline[timelineLength - 2];
            if (prev && prev.duration === startDiff) {
                prev.repeatCount++;
                timeline.pop();
            }
            else {
                lastItem.duration = startDiff;
            }
        }
        index.timeline.push({
            duration: -1,
            start: newSegmentStart,
            repeatCount: 0,
        });
        return true;
    }
    // if the given timing has a timestamp after the timeline end we
    // just need to push a new element in the timeline, or increase
    // the @r attribute of the lastItem element.
    else if (scaledNewSegment.time >= getTimelineItemRangeEnd(lastItem)) {
        if (lastItem.duration === scaledNewSegment.duration) {
            lastItem.repeatCount++;
        }
        else {
            index.timeline.push({
                duration: scaledNewSegment.duration,
                start: scaledNewSegment.time,
                repeatCount: 0,
            });
        }
        return true;
    }
    return false;
}
var TimelineRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function TimelineRepresentationIndex(index, context) {
        var representationURL = context.representationURL, representationId = context.representationId, representationBitrate = context.representationBitrate, periodStart = context.periodStart;
        var presentationTimeOffset = index.presentationTimeOffset != null ?
            index.presentationTimeOffset : 0;
        var indexTimeOffset = presentationTimeOffset - periodStart * index.timescale;
        this._index = {
            duration: index.duration,
            indexTimeOffset: indexTimeOffset,
            indexRange: index.indexRange,
            initialization: index.initialization && {
                mediaURL: createIndexURL(representationURL, index.initialization.media, representationId, representationBitrate),
                range: index.initialization.range,
            },
            mediaURL: createIndexURL(representationURL, index.media, representationId, representationBitrate),
            startNumber: index.startNumber,
            timeline: index.timeline,
            timescale: index.timescale,
        };
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    TimelineRepresentationIndex.prototype.getInitSegment = function () {
        return getInitSegment(this._index);
    };
    /**
     * Asks for segments to download for a given time range.
     * @param {Number} from - Beginning of the time wanted, in seconds
     * @param {Number} duration - duration wanted, in seconds
     * @returns {Array.<Object>}
     */
    TimelineRepresentationIndex.prototype.getSegments = function (from, duration) {
        return getSegmentsFromTimeline(this._index, from, duration);
    };
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * @param {Number} _start
     * @param {Number} end
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.shouldRefresh = function (_start, end) {
        var timeline = this._index.timeline;
        var scaledTo = toIndexTime(this._index, end);
        var lastItem = timeline[timeline.length - 1];
        if (!lastItem) {
            return false;
        }
        if (lastItem.duration < 0) {
            lastItem = {
                start: lastItem.start,
                duration: 0,
                repeatCount: lastItem.repeatCount,
            };
        }
        return scaledTo > getTimelineItemRangeEnd(lastItem);
    };
    /**
     * Returns first position in index.
     * @returns {Number|undefined}
     */
    TimelineRepresentationIndex.prototype.getFirstPosition = function () {
        var index = this._index;
        if (!index.timeline.length) {
            return undefined;
        }
        return fromIndexTime(index, index.timeline[0].start);
    };
    /**
     * Returns lastItem position in index.
     * @returns {Number|undefined}
     */
    TimelineRepresentationIndex.prototype.getLastPosition = function () {
        var index = this._index;
        if (!index.timeline.length) {
            return undefined;
        }
        var lastTimelineElement = index.timeline[index.timeline.length - 1];
        return fromIndexTime(index, getTimelineItemRangeEnd(lastTimelineElement));
    };
    /**
     * Checks if the time given is in a discontinuity. That is:
     *   - We're on the upper bound of the current range (end of the range - time
     *     is inferior to the timescale)
     *   - The next range starts after the end of the current range.
     * @param {Number} _time
     * @returns {Number} - If a discontinuity is present, this is the Starting
     * time for the next (discontinuited) range. If not this is equal to -1.
     */
    TimelineRepresentationIndex.prototype.checkDiscontinuity = function (_time) {
        var _a = this._index, timeline = _a.timeline, timescale = _a.timescale;
        var scaledTime = toIndexTime(this._index, _time);
        if (scaledTime <= 0) {
            return -1;
        }
        var segmentIndex = getSegmentIndex(this._index, scaledTime);
        if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
            return -1;
        }
        var timelineItem = timeline[segmentIndex];
        if (timelineItem.duration === -1) {
            return -1;
        }
        var nextRange = timeline[segmentIndex + 1];
        if (nextRange == null) {
            return -1;
        }
        var rangeUp = timelineItem.start;
        var rangeTo = getTimelineItemRangeEnd(timelineItem);
        // when we are actually inside the found range and this range has
        // an explicit discontinuity with the next one
        if (rangeTo !== nextRange.start &&
            scaledTime >= rangeUp &&
            scaledTime <= rangeTo &&
            (rangeTo - scaledTime) < timescale) {
            return fromIndexTime(this._index, nextRange.start);
        }
        return -1;
    };
    /**
     * @param {Object} newIndex
     */
    TimelineRepresentationIndex.prototype._update = function (newIndex) {
        this._index = newIndex._index;
    };
    /**
     * We do not have to add new segments to SegmentList-based indexes.
     * @param {Array.<Object>} nextSegments
     * @param {Object|undefined} currentSegmentInfos
     * @returns {Array}
     */
    TimelineRepresentationIndex.prototype._addSegments = function (nextSegments, currentSegmentInfos) {
        for (var i = 0; i < nextSegments.length; i++) {
            _addSegmentInfos(this._index, nextSegments[i], currentSegmentInfos);
        }
    };
    return TimelineRepresentationIndex;
}());
export default TimelineRepresentationIndex;
