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

import objectAssign from "object-assign";
import {
  combineLatest as observableCombineLatest,
  Observable,
  of as observableOf,
} from "rxjs";
import { map } from "rxjs/operators";
import { IABRFilters } from "./representation_estimator";

/**
 * Create Observable that merge several throttling Observables into one.
 * @param {Observable} limitWidth$ - Emit the width at which the chosen
 * Representation should be limited.
 * @param {Observable} throttleBitrate$ - Emit the maximum bitrate authorized.
 * @param {Observable} throttle$ - Also emit the maximum bitrate authorized.
 * Here for legacy reasons.
 * @returns {Observable}
 */
export default function createFilters(
  limitWidth$? : Observable<number>,
  throttleBitrate$? : Observable<number>,
  throttle$? : Observable<number>
) : Observable<IABRFilters> {
  const deviceEventsArray : Array<Observable<IABRFilters>> = [];

  if (limitWidth$) {
    deviceEventsArray.push(limitWidth$.pipe(map(width => ({ width }))));
  }
  if (throttle$) {
    deviceEventsArray.push(throttle$.pipe(map(bitrate => ({ bitrate }))));
  }
  if (throttleBitrate$) {
    deviceEventsArray.push(throttleBitrate$.pipe(map(bitrate => ({ bitrate }))));
  }

  // Emit restrictions on the pools of available representations to choose
  // from.
  return deviceEventsArray.length ?
    observableCombineLatest(deviceEventsArray)
      .pipe(map((args : IABRFilters[]) => objectAssign({}, ...args))) :
    observableOf({});
}
