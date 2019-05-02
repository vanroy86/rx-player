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
export interface IScheme {
    schemeIdUri?: string;
    value?: string;
}
export interface IAccessibility {
    schemeIdUri?: string;
    value?: string | number;
}
/**
 * Parse MPD string attributes.
 * @param {string} str
 * @returns {string} - the same string
 */
declare function parseString(str: string): string;
/**
 * Parse MPD boolean attributes.
 * @param {string} str
 * @returns {Boolean}
 */
declare function parseBoolean(str: string): boolean;
/**
 * Parse some MPD attributes.
 * @param {string} str
 * @returns {Boolean|Number}
 */
declare function parseIntOrBoolean(str: string): boolean | number;
/**
 * Parse MPD date attributes.
 * @param {string} str
 * @returns {Date}
 */
declare function parseDateTime(str: string): number;
/**
 * Parse MPD ISO8601 duration attributes into seconds.
 * @param {string} date
 * @returns {Number}
 */
declare function parseDuration(date: string): number;
/**
 * Parse MPD ratio attributes.
 * @param {string} str
 * @returns {string}
 */
declare function parseRatio(str: string): string;
/**
 * Parse MPD byterange attributes into arrays of two elements: the start and
 * the end.
 * @param {string} str
 * @returns {Array.<Number>}
 */
declare function parseByteRange(str: string): [number, number] | null;
/**
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
declare function isVisuallyImpaired(accessibility: IScheme): boolean;
/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
declare function isHardOfHearing(accessibility: IAccessibility): boolean;
/**
 * @param {Element} root
 * @returns {Object}
 */
declare function parseScheme(root: Element): IScheme;
/**
 * @param {string} representationURL
 * @param {string|undefined} media
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
declare function createIndexURL(representationURL: string, media?: string, id?: string, bitrate?: number): string;
/**
 * Replace "tokens" written in a given path (e.g. $RepresentationID$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
declare function replaceRepresentationDASHTokens(path: string, id?: string, bitrate?: number): string;
/**
 * Replace "tokens" written in a given path (e.g. $Time$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {number} time
 * @param {number} number
 * @returns {string}
 *
 * @throws Error - Throws if we do not have enough data to construct the URL
 */
declare function replaceSegmentDASHTokens(path: string, time?: number, number?: number): string;
export { createIndexURL, replaceSegmentDASHTokens, replaceRepresentationDASHTokens, isHardOfHearing, isVisuallyImpaired, parseBoolean, parseByteRange, parseDateTime, parseDuration, parseIntOrBoolean, parseRatio, parseScheme, parseString, };
