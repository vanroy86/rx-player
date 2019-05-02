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
import arrayFind from "array-find";
import log from "../log";
import assert from "../utils/assert";
import generateNewId from "../utils/id";
import { normalize as normalizeLang } from "../utils/languages";
import warnOnce from "../utils/warnOnce";
import Adaptation from "./adaptation";
import Period from "./period";
import Representation from "./representation";
import { StaticRepresentationIndex, } from "./representation_index";
/**
 * Normalized Manifest structure.
 * @class Manifest
 */
var Manifest = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} args
     */
    function Manifest(args, warning$, options) {
        var _a = options.supplementaryTextTracks, supplementaryTextTracks = _a === void 0 ? [] : _a, _b = options.supplementaryImageTracks, supplementaryImageTracks = _b === void 0 ? [] : _b, representationFilter = options.representationFilter;
        var nId = generateNewId();
        this.id = args.id == null ? nId : "" + args.id;
        this.transport = args.transportType || "";
        this.periods = args.periods.map(function (period) {
            return new Period(period, warning$, representationFilter);
        });
        /**
         * @deprecated It is here to ensure compatibility with the way the
         * v3.x.x manages adaptations at the Manifest level
         */
        this.adaptations = (this.periods[0] && this.periods[0].adaptations) || [];
        this.minimumTime = args.minimumTime;
        this.isLive = args.isLive;
        this.uris = args.uris;
        this.suggestedPresentationDelay = args.suggestedPresentationDelay;
        this.availabilityStartTime = args.availabilityStartTime;
        this.presentationLiveGap = args.presentationLiveGap;
        this.timeShiftBufferDepth = args.timeShiftBufferDepth;
        // --------- private data
        this._duration = args.duration;
        if (false && this.isLive) {
            assert(this.suggestedPresentationDelay != null);
            assert(this.availabilityStartTime != null);
            assert(this.presentationLiveGap != null);
            assert(this.timeShiftBufferDepth != null);
        }
        if (supplementaryImageTracks.length) {
            this.addSupplementaryImageAdaptations(supplementaryImageTracks, warning$);
        }
        if (supplementaryTextTracks.length) {
            this.addSupplementaryTextAdaptations(supplementaryTextTracks, warning$);
        }
    }
    /**
     * Returns Period encountered at the given time.
     * Returns undefined if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Period|undefined}
     */
    Manifest.prototype.getPeriodForTime = function (time) {
        return arrayFind(this.periods, function (period) {
            return time >= period.start &&
                (period.end == null || period.end > time);
        });
    };
    /**
     * Returns period coming just after a given period.
     * Returns undefined if not found.
     * @param {Period} period
     * @returns {Period|null}
     */
    Manifest.prototype.getPeriodAfter = function (period) {
        var endOfPeriod = period.end;
        if (endOfPeriod == null) {
            return null;
        }
        return arrayFind(this.periods, function (_period) {
            return _period.end == null || endOfPeriod < _period.end;
        }) || null;
    };
    /**
     * @returns {Number}
     */
    Manifest.prototype.getDuration = function () {
        return this._duration;
    };
    /**
     * @returns {string|undefined}
     */
    Manifest.prototype.getUrl = function () {
        return this.uris[0];
    };
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    Manifest.prototype.getAdaptations = function () {
        warnOnce("manifest.getAdaptations() is deprecated." +
            " Please use manifest.period[].getAdaptations() instead");
        var firstPeriod = this.periods[0];
        if (!firstPeriod) {
            return [];
        }
        var adaptationsByType = firstPeriod.adaptations;
        var adaptationsList = [];
        for (var adaptationType in adaptationsByType) {
            if (adaptationsByType.hasOwnProperty(adaptationType)) {
                var adaptations = adaptationsByType[adaptationType];
                adaptationsList.push.apply(adaptationsList, adaptations);
            }
        }
        return adaptationsList;
    };
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    Manifest.prototype.getAdaptationsForType = function (adaptationType) {
        warnOnce("manifest.getAdaptationsForType(type) is deprecated." +
            " Please use manifest.period[].getAdaptationsForType(type) instead");
        var firstPeriod = this.periods[0];
        if (!firstPeriod) {
            return [];
        }
        return firstPeriod.adaptations[adaptationType] || [];
    };
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    Manifest.prototype.getAdaptation = function (wantedId) {
        warnOnce("manifest.getAdaptation(id) is deprecated." +
            " Please use manifest.period[].getAdaptation(id) instead");
        /* tslint:disable:deprecation */
        return arrayFind(this.getAdaptations(), function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
        /* tslint:enable:deprecation */
    };
    /**
     * @param {number} delta
     */
    Manifest.prototype.updateLiveGap = function (delta) {
        if (this.isLive) {
            if (this.presentationLiveGap) {
                this.presentationLiveGap += delta;
            }
            else {
                this.presentationLiveGap = delta;
            }
        }
    };
    /**
     * Update the current manifest properties
     * @param {Object} Manifest
     */
    Manifest.prototype.update = function (newManifest) {
        this._duration = newManifest.getDuration();
        this.timeShiftBufferDepth = newManifest.timeShiftBufferDepth;
        this.availabilityStartTime = newManifest.availabilityStartTime;
        this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
        this.uris = newManifest.uris;
        var oldPeriods = this.periods;
        var newPeriods = newManifest.periods;
        var _loop_1 = function (i) {
            var oldPeriod = oldPeriods[i];
            var newPeriod = arrayFind(newPeriods, function (a) { return a.id === oldPeriod.id; });
            if (!newPeriod) {
                log.info("Period " + oldPeriod.id + " not found after update. Removing.");
                oldPeriods.splice(i, 1);
                i--;
            }
            else {
                oldPeriod.start = newPeriod.start;
                oldPeriod.end = newPeriod.end;
                oldPeriod.duration = newPeriod.duration;
                var oldAdaptations = oldPeriod.getAdaptations();
                var newAdaptations = newPeriod.getAdaptations();
                var _loop_2 = function (j) {
                    var oldAdaptation = oldAdaptations[j];
                    var newAdaptation = arrayFind(newAdaptations, function (a) { return a.id === oldAdaptation.id; });
                    if (!newAdaptation) {
                        log.warn("manifest: adaptation \"" + oldAdaptations[j].id + "\" not found when merging.");
                    }
                    else {
                        var oldRepresentations = oldAdaptations[j].representations;
                        var newRepresentations = newAdaptation.representations;
                        var _loop_3 = function (k) {
                            var oldRepresentation = oldRepresentations[k];
                            var newRepresentation = arrayFind(newRepresentations, function (representation) { return representation.id === oldRepresentation.id; });
                            if (!newRepresentation) {
                                /* tslint:disable:max-line-length */
                                log.warn("manifest: representation \"" + oldRepresentations[k].id + "\" not found when merging.");
                                /* tslint:enable:max-line-length */
                            }
                            else {
                                oldRepresentations[k].index._update(newRepresentation.index);
                            }
                        };
                        for (var k = 0; k < oldRepresentations.length; k++) {
                            _loop_3(k);
                        }
                    }
                };
                for (var j = 0; j < oldAdaptations.length; j++) {
                    _loop_2(j);
                }
            }
            out_i_1 = i;
        };
        var out_i_1;
        for (var i = 0; i < oldPeriods.length; i++) {
            _loop_1(i);
            i = out_i_1;
        }
        // adding - perhaps - new Period[s]
        if (newPeriods.length > oldPeriods.length) {
            var lastOldPeriod = oldPeriods[oldPeriods.length - 1];
            if (lastOldPeriod) {
                for (var i = 0; i < newPeriods.length - 1; i++) {
                    var newPeriod = newPeriods[i];
                    if (newPeriod.start > lastOldPeriod.start) {
                        log.info("Adding new period " + newPeriod.id);
                        this.periods.push(newPeriod);
                    }
                }
            }
            else {
                for (var i = 0; i < newPeriods.length - 1; i++) {
                    var newPeriod = newPeriods[i];
                    log.info("Adding new period " + newPeriod.id);
                    this.periods.push(newPeriod);
                }
            }
        }
    };
    /**
     * Get minimum position currently defined by the Manifest.
     * @returns {number}
     */
    Manifest.prototype.getMinimumPosition = function () {
        // we have to know both the min and the max to be sure
        var min = this.getCurrentPositionLimits()[0];
        return min;
    };
    /**
     * Get maximum position currently defined by the Manifest.
     * @returns {number}
     */
    Manifest.prototype.getMaximumPosition = function () {
        if (!this.isLive) {
            return this.getDuration();
        }
        var ast = this.availabilityStartTime || 0;
        var plg = this.presentationLiveGap || 0;
        var now = Date.now() / 1000;
        return now - ast - plg;
    };
    /**
     * Get minimum AND maximum positions currently defined by the manifest.
     * @returns {Array.<number>}
     */
    Manifest.prototype.getCurrentPositionLimits = function () {
        // TODO use RTT for the manifest request? (+ 3 or something)
        var BUFFER_DEPTH_SECURITY = 5;
        if (!this.isLive) {
            return [this.minimumTime || 0, this.getDuration()];
        }
        var ast = this.availabilityStartTime || 0;
        var plg = this.presentationLiveGap || 0;
        var tsbd = this.timeShiftBufferDepth || 0;
        var now = Date.now() / 1000;
        var max = now - ast - plg;
        return [
            Math.min(max, Math.max(this.minimumTime != null ? this.minimumTime : 0, max - tsbd + BUFFER_DEPTH_SECURITY)),
            max,
        ];
    };
    /**
     * Add supplementary image Adaptation(s) to the manifest.
     * @param {Object|Array.<Object>} imageTracks
     */
    Manifest.prototype.addSupplementaryImageAdaptations = function (imageTracks, warning$) {
        var _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
        var newImageTracks = _imageTracks.map(function (_a) {
            var mimeType = _a.mimeType, url = _a.url;
            var adaptationID = "gen-image-ada-" + generateNewId();
            var representationID = "gen-image-rep-" + generateNewId();
            return new Adaptation({
                id: adaptationID,
                type: "image",
                manuallyAdded: true,
                representations: [{
                        bitrate: 0,
                        id: representationID,
                        mimeType: mimeType,
                        index: new StaticRepresentationIndex({ media: url }),
                    }],
            }, warning$);
        });
        if (newImageTracks.length) {
            this.adaptations.image = this.adaptations.image ?
                this.adaptations.image.concat(newImageTracks) : newImageTracks;
        }
    };
    /**
     * Add supplementary text Adaptation(s) to the manifest.
     * @param {Object|Array.<Object>} textTracks
     */
    Manifest.prototype.addSupplementaryTextAdaptations = function (textTracks, warning$) {
        var _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
        var newTextAdaptations = _textTracks.reduce(function (allSubs, _a) {
            var mimeType = _a.mimeType, codecs = _a.codecs, url = _a.url, language = _a.language, languages = _a.languages, closedCaption = _a.closedCaption;
            var langsToMapOn = language ? [language] : languages || [];
            return allSubs.concat(langsToMapOn.map(function (_language) {
                var adaptationID = "gen-text-ada-" + generateNewId();
                var representationID = "gen-text-rep-" + generateNewId();
                return new Adaptation({
                    id: adaptationID,
                    type: "text",
                    language: _language,
                    normalizedLanguage: normalizeLang(_language),
                    closedCaption: closedCaption,
                    manuallyAdded: true,
                    representations: [{
                            bitrate: 0,
                            id: representationID,
                            mimeType: mimeType,
                            codecs: codecs,
                            index: new StaticRepresentationIndex({ media: url }),
                        }],
                }, warning$);
            }));
        }, []);
        if (newTextAdaptations.length) {
            this.adaptations.text = this.adaptations.text ?
                this.adaptations.text.concat(newTextAdaptations) : newTextAdaptations;
        }
    };
    return Manifest;
}());
export default Manifest;
export { 
// classes
Period, Adaptation, Representation, };
