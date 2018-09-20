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

export interface IXMedia {
  mediaType : "audio"|"text"|"video"|"closed-caption";
  groupId : string;
  name : string;
  isDefaultMedia : boolean;
  isAutoSelectMedia : boolean;
  isForcedMedia : boolean;

  uri? : string;
  language? : string;
  assocLanguage? : string;
  isTranscribingSpokenDialog? : boolean;
  isDescribingMusicAndSound? : boolean;
  isEasyToRead? : boolean;
  isAudioDescription? : boolean;
  channels? : string;
  inStreamId? : string;
}

export default function parseEXTXMediaLine(line : string) : IXMedia|null {
  let mediaType : "audio"|"text"|"video"|"closed-caption"|undefined;
  let groupId : string|undefined;
  let uri : string|undefined;
  let language : string|undefined;
  let assocLanguage : string|undefined;
  let name : string|undefined;
  let inStreamId : string|undefined;
  let isDefaultMedia : boolean|undefined;
  let isAutoSelectMedia : boolean|undefined;
  let isForcedMedia : boolean|undefined;
  let isTranscribingSpokenDialog : boolean|undefined;
  let isDescribingMusicAndSound : boolean|undefined;
  let isEasyToRead : boolean|undefined;
  let isAudioDescription : boolean|undefined;
  let channels : string|undefined;

  const keyValues : string[] = line.substr(12).split(",");
  const attributes = keyValues.map((keyValue) => {
    const index = keyValue.indexOf("=");
    if (index < 1) {
      return null;
    }
    return {
      key: keyValue.substr(0, index),
      value: keyValue.substr(index),
    };
  }).filter((keyValue) : keyValue is { key : string; value : string } => !!keyValue);

  for (let i = 0; i < attributes.length; i++) {
    const { key, value } = attributes[i];

    switch (key) {

      case "TYPE":
        const toLower = value.toLowerCase();
        switch (toLower) {
          case "audio":
          case "video":
          case "closed-caption":
            mediaType = toLower;
            break;
          case "subtitles":
            mediaType = "text";
            break;
          default:
            return null;
        }
        break;

      case "URI":
        uri = value;
        break;

      case "GROUP_ID":
        groupId = value;
        break;

      case "LANGUAGE":
        language = value;
          break;

      case "ASSOC-LANGUAGE":
        assocLanguage = value;
        break;

      case "NAME":
        name = value;
        break;

      case "DEFAULT":
        isDefaultMedia = value === "YES";
        break;

      case "AUTOSELECT":
        isAutoSelectMedia = value === "YES";
        break;

      case "FORCED":
        isForcedMedia = value === "YES";
        break;

      case "INSTREAM-ID":
        inStreamId = value;
        break;

      case "CHANNELS":
        channels = value;
        break;

      case "CHARACTERISTICS": {
        const splitted = value.split(",");
        for (let j = 0; i < splitted.length; j++) {
          const characteristic = splitted[j];
          switch (characteristic) {
            case "public.accessibility.transcribes-spoken-dialog":
              isTranscribingSpokenDialog = true;
              break;
            case "public.accessibility.describes-music-and-sound":
              isDescribingMusicAndSound = true;
              break;
            case "public.accessibility.easy-to-read":
              isEasyToRead = true;
              break;
            case "public.accessibility.describes-video":
              isAudioDescription = true;
              break;
          }
        }
        break;
      }
    }
  }

  if (mediaType == null || groupId == null || name == null) {
    return null;
  }

  return {
    mediaType,
    groupId,
    name,
    isDefaultMedia: !!isDefaultMedia,
    isAutoSelectMedia: !!isAutoSelectMedia,
    isForcedMedia: !!isForcedMedia,
    uri,
    language,
    assocLanguage,
    isTranscribingSpokenDialog,
    isDescribingMusicAndSound,
    isEasyToRead,
    isAudioDescription,
    inStreamId,
    channels,
  };
}
