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
  var c = function () {
    return (c =
      Object.assign ||
      function (e) {
        for (var t, r = 1, n = arguments.length; r < n; r++)
          for (var i in (t = arguments[r]))
            Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
        return e;
      }).apply(this, arguments);
  };
  function e(e, a, s, p) {
    return new (s = s || Promise)(function (r, t) {
      function n(e) {
        try {
          o(p.next(e));
        } catch (e) {
          t(e);
        }
      }
      function i(e) {
        try {
          o(p.throw(e));
        } catch (e) {
          t(e);
        }
      }
      function o(e) {
        var t;
        e.done
          ? r(e.value)
          : ((t = e.value) instanceof s
              ? t
              : new s(function (e) {
                  e(t);
                })
            ).then(n, i);
      }
      o((p = p.apply(e, a || [])).next());
    });
  }
  function n(r, n) {
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
              t = n.call(r, s);
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
      i,
      o = r.call(e),
      a = [];
    try {
      for (; (void 0 === t || 0 < t--) && !(n = o.next()).done; )
        a.push(n.value);
    } catch (e) {
      i = { error: e };
    } finally {
      try {
        n && !n.done && (r = o.return) && r.call(o);
      } finally {
        if (i) throw i.error;
      }
    }
    return a;
  }
  var i =
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
  var o,
    a,
    s,
    p = 'FirebaseError',
    f =
      ((o = Error),
      r((a = d), (s = o)),
      (a.prototype =
        null === s ? Object.create(s) : ((h.prototype = s.prototype), new h())),
      d);
  function h() {
    this.constructor = a;
  }
  function d(e, t, r) {
    t = o.call(this, t) || this;
    return (
      (t.code = e),
      (t.customData = r),
      (t.name = p),
      Object.setPrototypeOf(t, d.prototype),
      Error.captureStackTrace && Error.captureStackTrace(t, m.prototype.create),
      t
    );
  }
  var m =
    ((v.prototype.create = function (e) {
      for (var t = [], r = 1; r < arguments.length; r++)
        t[r - 1] = arguments[r];
      var n,
        i = t[0] || {},
        o = this.service + '/' + e,
        e = this.errors[e],
        e = e
          ? ((n = i),
            e.replace(g, function (e, t) {
              var r = n[t];
              return null != r ? String(r) : '<' + t + '?>';
            }))
          : 'Error',
        e = this.serviceName + ': ' + e + ' (' + o + ').';
      return new f(o, e, i);
    }),
    v);
  function v(e, t, r) {
    (this.service = e), (this.serviceName = t), (this.errors = r);
  }
  var g = /\{\$([^}]+)}/g;
  var y =
    ((b.prototype.setInstantiationMode = function (e) {
      return (this.instantiationMode = e), this;
    }),
    (b.prototype.setMultipleInstances = function (e) {
      return (this.multipleInstances = e), this;
    }),
    (b.prototype.setServiceProps = function (e) {
      return (this.serviceProps = e), this;
    }),
    b);
  function b(e, t, r) {
    (this.name = e),
      (this.instanceFactory = t),
      (this.type = r),
      (this.multipleInstances = !1),
      (this.serviceProps = {}),
      (this.instantiationMode = 'LAZY');
  }
  var w = '[DEFAULT]',
    E =
      ((_.prototype.get = function (e) {
        void 0 === e && (e = w);
        var t = this.normalizeInstanceIdentifier(e);
        if (!this.instancesDeferred.has(t)) {
          var r = new i();
          this.instancesDeferred.set(t, r);
          try {
            var n = this.getOrInitializeService(t);
            n && r.resolve(n);
          } catch (e) {}
        }
        return this.instancesDeferred.get(t).promise;
      }),
      (_.prototype.getImmediate = function (e) {
        var t = c({ identifier: w, optional: !1 }, e),
          e = t.identifier,
          r = t.optional,
          n = this.normalizeInstanceIdentifier(e);
        try {
          var i = this.getOrInitializeService(n);
          if (i) return i;
          if (r) return null;
          throw Error('Service ' + this.name + ' is not available');
        } catch (e) {
          if (r) return null;
          throw e;
        }
      }),
      (_.prototype.getComponent = function () {
        return this.component;
      }),
      (_.prototype.setComponent = function (e) {
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
            this.getOrInitializeService(w);
          } catch (e) {}
        try {
          for (
            var n = l(this.instancesDeferred.entries()), i = n.next();
            !i.done;
            i = n.next()
          ) {
            var o = u(i.value, 2),
              a = o[0],
              s = o[1],
              p = this.normalizeInstanceIdentifier(a);
            try {
              var c = this.getOrInitializeService(p);
              s.resolve(c);
            } catch (e) {}
          }
        } catch (e) {
          t = { error: e };
        } finally {
          try {
            i && !i.done && (r = n.return) && r.call(n);
          } finally {
            if (t) throw t.error;
          }
        }
      }),
      (_.prototype.clearInstance = function (e) {
        void 0 === e && (e = w),
          this.instancesDeferred.delete(e),
          this.instances.delete(e);
      }),
      (_.prototype.delete = function () {
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
      (_.prototype.isComponentSet = function () {
        return null != this.component;
      }),
      (_.prototype.getOrInitializeService = function (e) {
        var t,
          r = this.instances.get(e);
        return (
          !r &&
            this.component &&
            ((r = this.component.instanceFactory(
              this.container,
              (t = e) === w ? void 0 : t
            )),
            this.instances.set(e, r)),
          r || null
        );
      }),
      (_.prototype.normalizeInstanceIdentifier = function (e) {
        return !this.component || this.component.multipleInstances ? e : w;
      }),
      _);
  function _(e, t) {
    (this.name = e),
      (this.container = t),
      (this.component = null),
      (this.instances = new Map()),
      (this.instancesDeferred = new Map());
  }
  var O =
    ((I.prototype.addComponent = function (e) {
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
    (I.prototype.addOrOverwriteComponent = function (e) {
      this.getProvider(e.name).isComponentSet() &&
        this.providers.delete(e.name),
        this.addComponent(e);
    }),
    (I.prototype.getProvider = function (e) {
      if (this.providers.has(e)) return this.providers.get(e);
      var t = new E(e, this);
      return this.providers.set(e, t), t;
    }),
    (I.prototype.getProviders = function () {
      return Array.from(this.providers.values());
    }),
    I);
  function I(e) {
    (this.name = e), (this.providers = new Map());
  }
  function N() {
    for (var e = 0, t = 0, r = arguments.length; t < r; t++)
      e += arguments[t].length;
    for (var n = Array(e), i = 0, t = 0; t < r; t++)
      for (var o = arguments[t], a = 0, s = o.length; a < s; a++, i++)
        n[i] = o[a];
    return n;
  }
  var L,
    A = [];
  ((D = L = L || {})[(D.DEBUG = 0)] = 'DEBUG'),
    (D[(D.VERBOSE = 1)] = 'VERBOSE'),
    (D[(D.INFO = 2)] = 'INFO'),
    (D[(D.WARN = 3)] = 'WARN'),
    (D[(D.ERROR = 4)] = 'ERROR'),
    (D[(D.SILENT = 5)] = 'SILENT');
  function S(e, t) {
    for (var r = [], n = 2; n < arguments.length; n++) r[n - 2] = arguments[n];
    if (!(t < e.logLevel)) {
      var i = new Date().toISOString(),
        o = C[t];
      if (!o)
        throw new Error(
          'Attempted to log a message with an invalid logType (value: ' +
            t +
            ')'
        );
      console[o].apply(console, N(['[' + i + ']  ' + e.name + ':'], r));
    }
  }
  var R = {
      debug: L.DEBUG,
      verbose: L.VERBOSE,
      info: L.INFO,
      warn: L.WARN,
      error: L.ERROR,
      silent: L.SILENT
    },
    P = L.INFO,
    C =
      (((D = {})[L.DEBUG] = 'log'),
      (D[L.VERBOSE] = 'log'),
      (D[L.INFO] = 'info'),
      (D[L.WARN] = 'warn'),
      (D[L.ERROR] = 'error'),
      D),
    D =
      (Object.defineProperty(j.prototype, 'logLevel', {
        get: function () {
          return this._logLevel;
        },
        set: function (e) {
          if (!(e in L))
            throw new TypeError(
              'Invalid value "' + e + '" assigned to `logLevel`'
            );
          this._logLevel = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      (j.prototype.setLogLevel = function (e) {
        this._logLevel = 'string' == typeof e ? R[e] : e;
      }),
      Object.defineProperty(j.prototype, 'logHandler', {
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
      Object.defineProperty(j.prototype, 'userLogHandler', {
        get: function () {
          return this._userLogHandler;
        },
        set: function (e) {
          this._userLogHandler = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      (j.prototype.debug = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, N([this, L.DEBUG], e)),
          this._logHandler.apply(this, N([this, L.DEBUG], e));
      }),
      (j.prototype.log = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, N([this, L.VERBOSE], e)),
          this._logHandler.apply(this, N([this, L.VERBOSE], e));
      }),
      (j.prototype.info = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, N([this, L.INFO], e)),
          this._logHandler.apply(this, N([this, L.INFO], e));
      }),
      (j.prototype.warn = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, N([this, L.WARN], e)),
          this._logHandler.apply(this, N([this, L.WARN], e));
      }),
      (j.prototype.error = function () {
        for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
        this._userLogHandler &&
          this._userLogHandler.apply(this, N([this, L.ERROR], e)),
          this._logHandler.apply(this, N([this, L.ERROR], e));
      }),
      j);
  function j(e) {
    (this.name = e),
      (this._logLevel = P),
      (this._logHandler = S),
      (this._userLogHandler = null),
      A.push(this);
  }
  var T =
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
  var H = '@firebase/app-exp',
    x = new D('@firebase/app'),
    k = '[DEFAULT]',
    V =
      (((D = {})[H] = 'fire-core'),
      (D['@firebase/app-compat'] = 'fire-core-compat'),
      (D['@firebase/analytics'] = 'fire-analytics'),
      (D['@firebase/auth'] = 'fire-auth'),
      (D['@firebase/database'] = 'fire-rtdb'),
      (D['@firebase/functions-exp'] = 'fire-fn'),
      (D['@firebase/functions-compat'] = 'fire-fn-compat'),
      (D['@firebase/installations'] = 'fire-iid'),
      (D['@firebase/messaging'] = 'fire-fcm'),
      (D['@firebase/performance'] = 'fire-perf'),
      (D['@firebase/remote-config'] = 'fire-rc'),
      (D['@firebase/storage'] = 'fire-gcs'),
      (D['@firebase/firestore'] = 'fire-fst'),
      (D['fire-js'] = 'fire-js'),
      (D['firebase-exp'] = 'fire-js-all'),
      D),
    B = new Map(),
    U = new Map();
  function z(t, r) {
    try {
      t.container.addComponent(r);
    } catch (e) {
      x.debug(
        'Component ' +
          r.name +
          ' failed to register with FirebaseApp ' +
          t.name,
        e
      );
    }
  }
  function M(e) {
    var t,
      r,
      n = e.name;
    if (U.has(n))
      return (
        x.debug(
          'There were multiple attempts to register component ' + n + '.'
        ),
        !1
      );
    U.set(n, e);
    try {
      for (var i = l(B.values()), o = i.next(); !o.done; o = i.next()) {
        z(o.value, e);
      }
    } catch (e) {
      t = { error: e };
    } finally {
      try {
        o && !o.done && (r = i.return) && r.call(i);
      } finally {
        if (t) throw t.error;
      }
    }
    return !0;
  }
  function G(e, t) {
    return e.container.getProvider(t);
  }
  var D =
      (((D = {})['no-app'] =
        "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
      (D['bad-app-name'] = "Illegal App name: '{$appName}"),
      (D['duplicate-app'] = "Firebase App named '{$appName}' already exists"),
      (D['app-deleted'] = "Firebase App named '{$appName}' already deleted"),
      (D['invalid-app-argument'] =
        'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
      (D['invalid-log-argument'] =
        'First argument to `onLog` must be null or a function.'),
      D),
    $ = new m('app', 'Firebase', D),
    W =
      (Object.defineProperty(K.prototype, 'automaticDataCollectionEnabled', {
        get: function () {
          return this.checkDestroyed(), this.automaticDataCollectionEnabled_;
        },
        set: function (e) {
          this.checkDestroyed(), (this.automaticDataCollectionEnabled_ = e);
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(K.prototype, 'name', {
        get: function () {
          return this.checkDestroyed(), this.name_;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(K.prototype, 'options', {
        get: function () {
          return this.checkDestroyed(), this.options_;
        },
        enumerable: !1,
        configurable: !0
      }),
      (K.prototype.checkDestroyed = function () {
        if (this.isDeleted)
          throw $.create('app-deleted', { appName: this.name_ });
      }),
      K);
  function K(e, t, r) {
    var n = this;
    (this.isDeleted = !1),
      (this.options_ = c({}, e)),
      (this.name_ = t.name),
      (this.automaticDataCollectionEnabled_ = t.automaticDataCollectionEnabled),
      (this.container = r),
      this.container.addComponent(
        new y(
          'app-exp',
          function () {
            return n;
          },
          'PUBLIC'
        )
      );
  }
  var Y,
    J = '0.900.4';
  function Z(e, t) {
    var r, n;
    void 0 === t && (t = {}), 'object' != typeof t && (t = { name: t });
    var i = c({ name: k, automaticDataCollectionEnabled: !1 }, t),
      t = i.name;
    if ('string' != typeof t || !t)
      throw $.create('bad-app-name', { appName: String(t) });
    if (B.has(t)) throw $.create('duplicate-app', { appName: t });
    var o = new O(t);
    try {
      for (var a = l(U.values()), s = a.next(); !s.done; s = a.next()) {
        var p = s.value;
        o.addComponent(p);
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
    i = new W(e, i, o);
    return B.set(t, i), i;
  }
  function q(r) {
    return e(this, void 0, void 0, function () {
      var t;
      return n(this, function (e) {
        switch (e.label) {
          case 0:
            return ((t = r.name), B.has(t))
              ? (B.delete(t),
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
  function Q(e, t, r) {
    var n = null !== (i = V[e]) && void 0 !== i ? i : e;
    r && (n += '-' + r);
    var i = n.match(/\s|\//),
      e = t.match(/\s|\//);
    if (i || e) {
      r = ['Unable to register library "' + n + '" with version "' + t + '":'];
      return (
        i &&
          r.push(
            'library name "' +
              n +
              '" contains illegal characters (whitespace or "/")'
          ),
        i && e && r.push('and'),
        e &&
          r.push(
            'version name "' +
              t +
              '" contains illegal characters (whitespace or "/")'
          ),
        void x.warn(r.join(' '))
      );
    }
    M(
      new y(
        n + '-version',
        function () {
          return { library: n, version: t };
        },
        'VERSION'
      )
    );
  }
  function X(e, t) {
    if (null !== e && 'function' != typeof e)
      throw $.create('invalid-log-argument', { appName: name });
    !(function (a, t) {
      for (var e = 0, r = A; e < r.length; e++) {
        !(function (e) {
          var o = null;
          t && t.level && (o = R[t.level]),
            (e.userLogHandler =
              null === a
                ? null
                : function (e, t) {
                    for (var r = [], n = 2; n < arguments.length; n++)
                      r[n - 2] = arguments[n];
                    var i = r
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
                        level: L[t].toLowerCase(),
                        message: i,
                        args: r,
                        type: e.name
                      });
                  });
        })(r[e]);
      }
    })(e, t);
  }
  function ee(e) {
    var t;
    (t = e),
      A.forEach(function (e) {
        e.setLogLevel(t);
      });
  }
  M(
    new y(
      'platform-logger',
      function (e) {
        return new T(e);
      },
      'PRIVATE'
    )
  ),
    Q(H, '0.0.900', Y),
    Q('fire-js', '');
  var te = Object.freeze({
      __proto__: null,
      SDK_VERSION: J,
      _DEFAULT_ENTRY_NAME: k,
      _addComponent: z,
      _addOrOverwriteComponent: function (e, t) {
        e.container.addOrOverwriteComponent(t);
      },
      _apps: B,
      _clearComponents: function () {
        U.clear();
      },
      _components: U,
      _getProvider: G,
      _registerComponent: M,
      _removeServiceInstance: function (e, t, r) {
        void 0 === r && (r = k), G(e, t).clearInstance(r);
      },
      deleteApp: q,
      getApp: function (e) {
        void 0 === e && (e = k);
        var t = B.get(e);
        if (!t) throw $.create('no-app', { appName: e });
        return t;
      },
      getApps: function () {
        return Array.from(B.values());
      },
      initializeApp: Z,
      onLog: X,
      registerVersion: Q,
      setLogLevel: ee
    }),
    re =
      (Object.defineProperty(ne.prototype, 'automaticDataCollectionEnabled', {
        get: function () {
          return this.app.automaticDataCollectionEnabled;
        },
        set: function (e) {
          this.automaticDataCollectionEnabled = e;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(ne.prototype, 'name', {
        get: function () {
          return this.app.name;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(ne.prototype, 'options', {
        get: function () {
          return this.app.options;
        },
        enumerable: !1,
        configurable: !0
      }),
      (ne.prototype.delete = function () {
        return this.firebase.INTERNAL.removeApp(this.name), q(this.app);
      }),
      (ne.prototype._getService = function (e, t) {
        return (
          void 0 === t && (t = k),
          this.app.checkDestroyed(),
          this.app.container.getProvider(e).getImmediate({ identifier: t })
        );
      }),
      ne);
  function ne(e, t) {
    var r = this;
    (this.app = e),
      (this.firebase = t),
      z(
        e,
        new y(
          'app',
          function () {
            return r;
          },
          'PUBLIC'
        )
      );
  }
  var D =
      (((D = {})['no-app'] =
        "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
      (D['invalid-app-argument'] =
        'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
      D),
    ie = new m('app-compat', 'Firebase', D);
  function oe(i) {
    var n = {},
      o = {
        __esModule: !0,
        initializeApp: function (e, t) {
          void 0 === t && (t = {});
          (e = Z(e, t)), (t = new i(e, o));
          return (n[e.name] = t);
        },
        app: t,
        registerVersion: Q,
        setLogLevel: ee,
        onLog: X,
        apps: null,
        SDK_VERSION: J,
        INTERNAL: {
          registerComponent: function (r) {
            var n = r.name;
            {
              var e;
              M(r) &&
                'PUBLIC' === r.type &&
                ((e = function (e) {
                  if ((void 0 === e && (e = t()), 'function' != typeof e[n]))
                    throw ie.create('invalid-app-argument', { appName: n });
                  return e[n]();
                }),
                void 0 !== r.serviceProps &&
                  (function e(t, r) {
                    if (!(r instanceof Object)) return r;
                    switch (r.constructor) {
                      case Date:
                        return new Date(r.getTime());
                      case Object:
                        void 0 === t && (t = {});
                        break;
                      case Array:
                        t = [];
                        break;
                      default:
                        return r;
                    }
                    for (var n in r)
                      r.hasOwnProperty(n) &&
                        '__proto__' !== n &&
                        (t[n] = e(t[n], r[n]));
                    return t;
                  })(e, r.serviceProps),
                (o[n] = e),
                (i.prototype[n] = function () {
                  for (var e = [], t = 0; t < arguments.length; t++)
                    e[t] = arguments[t];
                  return this._getService
                    .bind(this, n)
                    .apply(this, r.multipleInstances ? e : []);
                }));
            }
            return 'PUBLIC' === r.type ? o[n] : null;
          },
          removeApp: function (e) {
            delete n[e];
          },
          useAsService: function (e, t) {
            if ('serverAuth' === t) return null;
            return t;
          },
          modularAPIs: te
        }
      };
    function t(e) {
      if (
        ((t = n), (r = e = e || k), !Object.prototype.hasOwnProperty.call(t, r))
      )
        throw ie.create('no-app', { appName: e });
      var t, r;
      return n[e];
    }
    return (
      (o.default = o),
      Object.defineProperty(o, 'apps', {
        get: function () {
          return Object.keys(n).map(function (e) {
            return n[e];
          });
        }
      }),
      (t.App = i),
      o
    );
  }
  D = (function () {
    var e = oe(re);
    e.SDK_VERSION = e.SDK_VERSION + '_LITE';
    var t = e.INTERNAL.registerComponent;
    return (
      (e.INTERNAL.registerComponent = function (e) {
        if (
          'PUBLIC' !== e.type ||
          'performance' === e.name ||
          'installations' === e.name
        )
          return t(e);
        throw Error(
          name + ' cannot register with the standalone perf instance'
        );
      }),
      e
    );
  })();
  Q('@firebase/app-compat', '0.0.900', 'lite');
  D.registerVersion('firebase-exp', '0.900.4', 'app-compat');
  return D.registerVersion('firebase-exp', '0.900.4', 'compat-lite'), D;
});
//# sourceMappingURL=firebase-performance-standalone-compat.js.map
