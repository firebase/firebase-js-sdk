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
    ? e(exports)
    : 'function' == typeof define && define.amd
    ? define(['exports'], e)
    : e(
        (((t =
          'undefined' != typeof globalThis ? globalThis : t || self).firebase =
          t.firebase || {}),
        (t.firebase.firestore = t.firebase.firestore || {}))
      );
})(this, function (Vg) {
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
            for (var n in e) e.hasOwnProperty(n) && (t[n] = e[n]);
          })(t, e);
      };
      function t(t, e) {
        function n() {
          this.constructor = t;
        }
        r(t, e),
          (t.prototype =
            null === e
              ? Object.create(e)
              : ((n.prototype = e.prototype), new n()));
      }
      var o = function () {
        return (o =
          Object.assign ||
          function (t) {
            for (var e, n = 1, r = arguments.length; n < r; n++)
              for (var i in (e = arguments[n]))
                Object.prototype.hasOwnProperty.call(e, i) && (t[i] = e[i]);
            return t;
          }).apply(this, arguments);
      };
      function y(t, s, u, a) {
        return new (u = u || Promise)(function (n, e) {
          function r(t) {
            try {
              o(a.next(t));
            } catch (t) {
              e(t);
            }
          }
          function i(t) {
            try {
              o(a.throw(t));
            } catch (t) {
              e(t);
            }
          }
          function o(t) {
            var e;
            t.done
              ? n(t.value)
              : ((e = t.value) instanceof u
                  ? e
                  : new u(function (t) {
                      t(e);
                    })
                ).then(r, i);
          }
          o((a = a.apply(t, s || [])).next());
        });
      }
      function v(n, r) {
        var i,
          o,
          s,
          u = {
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
              for (; u; )
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
                      return u.label++, { value: e[1], done: !1 };
                    case 5:
                      u.label++, (o = e[1]), (e = [0]);
                      continue;
                    case 7:
                      (e = u.ops.pop()), u.trys.pop();
                      continue;
                    default:
                      if (
                        !(s = 0 < (s = u.trys).length && s[s.length - 1]) &&
                        (6 === e[0] || 2 === e[0])
                      ) {
                        u = 0;
                        continue;
                      }
                      if (3 === e[0] && (!s || (e[1] > s[0] && e[1] < s[3]))) {
                        u.label = e[1];
                        break;
                      }
                      if (6 === e[0] && u.label < s[1]) {
                        (u.label = s[1]), (s = e);
                        break;
                      }
                      if (s && u.label < s[2]) {
                        (u.label = s[2]), u.ops.push(e);
                        break;
                      }
                      s[2] && u.ops.pop(), u.trys.pop();
                      continue;
                  }
                  e = r.call(n, u);
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
      function p(t) {
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
      function h(t, e) {
        var n = 'function' == typeof Symbol && t[Symbol.iterator];
        if (!n) return t;
        var r,
          i,
          o = n.call(t),
          s = [];
        try {
          for (; (void 0 === e || 0 < e--) && !(r = o.next()).done; )
            s.push(r.value);
        } catch (t) {
          i = { error: t };
        } finally {
          try {
            r && !r.done && (n = o.return) && n.call(o);
          } finally {
            if (i) throw i.error;
          }
        }
        return s;
      }
      function s() {
        for (var t = 0, e = 0, n = arguments.length; e < n; e++)
          t += arguments[e].length;
        for (var r = Array(t), i = 0, e = 0; e < n; e++)
          for (var o = arguments[e], s = 0, u = o.length; s < u; s++, i++)
            r[i] = o[s];
        return r;
      }
      function d(t, e) {
        if (!(e instanceof Object)) return e;
        switch (e.constructor) {
          case Date:
            return new Date(e.getTime());
          case Object:
            void 0 === t && (t = {});
            break;
          case Array:
            t = [];
            break;
          default:
            return e;
        }
        for (var n in e)
          e.hasOwnProperty(n) && '__proto__' !== n && (t[n] = d(t[n], e[n]));
        return t;
      }
      var i =
        ((e.prototype.wrapCallback = function (n) {
          var r = this;
          return function (t, e) {
            t ? r.reject(t) : r.resolve(e),
              'function' == typeof n &&
                (r.promise.catch(function () {}),
                1 === n.length ? n(t) : n(t, e));
          };
        }),
        e);
      function e() {
        var n = this;
        (this.reject = function () {}),
          (this.resolve = function () {}),
          (this.promise = new Promise(function (t, e) {
            (n.resolve = t), (n.reject = e);
          }));
      }
      function f() {
        return 'undefined' != typeof navigator &&
          'string' == typeof navigator.userAgent
          ? navigator.userAgent
          : '';
      }
      var u,
        a = 'FirebaseError',
        c = (t(l, (u = Error)), l);
      function l(t, e, n) {
        e = u.call(this, e) || this;
        return (
          (e.code = t),
          (e.customData = n),
          (e.name = a),
          Object.setPrototypeOf(e, l.prototype),
          Error.captureStackTrace &&
            Error.captureStackTrace(e, g.prototype.create),
          e
        );
      }
      var g =
        ((n.prototype.create = function (t) {
          for (var e = [], n = 1; n < arguments.length; n++)
            e[n - 1] = arguments[n];
          var r,
            i = e[0] || {},
            o = this.service + '/' + t,
            t = this.errors[t],
            t = t
              ? ((r = i),
                t.replace(m, function (t, e) {
                  var n = r[e];
                  return null != n ? String(n) : '<' + e + '?>';
                }))
              : 'Error',
            t = this.serviceName + ': ' + t + ' (' + o + ').';
          return new c(o, t, i);
        }),
        n);
      function n(t, e, n) {
        (this.service = t), (this.serviceName = e), (this.errors = n);
      }
      var m = /\{\$([^}]+)}/g;
      function b(t, e) {
        return Object.prototype.hasOwnProperty.call(t, e);
      }
      function w(t, e) {
        e = new I(t, e);
        return e.subscribe.bind(e);
      }
      var I =
        ((E.prototype.next = function (e) {
          this.forEachObserver(function (t) {
            t.next(e);
          });
        }),
        (E.prototype.error = function (e) {
          this.forEachObserver(function (t) {
            t.error(e);
          }),
            this.close(e);
        }),
        (E.prototype.complete = function () {
          this.forEachObserver(function (t) {
            t.complete();
          }),
            this.close();
        }),
        (E.prototype.subscribe = function (t, e, n) {
          var r,
            i = this;
          if (void 0 === t && void 0 === e && void 0 === n)
            throw new Error('Missing Observer.');
          void 0 ===
            (r = (function (t, e) {
              if ('object' != typeof t || null === t) return !1;
              for (var n = 0, r = e; n < r.length; n++) {
                var i = r[n];
                if (i in t && 'function' == typeof t[i]) return !0;
              }
              return !1;
            })(t, ['next', 'error', 'complete'])
              ? t
              : { next: t, error: e, complete: n }).next && (r.next = _),
            void 0 === r.error && (r.error = _),
            void 0 === r.complete && (r.complete = _);
          n = this.unsubscribeOne.bind(this, this.observers.length);
          return (
            this.finalized &&
              this.task.then(function () {
                try {
                  i.finalError ? r.error(i.finalError) : r.complete();
                } catch (t) {}
              }),
            this.observers.push(r),
            n
          );
        }),
        (E.prototype.unsubscribeOne = function (t) {
          void 0 !== this.observers &&
            void 0 !== this.observers[t] &&
            (delete this.observers[t],
            --this.observerCount,
            0 === this.observerCount &&
              void 0 !== this.onNoObservers &&
              this.onNoObservers(this));
        }),
        (E.prototype.forEachObserver = function (t) {
          if (!this.finalized)
            for (var e = 0; e < this.observers.length; e++) this.sendOne(e, t);
        }),
        (E.prototype.sendOne = function (t, e) {
          var n = this;
          this.task.then(function () {
            if (void 0 !== n.observers && void 0 !== n.observers[t])
              try {
                e(n.observers[t]);
              } catch (t) {
                'undefined' != typeof console &&
                  console.error &&
                  console.error(t);
              }
          });
        }),
        (E.prototype.close = function (t) {
          var e = this;
          this.finalized ||
            ((this.finalized = !0),
            void 0 !== t && (this.finalError = t),
            this.task.then(function () {
              (e.observers = void 0), (e.onNoObservers = void 0);
            }));
        }),
        E);
      function E(t, e) {
        var n = this;
        (this.observers = []),
          (this.unsubscribes = []),
          (this.observerCount = 0),
          (this.task = Promise.resolve()),
          (this.finalized = !1),
          (this.onNoObservers = e),
          this.task
            .then(function () {
              t(n);
            })
            .catch(function (t) {
              n.error(t);
            });
      }
      function _() {}
      var T =
        ((N.prototype.setInstantiationMode = function (t) {
          return (this.instantiationMode = t), this;
        }),
        (N.prototype.setMultipleInstances = function (t) {
          return (this.multipleInstances = t), this;
        }),
        (N.prototype.setServiceProps = function (t) {
          return (this.serviceProps = t), this;
        }),
        N);
      function N(t, e, n) {
        (this.name = t),
          (this.instanceFactory = e),
          (this.type = n),
          (this.multipleInstances = !1),
          (this.serviceProps = {}),
          (this.instantiationMode = 'LAZY');
      }
      var A = '[DEFAULT]',
        S =
          ((x.prototype.get = function (t) {
            void 0 === t && (t = A);
            var e = this.normalizeInstanceIdentifier(t);
            if (!this.instancesDeferred.has(e)) {
              var n = new i();
              this.instancesDeferred.set(e, n);
              try {
                var r = this.getOrInitializeService(e);
                r && n.resolve(r);
              } catch (t) {}
            }
            return this.instancesDeferred.get(e).promise;
          }),
          (x.prototype.getImmediate = function (t) {
            var e = o({ identifier: A, optional: !1 }, t),
              t = e.identifier,
              n = e.optional,
              r = this.normalizeInstanceIdentifier(t);
            try {
              var i = this.getOrInitializeService(r);
              if (i) return i;
              if (n) return null;
              throw Error('Service ' + this.name + ' is not available');
            } catch (t) {
              if (n) return null;
              throw t;
            }
          }),
          (x.prototype.getComponent = function () {
            return this.component;
          }),
          (x.prototype.setComponent = function (t) {
            var e, n;
            if (t.name !== this.name)
              throw Error(
                'Mismatching Component ' +
                  t.name +
                  ' for Provider ' +
                  this.name +
                  '.'
              );
            if (this.component)
              throw Error(
                'Component for ' + this.name + ' has already been provided'
              );
            if ('EAGER' === (this.component = t).instantiationMode)
              try {
                this.getOrInitializeService(A);
              } catch (t) {}
            try {
              for (
                var r = p(this.instancesDeferred.entries()), i = r.next();
                !i.done;
                i = r.next()
              ) {
                var o = h(i.value, 2),
                  s = o[0],
                  u = o[1],
                  a = this.normalizeInstanceIdentifier(s);
                try {
                  var c = this.getOrInitializeService(a);
                  u.resolve(c);
                } catch (t) {}
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
          }),
          (x.prototype.clearInstance = function (t) {
            void 0 === t && (t = A),
              this.instancesDeferred.delete(t),
              this.instances.delete(t);
          }),
          (x.prototype.delete = function () {
            return y(this, void 0, void 0, function () {
              var e;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      (e = Array.from(this.instances.values())),
                      [
                        4,
                        Promise.all(
                          (function () {
                            for (var t = [], e = 0; e < arguments.length; e++)
                              t = t.concat(h(arguments[e]));
                            return t;
                          })(
                            e
                              .filter(function (t) {
                                return 'INTERNAL' in t;
                              })
                              .map(function (t) {
                                return t.INTERNAL.delete();
                              }),
                            e
                              .filter(function (t) {
                                return '_delete' in t;
                              })
                              .map(function (t) {
                                return t._delete();
                              })
                          )
                        )
                      ]
                    );
                  case 1:
                    return t.sent(), [2];
                }
              });
            });
          }),
          (x.prototype.isComponentSet = function () {
            return null != this.component;
          }),
          (x.prototype.getOrInitializeService = function (t) {
            var e,
              n = this.instances.get(t);
            return (
              !n &&
                this.component &&
                ((n = this.component.instanceFactory(
                  this.container,
                  (e = t) === A ? void 0 : e
                )),
                this.instances.set(t, n)),
              n || null
            );
          }),
          (x.prototype.normalizeInstanceIdentifier = function (t) {
            return !this.component || this.component.multipleInstances ? t : A;
          }),
          x);
      function x(t, e) {
        (this.name = t),
          (this.container = e),
          (this.component = null),
          (this.instances = new Map()),
          (this.instancesDeferred = new Map());
      }
      var D =
        ((O.prototype.addComponent = function (t) {
          var e = this.getProvider(t.name);
          if (e.isComponentSet())
            throw new Error(
              'Component ' +
                t.name +
                ' has already been registered with ' +
                this.name
            );
          e.setComponent(t);
        }),
        (O.prototype.addOrOverwriteComponent = function (t) {
          this.getProvider(t.name).isComponentSet() &&
            this.providers.delete(t.name),
            this.addComponent(t);
        }),
        (O.prototype.getProvider = function (t) {
          if (this.providers.has(t)) return this.providers.get(t);
          var e = new S(t, this);
          return this.providers.set(t, e), e;
        }),
        (O.prototype.getProviders = function () {
          return Array.from(this.providers.values());
        }),
        O);
      function O(t) {
        (this.name = t), (this.providers = new Map());
      }
      function k() {
        for (var t = 0, e = 0, n = arguments.length; e < n; e++)
          t += arguments[e].length;
        for (var r = Array(t), i = 0, e = 0; e < n; e++)
          for (var o = arguments[e], s = 0, u = o.length; s < u; s++, i++)
            r[i] = o[s];
        return r;
      }
      var C,
        P = [];
      ((q = C = C || {})[(q.DEBUG = 0)] = 'DEBUG'),
        (q[(q.VERBOSE = 1)] = 'VERBOSE'),
        (q[(q.INFO = 2)] = 'INFO'),
        (q[(q.WARN = 3)] = 'WARN'),
        (q[(q.ERROR = 4)] = 'ERROR'),
        (q[(q.SILENT = 5)] = 'SILENT');
      function L(t, e) {
        for (var n = [], r = 2; r < arguments.length; r++)
          n[r - 2] = arguments[r];
        if (!(e < t.logLevel)) {
          var i = new Date().toISOString(),
            o = M[e];
          if (!o)
            throw new Error(
              'Attempted to log a message with an invalid logType (value: ' +
                e +
                ')'
            );
          console[o].apply(console, k(['[' + i + ']  ' + t.name + ':'], n));
        }
      }
      var R = {
          debug: C.DEBUG,
          verbose: C.VERBOSE,
          info: C.INFO,
          warn: C.WARN,
          error: C.ERROR,
          silent: C.SILENT
        },
        V = C.INFO,
        M =
          (((st = {})[C.DEBUG] = 'log'),
          (st[C.VERBOSE] = 'log'),
          (st[C.INFO] = 'info'),
          (st[C.WARN] = 'warn'),
          (st[C.ERROR] = 'error'),
          st),
        U =
          (Object.defineProperty(j.prototype, 'logLevel', {
            get: function () {
              return this._logLevel;
            },
            set: function (t) {
              if (!(t in C))
                throw new TypeError(
                  'Invalid value "' + t + '" assigned to `logLevel`'
                );
              this._logLevel = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          (j.prototype.setLogLevel = function (t) {
            this._logLevel = 'string' == typeof t ? R[t] : t;
          }),
          Object.defineProperty(j.prototype, 'logHandler', {
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
          Object.defineProperty(j.prototype, 'userLogHandler', {
            get: function () {
              return this._userLogHandler;
            },
            set: function (t) {
              this._userLogHandler = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          (j.prototype.debug = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, k([this, C.DEBUG], t)),
              this._logHandler.apply(this, k([this, C.DEBUG], t));
          }),
          (j.prototype.log = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, k([this, C.VERBOSE], t)),
              this._logHandler.apply(this, k([this, C.VERBOSE], t));
          }),
          (j.prototype.info = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, k([this, C.INFO], t)),
              this._logHandler.apply(this, k([this, C.INFO], t));
          }),
          (j.prototype.warn = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, k([this, C.WARN], t)),
              this._logHandler.apply(this, k([this, C.WARN], t));
          }),
          (j.prototype.error = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            this._userLogHandler &&
              this._userLogHandler.apply(this, k([this, C.ERROR], t)),
              this._logHandler.apply(this, k([this, C.ERROR], t));
          }),
          j);
      function j(t) {
        (this.name = t),
          (this._logLevel = V),
          (this._logHandler = L),
          (this._userLogHandler = null),
          P.push(this);
      }
      function F(e) {
        P.forEach(function (t) {
          t.setLogLevel(e);
        });
      }
      var q =
          ((($ = {})['no-app'] =
            "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
          ($['bad-app-name'] = "Illegal App name: '{$appName}"),
          ($['duplicate-app'] =
            "Firebase App named '{$appName}' already exists"),
          ($['app-deleted'] =
            "Firebase App named '{$appName}' already deleted"),
          ($['invalid-app-argument'] =
            'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
          ($['invalid-log-argument'] =
            'First argument to `onLog` must be null or a function.'),
          $),
        z = new g('app', 'Firebase', q),
        H = '@firebase/app',
        B = '[DEFAULT]',
        G =
          (((st = {})[H] = 'fire-core'),
          (st['@firebase/analytics'] = 'fire-analytics'),
          (st['@firebase/auth'] = 'fire-auth'),
          (st['@firebase/database'] = 'fire-rtdb'),
          (st['@firebase/functions'] = 'fire-fn'),
          (st['@firebase/installations'] = 'fire-iid'),
          (st['@firebase/messaging'] = 'fire-fcm'),
          (st['@firebase/performance'] = 'fire-perf'),
          (st['@firebase/remote-config'] = 'fire-rc'),
          (st['@firebase/storage'] = 'fire-gcs'),
          (st['@firebase/firestore'] = 'fire-fst'),
          (st['fire-js'] = 'fire-js'),
          (st['firebase-wrapper'] = 'fire-js-all'),
          st),
        K = new U('@firebase/app'),
        J =
          (Object.defineProperty(
            W.prototype,
            'automaticDataCollectionEnabled',
            {
              get: function () {
                return (
                  this.checkDestroyed_(), this.automaticDataCollectionEnabled_
                );
              },
              set: function (t) {
                this.checkDestroyed_(),
                  (this.automaticDataCollectionEnabled_ = t);
              },
              enumerable: !1,
              configurable: !0
            }
          ),
          Object.defineProperty(W.prototype, 'name', {
            get: function () {
              return this.checkDestroyed_(), this.name_;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(W.prototype, 'options', {
            get: function () {
              return this.checkDestroyed_(), this.options_;
            },
            enumerable: !1,
            configurable: !0
          }),
          (W.prototype.delete = function () {
            var e = this;
            return new Promise(function (t) {
              e.checkDestroyed_(), t();
            })
              .then(function () {
                return (
                  e.firebase_.INTERNAL.removeApp(e.name_),
                  Promise.all(
                    e.container.getProviders().map(function (t) {
                      return t.delete();
                    })
                  )
                );
              })
              .then(function () {
                e.isDeleted_ = !0;
              });
          }),
          (W.prototype._getService = function (t, e) {
            return (
              void 0 === e && (e = B),
              this.checkDestroyed_(),
              this.container.getProvider(t).getImmediate({ identifier: e })
            );
          }),
          (W.prototype._removeServiceInstance = function (t, e) {
            void 0 === e && (e = B),
              this.container.getProvider(t).clearInstance(e);
          }),
          (W.prototype._addComponent = function (e) {
            try {
              this.container.addComponent(e);
            } catch (t) {
              K.debug(
                'Component ' +
                  e.name +
                  ' failed to register with FirebaseApp ' +
                  this.name,
                t
              );
            }
          }),
          (W.prototype._addOrOverwriteComponent = function (t) {
            this.container.addOrOverwriteComponent(t);
          }),
          (W.prototype.checkDestroyed_ = function () {
            if (this.isDeleted_)
              throw z.create('app-deleted', { appName: this.name_ });
          }),
          W);
      function W(t, e, n) {
        var r,
          i,
          o = this;
        (this.firebase_ = n),
          (this.isDeleted_ = !1),
          (this.name_ = e.name),
          (this.automaticDataCollectionEnabled_ =
            e.automaticDataCollectionEnabled || !1),
          (this.options_ = d(void 0, t)),
          (this.container = new D(e.name)),
          this._addComponent(
            new T(
              'app',
              function () {
                return o;
              },
              'PUBLIC'
            )
          );
        try {
          for (
            var s = p(this.firebase_.INTERNAL.components.values()),
              u = s.next();
            !u.done;
            u = s.next()
          ) {
            var a = u.value;
            this._addComponent(a);
          }
        } catch (t) {
          r = { error: t };
        } finally {
          try {
            u && !u.done && (i = s.return) && i.call(s);
          } finally {
            if (r) throw r.error;
          }
        }
      }
      (J.prototype.name && J.prototype.options) ||
        J.prototype.delete ||
        console.log('dc');
      var X = '8.2.1';
      function Y(a) {
        var c = {},
          h = new Map(),
          f = {
            __esModule: !0,
            initializeApp: function (t, e) {
              void 0 === e && (e = {});
              {
                ('object' == typeof e && null !== e) || (e = { name: e });
              }
              var n = e;
              void 0 === n.name && (n.name = B);
              e = n.name;
              if ('string' != typeof e || !e)
                throw z.create('bad-app-name', { appName: String(e) });
              if (b(c, e)) throw z.create('duplicate-app', { appName: e });
              n = new a(t, n, f);
              return (c[e] = n);
            },
            app: l,
            registerVersion: function (t, e, n) {
              var r = null !== (i = G[t]) && void 0 !== i ? i : t;
              n && (r += '-' + n);
              var i = r.match(/\s|\//),
                t = e.match(/\s|\//);
              if (i || t) {
                n = [
                  'Unable to register library "' +
                    r +
                    '" with version "' +
                    e +
                    '":'
                ];
                return (
                  i &&
                    n.push(
                      'library name "' +
                        r +
                        '" contains illegal characters (whitespace or "/")'
                    ),
                  i && t && n.push('and'),
                  t &&
                    n.push(
                      'version name "' +
                        e +
                        '" contains illegal characters (whitespace or "/")'
                    ),
                  void K.warn(n.join(' '))
                );
              }
              o(
                new T(
                  r + '-version',
                  function () {
                    return { library: r, version: e };
                  },
                  'VERSION'
                )
              );
            },
            setLogLevel: F,
            onLog: function (t, e) {
              if (null !== t && 'function' != typeof t)
                throw z.create('invalid-log-argument', { appName: name });
              !(function (s, e) {
                for (var t = 0, n = P; t < n.length; t++) {
                  !(function (t) {
                    var o = null;
                    e && e.level && (o = R[e.level]),
                      (t.userLogHandler =
                        null === s
                          ? null
                          : function (t, e) {
                              for (var n = [], r = 2; r < arguments.length; r++)
                                n[r - 2] = arguments[r];
                              var i = n
                                .map(function (t) {
                                  if (null == t) return null;
                                  if ('string' == typeof t) return t;
                                  if (
                                    'number' == typeof t ||
                                    'boolean' == typeof t
                                  )
                                    return t.toString();
                                  if (t instanceof Error) return t.message;
                                  try {
                                    return JSON.stringify(t);
                                  } catch (t) {
                                    return null;
                                  }
                                })
                                .filter(function (t) {
                                  return t;
                                })
                                .join(' ');
                              e >= (null != o ? o : t.logLevel) &&
                                s({
                                  level: C[e].toLowerCase(),
                                  message: i,
                                  args: n,
                                  type: t.name
                                });
                            });
                  })(n[t]);
                }
              })(t, e);
            },
            apps: null,
            SDK_VERSION: X,
            INTERNAL: {
              registerComponent: o,
              removeApp: function (t) {
                delete c[t];
              },
              components: h,
              useAsService: function (t, e) {
                if ('serverAuth' === e) return null;
                return e;
              }
            }
          };
        function l(t) {
          if (!b(c, (t = t || B))) throw z.create('no-app', { appName: t });
          return c[t];
        }
        function o(n) {
          var e,
            t,
            r,
            i = n.name;
          if (h.has(i))
            return (
              K.debug(
                'There were multiple attempts to register component ' + i + '.'
              ),
              'PUBLIC' === n.type ? f[i] : null
            );
          h.set(i, n),
            'PUBLIC' === n.type &&
              ((r = function (t) {
                if ((void 0 === t && (t = l()), 'function' != typeof t[i]))
                  throw z.create('invalid-app-argument', { appName: i });
                return t[i]();
              }),
              void 0 !== n.serviceProps && d(r, n.serviceProps),
              (f[i] = r),
              (a.prototype[i] = function () {
                for (var t = [], e = 0; e < arguments.length; e++)
                  t[e] = arguments[e];
                return this._getService
                  .bind(this, i)
                  .apply(this, n.multipleInstances ? t : []);
              }));
          try {
            for (
              var o = p(Object.keys(c)), s = o.next();
              !s.done;
              s = o.next()
            ) {
              var u = s.value;
              c[u]._addComponent(n);
            }
          } catch (t) {
            e = { error: t };
          } finally {
            try {
              s && !s.done && (t = o.return) && t.call(o);
            } finally {
              if (e) throw e.error;
            }
          }
          return 'PUBLIC' === n.type ? f[i] : null;
        }
        return (
          (f.default = f),
          Object.defineProperty(f, 'apps', {
            get: function () {
              return Object.keys(c).map(function (t) {
                return c[t];
              });
            }
          }),
          (l.App = a),
          f
        );
      }
      var $ = (function t() {
          var e = Y(J);
          return (
            (e.INTERNAL = o(o({}, e.INTERNAL), {
              createFirebaseNamespace: t,
              extendNamespace: function (t) {
                d(e, t);
              },
              createSubscribe: w,
              ErrorFactory: g,
              deepExtend: d
            })),
            e
          );
        })(),
        Q =
          ((Z.prototype.getPlatformInfoString = function () {
            return this.container
              .getProviders()
              .map(function (t) {
                if (
                  (function (t) {
                    t = t.getComponent();
                    return 'VERSION' === (null == t ? void 0 : t.type);
                  })(t)
                ) {
                  t = t.getImmediate();
                  return t.library + '/' + t.version;
                }
                return null;
              })
              .filter(function (t) {
                return t;
              })
              .join(' ');
          }),
          Z);
      function Z(t) {
        this.container = t;
      }
      'object' == typeof self &&
        self.self === self &&
        void 0 !== self.firebase &&
        (K.warn(
          '\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  '
        ),
        (nn = self.firebase.SDK_VERSION) &&
          0 <= nn.indexOf('LITE') &&
          K.warn(
            '\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    '
          ));
      var tt = $.initializeApp;
      $.initializeApp = function () {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        return (
          (function () {
            try {
              return (
                '[object process]' ===
                Object.prototype.toString.call(global.process)
              );
            } catch (t) {
              return;
            }
          })() &&
            K.warn(
              '\n      Warning: This is a browser-targeted Firebase bundle but it appears it is being\n      run in a Node environment.  If running in a Node environment, make sure you\n      are using the bundle specified by the "main" field in package.json.\n      \n      If you are using Webpack, you can specify "main" as the first item in\n      "resolve.mainFields":\n      https://webpack.js.org/configuration/resolve/#resolvemainfields\n      \n      If using Rollup, use the @rollup/plugin-node-resolve plugin and specify "main"\n      as the first item in "mainFields", e.g. [\'main\', \'module\'].\n      https://github.com/rollup/@rollup/plugin-node-resolve\n      '
            ),
          tt.apply(void 0, t)
        );
      };
      var et,
        nt,
        rt = $;
      (et = rt).INTERNAL.registerComponent(
        new T(
          'platform-logger',
          function (t) {
            return new Q(t);
          },
          'PRIVATE'
        )
      ),
        et.registerVersion(H, '0.6.13', nt),
        et.registerVersion('fire-js', '');
      var it = function (t, e) {
        return (it =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (t, e) {
              t.__proto__ = e;
            }) ||
          function (t, e) {
            for (var n in e)
              Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
          })(t, e);
      };
      function ot(t) {
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
      var st,
        q =
          'undefined' != typeof globalThis
            ? globalThis
            : 'undefined' != typeof window
            ? window
            : 'undefined' != typeof global
            ? global
            : 'undefined' != typeof self
            ? self
            : {},
        ut = {},
        at = q || self;
      function ct() {}
      function ht(t) {
        var e = typeof t;
        return (
          'array' ==
            (e =
              'object' != e
                ? e
                : t
                ? Array.isArray(t)
                  ? 'array'
                  : e
                : 'null') ||
          ('object' == e && 'number' == typeof t.length)
        );
      }
      function ft(t) {
        var e = typeof t;
        return ('object' == e && null != t) || 'function' == e;
      }
      var lt = 'closure_uid_' + ((1e9 * Math.random()) >>> 0),
        pt = 0;
      function dt(t, e, n) {
        return t.call.apply(t.bind, arguments);
      }
      function yt(e, n, t) {
        if (!e) throw Error();
        if (2 < arguments.length) {
          var r = Array.prototype.slice.call(arguments, 2);
          return function () {
            var t = Array.prototype.slice.call(arguments);
            return Array.prototype.unshift.apply(t, r), e.apply(n, t);
          };
        }
        return function () {
          return e.apply(n, arguments);
        };
      }
      function vt(t, e, n) {
        return (vt =
          Function.prototype.bind &&
          -1 != Function.prototype.bind.toString().indexOf('native code')
            ? dt
            : yt).apply(null, arguments);
      }
      function gt(e) {
        var n = Array.prototype.slice.call(arguments, 1);
        return function () {
          var t = n.slice();
          return t.push.apply(t, arguments), e.apply(this, t);
        };
      }
      function mt() {
        return Date.now();
      }
      function bt(t, o) {
        function e() {}
        (e.prototype = o.prototype),
          (t.X = o.prototype),
          (t.prototype = new e()),
          ((t.prototype.constructor = t).Kb = function (t, e, n) {
            for (
              var r = Array(arguments.length - 2), i = 2;
              i < arguments.length;
              i++
            )
              r[i - 2] = arguments[i];
            return o.prototype[e].apply(t, r);
          });
      }
      function wt() {
        (this.j = this.j), (this.i = this.i);
      }
      (wt.prototype.j = !1),
        (wt.prototype.ja = function () {
          var t;
          !this.j &&
            ((this.j = !0), this.G(), 0) &&
            ((t = this),
            (Object.prototype.hasOwnProperty.call(t, lt) && t[lt]) ||
              (t[lt] = ++pt));
        }),
        (wt.prototype.G = function () {
          if (this.i) for (; this.i.length; ) this.i.shift()();
        });
      var It = Array.prototype.indexOf
          ? function (t, e) {
              return Array.prototype.indexOf.call(t, e, void 0);
            }
          : function (t, e) {
              if ('string' == typeof t)
                return 'string' != typeof e || 1 != e.length
                  ? -1
                  : t.indexOf(e, 0);
              for (var n = 0; n < t.length; n++)
                if (n in t && t[n] === e) return n;
              return -1;
            },
        Et = Array.prototype.forEach
          ? function (t, e, n) {
              Array.prototype.forEach.call(t, e, n);
            }
          : function (t, e, n) {
              for (
                var r = t.length,
                  i = 'string' == typeof t ? t.split('') : t,
                  o = 0;
                o < r;
                o++
              )
                o in i && e.call(n, i[o], o, t);
            };
      function _t() {
        return Array.prototype.concat.apply([], arguments);
      }
      function Tt(t) {
        var e = t.length;
        if (0 < e) {
          for (var n = Array(e), r = 0; r < e; r++) n[r] = t[r];
          return n;
        }
        return [];
      }
      function Nt(t) {
        return /^[\s\xa0]*$/.test(t);
      }
      var At,
        St = String.prototype.trim
          ? function (t) {
              return t.trim();
            }
          : function (t) {
              return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(t)[1];
            };
      function xt(t, e) {
        return -1 != t.indexOf(e);
      }
      function Dt(t, e) {
        return t < e ? -1 : e < t ? 1 : 0;
      }
      t: {
        var Ot = at.navigator;
        if (Ot) {
          Ot = Ot.userAgent;
          if (Ot) {
            At = Ot;
            break t;
          }
        }
        At = '';
      }
      function kt(t, e, n) {
        for (var r in t) e.call(n, t[r], r, t);
      }
      function Ct(t) {
        var e,
          n = {};
        for (e in t) n[e] = t[e];
        return n;
      }
      var Pt =
        'constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf'.split(
          ' '
        );
      function Lt(t) {
        for (var e, n, r = 1; r < arguments.length; r++) {
          for (e in (n = arguments[r])) t[e] = n[e];
          for (var i = 0; i < Pt.length; i++)
            (e = Pt[i]),
              Object.prototype.hasOwnProperty.call(n, e) && (t[e] = n[e]);
        }
      }
      function Rt(t) {
        return Rt[' '](t), t;
      }
      Rt[' '] = ct;
      var Vt,
        Mt = xt(At, 'Opera'),
        Ut = xt(At, 'Trident') || xt(At, 'MSIE'),
        jt = xt(At, 'Edge'),
        Ft = jt || Ut,
        qt =
          xt(At, 'Gecko') &&
          !(xt(At.toLowerCase(), 'webkit') && !xt(At, 'Edge')) &&
          !(xt(At, 'Trident') || xt(At, 'MSIE')) &&
          !xt(At, 'Edge'),
        zt = xt(At.toLowerCase(), 'webkit') && !xt(At, 'Edge');
      function Ht() {
        var t = at.document;
        return t ? t.documentMode : void 0;
      }
      t: {
        var Bt = '',
          Gt =
            ((Gt = At),
            qt
              ? /rv:([^\);]+)(\)|;)/.exec(Gt)
              : jt
              ? /Edge\/([\d\.]+)/.exec(Gt)
              : Ut
              ? /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(Gt)
              : zt
              ? /WebKit\/(\S+)/.exec(Gt)
              : Mt
              ? /(?:Version)[ \/]?(\S+)/.exec(Gt)
              : void 0);
        if ((Gt && (Bt = Gt ? Gt[1] : ''), Ut)) {
          Gt = Ht();
          if (null != Gt && Gt > parseFloat(Bt)) {
            Vt = String(Gt);
            break t;
          }
        }
        Vt = Bt;
      }
      var Kt = {};
      function Jt(u) {
        return (
          (t = u),
          (e = function () {
            for (
              var t = 0,
                e = St(String(Vt)).split('.'),
                n = St(String(u)).split('.'),
                r = Math.max(e.length, n.length),
                i = 0;
              0 == t && i < r;
              i++
            ) {
              var o = e[i] || '',
                s = n[i] || '';
              do {
                if (
                  ((o = /(\d*)(\D*)(.*)/.exec(o) || ['', '', '', '']),
                  (s = /(\d*)(\D*)(.*)/.exec(s) || ['', '', '', '']),
                  0 == o[0].length && 0 == s[0].length)
                )
                  break;
                (t =
                  Dt(
                    0 == o[1].length ? 0 : parseInt(o[1], 10),
                    0 == s[1].length ? 0 : parseInt(s[1], 10)
                  ) ||
                  Dt(0 == o[2].length, 0 == s[2].length) ||
                  Dt(o[2], s[2])),
                  (o = o[3]),
                  (s = s[3]);
              } while (0 == t);
            }
            return 0 <= t;
          }),
          (n = Kt),
          Object.prototype.hasOwnProperty.call(n, t) ? n[t] : (n[t] = e(t))
        );
        var t, e, n;
      }
      var Wt = at.document && Ut ? Ht() || parseInt(Vt, 10) || void 0 : void 0,
        Xt = !Ut || 9 <= Number(Wt),
        Yt = Ut && !Jt('9'),
        $t = (function () {
          if (!at.addEventListener || !Object.defineProperty) return !1;
          var t = !1,
            e = Object.defineProperty({}, 'passive', {
              get: function () {
                t = !0;
              }
            });
          try {
            at.addEventListener('test', ct, e),
              at.removeEventListener('test', ct, e);
          } catch (t) {}
          return t;
        })();
      function Qt(t, e) {
        (this.type = t),
          (this.a = this.target = e),
          (this.defaultPrevented = !1);
      }
      function Zt(t, e) {
        if (
          (Qt.call(this, t ? t.type : ''),
          (this.relatedTarget = this.a = this.target = null),
          (this.button =
            this.screenY =
            this.screenX =
            this.clientY =
            this.clientX =
              0),
          (this.key = ''),
          (this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1),
          (this.pointerId = 0),
          (this.pointerType = ''),
          (this.c = null),
          t)
        ) {
          var n = (this.type = t.type),
            r =
              t.changedTouches && t.changedTouches.length
                ? t.changedTouches[0]
                : null;
          if (
            ((this.target = t.target || t.srcElement),
            (this.a = e),
            (e = t.relatedTarget))
          ) {
            if (qt) {
              t: {
                try {
                  Rt(e.nodeName);
                  var i = !0;
                  break t;
                } catch (t) {}
                i = !1;
              }
              i || (e = null);
            }
          } else
            'mouseover' == n
              ? (e = t.fromElement)
              : 'mouseout' == n && (e = t.toElement);
          (this.relatedTarget = e),
            r
              ? ((this.clientX = void 0 !== r.clientX ? r.clientX : r.pageX),
                (this.clientY = void 0 !== r.clientY ? r.clientY : r.pageY),
                (this.screenX = r.screenX || 0),
                (this.screenY = r.screenY || 0))
              : ((this.clientX = void 0 !== t.clientX ? t.clientX : t.pageX),
                (this.clientY = void 0 !== t.clientY ? t.clientY : t.pageY),
                (this.screenX = t.screenX || 0),
                (this.screenY = t.screenY || 0)),
            (this.button = t.button),
            (this.key = t.key || ''),
            (this.ctrlKey = t.ctrlKey),
            (this.altKey = t.altKey),
            (this.shiftKey = t.shiftKey),
            (this.metaKey = t.metaKey),
            (this.pointerId = t.pointerId || 0),
            (this.pointerType =
              'string' == typeof t.pointerType
                ? t.pointerType
                : te[t.pointerType] || ''),
            (this.c = t).defaultPrevented && this.b();
        }
      }
      (Qt.prototype.b = function () {
        this.defaultPrevented = !0;
      }),
        bt(Zt, Qt);
      var te = { 2: 'touch', 3: 'pen', 4: 'mouse' };
      Zt.prototype.b = function () {
        Zt.X.b.call(this);
        var t = this.c;
        if (t.preventDefault) t.preventDefault();
        else if (((t.returnValue = !1), Yt))
          try {
            (t.ctrlKey || (112 <= t.keyCode && t.keyCode <= 123)) &&
              (t.keyCode = -1);
          } catch (t) {}
      };
      var ee = 'closure_listenable_' + ((1e6 * Math.random()) | 0),
        ne = 0;
      function re(t, e, n, r, i) {
        (this.listener = t),
          (this.proxy = null),
          (this.src = e),
          (this.type = n),
          (this.capture = !!r),
          (this.ca = i),
          (this.key = ++ne),
          (this.Y = this.Z = !1);
      }
      function ie(t) {
        (t.Y = !0),
          (t.listener = null),
          (t.proxy = null),
          (t.src = null),
          (t.ca = null);
      }
      function oe(t) {
        (this.src = t), (this.a = {}), (this.b = 0);
      }
      function se(t, e) {
        var n,
          r,
          i,
          o = e.type;
        o in t.a &&
          ((n = t.a[o]),
          (i = 0 <= (r = It(n, e))) && Array.prototype.splice.call(n, r, 1),
          i && (ie(e), 0 == t.a[o].length && (delete t.a[o], t.b--)));
      }
      function ue(t, e, n, r) {
        for (var i = 0; i < t.length; ++i) {
          var o = t[i];
          if (!o.Y && o.listener == e && o.capture == !!n && o.ca == r)
            return i;
        }
        return -1;
      }
      oe.prototype.add = function (t, e, n, r, i) {
        var o = t.toString();
        (t = this.a[o]) || ((t = this.a[o] = []), this.b++);
        var s = ue(t, e, r, i);
        return (
          -1 < s
            ? ((e = t[s]), n || (e.Z = !1))
            : (((e = new re(e, this.src, o, !!r, i)).Z = n), t.push(e)),
          e
        );
      };
      var ae = 'closure_lm_' + ((1e6 * Math.random()) | 0),
        ce = {};
      function he(t, e, n, r, i) {
        if (r && r.once)
          return (function t(e, n, r, i, o) {
            if (Array.isArray(n)) {
              for (var s = 0; s < n.length; s++) t(e, n[s], r, i, o);
              return null;
            }
            r = me(r);
            return e && e[ee]
              ? e.wa(n, r, ft(i) ? !!i.capture : !!i, o)
              : fe(e, n, r, !0, i, o);
          })(t, e, n, r, i);
        if (Array.isArray(e)) {
          for (var o = 0; o < e.length; o++) he(t, e[o], n, r, i);
          return null;
        }
        return (
          (n = me(n)),
          t && t[ee]
            ? t.va(e, n, ft(r) ? !!r.capture : !!r, i)
            : fe(t, e, n, !1, r, i)
        );
      }
      function fe(t, e, n, r, i, o) {
        if (!e) throw Error('Invalid event type');
        var s = ft(i) ? !!i.capture : !!i;
        if (s && !Xt) return null;
        var u,
          a,
          c = ve(t);
        if ((c || (t[ae] = c = new oe(t)), (n = c.add(e, n, r, s, o)).proxy))
          return n;
        if (
          ((u = ye),
          (r = a =
            Xt
              ? function (t) {
                  return u.call(a.src, a.listener, t);
                }
              : function (t) {
                  if (!(t = u.call(a.src, a.listener, t))) return t;
                }),
          ((n.proxy = r).src = t),
          (r.listener = n),
          t.addEventListener)
        )
          $t || (i = s),
            void 0 === i && (i = !1),
            t.addEventListener(e.toString(), r, i);
        else if (t.attachEvent) t.attachEvent(pe(e.toString()), r);
        else {
          if (!t.addListener || !t.removeListener)
            throw Error('addEventListener and attachEvent are unavailable.');
          t.addListener(r);
        }
        return n;
      }
      function le(t) {
        var e, n, r;
        'number' != typeof t &&
          t &&
          !t.Y &&
          ((e = t.src) && e[ee]
            ? se(e.c, t)
            : ((n = t.type),
              (r = t.proxy),
              e.removeEventListener
                ? e.removeEventListener(n, r, t.capture)
                : e.detachEvent
                ? e.detachEvent(pe(n), r)
                : e.addListener && e.removeListener && e.removeListener(r),
              (n = ve(e))
                ? (se(n, t), 0 == n.b && ((n.src = null), (e[ae] = null)))
                : ie(t)));
      }
      function pe(t) {
        return t in ce ? ce[t] : (ce[t] = 'on' + t);
      }
      function de(t, e) {
        var n = t.listener,
          r = t.ca || t.src;
        return t.Z && le(t), n.call(r, e);
      }
      function ye(t, e) {
        if (t.Y) return !0;
        if (Xt) return de(t, new Zt(e, this));
        if (!e)
          t: {
            e = ['window', 'event'];
            for (var n = at, r = 0; r < e.length; r++)
              if (null == (n = n[e[r]])) {
                e = null;
                break t;
              }
            e = n;
          }
        return de(t, (e = new Zt(e, this)));
      }
      function ve(t) {
        return (t = t[ae]) instanceof oe ? t : null;
      }
      var ge = '__closure_events_fn_' + ((1e9 * Math.random()) >>> 0);
      function me(e) {
        return 'function' == typeof e
          ? e
          : (e[ge] ||
              (e[ge] = function (t) {
                return e.handleEvent(t);
              }),
            e[ge]);
      }
      function be() {
        wt.call(this), (this.c = new oe(this)), ((this.J = this).C = null);
      }
      function we(t, e) {
        var n,
          r = t.C;
        if (r) for (n = []; r; r = r.C) n.push(r);
        if (
          ((t = t.J),
          (r = e.type || e),
          'string' == typeof e
            ? (e = new Qt(e, t))
            : e instanceof Qt
            ? (e.target = e.target || t)
            : ((s = e), Lt((e = new Qt(r, t)), s)),
          (s = !0),
          n)
        )
          for (var i = n.length - 1; 0 <= i; i--)
            var o = (e.a = n[i]), s = Ie(o, r, !0, e) && s;
        if (
          ((s = Ie((o = e.a = t), r, !0, e) && s),
          (s = Ie(o, r, !1, e) && s),
          n)
        )
          for (i = 0; i < n.length; i++)
            s = Ie((o = e.a = n[i]), r, !1, e) && s;
      }
      function Ie(t, e, n, r) {
        if (!(e = t.c.a[String(e)])) return !0;
        e = e.concat();
        for (var i = !0, o = 0; o < e.length; ++o) {
          var s,
            u,
            a = e[o];
          a &&
            !a.Y &&
            a.capture == n &&
            ((s = a.listener),
            (u = a.ca || a.src),
            a.Z && se(t.c, a),
            (i = !1 !== s.call(u, r) && i));
        }
        return i && !r.defaultPrevented;
      }
      bt(be, wt),
        (be.prototype[ee] = !0),
        ((st = be.prototype).addEventListener = function (t, e, n, r) {
          he(this, t, e, n, r);
        }),
        (st.removeEventListener = function (t, e, n, r) {
          !(function t(e, n, r, i, o) {
            if (Array.isArray(n))
              for (var s = 0; s < n.length; s++) t(e, n[s], r, i, o);
            else
              (i = ft(i) ? !!i.capture : !!i),
                (r = me(r)),
                e && e[ee]
                  ? ((e = e.c),
                    (n = String(n).toString()) in e.a &&
                      -1 < (r = ue((s = e.a[n]), r, i, o)) &&
                      (ie(s[r]),
                      Array.prototype.splice.call(s, r, 1),
                      0 == s.length && (delete e.a[n], e.b--)))
                  : (e = e && ve(e)) &&
                    ((n = e.a[n.toString()]),
                    (e = -1),
                    n && (e = ue(n, r, i, o)),
                    (r = -1 < e ? n[e] : null) && le(r));
          })(this, t, e, n, r);
        }),
        (st.G = function () {
          if ((be.X.G.call(this), this.c)) {
            var t,
              e = this.c;
            for (t in e.a) {
              for (var n = e.a[t], r = 0; r < n.length; r++) ie(n[r]);
              delete e.a[t], e.b--;
            }
          }
          this.C = null;
        }),
        (st.va = function (t, e, n, r) {
          return this.c.add(String(t), e, !1, n, r);
        }),
        (st.wa = function (t, e, n, r) {
          return this.c.add(String(t), e, !0, n, r);
        });
      var Ee = at.JSON.stringify;
      function _e() {
        this.b = this.a = null;
      }
      var Te,
        Ne =
          ((Ae.prototype.get = function () {
            var t;
            return (
              0 < this.b
                ? (this.b--, (t = this.a), (this.a = t.next), (t.next = null))
                : (t = this.c()),
              t
            );
          }),
          new Ae(
            function () {
              return new Se();
            },
            function (t) {
              t.reset();
            }
          ));
      function Ae(t, e) {
        (this.c = t), (this.f = e), (this.b = 0), (this.a = null);
      }
      function Se() {
        this.next = this.b = this.a = null;
      }
      function xe(t, e) {
        var n;
        Te ||
          ((n = at.Promise.resolve(void 0)),
          (Te = function () {
            n.then(ke);
          })),
          De || (Te(), (De = !0)),
          Oe.add(t, e);
      }
      (_e.prototype.add = function (t, e) {
        var n = Ne.get();
        n.set(t, e), this.b ? (this.b.next = n) : (this.a = n), (this.b = n);
      }),
        (Se.prototype.set = function (t, e) {
          (this.a = t), (this.b = e), (this.next = null);
        });
      var De = !(Se.prototype.reset = function () {
          this.next = this.b = this.a = null;
        }),
        Oe = new _e();
      function ke() {
        for (
          var t, e;
          (n = e = void 0),
            (n = null),
            (e = Oe).a &&
              ((n = e.a),
              (e.a = e.a.next),
              e.a || (e.b = null),
              (n.next = null)),
            (t = n);

        ) {
          try {
            t.a.call(t.b);
          } catch (t) {
            !(function (t) {
              at.setTimeout(function () {
                throw t;
              }, 0);
            })(t);
          }
          var n = Ne;
          n.f(t), n.b < 100 && (n.b++, (t.next = n.a), (n.a = t));
        }
        De = !1;
      }
      function Ce(t, e) {
        be.call(this),
          (this.b = t || 1),
          (this.a = e || at),
          (this.f = vt(this.Za, this)),
          (this.g = mt());
      }
      function Pe(t) {
        (t.aa = !1), t.M && (t.a.clearTimeout(t.M), (t.M = null));
      }
      function Le(t, e, n) {
        if ('function' == typeof t) n && (t = vt(t, n));
        else {
          if (!t || 'function' != typeof t.handleEvent)
            throw Error('Invalid listener argument');
          t = vt(t.handleEvent, t);
        }
        return 2147483647 < Number(e) ? -1 : at.setTimeout(t, e || 0);
      }
      bt(Ce, be),
        ((st = Ce.prototype).aa = !1),
        (st.M = null),
        (st.Za = function () {
          var t;
          this.aa &&
            (0 < (t = mt() - this.g) && t < 0.8 * this.b
              ? (this.M = this.a.setTimeout(this.f, this.b - t))
              : (this.M && (this.a.clearTimeout(this.M), (this.M = null)),
                we(this, 'tick'),
                this.aa && (Pe(this), this.start())));
        }),
        (st.start = function () {
          (this.aa = !0),
            this.M ||
              ((this.M = this.a.setTimeout(this.f, this.b)), (this.g = mt()));
        }),
        (st.G = function () {
          Ce.X.G.call(this), Pe(this), delete this.a;
        });
      var Re,
        Ve,
        Me,
        Ue =
          (it((Ve = Fe), (Me = Re = wt)),
          (Ve.prototype =
            null === Me
              ? Object.create(Me)
              : ((je.prototype = Me.prototype), new je())),
          (Fe.prototype.f = function (t) {
            (this.b = arguments),
              this.a
                ? (this.c = !0)
                : (function t(e) {
                    e.a = Le(function () {
                      (e.a = null), e.c && ((e.c = !1), t(e));
                    }, e.h);
                    var n = e.b;
                    (e.b = null), e.g.apply(null, n);
                  })(this);
          }),
          (Fe.prototype.G = function () {
            Re.prototype.G.call(this),
              this.a &&
                (at.clearTimeout(this.a),
                (this.a = null),
                (this.c = !1),
                (this.b = null));
          }),
          Fe);
      function je() {
        this.constructor = Ve;
      }
      function Fe(t, e) {
        var n = Re.call(this) || this;
        return (n.g = t), (n.h = e), (n.b = null), (n.c = !1), (n.a = null), n;
      }
      function qe(t) {
        wt.call(this), (this.b = t), (this.a = {});
      }
      bt(qe, wt);
      var ze = [];
      function He(t, e, n, r) {
        Array.isArray(n) || (n && (ze[0] = n.toString()), (n = ze));
        for (var i = 0; i < n.length; i++) {
          var o = he(e, n[i], r || t.handleEvent, !1, t.b || t);
          if (!o) break;
          t.a[o.key] = o;
        }
      }
      function Be(t) {
        kt(
          t.a,
          function (t, e) {
            this.a.hasOwnProperty(e) && le(t);
          },
          t
        ),
          (t.a = {});
      }
      function Ge() {
        this.a = !0;
      }
      function Ke(t, e, n, r) {
        t.info(function () {
          return (
            'XMLHTTP TEXT (' +
            e +
            '): ' +
            (function (t, e) {
              if (!t.a) return e;
              if (!e) return null;
              try {
                var n = JSON.parse(e);
                if (n)
                  for (t = 0; t < n.length; t++)
                    if (Array.isArray(n[t])) {
                      var r = n[t];
                      if (!(r.length < 2)) {
                        var i = r[1];
                        if (Array.isArray(i) && !(i.length < 1)) {
                          r = i[0];
                          if ('noop' != r && 'stop' != r && 'close' != r)
                            for (var o = 1; o < i.length; o++) i[o] = '';
                        }
                      }
                    }
                return Ee(n);
              } catch (t) {
                return e;
              }
            })(t, n) +
            (r ? ' ' + r : '')
          );
        });
      }
      (qe.prototype.G = function () {
        qe.X.G.call(this), Be(this);
      }),
        (qe.prototype.handleEvent = function () {
          throw Error('EventHandler.handleEvent not implemented');
        }),
        (Ge.prototype.info = function () {});
      var Je = {},
        We = null;
      function Xe() {
        return (We = We || new be());
      }
      function Ye(t) {
        Qt.call(this, Je.Fa, t);
      }
      function $e(t) {
        var e = Xe();
        we(e, new Ye(e));
      }
      function Qe(t, e) {
        Qt.call(this, Je.STAT_EVENT, t), (this.stat = e);
      }
      function Ze(t) {
        var e = Xe();
        we(e, new Qe(e, t));
      }
      function tn(t) {
        Qt.call(this, Je.Ga, t);
      }
      function en(t, e) {
        if ('function' != typeof t)
          throw Error('Fn must not be null and must be a function');
        return at.setTimeout(function () {
          t();
        }, e);
      }
      (Je.Fa = 'serverreachability'),
        bt(Ye, Qt),
        (Je.STAT_EVENT = 'statevent'),
        bt(Qe, Qt),
        (Je.Ga = 'timingevent'),
        bt(tn, Qt);
      var nn = {
          NO_ERROR: 0,
          $a: 1,
          nb: 2,
          mb: 3,
          hb: 4,
          lb: 5,
          ob: 6,
          Da: 7,
          TIMEOUT: 8,
          rb: 9
        },
        $ = {
          fb: 'complete',
          Bb: 'success',
          Ea: 'error',
          Da: 'abort',
          tb: 'ready',
          ub: 'readystatechange',
          TIMEOUT: 'timeout',
          pb: 'incrementaldata',
          sb: 'progress',
          ib: 'downloadprogress',
          Jb: 'uploadprogress'
        };
      function rn() {}
      function on(t) {
        var e;
        return (e = t.a) || (e = t.a = {}), e;
      }
      function sn() {}
      rn.prototype.a = null;
      var un,
        q = { OPEN: 'a', eb: 'b', Ea: 'c', qb: 'd' };
      function an() {
        Qt.call(this, 'd');
      }
      function cn() {
        Qt.call(this, 'c');
      }
      function hn() {}
      function fn(t, e, n, r) {
        (this.g = t),
          (this.c = e),
          (this.f = n),
          (this.S = r || 1),
          (this.J = new qe(this)),
          (this.P = ln),
          (t = Ft ? 125 : void 0),
          (this.R = new Ce(t)),
          (this.B = null),
          (this.b = !1),
          (this.j = this.l = this.i = this.H = this.u = this.T = this.o = null),
          (this.s = []),
          (this.a = null),
          (this.D = 0),
          (this.h = this.m = null),
          (this.N = -1),
          (this.A = !1),
          (this.O = 0),
          (this.F = null),
          (this.V = this.C = this.U = this.I = !1);
      }
      bt(an, Qt), bt(cn, Qt), bt(hn, rn), (un = new hn());
      var ln = 45e3,
        pn = {},
        dn = {};
      function yn(t, e, n) {
        (t.H = 1), (t.i = Vn(On(e))), (t.j = n), (t.I = !0), vn(t, null);
      }
      function vn(t, e) {
        (t.u = mt()), mn(t), (t.l = On(t.i));
        var s,
          u,
          a,
          c,
          h,
          f,
          n = t.l,
          r = t.S;
        Array.isArray(r) || (r = [String(r)]),
          Xn(n.b, 't', r),
          (t.D = 0),
          (t.a = zr(t.g, t.g.C ? e : null)),
          0 < t.O && (t.F = new Ue(vt(t.Ca, t, t.a), t.O)),
          He(t.J, t.a, 'readystatechange', t.Xa),
          (e = t.B ? Ct(t.B) : {}),
          t.j
            ? (t.m || (t.m = 'POST'),
              (e['Content-Type'] = 'application/x-www-form-urlencoded'),
              t.a.ba(t.l, t.m, t.j, e))
            : ((t.m = 'GET'), t.a.ba(t.l, t.m, null, e)),
          $e(1),
          (s = t.c),
          (u = t.m),
          (a = t.l),
          (c = t.f),
          (h = t.S),
          (f = t.j),
          s.info(function () {
            if (s.a)
              if (f)
                for (var t = '', e = f.split('&'), n = 0; n < e.length; n++) {
                  var r,
                    i,
                    o = e[n].split('=');
                  1 < o.length &&
                    ((r = o[0]),
                    (o = o[1]),
                    (t =
                      2 <= (i = r.split('_')).length && 'type' == i[1]
                        ? t + (r + '=') + o + '&'
                        : t + (r + '=redacted&')));
                }
              else t = null;
            else t = f;
            return (
              'XMLHTTP REQ (' +
              c +
              ') [attempt ' +
              h +
              ']: ' +
              u +
              '\n' +
              a +
              '\n' +
              t
            );
          });
      }
      function gn(t, e, n) {
        for (var r, i, o, s = !0; !t.A && t.D < n.length; ) {
          var u =
            ((u = n),
            (o = i = void 0),
            (i = (r = t).D),
            -1 == (o = u.indexOf('\n', i))
              ? dn
              : ((i = Number(u.substring(i, o))),
                isNaN(i)
                  ? pn
                  : (o += 1) + i > u.length
                  ? dn
                  : ((u = u.substr(o, i)), (r.D = o + i), u)));
          if (u == dn) {
            4 == e && ((t.h = 4), Ze(14), (s = !1)),
              Ke(t.c, t.f, null, '[Incomplete Response]');
            break;
          }
          if (u == pn) {
            (t.h = 4), Ze(15), Ke(t.c, t.f, n, '[Invalid Chunk]'), (s = !1);
            break;
          }
          Ke(t.c, t.f, u, null), _n(t, u);
        }
        4 == e && 0 == n.length && ((t.h = 1), Ze(16), (s = !1)),
          (t.b = t.b && s),
          s
            ? 0 < n.length &&
              !t.V &&
              ((t.V = !0),
              (e = t.g).a == t &&
                e.U &&
                !e.F &&
                (e.c.info(
                  'Great, no buffering proxy detected. Bytes received: ' +
                    n.length
                ),
                Lr(e),
                (e.F = !0),
                Ze(11)))
            : (Ke(t.c, t.f, n, '[Invalid Chunked Response]'), En(t), In(t));
      }
      function mn(t) {
        (t.T = mt() + t.P), bn(t, t.P);
      }
      function bn(t, e) {
        if (null != t.o) throw Error('WatchDog timer not null');
        t.o = en(vt(t.Va, t), e);
      }
      function wn(t) {
        t.o && (at.clearTimeout(t.o), (t.o = null));
      }
      function In(t) {
        0 == t.g.v || t.A || Mr(t.g, t);
      }
      function En(t) {
        wn(t);
        var e = t.F;
        e && 'function' == typeof e.ja && e.ja(),
          (t.F = null),
          Pe(t.R),
          Be(t.J),
          t.a && ((e = t.a), (t.a = null), e.abort(), e.ja());
      }
      function _n(t, e) {
        try {
          var n,
            r,
            i,
            o,
            s,
            u = t.g;
          if (0 != u.v && (u.a == t || nr(u.b, t)))
            if (((u.I = t.N), !t.C && nr(u.b, t) && 3 == u.v)) {
              try {
                var a = u.ka.a.parse(e);
              } catch (t) {
                a = null;
              }
              if (Array.isArray(a) && 3 == a.length) {
                var c = a;
                if (0 == c[0]) {
                  t: if (!u.j) {
                    if (u.a) {
                      if (!(u.a.u + 3e3 < t.u)) break t;
                      Vr(u), Nr(u);
                    }
                    Pr(u), Ze(18);
                  }
                } else
                  (u.oa = c[1]),
                    0 < u.oa - u.P &&
                      c[2] < 37500 &&
                      u.H &&
                      0 == u.o &&
                      !u.m &&
                      (u.m = en(vt(u.Sa, u), 6e3));
                if (er(u.b) <= 1 && u.ea) {
                  try {
                    u.ea();
                  } catch (t) {}
                  u.ea = void 0;
                }
              } else jr(u, 11);
            } else if (((!t.C && u.a != t) || Vr(u), !Nt(e)))
              for (e = a = u.ka.a.parse(e), a = 0; a < e.length; a++) {
                (c = e[a]),
                  (u.P = c[0]),
                  (c = c[1]),
                  2 == u.v
                    ? 'c' == c[0]
                      ? ((u.J = c[1]),
                        (u.ga = c[2]),
                        null != (r = c[3]) &&
                          ((u.ha = r), u.c.info('VER=' + u.ha)),
                        null != (o = c[4]) &&
                          ((u.pa = o), u.c.info('SVER=' + u.pa)),
                        null != (r = c[5]) &&
                          'number' == typeof r &&
                          0 < r &&
                          ((n = 1.5 * r),
                          (u.D = n),
                          u.c.info('backChannelRequestTimeoutMs_=' + n)),
                        (n = u),
                        (o = t.a) &&
                          (!(r = o.a
                            ? o.a.getResponseHeader('X-Client-Wire-Protocol')
                            : null) ||
                            (!(i = n.b).a &&
                              (xt(r, 'spdy') || xt(r, 'quic') || xt(r, 'h2')) &&
                              ((i.f = i.g),
                              (i.a = new Set()),
                              i.b && (rr(i, i.b), (i.b = null)))),
                          !n.A ||
                            ((s = o.a
                              ? o.a.getResponseHeader('X-HTTP-Session-Id')
                              : null) &&
                              ((n.na = s), Rn(n.B, n.A, s)))),
                        (u.v = 3),
                        u.f && u.f.ta(),
                        u.U &&
                          ((u.N = mt() - t.u),
                          u.c.info('Handshake RTT: ' + u.N + 'ms')),
                        (i = t),
                        ((n = u).la = qr(n, n.C ? n.ga : null, n.fa)),
                        i.C
                          ? (ir(n.b, i),
                            (o = i),
                            (s = n.D) && o.setTimeout(s),
                            o.o && (wn(o), mn(o)),
                            (n.a = i))
                          : Cr(n),
                        0 < u.g.length && xr(u))
                      : ('stop' != c[0] && 'close' != c[0]) || jr(u, 7)
                    : 3 == u.v &&
                      ('stop' == c[0] || 'close' == c[0]
                        ? 'stop' == c[0]
                          ? jr(u, 7)
                          : Tr(u)
                        : 'noop' != c[0] && u.f && u.f.sa(c),
                      (u.o = 0));
              }
          $e(4);
        } catch (t) {}
      }
      function Tn(t, e) {
        if (t.forEach && 'function' == typeof t.forEach) t.forEach(e, void 0);
        else if (ht(t) || 'string' == typeof t) Et(t, e, void 0);
        else {
          if (t.L && 'function' == typeof t.L) var n = t.L();
          else if (t.K && 'function' == typeof t.K) n = void 0;
          else if (ht(t) || 'string' == typeof t) {
            n = [];
            for (var r = t.length, i = 0; i < r; i++) n.push(i);
          } else for (i in ((n = []), (r = 0), t)) n[r++] = i;
          i = (r = (function (t) {
            if (t.K && 'function' == typeof t.K) return t.K();
            if ('string' == typeof t) return t.split('');
            if (ht(t)) {
              for (var e = [], n = t.length, r = 0; r < n; r++) e.push(t[r]);
              return e;
            }
            for (r in ((e = []), (n = 0), t)) e[n++] = t[r];
            return e;
          })(t)).length;
          for (var o = 0; o < i; o++) e.call(void 0, r[o], n && n[o], t);
        }
      }
      function Nn(t, e) {
        (this.b = {}), (this.a = []), (this.c = 0);
        var n = arguments.length;
        if (1 < n) {
          if (n % 2) throw Error('Uneven number of arguments');
          for (var r = 0; r < n; r += 2)
            this.set(arguments[r], arguments[r + 1]);
        } else if (t)
          if (t instanceof Nn)
            for (n = t.L(), r = 0; r < n.length; r++)
              this.set(n[r], t.get(n[r]));
          else for (r in t) this.set(r, t[r]);
      }
      function An(t) {
        if (t.c != t.a.length) {
          for (var e = 0, n = 0; e < t.a.length; ) {
            var r = t.a[e];
            Sn(t.b, r) && (t.a[n++] = r), e++;
          }
          t.a.length = n;
        }
        if (t.c != t.a.length) {
          for (var i = {}, n = (e = 0); e < t.a.length; )
            Sn(i, (r = t.a[e])) || (i[(t.a[n++] = r)] = 1), e++;
          t.a.length = n;
        }
      }
      function Sn(t, e) {
        return Object.prototype.hasOwnProperty.call(t, e);
      }
      ((st = fn.prototype).setTimeout = function (t) {
        this.P = t;
      }),
        (st.Xa = function (t) {
          t = t.target;
          var e = this.F;
          e && 3 == wr(t) ? e.f() : this.Ca(t);
        }),
        (st.Ca = function (t) {
          try {
            if (t == this.a)
              t: {
                var e = wr(this.a),
                  n = this.a.ua(),
                  r = this.a.W();
                if (!(e < 3 || (3 == e && !Ft && !this.a.$()))) {
                  this.A || 4 != e || 7 == n || $e(8 == n || r <= 0 ? 3 : 2),
                    wn(this);
                  var i = this.a.W();
                  this.N = i;
                  n = this.a.$();
                  if (
                    ((this.b = 200 == i),
                    (r = this.c),
                    (u = this.m),
                    (a = this.l),
                    (c = this.f),
                    (h = this.S),
                    (f = e),
                    (l = i),
                    r.info(function () {
                      return (
                        'XMLHTTP RESP (' +
                        c +
                        ') [ attempt ' +
                        h +
                        ']: ' +
                        u +
                        '\n' +
                        a +
                        '\n' +
                        f +
                        ' ' +
                        l
                      );
                    }),
                    this.b)
                  ) {
                    if (this.U && !this.C) {
                      e: {
                        if (this.a) {
                          var o = this.a;
                          if (
                            (o = o.a
                              ? o.a.getResponseHeader('X-HTTP-Initial-Response')
                              : null) &&
                            !Nt(o)
                          ) {
                            var s = o;
                            break e;
                          }
                        }
                        s = null;
                      }
                      if (!s) {
                        (this.b = !1), (this.h = 3), Ze(12), En(this), In(this);
                        break t;
                      }
                      Ke(
                        this.c,
                        this.f,
                        s,
                        'Initial handshake response via X-HTTP-Initial-Response'
                      ),
                        (this.C = !0),
                        _n(this, s);
                    }
                    this.I
                      ? (gn(this, e, n),
                        Ft &&
                          this.b &&
                          3 == e &&
                          (He(this.J, this.R, 'tick', this.Wa), this.R.start()))
                      : (Ke(this.c, this.f, n, null), _n(this, n)),
                      4 == e && En(this),
                      this.b &&
                        !this.A &&
                        (4 == e ? Mr(this.g, this) : ((this.b = !1), mn(this)));
                  } else
                    400 == i && 0 < n.indexOf('Unknown SID')
                      ? ((this.h = 3), Ze(12))
                      : ((this.h = 0), Ze(13)),
                      En(this),
                      In(this);
                }
              }
          } catch (t) {}
          var u, a, c, h, f, l;
        }),
        (st.Wa = function () {
          var t, e;
          this.a &&
            ((t = wr(this.a)),
            (e = this.a.$()),
            this.D < e.length &&
              (wn(this), gn(this, t, e), this.b && 4 != t && mn(this)));
        }),
        (st.cancel = function () {
          (this.A = !0), En(this);
        }),
        (st.Va = function () {
          this.o = null;
          var t,
            e,
            n = mt();
          0 <= n - this.T
            ? ((t = this.c),
              (e = this.l),
              t.info(function () {
                return 'TIMEOUT: ' + e;
              }),
              2 != this.H && ($e(3), Ze(17)),
              En(this),
              (this.h = 2),
              In(this))
            : bn(this, this.T - n);
        }),
        ((st = Nn.prototype).K = function () {
          An(this);
          for (var t = [], e = 0; e < this.a.length; e++)
            t.push(this.b[this.a[e]]);
          return t;
        }),
        (st.L = function () {
          return An(this), this.a.concat();
        }),
        (st.get = function (t, e) {
          return Sn(this.b, t) ? this.b[t] : e;
        }),
        (st.set = function (t, e) {
          Sn(this.b, t) || (this.c++, this.a.push(t)), (this.b[t] = e);
        }),
        (st.forEach = function (t, e) {
          for (var n = this.L(), r = 0; r < n.length; r++) {
            var i = n[r],
              o = this.get(i);
            t.call(e, o, i, this);
          }
        });
      var xn =
        /^(?:([^:/?#.]+):)?(?:\/\/(?:([^\\/?#]*)@)?([^\\/?#]*?)(?::([0-9]+))?(?=[\\/?#]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;
      function Dn(t, e) {
        var n;
        (this.c = this.j = this.f = ''),
          (this.h = null),
          (this.i = this.g = ''),
          (this.a = !1),
          t instanceof Dn
            ? ((this.a = void 0 !== e ? e : t.a),
              kn(this, t.f),
              (this.j = t.j),
              Cn(this, t.c),
              Pn(this, t.h),
              (this.g = t.g),
              (e = t.b),
              ((n = new Gn()).c = e.c),
              e.a && ((n.a = new Nn(e.a)), (n.b = e.b)),
              Ln(this, n),
              (this.i = t.i))
            : t && (n = String(t).match(xn))
            ? ((this.a = !!e),
              kn(this, n[1] || '', !0),
              (this.j = Mn(n[2] || '')),
              Cn(this, n[3] || '', !0),
              Pn(this, n[4]),
              (this.g = Mn(n[5] || '', !0)),
              Ln(this, n[6] || '', !0),
              (this.i = Mn(n[7] || '')))
            : ((this.a = !!e), (this.b = new Gn(null, this.a)));
      }
      function On(t) {
        return new Dn(t);
      }
      function kn(t, e, n) {
        (t.f = n ? Mn(e, !0) : e), t.f && (t.f = t.f.replace(/:$/, ''));
      }
      function Cn(t, e, n) {
        t.c = n ? Mn(e, !0) : e;
      }
      function Pn(t, e) {
        if (e) {
          if (((e = Number(e)), isNaN(e) || e < 0))
            throw Error('Bad port number ' + e);
          t.h = e;
        } else t.h = null;
      }
      function Ln(t, e, n) {
        var r, i;
        e instanceof Gn
          ? ((t.b = e),
            (r = t.b),
            (i = t.a) &&
              !r.f &&
              (Kn(r),
              (r.c = null),
              r.a.forEach(function (t, e) {
                var n = e.toLowerCase();
                e != n && (Jn(this, e), Xn(this, n, t));
              }, r)),
            (r.f = i))
          : (n || (e = Un(e, Hn)), (t.b = new Gn(e, t.a)));
      }
      function Rn(t, e, n) {
        t.b.set(e, n);
      }
      function Vn(t) {
        return (
          Rn(
            t,
            'zx',
            Math.floor(2147483648 * Math.random()).toString(36) +
              Math.abs(Math.floor(2147483648 * Math.random()) ^ mt()).toString(
                36
              )
          ),
          t
        );
      }
      function Mn(t, e) {
        return t
          ? e
            ? decodeURI(t.replace(/%25/g, '%2525'))
            : decodeURIComponent(t)
          : '';
      }
      function Un(t, e, n) {
        return 'string' == typeof t
          ? ((t = encodeURI(t).replace(e, jn)),
            n && (t = t.replace(/%25([0-9a-fA-F]{2})/g, '%$1')),
            t)
          : null;
      }
      function jn(t) {
        return (
          '%' +
          (((t = t.charCodeAt(0)) >> 4) & 15).toString(16) +
          (15 & t).toString(16)
        );
      }
      Dn.prototype.toString = function () {
        var t = [],
          e = this.f;
        e && t.push(Un(e, Fn, !0), ':');
        var n = this.c;
        return (
          (!n && 'file' != e) ||
            (t.push('//'),
            (e = this.j) && t.push(Un(e, Fn, !0), '@'),
            t.push(
              encodeURIComponent(String(n)).replace(
                /%25([0-9a-fA-F]{2})/g,
                '%$1'
              )
            ),
            null != (n = this.h) && t.push(':', String(n))),
          (n = this.g) &&
            (this.c && '/' != n.charAt(0) && t.push('/'),
            t.push(Un(n, '/' == n.charAt(0) ? zn : qn, !0))),
          (n = this.b.toString()) && t.push('?', n),
          (n = this.i) && t.push('#', Un(n, Bn)),
          t.join('')
        );
      };
      var Fn = /[#\/\?@]/g,
        qn = /[#\?:]/g,
        zn = /[#\?]/g,
        Hn = /[#\?@]/g,
        Bn = /#/g;
      function Gn(t, e) {
        (this.b = this.a = null), (this.c = t || null), (this.f = !!e);
      }
      function Kn(n) {
        n.a ||
          ((n.a = new Nn()),
          (n.b = 0),
          n.c &&
            (function (t, e) {
              if (t) {
                t = t.split('&');
                for (var n = 0; n < t.length; n++) {
                  var r,
                    i = t[n].indexOf('='),
                    o = null;
                  0 <= i
                    ? ((r = t[n].substring(0, i)), (o = t[n].substring(i + 1)))
                    : (r = t[n]),
                    e(r, o ? decodeURIComponent(o.replace(/\+/g, ' ')) : '');
                }
              }
            })(n.c, function (t, e) {
              n.add(decodeURIComponent(t.replace(/\+/g, ' ')), e);
            }));
      }
      function Jn(t, e) {
        Kn(t),
          (e = Yn(t, e)),
          Sn(t.a.b, e) &&
            ((t.c = null),
            (t.b -= t.a.get(e).length),
            Sn((t = t.a).b, e) &&
              (delete t.b[e], t.c--, t.a.length > 2 * t.c && An(t)));
      }
      function Wn(t, e) {
        return Kn(t), (e = Yn(t, e)), Sn(t.a.b, e);
      }
      function Xn(t, e, n) {
        Jn(t, e),
          0 < n.length &&
            ((t.c = null), t.a.set(Yn(t, e), Tt(n)), (t.b += n.length));
      }
      function Yn(t, e) {
        return (e = String(e)), t.f && (e = e.toLowerCase()), e;
      }
      ((st = Gn.prototype).add = function (t, e) {
        Kn(this), (this.c = null), (t = Yn(this, t));
        var n = this.a.get(t);
        return n || this.a.set(t, (n = [])), n.push(e), (this.b += 1), this;
      }),
        (st.forEach = function (n, r) {
          Kn(this),
            this.a.forEach(function (t, e) {
              Et(
                t,
                function (t) {
                  n.call(r, t, e, this);
                },
                this
              );
            }, this);
        }),
        (st.L = function () {
          Kn(this);
          for (
            var t = this.a.K(), e = this.a.L(), n = [], r = 0;
            r < e.length;
            r++
          )
            for (var i = t[r], o = 0; o < i.length; o++) n.push(e[r]);
          return n;
        }),
        (st.K = function (t) {
          Kn(this);
          var e = [];
          if ('string' == typeof t)
            Wn(this, t) && (e = _t(e, this.a.get(Yn(this, t))));
          else {
            t = this.a.K();
            for (var n = 0; n < t.length; n++) e = _t(e, t[n]);
          }
          return e;
        }),
        (st.set = function (t, e) {
          return (
            Kn(this),
            (this.c = null),
            Wn(this, (t = Yn(this, t))) && (this.b -= this.a.get(t).length),
            this.a.set(t, [e]),
            (this.b += 1),
            this
          );
        }),
        (st.get = function (t, e) {
          return t && 0 < (t = this.K(t)).length ? String(t[0]) : e;
        }),
        (st.toString = function () {
          if (this.c) return this.c;
          if (!this.a) return '';
          for (var t = [], e = this.a.L(), n = 0; n < e.length; n++)
            for (
              var r = e[n],
                i = encodeURIComponent(String(r)),
                r = this.K(r),
                o = 0;
              o < r.length;
              o++
            ) {
              var s = i;
              '' !== r[o] && (s += '=' + encodeURIComponent(String(r[o]))),
                t.push(s);
            }
          return (this.c = t.join('&'));
        });
      var $n = function (t, e) {
        (this.b = t), (this.a = e);
      };
      function Qn(t) {
        (this.g = t || Zn),
          (t = at.PerformanceNavigationTiming
            ? 0 < (t = at.performance.getEntriesByType('navigation')).length &&
              ('hq' == t[0].nextHopProtocol || 'h2' == t[0].nextHopProtocol)
            : !!(at.ia && at.ia.ya && at.ia.ya() && at.ia.ya().Lb)),
          (this.f = t ? this.g : 1),
          (this.a = null),
          1 < this.f && (this.a = new Set()),
          (this.b = null),
          (this.c = []);
      }
      var Zn = 10;
      function tr(t) {
        return t.b || (t.a && t.a.size >= t.f);
      }
      function er(t) {
        return t.b ? 1 : t.a ? t.a.size : 0;
      }
      function nr(t, e) {
        return t.b ? t.b == e : t.a && t.a.has(e);
      }
      function rr(t, e) {
        t.a ? t.a.add(e) : (t.b = e);
      }
      function ir(t, e) {
        t.b && t.b == e ? (t.b = null) : t.a && t.a.has(e) && t.a.delete(e);
      }
      function or(t) {
        var e, n;
        if (null != t.b) return t.c.concat(t.b.s);
        if (null == t.a || 0 === t.a.size) return Tt(t.c);
        var r = t.c;
        try {
          for (var i = ot(t.a.values()), o = i.next(); !o.done; o = i.next())
            var s = o.value, r = r.concat(s.s);
        } catch (t) {
          e = { error: t };
        } finally {
          try {
            o && !o.done && (n = i.return) && n.call(i);
          } finally {
            if (e) throw e.error;
          }
        }
        return r;
      }
      function sr() {}
      function ur() {
        this.a = new sr();
      }
      function ar(t, e, n, r, i) {
        try {
          (e.onload = null),
            (e.onerror = null),
            (e.onabort = null),
            (e.ontimeout = null),
            i(r);
        } catch (t) {}
      }
      (Qn.prototype.cancel = function () {
        var e, t;
        if (((this.c = or(this)), this.b)) this.b.cancel(), (this.b = null);
        else if (this.a && 0 !== this.a.size) {
          try {
            for (
              var n = ot(this.a.values()), r = n.next();
              !r.done;
              r = n.next()
            ) {
              r.value.cancel();
            }
          } catch (t) {
            e = { error: t };
          } finally {
            try {
              r && !r.done && (t = n.return) && t.call(n);
            } finally {
              if (e) throw e.error;
            }
          }
          this.a.clear();
        }
      }),
        (sr.prototype.stringify = function (t) {
          return at.JSON.stringify(t, void 0);
        }),
        (sr.prototype.parse = function (t) {
          return at.JSON.parse(t, void 0);
        });
      var cr = at.JSON.parse;
      function hr(t) {
        be.call(this),
          (this.headers = new Nn()),
          (this.H = t || null),
          (this.b = !1),
          (this.s = this.a = null),
          (this.B = ''),
          (this.h = 0),
          (this.f = ''),
          (this.g = this.A = this.l = this.u = !1),
          (this.o = 0),
          (this.m = null),
          (this.I = fr),
          (this.D = this.F = !1);
      }
      bt(hr, be);
      var fr = '',
        lr = /^https?$/i,
        pr = ['POST', 'PUT'];
      function dr(t) {
        return 'content-type' == t.toLowerCase();
      }
      function yr(t, e) {
        (t.b = !1),
          t.a && ((t.g = !0), t.a.abort(), (t.g = !1)),
          (t.f = e),
          (t.h = 5),
          vr(t),
          mr(t);
      }
      function vr(t) {
        t.u || ((t.u = !0), we(t, 'complete'), we(t, 'error'));
      }
      function gr(t) {
        if (t.b && void 0 !== ut && (!t.s[1] || 4 != wr(t) || 2 != t.W()))
          if (t.l && 4 == wr(t)) Le(t.za, 0, t);
          else if ((we(t, 'readystatechange'), 4 == wr(t))) {
            t.b = !1;
            try {
              var e,
                n,
                r,
                i,
                o = t.W();
              t: switch (o) {
                case 200:
                case 201:
                case 202:
                case 204:
                case 206:
                case 304:
                case 1223:
                  var s = !0;
                  break t;
                default:
                  s = !1;
              }
              (e = s) ||
                ((n = 0 === o) &&
                  (!(i = String(t.B).match(xn)[1] || null) &&
                    at.self &&
                    at.self.location &&
                    (i = (r = at.self.location.protocol).substr(
                      0,
                      r.length - 1
                    )),
                  (n = !lr.test(i ? i.toLowerCase() : ''))),
                (e = n));
              if (e) we(t, 'complete'), we(t, 'success');
              else {
                t.h = 6;
                try {
                  var u = 2 < wr(t) ? t.a.statusText : '';
                } catch (o) {
                  u = '';
                }
                (t.f = u + ' [' + t.W() + ']'), vr(t);
              }
            } finally {
              mr(t);
            }
          }
      }
      function mr(t, e) {
        if (t.a) {
          br(t);
          var n = t.a,
            r = t.s[0] ? ct : null;
          (t.a = null), (t.s = null), e || we(t, 'ready');
          try {
            n.onreadystatechange = r;
          } catch (t) {}
        }
      }
      function br(t) {
        t.a && t.D && (t.a.ontimeout = null),
          t.m && (at.clearTimeout(t.m), (t.m = null));
      }
      function wr(t) {
        return t.a ? t.a.readyState : 0;
      }
      function Ir(t, e, n) {
        t: {
          for (r in n) {
            var r = !1;
            break t;
          }
          r = !0;
        }
        var i;
        r ||
          ((i = ''),
          kt(n, function (t, e) {
            (i += e), (i += ':'), (i += t), (i += '\r\n');
          }),
          (n = i),
          'string' == typeof t
            ? null != n && encodeURIComponent(String(n))
            : Rn(t, e, n));
      }
      function Er(t, e, n) {
        return (
          (n && n.internalChannelParams && n.internalChannelParams[t]) || e
        );
      }
      function _r(t) {
        (this.pa = 0),
          (this.g = []),
          (this.c = new Ge()),
          (this.ga =
            this.la =
            this.B =
            this.fa =
            this.a =
            this.na =
            this.A =
            this.V =
            this.i =
            this.O =
            this.l =
              null),
          (this.Oa = this.R = 0),
          (this.La = Er('failFast', !1, t)),
          (this.H = this.m = this.j = this.h = this.f = null),
          (this.S = !0),
          (this.I = this.oa = this.P = -1),
          (this.T = this.o = this.u = 0),
          (this.Ha = Er('baseRetryDelayMs', 5e3, t)),
          (this.Ra = Er('retryDelaySeedMs', 1e4, t)),
          (this.Ma = Er('forwardChannelMaxRetries', 2, t)),
          (this.ma = Er('forwardChannelRequestTimeoutMs', 2e4, t)),
          (this.Na = (t && t.g) || void 0),
          (this.D = void 0),
          (this.C = (t && t.supportsCrossDomainXhr) || !1),
          (this.J = ''),
          (this.b = new Qn(t && t.concurrentRequestLimit)),
          (this.ka = new ur()),
          (this.da = (t && t.fastHandshake) || !1),
          (this.Ia = (t && t.b) || !1),
          t && t.f && (this.c.a = !1),
          t && t.forceLongPolling && (this.S = !1),
          (this.U = (!this.da && this.S && t && t.detectBufferingProxy) || !1),
          (this.ea = void 0),
          (this.N = 0),
          (this.F = !1),
          (this.s = null),
          (this.Ka = (t && t.c) || !1) &&
            this.c.info('Opt-in to enable Chrome Origin Trials.');
      }
      function Tr(t) {
        var e, n;
        Ar(t),
          3 == t.v &&
            ((e = t.R++),
            Rn((n = On(t.B)), 'SID', t.J),
            Rn(n, 'RID', e),
            Rn(n, 'TYPE', 'terminate'),
            Or(t, n),
            ((e = new fn(t, t.c, e, void 0)).H = 2),
            (e.i = Vn(On(n))),
            (n = !1),
            at.navigator &&
              at.navigator.sendBeacon &&
              (n = at.navigator.sendBeacon(e.i.toString(), '')),
            !n && at.Image && ((new Image().src = e.i), (n = !0)),
            n || ((e.a = zr(e.g, null)), e.a.ba(e.i)),
            (e.u = mt()),
            mn(e)),
          Fr(t);
      }
      function Nr(t) {
        t.a && (Lr(t), t.a.cancel(), (t.a = null));
      }
      function Ar(t) {
        Nr(t),
          t.j && (at.clearTimeout(t.j), (t.j = null)),
          Vr(t),
          t.b.cancel(),
          t.h && ('number' == typeof t.h && at.clearTimeout(t.h), (t.h = null));
      }
      function Sr(t, e) {
        t.g.push(new $n(t.Oa++, e)), 3 == t.v && xr(t);
      }
      function xr(t) {
        tr(t.b) || t.h || ((t.h = !0), xe(t.Ba, t), (t.u = 0));
      }
      function Dr(t, e) {
        var n = e ? e.f : t.R++,
          r = On(t.B);
        Rn(r, 'SID', t.J),
          Rn(r, 'RID', n),
          Rn(r, 'AID', t.P),
          Or(t, r),
          t.i && t.l && Ir(r, t.i, t.l),
          (n = new fn(t, t.c, n, t.u + 1)),
          null === t.i && (n.B = t.l),
          e && (t.g = e.s.concat(t.g)),
          (e = kr(t, n, 1e3)),
          n.setTimeout(
            Math.round(0.5 * t.ma) + Math.round(0.5 * t.ma * Math.random())
          ),
          rr(t.b, n),
          yn(n, r, e);
      }
      function Or(t, n) {
        t.f &&
          Tn({}, function (t, e) {
            Rn(n, e, t);
          });
      }
      function kr(t, e, n) {
        n = Math.min(t.g.length, n);
        var r = t.f ? vt(t.f.Ja, t.f, t) : null;
        t: for (var i = t.g, o = -1; ; ) {
          var s = ['count=' + n];
          -1 == o
            ? 0 < n
              ? ((o = i[0].b), s.push('ofs=' + o))
              : (o = 0)
            : s.push('ofs=' + o);
          for (var u = !0, a = 0; a < n; a++) {
            var c = i[a].b,
              h = i[a].a;
            if ((c -= o) < 0) (o = Math.max(0, i[a].b - 100)), (u = !1);
            else
              try {
                !(function (t, r, e) {
                  var i = e || '';
                  try {
                    Tn(t, function (t, e) {
                      var n = t;
                      ft(t) && (n = Ee(t)),
                        r.push(i + e + '=' + encodeURIComponent(n));
                    });
                  } catch (t) {
                    throw (
                      (r.push(i + 'type=' + encodeURIComponent('_badmap')), t)
                    );
                  }
                })(h, s, 'req' + c + '_');
              } catch (t) {
                r && r(h);
              }
          }
          if (u) {
            r = s.join('&');
            break t;
          }
        }
        return (t = t.g.splice(0, n)), (e.s = t), r;
      }
      function Cr(t) {
        t.a || t.j || ((t.T = 1), xe(t.Aa, t), (t.o = 0));
      }
      function Pr(t) {
        return (
          !(t.a || t.j || 3 <= t.o) &&
          (t.T++, (t.j = en(vt(t.Aa, t), Ur(t, t.o))), t.o++, 1)
        );
      }
      function Lr(t) {
        null != t.s && (at.clearTimeout(t.s), (t.s = null));
      }
      function Rr(t) {
        (t.a = new fn(t, t.c, 'rpc', t.T)),
          null === t.i && (t.a.B = t.l),
          (t.a.O = 0);
        var e = On(t.la);
        Rn(e, 'RID', 'rpc'),
          Rn(e, 'SID', t.J),
          Rn(e, 'CI', t.H ? '0' : '1'),
          Rn(e, 'AID', t.P),
          Or(t, e),
          Rn(e, 'TYPE', 'xmlhttp'),
          t.i && t.l && Ir(e, t.i, t.l),
          t.D && t.a.setTimeout(t.D);
        var n = t.a;
        (t = t.ga),
          (n.H = 1),
          (n.i = Vn(On(e))),
          (n.j = null),
          (n.I = !0),
          vn(n, t);
      }
      function Vr(t) {
        null != t.m && (at.clearTimeout(t.m), (t.m = null));
      }
      function Mr(t, e) {
        var n,
          r = null;
        if (t.a == e) {
          Vr(t), Lr(t), (t.a = null);
          var i = 2;
        } else {
          if (!nr(t.b, e)) return;
          (r = e.s), ir(t.b, e), (i = 1);
        }
        if (((t.I = e.N), 0 != t.v))
          if (e.b) {
            1 == i
              ? ((r = e.j ? e.j.length : 0),
                (e = mt() - e.u),
                (n = t.u),
                we((i = Xe()), new tn(i)),
                xr(t))
              : Cr(t);
          } else if (
            3 == (n = e.h) ||
            (0 == n && 0 < t.I) ||
            !(
              (1 == i &&
                (function (t, e) {
                  if (!(er(t.b) >= t.b.f - (t.h ? 1 : 0))) {
                    if (t.h) return (t.g = e.s.concat(t.g)), 1;
                    if (!(1 == t.v || 2 == t.v || t.u >= (t.La ? 0 : t.Ma)))
                      return (t.h = en(vt(t.Ba, t, e), Ur(t, t.u))), t.u++, 1;
                  }
                })(t, e)) ||
              (2 == i && Pr(t))
            )
          )
            switch (
              (r && 0 < r.length && ((e = t.b), (e.c = e.c.concat(r))), n)
            ) {
              case 1:
                jr(t, 5);
                break;
              case 4:
                jr(t, 10);
                break;
              case 3:
                jr(t, 6);
                break;
              default:
                jr(t, 2);
            }
      }
      function Ur(t, e) {
        var n = t.Ha + Math.floor(Math.random() * t.Ra);
        return t.f || (n *= 2), n * e;
      }
      function jr(t, e) {
        var n, r, i, o;
        t.c.info('Error code ' + e),
          2 == e
            ? ((r = null),
              t.f && (r = null),
              (o = vt(t.Ya, t)),
              r ||
                ((r = new Dn('//www.google.com/images/cleardot.gif')),
                (at.location && 'http' == at.location.protocol) ||
                  kn(r, 'https'),
                Vn(r)),
              (n = r.toString()),
              (r = o),
              (o = new Ge()),
              at.Image
                ? (((i = new Image()).onload = gt(
                    ar,
                    o,
                    i,
                    'TestLoadImage: loaded',
                    !0,
                    r
                  )),
                  (i.onerror = gt(ar, o, i, 'TestLoadImage: error', !1, r)),
                  (i.onabort = gt(ar, o, i, 'TestLoadImage: abort', !1, r)),
                  (i.ontimeout = gt(ar, o, i, 'TestLoadImage: timeout', !1, r)),
                  at.setTimeout(function () {
                    i.ontimeout && i.ontimeout();
                  }, 1e4),
                  (i.src = n))
                : r(!1))
            : Ze(2),
          (t.v = 0),
          t.f && t.f.ra(e),
          Fr(t),
          Ar(t);
      }
      function Fr(t) {
        (t.v = 0),
          (t.I = -1),
          t.f &&
            ((0 == or(t.b).length && 0 == t.g.length) ||
              ((t.b.c.length = 0), Tt(t.g), (t.g.length = 0)),
            t.f.qa());
      }
      function qr(t, e, n) {
        var r,
          i,
          o,
          s,
          u,
          a = (s = n) instanceof Dn ? On(s) : new Dn(s, void 0);
        return (
          '' != a.c
            ? (e && Cn(a, e + '.' + a.c), Pn(a, a.h))
            : ((u = at.location),
              (r = u.protocol),
              (i = e ? e + '.' + u.hostname : u.hostname),
              (o = +u.port),
              (s = n),
              (u = new Dn(null, void 0)),
              r && kn(u, r),
              i && Cn(u, i),
              o && Pn(u, o),
              s && (u.g = s),
              (a = u)),
          t.V &&
            kt(t.V, function (t, e) {
              Rn(a, e, t);
            }),
          (e = t.A),
          (n = t.na),
          e && n && Rn(a, e, n),
          Rn(a, 'VER', t.ha),
          Or(t, a),
          a
        );
      }
      function zr(t, e) {
        if (e && !t.C)
          throw Error("Can't create secondary domain capable XhrIo object.");
        return ((e = new hr(t.Na)).F = t.C), e;
      }
      function Hr() {}
      function Br() {
        if (Ut && !(10 <= Number(Wt)))
          throw Error('Environmental error: no available transport.');
      }
      function Gr(t, e) {
        be.call(this),
          (this.a = new _r(e)),
          (this.o = t),
          (this.b = (e && e.messageUrlParams) || null),
          (t = (e && e.messageHeaders) || null),
          e &&
            e.clientProtocolHeaderRequired &&
            (t
              ? (t['X-Client-Protocol'] = 'webchannel')
              : (t = { 'X-Client-Protocol': 'webchannel' })),
          (this.a.l = t),
          (t = (e && e.initMessageHeaders) || null),
          e &&
            e.messageContentType &&
            (t
              ? (t['X-WebChannel-Content-Type'] = e.messageContentType)
              : (t = { 'X-WebChannel-Content-Type': e.messageContentType })),
          e &&
            e.a &&
            (t
              ? (t['X-WebChannel-Client-Profile'] = e.a)
              : (t = { 'X-WebChannel-Client-Profile': e.a })),
          (this.a.O = t),
          (t = e && e.httpHeadersOverwriteParam) && !Nt(t) && (this.a.i = t),
          (this.m = (e && e.supportsCrossDomainXhr) || !1),
          (this.l = (e && e.sendRawJson) || !1),
          (e = e && e.httpSessionIdParam) &&
            !Nt(e) &&
            ((this.a.A = e),
            null !== (t = this.b) &&
              e in t &&
              e in (t = this.b) &&
              delete t[e]),
          (this.f = new Wr(this));
      }
      function Kr(t) {
        an.call(this);
        var e = t.__sm__;
        if (e) {
          t: {
            for (var n in e) {
              t = n;
              break t;
            }
            t = void 0;
          }
          (this.c = t)
            ? ((t = this.c), (this.data = null !== e && t in e ? e[t] : void 0))
            : (this.data = e);
        } else this.data = t;
      }
      function Jr() {
        cn.call(this), (this.status = 1);
      }
      function Wr(t) {
        this.a = t;
      }
      ((st = hr.prototype).ba = function (t, e, n, r) {
        if (this.a)
          throw Error(
            '[goog.net.XhrIo] Object is active with another request=' +
              this.B +
              '; newUri=' +
              t
          );
        (e = e ? e.toUpperCase() : 'GET'),
          (this.B = t),
          (this.f = ''),
          (this.h = 0),
          (this.u = !1),
          (this.b = !0),
          (this.a = new XMLHttpRequest()),
          (this.s = this.H ? on(this.H) : on(un)),
          (this.a.onreadystatechange = vt(this.za, this));
        try {
          (this.A = !0), this.a.open(e, String(t), !0), (this.A = !1);
        } catch (t) {
          return void yr(this, t);
        }
        t = n || '';
        var i,
          o = new Nn(this.headers);
        r &&
          Tn(r, function (t, e) {
            o.set(e, t);
          }),
          (r = (function (t) {
            t: {
              for (
                var e = dr,
                  n = t.length,
                  r = 'string' == typeof t ? t.split('') : t,
                  i = 0;
                i < n;
                i++
              )
                if (i in r && e.call(void 0, r[i], i, t)) {
                  e = i;
                  break t;
                }
              e = -1;
            }
            return e < 0 ? null : 'string' == typeof t ? t.charAt(e) : t[e];
          })(o.L())),
          (n = at.FormData && t instanceof at.FormData),
          0 <= It(pr, e) &&
            !r &&
            !n &&
            o.set(
              'Content-Type',
              'application/x-www-form-urlencoded;charset=utf-8'
            ),
          o.forEach(function (t, e) {
            this.a.setRequestHeader(e, t);
          }, this),
          this.I && (this.a.responseType = this.I),
          'withCredentials' in this.a &&
            this.a.withCredentials !== this.F &&
            (this.a.withCredentials = this.F);
        try {
          br(this),
            0 < this.o &&
              ((this.D =
                ((i = this.a),
                Ut &&
                  Jt(9) &&
                  'number' == typeof i.timeout &&
                  void 0 !== i.ontimeout))
                ? ((this.a.timeout = this.o),
                  (this.a.ontimeout = vt(this.xa, this)))
                : (this.m = Le(this.xa, this.o, this))),
            (this.l = !0),
            this.a.send(t),
            (this.l = !1);
        } catch (t) {
          yr(this, t);
        }
      }),
        (st.xa = function () {
          void 0 !== ut &&
            this.a &&
            ((this.f = 'Timed out after ' + this.o + 'ms, aborting'),
            (this.h = 8),
            we(this, 'timeout'),
            this.abort(8));
        }),
        (st.abort = function (t) {
          this.a &&
            this.b &&
            ((this.b = !1),
            (this.g = !0),
            this.a.abort(),
            (this.g = !1),
            (this.h = t || 7),
            we(this, 'complete'),
            we(this, 'abort'),
            mr(this));
        }),
        (st.G = function () {
          this.a &&
            (this.b &&
              ((this.b = !1), (this.g = !0), this.a.abort(), (this.g = !1)),
            mr(this, !0)),
            hr.X.G.call(this);
        }),
        (st.za = function () {
          this.j || (this.A || this.l || this.g ? gr(this) : this.Ua());
        }),
        (st.Ua = function () {
          gr(this);
        }),
        (st.W = function () {
          try {
            return 2 < wr(this) ? this.a.status : -1;
          } catch (t) {
            return -1;
          }
        }),
        (st.$ = function () {
          try {
            return this.a ? this.a.responseText : '';
          } catch (t) {
            return '';
          }
        }),
        (st.Pa = function (t) {
          if (this.a) {
            var e = this.a.responseText;
            return t && 0 == e.indexOf(t) && (e = e.substring(t.length)), cr(e);
          }
        }),
        (st.ua = function () {
          return this.h;
        }),
        (st.Qa = function () {
          return 'string' == typeof this.f ? this.f : String(this.f);
        }),
        ((st = _r.prototype).ha = 8),
        (st.v = 1),
        (st.Ba = function (t) {
          if (this.h)
            if (((this.h = null), 1 == this.v)) {
              if (!t) {
                (this.R = Math.floor(1e5 * Math.random())), (t = this.R++);
                var e,
                  n = new fn(this, this.c, t, void 0),
                  r = this.l;
                if (
                  (this.O && (r ? Lt((r = Ct(r)), this.O) : (r = this.O)),
                  null === this.i && (n.B = r),
                  this.da)
                )
                  t: {
                    for (var i = (e = 0); i < this.g.length; i++) {
                      var o = this.g[i];
                      if (
                        ('__data__' in o.a &&
                        'string' == typeof (o = o.a.__data__)
                          ? (o = o.length)
                          : (o = void 0),
                        void 0 === o)
                      )
                        break;
                      if (4096 < (e += o)) {
                        e = i;
                        break t;
                      }
                      if (4096 === e || i === this.g.length - 1) {
                        e = i + 1;
                        break t;
                      }
                    }
                    e = 1e3;
                  }
                else e = 1e3;
                (e = kr(this, n, e)),
                  Rn((i = On(this.B)), 'RID', t),
                  Rn(i, 'CVER', 22),
                  this.A && Rn(i, 'X-HTTP-Session-Id', this.A),
                  Or(this, i),
                  this.i && r && Ir(i, this.i, r),
                  rr(this.b, n),
                  this.Ia && Rn(i, 'TYPE', 'init'),
                  this.da
                    ? (Rn(i, '$req', e),
                      Rn(i, 'SID', 'null'),
                      (n.U = !0),
                      yn(n, i, null))
                    : yn(n, i, e),
                  (this.v = 2);
              }
            } else
              3 == this.v &&
                (t
                  ? Dr(this, t)
                  : 0 == this.g.length || tr(this.b) || Dr(this));
        }),
        (st.Aa = function () {
          var t;
          (this.j = null),
            Rr(this),
            this.U &&
              !(this.F || null == this.a || this.N <= 0) &&
              ((t = 2 * this.N),
              this.c.info('BP detection timer enabled: ' + t),
              (this.s = en(vt(this.Ta, this), t)));
        }),
        (st.Ta = function () {
          this.s &&
            ((this.s = null),
            this.c.info('BP detection timeout reached.'),
            this.c.info('Buffering proxy detected and switch to long-polling!'),
            (this.H = !1),
            (this.F = !0),
            Ze(10),
            Nr(this),
            Rr(this));
        }),
        (st.Sa = function () {
          null != this.m && ((this.m = null), Nr(this), Pr(this), Ze(19));
        }),
        (st.Ya = function (t) {
          t
            ? (this.c.info('Successfully pinged google.com'), Ze(2))
            : (this.c.info('Failed to ping google.com'), Ze(1));
        }),
        ((st = Hr.prototype).ta = function () {}),
        (st.sa = function () {}),
        (st.ra = function () {}),
        (st.qa = function () {}),
        (st.Ja = function () {}),
        (Br.prototype.a = function (t, e) {
          return new Gr(t, e);
        }),
        bt(Gr, be),
        (Gr.prototype.g = function () {
          (this.a.f = this.f), this.m && (this.a.C = !0);
          var t = this.a,
            e = this.o,
            n = this.b || void 0;
          Ze(0),
            (t.fa = e),
            (t.V = n || {}),
            (t.H = t.S),
            (t.B = qr(t, null, t.fa)),
            xr(t);
        }),
        (Gr.prototype.close = function () {
          Tr(this.a);
        }),
        (Gr.prototype.h = function (t) {
          var e;
          'string' == typeof t
            ? (((e = {}).__data__ = t), Sr(this.a, e))
            : this.l
            ? (((e = {}).__data__ = Ee(t)), Sr(this.a, e))
            : Sr(this.a, t);
        }),
        (Gr.prototype.G = function () {
          (this.a.f = null),
            delete this.f,
            Tr(this.a),
            delete this.a,
            Gr.X.G.call(this);
        }),
        bt(Kr, an),
        bt(Jr, cn),
        bt(Wr, Hr),
        (Wr.prototype.ta = function () {
          we(this.a, 'a');
        }),
        (Wr.prototype.sa = function (t) {
          we(this.a, new Kr(t));
        }),
        (Wr.prototype.ra = function (t) {
          we(this.a, new Jr());
        }),
        (Wr.prototype.qa = function () {
          we(this.a, 'b');
        }),
        (Br.prototype.createWebChannel = Br.prototype.a),
        (Gr.prototype.send = Gr.prototype.h),
        (Gr.prototype.open = Gr.prototype.g),
        (nn.NO_ERROR = 0),
        (nn.TIMEOUT = 8),
        (nn.HTTP_ERROR = 6),
        ($.COMPLETE = 'complete'),
        ((sn.EventType = q).OPEN = 'a'),
        (q.CLOSE = 'b'),
        (q.ERROR = 'c'),
        (q.MESSAGE = 'd'),
        (be.prototype.listen = be.prototype.va),
        (hr.prototype.listenOnce = hr.prototype.wa),
        (hr.prototype.getLastError = hr.prototype.Qa),
        (hr.prototype.getLastErrorCode = hr.prototype.ua),
        (hr.prototype.getStatus = hr.prototype.W),
        (hr.prototype.getResponseJson = hr.prototype.Pa),
        (hr.prototype.getResponseText = hr.prototype.$),
        (hr.prototype.send = hr.prototype.ba);
      var Xr = Xe,
        Yr = nn,
        $r = $,
        Qr = Je,
        Zr = 10,
        ti = 11,
        ei = sn,
        ni = hr,
        ri = new U('@firebase/firestore');
      function ii() {
        return ri.logLevel;
      }
      function oi(t) {
        for (var e, n = [], r = 1; r < arguments.length; r++)
          n[r - 1] = arguments[r];
        ri.logLevel <= C.DEBUG &&
          ((e = n.map(ai)),
          ri.debug.apply(ri, s(['Firestore (8.2.1): ' + t], e)));
      }
      function si(t) {
        for (var e, n = [], r = 1; r < arguments.length; r++)
          n[r - 1] = arguments[r];
        ri.logLevel <= C.ERROR &&
          ((e = n.map(ai)),
          ri.error.apply(ri, s(['Firestore (8.2.1): ' + t], e)));
      }
      function ui(t) {
        for (var e, n = [], r = 1; r < arguments.length; r++)
          n[r - 1] = arguments[r];
        ri.logLevel <= C.WARN &&
          ((e = n.map(ai)),
          ri.warn.apply(ri, s(['Firestore (8.2.1): ' + t], e)));
      }
      function ai(e) {
        if ('string' == typeof e) return e;
        try {
          return JSON.stringify(e);
        } catch (t) {
          return e;
        }
      }
      function ci(t) {
        void 0 === t && (t = 'Unexpected state');
        t = 'FIRESTORE (8.2.1) INTERNAL ASSERTION FAILED: ' + t;
        throw (si(t), new Error(t));
      }
      function hi(t) {
        t || ci();
      }
      var fi =
        ((li.t = function () {
          for (
            var t =
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
              e = Math.floor(256 / t.length) * t.length,
              n = '';
            n.length < 20;

          )
            for (
              var r = (function (t) {
                  var e =
                      'undefined' != typeof self &&
                      (self.crypto || self.msCrypto),
                    n = new Uint8Array(t);
                  if (e && 'function' == typeof e.getRandomValues)
                    e.getRandomValues(n);
                  else
                    for (var r = 0; r < t; r++)
                      n[r] = Math.floor(256 * Math.random());
                  return n;
                })(40),
                i = 0;
              i < r.length;
              ++i
            )
              n.length < 20 && r[i] < e && (n += t.charAt(r[i] % t.length));
          return n;
        }),
        li);
      function li() {}
      function pi(t, e) {
        return t < e ? -1 : e < t ? 1 : 0;
      }
      function di(t, n, r) {
        return (
          t.length === n.length &&
          t.every(function (t, e) {
            return r(t, n[e]);
          })
        );
      }
      function yi(t) {
        return t + '\0';
      }
      var vi =
        ((gi.fromBase64String = function (t) {
          return new gi(atob(t));
        }),
        (gi.fromUint8Array = function (t) {
          return new gi(
            (function (t) {
              for (var e = '', n = 0; n < t.length; ++n)
                e += String.fromCharCode(t[n]);
              return e;
            })(t)
          );
        }),
        (gi.prototype.toBase64 = function () {
          return (t = this.i), btoa(t);
          var t;
        }),
        (gi.prototype.toUint8Array = function () {
          return (function (t) {
            for (var e = new Uint8Array(t.length), n = 0; n < t.length; n++)
              e[n] = t.charCodeAt(n);
            return e;
          })(this.i);
        }),
        (gi.prototype.o = function () {
          return 2 * this.i.length;
        }),
        (gi.prototype.u = function (t) {
          return pi(this.i, t.i);
        }),
        (gi.prototype.isEqual = function (t) {
          return this.i === t.i;
        }),
        gi);
      function gi(t) {
        this.i = t;
      }
      vi.h = new vi('');
      var mi,
        bi = {
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
        wi = (t(Ti, (mi = Error)), Ti),
        Ii =
          ((_i.fromBase64String = function (t) {
            try {
              return new _i(vi.fromBase64String(t));
            } catch (t) {
              throw new wi(
                bi.INVALID_ARGUMENT,
                'Failed to construct data from Base64 string: ' + t
              );
            }
          }),
          (_i.fromUint8Array = function (t) {
            return new _i(vi.fromUint8Array(t));
          }),
          (_i.prototype.toBase64 = function () {
            return this.l.toBase64();
          }),
          (_i.prototype.toUint8Array = function () {
            return this.l.toUint8Array();
          }),
          (_i.prototype.toString = function () {
            return 'Bytes(base64: ' + this.toBase64() + ')';
          }),
          (_i.prototype.isEqual = function (t) {
            return this.l.isEqual(t.l);
          }),
          _i),
        Ei = function (t) {
          this._ = t;
        };
      function _i(t) {
        this.l = t;
      }
      function Ti(t, e) {
        var n = this;
        return (
          ((n = mi.call(this, e) || this).code = t),
          (n.message = e),
          (n.name = 'FirebaseError'),
          (n.toString = function () {
            return n.name + ': [code=' + n.code + ']: ' + n.message;
          }),
          n
        );
      }
      function Ni() {
        if ('undefined' == typeof Uint8Array)
          throw new wi(
            bi.UNIMPLEMENTED,
            'Uint8Arrays are not available in this environment.'
          );
      }
      function Ai() {
        if ('undefined' == typeof atob)
          throw new wi(
            bi.UNIMPLEMENTED,
            'Blobs are unavailable in Firestore in this environment.'
          );
      }
      var Si,
        xi =
          (t(Li, (Si = Ei)),
          (Li.fromBase64String = function (t) {
            return Ai(), new Li(Ii.fromBase64String(t));
          }),
          (Li.fromUint8Array = function (t) {
            return Ni(), new Li(Ii.fromUint8Array(t));
          }),
          (Li.prototype.toBase64 = function () {
            return Ai(), this._.toBase64();
          }),
          (Li.prototype.toUint8Array = function () {
            return Ni(), this._.toUint8Array();
          }),
          (Li.prototype.isEqual = function (t) {
            return this._.isEqual(t._);
          }),
          (Li.prototype.toString = function () {
            return 'Blob(base64: ' + this.toBase64() + ')';
          }),
          Li),
        Di = function (t, e, n, r, i, o) {
          (this.T = t),
            (this.persistenceKey = e),
            (this.host = n),
            (this.ssl = r),
            (this.forceLongPolling = i),
            (this.I = o);
        },
        Oi =
          (Object.defineProperty(Pi.prototype, 'm', {
            get: function () {
              return '(default)' === this.database;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Pi.prototype.isEqual = function (t) {
            return (
              t instanceof Pi &&
              t.projectId === this.projectId &&
              t.database === this.database
            );
          }),
          Pi),
        ki =
          ((Ci.prototype.A = function () {
            return null != this.uid;
          }),
          (Ci.prototype.R = function () {
            return this.A() ? 'uid:' + this.uid : 'anonymous-user';
          }),
          (Ci.prototype.isEqual = function (t) {
            return t.uid === this.uid;
          }),
          Ci);
      function Ci(t) {
        this.uid = t;
      }
      function Pi(t, e) {
        (this.projectId = t), (this.database = e || '(default)');
      }
      function Li() {
        return (null !== Si && Si.apply(this, arguments)) || this;
      }
      (ki.UNAUTHENTICATED = new ki(null)),
        (ki.P = new ki('google-credentials-uid')),
        (ki.g = new ki('first-party-uid'));
      function Ri(t, e) {
        (this.user = e),
          (this.type = 'OAuth'),
          (this.V = {}),
          (this.V.Authorization = 'Bearer ' + t);
      }
      var Vi =
          ((Gi.prototype.getToken = function () {
            return Promise.resolve(null);
          }),
          (Gi.prototype.v = function () {}),
          (Gi.prototype.S = function (t) {
            (this.p = t)(ki.UNAUTHENTICATED);
          }),
          (Gi.prototype.D = function () {
            this.p = null;
          }),
          Gi),
        Mi =
          ((Bi.prototype.getToken = function () {
            var e = this,
              n = this.F,
              t = this.forceRefresh;
            return (
              (this.forceRefresh = !1),
              this.auth
                ? this.auth.getToken(t).then(function (t) {
                    return e.F !== n
                      ? (oi(
                          'FirebaseCredentialsProvider',
                          'getToken aborted due to token change.'
                        ),
                        e.getToken())
                      : t
                      ? (hi('string' == typeof t.accessToken),
                        new Ri(t.accessToken, e.currentUser))
                      : null;
                  })
                : Promise.resolve(null)
            );
          }),
          (Bi.prototype.v = function () {
            this.forceRefresh = !0;
          }),
          (Bi.prototype.S = function (t) {
            (this.p = t), this.N && t(this.currentUser);
          }),
          (Bi.prototype.D = function () {
            this.auth && this.auth.removeAuthTokenListener(this.C),
              (this.C = null),
              (this.p = null);
          }),
          (Bi.prototype.O = function () {
            var t = this.auth && this.auth.getUid();
            return hi(null === t || 'string' == typeof t), new ki(t);
          }),
          Bi),
        Ui =
          (Object.defineProperty(Hi.prototype, 'V', {
            get: function () {
              var t = { 'X-Goog-AuthUser': this.M },
                e = this.k.auth.getAuthHeaderValueForFirstParty([]);
              return e && (t.Authorization = e), t;
            },
            enumerable: !1,
            configurable: !0
          }),
          Hi),
        ji =
          ((zi.prototype.getToken = function () {
            return Promise.resolve(new Ui(this.k, this.M));
          }),
          (zi.prototype.S = function (t) {
            t(ki.g);
          }),
          (zi.prototype.D = function () {}),
          (zi.prototype.v = function () {}),
          zi),
        Fi =
          ((qi.prototype.$ = function (t) {
            return (
              (this.previousValue = Math.max(t, this.previousValue)),
              this.previousValue
            );
          }),
          (qi.prototype.next = function () {
            var t = ++this.previousValue;
            return this.B && this.B(t), t;
          }),
          qi);
      function qi(t, e) {
        var n = this;
        (this.previousValue = t),
          e &&
            ((e.L = function (t) {
              return n.$(t);
            }),
            (this.B = function (t) {
              return e.q(t);
            }));
      }
      function zi(t, e) {
        (this.k = t), (this.M = e);
      }
      function Hi(t, e) {
        (this.k = t),
          (this.M = e),
          (this.type = 'FirstParty'),
          (this.user = ki.g);
      }
      function Bi(t) {
        var e = this;
        (this.C = null),
          (this.currentUser = ki.UNAUTHENTICATED),
          (this.N = !1),
          (this.F = 0),
          (this.p = null),
          (this.forceRefresh = !1),
          (this.C = function () {
            e.F++,
              (e.currentUser = e.O()),
              (e.N = !0),
              e.p && e.p(e.currentUser);
          }),
          (this.F = 0),
          (this.auth = t.getImmediate({ optional: !0 })),
          this.auth
            ? this.auth.addAuthTokenListener(this.C)
            : (this.C(null),
              t.get().then(
                function (t) {
                  (e.auth = t), e.C && e.auth.addAuthTokenListener(e.C);
                },
                function () {}
              ));
      }
      function Gi() {
        this.p = null;
      }
      Fi.U = -1;
      var Ki,
        Ji,
        Wi =
          ((oo.now = function () {
            return oo.fromMillis(Date.now());
          }),
          (oo.fromDate = function (t) {
            return oo.fromMillis(t.getTime());
          }),
          (oo.fromMillis = function (t) {
            var e = Math.floor(t / 1e3);
            return new oo(e, 1e6 * (t - 1e3 * e));
          }),
          (oo.prototype.toDate = function () {
            return new Date(this.toMillis());
          }),
          (oo.prototype.toMillis = function () {
            return 1e3 * this.seconds + this.nanoseconds / 1e6;
          }),
          (oo.prototype.K = function (t) {
            return this.seconds === t.seconds
              ? pi(this.nanoseconds, t.nanoseconds)
              : pi(this.seconds, t.seconds);
          }),
          (oo.prototype.isEqual = function (t) {
            return (
              t.seconds === this.seconds && t.nanoseconds === this.nanoseconds
            );
          }),
          (oo.prototype.toString = function () {
            return (
              'Timestamp(seconds=' +
              this.seconds +
              ', nanoseconds=' +
              this.nanoseconds +
              ')'
            );
          }),
          (oo.prototype.toJSON = function () {
            return { seconds: this.seconds, nanoseconds: this.nanoseconds };
          }),
          (oo.prototype.valueOf = function () {
            var t = this.seconds - -62135596800;
            return (
              String(t).padStart(12, '0') +
              '.' +
              String(this.nanoseconds).padStart(9, '0')
            );
          }),
          oo),
        Xi =
          ((io.W = function (t) {
            return new io(t);
          }),
          (io.min = function () {
            return new io(new Wi(0, 0));
          }),
          (io.prototype.u = function (t) {
            return this.timestamp.K(t.timestamp);
          }),
          (io.prototype.isEqual = function (t) {
            return this.timestamp.isEqual(t.timestamp);
          }),
          (io.prototype.j = function () {
            return (
              1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3
            );
          }),
          (io.prototype.toString = function () {
            return 'SnapshotVersion(' + this.timestamp.toString() + ')';
          }),
          (io.prototype.G = function () {
            return this.timestamp;
          }),
          io),
        $ =
          (Object.defineProperty(ro.prototype, 'length', {
            get: function () {
              return this.H;
            },
            enumerable: !1,
            configurable: !0
          }),
          (ro.prototype.isEqual = function (t) {
            return 0 === ro.J(this, t);
          }),
          (ro.prototype.child = function (t) {
            var e = this.segments.slice(this.offset, this.limit());
            return (
              t instanceof ro
                ? t.forEach(function (t) {
                    e.push(t);
                  })
                : e.push(t),
              this.Y(e)
            );
          }),
          (ro.prototype.limit = function () {
            return this.offset + this.length;
          }),
          (ro.prototype.X = function (t) {
            return (
              (t = void 0 === t ? 1 : t),
              this.Y(this.segments, this.offset + t, this.length - t)
            );
          }),
          (ro.prototype.Z = function () {
            return this.Y(this.segments, this.offset, this.length - 1);
          }),
          (ro.prototype.tt = function () {
            return this.segments[this.offset];
          }),
          (ro.prototype.et = function () {
            return this.get(this.length - 1);
          }),
          (ro.prototype.get = function (t) {
            return this.segments[this.offset + t];
          }),
          (ro.prototype.nt = function () {
            return 0 === this.length;
          }),
          (ro.prototype.st = function (t) {
            if (t.length < this.length) return !1;
            for (var e = 0; e < this.length; e++)
              if (this.get(e) !== t.get(e)) return !1;
            return !0;
          }),
          (ro.prototype.it = function (t) {
            if (this.length + 1 !== t.length) return !1;
            for (var e = 0; e < this.length; e++)
              if (this.get(e) !== t.get(e)) return !1;
            return !0;
          }),
          (ro.prototype.forEach = function (t) {
            for (var e = this.offset, n = this.limit(); e < n; e++)
              t(this.segments[e]);
          }),
          (ro.prototype.rt = function () {
            return this.segments.slice(this.offset, this.limit());
          }),
          (ro.J = function (t, e) {
            for (var n = Math.min(t.length, e.length), r = 0; r < n; r++) {
              var i = t.get(r),
                o = e.get(r);
              if (i < o) return -1;
              if (o < i) return 1;
            }
            return t.length < e.length ? -1 : t.length > e.length ? 1 : 0;
          }),
          ro),
        Yi =
          (t(no, (Ji = $)),
          (no.prototype.Y = function (t, e, n) {
            return new no(t, e, n);
          }),
          (no.prototype.ot = function () {
            return this.rt().join('/');
          }),
          (no.prototype.toString = function () {
            return this.ot();
          }),
          (no.ct = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            for (var n = [], r = 0, i = t; r < i.length; r++) {
              var o = i[r];
              if (0 <= o.indexOf('//'))
                throw new wi(
                  bi.INVALID_ARGUMENT,
                  'Invalid segment (' +
                    o +
                    '). Paths must not contain // in them.'
                );
              n.push.apply(
                n,
                o.split('/').filter(function (t) {
                  return 0 < t.length;
                })
              );
            }
            return new no(n);
          }),
          (no.at = function () {
            return new no([]);
          }),
          no),
        $i = /^[_a-zA-Z][_a-zA-Z0-9]*$/,
        Qi =
          (t(eo, (Ki = $)),
          (eo.prototype.Y = function (t, e, n) {
            return new eo(t, e, n);
          }),
          (eo.ut = function (t) {
            return $i.test(t);
          }),
          (eo.prototype.ot = function () {
            return this.rt()
              .map(function (t) {
                return (
                  (t = t.replace(/\\/g, '\\\\').replace(/`/g, '\\`')),
                  eo.ut(t) || (t = '`' + t + '`'),
                  t
                );
              })
              .join('.');
          }),
          (eo.prototype.toString = function () {
            return this.ot();
          }),
          (eo.prototype.ht = function () {
            return 1 === this.length && '__name__' === this.get(0);
          }),
          (eo.lt = function () {
            return new eo(['__name__']);
          }),
          (eo._t = function (t) {
            for (
              var e = [],
                n = '',
                r = 0,
                i = function () {
                  if (0 === n.length)
                    throw new wi(
                      bi.INVALID_ARGUMENT,
                      'Invalid field path (' +
                        t +
                        "). Paths must not be empty, begin with '.', end with '.', or contain '..'"
                    );
                  e.push(n), (n = '');
                },
                o = !1;
              r < t.length;

            ) {
              var s = t[r];
              if ('\\' === s) {
                if (r + 1 === t.length)
                  throw new wi(
                    bi.INVALID_ARGUMENT,
                    'Path has trailing escape character: ' + t
                  );
                var u = t[r + 1];
                if ('\\' !== u && '.' !== u && '`' !== u)
                  throw new wi(
                    bi.INVALID_ARGUMENT,
                    'Path has invalid escape sequence: ' + t
                  );
                (n += u), (r += 2);
              } else
                '`' === s ? (o = !o) : '.' !== s || o ? (n += s) : i(), r++;
            }
            if ((i(), o))
              throw new wi(bi.INVALID_ARGUMENT, 'Unterminated ` in path: ' + t);
            return new eo(e);
          }),
          (eo.at = function () {
            return new eo([]);
          }),
          eo),
        Zi =
          ((to.ft = function (t) {
            return new to(Yi.ct(t));
          }),
          (to.dt = function (t) {
            return new to(Yi.ct(t).X(5));
          }),
          (to.prototype.wt = function (t) {
            return (
              2 <= this.path.length && this.path.get(this.path.length - 2) === t
            );
          }),
          (to.prototype.isEqual = function (t) {
            return null !== t && 0 === Yi.J(this.path, t.path);
          }),
          (to.prototype.toString = function () {
            return this.path.toString();
          }),
          (to.J = function (t, e) {
            return Yi.J(t.path, e.path);
          }),
          (to.Et = function (t) {
            return t.length % 2 == 0;
          }),
          (to.Tt = function (t) {
            return new to(new Yi(t.slice()));
          }),
          to);
      function to(t) {
        this.path = t;
      }
      function eo() {
        return (null !== Ki && Ki.apply(this, arguments)) || this;
      }
      function no() {
        return (null !== Ji && Ji.apply(this, arguments)) || this;
      }
      function ro(t, e, n) {
        void 0 === e ? (e = 0) : e > t.length && ci(),
          void 0 === n ? (n = t.length - e) : n > t.length - e && ci(),
          (this.segments = t),
          (this.offset = e),
          (this.H = n);
      }
      function io(t) {
        this.timestamp = t;
      }
      function oo(t, e) {
        if (((this.seconds = t), (this.nanoseconds = e) < 0))
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Timestamp nanoseconds out of range: ' + e
          );
        if (1e9 <= e)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Timestamp nanoseconds out of range: ' + e
          );
        if (t < -62135596800)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Timestamp seconds out of range: ' + t
          );
        if (253402300800 <= t)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Timestamp seconds out of range: ' + t
          );
      }
      function so(t) {
        var e,
          n = 0;
        for (e in t) Object.prototype.hasOwnProperty.call(t, e) && n++;
        return n;
      }
      function uo(t, e) {
        for (var n in t)
          Object.prototype.hasOwnProperty.call(t, n) && e(n, t[n]);
      }
      function ao(t) {
        for (var e in t)
          if (Object.prototype.hasOwnProperty.call(t, e)) return !1;
        return !0;
      }
      var co =
          ((fo.prototype.It = function (t) {
            for (var e = 0, n = this.fields; e < n.length; e++)
              if (n[e].st(t)) return !0;
            return !1;
          }),
          (fo.prototype.isEqual = function (t) {
            return di(this.fields, t.fields, function (t, e) {
              return t.isEqual(e);
            });
          }),
          fo),
        ho = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);
      function fo(t) {
        (this.fields = t).sort(Qi.J);
      }
      function lo(t) {
        if ((hi(!!t), 'string' != typeof t))
          return { seconds: po(t.seconds), nanos: po(t.nanos) };
        var e = 0,
          n = ho.exec(t);
        hi(!!n),
          n[1] &&
            ((n = ((n = n[1]) + '000000000').substr(0, 9)), (e = Number(n)));
        t = new Date(t);
        return { seconds: Math.floor(t.getTime() / 1e3), nanos: e };
      }
      function po(t) {
        return 'number' == typeof t ? t : 'string' == typeof t ? Number(t) : 0;
      }
      function yo(t) {
        return 'string' == typeof t
          ? vi.fromBase64String(t)
          : vi.fromUint8Array(t);
      }
      function vo(t) {
        return (
          'server_timestamp' ===
          (null ===
            (t = (
              (null === (t = null == t ? void 0 : t.mapValue) || void 0 === t
                ? void 0
                : t.fields) || {}
            ).__type__) || void 0 === t
            ? void 0
            : t.stringValue)
        );
      }
      function go(t) {
        t = lo(t.mapValue.fields.__local_write_time__.timestampValue);
        return new Wi(t.seconds, t.nanos);
      }
      function mo(t) {
        return null == t;
      }
      function bo(t) {
        return 0 === t && 1 / t == -1 / 0;
      }
      function wo(t) {
        return (
          'number' == typeof t &&
          Number.isInteger(t) &&
          !bo(t) &&
          t <= Number.MAX_SAFE_INTEGER &&
          t >= Number.MIN_SAFE_INTEGER
        );
      }
      function Io(t) {
        return 'nullValue' in t
          ? 0
          : 'booleanValue' in t
          ? 1
          : 'integerValue' in t || 'doubleValue' in t
          ? 2
          : 'timestampValue' in t
          ? 3
          : 'stringValue' in t
          ? 5
          : 'bytesValue' in t
          ? 6
          : 'referenceValue' in t
          ? 7
          : 'geoPointValue' in t
          ? 8
          : 'arrayValue' in t
          ? 9
          : 'mapValue' in t
          ? vo(t)
            ? 4
            : 10
          : ci();
      }
      function Eo(r, i) {
        var t,
          e = Io(r);
        if (e !== Io(i)) return !1;
        switch (e) {
          case 0:
            return !0;
          case 1:
            return r.booleanValue === i.booleanValue;
          case 4:
            return go(r).isEqual(go(i));
          case 3:
            return (function (t) {
              if (
                'string' == typeof r.timestampValue &&
                'string' == typeof t.timestampValue &&
                r.timestampValue.length === t.timestampValue.length
              )
                return r.timestampValue === t.timestampValue;
              var e = lo(r.timestampValue),
                t = lo(t.timestampValue);
              return e.seconds === t.seconds && e.nanos === t.nanos;
            })(i);
          case 5:
            return r.stringValue === i.stringValue;
          case 6:
            return (t = i), yo(r.bytesValue).isEqual(yo(t.bytesValue));
          case 7:
            return r.referenceValue === i.referenceValue;
          case 8:
            return (
              (e = i),
              po((t = r).geoPointValue.latitude) ===
                po(e.geoPointValue.latitude) &&
                po(t.geoPointValue.longitude) === po(e.geoPointValue.longitude)
            );
          case 2:
            return (function (t, e) {
              if ('integerValue' in t && 'integerValue' in e)
                return po(t.integerValue) === po(e.integerValue);
              if ('doubleValue' in t && 'doubleValue' in e) {
                (t = po(t.doubleValue)), (e = po(e.doubleValue));
                return t === e ? bo(t) === bo(e) : isNaN(t) && isNaN(e);
              }
              return !1;
            })(r, i);
          case 9:
            return di(r.arrayValue.values || [], i.arrayValue.values || [], Eo);
          case 10:
            return (function () {
              var t,
                e = r.mapValue.fields || {},
                n = i.mapValue.fields || {};
              if (so(e) !== so(n)) return !1;
              for (t in e)
                if (e.hasOwnProperty(t) && (void 0 === n[t] || !Eo(e[t], n[t])))
                  return !1;
              return !0;
            })();
          default:
            return ci();
        }
      }
      function _o(t, e) {
        return (
          void 0 !==
          (t.values || []).find(function (t) {
            return Eo(t, e);
          })
        );
      }
      function To(t, e) {
        var n,
          r,
          i = Io(t),
          o = Io(e);
        if (i !== o) return pi(i, o);
        switch (i) {
          case 0:
            return 0;
          case 1:
            return pi(t.booleanValue, e.booleanValue);
          case 2:
            return (
              (n = e),
              (r = po(t.integerValue || t.doubleValue)),
              (n = po(n.integerValue || n.doubleValue)),
              r < n
                ? -1
                : n < r
                ? 1
                : r === n
                ? 0
                : isNaN(r)
                ? isNaN(n)
                  ? 0
                  : -1
                : 1
            );
          case 3:
            return No(t.timestampValue, e.timestampValue);
          case 4:
            return No(go(t), go(e));
          case 5:
            return pi(t.stringValue, e.stringValue);
          case 6:
            return (function (t, e) {
              (t = yo(t)), (e = yo(e));
              return t.u(e);
            })(t.bytesValue, e.bytesValue);
          case 7:
            return (function (t, e) {
              for (
                var n = t.split('/'), r = e.split('/'), i = 0;
                i < n.length && i < r.length;
                i++
              ) {
                var o = pi(n[i], r[i]);
                if (0 !== o) return o;
              }
              return pi(n.length, r.length);
            })(t.referenceValue, e.referenceValue);
          case 8:
            return (
              (i = t.geoPointValue),
              (r = e.geoPointValue),
              0 !== (n = pi(po(i.latitude), po(r.latitude)))
                ? n
                : pi(po(i.longitude), po(r.longitude))
            );
          case 9:
            return (function (t, e) {
              for (
                var n = t.values || [], r = e.values || [], i = 0;
                i < n.length && i < r.length;
                ++i
              ) {
                var o = To(n[i], r[i]);
                if (o) return o;
              }
              return pi(n.length, r.length);
            })(t.arrayValue, e.arrayValue);
          case 10:
            return (function (t, e) {
              var n = t.fields || {},
                r = Object.keys(n),
                i = e.fields || {},
                o = Object.keys(i);
              r.sort(), o.sort();
              for (var s = 0; s < r.length && s < o.length; ++s) {
                var u = pi(r[s], o[s]);
                if (0 !== u) return u;
                u = To(n[r[s]], i[o[s]]);
                if (0 !== u) return u;
              }
              return pi(r.length, o.length);
            })(t.mapValue, e.mapValue);
          default:
            throw ci();
        }
      }
      function No(t, e) {
        if (
          'string' == typeof t &&
          'string' == typeof e &&
          t.length === e.length
        )
          return pi(t, e);
        var n = lo(t),
          t = lo(e),
          e = pi(n.seconds, t.seconds);
        return 0 !== e ? e : pi(n.nanos, t.nanos);
      }
      function Ao(t) {
        return (function s(t) {
          return 'nullValue' in t
            ? 'null'
            : 'booleanValue' in t
            ? '' + t.booleanValue
            : 'integerValue' in t
            ? '' + t.integerValue
            : 'doubleValue' in t
            ? '' + t.doubleValue
            : 'timestampValue' in t
            ? (function (t) {
                var t = lo(t);
                return 'time(' + t.seconds + ',' + t.nanos + ')';
              })(t.timestampValue)
            : 'stringValue' in t
            ? t.stringValue
            : 'bytesValue' in t
            ? yo(t.bytesValue).toBase64()
            : 'referenceValue' in t
            ? ((e = t.referenceValue), Zi.dt(e).toString())
            : 'geoPointValue' in t
            ? 'geo(' + (e = t.geoPointValue).latitude + ',' + e.longitude + ')'
            : 'arrayValue' in t
            ? (function (t) {
                for (
                  var e = '[', n = !0, r = 0, i = t.values || [];
                  r < i.length;
                  r++
                )
                  n ? (n = !1) : (e += ','), (e += s(i[r]));
                return e + ']';
              })(t.arrayValue)
            : 'mapValue' in t
            ? (function (t) {
                for (
                  var e = '{',
                    n = !0,
                    r = 0,
                    i = Object.keys(t.fields || {}).sort();
                  r < i.length;
                  r++
                ) {
                  var o = i[r];
                  n ? (n = !1) : (e += ','), (e += o + ':' + s(t.fields[o]));
                }
                return e + '}';
              })(t.mapValue)
            : ci();
          var e;
        })(t);
      }
      function So(t, e) {
        return {
          referenceValue:
            'projects/' +
            t.projectId +
            '/databases/' +
            t.database +
            '/documents/' +
            e.path.ot()
        };
      }
      function xo(t) {
        return t && 'integerValue' in t;
      }
      function Do(t) {
        return !!t && 'arrayValue' in t;
      }
      function Oo(t) {
        return t && 'nullValue' in t;
      }
      function ko(t) {
        return t && 'doubleValue' in t && isNaN(Number(t.doubleValue));
      }
      function Co(t) {
        return t && 'mapValue' in t;
      }
      var Po =
          ((Vo.empty = function () {
            return new Vo({ mapValue: {} });
          }),
          (Vo.prototype.field = function (t) {
            if (t.nt()) return this.proto;
            for (var e = this.proto, n = 0; n < t.length - 1; ++n) {
              if (!e.mapValue.fields) return null;
              if (!Co((e = e.mapValue.fields[t.get(n)]))) return null;
            }
            return (e = (e.mapValue.fields || {})[t.et()]) || null;
          }),
          (Vo.prototype.isEqual = function (t) {
            return Eo(this.proto, t.proto);
          }),
          Vo),
        Lo =
          ((Ro.prototype.set = function (t, e) {
            return this.Pt(t, e), this;
          }),
          (Ro.prototype.delete = function (t) {
            return this.Pt(t, null), this;
          }),
          (Ro.prototype.Pt = function (t, e) {
            for (var n = this.Rt, r = 0; r < t.length - 1; ++r)
              var i = t.get(r),
                o = n.get(i),
                n =
                  (o instanceof Map ||
                    ((o =
                      o && 10 === Io(o)
                        ? new Map(Object.entries(o.mapValue.fields || {}))
                        : new Map()),
                    n.set(i, o)),
                  o);
            n.set(t.et(), e);
          }),
          (Ro.prototype.yt = function () {
            var t = this.gt(Qi.at(), this.Rt);
            return null != t ? new Po(t) : this.At;
          }),
          (Ro.prototype.gt = function (r, t) {
            var i = this,
              o = !1,
              e = this.At.field(r),
              s = Co(e) ? Object.assign({}, e.mapValue.fields) : {};
            return (
              t.forEach(function (t, e) {
                var n;
                t instanceof Map
                  ? null != (n = i.gt(r.child(e), t)) && ((s[e] = n), (o = !0))
                  : null !== t
                  ? ((s[e] = t), (o = !0))
                  : s.hasOwnProperty(e) && (delete s[e], (o = !0));
              }),
              o ? { mapValue: { fields: s } } : null
            );
          }),
          Ro);
      function Ro(t) {
        void 0 === t && (t = Po.empty()), (this.At = t), (this.Rt = new Map());
      }
      function Vo(t) {
        this.proto = t;
      }
      var Mo,
        Uo,
        jo,
        U = function (t, e) {
          (this.key = t), (this.version = e);
        },
        Fo =
          (t(Ko, (jo = U)),
          (Ko.prototype.field = function (t) {
            return this.Vt.field(t);
          }),
          (Ko.prototype.data = function () {
            return this.Vt;
          }),
          (Ko.prototype.vt = function () {
            return this.Vt.proto;
          }),
          (Ko.prototype.isEqual = function (t) {
            return (
              t instanceof Ko &&
              this.key.isEqual(t.key) &&
              this.version.isEqual(t.version) &&
              this.bt === t.bt &&
              this.hasCommittedMutations === t.hasCommittedMutations &&
              this.Vt.isEqual(t.Vt)
            );
          }),
          (Ko.prototype.toString = function () {
            return (
              'Document(' +
              this.key +
              ', ' +
              this.version +
              ', ' +
              this.Vt.toString() +
              ', {hasLocalMutations: ' +
              this.bt +
              '}), {hasCommittedMutations: ' +
              this.hasCommittedMutations +
              '})'
            );
          }),
          Object.defineProperty(Ko.prototype, 'hasPendingWrites', {
            get: function () {
              return this.bt || this.hasCommittedMutations;
            },
            enumerable: !1,
            configurable: !0
          }),
          Ko),
        qo =
          (t(Go, (Uo = U)),
          (Go.prototype.toString = function () {
            return 'NoDocument(' + this.key + ', ' + this.version + ')';
          }),
          Object.defineProperty(Go.prototype, 'hasPendingWrites', {
            get: function () {
              return this.hasCommittedMutations;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Go.prototype.isEqual = function (t) {
            return (
              t instanceof Go &&
              t.hasCommittedMutations === this.hasCommittedMutations &&
              t.version.isEqual(this.version) &&
              t.key.isEqual(this.key)
            );
          }),
          Go),
        zo =
          (t(Bo, (Mo = U)),
          (Bo.prototype.toString = function () {
            return 'UnknownDocument(' + this.key + ', ' + this.version + ')';
          }),
          Object.defineProperty(Bo.prototype, 'hasPendingWrites', {
            get: function () {
              return !0;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Bo.prototype.isEqual = function (t) {
            return (
              t instanceof Bo &&
              t.version.isEqual(this.version) &&
              t.key.isEqual(this.key)
            );
          }),
          Bo),
        Ho = function (t, e, n, r, i, o, s) {
          void 0 === e && (e = null),
            void 0 === n && (n = []),
            void 0 === r && (r = []),
            void 0 === i && (i = null),
            void 0 === o && (o = null),
            void 0 === s && (s = null),
            (this.path = t),
            (this.collectionGroup = e),
            (this.orderBy = n),
            (this.filters = r),
            (this.limit = i),
            (this.startAt = o),
            (this.endAt = s),
            (this.St = null);
        };
      function Bo() {
        return (null !== Mo && Mo.apply(this, arguments)) || this;
      }
      function Go(t, e, n) {
        var r = this;
        return (
          ((r = Uo.call(this, t, e) || this).hasCommittedMutations = !(
            !n || !n.hasCommittedMutations
          )),
          r
        );
      }
      function Ko(t, e, n, r) {
        var i = this;
        return (
          ((i = jo.call(this, t, e) || this).Vt = n),
          (i.bt = !!r.bt),
          (i.hasCommittedMutations = !!r.hasCommittedMutations),
          i
        );
      }
      function Jo(t, e, n, r, i, o, s) {
        return (
          void 0 === e && (e = null),
          void 0 === n && (n = []),
          void 0 === r && (r = []),
          void 0 === i && (i = null),
          void 0 === o && (o = null),
          void 0 === s && (s = null),
          new Ho(t, e, n, r, i, o, s)
        );
      }
      function Wo(t) {
        var e = t;
        return (
          null === e.St &&
            ((t = e.path.ot()),
            null !== e.collectionGroup && (t += '|cg:' + e.collectionGroup),
            (t += '|f:'),
            (t += e.filters
              .map(function (t) {
                return (t = t).field.ot() + t.op.toString() + Ao(t.value);
              })
              .join(',')),
            (t += '|ob:'),
            (t += e.orderBy
              .map(function (t) {
                return (t = t).field.ot() + t.dir;
              })
              .join(',')),
            mo(e.limit) || ((t += '|l:'), (t += e.limit)),
            e.startAt && ((t += '|lb:'), (t += _s(e.startAt))),
            e.endAt && ((t += '|ub:'), (t += _s(e.endAt))),
            (e.St = t)),
          e.St
        );
      }
      function Xo(t, e) {
        if (t.limit !== e.limit) return !1;
        if (t.orderBy.length !== e.orderBy.length) return !1;
        for (var n, r, i = 0; i < t.orderBy.length; i++)
          if (
            ((n = t.orderBy[i]),
            (r = e.orderBy[i]),
            n.dir !== r.dir || !n.field.isEqual(r.field))
          )
            return !1;
        if (t.filters.length !== e.filters.length) return !1;
        for (var o, s, u = 0; u < t.filters.length; u++)
          if (
            ((o = t.filters[u]),
            (s = e.filters[u]),
            o.op !== s.op || !o.field.isEqual(s.field) || !Eo(o.value, s.value))
          )
            return !1;
        return (
          t.collectionGroup === e.collectionGroup &&
          !!t.path.isEqual(e.path) &&
          !!As(t.startAt, e.startAt) &&
          As(t.endAt, e.endAt)
        );
      }
      function Yo(t) {
        return (
          Zi.Et(t.path) && null === t.collectionGroup && 0 === t.filters.length
        );
      }
      var $o,
        Qo =
          (t(Zo, ($o = function () {})),
          (Zo.create = function (t, e, n) {
            return t.ht()
              ? 'in' === e || 'not-in' === e
                ? this.Dt(t, e, n)
                : new rs(t, e, n)
              : 'array-contains' === e
              ? new ds(t, n)
              : 'in' === e
              ? new ys(t, n)
              : 'not-in' === e
              ? new vs(t, n)
              : 'array-contains-any' === e
              ? new gs(t, n)
              : new Zo(t, e, n);
          }),
          (Zo.Dt = function (t, e, n) {
            return new ('in' === e ? is : os)(t, n);
          }),
          (Zo.prototype.matches = function (t) {
            t = t.field(this.field);
            return '!=' === this.op
              ? null !== t && this.Ct(To(t, this.value))
              : null !== t &&
                  Io(this.value) === Io(t) &&
                  this.Ct(To(t, this.value));
          }),
          (Zo.prototype.Ct = function (t) {
            switch (this.op) {
              case '<':
                return t < 0;
              case '<=':
                return t <= 0;
              case '==':
                return 0 === t;
              case '!=':
                return 0 !== t;
              case '>':
                return 0 < t;
              case '>=':
                return 0 <= t;
              default:
                return ci();
            }
          }),
          (Zo.prototype.xt = function () {
            return 0 <= ['<', '<=', '>', '>=', '!=', 'not-in'].indexOf(this.op);
          }),
          Zo);
      function Zo(t, e, n) {
        var r = this;
        return (
          ((r = $o.call(this) || this).field = t), (r.op = e), (r.value = n), r
        );
      }
      var ts,
        es,
        ns,
        rs =
          (t(as, (ns = Qo)),
          (as.prototype.matches = function (t) {
            t = Zi.J(t.key, this.key);
            return this.Ct(t);
          }),
          as),
        is =
          (t(us, (es = Qo)),
          (us.prototype.matches = function (e) {
            return this.keys.some(function (t) {
              return t.isEqual(e.key);
            });
          }),
          us),
        os =
          (t(ss, (ts = Qo)),
          (ss.prototype.matches = function (e) {
            return !this.keys.some(function (t) {
              return t.isEqual(e.key);
            });
          }),
          ss);
      function ss(t, e) {
        var n = this;
        return ((n = ts.call(this, t, 'not-in', e) || this).keys = cs(0, e)), n;
      }
      function us(t, e) {
        var n = this;
        return ((n = es.call(this, t, 'in', e) || this).keys = cs(0, e)), n;
      }
      function as(t, e, n) {
        var r = this;
        return (
          ((r = ns.call(this, t, e, n) || this).key = Zi.dt(n.referenceValue)),
          r
        );
      }
      function cs(t, e) {
        return (
          (null === (e = e.arrayValue) || void 0 === e ? void 0 : e.values) ||
          []
        ).map(function (t) {
          return Zi.dt(t.referenceValue);
        });
      }
      var hs,
        fs,
        ls,
        ps,
        ds =
          (t(Es, (ps = Qo)),
          (Es.prototype.matches = function (t) {
            t = t.field(this.field);
            return Do(t) && _o(t.arrayValue, this.value);
          }),
          Es),
        ys =
          (t(Is, (ls = Qo)),
          (Is.prototype.matches = function (t) {
            t = t.field(this.field);
            return null !== t && _o(this.value.arrayValue, t);
          }),
          Is),
        vs =
          (t(ws, (fs = Qo)),
          (ws.prototype.matches = function (t) {
            if (_o(this.value.arrayValue, { nullValue: 'NULL_VALUE' }))
              return !1;
            t = t.field(this.field);
            return null !== t && !_o(this.value.arrayValue, t);
          }),
          ws),
        gs =
          (t(bs, (hs = Qo)),
          (bs.prototype.matches = function (t) {
            var e = this,
              t = t.field(this.field);
            return (
              !(!Do(t) || !t.arrayValue.values) &&
              t.arrayValue.values.some(function (t) {
                return _o(e.value.arrayValue, t);
              })
            );
          }),
          bs),
        ms = function (t, e) {
          (this.position = t), (this.before = e);
        };
      function bs(t, e) {
        return hs.call(this, t, 'array-contains-any', e) || this;
      }
      function ws(t, e) {
        return fs.call(this, t, 'not-in', e) || this;
      }
      function Is(t, e) {
        return ls.call(this, t, 'in', e) || this;
      }
      function Es(t, e) {
        return ps.call(this, t, 'array-contains', e) || this;
      }
      function _s(t) {
        return (t.before ? 'b' : 'a') + ':' + t.position.map(Ao).join(',');
      }
      var Ts = function (t, e) {
        void 0 === e && (e = 'asc'), (this.field = t), (this.dir = e);
      };
      function Ns(t, e, n) {
        for (var r = 0, i = 0; i < t.position.length; i++) {
          var o = e[i],
            s = t.position[i],
            r = o.field.ht()
              ? Zi.J(Zi.dt(s.referenceValue), n.key)
              : To(s, n.field(o.field));
          if (('desc' === o.dir && (r *= -1), 0 !== r)) break;
        }
        return t.before ? r <= 0 : r < 0;
      }
      function As(t, e) {
        if (null === t) return null === e;
        if (null === e) return !1;
        if (t.before !== e.before || t.position.length !== e.position.length)
          return !1;
        for (var n = 0; n < t.position.length; n++)
          if (!Eo(t.position[n], e.position[n])) return !1;
        return !0;
      }
      var Ss = function (t, e, n, r, i, o, s, u) {
        void 0 === e && (e = null),
          void 0 === n && (n = []),
          void 0 === r && (r = []),
          void 0 === i && (i = null),
          void 0 === o && (o = 'F'),
          void 0 === s && (s = null),
          void 0 === u && (u = null),
          (this.path = t),
          (this.collectionGroup = e),
          (this.Nt = n),
          (this.filters = r),
          (this.limit = i),
          (this.limitType = o),
          (this.startAt = s),
          (this.endAt = u),
          (this.Ft = null),
          (this.Ot = null),
          this.startAt,
          this.endAt;
      };
      function xs(t, e, n, r, i, o, s, u) {
        return new Ss(t, e, n, r, i, o, s, u);
      }
      function Ds(t) {
        return new Ss(t);
      }
      function Os(t) {
        return !mo(t.limit) && 'F' === t.limitType;
      }
      function ks(t) {
        return !mo(t.limit) && 'L' === t.limitType;
      }
      function Cs(t) {
        return 0 < t.Nt.length ? t.Nt[0].field : null;
      }
      function Ps(t) {
        for (var e = 0, n = t.filters; e < n.length; e++) {
          var r = n[e];
          if (r.xt()) return r.field;
        }
        return null;
      }
      function Ls(t) {
        return null !== t.collectionGroup;
      }
      function Rs(t) {
        var e = t;
        if (null === e.Ft) {
          e.Ft = [];
          var n = Ps(e),
            t = Cs(e);
          if (null !== n && null === t)
            n.ht() || e.Ft.push(new Ts(n)), e.Ft.push(new Ts(Qi.lt(), 'asc'));
          else {
            for (var r = !1, i = 0, o = e.Nt; i < o.length; i++) {
              var s = o[i];
              e.Ft.push(s), s.field.ht() && (r = !0);
            }
            r ||
              ((n = 0 < e.Nt.length ? e.Nt[e.Nt.length - 1].dir : 'asc'),
              e.Ft.push(new Ts(Qi.lt(), n)));
          }
        }
        return e.Ft;
      }
      function Vs(t) {
        var e = t;
        if (!e.Ot)
          if ('F' === e.limitType)
            e.Ot = Jo(
              e.path,
              e.collectionGroup,
              Rs(e),
              e.filters,
              e.limit,
              e.startAt,
              e.endAt
            );
          else {
            for (var n = [], r = 0, i = Rs(e); r < i.length; r++) {
              var o = i[r],
                s = 'desc' === o.dir ? 'asc' : 'desc';
              n.push(new Ts(o.field, s));
            }
            var u = e.endAt ? new ms(e.endAt.position, !e.endAt.before) : null,
              t = e.startAt
                ? new ms(e.startAt.position, !e.startAt.before)
                : null;
            e.Ot = Jo(e.path, e.collectionGroup, n, e.filters, e.limit, u, t);
          }
        return e.Ot;
      }
      function Ms(t, e, n) {
        return new Ss(
          t.path,
          t.collectionGroup,
          t.Nt.slice(),
          t.filters.slice(),
          e,
          n,
          t.startAt,
          t.endAt
        );
      }
      function Us(t, e) {
        return Xo(Vs(t), Vs(e)) && t.limitType === e.limitType;
      }
      function js(t) {
        return Wo(Vs(t)) + '|lt:' + t.limitType;
      }
      function Fs(t) {
        return (
          'Query(target=' +
          ((e = Vs(t)),
          (n = e.path.ot()),
          null !== e.collectionGroup &&
            (n += ' collectionGroup=' + e.collectionGroup),
          0 < e.filters.length &&
            (n +=
              ', filters: [' +
              e.filters
                .map(function (t) {
                  return (t = t).field.ot() + ' ' + t.op + ' ' + Ao(t.value);
                })
                .join(', ') +
              ']'),
          mo(e.limit) || (n += ', limit: ' + e.limit),
          0 < e.orderBy.length &&
            (n +=
              ', orderBy: [' +
              e.orderBy
                .map(function (t) {
                  return (t = t).field.ot() + ' (' + t.dir + ')';
                })
                .join(', ') +
              ']'),
          e.startAt && (n += ', startAt: ' + _s(e.startAt)),
          e.endAt && (n += ', endAt: ' + _s(e.endAt)),
          'Target(' + n + ')') +
          '; limitType=' +
          t.limitType +
          ')'
        );
        var e, n;
      }
      function qs(i, t) {
        return (
          (e = i),
          (n = t.key.path),
          (null !== e.collectionGroup
            ? t.key.wt(e.collectionGroup) && e.path.st(n)
            : Zi.Et(e.path)
            ? e.path.isEqual(n)
            : e.path.it(n)) &&
            (function (t) {
              for (var e = 0, n = i.Nt; e < n.length; e++) {
                var r = n[e];
                if (!r.field.ht() && null === t.field(r.field)) return;
              }
              return 1;
            })(t) &&
            (function (t) {
              for (var e = 0, n = i.filters; e < n.length; e++)
                if (!n[e].matches(t)) return;
              return 1;
            })(t) &&
            ((n = t),
            (!(t = i).startAt || Ns(t.startAt, Rs(t), n)) &&
              (!t.endAt || !Ns(t.endAt, Rs(t), n)))
        );
        var e, n;
      }
      function zs(u) {
        return function (t, e) {
          for (var n = !1, r = 0, i = Rs(u); r < i.length; r++) {
            var o = i[r],
              s = (function (t, r, e) {
                e = t.field.ht()
                  ? Zi.J(r.key, e.key)
                  : (function (t, e) {
                      var n = r.field(t),
                        t = e.field(t);
                      return null !== n && null !== t ? To(n, t) : ci();
                    })(t.field, e);
                switch (t.dir) {
                  case 'asc':
                    return e;
                  case 'desc':
                    return -1 * e;
                  default:
                    return ci();
                }
              })(o, t, e);
            if (0 !== s) return s;
            n = n || o.field.ht();
          }
          return 0;
        };
      }
      var Hs =
        ((Bs.prototype.Lt = function (t) {
          return new Bs(
            this.target,
            this.targetId,
            this.kt,
            t,
            this.Mt,
            this.lastLimboFreeSnapshotVersion,
            this.resumeToken
          );
        }),
        (Bs.prototype.$t = function (t, e) {
          return new Bs(
            this.target,
            this.targetId,
            this.kt,
            this.sequenceNumber,
            e,
            this.lastLimboFreeSnapshotVersion,
            t
          );
        }),
        (Bs.prototype.Bt = function (t) {
          return new Bs(
            this.target,
            this.targetId,
            this.kt,
            this.sequenceNumber,
            this.Mt,
            t,
            this.resumeToken
          );
        }),
        Bs);
      function Bs(t, e, n, r, i, o, s) {
        void 0 === i && (i = Xi.min()),
          void 0 === o && (o = Xi.min()),
          void 0 === s && (s = vi.h),
          (this.target = t),
          (this.targetId = e),
          (this.kt = n),
          (this.sequenceNumber = r),
          (this.Mt = i),
          (this.lastLimboFreeSnapshotVersion = o),
          (this.resumeToken = s);
      }
      function Gs(t, e) {
        if (t.qt) {
          if (isNaN(e)) return { doubleValue: 'NaN' };
          if (e === 1 / 0) return { doubleValue: 'Infinity' };
          if (e === -1 / 0) return { doubleValue: '-Infinity' };
        }
        return { doubleValue: bo(e) ? '-0' : e };
      }
      function Ks(t) {
        return { integerValue: '' + t };
      }
      function Js(t, e) {
        return wo(e) ? Ks(e) : Gs(t, e);
      }
      $ = function () {
        this.Ut = void 0;
      };
      function Ws(t, e) {
        return t instanceof uu
          ? xo((t = e)) || (t && 'doubleValue' in t)
            ? e
            : { integerValue: 0 }
          : null;
      }
      var Xs,
        Ys,
        $s = (t(tu, (Ys = $)), tu),
        Qs = (t(Zs, (Xs = $)), Zs);
      function Zs(t) {
        var e = this;
        return ((e = Xs.call(this) || this).elements = t), e;
      }
      function tu() {
        return (null !== Ys && Ys.apply(this, arguments)) || this;
      }
      function eu(t, e) {
        for (var n = hu(e), r = 0, i = t.elements; r < i.length; r++)
          !(function (e) {
            n.some(function (t) {
              return Eo(t, e);
            }) || n.push(e);
          })(i[r]);
        return { arrayValue: { values: n } };
      }
      var nu,
        ru = (t(iu, (nu = $)), iu);
      function iu(t) {
        var e = this;
        return ((e = nu.call(this) || this).elements = t), e;
      }
      function ou(t, e) {
        for (var n = hu(e), r = 0, i = t.elements; r < i.length; r++)
          !(function (e) {
            n = n.filter(function (t) {
              return !Eo(t, e);
            });
          })(i[r]);
        return { arrayValue: { values: n } };
      }
      var su,
        uu = (t(au, (su = $)), au);
      function au(t, e) {
        var n = this;
        return ((n = su.call(this) || this).Kt = t), (n.Qt = e), n;
      }
      function cu(t) {
        return po(t.integerValue || t.doubleValue);
      }
      function hu(t) {
        return Do(t) && t.arrayValue.values ? t.arrayValue.values.slice() : [];
      }
      function fu(t, e) {
        (this.version = t), (this.transformResults = e);
      }
      var lu = function (t, e) {
          (this.field = t), (this.transform = e);
        },
        pu =
          ((du.Wt = function () {
            return new du();
          }),
          (du.exists = function (t) {
            return new du(void 0, t);
          }),
          (du.updateTime = function (t) {
            return new du(t);
          }),
          Object.defineProperty(du.prototype, 'jt', {
            get: function () {
              return void 0 === this.updateTime && void 0 === this.exists;
            },
            enumerable: !1,
            configurable: !0
          }),
          (du.prototype.isEqual = function (t) {
            return (
              this.exists === t.exists &&
              (this.updateTime
                ? !!t.updateTime && this.updateTime.isEqual(t.updateTime)
                : !t.updateTime)
            );
          }),
          du);
      function du(t, e) {
        (this.updateTime = t), (this.exists = e);
      }
      function yu(t, e) {
        return void 0 !== t.updateTime
          ? e instanceof Fo && e.version.isEqual(t.updateTime)
          : void 0 === t.exists || t.exists === e instanceof Fo;
      }
      U = function () {};
      function vu(t, e, n, r) {
        return t instanceof Iu
          ? (function (t, e, n, r) {
              if (!yu(t.Gt, e)) return e;
              var i = t.value;
              t.fieldTransforms &&
                ((r = Su(t.fieldTransforms, n, e, r)),
                (i = xu(t.fieldTransforms, i, r)));
              e = mu(e);
              return new Fo(t.key, e, i, { bt: !0 });
            })(t, e, r, n)
          : t instanceof Eu
          ? (function (t, e, n, r) {
              if (!yu(t.Gt, e)) return e;
              var i = mu(e),
                r = Nu(t, e, Su(t.fieldTransforms, n, e, r));
              return new Fo(t.key, i, r, { bt: !0 });
            })(t, e, r, n)
          : ((e = e), yu((t = t).Gt, e) ? new qo(t.key, Xi.min()) : e);
      }
      function gu(t, e) {
        return (
          t.type === e.type &&
          !!t.key.isEqual(e.key) &&
          !!t.Gt.isEqual(e.Gt) &&
          ((n = t.fieldTransforms),
          (r = e.fieldTransforms),
          !!(
            (void 0 === n && void 0 === r) ||
            (n &&
              r &&
              di(n, r, function (t, e) {
                return (
                  (e = e),
                  (t = t).field.isEqual(e.field) &&
                    ((t = t.transform),
                    (e = e.transform),
                    (t instanceof Qs && e instanceof Qs) ||
                    (t instanceof ru && e instanceof ru)
                      ? di(t.elements, e.elements, Eo)
                      : t instanceof uu && e instanceof uu
                      ? Eo(t.Qt, e.Qt)
                      : t instanceof $s && e instanceof $s)
                );
              }))
          )) &&
          (0 === t.type
            ? t.value.isEqual(e.value)
            : 1 !== t.type || (t.data.isEqual(e.data) && t.zt.isEqual(e.zt)))
        );
        var n, r;
      }
      function mu(t) {
        return t instanceof Fo ? t.version : Xi.min();
      }
      var bu,
        wu,
        Iu = (t(Tu, (wu = U)), Tu),
        Eu = (t(_u, (bu = U)), _u);
      function _u(t, e, n, r, i) {
        void 0 === i && (i = []);
        var o = this;
        return (
          ((o = bu.call(this) || this).key = t),
          (o.data = e),
          (o.zt = n),
          (o.Gt = r),
          (o.fieldTransforms = i),
          (o.type = 1),
          o
        );
      }
      function Tu(t, e, n, r) {
        void 0 === r && (r = []);
        var i = this;
        return (
          ((i = wu.call(this) || this).key = t),
          (i.value = e),
          (i.Gt = n),
          (i.fieldTransforms = r),
          (i.type = 0),
          i
        );
      }
      function Nu(t, e, n) {
        var r, i, o;
        return (
          (i = t),
          (e = r = e instanceof Fo ? e.data() : Po.empty()),
          (o = new Lo(e)),
          i.zt.fields.forEach(function (t) {
            var e;
            t.nt() ||
              (null !== (e = i.data.field(t)) ? o.set(t, e) : o.delete(t));
          }),
          (r = o.yt()),
          xu(t.fieldTransforms, r, n)
        );
      }
      function Au(t, e, n) {
        var r = [];
        hi(t.length === n.length);
        for (var i = 0; i < n.length; i++) {
          var o = t[i],
            s = o.transform,
            u = null;
          e instanceof Fo && (u = e.field(o.field)),
            r.push(
              ((o = s),
              (s = u),
              (u = n[i]),
              o instanceof Qs ? eu(o, s) : o instanceof ru ? ou(o, s) : u)
            );
        }
        return r;
      }
      function Su(t, e, n, r) {
        for (var i, o = [], s = 0, u = t; s < u.length; s++) {
          var a = u[s],
            c = a.transform,
            h = null;
          n instanceof Fo && (h = n.field(a.field)),
            null === h && r instanceof Fo && (h = r.field(a.field)),
            o.push(
              ((i = h),
              (a = e),
              (h = void 0),
              (c = c) instanceof $s
                ? ((h = {
                    fields: {
                      __type__: { stringValue: 'server_timestamp' },
                      __local_write_time__: {
                        timestampValue: {
                          seconds: a.seconds,
                          nanos: a.nanoseconds
                        }
                      }
                    }
                  }),
                  i && (h.fields.__previous_value__ = i),
                  { mapValue: h })
                : c instanceof Qs
                ? eu(c, i)
                : c instanceof ru
                ? ou(c, i)
                : ((c = Ws((h = c), i)),
                  (i = cu(c) + cu(h.Qt)),
                  xo(c) && xo(h.Qt) ? Ks(i) : Gs(h.Kt, i)))
            );
        }
        return o;
      }
      function xu(t, e, n) {
        for (var r = new Lo(e), i = 0; i < t.length; i++) {
          var o = t[i];
          r.set(o.field, n[i]);
        }
        return r.yt();
      }
      function Du(t) {
        this.count = t;
      }
      var Ou,
        ku,
        Cu,
        Pu = (t(Vu, (Cu = U)), Vu),
        Lu = (t(Ru, (ku = U)), Ru);
      function Ru(t, e) {
        var n = this;
        return (
          ((n = ku.call(this) || this).key = t),
          (n.Gt = e),
          (n.type = 3),
          (n.fieldTransforms = []),
          n
        );
      }
      function Vu(t, e) {
        var n = this;
        return (
          ((n = Cu.call(this) || this).key = t),
          (n.Gt = e),
          (n.type = 2),
          (n.fieldTransforms = []),
          n
        );
      }
      function Mu(t) {
        switch (t) {
          case bi.OK:
            return ci(), 0;
          case bi.CANCELLED:
          case bi.UNKNOWN:
          case bi.DEADLINE_EXCEEDED:
          case bi.RESOURCE_EXHAUSTED:
          case bi.INTERNAL:
          case bi.UNAVAILABLE:
          case bi.UNAUTHENTICATED:
            return;
          case bi.INVALID_ARGUMENT:
          case bi.NOT_FOUND:
          case bi.ALREADY_EXISTS:
          case bi.PERMISSION_DENIED:
          case bi.FAILED_PRECONDITION:
          case bi.ABORTED:
          case bi.OUT_OF_RANGE:
          case bi.UNIMPLEMENTED:
          case bi.DATA_LOSS:
            return 1;
          default:
            return ci(), 0;
        }
      }
      function Uu(t) {
        if (void 0 === t) return si('GRPC error has no .code'), bi.UNKNOWN;
        switch (t) {
          case Ou.OK:
            return bi.OK;
          case Ou.CANCELLED:
            return bi.CANCELLED;
          case Ou.UNKNOWN:
            return bi.UNKNOWN;
          case Ou.DEADLINE_EXCEEDED:
            return bi.DEADLINE_EXCEEDED;
          case Ou.RESOURCE_EXHAUSTED:
            return bi.RESOURCE_EXHAUSTED;
          case Ou.INTERNAL:
            return bi.INTERNAL;
          case Ou.UNAVAILABLE:
            return bi.UNAVAILABLE;
          case Ou.UNAUTHENTICATED:
            return bi.UNAUTHENTICATED;
          case Ou.INVALID_ARGUMENT:
            return bi.INVALID_ARGUMENT;
          case Ou.NOT_FOUND:
            return bi.NOT_FOUND;
          case Ou.ALREADY_EXISTS:
            return bi.ALREADY_EXISTS;
          case Ou.PERMISSION_DENIED:
            return bi.PERMISSION_DENIED;
          case Ou.FAILED_PRECONDITION:
            return bi.FAILED_PRECONDITION;
          case Ou.ABORTED:
            return bi.ABORTED;
          case Ou.OUT_OF_RANGE:
            return bi.OUT_OF_RANGE;
          case Ou.UNIMPLEMENTED:
            return bi.UNIMPLEMENTED;
          case Ou.DATA_LOSS:
            return bi.DATA_LOSS;
          default:
            return ci();
        }
      }
      (($ = Ou = Ou || {})[($.OK = 0)] = 'OK'),
        ($[($.CANCELLED = 1)] = 'CANCELLED'),
        ($[($.UNKNOWN = 2)] = 'UNKNOWN'),
        ($[($.INVALID_ARGUMENT = 3)] = 'INVALID_ARGUMENT'),
        ($[($.DEADLINE_EXCEEDED = 4)] = 'DEADLINE_EXCEEDED'),
        ($[($.NOT_FOUND = 5)] = 'NOT_FOUND'),
        ($[($.ALREADY_EXISTS = 6)] = 'ALREADY_EXISTS'),
        ($[($.PERMISSION_DENIED = 7)] = 'PERMISSION_DENIED'),
        ($[($.UNAUTHENTICATED = 16)] = 'UNAUTHENTICATED'),
        ($[($.RESOURCE_EXHAUSTED = 8)] = 'RESOURCE_EXHAUSTED'),
        ($[($.FAILED_PRECONDITION = 9)] = 'FAILED_PRECONDITION'),
        ($[($.ABORTED = 10)] = 'ABORTED'),
        ($[($.OUT_OF_RANGE = 11)] = 'OUT_OF_RANGE'),
        ($[($.UNIMPLEMENTED = 12)] = 'UNIMPLEMENTED'),
        ($[($.INTERNAL = 13)] = 'INTERNAL'),
        ($[($.UNAVAILABLE = 14)] = 'UNAVAILABLE'),
        ($[($.DATA_LOSS = 15)] = 'DATA_LOSS');
      var ju =
          ((Bu.prototype.Ht = function (t, e) {
            return new Bu(
              this.J,
              this.root.Ht(t, e, this.J).copy(null, null, qu.Jt, null, null)
            );
          }),
          (Bu.prototype.remove = function (t) {
            return new Bu(
              this.J,
              this.root.remove(t, this.J).copy(null, null, qu.Jt, null, null)
            );
          }),
          (Bu.prototype.get = function (t) {
            for (var e = this.root; !e.nt(); ) {
              var n = this.J(t, e.key);
              if (0 === n) return e.value;
              n < 0 ? (e = e.left) : 0 < n && (e = e.right);
            }
            return null;
          }),
          (Bu.prototype.indexOf = function (t) {
            for (var e = 0, n = this.root; !n.nt(); ) {
              var r = this.J(t, n.key);
              if (0 === r) return e + n.left.size;
              n = r < 0 ? n.left : ((e += n.left.size + 1), n.right);
            }
            return -1;
          }),
          (Bu.prototype.nt = function () {
            return this.root.nt();
          }),
          Object.defineProperty(Bu.prototype, 'size', {
            get: function () {
              return this.root.size;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Bu.prototype.Yt = function () {
            return this.root.Yt();
          }),
          (Bu.prototype.Xt = function () {
            return this.root.Xt();
          }),
          (Bu.prototype.Zt = function (t) {
            return this.root.Zt(t);
          }),
          (Bu.prototype.forEach = function (n) {
            this.Zt(function (t, e) {
              return n(t, e), !1;
            });
          }),
          (Bu.prototype.toString = function () {
            var n = [];
            return (
              this.Zt(function (t, e) {
                return n.push(t + ':' + e), !1;
              }),
              '{' + n.join(', ') + '}'
            );
          }),
          (Bu.prototype.te = function (t) {
            return this.root.te(t);
          }),
          (Bu.prototype.ee = function () {
            return new Fu(this.root, null, this.J, !1);
          }),
          (Bu.prototype.ne = function (t) {
            return new Fu(this.root, t, this.J, !1);
          }),
          (Bu.prototype.se = function () {
            return new Fu(this.root, null, this.J, !0);
          }),
          (Bu.prototype.ie = function (t) {
            return new Fu(this.root, t, this.J, !0);
          }),
          Bu),
        Fu =
          ((Hu.prototype.ce = function () {
            var t = this.oe.pop(),
              e = { key: t.key, value: t.value };
            if (this.re)
              for (t = t.left; !t.nt(); ) this.oe.push(t), (t = t.right);
            else for (t = t.right; !t.nt(); ) this.oe.push(t), (t = t.left);
            return e;
          }),
          (Hu.prototype.ae = function () {
            return 0 < this.oe.length;
          }),
          (Hu.prototype.ue = function () {
            if (0 === this.oe.length) return null;
            var t = this.oe[this.oe.length - 1];
            return { key: t.key, value: t.value };
          }),
          Hu),
        qu =
          ((zu.prototype.copy = function (t, e, n, r, i) {
            return new zu(
              null != t ? t : this.key,
              null != e ? e : this.value,
              null != n ? n : this.color,
              null != r ? r : this.left,
              null != i ? i : this.right
            );
          }),
          (zu.prototype.nt = function () {
            return !1;
          }),
          (zu.prototype.Zt = function (t) {
            return (
              this.left.Zt(t) || t(this.key, this.value) || this.right.Zt(t)
            );
          }),
          (zu.prototype.te = function (t) {
            return (
              this.right.te(t) || t(this.key, this.value) || this.left.te(t)
            );
          }),
          (zu.prototype.min = function () {
            return this.left.nt() ? this : this.left.min();
          }),
          (zu.prototype.Yt = function () {
            return this.min().key;
          }),
          (zu.prototype.Xt = function () {
            return this.right.nt() ? this.key : this.right.Xt();
          }),
          (zu.prototype.Ht = function (t, e, n) {
            var r = this,
              i = n(t, r.key);
            return (r =
              i < 0
                ? r.copy(null, null, null, r.left.Ht(t, e, n), null)
                : 0 === i
                ? r.copy(null, e, null, null, null)
                : r.copy(null, null, null, null, r.right.Ht(t, e, n))).he();
          }),
          (zu.prototype.le = function () {
            if (this.left.nt()) return zu.EMPTY;
            var t = this;
            return (
              t.left._e() || t.left.left._e() || (t = t.fe()),
              (t = t.copy(null, null, null, t.left.le(), null)).he()
            );
          }),
          (zu.prototype.remove = function (t, e) {
            var n,
              r = this;
            if (e(t, r.key) < 0)
              r.left.nt() || r.left._e() || r.left.left._e() || (r = r.fe()),
                (r = r.copy(null, null, null, r.left.remove(t, e), null));
            else {
              if (
                (r.left._e() && (r = r.de()),
                r.right.nt() ||
                  r.right._e() ||
                  r.right.left._e() ||
                  (r = r.we()),
                0 === e(t, r.key))
              ) {
                if (r.right.nt()) return zu.EMPTY;
                (n = r.right.min()),
                  (r = r.copy(n.key, n.value, null, null, r.right.le()));
              }
              r = r.copy(null, null, null, null, r.right.remove(t, e));
            }
            return r.he();
          }),
          (zu.prototype._e = function () {
            return this.color;
          }),
          (zu.prototype.he = function () {
            var t = this;
            return (
              t.right._e() && !t.left._e() && (t = t.Ee()),
              t.left._e() && t.left.left._e() && (t = t.de()),
              t.left._e() && t.right._e() && (t = t.Te()),
              t
            );
          }),
          (zu.prototype.fe = function () {
            var t = this.Te();
            return (
              t.right.left._e() &&
                (t = (t = (t = t.copy(
                  null,
                  null,
                  null,
                  null,
                  t.right.de()
                )).Ee()).Te()),
              t
            );
          }),
          (zu.prototype.we = function () {
            var t = this.Te();
            return t.left.left._e() && (t = (t = t.de()).Te()), t;
          }),
          (zu.prototype.Ee = function () {
            var t = this.copy(null, null, zu.RED, null, this.right.left);
            return this.right.copy(null, null, this.color, t, null);
          }),
          (zu.prototype.de = function () {
            var t = this.copy(null, null, zu.RED, this.left.right, null);
            return this.left.copy(null, null, this.color, null, t);
          }),
          (zu.prototype.Te = function () {
            var t = this.left.copy(null, null, !this.left.color, null, null),
              e = this.right.copy(null, null, !this.right.color, null, null);
            return this.copy(null, null, !this.color, t, e);
          }),
          (zu.prototype.Ie = function () {
            var t = this.me();
            return Math.pow(2, t) <= this.size + 1;
          }),
          (zu.prototype.me = function () {
            if (this._e() && this.left._e()) throw ci();
            if (this.right._e()) throw ci();
            var t = this.left.me();
            if (t !== this.right.me()) throw ci();
            return t + (this._e() ? 0 : 1);
          }),
          zu);
      function zu(t, e, n, r, i) {
        (this.key = t),
          (this.value = e),
          (this.color = null != n ? n : zu.RED),
          (this.left = null != r ? r : zu.EMPTY),
          (this.right = null != i ? i : zu.EMPTY),
          (this.size = this.left.size + 1 + this.right.size);
      }
      function Hu(t, e, n, r) {
        (this.re = r), (this.oe = []);
        for (var i = 1; !t.nt(); )
          if (((i = e ? n(t.key, e) : 1), r && (i *= -1), i < 0))
            t = this.re ? t.left : t.right;
          else {
            if (0 === i) {
              this.oe.push(t);
              break;
            }
            this.oe.push(t), (t = this.re ? t.right : t.left);
          }
      }
      function Bu(t, e) {
        (this.J = t), (this.root = e || qu.EMPTY);
      }
      function Gu() {
        this.size = 0;
      }
      (qu.EMPTY = null),
        (qu.RED = !0),
        (qu.Jt = !1),
        (qu.EMPTY =
          (Object.defineProperty(Gu.prototype, 'key', {
            get: function () {
              throw ci();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Gu.prototype, 'value', {
            get: function () {
              throw ci();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Gu.prototype, 'color', {
            get: function () {
              throw ci();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Gu.prototype, 'left', {
            get: function () {
              throw ci();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Gu.prototype, 'right', {
            get: function () {
              throw ci();
            },
            enumerable: !1,
            configurable: !0
          }),
          (Gu.prototype.copy = function (t, e, n, r, i) {
            return this;
          }),
          (Gu.prototype.Ht = function (t, e, n) {
            return new qu(t, e);
          }),
          (Gu.prototype.remove = function (t, e) {
            return this;
          }),
          (Gu.prototype.nt = function () {
            return !0;
          }),
          (Gu.prototype.Zt = function (t) {
            return !1;
          }),
          (Gu.prototype.te = function (t) {
            return !1;
          }),
          (Gu.prototype.Yt = function () {
            return null;
          }),
          (Gu.prototype.Xt = function () {
            return null;
          }),
          (Gu.prototype._e = function () {
            return !1;
          }),
          (Gu.prototype.Ie = function () {
            return !0;
          }),
          (Gu.prototype.me = function () {
            return 0;
          }),
          new Gu()));
      var Ku =
          ((Yu.prototype.has = function (t) {
            return null !== this.data.get(t);
          }),
          (Yu.prototype.first = function () {
            return this.data.Yt();
          }),
          (Yu.prototype.last = function () {
            return this.data.Xt();
          }),
          Object.defineProperty(Yu.prototype, 'size', {
            get: function () {
              return this.data.size;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Yu.prototype.indexOf = function (t) {
            return this.data.indexOf(t);
          }),
          (Yu.prototype.forEach = function (n) {
            this.data.Zt(function (t, e) {
              return n(t), !1;
            });
          }),
          (Yu.prototype.Ae = function (t, e) {
            for (var n = this.data.ne(t[0]); n.ae(); ) {
              var r = n.ce();
              if (0 <= this.J(r.key, t[1])) return;
              e(r.key);
            }
          }),
          (Yu.prototype.Re = function (t, e) {
            for (
              var n = void 0 !== e ? this.data.ne(e) : this.data.ee();
              n.ae();

            )
              if (!t(n.ce().key)) return;
          }),
          (Yu.prototype.Pe = function (t) {
            t = this.data.ne(t);
            return t.ae() ? t.ce().key : null;
          }),
          (Yu.prototype.ee = function () {
            return new Ju(this.data.ee());
          }),
          (Yu.prototype.ne = function (t) {
            return new Ju(this.data.ne(t));
          }),
          (Yu.prototype.add = function (t) {
            return this.copy(this.data.remove(t).Ht(t, !0));
          }),
          (Yu.prototype.delete = function (t) {
            return this.has(t) ? this.copy(this.data.remove(t)) : this;
          }),
          (Yu.prototype.nt = function () {
            return this.data.nt();
          }),
          (Yu.prototype.ye = function (t) {
            var e = this;
            return (
              e.size < t.size && ((e = t), (t = this)),
              t.forEach(function (t) {
                e = e.add(t);
              }),
              e
            );
          }),
          (Yu.prototype.isEqual = function (t) {
            if (!(t instanceof Yu)) return !1;
            if (this.size !== t.size) return !1;
            for (var e = this.data.ee(), n = t.data.ee(); e.ae(); ) {
              var r = e.ce().key,
                i = n.ce().key;
              if (0 !== this.J(r, i)) return !1;
            }
            return !0;
          }),
          (Yu.prototype.rt = function () {
            var e = [];
            return (
              this.forEach(function (t) {
                e.push(t);
              }),
              e
            );
          }),
          (Yu.prototype.toString = function () {
            var e = [];
            return (
              this.forEach(function (t) {
                return e.push(t);
              }),
              'SortedSet(' + e.toString() + ')'
            );
          }),
          (Yu.prototype.copy = function (t) {
            var e = new Yu(this.J);
            return (e.data = t), e;
          }),
          Yu),
        Ju =
          ((Xu.prototype.ce = function () {
            return this.ge.ce().key;
          }),
          (Xu.prototype.ae = function () {
            return this.ge.ae();
          }),
          Xu),
        Wu = new ju(Zi.J);
      function Xu(t) {
        this.ge = t;
      }
      function Yu(t) {
        (this.J = t), (this.data = new ju(this.J));
      }
      var $u = new ju(Zi.J);
      var Qu = new ju(Zi.J);
      var Zu = new Ku(Zi.J);
      function ta() {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        for (var n = Zu, r = 0, i = t; r < i.length; r++)
          var o = i[r], n = n.add(o);
        return n;
      }
      var ea = new Ku(pi);
      var na =
          ((ma.be = function (t) {
            return new ma(t.J);
          }),
          (ma.prototype.has = function (t) {
            return null != this.Ve.get(t);
          }),
          (ma.prototype.get = function (t) {
            return this.Ve.get(t);
          }),
          (ma.prototype.first = function () {
            return this.pe.Yt();
          }),
          (ma.prototype.last = function () {
            return this.pe.Xt();
          }),
          (ma.prototype.nt = function () {
            return this.pe.nt();
          }),
          (ma.prototype.indexOf = function (t) {
            t = this.Ve.get(t);
            return t ? this.pe.indexOf(t) : -1;
          }),
          Object.defineProperty(ma.prototype, 'size', {
            get: function () {
              return this.pe.size;
            },
            enumerable: !1,
            configurable: !0
          }),
          (ma.prototype.forEach = function (n) {
            this.pe.Zt(function (t, e) {
              return n(t), !1;
            });
          }),
          (ma.prototype.add = function (t) {
            var e = this.delete(t.key);
            return e.copy(e.Ve.Ht(t.key, t), e.pe.Ht(t, null));
          }),
          (ma.prototype.delete = function (t) {
            var e = this.get(t);
            return e ? this.copy(this.Ve.remove(t), this.pe.remove(e)) : this;
          }),
          (ma.prototype.isEqual = function (t) {
            if (!(t instanceof ma)) return !1;
            if (this.size !== t.size) return !1;
            for (var e = this.pe.ee(), n = t.pe.ee(); e.ae(); ) {
              var r = e.ce().key,
                i = n.ce().key;
              if (!r.isEqual(i)) return !1;
            }
            return !0;
          }),
          (ma.prototype.toString = function () {
            var e = [];
            return (
              this.forEach(function (t) {
                e.push(t.toString());
              }),
              0 === e.length
                ? 'DocumentSet ()'
                : 'DocumentSet (\n  ' + e.join('  \n') + '\n)'
            );
          }),
          (ma.prototype.copy = function (t, e) {
            var n = new ma();
            return (n.J = this.J), (n.Ve = t), (n.pe = e), n;
          }),
          ma),
        ra =
          ((ga.prototype.track = function (t) {
            var e = t.doc.key,
              n = this.ve.get(e);
            !n || (0 !== t.type && 3 === n.type)
              ? (this.ve = this.ve.Ht(e, t))
              : 3 === t.type && 1 !== n.type
              ? (this.ve = this.ve.Ht(e, { type: n.type, doc: t.doc }))
              : 2 === t.type && 2 === n.type
              ? (this.ve = this.ve.Ht(e, { type: 2, doc: t.doc }))
              : 2 === t.type && 0 === n.type
              ? (this.ve = this.ve.Ht(e, { type: 0, doc: t.doc }))
              : 1 === t.type && 0 === n.type
              ? (this.ve = this.ve.remove(e))
              : 1 === t.type && 2 === n.type
              ? (this.ve = this.ve.Ht(e, { type: 1, doc: n.doc }))
              : 0 === t.type && 1 === n.type
              ? (this.ve = this.ve.Ht(e, { type: 2, doc: t.doc }))
              : ci();
          }),
          (ga.prototype.Se = function () {
            var n = [];
            return (
              this.ve.Zt(function (t, e) {
                n.push(e);
              }),
              n
            );
          }),
          ga),
        ia =
          ((va.Fe = function (t, e, n, r) {
            var i = [];
            return (
              e.forEach(function (t) {
                i.push({ type: 0, doc: t });
              }),
              new va(t, e, na.be(e), i, n, r, !0, !1)
            );
          }),
          Object.defineProperty(va.prototype, 'hasPendingWrites', {
            get: function () {
              return !this.Ce.nt();
            },
            enumerable: !1,
            configurable: !0
          }),
          (va.prototype.isEqual = function (t) {
            if (
              !(
                this.fromCache === t.fromCache &&
                this.xe === t.xe &&
                this.Ce.isEqual(t.Ce) &&
                Us(this.query, t.query) &&
                this.docs.isEqual(t.docs) &&
                this.De.isEqual(t.De)
              )
            )
              return !1;
            var e = this.docChanges,
              n = t.docChanges;
            if (e.length !== n.length) return !1;
            for (var r = 0; r < e.length; r++)
              if (e[r].type !== n[r].type || !e[r].doc.isEqual(n[r].doc))
                return !1;
            return !0;
          }),
          va),
        oa =
          ((ya.$e = function (t, e) {
            var n = new Map();
            return n.set(t, sa.Be(t, e)), new ya(Xi.min(), n, ea, Wu, ta());
          }),
          ya),
        sa =
          ((da.Be = function (t, e) {
            return new da(vi.h, e, ta(), ta(), ta());
          }),
          da),
        ua = function (t, e, n, r) {
          (this.We = t),
            (this.removedTargetIds = e),
            (this.key = n),
            (this.je = r);
        },
        aa = function (t, e) {
          (this.targetId = t), (this.Ge = e);
        },
        ca = function (t, e, n, r) {
          void 0 === n && (n = vi.h),
            void 0 === r && (r = null),
            (this.state = t),
            (this.targetIds = e),
            (this.resumeToken = n),
            (this.cause = r);
        },
        ha =
          (Object.defineProperty(pa.prototype, 'qe', {
            get: function () {
              return this.Ye;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(pa.prototype, 'resumeToken', {
            get: function () {
              return this.Je;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(pa.prototype, 'Ze', {
            get: function () {
              return 0 !== this.ze;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(pa.prototype, 'tn', {
            get: function () {
              return this.Xe;
            },
            enumerable: !1,
            configurable: !0
          }),
          (pa.prototype.en = function (t) {
            0 < t.o() && ((this.Xe = !0), (this.Je = t));
          }),
          (pa.prototype.nn = function () {
            var n = ta(),
              r = ta(),
              i = ta();
            return (
              this.He.forEach(function (t, e) {
                switch (e) {
                  case 0:
                    n = n.add(t);
                    break;
                  case 2:
                    r = r.add(t);
                    break;
                  case 1:
                    i = i.add(t);
                    break;
                  default:
                    ci();
                }
              }),
              new sa(this.Je, this.Ye, n, r, i)
            );
          }),
          (pa.prototype.sn = function () {
            (this.Xe = !1), (this.He = wa());
          }),
          (pa.prototype.rn = function (t, e) {
            (this.Xe = !0), (this.He = this.He.Ht(t, e));
          }),
          (pa.prototype.on = function (t) {
            (this.Xe = !0), (this.He = this.He.remove(t));
          }),
          (pa.prototype.cn = function () {
            this.ze += 1;
          }),
          (pa.prototype.an = function () {
            --this.ze;
          }),
          (pa.prototype.un = function () {
            (this.Xe = !0), (this.Ye = !0);
          }),
          pa),
        fa =
          ((la.prototype.wn = function (t) {
            for (var e = 0, n = t.We; e < n.length; e++) {
              var r = n[e];
              t.je instanceof Fo
                ? this.En(r, t.je)
                : t.je instanceof qo && this.Tn(r, t.key, t.je);
            }
            for (var i = 0, o = t.removedTargetIds; i < o.length; i++)
              (r = o[i]), this.Tn(r, t.key, t.je);
          }),
          (la.prototype.In = function (n) {
            var r = this;
            this.mn(n, function (t) {
              var e = r.An(t);
              switch (n.state) {
                case 0:
                  r.Rn(t) && e.en(n.resumeToken);
                  break;
                case 1:
                  e.an(), e.Ze || e.sn(), e.en(n.resumeToken);
                  break;
                case 2:
                  e.an(), e.Ze || r.removeTarget(t);
                  break;
                case 3:
                  r.Rn(t) && (e.un(), e.en(n.resumeToken));
                  break;
                case 4:
                  r.Rn(t) && (r.Pn(t), e.en(n.resumeToken));
                  break;
                default:
                  ci();
              }
            });
          }),
          (la.prototype.mn = function (t, n) {
            var r = this;
            0 < t.targetIds.length
              ? t.targetIds.forEach(n)
              : this.ln.forEach(function (t, e) {
                  r.Rn(e) && n(e);
                });
          }),
          (la.prototype.yn = function (t) {
            var e = t.targetId,
              n = t.Ge.count,
              t = this.gn(e);
            t &&
              (Yo((t = t.target))
                ? 0 === n
                  ? ((t = new Zi(t.path)), this.Tn(e, t, new qo(t, Xi.min())))
                  : hi(1 === n)
                : this.Vn(e) !== n && (this.Pn(e), (this.dn = this.dn.add(e))));
          }),
          (la.prototype.pn = function (r) {
            var i = this,
              o = new Map();
            this.ln.forEach(function (t, e) {
              var n = i.gn(e);
              n &&
                (t.qe &&
                  Yo(n.target) &&
                  ((n = new Zi(n.target.path)),
                  null !== i._n.get(n) ||
                    i.bn(e, n) ||
                    i.Tn(e, n, new qo(n, r))),
                t.tn && (o.set(e, t.nn()), t.sn()));
            });
            var s = ta();
            this.fn.forEach(function (t, e) {
              var n = !0;
              e.Re(function (t) {
                t = i.gn(t);
                return !t || 2 === t.kt || (n = !1);
              }),
                n && (s = s.add(t));
            });
            var t = new oa(r, o, this.dn, this._n, s);
            return (this._n = Wu), (this.fn = ba()), (this.dn = new Ku(pi)), t;
          }),
          (la.prototype.En = function (t, e) {
            var n;
            this.Rn(t) &&
              ((n = this.bn(t, e.key) ? 2 : 0),
              this.An(t).rn(e.key, n),
              (this._n = this._n.Ht(e.key, e)),
              (this.fn = this.fn.Ht(e.key, this.vn(e.key).add(t))));
          }),
          (la.prototype.Tn = function (t, e, n) {
            var r;
            this.Rn(t) &&
              ((r = this.An(t)),
              this.bn(t, e) ? r.rn(e, 1) : r.on(e),
              (this.fn = this.fn.Ht(e, this.vn(e).delete(t))),
              n && (this._n = this._n.Ht(e, n)));
          }),
          (la.prototype.removeTarget = function (t) {
            this.ln.delete(t);
          }),
          (la.prototype.Vn = function (t) {
            var e = this.An(t).nn();
            return this.hn.Sn(t).size + e.Ue.size - e.Ke.size;
          }),
          (la.prototype.cn = function (t) {
            this.An(t).cn();
          }),
          (la.prototype.An = function (t) {
            var e = this.ln.get(t);
            return e || ((e = new ha()), this.ln.set(t, e)), e;
          }),
          (la.prototype.vn = function (t) {
            var e = this.fn.get(t);
            return e || ((e = new Ku(pi)), (this.fn = this.fn.Ht(t, e))), e;
          }),
          (la.prototype.Rn = function (t) {
            var e = null !== this.gn(t);
            return (
              e || oi('WatchChangeAggregator', 'Detected inactive target', t), e
            );
          }),
          (la.prototype.gn = function (t) {
            var e = this.ln.get(t);
            return e && e.Ze ? null : this.hn.Dn(t);
          }),
          (la.prototype.Pn = function (e) {
            var n = this;
            this.ln.set(e, new ha()),
              this.hn.Sn(e).forEach(function (t) {
                n.Tn(e, t, null);
              });
          }),
          (la.prototype.bn = function (t, e) {
            return this.hn.Sn(t).has(e);
          }),
          la);
      function la(t) {
        (this.hn = t),
          (this.ln = new Map()),
          (this._n = Wu),
          (this.fn = ba()),
          (this.dn = new Ku(pi));
      }
      function pa() {
        (this.ze = 0),
          (this.He = wa()),
          (this.Je = vi.h),
          (this.Ye = !1),
          (this.Xe = !0);
      }
      function da(t, e, n, r, i) {
        (this.resumeToken = t),
          (this.qe = e),
          (this.Ue = n),
          (this.Qe = r),
          (this.Ke = i);
      }
      function ya(t, e, n, r, i) {
        (this.Mt = t),
          (this.Oe = e),
          (this.ke = n),
          (this.Me = r),
          (this.Le = i);
      }
      function va(t, e, n, r, i, o, s, u) {
        (this.query = t),
          (this.docs = e),
          (this.De = n),
          (this.docChanges = r),
          (this.Ce = i),
          (this.fromCache = o),
          (this.xe = s),
          (this.Ne = u);
      }
      function ga() {
        this.ve = new ju(Zi.J);
      }
      function ma(n) {
        (this.J = n
          ? function (t, e) {
              return n(t, e) || Zi.J(t.key, e.key);
            }
          : function (t, e) {
              return Zi.J(t.key, e.key);
            }),
          (this.Ve = $u),
          (this.pe = new ju(this.J));
      }
      function ba() {
        return new ju(Zi.J);
      }
      function wa() {
        return new ju(Zi.J);
      }
      var Ia = { asc: 'ASCENDING', desc: 'DESCENDING' },
        Ea = {
          '<': 'LESS_THAN',
          '<=': 'LESS_THAN_OR_EQUAL',
          '>': 'GREATER_THAN',
          '>=': 'GREATER_THAN_OR_EQUAL',
          '==': 'EQUAL',
          '!=': 'NOT_EQUAL',
          'array-contains': 'ARRAY_CONTAINS',
          in: 'IN',
          'not-in': 'NOT_IN',
          'array-contains-any': 'ARRAY_CONTAINS_ANY'
        },
        _a = function (t, e) {
          (this.T = t), (this.qt = e);
        };
      function Ta(t, e) {
        return t.qt
          ? new Date(1e3 * e.seconds)
              .toISOString()
              .replace(/\.\d*/, '')
              .replace('Z', '') +
              '.' +
              ('000000000' + e.nanoseconds).slice(-9) +
              'Z'
          : { seconds: '' + e.seconds, nanos: e.nanoseconds };
      }
      function Na(t, e) {
        return t.qt ? e.toBase64() : e.toUint8Array();
      }
      function Aa(t) {
        return hi(!!t), Xi.W(((t = lo(t)), new Wi(t.seconds, t.nanos)));
      }
      function Sa(t, e) {
        return new Yi(['projects', t.projectId, 'databases', t.database])
          .child('documents')
          .child(e)
          .ot();
      }
      function xa(t) {
        t = Yi.ct(t);
        return hi(Ka(t)), t;
      }
      function Da(t, e) {
        return Sa(t.T, e.path);
      }
      function Oa(t, e) {
        e = xa(e);
        if (e.get(1) !== t.T.projectId)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Tried to deserialize key from different project: ' +
              e.get(1) +
              ' vs ' +
              t.T.projectId
          );
        if (e.get(3) !== t.T.database)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Tried to deserialize key from different database: ' +
              e.get(3) +
              ' vs ' +
              t.T.database
          );
        return new Zi(La(e));
      }
      function ka(t, e) {
        return Sa(t.T, e);
      }
      function Ca(t) {
        t = xa(t);
        return 4 === t.length ? Yi.at() : La(t);
      }
      function Pa(t) {
        return new Yi([
          'projects',
          t.T.projectId,
          'databases',
          t.T.database
        ]).ot();
      }
      function La(t) {
        return hi(4 < t.length && 'documents' === t.get(4)), t.X(5);
      }
      function Ra(t, e, n) {
        return { name: Da(t, e), fields: n.proto.mapValue.fields };
      }
      function Va(t, e) {
        var n, r, i;
        if (e instanceof Iu) n = { update: Ra(t, e.key, e.value) };
        else if (e instanceof Pu) n = { delete: Da(t, e.key) };
        else if (e instanceof Eu)
          n = {
            update: Ra(t, e.key, e.data),
            updateMask:
              ((i = e.zt),
              (r = []),
              i.fields.forEach(function (t) {
                return r.push(t.ot());
              }),
              { fieldPaths: r })
          };
        else {
          if (!(e instanceof Lu)) return ci();
          n = { verify: Da(t, e.key) };
        }
        return (
          0 < e.fieldTransforms.length &&
            (n.updateTransforms = e.fieldTransforms.map(function (t) {
              var e = t.transform;
              if (e instanceof $s)
                return {
                  fieldPath: t.field.ot(),
                  setToServerValue: 'REQUEST_TIME'
                };
              if (e instanceof Qs)
                return {
                  fieldPath: t.field.ot(),
                  appendMissingElements: { values: e.elements }
                };
              if (e instanceof ru)
                return {
                  fieldPath: t.field.ot(),
                  removeAllFromArray: { values: e.elements }
                };
              if (e instanceof uu)
                return { fieldPath: t.field.ot(), increment: e.Qt };
              throw ci();
            })),
          e.Gt.jt ||
            (n.currentDocument =
              void 0 !== (i = e.Gt).updateTime
                ? { updateTime: ((e = t), (t = i.updateTime), Ta(e, t.G())) }
                : void 0 !== i.exists
                ? { exists: i.exists }
                : ci()),
          n
        );
      }
      function Ma(e, t) {
        var n = t.currentDocument
            ? void 0 !== (s = t.currentDocument).updateTime
              ? pu.updateTime(Aa(s.updateTime))
              : void 0 !== s.exists
              ? pu.exists(s.exists)
              : pu.Wt()
            : pu.Wt(),
          r = t.updateTransforms
            ? t.updateTransforms.map(function (t) {
                return (function (t, e) {
                  var n,
                    r = null;
                  'setToServerValue' in e
                    ? (hi('REQUEST_TIME' === e.setToServerValue),
                      (r = new $s()))
                    : 'appendMissingElements' in e
                    ? ((n = e.appendMissingElements.values || []),
                      (r = new Qs(n)))
                    : 'removeAllFromArray' in e
                    ? ((n = e.removeAllFromArray.values || []), (r = new ru(n)))
                    : 'increment' in e
                    ? (r = new uu(t, e.increment))
                    : ci();
                  e = Qi._t(e.fieldPath);
                  return new lu(e, r);
                })(e, t);
              })
            : [];
        if (t.update) {
          t.update.name;
          var i = Oa(e, t.update.name),
            o = new Po({ mapValue: { fields: t.update.fields } });
          if (t.updateMask) {
            var s =
              ((s = t.updateMask.fieldPaths || []),
              new co(
                s.map(function (t) {
                  return Qi._t(t);
                })
              ));
            return new Eu(i, o, s, n, r);
          }
          return new Iu(i, o, n, r);
        }
        if (t.delete) {
          r = Oa(e, t.delete);
          return new Pu(r, n);
        }
        if (t.verify) {
          t = Oa(e, t.verify);
          return new Lu(t, n);
        }
        return ci();
      }
      function Ua(t, e) {
        return { documents: [ka(t, e.path)] };
      }
      function ja(t, e) {
        var n = { structuredQuery: {} },
          r = e.path;
        null !== e.collectionGroup
          ? ((n.parent = ka(t, r)),
            (n.structuredQuery.from = [
              { collectionId: e.collectionGroup, allDescendants: !0 }
            ]))
          : ((n.parent = ka(t, r.Z())),
            (n.structuredQuery.from = [{ collectionId: r.et() }]));
        r = (function (t) {
          if (0 !== t.length) {
            t = t.map(function (t) {
              if ('==' === t.op) {
                if (ko(t.value))
                  return { unaryFilter: { field: Ha(t.field), op: 'IS_NAN' } };
                if (Oo(t.value))
                  return { unaryFilter: { field: Ha(t.field), op: 'IS_NULL' } };
              } else if ('!=' === t.op) {
                if (ko(t.value))
                  return {
                    unaryFilter: { field: Ha(t.field), op: 'IS_NOT_NAN' }
                  };
                if (Oo(t.value))
                  return {
                    unaryFilter: { field: Ha(t.field), op: 'IS_NOT_NULL' }
                  };
              }
              return {
                fieldFilter: {
                  field: Ha(t.field),
                  op: ((e = t.op), Ea[e]),
                  value: t.value
                }
              };
              var e;
            });
            return 1 === t.length
              ? t[0]
              : { compositeFilter: { op: 'AND', filters: t } };
          }
        })(e.filters);
        r && (n.structuredQuery.where = r);
        r = (function (t) {
          if (0 !== t.length)
            return t.map(function (t) {
              return {
                field: Ha((t = t).field),
                direction: ((t = t.dir), Ia[t])
              };
            });
        })(e.orderBy);
        r && (n.structuredQuery.orderBy = r);
        (r = e.limit), (r = t.qt || mo(r) ? r : { value: r });
        return (
          null !== r && (n.structuredQuery.limit = r),
          e.startAt && (n.structuredQuery.startAt = qa(e.startAt)),
          e.endAt && (n.structuredQuery.endAt = qa(e.endAt)),
          n
        );
      }
      function Fa(t) {
        var e = Ca(t.parent),
          n = t.structuredQuery,
          r = n.from ? n.from.length : 0,
          i = null;
        0 < r &&
          (hi(1 === r),
          (s = n.from[0]).allDescendants
            ? (i = s.collectionId)
            : (e = e.child(s.collectionId)));
        var o = [];
        n.where &&
          (o = (function e(t) {
            return t
              ? void 0 !== t.unaryFilter
                ? [Ga(t)]
                : void 0 !== t.fieldFilter
                ? [
                    ((n = t),
                    Qo.create(
                      Ba(n.fieldFilter.field),
                      (function () {
                        switch (n.fieldFilter.op) {
                          case 'EQUAL':
                            return '==';
                          case 'NOT_EQUAL':
                            return '!=';
                          case 'GREATER_THAN':
                            return '>';
                          case 'GREATER_THAN_OR_EQUAL':
                            return '>=';
                          case 'LESS_THAN':
                            return '<';
                          case 'LESS_THAN_OR_EQUAL':
                            return '<=';
                          case 'ARRAY_CONTAINS':
                            return 'array-contains';
                          case 'IN':
                            return 'in';
                          case 'NOT_IN':
                            return 'not-in';
                          case 'ARRAY_CONTAINS_ANY':
                            return 'array-contains-any';
                          case 'OPERATOR_UNSPECIFIED':
                          default:
                            return ci();
                        }
                      })(),
                      n.fieldFilter.value
                    ))
                  ]
                : void 0 !== t.compositeFilter
                ? t.compositeFilter.filters
                    .map(function (t) {
                      return e(t);
                    })
                    .reduce(function (t, e) {
                      return t.concat(e);
                    })
                : ci()
              : [];
            var n;
          })(n.where));
        t = [];
        n.orderBy &&
          (t = n.orderBy.map(function (t) {
            return new Ts(
              Ba((e = t).field),
              (function () {
                switch (e.direction) {
                  case 'ASCENDING':
                    return 'asc';
                  case 'DESCENDING':
                    return 'desc';
                  default:
                    return;
                }
              })()
            );
            var e;
          }));
        r = null;
        n.limit &&
          (r = mo((u = 'object' == typeof (u = n.limit) ? u.value : u))
            ? null
            : u);
        var s = null;
        n.startAt && (s = za(n.startAt));
        var u = null;
        return n.endAt && (u = za(n.endAt)), xs(e, i, t, o, r, 'F', s, u);
      }
      function qa(t) {
        return { before: t.before, values: t.position };
      }
      function za(t) {
        var e = !!t.before,
          t = t.values || [];
        return new ms(t, e);
      }
      function Ha(t) {
        return { fieldPath: t.ot() };
      }
      function Ba(t) {
        return Qi._t(t.fieldPath);
      }
      function Ga(t) {
        switch (t.unaryFilter.op) {
          case 'IS_NAN':
            var e = Ba(t.unaryFilter.field);
            return Qo.create(e, '==', { doubleValue: NaN });
          case 'IS_NULL':
            var n = Ba(t.unaryFilter.field);
            return Qo.create(n, '==', { nullValue: 'NULL_VALUE' });
          case 'IS_NOT_NAN':
            n = Ba(t.unaryFilter.field);
            return Qo.create(n, '!=', { doubleValue: NaN });
          case 'IS_NOT_NULL':
            t = Ba(t.unaryFilter.field);
            return Qo.create(t, '!=', { nullValue: 'NULL_VALUE' });
          case 'OPERATOR_UNSPECIFIED':
          default:
            return ci();
        }
      }
      function Ka(t) {
        return (
          4 <= t.length && 'projects' === t.get(0) && 'databases' === t.get(2)
        );
      }
      var Ja,
        Wa = function () {
          var n = this;
          this.promise = new Promise(function (t, e) {
            (n.resolve = t), (n.reject = e);
          });
        },
        Xa =
          ((ic.prototype.catch = function (t) {
            return this.next(void 0, t);
          }),
          (ic.prototype.next = function (r, i) {
            var o = this;
            return (
              this.Fn && ci(),
              (this.Fn = !0),
              this.Nn
                ? this.error
                  ? this.On(i, this.error)
                  : this.kn(r, this.result)
                : new ic(function (e, n) {
                    (o.Cn = function (t) {
                      o.kn(r, t).next(e, n);
                    }),
                      (o.xn = function (t) {
                        o.On(i, t).next(e, n);
                      });
                  })
            );
          }),
          (ic.prototype.Mn = function () {
            var n = this;
            return new Promise(function (t, e) {
              n.next(t, e);
            });
          }),
          (ic.prototype.Ln = function (t) {
            try {
              var e = t();
              return e instanceof ic ? e : ic.resolve(e);
            } catch (t) {
              return ic.reject(t);
            }
          }),
          (ic.prototype.kn = function (t, e) {
            return t
              ? this.Ln(function () {
                  return t(e);
                })
              : ic.resolve(e);
          }),
          (ic.prototype.On = function (t, e) {
            return t
              ? this.Ln(function () {
                  return t(e);
                })
              : ic.reject(e);
          }),
          (ic.resolve = function (n) {
            return new ic(function (t, e) {
              t(n);
            });
          }),
          (ic.reject = function (n) {
            return new ic(function (t, e) {
              e(n);
            });
          }),
          (ic.$n = function (t) {
            return new ic(function (e, n) {
              var r = 0,
                i = 0,
                o = !1;
              t.forEach(function (t) {
                ++r,
                  t.next(
                    function () {
                      ++i, o && i === r && e();
                    },
                    function (t) {
                      return n(t);
                    }
                  );
              }),
                (o = !0),
                i === r && e();
            });
          }),
          (ic.Bn = function (t) {
            for (var n = ic.resolve(!1), e = 0, r = t; e < r.length; e++)
              !(function (e) {
                n = n.next(function (t) {
                  return t ? ic.resolve(t) : e();
                });
              })(r[e]);
            return n;
          }),
          (ic.forEach = function (t, n) {
            var r = this,
              i = [];
            return (
              t.forEach(function (t, e) {
                i.push(n.call(r, t, e));
              }),
              this.$n(i)
            );
          }),
          ic),
        Ya =
          ((rc.open = function (t, e, n, r) {
            try {
              return new rc(e, t.transaction(r, n));
            } catch (t) {
              throw new Za(e, t);
            }
          }),
          Object.defineProperty(rc.prototype, 'Un', {
            get: function () {
              return this.qn.promise;
            },
            enumerable: !1,
            configurable: !0
          }),
          (rc.prototype.abort = function (t) {
            t && this.qn.reject(t),
              this.aborted ||
                (oi(
                  'SimpleDb',
                  'Aborting transaction:',
                  t ? t.message : 'Client-initiated abort'
                ),
                (this.aborted = !0),
                this.transaction.abort());
          }),
          (rc.prototype.store = function (t) {
            t = this.transaction.objectStore(t);
            return new sc(t);
          }),
          rc),
        $a =
          ((nc.delete = function (t) {
            return (
              oi('SimpleDb', 'Removing database:', t),
              ac(window.indexedDB.deleteDatabase(t)).Mn()
            );
          }),
          (nc.Wn = function () {
            if ('undefined' == typeof indexedDB) return !1;
            if (nc.jn()) return !0;
            var t = f(),
              e = nc.Kn(t),
              n = 0 < e && e < 10,
              e = nc.Gn(t),
              e = 0 < e && e < 4.5;
            return !(
              0 < t.indexOf('MSIE ') ||
              0 < t.indexOf('Trident/') ||
              0 < t.indexOf('Edge/') ||
              n ||
              e
            );
          }),
          (nc.jn = function () {
            var t;
            return (
              'undefined' != typeof process &&
              'YES' ===
                (null === (t = process.env) || void 0 === t ? void 0 : t.zn)
            );
          }),
          (nc.Hn = function (t, e) {
            return t.store(e);
          }),
          (nc.Kn = function (t) {
            (t = t.match(/i(?:phone|pad|pod) os ([\d_]+)/i)),
              (t = t ? t[1].split('_').slice(0, 2).join('.') : '-1');
            return Number(t);
          }),
          (nc.Gn = function (t) {
            (t = t.match(/Android ([\d.]+)/i)),
              (t = t ? t[1].split('.').slice(0, 2).join('.') : '-1');
            return Number(t);
          }),
          (nc.prototype.Jn = function (o) {
            return y(this, void 0, void 0, function () {
              var e,
                i = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return this.db
                      ? [3, 2]
                      : (oi('SimpleDb', 'Opening database:', this.name),
                        (e = this),
                        [
                          4,
                          new Promise(function (e, n) {
                            var r = indexedDB.open(i.name, i.version);
                            (r.onsuccess = function (t) {
                              t = t.target.result;
                              e(t);
                            }),
                              (r.onblocked = function () {
                                n(
                                  new Za(
                                    o,
                                    'Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed.'
                                  )
                                );
                              }),
                              (r.onerror = function (t) {
                                t = t.target.error;
                                'VersionError' === t.name
                                  ? n(
                                      new wi(
                                        bi.FAILED_PRECONDITION,
                                        'A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.'
                                      )
                                    )
                                  : n(new Za(o, t));
                              }),
                              (r.onupgradeneeded = function (t) {
                                oi(
                                  'SimpleDb',
                                  'Database "' +
                                    i.name +
                                    '" requires upgrade from version:',
                                  t.oldVersion
                                );
                                var e = t.target.result;
                                i.Qn.Yn(
                                  e,
                                  r.transaction,
                                  t.oldVersion,
                                  i.version
                                ).next(function () {
                                  oi(
                                    'SimpleDb',
                                    'Database upgrade to version ' +
                                      i.version +
                                      ' complete'
                                  );
                                });
                              });
                          })
                        ]);
                  case 1:
                    (e.db = t.sent()), (t.label = 2);
                  case 2:
                    return [
                      2,
                      (this.Xn &&
                        (this.db.onversionchange = function (t) {
                          return i.Xn(t);
                        }),
                      this.db)
                    ];
                }
              });
            });
          }),
          (nc.prototype.Zn = function (e) {
            (this.Xn = e),
              this.db &&
                (this.db.onversionchange = function (t) {
                  return e(t);
                });
          }),
          (nc.prototype.runTransaction = function (u, n, a, c) {
            return y(this, void 0, void 0, function () {
              var i, o, s, e;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    (i = 'readonly' === n),
                      (o = 0),
                      (e = function () {
                        var e, n, r;
                        return v(this, function (t) {
                          switch (t.label) {
                            case 0:
                              ++o, (t.label = 1);
                            case 1:
                              return t.trys.push([1, 4, , 5]), [4, s.Jn(u)];
                            case 2:
                              return (
                                (s.db = t.sent()),
                                (e = Ya.open(
                                  s.db,
                                  u,
                                  i ? 'readonly' : 'readwrite',
                                  a
                                )),
                                (n = c(e)
                                  .catch(function (t) {
                                    return e.abort(t), Xa.reject(t);
                                  })
                                  .Mn()),
                                (r = {}),
                                n.catch(function () {}),
                                [4, e.Un]
                              );
                            case 3:
                              return [2, ((r.value = (t.sent(), n)), r)];
                            case 4:
                              return (
                                (n = t.sent()),
                                (r = 'FirebaseError' !== n.name && o < 3),
                                oi(
                                  'SimpleDb',
                                  'Transaction failed with error:',
                                  n.message,
                                  'Retrying:',
                                  r
                                ),
                                s.close(),
                                r ? [3, 5] : [2, { value: Promise.reject(n) }]
                              );
                            case 5:
                              return [2];
                          }
                        });
                      }),
                      (s = this),
                      (t.label = 1);
                  case 1:
                    return [5, e()];
                  case 2:
                    if ('object' == typeof (e = t.sent())) return [2, e.value];
                    t.label = 3;
                  case 3:
                    return [3, 1];
                  case 4:
                    return [2];
                }
              });
            });
          }),
          (nc.prototype.close = function () {
            this.db && this.db.close(), (this.db = void 0);
          }),
          nc),
        Qa =
          (Object.defineProperty(ec.prototype, 'Nn', {
            get: function () {
              return this.es;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(ec.prototype, 'ss', {
            get: function () {
              return this.ns;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(ec.prototype, 'cursor', {
            set: function (t) {
              this.ts = t;
            },
            enumerable: !1,
            configurable: !0
          }),
          (ec.prototype.done = function () {
            this.es = !0;
          }),
          (ec.prototype.rs = function (t) {
            this.ns = t;
          }),
          (ec.prototype.delete = function () {
            return ac(this.ts.delete());
          }),
          ec),
        Za = (t(tc, (Ja = wi)), tc);
      function tc(t, e) {
        var n = this;
        return (
          ((n =
            Ja.call(
              this,
              bi.UNAVAILABLE,
              "IndexedDB transaction '" + t + "' failed: " + e
            ) || this).name = 'IndexedDbTransactionError'),
          n
        );
      }
      function ec(t) {
        (this.ts = t), (this.es = !1), (this.ns = null);
      }
      function nc(t, e, n) {
        (this.name = t),
          (this.version = e),
          (this.Qn = n),
          12.2 === nc.Kn(f()) &&
            si(
              'Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.'
            );
      }
      function rc(e, t) {
        var n = this;
        (this.action = e),
          (this.transaction = t),
          (this.aborted = !1),
          (this.qn = new Wa()),
          (this.transaction.oncomplete = function () {
            n.qn.resolve();
          }),
          (this.transaction.onabort = function () {
            t.error ? n.qn.reject(new Za(e, t.error)) : n.qn.resolve();
          }),
          (this.transaction.onerror = function (t) {
            t = hc(t.target.error);
            n.qn.reject(new Za(e, t));
          });
      }
      function ic(t) {
        var e = this;
        (this.Cn = null),
          (this.xn = null),
          (this.result = void 0),
          (this.error = void 0),
          (this.Nn = !1),
          (this.Fn = !1),
          t(
            function (t) {
              (e.Nn = !0), (e.result = t), e.Cn && e.Cn(t);
            },
            function (t) {
              (e.Nn = !0), (e.error = t), e.xn && e.xn(t);
            }
          );
      }
      function oc(t) {
        return 'IndexedDbTransactionError' === t.name;
      }
      var sc =
        ((uc.prototype.put = function (t, e) {
          t =
            void 0 !== e
              ? (oi('SimpleDb', 'PUT', this.store.name, t, e),
                this.store.put(e, t))
              : (oi('SimpleDb', 'PUT', this.store.name, '<auto-key>', t),
                this.store.put(t));
          return ac(t);
        }),
        (uc.prototype.add = function (t) {
          return (
            oi('SimpleDb', 'ADD', this.store.name, t, t), ac(this.store.add(t))
          );
        }),
        (uc.prototype.get = function (e) {
          var n = this;
          return ac(this.store.get(e)).next(function (t) {
            return (
              void 0 === t && (t = null),
              oi('SimpleDb', 'GET', n.store.name, e, t),
              t
            );
          });
        }),
        (uc.prototype.delete = function (t) {
          return (
            oi('SimpleDb', 'DELETE', this.store.name, t),
            ac(this.store.delete(t))
          );
        }),
        (uc.prototype.count = function () {
          return (
            oi('SimpleDb', 'COUNT', this.store.name), ac(this.store.count())
          );
        }),
        (uc.prototype.os = function (t, e) {
          var e = this.cursor(this.options(t, e)),
            n = [];
          return this.cs(e, function (t, e) {
            n.push(e);
          }).next(function () {
            return n;
          });
        }),
        (uc.prototype.us = function (t, e) {
          oi('SimpleDb', 'DELETE ALL', this.store.name);
          e = this.options(t, e);
          e.hs = !1;
          e = this.cursor(e);
          return this.cs(e, function (t, e, n) {
            return n.delete();
          });
        }),
        (uc.prototype.ls = function (t, e) {
          e ? (n = t) : ((n = {}), (e = t));
          var n = this.cursor(n);
          return this.cs(n, e);
        }),
        (uc.prototype._s = function (r) {
          var t = this.cursor({});
          return new Xa(function (n, e) {
            (t.onerror = function (t) {
              t = hc(t.target.error);
              e(t);
            }),
              (t.onsuccess = function (t) {
                var e = t.target.result;
                e
                  ? r(e.primaryKey, e.value).next(function (t) {
                      t ? e.continue() : n();
                    })
                  : n();
              });
          });
        }),
        (uc.prototype.cs = function (t, i) {
          var o = [];
          return new Xa(function (r, e) {
            (t.onerror = function (t) {
              e(t.target.error);
            }),
              (t.onsuccess = function (t) {
                var e,
                  n = t.target.result;
                n
                  ? ((e = new Qa(n)),
                    (t = i(n.primaryKey, n.value, e)) instanceof Xa &&
                      ((t = t.catch(function (t) {
                        return e.done(), Xa.reject(t);
                      })),
                      o.push(t)),
                    e.Nn
                      ? r()
                      : null === e.ss
                      ? n.continue()
                      : n.continue(e.ss))
                  : r();
              });
          }).next(function () {
            return Xa.$n(o);
          });
        }),
        (uc.prototype.options = function (t, e) {
          var n = void 0;
          return (
            void 0 !== t && ('string' == typeof t ? (n = t) : (e = t)),
            { index: n, range: e }
          );
        }),
        (uc.prototype.cursor = function (t) {
          var e = 'next';
          if ((t.reverse && (e = 'prev'), t.index)) {
            var n = this.store.index(t.index);
            return t.hs
              ? n.openKeyCursor(t.range, e)
              : n.openCursor(t.range, e);
          }
          return this.store.openCursor(t.range, e);
        }),
        uc);
      function uc(t) {
        this.store = t;
      }
      function ac(t) {
        return new Xa(function (e, n) {
          (t.onsuccess = function (t) {
            t = t.target.result;
            e(t);
          }),
            (t.onerror = function (t) {
              t = hc(t.target.error);
              n(t);
            });
        });
      }
      var cc = !1;
      function hc(t) {
        var e = $a.Kn(f());
        if (12.2 <= e && e < 13) {
          e =
            'An internal error was encountered in the Indexed Database server';
          if (0 <= t.message.indexOf(e)) {
            var n = new wi(
              'internal',
              "IOS_INDEXEDDB_BUG1: IndexedDb has thrown '" +
                e +
                "'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround."
            );
            return (
              cc ||
                ((cc = !0),
                setTimeout(function () {
                  throw n;
                }, 0)),
              n
            );
          }
        }
        return t;
      }
      var fc =
        ((lc.Is = function (t, e, n, r, i) {
          i = new lc(t, e, Date.now() + n, r, i);
          return i.start(n), i;
        }),
        (lc.prototype.start = function (t) {
          var e = this;
          this.As = setTimeout(function () {
            return e.Rs();
          }, t);
        }),
        (lc.prototype.Ps = function () {
          return this.Rs();
        }),
        (lc.prototype.cancel = function (t) {
          null !== this.As &&
            (this.clearTimeout(),
            this.Ts.reject(
              new wi(bi.CANCELLED, 'Operation cancelled' + (t ? ': ' + t : ''))
            ));
        }),
        (lc.prototype.Rs = function () {
          var e = this;
          this.fs.ys(function () {
            return null !== e.As
              ? (e.clearTimeout(),
                e.op().then(function (t) {
                  return e.Ts.resolve(t);
                }))
              : Promise.resolve();
          });
        }),
        (lc.prototype.clearTimeout = function () {
          null !== this.As &&
            (this.Es(this), clearTimeout(this.As), (this.As = null));
        }),
        lc);
      function lc(t, e, n, r, i) {
        (this.fs = t),
          (this.ds = e),
          (this.ws = n),
          (this.op = r),
          (this.Es = i),
          (this.Ts = new Wa()),
          (this.then = this.Ts.promise.then.bind(this.Ts.promise)),
          this.Ts.promise.catch(function (t) {});
      }
      function pc(t, e) {
        if ((si('AsyncQueue', e + ': ' + t), oc(t)))
          return new wi(bi.UNAVAILABLE, e + ': ' + t);
        throw t;
      }
      var dc =
          'The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.',
        U =
          ((yc.prototype.ps = function (t) {
            this.Vs.push(t);
          }),
          (yc.prototype.bs = function () {
            this.Vs.forEach(function (t) {
              return t();
            });
          }),
          yc);
      function yc() {
        this.Vs = [];
      }
      function vc(t) {
        for (var e = '', n = 0; n < t.length; n++)
          0 < e.length && (e = gc(e)),
            (e = (function (t, e) {
              for (var n = e, r = t.length, i = 0; i < r; i++) {
                var o = t.charAt(i);
                switch (o) {
                  case '\0':
                    n += '';
                    break;
                  case '':
                    n += '';
                    break;
                  default:
                    n += o;
                }
              }
              return n;
            })(t.get(n), e));
        return gc(e);
      }
      function gc(t) {
        return t + '';
      }
      function mc(t) {
        var e = t.length;
        if ((hi(2 <= e), 2 === e))
          return hi('' === t.charAt(0) && '' === t.charAt(1)), Yi.at();
        for (var n = e - 2, r = [], i = '', o = 0; o < e; ) {
          var s = t.indexOf('', o);
          switch (((s < 0 || n < s) && ci(), t.charAt(s + 1))) {
            case '':
              var u = t.substring(o, s),
                a = void 0;
              0 === i.length ? (a = u) : ((a = i += u), (i = '')), r.push(a);
              break;
            case '':
              (i += t.substring(o, s)), (i += '\0');
              break;
            case '':
              i += t.substring(o, s + 1);
              break;
            default:
              ci();
          }
          o = s + 2;
        }
        return new Yi(r);
      }
      function bc(t, e, n) {
        (this.ownerId = t),
          (this.allowTabSynchronization = e),
          (this.leaseTimestampMs = n);
      }
      var wc = function (t, e) {
        (this.seconds = t), (this.nanoseconds = e);
      };
      (bc.store = 'owner'), (bc.key = 'owner');
      function Ic(t, e, n) {
        (this.userId = t),
          (this.lastAcknowledgedBatchId = e),
          (this.lastStreamToken = n);
      }
      (Ic.store = 'mutationQueues'), (Ic.keyPath = 'userId');
      function Ec(t, e, n, r, i) {
        (this.userId = t),
          (this.batchId = e),
          (this.localWriteTimeMs = n),
          (this.baseMutations = r),
          (this.mutations = i);
      }
      (Ec.store = 'mutations'),
        (Ec.keyPath = 'batchId'),
        (Ec.userMutationsIndex = 'userMutationsIndex'),
        (Ec.userMutationsKeyPath = ['userId', 'batchId']);
      var _c =
        ((Tc.prefixForUser = function (t) {
          return [t];
        }),
        (Tc.prefixForPath = function (t, e) {
          return [t, vc(e)];
        }),
        (Tc.key = function (t, e, n) {
          return [t, vc(e), n];
        }),
        Tc);
      function Tc() {}
      (_c.store = 'documentMutations'), (_c.PLACEHOLDER = new _c());
      function Nc(t, e) {
        (this.path = t), (this.readTime = e);
      }
      function Ac(t, e) {
        (this.path = t), (this.version = e);
      }
      var Sc = function (t, e, n, r, i, o) {
        (this.unknownDocument = t),
          (this.noDocument = e),
          (this.document = n),
          (this.hasCommittedMutations = r),
          (this.readTime = i),
          (this.parentPath = o);
      };
      (Sc.store = 'remoteDocuments'),
        (Sc.readTimeIndex = 'readTimeIndex'),
        (Sc.readTimeIndexPath = 'readTime'),
        (Sc.collectionReadTimeIndex = 'collectionReadTimeIndex'),
        (Sc.collectionReadTimeIndexPath = ['parentPath', 'readTime']);
      function xc(t) {
        this.byteSize = t;
      }
      (xc.store = 'remoteDocumentGlobal'), (xc.key = 'remoteDocumentGlobalKey');
      function Dc(t, e, n, r, i, o, s) {
        (this.targetId = t),
          (this.canonicalId = e),
          (this.readTime = n),
          (this.resumeToken = r),
          (this.lastListenSequenceNumber = i),
          (this.lastLimboFreeSnapshotVersion = o),
          (this.query = s);
      }
      (Dc.store = 'targets'),
        (Dc.keyPath = 'targetId'),
        (Dc.queryTargetsIndexName = 'queryTargetsIndex'),
        (Dc.queryTargetsKeyPath = ['canonicalId', 'targetId']);
      var Oc = function (t, e, n) {
        (this.targetId = t), (this.path = e), (this.sequenceNumber = n);
      };
      (Oc.store = 'targetDocuments'),
        (Oc.keyPath = ['targetId', 'path']),
        (Oc.documentTargetsIndex = 'documentTargetsIndex'),
        (Oc.documentTargetsKeyPath = ['path', 'targetId']);
      function kc(t, e, n, r) {
        (this.highestTargetId = t),
          (this.highestListenSequenceNumber = e),
          (this.lastRemoteSnapshotVersion = n),
          (this.targetCount = r);
      }
      (kc.key = 'targetGlobalKey'), (kc.store = 'targetGlobal');
      function Cc(t, e) {
        (this.collectionId = t), (this.parent = e);
      }
      (Cc.store = 'collectionParents'),
        (Cc.keyPath = ['collectionId', 'parent']);
      function Pc(t, e, n, r) {
        (this.clientId = t),
          (this.updateTimeMs = e),
          (this.networkEnabled = n),
          (this.inForeground = r);
      }
      (Pc.store = 'clientMetadata'), (Pc.keyPath = 'clientId');
      function Lc(t, e, n) {
        (this.bundleId = t), (this.createTime = e), (this.version = n);
      }
      (Lc.store = 'bundles'), (Lc.keyPath = 'bundleId');
      function Rc(t, e, n) {
        (this.name = t), (this.readTime = e), (this.bundledQuery = n);
      }
      (Rc.store = 'namedQueries'), (Rc.keyPath = 'name');
      var Vc,
        Mc = s(
          s(
            s(
              s(
                [
                  Ic.store,
                  Ec.store,
                  _c.store,
                  Sc.store,
                  Dc.store,
                  bc.store,
                  kc.store,
                  Oc.store
                ],
                [Pc.store]
              ),
              [xc.store]
            ),
            [Cc.store]
          ),
          [Lc.store, Rc.store]
        ),
        Uc = (t(jc, (Vc = U)), jc);
      function jc(t, e) {
        var n = this;
        return ((n = Vc.call(this) || this).vs = t), (n.Ss = e), n;
      }
      function Fc(t, e) {
        return $a.Hn(t.vs, e);
      }
      var qc =
          ((Gc.prototype.Cs = function (t, e, n) {
            for (
              var r, i, o, s, u, a, c = n.xs, h = 0;
              h < this.mutations.length;
              h++
            ) {
              var f = this.mutations[h];
              f.key.isEqual(t) &&
                ((r = f),
                (i = e),
                (o = c[h]),
                (f = a = u = s = void 0),
                (e =
                  r instanceof Iu
                    ? ((u = o),
                      (f = (s = r).value),
                      u.transformResults &&
                        ((a = Au(s.fieldTransforms, i, u.transformResults)),
                        (f = xu(s.fieldTransforms, f, a))),
                      new Fo(s.key, u.version, f, {
                        hasCommittedMutations: !0
                      }))
                    : r instanceof Eu
                    ? (function (t, e, n) {
                        if (!yu(t.Gt, e)) return new zo(t.key, n.version);
                        e = Nu(
                          t,
                          e,
                          n.transformResults
                            ? Au(t.fieldTransforms, e, n.transformResults)
                            : []
                        );
                        return new Fo(t.key, n.version, e, {
                          hasCommittedMutations: !0
                        });
                      })(r, i, o)
                    : new qo(r.key, o.version, { hasCommittedMutations: !0 })));
            }
            return e;
          }),
          (Gc.prototype.Ns = function (t, e) {
            for (var n = 0, r = this.baseMutations; n < r.length; n++) {
              var i = r[n];
              i.key.isEqual(t) && (e = vu(i, e, e, this.Ds));
            }
            for (var o = e, s = 0, u = this.mutations; s < u.length; s++) {
              var a = u[s];
              a.key.isEqual(t) && (e = vu(a, e, o, this.Ds));
            }
            return e;
          }),
          (Gc.prototype.Fs = function (n) {
            var r = this,
              i = n;
            return (
              this.mutations.forEach(function (t) {
                var e = r.Ns(t.key, n.get(t.key));
                e && (i = i.Ht(t.key, e));
              }),
              i
            );
          }),
          (Gc.prototype.keys = function () {
            return this.mutations.reduce(function (t, e) {
              return t.add(e.key);
            }, ta());
          }),
          (Gc.prototype.isEqual = function (t) {
            return (
              this.batchId === t.batchId &&
              di(this.mutations, t.mutations, gu) &&
              di(this.baseMutations, t.baseMutations, gu)
            );
          }),
          Gc),
        zc =
          ((Bc.from = function (t, e, n) {
            hi(t.mutations.length === n.length);
            for (var r = Qu, i = t.mutations, o = 0; o < i.length; o++)
              r = r.Ht(i[o].key, n[o].version);
            return new Bc(t, e, n, r);
          }),
          Bc),
        Hc = function (t) {
          this.Ms = t;
        };
      function Bc(t, e, n, r) {
        (this.batch = t), (this.Os = e), (this.xs = n), (this.ks = r);
      }
      function Gc(t, e, n, r) {
        (this.batchId = t),
          (this.Ds = e),
          (this.baseMutations = n),
          (this.mutations = r);
      }
      function Kc(t, e) {
        if (e.document)
          return (
            (n = t.Ms),
            (r = e.document),
            (i = !!e.hasCommittedMutations),
            (t = Oa(n, r.name)),
            (n = Aa(r.updateTime)),
            (r = new Po({ mapValue: { fields: r.fields } })),
            new Fo(t, n, r, { hasCommittedMutations: !!i })
          );
        var n, r, i;
        if (e.noDocument) {
          var o = Zi.Tt(e.noDocument.path),
            s = $c(e.noDocument.readTime);
          return new qo(o, s, {
            hasCommittedMutations: !!e.hasCommittedMutations
          });
        }
        if (e.unknownDocument) {
          (o = Zi.Tt(e.unknownDocument.path)),
            (s = $c(e.unknownDocument.version));
          return new zo(o, s);
        }
        return ci();
      }
      function Jc(t, e, n) {
        var r = Wc(n),
          n = e.key.path.Z().rt();
        if (e instanceof Fo) {
          var i = {
              name: Da((o = t.Ms), (s = e).key),
              fields: s.vt().mapValue.fields,
              updateTime: Ta(o, s.version.G())
            },
            o = e.hasCommittedMutations;
          return new Sc(null, null, i, o, r, n);
        }
        if (e instanceof qo) {
          var s = e.key.path.rt(),
            i = Yc(e.version),
            o = e.hasCommittedMutations;
          return new Sc(null, new Nc(s, i), null, o, r, n);
        }
        if (e instanceof zo) {
          (o = e.key.path.rt()), (e = Yc(e.version));
          return new Sc(new Ac(o, e), null, null, !0, r, n);
        }
        return ci();
      }
      function Wc(t) {
        t = t.G();
        return [t.seconds, t.nanoseconds];
      }
      function Xc(t) {
        t = new Wi(t[0], t[1]);
        return Xi.W(t);
      }
      function Yc(t) {
        t = t.G();
        return new wc(t.seconds, t.nanoseconds);
      }
      function $c(t) {
        t = new Wi(t.seconds, t.nanoseconds);
        return Xi.W(t);
      }
      function Qc(e, t) {
        for (
          var n = (t.baseMutations || []).map(function (t) {
              return Ma(e.Ms, t);
            }),
            r = t.mutations.length - 1;
          0 <= r;
          --r
        ) {
          var i = t.mutations[r];
          void 0 !== (null == i ? void 0 : i.transform) &&
            ((t.mutations[r - 1].updateTransforms =
              i.transform.fieldTransforms),
            t.mutations.splice(r, 1),
            --r);
        }
        var o = t.mutations.map(function (t) {
            return Ma(e.Ms, t);
          }),
          s = Wi.fromMillis(t.localWriteTimeMs);
        return new qc(t.batchId, s, n, o);
      }
      function Zc(t) {
        var e = $c(t.readTime),
          n =
            void 0 !== t.lastLimboFreeSnapshotVersion
              ? $c(t.lastLimboFreeSnapshotVersion)
              : Xi.min(),
          r =
            void 0 !== t.query.documents
              ? (hi(1 === (r = t.query).documents.length),
                Vs(Ds(Ca(r.documents[0]))))
              : Vs(Fa(t.query));
        return new Hs(
          r,
          t.targetId,
          0,
          t.lastListenSequenceNumber,
          e,
          n,
          vi.fromBase64String(t.resumeToken)
        );
      }
      function th(t, e) {
        var n = Yc(e.Mt),
          r = Yc(e.lastLimboFreeSnapshotVersion),
          i = (Yo(e.target) ? Ua : ja)(t.Ms, e.target),
          t = e.resumeToken.toBase64();
        return new Dc(e.targetId, Wo(e.target), n, t, e.sequenceNumber, r, i);
      }
      function eh(t) {
        var e = Fa({ parent: t.parent, structuredQuery: t.structuredQuery });
        return 'LAST' === t.limitType ? Ms(e, e.limit, 'L') : e;
      }
      var nh =
        ((rh.prototype.Ls = function (t, e) {
          return ih(t)
            .get(e)
            .next(function (t) {
              if (t)
                return {
                  id: (t = t).bundleId,
                  createTime: $c(t.createTime),
                  version: t.version
                };
            });
        }),
        (rh.prototype.$s = function (t, e) {
          return ih(t).put({
            bundleId: (e = e).id,
            createTime: Yc(Aa(e.createTime)),
            version: e.version
          });
        }),
        (rh.prototype.Bs = function (t, e) {
          return oh(t)
            .get(e)
            .next(function (t) {
              if (t)
                return {
                  name: (t = t).name,
                  query: eh(t.bundledQuery),
                  readTime: $c(t.readTime)
                };
            });
        }),
        (rh.prototype.qs = function (t, e) {
          return oh(t).put({
            name: (e = e).name,
            readTime: Yc(Aa(e.readTime)),
            bundledQuery: e.bundledQuery
          });
        }),
        rh);
      function rh() {}
      function ih(t) {
        return Fc(t, Lc.store);
      }
      function oh(t) {
        return Fc(t, Rc.store);
      }
      var sh =
          ((fh.prototype.Qs = function (t, e) {
            return this.Us.add(e), Xa.resolve();
          }),
          (fh.prototype.Ks = function (t, e) {
            return Xa.resolve(this.Us.getEntries(e));
          }),
          fh),
        uh =
          ((hh.prototype.add = function (t) {
            var e = t.et(),
              n = t.Z(),
              r = this.index[e] || new Ku(Yi.J),
              t = !r.has(n);
            return (this.index[e] = r.add(n)), t;
          }),
          (hh.prototype.has = function (t) {
            var e = t.et(),
              t = t.Z(),
              e = this.index[e];
            return e && e.has(t);
          }),
          (hh.prototype.getEntries = function (t) {
            return (this.index[t] || new Ku(Yi.J)).rt();
          }),
          hh),
        ah =
          ((ch.prototype.Qs = function (t, e) {
            var n = this;
            if (this.Ws.has(e)) return Xa.resolve();
            var r = e.et(),
              i = e.Z();
            t.ps(function () {
              n.Ws.add(e);
            });
            i = { collectionId: r, parent: vc(i) };
            return lh(t).put(i);
          }),
          (ch.prototype.Ks = function (t, i) {
            var o = [],
              e = IDBKeyRange.bound([i, ''], [yi(i), ''], !1, !0);
            return lh(t)
              .os(e)
              .next(function (t) {
                for (var e = 0, n = t; e < n.length; e++) {
                  var r = n[e];
                  if (r.collectionId !== i) break;
                  o.push(mc(r.parent));
                }
                return o;
              });
          }),
          ch);
      function ch() {
        this.Ws = new uh();
      }
      function hh() {
        this.index = {};
      }
      function fh() {
        this.Us = new uh();
      }
      function lh(t) {
        return Fc(t, Cc.store);
      }
      var ph = { js: !1, Gs: 0, zs: 0, Hs: 0 },
        dh =
          ((yh.Zs = function (t) {
            return new yh(t, yh.ti, yh.ei);
          }),
          yh);
      function yh(t, e, n) {
        (this.Js = t), (this.Ys = e), (this.Xs = n);
      }
      function vh(e) {
        return y(this, void 0, void 0, function () {
          return v(this, function (t) {
            if (e.code !== bi.FAILED_PRECONDITION || e.message !== dc) throw e;
            return oi('LocalStore', 'Unexpectedly lost primary lease'), [2];
          });
        });
      }
      (dh.ti = 10),
        (dh.ei = 1e3),
        (dh.ni = new dh(41943040, dh.ti, dh.ei)),
        (dh.si = new dh(-1, 0, 0));
      var gh =
          ((bh.prototype.get = function (t) {
            var e = this.ii(t),
              e = this.oi[e];
            if (void 0 !== e)
              for (var n = 0, r = e; n < r.length; n++) {
                var i = r[n],
                  o = i[0],
                  i = i[1];
                if (this.ri(o, t)) return i;
              }
          }),
          (bh.prototype.has = function (t) {
            return void 0 !== this.get(t);
          }),
          (bh.prototype.set = function (t, e) {
            var n = this.ii(t),
              r = this.oi[n];
            if (void 0 !== r) {
              for (var i = 0; i < r.length; i++)
                if (this.ri(r[i][0], t)) return void (r[i] = [t, e]);
              r.push([t, e]);
            } else this.oi[n] = [[t, e]];
          }),
          (bh.prototype.delete = function (t) {
            var e = this.ii(t),
              n = this.oi[e];
            if (void 0 === n) return !1;
            for (var r = 0; r < n.length; r++)
              if (this.ri(n[r][0], t))
                return 1 === n.length ? delete this.oi[e] : n.splice(r, 1), !0;
            return !1;
          }),
          (bh.prototype.forEach = function (s) {
            uo(this.oi, function (t, e) {
              for (var n = 0, r = e; n < r.length; n++) {
                var i = r[n],
                  o = i[0],
                  i = i[1];
                s(o, i);
              }
            });
          }),
          (bh.prototype.nt = function () {
            return ao(this.oi);
          }),
          bh),
        $ =
          ((mh.prototype.ui = function (t) {
            t = this.ci.get(t);
            return t ? t.readTime : Xi.min();
          }),
          (mh.prototype.hi = function (t, e) {
            this.li(), this.ci.set(t.key, { _i: t, readTime: e });
          }),
          (mh.prototype.fi = function (t, e) {
            void 0 === e && (e = null),
              this.li(),
              this.ci.set(t, { _i: null, readTime: e });
          }),
          (mh.prototype.di = function (t, e) {
            this.li();
            var n = this.ci.get(e);
            return void 0 !== n ? Xa.resolve(n._i) : this.wi(t, e);
          }),
          (mh.prototype.getEntries = function (t, e) {
            return this.Ei(t, e);
          }),
          (mh.prototype.apply = function (t) {
            return this.li(), (this.ai = !0), this.Ti(t);
          }),
          (mh.prototype.li = function () {}),
          mh);
      function mh() {
        (this.ci = new gh(
          function (t) {
            return t.toString();
          },
          function (t, e) {
            return t.isEqual(e);
          }
        )),
          (this.ai = !1);
      }
      function bh(t, e) {
        (this.ii = t), (this.ri = e), (this.oi = {});
      }
      function wh(t, e, n) {
        var r = t.store(Ec.store),
          i = t.store(_c.store),
          o = [],
          t = IDBKeyRange.only(n.batchId),
          s = 0,
          t = r.ls({ range: t }, function (t, e, n) {
            return s++, n.delete();
          });
        o.push(
          t.next(function () {
            hi(1 === s);
          })
        );
        for (var u = [], a = 0, c = n.mutations; a < c.length; a++) {
          var h = c[a],
            f = _c.key(e, h.key.path, n.batchId);
          o.push(i.delete(f)), u.push(h.key);
        }
        return Xa.$n(o).next(function () {
          return u;
        });
      }
      function Ih(t) {
        var e;
        if (t.document) e = t.document;
        else if (t.unknownDocument) e = t.unknownDocument;
        else {
          if (!t.noDocument) throw ci();
          e = t.noDocument;
        }
        return JSON.stringify(e).length;
      }
      var Eh =
        ((_h.Ri = function (t, e, n, r) {
          return hi('' !== t.uid), new _h(t.A() ? t.uid : '', e, n, r);
        }),
        (_h.prototype.Pi = function (t) {
          var r = !0,
            e = IDBKeyRange.bound(
              [this.userId, Number.NEGATIVE_INFINITY],
              [this.userId, Number.POSITIVE_INFINITY]
            );
          return Nh(t)
            .ls({ index: Ec.userMutationsIndex, range: e }, function (t, e, n) {
              (r = !1), n.done();
            })
            .next(function () {
              return r;
            });
        }),
        (_h.prototype.yi = function (d, y, v, g) {
          var m = this,
            b = Ah(d),
            w = Nh(d);
          return w.add({}).next(function (t) {
            hi('number' == typeof t);
            for (
              var e,
                n,
                r,
                i,
                o,
                s = new qc(t, y, v, g),
                u =
                  ((e = m.Kt),
                  (n = m.userId),
                  (i = (r = s).baseMutations.map(function (t) {
                    return Va(e.Ms, t);
                  })),
                  (o = r.mutations.map(function (t) {
                    return Va(e.Ms, t);
                  })),
                  new Ec(n, r.batchId, r.Ds.toMillis(), i, o)),
                a = [],
                c = new Ku(function (t, e) {
                  return pi(t.ot(), e.ot());
                }),
                h = 0,
                f = g;
              h < f.length;
              h++
            ) {
              var l = f[h],
                p = _c.key(m.userId, l.key.path, t),
                c = c.add(l.key.path.Z());
              a.push(w.put(u)), a.push(b.put(p, _c.PLACEHOLDER));
            }
            return (
              c.forEach(function (t) {
                a.push(m.Ii.Qs(d, t));
              }),
              d.ps(function () {
                m.Ai[t] = s.keys();
              }),
              Xa.$n(a).next(function () {
                return s;
              })
            );
          });
        }),
        (_h.prototype.gi = function (t, e) {
          var n = this;
          return Nh(t)
            .get(e)
            .next(function (t) {
              return t ? (hi(t.userId === n.userId), Qc(n.Kt, t)) : null;
            });
        }),
        (_h.prototype.Vi = function (t, e) {
          var n = this;
          return this.Ai[e]
            ? Xa.resolve(this.Ai[e])
            : this.gi(t, e).next(function (t) {
                if (t) {
                  t = t.keys();
                  return (n.Ai[e] = t);
                }
                return null;
              });
        }),
        (_h.prototype.pi = function (t, e) {
          var r = this,
            i = e + 1,
            e = IDBKeyRange.lowerBound([this.userId, i]),
            o = null;
          return Nh(t)
            .ls({ index: Ec.userMutationsIndex, range: e }, function (t, e, n) {
              e.userId === r.userId && (hi(e.batchId >= i), (o = Qc(r.Kt, e))),
                n.done();
            })
            .next(function () {
              return o;
            });
        }),
        (_h.prototype.bi = function (t) {
          var e = IDBKeyRange.upperBound([
              this.userId,
              Number.POSITIVE_INFINITY
            ]),
            r = -1;
          return Nh(t)
            .ls(
              { index: Ec.userMutationsIndex, range: e, reverse: !0 },
              function (t, e, n) {
                (r = e.batchId), n.done();
              }
            )
            .next(function () {
              return r;
            });
        }),
        (_h.prototype.vi = function (t) {
          var e = this,
            n = IDBKeyRange.bound(
              [this.userId, -1],
              [this.userId, Number.POSITIVE_INFINITY]
            );
          return Nh(t)
            .os(Ec.userMutationsIndex, n)
            .next(function (t) {
              return t.map(function (t) {
                return Qc(e.Kt, t);
              });
            });
        }),
        (_h.prototype.Si = function (o, s) {
          var u = this,
            t = _c.prefixForPath(this.userId, s.path),
            t = IDBKeyRange.lowerBound(t),
            a = [];
          return Ah(o)
            .ls({ range: t }, function (t, e, n) {
              var r = t[0],
                i = t[1],
                t = t[2],
                i = mc(i);
              if (r === u.userId && s.path.isEqual(i))
                return Nh(o)
                  .get(t)
                  .next(function (t) {
                    if (!t) throw ci();
                    hi(t.userId === u.userId), a.push(Qc(u.Kt, t));
                  });
              n.done();
            })
            .next(function () {
              return a;
            });
        }),
        (_h.prototype.Di = function (e, t) {
          var s = this,
            u = new Ku(pi),
            n = [];
          return (
            t.forEach(function (o) {
              var t = _c.prefixForPath(s.userId, o.path),
                t = IDBKeyRange.lowerBound(t),
                t = Ah(e).ls({ range: t }, function (t, e, n) {
                  var r = t[0],
                    i = t[1],
                    t = t[2],
                    i = mc(i);
                  r === s.userId && o.path.isEqual(i)
                    ? (u = u.add(t))
                    : n.done();
                });
              n.push(t);
            }),
            Xa.$n(n).next(function () {
              return s.Ci(e, u);
            })
          );
        }),
        (_h.prototype.xi = function (t, e) {
          var o = this,
            s = e.path,
            u = s.length + 1,
            e = _c.prefixForPath(this.userId, s),
            e = IDBKeyRange.lowerBound(e),
            a = new Ku(pi);
          return Ah(t)
            .ls({ range: e }, function (t, e, n) {
              var r = t[0],
                i = t[1],
                t = t[2],
                i = mc(i);
              r === o.userId && s.st(i)
                ? i.length === u && (a = a.add(t))
                : n.done();
            })
            .next(function () {
              return o.Ci(t, a);
            });
        }),
        (_h.prototype.Ci = function (e, t) {
          var n = this,
            r = [],
            i = [];
          return (
            t.forEach(function (t) {
              i.push(
                Nh(e)
                  .get(t)
                  .next(function (t) {
                    if (null === t) throw ci();
                    hi(t.userId === n.userId), r.push(Qc(n.Kt, t));
                  })
              );
            }),
            Xa.$n(i).next(function () {
              return r;
            })
          );
        }),
        (_h.prototype.Ni = function (e, n) {
          var r = this;
          return wh(e.vs, this.userId, n).next(function (t) {
            return (
              e.ps(function () {
                r.Fi(n.batchId);
              }),
              Xa.forEach(t, function (t) {
                return r.mi.Oi(e, t);
              })
            );
          });
        }),
        (_h.prototype.Fi = function (t) {
          delete this.Ai[t];
        }),
        (_h.prototype.ki = function (e) {
          var i = this;
          return this.Pi(e).next(function (t) {
            if (!t) return Xa.resolve();
            var t = IDBKeyRange.lowerBound(_c.prefixForUser(i.userId)),
              r = [];
            return Ah(e)
              .ls({ range: t }, function (t, e, n) {
                t[0] === i.userId ? ((t = mc(t[1])), r.push(t)) : n.done();
              })
              .next(function () {
                hi(0 === r.length);
              });
          });
        }),
        (_h.prototype.Mi = function (t, e) {
          return Th(t, this.userId, e);
        }),
        (_h.prototype.Li = function (t) {
          var e = this;
          return Sh(t)
            .get(this.userId)
            .next(function (t) {
              return t || new Ic(e.userId, -1, '');
            });
        }),
        _h);
      function _h(t, e, n, r) {
        (this.userId = t),
          (this.Kt = e),
          (this.Ii = n),
          (this.mi = r),
          (this.Ai = {});
      }
      function Th(t, o, e) {
        var e = _c.prefixForPath(o, e.path),
          s = e[1],
          e = IDBKeyRange.lowerBound(e),
          u = !1;
        return Ah(t)
          .ls({ range: e, hs: !0 }, function (t, e, n) {
            var r = t[0],
              i = t[1];
            t[2], r === o && i === s && (u = !0), n.done();
          })
          .next(function () {
            return u;
          });
      }
      function Nh(t) {
        return Fc(t, Ec.store);
      }
      function Ah(t) {
        return Fc(t, _c.store);
      }
      function Sh(t) {
        return Fc(t, Ic.store);
      }
      var xh =
          ((kh.prototype.next = function () {
            return (this.$i += 2), this.$i;
          }),
          (kh.Bi = function () {
            return new kh(0);
          }),
          (kh.qi = function () {
            return new kh(-1);
          }),
          kh),
        Dh =
          ((Oh.prototype.Ui = function (n) {
            var r = this;
            return this.Qi(n).next(function (t) {
              var e = new xh(t.highestTargetId);
              return (
                (t.highestTargetId = e.next()),
                r.Ki(n, t).next(function () {
                  return t.highestTargetId;
                })
              );
            });
          }),
          (Oh.prototype.Wi = function (t) {
            return this.Qi(t).next(function (t) {
              return Xi.W(
                new Wi(
                  t.lastRemoteSnapshotVersion.seconds,
                  t.lastRemoteSnapshotVersion.nanoseconds
                )
              );
            });
          }),
          (Oh.prototype.ji = function (t) {
            return this.Qi(t).next(function (t) {
              return t.highestListenSequenceNumber;
            });
          }),
          (Oh.prototype.Gi = function (e, n, r) {
            var i = this;
            return this.Qi(e).next(function (t) {
              return (
                (t.highestListenSequenceNumber = n),
                r && (t.lastRemoteSnapshotVersion = r.G()),
                n > t.highestListenSequenceNumber &&
                  (t.highestListenSequenceNumber = n),
                i.Ki(e, t)
              );
            });
          }),
          (Oh.prototype.zi = function (e, n) {
            var r = this;
            return this.Hi(e, n).next(function () {
              return r.Qi(e).next(function (t) {
                return (t.targetCount += 1), r.Ji(n, t), r.Ki(e, t);
              });
            });
          }),
          (Oh.prototype.Yi = function (t, e) {
            return this.Hi(t, e);
          }),
          (Oh.prototype.Xi = function (e, t) {
            var n = this;
            return this.Zi(e, t.targetId)
              .next(function () {
                return Ch(e).delete(t.targetId);
              })
              .next(function () {
                return n.Qi(e);
              })
              .next(function (t) {
                return hi(0 < t.targetCount), --t.targetCount, n.Ki(e, t);
              });
          }),
          (Oh.prototype.tr = function (n, r, i) {
            var o = this,
              s = 0,
              u = [];
            return Ch(n)
              .ls(function (t, e) {
                e = Zc(e);
                e.sequenceNumber <= r &&
                  null === i.get(e.targetId) &&
                  (s++, u.push(o.Xi(n, e)));
              })
              .next(function () {
                return Xa.$n(u);
              })
              .next(function () {
                return s;
              });
          }),
          (Oh.prototype.mn = function (t, n) {
            return Ch(t).ls(function (t, e) {
              e = Zc(e);
              n(e);
            });
          }),
          (Oh.prototype.Qi = function (t) {
            return Ph(t)
              .get(kc.key)
              .next(function (t) {
                return hi(null !== t), t;
              });
          }),
          (Oh.prototype.Ki = function (t, e) {
            return Ph(t).put(kc.key, e);
          }),
          (Oh.prototype.Hi = function (t, e) {
            return Ch(t).put(th(this.Kt, e));
          }),
          (Oh.prototype.Ji = function (t, e) {
            var n = !1;
            return (
              t.targetId > e.highestTargetId &&
                ((e.highestTargetId = t.targetId), (n = !0)),
              t.sequenceNumber > e.highestListenSequenceNumber &&
                ((e.highestListenSequenceNumber = t.sequenceNumber), (n = !0)),
              n
            );
          }),
          (Oh.prototype.er = function (t) {
            return this.Qi(t).next(function (t) {
              return t.targetCount;
            });
          }),
          (Oh.prototype.nr = function (t, r) {
            var e = Wo(r),
              e = IDBKeyRange.bound(
                [e, Number.NEGATIVE_INFINITY],
                [e, Number.POSITIVE_INFINITY]
              ),
              i = null;
            return Ch(t)
              .ls(
                { range: e, index: Dc.queryTargetsIndexName },
                function (t, e, n) {
                  e = Zc(e);
                  Xo(r, e.target) && ((i = e), n.done());
                }
              )
              .next(function () {
                return i;
              });
          }),
          (Oh.prototype.sr = function (n, t, r) {
            var i = this,
              o = [],
              s = Lh(n);
            return (
              t.forEach(function (t) {
                var e = vc(t.path);
                o.push(s.put(new Oc(r, e))), o.push(i.mi.ir(n, r, t));
              }),
              Xa.$n(o)
            );
          }),
          (Oh.prototype.rr = function (n, t, r) {
            var i = this,
              o = Lh(n);
            return Xa.forEach(t, function (t) {
              var e = vc(t.path);
              return Xa.$n([o.delete([r, e]), i.mi.cr(n, r, t)]);
            });
          }),
          (Oh.prototype.Zi = function (t, e) {
            (t = Lh(t)), (e = IDBKeyRange.bound([e], [e + 1], !1, !0));
            return t.delete(e);
          }),
          (Oh.prototype.ar = function (t, e) {
            var e = IDBKeyRange.bound([e], [e + 1], !1, !0),
              t = Lh(t),
              r = ta();
            return t
              .ls({ range: e, hs: !0 }, function (t, e, n) {
                (t = mc(t[1])), (t = new Zi(t));
                r = r.add(t);
              })
              .next(function () {
                return r;
              });
          }),
          (Oh.prototype.Mi = function (t, e) {
            var e = vc(e.path),
              e = IDBKeyRange.bound([e], [yi(e)], !1, !0),
              i = 0;
            return Lh(t)
              .ls(
                { index: Oc.documentTargetsIndex, hs: !0, range: e },
                function (t, e, n) {
                  var r = t[0];
                  t[1], 0 !== r && (i++, n.done());
                }
              )
              .next(function () {
                return 0 < i;
              });
          }),
          (Oh.prototype.Dn = function (t, e) {
            return Ch(t)
              .get(e)
              .next(function (t) {
                return t ? Zc(t) : null;
              });
          }),
          Oh);
      function Oh(t, e) {
        (this.mi = t), (this.Kt = e);
      }
      function kh(t) {
        this.$i = t;
      }
      function Ch(t) {
        return Fc(t, Dc.store);
      }
      function Ph(t) {
        return Fc(t, kc.store);
      }
      function Lh(t) {
        return Fc(t, Oc.store);
      }
      function Rh(t, e) {
        var n = t[0],
          r = t[1],
          t = e[0],
          e = e[1],
          t = pi(n, t);
        return 0 === t ? pi(r, e) : t;
      }
      var Vh =
          ((Hh.prototype.lr = function () {
            return ++this.hr;
          }),
          (Hh.prototype._r = function (t) {
            var e = [t, this.lr()];
            this.buffer.size < this.ur
              ? (this.buffer = this.buffer.add(e))
              : Rh(e, (t = this.buffer.last())) < 0 &&
                (this.buffer = this.buffer.delete(t).add(e));
          }),
          Object.defineProperty(Hh.prototype, 'maxValue', {
            get: function () {
              return this.buffer.last()[0];
            },
            enumerable: !1,
            configurable: !0
          }),
          Hh),
        Mh =
          ((zh.prototype.start = function (t) {
            -1 !== this.dr.params.Js && this.Tr(t);
          }),
          (zh.prototype.stop = function () {
            this.Er && (this.Er.cancel(), (this.Er = null));
          }),
          Object.defineProperty(zh.prototype, 'Ir', {
            get: function () {
              return null !== this.Er;
            },
            enumerable: !1,
            configurable: !0
          }),
          (zh.prototype.Tr = function (n) {
            var t = this,
              e = this.wr ? 3e5 : 6e4;
            oi(
              'LruGarbageCollector',
              'Garbage collection scheduled in ' + e + 'ms'
            ),
              (this.Er = this.fs.mr('lru_garbage_collection', e, function () {
                return y(t, void 0, void 0, function () {
                  var e;
                  return v(this, function (t) {
                    switch (t.label) {
                      case 0:
                        (this.Er = null), (this.wr = !0), (t.label = 1);
                      case 1:
                        return t.trys.push([1, 3, , 7]), [4, n.Ar(this.dr)];
                      case 2:
                        return t.sent(), [3, 7];
                      case 3:
                        return oc((e = t.sent()))
                          ? (oi(
                              'LruGarbageCollector',
                              'Ignoring IndexedDB error during garbage collection: ',
                              e
                            ),
                            [3, 6])
                          : [3, 4];
                      case 4:
                        return [4, vh(e)];
                      case 5:
                        t.sent(), (t.label = 6);
                      case 6:
                        return [3, 7];
                      case 7:
                        return [4, this.Tr(n)];
                      case 8:
                        return t.sent(), [2];
                    }
                  });
                });
              }));
          }),
          zh),
        Uh =
          ((qh.prototype.Pr = function (t, e) {
            return this.Rr.yr(t).next(function (t) {
              return Math.floor((e / 100) * t);
            });
          }),
          (qh.prototype.gr = function (t, e) {
            var n = this;
            if (0 === e) return Xa.resolve(Fi.U);
            var r = new Vh(e);
            return this.Rr.mn(t, function (t) {
              return r._r(t.sequenceNumber);
            })
              .next(function () {
                return n.Rr.Vr(t, function (t) {
                  return r._r(t);
                });
              })
              .next(function () {
                return r.maxValue;
              });
          }),
          (qh.prototype.tr = function (t, e, n) {
            return this.Rr.tr(t, e, n);
          }),
          (qh.prototype.pr = function (t, e) {
            return this.Rr.pr(t, e);
          }),
          (qh.prototype.br = function (e, n) {
            var r = this;
            return -1 === this.params.Js
              ? (oi(
                  'LruGarbageCollector',
                  'Garbage collection skipped; disabled'
                ),
                Xa.resolve(ph))
              : this.vr(e).next(function (t) {
                  return t < r.params.Js
                    ? (oi(
                        'LruGarbageCollector',
                        'Garbage collection skipped; Cache size ' +
                          t +
                          ' is lower than threshold ' +
                          r.params.Js
                      ),
                      ph)
                    : r.Sr(e, n);
                });
          }),
          (qh.prototype.vr = function (t) {
            return this.Rr.vr(t);
          }),
          (qh.prototype.Sr = function (e, n) {
            var r,
              i,
              o,
              s,
              u,
              a,
              c,
              h = this,
              f = Date.now();
            return this.Pr(e, this.params.Ys)
              .next(function (t) {
                return (
                  (i =
                    t > h.params.Xs
                      ? (oi(
                          'LruGarbageCollector',
                          'Capping sequence numbers to collect down to the maximum of ' +
                            h.params.Xs +
                            ' from ' +
                            t
                        ),
                        h.params.Xs)
                      : t),
                  (s = Date.now()),
                  h.gr(e, i)
                );
              })
              .next(function (t) {
                return (r = t), (u = Date.now()), h.tr(e, r, n);
              })
              .next(function (t) {
                return (o = t), (a = Date.now()), h.pr(e, r);
              })
              .next(function (t) {
                return (
                  (c = Date.now()),
                  ii() <= C.DEBUG &&
                    oi(
                      'LruGarbageCollector',
                      'LRU Garbage Collection\n\tCounted targets in ' +
                        (s - f) +
                        'ms\n\tDetermined least recently used ' +
                        i +
                        ' in ' +
                        (u - s) +
                        'ms\n\tRemoved ' +
                        o +
                        ' targets in ' +
                        (a - u) +
                        'ms\n\tRemoved ' +
                        t +
                        ' documents in ' +
                        (c - a) +
                        'ms\nTotal Duration: ' +
                        (c - f) +
                        'ms'
                    ),
                  Xa.resolve({ js: !0, Gs: i, zs: o, Hs: t })
                );
              });
          }),
          qh),
        jh =
          ((Fh.prototype.yr = function (t) {
            var n = this.Dr(t);
            return this.db
              .Cr()
              .er(t)
              .next(function (e) {
                return n.next(function (t) {
                  return e + t;
                });
              });
          }),
          (Fh.prototype.Dr = function (t) {
            var e = 0;
            return this.Vr(t, function (t) {
              e++;
            }).next(function () {
              return e;
            });
          }),
          (Fh.prototype.mn = function (t, e) {
            return this.db.Cr().mn(t, e);
          }),
          (Fh.prototype.Vr = function (t, n) {
            return this.Nr(t, function (t, e) {
              return n(e);
            });
          }),
          (Fh.prototype.ir = function (t, e, n) {
            return Bh(t, n);
          }),
          (Fh.prototype.cr = function (t, e, n) {
            return Bh(t, n);
          }),
          (Fh.prototype.tr = function (t, e, n) {
            return this.db.Cr().tr(t, e, n);
          }),
          (Fh.prototype.Oi = Bh),
          (Fh.prototype.Fr = function (t, e) {
            return (
              (r = e),
              (i = !1),
              Sh((n = t))
                ._s(function (t) {
                  return Th(n, t, r).next(function (t) {
                    return t && (i = !0), Xa.resolve(!t);
                  });
                })
                .next(function () {
                  return i;
                })
            );
            var n, r, i;
          }),
          (Fh.prototype.pr = function (n, r) {
            var i = this,
              o = this.db.kr().Or(),
              s = [],
              u = 0;
            return this.Nr(n, function (e, t) {
              t <= r &&
                ((t = i.Fr(n, e).next(function (t) {
                  if (!t)
                    return (
                      u++,
                      o.di(n, e).next(function () {
                        return o.fi(e), Lh(n).delete([0, vc(e.path)]);
                      })
                    );
                })),
                s.push(t));
            })
              .next(function () {
                return Xa.$n(s);
              })
              .next(function () {
                return o.apply(n);
              })
              .next(function () {
                return u;
              });
          }),
          (Fh.prototype.removeTarget = function (t, e) {
            e = e.Lt(t.Ss);
            return this.db.Cr().Yi(t, e);
          }),
          (Fh.prototype.Mr = Bh),
          (Fh.prototype.Nr = function (t, r) {
            var i,
              t = Lh(t),
              o = Fi.U;
            return t
              .ls({ index: Oc.documentTargetsIndex }, function (t, e) {
                var n = t[0],
                  t = (t[1], e.path),
                  e = e.sequenceNumber;
                0 === n
                  ? (o !== Fi.U && r(new Zi(mc(i)), o), (o = e), (i = t))
                  : (o = Fi.U);
              })
              .next(function () {
                o !== Fi.U && r(new Zi(mc(i)), o);
              });
          }),
          (Fh.prototype.vr = function (t) {
            return this.db.kr().Lr(t);
          }),
          Fh);
      function Fh(t, e) {
        (this.db = t), (this.dr = new Uh(this, e));
      }
      function qh(t, e) {
        (this.Rr = t), (this.params = e);
      }
      function zh(t, e) {
        (this.dr = t), (this.fs = e), (this.wr = !1), (this.Er = null);
      }
      function Hh(t) {
        (this.ur = t), (this.buffer = new Ku(Rh)), (this.hr = 0);
      }
      function Bh(t, e) {
        return Lh(t).put(((t = t.Ss), new Oc(0, vc(e.path), t)));
      }
      var Gh,
        Kh =
          ((Xh.prototype.hi = function (t, e, n) {
            return $h(t).put(Qh(e), n);
          }),
          (Xh.prototype.fi = function (t, e) {
            (t = $h(t)), (e = Qh(e));
            return t.delete(e);
          }),
          (Xh.prototype.updateMetadata = function (e, n) {
            var r = this;
            return this.getMetadata(e).next(function (t) {
              return (t.byteSize += n), r.$r(e, t);
            });
          }),
          (Xh.prototype.di = function (t, e) {
            var n = this;
            return $h(t)
              .get(Qh(e))
              .next(function (t) {
                return n.Br(t);
              });
          }),
          (Xh.prototype.qr = function (t, e) {
            var n = this;
            return $h(t)
              .get(Qh(e))
              .next(function (t) {
                var e = n.Br(t);
                return e ? { _i: e, size: Ih(t) } : null;
              });
          }),
          (Xh.prototype.getEntries = function (t, e) {
            var n = this,
              r = Wu;
            return this.Ur(t, e, function (t, e) {
              e = n.Br(e);
              r = r.Ht(t, e);
            }).next(function () {
              return r;
            });
          }),
          (Xh.prototype.Qr = function (t, e) {
            var r = this,
              i = Wu,
              o = new ju(Zi.J);
            return this.Ur(t, e, function (t, e) {
              var n = r.Br(e);
              o = n
                ? ((i = i.Ht(t, n)), o.Ht(t, Ih(e)))
                : ((i = i.Ht(t, null)), o.Ht(t, 0));
            }).next(function () {
              return { Kr: i, Wr: o };
            });
          }),
          (Xh.prototype.Ur = function (t, e, i) {
            if (e.nt()) return Xa.resolve();
            var n = IDBKeyRange.bound(e.first().path.rt(), e.last().path.rt()),
              o = e.ee(),
              s = o.ce();
            return $h(t)
              .ls({ range: n }, function (t, e, n) {
                for (var r = Zi.Tt(t); s && Zi.J(s, r) < 0; )
                  i(s, null), (s = o.ce());
                s && s.isEqual(r) && (i(s, e), (s = o.ae() ? o.ce() : null)),
                  s ? n.rs(s.path.rt()) : n.done();
              })
              .next(function () {
                for (; s; ) i(s, null), (s = o.ae() ? o.ce() : null);
              });
          }),
          (Xh.prototype.jr = function (t, r, e) {
            var n,
              i = this,
              o = $u,
              s = r.path.length + 1,
              u = {};
            return (
              e.isEqual(Xi.min())
                ? ((n = r.path.rt()), (u.range = IDBKeyRange.lowerBound(n)))
                : ((n = r.path.rt()),
                  (e = Wc(e)),
                  (u.range = IDBKeyRange.lowerBound([n, e], !0)),
                  (u.index = Sc.collectionReadTimeIndex)),
              $h(t)
                .ls(u, function (t, e, n) {
                  t.length === s &&
                    ((e = Kc(i.Kt, e)),
                    r.path.st(e.key.path)
                      ? e instanceof Fo && qs(r, e) && (o = o.Ht(e.key, e))
                      : n.done());
                })
                .next(function () {
                  return o;
                })
            );
          }),
          (Xh.prototype.Or = function (t) {
            return new Jh(this, !!t && t.Gr);
          }),
          (Xh.prototype.Lr = function (t) {
            return this.getMetadata(t).next(function (t) {
              return t.byteSize;
            });
          }),
          (Xh.prototype.getMetadata = function (t) {
            return Yh(t)
              .get(xc.key)
              .next(function (t) {
                return hi(!!t), t;
              });
          }),
          (Xh.prototype.$r = function (t, e) {
            return Yh(t).put(xc.key, e);
          }),
          (Xh.prototype.Br = function (t) {
            if (t) {
              t = Kc(this.Kt, t);
              return t instanceof qo && t.version.isEqual(Xi.min()) ? null : t;
            }
            return null;
          }),
          Xh),
        Jh =
          (t(Wh, (Gh = $)),
          (Wh.prototype.Ti = function (i) {
            var o = this,
              s = [],
              u = 0,
              a = new Ku(function (t, e) {
                return pi(t.ot(), e.ot());
              });
            return (
              this.ci.forEach(function (t, e) {
                var n,
                  r = o.Hr.get(t);
                e._i
                  ? ((n = Jc(o.zr.Kt, e._i, o.ui(t))),
                    (a = a.add(t.path.Z())),
                    (e = Ih(n)),
                    (u += e - r),
                    s.push(o.zr.hi(i, t, n)))
                  : ((u -= r),
                    o.Gr
                      ? ((r = Jc(o.zr.Kt, new qo(t, Xi.min()), o.ui(t))),
                        s.push(o.zr.hi(i, t, r)))
                      : s.push(o.zr.fi(i, t)));
              }),
              a.forEach(function (t) {
                s.push(o.zr.Ii.Qs(i, t));
              }),
              s.push(this.zr.updateMetadata(i, u)),
              Xa.$n(s)
            );
          }),
          (Wh.prototype.wi = function (t, e) {
            var n = this;
            return this.zr.qr(t, e).next(function (t) {
              return null === t
                ? (n.Hr.set(e, 0), null)
                : (n.Hr.set(e, t.size), t._i);
            });
          }),
          (Wh.prototype.Ei = function (t, e) {
            var n = this;
            return this.zr.Qr(t, e).next(function (t) {
              var e = t.Kr;
              return (
                t.Wr.forEach(function (t, e) {
                  n.Hr.set(t, e);
                }),
                e
              );
            });
          }),
          Wh);
      function Wh(t, e) {
        var n = this;
        return (
          ((n = Gh.call(this) || this).zr = t),
          (n.Gr = e),
          (n.Hr = new gh(
            function (t) {
              return t.toString();
            },
            function (t, e) {
              return t.isEqual(e);
            }
          )),
          n
        );
      }
      function Xh(t, e) {
        (this.Kt = t), (this.Ii = e);
      }
      function Yh(t) {
        return Fc(t, xc.store);
      }
      function $h(t) {
        return Fc(t, Sc.store);
      }
      function Qh(t) {
        return t.path.rt();
      }
      var Zh =
        ((tf.prototype.Yn = function (e, n, t, r) {
          var i = this;
          hi(t < r && 0 <= t && r <= 11);
          var o = new Ya('createOrUpgrade', n);
          t < 1 &&
            1 <= r &&
            (e.createObjectStore(bc.store),
            (s = e).createObjectStore(Ic.store, { keyPath: Ic.keyPath }),
            s
              .createObjectStore(Ec.store, {
                keyPath: Ec.keyPath,
                autoIncrement: !0
              })
              .createIndex(Ec.userMutationsIndex, Ec.userMutationsKeyPath, {
                unique: !0
              }),
            s.createObjectStore(_c.store),
            ef(e),
            e.createObjectStore(Sc.store));
          var s,
            u = Xa.resolve();
          return (
            t < 3 &&
              3 <= r &&
              (0 !== t &&
                ((s = e).deleteObjectStore(Oc.store),
                s.deleteObjectStore(Dc.store),
                s.deleteObjectStore(kc.store),
                ef(e)),
              (u = u.next(function () {
                return (
                  (t = o.store(kc.store)),
                  (e = new kc(0, 0, Xi.min().G(), 0)),
                  t.put(kc.key, e)
                );
                var t, e;
              }))),
            t < 4 &&
              4 <= r &&
              (0 !== t &&
                (u = u.next(function () {
                  return (
                    (n = e),
                    (r = o)
                      .store(Ec.store)
                      .os()
                      .next(function (t) {
                        n.deleteObjectStore(Ec.store),
                          n
                            .createObjectStore(Ec.store, {
                              keyPath: Ec.keyPath,
                              autoIncrement: !0
                            })
                            .createIndex(
                              Ec.userMutationsIndex,
                              Ec.userMutationsKeyPath,
                              { unique: !0 }
                            );
                        var e = r.store(Ec.store),
                          t = t.map(function (t) {
                            return e.put(t);
                          });
                        return Xa.$n(t);
                      })
                  );
                  var n, r;
                })),
              (u = u.next(function () {
                e.createObjectStore(Pc.store, { keyPath: Pc.keyPath });
              }))),
            t < 5 &&
              5 <= r &&
              (u = u.next(function () {
                return i.Jr(o);
              })),
            t < 6 &&
              6 <= r &&
              (u = u.next(function () {
                return e.createObjectStore(xc.store), i.Yr(o);
              })),
            t < 7 &&
              7 <= r &&
              (u = u.next(function () {
                return i.Xr(o);
              })),
            t < 8 &&
              8 <= r &&
              (u = u.next(function () {
                return i.Zr(e, o);
              })),
            t < 9 &&
              9 <= r &&
              (u = u.next(function () {
                var t;
                (t = e).objectStoreNames.contains('remoteDocumentChanges') &&
                  t.deleteObjectStore('remoteDocumentChanges'),
                  (t = n.objectStore(Sc.store)).createIndex(
                    Sc.readTimeIndex,
                    Sc.readTimeIndexPath,
                    { unique: !1 }
                  ),
                  t.createIndex(
                    Sc.collectionReadTimeIndex,
                    Sc.collectionReadTimeIndexPath,
                    { unique: !1 }
                  );
              })),
            t < 10 &&
              10 <= r &&
              (u = u.next(function () {
                return i.eo(o);
              })),
            t < 11 &&
              11 <= r &&
              (u = u.next(function () {
                e.createObjectStore(Lc.store, { keyPath: Lc.keyPath }),
                  e.createObjectStore(Rc.store, { keyPath: Rc.keyPath });
              })),
            u
          );
        }),
        (tf.prototype.Yr = function (e) {
          var n = 0;
          return e
            .store(Sc.store)
            .ls(function (t, e) {
              n += Ih(e);
            })
            .next(function () {
              var t = new xc(n);
              return e.store(xc.store).put(xc.key, t);
            });
        }),
        (tf.prototype.Jr = function (n) {
          var r = this,
            t = n.store(Ic.store),
            i = n.store(Ec.store);
          return t.os().next(function (t) {
            return Xa.forEach(t, function (e) {
              var t = IDBKeyRange.bound(
                [e.userId, -1],
                [e.userId, e.lastAcknowledgedBatchId]
              );
              return i.os(Ec.userMutationsIndex, t).next(function (t) {
                return Xa.forEach(t, function (t) {
                  hi(t.userId === e.userId);
                  t = Qc(r.Kt, t);
                  return wh(n, e.userId, t).next(function () {});
                });
              });
            });
          });
        }),
        (tf.prototype.Xr = function (t) {
          var o = t.store(Oc.store),
            e = t.store(Sc.store);
          return t
            .store(kc.store)
            .get(kc.key)
            .next(function (r) {
              var i = [];
              return e
                .ls(function (t, e) {
                  var n = new Yi(t),
                    t = [0, vc(n)];
                  i.push(
                    o.get(t).next(function (t) {
                      return t
                        ? Xa.resolve()
                        : o.put(
                            new Oc(0, vc(n), r.highestListenSequenceNumber)
                          );
                    })
                  );
                })
                .next(function () {
                  return Xa.$n(i);
                });
            });
        }),
        (tf.prototype.Zr = function (t, e) {
          t.createObjectStore(Cc.store, { keyPath: Cc.keyPath });
          function r(t) {
            if (i.add(t)) {
              var e = t.et(),
                t = t.Z();
              return n.put({ collectionId: e, parent: vc(t) });
            }
          }
          var n = e.store(Cc.store),
            i = new uh();
          return e
            .store(Sc.store)
            .ls({ hs: !0 }, function (t, e) {
              t = new Yi(t);
              return r(t.Z());
            })
            .next(function () {
              return e.store(_c.store).ls({ hs: !0 }, function (t, e) {
                t[0];
                var n = t[1],
                  n = (t[2], mc(n));
                return r(n.Z());
              });
            });
        }),
        (tf.prototype.eo = function (t) {
          var n = this,
            r = t.store(Dc.store);
          return r.ls(function (t, e) {
            (e = Zc(e)), (e = th(n.Kt, e));
            return r.put(e);
          });
        }),
        tf);
      function tf(t) {
        this.Kt = t;
      }
      function ef(t) {
        t
          .createObjectStore(Oc.store, { keyPath: Oc.keyPath })
          .createIndex(Oc.documentTargetsIndex, Oc.documentTargetsKeyPath, {
            unique: !0
          }),
          t
            .createObjectStore(Dc.store, { keyPath: Dc.keyPath })
            .createIndex(Dc.queryTargetsIndexName, Dc.queryTargetsKeyPath, {
              unique: !0
            }),
          t.createObjectStore(kc.store);
      }
      var nf =
          'Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.',
        rf =
          ((of.prototype.start = function () {
            var e = this;
            return this.mo()
              .then(function () {
                if (!e.isPrimary && !e.allowTabSynchronization)
                  throw new wi(bi.FAILED_PRECONDITION, nf);
                return (
                  e.Ao(),
                  e.Ro(),
                  e.Po(),
                  e.runTransaction(
                    'getHighestListenSequenceNumber',
                    'readonly',
                    function (t) {
                      return e.wo.ji(t);
                    }
                  )
                );
              })
              .then(function (t) {
                e.ro = new Fi(t, e.so);
              })
              .then(function () {
                e.oo = !0;
              })
              .catch(function (t) {
                return e.fo && e.fo.close(), Promise.reject(t);
              });
          }),
          (of.prototype.yo = function (n) {
            var t = this;
            return (
              (this.lo = function (e) {
                return y(t, void 0, void 0, function () {
                  return v(this, function (t) {
                    return this.Ir ? [2, n(e)] : [2];
                  });
                });
              }),
              n(this.isPrimary)
            );
          }),
          (of.prototype.Vo = function (n) {
            var t = this;
            this.fo.Zn(function (e) {
              return y(t, void 0, void 0, function () {
                return v(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return null === e.newVersion ? [4, n()] : [3, 2];
                    case 1:
                      t.sent(), (t.label = 2);
                    case 2:
                      return [2];
                  }
                });
              });
            });
          }),
          (of.prototype.po = function (t) {
            var e = this;
            this.networkEnabled !== t &&
              ((this.networkEnabled = t),
              this.no.ys(function () {
                return y(e, void 0, void 0, function () {
                  return v(this, function (t) {
                    switch (t.label) {
                      case 0:
                        return this.Ir ? [4, this.mo()] : [3, 2];
                      case 1:
                        t.sent(), (t.label = 2);
                      case 2:
                        return [2];
                    }
                  });
                });
              }));
          }),
          (of.prototype.mo = function () {
            var n = this;
            return this.runTransaction(
              'updateClientMetadataAndTryBecomePrimary',
              'readwrite',
              function (e) {
                return uf(e)
                  .put(
                    new Pc(
                      n.clientId,
                      Date.now(),
                      n.networkEnabled,
                      n.inForeground
                    )
                  )
                  .next(function () {
                    if (n.isPrimary)
                      return n.bo(e).next(function (t) {
                        t ||
                          ((n.isPrimary = !1),
                          n.no.vo(function () {
                            return n.lo(!1);
                          }));
                      });
                  })
                  .next(function () {
                    return n.So(e);
                  })
                  .next(function (t) {
                    return n.isPrimary && !t
                      ? n.Do(e).next(function () {
                          return !1;
                        })
                      : !!t &&
                          n.Co(e).next(function () {
                            return !0;
                          });
                  });
              }
            )
              .catch(function (t) {
                if (oc(t))
                  return (
                    oi(
                      'IndexedDbPersistence',
                      'Failed to extend owner lease: ',
                      t
                    ),
                    n.isPrimary
                  );
                if (!n.allowTabSynchronization) throw t;
                return (
                  oi(
                    'IndexedDbPersistence',
                    'Releasing owner lease after error during lease refresh',
                    t
                  ),
                  !1
                );
              })
              .then(function (t) {
                n.isPrimary !== t &&
                  n.no.vo(function () {
                    return n.lo(t);
                  }),
                  (n.isPrimary = t);
              });
          }),
          (of.prototype.bo = function (t) {
            var e = this;
            return sf(t)
              .get(bc.key)
              .next(function (t) {
                return Xa.resolve(e.xo(t));
              });
          }),
          (of.prototype.No = function (t) {
            return uf(t).delete(this.clientId);
          }),
          (of.prototype.Fo = function () {
            return y(this, void 0, void 0, function () {
              var e,
                n,
                r,
                i,
                o = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return !this.isPrimary || this.Oo(this.ho, 18e5)
                      ? [3, 2]
                      : ((this.ho = Date.now()),
                        [
                          4,
                          this.runTransaction(
                            'maybeGarbageCollectMultiClientState',
                            'readwrite-primary',
                            function (t) {
                              var r = Fc(t, Pc.store);
                              return r.os().next(function (t) {
                                var e = o.ko(t, 18e5),
                                  n = t.filter(function (t) {
                                    return -1 === e.indexOf(t);
                                  });
                                return Xa.forEach(n, function (t) {
                                  return r.delete(t.clientId);
                                }).next(function () {
                                  return n;
                                });
                              });
                            }
                          ).catch(function () {
                            return [];
                          })
                        ]);
                  case 1:
                    if (((e = t.sent()), this.Io))
                      for (n = 0, r = e; n < r.length; n++)
                        (i = r[n]), this.Io.removeItem(this.Mo(i.clientId));
                    t.label = 2;
                  case 2:
                    return [2];
                }
              });
            });
          }),
          (of.prototype.Po = function () {
            var t = this;
            this.uo = this.no.mr('client_metadata_refresh', 4e3, function () {
              return t
                .mo()
                .then(function () {
                  return t.Fo();
                })
                .then(function () {
                  return t.Po();
                });
            });
          }),
          (of.prototype.xo = function (t) {
            return !!t && t.ownerId === this.clientId;
          }),
          (of.prototype.So = function (e) {
            var r = this;
            return this.io
              ? Xa.resolve(!0)
              : sf(e)
                  .get(bc.key)
                  .next(function (t) {
                    if (
                      null !== t &&
                      r.Oo(t.leaseTimestampMs, 5e3) &&
                      !r.Lo(t.ownerId)
                    ) {
                      if (r.xo(t) && r.networkEnabled) return !0;
                      if (!r.xo(t)) {
                        if (!t.allowTabSynchronization)
                          throw new wi(bi.FAILED_PRECONDITION, nf);
                        return !1;
                      }
                    }
                    return (
                      !(!r.networkEnabled || !r.inForeground) ||
                      uf(e)
                        .os()
                        .next(function (t) {
                          return (
                            void 0 ===
                            r.ko(t, 5e3).find(function (t) {
                              if (r.clientId !== t.clientId) {
                                var e = !r.networkEnabled && t.networkEnabled,
                                  n = !r.inForeground && t.inForeground,
                                  t = r.networkEnabled === t.networkEnabled;
                                if (e || (n && t)) return !0;
                              }
                              return !1;
                            })
                          );
                        })
                    );
                  })
                  .next(function (t) {
                    return (
                      r.isPrimary !== t &&
                        oi(
                          'IndexedDbPersistence',
                          'Client ' +
                            (t ? 'is' : 'is not') +
                            ' eligible for a primary lease.'
                        ),
                      t
                    );
                  });
          }),
          (of.prototype.$o = function () {
            return y(this, void 0, void 0, function () {
              var n = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      (this.oo = !1),
                      this.Bo(),
                      this.uo && (this.uo.cancel(), (this.uo = null)),
                      this.qo(),
                      this.Uo(),
                      [
                        4,
                        this.fo.runTransaction(
                          'shutdown',
                          'readwrite',
                          [bc.store, Pc.store],
                          function (t) {
                            var e = new Uc(t, Fi.U);
                            return n.Do(e).next(function () {
                              return n.No(e);
                            });
                          }
                        )
                      ]
                    );
                  case 1:
                    return t.sent(), this.fo.close(), this.Qo(), [2];
                }
              });
            });
          }),
          (of.prototype.ko = function (t, e) {
            var n = this;
            return t.filter(function (t) {
              return n.Oo(t.updateTimeMs, e) && !n.Lo(t.clientId);
            });
          }),
          (of.prototype.Ko = function () {
            var e = this;
            return this.runTransaction(
              'getActiveClients',
              'readonly',
              function (t) {
                return uf(t)
                  .os()
                  .next(function (t) {
                    return e.ko(t, 18e5).map(function (t) {
                      return t.clientId;
                    });
                  });
              }
            );
          }),
          Object.defineProperty(of.prototype, 'Ir', {
            get: function () {
              return this.oo;
            },
            enumerable: !1,
            configurable: !0
          }),
          (of.prototype.Wo = function (t) {
            return Eh.Ri(t, this.Kt, this.Ii, this.mi);
          }),
          (of.prototype.Cr = function () {
            return this.wo;
          }),
          (of.prototype.kr = function () {
            return this.Eo;
          }),
          (of.prototype.jo = function () {
            return this.Ii;
          }),
          (of.prototype.Go = function () {
            return this.To;
          }),
          (of.prototype.runTransaction = function (e, n, r) {
            var i = this;
            oi('IndexedDbPersistence', 'Starting transaction:', e);
            var o,
              t = 'readonly' === n ? 'readonly' : 'readwrite';
            return this.fo
              .runTransaction(e, t, Mc, function (t) {
                return (
                  (o = new Uc(t, i.ro ? i.ro.next() : Fi.U)),
                  'readwrite-primary' === n
                    ? i
                        .bo(o)
                        .next(function (t) {
                          return !!t || i.So(o);
                        })
                        .next(function (t) {
                          if (!t)
                            throw (
                              (si(
                                "Failed to obtain primary lease for action '" +
                                  e +
                                  "'."
                              ),
                              (i.isPrimary = !1),
                              i.no.vo(function () {
                                return i.lo(!1);
                              }),
                              new wi(bi.FAILED_PRECONDITION, dc))
                            );
                          return r(o);
                        })
                        .next(function (t) {
                          return i.Co(o).next(function () {
                            return t;
                          });
                        })
                    : i.zo(o).next(function () {
                        return r(o);
                      })
                );
              })
              .then(function (t) {
                return o.bs(), t;
              });
          }),
          (of.prototype.zo = function (t) {
            var e = this;
            return sf(t)
              .get(bc.key)
              .next(function (t) {
                if (
                  null !== t &&
                  e.Oo(t.leaseTimestampMs, 5e3) &&
                  !e.Lo(t.ownerId) &&
                  !e.xo(t) &&
                  !(
                    e.io ||
                    (e.allowTabSynchronization && t.allowTabSynchronization)
                  )
                )
                  throw new wi(bi.FAILED_PRECONDITION, nf);
              });
          }),
          (of.prototype.Co = function (t) {
            var e = new bc(
              this.clientId,
              this.allowTabSynchronization,
              Date.now()
            );
            return sf(t).put(bc.key, e);
          }),
          (of.Wn = function () {
            return $a.Wn();
          }),
          (of.prototype.Do = function (t) {
            var e = this,
              n = sf(t);
            return n.get(bc.key).next(function (t) {
              return e.xo(t)
                ? (oi('IndexedDbPersistence', 'Releasing primary lease.'),
                  n.delete(bc.key))
                : Xa.resolve();
            });
          }),
          (of.prototype.Oo = function (t, e) {
            var n = Date.now();
            return !(
              t < n - e ||
              (n < t &&
                (si(
                  'Detected an update time that is in the future: ' +
                    t +
                    ' > ' +
                    n
                ),
                1))
            );
          }),
          (of.prototype.Ao = function () {
            var t = this;
            null !== this.document &&
              'function' == typeof this.document.addEventListener &&
              ((this.ao = function () {
                t.no.ys(function () {
                  return (
                    (t.inForeground = 'visible' === t.document.visibilityState),
                    t.mo()
                  );
                });
              }),
              this.document.addEventListener('visibilitychange', this.ao),
              (this.inForeground =
                'visible' === this.document.visibilityState));
          }),
          (of.prototype.qo = function () {
            this.ao &&
              (this.document.removeEventListener('visibilitychange', this.ao),
              (this.ao = null));
          }),
          (of.prototype.Ro = function () {
            var t,
              e = this;
            'function' ==
              typeof (null === (t = this.window) || void 0 === t
                ? void 0
                : t.addEventListener) &&
              ((this.co = function () {
                e.Bo(),
                  e.no.ys(function () {
                    return e.$o();
                  });
              }),
              this.window.addEventListener('unload', this.co));
          }),
          (of.prototype.Uo = function () {
            this.co &&
              (this.window.removeEventListener('unload', this.co),
              (this.co = null));
          }),
          (of.prototype.Lo = function (t) {
            try {
              var e =
                null !==
                (null === (e = this.Io) || void 0 === e
                  ? void 0
                  : e.getItem(this.Mo(t)));
              return (
                oi(
                  'IndexedDbPersistence',
                  "Client '" +
                    t +
                    "' " +
                    (e ? 'is' : 'is not') +
                    ' zombied in LocalStorage'
                ),
                e
              );
            } catch (t) {
              return (
                si(
                  'IndexedDbPersistence',
                  'Failed to get zombied client id.',
                  t
                ),
                !1
              );
            }
          }),
          (of.prototype.Bo = function () {
            if (this.Io)
              try {
                this.Io.setItem(this.Mo(this.clientId), String(Date.now()));
              } catch (t) {
                si('Failed to set zombie client id.', t);
              }
          }),
          (of.prototype.Qo = function () {
            if (this.Io)
              try {
                this.Io.removeItem(this.Mo(this.clientId));
              } catch (t) {}
          }),
          (of.prototype.Mo = function (t) {
            return 'firestore_zombie_' + this.persistenceKey + '_' + t;
          }),
          of);
      function of(t, e, n, r, i, o, s, u, a, c) {
        if (
          ((this.allowTabSynchronization = t),
          (this.persistenceKey = e),
          (this.clientId = n),
          (this.no = i),
          (this.window = o),
          (this.document = s),
          (this.so = a),
          (this.io = c),
          (this.ro = null),
          (this.oo = !1),
          (this.isPrimary = !1),
          (this.networkEnabled = !0),
          (this.co = null),
          (this.inForeground = !1),
          (this.ao = null),
          (this.uo = null),
          (this.ho = Number.NEGATIVE_INFINITY),
          (this.lo = function (t) {
            return Promise.resolve();
          }),
          !of.Wn())
        )
          throw new wi(
            bi.UNIMPLEMENTED,
            'This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.'
          );
        (this.mi = new jh(this, r)),
          (this._o = e + 'main'),
          (this.Kt = new Hc(u)),
          (this.fo = new $a(this._o, 11, new Zh(this.Kt))),
          (this.wo = new Dh(this.mi, this.Kt)),
          (this.Ii = new ah()),
          (this.Eo = ((e = this.Kt), (u = this.Ii), new Kh(e, u))),
          (this.To = new nh()),
          this.window && this.window.localStorage
            ? (this.Io = this.window.localStorage)
            : ((this.Io = null),
              !1 === c &&
                si(
                  'IndexedDbPersistence',
                  'LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page.'
                ));
      }
      function sf(t) {
        return Fc(t, bc.store);
      }
      function uf(t) {
        return Fc(t, Pc.store);
      }
      function af(t, e) {
        var n = t.projectId;
        return t.m || (n += '.' + t.database), 'firestore/' + e + '/' + n + '/';
      }
      var cf =
          ((vf.prototype.Jo = function (e, n) {
            var r = this;
            return this.Ho.Si(e, n).next(function (t) {
              return r.Yo(e, n, t);
            });
          }),
          (vf.prototype.Yo = function (t, r, i) {
            return this.Eo.di(t, r).next(function (t) {
              for (var e = 0, n = i; e < n.length; e++) t = n[e].Ns(r, t);
              return t;
            });
          }),
          (vf.prototype.Xo = function (t, e, i) {
            var o = Wu;
            return (
              e.forEach(function (t, e) {
                for (var n = 0, r = i; n < r.length; n++) e = r[n].Ns(t, e);
                o = o.Ht(t, e);
              }),
              o
            );
          }),
          (vf.prototype.Zo = function (e, t) {
            var n = this;
            return this.Eo.getEntries(e, t).next(function (t) {
              return n.tc(e, t);
            });
          }),
          (vf.prototype.tc = function (e, r) {
            var i = this;
            return this.Ho.Di(e, r).next(function (t) {
              var t = i.Xo(e, r, t),
                n = Wu;
              return (
                t.forEach(function (t, e) {
                  (e = e || new qo(t, Xi.min())), (n = n.Ht(t, e));
                }),
                n
              );
            });
          }),
          (vf.prototype.jr = function (t, e, n) {
            return (
              (r = e),
              Zi.Et(r.path) &&
              null === r.collectionGroup &&
              0 === r.filters.length
                ? this.ec(t, e.path)
                : Ls(e)
                ? this.nc(t, e, n)
                : this.sc(t, e, n)
            );
            var r;
          }),
          (vf.prototype.ec = function (t, e) {
            return this.Jo(t, new Zi(e)).next(function (t) {
              var e = $u;
              return t instanceof Fo && (e = e.Ht(t.key, t)), e;
            });
          }),
          (vf.prototype.nc = function (n, r, i) {
            var o = this,
              s = r.collectionGroup,
              u = $u;
            return this.Ii.Ks(n, s).next(function (t) {
              return Xa.forEach(t, function (t) {
                var e,
                  e =
                    ((e = r),
                    (t = t.child(s)),
                    new Ss(
                      t,
                      null,
                      e.Nt.slice(),
                      e.filters.slice(),
                      e.limit,
                      e.limitType,
                      e.startAt,
                      e.endAt
                    ));
                return o.sc(n, e, i).next(function (t) {
                  t.forEach(function (t, e) {
                    u = u.Ht(t, e);
                  });
                });
              }).next(function () {
                return u;
              });
            });
          }),
          (vf.prototype.sc = function (e, n, t) {
            var c,
              h,
              r = this;
            return this.Eo.jr(e, n, t)
              .next(function (t) {
                return (c = t), r.Ho.xi(e, n);
              })
              .next(function (t) {
                return (
                  (h = t),
                  r.ic(e, h, c).next(function (t) {
                    c = t;
                    for (var e = 0, n = h; e < n.length; e++)
                      for (
                        var r = n[e], i = 0, o = r.mutations;
                        i < o.length;
                        i++
                      ) {
                        var s = o[i],
                          u = s.key,
                          a = c.get(u),
                          a = vu(s, a, a, r.Ds);
                        c = a instanceof Fo ? c.Ht(u, a) : c.remove(u);
                      }
                  })
                );
              })
              .next(function () {
                return (
                  c.forEach(function (t, e) {
                    qs(n, e) || (c = c.remove(t));
                  }),
                  c
                );
              });
          }),
          (vf.prototype.ic = function (t, e, n) {
            for (var r = ta(), i = 0, o = e; i < o.length; i++)
              for (var s = 0, u = o[i].mutations; s < u.length; s++) {
                var a = u[s];
                a instanceof Eu && null === n.get(a.key) && (r = r.add(a.key));
              }
            var c = n;
            return this.Eo.getEntries(t, r).next(function (t) {
              return (
                t.forEach(function (t, e) {
                  null !== e && e instanceof Fo && (c = c.Ht(t, e));
                }),
                c
              );
            });
          }),
          vf),
        hf =
          ((yf.cc = function (t, e) {
            for (
              var n = ta(), r = ta(), i = 0, o = e.docChanges;
              i < o.length;
              i++
            ) {
              var s = o[i];
              switch (s.type) {
                case 0:
                  n = n.add(s.doc.key);
                  break;
                case 1:
                  r = r.add(s.doc.key);
              }
            }
            return new yf(t, e.fromCache, n, r);
          }),
          yf),
        ff =
          ((df.prototype.ac = function (t) {
            this.uc = t;
          }),
          (df.prototype.jr = function (e, r, i, o) {
            var s = this;
            return (0 === r.filters.length &&
              null === r.limit &&
              null == r.startAt &&
              null == r.endAt &&
              (0 === r.Nt.length ||
                (1 === r.Nt.length && r.Nt[0].field.ht()))) ||
              i.isEqual(Xi.min())
              ? this.hc(e, r)
              : this.uc.Zo(e, o).next(function (t) {
                  var n = s.lc(r, t);
                  return (Os(r) || ks(r)) && s._c(r.limitType, n, o, i)
                    ? s.hc(e, r)
                    : (ii() <= C.DEBUG &&
                        oi(
                          'QueryEngine',
                          'Re-using previous result from %s to execute query: %s',
                          i.toString(),
                          Fs(r)
                        ),
                      s.uc.jr(e, r, i).next(function (e) {
                        return (
                          n.forEach(function (t) {
                            e = e.Ht(t.key, t);
                          }),
                          e
                        );
                      }));
                });
          }),
          (df.prototype.lc = function (n, t) {
            var r = new Ku(zs(n));
            return (
              t.forEach(function (t, e) {
                e instanceof Fo && qs(n, e) && (r = r.add(e));
              }),
              r
            );
          }),
          (df.prototype._c = function (t, e, n, r) {
            if (n.size !== e.size) return !0;
            e = 'F' === t ? e.last() : e.first();
            return !!e && (e.hasPendingWrites || 0 < e.version.u(r));
          }),
          (df.prototype.hc = function (t, e) {
            return (
              ii() <= C.DEBUG &&
                oi(
                  'QueryEngine',
                  'Using full collection scan to execute query:',
                  Fs(e)
                ),
              this.uc.jr(t, e, Xi.min())
            );
          }),
          df),
        lf =
          ((pf.prototype.Ar = function (e) {
            var n = this;
            return this.persistence.runTransaction(
              'Collect garbage',
              'readwrite-primary',
              function (t) {
                return e.br(t, n.dc);
              }
            );
          }),
          pf);
      function pf(t, e, n, r) {
        (this.persistence = t),
          (this.fc = e),
          (this.Kt = r),
          (this.dc = new ju(pi)),
          (this.wc = new gh(Wo, Xo)),
          (this.Ec = Xi.min()),
          (this.Ho = t.Wo(n)),
          (this.Tc = t.kr()),
          (this.wo = t.Cr()),
          (this.Ic = new cf(this.Tc, this.Ho, this.persistence.jo())),
          (this.To = t.Go()),
          this.fc.ac(this.Ic);
      }
      function df() {}
      function yf(t, e, n, r) {
        (this.targetId = t), (this.fromCache = e), (this.rc = n), (this.oc = r);
      }
      function vf(t, e, n) {
        (this.Eo = t), (this.Ho = e), (this.Ii = n);
      }
      function gf(t, e, n, r) {
        return new lf(t, e, n, r);
      }
      function mf(i, o) {
        return y(this, void 0, void 0, function () {
          var e, n, m, r;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  (n = (e = i).Ho),
                  (m = e.Ic),
                  [
                    4,
                    e.persistence.runTransaction(
                      'Handle user change',
                      'readonly',
                      function (v) {
                        var g;
                        return e.Ho.vi(v)
                          .next(function (t) {
                            return (
                              (g = t),
                              (n = e.persistence.Wo(o)),
                              (m = new cf(e.Tc, n, e.persistence.jo())),
                              n.vi(v)
                            );
                          })
                          .next(function (t) {
                            for (
                              var e = [], n = [], r = ta(), i = 0, o = g;
                              i < o.length;
                              i++
                            ) {
                              var s = o[i];
                              e.push(s.batchId);
                              for (
                                var u = 0, a = s.mutations;
                                u < a.length;
                                u++
                              )
                                var c = a[u], r = r.add(c.key);
                            }
                            for (var h = 0, f = t; h < f.length; h++) {
                              var l = f[h];
                              n.push(l.batchId);
                              for (
                                var p = 0, d = l.mutations;
                                p < d.length;
                                p++
                              ) {
                                var y = d[p];
                                r = r.add(y.key);
                              }
                            }
                            return m.Zo(v, r).next(function (t) {
                              return { mc: t, Ac: e, Rc: n };
                            });
                          });
                      }
                    )
                  ]
                );
              case 1:
                return (
                  (r = t.sent()),
                  [2, ((e.Ho = n), (e.Ic = m), e.fc.ac(e.Ic), r)]
                );
            }
          });
        });
      }
      function bf(t, h) {
        var f = t;
        return f.persistence.runTransaction(
          'Acknowledge batch',
          'readwrite-primary',
          function (t) {
            var e,
              r,
              i,
              o,
              s,
              n,
              u,
              a = h.batch.keys(),
              c = f.Tc.Or({ Gr: !0 });
            return (
              (e = f),
              (r = t),
              (o = c),
              (s = (i = h).batch),
              (n = s.keys()),
              (u = Xa.resolve()),
              n.forEach(function (n) {
                u = u
                  .next(function () {
                    return o.di(r, n);
                  })
                  .next(function (t) {
                    var e = t,
                      t = i.ks.get(n);
                    hi(null !== t),
                      (!e || e.version.u(t) < 0) &&
                        (e = s.Cs(n, e, i)) &&
                        o.hi(e, i.Os);
                  });
              }),
              u
                .next(function () {
                  return e.Ho.Ni(r, s);
                })
                .next(function () {
                  return c.apply(t);
                })
                .next(function () {
                  return f.Ho.ki(t);
                })
                .next(function () {
                  return f.Ic.Zo(t, a);
                })
            );
          }
        );
      }
      function wf(t) {
        var e = t;
        return e.persistence.runTransaction(
          'Get last remote snapshot version',
          'readonly',
          function (t) {
            return e.wo.Wi(t);
          }
        );
      }
      function If(t, o) {
        var f = t,
          l = o.Mt,
          p = f.dc;
        return f.persistence
          .runTransaction(
            'Apply remote event',
            'readwrite-primary',
            function (s) {
              var t = f.Tc.Or({ Gr: !0 });
              p = f.dc;
              var u = [];
              o.Oe.forEach(function (t, e) {
                var n,
                  r,
                  i,
                  o = p.get(e);
                o &&
                  (u.push(
                    f.wo.rr(s, t.Ke, e).next(function () {
                      return f.wo.sr(s, t.Ue, e);
                    })
                  ),
                  0 < (i = t.resumeToken).o() &&
                    ((n = o.$t(i, l).Lt(s.Ss)),
                    (p = p.Ht(e, n)),
                    (r = o),
                    (i = t),
                    hi(0 < (o = n).resumeToken.o()),
                    (0 === r.resumeToken.o() ||
                      3e8 <= o.Mt.j() - r.Mt.j() ||
                      0 < i.Ue.size + i.Qe.size + i.Ke.size) &&
                      u.push(f.wo.Yi(s, n))));
              });
              var e,
                a,
                n,
                c,
                h,
                r,
                i = Wu;
              return (
                o.Me.forEach(function (t, e) {
                  o.Le.has(t) && u.push(f.persistence.mi.Mr(s, t));
                }),
                u.push(
                  ((e = s),
                  (a = t),
                  (n = o.Me),
                  (c = l),
                  (h = void 0),
                  (r = ta()),
                  n.forEach(function (t) {
                    return (r = r.add(t));
                  }),
                  a
                    .getEntries(e, r)
                    .next(function (i) {
                      var o = Wu;
                      return (
                        n.forEach(function (t, e) {
                          var n = i.get(t),
                            r = (null == h ? void 0 : h.get(t)) || c;
                          e instanceof qo && e.version.isEqual(Xi.min())
                            ? (a.fi(t, r), (o = o.Ht(t, e)))
                            : null == n ||
                              0 < e.version.u(n.version) ||
                              (0 === e.version.u(n.version) &&
                                n.hasPendingWrites)
                            ? (a.hi(e, r), (o = o.Ht(t, e)))
                            : oi(
                                'LocalStore',
                                'Ignoring outdated watch update for ',
                                t,
                                '. Current version:',
                                n.version,
                                ' Watch version:',
                                e.version
                              );
                        }),
                        o
                      );
                    })
                    .next(function (t) {
                      i = t;
                    }))
                ),
                l.isEqual(Xi.min()) ||
                  ((e = f.wo.Wi(s).next(function (t) {
                    return f.wo.Gi(s, s.Ss, l);
                  })),
                  u.push(e)),
                Xa.$n(u)
                  .next(function () {
                    return t.apply(s);
                  })
                  .next(function () {
                    return f.Ic.tc(s, i);
                  })
              );
            }
          )
          .then(function (t) {
            return (f.dc = p), t;
          });
      }
      function Ef(t, r) {
        var i = t;
        return i.persistence
          .runTransaction('Allocate target', 'readwrite', function (e) {
            var n;
            return i.wo.nr(e, r).next(function (t) {
              return t
                ? ((n = t), Xa.resolve(n))
                : i.wo.Ui(e).next(function (t) {
                    return (
                      (n = new Hs(r, t, 0, e.Ss)),
                      i.wo.zi(e, n).next(function () {
                        return n;
                      })
                    );
                  });
            });
          })
          .then(function (t) {
            var e = i.dc.get(t.targetId);
            return (
              (null === e || 0 < t.Mt.u(e.Mt)) &&
                ((i.dc = i.dc.Ht(t.targetId, t)), i.wc.set(r, t.targetId)),
              t
            );
          });
      }
      function _f(i, o, s) {
        return y(this, void 0, void 0, function () {
          var e, n, r;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                (n = (e = i).dc.get(o)),
                  (r = s ? 'readwrite' : 'readwrite-primary'),
                  (t.label = 1);
              case 1:
                return (
                  t.trys.push([1, 4, , 5]),
                  s
                    ? [3, 3]
                    : [
                        4,
                        e.persistence.runTransaction(
                          'Release target',
                          r,
                          function (t) {
                            return e.persistence.mi.removeTarget(t, n);
                          }
                        )
                      ]
                );
              case 2:
                t.sent(), (t.label = 3);
              case 3:
                return [3, 5];
              case 4:
                if (!oc((r = t.sent()))) throw r;
                return (
                  oi(
                    'LocalStore',
                    'Failed to update sequence numbers for target ' +
                      o +
                      ': ' +
                      r
                  ),
                  [3, 5]
                );
              case 5:
                return (e.dc = e.dc.remove(o)), e.wc.delete(n.target), [2];
            }
          });
        });
      }
      function Tf(t, o, s) {
        var u = t,
          a = Xi.min(),
          c = ta();
        return u.persistence.runTransaction(
          'Execute query',
          'readonly',
          function (e) {
            return (
              (t = u),
              (n = e),
              (r = Vs(o)),
              (void 0 !== (t = (i = t).wc.get(r))
                ? Xa.resolve(i.dc.get(t))
                : i.wo.nr(n, r)
              )
                .next(function (t) {
                  if (t)
                    return (
                      (a = t.lastLimboFreeSnapshotVersion),
                      u.wo.ar(e, t.targetId).next(function (t) {
                        c = t;
                      })
                    );
                })
                .next(function () {
                  return u.fc.jr(e, o, s ? a : Xi.min(), s ? c : ta());
                })
                .next(function (t) {
                  return { documents: t, Pc: c };
                })
            );
            var t, n, r, i;
          }
        );
      }
      function Nf(t, e) {
        var n = t,
          r = n.wo,
          t = n.dc.get(e);
        return t
          ? Promise.resolve(t.target)
          : n.persistence.runTransaction(
              'Get target data',
              'readonly',
              function (t) {
                return r.Dn(t, e).next(function (t) {
                  return t ? t.target : null;
                });
              }
            );
      }
      function Af(t) {
        var s = t;
        return s.persistence
          .runTransaction('Get new document changes', 'readonly', function (t) {
            return (
              (e = s.Tc),
              (n = t),
              (t = s.Ec),
              (r = e),
              (i = Wu),
              (o = Wc(t)),
              (t = $h(n)),
              (n = IDBKeyRange.lowerBound(o, !0)),
              t
                .ls({ index: Sc.readTimeIndex, range: n }, function (t, e) {
                  var n = Kc(r.Kt, e);
                  (i = i.Ht(n.key, n)), (o = e.readTime);
                })
                .next(function () {
                  return { gs: i, readTime: Xc(o) };
                })
            );
            var e, n, r, i, o;
          })
          .then(function (t) {
            var e = t.gs,
              t = t.readTime;
            return (s.Ec = t), e;
          });
      }
      function Sf(n) {
        return y(this, void 0, void 0, function () {
          var e;
          return v(this, function (t) {
            return [
              2,
              (e = n).persistence
                .runTransaction(
                  'Synchronize last document change read time',
                  'readonly',
                  function (t) {
                    return (
                      (t = $h(t)),
                      (r = Xi.min()),
                      t
                        .ls(
                          { index: Sc.readTimeIndex, reverse: !0 },
                          function (t, e, n) {
                            e.readTime && (r = Xc(e.readTime)), n.done();
                          }
                        )
                        .next(function () {
                          return r;
                        })
                    );
                    var r;
                  }
                )
                .then(function (t) {
                  e.Ec = t;
                })
            ];
          });
        });
      }
      var xf,
        Df,
        Of =
          ((Xf.prototype.Ls = function (t, e) {
            return Xa.resolve(this.bc.get(e));
          }),
          (Xf.prototype.$s = function (t, e) {
            return (
              this.bc.set(e.id, {
                id: e.id,
                version: e.version,
                createTime: Aa(e.createTime)
              }),
              Xa.resolve()
            );
          }),
          (Xf.prototype.Bs = function (t, e) {
            return Xa.resolve(this.vc.get(e));
          }),
          (Xf.prototype.qs = function (t, e) {
            return (
              this.vc.set(e.name, {
                name: (e = e).name,
                query: eh(e.bundledQuery),
                readTime: Aa(e.readTime)
              }),
              Xa.resolve()
            );
          }),
          Xf),
        kf =
          ((Wf.prototype.nt = function () {
            return this.Sc.nt();
          }),
          (Wf.prototype.ir = function (t, e) {
            e = new Cf(t, e);
            (this.Sc = this.Sc.add(e)), (this.Cc = this.Cc.add(e));
          }),
          (Wf.prototype.Nc = function (t, e) {
            var n = this;
            t.forEach(function (t) {
              return n.ir(t, e);
            });
          }),
          (Wf.prototype.cr = function (t, e) {
            this.Fc(new Cf(t, e));
          }),
          (Wf.prototype.Oc = function (t, e) {
            var n = this;
            t.forEach(function (t) {
              return n.cr(t, e);
            });
          }),
          (Wf.prototype.kc = function (t) {
            var e = this,
              n = new Zi(new Yi([])),
              r = new Cf(n, t),
              t = new Cf(n, t + 1),
              i = [];
            return (
              this.Cc.Ae([r, t], function (t) {
                e.Fc(t), i.push(t.key);
              }),
              i
            );
          }),
          (Wf.prototype.Mc = function () {
            var e = this;
            this.Sc.forEach(function (t) {
              return e.Fc(t);
            });
          }),
          (Wf.prototype.Fc = function (t) {
            (this.Sc = this.Sc.delete(t)), (this.Cc = this.Cc.delete(t));
          }),
          (Wf.prototype.Lc = function (t) {
            var e = new Zi(new Yi([])),
              n = new Cf(e, t),
              t = new Cf(e, t + 1),
              r = ta();
            return (
              this.Cc.Ae([n, t], function (t) {
                r = r.add(t.key);
              }),
              r
            );
          }),
          (Wf.prototype.Mi = function (t) {
            var e = new Cf(t, 0),
              e = this.Sc.Pe(e);
            return null !== e && t.isEqual(e.key);
          }),
          Wf),
        Cf =
          ((Jf.Dc = function (t, e) {
            return Zi.J(t.key, e.key) || pi(t.$c, e.$c);
          }),
          (Jf.xc = function (t, e) {
            return pi(t.$c, e.$c) || Zi.J(t.key, e.key);
          }),
          Jf),
        Pf =
          ((Kf.prototype.Pi = function (t) {
            return Xa.resolve(0 === this.Ho.length);
          }),
          (Kf.prototype.yi = function (t, e, n, r) {
            var i = this.Bc;
            this.Bc++, 0 < this.Ho.length && this.Ho[this.Ho.length - 1];
            n = new qc(i, e, n, r);
            this.Ho.push(n);
            for (var o = 0, s = r; o < s.length; o++) {
              var u = s[o];
              (this.qc = this.qc.add(new Cf(u.key, i))),
                this.Ii.Qs(t, u.key.path.Z());
            }
            return Xa.resolve(n);
          }),
          (Kf.prototype.gi = function (t, e) {
            return Xa.resolve(this.Uc(e));
          }),
          (Kf.prototype.pi = function (t, e) {
            (e += 1), (e = this.Qc(e)), (e = e < 0 ? 0 : e);
            return Xa.resolve(this.Ho.length > e ? this.Ho[e] : null);
          }),
          (Kf.prototype.bi = function () {
            return Xa.resolve(0 === this.Ho.length ? -1 : this.Bc - 1);
          }),
          (Kf.prototype.vi = function (t) {
            return Xa.resolve(this.Ho.slice());
          }),
          (Kf.prototype.Si = function (t, e) {
            var n = this,
              r = new Cf(e, 0),
              e = new Cf(e, Number.POSITIVE_INFINITY),
              i = [];
            return (
              this.qc.Ae([r, e], function (t) {
                t = n.Uc(t.$c);
                i.push(t);
              }),
              Xa.resolve(i)
            );
          }),
          (Kf.prototype.Di = function (t, e) {
            var n = this,
              r = new Ku(pi);
            return (
              e.forEach(function (t) {
                var e = new Cf(t, 0),
                  t = new Cf(t, Number.POSITIVE_INFINITY);
                n.qc.Ae([e, t], function (t) {
                  r = r.add(t.$c);
                });
              }),
              Xa.resolve(this.Kc(r))
            );
          }),
          (Kf.prototype.xi = function (t, e) {
            var n = e.path,
              r = n.length + 1,
              e = n;
            Zi.Et(e) || (e = e.child(''));
            var e = new Cf(new Zi(e), 0),
              i = new Ku(pi);
            return (
              this.qc.Re(function (t) {
                var e = t.key.path;
                return !!n.st(e) && (e.length === r && (i = i.add(t.$c)), !0);
              }, e),
              Xa.resolve(this.Kc(i))
            );
          }),
          (Kf.prototype.Kc = function (t) {
            var e = this,
              n = [];
            return (
              t.forEach(function (t) {
                t = e.Uc(t);
                null !== t && n.push(t);
              }),
              n
            );
          }),
          (Kf.prototype.Ni = function (n, r) {
            var i = this;
            hi(0 === this.Wc(r.batchId, 'removed')), this.Ho.shift();
            var o = this.qc;
            return Xa.forEach(r.mutations, function (t) {
              var e = new Cf(t.key, r.batchId);
              return (o = o.delete(e)), i.mi.Oi(n, t.key);
            }).next(function () {
              i.qc = o;
            });
          }),
          (Kf.prototype.Fi = function (t) {}),
          (Kf.prototype.Mi = function (t, e) {
            var n = new Cf(e, 0),
              n = this.qc.Pe(n);
            return Xa.resolve(e.isEqual(n && n.key));
          }),
          (Kf.prototype.ki = function (t) {
            return this.Ho.length, Xa.resolve();
          }),
          (Kf.prototype.Wc = function (t, e) {
            return this.Qc(t);
          }),
          (Kf.prototype.Qc = function (t) {
            return 0 === this.Ho.length ? 0 : t - this.Ho[0].batchId;
          }),
          (Kf.prototype.Uc = function (t) {
            t = this.Qc(t);
            return t < 0 || t >= this.Ho.length ? null : this.Ho[t];
          }),
          Kf),
        Lf =
          ((Gf.prototype.hi = function (t, e, n) {
            var r = e.key,
              i = this.docs.get(r),
              o = i ? i.size : 0,
              i = this.jc(e);
            return (
              (this.docs = this.docs.Ht(r, { _i: e, size: i, readTime: n })),
              (this.size += i - o),
              this.Ii.Qs(t, r.path.Z())
            );
          }),
          (Gf.prototype.fi = function (t) {
            var e = this.docs.get(t);
            e && ((this.docs = this.docs.remove(t)), (this.size -= e.size));
          }),
          (Gf.prototype.di = function (t, e) {
            e = this.docs.get(e);
            return Xa.resolve(e ? e._i : null);
          }),
          (Gf.prototype.getEntries = function (t, e) {
            var n = this,
              r = Wu;
            return (
              e.forEach(function (t) {
                var e = n.docs.get(t);
                r = r.Ht(t, e ? e._i : null);
              }),
              Xa.resolve(r)
            );
          }),
          (Gf.prototype.jr = function (t, e, n) {
            for (
              var r = $u, i = new Zi(e.path.child('')), o = this.docs.ne(i);
              o.ae();

            ) {
              var s = o.ce(),
                u = s.key,
                a = s.value,
                s = a._i,
                a = a.readTime;
              if (!e.path.st(u.path)) break;
              a.u(n) <= 0 ||
                (s instanceof Fo && qs(e, s) && (r = r.Ht(s.key, s)));
            }
            return Xa.resolve(r);
          }),
          (Gf.prototype.Gc = function (t, e) {
            return Xa.forEach(this.docs, function (t) {
              return e(t);
            });
          }),
          (Gf.prototype.Or = function (t) {
            return new Rf(this);
          }),
          (Gf.prototype.Lr = function (t) {
            return Xa.resolve(this.size);
          }),
          Gf),
        Rf =
          (t(Bf, (Df = $)),
          (Bf.prototype.Ti = function (n) {
            var r = this,
              i = [];
            return (
              this.ci.forEach(function (t, e) {
                e && e._i ? i.push(r.zr.hi(n, e._i, r.ui(t))) : r.zr.fi(t);
              }),
              Xa.$n(i)
            );
          }),
          (Bf.prototype.wi = function (t, e) {
            return this.zr.di(t, e);
          }),
          (Bf.prototype.Ei = function (t, e) {
            return this.zr.getEntries(t, e);
          }),
          Bf),
        Vf =
          ((Hf.prototype.mn = function (t, n) {
            return (
              this.zc.forEach(function (t, e) {
                return n(e);
              }),
              Xa.resolve()
            );
          }),
          (Hf.prototype.Wi = function (t) {
            return Xa.resolve(this.lastRemoteSnapshotVersion);
          }),
          (Hf.prototype.ji = function (t) {
            return Xa.resolve(this.Hc);
          }),
          (Hf.prototype.Ui = function (t) {
            return (
              (this.highestTargetId = this.Yc.next()),
              Xa.resolve(this.highestTargetId)
            );
          }),
          (Hf.prototype.Gi = function (t, e, n) {
            return (
              n && (this.lastRemoteSnapshotVersion = n),
              e > this.Hc && (this.Hc = e),
              Xa.resolve()
            );
          }),
          (Hf.prototype.Hi = function (t) {
            this.zc.set(t.target, t);
            var e = t.targetId;
            e > this.highestTargetId &&
              ((this.Yc = new xh(e)), (this.highestTargetId = e)),
              t.sequenceNumber > this.Hc && (this.Hc = t.sequenceNumber);
          }),
          (Hf.prototype.zi = function (t, e) {
            return this.Hi(e), (this.targetCount += 1), Xa.resolve();
          }),
          (Hf.prototype.Yi = function (t, e) {
            return this.Hi(e), Xa.resolve();
          }),
          (Hf.prototype.Xi = function (t, e) {
            return (
              this.zc.delete(e.target),
              this.Jc.kc(e.targetId),
              --this.targetCount,
              Xa.resolve()
            );
          }),
          (Hf.prototype.tr = function (n, r, i) {
            var o = this,
              s = 0,
              u = [];
            return (
              this.zc.forEach(function (t, e) {
                e.sequenceNumber <= r &&
                  null === i.get(e.targetId) &&
                  (o.zc.delete(t), u.push(o.Zi(n, e.targetId)), s++);
              }),
              Xa.$n(u).next(function () {
                return s;
              })
            );
          }),
          (Hf.prototype.er = function (t) {
            return Xa.resolve(this.targetCount);
          }),
          (Hf.prototype.nr = function (t, e) {
            e = this.zc.get(e) || null;
            return Xa.resolve(e);
          }),
          (Hf.prototype.sr = function (t, e, n) {
            return this.Jc.Nc(e, n), Xa.resolve();
          }),
          (Hf.prototype.rr = function (e, t, n) {
            this.Jc.Oc(t, n);
            var r = this.persistence.mi,
              i = [];
            return (
              r &&
                t.forEach(function (t) {
                  i.push(r.Oi(e, t));
                }),
              Xa.$n(i)
            );
          }),
          (Hf.prototype.Zi = function (t, e) {
            return this.Jc.kc(e), Xa.resolve();
          }),
          (Hf.prototype.ar = function (t, e) {
            e = this.Jc.Lc(e);
            return Xa.resolve(e);
          }),
          (Hf.prototype.Mi = function (t, e) {
            return Xa.resolve(this.Jc.Mi(e));
          }),
          Hf),
        Mf =
          ((zf.prototype.start = function () {
            return Promise.resolve();
          }),
          (zf.prototype.$o = function () {
            return (this.oo = !1), Promise.resolve();
          }),
          Object.defineProperty(zf.prototype, 'Ir', {
            get: function () {
              return this.oo;
            },
            enumerable: !1,
            configurable: !0
          }),
          (zf.prototype.Vo = function () {}),
          (zf.prototype.po = function () {}),
          (zf.prototype.jo = function () {
            return this.Ii;
          }),
          (zf.prototype.Wo = function (t) {
            var e = this.Xc[t.R()];
            return (
              e || ((e = new Pf(this.Ii, this.mi)), (this.Xc[t.R()] = e)), e
            );
          }),
          (zf.prototype.Cr = function () {
            return this.wo;
          }),
          (zf.prototype.kr = function () {
            return this.Eo;
          }),
          (zf.prototype.Go = function () {
            return this.To;
          }),
          (zf.prototype.runTransaction = function (t, e, n) {
            var r = this;
            oi('MemoryPersistence', 'Starting transaction:', t);
            var i = new Uf(this.ro.next());
            return (
              this.mi.ta(),
              n(i)
                .next(function (t) {
                  return r.mi.ea(i).next(function () {
                    return t;
                  });
                })
                .Mn()
                .then(function (t) {
                  return i.bs(), t;
                })
            );
          }),
          (zf.prototype.na = function (e, n) {
            return Xa.Bn(
              Object.values(this.Xc).map(function (t) {
                return function () {
                  return t.Mi(e, n);
                };
              })
            );
          }),
          zf),
        Uf = (t(qf, (xf = U)), qf),
        jf =
          ((Ff.ra = function (t) {
            return new Ff(t);
          }),
          Object.defineProperty(Ff.prototype, 'oa', {
            get: function () {
              if (this.ia) return this.ia;
              throw ci();
            },
            enumerable: !1,
            configurable: !0
          }),
          (Ff.prototype.ir = function (t, e, n) {
            return this.sa.ir(n, e), this.oa.delete(n.toString()), Xa.resolve();
          }),
          (Ff.prototype.cr = function (t, e, n) {
            return this.sa.cr(n, e), this.oa.add(n.toString()), Xa.resolve();
          }),
          (Ff.prototype.Oi = function (t, e) {
            return this.oa.add(e.toString()), Xa.resolve();
          }),
          (Ff.prototype.removeTarget = function (t, e) {
            var n = this;
            this.sa.kc(e.targetId).forEach(function (t) {
              return n.oa.add(t.toString());
            });
            var r = this.persistence.Cr();
            return r
              .ar(t, e.targetId)
              .next(function (t) {
                t.forEach(function (t) {
                  return n.oa.add(t.toString());
                });
              })
              .next(function () {
                return r.Xi(t, e);
              });
          }),
          (Ff.prototype.ta = function () {
            this.ia = new Set();
          }),
          (Ff.prototype.ea = function (n) {
            var r = this,
              i = this.persistence.kr().Or();
            return Xa.forEach(this.oa, function (t) {
              var e = Zi.ft(t);
              return r.ca(n, e).next(function (t) {
                t || i.fi(e);
              });
            }).next(function () {
              return (r.ia = null), i.apply(n);
            });
          }),
          (Ff.prototype.Mr = function (t, e) {
            var n = this;
            return this.ca(t, e).next(function (t) {
              t ? n.oa.delete(e.toString()) : n.oa.add(e.toString());
            });
          }),
          (Ff.prototype.Zc = function (t) {
            return 0;
          }),
          (Ff.prototype.ca = function (t, e) {
            var n = this;
            return Xa.Bn([
              function () {
                return Xa.resolve(n.sa.Mi(e));
              },
              function () {
                return n.persistence.Cr().Mi(t, e);
              },
              function () {
                return n.persistence.na(t, e);
              }
            ]);
          }),
          Ff);
      function Ff(t) {
        (this.persistence = t), (this.sa = new kf()), (this.ia = null);
      }
      function qf(t) {
        var e = this;
        return ((e = xf.call(this) || this).Ss = t), e;
      }
      function zf(t, e) {
        var n = this;
        (this.Xc = {}),
          (this.ro = new Fi(0)),
          (this.oo = !1),
          (this.oo = !0),
          (this.mi = t(this)),
          (this.wo = new Vf(this)),
          (this.Ii = new sh()),
          (this.Eo =
            ((t = this.Ii),
            new Lf(t, function (t) {
              return n.mi.Zc(t);
            }))),
          (this.Kt = new Hc(e)),
          (this.To = new Of(this.Kt));
      }
      function Hf(t) {
        (this.persistence = t),
          (this.zc = new gh(Wo, Xo)),
          (this.lastRemoteSnapshotVersion = Xi.min()),
          (this.highestTargetId = 0),
          (this.Hc = 0),
          (this.Jc = new kf()),
          (this.targetCount = 0),
          (this.Yc = xh.Bi());
      }
      function Bf(t) {
        var e = this;
        return ((e = Df.call(this) || this).zr = t), e;
      }
      function Gf(t, e) {
        (this.Ii = t),
          (this.jc = e),
          (this.docs = new ju(Zi.J)),
          (this.size = 0);
      }
      function Kf(t, e) {
        (this.Ii = t),
          (this.mi = e),
          (this.Ho = []),
          (this.Bc = 1),
          (this.qc = new Ku(Cf.Dc));
      }
      function Jf(t, e) {
        (this.key = t), (this.$c = e);
      }
      function Wf() {
        (this.Sc = new Ku(Cf.Dc)), (this.Cc = new Ku(Cf.xc));
      }
      function Xf(t) {
        (this.Kt = t), (this.bc = new Map()), (this.vc = new Map());
      }
      function Yf(t, e) {
        return 'firestore_clients_' + t + '_' + e;
      }
      function $f(t, e, n) {
        n = 'firestore_mutations_' + t + '_' + n;
        return e.A() && (n += '_' + e.uid), n;
      }
      function Qf(t, e) {
        return 'firestore_targets_' + t + '_' + e;
      }
      var Zf,
        tl =
          ((_l.aa = function (t, e, n) {
            var r = JSON.parse(n),
              i =
                'object' == typeof r &&
                -1 !==
                  ['pending', 'acknowledged', 'rejected'].indexOf(r.state) &&
                (void 0 === r.error || 'object' == typeof r.error),
              o = void 0;
            return (
              i &&
                r.error &&
                (i =
                  'string' == typeof r.error.message &&
                  'string' == typeof r.error.code) &&
                (o = new wi(r.error.code, r.error.message)),
              i
                ? new _l(t, e, r.state, o)
                : (si(
                    'SharedClientState',
                    "Failed to parse mutation state for ID '" + e + "': " + n
                  ),
                  null)
            );
          }),
          (_l.prototype.ua = function () {
            var t = { state: this.state, updateTimeMs: Date.now() };
            return (
              this.error &&
                (t.error = {
                  code: this.error.code,
                  message: this.error.message
                }),
              JSON.stringify(t)
            );
          }),
          _l),
        el =
          ((El.aa = function (t, e) {
            var n = JSON.parse(e),
              r =
                'object' == typeof n &&
                -1 !==
                  ['not-current', 'current', 'rejected'].indexOf(n.state) &&
                (void 0 === n.error || 'object' == typeof n.error),
              i = void 0;
            return (
              r &&
                n.error &&
                (r =
                  'string' == typeof n.error.message &&
                  'string' == typeof n.error.code) &&
                (i = new wi(n.error.code, n.error.message)),
              r
                ? new El(t, n.state, i)
                : (si(
                    'SharedClientState',
                    "Failed to parse target state for ID '" + t + "': " + e
                  ),
                  null)
            );
          }),
          (El.prototype.ua = function () {
            var t = { state: this.state, updateTimeMs: Date.now() };
            return (
              this.error &&
                (t.error = {
                  code: this.error.code,
                  message: this.error.message
                }),
              JSON.stringify(t)
            );
          }),
          El),
        nl =
          ((Il.aa = function (t, e) {
            for (
              var n = JSON.parse(e),
                r = 'object' == typeof n && n.activeTargetIds instanceof Array,
                i = ea,
                o = 0;
              r && o < n.activeTargetIds.length;
              ++o
            )
              (r = wo(n.activeTargetIds[o])), (i = i.add(n.activeTargetIds[o]));
            return r
              ? new Il(t, i)
              : (si(
                  'SharedClientState',
                  "Failed to parse client data for instance '" + t + "': " + e
                ),
                null);
          }),
          Il),
        rl =
          ((wl.aa = function (t) {
            var e = JSON.parse(t);
            return 'object' == typeof e &&
              -1 !== ['Unknown', 'Online', 'Offline'].indexOf(e.onlineState) &&
              'string' == typeof e.clientId
              ? new wl(e.clientId, e.onlineState)
              : (si('SharedClientState', 'Failed to parse online state: ' + t),
                null);
          }),
          wl),
        il =
          ((bl.prototype.ha = function (t) {
            this.activeTargetIds = this.activeTargetIds.add(t);
          }),
          (bl.prototype.la = function (t) {
            this.activeTargetIds = this.activeTargetIds.delete(t);
          }),
          (bl.prototype.ua = function () {
            var t = {
              activeTargetIds: this.activeTargetIds.rt(),
              updateTimeMs: Date.now()
            };
            return JSON.stringify(t);
          }),
          bl),
        ol =
          ((ml.Wn = function (t) {
            return !(!t || !t.localStorage);
          }),
          (ml.prototype.start = function () {
            return y(this, void 0, void 0, function () {
              var e,
                n,
                r,
                i,
                o,
                s,
                u,
                a,
                c,
                h,
                f = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return [4, this.fa.Ko()];
                  case 1:
                    for (s = t.sent(), e = 0, n = s; e < n.length; e++)
                      (r = n[e]) !== this._a &&
                        (i = this.getItem(Yf(this.persistenceKey, r))) &&
                        (o = nl.aa(r, i)) &&
                        (this.Ta = this.Ta.Ht(o.clientId, o));
                    for (
                      this.pa(),
                        (s = this.storage.getItem(this.ga)) &&
                          (u = this.ba(s)) &&
                          this.va(u),
                        a = 0,
                        c = this.Ia;
                      a < c.length;
                      a++
                    )
                      (h = c[a]), this.Ea(h);
                    return (
                      (this.Ia = []),
                      this.window.addEventListener('unload', function () {
                        return f.$o();
                      }),
                      (this.Ir = !0),
                      [2]
                    );
                }
              });
            });
          }),
          (ml.prototype.q = function (t) {
            this.setItem(this.Aa, JSON.stringify(t));
          }),
          (ml.prototype.Sa = function () {
            return this.Da(this.Ta);
          }),
          (ml.prototype.Ca = function (n) {
            var r = !1;
            return (
              this.Ta.forEach(function (t, e) {
                e.activeTargetIds.has(n) && (r = !0);
              }),
              r
            );
          }),
          (ml.prototype.xa = function (t) {
            this.Na(t, 'pending');
          }),
          (ml.prototype.Fa = function (t, e, n) {
            this.Na(t, e, n), this.Oa(t);
          }),
          (ml.prototype.ka = function (t) {
            var e,
              n = 'not-current';
            return (
              this.Ca(t) &&
                (!(e = this.storage.getItem(Qf(this.persistenceKey, t))) ||
                  ((e = el.aa(t, e)) && (n = e.state))),
              this.Ma.ha(t),
              this.pa(),
              n
            );
          }),
          (ml.prototype.La = function (t) {
            this.Ma.la(t), this.pa();
          }),
          (ml.prototype.$a = function (t) {
            return this.Ma.activeTargetIds.has(t);
          }),
          (ml.prototype.Ba = function (t) {
            this.removeItem(Qf(this.persistenceKey, t));
          }),
          (ml.prototype.qa = function (t, e, n) {
            this.Ua(t, e, n);
          }),
          (ml.prototype.Qa = function (t, e, n) {
            var r = this;
            e.forEach(function (t) {
              r.Oa(t);
            }),
              (this.currentUser = t),
              n.forEach(function (t) {
                r.xa(t);
              });
          }),
          (ml.prototype.Ka = function (t) {
            this.Wa(t);
          }),
          (ml.prototype.ja = function () {
            this.Ga();
          }),
          (ml.prototype.$o = function () {
            this.Ir &&
              (this.window.removeEventListener('storage', this.wa),
              this.removeItem(this.ma),
              (this.Ir = !1));
          }),
          (ml.prototype.getItem = function (t) {
            var e = this.storage.getItem(t);
            return oi('SharedClientState', 'READ', t, e), e;
          }),
          (ml.prototype.setItem = function (t, e) {
            oi('SharedClientState', 'SET', t, e), this.storage.setItem(t, e);
          }),
          (ml.prototype.removeItem = function (t) {
            oi('SharedClientState', 'REMOVE', t), this.storage.removeItem(t);
          }),
          (ml.prototype.Ea = function (t) {
            var e = this,
              o = t;
            if (o.storageArea === this.storage) {
              if (
                (oi('SharedClientState', 'EVENT', o.key, o.newValue),
                o.key === this.ma)
              )
                return void si(
                  'Received WebStorage notification for local change. Another client might have garbage-collected our state'
                );
              this.no.vo(function () {
                return y(e, void 0, void 0, function () {
                  var e, n, r, i;
                  return v(this, function (t) {
                    if (this.Ir) {
                      if (null !== o.key)
                        if (this.Ra.test(o.key)) {
                          if (null == o.newValue)
                            return (e = this.za(o.key)), [2, this.Ha(e, null)];
                          if ((e = this.Ja(o.key, o.newValue)))
                            return [2, this.Ha(e.clientId, e)];
                        } else if (this.Pa.test(o.key)) {
                          if (
                            null !== o.newValue &&
                            (n = this.Ya(o.key, o.newValue))
                          )
                            return [2, this.Xa(n)];
                        } else if (this.ya.test(o.key)) {
                          if (
                            null !== o.newValue &&
                            (r = this.Za(o.key, o.newValue))
                          )
                            return [2, this.tu(r)];
                        } else if (o.key === this.ga) {
                          if (null !== o.newValue && (i = this.ba(o.newValue)))
                            return [2, this.va(i)];
                        } else if (o.key === this.Aa)
                          (i = (function (t) {
                            var e = Fi.U;
                            if (null != t)
                              try {
                                var n = JSON.parse(t);
                                hi('number' == typeof n), (e = n);
                              } catch (t) {
                                si(
                                  'SharedClientState',
                                  'Failed to read sequence number from WebStorage',
                                  t
                                );
                              }
                            return e;
                          })(o.newValue)) !== Fi.U && this.L(i);
                        else if (o.key === this.Va) return [2, this.fa.eu()];
                    } else this.Ia.push(o);
                    return [2];
                  });
                });
              });
            }
          }),
          Object.defineProperty(ml.prototype, 'Ma', {
            get: function () {
              return this.Ta.get(this._a);
            },
            enumerable: !1,
            configurable: !0
          }),
          (ml.prototype.pa = function () {
            this.setItem(this.ma, this.Ma.ua());
          }),
          (ml.prototype.Na = function (t, e, n) {
            (n = new tl(this.currentUser, t, e, n)),
              (t = $f(this.persistenceKey, this.currentUser, t));
            this.setItem(t, n.ua());
          }),
          (ml.prototype.Oa = function (t) {
            t = $f(this.persistenceKey, this.currentUser, t);
            this.removeItem(t);
          }),
          (ml.prototype.Wa = function (t) {
            t = { clientId: this._a, onlineState: t };
            this.storage.setItem(this.ga, JSON.stringify(t));
          }),
          (ml.prototype.Ua = function (t, e, n) {
            var r = Qf(this.persistenceKey, t),
              n = new el(t, e, n);
            this.setItem(r, n.ua());
          }),
          (ml.prototype.Ga = function () {
            this.setItem(this.Va, 'value-not-used');
          }),
          (ml.prototype.za = function (t) {
            t = this.Ra.exec(t);
            return t ? t[1] : null;
          }),
          (ml.prototype.Ja = function (t, e) {
            t = this.za(t);
            return nl.aa(t, e);
          }),
          (ml.prototype.Ya = function (t, e) {
            var n = this.Pa.exec(t),
              t = Number(n[1]),
              n = void 0 !== n[2] ? n[2] : null;
            return tl.aa(new ki(n), t, e);
          }),
          (ml.prototype.Za = function (t, e) {
            (t = this.ya.exec(t)), (t = Number(t[1]));
            return el.aa(t, e);
          }),
          (ml.prototype.ba = function (t) {
            return rl.aa(t);
          }),
          (ml.prototype.Xa = function (e) {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                return e.user.uid === this.currentUser.uid
                  ? [2, this.fa.nu(e.batchId, e.state, e.error)]
                  : (oi(
                      'SharedClientState',
                      'Ignoring mutation for non-active user ' + e.user.uid
                    ),
                    [2]);
              });
            });
          }),
          (ml.prototype.tu = function (t) {
            return this.fa.su(t.targetId, t.state, t.error);
          }),
          (ml.prototype.Ha = function (t, e) {
            var n = this,
              r = e ? this.Ta.Ht(t, e) : this.Ta.remove(t),
              i = this.Da(this.Ta),
              o = this.Da(r),
              s = [],
              u = [];
            return (
              o.forEach(function (t) {
                i.has(t) || s.push(t);
              }),
              i.forEach(function (t) {
                o.has(t) || u.push(t);
              }),
              this.fa.iu(s, u).then(function () {
                n.Ta = r;
              })
            );
          }),
          (ml.prototype.va = function (t) {
            this.Ta.get(t.clientId) && this.da(t.onlineState);
          }),
          (ml.prototype.Da = function (t) {
            var n = ea;
            return (
              t.forEach(function (t, e) {
                n = n.ye(e.activeTargetIds);
              }),
              n
            );
          }),
          ml),
        sl =
          ((gl.prototype.xa = function (t) {}),
          (gl.prototype.Fa = function (t, e, n) {}),
          (gl.prototype.ka = function (t) {
            return this.ru.ha(t), this.ou[t] || 'not-current';
          }),
          (gl.prototype.qa = function (t, e, n) {
            this.ou[t] = e;
          }),
          (gl.prototype.La = function (t) {
            this.ru.la(t);
          }),
          (gl.prototype.$a = function (t) {
            return this.ru.activeTargetIds.has(t);
          }),
          (gl.prototype.Ba = function (t) {
            delete this.ou[t];
          }),
          (gl.prototype.Sa = function () {
            return this.ru.activeTargetIds;
          }),
          (gl.prototype.Ca = function (t) {
            return this.ru.activeTargetIds.has(t);
          }),
          (gl.prototype.start = function () {
            return (this.ru = new il()), Promise.resolve();
          }),
          (gl.prototype.Qa = function (t, e, n) {}),
          (gl.prototype.Ka = function (t) {}),
          (gl.prototype.$o = function () {}),
          (gl.prototype.q = function (t) {}),
          (gl.prototype.ja = function () {}),
          gl),
        ul =
          ((vl.prototype.cu = function (t) {}),
          (vl.prototype.$o = function () {}),
          vl),
        al =
          ((yl.prototype.cu = function (t) {
            this._u.push(t);
          }),
          (yl.prototype.$o = function () {
            window.removeEventListener('online', this.au),
              window.removeEventListener('offline', this.hu);
          }),
          (yl.prototype.fu = function () {
            window.addEventListener('online', this.au),
              window.addEventListener('offline', this.hu);
          }),
          (yl.prototype.uu = function () {
            oi(
              'ConnectivityMonitor',
              'Network connectivity changed: AVAILABLE'
            );
            for (var t = 0, e = this._u; t < e.length; t++) (0, e[t])(0);
          }),
          (yl.prototype.lu = function () {
            oi(
              'ConnectivityMonitor',
              'Network connectivity changed: UNAVAILABLE'
            );
            for (var t = 0, e = this._u; t < e.length; t++) (0, e[t])(1);
          }),
          (yl.Wn = function () {
            return (
              'undefined' != typeof window &&
              void 0 !== window.addEventListener &&
              void 0 !== window.removeEventListener
            );
          }),
          yl),
        cl = {
          BatchGetDocuments: 'batchGet',
          Commit: 'commit',
          RunQuery: 'runQuery'
        },
        hl =
          ((dl.prototype.Eu = function (t) {
            this.Tu = t;
          }),
          (dl.prototype.Iu = function (t) {
            this.mu = t;
          }),
          (dl.prototype.onMessage = function (t) {
            this.Au = t;
          }),
          (dl.prototype.close = function () {
            this.wu();
          }),
          (dl.prototype.send = function (t) {
            this.du(t);
          }),
          (dl.prototype.Ru = function () {
            this.Tu();
          }),
          (dl.prototype.Pu = function (t) {
            this.mu(t);
          }),
          (dl.prototype.yu = function (t) {
            this.Au(t);
          }),
          dl),
        fl =
          ((pl.prototype.bu = function (e, t, n, r) {
            var i = this.vu(e, t);
            oi('RestConnection', 'Sending: ', i, n);
            t = {};
            return (
              this.Su(t, r),
              this.Du(e, i, t, n).then(
                function (t) {
                  return oi('RestConnection', 'Received: ', t), t;
                },
                function (t) {
                  throw (
                    (ui(
                      'RestConnection',
                      e + ' failed with error: ',
                      t,
                      'url: ',
                      i,
                      'request:',
                      n
                    ),
                    t)
                  );
                }
              )
            );
          }),
          (pl.prototype.Cu = function (t, e, n, r) {
            return this.bu(t, e, n, r);
          }),
          (pl.prototype.Su = function (t, e) {
            if (
              ((t['X-Goog-Api-Client'] = 'gl-js/ fire/8.2.1'),
              (t['Content-Type'] = 'text/plain'),
              e)
            )
              for (var n in e.V) e.V.hasOwnProperty(n) && (t[n] = e.V[n]);
          }),
          (pl.prototype.vu = function (t, e) {
            t = cl[t];
            return this.Vu + '/v1/' + e + ':' + t;
          }),
          t(ll, (Zf = pl)),
          (ll.prototype.Du = function (o, e, s, u) {
            return new Promise(function (n, r) {
              var i = new ni();
              i.listenOnce($r.COMPLETE, function () {
                try {
                  switch (i.getLastErrorCode()) {
                    case Yr.NO_ERROR:
                      var t = i.getResponseJson();
                      oi('Connection', 'XHR received:', JSON.stringify(t)),
                        n(t);
                      break;
                    case Yr.TIMEOUT:
                      oi('Connection', 'RPC "' + o + '" timed out'),
                        r(new wi(bi.DEADLINE_EXCEEDED, 'Request time out'));
                      break;
                    case Yr.HTTP_ERROR:
                      var e = i.getStatus();
                      oi(
                        'Connection',
                        'RPC "' + o + '" failed with status:',
                        e,
                        'response text:',
                        i.getResponseText()
                      ),
                        0 < e
                          ? (t = i.getResponseJson().error) &&
                            t.status &&
                            t.message
                            ? ((e = t.status.toLowerCase().replace(/_/g, '-')),
                              (e =
                                0 <= Object.values(bi).indexOf(e)
                                  ? e
                                  : bi.UNKNOWN),
                              r(new wi(e, t.message)))
                            : r(
                                new wi(
                                  bi.UNKNOWN,
                                  'Server responded with status ' +
                                    i.getStatus()
                                )
                              )
                          : r(new wi(bi.UNAVAILABLE, 'Connection failed.'));
                      break;
                    default:
                      ci();
                  }
                } finally {
                  oi('Connection', 'RPC "' + o + '" completed.');
                }
              });
              var t = JSON.stringify(u);
              i.send(e, 'POST', t, s, 15);
            });
          }),
          (ll.prototype.xu = function (t, e) {
            var n,
              r = [
                this.Vu,
                '/',
                'google.firestore.v1.Firestore',
                '/',
                t,
                '/channel'
              ],
              i = new Br(),
              o = Xr(),
              t = {
                httpSessionIdParam: 'gsessionid',
                initMessageHeaders: {},
                messageUrlParams: {
                  database:
                    'projects/' +
                    this.T.projectId +
                    '/databases/' +
                    this.T.database
                },
                sendRawJson: !0,
                supportsCrossDomainXhr: !0,
                internalChannelParams: { forwardChannelRequestTimeoutMs: 6e5 },
                forceLongPolling: this.forceLongPolling,
                detectBufferingProxy: this.I
              };
            this.Su(t.initMessageHeaders, e),
              ('undefined' != typeof window &&
                (window.cordova || window.phonegap || window.PhoneGap) &&
                /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(
                  f()
                )) ||
                ('object' == typeof navigator &&
                  'ReactNative' === navigator.product) ||
                0 <= f().indexOf('Electron/') ||
                0 <= (n = f()).indexOf('MSIE ') ||
                0 <= n.indexOf('Trident/') ||
                0 <= f().indexOf('MSAppHost/') ||
                ('object' ==
                  typeof (n =
                    'object' == typeof chrome
                      ? chrome.runtime
                      : 'object' == typeof browser
                      ? browser.runtime
                      : void 0) &&
                  void 0 !== n.id) ||
                (t.httpHeadersOverwriteParam = '$httpHeaders');
            r = r.join('');
            oi('Connection', 'Creating WebChannel: ' + r, t);
            var s = i.createWebChannel(r, t),
              u = !1,
              a = !1,
              c = new hl({
                du: function (t) {
                  a
                    ? oi(
                        'Connection',
                        'Not sending because WebChannel is closed:',
                        t
                      )
                    : (u ||
                        (oi('Connection', 'Opening WebChannel transport.'),
                        s.open(),
                        (u = !0)),
                      oi('Connection', 'WebChannel sending:', t),
                      s.send(t));
                },
                wu: function () {
                  return s.close();
                }
              }),
              t = function (t, e, n) {
                t.listen(e, function (t) {
                  try {
                    n(t);
                  } catch (t) {
                    setTimeout(function () {
                      throw t;
                    }, 0);
                  }
                });
              };
            return (
              t(s, ei.EventType.OPEN, function () {
                a || oi('Connection', 'WebChannel transport opened.');
              }),
              t(s, ei.EventType.CLOSE, function () {
                a ||
                  ((a = !0),
                  oi('Connection', 'WebChannel transport closed'),
                  c.Pu());
              }),
              t(s, ei.EventType.ERROR, function (t) {
                a ||
                  ((a = !0),
                  ui('Connection', 'WebChannel transport errored:', t),
                  c.Pu(
                    new wi(
                      bi.UNAVAILABLE,
                      'The operation could not be completed'
                    )
                  ));
              }),
              t(s, ei.EventType.MESSAGE, function (t) {
                var e, n, r, i;
                a ||
                  (hi(!!(e = t.data[0])),
                  (n =
                    e.error ||
                    (null === (i = e[0]) || void 0 === i ? void 0 : i.error))
                    ? (oi('Connection', 'WebChannel received error:', n),
                      (r = n.status),
                      (t = (function () {
                        var t = Ou[r];
                        if (void 0 !== t) return Uu(t);
                      })()),
                      (i = n.message),
                      void 0 === t &&
                        ((t = bi.INTERNAL),
                        (i =
                          'Unknown error status: ' +
                          r +
                          ' with message ' +
                          n.message)),
                      (a = !0),
                      c.Pu(new wi(t, i)),
                      s.close())
                    : (oi('Connection', 'WebChannel received:', e), c.yu(e)));
              }),
              t(o, Qr.STAT_EVENT, function (t) {
                t.stat === Zr
                  ? oi('Connection', 'Detected buffering proxy')
                  : t.stat === ti &&
                    oi('Connection', 'Detected no buffering proxy');
              }),
              setTimeout(function () {
                c.Ru();
              }, 0),
              c
            );
          }),
          ll);
      function ll(t) {
        var e = this;
        return (
          ((e = Zf.call(this, t) || this).forceLongPolling =
            t.forceLongPolling),
          (e.I = t.I),
          e
        );
      }
      function pl(t) {
        (this.gu = t), (this.T = t.T);
        var e = t.ssl ? 'https' : 'http';
        (this.Vu = e + '://' + t.host),
          (this.pu =
            'projects/' +
            this.T.projectId +
            '/databases/' +
            this.T.database +
            '/documents');
      }
      function dl(t) {
        (this.du = t.du), (this.wu = t.wu);
      }
      function yl() {
        var t = this;
        (this.au = function () {
          return t.uu();
        }),
          (this.hu = function () {
            return t.lu();
          }),
          (this._u = []),
          this.fu();
      }
      function vl() {}
      function gl() {
        (this.ru = new il()), (this.ou = {}), (this.da = null), (this.L = null);
      }
      function ml(t, e, n, r, i) {
        (this.window = t),
          (this.no = e),
          (this.persistenceKey = n),
          (this._a = r),
          (this.fa = null),
          (this.da = null),
          (this.L = null),
          (this.wa = this.Ea.bind(this)),
          (this.Ta = new ju(pi)),
          (this.Ir = !1),
          (this.Ia = []);
        n = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        (this.storage = this.window.localStorage),
          (this.currentUser = i),
          (this.ma = Yf(this.persistenceKey, this._a)),
          (this.Aa = 'firestore_sequence_number_' + this.persistenceKey),
          (this.Ta = this.Ta.Ht(this._a, new il())),
          (this.Ra = new RegExp('^firestore_clients_' + n + '_([^_]*)$')),
          (this.Pa = new RegExp(
            '^firestore_mutations_' + n + '_(\\d+)(?:_(.*))?$'
          )),
          (this.ya = new RegExp('^firestore_targets_' + n + '_(\\d+)$')),
          (this.ga = 'firestore_online_state_' + this.persistenceKey),
          (this.Va = 'firestore_bundle_loaded_' + this.persistenceKey),
          this.window.addEventListener('storage', this.wa);
      }
      function bl() {
        this.activeTargetIds = ea;
      }
      function wl(t, e) {
        (this.clientId = t), (this.onlineState = e);
      }
      function Il(t, e) {
        (this.clientId = t), (this.activeTargetIds = e);
      }
      function El(t, e, n) {
        (this.targetId = t), (this.state = e), (this.error = n);
      }
      function _l(t, e, n, r) {
        (this.user = t), (this.batchId = e), (this.state = n), (this.error = r);
      }
      function Tl() {
        return 'undefined' != typeof window ? window : null;
      }
      function Nl() {
        return 'undefined' != typeof document ? document : null;
      }
      function Al(t) {
        return new _a(t, !0);
      }
      function Sl(t, e, n, r, i) {
        var o = this;
        (this.Sh = t),
          (this.Dh = e),
          (this.fs = n),
          (this.Ch = {}),
          (this.xh = []),
          (this.Nh = new Map()),
          (this.Fh = new Set()),
          (this.Oh = []),
          (this.kh = i),
          this.kh.cu(function (t) {
            n.ys(function () {
              return y(o, void 0, void 0, function () {
                return v(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return Yl(this)
                        ? (oi(
                            'RemoteStore',
                            'Restarting streams for network reachability change.'
                          ),
                          [
                            4,
                            (function (n) {
                              return y(this, void 0, void 0, function () {
                                var e;
                                return v(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      return (e = n).Fh.add(4), [4, Hl(e)];
                                    case 1:
                                      return (
                                        t.sent(),
                                        e.Mh.set('Unknown'),
                                        e.Fh.delete(4),
                                        [4, zl(e)]
                                      );
                                    case 2:
                                      return t.sent(), [2];
                                  }
                                });
                              });
                            })(this)
                          ])
                        : [3, 2];
                    case 1:
                      t.sent(), (t.label = 2);
                    case 2:
                      return [2];
                  }
                });
              });
            });
          }),
          (this.Mh = new Rl(n, r));
      }
      var xl,
        Dl,
        Ol,
        kl =
          ((ql.prototype.reset = function () {
            this.ku = 0;
          }),
          (ql.prototype.$u = function () {
            this.ku = this.Ou;
          }),
          (ql.prototype.Bu = function (t) {
            var e = this;
            this.cancel();
            var n = Math.floor(this.ku + this.qu()),
              r = Math.max(0, Date.now() - this.Lu),
              i = Math.max(0, n - r);
            0 < i &&
              oi(
                'ExponentialBackoff',
                'Backing off for ' +
                  i +
                  ' ms (base delay: ' +
                  this.ku +
                  ' ms, delay with jitter: ' +
                  n +
                  ' ms, last attempt: ' +
                  r +
                  ' ms ago)'
              ),
              (this.Mu = this.no.mr(this.ds, i, function () {
                return (e.Lu = Date.now()), t();
              })),
              (this.ku *= this.Fu),
              this.ku < this.Nu && (this.ku = this.Nu),
              this.ku > this.Ou && (this.ku = this.Ou);
          }),
          (ql.prototype.Uu = function () {
            null !== this.Mu && (this.Mu.Ps(), (this.Mu = null));
          }),
          (ql.prototype.cancel = function () {
            null !== this.Mu && (this.Mu.cancel(), (this.Mu = null));
          }),
          (ql.prototype.qu = function () {
            return (Math.random() - 0.5) * this.ku;
          }),
          ql),
        $ =
          ((Fl.prototype.Hu = function () {
            return 1 === this.state || 2 === this.state || 4 === this.state;
          }),
          (Fl.prototype.Ju = function () {
            return 2 === this.state;
          }),
          (Fl.prototype.start = function () {
            3 !== this.state ? this.auth() : this.Yu();
          }),
          (Fl.prototype.stop = function () {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return this.Hu() ? [4, this.close(0)] : [3, 2];
                  case 1:
                    t.sent(), (t.label = 2);
                  case 2:
                    return [2];
                }
              });
            });
          }),
          (Fl.prototype.Xu = function () {
            (this.state = 0), this.zu.reset();
          }),
          (Fl.prototype.Zu = function () {
            var t = this;
            this.Ju() &&
              null === this.Gu &&
              (this.Gu = this.no.mr(this.Qu, 6e4, function () {
                return t.th();
              }));
          }),
          (Fl.prototype.eh = function (t) {
            this.nh(), this.stream.send(t);
          }),
          (Fl.prototype.th = function () {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                return this.Ju() ? [2, this.close(0)] : [2];
              });
            });
          }),
          (Fl.prototype.nh = function () {
            this.Gu && (this.Gu.cancel(), (this.Gu = null));
          }),
          (Fl.prototype.close = function (e, n) {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      this.nh(),
                      this.zu.cancel(),
                      this.ju++,
                      3 !== e
                        ? this.zu.reset()
                        : n && n.code === bi.RESOURCE_EXHAUSTED
                        ? (si(n.toString()),
                          si(
                            'Using maximum backoff delay to prevent overloading the backend.'
                          ),
                          this.zu.$u())
                        : n && n.code === bi.UNAUTHENTICATED && this.Wu.v(),
                      null !== this.stream &&
                        (this.sh(), this.stream.close(), (this.stream = null)),
                      (this.state = e),
                      [4, this.listener.Iu(n)]
                    );
                  case 1:
                    return t.sent(), [2];
                }
              });
            });
          }),
          (Fl.prototype.sh = function () {}),
          (Fl.prototype.auth = function () {
            var n = this;
            this.state = 1;
            var t = this.ih(this.ju),
              e = this.ju;
            this.Wu.getToken().then(
              function (t) {
                n.ju === e && n.rh(t);
              },
              function (e) {
                t(function () {
                  var t = new wi(
                    bi.UNKNOWN,
                    'Fetching auth token failed: ' + e.message
                  );
                  return n.oh(t);
                });
              }
            );
          }),
          (Fl.prototype.rh = function (t) {
            var e = this,
              n = this.ih(this.ju);
            (this.stream = this.ah(t)),
              this.stream.Eu(function () {
                n(function () {
                  return (e.state = 2), e.listener.Eu();
                });
              }),
              this.stream.Iu(function (t) {
                n(function () {
                  return e.oh(t);
                });
              }),
              this.stream.onMessage(function (t) {
                n(function () {
                  return e.onMessage(t);
                });
              });
          }),
          (Fl.prototype.Yu = function () {
            var t = this;
            (this.state = 4),
              this.zu.Bu(function () {
                return y(t, void 0, void 0, function () {
                  return v(this, function (t) {
                    return (this.state = 0), this.start(), [2];
                  });
                });
              });
          }),
          (Fl.prototype.oh = function (t) {
            return (
              oi('PersistentStream', 'close with error: ' + t),
              (this.stream = null),
              this.close(3, t)
            );
          }),
          (Fl.prototype.ih = function (e) {
            var n = this;
            return function (t) {
              n.no.ys(function () {
                return n.ju === e
                  ? t()
                  : (oi(
                      'PersistentStream',
                      'stream callback skipped by getCloseGuardedDispatcher.'
                    ),
                    Promise.resolve());
              });
            };
          }),
          Fl),
        Cl =
          (t(jl, (Ol = $)),
          (jl.prototype.ah = function (t) {
            return this.Ku.xu('Listen', t);
          }),
          (jl.prototype.onMessage = function (t) {
            this.zu.reset();
            var e = (function (t, e) {
                if ('targetChange' in e) {
                  e.targetChange;
                  var n =
                      'NO_CHANGE' ===
                      (o = e.targetChange.targetChangeType || 'NO_CHANGE')
                        ? 0
                        : 'ADD' === o
                        ? 1
                        : 'REMOVE' === o
                        ? 2
                        : 'CURRENT' === o
                        ? 3
                        : 'RESET' === o
                        ? 4
                        : ci(),
                    r = e.targetChange.targetIds || [],
                    i =
                      ((s = e.targetChange.resumeToken),
                      t.qt
                        ? (hi(void 0 === s || 'string' == typeof s),
                          vi.fromBase64String(s || ''))
                        : (hi(void 0 === s || s instanceof Uint8Array),
                          vi.fromUint8Array(s || new Uint8Array()))),
                    o =
                      (u = e.targetChange.cause) &&
                      ((a = void 0 === (c = u).code ? bi.UNKNOWN : Uu(c.code)),
                      new wi(a, c.message || '')),
                    s = new ca(n, r, i, o || null);
                } else if ('documentChange' in e) {
                  e.documentChange,
                    (n = e.documentChange).document,
                    n.document.name,
                    n.document.updateTime,
                    (r = Oa(t, n.document.name)),
                    (i = Aa(n.document.updateTime));
                  var u = new Po({ mapValue: { fields: n.document.fields } }),
                    a = ((o = new Fo(r, i, u, {})), n.targetIds || []),
                    c = n.removedTargetIds || [];
                  s = new ua(a, c, o.key, o);
                } else if ('documentDelete' in e)
                  e.documentDelete,
                    (n = e.documentDelete).document,
                    (r = Oa(t, n.document)),
                    (i = n.readTime ? Aa(n.readTime) : Xi.min()),
                    (u = new qo(r, i)),
                    (o = n.removedTargetIds || []),
                    (s = new ua([], o, u.key, u));
                else if ('documentRemove' in e)
                  e.documentRemove,
                    (n = e.documentRemove).document,
                    (r = Oa(t, n.document)),
                    (i = n.removedTargetIds || []),
                    (s = new ua([], i, r, null));
                else {
                  if (!('filter' in e)) return ci();
                  e.filter;
                  e = e.filter;
                  e.targetId,
                    (n = e.count || 0),
                    (r = new Du(n)),
                    (i = e.targetId),
                    (s = new aa(i, r));
                }
                return s;
              })(this.Kt, t),
              t = (function (t) {
                if (!('targetChange' in t)) return Xi.min();
                t = t.targetChange;
                return (!t.targetIds || !t.targetIds.length) && t.readTime
                  ? Aa(t.readTime)
                  : Xi.min();
              })(t);
            return this.listener.uh(e, t);
          }),
          (jl.prototype.hh = function (t) {
            var e,
              n,
              r,
              i = {};
            (i.database = Pa(this.Kt)),
              (i.addTarget =
                ((e = this.Kt),
                ((r = Yo((r = (n = t).target))
                  ? { documents: Ua(e, r) }
                  : { query: ja(e, r) }).targetId = n.targetId),
                0 < n.resumeToken.o()
                  ? (r.resumeToken = Na(e, n.resumeToken))
                  : 0 < n.Mt.u(Xi.min()) && (r.readTime = Ta(e, n.Mt.G())),
                r));
            var o,
              t =
                (this.Kt,
                (o = t),
                null ==
                (t = (function () {
                  switch (o.kt) {
                    case 0:
                      return null;
                    case 1:
                      return 'existence-filter-mismatch';
                    case 2:
                      return 'limbo-document';
                    default:
                      return ci();
                  }
                })())
                  ? null
                  : { 'goog-listen-tags': t });
            t && (i.labels = t), this.eh(i);
          }),
          (jl.prototype.lh = function (t) {
            var e = {};
            (e.database = Pa(this.Kt)), (e.removeTarget = t), this.eh(e);
          }),
          jl),
        Pl =
          (t(Ul, (Dl = $)),
          Object.defineProperty(Ul.prototype, 'fh', {
            get: function () {
              return this._h;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Ul.prototype.start = function () {
            (this._h = !1),
              (this.lastStreamToken = void 0),
              Dl.prototype.start.call(this);
          }),
          (Ul.prototype.sh = function () {
            this._h && this.dh([]);
          }),
          (Ul.prototype.ah = function (t) {
            return this.Ku.xu('Write', t);
          }),
          (Ul.prototype.onMessage = function (t) {
            if (
              (hi(!!t.streamToken),
              (this.lastStreamToken = t.streamToken),
              this._h)
            ) {
              this.zu.reset();
              var e =
                  ((n = t.writeResults),
                  (r = t.commitTime),
                  n && 0 < n.length
                    ? (hi(void 0 !== r),
                      n.map(function (t) {
                        return (function (t, e) {
                          var n = t.updateTime ? Aa(t.updateTime) : Aa(e);
                          n.isEqual(Xi.min()) && (n = Aa(e));
                          e = null;
                          return (
                            t.transformResults &&
                              0 < t.transformResults.length &&
                              (e = t.transformResults),
                            new fu(n, e)
                          );
                        })(t, r);
                      }))
                    : []),
                n = Aa(t.commitTime);
              return this.listener.wh(n, e);
            }
            var n, r;
            return (
              hi(!t.writeResults || 0 === t.writeResults.length),
              (this._h = !0),
              this.listener.Eh()
            );
          }),
          (Ul.prototype.Th = function () {
            var t = {};
            (t.database = Pa(this.Kt)), this.eh(t);
          }),
          (Ul.prototype.dh = function (t) {
            var e = this,
              t = {
                streamToken: this.lastStreamToken,
                writes: t.map(function (t) {
                  return Va(e.Kt, t);
                })
              };
            this.eh(t);
          }),
          Ul),
        Ll =
          (t(Ml, (xl = function () {})),
          (Ml.prototype.mh = function () {
            if (this.Ih)
              throw new wi(
                bi.FAILED_PRECONDITION,
                'The client has already been terminated.'
              );
          }),
          (Ml.prototype.bu = function (e, n, r) {
            var i = this;
            return (
              this.mh(),
              this.credentials
                .getToken()
                .then(function (t) {
                  return i.Ku.bu(e, n, r, t);
                })
                .catch(function (t) {
                  throw (t.code === bi.UNAUTHENTICATED && i.credentials.v(), t);
                })
            );
          }),
          (Ml.prototype.Cu = function (e, n, r) {
            var i = this;
            return (
              this.mh(),
              this.credentials
                .getToken()
                .then(function (t) {
                  return i.Ku.Cu(e, n, r, t);
                })
                .catch(function (t) {
                  throw (t.code === bi.UNAUTHENTICATED && i.credentials.v(), t);
                })
            );
          }),
          (Ml.prototype.terminate = function () {
            this.Ih = !1;
          }),
          Ml),
        Rl =
          ((Vl.prototype.yh = function () {
            var t = this;
            0 === this.Ah &&
              (this.gh('Unknown'),
              (this.Rh = this.fs.mr('online_state_timeout', 1e4, function () {
                return (
                  (t.Rh = null),
                  t.Vh("Backend didn't respond within 10 seconds."),
                  t.gh('Offline'),
                  Promise.resolve()
                );
              })));
          }),
          (Vl.prototype.ph = function (t) {
            'Online' === this.state
              ? this.gh('Unknown')
              : (this.Ah++,
                1 <= this.Ah &&
                  (this.bh(),
                  this.Vh(
                    'Connection failed 1 times. Most recent error: ' +
                      t.toString()
                  ),
                  this.gh('Offline')));
          }),
          (Vl.prototype.set = function (t) {
            this.bh(),
              (this.Ah = 0),
              'Online' === t && (this.Ph = !1),
              this.gh(t);
          }),
          (Vl.prototype.gh = function (t) {
            t !== this.state && ((this.state = t), this.da(t));
          }),
          (Vl.prototype.Vh = function (t) {
            t =
              'Could not reach Cloud Firestore backend. ' +
              t +
              '\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.';
            this.Ph ? (si(t), (this.Ph = !1)) : oi('OnlineStateTracker', t);
          }),
          (Vl.prototype.bh = function () {
            null !== this.Rh && (this.Rh.cancel(), (this.Rh = null));
          }),
          Vl);
      function Vl(t, e) {
        (this.fs = t),
          (this.da = e),
          (this.state = 'Unknown'),
          (this.Ah = 0),
          (this.Rh = null),
          (this.Ph = !0);
      }
      function Ml(t, e, n) {
        var r = this;
        return (
          ((r = xl.call(this) || this).credentials = t),
          (r.Ku = e),
          (r.Kt = n),
          (r.Ih = !1),
          r
        );
      }
      function Ul(t, e, n, r, i) {
        var o = this;
        return (
          ((o =
            Dl.call(
              this,
              t,
              'write_stream_connection_backoff',
              'write_stream_idle',
              e,
              n,
              i
            ) || this).Kt = r),
          (o._h = !1),
          o
        );
      }
      function jl(t, e, n, r, i) {
        var o = this;
        return (
          ((o =
            Ol.call(
              this,
              t,
              'listen_stream_connection_backoff',
              'listen_stream_idle',
              e,
              n,
              i
            ) || this).Kt = r),
          o
        );
      }
      function Fl(t, e, n, r, i, o) {
        (this.no = t),
          (this.Qu = n),
          (this.Ku = r),
          (this.Wu = i),
          (this.listener = o),
          (this.state = 0),
          (this.ju = 0),
          (this.Gu = null),
          (this.stream = null),
          (this.zu = new kl(t, e));
      }
      function ql(t, e, n, r, i) {
        void 0 === n && (n = 1e3),
          void 0 === r && (r = 1.5),
          void 0 === i && (i = 6e4),
          (this.no = t),
          (this.ds = e),
          (this.Nu = n),
          (this.Fu = r),
          (this.Ou = i),
          (this.ku = 0),
          (this.Mu = null),
          (this.Lu = Date.now()),
          this.reset();
      }
      function zl(r) {
        return y(this, void 0, void 0, function () {
          var e, n;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                if (!Yl(r)) return [3, 4];
                (e = 0), (n = r.Oh), (t.label = 1);
              case 1:
                return e < n.length ? [4, (0, n[e])(!0)] : [3, 4];
              case 2:
                t.sent(), (t.label = 3);
              case 3:
                return e++, [3, 1];
              case 4:
                return [2];
            }
          });
        });
      }
      function Hl(r) {
        return y(this, void 0, void 0, function () {
          var e, n;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                (e = 0), (n = r.Oh), (t.label = 1);
              case 1:
                return e < n.length ? [4, (0, n[e])(!1)] : [3, 4];
              case 2:
                t.sent(), (t.label = 3);
              case 3:
                return e++, [3, 1];
              case 4:
                return [2];
            }
          });
        });
      }
      function Bl(t, e) {
        t.Nh.has(e.targetId) ||
          (t.Nh.set(e.targetId, e), Xl(t) ? Wl(t) : op(t).Ju() && Kl(t, e));
      }
      function Gl(t, e) {
        var n = t,
          t = op(n);
        n.Nh.delete(e),
          t.Ju() && Jl(n, e),
          0 === n.Nh.size && (t.Ju() ? t.Zu() : Yl(n) && n.Mh.set('Unknown'));
      }
      function Kl(t, e) {
        t.Lh.cn(e.targetId), op(t).hh(e);
      }
      function Jl(t, e) {
        t.Lh.cn(e), op(t).lh(e);
      }
      function Wl(e) {
        (e.Lh = new fa({
          Sn: function (t) {
            return e.Ch.Sn(t);
          },
          Dn: function (t) {
            return e.Nh.get(t) || null;
          }
        })),
          op(e).start(),
          e.Mh.yh();
      }
      function Xl(t) {
        return Yl(t) && !op(t).Hu() && 0 < t.Nh.size;
      }
      function Yl(t) {
        return 0 === t.Fh.size;
      }
      function $l(t) {
        t.Lh = void 0;
      }
      function Ql(s, u, a) {
        return y(this, void 0, void 0, function () {
          var n, o;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                if (
                  (s.Mh.set('Online'),
                  !(u instanceof ca && 2 === u.state && u.cause))
                )
                  return [3, 6];
                t.label = 1;
              case 1:
                return (
                  t.trys.push([1, 3, , 5]),
                  [
                    4,
                    (function (o, s) {
                      return y(this, void 0, void 0, function () {
                        var e, n, r, i;
                        return v(this, function (t) {
                          switch (t.label) {
                            case 0:
                              (e = s.cause),
                                (n = 0),
                                (r = s.targetIds),
                                (t.label = 1);
                            case 1:
                              return n < r.length
                                ? ((i = r[n]),
                                  o.Nh.has(i) ? [4, o.Ch.$h(i, e)] : [3, 3])
                                : [3, 5];
                            case 2:
                              t.sent(),
                                o.Nh.delete(i),
                                o.Lh.removeTarget(i),
                                (t.label = 3);
                            case 3:
                              t.label = 4;
                            case 4:
                              return n++, [3, 1];
                            case 5:
                              return [2];
                          }
                        });
                      });
                    })(s, u)
                  ]
                );
              case 2:
                return t.sent(), [3, 5];
              case 3:
                return (
                  (n = t.sent()),
                  oi(
                    'RemoteStore',
                    'Failed to remove targets %s: %s ',
                    u.targetIds.join(','),
                    n
                  ),
                  [4, Zl(s, n)]
                );
              case 4:
                return t.sent(), [3, 5];
              case 5:
                return [3, 13];
              case 6:
                if (
                  (u instanceof ua
                    ? s.Lh.wn(u)
                    : u instanceof aa
                    ? s.Lh.yn(u)
                    : s.Lh.In(u),
                  a.isEqual(Xi.min()))
                )
                  return [3, 13];
                t.label = 7;
              case 7:
                return t.trys.push([7, 11, , 13]), [4, wf(s.Sh)];
              case 8:
                return (
                  (o = t.sent()),
                  0 <= a.u(o)
                    ? [
                        4,
                        ((i = a),
                        (e = (r = s).Lh.pn(i)).Oe.forEach(function (t, e) {
                          var n;
                          0 < t.resumeToken.o() &&
                            (n = r.Nh.get(e)) &&
                            r.Nh.set(e, n.$t(t.resumeToken, i));
                        }),
                        e.ke.forEach(function (t) {
                          var e = r.Nh.get(t);
                          e &&
                            (r.Nh.set(t, e.$t(vi.h, e.Mt)),
                            Jl(r, t),
                            (e = new Hs(e.target, t, 1, e.sequenceNumber)),
                            Kl(r, e));
                        }),
                        r.Ch.Bh(e))
                      ]
                    : [3, 10]
                );
              case 9:
                t.sent(), (t.label = 10);
              case 10:
                return [3, 13];
              case 11:
                return (
                  oi(
                    'RemoteStore',
                    'Failed to raise snapshot:',
                    (o = t.sent())
                  ),
                  [4, Zl(s, o)]
                );
              case 12:
                return t.sent(), [3, 13];
              case 13:
                return [2];
            }
            var r, i, e;
          });
        });
      }
      function Zl(n, r, i) {
        return y(this, void 0, void 0, function () {
          var e = this;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                if (!oc(r)) throw r;
                return n.Fh.add(1), [4, Hl(n)];
              case 1:
                return (
                  t.sent(),
                  n.Mh.set('Offline'),
                  (i =
                    i ||
                    function () {
                      return wf(n.Sh);
                    }),
                  n.fs.vo(function () {
                    return y(e, void 0, void 0, function () {
                      return v(this, function (t) {
                        switch (t.label) {
                          case 0:
                            return (
                              oi('RemoteStore', 'Retrying IndexedDB access'),
                              [4, i()]
                            );
                          case 1:
                            return t.sent(), n.Fh.delete(1), [4, zl(n)];
                          case 2:
                            return t.sent(), [2];
                        }
                      });
                    });
                  }),
                  [2]
                );
            }
          });
        });
      }
      function tp(e, n) {
        return n().catch(function (t) {
          return Zl(e, t, n);
        });
      }
      function ep(a) {
        return y(this, void 0, void 0, function () {
          var i, o, s, u;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                (o = sp((i = a))),
                  (s = 0 < i.xh.length ? i.xh[i.xh.length - 1].batchId : -1),
                  (t.label = 1);
              case 1:
                if (!(Yl(i) && i.xh.length < 10)) return [3, 7];
                t.label = 2;
              case 2:
                return (
                  t.trys.push([2, 4, , 6]),
                  [
                    4,
                    ((e = i.Sh),
                    (n = s),
                    (r = e).persistence.runTransaction(
                      'Get next mutation batch',
                      'readonly',
                      function (t) {
                        return void 0 === n && (n = -1), r.Ho.pi(t, n);
                      }
                    ))
                  ]
                );
              case 3:
                return null === (u = t.sent())
                  ? (0 === i.xh.length && o.Zu(), [3, 7])
                  : ((s = u.batchId),
                    (function (t, e) {
                      t.xh.push(e);
                      t = sp(t);
                      t.Ju() && t.fh && t.dh(e.mutations);
                    })(i, u),
                    [3, 6]);
              case 4:
                return (u = t.sent()), [4, Zl(i, u)];
              case 5:
                return t.sent(), [3, 6];
              case 6:
                return [3, 1];
              case 7:
                return np(i) && rp(i), [2];
            }
            var e, n, r;
          });
        });
      }
      function np(t) {
        return Yl(t) && !sp(t).Hu() && 0 < t.xh.length;
      }
      function rp(t) {
        sp(t).start();
      }
      function ip(n, r) {
        return y(this, void 0, void 0, function () {
          var e;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return (e = n), r ? (e.Fh.delete(2), [4, zl(e)]) : [3, 2];
              case 1:
                return t.sent(), [3, 5];
              case 2:
                return r ? [3, 4] : (e.Fh.add(2), [4, Hl(e)]);
              case 3:
                t.sent(), e.Mh.set('Unknown'), (t.label = 4);
              case 4:
                t.label = 5;
              case 5:
                return [2];
            }
          });
        });
      }
      function op(n) {
        var t,
          e,
          r,
          i = this;
        return (
          n.Qh ||
            ((n.Qh =
              ((t = n.Dh),
              (e = n.fs),
              (r = {
                Eu: function (n) {
                  return y(this, void 0, void 0, function () {
                    return v(this, function (t) {
                      return (
                        n.Nh.forEach(function (t, e) {
                          Kl(n, t);
                        }),
                        [2]
                      );
                    });
                  });
                }.bind(null, n),
                Iu: function (e, n) {
                  return y(this, void 0, void 0, function () {
                    return v(this, function (t) {
                      return (
                        $l(e),
                        Xl(e) ? (e.Mh.ph(n), Wl(e)) : e.Mh.set('Unknown'),
                        [2]
                      );
                    });
                  });
                }.bind(null, n),
                uh: Ql.bind(null, n)
              }),
              t.mh(),
              new Cl(e, t.Ku, t.credentials, t.Kt, r))),
            n.Oh.push(function (e) {
              return y(i, void 0, void 0, function () {
                return v(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return e
                        ? (n.Qh.Xu(),
                          Xl(n) ? Wl(n) : n.Mh.set('Unknown'),
                          [3, 3])
                        : [3, 1];
                    case 1:
                      return [4, n.Qh.stop()];
                    case 2:
                      t.sent(), $l(n), (t.label = 3);
                    case 3:
                      return [2];
                  }
                });
              });
            })),
          n.Qh
        );
      }
      function sp(n) {
        var t,
          e,
          r,
          i = this;
        return (
          n.Kh ||
            ((n.Kh =
              ((t = n.Dh),
              (e = n.fs),
              (r = {
                Eu: function (e) {
                  return y(this, void 0, void 0, function () {
                    return v(this, function (t) {
                      return sp(e).Th(), [2];
                    });
                  });
                }.bind(null, n),
                Iu: function (e, n) {
                  return y(this, void 0, void 0, function () {
                    return v(this, function (t) {
                      switch (t.label) {
                        case 0:
                          return n && sp(e).fh
                            ? [
                                4,
                                (function (r, i) {
                                  return y(this, void 0, void 0, function () {
                                    var e, n;
                                    return v(this, function (t) {
                                      switch (t.label) {
                                        case 0:
                                          return Mu((n = i.code)) &&
                                            n !== bi.ABORTED
                                            ? ((e = r.xh.shift()),
                                              sp(r).Xu(),
                                              [
                                                4,
                                                tp(r, function () {
                                                  return r.Ch.Uh(e.batchId, i);
                                                })
                                              ])
                                            : [3, 3];
                                        case 1:
                                          return t.sent(), [4, ep(r)];
                                        case 2:
                                          t.sent(), (t.label = 3);
                                        case 3:
                                          return [2];
                                      }
                                    });
                                  });
                                })(e, n)
                              ]
                            : [3, 2];
                        case 1:
                          t.sent(), (t.label = 2);
                        case 2:
                          return np(e) && rp(e), [2];
                      }
                    });
                  });
                }.bind(null, n),
                Eh: function (o) {
                  return y(this, void 0, void 0, function () {
                    var e, n, r, i;
                    return v(this, function (t) {
                      for (e = sp(o), n = 0, r = o.xh; n < r.length; n++)
                        (i = r[n]), e.dh(i.mutations);
                      return [2];
                    });
                  });
                }.bind(null, n),
                wh: function (r, i, o) {
                  return y(this, void 0, void 0, function () {
                    var e, n;
                    return v(this, function (t) {
                      switch (t.label) {
                        case 0:
                          return (
                            (e = r.xh.shift()),
                            (n = zc.from(e, i, o)),
                            [
                              4,
                              tp(r, function () {
                                return r.Ch.qh(n);
                              })
                            ]
                          );
                        case 1:
                          return t.sent(), [4, ep(r)];
                        case 2:
                          return t.sent(), [2];
                      }
                    });
                  });
                }.bind(null, n)
              }),
              t.mh(),
              new Pl(e, t.Ku, t.credentials, t.Kt, r))),
            n.Oh.push(function (e) {
              return y(i, void 0, void 0, function () {
                return v(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return e ? (n.Kh.Xu(), [4, ep(n)]) : [3, 2];
                    case 1:
                      return t.sent(), [3, 4];
                    case 2:
                      return [4, n.Kh.stop()];
                    case 3:
                      t.sent(),
                        0 < n.xh.length &&
                          (oi(
                            'RemoteStore',
                            'Stopping write stream with ' +
                              n.xh.length +
                              ' pending writes'
                          ),
                          (n.xh = [])),
                        (t.label = 4);
                    case 4:
                      return [2];
                  }
                });
              });
            })),
          n.Kh
        );
      }
      function up() {
        (this.queries = new gh(js, Us)),
          (this.onlineState = 'Unknown'),
          (this.jh = new Set());
      }
      var ap = function () {
        (this.Wh = void 0), (this.listeners = []);
      };
      function cp(s, u) {
        return y(this, void 0, void 0, function () {
          var e, n, r, i, o;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                if (
                  ((e = s),
                  (n = u.query),
                  (r = !1),
                  (i = e.queries.get(n)) || ((r = !0), (i = new ap())),
                  !r)
                )
                  return [3, 4];
                t.label = 1;
              case 1:
                return t.trys.push([1, 3, , 4]), (o = i), [4, e.Gh(n)];
              case 2:
                return (o.Wh = t.sent()), [3, 4];
              case 3:
                return (
                  (o = t.sent()),
                  (o = pc(
                    o,
                    "Initialization of query '" + Fs(u.query) + "' failed"
                  )),
                  [2, void u.onError(o)]
                );
              case 4:
                return (
                  e.queries.set(n, i),
                  i.listeners.push(u),
                  u.zh(e.onlineState),
                  i.Wh && u.Hh(i.Wh) && fp(e),
                  [2]
                );
            }
          });
        });
      }
      function hp(s, u) {
        return y(this, void 0, void 0, function () {
          var e, n, r, i, o;
          return v(this, function (t) {
            return (
              (e = s),
              (n = u.query),
              (r = !1),
              (i = e.queries.get(n)) &&
                0 <= (o = i.listeners.indexOf(u)) &&
                (i.listeners.splice(o, 1), (r = 0 === i.listeners.length)),
              r ? [2, (e.queries.delete(n), e.Jh(n))] : [2]
            );
          });
        });
      }
      function fp(t) {
        t.jh.forEach(function (t) {
          t.next();
        });
      }
      var lp =
        ((pp.prototype.Hh = function (t) {
          if (!this.options.includeMetadataChanges) {
            for (var e = [], n = 0, r = t.docChanges; n < r.length; n++) {
              var i = r[n];
              3 !== i.type && e.push(i);
            }
            t = new ia(t.query, t.docs, t.De, e, t.Ce, t.fromCache, t.xe, !0);
          }
          var o = !1;
          return (
            this.Xh
              ? this.tl(t) && (this.Yh.next(t), (o = !0))
              : this.el(t, this.onlineState) && (this.nl(t), (o = !0)),
            (this.Zh = t),
            o
          );
        }),
        (pp.prototype.onError = function (t) {
          this.Yh.error(t);
        }),
        (pp.prototype.zh = function (t) {
          this.onlineState = t;
          var e = !1;
          return (
            this.Zh &&
              !this.Xh &&
              this.el(this.Zh, t) &&
              (this.nl(this.Zh), (e = !0)),
            e
          );
        }),
        (pp.prototype.el = function (t, e) {
          if (!t.fromCache) return !0;
          var n = 'Offline' !== e;
          return !((this.options.sl && n) || (t.docs.nt() && 'Offline' !== e));
        }),
        (pp.prototype.tl = function (t) {
          if (0 < t.docChanges.length) return !0;
          var e = this.Zh && this.Zh.hasPendingWrites !== t.hasPendingWrites;
          return !(!t.xe && !e) && !0 === this.options.includeMetadataChanges;
        }),
        (pp.prototype.nl = function (t) {
          (t = ia.Fe(t.query, t.docs, t.Ce, t.fromCache)),
            (this.Xh = !0),
            this.Yh.next(t);
        }),
        pp);
      function pp(t, e, n) {
        (this.query = t),
          (this.Yh = e),
          (this.Xh = !1),
          (this.Zh = null),
          (this.onlineState = 'Unknown'),
          (this.options = n || {});
      }
      var dp = function (t) {
          this.key = t;
        },
        yp = function (t) {
          this.key = t;
        },
        vp =
          (Object.defineProperty(Ip.prototype, 'fl', {
            get: function () {
              return this.al;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Ip.prototype.dl = function (t, e) {
            var s = this,
              u = e ? e.wl : new ra(),
              a = (e || this)._l,
              c = (e || this).Ce,
              h = a,
              f = !1,
              l =
                Os(this.query) && a.size === this.query.limit ? a.last() : null,
              p =
                ks(this.query) && a.size === this.query.limit
                  ? a.first()
                  : null;
            if (
              (t.Zt(function (t, e) {
                var n = a.get(t),
                  r =
                    (r = e instanceof Fo ? e : null) &&
                    (qs(s.query, r) ? r : null),
                  i = !!n && s.Ce.has(n.key),
                  o =
                    !!r &&
                    (r.bt || (s.Ce.has(r.key) && r.hasCommittedMutations)),
                  e = !1;
                n && r
                  ? n.data().isEqual(r.data())
                    ? i !== o && (u.track({ type: 3, doc: r }), (e = !0))
                    : s.El(n, r) ||
                      (u.track({ type: 2, doc: r }),
                      (e = !0),
                      ((l && 0 < s.ll(r, l)) || (p && s.ll(r, p) < 0)) &&
                        (f = !0))
                  : !n && r
                  ? (u.track({ type: 0, doc: r }), (e = !0))
                  : n &&
                    !r &&
                    (u.track({ type: 1, doc: n }),
                    (e = !0),
                    (l || p) && (f = !0)),
                  e &&
                    (c = r
                      ? ((h = h.add(r)), o ? c.add(t) : c.delete(t))
                      : ((h = h.delete(t)), c.delete(t)));
              }),
              Os(this.query) || ks(this.query))
            )
              for (; h.size > this.query.limit; ) {
                var n = Os(this.query) ? h.last() : h.first(),
                  h = h.delete(n.key),
                  c = c.delete(n.key);
                u.track({ type: 1, doc: n });
              }
            return { _l: h, wl: u, _c: f, Ce: c };
          }),
          (Ip.prototype.El = function (t, e) {
            return t.bt && e.hasCommittedMutations && !e.bt;
          }),
          (Ip.prototype.Ti = function (t, e, n) {
            var o = this,
              r = this._l;
            (this._l = t._l), (this.Ce = t.Ce);
            var i = t.wl.Se();
            i.sort(function (t, e) {
              return (
                (r = t.type), (i = e.type), n(r) - n(i) || o.ll(t.doc, e.doc)
              );
              function n(t) {
                switch (t) {
                  case 0:
                    return 1;
                  case 2:
                  case 3:
                    return 2;
                  case 1:
                    return 0;
                  default:
                    return ci();
                }
              }
              var r, i;
            }),
              this.Tl(n);
            var s = e ? this.Il() : [],
              n = 0 === this.hl.size && this.qe ? 1 : 0,
              e = n !== this.ul;
            return (
              (this.ul = n),
              0 !== i.length || e
                ? {
                    snapshot: new ia(
                      this.query,
                      t._l,
                      r,
                      i,
                      t.Ce,
                      0 == n,
                      e,
                      !1
                    ),
                    ml: s
                  }
                : { ml: s }
            );
          }),
          (Ip.prototype.zh = function (t) {
            return this.qe && 'Offline' === t
              ? ((this.qe = !1),
                this.Ti({ _l: this._l, wl: new ra(), Ce: this.Ce, _c: !1 }, !1))
              : { ml: [] };
          }),
          (Ip.prototype.Al = function (t) {
            return !this.al.has(t) && !!this._l.has(t) && !this._l.get(t).bt;
          }),
          (Ip.prototype.Tl = function (t) {
            var e = this;
            t &&
              (t.Ue.forEach(function (t) {
                return (e.al = e.al.add(t));
              }),
              t.Qe.forEach(function (t) {}),
              t.Ke.forEach(function (t) {
                return (e.al = e.al.delete(t));
              }),
              (this.qe = t.qe));
          }),
          (Ip.prototype.Il = function () {
            var e = this;
            if (!this.qe) return [];
            var n = this.hl;
            (this.hl = ta()),
              this._l.forEach(function (t) {
                e.Al(t.key) && (e.hl = e.hl.add(t.key));
              });
            var r = [];
            return (
              n.forEach(function (t) {
                e.hl.has(t) || r.push(new yp(t));
              }),
              this.hl.forEach(function (t) {
                n.has(t) || r.push(new dp(t));
              }),
              r
            );
          }),
          (Ip.prototype.Rl = function (t) {
            (this.al = t.Pc), (this.hl = ta());
            t = this.dl(t.documents);
            return this.Ti(t, !0);
          }),
          (Ip.prototype.Pl = function () {
            return ia.Fe(this.query, this._l, this.Ce, 0 === this.ul);
          }),
          Ip),
        gp = function (t, e, n) {
          (this.query = t), (this.targetId = e), (this.view = n);
        },
        mp = function (t) {
          (this.key = t), (this.yl = !1);
        },
        bp =
          (Object.defineProperty(wp.prototype, '$l', {
            get: function () {
              return !0 === this.Ll;
            },
            enumerable: !1,
            configurable: !0
          }),
          wp);
      function wp(t, e, n, r, i, o) {
        (this.Sh = t),
          (this.gl = e),
          (this.Vl = n),
          (this.pl = r),
          (this.currentUser = i),
          (this.bl = o),
          (this.vl = {}),
          (this.Sl = new gh(js, Us)),
          (this.Dl = new Map()),
          (this.Cl = []),
          (this.xl = new ju(Zi.J)),
          (this.Nl = new Map()),
          (this.Fl = new kf()),
          (this.Ol = {}),
          (this.kl = new Map()),
          (this.Ml = xh.qi()),
          (this.onlineState = 'Unknown'),
          (this.Ll = void 0);
      }
      function Ip(t, e) {
        (this.query = t),
          (this.al = e),
          (this.ul = null),
          (this.qe = !1),
          (this.hl = ta()),
          (this.Ce = ta()),
          (this.ll = zs(t)),
          (this._l = new na(this.ll));
      }
      function Ep(i, o, s, u) {
        return y(this, void 0, void 0, function () {
          var e, n, r;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  (i.Bl = function (t, e, n) {
                    return (function (r, i, o, s) {
                      return y(this, void 0, void 0, function () {
                        var e, n;
                        return v(this, function (t) {
                          switch (t.label) {
                            case 0:
                              return (e = i.view.dl(o))._c
                                ? [
                                    4,
                                    Tf(r.Sh, i.query, !1).then(function (t) {
                                      t = t.documents;
                                      return i.view.dl(t, e);
                                    })
                                  ]
                                : [3, 2];
                            case 1:
                              (e = t.sent()), (t.label = 2);
                            case 2:
                              return (
                                (n = s && s.Oe.get(i.targetId)),
                                (n = i.view.Ti(e, r.$l, n)),
                                [2, (Cp(r, i.targetId, n.ml), n.snapshot)]
                              );
                          }
                        });
                      });
                    })(i, t, e, n);
                  }),
                  [4, Tf(i.Sh, o, !0)]
                );
              case 1:
                return (
                  (n = t.sent()),
                  (r = new vp(o, n.Pc)),
                  (e = r.dl(n.documents)),
                  (n = sa.Be(s, u && 'Offline' !== i.onlineState)),
                  (n = r.Ti(e, i.$l, n)),
                  Cp(i, s, n.ml),
                  (r = new gp(o, s, r)),
                  [
                    2,
                    (i.Sl.set(o, r),
                    i.Dl.has(s) ? i.Dl.get(s).push(o) : i.Dl.set(s, [o]),
                    n.snapshot)
                  ]
                );
            }
          });
        });
      }
      function _p(l, p, d) {
        return y(this, void 0, void 0, function () {
          var s, u;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                (u = qp(l)), (t.label = 1);
              case 1:
                return (
                  t.trys.push([1, 5, , 6]),
                  [
                    4,
                    ((i = u.Sh),
                    (a = p),
                    (h = i),
                    (f = Wi.now()),
                    (o = a.reduce(function (t, e) {
                      return t.add(e.key);
                    }, ta())),
                    h.persistence
                      .runTransaction(
                        'Locally write mutations',
                        'readwrite',
                        function (u) {
                          return h.Ic.Zo(u, o).next(function (t) {
                            c = t;
                            for (
                              var e, n = [], r = 0, i = a;
                              r < i.length;
                              r++
                            ) {
                              var o = i[r],
                                s =
                                  ((e = o),
                                  (s = c.get(o.key)),
                                  void 0 !== e.fieldTransforms
                                    ? (function (t, e) {
                                        for (
                                          var n = null, r = 0, i = t;
                                          r < i.length;
                                          r++
                                        ) {
                                          var o = i[r],
                                            s =
                                              e instanceof Fo
                                                ? e.field(o.field)
                                                : void 0,
                                            s = Ws(o.transform, s || null);
                                          null != s &&
                                            (n = (null == n ? new Lo() : n).set(
                                              o.field,
                                              s
                                            ));
                                        }
                                        return n ? n.yt() : null;
                                      })(e.fieldTransforms, s)
                                    : null);
                              null != s &&
                                n.push(
                                  new Eu(
                                    o.key,
                                    s,
                                    (function s(t) {
                                      var u = [];
                                      return (
                                        uo(t.fields || {}, function (t, e) {
                                          var n = new Qi([t]);
                                          if (Co(e))
                                            if (
                                              0 ===
                                              (e = s(e.mapValue).fields).length
                                            )
                                              u.push(n);
                                            else
                                              for (
                                                var r = 0, i = e;
                                                r < i.length;
                                                r++
                                              ) {
                                                var o = i[r];
                                                u.push(n.child(o));
                                              }
                                          else u.push(n);
                                        }),
                                        new co(u)
                                      );
                                    })(s.proto.mapValue),
                                    pu.exists(!0)
                                  )
                                );
                            }
                            return h.Ho.yi(u, f, n, a);
                          });
                        }
                      )
                      .then(function (t) {
                        var e = t.Fs(c);
                        return { batchId: t.batchId, ci: e };
                      }))
                  ]
                );
              case 2:
                return (
                  (s = t.sent()),
                  u.pl.xa(s.batchId),
                  (e = u),
                  (n = s.batchId),
                  (r = d),
                  (i = (i = (i = e.Ol[e.currentUser.R()]) || new ju(pi)).Ht(
                    n,
                    r
                  )),
                  (e.Ol[e.currentUser.R()] = i),
                  [4, Lp(u, s.ci)]
                );
              case 3:
                return t.sent(), [4, ep(u.gl)];
              case 4:
                return t.sent(), [3, 6];
              case 5:
                return (
                  (u = t.sent()),
                  (u = pc(u, 'Failed to persist write')),
                  d.reject(u),
                  [3, 6]
                );
              case 6:
                return [2];
            }
            var e, n, r, i, a, c, h, f, o;
          });
        });
      }
      function Tp(r, i) {
        return y(this, void 0, void 0, function () {
          var n, e;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                (n = r), (t.label = 1);
              case 1:
                return t.trys.push([1, 4, , 6]), [4, If(n.Sh, i)];
              case 2:
                return (
                  (e = t.sent()),
                  i.Oe.forEach(function (t, e) {
                    e = n.Nl.get(e);
                    e &&
                      (hi(t.Ue.size + t.Qe.size + t.Ke.size <= 1),
                      0 < t.Ue.size
                        ? (e.yl = !0)
                        : 0 < t.Qe.size
                        ? hi(e.yl)
                        : 0 < t.Ke.size && (hi(e.yl), (e.yl = !1)));
                  }),
                  [4, Lp(n, e, i)]
                );
              case 3:
                return t.sent(), [3, 6];
              case 4:
                return [4, vh(t.sent())];
              case 5:
                return t.sent(), [3, 6];
              case 6:
                return [2];
            }
          });
        });
      }
      function Np(t, n, e) {
        var r,
          t = t;
        ((t.$l && 0 === e) || (!t.$l && 1 === e)) &&
          ((r = []),
          t.Sl.forEach(function (t, e) {
            e = e.view.zh(n);
            e.snapshot && r.push(e.snapshot);
          }),
          (function (t, i) {
            t.onlineState = i;
            var o = !1;
            t.queries.forEach(function (t, e) {
              for (var n = 0, r = e.listeners; n < r.length; n++)
                r[n].zh(i) && (o = !0);
            }),
              o && fp(t);
          })(t.Vl, n),
          r.length && t.vl.uh(r),
          (t.onlineState = n),
          t.$l && t.pl.Ka(n));
      }
      function Ap(s, u, a) {
        return y(this, void 0, void 0, function () {
          var n, o;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                (n = s), (t.label = 1);
              case 1:
                return (
                  t.trys.push([1, 4, , 6]),
                  [
                    4,
                    ((e = n.Sh),
                    (r = u),
                    (i = e).persistence.runTransaction(
                      'Reject batch',
                      'readwrite-primary',
                      function (e) {
                        var n;
                        return i.Ho.gi(e, r)
                          .next(function (t) {
                            return (
                              hi(null !== t), (n = t.keys()), i.Ho.Ni(e, t)
                            );
                          })
                          .next(function () {
                            return i.Ho.ki(e);
                          })
                          .next(function () {
                            return i.Ic.Zo(e, n);
                          });
                      }
                    ))
                  ]
                );
              case 2:
                return (
                  (o = t.sent()),
                  Dp(n, u, a),
                  xp(n, u),
                  n.pl.Fa(u, 'rejected', a),
                  [4, Lp(n, o)]
                );
              case 3:
                return t.sent(), [3, 6];
              case 4:
                return [4, vh(t.sent())];
              case 5:
                return t.sent(), [3, 6];
              case 6:
                return [2];
            }
            var e, r, i;
          });
        });
      }
      function Sp(o, s) {
        return y(this, void 0, void 0, function () {
          var n, r, i;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                Yl((n = o).gl) ||
                  oi(
                    'SyncEngine',
                    "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled."
                  ),
                  (t.label = 1);
              case 1:
                return (
                  t.trys.push([1, 3, , 4]),
                  [
                    4,
                    (e = n.Sh).persistence.runTransaction(
                      'Get highest unacknowledged batch id',
                      'readonly',
                      function (t) {
                        return e.Ho.bi(t);
                      }
                    )
                  ]
                );
              case 2:
                return -1 === (r = t.sent())
                  ? [2, void s.resolve()]
                  : ((i = n.kl.get(r) || []).push(s), n.kl.set(r, i), [3, 4]);
              case 3:
                return (
                  (i = t.sent()),
                  (i = pc(
                    i,
                    'Initialization of waitForPendingWrites() operation failed'
                  )),
                  s.reject(i),
                  [3, 4]
                );
              case 4:
                return [2];
            }
            var e;
          });
        });
      }
      function xp(t, e) {
        (t.kl.get(e) || []).forEach(function (t) {
          t.resolve();
        }),
          t.kl.delete(e);
      }
      function Dp(t, e, n) {
        var r = t,
          i = r.Ol[r.currentUser.R()];
        i &&
          ((t = i.get(e)) && (n ? t.reject(n) : t.resolve(), (i = i.remove(e))),
          (r.Ol[r.currentUser.R()] = i));
      }
      function Op(e, t, n) {
        void 0 === n && (n = null), e.pl.La(t);
        for (var r = 0, i = e.Dl.get(t); r < i.length; r++) {
          var o = i[r];
          e.Sl.delete(o), n && e.vl.ql(o, n);
        }
        e.Dl.delete(t),
          e.$l &&
            e.Fl.kc(t).forEach(function (t) {
              e.Fl.Mi(t) || kp(e, t);
            });
      }
      function kp(t, e) {
        var n = t.xl.get(e);
        null !== n &&
          (Gl(t.gl, n), (t.xl = t.xl.remove(e)), t.Nl.delete(n), Pp(t));
      }
      function Cp(t, e, n) {
        for (var r = 0, i = n; r < i.length; r++) {
          var o = i[r];
          o instanceof dp
            ? (t.Fl.ir(o.key, e),
              (function (t, e) {
                e = e.key;
                t.xl.get(e) ||
                  (oi('SyncEngine', 'New document in limbo: ' + e),
                  t.Cl.push(e),
                  Pp(t));
              })(t, o))
            : o instanceof yp
            ? (oi('SyncEngine', 'Document no longer in limbo: ' + o.key),
              t.Fl.cr(o.key, e),
              t.Fl.Mi(o.key) || kp(t, o.key))
            : ci();
        }
      }
      function Pp(t) {
        for (; 0 < t.Cl.length && t.xl.size < t.bl; ) {
          var e = t.Cl.shift(),
            n = t.Ml.next();
          t.Nl.set(n, new mp(e)),
            (t.xl = t.xl.Ht(e, n)),
            Bl(t.gl, new Hs(Vs(Ds(e.path)), n, 2, Fi.U));
        }
      }
      function Lp(e, s, u) {
        return y(this, void 0, void 0, function () {
          var n, r, i, o;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  (r = []),
                  (i = []),
                  (o = []),
                  (n = e).Sl.nt()
                    ? [3, 3]
                    : (n.Sl.forEach(function (t, e) {
                        o.push(
                          n.Bl(e, s, u).then(function (t) {
                            t &&
                              (n.$l &&
                                n.pl.qa(
                                  e.targetId,
                                  t.fromCache ? 'not-current' : 'current'
                                ),
                              r.push(t),
                              (t = hf.cc(e.targetId, t)),
                              i.push(t));
                          })
                        );
                      }),
                      [4, Promise.all(o)])
                );
              case 1:
                return (
                  t.sent(),
                  n.vl.uh(r),
                  [
                    4,
                    (function (a, c) {
                      return y(this, void 0, void 0, function () {
                        var r, e, n, i, o, s, u;
                        return v(this, function (t) {
                          switch (t.label) {
                            case 0:
                              (r = a), (t.label = 1);
                            case 1:
                              return (
                                t.trys.push([1, 3, , 4]),
                                [
                                  4,
                                  r.persistence.runTransaction(
                                    'notifyLocalViewChanges',
                                    'readwrite',
                                    function (n) {
                                      return Xa.forEach(c, function (e) {
                                        return Xa.forEach(e.rc, function (t) {
                                          return r.persistence.mi.ir(
                                            n,
                                            e.targetId,
                                            t
                                          );
                                        }).next(function () {
                                          return Xa.forEach(e.oc, function (t) {
                                            return r.persistence.mi.cr(
                                              n,
                                              e.targetId,
                                              t
                                            );
                                          });
                                        });
                                      });
                                    }
                                  )
                                ]
                              );
                            case 2:
                              return t.sent(), [3, 4];
                            case 3:
                              if (!oc((e = t.sent()))) throw e;
                              return (
                                oi(
                                  'LocalStore',
                                  'Failed to update sequence numbers: ' + e
                                ),
                                [3, 4]
                              );
                            case 4:
                              for (n = 0, i = c; n < i.length; n++)
                                (u = i[n]),
                                  (o = u.targetId),
                                  u.fromCache ||
                                    ((s = r.dc.get(o)),
                                    (u = s.Mt),
                                    (u = s.Bt(u)),
                                    (r.dc = r.dc.Ht(o, u)));
                              return [2];
                          }
                        });
                      });
                    })(n.Sh, i)
                  ]
                );
              case 2:
                t.sent(), (t.label = 3);
              case 3:
                return [2];
            }
          });
        });
      }
      function Rp(i, o) {
        return y(this, void 0, void 0, function () {
          var n, r;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return (n = i).currentUser.isEqual(o)
                  ? [3, 3]
                  : (oi('SyncEngine', 'User change. New user:', o.R()),
                    [4, mf(n.Sh, o)]);
              case 1:
                return (
                  (r = t.sent()),
                  (n.currentUser = o),
                  (e = n).kl.forEach(function (t) {
                    t.forEach(function (t) {
                      t.reject(
                        new wi(
                          bi.CANCELLED,
                          "'waitForPendingWrites' promise is rejected due to a user change."
                        )
                      );
                    });
                  }),
                  e.kl.clear(),
                  n.pl.Qa(o, r.Ac, r.Rc),
                  [4, Lp(n, r.mc)]
                );
              case 2:
                t.sent(), (t.label = 3);
              case 3:
                return [2];
            }
            var e;
          });
        });
      }
      function Vp(u, a, c, h) {
        return y(this, void 0, void 0, function () {
          var o, s;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return [
                  4,
                  ((e = (o = u).Sh),
                  (n = a),
                  (i = (r = e).Ho),
                  r.persistence.runTransaction(
                    'Lookup mutation documents',
                    'readonly',
                    function (e) {
                      return i.Vi(e, n).next(function (t) {
                        return t ? r.Ic.Zo(e, t) : Xa.resolve(null);
                      });
                    }
                  ))
                ];
              case 1:
                return null === (s = t.sent())
                  ? [3, 6]
                  : 'pending' !== c
                  ? [3, 3]
                  : [4, ep(o.gl)];
              case 2:
                return t.sent(), [3, 4];
              case 3:
                'acknowledged' === c || 'rejected' === c
                  ? (Dp(o, a, h || null), xp(o, a), o.Sh.Ho.Fi(a))
                  : ci(),
                  (t.label = 4);
              case 4:
                return [4, Lp(o, s)];
              case 5:
                return t.sent(), [3, 7];
              case 6:
                oi('SyncEngine', 'Cannot apply mutation batch with id: ' + a),
                  (t.label = 7);
              case 7:
                return [2];
            }
            var e, n, r, i;
          });
        });
      }
      function Mp(h, f) {
        return y(this, void 0, void 0, function () {
          var r, e, i, o, s, u, a, c;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  Fp((r = h)),
                  qp(r),
                  !0 !== f || !0 === r.Ll
                    ? [3, 3]
                    : ((e = r.pl.Sa()), [4, Up(r, e.rt())])
                );
              case 1:
                return (i = t.sent()), (r.Ll = !0), [4, ip(r.gl, !0)];
              case 2:
                for (t.sent(), o = 0, s = i; o < s.length; o++)
                  (u = s[o]), Bl(r.gl, u);
                return [3, 7];
              case 3:
                return !1 !== f || !1 === r.Ll
                  ? [3, 7]
                  : ((a = []),
                    (c = Promise.resolve()),
                    r.Dl.forEach(function (t, e) {
                      r.pl.$a(e)
                        ? a.push(e)
                        : (c = c.then(function () {
                            return Op(r, e), _f(r.Sh, e, !0);
                          })),
                        Gl(r.gl, e);
                    }),
                    [4, c]);
              case 4:
                return t.sent(), [4, Up(r, a)];
              case 5:
                return (
                  t.sent(),
                  (n = r).Nl.forEach(function (t, e) {
                    Gl(n.gl, e);
                  }),
                  n.Fl.Mc(),
                  (n.Nl = new Map()),
                  (n.xl = new ju(Zi.J)),
                  (r.Ll = !1),
                  [4, ip(r.gl, !1)]
                );
              case 6:
                t.sent(), (t.label = 7);
              case 7:
                return [2];
            }
            var n;
          });
        });
      }
      function Up(p, d) {
        return y(this, void 0, void 0, function () {
          var e, n, r, i, o, s, u, a, c, h, f, l;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                (e = p), (n = []), (r = []), (i = 0), (o = d), (t.label = 1);
              case 1:
                return i < o.length
                  ? ((s = o[i]),
                    (u = void 0),
                    (a = e.Dl.get(s)) && 0 !== a.length
                      ? [4, Ef(e.Sh, Vs(a[0]))]
                      : [3, 7])
                  : [3, 13];
              case 2:
                (u = t.sent()), (c = 0), (h = a), (t.label = 3);
              case 3:
                return c < h.length
                  ? ((f = h[c]),
                    (f = e.Sl.get(f)),
                    [
                      4,
                      (function (r, i) {
                        return y(this, void 0, void 0, function () {
                          var e, n;
                          return v(this, function (t) {
                            switch (t.label) {
                              case 0:
                                return [4, Tf((e = r).Sh, i.query, !0)];
                              case 1:
                                return (
                                  (n = t.sent()),
                                  (n = i.view.Rl(n)),
                                  [2, (e.$l && Cp(e, i.targetId, n.ml), n)]
                                );
                            }
                          });
                        });
                      })(e, f)
                    ])
                  : [3, 6];
              case 4:
                (f = t.sent()).snapshot && r.push(f.snapshot), (t.label = 5);
              case 5:
                return c++, [3, 3];
              case 6:
                return [3, 11];
              case 7:
                return [4, Nf(e.Sh, s)];
              case 8:
                return (l = t.sent()), [4, Ef(e.Sh, l)];
              case 9:
                return (u = t.sent()), [4, Ep(e, jp(l), s, !1)];
              case 10:
                t.sent(), (t.label = 11);
              case 11:
                n.push(u), (t.label = 12);
              case 12:
                return i++, [3, 1];
              case 13:
                return [2, (e.vl.uh(r), n)];
            }
          });
        });
      }
      function jp(t) {
        return xs(
          t.path,
          t.collectionGroup,
          t.orderBy,
          t.filters,
          t.limit,
          'F',
          t.startAt,
          t.endAt
        );
      }
      function Fp(t) {
        return (
          (t.gl.Ch.Bh = Tp.bind(null, t)),
          (t.gl.Ch.Sn = function (t, e) {
            var n = t;
            if ((t = n.Nl.get(e)) && t.yl) return ta().add(t.key);
            var r = ta();
            if (!(e = n.Dl.get(e))) return r;
            for (var i = 0, o = e; i < o.length; i++)
              var s = o[i], s = n.Sl.get(s), r = r.ye(s.view.fl);
            return r;
          }.bind(null, t)),
          (t.gl.Ch.$h = function (o, s, u) {
            return y(this, void 0, void 0, function () {
              var e, n, r, i;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      (e = o).pl.qa(s, 'rejected', u),
                      (i = e.Nl.get(s)),
                      (n = i && i.key)
                        ? ((r = (r = new ju(Zi.J)).Ht(n, new qo(n, Xi.min()))),
                          (i = ta().add(n)),
                          (i = new oa(Xi.min(), new Map(), new Ku(pi), r, i)),
                          [4, Tp(e, i)])
                        : [3, 2]
                    );
                  case 1:
                    return (
                      t.sent(),
                      (e.xl = e.xl.remove(n)),
                      e.Nl.delete(s),
                      Pp(e),
                      [3, 4]
                    );
                  case 2:
                    return [
                      4,
                      _f(e.Sh, s, !1)
                        .then(function () {
                          return Op(e, s, u);
                        })
                        .catch(vh)
                    ];
                  case 3:
                    t.sent(), (t.label = 4);
                  case 4:
                    return [2];
                }
              });
            });
          }.bind(null, t)),
          (t.vl.uh = function (t, e) {
            for (var n = t, r = !1, i = 0, o = e; i < o.length; i++) {
              var s = o[i],
                u = s.query,
                u = n.queries.get(u);
              if (u) {
                for (var a = 0, c = u.listeners; a < c.length; a++)
                  c[a].Hh(s) && (r = !0);
                u.Wh = s;
              }
            }
            r && fp(n);
          }.bind(null, t.Vl)),
          (t.vl.ql = function (t, e, n) {
            var r = t;
            if ((t = r.queries.get(e)))
              for (var i = 0, o = t.listeners; i < o.length; i++)
                o[i].onError(n);
            r.queries.delete(e);
          }.bind(null, t.Vl)),
          t
        );
      }
      function qp(t) {
        return (
          (t.gl.Ch.qh = function (i, o) {
            return y(this, void 0, void 0, function () {
              var e, n, r;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    (e = i), (n = o.batch.batchId), (t.label = 1);
                  case 1:
                    return t.trys.push([1, 4, , 6]), [4, bf(e.Sh, o)];
                  case 2:
                    return (
                      (r = t.sent()),
                      Dp(e, n, null),
                      xp(e, n),
                      e.pl.Fa(n, 'acknowledged'),
                      [4, Lp(e, r)]
                    );
                  case 3:
                    return t.sent(), [3, 6];
                  case 4:
                    return [4, vh(t.sent())];
                  case 5:
                    return t.sent(), [3, 6];
                  case 6:
                    return [2];
                }
              });
            });
          }.bind(null, t)),
          (t.gl.Ch.Uh = Ap.bind(null, t)),
          t
        );
      }
      var zp,
        Hp,
        Bp =
          (($p.prototype.initialize = function (e) {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      (this.Kt = Al(e.gu.T)),
                      (this.pl = this.jl(e)),
                      (this.persistence = this.Gl(e)),
                      [4, this.persistence.start()]
                    );
                  case 1:
                    return (
                      t.sent(),
                      (this.zl = this.Hl(e)),
                      (this.Sh = this.Jl(e)),
                      [2]
                    );
                }
              });
            });
          }),
          ($p.prototype.Hl = function (t) {
            return null;
          }),
          ($p.prototype.Jl = function (t) {
            return gf(this.persistence, new ff(), t.Yl, this.Kt);
          }),
          ($p.prototype.Gl = function (t) {
            return new Mf(jf.ra, this.Kt);
          }),
          ($p.prototype.jl = function (t) {
            return new sl();
          }),
          ($p.prototype.terminate = function () {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return this.zl && this.zl.stop(), [4, this.pl.$o()];
                  case 1:
                    return t.sent(), [4, this.persistence.$o()];
                  case 2:
                    return t.sent(), [2];
                }
              });
            });
          }),
          $p),
        Gp =
          (t(Yp, (Hp = Bp)),
          (Yp.prototype.initialize = function (e) {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return [4, Hp.prototype.initialize.call(this, e)];
                  case 1:
                    return t.sent(), [4, Sf(this.Sh)];
                  case 2:
                    return t.sent(), [4, this.Xl.initialize(this, e)];
                  case 3:
                    return t.sent(), [4, qp(this.Xl.fa)];
                  case 4:
                    return t.sent(), [4, ep(this.Xl.gl)];
                  case 5:
                    return t.sent(), [2];
                }
              });
            });
          }),
          (Yp.prototype.Jl = function (t) {
            return gf(this.persistence, new ff(), t.Yl, this.Kt);
          }),
          (Yp.prototype.Hl = function (t) {
            var e = this.persistence.mi.dr;
            return new Mh(e, t.fs);
          }),
          (Yp.prototype.Gl = function (t) {
            var e = af(t.gu.T, t.gu.persistenceKey),
              n =
                void 0 !== this.cacheSizeBytes
                  ? dh.Zs(this.cacheSizeBytes)
                  : dh.ni;
            return new rf(
              this.synchronizeTabs,
              e,
              t.clientId,
              n,
              t.fs,
              Tl(),
              Nl(),
              this.Kt,
              this.pl,
              !!this.forceOwnership
            );
          }),
          (Yp.prototype.jl = function (t) {
            return new sl();
          }),
          Yp),
        Kp =
          (t(Xp, (zp = Gp)),
          (Xp.prototype.initialize = function (r) {
            return y(this, void 0, void 0, function () {
              var e,
                n = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return [4, zp.prototype.initialize.call(this, r)];
                  case 1:
                    return (
                      t.sent(),
                      (e = this.Xl.fa),
                      this.pl instanceof ol
                        ? ((this.pl.fa = {
                            nu: Vp.bind(null, e),
                            su: function (i, o, s, u) {
                              return y(this, void 0, void 0, function () {
                                var e, n, r;
                                return v(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      return (e = i).Ll
                                        ? (oi(
                                            'SyncEngine',
                                            'Ignoring unexpected query state notification.'
                                          ),
                                          [3, 8])
                                        : [3, 1];
                                    case 1:
                                      if (!e.Dl.has(o)) return [3, 8];
                                      switch (s) {
                                        case 'current':
                                        case 'not-current':
                                          return [3, 2];
                                        case 'rejected':
                                          return [3, 5];
                                      }
                                      return [3, 7];
                                    case 2:
                                      return [4, Af(e.Sh)];
                                    case 3:
                                      return (
                                        (n = t.sent()),
                                        (r = oa.$e(o, 'current' === s)),
                                        [4, Lp(e, n, r)]
                                      );
                                    case 4:
                                      return t.sent(), [3, 8];
                                    case 5:
                                      return [4, _f(e.Sh, o, !0)];
                                    case 6:
                                      return t.sent(), Op(e, o, u), [3, 8];
                                    case 7:
                                      ci(), (t.label = 8);
                                    case 8:
                                      return [2];
                                  }
                                });
                              });
                            }.bind(null, e),
                            iu: function (c, h, f) {
                              return y(this, void 0, void 0, function () {
                                var n, e, r, i, o, s, u, a;
                                return v(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      if (!(n = Fp(c)).Ll) return [3, 10];
                                      (e = 0), (r = h), (t.label = 1);
                                    case 1:
                                      return e < r.length
                                        ? ((r = r[e]),
                                          n.Dl.has(r)
                                            ? (oi(
                                                'SyncEngine',
                                                'Adding an already active target ' +
                                                  r
                                              ),
                                              [3, 5])
                                            : [4, Nf(n.Sh, r)])
                                        : [3, 6];
                                    case 2:
                                      return (i = t.sent()), [4, Ef(n.Sh, i)];
                                    case 3:
                                      return (
                                        (o = t.sent()),
                                        [4, Ep(n, jp(i), o.targetId, !1)]
                                      );
                                    case 4:
                                      t.sent(), Bl(n.gl, o), (t.label = 5);
                                    case 5:
                                      return e++, [3, 1];
                                    case 6:
                                      (s = function (e) {
                                        return v(this, function (t) {
                                          switch (t.label) {
                                            case 0:
                                              return n.Dl.has(e)
                                                ? [
                                                    4,
                                                    _f(n.Sh, e, !1)
                                                      .then(function () {
                                                        Gl(n.gl, e), Op(n, e);
                                                      })
                                                      .catch(vh)
                                                  ]
                                                : [3, 2];
                                            case 1:
                                              t.sent(), (t.label = 2);
                                            case 2:
                                              return [2];
                                          }
                                        });
                                      }),
                                        (u = 0),
                                        (a = f),
                                        (t.label = 7);
                                    case 7:
                                      return u < a.length
                                        ? ((a = a[u]), [5, s(a)])
                                        : [3, 10];
                                    case 8:
                                      t.sent(), (t.label = 9);
                                    case 9:
                                      return u++, [3, 7];
                                    case 10:
                                      return [2];
                                  }
                                });
                              });
                            }.bind(null, e),
                            Ko: function (t) {
                              return t.Sh.persistence.Ko();
                            }.bind(null, e),
                            eu: function (n) {
                              return y(this, void 0, void 0, function () {
                                var e;
                                return v(this, function (t) {
                                  return [
                                    2,
                                    Af((e = n).Sh).then(function (t) {
                                      return Lp(e, t);
                                    })
                                  ];
                                });
                              });
                            }.bind(null, e)
                          }),
                          [4, this.pl.start()])
                        : [3, 3]
                    );
                  case 2:
                    t.sent(), (t.label = 3);
                  case 3:
                    return [
                      4,
                      this.persistence.yo(function (e) {
                        return y(n, void 0, void 0, function () {
                          return v(this, function (t) {
                            switch (t.label) {
                              case 0:
                                return [4, Mp(this.Xl.fa, e)];
                              case 1:
                                return (
                                  t.sent(),
                                  this.zl &&
                                    (e && !this.zl.Ir
                                      ? this.zl.start(this.Sh)
                                      : e || this.zl.stop()),
                                  [2]
                                );
                            }
                          });
                        });
                      })
                    ];
                  case 4:
                    return t.sent(), [2];
                }
              });
            });
          }),
          (Xp.prototype.jl = function (t) {
            var e = Tl();
            if (!ol.Wn(e))
              throw new wi(
                bi.UNIMPLEMENTED,
                'IndexedDB persistence is only available on platforms that support LocalStorage.'
              );
            var n = af(t.gu.T, t.gu.persistenceKey);
            return new ol(e, t.fs, n, t.clientId, t.Yl);
          }),
          Xp),
        Jp =
          ((Wp.prototype.initialize = function (n, r) {
            return y(this, void 0, void 0, function () {
              var e = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return this.Sh
                      ? [3, 2]
                      : ((this.Sh = n.Sh),
                        (this.pl = n.pl),
                        (this.Dh = this.Zl(r)),
                        (this.gl = this.t_(r)),
                        (this.Vl = this.e_(r)),
                        (this.fa = this.n_(r, !n.synchronizeTabs)),
                        (this.pl.da = function (t) {
                          return Np(e.fa, t, 1);
                        }),
                        (this.gl.Ch.s_ = Rp.bind(null, this.fa)),
                        [4, ip(this.gl, this.fa.$l)]);
                  case 1:
                    t.sent(), (t.label = 2);
                  case 2:
                    return [2];
                }
              });
            });
          }),
          (Wp.prototype.e_ = function (t) {
            return new up();
          }),
          (Wp.prototype.Zl = function (t) {
            var e = Al(t.gu.T),
              n = ((n = t.gu), new fl(n));
            return (t = t.credentials), new Ll(t, n, e);
          }),
          (Wp.prototype.t_ = function (t) {
            var e = this,
              n = this.Sh,
              r = this.Dh,
              i = t.fs,
              o = function (t) {
                return Np(e.fa, t, 0);
              },
              t = new (al.Wn() ? al : ul)();
            return new Sl(n, r, i, o, t);
          }),
          (Wp.prototype.n_ = function (t, e) {
            return (function (t, e, n, r, i, o, s) {
              o = new bp(t, e, n, r, i, o);
              return s && (o.Ll = !0), o;
            })(this.Sh, this.gl, this.Vl, this.pl, t.Yl, t.bl, e);
          }),
          (Wp.prototype.terminate = function () {
            return (function (n) {
              return y(this, void 0, void 0, function () {
                var e;
                return v(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return (
                        (e = n),
                        oi('RemoteStore', 'RemoteStore shutting down.'),
                        e.Fh.add(5),
                        [4, Hl(e)]
                      );
                    case 1:
                      return t.sent(), e.kh.$o(), e.Mh.set('Unknown'), [2];
                  }
                });
              });
            })(this.gl);
          }),
          Wp);
      function Wp() {}
      function Xp(t, e) {
        var n = this;
        return (
          ((n = zp.call(this, t, e, !1) || this).Xl = t),
          (n.cacheSizeBytes = e),
          (n.synchronizeTabs = !0),
          n
        );
      }
      function Yp(t, e, n) {
        var r = this;
        return (
          ((r = Hp.call(this) || this).Xl = t),
          (r.cacheSizeBytes = e),
          (r.forceOwnership = n),
          (r.synchronizeTabs = !1),
          r
        );
      }
      function $p() {
        this.synchronizeTabs = !1;
      }
      var Qp =
          ((nd.prototype.next = function (t) {
            this.observer.next && this.i_(this.observer.next, t);
          }),
          (nd.prototype.error = function (t) {
            this.observer.error
              ? this.i_(this.observer.error, t)
              : console.error('Uncaught Error in snapshot listener:', t);
          }),
          (nd.prototype.r_ = function () {
            this.muted = !0;
          }),
          (nd.prototype.i_ = function (t, e) {
            var n = this;
            this.muted ||
              setTimeout(function () {
                n.muted || t(e);
              }, 0);
          }),
          nd),
        Zp =
          ((ed.prototype.isEqual = function (t) {
            return this.d_.isEqual(t.d_);
          }),
          ed),
        td = function (t) {
          this._methodName = t;
        };
      function ed() {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        for (var n = 0; n < t.length; ++n)
          if (0 === t[n].length)
            throw new wi(
              bi.INVALID_ARGUMENT,
              'Invalid field name at argument $(i + 1). Field names must not be empty.'
            );
        this.d_ = new Qi(t);
      }
      function nd(t) {
        (this.observer = t), (this.muted = !1);
      }
      function rd(t, e, n) {
        if (!n)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Function ' + t + '() cannot be called with an empty ' + e + '.'
          );
      }
      function id(t, e) {
        if (void 0 === e) return { merge: !1 };
        if (void 0 !== e.mergeFields && void 0 !== e.merge)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Invalid options passed to function ' +
              t +
              '(): You cannot specify both "merge" and "mergeFields".'
          );
        return e;
      }
      function od(t, e, n, r) {
        if (!0 === e && !0 === r)
          throw new wi(
            bi.INVALID_ARGUMENT,
            t + ' and ' + n + ' cannot be used together.'
          );
      }
      function sd(t) {
        if (!Zi.Et(t))
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Invalid document reference. Document references must have an even number of segments, but ' +
              t +
              ' has ' +
              t.length +
              '.'
          );
      }
      function ud(t) {
        if (Zi.Et(t))
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Invalid collection reference. Collection references must have an odd number of segments, but ' +
              t +
              ' has ' +
              t.length +
              '.'
          );
      }
      function ad(e) {
        if (void 0 === e) return 'undefined';
        if (null === e) return 'null';
        if ('string' == typeof e)
          return (
            20 < e.length && (e = e.substring(0, 20) + '...'), JSON.stringify(e)
          );
        if ('number' == typeof e || 'boolean' == typeof e) return '' + e;
        if ('object' != typeof e)
          return 'function' == typeof e ? 'a function' : ci();
        if (e instanceof Array) return 'an array';
        var t = (function () {
          if (e.constructor) {
            var t = /function\s+([^\s(]+)\s*\(/.exec(e.constructor.toString());
            if (t && 1 < t.length) return t[1];
          }
          return null;
        })();
        return t ? 'a custom ' + t + ' object' : 'an object';
      }
      function cd(t, e) {
        if (('_delegate' in t && (t = t._), t instanceof e)) return t;
        if (e.name === t.constructor.name)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?'
          );
        t = ad(t);
        throw new wi(
          bi.INVALID_ARGUMENT,
          "Expected type '" + e.name + "', but it was: " + t
        );
      }
      function hd(t, e) {
        if (e <= 0)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Function ' +
              t +
              '() requires a positive number, but it was: ' +
              e +
              '.'
          );
      }
      var fd,
        ld =
          ((Ed.prototype.isEqual = function (t) {
            return (
              this.host === t.host &&
              this.ssl === t.ssl &&
              this.credentials === t.credentials &&
              this.cacheSizeBytes === t.cacheSizeBytes &&
              this.experimentalForceLongPolling ===
                t.experimentalForceLongPolling &&
              this.experimentalAutoDetectLongPolling ===
                t.experimentalAutoDetectLongPolling &&
              this.ignoreUndefinedProperties === t.ignoreUndefinedProperties
            );
          }),
          Ed),
        pd = new Map(),
        dd =
          (Object.defineProperty(Id.prototype, 'app', {
            get: function () {
              if (!this.A_)
                throw new wi(
                  bi.FAILED_PRECONDITION,
                  "Firestore was not initialized using the Firebase SDK. 'app' is not available"
                );
              return this.A_;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Id.prototype, 'R_', {
            get: function () {
              return this.T_;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Id.prototype, 'P_', {
            get: function () {
              return void 0 !== this.y_;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Id.prototype.g_ = function (t) {
            if (this.T_)
              throw new wi(
                bi.FAILED_PRECONDITION,
                'Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.'
              );
            (this.E_ = new ld(t)),
              void 0 !== t.credentials &&
                (this.m_ = (function (t) {
                  if (!t) return new Vi();
                  switch (t.type) {
                    case 'gapi':
                      var e = t.client;
                      return (
                        hi(
                          !(
                            'object' != typeof e ||
                            null === e ||
                            !e.auth ||
                            !e.auth.getAuthHeaderValueForFirstParty
                          )
                        ),
                        new ji(e, t.sessionIndex || '0')
                      );
                    case 'provider':
                      return t.client;
                    default:
                      throw new wi(
                        bi.INVALID_ARGUMENT,
                        'makeCredentialsProvider failed due to invalid credential type'
                      );
                  }
                })(t.credentials));
          }),
          (Id.prototype.V_ = function () {
            return this.E_;
          }),
          (Id.prototype.p_ = function () {
            return (this.T_ = !0), this.E_;
          }),
          (Id.prototype._delete = function () {
            return this.y_ || (this.y_ = this.b_()), this.y_;
          }),
          (Id.prototype.b_ = function () {
            return (
              (t = pd.get(this)) &&
                (oi('ComponentProvider', 'Removing Datastore'),
                pd.delete(this),
                t.terminate()),
              Promise.resolve()
            );
            var t;
          }),
          Id),
        yd =
          (Object.defineProperty(wd.prototype, 'D_', {
            get: function () {
              return this.S_.path;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(wd.prototype, 'id', {
            get: function () {
              return this.S_.path.et();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(wd.prototype, 'path', {
            get: function () {
              return this.S_.path.ot();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(wd.prototype, 'parent', {
            get: function () {
              return new gd(this.firestore, this.v_, this.S_.path.Z());
            },
            enumerable: !1,
            configurable: !0
          }),
          (wd.prototype.withConverter = function (t) {
            return new wd(this.firestore, t, this.S_);
          }),
          wd),
        vd =
          ((bd.prototype.withConverter = function (t) {
            return new bd(this.firestore, t, this.C_);
          }),
          bd),
        gd =
          (t(md, (fd = vd)),
          Object.defineProperty(md.prototype, 'id', {
            get: function () {
              return this.C_.path.et();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(md.prototype, 'path', {
            get: function () {
              return this.C_.path.ot();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(md.prototype, 'parent', {
            get: function () {
              var t = this.D_.Z();
              return t.nt() ? null : new yd(this.firestore, null, new Zi(t));
            },
            enumerable: !1,
            configurable: !0
          }),
          (md.prototype.withConverter = function (t) {
            return new md(this.firestore, t, this.D_);
          }),
          md);
      function md(t, e, n) {
        var r = this;
        return (
          ((r = fd.call(this, t, e, Ds(n)) || this).firestore = t),
          (r.D_ = n),
          (r.type = 'collection'),
          r
        );
      }
      function bd(t, e, n) {
        (this.v_ = e),
          (this.C_ = n),
          (this.type = 'query'),
          (this.firestore = t);
      }
      function wd(t, e, n) {
        (this.v_ = e),
          (this.S_ = n),
          (this.type = 'document'),
          (this.firestore = t);
      }
      function Id(t, e) {
        (this.w_ = '(lite)'),
          (this.E_ = new ld({})),
          (this.T_ = !1),
          t instanceof Oi
            ? ((this.I_ = t), (this.m_ = new Vi()))
            : ((this.A_ = t),
              (this.I_ = (function (t) {
                if (
                  !Object.prototype.hasOwnProperty.apply(t.options, [
                    'projectId'
                  ])
                )
                  throw new wi(
                    bi.INVALID_ARGUMENT,
                    '"projectId" not provided in firebase.initializeApp.'
                  );
                return new Oi(t.options.projectId);
              })(t)),
              (this.m_ = new Mi(e)));
      }
      function Ed(t) {
        var e;
        if (void 0 === t.host) {
          if (void 0 !== t.ssl)
            throw new wi(
              bi.INVALID_ARGUMENT,
              "Can't provide ssl option if host option is not set"
            );
          (this.host = 'firestore.googleapis.com'), (this.ssl = !0);
        } else
          (this.host = t.host),
            (this.ssl = null === (e = t.ssl) || void 0 === e || e);
        if (
          ((this.credentials = t.credentials),
          (this.ignoreUndefinedProperties = !!t.ignoreUndefinedProperties),
          void 0 === t.cacheSizeBytes)
        )
          this.cacheSizeBytes = 41943040;
        else {
          if (-1 !== t.cacheSizeBytes && t.cacheSizeBytes < 1048576)
            throw new wi(
              bi.INVALID_ARGUMENT,
              'cacheSizeBytes must be at least 1048576'
            );
          this.cacheSizeBytes = t.cacheSizeBytes;
        }
        (this.experimentalForceLongPolling = !!t.experimentalForceLongPolling),
          (this.experimentalAutoDetectLongPolling =
            !!t.experimentalAutoDetectLongPolling),
          od(
            'experimentalForceLongPolling',
            t.experimentalForceLongPolling,
            'experimentalAutoDetectLongPolling',
            t.experimentalAutoDetectLongPolling
          );
      }
      function _d(t, e) {
        for (var n, r = [], i = 2; i < arguments.length; i++)
          r[i - 2] = arguments[i];
        if (
          (t instanceof Ei && (t = t._),
          rd('collection', 'path', e),
          t instanceof dd)
        )
          return ud((n = Yi.ct.apply(Yi, s([e], r)))), new gd(t, null, n);
        if (!(t instanceof yd || t instanceof gd))
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore'
          );
        return (
          ud((n = Yi.ct.apply(Yi, s([t.path], r)).child(Yi.ct(e)))),
          new gd(t.firestore, null, n)
        );
      }
      function Td(t, e) {
        for (var n, r = [], i = 2; i < arguments.length; i++)
          r[i - 2] = arguments[i];
        if (
          (t instanceof Ei && (t = t._),
          1 === arguments.length && (e = fi.t()),
          rd('doc', 'path', e),
          t instanceof dd)
        )
          return (
            sd((n = Yi.ct.apply(Yi, s([e], r)))), new yd(t, null, new Zi(n))
          );
        if (!(t instanceof yd || t instanceof gd))
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore'
          );
        return (
          sd((n = t.D_.child(Yi.ct.apply(Yi, s([e], r))))),
          new yd(t.firestore, t instanceof gd ? t.v_ : null, new Zi(n))
        );
      }
      function Nd(t, e) {
        return (
          t instanceof Ei && (t = t._),
          e instanceof Ei && (e = e._),
          (t instanceof yd || t instanceof gd) &&
            (e instanceof yd || e instanceof gd) &&
            t.firestore === e.firestore &&
            t.path === e.path &&
            t.v_ === e.v_
        );
      }
      function Ad(t, e) {
        return (
          t instanceof Ei && (t = t._),
          e instanceof Ei && (e = e._),
          t instanceof vd &&
            e instanceof vd &&
            t.firestore === e.firestore &&
            Us(t.C_, e.C_) &&
            t.v_ === e.v_
        );
      }
      var Sd =
          (Object.defineProperty(Pd.prototype, 'latitude', {
            get: function () {
              return this.x_;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Pd.prototype, 'longitude', {
            get: function () {
              return this.N_;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Pd.prototype.isEqual = function (t) {
            return this.x_ === t.x_ && this.N_ === t.N_;
          }),
          (Pd.prototype.toJSON = function () {
            return { latitude: this.x_, longitude: this.N_ };
          }),
          (Pd.prototype.K = function (t) {
            return pi(this.x_, t.x_) || pi(this.N_, t.N_);
          }),
          Pd),
        xd = /^__.*__$/,
        Dd =
          ((Cd.prototype.F_ = function (t, e) {
            return null !== this.zt
              ? new Eu(t, this.data, this.zt, e, this.fieldTransforms)
              : new Iu(t, this.data, e, this.fieldTransforms);
          }),
          Cd),
        Od =
          ((kd.prototype.F_ = function (t, e) {
            return new Eu(t, this.data, this.zt, e, this.fieldTransforms);
          }),
          kd);
      function kd(t, e, n) {
        (this.data = t), (this.zt = e), (this.fieldTransforms = n);
      }
      function Cd(t, e, n) {
        (this.data = t), (this.zt = e), (this.fieldTransforms = n);
      }
      function Pd(t, e) {
        if (!isFinite(t) || t < -90 || 90 < t)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Latitude must be a number between -90 and 90, but was: ' + t
          );
        if (!isFinite(e) || e < -180 || 180 < e)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Longitude must be a number between -180 and 180, but was: ' + e
          );
        (this.x_ = t), (this.N_ = e);
      }
      function Ld(t) {
        switch (t) {
          case 0:
          case 2:
          case 1:
            return 1;
          case 3:
          case 4:
            return;
          default:
            throw ci();
        }
      }
      var Rd =
          (Object.defineProperty(Ud.prototype, 'path', {
            get: function () {
              return this.settings.path;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Ud.prototype, 'k_', {
            get: function () {
              return this.settings.k_;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Ud.prototype.M_ = function (t) {
            return new Ud(
              Object.assign(Object.assign({}, this.settings), t),
              this.T,
              this.Kt,
              this.ignoreUndefinedProperties,
              this.fieldTransforms,
              this.zt
            );
          }),
          (Ud.prototype.L_ = function (t) {
            var e =
                null === (e = this.path) || void 0 === e ? void 0 : e.child(t),
              e = this.M_({ path: e, B_: !1 });
            return e.q_(t), e;
          }),
          (Ud.prototype.U_ = function (t) {
            var e,
              t =
                null === (e = this.path) || void 0 === e ? void 0 : e.child(t),
              t = this.M_({ path: t, B_: !1 });
            return t.O_(), t;
          }),
          (Ud.prototype.Q_ = function (t) {
            return this.M_({ path: void 0, B_: !0 });
          }),
          (Ud.prototype.K_ = function (t) {
            return py(
              t,
              this.settings.methodName,
              this.settings.W_ || !1,
              this.path,
              this.settings.j_
            );
          }),
          (Ud.prototype.contains = function (e) {
            return (
              void 0 !==
                this.zt.find(function (t) {
                  return e.st(t);
                }) ||
              void 0 !==
                this.fieldTransforms.find(function (t) {
                  return e.st(t.field);
                })
            );
          }),
          (Ud.prototype.O_ = function () {
            if (this.path)
              for (var t = 0; t < this.path.length; t++)
                this.q_(this.path.get(t));
          }),
          (Ud.prototype.q_ = function (t) {
            if (0 === t.length)
              throw this.K_('Document fields must not be empty');
            if (Ld(this.k_) && xd.test(t))
              throw this.K_('Document fields cannot begin and end with "__"');
          }),
          Ud),
        Vd =
          ((Md.prototype.G_ = function (t, e, n, r) {
            return (
              void 0 === r && (r = !1),
              new Rd(
                { k_: t, methodName: e, j_: n, path: Qi.at(), B_: !1, W_: r },
                this.T,
                this.Kt,
                this.ignoreUndefinedProperties
              )
            );
          }),
          Md);
      function Md(t, e, n) {
        (this.T = t),
          (this.ignoreUndefinedProperties = e),
          (this.Kt = n || Al(t));
      }
      function Ud(t, e, n, r, i, o) {
        (this.settings = t),
          (this.T = e),
          (this.Kt = n),
          (this.ignoreUndefinedProperties = r),
          void 0 === i && this.O_(),
          (this.fieldTransforms = i || []),
          (this.zt = o || []);
      }
      function jd(t) {
        var e = t.p_(),
          n = Al(t.I_);
        return new Vd(t.I_, !!e.ignoreUndefinedProperties, n);
      }
      function Fd(t, e, n, r, i, o) {
        void 0 === o && (o = {});
        var s = t.G_(o.merge || o.mergeFields ? 2 : 0, e, n, i);
        cy('Data must be an object, but it was:', s, r);
        var u,
          a,
          r = uy(r, s);
        if (o.merge) (u = new co(s.zt)), (a = s.fieldTransforms);
        else if (o.mergeFields) {
          for (var c = [], h = 0, f = o.mergeFields; h < f.length; h++) {
            var l = hy(e, f[h], n);
            if (!s.contains(l))
              throw new wi(
                bi.INVALID_ARGUMENT,
                "Field '" +
                  l +
                  "' is specified in your field mask but missing from your input data."
              );
            dy(c, l) || c.push(l);
          }
          (u = new co(c)),
            (a = s.fieldTransforms.filter(function (t) {
              return u.It(t.field);
            }));
        } else (u = null), (a = s.fieldTransforms);
        return new Dd(new Po(r), u, a);
      }
      var qd,
        zd =
          (t(Hd, (qd = td)),
          (Hd.prototype.z_ = function (t) {
            if (2 !== t.k_)
              throw 1 === t.k_
                ? t.K_(
                    this._methodName +
                      '() can only appear at the top level of your update data'
                  )
                : t.K_(
                    this._methodName +
                      '() cannot be used with set() unless you pass {merge:true}'
                  );
            return t.zt.push(t.path), null;
          }),
          (Hd.prototype.isEqual = function (t) {
            return t instanceof Hd;
          }),
          Hd);
      function Hd() {
        return (null !== qd && qd.apply(this, arguments)) || this;
      }
      function Bd(t, e, n) {
        return new Rd(
          { k_: 3, j_: e.settings.j_, methodName: t._methodName, B_: n },
          e.T,
          e.Kt,
          e.ignoreUndefinedProperties
        );
      }
      var Gd,
        Kd,
        Jd,
        Wd,
        Xd =
          (t(ny, (Wd = td)),
          (ny.prototype.z_ = function (t) {
            return new lu(t.path, new $s());
          }),
          (ny.prototype.isEqual = function (t) {
            return t instanceof ny;
          }),
          ny),
        Yd =
          (t(ey, (Jd = td)),
          (ey.prototype.z_ = function (t) {
            var e = Bd(this, t, !0),
              n = this.H_.map(function (t) {
                return sy(t, e);
              }),
              n = new Qs(n);
            return new lu(t.path, n);
          }),
          (ey.prototype.isEqual = function (t) {
            return this === t;
          }),
          ey),
        $d =
          (t(ty, (Kd = td)),
          (ty.prototype.z_ = function (t) {
            var e = Bd(this, t, !0),
              n = this.H_.map(function (t) {
                return sy(t, e);
              }),
              n = new ru(n);
            return new lu(t.path, n);
          }),
          (ty.prototype.isEqual = function (t) {
            return this === t;
          }),
          ty),
        Qd =
          (t(Zd, (Gd = td)),
          (Zd.prototype.z_ = function (t) {
            var e = new uu(t.Kt, Js(t.Kt, this.J_));
            return new lu(t.path, e);
          }),
          (Zd.prototype.isEqual = function (t) {
            return this === t;
          }),
          Zd);
      function Zd(t, e) {
        var n = this;
        return ((n = Gd.call(this, t) || this).J_ = e), n;
      }
      function ty(t, e) {
        var n = this;
        return ((n = Kd.call(this, t) || this).H_ = e), n;
      }
      function ey(t, e) {
        var n = this;
        return ((n = Jd.call(this, t) || this).H_ = e), n;
      }
      function ny() {
        return (null !== Wd && Wd.apply(this, arguments)) || this;
      }
      function ry(t, r, i, e) {
        var o = t.G_(1, r, i);
        cy('Data must be an object, but it was:', o, e);
        var s = [],
          u = new Lo();
        uo(e, function (t, e) {
          var n = ly(r, t, i);
          e instanceof Ei && (e = e._);
          t = o.U_(n);
          e instanceof zd
            ? s.push(n)
            : null != (t = sy(e, t)) && (s.push(n), u.set(n, t));
        });
        e = new co(s);
        return new Od(u.yt(), e, o.fieldTransforms);
      }
      function iy(t, e, n, r, i, o) {
        var s = t.G_(1, e, n),
          u = [hy(e, r, n)],
          a = [i];
        if (o.length % 2 != 0)
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Function ' +
              e +
              '() needs to be called with an even number of arguments that alternate between field names and values.'
          );
        for (var c = 0; c < o.length; c += 2)
          u.push(hy(e, o[c])), a.push(o[c + 1]);
        for (var h, f, l, p = [], d = new Lo(), y = u.length - 1; 0 <= y; --y) {
          dy(p, u[y]) ||
            ((h = u[y]),
            (f = a[y]) instanceof Ei && (f = f._),
            (l = s.U_(h)),
            f instanceof zd
              ? p.push(h)
              : null != (l = sy(f, l)) && (p.push(h), d.set(h, l)));
        }
        i = new co(p);
        return new Od(d.yt(), i, s.fieldTransforms);
      }
      function oy(t, e, n, r) {
        return void 0 === r && (r = !1), sy(n, t.G_(r ? 4 : 3, e));
      }
      function sy(s, t) {
        if ((s instanceof Ei && (s = s._), ay(s)))
          return cy('Unsupported field value:', t, s), uy(s, t);
        if (s instanceof td)
          return (
            (function (t, e) {
              if (!Ld(e.k_))
                throw e.K_(
                  t._methodName + '() can only be used with update() and set()'
                );
              if (!e.path)
                throw e.K_(
                  t._methodName + '() is not currently supported inside arrays'
                );
              t = t.z_(e);
              t && e.fieldTransforms.push(t);
            })(s, t),
            null
          );
        if ((t.path && t.zt.push(t.path), s instanceof Array)) {
          if (t.settings.B_ && 4 !== t.k_)
            throw t.K_('Nested arrays are not supported');
          return (function (t) {
            for (var e = [], n = 0, r = 0, i = s; r < i.length; r++) {
              var o = sy(i[r], t.Q_(n));
              null == o && (o = { nullValue: 'NULL_VALUE' }), e.push(o), n++;
            }
            return { arrayValue: { values: e } };
          })(t);
        }
        return (function (t, e) {
          if ((t instanceof Ei && (t = t._), null === t))
            return { nullValue: 'NULL_VALUE' };
          if ('number' == typeof t) return Js(e.Kt, t);
          if ('boolean' == typeof t) return { booleanValue: t };
          if ('string' == typeof t) return { stringValue: t };
          if (t instanceof Date) {
            var n = Wi.fromDate(t);
            return { timestampValue: Ta(e.Kt, n) };
          }
          if (t instanceof Wi)
            return (
              (n = new Wi(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3))),
              { timestampValue: Ta(e.Kt, n) }
            );
          if (t instanceof Sd)
            return {
              geoPointValue: { latitude: t.latitude, longitude: t.longitude }
            };
          if (t instanceof Ii) return { bytesValue: Na(e.Kt, t.l) };
          if (t instanceof yd) {
            n = e.T;
            var r = t.firestore.I_;
            if (!r.isEqual(n))
              throw e.K_(
                'Document reference is for database ' +
                  r.projectId +
                  '/' +
                  r.database +
                  ' but should be for database ' +
                  n.projectId +
                  '/' +
                  n.database
              );
            return { referenceValue: Sa(t.firestore.I_ || e.T, t.S_.path) };
          }
          if (void 0 === t && e.ignoreUndefinedProperties) return null;
          throw e.K_('Unsupported field value: ' + ad(t));
        })(s, t);
      }
      function uy(t, n) {
        var r = {};
        return (
          ao(t)
            ? n.path && 0 < n.path.length && n.zt.push(n.path)
            : uo(t, function (t, e) {
                e = sy(e, n.L_(t));
                null != e && (r[t] = e);
              }),
          { mapValue: { fields: r } }
        );
      }
      function ay(t) {
        return !(
          'object' != typeof t ||
          null === t ||
          t instanceof Array ||
          t instanceof Date ||
          t instanceof Wi ||
          t instanceof Sd ||
          t instanceof Ii ||
          t instanceof yd ||
          t instanceof td
        );
      }
      function cy(t, e, n) {
        if (
          !ay(n) ||
          'object' != typeof (r = n) ||
          null === r ||
          (Object.getPrototypeOf(r) !== Object.prototype &&
            null !== Object.getPrototypeOf(r))
        ) {
          n = ad(n);
          throw 'an object' === n
            ? e.K_(t + ' a custom object')
            : e.K_(t + ' ' + n);
        }
        var r;
      }
      function hy(t, e, n) {
        if ((e instanceof Ei && (e = e._), e instanceof Zp)) return e.d_;
        if ('string' == typeof e) return ly(t, e);
        throw py(
          'Field path arguments must be of type string or FieldPath.',
          t,
          !1,
          void 0,
          n
        );
      }
      var fy = new RegExp('[~\\*/\\[\\]]');
      function ly(e, n, r) {
        if (0 <= n.search(fy))
          throw py(
            'Invalid field path (' +
              n +
              "). Paths must not contain '~', '*', '/', '[', or ']'",
            e,
            !1,
            void 0,
            r
          );
        try {
          return new (Zp.bind.apply(Zp, s([void 0], n.split('.'))))().d_;
        } catch (t) {
          throw py(
            'Invalid field path (' +
              n +
              "). Paths must not be empty, begin with '.', end with '.', or contain '..'",
            e,
            !1,
            void 0,
            r
          );
        }
      }
      function py(t, e, n, r, i) {
        var o = r && !r.nt(),
          s = void 0 !== i,
          e = 'Function ' + e + '() called with invalid data';
        n && (e += ' (via `toFirestore()`)');
        n = '';
        return (
          (o || s) &&
            ((n += ' (found'),
            o && (n += ' in field ' + r),
            s && (n += ' in document ' + i),
            (n += ')')),
          new wi(bi.INVALID_ARGUMENT, (e += '. ') + t + n)
        );
      }
      function dy(t, e) {
        return t.some(function (t) {
          return t.isEqual(e);
        });
      }
      var yy =
          ((wy.prototype.ef = function (r) {
            return y(this, void 0, void 0, function () {
              var e,
                n = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    if ((this.nf(), 0 < this.mutations.length))
                      throw new wi(
                        bi.INVALID_ARGUMENT,
                        'Firestore transactions require all reads to be executed before all writes.'
                      );
                    return [
                      4,
                      (function (s, u) {
                        return y(this, void 0, void 0, function () {
                          var n, e, r, i, o;
                          return v(this, function (t) {
                            switch (t.label) {
                              case 0:
                                return (
                                  (e = Pa((n = s).Kt) + '/documents'),
                                  (r = {
                                    documents: u.map(function (t) {
                                      return Da(n.Kt, t);
                                    })
                                  }),
                                  [4, n.Cu('BatchGetDocuments', e, r)]
                                );
                              case 1:
                                return (
                                  (r = t.sent()),
                                  (i = new Map()),
                                  r.forEach(function (t) {
                                    var e,
                                      t =
                                        ((e = n.Kt),
                                        'found' in (t = t)
                                          ? (function (t, e) {
                                              hi(!!e.found),
                                                e.found.name,
                                                e.found.updateTime;
                                              var n = Oa(t, e.found.name),
                                                t = Aa(e.found.updateTime),
                                                e = new Po({
                                                  mapValue: {
                                                    fields: e.found.fields
                                                  }
                                                });
                                              return new Fo(n, t, e, {});
                                            })(e, t)
                                          : 'missing' in t
                                          ? (function (t, e) {
                                              hi(!!e.missing), hi(!!e.readTime);
                                              (t = Oa(t, e.missing)),
                                                (e = Aa(e.readTime));
                                              return new qo(t, e);
                                            })(e, t)
                                          : ci());
                                    i.set(t.key.toString(), t);
                                  }),
                                  (o = []),
                                  [
                                    2,
                                    (u.forEach(function (t) {
                                      t = i.get(t.toString());
                                      hi(!!t), o.push(t);
                                    }),
                                    o)
                                  ]
                                );
                            }
                          });
                        });
                      })(this.Dh, r)
                    ];
                  case 1:
                    return [
                      2,
                      ((e = t.sent()).forEach(function (t) {
                        t instanceof qo || t instanceof Fo ? n.sf(t) : ci();
                      }),
                      e)
                    ];
                }
              });
            });
          }),
          (wy.prototype.set = function (t, e) {
            this.write(e.F_(t, this.Gt(t))), this.tf.add(t.toString());
          }),
          (wy.prototype.update = function (t, e) {
            try {
              this.write(e.F_(t, this.rf(t)));
            } catch (t) {
              this.Z_ = t;
            }
            this.tf.add(t.toString());
          }),
          (wy.prototype.delete = function (t) {
            this.write(new Pu(t, this.Gt(t))), this.tf.add(t.toString());
          }),
          (wy.prototype.commit = function () {
            return y(this, void 0, void 0, function () {
              var e,
                n = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    if ((this.nf(), this.Z_)) throw this.Z_;
                    return (
                      (e = this.Y_),
                      this.mutations.forEach(function (t) {
                        e.delete(t.key.toString());
                      }),
                      e.forEach(function (t, e) {
                        e = Zi.ft(e);
                        n.mutations.push(new Lu(e, n.Gt(e)));
                      }),
                      [
                        4,
                        (function (i, o) {
                          return y(this, void 0, void 0, function () {
                            var e, n, r;
                            return v(this, function (t) {
                              switch (t.label) {
                                case 0:
                                  return (
                                    (n = Pa((e = i).Kt) + '/documents'),
                                    (r = {
                                      writes: o.map(function (t) {
                                        return Va(e.Kt, t);
                                      })
                                    }),
                                    [4, e.bu('Commit', n, r)]
                                  );
                                case 1:
                                  return t.sent(), [2];
                              }
                            });
                          });
                        })(this.Dh, this.mutations)
                      ]
                    );
                  case 1:
                    return t.sent(), (this.X_ = !0), [2];
                }
              });
            });
          }),
          (wy.prototype.sf = function (t) {
            var e;
            if (t instanceof Fo) e = t.version;
            else {
              if (!(t instanceof qo)) throw ci();
              e = Xi.min();
            }
            var n = this.Y_.get(t.key.toString());
            if (n) {
              if (!e.isEqual(n))
                throw new wi(
                  bi.ABORTED,
                  'Document version changed between two reads.'
                );
            } else this.Y_.set(t.key.toString(), e);
          }),
          (wy.prototype.Gt = function (t) {
            var e = this.Y_.get(t.toString());
            return !this.tf.has(t.toString()) && e ? pu.updateTime(e) : pu.Wt();
          }),
          (wy.prototype.rf = function (t) {
            var e = this.Y_.get(t.toString());
            if (this.tf.has(t.toString()) || !e) return pu.exists(!0);
            if (e.isEqual(Xi.min()))
              throw new wi(
                bi.INVALID_ARGUMENT,
                "Can't update a document that doesn't exist."
              );
            return pu.updateTime(e);
          }),
          (wy.prototype.write = function (t) {
            this.nf(), this.mutations.push(t);
          }),
          (wy.prototype.nf = function () {}),
          wy),
        vy =
          ((by.prototype.run = function () {
            this.af();
          }),
          (by.prototype.af = function () {
            var t = this;
            this.zu.Bu(function () {
              return y(t, void 0, void 0, function () {
                var e,
                  n,
                  r = this;
                return v(this, function (t) {
                  return (
                    (e = new yy(this.Dh)),
                    (n = this.uf(e)) &&
                      n
                        .then(function (t) {
                          r.fs.ys(function () {
                            return e
                              .commit()
                              .then(function () {
                                r.Ts.resolve(t);
                              })
                              .catch(function (t) {
                                r.hf(t);
                              });
                          });
                        })
                        .catch(function (t) {
                          r.hf(t);
                        }),
                    [2]
                  );
                });
              });
            });
          }),
          (by.prototype.uf = function (t) {
            try {
              var e = this.updateFunction(t);
              return !mo(e) && e.catch && e.then
                ? e
                : (this.Ts.reject(
                    Error('Transaction callback must return a Promise')
                  ),
                  null);
            } catch (t) {
              return this.Ts.reject(t), null;
            }
          }),
          (by.prototype.hf = function (t) {
            var e = this;
            0 < this.cf && this.lf(t)
              ? (--this.cf,
                this.fs.ys(function () {
                  return e.af(), Promise.resolve();
                }))
              : this.Ts.reject(t);
          }),
          (by.prototype.lf = function (t) {
            if ('FirebaseError' !== t.name) return !1;
            t = t.code;
            return 'aborted' === t || 'failed-precondition' === t || !Mu(t);
          }),
          by),
        gy =
          ((my.prototype.getConfiguration = function () {
            return y(this, void 0, void 0, function () {
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return [4, this.N.promise];
                  case 1:
                    return [
                      2,
                      (t.sent(),
                      {
                        fs: this.fs,
                        gu: this.gu,
                        clientId: this.clientId,
                        credentials: this.credentials,
                        Yl: this.user,
                        bl: 100
                      })
                    ];
                }
              });
            });
          }),
          (my.prototype.ff = function (t) {
            var e = this;
            (this._f = t),
              this.N.promise.then(function () {
                return e._f(e.user);
              });
          }),
          (my.prototype.df = function () {
            if (this.fs.wf)
              throw new wi(
                bi.FAILED_PRECONDITION,
                'The client has already been terminated.'
              );
          }),
          (my.prototype.terminate = function () {
            var t = this;
            this.fs.Ef();
            var n = new Wa();
            return (
              this.fs.Tf(function () {
                return y(t, void 0, void 0, function () {
                  var e;
                  return v(this, function (t) {
                    switch (t.label) {
                      case 0:
                        return (
                          t.trys.push([0, 5, , 6]),
                          this.If ? [4, this.If.terminate()] : [3, 2]
                        );
                      case 1:
                        t.sent(), (t.label = 2);
                      case 2:
                        return this.mf ? [4, this.mf.terminate()] : [3, 4];
                      case 3:
                        t.sent(), (t.label = 4);
                      case 4:
                        return this.credentials.D(), n.resolve(), [3, 6];
                      case 5:
                        return (
                          (e = t.sent()),
                          (e = pc(e, 'Failed to shutdown persistence')),
                          n.reject(e),
                          [3, 6]
                        );
                      case 6:
                        return [2];
                    }
                  });
                });
              }),
              n.promise
            );
          }),
          my);
      function my(t, e, n) {
        var r = this;
        (this.credentials = t),
          (this.fs = e),
          (this.gu = n),
          (this.user = ki.UNAUTHENTICATED),
          (this.clientId = fi.t()),
          (this._f = function () {}),
          (this.N = new Wa()),
          this.credentials.S(function (t) {
            oi('FirestoreClient', 'Received user=', t.uid),
              (r.user = t),
              r._f(t),
              r.N.resolve();
          });
      }
      function by(t, e, n, r) {
        (this.fs = t),
          (this.Dh = e),
          (this.updateFunction = n),
          (this.Ts = r),
          (this.cf = 5),
          (this.zu = new kl(this.fs, 'transaction_retry'));
      }
      function wy(t) {
        (this.Dh = t),
          (this.Y_ = new Map()),
          (this.mutations = []),
          (this.X_ = !1),
          (this.Z_ = null),
          (this.tf = new Set());
      }
      function Iy(i, o) {
        return y(this, void 0, void 0, function () {
          var e,
            n,
            r = this;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  i.fs.Af(),
                  oi(
                    'FirestoreClient',
                    'Initializing OfflineComponentProvider'
                  ),
                  [4, i.getConfiguration()]
                );
              case 1:
                return (e = t.sent()), [4, o.initialize(e)];
              case 2:
                return (
                  t.sent(),
                  (n = e.Yl),
                  i.ff(function (e) {
                    n.isEqual(e) ||
                      ((n = e),
                      i.fs.vo(function () {
                        return y(r, void 0, void 0, function () {
                          return v(this, function (t) {
                            switch (t.label) {
                              case 0:
                                return [4, mf(o.Sh, e)];
                              case 1:
                                return t.sent(), [2];
                            }
                          });
                        });
                      }));
                  }),
                  o.persistence.Vo(function () {
                    return i.terminate();
                  }),
                  (i.mf = o),
                  [2]
                );
            }
          });
        });
      }
      function Ey(r, i) {
        return y(this, void 0, void 0, function () {
          var e, n;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return r.fs.Af(), [4, _y(r)];
              case 1:
                return (
                  (e = t.sent()),
                  oi('FirestoreClient', 'Initializing OnlineComponentProvider'),
                  [4, r.getConfiguration()]
                );
              case 2:
                return (n = t.sent()), [4, i.initialize(e, n)];
              case 3:
                return (
                  t.sent(),
                  r.ff(function (t) {
                    return r.fs.vo(function () {
                      return (function (r, i) {
                        return y(this, void 0, void 0, function () {
                          var e, n;
                          return v(this, function (t) {
                            switch (t.label) {
                              case 0:
                                return (
                                  (e = r).fs.Af(),
                                  oi(
                                    'RemoteStore',
                                    'RemoteStore received new credentials'
                                  ),
                                  (n = Yl(e)),
                                  e.Fh.add(3),
                                  [4, Hl(e)]
                                );
                              case 1:
                                return (
                                  t.sent(),
                                  n && e.Mh.set('Unknown'),
                                  [4, e.Ch.s_(i)]
                                );
                              case 2:
                                return t.sent(), e.Fh.delete(3), [4, zl(e)];
                              case 3:
                                return t.sent(), [2];
                            }
                          });
                        });
                      })(i.gl, t);
                    });
                  }),
                  (r.If = i),
                  [2]
                );
            }
          });
        });
      }
      function _y(e) {
        return y(this, void 0, void 0, function () {
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return e.mf
                  ? [3, 2]
                  : (oi(
                      'FirestoreClient',
                      'Using default OfflineComponentProvider'
                    ),
                    [4, Iy(e, new Bp())]);
              case 1:
                t.sent(), (t.label = 2);
              case 2:
                return [2, e.mf];
            }
          });
        });
      }
      function Ty(e) {
        return y(this, void 0, void 0, function () {
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return e.If
                  ? [3, 2]
                  : (oi(
                      'FirestoreClient',
                      'Using default OnlineComponentProvider'
                    ),
                    [4, Ey(e, new Jp())]);
              case 1:
                t.sent(), (t.label = 2);
              case 2:
                return [2, e.If];
            }
          });
        });
      }
      function Ny(t) {
        return _y(t).then(function (t) {
          return t.persistence;
        });
      }
      function Ay(t) {
        return _y(t).then(function (t) {
          return t.Sh;
        });
      }
      function Sy(t) {
        return Ty(t).then(function (t) {
          return t.gl;
        });
      }
      function xy(t) {
        return Ty(t).then(function (t) {
          return t.fa;
        });
      }
      function Dy(r) {
        return y(this, void 0, void 0, function () {
          var e, n;
          return v(this, function (t) {
            switch (t.label) {
              case 0:
                return [4, Ty(r)];
              case 1:
                return (
                  (e = t.sent()),
                  [
                    2,
                    (((n = e.Vl).Gh = function (s, u) {
                      return y(this, void 0, void 0, function () {
                        var e, n, r, i, o;
                        return v(this, function (t) {
                          switch (t.label) {
                            case 0:
                              return (
                                (e = Fp(s)),
                                (o = e.Sl.get(u))
                                  ? ((n = o.targetId),
                                    e.pl.ka(n),
                                    (r = o.view.Pl()),
                                    [3, 4])
                                  : [3, 1]
                              );
                            case 1:
                              return [4, Ef(e.Sh, Vs(u))];
                            case 2:
                              return (
                                (i = t.sent()),
                                (o = e.pl.ka(i.targetId)),
                                (n = i.targetId),
                                [4, Ep(e, u, n, 'current' === o)]
                              );
                            case 3:
                              (r = t.sent()),
                                e.$l && Bl(e.gl, i),
                                (t.label = 4);
                            case 4:
                              return [2, r];
                          }
                        });
                      });
                    }.bind(null, e.fa)),
                    (n.Jh = function (i, o) {
                      return y(this, void 0, void 0, function () {
                        var e, n, r;
                        return v(this, function (t) {
                          switch (t.label) {
                            case 0:
                              return (
                                (n = (e = i).Sl.get(o)),
                                1 < (r = e.Dl.get(n.targetId)).length
                                  ? [
                                      2,
                                      (e.Dl.set(
                                        n.targetId,
                                        r.filter(function (t) {
                                          return !Us(t, o);
                                        })
                                      ),
                                      void e.Sl.delete(o))
                                    ]
                                  : e.$l
                                  ? (e.pl.La(n.targetId),
                                    e.pl.Ca(n.targetId)
                                      ? [3, 2]
                                      : [
                                          4,
                                          _f(e.Sh, n.targetId, !1)
                                            .then(function () {
                                              e.pl.Ba(n.targetId),
                                                Gl(e.gl, n.targetId),
                                                Op(e, n.targetId);
                                            })
                                            .catch(vh)
                                        ])
                                  : [3, 3]
                              );
                            case 1:
                              t.sent(), (t.label = 2);
                            case 2:
                              return [3, 5];
                            case 3:
                              return (
                                Op(e, n.targetId), [4, _f(e.Sh, n.targetId, !0)]
                              );
                            case 4:
                              t.sent(), (t.label = 5);
                            case 5:
                              return [2];
                          }
                        });
                      });
                    }.bind(null, e.fa)),
                    n)
                  ]
                );
            }
          });
        });
      }
      function Oy(n, r, i) {
        var t = this;
        void 0 === i && (i = {});
        var o = new Wa();
        return (
          n.fs.ys(function () {
            return y(t, void 0, void 0, function () {
              var e;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      (e = function (n, r, i, o, s) {
                        var t = new Qp({
                            next: function (t) {
                              r.ys(function () {
                                return hp(n, u);
                              });
                              var e = t.docs.has(i);
                              !e && t.fromCache
                                ? s.reject(
                                    new wi(
                                      bi.UNAVAILABLE,
                                      'Failed to get document because the client is offline.'
                                    )
                                  )
                                : e && t.fromCache && o && 'server' === o.source
                                ? s.reject(
                                    new wi(
                                      bi.UNAVAILABLE,
                                      'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)'
                                    )
                                  )
                                : s.resolve(t);
                            },
                            error: function (t) {
                              return s.reject(t);
                            }
                          }),
                          u = new lp(Ds(i.path), t, {
                            includeMetadataChanges: !0,
                            sl: !0
                          });
                        return cp(n, u);
                      }),
                      [4, Dy(n)]
                    );
                  case 1:
                    return [2, e.apply(void 0, [t.sent(), n.fs, r, i, o])];
                }
              });
            });
          }),
          o.promise
        );
      }
      function ky(n, r, i) {
        var t = this;
        void 0 === i && (i = {});
        var o = new Wa();
        return (
          n.fs.ys(function () {
            return y(t, void 0, void 0, function () {
              var e;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return (
                      (e = function (e, n, t, r, i) {
                        var o = new Qp({
                            next: function (t) {
                              n.ys(function () {
                                return hp(e, s);
                              }),
                                t.fromCache && 'server' === r.source
                                  ? i.reject(
                                      new wi(
                                        bi.UNAVAILABLE,
                                        'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)'
                                      )
                                    )
                                  : i.resolve(t);
                            },
                            error: function (t) {
                              return i.reject(t);
                            }
                          }),
                          s = new lp(t, o, {
                            includeMetadataChanges: !0,
                            sl: !0
                          });
                        return cp(e, s);
                      }),
                      [4, Dy(n)]
                    );
                  case 1:
                    return [2, e.apply(void 0, [t.sent(), n.fs, r, i, o])];
                }
              });
            });
          }),
          o.promise
        );
      }
      var Cy,
        Py =
          (Object.defineProperty(Vy.prototype, 'wf', {
            get: function () {
              return this.yf;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Vy.prototype.ys = function (t) {
            this.enqueue(t);
          }),
          (Vy.prototype.Tf = function (t) {
            this.Sf(), this.Df(t);
          }),
          (Vy.prototype.Ef = function () {
            var t;
            this.yf ||
              ((this.yf = !0),
              (t = Nl()) &&
                'function' == typeof t.removeEventListener &&
                t.removeEventListener('visibilitychange', this.vf));
          }),
          (Vy.prototype.enqueue = function (t) {
            return (
              this.Sf(), this.yf ? new Promise(function (t) {}) : this.Df(t)
            );
          }),
          (Vy.prototype.vo = function (t) {
            var e = this;
            this.ys(function () {
              return e.Pf.push(t), e.Cf();
            });
          }),
          (Vy.prototype.Cf = function () {
            return y(this, void 0, void 0, function () {
              var e,
                n = this;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    if (0 === this.Pf.length) return [3, 5];
                    t.label = 1;
                  case 1:
                    return t.trys.push([1, 3, , 4]), [4, this.Pf[0]()];
                  case 2:
                    return t.sent(), this.Pf.shift(), this.zu.reset(), [3, 4];
                  case 3:
                    if (!oc((e = t.sent()))) throw e;
                    return (
                      oi(
                        'AsyncQueue',
                        'Operation failed with retryable error: ' + e
                      ),
                      [3, 4]
                    );
                  case 4:
                    0 < this.Pf.length &&
                      this.zu.Bu(function () {
                        return n.Cf();
                      }),
                      (t.label = 5);
                  case 5:
                    return [2];
                }
              });
            });
          }),
          (Vy.prototype.Df = function (t) {
            var r = this,
              e = this.Rf.then(function () {
                return (
                  (r.pf = !0),
                  t()
                    .catch(function (t) {
                      throw (
                        ((r.Vf = t),
                        (r.pf = !1),
                        si(
                          'INTERNAL UNHANDLED ERROR: ',
                          ((n = (e = t).message || ''),
                          e.stack &&
                            (n = e.stack.includes(e.message)
                              ? e.stack
                              : e.message + '\n' + e.stack),
                          n)
                        ),
                        t)
                      );
                      var e, n;
                    })
                    .then(function (t) {
                      return (r.pf = !1), t;
                    })
                );
              });
            return (this.Rf = e);
          }),
          (Vy.prototype.mr = function (t, e, n) {
            var r = this;
            this.Sf(), -1 < this.bf.indexOf(t) && (e = 0);
            n = fc.Is(this, t, e, n, function (t) {
              return r.xf(t);
            });
            return this.gf.push(n), n;
          }),
          (Vy.prototype.Sf = function () {
            this.Vf && ci();
          }),
          (Vy.prototype.Af = function () {}),
          (Vy.prototype.Nf = function () {
            return y(this, void 0, void 0, function () {
              var e;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return [4, (e = this.Rf)];
                  case 1:
                    t.sent(), (t.label = 2);
                  case 2:
                    if (e !== this.Rf) return [3, 0];
                    t.label = 3;
                  case 3:
                    return [2];
                }
              });
            });
          }),
          (Vy.prototype.Ff = function (t) {
            for (var e = 0, n = this.gf; e < n.length; e++)
              if (n[e].ds === t) return !0;
            return !1;
          }),
          (Vy.prototype.Of = function (r) {
            var i = this;
            return this.Nf().then(function () {
              i.gf.sort(function (t, e) {
                return t.ws - e.ws;
              });
              for (var t = 0, e = i.gf; t < e.length; t++) {
                var n = e[t];
                if ((n.Ps(), 'all' !== r && n.ds === r)) break;
              }
              return i.Nf();
            });
          }),
          (Vy.prototype.kf = function (t) {
            this.bf.push(t);
          }),
          (Vy.prototype.xf = function (t) {
            t = this.gf.indexOf(t);
            this.gf.splice(t, 1);
          }),
          Vy),
        Ly =
          (t(Ry, (Cy = dd)),
          (Ry.prototype.b_ = function () {
            return this.Lf || Uy(this), this.Lf.terminate();
          }),
          Ry);
      function Ry(t, e) {
        var n = this;
        return (
          ((n = Cy.call(this, t, e) || this).Mf = new Py()),
          (n.w_ = 'name' in t ? t.name : '[DEFAULT]'),
          n
        );
      }
      function Vy() {
        var e = this;
        (this.Rf = Promise.resolve()),
          (this.Pf = []),
          (this.yf = !1),
          (this.gf = []),
          (this.Vf = null),
          (this.pf = !1),
          (this.bf = []),
          (this.zu = new kl(this, 'async_queue_retry')),
          (this.vf = function () {
            var t = Nl();
            t &&
              oi(
                'AsyncQueue',
                'Visibility state changed to ' + t.visibilityState
              ),
              e.zu.Uu();
          });
        var t = Nl();
        t &&
          'function' == typeof t.addEventListener &&
          t.addEventListener('visibilitychange', this.vf);
      }
      function My(t) {
        return t.Lf || Uy(t), t.Lf.df(), t.Lf;
      }
      function Uy(t) {
        var e,
          n,
          r = t.p_(),
          r =
            ((e = t.I_),
            (n = t.w_),
            new Di(
              e,
              n,
              r.host,
              r.ssl,
              r.experimentalForceLongPolling,
              r.experimentalAutoDetectLongPolling
            ));
        t.Lf = new gy(t.m_, t.Mf, r);
      }
      function jy(n, r, i) {
        var t = this,
          o = new Wa();
        return n.fs
          .enqueue(function () {
            return y(t, void 0, void 0, function () {
              var e;
              return v(this, function (t) {
                switch (t.label) {
                  case 0:
                    return t.trys.push([0, 3, , 4]), [4, Iy(n, i)];
                  case 1:
                    return t.sent(), [4, Ey(n, r)];
                  case 2:
                    return t.sent(), o.resolve(), [3, 4];
                  case 3:
                    if (
                      !('FirebaseError' === (t = e = t.sent()).name
                        ? t.code === bi.FAILED_PRECONDITION ||
                          t.code === bi.UNIMPLEMENTED
                        : !(
                            'undefined' != typeof DOMException &&
                            t instanceof DOMException
                          ) ||
                          22 === t.code ||
                          20 === t.code ||
                          11 === t.code)
                    )
                      throw e;
                    return (
                      console.warn(
                        'Error enabling offline persistence. Falling back to persistence disabled: ' +
                          e
                      ),
                      o.reject(e),
                      [3, 4]
                    );
                  case 4:
                    return [2];
                }
              });
            });
          })
          .then(function () {
            return o.promise;
          });
      }
      function Fy(t) {
        if (t.R_ || t.P_)
          throw new wi(
            bi.FAILED_PRECONDITION,
            'Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.'
          );
      }
      var qy,
        U =
          ((Ky.prototype.$f = function (t, e) {
            switch ((void 0 === e && (e = 'none'), Io(t))) {
              case 0:
                return null;
              case 1:
                return t.booleanValue;
              case 2:
                return po(t.integerValue || t.doubleValue);
              case 3:
                return this.Bf(t.timestampValue);
              case 4:
                return this.qf(t, e);
              case 5:
                return t.stringValue;
              case 6:
                return this.Uf(yo(t.bytesValue));
              case 7:
                return this.Qf(t.referenceValue);
              case 8:
                return this.Kf(t.geoPointValue);
              case 9:
                return this.Wf(t.arrayValue, e);
              case 10:
                return this.jf(t.mapValue, e);
              default:
                throw ci();
            }
          }),
          (Ky.prototype.jf = function (t, n) {
            var r = this,
              i = {};
            return (
              uo(t.fields || {}, function (t, e) {
                i[t] = r.$f(e, n);
              }),
              i
            );
          }),
          (Ky.prototype.Kf = function (t) {
            return new Sd(po(t.latitude), po(t.longitude));
          }),
          (Ky.prototype.Wf = function (t, e) {
            var n = this;
            return (t.values || []).map(function (t) {
              return n.$f(t, e);
            });
          }),
          (Ky.prototype.qf = function (t, e) {
            switch (e) {
              case 'previous':
                var n = (function t(e) {
                  e = e.mapValue.fields.__previous_value__;
                  return vo(e) ? t(e) : e;
                })(t);
                return null == n ? null : this.$f(n, e);
              case 'estimate':
                return this.Bf(go(t));
              default:
                return null;
            }
          }),
          (Ky.prototype.Bf = function (t) {
            t = lo(t);
            return new Wi(t.seconds, t.nanos);
          }),
          (Ky.prototype.Gf = function (t, e) {
            var n = Yi.ct(t);
            hi(Ka(n));
            (t = new Oi(n.get(1), n.get(3))), (n = new Zi(n.X(5)));
            return (
              t.isEqual(e) ||
                si(
                  'Document ' +
                    n +
                    ' contains a document reference within a different database (' +
                    t.projectId +
                    '/' +
                    t.database +
                    ') which is not supported. It will be treated as a reference in the current database (' +
                    e.projectId +
                    '/' +
                    e.database +
                    ') instead.'
                ),
              n
            );
          }),
          Ky),
        zy =
          (Object.defineProperty(Gy.prototype, 'id', {
            get: function () {
              return this.S_.path.et();
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Gy.prototype, 'ref', {
            get: function () {
              return new yd(this.zf, this.v_, this.S_);
            },
            enumerable: !1,
            configurable: !0
          }),
          (Gy.prototype.exists = function () {
            return null !== this.Jf;
          }),
          (Gy.prototype.data = function () {
            if (this.Jf) {
              if (this.v_) {
                var t = new Hy(this.zf, this.Hf, this.S_, this.Jf, null);
                return this.v_.fromFirestore(t);
              }
              return this.Hf.$f(this.Jf.vt());
            }
          }),
          (Gy.prototype.get = function (t) {
            if (this.Jf) {
              t = this.Jf.data().field(Jy('DocumentSnapshot.get', t));
              if (null !== t) return this.Hf.$f(t);
            }
          }),
          Gy),
        Hy =
          (t(By, (qy = zy)),
          (By.prototype.data = function () {
            return qy.prototype.data.call(this);
          }),
          By);
      function By() {
        return (null !== qy && qy.apply(this, arguments)) || this;
      }
      function Gy(t, e, n, r, i) {
        (this.zf = t),
          (this.Hf = e),
          (this.S_ = n),
          (this.Jf = r),
          (this.v_ = i);
      }
      function Ky() {}
      function Jy(t, e) {
        return 'string' == typeof e ? ly(t, e) : (e instanceof Ei ? e._ : e).d_;
      }
      function Wy(t) {
        if (ks(t) && 0 === t.Nt.length)
          throw new wi(
            bi.UNIMPLEMENTED,
            'limitToLast() queries require specifying at least one orderBy() clause'
          );
      }
      $ = function () {};
      function Xy(t) {
        for (var e = [], n = 1; n < arguments.length; n++)
          e[n - 1] = arguments[n];
        for (var r = 0, i = e; r < i.length; r++) {
          t = i[r].Yf(t);
        }
        return t;
      }
      var Yy,
        $y,
        Qy,
        Zy,
        tv,
        ev =
          (t(hv, (tv = $)),
          (hv.prototype.Yf = function (t) {
            var e = jd(t.firestore),
              e = (function (t, e, n, r, i, o) {
                if (r.ht()) {
                  if ('array-contains' === i || 'array-contains-any' === i)
                    throw new wi(
                      bi.INVALID_ARGUMENT,
                      "Invalid Query. You can't perform '" +
                        i +
                        "' queries on FieldPath.documentId()."
                    );
                  if ('in' === i || 'not-in' === i) {
                    pv(o, i);
                    for (var s = [], u = 0, a = o; u < a.length; u++) {
                      var c = a[u];
                      s.push(lv(n, t, c));
                    }
                    h = { arrayValue: { values: s } };
                  } else h = lv(n, t, o);
                } else
                  ('in' !== i &&
                    'not-in' !== i &&
                    'array-contains-any' !== i) ||
                    pv(o, i),
                    (h = oy(e, 'where', o, 'in' === i || 'not-in' === i));
                var h = Qo.create(r, i, h);
                return (
                  (function (t, e) {
                    if (e.xt()) {
                      var n = Ps(t);
                      if (null !== n && !n.isEqual(e.field))
                        throw new wi(
                          bi.INVALID_ARGUMENT,
                          "Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '" +
                            n.toString() +
                            "' and '" +
                            e.field.toString() +
                            "'"
                        );
                      n = Cs(t);
                      null !== n && dv(0, e.field, n);
                    }
                    t = (function (t, e) {
                      for (var n = 0, r = t.filters; n < r.length; n++) {
                        var i = r[n];
                        if (0 <= e.indexOf(i.op)) return i.op;
                      }
                      return null;
                    })(
                      t,
                      (function () {
                        switch (e.op) {
                          case '!=':
                            return ['!=', 'not-in'];
                          case 'array-contains':
                            return [
                              'array-contains',
                              'array-contains-any',
                              'not-in'
                            ];
                          case 'in':
                            return ['array-contains-any', 'in', 'not-in'];
                          case 'array-contains-any':
                            return [
                              'array-contains',
                              'array-contains-any',
                              'in',
                              'not-in'
                            ];
                          case 'not-in':
                            return [
                              'array-contains',
                              'array-contains-any',
                              'in',
                              'not-in',
                              '!='
                            ];
                          default:
                            return [];
                        }
                      })()
                    );
                    if (null !== t)
                      throw t === e.op
                        ? new wi(
                            bi.INVALID_ARGUMENT,
                            "Invalid query. You cannot use more than one '" +
                              e.op.toString() +
                              "' filter."
                          )
                        : new wi(
                            bi.INVALID_ARGUMENT,
                            "Invalid query. You cannot use '" +
                              e.op.toString() +
                              "' filters with '" +
                              t.toString() +
                              "' filters."
                          );
                  })(t, h),
                  h
                );
              })(t.C_, e, t.firestore.I_, this.Xf, this.Zf, this.td);
            return new vd(
              t.firestore,
              t.v_,
              ((t = t.C_),
              (e = t.filters.concat([e])),
              new Ss(
                t.path,
                t.collectionGroup,
                t.Nt.slice(),
                e,
                t.limit,
                t.limitType,
                t.startAt,
                t.endAt
              ))
            );
          }),
          hv),
        nv =
          (t(cv, (Zy = $)),
          (cv.prototype.Yf = function (t) {
            var e = (function (t, e, n) {
              if (null !== t.startAt)
                throw new wi(
                  bi.INVALID_ARGUMENT,
                  'Invalid query. You must not call startAt() or startAfter() before calling orderBy().'
                );
              if (null !== t.endAt)
                throw new wi(
                  bi.INVALID_ARGUMENT,
                  'Invalid query. You must not call endAt() or endBefore() before calling orderBy().'
                );
              var r = new Ts(e, n);
              return (
                (e = r),
                null !== Cs((n = t)) ||
                  (null !== (t = Ps(n)) && dv(0, t, e.field)),
                r
              );
            })(t.C_, this.Xf, this.ed);
            return new vd(
              t.firestore,
              t.v_,
              ((t = t.C_),
              (e = t.Nt.concat([e])),
              new Ss(
                t.path,
                t.collectionGroup,
                e,
                t.filters.slice(),
                t.limit,
                t.limitType,
                t.startAt,
                t.endAt
              ))
            );
          }),
          cv),
        rv =
          (t(av, (Qy = $)),
          (av.prototype.Yf = function (t) {
            return new vd(t.firestore, t.v_, Ms(t.C_, this.nd, this.sd));
          }),
          av),
        iv =
          (t(uv, ($y = $)),
          (uv.prototype.Yf = function (t) {
            var e = fv(t, this.type, this.rd, this.od);
            return new vd(
              t.firestore,
              t.v_,
              ((t = t.C_),
              (e = e),
              new Ss(
                t.path,
                t.collectionGroup,
                t.Nt.slice(),
                t.filters.slice(),
                t.limit,
                t.limitType,
                e,
                t.endAt
              ))
            );
          }),
          uv),
        ov =
          (t(sv, (Yy = $)),
          (sv.prototype.Yf = function (t) {
            var e = fv(t, this.type, this.rd, this.od);
            return new vd(
              t.firestore,
              t.v_,
              ((t = t.C_),
              (e = e),
              new Ss(
                t.path,
                t.collectionGroup,
                t.Nt.slice(),
                t.filters.slice(),
                t.limit,
                t.limitType,
                t.startAt,
                e
              ))
            );
          }),
          sv);
      function sv(t, e, n) {
        var r = this;
        return (
          ((r = Yy.call(this) || this).type = t), (r.rd = e), (r.od = n), r
        );
      }
      function uv(t, e, n) {
        var r = this;
        return (
          ((r = $y.call(this) || this).type = t), (r.rd = e), (r.od = n), r
        );
      }
      function av(t, e, n) {
        var r = this;
        return (
          ((r = Qy.call(this) || this).type = t), (r.nd = e), (r.sd = n), r
        );
      }
      function cv(t, e) {
        var n = this;
        return (
          ((n = Zy.call(this) || this).Xf = t),
          (n.ed = e),
          (n.type = 'orderBy'),
          n
        );
      }
      function hv(t, e, n) {
        var r = this;
        return (
          ((r = tv.call(this) || this).Xf = t),
          (r.Zf = e),
          (r.td = n),
          (r.type = 'where'),
          r
        );
      }
      function fv(t, c, e, n) {
        if ((e[0] instanceof Ei && (e[0] = e[0]._), e[0] instanceof zy))
          return (function (t, e, n, r) {
            if (!n)
              throw new wi(
                bi.NOT_FOUND,
                "Can't use a DocumentSnapshot that doesn't exist for " +
                  c +
                  '().'
              );
            for (var i = [], o = 0, s = Rs(t); o < s.length; o++) {
              var u = s[o];
              if (u.field.ht()) i.push(So(e, n.key));
              else {
                var a = n.field(u.field);
                if (vo(a))
                  throw new wi(
                    bi.INVALID_ARGUMENT,
                    'Invalid query. You are trying to start or end a query using a document for which the field "' +
                      u.field +
                      '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)'
                  );
                if (null === a) {
                  u = u.field.ot();
                  throw new wi(
                    bi.INVALID_ARGUMENT,
                    "Invalid query. You are trying to start or end a query using a document for which the field '" +
                      u +
                      "' (used as the orderBy) does not exist."
                  );
                }
                i.push(a);
              }
            }
            return new ms(i, r);
          })(t.C_, t.firestore.I_, e[0].Jf, n);
        var r = jd(t.firestore);
        return (function (t, e, n, r, i, o) {
          var s = t.Nt;
          if (i.length > s.length)
            throw new wi(
              bi.INVALID_ARGUMENT,
              'Too many arguments provided to ' +
                r +
                '(). The number of arguments must be less than or equal to the number of orderBy() clauses'
            );
          for (var u = [], a = 0; a < i.length; a++) {
            var c = i[a];
            if (s[a].field.ht()) {
              if ('string' != typeof c)
                throw new wi(
                  bi.INVALID_ARGUMENT,
                  'Invalid query. Expected a string for document ID in ' +
                    r +
                    '(), but got a ' +
                    typeof c
                );
              if (!Ls(t) && -1 !== c.indexOf('/'))
                throw new wi(
                  bi.INVALID_ARGUMENT,
                  'Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to ' +
                    r +
                    "() must be a plain document ID, but '" +
                    c +
                    "' contains a slash."
                );
              var h = t.path.child(Yi.ct(c));
              if (!Zi.Et(h))
                throw new wi(
                  bi.INVALID_ARGUMENT,
                  'Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to ' +
                    r +
                    "() must result in a valid document path, but '" +
                    h +
                    "' is not because it contains an odd number of segments."
                );
              h = new Zi(h);
              u.push(So(e, h));
            } else {
              c = oy(n, r, c);
              u.push(c);
            }
          }
          return new ms(u, o);
        })(t.C_, t.firestore.I_, r, c, e, n);
      }
      function lv(t, e, n) {
        if ((n instanceof Ei && (n = n._), 'string' == typeof n)) {
          if ('' === n)
            throw new wi(
              bi.INVALID_ARGUMENT,
              'Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.'
            );
          if (!Ls(e) && -1 !== n.indexOf('/'))
            throw new wi(
              bi.INVALID_ARGUMENT,
              "Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '" +
                n +
                "' contains a '/' character."
            );
          e = e.path.child(Yi.ct(n));
          if (!Zi.Et(e))
            throw new wi(
              bi.INVALID_ARGUMENT,
              "Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '" +
                e +
                "' is not because it has an odd number of segments (" +
                e.length +
                ').'
            );
          return So(t, new Zi(e));
        }
        if (n instanceof yd) return So(t, n.S_);
        throw new wi(
          bi.INVALID_ARGUMENT,
          'Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: ' +
            ad(n) +
            '.'
        );
      }
      function pv(t, e) {
        if (!Array.isArray(t) || 0 === t.length)
          throw new wi(
            bi.INVALID_ARGUMENT,
            "Invalid Query. A non-empty array is required for '" +
              e.toString() +
              "' filters."
          );
        if (10 < t.length)
          throw new wi(
            bi.INVALID_ARGUMENT,
            "Invalid Query. '" +
              e.toString() +
              "' filters support a maximum of 10 elements in the value array."
          );
      }
      function dv(t, e, n) {
        if (!n.isEqual(e))
          throw new wi(
            bi.INVALID_ARGUMENT,
            "Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '" +
              e.toString() +
              "' and so you must also use '" +
              e.toString() +
              "' as your first argument to orderBy(), but your first orderBy() is on field '" +
              n.toString() +
              "' instead."
          );
      }
      function yv(i) {
        return (function () {
          if ('object' == typeof i && null !== i)
            for (
              var t = i, e = 0, n = ['next', 'error', 'complete'];
              e < n.length;
              e++
            ) {
              var r = n[e];
              if (r in t && 'function' == typeof t[r]) return 1;
            }
        })();
      }
      function vv(t, e, n) {
        return t
          ? n && (n.merge || n.mergeFields)
            ? t.toFirestore(e, n)
            : t.toFirestore(e)
          : e;
      }
      var gv,
        mv,
        bv,
        wv =
          (t(Dv, (bv = U)),
          (Dv.prototype.Uf = function (t) {
            return new Ii(t);
          }),
          (Dv.prototype.Qf = function (t) {
            t = this.Gf(t, this.firestore.I_);
            return new yd(this.firestore, null, t);
          }),
          Dv),
        Iv =
          ((xv.prototype.isEqual = function (t) {
            return (
              this.hasPendingWrites === t.hasPendingWrites &&
              this.fromCache === t.fromCache
            );
          }),
          xv),
        Ev =
          (t(Sv, (mv = zy)),
          (Sv.prototype.exists = function () {
            return mv.prototype.exists.call(this);
          }),
          (Sv.prototype.data = function (t) {
            if ((void 0 === t && (t = {}), this.Jf)) {
              if (this.v_) {
                var e = new _v(
                  this.zf,
                  this.Hf,
                  this.S_,
                  this.Jf,
                  this.metadata,
                  null
                );
                return this.v_.fromFirestore(e, t);
              }
              return this.Hf.$f(this.Jf.vt(), t.serverTimestamps);
            }
          }),
          (Sv.prototype.get = function (t, e) {
            if ((void 0 === e && (e = {}), this.Jf)) {
              t = this.Jf.data().field(Jy('DocumentSnapshot.get', t));
              if (null !== t) return this.Hf.$f(t, e.serverTimestamps);
            }
          }),
          Sv),
        _v =
          (t(Av, (gv = Ev)),
          (Av.prototype.data = function (t) {
            return void 0 === t && (t = {}), gv.prototype.data.call(this, t);
          }),
          Av),
        Tv =
          (Object.defineProperty(Nv.prototype, 'docs', {
            get: function () {
              var e = [];
              return (
                this.forEach(function (t) {
                  return e.push(t);
                }),
                e
              );
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Nv.prototype, 'size', {
            get: function () {
              return this.ud.docs.size;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Nv.prototype, 'empty', {
            get: function () {
              return 0 === this.size;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Nv.prototype.forEach = function (e, n) {
            var r = this;
            this.ud.docs.forEach(function (t) {
              e.call(
                n,
                new _v(
                  r.zf,
                  r.Hf,
                  t.key,
                  t,
                  new Iv(r.ud.Ce.has(t.key), r.ud.fromCache),
                  r.query.v_
                )
              );
            });
          }),
          (Nv.prototype.docChanges = function (t) {
            void 0 === t && (t = {});
            t = !!t.includeMetadataChanges;
            if (t && this.ud.Ne)
              throw new wi(
                bi.INVALID_ARGUMENT,
                'To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().'
              );
            return (
              (this.hd && this.ld === t) ||
                ((this.hd = (function (i, e) {
                  if (i.ud.De.nt()) {
                    var n = 0;
                    return i.ud.docChanges.map(function (t) {
                      var e = new _v(
                        i.zf,
                        i.Hf,
                        t.doc.key,
                        t.doc,
                        new Iv(i.ud.Ce.has(t.doc.key), i.ud.fromCache),
                        i.query.v_
                      );
                      return (
                        t.doc,
                        { type: 'added', doc: e, oldIndex: -1, newIndex: n++ }
                      );
                    });
                  }
                  var o = i.ud.De;
                  return i.ud.docChanges
                    .filter(function (t) {
                      return e || 3 !== t.type;
                    })
                    .map(function (t) {
                      var e = new _v(
                          i.zf,
                          i.Hf,
                          t.doc.key,
                          t.doc,
                          new Iv(i.ud.Ce.has(t.doc.key), i.ud.fromCache),
                          i.query.v_
                        ),
                        n = -1,
                        r = -1;
                      return (
                        0 !== t.type &&
                          ((n = o.indexOf(t.doc.key)),
                          (o = o.delete(t.doc.key))),
                        1 !== t.type &&
                          (r = (o = o.add(t.doc)).indexOf(t.doc.key)),
                        {
                          type: (function (t) {
                            switch (t) {
                              case 0:
                                return 'added';
                              case 2:
                              case 3:
                                return 'modified';
                              case 1:
                                return 'removed';
                              default:
                                return ci();
                            }
                          })(t.type),
                          doc: e,
                          oldIndex: n,
                          newIndex: r
                        }
                      );
                    });
                })(this, t)),
                (this.ld = t)),
              this.hd
            );
          }),
          Nv);
      function Nv(t, e, n, r) {
        (this.zf = t),
          (this.Hf = e),
          (this.ud = r),
          (this.metadata = new Iv(r.hasPendingWrites, r.fromCache)),
          (this.query = n);
      }
      function Av() {
        return (null !== gv && gv.apply(this, arguments)) || this;
      }
      function Sv(t, e, n, r, i, o) {
        var s = this;
        return (
          ((s = mv.call(this, t, e, n, r, o) || this).zf = t),
          (s.ad = t),
          (s.metadata = i),
          s
        );
      }
      function xv(t, e) {
        (this.hasPendingWrites = t), (this.fromCache = e);
      }
      function Dv(t) {
        var e = this;
        return ((e = bv.call(this) || this).firestore = t), e;
      }
      function Ov(t, e) {
        return t instanceof Ev && e instanceof Ev
          ? t.zf === e.zf &&
              t.S_.isEqual(e.S_) &&
              (null === t.Jf ? null === e.Jf : t.Jf.isEqual(e.Jf)) &&
              t.v_ === e.v_
          : t instanceof Tv &&
              e instanceof Tv &&
              t.zf === e.zf &&
              Ad(t.query, e.query) &&
              t.metadata.isEqual(e.metadata) &&
              t.ud.isEqual(e.ud);
      }
      var kv,
        Cv =
          (t(Pv, (kv = U)),
          (Pv.prototype.Uf = function (t) {
            return new Ii(t);
          }),
          (Pv.prototype.Qf = function (t) {
            t = this.Gf(t, this.firestore.I_);
            return new yd(this.firestore, null, t);
          }),
          Pv);
      function Pv(t) {
        var e = this;
        return ((e = kv.call(this) || this).firestore = t), e;
      }
      function Lv(t, e, n) {
        for (var r = [], i = 3; i < arguments.length; i++)
          r[i - 3] = arguments[i];
        t = cd(t, yd);
        var o = cd(t.firestore, Ly),
          s = jd(o);
        return (
          e instanceof Ei && (e = e._),
          Vv(o, [
            ('string' == typeof e || e instanceof Zp
              ? iy(s, 'updateDoc', t.S_, e, n, r)
              : ry(s, 'updateDoc', t.S_, e)
            ).F_(t.S_, pu.exists(!0))
          ])
        );
      }
      function Rv(e) {
        for (var n = [], t = 1; t < arguments.length; t++)
          n[t - 1] = arguments[t];
        e instanceof Ei && (e = e._);
        var r = { includeMetadataChanges: !1 },
          i = 0;
        'object' != typeof n[i] || yv(n[i]) || ((r = n[i]), i++);
        var o,
          s,
          u,
          a,
          c,
          h,
          f = { includeMetadataChanges: r.includeMetadataChanges };
        return (
          yv(n[i]) &&
            ((o = n[i]),
            (n[i] = null === (r = o.next) || void 0 === r ? void 0 : r.bind(o)),
            (n[i + 1] =
              null === (r = o.error) || void 0 === r ? void 0 : r.bind(o)),
            (n[i + 2] =
              null === (r = o.complete) || void 0 === r ? void 0 : r.bind(o))),
          e instanceof yd
            ? ((u = cd(e.firestore, Ly)),
              (a = Ds(e.S_.path)),
              (h = {
                next: function (t) {
                  n[i] && n[i](Mv(u, e, t));
                },
                error: n[i + 1],
                complete: n[i + 2]
              }))
            : ((s = cd(e, vd)),
              (u = cd(s.firestore, Ly)),
              (a = s.C_),
              (c = new Cv(u)),
              (h = {
                next: function (t) {
                  n[i] && n[i](new Tv(u, c, s, t));
                },
                error: n[i + 1],
                complete: n[i + 2]
              }),
              Wy(e.C_)),
          (function (n, t, e) {
            var r = this,
              i = new Qp(h),
              o = new lp(t, i, e);
            return (
              n.fs.ys(function () {
                return y(r, void 0, void 0, function () {
                  var e;
                  return v(this, function (t) {
                    switch (t.label) {
                      case 0:
                        return (e = cp), [4, Dy(n)];
                      case 1:
                        return [2, e.apply(void 0, [t.sent(), o])];
                    }
                  });
                });
              }),
              function () {
                i.r_(),
                  n.fs.ys(function () {
                    return y(r, void 0, void 0, function () {
                      var e;
                      return v(this, function (t) {
                        switch (t.label) {
                          case 0:
                            return (e = hp), [4, Dy(n)];
                          case 1:
                            return [2, e.apply(void 0, [t.sent(), o])];
                        }
                      });
                    });
                  });
              }
            );
          })(My(u), a, f)
        );
      }
      function Vv(t, e) {
        return (function (n, r) {
          var t = this,
            i = new Wa();
          return (
            n.fs.ys(function () {
              return y(t, void 0, void 0, function () {
                var e;
                return v(this, function (t) {
                  switch (t.label) {
                    case 0:
                      return (e = _p), [4, xy(n)];
                    case 1:
                      return [2, e.apply(void 0, [t.sent(), r, i])];
                  }
                });
              });
            }),
            i.promise
          );
        })(My(t), e);
      }
      function Mv(t, e, n) {
        var r = n.docs.get(e.S_),
          i = new Cv(t);
        return new Ev(
          t,
          i,
          e.S_,
          r,
          new Iv(n.hasPendingWrites, n.fromCache),
          e.v_
        );
      }
      var Uv =
        ((jv.prototype.set = function (t, e, n) {
          this.Ed();
          (t = Fv(t, this.zf)),
            (e = vv(t.v_, e, n)),
            (n = Fd(this.wd, 'WriteBatch.set', t.S_, e, null !== t.v_, n));
          return this.fd.push(n.F_(t.S_, pu.Wt())), this;
        }),
        (jv.prototype.update = function (t, e, n) {
          for (var r = [], i = 3; i < arguments.length; i++)
            r[i - 3] = arguments[i];
          this.Ed();
          t = Fv(t, this.zf);
          return (
            e instanceof Ei && (e = e._),
            (e =
              'string' == typeof e || e instanceof Zp
                ? iy(this.wd, 'WriteBatch.update', t.S_, e, n, r)
                : ry(this.wd, 'WriteBatch.update', t.S_, e)),
            this.fd.push(e.F_(t.S_, pu.exists(!0))),
            this
          );
        }),
        (jv.prototype.delete = function (t) {
          this.Ed();
          t = Fv(t, this.zf);
          return (this.fd = this.fd.concat(new Pu(t.S_, pu.Wt()))), this;
        }),
        (jv.prototype.commit = function () {
          return (
            this.Ed(),
            (this.dd = !0),
            0 < this.fd.length ? this._d(this.fd) : Promise.resolve()
          );
        }),
        (jv.prototype.Ed = function () {
          if (this.dd)
            throw new wi(
              bi.FAILED_PRECONDITION,
              'A write batch can no longer be used after commit() has been called.'
            );
        }),
        jv);
      function jv(t, e) {
        (this.zf = t),
          (this._d = e),
          (this.fd = []),
          (this.dd = !1),
          (this.wd = jd(t));
      }
      function Fv(t, e) {
        if ((t instanceof Ei && (t = t._), t.firestore !== e))
          throw new wi(
            bi.INVALID_ARGUMENT,
            'Provided document reference is from a different Firestore instance.'
          );
        return t;
      }
      var qv,
        zv,
        Hv,
        Bv =
          ((Qv.prototype.get = function (t) {
            var e = this,
              n = Fv(t, this.zf),
              r = new wv(this.zf);
            return this.Td.ef([n.S_]).then(function (t) {
              if (!t || 1 !== t.length) return ci();
              t = t[0];
              if (t instanceof qo) return new zy(e.zf, r, n.S_, null, n.v_);
              if (t instanceof Fo) return new zy(e.zf, r, t.key, t, n.v_);
              throw ci();
            });
          }),
          (Qv.prototype.set = function (t, e, n) {
            (t = Fv(t, this.zf)),
              (e = vv(t.v_, e, n)),
              (n = Fd(this.wd, 'Transaction.set', t.S_, e, null !== t.v_, n));
            return this.Td.set(t.S_, n), this;
          }),
          (Qv.prototype.update = function (t, e, n) {
            for (var r = [], i = 3; i < arguments.length; i++)
              r[i - 3] = arguments[i];
            t = Fv(t, this.zf);
            return (
              e instanceof Ei && (e = e._),
              (e =
                'string' == typeof e || e instanceof Zp
                  ? iy(this.wd, 'Transaction.update', t.S_, e, n, r)
                  : ry(this.wd, 'Transaction.update', t.S_, e)),
              this.Td.update(t.S_, e),
              this
            );
          }),
          (Qv.prototype.delete = function (t) {
            t = Fv(t, this.zf);
            return this.Td.delete(t.S_), this;
          }),
          t($v, (Hv = Qv)),
          ($v.prototype.get = function (t) {
            var e = this,
              n = Fv(t, this.zf),
              r = new Cv(this.zf);
            return Hv.prototype.get.call(this, t).then(function (t) {
              return new Ev(e.zf, r, n.S_, t.Jf, new Iv(!1, !1), n.v_);
            });
          }),
          $v),
        Gv =
          ((Yv.prototype.enableIndexedDbPersistence = function (t, e) {
            return (function (t, e) {
              Fy((t = cd(t, Ly)));
              var n = My(t),
                r = t.p_(),
                t = new Jp();
              return jy(
                n,
                t,
                new Gp(
                  t,
                  r.cacheSizeBytes,
                  null == e ? void 0 : e.forceOwnership
                )
              );
            })(t._, { forceOwnership: e });
          }),
          (Yv.prototype.enableMultiTabIndexedDbPersistence = function (t) {
            return (function (t) {
              Fy((t = cd(t, Ly)));
              var e = My(t),
                n = t.p_(),
                t = new Jp();
              return jy(e, t, new Kp(t, n.cacheSizeBytes));
            })(t._);
          }),
          (Yv.prototype.clearIndexedDbPersistence = function (t) {
            return (function (n) {
              var t = this;
              if (n.R_ && !n.P_)
                throw new wi(
                  bi.FAILED_PRECONDITION,
                  'Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.'
                );
              var r = new Wa();
              return (
                n.Mf.Tf(function () {
                  return y(t, void 0, void 0, function () {
                    var e;
                    return v(this, function (t) {
                      switch (t.label) {
                        case 0:
                          return (
                            t.trys.push([0, 2, , 3]),
                            [
                              4,
                              (function (n) {
                                return y(this, void 0, void 0, function () {
                                  var e;
                                  return v(this, function (t) {
                                    switch (t.label) {
                                      case 0:
                                        return $a.Wn()
                                          ? ((e = n + 'main'),
                                            [4, $a.delete(e)])
                                          : [2, Promise.resolve()];
                                      case 1:
                                        return t.sent(), [2];
                                    }
                                  });
                                });
                              })(af(n.I_, n.w_))
                            ]
                          );
                        case 1:
                          return t.sent(), r.resolve(), [3, 3];
                        case 2:
                          return (e = t.sent()), r.reject(e), [3, 3];
                        case 3:
                          return [2];
                      }
                    });
                  });
                }),
                r.promise
              );
            })(t._);
          }),
          Yv),
        Kv =
          (t(Xv, (zv = Ei)),
          Object.defineProperty(Xv.prototype, 'I_', {
            get: function () {
              return this._.I_;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Xv.prototype.settings = function (t) {
            t.merge &&
              delete (t = Object.assign(Object.assign({}, this._.V_()), t))
                .merge,
              this._.g_(t);
          }),
          (Xv.prototype.useEmulator = function (t, e) {
            'firestore.googleapis.com' !== this._.V_().host &&
              ui(
                'Host has been set in both settings() and useEmulator(), emulator host will be used'
              ),
              this.settings({ host: t + ':' + e, ssl: !1, merge: !0 });
          }),
          (Xv.prototype.enableNetwork = function () {
            return (function (r) {
              var t = this;
              return r.fs.enqueue(function () {
                return y(t, void 0, void 0, function () {
                  var e, n;
                  return v(this, function (t) {
                    switch (t.label) {
                      case 0:
                        return [4, Ny(r)];
                      case 1:
                        return (e = t.sent()), [4, Sy(r)];
                      case 2:
                        return (
                          (n = t.sent()),
                          [2, (e.po(!0), (t = n).Fh.delete(0), zl(t))]
                        );
                    }
                  });
                });
              });
            })(My(cd(this._, Ly)));
          }),
          (Xv.prototype.disableNetwork = function () {
            return (function (r) {
              var t = this;
              return r.fs.enqueue(function () {
                return y(t, void 0, void 0, function () {
                  var e, n;
                  return v(this, function (t) {
                    switch (t.label) {
                      case 0:
                        return [4, Ny(r)];
                      case 1:
                        return (e = t.sent()), [4, Sy(r)];
                      case 2:
                        return (
                          (n = t.sent()),
                          [
                            2,
                            (e.po(!1),
                            (function (n) {
                              return y(this, void 0, void 0, function () {
                                var e;
                                return v(this, function (t) {
                                  switch (t.label) {
                                    case 0:
                                      return (e = n).Fh.add(0), [4, Hl(e)];
                                    case 1:
                                      return t.sent(), e.Mh.set('Offline'), [2];
                                  }
                                });
                              });
                            })(n))
                          ]
                        );
                    }
                  });
                });
              });
            })(My(cd(this._, Ly)));
          }),
          (Xv.prototype.enablePersistence = function (t) {
            var e = !1,
              n = !1;
            return (
              t &&
                od(
                  'synchronizeTabs',
                  (e = !!t.synchronizeTabs),
                  'experimentalForceOwningTab',
                  (n = !!t.experimentalForceOwningTab)
                ),
              e
                ? this.Id.enableMultiTabIndexedDbPersistence(this)
                : this.Id.enableIndexedDbPersistence(this, n)
            );
          }),
          (Xv.prototype.clearPersistence = function () {
            return this.Id.clearIndexedDbPersistence(this);
          }),
          (Xv.prototype.terminate = function () {
            return (
              this.app._removeServiceInstance('firestore'),
              this.app._removeServiceInstance('firestore-exp'),
              this._._delete()
            );
          }),
          (Xv.prototype.waitForPendingWrites = function () {
            return (function (n) {
              var t = this,
                r = new Wa();
              return (
                n.fs.ys(function () {
                  return y(t, void 0, void 0, function () {
                    var e;
                    return v(this, function (t) {
                      switch (t.label) {
                        case 0:
                          return (e = Sp), [4, xy(n)];
                        case 1:
                          return [2, e.apply(void 0, [t.sent(), r])];
                      }
                    });
                  });
                }),
                r.promise
              );
            })(My(cd(this._, Ly)));
          }),
          (Xv.prototype.onSnapshotsInSync = function (t) {
            return (
              (e = this._),
              (t = t),
              (function (n, t) {
                var e = this,
                  r = new Qp(t);
                return (
                  n.fs.ys(function () {
                    return y(e, void 0, void 0, function () {
                      var e;
                      return v(this, function (t) {
                        switch (t.label) {
                          case 0:
                            return (
                              (e = function (t, e) {
                                t.jh.add(e), e.next();
                              }),
                              [4, Dy(n)]
                            );
                          case 1:
                            return [2, e.apply(void 0, [t.sent(), r])];
                        }
                      });
                    });
                  }),
                  function () {
                    r.r_(),
                      n.fs.ys(function () {
                        return y(e, void 0, void 0, function () {
                          var e;
                          return v(this, function (t) {
                            switch (t.label) {
                              case 0:
                                return (
                                  (e = function (t, e) {
                                    t.jh.delete(e);
                                  }),
                                  [4, Dy(n)]
                                );
                              case 1:
                                return [2, e.apply(void 0, [t.sent(), r])];
                            }
                          });
                        });
                      });
                  }
                );
              })(My(cd(e, Ly)), yv(t) ? t : { next: t })
            );
            var e;
          }),
          Object.defineProperty(Xv.prototype, 'app', {
            get: function () {
              if (!this.md)
                throw new wi(
                  bi.FAILED_PRECONDITION,
                  "Firestore was not initialized using the Firebase SDK. 'app' is not available"
                );
              return this.md;
            },
            enumerable: !1,
            configurable: !0
          }),
          (Xv.prototype.collection = function (t) {
            try {
              return new Eg(this, _d(this._, t));
            } catch (t) {
              throw ag(t, 'collection()', 'Firestore.collection()');
            }
          }),
          (Xv.prototype.doc = function (t) {
            try {
              return new ig(this, Td(this._, t));
            } catch (t) {
              throw ag(t, 'doc()', 'Firestore.doc()');
            }
          }),
          (Xv.prototype.collectionGroup = function (t) {
            try {
              return new bg(
                this,
                (function (t, e) {
                  if (
                    ((t = cd(t, dd)),
                    rd('collectionGroup', 'collection id', e),
                    0 <= e.indexOf('/'))
                  )
                    throw new wi(
                      bi.INVALID_ARGUMENT,
                      "Invalid collection ID '" +
                        e +
                        "' passed to function collectionGroup(). Collection IDs must not contain '/'."
                    );
                  return new vd(t, null, ((e = e), new Ss(Yi.at(), e)));
                })(this._, t)
              );
            } catch (t) {
              throw ag(t, 'collectionGroup()', 'Firestore.collectionGroup()');
            }
          }),
          (Xv.prototype.runTransaction = function (e) {
            var n,
              r = this;
            return (function (n, r) {
              var t = this,
                i = new Wa();
              return (
                n.fs.ys(function () {
                  return y(t, void 0, void 0, function () {
                    var e;
                    return v(this, function (t) {
                      switch (t.label) {
                        case 0:
                          return [
                            4,
                            Ty(n).then(function (t) {
                              return t.Dh;
                            })
                          ];
                        case 1:
                          return (
                            (e = t.sent()), new vy(n.fs, e, r, i).run(), [2]
                          );
                      }
                    });
                  });
                }),
                i.promise
              );
            })(My((n = this._)), function (t) {
              return (t = new Bv(n, t)), e(new ng(r, t));
            });
          }),
          (Xv.prototype.batch = function () {
            var e = this;
            return (
              My(this._),
              new rg(
                new Uv(this._, function (t) {
                  return Vv(e._, t);
                })
              )
            );
          }),
          (Xv.prototype.loadBundle = function (t) {
            throw new wi(
              bi.FAILED_PRECONDITION,
              '"loadBundle()" does not exist, have you imported "firebase/firestore/bundle"?'
            );
          }),
          (Xv.prototype.namedQuery = function (t) {
            throw new wi(
              bi.FAILED_PRECONDITION,
              '"namedQuery()" does not exist, have you imported "firebase/firestore/bundle"?'
            );
          }),
          Xv),
        Jv =
          (t(Wv, (qv = U)),
          (Wv.prototype.Uf = function (t) {
            return new xi(new Ii(t));
          }),
          (Wv.prototype.Qf = function (t) {
            t = this.Gf(t, this.firestore.I_);
            return ig.Ad(t, this.firestore, null);
          }),
          Wv);
      function Wv(t) {
        var e = this;
        return ((e = qv.call(this) || this).firestore = t), e;
      }
      function Xv(t, e, n) {
        var r = this;
        return (
          ((r = zv.call(this, e) || this).Id = n),
          (r.INTERNAL = {
            delete: function () {
              return r.terminate();
            }
          }),
          t instanceof Oi || (r.md = t),
          r
        );
      }
      function Yv() {}
      function $v(t, e) {
        var n = this;
        return ((n = Hv.call(this, t, e) || this).zf = t), n;
      }
      function Qv(t, e) {
        (this.zf = t), (this.Td = e), (this.wd = jd(t));
      }
      var Zv,
        tg,
        eg,
        ng =
          (t(ug, (eg = Ei)),
          (ug.prototype.get = function (t) {
            var e = this,
              t = Dg(t);
            return this._.get(t).then(function (t) {
              return new gg(e.zf, t);
            });
          }),
          (ug.prototype.set = function (t, e, n) {
            t = Dg(t);
            return (
              n
                ? (id('Transaction.set', n), this._.set(t, e, n))
                : this._.set(t, e),
              this
            );
          }),
          (ug.prototype.update = function (t, e, n) {
            for (var r = [], i = 3; i < arguments.length; i++)
              r[i - 3] = arguments[i];
            var o = Dg(t);
            return (
              2 === arguments.length
                ? this._.update(o, e)
                : (t = this._).update.apply(t, s([o, e, n], r)),
              this
            );
          }),
          (ug.prototype.delete = function (t) {
            t = Dg(t);
            return this._.delete(t), this;
          }),
          ug),
        rg =
          (t(sg, (tg = Ei)),
          (sg.prototype.set = function (t, e, n) {
            t = Dg(t);
            return (
              n
                ? (id('WriteBatch.set', n), this._.set(t, e, n))
                : this._.set(t, e),
              this
            );
          }),
          (sg.prototype.update = function (t, e, n) {
            for (var r = [], i = 3; i < arguments.length; i++)
              r[i - 3] = arguments[i];
            var o = Dg(t);
            return (
              2 === arguments.length
                ? this._.update(o, e)
                : (t = this._).update.apply(t, s([o, e, n], r)),
              this
            );
          }),
          (sg.prototype.delete = function (t) {
            t = Dg(t);
            return this._.delete(t), this;
          }),
          (sg.prototype.commit = function () {
            return this._.commit();
          }),
          sg),
        ig =
          (t(og, (Zv = Ei)),
          (og.Rd = function (t, e, n) {
            if (t.length % 2 != 0)
              throw new wi(
                bi.INVALID_ARGUMENT,
                'Invalid document reference. Document references must have an even number of segments, but ' +
                  t.ot() +
                  ' has ' +
                  t.length
              );
            return new og(e, new yd(e._, n, new Zi(t)));
          }),
          (og.Ad = function (t, e, n) {
            return new og(e, new yd(e._, n, t));
          }),
          Object.defineProperty(og.prototype, 'id', {
            get: function () {
              return this._.id;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(og.prototype, 'parent', {
            get: function () {
              return new Eg(this.firestore, this._.parent);
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(og.prototype, 'path', {
            get: function () {
              return this._.path;
            },
            enumerable: !1,
            configurable: !0
          }),
          (og.prototype.collection = function (t) {
            try {
              return new Eg(this.firestore, _d(this._, t));
            } catch (t) {
              throw ag(t, 'collection()', 'DocumentReference.collection()');
            }
          }),
          (og.prototype.isEqual = function (t) {
            return (
              t instanceof Ei && (t = t._), t instanceof yd && Nd(this._, t)
            );
          }),
          (og.prototype.set = function (t, e) {
            e = id('DocumentReference.set', e);
            try {
              return (function (t, e, n) {
                t = cd(t, yd);
                var r = cd(t.firestore, Ly),
                  e = vv(t.v_, e, n);
                return Vv(r, [
                  Fd(jd(r), 'setDoc', t.S_, e, null !== t.v_, n).F_(
                    t.S_,
                    pu.Wt()
                  )
                ]);
              })(this._, t, e);
            } catch (t) {
              throw ag(t, 'setDoc()', 'DocumentReference.set()');
            }
          }),
          (og.prototype.update = function (t, e) {
            for (var n = [], r = 2; r < arguments.length; r++)
              n[r - 2] = arguments[r];
            try {
              return 1 === arguments.length
                ? Lv(this._, t)
                : Lv.apply(void 0, s([this._, t, e], n));
            } catch (t) {
              throw ag(t, 'updateDoc()', 'DocumentReference.update()');
            }
          }),
          (og.prototype.delete = function () {
            return Vv(cd((t = this._).firestore, Ly), [new Pu(t.S_, pu.Wt())]);
            var t;
          }),
          (og.prototype.onSnapshot = function () {
            for (var e = this, t = [], n = 0; n < arguments.length; n++)
              t[n] = arguments[n];
            var r = cg(t),
              i = hg(t, function (t) {
                return new gg(
                  e.firestore,
                  new Ev(e.firestore._, e.Hf, t.S_, t.Jf, t.metadata, e._.v_)
                );
              });
            return Rv(this._, r, i);
          }),
          (og.prototype.get = function (t) {
            var e = this;
            return (
              'cache' === (null == t ? void 0 : t.source)
                ? function (e) {
                    e = cd(e, yd);
                    var n = cd(e.firestore, Ly),
                      t = My(n),
                      r = new Cv(n);
                    return (function (n, r) {
                      var t = this,
                        i = new Wa();
                      return (
                        n.fs.ys(function () {
                          return y(t, void 0, void 0, function () {
                            var e;
                            return v(this, function (t) {
                              switch (t.label) {
                                case 0:
                                  return (
                                    (e = function (o, s, u) {
                                      return y(
                                        this,
                                        void 0,
                                        void 0,
                                        function () {
                                          var r, i;
                                          return v(this, function (t) {
                                            switch (t.label) {
                                              case 0:
                                                return (
                                                  t.trys.push([0, 2, , 3]),
                                                  [
                                                    4,
                                                    ((e = s),
                                                    (n =
                                                      o).persistence.runTransaction(
                                                      'read document',
                                                      'readonly',
                                                      function (t) {
                                                        return n.Ic.Jo(t, e);
                                                      }
                                                    ))
                                                  ]
                                                );
                                              case 1:
                                                return (
                                                  (i = t.sent()) instanceof Fo
                                                    ? u.resolve(i)
                                                    : i instanceof qo
                                                    ? u.resolve(null)
                                                    : u.reject(
                                                        new wi(
                                                          bi.UNAVAILABLE,
                                                          "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"
                                                        )
                                                      ),
                                                  [3, 3]
                                                );
                                              case 2:
                                                return (
                                                  (r = t.sent()),
                                                  (i = pc(
                                                    r,
                                                    "Failed to get document '" +
                                                      s +
                                                      ' from cache'
                                                  )),
                                                  u.reject(i),
                                                  [3, 3]
                                                );
                                              case 3:
                                                return [2];
                                            }
                                            var e, n;
                                          });
                                        }
                                      );
                                    }),
                                    [4, Ay(n)]
                                  );
                                case 1:
                                  return [2, e.apply(void 0, [t.sent(), r, i])];
                              }
                            });
                          });
                        }),
                        i.promise
                      );
                    })(t, e.S_).then(function (t) {
                      return new Ev(
                        n,
                        r,
                        e.S_,
                        t,
                        new Iv(t instanceof Fo && t.bt, !0),
                        e.v_
                      );
                    });
                  }
                : 'server' === (null == t ? void 0 : t.source)
                ? function (e) {
                    e = cd(e, yd);
                    var n = cd(e.firestore, Ly);
                    return Oy(My(n), e.S_, { source: 'server' }).then(function (
                      t
                    ) {
                      return Mv(n, e, t);
                    });
                  }
                : function (e) {
                    e = cd(e, yd);
                    var n = cd(e.firestore, Ly);
                    return Oy(My(n), e.S_).then(function (t) {
                      return Mv(n, e, t);
                    });
                  }
            )(this._).then(function (t) {
              return new gg(
                e.firestore,
                new Ev(e.firestore._, e.Hf, t.S_, t.Jf, t.metadata, e._.v_)
              );
            });
          }),
          (og.prototype.withConverter = function (t) {
            return new og(this.firestore, this._.withConverter(t));
          }),
          og);
      function og(t, e) {
        var n = this;
        return (
          ((n = Zv.call(this, e) || this).firestore = t), (n.Hf = new Jv(t)), n
        );
      }
      function sg() {
        return (null !== tg && tg.apply(this, arguments)) || this;
      }
      function ug(t, e) {
        var n = this;
        return ((n = eg.call(this, e) || this).zf = t), n;
      }
      function ag(t, e, n) {
        return (t.message = t.message.replace(e, n)), t;
      }
      function cg(t) {
        for (var e = 0, n = t; e < n.length; e++) {
          var r = n[e];
          if ('object' == typeof r && !yv(r)) return r;
        }
        return {};
      }
      function hg(t, e) {
        var n;
        return {
          next: function (t) {
            n.next && n.next(e(t));
          },
          error:
            null ===
              (t = (n = yv(t[0])
                ? t[0]
                : yv(t[1])
                ? t[1]
                : 'function' == typeof t[0]
                ? { next: t[0], error: t[1], complete: t[2] }
                : { next: t[1], error: t[2], complete: t[3] }).error) ||
            void 0 === t
              ? void 0
              : t.bind(n),
          complete:
            null === (t = n.complete) || void 0 === t ? void 0 : t.bind(n)
        };
      }
      var fg,
        lg,
        pg,
        dg,
        yg,
        vg,
        gg =
          (t(xg, (vg = Ei)),
          Object.defineProperty(xg.prototype, 'ref', {
            get: function () {
              return new ig(this.zf, this._.ref);
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(xg.prototype, 'id', {
            get: function () {
              return this._.id;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(xg.prototype, 'metadata', {
            get: function () {
              return this._.metadata;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(xg.prototype, 'exists', {
            get: function () {
              return this._.exists();
            },
            enumerable: !1,
            configurable: !0
          }),
          (xg.prototype.data = function (t) {
            return this._.data(t);
          }),
          (xg.prototype.get = function (t, e) {
            return this._.get(t, e);
          }),
          (xg.prototype.isEqual = function (t) {
            return Ov(this._, t._);
          }),
          xg),
        mg =
          (t(Sg, (yg = gg)),
          (Sg.prototype.data = function (t) {
            return this._.data(t);
          }),
          Sg),
        bg =
          (t(Ag, (dg = Ei)),
          (Ag.prototype.where = function (t, e, n) {
            try {
              return new Ag(
                this.firestore,
                Xy(
                  this._,
                  ((r = n), (i = e), (o = Jy('where', t)), new ev(o, i, r))
                )
              );
            } catch (t) {
              throw ag(t, /(orderBy|where)\(\)/, 'Query.$1()');
            }
            var r, i, o;
          }),
          (Ag.prototype.orderBy = function (n, t) {
            try {
              return new Ag(
                this.firestore,
                Xy(
                  this._,
                  (function (t) {
                    void 0 === t && (t = 'asc');
                    var e = t,
                      t = Jy('orderBy', n);
                    return new nv(t, e);
                  })(t)
                )
              );
            } catch (n) {
              throw ag(n, /(orderBy|where)\(\)/, 'Query.$1()');
            }
          }),
          (Ag.prototype.limit = function (t) {
            try {
              return new Ag(
                this.firestore,
                Xy(this._, (hd('limit', (e = t)), new rv('limit', e, 'F')))
              );
            } catch (t) {
              throw ag(t, 'limit()', 'Query.limit()');
            }
            var e;
          }),
          (Ag.prototype.limitToLast = function (t) {
            try {
              return new Ag(
                this.firestore,
                Xy(
                  this._,
                  (hd('limitToLast', (e = t)), new rv('limitToLast', e, 'L'))
                )
              );
            } catch (t) {
              throw ag(t, 'limitToLast()', 'Query.limitToLast()');
            }
            var e;
          }),
          (Ag.prototype.startAt = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            try {
              return new Ag(
                this.firestore,
                Xy(
                  this._,
                  function () {
                    for (var t = [], e = 0; e < arguments.length; e++)
                      t[e] = arguments[e];
                    return new iv('startAt', t, !0);
                  }.apply(void 0, t)
                )
              );
            } catch (t) {
              throw ag(t, 'startAt()', 'Query.startAt()');
            }
          }),
          (Ag.prototype.startAfter = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            try {
              return new Ag(
                this.firestore,
                Xy(
                  this._,
                  function () {
                    for (var t = [], e = 0; e < arguments.length; e++)
                      t[e] = arguments[e];
                    return new iv('startAfter', t, !1);
                  }.apply(void 0, t)
                )
              );
            } catch (t) {
              throw ag(t, 'startAfter()', 'Query.startAfter()');
            }
          }),
          (Ag.prototype.endBefore = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            try {
              return new Ag(
                this.firestore,
                Xy(
                  this._,
                  function () {
                    for (var t = [], e = 0; e < arguments.length; e++)
                      t[e] = arguments[e];
                    return new ov('endBefore', t, !0);
                  }.apply(void 0, t)
                )
              );
            } catch (t) {
              throw ag(t, 'endBefore()', 'Query.endBefore()');
            }
          }),
          (Ag.prototype.endAt = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            try {
              return new Ag(
                this.firestore,
                Xy(
                  this._,
                  function () {
                    for (var t = [], e = 0; e < arguments.length; e++)
                      t[e] = arguments[e];
                    return new ov('endAt', t, !1);
                  }.apply(void 0, t)
                )
              );
            } catch (t) {
              throw ag(t, 'endAt()', 'Query.endAt()');
            }
          }),
          (Ag.prototype.isEqual = function (t) {
            return Ad(this._, t._);
          }),
          (Ag.prototype.get = function (t) {
            var e = this;
            return (
              'cache' === (null == t ? void 0 : t.source)
                ? function (e) {
                    e = cd(e, vd);
                    var n = cd(e.firestore, Ly),
                      t = My(n),
                      r = new Cv(n);
                    return (function (n, r) {
                      var t = this,
                        i = new Wa();
                      return (
                        n.fs.ys(function () {
                          return y(t, void 0, void 0, function () {
                            var e;
                            return v(this, function (t) {
                              switch (t.label) {
                                case 0:
                                  return (
                                    (e = function (i, o, s) {
                                      return y(
                                        this,
                                        void 0,
                                        void 0,
                                        function () {
                                          var e, n, r;
                                          return v(this, function (t) {
                                            switch (t.label) {
                                              case 0:
                                                return (
                                                  t.trys.push([0, 2, , 3]),
                                                  [4, Tf(i, o, !0)]
                                                );
                                              case 1:
                                                return (
                                                  (r = t.sent()),
                                                  (e = new vp(o, r.Pc)),
                                                  (n = e.dl(r.documents)),
                                                  (n = e.Ti(n, !1)),
                                                  s.resolve(n.snapshot),
                                                  [3, 3]
                                                );
                                              case 2:
                                                return (
                                                  (n = t.sent()),
                                                  (r = pc(
                                                    n,
                                                    "Failed to execute query '" +
                                                      o +
                                                      ' against cache'
                                                  )),
                                                  s.reject(r),
                                                  [3, 3]
                                                );
                                              case 3:
                                                return [2];
                                            }
                                          });
                                        }
                                      );
                                    }),
                                    [4, Ay(n)]
                                  );
                                case 1:
                                  return [2, e.apply(void 0, [t.sent(), r, i])];
                              }
                            });
                          });
                        }),
                        i.promise
                      );
                    })(t, e.C_).then(function (t) {
                      return new Tv(n, r, e, t);
                    });
                  }
                : 'server' === (null == t ? void 0 : t.source)
                ? function (e) {
                    e = cd(e, vd);
                    var n = cd(e.firestore, Ly),
                      t = My(n),
                      r = new Cv(n);
                    return ky(t, e.C_, { source: 'server' }).then(function (t) {
                      return new Tv(n, r, e, t);
                    });
                  }
                : function (e) {
                    e = cd(e, vd);
                    var n = cd(e.firestore, Ly),
                      t = My(n),
                      r = new Cv(n);
                    return (
                      Wy(e.C_),
                      ky(t, e.C_).then(function (t) {
                        return new Tv(n, r, e, t);
                      })
                    );
                  }
            )(this._).then(function (t) {
              return new Ig(
                e.firestore,
                new Tv(e.firestore._, e.Hf, e._, t.ud)
              );
            });
          }),
          (Ag.prototype.onSnapshot = function () {
            for (var e = this, t = [], n = 0; n < arguments.length; n++)
              t[n] = arguments[n];
            var r = cg(t),
              i = hg(t, function (t) {
                return new Ig(
                  e.firestore,
                  new Tv(e.firestore._, e.Hf, e._, t.ud)
                );
              });
            return Rv(this._, r, i);
          }),
          (Ag.prototype.withConverter = function (t) {
            return new Ag(this.firestore, this._.withConverter(t));
          }),
          Ag),
        wg =
          (t(Ng, (pg = Ei)),
          Object.defineProperty(Ng.prototype, 'type', {
            get: function () {
              return this._.type;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Ng.prototype, 'doc', {
            get: function () {
              return new mg(this.zf, this._.doc);
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Ng.prototype, 'oldIndex', {
            get: function () {
              return this._.oldIndex;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Ng.prototype, 'newIndex', {
            get: function () {
              return this._.newIndex;
            },
            enumerable: !1,
            configurable: !0
          }),
          Ng),
        Ig =
          (t(Tg, (lg = Ei)),
          Object.defineProperty(Tg.prototype, 'query', {
            get: function () {
              return new bg(this.zf, this._.query);
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Tg.prototype, 'metadata', {
            get: function () {
              return this._.metadata;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Tg.prototype, 'size', {
            get: function () {
              return this._.size;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Tg.prototype, 'empty', {
            get: function () {
              return this._.empty;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(Tg.prototype, 'docs', {
            get: function () {
              var e = this;
              return this._.docs.map(function (t) {
                return new mg(e.zf, t);
              });
            },
            enumerable: !1,
            configurable: !0
          }),
          (Tg.prototype.docChanges = function (t) {
            var e = this;
            return this._.docChanges(t).map(function (t) {
              return new wg(e.zf, t);
            });
          }),
          (Tg.prototype.forEach = function (e, n) {
            var r = this;
            this._.forEach(function (t) {
              e.call(n, new mg(r.zf, t));
            });
          }),
          (Tg.prototype.isEqual = function (t) {
            return Ov(this._, t._);
          }),
          Tg),
        Eg =
          (t(_g, (fg = bg)),
          Object.defineProperty(_g.prototype, 'id', {
            get: function () {
              return this._.id;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(_g.prototype, 'path', {
            get: function () {
              return this._.path;
            },
            enumerable: !1,
            configurable: !0
          }),
          Object.defineProperty(_g.prototype, 'parent', {
            get: function () {
              var t = this._.parent;
              return t ? new ig(this.firestore, t) : null;
            },
            enumerable: !1,
            configurable: !0
          }),
          (_g.prototype.doc = function (t) {
            try {
              return new ig(
                this.firestore,
                void 0 === t ? Td(this._) : Td(this._, t)
              );
            } catch (t) {
              throw ag(t, 'doc()', 'CollectionReference.doc()');
            }
          }),
          (_g.prototype.add = function (t) {
            var e,
              n,
              r,
              i = this;
            return (
              (e = this._),
              (n = t),
              (t = cd(e.firestore, Ly)),
              (r = Td(e)),
              (n = vv(e.v_, n)),
              Vv(t, [
                Fd(jd(e.firestore), 'addDoc', r.S_, n, null !== e.v_, {}).F_(
                  r.S_,
                  pu.exists(!1)
                )
              ])
                .then(function () {
                  return r;
                })
                .then(function (t) {
                  return new ig(i.firestore, t);
                })
            );
          }),
          (_g.prototype.isEqual = function (t) {
            return Nd(this._, t._);
          }),
          (_g.prototype.withConverter = function (t) {
            return new _g(this.firestore, this._.withConverter(t));
          }),
          _g);
      function _g(t, e) {
        var n = this;
        return ((n = fg.call(this, t, e) || this).firestore = t), (n._ = e), n;
      }
      function Tg(t, e) {
        var n = this;
        return ((n = lg.call(this, e) || this).zf = t), n;
      }
      function Ng(t, e) {
        var n = this;
        return ((n = pg.call(this, e) || this).zf = t), n;
      }
      function Ag(t, e) {
        var n = this;
        return (
          ((n = dg.call(this, e) || this).firestore = t), (n.Hf = new Jv(t)), n
        );
      }
      function Sg() {
        return (null !== yg && yg.apply(this, arguments)) || this;
      }
      function xg(t, e) {
        var n = this;
        return ((n = vg.call(this, e) || this).zf = t), n;
      }
      function Dg(t) {
        return t instanceof Ei && (t = t._), cd(t, yd);
      }
      var Og,
        kg,
        $ =
          (t(Pg, (kg = Ei)),
          (Pg.documentId = function () {
            return new Pg(Qi.lt().ot());
          }),
          (Pg.prototype.isEqual = function (t) {
            return (
              t instanceof Ei && (t = t._),
              t instanceof Zp && this._.d_.isEqual(t.d_)
            );
          }),
          Pg),
        U =
          (t(Cg, (Og = Ei)),
          (Cg.serverTimestamp = function () {
            var t = new Xd('serverTimestamp');
            return (t._methodName = 'FieldValue.serverTimestamp'), new Cg(t);
          }),
          (Cg.delete = function () {
            var t = new zd('deleteField');
            return (t._methodName = 'FieldValue.delete'), new Cg(t);
          }),
          (Cg.arrayUnion = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            var n = function () {
              for (var t = [], e = 0; e < arguments.length; e++)
                t[e] = arguments[e];
              return new Yd('arrayUnion', t);
            }.apply(void 0, t);
            return (n._methodName = 'FieldValue.arrayUnion'), new Cg(n);
          }),
          (Cg.arrayRemove = function () {
            for (var t = [], e = 0; e < arguments.length; e++)
              t[e] = arguments[e];
            var n = function () {
              for (var t = [], e = 0; e < arguments.length; e++)
                t[e] = arguments[e];
              return new $d('arrayRemove', t);
            }.apply(void 0, t);
            return (n._methodName = 'FieldValue.arrayRemove'), new Cg(n);
          }),
          (Cg.increment = function (t) {
            t = new Qd('increment', t);
            return (t._methodName = 'FieldValue.increment'), new Cg(t);
          }),
          (Cg.prototype.isEqual = function (t) {
            return this._.isEqual(t._);
          }),
          Cg);
      function Cg() {
        return (null !== Og && Og.apply(this, arguments)) || this;
      }
      function Pg() {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        return kg.call(this, new (Zp.bind.apply(Zp, s([void 0], t)))()) || this;
      }
      var Lg = {
        Firestore: Kv,
        GeoPoint: Sd,
        Timestamp: Wi,
        Blob: xi,
        Transaction: ng,
        WriteBatch: rg,
        DocumentReference: ig,
        DocumentSnapshot: gg,
        Query: bg,
        QueryDocumentSnapshot: mg,
        QuerySnapshot: Ig,
        CollectionReference: Eg,
        FieldPath: $,
        FieldValue: U,
        setLogLevel: function (t) {
          ri.setLogLevel(t);
        },
        CACHE_SIZE_UNLIMITED: -1
      };
      function Rg(t) {
        t.INTERNAL.registerComponent(
          new T(
            'firestore',
            function (t) {
              var e = t.getProvider('app').getImmediate();
              return (
                (e = e),
                (t = t.getProvider('auth-internal')),
                new Kv(e, new Ly(e, t), new Gv())
              );
            },
            'PUBLIC'
          ).setServiceProps(Object.assign({}, Lg))
        ),
          t.registerVersion('@firebase/firestore', '2.1.1');
      }
      Rg(rt),
        (Vg.registerFirestore = Rg),
        Object.defineProperty(Vg, '__esModule', { value: !0 });
    }.apply(this, arguments));
  } catch (t) {
    throw (
      (console.error(t),
      new Error(
        'Cannot instantiate firebase-firestore.js - be sure to load firebase-app.js first.'
      ))
    );
  }
});
//# sourceMappingURL=firebase-firestore.js.map
