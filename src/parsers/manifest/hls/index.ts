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
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import parseEXTXMediaLine, {
  IXMedia,
} from "./parseEXTXMediaLine";

enum M3U8LineType {
  Comment,
  Tag,
  URI,
  Nothing,
}

function getType(line : string) : M3U8LineType {
  if (line.trim().length === 0) {
    return M3U8LineType.Nothing;
  }
  if (line.startsWith("#")) {
    return line.substr(1, 3) === "EXT" ?
      M3U8LineType.Tag : M3U8LineType.Comment;
  }
  return M3U8LineType.URI;
}

export default function parseM3U8(
  playlist : string
) : any {
  const newLineChar = /\r\n|\n|\r/g;
  const linified = playlist.split(newLineChar);
  if (!linified.length) {
    throw new Error("Invalid playlist.");
  }

  for (let i = 0; i < linified.length; i++) {
    const line = linified[i];
    const lineType = getType(line);

    const xMedias : IXMedia[] = [];
    if (lineType === M3U8LineType.Tag) {
      if (line.startsWith("#EXT-X-MEDIA")) {
        const parsed = parseEXTXMediaLine(line);
        if (parsed != null) {
          xMedias.push(parsed);
        }
      }
    }
  }

  return;
}
