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
import log from "../../../log";
function getLength(buffer, offset) {
    for (var length_1 = 1; length_1 <= 8; length_1++) {
        if (buffer[offset] >= Math.pow(2, 8 - length_1)) {
            return length_1;
        }
    }
    return undefined;
}
export function getEBMLID(buffer, offset) {
    var length = getLength(buffer, offset);
    if (length == null) {
        log.warn("webm: unrepresentable length");
        return null;
    }
    if (offset + length > buffer.length) {
        log.warn("webm: impossible length");
        return null;
    }
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length: length, value: value };
}
export function getEBMLValue(buffer, offset) {
    var length = getLength(buffer, offset);
    if (length == null) {
        log.warn("webm: unrepresentable length");
        return null;
    }
    if (offset + length > buffer.length) {
        log.warn("webm: impossible length");
        return null;
    }
    var value = (buffer[offset] & (1 << (8 - length)) - 1) *
        Math.pow(2, (length - 1) * 8);
    for (var i = 1; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length: length, value: value };
}
/**
 * Convert a IEEE754 32 bits floating number as an Uint8Array into its
 * corresponding Number.
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @returns {number}
 */
export function get_IEEE754_32Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat32(offset);
}
/**
 * Convert a IEEE754 64 bits floating number as an Uint8Array into its
 * corresponding Number.
 * @param {Uint8Array} buffer
 * @param {number} offset
 * @returns {number}
 */
export function get_IEEE754_64Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat64(offset);
}
export function bytesToNumber(buffer, offset, length) {
    var value = 0;
    for (var i = 0; i < length; i++) {
        value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return value;
}
