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

import { IVTTCueObject } from "../parse_cue_block";
import convertPayloadToHTML from "./convert_payload_to_html";
import { IStyleElements } from "./parse_style_block";

export interface IVTTHTMLCue {
  start : number;
  end: number;
  element : HTMLElement;
}

function getHTMLCueSettings(cueObject: IVTTCueObject) {
  const { settings } = cueObject;
  const settingsHTMLStyles: Partial<Record<string, string>> = {
    position: "absolute",
    bottom: "1%",
  };

  // Apply vertical settings
  switch (settings.vertical) {
    case "rl":
      settingsHTMLStyles["writing-mode"] = "vertical-rl";
      break;
    case "lr":
      settingsHTMLStyles["writing-mode"] = "vertical-lr";
      break;
    default:
      settingsHTMLStyles["writing-mode"] = "horizontal-tb";
      break;
  }

  // Apply line settings
  if (settings.line) {
    const pourcentage: undefined|number = (() => {
      const percentagePosition = /^(\d+(\.\d+)?)%(,([a-z]+))?/;
      const percentageMatches = settings.line.match(percentagePosition);
      if (percentageMatches) {
        return Number(percentageMatches[1]);
      } else {
        const linePosition = /^(-?\d+)(,([a-z]+))?/;
        const lineMatches = settings.line.match(linePosition);
        if (lineMatches) {
          return Number(lineMatches[1]) === 0 ? 0 : 100;
        }
      }
    })();

    if (pourcentage) {
      if (!settings.vertical) {
        if (pourcentage > 50) {
          settingsHTMLStyles.bottom = (100 - pourcentage) + "%";
        } else {
          settingsHTMLStyles.top = pourcentage + "%";
        }
      } else if (settings.vertical === "rl") {
        if (pourcentage > 50) {
          settingsHTMLStyles.left = (100 - pourcentage) + "%";
        } else {
          settingsHTMLStyles.right = pourcentage + "%";
        }
      } else if (settings.vertical === "lr") {
        if (pourcentage > 50) {
          settingsHTMLStyles.right = (100 - pourcentage) + "%";
        } else {
          settingsHTMLStyles.left = pourcentage + "%";
        }
      }
    }
  }

  // Apply position settings
  if (settings.position) {
    const percentagePosition = /^(\d+(\.\d+)?)%(,([a-z]+))?/;
    const positions = percentagePosition.exec(settings.position);
    if (positions) {
      const pourcentage = parseInt(positions[1], 10);
      if (!isNaN(pourcentage)) {
        if (!settings.vertical) {
          if (pourcentage > 50) {
            settingsHTMLStyles.right = (100 - pourcentage) + "%";
          } else {
            settingsHTMLStyles.left = pourcentage + "%";
          }
        } else if (settings.vertical === "rl") {
          if (pourcentage > 50) {
            settingsHTMLStyles.bottom = (100 - pourcentage) + "%";
          } else {
            settingsHTMLStyles.top = pourcentage + "%";
          }
        } else if (settings.vertical === "lr") {
          if (pourcentage > 50) {
            settingsHTMLStyles.top = (100 - pourcentage) + "%";
          } else {
            settingsHTMLStyles.bottom = pourcentage + "%";
          }
        }
      }
    }
  }

  // Apply size settings
  if (settings.size) {
    const percentageSize = /^(\d+(\.\d+)?)%(,([a-z]+))?/;
    const sizes = percentageSize.exec(settings.size);
    if (sizes) {
      const percentage = parseInt(sizes[1], 10);
      if (!isNaN(percentage)) {
        if (!settings.vertical) {
          settingsHTMLStyles.width = percentage + "%";
        } else {
          settingsHTMLStyles.height = percentage + "%";
        }
      }
    }
  }

  return settingsHTMLStyles;
}

/**
 * Parse cue block into an object with the following properties:
 *   - start {number}: start time at which the cue should be displayed
 *   - end {number}: end time at which the cue should be displayed
 *   - element {HTMLElement}: the cue text, translated into an HTMLElement
 *
 * Returns undefined if the cue block could not be parsed.
 * @param {Array.<string>} cueBlock
 * @param {Number} timeOffset
 * @param {Array.<Object>} classes
 * @returns {Object|undefined}
 */
export default function toHTML(
  cueObj : IVTTCueObject,
  styling : { classes : IStyleElements; global? : string }
) : IVTTHTMLCue {
  const { start, end, header, payload } = cueObj;

  const region = document.createElement("div");
  const regionAttr = document.createAttribute("style");
  regionAttr.value =
    "width:100%;" +
    "height:100%;" +
    "text-align: center;";
  region.setAttributeNode(regionAttr);

  // Get content, format and apply style.
  const pElement = document.createElement("div");
  const pAttr = document.createAttribute("style");

  const cueHTMLSettings = getHTMLCueSettings(cueObj);
  const pStyles = Object.entries(cueHTMLSettings).reduce((acc, [key, value]) => {
    const style = key + ":" + value + ";";
    return acc + style;
  }, "");
  pAttr.value = "display: inline-block;" + pStyles;
  pElement.setAttributeNode(pAttr);

  const spanElement = document.createElement("span");
  const attr = document.createAttribute("style");

  // set color and background-color default values, as indicated in:
  // https://www.w3.org/TR/webvtt1/#applying-css-properties
  attr.value =
    "background-color:rgba(0,0,0,0.8);" +
    "color:white;";
  spanElement.setAttributeNode(attr);

  const { global, classes } = styling;
  const localStyle = header ? classes[header] : undefined;
  const styles = [global, localStyle]
    .filter((s) => !!s)
    .join("");

  attr.value += styles;
  spanElement.setAttributeNode(attr);

  convertPayloadToHTML(payload.join("\n"), classes)
    .forEach(element => {
      spanElement.appendChild(element);
    });

  region.appendChild(pElement) ;
  pElement.appendChild(spanElement);

  return {
    start,
    end,
    element: region,
  };
}
