import { ICompatMediaKeySystemConfiguration } from "../browser_compatibility_types";
import { ICustomMediaKeys } from "./custom_media_keys";
export interface ICustomMediaKeySystemAccess {
    readonly keySystem: string;
    getConfiguration(): ICompatMediaKeySystemConfiguration;
    createMediaKeys(): Promise<MediaKeys | ICustomMediaKeys>;
}
/**
 * Simple implementation of the MediaKeySystemAccess EME API.
 *
 * All needed arguments are given to the constructor
 * @class CustomMediaKeySystemAccess
 */
export default class CustomMediaKeySystemAccess implements ICustomMediaKeySystemAccess {
    private readonly _keyType;
    private readonly _mediaKeys;
    private readonly _configuration;
    /**
     * @param {string} _keyType - type of key system (e.g. "widevine" or
     * "com.widevine.alpha").
     * @param {Object} _mediaKeys - MediaKeys implementation
     * @param {Object} _configuration - Configuration accepted for this
     * MediaKeySystemAccess.
     */
    constructor(_keyType: string, _mediaKeys: ICustomMediaKeys | MediaKeys, _configuration: ICompatMediaKeySystemConfiguration);
    /**
     * @returns {string} - current key system type (e.g. "widevine" or
     * "com.widevine.alpha").
     */
    readonly keySystem: string;
    /**
     * @returns {Promise.<Object>} - Promise wrapping the MediaKeys for this
     * MediaKeySystemAccess. Never rejects.
     */
    createMediaKeys(): Promise<ICustomMediaKeys | MediaKeys>;
    /**
     * @returns {Object} - Configuration accepted for this MediaKeySystemAccess.
     */
    getConfiguration(): ICompatMediaKeySystemConfiguration;
}
