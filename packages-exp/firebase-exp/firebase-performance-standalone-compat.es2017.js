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
  /**
   * @license
   * Copyright 2017 Google LLC
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
   */ function e(t, n) {
    if (!(n instanceof Object)) return n;
    switch (n.constructor) {
      case Date:
        return new Date(n.getTime());
      case Object:
        void 0 === t && (t = {});
        break;
      case Array:
        t = [];
        break;
      default:
        return n;
    }
    for (const r in n)
      n.hasOwnProperty(r) && '__proto__' !== r && (t[r] = e(t[r], n[r]));
    return t;
  }
  /**
   * @license
   * Copyright 2017 Google LLC
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
  class t {
    constructor() {
      (this.reject = () => {}),
        (this.resolve = () => {}),
        (this.promise = new Promise((e, t) => {
          (this.resolve = e), (this.reject = t);
        }));
    }
    wrapCallback(e) {
      return (t, n) => {
        t ? this.reject(t) : this.resolve(n),
          'function' == typeof e &&
            (this.promise.catch(() => {}), 1 === e.length ? e(t) : e(t, n));
      };
    }
  }
  /**
   * @license
   * Copyright 2017 Google LLC
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
   */ class n extends Error {
    constructor(e, t, i) {
      super(t),
        (this.code = e),
        (this.customData = i),
        (this.name = 'FirebaseError'),
        Object.setPrototypeOf(this, n.prototype),
        Error.captureStackTrace &&
          Error.captureStackTrace(this, r.prototype.create);
    }
  }
  class r {
    constructor(e, t, n) {
      (this.service = e), (this.serviceName = t), (this.errors = n);
    }
    create(e, ...t) {
      const r = t[0] || {},
        s = `${this.service}/${e}`,
        a = this.errors[e],
        o = a
          ? (function (e, t) {
              return e.replace(i, (e, n) => {
                const r = t[n];
                return null != r ? String(r) : `<${n}?>`;
              });
            })(a, r)
          : 'Error',
        c = `${this.serviceName}: ${o} (${s}).`;
      return new n(s, c, r);
    }
  }
  const i = /\{\$([^}]+)}/g;
  /**
   * @license
   * Copyright 2017 Google LLC
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
   */ class s {
    constructor(e, t, n) {
      (this.name = e),
        (this.instanceFactory = t),
        (this.type = n),
        (this.multipleInstances = !1),
        (this.serviceProps = {}),
        (this.instantiationMode = 'LAZY');
    }
    setInstantiationMode(e) {
      return (this.instantiationMode = e), this;
    }
    setMultipleInstances(e) {
      return (this.multipleInstances = e), this;
    }
    setServiceProps(e) {
      return (this.serviceProps = e), this;
    }
  }
  /**
   * @license
   * Copyright 2019 Google LLC
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
   */ const a = '[DEFAULT]';
  /**
   * @license
   * Copyright 2019 Google LLC
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
   */ class o {
    constructor(e, t) {
      (this.name = e),
        (this.container = t),
        (this.component = null),
        (this.instances = new Map()),
        (this.instancesDeferred = new Map());
    }
    get(e = '[DEFAULT]') {
      const n = this.normalizeInstanceIdentifier(e);
      if (!this.instancesDeferred.has(n)) {
        const e = new t();
        this.instancesDeferred.set(n, e);
        try {
          const t = this.getOrInitializeService(n);
          t && e.resolve(t);
        } catch (e) {}
      }
      return this.instancesDeferred.get(n).promise;
    }
    getImmediate(e) {
      const { identifier: t, optional: n } = Object.assign(
          { identifier: a, optional: !1 },
          e
        ),
        r = this.normalizeInstanceIdentifier(t);
      try {
        const e = this.getOrInitializeService(r);
        if (!e) {
          if (n) return null;
          throw Error(`Service ${this.name} is not available`);
        }
        return e;
      } catch (e) {
        if (n) return null;
        throw e;
      }
    }
    getComponent() {
      return this.component;
    }
    setComponent(e) {
      if (e.name !== this.name)
        throw Error(
          `Mismatching Component ${e.name} for Provider ${this.name}.`
        );
      if (this.component)
        throw Error(`Component for ${this.name} has already been provided`);
      if (
        ((this.component = e),
        (function (e) {
          return 'EAGER' === e.instantiationMode;
        })(
          /**
           * @license
           * Copyright 2019 Google LLC
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
           */ e
        ))
      )
        try {
          this.getOrInitializeService(a);
        } catch (e) {}
      for (const [e, t] of this.instancesDeferred.entries()) {
        const n = this.normalizeInstanceIdentifier(e);
        try {
          const e = this.getOrInitializeService(n);
          t.resolve(e);
        } catch (e) {}
      }
    }
    clearInstance(e = '[DEFAULT]') {
      this.instancesDeferred.delete(e), this.instances.delete(e);
    }
    async delete() {
      const e = Array.from(this.instances.values());
      await Promise.all([
        ...e.filter(e => 'INTERNAL' in e).map(e => e.INTERNAL.delete()),
        ...e.filter(e => '_delete' in e).map(e => e._delete())
      ]);
    }
    isComponentSet() {
      return null != this.component;
    }
    getOrInitializeService(e) {
      let t = this.instances.get(e);
      return (
        !t &&
          this.component &&
          ((t = this.component.instanceFactory(
            this.container,
            (function (e) {
              return e === a ? void 0 : e;
            })(e)
          )),
          this.instances.set(e, t)),
        t || null
      );
    }
    normalizeInstanceIdentifier(e) {
      return this.component ? (this.component.multipleInstances ? e : a) : e;
    }
  }
  class c {
    constructor(e) {
      (this.name = e), (this.providers = new Map());
    }
    addComponent(e) {
      const t = this.getProvider(e.name);
      if (t.isComponentSet())
        throw new Error(
          `Component ${e.name} has already been registered with ${this.name}`
        );
      t.setComponent(e);
    }
    addOrOverwriteComponent(e) {
      this.getProvider(e.name).isComponentSet() &&
        this.providers.delete(e.name),
        this.addComponent(e);
    }
    getProvider(e) {
      if (this.providers.has(e)) return this.providers.get(e);
      const t = new o(e, this);
      return this.providers.set(e, t), t;
    }
    getProviders() {
      return Array.from(this.providers.values());
    }
  }
  /**
   * @license
   * Copyright 2017 Google LLC
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
   */ const l = [];
  var p;
  !(function (e) {
    (e[(e.DEBUG = 0)] = 'DEBUG'),
      (e[(e.VERBOSE = 1)] = 'VERBOSE'),
      (e[(e.INFO = 2)] = 'INFO'),
      (e[(e.WARN = 3)] = 'WARN'),
      (e[(e.ERROR = 4)] = 'ERROR'),
      (e[(e.SILENT = 5)] = 'SILENT');
  })(p || (p = {}));
  const u = {
      debug: p.DEBUG,
      verbose: p.VERBOSE,
      info: p.INFO,
      warn: p.WARN,
      error: p.ERROR,
      silent: p.SILENT
    },
    h = p.INFO,
    f = {
      [p.DEBUG]: 'log',
      [p.VERBOSE]: 'log',
      [p.INFO]: 'info',
      [p.WARN]: 'warn',
      [p.ERROR]: 'error'
    },
    m = (e, t, ...n) => {
      if (t < e.logLevel) return;
      const r = new Date().toISOString(),
        i = f[t];
      if (!i)
        throw new Error(
          `Attempted to log a message with an invalid logType (value: ${t})`
        );
      console[i](`[${r}]  ${e.name}:`, ...n);
    };
  /**
   * @license
   * Copyright 2019 Google LLC
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
  class d {
    constructor(e) {
      this.container = e;
    }
    getPlatformInfoString() {
      return this.container
        .getProviders()
        .map(e => {
          if (
            (function (e) {
              const t = e.getComponent();
              return 'VERSION' === (null == t ? void 0 : t.type);
            })(e)
          ) {
            const t = e.getImmediate();
            return `${t.library}/${t.version}`;
          }
          return null;
        })
        .filter(e => e)
        .join(' ');
    }
  }
  const g = '@firebase/app-exp',
    v = new (class {
      constructor(e) {
        (this.name = e),
          (this._logLevel = h),
          (this._logHandler = m),
          (this._userLogHandler = null),
          l.push(this);
      }
      get logLevel() {
        return this._logLevel;
      }
      set logLevel(e) {
        if (!(e in p))
          throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
        this._logLevel = e;
      }
      setLogLevel(e) {
        this._logLevel = 'string' == typeof e ? u[e] : e;
      }
      get logHandler() {
        return this._logHandler;
      }
      set logHandler(e) {
        if ('function' != typeof e)
          throw new TypeError(
            'Value assigned to `logHandler` must be a function'
          );
        this._logHandler = e;
      }
      get userLogHandler() {
        return this._userLogHandler;
      }
      set userLogHandler(e) {
        this._userLogHandler = e;
      }
      debug(...e) {
        this._userLogHandler && this._userLogHandler(this, p.DEBUG, ...e),
          this._logHandler(this, p.DEBUG, ...e);
      }
      log(...e) {
        this._userLogHandler && this._userLogHandler(this, p.VERBOSE, ...e),
          this._logHandler(this, p.VERBOSE, ...e);
      }
      info(...e) {
        this._userLogHandler && this._userLogHandler(this, p.INFO, ...e),
          this._logHandler(this, p.INFO, ...e);
      }
      warn(...e) {
        this._userLogHandler && this._userLogHandler(this, p.WARN, ...e),
          this._logHandler(this, p.WARN, ...e);
      }
      error(...e) {
        this._userLogHandler && this._userLogHandler(this, p.ERROR, ...e),
          this._logHandler(this, p.ERROR, ...e);
      }
    })('@firebase/app'),
    b = '[DEFAULT]',
    E = {
      [g]: 'fire-core',
      '@firebase/app-compat': 'fire-core-compat',
      '@firebase/analytics': 'fire-analytics',
      '@firebase/auth': 'fire-auth',
      '@firebase/database': 'fire-rtdb',
      '@firebase/functions-exp': 'fire-fn',
      '@firebase/functions-compat': 'fire-fn-compat',
      '@firebase/installations': 'fire-iid',
      '@firebase/messaging': 'fire-fcm',
      '@firebase/performance': 'fire-perf',
      '@firebase/remote-config': 'fire-rc',
      '@firebase/storage': 'fire-gcs',
      '@firebase/firestore': 'fire-fst',
      'fire-js': 'fire-js',
      'firebase-exp': 'fire-js-all'
    },
    w = new Map(),
    y = new Map();
  function _(e, t) {
    try {
      e.container.addComponent(t);
    } catch (n) {
      v.debug(
        `Component ${t.name} failed to register with FirebaseApp ${e.name}`,
        n
      );
    }
  }
  function L(e) {
    const t = e.name;
    if (y.has(t))
      return (
        v.debug(`There were multiple attempts to register component ${t}.`), !1
      );
    y.set(t, e);
    for (const t of w.values()) _(t, e);
    return !0;
  }
  function I(e, t) {
    return e.container.getProvider(t);
  }
  /**
   * @license
   * Copyright 2019 Google LLC
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
  const N = new r('app', 'Firebase', {
    'no-app':
      "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()",
    'bad-app-name': "Illegal App name: '{$appName}",
    'duplicate-app': "Firebase App named '{$appName}' already exists",
    'app-deleted': "Firebase App named '{$appName}' already deleted",
    'invalid-app-argument':
      'firebase.{$appName}() takes either no argument or a Firebase App instance.',
    'invalid-log-argument':
      'First argument to `onLog` must be null or a function.'
  });
  /**
   * @license
   * Copyright 2019 Google LLC
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
  class A {
    constructor(e, t, n) {
      (this.isDeleted = !1),
        (this.options_ = Object.assign({}, e)),
        (this.name_ = t.name),
        (this.automaticDataCollectionEnabled_ =
          t.automaticDataCollectionEnabled),
        (this.container = n),
        this.container.addComponent(new s('app-exp', () => this, 'PUBLIC'));
    }
    get automaticDataCollectionEnabled() {
      return this.checkDestroyed(), this.automaticDataCollectionEnabled_;
    }
    set automaticDataCollectionEnabled(e) {
      this.checkDestroyed(), (this.automaticDataCollectionEnabled_ = e);
    }
    get name() {
      return this.checkDestroyed(), this.name_;
    }
    get options() {
      return this.checkDestroyed(), this.options_;
    }
    checkDestroyed() {
      if (this.isDeleted)
        throw N.create('app-deleted', { appName: this.name_ });
    }
  }
  /**
   * @license
   * Copyright 2019 Google LLC
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
   */ const O = '0.900.4';
  function D(e, t = {}) {
    if ('object' != typeof t) {
      t = { name: t };
    }
    const n = Object.assign({ name: b, automaticDataCollectionEnabled: !1 }, t),
      r = n.name;
    if ('string' != typeof r || !r)
      throw N.create('bad-app-name', { appName: String(r) });
    if (w.has(r)) throw N.create('duplicate-app', { appName: r });
    const i = new c(r);
    for (const e of y.values()) i.addComponent(e);
    const s = new A(e, n, i);
    return w.set(r, s), s;
  }
  async function R(e) {
    const t = e.name;
    w.has(t) &&
      (w.delete(t),
      await Promise.all(e.container.getProviders().map(e => e.delete())),
      (e.isDeleted = !0));
  }
  function C(e, t, n) {
    var r;
    let i = null !== (r = E[e]) && void 0 !== r ? r : e;
    n && (i += '-' + n);
    const a = i.match(/\s|\//),
      o = t.match(/\s|\//);
    if (a || o) {
      const e = [`Unable to register library "${i}" with version "${t}":`];
      return (
        a &&
          e.push(
            `library name "${i}" contains illegal characters (whitespace or "/")`
          ),
        a && o && e.push('and'),
        o &&
          e.push(
            `version name "${t}" contains illegal characters (whitespace or "/")`
          ),
        void v.warn(e.join(' '))
      );
    }
    L(new s(i + '-version', () => ({ library: i, version: t }), 'VERSION'));
  }
  function S(e, t) {
    if (null !== e && 'function' != typeof e)
      throw N.create('invalid-log-argument', { appName: name });
    !(function (e, t) {
      for (const n of l) {
        let r = null;
        t && t.level && (r = u[t.level]),
          (n.userLogHandler =
            null === e
              ? null
              : (t, n, ...i) => {
                  const s = i
                    .map(e => {
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
                    .filter(e => e)
                    .join(' ');
                  n >= (null != r ? r : t.logLevel) &&
                    e({
                      level: p[n].toLowerCase(),
                      message: s,
                      args: i,
                      type: t.name
                    });
                });
      }
    })(e, t);
  }
  function $(e) {
    var t;
    (t = e),
      l.forEach(e => {
        e.setLogLevel(t);
      });
  }
  /**
   * @license
   * Copyright 2019 Google LLC
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
   */ var F;
  L(new s('platform-logger', e => new d(e), 'PRIVATE')),
    C(g, '0.0.900', F),
    C('fire-js', '');
  var P = Object.freeze({
    __proto__: null,
    SDK_VERSION: O,
    _DEFAULT_ENTRY_NAME: b,
    _addComponent: _,
    _addOrOverwriteComponent: function (e, t) {
      e.container.addOrOverwriteComponent(t);
    },
    _apps: w,
    _clearComponents: function () {
      y.clear();
    },
    _components: y,
    _getProvider: I,
    _registerComponent: L,
    _removeServiceInstance: function (e, t, n = '[DEFAULT]') {
      I(e, t).clearInstance(n);
    },
    deleteApp: R,
    getApp: function (e = '[DEFAULT]') {
      const t = w.get(e);
      if (!t) throw N.create('no-app', { appName: e });
      return t;
    },
    getApps: function () {
      return Array.from(w.values());
    },
    initializeApp: D,
    onLog: S,
    registerVersion: C,
    setLogLevel: $
  });
  /**
   * @license
   * Copyright 2019 Google LLC
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
   */ class T {
    constructor(e, t) {
      (this.app = e),
        (this.firebase = t),
        _(e, new s('app', () => this, 'PUBLIC'));
    }
    get automaticDataCollectionEnabled() {
      return this.app.automaticDataCollectionEnabled;
    }
    set automaticDataCollectionEnabled(e) {
      this.automaticDataCollectionEnabled = e;
    }
    get name() {
      return this.app.name;
    }
    get options() {
      return this.app.options;
    }
    delete() {
      return this.firebase.INTERNAL.removeApp(this.name), R(this.app);
    }
    _getService(e, t = '[DEFAULT]') {
      return (
        this.app.checkDestroyed(),
        this.app.container.getProvider(e).getImmediate({ identifier: t })
      );
    }
  }
  /**
   * @license
   * Copyright 2019 Google LLC
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
   */ const H = new r('app-compat', 'Firebase', {
    'no-app':
      "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()",
    'invalid-app-argument':
      'firebase.{$appName}() takes either no argument or a Firebase App instance.'
  });
  /**
   * @license
   * Copyright 2019 Google LLC
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
  function j(t) {
    const n = {},
      r = {
        __esModule: !0,
        initializeApp: function (e, i = {}) {
          const s = D(e, i),
            a = new t(s, r);
          return (n[s.name] = a), a;
        },
        app: i,
        registerVersion: C,
        setLogLevel: $,
        onLog: S,
        apps: null,
        SDK_VERSION: O,
        INTERNAL: {
          registerComponent: function (n) {
            const s = n.name;
            if (L(n) && 'PUBLIC' === n.type) {
              const a = (e = i()) => {
                if ('function' != typeof e[s])
                  throw H.create('invalid-app-argument', { appName: s });
                return e[s]();
              };
              void 0 !== n.serviceProps && e(a, n.serviceProps),
                (r[s] = a),
                (t.prototype[s] = function (...e) {
                  return this._getService
                    .bind(this, s)
                    .apply(this, n.multipleInstances ? e : []);
                });
            }
            return 'PUBLIC' === n.type ? r[s] : null;
          },
          removeApp: function (e) {
            delete n[e];
          },
          useAsService: function (e, t) {
            if ('serverAuth' === t) return null;
            return t;
          },
          modularAPIs: P
        }
      };
    function i(e) {
      if (
        ((t = n), (r = e = e || b), !Object.prototype.hasOwnProperty.call(t, r))
      )
        throw H.create('no-app', { appName: e });
      var t, r;
      return n[e];
    }
    return (
      (r.default = r),
      Object.defineProperty(r, 'apps', {
        get: function () {
          return Object.keys(n).map(e => n[e]);
        }
      }),
      (i.App = t),
      r
    );
  }
  /**
   * @license
   * Copyright 2019 Google LLC
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
  /**
   * @license
   * Copyright 2019 Google LLC
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
  const U = (function () {
    const e = j(T);
    e.SDK_VERSION = e.SDK_VERSION + '_LITE';
    const t = e.INTERNAL.registerComponent;
    return (
      (e.INTERNAL.registerComponent = function (e) {
        if (
          'PUBLIC' === e.type &&
          'performance' !== e.name &&
          'installations' !== e.name
        )
          throw Error(
            name + ' cannot register with the standalone perf instance'
          );
        return t(e);
      }),
      e
    );
  })();
  !(
    /**
     * @license
     * Copyright 2019 Google LLC
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
    (function (e) {
      C('@firebase/app-compat', '0.0.900', e);
    })('lite')
  );
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
  U.registerVersion('firebase-exp', '0.900.4', 'app-compat');
  /**
   * @license
   * Copyright 2019 Google LLC
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
  return U.registerVersion('firebase-exp', '0.900.4', 'compat-lite'), U;
});
//# sourceMappingURL=firebase-performance-standalone-compat.es2017.js.map
