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
    ? (module.exports = t())
    : 'function' == typeof define && define.amd
    ? define(t)
    : ((e =
        'undefined' != typeof globalThis ? globalThis : e || self).firebase =
        t());
})(this, function () {
  'use strict';
  var r = function (e, t) {
    return (r =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function (e, t) {
          e.__proto__ = t;
        }) ||
      function (e, t) {
        for (var r in t) t.hasOwnProperty(r) && (e[r] = t[r]);
      })(e, t);
  };
  var p = function () {
    return (p =
      Object.assign ||
      function (e) {
        for (var t, r = 1, n = arguments.length; r < n; r++)
          for (var o in (t = arguments[r]))
            Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
        return e;
      }).apply(this, arguments);
  };
  function e(e, a, s, c) {
    return new (s = s || Promise)(function (r, t) {
      function n(e) {
        try {
          i(c.next(e));
        } catch (e) {
          t(e);
        }
      }
      function o(e) {
        try {
          i(c.throw(e));
        } catch (e) {
          t(e);
        }
      }
      function i(e) {
        var t;
        e.done
          ? r(e.value)
          : ((t = e.value) instanceof s
              ? t
              : new s(function (e) {
                  e(t);
                })
            ).then(n, o);
      }
      i((c = c.apply(e, a || [])).next());
    });
  }
  function n(r, n) {
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
              t = n.call(r, s);
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
  function l(e) {
    var t = 'function' == typeof Symbol && Symbol.iterator,
      r = t && e[t],
      n = 0;
    if (r) return r.call(e);
    if (e && 'number' == typeof e.length)
      return {
        next: function () {
          return (
            e && n >= e.length && (e = void 0), { value: e && e[n++], done: !e }
          );
        }
      };
    throw new TypeError(
      t ? 'Object is not iterable.' : 'Symbol.iterator is not defined.'
    );
  }
  function u(e, t) {
    var r = 'function' == typeof Symbol && e[Symbol.iterator];
    if (!r) return e;
    var n,
      o,
      i = r.call(e),
      a = [];
    try {
      for (; (void 0 === t || 0 < t--) && !(n = i.next()).done; )
        a.push(n.value);
    } catch (e) {
      o = { error: e };
    } finally {
      try {
        n && !n.done && (r = i.return) && r.call(i);
      } finally {
        if (o) throw o.error;
      }
    }
    return a;
  }
  function a(e, t) {
    if (!(t instanceof Object)) return t;
    switch (t.constructor) {
      case Date:
        return new Date(t.getTime());
      case Object:
        void 0 === e && (e = {});
        break;
      case Array:
        e = [];
        break;
      default:
        return t;
    }
    for (var r in t)
      t.hasOwnProperty(r) && '__proto__' !== r && (e[r] = a(e[r], t[r]));
    return e;
  }
  var o =
    ((t.prototype.wrapCallback = function (r) {
      var n = this;
      return function (e, t) {
        e ? n.reject(e) : n.resolve(t),
          'function' == typeof r &&
            (n.promise.catch(function () {}), 1 === r.length ? r(e) : r(e, t));
      };
    }),
    t);
  function t() {
    var r = this;
    (this.reject = function () {}),
      (this.resolve = function () {}),
      (this.promise = new Promise(function (e, t) {
        (r.resolve = e), (r.reject = t);
      }));
  }
  var i,
    s,
    c,
    f = 'FirebaseError',
    h =
      ((i = Error),
      r((s = v), (c = i)),
      (s.prototype =
        null === c ? Object.create(c) : ((d.prototype = c.prototype), new d())),
      v);
  function d() {
    this.constructor = s;
  }
  function v(e, t, r) {
    t = i.call(this, t) || this;
    return (
      (t.code = e),
      (t.customData = r),
      (t.name = f),
      Object.setPrototypeOf(t, v.prototype),
      Error.captureStackTrace && Error.captureStackTrace(t, m.prototype.create),
      t
    );
  }
  var m =
    ((y.prototype.create = function (e) {
      for (var t = [], r = 1; r < arguments.length; r++)
        t[r - 1] = arguments[r];
      var n,
        o = t[0] || {},
        i = this.service + '/' + e,
        e = this.errors[e],
        e = e
          ? ((n = o),
            e.replace(b, function (e, t) {
              var r = n[t];
              return null != r ? String(r) : '<' + t + '?>';
            }))
          : 'Error',
        e = this.serviceName + ': ' + e + ' (' + i + ').';
      return new h(i, e, o);
    }),
    y);
  function y(e, t, r) {
    (this.service = e), (this.serviceName = t), (this.errors = r);
  }
  var b = /\{\$([^}]+)}/g;
  function g(e, t) {
    t = new w(e, t);
    return t.subscribe.bind(t);
  }
  var w =
    ((E.prototype.next = function (t) {
      this.forEachObserver(function (e) {
        e.next(t);
      });
    }),
    (E.prototype.error = function (t) {
      this.forEachObserver(function (e) {
        e.error(t);
      }),
        this.close(t);
    }),
    (E.prototype.complete = function () {
      this.forEachObserver(function (e) {
        e.complete();
      }),
        this.close();
    }),
    (E.prototype.subscribe = function (e, t, r) {
      var n,
        o = this;
      if (void 0 === e && void 0 === t && void 0 === r)
        throw new Error('Missing Observer.');
      void 0 ===
        (n = (function (e, t) {
          if ('object' != typeof e || null === e) return !1;
          for (var r = 0, n = t; r < n.length; r++) {
            var o = n[r];
            if (o in e && 'function' == typeof e[o]) return !0;
          }
          return !1;
        })(e, ['next', 'error', 'complete'])
          ? e
          : { next: e, error: t, complete: r }).next && (n.next = O),
        void 0 === n.error && (n.error = O),
        void 0 === n.complete && (n.complete = O);
      r = this.unsubscribeOne.bind(this, this.observers.length);
      return (
        this.finalized &&
          this.task.then(function () {
            try {
              o.finalError ? n.error(o.finalError) : n.complete();
            } catch (e) {}
          }),
        this.observers.push(n),
        r
      );
    }),
    (E.prototype.unsubscribeOne = function (e) {
      void 0 !== this.observers &&
        void 0 !== this.observers[e] &&
        (delete this.observers[e],
        --this.observerCount,
        0 === this.observerCount &&
          void 0 !== this.onNoObservers &&
          this.onNoObservers(this));
    }),
    (E.prototype.forEachObserver = function (e) {
      if (!this.finalized)
        for (var t = 0; t < this.observers.length; t++) this.sendOne(t, e);
    }),
    (E.prototype.sendOne = function (e, t) {
      var r = this;
      this.task.then(function () {
        if (void 0 !== r.observers && void 0 !== r.observers[e])
          try {
            t(r.observers[e]);
          } catch (e) {
            'undefined' != typeof console && console.error && console.error(e);
          }
      });
    }),
    (E.prototype.close = function (e) {
      var t = this;
      this.finalized ||
        ((this.finalized = !0),
        void 0 !== e && (this.finalError = e),
        this.task.then(function () {
          (t.observers = void 0), (t.onNoObservers = void 0);
        }));
    }),
    E);
  function E(e, t) {
    var r = this;
    (this.observers = []),
      (this.unsubscribes = []),
      (this.observerCount = 0),
      (this.task = Promise.resolve()),
      (this.finalized = !1),
      (this.onNoObservers = t),
      this.task
        .then(function () {
          e(r);
        })
        .catch(function (e) {
          r.error(e);
        });
  }
  function O() {}
  var _ =
    ((N.prototype.setInstantiationMode = function (e) {
      return (this.instantiationMode = e), this;
    }),
    (N.prototype.setMultipleInstances = function (e) {
      return (this.multipleInstances = e), this;
    }),
    (N.prototype.setServiceProps = function (e) {
      return (this.serviceProps = e), this;
    }),
    N);
  function N(e, t, r) {
    (this.name = e),
      (this.instanceFactory = t),
      (this.type = r),
      (this.multipleInstances = !1),
      (this.serviceProps = {}),
      (this.instantiationMode = 'LAZY');
  }
  var I = '[DEFAULT]',
    L =
      ((A.prototype.get = function (e) {
        void 0 === e && (e = I);
        var t = this.normalizeInstanceIdentifier(e);
        if (!this.instancesDeferred.has(t)) {
          var r = new o();
          this.instancesDeferred.set(t, r);
          try {
            var n = this.getOrInitializeService(t);
            n && r.resolve(n);
          } catch (e) {}
        }
        return this.instancesDeferred.get(t).promise;
      }),
      (A.prototype.getImmediate = function (e) {
        var t = p({ identifier: I, optional: !1 }, e),
          e = t.identifier,
          r = t.optional,
          n = this.normalizeInstanceIdentifier(e);
        try {
          var o = this.getOrInitializeService(n);
          if (o) return o;
          if (r) return null;
          throw Error('Service ' + this.name + ' is not available');
        } catch (e) {
          if (r) return null;
          throw e;
        }
      }),
      (A.prototype.getComponent = function () {
        return this.component;
      }),
      (A.prototype.setComponent = function (e) {
        var t, r;
        if (e.name !== this.name)
          throw Error(
            'Mismatching Component ' +
              e.name +
              ' for Provider ' +
              this.name +
              '.'
          );
        if (this.component)
          throw Error(
            'Component for ' + this.name + ' has already been provided'
          );
        if ('EAGER' === (this.component = e).instantiationMode)
          try {
            this.getOrInitializeService(I);
          } catch (e) {}
        try {
          for (
            var n = l(this.instancesDeferred.entries()), o = n.next();
            !o.done;
            o = n.next()
          ) {
            var i = u(o.value, 2),
              a = i[0],
              s = i[1],
              c = this.normalizeInstanceIdentifier(a);
            try {
              var p = this.getOrInitializeService(c);
              s.resolve(p);
            } catch (e) {}
          }
        } catch (e) {
          t = { error: e };
        } finally {
          try {
            o && !o.done && (r = n.return) && r.call(n);
          } finally {
            if (t) throw t.error;
          }
        }
      }),
      (A.prototype.clearInstance = function (e) {
        void 0 === e && (e = I),
          this.instancesDeferred.delete(e),
          this.instances.delete(e);
      }),
      (A.prototype.delete = function () {
        return e(this, void 0, void 0, function () {
          var t;
          return n(this, function (e) {
            switch (e.label) {
              case 0:
                return (
                  (t = Array.from(this.instances.values())),
                  [
                    4,
                    Promise.all(
                      (function () {
                        for (var e = [], t = 0; t < arguments.length; t++)
                          e = e.concat(u(arguments[t]));
                        return e;
                      })(
                        t
                          .filter(function (e) {
                            return 'INTERNAL' in e;
                          })
                          .map(function (e) {
                            return e.INTERNAL.delete();
                          }),
                        t
                          .filter(function (e) {
                            return '_delete' in e;
                          })
                          .map(function (e) {
                            return e._delete();
                          })
                      )
                    )
                  ]
                );
              case 1:
                return e.sent(), [2];
            }
          });
        });
      }),
      (A.prototype.isComponentSet = function () {
        return null != this.component;
      }),
      (A.prototype.getOrInitializeService = function (e) {
        var t,
          r = this.instances.get(e);
        return (
          !r &&
            this.component &&
            ((r = this.component.instanceFactory(
              this.container,
              (t = e) === I ? void 0 : t
            )),
            this.instances.set(e, r)),
          r || null
        );
      }),
      (A.prototype.normalizeInstanceIdentifier = function (e) {
        return !this.component || this.component.multipleInstances ? e : I;
      }),
      A);
  function A(e, t) {
    (this.name = e),
      (this.container = t),
      (this.component = null),
      (this.instances = new Map()),
      (this.instancesDeferred = new Map());
  }
  var S =
    ((P.prototype.addComponent = function (e) {
      var t = this.getProvider(e.name);
      if (t.isComponentSet())
        throw new Error(
          'Component ' +
            e.name +
            ' has already been registered with ' +
            this.name
        );
      t.setComponent(e);
    }),
    (P.prototype.addOrOverwriteComponent = function (e) {
      this.getProvider(e.name).isComponentSet() &&
        this.providers.delete(e.name),
        this.addComponent(e);
    }),
    (P.prototype.getProvider = function (e) {
      if (this.providers.has(e)) return this.providers.get(e);
      var t = new L(e, this);
      return this.providers.set(e, t), t;
    }),
    (P.prototype.getProviders = function () {
      return Array.from(this.providers.values());
    }),
    P);
  function P(e) {
    (this.name = e), (this.providers = new Map());
  }
  function R() {
    for (var e = 0, t = 0, r = arguments.length; t < r; t++)
      e += arguments[t].length;
    for (var n = Array(e), o = 0, t = 0; t < r; t++)
      for (var i = arguments[t], a = 0, s = i.length; a < s; a++, o++)
        n[o] = i[a];
    return n;
  }
  var C,
    D = [];
  ((q = C = C || {})[(q.DEBUG = 0)] = 'DEBUG'),
    (q[(q.VERBOSE = 1)] = 'VERBOSE'),
    (q[(q.INFO = 2)] = 'INFO'),
    (q[(q.WARN = 3)] = 'WARN'),
    (q[(q.ERROR = 4)] = 'ERROR'),
    (q[(q.SILENT = 5)] = 'SILENT');
  function j(e, t) {
    for (var r = [], n = 2; n < arguments.length; n++) r[n - 2] = arguments[n];
    if (!(t < e.logLevel)) {
      var o = new Date().toISOString(),
        i = T[t];
      if (!i)
        throw new Error(
          'Attempted to log a message with an invalid logType (value: ' +
            t +
            ')'
        );
      console[i].apply(console, R(['[' + o + ']  ' + e.name + ':'], r));
    }
  }
  var F = {
      debug: C.DEBUG,
      verbose: C.VERBOSE,
      info: C.INFO,
      warn: C.WARN,
      error: C.ERROR,
      silent: C.SILENT
    },
    x = C.INFO,
    T =
      (((he = {})[C.DEBUG] = 'log'),
      (he[C.VERBOSE] = 'log'),
      (he[C.INFO] = 'info'),
      (he[C.WARN] = 'warn'),
      (he[C.ERROR] = 'error'),
      he),
    k =
      (Object.defineProperty(H.prototype, 'logLevel', {
        get: function () {
          return this._logLevel;
        },
        set: function (e) {
          if (!(e in C))
            throw new TypeError(
              'Invalid value "' + e + '" assigned to `logLevel`'
            );
          this._logLevel = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      (H.prototype.setLogLevel = function (e) {
        this._logLevel = 'string' == typeof e ? F[e] : e;
      }),
      Object.defineProperty(H.prototype, 'logHandler', {
        get: function () {
          return this._logHandler;
        },
        set: function (e) {
          if ('function' != typeof e)
            throw new TypeError(
              'Value assigned to `logHandler` must be a function'
            );
          this._logHandler = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(H.prototype, 'userLogHandler', {
        get: function () {
          return this._userLogHandler;
        },
        set: function (e) {
          this._userLogHandler = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      (H.prototype.debug = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, R([this, C.DEBUG], e)),
          this._logHandler.apply(this, R([this, C.DEBUG], e));
      }),
      (H.prototype.log = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, R([this, C.VERBOSE], e)),
          this._logHandler.apply(this, R([this, C.VERBOSE], e));
      }),
      (H.prototype.info = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, R([this, C.INFO], e)),
          this._logHandler.apply(this, R([this, C.INFO], e));
      }),
      (H.prototype.warn = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, R([this, C.WARN], e)),
          this._logHandler.apply(this, R([this, C.WARN], e));
      }),
      (H.prototype.error = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, R([this, C.ERROR], e)),
          this._logHandler.apply(this, R([this, C.ERROR], e));
      }),
      H);
  function H(e) {
    (this.name = e),
      (this._logLevel = x),
      (this._logHandler = j),
      (this._userLogHandler = null),
      D.push(this);
  }
  var z =
    ((B.prototype.getPlatformInfoString = function () {
      return this.container
        .getProviders()
        .map(function (e) {
          if (
            (function (e) {
              e = e.getComponent();
              return 'VERSION' === (null == e ? void 0 : e.type);
            })(e)
          ) {
            e = e.getImmediate();
            return e.library + '/' + e.version;
          }
          return null;
        })
        .filter(function (e) {
          return e;
        })
        .join(' ');
    }),
    B);
  function B(e) {
    this.container = e;
  }
  var V = '@firebase/app-exp',
    M = new k('@firebase/app'),
    U = '[DEFAULT]',
    G =
      (((q = {})[V] = 'fire-core'),
      (q['@firebase/app-compat'] = 'fire-core-compat'),
      (q['@firebase/analytics'] = 'fire-analytics'),
      (q['@firebase/auth'] = 'fire-auth'),
      (q['@firebase/database'] = 'fire-rtdb'),
      (q['@firebase/functions-exp'] = 'fire-fn'),
      (q['@firebase/functions-compat'] = 'fire-fn-compat'),
      (q['@firebase/installations'] = 'fire-iid'),
      (q['@firebase/messaging'] = 'fire-fcm'),
      (q['@firebase/performance'] = 'fire-perf'),
      (q['@firebase/remote-config'] = 'fire-rc'),
      (q['@firebase/storage'] = 'fire-gcs'),
      (q['@firebase/firestore'] = 'fire-fst'),
      (q['fire-js'] = 'fire-js'),
      (q['firebase-exp'] = 'fire-js-all'),
      q),
    W = new Map(),
    $ = new Map();
  function Y(t, r) {
    try {
      t.container.addComponent(r);
    } catch (e) {
      M.debug(
        'Component ' +
          r.name +
          ' failed to register with FirebaseApp ' +
          t.name,
        e
      );
    }
  }
  function K(e, t) {
    e.container.addOrOverwriteComponent(t);
  }
  function J(e) {
    var t,
      r,
      n = e.name;
    if ($.has(n))
      return (
        M.debug(
          'There were multiple attempts to register component ' + n + '.'
        ),
        !1
      );
    $.set(n, e);
    try {
      for (var o = l(W.values()), i = o.next(); !i.done; i = o.next()) {
        Y(i.value, e);
      }
    } catch (e) {
      t = { error: e };
    } finally {
      try {
        i && !i.done && (r = o.return) && r.call(o);
      } finally {
        if (t) throw t.error;
      }
    }
    return !0;
  }
  function Z(e, t) {
    return e.container.getProvider(t);
  }
  var q =
      (((he = {})['no-app'] =
        "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
      (he['bad-app-name'] = "Illegal App name: '{$appName}"),
      (he['duplicate-app'] = "Firebase App named '{$appName}' already exists"),
      (he['app-deleted'] = "Firebase App named '{$appName}' already deleted"),
      (he['invalid-app-argument'] =
        'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
      (he['invalid-log-argument'] =
        'First argument to `onLog` must be null or a function.'),
      he),
    Q = new m('app', 'Firebase', q),
    X =
      (Object.defineProperty(ee.prototype, 'automaticDataCollectionEnabled', {
        get: function () {
          return this.checkDestroyed(), this.automaticDataCollectionEnabled_;
        },
        set: function (e) {
          this.checkDestroyed(), (this.automaticDataCollectionEnabled_ = e);
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(ee.prototype, 'name', {
        get: function () {
          return this.checkDestroyed(), this.name_;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(ee.prototype, 'options', {
        get: function () {
          return this.checkDestroyed(), this.options_;
        },
        enumerable: !1,
        configurable: !0
      }),
      (ee.prototype.checkDestroyed = function () {
        if (this.isDeleted)
          throw Q.create('app-deleted', { appName: this.name_ });
      }),
      ee);
  function ee(e, t, r) {
    var n = this;
    (this.isDeleted = !1),
      (this.options_ = p({}, e)),
      (this.name_ = t.name),
      (this.automaticDataCollectionEnabled_ = t.automaticDataCollectionEnabled),
      (this.container = r),
      this.container.addComponent(
        new _(
          'app-exp',
          function () {
            return n;
          },
          'PUBLIC'
        )
      );
  }
  var te,
    re = '0.900.4';
  function ne(e, t) {
    var r, n;
    void 0 === t && (t = {}), 'object' != typeof t && (t = { name: t });
    var o = p({ name: U, automaticDataCollectionEnabled: !1 }, t),
      t = o.name;
    if ('string' != typeof t || !t)
      throw Q.create('bad-app-name', { appName: String(t) });
    if (W.has(t)) throw Q.create('duplicate-app', { appName: t });
    var i = new S(t);
    try {
      for (var a = l($.values()), s = a.next(); !s.done; s = a.next()) {
        var c = s.value;
        i.addComponent(c);
      }
    } catch (e) {
      r = { error: e };
    } finally {
      try {
        s && !s.done && (n = a.return) && n.call(a);
      } finally {
        if (r) throw r.error;
      }
    }
    o = new X(e, o, i);
    return W.set(t, o), o;
  }
  function oe(r) {
    return e(this, void 0, void 0, function () {
      var t;
      return n(this, function (e) {
        switch (e.label) {
          case 0:
            return ((t = r.name), W.has(t))
              ? (W.delete(t),
                [
                  4,
                  Promise.all(
                    r.container.getProviders().map(function (e) {
                      return e.delete();
                    })
                  )
                ])
              : [3, 2];
          case 1:
            e.sent(), (r.isDeleted = !0), (e.label = 2);
          case 2:
            return [2];
        }
      });
    });
  }
  function ie(e, t, r) {
    var n = null !== (o = G[e]) && void 0 !== o ? o : e;
    r && (n += '-' + r);
    var o = n.match(/\s|\//),
      e = t.match(/\s|\//);
    if (o || e) {
      r = ['Unable to register library "' + n + '" with version "' + t + '":'];
      return (
        o &&
          r.push(
            'library name "' +
              n +
              '" contains illegal characters (whitespace or "/")'
          ),
        o && e && r.push('and'),
        e &&
          r.push(
            'version name "' +
              t +
              '" contains illegal characters (whitespace or "/")'
          ),
        void M.warn(r.join(' '))
      );
    }
    J(
      new _(
        n + '-version',
        function () {
          return { library: n, version: t };
        },
        'VERSION'
      )
    );
  }
  function ae(e, t) {
    if (null !== e && 'function' != typeof e)
      throw Q.create('invalid-log-argument', { appName: name });
    !(function (a, t) {
      for (var e = 0, r = D; e < r.length; e++) {
        !(function (e) {
          var i = null;
          t && t.level && (i = F[t.level]),
            (e.userLogHandler =
              null === a
                ? null
                : function (e, t) {
                    for (var r = [], n = 2; n < arguments.length; n++)
                      r[n - 2] = arguments[n];
                    var o = r
                      .map(function (e) {
                        if (null == e) return null;
                        if ('string' == typeof e) return e;
                        if ('number' == typeof e || 'boolean' == typeof e)
                          return e.toString();
                        if (e instanceof Error) return e.message;
                        try {
                          return JSON.stringify(e);
                        } catch (e) {
                          return null;
                        }
                      })
                      .filter(function (e) {
                        return e;
                      })
                      .join(' ');
                    t >= (null != i ? i : e.logLevel) &&
                      a({
                        level: C[t].toLowerCase(),
                        message: o,
                        args: r,
                        type: e.name
                      });
                  });
        })(r[e]);
      }
    })(e, t);
  }
  function se(e) {
    var t;
    (t = e),
      D.forEach(function (e) {
        e.setLogLevel(t);
      });
  }
  J(
    new _(
      'platform-logger',
      function (e) {
        return new z(e);
      },
      'PRIVATE'
    )
  ),
    ie(V, '0.0.900', te),
    ie('fire-js', '');
  var ce = Object.freeze({
      __proto__: null,
      SDK_VERSION: re,
      _DEFAULT_ENTRY_NAME: U,
      _addComponent: Y,
      _addOrOverwriteComponent: K,
      _apps: W,
      _clearComponents: function () {
        $.clear();
      },
      _components: $,
      _getProvider: Z,
      _registerComponent: J,
      _removeServiceInstance: function (e, t, r) {
        void 0 === r && (r = U), Z(e, t).clearInstance(r);
      },
      deleteApp: oe,
      getApp: function (e) {
        void 0 === e && (e = U);
        var t = W.get(e);
        if (!t) throw Q.create('no-app', { appName: e });
        return t;
      },
      getApps: function () {
        return Array.from(W.values());
      },
      initializeApp: ne,
      onLog: ae,
      registerVersion: ie,
      setLogLevel: se
    }),
    pe =
      (Object.defineProperty(le.prototype, 'automaticDataCollectionEnabled', {
        get: function () {
          return this.app.automaticDataCollectionEnabled;
        },
        set: function (e) {
          this.app.automaticDataCollectionEnabled = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(le.prototype, 'name', {
        get: function () {
          return this.app.name;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(le.prototype, 'options', {
        get: function () {
          return this.app.options;
        },
        enumerable: !1,
        configurable: !0
      }),
      (le.prototype.delete = function () {
        var t = this;
        return new Promise(function (e) {
          t.app.checkDestroyed(), e();
        }).then(function () {
          return t.firebase.INTERNAL.removeApp(t.name), oe(t.app);
        });
      }),
      (le.prototype._getService = function (e, t) {
        return (
          void 0 === t && (t = U),
          this.app.checkDestroyed(),
          this.app.container.getProvider(e).getImmediate({ identifier: t })
        );
      }),
      (le.prototype._removeServiceInstance = function (e, t) {
        void 0 === t && (t = U),
          this.app.container.getProvider(e).clearInstance(t);
      }),
      (le.prototype._addComponent = function (e) {
        Y(this.app, e);
      }),
      (le.prototype._addOrOverwriteComponent = function (e) {
        K(this.app, e);
      }),
      le);
  function le(e, t) {
    var r = this;
    (this.app = e),
      (this.firebase = t),
      Y(
        e,
        new _(
          'app',
          function () {
            return r;
          },
          'PUBLIC'
        )
      ),
      (this.container = e.container);
  }
  var q =
      (((he = {})['no-app'] =
        "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
      (he['invalid-app-argument'] =
        'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
      he),
    ue = new m('app-compat', 'Firebase', q);
  function fe(o) {
    var n = {},
      i = {
        __esModule: !0,
        initializeApp: function (e, t) {
          void 0 === t && (t = {});
          (e = ne(e, t)), (t = new o(e, i));
          return (n[e.name] = t);
        },
        app: t,
        registerVersion: ie,
        setLogLevel: se,
        onLog: ae,
        apps: null,
        SDK_VERSION: re,
        INTERNAL: {
          registerComponent: function (r) {
            var n = r.name;
            {
              var e;
              J(r) &&
                'PUBLIC' === r.type &&
                ((e = function (e) {
                  if ((void 0 === e && (e = t()), 'function' != typeof e[n]))
                    throw ue.create('invalid-app-argument', { appName: n });
                  return e[n]();
                }),
                void 0 !== r.serviceProps && a(e, r.serviceProps),
                (i[n] = e),
                (o.prototype[n] = function () {
                  for (var e = [], t = 0; t < arguments.length; t++)
                    e[t] = arguments[t];
                  return this._getService
                    .bind(this, n)
                    .apply(this, r.multipleInstances ? e : []);
                }));
            }
            return 'PUBLIC' === r.type ? i[n] : null;
          },
          removeApp: function (e) {
            delete n[e];
          },
          useAsService: function (e, t) {
            if ('serverAuth' === t) return null;
            return t;
          },
          modularAPIs: ce
        }
      };
    function t(e) {
      if (
        ((t = n), (r = e = e || U), !Object.prototype.hasOwnProperty.call(t, r))
      )
        throw ue.create('no-app', { appName: e });
      var t, r;
      return n[e];
    }
    return (
      (i.default = i),
      Object.defineProperty(i, 'apps', {
        get: function () {
          return Object.keys(n).map(function (e) {
            return n[e];
          });
        }
      }),
      (t.App = o),
      i
    );
  }
  var he = (function e() {
      var t = fe(pe);
      return (
        (t.INTERNAL = p(p({}, t.INTERNAL), {
          createFirebaseNamespace: e,
          extendNamespace: function (e) {
            a(t, e);
          },
          createSubscribe: g,
          ErrorFactory: m,
          deepExtend: a
        })),
        t
      );
    })(),
    q = new k('@firebase/app-compat');
  'object' == typeof self &&
    self.self === self &&
    void 0 !== self.firebase &&
    (q.warn(
      '\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  '
    ),
    (k = self.firebase.SDK_VERSION) &&
      0 <= k.indexOf('LITE') &&
      q.warn(
        '\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    '
      ));
  ie('@firebase/app-compat', '0.0.900', void 0);
  return he.registerVersion('firebase-exp', '0.900.4', 'app-compat-cdn'), he;
});
//# sourceMappingURL=firebase-app-compat.js.map
