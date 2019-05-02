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
import { Observable } from "rxjs";
import { ICustomSourceBuffer } from "./abstract_source_buffer";
import ICustomTimeRanges from "./time_ranges";
export declare type IBufferType = "audio" | "video" | "text" | "image";
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
export default class QueuedSourceBuffer<T> {
    /**
     * "Type" of the buffer.
     * @type {string}
     */
    readonly bufferType: IBufferType;
    /**
     * SourceBuffer implementation.
     * Type it as ICustomSourceBuffer to allow more permissive custom
     * implementations.
     * @private
     * @type {Object}
     */
    private readonly _buffer;
    /**
     * Binded reference to the _onUpdate private method.
     * Used for binding/removing an event listener.
     * @private
     * @type {Function}
     */
    private readonly __onUpdate;
    /**
     * Binded reference to the _onError private method.
     * Used for binding/removing an event listener.
     * @private
     * @type {Function}
     */
    private readonly __onError;
    /**
     * Binded reference to the _flush private method.
     * Used for binding/removing an event listener.
     * @private
     * @type {Function}
     */
    private readonly __flush;
    /**
     * Queue of awaited buffer actions.
     *
     * The last element in this array will be the first action to perform.
     * See IQSBQueueItems for more infos on those actions.
     * @private
     * @type {Array.<Object>}
     */
    private _queue;
    /**
     * Subject linked to the current buffer action.
     * @private
     * @type {Subject}
     */
    private _flushing;
    /**
     * Keep track of the latest init segment pushed in the current queue.
     * @private
     * @type {*}
     */
    private _lastInitSegment;
    /**
     * @constructor
     * @param {SourceBuffer} sourceBuffer
     */
    constructor(bufferType: IBufferType, sourceBuffer: ICustomSourceBuffer<T>);
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
    appendBuffer(initSegment: T | null, segment: T | null, timestampOffset?: number): Observable<void>;
    /**
     * Remove data from the attached SourceBuffer, in a FIFO queue.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Observable}
     */
    removeBuffer(start: number, end: number): Observable<void>;
    /**
     * Abort the linked SourceBuffer and dispose of the ressources used by this
     * QueuedSourceBuffer.
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     * @private
     */
    abort(): void;
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {TimeRanges}
     */
    getBuffered(): TimeRanges | ICustomTimeRanges;
    /**
     * Free up ressources used by this class.
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     */
    dispose(): void;
    /**
     * Callback used for the 'update' event, as a segment has been added/removed.
     *
     * Emit and complete the corresponding subject to inform the action caller
     * of completion.
     *
     * @private
     */
    private _onUpdate;
    /**
     * Callback used for the 'error' event from the SourceBuffer.
     *
     * Emit the error through the corresponding subject to inform the action
     * caller.
     *
     * @private
     * @param {Error} error
     */
    private _onError;
    /**
     * Queue a new action.
     * Begin flushing if no action were previously in the queue.
     * @private
     * @param {Object} action
     * @returns {Subject} - Can be used to follow the buffer action advancement.
     */
    private _addToQueue;
    /**
     * Perform next queued action if one and none are pending.
     * @private
     */
    private _flush;
}
