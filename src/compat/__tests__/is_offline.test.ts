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

describe("Compat - isOffline", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return true if navigator.onLine is `false`", () => {
    const spy = jest.spyOn(navigator, "onLine", "get").mockImplementation(() => false);
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(true);
    expect(spy).toHaveBeenCalled();
  });

  it("should return false if navigator.onLine is `true`", () => {
    const spy = jest.spyOn(navigator, "onLine", "get").mockImplementation(() => true);
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(false);
    expect(spy).toHaveBeenCalled();
  });

  it("should return false if navigator.onLine is `undefined`", () => {
    const spy = jest.spyOn(navigator, "onLine", "get")
      .mockImplementation(() => undefined);
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(false);
    expect(spy).toHaveBeenCalled();
  });

  it("should return false if navigator.onLine is `null`", () => {
    const spy = jest.spyOn(navigator, "onLine", "get").mockImplementation(() => null);
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(false);
    expect(spy).toHaveBeenCalled();
  });
});
