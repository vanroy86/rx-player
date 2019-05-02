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
 * @returns {Promise}
 */
function isHDCPAPIAvailable() {
    return new Promise(function (resolve) {
        if (!("requestMediaKeySystemAccess" in navigator)) {
            throw new Error("API_AVAILABILITY: MediaCapabilitiesProber >>> API_CALL: " +
                "API not available");
        }
        resolve();
    }).then(function () {
        if (!("MediaKeys" in window)) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "MediaKeys API not available");
        }
        if (!("getStatusForPolicy" in window.MediaKeys)) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "getStatusForPolicy API not available");
        }
    });
}
/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeHDCPPolicy(config) {
    return isHDCPAPIAvailable().then(function () {
        if (config.hdcp) {
            var hdcp = "hdcp-" + config.hdcp;
            var object_1 = { minHdcpVersion: hdcp };
            var keySystem = "w3.org.clearkey";
            var drmConfig = {
                initDataTypes: ["cenc"],
                videoCapabilities: [],
                audioCapabilities: [],
                distinctiveIdentifier: "optional",
                persistentState: "optional",
                sessionTypes: ["temporary"],
            };
            return window.requestMediaKeySystemAccess(keySystem, drmConfig)
                .then(function (mediaKeys) {
                mediaKeys.getStatusForPolicy(object_1)
                    .then(function (result) {
                    if (result === "usable") {
                        return [2];
                    }
                    else {
                        return [0];
                    }
                });
            });
        }
        throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling getStatusForPolicy.");
    });
}
