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
import { distinctUntilChanged, map, share, tap, } from "rxjs/operators";
import { isPlaybackStuck } from "../../compat";
import config from "../../config";
import log from "../../log";
import { getNextRangeGap } from "../../utils/ranges";
var DISCONTINUITY_THRESHOLD = config.DISCONTINUITY_THRESHOLD;
/**
 * Receive "stalling" events from the clock, try to get out of it, and re-emit
 * them for the player if the stalling status changed.
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} timings$
 * @returns {Observable}
 */
function StallingManager(mediaElement, timings$) {
    return timings$.pipe(tap(function (timing) {
        if (!timing.stalled) {
            return;
        }
        // Perform various checks to try to get out of the stalled state:
        //   1. is it a browser bug? -> force seek at the same current time
        //   2. is it a short discontinuity? -> Seek at the beginning of the
        //                                      next range
        var buffered = timing.buffered, currentTime = timing.currentTime;
        var nextRangeGap = getNextRangeGap(buffered, currentTime);
        // Discontinuity check in case we are close a buffer but still
        // calculate a stalled state. This is useful for some
        // implementation that might drop an injected segment, or in
        // case of small discontinuity in the stream.
        if (isPlaybackStuck(timing.currentTime, timing.currentRange, timing.state, !!timing.stalled)) {
            log.warn("after freeze seek", currentTime, timing.currentRange);
            mediaElement.currentTime = currentTime;
        }
        else if (nextRangeGap < DISCONTINUITY_THRESHOLD) {
            var seekTo = (currentTime + nextRangeGap + 1 / 60);
            log.warn("discontinuity seek", currentTime, nextRangeGap, seekTo);
            mediaElement.currentTime = seekTo;
        }
    }), share(), map(function (timing) { return timing.stalled; }), distinctUntilChanged(function (wasStalled, isStalled) {
        return !wasStalled && !isStalled ||
            (!!wasStalled && !!isStalled && wasStalled.reason === isStalled.reason);
    }));
}
export default StallingManager;
