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
import log from "../../log";
import arrayFind from "../../utils/array_find";
import BandwidthEstimator from "./bandwidth_estimator";
import EWMA from "./ewma";
var ABR_REGULAR_FACTOR = config.ABR_REGULAR_FACTOR, ABR_STARVATION_DURATION_DELTA = config.ABR_STARVATION_DURATION_DELTA, ABR_STARVATION_FACTOR = config.ABR_STARVATION_FACTOR, ABR_STARVATION_GAP = config.ABR_STARVATION_GAP, OUT_OF_STARVATION_GAP = config.OUT_OF_STARVATION_GAP;
/**
 * Get the pending request starting with the asked segment position.
 * @param {Object} requests
 * @param {number} position
 * @returns {IRequestInfo|undefined}
 */
function getConcernedRequest(requests, neededPosition) {
    for (var i = 0; i < requests.length; i++) {
        var request = requests[i];
        if (request.duration > 0) {
            var segmentEnd = request.time + request.duration;
            if (segmentEnd > neededPosition && neededPosition - request.time > -0.3) {
                return request;
            }
        }
    }
}
/**
 * Estimate the __VERY__ recent bandwidth based on a single unfinished request.
 * Useful when the current bandwidth seemed to have fallen quickly.
 *
 * @param {Object} request
 * @returns {number|undefined}
 */
function estimateRequestBandwidth(request) {
    if (request.progress.length < 2) {
        return undefined;
    }
    // try to infer quickly the current bitrate based on the
    // progress events
    var ewma1 = new EWMA(2);
    var progress = request.progress;
    for (var i = 1; i < progress.length; i++) {
        var bytesDownloaded = progress[i].size - progress[i - 1].size;
        var timeElapsed = progress[i].timestamp - progress[i - 1].timestamp;
        var reqBitrate = (bytesDownloaded * 8) / (timeElapsed / 1000);
        ewma1.addSample(timeElapsed / 1000, reqBitrate);
    }
    return ewma1.getEstimate();
}
/**
 * Estimate remaining time for a pending request from a progress event.
 * @param {Object} lastProgressEvent
 * @param {number} bandwidthEstimate
 * @returns {number}
 */
function estimateRemainingTime(lastProgressEvent, bandwidthEstimate) {
    var remainingData = (lastProgressEvent.totalSize - lastProgressEvent.size) * 8;
    return Math.max(remainingData / bandwidthEstimate, 0);
}
/**
 * Check if the request for the most needed segment is too slow.
 * If that's the case, re-calculate the bandwidth urgently based on
 * this single request.
 * @param {Object} pendingRequests - Current pending requests.
 * @param {Object} clock - Informations on the current playback.
 * @param {Number} lastEstimatedBitrate - Last bitrate estimation emitted.
 * @returns {Number|undefined}
 */
function estimateStarvationModeBitrate(pendingRequests, clock, lastEstimatedBitrate) {
    var nextNeededPosition = clock.currentTime + clock.bufferGap;
    var concernedRequest = getConcernedRequest(pendingRequests, nextNeededPosition);
    if (!concernedRequest) {
        return undefined;
    }
    var chunkDuration = concernedRequest.duration;
    var now = performance.now();
    var lastProgressEvent = concernedRequest.progress ?
        concernedRequest.progress[concernedRequest.progress.length - 1] :
        null;
    // first, try to do a quick estimate from progress events
    var bandwidthEstimate = estimateRequestBandwidth(concernedRequest);
    if (lastProgressEvent != null && bandwidthEstimate != null) {
        var remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate) * 1.2;
        // if this remaining time is reliable and is not enough to avoid buffering
        if ((now - lastProgressEvent.timestamp) / 1000 <= remainingTime &&
            remainingTime > (clock.bufferGap / clock.speed)) {
            return bandwidthEstimate;
        }
    }
    var requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1000;
    var currentBitrate = clock.downloadBitrate;
    if (currentBitrate == null ||
        requestElapsedTime <= ((chunkDuration * 1.5 + 1) / clock.speed)) {
        return undefined;
    }
    // calculate a reduced bitrate from the current one
    var reducedBitrate = currentBitrate * 0.7;
    if (lastEstimatedBitrate == null || reducedBitrate < lastEstimatedBitrate) {
        return reducedBitrate;
    }
}
/**
 * Returns true if, based on the current requests, it seems that the ABR should
 * switch immediately if a lower bitrate is more adapted.
 * Returns false if it estimates that you have time before switching to a lower
 * bitrate.
 * @param {Object} clock
 * @param {Object} pendingRequests
 * @returns {boolean}
 */
function shouldDirectlySwitchToLowBitrate(clock, currentRequests) {
    var nextNeededPosition = clock.currentTime + clock.bufferGap;
    var requests = currentRequests.sort(function (a, b) { return a.time - b.time; });
    var nextNeededRequest = arrayFind(requests, function (r) {
        return (r.time + r.duration) > nextNeededPosition;
    });
    if (!nextNeededRequest) {
        return true;
    }
    var now = performance.now();
    var lastProgressEvent = nextNeededRequest.progress ?
        nextNeededRequest.progress[nextNeededRequest.progress.length - 1] :
        null;
    // first, try to do a quick estimate from progress events
    var bandwidthEstimate = estimateRequestBandwidth(nextNeededRequest);
    if (lastProgressEvent == null || bandwidthEstimate == null) {
        return true;
    }
    var remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
    if ((now - lastProgressEvent.timestamp) / 1000 <= (remainingTime * 1.2) &&
        remainingTime < ((clock.bufferGap / clock.speed) + ABR_STARVATION_GAP)) {
        return false;
    }
    return true;
}
/**
 * Analyze the current network conditions and give a bandwidth estimate as well
 * as a maximum bitrate a Representation should be.
 * @class NetworkAnalyzer
 */
var NetworkAnalyzer = /** @class */ (function () {
    function NetworkAnalyzer(initialBitrate) {
        this._initialBitrate = initialBitrate;
        this._estimator = new BandwidthEstimator();
        this._inStarvationMode = false;
    }
    NetworkAnalyzer.prototype.getBandwidthEstimate = function (clockTick, currentRequests, lastEstimatedBitrate) {
        var newBitrateCeil; // bitrate ceil for the chosen Representation
        var bandwidthEstimate;
        var bufferGap = clockTick.bufferGap, currentTime = clockTick.currentTime, duration = clockTick.duration;
        // check if should get in/out of starvation mode
        if (bufferGap + currentTime < duration - ABR_STARVATION_DURATION_DELTA) {
            if (!this._inStarvationMode && bufferGap <= ABR_STARVATION_GAP) {
                log.info("ABR: enter starvation mode.");
                this._inStarvationMode = true;
            }
            else if (this._inStarvationMode && bufferGap >= OUT_OF_STARVATION_GAP) {
                log.info("ABR: exit starvation mode.");
                this._inStarvationMode = false;
            }
        }
        else if (this._inStarvationMode) {
            log.info("ABR: exit starvation mode.");
            this._inStarvationMode = false;
        }
        // If in starvation mode, check if a quick new estimate can be done
        // from the last requests.
        // If so, cancel previous estimations and replace it by the new one
        if (this._inStarvationMode) {
            bandwidthEstimate =
                estimateStarvationModeBitrate(currentRequests, clockTick, lastEstimatedBitrate);
            if (bandwidthEstimate != null) {
                log.info("ABR: starvation mode emergency estimate:", bandwidthEstimate);
                this._estimator.reset();
                var currentBitrate = clockTick.downloadBitrate;
                newBitrateCeil = currentBitrate == null ?
                    bandwidthEstimate : Math.min(bandwidthEstimate, currentBitrate);
            }
        }
        // if newBitrateCeil is not yet defined, do the normal estimation
        if (newBitrateCeil == null) {
            bandwidthEstimate = this._estimator.getEstimate();
            if (bandwidthEstimate != null) {
                newBitrateCeil = this._inStarvationMode ?
                    bandwidthEstimate * ABR_STARVATION_FACTOR :
                    bandwidthEstimate * ABR_REGULAR_FACTOR;
            }
            else if (lastEstimatedBitrate != null) {
                newBitrateCeil = this._inStarvationMode ?
                    lastEstimatedBitrate * ABR_STARVATION_FACTOR :
                    lastEstimatedBitrate * ABR_REGULAR_FACTOR;
            }
            else {
                newBitrateCeil = this._initialBitrate;
            }
        }
        if (clockTick.speed > 1) {
            newBitrateCeil /= clockTick.speed;
        }
        return { bandwidthEstimate: bandwidthEstimate, bitrateChosen: newBitrateCeil };
    };
    /**
     * Add a bandwidth estimate by giving:
     *   - the duration of the request, in s
     *   - the size of the request in bytes
     * @param {number} duration
     * @param {number} size
     */
    NetworkAnalyzer.prototype.addEstimate = function (duration, size) {
        this._estimator.addSample(duration, size);
    };
    /**
     * For a given wanted bitrate, tells if should switch urgently.
     * @param {number} bitrate
     * @param {Object} clockTick
     * @returns {boolean}
     */
    NetworkAnalyzer.prototype.isUrgent = function (bitrate, currentRequests, clockTick) {
        if (clockTick.downloadBitrate == null) {
            return true;
        }
        else if (bitrate === clockTick.downloadBitrate) {
            return false;
        }
        else if (bitrate > clockTick.downloadBitrate) {
            return !this._inStarvationMode;
        }
        return shouldDirectlySwitchToLowBitrate(clockTick, currentRequests);
    };
    return NetworkAnalyzer;
}());
export default NetworkAnalyzer;
