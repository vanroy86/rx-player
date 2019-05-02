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
import MediaError from "../../errors/MediaError";
import features from "../../features";
import log from "../../log";
import BufferGarbageCollector from "./garbage_collector";
import QueuedSourceBuffer from "./queued_source_buffer";
var POSSIBLE_BUFFER_TYPES = ["audio", "video", "text", "image"];
/**
 * Get all currently available buffer types.
 * /!\ This list can evolve at runtime depending on feature switching.
 * @returns {Array.<string>}
 */
export function getBufferTypes() {
    var bufferTypes = ["audio", "video"];
    if (features.nativeTextTracksBuffer != null ||
        features.htmlTextTracksBuffer != null) {
        bufferTypes.push("text");
    }
    if (features.imageBuffer != null) {
        bufferTypes.push("image");
    }
    return bufferTypes;
}
/**
 * Allows to easily create and dispose SourceBuffers.
 *
 * Only one source buffer per type is allowed at the same time:
 *
 *   - source buffers for native types (which depends on the native
 *     SourceBuffer implementation), are reused if one is re-created.
 *
 *   - source buffers for custom types are aborted each time a new one of the
 *     same type is created.
 *
 * The returned SourceBuffer is actually a QueuedSourceBuffer instance which
 * wrap a SourceBuffer implementation to queue all its actions.
 *
 * @class SourceBufferManager
 */
var SourceBufferManager = /** @class */ (function () {
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {MediaSource} mediaSource
     * @constructor
     */
    function SourceBufferManager(mediaElement, mediaSource) {
        this._mediaElement = mediaElement;
        this._mediaSource = mediaSource;
        this._initializedNativeSourceBuffers = {};
        this._initializedCustomSourceBuffers = {};
    }
    /**
     * Returns true if the source buffer is "native" (has to be attached to the
     * mediaSource at the beginning of the stream.
     * @static
     * @param {string} bufferType
     * @returns {Boolean}
     */
    SourceBufferManager.isNative = function (bufferType) {
        return shouldHaveNativeSourceBuffer(bufferType);
    };
    /**
     * Returns true if a SourceBuffer with the type given has been created with
     * this instance of the SourceBufferManager.
     * @param {string} bufferType
     * @returns {Boolean}
     */
    SourceBufferManager.prototype.has = function (bufferType) {
        if (shouldHaveNativeSourceBuffer(bufferType)) {
            return !!this._initializedNativeSourceBuffers[bufferType];
        }
        return !!this._initializedCustomSourceBuffers[bufferType];
    };
    /**
     * Returns the created QueuedSourceBuffer for the given type.
     * Throws if no QueuedSourceBuffer were created for the given type.
     *
     * @param {string} bufferType
     * @returns {QueuedSourceBuffer}
     */
    SourceBufferManager.prototype.get = function (bufferType) {
        if (shouldHaveNativeSourceBuffer(bufferType)) {
            var sourceBufferInfos = this._initializedNativeSourceBuffers[bufferType];
            if (!sourceBufferInfos) {
                throw new Error("SourceBufferManager: no " + bufferType + " initialized yet");
            }
            return sourceBufferInfos.sourceBuffer;
        }
        else {
            var sourceBufferInfos = this._initializedCustomSourceBuffers[bufferType];
            if (!sourceBufferInfos) {
                throw new Error("SourceBufferManager: no " + bufferType + " initialized yet");
            }
            return sourceBufferInfos.sourceBuffer;
        }
    };
    /**
     * Creates a new QueuedSourceBuffer for the given buffer type.
     * Reuse an already created one if a QueuedSourceBuffer for the given type
     * already exists. TODO Throw or abort old one instead?
     * @param {string} bufferType
     * @param {string} codec
     * @param {Object|undefined} options
     * @returns {QueuedSourceBuffer}
     */
    SourceBufferManager.prototype.createSourceBuffer = function (bufferType, codec, options) {
        if (options === void 0) { options = {}; }
        if (shouldHaveNativeSourceBuffer(bufferType)) {
            var memorizedSourceBuffer = this._initializedNativeSourceBuffers[bufferType];
            if (memorizedSourceBuffer) {
                if (memorizedSourceBuffer.codec !== codec) {
                    log.warn("reusing native SourceBuffer with codec", memorizedSourceBuffer.codec, "for codec", codec);
                }
                else {
                    log.info("reusing native SourceBuffer with codec", codec);
                }
                return memorizedSourceBuffer.sourceBuffer;
            }
            log.info("adding native SourceBuffer with codec", codec);
            var nativeSourceBuffer = createNativeQueuedSourceBuffer(bufferType, this._mediaSource, codec);
            this._initializedNativeSourceBuffers[bufferType] = {
                codec: codec,
                sourceBuffer: nativeSourceBuffer,
            };
            return nativeSourceBuffer;
        }
        var memorizedCustomSourceBuffer = this
            ._initializedCustomSourceBuffers[bufferType];
        if (memorizedCustomSourceBuffer) {
            log.info("reusing a previous custom SourceBuffer for the type", bufferType);
            return memorizedCustomSourceBuffer.sourceBuffer;
        }
        if (bufferType === "text") {
            log.info("creating a new text SourceBuffer with codec", codec);
            var sourceBuffer = void 0;
            if (options.textTrackMode === "html") {
                if (features.htmlTextTracksBuffer == null) {
                    throw new Error("HTML Text track feature not activated");
                }
                sourceBuffer = new features
                    .htmlTextTracksBuffer(this._mediaElement, options.textTrackElement);
            }
            else {
                if (features.nativeTextTracksBuffer == null) {
                    throw new Error("Native Text track feature not activated");
                }
                sourceBuffer = new features
                    .nativeTextTracksBuffer(this._mediaElement, !!options.hideNativeSubtitle);
            }
            var queuedSourceBuffer = new QueuedSourceBuffer("text", sourceBuffer);
            this._initializedCustomSourceBuffers.text = {
                codec: codec,
                sourceBuffer: queuedSourceBuffer,
            };
            return queuedSourceBuffer;
        }
        else if (bufferType === "image") {
            if (features.imageBuffer == null) {
                throw new Error("Image buffer feature not activated");
            }
            log.info("creating a new image SourceBuffer with codec", codec);
            var sourceBuffer = new features.imageBuffer();
            var queuedSourceBuffer = new QueuedSourceBuffer("image", sourceBuffer);
            this._initializedCustomSourceBuffers.image = {
                codec: codec,
                sourceBuffer: queuedSourceBuffer,
            };
            return queuedSourceBuffer;
        }
        log.error("unknown buffer type:", bufferType);
        throw new MediaError("BUFFER_TYPE_UNKNOWN", null, true);
    };
    /**
     * Dispose of the active SourceBuffer for the given type.
     * @param {string} bufferType
     */
    SourceBufferManager.prototype.disposeSourceBuffer = function (bufferType) {
        if (shouldHaveNativeSourceBuffer(bufferType)) {
            var memorizedNativeSourceBuffer = this
                ._initializedNativeSourceBuffers[bufferType];
            if (memorizedNativeSourceBuffer == null) {
                return;
            }
            log.info("aborting native source buffer", bufferType);
            if (this._mediaSource.readyState === "open") {
                try {
                    memorizedNativeSourceBuffer.sourceBuffer.abort();
                }
                catch (e) {
                    log.warn("failed to abort a SourceBuffer:", e);
                }
            }
            delete this._initializedNativeSourceBuffers[bufferType];
            return;
        }
        else if (bufferType === "text" || bufferType === "image") {
            var memorizedSourceBuffer = this
                ._initializedCustomSourceBuffers[bufferType];
            if (memorizedSourceBuffer == null) {
                return;
            }
            log.info("aborting custom source buffer", bufferType);
            try {
                memorizedSourceBuffer.sourceBuffer.abort();
            }
            catch (e) {
                log.warn("failed to abort a SourceBuffer:", e);
            }
            delete this._initializedCustomSourceBuffers[bufferType];
            return;
        }
        log.error("cannot dispose an unknown buffer type", bufferType);
    };
    /**
     * Dispose of all QueuedSourceBuffer created on this SourceBufferManager.
     */
    SourceBufferManager.prototype.disposeAll = function () {
        var _this = this;
        POSSIBLE_BUFFER_TYPES.forEach(function (bufferType) {
            if (_this.has(bufferType)) {
                _this.disposeSourceBuffer(bufferType);
            }
        });
    };
    return SourceBufferManager;
}());
export default SourceBufferManager;
/**
 * Adds a SourceBuffer to the MediaSource.
 * @param {MediaSource} mediaSource
 * @param {string} codec
 * @returns {SourceBuffer}
 */
function createNativeQueuedSourceBuffer(bufferType, mediaSource, codec) {
    var sourceBuffer = mediaSource.addSourceBuffer(codec);
    return new QueuedSourceBuffer(bufferType, sourceBuffer);
}
/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" source buffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeSourceBuffer(bufferType) {
    return bufferType === "audio" || bufferType === "video";
}
export { BufferGarbageCollector, QueuedSourceBuffer, };
