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

!(function (v, u, o, l) {
  'use strict';
  function c(n, r) {
    return new u.Observable(function (t) {
      var e = n.on(
        r,
        function (e, n) {
          t.next({ snapshot: e, prevKey: n, event: r });
        },
        t.error.bind(t)
      );
      return {
        unsubscribe: function () {
          n.off(r, e);
        }
      };
    }).pipe(o.delay(0));
  }
  var e;
  function t(e) {
    return (
      (null != e && 0 !== e.length) ||
        (e = [
          v.ListenEvent.added,
          v.ListenEvent.removed,
          v.ListenEvent.changed,
          v.ListenEvent.moved
        ]),
      e
    );
  }
  function r(e, n) {
    var t = e.snapshot.val();
    return 'object' != typeof t
      ? t
      : l.__assign(
          l.__assign({}, t),
          n ? (((t = {})[n] = e.snapshot.key), t) : null
        );
  }
  function s(i, e) {
    var a = t(e);
    return (
      (e = i),
      u
        .from(e.once(v.ListenEvent.value))
        .pipe(
          o.map(function (e) {
            return { snapshot: e, prevKey: null, event: v.ListenEvent.value };
          })
        )
        .pipe(
          o.switchMap(function (e) {
            for (var n = [u.of(e)], t = 0, r = a; t < r.length; t++) {
              var s = r[t];
              n.push(c(i, s));
            }
            return u.merge.apply(void 0, n).pipe(o.scan(f, []));
          }),
          o.distinctUntilChanged()
        )
    );
  }
  function p(e, n) {
    for (var t = e.length, r = 0; r < t; r++)
      if (e[r].snapshot.key === n) return r;
    return -1;
  }
  function f(t, n) {
    var e,
      r,
      s,
      i = n.snapshot,
      a = n.prevKey,
      u = n.event,
      o = i.key,
      c = p(t, o),
      r =
        ((e = t),
        null == (r = a || void 0)
          ? 0
          : -1 === (r = p(e, r))
          ? e.length
          : r + 1);
    switch (u) {
      case v.ListenEvent.value:
        return (
          n.snapshot &&
            n.snapshot.exists() &&
            ((s = null),
            n.snapshot.forEach(function (e) {
              var n = { snapshot: e, event: v.ListenEvent.value, prevKey: s };
              return (s = e.key), (t = l.__spreadArrays(t, [n])), !1;
            })),
          t
        );
      case v.ListenEvent.added:
        if (-1 < c) {
          u = t[c - 1];
          ((u && u.snapshot.key) || null) !== a &&
            (t = t.filter(function (e) {
              return e.snapshot.key !== i.key;
            })).splice(r, 0, n);
        } else {
          if (null == a) return l.__spreadArrays([n], t);
          (t = t.slice()).splice(r, 0, n);
        }
        return t;
      case v.ListenEvent.removed:
        return t.filter(function (e) {
          return e.snapshot.key !== i.key;
        });
      case v.ListenEvent.changed:
        return t.map(function (e) {
          return e.snapshot.key === o ? n : e;
        });
      case v.ListenEvent.moved:
        if (-1 < c) {
          c = t.splice(c, 1)[0];
          return (t = t.slice()).splice(r, 0, c), t;
        }
        return t;
      default:
        return t;
    }
  }
  ((e = v.ListenEvent || (v.ListenEvent = {})).added = 'child_added'),
    (e.removed = 'child_removed'),
    (e.changed = 'child_changed'),
    (e.moved = 'child_moved'),
    (e.value = 'value'),
    (v.changeToData = r),
    (v.fromRef = c),
    (v.list = s),
    (v.listVal = function (e, n) {
      return s(e).pipe(
        o.map(function (e) {
          return e.map(function (e) {
            return r(e, n);
          });
        })
      );
    }),
    (v.object = function (e) {
      return c(e, v.ListenEvent.value);
    }),
    (v.objectVal = function (e, n) {
      return c(e, v.ListenEvent.value).pipe(
        o.map(function (e) {
          return r(e, n);
        })
      );
    }),
    (v.stateChanges = function (n, e) {
      return (
        (e = (e = t(e)).map(function (e) {
          return c(n, e);
        })),
        u.merge.apply(void 0, e)
      );
    }),
    Object.defineProperty(v, '__esModule', { value: !0 });
})((this.rxfire = this.rxfire || {}), rxjs, rxjs.operators, tslib);
//# sourceMappingURL=rxfire-database.js.map
