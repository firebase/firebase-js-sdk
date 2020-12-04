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

!(function (r, n, i) {
  'use strict';
  (r.httpsCallable = function (r, t) {
    var e = r.httpsCallable(t);
    return function (r) {
      return n.from(e(r)).pipe(
        i.map(function (r) {
          return r.data;
        })
      );
    };
  }),
    Object.defineProperty(r, '__esModule', { value: !0 });
})((this.rxfire = this.rxfire || {}), rxjs, rxjs.operators);
//# sourceMappingURL=rxfire-functions.js.map
