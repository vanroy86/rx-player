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
import objectAssign from "object-assign";
import { BehaviorSubject, combineLatest as observableCombineLatest, of as observableOf, Subject, } from "rxjs";
import { distinctUntilChanged, filter, map, startWith, switchMap, takeUntil, withLatestFrom, } from "rxjs/operators";
import BufferBasedChooser from "./buffer_based_chooser";
import EWMA from "./ewma";
import filterByBitrate from "./filter_by_bitrate";
import filterByWidth from "./filter_by_width";
import fromBitrateCeil from "./from_bitrate_ceil";
import NetworkAnalyzer from "./network_analyzer";
import PendingRequestsStore from "./pending_requests_store";
import { getLeftSizeOfRange } from "../../utils/ranges";
/**
 * Filter representations given through filters options.
 * @param {Array.<Representation>} representations
 * @param {Object} filters - Filter Object.
 * _Can_ contain each of the following properties:
 *   - bitrate {Number} - max bitrate authorized (included).
 *   - width {Number} - max width authorized (included).
 * @returns {Array.<Representation>}
 */
function getFilteredRepresentations(representations, filters) {
    var _representations = representations;
    if (filters.bitrate != null) {
        _representations = filterByBitrate(_representations, filters.bitrate);
    }
    if (filters.width != null) {
        _representations = filterByWidth(_representations, filters.width);
    }
    return _representations;
}
/**
 * Create Observable that merge several throttling Observables into one.
 * @param {Observable} limitWidth$ - Emit the width at which the chosen
 * Representation should be limited.
 * @param {Observable} throttleBitrate$ - Emit the maximum bitrate authorized.
 * @returns {Observable}
 */
function createDeviceEvents(limitWidth$, throttleBitrate$) {
    var deviceEventsArray = [];
    if (limitWidth$) {
        deviceEventsArray.push(limitWidth$.pipe(map(function (width) { return ({ width: width }); })));
    }
    if (throttleBitrate$) {
        deviceEventsArray.push(throttleBitrate$.pipe(map(function (bitrate) { return ({ bitrate: bitrate }); })));
    }
    // Emit restrictions on the pools of available representations to choose
    // from.
    return deviceEventsArray.length ?
        observableCombineLatest.apply(void 0, deviceEventsArray).pipe(map(function (args) { return objectAssign.apply(void 0, [{}].concat(args)); })) :
        observableOf({});
}
/**
 * Choose the right Representation thanks to "choosers":
 *
 * - The throughput chooser choose the Representation relatively to the current
 *   user's bandwidth.
 *
 * - The buffer-based chooser choose the Representation relatively to the
 *   current size of the buffer.
 *
 * To have more control over which Representation should be choosen, you can
 * also use the following exposed subjects:
 *
 *   - manualBitrate$ {Subject}: Set the bitrate manually, if no representation
 *     is found with the given bitrate. An immediately inferior one will be
 *     taken instead. If still, none are found, the representation with the
 *     minimum bitrate will be taken.
 *     Set it to a negative value to go into automatic bitrate mode.
 *
 *   - maxBitrate$ {Subject}: Set the maximum automatic bitrate. If the manual
 *     bitrate is not set / set to a negative value, this will be the maximum
 *     switch-able bitrate. If no representation is found inferior or equal to
 *     this bitrate, the representation with the minimum bitrate will be taken.
 *
 * @class RepresentationChooser
 */
var RepresentationChooser = /** @class */ (function () {
    /**
     * @param {Object} options
     */
    function RepresentationChooser(mediaElement, options) {
        this._dispose$ = new Subject();
        this._scoreEstimator = null;
        this._networkAnalyzer = new NetworkAnalyzer(options.initialBitrate || 0);
        this._pendingRequests = new PendingRequestsStore();
        this._mediaElement = mediaElement;
        this._limitWidth$ = options.limitWidth$;
        this._throttle$ = options.throttle$;
        this.manualBitrate$ = new BehaviorSubject(options.manualBitrate != null ? options.manualBitrate : -1);
        this.maxAutoBitrate$ = new BehaviorSubject(options.maxAutoBitrate != null ? options.maxAutoBitrate : Infinity);
    }
    RepresentationChooser.prototype.get$ = function (representations, clock$, bufferEvents$) {
        var _this = this;
        if (!representations.length) {
            throw new Error("ABRManager: no representation choice given");
        }
        if (representations.length === 1) {
            return observableOf({
                bitrate: undefined,
                representation: representations[0],
                manual: false,
                urgent: true,
                lastStableBitrate: undefined,
            });
        }
        var currentRepresentation;
        var _a = this, manualBitrate$ = _a.manualBitrate$, maxAutoBitrate$ = _a.maxAutoBitrate$, _limitWidth$ = _a._limitWidth$, _throttle$ = _a._throttle$;
        var deviceEvents$ = createDeviceEvents(_limitWidth$, _throttle$);
        bufferEvents$.pipe(filter(function (evt) {
            return evt.type === "representation-buffer-change";
        }), takeUntil(this._dispose$)).subscribe(function (evt) {
            currentRepresentation = evt.value.representation;
            _this._scoreEstimator = null; // reset the score
        });
        return manualBitrate$.pipe(switchMap(function (manualBitrate) {
            if (manualBitrate >= 0) {
                // -- MANUAL mode --
                return observableOf({
                    representation: fromBitrateCeil(representations, manualBitrate) ||
                        representations[0],
                    bitrate: undefined,
                    lastStableBitrate: undefined,
                    manual: true,
                    urgent: true,
                });
            }
            // -- AUTO mode --
            var lastEstimatedBitrate;
            var forceBandwidthMode = true;
            // Emit each time a buffer-based estimation should be actualized.
            // (basically, each time a segment is added)
            var bufferBasedClock$ = bufferEvents$.pipe(filter(function (e) { return e.type === "added-segment"; }), withLatestFrom(clock$), map(function (_a) {
                var addedSegmentEvt = _a[0], speed = _a[1].speed;
                var currentTime = _this._mediaElement.currentTime;
                var timeRanges = addedSegmentEvt.value.buffered;
                var bufferGap = getLeftSizeOfRange(timeRanges, currentTime);
                var currentBitrate = currentRepresentation == null ?
                    undefined : currentRepresentation.bitrate;
                var currentScore = _this._scoreEstimator == null ?
                    undefined : _this._scoreEstimator.getEstimate();
                return { bufferGap: bufferGap, currentBitrate: currentBitrate, currentScore: currentScore, speed: speed };
            }));
            var bitrates = representations.map(function (r) { return r.bitrate; });
            var bufferBasedEstimation$ = BufferBasedChooser(bufferBasedClock$, bitrates);
            return observableCombineLatest(clock$, maxAutoBitrate$, deviceEvents$, bufferBasedEstimation$.pipe(startWith(undefined))).pipe(map(function (_a) {
                var clock = _a[0], maxAutoBitrate = _a[1], deviceEvents = _a[2], bufferBasedBitrate = _a[3];
                var _representations = getFilteredRepresentations(representations, deviceEvents);
                var requests = _this._pendingRequests.getRequests();
                var _b = _this._networkAnalyzer
                    .getBandwidthEstimate(clock, requests, lastEstimatedBitrate), bandwidthEstimate = _b.bandwidthEstimate, bitrateChosen = _b.bitrateChosen;
                lastEstimatedBitrate = bandwidthEstimate;
                var lastStableBitrate;
                if (_this._scoreEstimator) {
                    if (currentRepresentation == null) {
                        lastStableBitrate = lastStableBitrate;
                    }
                    else {
                        lastStableBitrate = _this._scoreEstimator.getEstimate() > 1 ?
                            currentRepresentation.bitrate : lastStableBitrate;
                    }
                }
                var bufferGap = clock.bufferGap;
                if (!forceBandwidthMode && bufferGap <= 5) {
                    forceBandwidthMode = true;
                }
                else if (forceBandwidthMode && Number.isFinite(bufferGap) && bufferGap > 10) {
                    forceBandwidthMode = false;
                }
                var chosenRepFromBandwidth = fromBitrateCeil(_representations, Math.min(bitrateChosen, maxAutoBitrate)) ||
                    _representations[0];
                if (forceBandwidthMode) {
                    return {
                        bitrate: bandwidthEstimate,
                        representation: chosenRepFromBandwidth,
                        urgent: _this._networkAnalyzer
                            .isUrgent(chosenRepFromBandwidth.bitrate, requests, clock),
                        manual: false,
                        lastStableBitrate: lastStableBitrate,
                    };
                }
                if (bufferBasedBitrate == null ||
                    chosenRepFromBandwidth.bitrate >= bufferBasedBitrate) {
                    return {
                        bitrate: bandwidthEstimate,
                        representation: chosenRepFromBandwidth,
                        urgent: _this._networkAnalyzer
                            .isUrgent(chosenRepFromBandwidth.bitrate, requests, clock),
                        manual: false,
                        lastStableBitrate: lastStableBitrate,
                    };
                }
                var limitedBitrate = Math.min(bufferBasedBitrate, maxAutoBitrate);
                var chosenRepresentation = fromBitrateCeil(_representations, limitedBitrate) || _representations[0];
                return {
                    bitrate: bandwidthEstimate,
                    representation: chosenRepresentation,
                    urgent: _this._networkAnalyzer
                        .isUrgent(bufferBasedBitrate, requests, clock),
                    manual: false,
                    lastStableBitrate: lastStableBitrate,
                };
            }), distinctUntilChanged(function (a, b) {
                return a.representation.id === b.representation.id &&
                    b.lastStableBitrate === a.lastStableBitrate;
            }), takeUntil(_this._dispose$));
        }));
    };
    /**
     * Add bandwidth and "maintainability score" estimate by giving:
     *   - the duration of the request, in s
     *   - the size of the request in bytes
     *   - the content downloaded
     * @param {number} duration
     * @param {number} size
     * @param {Object} content
     */
    RepresentationChooser.prototype.addEstimate = function (duration, size, content // XXX TODO compare with current representation?
    ) {
        this._networkAnalyzer.addEstimate(duration, size); // calculate bandwidth
        // calculate "maintainability score"
        var segment = content.segment;
        if (segment.duration == null) {
            return;
        }
        var requestDuration = duration / 1000;
        var segmentDuration = segment.duration / segment.timescale;
        var ratio = segmentDuration / requestDuration;
        if (this._scoreEstimator != null) {
            this._scoreEstimator.addSample(requestDuration, ratio);
            return;
        }
        var newEWMA = new EWMA(5);
        newEWMA.addSample(requestDuration, ratio);
        this._scoreEstimator = newEWMA;
    };
    /**
     * Add informations about a new pending request.
     * This can be useful if the network bandwidth drastically changes to infer
     * a new bandwidth through this single request.
     * @param {string} id
     * @param {Object} payload
     */
    RepresentationChooser.prototype.addPendingRequest = function (id, payload) {
        this._pendingRequests.add(id, payload);
    };
    /**
     * Add progress informations to a pending request.
     * Progress objects are a key part to calculate the bandwidth from a single
     * request, in the case the user's bandwidth changes drastically while doing
     * it.
     * @param {string} id
     * @param {Object} progress
     */
    RepresentationChooser.prototype.addRequestProgress = function (id, progress) {
        this._pendingRequests.addProgress(id, progress);
    };
    /**
     * Remove a request previously set as pending through the addPendingRequest
     * method.
     * @param {string} id
     */
    RepresentationChooser.prototype.removePendingRequest = function (id) {
        this._pendingRequests.remove(id);
    };
    /**
     * Free up the resources used by the RepresentationChooser.
     */
    RepresentationChooser.prototype.dispose = function () {
        this._dispose$.next();
        this._dispose$.complete();
        this.manualBitrate$.complete();
        this.maxAutoBitrate$.complete();
    };
    return RepresentationChooser;
}());
export default RepresentationChooser;
