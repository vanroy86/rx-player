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
import { fromIndexTime, getInitSegment, getSegmentsFromTimeline, getTimelineItemRangeStart, } from "./helpers";
/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} segmentInfos
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(index, segmentInfos) {
    if (segmentInfos.timescale !== index.timescale) {
        var timescale = index.timescale;
        index.timeline.push({
            start: (segmentInfos.time / segmentInfos.timescale) * timescale,
            duration: (segmentInfos.duration / segmentInfos.timescale) * timescale,
            repeatCount: segmentInfos.count || 0,
            range: segmentInfos.range,
        });
    }
    else {
        index.timeline.push({
            start: segmentInfos.time,
            duration: segmentInfos.duration,
            repeatCount: segmentInfos.count || 0,
            range: segmentInfos.range,
        });
    }
    return true;
}
/**
 * Provide helpers for SegmentBase-based indexes.
 * @type {Object}
 */
var BaseRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function BaseRepresentationIndex(index, context) {
        var periodStart = context.periodStart, representationURL = context.representationURL, representationId = context.representationId, representationBitrate = context.representationBitrate;
        var presentationTimeOffset = index.presentationTimeOffset != null ?
            index.presentationTimeOffset : 0;
        var indexTimeOffset = presentationTimeOffset - periodStart * index.timescale;
        this._index = {
            mediaURL: createIndexURL(representationURL, index.media, representationId, representationBitrate),
            timeline: index.timeline,
            timescale: index.timescale,
            duration: index.duration,
            indexTimeOffset: indexTimeOffset,
            indexRange: index.indexRange,
            startNumber: index.startNumber,
            initialization: index.initialization && {
                mediaURL: createIndexURL(representationURL, index.initialization.media, representationId, representationBitrate),
                range: index.initialization.range,
            },
        };
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    BaseRepresentationIndex.prototype.getInitSegment = function () {
        return getInitSegment(this._index);
    };
    /**
     * @param {Number} _up
     * @param {Number} _to
     * @returns {Array.<Object>}
     */
    BaseRepresentationIndex.prototype.getSegments = function (_up, _to) {
        return getSegmentsFromTimeline(this._index, _up, _to);
    };
    /**
     * Returns false as no Segment-Base based index should need to be refreshed.
     * @returns {Boolean}
     */
    BaseRepresentationIndex.prototype.shouldRefresh = function () {
        return false;
    };
    /**
     * Returns first position in index.
     * @returns {Number|undefined}
     */
    BaseRepresentationIndex.prototype.getFirstPosition = function () {
        var index = this._index;
        if (!index.timeline.length) {
            return undefined;
        }
        return fromIndexTime(index, index.timeline[0].start);
    };
    /**
     * Returns last position in index.
     * @returns {Number|undefined}
     */
    BaseRepresentationIndex.prototype.getLastPosition = function () {
        var index = this._index;
        if (!index.timeline.length) {
            return undefined;
        }
        var lastTimelineElement = index.timeline[index.timeline.length - 1];
        return fromIndexTime(index, getTimelineItemRangeStart(lastTimelineElement));
    };
    /**
     * We do not check for discontinuity in SegmentBase-based indexes.
     * @returns {Number}
     */
    BaseRepresentationIndex.prototype.checkDiscontinuity = function () {
        return -1;
    };
    /**
     * @param {Array.<Object>} nextSegments
     * @returns {Array.<Object>}
     */
    BaseRepresentationIndex.prototype._addSegments = function (nextSegments) {
        for (var i = 0; i < nextSegments.length; i++) {
            _addSegmentInfos(this._index, nextSegments[i]);
        }
    };
    /**
     * @param {Object} newIndex
     */
    BaseRepresentationIndex.prototype._update = function (newIndex) {
        this._index = newIndex._index;
    };
    return BaseRepresentationIndex;
}());
export default BaseRepresentationIndex;
