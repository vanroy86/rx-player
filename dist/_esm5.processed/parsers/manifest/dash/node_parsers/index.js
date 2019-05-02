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
import config from "../../../../config";
import log from "../../../../log";
import arrayIncludes from "../../../../utils/array-includes";
import generateNewId from "../../../../utils/id";
import { normalize as normalizeLang, } from "../../../../utils/languages";
import { normalizeBaseURL, resolveURL, } from "../../../../utils/url";
import checkManifestIDs from "../../utils/check_manifest_ids";
import { isHardOfHearing, isVisuallyImpaired, } from "../helpers";
import BaseRepresentationIndex from "../indexes/base";
import ListRepresentationIndex from "../indexes/list";
import TemplateRepresentationIndex from "../indexes/template";
import TimelineRepresentationIndex from "../indexes/timeline";
import { createMPDIntermediateRepresentation, } from "./MPD";
var KNOWN_ADAPTATION_TYPES = ["audio", "video", "text", "image"];
var SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];
/**
 * Infers the type of adaptation from codec and mimetypes found in it.
 *
 * This follows the guidelines defined by the DASH-IF IOP:
 *   - one adaptation set contains a single media type
 *   - The order of verifications are:
 *       1. mimeType
 *       2. Role
 *       3. codec
 *
 * Note: This is based on DASH-IF-IOP-v4.0 with some more freedom.
 * @param {Object} adaptation
 * @returns {string} - "audio"|"video"|"text"|"image"|"metadata"|"unknown"
 */
function inferAdaptationType(adaptationMimeType, representationMimeTypes, adaptationCodecs, representationCodecs, adaptationRoles) {
    function fromMimeType(mimeType, roles) {
        var topLevel = mimeType.split("/")[0];
        if (arrayIncludes(KNOWN_ADAPTATION_TYPES, topLevel)) {
            return topLevel;
        }
        if (mimeType === "application/bif") {
            return "image";
        }
        if (mimeType === "application/ttml+xml") {
            return "text";
        }
        // manage DASH-IF mp4-embedded subtitles and metadata
        if (mimeType === "application/mp4") {
            if (roles != null) {
                if (arrayFind(roles, function (role) {
                    return role.schemeIdUri === "urn:mpeg:dash:role:2011" &&
                        arrayIncludes(SUPPORTED_TEXT_TYPES, role.value);
                }) != null) {
                    return "text";
                }
            }
            return "metadata";
        }
    }
    function fromCodecs(codecs) {
        switch (codecs.substr(0, 3)) {
            case "avc":
            case "hev":
            case "hvc":
            case "vp8":
            case "vp9":
            case "av1":
                return "video";
            case "vtt":
                return "text";
            case "bif":
                return "image";
        }
        switch (codecs.substr(0, 4)) {
            case "mp4a":
                return "audio";
            case "wvtt":
            case "stpp":
                return "text";
        }
    }
    if (adaptationMimeType != null) {
        var typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRoles);
        if (typeFromMimeType != null) {
            return typeFromMimeType;
        }
    }
    if (adaptationCodecs != null) {
        var typeFromCodecs = fromCodecs(adaptationCodecs);
        if (typeFromCodecs != null) {
            return typeFromCodecs;
        }
    }
    for (var i = 0; i < representationMimeTypes.length; i++) {
        var representationMimeType = representationMimeTypes[i];
        if (representationMimeType != null) {
            var typeFromMimeType = fromMimeType(representationMimeType, adaptationRoles);
            if (typeFromMimeType != null) {
                return typeFromMimeType;
            }
        }
    }
    for (var i = 0; i < representationCodecs.length; i++) {
        var codecs = representationCodecs[i];
        if (codecs != null) {
            var typeFromMimeType = fromCodecs(codecs);
            if (typeFromMimeType != null) {
                return typeFromMimeType;
            }
        }
    }
    return "unknown";
}
/**
 * Returns "last time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the earliest last time from every representations in the given
 * adaptation.
 *
 * This is done to calculate a liveGap which is valid for the whole manifest,
 * even in weird ones.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
var getLastLiveTimeReference = function (adaptation) {
    // Here's how we do, for each possibility:
    //  1. only the adaptation has an index (no representation has):
    //    - returns the index last time reference
    //
    //  2. every representations have an index:
    //    - returns minimum for every representations
    //
    //  3. not all representations have an index but the adaptation has
    //    - returns minimum between all representations and the adaptation
    //
    //  4. no index for 1+ representation(s) and no adaptation index:
    //    - returns undefined
    //
    //  5. Invalid index found somewhere:
    //    - returns undefined
    if (!adaptation) {
        return undefined;
    }
    var representations = adaptation.representations || [];
    var lastLiveTimeReferences = representations
        .map(function (representation) {
        var lastPosition = representation.index.getLastPosition();
        return lastPosition != null ? lastPosition - 10 : undefined;
    });
    if (lastLiveTimeReferences.some(function (x) { return x == null; })) {
        return undefined;
    }
    var representationsMin = Math.min.apply(Math, lastLiveTimeReferences);
    if (isNaN(representationsMin)) {
        return undefined;
    }
    return representationsMin;
};
export default function parseManifest(root, uri
// contentProtectionParser?: IContentProtectionParser
) {
    // Transform whole MPD into a parsed JS object representation
    var _a = createMPDIntermediateRepresentation(root), rootChildren = _a.children, rootAttributes = _a.attributes;
    var mpdRootURL = resolveURL(normalizeBaseURL(uri), rootChildren.baseURL);
    var parsedPeriods = [];
    var _loop_1 = function (i) {
        var period = rootChildren.periods[i];
        // 1. Construct partial URL for contents
        var periodRootURL = resolveURL(mpdRootURL, period.children.baseURL);
        // 2. Generate ID
        var periodID = void 0;
        if (period.attributes.id == null) {
            log.warn("DASH: No usable id found in the Period. Generating one.");
            periodID = "gen-dash-period-" + generateNewId();
        }
        else {
            periodID = period.attributes.id;
        }
        // 3. Find the start of the Period (required)
        var periodStart;
        if (period.attributes.start != null) {
            periodStart = period.attributes.start;
        }
        else {
            if (i === 0) {
                periodStart = (rootAttributes.type === "static" ||
                    rootAttributes.availabilityStartTime == null) ? 0 : rootAttributes.availabilityStartTime;
            }
            else {
                var prevPeriod = parsedPeriods[i - 1];
                if (prevPeriod.duration != null) {
                    periodStart = prevPeriod.start + prevPeriod.duration;
                }
                else {
                    throw new Error("Not enough informations on the periods: cannot find start.");
                }
            }
        }
        var periodDuration = void 0;
        if (period.attributes.duration != null) {
            periodDuration = period.attributes.duration;
        }
        else {
            var nextPeriod = parsedPeriods[i + 1];
            if (nextPeriod && nextPeriod.start != null) {
                periodDuration = nextPeriod.start - periodStart;
            }
            else if (i === 0 &&
                rootAttributes.duration &&
                !nextPeriod) {
                periodDuration = rootAttributes.duration;
            }
        }
        // 4. Construct underlying adaptations
        var adaptations = period.children.adaptations
            .reduce(function (acc, adaptation) {
            var _a;
            var parsedAdaptations = acc.adaptations;
            var adaptationRootURL = resolveURL(periodRootURL, adaptation.children.baseURL);
            var adaptationChildren = adaptation.children;
            // 4-1. Find Index
            function findAdaptationIndex(representation) {
                var repId = representation.attributes.id || "";
                var repBitrate = representation.attributes.bitrate;
                var baseURL = representation.children.baseURL;
                var representationURL = resolveURL(adaptationRootURL, baseURL);
                var adaptationIndex;
                if (adaptationChildren.segmentBase != null) {
                    var segmentBase = adaptationChildren.segmentBase;
                    adaptationIndex = new BaseRepresentationIndex(segmentBase, {
                        periodStart: periodStart,
                        representationURL: representationURL,
                        representationId: repId,
                        representationBitrate: repBitrate,
                    });
                }
                else if (adaptationChildren.segmentList != null) {
                    var segmentList = adaptationChildren.segmentList;
                    adaptationIndex = new ListRepresentationIndex(segmentList, {
                        periodStart: periodStart,
                        representationURL: representationURL,
                        representationId: repId,
                        representationBitrate: repBitrate,
                    });
                }
                else if (adaptationChildren.segmentTemplate != null) {
                    var segmentTemplate = adaptationChildren.segmentTemplate;
                    adaptationIndex = segmentTemplate.indexType === "timeline" ?
                        new TimelineRepresentationIndex(segmentTemplate, {
                            periodStart: periodStart,
                            representationURL: representationURL,
                            representationId: repId,
                            representationBitrate: repBitrate,
                        }) :
                        new TemplateRepresentationIndex(segmentTemplate, {
                            periodStart: periodStart,
                            representationURL: representationURL,
                            representationId: repId,
                            representationBitrate: repBitrate,
                        });
                }
                else {
                    adaptationIndex = new TemplateRepresentationIndex({
                        duration: Number.MAX_VALUE,
                        timescale: 1,
                        startNumber: 0,
                        initialization: { media: "" },
                        media: "",
                    }, {
                        periodStart: periodStart,
                        representationURL: representationURL,
                        representationId: repId,
                        representationBitrate: repBitrate,
                    });
                }
                return adaptationIndex;
            }
            // 4-2. Construct Representations
            var representations = adaptation.children
                .representations.map(function (representation) {
                var repId = representation.attributes.id || "";
                var repBitrate = representation.attributes.bitrate;
                var baseURL = representation.children.baseURL;
                var representationURL = resolveURL(adaptationRootURL, baseURL);
                // 4-2-1. Find bitrate
                var representationBitrate;
                if (representation.attributes.bitrate == null) {
                    log.warn("DASH: No usable bitrate found in the Representation.");
                    representationBitrate = 0;
                }
                else {
                    representationBitrate = representation.attributes.bitrate;
                }
                // 4-2-2. Find Index
                var representationIndex;
                if (representation.children.segmentBase != null) {
                    var segmentBase = representation.children.segmentBase;
                    representationIndex = new BaseRepresentationIndex(segmentBase, {
                        periodStart: periodStart,
                        representationURL: representationURL,
                        representationId: repId,
                        representationBitrate: repBitrate,
                    });
                }
                else if (representation.children.segmentList != null) {
                    var segmentList = representation.children.segmentList;
                    representationIndex = new ListRepresentationIndex(segmentList, {
                        periodStart: periodStart,
                        representationURL: representationURL,
                        representationId: repId,
                        representationBitrate: repBitrate,
                    });
                }
                else if (representation.children.segmentTemplate != null) {
                    var segmentTemplate = representation.children.segmentTemplate;
                    representationIndex = segmentTemplate.indexType === "timeline" ?
                        new TimelineRepresentationIndex(segmentTemplate, {
                            periodStart: periodStart,
                            representationURL: representationURL,
                            representationId: repId,
                            representationBitrate: repBitrate,
                        }) :
                        new TemplateRepresentationIndex(segmentTemplate, {
                            periodStart: periodStart,
                            representationURL: representationURL,
                            representationId: repId,
                            representationBitrate: repBitrate,
                        });
                }
                else {
                    representationIndex = findAdaptationIndex(representation);
                }
                // 4-2-3. Set ID
                var representationID = representation.attributes.id != null ?
                    representation.attributes.id :
                    (representation.attributes.bitrate +
                        (representation.attributes.height != null ?
                            ("-" + representation.attributes.height) : "") +
                        (representation.attributes.width != null ?
                            ("-" + representation.attributes.width) : "") +
                        (representation.attributes.mimeType != null ?
                            ("-" + representation.attributes.mimeType) : "") +
                        (representation.attributes.codecs != null ?
                            ("-" + representation.attributes.codecs) : ""));
                // 4-2-4. Construct Representation Base
                var parsedRepresentation = {
                    bitrate: representationBitrate,
                    index: representationIndex,
                    id: representationID,
                };
                // 4-2-5. Add optional attributes
                var codecs;
                if (representation.attributes.codecs != null) {
                    codecs = representation.attributes.codecs;
                }
                else if (adaptation.attributes.codecs != null) {
                    codecs = adaptation.attributes.codecs;
                }
                if (codecs != null) {
                    codecs = codecs === "mp4a.40.02" ? "mp4a.40.2" : codecs;
                    parsedRepresentation.codecs = codecs;
                }
                if (representation.attributes.audioSamplingRate != null) {
                    parsedRepresentation.audioSamplingRate =
                        representation.attributes.audioSamplingRate;
                }
                else if (adaptation.attributes.audioSamplingRate != null) {
                    parsedRepresentation.audioSamplingRate =
                        adaptation.attributes.audioSamplingRate;
                }
                if (representation.attributes.codingDependency != null) {
                    parsedRepresentation.codingDependency =
                        representation.attributes.codingDependency;
                }
                else if (adaptation.attributes.codingDependency != null) {
                    parsedRepresentation.codingDependency =
                        adaptation.attributes.codingDependency;
                }
                if (representation.attributes.frameRate != null) {
                    parsedRepresentation.frameRate =
                        representation.attributes.frameRate;
                }
                else if (adaptation.attributes.frameRate != null) {
                    parsedRepresentation.frameRate =
                        adaptation.attributes.frameRate;
                }
                if (representation.attributes.height != null) {
                    parsedRepresentation.height =
                        representation.attributes.height;
                }
                else if (adaptation.attributes.height != null) {
                    parsedRepresentation.height =
                        adaptation.attributes.height;
                }
                if (representation.attributes.maxPlayoutRate != null) {
                    parsedRepresentation.maxPlayoutRate =
                        representation.attributes.maxPlayoutRate;
                }
                else if (adaptation.attributes.maxPlayoutRate != null) {
                    parsedRepresentation.maxPlayoutRate =
                        adaptation.attributes.maxPlayoutRate;
                }
                if (representation.attributes.maximumSAPPeriod != null) {
                    parsedRepresentation.maximumSAPPeriod =
                        representation.attributes.maximumSAPPeriod;
                }
                else if (adaptation.attributes.maximumSAPPeriod != null) {
                    parsedRepresentation.maximumSAPPeriod =
                        adaptation.attributes.maximumSAPPeriod;
                }
                if (representation.attributes.mimeType != null) {
                    parsedRepresentation.mimeType =
                        representation.attributes.mimeType;
                }
                else if (adaptation.attributes.mimeType != null) {
                    parsedRepresentation.mimeType =
                        adaptation.attributes.mimeType;
                }
                if (representation.attributes.profiles != null) {
                    parsedRepresentation.profiles =
                        representation.attributes.profiles;
                }
                else if (adaptation.attributes.profiles != null) {
                    parsedRepresentation.profiles =
                        adaptation.attributes.profiles;
                }
                if (representation.attributes.qualityRanking != null) {
                    parsedRepresentation.qualityRanking =
                        representation.attributes.qualityRanking;
                }
                if (representation.attributes.segmentProfiles != null) {
                    parsedRepresentation.segmentProfiles =
                        representation.attributes.segmentProfiles;
                }
                else if (adaptation.attributes.segmentProfiles != null) {
                    parsedRepresentation.segmentProfiles =
                        adaptation.attributes.segmentProfiles;
                }
                if (representation.attributes.width != null) {
                    parsedRepresentation.width =
                        representation.attributes.width;
                }
                else if (adaptation.attributes.width != null) {
                    parsedRepresentation.width =
                        adaptation.attributes.width;
                }
                if (adaptation.children.contentProtections) {
                    var contentProtections = [];
                    for (var k = 0; k < adaptation.children.contentProtections.length; k++) {
                        var protection = adaptation.children.contentProtections[k];
                        if (protection.keyId != null) {
                            contentProtections.push({ keyId: protection.keyId });
                        }
                    }
                    if (contentProtections.length) {
                        parsedRepresentation.contentProtections = contentProtections;
                    }
                }
                return parsedRepresentation;
            });
            var adaptationMimeType = adaptation.attributes.mimeType;
            var adaptationCodecs = adaptation.attributes.codecs;
            var representationMimeTypes = representations
                .map(function (representation) { return representation.mimeType; })
                .filter(function (mimeType) { return mimeType != null; });
            var representationCodecs = representations
                .map(function (representation) { return representation.codecs; })
                .filter(function (codecs) { return codecs != null; });
            var type = inferAdaptationType(adaptationMimeType || null, representationMimeTypes, adaptationCodecs || null, representationCodecs, adaptationChildren.roles || null);
            var roles = adaptationChildren.roles;
            var isMainAdaptation = !!roles &&
                !!arrayFind(roles, function (role) { return role.value === "main"; }) &&
                !!arrayFind(roles, function (role) { return role.schemeIdUri === "urn:mpeg:dash:role:2011"; });
            var videoMainAdaptation = acc.videoMainAdaptation;
            if (type === "video" && videoMainAdaptation !== null && isMainAdaptation) {
                (_a = videoMainAdaptation.representations).push.apply(_a, representations);
            }
            else {
                var closedCaption = void 0;
                var audioDescription = void 0;
                if (type === "text" &&
                    adaptationChildren.accessibility &&
                    isHardOfHearing(adaptationChildren.accessibility)) {
                    closedCaption = true;
                }
                if (type === "audio" &&
                    adaptationChildren.accessibility &&
                    isVisuallyImpaired(adaptationChildren.accessibility)) {
                    audioDescription = true;
                }
                var adaptationID = void 0;
                if (adaptation.attributes.id != null) {
                    adaptationID = adaptation.attributes.id;
                }
                else {
                    var idString = type;
                    if (adaptation.attributes.language) {
                        idString += "-" + adaptation.attributes.language;
                    }
                    if (closedCaption) {
                        idString += "-cc";
                    }
                    if (audioDescription) {
                        idString += "-ad";
                    }
                    if (adaptation.attributes.contentType) {
                        idString += "-" + adaptation.attributes.contentType;
                    }
                    if (adaptation.attributes.codecs) {
                        idString += "-" + adaptation.attributes.codecs;
                    }
                    if (adaptation.attributes.mimeType) {
                        idString += "-" + adaptation.attributes.mimeType;
                    }
                    if (adaptation.attributes.frameRate) {
                        idString += "-" + adaptation.attributes.frameRate;
                    }
                    if (idString.length === type.length) {
                        idString += representations.length ?
                            ("-" + representations[0].id) : "-empty";
                    }
                    adaptationID = "adaptation-" + idString;
                }
                var parsedAdaptationSet = {
                    id: adaptationID,
                    representations: representations,
                    type: type,
                };
                if (adaptation.attributes.language != null) {
                    parsedAdaptationSet.language = adaptation.attributes.language;
                    parsedAdaptationSet.normalizedLanguage =
                        normalizeLang(adaptation.attributes.language);
                }
                if (closedCaption != null) {
                    parsedAdaptationSet.closedCaption = closedCaption;
                }
                if (audioDescription != null) {
                    parsedAdaptationSet.audioDescription = audioDescription;
                }
                var parsedAdaptation = parsedAdaptations[type];
                if (!parsedAdaptation) {
                    parsedAdaptations[type] = [parsedAdaptationSet];
                    if (isMainAdaptation && type === "video") {
                        acc.videoMainAdaptation = parsedAdaptationSet;
                    }
                }
                else if (isMainAdaptation && type === "video") {
                    // put "main" adaptation as the first
                    parsedAdaptation.unshift(parsedAdaptationSet);
                    acc.videoMainAdaptation = parsedAdaptationSet;
                }
                else {
                    parsedAdaptation.push(parsedAdaptationSet);
                }
            }
            return {
                adaptations: parsedAdaptations,
                videoMainAdaptation: acc.videoMainAdaptation,
            };
        }, { videoMainAdaptation: null, adaptations: {} }).adaptations;
        var parsedPeriod = {
            id: periodID,
            start: periodStart,
            duration: periodDuration,
            adaptations: adaptations,
        };
        if (period.attributes.bitstreamSwitching != null) {
            parsedPeriod.bitstreamSwitching = period.attributes.bitstreamSwitching;
        }
        parsedPeriods.push(parsedPeriod);
    };
    for (var i = 0; i < rootChildren.periods.length; i++) {
        _loop_1(i);
    }
    var parsedMPD = {
        availabilityStartTime: (rootAttributes.type === "static" ||
            rootAttributes.availabilityStartTime == null) ? 0 : rootAttributes.availabilityStartTime,
        duration: rootAttributes.duration == null ? Infinity : rootAttributes.duration,
        id: rootAttributes.id != null ?
            rootAttributes.id : "gen-dash-manifest-" + generateNewId(),
        periods: parsedPeriods,
        transportType: "dash",
        isLive: rootAttributes.type === "dynamic",
        uris: [uri].concat(rootChildren.locations),
        suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay != null ?
            rootAttributes.suggestedPresentationDelay :
            config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
    };
    // -- add optional fields --
    if (rootAttributes.profiles != null) {
        parsedMPD.profiles = rootAttributes.profiles;
    }
    if (rootAttributes.type !== "static" && rootAttributes.availabilityEndTime != null) {
        parsedMPD.availabilityEndTime = rootAttributes.availabilityEndTime;
    }
    if (rootAttributes.publishTime != null) {
        parsedMPD.publishTime = rootAttributes.publishTime;
    }
    if (rootAttributes.duration != null) {
        parsedMPD.duration = rootAttributes.duration;
    }
    if (rootAttributes.minimumUpdatePeriod != null) {
        parsedMPD.minimumUpdatePeriod = rootAttributes.minimumUpdatePeriod;
    }
    if (rootAttributes.minBufferTime != null) {
        parsedMPD.minBufferTime = rootAttributes.minBufferTime;
    }
    if (rootAttributes.timeShiftBufferDepth != null) {
        parsedMPD.timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
    }
    if (rootAttributes.maxSegmentDuration != null) {
        parsedMPD.maxSegmentDuration = rootAttributes.maxSegmentDuration;
    }
    if (rootAttributes.maxSubsegmentDuration != null) {
        parsedMPD.maxSubsegmentDuration = rootAttributes.maxSubsegmentDuration;
    }
    if (parsedMPD.isLive) {
        var lastPeriodAdaptations = parsedMPD.periods[parsedMPD.periods.length - 1].adaptations;
        var firstAdaptationsFromLastPeriod = lastPeriodAdaptations.video ||
            lastPeriodAdaptations.audio;
        if (!firstAdaptationsFromLastPeriod || !firstAdaptationsFromLastPeriod.length) {
            throw new Error("Can't find first adaptation from last period");
        }
        var firstAdaptationFromLastPeriod = firstAdaptationsFromLastPeriod[0];
        var lastRef = getLastLiveTimeReference(firstAdaptationFromLastPeriod);
        parsedMPD.presentationLiveGap = lastRef != null ?
            Date.now() / 1000 - (lastRef + parsedMPD.availabilityStartTime) : 10;
    }
    checkManifestIDs(parsedMPD);
    return parsedMPD;
}
