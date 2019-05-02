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
import { findEndOfCueBlock, getFirstLineAfterHeader, isStartOfCueBlock, isStartOfNoteBlock, isStartOfRegionBlock, isStartOfStyleBlock, } from "../utils";
var webvtt1 = [
    "WEBVTT",
    "",
    "STYLE",
    "::cue {",
    "  background-image: linear-gradient(to bottom, dimgray, lightgray);",
    "  color: papayawhip;",
    "}",
    "/* Style blocks cannot use blank lines nor \"dash dash greater than\" */",
    "",
    "NOTE comment blocks can be used between style blocks.",
    "",
    "STYLE",
    "::cue(b) {",
    "  color: peachpuff;",
    "}",
    "",
    "00:00:00.000 --> 00:00:10.000",
    "- Hello <b>world</b>.",
    "",
    "NOTE style blocks cannot appear after the first cue.",
    "",
    "00:05:00.000 --> 00:06:10.000",
    "Rendez-vous on Champs-Elysees",
    "",
];
var webvtt2 = [
    "00:00:00.000 --> 00:00:10.000",
    "Toussaint Louverture",
    "",
    "",
    "00:02:00.000 --> 00:02:10.000",
    "Liberte",
    "Egalite",
    "",
    "00:07:00.000 --> 00:07:10.000",
    "Fraternite",
];
var webvtt3 = [
    "WEBVTT",
    "",
    "NOTE",
    "00:17:31.080 --> 00:17:32.200",
    "Je suis le petit chevalier",
    "Avec le ciel dessus mes yeux",
    "Je ne peux pas me effroyer",
    "",
    "",
    "00:17:55.520 --> 00:17:57.640",
    "Je suis le petit chevalier",
    "",
    "00:18:01.520 --> 00:18:09.640",
    "",
    "Avec la terre dessous mes pieds",
    "",
    "112",
    "00:18:31.080 --> 00:18:32.200",
    "NOTE",
    "TOTO",
    "",
    "113",
    "00:18:51.080 --> 00:18:52.200",
    "J'irai te visiter",
    "J'irai te visiter",
    "",
];
var webvtt4 = [
    "WEBVTT",
    "",
    "STYLE",
    "00:17:31.080 --> 00:17:32.200",
    "Ce que j'ai fais, ce soir la",
    "Ce qu'elle a dit, ce soir la",
    "",
    "",
    "",
    "Realisant mon espoir",
    "",
    "",
    "",
    "Je me lance, vers la gloire, OK",
];
var webvtt5 = [
    "WEBVTT",
    " Some Header",
    "BLALABAL",
    "",
    "",
    "",
    "REGION",
    "00:17:31.080 --> 00:17:32.200",
    "Je n'ai plus peur de perdre mon temps",
    "",
    "00:18:51.080 --> 00:18:52.200",
    "Je n'ai plus peur de perdre mes dents",
];
var webvtt6 = [
    "",
    "112",
    "00:17:31.080 --> 00:17:32.200",
    "J'ai tres tres peur ca c'est certain",
    "",
    "NOTE",
    "",
    "J'ai tres tres peur mais beaucoup moins",
    "",
    "",
];
describe("parsers - webvtt - utils", function () {
    describe("getFirstLineAfterHeader", function () {
        it("should give the second line after the WEBVTT one if no header", function () {
            expect(getFirstLineAfterHeader(webvtt1)).to.equal(2);
            expect(getFirstLineAfterHeader(webvtt2)).to.equal(3);
            expect(getFirstLineAfterHeader(webvtt3)).to.equal(2);
            expect(getFirstLineAfterHeader(webvtt4)).to.equal(2);
            expect(getFirstLineAfterHeader(webvtt5)).to.equal(4);
        });
        it("should give the line after the line break after the header if one", function () {
            expect(getFirstLineAfterHeader(webvtt5)).to.equal(4);
        });
        it("should give the second line if there is an empty line on top", function () {
            expect(getFirstLineAfterHeader(webvtt6)).to.equal(1);
        });
        it("should return 0 if there is no content", function () {
            var webvttFile = [];
            expect(getFirstLineAfterHeader(webvttFile)).to.equal(0);
        });
    });
    describe("isStartOfCueBlock", function () {
        it("should return false if called on a note block", function () {
            expect(isStartOfCueBlock(webvtt1, 9)).to.equal(false);
            expect(isStartOfCueBlock(webvtt1, 19)).to.equal(false);
            expect(isStartOfCueBlock(webvtt1, 19)).to.equal(false);
            expect(isStartOfCueBlock(webvtt6, 5)).to.equal(false);
        });
        it("should return false if called on a region block", function () {
            expect(isStartOfCueBlock(["REGION SOMETHING", ""], 0)).to.equal(false);
            expect(isStartOfCueBlock(["REGION SOMETHING", "a"], 0)).to.equal(false);
            expect(isStartOfCueBlock(["REGION", "SOMETHING"], 0)).to.equal(false);
        });
        it("should return false if called on a style block", function () {
            expect(isStartOfCueBlock(webvtt1, 2)).to.equal(false);
            expect(isStartOfCueBlock(webvtt1, 11)).to.equal(false);
        });
        it("should return false if called on an empty line", function () {
            expect(isStartOfCueBlock(webvtt1, 15)).to.equal(false);
            expect(isStartOfCueBlock(webvtt1, 20)).to.equal(false);
            expect(isStartOfCueBlock(webvtt2, 3)).to.equal(false);
        });
        it("should return true if the line has timings in it", function () {
            expect(isStartOfCueBlock(webvtt1, 16)).to.equal(true);
            expect(isStartOfCueBlock(webvtt3, 3)).to.equal(true);
            expect(isStartOfCueBlock(webvtt3, 12)).to.equal(true);
            expect(isStartOfCueBlock(webvtt6, 2)).to.equal(true);
        });
        it("should return true for cue identifier followed by timings", function () {
            expect(isStartOfCueBlock(webvtt3, 2)).to.equal(true);
            expect(isStartOfCueBlock(webvtt3, 16)).to.equal(true);
            expect(isStartOfCueBlock(webvtt3, 21)).to.equal(true);
            expect(isStartOfCueBlock(webvtt4, 2)).to.equal(true);
            expect(isStartOfCueBlock(webvtt5, 6)).to.equal(true);
        });
    });
    describe("isStartOfNoteBlock", function () {
        it("should return true if called on a `NOTE` line followed by timings", function () {
            expect(isStartOfNoteBlock(webvtt2, 2)).to.equal(false);
        });
        it("should return true if called on a `NOTE` line not followed by timings", function () {
            expect(isStartOfNoteBlock(webvtt6, 5)).to.equal(true);
            expect(isStartOfNoteBlock(webvtt3, 18)).to.equal(true); // This is actually bad
        });
        it("should return true if called on line containing `NOTE` and spaces", function () {
            expect(isStartOfNoteBlock(["NOTE    "], 0)).to.equal(true);
            expect(isStartOfNoteBlock(["", "NOTE ", "TOTO"], 1)).to.equal(true);
        });
        /* tslint:disable max-line-length */
        it("should return true if called on line containing `NOTE` and spaces and text", function () {
            /* tslint:enable max-line-length */
            expect(isStartOfNoteBlock(webvtt1, 9)).to.equal(true);
            expect(isStartOfNoteBlock(webvtt1, 19)).to.equal(true);
        });
        /* tslint:disable max-line-length */
        it("should return false if called on a line containing `NOTE` and text attached", function () {
            /* tslint:enable max-line-length */
            expect(isStartOfNoteBlock(["NOTEdsj f"], 0)).to.equal(false);
            expect(isStartOfNoteBlock(["aaa", "NOTEoej ewj ", "aaa"], 1)).to.equal(false);
        });
        it("should return false if called on a region block", function () {
            expect(isStartOfNoteBlock(["REGION SOMETHING"], 0)).to.equal(false);
        });
        it("should return false if called on a style block", function () {
            expect(isStartOfNoteBlock(["STYLE SOMETHING"], 0)).to.equal(false);
            expect(isStartOfCueBlock(webvtt1, 2)).to.equal(false);
            expect(isStartOfCueBlock(webvtt1, 11)).to.equal(false);
        });
        it("should return false if called on an empty line", function () {
            expect(isStartOfNoteBlock(["", "NOTE"], 0)).to.equal(false);
            expect(isStartOfCueBlock(webvtt1, 18)).to.equal(false);
            expect(isStartOfCueBlock(webvtt3, 1)).to.equal(false);
        });
    });
    describe("isStartOfRegionBlock", function () {
        it("should return true if called on a `REGION` line", function () {
            expect(isStartOfRegionBlock(["REGION"], 0)).to.equal(true);
        });
        it("should return true if called on line containing `REGION` and spaces", function () {
            expect(isStartOfRegionBlock(["REGION "], 0)).to.equal(true);
            expect(isStartOfRegionBlock(["REGION  "], 0)).to.equal(true);
            expect(isStartOfRegionBlock(["REGION         "], 0)).to.equal(true);
        });
        /* tslint:disable max-line-length */
        it("should return true if called on line containing `REGION` and spaces and text", function () {
            /* tslint:enable max-line-length */
            expect(isStartOfRegionBlock(["REGION dsj f"], 0)).to.equal(true);
            expect(isStartOfRegionBlock(["REGION   oej ewj "], 0)).to.equal(true);
            expect(isStartOfRegionBlock(["REGION         eowj pogj qpeoj"], 0)).to.equal(true);
        });
        /* tslint:disable max-line-length */
        it("should return false if called on a line containing `REGION` and text attached", function () {
            /* tslint:enable max-line-length */
            expect(isStartOfRegionBlock(["REGIONdsj f"], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["REGIONoej ewj "], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["REGIONeowj pogj qpeoj"], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["REGIONREGION"], 0)).to.equal(false);
        });
        it("should return false if called on a note block", function () {
            expect(isStartOfRegionBlock(["NOTE SOMETHING"], 0)).to.equal(false);
        });
        it("should return false if called on a style block", function () {
            expect(isStartOfRegionBlock(["STYLE SOMETHING"], 0)).to.equal(false);
        });
        it("should return false if called on an empty line", function () {
            expect(isStartOfRegionBlock([""], 0)).to.equal(false);
        });
        it("should return false for any other cases", function () {
            expect(isStartOfRegionBlock(["1"], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["ababa abs"], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["a"], 0)).to.equal(false);
            expect(isStartOfRegionBlock([" "], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["NOTESOMETHING"], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["REGIONSOMETHING"], 0)).to.equal(false);
            expect(isStartOfRegionBlock(["STYLESOMETHING"], 0)).to.equal(false);
        });
    });
    describe("isStartOfStyleBlock", function () {
        it("should return true if called on a `STYLE` line", function () {
            expect(isStartOfStyleBlock(["STYLE"], 0)).to.equal(true);
        });
        it("should return true if called on line containing `STYLE` and spaces", function () {
            expect(isStartOfStyleBlock(["STYLE "], 0)).to.equal(true);
            expect(isStartOfStyleBlock(["STYLE  "], 0)).to.equal(true);
            expect(isStartOfStyleBlock(["STYLE         "], 0)).to.equal(true);
        });
        /* tslint:disable max-line-length */
        it("should return true if called on line containing `STYLE` and spaces and text", function () {
            /* tslint:enable max-line-length */
            expect(isStartOfStyleBlock(["STYLE dsj f"], 0)).to.equal(true);
            expect(isStartOfStyleBlock(["STYLE   oej ewj "], 0)).to.equal(true);
            expect(isStartOfStyleBlock(["STYLE         eowj pogj qpeoj"], 0)).to.equal(true);
        });
        /* tslint:disable max-line-length */
        it("should return false if called on a line containing `STYLE` and text attached", function () {
            /* tslint:enable max-line-length */
            expect(isStartOfStyleBlock(["STYLEdsj f"], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["STYLEoej ewj "], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["STYLEeowj pogj qpeoj"], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["STYLESTYLE"], 0)).to.equal(false);
        });
        it("should return false if called on a note block", function () {
            expect(isStartOfStyleBlock(["NOTE SOMETHING"], 0)).to.equal(false);
        });
        it("should return false if called on a region block", function () {
            expect(isStartOfStyleBlock(["REGION SOMETHING"], 0)).to.equal(false);
        });
        it("should return false if called on an empty line", function () {
            expect(isStartOfStyleBlock([""], 0)).to.equal(false);
        });
        it("should return false for any other cases", function () {
            expect(isStartOfStyleBlock(["1"], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["ababa abs"], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["a"], 0)).to.equal(false);
            expect(isStartOfStyleBlock([" "], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["NOTESOMETHING"], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["REGIONSOMETHING"], 0)).to.equal(false);
            expect(isStartOfStyleBlock(["STYLESOMETHING"], 0)).to.equal(false);
        });
    });
    describe("findEndOfCueBlock", function () {
        it("should return an index immediately after the end of a cue block", function () {
            expect(findEndOfCueBlock(webvtt1, 16)).to.equal(18);
            expect(findEndOfCueBlock(webvtt1, 17)).to.equal(18);
            expect(findEndOfCueBlock(webvtt1, 21)).to.equal(23);
            expect(findEndOfCueBlock(webvtt1, 22)).to.equal(23);
            expect(findEndOfCueBlock(webvtt2, 0)).to.equal(2);
            expect(findEndOfCueBlock(webvtt2, 1)).to.equal(2);
            expect(findEndOfCueBlock(webvtt2, 4)).to.equal(7);
            expect(findEndOfCueBlock(webvtt2, 5)).to.equal(7);
            expect(findEndOfCueBlock(webvtt2, 6)).to.equal(7);
            expect(findEndOfCueBlock(webvtt2, 8)).to.equal(10);
            expect(findEndOfCueBlock(webvtt2, 9)).to.equal(10);
            expect(findEndOfCueBlock(webvtt3, 2)).to.equal(7);
            expect(findEndOfCueBlock(webvtt3, 3)).to.equal(7);
            expect(findEndOfCueBlock(webvtt3, 4)).to.equal(7);
            expect(findEndOfCueBlock(webvtt3, 5)).to.equal(7);
            expect(findEndOfCueBlock(webvtt3, 6)).to.equal(7);
            expect(findEndOfCueBlock(webvtt3, 9)).to.equal(11);
            expect(findEndOfCueBlock(webvtt3, 10)).to.equal(11);
            expect(findEndOfCueBlock(webvtt3, 12)).to.equal(13);
            expect(findEndOfCueBlock(webvtt3, 16)).to.equal(20);
            expect(findEndOfCueBlock(webvtt3, 17)).to.equal(20);
            expect(findEndOfCueBlock(webvtt3, 18)).to.equal(20);
            expect(findEndOfCueBlock(webvtt3, 19)).to.equal(20);
            expect(findEndOfCueBlock(webvtt3, 21)).to.equal(25);
            expect(findEndOfCueBlock(webvtt3, 22)).to.equal(25);
            expect(findEndOfCueBlock(webvtt3, 23)).to.equal(25);
            expect(findEndOfCueBlock(webvtt3, 24)).to.equal(25);
            expect(findEndOfCueBlock(webvtt4, 2)).to.equal(6);
            expect(findEndOfCueBlock(webvtt4, 3)).to.equal(6);
            expect(findEndOfCueBlock(webvtt4, 4)).to.equal(6);
            expect(findEndOfCueBlock(webvtt4, 5)).to.equal(6);
            expect(findEndOfCueBlock(webvtt5, 6)).to.equal(9);
            expect(findEndOfCueBlock(webvtt5, 7)).to.equal(9);
            expect(findEndOfCueBlock(webvtt5, 8)).to.equal(9);
            expect(findEndOfCueBlock(webvtt5, 10)).to.equal(12);
            expect(findEndOfCueBlock(webvtt5, 11)).to.equal(12);
            expect(findEndOfCueBlock(webvtt6, 1)).to.equal(4);
            expect(findEndOfCueBlock(webvtt6, 2)).to.equal(4);
            expect(findEndOfCueBlock(webvtt6, 3)).to.equal(4);
        });
    });
});
