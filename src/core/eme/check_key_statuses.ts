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

import { ICustomMediaKeySession } from "../../compat";
import { EncryptedMediaError } from "../../errors";
import {
  IEMEWarningEvent,
  IKeySystemOption,
} from "./types";

const KEY_STATUSES = { EXPIRED: "expired",
                       INTERNAL_ERROR: "internal-error",
                       OUTPUT_RESTRICTED: "output-restricted" };

/**
 * Look at the current key statuses in the sessions and construct the
 * appropriate warnings
 *
 * Throws if one of the keyID is on an error.
 * @param {MediaKeySession} session - The MediaKeySession from which the keys
 * will be checked.
 * @param {Object} keySystem - Configuration. Used to known on which situations
 * we can fallback.
 * @returns {Array} - Warnings to send.
 */
export default function checkKeyStatuses(
  session : MediaKeySession | ICustomMediaKeySession,
  keySystem: IKeySystemOption
) : IEMEWarningEvent[] {
  const warnings : IEMEWarningEvent[] = [];

  (session.keyStatuses as any).forEach((_arg1 : unknown, _arg2 : unknown) => {
    // Hack present because the order of the arguments has changed in spec
    // and is not the same between some versions of Edge and Chrome.
    const keyStatus = (() => {
      return (typeof _arg1  === "string" ? _arg1 :
                                           _arg2
             ) as MediaKeyStatus;
    })();

    switch (keyStatus) {
      case KEY_STATUSES.EXPIRED: {
        const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                              "A decryption key expired");

        if (keySystem.throwOnLicenseExpiration !== false) {
          throw error;
        }
        warnings.push({ type: "warning", value: error });
        break;
      }

      case KEY_STATUSES.INTERNAL_ERROR: {
        throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                      "An invalid key status has been " +
                                      "encountered: " + keyStatus);
      }

      case KEY_STATUSES.OUTPUT_RESTRICTED: {
        throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR",
                                      "An invalid key status has been " +
                                      "encountered: " + keyStatus);
      }
    }
  });
  return warnings;
}
