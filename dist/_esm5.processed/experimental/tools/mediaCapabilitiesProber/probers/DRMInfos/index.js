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
import log from "../../log";
/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeDRMInfos(mediaConfig) {
    return new Promise(function (resolve) {
        if (!("requestMediaKeySystemAccess" in navigator)) {
            log.warn("API_AVAILABILITY: MediaCapabilitiesProber >>> API_CALL: " +
                "requestMediaKeySystemAccess not available");
            // In that case, the API lack means that no EME workflow may be started.
            // So, the DRM configuration is not supported.
            resolve([0]);
        }
        var keySystem = mediaConfig.keySystem;
        if (keySystem) {
            if (keySystem.type) {
                var type_1 = keySystem.type;
                var configuration_1 = keySystem.configuration || {};
                return navigator.requestMediaKeySystemAccess(type_1, [configuration_1])
                    .then(function (keySystemAccess) {
                    var keySystemConfiguration = keySystemAccess.getConfiguration();
                    var result = {
                        type: type_1,
                        configuration: configuration_1,
                        compatibleConfiguration: keySystemConfiguration,
                    };
                    resolve([2, result]);
                })
                    .catch(function () {
                    var result = {
                        type: type_1,
                        configuration: configuration_1,
                    };
                    resolve([0, result]);
                });
            }
        }
        throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
            "Not enough arguments for calling requestMediaKeySystemAccess.");
    });
}
