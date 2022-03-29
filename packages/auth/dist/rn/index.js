'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var ReactNative = require('react-native');
var app = require('@firebase/app');
var phone = require('./phone-10983aab.js');
var tslib = require('tslib');
require('@firebase/util');
require('@firebase/component');
require('@firebase/logger');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var ReactNative__namespace = /*#__PURE__*/_interopNamespace(ReactNative);

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
 * Returns a persistence object that wraps AsyncStorage imported from
 * `react-native` or `@react-native-community/async-storage`, and can
 * be used in the persistence dependency field in {@link initializeAuth}.
 *
 * @public
 */
function getReactNativePersistence(storage) {
    var _a;
    // In the _getInstance() implementation (see src/core/persistence/index.ts),
    // we expect each "externs.Persistence" object passed to us by the user to
    // be able to be instantiated (as a class) using "new". That function also
    // expects the constructor to be empty. Since ReactNativeStorage requires the
    // underlying storage layer, we need to be able to create subclasses
    // (closures, esentially) that have the storage layer but empty constructor.
    return _a = /** @class */ (function () {
            function class_1() {
                this.type = "LOCAL" /* LOCAL */;
            }
            class_1.prototype._isAvailable = function () {
                return tslib.__awaiter(this, void 0, void 0, function () {
                    return tslib.__generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 3, , 4]);
                                if (!storage) {
                                    return [2 /*return*/, false];
                                }
                                return [4 /*yield*/, storage.setItem(phone.STORAGE_AVAILABLE_KEY, '1')];
                            case 1:
                                _b.sent();
                                return [4 /*yield*/, storage.removeItem(phone.STORAGE_AVAILABLE_KEY)];
                            case 2:
                                _b.sent();
                                return [2 /*return*/, true];
                            case 3:
                                _b.sent();
                                return [2 /*return*/, false];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            };
            class_1.prototype._set = function (key, value) {
                return storage.setItem(key, JSON.stringify(value));
            };
            class_1.prototype._get = function (key) {
                return tslib.__awaiter(this, void 0, void 0, function () {
                    var json;
                    return tslib.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, storage.getItem(key)];
                            case 1:
                                json = _a.sent();
                                return [2 /*return*/, json ? JSON.parse(json) : null];
                        }
                    });
                });
            };
            class_1.prototype._remove = function (key) {
                return storage.removeItem(key);
            };
            class_1.prototype._addListener = function (_key, _listener) {
                // Listeners are not supported for React Native storage.
                return;
            };
            class_1.prototype._removeListener = function (_key, _listener) {
                // Listeners are not supported for React Native storage.
                return;
            };
            return class_1;
        }()),
        _a.type = 'LOCAL',
        _a;
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
 * An implementation of {@link Persistence} of type 'LOCAL' for use in React
 * Native environments.
 *
 * @public
 */
var reactNativeLocalPersistence = getReactNativePersistence({
    getItem: function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Called inline to avoid deprecation warnings on startup.
        return (_a = ReactNative__namespace.AsyncStorage).getItem.apply(_a, args);
    },
    setItem: function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Called inline to avoid deprecation warnings on startup.
        return (_a = ReactNative__namespace.AsyncStorage).setItem.apply(_a, args);
    },
    removeItem: function () {
        var _a;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Called inline to avoid deprecation warnings on startup.
        return (_a = ReactNative__namespace.AsyncStorage).removeItem.apply(_a, args);
    },
});
function getAuth(app$1) {
    if (app$1 === void 0) { app$1 = app.getApp(); }
    var provider = app._getProvider(app$1, 'auth');
    if (provider.isInitialized()) {
        return provider.getImmediate();
    }
    return phone.initializeAuth(app$1, {
        persistence: reactNativeLocalPersistence
    });
}
phone.registerAuth("ReactNative" /* REACT_NATIVE */);

exports.ActionCodeOperation = phone.ActionCodeOperation;
exports.ActionCodeURL = phone.ActionCodeURL;
exports.AuthCredential = phone.AuthCredential;
exports.AuthErrorCodes = phone.AUTH_ERROR_CODES_MAP_DO_NOT_USE_INTERNALLY;
exports.EmailAuthCredential = phone.EmailAuthCredential;
exports.EmailAuthProvider = phone.EmailAuthProvider;
exports.FacebookAuthProvider = phone.FacebookAuthProvider;
exports.FactorId = phone.FactorId;
exports.GithubAuthProvider = phone.GithubAuthProvider;
exports.GoogleAuthProvider = phone.GoogleAuthProvider;
exports.OAuthCredential = phone.OAuthCredential;
exports.OAuthProvider = phone.OAuthProvider;
exports.OperationType = phone.OperationType;
exports.PhoneAuthCredential = phone.PhoneAuthCredential;
exports.PhoneAuthProvider = phone.PhoneAuthProvider;
exports.PhoneMultiFactorGenerator = phone.PhoneMultiFactorGenerator;
exports.ProviderId = phone.ProviderId;
exports.SAMLAuthProvider = phone.SAMLAuthProvider;
exports.SignInMethod = phone.SignInMethod;
exports.TwitterAuthProvider = phone.TwitterAuthProvider;
exports.applyActionCode = phone.applyActionCode;
exports.checkActionCode = phone.checkActionCode;
exports.confirmPasswordReset = phone.confirmPasswordReset;
exports.connectAuthEmulator = phone.connectAuthEmulator;
exports.createUserWithEmailAndPassword = phone.createUserWithEmailAndPassword;
exports.debugErrorMap = phone.debugErrorMap;
exports.deleteUser = phone.deleteUser;
exports.fetchSignInMethodsForEmail = phone.fetchSignInMethodsForEmail;
exports.getAdditionalUserInfo = phone.getAdditionalUserInfo;
exports.getIdToken = phone.getIdToken;
exports.getIdTokenResult = phone.getIdTokenResult;
exports.getMultiFactorResolver = phone.getMultiFactorResolver;
exports.inMemoryPersistence = phone.inMemoryPersistence;
exports.initializeAuth = phone.initializeAuth;
exports.isSignInWithEmailLink = phone.isSignInWithEmailLink;
exports.linkWithCredential = phone.linkWithCredential;
exports.linkWithPhoneNumber = phone.linkWithPhoneNumber;
exports.multiFactor = phone.multiFactor;
exports.onAuthStateChanged = phone.onAuthStateChanged;
exports.onIdTokenChanged = phone.onIdTokenChanged;
exports.parseActionCodeURL = phone.parseActionCodeURL;
exports.prodErrorMap = phone.prodErrorMap;
exports.reauthenticateWithCredential = phone.reauthenticateWithCredential;
exports.reauthenticateWithPhoneNumber = phone.reauthenticateWithPhoneNumber;
exports.reload = phone.reload;
exports.sendEmailVerification = phone.sendEmailVerification;
exports.sendPasswordResetEmail = phone.sendPasswordResetEmail;
exports.sendSignInLinkToEmail = phone.sendSignInLinkToEmail;
exports.setPersistence = phone.setPersistence;
exports.setRecaptchaConfig = phone.setRecaptchaConfig;
exports.signInAnonymously = phone.signInAnonymously;
exports.signInWithCredential = phone.signInWithCredential;
exports.signInWithCustomToken = phone.signInWithCustomToken;
exports.signInWithEmailAndPassword = phone.signInWithEmailAndPassword;
exports.signInWithEmailLink = phone.signInWithEmailLink;
exports.signInWithPhoneNumber = phone.signInWithPhoneNumber;
exports.signOut = phone.signOut;
exports.unlink = phone.unlink;
exports.updateCurrentUser = phone.updateCurrentUser;
exports.updateEmail = phone.updateEmail;
exports.updatePassword = phone.updatePassword;
exports.updatePhoneNumber = phone.updatePhoneNumber;
exports.updateProfile = phone.updateProfile;
exports.useDeviceLanguage = phone.useDeviceLanguage;
exports.verifyBeforeUpdateEmail = phone.verifyBeforeUpdateEmail;
exports.verifyPasswordResetCode = phone.verifyPasswordResetCode;
exports.getAuth = getAuth;
exports.getReactNativePersistence = getReactNativePersistence;
exports.reactNativeLocalPersistence = reactNativeLocalPersistence;
//# sourceMappingURL=index.js.map
