/**
 * Copyright 2017 CANAL+ Group
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
import { expect } from "chai";
import _fromBitrateCeil from "../fromBitrateCeil";
describe("ABR - fromBitrateCeil", function () {
    var fakeReps = [
        { bitrate: 100 },
        { bitrate: 1000 },
        { bitrate: 10000 },
        { bitrate: 100000 },
    ];
    describe("filterByBitrate", function () {
        it("should return the best representation when the bitrate given is Infinity", function () {
            expect(_fromBitrateCeil(fakeReps, Infinity))
                .to.equal(fakeReps[fakeReps.length - 1]);
        });
        /* tslint:disable max-line-length */
        it("should return the best representation when the bitrate given is superior to the maximum", function () {
            /* tslint:enable max-line-length */
            expect(_fromBitrateCeil(fakeReps, fakeReps[fakeReps.length - 1].bitrate + 1)).to.equal(fakeReps[fakeReps.length - 1]);
        });
        /* tslint:disable max-line-length */
        it("should return the best representation when the bitrate given is equal to the maximum", function () {
            /* tslint:enable max-line-length */
            expect(_fromBitrateCeil(fakeReps, fakeReps[fakeReps.length - 1].bitrate)).to.equal(fakeReps[fakeReps.length - 1]);
        });
        it("should undefined if the bitrate given is inferior to the minimum", function () {
            expect(_fromBitrateCeil(fakeReps, fakeReps[0].bitrate - 1))
                .to.equal(undefined);
        });
        it("should choose the closest lower representation for a given bitrate", function () {
            var bitrate = (fakeReps[2].bitrate - fakeReps[1].bitrate) / 2 +
                fakeReps[1].bitrate;
            expect(_fromBitrateCeil(fakeReps, bitrate))
                .to.equal(fakeReps[1]);
        });
    });
});
