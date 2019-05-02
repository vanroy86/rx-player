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
/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
import { Observable } from "rxjs";
import { IKeySystemOption } from "../eme/types";
import { IInitialTimeOptions } from "./get_initial_time";
import { ISpeedChangedEvent, IStalledEvent, IStreamClockTick, IStreamLoadedEvent, IStreamWarningEvent } from "./types";
export interface IDirectFileStreamOptions {
    autoPlay: boolean;
    clock$: Observable<IStreamClockTick>;
    keySystems: IKeySystemOption[];
    mediaElement: HTMLMediaElement;
    speed$: Observable<number>;
    startAt?: IInitialTimeOptions;
    url: string;
}
export declare type IDirectfileEvent = ISpeedChangedEvent | IStalledEvent | IStreamLoadedEvent | IStreamWarningEvent;
/**
 * Launch a Stream in "Directfile mode".
 * @param {Object} directfileOptions
 * @returns {Observable}
 */
export default function StreamDirectFile({ autoPlay, clock$, keySystems, mediaElement, speed$, startAt, url, }: IDirectFileStreamOptions): Observable<IDirectfileEvent>;
