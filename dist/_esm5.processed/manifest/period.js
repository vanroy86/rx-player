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
import MediaError from "../errors/MediaError";
import log from "../log";
import arrayIncludes from "../utils/array-includes";
import Adaptation, { SUPPORTED_ADAPTATIONS_TYPE, } from "./adaptation";
var Period = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} args
     */
    function Period(args, warning$, representationFilter) {
        this.id = args.id;
        this.adaptations =
            Object.keys(args.adaptations)
                .reduce(function (acc, type) {
                if (args.adaptations[type]) {
                    var adaptationsForType = args.adaptations[type];
                    if (adaptationsForType) {
                        acc[type] = adaptationsForType
                            .filter(function (adaptation) {
                            if (!arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, adaptation.type)) {
                                log.info("not supported adaptation type", adaptation.type);
                                warning$.next(new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE", null, false));
                                return false;
                            }
                            else {
                                return true;
                            }
                        })
                            .map(function (adaptation) {
                            return new Adaptation(adaptation, warning$, representationFilter);
                        })
                            .filter(function (adaptation) { return adaptation.representations.length; });
                    }
                }
                return acc;
            }, {});
        if ((!this.adaptations.video || !this.adaptations.video.length) &&
            (!this.adaptations.audio || !this.adaptations.audio.length)) {
            throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
        }
        this.duration = args.duration;
        this.start = args.start;
        if (this.duration != null && this.start != null) {
            this.end = this.start + this.duration;
        }
    }
    /**
     * @returns {Array.<Object>}
     */
    Period.prototype.getAdaptations = function () {
        var adaptationsByType = this.adaptations;
        if (!adaptationsByType) {
            return [];
        }
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
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    Period.prototype.getAdaptationsForType = function (adaptationType) {
        var adaptations = this.adaptations[adaptationType];
        return adaptations || [];
    };
    /**
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    Period.prototype.getAdaptation = function (wantedId) {
        return arrayFind(this.getAdaptations(), function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
    };
    return Period;
}());
export default Period;
