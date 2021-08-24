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
    ? t(exports)
    : 'function' == typeof define && define.amd
    ? define(['exports'], t)
    : t(
        (((e =
          'undefined' != typeof globalThis ? globalThis : e || self).firebase =
          e.firebase || {}),
        (e.firebase.app = {}))
      );
})(this, function (e) {
  'use strict';
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
  var c = function () {
    return (c =
      Object.assign ||
      function (e) {
        for (var t, n = 1, r = arguments.length; n < r; n++)
          for (var i in (t = arguments[n]))
            Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
        return e;
      }).apply(this, arguments);
  };
  function t(e, a, s, l) {
    return new (s = s || Promise)(function (n, t) {
      function r(e) {
        try {
          o(l.next(e));
        } catch (e) {
          t(e);
        }
      }
      function i(e) {
        try {
          o(l.throw(e));
        } catch (e) {
          t(e);
        }
      }
      function o(e) {
        var t;
        e.done
          ? n(e.value)
          : ((t = e.value) instanceof s
              ? t
              : new s(function (e) {
                  e(t);
                })
            ).then(r, i);
      }
      o((l = l.apply(e, a || [])).next());
    });
  }
  function r(n, r) {
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
          for (; s; )
            try {
              if (
                ((i = 1),
                o &&
                  (a =
                    2 & t[0]
                      ? o.return
                      : t[0]
                      ? o.throw || ((a = o.return) && a.call(o), 0)
                      : o.next) &&
                  !(a = a.call(o, t[1])).done)
              )
                return a;
              switch (((o = 0), a && (t = [2 & t[0], a.value]), t[0])) {
                case 0:
                case 1:
                  a = t;
                  break;
                case 4:
                  return s.label++, { value: t[1], done: !1 };
                case 5:
                  s.label++, (o = t[1]), (t = [0]);
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
              (t = [6, e]), (o = 0);
            } finally {
              i = a = 0;
            }
          if (5 & t[0]) throw t[1];
          return { value: t[0] ? t[1] : void 0, done: !0 };
        })([t, e]);
      };
    }
  }
  function p(e) {
    var t = 'function' == typeof Symbol && Symbol.iterator,
      n = t && e[t],
      r = 0;
    if (n) return n.call(e);
    if (e && 'number' == typeof e.length)
      return {
        next: function () {
          return (
            e && r >= e.length && (e = void 0), { value: e && e[r++], done: !e }
          );
        }
      };
    throw new TypeError(
      t ? 'Object is not iterable.' : 'Symbol.iterator is not defined.'
    );
  }
  function u(e, t) {
    var n = 'function' == typeof Symbol && e[Symbol.iterator];
    if (!n) return e;
    var r,
      i,
      o = n.call(e),
      a = [];
    try {
      for (; (void 0 === t || 0 < t--) && !(r = o.next()).done; )
        a.push(r.value);
    } catch (e) {
      i = { error: e };
    } finally {
      try {
        r && !r.done && (n = o.return) && n.call(o);
      } finally {
        if (i) throw i.error;
      }
    }
    return a;
  }
  var i =
    ((o.prototype.wrapCallback = function (n) {
      var r = this;
      return function (e, t) {
        e ? r.reject(e) : r.resolve(t),
          'function' == typeof n &&
            (r.promise.catch(function () {}), 1 === n.length ? n(e) : n(e, t));
      };
    }),
    o);
  function o() {
    var n = this;
    (this.reject = function () {}),
      (this.resolve = function () {}),
      (this.promise = new Promise(function (e, t) {
        (n.resolve = e), (n.reject = t);
      }));
  }
  var a,
    s,
    l,
    f = 'FirebaseError',
    h =
      ((a = Error),
      n((s = v), (l = a)),
      (s.prototype =
        null === l ? Object.create(l) : ((d.prototype = l.prototype), new d())),
      v);
  function d() {
    this.constructor = s;
  }
  function v(e, t, n) {
    t = a.call(this, t) || this;
    return (
      (t.code = e),
      (t.customData = n),
      (t.name = f),
      Object.setPrototypeOf(t, v.prototype),
      Error.captureStackTrace && Error.captureStackTrace(t, m.prototype.create),
      t
    );
  }
  var m =
    ((y.prototype.create = function (e) {
      for (var t = [], n = 1; n < arguments.length; n++)
        t[n - 1] = arguments[n];
      var r,
        i = t[0] || {},
        o = this.service + '/' + e,
        e = this.errors[e],
        e = e
          ? ((r = i),
            e.replace(g, function (e, t) {
              var n = r[t];
              return null != n ? String(n) : '<' + t + '?>';
            }))
          : 'Error',
        e = this.serviceName + ': ' + e + ' (' + o + ').';
      return new h(o, e, i);
    }),
    y);
  function y(e, t, n) {
    (this.service = e), (this.serviceName = t), (this.errors = n);
  }
  var g = /\{\$([^}]+)}/g,
    b =
      ((w.prototype.setInstantiationMode = function (e) {
        return (this.instantiationMode = e), this;
      }),
      (w.prototype.setMultipleInstances = function (e) {
        return (this.multipleInstances = e), this;
      }),
      (w.prototype.setServiceProps = function (e) {
        return (this.serviceProps = e), this;
      }),
      w);
  function w(e, t, n) {
    (this.name = e),
      (this.instanceFactory = t),
      (this.type = n),
      (this.multipleInstances = !1),
      (this.serviceProps = {}),
      (this.instantiationMode = 'LAZY');
  }
  var E = '[DEFAULT]',
    _ =
      ((O.prototype.get = function (e) {
        void 0 === e && (e = E);
        var t = this.normalizeInstanceIdentifier(e);
        if (!this.instancesDeferred.has(t)) {
          var n = new i();
          this.instancesDeferred.set(t, n);
          try {
            var r = this.getOrInitializeService(t);
            r && n.resolve(r);
          } catch (e) {}
        }
        return this.instancesDeferred.get(t).promise;
      }),
      (O.prototype.getImmediate = function (e) {
        var t = c({ identifier: E, optional: !1 }, e),
          e = t.identifier,
          n = t.optional,
          r = this.normalizeInstanceIdentifier(e);
        try {
          var i = this.getOrInitializeService(r);
          if (i) return i;
          if (n) return null;
          throw Error('Service ' + this.name + ' is not available');
        } catch (e) {
          if (n) return null;
          throw e;
        }
      }),
      (O.prototype.getComponent = function () {
        return this.component;
      }),
      (O.prototype.setComponent = function (e) {
        var t, n;
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
            this.getOrInitializeService(E);
          } catch (e) {}
        try {
          for (
            var r = p(this.instancesDeferred.entries()), i = r.next();
            !i.done;
            i = r.next()
          ) {
            var o = u(i.value, 2),
              a = o[0],
              s = o[1],
              l = this.normalizeInstanceIdentifier(a);
            try {
              var c = this.getOrInitializeService(l);
              s.resolve(c);
            } catch (e) {}
          }
        } catch (e) {
          t = { error: e };
        } finally {
          try {
            i && !i.done && (n = r.return) && n.call(r);
          } finally {
            if (t) throw t.error;
          }
        }
      }),
      (O.prototype.clearInstance = function (e) {
        void 0 === e && (e = E),
          this.instancesDeferred.delete(e),
          this.instances.delete(e);
      }),
      (O.prototype.delete = function () {
        return t(this, void 0, void 0, function () {
          var t;
          return r(this, function (e) {
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
      (O.prototype.isComponentSet = function () {
        return null != this.component;
      }),
      (O.prototype.getOrInitializeService = function (e) {
        var t,
          n = this.instances.get(e);
        return (
          !n &&
            this.component &&
            ((n = this.component.instanceFactory(
              this.container,
              (t = e) === E ? void 0 : t
            )),
            this.instances.set(e, n)),
          n || null
        );
      }),
      (O.prototype.normalizeInstanceIdentifier = function (e) {
        return !this.component || this.component.multipleInstances ? e : E;
      }),
      O);
  function O(e, t) {
    (this.name = e),
      (this.container = t),
      (this.component = null),
      (this.instances = new Map()),
      (this.instancesDeferred = new Map());
  }
  var I =
    ((L.prototype.addComponent = function (e) {
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
    (L.prototype.addOrOverwriteComponent = function (e) {
      this.getProvider(e.name).isComponentSet() &&
        this.providers.delete(e.name),
        this.addComponent(e);
    }),
    (L.prototype.getProvider = function (e) {
      if (this.providers.has(e)) return this.providers.get(e);
      var t = new _(e, this);
      return this.providers.set(e, t), t;
    }),
    (L.prototype.getProviders = function () {
      return Array.from(this.providers.values());
    }),
    L);
  function L(e) {
    (this.name = e), (this.providers = new Map());
  }
  function S() {
    for (var e = 0, t = 0, n = arguments.length; t < n; t++)
      e += arguments[t].length;
    for (var r = Array(e), i = 0, t = 0; t < n; t++)
      for (var o = arguments[t], a = 0, s = o.length; a < s; a++, i++)
        r[i] = o[a];
    return r;
  }
  var N,
    R = [];
  ((j = N = N || {})[(j.DEBUG = 0)] = 'DEBUG'),
    (j[(j.VERBOSE = 1)] = 'VERBOSE'),
    (j[(j.INFO = 2)] = 'INFO'),
    (j[(j.WARN = 3)] = 'WARN'),
    (j[(j.ERROR = 4)] = 'ERROR'),
    (j[(j.SILENT = 5)] = 'SILENT');
  function A(e, t) {
    for (var n = [], r = 2; r < arguments.length; r++) n[r - 2] = arguments[r];
    if (!(t < e.logLevel)) {
      var i = new Date().toISOString(),
        o = P[t];
      if (!o)
        throw new Error(
          'Attempted to log a message with an invalid logType (value: ' +
            t +
            ')'
        );
      console[o].apply(console, S(['[' + i + ']  ' + e.name + ':'], n));
    }
  }
  var D = {
      debug: N.DEBUG,
      verbose: N.VERBOSE,
      info: N.INFO,
      warn: N.WARN,
      error: N.ERROR,
      silent: N.SILENT
    },
    C = N.INFO,
    P =
      (((j = {})[N.DEBUG] = 'log'),
      (j[N.VERBOSE] = 'log'),
      (j[N.INFO] = 'info'),
      (j[N.WARN] = 'warn'),
      (j[N.ERROR] = 'error'),
      j),
    j =
      (Object.defineProperty(H.prototype, 'logLevel', {
        get: function () {
          return this._logLevel;
        },
        set: function (e) {
          if (!(e in N))
            throw new TypeError(
              'Invalid value "' + e + '" assigned to `logLevel`'
            );
          this._logLevel = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      (H.prototype.setLogLevel = function (e) {
        this._logLevel = 'string' == typeof e ? D[e] : e;
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
          this._userLogHandler.apply(this, S([this, N.DEBUG], e)),
          this._logHandler.apply(this, S([this, N.DEBUG], e));
      }),
      (H.prototype.log = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, S([this, N.VERBOSE], e)),
          this._logHandler.apply(this, S([this, N.VERBOSE], e));
      }),
      (H.prototype.info = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, S([this, N.INFO], e)),
          this._logHandler.apply(this, S([this, N.INFO], e));
      }),
      (H.prototype.warn = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, S([this, N.WARN], e)),
          this._logHandler.apply(this, S([this, N.WARN], e));
      }),
      (H.prototype.error = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, S([this, N.ERROR], e)),
          this._logHandler.apply(this, S([this, N.ERROR], e));
      }),
      H);
  function H(e) {
    (this.name = e),
      (this._logLevel = C),
      (this._logHandler = A),
      (this._userLogHandler = null),
      R.push(this);
  }
  var x =
    ((F.prototype.getPlatformInfoString = function () {
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
    F);
  function F(e) {
    this.container = e;
  }
  var T = '@firebase/app-exp',
    k = new j('@firebase/app'),
    B = '[DEFAULT]',
    M =
      (((j = {})[T] = 'fire-core'),
      (j['@firebase/app-compat'] = 'fire-core-compat'),
      (j['@firebase/analytics'] = 'fire-analytics'),
      (j['@firebase/auth'] = 'fire-auth'),
      (j['@firebase/database'] = 'fire-rtdb'),
      (j['@firebase/functions-exp'] = 'fire-fn'),
      (j['@firebase/functions-compat'] = 'fire-fn-compat'),
      (j['@firebase/installations'] = 'fire-iid'),
      (j['@firebase/messaging'] = 'fire-fcm'),
      (j['@firebase/performance'] = 'fire-perf'),
      (j['@firebase/remote-config'] = 'fire-rc'),
      (j['@firebase/storage'] = 'fire-gcs'),
      (j['@firebase/firestore'] = 'fire-fst'),
      (j['fire-js'] = 'fire-js'),
      (j['firebase-exp'] = 'fire-js-all'),
      j),
    V = new Map(),
    z = new Map();
  function U(t, n) {
    try {
      t.container.addComponent(n);
    } catch (e) {
      k.debug(
        'Component ' +
          n.name +
          ' failed to register with FirebaseApp ' +
          t.name,
        e
      );
    }
  }
  function G(e) {
    var t,
      n,
      r = e.name;
    if (z.has(r))
      return (
        k.debug(
          'There were multiple attempts to register component ' + r + '.'
        ),
        !1
      );
    z.set(r, e);
    try {
      for (var i = p(V.values()), o = i.next(); !o.done; o = i.next()) {
        U(o.value, e);
      }
    } catch (e) {
      t = { error: e };
    } finally {
      try {
        o && !o.done && (n = i.return) && n.call(i);
      } finally {
        if (t) throw t.error;
      }
    }
    return !0;
  }
  function W(e, t) {
    return e.container.getProvider(t);
  }
  var j =
      (((j = {})['no-app'] =
        "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
      (j['bad-app-name'] = "Illegal App name: '{$appName}"),
      (j['duplicate-app'] = "Firebase App named '{$appName}' already exists"),
      (j['app-deleted'] = "Firebase App named '{$appName}' already deleted"),
      (j['invalid-app-argument'] =
        'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
      (j['invalid-log-argument'] =
        'First argument to `onLog` must be null or a function.'),
      j),
    $ = new m('app', 'Firebase', j),
    Y =
      (Object.defineProperty(J.prototype, 'automaticDataCollectionEnabled', {
        get: function () {
          return this.checkDestroyed(), this.automaticDataCollectionEnabled_;
        },
        set: function (e) {
          this.checkDestroyed(), (this.automaticDataCollectionEnabled_ = e);
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(J.prototype, 'name', {
        get: function () {
          return this.checkDestroyed(), this.name_;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(J.prototype, 'options', {
        get: function () {
          return this.checkDestroyed(), this.options_;
        },
        enumerable: !1,
        configurable: !0
      }),
      (J.prototype.checkDestroyed = function () {
        if (this.isDeleted)
          throw $.create('app-deleted', { appName: this.name_ });
      }),
      J);
  function J(e, t, n) {
    var r = this;
    (this.isDeleted = !1),
      (this.options_ = c({}, e)),
      (this.name_ = t.name),
      (this.automaticDataCollectionEnabled_ = t.automaticDataCollectionEnabled),
      (this.container = n),
      this.container.addComponent(
        new b(
          'app-exp',
          function () {
            return r;
          },
          'PUBLIC'
        )
      );
  }
  var K;
  function Z(e, t, n) {
    var r = null !== (i = M[e]) && void 0 !== i ? i : e;
    n && (r += '-' + n);
    var i = r.match(/\s|\//),
      e = t.match(/\s|\//);
    if (i || e) {
      n = ['Unable to register library "' + r + '" with version "' + t + '":'];
      return (
        i &&
          n.push(
            'library name "' +
              r +
              '" contains illegal characters (whitespace or "/")'
          ),
        i && e && n.push('and'),
        e &&
          n.push(
            'version name "' +
              t +
              '" contains illegal characters (whitespace or "/")'
          ),
        void k.warn(n.join(' '))
      );
    }
    G(
      new b(
        r + '-version',
        function () {
          return { library: r, version: t };
        },
        'VERSION'
      )
    );
  }
  G(
    new b(
      'platform-logger',
      function (e) {
        return new x(e);
      },
      'PRIVATE'
    )
  ),
    Z(T, '0.0.900', K),
    Z('fire-js', '');
  Z('firebase-exp', '0.900.4', 'cdn'),
    (e.SDK_VERSION = '0.900.4'),
    (e._DEFAULT_ENTRY_NAME = B),
    (e._addComponent = U),
    (e._addOrOverwriteComponent = function (e, t) {
      e.container.addOrOverwriteComponent(t);
    }),
    (e._apps = V),
    (e._clearComponents = function () {
      z.clear();
    }),
    (e._components = z),
    (e._getProvider = W),
    (e._registerComponent = G),
    (e._removeServiceInstance = function (e, t, n) {
      void 0 === n && (n = B), W(e, t).clearInstance(n);
    }),
    (e.deleteApp = function (n) {
      return t(this, void 0, void 0, function () {
        var t;
        return r(this, function (e) {
          switch (e.label) {
            case 0:
              return ((t = n.name), V.has(t))
                ? (V.delete(t),
                  [
                    4,
                    Promise.all(
                      n.container.getProviders().map(function (e) {
                        return e.delete();
                      })
                    )
                  ])
                : [3, 2];
            case 1:
              e.sent(), (n.isDeleted = !0), (e.label = 2);
            case 2:
              return [2];
          }
        });
      });
    }),
    (e.getApp = function (e) {
      void 0 === e && (e = B);
      var t = V.get(e);
      if (!t) throw $.create('no-app', { appName: e });
      return t;
    }),
    (e.getApps = function () {
      return Array.from(V.values());
    }),
    (e.initializeApp = function (e, t) {
      var n, r;
      void 0 === t && (t = {}), 'object' != typeof t && (t = { name: t });
      var i = c({ name: B, automaticDataCollectionEnabled: !1 }, t);
      if ('string' != typeof (t = i.name) || !t)
        throw $.create('bad-app-name', { appName: String(t) });
      if (V.has(t)) throw $.create('duplicate-app', { appName: t });
      var o = new I(t);
      try {
        for (var a = p(z.values()), s = a.next(); !s.done; s = a.next()) {
          var l = s.value;
          o.addComponent(l);
        }
      } catch (e) {
        n = { error: e };
      } finally {
        try {
          s && !s.done && (r = a.return) && r.call(a);
        } finally {
          if (n) throw n.error;
        }
      }
      return (i = new Y(e, i, o)), V.set(t, i), i;
    }),
    (e.onLog = function (e, t) {
      if (null !== e && 'function' != typeof e)
        throw $.create('invalid-log-argument', { appName: name });
      !(function (a, t) {
        for (var e = 0, n = R; e < n.length; e++) {
          !(function (e) {
            var o = null;
            t && t.level && (o = D[t.level]),
              (e.userLogHandler =
                null === a
                  ? null
                  : function (e, t) {
                      for (var n = [], r = 2; r < arguments.length; r++)
                        n[r - 2] = arguments[r];
                      var i = n
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
                      t >= (null != o ? o : e.logLevel) &&
                        a({
                          level: N[t].toLowerCase(),
                          message: i,
                          args: n,
                          type: e.name
                        });
                    });
          })(n[e]);
        }
      })(e, t);
    }),
    (e.registerVersion = Z),
    (e.setLogLevel = function (e) {
      var t;
      (t = e),
        R.forEach(function (e) {
          e.setLogLevel(t);
        });
    }),
    Object.defineProperty(e, '__esModule', { value: !0 });
});
//# sourceMappingURL=firebase-app.js.map
