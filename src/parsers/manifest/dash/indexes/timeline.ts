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

import log from "../../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../../manifest";
import clearTimelineFromPosition from "../../utils/clear_timeline_from_position";
import {
  fromIndexTime,
  getIndexSegmentEnd,
  IIndexSegment,
  toIndexTime,
} from "../../utils/index_helpers";
import isSegmentStillAvailable from "../../utils/is_segment_still_available";
import getInitSegment from "./get_init_segment";
import getSegmentsFromTimeline from "./get_segments_from_timeline";
import { createIndexURL } from "./tokens";

// Index property defined for a SegmentTimeline RepresentationIndex
// This object contains every property needed to generate an ISegment for a
// given media time.
export interface ITimelineIndex {
  indexRange?: [number, number]; // byte range for a possible index of segments
                                 // in the server
  indexTimeOffset : number; // Temporal offset, in the current timescale (see
                            // timescale), to add to the presentation time
                            // (time a segment has at decoding time) to
                            // obtain the corresponding media time (original
                            // time of the media segment in the index and on
                            // the media file).
                            // For example, to look for a segment beginning at
                            // a second `T` on a HTMLMediaElement, we
                            // actually will look for a segment in the index
                            // beginning at:
                            // ``` T * timescale + indexTimeOffset ```
  initialization? : { // informations on the initialization segment
    mediaURL: string; // URL to access the initialization segment
    range?: [number, number]; // possible byte range to request it
  };
  mediaURL : string; // base URL to access any segment. Can contain token to
                     // replace to convert it to a real URL
  startNumber? : number; // number from which the first segments in this index
                         // starts with
  timeline : IIndexSegment[]; // Every segments defined in this index
  timescale : number; // timescale to convert a time given here into seconds.
                      // This is done by this simple operation:
                      // ``timeInSeconds = timeInIndex * timescale``
}

// `index` Argument for a SegmentTimeline RepresentationIndex
// Most of the properties here are already defined in ITimelineIndex.
export interface ITimelineIndexIndexArgument {
  indexRange?: [number, number];
  initialization? : { media? : string; range?: [number, number] };
  media? : string;
  startNumber? : number;
  timeline : Array<{ start? : number;
                     repeatCount? : number;
                     duration? : number; }>;
  timescale : number;
  presentationTimeOffset? : number; // Offset present in the index to convert
                                    // from the mediaTime (time declared in the
                                    // media segments and in this index) to the
                                    // presentationTime (time wanted when
                                    // decoding the segment).
                                    // Basically by doing something along the
                                    // line of:
                                    // ```
                                    // presentationTimeInSeconds =
                                    //   mediaTimeInSeconds -
                                    //   presentationTimeOffsetInSeconds +
                                    //   periodStartInSeconds
                                    // ```
                                    // The time given here is in the current
                                    // timescale (see timescale)
}

// Aditional argument for a SegmentTimeline RepresentationIndex
export interface ITimelineIndexContextArgument {
  periodStart : number; // Start of the period concerned by this
                        // RepresentationIndex, in seconds
  periodEnd : number|undefined; // End of the period concerned by this
                                // RepresentationIndex, in seconds
  isDynamic : boolean; // Whether the corresponding Manifest is dynamic
  representationBaseURL : string; // Base URL for the Representation concerned
  representationId? : string; // ID of the Representation concerned
  representationBitrate? : number; // Bitrate of the Representation concerned
  timeShiftBufferDepth? : number; // Timeshift window, in seconds
  manifestReceivedTime? : number; // time (in terms of `performance.now`) at
                                   // which the Manifest file was received
}

/**
 * Translate parsed `S` node into Segment compatible with this index:
 * Find out the start, repeatCount and duration of each of these.
 *
 * @param {Object} item - parsed `S` node
 * @param {Object|null} previousItem - the previously parsed Segment (related
 * to the `S` node coming just before). If `null`, we're talking about the first
 * segment.
 * @param {Object|null} nextItem - the `S` node coming next. If `null`, we're
 * talking about the last segment.
 * @param {number} timelineStart - Absolute start for the timeline. In the same
 * timescale than the given `S` nodes.
 * @returns {Object|null}
 */
function fromParsedSToIndexSegment(
  item : { start? : number; repeatCount? : number; duration? : number },
  previousItem : IIndexSegment|null,
  nextItem : { start? : number; repeatCount? : number; duration? : number }|null,
  timelineStart : number
) : IIndexSegment|null {
  let start = item.start;
  let duration = item.duration;
  const repeatCount = item.repeatCount;
  if (start == null) {
    if (previousItem == null) {
      start = timelineStart;
    } else if (previousItem.duration != null) {
      start = previousItem.start +
              (previousItem.duration * (previousItem.repeatCount + 1));
    }
  }
  if ((duration == null || isNaN(duration)) &&
      nextItem && nextItem.start != null && !isNaN(nextItem.start) &&
      start != null && !isNaN(start)
  ) {
    duration = nextItem.start - start;
  }
  if ((start != null && !isNaN(start)) &&
      (duration != null && !isNaN(duration)) &&
      (repeatCount == null || !isNaN(repeatCount))
  ) {
    return { start,
             duration,
             repeatCount: repeatCount || 0 };
  }
  log.warn("DASH: A \"S\" Element could not have been parsed.");
  return null;
}

/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} start
 * @returns {Number}
 */
function getSegmentIndex(index : ITimelineIndex, start : number) : number {
  const { timeline } = index;

  let low = 0;
  let high = timeline.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (timeline[mid].start < start) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return (low > 0) ? low - 1 :
                     low;
}

export interface ILastSegmentInformation {
  // End of the timeline on `time`, timescaled
  lastPosition? : number;

  // Defines the time at which `lastPosition` was last calculated.
  time : number;
}

export default class TimelineRepresentationIndex implements IRepresentationIndex {
  protected _index : ITimelineIndex;

  // time, in terms of `performance.now`, of the last Manifest update
  private _lastManifestUpdate : number;

  // timeshift window, timescaled
  private _scaledTimeShiftBufferDepth : number | undefined;

  // absolute start of the period, timescaled and converted to index time
  private _scaledPeriodStart : number;

  // absolute end of the period, timescaled and converted to index time
  private _scaledPeriodEnd : number | undefined;

  // Whether this RepresentationIndex can change over time.
  private _isDynamic : boolean;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(
    index : ITimelineIndexIndexArgument,
    context : ITimelineIndexContextArgument
  ) {
    const { isDynamic,
            representationBaseURL,
            representationId,
            representationBitrate,
            periodStart,
            periodEnd,
            timeShiftBufferDepth } = context;
    const { timescale } = index;

    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;

    const scaledStart = periodStart * timescale;
    const indexTimeOffset = presentationTimeOffset - scaledStart;

    const initialTimeline = index.timeline;
    const timeline : IIndexSegment[] = [];
    for (let i = 0; i < initialTimeline.length; i++) {
      const item = initialTimeline[i];
      const nextItem = timeline[timeline.length - 1] || null;
      const prevItem = initialTimeline[i + 1] || null;
      const timelineElement = fromParsedSToIndexSegment(item,
                                                        nextItem,
                                                        prevItem,
                                                        scaledStart);
      if (timelineElement) {
        timeline.push(timelineElement);
      }
    }

    this._lastManifestUpdate = context.manifestReceivedTime == null ?
                                 performance.now() :
                                 context.manifestReceivedTime;

    this._isDynamic = isDynamic;
    this._index = { indexRange: index.indexRange,
                    indexTimeOffset,
                    initialization: index.initialization && {
                      mediaURL: createIndexURL(representationBaseURL,
                                               index.initialization.media,
                                               representationId,
                                               representationBitrate),
                      range: index.initialization.range,
                    },
                    mediaURL: createIndexURL(representationBaseURL,
                                             index.media,
                                             representationId,
                                             representationBitrate),
                    startNumber: index.startNumber,
                    timeline,
                    timescale };
    this._scaledPeriodStart = toIndexTime(periodStart, this._index);
    this._scaledPeriodEnd = periodEnd == null ? undefined :
                                                toIndexTime(periodEnd, this._index);
    this._scaledTimeShiftBufferDepth = timeShiftBufferDepth == null ?
                                         undefined :
                                         timeShiftBufferDepth * timescale;
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index);
  }

  /**
   * Asks for segments to download for a given time range.
   * @param {Number} from - Beginning of the time wanted, in seconds
   * @param {Number} duration - duration wanted, in seconds
   * @returns {Array.<Object>}
   */
  getSegments(from : number, duration : number) : ISegment[] {
    this._refreshTimeline(); // first clear timeline if needed
    return getSegmentsFromTimeline(this._index,
                                   from,
                                   duration,
                                   this._scaledPeriodEnd);
  }

  /**
   * Returns true if the index should be refreshed.
   * @returns {Boolean}
   */
  shouldRefresh() : boolean {
    this._refreshTimeline();
    if (!this._isDynamic) {
      return false;
    }
    if (this._index.timeline.length === 0) {
      return true;
    }

    const lastTimelineElt = this._index.timeline[this._index.timeline.length - 1];
    const lastTime = getIndexSegmentEnd(lastTimelineElt,
                                        null,
                                        this._scaledPeriodEnd);
    const lastTheoriticalPosition = this._getTheoriticalLastPosition();
    if (lastTheoriticalPosition == null) {
      return true;
    }
    return lastTheoriticalPosition > lastTime;
  }

  /**
   * Returns the starting time, in seconds, of the earliest segment currently
   * available.
   * Returns undefined if either:
   *   - we cannot known that value
   *   - nothing is in the index
   * @returns {Number|undefined}
   */
  getFirstPosition() : number|undefined {
    this._refreshTimeline();
    const index = this._index;
    return index.timeline.length === 0 ? undefined :
                                         fromIndexTime(index.timeline[0].start,
                                                       index);
  }

  /**
   * Returns the ending time, in seconds, of the last segment currently
   * available.
   * Returns undefined if either:
   *   - we cannot known that value
   *   - nothing is in the index
   * @returns {Number|undefined}
   */
  getLastPosition() : number|undefined {
    this._refreshTimeline();
    const { timeline } = this._index;
    if (timeline.length === 0) {
      return undefined;
    }
    const lastTimelineElement = timeline[timeline.length - 1];
    const lastTime = getIndexSegmentEnd(lastTimelineElement,
                                        null,
                                        this._scaledPeriodEnd);
    return fromIndexTime(lastTime, this._index);
  }

  /**
   * Returns true if a Segment returned by this index is still considered
   * available.
   * Returns false if it is not available anymore.
   * Returns undefined if we cannot know whether it is still available or not.
   * @param {Object} segment
   * @returns {Boolean|undefined}
   */
  isSegmentStillAvailable(segment : ISegment) : boolean | undefined {
    if (segment.isInit) {
      return true;
    }
    this._refreshTimeline();
    const { timeline, timescale, indexTimeOffset } = this._index;
    return isSegmentStillAvailable(segment, timeline, timescale, indexTimeOffset);
  }

  /**
   * Checks if the time given is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Number} _time
   * @returns {Number} - If a discontinuity is present, this is the Starting
   * time for the next (discontinuited) range. If not this is equal to -1.
   */
  checkDiscontinuity(_time : number) : number {
    this._refreshTimeline();
    const { timeline, timescale } = this._index;
    const scaledTime = toIndexTime(_time, this._index);

    if (scaledTime <= 0) {
      return -1;
    }

    const segmentIndex = getSegmentIndex(this._index, scaledTime);
    if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
      return -1;
    }

    const timelineItem = timeline[segmentIndex];
    if (timelineItem.duration === -1) {
      return -1;
    }

    const nextTimelineItem = timeline[segmentIndex + 1];
    if (nextTimelineItem == null) {
      return -1;
    }

    const rangeUp = timelineItem.start;
    const rangeTo = getIndexSegmentEnd(timelineItem,
                                       nextTimelineItem,
                                       this._scaledPeriodEnd);

    // when we are actually inside the found range and this range has
    // an explicit discontinuity with the next one
    if (rangeTo !== nextTimelineItem.start &&
        scaledTime >= rangeUp &&
        scaledTime <= rangeTo &&
        (rangeTo - scaledTime) < timescale)
    {
      return fromIndexTime(nextTimelineItem.start, this._index);
    }

    return -1;
  }

  /**
   * @param {Object} newIndex
   */
  _update(newIndex : TimelineRepresentationIndex) : void {
    this._index = newIndex._index;
    this._isDynamic = newIndex._isDynamic;
    this._scaledPeriodStart = newIndex._scaledPeriodStart;
    this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
    this._scaledTimeShiftBufferDepth = newIndex._scaledTimeShiftBufferDepth;
    this._lastManifestUpdate = newIndex._lastManifestUpdate;
  }

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * @param {Array.<Object>} nextSegments
   * @param {Object|undefined} currentSegmentInfos
   * @returns {Array}
   */
  _addSegments() : void {
    if (__DEV__) {
      log.warn("Tried to add Segments to a SegmentTimeline RepresentationIndex");
    }
  }

  /**
   * Clean-up timeline to remove segment informations which should not be
   * available due to timeshifting.
   */
  private _refreshTimeline() : void {
    if (this._scaledTimeShiftBufferDepth == null) {
      return;
    }

    const lastTheoriticalPosition = this._getTheoriticalLastPosition();
    if (lastTheoriticalPosition == null) {
      return;
    }

    const firstAvailablePosition = Math.max(lastTheoriticalPosition -
                                              this._scaledTimeShiftBufferDepth,
                                            this._scaledPeriodStart);

    clearTimelineFromPosition(this._index.timeline, firstAvailablePosition);
  }

  /**
   * Returns last position if new segments have the same duration than the
   * current last one.
   * @returns {number}
   */
  private _getTheoriticalLastPosition() : number | undefined {
    const index = this._index;
    if (index.timeline.length <= 0) {
      return;
    }

    const lastTimelineElement = index.timeline[index.timeline.length - 1];
    const lastPosition = getIndexSegmentEnd(lastTimelineElement,
                                            null,
                                            this._scaledPeriodEnd);
    if (this._isDynamic !== true) {
      return lastPosition;
    }
    const lastSegmentDuration = lastTimelineElement.duration;
    const timeDiffInSeconds = (performance.now() - this._lastManifestUpdate) / 1000;
    const timeDiffTS = timeDiffInSeconds * index.timescale;
    if (timeDiffTS < lastSegmentDuration) {
      return lastPosition;
    }
    const numberOfNewSegments = Math.floor(timeDiffTS / lastSegmentDuration);
    return numberOfNewSegments * lastSegmentDuration + lastPosition;
  }
}
