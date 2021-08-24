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

!(function (e, t) {
  'object' == typeof exports && 'undefined' != typeof module
    ? t(exports, require('@firebase/app-exp'))
    : 'function' == typeof define && define.amd
    ? define(['exports', '@firebase/app-exp'], t)
    : t(
        (((e =
          'undefined' != typeof globalThis ? globalThis : e || self).firebase =
          e.firebase || {}),
        (e.firebase.functions = e.firebase.functions || {})),
        e.firebase.app
      );
})(this, function (P, S) {
  'use strict';
  try {
    (function () {
      var r = function (e, t) {
        return (r =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (e, t) {
              e.__proto__ = t;
            }) ||
          function (e, t) {
            for (var n in t) t.hasOwnProperty(n) && (e[n] = t[n]);
          })(e, t);
      };
      function e(e, t) {
        function n() {
          this.constructor = e;
        }
        r(e, t),
          (e.prototype =
            null === t
              ? Object.create(t)
              : ((n.prototype = t.prototype), new n()));
      }
      function l(e, s, a, u) {
        return new (a = a || Promise)(function (n, t) {
          function r(e) {
            try {
              o(u.next(e));
            } catch (e) {
              t(e);
            }
          }
          function i(e) {
            try {
              o(u.throw(e));
            } catch (e) {
              t(e);
            }
          }
          function o(e) {
            var t;
            e.done
              ? n(e.value)
              : ((t = e.value) instanceof a
                  ? t
                  : new a(function (e) {
                      e(t);
                    })
                ).then(r, i);
          }
          o((u = u.apply(e, s || [])).next());
        });
      }
      function f(n, r) {
        var i,
          o,
          s,
          a = {
            label: 0,
            sent: function () {
              if (1 & s[0]) throw s[1];
              return s[1];
            },
            trys: [],
            ops: []
          },
          e = { next: t(0), throw: t(1), return: t(2) };
        return (
          'function' == typeof Symbol &&
            (e[Symbol.iterator] = function () {
              return this;
            }),
          e
        );
        function t(t) {
          return function (e) {
            return (function (t) {
              if (i) throw new TypeError('Generator is already executing.');
              for (; a; )
                try {
                  if (
                    ((i = 1),
                    o &&
                      (s =
                        2 & t[0]
                          ? o.return
                          : t[0]
                          ? o.throw || ((s = o.return) && s.call(o), 0)
                          : o.next) &&
                      !(s = s.call(o, t[1])).done)
                  )
                    return s;
                  switch (((o = 0), s && (t = [2 & t[0], s.value]), t[0])) {
                    case 0:
                    case 1:
                      s = t;
                      break;
                    case 4:
                      return a.label++, { value: t[1], done: !1 };
                    case 5:
                      a.label++, (o = t[1]), (t = [0]);
                      continue;
                    case 7:
                      (t = a.ops.pop()), a.trys.pop();
                      continue;
                    default:
                      if (
                        !(s = 0 < (s = a.trys).length && s[s.length - 1]) &&
                        (6 === t[0] || 2 === t[0])
                      ) {
                        a = 0;
                        continue;
                      }
                      if (3 === t[0] && (!s || (t[1] > s[0] && t[1] < s[3]))) {
                        a.label = t[1];
                        break;
                      }
                      if (6 === t[0] && a.label < s[1]) {
                        (a.label = s[1]), (s = t);
                        break;
                      }
                      if (s && a.label < s[2]) {
                        (a.label = s[2]), a.ops.push(t);
                        break;
                      }
                      s[2] && a.ops.pop(), a.trys.pop();
                      continue;
                  }
                  t = r.call(n, a);
                } catch (e) {
                  (t = [6, e]), (o = 0);
                } finally {
                  i = s = 0;
                }
              if (5 & t[0]) throw t[1];
              return { value: t[0] ? t[1] : void 0, done: !0 };
            })([t, e]);
          };
        }
      }
      var i,
        o = 'FirebaseError',
        s = (e(a, (i = Error)), a);
      function a(e, t, n) {
        t = i.call(this, t) || this;
        return (
          (t.code = e),
          (t.customData = n),
          (t.name = o),
          Object.setPrototypeOf(t, a.prototype),
          Error.captureStackTrace &&
            Error.captureStackTrace(t, u.prototype.create),
          t
        );
      }
      var u =
        ((t.prototype.create = function (e) {
          for (var t = [], n = 1; n < arguments.length; n++)
            t[n - 1] = arguments[n];
          var r,
            i = t[0] || {},
            o = this.service + '/' + e,
            e = this.errors[e],
            e = e
              ? ((r = i),
                e.replace(c, function (e, t) {
                  var n = r[t];
                  return null != n ? String(n) : '<' + t + '?>';
                }))
              : 'Error',
            e = this.serviceName + ': ' + e + ' (' + o + ').';
          return new s(o, e, i);
        }),
        t);
      function t(e, t, n) {
        (this.service = e), (this.serviceName = t), (this.errors = n);
      }
      var c = /\{\$([^}]+)}/g,
        n =
          ((h.prototype.setInstantiationMode = function (e) {
            return (this.instantiationMode = e), this;
          }),
          (h.prototype.setMultipleInstances = function (e) {
            return (this.multipleInstances = e), this;
          }),
          (h.prototype.setServiceProps = function (e) {
            return (this.serviceProps = e), this;
          }),
          h);
      function h(e, t, n) {
        (this.name = e),
          (this.instanceFactory = t),
          (this.type = n),
          (this.multipleInstances = !1),
          (this.serviceProps = {}),
          (this.instantiationMode = 'LAZY');
      }
      var p = 'type.googleapis.com/google.protobuf.Int64Value',
        d = 'type.googleapis.com/google.protobuf.UInt64Value';
      function v(e, t) {
        var n,
          r = {};
        for (n in e) e.hasOwnProperty(n) && (r[n] = t(e[n]));
        return r;
      }
      function g(e) {
        if (null == e) return e;
        if (e['@type'])
          switch (e['@type']) {
            case p:
            case d:
              var t = Number(e.value);
              if (isNaN(t))
                throw new Error('Data cannot be decoded from JSON: ' + e);
              return t;
            default:
              throw new Error('Data cannot be decoded from JSON: ' + e);
          }
        return Array.isArray(e)
          ? e.map(g)
          : 'function' == typeof e || 'object' == typeof e
          ? v(e, g)
          : e;
      }
      var m,
        y = 'functions',
        b = {
          OK: 'ok',
          CANCELLED: 'cancelled',
          UNKNOWN: 'unknown',
          INVALID_ARGUMENT: 'invalid-argument',
          DEADLINE_EXCEEDED: 'deadline-exceeded',
          NOT_FOUND: 'not-found',
          ALREADY_EXISTS: 'already-exists',
          PERMISSION_DENIED: 'permission-denied',
          UNAUTHENTICATED: 'unauthenticated',
          RESOURCE_EXHAUSTED: 'resource-exhausted',
          FAILED_PRECONDITION: 'failed-precondition',
          ABORTED: 'aborted',
          OUT_OF_RANGE: 'out-of-range',
          UNIMPLEMENTED: 'unimplemented',
          INTERNAL: 'internal',
          UNAVAILABLE: 'unavailable',
          DATA_LOSS: 'data-loss'
        },
        w = (e(E, (m = s)), E);
      function E(e, t, n) {
        t = m.call(this, y + '/' + e, t || '') || this;
        return (t.details = n), t;
      }
      function T(e, t) {
        var n = (function (e) {
            if (200 <= e && e < 300) return 'ok';
            switch (e) {
              case 0:
                return 'internal';
              case 400:
                return 'invalid-argument';
              case 401:
                return 'unauthenticated';
              case 403:
                return 'permission-denied';
              case 404:
                return 'not-found';
              case 409:
                return 'aborted';
              case 429:
                return 'resource-exhausted';
              case 499:
                return 'cancelled';
              case 500:
                return 'internal';
              case 501:
                return 'unimplemented';
              case 503:
                return 'unavailable';
              case 504:
                return 'deadline-exceeded';
            }
            return 'unknown';
          })(e),
          r = n,
          i = void 0;
        try {
          var o = t && t.error;
          if (o) {
            var s = o.status;
            if ('string' == typeof s) {
              if (!b[s]) return new w('internal', 'internal');
              (n = b[s]), (r = s);
            }
            s = o.message;
            'string' == typeof s && (r = s),
              void 0 !== (i = o.details) && (i = g(i));
          }
        } catch (e) {}
        return 'ok' === n ? null : new w(n, r, i);
      }
      var N =
        ((O.prototype.getAuthToken = function () {
          return l(this, void 0, void 0, function () {
            var t;
            return f(this, function (e) {
              switch (e.label) {
                case 0:
                  if (!this.auth) return [2, void 0];
                  e.label = 1;
                case 1:
                  return e.trys.push([1, 3, , 4]), [4, this.auth.getToken()];
                case 2:
                  return [2, null == (t = e.sent()) ? void 0 : t.accessToken];
                case 3:
                  return e.sent(), [2, void 0];
                case 4:
                  return [2];
              }
            });
          });
        }),
        (O.prototype.getMessagingToken = function () {
          return l(this, void 0, void 0, function () {
            return f(this, function (e) {
              if (
                !(
                  this.messaging &&
                  'Notification' in self &&
                  'granted' === Notification.permission
                )
              )
                return [2, void 0];
              try {
                return [2, this.messaging.getToken()];
              } catch (e) {
                return [2, void 0];
              }
              return [2];
            });
          });
        }),
        (O.prototype.getContext = function () {
          return l(this, void 0, void 0, function () {
            var t, n;
            return f(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, this.getAuthToken()];
                case 1:
                  return (t = e.sent()), [4, this.getMessagingToken()];
                case 2:
                  return (
                    (n = e.sent()), [2, { authToken: t, messagingToken: n }]
                  );
              }
            });
          });
        }),
        O);
      function O(e, t) {
        var n = this;
        (this.auth = null),
          (this.messaging = null),
          (this.auth = e.getImmediate({ optional: !0 })),
          (this.messaging = t.getImmediate({ optional: !0 })),
          this.auth ||
            e.get().then(
              function (e) {
                return (n.auth = e);
              },
              function () {}
            ),
          this.messaging ||
            t.get().then(
              function (e) {
                return (n.messaging = e);
              },
              function () {}
            );
      }
      var I = 'us-central1';
      var A =
        ((D.prototype._delete = function () {
          return this.deleteService();
        }),
        (D.prototype._url = function (e) {
          var t = this.app.options.projectId;
          return null === this.emulatorOrigin
            ? null !== this.customDomain
              ? this.customDomain + '/' + e
              : 'https://' + this.region + '-' + t + '.cloudfunctions.net/' + e
            : this.emulatorOrigin + '/' + t + '/' + this.region + '/' + e;
        }),
        D);
      function D(e, t, n, r, i) {
        var o = this;
        void 0 === r && (r = I),
          (this.app = e),
          (this.fetchImpl = i),
          (this.emulatorOrigin = null),
          (this.contextProvider = new N(t, n)),
          (this.cancelAllRequests = new Promise(function (e) {
            o.deleteService = function () {
              return Promise.resolve(e());
            };
          }));
        try {
          var s = new URL(r);
          (this.customDomain = s.origin), (this.region = I);
        } catch (e) {
          (this.customDomain = null), (this.region = r);
        }
      }
      function k(t, n, r) {
        return function (e) {
          return (function (s, a, u, c) {
            return l(this, void 0, void 0, function () {
              var t, r, i, o;
              return f(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      (t = s._url(a)),
                      (u = (function e(t) {
                        if (null == t) return null;
                        if (
                          (t instanceof Number && (t = t.valueOf()),
                          'number' == typeof t && isFinite(t))
                        )
                          return t;
                        if (!0 === t || !1 === t) return t;
                        if (
                          '[object String]' ===
                          Object.prototype.toString.call(t)
                        )
                          return t;
                        if (Array.isArray(t)) return t.map(e);
                        if ('function' == typeof t || 'object' == typeof t)
                          return v(t, e);
                        throw new Error('Data cannot be encoded in JSON: ' + t);
                      })(u)),
                      (r = { data: u }),
                      (i = {}),
                      [4, s.contextProvider.getContext()]
                    );
                  case 1:
                    return (
                      (o = e.sent()).authToken &&
                        (i.Authorization = 'Bearer ' + o.authToken),
                      o.messagingToken &&
                        (i['Firebase-Instance-ID-Token'] = o.messagingToken),
                      (o = c.timeout || 7e4),
                      [
                        4,
                        Promise.race([
                          (function (r, i, o, s) {
                            return l(this, void 0, void 0, function () {
                              var t, n;
                              return f(this, function (e) {
                                switch (e.label) {
                                  case 0:
                                    (o['Content-Type'] = 'application/json'),
                                      (e.label = 1);
                                  case 1:
                                    return (
                                      e.trys.push([1, 3, , 4]),
                                      [
                                        4,
                                        s(r, {
                                          method: 'POST',
                                          body: JSON.stringify(i),
                                          headers: o
                                        })
                                      ]
                                    );
                                  case 2:
                                    return (t = e.sent()), [3, 4];
                                  case 3:
                                    return (
                                      e.sent(), [2, { status: 0, json: null }]
                                    );
                                  case 4:
                                    (n = null), (e.label = 5);
                                  case 5:
                                    return (
                                      e.trys.push([5, 7, , 8]), [4, t.json()]
                                    );
                                  case 6:
                                    return (n = e.sent()), [3, 8];
                                  case 7:
                                    return e.sent(), [3, 8];
                                  case 8:
                                    return [2, { status: t.status, json: n }];
                                }
                              });
                            });
                          })(t, r, i, s.fetchImpl),
                          ((n = o),
                          new Promise(function (e, t) {
                            setTimeout(function () {
                              t(
                                new w('deadline-exceeded', 'deadline-exceeded')
                              );
                            }, n);
                          })),
                          s.cancelAllRequests
                        ])
                      ]
                    );
                  case 2:
                    if (!(i = e.sent()))
                      throw new w(
                        'cancelled',
                        'Firebase Functions instance was deleted.'
                      );
                    if ((o = T(i.status, i.json))) throw o;
                    if (!i.json)
                      throw new w(
                        'internal',
                        'Response is not valid JSON object.'
                      );
                    if (
                      (void 0 === (o = i.json.data) && (o = i.json.result),
                      void 0 === o)
                    )
                      throw new w(
                        'internal',
                        'Response is missing data field.'
                      );
                    return [2, { data: g(o) }];
                }
                var n;
              });
            });
          })(t, n, e, r || {});
        };
      }
      var _;
      (_ = fetch.bind(self)),
        S._registerComponent(
          new n(
            y,
            function (e, t) {
              var n = e.getProvider('app-exp').getImmediate(),
                r = e.getProvider('auth-internal'),
                e = e.getProvider('messaging');
              return new A(n, r, e, t, _);
            },
            'PUBLIC'
          ).setMultipleInstances(!0)
        ),
        S.registerVersion('@firebase/functions-exp', '0.0.900'),
        (P.getFunctions = function (e, t) {
          return (
            void 0 === t && (t = I),
            S._getProvider(e, y).getImmediate({ identifier: t })
          );
        }),
        (P.httpsCallable = k),
        (P.useFunctionsEmulator = function (e, t, n) {
          (t = t), (n = n), (e.emulatorOrigin = 'http://' + t + ':' + n);
        }),
        Object.defineProperty(P, '__esModule', { value: !0 });
    }.apply(this, arguments));
  } catch (e) {
    throw (
      (console.error(e),
      new Error(
        'Cannot instantiate firebase-functions.js - be sure to load firebase-app.js first.'
      ))
    );
  }
});
//# sourceMappingURL=firebase-functions.js.map
