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

!(function (e, s) {
  'object' == typeof exports && 'undefined' != typeof module
    ? s(exports, require('@firebase/messaging-exp/sw'))
    : 'function' == typeof define && define.amd
    ? define(['exports', '@firebase/messaging-exp/sw'], s)
    : s(
        (((e =
          'undefined' != typeof globalThis ? globalThis : e || self).firebase =
          e.firebase || {}),
        (e.firebase.messaging = e.firebase.messaging || {})),
        e.sw
      );
})(this, function (e, s) {
  'use strict';
  try {
    (function () {
      Object.defineProperty(e, 'getMessaging', {
        enumerable: !0,
        get: function () {
          return s.getMessaging;
        }
      }),
        Object.defineProperty(e, 'onBackgroundMessage', {
          enumerable: !0,
          get: function () {
            return s.onBackgroundMessage;
          }
        }),
        Object.defineProperty(e, '__esModule', { value: !0 });
    }.apply(this, arguments));
  } catch (e) {
    throw (
      (console.error(e),
      new Error(
        'Cannot instantiate firebase-messaging.js - be sure to load firebase-app.js first.'
      ))
    );
  }
});
//# sourceMappingURL=firebase-messaging.js.map
