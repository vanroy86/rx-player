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
import objectAssign from "object-assign";
import { isCodecSupported } from "../compat";
import MediaError from "../errors/MediaError";
import log from "../log";
import generateNewId from "../utils/id";
import Representation from "./representation";
export var SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text", "image"];
/**
 * Normalized Adaptation structure.
 * @class Adaptation
 */
var Adaptation = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} args
     */
    function Adaptation(args, warning$, representationFilter) {
        var _this = this;
        var nId = generateNewId();
        this.id = args.id == null ? nId : "" + args.id;
        this.type = args.type;
        var hadRepresentations = !!args.representations.length;
        var argsRepresentations = filterSupportedRepresentations(args.type, args.representations);
        if (hadRepresentations && argsRepresentations.length === 0) {
            log.warn("Incompatible codecs for adaptation", args);
            var error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", null, false);
            warning$.next(error);
        }
        if (args.language != null) {
            this.language = args.language;
        }
        if (args.normalizedLanguage != null) {
            this.normalizedLanguage = args.normalizedLanguage;
        }
        if (args.closedCaption != null) {
            this.isClosedCaption = args.closedCaption;
        }
        if (args.audioDescription != null) {
            this.isAudioDescription = args.audioDescription;
        }
        this.representations = argsRepresentations
            .map(function (representation) {
            return new Representation(objectAssign({ rootId: _this.id }, representation));
        })
            .sort(function (a, b) { return a.bitrate - b.bitrate; })
            .filter(function (representation) {
            if (representationFilter == null) {
                return true;
            }
            return representationFilter(representation, {
                bufferType: _this.type,
                language: _this.language,
                normalizedLanguage: _this.normalizedLanguage,
                isClosedCaption: _this.isClosedCaption,
                isAudioDescription: _this.isAudioDescription,
            });
        });
        // for manuallyAdded adaptations (not in the manifest)
        this.manuallyAdded = !!args.manuallyAdded;
    }
    /**
     * @returns {Array.<Number>}
     */
    Adaptation.prototype.getAvailableBitrates = function () {
        return this.representations
            .map(function (representation) { return representation.bitrate; });
    };
    /**
     * @param {Number|string} wantedId
     * @returns {Representation}
     */
    Adaptation.prototype.getRepresentation = function (wantedId) {
        return arrayFind(this.representations, function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
    };
    /**
     * @param {Number} bitrate
     * @returns {Array.<Representations>|null}
     */
    Adaptation.prototype.getRepresentationsForBitrate = function (bitrate) {
        return this.representations.filter(function (representation) {
            return representation.bitrate === bitrate;
        }) || null;
    };
    return Adaptation;
}());
export default Adaptation;
/**
 * @param {string} adaptationType
 * @param {Array.<Object>} representations
 * @returns {Array.<Object>}
 */
function filterSupportedRepresentations(adaptationType, representations) {
    if (adaptationType === "audio" || adaptationType === "video") {
        return representations.filter(function (representation) {
            return isCodecSupported(getCodec(representation));
        });
    }
    // TODO for the other types?
    return representations;
    /**
     * Construct the codec string from given codecs and mimetype.
     * @param {Object} representation
     * @returns {string}
     */
    function getCodec(representation) {
        var _a = representation.codecs, codecs = _a === void 0 ? "" : _a, _b = representation.mimeType, mimeType = _b === void 0 ? "" : _b;
        return mimeType + ";codecs=\"" + codecs + "\"";
    }
}
