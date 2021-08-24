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
        (t.firebase.performance = t.firebase.performance || {})),
        t.firebase.app
      );
})(this, function (Ce, Re) {
  'use strict';
  try {
    (function () {
      var n = function (t, e) {
        return (n =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (t, e) {
              t.__proto__ = e;
            }) ||
          function (t, e) {
            for (var n in e) e.hasOwnProperty(n) && (t[n] = e[n]);
          })(t, e);
      };
      var a = function () {
        return (a =
          Object.assign ||
          function (t) {
            for (var e, n = 1, r = arguments.length; n < r; n++)
              for (var i in (e = arguments[n]))
                Object.prototype.hasOwnProperty.call(e, i) && (t[i] = e[i]);
            return t;
          }).apply(this, arguments);
      };
      function c(t, a, s, u) {
        return new (s = s || Promise)(function (n, e) {
          function r(t) {
            try {
              o(u.next(t));
            } catch (t) {
              e(t);
            }
          }
          function i(t) {
            try {
              o(u.throw(t));
            } catch (t) {
              e(t);
            }
          }
          function o(t) {
            var e;
            t.done
              ? n(t.value)
              : ((e = t.value) instanceof s
                  ? e
                  : new s(function (t) {
                      t(e);
                    })
                ).then(r, i);
          }
          o((u = u.apply(t, a || [])).next());
        });
      }
      function l(n, r) {
        var i,
          o,
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
              for (; s; )
                try {
                  if (
                    ((i = 1),
                    o &&
                      (a =
                        2 & e[0]
                          ? o.return
                          : e[0]
                          ? o.throw || ((a = o.return) && a.call(o), 0)
                          : o.next) &&
                      !(a = a.call(o, e[1])).done)
                  )
                    return a;
                  switch (((o = 0), a && (e = [2 & e[0], a.value]), e[0])) {
                    case 0:
                    case 1:
                      a = e;
                      break;
                    case 4:
                      return s.label++, { value: e[1], done: !1 };
                    case 5:
                      s.label++, (o = e[1]), (e = [0]);
                      continue;
                    case 7:
                      (e = s.ops.pop()), s.trys.pop();
                      continue;
                    default:
                      if (
                        !(a = 0 < (a = s.trys).length && a[a.length - 1]) &&
                        (6 === e[0] || 2 === e[0])
                      ) {
                        s = 0;
                        continue;
                      }
                      if (3 === e[0] && (!a || (e[1] > a[0] && e[1] < a[3]))) {
                        s.label = e[1];
                        break;
                      }
                      if (6 === e[0] && s.label < a[1]) {
                        (s.label = a[1]), (a = e);
                        break;
                      }
                      if (a && s.label < a[2]) {
                        (s.label = a[2]), s.ops.push(e);
                        break;
                      }
                      a[2] && s.ops.pop(), s.trys.pop();
                      continue;
                  }
                  e = r.call(n, s);
                } catch (t) {
                  (e = [6, t]), (o = 0);
                } finally {
                  i = a = 0;
                }
              if (5 & e[0]) throw e[1];
              return { value: e[0] ? e[1] : void 0, done: !0 };
            })([e, t]);
          };
        }
      }
      function s(t) {
        var e = 'function' == typeof Symbol && Symbol.iterator,
          n = e && t[e],
          r = 0;
        if (n) return n.call(t);
        if (t && 'number' == typeof t.length)
          return {
            next: function () {
              return (
                t && r >= t.length && (t = void 0),
                { value: t && t[r++], done: !t }
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
              var n = 'function' == typeof Symbol && t[Symbol.iterator];
              if (!n) return t;
              var r,
                i,
                o = n.call(t),
                a = [];
              try {
                for (; (void 0 === e || 0 < e--) && !(r = o.next()).done; )
                  a.push(r.value);
              } catch (t) {
                i = { error: t };
              } finally {
                try {
                  r && !r.done && (n = o.return) && n.call(o);
                } finally {
                  if (i) throw i.error;
                }
              }
              return a;
            })(arguments[e])
          );
        return t;
      }
      function i() {
        for (var t = 0, e = 0, n = arguments.length; e < n; e++)
          t += arguments[e].length;
        for (var r = Array(t), i = 0, e = 0; e < n; e++)
          for (var o = arguments[e], a = 0, s = o.length; a < s; a++, i++)
            r[i] = o[a];
        return r;
      }
      var r,
        t,
        o,
        u = 'FirebaseError',
        f =
          ((r = Error),
          n((t = h), (o = r)),
          (t.prototype =
            null === o
              ? Object.create(o)
              : ((p.prototype = o.prototype), new p())),
          h);
      function p() {
        this.constructor = t;
      }
      function h(t, e, n) {
        e = r.call(this, e) || this;
        return (
          (e.code = t),
          (e.customData = n),
          (e.name = u),
          Object.setPrototypeOf(e, h.prototype),
          Error.captureStackTrace &&
            Error.captureStackTrace(e, d.prototype.create),
          e
        );
      }
      var d =
        ((g.prototype.create = function (t) {
          for (var e = [], n = 1; n < arguments.length; n++)
            e[n - 1] = arguments[n];
          var r,
            i = e[0] || {},
            o = this.service + '/' + t,
            t = this.errors[t],
            t = t
              ? ((r = i),
                t.replace(v, function (t, e) {
                  var n = r[e];
                  return null != n ? String(n) : '<' + e + '?>';
                }))
              : 'Error',
            t = this.serviceName + ': ' + t + ' (' + o + ').';
          return new f(o, t, i);
        }),
        g);
      function g(t, e, n) {
        (this.service = t), (this.serviceName = e), (this.errors = n);
      }
      var m,
        v = /\{\$([^}]+)}/g;
      function y() {
        for (var t = 0, e = 0, n = arguments.length; e < n; e++)
          t += arguments[e].length;
        for (var r = Array(t), i = 0, e = 0; e < n; e++)
          for (var o = arguments[e], a = 0, s = o.length; a < s; a++, i++)
            r[i] = o[a];
        return r;
      }
      ((Ct = m = m || {})[(Ct.DEBUG = 0)] = 'DEBUG'),
        (Ct[(Ct.VERBOSE = 1)] = 'VERBOSE'),
        (Ct[(Ct.INFO = 2)] = 'INFO'),
        (Ct[(Ct.WARN = 3)] = 'WARN'),
        (Ct[(Ct.ERROR = 4)] = 'ERROR'),
        (Ct[(Ct.SILENT = 5)] = 'SILENT');
      function b(t, e) {
        for (var n = [], r = 2; r < arguments.length; r++)
          n[r - 2] = arguments[r];
        if (!(e < t.logLevel)) {
          var i = new Date().toISOString(),
            o = E[e];
          if (!o)
            throw new Error(
              'Attempted to log a message with an invalid logType (value: ' +
                e +
                ')'
            );
          console[o].apply(console, y(['[' + i + ']  ' + t.name + ':'], n));
        }
      }
      var _ = {
          debug: m.DEBUG,
          verbose: m.VERBOSE,
          info: m.INFO,
          warn: m.WARN,
          error: m.ERROR,
          silent: m.SILENT
        },
        w = m.INFO,
        E =
          (((W = {})[m.DEBUG] = 'log'),
          (W[m.VERBOSE] = 'log'),
          (W[m.INFO] = 'info'),
          (W[m.WARN] = 'warn'),
          (W[m.ERROR] = 'error'),
          W),
        T =
          (Object.defineProperty(I.prototype, 'logLevel', {
            get: function () {
              return this._logLevel;
            },
            set: function (t) {
              if (!(t in m))
                throw new TypeError(
                  'Invalid value "' + t + '" assigned to `logLevel`'
                );
              this._logLevel = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          (I.prototype.setLogLevel = function (t) {
            this._logLevel = 'string' == typeof t ? _[t] : t;
          }),
          Object.defineProperty(I.prototype, 'logHandler', {
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
          Object.defineProperty(I.prototype, 'userLogHandler', {
            get: function () {
              return this._userLogHandler;
            },
            set: function (t) {
              this._userLogHandler = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          (I.prototype.debug = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, y([this, m.DEBUG], t)),
              this._logHandler.apply(this, y([this, m.DEBUG], t));
          }),
          (I.prototype.log = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, y([this, m.VERBOSE], t)),
              this._logHandler.apply(this, y([this, m.VERBOSE], t));
          }),
          (I.prototype.info = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, y([this, m.INFO], t)),
              this._logHandler.apply(this, y([this, m.INFO], t));
          }),
          (I.prototype.warn = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, y([this, m.WARN], t)),
              this._logHandler.apply(this, y([this, m.WARN], t));
          }),
          (I.prototype.error = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, y([this, m.ERROR], t)),
              this._logHandler.apply(this, y([this, m.ERROR], t));
          }),
          I);
      function I(t) {
        (this.name = t),
          (this._logLevel = w),
          (this._logHandler = b),
          (this._userLogHandler = null);
      }
      var S =
        ((k.prototype.setInstantiationMode = function (t) {
          return (this.instantiationMode = t), this;
        }),
        (k.prototype.setMultipleInstances = function (t) {
          return (this.multipleInstances = t), this;
        }),
        (k.prototype.setServiceProps = function (t) {
          return (this.serviceProps = t), this;
        }),
        k);
      function k(t, e, n) {
        (this.name = t),
          (this.instanceFactory = e),
          (this.type = n),
          (this.multipleInstances = !1),
          (this.serviceProps = {}),
          (this.instantiationMode = 'LAZY');
      }
      function N(n) {
        return new Promise(function (t, e) {
          (n.onsuccess = function () {
            t(n.result);
          }),
            (n.onerror = function () {
              e(n.error);
            });
        });
      }
      function O(n, r, i) {
        var o,
          t = new Promise(function (t, e) {
            N((o = n[r].apply(n, i))).then(t, e);
          });
        return (t.request = o), t;
      }
      function A(t, n, e) {
        e.forEach(function (e) {
          Object.defineProperty(t.prototype, e, {
            get: function () {
              return this[n][e];
            },
            set: function (t) {
              this[n][e] = t;
            }
          });
        });
      }
      function P(e, n, r, t) {
        t.forEach(function (t) {
          t in r.prototype &&
            (e.prototype[t] = function () {
              return O(this[n], t, arguments);
            });
        });
      }
      function C(e, n, r, t) {
        t.forEach(function (t) {
          t in r.prototype &&
            (e.prototype[t] = function () {
              return this[n][t].apply(this[n], arguments);
            });
        });
      }
      function R(t, r, e, n) {
        n.forEach(function (n) {
          n in e.prototype &&
            (t.prototype[n] = function () {
              return (
                (t = this[r]),
                (e = O(t, n, arguments)).then(function (t) {
                  if (t) return new M(t, e.request);
                })
              );
              var t, e;
            });
        });
      }
      function x(t) {
        this._index = t;
      }
      function M(t, e) {
        (this._cursor = t), (this._request = e);
      }
      function D(t) {
        this._store = t;
      }
      function j(n) {
        (this._tx = n),
          (this.complete = new Promise(function (t, e) {
            (n.oncomplete = function () {
              t();
            }),
              (n.onerror = function () {
                e(n.error);
              }),
              (n.onabort = function () {
                e(n.error);
              });
          }));
      }
      function B(t, e, n) {
        (this._db = t), (this.oldVersion = e), (this.transaction = new j(n));
      }
      function L(t) {
        this._db = t;
      }
      A(x, '_index', ['name', 'keyPath', 'multiEntry', 'unique']),
        P(x, '_index', IDBIndex, [
          'get',
          'getKey',
          'getAll',
          'getAllKeys',
          'count'
        ]),
        R(x, '_index', IDBIndex, ['openCursor', 'openKeyCursor']),
        A(M, '_cursor', ['direction', 'key', 'primaryKey', 'value']),
        P(M, '_cursor', IDBCursor, ['update', 'delete']),
        ['advance', 'continue', 'continuePrimaryKey'].forEach(function (n) {
          n in IDBCursor.prototype &&
            (M.prototype[n] = function () {
              var e = this,
                t = arguments;
              return Promise.resolve().then(function () {
                return (
                  e._cursor[n].apply(e._cursor, t),
                  N(e._request).then(function (t) {
                    if (t) return new M(t, e._request);
                  })
                );
              });
            });
        }),
        (D.prototype.createIndex = function () {
          return new x(this._store.createIndex.apply(this._store, arguments));
        }),
        (D.prototype.index = function () {
          return new x(this._store.index.apply(this._store, arguments));
        }),
        A(D, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']),
        P(D, '_store', IDBObjectStore, [
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
        R(D, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']),
        C(D, '_store', IDBObjectStore, ['deleteIndex']),
        (j.prototype.objectStore = function () {
          return new D(this._tx.objectStore.apply(this._tx, arguments));
        }),
        A(j, '_tx', ['objectStoreNames', 'mode']),
        C(j, '_tx', IDBTransaction, ['abort']),
        (B.prototype.createObjectStore = function () {
          return new D(this._db.createObjectStore.apply(this._db, arguments));
        }),
        A(B, '_db', ['name', 'version', 'objectStoreNames']),
        C(B, '_db', IDBDatabase, ['deleteObjectStore', 'close']),
        (L.prototype.transaction = function () {
          return new j(this._db.transaction.apply(this._db, arguments));
        }),
        A(L, '_db', ['name', 'version', 'objectStoreNames']),
        C(L, '_db', IDBDatabase, ['close']),
        ['openCursor', 'openKeyCursor'].forEach(function (i) {
          [D, x].forEach(function (t) {
            i in t.prototype &&
              (t.prototype[i.replace('open', 'iterate')] = function () {
                var t = ((n = arguments), Array.prototype.slice.call(n)),
                  e = t[t.length - 1],
                  n = this._store || this._index,
                  r = n[i].apply(n, t.slice(0, -1));
                r.onsuccess = function () {
                  e(r.result);
                };
              });
          });
        }),
        [x, D].forEach(function (t) {
          t.prototype.getAll ||
            (t.prototype.getAll = function (t, n) {
              var r = this,
                i = [];
              return new Promise(function (e) {
                r.iterateCursor(t, function (t) {
                  t
                    ? (i.push(t.value),
                      void 0 === n || i.length != n ? t.continue() : e(i))
                    : e(i);
                });
              });
            });
        });
      var U = '0.0.900',
        q = 1e4,
        F = 'w:' + U,
        H = 'FIS_v2',
        V = 'https://firebaseinstallations.googleapis.com/v1',
        K = 36e5,
        W =
          (((Ct = {})['missing-app-config-values'] =
            'Missing App configuration value: "{$valueName}"'),
          (Ct['not-registered'] = 'Firebase Installation is not registered.'),
          (Ct['installation-not-found'] = 'Firebase Installation not found.'),
          (Ct['request-failed'] =
            '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"'),
          (Ct['app-offline'] =
            'Could not process request. Application offline.'),
          (Ct['delete-pending-registration'] =
            "Can't delete installation while there is a pending registration request."),
          Ct),
        $ = new d('installations', 'Installations', W);
      function z(t) {
        return t instanceof f && t.code.includes('request-failed');
      }
      function G(t) {
        t = t.projectId;
        return V + '/projects/' + t + '/installations';
      }
      function J(t) {
        return {
          token: t.token,
          requestStatus: 2,
          expiresIn: ((t = t.expiresIn), Number(t.replace('s', '000'))),
          creationTime: Date.now()
        };
      }
      function Y(n, r) {
        return c(this, void 0, void 0, function () {
          var e;
          return l(this, function (t) {
            switch (t.label) {
              case 0:
                return [4, r.json()];
              case 1:
                return (
                  (e = t.sent()),
                  (e = e.error),
                  [
                    2,
                    $.create('request-failed', {
                      requestName: n,
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
      function Z(t) {
        t = t.apiKey;
        return new Headers({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-goog-api-key': t
        });
      }
      function Q(t, e) {
        (e = e.refreshToken), (t = Z(t));
        return t.append('Authorization', H + ' ' + e), t;
      }
      function X(n) {
        return c(this, void 0, void 0, function () {
          var e;
          return l(this, function (t) {
            switch (t.label) {
              case 0:
                return [4, n()];
              case 1:
                return 500 <= (e = t.sent()).status && e.status < 600
                  ? [2, n()]
                  : [2, e];
            }
          });
        });
      }
      function tt(e) {
        return new Promise(function (t) {
          setTimeout(t, e);
        });
      }
      var et = /^[cdef][\w-]{21}$/,
        nt = '';
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
          return et.test(t) ? t : nt;
        } catch (t) {
          return nt;
        }
      }
      function it(t) {
        return t.appName + '!' + t.appId;
      }
      var ot = new Map();
      function at(t, e) {
        t = it(t);
        st(t, e),
          (function (t, e) {
            var n = (function () {
              !ut &&
                'BroadcastChannel' in self &&
                ((ut = new BroadcastChannel(
                  '[Firebase] FID Change'
                )).onmessage = function (t) {
                  st(t.data.key, t.data.fid);
                });
              return ut;
            })();
            n && n.postMessage({ key: t, fid: e });
            0 === ot.size && ut && (ut.close(), (ut = null));
          })(t, e);
      }
      function st(t, e) {
        var n,
          r,
          i = ot.get(t);
        if (i)
          try {
            for (var o = s(i), a = o.next(); !a.done; a = o.next()) {
              (0, a.value)(e);
            }
          } catch (t) {
            n = { error: t };
          } finally {
            try {
              a && !a.done && (r = o.return) && r.call(o);
            } finally {
              if (n) throw n.error;
            }
          }
      }
      var ut = null;
      var ct = 'firebase-installations-database',
        lt = 1,
        ft = 'firebase-installations-store',
        pt = null;
      function ht() {
        var t, e, n;
        return (
          pt ||
            ((t = lt),
            (e = function (t) {
              0 === t.oldVersion && t.createObjectStore(ft);
            }),
            (n = (t = O(indexedDB, 'open', [ct, t])).request) &&
              (n.onupgradeneeded = function (t) {
                e && e(new B(n.result, t.oldVersion, n.transaction));
              }),
            (pt = t.then(function (t) {
              return new L(t);
            }))),
          pt
        );
      }
      function dt(o, a) {
        return c(this, void 0, void 0, function () {
          var e, n, r, i;
          return l(this, function (t) {
            switch (t.label) {
              case 0:
                return (e = it(o)), [4, ht()];
              case 1:
                return (
                  (r = t.sent()),
                  (n = r.transaction(ft, 'readwrite')),
                  [4, (r = n.objectStore(ft)).get(e)]
                );
              case 2:
                return (i = t.sent()), [4, r.put(a, e)];
              case 3:
                return t.sent(), [4, n.complete];
              case 4:
                return t.sent(), (i && i.fid === a.fid) || at(o, a.fid), [2, a];
            }
          });
        });
      }
      function gt(r) {
        return c(this, void 0, void 0, function () {
          var e, n;
          return l(this, function (t) {
            switch (t.label) {
              case 0:
                return (e = it(r)), [4, ht()];
              case 1:
                return (
                  (n = t.sent()),
                  [
                    4,
                    (n = n.transaction(ft, 'readwrite'))
                      .objectStore(ft)
                      .delete(e)
                  ]
                );
              case 2:
                return t.sent(), [4, n.complete];
              case 3:
                return t.sent(), [2];
            }
          });
        });
      }
      function mt(a, s) {
        return c(this, void 0, void 0, function () {
          var e, n, r, i, o;
          return l(this, function (t) {
            switch (t.label) {
              case 0:
                return (e = it(a)), [4, ht()];
              case 1:
                return (
                  (r = t.sent()),
                  (n = r.transaction(ft, 'readwrite')),
                  [4, (r = n.objectStore(ft)).get(e)]
                );
              case 2:
                return (
                  (i = t.sent()),
                  void 0 !== (o = s(i)) ? [3, 4] : [4, r.delete(e)]
                );
              case 3:
                return t.sent(), [3, 6];
              case 4:
                return [4, r.put(o, e)];
              case 5:
                t.sent(), (t.label = 6);
              case 6:
                return [4, n.complete];
              case 7:
                return (
                  t.sent(), !o || (i && i.fid === o.fid) || at(a, o.fid), [2, o]
                );
            }
          });
        });
      }
      function vt(i) {
        return c(this, void 0, void 0, function () {
          var e, n, r;
          return l(this, function (t) {
            switch (t.label) {
              case 0:
                return [
                  4,
                  mt(i, function (t) {
                    (t = bt(t || { fid: rt(), registrationStatus: 0 })),
                      (t = (function (t, e) {
                        {
                          if (0 !== e.registrationStatus)
                            return 1 === e.registrationStatus
                              ? {
                                  installationEntry: e,
                                  registrationPromise: (function (i) {
                                    return c(this, void 0, void 0, function () {
                                      var e, n, r;
                                      return l(this, function (t) {
                                        switch (t.label) {
                                          case 0:
                                            return [4, yt(i)];
                                          case 1:
                                            (e = t.sent()), (t.label = 2);
                                          case 2:
                                            return 1 !== e.registrationStatus
                                              ? [3, 5]
                                              : [4, tt(100)];
                                          case 3:
                                            return t.sent(), [4, yt(i)];
                                          case 4:
                                            return (e = t.sent()), [3, 2];
                                          case 5:
                                            return 0 !== e.registrationStatus
                                              ? [3, 7]
                                              : [4, vt(i)];
                                          case 6:
                                            return (
                                              (r = t.sent()),
                                              (n = r.installationEntry),
                                              (r = r.registrationPromise)
                                                ? [2, r]
                                                : [2, n]
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
                            var n = Promise.reject($.create('app-offline'));
                            return {
                              installationEntry: e,
                              registrationPromise: n
                            };
                          }
                          (e = {
                            fid: e.fid,
                            registrationStatus: 1,
                            registrationTime: Date.now()
                          }),
                            (t = (function (r, i) {
                              return c(this, void 0, void 0, function () {
                                var e, n;
                                return l(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      return (
                                        t.trys.push([0, 2, , 7]),
                                        [
                                          4,
                                          (function (a, t) {
                                            var s = t.fid;
                                            return c(
                                              this,
                                              void 0,
                                              void 0,
                                              function () {
                                                var e, n, r, i, o;
                                                return l(this, function (t) {
                                                  switch (t.label) {
                                                    case 0:
                                                      return (
                                                        (e = G(a)),
                                                        (n = Z(a)),
                                                        (o = {
                                                          fid: s,
                                                          authVersion: H,
                                                          appId: a.appId,
                                                          sdkVersion: F
                                                        }),
                                                        (r = {
                                                          method: 'POST',
                                                          headers: n,
                                                          body: JSON.stringify(
                                                            o
                                                          )
                                                        }),
                                                        [
                                                          4,
                                                          X(function () {
                                                            return fetch(e, r);
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
                                                            fid: o.fid || s,
                                                            registrationStatus: 2,
                                                            refreshToken:
                                                              o.refreshToken,
                                                            authToken: J(
                                                              o.authToken
                                                            )
                                                          }
                                                        ]
                                                      );
                                                    case 3:
                                                      return [
                                                        4,
                                                        Y(
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
                                          })(r, i)
                                        ]
                                      );
                                    case 1:
                                      return (e = t.sent()), [2, dt(r, e)];
                                    case 2:
                                      return z((n = t.sent())) &&
                                        409 === n.customData.serverCode
                                        ? [4, gt(r)]
                                        : [3, 4];
                                    case 3:
                                      return t.sent(), [3, 6];
                                    case 4:
                                      return [
                                        4,
                                        dt(r, {
                                          fid: i.fid,
                                          registrationStatus: 0
                                        })
                                      ];
                                    case 5:
                                      t.sent(), (t.label = 6);
                                    case 6:
                                      throw n;
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
                return (n = t.sent()).fid !== nt ? [3, 3] : ((r = {}), [4, e]);
              case 2:
                return [2, ((r.installationEntry = t.sent()), r)];
              case 3:
                return [2, { installationEntry: n, registrationPromise: e }];
            }
          });
        });
      }
      function yt(t) {
        return mt(t, function (t) {
          if (!t) throw $.create('installation-not-found');
          return bt(t);
        });
      }
      function bt(t) {
        return 1 === (e = t).registrationStatus &&
          e.registrationTime + q < Date.now()
          ? { fid: t.fid, registrationStatus: 0 }
          : t;
        var e;
      }
      function _t(t, a) {
        var s = t.appConfig,
          u = t.platformLoggerProvider;
        return c(this, void 0, void 0, function () {
          var e, n, r, i, o;
          return l(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  (e = (function (t, e) {
                    e = e.fid;
                    return G(t) + '/' + e + '/authTokens:generate';
                  })(s, a)),
                  (n = Q(s, a)),
                  (o = u.getImmediate({ optional: !0 })) &&
                    n.append('x-firebase-client', o.getPlatformInfoString()),
                  (o = { installation: { sdkVersion: F } }),
                  (r = { method: 'POST', headers: n, body: JSON.stringify(o) }),
                  [
                    4,
                    X(function () {
                      return fetch(e, r);
                    })
                  ]
                );
              case 1:
                return (i = t.sent()).ok ? [4, i.json()] : [3, 3];
              case 2:
                return (o = t.sent()), [2, J(o)];
              case 3:
                return [4, Y('Generate Auth Token', i)];
              case 4:
                throw t.sent();
            }
          });
        });
      }
      function wt(i, o) {
        return (
          void 0 === o && (o = !1),
          c(this, void 0, void 0, function () {
            var r, e, n;
            return l(this, function (t) {
              switch (t.label) {
                case 0:
                  return [
                    4,
                    mt(i.appConfig, function (t) {
                      if (!Tt(t)) throw $.create('not-registered');
                      var e,
                        n = t.authToken;
                      if (
                        o ||
                        2 !== (e = n).requestStatus ||
                        (function (t) {
                          var e = Date.now();
                          return (
                            e < t.creationTime ||
                            t.creationTime + t.expiresIn < e + K
                          );
                        })(e)
                      ) {
                        if (1 === n.requestStatus)
                          return (
                            (r = (function (n, r) {
                              return c(this, void 0, void 0, function () {
                                var e;
                                return l(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      return [4, Et(n.appConfig)];
                                    case 1:
                                      (e = t.sent()), (t.label = 2);
                                    case 2:
                                      return 1 !== e.authToken.requestStatus
                                        ? [3, 5]
                                        : [4, tt(100)];
                                    case 3:
                                      return t.sent(), [4, Et(n.appConfig)];
                                    case 4:
                                      return (e = t.sent()), [3, 2];
                                    case 5:
                                      return 0 ===
                                        (e = e.authToken).requestStatus
                                        ? [2, wt(n, r)]
                                        : [2, e];
                                  }
                                });
                              });
                            })(i, o)),
                            t
                          );
                        if (!navigator.onLine) throw $.create('app-offline');
                        n =
                          ((e = t),
                          (n = { requestStatus: 1, requestTime: Date.now() }),
                          a(a({}, e), { authToken: n }));
                        return (
                          (r = (function (i, o) {
                            return c(this, void 0, void 0, function () {
                              var e, n, r;
                              return l(this, function (t) {
                                switch (t.label) {
                                  case 0:
                                    return (
                                      t.trys.push([0, 3, , 8]), [4, _t(i, o)]
                                    );
                                  case 1:
                                    return (
                                      (e = t.sent()),
                                      (r = a(a({}, o), { authToken: e })),
                                      [4, dt(i.appConfig, r)]
                                    );
                                  case 2:
                                    return t.sent(), [2, e];
                                  case 3:
                                    return !z((n = t.sent())) ||
                                      (401 !== n.customData.serverCode &&
                                        404 !== n.customData.serverCode)
                                      ? [3, 5]
                                      : [4, gt(i.appConfig)];
                                  case 4:
                                    return t.sent(), [3, 7];
                                  case 5:
                                    return (
                                      (r = a(a({}, o), {
                                        authToken: { requestStatus: 0 }
                                      })),
                                      [4, dt(i.appConfig, r)]
                                    );
                                  case 6:
                                    t.sent(), (t.label = 7);
                                  case 7:
                                    throw n;
                                  case 8:
                                    return [2];
                                }
                              });
                            });
                          })(i, n)),
                          n
                        );
                      }
                      return t;
                    })
                  ];
                case 1:
                  return (e = t.sent()), r ? [4, r] : [3, 3];
                case 2:
                  return (n = t.sent()), [3, 4];
                case 3:
                  (n = e.authToken), (t.label = 4);
                case 4:
                  return [2, n];
              }
            });
          })
        );
      }
      function Et(t) {
        return mt(t, function (t) {
          if (!Tt(t)) throw $.create('not-registered');
          var e = t.authToken;
          return 1 === (e = e).requestStatus && e.requestTime + q < Date.now()
            ? a(a({}, t), { authToken: { requestStatus: 0 } })
            : t;
        });
      }
      function Tt(t) {
        return void 0 !== t && 2 === t.registrationStatus;
      }
      function It(n, r) {
        return (
          void 0 === r && (r = !1),
          c(this, void 0, void 0, function () {
            var e;
            return l(this, function (t) {
              switch (t.label) {
                case 0:
                  return [
                    4,
                    (function (n) {
                      return c(this, void 0, void 0, function () {
                        var e;
                        return l(this, function (t) {
                          switch (t.label) {
                            case 0:
                              return [4, vt(n)];
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
                    })((e = n).appConfig)
                  ];
                case 1:
                  return t.sent(), [4, wt(e, r)];
                case 2:
                  return [2, t.sent().token];
              }
            });
          })
        );
      }
      function St(t) {
        return $.create('missing-app-config-values', { valueName: t });
      }
      function kt(t) {
        return {
          app: (t = t.getProvider('app-exp').getImmediate()),
          appConfig: (function (t) {
            var e, n;
            if (!t || !t.options) throw St('App Configuration');
            if (!t.name) throw St('App Name');
            try {
              for (
                var r = s(['projectId', 'apiKey', 'appId']), i = r.next();
                !i.done;
                i = r.next()
              ) {
                var o = i.value;
                if (!t.options[o]) throw St(o);
              }
            } catch (t) {
              e = { error: t };
            } finally {
              try {
                i && !i.done && (n = r.return) && n.call(r);
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
          platformLoggerProvider: Re._getProvider(t, 'platform-logger'),
          _delete: function () {
            return Promise.resolve();
          }
        };
      }
      function Nt(t) {
        var t = t.getProvider('app-exp').getImmediate(),
          e = Re._getProvider(t, Ot).getImmediate();
        return {
          getId: function () {
            return (function (i) {
              return c(this, void 0, void 0, function () {
                var e, n, r;
                return l(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return [4, vt((e = i).appConfig)];
                    case 1:
                      return (
                        (n = t.sent()),
                        (r = n.installationEntry),
                        (n.registrationPromise || wt(e)).catch(console.error),
                        [2, r.fid]
                      );
                  }
                });
              });
            })(e);
          },
          getToken: function (t) {
            return It(e, t);
          }
        };
      }
      var Ot = 'installations-exp';
      Re._registerComponent(new S(Ot, kt, 'PUBLIC')),
        Re._registerComponent(
          new S('installations-exp-internal', Nt, 'PRIVATE')
        ),
        Re.registerVersion('@firebase/installations-exp', U);
      var At,
        Pt,
        Ct = '0.0.900',
        Rt = Ct,
        xt = 'FB-PERF-TRACE-MEASURE',
        Mt = '@firebase/performance/config',
        Dt = '@firebase/performance/configexpire',
        W = 'Performance',
        U =
          (((U = {})['trace started'] =
            'Trace {$traceName} was started before.'),
          (U['trace stopped'] = 'Trace {$traceName} is not running.'),
          (U['nonpositive trace startTime'] =
            'Trace {$traceName} startTime should be positive.'),
          (U['nonpositive trace duration'] =
            'Trace {$traceName} duration should be positive.'),
          (U['no window'] = 'Window is not available.'),
          (U['no app id'] = 'App id is not available.'),
          (U['no project id'] = 'Project id is not available.'),
          (U['no api key'] = 'Api key is not available.'),
          (U['invalid cc log'] = 'Attempted to queue invalid cc event'),
          (U['FB not default'] =
            'Performance can only start when Firebase app instance is the default one.'),
          (U['RC response not ok'] = 'RC response is not ok'),
          (U['invalid attribute name'] =
            'Attribute name {$attributeName} is invalid.'),
          (U['invalid attribute value'] =
            'Attribute value {$attributeValue} is invalid.'),
          (U['invalid custom metric name'] =
            'Custom metric name {$customMetricName} is invalid'),
          (U['invalid String merger input'] =
            'Input for String merger is invalid, contact support team to resolve.'),
          U),
        jt = new d('performance', W, U),
        Bt = new T(W);
      Bt.logLevel = m.INFO;
      var Lt,
        Ut,
        qt =
          ((Ft.prototype.getUrl = function () {
            return this.windowLocation.href.split('?')[0];
          }),
          (Ft.prototype.mark = function (t) {
            this.performance &&
              this.performance.mark &&
              this.performance.mark(t);
          }),
          (Ft.prototype.measure = function (t, e, n) {
            this.performance &&
              this.performance.measure &&
              this.performance.measure(t, e, n);
          }),
          (Ft.prototype.getEntriesByType = function (t) {
            return this.performance && this.performance.getEntriesByType
              ? this.performance.getEntriesByType(t)
              : [];
          }),
          (Ft.prototype.getEntriesByName = function (t) {
            return this.performance && this.performance.getEntriesByName
              ? this.performance.getEntriesByName(t)
              : [];
          }),
          (Ft.prototype.getTimeOrigin = function () {
            return (
              this.performance &&
              (this.performance.timeOrigin ||
                this.performance.timing.navigationStart)
            );
          }),
          (Ft.prototype.requiredApisAvailable = function () {
            return fetch &&
              Promise &&
              this.navigator &&
              this.navigator.cookieEnabled
              ? ('indexedDB' in self && null != indexedDB) ||
                  (Bt.info('IndexedDB is not supported by current browswer'),
                  !1)
              : (Bt.info(
                  'Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled.'
                ),
                !1);
          }),
          (Ft.prototype.setupObserver = function (t, i) {
            this.PerformanceObserver &&
              new this.PerformanceObserver(function (t) {
                for (var e = 0, n = t.getEntries(); e < n.length; e++) {
                  var r = n[e];
                  i(r);
                }
              }).observe({ entryTypes: [t] });
          }),
          (Ft.getInstance = function () {
            return void 0 === At && (At = new Ft(Pt)), At;
          }),
          Ft);
      function Ft(t) {
        if (!(this.window = t)) throw jt.create('no window');
        (this.performance = t.performance),
          (this.PerformanceObserver = t.PerformanceObserver),
          (this.windowLocation = t.location),
          (this.navigator = t.navigator),
          (this.document = t.document),
          this.navigator &&
            this.navigator.cookieEnabled &&
            (this.localStorage = t.localStorage),
          t.perfMetrics &&
            t.perfMetrics.onFirstInputDelay &&
            (this.onFirstInputDelay = t.perfMetrics.onFirstInputDelay);
      }
      function Ht(t, e) {
        var n = t.length - e.length;
        if (n < 0 || 1 < n) throw jt.create('invalid String merger input');
        for (var r = [], i = 0; i < t.length; i++)
          r.push(t.charAt(i)), e.length > i && r.push(e.charAt(i));
        return r.join('');
      }
      var Vt,
        Kt =
          ((Wt.prototype.getFlTransportFullUrl = function () {
            return this.flTransportEndpointUrl.concat(
              '?key=',
              this.transportKey
            );
          }),
          (Wt.getInstance = function () {
            return void 0 === Ut && (Ut = new Wt()), Ut;
          }),
          Wt);
      function Wt() {
        (this.instrumentationEnabled = !0),
          (this.dataCollectionEnabled = !0),
          (this.loggingEnabled = !1),
          (this.tracesSamplingRate = 1),
          (this.networkRequestsSamplingRate = 1),
          (this.logEndPointUrl =
            'https://firebaselogging.googleapis.com/v0cc/log?format=json_proto'),
          (this.flTransportEndpointUrl = Ht(
            'hts/frbslgigp.ogepscmv/ieo/eaylg',
            'tp:/ieaeogn-agolai.o/1frlglgc/o'
          )),
          (this.transportKey = Ht(
            'AzSC8r6ReiGqFMyfvgow',
            'Iayx0u-XT3vksVM-pIV'
          )),
          (this.logSource = 462),
          (this.logTraceAfterSampling = !1),
          (this.logNetworkAfterSampling = !1),
          (this.configTimeToLive = 12);
      }
      ((W = Vt = Vt || {})[(W.UNKNOWN = 0)] = 'UNKNOWN'),
        (W[(W.VISIBLE = 1)] = 'VISIBLE'),
        (W[(W.HIDDEN = 2)] = 'HIDDEN');
      var $t = ['firebase_', 'google_', 'ga_'],
        zt = new RegExp('^[a-zA-Z]\\w*$');
      function Gt() {
        switch (qt.getInstance().document.visibilityState) {
          case 'visible':
            return Vt.VISIBLE;
          case 'hidden':
            return Vt.HIDDEN;
          default:
            return Vt.UNKNOWN;
        }
      }
      function Jt(t) {
        t = null === (t = t.options) || void 0 === t ? void 0 : t.appId;
        if (!t) throw jt.create('no app id');
        return t;
      }
      var Yt = '0.0.1',
        Zt = { loggingEnabled: !0 },
        Qt = 'FIREBASE_INSTALLATIONS_AUTH';
      function Xt(t, e) {
        var r,
          i,
          n = (function () {
            var t = qt.getInstance().localStorage;
            if (!t) return;
            var e = t.getItem(Dt);
            if (
              !e ||
              !(function (t) {
                return Number(t) > Date.now();
              })(e)
            )
              return;
            var n = t.getItem(Mt);
            if (!n) return;
            try {
              return JSON.parse(n);
            } catch (t) {
              return;
            }
          })();
        return n
          ? (ee(n), Promise.resolve())
          : ((i = e),
            (function (t) {
              return (t = t.getToken()).then(function (t) {}), t;
            })((r = t).installations)
              .then(function (t) {
                var e = (function (t) {
                    if (
                      !(t =
                        null === (t = t.options) || void 0 === t
                          ? void 0
                          : t.projectId)
                    )
                      throw jt.create('no project id');
                    return t;
                  })(r.app),
                  n = (function (t) {
                    if (
                      !(t =
                        null === (t = t.options) || void 0 === t
                          ? void 0
                          : t.apiKey)
                    )
                      throw jt.create('no api key');
                    return t;
                  })(r.app),
                  t = new Request(
                    'https://firebaseremoteconfig.googleapis.com/v1/projects/' +
                      e +
                      '/namespaces/fireperf:fetch?key=' +
                      n,
                    {
                      method: 'POST',
                      headers: { Authorization: Qt + ' ' + t },
                      body: JSON.stringify({
                        app_instance_id: i,
                        app_instance_id_token: t,
                        app_id: Jt(r.app),
                        app_version: Rt,
                        sdk_version: Yt
                      })
                    }
                  );
                return fetch(t).then(function (t) {
                  if (t.ok) return t.json();
                  throw jt.create('RC response not ok');
                });
              })
              .catch(function () {
                Bt.info(te);
              })
              .then(ee)
              .then(
                function (t) {
                  var e = qt.getInstance().localStorage;
                  if (!t || !e) return;
                  e.setItem(Mt, JSON.stringify(t)),
                    e.setItem(
                      Dt,
                      String(
                        Date.now() +
                          60 * Kt.getInstance().configTimeToLive * 60 * 1e3
                      )
                    );
                },
                function () {}
              ));
      }
      var te = 'Could not fetch config, will use default configs';
      function ee(t) {
        if (!t) return t;
        var e = Kt.getInstance(),
          n = t.entries || {};
        return (
          (e.loggingEnabled =
            void 0 !== n.fpr_enabled
              ? 'true' === String(n.fpr_enabled)
              : Zt.loggingEnabled),
          n.fpr_log_source && (e.logSource = Number(n.fpr_log_source)),
          n.fpr_log_endpoint_url && (e.logEndPointUrl = n.fpr_log_endpoint_url),
          n.fpr_log_transport_key && (e.transportKey = n.fpr_log_transport_key),
          void 0 !== n.fpr_vc_network_request_sampling_rate &&
            (e.networkRequestsSamplingRate = Number(
              n.fpr_vc_network_request_sampling_rate
            )),
          void 0 !== n.fpr_vc_trace_sampling_rate &&
            (e.tracesSamplingRate = Number(n.fpr_vc_trace_sampling_rate)),
          (e.logTraceAfterSampling = ne(e.tracesSamplingRate)),
          (e.logNetworkAfterSampling = ne(e.networkRequestsSamplingRate)),
          t
        );
      }
      function ne(t) {
        return Math.random() <= t;
      }
      var re,
        ie = 1;
      function oe(t) {
        var e;
        return (
          (ie = 2),
          (re =
            re ||
            ((e = t),
            (function () {
              var n = qt.getInstance().document;
              return new Promise(function (t) {
                var e;
                n && 'complete' !== n.readyState
                  ? ((e = function () {
                      'complete' === n.readyState &&
                        (n.removeEventListener('readystatechange', e), t());
                    }),
                    n.addEventListener('readystatechange', e))
                  : t();
              });
            })()
              .then(function () {
                return (
                  (t = (t = e.installations).getId()).then(function (t) {
                    Lt = t;
                  }),
                  t
                );
                var t;
              })
              .then(function (t) {
                return Xt(e, t);
              })
              .then(ae, ae)))
        );
      }
      function ae() {
        ie = 3;
      }
      var se,
        ue = 1e4,
        ce = 3,
        le = 1e3,
        fe = ce,
        pe = [],
        he = !1;
      function de(t) {
        setTimeout(function () {
          var t, e;
          if (0 !== fe)
            return pe.length
              ? ((t = pe.splice(0, le)),
                (e = t.map(function (t) {
                  return {
                    source_extension_json_proto3: t.message,
                    event_time_ms: String(t.eventTime)
                  };
                })),
                void (function (t, r) {
                  return (function (t) {
                    var e = Kt.getInstance().getFlTransportFullUrl();
                    return fetch(e, {
                      method: 'POST',
                      body: JSON.stringify(t)
                    });
                  })(t)
                    .then(function (t) {
                      return (
                        t.ok || Bt.info('Call to Firebase backend failed.'),
                        t.json()
                      );
                    })
                    .then(function (t) {
                      var e = Number(t.nextRequestWaitMillis),
                        n = ue;
                      isNaN(e) || (n = Math.max(e, n));
                      t = t.logResponseDetails;
                      Array.isArray(t) &&
                        0 < t.length &&
                        'RETRY_REQUEST_LATER' === t[0].responseAction &&
                        ((pe = i(r, pe)),
                        Bt.info('Retry transport request later.')),
                        (fe = ce),
                        de(n);
                    });
                })(
                  {
                    request_time_ms: String(Date.now()),
                    client_info: { client_type: 1, js_client_info: {} },
                    log_source: Kt.getInstance().logSource,
                    log_event: e
                  },
                  t
                ).catch(function () {
                  (pe = i(t, pe)),
                    fe--,
                    Bt.info('Tries left: ' + fe + '.'),
                    de(ue);
                }))
              : de(ue);
        }, t);
      }
      function ge(n) {
        return function () {
          for (var t = [], e = 0; e < arguments.length; e++)
            t[e] = arguments[e];
          !(function (t) {
            if (!t.eventTime || !t.message) throw jt.create('invalid cc log');
            pe = i(pe, [t]);
          })({ message: n.apply(void 0, t), eventTime: Date.now() });
        };
      }
      function me(t, e) {
        (se = se || ge(be))(t, e);
      }
      function ve(t) {
        var e = Kt.getInstance();
        (!e.instrumentationEnabled && t.isAuto) ||
          ((e.dataCollectionEnabled || t.isAuto) &&
            qt.getInstance().requiredApisAvailable() &&
            ((t.isAuto && Gt() !== Vt.VISIBLE) ||
              (3 === ie
                ? ye(t)
                : oe(t.performanceController).then(
                    function () {
                      return ye(t);
                    },
                    function () {
                      return ye(t);
                    }
                  ))));
      }
      function ye(t) {
        var e;
        !Lt ||
          ((e = Kt.getInstance()).loggingEnabled &&
            e.logTraceAfterSampling &&
            setTimeout(function () {
              return me(t, 1);
            }, 0));
      }
      function be(t, e) {
        return 0 === e
          ? ((e = {
              url: (n = t).url,
              http_method: n.httpMethod || 0,
              http_response_code: 200,
              response_payload_bytes: n.responsePayloadBytes,
              client_start_time_us: n.startTimeUs,
              time_to_response_initiated_us: n.timeToResponseInitiatedUs,
              time_to_response_completed_us: n.timeToResponseCompletedUs
            }),
            (e = {
              application_info: _e(n.performanceController.app),
              network_request_metric: e
            }),
            JSON.stringify(e))
          : (function (t) {
              var e = {
                name: t.name,
                is_auto: t.isAuto,
                client_start_time_us: t.startTimeUs,
                duration_us: t.durationUs
              };
              0 !== Object.keys(t.counters).length && (e.counters = t.counters);
              var n = t.getAttributes();
              0 !== Object.keys(n).length && (e.custom_attributes = n);
              e = {
                application_info: _e(t.performanceController.app),
                trace_metric: e
              };
              return JSON.stringify(e);
            })(t);
        var n;
      }
      function _e(t) {
        return {
          google_app_id: Jt(t),
          app_instance_id: Lt,
          web_app_info: {
            sdk_version: Rt,
            page_url: qt.getInstance().getUrl(),
            service_worker_status:
              'serviceWorker' in (t = qt.getInstance().navigator)
                ? t.serviceWorker.controller
                  ? 2
                  : 3
                : 1,
            visibility_state: Gt(),
            effective_connection_type: (function () {
              var t = qt.getInstance().navigator.connection;
              switch (t && t.effectiveType) {
                case 'slow-2g':
                  return 1;
                case '2g':
                  return 2;
                case '3g':
                  return 3;
                case '4g':
                  return 4;
                default:
                  return 0;
              }
            })()
          },
          application_process_state: 0
        };
      }
      var we = ['_fp', '_fcp', '_fid'];
      var Ee =
        ((Te.prototype.start = function () {
          if (1 !== this.state)
            throw jt.create('trace started', { traceName: this.name });
          this.api.mark(this.traceStartMark), (this.state = 2);
        }),
        (Te.prototype.stop = function () {
          if (2 !== this.state)
            throw jt.create('trace stopped', { traceName: this.name });
          (this.state = 3),
            this.api.mark(this.traceStopMark),
            this.api.measure(
              this.traceMeasure,
              this.traceStartMark,
              this.traceStopMark
            ),
            this.calculateTraceMetrics(),
            ve(this);
        }),
        (Te.prototype.record = function (t, e, n) {
          if (t <= 0)
            throw jt.create('nonpositive trace startTime', {
              traceName: this.name
            });
          if (e <= 0)
            throw jt.create('nonpositive trace duration', {
              traceName: this.name
            });
          if (
            ((this.durationUs = Math.floor(1e3 * e)),
            (this.startTimeUs = Math.floor(1e3 * t)),
            n && n.attributes && (this.customAttributes = a({}, n.attributes)),
            n && n.metrics)
          )
            for (var r = 0, i = Object.keys(n.metrics); r < i.length; r++) {
              var o = i[r];
              isNaN(Number(n.metrics[o])) ||
                (this.counters[o] = Number(Math.floor(n.metrics[o])));
            }
          ve(this);
        }),
        (Te.prototype.incrementMetric = function (t, e) {
          void 0 === e && (e = 1),
            void 0 === this.counters[t]
              ? this.putMetric(t, e)
              : this.putMetric(t, this.counters[t] + e);
        }),
        (Te.prototype.putMetric = function (t, e) {
          if (
            ((n = t),
            (r = this.name),
            0 === n.length ||
              100 < n.length ||
              (!(r && r.startsWith('_wt_') && -1 < we.indexOf(n)) &&
                n.startsWith('_')))
          )
            throw jt.create('invalid custom metric name', {
              customMetricName: t
            });
          var n, r;
          this.counters[t] =
            ((t = e),
            (e = Math.floor(t)) < t &&
              Bt.info(
                'Metric value should be an Integer, setting the value as : ' +
                  e +
                  '.'
              ),
            e);
        }),
        (Te.prototype.getMetric = function (t) {
          return this.counters[t] || 0;
        }),
        (Te.prototype.putAttribute = function (t, e) {
          var n,
            r,
            i =
              !(0 === (n = t).length || 40 < n.length) &&
              !$t.some(function (t) {
                return n.startsWith(t);
              }) &&
              !!n.match(zt),
            r = 0 !== (r = e).length && r.length <= 100;
          if (i && r) this.customAttributes[t] = e;
          else {
            if (!i)
              throw jt.create('invalid attribute name', { attributeName: t });
            if (!r)
              throw jt.create('invalid attribute value', { attributeValue: e });
          }
        }),
        (Te.prototype.getAttribute = function (t) {
          return this.customAttributes[t];
        }),
        (Te.prototype.removeAttribute = function (t) {
          void 0 !== this.customAttributes[t] &&
            delete this.customAttributes[t];
        }),
        (Te.prototype.getAttributes = function () {
          return a({}, this.customAttributes);
        }),
        (Te.prototype.setStartTime = function (t) {
          this.startTimeUs = t;
        }),
        (Te.prototype.setDuration = function (t) {
          this.durationUs = t;
        }),
        (Te.prototype.calculateTraceMetrics = function () {
          var t = this.api.getEntriesByName(this.traceMeasure),
            t = t && t[0];
          t &&
            ((this.durationUs = Math.floor(1e3 * t.duration)),
            (this.startTimeUs = Math.floor(
              1e3 * (t.startTime + this.api.getTimeOrigin())
            )));
        }),
        (Te.createOobTrace = function (t, e, n, r) {
          var i = qt.getInstance().getUrl();
          i &&
            ((t = new Te(t, '_wt_' + i, !0)),
            (i = Math.floor(1e3 * qt.getInstance().getTimeOrigin())),
            t.setStartTime(i),
            e &&
              e[0] &&
              (t.setDuration(Math.floor(1e3 * e[0].duration)),
              t.putMetric(
                'domInteractive',
                Math.floor(1e3 * e[0].domInteractive)
              ),
              t.putMetric(
                'domContentLoadedEventEnd',
                Math.floor(1e3 * e[0].domContentLoadedEventEnd)
              ),
              t.putMetric('loadEventEnd', Math.floor(1e3 * e[0].loadEventEnd))),
            n &&
              ((e = n.find(function (t) {
                return 'first-paint' === t.name;
              })) &&
                e.startTime &&
                t.putMetric('_fp', Math.floor(1e3 * e.startTime)),
              (n = n.find(function (t) {
                return 'first-contentful-paint' === t.name;
              })) &&
                n.startTime &&
                t.putMetric('_fcp', Math.floor(1e3 * n.startTime)),
              r && t.putMetric('_fid', Math.floor(1e3 * r))),
            ve(t));
        }),
        (Te.createUserTimingTrace = function (t, e) {
          ve(new Te(t, e, !1, e));
        }),
        Te);
      function Te(t, e, n, r) {
        void 0 === n && (n = !1),
          (this.performanceController = t),
          (this.name = e),
          (this.isAuto = n),
          (this.state = 1),
          (this.customAttributes = {}),
          (this.counters = {}),
          (this.api = qt.getInstance()),
          (this.randomId = Math.floor(1e6 * Math.random())),
          this.isAuto ||
            ((this.traceStartMark =
              'FB-PERF-TRACE-START-' + this.randomId + '-' + this.name),
            (this.traceStopMark =
              'FB-PERF-TRACE-STOP-' + this.randomId + '-' + this.name),
            (this.traceMeasure =
              r || xt + '-' + this.randomId + '-' + this.name),
            r && this.calculateTraceMetrics());
      }
      function Ie(t, e) {
        var n,
          r,
          i,
          o = e;
        o &&
          void 0 !== o.responseStart &&
          ((r = qt.getInstance().getTimeOrigin()),
          (i = Math.floor(1e3 * (o.startTime + r))),
          (e = o.responseStart
            ? Math.floor(1e3 * (o.responseStart - o.startTime))
            : void 0),
          (r = Math.floor(1e3 * (o.responseEnd - o.startTime))),
          (o = {
            performanceController: t,
            url: o.name && o.name.split('?')[0],
            responsePayloadBytes: o.transferSize,
            startTimeUs: i,
            timeToResponseInitiatedUs: e,
            timeToResponseCompletedUs: r
          }),
          (n = o),
          (i = Kt.getInstance()).instrumentationEnabled &&
            ((e = n.url),
            (r = i.logEndPointUrl.split('?')[0]),
            (o = i.flTransportEndpointUrl.split('?')[0]),
            e !== r &&
              e !== o &&
              i.loggingEnabled &&
              i.logNetworkAfterSampling &&
              setTimeout(function () {
                return me(n, 0);
              }, 0)));
      }
      var Se = 5e3;
      function ke(t) {
        Lt &&
          (setTimeout(function () {
            return (function (e) {
              var t = qt.getInstance(),
                n = t.getEntriesByType('navigation'),
                r = t.getEntriesByType('paint');
              {
                var i;
                t.onFirstInputDelay
                  ? ((i = setTimeout(function () {
                      Ee.createOobTrace(e, n, r), (i = void 0);
                    }, Se)),
                    t.onFirstInputDelay(function (t) {
                      i && (clearTimeout(i), Ee.createOobTrace(e, n, r, t));
                    }))
                  : Ee.createOobTrace(e, n, r);
              }
            })(t);
          }, 0),
          setTimeout(function () {
            return (function (e) {
              for (
                var t = qt.getInstance(),
                  n = t.getEntriesByType('resource'),
                  r = 0,
                  i = n;
                r < i.length;
                r++
              ) {
                var o = i[r];
                Ie(e, o);
              }
              t.setupObserver('resource', function (t) {
                return Ie(e, t);
              });
            })(t);
          }, 0),
          setTimeout(function () {
            return (function (e) {
              for (
                var t = qt.getInstance(),
                  n = t.getEntriesByType('measure'),
                  r = 0,
                  i = n;
                r < i.length;
                r++
              ) {
                var o = i[r];
                Ne(e, o);
              }
              t.setupObserver('measure', function (t) {
                return Ne(e, t);
              });
            })(t);
          }, 0));
      }
      function Ne(t, e) {
        e = e.name;
        e.substring(0, xt.length) !== xt && Ee.createUserTimingTrace(t, e);
      }
      var Oe =
        ((Ae.prototype._init = function (t) {
          var e = this;
          this.initialized ||
            (void 0 !== (null == t ? void 0 : t.dataCollectionEnabled) &&
              (this.dataCollectionEnabled = t.dataCollectionEnabled),
            void 0 !== (null == t ? void 0 : t.instrumentationEnabled) &&
              (this.instrumentationEnabled = t.instrumentationEnabled),
            qt.getInstance().requiredApisAvailable()
              ? new Promise(function (t, e) {
                  try {
                    var n = !0,
                      r =
                        'validate-browser-context-for-indexeddb-analytics-module',
                      i = window.indexedDB.open(r);
                    (i.onsuccess = function () {
                      i.result.close(),
                        n || window.indexedDB.deleteDatabase(r),
                        t(!0);
                    }),
                      (i.onupgradeneeded = function () {
                        n = !1;
                      }),
                      (i.onerror = function () {
                        var t;
                        e(
                          (null === (t = i.error) || void 0 === t
                            ? void 0
                            : t.message) || ''
                        );
                      });
                  } catch (t) {
                    e(t);
                  }
                })
                  .then(function (t) {
                    t &&
                      (he || (de(5500), (he = !0)),
                      oe(e).then(
                        function () {
                          return ke(e);
                        },
                        function () {
                          return ke(e);
                        }
                      ),
                      (e.initialized = !0));
                  })
                  .catch(function (t) {
                    Bt.info("Environment doesn't support IndexedDB: " + t);
                  })
              : Bt.info(
                  'Firebase Performance cannot start if the browser does not support "Fetch" and "Promise", or cookies are disabled.'
                ));
        }),
        Object.defineProperty(Ae.prototype, 'instrumentationEnabled', {
          get: function () {
            return Kt.getInstance().instrumentationEnabled;
          },
          set: function (t) {
            Kt.getInstance().instrumentationEnabled = t;
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(Ae.prototype, 'dataCollectionEnabled', {
          get: function () {
            return Kt.getInstance().dataCollectionEnabled;
          },
          set: function (t) {
            Kt.getInstance().dataCollectionEnabled = t;
          },
          enumerable: !1,
          configurable: !0
        }),
        Ae);
      function Ae(t, e) {
        (this.app = t), (this.installations = e), (this.initialized = !1);
      }
      function Pe(t) {
        var e = t.getProvider('app-exp').getImmediate(),
          t = t.getProvider('installations-exp-internal').getImmediate();
        if ('[DEFAULT]' !== e.name) throw jt.create('FB not default');
        if ('undefined' == typeof window) throw jt.create('no window');
        return (Pt = window), new Oe(e, t);
      }
      Re._registerComponent(new S('performance-exp', Pe, 'PUBLIC')),
        Re.registerVersion('@firebase/performance-exp', Ct),
        (Ce.getPerformance = function (t, e) {
          return (
            (t = Re._getProvider(t, 'performance-exp').getImmediate())._init(e),
            t
          );
        }),
        (Ce.trace = function (t, e) {
          return new Ee(t, e);
        }),
        Object.defineProperty(Ce, '__esModule', { value: !0 });
    }.apply(this, arguments));
  } catch (t) {
    throw (
      (console.error(t),
      new Error(
        'Cannot instantiate firebase-performance.js - be sure to load firebase-app.js first.'
      ))
    );
  }
});
//# sourceMappingURL=firebase-performance.js.map
