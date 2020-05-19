/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
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
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var stringToByteArray = function (str) {
    // TODO(user): Use native implementations if/when available
    var out = [];
    var p = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 128) {
            out[p++] = c;
        }
        else if (c < 2048) {
            out[p++] = (c >> 6) | 192;
            out[p++] = (c & 63) | 128;
        }
        else if ((c & 0xfc00) === 0xd800 &&
            i + 1 < str.length &&
            (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
            // Surrogate Pair
            c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
            out[p++] = (c >> 18) | 240;
            out[p++] = ((c >> 12) & 63) | 128;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
        else {
            out[p++] = (c >> 12) | 224;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
    }
    return out;
};
/**
 * Turns an array of numbers into the string given by the concatenation of the
 * characters to which the numbers correspond.
 * @param bytes Array of numbers representing characters.
 * @return Stringification of the array.
 */
var byteArrayToString = function (bytes) {
    // TODO(user): Use native implementations if/when available
    var out = [];
    var pos = 0, c = 0;
    while (pos < bytes.length) {
        var c1 = bytes[pos++];
        if (c1 < 128) {
            out[c++] = String.fromCharCode(c1);
        }
        else if (c1 > 191 && c1 < 224) {
            var c2 = bytes[pos++];
            out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
        }
        else if (c1 > 239 && c1 < 365) {
            // Surrogate Pair
            var c2 = bytes[pos++];
            var c3 = bytes[pos++];
            var c4 = bytes[pos++];
            var u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                0x10000;
            out[c++] = String.fromCharCode(0xd800 + (u >> 10));
            out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
        }
        else {
            var c2 = bytes[pos++];
            var c3 = bytes[pos++];
            out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        }
    }
    return out.join('');
};
// We define it as an object literal instead of a class because a class compiled down to es5 can't
// be treeshaked. https://github.com/rollup/rollup/issues/1691
// Static lookup maps, lazily populated by init_()
var base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
        return this.ENCODED_VALS_BASE + '+/=';
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
        return this.ENCODED_VALS_BASE + '-_.';
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === 'function',
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray: function (input, webSafe) {
        if (!Array.isArray(input)) {
            throw Error('encodeByteArray takes an array as a parameter');
        }
        this.init_();
        var byteToCharMap = webSafe
            ? this.byteToCharMapWebSafe_
            : this.byteToCharMap_;
        var output = [];
        for (var i = 0; i < input.length; i += 3) {
            var byte1 = input[i];
            var haveByte2 = i + 1 < input.length;
            var byte2 = haveByte2 ? input[i + 1] : 0;
            var haveByte3 = i + 2 < input.length;
            var byte3 = haveByte3 ? input[i + 2] : 0;
            var outByte1 = byte1 >> 2;
            var outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
            var outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
            var outByte4 = byte3 & 0x3f;
            if (!haveByte3) {
                outByte4 = 64;
                if (!haveByte2) {
                    outByte3 = 64;
                }
            }
            output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
        }
        return output.join('');
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString: function (input, webSafe) {
        // Shortcut for Mozilla browsers that implement
        // a native base64 encoder in the form of "btoa/atob"
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return btoa(input);
        }
        return this.encodeByteArray(stringToByteArray(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString: function (input, webSafe) {
        // Shortcut for Mozilla browsers that implement
        // a native base64 encoder in the form of "btoa/atob"
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return atob(input);
        }
        return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray: function (input, webSafe) {
        this.init_();
        var charToByteMap = webSafe
            ? this.charToByteMapWebSafe_
            : this.charToByteMap_;
        var output = [];
        for (var i = 0; i < input.length;) {
            var byte1 = charToByteMap[input.charAt(i++)];
            var haveByte2 = i < input.length;
            var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
            ++i;
            var haveByte3 = i < input.length;
            var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            var haveByte4 = i < input.length;
            var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                throw Error();
            }
            var outByte1 = (byte1 << 2) | (byte2 >> 4);
            output.push(outByte1);
            if (byte3 !== 64) {
                var outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                output.push(outByte2);
                if (byte4 !== 64) {
                    var outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                    output.push(outByte3);
                }
            }
        }
        return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_: function () {
        if (!this.byteToCharMap_) {
            this.byteToCharMap_ = {};
            this.charToByteMap_ = {};
            this.byteToCharMapWebSafe_ = {};
            this.charToByteMapWebSafe_ = {};
            // We want quick mappings back and forth, so we precompute two maps.
            for (var i = 0; i < this.ENCODED_VALS.length; i++) {
                this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                this.charToByteMap_[this.byteToCharMap_[i]] = i;
                this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                // Be forgiving when decoding and correctly decode both encodings.
                if (i >= this.ENCODED_VALS_BASE.length) {
                    this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                    this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                }
            }
        }
    }
};
/**
 * URL-safe base64 decoding
 *
 * NOTE: DO NOT use the global atob() function - it does NOT support the
 * base64Url variant encoding.
 *
 * @param str To be decoded
 * @return Decoded result, if possible
 */
var base64Decode = function (str) {
    try {
        return base64.decodeString(str, true);
    }
    catch (e) {
        console.error('base64Decode failed: ', e);
    }
    return null;
};

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Deferred = /** @class */ (function () {
    function Deferred() {
        var _this = this;
        this.reject = function () { };
        this.resolve = function () { };
        this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    }
    /**
     * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    Deferred.prototype.wrapCallback = function (callback) {
        var _this = this;
        return function (error, value) {
            if (error) {
                _this.reject(error);
            }
            else {
                _this.resolve(value);
            }
            if (typeof callback === 'function') {
                // Attaching noop handler just in case developer wasn't expecting
                // promises
                _this.promise.catch(function () { });
                // Some of our callbacks don't expect a value and our own tests
                // assert that the parameter length is 1
                if (callback.length === 1) {
                    callback(error);
                }
                else {
                    callback(error, value);
                }
            }
        };
    };
    return Deferred;
}());

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns navigator.userAgent string or '' if it's not defined.
 * @return user agent string
 */
function getUA() {
    if (typeof navigator !== 'undefined' &&
        typeof navigator['userAgent'] === 'string') {
        return navigator['userAgent'];
    }
    else {
        return '';
    }
}
/**
 * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
 *
 * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
 * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
 * wait for a callback.
 */
function isMobileCordova() {
    return (typeof window !== 'undefined' &&
        // @ts-ignore Setting up an broadly applicable index signature for Window
        // just to deal with this case would probably be a bad idea.
        !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
        /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
}
function isBrowserExtension() {
    var runtime = typeof chrome === 'object'
        ? chrome.runtime
        : typeof browser === 'object'
            ? browser.runtime
            : undefined;
    return typeof runtime === 'object' && runtime.id !== undefined;
}
/**
 * Detect React Native.
 *
 * @return true if ReactNative environment is detected.
 */
function isReactNative() {
    return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ERROR_NAME = 'FirebaseError';
// Based on code from:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
var FirebaseError = /** @class */ (function (_super) {
    __extends(FirebaseError, _super);
    function FirebaseError(code, message) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.name = ERROR_NAME;
        // Fix For ES5
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(_this, FirebaseError.prototype);
        // Maintains proper stack trace for where our error was thrown.
        // Only available on V8.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, ErrorFactory.prototype.create);
        }
        return _this;
    }
    return FirebaseError;
}(Error));
var ErrorFactory = /** @class */ (function () {
    function ErrorFactory(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
    }
    ErrorFactory.prototype.create = function (code) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            data[_i - 1] = arguments[_i];
        }
        var customData = data[0] || {};
        var fullCode = this.service + "/" + code;
        var template = this.errors[code];
        var message = template ? replaceTemplate(template, customData) : 'Error';
        // Service Name: Error message (service/code).
        var fullMessage = this.serviceName + ": " + message + " (" + fullCode + ").";
        var error = new FirebaseError(fullCode, fullMessage);
        // Keys with an underscore at the end of their name are not included in
        // error.data for some reason.
        // TODO: Replace with Object.entries when lib is updated to es2017.
        for (var _a = 0, _b = Object.keys(customData); _a < _b.length; _a++) {
            var key = _b[_a];
            if (key.slice(-1) !== '_') {
                if (key in error) {
                    console.warn("Overwriting FirebaseError base field \"" + key + "\" can cause unexpected behavior.");
                }
                error[key] = customData[key];
            }
        }
        return error;
    };
    return ErrorFactory;
}());
function replaceTemplate(template, data) {
    return template.replace(PATTERN, function (_, key) {
        var value = data[key];
        return value != null ? String(value) : "<" + key + "?>";
    });
}
var PATTERN = /\{\$([^}]+)}/g;
function isEmpty(obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
 * params object (e.g. {arg: 'val', arg2: 'val2'})
 * Note: You must prepend it with ? when adding it to a URL.
 */
function querystring(querystringParams) {
    var params = [];
    var _loop_1 = function (key, value) {
        if (Array.isArray(value)) {
            value.forEach(function (arrayVal) {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
            });
        }
        else {
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
    };
    for (var _i = 0, _a = Object.entries(querystringParams); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        _loop_1(key, value);
    }
    return params.length ? '&' + params.join('&') : '';
}

/**
 * Helper to make a Subscribe function (just like Promise helps make a
 * Thenable).
 *
 * @param executor Function which can make calls to a single Observer
 *     as a proxy.
 * @param onNoObservers Callback when count of Observers goes to zero.
 */
function createSubscribe(executor, onNoObservers) {
    var proxy = new ObserverProxy(executor, onNoObservers);
    return proxy.subscribe.bind(proxy);
}
/**
 * Implement fan-out for any number of Observers attached via a subscribe
 * function.
 */
var ObserverProxy = /** @class */ (function () {
    /**
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function ObserverProxy(executor, onNoObservers) {
        var _this = this;
        this.observers = [];
        this.unsubscribes = [];
        this.observerCount = 0;
        // Micro-task scheduling by calling task.then().
        this.task = Promise.resolve();
        this.finalized = false;
        this.onNoObservers = onNoObservers;
        // Call the executor asynchronously so subscribers that are called
        // synchronously after the creation of the subscribe function
        // can still receive the very first value generated in the executor.
        this.task
            .then(function () {
            executor(_this);
        })
            .catch(function (e) {
            _this.error(e);
        });
    }
    ObserverProxy.prototype.next = function (value) {
        this.forEachObserver(function (observer) {
            observer.next(value);
        });
    };
    ObserverProxy.prototype.error = function (error) {
        this.forEachObserver(function (observer) {
            observer.error(error);
        });
        this.close(error);
    };
    ObserverProxy.prototype.complete = function () {
        this.forEachObserver(function (observer) {
            observer.complete();
        });
        this.close();
    };
    /**
     * Subscribe function that can be used to add an Observer to the fan-out list.
     *
     * - We require that no event is sent to a subscriber sychronously to their
     *   call to subscribe().
     */
    ObserverProxy.prototype.subscribe = function (nextOrObserver, error, complete) {
        var _this = this;
        var observer;
        if (nextOrObserver === undefined &&
            error === undefined &&
            complete === undefined) {
            throw new Error('Missing Observer.');
        }
        // Assemble an Observer object when passed as callback functions.
        if (implementsAnyMethods(nextOrObserver, [
            'next',
            'error',
            'complete'
        ])) {
            observer = nextOrObserver;
        }
        else {
            observer = {
                next: nextOrObserver,
                error: error,
                complete: complete
            };
        }
        if (observer.next === undefined) {
            observer.next = noop;
        }
        if (observer.error === undefined) {
            observer.error = noop;
        }
        if (observer.complete === undefined) {
            observer.complete = noop;
        }
        var unsub = this.unsubscribeOne.bind(this, this.observers.length);
        // Attempt to subscribe to a terminated Observable - we
        // just respond to the Observer with the final error or complete
        // event.
        if (this.finalized) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                try {
                    if (_this.finalError) {
                        observer.error(_this.finalError);
                    }
                    else {
                        observer.complete();
                    }
                }
                catch (e) {
                    // nothing
                }
                return;
            });
        }
        this.observers.push(observer);
        return unsub;
    };
    // Unsubscribe is synchronous - we guarantee that no events are sent to
    // any unsubscribed Observer.
    ObserverProxy.prototype.unsubscribeOne = function (i) {
        if (this.observers === undefined || this.observers[i] === undefined) {
            return;
        }
        delete this.observers[i];
        this.observerCount -= 1;
        if (this.observerCount === 0 && this.onNoObservers !== undefined) {
            this.onNoObservers(this);
        }
    };
    ObserverProxy.prototype.forEachObserver = function (fn) {
        if (this.finalized) {
            // Already closed by previous event....just eat the additional values.
            return;
        }
        // Since sendOne calls asynchronously - there is no chance that
        // this.observers will become undefined.
        for (var i = 0; i < this.observers.length; i++) {
            this.sendOne(i, fn);
        }
    };
    // Call the Observer via one of it's callback function. We are careful to
    // confirm that the observe has not been unsubscribed since this asynchronous
    // function had been queued.
    ObserverProxy.prototype.sendOne = function (i, fn) {
        var _this = this;
        // Execute the callback asynchronously
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(function () {
            if (_this.observers !== undefined && _this.observers[i] !== undefined) {
                try {
                    fn(_this.observers[i]);
                }
                catch (e) {
                    // Ignore exceptions raised in Observers or missing methods of an
                    // Observer.
                    // Log error to console. b/31404806
                    if (typeof console !== 'undefined' && console.error) {
                        console.error(e);
                    }
                }
            }
        });
    };
    ObserverProxy.prototype.close = function (err) {
        var _this = this;
        if (this.finalized) {
            return;
        }
        this.finalized = true;
        if (err !== undefined) {
            this.finalError = err;
        }
        // Proxy is no longer needed - garbage collect references
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(function () {
            _this.observers = undefined;
            _this.onNoObservers = undefined;
        });
    };
    return ObserverProxy;
}());
/**
 * Return true if the object passed in implements any of the named methods.
 */
function implementsAnyMethods(obj, methods) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
        var method = methods_1[_i];
        if (method in obj && typeof obj[method] === 'function') {
            return true;
        }
    }
    return false;
}
function noop() {
    // do nothing
}

/**
 * Component for service name T, e.g. `auth`, `auth-internal`
 */
var Component = /** @class */ (function () {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    function Component(name, instanceFactory, type) {
        this.name = name;
        this.instanceFactory = instanceFactory;
        this.type = type;
        this.multipleInstances = false;
        /**
         * Properties to be added to the service namespace
         */
        this.serviceProps = {};
        this.instantiationMode = "LAZY" /* LAZY */;
    }
    Component.prototype.setInstantiationMode = function (mode) {
        this.instantiationMode = mode;
        return this;
    };
    Component.prototype.setMultipleInstances = function (multipleInstances) {
        this.multipleInstances = multipleInstances;
        return this;
    };
    Component.prototype.setServiceProps = function (props) {
        this.serviceProps = props;
        return this;
    };
    return Component;
}());

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DEFAULT_ENTRY_NAME = '[DEFAULT]';

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
 * NameServiceMapping[T] is an alias for the type of the instance
 */
var Provider = /** @class */ (function () {
    function Provider(name, container) {
        this.name = name;
        this.container = container;
        this.component = null;
        this.instances = new Map();
        this.instancesDeferred = new Map();
    }
    /**
     * @param identifier A provider can provide mulitple instances of a service
     * if this.component.multipleInstances is true.
     */
    Provider.prototype.get = function (identifier) {
        if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
        // if multipleInstances is not supported, use the default name
        var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        if (!this.instancesDeferred.has(normalizedIdentifier)) {
            var deferred = new Deferred();
            this.instancesDeferred.set(normalizedIdentifier, deferred);
            // If the service instance is available, resolve the promise with it immediately
            try {
                var instance = this.getOrInitializeService(normalizedIdentifier);
                if (instance) {
                    deferred.resolve(instance);
                }
            }
            catch (e) {
                // when the instance factory throws an exception during get(), it should not cause
                // a fatal error. We just return the unresolved promise in this case.
            }
        }
        return this.instancesDeferred.get(normalizedIdentifier).promise;
    };
    Provider.prototype.getImmediate = function (options) {
        var _a = __assign({ identifier: DEFAULT_ENTRY_NAME, optional: false }, options), identifier = _a.identifier, optional = _a.optional;
        // if multipleInstances is not supported, use the default name
        var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
        try {
            var instance = this.getOrInitializeService(normalizedIdentifier);
            if (!instance) {
                if (optional) {
                    return null;
                }
                throw Error("Service " + this.name + " is not available");
            }
            return instance;
        }
        catch (e) {
            if (optional) {
                return null;
            }
            else {
                throw e;
            }
        }
    };
    Provider.prototype.getComponent = function () {
        return this.component;
    };
    Provider.prototype.setComponent = function (component) {
        var e_1, _a;
        if (component.name !== this.name) {
            throw Error("Mismatching Component " + component.name + " for Provider " + this.name + ".");
        }
        if (this.component) {
            throw Error("Component for " + this.name + " has already been provided");
        }
        this.component = component;
        // if the service is eager, initialize the default instance
        if (isComponentEager(component)) {
            try {
                this.getOrInitializeService(DEFAULT_ENTRY_NAME);
            }
            catch (e) {
                // when the instance factory for an eager Component throws an exception during the eager
                // initialization, it should not cause a fatal error.
                // TODO: Investigate if we need to make it configurable, because some component may want to cause
                // a fatal error in this case?
            }
        }
        try {
            // Create service instances for the pending promises and resolve them
            // NOTE: if this.multipleInstances is false, only the default instance will be created
            // and all promises with resolve with it regardless of the identifier.
            for (var _b = __values(this.instancesDeferred.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), instanceIdentifier = _d[0], instanceDeferred = _d[1];
                var normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                try {
                    // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                    var instance = this.getOrInitializeService(normalizedIdentifier);
                    instanceDeferred.resolve(instance);
                }
                catch (e) {
                    // when the instance factory throws an exception, it should not cause
                    // a fatal error. We just leave the promise unresolved.
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    Provider.prototype.clearInstance = function (identifier) {
        if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
        this.instancesDeferred.delete(identifier);
        this.instances.delete(identifier);
    };
    // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?
    Provider.prototype.delete = function () {
        return __awaiter(this, void 0, void 0, function () {
            var services;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        services = Array.from(this.instances.values());
                        return [4 /*yield*/, Promise.all(services
                                .filter(function (service) { return 'INTERNAL' in service; })
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                .map(function (service) { return service.INTERNAL.delete(); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Provider.prototype.isComponentSet = function () {
        return this.component != null;
    };
    Provider.prototype.getOrInitializeService = function (identifier) {
        var instance = this.instances.get(identifier);
        if (!instance && this.component) {
            instance = this.component.instanceFactory(this.container, normalizeIdentifierForFactory(identifier));
            this.instances.set(identifier, instance);
        }
        return instance || null;
    };
    Provider.prototype.normalizeInstanceIdentifier = function (identifier) {
        if (this.component) {
            return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
        }
        else {
            return identifier; // assume multiple instances are supported before the component is provided.
        }
    };
    return Provider;
}());
// undefined should be passed to the service factory for the default instance
function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
}
function isComponentEager(component) {
    return component.instantiationMode === "EAGER" /* EAGER */;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
 */
var ComponentContainer = /** @class */ (function () {
    function ComponentContainer(name) {
        this.name = name;
        this.providers = new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */
    ComponentContainer.prototype.addComponent = function (component) {
        var provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
            throw new Error("Component " + component.name + " has already been registered with " + this.name);
        }
        provider.setComponent(component);
    };
    ComponentContainer.prototype.addOrOverwriteComponent = function (component) {
        var provider = this.getProvider(component.name);
        if (provider.isComponentSet()) {
            // delete the existing provider from the container, so we can register the new component
            this.providers.delete(component.name);
        }
        this.addComponent(component);
    };
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */
    ComponentContainer.prototype.getProvider = function (name) {
        if (this.providers.has(name)) {
            return this.providers.get(name);
        }
        // create a Provider for a service that hasn't registered with Firebase
        var provider = new Provider(name, this);
        this.providers.set(name, provider);
        return provider;
    };
    ComponentContainer.prototype.getProviders = function () {
        return Array.from(this.providers.values());
    };
    return ComponentContainer;
}());

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __spreadArrays$1() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a;
/**
 * The JS SDK supports 5 log levels and also allows a user the ability to
 * silence the logs altogether.
 *
 * The order is a follows:
 * DEBUG < VERBOSE < INFO < WARN < ERROR
 *
 * All of the log types above the current log level will be captured (i.e. if
 * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
 * `VERBOSE` logs will not)
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
})(LogLevel || (LogLevel = {}));
var levelStringToEnum = {
    'debug': LogLevel.DEBUG,
    'verbose': LogLevel.VERBOSE,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN,
    'error': LogLevel.ERROR,
    'silent': LogLevel.SILENT
};
/**
 * The default log level
 */
var defaultLogLevel = LogLevel.INFO;
/**
 * By default, `console.debug` is not displayed in the developer console (in
 * chrome). To avoid forcing users to have to opt-in to these logs twice
 * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
 * logs to the `console.log` function.
 */
var ConsoleMethod = (_a = {},
    _a[LogLevel.DEBUG] = 'log',
    _a[LogLevel.VERBOSE] = 'log',
    _a[LogLevel.INFO] = 'info',
    _a[LogLevel.WARN] = 'warn',
    _a[LogLevel.ERROR] = 'error',
    _a);
/**
 * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
 * messages on to their corresponding console counterparts (if the log method
 * is supported by the current log level)
 */
var defaultLogHandler = function (instance, logType) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (logType < instance.logLevel) {
        return;
    }
    var now = new Date().toISOString();
    var method = ConsoleMethod[logType];
    if (method) {
        console[method].apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
    }
    else {
        throw new Error("Attempted to log a message with an invalid logType (value: " + logType + ")");
    }
};
var Logger = /** @class */ (function () {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    function Logger(name) {
        this.name = name;
        /**
         * The log level of the given Logger instance.
         */
        this._logLevel = defaultLogLevel;
        /**
         * The main (internal) log handler for the Logger instance.
         * Can be set to a new function in internal package code but not by user.
         */
        this._logHandler = defaultLogHandler;
        /**
         * The optional, additional, user-defined log handler for the Logger instance.
         */
        this._userLogHandler = null;
    }
    Object.defineProperty(Logger.prototype, "logLevel", {
        get: function () {
            return this._logLevel;
        },
        set: function (val) {
            if (!(val in LogLevel)) {
                throw new TypeError("Invalid value \"" + val + "\" assigned to `logLevel`");
            }
            this._logLevel = val;
        },
        enumerable: false,
        configurable: true
    });
    // Workaround for setter/getter having to be the same type.
    Logger.prototype.setLogLevel = function (val) {
        this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
    };
    Object.defineProperty(Logger.prototype, "logHandler", {
        get: function () {
            return this._logHandler;
        },
        set: function (val) {
            if (typeof val !== 'function') {
                throw new TypeError('Value assigned to `logHandler` must be a function');
            }
            this._logHandler = val;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Logger.prototype, "userLogHandler", {
        get: function () {
            return this._userLogHandler;
        },
        set: function (val) {
            this._userLogHandler = val;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * The functions below are all based on the `console` interface
     */
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
        this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
    };
    Logger.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
        this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
    };
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
        this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
        this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
        this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
    };
    return Logger;
}());

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PlatformLoggerService = /** @class */ (function () {
    function PlatformLoggerService(container) {
        this.container = container;
    }
    // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.
    PlatformLoggerService.prototype.getPlatformInfoString = function () {
        var providers = this.container.getProviders();
        // Loop through providers and get library/version pairs from any that are
        // version components.
        return providers
            .map(function (provider) {
            if (isVersionServiceProvider(provider)) {
                var service = provider.getImmediate();
                return service.library + "/" + service.version;
            }
            else {
                return null;
            }
        })
            .filter(function (logString) { return logString; })
            .join(' ');
    };
    return PlatformLoggerService;
}());
/**
 *
 * @param provider check if this provider provides a VersionService
 *
 * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
 * provides VersionService. The provider is not necessarily a 'app-version'
 * provider.
 */
function isVersionServiceProvider(provider) {
    var component = provider.getComponent();
    return (component === null || component === void 0 ? void 0 : component.type) === "VERSION" /* VERSION */;
}

var name$1 = "@firebase/app-exp";
var version = "0.0.800";

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logger = new Logger('@firebase/app');

var name$2 = "@firebase/analytics";

var name$3 = "@firebase/auth";

var name$4 = "@firebase/database";

var name$5 = "@firebase/functions-exp";

var name$6 = "@firebase/installations";

var name$7 = "@firebase/messaging";

var name$8 = "@firebase/performance";

var name$9 = "@firebase/remote-config";

var name$a = "@firebase/storage";

var name$b = "@firebase/firestore";

var name$c = "firebase-exp";

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a$1;
var DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';
var PLATFORM_LOG_STRING = (_a$1 = {},
    _a$1[name$1] = 'fire-core',
    _a$1[name$2] = 'fire-analytics',
    _a$1[name$3] = 'fire-auth',
    _a$1[name$4] = 'fire-rtdb',
    _a$1[name$5] = 'fire-fn',
    _a$1[name$6] = 'fire-iid',
    _a$1[name$7] = 'fire-fcm',
    _a$1[name$8] = 'fire-perf',
    _a$1[name$9] = 'fire-rc',
    _a$1[name$a] = 'fire-gcs',
    _a$1[name$b] = 'fire-fst',
    _a$1['fire-js'] = 'fire-js',
    _a$1[name$c] = 'fire-js-all',
    _a$1);

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @internal
 */
var _apps = new Map();
/**
 * Registered components.
 *
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var _components = new Map();
/**
 * @param component - the component being added to this app's container
 *
 * @internal
 */
function _addComponent(app, component) {
    try {
        app.container.addComponent(component);
    }
    catch (e) {
        logger.debug("Component " + component.name + " failed to register with FirebaseApp " + app.name, e);
    }
}
/**
 *
 * @param component - the component to register
 * @returns whether or not the component is registered successfully
 *
 * @internal
 */
function _registerComponent(component) {
    var e_1, _a;
    var componentName = component.name;
    if (_components.has(componentName)) {
        logger.debug("There were multiple attempts to register component " + componentName + ".");
        return false;
    }
    _components.set(componentName, component);
    try {
        // add the component to existing app instances
        for (var _b = __values(_apps.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var app = _c.value;
            _addComponent(app, component);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return true;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a$1$1;
var ERRORS = (_a$1$1 = {},
    _a$1$1["no-app" /* NO_APP */] = "No Firebase App '{$appName}' has been created - " +
        'call Firebase App.initializeApp()',
    _a$1$1["bad-app-name" /* BAD_APP_NAME */] = "Illegal App name: '{$appName}",
    _a$1$1["duplicate-app" /* DUPLICATE_APP */] = "Firebase App named '{$appName}' already exists",
    _a$1$1["app-deleted" /* APP_DELETED */] = "Firebase App named '{$appName}' already deleted",
    _a$1$1["invalid-app-argument" /* INVALID_APP_ARGUMENT */] = 'firebase.{$appName}() takes either no argument or a ' +
        'Firebase App instance.',
    _a$1$1["invalid-log-argument" /* INVALID_LOG_ARGUMENT */] = 'First argument to `onLog` must be null or a function.',
    _a$1$1);
var ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);

var version$1 = "7.17.2";

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var FirebaseAppImpl = /** @class */ (function () {
    function FirebaseAppImpl(options, config, container) {
        var _this = this;
        this.isDeleted = false;
        this.options_ = __assign({}, options);
        this.name_ = config.name;
        this.automaticDataCollectionEnabled_ =
            config.automaticDataCollectionEnabled;
        this.container = container;
        this.container.addComponent(new Component('app-exp', function () { return _this; }, "PUBLIC" /* PUBLIC */));
    }
    Object.defineProperty(FirebaseAppImpl.prototype, "automaticDataCollectionEnabled", {
        get: function () {
            this.checkDestroyed();
            return this.automaticDataCollectionEnabled_;
        },
        set: function (val) {
            this.checkDestroyed();
            this.automaticDataCollectionEnabled_ = val;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FirebaseAppImpl.prototype, "name", {
        get: function () {
            this.checkDestroyed();
            return this.name_;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FirebaseAppImpl.prototype, "options", {
        get: function () {
            this.checkDestroyed();
            return this.options_;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    FirebaseAppImpl.prototype.checkDestroyed = function () {
        if (this.isDeleted) {
            throw ERROR_FACTORY.create("app-deleted" /* APP_DELETED */, { appName: this.name_ });
        }
    };
    return FirebaseAppImpl;
}());

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * The current SDK version.
 *
 * @public
 */
var SDK_VERSION = version$1;
function initializeApp(options, rawConfig) {
    var e_1, _a;
    if (rawConfig === void 0) { rawConfig = {}; }
    if (typeof rawConfig !== 'object') {
        var name_1 = rawConfig;
        rawConfig = { name: name_1 };
    }
    var config = __assign({ name: DEFAULT_ENTRY_NAME$1, automaticDataCollectionEnabled: false }, rawConfig);
    var name = config.name;
    if (typeof name !== 'string' || !name) {
        throw ERROR_FACTORY.create("bad-app-name" /* BAD_APP_NAME */, {
            appName: String(name)
        });
    }
    if (_apps.has(name)) {
        throw ERROR_FACTORY.create("duplicate-app" /* DUPLICATE_APP */, { appName: name });
    }
    var container = new ComponentContainer(name);
    try {
        for (var _b = __values(_components.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var component = _c.value;
            container.addComponent(component);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var newApp = new FirebaseAppImpl(options, config, container);
    _apps.set(name, newApp);
    return newApp;
}
/**
 * Retrieves a FirebaseApp instance.
 *
 * When called with no arguments, the default app is returned. When an app name
 * is provided, the app corresponding to that name is returned.
 *
 * An exception is thrown if the app being retrieved has not yet been
 * initialized.
 *
 * @example
 * ```javascript
 * // Return the default app
 * const app = getApp();
 * ```
 *
 * @example
 * ```javascript
 * // Return a named app
 * const otherApp = getApp("otherApp");
 * ```
 *
 * @param name - Optional name of the app to return. If no name is
 *   provided, the default is `"[DEFAULT]"`.
 *
 * @returns The app corresponding to the provided app name.
 *   If no app name is provided, the default app is returned.
 *
 * @public
 */
function getApp(name) {
    if (name === void 0) { name = DEFAULT_ENTRY_NAME$1; }
    var app = _apps.get(name);
    if (!app) {
        throw ERROR_FACTORY.create("no-app" /* NO_APP */, { appName: name });
    }
    return app;
}
/**
 * Registers a library's name and version for platform logging purposes.
 * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
 * @param version - Current version of that library.
 * @param variant - Bundle variant, e.g., node, rn, etc.
 *
 * @public
 */
function registerVersion(libraryKeyOrName, version, variant) {
    var _a;
    // TODO: We can use this check to whitelist strings when/if we set up
    // a good whitelist system.
    var library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;
    if (variant) {
        library += "-" + variant;
    }
    var libraryMismatch = library.match(/\s|\//);
    var versionMismatch = version.match(/\s|\//);
    if (libraryMismatch || versionMismatch) {
        var warning = [
            "Unable to register library \"" + library + "\" with version \"" + version + "\":"
        ];
        if (libraryMismatch) {
            warning.push("library name \"" + library + "\" contains illegal characters (whitespace or \"/\")");
        }
        if (libraryMismatch && versionMismatch) {
            warning.push('and');
        }
        if (versionMismatch) {
            warning.push("version name \"" + version + "\" contains illegal characters (whitespace or \"/\")");
        }
        logger.warn(warning.join(' '));
        return;
    }
    _registerComponent(new Component(library + "-version", function () { return ({ library: library, version: version }); }, "VERSION" /* VERSION */));
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function registerCoreComponents(variant) {
    _registerComponent(new Component('platform-logger', function (container) { return new PlatformLoggerService(container); }, "PRIVATE" /* PRIVATE */));
    // Register `app` package.
    registerVersion(name$1, version, variant);
    // Register platform SDK identifier (no version).
    registerVersion('fire-js', '');
}

/**
 * Firebase App
 *
 * @remarks This package coordinates the communication between the different Firebase components
 * @packageDocumentation
 */
registerCoreComponents();

var name = "@firebase/auth-exp";
var version$2 = "0.1.0";

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a$2;
var ERRORS$1 = (_a$2 = {},
    _a$2["admin-restricted-operation" /* ADMIN_ONLY_OPERATION */] = 'This operation is restricted to administrators only.',
    _a$2["argument-error" /* ARGUMENT_ERROR */] = '',
    _a$2["app-not-authorized" /* APP_NOT_AUTHORIZED */] = "This app, identified by the domain where it's hosted, is not " +
        'authorized to use Firebase Authentication with the provided API key. ' +
        'Review your key configuration in the Google API console.',
    _a$2["app-not-installed" /* APP_NOT_INSTALLED */] = 'The requested mobile application corresponding to the identifier (' +
        'Android package name or iOS bundle ID) provided is not installed on ' +
        'this device.',
    _a$2["captcha-check-failed" /* CAPTCHA_CHECK_FAILED */] = 'The reCAPTCHA response token provided is either invalid, expired, ' +
        'already used or the domain associated with it does not match the list ' +
        'of whitelisted domains.',
    _a$2["code-expired" /* CODE_EXPIRED */] = 'The SMS code has expired. Please re-send the verification code to try ' +
        'again.',
    _a$2["cordova-not-ready" /* CORDOVA_NOT_READY */] = 'Cordova framework is not ready.',
    _a$2["cors-unsupported" /* CORS_UNSUPPORTED */] = 'This browser is not supported.',
    _a$2["credential-already-in-use" /* CREDENTIAL_ALREADY_IN_USE */] = 'This credential is already associated with a different user account.',
    _a$2["custom-token-mismatch" /* CREDENTIAL_MISMATCH */] = 'The custom token corresponds to a different audience.',
    _a$2["requires-recent-login" /* CREDENTIAL_TOO_OLD_LOGIN_AGAIN */] = 'This operation is sensitive and requires recent authentication. Log in ' +
        'again before retrying this request.',
    _a$2["dynamic-link-not-activated" /* DYNAMIC_LINK_NOT_ACTIVATED */] = 'Please activate Dynamic Links in the Firebase Console and agree to the terms and ' +
        'conditions.',
    _a$2["email-change-needs-verification" /* EMAIL_CHANGE_NEEDS_VERIFICATION */] = 'Multi-factor users must always have a verified email.',
    _a$2["email-already-in-use" /* EMAIL_EXISTS */] = 'The email address is already in use by another account.',
    _a$2["expired-action-code" /* EXPIRED_OOB_CODE */] = 'The action code has expired.',
    _a$2["cancelled-popup-request" /* EXPIRED_POPUP_REQUEST */] = 'This operation has been cancelled due to another conflicting popup being opened.',
    _a$2["internal-error" /* INTERNAL_ERROR */] = 'An internal AuthError has occurred.',
    _a$2["invalid-app-credential" /* INVALID_APP_CREDENTIAL */] = 'The phone verification request contains an invalid application verifier.' +
        ' The reCAPTCHA token response is either invalid or expired.',
    _a$2["invalid-app-id" /* INVALID_APP_ID */] = 'The mobile app identifier is not registed for the current project.',
    _a$2["invalid-user-token" /* INVALID_AUTH */] = "This user's credential isn't valid for this project. This can happen " +
        "if the user's token has been tampered with, or if the user isn't for " +
        'the project associated with this API key.',
    _a$2["invalid-auth-event" /* INVALID_AUTH_EVENT */] = 'An internal AuthError has occurred.',
    _a$2["invalid-verification-code" /* INVALID_CODE */] = 'The SMS verification code used to create the phone auth credential is ' +
        'invalid. Please resend the verification code sms and be sure use the ' +
        'verification code provided by the user.',
    _a$2["invalid-continue-uri" /* INVALID_CONTINUE_URI */] = 'The continue URL provided in the request is invalid.',
    _a$2["invalid-cordova-configuration" /* INVALID_CORDOVA_CONFIGURATION */] = 'The following Cordova plugins must be installed to enable OAuth sign-in: ' +
        'cordova-plugin-buildinfo, cordova-universal-links-plugin, ' +
        'cordova-plugin-browsertab, cordova-plugin-inappbrowser and ' +
        'cordova-plugin-customurlscheme.',
    _a$2["invalid-custom-token" /* INVALID_CUSTOM_TOKEN */] = 'The custom token format is incorrect. Please check the documentation.',
    _a$2["invalid-dynamic-link-domain" /* INVALID_DYNAMIC_LINK_DOMAIN */] = 'The provided dynamic link domain is not configured or authorized for the current project.',
    _a$2["invalid-email" /* INVALID_EMAIL */] = 'The email address is badly formatted.',
    _a$2["invalid-api-key" /* INVALID_API_KEY */] = 'Your API key is invalid, please check you have copied it correctly.',
    _a$2["invalid-cert-hash" /* INVALID_CERT_HASH */] = 'The SHA-1 certificate hash provided is invalid.',
    _a$2["invalid-credential" /* INVALID_IDP_RESPONSE */] = 'The supplied auth credential is malformed or has expired.',
    _a$2["invalid-message-payload" /* INVALID_MESSAGE_PAYLOAD */] = 'The email template corresponding to this action contains invalid characters in its message. ' +
        'Please fix by going to the Auth email templates section in the Firebase Console.',
    _a$2["invalid-multi-factor-session" /* INVALID_MFA_SESSION */] = 'The request does not contain a valid proof of first factor successful sign-in.',
    _a$2["invalid-oauth-provider" /* INVALID_OAUTH_PROVIDER */] = 'EmailAuthProvider is not supported for this operation. This operation ' +
        'only supports OAuth providers.',
    _a$2["invalid-oauth-client-id" /* INVALID_OAUTH_CLIENT_ID */] = 'The OAuth client ID provided is either invalid or does not match the ' +
        'specified API key.',
    _a$2["unauthorized-domain" /* INVALID_ORIGIN */] = 'This domain is not authorized for OAuth operations for your Firebase ' +
        'project. Edit the list of authorized domains from the Firebase console.',
    _a$2["invalid-action-code" /* INVALID_OOB_CODE */] = 'The action code is invalid. This can happen if the code is malformed, ' +
        'expired, or has already been used.',
    _a$2["wrong-password" /* INVALID_PASSWORD */] = 'The password is invalid or the user does not have a password.',
    _a$2["invalid-persistence-type" /* INVALID_PERSISTENCE */] = 'The specified persistence type is invalid. It can only be local, session or none.',
    _a$2["invalid-phone-number" /* INVALID_PHONE_NUMBER */] = 'The format of the phone number provided is incorrect. Please enter the ' +
        'phone number in a format that can be parsed into E.164 format. E.164 ' +
        'phone numbers are written in the format [+][country code][subscriber ' +
        'number including area code].',
    _a$2["invalid-provider-id" /* INVALID_PROVIDER_ID */] = 'The specified provider ID is invalid.',
    _a$2["invalid-recipient-email" /* INVALID_RECIPIENT_EMAIL */] = 'The email corresponding to this action failed to send as the provided ' +
        'recipient email address is invalid.',
    _a$2["invalid-sender" /* INVALID_SENDER */] = 'The email template corresponding to this action contains an invalid sender email or name. ' +
        'Please fix by going to the Auth email templates section in the Firebase Console.',
    _a$2["invalid-verification-id" /* INVALID_SESSION_INFO */] = 'The verification ID used to create the phone auth credential is invalid.',
    _a$2["invalid-tenant-id" /* INVALID_TENANT_ID */] = "The Auth instance's tenant ID is invalid.",
    _a$2["missing-android-pkg-name" /* MISSING_ANDROID_PACKAGE_NAME */] = 'An Android Package Name must be provided if the Android App is required to be installed.',
    _a$2["auth-domain-config-required" /* MISSING_AUTH_DOMAIN */] = 'Be sure to include authDomain when calling firebase.initializeApp(), ' +
        'by following the instructions in the Firebase console.',
    _a$2["missing-app-credential" /* MISSING_APP_CREDENTIAL */] = 'The phone verification request is missing an application verifier ' +
        'assertion. A reCAPTCHA response token needs to be provided.',
    _a$2["missing-verification-code" /* MISSING_CODE */] = 'The phone auth credential was created with an empty SMS verification code.',
    _a$2["missing-continue-uri" /* MISSING_CONTINUE_URI */] = 'A continue URL must be provided in the request.',
    _a$2["missing-iframe-start" /* MISSING_IFRAME_START */] = 'An internal AuthError has occurred.',
    _a$2["missing-ios-bundle-id" /* MISSING_IOS_BUNDLE_ID */] = 'An iOS Bundle ID must be provided if an App Store ID is provided.',
    _a$2["missing-or-invalid-nonce" /* MISSING_OR_INVALID_NONCE */] = 'The request does not contain a valid nonce. This can occur if the ' +
        'SHA-256 hash of the provided raw nonce does not match the hashed nonce ' +
        'in the ID token payload.',
    _a$2["missing-multi-factor-info" /* MISSING_MFA_INFO */] = 'No second factor identifier is provided.',
    _a$2["missing-multi-factor-session" /* MISSING_MFA_SESSION */] = 'The request is missing proof of first factor successful sign-in.',
    _a$2["missing-phone-number" /* MISSING_PHONE_NUMBER */] = 'To send verification codes, provide a phone number for the recipient.',
    _a$2["missing-verification-id" /* MISSING_SESSION_INFO */] = 'The phone auth credential was created with an empty verification ID.',
    _a$2["app-deleted" /* MODULE_DESTROYED */] = 'This instance of FirebaseApp has been deleted.',
    _a$2["multi-factor-info-not-found" /* MFA_INFO_NOT_FOUND */] = 'The user does not have a second factor matching the identifier provided.',
    _a$2["multi-factor-auth-required" /* MFA_REQUIRED */] = 'Proof of ownership of a second factor is required to complete sign-in.',
    _a$2["account-exists-with-different-credential" /* NEED_CONFIRMATION */] = 'An account already exists with the same email address but different ' +
        'sign-in credentials. Sign in using a provider associated with this ' +
        'email address.',
    _a$2["network-request-failed" /* NETWORK_REQUEST_FAILED */] = 'A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.',
    _a$2["no-auth-event" /* NO_AUTH_EVENT */] = 'An internal AuthError has occurred.',
    _a$2["no-such-provider" /* NO_SUCH_PROVIDER */] = 'User was not linked to an account with the given provider.',
    _a$2["null-user" /* NULL_USER */] = 'A null user object was provided as the argument for an operation which ' +
        'requires a non-null user object.',
    _a$2["operation-not-allowed" /* OPERATION_NOT_ALLOWED */] = 'The given sign-in provider is disabled for this Firebase project. ' +
        'Enable it in the Firebase console, under the sign-in method tab of the ' +
        'Auth section.',
    _a$2["operation-not-supported-in-this-environment" /* OPERATION_NOT_SUPPORTED */] = 'This operation is not supported in the environment this application is ' +
        'running on. "location.protocol" must be http, https or chrome-extension' +
        ' and web storage must be enabled.',
    _a$2["popup-blocked" /* POPUP_BLOCKED */] = 'Unable to establish a connection with the popup. It may have been blocked by the browser.',
    _a$2["popup-closed-by-user" /* POPUP_CLOSED_BY_USER */] = 'The popup has been closed by the user before finalizing the operation.',
    _a$2["provider-already-linked" /* PROVIDER_ALREADY_LINKED */] = 'User can only be linked to one identity for the given provider.',
    _a$2["quota-exceeded" /* QUOTA_EXCEEDED */] = "The project's quota for this operation has been exceeded.",
    _a$2["redirect-cancelled-by-user" /* REDIRECT_CANCELLED_BY_USER */] = 'The redirect operation has been cancelled by the user before finalizing.',
    _a$2["redirect-operation-pending" /* REDIRECT_OPERATION_PENDING */] = 'A redirect sign-in operation is already pending.',
    _a$2["rejected-credential" /* REJECTED_CREDENTIAL */] = 'The request contains malformed or mismatching credentials.',
    _a$2["second-factor-already-in-use" /* SECOND_FACTOR_ALREADY_ENROLLED */] = 'The second factor is already enrolled on this account.',
    _a$2["maximum-second-factor-count-exceeded" /* SECOND_FACTOR_LIMIT_EXCEEDED */] = 'The maximum allowed number of second factors on a user has been exceeded.',
    _a$2["tenant-id-mismatch" /* TENANT_ID_MISMATCH */] = "The provided tenant ID does not match the Auth instance's tenant ID",
    _a$2["timeout" /* TIMEOUT */] = 'The operation has timed out.',
    _a$2["user-token-expired" /* TOKEN_EXPIRED */] = "The user's credential is no longer valid. The user must sign in again.",
    _a$2["too-many-requests" /* TOO_MANY_ATTEMPTS_TRY_LATER */] = 'We have blocked all requests from this device due to unusual activity. ' +
        'Try again later.',
    _a$2["unauthorized-continue-uri" /* UNAUTHORIZED_DOMAIN */] = 'The domain of the continue URL is not whitelisted.  Please whitelist ' +
        'the domain in the Firebase console.',
    _a$2["unsupported-first-factor" /* UNSUPPORTED_FIRST_FACTOR */] = 'Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.',
    _a$2["unsupported-persistence-type" /* UNSUPPORTED_PERSISTENCE */] = 'The current environment does not support the specified persistence type.',
    _a$2["unsupported-tenant-operation" /* UNSUPPORTED_TENANT_OPERATION */] = 'This operation is not supported in a multi-tenant context.',
    _a$2["unverified-email" /* UNVERIFIED_EMAIL */] = 'The operation requires a verified email.',
    _a$2["user-cancelled" /* USER_CANCELLED */] = 'The user did not grant your application the permissions it requested.',
    _a$2["user-not-found" /* USER_DELETED */] = 'There is no user record corresponding to this identifier. The user may ' +
        'have been deleted.',
    _a$2["user-disabled" /* USER_DISABLED */] = 'The user account has been disabled by an administrator.',
    _a$2["user-mismatch" /* USER_MISMATCH */] = 'The supplied credentials do not correspond to the previously signed in user.',
    _a$2["user-signed-out" /* USER_SIGNED_OUT */] = '',
    _a$2["weak-password" /* WEAK_PASSWORD */] = 'The password must be 6 characters long or more.',
    _a$2["web-storage-unsupported" /* WEB_STORAGE_UNSUPPORTED */] = 'This browser is not supported or 3rd party cookies and data may be disabled.',
    _a$2);
var AUTH_ERROR_FACTORY = new ErrorFactory('auth', 'Firebase', ERRORS$1);

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logClient = new Logger('@firebase/auth-exp');
function _logError(msg) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (logClient.logLevel <= LogLevel.ERROR) {
        logClient.error.apply(logClient, __spreadArrays(["Auth (" + SDK_VERSION + "): " + msg], args));
    }
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Unconditionally fails, throwing a developer facing INTERNAL_ERROR
 *
 * @param appName App name for tagging the error
 * @throws FirebaseError
 */
function fail(code) {
    var data = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        data[_i - 1] = arguments[_i];
    }
    throw AUTH_ERROR_FACTORY.create.apply(AUTH_ERROR_FACTORY, __spreadArrays([code], data));
}
/**
 * Verifies the given condition and fails if false, throwing a developer facing error
 *
 * @param assertion
 * @param appName
 */
function assert(assertion, code) {
    var data = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        data[_i - 2] = arguments[_i];
    }
    if (!assertion) {
        fail.apply(void 0, __spreadArrays([code], data));
    }
}
/**
 * Unconditionally fails, throwing an internal error with the given message.
 *
 * @param failure type of failure encountered
 * @throws Error
 */
function debugFail(failure) {
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
    var message = "INTERNAL ASSERTION FAILED: " + failure;
    _logError(message);
    // NOTE: We don't use FirebaseError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
    throw new Error(message);
}
/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * @param assertion
 * @param message
 */
function debugAssert(assertion, message) {
    if (!assertion) {
        debugFail(message);
    }
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var instanceCache = new Map();
function _getInstance(cls) {
    debugAssert(cls instanceof Function, 'Expected a class definition');
    var instance = instanceCache.get(cls);
    if (instance) {
        debugAssert(instance instanceof cls, 'Instance stored in cache mismatched with class');
        return instance;
    }
    instance = new cls();
    instanceCache.set(cls, instance);
    return instance;
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PersistenceType;
(function (PersistenceType) {
    PersistenceType["SESSION"] = "SESSION";
    PersistenceType["LOCAL"] = "LOCAL";
    PersistenceType["NONE"] = "NONE";
})(PersistenceType || (PersistenceType = {}));
var STORAGE_AVAILABLE_KEY = '__sak';

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var InMemoryPersistence = /** @class */ (function () {
    function InMemoryPersistence() {
        this.type = PersistenceType.NONE;
        this.storage = {};
    }
    InMemoryPersistence.prototype.isAvailable = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, true];
            });
        });
    };
    InMemoryPersistence.prototype.set = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.storage[key] = value;
                return [2 /*return*/];
            });
        });
    };
    InMemoryPersistence.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var value;
            return __generator(this, function (_a) {
                value = this.storage[key];
                return [2 /*return*/, value === undefined ? null : value];
            });
        });
    };
    InMemoryPersistence.prototype.remove = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                delete this.storage[key];
                return [2 /*return*/];
            });
        });
    };
    InMemoryPersistence.type = 'NONE';
    return InMemoryPersistence;
}());
var inMemoryPersistence = InMemoryPersistence;

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function _getCurrentUrl() {
    var _a;
    return (typeof self !== 'undefined' && ((_a = self.location) === null || _a === void 0 ? void 0 : _a.href)) || '';
}
function _isHttpOrHttps() {
    return _getCurrentScheme() === 'http:' || _getCurrentScheme() === 'https:';
}
function _getCurrentScheme() {
    var _a;
    return (typeof self !== 'undefined' && ((_a = self.location) === null || _a === void 0 ? void 0 : _a.protocol)) || null;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Determine whether the browser is working online
 */
function _isOnline() {
    if (typeof navigator !== 'undefined' &&
        navigator &&
        'onLine' in navigator &&
        typeof navigator.onLine === 'boolean' &&
        // Apply only for traditional web apps and Chrome extensions.
        // This is especially true for Cordova apps which have unreliable
        // navigator.onLine behavior unless cordova-plugin-network-information is
        // installed which overwrites the native navigator.onLine value and
        // defines navigator.connection.
        (_isHttpOrHttps() || isBrowserExtension() || 'connection' in navigator)) {
        return navigator.onLine;
    }
    // If we can't determine the state, assume it is online.
    return true;
}
function _getUserLanguage() {
    if (typeof navigator === 'undefined') {
        return null;
    }
    var navigatorLanguage = navigator;
    return (
    // Most reliable, but only supported in Chrome/Firefox.
    (navigatorLanguage.languages && navigatorLanguage.languages[0]) ||
        // Supported in most browsers, but returns the language of the browser
        // UI, not the language set in browser settings.
        navigatorLanguage.language ||
        // Couldn't determine language.
        null);
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _OFFLINE_DELAY_MS = 5000;
/**
 * A structure to help pick between a range of long and short delay durations
 * depending on the current environment. In general, the long delay is used for
 * mobile environments whereas short delays are used for desktop environments.
 */
var Delay = /** @class */ (function () {
    function Delay(shortDelay, longDelay) {
        this.shortDelay = shortDelay;
        this.longDelay = longDelay;
        // Internal error when improperly initialized.
        debugAssert(longDelay > shortDelay, 'Short delay should be less than long delay!');
        this.isMobile = isMobileCordova() || isReactNative();
    }
    Delay.prototype.get = function () {
        if (!_isOnline()) {
            // Pick the shorter timeout.
            return Math.min(_OFFLINE_DELAY_MS, this.shortDelay);
        }
        // If running in a mobile environment, return the long delay, otherwise
        // return the short delay.
        // This could be improved in the future to dynamically change based on other
        // variables instead of just reading the current environment.
        return this.isMobile ? this.longDelay : this.shortDelay;
    };
    return Delay;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a$1$2;
/**
 * Errors that can be returned by the backend
 */
var ServerError;
(function (ServerError) {
    ServerError["ADMIN_ONLY_OPERATION"] = "ADMIN_ONLY_OPERATION";
    ServerError["CAPTCHA_CHECK_FAILED"] = "CAPTCHA_CHECK_FAILED";
    ServerError["CORS_UNSUPPORTED"] = "CORS_UNSUPPORTED";
    ServerError["CREDENTIAL_MISMATCH"] = "CREDENTIAL_MISMATCH";
    ServerError["CREDENTIAL_TOO_OLD_LOGIN_AGAIN"] = "CREDENTIAL_TOO_OLD_LOGIN_AGAIN";
    ServerError["DYNAMIC_LINK_NOT_ACTIVATED"] = "DYNAMIC_LINK_NOT_ACTIVATED";
    ServerError["EMAIL_CHANGE_NEEDS_VERIFICATION"] = "EMAIL_CHANGE_NEEDS_VERIFICATION";
    ServerError["EMAIL_EXISTS"] = "EMAIL_EXISTS";
    ServerError["EMAIL_NOT_FOUND"] = "EMAIL_NOT_FOUND";
    ServerError["EXPIRED_OOB_CODE"] = "EXPIRED_OOB_CODE";
    ServerError["FEDERATED_USER_ID_ALREADY_LINKED"] = "FEDERATED_USER_ID_ALREADY_LINKED";
    ServerError["INVALID_APP_CREDENTIAL"] = "INVALID_APP_CREDENTIAL";
    ServerError["INVALID_APP_ID"] = "INVALID_APP_ID";
    ServerError["INVALID_CERT_HASH"] = "INVALID_CERT_HASH";
    ServerError["INVALID_CODE"] = "INVALID_CODE";
    ServerError["INVALID_CONTINUE_URI"] = "INVALID_CONTINUE_URI";
    ServerError["INVALID_CUSTOM_TOKEN"] = "INVALID_CUSTOM_TOKEN";
    ServerError["INVALID_DYNAMIC_LINK_DOMAIN"] = "INVALID_DYNAMIC_LINK_DOMAIN";
    ServerError["INVALID_EMAIL"] = "INVALID_EMAIL";
    ServerError["INVALID_ID_TOKEN"] = "INVALID_ID_TOKEN";
    ServerError["INVALID_IDP_RESPONSE"] = "INVALID_IDP_RESPONSE";
    ServerError["INVALID_IDENTIFIER"] = "INVALID_IDENTIFIER";
    ServerError["INVALID_MESSAGE_PAYLOAD"] = "INVALID_MESSAGE_PAYLOAD";
    ServerError["INVALID_MFA_PENDING_CREDENTIAL"] = "INVALID_MFA_PENDING_CREDENTIAL";
    ServerError["INVALID_OAUTH_CLIENT_ID"] = "INVALID_OAUTH_CLIENT_ID";
    ServerError["INVALID_OOB_CODE"] = "INVALID_OOB_CODE";
    ServerError["INVALID_PASSWORD"] = "INVALID_PASSWORD";
    ServerError["INVALID_PENDING_TOKEN"] = "INVALID_PENDING_TOKEN";
    ServerError["INVALID_PHONE_NUMBER"] = "INVALID_PHONE_NUMBER";
    ServerError["INVALID_PROVIDER_ID"] = "INVALID_PROVIDER_ID";
    ServerError["INVALID_RECIPIENT_EMAIL"] = "INVALID_RECIPIENT_EMAIL";
    ServerError["INVALID_SENDER"] = "INVALID_SENDER";
    ServerError["INVALID_SESSION_INFO"] = "INVALID_SESSION_INFO";
    ServerError["INVALID_TEMPORARY_PROOF"] = "INVALID_TEMPORARY_PROOF";
    ServerError["INVALID_TENANT_ID"] = "INVALID_TENANT_ID";
    ServerError["MFA_ENROLLMENT_NOT_FOUND"] = "MFA_ENROLLMENT_NOT_FOUND";
    ServerError["MISSING_ANDROID_PACKAGE_NAME"] = "MISSING_ANDROID_PACKAGE_NAME";
    ServerError["MISSING_APP_CREDENTIAL"] = "MISSING_APP_CREDENTIAL";
    ServerError["MISSING_CODE"] = "MISSING_CODE";
    ServerError["MISSING_CONTINUE_URI"] = "MISSING_CONTINUE_URI";
    ServerError["MISSING_CUSTOM_TOKEN"] = "MISSING_CUSTOM_TOKEN";
    ServerError["MISSING_IOS_BUNDLE_ID"] = "MISSING_IOS_BUNDLE_ID";
    ServerError["MISSING_MFA_ENROLLMENT_ID"] = "MISSING_MFA_ENROLLMENT_ID";
    ServerError["MISSING_MFA_PENDING_CREDENTIAL"] = "MISSING_MFA_PENDING_CREDENTIAL";
    ServerError["MISSING_OOB_CODE"] = "MISSING_OOB_CODE";
    ServerError["MISSING_OR_INVALID_NONCE"] = "MISSING_OR_INVALID_NONCE";
    ServerError["MISSING_PASSWORD"] = "MISSING_PASSWORD";
    ServerError["MISSING_REQ_TYPE"] = "MISSING_REQ_TYPE";
    ServerError["MISSING_PHONE_NUMBER"] = "MISSING_PHONE_NUMBER";
    ServerError["MISSING_SESSION_INFO"] = "MISSING_SESSION_INFO";
    ServerError["OPERATION_NOT_ALLOWED"] = "OPERATION_NOT_ALLOWED";
    ServerError["PASSWORD_LOGIN_DISABLED"] = "PASSWORD_LOGIN_DISABLED";
    ServerError["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    ServerError["RESET_PASSWORD_EXCEED_LIMIT"] = "RESET_PASSWORD_EXCEED_LIMIT";
    ServerError["REJECTED_CREDENTIAL"] = "REJECTED_CREDENTIAL";
    ServerError["SECOND_FACTOR_EXISTS"] = "SECOND_FACTOR_EXISTS";
    ServerError["SECOND_FACTOR_LIMIT_EXCEEDED"] = "SECOND_FACTOR_LIMIT_EXCEEDED";
    ServerError["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    ServerError["TENANT_ID_MISMATCH"] = "TENANT_ID_MISMATCH";
    ServerError["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ServerError["TOO_MANY_ATTEMPTS_TRY_LATER"] = "TOO_MANY_ATTEMPTS_TRY_LATER";
    ServerError["UNSUPPORTED_FIRST_FACTOR"] = "UNSUPPORTED_FIRST_FACTOR";
    ServerError["UNSUPPORTED_TENANT_OPERATION"] = "UNSUPPORTED_TENANT_OPERATION";
    ServerError["UNAUTHORIZED_DOMAIN"] = "UNAUTHORIZED_DOMAIN";
    ServerError["UNVERIFIED_EMAIL"] = "UNVERIFIED_EMAIL";
    ServerError["USER_CANCELLED"] = "USER_CANCELLED";
    ServerError["USER_DISABLED"] = "USER_DISABLED";
    ServerError["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ServerError["WEAK_PASSWORD"] = "WEAK_PASSWORD";
})(ServerError || (ServerError = {}));
/**
 * Map from errors returned by the server to errors to developer visible errors
 */
var SERVER_ERROR_MAP = (_a$1$2 = {},
    // Custom token errors.
    _a$1$2[ServerError.INVALID_CUSTOM_TOKEN] = "invalid-custom-token" /* INVALID_CUSTOM_TOKEN */,
    _a$1$2[ServerError.CREDENTIAL_MISMATCH] = "custom-token-mismatch" /* CREDENTIAL_MISMATCH */,
    // This can only happen if the SDK sends a bad request.
    _a$1$2[ServerError.MISSING_CUSTOM_TOKEN] = "internal-error" /* INTERNAL_ERROR */,
    // Create Auth URI errors.
    _a$1$2[ServerError.INVALID_IDENTIFIER] = "invalid-email" /* INVALID_EMAIL */,
    // This can only happen if the SDK sends a bad request.
    _a$1$2[ServerError.MISSING_CONTINUE_URI] = "internal-error" /* INTERNAL_ERROR */,
    // Sign in with email and password errors (some apply to sign up too).
    _a$1$2[ServerError.INVALID_EMAIL] = "invalid-email" /* INVALID_EMAIL */,
    _a$1$2[ServerError.INVALID_PASSWORD] = "wrong-password" /* INVALID_PASSWORD */,
    _a$1$2[ServerError.USER_DISABLED] = "user-disabled" /* USER_DISABLED */,
    // This can only happen if the SDK sends a bad request.
    _a$1$2[ServerError.MISSING_PASSWORD] = "internal-error" /* INTERNAL_ERROR */,
    // Sign up with email and password errors.
    _a$1$2[ServerError.EMAIL_EXISTS] = "email-already-in-use" /* EMAIL_EXISTS */,
    _a$1$2[ServerError.PASSWORD_LOGIN_DISABLED] = "operation-not-allowed" /* OPERATION_NOT_ALLOWED */,
    // Verify assertion for sign in with credential errors:
    _a$1$2[ServerError.INVALID_IDP_RESPONSE] = "invalid-credential" /* INVALID_IDP_RESPONSE */,
    _a$1$2[ServerError.INVALID_PENDING_TOKEN] = "invalid-credential" /* INVALID_IDP_RESPONSE */,
    _a$1$2[ServerError.FEDERATED_USER_ID_ALREADY_LINKED] = "credential-already-in-use" /* CREDENTIAL_ALREADY_IN_USE */,
    _a$1$2[ServerError.MISSING_OR_INVALID_NONCE] = "missing-or-invalid-nonce" /* MISSING_OR_INVALID_NONCE */,
    // Email template errors while sending emails:
    _a$1$2[ServerError.INVALID_MESSAGE_PAYLOAD] = "invalid-message-payload" /* INVALID_MESSAGE_PAYLOAD */,
    _a$1$2[ServerError.INVALID_RECIPIENT_EMAIL] = "invalid-recipient-email" /* INVALID_RECIPIENT_EMAIL */,
    _a$1$2[ServerError.INVALID_SENDER] = "invalid-sender" /* INVALID_SENDER */,
    // This can only happen if the SDK sends a bad request.
    _a$1$2[ServerError.MISSING_REQ_TYPE] = "internal-error" /* INTERNAL_ERROR */,
    // Send Password reset email errors:
    _a$1$2[ServerError.EMAIL_NOT_FOUND] = "user-not-found" /* USER_DELETED */,
    _a$1$2[ServerError.RESET_PASSWORD_EXCEED_LIMIT] = "too-many-requests" /* TOO_MANY_ATTEMPTS_TRY_LATER */,
    // Reset password errors:
    _a$1$2[ServerError.EXPIRED_OOB_CODE] = "expired-action-code" /* EXPIRED_OOB_CODE */,
    _a$1$2[ServerError.INVALID_OOB_CODE] = "invalid-action-code" /* INVALID_OOB_CODE */,
    // This can only happen if the SDK sends a bad request.
    _a$1$2[ServerError.MISSING_OOB_CODE] = "internal-error" /* INTERNAL_ERROR */,
    // Get Auth URI errors:
    _a$1$2[ServerError.INVALID_PROVIDER_ID] = "invalid-provider-id" /* INVALID_PROVIDER_ID */,
    // Operations that require ID token in request:
    _a$1$2[ServerError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN] = "requires-recent-login" /* CREDENTIAL_TOO_OLD_LOGIN_AGAIN */,
    _a$1$2[ServerError.INVALID_ID_TOKEN] = "invalid-user-token" /* INVALID_AUTH */,
    _a$1$2[ServerError.TOKEN_EXPIRED] = "user-token-expired" /* TOKEN_EXPIRED */,
    _a$1$2[ServerError.USER_NOT_FOUND] = "user-token-expired" /* TOKEN_EXPIRED */,
    // CORS issues.
    _a$1$2[ServerError.CORS_UNSUPPORTED] = "cors-unsupported" /* CORS_UNSUPPORTED */,
    // Dynamic link not activated.
    _a$1$2[ServerError.DYNAMIC_LINK_NOT_ACTIVATED] = "dynamic-link-not-activated" /* DYNAMIC_LINK_NOT_ACTIVATED */,
    // iosBundleId or androidPackageName not valid error.
    _a$1$2[ServerError.INVALID_APP_ID] = "invalid-app-id" /* INVALID_APP_ID */,
    // Other errors.
    _a$1$2[ServerError.TOO_MANY_ATTEMPTS_TRY_LATER] = "too-many-requests" /* TOO_MANY_ATTEMPTS_TRY_LATER */,
    _a$1$2[ServerError.WEAK_PASSWORD] = "weak-password" /* WEAK_PASSWORD */,
    _a$1$2[ServerError.OPERATION_NOT_ALLOWED] = "operation-not-allowed" /* OPERATION_NOT_ALLOWED */,
    _a$1$2[ServerError.USER_CANCELLED] = "user-cancelled" /* USER_CANCELLED */,
    // Phone Auth related errors.
    _a$1$2[ServerError.CAPTCHA_CHECK_FAILED] = "captcha-check-failed" /* CAPTCHA_CHECK_FAILED */,
    _a$1$2[ServerError.INVALID_APP_CREDENTIAL] = "invalid-app-credential" /* INVALID_APP_CREDENTIAL */,
    _a$1$2[ServerError.INVALID_CODE] = "invalid-verification-code" /* INVALID_CODE */,
    _a$1$2[ServerError.INVALID_PHONE_NUMBER] = "invalid-phone-number" /* INVALID_PHONE_NUMBER */,
    _a$1$2[ServerError.INVALID_SESSION_INFO] = "invalid-verification-id" /* INVALID_SESSION_INFO */,
    _a$1$2[ServerError.INVALID_TEMPORARY_PROOF] = "invalid-credential" /* INVALID_IDP_RESPONSE */,
    _a$1$2[ServerError.MISSING_APP_CREDENTIAL] = "missing-app-credential" /* MISSING_APP_CREDENTIAL */,
    _a$1$2[ServerError.MISSING_CODE] = "missing-verification-code" /* MISSING_CODE */,
    _a$1$2[ServerError.MISSING_PHONE_NUMBER] = "missing-phone-number" /* MISSING_PHONE_NUMBER */,
    _a$1$2[ServerError.MISSING_SESSION_INFO] = "missing-verification-id" /* MISSING_SESSION_INFO */,
    _a$1$2[ServerError.QUOTA_EXCEEDED] = "quota-exceeded" /* QUOTA_EXCEEDED */,
    _a$1$2[ServerError.SESSION_EXPIRED] = "code-expired" /* CODE_EXPIRED */,
    _a$1$2[ServerError.REJECTED_CREDENTIAL] = "rejected-credential" /* REJECTED_CREDENTIAL */,
    // Other action code errors when additional settings passed.
    _a$1$2[ServerError.INVALID_CONTINUE_URI] = "invalid-continue-uri" /* INVALID_CONTINUE_URI */,
    // MISSING_CONTINUE_URI is getting mapped to INTERNAL_ERROR above.
    // This is OK as this error will be caught by client side validation.
    _a$1$2[ServerError.MISSING_ANDROID_PACKAGE_NAME] = "missing-android-pkg-name" /* MISSING_ANDROID_PACKAGE_NAME */,
    _a$1$2[ServerError.MISSING_IOS_BUNDLE_ID] = "missing-ios-bundle-id" /* MISSING_IOS_BUNDLE_ID */,
    _a$1$2[ServerError.UNAUTHORIZED_DOMAIN] = "unauthorized-continue-uri" /* UNAUTHORIZED_DOMAIN */,
    _a$1$2[ServerError.INVALID_DYNAMIC_LINK_DOMAIN] = "invalid-dynamic-link-domain" /* INVALID_DYNAMIC_LINK_DOMAIN */,
    // getProjectConfig errors when clientId is passed.
    _a$1$2[ServerError.INVALID_OAUTH_CLIENT_ID] = "invalid-oauth-client-id" /* INVALID_OAUTH_CLIENT_ID */,
    // getProjectConfig errors when sha1Cert is passed.
    _a$1$2[ServerError.INVALID_CERT_HASH] = "invalid-cert-hash" /* INVALID_CERT_HASH */,
    // Multi-tenant related errors.
    _a$1$2[ServerError.UNSUPPORTED_TENANT_OPERATION] = "unsupported-tenant-operation" /* UNSUPPORTED_TENANT_OPERATION */,
    _a$1$2[ServerError.INVALID_TENANT_ID] = "invalid-tenant-id" /* INVALID_TENANT_ID */,
    _a$1$2[ServerError.TENANT_ID_MISMATCH] = "tenant-id-mismatch" /* TENANT_ID_MISMATCH */,
    // User actions (sign-up or deletion) disabled errors.
    _a$1$2[ServerError.ADMIN_ONLY_OPERATION] = "admin-restricted-operation" /* ADMIN_ONLY_OPERATION */,
    // Multi factor related errors.
    _a$1$2[ServerError.EMAIL_CHANGE_NEEDS_VERIFICATION] = "email-change-needs-verification" /* EMAIL_CHANGE_NEEDS_VERIFICATION */,
    _a$1$2[ServerError.INVALID_MFA_PENDING_CREDENTIAL] = "invalid-multi-factor-session" /* INVALID_MFA_SESSION */,
    _a$1$2[ServerError.MFA_ENROLLMENT_NOT_FOUND] = "multi-factor-info-not-found" /* MFA_INFO_NOT_FOUND */,
    _a$1$2[ServerError.MISSING_MFA_ENROLLMENT_ID] = "missing-multi-factor-info" /* MISSING_MFA_INFO */,
    _a$1$2[ServerError.MISSING_MFA_PENDING_CREDENTIAL] = "missing-multi-factor-session" /* MISSING_MFA_SESSION */,
    _a$1$2[ServerError.SECOND_FACTOR_EXISTS] = "second-factor-already-in-use" /* SECOND_FACTOR_ALREADY_ENROLLED */,
    _a$1$2[ServerError.SECOND_FACTOR_LIMIT_EXCEEDED] = "maximum-second-factor-count-exceeded" /* SECOND_FACTOR_LIMIT_EXCEEDED */,
    _a$1$2[ServerError.UNSUPPORTED_FIRST_FACTOR] = "unsupported-first-factor" /* UNSUPPORTED_FIRST_FACTOR */,
    _a$1$2[ServerError.UNVERIFIED_EMAIL] = "unverified-email" /* UNVERIFIED_EMAIL */,
    _a$1$2);

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var FetchProvider = /** @class */ (function () {
    function FetchProvider() {
    }
    FetchProvider.initialize = function (fetchImpl, headersImpl, responseImpl) {
        this.fetchImpl = fetchImpl;
        if (headersImpl) {
            this.headersImpl = headersImpl;
        }
        if (responseImpl) {
            this.responseImpl = responseImpl;
        }
    };
    FetchProvider.fetch = function () {
        if (this.fetchImpl) {
            return this.fetchImpl;
        }
        if (typeof self !== 'undefined' && 'fetch' in self) {
            return self.fetch;
        }
        debugFail('Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
    };
    FetchProvider.headers = function () {
        if (this.headersImpl) {
            return this.headersImpl;
        }
        if (typeof self !== 'undefined' && 'Headers' in self) {
            return self.Headers;
        }
        debugFail('Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
    };
    FetchProvider.response = function () {
        if (this.responseImpl) {
            return this.responseImpl;
        }
        if (typeof self !== 'undefined' && 'Response' in self) {
            return self.Response;
        }
        debugFail('Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill');
    };
    return FetchProvider;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["POST"] = "POST";
    HttpMethod["GET"] = "GET";
})(HttpMethod || (HttpMethod = {}));
var HttpHeader;
(function (HttpHeader) {
    HttpHeader["CONTENT_TYPE"] = "Content-Type";
    HttpHeader["X_FIREBASE_LOCALE"] = "X-Firebase-Locale";
    HttpHeader["X_CLIENT_VERSION"] = "X-Client-Version";
})(HttpHeader || (HttpHeader = {}));
var Endpoint;
(function (Endpoint) {
    Endpoint["CREATE_AUTH_URI"] = "/v1/accounts:createAuthUri";
    Endpoint["DELETE_ACCOUNT"] = "/v1/accounts:delete";
    Endpoint["RESET_PASSWORD"] = "/v1/accounts:resetPassword";
    Endpoint["SIGN_UP"] = "/v1/accounts:signUp";
    Endpoint["SIGN_IN_WITH_CUSTOM_TOKEN"] = "/v1/accounts:signInWithCustomToken";
    Endpoint["SIGN_IN_WITH_EMAIL_LINK"] = "/v1/accounts:signInWithEmailLink";
    Endpoint["SIGN_IN_WITH_IDP"] = "/v1/accounts:signInWithIdp";
    Endpoint["SIGN_IN_WITH_PASSWORD"] = "/v1/accounts:signInWithPassword";
    Endpoint["SIGN_IN_WITH_PHONE_NUMBER"] = "/v1/accounts:signInWithPhoneNumber";
    Endpoint["SEND_VERIFICATION_CODE"] = "/v1/accounts:sendVerificationCode";
    Endpoint["SEND_OOB_CODE"] = "/v1/accounts:sendOobCode";
    Endpoint["SET_ACCOUNT_INFO"] = "/v1/accounts:update";
    Endpoint["GET_ACCOUNT_INFO"] = "/v1/accounts:lookup";
    Endpoint["GET_RECAPTCHA_PARAM"] = "/v1/recaptchaParams";
    Endpoint["START_PHONE_MFA_ENROLLMENT"] = "/v2/accounts/mfaEnrollment:start";
    Endpoint["FINALIZE_PHONE_MFA_ENROLLMENT"] = "/v2/accounts/mfaEnrollment:finalize";
    Endpoint["START_PHONE_MFA_SIGN_IN"] = "/v2/accounts/mfaSignIn:start";
    Endpoint["FINALIZE_PHONE_MFA_SIGN_IN"] = "/v2/accounts/mfaSignIn:finalize";
    Endpoint["WITHDRAW_MFA"] = "/v2/accounts/mfaEnrollment:withdraw";
})(Endpoint || (Endpoint = {}));
var DEFAULT_API_TIMEOUT_MS = new Delay(30000, 60000);
function _performApiRequest(auth, method, path, request, customErrorMap) {
    if (customErrorMap === void 0) { customErrorMap = {}; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performFetchWithErrorHandling(auth, customErrorMap, function () {
                    var body = {};
                    var params = {};
                    if (request) {
                        if (method === HttpMethod.GET) {
                            params = request;
                        }
                        else {
                            body = {
                                body: JSON.stringify(request)
                            };
                        }
                    }
                    var query = querystring(__assign({ key: auth.config.apiKey }, params)).slice(1);
                    var headers = new (FetchProvider.headers())();
                    headers.set(HttpHeader.CONTENT_TYPE, 'application/json');
                    headers.set(HttpHeader.X_CLIENT_VERSION, auth.config.sdkClientVersion);
                    if (auth.languageCode) {
                        headers.set(HttpHeader.X_FIREBASE_LOCALE, auth.languageCode);
                    }
                    return FetchProvider.fetch()(auth.config.apiScheme + "://" + auth.config.apiHost + path + "?" + query, __assign({ method: method,
                        headers: headers, referrerPolicy: 'no-referrer' }, body));
                })];
        });
    });
}
function _performFetchWithErrorHandling(auth, customErrorMap, fetchFn) {
    return __awaiter(this, void 0, void 0, function () {
        var errorMap, response, json, serverErrorCode, authError, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    errorMap = __assign(__assign({}, SERVER_ERROR_MAP), customErrorMap);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.race([
                            fetchFn(),
                            makeNetworkTimeout(auth.name)
                        ])];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    json = _a.sent();
                    if ('needConfirmation' in json) {
                        throw makeTaggedError(auth, "account-exists-with-different-credential" /* NEED_CONFIRMATION */, json);
                    }
                    if (response.ok) {
                        return [2 /*return*/, json];
                    }
                    else {
                        serverErrorCode = json.error.message.split(' : ')[0];
                        if (serverErrorCode === ServerError.FEDERATED_USER_ID_ALREADY_LINKED) {
                            throw makeTaggedError(auth, "credential-already-in-use" /* CREDENTIAL_ALREADY_IN_USE */, json);
                        }
                        else if (serverErrorCode === ServerError.EMAIL_EXISTS) {
                            throw makeTaggedError(auth, "email-already-in-use" /* EMAIL_EXISTS */, json);
                        }
                        authError = errorMap[serverErrorCode];
                        if (authError) {
                            fail(authError, { appName: auth.name });
                        }
                        else {
                            // TODO probably should handle improperly formatted errors as well
                            // If you see this, add an entry to SERVER_ERROR_MAP for the corresponding error
                            console.error("Unexpected API error: " + json.error.message);
                            fail("internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
                        }
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    if (e_1 instanceof FirebaseError) {
                        throw e_1;
                    }
                    fail("network-request-failed" /* NETWORK_REQUEST_FAILED */, { appName: auth.name });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function _performSignInRequest(auth, method, path, request, customErrorMap) {
    if (customErrorMap === void 0) { customErrorMap = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var serverResponse;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _performApiRequest(auth, method, path, request, customErrorMap)];
                case 1:
                    serverResponse = _a.sent();
                    if ('mfaPendingCredential' in serverResponse) {
                        throw AUTH_ERROR_FACTORY.create("multi-factor-auth-required" /* MFA_REQUIRED */, {
                            appName: auth.name,
                            serverResponse: serverResponse
                        });
                    }
                    return [2 /*return*/, serverResponse];
            }
        });
    });
}
function makeNetworkTimeout(appName) {
    return new Promise(function (_, reject) {
        return setTimeout(function () {
            return reject(AUTH_ERROR_FACTORY.create("timeout" /* TIMEOUT */, {
                appName: appName
            }));
        }, DEFAULT_API_TIMEOUT_MS.get());
    });
}
function makeTaggedError(_a, code, response) {
    var name = _a.name;
    var errorParams = {
        appName: name
    };
    if (response.email) {
        errorParams.email = response.email;
    }
    if (response.phoneNumber) {
        errorParams.phoneNumber = response.phoneNumber;
    }
    var error = AUTH_ERROR_FACTORY.create(code, errorParams);
    error._tokenResponse = response;
    return error;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function deleteAccount(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.DELETE_ACCOUNT, request)];
        });
    });
}
function deleteLinkedAccounts(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request)];
        });
    });
}
function getAccountInfo(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.GET_ACCOUNT_INFO, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function utcTimestampToDateString(utcTimestamp) {
    if (!utcTimestamp) {
        return undefined;
    }
    try {
        // Convert to date object.
        var date = new Date(Number(utcTimestamp));
        // Test date is valid.
        if (!isNaN(date.getTime())) {
            // Convert to UTC date string.
            return date.toUTCString();
        }
    }
    catch (e) {
        // Do nothing. undefined will be returned.
    }
    return undefined;
}
function getIdTokenResult(externUser, forceRefresh) {
    if (forceRefresh === void 0) { forceRefresh = false; }
    return __awaiter(this, void 0, void 0, function () {
        var user, token, claims, firebase, signInProvider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    user = externUser;
                    return [4 /*yield*/, user.getIdToken(forceRefresh)];
                case 1:
                    token = _a.sent();
                    claims = _parseToken(token);
                    assert(claims && claims.exp && claims.auth_time && claims.iat, "internal-error" /* INTERNAL_ERROR */, { appName: user.auth.name });
                    firebase = typeof claims.firebase === 'object' ? claims.firebase : undefined;
                    signInProvider = firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_provider'];
                    return [2 /*return*/, {
                            claims: claims,
                            token: token,
                            authTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.auth_time)),
                            issuedAtTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.iat)),
                            expirationTime: utcTimestampToDateString(secondsStringToMilliseconds(claims.exp)),
                            signInProvider: signInProvider || null,
                            signInSecondFactor: (firebase === null || firebase === void 0 ? void 0 : firebase['sign_in_second_factor']) || null
                        }];
            }
        });
    });
}
function secondsStringToMilliseconds(seconds) {
    return Number(seconds) * 1000;
}
function _parseToken(token) {
    var _a = token.split('.'), algorithm = _a[0], payload = _a[1], signature = _a[2];
    if (algorithm === undefined ||
        payload === undefined ||
        signature === undefined) {
        _logError('JWT malformed, contained fewer than 3 sections');
        return null;
    }
    try {
        var decoded = base64Decode(payload);
        if (!decoded) {
            _logError('Failed to decode base64 JWT payload');
            return null;
        }
        return JSON.parse(decoded);
    }
    catch (e) {
        _logError('Caught error parsing JWT payload as JSON', e);
        return null;
    }
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function _reloadWithoutSaving(user) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var auth, idToken, response, coreAccount, newProviderData, updates;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    auth = user.auth;
                    return [4 /*yield*/, user.getIdToken()];
                case 1:
                    idToken = _b.sent();
                    return [4 /*yield*/, getAccountInfo(auth, { idToken: idToken })];
                case 2:
                    response = _b.sent();
                    assert(response === null || response === void 0 ? void 0 : response.users.length, "internal-error" /* INTERNAL_ERROR */, {
                        appName: auth.name
                    });
                    coreAccount = response.users[0];
                    user._notifyReloadListener(coreAccount);
                    newProviderData = ((_a = coreAccount.providerUserInfo) === null || _a === void 0 ? void 0 : _a.length) ? extractProviderData(coreAccount.providerUserInfo)
                        : [];
                    updates = {
                        uid: coreAccount.localId,
                        displayName: coreAccount.displayName || null,
                        photoURL: coreAccount.photoUrl || null,
                        email: coreAccount.email || null,
                        emailVerified: coreAccount.emailVerified || false,
                        phoneNumber: coreAccount.phoneNumber || null,
                        tenantId: coreAccount.tenantId || null,
                        providerData: mergeProviderData(user.providerData, newProviderData),
                        metadata: new UserMetadata(coreAccount.createdAt, coreAccount.lastLoginAt)
                    };
                    Object.assign(user, updates);
                    return [2 /*return*/];
            }
        });
    });
}
function reload(externUser) {
    return __awaiter(this, void 0, void 0, function () {
        var user;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    user = externUser;
                    return [4 /*yield*/, _reloadWithoutSaving(user)];
                case 1:
                    _a.sent();
                    // Even though the current user hasn't changed, update
                    // current user will trigger a persistence update w/ the
                    // new info.
                    return [4 /*yield*/, user.auth._persistUserIfCurrent(user)];
                case 2:
                    // Even though the current user hasn't changed, update
                    // current user will trigger a persistence update w/ the
                    // new info.
                    _a.sent();
                    user.auth._notifyListenersIfCurrent(user);
                    return [2 /*return*/];
            }
        });
    });
}
function mergeProviderData(original, newData) {
    var deduped = original.filter(function (o) { return !newData.some(function (n) { return n.providerId === o.providerId; }); });
    return __spreadArrays(deduped, newData);
}
function extractProviderData(providers) {
    return providers.map(function (_a) {
        var providerId = _a.providerId, provider = __rest(_a, ["providerId"]);
        return {
            providerId: providerId,
            uid: provider.rawId || '',
            displayName: provider.displayName || null,
            email: provider.email || null,
            phoneNumber: provider.phoneNumber || null,
            photoURL: provider.photoUrl || null
        };
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _ENDPOINT = 'v1/token';
var GRANT_TYPE = 'refresh_token';
function requestStsToken(auth, refreshToken) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _performFetchWithErrorHandling(auth, {}, function () {
                        var body = querystring({
                            'grant_type': GRANT_TYPE,
                            'refresh_token': refreshToken
                        }).slice(1);
                        var _a = auth.config, apiScheme = _a.apiScheme, tokenApiHost = _a.tokenApiHost, apiKey = _a.apiKey, sdkClientVersion = _a.sdkClientVersion;
                        var url = apiScheme + "://" + tokenApiHost + "/" + _ENDPOINT;
                        return FetchProvider.fetch()(url + "?key=" + apiKey, {
                            method: HttpMethod.POST,
                            headers: {
                                'X-Client-Version': sdkClientVersion,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: body
                        });
                    })];
                case 1:
                    response = _a.sent();
                    // The response comes back in snake_case. Convert to camel:
                    return [2 /*return*/, {
                            accessToken: response.access_token,
                            expiresIn: response.expires_in,
                            refreshToken: response.refresh_token
                        }];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * The number of milliseconds before the official expiration time of a token
 * to refresh that token, to provide a buffer for RPCs to complete.
 */
var TOKEN_REFRESH_BUFFER_MS = 30000;
var StsTokenManager = /** @class */ (function () {
    function StsTokenManager() {
        this.refreshToken = null;
        this.accessToken = null;
        this.expirationTime = null;
    }
    Object.defineProperty(StsTokenManager.prototype, "isExpired", {
        get: function () {
            return (!this.expirationTime ||
                Date.now() > this.expirationTime - TOKEN_REFRESH_BUFFER_MS);
        },
        enumerable: false,
        configurable: true
    });
    StsTokenManager.prototype.updateFromServerResponse = function (response) {
        this.updateTokensAndExpiration(response.idToken, response.refreshToken, 'expiresIn' in response ? response.expiresIn : undefined);
    };
    StsTokenManager.prototype.getToken = function (auth, forceRefresh) {
        if (forceRefresh === void 0) { forceRefresh = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!forceRefresh && this.accessToken && !this.isExpired) {
                            return [2 /*return*/, {
                                    accessToken: this.accessToken,
                                    refreshToken: this.refreshToken,
                                    wasRefreshed: false
                                }];
                        }
                        if (this.accessToken && !this.refreshToken) {
                            throw AUTH_ERROR_FACTORY.create("user-token-expired" /* TOKEN_EXPIRED */, {
                                appName: auth.name
                            });
                        }
                        if (!this.refreshToken) {
                            return [2 /*return*/, null];
                        }
                        return [4 /*yield*/, this.refresh(auth, this.refreshToken)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, {
                                accessToken: this.accessToken,
                                refreshToken: this.refreshToken,
                                wasRefreshed: true
                            }];
                }
            });
        });
    };
    StsTokenManager.prototype.clearRefreshToken = function () {
        this.refreshToken = null;
    };
    StsTokenManager.prototype.refresh = function (auth, oldToken) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, accessToken, refreshToken, expiresIn;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, requestStsToken(auth, oldToken)];
                    case 1:
                        _a = _b.sent(), accessToken = _a.accessToken, refreshToken = _a.refreshToken, expiresIn = _a.expiresIn;
                        this.updateTokensAndExpiration(accessToken, refreshToken, expiresIn);
                        return [2 /*return*/];
                }
            });
        });
    };
    StsTokenManager.prototype.updateTokensAndExpiration = function (accessToken, refreshToken, expiresInSec) {
        this.refreshToken = refreshToken || null;
        this.accessToken = accessToken || null;
        if (expiresInSec) {
            this.expirationTime = Date.now() + Number(expiresInSec) * 1000;
        }
    };
    StsTokenManager.fromJSON = function (appName, object) {
        var refreshToken = object.refreshToken, accessToken = object.accessToken, expirationTime = object.expirationTime;
        var manager = new StsTokenManager();
        if (refreshToken) {
            assert(typeof refreshToken === 'string', "internal-error" /* INTERNAL_ERROR */, {
                appName: appName
            });
            manager.refreshToken = refreshToken;
        }
        if (accessToken) {
            assert(typeof accessToken === 'string', "internal-error" /* INTERNAL_ERROR */, {
                appName: appName
            });
            manager.accessToken = accessToken;
        }
        if (expirationTime) {
            assert(typeof expirationTime === 'number', "internal-error" /* INTERNAL_ERROR */, {
                appName: appName
            });
            manager.expirationTime = expirationTime;
        }
        return manager;
    };
    StsTokenManager.prototype.toJSON = function () {
        return {
            refreshToken: this.refreshToken,
            accessToken: this.accessToken,
            expirationTime: this.expirationTime
        };
    };
    StsTokenManager.prototype._performRefresh = function () {
        return debugFail('not implemented');
    };
    return StsTokenManager;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function assertStringOrUndefined(assertion, appName) {
    assert(typeof assertion === 'string' || typeof assertion === 'undefined', "internal-error" /* INTERNAL_ERROR */, { appName: appName });
}
var UserMetadata = /** @class */ (function () {
    function UserMetadata(createdAt, lastLoginAt) {
        this.createdAt = createdAt;
        this.lastLoginAt = lastLoginAt;
        this.lastSignInTime = utcTimestampToDateString(lastLoginAt);
        this.creationTime = utcTimestampToDateString(createdAt);
    }
    UserMetadata.prototype.toJSON = function () {
        return {
            createdAt: this.createdAt,
            lastLoginAt: this.lastLoginAt
        };
    };
    return UserMetadata;
}());
var UserImpl = /** @class */ (function () {
    function UserImpl(_a) {
        var uid = _a.uid, auth = _a.auth, stsTokenManager = _a.stsTokenManager, opt = __rest(_a, ["uid", "auth", "stsTokenManager"]);
        // For the user object, provider is always Firebase.
        this.providerId = "firebase" /* FIREBASE */;
        this.emailVerified = false;
        this.isAnonymous = false;
        this.tenantId = null;
        this.providerData = [];
        this.reloadUserInfo = null;
        this.reloadListener = null;
        this.uid = uid;
        this.auth = auth;
        this.stsTokenManager = stsTokenManager;
        this.displayName = opt.displayName || null;
        this.email = opt.email || null;
        this.phoneNumber = opt.phoneNumber || null;
        this.photoURL = opt.photoURL || null;
        this.isAnonymous = opt.isAnonymous || false;
        this.metadata = new UserMetadata(opt.createdAt, opt.lastLoginAt);
    }
    UserImpl.prototype.getIdToken = function (forceRefresh) {
        return __awaiter(this, void 0, void 0, function () {
            var tokens, accessToken, wasRefreshed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.stsTokenManager.getToken(this.auth, forceRefresh)];
                    case 1:
                        tokens = _a.sent();
                        assert(tokens, "internal-error" /* INTERNAL_ERROR */, { appName: this.auth.name });
                        accessToken = tokens.accessToken, wasRefreshed = tokens.wasRefreshed;
                        if (!wasRefreshed) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.auth._persistUserIfCurrent(this)];
                    case 2:
                        _a.sent();
                        this.auth._notifyListenersIfCurrent(this);
                        _a.label = 3;
                    case 3: return [2 /*return*/, accessToken];
                }
            });
        });
    };
    UserImpl.prototype.getIdTokenResult = function (forceRefresh) {
        return getIdTokenResult(this, forceRefresh);
    };
    UserImpl.prototype.reload = function () {
        return reload(this);
    };
    UserImpl.prototype._onReload = function (callback) {
        // There should only ever be one listener, and that is a single instance of MultiFactorUser
        assert(!this.reloadListener, "internal-error" /* INTERNAL_ERROR */, {
            appName: this.auth.name
        });
        this.reloadListener = callback;
        if (this.reloadUserInfo) {
            this._notifyReloadListener(this.reloadUserInfo);
            this.reloadUserInfo = null;
        }
    };
    UserImpl.prototype._notifyReloadListener = function (userInfo) {
        if (this.reloadListener) {
            this.reloadListener(userInfo);
        }
        else {
            // If no listener is subscribed yet, save the result so it's available when they do subscribe
            this.reloadUserInfo = userInfo;
        }
    };
    UserImpl.prototype._updateTokensIfNecessary = function (response, reload) {
        if (reload === void 0) { reload = false; }
        return __awaiter(this, void 0, void 0, function () {
            var tokensRefreshed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokensRefreshed = false;
                        if (response.idToken &&
                            response.idToken !== this.stsTokenManager.accessToken) {
                            this.stsTokenManager.updateFromServerResponse(response);
                            tokensRefreshed = true;
                        }
                        if (!reload) return [3 /*break*/, 2];
                        return [4 /*yield*/, _reloadWithoutSaving(this)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.auth._persistUserIfCurrent(this)];
                    case 3:
                        _a.sent();
                        if (tokensRefreshed) {
                            this.auth._notifyListenersIfCurrent(this);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    UserImpl.prototype.delete = function () {
        return __awaiter(this, void 0, void 0, function () {
            var idToken;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getIdToken()];
                    case 1:
                        idToken = _a.sent();
                        return [4 /*yield*/, deleteAccount(this.auth, { idToken: idToken })];
                    case 2:
                        _a.sent();
                        this.stsTokenManager.clearRefreshToken();
                        // TODO: Determine if cancellable-promises are necessary to use in this class so that delete()
                        //       cancels pending actions...
                        return [2 /*return*/, this.auth.signOut()];
                }
            });
        });
    };
    UserImpl.prototype.toJSON = function () {
        return __assign({ uid: this.uid, email: this.email || undefined, emailVerified: this.emailVerified, displayName: this.displayName || undefined, isAnonymous: this.isAnonymous, photoURL: this.photoURL || undefined, phoneNumber: this.phoneNumber || undefined, tenantId: this.tenantId || undefined, providerData: this.providerData.map(function (userInfo) { return (__assign({}, userInfo)); }), stsTokenManager: this.stsTokenManager.toJSON(), 
            // Redirect event ID must be maintained in case there is a pending
            // redirect event.
            _redirectEventId: this._redirectEventId }, this.metadata.toJSON());
    };
    Object.defineProperty(UserImpl.prototype, "refreshToken", {
        get: function () {
            return this.stsTokenManager.refreshToken || '';
        },
        enumerable: false,
        configurable: true
    });
    UserImpl._fromJSON = function (auth, object) {
        var uid = object.uid, email = object.email, emailVerified = object.emailVerified, displayName = object.displayName, isAnonymous = object.isAnonymous, photoURL = object.photoURL, phoneNumber = object.phoneNumber, tenantId = object.tenantId, providerData = object.providerData, plainObjectTokenManager = object.stsTokenManager, _redirectEventId = object._redirectEventId, createdAt = object.createdAt, lastLoginAt = object.lastLoginAt;
        assert(uid && plainObjectTokenManager, "internal-error" /* INTERNAL_ERROR */, {
            appName: auth.name
        });
        var stsTokenManager = StsTokenManager.fromJSON(this.name, plainObjectTokenManager);
        assert(typeof uid === 'string', "internal-error" /* INTERNAL_ERROR */, {
            appName: auth.name
        });
        assertStringOrUndefined(displayName, auth.name);
        assertStringOrUndefined(email, auth.name);
        assert(typeof emailVerified === 'boolean', "internal-error" /* INTERNAL_ERROR */, {
            appName: auth.name
        });
        assert(typeof isAnonymous === 'boolean', "internal-error" /* INTERNAL_ERROR */, {
            appName: auth.name
        });
        assertStringOrUndefined(phoneNumber, auth.name);
        assertStringOrUndefined(photoURL, auth.name);
        assertStringOrUndefined(tenantId, auth.name);
        assertStringOrUndefined(_redirectEventId, auth.name);
        assertStringOrUndefined(createdAt, auth.name);
        assertStringOrUndefined(lastLoginAt, auth.name);
        var user = auth._createUser({
            uid: uid,
            auth: auth,
            email: email,
            emailVerified: emailVerified,
            displayName: displayName,
            isAnonymous: isAnonymous,
            photoURL: photoURL,
            phoneNumber: phoneNumber,
            tenantId: tenantId,
            stsTokenManager: stsTokenManager,
            createdAt: createdAt,
            lastLoginAt: lastLoginAt
        });
        if (providerData && Array.isArray(providerData)) {
            user.providerData = providerData.map(function (userInfo) { return (__assign({}, userInfo)); });
        }
        if (_redirectEventId) {
            user._redirectEventId = _redirectEventId;
        }
        return user;
    };
    /**
     * Initialize a User from an idToken server response
     * @param auth
     * @param idTokenResponse
     */
    UserImpl._fromIdTokenResponse = function (auth, idTokenResponse, isAnonymous) {
        if (isAnonymous === void 0) { isAnonymous = false; }
        return __awaiter(this, void 0, void 0, function () {
            var stsTokenManager, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stsTokenManager = new StsTokenManager();
                        stsTokenManager.updateFromServerResponse(idTokenResponse);
                        user = auth._createUser({
                            uid: idTokenResponse.localId,
                            auth: auth,
                            stsTokenManager: stsTokenManager,
                            isAnonymous: isAnonymous
                        });
                        // Updates the user info and data and resolves with a user instance.
                        return [4 /*yield*/, _reloadWithoutSaving(user)];
                    case 1:
                        // Updates the user info and data and resolves with a user instance.
                        _a.sent();
                        return [2 /*return*/, user];
                }
            });
        });
    };
    return UserImpl;
}());

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _AUTH_USER_KEY_NAME = 'authUser';
var _REDIRECT_USER_KEY_NAME = 'redirectUser';
var _PERSISTENCE_KEY_NAME = 'persistence';
var PERSISTENCE_NAMESPACE = 'firebase';
function _persistenceKeyName(key, apiKey, appName) {
    return PERSISTENCE_NAMESPACE + ":" + key + ":" + apiKey + ":" + appName;
}
var PersistenceUserManager = /** @class */ (function () {
    function PersistenceUserManager(persistence, auth, userKey) {
        this.persistence = persistence;
        this.auth = auth;
        this.userKey = userKey;
        var _a = this.auth, config = _a.config, name = _a.name;
        this.fullUserKey = _persistenceKeyName(this.userKey, config.apiKey, name);
        this.fullPersistenceKey = _persistenceKeyName(_PERSISTENCE_KEY_NAME, config.apiKey, name);
    }
    PersistenceUserManager.prototype.setCurrentUser = function (user) {
        return this.persistence.set(this.fullUserKey, user.toJSON());
    };
    PersistenceUserManager.prototype.getCurrentUser = function () {
        return __awaiter(this, void 0, void 0, function () {
            var blob;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.persistence.get(this.fullUserKey)];
                    case 1:
                        blob = _a.sent();
                        return [2 /*return*/, blob ? UserImpl._fromJSON(this.auth, blob) : null];
                }
            });
        });
    };
    PersistenceUserManager.prototype.removeCurrentUser = function () {
        return this.persistence.remove(this.fullUserKey);
    };
    PersistenceUserManager.prototype.savePersistenceForRedirect = function () {
        return this.persistence.set(this.fullPersistenceKey, this.persistence.type);
    };
    PersistenceUserManager.prototype.setPersistence = function (newPersistence) {
        return __awaiter(this, void 0, void 0, function () {
            var currentUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.persistence.type === newPersistence.type) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.getCurrentUser()];
                    case 1:
                        currentUser = _a.sent();
                        return [4 /*yield*/, this.removeCurrentUser()];
                    case 2:
                        _a.sent();
                        this.persistence = newPersistence;
                        if (currentUser) {
                            return [2 /*return*/, this.setCurrentUser(currentUser)];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    PersistenceUserManager.create = function (auth, persistenceHierarchy, userKey) {
        if (userKey === void 0) { userKey = _AUTH_USER_KEY_NAME; }
        return __awaiter(this, void 0, void 0, function () {
            var key, _i, persistenceHierarchy_1, persistence;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!persistenceHierarchy.length) {
                            return [2 /*return*/, new PersistenceUserManager(_getInstance(inMemoryPersistence), auth, userKey)];
                        }
                        key = _persistenceKeyName(userKey, auth.config.apiKey, auth.name);
                        _i = 0, persistenceHierarchy_1 = persistenceHierarchy;
                        _a.label = 1;
                    case 1:
                        if (!(_i < persistenceHierarchy_1.length)) return [3 /*break*/, 4];
                        persistence = persistenceHierarchy_1[_i];
                        return [4 /*yield*/, persistence.get(key)];
                    case 2:
                        if (_a.sent()) {
                            return [2 /*return*/, new PersistenceUserManager(persistence, auth, userKey)];
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: 
                    // Check all the available storage options.
                    // TODO: Migrate from local storage to indexedDB
                    // TODO: Clear other forms once one is found
                    // All else failed, fall back to zeroth persistence
                    // TODO: Modify this to support non-browser devices
                    return [2 /*return*/, new PersistenceUserManager(persistenceHierarchy[0], auth, userKey)];
                }
            });
        });
    };
    return PersistenceUserManager;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Enums for Browser name.
 */
var BrowserName;
(function (BrowserName) {
    BrowserName["ANDROID"] = "Android";
    BrowserName["BLACKBERRY"] = "Blackberry";
    BrowserName["EDGE"] = "Edge";
    BrowserName["FIREFOX"] = "Firefox";
    BrowserName["IE"] = "IE";
    BrowserName["IEMOBILE"] = "IEMobile";
    BrowserName["OPERA"] = "Opera";
    BrowserName["OTHER"] = "Other";
    BrowserName["CHROME"] = "Chrome";
    BrowserName["SAFARI"] = "Safari";
    BrowserName["SILK"] = "Silk";
    BrowserName["WEBOS"] = "Webos";
})(BrowserName || (BrowserName = {}));
/**
 * Determine the browser for the purposes of reporting usage to the API
 */
function _getBrowserName(userAgent) {
    var ua = userAgent.toLowerCase();
    if (ua.includes('opera/') || ua.includes('opr/') || ua.includes('opios/')) {
        return BrowserName.OPERA;
    }
    else if (ua.includes('iemobile')) {
        // Windows phone IEMobile browser.
        return BrowserName.IEMOBILE;
    }
    else if (ua.includes('msie') || ua.includes('trident/')) {
        return BrowserName.IE;
    }
    else if (ua.includes('edge/')) {
        return BrowserName.EDGE;
    }
    else if (ua.includes('firefox/')) {
        return BrowserName.FIREFOX;
    }
    else if (ua.includes('silk/')) {
        return BrowserName.SILK;
    }
    else if (ua.includes('blackberry')) {
        // Blackberry browser.
        return BrowserName.BLACKBERRY;
    }
    else if (ua.includes('webos')) {
        // WebOS default browser.
        return BrowserName.WEBOS;
    }
    else if (ua.includes('safari/') &&
        !ua.includes('chrome/') &&
        !ua.includes('crios/') &&
        !ua.includes('android')) {
        return BrowserName.SAFARI;
    }
    else if ((ua.includes('chrome/') || ua.includes('crios/')) &&
        !ua.includes('edge/')) {
        return BrowserName.CHROME;
    }
    else if (ua.includes('android')) {
        // Android stock browser.
        return BrowserName.ANDROID;
    }
    else {
        // Most modern browsers have name/version at end of user agent string.
        var re = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/;
        var matches = userAgent.match(re);
        if ((matches === null || matches === void 0 ? void 0 : matches.length) === 2) {
            return matches[1];
        }
    }
    return BrowserName.OTHER;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var CLIENT_IMPLEMENTATION = 'JsCore';
var ClientPlatform;
(function (ClientPlatform) {
    ClientPlatform["BROWSER"] = "Browser";
    ClientPlatform["NODE"] = "Node";
    ClientPlatform["REACT_NATIVE"] = "ReactNative";
    ClientPlatform["WORKER"] = "Worker";
})(ClientPlatform || (ClientPlatform = {}));
var ClientFramework;
(function (ClientFramework) {
    // No other framework used.
    ClientFramework["DEFAULT"] = "FirebaseCore-web";
    // Firebase Auth used with FirebaseUI-web.
    // TODO: Pass this in when used in conjunction with FirebaseUI
    ClientFramework["FIREBASEUI"] = "FirebaseUI-web";
})(ClientFramework || (ClientFramework = {}));
/*
 * Determine the SDK version string
 *
 * TODO: This should be set on the Auth object during initialization
 */
function _getClientVersion(clientPlatform) {
    var reportedPlatform;
    switch (clientPlatform) {
        case ClientPlatform.BROWSER:
            // In a browser environment, report the browser name.
            reportedPlatform = _getBrowserName(getUA());
            break;
        case ClientPlatform.WORKER:
            // Technically a worker runs from a browser but we need to differentiate a
            // worker from a browser.
            // For example: Chrome-Worker/JsCore/4.9.1/FirebaseCore-web.
            reportedPlatform = _getBrowserName(getUA()) + "-" + clientPlatform;
            break;
        default:
            reportedPlatform = clientPlatform;
    }
    return reportedPlatform + "/" + CLIENT_IMPLEMENTATION + "/" + SDK_VERSION + "/" + ClientFramework.DEFAULT;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DEFAULT_TOKEN_API_HOST = 'securetoken.googleapis.com';
var DEFAULT_API_HOST = 'identitytoolkit.googleapis.com';
var DEFAULT_API_SCHEME = 'https';
var AuthImplCompat = /** @class */ (function () {
    function AuthImplCompat(name, config, _userProvider) {
        this.name = name;
        this.config = config;
        this._userProvider = _userProvider;
        this.currentUser = null;
        this.operations = Promise.resolve();
        this.authStateSubscription = new Subscription(this);
        this.idTokenSubscription = new Subscription(this);
        this.redirectUser = null;
        this._isInitialized = false;
        this._popupRedirectResolver = null;
        // Tracks the last notified UID for state change listeners to prevent
        // repeated calls to the callbacks
        this.lastNotifiedUid = undefined;
        this.languageCode = null;
        this.tenantId = null;
        this.settings = { appVerificationDisabledForTesting: false };
    }
    AuthImplCompat.prototype._initializeWithPersistence = function (persistenceHierarchy, popupRedirectResolver) {
        var _this = this;
        return this.queue(function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (popupRedirectResolver) {
                            this._popupRedirectResolver = _getInstance(popupRedirectResolver);
                        }
                        _a = this;
                        return [4 /*yield*/, PersistenceUserManager.create(this, persistenceHierarchy)];
                    case 1:
                        _a.persistenceManager = _b.sent();
                        return [4 /*yield*/, this.initializeCurrentUser()];
                    case 2:
                        _b.sent();
                        this._isInitialized = true;
                        this.notifyAuthListeners();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    AuthImplCompat.prototype._createUser = function (params) {
        return new this._userProvider(params);
    };
    AuthImplCompat.prototype.initializeCurrentUser = function () {
        return __awaiter(this, void 0, void 0, function () {
            var storedUser;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.assertedPersistence.getCurrentUser()];
                    case 1:
                        storedUser = (_a.sent());
                        if (!storedUser) {
                            return [2 /*return*/, this.directlySetCurrentUser(storedUser)];
                        }
                        if (!storedUser._redirectEventId) {
                            // This isn't a redirect user, we can reload and bail
                            return [2 /*return*/, this.reloadAndSetCurrentUserOrClear(storedUser)];
                        }
                        assert(this._popupRedirectResolver, "argument-error" /* ARGUMENT_ERROR */, {
                            appName: this.name
                        });
                        return [4 /*yield*/, this.getOrInitRedirectPersistenceManager()];
                    case 2:
                        _a.sent();
                        // If the redirect user's event ID matches the current user's event ID,
                        // DO NOT reload the current user, otherwise they'll be cleared from storage.
                        // This is important for the reauthenticateWithRedirect() flow.
                        if (this.redirectUser &&
                            this.redirectUser._redirectEventId === storedUser._redirectEventId) {
                            return [2 /*return*/, this.directlySetCurrentUser(storedUser)];
                        }
                        return [2 /*return*/, this.reloadAndSetCurrentUserOrClear(storedUser)];
                }
            });
        });
    };
    AuthImplCompat.prototype.reloadAndSetCurrentUserOrClear = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, _reloadWithoutSaving(user)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        if (e_1.code !== "auth/" + "network-request-failed" /* NETWORK_REQUEST_FAILED */) {
                            // Something's wrong with the user's token. Log them out and remove
                            // them from storage
                            return [2 /*return*/, this.directlySetCurrentUser(null)];
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, this.directlySetCurrentUser(user)];
                }
            });
        });
    };
    AuthImplCompat.prototype.useDeviceLanguage = function () {
        this.languageCode = _getUserLanguage();
    };
    AuthImplCompat.prototype.updateCurrentUser = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (user) {
                    assert(this.tenantId === user.tenantId, "tenant-id-mismatch" /* TENANT_ID_MISMATCH */, { appName: this.name });
                }
                return [2 /*return*/, this.queue(function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.directlySetCurrentUser(user)];
                                case 1:
                                    _a.sent();
                                    this.notifyAuthListeners();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    AuthImplCompat.prototype.signOut = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.updateCurrentUser(null)];
            });
        });
    };
    AuthImplCompat.prototype._setPersistence = function (persistence) {
        var _this = this;
        return this.queue(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.assertedPersistence.setPersistence(_getInstance(persistence))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    };
    AuthImplCompat.prototype._onAuthStateChanged = function (nextOrObserver, error, completed) {
        return this.registerStateListener(this.authStateSubscription, nextOrObserver, error, completed);
    };
    AuthImplCompat.prototype._onIdTokenChanged = function (nextOrObserver, error, completed) {
        return this.registerStateListener(this.idTokenSubscription, nextOrObserver, error, completed);
    };
    AuthImplCompat.prototype._setRedirectUser = function (user, popupRedirectResolver) {
        return __awaiter(this, void 0, void 0, function () {
            var redirectManager;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getOrInitRedirectPersistenceManager(popupRedirectResolver)];
                    case 1:
                        redirectManager = _a.sent();
                        return [2 /*return*/, user === null
                                ? redirectManager.removeCurrentUser()
                                : redirectManager.setCurrentUser(user)];
                }
            });
        });
    };
    AuthImplCompat.prototype.getOrInitRedirectPersistenceManager = function (popupRedirectResolver) {
        return __awaiter(this, void 0, void 0, function () {
            var resolver, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!!this.redirectPersistenceManager) return [3 /*break*/, 3];
                        resolver = (popupRedirectResolver && _getInstance(popupRedirectResolver)) ||
                            this._popupRedirectResolver;
                        assert(resolver, "argument-error" /* ARGUMENT_ERROR */, { appName: this.name });
                        _a = this;
                        return [4 /*yield*/, PersistenceUserManager.create(this, [_getInstance(resolver._redirectPersistence)], _REDIRECT_USER_KEY_NAME)];
                    case 1:
                        _a.redirectPersistenceManager = _c.sent();
                        _b = this;
                        return [4 /*yield*/, this.redirectPersistenceManager.getCurrentUser()];
                    case 2:
                        _b.redirectUser = (_c.sent());
                        _c.label = 3;
                    case 3: return [2 /*return*/, this.redirectPersistenceManager];
                }
            });
        });
    };
    AuthImplCompat.prototype._redirectUserForId = function (id) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: 
                    // Make sure we've cleared any pending ppersistence actions
                    return [4 /*yield*/, this.queue(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/];
                        }); }); })];
                    case 1:
                        // Make sure we've cleared any pending ppersistence actions
                        _c.sent();
                        if (((_a = this.currentUser) === null || _a === void 0 ? void 0 : _a._redirectEventId) === id) {
                            return [2 /*return*/, this.currentUser];
                        }
                        if (((_b = this.redirectUser) === null || _b === void 0 ? void 0 : _b._redirectEventId) === id) {
                            return [2 /*return*/, this.redirectUser];
                        }
                        return [2 /*return*/, null];
                }
            });
        });
    };
    AuthImplCompat.prototype._persistUserIfCurrent = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (user === this.currentUser) {
                    return [2 /*return*/, this.queue(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, this.directlySetCurrentUser(user)];
                        }); }); })];
                }
                return [2 /*return*/];
            });
        });
    };
    /** Notifies listeners only if the user is current */
    AuthImplCompat.prototype._notifyListenersIfCurrent = function (user) {
        if (user === this.currentUser) {
            this.notifyAuthListeners();
        }
    };
    AuthImplCompat.prototype._key = function () {
        return this.config.authDomain + ":" + this.config.apiKey + ":" + this.name;
    };
    AuthImplCompat.prototype.notifyAuthListeners = function () {
        var _a, _b;
        if (!this._isInitialized) {
            return;
        }
        this.idTokenSubscription.next(this.currentUser);
        if (this.lastNotifiedUid !== ((_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.uid)) {
            this.lastNotifiedUid = (_b = this.currentUser) === null || _b === void 0 ? void 0 : _b.uid;
            this.authStateSubscription.next(this.currentUser);
        }
    };
    AuthImplCompat.prototype.registerStateListener = function (subscription, nextOrObserver, error, completed) {
        var _this = this;
        if (this._isInitialized) {
            var cb_1 = typeof nextOrObserver === 'function'
                ? nextOrObserver
                : nextOrObserver.next;
            // The callback needs to be called asynchronously per the spec.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            Promise.resolve().then(function () { return cb_1(_this.currentUser); });
        }
        if (typeof nextOrObserver === 'function') {
            return subscription.addObserver(nextOrObserver, error, completed);
        }
        else {
            return subscription.addObserver(nextOrObserver);
        }
    };
    /**
     * Unprotected (from race conditions) method to set the current user. This
     * should only be called from within a queued callback. This is necessary
     * because the queue shouldn't rely on another queued callback.
     */
    AuthImplCompat.prototype.directlySetCurrentUser = function (user) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.currentUser = user;
                        if (!user) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.assertedPersistence.setCurrentUser(user)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.assertedPersistence.removeCurrentUser()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AuthImplCompat.prototype.queue = function (action) {
        // In case something errors, the callback still should be called in order
        // to keep the promise chain alive
        this.operations = this.operations.then(action, action);
        return this.operations;
    };
    Object.defineProperty(AuthImplCompat.prototype, "assertedPersistence", {
        get: function () {
            assert(this.persistenceManager, "internal-error" /* INTERNAL_ERROR */, {
                appName: this.name
            });
            return this.persistenceManager;
        },
        enumerable: false,
        configurable: true
    });
    return AuthImplCompat;
}());
/**
 * This is the implementation we make public in the new SDK, note the changed interface on these methods
 *
 * Don't instantiate this class directly, use initializeAuth()
 */
var AuthImpl = /** @class */ (function (_super) {
    __extends(AuthImpl, _super);
    function AuthImpl(name, config) {
        return _super.call(this, name, config, UserImpl) || this;
    }
    AuthImpl.prototype.onAuthStateChanged = function (nextOrObserver, error, completed) {
        return _super.prototype._onAuthStateChanged.call(this, nextOrObserver, error, completed);
    };
    AuthImpl.prototype.onIdTokenChanged = function (nextOrObserver, error, completed) {
        return _super.prototype._onIdTokenChanged.call(this, nextOrObserver, error, completed);
    };
    AuthImpl.prototype.setPersistence = function (persistence) {
        return _super.prototype._setPersistence.call(this, persistence);
    };
    return AuthImpl;
}(AuthImplCompat));
/**
 * Method to be used to cast down to our private implmentation of Auth
 *
 * @param auth Auth object passed in from developer
 */
function _castAuth(auth) {
    return auth;
}
function _initializeAuthForClientPlatform(clientPlatform) {
    return function (app, deps) {
        if (app === void 0) { app = getApp(); }
        var persistence = (deps === null || deps === void 0 ? void 0 : deps.persistence) || [];
        var hierarchy = (Array.isArray(persistence)
            ? persistence
            : [persistence]).map(_getInstance);
        var _a = app.options, apiKey = _a.apiKey, authDomain = _a.authDomain;
        // TODO: platform needs to be determined using heuristics
        assert(apiKey, "invalid-api-key" /* INVALID_API_KEY */, { appName: app.name });
        var config = {
            apiKey: apiKey,
            authDomain: authDomain,
            apiHost: DEFAULT_API_HOST,
            tokenApiHost: DEFAULT_TOKEN_API_HOST,
            apiScheme: DEFAULT_API_SCHEME,
            sdkClientVersion: _getClientVersion(clientPlatform)
        };
        var auth = new AuthImpl(app.name, config);
        // This promise is intended to float; auth initialization happens in the
        // background, meanwhile the auth object may be used by the app.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        auth._initializeWithPersistence(hierarchy, deps === null || deps === void 0 ? void 0 : deps.popupRedirectResolver);
        return auth;
    };
}
/** Helper class to wrap subscriber logic */
var Subscription = /** @class */ (function () {
    function Subscription(auth) {
        var _this = this;
        this.auth = auth;
        this.observer = null;
        this.addObserver = createSubscribe(function (observer) { return (_this.observer = observer); });
    }
    Object.defineProperty(Subscription.prototype, "next", {
        get: function () {
            assert(this.observer, "internal-error" /* INTERNAL_ERROR */, {
                appName: this.auth.name
            });
            return this.observer.next.bind(this.observer);
        },
        enumerable: false,
        configurable: true
    });
    return Subscription;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var AuthCredential = /** @class */ (function () {
    function AuthCredential(providerId, signInMethod) {
        this.providerId = providerId;
        this.signInMethod = signInMethod;
    }
    AuthCredential.fromJSON = function (json) {
        for (var _i = 0, _a = [
            /* SAMLAuthCredential.fromJSON, */
            OAuthCredential.fromJSON,
            EmailAuthCredential.fromJSON,
            PhoneAuthCredential.fromJSON
        ]; _i < _a.length; _i++) {
            var fn = _a[_i];
            var credential = fn(json);
            if (credential) {
                return credential;
            }
        }
        return null;
    };
    AuthCredential.prototype.toJSON = function () {
        return debugFail('not implemented');
    };
    AuthCredential.prototype._getIdTokenResponse = function (_auth) {
        return debugFail('not implemented');
    };
    AuthCredential.prototype._linkToIdToken = function (_auth, _idToken) {
        return debugFail('not implemented');
    };
    AuthCredential.prototype._getReauthenticationResolver = function (_auth) {
        return debugFail('not implemented');
    };
    return AuthCredential;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function resetPassword(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.RESET_PASSWORD, request)];
        });
    });
}
function updateEmailPassword(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request)];
        });
    });
}
function applyActionCode(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signInWithPassword(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PASSWORD, request)];
        });
    });
}
function sendOobCode(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.SEND_OOB_CODE, request)];
        });
    });
}
function sendEmailVerification(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendOobCode(auth, request)];
        });
    });
}
function sendPasswordResetEmail(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendOobCode(auth, request)];
        });
    });
}
function sendSignInLinkToEmail(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, sendOobCode(auth, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signInWithEmailLink$1(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_EMAIL_LINK, request)];
        });
    });
}
function signInWithEmailLinkForLinking(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_EMAIL_LINK, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var EmailAuthCredential = /** @class */ (function (_super) {
    __extends(EmailAuthCredential, _super);
    function EmailAuthCredential(email, password, signInMethod, tenantId) {
        if (tenantId === void 0) { tenantId = null; }
        var _this = _super.call(this, "password" /* PASSWORD */, signInMethod) || this;
        _this.email = email;
        _this.password = password;
        _this.tenantId = tenantId;
        return _this;
    }
    EmailAuthCredential._fromEmailAndPassword = function (email, password) {
        return new EmailAuthCredential(email, password, "password" /* EMAIL_PASSWORD */);
    };
    EmailAuthCredential._fromEmailAndCode = function (email, oobCode, tenantId) {
        if (tenantId === void 0) { tenantId = null; }
        return new EmailAuthCredential(email, oobCode, "emailLink" /* EMAIL_LINK */, tenantId);
    };
    EmailAuthCredential.prototype.toJSON = function () {
        return {
            email: this.email,
            password: this.password,
            signInMethod: this.signInMethod,
            tenantId: this.tenantId
        };
    };
    EmailAuthCredential.fromJSON = function (json) {
        var obj = typeof json === 'string' ? JSON.parse(json) : json;
        if ((obj === null || obj === void 0 ? void 0 : obj.email) && (obj === null || obj === void 0 ? void 0 : obj.password)) {
            if (obj.signInMethod === "password" /* EMAIL_PASSWORD */) {
                return this._fromEmailAndPassword(obj.email, obj.password);
            }
            else if (obj.signInMethod === "emailLink" /* EMAIL_LINK */) {
                return this._fromEmailAndCode(obj.email, obj.password, obj.tenantId);
            }
        }
        return null;
    };
    EmailAuthCredential.prototype._getIdTokenResponse = function (auth) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (this.signInMethod) {
                    case "password" /* EMAIL_PASSWORD */:
                        return [2 /*return*/, signInWithPassword(auth, {
                                returnSecureToken: true,
                                email: this.email,
                                password: this.password
                            })];
                    case "emailLink" /* EMAIL_LINK */:
                        return [2 /*return*/, signInWithEmailLink$1(auth, {
                                email: this.email,
                                oobCode: this.password
                            })];
                    default:
                        fail("internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
                }
                return [2 /*return*/];
            });
        });
    };
    EmailAuthCredential.prototype._linkToIdToken = function (auth, idToken) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (this.signInMethod) {
                    case "password" /* EMAIL_PASSWORD */:
                        return [2 /*return*/, updateEmailPassword(auth, {
                                idToken: idToken,
                                returnSecureToken: true,
                                email: this.email,
                                password: this.password
                            })];
                    case "emailLink" /* EMAIL_LINK */:
                        return [2 /*return*/, signInWithEmailLinkForLinking(auth, {
                                idToken: idToken,
                                email: this.email,
                                oobCode: this.password
                            })];
                    default:
                        fail("internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
                }
                return [2 /*return*/];
            });
        });
    };
    EmailAuthCredential.prototype._getReauthenticationResolver = function (auth) {
        return this._getIdTokenResponse(auth);
    };
    return EmailAuthCredential;
}(AuthCredential));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signInWithIdp(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_IDP, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var IDP_REQUEST_URI = 'http://localhost';
var OAuthCredential = /** @class */ (function (_super) {
    __extends(OAuthCredential, _super);
    function OAuthCredential() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.pendingToken = null;
        return _this;
    }
    OAuthCredential._fromParams = function (params) {
        var cred = new OAuthCredential(params.providerId, params.signInMethod);
        if (params.idToken || params.accessToken) {
            // OAuth 2 and either ID token or access token.
            if (params.idToken) {
                cred.idToken = params.idToken;
            }
            if (params.accessToken) {
                cred.accessToken = params.accessToken;
            }
            // Add nonce if available and no pendingToken is present.
            if (params.nonce && !params.pendingToken) {
                cred.nonce = params.nonce;
            }
            if (params.pendingToken) {
                cred.pendingToken = params.pendingToken;
            }
        }
        else if (params.oauthToken && params.oauthTokenSecret) {
            // OAuth 1 and OAuth token with token secret
            cred.accessToken = params.oauthToken;
            cred.secret = params.oauthTokenSecret;
        }
        else {
            fail("argument-error" /* ARGUMENT_ERROR */, {});
        }
        return cred;
    };
    OAuthCredential.prototype.toJSON = function () {
        return {
            idToken: this.idToken,
            accessToken: this.accessToken,
            secret: this.secret,
            nonce: this.nonce,
            pendingToken: this.pendingToken,
            providerId: this.providerId,
            signInMethod: this.signInMethod
        };
    };
    OAuthCredential.fromJSON = function (json) {
        var obj = typeof json === 'string' ? JSON.parse(json) : json;
        var providerId = obj.providerId, signInMethod = obj.signInMethod, rest = __rest(obj, ["providerId", "signInMethod"]);
        if (!providerId || !signInMethod) {
            return null;
        }
        var cred = new OAuthCredential(providerId, signInMethod);
        Object.assign(cred, rest);
        return cred;
    };
    OAuthCredential.prototype._getIdTokenResponse = function (auth) {
        var request = this.buildRequest();
        return signInWithIdp(auth, request);
    };
    OAuthCredential.prototype._linkToIdToken = function (auth, idToken) {
        var request = this.buildRequest();
        request.idToken = idToken;
        return signInWithIdp(auth, request);
    };
    OAuthCredential.prototype._getReauthenticationResolver = function (auth) {
        var request = this.buildRequest();
        request.autoCreate = false;
        return signInWithIdp(auth, request);
    };
    OAuthCredential.prototype.buildRequest = function () {
        var request = {
            requestUri: IDP_REQUEST_URI,
            returnSecureToken: true,
            postBody: null
        };
        if (this.pendingToken) {
            request.pendingToken = this.pendingToken;
        }
        else {
            var postBody = {};
            if (this.idToken) {
                postBody['id_token'] = this.idToken;
            }
            if (this.accessToken) {
                postBody['access_token'] = this.accessToken;
            }
            if (this.secret) {
                postBody['oauth_token_secret'] = this.secret;
            }
            postBody['providerId'] = this.providerId;
            if (this.nonce && !this.pendingToken) {
                postBody['nonce'] = this.nonce;
            }
            request.postBody = querystring(postBody);
        }
        return request;
    };
    return OAuthCredential;
}(AuthCredential));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a$2$1;
function sendPhoneVerificationCode(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.SEND_VERIFICATION_CODE, request)];
        });
    });
}
function signInWithPhoneNumber(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PHONE_NUMBER, request)];
        });
    });
}
function linkWithPhoneNumber(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PHONE_NUMBER, request)];
        });
    });
}
var VERIFY_PHONE_NUMBER_FOR_EXISTING_ERROR_MAP_ = (_a$2$1 = {},
    _a$2$1[ServerError.USER_NOT_FOUND] = "user-not-found" /* USER_DELETED */,
    _a$2$1);
function verifyPhoneNumberForExisting(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        var apiRequest;
        return __generator(this, function (_a) {
            apiRequest = __assign(__assign({}, request), { operation: 'REAUTH' });
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_PHONE_NUMBER, apiRequest, VERIFY_PHONE_NUMBER_FOR_EXISTING_ERROR_MAP_)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PhoneAuthCredential = /** @class */ (function (_super) {
    __extends(PhoneAuthCredential, _super);
    function PhoneAuthCredential(params) {
        var _this = _super.call(this, "phone" /* PHONE */, "phone" /* PHONE */) || this;
        _this.params = params;
        return _this;
    }
    PhoneAuthCredential._fromVerification = function (verificationId, verificationCode) {
        return new PhoneAuthCredential({ verificationId: verificationId, verificationCode: verificationCode });
    };
    PhoneAuthCredential._fromTokenResponse = function (phoneNumber, temporaryProof) {
        return new PhoneAuthCredential({ phoneNumber: phoneNumber, temporaryProof: temporaryProof });
    };
    PhoneAuthCredential.prototype._getIdTokenResponse = function (auth) {
        return signInWithPhoneNumber(auth, this._makeVerificationRequest());
    };
    PhoneAuthCredential.prototype._linkToIdToken = function (auth, idToken) {
        return linkWithPhoneNumber(auth, __assign({ idToken: idToken }, this._makeVerificationRequest()));
    };
    PhoneAuthCredential.prototype._getReauthenticationResolver = function (auth) {
        return verifyPhoneNumberForExisting(auth, this._makeVerificationRequest());
    };
    PhoneAuthCredential.prototype._makeVerificationRequest = function () {
        var _a = this.params, temporaryProof = _a.temporaryProof, phoneNumber = _a.phoneNumber, verificationId = _a.verificationId, verificationCode = _a.verificationCode;
        if (temporaryProof && phoneNumber) {
            return { temporaryProof: temporaryProof, phoneNumber: phoneNumber };
        }
        return {
            sessionInfo: verificationId,
            code: verificationCode
        };
    };
    PhoneAuthCredential.prototype.toJSON = function () {
        var obj = {
            providerId: this.providerId
        };
        if (this.params.phoneNumber) {
            obj.phoneNumber = this.params.phoneNumber;
        }
        if (this.params.temporaryProof) {
            obj.temporaryProof = this.params.temporaryProof;
        }
        if (this.params.verificationCode) {
            obj.verificationCode = this.params.verificationCode;
        }
        if (this.params.verificationId) {
            obj.verificationId = this.params.verificationId;
        }
        return obj;
    };
    PhoneAuthCredential.fromJSON = function (json) {
        if (typeof json === 'string') {
            json = JSON.parse(json);
        }
        var _a = json, verificationId = _a.verificationId, verificationCode = _a.verificationCode, phoneNumber = _a.phoneNumber, temporaryProof = _a.temporaryProof;
        if (!verificationCode &&
            !verificationId &&
            !phoneNumber &&
            !temporaryProof) {
            return null;
        }
        return new PhoneAuthCredential({
            verificationId: verificationId,
            verificationCode: verificationCode,
            phoneNumber: phoneNumber,
            temporaryProof: temporaryProof
        });
    };
    return PhoneAuthCredential;
}(AuthCredential));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Enums for fields in URL query string.
 * @enum {string}
 */
var QueryField;
(function (QueryField) {
    QueryField["API_KEY"] = "apiKey";
    QueryField["CODE"] = "oobCode";
    QueryField["CONTINUE_URL"] = "continueUrl";
    QueryField["LANGUAGE_CODE"] = "languageCode";
    QueryField["MODE"] = "mode";
    QueryField["TENANT_ID"] = "tenantId";
})(QueryField || (QueryField = {}));
/**
 * Map from mode string in action code URL to Action Code Info operation.
 */
var MODE_TO_OPERATION_MAP = {
    'recoverEmail': "RECOVER_EMAIL" /* RECOVER_EMAIL */,
    'resetPassword': "PASSWORD_RESET" /* PASSWORD_RESET */,
    'signIn': "EMAIL_SIGNIN" /* EMAIL_SIGNIN */,
    'verifyEmail': "VERIFY_EMAIL" /* VERIFY_EMAIL */,
    'verifyAndChangeEmail': "VERIFY_AND_CHANGE_EMAIL" /* VERIFY_AND_CHANGE_EMAIL */,
    'revertSecondFactorAddition': "REVERT_SECOND_FACTOR_ADDITION" /* REVERT_SECOND_FACTOR_ADDITION */
};
/**
 * Maps the mode string in action code URL to Action Code Info operation.
 */
function parseMode(mode) {
    return mode ? MODE_TO_OPERATION_MAP[mode] || null : null;
}
function parseDeepLink(url) {
    var uri = new URL(url);
    var link = uri.searchParams.get('link');
    // Double link case (automatic redirect).
    var doubleDeepLink = link ? new URL(link).searchParams.get('link') : null;
    // iOS custom scheme links.
    var iOSDeepLink = uri.searchParams.get('deep_link_id');
    var iOSDoubleDeepLink = iOSDeepLink
        ? new URL(iOSDeepLink).searchParams.get('link')
        : null;
    return iOSDoubleDeepLink || iOSDeepLink || doubleDeepLink || link || url;
}
var ActionCodeURL = /** @class */ (function () {
    function ActionCodeURL(actionLink) {
        var uri = new URL(actionLink);
        var apiKey = uri.searchParams.get(QueryField.API_KEY);
        var code = uri.searchParams.get(QueryField.CODE);
        var operation = parseMode(uri.searchParams.get(QueryField.MODE));
        // Validate API key, code and mode.
        if (!apiKey || !code || !operation) {
            throw AUTH_ERROR_FACTORY.create("argument-error" /* ARGUMENT_ERROR */, {});
        }
        this.apiKey = apiKey;
        this.operation = operation;
        this.code = code;
        this.continueUrl = uri.searchParams.get(QueryField.CONTINUE_URL);
        this.languageCode = uri.searchParams.get(QueryField.LANGUAGE_CODE);
        this.tenantId = uri.searchParams.get(QueryField.TENANT_ID);
    }
    ActionCodeURL.parseLink = function (link) {
        var actionLink = parseDeepLink(link);
        try {
            return new ActionCodeURL(actionLink);
        }
        catch (_a) {
            return null;
        }
    };
    return ActionCodeURL;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var EmailAuthProvider = /** @class */ (function () {
    function EmailAuthProvider() {
        this.providerId = EmailAuthProvider.PROVIDER_ID;
    }
    EmailAuthProvider.credential = function (email, password) {
        return EmailAuthCredential._fromEmailAndPassword(email, password);
    };
    EmailAuthProvider.credentialWithLink = function (email, emailLink) {
        var actionCodeUrl = ActionCodeURL.parseLink(emailLink);
        assert(actionCodeUrl, "argument-error" /* ARGUMENT_ERROR */, {});
        return EmailAuthCredential._fromEmailAndCode(email, actionCodeUrl.code, actionCodeUrl.tenantId);
    };
    EmailAuthProvider.PROVIDER_ID = "password" /* PASSWORD */;
    EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD = "password" /* EMAIL_PASSWORD */;
    EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD = "emailLink" /* EMAIL_LINK */;
    return EmailAuthProvider;
}());

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var OAuthProvider = /** @class */ (function () {
    function OAuthProvider(providerId) {
        this.providerId = providerId;
        this.defaultLanguageCode = null;
        this.scopes = [];
        this.customParameters = {};
    }
    OAuthProvider.credentialFromJSON = function (json) {
        var obj = typeof json === 'string' ? JSON.parse(json) : json;
        assert('providerId' in obj && 'signInMethod' in obj, "argument-error" /* ARGUMENT_ERROR */, {});
        return OAuthCredential._fromParams(obj);
    };
    OAuthProvider.prototype.credential = function (params) {
        assert(params.idToken && params.accessToken, "argument-error" /* ARGUMENT_ERROR */, {});
        // For OAuthCredential, sign in method is same as providerId.
        return OAuthCredential._fromParams(__assign({ providerId: this.providerId, signInMethod: this.providerId }, params));
    };
    OAuthProvider.prototype.setDefaultLanguage = function (languageCode) {
        this.defaultLanguageCode = languageCode;
    };
    OAuthProvider.prototype.setCustomParameters = function (customOAuthParameters) {
        this.customParameters = customOAuthParameters;
        return this;
    };
    OAuthProvider.prototype.getCustomParameters = function () {
        return this.customParameters;
    };
    OAuthProvider.prototype.addScope = function (scope) {
        // If not already added, add scope to list.
        if (!this.scopes.includes(scope)) {
            this.scopes.push(scope);
        }
        return this;
    };
    OAuthProvider.prototype.getScopes = function () {
        return __spreadArrays(this.scopes);
    };
    return OAuthProvider;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var FacebookAuthProvider = /** @class */ (function (_super) {
    __extends(FacebookAuthProvider, _super);
    function FacebookAuthProvider() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.providerId = FacebookAuthProvider.PROVIDER_ID;
        return _this;
    }
    FacebookAuthProvider.credential = function (accessToken) {
        return OAuthCredential._fromParams({
            providerId: FacebookAuthProvider.PROVIDER_ID,
            signInMethod: FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD,
            accessToken: accessToken
        });
    };
    FacebookAuthProvider.credentialFromResult = function (userCredential) {
        return FacebookAuthProvider.credentialFromTaggedObject(userCredential);
    };
    FacebookAuthProvider.credentialFromError = function (error) {
        return FacebookAuthProvider.credentialFromTaggedObject(error);
    };
    FacebookAuthProvider.credentialFromTaggedObject = function (_a) {
        var tokenResponse = _a._tokenResponse;
        if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
            return null;
        }
        if (!tokenResponse.oauthAccessToken) {
            return null;
        }
        try {
            return FacebookAuthProvider.credential(tokenResponse.oauthAccessToken);
        }
        catch (_b) {
            return null;
        }
    };
    FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD = "facebook.com" /* FACEBOOK */;
    FacebookAuthProvider.PROVIDER_ID = "facebook.com" /* FACEBOOK */;
    return FacebookAuthProvider;
}(OAuthProvider));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var GoogleAuthProvider = /** @class */ (function (_super) {
    __extends(GoogleAuthProvider, _super);
    function GoogleAuthProvider() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.providerId = GoogleAuthProvider.PROVIDER_ID;
        return _this;
    }
    GoogleAuthProvider.credential = function (idToken, accessToken) {
        return OAuthCredential._fromParams({
            providerId: GoogleAuthProvider.PROVIDER_ID,
            signInMethod: GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD,
            idToken: idToken,
            accessToken: accessToken
        });
    };
    GoogleAuthProvider.credentialFromResult = function (userCredential) {
        return GoogleAuthProvider.credentialFromTaggedObject(userCredential);
    };
    GoogleAuthProvider.credentialFromError = function (error) {
        return GoogleAuthProvider.credentialFromTaggedObject(error);
    };
    GoogleAuthProvider.credentialFromTaggedObject = function (_a) {
        var tokenResponse = _a._tokenResponse;
        if (!tokenResponse) {
            return null;
        }
        var _b = tokenResponse, oauthIdToken = _b.oauthIdToken, oauthAccessToken = _b.oauthAccessToken;
        if (!oauthIdToken && !oauthAccessToken) {
            // This could be an oauth 1 credential or a phone credential
            return null;
        }
        try {
            return GoogleAuthProvider.credential(oauthIdToken, oauthAccessToken);
        }
        catch (_c) {
            return null;
        }
    };
    GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD = "google.com" /* GOOGLE */;
    GoogleAuthProvider.PROVIDER_ID = "google.com" /* GOOGLE */;
    return GoogleAuthProvider;
}(OAuthProvider));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var GithubAuthProvider = /** @class */ (function (_super) {
    __extends(GithubAuthProvider, _super);
    function GithubAuthProvider() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.providerId = GithubAuthProvider.PROVIDER_ID;
        return _this;
    }
    GithubAuthProvider.credential = function (accessToken) {
        return OAuthCredential._fromParams({
            providerId: GithubAuthProvider.PROVIDER_ID,
            signInMethod: GithubAuthProvider.GITHUB_SIGN_IN_METHOD,
            accessToken: accessToken
        });
    };
    GithubAuthProvider.credentialFromResult = function (userCredential) {
        return GithubAuthProvider.credentialFromTaggedObject(userCredential);
    };
    GithubAuthProvider.credentialFromError = function (error) {
        return GithubAuthProvider.credentialFromTaggedObject(error);
    };
    GithubAuthProvider.credentialFromTaggedObject = function (_a) {
        var tokenResponse = _a._tokenResponse;
        if (!tokenResponse || !('oauthAccessToken' in tokenResponse)) {
            return null;
        }
        if (!tokenResponse.oauthAccessToken) {
            return null;
        }
        try {
            return GithubAuthProvider.credential(tokenResponse.oauthAccessToken);
        }
        catch (_b) {
            return null;
        }
    };
    GithubAuthProvider.GITHUB_SIGN_IN_METHOD = "github.com" /* GITHUB */;
    GithubAuthProvider.PROVIDER_ID = "github.com" /* GITHUB */;
    return GithubAuthProvider;
}(OAuthProvider));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var TwitterAuthProvider = /** @class */ (function (_super) {
    __extends(TwitterAuthProvider, _super);
    function TwitterAuthProvider() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.providerId = TwitterAuthProvider.PROVIDER_ID;
        return _this;
    }
    TwitterAuthProvider.credential = function (token, secret) {
        return OAuthCredential._fromParams({
            providerId: TwitterAuthProvider.PROVIDER_ID,
            signInMethod: TwitterAuthProvider.TWITTER_SIGN_IN_METHOD,
            oauthToken: token,
            oauthTokenSecret: secret
        });
    };
    TwitterAuthProvider.credentialFromResult = function (userCredential) {
        return TwitterAuthProvider.credentialFromTaggedObject(userCredential);
    };
    TwitterAuthProvider.credentialFromError = function (error) {
        return TwitterAuthProvider.credentialFromTaggedObject(error);
    };
    TwitterAuthProvider.credentialFromTaggedObject = function (_a) {
        var tokenResponse = _a._tokenResponse;
        if (!tokenResponse) {
            return null;
        }
        var _b = tokenResponse, oauthAccessToken = _b.oauthAccessToken, oauthTokenSecret = _b.oauthTokenSecret;
        if (!oauthAccessToken || !oauthTokenSecret) {
            return null;
        }
        try {
            return TwitterAuthProvider.credential(oauthAccessToken, oauthTokenSecret);
        }
        catch (_c) {
            return null;
        }
    };
    TwitterAuthProvider.TWITTER_SIGN_IN_METHOD = "twitter.com" /* TWITTER */;
    TwitterAuthProvider.PROVIDER_ID = "twitter.com" /* TWITTER */;
    return TwitterAuthProvider;
}(OAuthProvider));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signUp(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_UP, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var UserCredentialImpl = /** @class */ (function () {
    function UserCredentialImpl(params) {
        this.user = params.user;
        this.providerId = params.providerId;
        this._tokenResponse = params._tokenResponse;
        this.operationType = params.operationType;
    }
    UserCredentialImpl._fromIdTokenResponse = function (auth, operationType, idTokenResponse, isAnonymous) {
        if (isAnonymous === void 0) { isAnonymous = false; }
        return __awaiter(this, void 0, void 0, function () {
            var user, providerId, userCred;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, UserImpl._fromIdTokenResponse(auth, idTokenResponse, isAnonymous)];
                    case 1:
                        user = _a.sent();
                        providerId = providerIdForResponse(idTokenResponse);
                        userCred = new UserCredentialImpl({
                            user: user,
                            providerId: providerId,
                            _tokenResponse: idTokenResponse,
                            operationType: operationType
                        });
                        return [2 /*return*/, userCred];
                }
            });
        });
    };
    UserCredentialImpl._forOperation = function (user, operationType, response) {
        return __awaiter(this, void 0, void 0, function () {
            var providerId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, user._updateTokensIfNecessary(response, /* reload */ true)];
                    case 1:
                        _a.sent();
                        providerId = providerIdForResponse(response);
                        return [2 /*return*/, new UserCredentialImpl({
                                user: user,
                                providerId: providerId,
                                _tokenResponse: response,
                                operationType: operationType
                            })];
                }
            });
        });
    };
    return UserCredentialImpl;
}());
function providerIdForResponse(response) {
    if (response.providerId) {
        return response.providerId;
    }
    if ('phoneNumber' in response) {
        return "phone" /* PHONE */;
    }
    return null;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signInAnonymously(auth) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var response, userCredential;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if ((_a = auth.currentUser) === null || _a === void 0 ? void 0 : _a.isAnonymous) {
                        // If an anonymous user is already signed in, no need to sign them in again.
                        return [2 /*return*/, new UserCredentialImpl({
                                user: auth.currentUser,
                                providerId: null,
                                operationType: "signIn" /* SIGN_IN */
                            })];
                    }
                    return [4 /*yield*/, signUp(auth, {
                            returnSecureToken: true
                        })];
                case 1:
                    response = _b.sent();
                    return [4 /*yield*/, UserCredentialImpl._fromIdTokenResponse(_castAuth(auth), "signIn" /* SIGN_IN */, response, true)];
                case 2:
                    userCredential = _b.sent();
                    return [4 /*yield*/, auth.updateCurrentUser(userCredential.user)];
                case 3:
                    _b.sent();
                    return [2 /*return*/, userCredential];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MultiFactorError = /** @class */ (function (_super) {
    __extends(MultiFactorError, _super);
    function MultiFactorError(auth, error, operationType, credential, user) {
        var _this = _super.call(this, error.code, error.message) || this;
        _this.operationType = operationType;
        _this.credential = credential;
        _this.user = user;
        _this.name = 'FirebaseError';
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(_this, MultiFactorError.prototype);
        _this.appName = auth.name;
        _this.code = error.code;
        _this.tenantid = auth.tenantId;
        _this.serverResponse = error.serverResponse;
        return _this;
    }
    MultiFactorError._fromErrorAndCredential = function (auth, error, operationType, credential, user) {
        return new MultiFactorError(auth, error, operationType, credential, user);
    };
    return MultiFactorError;
}(FirebaseError));
function _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential, user) {
    var idTokenProvider = operationType === "reauthenticate" /* REAUTHENTICATE */
        ? credential._getReauthenticationResolver(auth)
        : credential._getIdTokenResponse(auth);
    return idTokenProvider.catch(function (error) {
        if (error.code === "auth/" + "multi-factor-auth-required" /* MFA_REQUIRED */) {
            throw MultiFactorError._fromErrorAndCredential(auth, error, operationType, credential, user);
        }
        throw error;
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Takes a set of UserInfo provider data and converts it to a set of names
 */
function providerDataAsNames(providerData) {
    return new Set(providerData
        .map(function (_a) {
        var providerId = _a.providerId;
        return providerId;
    })
        .filter(function (pid) { return !!pid; }));
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 *  This is the externally visible unlink function
 */
function unlink(userExtern, providerId) {
    return __awaiter(this, void 0, void 0, function () {
        var user, providerUserInfo, _a, _b, _c, providersLeft;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    user = userExtern;
                    return [4 /*yield*/, _assertLinkedStatus(true, user, providerId)];
                case 1:
                    _d.sent();
                    _a = deleteLinkedAccounts;
                    _b = [user.auth];
                    _c = {};
                    return [4 /*yield*/, user.getIdToken()];
                case 2: return [4 /*yield*/, _a.apply(void 0, _b.concat([(_c.idToken = _d.sent(),
                            _c.deleteProvider = [providerId],
                            _c)]))];
                case 3:
                    providerUserInfo = (_d.sent()).providerUserInfo;
                    providersLeft = providerDataAsNames(providerUserInfo || []);
                    user.providerData = user.providerData.filter(function (pd) {
                        return providersLeft.has(pd.providerId);
                    });
                    if (!providersLeft.has("phone" /* PHONE */)) {
                        user.phoneNumber = null;
                    }
                    return [4 /*yield*/, user.auth._persistUserIfCurrent(user)];
                case 4:
                    _d.sent();
                    return [2 /*return*/, user];
            }
        });
    });
}
/**
 * Internal-only link helper
 */
function _link(user, credential) {
    return __awaiter(this, void 0, void 0, function () {
        var response, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = (_a = credential)._linkToIdToken;
                    _c = [user.auth];
                    return [4 /*yield*/, user.getIdToken()];
                case 1: return [4 /*yield*/, _b.apply(_a, _c.concat([_d.sent()]))];
                case 2:
                    response = _d.sent();
                    return [2 /*return*/, UserCredentialImpl._forOperation(user, "link" /* LINK */, response)];
            }
        });
    });
}
function _assertLinkedStatus(expected, user, provider) {
    return __awaiter(this, void 0, void 0, function () {
        var providerIds, code;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _reloadWithoutSaving(user)];
                case 1:
                    _a.sent();
                    providerIds = providerDataAsNames(user.providerData);
                    code = expected === false
                        ? "provider-already-linked" /* PROVIDER_ALREADY_LINKED */
                        : "no-such-provider" /* NO_SUCH_PROVIDER */;
                    assert(providerIds.has(provider) === expected, code, {
                        appName: user.auth.name
                    });
                    return [2 /*return*/];
            }
        });
    });
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function _reauthenticate(user, credential) {
    return __awaiter(this, void 0, void 0, function () {
        var appName, operationType, response, parsed, localId, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    appName = user.auth.name;
                    operationType = "reauthenticate" /* REAUTHENTICATE */;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _processCredentialSavingMfaContextIfNecessary(user.auth, operationType, credential, user)];
                case 2:
                    response = _a.sent();
                    assert(response.idToken, "internal-error" /* INTERNAL_ERROR */, { appName: appName });
                    parsed = _parseToken(response.idToken);
                    assert(parsed, "internal-error" /* INTERNAL_ERROR */, { appName: appName });
                    localId = parsed.sub;
                    assert(user.uid === localId, "user-mismatch" /* USER_MISMATCH */, { appName: appName });
                    return [2 /*return*/, UserCredentialImpl._forOperation(user, operationType, response)];
                case 3:
                    e_1 = _a.sent();
                    // Convert user deleted error into user mismatch
                    if ((e_1 === null || e_1 === void 0 ? void 0 : e_1.code) === "auth/" + "user-not-found" /* USER_DELETED */) {
                        fail("user-mismatch" /* USER_MISMATCH */, { appName: appName });
                    }
                    throw e_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function _signInWithCredential(auth, credential) {
    return __awaiter(this, void 0, void 0, function () {
        var operationType, response, userCredential;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    operationType = "signIn" /* SIGN_IN */;
                    return [4 /*yield*/, _processCredentialSavingMfaContextIfNecessary(auth, operationType, credential)];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, UserCredentialImpl._fromIdTokenResponse(auth, operationType, response)];
                case 2:
                    userCredential = _a.sent();
                    return [4 /*yield*/, auth.updateCurrentUser(userCredential.user)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, userCredential];
            }
        });
    });
}
function signInWithCredential(auth, credential) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _signInWithCredential(_castAuth(auth), credential)];
        });
    });
}
function linkWithCredential(userExtern, credentialExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var user, credential;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    user = userExtern;
                    credential = credentialExtern;
                    return [4 /*yield*/, _assertLinkedStatus(false, user, credential.providerId)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, _link(user, credential)];
            }
        });
    });
}
function reauthenticateWithCredential(userExtern, credentialExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var credential, user;
        return __generator(this, function (_a) {
            credential = credentialExtern;
            user = userExtern;
            return [2 /*return*/, _reauthenticate(user, credential)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signInWithCustomToken(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performSignInRequest(auth, HttpMethod.POST, Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signInWithCustomToken$1(authExtern, customToken) {
    return __awaiter(this, void 0, void 0, function () {
        var response, auth, cred;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, signInWithCustomToken(authExtern, {
                        token: customToken
                    })];
                case 1:
                    response = _a.sent();
                    auth = _castAuth(authExtern);
                    return [4 /*yield*/, UserCredentialImpl._fromIdTokenResponse(auth, "signIn" /* SIGN_IN */, response)];
                case 2:
                    cred = _a.sent();
                    return [4 /*yield*/, auth.updateCurrentUser(cred.user)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, cred];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MultiFactorInfo = /** @class */ (function () {
    function MultiFactorInfo(factorId, response) {
        this.factorId = factorId;
        this.uid = response.mfaEnrollmentId;
        this.enrollmentTime = new Date(response.enrolledAt).toUTCString();
        this.displayName = response.displayName;
    }
    MultiFactorInfo._fromServerResponse = function (auth, enrollment) {
        if ('phoneInfo' in enrollment) {
            return PhoneMultiFactorInfo._fromServerResponse(auth, enrollment);
        }
        return fail("internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
    };
    return MultiFactorInfo;
}());
var PhoneMultiFactorInfo = /** @class */ (function (_super) {
    __extends(PhoneMultiFactorInfo, _super);
    function PhoneMultiFactorInfo(response) {
        var _this = _super.call(this, "phone" /* PHONE */, response) || this;
        _this.phoneNumber = response.phoneInfo;
        return _this;
    }
    PhoneMultiFactorInfo._fromServerResponse = function (_auth, enrollment) {
        return new PhoneMultiFactorInfo(enrollment);
    };
    return PhoneMultiFactorInfo;
}(MultiFactorInfo));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function setActionCodeSettingsOnRequest(request, actionCodeSettings) {
    request.continueUrl = actionCodeSettings.url;
    request.dynamicLinkDomain = actionCodeSettings.dynamicLinkDomain;
    request.canHandleCodeInApp = actionCodeSettings.handleCodeInApp;
    if (actionCodeSettings.iOS) {
        request.iosBundleId = actionCodeSettings.iOS.bundleId;
    }
    if (actionCodeSettings.android) {
        request.androidInstallApp = actionCodeSettings.android.installApp;
        request.androidMinimumVersionCode =
            actionCodeSettings.android.minimumVersion;
        request.androidPackageName = actionCodeSettings.android.packageName;
    }
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function sendPasswordResetEmail$1(auth, email, actionCodeSettings) {
    return __awaiter(this, void 0, void 0, function () {
        var request;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    request = {
                        requestType: "PASSWORD_RESET" /* PASSWORD_RESET */,
                        email: email
                    };
                    if (actionCodeSettings) {
                        setActionCodeSettingsOnRequest(request, actionCodeSettings);
                    }
                    return [4 /*yield*/, sendPasswordResetEmail(auth, request)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function confirmPasswordReset(auth, oobCode, newPassword) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, resetPassword(auth, {
                        oobCode: oobCode,
                        newPassword: newPassword
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function applyActionCode$1(auth, oobCode) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, applyActionCode(auth, { oobCode: oobCode })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function checkActionCode(auth, oobCode) {
    return __awaiter(this, void 0, void 0, function () {
        var response, operation, multiFactorInfo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, resetPassword(auth, { oobCode: oobCode })];
                case 1:
                    response = _a.sent();
                    operation = response.requestType;
                    assert(operation, "internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
                    switch (operation) {
                        case "EMAIL_SIGNIN" /* EMAIL_SIGNIN */:
                            break;
                        case "VERIFY_AND_CHANGE_EMAIL" /* VERIFY_AND_CHANGE_EMAIL */:
                            assert(response.newEmail, "internal-error" /* INTERNAL_ERROR */, {
                                appName: auth.name
                            });
                            break;
                        case "REVERT_SECOND_FACTOR_ADDITION" /* REVERT_SECOND_FACTOR_ADDITION */:
                            assert(response.mfaInfo, "internal-error" /* INTERNAL_ERROR */, {
                                appName: auth.name
                            });
                        // fall through
                        default:
                            assert(response.email, "internal-error" /* INTERNAL_ERROR */, {
                                appName: auth.name
                            });
                    }
                    multiFactorInfo = null;
                    if (response.mfaInfo) {
                        multiFactorInfo = MultiFactorInfo._fromServerResponse(auth, response.mfaInfo);
                    }
                    return [2 /*return*/, {
                            data: {
                                email: (response.requestType === "VERIFY_AND_CHANGE_EMAIL" /* VERIFY_AND_CHANGE_EMAIL */
                                    ? response.newEmail
                                    : response.email) || null,
                                previousEmail: (response.requestType === "VERIFY_AND_CHANGE_EMAIL" /* VERIFY_AND_CHANGE_EMAIL */
                                    ? response.email
                                    : response.newEmail) || null,
                                multiFactorInfo: multiFactorInfo
                            },
                            operation: operation
                        }];
            }
        });
    });
}
function verifyPasswordResetCode(auth, code) {
    return __awaiter(this, void 0, void 0, function () {
        var data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkActionCode(auth, code)];
                case 1:
                    data = (_a.sent()).data;
                    // Email should always be present since a code was sent to it
                    return [2 /*return*/, data.email];
            }
        });
    });
}
function createUserWithEmailAndPassword(auth, email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var response, userCredential;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, signUp(auth, {
                        returnSecureToken: true,
                        email: email,
                        password: password
                    })];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, UserCredentialImpl._fromIdTokenResponse(_castAuth(auth), "signIn" /* SIGN_IN */, response)];
                case 2:
                    userCredential = _a.sent();
                    return [4 /*yield*/, auth.updateCurrentUser(userCredential.user)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, userCredential];
            }
        });
    });
}
function signInWithEmailAndPassword(auth, email, password) {
    return signInWithCredential(auth, EmailAuthProvider.credential(email, password));
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function sendSignInLinkToEmail$1(auth, email, actionCodeSettings) {
    return __awaiter(this, void 0, void 0, function () {
        var request;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    request = {
                        requestType: "EMAIL_SIGNIN" /* EMAIL_SIGNIN */,
                        email: email
                    };
                    if (actionCodeSettings) {
                        setActionCodeSettingsOnRequest(request, actionCodeSettings);
                    }
                    return [4 /*yield*/, sendSignInLinkToEmail(auth, request)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function isSignInWithEmailLink(auth, emailLink) {
    var actionCodeUrl = ActionCodeURL.parseLink(emailLink);
    return (actionCodeUrl === null || actionCodeUrl === void 0 ? void 0 : actionCodeUrl.operation) === "EMAIL_SIGNIN" /* EMAIL_SIGNIN */;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function createAuthUri(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.CREATE_AUTH_URI, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function fetchSignInMethodsForEmail(auth, email) {
    return __awaiter(this, void 0, void 0, function () {
        var continueUri, request, signinMethods;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    continueUri = _isHttpOrHttps() ? _getCurrentUrl() : 'http://localhost';
                    request = {
                        identifier: email,
                        continueUri: continueUri
                    };
                    return [4 /*yield*/, createAuthUri(auth, request)];
                case 1:
                    signinMethods = (_a.sent()).signinMethods;
                    return [2 /*return*/, signinMethods || []];
            }
        });
    });
}
function sendEmailVerification$1(userExtern, actionCodeSettings) {
    return __awaiter(this, void 0, void 0, function () {
        var user, idToken, request, email;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    user = userExtern;
                    return [4 /*yield*/, user.getIdToken()];
                case 1:
                    idToken = _a.sent();
                    request = {
                        requestType: "VERIFY_EMAIL" /* VERIFY_EMAIL */,
                        idToken: idToken
                    };
                    if (actionCodeSettings) {
                        setActionCodeSettingsOnRequest(request, actionCodeSettings);
                    }
                    return [4 /*yield*/, sendEmailVerification(user.auth, request)];
                case 2:
                    email = (_a.sent()).email;
                    if (!(email !== user.email)) return [3 /*break*/, 4];
                    return [4 /*yield*/, user.reload()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function updateProfile(auth, request) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, _performApiRequest(auth, HttpMethod.POST, Endpoint.SET_ACCOUNT_INFO, request)];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function updateProfile$1(externUser, _a) {
    var displayName = _a.displayName, photoUrl = _a.photoURL;
    return __awaiter(this, void 0, void 0, function () {
        var user, idToken, profileRequest, response, passwordProvider;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (displayName === undefined && photoUrl === undefined) {
                        return [2 /*return*/];
                    }
                    user = externUser;
                    return [4 /*yield*/, user.getIdToken()];
                case 1:
                    idToken = _b.sent();
                    profileRequest = { idToken: idToken, displayName: displayName, photoUrl: photoUrl };
                    return [4 /*yield*/, updateProfile(user.auth, profileRequest)];
                case 2:
                    response = _b.sent();
                    user.displayName = response.displayName || null;
                    user.photoURL = response.photoUrl || null;
                    passwordProvider = user.providerData.find(function (_a) {
                        var providerId = _a.providerId;
                        return providerId === "password" /* PASSWORD */;
                    });
                    if (passwordProvider) {
                        passwordProvider.displayName = user.displayName;
                        passwordProvider.photoURL = user.photoURL;
                    }
                    return [4 /*yield*/, user._updateTokensIfNecessary(response)];
                case 3:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function updateEmail(externUser, newEmail) {
    var user = externUser;
    return updateEmailOrPassword(user, newEmail, null);
}
function updatePassword(externUser, newPassword) {
    var user = externUser;
    return updateEmailOrPassword(user, null, newPassword);
}
function updateEmailOrPassword(user, email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var auth, idToken, request, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    auth = user.auth;
                    return [4 /*yield*/, user.getIdToken()];
                case 1:
                    idToken = _a.sent();
                    request = { idToken: idToken };
                    if (email) {
                        request.email = email;
                    }
                    if (password) {
                        request.password = password;
                    }
                    return [4 /*yield*/, updateEmailPassword(auth, request)];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, user._updateTokensIfNecessary(response, /* reload */ true)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var GenericAdditionalUserInfo = /** @class */ (function () {
    function GenericAdditionalUserInfo(isNewUser, providerId, profile) {
        if (profile === void 0) { profile = {}; }
        this.isNewUser = isNewUser;
        this.providerId = providerId;
        this.profile = profile;
    }
    return GenericAdditionalUserInfo;
}());
var FederatedAdditionalUserInfoWithUsername = /** @class */ (function (_super) {
    __extends(FederatedAdditionalUserInfoWithUsername, _super);
    function FederatedAdditionalUserInfoWithUsername(isNewUser, providerId, profile, username) {
        var _this = _super.call(this, isNewUser, providerId, profile) || this;
        _this.username = username;
        return _this;
    }
    return FederatedAdditionalUserInfoWithUsername;
}(GenericAdditionalUserInfo));
var FacebookAdditionalUserInfo = /** @class */ (function (_super) {
    __extends(FacebookAdditionalUserInfo, _super);
    function FacebookAdditionalUserInfo(isNewUser, profile) {
        return _super.call(this, isNewUser, "facebook.com" /* FACEBOOK */, profile) || this;
    }
    return FacebookAdditionalUserInfo;
}(GenericAdditionalUserInfo));
var GithubAdditionalUserInfo = /** @class */ (function (_super) {
    __extends(GithubAdditionalUserInfo, _super);
    function GithubAdditionalUserInfo(isNewUser, profile) {
        return _super.call(this, isNewUser, "github.com" /* GITHUB */, profile, typeof (profile === null || profile === void 0 ? void 0 : profile.login) === 'string' ? profile === null || profile === void 0 ? void 0 : profile.login : null) || this;
    }
    return GithubAdditionalUserInfo;
}(FederatedAdditionalUserInfoWithUsername));
var GoogleAdditionalUserInfo = /** @class */ (function (_super) {
    __extends(GoogleAdditionalUserInfo, _super);
    function GoogleAdditionalUserInfo(isNewUser, profile) {
        return _super.call(this, isNewUser, "google.com" /* GOOGLE */, profile) || this;
    }
    return GoogleAdditionalUserInfo;
}(GenericAdditionalUserInfo));
var TwitterAdditionalUserInfo = /** @class */ (function (_super) {
    __extends(TwitterAdditionalUserInfo, _super);
    function TwitterAdditionalUserInfo(isNewUser, profile, screenName) {
        return _super.call(this, isNewUser, "twitter.com" /* TWITTER */, profile, screenName) || this;
    }
    return TwitterAdditionalUserInfo;
}(FederatedAdditionalUserInfoWithUsername));

var MultiFactorSessionType;
(function (MultiFactorSessionType) {
    MultiFactorSessionType["ENROLL"] = "enroll";
    MultiFactorSessionType["SIGN_IN"] = "signin";
})(MultiFactorSessionType || (MultiFactorSessionType = {}));
var MultiFactorSession = /** @class */ (function () {
    function MultiFactorSession(type, credential) {
        this.type = type;
        this.credential = credential;
    }
    MultiFactorSession._fromIdtoken = function (idToken) {
        return new MultiFactorSession(MultiFactorSessionType.ENROLL, idToken);
    };
    MultiFactorSession._fromMfaPendingCredential = function (mfaPendingCredential) {
        return new MultiFactorSession(MultiFactorSessionType.SIGN_IN, mfaPendingCredential);
    };
    MultiFactorSession.prototype.toJSON = function () {
        var _a;
        var key = this.type === MultiFactorSessionType.ENROLL
            ? 'idToken'
            : 'pendingCredential';
        return {
            multiFactorSession: (_a = {},
                _a[key] = this.credential,
                _a)
        };
    };
    MultiFactorSession.fromJSON = function (obj) {
        var _a, _b;
        if (obj === null || obj === void 0 ? void 0 : obj.multiFactorSession) {
            if ((_a = obj.multiFactorSession) === null || _a === void 0 ? void 0 : _a.pendingCredential) {
                return MultiFactorSession._fromMfaPendingCredential(obj.multiFactorSession.pendingCredential);
            }
            else if ((_b = obj.multiFactorSession) === null || _b === void 0 ? void 0 : _b.idToken) {
                return MultiFactorSession._fromIdtoken(obj.multiFactorSession.idToken);
            }
        }
        return null;
    };
    return MultiFactorSession;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MultiFactorResolver = /** @class */ (function () {
    function MultiFactorResolver(session, hints, signInResolver) {
        this.session = session;
        this.hints = hints;
        this.signInResolver = signInResolver;
    }
    MultiFactorResolver._fromError = function (auth, error) {
        var _this = this;
        var hints = (error.serverResponse.mfaInfo || []).map(function (enrollment) {
            return MultiFactorInfo._fromServerResponse(auth, enrollment);
        });
        var session = MultiFactorSession._fromMfaPendingCredential(error.serverResponse.mfaPendingCredential);
        return new MultiFactorResolver(session, hints, function (assertion) { return __awaiter(_this, void 0, void 0, function () {
            var mfaResponse, idTokenResponse, _a, userCredential;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, assertion._process(auth, session)];
                    case 1:
                        mfaResponse = _b.sent();
                        // Clear out the unneeded fields from the old login response
                        delete error.serverResponse.mfaInfo;
                        delete error.serverResponse.mfaPendingCredential;
                        idTokenResponse = __assign(__assign({}, error.serverResponse), { idToken: mfaResponse.idToken, refreshToken: mfaResponse.refreshToken });
                        _a = error.operationType;
                        switch (_a) {
                            case "signIn" /* SIGN_IN */: return [3 /*break*/, 2];
                            case "reauthenticate" /* REAUTHENTICATE */: return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 6];
                    case 2: return [4 /*yield*/, UserCredentialImpl._fromIdTokenResponse(_castAuth(auth), error.operationType, idTokenResponse)];
                    case 3:
                        userCredential = _b.sent();
                        return [4 /*yield*/, auth.updateCurrentUser(userCredential.user)];
                    case 4:
                        _b.sent();
                        return [2 /*return*/, userCredential];
                    case 5:
                        assert(error.user, "internal-error" /* INTERNAL_ERROR */, {
                            appName: auth.name
                        });
                        return [2 /*return*/, UserCredentialImpl._forOperation(error.user, error.operationType, idTokenResponse)];
                    case 6:
                        fail("internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
                        _b.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        }); });
    };
    MultiFactorResolver.prototype.resolveSignIn = function (assertionExtern) {
        return __awaiter(this, void 0, void 0, function () {
            var assertion;
            return __generator(this, function (_a) {
                assertion = assertionExtern;
                return [2 /*return*/, this.signInResolver(assertion)];
            });
        });
    };
    return MultiFactorResolver;
}());
function getMultiFactorResolver(auth, errorExtern) {
    var _a;
    var error = errorExtern;
    assert(error.operationType, "argument-error" /* ARGUMENT_ERROR */, {
        appName: auth.name
    });
    assert(error.credential, "argument-error" /* ARGUMENT_ERROR */, {
        appName: auth.name
    });
    assert((_a = error.serverResponse) === null || _a === void 0 ? void 0 : _a.mfaPendingCredential, "argument-error" /* ARGUMENT_ERROR */, { appName: auth.name });
    return MultiFactorResolver._fromError(auth, error);
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function startEnrollPhoneMfa(auth, request) {
    return _performApiRequest(auth, HttpMethod.POST, Endpoint.START_PHONE_MFA_ENROLLMENT, __assign({ tenantId: auth.tenantId }, request));
}
function finalizeEnrollPhoneMfa(auth, request) {
    return _performApiRequest(auth, HttpMethod.POST, Endpoint.FINALIZE_PHONE_MFA_ENROLLMENT, __assign({ tenantId: auth.tenantId }, request));
}
function withdrawMfa(auth, request) {
    return _performApiRequest(auth, HttpMethod.POST, Endpoint.WITHDRAW_MFA, __assign({ tenantId: auth.tenantId }, request));
}

var MultiFactorUser = /** @class */ (function () {
    function MultiFactorUser(user) {
        var _this = this;
        this.user = user;
        this.enrolledFactors = [];
        user._onReload(function (userInfo) {
            if (userInfo.mfaInfo) {
                _this.enrolledFactors = userInfo.mfaInfo.map(function (enrollment) {
                    return MultiFactorInfo._fromServerResponse(user.auth, enrollment);
                });
            }
        });
    }
    MultiFactorUser._fromUser = function (user) {
        return new MultiFactorUser(user);
    };
    MultiFactorUser.prototype.getSession = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = MultiFactorSession)._fromIdtoken;
                        return [4 /*yield*/, this.user.getIdToken()];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
    };
    MultiFactorUser.prototype.enroll = function (assertionExtern, displayName) {
        return __awaiter(this, void 0, void 0, function () {
            var assertion, session, finalizeMfaResponse;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        assertion = assertionExtern;
                        return [4 /*yield*/, this.getSession()];
                    case 1:
                        session = (_a.sent());
                        return [4 /*yield*/, assertion._process(this.user.auth, session, displayName)];
                    case 2:
                        finalizeMfaResponse = _a.sent();
                        // New tokens will be issued after enrollment of the new second factors.
                        // They need to be updated on the user.
                        return [4 /*yield*/, this.user._updateTokensIfNecessary(finalizeMfaResponse)];
                    case 3:
                        // New tokens will be issued after enrollment of the new second factors.
                        // They need to be updated on the user.
                        _a.sent();
                        // The user needs to be reloaded to get the new multi-factor information
                        // from server. USER_RELOADED event will be triggered and `enrolledFactors`
                        // will be updated.
                        return [2 /*return*/, this.user.reload()];
                }
            });
        });
    };
    MultiFactorUser.prototype.unenroll = function (infoOrUid) {
        return __awaiter(this, void 0, void 0, function () {
            var mfaEnrollmentId, idToken, idTokenResponse, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mfaEnrollmentId = typeof infoOrUid === 'string' ? infoOrUid : infoOrUid.uid;
                        return [4 /*yield*/, this.user.getIdToken()];
                    case 1:
                        idToken = _a.sent();
                        return [4 /*yield*/, withdrawMfa(this.user.auth, {
                                idToken: idToken,
                                mfaEnrollmentId: mfaEnrollmentId
                            })];
                    case 2:
                        idTokenResponse = _a.sent();
                        // Remove the second factor from the user's list.
                        this.enrolledFactors = this.enrolledFactors.filter(function (_a) {
                            var uid = _a.uid;
                            return uid !== mfaEnrollmentId;
                        });
                        // Depending on whether the backend decided to revoke the user's session,
                        // the tokenResponse may be empty. If the tokens were not updated (and they
                        // are now invalid), reloading the user will discover this and invalidate
                        // the user's state accordingly.
                        return [4 /*yield*/, this.user._updateTokensIfNecessary(idTokenResponse)];
                    case 3:
                        // Depending on whether the backend decided to revoke the user's session,
                        // the tokenResponse may be empty. If the tokens were not updated (and they
                        // are now invalid), reloading the user will discover this and invalidate
                        // the user's state accordingly.
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.user.reload()];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        e_1 = _a.sent();
                        if (e_1.code !== "auth/" + "user-token-expired" /* TOKEN_EXPIRED */) {
                            throw e_1;
                        }
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return MultiFactorUser;
}());
var multiFactorUserCache = new WeakMap();
function multiFactor(user) {
    if (!multiFactorUserCache.has(user)) {
        multiFactorUserCache.set(user, MultiFactorUser._fromUser(user));
    }
    return multiFactorUserCache.get(user);
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function isAvailable() {
    try {
        if (!this.storage) {
            return Promise.resolve(false);
        }
        this.storage.setItem(STORAGE_AVAILABLE_KEY, '1');
        this.storage.removeItem(STORAGE_AVAILABLE_KEY);
        return Promise.resolve(true);
    }
    catch (_a) {
        return Promise.resolve(false);
    }
}
function set(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
}
function get(key) {
    var json = this.storage.getItem(key);
    return Promise.resolve(json ? JSON.parse(json) : null);
}
function remove(key) {
    this.storage.removeItem(key);
    return Promise.resolve();
}
var BrowserLocalPersistence = /** @class */ (function () {
    function BrowserLocalPersistence() {
        this.type = PersistenceType.LOCAL;
        this.isAvailable = isAvailable;
        this.set = set;
        this.get = get;
        this.remove = remove;
        this.storage = localStorage;
    }
    BrowserLocalPersistence.type = 'LOCAL';
    return BrowserLocalPersistence;
}());
var BrowserSessionPersistence = /** @class */ (function () {
    function BrowserSessionPersistence() {
        this.type = PersistenceType.SESSION;
        this.isAvailable = isAvailable;
        this.set = set;
        this.get = get;
        this.remove = remove;
        this.storage = sessionStorage;
    }
    BrowserSessionPersistence.type = 'SESSION';
    return BrowserSessionPersistence;
}());
var browserLocalPersistence = BrowserLocalPersistence;
var browserSessionPersistence = BrowserSessionPersistence;

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DB_NAME = 'firebaseLocalStorageDb';
var DB_VERSION = 1;
var DB_OBJECTSTORE_NAME = 'firebaseLocalStorage';
var DB_DATA_KEYPATH = 'fbase_key';
/**
 * Promise wrapper for IDBRequest
 *
 * Unfortunately we can't cleanly extend Promise<T> since promises are not callable in ES6
 */
var DBPromise = /** @class */ (function () {
    function DBPromise(request) {
        this.request = request;
    }
    DBPromise.prototype.toPromise = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.request.addEventListener('success', function () {
                resolve(_this.request.result);
            });
            _this.request.addEventListener('error', function () {
                reject(_this.request.error);
            });
        });
    };
    return DBPromise;
}());
function getObjectStore(db, isReadWrite) {
    return db
        .transaction([DB_OBJECTSTORE_NAME], isReadWrite ? 'readwrite' : 'readonly')
        .objectStore(DB_OBJECTSTORE_NAME);
}
function deleteDatabase() {
    var request = indexedDB.deleteDatabase(DB_NAME);
    return new DBPromise(request).toPromise();
}
function openDatabase() {
    var _this = this;
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    return new Promise(function (resolve, reject) {
        request.addEventListener('error', function () {
            reject(request.error);
        });
        request.addEventListener('upgradeneeded', function () {
            var db = request.result;
            try {
                db.createObjectStore(DB_OBJECTSTORE_NAME, { keyPath: DB_DATA_KEYPATH });
            }
            catch (e) {
                reject(e);
            }
        });
        request.addEventListener('success', function () { return __awaiter(_this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        db = request.result;
                        if (!!db.objectStoreNames.contains(DB_OBJECTSTORE_NAME)) return [3 /*break*/, 2];
                        return [4 /*yield*/, deleteDatabase()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, openDatabase()];
                    case 2:
                        resolve(db);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); });
    });
}
function putObject(db, key, value) {
    return __awaiter(this, void 0, void 0, function () {
        var getRequest, data, request, request;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    getRequest = getObjectStore(db, false).get(key);
                    return [4 /*yield*/, new DBPromise(getRequest).toPromise()];
                case 1:
                    data = _b.sent();
                    if (data) {
                        // Force an index signature on the user object
                        data.value = value;
                        request = getObjectStore(db, true).put(data);
                        return [2 /*return*/, new DBPromise(request).toPromise()];
                    }
                    else {
                        request = getObjectStore(db, true).add((_a = {},
                            _a[DB_DATA_KEYPATH] = key,
                            _a.value = value,
                            _a));
                        return [2 /*return*/, new DBPromise(request).toPromise()];
                    }
            }
        });
    });
}
function getObject(db, key) {
    return __awaiter(this, void 0, void 0, function () {
        var request, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    request = getObjectStore(db, false).get(key);
                    return [4 /*yield*/, new DBPromise(request).toPromise()];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data === undefined ? null : data.value];
            }
        });
    });
}
function deleteObject(db, key) {
    var request = getObjectStore(db, true).delete(key);
    return new DBPromise(request).toPromise();
}
var IndexedDBLocalPersistence = /** @class */ (function () {
    function IndexedDBLocalPersistence() {
        this.type = PersistenceType.LOCAL;
    }
    IndexedDBLocalPersistence.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.db) {
                            return [2 /*return*/, this.db];
                        }
                        _a = this;
                        return [4 /*yield*/, openDatabase()];
                    case 1:
                        _a.db = _b.sent();
                        return [2 /*return*/, this.db];
                }
            });
        });
    };
    IndexedDBLocalPersistence.prototype.isAvailable = function () {
        return __awaiter(this, void 0, void 0, function () {
            var db, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        if (!indexedDB) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, openDatabase()];
                    case 1:
                        db = _b.sent();
                        return [4 /*yield*/, putObject(db, STORAGE_AVAILABLE_KEY, '1')];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, deleteObject(db, STORAGE_AVAILABLE_KEY)];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 4:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/, false];
                }
            });
        });
    };
    IndexedDBLocalPersistence.prototype.set = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initialize()];
                    case 1:
                        db = _a.sent();
                        return [2 /*return*/, putObject(db, key, value)];
                }
            });
        });
    };
    IndexedDBLocalPersistence.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var db, obj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initialize()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, getObject(db, key)];
                    case 2:
                        obj = _a.sent();
                        return [2 /*return*/, obj];
                }
            });
        });
    };
    IndexedDBLocalPersistence.prototype.remove = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initialize()];
                    case 1:
                        db = _a.sent();
                        return [2 /*return*/, deleteObject(db, key)];
                }
            });
        });
    };
    IndexedDBLocalPersistence.type = 'LOCAL';
    return IndexedDBLocalPersistence;
}());
var indexedDBLocalPersistence = IndexedDBLocalPersistence;

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function startSignInPhoneMfa(auth, request) {
    return _performApiRequest(auth, HttpMethod.POST, Endpoint.START_PHONE_MFA_SIGN_IN, __assign({ tenantId: auth.tenantId }, request));
}
function finalizeSignInPhoneMfa(auth, request) {
    return _performApiRequest(auth, HttpMethod.POST, Endpoint.FINALIZE_PHONE_MFA_SIGN_IN, __assign({ tenantId: auth.tenantId }, request));
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getRecaptchaParams(auth) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _performApiRequest(auth, HttpMethod.GET, Endpoint.GET_RECAPTCHA_PARAM)];
                case 1: return [2 /*return*/, ((_a.sent()).recaptchaSiteKey || '')];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Lazy accessor for window, since the compat layer won't tree shake this out,
 * we need to make sure not to mess with window unless we have to
 */
function _window() {
    return window;
}
function _setWindowLocation(url) {
    _window().location.href = url;
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getScriptParentElement() {
    var _a, _b;
    return (_b = (_a = document.getElementsByTagName('head')) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : document;
}
function _loadJS(url) {
    // TODO: consider adding timeout support & cancellation
    return new Promise(function (resolve, reject) {
        var el = document.createElement('script');
        el.setAttribute('src', url);
        el.onload = resolve;
        el.onerror = reject;
        el.type = 'text/javascript';
        el.charset = 'UTF-8';
        getScriptParentElement().appendChild(el);
    });
}
function _generateCallbackName(prefix) {
    return "__" + prefix + Math.floor(Math.random() * 1000000);
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _SOLVE_TIME_MS = 500;
var _EXPIRATION_TIME_MS = 60000;
var _WIDGET_ID_START = 1000000000000;
var MockReCaptcha = /** @class */ (function () {
    function MockReCaptcha(auth) {
        this.auth = auth;
        this.counter = _WIDGET_ID_START;
        this._widgets = new Map();
    }
    MockReCaptcha.prototype.render = function (container, parameters) {
        var id = this.counter;
        this._widgets.set(id, new MockWidget(container, this.auth.name, parameters || {}));
        this.counter++;
        return id;
    };
    MockReCaptcha.prototype.reset = function (optWidgetId) {
        var _a;
        var id = optWidgetId || _WIDGET_ID_START;
        void ((_a = this._widgets.get(id)) === null || _a === void 0 ? void 0 : _a.delete());
        this._widgets.delete(id);
    };
    MockReCaptcha.prototype.getResponse = function (optWidgetId) {
        var _a;
        var id = optWidgetId || _WIDGET_ID_START;
        return ((_a = this._widgets.get(id)) === null || _a === void 0 ? void 0 : _a.getResponse()) || '';
    };
    MockReCaptcha.prototype.execute = function (optWidgetId) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var id;
            return __generator(this, function (_b) {
                id = optWidgetId || _WIDGET_ID_START;
                void ((_a = this._widgets.get(id)) === null || _a === void 0 ? void 0 : _a.execute());
                return [2 /*return*/, ''];
            });
        });
    };
    return MockReCaptcha;
}());
var MockWidget = /** @class */ (function () {
    function MockWidget(containerOrId, appName, params) {
        var _this = this;
        this.params = params;
        this.timerId = null;
        this.deleted = false;
        this.responseToken = null;
        this.clickHandler = function () {
            _this.execute();
        };
        var container = typeof containerOrId === 'string'
            ? document.getElementById(containerOrId)
            : containerOrId;
        assert(container, "argument-error" /* ARGUMENT_ERROR */, { appName: appName });
        this.container = container;
        this.isVisible = this.params.size !== 'invisible';
        if (this.isVisible) {
            this.execute();
        }
        else {
            this.container.addEventListener('click', this.clickHandler);
        }
    }
    MockWidget.prototype.getResponse = function () {
        this.checkIfDeleted();
        return this.responseToken;
    };
    MockWidget.prototype.delete = function () {
        this.checkIfDeleted();
        this.deleted = true;
        if (this.timerId) {
            clearTimeout(this.timerId);
            this.timerId = null;
        }
        this.container.removeEventListener('click', this.clickHandler);
    };
    MockWidget.prototype.execute = function () {
        var _this = this;
        this.checkIfDeleted();
        if (this.timerId) {
            return;
        }
        this.timerId = window.setTimeout(function () {
            _this.responseToken = generateRandomAlphaNumericString(50);
            var _a = _this.params, callback = _a.callback, expiredCallback = _a["expired-callback"];
            if (callback) {
                try {
                    callback(_this.responseToken);
                }
                catch (e) { }
            }
            _this.timerId = window.setTimeout(function () {
                _this.timerId = null;
                _this.responseToken = null;
                if (expiredCallback) {
                    try {
                        expiredCallback();
                    }
                    catch (e) { }
                }
                if (_this.isVisible) {
                    _this.execute();
                }
            }, _EXPIRATION_TIME_MS);
        }, _SOLVE_TIME_MS);
    };
    MockWidget.prototype.checkIfDeleted = function () {
        if (this.deleted) {
            throw new Error('reCAPTCHA mock was already deleted!');
        }
    };
    return MockWidget;
}());
function generateRandomAlphaNumericString(len) {
    var chars = [];
    var allowedChars = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < len; i++) {
        chars.push(allowedChars.charAt(Math.floor(Math.random() * allowedChars.length)));
    }
    return chars.join('');
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// ReCaptcha will load using the same callback, so the callback function needs
// to be kept around
var _JSLOAD_CALLBACK = _generateCallbackName('rcb');
var NETWORK_TIMEOUT_DELAY = new Delay(30000, 60000);
var RECAPTCHA_BASE = 'https://www.google.com/recaptcha/api.js?';
/**
 * Loader for the GReCaptcha library. There should only ever be one of this.
 */
var ReCaptchaLoaderImpl = /** @class */ (function () {
    function ReCaptchaLoaderImpl() {
        this.hostLanguage = '';
        this.counter = 0;
        this.librarySeparatelyLoaded = !!_window().grecaptcha;
    }
    ReCaptchaLoaderImpl.prototype.load = function (auth, hl) {
        var _this = this;
        if (hl === void 0) { hl = ''; }
        if (this.shouldResolveImmediately(hl)) {
            return Promise.resolve(_window().grecaptcha);
        }
        return new Promise(function (resolve, reject) {
            var networkTimeout = _window().setTimeout(function () {
                reject(AUTH_ERROR_FACTORY.create("network-request-failed" /* NETWORK_REQUEST_FAILED */, {
                    appName: auth.name
                }));
            }, NETWORK_TIMEOUT_DELAY.get());
            _window()[_JSLOAD_CALLBACK] = function () {
                _window().clearTimeout(networkTimeout);
                delete _window()[_JSLOAD_CALLBACK];
                var recaptcha = _window().grecaptcha;
                if (!recaptcha) {
                    reject(AUTH_ERROR_FACTORY.create("internal-error" /* INTERNAL_ERROR */, {
                        appName: auth.name
                    }));
                    return;
                }
                // Wrap the greptcha render function so that we know if the developer has
                // called it separately
                var render = recaptcha.render;
                recaptcha.render = function (container, params) {
                    var widgetId = render(container, params);
                    _this.counter++;
                    return widgetId;
                };
                _this.hostLanguage = hl;
                resolve(recaptcha);
            };
            var url = RECAPTCHA_BASE + "?" + querystring({
                onload: _JSLOAD_CALLBACK,
                render: 'explicit',
                hl: hl
            });
            _loadJS(url).catch(function () {
                clearTimeout(networkTimeout);
                reject(AUTH_ERROR_FACTORY.create("internal-error" /* INTERNAL_ERROR */, {
                    appName: auth.name
                }));
            });
        });
    };
    ReCaptchaLoaderImpl.prototype.clearedOneInstance = function () {
        this.counter--;
    };
    ReCaptchaLoaderImpl.prototype.shouldResolveImmediately = function (hl) {
        // We can resolve immediately if:
        //   • grecaptcha is already defined AND (
        //     1. the requested language codes are the same OR
        //     2. there exists already a ReCaptcha on the page
        //     3. the library was already loaded by the app
        // In cases (2) and (3), we _can't_ reload as it would break the recaptchas
        // that are already in the page
        return (!!_window().grecaptcha &&
            (hl === this.hostLanguage ||
                this.counter > 0 ||
                this.librarySeparatelyLoaded));
    };
    return ReCaptchaLoaderImpl;
}());
var MockReCaptchaLoaderImpl = /** @class */ (function () {
    function MockReCaptchaLoaderImpl() {
    }
    MockReCaptchaLoaderImpl.prototype.load = function (auth) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new MockReCaptcha(auth)];
            });
        });
    };
    MockReCaptchaLoaderImpl.prototype.clearedOneInstance = function () { };
    return MockReCaptchaLoaderImpl;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var RECAPTCHA_VERIFIER_TYPE = 'recaptcha';
var DEFAULT_PARAMS = {
    theme: 'light',
    type: 'image'
};
var RecaptchaVerifier = /** @class */ (function () {
    function RecaptchaVerifier(containerOrId, parameters, auth) {
        if (parameters === void 0) { parameters = __assign({}, DEFAULT_PARAMS); }
        this.parameters = parameters;
        this.auth = auth;
        this.type = RECAPTCHA_VERIFIER_TYPE;
        this.destroyed = false;
        this.widgetId = null;
        this.tokenChangeListeners = new Set();
        this.renderPromise = null;
        this.recaptcha = null;
        this.appName = this.auth.name;
        this.isInvisible = this.parameters.size === 'invisible';
        assert(typeof document !== 'undefined', "operation-not-supported-in-this-environment" /* OPERATION_NOT_SUPPORTED */, { appName: this.appName });
        var container = typeof containerOrId === 'string'
            ? document.getElementById(containerOrId)
            : containerOrId;
        assert(container, "argument-error" /* ARGUMENT_ERROR */, { appName: this.appName });
        this.container = container;
        this.parameters.callback = this.makeTokenCallback(this.parameters.callback);
        this._recaptchaLoader = this.auth.settings.appVerificationDisabledForTesting
            ? new MockReCaptchaLoaderImpl()
            : new ReCaptchaLoaderImpl();
        this.validateStartingState();
        // TODO: Figure out if sdk version is needed
    }
    RecaptchaVerifier.prototype.verify = function () {
        return __awaiter(this, void 0, void 0, function () {
            var id, recaptcha, response;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.assertNotDestroyed();
                        return [4 /*yield*/, this.render()];
                    case 1:
                        id = _a.sent();
                        recaptcha = this.getAssertedRecaptcha();
                        response = recaptcha.getResponse(id);
                        if (response) {
                            return [2 /*return*/, response];
                        }
                        return [2 /*return*/, new Promise(function (resolve) {
                                var tokenChange = function (token) {
                                    if (!token) {
                                        return; // Ignore token expirations.
                                    }
                                    _this.tokenChangeListeners.delete(tokenChange);
                                    resolve(token);
                                };
                                _this.tokenChangeListeners.add(tokenChange);
                                if (_this.isInvisible) {
                                    recaptcha.execute(id);
                                }
                            })];
                }
            });
        });
    };
    RecaptchaVerifier.prototype.render = function () {
        var _this = this;
        try {
            this.assertNotDestroyed();
        }
        catch (e) {
            // This method returns a promise. Since it's not async (we want to return the
            // _same_ promise if rendering is still occurring), the API surface should
            // reject with the error rather than just throw
            return Promise.reject(e);
        }
        if (this.renderPromise) {
            return this.renderPromise;
        }
        this.renderPromise = this.makeRenderPromise().catch(function (e) {
            _this.renderPromise = null;
            throw e;
        });
        return this.renderPromise;
    };
    RecaptchaVerifier.prototype._reset = function () {
        this.assertNotDestroyed();
        if (this.widgetId !== null) {
            this.getAssertedRecaptcha().reset(this.widgetId);
        }
    };
    RecaptchaVerifier.prototype.clear = function () {
        var _this = this;
        this.assertNotDestroyed();
        this.destroyed = true;
        this._recaptchaLoader.clearedOneInstance();
        if (!this.isInvisible) {
            this.container.childNodes.forEach(function (node) {
                _this.container.removeChild(node);
            });
        }
    };
    RecaptchaVerifier.prototype.validateStartingState = function () {
        assert(!this.parameters.sitekey, "argument-error" /* ARGUMENT_ERROR */, {
            appName: this.appName
        });
        assert(this.isInvisible || !this.container.hasChildNodes(), "argument-error" /* ARGUMENT_ERROR */, { appName: this.appName });
    };
    RecaptchaVerifier.prototype.makeTokenCallback = function (existing) {
        var _this = this;
        return function (token) {
            _this.tokenChangeListeners.forEach(function (listener) { return listener(token); });
            if (typeof existing === 'function') {
                existing(token);
            }
            else if (typeof existing === 'string') {
                var globalFunc = _window()[existing];
                if (typeof globalFunc === 'function') {
                    globalFunc(token);
                }
            }
        };
    };
    RecaptchaVerifier.prototype.assertNotDestroyed = function () {
        assert(!this.destroyed, "internal-error" /* INTERNAL_ERROR */, {
            appName: this.appName
        });
    };
    RecaptchaVerifier.prototype.makeRenderPromise = function () {
        return __awaiter(this, void 0, void 0, function () {
            var container, guaranteedEmpty;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        if (!this.widgetId) {
                            container = this.container;
                            if (!this.isInvisible) {
                                guaranteedEmpty = document.createElement('div');
                                container.appendChild(guaranteedEmpty);
                                container = guaranteedEmpty;
                            }
                            this.widgetId = this.getAssertedRecaptcha().render(container, this.parameters);
                        }
                        return [2 /*return*/, this.widgetId];
                }
            });
        });
    };
    RecaptchaVerifier.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, siteKey;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        assert(_isHttpOrHttps() && !isWorker(), "internal-error" /* INTERNAL_ERROR */, {
                            appName: this.appName
                        });
                        return [4 /*yield*/, domReady()];
                    case 1:
                        _b.sent();
                        _a = this;
                        return [4 /*yield*/, this._recaptchaLoader.load(this.auth, this.auth.languageCode || undefined)];
                    case 2:
                        _a.recaptcha = _b.sent();
                        return [4 /*yield*/, getRecaptchaParams(this.auth)];
                    case 3:
                        siteKey = _b.sent();
                        assert(siteKey, "internal-error" /* INTERNAL_ERROR */, { appName: this.appName });
                        this.parameters.sitekey = siteKey;
                        return [2 /*return*/];
                }
            });
        });
    };
    RecaptchaVerifier.prototype.getAssertedRecaptcha = function () {
        assert(this.recaptcha, "internal-error" /* INTERNAL_ERROR */, {
            appName: this.appName
        });
        return this.recaptcha;
    };
    return RecaptchaVerifier;
}());
function isWorker() {
    return (typeof _window()['WorkerGlobalScope'] !== 'undefined' &&
        typeof _window()['importScripts'] === 'function');
}
function domReady() {
    var resolver = null;
    return new Promise(function (resolve) {
        if (document.readyState === 'complete') {
            resolve();
            return;
        }
        // Document not ready, wait for load before resolving.
        // Save resolver, so we can remove listener in case it was externally
        // cancelled.
        resolver = function () { return resolve(); };
        window.addEventListener('load', resolver);
    }).catch(function (e) {
        if (resolver) {
            window.removeEventListener('load', resolver);
        }
        throw e;
    });
}
/**
 *  Returns a verification ID to be used in conjunction with the SMS code that
 *  is sent.
 */
function _verifyPhoneNumber(auth, options, verifier) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var recaptchaToken, phoneInfoOptions, session, response, mfaEnrollmentId, response, sessionInfo;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, verifier.verify()];
                case 1:
                    recaptchaToken = _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, , 10, 11]);
                    assert(typeof recaptchaToken === 'string', "argument-error" /* ARGUMENT_ERROR */, {
                        appName: auth.name
                    });
                    assert(verifier.type === RECAPTCHA_VERIFIER_TYPE, "argument-error" /* ARGUMENT_ERROR */, { appName: auth.name });
                    phoneInfoOptions = void 0;
                    if (typeof options === 'string') {
                        phoneInfoOptions = {
                            phoneNumber: options
                        };
                    }
                    else {
                        phoneInfoOptions = options;
                    }
                    if (!('session' in phoneInfoOptions)) return [3 /*break*/, 7];
                    session = phoneInfoOptions.session;
                    if (!('phoneNumber' in phoneInfoOptions)) return [3 /*break*/, 4];
                    assert(session.type === MultiFactorSessionType.ENROLL, "internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
                    return [4 /*yield*/, startEnrollPhoneMfa(auth, {
                            idToken: session.credential,
                            phoneEnrollmentInfo: {
                                phoneNumber: phoneInfoOptions.phoneNumber,
                                recaptchaToken: recaptchaToken
                            }
                        })];
                case 3:
                    response = _b.sent();
                    return [2 /*return*/, response.phoneSessionInfo.sessionInfo];
                case 4:
                    assert(session.type === MultiFactorSessionType.SIGN_IN, "internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
                    mfaEnrollmentId = ((_a = phoneInfoOptions.multiFactorHint) === null || _a === void 0 ? void 0 : _a.uid) ||
                        phoneInfoOptions.multiFactorUid;
                    assert(mfaEnrollmentId, "missing-multi-factor-info" /* MISSING_MFA_INFO */, {
                        appName: auth.name
                    });
                    return [4 /*yield*/, startSignInPhoneMfa(auth, {
                            mfaPendingCredential: session.credential,
                            mfaEnrollmentId: mfaEnrollmentId,
                            phoneSignInInfo: {
                                recaptchaToken: recaptchaToken
                            }
                        })];
                case 5:
                    response = _b.sent();
                    return [2 /*return*/, response.phoneResponseInfo.sessionInfo];
                case 6: return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, sendPhoneVerificationCode(auth, {
                        phoneNumber: phoneInfoOptions.phoneNumber,
                        recaptchaToken: recaptchaToken
                    })];
                case 8:
                    sessionInfo = (_b.sent()).sessionInfo;
                    return [2 /*return*/, sessionInfo];
                case 9: return [3 /*break*/, 11];
                case 10:
                    verifier._reset();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function updatePhoneNumber(user, credential) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _link(user, credential)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PhoneAuthProvider = /** @class */ (function () {
    function PhoneAuthProvider(auth) {
        this.auth = auth;
        this.providerId = PhoneAuthProvider.PROVIDER_ID;
    }
    PhoneAuthProvider.prototype.verifyPhoneNumber = function (phoneOptions, applicationVerifier) {
        return _verifyPhoneNumber(this.auth, phoneOptions, applicationVerifier);
    };
    PhoneAuthProvider.credential = function (verificationId, verificationCode) {
        return PhoneAuthCredential._fromVerification(verificationId, verificationCode);
    };
    PhoneAuthProvider.credentialFromResult = function (userCredential) {
        var credential = userCredential;
        assert(credential._tokenResponse, "argument-error" /* ARGUMENT_ERROR */, {
            appName: credential.user.auth.name
        });
        var _a = credential._tokenResponse, phoneNumber = _a.phoneNumber, temporaryProof = _a.temporaryProof;
        if (phoneNumber && temporaryProof) {
            return PhoneAuthCredential._fromTokenResponse(phoneNumber, temporaryProof);
        }
        fail("argument-error" /* ARGUMENT_ERROR */, { appName: credential.user.auth.name });
    };
    PhoneAuthProvider.PROVIDER_ID = "phone" /* PHONE */;
    PhoneAuthProvider.PHONE_SIGN_IN_METHOD = "phone" /* PHONE */;
    return PhoneAuthProvider;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function _generateEventId(prefix) {
    return "" + (prefix ? prefix : '') + Math.floor(Math.random() * 1000000000);
}

/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Private implementation, not for public export
 */
var IdpCredential = /** @class */ (function (_super) {
    __extends(IdpCredential, _super);
    function IdpCredential(params) {
        var _this = _super.call(this, "custom" /* CUSTOM */, "custom" /* CUSTOM */) || this;
        _this.params = params;
        return _this;
    }
    IdpCredential.prototype._getIdTokenResponse = function (auth) {
        return signInWithIdp(auth, this._buildIdpRequest());
    };
    IdpCredential.prototype._linkToIdToken = function (auth, idToken) {
        return signInWithIdp(auth, this._buildIdpRequest(idToken));
    };
    IdpCredential.prototype._getReauthenticationResolver = function (auth) {
        return signInWithIdp(auth, this._buildIdpRequest());
    };
    IdpCredential.prototype._buildIdpRequest = function (idToken) {
        var request = {
            requestUri: this.params.requestUri,
            sessionId: this.params.sessionId,
            postBody: this.params.postBody || null,
            tenantId: this.params.tenantId,
            pendingToken: this.params.pendingToken,
            returnSecureToken: true
        };
        if (idToken) {
            request.idToken = idToken;
        }
        return request;
    };
    return IdpCredential;
}(AuthCredential));
function _signIn(params) {
    return _signInWithCredential(params.auth, new IdpCredential(params));
}
function _reauth(params) {
    var auth = params.auth, user = params.user;
    assert(user, "internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
    return _reauthenticate(user, new IdpCredential(params));
}
function _link$1(params) {
    return __awaiter(this, void 0, void 0, function () {
        var auth, user;
        return __generator(this, function (_a) {
            auth = params.auth, user = params.user;
            assert(user, "internal-error" /* INTERNAL_ERROR */, { appName: auth.name });
            return [2 /*return*/, _link(user, new IdpCredential(params))];
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Popup event manager. Handles the popup's entire lifecycle; listens to auth
 * events
 */
var AbstractPopupRedirectOperation = /** @class */ (function () {
    function AbstractPopupRedirectOperation(auth, filter, resolver, user) {
        this.auth = auth;
        this.resolver = resolver;
        this.user = user;
        this.pendingPromise = null;
        this.eventManager = null;
        this.filter = Array.isArray(filter) ? filter : [filter];
    }
    AbstractPopupRedirectOperation.prototype.execute = function () {
        var _this = this;
        return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
            var _a, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.pendingPromise = { resolve: resolve, reject: reject };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        _a = this;
                        return [4 /*yield*/, this.resolver._initialize(this.auth)];
                    case 2:
                        _a.eventManager = _b.sent();
                        return [4 /*yield*/, this.onExecution()];
                    case 3:
                        _b.sent();
                        this.eventManager.registerConsumer(this);
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _b.sent();
                        this.reject(e_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
    };
    AbstractPopupRedirectOperation.prototype.onAuthEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var urlResponse, sessionId, postBody, tenantId, error, type, params, _a, e_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        urlResponse = event.urlResponse, sessionId = event.sessionId, postBody = event.postBody, tenantId = event.tenantId, error = event.error, type = event.type;
                        if (error) {
                            this.reject(error);
                            return [2 /*return*/];
                        }
                        params = {
                            auth: this.auth,
                            requestUri: urlResponse,
                            sessionId: sessionId,
                            tenantId: tenantId || undefined,
                            postBody: postBody || undefined,
                            user: this.user
                        };
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        _a = this.resolve;
                        return [4 /*yield*/, this.getIdpTask(type)(params)];
                    case 2:
                        _a.apply(this, [_b.sent()]);
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _b.sent();
                        this.reject(e_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AbstractPopupRedirectOperation.prototype.onError = function (error) {
        this.reject(error);
    };
    AbstractPopupRedirectOperation.prototype.getIdpTask = function (type) {
        switch (type) {
            case "signInViaPopup" /* SIGN_IN_VIA_POPUP */:
            case "signInViaRedirect" /* SIGN_IN_VIA_REDIRECT */:
                return _signIn;
            case "linkViaPopup" /* LINK_VIA_POPUP */:
            case "linkViaRedirect" /* LINK_VIA_REDIRECT */:
                return _link$1;
            case "reauthViaPopup" /* REAUTH_VIA_POPUP */:
            case "reauthViaRedirect" /* REAUTH_VIA_REDIRECT */:
                return _reauth;
            default:
                fail("internal-error" /* INTERNAL_ERROR */, { appName: this.auth.name });
        }
    };
    AbstractPopupRedirectOperation.prototype.resolve = function (cred) {
        debugAssert(this.pendingPromise, 'Pending promise was never set');
        this.pendingPromise.resolve(cred);
        this.unregisterAndCleanUp();
    };
    AbstractPopupRedirectOperation.prototype.reject = function (error) {
        debugAssert(this.pendingPromise, 'Pending promise was never set');
        this.pendingPromise.reject(error);
        this.unregisterAndCleanUp();
    };
    AbstractPopupRedirectOperation.prototype.unregisterAndCleanUp = function () {
        if (this.eventManager) {
            this.eventManager.unregisterConsumer(this);
        }
        this.pendingPromise = null;
        this.cleanUp();
    };
    return AbstractPopupRedirectOperation;
}());

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// The event timeout is the same on mobile and desktop, no need for Delay.
var _AUTH_EVENT_TIMEOUT = 2020;
var _POLL_WINDOW_CLOSE_TIMEOUT = new Delay(2000, 10000);
function signInWithPopup(auth, provider, resolverExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var resolver, action;
        return __generator(this, function (_a) {
            resolver = _getInstance(resolverExtern);
            action = new PopupOperation(_castAuth(auth), "signInViaPopup" /* SIGN_IN_VIA_POPUP */, provider, resolver);
            return [2 /*return*/, action.executeNotNull()];
        });
    });
}
function reauthenticateWithPopup(userExtern, provider, resolverExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var user, resolver, action;
        return __generator(this, function (_a) {
            user = userExtern;
            resolver = _getInstance(resolverExtern);
            action = new PopupOperation(user.auth, "reauthViaPopup" /* REAUTH_VIA_POPUP */, provider, resolver, user);
            return [2 /*return*/, action.executeNotNull()];
        });
    });
}
function linkWithPopup(userExtern, provider, resolverExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var user, resolver, action;
        return __generator(this, function (_a) {
            user = userExtern;
            resolver = _getInstance(resolverExtern);
            action = new PopupOperation(user.auth, "linkViaPopup" /* LINK_VIA_POPUP */, provider, resolver, user);
            return [2 /*return*/, action.executeNotNull()];
        });
    });
}
/**
 * Popup event manager. Handles the popup's entire lifecycle; listens to auth
 * events
 */
var PopupOperation = /** @class */ (function (_super) {
    __extends(PopupOperation, _super);
    function PopupOperation(auth, filter, provider, resolver, user) {
        var _this = _super.call(this, auth, filter, resolver, user) || this;
        _this.provider = provider;
        _this.authWindow = null;
        _this.pollId = null;
        if (PopupOperation.currentPopupAction) {
            PopupOperation.currentPopupAction.cancel();
        }
        PopupOperation.currentPopupAction = _this;
        return _this;
    }
    PopupOperation.prototype.executeNotNull = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.execute()];
                    case 1:
                        result = _a.sent();
                        assert(result, "internal-error" /* INTERNAL_ERROR */, { appName: this.auth.name });
                        return [2 /*return*/, result];
                }
            });
        });
    };
    PopupOperation.prototype.onExecution = function () {
        return __awaiter(this, void 0, void 0, function () {
            var eventId, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debugAssert(this.filter.length === 1, 'Popup operations only handle one event');
                        eventId = _generateEventId();
                        _a = this;
                        return [4 /*yield*/, this.resolver._openPopup(this.auth, this.provider, this.filter[0], // There's always one, see constructor
                            eventId)];
                    case 1:
                        _a.authWindow = _b.sent();
                        this.authWindow.associatedEvent = eventId;
                        // Handle user closure. Notice this does *not* use await
                        this.pollUserCancellation(this.auth.name);
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(PopupOperation.prototype, "eventId", {
        get: function () {
            var _a;
            return ((_a = this.authWindow) === null || _a === void 0 ? void 0 : _a.associatedEvent) || null;
        },
        enumerable: false,
        configurable: true
    });
    PopupOperation.prototype.cancel = function () {
        this.reject(AUTH_ERROR_FACTORY.create("cancelled-popup-request" /* EXPIRED_POPUP_REQUEST */, {
            appName: this.auth.name
        }));
    };
    PopupOperation.prototype.cleanUp = function () {
        if (this.authWindow) {
            this.authWindow.close();
        }
        if (this.pollId) {
            window.clearTimeout(this.pollId);
        }
        this.authWindow = null;
        this.pollId = null;
        PopupOperation.currentPopupAction = null;
    };
    PopupOperation.prototype.pollUserCancellation = function (appName) {
        var _this = this;
        var poll = function () {
            var _a, _b;
            if ((_b = (_a = _this.authWindow) === null || _a === void 0 ? void 0 : _a.window) === null || _b === void 0 ? void 0 : _b.closed) {
                // Make sure that there is sufficient time for whatever action to
                // complete. The window could have closed but the sign in network
                // call could still be in flight.
                _this.pollId = window.setTimeout(function () {
                    _this.pollId = null;
                    _this.reject(AUTH_ERROR_FACTORY.create("popup-closed-by-user" /* POPUP_CLOSED_BY_USER */, {
                        appName: appName
                    }));
                }, _AUTH_EVENT_TIMEOUT);
                return;
            }
            _this.pollId = window.setTimeout(poll, _POLL_WINDOW_CLOSE_TIMEOUT.get());
        };
        poll();
    };
    // Only one popup is ever shown at once. The lifecycle of the current popup
    // can be managed / cancelled by the constructor.
    PopupOperation.currentPopupAction = null;
    return PopupOperation;
}(AbstractPopupRedirectOperation));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function signInWithRedirect(auth, provider, resolverExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var resolver;
        return __generator(this, function (_a) {
            resolver = _getInstance(resolverExtern);
            return [2 /*return*/, resolver._openRedirect(auth, provider, "signInViaRedirect" /* SIGN_IN_VIA_REDIRECT */)];
        });
    });
}
function reauthenticateWithRedirect(userExtern, provider, resolverExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var user, resolver, eventId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    user = userExtern;
                    resolver = _getInstance(resolverExtern);
                    return [4 /*yield*/, prepareUserForRedirect(user.auth, user)];
                case 1:
                    eventId = _a.sent();
                    return [2 /*return*/, resolver._openRedirect(user.auth, provider, "reauthViaRedirect" /* REAUTH_VIA_REDIRECT */, eventId)];
            }
        });
    });
}
function linkWithRedirect(userExtern, provider, resolverExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var user, resolver, eventId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    user = userExtern;
                    resolver = _getInstance(resolverExtern);
                    return [4 /*yield*/, _assertLinkedStatus(false, user, provider.providerId)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, prepareUserForRedirect(user.auth, user)];
                case 2:
                    eventId = _a.sent();
                    return [2 /*return*/, resolver._openRedirect(user.auth, provider, "linkViaRedirect" /* LINK_VIA_REDIRECT */, eventId)];
            }
        });
    });
}
function getRedirectResult(authExtern, resolverExtern) {
    return __awaiter(this, void 0, void 0, function () {
        var auth, resolver, action, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    auth = _castAuth(authExtern);
                    resolver = _getInstance(resolverExtern);
                    action = new RedirectAction(auth, resolver);
                    return [4 /*yield*/, action.execute()];
                case 1:
                    result = _a.sent();
                    if (!result) return [3 /*break*/, 4];
                    delete result.user._redirectEventId;
                    return [4 /*yield*/, auth._persistUserIfCurrent(result.user)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, auth._setRedirectUser(null, resolverExtern)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/, result];
            }
        });
    });
}
function prepareUserForRedirect(auth, user) {
    return __awaiter(this, void 0, void 0, function () {
        var eventId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    eventId = _generateEventId(user.uid + ":::");
                    user._redirectEventId = eventId;
                    return [4 /*yield*/, user.auth._setRedirectUser(user)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, auth._persistUserIfCurrent(user)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, eventId];
            }
        });
    });
}
// We only get one redirect outcome for any one auth, so just store it
// in here.
var redirectOutcomeMap = new Map();
var RedirectAction = /** @class */ (function (_super) {
    __extends(RedirectAction, _super);
    function RedirectAction(auth, resolver) {
        var _this = _super.call(this, auth, [
            "signInViaRedirect" /* SIGN_IN_VIA_REDIRECT */,
            "linkViaRedirect" /* LINK_VIA_REDIRECT */,
            "reauthViaRedirect" /* REAUTH_VIA_REDIRECT */,
            "unknown" /* UNKNOWN */
        ], resolver) || this;
        _this.eventId = null;
        return _this;
    }
    /**
     * Override the execute function; if we already have a redirect result, then
     * just return it.
     */
    RedirectAction.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            var readyOutcome, result_1, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        readyOutcome = redirectOutcomeMap.get(this.auth._key());
                        if (!!readyOutcome) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, _super.prototype.execute.call(this)];
                    case 2:
                        result_1 = _a.sent();
                        readyOutcome = function () { return Promise.resolve(result_1); };
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        readyOutcome = function () { return Promise.reject(e_1); };
                        return [3 /*break*/, 4];
                    case 4:
                        redirectOutcomeMap.set(this.auth._key(), readyOutcome);
                        _a.label = 5;
                    case 5: return [2 /*return*/, readyOutcome()];
                }
            });
        });
    };
    RedirectAction.prototype.onAuthEvent = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (event.type === "signInViaRedirect" /* SIGN_IN_VIA_REDIRECT */) {
                            return [2 /*return*/, _super.prototype.onAuthEvent.call(this, event)];
                        }
                        else if (event.type === "unknown" /* UNKNOWN */) {
                            // This is a sentinel value indicating there's no pending redirect
                            this.resolve(null);
                            return [2 /*return*/];
                        }
                        if (!event.eventId) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.auth._redirectUserForId(event.eventId)];
                    case 1:
                        user = _a.sent();
                        if (user) {
                            this.user = user;
                            return [2 /*return*/, _super.prototype.onAuthEvent.call(this, event)];
                        }
                        else {
                            this.resolve(null);
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    RedirectAction.prototype.onExecution = function () {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    RedirectAction.prototype.cleanUp = function () { };
    return RedirectAction;
}(AbstractPopupRedirectOperation));

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var AuthEventManager = /** @class */ (function () {
    function AuthEventManager(appName) {
        this.appName = appName;
        this.consumers = new Set();
        this.queuedRedirectEvent = null;
        this.hasHandledPotentialRedirect = false;
    }
    AuthEventManager.prototype.registerConsumer = function (authEventConsumer) {
        this.consumers.add(authEventConsumer);
        if (this.queuedRedirectEvent &&
            this.isEventForConsumer(this.queuedRedirectEvent, authEventConsumer)) {
            this.sendToConsumer(this.queuedRedirectEvent, authEventConsumer);
            this.queuedRedirectEvent = null;
        }
    };
    AuthEventManager.prototype.unregisterConsumer = function (authEventConsumer) {
        this.consumers.delete(authEventConsumer);
    };
    AuthEventManager.prototype.onEvent = function (event) {
        var _this = this;
        var handled = false;
        this.consumers.forEach(function (consumer) {
            if (_this.isEventForConsumer(event, consumer)) {
                handled = true;
                _this.sendToConsumer(event, consumer);
            }
        });
        if (this.hasHandledPotentialRedirect || !isRedirectEvent(event)) {
            // If we've already seen a redirect before, or this is a popup event,
            // bail now
            return handled;
        }
        this.hasHandledPotentialRedirect = true;
        // If the redirect wasn't handled, hang on to it
        if (!handled) {
            this.queuedRedirectEvent = event;
            handled = true;
        }
        return handled;
    };
    AuthEventManager.prototype.sendToConsumer = function (event, consumer) {
        var _a;
        if (event.error && !isNullRedirectEvent(event)) {
            var code = ((_a = event.error.code) === null || _a === void 0 ? void 0 : _a.split('auth/')[1]) ||
                "internal-error" /* INTERNAL_ERROR */;
            consumer.onError(AUTH_ERROR_FACTORY.create(code, {
                appName: this.appName
            }));
        }
        else {
            consumer.onAuthEvent(event);
        }
    };
    AuthEventManager.prototype.isEventForConsumer = function (event, consumer) {
        var eventIdMatches = consumer.eventId === null ||
            (!!event.eventId && event.eventId === consumer.eventId);
        return consumer.filter.includes(event.type) && eventIdMatches;
    };
    return AuthEventManager;
}());
function isNullRedirectEvent(_a) {
    var type = _a.type, error = _a.error;
    return (type === "unknown" /* UNKNOWN */ &&
        (error === null || error === void 0 ? void 0 : error.code) === "auth/" + "no-auth-event" /* NO_AUTH_EVENT */);
}
function isRedirectEvent(event) {
    switch (event.type) {
        case "signInViaRedirect" /* SIGN_IN_VIA_REDIRECT */:
        case "linkViaRedirect" /* LINK_VIA_REDIRECT */:
        case "reauthViaRedirect" /* REAUTH_VIA_REDIRECT */:
            return true;
        case "unknown" /* UNKNOWN */:
            return isNullRedirectEvent(event);
        default:
            return false;
    }
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var CHROME_IOS_UA = 'crios/';
var FIREFOX_UA = 'firefox/';
var IPHONE_UA = 'iphone';
var IPOD_UA = 'ipod';
var IPAD_UA = 'ipad';
function _isFirefox(ua) {
    return ua.includes(FIREFOX_UA);
}
function _isChromeIOS(ua) {
    return ua.includes(CHROME_IOS_UA);
}
function _isIOS(ua) {
    return ua.includes(IPHONE_UA) || ua.includes(IPOD_UA) || ua.includes(IPAD_UA);
}
function _isIOSStandalone(ua) {
    var _a;
    return _isIOS(ua) && !!((_a = window.navigator) === null || _a === void 0 ? void 0 : _a.standalone);
}

/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var BASE_POPUP_OPTIONS = {
    location: 'yes',
    resizable: 'yes',
    statusbar: 'yes',
    toolbar: 'no'
};
var DEFAULT_WIDTH = 500;
var DEFAULT_HEIGHT = 600;
var TARGET_BLANK = '_blank';
var FIREFOX_EMPTY_URL = 'http://localhost';
var AuthPopup = /** @class */ (function () {
    function AuthPopup(window) {
        this.window = window;
        this.associatedEvent = null;
    }
    AuthPopup.prototype.close = function () {
        if (this.window) {
            try {
                this.window.close();
            }
            catch (e) { }
        }
    };
    return AuthPopup;
}());
function _open(appName, url, name, width, height) {
    if (width === void 0) { width = DEFAULT_WIDTH; }
    if (height === void 0) { height = DEFAULT_HEIGHT; }
    var top = Math.min((window.screen.availHeight - height) / 2, 0).toString();
    var left = Math.min((window.screen.availWidth - width) / 2, 0).toString();
    var target = '';
    var options = __assign(__assign({}, BASE_POPUP_OPTIONS), { width: width.toString(), height: height.toString(), top: top,
        left: left });
    // Chrome iOS 7 and 8 is returning an undefined popup win when target is
    // specified, even though the popup is not necessarily blocked.
    var ua = getUA().toLowerCase();
    if (name) {
        target = _isChromeIOS(ua) ? TARGET_BLANK : name;
    }
    if (_isFirefox(ua)) {
        // Firefox complains when invalid URLs are popped out. Hacky way to bypass.
        url = url || FIREFOX_EMPTY_URL;
        // Firefox disables by default scrolling on popup windows, which can create
        // issues when the user has many Google accounts, for instance.
        options.scrollbars = 'yes';
    }
    var optionsString = Object.entries(options).reduce(function (accum, _a) {
        var key = _a[0], value = _a[1];
        return "" + accum + key + "=" + value + ",";
    }, '');
    if (_isIOSStandalone(ua) && target !== '_self') {
        openAsNewWindowIOS(url || '', target);
        return new AuthPopup(null);
    }
    // about:blank getting sanitized causing browsers like IE/Edge to display
    // brief error message before redirecting to handler.
    var newWin = window.open(url || '', target, optionsString);
    assert(newWin, "popup-blocked" /* POPUP_BLOCKED */, { appName: appName });
    // Flaky on IE edge, encapsulate with a try and catch.
    try {
        newWin.focus();
    }
    catch (e) { }
    return new AuthPopup(newWin);
}
function openAsNewWindowIOS(url, target) {
    var el = document.createElement('a');
    el.href = url;
    el.target = target;
    var click = document.createEvent('MouseEvent');
    click.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 1, null);
    el.dispatchEvent(click);
}

/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var NETWORK_TIMEOUT = new Delay(30000, 60000);
var LOADJS_CALLBACK_PREFIX = 'iframefcb';
/**
 * Reset unlaoded GApi modules. If gapi.load fails due to a network error,
 * it will stop working after a retrial. This is a hack to fix this issue.
 */
function resetUnloadedGapiModules() {
    // Clear last failed gapi.load state to force next gapi.load to first
    // load the failed gapi.iframes module.
    // Get gapix.beacon context.
    var beacon = _window().___jsl;
    // Get current hint.
    if (beacon === null || beacon === void 0 ? void 0 : beacon.H) {
        // Get gapi hint.
        for (var _i = 0, _a = Object.keys(beacon.H); _i < _a.length; _i++) {
            var hint = _a[_i];
            // Requested modules.
            beacon.H[hint].r = beacon.H[hint].r || [];
            // Loaded modules.
            beacon.H[hint].L = beacon.H[hint].L || [];
            // Set requested modules to a copy of the loaded modules.
            beacon.H[hint].r = __spreadArrays(beacon.H[hint].L);
            // Clear pending callbacks.
            if (beacon.CP) {
                for (var i = 0; i < beacon.CP.length; i++) {
                    // Remove all failed pending callbacks.
                    beacon.CP[i] = null;
                }
            }
        }
    }
}
function loadGapi(auth) {
    return new Promise(function (resolve, reject) {
        var _a, _b, _c;
        // Function to run when gapi.load is ready.
        function loadGapiIframe() {
            // The developer may have tried to previously run gapi.load and failed.
            // Run this to fix that.
            resetUnloadedGapiModules();
            gapi.load('gapi.iframes', {
                callback: function () {
                    resolve(gapi.iframes.getContext());
                },
                ontimeout: function () {
                    // The above reset may be sufficient, but having this reset after
                    // failure ensures that if the developer calls gapi.load after the
                    // connection is re-established and before another attempt to embed
                    // the iframe, it would work and would not be broken because of our
                    // failed attempt.
                    // Timeout when gapi.iframes.Iframe not loaded.
                    resetUnloadedGapiModules();
                    reject(AUTH_ERROR_FACTORY.create("network-request-failed" /* NETWORK_REQUEST_FAILED */, {
                        appName: auth.name
                    }));
                },
                timeout: NETWORK_TIMEOUT.get()
            });
        }
        if ((_b = (_a = _window().gapi) === null || _a === void 0 ? void 0 : _a.iframes) === null || _b === void 0 ? void 0 : _b.Iframe) {
            // If gapi.iframes.Iframe available, resolve.
            resolve(gapi.iframes.getContext());
        }
        else if (!!((_c = _window().gapi) === null || _c === void 0 ? void 0 : _c.load)) {
            // Gapi loader ready, load gapi.iframes.
            loadGapiIframe();
        }
        else {
            // Create a new iframe callback when this is called so as not to overwrite
            // any previous defined callback. This happens if this method is called
            // multiple times in parallel and could result in the later callback
            // overwriting the previous one. This would end up with a iframe
            // timeout.
            var cbName = _generateCallbackName(LOADJS_CALLBACK_PREFIX);
            // GApi loader not available, dynamically load platform.js.
            _window()[cbName] = function () {
                // GApi loader should be ready.
                if (!!gapi.load) {
                    loadGapiIframe();
                }
                else {
                    // Gapi loader failed, throw error.
                    reject(AUTH_ERROR_FACTORY.create("network-request-failed" /* NETWORK_REQUEST_FAILED */, {
                        appName: auth.name
                    }));
                }
            };
            // Load GApi loader.
            return _loadJS("https://apis.google.com/js/api.js?onload=" + cbName);
        }
    }).catch(function (error) {
        // Reset cached promise to allow for retrial.
        cachedGApiLoader = null;
        throw error;
    });
}
var cachedGApiLoader = null;
function _loadGapi(auth) {
    cachedGApiLoader = cachedGApiLoader || loadGapi(auth);
    return cachedGApiLoader;
}

/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PING_TIMEOUT = new Delay(5000, 15000);
var IFRAME_ATTRIBUTES = {
    style: {
        position: 'absolute',
        top: '-100px',
        width: '1px',
        height: '1px'
    }
};
function getIframeUrl(auth) {
    var url = "https://" + auth.config.authDomain + "/__/auth/iframe";
    var params = {
        apiKey: auth.config.apiKey,
        appName: auth.name,
        v: SDK_VERSION
    };
    // Can pass 'eid' as one of 'p' (production), 's' (staging), or 't' (test)
    // TODO: do we care about frameworks? pass them as fw=
    return url + "?" + querystring(params).slice(1);
}
function _openIframe(auth) {
    return __awaiter(this, void 0, void 0, function () {
        var context;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _loadGapi(auth)];
                case 1:
                    context = _a.sent();
                    return [2 /*return*/, context.open({
                            where: document.body,
                            url: getIframeUrl(auth),
                            messageHandlersFilter: _window().gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
                            attributes: IFRAME_ATTRIBUTES,
                            dontclear: true
                        }, function (iframe) {
                            return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                                // Clear timer and resolve pending iframe ready promise.
                                function clearTimerAndResolve() {
                                    _window().clearTimeout(networkErrorTimer);
                                    resolve(iframe);
                                }
                                var networkError, networkErrorTimer;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, iframe.restyle({
                                                // Prevent iframe from closing on mouse out.
                                                setHideOnLeave: false
                                            })];
                                        case 1:
                                            _a.sent();
                                            networkError = AUTH_ERROR_FACTORY.create("network-request-failed" /* NETWORK_REQUEST_FAILED */, {
                                                appName: auth.name
                                            });
                                            networkErrorTimer = _window().setTimeout(function () {
                                                reject(networkError);
                                            }, PING_TIMEOUT.get());
                                            // This returns an IThenable. However the reject part does not call
                                            // when the iframe is not loaded.
                                            iframe.ping(clearTimerAndResolve).then(clearTimerAndResolve, function () {
                                                reject(networkError);
                                            });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                        })];
            }
        });
    });
}

/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * URL for Authentication widget which will initiate the OAuth handshake
 */
var WIDGET_URL = '__/auth/handler';
var BrowserPopupRedirectResolver = /** @class */ (function () {
    function BrowserPopupRedirectResolver() {
        this.eventManagers = {};
        this._redirectPersistence = browserSessionPersistence;
    }
    // Wrapping in async even though we don't await anywhere in order
    // to make sure errors are raised as promise rejections
    BrowserPopupRedirectResolver.prototype._openPopup = function (auth, provider, authType, eventId) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var url;
            return __generator(this, function (_b) {
                debugAssert((_a = this.eventManagers[auth._key()]) === null || _a === void 0 ? void 0 : _a.manager, '_initialize() not called before _openPopup()');
                url = getRedirectUrl(auth, provider, authType, eventId);
                return [2 /*return*/, _open(auth.name, url, _generateEventId())];
            });
        });
    };
    BrowserPopupRedirectResolver.prototype._openRedirect = function (auth, provider, authType, eventId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                _setWindowLocation(getRedirectUrl(auth, provider, authType, eventId));
                return [2 /*return*/, new Promise(function () { })];
            });
        });
    };
    BrowserPopupRedirectResolver.prototype._initialize = function (auth) {
        var key = auth._key();
        if (this.eventManagers[key]) {
            var _a = this.eventManagers[key], manager = _a.manager, promise_1 = _a.promise;
            if (manager) {
                return Promise.resolve(manager);
            }
            else {
                debugAssert(promise_1, 'If manager is not set, promise should be');
                return promise_1;
            }
        }
        var promise = this.initAndGetManager(auth);
        this.eventManagers[key] = { promise: promise };
        return promise;
    };
    BrowserPopupRedirectResolver.prototype.initAndGetManager = function (auth) {
        return __awaiter(this, void 0, void 0, function () {
            var iframe, manager;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _openIframe(auth)];
                    case 1:
                        iframe = _a.sent();
                        manager = new AuthEventManager(auth.name);
                        iframe.register('authEvent', function (_a) {
                            var authEvent = _a.authEvent;
                            // TODO: Consider splitting redirect and popup events earlier on
                            var handled = manager.onEvent(authEvent);
                            return { status: handled ? "ACK" /* ACK */ : "ERROR" /* ERROR */ };
                        }, gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
                        this.eventManagers[auth._key()] = { manager: manager };
                        return [2 /*return*/, manager];
                }
            });
        });
    };
    return BrowserPopupRedirectResolver;
}());
var browserPopupRedirectResolver = BrowserPopupRedirectResolver;
function getRedirectUrl(auth, provider, authType, eventId) {
    assert(auth.config.authDomain, "auth-domain-config-required" /* MISSING_AUTH_DOMAIN */, {
        appName: auth.name
    });
    assert(auth.config.apiKey, "invalid-api-key" /* INVALID_API_KEY */, {
        appName: auth.name
    });
    var params = {
        apiKey: auth.config.apiKey,
        appName: auth.name,
        authType: authType,
        redirectUrl: _getCurrentUrl(),
        v: SDK_VERSION,
        eventId: eventId
    };
    if (provider instanceof OAuthProvider) {
        provider.setDefaultLanguage(auth.languageCode);
        params.providerId = provider.providerId || '';
        if (!isEmpty(provider.getCustomParameters())) {
            params.customParameters = JSON.stringify(provider.getCustomParameters());
        }
        var scopes = provider.getScopes().filter(function (scope) { return scope !== ''; });
        if (scopes.length > 0) {
            params.scopes = scopes.join(',');
        }
        // TODO set additionalParams?
        // let additionalParams = provider.getAdditionalParams();
        // for (let key in additionalParams) {
        //   if (!params.hasOwnProperty(key)) {
        //     params[key] = additionalParams[key]
        //   }
        // }
    }
    if (auth.tenantId) {
        params.tid = auth.tenantId;
    }
    for (var _i = 0, _a = Object.keys(params); _i < _a.length; _i++) {
        var key = _a[_i];
        if (params[key] === undefined) {
            delete params[key];
        }
    }
    // TODO: maybe set eid as endipointId
    // TODO: maybe set fw as Frameworks.join(",")
    var url = new URL("https://" + auth.config.authDomain + "/" + WIDGET_URL + "?" + querystring(params).slice(1));
    return url.toString();
}

var MultiFactorAssertion = /** @class */ (function () {
    function MultiFactorAssertion(factorId) {
        this.factorId = factorId;
    }
    MultiFactorAssertion.prototype._process = function (auth, session, displayName) {
        switch (session.type) {
            case MultiFactorSessionType.ENROLL:
                return this._finalizeEnroll(auth, session.credential, displayName);
            case MultiFactorSessionType.SIGN_IN:
                return this._finalizeSignIn(auth, session.credential);
            default:
                return debugFail('unexpected MultiFactorSessionType');
        }
    };
    return MultiFactorAssertion;
}());

var PhoneMultiFactorAssertion = /** @class */ (function (_super) {
    __extends(PhoneMultiFactorAssertion, _super);
    function PhoneMultiFactorAssertion(credential) {
        var _this = _super.call(this, credential.providerId) || this;
        _this.credential = credential;
        return _this;
    }
    PhoneMultiFactorAssertion._fromCredential = function (credential) {
        return new PhoneMultiFactorAssertion(credential);
    };
    PhoneMultiFactorAssertion.prototype._finalizeEnroll = function (auth, idToken, displayName) {
        return finalizeEnrollPhoneMfa(auth, {
            idToken: idToken,
            displayName: displayName,
            phoneVerificationInfo: this.credential._makeVerificationRequest()
        });
    };
    PhoneMultiFactorAssertion.prototype._finalizeSignIn = function (auth, mfaPendingCredential) {
        return finalizeSignInPhoneMfa(auth, {
            mfaPendingCredential: mfaPendingCredential,
            phoneVerificationInfo: this.credential._makeVerificationRequest()
        });
    };
    return PhoneMultiFactorAssertion;
}(MultiFactorAssertion));
var PhoneMultiFactorGenerator = /** @class */ (function () {
    function PhoneMultiFactorGenerator() {
    }
    PhoneMultiFactorGenerator.assertion = function (credential) {
        return PhoneMultiFactorAssertion._fromCredential(credential);
    };
    return PhoneMultiFactorGenerator;
}());

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var initializeAuth = _initializeAuthForClientPlatform(ClientPlatform.BROWSER);
registerVersion(name, version$2);

/*
 * @license
 * Copyright 2017 Google LLC All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

const config = {
  apiKey: "AIzaSyBiZZGDrwJ0vkWjb9_XXthN83MpS51hn8s",
  authDomain: "fir-auth-next-demo.firebaseapp.com",
  databaseURL: "https://fir-auth-next-demo.firebaseio.com",
  projectId: "fir-auth-next-demo",
  storageBucket: "fir-auth-next-demo.appspot.com",
  messagingSenderId: "693392113359",
  appId: "1:693392113359:web:928efa4a7295f5eacc41ba"
};

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Fix for IE8 when developer's console is not opened.
if (!window.console) {
  window.console = {
    log() {},
    error() {}
  };
}

/**
 * Logs the message in the console and on the log window in the app
 * using the level given.
 * @param {?Object} message Object or message to log.
 * @param {string} level The level of log (log, error, debug).
 * @private
 */
function logAtLevel_(message, level) {
  if (message != null) {
    const messageDiv = $('<div></div>');
    messageDiv.addClass(level);
    if (typeof message === 'object') {
      messageDiv.text(JSON.stringify(message, null, '  '));
    } else {
      messageDiv.text(message);
    }
    $('.logs').append(messageDiv);
  }
  console[level](message);
}

/**
 * Logs info level.
 * @param {string} message Object or message to log.
 */
function log(message) {
  logAtLevel_(message, 'log');
}

/**
 * Clear the logs.
 */
function clearLogs() {
  $('.logs').text('');
}

/**
 * Displays for a few seconds a box with a specific message and then fades
 * it out.
 * @param {string} message Small message to display.
 * @param {string} cssClass The class(s) to give the alert box.
 * @private
 */
function alertMessage_(message, cssClass) {
  const alertBox = $('<div></div>')
    .addClass(cssClass)
    .css('display', 'none')
    .text(message);
  // When modals are visible, display the alert in the modal layer above the
  // grey background.
  const visibleModal = $('.modal.in');
  if (visibleModal.size() > 0) {
    // Check first if the model has an overlaying-alert. If not, append the
    // overlaying-alert container.
    if (visibleModal.find('.overlaying-alert').size() === 0) {
      const $overlayingAlert = $(
        '<div class="container-fluid overlaying-alert"></div>'
      );
      visibleModal.append($overlayingAlert);
    }
    visibleModal.find('.overlaying-alert').prepend(alertBox);
  } else {
    $('#alert-messages').prepend(alertBox);
  }
  alertBox.fadeIn({
    complete() {
      setTimeout(() => {
        alertBox.slideUp(400, () => {
          // On completion, remove the alert element from the DOM.
          alertBox.remove();
        });
      }, 3000);
    }
  });
}

/**
 * Alerts a small success message in a overlaying alert box.
 * @param {string} message Small message to display.
 */
function alertSuccess(message) {
  alertMessage_(message, 'alert alert-success');
}

/**
 * Alerts a small error message in a overlaying alert box.
 * @param {string} message Small message to display.
 */
function alertError(message) {
  alertMessage_(message, 'alert alert-danger');
}

function alertNotImplemented() {
  alertError('Method not yet implemented in the new SDK');
}

/* eslint-disable import/no-extraneous-dependencies */

let app = null;
let auth = null;
let currentTab = null;
let lastUser = null;
let applicationVerifier = null;
let multiFactorErrorResolver = null;
let selectedMultiFactorHint = null;
let recaptchaSize = 'normal';
let webWorker = null;

// The corresponding Font Awesome icons for each provider.
const providersIcons = {
  'google.com': 'fa-google',
  'facebook.com': 'fa-facebook-official',
  'twitter.com': 'fa-twitter-square',
  'github.com': 'fa-github',
  'yahoo.com': 'fa-yahoo',
  'phone': 'fa-phone'
};

/**
 * Returns the active user (i.e. currentUser or lastUser).
 * @return {!firebase.User}
 */
function activeUser() {
  const type = $('input[name=toggle-user-selection]:checked').val();
  if (type === 'lastUser') {
    return lastUser;
  } else {
    return auth.currentUser;
  }
}

/**
 * Refreshes the current user data in the UI, displaying a user info box if
 * a user is signed in, or removing it.
 */
function refreshUserData() {
  if (activeUser()) {
    const user = activeUser();
    $('.profile').show();
    $('body').addClass('user-info-displayed');
    $('div.profile-email,span.profile-email').text(user.email || 'No Email');
    $('div.profile-phone,span.profile-phone').text(
      user.phoneNumber || 'No Phone'
    );
    $('div.profile-uid,span.profile-uid').text(user.uid);
    $('div.profile-name,span.profile-name').text(user.displayName || 'No Name');
    $('input.profile-name').val(user.displayName);
    $('input.photo-url').val(user.photoURL);
    if (user.photoURL != null) {
      let photoURL = user.photoURL;
      // Append size to the photo URL for Google hosted images to avoid requesting
      // the image with its original resolution (using more bandwidth than needed)
      // when it is going to be presented in smaller size.
      if (
        photoURL.indexOf('googleusercontent.com') !== -1 ||
        photoURL.indexOf('ggpht.com') !== -1
      ) {
        photoURL = photoURL + '?sz=' + $('img.profile-image').height();
      }
      $('img.profile-image').attr('src', photoURL).show();
    } else {
      $('img.profile-image').hide();
    }
    $('.profile-email-verified').toggle(user.emailVerified);
    $('.profile-email-not-verified').toggle(!user.emailVerified);
    $('.profile-anonymous').toggle(user.isAnonymous);
    // Display/Hide providers icons.
    $('.profile-providers').empty();
    if (user['providerData'] && user['providerData'].length) {
      const providersCount = user['providerData'].length;
      for (let i = 0; i < providersCount; i++) {
        addProviderIcon(user['providerData'][i]['providerId']);
      }
    }
    // Show enrolled second factors if available for the active user.
    showMultiFactorStatus(user);
    // Change color.
    if (user === auth.currentUser) {
      $('#user-info').removeClass('last-user');
      $('#user-info').addClass('current-user');
    } else {
      $('#user-info').removeClass('current-user');
      $('#user-info').addClass('last-user');
    }
  } else {
    $('.profile').slideUp();
    $('body').removeClass('user-info-displayed');
    $('input.profile-data').val('');
  }
}

/**
 * Sets last signed in user and updates UI.
 * @param {?firebase.User} user The last signed in user.
 */
function setLastUser(user) {
  lastUser = user;
  if (user) {
    // Displays the toggle.
    $('#toggle-user').show();
    $('#toggle-user-placeholder').hide();
  } else {
    $('#toggle-user').hide();
    $('#toggle-user-placeholder').show();
  }
}

/**
 * Add a provider icon to the profile info.
 * @param {string} providerId The providerId of the provider.
 */
function addProviderIcon(providerId) {
  const pElt = $('<i>')
    .addClass('fa ' + providersIcons[providerId])
    .attr('title', providerId)
    .data({
      'toggle': 'tooltip',
      'placement': 'bottom'
    });
  $('.profile-providers').append(pElt);
  pElt.tooltip();
}

/**
 * Updates the active user's multi-factor enrollment status.
 * @param {!firebase.User} activeUser The corresponding user.
 */
function showMultiFactorStatus(activeUser) {
  mfaUser = multiFactor(activeUser);
  const enrolledFactors = (mfaUser && mfaUser.enrolledFactors) || [];
  const $listGroup = $('#user-info .dropdown-menu.enrolled-second-factors');
  // Hide the drop down menu initially.
  $listGroup.empty().parent().hide();
  if (enrolledFactors.length) {
    // If enrolled factors are available, show the drop down menu.
    $listGroup.parent().show();
    // Populate the enrolled factors.
    showMultiFactors(
      $listGroup,
      enrolledFactors,
      // On row click, do nothing. This is needed to prevent the drop down
      // menu from closing.
      e => {
        e.preventDefault();
        e.stopPropagation();
      },
      // On delete click unenroll the selected factor.
      function (e) {
        e.preventDefault();
        // Get the corresponding second factor index.
        const index = parseInt($(this).attr('data-index'), 10);
        // Get the second factor info.
        const info = enrolledFactors[index];
        // Get the display name. If not available, use uid.
        const label = info && (info.displayName || info.uid);
        if (label) {
          $('#enrolled-factors-drop-down').removeClass('open');
          mfaUser.unenroll(info).then(() => {
            refreshUserData();
            alertSuccess('Multi-factor successfully unenrolled.');
          }, onAuthError);
        }
      }
    );
  }
}

/**
 * Updates the UI when the user is successfully authenticated.
 * @param {!firebase.User} user User authenticated.
 */
function onAuthSuccess(user) {
  console.log(user);
  alertSuccess('User authenticated, id: ' + user.uid);
  refreshUserData();
}

/**
 * Displays an error message when the authentication failed.
 * @param {!Error} error Error message to display.
 */
function onAuthError(error) {
  logAtLevel_(error, 'error');
  if (error.code === 'auth/multi-factor-auth-required') {
    // Handle second factor sign-in.
    handleMultiFactorSignIn(getMultiFactorResolver(auth, error));
  } else {
    alertError('Error: ' + error.code);
  }
}

/**
 * Changes the UI when the user has been signed out.
 */
function signOut() {
  log('User successfully signed out.');
  alertSuccess('User successfully signed out.');
  refreshUserData();
}

/**
 * Saves the new language code provided in the language code input field.
 */
function onSetLanguageCode() {
  const languageCode = $('#language-code').val() || null;
  try {
    auth.languageCode = languageCode;
    alertSuccess('Language code changed to "' + languageCode + '".');
  } catch (error) {
    alertError('Error: ' + error.code);
  }
}

/**
 * Switches Auth instance language to device language.
 */
function onUseDeviceLanguage() {
  auth.useDeviceLanguage();
  $('#language-code').val(auth.languageCode);
  alertSuccess('Using device language "' + auth.languageCode + '".');
}

/**
 * Changes the Auth state persistence to the specified one.
 */
function onSetPersistence() {
  const type = $('#persistence-type').val();
  let persistence;
  switch (type) {
    case 'local':
      persistence = browserLocalPersistence;
      break;
    case 'session':
      persistence = browserSessionPersistence;
      break;
    case 'indexedDB':
      persistence = indexedDBLocalPersistence;
      break;
    case 'none':
      persistence = inMemoryPersistence;
      break;
    default:
      alertError('Unexpected persistence type: ' + type);
  }
  try {
    auth.setPersistence(persistence).then(
      () => {
        log('Persistence state change to "' + type + '".');
        alertSuccess('Persistence state change to "' + type + '".');
      },
      error => {
        alertError('Error: ' + error.code);
      }
    );
  } catch (error) {
    alertError('Error: ' + error.code);
  }
}

/**
 * Signs up a new user with an email and a password.
 */
function onSignUp() {
  const email = $('#signup-email').val();
  const password = $('#signup-password').val();
  createUserWithEmailAndPassword(auth, email, password).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Signs in a user with an email and a password.
 */
function onSignInWithEmailAndPassword() {
  const email = $('#signin-email').val();
  const password = $('#signin-password').val();
  signInWithEmailAndPassword(auth, email, password).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Signs in a user with an email link.
 */
function onSignInWithEmailLink() {
  const email = $('#sign-in-with-email-link-email').val();
  const link = $('#sign-in-with-email-link-link').val() || undefined;
  if (isSignInWithEmailLink(auth, link)) {
    signInWithEmailLink(auth, email, link).then(onAuthSuccess, onAuthError);
  } else {
    alertError('Sign in link is invalid');
  }
}

/**
 * Links a user with an email link.
 */
function onLinkWithEmailLink() {
  const email = $('#link-with-email-link-email').val();
  const link = $('#link-with-email-link-link').val() || undefined;
  const credential = EmailAuthProvider.credentialWithLink(email, link);
  linkWithCredential(activeUser(), credential).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Re-authenticate a user with email link credential.
 */
function onReauthenticateWithEmailLink() {
  const email = $('#link-with-email-link-email').val();
  const link = $('#link-with-email-link-link').val() || undefined;
  const credential = EmailAuthProvider.credentialWithLink(email, link);
  reauthenticateWithCredential(activeUser(), credential).then(result => {
    logAdditionalUserInfo(result);
    refreshUserData();
    alertSuccess('User reauthenticated!');
  }, onAuthError);
}

/**
 * Signs in with a custom token.
 * @param {DOMEvent} _event HTML DOM event returned by the listener.
 */
function onSignInWithCustomToken(_event) {
  // The token can be directly specified on the html element.
  const token = $('#user-custom-token').val();

  signInWithCustomToken$1(auth, token).then(
    onAuthUserCredentialSuccess,
    onAuthError
  );
}

/**
 * Signs in anonymously.
 */
function onSignInAnonymously() {
  signInAnonymously(auth).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Signs in with a generic IdP credential.
 */
function onSignInWithGenericIdPCredential() {
  alertNotImplemented();
  // var providerId = $('#signin-generic-idp-provider-id').val();
  // var idToken = $('#signin-generic-idp-id-token').val() || undefined;
  // var rawNonce = $('#signin-generic-idp-raw-nonce').val() || undefined;
  // var accessToken = $('#signin-generic-idp-access-token').val() || undefined;
  // var provider = new OAuthProvider(providerId);
  // signInWithCredential(
  //     auth,
  //     provider.credential({
  //       idToken: idToken,
  //       accessToken: accessToken,
  //       rawNonce: rawNonce,
  //     })).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Initializes the ApplicationVerifier.
 * @param {string} submitButtonId The ID of the DOM element of the button to
 *     which we attach the invisible reCAPTCHA. This is required even in visible
 *     mode.
 */
function makeApplicationVerifier(submitButtonId) {
  const container =
    recaptchaSize === 'invisible' ? submitButtonId : 'recaptcha-container';
  applicationVerifier = new RecaptchaVerifier(
    container,
    { 'size': recaptchaSize },
    auth
  );
}

/**
 * Clears the ApplicationVerifier.
 */
function clearApplicationVerifier() {
  if (applicationVerifier) {
    applicationVerifier.clear();
    applicationVerifier = null;
  }
}

/**
 * Sends a phone number verification code for sign-in.
 */
function onSignInVerifyPhoneNumber() {
  const phoneNumber = $('#signin-phone-number').val();
  const provider = new PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // link/re-auth operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('signin-verify-phone-number');
  provider.verifyPhoneNumber(phoneNumber, applicationVerifier).then(
    verificationId => {
      clearApplicationVerifier();
      $('#signin-phone-verification-id').val(verificationId);
      alertSuccess('Phone verification sent!');
    },
    error => {
      clearApplicationVerifier();
      onAuthError(error);
    }
  );
}

/**
 * Confirms a phone number verification for sign-in.
 */
function onSignInConfirmPhoneVerification() {
  const verificationId = $('#signin-phone-verification-id').val();
  const verificationCode = $('#signin-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  signInOrLinkCredential(credential);
}

/**
 * Sends a phone number verification code for linking or reauth.
 */
function onLinkReauthVerifyPhoneNumber() {
  const phoneNumber = $('#link-reauth-phone-number').val();
  const provider = new PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // sign-in operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('link-reauth-verify-phone-number');
  provider.verifyPhoneNumber(phoneNumber, applicationVerifier).then(
    verificationId => {
      clearApplicationVerifier();
      $('#link-reauth-phone-verification-id').val(verificationId);
      alertSuccess('Phone verification sent!');
    },
    error => {
      clearApplicationVerifier();
      onAuthError(error);
    }
  );
}

/**
 * Updates the user's phone number.
 */
function onUpdateConfirmPhoneVerification() {
  if (!activeUser()) {
    alertError('You need to sign in before linking an account.');
    return;
  }
  const verificationId = $('#link-reauth-phone-verification-id').val();
  const verificationCode = $('#link-reauth-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  updatePhoneNumber(activeUser(), credential)
    .then(() => {
      refreshUserData();
      alertSuccess('Phone number updated!');
    }, onAuthError);
}

/**
 * Confirms a phone number verification for linking.
 */
function onLinkConfirmPhoneVerification() {
  const verificationId = $('#link-reauth-phone-verification-id').val();
  const verificationCode = $('#link-reauth-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  signInOrLinkCredential(credential);
}

/**
 * Confirms a phone number verification for reauthentication.
 */
function onReauthConfirmPhoneVerification() {
  const verificationId = $('#link-reauth-phone-verification-id').val();
  const verificationCode = $('#link-reauth-phone-verification-code').val();
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  reauthenticateWithCredential(activeUser(), credential).then(result => {
    logAdditionalUserInfo(result);
    refreshUserData();
    alertSuccess('User reauthenticated!');
  }, onAuthError);
}

/**
 * Sends a phone number verification code for enrolling second factor.
 */
function onStartEnrollWithPhoneMultiFactor() {
  const phoneNumber = $('#enroll-mfa-phone-number').val();
  if (!phoneNumber || !activeUser()) {
    return;
  }
  const provider = new PhoneAuthProvider(auth);
  // Clear existing reCAPTCHA as an existing reCAPTCHA could be targeted for a
  // sign-in operation.
  clearApplicationVerifier();
  // Initialize a reCAPTCHA application verifier.
  makeApplicationVerifier('enroll-mfa-verify-phone-number');
  multiFactor(activeUser())
    .getSession()
    .then(multiFactorSession => {
      const phoneInfoOptions = {
        phoneNumber,
        'session': multiFactorSession
      };
      return provider.verifyPhoneNumber(phoneInfoOptions, applicationVerifier);
    })
    .then(
      verificationId => {
        clearApplicationVerifier();
        $('#enroll-mfa-phone-verification-id').val(verificationId);
        alertSuccess('Phone verification sent!');
      },
      error => {
        clearApplicationVerifier();
        onAuthError(error);
      }
    );
}

/**
 * Confirms a phone number verification for MFA enrollment.
 */
function onFinalizeEnrollWithPhoneMultiFactor() {
  const verificationId = $('#enroll-mfa-phone-verification-id').val();
  const verificationCode = $('#enroll-mfa-phone-verification-code').val();
  if (!verificationId || !verificationCode || !activeUser()) {
    return;
  }
  const credential = PhoneAuthProvider.credential(
    verificationId,
    verificationCode
  );
  const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
  const displayName = $('#enroll-mfa-phone-display-name').val() || undefined;

  multiFactor(activeUser())
    .enroll(multiFactorAssertion, displayName)
    .then(() => {
      refreshUserData();
      alertSuccess('Phone number enrolled!');
    }, onAuthError);
}

/**
 * Signs in or links a provider's credential, based on current tab opened.
 * @param {!AuthCredential} credential The provider's credential.
 */
function signInOrLinkCredential(credential) {
  if (currentTab === '#user-section') {
    if (!activeUser()) {
      alertError('You need to sign in before linking an account.');
      return;
    }

    linkWithCredential(activeUser(), credential).then(result => {
      logAdditionalUserInfo(result);
      refreshUserData();
      alertSuccess('Provider linked!');
    }, onAuthError);
  } else {
    signInWithCredential(auth, credential).then(
      onAuthUserCredentialSuccess,
      onAuthError
    );
  }
}

/** @return {!Object} The Action Code Settings object. */
function getActionCodeSettings() {
  const actionCodeSettings = {};
  const url = $('#continueUrl').val();
  const apn = $('#apn').val();
  const amv = $('#amv').val();
  const ibi = $('#ibi').val();
  const installApp = $('input[name=install-app]:checked').val() === 'Yes';
  const handleCodeInApp =
    $('input[name=handle-in-app]:checked').val() === 'Yes';
  if (url || apn || ibi) {
    actionCodeSettings['url'] = url;
    if (apn) {
      actionCodeSettings['android'] = {
        'packageName': apn,
        'installApp': !!installApp,
        'minimumVersion': amv || undefined
      };
    }
    if (ibi) {
      actionCodeSettings['iOS'] = {
        'bundleId': ibi
      };
    }
    actionCodeSettings['handleCodeInApp'] = handleCodeInApp;
  }
  return actionCodeSettings;
}

/** Reset action code settings form. */
function onActionCodeSettingsReset() {
  $('#continueUrl').val('');
  $('#apn').val('');
  $('#amv').val('');
  $('#ibi').val('');
}

/**
 * Changes the user's email.
 */
function onChangeEmail() {
  const email = $('#changed-email').val();
  updateEmail(activeUser(), email).then(() => {
    refreshUserData();
    alertSuccess('Email changed!');
  }, onAuthError);
}

/**
 * Changes the user's password.
 */
function onChangePassword() {
  const password = $('#changed-password').val();
  updatePassword(activeUser(), password).then(() => {
    refreshUserData();
    alertSuccess('Password changed!');
  }, onAuthError);
}

/**
 * Changes the user's password.
 */
function onUpdateProfile() {
  const displayName = $('#display-name').val();
  const photoURL = $('#photo-url').val();
  updateProfile$1(activeUser(), {
    displayName,
    photoURL
  }).then(() => {
    refreshUserData();
    alertSuccess('Profile updated!');
  }, onAuthError);
}

/**
 * Sends sign in with email link to the user.
 */
function onSendSignInLinkToEmail() {
  const email = $('#sign-in-with-email-link-email').val();
  sendSignInLinkToEmail$1(auth, email, getActionCodeSettings()).then(() => {
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Sends sign in with email link to the user and pass in current url.
 */
function onSendSignInLinkToEmailCurrentUrl() {
  const email = $('#sign-in-with-email-link-email').val();
  const actionCodeSettings = {
    'url': window.location.href,
    'handleCodeInApp': true
  };

  sendSignInLinkToEmail$1(auth, email, actionCodeSettings).then(() => {
    if ('localStorage' in window && window['localStorage'] !== null) {
      window.localStorage.setItem(
        'emailForSignIn',
        // Save the email and the timestamp.
        JSON.stringify({
          email,
          timestamp: new Date().getTime()
        })
      );
    }
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Sends email link to link the user.
 */
function onSendLinkEmailLink() {
  const email = $('#link-with-email-link-email').val();
  sendSignInLinkToEmail$1(auth, email, getActionCodeSettings()).then(() => {
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Sends password reset email to the user.
 */
function onSendPasswordResetEmail() {
  const email = $('#password-reset-email').val();
  sendPasswordResetEmail$1(auth, email, getActionCodeSettings()).then(() => {
    alertSuccess('Email sent!');
  }, onAuthError);
}

/**
 * Verifies the password reset code entered by the user.
 */
function onVerifyPasswordResetCode() {
  const code = $('#password-reset-code').val();
  verifyPasswordResetCode(auth, code).then(() => {
    alertSuccess('Password reset code is valid!');
  }, onAuthError);
}

/**
 * Confirms the password reset with the code and password supplied by the user.
 */
function onConfirmPasswordReset() {
  const code = $('#password-reset-code').val();
  const password = $('#password-reset-password').val();
  confirmPasswordReset(auth, code, password).then(() => {
    alertSuccess('Password has been changed!');
  }, onAuthError);
}

/**
 * Gets the list of possible sign in methods for the given email address.
 */
function onFetchSignInMethodsForEmail() {
  const email = $('#fetch-sign-in-methods-email').val();
  fetchSignInMethodsForEmail(auth, email).then(signInMethods => {
    log('Sign in methods for ' + email + ' :');
    log(signInMethods);
    if (signInMethods.length === 0) {
      alertSuccess('Sign In Methods for ' + email + ': N/A');
    } else {
      alertSuccess(
        'Sign In Methods for ' + email + ': ' + signInMethods.join(', ')
      );
    }
  }, onAuthError);
}

/**
 * Fetches and logs the user's providers data.
 */
function onGetProviderData() {
  log('Providers data:');
  log(activeUser()['providerData']);
}

/**
 * Links a signed in user with an email and password account.
 */
function onLinkWithEmailAndPassword() {
  const email = $('#link-email').val();
  const password = $('#link-password').val();
  linkWithCredential(
    activeUser(),
    EmailAuthProvider.credential(email, password)
  ).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Links with a generic IdP credential.
 */
function onLinkWithGenericIdPCredential() {
  alertNotImplemented();
  // var providerId = $('#link-generic-idp-provider-id').val();
  // var idToken = $('#link-generic-idp-id-token').val() || undefined;
  // var rawNonce = $('#link-generic-idp-raw-nonce').val() || undefined;
  // var accessToken = $('#link-generic-idp-access-token').val() || undefined;
  // var provider = new OAuthProvider(providerId);
  // activeUser().linkWithCredential(
  //    provider.credential({
  //     idToken: idToken,
  //     accessToken: accessToken,
  //     rawNonce: rawNonce,
  //   })).then(onAuthUserCredentialSuccess, onAuthError);
}

/**
 * Unlinks the specified provider.
 */
function onUnlinkProvider() {
  const providerId = $('#unlinked-provider-id').val();
  unlink(activeUser(), providerId).then(_user => {
    alertSuccess('Provider unlinked from user.');
    refreshUserData();
  }, onAuthError);
}

/**
 * Sends email verification to the user.
 */
function onSendEmailVerification() {
  sendEmailVerification$1(activeUser(), getActionCodeSettings()).then(() => {
    alertSuccess('Email verification sent!');
  }, onAuthError);
}

/**
 * Confirms the email verification code given.
 */
function onApplyActionCode() {
  var code = $('#email-verification-code').val();
  applyActionCode$1(auth, code).then(function () {
    alertSuccess('Email successfully verified!');
    refreshUserData();
  }, onAuthError);
}

/**
 * Gets or refreshes the ID token.
 * @param {boolean} forceRefresh Whether to force the refresh of the token
 *     or not.
 */
function getIdToken(forceRefresh) {
  if (activeUser() == null) {
    alertError('No user logged in.');
    return;
  }
  if (activeUser().getIdToken) {
    activeUser()
      .getIdToken(forceRefresh)
      .then(alertSuccess, () => {
        log('No token');
      });
  } else {
    activeUser()
      .getToken(forceRefresh)
      .then(alertSuccess, () => {
        log('No token');
      });
  }
}

/**
 * Gets or refreshes the ID token result.
 * @param {boolean} forceRefresh Whether to force the refresh of the token
 *     or not
 */
function getIdTokenResult$1(forceRefresh) {
  if (activeUser() == null) {
    alertError('No user logged in.');
    return;
  }
  activeUser()
    .getIdTokenResult(forceRefresh)
    .then(idTokenResult => {
      alertSuccess(JSON.stringify(idTokenResult));
    }, onAuthError);
}

/**
 * Triggers the retrieval of the ID token result.
 */
function onGetIdTokenResult() {
  getIdTokenResult$1(false);
}

/**
 * Triggers the refresh of the ID token result.
 */
function onRefreshTokenResult() {
  getIdTokenResult$1(true);
}

/**
 * Triggers the retrieval of the ID token.
 */
function onGetIdToken() {
  getIdToken(false);
}

/**
 * Triggers the refresh of the ID token.
 */
function onRefreshToken() {
  getIdToken(true);
}

/**
 * Signs out the user.
 */
function onSignOut() {
  setLastUser(auth.currentUser);
  auth.signOut().then(signOut, onAuthError);
}

/**
 * Handles multi-factor sign-in completion.
 * @param {!MultiFactorResolver} resolver The multi-factor error
 *     resolver.
 */
function handleMultiFactorSignIn(resolver) {
  // Save multi-factor error resolver.
  multiFactorErrorResolver = resolver;
  // Populate 2nd factor options from resolver.
  const $listGroup = $('#multiFactorModal div.enrolled-second-factors');
  // Populate the list of 2nd factors in the list group specified.
  showMultiFactors(
    $listGroup,
    multiFactorErrorResolver.hints,
    // On row click, select the corresponding second factor to complete
    // sign-in with.
    function (e) {
      e.preventDefault();
      // Remove all other active entries.
      $listGroup.find('a').removeClass('active');
      // Mark current entry as active.
      $(this).addClass('active');
      // Select current factor.
      onSelectMultiFactorHint(parseInt($(this).attr('data-index'), 10));
    },
    // Do not show delete option
    null
  );
  // Hide phone form (other second factor types could be supported).
  $('#multi-factor-phone').addClass('hidden');
  // Show second factor recovery dialog.
  $('#multiFactorModal').modal();
}

/**
 * Displays the list of multi-factors in the provided list group.
 * @param {!jQuery<!HTMLElement>} $listGroup The list group where the enrolled
 *     factors will be displayed.
 * @param {!Array<!MultiFactorInfo>} multiFactorInfo The list of
 *     multi-factors to display.
 * @param {?function(!jQuery.Event)} onClick The click handler when a second
 *     factor is clicked.
 * @param {?function(!jQuery.Event)} onDelete The click handler when a second
 *     factor is delete. If not provided, no delete button is shown.
 */
function showMultiFactors($listGroup, multiFactorInfo, onClick, onDelete) {
  // Append entry to list.
  $listGroup.empty();
  $.each(multiFactorInfo, i => {
    // Append entry to list.
    const info = multiFactorInfo[i];
    const displayName = info.displayName || 'N/A';
    const $a = $('<a href="#" />')
      .addClass('list-group-item')
      .addClass('list-group-item-action')
      // Set index on entry.
      .attr('data-index', i)
      .appendTo($listGroup);
    $a.append($('<h4 class="list-group-item-heading" />').text(info.uid));
    $a.append($('<span class="badge" />').text(info.factorId));
    $a.append($('<p class="list-group-item-text" />').text(displayName));
    if (info.phoneNumber) {
      $a.append($('<small />').text(info.phoneNumber));
    }
    // Check if a delete button is to be displayed.
    if (onDelete) {
      const $deleteBtn = $(
        '<span class="pull-right button-group">' +
          '<button type="button" class="btn btn-danger btn-xs delete-factor" ' +
          'data-index="' +
          i.toString() +
          '">' +
          '<i class="fa fa-trash" data-title="Remove" />' +
          '</button>' +
          '</span>'
      );
      // Append delete button to row.
      $a.append($deleteBtn);
      // Add delete button click handler.
      $a.find('button.delete-factor').click(onDelete);
    }
    // On entry click.
    if (onClick) {
      $a.click(onClick);
    }
  });
}

/**
 * Handles the user selection of second factor to complete sign-in with.
 * @param {number} index The selected multi-factor hint index.
 */
function onSelectMultiFactorHint(index) {
  // Hide all forms for handling each type of second factors.
  // Currently only phone is supported.
  $('#multi-factor-phone').addClass('hidden');
  if (
    !multiFactorErrorResolver ||
    typeof multiFactorErrorResolver.hints[index] === 'undefined'
  ) {
    return;
  }

  if (multiFactorErrorResolver.hints[index].factorId === 'phone') {
    // Save selected second factor.
    selectedMultiFactorHint = multiFactorErrorResolver.hints[index];
    // Show options for phone 2nd factor.
    // Get reCAPTCHA ready.
    clearApplicationVerifier();
    makeApplicationVerifier('send-2fa-phone-code');
    // Show sign-in with phone second factor menu.
    $('#multi-factor-phone').removeClass('hidden');
    // Clear all input.
    $('#multi-factor-sign-in-verification-id').val('');
    $('#multi-factor-sign-in-verification-code').val('');
  } else {
    // 2nd factor not found or not supported by app.
    alertError('Selected 2nd factor is not supported!');
  }
}

/**
 * Start sign-in with the 2nd factor phone number.
 * @param {!jQuery.Event} event The jQuery event object.
 */
function onStartSignInWithPhoneMultiFactor(event) {
  event.preventDefault();
  // Make sure a second factor is selected.
  if (!selectedMultiFactorHint || !multiFactorErrorResolver) {
    return;
  }
  // Initialize a reCAPTCHA application verifier.
  const provider = new PhoneAuthProvider(auth);
  const signInRequest = {
    multiFactorHint: selectedMultiFactorHint,
    session: multiFactorErrorResolver.session
  };
  provider.verifyPhoneNumber(signInRequest, applicationVerifier).then(
    verificationId => {
      clearApplicationVerifier();
      $('#multi-factor-sign-in-verification-id').val(verificationId);
      alertSuccess('Phone verification sent!');
    },
    error => {
      clearApplicationVerifier();
      onAuthError(error);
    }
  );
}

/**
 * Completes sign-in with the 2nd factor phone assertion.
 * @param {!jQuery.Event} event The jQuery event object.
 */
function onFinalizeSignInWithPhoneMultiFactor(event) {
  event.preventDefault();
  const verificationId = $('#multi-factor-sign-in-verification-id').val();
  const code = $('#multi-factor-sign-in-verification-code').val();
  if (!code || !verificationId || !multiFactorErrorResolver) {
    return;
  }
  const cred = PhoneAuthProvider.credential(verificationId, code);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  multiFactorErrorResolver.resolveSignIn(assertion).then(userCredential => {
    onAuthUserCredentialSuccess(userCredential);
    $('#multiFactorModal').modal('hide');
  }, onAuthError);
}

/**
 * Adds a new row to insert an OAuth custom parameter key/value pair.
 * @param {!jQuery.Event} _event The jQuery event object.
 */
function onPopupRedirectAddCustomParam(_event) {
  // Form container.
  let html = '<form class="customParamItem form form-bordered no-submit">';
  // OAuth parameter key input.
  html +=
    '<input type="text" class="form-control customParamKey" ' +
    'placeholder="OAuth Parameter Key"/>';
  // OAuth parameter value input.
  html +=
    '<input type="text" class="form-control customParamValue" ' +
    'placeholder="OAuth Parameter Value"/>';
  // Button to remove current key/value pair.
  html += '<button class="btn btn-block btn-primary">Remove</button>';
  html += '</form>';
  // Create jQuery node.
  const $node = $(html);
  // Add button click event listener to remove item.
  $node.find('button').on('click', function (e) {
    // Remove button click event listener.
    $(this).off('click');
    // Get row container and remove it.
    $(this).closest('form.customParamItem').remove();
    e.preventDefault();
  });
  // Append constructed row to parameter list container.
  $('#popup-redirect-custom-parameters').append($node);
}

/**
 * Performs the corresponding popup/redirect action for a generic provider.
 */
function onPopupRedirectGenericProviderClick() {
  var providerId = $('#popup-redirect-generic-providerid').val();
  var provider = new OAuthProvider(providerId);
  signInWithPopupRedirect(provider);
}

/**
 * Performs the corresponding popup/redirect action for a SAML provider.
 */
function onPopupRedirectSamlProviderClick() {
  alertNotImplemented();
  // var providerId = $('#popup-redirect-saml-providerid').val();
  // var provider = new SAMLAuthProvider(providerId);
  // signInWithPopupRedirect(provider);
}

/**
 * Performs the corresponding popup/redirect action based on user's selection.
 * @param {!jQuery.Event} _event The jQuery event object.
 */
function onPopupRedirectProviderClick(_event) {
  const providerId = $(event.currentTarget).data('provider');
  let provider = null;
  switch (providerId) {
    case 'google.com':
      provider = new GoogleAuthProvider();
      break;
    case 'facebook.com':
      provider = new FacebookAuthProvider();
      break;
    case 'github.com':
      provider = new GithubAuthProvider();
      break;
    case 'twitter.com':
      provider = new TwitterAuthProvider();
      break;
    default:
      return;
  }
  signInWithPopupRedirect(provider);
}

/**
 * Performs a popup/redirect action based on a given provider and the user's
 * selections.
 * @param {!AuthProvider} provider The provider with which to
 *     sign in.
 */
function signInWithPopupRedirect(provider) {
  let action = $('input[name=popup-redirect-action]:checked').val();
  let type = $('input[name=popup-redirect-type]:checked').val();
  let method = null;
  let inst = auth;

  switch (action) {
    case 'link':
      if (!activeUser()) {
        alertError('No user logged in.');
        return;
      }
      inst = activeUser();
      method = type === 'popup' ? linkWithPopup : linkWithRedirect;
      break;
    case 'reauthenticate':
      if (!activeUser()) {
        alertError('No user logged in.');
        return;
      }
      inst = activeUser();
      method =
        type === 'popup' ? reauthenticateWithPopup : reauthenticateWithRedirect;
      break;
    default:
      method = type === 'popup' ? signInWithPopup : signInWithRedirect;
  }

  // Get custom OAuth parameters.
  const customParameters = {};
  // For each entry.
  $('form.customParamItem').each(function (_index) {
    // Get parameter key.
    const key = $(this).find('input.customParamKey').val();
    // Get parameter value.
    const value = $(this).find('input.customParamValue').val();
    // Save to list if valid.
    if (key && value) {
      customParameters[key] = value;
    }
  });
  console.log('customParameters: ', customParameters);
  // For older jscore versions that do not support this.
  if (provider.setCustomParameters) {
    // Set custom parameters on current provider.
    provider.setCustomParameters(customParameters);
  }

  // Add scopes for providers who do have scopes available (i.e. not Twitter).
  if (provider.addScope) {
    // String.prototype.trim not available in IE8.
    const scopes = $.trim($('#scopes').val()).split(/\s*,\s*/);
    for (let i = 0; i < scopes.length; i++) {
      provider.addScope(scopes[i]);
    }
  }
  console.log('Provider:');
  console.log(provider);
  if (type == 'popup') {
    method(inst, provider, browserPopupRedirectResolver).then(response => {
      console.log('Popup response:');
      console.log(response);
      alertSuccess(action + ' with ' + provider['providerId'] + ' successful!');
      logAdditionalUserInfo(response);
      onAuthSuccess(activeUser());
    }, onAuthError);
  } else {
    try {
      method(inst, provider, browserPopupRedirectResolver).catch(onAuthError);
    } catch (error) {
      console.log('Error while calling ' + method);
      console.error(error);
    }
  }
}

/**
 * Displays user credential result.
 * @param {!UserCredential} result The UserCredential result
 *     object.
 */
function onAuthUserCredentialSuccess(result) {
  onAuthSuccess(result.user);
  logAdditionalUserInfo(result);
}

/**
 * Displays redirect result.
 */
function onGetRedirectResult() {
  getRedirectResult(auth, browserPopupRedirectResolver).then(function (
    response
  ) {
    log('Redirect results:');
    if (response.credential) {
      log('Credential:');
      log(response.credential);
    } else {
      log('No credential');
    }
    if (response.user) {
      log("User's id:");
      log(response.user.uid);
    } else {
      log('No user');
    }
    logAdditionalUserInfo(response);
    console.log(response);
  },
  onAuthError);
}

/**
 * Logs additional user info returned by a sign-in event, if available.
 * @param {!Object} response
 */
function logAdditionalUserInfo(response) {
  if (response?.additionalUserInfo) {
    if (response.additionalUserInfo.username) {
      log(
        response.additionalUserInfo['providerId'] +
          ' username: ' +
          response.additionalUserInfo.username
      );
    }
    if (response.additionalUserInfo.profile) {
      log(response.additionalUserInfo['providerId'] + ' profile information:');
      log(JSON.stringify(response.additionalUserInfo.profile, null, 2));
    }
    if (typeof response.additionalUserInfo.isNewUser !== 'undefined') {
      log(
        response.additionalUserInfo['providerId'] +
          ' isNewUser: ' +
          response.additionalUserInfo.isNewUser
      );
    }
    if (response.credential) {
      log('credential: ' + JSON.stringify(response.credential.toJSON()));
    }
  }
}

/**
 * Deletes the user account.
 */
function onDelete() {
  activeUser()
    ['delete']()
    .then(() => {
      log('User successfully deleted.');
      alertSuccess('User successfully deleted.');
      refreshUserData();
    }, onAuthError);
}

/**
 * Gets a specific query parameter from the current URL.
 * @param {string} name Name of the parameter.
 * @return {string} The query parameter requested.
 */
function getParameterByName(name) {
  const url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) {
    return null;
  }
  if (!results[2]) {
    return '';
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Detects if an action code is passed in the URL, and populates accordingly
 * the input field for the confirm email verification process.
 */
function populateActionCodes() {
  let emailForSignIn = null;
  let signInTime = 0;
  if ('localStorage' in window && window['localStorage'] !== null) {
    try {
      // Try to parse as JSON first using new storage format.
      const emailForSignInData = JSON.parse(
        window.localStorage.getItem('emailForSignIn')
      );
      emailForSignIn = emailForSignInData['email'] || null;
      signInTime = emailForSignInData['timestamp'] || 0;
    } catch (e) {
      // JSON parsing failed. This means the email is stored in the old string
      // format.
      emailForSignIn = window.localStorage.getItem('emailForSignIn');
    }
    if (emailForSignIn) {
      // Clear old codes. Old format codes should be cleared immediately.
      if (new Date().getTime() - signInTime >= 1 * 24 * 3600 * 1000) {
        // Remove email from storage.
        window.localStorage.removeItem('emailForSignIn');
      }
    }
  }
  const actionCode = getParameterByName('oobCode');
  if (actionCode != null) {
    const mode = getParameterByName('mode');
    if (mode === 'verifyEmail') {
      $('#email-verification-code').val(actionCode);
    } else if (mode === 'resetPassword') {
      $('#password-reset-code').val(actionCode);
    } else if (mode === 'signIn') {
      if (emailForSignIn) {
        $('#sign-in-with-email-link-email').val(emailForSignIn);
        $('#sign-in-with-email-link-link').val(window.location.href);
        onSignInWithEmailLink();
        // Remove email from storage as the code is only usable once.
        window.localStorage.removeItem('emailForSignIn');
      }
    } else {
      $('#email-verification-code').val(actionCode);
      $('#password-reset-code').val(actionCode);
    }
  }
}

/**
 * Provides basic Database checks for authenticated and unauthenticated access.
 * The Database node being tested has the following rule:
 * "users": {
 *   "$user_id": {
 *     ".read": "$user_id === auth.uid",
 *     ".write": "$user_id === auth.uid"
 *   }
 * }
 * This applies when Real-time database service is available.
 */
function checkDatabaseAuthAccess() {
  const randomString = Math.floor(Math.random() * 10000000).toString();
  let dbRef;
  let dbPath;
  let errMessage;
  // Run this check only when Database module is available.
  if (
    typeof firebase !== 'undefined' &&
    typeof firebase.database !== 'undefined'
  ) {
    if (lastUser && !auth.currentUser) {
      dbPath = 'users/' + lastUser.uid;
      // After sign out, confirm read/write access to users/$user_id blocked.
      dbRef = firebase.database().ref(dbPath);
      dbRef
        .set({
          'test': randomString
        })
        .then(() => {
          alertError(
            'Error: Unauthenticated write to Database node ' +
              dbPath +
              ' unexpectedly succeeded!'
          );
        })
        .catch(error => {
          errMessage = error.message.toLowerCase();
          // Permission denied error should be thrown.
          if (errMessage.indexOf('permission_denied') === -1) {
            alertError('Error: ' + error.code);
            return;
          }
          dbRef
            .once('value')
            .then(() => {
              alertError(
                'Error: Unauthenticated read to Database node ' +
                  dbPath +
                  ' unexpectedly succeeded!'
              );
            })
            .catch(error => {
              errMessage = error.message.toLowerCase();
              // Permission denied error should be thrown.
              if (errMessage.indexOf('permission_denied') === -1) {
                alertError('Error: ' + error.code);
                return;
              }
              log(
                'Unauthenticated read/write to Database node ' +
                  dbPath +
                  ' failed as expected!'
              );
            });
        });
    } else if (auth.currentUser) {
      dbPath = 'users/' + auth.currentUser.uid;
      // Confirm read/write access to users/$user_id allowed.
      dbRef = firebase.database().ref(dbPath);
      dbRef
        .set({
          'test': randomString
        })
        .then(() => {
          return dbRef.once('value');
        })
        .then(snapshot => {
          if (snapshot.val().test === randomString) {
            // read/write successful.
            log(
              'Authenticated read/write to Database node ' +
                dbPath +
                ' succeeded!'
            );
          } else {
            throw new Error(
              'Authenticated read/write to Database node ' + dbPath + ' failed!'
            );
          }
          // Clean up: clear that node's content.
          return dbRef.remove();
        })
        .catch(error => {
          alertError('Error: ' + error.code);
        });
    }
  }
}

/**
 * Runs various Firebase Auth tests in a web worker environment and confirms the
 * expected behavior. This is useful for manual testing in different browsers.
 * @param {string} googleIdToken The Google ID token to sign in with.
 */
function onRunWebWorkTests() {
  if (!webWorker) {
    alertError('Error: Web workers are not supported in the current browser!');
    return;
  }
  signInWithPopup(
    auth,
    new GoogleAuthProvider(),
    browserPopupRedirectResolver
  ).then(
    result => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      webWorker.postMessage({
        type: 'RUN_TESTS',
        googleIdToken: credential.idToken
      });
    },
    error => {
      alertError('Error code: ' + error.code + ' message: ' + error.message);
    }
  );
}

/** Runs service worker tests if supported. */
function onRunServiceWorkTests() {
  $.ajax('/checkIfAuthenticated').then(
    (data, _textStatus, _jqXHR) => {
      alertSuccess('User authenticated: ' + data.uid);
    },
    (jqXHR, _textStatus, _errorThrown) => {
      alertError(jqXHR.status + ': ' + JSON.stringify(jqXHR.responseJSON));
    }
  );
}

/** Copy current user of auth to tempAuth. */
function onCopyActiveUser() {
  tempAuth.updateCurrentUser(activeUser()).then(
    () => {
      alertSuccess('Copied active user to temp Auth');
    },
    error => {
      alertError('Error: ' + error.code);
    }
  );
}

/** Copy last user to auth. */
function onCopyLastUser() {
  // If last user is null, NULL_USER error will be thrown.
  auth.updateCurrentUser(lastUser).then(
    () => {
      alertSuccess('Copied last user to Auth');
    },
    error => {
      alertError('Error: ' + error.code);
    }
  );
}

/** Applies selected auth settings change. */
function onApplyAuthSettingsChange() {
  try {
    auth.settings.appVerificationDisabledForTesting =
      $('input[name=enable-app-verification]:checked').val() === 'No';
    alertSuccess('Auth settings changed');
  } catch (error) {
    alertError('Error: ' + error.code);
  }
}

/**
 * Initiates the application by setting event listeners on the various buttons.
 */
function initApp() {
  log('Initializing app...');
  app = initializeApp(config);
  auth = initializeAuth(app, {
    persistence: browserSessionPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });

  tempApp = initializeApp(
    {
      apiKey: config.apiKey,
      authDomain: config.authDomain
    },
    `${auth.name}-temp`
  );
  tempAuth = initializeAuth(tempApp, {
    persistence: inMemoryPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
  });

  // Listen to reCAPTCHA config togglers.
  initRecaptchaToggle(size => {
    clearApplicationVerifier();
    recaptchaSize = size;
  });

  // The action code for email verification or password reset
  // can be passed in the url address as a parameter, and for convenience
  // this preloads the input field.
  populateActionCodes();

  // Allows to login the user if previously logged in.
  if (auth.onIdTokenChanged) {
    auth.onIdTokenChanged(user => {
      refreshUserData();
      if (user) {
        user.getIdTokenResult(false).then(
          idTokenResult => {
            log(JSON.stringify(idTokenResult));
          },
          () => {
            log('No token.');
          }
        );
      } else {
        log('No user logged in.');
      }
    });
  }

  if (auth.onAuthStateChanged) {
    auth.onAuthStateChanged(user => {
      if (user) {
        log('user state change detected: ' + user.uid);
      } else {
        log('user state change detected: no user');
      }
      // Check Database Auth access.
      checkDatabaseAuthAccess();
    });
  }

  if (tempAuth.onAuthStateChanged) {
    tempAuth.onAuthStateChanged(user => {
      if (user) {
        log('user state change on temp Auth detect: ' + JSON.stringify(user));
        alertSuccess('user state change on temp Auth detect: ' + user.uid);
      }
    });
  }

  /**
   * @fileoverview Utilities for Auth test app features.
   */

  /**
   * Initializes the widget for toggling reCAPTCHA size.
   * @param {function(string):void} callback The callback to call when the
   *     size toggler is changed, which takes in the new reCAPTCHA size.
   */
  function initRecaptchaToggle(callback) {
    // Listen to recaptcha config togglers.
    const $recaptchaConfigTogglers = $('.toggleRecaptcha');
    $recaptchaConfigTogglers.click(function (e) {
      // Remove currently active option.
      $recaptchaConfigTogglers.removeClass('active');
      // Set currently selected option.
      $(this).addClass('active');
      // Get the current reCAPTCHA setting label.
      const size = $(e.target).text().toLowerCase();
      callback(size);
    });
  }

  // Install servicerWorker if supported.
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker
  //     .register('/service-worker.js')
  //     .then(reg => {
  //       // Registration worked.
  //       console.log('Registration succeeded. Scope is ' + reg.scope);
  //     })
  //     .catch(error => {
  //       // Registration failed.
  //       console.log('Registration failed with ' + error.message);
  //     });
  // }

  if (window.Worker) {
    webWorker = new Worker('/web-worker.js');
    /**
     * Handles the incoming message from the web worker.
     * @param {!Object} e The message event received.
     */
    webWorker.onmessage = function (e) {
      console.log('User data passed through web worker: ', e.data);
      switch (e.data.type) {
        case 'GET_USER_INFO':
          alertSuccess(
            'User data passed through web worker: ' + JSON.stringify(e.data)
          );
          break;
        case 'RUN_TESTS':
          if (e.data.status === 'success') {
            alertSuccess('Web worker tests ran successfully!');
          } else {
            alertError('Error: ' + JSON.stringify(e.data.error));
          }
          break;
        default:
          return;
      }
    };
  }

  /**
   * Asks the web worker, if supported in current browser, to return the user info
   * corresponding to the currentUser as seen within the worker.
   */
  function onGetCurrentUserDataFromWebWorker() {
    if (webWorker) {
      webWorker.postMessage({ type: 'GET_USER_INFO' });
    } else {
      alertError(
        'Error: Web workers are not supported in the current browser!'
      );
    }
  }

  // We check for redirect result to refresh user's data.
  getRedirectResult(auth, browserPopupRedirectResolver).then(function (
    response
  ) {
    refreshUserData();
    logAdditionalUserInfo(response);
  },
  onAuthError);

  // Bootstrap tooltips.
  $('[data-toggle="tooltip"]').tooltip();

  // Auto submit the choose library type form.
  $('#library-form').on('change', 'input.library-option', () => {
    $('#library-form').submit();
  });

  // To clear the logs in the page.
  $('.clear-logs').click(clearLogs);

  // Disables JS forms.
  $('form.no-submit').on('submit', () => {
    return false;
  });

  // Keeps track of the current tab opened.
  $('#tab-menu a').click(event => {
    currentTab = $(event.currentTarget).attr('href');
  });

  // Toggles user.
  $('input[name=toggle-user-selection]').change(refreshUserData);

  // Actions listeners.
  $('#sign-up-with-email-and-password').click(onSignUp);
  $('#sign-in-with-email-and-password').click(onSignInWithEmailAndPassword);
  $('.sign-in-with-custom-token').click(onSignInWithCustomToken);
  $('#sign-in-anonymously').click(onSignInAnonymously);
  $('#sign-in-with-generic-idp-credential').click(
    onSignInWithGenericIdPCredential
  );
  $('#signin-verify-phone-number').click(onSignInVerifyPhoneNumber);
  $('#signin-confirm-phone-verification').click(
    onSignInConfirmPhoneVerification
  );
  // On enter click in verification code, complete phone sign-in. This prevents
  // reCAPTCHA from being re-rendered (default behavior on enter).
  $('#signin-phone-verification-code').keypress(e => {
    if (e.which === 13) {
      onSignInConfirmPhoneVerification();
      e.preventDefault();
    }
  });
  $('#sign-in-with-email-link').click(onSignInWithEmailLink);
  $('#link-with-email-link').click(onLinkWithEmailLink);
  $('#reauth-with-email-link').click(onReauthenticateWithEmailLink);

  $('#change-email').click(onChangeEmail);
  $('#change-password').click(onChangePassword);
  $('#update-profile').click(onUpdateProfile);

  $('#send-sign-in-link-to-email').click(onSendSignInLinkToEmail);
  $('#send-sign-in-link-to-email-current-url').click(
    onSendSignInLinkToEmailCurrentUrl
  );
  $('#send-link-email-link').click(onSendLinkEmailLink);

  $('#send-password-reset-email').click(onSendPasswordResetEmail);
  $('#verify-password-reset-code').click(onVerifyPasswordResetCode);
  $('#confirm-password-reset').click(onConfirmPasswordReset);

  $('#get-provider-data').click(onGetProviderData);
  $('#link-with-email-and-password').click(onLinkWithEmailAndPassword);
  $('#link-with-generic-idp-credential').click(onLinkWithGenericIdPCredential);
  $('#unlink-provider').click(onUnlinkProvider);
  $('#link-reauth-verify-phone-number').click(onLinkReauthVerifyPhoneNumber);
  $('#update-confirm-phone-verification').click(
    onUpdateConfirmPhoneVerification
  );
  $('#link-confirm-phone-verification').click(onLinkConfirmPhoneVerification);
  $('#reauth-confirm-phone-verification').click(
    onReauthConfirmPhoneVerification
  );
  // On enter click in verification code, complete phone sign-in. This prevents
  // reCAPTCHA from being re-rendered (default behavior on enter).
  $('#link-reauth-phone-verification-code').keypress(e => {
    if (e.which === 13) {
      // User first option option as default.
      onUpdateConfirmPhoneVerification();
      e.preventDefault();
    }
  });

  $('#send-email-verification').click(onSendEmailVerification);
  $('#confirm-email-verification').click(onApplyActionCode);
  $('#get-token-result').click(onGetIdTokenResult);
  $('#refresh-token-result').click(onRefreshTokenResult);
  $('#get-token').click(onGetIdToken);
  $('#refresh-token').click(onRefreshToken);
  $('#get-token-worker').click(onGetCurrentUserDataFromWebWorker);
  $('#sign-out').click(onSignOut);

  $('.popup-redirect-provider').click(onPopupRedirectProviderClick);
  $('#popup-redirect-generic').click(onPopupRedirectGenericProviderClick);
  $('#popup-redirect-get-redirect-result').click(onGetRedirectResult);
  $('#popup-redirect-add-custom-parameter').click(
    onPopupRedirectAddCustomParam
  );
  $('#popup-redirect-saml').click(onPopupRedirectSamlProviderClick);

  $('#action-code-settings-reset').click(onActionCodeSettingsReset);

  $('#delete').click(onDelete);

  $('#set-persistence').click(onSetPersistence);

  $('#set-language-code').click(onSetLanguageCode);
  $('#use-device-language').click(onUseDeviceLanguage);

  $('#fetch-sign-in-methods-for-email').click(onFetchSignInMethodsForEmail);

  $('#run-web-worker-tests').click(onRunWebWorkTests);
  $('#run-service-worker-tests').click(onRunServiceWorkTests);
  $('#copy-active-user').click(onCopyActiveUser);
  $('#copy-last-user').click(onCopyLastUser);

  $('#apply-auth-settings-change').click(onApplyAuthSettingsChange);

  // Multi-factor operations.
  // Starts multi-factor sign-in with selected phone number.
  $('#send-2fa-phone-code').click(onStartSignInWithPhoneMultiFactor);
  // Completes multi-factor sign-in with supplied SMS code.
  $('#sign-in-with-phone-multi-factor').click(
    onFinalizeSignInWithPhoneMultiFactor
  );
  // Starts multi-factor enrollment with phone number.
  $('#enroll-mfa-verify-phone-number').click(onStartEnrollWithPhoneMultiFactor);
  // Completes multi-factor enrollment with supplied SMS code.
  $('#enroll-mfa-confirm-phone-verification').click(
    onFinalizeEnrollWithPhoneMultiFactor
  );
}

$(initApp);
//# sourceMappingURL=index.js.map
