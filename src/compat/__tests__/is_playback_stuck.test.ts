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

describe("compat - isPlaybackStuck", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return false if not on Firefox", () => {
    jest.mock("../browser_detection", () => ({ isFirefox: false }));
    const isPlaybackStuck = require("../is_playback_stuck").default;

    expect(isPlaybackStuck(10, null, "hawai", false)).toEqual(false);
  });

  it("should return false if on Firefox but not stalled", () => {
    jest.mock("../browser_detection", () => ({ isFirefox: true }));
    const isPlaybackStuck = require("../is_playback_stuck").default;

    expect(isPlaybackStuck(10, null, "hawai", false)).toEqual(false);

  });

  it("should return false if on Firefox, stalled but state if not `timeupdate`", () => {
    jest.mock("../browser_detection", () => ({ isFirefox: true }));
    const isPlaybackStuck = require("../is_playback_stuck").default;

    expect(isPlaybackStuck(10, null, "hawai", true)).toEqual(false);
  });

  it("should return if no currentRange", () => {
    jest.mock("../browser_detection", () => ({ isFirefox: true }));
    const isPlaybackStuck = require("../is_playback_stuck").default;

    expect(isPlaybackStuck(10, null, "timeupdate", true)).toEqual(false);
  });

  it("should return false if current range end is too close from current time", () => {
    jest.mock("../browser_detection", () => ({ isFirefox: true }));
    const isPlaybackStuck = require("../is_playback_stuck").default;

    expect(isPlaybackStuck(10, { start: 0, end: 15 }, "timeupdate", true)).toEqual(false);
  });

  it("should return true if current range end is far from current time", () => {
    jest.mock("../browser_detection", () => ({ isFirefox: true }));
    const isPlaybackStuck = require("../is_playback_stuck").default;

    expect(isPlaybackStuck(10, { start: 0, end: 30 }, "timeupdate", true)).toEqual(true);
  });
});
