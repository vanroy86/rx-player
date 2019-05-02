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
import { defer as observableDefer, of as observableOf, Subject, } from "rxjs";
import { mapTo } from "rxjs/operators";
import log from "../../log";
var SourceBufferAction;
(function (SourceBufferAction) {
    SourceBufferAction[SourceBufferAction["Append"] = 0] = "Append";
    SourceBufferAction[SourceBufferAction["Remove"] = 1] = "Remove";
})(SourceBufferAction || (SourceBufferAction = {}));
/**
 * Wrap a SourceBuffer and append/remove segments in it in a queue.
 *
 * Wait for the previous buffer action to be finished (updateend event) to
 * perform the next in the queue.
 *
 * To work correctly, only a single QueuedSourceBuffer per SourceBuffer should
 * be created.
 *
 * @class QueuedSourceBuffer
 */
var QueuedSourceBuffer = /** @class */ (function () {
    /**
     * @constructor
     * @param {SourceBuffer} sourceBuffer
     */
    function QueuedSourceBuffer(bufferType, sourceBuffer) {
        this.bufferType = bufferType;
        this._buffer = sourceBuffer;
        this._queue = [];
        this._flushing = null;
        this._lastInitSegment = null;
        this.__onUpdate = this._onUpdate.bind(this);
        this.__onError = this._onError.bind(this);
        this.__flush = this._flush.bind(this);
        this._buffer.addEventListener("update", this.__onUpdate);
        this._buffer.addEventListener("error", this.__onError);
        this._buffer.addEventListener("updateend", this.__flush);
    }
    /**
     * Append media segment to the attached SourceBuffer, in a FIFO queue.
     *
     * Depending on the type of data appended, this might need an associated
     * initialization segment.
     *
     * Such initialization segment will be pushed in the SourceBuffer if the
     * last segment pushed was associated to another initialization segment.
     * This detection is entirely reference-based so make sure that the same
     * initSegment argument given share the same reference.
     *
     * You can deactivate the usage of initialization segment by setting the
     * initSegment argument to null.
     *
     * You can also only push an initialization segment by setting the segment
     * argument to null.
     * @param {*|null} initSegment
     * @param {*|null} segment
     * @param {number|undefined} timestampOffset
     * @returns {Observable}
     */
    QueuedSourceBuffer.prototype.appendBuffer = function (initSegment, segment, timestampOffset) {
        var _this = this;
        return observableDefer(function () {
            return _this._addToQueue({
                type: SourceBufferAction.Append,
                segment: segment,
                initSegment: initSegment,
                timestampOffset: timestampOffset,
            });
        });
    };
    /**
     * Remove data from the attached SourceBuffer, in a FIFO queue.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Observable}
     */
    QueuedSourceBuffer.prototype.removeBuffer = function (start, end) {
        var _this = this;
        return observableDefer(function () {
            return _this._addToQueue({
                type: SourceBufferAction.Remove,
                start: start,
                end: end,
            });
        });
    };
    /**
     * Abort the linked SourceBuffer and dispose of the ressources used by this
     * QueuedSourceBuffer.
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     * @private
     */
    QueuedSourceBuffer.prototype.abort = function () {
        this.dispose();
        this._buffer.abort();
    };
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {TimeRanges}
     */
    QueuedSourceBuffer.prototype.getBuffered = function () {
        return this._buffer.buffered;
    };
    /**
     * Free up ressources used by this class.
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     */
    QueuedSourceBuffer.prototype.dispose = function () {
        this._buffer.removeEventListener("update", this.__onUpdate);
        this._buffer.removeEventListener("error", this.__onError);
        this._buffer.removeEventListener("updateend", this.__flush);
        this._queue.length = 0;
        this._flushing = null;
    };
    /**
     * Callback used for the 'update' event, as a segment has been added/removed.
     *
     * Emit and complete the corresponding subject to inform the action caller
     * of completion.
     *
     * @private
     */
    QueuedSourceBuffer.prototype._onUpdate = function () {
        if (this._flushing) {
            this._flushing.next(undefined);
            // security against side-effects from the previous `next` instruction
            if (this._flushing) {
                this._flushing.complete();
                this._flushing = null;
            }
        }
    };
    /**
     * Callback used for the 'error' event from the SourceBuffer.
     *
     * Emit the error through the corresponding subject to inform the action
     * caller.
     *
     * @private
     * @param {Error} error
     */
    QueuedSourceBuffer.prototype._onError = function (error) {
        if (this._flushing) {
            this._flushing.error(error);
            this._flushing = null;
        }
    };
    /**
     * Queue a new action.
     * Begin flushing if no action were previously in the queue.
     * @private
     * @param {Object} action
     * @returns {Subject} - Can be used to follow the buffer action advancement.
     */
    QueuedSourceBuffer.prototype._addToQueue = function (action) {
        var shouldFlush = !this._queue.length;
        var subject = new Subject();
        if (action.type === SourceBufferAction.Append) {
            var segment = action.segment, initSegment = action.initSegment, timestampOffset = action.timestampOffset;
            if (initSegment === null && segment === null) {
                log.warn("QueuedSourceBuffer: no segment appended.");
                return observableOf(undefined);
            }
            if (initSegment === null) {
                this._queue.unshift({
                    type: SourceBufferAction.Append,
                    args: { segment: segment, timestampOffset: timestampOffset },
                    subject: subject,
                });
            }
            else if (segment === null) {
                if (this._lastInitSegment === initSegment) {
                    return observableOf(undefined);
                }
                this._queue.unshift({
                    type: SourceBufferAction.Append,
                    args: { segment: initSegment, timestampOffset: timestampOffset },
                    subject: subject,
                });
            }
            else {
                if (this._lastInitSegment !== initSegment) {
                    this._queue.unshift({
                        type: SourceBufferAction.Append,
                        args: { segment: initSegment, timestampOffset: timestampOffset },
                        subject: null,
                    });
                }
                this._queue.unshift({
                    type: SourceBufferAction.Append,
                    args: { segment: segment, timestampOffset: timestampOffset },
                    subject: subject,
                });
            }
            this._lastInitSegment = initSegment;
        }
        else if (action.type === SourceBufferAction.Remove) {
            this._queue.unshift({
                type: SourceBufferAction.Remove,
                args: {
                    start: action.start,
                    end: action.end,
                },
                subject: subject,
            });
        }
        else {
            throw new Error("QueuedSourceBuffer: unrecognized action");
        }
        if (shouldFlush) {
            this._flush();
        }
        return subject.pipe(mapTo(undefined));
    };
    /**
     * Perform next queued action if one and none are pending.
     * @private
     */
    QueuedSourceBuffer.prototype._flush = function () {
        if (this._flushing || this._queue.length === 0 || this._buffer.updating) {
            return;
        }
        // TODO TypeScrypt do not get the previous length check? Find solution /
        // open issue
        var queueItem = this._queue.pop();
        this._flushing = queueItem.subject;
        try {
            switch (queueItem.type) {
                case SourceBufferAction.Append:
                    var _a = queueItem.args, segment = _a.segment, _b = _a.timestampOffset, timestampOffset = _b === void 0 ? 0 : _b;
                    if (this._buffer.timestampOffset !== timestampOffset) {
                        var newTimestampOffset = timestampOffset || 0;
                        log.debug("updating timestampOffset", this._buffer.timestampOffset, newTimestampOffset);
                        this._buffer.timestampOffset = newTimestampOffset;
                    }
                    log.debug("pushing data to source buffer", queueItem.args);
                    this._buffer.appendBuffer(segment);
                    break;
                case SourceBufferAction.Remove:
                    var _c = queueItem.args, start = _c.start, end = _c.end;
                    log.debug("removing data from source buffer", start, end);
                    this._buffer.remove(start, end);
                    break;
            }
        }
        catch (e) {
            this._onError(e);
        }
    };
    return QueuedSourceBuffer;
}());
export default QueuedSourceBuffer;
