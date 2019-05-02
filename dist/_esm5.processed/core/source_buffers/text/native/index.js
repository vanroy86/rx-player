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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
import { addTextTrack, } from "../../../../compat";
import log from "../../../../log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import parseTextTrackToCues from "./parsers";
/**
 * Source buffer to display TextTracks in a <track> element, in the given
 * video element.
 * @class NativeTextTrackSourceBuffer
 * @extends AbstractSourceBuffer
 */
var NativeTextTrackSourceBuffer = /** @class */ (function (_super) {
    __extends(NativeTextTrackSourceBuffer, _super);
    /**
     * @param {HTMLMediaElement} videoElement
     * @param {Boolean} hideNativeSubtitle
     */
    function NativeTextTrackSourceBuffer(videoElement, hideNativeSubtitle) {
        var _this = this;
        log.debug("creating native text track source buffer");
        _this = _super.call(this) || this;
        var _a = addTextTrack(videoElement, hideNativeSubtitle), track = _a.track, trackElement = _a.trackElement;
        _this._videoElement = videoElement;
        _this._track = track;
        _this._trackElement = trackElement;
        return _this;
    }
    /**
     * Append text tracks.
     * @param {Object} data
     */
    NativeTextTrackSourceBuffer.prototype._append = function (data) {
        log.debug("appending new native text tracks", data);
        var timescale = data.timescale, // timescale for the start and end
        timescaledStart = data.start, // exact beginning to which the track applies
        timescaledEnd = data.end, // exact end to which the track applies
        dataString = data.data, // text track content. Should be a string
        type = data.type, // type of texttracks (e.g. "ttml" or "vtt")
        language = data.language;
        if (timescaledEnd != null && timescaledEnd - timescaledStart <= 0) {
            // this is accepted for error resilience, just skip that case.
            log.warn("Invalid subtitles appended");
            return;
        }
        var startTime = timescaledStart / timescale;
        var endTime = timescaledEnd != null ? timescaledEnd / timescale : undefined;
        var cues = parseTextTrackToCues(type, dataString, this.timestampOffset, language);
        if (cues.length > 0) {
            var firstCue = cues[0];
            // NOTE(compat): cleanup all current cues if the newly added
            // ones are in the past. this is supposed to fix an issue on
            // IE/Edge.
            var currentCues = this._track.cues;
            if (currentCues.length > 0) {
                if (firstCue.startTime < currentCues[currentCues.length - 1].startTime) {
                    this._remove(firstCue.startTime, +Infinity);
                }
            }
            for (var i = 0; i < cues.length; i++) {
                this._track.addCue(cues[i]);
            }
            this.buffered.insert(startTime, endTime != null ? endTime : cues[cues.length - 1].endTime);
        }
        else if (endTime != null) {
            this.buffered.insert(startTime, endTime);
        }
    };
    /**
     * @param {Number} from
     * @param {Number} to
     */
    NativeTextTrackSourceBuffer.prototype._remove = function (from, to) {
        log.debug("removing native text track data", from, to);
        var track = this._track;
        var cues = track.cues;
        for (var i = cues.length - 1; i >= 0; i--) {
            var cue = cues[i];
            var startTime = cue.startTime, endTime = cue.endTime;
            if (startTime >= from && startTime <= to && endTime <= to) {
                track.removeCue(cue);
            }
        }
        this.buffered.remove(from, to);
    };
    NativeTextTrackSourceBuffer.prototype._abort = function () {
        log.debug("aborting native text track source buffer");
        var _a = this, _trackElement = _a._trackElement, _videoElement = _a._videoElement;
        if (_trackElement && _videoElement &&
            _videoElement.hasChildNodes()) {
            try {
                _videoElement.removeChild(_trackElement);
            }
            catch (e) {
                log.warn("Can't remove track element from the video");
            }
        }
        if (this._track) {
            this._track.mode = "disabled";
        }
        if (this._trackElement) {
            this._trackElement.innerHTML = "";
        }
    };
    return NativeTextTrackSourceBuffer;
}(AbstractSourceBuffer));
export default NativeTextTrackSourceBuffer;
