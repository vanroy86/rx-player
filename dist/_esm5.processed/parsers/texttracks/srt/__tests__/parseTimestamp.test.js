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
import { expect } from "chai";
import parseTimestamp from "../parseTimestamp";
var time1 = "00:00:31.080";
var time2 = "00:18:01";
var notTime1 = "1";
var notTime2 = "a";
var notTime3 = "00:31.080";
describe("parsers - srt - parseTimestamp", function () {
    it("should correctly parse textual time into seconds", function () {
        expect(parseTimestamp(time1)).to.eql(31.08);
        expect(parseTimestamp(time2)).to.eql(1081);
    });
    it("should return undefined for invalid textual time", function () {
        expect(parseTimestamp(notTime1)).to.eql(undefined);
        expect(parseTimestamp(notTime2)).to.eql(undefined);
        expect(parseTimestamp(notTime3)).to.eql(undefined);
    });
});
