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

!(function (t, e) {
  'object' == typeof exports && 'undefined' != typeof module
    ? e(exports, require('@firebase/app-exp'))
    : 'function' == typeof define && define.amd
    ? define(['exports', '@firebase/app-exp'], e)
    : e(
        (((t =
          'undefined' != typeof globalThis ? globalThis : t || self).firebase =
          t.firebase || {}),
        (t.firebase.remoteConfig = t.firebase.remoteConfig || {})),
        t.firebase.app
      );
})(this, function (re, ne) {
  'use strict';
  try {
    (function () {
      var r = function (t, e) {
        return (r =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (t, e) {
              t.__proto__ = e;
            }) ||
          function (t, e) {
            for (var r in e) e.hasOwnProperty(r) && (t[r] = e[r]);
          })(t, e);
      };
      var s = function () {
        return (s =
          Object.assign ||
          function (t) {
            for (var e, r = 1, n = arguments.length; r < n; r++)
              for (var i in (e = arguments[r]))
                Object.prototype.hasOwnProperty.call(e, i) && (t[i] = e[i]);
            return t;
          }).apply(this, arguments);
      };
      function f(t, s, a, c) {
        return new (a = a || Promise)(function (r, e) {
          function n(t) {
            try {
              o(c.next(t));
            } catch (t) {
              e(t);
            }
          }
          function i(t) {
            try {
              o(c.throw(t));
            } catch (t) {
              e(t);
            }
          }
          function o(t) {
            var e;
            t.done
              ? r(t.value)
              : ((e = t.value) instanceof a
                  ? e
                  : new a(function (t) {
                      t(e);
                    })
                ).then(n, i);
          }
          o((c = c.apply(t, s || [])).next());
        });
      }
      function p(r, n) {
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
          t = { next: e(0), throw: e(1), return: e(2) };
        return (
          'function' == typeof Symbol &&
            (t[Symbol.iterator] = function () {
              return this;
            }),
          t
        );
        function e(e) {
          return function (t) {
            return (function (e) {
              if (i) throw new TypeError('Generator is already executing.');
              for (; a; )
                try {
                  if (
                    ((i = 1),
                    o &&
                      (s =
                        2 & e[0]
                          ? o.return
                          : e[0]
                          ? o.throw || ((s = o.return) && s.call(o), 0)
                          : o.next) &&
                      !(s = s.call(o, e[1])).done)
                  )
                    return s;
                  switch (((o = 0), s && (e = [2 & e[0], s.value]), e[0])) {
                    case 0:
                    case 1:
                      s = e;
                      break;
                    case 4:
                      return a.label++, { value: e[1], done: !1 };
                    case 5:
                      a.label++, (o = e[1]), (e = [0]);
                      continue;
                    case 7:
                      (e = a.ops.pop()), a.trys.pop();
                      continue;
                    default:
                      if (
                        !(s = 0 < (s = a.trys).length && s[s.length - 1]) &&
                        (6 === e[0] || 2 === e[0])
                      ) {
                        a = 0;
                        continue;
                      }
                      if (3 === e[0] && (!s || (e[1] > s[0] && e[1] < s[3]))) {
                        a.label = e[1];
                        break;
                      }
                      if (6 === e[0] && a.label < s[1]) {
                        (a.label = s[1]), (s = e);
                        break;
                      }
                      if (s && a.label < s[2]) {
                        (a.label = s[2]), a.ops.push(e);
                        break;
                      }
                      s[2] && a.ops.pop(), a.trys.pop();
                      continue;
                  }
                  e = n.call(r, a);
                } catch (t) {
                  (e = [6, t]), (o = 0);
                } finally {
                  i = s = 0;
                }
              if (5 & e[0]) throw e[1];
              return { value: e[0] ? e[1] : void 0, done: !0 };
            })([e, t]);
          };
        }
      }
      function a(t) {
        var e = 'function' == typeof Symbol && Symbol.iterator,
          r = e && t[e],
          n = 0;
        if (r) return r.call(t);
        if (t && 'number' == typeof t.length)
          return {
            next: function () {
              return (
                t && n >= t.length && (t = void 0),
                { value: t && t[n++], done: !t }
              );
            }
          };
        throw new TypeError(
          e ? 'Object is not iterable.' : 'Symbol.iterator is not defined.'
        );
      }
      function e() {
        for (var t = [], e = 0; e < arguments.length; e++)
          t = t.concat(
            (function (t, e) {
              var r = 'function' == typeof Symbol && t[Symbol.iterator];
              if (!r) return t;
              var n,
                i,
                o = r.call(t),
                s = [];
              try {
                for (; (void 0 === e || 0 < e--) && !(n = o.next()).done; )
                  s.push(n.value);
              } catch (t) {
                i = { error: t };
              } finally {
                try {
                  n && !n.done && (r = o.return) && r.call(o);
                } finally {
                  if (i) throw i.error;
                }
              }
              return s;
            })(arguments[e])
          );
        return t;
      }
      var n,
        t,
        i,
        o = 'FirebaseError',
        h =
          ((n = Error),
          r((t = u), (i = n)),
          (t.prototype =
            null === i
              ? Object.create(i)
              : ((c.prototype = i.prototype), new c())),
          u);
      function c() {
        this.constructor = t;
      }
      function u(t, e, r) {
        e = n.call(this, e) || this;
        return (
          (e.code = t),
          (e.customData = r),
          (e.name = o),
          Object.setPrototypeOf(e, u.prototype),
          Error.captureStackTrace &&
            Error.captureStackTrace(e, l.prototype.create),
          e
        );
      }
      var l =
        ((g.prototype.create = function (t) {
          for (var e = [], r = 1; r < arguments.length; r++)
            e[r - 1] = arguments[r];
          var n,
            i = e[0] || {},
            o = this.service + '/' + t,
            t = this.errors[t],
            t = t
              ? ((n = i),
                t.replace(d, function (t, e) {
                  var r = n[e];
                  return null != r ? String(r) : '<' + e + '?>';
                }))
              : 'Error',
            t = this.serviceName + ': ' + t + ' (' + o + ').';
          return new h(o, t, i);
        }),
        g);
      function g(t, e, r) {
        (this.service = t), (this.serviceName = e), (this.errors = r);
      }
      var d = /\{\$([^}]+)}/g;
      var v,
        m =
          ((y.prototype.setInstantiationMode = function (t) {
            return (this.instantiationMode = t), this;
          }),
          (y.prototype.setMultipleInstances = function (t) {
            return (this.multipleInstances = t), this;
          }),
          (y.prototype.setServiceProps = function (t) {
            return (this.serviceProps = t), this;
          }),
          y);
      function y(t, e, r) {
        (this.name = t),
          (this.instanceFactory = e),
          (this.type = r),
          (this.multipleInstances = !1),
          (this.serviceProps = {}),
          (this.instantiationMode = 'LAZY');
      }
      function b() {
        for (var t = 0, e = 0, r = arguments.length; e < r; e++)
          t += arguments[e].length;
        for (var n = Array(t), i = 0, e = 0; e < r; e++)
          for (var o = arguments[e], s = 0, a = o.length; s < a; s++, i++)
            n[i] = o[s];
        return n;
      }
      ((R = v = v || {})[(R.DEBUG = 0)] = 'DEBUG'),
        (R[(R.VERBOSE = 1)] = 'VERBOSE'),
        (R[(R.INFO = 2)] = 'INFO'),
        (R[(R.WARN = 3)] = 'WARN'),
        (R[(R.ERROR = 4)] = 'ERROR'),
        (R[(R.SILENT = 5)] = 'SILENT');
      function w(t, e) {
        for (var r = [], n = 2; n < arguments.length; n++)
          r[n - 2] = arguments[n];
        if (!(e < t.logLevel)) {
          var i = new Date().toISOString(),
            o = C[e];
          if (!o)
            throw new Error(
              'Attempted to log a message with an invalid logType (value: ' +
                e +
                ')'
            );
          console[o].apply(console, b(['[' + i + ']  ' + t.name + ':'], r));
        }
      }
      var _ = {
          debug: v.DEBUG,
          verbose: v.VERBOSE,
          info: v.INFO,
          warn: v.WARN,
          error: v.ERROR,
          silent: v.SILENT
        },
        S = v.INFO,
        C =
          (((U = {})[v.DEBUG] = 'log'),
          (U[v.VERBOSE] = 'log'),
          (U[v.INFO] = 'info'),
          (U[v.WARN] = 'warn'),
          (U[v.ERROR] = 'error'),
          U),
        E =
          (Object.defineProperty(T.prototype, 'logLevel', {
            get: function () {
              return this._logLevel;
            },
            set: function (t) {
              if (!(t in v))
                throw new TypeError(
                  'Invalid value "' + t + '" assigned to `logLevel`'
                );
              this._logLevel = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          (T.prototype.setLogLevel = function (t) {
            this._logLevel = 'string' == typeof t ? _[t] : t;
          }),
          Object.defineProperty(T.prototype, 'logHandler', {
            get: function () {
              return this._logHandler;
            },
            set: function (t) {
              if ('function' != typeof t)
                throw new TypeError(
                  'Value assigned to `logHandler` must be a function'
                );
              this._logHandler = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(T.prototype, 'userLogHandler', {
            get: function () {
              return this._userLogHandler;
            },
            set: function (t) {
              this._userLogHandler = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          (T.prototype.debug = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, b([this, v.DEBUG], t)),
              this._logHandler.apply(this, b([this, v.DEBUG], t));
          }),
          (T.prototype.log = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, b([this, v.VERBOSE], t)),
              this._logHandler.apply(this, b([this, v.VERBOSE], t));
          }),
          (T.prototype.info = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, b([this, v.INFO], t)),
              this._logHandler.apply(this, b([this, v.INFO], t));
          }),
          (T.prototype.warn = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, b([this, v.WARN], t)),
              this._logHandler.apply(this, b([this, v.WARN], t));
          }),
          (T.prototype.error = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, b([this, v.ERROR], t)),
              this._logHandler.apply(this, b([this, v.ERROR], t));
          }),
          T);
      function T(t) {
        (this.name = t),
          (this._logLevel = S),
          (this._logHandler = w),
          (this._userLogHandler = null);
      }
      function I(r) {
        return new Promise(function (t, e) {
          (r.onsuccess = function () {
            t(r.result);
          }),
            (r.onerror = function () {
              e(r.error);
            });
        });
      }
      function P(r, n, i) {
        var o,
          t = new Promise(function (t, e) {
            I((o = r[n].apply(r, i))).then(t, e);
          });
        return (t.request = o), t;
      }
      function L(t, r, e) {
        e.forEach(function (e) {
          Object.defineProperty(t.prototype, e, {
            get: function () {
              return this[r][e];
            },
            set: function (t) {
              this[r][e] = t;
            }
          });
        });
      }
      function O(e, r, n, t) {
        t.forEach(function (t) {
          t in n.prototype &&
            (e.prototype[t] = function () {
              return P(this[r], t, arguments);
            });
        });
      }
      function M(e, r, n, t) {
        t.forEach(function (t) {
          t in n.prototype &&
            (e.prototype[t] = function () {
              return this[r][t].apply(this[r], arguments);
            });
        });
      }
      function k(t, n, e, r) {
        r.forEach(function (r) {
          r in e.prototype &&
            (t.prototype[r] = function () {
              return (
                (t = this[n]),
                (e = P(t, r, arguments)).then(function (t) {
                  if (t) return new j(t, e.request);
                })
              );
              var t, e;
            });
        });
      }
      function F(t) {
        this._index = t;
      }
      function j(t, e) {
        (this._cursor = t), (this._request = e);
      }
      function x(t) {
        this._store = t;
      }
      function A(r) {
        (this._tx = r),
          (this.complete = new Promise(function (t, e) {
            (r.oncomplete = function () {
              t();
            }),
              (r.onerror = function () {
                e(r.error);
              }),
              (r.onabort = function () {
                e(r.error);
              });
          }));
      }
      function D(t, e, r) {
        (this._db = t), (this.oldVersion = e), (this.transaction = new A(r));
      }
      function N(t) {
        this._db = t;
      }
      L(F, '_index', ['name', 'keyPath', 'multiEntry', 'unique']),
        O(F, '_index', IDBIndex, [
          'get',
          'getKey',
          'getAll',
          'getAllKeys',
          'count'
        ]),
        k(F, '_index', IDBIndex, ['openCursor', 'openKeyCursor']),
        L(j, '_cursor', ['direction', 'key', 'primaryKey', 'value']),
        O(j, '_cursor', IDBCursor, ['update', 'delete']),
        ['advance', 'continue', 'continuePrimaryKey'].forEach(function (r) {
          r in IDBCursor.prototype &&
            (j.prototype[r] = function () {
              var e = this,
                t = arguments;
              return Promise.resolve().then(function () {
                return (
                  e._cursor[r].apply(e._cursor, t),
                  I(e._request).then(function (t) {
                    if (t) return new j(t, e._request);
                  })
                );
              });
            });
        }),
        (x.prototype.createIndex = function () {
          return new F(this._store.createIndex.apply(this._store, arguments));
        }),
        (x.prototype.index = function () {
          return new F(this._store.index.apply(this._store, arguments));
        }),
        L(x, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']),
        O(x, '_store', IDBObjectStore, [
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
        k(x, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']),
        M(x, '_store', IDBObjectStore, ['deleteIndex']),
        (A.prototype.objectStore = function () {
          return new x(this._tx.objectStore.apply(this._tx, arguments));
        }),
        L(A, '_tx', ['objectStoreNames', 'mode']),
        M(A, '_tx', IDBTransaction, ['abort']),
        (D.prototype.createObjectStore = function () {
          return new x(this._db.createObjectStore.apply(this._db, arguments));
        }),
        L(D, '_db', ['name', 'version', 'objectStoreNames']),
        M(D, '_db', IDBDatabase, ['deleteObjectStore', 'close']),
        (N.prototype.transaction = function () {
          return new A(this._db.transaction.apply(this._db, arguments));
        }),
        L(N, '_db', ['name', 'version', 'objectStoreNames']),
        M(N, '_db', IDBDatabase, ['close']),
        ['openCursor', 'openKeyCursor'].forEach(function (i) {
          [x, F].forEach(function (t) {
            i in t.prototype &&
              (t.prototype[i.replace('open', 'iterate')] = function () {
                var t = ((r = arguments), Array.prototype.slice.call(r)),
                  e = t[t.length - 1],
                  r = this._store || this._index,
                  n = r[i].apply(r, t.slice(0, -1));
                n.onsuccess = function () {
                  e(n.result);
                };
              });
          });
        }),
        [F, x].forEach(function (t) {
          t.prototype.getAll ||
            (t.prototype.getAll = function (t, r) {
              var n = this,
                i = [];
              return new Promise(function (e) {
                n.iterateCursor(t, function (t) {
                  t
                    ? (i.push(t.value),
                      void 0 === r || i.length != r ? t.continue() : e(i))
                    : e(i);
                });
              });
            });
        });
      var R = '0.0.900',
        B = 1e4,
        q = 'w:' + R,
        H = 'FIS_v2',
        K = 'https://firebaseinstallations.googleapis.com/v1',
        V = 36e5,
        U =
          (((U = {})['missing-app-config-values'] =
            'Missing App configuration value: "{$valueName}"'),
          (U['not-registered'] = 'Firebase Installation is not registered.'),
          (U['installation-not-found'] = 'Firebase Installation not found.'),
          (U['request-failed'] =
            '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"'),
          (U['app-offline'] =
            'Could not process request. Application offline.'),
          (U['delete-pending-registration'] =
            "Can't delete installation while there is a pending registration request."),
          U),
        z = new l('installations', 'Installations', U);
      function $(t) {
        return t instanceof h && t.code.includes('request-failed');
      }
      function G(t) {
        t = t.projectId;
        return K + '/projects/' + t + '/installations';
      }
      function W(t) {
        return {
          token: t.token,
          requestStatus: 2,
          expiresIn: ((t = t.expiresIn), Number(t.replace('s', '000'))),
          creationTime: Date.now()
        };
      }
      function J(r, n) {
        return f(this, void 0, void 0, function () {
          var e;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return [4, n.json()];
              case 1:
                return (
                  (e = t.sent()),
                  (e = e.error),
                  [
                    2,
                    z.create('request-failed', {
                      requestName: r,
                      serverCode: e.code,
                      serverMessage: e.message,
                      serverStatus: e.status
                    })
                  ]
                );
            }
          });
        });
      }
      function Y(t) {
        t = t.apiKey;
        return new Headers({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-goog-api-key': t
        });
      }
      function Z(t, e) {
        (e = e.refreshToken), (t = Y(t));
        return t.append('Authorization', H + ' ' + e), t;
      }
      function Q(r) {
        return f(this, void 0, void 0, function () {
          var e;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return [4, r()];
              case 1:
                return 500 <= (e = t.sent()).status && e.status < 600
                  ? [2, r()]
                  : [2, e];
            }
          });
        });
      }
      function X(e) {
        return new Promise(function (t) {
          setTimeout(t, e);
        });
      }
      var tt = /^[cdef][\w-]{21}$/,
        et = '';
      function rt() {
        try {
          var t = new Uint8Array(17);
          (self.crypto || self.msCrypto).getRandomValues(t),
            (t[0] = 112 + (t[0] % 16));
          t = (function (t) {
            return btoa(String.fromCharCode.apply(String, e(t)))
              .replace(/\+/g, '-')
              .replace(/\//g, '_');
          })(t).substr(0, 22);
          return tt.test(t) ? t : et;
        } catch (t) {
          return et;
        }
      }
      function nt(t) {
        return t.appName + '!' + t.appId;
      }
      var it = new Map();
      function ot(t, e) {
        t = nt(t);
        st(t, e),
          (function (t, e) {
            var r = (function () {
              !at &&
                'BroadcastChannel' in self &&
                ((at = new BroadcastChannel(
                  '[Firebase] FID Change'
                )).onmessage = function (t) {
                  st(t.data.key, t.data.fid);
                });
              return at;
            })();
            r && r.postMessage({ key: t, fid: e });
            0 === it.size && at && (at.close(), (at = null));
          })(t, e);
      }
      function st(t, e) {
        var r,
          n,
          i = it.get(t);
        if (i)
          try {
            for (var o = a(i), s = o.next(); !s.done; s = o.next()) {
              (0, s.value)(e);
            }
          } catch (t) {
            r = { error: t };
          } finally {
            try {
              s && !s.done && (n = o.return) && n.call(o);
            } finally {
              if (r) throw r.error;
            }
          }
      }
      var at = null;
      var ct = 'firebase-installations-database',
        ut = 1,
        lt = 'firebase-installations-store',
        ft = null;
      function ht() {
        var t, e, r;
        return (
          ft ||
            ((t = ut),
            (e = function (t) {
              0 === t.oldVersion && t.createObjectStore(lt);
            }),
            (r = (t = P(indexedDB, 'open', [ct, t])).request) &&
              (r.onupgradeneeded = function (t) {
                e && e(new D(r.result, t.oldVersion, r.transaction));
              }),
            (ft = t.then(function (t) {
              return new N(t);
            }))),
          ft
        );
      }
      function pt(o, s) {
        return f(this, void 0, void 0, function () {
          var e, r, n, i;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return (e = nt(o)), [4, ht()];
              case 1:
                return (
                  (n = t.sent()),
                  (r = n.transaction(lt, 'readwrite')),
                  [4, (n = r.objectStore(lt)).get(e)]
                );
              case 2:
                return (i = t.sent()), [4, n.put(s, e)];
              case 3:
                return t.sent(), [4, r.complete];
              case 4:
                return t.sent(), (i && i.fid === s.fid) || ot(o, s.fid), [2, s];
            }
          });
        });
      }
      function gt(n) {
        return f(this, void 0, void 0, function () {
          var e, r;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return (e = nt(n)), [4, ht()];
              case 1:
                return (
                  (r = t.sent()),
                  [
                    4,
                    (r = r.transaction(lt, 'readwrite'))
                      .objectStore(lt)
                      .delete(e)
                  ]
                );
              case 2:
                return t.sent(), [4, r.complete];
              case 3:
                return t.sent(), [2];
            }
          });
        });
      }
      function dt(s, a) {
        return f(this, void 0, void 0, function () {
          var e, r, n, i, o;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return (e = nt(s)), [4, ht()];
              case 1:
                return (
                  (n = t.sent()),
                  (r = n.transaction(lt, 'readwrite')),
                  [4, (n = r.objectStore(lt)).get(e)]
                );
              case 2:
                return (
                  (i = t.sent()),
                  void 0 !== (o = a(i)) ? [3, 4] : [4, n.delete(e)]
                );
              case 3:
                return t.sent(), [3, 6];
              case 4:
                return [4, n.put(o, e)];
              case 5:
                t.sent(), (t.label = 6);
              case 6:
                return [4, r.complete];
              case 7:
                return (
                  t.sent(), !o || (i && i.fid === o.fid) || ot(s, o.fid), [2, o]
                );
            }
          });
        });
      }
      function vt(i) {
        return f(this, void 0, void 0, function () {
          var e, r, n;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return [
                  4,
                  dt(i, function (t) {
                    (t = yt(t || { fid: rt(), registrationStatus: 0 })),
                      (t = (function (t, e) {
                        {
                          if (0 !== e.registrationStatus)
                            return 1 === e.registrationStatus
                              ? {
                                  installationEntry: e,
                                  registrationPromise: (function (i) {
                                    return f(this, void 0, void 0, function () {
                                      var e, r, n;
                                      return p(this, function (t) {
                                        switch (t.label) {
                                          case 0:
                                            return [4, mt(i)];
                                          case 1:
                                            (e = t.sent()), (t.label = 2);
                                          case 2:
                                            return 1 !== e.registrationStatus
                                              ? [3, 5]
                                              : [4, X(100)];
                                          case 3:
                                            return t.sent(), [4, mt(i)];
                                          case 4:
                                            return (e = t.sent()), [3, 2];
                                          case 5:
                                            return 0 !== e.registrationStatus
                                              ? [3, 7]
                                              : [4, vt(i)];
                                          case 6:
                                            return (
                                              (n = t.sent()),
                                              (r = n.installationEntry),
                                              (n = n.registrationPromise)
                                                ? [2, n]
                                                : [2, r]
                                            );
                                          case 7:
                                            return [2, e];
                                        }
                                      });
                                    });
                                  })(t)
                                }
                              : { installationEntry: e };
                          if (!navigator.onLine) {
                            var r = Promise.reject(z.create('app-offline'));
                            return {
                              installationEntry: e,
                              registrationPromise: r
                            };
                          }
                          (e = {
                            fid: e.fid,
                            registrationStatus: 1,
                            registrationTime: Date.now()
                          }),
                            (t = (function (n, i) {
                              return f(this, void 0, void 0, function () {
                                var e, r;
                                return p(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      return (
                                        t.trys.push([0, 2, , 7]),
                                        [
                                          4,
                                          (function (s, t) {
                                            var a = t.fid;
                                            return f(
                                              this,
                                              void 0,
                                              void 0,
                                              function () {
                                                var e, r, n, i, o;
                                                return p(this, function (t) {
                                                  switch (t.label) {
                                                    case 0:
                                                      return (
                                                        (e = G(s)),
                                                        (r = Y(s)),
                                                        (o = {
                                                          fid: a,
                                                          authVersion: H,
                                                          appId: s.appId,
                                                          sdkVersion: q
                                                        }),
                                                        (n = {
                                                          method: 'POST',
                                                          headers: r,
                                                          body: JSON.stringify(
                                                            o
                                                          )
                                                        }),
                                                        [
                                                          4,
                                                          Q(function () {
                                                            return fetch(e, n);
                                                          })
                                                        ]
                                                      );
                                                    case 1:
                                                      return (i = t.sent()).ok
                                                        ? [4, i.json()]
                                                        : [3, 3];
                                                    case 2:
                                                      return (
                                                        (o = t.sent()),
                                                        [
                                                          2,
                                                          {
                                                            fid: o.fid || a,
                                                            registrationStatus: 2,
                                                            refreshToken:
                                                              o.refreshToken,
                                                            authToken: W(
                                                              o.authToken
                                                            )
                                                          }
                                                        ]
                                                      );
                                                    case 3:
                                                      return [
                                                        4,
                                                        J(
                                                          'Create Installation',
                                                          i
                                                        )
                                                      ];
                                                    case 4:
                                                      throw t.sent();
                                                  }
                                                });
                                              }
                                            );
                                          })(n, i)
                                        ]
                                      );
                                    case 1:
                                      return (e = t.sent()), [2, pt(n, e)];
                                    case 2:
                                      return $((r = t.sent())) &&
                                        409 === r.customData.serverCode
                                        ? [4, gt(n)]
                                        : [3, 4];
                                    case 3:
                                      return t.sent(), [3, 6];
                                    case 4:
                                      return [
                                        4,
                                        pt(n, {
                                          fid: i.fid,
                                          registrationStatus: 0
                                        })
                                      ];
                                    case 5:
                                      t.sent(), (t.label = 6);
                                    case 6:
                                      throw r;
                                    case 7:
                                      return [2];
                                  }
                                });
                              });
                            })(t, e));
                          return {
                            installationEntry: e,
                            registrationPromise: t
                          };
                        }
                      })(i, t));
                    return (e = t.registrationPromise), t.installationEntry;
                  })
                ];
              case 1:
                return (r = t.sent()).fid !== et ? [3, 3] : ((n = {}), [4, e]);
              case 2:
                return [2, ((n.installationEntry = t.sent()), n)];
              case 3:
                return [2, { installationEntry: r, registrationPromise: e }];
            }
          });
        });
      }
      function mt(t) {
        return dt(t, function (t) {
          if (!t) throw z.create('installation-not-found');
          return yt(t);
        });
      }
      function yt(t) {
        return 1 === (e = t).registrationStatus &&
          e.registrationTime + B < Date.now()
          ? { fid: t.fid, registrationStatus: 0 }
          : t;
        var e;
      }
      function bt(t, s) {
        var a = t.appConfig,
          c = t.platformLoggerProvider;
        return f(this, void 0, void 0, function () {
          var e, r, n, i, o;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  (e = (function (t, e) {
                    e = e.fid;
                    return G(t) + '/' + e + '/authTokens:generate';
                  })(a, s)),
                  (r = Z(a, s)),
                  (o = c.getImmediate({ optional: !0 })) &&
                    r.append('x-firebase-client', o.getPlatformInfoString()),
                  (o = { installation: { sdkVersion: q } }),
                  (n = { method: 'POST', headers: r, body: JSON.stringify(o) }),
                  [
                    4,
                    Q(function () {
                      return fetch(e, n);
                    })
                  ]
                );
              case 1:
                return (i = t.sent()).ok ? [4, i.json()] : [3, 3];
              case 2:
                return (o = t.sent()), [2, W(o)];
              case 3:
                return [4, J('Generate Auth Token', i)];
              case 4:
                throw t.sent();
            }
          });
        });
      }
      function wt(i, o) {
        return (
          void 0 === o && (o = !1),
          f(this, void 0, void 0, function () {
            var n, e, r;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [
                    4,
                    dt(i.appConfig, function (t) {
                      if (!St(t)) throw z.create('not-registered');
                      var e,
                        r = t.authToken;
                      if (
                        o ||
                        2 !== (e = r).requestStatus ||
                        (function (t) {
                          var e = Date.now();
                          return (
                            e < t.creationTime ||
                            t.creationTime + t.expiresIn < e + V
                          );
                        })(e)
                      ) {
                        if (1 === r.requestStatus)
                          return (
                            (n = (function (r, n) {
                              return f(this, void 0, void 0, function () {
                                var e;
                                return p(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      return [4, _t(r.appConfig)];
                                    case 1:
                                      (e = t.sent()), (t.label = 2);
                                    case 2:
                                      return 1 !== e.authToken.requestStatus
                                        ? [3, 5]
                                        : [4, X(100)];
                                    case 3:
                                      return t.sent(), [4, _t(r.appConfig)];
                                    case 4:
                                      return (e = t.sent()), [3, 2];
                                    case 5:
                                      return 0 ===
                                        (e = e.authToken).requestStatus
                                        ? [2, wt(r, n)]
                                        : [2, e];
                                  }
                                });
                              });
                            })(i, o)),
                            t
                          );
                        if (!navigator.onLine) throw z.create('app-offline');
                        r =
                          ((e = t),
                          (r = { requestStatus: 1, requestTime: Date.now() }),
                          s(s({}, e), { authToken: r }));
                        return (
                          (n = (function (i, o) {
                            return f(this, void 0, void 0, function () {
                              var e, r, n;
                              return p(this, function (t) {
                                switch (t.label) {
                                  case 0:
                                    return (
                                      t.trys.push([0, 3, , 8]), [4, bt(i, o)]
                                    );
                                  case 1:
                                    return (
                                      (e = t.sent()),
                                      (n = s(s({}, o), { authToken: e })),
                                      [4, pt(i.appConfig, n)]
                                    );
                                  case 2:
                                    return t.sent(), [2, e];
                                  case 3:
                                    return !$((r = t.sent())) ||
                                      (401 !== r.customData.serverCode &&
                                        404 !== r.customData.serverCode)
                                      ? [3, 5]
                                      : [4, gt(i.appConfig)];
                                  case 4:
                                    return t.sent(), [3, 7];
                                  case 5:
                                    return (
                                      (n = s(s({}, o), {
                                        authToken: { requestStatus: 0 }
                                      })),
                                      [4, pt(i.appConfig, n)]
                                    );
                                  case 6:
                                    t.sent(), (t.label = 7);
                                  case 7:
                                    throw r;
                                  case 8:
                                    return [2];
                                }
                              });
                            });
                          })(i, r)),
                          r
                        );
                      }
                      return t;
                    })
                  ];
                case 1:
                  return (e = t.sent()), n ? [4, n] : [3, 3];
                case 2:
                  return (r = t.sent()), [3, 4];
                case 3:
                  (r = e.authToken), (t.label = 4);
                case 4:
                  return [2, r];
              }
            });
          })
        );
      }
      function _t(t) {
        return dt(t, function (t) {
          if (!St(t)) throw z.create('not-registered');
          var e = t.authToken;
          return 1 === (e = e).requestStatus && e.requestTime + B < Date.now()
            ? s(s({}, t), { authToken: { requestStatus: 0 } })
            : t;
        });
      }
      function St(t) {
        return void 0 !== t && 2 === t.registrationStatus;
      }
      function Ct(r, n) {
        return (
          void 0 === n && (n = !1),
          f(this, void 0, void 0, function () {
            var e;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [
                    4,
                    (function (r) {
                      return f(this, void 0, void 0, function () {
                        var e;
                        return p(this, function (t) {
                          switch (t.label) {
                            case 0:
                              return [4, vt(r)];
                            case 1:
                              return (e = t.sent().registrationPromise)
                                ? [4, e]
                                : [3, 3];
                            case 2:
                              t.sent(), (t.label = 3);
                            case 3:
                              return [2];
                          }
                        });
                      });
                    })((e = r).appConfig)
                  ];
                case 1:
                  return t.sent(), [4, wt(e, n)];
                case 2:
                  return [2, t.sent().token];
              }
            });
          })
        );
      }
      function Et(t) {
        return z.create('missing-app-config-values', { valueName: t });
      }
      function Tt(t) {
        return {
          app: (t = t.getProvider('app-exp').getImmediate()),
          appConfig: (function (t) {
            var e, r;
            if (!t || !t.options) throw Et('App Configuration');
            if (!t.name) throw Et('App Name');
            try {
              for (
                var n = a(['projectId', 'apiKey', 'appId']), i = n.next();
                !i.done;
                i = n.next()
              ) {
                var o = i.value;
                if (!t.options[o]) throw Et(o);
              }
            } catch (t) {
              e = { error: t };
            } finally {
              try {
                i && !i.done && (r = n.return) && r.call(n);
              } finally {
                if (e) throw e.error;
              }
            }
            return {
              appName: t.name,
              projectId: t.options.projectId,
              apiKey: t.options.apiKey,
              appId: t.options.appId
            };
          })(t),
          platformLoggerProvider: ne._getProvider(t, 'platform-logger'),
          _delete: function () {
            return Promise.resolve();
          }
        };
      }
      function It(t) {
        var t = t.getProvider('app-exp').getImmediate(),
          e = ne._getProvider(t, Pt).getImmediate();
        return {
          getId: function () {
            return (function (i) {
              return f(this, void 0, void 0, function () {
                var e, r, n;
                return p(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return [4, vt((e = i).appConfig)];
                    case 1:
                      return (
                        (r = t.sent()),
                        (n = r.installationEntry),
                        (r.registrationPromise || wt(e)).catch(console.error),
                        [2, n.fid]
                      );
                  }
                });
              });
            })(e);
          },
          getToken: function (t) {
            return Ct(e, t);
          }
        };
      }
      var Pt = 'installations-exp';
      ne._registerComponent(new m(Pt, Tt, 'PUBLIC')),
        ne._registerComponent(
          new m('installations-exp-internal', It, 'PRIVATE')
        ),
        ne.registerVersion('@firebase/installations-exp', R);
      var Lt = '@firebase/remote-config-exp',
        Ot =
          ((Mt.prototype.addEventListener = function (t) {
            this.listeners.push(t);
          }),
          (Mt.prototype.abort = function () {
            this.listeners.forEach(function (t) {
              return t();
            });
          }),
          Mt);
      function Mt() {
        this.listeners = [];
      }
      var kt = 'remote-config-exp',
        R =
          (((R = {})['registration-window'] =
            'Undefined window object. This SDK only supports usage in a browser environment.'),
          (R['registration-project-id'] =
            'Undefined project identifier. Check Firebase app initialization.'),
          (R['registration-api-key'] =
            'Undefined API key. Check Firebase app initialization.'),
          (R['registration-app-id'] =
            'Undefined app identifier. Check Firebase app initialization.'),
          (R['storage-open'] =
            'Error thrown when opening storage. Original error: {$originalErrorMessage}.'),
          (R['storage-get'] =
            'Error thrown when reading from storage. Original error: {$originalErrorMessage}.'),
          (R['storage-set'] =
            'Error thrown when writing to storage. Original error: {$originalErrorMessage}.'),
          (R['storage-delete'] =
            'Error thrown when deleting from storage. Original error: {$originalErrorMessage}.'),
          (R['fetch-client-network'] =
            'Fetch client failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.'),
          (R['fetch-timeout'] =
            'The config fetch request timed out.  Configure timeout using "fetchTimeoutMillis" SDK setting.'),
          (R['fetch-throttle'] =
            'The config fetch request timed out while in an exponential backoff state. Configure timeout using "fetchTimeoutMillis" SDK setting. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.'),
          (R['fetch-client-parse'] =
            'Fetch client could not parse response. Original error: {$originalErrorMessage}.'),
          (R['fetch-status'] =
            'Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.'),
          R),
        Ft = new l('remoteconfig', 'Remote Config', R);
      var jt = ['1', 'true', 't', 'yes', 'y', 'on'],
        xt =
          ((At.prototype.asString = function () {
            return this._value;
          }),
          (At.prototype.asBoolean = function () {
            return (
              'static' !== this._source &&
              0 <= jt.indexOf(this._value.toLowerCase())
            );
          }),
          (At.prototype.asNumber = function () {
            if ('static' === this._source) return 0;
            var t = Number(this._value);
            return isNaN(t) && (t = 0), t;
          }),
          (At.prototype.getSource = function () {
            return this._source;
          }),
          At);
      function At(t, e) {
        void 0 === e && (e = ''), (this._source = t), (this._value = e);
      }
      function Dt(i) {
        return f(this, void 0, void 0, function () {
          var e, r, n;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  (e = i),
                  [
                    4,
                    Promise.all([
                      e._storage.getLastSuccessfulFetchResponse(),
                      e._storage.getActiveConfigEtag()
                    ])
                  ]
                );
              case 1:
                return (
                  (n = t.sent()),
                  (r = n[0]),
                  (n = n[1]),
                  r && r.config && r.eTag && r.eTag !== n
                    ? [
                        4,
                        Promise.all([
                          e._storageCache.setActiveConfig(r.config),
                          e._storage.setActiveConfigEtag(r.eTag)
                        ])
                      ]
                    : [2, !1]
                );
              case 2:
                return t.sent(), [2, !0];
            }
          });
        });
      }
      function Nt(t) {
        var e = t;
        return (
          e._initializePromise ||
            (e._initializePromise = e._storageCache
              .loadFromStorage()
              .then(function () {
                e._isInitializationComplete = !0;
              })),
          e._initializePromise
        );
      }
      function Rt(c) {
        return f(this, void 0, void 0, function () {
          var n,
            i,
            o,
            s,
            a = this;
          return p(this, function (t) {
            switch (t.label) {
              case 0:
                (n = c),
                  (i = new Ot()),
                  setTimeout(function () {
                    return f(a, void 0, void 0, function () {
                      return p(this, function (t) {
                        return i.abort(), [2];
                      });
                    });
                  }, n.settings.fetchTimeoutMillis),
                  (t.label = 1);
              case 1:
                return (
                  t.trys.push([1, 4, , 6]),
                  [
                    4,
                    n._client.fetch({
                      cacheMaxAgeMillis: n.settings.minimumFetchIntervalMillis,
                      signal: i
                    })
                  ]
                );
              case 2:
                return (
                  t.sent(), [4, n._storageCache.setLastFetchStatus('success')]
                );
              case 3:
                return t.sent(), [3, 6];
              case 4:
                return (
                  (o = t.sent()),
                  (r = 'fetch-throttle'),
                  (s =
                    (e = o) instanceof h && -1 !== e.code.indexOf(r)
                      ? 'throttle'
                      : 'failure'),
                  [4, n._storageCache.setLastFetchStatus(s)]
                );
              case 5:
                throw (t.sent(), o);
              case 6:
                return [2];
            }
            var e, r;
          });
        });
      }
      function Bt(t, e) {
        var r = t;
        r._isInitializationComplete ||
          r._logger.debug(
            'A value was requested for key "' +
              e +
              '" before SDK initialization completed. Await on ensureInitialized if the intent was to get a previously activated value.'
          );
        t = r._storageCache.getActiveConfig();
        return t && void 0 !== t[e]
          ? new xt('remote', t[e])
          : r.defaultConfig && void 0 !== r.defaultConfig[e]
          ? new xt('default', String(r.defaultConfig[e]))
          : (r._logger.debug(
              'Returning static value for key "' +
                e +
                '". Define a default or remote value if this is unintentional.'
            ),
            new xt('static'));
      }
      var qt =
        ((Ht.prototype.isCachedDataFresh = function (t, e) {
          if (!e)
            return (
              this.logger.debug('Config fetch cache check. Cache unpopulated.'),
              !1
            );
          var r = Date.now() - e,
            e = r <= t;
          return (
            this.logger.debug(
              'Config fetch cache check. Cache age millis: ' +
                r +
                '. Cache max age millis (minimumFetchIntervalMillis setting): ' +
                t +
                '. Is cache hit: ' +
                e +
                '.'
            ),
            e
          );
        }),
        (Ht.prototype.fetch = function (i) {
          return f(this, void 0, void 0, function () {
            var e, r, n;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [
                    4,
                    Promise.all([
                      this.storage.getLastSuccessfulFetchTimestampMillis(),
                      this.storage.getLastSuccessfulFetchResponse()
                    ])
                  ];
                case 1:
                  return ((n = t.sent()),
                  (e = n[0]),
                  (n = n[1]) && this.isCachedDataFresh(i.cacheMaxAgeMillis, e))
                    ? [2, n]
                    : ((i.eTag = n && n.eTag), [4, this.client.fetch(i)]);
                case 2:
                  return (
                    (r = t.sent()),
                    (n = [
                      this.storageCache.setLastSuccessfulFetchTimestampMillis(
                        Date.now()
                      )
                    ]),
                    200 === r.status &&
                      n.push(this.storage.setLastSuccessfulFetchResponse(r)),
                    [4, Promise.all(n)]
                  );
                case 3:
                  return t.sent(), [2, r];
              }
            });
          });
        }),
        Ht);
      function Ht(t, e, r, n) {
        (this.client = t),
          (this.storage = e),
          (this.storageCache = r),
          (this.logger = n);
      }
      var Kt =
        ((Vt.prototype.fetch = function (h) {
          return f(this, void 0, void 0, function () {
            var r, n, i, o, s, a, c, u, l, f;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [
                    4,
                    Promise.all([
                      this.firebaseInstallations.getId(),
                      this.firebaseInstallations.getToken()
                    ])
                  ];
                case 1:
                  (o = t.sent()),
                    (r = o[0]),
                    (i = o[1]),
                    (n =
                      window.FIREBASE_REMOTE_CONFIG_URL_BASE ||
                      'https://firebaseremoteconfig.googleapis.com'),
                    (o =
                      n +
                      '/v1/projects/' +
                      this.projectId +
                      '/namespaces/' +
                      this.namespace +
                      ':fetch?key=' +
                      this.apiKey),
                    (n = {
                      'Content-Type': 'application/json',
                      'Content-Encoding': 'gzip',
                      'If-None-Match': h.eTag || '*'
                    }),
                    (i = {
                      sdk_version: this.sdkVersion,
                      app_instance_id: r,
                      app_instance_id_token: i,
                      app_id: this.appId,
                      language_code:
                        (void 0 === e && (e = navigator),
                        (e.languages && e.languages[0]) || e.language)
                    }),
                    (i = {
                      method: 'POST',
                      headers: n,
                      body: JSON.stringify(i)
                    }),
                    (o = fetch(o, i)),
                    (i = new Promise(function (t, e) {
                      h.signal.addEventListener(function () {
                        var t = new Error('The operation was aborted.');
                        (t.name = 'AbortError'), e(t);
                      });
                    })),
                    (t.label = 2);
                case 2:
                  return t.trys.push([2, 5, , 6]), [4, Promise.race([o, i])];
                case 3:
                  return t.sent(), [4, o];
                case 4:
                  return (f = t.sent()), [3, 6];
                case 5:
                  throw (
                    ((i = t.sent()),
                    (o = 'fetch-client-network'),
                    'AbortError' === i.name && (o = 'fetch-timeout'),
                    Ft.create(o, { originalErrorMessage: i.message }))
                  );
                case 6:
                  if (
                    ((s = f.status),
                    (a = f.headers.get('ETag') || void 0),
                    200 !== f.status)
                  )
                    return [3, 11];
                  (l = void 0), (t.label = 7);
                case 7:
                  return t.trys.push([7, 9, , 10]), [4, f.json()];
                case 8:
                  return (l = t.sent()), [3, 10];
                case 9:
                  throw (
                    ((f = t.sent()),
                    Ft.create('fetch-client-parse', {
                      originalErrorMessage: f.message
                    }))
                  );
                case 10:
                  (c = l.entries), (u = l.state), (t.label = 11);
                case 11:
                  if (
                    ('INSTANCE_STATE_UNSPECIFIED' === u
                      ? (s = 500)
                      : 'NO_CHANGE' === u
                      ? (s = 304)
                      : ('NO_TEMPLATE' !== u && 'EMPTY_CONFIG' !== u) ||
                        (c = {}),
                    304 !== s && 200 !== s)
                  )
                    throw Ft.create('fetch-status', { httpStatus: s });
                  return [2, { status: s, eTag: a, config: c }];
              }
              var e;
            });
          });
        }),
        Vt);
      function Vt(t, e, r, n, i, o) {
        (this.firebaseInstallations = t),
          (this.sdkVersion = e),
          (this.namespace = r),
          (this.projectId = n),
          (this.apiKey = i),
          (this.appId = o);
      }
      var Ut =
        ((zt.prototype.fetch = function (r) {
          return f(this, void 0, void 0, function () {
            var e;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [4, this.storage.getThrottleMetadata()];
                case 1:
                  return (
                    (e = t.sent() || {
                      backoffCount: 0,
                      throttleEndTimeMillis: Date.now()
                    }),
                    [2, this.attemptFetch(r, e)]
                  );
              }
            });
          });
        }),
        (zt.prototype.attemptFetch = function (c, t) {
          var u = t.throttleEndTimeMillis,
            l = t.backoffCount;
          return f(this, void 0, void 0, function () {
            var s, a;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [
                    4,
                    ((i = c.signal),
                    (o = u),
                    new Promise(function (t, e) {
                      var r = Math.max(o - Date.now(), 0),
                        n = setTimeout(t, r);
                      i.addEventListener(function () {
                        clearTimeout(n),
                          e(
                            Ft.create('fetch-throttle', {
                              throttleEndTimeMillis: o
                            })
                          );
                      });
                    }))
                  ];
                case 1:
                  t.sent(), (t.label = 2);
                case 2:
                  return t.trys.push([2, 5, , 7]), [4, this.client.fetch(c)];
                case 3:
                  return (
                    (s = t.sent()), [4, this.storage.deleteThrottleMetadata()]
                  );
                case 4:
                  return t.sent(), [2, s];
                case 5:
                  if (
                    !(function (t) {
                      if (t instanceof h && t.customData) {
                        t = Number(t.customData.httpStatus);
                        return 429 === t || 500 === t || 503 === t || 504 === t;
                      }
                    })((a = t.sent()))
                  )
                    throw a;
                  return (
                    (a = {
                      throttleEndTimeMillis:
                        Date.now() +
                        ((e = l),
                        void 0 === r && (r = 1e3),
                        void 0 === n && (n = 2),
                        (n = r * Math.pow(n, e)),
                        (e = Math.round(0.5 * n * (Math.random() - 0.5) * 2)),
                        Math.min(144e5, n + e)),
                      backoffCount: l + 1
                    }),
                    [4, this.storage.setThrottleMetadata(a)]
                  );
                case 6:
                  return t.sent(), [2, this.attemptFetch(c, a)];
                case 7:
                  return [2];
              }
              var e, r, n, i, o;
            });
          });
        }),
        zt);
      function zt(t, e) {
        (this.client = t), (this.storage = e);
      }
      var $t =
        (Object.defineProperty(Gt.prototype, 'fetchTimeMillis', {
          get: function () {
            return (
              this._storageCache.getLastSuccessfulFetchTimestampMillis() || -1
            );
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(Gt.prototype, 'lastFetchStatus', {
          get: function () {
            return this._storageCache.getLastFetchStatus() || 'no-fetch-yet';
          },
          enumerable: !1,
          configurable: !0
        }),
        Gt);
      function Gt(t, e, r, n, i) {
        (this.app = t),
          (this._client = e),
          (this._storageCache = r),
          (this._storage = n),
          (this._logger = i),
          (this._isInitializationComplete = !1),
          (this.settings = {
            fetchTimeoutMillis: 6e4,
            minimumFetchIntervalMillis: 432e5
          }),
          (this.defaultConfig = {});
      }
      function Wt(t, e) {
        t = t.target.error || void 0;
        return Ft.create(e, { originalErrorMessage: t && t.message });
      }
      var Jt = 'app_namespace_store',
        Yt = 'firebase_remote_config',
        Zt = 1;
      var Qt =
        ((Xt.prototype.getLastFetchStatus = function () {
          return this.get('last_fetch_status');
        }),
        (Xt.prototype.setLastFetchStatus = function (t) {
          return this.set('last_fetch_status', t);
        }),
        (Xt.prototype.getLastSuccessfulFetchTimestampMillis = function () {
          return this.get('last_successful_fetch_timestamp_millis');
        }),
        (Xt.prototype.setLastSuccessfulFetchTimestampMillis = function (t) {
          return this.set('last_successful_fetch_timestamp_millis', t);
        }),
        (Xt.prototype.getLastSuccessfulFetchResponse = function () {
          return this.get('last_successful_fetch_response');
        }),
        (Xt.prototype.setLastSuccessfulFetchResponse = function (t) {
          return this.set('last_successful_fetch_response', t);
        }),
        (Xt.prototype.getActiveConfig = function () {
          return this.get('active_config');
        }),
        (Xt.prototype.setActiveConfig = function (t) {
          return this.set('active_config', t);
        }),
        (Xt.prototype.getActiveConfigEtag = function () {
          return this.get('active_config_etag');
        }),
        (Xt.prototype.setActiveConfigEtag = function (t) {
          return this.set('active_config_etag', t);
        }),
        (Xt.prototype.getThrottleMetadata = function () {
          return this.get('throttle_metadata');
        }),
        (Xt.prototype.setThrottleMetadata = function (t) {
          return this.set('throttle_metadata', t);
        }),
        (Xt.prototype.deleteThrottleMetadata = function () {
          return this.delete('throttle_metadata');
        }),
        (Xt.prototype.get = function (a) {
          return f(this, void 0, void 0, function () {
            var o,
              s = this;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [4, this.openDbPromise];
                case 1:
                  return (
                    (o = t.sent()),
                    [
                      2,
                      new Promise(function (e, r) {
                        var t = o.transaction([Jt], 'readonly').objectStore(Jt),
                          n = s.createCompositeKey(a);
                        try {
                          var i = t.get(n);
                          (i.onerror = function (t) {
                            r(Wt(t, 'storage-get'));
                          }),
                            (i.onsuccess = function (t) {
                              t = t.target.result;
                              e(t ? t.value : void 0);
                            });
                        } catch (t) {
                          r(
                            Ft.create('storage-get', {
                              originalErrorMessage: t && t.message
                            })
                          );
                        }
                      })
                    ]
                  );
              }
            });
          });
        }),
        (Xt.prototype.set = function (a, c) {
          return f(this, void 0, void 0, function () {
            var o,
              s = this;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [4, this.openDbPromise];
                case 1:
                  return (
                    (o = t.sent()),
                    [
                      2,
                      new Promise(function (t, e) {
                        var r = o
                            .transaction([Jt], 'readwrite')
                            .objectStore(Jt),
                          n = s.createCompositeKey(a);
                        try {
                          var i = r.put({ compositeKey: n, value: c });
                          (i.onerror = function (t) {
                            e(Wt(t, 'storage-set'));
                          }),
                            (i.onsuccess = function () {
                              t();
                            });
                        } catch (t) {
                          e(
                            Ft.create('storage-set', {
                              originalErrorMessage: t && t.message
                            })
                          );
                        }
                      })
                    ]
                  );
              }
            });
          });
        }),
        (Xt.prototype.delete = function (a) {
          return f(this, void 0, void 0, function () {
            var o,
              s = this;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [4, this.openDbPromise];
                case 1:
                  return (
                    (o = t.sent()),
                    [
                      2,
                      new Promise(function (t, e) {
                        var r = o
                            .transaction([Jt], 'readwrite')
                            .objectStore(Jt),
                          n = s.createCompositeKey(a);
                        try {
                          var i = r.delete(n);
                          (i.onerror = function (t) {
                            e(Wt(t, 'storage-delete'));
                          }),
                            (i.onsuccess = function () {
                              t();
                            });
                        } catch (t) {
                          e(
                            Ft.create('storage-delete', {
                              originalErrorMessage: t && t.message
                            })
                          );
                        }
                      })
                    ]
                  );
              }
            });
          });
        }),
        (Xt.prototype.createCompositeKey = function (t) {
          return [this.appId, this.appName, this.namespace, t].join();
        }),
        Xt);
      function Xt(t, e, r, n) {
        void 0 === n &&
          (n = new Promise(function (e, r) {
            var t = indexedDB.open(Yt, Zt);
            (t.onerror = function (t) {
              r(Wt(t, 'storage-open'));
            }),
              (t.onsuccess = function (t) {
                e(t.target.result);
              }),
              (t.onupgradeneeded = function (t) {
                var e = t.target.result;
                0 === t.oldVersion &&
                  e.createObjectStore(Jt, { keyPath: 'compositeKey' });
              });
          })),
          (this.appId = t),
          (this.appName = e),
          (this.namespace = r),
          (this.openDbPromise = n);
      }
      var te =
        ((ee.prototype.getLastFetchStatus = function () {
          return this.lastFetchStatus;
        }),
        (ee.prototype.getLastSuccessfulFetchTimestampMillis = function () {
          return this.lastSuccessfulFetchTimestampMillis;
        }),
        (ee.prototype.getActiveConfig = function () {
          return this.activeConfig;
        }),
        (ee.prototype.loadFromStorage = function () {
          return f(this, void 0, void 0, function () {
            var e, r, n;
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return (
                    (e = this.storage.getLastFetchStatus()),
                    (r = this.storage.getLastSuccessfulFetchTimestampMillis()),
                    (n = this.storage.getActiveConfig()),
                    [4, e]
                  );
                case 1:
                  return (e = t.sent()) && (this.lastFetchStatus = e), [4, r];
                case 2:
                  return (
                    (r = t.sent()) &&
                      (this.lastSuccessfulFetchTimestampMillis = r),
                    [4, n]
                  );
                case 3:
                  return (n = t.sent()) && (this.activeConfig = n), [2];
              }
            });
          });
        }),
        (ee.prototype.setLastFetchStatus = function (t) {
          return (this.lastFetchStatus = t), this.storage.setLastFetchStatus(t);
        }),
        (ee.prototype.setLastSuccessfulFetchTimestampMillis = function (t) {
          return (
            (this.lastSuccessfulFetchTimestampMillis = t),
            this.storage.setLastSuccessfulFetchTimestampMillis(t)
          );
        }),
        (ee.prototype.setActiveConfig = function (t) {
          return (this.activeConfig = t), this.storage.setActiveConfig(t);
        }),
        ee);
      function ee(t) {
        this.storage = t;
      }
      ne._registerComponent(
        new m(
          kt,
          function (t, e) {
            var r = t.getProvider('app-exp').getImmediate(),
              n = t.getProvider('installations-exp-internal').getImmediate();
            if ('undefined' == typeof window)
              throw Ft.create('registration-window');
            var i = r.options,
              o = i.projectId,
              s = i.apiKey,
              a = i.appId;
            if (!o) throw Ft.create('registration-project-id');
            if (!s) throw Ft.create('registration-api-key');
            if (!a) throw Ft.create('registration-app-id');
            e = e || 'firebase';
            var c = new Qt(a, r.name, e),
              t = new te(c),
              i = new E(Lt);
            i.logLevel = v.ERROR;
            (a = new Kt(n, ne.SDK_VERSION, e, o, s, a)),
              (a = new Ut(a, c)),
              (a = new qt(a, c, t, i)),
              (i = new $t(r, a, t, c, i));
            return Nt(i), i;
          },
          'PUBLIC'
        ).setMultipleInstances(!0)
      ),
        ne.registerVersion(Lt, '0.0.900'),
        (re.activate = Dt),
        (re.ensureInitialized = Nt),
        (re.fetchAndActivate = function (e) {
          return f(this, void 0, void 0, function () {
            return p(this, function (t) {
              switch (t.label) {
                case 0:
                  return [4, Rt(e)];
                case 1:
                  return t.sent(), [2, Dt(e)];
              }
            });
          });
        }),
        (re.fetchConfig = Rt),
        (re.getAll = function (r) {
          var t = r;
          return (function (t, e) {
            void 0 === t && (t = {});
            void 0 === e && (e = {});
            return Object.keys(s(s({}, t), e));
          })(t._storageCache.getActiveConfig(), t.defaultConfig).reduce(
            function (t, e) {
              return (t[e] = Bt(r, e)), t;
            },
            {}
          );
        }),
        (re.getBoolean = function (t, e) {
          return Bt(t, e).asBoolean();
        }),
        (re.getNumber = function (t, e) {
          return Bt(t, e).asNumber();
        }),
        (re.getRemoteConfig = function (t) {
          return ne._getProvider(t, kt).getImmediate();
        }),
        (re.getString = function (t, e) {
          return Bt(t, e).asString();
        }),
        (re.getValue = Bt),
        (re.setLogLevel = function (t, e) {
          switch (e) {
            case 'debug':
              t._logger.logLevel = v.DEBUG;
              break;
            case 'silent':
              t._logger.logLevel = v.SILENT;
              break;
            default:
              t._logger.logLevel = v.ERROR;
          }
        }),
        Object.defineProperty(re, '__esModule', { value: !0 });
    }.apply(this, arguments));
  } catch (t) {
    throw (
      (console.error(t),
      new Error(
        'Cannot instantiate firebase-remote-config.js - be sure to load firebase-app.js first.'
      ))
    );
  }
});
//# sourceMappingURL=firebase-remote-config.js.map
