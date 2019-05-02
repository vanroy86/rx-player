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
import { ICustomError } from "../../errors";
import Manifest, { Period } from "../../manifest";
import ABRManager from "../abr";
import { IRepresentationChangeEvent } from "../buffer/types";
import { IBufferType } from "../source_buffers";
import { IStallingItem } from "./stalling_manager";
import { IManifestReadyEvent, IManifestUpdateEvent, IReloadingStreamEvent, ISpeedChangedEvent, IStalledEvent, IStreamLoadedEvent, IStreamWarningEvent } from "./types";
/**
 * Construct a "loaded" event.
 * @returns {Object}
 */
declare function loaded(): IStreamLoadedEvent;
/**
 * Construct a "stalled" event.
 * @param {Object|null} stalling
 * @returns {Object}
 */
declare function stalled(stalling: IStallingItem | null): IStalledEvent;
/**
 * Construct a "manifestReady" event.
 * @param {Object} abrManager
 * @param {Object} manifest
 * @returns {Object}
 */
declare function manifestReady(abrManager: ABRManager, manifest: Manifest): IManifestReadyEvent;
/**
 * Construct a "manifestUpdate" event.
 * @param {Object} manifest
 * @returns {Object}
 */
declare function manifestUpdate(manifest: Manifest): IManifestUpdateEvent;
/**
 * Construct a "speedChanged" event.
 * @param {Number} speed
 * @returns {Object}
 */
declare function speedChanged(speed: number): ISpeedChangedEvent;
/**
 * Construct a "representationChange" event.
 * @param {string} type
 * @param {Object} period
 * @returns {Object}
 */
declare function nullRepresentation(type: IBufferType, period: Period): IRepresentationChangeEvent;
/**
 * Construct a "warning" event.
 * @param {Error} value
 * @returns {Object}
 */
declare function warning(value: Error | ICustomError): IStreamWarningEvent;
declare function reloadingStream(): IReloadingStreamEvent;
declare const STREAM_EVENTS: {
    loaded: typeof loaded;
    manifestReady: typeof manifestReady;
    manifestUpdate: typeof manifestUpdate;
    nullRepresentation: typeof nullRepresentation;
    reloadingStream: typeof reloadingStream;
    speedChanged: typeof speedChanged;
    stalled: typeof stalled;
    warning: typeof warning;
};
export default STREAM_EVENTS;
