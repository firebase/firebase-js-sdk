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
        (e.firebase.messaging = e.firebase.messaging || {})),
        e.firebase.app
      );
})(this, function (xe, Ce) {
  'use strict';
  try {
    (function () {
      var n = function (e, t) {
        return (n =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (e, t) {
              e.__proto__ = t;
            }) ||
          function (e, t) {
            for (var n in t) t.hasOwnProperty(n) && (e[n] = t[n]);
          })(e, t);
      };
      var a = function () {
        return (a =
          Object.assign ||
          function (e) {
            for (var t, n = 1, r = arguments.length; n < r; n++)
              for (var o in (t = arguments[n]))
                Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
            return e;
          }).apply(this, arguments);
      };
      function c(e, a, s, u) {
        return new (s = s || Promise)(function (n, t) {
          function r(e) {
            try {
              i(u.next(e));
            } catch (e) {
              t(e);
            }
          }
          function o(e) {
            try {
              i(u.throw(e));
            } catch (e) {
              t(e);
            }
          }
          function i(e) {
            var t;
            e.done
              ? n(e.value)
              : ((t = e.value) instanceof s
                  ? t
                  : new s(function (e) {
                      e(t);
                    })
                ).then(r, o);
          }
          i((u = u.apply(e, a || [])).next());
        });
      }
      function l(n, r) {
        var o,
          i,
          a,
          s = {
            label: 0,
            sent: function () {
              if (1 & a[0]) throw a[1];
              return a[1];
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
              if (o) throw new TypeError('Generator is already executing.');
              for (; s; )
                try {
                  if (
                    ((o = 1),
                    i &&
                      (a =
                        2 & t[0]
                          ? i.return
                          : t[0]
                          ? i.throw || ((a = i.return) && a.call(i), 0)
                          : i.next) &&
                      !(a = a.call(i, t[1])).done)
                  )
                    return a;
                  switch (((i = 0), a && (t = [2 & t[0], a.value]), t[0])) {
                    case 0:
                    case 1:
                      a = t;
                      break;
                    case 4:
                      return s.label++, { value: t[1], done: !1 };
                    case 5:
                      s.label++, (i = t[1]), (t = [0]);
                      continue;
                    case 7:
                      (t = s.ops.pop()), s.trys.pop();
                      continue;
                    default:
                      if (
                        !(a = 0 < (a = s.trys).length && a[a.length - 1]) &&
                        (6 === t[0] || 2 === t[0])
                      ) {
                        s = 0;
                        continue;
                      }
                      if (3 === t[0] && (!a || (t[1] > a[0] && t[1] < a[3]))) {
                        s.label = t[1];
                        break;
                      }
                      if (6 === t[0] && s.label < a[1]) {
                        (s.label = a[1]), (a = t);
                        break;
                      }
                      if (a && s.label < a[2]) {
                        (s.label = a[2]), s.ops.push(t);
                        break;
                      }
                      a[2] && s.ops.pop(), s.trys.pop();
                      continue;
                  }
                  t = r.call(n, s);
                } catch (e) {
                  (t = [6, e]), (i = 0);
                } finally {
                  o = a = 0;
                }
              if (5 & t[0]) throw t[1];
              return { value: t[0] ? t[1] : void 0, done: !0 };
            })([t, e]);
          };
        }
      }
      function s(e) {
        var t = 'function' == typeof Symbol && Symbol.iterator,
          n = t && e[t],
          r = 0;
        if (n) return n.call(e);
        if (e && 'number' == typeof e.length)
          return {
            next: function () {
              return (
                e && r >= e.length && (e = void 0),
                { value: e && e[r++], done: !e }
              );
            }
          };
        throw new TypeError(
          t ? 'Object is not iterable.' : 'Symbol.iterator is not defined.'
        );
      }
      function t() {
        for (var e = [], t = 0; t < arguments.length; t++)
          e = e.concat(
            (function (e, t) {
              var n = 'function' == typeof Symbol && e[Symbol.iterator];
              if (!n) return e;
              var r,
                o,
                i = n.call(e),
                a = [];
              try {
                for (; (void 0 === t || 0 < t--) && !(r = i.next()).done; )
                  a.push(r.value);
              } catch (e) {
                o = { error: e };
              } finally {
                try {
                  r && !r.done && (n = i.return) && n.call(i);
                } finally {
                  if (o) throw o.error;
                }
              }
              return a;
            })(arguments[t])
          );
        return e;
      }
      var r,
        e,
        o,
        i = 'FirebaseError',
        u =
          ((r = Error),
          n((e = p), (o = r)),
          (e.prototype =
            null === o
              ? Object.create(o)
              : ((f.prototype = o.prototype), new f())),
          p);
      function f() {
        this.constructor = e;
      }
      function p(e, t, n) {
        t = r.call(this, t) || this;
        return (
          (t.code = e),
          (t.customData = n),
          (t.name = i),
          Object.setPrototypeOf(t, p.prototype),
          Error.captureStackTrace &&
            Error.captureStackTrace(t, d.prototype.create),
          t
        );
      }
      var d =
        ((h.prototype.create = function (e) {
          for (var t = [], n = 1; n < arguments.length; n++)
            t[n - 1] = arguments[n];
          var r,
            o = t[0] || {},
            i = this.service + '/' + e,
            e = this.errors[e],
            e = e
              ? ((r = o),
                e.replace(v, function (e, t) {
                  var n = r[t];
                  return null != n ? String(n) : '<' + t + '?>';
                }))
              : 'Error',
            e = this.serviceName + ': ' + e + ' (' + i + ').';
          return new u(i, e, o);
        }),
        h);
      function h(e, t, n) {
        (this.service = e), (this.serviceName = t), (this.errors = n);
      }
      var v = /\{\$([^}]+)}/g,
        g =
          ((y.prototype.setInstantiationMode = function (e) {
            return (this.instantiationMode = e), this;
          }),
          (y.prototype.setMultipleInstances = function (e) {
            return (this.multipleInstances = e), this;
          }),
          (y.prototype.setServiceProps = function (e) {
            return (this.serviceProps = e), this;
          }),
          y);
      function y(e, t, n) {
        (this.name = e),
          (this.instanceFactory = t),
          (this.type = n),
          (this.multipleInstances = !1),
          (this.serviceProps = {}),
          (this.instantiationMode = 'LAZY');
      }
      function b(n) {
        return new Promise(function (e, t) {
          (n.onsuccess = function () {
            e(n.result);
          }),
            (n.onerror = function () {
              t(n.error);
            });
        });
      }
      function m(n, r, o) {
        var i,
          e = new Promise(function (e, t) {
            b((i = n[r].apply(n, o))).then(e, t);
          });
        return (e.request = i), e;
      }
      function w(e, n, t) {
        t.forEach(function (t) {
          Object.defineProperty(e.prototype, t, {
            get: function () {
              return this[n][t];
            },
            set: function (e) {
              this[n][t] = e;
            }
          });
        });
      }
      function I(t, n, r, e) {
        e.forEach(function (e) {
          e in r.prototype &&
            (t.prototype[e] = function () {
              return m(this[n], e, arguments);
            });
        });
      }
      function k(t, n, r, e) {
        e.forEach(function (e) {
          e in r.prototype &&
            (t.prototype[e] = function () {
              return this[n][e].apply(this[n], arguments);
            });
        });
      }
      function S(e, r, t, n) {
        n.forEach(function (n) {
          n in t.prototype &&
            (e.prototype[n] = function () {
              return (
                (e = this[r]),
                (t = m(e, n, arguments)).then(function (e) {
                  if (e) return new P(e, t.request);
                })
              );
              var e, t;
            });
        });
      }
      function _(e) {
        this._index = e;
      }
      function P(e, t) {
        (this._cursor = e), (this._request = t);
      }
      function x(e) {
        this._store = e;
      }
      function C(n) {
        (this._tx = n),
          (this.complete = new Promise(function (e, t) {
            (n.oncomplete = function () {
              e();
            }),
              (n.onerror = function () {
                t(n.error);
              }),
              (n.onabort = function () {
                t(n.error);
              });
          }));
      }
      function T(e, t, n) {
        (this._db = e), (this.oldVersion = t), (this.transaction = new C(n));
      }
      function j(e) {
        this._db = e;
      }
      w(_, '_index', ['name', 'keyPath', 'multiEntry', 'unique']),
        I(_, '_index', IDBIndex, [
          'get',
          'getKey',
          'getAll',
          'getAllKeys',
          'count'
        ]),
        S(_, '_index', IDBIndex, ['openCursor', 'openKeyCursor']),
        w(P, '_cursor', ['direction', 'key', 'primaryKey', 'value']),
        I(P, '_cursor', IDBCursor, ['update', 'delete']),
        ['advance', 'continue', 'continuePrimaryKey'].forEach(function (n) {
          n in IDBCursor.prototype &&
            (P.prototype[n] = function () {
              var t = this,
                e = arguments;
              return Promise.resolve().then(function () {
                return (
                  t._cursor[n].apply(t._cursor, e),
                  b(t._request).then(function (e) {
                    if (e) return new P(e, t._request);
                  })
                );
              });
            });
        }),
        (x.prototype.createIndex = function () {
          return new _(this._store.createIndex.apply(this._store, arguments));
        }),
        (x.prototype.index = function () {
          return new _(this._store.index.apply(this._store, arguments));
        }),
        w(x, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']),
        I(x, '_store', IDBObjectStore, [
          'put',
          'add',
          'delete',
          'clear',
          'get',
          'getAll',
          'getKey',
          'getAllKeys',
          'count'
        ]),
        S(x, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']),
        k(x, '_store', IDBObjectStore, ['deleteIndex']),
        (C.prototype.objectStore = function () {
          return new x(this._tx.objectStore.apply(this._tx, arguments));
        }),
        w(C, '_tx', ['objectStoreNames', 'mode']),
        k(C, '_tx', IDBTransaction, ['abort']),
        (T.prototype.createObjectStore = function () {
          return new x(this._db.createObjectStore.apply(this._db, arguments));
        }),
        w(T, '_db', ['name', 'version', 'objectStoreNames']),
        k(T, '_db', IDBDatabase, ['deleteObjectStore', 'close']),
        (j.prototype.transaction = function () {
          return new C(this._db.transaction.apply(this._db, arguments));
        }),
        w(j, '_db', ['name', 'version', 'objectStoreNames']),
        k(j, '_db', IDBDatabase, ['close']),
        ['openCursor', 'openKeyCursor'].forEach(function (o) {
          [x, _].forEach(function (e) {
            o in e.prototype &&
              (e.prototype[o.replace('open', 'iterate')] = function () {
                var e = ((n = arguments), Array.prototype.slice.call(n)),
                  t = e[e.length - 1],
                  n = this._store || this._index,
                  r = n[o].apply(n, e.slice(0, -1));
                r.onsuccess = function () {
                  t(r.result);
                };
              });
          });
        }),
        [_, x].forEach(function (e) {
          e.prototype.getAll ||
            (e.prototype.getAll = function (e, n) {
              var r = this,
                o = [];
              return new Promise(function (t) {
                r.iterateCursor(e, function (e) {
                  e
                    ? (o.push(e.value),
                      void 0 === n || o.length != n ? e.continue() : t(o))
                    : t(o);
                });
              });
            });
        });
      var D = '0.0.900',
        E = 1e4,
        O = 'w:' + D,
        q = 'FIS_v2',
        A = 'https://firebaseinstallations.googleapis.com/v1',
        N = 36e5,
        M =
          (((M = {})['missing-app-config-values'] =
            'Missing App configuration value: "{$valueName}"'),
          (M['not-registered'] = 'Firebase Installation is not registered.'),
          (M['installation-not-found'] = 'Firebase Installation not found.'),
          (M['request-failed'] =
            '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"'),
          (M['app-offline'] =
            'Could not process request. Application offline.'),
          (M['delete-pending-registration'] =
            "Can't delete installation while there is a pending registration request."),
          M),
        B = new d('installations', 'Installations', M);
      function K(e) {
        return e instanceof u && e.code.includes('request-failed');
      }
      function F(e) {
        e = e.projectId;
        return A + '/projects/' + e + '/installations';
      }
      function V(e) {
        return {
          token: e.token,
          requestStatus: 2,
          expiresIn: ((e = e.expiresIn), Number(e.replace('s', '000'))),
          creationTime: Date.now()
        };
      }
      function $(n, r) {
        return c(this, void 0, void 0, function () {
          var t;
          return l(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, r.json()];
              case 1:
                return (
                  (t = e.sent()),
                  (t = t.error),
                  [
                    2,
                    B.create('request-failed', {
                      requestName: n,
                      serverCode: t.code,
                      serverMessage: t.message,
                      serverStatus: t.status
                    })
                  ]
                );
            }
          });
        });
      }
      function W(e) {
        e = e.apiKey;
        return new Headers({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-goog-api-key': e
        });
      }
      function L(e, t) {
        (t = t.refreshToken), (e = W(e));
        return e.append('Authorization', q + ' ' + t), e;
      }
      function R(n) {
        return c(this, void 0, void 0, function () {
          var t;
          return l(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, n()];
              case 1:
                return 500 <= (t = e.sent()).status && t.status < 600
                  ? [2, n()]
                  : [2, t];
            }
          });
        });
      }
      function H(t) {
        return new Promise(function (e) {
          setTimeout(e, t);
        });
      }
      var U = /^[cdef][\w-]{21}$/,
        G = '';
      function z() {
        try {
          var e = new Uint8Array(17);
          (self.crypto || self.msCrypto).getRandomValues(e),
            (e[0] = 112 + (e[0] % 16));
          e = (function (e) {
            return btoa(String.fromCharCode.apply(String, t(e)))
              .replace(/\+/g, '-')
              .replace(/\//g, '_');
          })(e).substr(0, 22);
          return U.test(e) ? e : G;
        } catch (e) {
          return G;
        }
      }
      function J(e) {
        return e.appName + '!' + e.appId;
      }
      var Y = new Map();
      function Z(e, t) {
        e = J(e);
        Q(e, t),
          (function (e, t) {
            var n = (function () {
              !X &&
                'BroadcastChannel' in self &&
                ((X = new BroadcastChannel('[Firebase] FID Change')).onmessage =
                  function (e) {
                    Q(e.data.key, e.data.fid);
                  });
              return X;
            })();
            n && n.postMessage({ key: e, fid: t });
            0 === Y.size && X && (X.close(), (X = null));
          })(e, t);
      }
      function Q(e, t) {
        var n,
          r,
          o = Y.get(e);
        if (o)
          try {
            for (var i = s(o), a = i.next(); !a.done; a = i.next()) {
              (0, a.value)(t);
            }
          } catch (e) {
            n = { error: e };
          } finally {
            try {
              a && !a.done && (r = i.return) && r.call(i);
            } finally {
              if (n) throw n.error;
            }
          }
      }
      var X = null;
      var ee = 'firebase-installations-database',
        te = 1,
        ne = 'firebase-installations-store',
        re = null;
      function oe() {
        var e, t, n;
        return (
          re ||
            ((e = te),
            (t = function (e) {
              0 === e.oldVersion && e.createObjectStore(ne);
            }),
            (n = (e = m(indexedDB, 'open', [ee, e])).request) &&
              (n.onupgradeneeded = function (e) {
                t && t(new T(n.result, e.oldVersion, n.transaction));
              }),
            (re = e.then(function (e) {
              return new j(e);
            }))),
          re
        );
      }
      function ie(i, a) {
        return c(this, void 0, void 0, function () {
          var t, n, r, o;
          return l(this, function (e) {
            switch (e.label) {
              case 0:
                return (t = J(i)), [4, oe()];
              case 1:
                return (
                  (r = e.sent()),
                  (n = r.transaction(ne, 'readwrite')),
                  [4, (r = n.objectStore(ne)).get(t)]
                );
              case 2:
                return (o = e.sent()), [4, r.put(a, t)];
              case 3:
                return e.sent(), [4, n.complete];
              case 4:
                return e.sent(), (o && o.fid === a.fid) || Z(i, a.fid), [2, a];
            }
          });
        });
      }
      function ae(r) {
        return c(this, void 0, void 0, function () {
          var t, n;
          return l(this, function (e) {
            switch (e.label) {
              case 0:
                return (t = J(r)), [4, oe()];
              case 1:
                return (
                  (n = e.sent()),
                  [
                    4,
                    (n = n.transaction(ne, 'readwrite'))
                      .objectStore(ne)
                      .delete(t)
                  ]
                );
              case 2:
                return e.sent(), [4, n.complete];
              case 3:
                return e.sent(), [2];
            }
          });
        });
      }
      function se(a, s) {
        return c(this, void 0, void 0, function () {
          var t, n, r, o, i;
          return l(this, function (e) {
            switch (e.label) {
              case 0:
                return (t = J(a)), [4, oe()];
              case 1:
                return (
                  (r = e.sent()),
                  (n = r.transaction(ne, 'readwrite')),
                  [4, (r = n.objectStore(ne)).get(t)]
                );
              case 2:
                return (
                  (o = e.sent()),
                  void 0 !== (i = s(o)) ? [3, 4] : [4, r.delete(t)]
                );
              case 3:
                return e.sent(), [3, 6];
              case 4:
                return [4, r.put(i, t)];
              case 5:
                e.sent(), (e.label = 6);
              case 6:
                return [4, n.complete];
              case 7:
                return (
                  e.sent(), !i || (o && o.fid === i.fid) || Z(a, i.fid), [2, i]
                );
            }
          });
        });
      }
      function ue(o) {
        return c(this, void 0, void 0, function () {
          var t, n, r;
          return l(this, function (e) {
            switch (e.label) {
              case 0:
                return [
                  4,
                  se(o, function (e) {
                    (e = le(e || { fid: z(), registrationStatus: 0 })),
                      (e = (function (e, t) {
                        {
                          if (0 !== t.registrationStatus)
                            return 1 === t.registrationStatus
                              ? {
                                  installationEntry: t,
                                  registrationPromise: (function (o) {
                                    return c(this, void 0, void 0, function () {
                                      var t, n, r;
                                      return l(this, function (e) {
                                        switch (e.label) {
                                          case 0:
                                            return [4, ce(o)];
                                          case 1:
                                            (t = e.sent()), (e.label = 2);
                                          case 2:
                                            return 1 !== t.registrationStatus
                                              ? [3, 5]
                                              : [4, H(100)];
                                          case 3:
                                            return e.sent(), [4, ce(o)];
                                          case 4:
                                            return (t = e.sent()), [3, 2];
                                          case 5:
                                            return 0 !== t.registrationStatus
                                              ? [3, 7]
                                              : [4, ue(o)];
                                          case 6:
                                            return (
                                              (r = e.sent()),
                                              (n = r.installationEntry),
                                              (r = r.registrationPromise)
                                                ? [2, r]
                                                : [2, n]
                                            );
                                          case 7:
                                            return [2, t];
                                        }
                                      });
                                    });
                                  })(e)
                                }
                              : { installationEntry: t };
                          if (!navigator.onLine) {
                            var n = Promise.reject(B.create('app-offline'));
                            return {
                              installationEntry: t,
                              registrationPromise: n
                            };
                          }
                          (t = {
                            fid: t.fid,
                            registrationStatus: 1,
                            registrationTime: Date.now()
                          }),
                            (e = (function (r, o) {
                              return c(this, void 0, void 0, function () {
                                var t, n;
                                return l(this, function (e) {
                                  switch (e.label) {
                                    case 0:
                                      return (
                                        e.trys.push([0, 2, , 7]),
                                        [
                                          4,
                                          (function (a, e) {
                                            var s = e.fid;
                                            return c(
                                              this,
                                              void 0,
                                              void 0,
                                              function () {
                                                var t, n, r, o, i;
                                                return l(this, function (e) {
                                                  switch (e.label) {
                                                    case 0:
                                                      return (
                                                        (t = F(a)),
                                                        (n = W(a)),
                                                        (i = {
                                                          fid: s,
                                                          authVersion: q,
                                                          appId: a.appId,
                                                          sdkVersion: O
                                                        }),
                                                        (r = {
                                                          method: 'POST',
                                                          headers: n,
                                                          body: JSON.stringify(
                                                            i
                                                          )
                                                        }),
                                                        [
                                                          4,
                                                          R(function () {
                                                            return fetch(t, r);
                                                          })
                                                        ]
                                                      );
                                                    case 1:
                                                      return (o = e.sent()).ok
                                                        ? [4, o.json()]
                                                        : [3, 3];
                                                    case 2:
                                                      return (
                                                        (i = e.sent()),
                                                        [
                                                          2,
                                                          {
                                                            fid: i.fid || s,
                                                            registrationStatus: 2,
                                                            refreshToken:
                                                              i.refreshToken,
                                                            authToken: V(
                                                              i.authToken
                                                            )
                                                          }
                                                        ]
                                                      );
                                                    case 3:
                                                      return [
                                                        4,
                                                        $(
                                                          'Create Installation',
                                                          o
                                                        )
                                                      ];
                                                    case 4:
                                                      throw e.sent();
                                                  }
                                                });
                                              }
                                            );
                                          })(r, o)
                                        ]
                                      );
                                    case 1:
                                      return (t = e.sent()), [2, ie(r, t)];
                                    case 2:
                                      return K((n = e.sent())) &&
                                        409 === n.customData.serverCode
                                        ? [4, ae(r)]
                                        : [3, 4];
                                    case 3:
                                      return e.sent(), [3, 6];
                                    case 4:
                                      return [
                                        4,
                                        ie(r, {
                                          fid: o.fid,
                                          registrationStatus: 0
                                        })
                                      ];
                                    case 5:
                                      e.sent(), (e.label = 6);
                                    case 6:
                                      throw n;
                                    case 7:
                                      return [2];
                                  }
                                });
                              });
                            })(e, t));
                          return {
                            installationEntry: t,
                            registrationPromise: e
                          };
                        }
                      })(o, e));
                    return (t = e.registrationPromise), e.installationEntry;
                  })
                ];
              case 1:
                return (n = e.sent()).fid !== G ? [3, 3] : ((r = {}), [4, t]);
              case 2:
                return [2, ((r.installationEntry = e.sent()), r)];
              case 3:
                return [2, { installationEntry: n, registrationPromise: t }];
            }
          });
        });
      }
      function ce(e) {
        return se(e, function (e) {
          if (!e) throw B.create('installation-not-found');
          return le(e);
        });
      }
      function le(e) {
        return 1 === (t = e).registrationStatus &&
          t.registrationTime + E < Date.now()
          ? { fid: e.fid, registrationStatus: 0 }
          : e;
        var t;
      }
      function fe(e, a) {
        var s = e.appConfig,
          u = e.platformLoggerProvider;
        return c(this, void 0, void 0, function () {
          var t, n, r, o, i;
          return l(this, function (e) {
            switch (e.label) {
              case 0:
                return (
                  (t = (function (e, t) {
                    t = t.fid;
                    return F(e) + '/' + t + '/authTokens:generate';
                  })(s, a)),
                  (n = L(s, a)),
                  (i = u.getImmediate({ optional: !0 })) &&
                    n.append('x-firebase-client', i.getPlatformInfoString()),
                  (i = { installation: { sdkVersion: O } }),
                  (r = { method: 'POST', headers: n, body: JSON.stringify(i) }),
                  [
                    4,
                    R(function () {
                      return fetch(t, r);
                    })
                  ]
                );
              case 1:
                return (o = e.sent()).ok ? [4, o.json()] : [3, 3];
              case 2:
                return (i = e.sent()), [2, V(i)];
              case 3:
                return [4, $('Generate Auth Token', o)];
              case 4:
                throw e.sent();
            }
          });
        });
      }
      function pe(o, i) {
        return (
          void 0 === i && (i = !1),
          c(this, void 0, void 0, function () {
            var r, t, n;
            return l(this, function (e) {
              switch (e.label) {
                case 0:
                  return [
                    4,
                    se(o.appConfig, function (e) {
                      if (!he(e)) throw B.create('not-registered');
                      var t,
                        n = e.authToken;
                      if (
                        i ||
                        2 !== (t = n).requestStatus ||
                        (function (e) {
                          var t = Date.now();
                          return (
                            t < e.creationTime ||
                            e.creationTime + e.expiresIn < t + N
                          );
                        })(t)
                      ) {
                        if (1 === n.requestStatus)
                          return (
                            (r = (function (n, r) {
                              return c(this, void 0, void 0, function () {
                                var t;
                                return l(this, function (e) {
                                  switch (e.label) {
                                    case 0:
                                      return [4, de(n.appConfig)];
                                    case 1:
                                      (t = e.sent()), (e.label = 2);
                                    case 2:
                                      return 1 !== t.authToken.requestStatus
                                        ? [3, 5]
                                        : [4, H(100)];
                                    case 3:
                                      return e.sent(), [4, de(n.appConfig)];
                                    case 4:
                                      return (t = e.sent()), [3, 2];
                                    case 5:
                                      return 0 ===
                                        (t = t.authToken).requestStatus
                                        ? [2, pe(n, r)]
                                        : [2, t];
                                  }
                                });
                              });
                            })(o, i)),
                            e
                          );
                        if (!navigator.onLine) throw B.create('app-offline');
                        n =
                          ((t = e),
                          (n = { requestStatus: 1, requestTime: Date.now() }),
                          a(a({}, t), { authToken: n }));
                        return (
                          (r = (function (o, i) {
                            return c(this, void 0, void 0, function () {
                              var t, n, r;
                              return l(this, function (e) {
                                switch (e.label) {
                                  case 0:
                                    return (
                                      e.trys.push([0, 3, , 8]), [4, fe(o, i)]
                                    );
                                  case 1:
                                    return (
                                      (t = e.sent()),
                                      (r = a(a({}, i), { authToken: t })),
                                      [4, ie(o.appConfig, r)]
                                    );
                                  case 2:
                                    return e.sent(), [2, t];
                                  case 3:
                                    return !K((n = e.sent())) ||
                                      (401 !== n.customData.serverCode &&
                                        404 !== n.customData.serverCode)
                                      ? [3, 5]
                                      : [4, ae(o.appConfig)];
                                  case 4:
                                    return e.sent(), [3, 7];
                                  case 5:
                                    return (
                                      (r = a(a({}, i), {
                                        authToken: { requestStatus: 0 }
                                      })),
                                      [4, ie(o.appConfig, r)]
                                    );
                                  case 6:
                                    e.sent(), (e.label = 7);
                                  case 7:
                                    throw n;
                                  case 8:
                                    return [2];
                                }
                              });
                            });
                          })(o, n)),
                          n
                        );
                      }
                      return e;
                    })
                  ];
                case 1:
                  return (t = e.sent()), r ? [4, r] : [3, 3];
                case 2:
                  return (n = e.sent()), [3, 4];
                case 3:
                  (n = t.authToken), (e.label = 4);
                case 4:
                  return [2, n];
              }
            });
          })
        );
      }
      function de(e) {
        return se(e, function (e) {
          if (!he(e)) throw B.create('not-registered');
          var t = e.authToken;
          return 1 === (t = t).requestStatus && t.requestTime + E < Date.now()
            ? a(a({}, e), { authToken: { requestStatus: 0 } })
            : e;
        });
      }
      function he(e) {
        return void 0 !== e && 2 === e.registrationStatus;
      }
      function ve(n, r) {
        return (
          void 0 === r && (r = !1),
          c(this, void 0, void 0, function () {
            var t;
            return l(this, function (e) {
              switch (e.label) {
                case 0:
                  return [
                    4,
                    (function (n) {
                      return c(this, void 0, void 0, function () {
                        var t;
                        return l(this, function (e) {
                          switch (e.label) {
                            case 0:
                              return [4, ue(n)];
                            case 1:
                              return (t = e.sent().registrationPromise)
                                ? [4, t]
                                : [3, 3];
                            case 2:
                              e.sent(), (e.label = 3);
                            case 3:
                              return [2];
                          }
                        });
                      });
                    })((t = n).appConfig)
                  ];
                case 1:
                  return e.sent(), [4, pe(t, r)];
                case 2:
                  return [2, e.sent().token];
              }
            });
          })
        );
      }
      function ge(e) {
        return B.create('missing-app-config-values', { valueName: e });
      }
      function ye(e) {
        return {
          app: (e = e.getProvider('app-exp').getImmediate()),
          appConfig: (function (e) {
            var t, n;
            if (!e || !e.options) throw ge('App Configuration');
            if (!e.name) throw ge('App Name');
            try {
              for (
                var r = s(['projectId', 'apiKey', 'appId']), o = r.next();
                !o.done;
                o = r.next()
              ) {
                var i = o.value;
                if (!e.options[i]) throw ge(i);
              }
            } catch (e) {
              t = { error: e };
            } finally {
              try {
                o && !o.done && (n = r.return) && n.call(r);
              } finally {
                if (t) throw t.error;
              }
            }
            return {
              appName: e.name,
              projectId: e.options.projectId,
              apiKey: e.options.apiKey,
              appId: e.options.appId
            };
          })(e),
          platformLoggerProvider: Ce._getProvider(e, 'platform-logger'),
          _delete: function () {
            return Promise.resolve();
          }
        };
      }
      function be(e) {
        var e = e.getProvider('app-exp').getImmediate(),
          t = Ce._getProvider(e, me).getImmediate();
        return {
          getId: function () {
            return (function (o) {
              return c(this, void 0, void 0, function () {
                var t, n, r;
                return l(this, function (e) {
                  switch (e.label) {
                    case 0:
                      return [4, ue((t = o).appConfig)];
                    case 1:
                      return (
                        (n = e.sent()),
                        (r = n.installationEntry),
                        (n.registrationPromise || pe(t)).catch(console.error),
                        [2, r.fid]
                      );
                  }
                });
              });
            })(t);
          },
          getToken: function (e) {
            return ve(t, e);
          }
        };
      }
      var me = 'installations-exp';
      Ce._registerComponent(new g(me, ye, 'PUBLIC')),
        Ce._registerComponent(
          new g('installations-exp-internal', be, 'PRIVATE')
        ),
        Ce.registerVersion('@firebase/installations-exp', D);
      var D =
          (((D = {})['missing-app-config-values'] =
            'Missing App configuration value: "{$valueName}"'),
          (D['only-available-in-window'] =
            'This method is available in a Window context.'),
          (D['only-available-in-sw'] =
            'This method is available in a service worker context.'),
          (D['permission-default'] =
            'The notification permission was not granted and dismissed instead.'),
          (D['permission-blocked'] =
            'The notification permission was not granted and blocked instead.'),
          (D['unsupported-browser'] =
            "This browser doesn't support the API's required to use the firebase SDK."),
          (D['failed-service-worker-registration'] =
            'We are unable to register the default service worker. {$browserErrorMessage}'),
          (D['token-subscribe-failed'] =
            'A problem occurred while subscribing the user to FCM: {$errorInfo}'),
          (D['token-subscribe-no-token'] =
            'FCM returned no token when subscribing the user to push.'),
          (D['token-unsubscribe-failed'] =
            'A problem occurred while unsubscribing the user from FCM: {$errorInfo}'),
          (D['token-update-failed'] =
            'A problem occurred while updating the user from FCM: {$errorInfo}'),
          (D['token-update-no-token'] =
            'FCM returned no token when updating the user to push.'),
          (D['use-sw-after-get-token'] =
            'The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.'),
          (D['invalid-sw-registration'] =
            'The input to useServiceWorker() must be a ServiceWorkerRegistration.'),
          (D['invalid-bg-handler'] =
            'The input to setBackgroundMessageHandler() must be a function.'),
          (D['invalid-vapid-key'] = 'The public VAPID key must be a string.'),
          (D['use-vapid-key-after-get-token'] =
            'The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used.'),
          D),
        we = new d('messaging', 'Messaging', D);
      function Ie(e) {
        return we.create('missing-app-config-values', { valueName: e });
      }
      var ke =
        ((Se.prototype._delete = function () {
          return this.deleteService();
        }),
        Se);
      function Se(e, t, n) {
        (this.onBackgroundMessageHandler = null),
          (this.onMessageHandler = null);
        var r = (function (e) {
          var t, n;
          if (!e || !e.options) throw Ie('App Configuration Object');
          if (!e.name) throw Ie('App Name');
          var r = e.options;
          try {
            for (
              var o = s(['projectId', 'apiKey', 'appId', 'messagingSenderId']),
                i = o.next();
              !i.done;
              i = o.next()
            ) {
              var a = i.value;
              if (!r[a]) throw Ie(a);
            }
          } catch (e) {
            t = { error: e };
          } finally {
            try {
              i && !i.done && (n = o.return) && n.call(o);
            } finally {
              if (t) throw t.error;
            }
          }
          return {
            appName: e.name,
            projectId: r.projectId,
            apiKey: r.apiKey,
            appId: r.appId,
            senderId: r.messagingSenderId
          };
        })(e);
        this.firebaseDependencies = {
          app: e,
          appConfig: r,
          installations: t,
          analyticsProvider: n
        };
      }
      function _e() {
        return self && 'ServiceWorkerGlobalScope' in self
          ? 'indexedDB' in self &&
              null !== indexedDB &&
              'PushManager' in self &&
              'Notification' in self &&
              ServiceWorkerRegistration.prototype.hasOwnProperty(
                'showNotification'
              ) &&
              PushSubscription.prototype.hasOwnProperty('getKey')
          : 'indexedDB' in window &&
              null !== indexedDB &&
              navigator.cookieEnabled &&
              'serviceWorker' in navigator &&
              'PushManager' in window &&
              'Notification' in window &&
              'fetch' in window &&
              ServiceWorkerRegistration.prototype.hasOwnProperty(
                'showNotification'
              ) &&
              PushSubscription.prototype.hasOwnProperty('getKey');
      }
      function Pe(e) {
        if (!_e()) throw we.create('unsupported-browser');
        return new ke(
          e.getProvider('app-exp').getImmediate(),
          e.getProvider('installations-exp-internal').getImmediate(),
          e.getProvider('analytics-internal')
        );
      }
      ((D = {}).PUSH_RECEIVED = 'push-received'),
        (D.NOTIFICATION_CLICKED = 'notification-clicked'),
        Ce._registerComponent(new g('messaging-exp', Pe, 'PUBLIC')),
        (xe.getMessaging = function (e) {
          return Ce._getProvider(e, 'messaging-exp').getImmediate();
        }),
        Object.defineProperty(xe, '__esModule', { value: !0 });
    }.apply(this, arguments));
  } catch (e) {
    throw (
      (console.error(e),
      new Error(
        'Cannot instantiate firebase-messaging-sw.js - be sure to load firebase-app.js first.'
      ))
    );
  }
});
//# sourceMappingURL=firebase-messaging-sw.js.map
