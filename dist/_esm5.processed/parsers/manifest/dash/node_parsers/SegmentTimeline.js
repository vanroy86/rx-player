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
import log from "../../../../log";
import parseS from "./S";
function fromParsedSToTimelineElement(parsedS, previousS, nextS) {
    var start = parsedS.start;
    var duration = parsedS.duration;
    var repeatCount = parsedS.repeatCount;
    if (start == null && previousS && previousS.duration != null) {
        start = previousS.start + (previousS.duration * (previousS.repeatCount + 1));
    }
    if ((duration == null || isNaN(duration)) &&
        nextS && nextS.start != null && !isNaN(nextS.start) &&
        start != null && !isNaN(start)) {
        duration = nextS.start - start;
    }
    if ((start != null && !isNaN(start)) &&
        (duration != null && !isNaN(duration)) &&
        (repeatCount == null || !isNaN(repeatCount))) {
        return {
            start: start,
            duration: duration,
            repeatCount: repeatCount || 0,
        };
    }
    log.warn("DASH: A \"S\" Element could not have been parsed.");
    return null;
}
/**
 * @param {Element} root
 * @returns {Array.<Object>}
 */
export default function parseSegmentTimeline(root) {
    var timeline = [];
    var parsedS = [];
    var timelineChildren = root.childNodes;
    for (var i = 0; i < timelineChildren.length; i++) {
        if (timelineChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentElement = timelineChildren[i];
            if (currentElement.nodeName === "S") {
                var s = parseS(currentElement);
                if (s) {
                    parsedS.push(s);
                }
            }
        }
    }
    for (var i = 0; i < parsedS.length; i++) {
        var s = parsedS[i];
        var timelineElement = fromParsedSToTimelineElement(s, timeline[timeline.length - 1] || null, parsedS[i + 1] || null);
        if (timelineElement) {
            timeline.push(timelineElement);
        }
    }
    return timeline;
}
