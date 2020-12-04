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

!(function (t, n, r) {
  'use strict';
  function u(t) {
    return new n.Observable(function (n) {
      return (
        t.on(
          'state_changed',
          function (t) {
            return n.next(t);
          },
          function (t) {
            return n.error(t);
          },
          function () {
            return n.complete();
          }
        ),
        function () {
          return t.cancel();
        }
      );
    });
  }
  (t.fromTask = u),
    (t.getDownloadURL = function (t) {
      return n.from(t.getDownloadURL());
    }),
    (t.getMetadata = function (t) {
      return n.from(t.getMetadata());
    }),
    (t.percentage = function (t) {
      return u(t).pipe(
        r.map(function (t) {
          return {
            progress: (t.bytesTransferred / t.totalBytes) * 100,
            snapshot: t
          };
        })
      );
    }),
    (t.put = function (t, n, r) {
      return u(t.put(n, r));
    }),
    (t.putString = function (t, n, r, e) {
      return u(t.putString(n, r, e));
    }),
    Object.defineProperty(t, '__esModule', { value: !0 });
})((this.rxfire = this.rxfire || {}), rxjs, rxjs.operators);
//# sourceMappingURL=rxfire-storage.js.map
