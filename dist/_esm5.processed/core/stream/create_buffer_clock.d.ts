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
import Manifest from "../../manifest";
import { IPeriodBufferManagerClockTick } from "../buffer";
import { IStreamClockTick } from "./types";
/**
 * Create clock Observable for the Buffer.
 * @param {Object} manifest
 * @param {Observable} streamClock$
 * @param {Observable} initialSeek$
 * @param {Number} startTime
 * @returns {Observable}
 */
export default function createBufferClock(manifest: Manifest, streamClock$: Observable<IStreamClockTick>, initialSeek$: Observable<void>, speed$: Observable<number>, startTime: number): Observable<IPeriodBufferManagerClockTick>;
