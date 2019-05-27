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
import IRepresentationIndex from "./representation_index";
interface IContentProtection {
    keyId?: string;
    systemId?: string;
}
export interface IRepresentationArguments {
    bitrate: number;
    id: string;
    index: IRepresentationIndex;
    codecs?: string;
    contentProtections?: IContentProtection[];
    frameRate?: string;
    height?: number;
    mimeType?: string;
    width?: number;
}
/**
 * Normalized Representation structure.
 * @class Representation
 */
declare class Representation {
    readonly id: string | number;
    index: IRepresentationIndex;
    bitrate: number;
    frameRate?: string;
    codec?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    contentProtections?: IContentProtection[];
    /**
     * @param {Object} args
     */
    constructor(args: IRepresentationArguments);
    /**
     * Returns "mime-type string" which includes both the mime-type and the codec,
     * which is often needed when interacting with the browser's APIs.
     * @returns {string}
     */
    getMimeTypeString(): string;
}
export default Representation;
