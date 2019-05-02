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
import { filter, map, mergeMap, share, tap, } from "rxjs/operators";
import Manifest from "../../../manifest";
import createLoader from "../create_loader";
import createParser from "../create_parser";
/**
 * Create function allowing to easily fetch and parse the manifest from its URL.
 *
 * @example
 * ```js
 * const manifestPipeline = createManifestPipeline(transport, options, warning$);
 * manifestPipeline(manifestURL)
 *  .subscribe(manifest => console.log("Manifest:", manifest));
 * ```
 *
 * @param {Object} transport
 * @param {Subject} warning$
 * @param {Array.<Object>|undefined} supplementaryTextTracks
 * @param {Array.<Object>|undefined} supplementaryImageTrack
 * @returns {Function}
 */
export default function createManifestPipeline(transport, pipelineOptions, warning$) {
    var loader = createLoader(transport.pipelines.manifest, pipelineOptions);
    var parser = createParser(transport.pipelines.manifest);
    /**
     * Fetch and parse the manifest corresponding to the URL given.
     * @param {string} url - URL of the manifest
     * @returns {Observable}
     */
    return function fetchManifest(url) {
        return loader({ url: url }).pipe(tap(function (arg) {
            if (arg.type === "error") {
                warning$.next(arg.value);
            }
        }), filter(function (arg) {
            return arg.type === "response";
        }), mergeMap(function (_a) {
            var value = _a.value;
            return parser({ response: value, url: url });
        }), map(function (_a) {
            var manifest = _a.manifest;
            return new Manifest(manifest, warning$, transport.options);
        }), share());
    };
}
