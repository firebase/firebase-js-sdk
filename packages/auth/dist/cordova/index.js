import { getApp, _getProvider } from '@firebase/app';
import { _ as _signInWithRedirect, a as _reauthenticateWithRedirect, b as _linkWithRedirect, r as registerAuth, i as initializeAuth, c as indexedDBLocalPersistence, d as cordovaPopupRedirectResolver } from './popup_redirect-4275be26.js';
export { A as ActionCodeOperation, a3 as ActionCodeURL, v as AuthCredential, q as AuthErrorCodes, E as EmailAuthCredential, z as EmailAuthProvider, B as FacebookAuthProvider, F as FactorId, C as GithubAuthProvider, G as GoogleAuthProvider, w as OAuthCredential, D as OAuthProvider, O as OperationType, x as PhoneAuthCredential, P as ProviderId, H as SAMLAuthProvider, S as SignInMethod, T as TwitterAuthProvider, R as applyActionCode, e as browserLocalPersistence, f as browserSessionPersistence, U as checkActionCode, Q as confirmPasswordReset, t as connectAuthEmulator, d as cordovaPopupRedirectResolver, W as createUserWithEmailAndPassword, n as debugErrorMap, m as deleteUser, a0 as fetchSignInMethodsForEmail, ab as getAdditionalUserInfo, a8 as getIdToken, a9 as getIdTokenResult, ad as getMultiFactorResolver, g as getRedirectResult, y as inMemoryPersistence, c as indexedDBLocalPersistence, i as initializeAuth, Z as isSignInWithEmailLink, K as linkWithCredential, ae as multiFactor, j as onAuthStateChanged, o as onIdTokenChanged, a4 as parseActionCodeURL, p as prodErrorMap, L as reauthenticateWithCredential, ac as reload, a1 as sendEmailVerification, N as sendPasswordResetEmail, Y as sendSignInLinkToEmail, s as setPersistence, h as setRecaptchaConfig, I as signInAnonymously, J as signInWithCredential, M as signInWithCustomToken, X as signInWithEmailAndPassword, $ as signInWithEmailLink, l as signOut, aa as unlink, k as updateCurrentUser, a6 as updateEmail, a7 as updatePassword, a5 as updateProfile, u as useDeviceLanguage, a2 as verifyBeforeUpdateEmail, V as verifyPasswordResetCode } from './popup_redirect-4275be26.js';
import 'tslib';
import '@firebase/util';
import '@firebase/component';
import '@firebase/logger';

/**
 * @license
 * Copyright 2021 Google LLC
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
function signInWithRedirect(auth, provider, resolver) {
    return _signInWithRedirect(auth, provider, resolver);
}
function reauthenticateWithRedirect(user, provider, resolver) {
    return _reauthenticateWithRedirect(user, provider, resolver);
}
function linkWithRedirect(user, provider, resolver) {
    return _linkWithRedirect(user, provider, resolver);
}

/**
 * @license
 * Copyright 2021 Google LLC
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
function getAuth(app) {
    if (app === void 0) { app = getApp(); }
    var provider = _getProvider(app, 'auth');
    if (provider.isInitialized()) {
        return provider.getImmediate();
    }
    return initializeAuth(app, {
        persistence: indexedDBLocalPersistence,
        popupRedirectResolver: cordovaPopupRedirectResolver
    });
}
registerAuth("Cordova" /* CORDOVA */);

export { getAuth, linkWithRedirect, reauthenticateWithRedirect, signInWithRedirect };
//# sourceMappingURL=index.js.map
