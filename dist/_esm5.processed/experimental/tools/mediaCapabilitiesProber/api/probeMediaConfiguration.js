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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import getProbedConfiguration from "../capabilities";
import log from "../log";
import probers from "../probers";
/**
 * Probe media capabilities, evaluating capabilities with available browsers API.
 *
 * Probe every given features with configuration.
 * If the browser API is not available OR we can't call browser API with enough arguments,
 * do nothing but warn user (e.g. HDCP is not specified for calling "getStatusForPolicy"
 * API, "mediaCapabilites" API is not available.).
 *
 * if we call the browser API, we get from it a number which means:
 * - 0 : Probably
 * - 1 : Maybe
 * - 2 : Not Supported
 *
 * From all API results, we return worst of states (e.g. if one API returns
 * "Not Supported" among "Probably" statuses, return "Not Supported").
 *
 * If no API was called or some capabilites could not be probed and status is "Probably",
 * return "Maybe".
 * @param {Object} config
 * @param {Array.<Object>} browserAPIs
 * @returns {Promise}
 */
function probeMediaConfiguration(config, browserAPIS) {
    return __awaiter(this, void 0, void 0, function () {
        var globalStatusNumber, resultsFromAPIS, promises, _loop_1, _i, browserAPIS_1, browserAPI, probedCapabilities, areUnprobedCapabilities;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    globalStatusNumber = Infinity;
                    resultsFromAPIS = [];
                    promises = [];
                    _loop_1 = function (browserAPI) {
                        var probeWithBrowser = probers[browserAPI][0];
                        var wantedLogLevel = probers[browserAPI][1];
                        if (probeWithBrowser) {
                            promises.push(probeWithBrowser(config).then(function (_a) {
                                var statusNumber = _a[0], result = _a[1];
                                resultsFromAPIS.push({ APIName: browserAPI, result: result });
                                globalStatusNumber = Math.min(globalStatusNumber, statusNumber);
                            }).catch(function (err) {
                                switch (wantedLogLevel) {
                                    case "warn":
                                        log.warn(err);
                                        break;
                                    case "debug":
                                        log.debug(err);
                                        break;
                                    case "info":
                                        log.info(err);
                                        break;
                                    case "error":
                                        log.error(err);
                                        break;
                                    default:
                                        log.debug(err);
                                        break;
                                }
                            }));
                        }
                    };
                    for (_i = 0, browserAPIS_1 = browserAPIS; _i < browserAPIS_1.length; _i++) {
                        browserAPI = browserAPIS_1[_i];
                        _loop_1(browserAPI);
                    }
                    return [4 /*yield*/, Promise.all(promises)];
                case 1:
                    _a.sent();
                    probedCapabilities = getProbedConfiguration(config, resultsFromAPIS.map(function (a) { return a.APIName; }));
                    areUnprobedCapabilities = JSON.stringify(probedCapabilities).length !== JSON.stringify(config).length;
                    globalStatusNumber =
                        Math.min((areUnprobedCapabilities ? 1 : Infinity), globalStatusNumber);
                    if (areUnprobedCapabilities) {
                        log.warn("MediaCapabilitiesProber >>> PROBER: Some capabilities could not " +
                            "be probed, due to the incompatibility of browser APIs, or the lack of arguments " +
                            "to call them. (See DEBUG logs for details)");
                    }
                    log.info("MediaCapabilitiesProber >>> PROBER: Probed capabilities: ", probedCapabilities);
                    return [2 /*return*/, { globalStatusNumber: globalStatusNumber, resultsFromAPIS: resultsFromAPIS }];
            }
        });
    });
}
export default probeMediaConfiguration;
