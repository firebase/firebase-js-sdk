(function () {
  'use strict';

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function (resolve) {
        resolve(value);
      });
    }

    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }

      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }

      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }

      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function __generator(thisArg, body) {
    var _ = {
      label: 0,
      sent: function sent() {
        if (t[0] & 1) throw t[1];
        return t[1];
      },
      trys: [],
      ops: []
    },
        f,
        y,
        t,
        g;
    return g = {
      next: verb(0),
      "throw": verb(1),
      "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
      return this;
    }), g;

    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }

    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");

      while (_) {
        try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];

          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;

            case 4:
              _.label++;
              return {
                value: op[1],
                done: false
              };

            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;

            case 7:
              op = _.ops.pop();

              _.trys.pop();

              continue;

            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }

              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }

              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }

              if (t && _.label < t[2]) {
                _.label = t[2];

                _.ops.push(op);

                break;
              }

              if (t[2]) _.ops.pop();

              _.trys.pop();

              continue;
          }

          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      }

      if (op[0] & 5) throw op[1];
      return {
        value: op[0] ? op[1] : void 0,
        done: true
      };
    }
  }

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */

  /* global Reflect, Promise */
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (b.hasOwnProperty(p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  function __extends(d, b) {
    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  var _assign = function __assign() {
    _assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];

        for (var p in s) {
          if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
      }

      return t;
    };

    return _assign.apply(this, arguments);
  };
  function __awaiter$1(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function (resolve) {
        resolve(value);
      });
    }

    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }

      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }

      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }

      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  function __generator$1(thisArg, body) {
    var _ = {
      label: 0,
      sent: function sent() {
        if (t[0] & 1) throw t[1];
        return t[1];
      },
      trys: [],
      ops: []
    },
        f,
        y,
        t,
        g;
    return g = {
      next: verb(0),
      "throw": verb(1),
      "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
      return this;
    }), g;

    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }

    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");

      while (_) {
        try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];

          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;

            case 4:
              _.label++;
              return {
                value: op[1],
                done: false
              };

            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;

            case 7:
              op = _.ops.pop();

              _.trys.pop();

              continue;

            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }

              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }

              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }

              if (t && _.label < t[2]) {
                _.label = t[2];

                _.ops.push(op);

                break;
              }

              if (t[2]) _.ops.pop();

              _.trys.pop();

              continue;
          }

          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      }

      if (op[0] & 5) throw op[1];
      return {
        value: op[0] ? op[1] : void 0,
        done: true
      };
    }
  }
  function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator,
        m = s && o[s],
        i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function next() {
        if (o && i >= o.length) o = void 0;
        return {
          value: o && o[i++],
          done: !o
        };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  }
  function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o),
        r,
        ar = [],
        e;

    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) {
        ar.push(r.value);
      }
    } catch (error) {
      e = {
        error: error
      };
    } finally {
      try {
        if (r && !r.done && (m = i["return"])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }

    return ar;
  }
  function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) {
      s += arguments[i].length;
    }

    for (var r = Array(s), k = 0, i = 0; i < il; i++) {
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) {
        r[k] = a[j];
      }
    }

    return r;
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

  /**
   * Do a deep-copy of basic JavaScript Objects or Arrays.
   */


  function deepCopy(value) {
    return deepExtend(undefined, value);
  }
  /**
   * Copy properties from source to target (recursively allows extension
   * of Objects and Arrays).  Scalar values in the target are over-written.
   * If target is undefined, an object of the appropriate type will be created
   * (and returned).
   *
   * We recursively copy all child properties of plain Objects in the source- so
   * that namespace- like dictionaries are merged.
   *
   * Note that the target can be a function, in which case the properties in
   * the source Object are copied onto it as static properties of the Function.
   */


  function deepExtend(target, source) {
    if (!(source instanceof Object)) {
      return source;
    }

    switch (source.constructor) {
      case Date:
        // Treat Dates like scalars; if the target date object had any child
        // properties - they will be lost!
        var dateValue = source;
        return new Date(dateValue.getTime());

      case Object:
        if (target === undefined) {
          target = {};
        }

        break;

      case Array:
        // Always copy the array source and overwrite the target.
        target = [];
        break;

      default:
        // Not a plain Object - treat it as a scalar.
        return source;
    }

    for (var prop in source) {
      if (!source.hasOwnProperty(prop)) {
        continue;
      }

      target[prop] = deepExtend(target[prop], source[prop]);
    }

    return target;
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


  var Deferred =
  /** @class */
  function () {
    function Deferred() {
      var _this = this;

      this.reject = function () {};

      this.resolve = function () {};

      this.promise = new Promise(function (resolve, reject) {
        _this.resolve = resolve;
        _this.reject = reject;
      });
    }
    /**
     * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */


    Deferred.prototype.wrapCallback = function (callback) {
      var _this = this;

      return function (error, value) {
        if (error) {
          _this.reject(error);
        } else {
          _this.resolve(value);
        }

        if (typeof callback === 'function') {
          // Attaching noop handler just in case developer wasn't expecting
          // promises
          _this.promise.catch(function () {}); // Some of our callbacks don't expect a value and our own tests
          // assert that the parameter length is 1


          if (callback.length === 1) {
            callback(error);
          } else {
            callback(error, value);
          }
        }
      };
    };

    return Deferred;
  }();
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

  /**
   * Returns navigator.userAgent string or '' if it's not defined.
   * @return user agent string
   */


  function getUA() {
    if (typeof navigator !== 'undefined' && typeof navigator['userAgent'] === 'string') {
      return navigator['userAgent'];
    } else {
      return '';
    }
  }
  /**
   * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
   *
   * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
   * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
   * wait for a callback.
   */


  function isMobileCordova() {
    return typeof window !== 'undefined' && // @ts-ignore Setting up an broadly applicable index signature for Window
    // just to deal with this case would probably be a bad idea.
    !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA());
  }
  /**
   * Detect Node.js.
   *
   * @return true if Node.js environment is detected.
   */
  // Node detection logic from: https://github.com/iliakan/detect-node/


  function isNode() {
    try {
      return Object.prototype.toString.call(global.process) === '[object process]';
    } catch (e) {
      return false;
    }
  }
  /**
   * Detect Browser Environment
   */


  function isBrowser() {
    return (typeof self === "undefined" ? "undefined" : _typeof(self)) === 'object' && self.self === self;
  }

  function isBrowserExtension() {
    var runtime = (typeof chrome === "undefined" ? "undefined" : _typeof(chrome)) === 'object' ? chrome.runtime : (typeof browser === "undefined" ? "undefined" : _typeof(browser)) === 'object' ? browser.runtime : undefined;
    return _typeof(runtime) === 'object' && runtime.id !== undefined;
  }
  /**
   * Detect React Native.
   *
   * @return true if ReactNative environment is detected.
   */


  function isReactNative() {
    return (typeof navigator === "undefined" ? "undefined" : _typeof(navigator)) === 'object' && navigator['product'] === 'ReactNative';
  }
  /** Detects Electron apps. */


  function isElectron() {
    return getUA().indexOf('Electron/') >= 0;
  }
  /** Detects Internet Explorer. */


  function isIE() {
    var ua = getUA();
    return ua.indexOf('MSIE ') >= 0 || ua.indexOf('Trident/') >= 0;
  }
  /** Detects Universal Windows Platform apps. */


  function isUWP() {
    return getUA().indexOf('MSAppHost/') >= 0;
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


  var ERROR_NAME = 'FirebaseError'; // Based on code from:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types

  var FirebaseError =
  /** @class */
  function (_super) {
    __extends(FirebaseError, _super);

    function FirebaseError(code, message) {
      var _this = _super.call(this, message) || this;

      _this.code = code;
      _this.name = ERROR_NAME; // Fix For ES5
      // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work

      Object.setPrototypeOf(_this, FirebaseError.prototype); // Maintains proper stack trace for where our error was thrown.
      // Only available on V8.

      if (Error.captureStackTrace) {
        Error.captureStackTrace(_this, ErrorFactory.prototype.create);
      }

      return _this;
    }

    return FirebaseError;
  }(Error);

  var ErrorFactory =
  /** @class */
  function () {
    function ErrorFactory(service, serviceName, errors) {
      this.service = service;
      this.serviceName = serviceName;
      this.errors = errors;
    }

    ErrorFactory.prototype.create = function (code) {
      var data = [];

      for (var _i = 1; _i < arguments.length; _i++) {
        data[_i - 1] = arguments[_i];
      }

      var customData = data[0] || {};
      var fullCode = this.service + "/" + code;
      var template = this.errors[code];
      var message = template ? replaceTemplate(template, customData) : 'Error'; // Service Name: Error message (service/code).

      var fullMessage = this.serviceName + ": " + message + " (" + fullCode + ").";
      var error = new FirebaseError(fullCode, fullMessage); // Keys with an underscore at the end of their name are not included in
      // error.data for some reason.
      // TODO: Replace with Object.entries when lib is updated to es2017.

      for (var _a = 0, _b = Object.keys(customData); _a < _b.length; _a++) {
        var key = _b[_a];

        if (key.slice(-1) !== '_') {
          if (key in error) {
            console.warn("Overwriting FirebaseError base field \"" + key + "\" can cause unexpected behavior.");
          }

          error[key] = customData[key];
        }
      }

      return error;
    };

    return ErrorFactory;
  }();

  function replaceTemplate(template, data) {
    return template.replace(PATTERN, function (_, key) {
      var value = data[key];
      return value != null ? String(value) : "<" + key + "?>";
    });
  }

  var PATTERN = /\{\$([^}]+)}/g;
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


  function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }
  /**
   * Helper to make a Subscribe function (just like Promise helps make a
   * Thenable).
   *
   * @param executor Function which can make calls to a single Observer
   *     as a proxy.
   * @param onNoObservers Callback when count of Observers goes to zero.
   */


  function createSubscribe(executor, onNoObservers) {
    var proxy = new ObserverProxy(executor, onNoObservers);
    return proxy.subscribe.bind(proxy);
  }
  /**
   * Implement fan-out for any number of Observers attached via a subscribe
   * function.
   */


  var ObserverProxy =
  /** @class */
  function () {
    /**
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function ObserverProxy(executor, onNoObservers) {
      var _this = this;

      this.observers = [];
      this.unsubscribes = [];
      this.observerCount = 0; // Micro-task scheduling by calling task.then().

      this.task = Promise.resolve();
      this.finalized = false;
      this.onNoObservers = onNoObservers; // Call the executor asynchronously so subscribers that are called
      // synchronously after the creation of the subscribe function
      // can still receive the very first value generated in the executor.

      this.task.then(function () {
        executor(_this);
      }).catch(function (e) {
        _this.error(e);
      });
    }

    ObserverProxy.prototype.next = function (value) {
      this.forEachObserver(function (observer) {
        observer.next(value);
      });
    };

    ObserverProxy.prototype.error = function (error) {
      this.forEachObserver(function (observer) {
        observer.error(error);
      });
      this.close(error);
    };

    ObserverProxy.prototype.complete = function () {
      this.forEachObserver(function (observer) {
        observer.complete();
      });
      this.close();
    };
    /**
     * Subscribe function that can be used to add an Observer to the fan-out list.
     *
     * - We require that no event is sent to a subscriber sychronously to their
     *   call to subscribe().
     */


    ObserverProxy.prototype.subscribe = function (nextOrObserver, error, complete) {
      var _this = this;

      var observer;

      if (nextOrObserver === undefined && error === undefined && complete === undefined) {
        throw new Error('Missing Observer.');
      } // Assemble an Observer object when passed as callback functions.


      if (implementsAnyMethods(nextOrObserver, ['next', 'error', 'complete'])) {
        observer = nextOrObserver;
      } else {
        observer = {
          next: nextOrObserver,
          error: error,
          complete: complete
        };
      }

      if (observer.next === undefined) {
        observer.next = noop;
      }

      if (observer.error === undefined) {
        observer.error = noop;
      }

      if (observer.complete === undefined) {
        observer.complete = noop;
      }

      var unsub = this.unsubscribeOne.bind(this, this.observers.length); // Attempt to subscribe to a terminated Observable - we
      // just respond to the Observer with the final error or complete
      // event.

      if (this.finalized) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(function () {
          try {
            if (_this.finalError) {
              observer.error(_this.finalError);
            } else {
              observer.complete();
            }
          } catch (e) {// nothing
          }

          return;
        });
      }

      this.observers.push(observer);
      return unsub;
    }; // Unsubscribe is synchronous - we guarantee that no events are sent to
    // any unsubscribed Observer.


    ObserverProxy.prototype.unsubscribeOne = function (i) {
      if (this.observers === undefined || this.observers[i] === undefined) {
        return;
      }

      delete this.observers[i];
      this.observerCount -= 1;

      if (this.observerCount === 0 && this.onNoObservers !== undefined) {
        this.onNoObservers(this);
      }
    };

    ObserverProxy.prototype.forEachObserver = function (fn) {
      if (this.finalized) {
        // Already closed by previous event....just eat the additional values.
        return;
      } // Since sendOne calls asynchronously - there is no chance that
      // this.observers will become undefined.


      for (var i = 0; i < this.observers.length; i++) {
        this.sendOne(i, fn);
      }
    }; // Call the Observer via one of it's callback function. We are careful to
    // confirm that the observe has not been unsubscribed since this asynchronous
    // function had been queued.


    ObserverProxy.prototype.sendOne = function (i, fn) {
      var _this = this; // Execute the callback asynchronously
      // eslint-disable-next-line @typescript-eslint/no-floating-promises


      this.task.then(function () {
        if (_this.observers !== undefined && _this.observers[i] !== undefined) {
          try {
            fn(_this.observers[i]);
          } catch (e) {
            // Ignore exceptions raised in Observers or missing methods of an
            // Observer.
            // Log error to console. b/31404806
            if (typeof console !== 'undefined' && console.error) {
              console.error(e);
            }
          }
        }
      });
    };

    ObserverProxy.prototype.close = function (err) {
      var _this = this;

      if (this.finalized) {
        return;
      }

      this.finalized = true;

      if (err !== undefined) {
        this.finalError = err;
      } // Proxy is no longer needed - garbage collect references
      // eslint-disable-next-line @typescript-eslint/no-floating-promises


      this.task.then(function () {
        _this.observers = undefined;
        _this.onNoObservers = undefined;
      });
    };

    return ObserverProxy;
  }();
  /**
   * Return true if the object passed in implements any of the named methods.
   */


  function implementsAnyMethods(obj, methods) {
    if (_typeof(obj) !== 'object' || obj === null) {
      return false;
    }

    for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
      var method = methods_1[_i];

      if (method in obj && typeof obj[method] === 'function') {
        return true;
      }
    }

    return false;
  }

  function noop() {// do nothing
  }

  /**
   * Component for service name T, e.g. `auth`, `auth-internal`
   */

  var Component =
  /** @class */
  function () {
    /**
     *
     * @param name The public service name, e.g. app, auth, firestore, database
     * @param instanceFactory Service factory responsible for creating the public interface
     * @param type whether the service provided by the component is public or private
     */
    function Component(name, instanceFactory, type) {
      this.name = name;
      this.instanceFactory = instanceFactory;
      this.type = type;
      this.multipleInstances = false;
      /**
       * Properties to be added to the service namespace
       */

      this.serviceProps = {};
      this.instantiationMode = "LAZY"
      /* LAZY */
      ;
    }

    Component.prototype.setInstantiationMode = function (mode) {
      this.instantiationMode = mode;
      return this;
    };

    Component.prototype.setMultipleInstances = function (multipleInstances) {
      this.multipleInstances = multipleInstances;
      return this;
    };

    Component.prototype.setServiceProps = function (props) {
      this.serviceProps = props;
      return this;
    };

    return Component;
  }();
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


  var DEFAULT_ENTRY_NAME = '[DEFAULT]';
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
   * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
   * NameServiceMapping[T] is an alias for the type of the instance
   */

  var Provider =
  /** @class */
  function () {
    function Provider(name, container) {
      this.name = name;
      this.container = container;
      this.component = null;
      this.instances = new Map();
      this.instancesDeferred = new Map();
    }
    /**
     * @param identifier A provider can provide mulitple instances of a service
     * if this.component.multipleInstances is true.
     */


    Provider.prototype.get = function (identifier) {
      if (identifier === void 0) {
        identifier = DEFAULT_ENTRY_NAME;
      } // if multipleInstances is not supported, use the default name


      var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

      if (!this.instancesDeferred.has(normalizedIdentifier)) {
        var deferred = new Deferred();
        this.instancesDeferred.set(normalizedIdentifier, deferred); // If the service instance is available, resolve the promise with it immediately

        try {
          var instance = this.getOrInitializeService(normalizedIdentifier);

          if (instance) {
            deferred.resolve(instance);
          }
        } catch (e) {// when the instance factory throws an exception during get(), it should not cause
          // a fatal error. We just return the unresolved promise in this case.
        }
      }

      return this.instancesDeferred.get(normalizedIdentifier).promise;
    };

    Provider.prototype.getImmediate = function (options) {
      var _a = _assign({
        identifier: DEFAULT_ENTRY_NAME,
        optional: false
      }, options),
          identifier = _a.identifier,
          optional = _a.optional; // if multipleInstances is not supported, use the default name


      var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);

      try {
        var instance = this.getOrInitializeService(normalizedIdentifier);

        if (!instance) {
          if (optional) {
            return null;
          }

          throw Error("Service " + this.name + " is not available");
        }

        return instance;
      } catch (e) {
        if (optional) {
          return null;
        } else {
          throw e;
        }
      }
    };

    Provider.prototype.getComponent = function () {
      return this.component;
    };

    Provider.prototype.setComponent = function (component) {
      var e_1, _a;

      if (component.name !== this.name) {
        throw Error("Mismatching Component " + component.name + " for Provider " + this.name + ".");
      }

      if (this.component) {
        throw Error("Component for " + this.name + " has already been provided");
      }

      this.component = component; // if the service is eager, initialize the default instance

      if (isComponentEager(component)) {
        try {
          this.getOrInitializeService(DEFAULT_ENTRY_NAME);
        } catch (e) {// when the instance factory for an eager Component throws an exception during the eager
          // initialization, it should not cause a fatal error.
          // TODO: Investigate if we need to make it configurable, because some component may want to cause
          // a fatal error in this case?
        }
      }

      try {
        // Create service instances for the pending promises and resolve them
        // NOTE: if this.multipleInstances is false, only the default instance will be created
        // and all promises with resolve with it regardless of the identifier.
        for (var _b = __values(this.instancesDeferred.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
          var _d = __read(_c.value, 2),
              instanceIdentifier = _d[0],
              instanceDeferred = _d[1];

          var normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);

          try {
            // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
            var instance = this.getOrInitializeService(normalizedIdentifier);
            instanceDeferred.resolve(instance);
          } catch (e) {// when the instance factory throws an exception, it should not cause
            // a fatal error. We just leave the promise unresolved.
          }
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    };

    Provider.prototype.clearInstance = function (identifier) {
      if (identifier === void 0) {
        identifier = DEFAULT_ENTRY_NAME;
      }

      this.instancesDeferred.delete(identifier);
      this.instances.delete(identifier);
    }; // app.delete() will call this method on every provider to delete the services
    // TODO: should we mark the provider as deleted?


    Provider.prototype.delete = function () {
      return __awaiter$1(this, void 0, void 0, function () {
        var services;
        return __generator$1(this, function (_a) {
          switch (_a.label) {
            case 0:
              services = Array.from(this.instances.values());
              return [4
              /*yield*/
              , Promise.all(services.filter(function (service) {
                return 'INTERNAL' in service;
              }) // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map(function (service) {
                return service.INTERNAL.delete();
              }))];

            case 1:
              _a.sent();

              return [2
              /*return*/
              ];
          }
        });
      });
    };

    Provider.prototype.isComponentSet = function () {
      return this.component != null;
    };

    Provider.prototype.getOrInitializeService = function (identifier) {
      var instance = this.instances.get(identifier);

      if (!instance && this.component) {
        instance = this.component.instanceFactory(this.container, normalizeIdentifierForFactory(identifier));
        this.instances.set(identifier, instance);
      }

      return instance || null;
    };

    Provider.prototype.normalizeInstanceIdentifier = function (identifier) {
      if (this.component) {
        return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
      } else {
        return identifier; // assume multiple instances are supported before the component is provided.
      }
    };

    return Provider;
  }(); // undefined should be passed to the service factory for the default instance


  function normalizeIdentifierForFactory(identifier) {
    return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
  }

  function isComponentEager(component) {
    return component.instantiationMode === "EAGER"
    /* EAGER */
    ;
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
   * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
   */


  var ComponentContainer =
  /** @class */
  function () {
    function ComponentContainer(name) {
      this.name = name;
      this.providers = new Map();
    }
    /**
     *
     * @param component Component being added
     * @param overwrite When a component with the same name has already been registered,
     * if overwrite is true: overwrite the existing component with the new component and create a new
     * provider with the new component. It can be useful in tests where you want to use different mocks
     * for different tests.
     * if overwrite is false: throw an exception
     */


    ComponentContainer.prototype.addComponent = function (component) {
      var provider = this.getProvider(component.name);

      if (provider.isComponentSet()) {
        throw new Error("Component " + component.name + " has already been registered with " + this.name);
      }

      provider.setComponent(component);
    };

    ComponentContainer.prototype.addOrOverwriteComponent = function (component) {
      var provider = this.getProvider(component.name);

      if (provider.isComponentSet()) {
        // delete the existing provider from the container, so we can register the new component
        this.providers.delete(component.name);
      }

      this.addComponent(component);
    };
    /**
     * getProvider provides a type safe interface where it can only be called with a field name
     * present in NameServiceMapping interface.
     *
     * Firebase SDKs providing services should extend NameServiceMapping interface to register
     * themselves.
     */


    ComponentContainer.prototype.getProvider = function (name) {
      if (this.providers.has(name)) {
        return this.providers.get(name);
      } // create a Provider for a service that hasn't registered with Firebase


      var provider = new Provider(name, this);
      this.providers.set(name, provider);
      return provider;
    };

    ComponentContainer.prototype.getProviders = function () {
      return Array.from(this.providers.values());
    };

    return ComponentContainer;
  }();

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */
  function __spreadArrays$1() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) {
      s += arguments[i].length;
    }

    for (var r = Array(s), k = 0, i = 0; i < il; i++) {
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) {
        r[k] = a[j];
      }
    }

    return r;
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


  var _a;
  /**
   * A container for all of the Logger instances
   */


  var instances = [];
  /**
   * The JS SDK supports 5 log levels and also allows a user the ability to
   * silence the logs altogether.
   *
   * The order is a follows:
   * DEBUG < VERBOSE < INFO < WARN < ERROR
   *
   * All of the log types above the current log level will be captured (i.e. if
   * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
   * `VERBOSE` logs will not)
   */

  var LogLevel;

  (function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
  })(LogLevel || (LogLevel = {}));

  var levelStringToEnum = {
    'debug': LogLevel.DEBUG,
    'verbose': LogLevel.VERBOSE,
    'info': LogLevel.INFO,
    'warn': LogLevel.WARN,
    'error': LogLevel.ERROR,
    'silent': LogLevel.SILENT
  };
  /**
   * The default log level
   */

  var defaultLogLevel = LogLevel.INFO;
  /**
   * By default, `console.debug` is not displayed in the developer console (in
   * chrome). To avoid forcing users to have to opt-in to these logs twice
   * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
   * logs to the `console.log` function.
   */

  var ConsoleMethod = (_a = {}, _a[LogLevel.DEBUG] = 'log', _a[LogLevel.VERBOSE] = 'log', _a[LogLevel.INFO] = 'info', _a[LogLevel.WARN] = 'warn', _a[LogLevel.ERROR] = 'error', _a);
  /**
   * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
   * messages on to their corresponding console counterparts (if the log method
   * is supported by the current log level)
   */

  var defaultLogHandler = function defaultLogHandler(instance, logType) {
    var args = [];

    for (var _i = 2; _i < arguments.length; _i++) {
      args[_i - 2] = arguments[_i];
    }

    if (logType < instance.logLevel) {
      return;
    }

    var now = new Date().toISOString();
    var method = ConsoleMethod[logType];

    if (method) {
      console[method].apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
    } else {
      throw new Error("Attempted to log a message with an invalid logType (value: " + logType + ")");
    }
  };

  var Logger =
  /** @class */
  function () {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    function Logger(name) {
      this.name = name;
      /**
       * The log level of the given Logger instance.
       */

      this._logLevel = defaultLogLevel;
      /**
       * The main (internal) log handler for the Logger instance.
       * Can be set to a new function in internal package code but not by user.
       */

      this._logHandler = defaultLogHandler;
      /**
       * The optional, additional, user-defined log handler for the Logger instance.
       */

      this._userLogHandler = null;
      /**
       * Capture the current instance for later use
       */

      instances.push(this);
    }

    Object.defineProperty(Logger.prototype, "logLevel", {
      get: function get() {
        return this._logLevel;
      },
      set: function set(val) {
        if (!(val in LogLevel)) {
          throw new TypeError("Invalid value \"" + val + "\" assigned to `logLevel`");
        }

        this._logLevel = val;
      },
      enumerable: false,
      configurable: true
    }); // Workaround for setter/getter having to be the same type.

    Logger.prototype.setLogLevel = function (val) {
      this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
    };

    Object.defineProperty(Logger.prototype, "logHandler", {
      get: function get() {
        return this._logHandler;
      },
      set: function set(val) {
        if (typeof val !== 'function') {
          throw new TypeError('Value assigned to `logHandler` must be a function');
        }

        this._logHandler = val;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(Logger.prototype, "userLogHandler", {
      get: function get() {
        return this._userLogHandler;
      },
      set: function set(val) {
        this._userLogHandler = val;
      },
      enumerable: false,
      configurable: true
    });
    /**
     * The functions below are all based on the `console` interface
     */

    Logger.prototype.debug = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));

      this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
    };

    Logger.prototype.log = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));

      this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
    };

    Logger.prototype.info = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));

      this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
    };

    Logger.prototype.warn = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));

      this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
    };

    Logger.prototype.error = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));

      this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
    };

    return Logger;
  }();

  function setLogLevel(level) {
    instances.forEach(function (inst) {
      inst.setLogLevel(level);
    });
  }

  function setUserLogHandler(logCallback, options) {
    var _loop_1 = function _loop_1(instance) {
      var customLogLevel = null;

      if (options && options.level) {
        customLogLevel = levelStringToEnum[options.level];
      }

      if (logCallback === null) {
        instance.userLogHandler = null;
      } else {
        instance.userLogHandler = function (instance, level) {
          var args = [];

          for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
          }

          var message = args.map(function (arg) {
            if (arg == null) {
              return null;
            } else if (typeof arg === 'string') {
              return arg;
            } else if (typeof arg === 'number' || typeof arg === 'boolean') {
              return arg.toString();
            } else if (arg instanceof Error) {
              return arg.message;
            } else {
              try {
                return JSON.stringify(arg);
              } catch (ignored) {
                return null;
              }
            }
          }).filter(function (arg) {
            return arg;
          }).join(' ');

          if (level >= (customLogLevel !== null && customLogLevel !== void 0 ? customLogLevel : instance.logLevel)) {
            logCallback({
              level: LogLevel[level].toLowerCase(),
              message: message,
              args: args,
              type: instance.name
            });
          }
        };
      }
    };

    for (var _i = 0, instances_1 = instances; _i < instances_1.length; _i++) {
      var instance = instances_1[_i];

      _loop_1(instance);
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
   */

  var _a$1;

  var ERRORS = (_a$1 = {}, _a$1["no-app"
  /* NO_APP */
  ] = "No Firebase App '{$appName}' has been created - " + 'call Firebase App.initializeApp()', _a$1["bad-app-name"
  /* BAD_APP_NAME */
  ] = "Illegal App name: '{$appName}", _a$1["duplicate-app"
  /* DUPLICATE_APP */
  ] = "Firebase App named '{$appName}' already exists", _a$1["app-deleted"
  /* APP_DELETED */
  ] = "Firebase App named '{$appName}' already deleted", _a$1["invalid-app-argument"
  /* INVALID_APP_ARGUMENT */
  ] = 'firebase.{$appName}() takes either no argument or a ' + 'Firebase App instance.', _a$1["invalid-log-argument"
  /* INVALID_LOG_ARGUMENT */
  ] = 'First argument to `onLog` must be null or a function.', _a$1);
  var ERROR_FACTORY = new ErrorFactory('app', 'Firebase', ERRORS);
  var name$1 = "@firebase/app";
  var version = "0.6.10";
  var name$2 = "@firebase/analytics";
  var name$3 = "@firebase/auth";
  var name$4 = "@firebase/database";
  var name$5 = "@firebase/functions";
  var name$6 = "@firebase/installations";
  var name$7 = "@firebase/messaging";
  var name$8 = "@firebase/performance";
  var name$9 = "@firebase/remote-config";
  var name$a = "@firebase/storage";
  var name$b = "@firebase/firestore";
  var name$c = "firebase-wrapper";
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

  var _a$1$1;

  var DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';
  var PLATFORM_LOG_STRING = (_a$1$1 = {}, _a$1$1[name$1] = 'fire-core', _a$1$1[name$2] = 'fire-analytics', _a$1$1[name$3] = 'fire-auth', _a$1$1[name$4] = 'fire-rtdb', _a$1$1[name$5] = 'fire-fn', _a$1$1[name$6] = 'fire-iid', _a$1$1[name$7] = 'fire-fcm', _a$1$1[name$8] = 'fire-perf', _a$1$1[name$9] = 'fire-rc', _a$1$1[name$a] = 'fire-gcs', _a$1$1[name$b] = 'fire-fst', _a$1$1['fire-js'] = 'fire-js', _a$1$1[name$c] = 'fire-js-all', _a$1$1);
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

  var logger = new Logger('@firebase/app');
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

  /**
   * Global context object for a collection of services using
   * a shared authentication state.
   */

  var FirebaseAppImpl =
  /** @class */
  function () {
    function FirebaseAppImpl(options, config, firebase_) {
      var e_1, _a;

      var _this = this;

      this.firebase_ = firebase_;
      this.isDeleted_ = false;
      this.name_ = config.name;
      this.automaticDataCollectionEnabled_ = config.automaticDataCollectionEnabled || false;
      this.options_ = deepCopy(options);
      this.container = new ComponentContainer(config.name); // add itself to container

      this._addComponent(new Component('app', function () {
        return _this;
      }, "PUBLIC"
      /* PUBLIC */
      ));

      try {
        // populate ComponentContainer with existing components
        for (var _b = __values(this.firebase_.INTERNAL.components.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
          var component = _c.value;

          this._addComponent(component);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    }

    Object.defineProperty(FirebaseAppImpl.prototype, "automaticDataCollectionEnabled", {
      get: function get() {
        this.checkDestroyed_();
        return this.automaticDataCollectionEnabled_;
      },
      set: function set(val) {
        this.checkDestroyed_();
        this.automaticDataCollectionEnabled_ = val;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(FirebaseAppImpl.prototype, "name", {
      get: function get() {
        this.checkDestroyed_();
        return this.name_;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(FirebaseAppImpl.prototype, "options", {
      get: function get() {
        this.checkDestroyed_();
        return this.options_;
      },
      enumerable: false,
      configurable: true
    });

    FirebaseAppImpl.prototype.delete = function () {
      var _this = this;

      return new Promise(function (resolve) {
        _this.checkDestroyed_();

        resolve();
      }).then(function () {
        _this.firebase_.INTERNAL.removeApp(_this.name_);

        return Promise.all(_this.container.getProviders().map(function (provider) {
          return provider.delete();
        }));
      }).then(function () {
        _this.isDeleted_ = true;
      });
    };
    /**
     * Return a service instance associated with this app (creating it
     * on demand), identified by the passed instanceIdentifier.
     *
     * NOTE: Currently storage and functions are the only ones that are leveraging this
     * functionality. They invoke it by calling:
     *
     * ```javascript
     * firebase.app().storage('STORAGE BUCKET ID')
     * ```
     *
     * The service name is passed to this already
     * @internal
     */


    FirebaseAppImpl.prototype._getService = function (name, instanceIdentifier) {
      if (instanceIdentifier === void 0) {
        instanceIdentifier = DEFAULT_ENTRY_NAME$1;
      }

      this.checkDestroyed_(); // getImmediate will always succeed because _getService is only called for registered components.

      return this.container.getProvider(name).getImmediate({
        identifier: instanceIdentifier
      });
    };
    /**
     * Remove a service instance from the cache, so we will create a new instance for this service
     * when people try to get this service again.
     *
     * NOTE: currently only firestore is using this functionality to support firestore shutdown.
     *
     * @param name The service name
     * @param instanceIdentifier instance identifier in case multiple instances are allowed
     * @internal
     */


    FirebaseAppImpl.prototype._removeServiceInstance = function (name, instanceIdentifier) {
      if (instanceIdentifier === void 0) {
        instanceIdentifier = DEFAULT_ENTRY_NAME$1;
      } // eslint-disable-next-line @typescript-eslint/no-explicit-any


      this.container.getProvider(name).clearInstance(instanceIdentifier);
    };
    /**
     * @param component the component being added to this app's container
     */


    FirebaseAppImpl.prototype._addComponent = function (component) {
      try {
        this.container.addComponent(component);
      } catch (e) {
        logger.debug("Component " + component.name + " failed to register with FirebaseApp " + this.name, e);
      }
    };

    FirebaseAppImpl.prototype._addOrOverwriteComponent = function (component) {
      this.container.addOrOverwriteComponent(component);
    };
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */


    FirebaseAppImpl.prototype.checkDestroyed_ = function () {
      if (this.isDeleted_) {
        throw ERROR_FACTORY.create("app-deleted"
        /* APP_DELETED */
        , {
          appName: this.name_
        });
      }
    };

    return FirebaseAppImpl;
  }(); // Prevent dead-code elimination of these methods w/o invalid property
  // copying.


  FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options || FirebaseAppImpl.prototype.delete || console.log('dc');
  var version$1 = "7.18.0";
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
   * Because auth can't share code with other components, we attach the utility functions
   * in an internal namespace to share code.
   * This function return a firebase namespace object without
   * any utility functions, so it can be shared between the regular firebaseNamespace and
   * the lite version.
   */

  function createFirebaseNamespaceCore(firebaseAppImpl) {
    var apps = {}; // eslint-disable-next-line @typescript-eslint/no-explicit-any

    var components = new Map(); // A namespace is a plain JavaScript Object.

    var namespace = {
      // Hack to prevent Babel from modifying the object returned
      // as the firebase namespace.
      // @ts-ignore
      __esModule: true,
      initializeApp: initializeApp,
      // @ts-ignore
      app: app,
      registerVersion: registerVersion,
      setLogLevel: setLogLevel,
      onLog: onLog,
      // @ts-ignore
      apps: null,
      SDK_VERSION: version$1,
      INTERNAL: {
        registerComponent: registerComponent,
        removeApp: removeApp,
        components: components,
        useAsService: useAsService
      }
    }; // Inject a circular default export to allow Babel users who were previously
    // using:
    //
    //   import firebase from 'firebase';
    //   which becomes: var firebase = require('firebase').default;
    //
    // instead of
    //
    //   import * as firebase from 'firebase';
    //   which becomes: var firebase = require('firebase');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    namespace['default'] = namespace; // firebase.apps is a read-only getter.

    Object.defineProperty(namespace, 'apps', {
      get: getApps
    });
    /**
     * Called by App.delete() - but before any services associated with the App
     * are deleted.
     */

    function removeApp(name) {
      delete apps[name];
    }
    /**
     * Get the App object for a given name (or DEFAULT).
     */


    function app(name) {
      name = name || DEFAULT_ENTRY_NAME$1;

      if (!contains(apps, name)) {
        throw ERROR_FACTORY.create("no-app"
        /* NO_APP */
        , {
          appName: name
        });
      }

      return apps[name];
    } // @ts-ignore


    app['App'] = firebaseAppImpl;

    function initializeApp(options, rawConfig) {
      if (rawConfig === void 0) {
        rawConfig = {};
      }

      if (_typeof(rawConfig) !== 'object' || rawConfig === null) {
        var name_1 = rawConfig;
        rawConfig = {
          name: name_1
        };
      }

      var config = rawConfig;

      if (config.name === undefined) {
        config.name = DEFAULT_ENTRY_NAME$1;
      }

      var name = config.name;

      if (typeof name !== 'string' || !name) {
        throw ERROR_FACTORY.create("bad-app-name"
        /* BAD_APP_NAME */
        , {
          appName: String(name)
        });
      }

      if (contains(apps, name)) {
        throw ERROR_FACTORY.create("duplicate-app"
        /* DUPLICATE_APP */
        , {
          appName: name
        });
      }

      var app = new firebaseAppImpl(options, config, namespace);
      apps[name] = app;
      return app;
    }
    /*
     * Return an array of all the non-deleted FirebaseApps.
     */


    function getApps() {
      // Make a copy so caller cannot mutate the apps list.
      return Object.keys(apps).map(function (name) {
        return apps[name];
      });
    }

    function registerComponent(component) {
      var e_1, _a;

      var componentName = component.name;

      if (components.has(componentName)) {
        logger.debug("There were multiple attempts to register component " + componentName + ".");
        return component.type === "PUBLIC"
        /* PUBLIC */
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        namespace[componentName] : null;
      }

      components.set(componentName, component); // create service namespace for public components

      if (component.type === "PUBLIC"
      /* PUBLIC */
      ) {
          // The Service namespace is an accessor function ...
          var serviceNamespace = function serviceNamespace(appArg) {
            if (appArg === void 0) {
              appArg = app();
            } // eslint-disable-next-line @typescript-eslint/no-explicit-any


            if (typeof appArg[componentName] !== 'function') {
              // Invalid argument.
              // This happens in the following case: firebase.storage('gs:/')
              throw ERROR_FACTORY.create("invalid-app-argument"
              /* INVALID_APP_ARGUMENT */
              , {
                appName: componentName
              });
            } // Forward service instance lookup to the FirebaseApp.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any


            return appArg[componentName]();
          }; // ... and a container for service-level properties.


          if (component.serviceProps !== undefined) {
            deepExtend(serviceNamespace, component.serviceProps);
          } // eslint-disable-next-line @typescript-eslint/no-explicit-any


          namespace[componentName] = serviceNamespace; // Patch the FirebaseAppImpl prototype
          // eslint-disable-next-line @typescript-eslint/no-explicit-any

          firebaseAppImpl.prototype[componentName] = // TODO: The eslint disable can be removed and the 'ignoreRestArgs'
          // option added to the no-explicit-any rule when ESlint releases it.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          function () {
            var args = [];

            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }

            var serviceFxn = this._getService.bind(this, componentName);

            return serviceFxn.apply(this, component.multipleInstances ? args : []);
          };
        }

      try {
        // add the component to existing app instances
        for (var _b = __values(Object.keys(apps)), _c = _b.next(); !_c.done; _c = _b.next()) {
          var appName = _c.value;

          apps[appName]._addComponent(component);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }

      return component.type === "PUBLIC"
      /* PUBLIC */
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      namespace[componentName] : null;
    }

    function registerVersion(libraryKeyOrName, version, variant) {
      var _a; // TODO: We can use this check to whitelist strings when/if we set up
      // a good whitelist system.


      var library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName]) !== null && _a !== void 0 ? _a : libraryKeyOrName;

      if (variant) {
        library += "-" + variant;
      }

      var libraryMismatch = library.match(/\s|\//);
      var versionMismatch = version.match(/\s|\//);

      if (libraryMismatch || versionMismatch) {
        var warning = ["Unable to register library \"" + library + "\" with version \"" + version + "\":"];

        if (libraryMismatch) {
          warning.push("library name \"" + library + "\" contains illegal characters (whitespace or \"/\")");
        }

        if (libraryMismatch && versionMismatch) {
          warning.push('and');
        }

        if (versionMismatch) {
          warning.push("version name \"" + version + "\" contains illegal characters (whitespace or \"/\")");
        }

        logger.warn(warning.join(' '));
        return;
      }

      registerComponent(new Component(library + "-version", function () {
        return {
          library: library,
          version: version
        };
      }, "VERSION"
      /* VERSION */
      ));
    }

    function onLog(logCallback, options) {
      if (logCallback !== null && typeof logCallback !== 'function') {
        throw ERROR_FACTORY.create("invalid-log-argument"
        /* INVALID_LOG_ARGUMENT */
        , {
          appName: name
        });
      }

      setUserLogHandler(logCallback, options);
    } // Map the requested service to a registered service name
    // (used to map auth to serverAuth service when needed).


    function useAsService(app, name) {
      if (name === 'serverAuth') {
        return null;
      }

      var useService = name;
      return useService;
    }

    return namespace;
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
   * Return a firebase namespace object.
   *
   * In production, this will be called exactly once and the result
   * assigned to the 'firebase' global.  It may be called multiple times
   * in unit tests.
   */


  function createFirebaseNamespace() {
    var namespace = createFirebaseNamespaceCore(FirebaseAppImpl);
    namespace.INTERNAL = _assign(_assign({}, namespace.INTERNAL), {
      createFirebaseNamespace: createFirebaseNamespace,
      extendNamespace: extendNamespace,
      createSubscribe: createSubscribe,
      ErrorFactory: ErrorFactory,
      deepExtend: deepExtend
    });
    /**
     * Patch the top-level firebase namespace with additional properties.
     *
     * firebase.INTERNAL.extendNamespace()
     */

    function extendNamespace(props) {
      deepExtend(namespace, props);
    }

    return namespace;
  }

  var firebase = createFirebaseNamespace();
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

  var PlatformLoggerService =
  /** @class */
  function () {
    function PlatformLoggerService(container) {
      this.container = container;
    } // In initial implementation, this will be called by installations on
    // auth token refresh, and installations will send this string.


    PlatformLoggerService.prototype.getPlatformInfoString = function () {
      var providers = this.container.getProviders(); // Loop through providers and get library/version pairs from any that are
      // version components.

      return providers.map(function (provider) {
        if (isVersionServiceProvider(provider)) {
          var service = provider.getImmediate();
          return service.library + "/" + service.version;
        } else {
          return null;
        }
      }).filter(function (logString) {
        return logString;
      }).join(' ');
    };

    return PlatformLoggerService;
  }();
  /**
   *
   * @param provider check if this provider provides a VersionService
   *
   * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
   * provides VersionService. The provider is not necessarily a 'app-version'
   * provider.
   */


  function isVersionServiceProvider(provider) {
    var component = provider.getComponent();
    return (component === null || component === void 0 ? void 0 : component.type) === "VERSION"
    /* VERSION */
    ;
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


  function registerCoreComponents(firebase, variant) {
    firebase.INTERNAL.registerComponent(new Component('platform-logger', function (container) {
      return new PlatformLoggerService(container);
    }, "PRIVATE"
    /* PRIVATE */
    )); // Register `app` package.

    firebase.registerVersion(name$1, version, variant); // Register platform SDK identifier (no version).

    firebase.registerVersion('fire-js', '');
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
  // Firebase Lite detection test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any


  if (isBrowser() && self.firebase !== undefined) {
    logger.warn("\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  "); // eslint-disable-next-line

    var sdkVersion = self.firebase.SDK_VERSION;

    if (sdkVersion && sdkVersion.indexOf('LITE') >= 0) {
      logger.warn("\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    ");
    }
  }

  var initializeApp = firebase.initializeApp; // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
  // the no-explicit-any rule when ESlint releases it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  firebase.initializeApp = function () {
    var args = [];

    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    } // Environment check before initializing app
    // Do the check in initializeApp, so people have a chance to disable it by setting logLevel
    // in @firebase/logger


    if (isNode()) {
      logger.warn("\n      Warning: This is a browser-targeted Firebase bundle but it appears it is being\n      run in a Node environment.  If running in a Node environment, make sure you\n      are using the bundle specified by the \"main\" field in package.json.\n      \n      If you are using Webpack, you can specify \"main\" as the first item in\n      \"resolve.mainFields\":\n      https://webpack.js.org/configuration/resolve/#resolvemainfields\n      \n      If using Rollup, use the rollup-plugin-node-resolve plugin and specify \"main\"\n      as the first item in \"mainFields\", e.g. ['main', 'module'].\n      https://github.com/rollup/rollup-plugin-node-resolve\n      ");
    }

    return initializeApp.apply(undefined, args);
  };

  var firebase$1 = firebase;
  registerCoreComponents(firebase$1);

  var name$d = "firebase";
  var version$2 = "7.18.0";
  /**
   * @license
   * Copyright 2018 Google LLC
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

  firebase$1.registerVersion(name$d, version$2, 'app');

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */

  /* global Reflect, Promise */
  var _extendStatics$1 = function extendStatics(d, b) {
    _extendStatics$1 = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (b.hasOwnProperty(p)) d[p] = b[p];
      }
    };

    return _extendStatics$1(d, b);
  };

  function __extends$1(d, b) {
    _extendStatics$1(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  function __values$1(o) {
    var s = typeof Symbol === "function" && Symbol.iterator,
        m = s && o[s],
        i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
      next: function next() {
        if (o && i >= o.length) o = void 0;
        return {
          value: o && o[i++],
          done: !o
        };
      }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
  var g,
      goog = goog || {},
      k = commonjsGlobal || self;

  function aa() {}

  function ba(a) {
    var b = _typeof(a);

    return "object" != b ? b : a ? Array.isArray(a) ? "array" : b : "null";
  }

  function ca(a) {
    var b = ba(a);
    return "array" == b || "object" == b && "number" == typeof a.length;
  }

  function n(a) {
    var b = _typeof(a);

    return "object" == b && null != a || "function" == b;
  }

  function da(a) {
    return Object.prototype.hasOwnProperty.call(a, ea) && a[ea] || (a[ea] = ++fa);
  }

  var ea = "closure_uid_" + (1E9 * Math.random() >>> 0),
      fa = 0;

  function ha(a, b, c) {
    return a.call.apply(a.bind, arguments);
  }

  function ja(a, b, c) {
    if (!a) throw Error();

    if (2 < arguments.length) {
      var d = Array.prototype.slice.call(arguments, 2);
      return function () {
        var e = Array.prototype.slice.call(arguments);
        Array.prototype.unshift.apply(e, d);
        return a.apply(b, e);
      };
    }

    return function () {
      return a.apply(b, arguments);
    };
  }

  function p(a, b, c) {
    Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? p = ha : p = ja;
    return p.apply(null, arguments);
  }

  function ka(a, b) {
    var c = Array.prototype.slice.call(arguments, 1);
    return function () {
      var d = c.slice();
      d.push.apply(d, arguments);
      return a.apply(this, d);
    };
  }

  var q = Date.now;

  function r(a, b) {
    function c() {}

    c.prototype = b.prototype;
    a.S = b.prototype;
    a.prototype = new c();
    a.prototype.constructor = a;
  }

  function u() {
    this.j = this.j;
    this.i = this.i;
  }

  var la = 0;
  u.prototype.j = !1;

  u.prototype.ja = function () {
    if (!this.j && (this.j = !0, this.G(), 0 != la)) {
      var a = da(this);
    }
  };

  u.prototype.G = function () {
    if (this.i) for (; this.i.length;) {
      this.i.shift()();
    }
  };

  var na = Array.prototype.indexOf ? function (a, b) {
    return Array.prototype.indexOf.call(a, b, void 0);
  } : function (a, b) {
    if ("string" === typeof a) return "string" !== typeof b || 1 != b.length ? -1 : a.indexOf(b, 0);

    for (var c = 0; c < a.length; c++) {
      if (c in a && a[c] === b) return c;
    }

    return -1;
  },
      oa = Array.prototype.forEach ? function (a, b, c) {
    Array.prototype.forEach.call(a, b, c);
  } : function (a, b, c) {
    for (var d = a.length, e = "string" === typeof a ? a.split("") : a, f = 0; f < d; f++) {
      f in e && b.call(c, e[f], f, a);
    }
  };

  function pa(a) {
    a: {
      var b = qa;

      for (var c = a.length, d = "string" === typeof a ? a.split("") : a, e = 0; e < c; e++) {
        if (e in d && b.call(void 0, d[e], e, a)) {
          b = e;
          break a;
        }
      }

      b = -1;
    }

    return 0 > b ? null : "string" === typeof a ? a.charAt(b) : a[b];
  }

  function ra(a) {
    return Array.prototype.concat.apply([], arguments);
  }

  function sa(a) {
    var b = a.length;

    if (0 < b) {
      for (var c = Array(b), d = 0; d < b; d++) {
        c[d] = a[d];
      }

      return c;
    }

    return [];
  }

  function ta(a) {
    return /^[\s\xa0]*$/.test(a);
  }

  var ua = String.prototype.trim ? function (a) {
    return a.trim();
  } : function (a) {
    return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1];
  };

  function v(a, b) {
    return -1 != a.indexOf(b);
  }

  function xa(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  var w;

  a: {
    var ya = k.navigator;

    if (ya) {
      var za = ya.userAgent;

      if (za) {
        w = za;
        break a;
      }
    }

    w = "";
  }

  function Aa(a, b, c) {
    for (var d in a) {
      b.call(c, a[d], d, a);
    }
  }

  function Ba(a) {
    var b = {};

    for (var c in a) {
      b[c] = a[c];
    }

    return b;
  }

  var Ca = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");

  function Da(a, b) {
    var c, d;

    for (var e = 1; e < arguments.length; e++) {
      d = arguments[e];

      for (c in d) {
        a[c] = d[c];
      }

      for (var f = 0; f < Ca.length; f++) {
        c = Ca[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]);
      }
    }
  }

  function Ea(a) {
    Ea[" "](a);
    return a;
  }

  Ea[" "] = aa;

  function Fa(a, b) {
    var c = Ga;
    return Object.prototype.hasOwnProperty.call(c, a) ? c[a] : c[a] = b(a);
  }

  var Ha = v(w, "Opera"),
      x = v(w, "Trident") || v(w, "MSIE"),
      Ia = v(w, "Edge"),
      Ja = Ia || x,
      Ka = v(w, "Gecko") && !(v(w.toLowerCase(), "webkit") && !v(w, "Edge")) && !(v(w, "Trident") || v(w, "MSIE")) && !v(w, "Edge"),
      La = v(w.toLowerCase(), "webkit") && !v(w, "Edge");

  function Ma() {
    var a = k.document;
    return a ? a.documentMode : void 0;
  }

  var Na;

  a: {
    var Oa = "",
        Pa = function () {
      var a = w;
      if (Ka) return /rv:([^\);]+)(\)|;)/.exec(a);
      if (Ia) return /Edge\/([\d\.]+)/.exec(a);
      if (x) return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);
      if (La) return /WebKit\/(\S+)/.exec(a);
      if (Ha) return /(?:Version)[ \/]?(\S+)/.exec(a);
    }();

    Pa && (Oa = Pa ? Pa[1] : "");

    if (x) {
      var Qa = Ma();

      if (null != Qa && Qa > parseFloat(Oa)) {
        Na = String(Qa);
        break a;
      }
    }

    Na = Oa;
  }

  var Ga = {};

  function Ra(a) {
    return Fa(a, function () {
      {
        var b = 0;
        var e = ua(String(Na)).split("."),
            f = ua(String(a)).split("."),
            h = Math.max(e.length, f.length);

        for (var m = 0; 0 == b && m < h; m++) {
          var c = e[m] || "",
              d = f[m] || "";

          do {
            c = /(\d*)(\D*)(.*)/.exec(c) || ["", "", "", ""];
            d = /(\d*)(\D*)(.*)/.exec(d) || ["", "", "", ""];
            if (0 == c[0].length && 0 == d[0].length) break;
            b = xa(0 == c[1].length ? 0 : parseInt(c[1], 10), 0 == d[1].length ? 0 : parseInt(d[1], 10)) || xa(0 == c[2].length, 0 == d[2].length) || xa(c[2], d[2]);
            c = c[3];
            d = d[3];
          } while (0 == b);
        }
      }
      return 0 <= b;
    });
  }

  var Sa;

  if (k.document && x) {
    var Ta = Ma();
    Sa = Ta ? Ta : parseInt(Na, 10) || void 0;
  } else Sa = void 0;

  var Ua = Sa;

  var Va = !x || 9 <= Number(Ua),
      Wa = x && !Ra("9"),
      Xa = function () {
    if (!k.addEventListener || !Object.defineProperty) return !1;
    var a = !1,
        b = Object.defineProperty({}, "passive", {
      get: function get() {
        a = !0;
      }
    });

    try {
      k.addEventListener("test", aa, b), k.removeEventListener("test", aa, b);
    } catch (c) {}

    return a;
  }();

  function y(a, b) {
    this.type = a;
    this.a = this.target = b;
    this.defaultPrevented = !1;
  }

  y.prototype.b = function () {
    this.defaultPrevented = !0;
  };

  function A(a, b) {
    y.call(this, a ? a.type : "");
    this.relatedTarget = this.a = this.target = null;
    this.button = this.screenY = this.screenX = this.clientY = this.clientX = 0;
    this.key = "";
    this.metaKey = this.shiftKey = this.altKey = this.ctrlKey = !1;
    this.pointerId = 0;
    this.pointerType = "";
    this.c = null;

    if (a) {
      var c = this.type = a.type,
          d = a.changedTouches && a.changedTouches.length ? a.changedTouches[0] : null;
      this.target = a.target || a.srcElement;
      this.a = b;

      if (b = a.relatedTarget) {
        if (Ka) {
          a: {
            try {
              Ea(b.nodeName);
              var e = !0;
              break a;
            } catch (f) {}

            e = !1;
          }

          e || (b = null);
        }
      } else "mouseover" == c ? b = a.fromElement : "mouseout" == c && (b = a.toElement);

      this.relatedTarget = b;
      d ? (this.clientX = void 0 !== d.clientX ? d.clientX : d.pageX, this.clientY = void 0 !== d.clientY ? d.clientY : d.pageY, this.screenX = d.screenX || 0, this.screenY = d.screenY || 0) : (this.clientX = void 0 !== a.clientX ? a.clientX : a.pageX, this.clientY = void 0 !== a.clientY ? a.clientY : a.pageY, this.screenX = a.screenX || 0, this.screenY = a.screenY || 0);
      this.button = a.button;
      this.key = a.key || "";
      this.ctrlKey = a.ctrlKey;
      this.altKey = a.altKey;
      this.shiftKey = a.shiftKey;
      this.metaKey = a.metaKey;
      this.pointerId = a.pointerId || 0;
      this.pointerType = "string" === typeof a.pointerType ? a.pointerType : Ya[a.pointerType] || "";
      this.c = a;
      a.defaultPrevented && this.b();
    }
  }

  r(A, y);
  var Ya = {
    2: "touch",
    3: "pen",
    4: "mouse"
  };

  A.prototype.b = function () {
    A.S.b.call(this);
    var a = this.c;
    if (a.preventDefault) a.preventDefault();else if (a.returnValue = !1, Wa) try {
      if (a.ctrlKey || 112 <= a.keyCode && 123 >= a.keyCode) a.keyCode = -1;
    } catch (b) {}
  };

  var C = "closure_listenable_" + (1E6 * Math.random() | 0),
      Za = 0;

  function $a(a, b, c, d, e) {
    this.listener = a;
    this.proxy = null;
    this.src = b;
    this.type = c;
    this.capture = !!d;
    this.ca = e;
    this.key = ++Za;
    this.Y = this.Z = !1;
  }

  function ab(a) {
    a.Y = !0;
    a.listener = null;
    a.proxy = null;
    a.src = null;
    a.ca = null;
  }

  function bb(a) {
    this.src = a;
    this.a = {};
    this.b = 0;
  }

  bb.prototype.add = function (a, b, c, d, e) {
    var f = a.toString();
    a = this.a[f];
    a || (a = this.a[f] = [], this.b++);
    var h = cb(a, b, d, e);
    -1 < h ? (b = a[h], c || (b.Z = !1)) : (b = new $a(b, this.src, f, !!d, e), b.Z = c, a.push(b));
    return b;
  };

  function db(a, b) {
    var c = b.type;

    if (c in a.a) {
      var d = a.a[c],
          e = na(d, b),
          f;
      (f = 0 <= e) && Array.prototype.splice.call(d, e, 1);
      f && (ab(b), 0 == a.a[c].length && (delete a.a[c], a.b--));
    }
  }

  function cb(a, b, c, d) {
    for (var e = 0; e < a.length; ++e) {
      var f = a[e];
      if (!f.Y && f.listener == b && f.capture == !!c && f.ca == d) return e;
    }

    return -1;
  }

  var eb = "closure_lm_" + (1E6 * Math.random() | 0),
      fb = {};

  function hb(a, b, c, d, e) {
    if (d && d.once) return ib(a, b, c, d, e);

    if (Array.isArray(b)) {
      for (var f = 0; f < b.length; f++) {
        hb(a, b[f], c, d, e);
      }

      return null;
    }

    c = jb(c);
    return a && a[C] ? a.va(b, c, n(d) ? !!d.capture : !!d, e) : kb(a, b, c, !1, d, e);
  }

  function kb(a, b, c, d, e, f) {
    if (!b) throw Error("Invalid event type");
    var h = n(e) ? !!e.capture : !!e;
    if (h && !Va) return null;
    var m = lb(a);
    m || (a[eb] = m = new bb(a));
    c = m.add(b, c, d, h, f);
    if (c.proxy) return c;
    d = mb();
    c.proxy = d;
    d.src = a;
    d.listener = c;
    if (a.addEventListener) Xa || (e = h), void 0 === e && (e = !1), a.addEventListener(b.toString(), d, e);else if (a.attachEvent) a.attachEvent(nb(b.toString()), d);else if (a.addListener && a.removeListener) a.addListener(d);else throw Error("addEventListener and attachEvent are unavailable.");
    return c;
  }

  function mb() {
    var a = ob,
        b = Va ? function (c) {
      return a.call(b.src, b.listener, c);
    } : function (c) {
      c = a.call(b.src, b.listener, c);
      if (!c) return c;
    };
    return b;
  }

  function ib(a, b, c, d, e) {
    if (Array.isArray(b)) {
      for (var f = 0; f < b.length; f++) {
        ib(a, b[f], c, d, e);
      }

      return null;
    }

    c = jb(c);
    return a && a[C] ? a.wa(b, c, n(d) ? !!d.capture : !!d, e) : kb(a, b, c, !0, d, e);
  }

  function pb(a, b, c, d, e) {
    if (Array.isArray(b)) for (var f = 0; f < b.length; f++) {
      pb(a, b[f], c, d, e);
    } else (d = n(d) ? !!d.capture : !!d, c = jb(c), a && a[C]) ? (a = a.c, b = String(b).toString(), b in a.a && (f = a.a[b], c = cb(f, c, d, e), -1 < c && (ab(f[c]), Array.prototype.splice.call(f, c, 1), 0 == f.length && (delete a.a[b], a.b--)))) : a && (a = lb(a)) && (b = a.a[b.toString()], a = -1, b && (a = cb(b, c, d, e)), (c = -1 < a ? b[a] : null) && rb(c));
  }

  function rb(a) {
    if ("number" !== typeof a && a && !a.Y) {
      var b = a.src;
      if (b && b[C]) db(b.c, a);else {
        var c = a.type,
            d = a.proxy;
        b.removeEventListener ? b.removeEventListener(c, d, a.capture) : b.detachEvent ? b.detachEvent(nb(c), d) : b.addListener && b.removeListener && b.removeListener(d);
        (c = lb(b)) ? (db(c, a), 0 == c.b && (c.src = null, b[eb] = null)) : ab(a);
      }
    }
  }

  function nb(a) {
    return a in fb ? fb[a] : fb[a] = "on" + a;
  }

  function sb(a, b) {
    var c = a.listener,
        d = a.ca || a.src;
    a.Z && rb(a);
    return c.call(d, b);
  }

  function ob(a, b) {
    if (a.Y) return !0;

    if (!Va) {
      if (!b) a: {
        b = ["window", "event"];

        for (var c = k, d = 0; d < b.length; d++) {
          if (c = c[b[d]], null == c) {
            b = null;
            break a;
          }
        }

        b = c;
      }
      b = new A(b, this);
      return sb(a, b);
    }

    return sb(a, new A(b, this));
  }

  function lb(a) {
    a = a[eb];
    return a instanceof bb ? a : null;
  }

  var tb = "__closure_events_fn_" + (1E9 * Math.random() >>> 0);

  function jb(a) {
    if ("function" == ba(a)) return a;
    a[tb] || (a[tb] = function (b) {
      return a.handleEvent(b);
    });
    return a[tb];
  }

  function D() {
    u.call(this);
    this.c = new bb(this);
    this.J = this;
    this.C = null;
  }

  r(D, u);
  D.prototype[C] = !0;
  g = D.prototype;

  g.addEventListener = function (a, b, c, d) {
    hb(this, a, b, c, d);
  };

  g.removeEventListener = function (a, b, c, d) {
    pb(this, a, b, c, d);
  };

  g.dispatchEvent = function (a) {
    var b,
        c = this.C;
    if (c) for (b = []; c; c = c.C) {
      b.push(c);
    }
    c = this.J;
    var d = a.type || a;
    if ("string" === typeof a) a = new y(a, c);else if (a instanceof y) a.target = a.target || c;else {
      var e = a;
      a = new y(d, c);
      Da(a, e);
    }
    e = !0;
    if (b) for (var f = b.length - 1; 0 <= f; f--) {
      var h = a.a = b[f];
      e = ub(h, d, !0, a) && e;
    }
    h = a.a = c;
    e = ub(h, d, !0, a) && e;
    e = ub(h, d, !1, a) && e;
    if (b) for (f = 0; f < b.length; f++) {
      h = a.a = b[f], e = ub(h, d, !1, a) && e;
    }
    return e;
  };

  g.G = function () {
    D.S.G.call(this);

    if (this.c) {
      var a = this.c,
          c;

      for (c in a.a) {
        for (var d = a.a[c], e = 0; e < d.length; e++) {
          ab(d[e]);
        }

        delete a.a[c];
        a.b--;
      }
    }

    this.C = null;
  };

  g.va = function (a, b, c, d) {
    return this.c.add(String(a), b, !1, c, d);
  };

  g.wa = function (a, b, c, d) {
    return this.c.add(String(a), b, !0, c, d);
  };

  function ub(a, b, c, d) {
    b = a.c.a[String(b)];
    if (!b) return !0;
    b = b.concat();

    for (var e = !0, f = 0; f < b.length; ++f) {
      var h = b[f];

      if (h && !h.Y && h.capture == c) {
        var m = h.listener,
            l = h.ca || h.src;
        h.Z && db(a.c, h);
        e = !1 !== m.call(l, d) && e;
      }
    }

    return e && !d.defaultPrevented;
  }

  var vb = k.JSON.stringify;

  function wb() {
    this.b = this.a = null;
  }

  var yb = new (
  /** @class */
  function () {
    function class_1(a, b, c) {
      this.f = c;
      this.c = a;
      this.g = b;
      this.b = 0;
      this.a = null;
    }

    class_1.prototype.get = function () {
      var a;
      0 < this.b ? (this.b--, a = this.a, this.a = a.next, a.next = null) : a = this.c();
      return a;
    };

    return class_1;
  }())(function () {
    return new xb();
  }, function (a) {
    a.reset();
  }, 100);

  wb.prototype.add = function (a, b) {
    var c = yb.get();
    c.set(a, b);
    this.b ? this.b.next = c : this.a = c;
    this.b = c;
  };

  function zb() {
    var a = Ab,
        b = null;
    a.a && (b = a.a, a.a = a.a.next, a.a || (a.b = null), b.next = null);
    return b;
  }

  function xb() {
    this.next = this.b = this.a = null;
  }

  xb.prototype.set = function (a, b) {
    this.a = a;
    this.b = b;
    this.next = null;
  };

  xb.prototype.reset = function () {
    this.next = this.b = this.a = null;
  };

  function Bb(a) {
    k.setTimeout(function () {
      throw a;
    }, 0);
  }

  function Cb(a, b) {
    Db || Eb();
    Fb || (Db(), Fb = !0);
    Ab.add(a, b);
  }

  var Db;

  function Eb() {
    var a = k.Promise.resolve(void 0);

    Db = function Db() {
      a.then(Gb);
    };
  }

  var Fb = !1,
      Ab = new wb();

  function Gb() {
    for (var a; a = zb();) {
      try {
        a.a.call(a.b);
      } catch (c) {
        Bb(c);
      }

      var b = yb;
      b.g(a);
      b.b < b.f && (b.b++, a.next = b.a, b.a = a);
    }

    Fb = !1;
  }

  function Hb(a, b) {
    D.call(this);
    this.b = a || 1;
    this.a = b || k;
    this.f = p(this.Ya, this);
    this.g = q();
  }

  r(Hb, D);
  g = Hb.prototype;
  g.aa = !1;
  g.M = null;

  g.Ya = function () {
    if (this.aa) {
      var a = q() - this.g;
      0 < a && a < .8 * this.b ? this.M = this.a.setTimeout(this.f, this.b - a) : (this.M && (this.a.clearTimeout(this.M), this.M = null), this.dispatchEvent("tick"), this.aa && (Ib(this), this.start()));
    }
  };

  g.start = function () {
    this.aa = !0;
    this.M || (this.M = this.a.setTimeout(this.f, this.b), this.g = q());
  };

  function Ib(a) {
    a.aa = !1;
    a.M && (a.a.clearTimeout(a.M), a.M = null);
  }

  g.G = function () {
    Hb.S.G.call(this);
    Ib(this);
    delete this.a;
  };

  function Jb(a, b, c) {
    if ("function" == ba(a)) c && (a = p(a, c));else if (a && "function" == typeof a.handleEvent) a = p(a.handleEvent, a);else throw Error("Invalid listener argument");
    return 2147483647 < Number(b) ? -1 : k.setTimeout(a, b || 0);
  }

  function Kb(a) {
    a.a = Jb(function () {
      a.a = null;
      a.c && (a.c = !1, Kb(a));
    }, a.h);
    var b = a.b;
    a.b = null;
    a.g.apply(null, b);
  }

  var Lb =
  /** @class */
  function (_super) {
    __extends$1(Lb, _super);

    function Lb(a, b, c) {
      var _this = _super.call(this) || this;

      _this.g = null != c ? a.bind(c) : a;
      _this.h = b;
      _this.b = null;
      _this.c = !1;
      _this.a = null;
      return _this;
    }

    Lb.prototype.f = function (a) {
      this.b = arguments;
      this.a ? this.c = !0 : Kb(this);
    };

    Lb.prototype.G = function () {
      _super.prototype.G.call(this);

      this.a && (k.clearTimeout(this.a), this.a = null, this.c = !1, this.b = null);
    };

    return Lb;
  }(u);

  function E(a) {
    u.call(this);
    this.b = a;
    this.a = {};
  }

  r(E, u);
  var Mb = [];

  function Nb(a, b, c, d) {
    Array.isArray(c) || (c && (Mb[0] = c.toString()), c = Mb);

    for (var e = 0; e < c.length; e++) {
      var f = hb(b, c[e], d || a.handleEvent, !1, a.b || a);
      if (!f) break;
      a.a[f.key] = f;
    }
  }

  function Ob(a) {
    Aa(a.a, function (b, c) {
      this.a.hasOwnProperty(c) && rb(b);
    }, a);
    a.a = {};
  }

  E.prototype.G = function () {
    E.S.G.call(this);
    Ob(this);
  };

  E.prototype.handleEvent = function () {
    throw Error("EventHandler.handleEvent not implemented");
  };

  function Pb() {
    this.a = !0;
  }

  function Qb(a, b, c, d, e, f) {
    a.info(function () {
      if (a.a) {
        if (f) {
          var h = "";

          for (var m = f.split("&"), l = 0; l < m.length; l++) {
            var t = m[l].split("=");

            if (1 < t.length) {
              var B = t[0];
              t = t[1];
              var z = B.split("_");
              h = 2 <= z.length && "type" == z[1] ? h + (B + "=" + t + "&") : h + (B + "=redacted&");
            }
          }
        } else h = null;
      } else h = f;
      return "XMLHTTP REQ (" + d + ") [attempt " + e + "]: " + b + "\n" + c + "\n" + h;
    });
  }

  function Rb(a, b, c, d, e, f, h) {
    a.info(function () {
      return "XMLHTTP RESP (" + d + ") [ attempt " + e + "]: " + b + "\n" + c + "\n" + f + " " + h;
    });
  }

  function F(a, b, c, d) {
    a.info(function () {
      return "XMLHTTP TEXT (" + b + "): " + Sb(a, c) + (d ? " " + d : "");
    });
  }

  function Tb(a, b) {
    a.info(function () {
      return "TIMEOUT: " + b;
    });
  }

  Pb.prototype.info = function () {};

  function Sb(a, b) {
    if (!a.a) return b;
    if (!b) return null;

    try {
      var c = JSON.parse(b);
      if (c) for (a = 0; a < c.length; a++) {
        if (Array.isArray(c[a])) {
          var d = c[a];

          if (!(2 > d.length)) {
            var e = d[1];

            if (Array.isArray(e) && !(1 > e.length)) {
              var f = e[0];
              if ("noop" != f && "stop" != f && "close" != f) for (var h = 1; h < e.length; h++) {
                e[h] = "";
              }
            }
          }
        }
      }
      return vb(c);
    } catch (m) {
      return b;
    }
  }

  var Ub = null;

  function Vb() {
    return Ub = Ub || new D();
  }

  function Wb(a) {
    y.call(this, "serverreachability", a);
  }

  r(Wb, y);

  function G(a) {
    var b = Vb();
    b.dispatchEvent(new Wb(b, a));
  }

  function Xb(a) {
    y.call(this, "statevent", a);
  }

  r(Xb, y);

  function H(a) {
    var b = Vb();
    b.dispatchEvent(new Xb(b, a));
  }

  function Yb(a) {
    y.call(this, "timingevent", a);
  }

  r(Yb, y);

  function I(a, b) {
    if ("function" != ba(a)) throw Error("Fn must not be null and must be a function");
    return k.setTimeout(function () {
      a();
    }, b);
  }

  var Zb = {
    NO_ERROR: 0,
    Za: 1,
    gb: 2,
    fb: 3,
    bb: 4,
    eb: 5,
    hb: 6,
    Da: 7,
    TIMEOUT: 8,
    kb: 9
  };
  var $b = {
    ab: "complete",
    ob: "success",
    Ea: "error",
    Da: "abort",
    mb: "ready",
    nb: "readystatechange",
    TIMEOUT: "timeout",
    ib: "incrementaldata",
    lb: "progress",
    cb: "downloadprogress",
    pb: "uploadprogress"
  };

  function ac() {}

  ac.prototype.a = null;

  function bc(a) {
    var b;
    (b = a.a) || (b = a.a = {});
    return b;
  }

  function cc() {}

  var J = {
    OPEN: "a",
    $a: "b",
    Ea: "c",
    jb: "d"
  };

  function dc() {
    y.call(this, "d");
  }

  r(dc, y);

  function ec() {
    y.call(this, "c");
  }

  r(ec, y);
  var fc;

  function gc() {}

  r(gc, ac);
  fc = new gc();

  function K(a, b, c, d) {
    this.g = a;
    this.c = b;
    this.f = c;
    this.T = d || 1;
    this.J = new E(this);
    this.P = hc;
    a = Ja ? 125 : void 0;
    this.R = new Hb(a);
    this.B = null;
    this.b = !1;
    this.j = this.l = this.i = this.H = this.u = this.U = this.o = null;
    this.s = [];
    this.a = null;
    this.D = 0;
    this.h = this.m = null;
    this.N = -1;
    this.A = !1;
    this.O = 0;
    this.F = null;
    this.W = this.C = this.V = this.I = !1;
  }

  var hc = 45E3,
      ic = {},
      jc = {};
  g = K.prototype;

  g.setTimeout = function (a) {
    this.P = a;
  };

  function kc(a, b, c) {
    a.H = 1;
    a.i = lc(L(b));
    a.j = c;
    a.I = !0;
    mc(a, null);
  }

  function mc(a, b) {
    a.u = q();
    M(a);
    a.l = L(a.i);
    var c = a.l,
        d = a.T;
    Array.isArray(d) || (d = [String(d)]);
    nc(c.b, "t", d);
    a.D = 0;
    a.a = oc(a.g, a.g.C ? b : null);
    0 < a.O && (a.F = new Lb(p(a.Ca, a, a.a), a.O));
    Nb(a.J, a.a, "readystatechange", a.Wa);
    b = a.B ? Ba(a.B) : {};
    a.j ? (a.m || (a.m = "POST"), b["Content-Type"] = "application/x-www-form-urlencoded", a.a.ba(a.l, a.m, a.j, b)) : (a.m = "GET", a.a.ba(a.l, a.m, null, b));
    G(1);
    Qb(a.c, a.m, a.l, a.f, a.T, a.j);
  }

  g.Wa = function (a) {
    a = a.target;
    var b = this.F;
    b && 3 == N(a) ? b.f() : this.Ca(a);
  };

  g.Ca = function (a) {
    try {
      if (a == this.a) a: {
        var b = N(this.a),
            c = this.a.ua(),
            d = this.a.X();

        if (!(3 > b || 3 == b && !Ja && !this.a.$())) {
          this.A || 4 != b || 7 == c || (8 == c || 0 >= d ? G(3) : G(2));
          pc(this);
          var e = this.a.X();
          this.N = e;
          var f = this.a.$();
          this.b = 200 == e;
          Rb(this.c, this.m, this.l, this.f, this.T, b, e);

          if (this.b) {
            if (this.V && !this.C) {
              b: {
                if (this.a) {
                  var h,
                      m = this.a;

                  if ((h = m.a ? m.a.getResponseHeader("X-HTTP-Initial-Response") : null) && !ta(h)) {
                    var l = h;
                    break b;
                  }
                }

                l = null;
              }

              if (l) F(this.c, this.f, l, "Initial handshake response via X-HTTP-Initial-Response"), this.C = !0, qc(this, l);else {
                this.b = !1;
                this.h = 3;
                H(12);
                O(this);
                rc(this);
                break a;
              }
            }

            this.I ? (tc(this, b, f), Ja && this.b && 3 == b && (Nb(this.J, this.R, "tick", this.Va), this.R.start())) : (F(this.c, this.f, f, null), qc(this, f));
            4 == b && O(this);
            this.b && !this.A && (4 == b ? uc(this.g, this) : (this.b = !1, M(this)));
          } else 400 == e && 0 < f.indexOf("Unknown SID") ? (this.h = 3, H(12)) : (this.h = 0, H(13)), O(this), rc(this);
        }
      }
    } catch (t) {} finally {}
  };

  function tc(a, b, c) {
    for (var d = !0; !a.A && a.D < c.length;) {
      var e = vc(a, c);

      if (e == jc) {
        4 == b && (a.h = 4, H(14), d = !1);
        F(a.c, a.f, null, "[Incomplete Response]");
        break;
      } else if (e == ic) {
        a.h = 4;
        H(15);
        F(a.c, a.f, c, "[Invalid Chunk]");
        d = !1;
        break;
      } else F(a.c, a.f, e, null), qc(a, e);
    }

    4 == b && 0 == c.length && (a.h = 1, H(16), d = !1);
    a.b = a.b && d;
    d ? 0 < c.length && !a.W && (a.W = !0, b = a.g, b.a == a && b.V && !b.F && (b.c.info("Great, no buffering proxy detected. Bytes received: " + c.length), xc(b), b.F = !0)) : (F(a.c, a.f, c, "[Invalid Chunked Response]"), O(a), rc(a));
  }

  g.Va = function () {
    if (this.a) {
      var a = N(this.a),
          b = this.a.$();
      this.D < b.length && (pc(this), tc(this, a, b), this.b && 4 != a && M(this));
    }
  };

  function vc(a, b) {
    var c = a.D,
        d = b.indexOf("\n", c);
    if (-1 == d) return jc;
    c = Number(b.substring(c, d));
    if (isNaN(c)) return ic;
    d += 1;
    if (d + c > b.length) return jc;
    b = b.substr(d, c);
    a.D = d + c;
    return b;
  }

  g.cancel = function () {
    this.A = !0;
    O(this);
  };

  function M(a) {
    a.U = q() + a.P;
    yc(a, a.P);
  }

  function yc(a, b) {
    if (null != a.o) throw Error("WatchDog timer not null");
    a.o = I(p(a.Ua, a), b);
  }

  function pc(a) {
    a.o && (k.clearTimeout(a.o), a.o = null);
  }

  g.Ua = function () {
    this.o = null;
    var a = q();
    0 <= a - this.U ? (Tb(this.c, this.l), 2 != this.H && (G(3), H(17)), O(this), this.h = 2, rc(this)) : yc(this, this.U - a);
  };

  function rc(a) {
    0 == a.g.v || a.A || uc(a.g, a);
  }

  function O(a) {
    pc(a);
    var b = a.F;
    b && "function" == typeof b.ja && b.ja();
    a.F = null;
    Ib(a.R);
    Ob(a.J);
    a.a && (b = a.a, a.a = null, b.abort(), b.ja());
  }

  function qc(a, b) {
    try {
      var c = a.g;
      if (0 != c.v && (c.a == a || zc(c.b, a))) if (c.I = a.N, !a.C && zc(c.b, a) && 3 == c.v) {
        try {
          var d = c.ka.a.parse(b);
        } catch (sc) {
          d = null;
        }

        if (Array.isArray(d) && 3 == d.length) {
          var e = d;
          if (0 == e[0]) a: {
            if (!c.j) {
              if (c.a) if (c.a.u + 3E3 < a.u) Ac(c), Bc(c);else break a;
              Cc(c);
              H(18);
            }
          } else c.oa = e[1], 0 < c.oa - c.P && 37500 > e[2] && c.H && 0 == c.o && !c.m && (c.m = I(p(c.Ra, c), 6E3));

          if (1 >= Dc(c.b) && c.ea) {
            try {
              c.ea();
            } catch (sc) {}

            c.ea = void 0;
          }
        } else P(c, 11);
      } else if ((a.C || c.a == a) && Ac(c), !ta(b)) for (b = d = c.ka.a.parse(b), d = 0; d < b.length; d++) {
        if (e = b[d], c.P = e[0], e = e[1], 2 == c.v) {
          if ("c" == e[0]) {
            c.J = e[1];
            c.ga = e[2];
            var f = e[3];
            null != f && (c.ha = f, c.c.info("VER=" + c.ha));
            var h = e[4];
            null != h && (c.pa = h, c.c.info("SVER=" + c.pa));
            var m = e[5];

            if (null != m && "number" === typeof m && 0 < m) {
              var l = 1.5 * m;
              c.D = l;
              c.c.info("backChannelRequestTimeoutMs_=" + l);
            }

            l = c;
            var t = a.a;

            if (t) {
              var B = t.a ? t.a.getResponseHeader("X-Client-Wire-Protocol") : null;

              if (B) {
                var z = l.b;
                !z.a && (v(B, "spdy") || v(B, "quic") || v(B, "h2")) && (z.f = z.g, z.a = new Set(), z.b && (Ec(z, z.b), z.b = null));
              }

              if (l.A) {
                var qb = t.a ? t.a.getResponseHeader("X-HTTP-Session-Id") : null;
                qb && (l.na = qb, Q(l.B, l.A, qb));
              }
            }

            c.v = 3;
            c.f && c.f.ta();
            c.V && (c.N = q() - a.u, c.c.info("Handshake RTT: " + c.N + "ms"));
            l = c;
            var va = a;
            l.la = Fc(l, l.C ? l.ga : null, l.fa);

            if (va.C) {
              Gc(l.b, va);
              var wa = va,
                  wc = l.D;
              wc && wa.setTimeout(wc);
              wa.o && (pc(wa), M(wa));
              l.a = va;
            } else Hc(l);

            0 < c.g.length && Ic(c);
          } else "stop" != e[0] && "close" != e[0] || P(c, 7);
        } else 3 == c.v && ("stop" == e[0] || "close" == e[0] ? "stop" == e[0] ? P(c, 7) : Jc(c) : "noop" != e[0] && c.f && c.f.sa(e), c.o = 0);
      }
      G(4);
    } catch (sc) {}
  }

  function Kc(a) {
    if (a.K && "function" == typeof a.K) return a.K();
    if ("string" === typeof a) return a.split("");

    if (ca(a)) {
      for (var b = [], c = a.length, d = 0; d < c; d++) {
        b.push(a[d]);
      }

      return b;
    }

    b = [];
    c = 0;

    for (d in a) {
      b[c++] = a[d];
    }

    return a = b;
  }

  function Lc(a, b) {
    if (a.forEach && "function" == typeof a.forEach) a.forEach(b, void 0);else if (ca(a) || "string" === typeof a) oa(a, b, void 0);else {
      if (a.L && "function" == typeof a.L) var c = a.L();else if (a.K && "function" == typeof a.K) c = void 0;else if (ca(a) || "string" === typeof a) {
        c = [];

        for (var d = a.length, e = 0; e < d; e++) {
          c.push(e);
        }
      } else for (e in c = [], d = 0, a) {
        c[d++] = e;
      }
      d = Kc(a);
      e = d.length;

      for (var f = 0; f < e; f++) {
        b.call(void 0, d[f], c && c[f], a);
      }
    }
  }

  function R(a, b) {
    this.b = {};
    this.a = [];
    this.c = 0;
    var c = arguments.length;

    if (1 < c) {
      if (c % 2) throw Error("Uneven number of arguments");

      for (var d = 0; d < c; d += 2) {
        this.set(arguments[d], arguments[d + 1]);
      }
    } else if (a) if (a instanceof R) for (c = a.L(), d = 0; d < c.length; d++) {
      this.set(c[d], a.get(c[d]));
    } else for (d in a) {
      this.set(d, a[d]);
    }
  }

  g = R.prototype;

  g.K = function () {
    Mc(this);

    for (var a = [], b = 0; b < this.a.length; b++) {
      a.push(this.b[this.a[b]]);
    }

    return a;
  };

  g.L = function () {
    Mc(this);
    return this.a.concat();
  };

  function Mc(a) {
    if (a.c != a.a.length) {
      for (var b = 0, c = 0; b < a.a.length;) {
        var d = a.a[b];
        S(a.b, d) && (a.a[c++] = d);
        b++;
      }

      a.a.length = c;
    }

    if (a.c != a.a.length) {
      var e = {};

      for (c = b = 0; b < a.a.length;) {
        d = a.a[b], S(e, d) || (a.a[c++] = d, e[d] = 1), b++;
      }

      a.a.length = c;
    }
  }

  g.get = function (a, b) {
    return S(this.b, a) ? this.b[a] : b;
  };

  g.set = function (a, b) {
    S(this.b, a) || (this.c++, this.a.push(a));
    this.b[a] = b;
  };

  g.forEach = function (a, b) {
    for (var c = this.L(), d = 0; d < c.length; d++) {
      var e = c[d],
          f = this.get(e);
      a.call(b, f, e, this);
    }
  };

  function S(a, b) {
    return Object.prototype.hasOwnProperty.call(a, b);
  }

  var Nc = /^(?:([^:/?#.]+):)?(?:\/\/(?:([^\\/?#]*)@)?([^\\/?#]*?)(?::([0-9]+))?(?=[\\/?#]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;

  function Oc(a, b) {
    if (a) {
      a = a.split("&");

      for (var c = 0; c < a.length; c++) {
        var d = a[c].indexOf("="),
            e = null;

        if (0 <= d) {
          var f = a[c].substring(0, d);
          e = a[c].substring(d + 1);
        } else f = a[c];

        b(f, e ? decodeURIComponent(e.replace(/\+/g, " ")) : "");
      }
    }
  }

  function T(a, b) {
    this.c = this.j = this.f = "";
    this.h = null;
    this.i = this.g = "";
    this.a = !1;

    if (a instanceof T) {
      this.a = void 0 !== b ? b : a.a;
      Pc(this, a.f);
      this.j = a.j;
      Qc(this, a.c);
      Rc(this, a.h);
      this.g = a.g;
      b = a.b;
      var c = new U();
      c.c = b.c;
      b.a && (c.a = new R(b.a), c.b = b.b);
      Sc(this, c);
      this.i = a.i;
    } else a && (c = String(a).match(Nc)) ? (this.a = !!b, Pc(this, c[1] || "", !0), this.j = Tc(c[2] || ""), Qc(this, c[3] || "", !0), Rc(this, c[4]), this.g = Tc(c[5] || "", !0), Sc(this, c[6] || "", !0), this.i = Tc(c[7] || "")) : (this.a = !!b, this.b = new U(null, this.a));
  }

  T.prototype.toString = function () {
    var a = [],
        b = this.f;
    b && a.push(Uc(b, Vc, !0), ":");
    var c = this.c;
    if (c || "file" == b) a.push("//"), (b = this.j) && a.push(Uc(b, Vc, !0), "@"), a.push(encodeURIComponent(String(c)).replace(/%25([0-9a-fA-F]{2})/g, "%$1")), c = this.h, null != c && a.push(":", String(c));
    if (c = this.g) this.c && "/" != c.charAt(0) && a.push("/"), a.push(Uc(c, "/" == c.charAt(0) ? Wc : Xc, !0));
    (c = this.b.toString()) && a.push("?", c);
    (c = this.i) && a.push("#", Uc(c, Yc));
    return a.join("");
  };

  function L(a) {
    return new T(a);
  }

  function Pc(a, b, c) {
    a.f = c ? Tc(b, !0) : b;
    a.f && (a.f = a.f.replace(/:$/, ""));
  }

  function Qc(a, b, c) {
    a.c = c ? Tc(b, !0) : b;
  }

  function Rc(a, b) {
    if (b) {
      b = Number(b);
      if (isNaN(b) || 0 > b) throw Error("Bad port number " + b);
      a.h = b;
    } else a.h = null;
  }

  function Sc(a, b, c) {
    b instanceof U ? (a.b = b, Zc(a.b, a.a)) : (c || (b = Uc(b, $c)), a.b = new U(b, a.a));
  }

  function Q(a, b, c) {
    a.b.set(b, c);
  }

  function lc(a) {
    Q(a, "zx", Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ q()).toString(36));
    return a;
  }

  function ad(a) {
    return a instanceof T ? L(a) : new T(a, void 0);
  }

  function bd(a, b, c, d) {
    var e = new T(null, void 0);
    a && Pc(e, a);
    b && Qc(e, b);
    c && Rc(e, c);
    d && (e.g = d);
    return e;
  }

  function Tc(a, b) {
    return a ? b ? decodeURI(a.replace(/%25/g, "%2525")) : decodeURIComponent(a) : "";
  }

  function Uc(a, b, c) {
    return "string" === typeof a ? (a = encodeURI(a).replace(b, cd), c && (a = a.replace(/%25([0-9a-fA-F]{2})/g, "%$1")), a) : null;
  }

  function cd(a) {
    a = a.charCodeAt(0);
    return "%" + (a >> 4 & 15).toString(16) + (a & 15).toString(16);
  }

  var Vc = /[#\/\?@]/g,
      Xc = /[#\?:]/g,
      Wc = /[#\?]/g,
      $c = /[#\?@]/g,
      Yc = /#/g;

  function U(a, b) {
    this.b = this.a = null;
    this.c = a || null;
    this.f = !!b;
  }

  function V(a) {
    a.a || (a.a = new R(), a.b = 0, a.c && Oc(a.c, function (b, c) {
      a.add(decodeURIComponent(b.replace(/\+/g, " ")), c);
    }));
  }

  g = U.prototype;

  g.add = function (a, b) {
    V(this);
    this.c = null;
    a = W(this, a);
    var c = this.a.get(a);
    c || this.a.set(a, c = []);
    c.push(b);
    this.b += 1;
    return this;
  };

  function dd(a, b) {
    V(a);
    b = W(a, b);
    S(a.a.b, b) && (a.c = null, a.b -= a.a.get(b).length, a = a.a, S(a.b, b) && (delete a.b[b], a.c--, a.a.length > 2 * a.c && Mc(a)));
  }

  function ed(a, b) {
    V(a);
    b = W(a, b);
    return S(a.a.b, b);
  }

  g.forEach = function (a, b) {
    V(this);
    this.a.forEach(function (c, d) {
      oa(c, function (e) {
        a.call(b, e, d, this);
      }, this);
    }, this);
  };

  g.L = function () {
    V(this);

    for (var a = this.a.K(), b = this.a.L(), c = [], d = 0; d < b.length; d++) {
      for (var e = a[d], f = 0; f < e.length; f++) {
        c.push(b[d]);
      }
    }

    return c;
  };

  g.K = function (a) {
    V(this);
    var b = [];
    if ("string" === typeof a) ed(this, a) && (b = ra(b, this.a.get(W(this, a))));else {
      a = this.a.K();

      for (var c = 0; c < a.length; c++) {
        b = ra(b, a[c]);
      }
    }
    return b;
  };

  g.set = function (a, b) {
    V(this);
    this.c = null;
    a = W(this, a);
    ed(this, a) && (this.b -= this.a.get(a).length);
    this.a.set(a, [b]);
    this.b += 1;
    return this;
  };

  g.get = function (a, b) {
    if (!a) return b;
    a = this.K(a);
    return 0 < a.length ? String(a[0]) : b;
  };

  function nc(a, b, c) {
    dd(a, b);
    0 < c.length && (a.c = null, a.a.set(W(a, b), sa(c)), a.b += c.length);
  }

  g.toString = function () {
    if (this.c) return this.c;
    if (!this.a) return "";

    for (var a = [], b = this.a.L(), c = 0; c < b.length; c++) {
      var d = b[c],
          e = encodeURIComponent(String(d));
      d = this.K(d);

      for (var f = 0; f < d.length; f++) {
        var h = e;
        "" !== d[f] && (h += "=" + encodeURIComponent(String(d[f])));
        a.push(h);
      }
    }

    return this.c = a.join("&");
  };

  function W(a, b) {
    b = String(b);
    a.f && (b = b.toLowerCase());
    return b;
  }

  function Zc(a, b) {
    b && !a.f && (V(a), a.c = null, a.a.forEach(function (c, d) {
      var e = d.toLowerCase();
      d != e && (dd(this, d), nc(this, e, c));
    }, a));
    a.f = b;
  }

  function fd(a, b) {
    this.b = a;
    this.a = b;
  }

  function gd(a) {
    this.g = a || hd;
    k.PerformanceNavigationTiming ? (a = k.performance.getEntriesByType("navigation"), a = 0 < a.length && ("hq" == a[0].nextHopProtocol || "h2" == a[0].nextHopProtocol)) : a = !!(k.ia && k.ia.ya && k.ia.ya() && k.ia.ya().qb);
    this.f = a ? this.g : 1;
    this.a = null;
    1 < this.f && (this.a = new Set());
    this.b = null;
    this.c = [];
  }

  var hd = 10;

  function id(a) {
    return a.b ? !0 : a.a ? a.a.size >= a.f : !1;
  }

  function Dc(a) {
    return a.b ? 1 : a.a ? a.a.size : 0;
  }

  function zc(a, b) {
    return a.b ? a.b == b : a.a ? a.a.has(b) : !1;
  }

  function Ec(a, b) {
    a.a ? a.a.add(b) : a.b = b;
  }

  function Gc(a, b) {
    a.b && a.b == b ? a.b = null : a.a && a.a.has(b) && a.a.delete(b);
  }

  gd.prototype.cancel = function () {
    var e_1, _a;

    this.c = jd(this);
    if (this.b) this.b.cancel(), this.b = null;else if (this.a && 0 !== this.a.size) {
      try {
        for (var _b = __values$1(this.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
          var a = _c.value;
          a.cancel();
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }

      this.a.clear();
    }
  };

  function jd(a) {
    var e_2, _a;

    if (null != a.b) return a.c.concat(a.b.s);

    if (null != a.a && 0 !== a.a.size) {
      var b = a.c;

      try {
        for (var _b = __values$1(a.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
          var c = _c.value;
          b = b.concat(c.s);
        }
      } catch (e_2_1) {
        e_2 = {
          error: e_2_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        } finally {
          if (e_2) throw e_2.error;
        }
      }

      return b;
    }

    return sa(a.c);
  }

  function kd() {}

  kd.prototype.stringify = function (a) {
    return k.JSON.stringify(a, void 0);
  };

  kd.prototype.parse = function (a) {
    return k.JSON.parse(a, void 0);
  };

  function ld() {
    this.a = new kd();
  }

  function md(a, b, c) {
    var d = c || "";

    try {
      Lc(a, function (e, f) {
        var h = e;
        n(e) && (h = vb(e));
        b.push(d + f + "=" + encodeURIComponent(h));
      });
    } catch (e) {
      throw b.push(d + "type=" + encodeURIComponent("_badmap")), e;
    }
  }

  function nd(a, b) {
    var c = new Pb();

    if (k.Image) {
      var d = new Image();
      d.onload = ka(od, c, d, "TestLoadImage: loaded", !0, b);
      d.onerror = ka(od, c, d, "TestLoadImage: error", !1, b);
      d.onabort = ka(od, c, d, "TestLoadImage: abort", !1, b);
      d.ontimeout = ka(od, c, d, "TestLoadImage: timeout", !1, b);
      k.setTimeout(function () {
        if (d.ontimeout) d.ontimeout();
      }, 1E4);
      d.src = a;
    } else b(!1);
  }

  function od(a, b, c, d, e) {
    try {
      b.onload = null, b.onerror = null, b.onabort = null, b.ontimeout = null, e(d);
    } catch (f) {}
  }

  var pd = k.JSON.parse;

  function X(a) {
    D.call(this);
    this.headers = new R();
    this.H = a || null;
    this.b = !1;
    this.s = this.a = null;
    this.B = "";
    this.h = 0;
    this.f = "";
    this.g = this.A = this.l = this.u = !1;
    this.o = 0;
    this.m = null;
    this.I = qd;
    this.D = this.F = !1;
  }

  r(X, D);
  var qd = "",
      rd = /^https?$/i,
      sd = ["POST", "PUT"];
  g = X.prototype;

  g.ba = function (a, b, c, d) {
    if (this.a) throw Error("[goog.net.XhrIo] Object is active with another request=" + this.B + "; newUri=" + a);
    b = b ? b.toUpperCase() : "GET";
    this.B = a;
    this.f = "";
    this.h = 0;
    this.u = !1;
    this.b = !0;
    this.a = new XMLHttpRequest();
    this.s = this.H ? bc(this.H) : bc(fc);
    this.a.onreadystatechange = p(this.za, this);

    try {
      this.A = !0, this.a.open(b, String(a), !0), this.A = !1;
    } catch (f) {
      td(this, f);
      return;
    }

    a = c || "";
    var e = new R(this.headers);
    d && Lc(d, function (f, h) {
      e.set(h, f);
    });
    d = pa(e.L());
    c = k.FormData && a instanceof k.FormData;
    !(0 <= na(sd, b)) || d || c || e.set("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
    e.forEach(function (f, h) {
      this.a.setRequestHeader(h, f);
    }, this);
    this.I && (this.a.responseType = this.I);
    "withCredentials" in this.a && this.a.withCredentials !== this.F && (this.a.withCredentials = this.F);

    try {
      ud(this), 0 < this.o && ((this.D = vd(this.a)) ? (this.a.timeout = this.o, this.a.ontimeout = p(this.xa, this)) : this.m = Jb(this.xa, this.o, this)), this.l = !0, this.a.send(a), this.l = !1;
    } catch (f) {
      td(this, f);
    }
  };

  function vd(a) {
    return x && Ra(9) && "number" === typeof a.timeout && void 0 !== a.ontimeout;
  }

  function qa(a) {
    return "content-type" == a.toLowerCase();
  }

  g.xa = function () {
    "undefined" != typeof goog && this.a && (this.f = "Timed out after " + this.o + "ms, aborting", this.h = 8, this.dispatchEvent("timeout"), this.abort(8));
  };

  function td(a, b) {
    a.b = !1;
    a.a && (a.g = !0, a.a.abort(), a.g = !1);
    a.f = b;
    a.h = 5;
    wd(a);
    xd(a);
  }

  function wd(a) {
    a.u || (a.u = !0, a.dispatchEvent("complete"), a.dispatchEvent("error"));
  }

  g.abort = function (a) {
    this.a && this.b && (this.b = !1, this.g = !0, this.a.abort(), this.g = !1, this.h = a || 7, this.dispatchEvent("complete"), this.dispatchEvent("abort"), xd(this));
  };

  g.G = function () {
    this.a && (this.b && (this.b = !1, this.g = !0, this.a.abort(), this.g = !1), xd(this, !0));
    X.S.G.call(this);
  };

  g.za = function () {
    this.j || (this.A || this.l || this.g ? yd(this) : this.Ta());
  };

  g.Ta = function () {
    yd(this);
  };

  function yd(a) {
    if (a.b && "undefined" != typeof goog && (!a.s[1] || 4 != N(a) || 2 != a.X())) if (a.l && 4 == N(a)) Jb(a.za, 0, a);else if (a.dispatchEvent("readystatechange"), 4 == N(a)) {
      a.b = !1;

      try {
        var b = a.X();

        a: switch (b) {
          case 200:
          case 201:
          case 202:
          case 204:
          case 206:
          case 304:
          case 1223:
            var c = !0;
            break a;

          default:
            c = !1;
        }

        var d;

        if (!(d = c)) {
          var e;

          if (e = 0 === b) {
            var f = String(a.B).match(Nc)[1] || null;

            if (!f && k.self && k.self.location) {
              var h = k.self.location.protocol;
              f = h.substr(0, h.length - 1);
            }

            e = !rd.test(f ? f.toLowerCase() : "");
          }

          d = e;
        }

        if (d) a.dispatchEvent("complete"), a.dispatchEvent("success");else {
          a.h = 6;

          try {
            var m = 2 < N(a) ? a.a.statusText : "";
          } catch (l) {
            m = "";
          }

          a.f = m + " [" + a.X() + "]";
          wd(a);
        }
      } finally {
        xd(a);
      }
    }
  }

  function xd(a, b) {
    if (a.a) {
      ud(a);
      var c = a.a,
          d = a.s[0] ? aa : null;
      a.a = null;
      a.s = null;
      b || a.dispatchEvent("ready");

      try {
        c.onreadystatechange = d;
      } catch (e) {}
    }
  }

  function ud(a) {
    a.a && a.D && (a.a.ontimeout = null);
    a.m && (k.clearTimeout(a.m), a.m = null);
  }

  function N(a) {
    return a.a ? a.a.readyState : 0;
  }

  g.X = function () {
    try {
      return 2 < N(this) ? this.a.status : -1;
    } catch (a) {
      return -1;
    }
  };

  g.$ = function () {
    try {
      return this.a ? this.a.responseText : "";
    } catch (a) {
      return "";
    }
  };

  g.Na = function (a) {
    if (this.a) {
      var b = this.a.responseText;
      a && 0 == b.indexOf(a) && (b = b.substring(a.length));
      return pd(b);
    }
  };

  g.ua = function () {
    return this.h;
  };

  g.Qa = function () {
    return "string" === typeof this.f ? this.f : String(this.f);
  };

  function zd(a) {
    var b = "";
    Aa(a, function (c, d) {
      b += d;
      b += ":";
      b += c;
      b += "\r\n";
    });
    return b;
  }

  function Ad(a, b, c) {
    a: {
      for (d in c) {
        var d = !1;
        break a;
      }

      d = !0;
    }

    d || (c = zd(c), "string" === typeof a ? null != c && encodeURIComponent(String(c)) : Q(a, b, c));
  }

  function Bd(a, b, c) {
    return c && c.internalChannelParams ? c.internalChannelParams[a] || b : b;
  }

  function Cd(a) {
    this.pa = 0;
    this.g = [];
    this.c = new Pb();
    this.ga = this.la = this.B = this.fa = this.a = this.na = this.A = this.W = this.i = this.O = this.l = null;
    this.La = this.R = 0;
    this.Ia = Bd("failFast", !1, a);
    this.H = this.m = this.j = this.h = this.f = null;
    this.T = !0;
    this.I = this.oa = this.P = -1;
    this.U = this.o = this.u = 0;
    this.Fa = Bd("baseRetryDelayMs", 5E3, a);
    this.Ma = Bd("retryDelaySeedMs", 1E4, a);
    this.Ja = Bd("forwardChannelMaxRetries", 2, a);
    this.ma = Bd("forwardChannelRequestTimeoutMs", 2E4, a);
    this.Ka = a && a.g || void 0;
    this.D = void 0;
    this.C = a && a.supportsCrossDomainXhr || !1;
    this.J = "";
    this.b = new gd(a && a.concurrentRequestLimit);
    this.ka = new ld();
    this.da = a && a.fastHandshake || !1;
    this.Ga = a && a.b || !1;
    a && a.f && (this.c.a = !1);
    a && a.forceLongPolling && (this.T = !1);
    this.V = !this.da && this.T && a && a.c || !1;
    this.ea = void 0;
    this.N = 0;
    this.F = !1;
    this.s = null;
  }

  g = Cd.prototype;
  g.ha = 8;
  g.v = 1;

  function Jc(a) {
    Dd(a);

    if (3 == a.v) {
      var b = a.R++,
          c = L(a.B);
      Q(c, "SID", a.J);
      Q(c, "RID", b);
      Q(c, "TYPE", "terminate");
      Ed(a, c);
      b = new K(a, a.c, b, void 0);
      b.H = 2;
      b.i = lc(L(c));
      c = !1;
      k.navigator && k.navigator.sendBeacon && (c = k.navigator.sendBeacon(b.i.toString(), ""));
      !c && k.Image && (new Image().src = b.i, c = !0);
      c || (b.a = oc(b.g, null), b.a.ba(b.i));
      b.u = q();
      M(b);
    }

    Fd(a);
  }

  function Bc(a) {
    a.a && (xc(a), a.a.cancel(), a.a = null);
  }

  function Dd(a) {
    Bc(a);
    a.j && (k.clearTimeout(a.j), a.j = null);
    Ac(a);
    a.b.cancel();
    a.h && ("number" === typeof a.h && k.clearTimeout(a.h), a.h = null);
  }

  function Gd(a, b) {
    a.g.push(new fd(a.La++, b));
    3 == a.v && Ic(a);
  }

  function Ic(a) {
    id(a.b) || a.h || (a.h = !0, Cb(a.Ba, a), a.u = 0);
  }

  function Hd(a, b) {
    if (Dc(a.b) >= a.b.f - (a.h ? 1 : 0)) return !1;
    if (a.h) return a.g = b.s.concat(a.g), !0;
    if (1 == a.v || 2 == a.v || a.u >= (a.Ia ? 0 : a.Ja)) return !1;
    a.h = I(p(a.Ba, a, b), Id(a, a.u));
    a.u++;
    return !0;
  }

  g.Ba = function (a) {
    if (this.h) if (this.h = null, 1 == this.v) {
      if (!a) {
        this.R = Math.floor(1E5 * Math.random());
        a = this.R++;
        var b = new K(this, this.c, a, void 0),
            c = this.l;
        this.O && (c ? (c = Ba(c), Da(c, this.O)) : c = this.O);
        null === this.i && (b.B = c);
        var d;
        if (this.da) a: {
          for (var e = d = 0; e < this.g.length; e++) {
            b: {
              var f = this.g[e];

              if ("__data__" in f.a && (f = f.a.__data__, "string" === typeof f)) {
                f = f.length;
                break b;
              }

              f = void 0;
            }

            if (void 0 === f) break;
            d += f;

            if (4096 < d) {
              d = e;
              break a;
            }

            if (4096 === d || e === this.g.length - 1) {
              d = e + 1;
              break a;
            }
          }

          d = 1E3;
        } else d = 1E3;
        d = Jd(this, b, d);
        e = L(this.B);
        Q(e, "RID", a);
        Q(e, "CVER", 22);
        this.A && Q(e, "X-HTTP-Session-Id", this.A);
        Ed(this, e);
        this.i && c && Ad(e, this.i, c);
        Ec(this.b, b);
        this.Ga && Q(e, "TYPE", "init");
        this.da ? (Q(e, "$req", d), Q(e, "SID", "null"), b.V = !0, kc(b, e, null)) : kc(b, e, d);
        this.v = 2;
      }
    } else 3 == this.v && (a ? Kd(this, a) : 0 == this.g.length || id(this.b) || Kd(this));
  };

  function Kd(a, b) {
    var c;
    b ? c = b.f : c = a.R++;
    var d = L(a.B);
    Q(d, "SID", a.J);
    Q(d, "RID", c);
    Q(d, "AID", a.P);
    Ed(a, d);
    a.i && a.l && Ad(d, a.i, a.l);
    c = new K(a, a.c, c, a.u + 1);
    null === a.i && (c.B = a.l);
    b && (a.g = b.s.concat(a.g));
    b = Jd(a, c, 1E3);
    c.setTimeout(Math.round(.5 * a.ma) + Math.round(.5 * a.ma * Math.random()));
    Ec(a.b, c);
    kc(c, d, b);
  }

  function Ed(a, b) {
    a.f && Lc({}, function (c, d) {
      Q(b, d, c);
    });
  }

  function Jd(a, b, c) {
    c = Math.min(a.g.length, c);
    var d = a.f ? p(a.f.Ha, a.f, a) : null;

    a: for (var e = a.g, f = -1;;) {
      var h = ["count=" + c];
      -1 == f ? 0 < c ? (f = e[0].b, h.push("ofs=" + f)) : f = 0 : h.push("ofs=" + f);

      for (var m = !0, l = 0; l < c; l++) {
        var t = e[l].b,
            B = e[l].a;
        t -= f;
        if (0 > t) f = Math.max(0, e[l].b - 100), m = !1;else try {
          md(B, h, "req" + t + "_");
        } catch (z) {
          d && d(B);
        }
      }

      if (m) {
        d = h.join("&");
        break a;
      }
    }

    a = a.g.splice(0, c);
    b.s = a;
    return d;
  }

  function Hc(a) {
    a.a || a.j || (a.U = 1, Cb(a.Aa, a), a.o = 0);
  }

  function Cc(a) {
    if (a.a || a.j || 3 <= a.o) return !1;
    a.U++;
    a.j = I(p(a.Aa, a), Id(a, a.o));
    a.o++;
    return !0;
  }

  g.Aa = function () {
    this.j = null;
    Ld(this);

    if (this.V && !(this.F || null == this.a || 0 >= this.N)) {
      var a = 2 * this.N;
      this.c.info("BP detection timer enabled: " + a);
      this.s = I(p(this.Sa, this), a);
    }
  };

  g.Sa = function () {
    this.s && (this.s = null, this.c.info("BP detection timeout reached."), this.c.info("Buffering proxy detected and switch to long-polling!"), this.H = !1, this.F = !0, Bc(this), Ld(this));
  };

  function xc(a) {
    null != a.s && (k.clearTimeout(a.s), a.s = null);
  }

  function Ld(a) {
    a.a = new K(a, a.c, "rpc", a.U);
    null === a.i && (a.a.B = a.l);
    a.a.O = 0;
    var b = L(a.la);
    Q(b, "RID", "rpc");
    Q(b, "SID", a.J);
    Q(b, "CI", a.H ? "0" : "1");
    Q(b, "AID", a.P);
    Ed(a, b);
    Q(b, "TYPE", "xmlhttp");
    a.i && a.l && Ad(b, a.i, a.l);
    a.D && a.a.setTimeout(a.D);
    var c = a.a;
    a = a.ga;
    c.H = 1;
    c.i = lc(L(b));
    c.j = null;
    c.I = !0;
    mc(c, a);
  }

  g.Ra = function () {
    null != this.m && (this.m = null, Bc(this), Cc(this), H(19));
  };

  function Ac(a) {
    null != a.m && (k.clearTimeout(a.m), a.m = null);
  }

  function uc(a, b) {
    var c = null;

    if (a.a == b) {
      Ac(a);
      xc(a);
      a.a = null;
      var d = 2;
    } else if (zc(a.b, b)) c = b.s, Gc(a.b, b), d = 1;else return;

    a.I = b.N;
    if (0 != a.v) if (b.b) {
      if (1 == d) {
        c = b.j ? b.j.length : 0;
        b = q() - b.u;
        var e = a.u;
        d = Vb();
        d.dispatchEvent(new Yb(d, c, b, e));
        Ic(a);
      } else Hc(a);
    } else if (e = b.h, 3 == e || 0 == e && 0 < a.I || !(1 == d && Hd(a, b) || 2 == d && Cc(a))) switch (c && 0 < c.length && (b = a.b, b.c = b.c.concat(c)), e) {
      case 1:
        P(a, 5);
        break;

      case 4:
        P(a, 10);
        break;

      case 3:
        P(a, 6);
        break;

      default:
        P(a, 2);
    }
  }

  function Id(a, b) {
    var c = a.Fa + Math.floor(Math.random() * a.Ma);
    a.f || (c *= 2);
    return c * b;
  }

  function P(a, b) {
    a.c.info("Error code " + b);

    if (2 == b) {
      var c = null;
      a.f && (c = null);
      var d = p(a.Xa, a);
      c || (c = new T("//www.google.com/images/cleardot.gif"), k.location && "http" == k.location.protocol || Pc(c, "https"), lc(c));
      nd(c.toString(), d);
    } else H(2);

    a.v = 0;
    a.f && a.f.ra(b);
    Fd(a);
    Dd(a);
  }

  g.Xa = function (a) {
    a ? (this.c.info("Successfully pinged google.com"), H(2)) : (this.c.info("Failed to ping google.com"), H(1));
  };

  function Fd(a) {
    a.v = 0;
    a.I = -1;

    if (a.f) {
      if (0 != jd(a.b).length || 0 != a.g.length) a.b.c.length = 0, sa(a.g), a.g.length = 0;
      a.f.qa();
    }
  }

  function Fc(a, b, c) {
    var d = ad(c);
    if ("" != d.c) b && Qc(d, b + "." + d.c), Rc(d, d.h);else {
      var e = k.location;
      d = bd(e.protocol, b ? b + "." + e.hostname : e.hostname, +e.port, c);
    }
    a.W && Aa(a.W, function (f, h) {
      Q(d, h, f);
    });
    b = a.A;
    c = a.na;
    b && c && Q(d, b, c);
    Q(d, "VER", a.ha);
    Ed(a, d);
    return d;
  }

  function oc(a, b) {
    if (b && !a.C) throw Error("Can't create secondary domain capable XhrIo object.");
    b = new X(a.Ka);
    b.F = a.C;
    return b;
  }

  function Md() {}

  g = Md.prototype;

  g.ta = function () {};

  g.sa = function () {};

  g.ra = function () {};

  g.qa = function () {};

  g.Ha = function () {};

  function Nd() {
    if (x && !(10 <= Number(Ua))) throw Error("Environmental error: no available transport.");
  }

  Nd.prototype.a = function (a, b) {
    return new Y(a, b);
  };

  function Y(a, b) {
    D.call(this);
    this.a = new Cd(b);
    this.l = a;
    this.b = b && b.messageUrlParams || null;
    a = b && b.messageHeaders || null;
    b && b.clientProtocolHeaderRequired && (a ? a["X-Client-Protocol"] = "webchannel" : a = {
      "X-Client-Protocol": "webchannel"
    });
    this.a.l = a;
    a = b && b.initMessageHeaders || null;
    b && b.messageContentType && (a ? a["X-WebChannel-Content-Type"] = b.messageContentType : a = {
      "X-WebChannel-Content-Type": b.messageContentType
    });
    b && b.a && (a ? a["X-WebChannel-Client-Profile"] = b.a : a = {
      "X-WebChannel-Client-Profile": b.a
    });
    this.a.O = a;
    (a = b && b.httpHeadersOverwriteParam) && !ta(a) && (this.a.i = a);
    this.h = b && b.supportsCrossDomainXhr || !1;
    this.g = b && b.sendRawJson || !1;
    (b = b && b.httpSessionIdParam) && !ta(b) && (this.a.A = b, a = this.b, null !== a && b in a && (a = this.b, b in a && delete a[b]));
    this.f = new Z(this);
  }

  r(Y, D);
  g = Y.prototype;

  g.addEventListener = function (a, b, c, d) {
    Y.S.addEventListener.call(this, a, b, c, d);
  };

  g.removeEventListener = function (a, b, c, d) {
    Y.S.removeEventListener.call(this, a, b, c, d);
  };

  g.Oa = function () {
    this.a.f = this.f;
    this.h && (this.a.C = !0);
    var a = this.a,
        b = this.l,
        c = this.b || void 0;
    H(0);
    a.fa = b;
    a.W = c || {};
    a.H = a.T;
    a.B = Fc(a, null, a.fa);
    Ic(a);
  };

  g.close = function () {
    Jc(this.a);
  };

  g.Pa = function (a) {
    if ("string" === typeof a) {
      var b = {};
      b.__data__ = a;
      Gd(this.a, b);
    } else this.g ? (b = {}, b.__data__ = vb(a), Gd(this.a, b)) : Gd(this.a, a);
  };

  g.G = function () {
    this.a.f = null;
    delete this.f;
    Jc(this.a);
    delete this.a;
    Y.S.G.call(this);
  };

  function Od(a) {
    dc.call(this);
    var b = a.__sm__;

    if (b) {
      a: {
        for (var c in b) {
          a = c;
          break a;
        }

        a = void 0;
      }

      (this.c = a) ? (a = this.c, this.data = null !== b && a in b ? b[a] : void 0) : this.data = b;
    } else this.data = a;
  }

  r(Od, dc);

  function Pd() {
    ec.call(this);
    this.status = 1;
  }

  r(Pd, ec);

  function Z(a) {
    this.a = a;
  }

  r(Z, Md);

  Z.prototype.ta = function () {
    this.a.dispatchEvent("a");
  };

  Z.prototype.sa = function (a) {
    this.a.dispatchEvent(new Od(a));
  };

  Z.prototype.ra = function (a) {
    this.a.dispatchEvent(new Pd(a));
  };

  Z.prototype.qa = function () {
    this.a.dispatchEvent("b");
  };
  /*
  Copyright 2017 Google Inc.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
  */


  Nd.prototype.createWebChannel = Nd.prototype.a;
  Y.prototype.send = Y.prototype.Pa;
  Y.prototype.open = Y.prototype.Oa;
  Y.prototype.close = Y.prototype.close;
  Zb.NO_ERROR = 0;
  Zb.TIMEOUT = 8;
  Zb.HTTP_ERROR = 6;
  $b.COMPLETE = "complete";
  cc.EventType = J;
  J.OPEN = "a";
  J.CLOSE = "b";
  J.ERROR = "c";
  J.MESSAGE = "d";
  D.prototype.listen = D.prototype.va;
  X.prototype.listenOnce = X.prototype.wa;
  X.prototype.getLastError = X.prototype.Qa;
  X.prototype.getLastErrorCode = X.prototype.ua;
  X.prototype.getStatus = X.prototype.X;
  X.prototype.getResponseJson = X.prototype.Na;
  X.prototype.getResponseText = X.prototype.$;
  X.prototype.send = X.prototype.ba;
  var esm = {
    createWebChannelTransport: function createWebChannelTransport() {
      return new Nd();
    },
    ErrorCode: Zb,
    EventType: $b,
    WebChannel: cc,
    XhrIo: X
  };
  var esm_1 = esm.createWebChannelTransport;
  var esm_2 = esm.ErrorCode;
  var esm_3 = esm.EventType;
  var esm_4 = esm.WebChannel;
  var esm_5 = esm.XhrIo;

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
   */var b=new Logger("@firebase/firestore");// Helper methods are needed because variables can't be exported as read/write
  function I$1(){return b.logLevel;}function E$1(t){for(var e=[],n=1;n<arguments.length;n++){e[n-1]=arguments[n];}if(b.logLevel<=LogLevel.DEBUG){var i=e.map(A$1);b.debug.apply(b,__spreadArrays(["Firestore (7.18.0): "+t],i));}}function T$1(t){for(var e=[],n=1;n<arguments.length;n++){e[n-1]=arguments[n];}if(b.logLevel<=LogLevel.ERROR){var i=e.map(A$1);b.error.apply(b,__spreadArrays(["Firestore (7.18.0): "+t],i));}}function N$1(t){for(var e=[],n=1;n<arguments.length;n++){e[n-1]=arguments[n];}if(b.logLevel<=LogLevel.WARN){var i=e.map(A$1);b.warn.apply(b,__spreadArrays(["Firestore (7.18.0): "+t],i));}}/**
   * Converts an additional log parameter to a string representation.
   */function A$1(t){if("string"==typeof t)return t;try{return e=t,JSON.stringify(e);}catch(e){// Converting to JSON failed, just log the object directly
  return t;}/**
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
   */ /** Formats an object as a JSON string, suitable for logging. */var e;}/**
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
   */ /**
   * Unconditionally fails, throwing an Error with the given message.
   * Messages are stripped in production builds.
   *
   * Returns `never` and can be used in expressions:
   * @example
   * let futureVar = fail('not implemented yet');
   */function _(t){void 0===t&&(t="Unexpected state");// Log the failure in addition to throw an exception, just in case the
  // exception is swallowed.
  var e="FIRESTORE (7.18.0) INTERNAL ASSERTION FAILED: "+t;// NOTE: We don't use FirestoreError here because these are internal failures
  // that cannot be handled by the user. (Also it would create a circular
  // dependency between the error and assert modules which doesn't work.)
  throw T$1(e),new Error(e)/**
   * Fails if the given assertion condition is false, throwing an Error with the
   * given message if it did.
   *
   * Messages are stripped in production builds.
   */;}function D$1(t,e){t||_();}/**
   * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
   * instance of `T` before casting.
   */function k$1(t,// eslint-disable-next-line @typescript-eslint/no-explicit-any
  e){return t;}/**
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
   */ /**
   * Generates `nBytes` of random bytes.
   *
   * If `nBytes < 0` , an error will be thrown.
   */function x$1(t){// Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
  var e=// eslint-disable-next-line @typescript-eslint/no-explicit-any
  "undefined"!=typeof self&&(self.crypto||self.msCrypto),n=new Uint8Array(t);if(e)e.getRandomValues(n);else// Falls back to Math.random
  for(var r=0;r<t;r++){n[r]=Math.floor(256*Math.random());}return n;}/**
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
   */var S$1=/** @class */function(){function t(){}return t.t=function(){for(// Alphanumeric characters
  var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e=Math.floor(256/t.length)*t.length,n=""// The largest byte value that is a multiple of `char.length`.
  ;n.length<20;){for(var r=x$1(40),i=0;i<r.length;++i){// Only accept values that are [0, maxMultiple), this ensures they can
  // be evenly mapped to indices of `chars` via a modulo operation.
  n.length<20&&r[i]<e&&(n+=t.charAt(r[i]%t.length));}}return n;},t;}();function P$1(t,e){return t<e?-1:t>e?1:0;}/** Helper to compare arrays using isEqual(). */function L$1(t,e,n){return t.length===e.length&&t.every(function(t,r){return n(t,e[r]);});}/**
   * Returns the immediate lexicographically-following string. This is useful to
   * construct an inclusive range for indexeddb iterators.
   */function O$1(t){// Return the input string, with an additional NUL byte appended.
  return t+"\0";}/**
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
   */var R$1=/**
       * Constructs a DatabaseInfo using the provided host, databaseId and
       * persistenceKey.
       *
       * @param databaseId The database to use.
       * @param persistenceKey A unique identifier for this Firestore's local
       * storage (used in conjunction with the databaseId).
       * @param host The Firestore backend host to connect to.
       * @param ssl Whether to use SSL when connecting.
       * @param forceLongPolling Whether to use the forceLongPolling option
       * when using WebChannel as the network transport.
       */function R(t,e,n,r,i){this.s=t,this.persistenceKey=e,this.host=n,this.ssl=r,this.forceLongPolling=i;},V$1=/** @class */function(){function t(t,e){this.projectId=t,this.database=e||"(default)";}return Object.defineProperty(t.prototype,"i",{get:function get(){return "(default)"===this.database;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(e){return e instanceof t&&e.projectId===this.projectId&&e.database===this.database;},t.prototype.o=function(t){return P$1(this.projectId,t.projectId)||P$1(this.database,t.database);},t;}();/** The default database name for a project. */ /** Represents the database ID a Firestore client is associated with. */ /**
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
   */function U$1(t){var e=0;for(var n in t){Object.prototype.hasOwnProperty.call(t,n)&&e++;}return e;}function C$1(t,e){for(var n in t){Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n]);}}function M$1(t){for(var e in t){if(Object.prototype.hasOwnProperty.call(t,e))return !1;}return !0;}/**
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
   */ /**
   * A map implementation that uses objects as keys. Objects must have an
   * associated equals function and must be immutable. Entries in the map are
   * stored together with the key being produced from the mapKeyFn. This map
   * automatically handles collisions of keys.
   */var F$1=/** @class */function(){function t(t,e){this.h=t,this.u=e,/**
               * The inner map for a key -> value pair. Due to the possibility of
               * collisions we keep a list of entries that we do a linear search through
               * to find an actual match. Note that collisions should be rare, so we still
               * expect near constant time lookups in practice.
               */this.l={}/** Get a value for this key, or undefined if it does not exist. */;}return t.prototype.get=function(t){var e=this.h(t),n=this.l[e];if(void 0!==n)for(var r=0,i=n;r<i.length;r++){var o=i[r],s=o[0],u=o[1];if(this.u(s,t))return u;}},t.prototype.has=function(t){return void 0!==this.get(t);},/** Put this key and value in the map. */t.prototype.set=function(t,e){var n=this.h(t),r=this.l[n];if(void 0!==r){for(var i=0;i<r.length;i++){if(this.u(r[i][0],t))return void(r[i]=[t,e]);}r.push([t,e]);}else this.l[n]=[[t,e]];},/**
       * Remove this key from the map. Returns a boolean if anything was deleted.
       */t.prototype.delete=function(t){var e=this.h(t),n=this.l[e];if(void 0===n)return !1;for(var r=0;r<n.length;r++){if(this.u(n[r][0],t))return 1===n.length?delete this.l[e]:n.splice(r,1),!0;}return !1;},t.prototype.forEach=function(t){C$1(this.l,function(e,n){for(var r=0,i=n;r<i.length;r++){var o=i[r],s=o[0],u=o[1];t(s,u);}});},t.prototype._=function(){return M$1(this.l);},t;}(),q$1={// Causes are copied from:
  // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
  /** Not an error; returned on success. */OK:"ok",/** The operation was cancelled (typically by the caller). */CANCELLED:"cancelled",/** Unknown error or an error from a different error domain. */UNKNOWN:"unknown",/**
       * Client specified an invalid argument. Note that this differs from
       * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
       * problematic regardless of the state of the system (e.g., a malformed file
       * name).
       */INVALID_ARGUMENT:"invalid-argument",/**
       * Deadline expired before operation could complete. For operations that
       * change the state of the system, this error may be returned even if the
       * operation has completed successfully. For example, a successful response
       * from a server could have been delayed long enough for the deadline to
       * expire.
       */DEADLINE_EXCEEDED:"deadline-exceeded",/** Some requested entity (e.g., file or directory) was not found. */NOT_FOUND:"not-found",/**
       * Some entity that we attempted to create (e.g., file or directory) already
       * exists.
       */ALREADY_EXISTS:"already-exists",/**
       * The caller does not have permission to execute the specified operation.
       * PERMISSION_DENIED must not be used for rejections caused by exhausting
       * some resource (use RESOURCE_EXHAUSTED instead for those errors).
       * PERMISSION_DENIED must not be used if the caller can not be identified
       * (use UNAUTHENTICATED instead for those errors).
       */PERMISSION_DENIED:"permission-denied",/**
       * The request does not have valid authentication credentials for the
       * operation.
       */UNAUTHENTICATED:"unauthenticated",/**
       * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
       * entire file system is out of space.
       */RESOURCE_EXHAUSTED:"resource-exhausted",/**
       * Operation was rejected because the system is not in a state required for
       * the operation's execution. For example, directory to be deleted may be
       * non-empty, an rmdir operation is applied to a non-directory, etc.
       *
       * A litmus test that may help a service implementor in deciding
       * between FAILED_PRECONDITION, ABORTED, and UNAVAILABLE:
       *  (a) Use UNAVAILABLE if the client can retry just the failing call.
       *  (b) Use ABORTED if the client should retry at a higher-level
       *      (e.g., restarting a read-modify-write sequence).
       *  (c) Use FAILED_PRECONDITION if the client should not retry until
       *      the system state has been explicitly fixed. E.g., if an "rmdir"
       *      fails because the directory is non-empty, FAILED_PRECONDITION
       *      should be returned since the client should not retry unless
       *      they have first fixed up the directory by deleting files from it.
       *  (d) Use FAILED_PRECONDITION if the client performs conditional
       *      REST Get/Update/Delete on a resource and the resource on the
       *      server does not match the condition. E.g., conflicting
       *      read-modify-write on the same resource.
       */FAILED_PRECONDITION:"failed-precondition",/**
       * The operation was aborted, typically due to a concurrency issue like
       * sequencer check failures, transaction aborts, etc.
       *
       * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
       * and UNAVAILABLE.
       */ABORTED:"aborted",/**
       * Operation was attempted past the valid range. E.g., seeking or reading
       * past end of file.
       *
       * Unlike INVALID_ARGUMENT, this error indicates a problem that may be fixed
       * if the system state changes. For example, a 32-bit file system will
       * generate INVALID_ARGUMENT if asked to read at an offset that is not in the
       * range [0,2^32-1], but it will generate OUT_OF_RANGE if asked to read from
       * an offset past the current file size.
       *
       * There is a fair bit of overlap between FAILED_PRECONDITION and
       * OUT_OF_RANGE. We recommend using OUT_OF_RANGE (the more specific error)
       * when it applies so that callers who are iterating through a space can
       * easily look for an OUT_OF_RANGE error to detect when they are done.
       */OUT_OF_RANGE:"out-of-range",/** Operation is not implemented or not supported/enabled in this service. */UNIMPLEMENTED:"unimplemented",/**
       * Internal errors. Means some invariants expected by underlying System has
       * been broken. If you see one of these errors, Something is very broken.
       */INTERNAL:"internal",/**
       * The service is currently unavailable. This is a most likely a transient
       * condition and may be corrected by retrying with a backoff.
       *
       * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
       * and UNAVAILABLE.
       */UNAVAILABLE:"unavailable",/** Unrecoverable data loss or corruption. */DATA_LOSS:"data-loss"},j=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this,n)||this).code=t,r.message=n,r.name="FirebaseError",// HACK: We write a toString property directly because Error is not a real
  // class and so inheritance does not work correctly. We could alternatively
  // do the same "back-door inheritance" trick that FirebaseError does.
  r.toString=function(){return r.name+": [code="+r.code+"]: "+r.message;},r;}return __extends(n,e),n;}(Error),G$1=/** @class */function(){function t(t,e){if(this.seconds=t,this.nanoseconds=e,e<0)throw new j(q$1.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(e>=1e9)throw new j(q$1.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<-62135596800)throw new j(q$1.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);// This will break in the year 10,000.
  if(t>=253402300800)throw new j(q$1.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);}return t.now=function(){return t.fromMillis(Date.now());},t.fromDate=function(e){return t.fromMillis(e.getTime());},t.fromMillis=function(e){var n=Math.floor(e/1e3);return new t(n,1e6*(e-1e3*n));},t.prototype.toDate=function(){return new Date(this.toMillis());},t.prototype.toMillis=function(){return 1e3*this.seconds+this.nanoseconds/1e6;},t.prototype.T=function(t){return this.seconds===t.seconds?P$1(this.nanoseconds,t.nanoseconds):P$1(this.seconds,t.seconds);},t.prototype.isEqual=function(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds;},t.prototype.toString=function(){return "Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")";},t.prototype.valueOf=function(){// This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
  // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
  // with zeroes to be a consistent length. Strings with this format then have a lexiographical
  // ordering that matches the expected ordering. The <seconds> translation is done to avoid
  // having a leading negative sign (i.e. a leading '-' character) in its string representation,
  // which would affect its lexiographical ordering.
  var t=this.seconds- -62135596800;// Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
  return String(t).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0");},t;}(),B=/** @class */function(){function t(t){this.timestamp=t;}return t.I=function(e){return new t(e);},t.min=function(){return new t(new G$1(0,0));},t.prototype.o=function(t){return this.timestamp.T(t.timestamp);},t.prototype.isEqual=function(t){return this.timestamp.isEqual(t.timestamp);},/** Returns a number representation of the version for use in spec tests. */t.prototype.m=function(){// Convert to microseconds.
  return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3;},t.prototype.toString=function(){return "SnapshotVersion("+this.timestamp.toString()+")";},t.prototype.A=function(){return this.timestamp;},t;}(),z=/** @class */function(){function t(t,e,n){void 0===e?e=0:e>t.length&&_(),void 0===n?n=t.length-e:n>t.length-e&&_(),this.segments=t,this.offset=e,this.R=n;}return Object.defineProperty(t.prototype,"length",{get:function get(){return this.R;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(e){return 0===t.P(this,e);},t.prototype.child=function(e){var n=this.segments.slice(this.offset,this.limit());return e instanceof t?e.forEach(function(t){n.push(t);}):n.push(e),this.V(n);},/** The index of one past the last segment of the path. */t.prototype.limit=function(){return this.offset+this.length;},t.prototype.g=function(t){return t=void 0===t?1:t,this.V(this.segments,this.offset+t,this.length-t);},t.prototype.p=function(){return this.V(this.segments,this.offset,this.length-1);},t.prototype.v=function(){return this.segments[this.offset];},t.prototype.S=function(){return this.get(this.length-1);},t.prototype.get=function(t){return this.segments[this.offset+t];},t.prototype._=function(){return 0===this.length;},t.prototype.D=function(t){if(t.length<this.length)return !1;for(var e=0;e<this.length;e++){if(this.get(e)!==t.get(e))return !1;}return !0;},t.prototype.C=function(t){if(this.length+1!==t.length)return !1;for(var e=0;e<this.length;e++){if(this.get(e)!==t.get(e))return !1;}return !0;},t.prototype.forEach=function(t){for(var e=this.offset,n=this.limit();e<n;e++){t(this.segments[e]);}},t.prototype.N=function(){return this.segments.slice(this.offset,this.limit());},t.P=function(t,e){for(var n=Math.min(t.length,e.length),r=0;r<n;r++){var i=t.get(r),o=e.get(r);if(i<o)return -1;if(i>o)return 1;}return t.length<e.length?-1:t.length>e.length?1:0;},t;}(),K$1=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends(n,e),n.prototype.V=function(t,e,r){return new n(t,e,r);},n.prototype.F=function(){// NOTE: The client is ignorant of any path segments containing escape
  // sequences (e.g. __id123__) and just passes them through raw (they exist
  // for legacy reasons and should not be used frequently).
  return this.N().join("/");},n.prototype.toString=function(){return this.F();},/**
       * Creates a resource path from the given slash-delimited string.
       */n.k=function(t){// NOTE: The client is ignorant of any path segments containing escape
  // sequences (e.g. __id123__) and just passes them through raw (they exist
  // for legacy reasons and should not be used frequently).
  if(t.indexOf("//")>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid path ("+t+"). Paths must not contain // in them.");// We may still have an empty segment at the beginning or end if they had a
  // leading or trailing slash (which we allow).
  return new n(t.split("/").filter(function(t){return t.length>0;}));},n.$=function(){return new n([]);},n;}(z),X$1=/^[_a-zA-Z][_a-zA-Z0-9]*$/,Q$1=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends(n,e),n.prototype.V=function(t,e,r){return new n(t,e,r);},/**
       * Returns true if the string could be used as a segment in a field path
       * without escaping.
       */n.M=function(t){return X$1.test(t);},n.prototype.F=function(){return this.N().map(function(t){return t=t.replace("\\","\\\\").replace("`","\\`"),n.M(t)||(t="`"+t+"`"),t;}).join(".");},n.prototype.toString=function(){return this.F();},/**
       * Returns true if this field references the key of a document.
       */n.prototype.O=function(){return 1===this.length&&"__name__"===this.get(0);},/**
       * The field designating the key of a document.
       */n.L=function(){return new n(["__name__"]);},/**
       * Parses a field string from the given server-formatted string.
       *
       * - Splitting the empty string is not allowed (for now at least).
       * - Empty segments within the string (e.g. if there are two consecutive
       *   separators) are not allowed.
       *
       * TODO(b/37244157): we should make this more strict. Right now, it allows
       * non-identifier path components, even if they aren't escaped.
       */n.q=function(t){for(var e=[],r="",i=0,o=function o(){if(0===r.length)throw new j(q$1.INVALID_ARGUMENT,"Invalid field path ("+t+"). Paths must not be empty, begin with '.', end with '.', or contain '..'");e.push(r),r="";},s=!1;i<t.length;){var u=t[i];if("\\"===u){if(i+1===t.length)throw new j(q$1.INVALID_ARGUMENT,"Path has trailing escape character: "+t);var a=t[i+1];if("\\"!==a&&"."!==a&&"`"!==a)throw new j(q$1.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);r+=a,i+=2;}else "`"===u?(s=!s,i++):"."!==u||s?(r+=u,i++):(o(),i++);}if(o(),s)throw new j(q$1.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new n(e);},n.$=function(){return new n([]);},n;}(z),W$1=/** @class */function(){function t(t){this.path=t;}return t.B=function(e){return new t(K$1.k(e).g(5));},/** Returns true if the document is in the specified collectionId. */t.prototype.U=function(t){return this.path.length>=2&&this.path.get(this.path.length-2)===t;},t.prototype.isEqual=function(t){return null!==t&&0===K$1.P(this.path,t.path);},t.prototype.toString=function(){return this.path.toString();},t.P=function(t,e){return K$1.P(t.path,e.path);},t.W=function(t){return t.length%2==0;},/**
       * Creates and returns a new document key with the given segments.
       *
       * @param segments The segments of the path to the document
       * @return A new instance of DocumentKey
       */t.j=function(e){return new t(new K$1(e.slice()));},t;}();/**
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
   */ /**
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
   */ /**
   * Returns whether a variable is either undefined or null.
   */function H$1(t){return null==t;}/** Returns whether the value represents -0. */function Y$1(t){// Detect if the value is -0.0. Based on polyfill from
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  return -0===t&&1/t==-1/0;}/**
   * Returns whether a value is an integer and in the safe integer range
   * @param value The value to test for being an integer and in the safe range
   */function $(t){return "number"==typeof t&&Number.isInteger(t)&&!Y$1(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER;}/**
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
   */ // Visible for testing
  var J$1=function J(t,e,n,r,i,o,s){void 0===e&&(e=null),void 0===n&&(n=[]),void 0===r&&(r=[]),void 0===i&&(i=null),void 0===o&&(o=null),void 0===s&&(s=null),this.path=t,this.collectionGroup=e,this.orderBy=n,this.filters=r,this.limit=i,this.startAt=o,this.endAt=s,this.K=null;};/**
   * Initializes a Target with a path and optional additional query constraints.
   * Path must currently be empty if this is a collection group query.
   *
   * NOTE: you should always construct `Target` from `Query.toTarget` instead of
   * using this factory method, because `Query` provides an implicit `orderBy`
   * property.
   */function Z$1(t,e,n,r,i,o,s){return void 0===e&&(e=null),void 0===n&&(n=[]),void 0===r&&(r=[]),void 0===i&&(i=null),void 0===o&&(o=null),void 0===s&&(s=null),new J$1(t,e,n,r,i,o,s);}function tt(t){var e=k$1(t);if(null===e.K){var n=e.path.F();null!==e.collectionGroup&&(n+="|cg:"+e.collectionGroup),n+="|f:",n+=e.filters.map(function(t){return function(t){// TODO(b/29183165): Technically, this won't be unique if two values have
  // the same description, such as the int 3 and the string "3". So we should
  // add the types in here somehow, too.
  return t.field.F()+t.op.toString()+Kt(t.value);}(t);}).join(","),n+="|ob:",n+=e.orderBy.map(function(t){return (e=t).field.F()+e.dir;var e;}).join(","),H$1(e.limit)||(n+="|l:",n+=e.limit),e.startAt&&(n+="|lb:",n+=Gn(e.startAt)),e.endAt&&(n+="|ub:",n+=Gn(e.endAt)),e.K=n;}return e.K;}function et(t,e){if(t.limit!==e.limit)return !1;if(t.orderBy.length!==e.orderBy.length)return !1;for(var n=0;n<t.orderBy.length;n++){if(!Qn(t.orderBy[n],e.orderBy[n]))return !1;}if(t.filters.length!==e.filters.length)return !1;for(var r=0;r<t.filters.length;r++){if(i=t.filters[r],o=e.filters[r],i.op!==o.op||!i.field.isEqual(o.field)||!jt(i.value,o.value))return !1;}var i,o;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!zn(t.startAt,e.startAt)&&zn(t.endAt,e.endAt);}function nt(t){return W$1.W(t.path)&&null===t.collectionGroup&&0===t.filters.length;}/**
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
   */ /** Converts a Base64 encoded string to a binary string. */ /**
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
   */ /**
   * Immutable class that represents a "proto" byte string.
   *
   * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
   * sent on the wire. This class abstracts away this differentiation by holding
   * the proto byte string in a common class that must be converted into a string
   * before being sent as a proto.
   */var rt=/** @class */function(){function t(t){this.G=t;}return t.fromBase64String=function(e){return new t(atob(e));},t.fromUint8Array=function(e){return new t(/**
   * Helper function to convert an Uint8array to a binary string.
   */function(t){for(var e="",n=0;n<t.length;++n){e+=String.fromCharCode(t[n]);}return e;}(e));},t.prototype.toBase64=function(){return t=this.G,btoa(t);/** Converts a binary string to a Base64 encoded string. */var t;/** True if and only if the Base64 conversion functions are available. */},t.prototype.toUint8Array=function(){return function(t){for(var e=new Uint8Array(t.length),n=0;n<t.length;n++){e[n]=t.charCodeAt(n);}return e;}(this.G);},t.prototype.H=function(){return 2*this.G.length;},t.prototype.o=function(t){return P$1(this.G,t.G);},t.prototype.isEqual=function(t){return this.G===t.G;},t;}();rt.Y=new rt("");var it,ot,st=/** @class */function(){function t(/** The target being listened to. */t,/**
       * The target ID to which the target corresponds; Assigned by the
       * LocalStore for user listens and by the SyncEngine for limbo watches.
       */e,/** The purpose of the target. */n,/**
       * The sequence number of the last transaction during which this target data
       * was modified.
       */r,/** The latest snapshot version seen for this target. */i/**
       * The maximum snapshot version at which the associated view
       * contained no limbo documents.
       */,o/**
       * An opaque, server-assigned token that allows watching a target to be
       * resumed after disconnecting without retransmitting all the data that
       * matches the target. The resume token essentially identifies a point in
       * time from which the server should resume sending results.
       */,s){void 0===i&&(i=B.min()),void 0===o&&(o=B.min()),void 0===s&&(s=rt.Y),this.target=t,this.targetId=e,this.J=n,this.sequenceNumber=r,this.X=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=s;}/** Creates a new target data instance with an updated sequence number. */return t.prototype.Z=function(e){return new t(this.target,this.targetId,this.J,e,this.X,this.lastLimboFreeSnapshotVersion,this.resumeToken);},/**
       * Creates a new target data instance with an updated resume token and
       * snapshot version.
       */t.prototype.tt=function(e,n){return new t(this.target,this.targetId,this.J,this.sequenceNumber,n,this.lastLimboFreeSnapshotVersion,e);},/**
       * Creates a new target data instance with an updated last limbo free
       * snapshot version number.
       */t.prototype.et=function(e){return new t(this.target,this.targetId,this.J,this.sequenceNumber,this.X,e,this.resumeToken);},t;}(),ut=// TODO(b/33078163): just use simplest form of existence filter for now
  function ut(t){this.count=t;};/**
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
   */ /**
   * Determines whether an error code represents a permanent error when received
   * in response to a non-write operation.
   *
   * See isPermanentWriteError for classifying write errors.
   */function at(t){switch(t){case q$1.OK:return _();case q$1.CANCELLED:case q$1.UNKNOWN:case q$1.DEADLINE_EXCEEDED:case q$1.RESOURCE_EXHAUSTED:case q$1.INTERNAL:case q$1.UNAVAILABLE:// Unauthenticated means something went wrong with our token and we need
  // to retry with new credentials which will happen automatically.
  case q$1.UNAUTHENTICATED:return !1;case q$1.INVALID_ARGUMENT:case q$1.NOT_FOUND:case q$1.ALREADY_EXISTS:case q$1.PERMISSION_DENIED:case q$1.FAILED_PRECONDITION:// Aborted might be retried in some scenarios, but that is dependant on
  // the context and should handled individually by the calling code.
  // See https://cloud.google.com/apis/design/errors.
  case q$1.ABORTED:case q$1.OUT_OF_RANGE:case q$1.UNIMPLEMENTED:case q$1.DATA_LOSS:return !0;default:return _();}}/**
   * Determines whether an error code represents a permanent error when received
   * in response to a write operation.
   *
   * Write operations must be handled specially because as of b/119437764, ABORTED
   * errors on the write stream should be retried too (even though ABORTED errors
   * are not generally retryable).
   *
   * Note that during the initial handshake on the write stream an ABORTED error
   * signals that we should discard our stream token (i.e. it is permanent). This
   * means a handshake error should be classified with isPermanentError, above.
   */ /**
   * Maps an error Code from GRPC status code number, like 0, 1, or 14. These
   * are not the same as HTTP status codes.
   *
   * @returns The Code equivalent to the given GRPC status code. Fails if there
   *     is no match.
   */function ct(t){if(void 0===t)// This shouldn't normally happen, but in certain error cases (like trying
  // to send invalid proto messages) we may get an error with no GRPC code.
  return T$1("GRPC error has no .code"),q$1.UNKNOWN;switch(t){case it.OK:return q$1.OK;case it.CANCELLED:return q$1.CANCELLED;case it.UNKNOWN:return q$1.UNKNOWN;case it.DEADLINE_EXCEEDED:return q$1.DEADLINE_EXCEEDED;case it.RESOURCE_EXHAUSTED:return q$1.RESOURCE_EXHAUSTED;case it.INTERNAL:return q$1.INTERNAL;case it.UNAVAILABLE:return q$1.UNAVAILABLE;case it.UNAUTHENTICATED:return q$1.UNAUTHENTICATED;case it.INVALID_ARGUMENT:return q$1.INVALID_ARGUMENT;case it.NOT_FOUND:return q$1.NOT_FOUND;case it.ALREADY_EXISTS:return q$1.ALREADY_EXISTS;case it.PERMISSION_DENIED:return q$1.PERMISSION_DENIED;case it.FAILED_PRECONDITION:return q$1.FAILED_PRECONDITION;case it.ABORTED:return q$1.ABORTED;case it.OUT_OF_RANGE:return q$1.OUT_OF_RANGE;case it.UNIMPLEMENTED:return q$1.UNIMPLEMENTED;case it.DATA_LOSS:return q$1.DATA_LOSS;default:return _();}}/**
   * Converts an HTTP response's error status to the equivalent error code.
   *
   * @param status An HTTP error response status ("FAILED_PRECONDITION",
   * "UNKNOWN", etc.)
   * @returns The equivalent Code. Non-matching responses are mapped to
   *     Code.UNKNOWN.
   */(ot=it||(it={}))[ot.OK=0]="OK",ot[ot.CANCELLED=1]="CANCELLED",ot[ot.UNKNOWN=2]="UNKNOWN",ot[ot.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",ot[ot.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",ot[ot.NOT_FOUND=5]="NOT_FOUND",ot[ot.ALREADY_EXISTS=6]="ALREADY_EXISTS",ot[ot.PERMISSION_DENIED=7]="PERMISSION_DENIED",ot[ot.UNAUTHENTICATED=16]="UNAUTHENTICATED",ot[ot.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",ot[ot.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",ot[ot.ABORTED=10]="ABORTED",ot[ot.OUT_OF_RANGE=11]="OUT_OF_RANGE",ot[ot.UNIMPLEMENTED=12]="UNIMPLEMENTED",ot[ot.INTERNAL=13]="INTERNAL",ot[ot.UNAVAILABLE=14]="UNAVAILABLE",ot[ot.DATA_LOSS=15]="DATA_LOSS";/**
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
   */ // An immutable sorted map implementation, based on a Left-leaning Red-Black
  // tree.
  var ht=/** @class */function(){function t(t,e){this.P=t,this.root=e||lt.EMPTY;}// Returns a copy of the map, with the specified key/value added or replaced.
  return t.prototype.nt=function(e,n){return new t(this.P,this.root.nt(e,n,this.P).copy(null,null,lt.st,null,null));},// Returns a copy of the map, with the specified key removed.
  t.prototype.remove=function(e){return new t(this.P,this.root.remove(e,this.P).copy(null,null,lt.st,null,null));},// Returns the value of the node with the given key, or null.
  t.prototype.get=function(t){for(var e=this.root;!e._();){var n=this.P(t,e.key);if(0===n)return e.value;n<0?e=e.left:n>0&&(e=e.right);}return null;},// Returns the index of the element in this sorted map, or -1 if it doesn't
  // exist.
  t.prototype.indexOf=function(t){for(// Number of nodes that were pruned when descending right
  var e=0,n=this.root;!n._();){var r=this.P(t,n.key);if(0===r)return e+n.left.size;r<0?n=n.left:(// Count all nodes left of the node plus the node itself
  e+=n.left.size+1,n=n.right);}// Node not found
  return -1;},t.prototype._=function(){return this.root._();},Object.defineProperty(t.prototype,"size",{// Returns the total number of nodes in the map.
  get:function get(){return this.root.size;},enumerable:!1,configurable:!0}),// Returns the minimum key in the map.
  t.prototype.it=function(){return this.root.it();},// Returns the maximum key in the map.
  t.prototype.rt=function(){return this.root.rt();},// Traverses the map in key order and calls the specified action function
  // for each key/value pair. If action returns true, traversal is aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  t.prototype.ot=function(t){return this.root.ot(t);},t.prototype.forEach=function(t){this.ot(function(e,n){return t(e,n),!1;});},t.prototype.toString=function(){var t=[];return this.ot(function(e,n){return t.push(e+":"+n),!1;}),"{"+t.join(", ")+"}";},// Traverses the map in reverse key order and calls the specified action
  // function for each key/value pair. If action returns true, traversal is
  // aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  t.prototype.ht=function(t){return this.root.ht(t);},// Returns an iterator over the SortedMap.
  t.prototype.at=function(){return new ft(this.root,null,this.P,!1);},t.prototype.ut=function(t){return new ft(this.root,t,this.P,!1);},t.prototype.ct=function(){return new ft(this.root,null,this.P,!0);},t.prototype.lt=function(t){return new ft(this.root,t,this.P,!0);},t;}(),ft=/** @class */function(){function t(t,e,n,r){this._t=r,this.ft=[];for(var i=1;!t._();){if(i=e?n(t.key,e):1,// flip the comparison if we're going in reverse
  r&&(i*=-1),i<0)// This node is less than our start key. ignore it
  t=this._t?t.left:t.right;else {if(0===i){// This node is exactly equal to our start key. Push it on the stack,
  // but stop iterating;
  this.ft.push(t);break;}// This node is greater than our start key, add it to the stack and move
  // to the next one
  this.ft.push(t),t=this._t?t.right:t.left;}}}return t.prototype.dt=function(){var t=this.ft.pop(),e={key:t.key,value:t.value};if(this._t)for(t=t.left;!t._();){this.ft.push(t),t=t.right;}else for(t=t.right;!t._();){this.ft.push(t),t=t.left;}return e;},t.prototype.wt=function(){return this.ft.length>0;},t.prototype.Tt=function(){if(0===this.ft.length)return null;var t=this.ft[this.ft.length-1];return {key:t.key,value:t.value};},t;}(),lt=/** @class */function(){function t(e,n,r,i,o){this.key=e,this.value=n,this.color=null!=r?r:t.RED,this.left=null!=i?i:t.EMPTY,this.right=null!=o?o:t.EMPTY,this.size=this.left.size+1+this.right.size;}// Returns a copy of the current node, optionally replacing pieces of it.
  return t.prototype.copy=function(e,n,r,i,o){return new t(null!=e?e:this.key,null!=n?n:this.value,null!=r?r:this.color,null!=i?i:this.left,null!=o?o:this.right);},t.prototype._=function(){return !1;},// Traverses the tree in key order and calls the specified action function
  // for each node. If action returns true, traversal is aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  t.prototype.ot=function(t){return this.left.ot(t)||t(this.key,this.value)||this.right.ot(t);},// Traverses the tree in reverse key order and calls the specified action
  // function for each node. If action returns true, traversal is aborted.
  // Returns the first truthy value returned by action, or the last falsey
  // value returned by action.
  t.prototype.ht=function(t){return this.right.ht(t)||t(this.key,this.value)||this.left.ht(t);},// Returns the minimum node in the tree.
  t.prototype.min=function(){return this.left._()?this:this.left.min();},// Returns the maximum key in the tree.
  t.prototype.it=function(){return this.min().key;},// Returns the maximum key in the tree.
  t.prototype.rt=function(){return this.right._()?this.key:this.right.rt();},// Returns new tree, with the key/value added.
  t.prototype.nt=function(t,e,n){var r=this,i=n(t,r.key);return (r=i<0?r.copy(null,null,null,r.left.nt(t,e,n),null):0===i?r.copy(null,e,null,null,null):r.copy(null,null,null,null,r.right.nt(t,e,n))).Et();},t.prototype.It=function(){if(this.left._())return t.EMPTY;var e=this;return e.left.At()||e.left.left.At()||(e=e.Rt()),(e=e.copy(null,null,null,e.left.It(),null)).Et();},// Returns new tree, with the specified item removed.
  t.prototype.remove=function(e,n){var r,i=this;if(n(e,i.key)<0)i.left._()||i.left.At()||i.left.left.At()||(i=i.Rt()),i=i.copy(null,null,null,i.left.remove(e,n),null);else {if(i.left.At()&&(i=i.Pt()),i.right._()||i.right.At()||i.right.left.At()||(i=i.Vt()),0===n(e,i.key)){if(i.right._())return t.EMPTY;r=i.right.min(),i=i.copy(r.key,r.value,null,null,i.right.It());}i=i.copy(null,null,null,null,i.right.remove(e,n));}return i.Et();},t.prototype.At=function(){return this.color;},// Returns new tree after performing any needed rotations.
  t.prototype.Et=function(){var t=this;return t.right.At()&&!t.left.At()&&(t=t.gt()),t.left.At()&&t.left.left.At()&&(t=t.Pt()),t.left.At()&&t.right.At()&&(t=t.yt()),t;},t.prototype.Rt=function(){var t=this.yt();return t.right.left.At()&&(t=(t=(t=t.copy(null,null,null,null,t.right.Pt())).gt()).yt()),t;},t.prototype.Vt=function(){var t=this.yt();return t.left.left.At()&&(t=(t=t.Pt()).yt()),t;},t.prototype.gt=function(){var e=this.copy(null,null,t.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null);},t.prototype.Pt=function(){var e=this.copy(null,null,t.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e);},t.prototype.yt=function(){var t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e);},// For testing.
  t.prototype.pt=function(){var t=this.bt();return Math.pow(2,t)<=this.size+1;},// In a balanced RB tree, the black-depth (number of black nodes) from root to
  // leaves is equal on both sides.  This function verifies that or asserts.
  t.prototype.bt=function(){if(this.At()&&this.left.At())throw _();if(this.right.At())throw _();var t=this.left.bt();if(t!==this.right.bt())throw _();return t+(this.At()?0:1);},t;}();// end SortedMap
  // An iterator over an LLRBNode.
  // end LLRBNode
  // Empty node is shared between all LLRB trees.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lt.EMPTY=null,lt.RED=!0,lt.st=!1,// end LLRBEmptyNode
  lt.EMPTY=new(/** @class */function(){function t(){this.size=0;}return Object.defineProperty(t.prototype,"key",{get:function get(){throw _();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"value",{get:function get(){throw _();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"color",{get:function get(){throw _();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"left",{get:function get(){throw _();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"right",{get:function get(){throw _();},enumerable:!1,configurable:!0}),// Returns a copy of the current node.
  t.prototype.copy=function(t,e,n,r,i){return this;},// Returns a copy of the tree, with the specified key/value added.
  t.prototype.nt=function(t,e,n){return new lt(t,e);},// Returns a copy of the tree, with the specified key removed.
  t.prototype.remove=function(t,e){return this;},t.prototype._=function(){return !0;},t.prototype.ot=function(t){return !1;},t.prototype.ht=function(t){return !1;},t.prototype.it=function(){return null;},t.prototype.rt=function(){return null;},t.prototype.At=function(){return !1;},// For testing.
  t.prototype.pt=function(){return !0;},t.prototype.bt=function(){return 0;},t;}())();/**
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
   */ /**
   * SortedSet is an immutable (copy-on-write) collection that holds elements
   * in order specified by the provided comparator.
   *
   * NOTE: if provided comparator returns 0 for two elements, we consider them to
   * be equal!
   */var pt=/** @class */function(){function t(t){this.P=t,this.data=new ht(this.P);}return t.prototype.has=function(t){return null!==this.data.get(t);},t.prototype.first=function(){return this.data.it();},t.prototype.last=function(){return this.data.rt();},Object.defineProperty(t.prototype,"size",{get:function get(){return this.data.size;},enumerable:!1,configurable:!0}),t.prototype.indexOf=function(t){return this.data.indexOf(t);},/** Iterates elements in order defined by "comparator" */t.prototype.forEach=function(t){this.data.ot(function(e,n){return t(e),!1;});},/** Iterates over `elem`s such that: range[0] <= elem < range[1]. */t.prototype.vt=function(t,e){for(var n=this.data.ut(t[0]);n.wt();){var r=n.dt();if(this.P(r.key,t[1])>=0)return;e(r.key);}},/**
       * Iterates over `elem`s such that: start <= elem until false is returned.
       */t.prototype.St=function(t,e){var n;for(n=void 0!==e?this.data.ut(e):this.data.at();n.wt();){if(!t(n.dt().key))return;}},/** Finds the least element greater than or equal to `elem`. */t.prototype.Dt=function(t){var e=this.data.ut(t);return e.wt()?e.dt().key:null;},t.prototype.at=function(){return new dt(this.data.at());},t.prototype.ut=function(t){return new dt(this.data.ut(t));},/** Inserts or updates an element */t.prototype.add=function(t){return this.copy(this.data.remove(t).nt(t,!0));},/** Deletes an element */t.prototype.delete=function(t){return this.has(t)?this.copy(this.data.remove(t)):this;},t.prototype._=function(){return this.data._();},t.prototype.Ct=function(t){var e=this;// Make sure `result` always refers to the larger one of the two sets.
  return e.size<t.size&&(e=t,t=this),t.forEach(function(t){e=e.add(t);}),e;},t.prototype.isEqual=function(e){if(!(e instanceof t))return !1;if(this.size!==e.size)return !1;for(var n=this.data.at(),r=e.data.at();n.wt();){var i=n.dt().key,o=r.dt().key;if(0!==this.P(i,o))return !1;}return !0;},t.prototype.N=function(){var t=[];return this.forEach(function(e){t.push(e);}),t;},t.prototype.toString=function(){var t=[];return this.forEach(function(e){return t.push(e);}),"SortedSet("+t.toString()+")";},t.prototype.copy=function(e){var n=new t(this.P);return n.data=e,n;},t;}(),dt=/** @class */function(){function t(t){this.Nt=t;}return t.prototype.dt=function(){return this.Nt.dt().key;},t.prototype.wt=function(){return this.Nt.wt();},t;}(),vt=new ht(W$1.P);function yt(){return vt;}function mt(){return yt();}var gt=new ht(W$1.P);function wt(){return gt;}var bt=new ht(W$1.P),It=new pt(W$1.P);function Et(){for(var t=[],e=0;e<arguments.length;e++){t[e]=arguments[e];}for(var n=It,r=0,i=t;r<i.length;r++){var o=i[r];n=n.add(o);}return n;}var Tt=new pt(P$1);function Nt(){return Tt;}/**
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
   */ /**
   * DocumentSet is an immutable (copy-on-write) collection that holds documents
   * in order specified by the provided comparator. We always add a document key
   * comparator on top of what is provided to guarantee document equality based on
   * the key.
   */var At=/** @class */function(){/** The default ordering is by key if the comparator is omitted */function t(t){// We are adding document key comparator to the end as it's the only
  // guaranteed unique property of a document.
  this.P=t?function(e,n){return t(e,n)||W$1.P(e.key,n.key);}:function(t,e){return W$1.P(t.key,e.key);},this.Ft=wt(),this.kt=new ht(this.P)/**
       * Returns an empty copy of the existing DocumentSet, using the same
       * comparator.
       */;}return t.xt=function(e){return new t(e.P);},t.prototype.has=function(t){return null!=this.Ft.get(t);},t.prototype.get=function(t){return this.Ft.get(t);},t.prototype.first=function(){return this.kt.it();},t.prototype.last=function(){return this.kt.rt();},t.prototype._=function(){return this.kt._();},/**
       * Returns the index of the provided key in the document set, or -1 if the
       * document key is not present in the set;
       */t.prototype.indexOf=function(t){var e=this.Ft.get(t);return e?this.kt.indexOf(e):-1;},Object.defineProperty(t.prototype,"size",{get:function get(){return this.kt.size;},enumerable:!1,configurable:!0}),/** Iterates documents in order defined by "comparator" */t.prototype.forEach=function(t){this.kt.ot(function(e,n){return t(e),!1;});},/** Inserts or updates a document with the same key */t.prototype.add=function(t){// First remove the element if we have it.
  var e=this.delete(t.key);return e.copy(e.Ft.nt(t.key,t),e.kt.nt(t,null));},/** Deletes a document with a given key */t.prototype.delete=function(t){var e=this.get(t);return e?this.copy(this.Ft.remove(t),this.kt.remove(e)):this;},t.prototype.isEqual=function(e){if(!(e instanceof t))return !1;if(this.size!==e.size)return !1;for(var n=this.kt.at(),r=e.kt.at();n.wt();){var i=n.dt().key,o=r.dt().key;if(!i.isEqual(o))return !1;}return !0;},t.prototype.toString=function(){var t=[];return this.forEach(function(e){t.push(e.toString());}),0===t.length?"DocumentSet ()":"DocumentSet (\n  "+t.join("  \n")+"\n)";},t.prototype.copy=function(e,n){var r=new t();return r.P=this.P,r.Ft=e,r.kt=n,r;},t;}(),_t=/** @class */function(){function t(){this.$t=new ht(W$1.P);}return t.prototype.track=function(t){var e=t.doc.key,n=this.$t.get(e);n?// Merge the new change with the existing change.
  0/* Added */!==t.type&&3/* Metadata */===n.type?this.$t=this.$t.nt(e,t):3/* Metadata */===t.type&&1/* Removed */!==n.type?this.$t=this.$t.nt(e,{type:n.type,doc:t.doc}):2/* Modified */===t.type&&2/* Modified */===n.type?this.$t=this.$t.nt(e,{type:2/* Modified */,doc:t.doc}):2/* Modified */===t.type&&0/* Added */===n.type?this.$t=this.$t.nt(e,{type:0/* Added */,doc:t.doc}):1/* Removed */===t.type&&0/* Added */===n.type?this.$t=this.$t.remove(e):1/* Removed */===t.type&&2/* Modified */===n.type?this.$t=this.$t.nt(e,{type:1/* Removed */,doc:n.doc}):0/* Added */===t.type&&1/* Removed */===n.type?this.$t=this.$t.nt(e,{type:2/* Modified */,doc:t.doc}):// This includes these cases, which don't make sense:
  // Added->Added
  // Removed->Removed
  // Modified->Added
  // Removed->Modified
  // Metadata->Added
  // Removed->Metadata
  _():this.$t=this.$t.nt(e,t);},t.prototype.Mt=function(){var t=[];return this.$t.ot(function(e,n){t.push(n);}),t;},t;}(),Dt=/** @class */function(){function t(t,e,n,r,i,o,s,u){this.query=t,this.docs=e,this.Ot=n,this.docChanges=r,this.Lt=i,this.fromCache=o,this.qt=s,this.Bt=u/** Returns a view snapshot as if all documents in the snapshot were added. */;}return t.Ut=function(e,n,r,i){var o=[];return n.forEach(function(t){o.push({type:0/* Added */,doc:t});}),new t(e,n,At.xt(n),o,r,i,/* syncStateChanged= */!0,/* excludesMetadataChanges= */!1);},Object.defineProperty(t.prototype,"hasPendingWrites",{get:function get(){return !this.Lt._();},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(t){if(!(this.fromCache===t.fromCache&&this.qt===t.qt&&this.Lt.isEqual(t.Lt)&&Dn(this.query,t.query)&&this.docs.isEqual(t.docs)&&this.Ot.isEqual(t.Ot)))return !1;var e=this.docChanges,n=t.docChanges;if(e.length!==n.length)return !1;for(var r=0;r<e.length;r++){if(e[r].type!==n[r].type||!e[r].doc.isEqual(n[r].doc))return !1;}return !0;},t;}(),kt=/** @class */function(){function t(/**
       * The snapshot version this event brings us up to, or MIN if not set.
       */t,/**
       * A map from target to changes to the target. See TargetChange.
       */e,/**
       * A set of targets that is known to be inconsistent. Listens for these
       * targets should be re-established without resume tokens.
       */n,/**
       * A set of which documents have changed or been deleted, along with the
       * doc's new values (if not deleted).
       */r,/**
       * A set of which document updates are due only to limbo resolution targets.
       */i){this.X=t,this.Qt=e,this.Wt=n,this.jt=r,this.Kt=i;}/**
       * HACK: Views require RemoteEvents in order to determine whether the view is
       * CURRENT, but secondary tabs don't receive remote events. So this method is
       * used to create a synthesized RemoteEvent that can be used to apply a
       * CURRENT status change to a View, for queries executed in a different tab.
       */ // PORTING NOTE: Multi-tab only
  return t.Gt=function(e,n){var r=new Map();return r.set(e,xt.zt(e,n)),new t(B.min(),r,Nt(),yt(),Et());},t;}(),xt=/** @class */function(){function t(/**
       * An opaque, server-assigned token that allows watching a query to be resumed
       * after disconnecting without retransmitting all the data that matches the
       * query. The resume token essentially identifies a point in time from which
       * the server should resume sending results.
       */t,/**
       * The "current" (synced) status of this target. Note that "current"
       * has special meaning in the RPC protocol that implies that a target is
       * both up-to-date and consistent with the rest of the watch stream.
       */e,/**
       * The set of documents that were newly assigned to this target as part of
       * this remote event.
       */n,/**
       * The set of documents that were already assigned to this target but received
       * an update during this remote event.
       */r,/**
       * The set of documents that were removed from this target as part of this
       * remote event.
       */i){this.resumeToken=t,this.Ht=e,this.Yt=n,this.Jt=r,this.Xt=i/**
       * This method is used to create a synthesized TargetChanges that can be used to
       * apply a CURRENT status change to a View (for queries executed in a different
       * tab) or for new queries (to raise snapshots with correct CURRENT status).
       */;}return t.zt=function(e,n){return new t(rt.Y,n,Et(),Et(),Et());},t;}(),St=function St(/** The new document applies to all of these targets. */t,/** The new document is removed from all of these targets. */e,/** The key of the document for this change. */n,/**
       * The new document or NoDocument if it was deleted. Is null if the
       * document went out of view without the server sending a new document.
       */r){this.Zt=t,this.removedTargetIds=e,this.key=n,this.te=r;},Pt=function Pt(t,e){this.targetId=t,this.ee=e;},Lt=function Lt(/** What kind of change occurred to the watch target. */t,/** The target IDs that were added/removed/set. */e,/**
       * An opaque, server-assigned token that allows watching a target to be
       * resumed after disconnecting without retransmitting all the data that
       * matches the target. The resume token essentially identifies a point in
       * time from which the server should resume sending results.
       */n/** An RPC error indicating why the watch failed. */,r){void 0===n&&(n=rt.Y),void 0===r&&(r=null),this.state=t,this.targetIds=e,this.resumeToken=n,this.cause=r;},Ot=/** @class */function(){function t(){/**
           * The number of pending responses (adds or removes) that we are waiting on.
           * We only consider targets active that have no pending responses.
           */this.ne=0,/**
               * Keeps track of the document changes since the last raised snapshot.
               *
               * These changes are continuously updated as we receive document updates and
               * always reflect the current set of changes against the last issued snapshot.
               */this.se=Ut(),/** See public getters for explanations of these fields. */this.ie=rt.Y,this.re=!1,/**
               * Whether this target state should be included in the next snapshot. We
               * initialize to true so that newly-added targets are included in the next
               * RemoteEvent.
               */this.oe=!0;}return Object.defineProperty(t.prototype,"Ht",{/**
           * Whether this target has been marked 'current'.
           *
           * 'Current' has special meaning in the RPC protocol: It implies that the
           * Watch backend has sent us all changes up to the point at which the target
           * was added and that the target is consistent with the rest of the watch
           * stream.
           */get:function get(){return this.re;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"resumeToken",{/** The last resume token sent to us for this target. */get:function get(){return this.ie;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"he",{/** Whether this target has pending target adds or target removes. */get:function get(){return 0!==this.ne;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"ae",{/** Whether we have modified any state that should trigger a snapshot. */get:function get(){return this.oe;},enumerable:!1,configurable:!0}),/**
       * Applies the resume token to the TargetChange, but only when it has a new
       * value. Empty resumeTokens are discarded.
       */t.prototype.ue=function(t){t.H()>0&&(this.oe=!0,this.ie=t);},/**
       * Creates a target change from the current set of changes.
       *
       * To reset the document changes after raising this snapshot, call
       * `clearPendingChanges()`.
       */t.prototype.ce=function(){var t=Et(),e=Et(),n=Et();return this.se.forEach(function(r,i){switch(i){case 0/* Added */:t=t.add(r);break;case 2/* Modified */:e=e.add(r);break;case 1/* Removed */:n=n.add(r);break;default:_();}}),new xt(this.ie,this.re,t,e,n);},/**
       * Resets the document changes and sets `hasPendingChanges` to false.
       */t.prototype.le=function(){this.oe=!1,this.se=Ut();},t.prototype._e=function(t,e){this.oe=!0,this.se=this.se.nt(t,e);},t.prototype.fe=function(t){this.oe=!0,this.se=this.se.remove(t);},t.prototype.de=function(){this.ne+=1;},t.prototype.we=function(){this.ne-=1;},t.prototype.Te=function(){this.oe=!0,this.re=!0;},t;}(),Rt=/** @class */function(){function t(t){this.Ee=t,/** The internal state of all tracked targets. */this.Ie=new Map(),/** Keeps track of the documents to update since the last raised snapshot. */this.me=yt(),/** A mapping of document keys to their set of target IDs. */this.Ae=Vt(),/**
               * A list of targets with existence filter mismatches. These targets are
               * known to be inconsistent and their listens needs to be re-established by
               * RemoteStore.
               */this.Re=new pt(P$1)/**
       * Processes and adds the DocumentWatchChange to the current set of changes.
       */;}return t.prototype.Pe=function(t){for(var e=0,n=t.Zt;e<n.length;e++){var r=n[e];t.te instanceof dn?this.Ve(r,t.te):t.te instanceof vn&&this.ge(r,t.key,t.te);}for(var i=0,o=t.removedTargetIds;i<o.length;i++){var s=o[i];this.ge(s,t.key,t.te);}},/** Processes and adds the WatchTargetChange to the current set of changes. */t.prototype.ye=function(t){var e=this;this.pe(t,function(n){var r=e.be(n);switch(t.state){case 0/* NoChange */:e.ve(n)&&r.ue(t.resumeToken);break;case 1/* Added */:// We need to decrement the number of pending acks needed from watch
  // for this targetId.
  r.we(),r.he||// We have a freshly added target, so we need to reset any state
  // that we had previously. This can happen e.g. when remove and add
  // back a target for existence filter mismatches.
  r.le(),r.ue(t.resumeToken);break;case 2/* Removed */:// We need to keep track of removed targets to we can post-filter and
  // remove any target changes.
  // We need to decrement the number of pending acks needed from watch
  // for this targetId.
  r.we(),r.he||e.removeTarget(n);break;case 3/* Current */:e.ve(n)&&(r.Te(),r.ue(t.resumeToken));break;case 4/* Reset */:e.ve(n)&&(// Reset the target and synthesizes removes for all existing
  // documents. The backend will re-add any documents that still
  // match the target before it sends the next global snapshot.
  e.Se(n),r.ue(t.resumeToken));break;default:_();}});},/**
       * Iterates over all targetIds that the watch change applies to: either the
       * targetIds explicitly listed in the change or the targetIds of all currently
       * active targets.
       */t.prototype.pe=function(t,e){var n=this;t.targetIds.length>0?t.targetIds.forEach(e):this.Ie.forEach(function(t,r){n.ve(r)&&e(r);});},/**
       * Handles existence filters and synthesizes deletes for filter mismatches.
       * Targets that are invalidated by filter mismatches are added to
       * `pendingTargetResets`.
       */t.prototype.De=function(t){var e=t.targetId,n=t.ee.count,r=this.Ce(e);if(r){var i=r.target;if(nt(i)){if(0===n){// The existence filter told us the document does not exist. We deduce
  // that this document does not exist and apply a deleted document to
  // our updates. Without applying this deleted document there might be
  // another query that will raise this document as part of a snapshot
  // until it is resolved, essentially exposing inconsistency between
  // queries.
  var o=new W$1(i.path);this.ge(e,o,new vn(o,B.min()));}else D$1(1===n);}else this.Ne(e)!==n&&(// Existence filter mismatch: We reset the mapping and raise a new
  // snapshot with `isFromCache:true`.
  this.Se(e),this.Re=this.Re.add(e));}},/**
       * Converts the currently accumulated state into a remote event at the
       * provided snapshot version. Resets the accumulated changes before returning.
       */t.prototype.Fe=function(t){var e=this,n=new Map();this.Ie.forEach(function(r,i){var o=e.Ce(i);if(o){if(r.Ht&&nt(o.target)){// Document queries for document that don't exist can produce an empty
  // result set. To update our local cache, we synthesize a document
  // delete if we have not previously received the document. This
  // resolves the limbo state of the document, removing it from
  // limboDocumentRefs.
  // TODO(dimond): Ideally we would have an explicit lookup target
  // instead resulting in an explicit delete message and we could
  // remove this special logic.
  var s=new W$1(o.target.path);null!==e.me.get(s)||e.ke(i,s)||e.ge(i,s,new vn(s,t));}r.ae&&(n.set(i,r.ce()),r.le());}});var r=Et();// We extract the set of limbo-only document updates as the GC logic
  // special-cases documents that do not appear in the target cache.
  // TODO(gsoltis): Expand on this comment once GC is available in the JS
  // client.
  this.Ae.forEach(function(t,n){var i=!0;n.St(function(t){var n=e.Ce(t);return !n||2/* LimboResolution */===n.J||(i=!1,!1);}),i&&(r=r.add(t));});var i=new kt(t,n,this.Re,this.me,r);return this.me=yt(),this.Ae=Vt(),this.Re=new pt(P$1),i;},/**
       * Adds the provided document to the internal list of document updates and
       * its document key to the given target's mapping.
       */ // Visible for testing.
  t.prototype.Ve=function(t,e){if(this.ve(t)){var n=this.ke(t,e.key)?2/* Modified */:0/* Added */;this.be(t)._e(e.key,n),this.me=this.me.nt(e.key,e),this.Ae=this.Ae.nt(e.key,this.xe(e.key).add(t));}},/**
       * Removes the provided document from the target mapping. If the
       * document no longer matches the target, but the document's state is still
       * known (e.g. we know that the document was deleted or we received the change
       * that caused the filter mismatch), the new document can be provided
       * to update the remote document cache.
       */ // Visible for testing.
  t.prototype.ge=function(t,e,n){if(this.ve(t)){var r=this.be(t);this.ke(t,e)?r._e(e,1/* Removed */):// The document may have entered and left the target before we raised a
  // snapshot, so we can just ignore the change.
  r.fe(e),this.Ae=this.Ae.nt(e,this.xe(e).delete(t)),n&&(this.me=this.me.nt(e,n));}},t.prototype.removeTarget=function(t){this.Ie.delete(t);},/**
       * Returns the current count of documents in the target. This includes both
       * the number of documents that the LocalStore considers to be part of the
       * target as well as any accumulated changes.
       */t.prototype.Ne=function(t){var e=this.be(t).ce();return this.Ee.$e(t).size+e.Yt.size-e.Xt.size;},/**
       * Increment the number of acks needed from watch before we can consider the
       * server to be 'in-sync' with the client's active targets.
       */t.prototype.de=function(t){this.be(t).de();},t.prototype.be=function(t){var e=this.Ie.get(t);return e||(e=new Ot(),this.Ie.set(t,e)),e;},t.prototype.xe=function(t){var e=this.Ae.get(t);return e||(e=new pt(P$1),this.Ae=this.Ae.nt(t,e)),e;},/**
       * Verifies that the user is still interested in this target (by calling
       * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
       * from watch.
       */t.prototype.ve=function(t){var e=null!==this.Ce(t);return e||E$1("WatchChangeAggregator","Detected inactive target",t),e;},/**
       * Returns the TargetData for an active target (i.e. a target that the user
       * is still interested in that has no outstanding target change requests).
       */t.prototype.Ce=function(t){var e=this.Ie.get(t);return e&&e.he?null:this.Ee.Me(t);},/**
       * Resets the state of a Watch target to its initial state (e.g. sets
       * 'current' to false, clears the resume token and removes its target mapping
       * from all documents).
       */t.prototype.Se=function(t){var e=this;this.Ie.set(t,new Ot()),this.Ee.$e(t).forEach(function(n){e.ge(t,n,/*updatedDocument=*/null);});},/**
       * Returns whether the LocalStore considers the document to be part of the
       * specified target.
       */t.prototype.ke=function(t,e){return this.Ee.$e(t).has(e);},t;}();/**
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
   */ /**
   * DocumentChangeSet keeps track of a set of changes to docs in a query, merging
   * duplicate events for the same doc.
   */function Vt(){return new ht(W$1.P);}function Ut(){return new ht(W$1.P);}/**
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
   */ /**
   * Represents a locally-applied ServerTimestamp.
   *
   * Server Timestamps are backed by MapValues that contain an internal field
   * `__type__` with a value of `server_timestamp`. The previous value and local
   * write time are stored in its `__previous_value__` and `__local_write_time__`
   * fields respectively.
   *
   * Notes:
   * - ServerTimestampValue instances are created as the result of applying a
   *   TransformMutation (see TransformMutation.applyTo()). They can only exist in
   *   the local view of a document. Therefore they do not need to be parsed or
   *   serialized.
   * - When evaluated locally (e.g. for snapshot.data()), they by default
   *   evaluate to `null`. This behavior can be configured by passing custom
   *   FieldValueOptions to value().
   * - With respect to other ServerTimestampValues, they sort by their
   *   localWriteTime.
   */function Ct(t){var e,n;return "server_timestamp"===(null===(n=((null===(e=null==t?void 0:t.mapValue)||void 0===e?void 0:e.fields)||{}).__type__)||void 0===n?void 0:n.stringValue);}/**
   * Creates a new ServerTimestamp proto value (using the internal format).
   */ /**
   * Returns the local time at which this timestamp was first set.
   */function Mt(t){var e=Xt(t.mapValue.fields.__local_write_time__.timestampValue);return new G$1(e.seconds,e.nanos);}/**
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
   */ // A RegExp matching ISO 8601 UTC timestamps with optional fraction.
  var Ft=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);/** Extracts the backend's type order for the provided value. */function qt(t){return "nullValue"in t?0/* NullValue */:"booleanValue"in t?1/* BooleanValue */:"integerValue"in t||"doubleValue"in t?2/* NumberValue */:"timestampValue"in t?3/* TimestampValue */:"stringValue"in t?5/* StringValue */:"bytesValue"in t?6/* BlobValue */:"referenceValue"in t?7/* RefValue */:"geoPointValue"in t?8/* GeoPointValue */:"arrayValue"in t?9/* ArrayValue */:"mapValue"in t?Ct(t)?4/* ServerTimestampValue */:10/* ObjectValue */:_();}/** Tests `left` and `right` for equality based on the backend semantics. */function jt(t,e){var n=qt(t);if(n!==qt(e))return !1;switch(n){case 0/* NullValue */:return !0;case 1/* BooleanValue */:return t.booleanValue===e.booleanValue;case 4/* ServerTimestampValue */:return Mt(t).isEqual(Mt(e));case 3/* TimestampValue */:return function(t,e){if("string"==typeof t.timestampValue&&"string"==typeof e.timestampValue&&t.timestampValue.length===e.timestampValue.length)// Use string equality for ISO 8601 timestamps
  return t.timestampValue===e.timestampValue;var n=Xt(t.timestampValue),r=Xt(e.timestampValue);return n.seconds===r.seconds&&n.nanos===r.nanos;}(t,e);case 5/* StringValue */:return t.stringValue===e.stringValue;case 6/* BlobValue */:return function(t,e){return Wt(t.bytesValue).isEqual(Wt(e.bytesValue));}(t,e);case 7/* RefValue */:return t.referenceValue===e.referenceValue;case 8/* GeoPointValue */:return function(t,e){return Qt(t.geoPointValue.latitude)===Qt(e.geoPointValue.latitude)&&Qt(t.geoPointValue.longitude)===Qt(e.geoPointValue.longitude);}(t,e);case 2/* NumberValue */:return function(t,e){if("integerValue"in t&&"integerValue"in e)return Qt(t.integerValue)===Qt(e.integerValue);if("doubleValue"in t&&"doubleValue"in e){var n=Qt(t.doubleValue),r=Qt(e.doubleValue);return n===r?Y$1(n)===Y$1(r):isNaN(n)&&isNaN(r);}return !1;}(t,e);case 9/* ArrayValue */:return L$1(t.arrayValue.values||[],e.arrayValue.values||[],jt);case 10/* ObjectValue */:return function(t,e){var n=t.mapValue.fields||{},r=e.mapValue.fields||{};if(U$1(n)!==U$1(r))return !1;for(var i in n){if(n.hasOwnProperty(i)&&(void 0===r[i]||!jt(n[i],r[i])))return !1;}return !0;}(t,e);default:return _();}}function Gt(t,e){return void 0!==(t.values||[]).find(function(t){return jt(t,e);});}function Bt(t,e){var n=qt(t),r=qt(e);if(n!==r)return P$1(n,r);switch(n){case 0/* NullValue */:return 0;case 1/* BooleanValue */:return P$1(t.booleanValue,e.booleanValue);case 2/* NumberValue */:return function(t,e){var n=Qt(t.integerValue||t.doubleValue),r=Qt(e.integerValue||e.doubleValue);return n<r?-1:n>r?1:n===r?0:// one or both are NaN.
  isNaN(n)?isNaN(r)?0:-1:1;}(t,e);case 3/* TimestampValue */:return zt(t.timestampValue,e.timestampValue);case 4/* ServerTimestampValue */:return zt(Mt(t),Mt(e));case 5/* StringValue */:return P$1(t.stringValue,e.stringValue);case 6/* BlobValue */:return function(t,e){var n=Wt(t),r=Wt(e);return n.o(r);}(t.bytesValue,e.bytesValue);case 7/* RefValue */:return function(t,e){for(var n=t.split("/"),r=e.split("/"),i=0;i<n.length&&i<r.length;i++){var o=P$1(n[i],r[i]);if(0!==o)return o;}return P$1(n.length,r.length);}(t.referenceValue,e.referenceValue);case 8/* GeoPointValue */:return function(t,e){var n=P$1(Qt(t.latitude),Qt(e.latitude));return 0!==n?n:P$1(Qt(t.longitude),Qt(e.longitude));}(t.geoPointValue,e.geoPointValue);case 9/* ArrayValue */:return function(t,e){for(var n=t.values||[],r=e.values||[],i=0;i<n.length&&i<r.length;++i){var o=Bt(n[i],r[i]);if(o)return o;}return P$1(n.length,r.length);}(t.arrayValue,e.arrayValue);case 10/* ObjectValue */:return function(t,e){var n=t.fields||{},r=Object.keys(n),i=e.fields||{},o=Object.keys(i);// Even though MapValues are likely sorted correctly based on their insertion
  // order (e.g. when received from the backend), local modifications can bring
  // elements out of order. We need to re-sort the elements to ensure that
  // canonical IDs are independent of insertion order.
  r.sort(),o.sort();for(var s=0;s<r.length&&s<o.length;++s){var u=P$1(r[s],o[s]);if(0!==u)return u;var a=Bt(n[r[s]],i[o[s]]);if(0!==a)return a;}return P$1(r.length,o.length);}(t.mapValue,e.mapValue);default:throw _();}}function zt(t,e){if("string"==typeof t&&"string"==typeof e&&t.length===e.length)return P$1(t,e);var n=Xt(t),r=Xt(e),i=P$1(n.seconds,r.seconds);return 0!==i?i:P$1(n.nanos,r.nanos);}function Kt(t){return function t(e){return "nullValue"in e?"null":"booleanValue"in e?""+e.booleanValue:"integerValue"in e?""+e.integerValue:"doubleValue"in e?""+e.doubleValue:"timestampValue"in e?function(t){var e=Xt(t);return "time("+e.seconds+","+e.nanos+")";}(e.timestampValue):"stringValue"in e?e.stringValue:"bytesValue"in e?Wt(e.bytesValue).toBase64():"referenceValue"in e?(r=e.referenceValue,W$1.B(r).toString()):"geoPointValue"in e?"geo("+(n=e.geoPointValue).latitude+","+n.longitude+")":"arrayValue"in e?function(e){for(var n="[",r=!0,i=0,o=e.values||[];i<o.length;i++){var s=o[i];r?r=!1:n+=",",n+=t(s);}return n+"]";}(e.arrayValue):"mapValue"in e?function(e){for(// Iteration order in JavaScript is not guaranteed. To ensure that we generate
  // matching canonical IDs for identical maps, we need to sort the keys.
  var n="{",r=!0,i=0,o=Object.keys(e.fields||{}).sort();i<o.length;i++){var s=o[i];r?r=!1:n+=",",n+=s+":"+t(e.fields[s]);}return n+"}";}(e.mapValue):_();var n,r;}(t);}function Xt(t){// The json interface (for the browser) will return an iso timestamp string,
  // while the proto js library (for node) will return a
  // google.protobuf.Timestamp instance.
  if(D$1(!!t),"string"==typeof t){// The date string can have higher precision (nanos) than the Date class
  // (millis), so we do some custom parsing here.
  // Parse the nanos right out of the string.
  var e=0,n=Ft.exec(t);if(D$1(!!n),n[1]){// Pad the fraction out to 9 digits (nanos).
  var r=n[1];r=(r+"000000000").substr(0,9),e=Number(r);}// Parse the date to get the seconds.
  var i=new Date(t);return {seconds:Math.floor(i.getTime()/1e3),nanos:e};}return {seconds:Qt(t.seconds),nanos:Qt(t.nanos)};}/**
   * Converts the possible Proto types for numbers into a JavaScript number.
   * Returns 0 if the value is not numeric.
   */function Qt(t){// TODO(bjornick): Handle int64 greater than 53 bits.
  return "number"==typeof t?t:"string"==typeof t?Number(t):0;}/** Converts the possible Proto types for Blobs into a ByteString. */function Wt(t){return "string"==typeof t?rt.fromBase64String(t):rt.fromUint8Array(t);}/** Returns a reference value for the provided database and key. */function Ht(t,e){return {referenceValue:"projects/"+t.projectId+"/databases/"+t.database+"/documents/"+e.path.F()};}/** Returns true if `value` is an IntegerValue . */function Yt(t){return !!t&&"integerValue"in t;}/** Returns true if `value` is a DoubleValue. */ /** Returns true if `value` is an ArrayValue. */function $t(t){return !!t&&"arrayValue"in t;}/** Returns true if `value` is a NullValue. */function Jt(t){return !!t&&"nullValue"in t;}/** Returns true if `value` is NaN. */function Zt(t){return !!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue));}/** Returns true if `value` is a MapValue. */function te(t){return !!t&&"mapValue"in t;}/**
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
   */var ee={asc:"ASCENDING",desc:"DESCENDING"},ne={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},re=function re(t,e){this.s=t,this.Oe=e;};/**
   * This class generates JsonObject values for the Datastore API suitable for
   * sending to either GRPC stub methods or via the JSON/HTTP REST API.
   *
   * The serializer supports both Protobuf.js and Proto3 JSON formats. By
   * setting `useProto3Json` to true, the serializer will use the Proto3 JSON
   * format.
   *
   * For a description of the Proto3 JSON format check
   * https://developers.google.com/protocol-buffers/docs/proto3#json
   *
   * TODO(klimt): We can remove the databaseId argument if we keep the full
   * resource name in documents.
   */ /**
   * Returns an IntegerValue for `value`.
   */function ie(t){return {integerValue:""+t};}/**
   * Returns an DoubleValue for `value` that is encoded based the serializer's
   * `useProto3Json` setting.
   */function oe(t,e){if(t.Oe){if(isNaN(e))return {doubleValue:"NaN"};if(e===1/0)return {doubleValue:"Infinity"};if(e===-1/0)return {doubleValue:"-Infinity"};}return {doubleValue:Y$1(e)?"-0":e};}/**
   * Returns a value for a number that's appropriate to put into a proto.
   * The return value is an IntegerValue if it can safely represent the value,
   * otherwise a DoubleValue is returned.
   */function se(t,e){return $(e)?ie(e):oe(t,e);}/**
   * Returns a value for a Date that's appropriate to put into a proto.
   */function ue(t,e){return t.Oe?new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")+"."+("000000000"+e.nanoseconds).slice(-9)+"Z":{seconds:""+e.seconds,nanos:e.nanoseconds};}/**
   * Returns a value for bytes that's appropriate to put in a proto.
   *
   * Visible for testing.
   */function ae(t,e){return t.Oe?e.toBase64():e.toUint8Array();}/**
   * Returns a ByteString based on the proto string value.
   */function ce(t,e){return ue(t,e.A());}function he(t){return D$1(!!t),B.I(function(t){var e=Xt(t);return new G$1(e.seconds,e.nanos);}(t));}function fe(t,e){return function(t){return new K$1(["projects",t.projectId,"databases",t.database]);}(t).child("documents").child(e).F();}function le(t){var e=K$1.k(t);return D$1(Pe(e)),e;}function pe(t,e){return fe(t.s,e.path);}function de(t,e){var n=le(e);return D$1(n.get(1)===t.s.projectId),D$1(!n.get(3)&&!t.s.database||n.get(3)===t.s.database),new W$1(ge(n));}function ve(t,e){return fe(t.s,e);}function ye(t){var e=le(t);// In v1beta1 queries for collections at the root did not have a trailing
  // "/documents". In v1 all resource paths contain "/documents". Preserve the
  // ability to read the v1beta1 form for compatibility with queries persisted
  // in the local target cache.
  return 4===e.length?K$1.$():ge(e);}function me(t){return new K$1(["projects",t.s.projectId,"databases",t.s.database]).F();}function ge(t){return D$1(t.length>4&&"documents"===t.get(4)),t.g(5)/** Creates an api.Document from key and fields (but no create/update time) */;}function we(t,e,n){return {name:pe(t,e),fields:n.proto.mapValue.fields};}function be(t,e){var n;if(e instanceof en)n={update:we(t,e.key,e.value)};else if(e instanceof an)n={delete:pe(t,e.key)};else if(e instanceof nn)n={update:we(t,e.key,e.data),updateMask:Se(e.Le)};else if(e instanceof on)n={transform:{document:pe(t,e.key),fieldTransforms:e.fieldTransforms.map(function(t){return function(t,e){var n=e.transform;if(n instanceof Ue)return {fieldPath:e.field.F(),setToServerValue:"REQUEST_TIME"};if(n instanceof Ce)return {fieldPath:e.field.F(),appendMissingElements:{values:n.elements}};if(n instanceof Fe)return {fieldPath:e.field.F(),removeAllFromArray:{values:n.elements}};if(n instanceof je)return {fieldPath:e.field.F(),increment:n.qe};throw _();}(0,t);})}};else {if(!(e instanceof cn))return _();n={verify:pe(t,e.key)};}return e.Ue.Be||(n.currentDocument=function(t,e){return void 0!==e.updateTime?{updateTime:ce(t,e.updateTime)}:void 0!==e.exists?{exists:e.exists}:_();}(t,e.Ue)),n;}function Ie(t,e){var n=e.currentDocument?function(t){return void 0!==t.updateTime?Qe.updateTime(he(t.updateTime)):void 0!==t.exists?Qe.exists(t.exists):Qe.Qe();}(e.currentDocument):Qe.Qe();if(e.update){e.update.name;var r=de(t,e.update.name),i=new hn({mapValue:{fields:e.update.fields}});if(e.updateMask){var o=function(t){var e=t.fieldPaths||[];return new ze(e.map(function(t){return Q$1.q(t);}));}(e.updateMask);return new nn(r,i,o,n);}return new en(r,i,n);}if(e.delete){var s=de(t,e.delete);return new an(s,n);}if(e.transform){var u=de(t,e.transform.document),a=e.transform.fieldTransforms.map(function(e){return function(t,e){var n=null;if("setToServerValue"in e)D$1("REQUEST_TIME"===e.setToServerValue),n=new Ue();else if("appendMissingElements"in e){var r=e.appendMissingElements.values||[];n=new Ce(r);}else if("removeAllFromArray"in e){var i=e.removeAllFromArray.values||[];n=new Fe(i);}else "increment"in e?n=new je(t,e.increment):_();var o=Q$1.q(e.fieldPath);return new Ke(o,n);}(t,e);});return D$1(!0===n.exists),new on(u,a);}if(e.verify){var c=de(t,e.verify);return new cn(c,n);}return _();}function Ee(t,e){return {documents:[ve(t,e.path)]};}function Te(t,e){// Dissect the path into parent, collectionId, and optional key filter.
  var n={structuredQuery:{}},r=e.path;null!==e.collectionGroup?(n.parent=ve(t,r),n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(n.parent=ve(t,r.p()),n.structuredQuery.from=[{collectionId:r.S()}]);var i=function(t){if(0!==t.length){var e=t.map(function(t){// visible for testing
  return function(t){if("=="/* EQUAL */===t.op){if(Zt(t.value))return {unaryFilter:{field:_e(t.field),op:"IS_NAN"}};if(Jt(t.value))return {unaryFilter:{field:_e(t.field),op:"IS_NULL"}};}else if("!="/* NOT_EQUAL */===t.op){if(Zt(t.value))return {unaryFilter:{field:_e(t.field),op:"IS_NOT_NAN"}};if(Jt(t.value))return {unaryFilter:{field:_e(t.field),op:"IS_NOT_NULL"}};}return {fieldFilter:{field:_e(t.field),op:(e=t.op,ne[e]),value:t.value}};// visible for testing
  var e;}(t);});return 1===e.length?e[0]:{compositeFilter:{op:"AND",filters:e}};}}(e.filters);i&&(n.structuredQuery.where=i);var o=function(t){if(0!==t.length)return t.map(function(t){return {field:_e((e=t).field),direction:(n=e.dir,ee[n])};// visible for testing
  var e,n;});}(e.orderBy);o&&(n.structuredQuery.orderBy=o);var s=function(t,e){return t.Oe||H$1(e)?e:{value:e};}(t,e.limit);return null!==s&&(n.structuredQuery.limit=s),e.startAt&&(n.structuredQuery.startAt=Ne(e.startAt)),e.endAt&&(n.structuredQuery.endAt=Ne(e.endAt)),n;}function Ne(t){return {before:t.before,values:t.position};}function Ae(t){var e=!!t.before,n=t.values||[];return new jn(n,e);}// visible for testing
  function _e(t){return {fieldPath:t.F()};}function De(t){return Q$1.q(t.fieldPath);}function ke(t){return Ln.create(De(t.fieldFilter.field),function(t){switch(t){case"EQUAL":return "=="/* EQUAL */;case"NOT_EQUAL":return "!="/* NOT_EQUAL */;case"GREATER_THAN":return ">"/* GREATER_THAN */;case"GREATER_THAN_OR_EQUAL":return ">="/* GREATER_THAN_OR_EQUAL */;case"LESS_THAN":return "<"/* LESS_THAN */;case"LESS_THAN_OR_EQUAL":return "<="/* LESS_THAN_OR_EQUAL */;case"ARRAY_CONTAINS":return "array-contains"/* ARRAY_CONTAINS */;case"IN":return "in"/* IN */;case"NOT_IN":return "not-in"/* NOT_IN */;case"ARRAY_CONTAINS_ANY":return "array-contains-any"/* ARRAY_CONTAINS_ANY */;case"OPERATOR_UNSPECIFIED":default:return _();}}(t.fieldFilter.op),t.fieldFilter.value);}function xe(t){switch(t.unaryFilter.op){case"IS_NAN":var e=De(t.unaryFilter.field);return Ln.create(e,"=="/* EQUAL */,{doubleValue:NaN});case"IS_NULL":var n=De(t.unaryFilter.field);return Ln.create(n,"=="/* EQUAL */,{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":var r=De(t.unaryFilter.field);return Ln.create(r,"!="/* NOT_EQUAL */,{doubleValue:NaN});case"IS_NOT_NULL":var i=De(t.unaryFilter.field);return Ln.create(i,"!="/* NOT_EQUAL */,{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":default:return _();}}function Se(t){var e=[];return t.fields.forEach(function(t){return e.push(t.F());}),{fieldPaths:e};}function Pe(t){// Resource names have at least 4 components (project ID, database ID)
  return t.length>=4&&"projects"===t.get(0)&&"databases"===t.get(2);}/**
   * @license
   * Copyright 2018 Google LLC
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
   */ /** Represents a transform within a TransformMutation. */var Le=function Le(){// Make sure that the structural type of `TransformOperation` is unique.
  // See https://github.com/microsoft/TypeScript/issues/5451
  this.We=void 0;};/**
   * Computes the local transform result against the provided `previousValue`,
   * optionally using the provided localWriteTime.
   */function Oe(t,e,n){return t instanceof Ue?function(t,e){var n={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:t.seconds,nanos:t.nanoseconds}}}};return e&&(n.fields.__previous_value__=e),{mapValue:n};}(n,e):t instanceof Ce?Me(t,e):t instanceof Fe?qe(t,e):function(t,e){// PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
  // precision and resolves overflows by reducing precision, we do not
  // manually cap overflows at 2^63.
  var n=Ve(t,e),r=Ge(n)+Ge(t.qe);return Yt(n)&&Yt(t.qe)?ie(r):oe(t.serializer,r);}(t,e);}/**
   * Computes a final transform result after the transform has been acknowledged
   * by the server, potentially using the server-provided transformResult.
   */function Re(t,e,n){// The server just sends null as the transform result for array operations,
  // so we have to calculate a result the same as we do for local
  // applications.
  return t instanceof Ce?Me(t,e):t instanceof Fe?qe(t,e):n;}/**
   * If this transform operation is not idempotent, returns the base value to
   * persist for this transform. If a base value is returned, the transform
   * operation is always applied to this base value, even if document has
   * already been updated.
   *
   * Base values provide consistent behavior for non-idempotent transforms and
   * allow us to return the same latency-compensated value even if the backend
   * has already applied the transform operation. The base value is null for
   * idempotent transforms, as they can be re-played even if the backend has
   * already applied them.
   *
   * @return a base value to store along with the mutation, or null for
   * idempotent transforms.
   */function Ve(t,e){return t instanceof je?Yt(n=e)||function(t){return !!t&&"doubleValue"in t;}(n)?e:{integerValue:0}:null;var n;}/** Transforms a value into a server-generated timestamp. */var Ue=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends(n,e),n;}(Le),Ce=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).elements=t,n;}return __extends(n,e),n;}(Le);/** Transforms an array value via a union operation. */function Me(t,e){for(var n=Be(e),r=function r(t){n.some(function(e){return jt(e,t);})||n.push(t);},i=0,o=t.elements;i<o.length;i++){r(o[i]);}return {arrayValue:{values:n}};}/** Transforms an array value via a remove operation. */var Fe=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).elements=t,n;}return __extends(n,e),n;}(Le);function qe(t,e){for(var n=Be(e),r=function r(t){n=n.filter(function(e){return !jt(e,t);});},i=0,o=t.elements;i<o.length;i++){r(o[i]);}return {arrayValue:{values:n}};}/**
   * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
   * transforms. Converts all field values to integers or doubles, but unlike the
   * backend does not cap integer values at 2^63. Instead, JavaScript number
   * arithmetic is used and precision loss can occur for values greater than 2^53.
   */var je=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).serializer=t,r.qe=n,r;}return __extends(n,e),n;}(Le);function Ge(t){return Qt(t.integerValue||t.doubleValue);}function Be(t){return $t(t)&&t.arrayValue.values?t.arrayValue.values.slice():[];}/**
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
   */ /**
   * Provides a set of fields that can be used to partially patch a document.
   * FieldMask is used in conjunction with ObjectValue.
   * Examples:
   *   foo - Overwrites foo entirely with the provided value. If foo is not
   *         present in the companion ObjectValue, the field is deleted.
   *   foo.bar - Overwrites only the field bar of the object foo.
   *             If foo is not an object, foo is replaced with an object
   *             containing foo
   */var ze=/** @class */function(){function t(t){this.fields=t,// TODO(dimond): validation of FieldMask
  // Sort the field mask to support `FieldMask.isEqual()` and assert below.
  t.sort(Q$1.P)/**
       * Verifies that `fieldPath` is included by at least one field in this field
       * mask.
       *
       * This is an O(n) operation, where `n` is the size of the field mask.
       */;}return t.prototype.je=function(t){for(var e=0,n=this.fields;e<n.length;e++){if(n[e].D(t))return !0;}return !1;},t.prototype.isEqual=function(t){return L$1(this.fields,t.fields,function(t,e){return t.isEqual(e);});},t;}(),Ke=function Ke(t,e){this.field=t,this.transform=e;};/** A field path and the TransformOperation to perform upon it. */ /** The result of successfully applying a mutation to the backend. */var Xe=function Xe(/**
       * The version at which the mutation was committed:
       *
       * - For most operations, this is the updateTime in the WriteResult.
       * - For deletes, the commitTime of the WriteResponse (because deletes are
       *   not stored and have no updateTime).
       *
       * Note that these versions can be different: No-op writes will not change
       * the updateTime even though the commitTime advances.
       */t,/**
       * The resulting fields returned from the backend after a
       * TransformMutation has been committed. Contains one FieldValue for each
       * FieldTransform that was in the mutation.
       *
       * Will be null if the mutation was not a TransformMutation.
       */e){this.version=t,this.transformResults=e;},Qe=/** @class */function(){function t(t,e){this.updateTime=t,this.exists=e/** Creates a new empty Precondition. */;}return t.Qe=function(){return new t();},/** Creates a new Precondition with an exists flag. */t.exists=function(e){return new t(void 0,e);},/** Creates a new Precondition based on a version a document exists at. */t.updateTime=function(e){return new t(e);},Object.defineProperty(t.prototype,"Be",{/** Returns whether this Precondition is empty. */get:function get(){return void 0===this.updateTime&&void 0===this.exists;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(t){return this.exists===t.exists&&(this.updateTime?!!t.updateTime&&this.updateTime.isEqual(t.updateTime):!t.updateTime);},t;}();/**
   * Encodes a precondition for a mutation. This follows the model that the
   * backend accepts with the special case of an explicit "empty" precondition
   * (meaning no precondition).
   */ /**
   * Returns true if the preconditions is valid for the given document
   * (or null if no document is available).
   */function We(t,e){return void 0!==t.updateTime?e instanceof dn&&e.version.isEqual(t.updateTime):void 0===t.exists||t.exists===e instanceof dn;}/**
   * A mutation describes a self-contained change to a document. Mutations can
   * create, replace, delete, and update subsets of documents.
   *
   * Mutations not only act on the value of the document but also its version.
   *
   * For local mutations (mutations that haven't been committed yet), we preserve
   * the existing version for Set, Patch, and Transform mutations. For Delete
   * mutations, we reset the version to 0.
   *
   * Here's the expected transition table.
   *
   * MUTATION           APPLIED TO            RESULTS IN
   *
   * SetMutation        Document(v3)          Document(v3)
   * SetMutation        NoDocument(v3)        Document(v0)
   * SetMutation        null                  Document(v0)
   * PatchMutation      Document(v3)          Document(v3)
   * PatchMutation      NoDocument(v3)        NoDocument(v3)
   * PatchMutation      null                  null
   * TransformMutation  Document(v3)          Document(v3)
   * TransformMutation  NoDocument(v3)        NoDocument(v3)
   * TransformMutation  null                  null
   * DeleteMutation     Document(v3)          NoDocument(v0)
   * DeleteMutation     NoDocument(v3)        NoDocument(v0)
   * DeleteMutation     null                  NoDocument(v0)
   *
   * For acknowledged mutations, we use the updateTime of the WriteResponse as
   * the resulting version for Set, Patch, and Transform mutations. As deletes
   * have no explicit update time, we use the commitTime of the WriteResponse for
   * Delete mutations.
   *
   * If a mutation is acknowledged by the backend but fails the precondition check
   * locally, we return an `UnknownDocument` and rely on Watch to send us the
   * updated version.
   *
   * Note that TransformMutations don't create Documents (in the case of being
   * applied to a NoDocument), even though they would on the backend. This is
   * because the client always combines the TransformMutation with a SetMutation
   * or PatchMutation and we only want to apply the transform if the prior
   * mutation resulted in a Document (always true for a SetMutation, but not
   * necessarily for a PatchMutation).
   *
   * ## Subclassing Notes
   *
   * Subclasses of Mutation need to implement applyToRemoteDocument() and
   * applyToLocalView() to implement the actual behavior of applying the mutation
   * to some source document.
   */var He=function He(){};/**
   * Applies this mutation to the given MaybeDocument or null for the purposes
   * of computing a new remote document. If the input document doesn't match the
   * expected state (e.g. it is null or outdated), an `UnknownDocument` can be
   * returned.
   *
   * @param mutation The mutation to apply.
   * @param maybeDoc The document to mutate. The input document can be null if
   *     the client has no knowledge of the pre-mutation state of the document.
   * @param mutationResult The result of applying the mutation from the backend.
   * @return The mutated document. The returned document may be an
   *     UnknownDocument if the mutation could not be applied to the locally
   *     cached base document.
   */function Ye(t,e,n){return t instanceof en?function(t,e,n){// Unlike applySetMutationToLocalView, if we're applying a mutation to a
  // remote document the server has accepted the mutation so the precondition
  // must have held.
  return new dn(t.key,n.version,t.value,{hasCommittedMutations:!0});}(t,0,n):t instanceof nn?function(t,e,n){if(!We(t.Ue,e))// Since the mutation was not rejected, we know that the  precondition
  // matched on the backend. We therefore must not have the expected version
  // of the document in our cache and return an UnknownDocument with the
  // known updateTime.
  return new yn(t.key,n.version);var r=rn(t,e);return new dn(t.key,n.version,r,{hasCommittedMutations:!0});}(t,e,n):t instanceof on?function(t,e,n){if(D$1(null!=n.transformResults),!We(t.Ue,e))// Since the mutation was not rejected, we know that the  precondition
  // matched on the backend. We therefore must not have the expected version
  // of the document in our cache and return an UnknownDocument with the
  // known updateTime.
  return new yn(t.key,n.version);var r=sn(t,e),i=/**
   * Creates a list of "transform results" (a transform result is a field value
   * representing the result of applying a transform) for use after a
   * TransformMutation has been acknowledged by the server.
   *
   * @param fieldTransforms The field transforms to apply the result to.
   * @param baseDoc The document prior to applying this mutation batch.
   * @param serverTransformResults The transform results received by the server.
   * @return The transform results list.
   */function(t,e,n){var r=[];D$1(t.length===n.length);for(var i=0;i<n.length;i++){var o=t[i],s=o.transform,u=null;e instanceof dn&&(u=e.field(o.field)),r.push(Re(s,u,n[i]));}return r;}(t.fieldTransforms,e,n.transformResults),o=n.version,s=un(t,r.data(),i);return new dn(t.key,o,s,{hasCommittedMutations:!0});}(t,e,n):function(t,e,n){// Unlike applyToLocalView, if we're applying a mutation to a remote
  // document the server has accepted the mutation so the precondition must
  // have held.
  return new vn(t.key,n.version,{hasCommittedMutations:!0});}(t,0,n);}/**
   * Applies this mutation to the given MaybeDocument or null for the purposes
   * of computing the new local view of a document. Both the input and returned
   * documents can be null.
   *
   * @param mutation The mutation to apply.
   * @param maybeDoc The document to mutate. The input document can be null if
   *     the client has no knowledge of the pre-mutation state of the document.
   * @param baseDoc The state of the document prior to this mutation batch. The
   *     input document can be null if the client has no knowledge of the
   *     pre-mutation state of the document.
   * @param localWriteTime A timestamp indicating the local write time of the
   *     batch this mutation is a part of.
   * @return The mutated document. The returned document may be null, but only
   *     if maybeDoc was null and the mutation would not create a new document.
   */function $e(t,e,n,r){return t instanceof en?function(t,e){if(!We(t.Ue,e))return e;var n=tn(e);return new dn(t.key,n,t.value,{Ke:!0});}(t,e):t instanceof nn?function(t,e){if(!We(t.Ue,e))return e;var n=tn(e),r=rn(t,e);return new dn(t.key,n,r,{Ke:!0});}(t,e):t instanceof on?function(t,e,n,r){if(!We(t.Ue,e))return e;var i=sn(t,e),o=function(t,e,n,r){for(var i=[],o=0,s=t;o<s.length;o++){var u=s[o],a=u.transform,c=null;n instanceof dn&&(c=n.field(u.field)),null===c&&r instanceof dn&&(// If the current document does not contain a value for the mutated
  // field, use the value that existed before applying this mutation
  // batch. This solves an edge case where a PatchMutation clears the
  // values in a nested map before the TransformMutation is applied.
  c=r.field(u.field)),i.push(Oe(a,c,e));}return i;}(t.fieldTransforms,n,e,r),s=un(t,i.data(),o);return new dn(t.key,i.version,s,{Ke:!0});}(t,e,r,n):function(t,e){return We(t.Ue,e)?new vn(t.key,B.min()):e;}(t,e);}/**
   * If this mutation is not idempotent, returns the base value to persist with
   * this mutation. If a base value is returned, the mutation is always applied
   * to this base value, even if document has already been updated.
   *
   * The base value is a sparse object that consists of only the document
   * fields for which this mutation contains a non-idempotent transformation
   * (e.g. a numeric increment). The provided value guarantees consistent
   * behavior for non-idempotent transforms and allow us to return the same
   * latency-compensated value even if the backend has already applied the
   * mutation. The base value is null for idempotent mutations, as they can be
   * re-played even if the backend has already applied them.
   *
   * @return a base value to store along with the mutation, or null for
   * idempotent mutations.
   */function Je(t,e){return t instanceof on?function(t,e){for(var n=null,r=0,i=t.fieldTransforms;r<i.length;r++){var o=i[r],s=e instanceof dn?e.field(o.field):void 0,u=Ve(o.transform,s||null);null!=u&&(n=null==n?new fn().set(o.field,u):n.set(o.field,u));}return n?n.Ge():null;}(t,e):null;}function Ze(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.Ue.isEqual(e.Ue)&&(0/* Set */===t.type?t.value.isEqual(e.value):1/* Patch */===t.type?t.data.isEqual(e.data)&&t.Le.isEqual(e.Le):2/* Transform */!==t.type||L$1(t.fieldTransforms,t.fieldTransforms,function(t,e){return function(t,e){return t.field.isEqual(e.field)&&function(t,e){return t instanceof Ce&&e instanceof Ce||t instanceof Fe&&e instanceof Fe?L$1(t.elements,e.elements,jt):t instanceof je&&e instanceof je?jt(t.qe,e.qe):t instanceof Ue&&e instanceof Ue;}(t.transform,e.transform);}(t,e);}));}/**
   * Returns the version from the given document for use as the result of a
   * mutation. Mutations are defined to return the version of the base document
   * only if it is an existing document. Deleted and unknown documents have a
   * post-mutation version of SnapshotVersion.min().
   */function tn(t){return t instanceof dn?t.version:B.min();}/**
   * A mutation that creates or replaces the document at the given key with the
   * object value contents.
   */var en=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this)||this).key=t,i.value=n,i.Ue=r,i.type=0/* Set */,i;}return __extends(n,e),n;}(He),nn=/** @class */function(e){function n(t,n,r,i){var o=this;return (o=e.call(this)||this).key=t,o.data=n,o.Le=r,o.Ue=i,o.type=1/* Patch */,o;}return __extends(n,e),n;}(He);function rn(t,e){return function(t,e){var n=new fn(e);return t.Le.fields.forEach(function(e){if(!e._()){var r=t.data.field(e);null!==r?n.set(e,r):n.delete(e);}}),n.Ge();}(t,e instanceof dn?e.data():hn.empty());}var on=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).key=t,r.fieldTransforms=n,r.type=2/* Transform */,// NOTE: We set a precondition of exists: true as a safety-check, since we
  // always combine TransformMutations with a SetMutation or PatchMutation which
  // (if successful) should end up with an existing document.
  r.Ue=Qe.exists(!0),r;}return __extends(n,e),n;}(He);function sn(t,e){return e;}function un(t,e,n){for(var r=new fn(e),i=0;i<t.fieldTransforms.length;i++){var o=t.fieldTransforms[i];r.set(o.field,n[i]);}return r.Ge();}/** A mutation that deletes the document at the given key. */var an=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).key=t,r.Ue=n,r.type=3/* Delete */,r;}return __extends(n,e),n;}(He),cn=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).key=t,r.Ue=n,r.type=4/* Verify */,r;}return __extends(n,e),n;}(He),hn=/** @class */function(){function t(t){this.proto=t;}return t.empty=function(){return new t({mapValue:{}});},/**
       * Returns the value at the given path or null.
       *
       * @param path the path to search
       * @return The value at the path or if there it doesn't exist.
       */t.prototype.field=function(t){if(t._())return this.proto;for(var e=this.proto,n=0;n<t.length-1;++n){if(!e.mapValue.fields)return null;if(!te(e=e.mapValue.fields[t.get(n)]))return null;}return (e=(e.mapValue.fields||{})[t.S()])||null;},t.prototype.isEqual=function(t){return jt(this.proto,t.proto);},t;}(),fn=/** @class */function(){/**
       * @param baseObject The object to mutate.
       */function t(t){void 0===t&&(t=hn.empty()),this.ze=t,/** A map that contains the accumulated changes in this builder. */this.He=new Map();}/**
       * Sets the field to the provided value.
       *
       * @param path The field path to set.
       * @param value The value to set.
       * @return The current Builder instance.
       */return t.prototype.set=function(t,e){return this.Ye(t,e),this;},/**
       * Removes the field at the specified path. If there is no field at the
       * specified path, nothing is changed.
       *
       * @param path The field path to remove.
       * @return The current Builder instance.
       */t.prototype.delete=function(t){return this.Ye(t,null),this;},/**
       * Adds `value` to the overlay map at `path`. Creates nested map entries if
       * needed.
       */t.prototype.Ye=function(t,e){for(var n=this.He,r=0;r<t.length-1;++r){var i=t.get(r),o=n.get(i);o instanceof Map?// Re-use a previously created map
  n=o:o&&10/* ObjectValue */===qt(o)?(// Convert the existing Protobuf MapValue into a map
  o=new Map(Object.entries(o.mapValue.fields||{})),n.set(i,o),n=o):(// Create an empty map to represent the current nesting level
  o=new Map(),n.set(i,o),n=o);}n.set(t.S(),e);},/** Returns an ObjectValue with all mutations applied. */t.prototype.Ge=function(){var t=this.Je(Q$1.$(),this.He);return null!=t?new hn(t):this.ze;},/**
       * Applies any overlays from `currentOverlays` that exist at `currentPath`
       * and returns the merged data at `currentPath` (or null if there were no
       * changes).
       *
       * @param currentPath The path at the current nesting level. Can be set to
       * FieldValue.emptyPath() to represent the root.
       * @param currentOverlays The overlays at the current nesting level in the
       * same format as `overlayMap`.
       * @return The merged data at `currentPath` or null if no modifications
       * were applied.
       */t.prototype.Je=function(t,e){var n=this,r=!1,i=this.ze.field(t),o=te(i)?// If there is already data at the current path, base our
  Object.assign({},i.mapValue.fields):{};return e.forEach(function(e,i){if(e instanceof Map){var s=n.Je(t.child(i),e);null!=s&&(o[i]=s,r=!0);}else null!==e?(o[i]=e,r=!0):o.hasOwnProperty(i)&&(delete o[i],r=!0);}),r?{mapValue:{fields:o}}:null;},t;}();/**
   * Returns a FieldMask built from all fields in a MapValue.
   */function ln(t){var e=[];return C$1(t.fields||{},function(t,n){var r=new Q$1([t]);if(te(n)){var i=ln(n.mapValue).fields;if(0===i.length)// Preserve the empty map by adding it to the FieldMask.
  e.push(r);else// For nested and non-empty ObjectValues, add the FieldPath of the
  // leaf nodes.
  for(var o=0,s=i;o<s.length;o++){var u=s[o];e.push(r.child(u));}}else// For nested and non-empty ObjectValues, add the FieldPath of the leaf
  // nodes.
  e.push(r);}),new ze(e)/**
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
   */ /**
   * The result of a lookup for a given path may be an existing document or a
   * marker that this document does not exist at a given version.
   */;}var pn=function pn(t,e){this.key=t,this.version=e;},dn=/** @class */function(e){function n(t,n,r,i){var o=this;return (o=e.call(this,t,n)||this).Xe=r,o.Ke=!!i.Ke,o.hasCommittedMutations=!!i.hasCommittedMutations,o;}return __extends(n,e),n.prototype.field=function(t){return this.Xe.field(t);},n.prototype.data=function(){return this.Xe;},n.prototype.Ze=function(){return this.Xe.proto;},n.prototype.isEqual=function(t){return t instanceof n&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.Ke===t.Ke&&this.hasCommittedMutations===t.hasCommittedMutations&&this.Xe.isEqual(t.Xe);},n.prototype.toString=function(){return "Document("+this.key+", "+this.version+", "+this.Xe.toString()+", {hasLocalMutations: "+this.Ke+"}), {hasCommittedMutations: "+this.hasCommittedMutations+"})";},Object.defineProperty(n.prototype,"hasPendingWrites",{get:function get(){return this.Ke||this.hasCommittedMutations;},enumerable:!1,configurable:!0}),n;}(pn),vn=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this,t,n)||this).hasCommittedMutations=!(!r||!r.hasCommittedMutations),i;}return __extends(n,e),n.prototype.toString=function(){return "NoDocument("+this.key+", "+this.version+")";},Object.defineProperty(n.prototype,"hasPendingWrites",{get:function get(){return this.hasCommittedMutations;},enumerable:!1,configurable:!0}),n.prototype.isEqual=function(t){return t instanceof n&&t.hasCommittedMutations===this.hasCommittedMutations&&t.version.isEqual(this.version)&&t.key.isEqual(this.key);},n;}(pn),yn=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends(n,e),n.prototype.toString=function(){return "UnknownDocument("+this.key+", "+this.version+")";},Object.defineProperty(n.prototype,"hasPendingWrites",{get:function get(){return !0;},enumerable:!1,configurable:!0}),n.prototype.isEqual=function(t){return t instanceof n&&t.version.isEqual(this.version)&&t.key.isEqual(this.key);},n;}(pn);/**
   * Represents a document in Firestore with a key, version, data and whether the
   * data has local mutations applied to it.
   */ /**
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
   */ /**
   * Casts `obj` to `T`. Throws if  `obj` is not an instance of `T`.
   *
   * This cast is used in the Lite and Full SDK to verify instance types for
   * arguments passed to the public API.
   */function mn(t,// eslint-disable-next-line @typescript-eslint/no-explicit-any
  e){if(!(t instanceof e))throw e.name===t.constructor.name?new j(q$1.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass '"+e.name+"' from a different Firestore SDK?"):new j(q$1.INVALID_ARGUMENT,"Expected type '"+e.name+"', but was '"+t.constructor.name+"'");return t;}/**
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
   */ /**
   * Query encapsulates all the query attributes we support in the SDK. It can
   * be run against the LocalStore, as well as be converted to a `Target` to
   * query the RemoteStore results.
   *
   * Visible for testing.
   */var gn=/** @class */function(){/**
       * Initializes a Query with a path and optional additional query constraints.
       * Path must currently be empty if this is a collection group query.
       */function t(t,e,n,r,i,o/* First */,s,u){void 0===e&&(e=null),void 0===n&&(n=[]),void 0===r&&(r=[]),void 0===i&&(i=null),void 0===o&&(o="F"),void 0===s&&(s=null),void 0===u&&(u=null),this.path=t,this.collectionGroup=e,this.tn=n,this.filters=r,this.limit=i,this.en=o,this.startAt=s,this.endAt=u,this.nn=null,// The corresponding `Target` of this `Query` instance.
  this.sn=null,this.startAt,this.endAt;}/**
       * Helper to convert a collection group query into a collection query at a
       * specific path. This is used when executing collection group queries, since
       * we have to split the query into a set of collection queries at multiple
       * paths.
       */return t.prototype.rn=function(e){return new t(e,/*collectionGroup=*/null,this.tn.slice(),this.filters.slice(),this.limit,this.en,this.startAt,this.endAt);},t.prototype.on=function(){return 0===this.filters.length&&null===this.limit&&null==this.startAt&&null==this.endAt&&(0===this.tn.length||1===this.tn.length&&this.tn[0].field.O());},t.prototype.hn=function(){return !H$1(this.limit)&&"F"/* First */===this.en;},t.prototype.an=function(){return !H$1(this.limit)&&"L"/* Last */===this.en;},t.prototype.un=function(){return this.tn.length>0?this.tn[0].field:null;},t.prototype.cn=function(){for(var t=0,e=this.filters;t<e.length;t++){var n=e[t];if(n.ln())return n.field;}return null;},t.prototype._n=function(t){for(var e=0,n=this.filters;e<n.length;e++){var r=n[e];if(t.indexOf(r.op)>=0)return r.op;}return null;},t;}();/** Creates a new Query instance with the options provided. */function wn(t,e,n,r,i,o,s,u){return new gn(t,e,n,r,i,o,s,u);}/** Creates a new Query for a query that matches all documents at `path` */function bn(t){return new gn(t);}/**
   * Creates a new Query for a collection group query that matches all documents
   * within the provided collection group.
   */ /**
   * Returns whether the query matches a collection group rather than a specific
   * collection.
   */function In(t){return null!==t.collectionGroup;}/**
   * Returns the implicit order by constraint that is used to execute the Query,
   * which can be different from the order by constraints the user provided (e.g.
   * the SDK and backend always orders by `__name__`).
   */function En(t){var e=mn(t,gn);if(null===e.nn){e.nn=[];var n=e.cn(),r=e.un();if(null!==n&&null===r)// In order to implicitly add key ordering, we must also add the
  // inequality filter field for it to be a valid query.
  // Note that the default inequality field and key ordering is ascending.
  n.O()||e.nn.push(new Kn(n)),e.nn.push(new Kn(Q$1.L(),"asc"/* ASCENDING */));else {for(var i=!1,o=0,s=e.tn;o<s.length;o++){var u=s[o];e.nn.push(u),u.field.O()&&(i=!0);}if(!i){// The order of the implicit key ordering always matches the last
  // explicit order by
  var a=e.tn.length>0?e.tn[e.tn.length-1].dir:"asc"/* ASCENDING */;e.nn.push(new Kn(Q$1.L(),a));}}}return e.nn;}/**
   * Converts this `Query` instance to it's corresponding `Target` representation.
   */function Tn(t){var e=mn(t,gn);if(!e.sn)if("F"/* First */===e.en)e.sn=Z$1(e.path,e.collectionGroup,En(e),e.filters,e.limit,e.startAt,e.endAt);else {for(// Flip the orderBy directions since we want the last results
  var n=[],r=0,i=En(e);r<i.length;r++){var o=i[r],s="desc"/* DESCENDING */===o.dir?"asc"/* ASCENDING */:"desc"/* DESCENDING */;n.push(new Kn(o.field,s));}// We need to swap the cursors to match the now-flipped query ordering.
  var u=e.endAt?new jn(e.endAt.position,!e.endAt.before):null,a=e.startAt?new jn(e.startAt.position,!e.startAt.before):null;// Now return as a LimitType.First query.
  e.sn=Z$1(e.path,e.collectionGroup,n,e.filters,e.limit,u,a);}return e.sn;}function Nn(t,e,n){return new gn(t.path,t.collectionGroup,t.tn.slice(),t.filters.slice(),e,n,t.startAt,t.endAt);}function An(t,e){return new gn(t.path,t.collectionGroup,t.tn.slice(),t.filters.slice(),t.limit,t.en,e,t.endAt);}function _n(t,e){return new gn(t.path,t.collectionGroup,t.tn.slice(),t.filters.slice(),t.limit,t.en,t.startAt,e);}function Dn(t,e){return et(Tn(t),Tn(e))&&t.en===e.en;}// TODO(b/29183165): This is used to get a unique string from a query to, for
  // example, use as a dictionary key, but the implementation is subject to
  // collisions. Make it collision-free.
  function kn(t){return tt(Tn(t))+"|lt:"+t.en;}function xn(t){return "Query(target="+function(t){var e=t.path.F();return null!==t.collectionGroup&&(e+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(e+=", filters: ["+t.filters.map(function(t){return (e=t).field.F()+" "+e.op+" "+Kt(e.value);/** Returns a debug description for `filter`. */var e;/** Filter that matches on key fields (i.e. '__name__'). */}).join(", ")+"]"),H$1(t.limit)||(e+=", limit: "+t.limit),t.orderBy.length>0&&(e+=", orderBy: ["+t.orderBy.map(function(t){return (e=t).field.F()+" ("+e.dir+")";var e;}).join(", ")+"]"),t.startAt&&(e+=", startAt: "+Gn(t.startAt)),t.endAt&&(e+=", endAt: "+Gn(t.endAt)),"Target("+e+")";}(Tn(t))+"; limitType="+t.en+")";}/** Returns whether `doc` matches the constraints of `query`. */function Sn(t,e){return function(t,e){var n=e.key.path;return null!==t.collectionGroup?e.key.U(t.collectionGroup)&&t.path.D(n):W$1.W(t.path)?t.path.isEqual(n):t.path.C(n);}(t,e)&&function(t,e){for(var n=0,r=t.tn;n<r.length;n++){var i=r[n];// order by key always matches
  if(!i.field.O()&&null===e.field(i.field))return !1;}return !0;}(t,e)&&function(t,e){for(var n=0,r=t.filters;n<r.length;n++){if(!r[n].matches(e))return !1;}return !0;}(t,e)&&function(t,e){return !(t.startAt&&!Bn(t.startAt,En(t),e))&&(!t.endAt||!Bn(t.endAt,En(t),e));}(t,e);}function Pn(t){return function(e,n){for(var r=!1,i=0,o=En(t);i<o.length;i++){var s=o[i],u=Xn(s,e,n);if(0!==u)return u;r=r||s.field.O();}return 0;};}var Ln=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this)||this).field=t,i.op=n,i.value=r,i;}/**
       * Creates a filter based on the provided arguments.
       */return __extends(n,e),n.create=function(t,e,r){if(t.O())return "in"/* IN */===e||"not-in"/* NOT_IN */===e?this.fn(t,e,r):new On(t,e,r);if(Jt(r)){if("=="/* EQUAL */!==e&&"!="/* NOT_EQUAL */!==e)// TODO(ne-queries): Update error message to include != comparison.
  throw new j(q$1.INVALID_ARGUMENT,"Invalid query. Null supports only equality comparisons.");return new n(t,e,r);}if(Zt(r)){if("=="/* EQUAL */!==e&&"!="/* NOT_EQUAL */!==e)// TODO(ne-queries): Update error message to include != comparison.
  throw new j(q$1.INVALID_ARGUMENT,"Invalid query. NaN supports only equality comparisons.");return new n(t,e,r);}return "array-contains"/* ARRAY_CONTAINS */===e?new Cn(t,r):"in"/* IN */===e?new Mn(t,r):"not-in"/* NOT_IN */===e?new Fn(t,r):"array-contains-any"/* ARRAY_CONTAINS_ANY */===e?new qn(t,r):new n(t,e,r);},n.fn=function(t,e,n){return "in"/* IN */===e?new Rn(t,n):new Vn(t,n);},n.prototype.matches=function(t){var e=t.field(this.field);// Types do not have to match in NOT_EQUAL filters.
  return "!="/* NOT_EQUAL */===this.op?null!==e&&this.dn(Bt(e,this.value)):null!==e&&qt(this.value)===qt(e)&&this.dn(Bt(e,this.value));// Only compare types with matching backend order (such as double and int).
  },n.prototype.dn=function(t){switch(this.op){case"<"/* LESS_THAN */:return t<0;case"<="/* LESS_THAN_OR_EQUAL */:return t<=0;case"=="/* EQUAL */:return 0===t;case"!="/* NOT_EQUAL */:return 0!==t;case">"/* GREATER_THAN */:return t>0;case">="/* GREATER_THAN_OR_EQUAL */:return t>=0;default:return _();}},n.prototype.ln=function(){return ["<"/* LESS_THAN */,"<="/* LESS_THAN_OR_EQUAL */,">"/* GREATER_THAN */,">="/* GREATER_THAN_OR_EQUAL */,"!="/* NOT_EQUAL */].indexOf(this.op)>=0;},n;}(function(){});var On=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this,t,n,r)||this).key=W$1.B(r.referenceValue),i;}return __extends(n,e),n.prototype.matches=function(t){var e=W$1.P(t.key,this.key);return this.dn(e);},n;}(Ln),Rn=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this,t,"in"/* IN */,n)||this).keys=Un("in"/* IN */,n),r;}return __extends(n,e),n.prototype.matches=function(t){return this.keys.some(function(e){return e.isEqual(t.key);});},n;}(Ln),Vn=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this,t,"not-in"/* NOT_IN */,n)||this).keys=Un("not-in"/* NOT_IN */,n),r;}return __extends(n,e),n.prototype.matches=function(t){return !this.keys.some(function(e){return e.isEqual(t.key);});},n;}(Ln);/** Filter that matches on key fields within an array. */function Un(t,e){var n;return ((null===(n=e.arrayValue)||void 0===n?void 0:n.values)||[]).map(function(t){return W$1.B(t.referenceValue);});}/** A Filter that implements the array-contains operator. */var Cn=/** @class */function(e){function n(t,n){return e.call(this,t,"array-contains"/* ARRAY_CONTAINS */,n)||this;}return __extends(n,e),n.prototype.matches=function(t){var e=t.field(this.field);return $t(e)&&Gt(e.arrayValue,this.value);},n;}(Ln),Mn=/** @class */function(e){function n(t,n){return e.call(this,t,"in"/* IN */,n)||this;}return __extends(n,e),n.prototype.matches=function(t){var e=t.field(this.field);return null!==e&&Gt(this.value.arrayValue,e);},n;}(Ln),Fn=/** @class */function(e){function n(t,n){return e.call(this,t,"not-in"/* NOT_IN */,n)||this;}return __extends(n,e),n.prototype.matches=function(t){var e=t.field(this.field);return null!==e&&!Gt(this.value.arrayValue,e);},n;}(Ln),qn=/** @class */function(e){function n(t,n){return e.call(this,t,"array-contains-any"/* ARRAY_CONTAINS_ANY */,n)||this;}return __extends(n,e),n.prototype.matches=function(t){var e=this,n=t.field(this.field);return !(!$t(n)||!n.arrayValue.values)&&n.arrayValue.values.some(function(t){return Gt(e.value.arrayValue,t);});},n;}(Ln),jn=function jn(t,e){this.position=t,this.before=e;};/** A Filter that implements the IN operator. */function Gn(t){// TODO(b/29183165): Make this collision robust.
  return (t.before?"b":"a")+":"+t.position.map(function(t){return Kt(t);}).join(",");}/**
   * Returns true if a document sorts before a bound using the provided sort
   * order.
   */function Bn(t,e,n){for(var r=0,i=0;i<t.position.length;i++){var o=e[i],s=t.position[i];if(r=o.field.O()?W$1.P(W$1.B(s.referenceValue),n.key):Bt(s,n.field(o.field)),"desc"/* DESCENDING */===o.dir&&(r*=-1),0!==r)break;}return t.before?r<=0:r<0;}function zn(t,e){if(null===t)return null===e;if(null===e)return !1;if(t.before!==e.before||t.position.length!==e.position.length)return !1;for(var n=0;n<t.position.length;n++){if(!jt(t.position[n],e.position[n]))return !1;}return !0;}/**
   * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
   */var Kn=function Kn(t,e/* ASCENDING */){void 0===e&&(e="asc"),this.field=t,this.dir=e;};function Xn(t,e,n){var r=t.field.O()?W$1.P(e.key,n.key):function(t,e,n){var r=e.field(t),i=n.field(t);return null!==r&&null!==i?Bt(r,i):_();}(t.field,e,n);switch(t.dir){case"asc"/* ASCENDING */:return r;case"desc"/* DESCENDING */:return -1*r;default:return _();}}function Qn(t,e){return t.dir===e.dir&&t.field.isEqual(e.field);}/**
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
   */ /**
   * A batch of mutations that will be sent as one unit to the backend.
   */var Wn=/** @class */function(){/**
       * @param batchId The unique ID of this mutation batch.
       * @param localWriteTime The original write time of this mutation.
       * @param baseMutations Mutations that are used to populate the base
       * values when this mutation is applied locally. This can be used to locally
       * overwrite values that are persisted in the remote document cache. Base
       * mutations are never sent to the backend.
       * @param mutations The user-provided mutations in this mutation batch.
       * User-provided mutations are applied both locally and remotely on the
       * backend.
       */function t(t,e,n,r){this.batchId=t,this.wn=e,this.baseMutations=n,this.mutations=r/**
       * Applies all the mutations in this MutationBatch to the specified document
       * to create a new remote document
       *
       * @param docKey The key of the document to apply mutations to.
       * @param maybeDoc The document to apply mutations to.
       * @param batchResult The result of applying the MutationBatch to the
       * backend.
       */;}return t.prototype.Tn=function(t,e,n){for(var r=n.En,i=0;i<this.mutations.length;i++){var o=this.mutations[i];o.key.isEqual(t)&&(e=Ye(o,e,r[i]));}return e;},/**
       * Computes the local view of a document given all the mutations in this
       * batch.
       *
       * @param docKey The key of the document to apply mutations to.
       * @param maybeDoc The document to apply mutations to.
       */t.prototype.In=function(t,e){// First, apply the base state. This allows us to apply non-idempotent
  // transform against a consistent set of values.
  for(var n=0,r=this.baseMutations;n<r.length;n++){var i=r[n];i.key.isEqual(t)&&(e=$e(i,e,e,this.wn));}// Second, apply all user-provided mutations.
  for(var o=e,s=0,u=this.mutations;s<u.length;s++){var a=u[s];a.key.isEqual(t)&&(e=$e(a,e,o,this.wn));}return e;},/**
       * Computes the local view for all provided documents given the mutations in
       * this batch.
       */t.prototype.mn=function(t){var e=this,n=t;// TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
  // directly (as done in `applyToLocalView()`), we can reduce the complexity
  // to O(n).
  return this.mutations.forEach(function(r){var i=e.In(r.key,t.get(r.key));i&&(n=n.nt(r.key,i));}),n;},t.prototype.keys=function(){return this.mutations.reduce(function(t,e){return t.add(e.key);},Et());},t.prototype.isEqual=function(t){return this.batchId===t.batchId&&L$1(this.mutations,t.mutations,function(t,e){return Ze(t,e);})&&L$1(this.baseMutations,t.baseMutations,function(t,e){return Ze(t,e);});},t;}(),Hn=/** @class */function(){function t(t,e,n,/**
       * A pre-computed mapping from each mutated document to the resulting
       * version.
       */r){this.batch=t,this.An=e,this.En=n,this.Rn=r/**
       * Creates a new MutationBatchResult for the given batch and results. There
       * must be one result for each mutation in the batch. This static factory
       * caches a document=>version mapping (docVersions).
       */;}return t.from=function(e,n,r){D$1(e.mutations.length===r.length);for(var i=bt,o=e.mutations,s=0;s<o.length;s++){i=i.nt(o[s].key,r[s].version);}return new t(e,n,r,i);},t;}(),Yn=/** @class */function(){function t(t){var e=this;// NOTE: next/catchCallback will always point to our own wrapper functions,
  // not the user's raw next() or catch() callbacks.
  this.Pn=null,this.Vn=null,// When the operation resolves, we'll set result or error and mark isDone.
  this.result=void 0,this.error=void 0,this.gn=!1,// Set to true when .then() or .catch() are called and prevents additional
  // chaining.
  this.yn=!1,t(function(t){e.gn=!0,e.result=t,e.Pn&&// value should be defined unless T is Void, but we can't express
  // that in the type system.
  e.Pn(t);},function(t){e.gn=!0,e.error=t,e.Vn&&e.Vn(t);});}return t.prototype.catch=function(t){return this.next(void 0,t);},t.prototype.next=function(e,n){var r=this;return this.yn&&_(),this.yn=!0,this.gn?this.error?this.pn(n,this.error):this.bn(e,this.result):new t(function(t,i){r.Pn=function(n){r.bn(e,n).next(t,i);},r.Vn=function(e){r.pn(n,e).next(t,i);};});},t.prototype.vn=function(){var t=this;return new Promise(function(e,n){t.next(e,n);});},t.prototype.Sn=function(e){try{var n=e();return n instanceof t?n:t.resolve(n);}catch(e){return t.reject(e);}},t.prototype.bn=function(e,n){return e?this.Sn(function(){return e(n);}):t.resolve(n);},t.prototype.pn=function(e,n){return e?this.Sn(function(){return e(n);}):t.reject(n);},t.resolve=function(e){return new t(function(t,n){t(e);});},t.reject=function(e){return new t(function(t,n){n(e);});},t.Dn=function(// Accept all Promise types in waitFor().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e){return new t(function(t,n){var r=0,i=0,o=!1;e.forEach(function(e){++r,e.next(function(){++i,o&&i===r&&t();},function(t){return n(t);});}),o=!0,i===r&&t();});},/**
       * Given an array of predicate functions that asynchronously evaluate to a
       * boolean, implements a short-circuiting `or` between the results. Predicates
       * will be evaluated until one of them returns `true`, then stop. The final
       * result will be whether any of them returned `true`.
       */t.Cn=function(e){for(var n=t.resolve(!1),r=function r(e){n=n.next(function(n){return n?t.resolve(n):e();});},i=0,o=e;i<o.length;i++){r(o[i]);}return n;},t.forEach=function(t,e){var n=this,r=[];return t.forEach(function(t,i){r.push(e.call(n,t,i));}),this.Dn(r);},t;}(),$n=/** @class */function(){function t(){// A mapping of document key to the new cache entry that should be written (or null if any
  // existing cache entry should be removed).
  this.Nn=new F$1(function(t){return t.toString();},function(t,e){return t.isEqual(e);}),this.Fn=!1;}return Object.defineProperty(t.prototype,"readTime",{get:function get(){return this.kn;},set:function set(t){this.kn=t;},enumerable:!1,configurable:!0}),/**
       * Buffers a `RemoteDocumentCache.addEntry()` call.
       *
       * You can only modify documents that have already been retrieved via
       * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
       */t.prototype.xn=function(t,e){this.$n(),this.readTime=e,this.Nn.set(t.key,t);},/**
       * Buffers a `RemoteDocumentCache.removeEntry()` call.
       *
       * You can only remove documents that have already been retrieved via
       * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
       */t.prototype.Mn=function(t,e){this.$n(),e&&(this.readTime=e),this.Nn.set(t,null);},/**
       * Looks up an entry in the cache. The buffered changes will first be checked,
       * and if no buffered change applies, this will forward to
       * `RemoteDocumentCache.getEntry()`.
       *
       * @param transaction The transaction in which to perform any persistence
       *     operations.
       * @param documentKey The key of the entry to look up.
       * @return The cached Document or NoDocument entry, or null if we have nothing
       * cached.
       */t.prototype.On=function(t,e){this.$n();var n=this.Nn.get(e);return void 0!==n?Yn.resolve(n):this.Ln(t,e);},/**
       * Looks up several entries in the cache, forwarding to
       * `RemoteDocumentCache.getEntry()`.
       *
       * @param transaction The transaction in which to perform any persistence
       *     operations.
       * @param documentKeys The keys of the entries to look up.
       * @return A map of cached `Document`s or `NoDocument`s, indexed by key. If an
       *     entry cannot be found, the corresponding key will be mapped to a null
       *     value.
       */t.prototype.getEntries=function(t,e){return this.qn(t,e);},/**
       * Applies buffered changes to the underlying RemoteDocumentCache, using
       * the provided transaction.
       */t.prototype.apply=function(t){return this.$n(),this.Fn=!0,this.Bn(t);},/** Helper to assert this.changes is not null  */t.prototype.$n=function(){},t;}(),Jn="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.",Zn=/** @class */function(){function t(){this.Un=[];}return t.prototype.Qn=function(t){this.Un.push(t);},t.prototype.Wn=function(){this.Un.forEach(function(t){return t();});},t;}(),tr=/** @class */function(){function t(t,e,n){this.jn=t,this.Kn=e,this.Gn=n/**
       * Get the local view of the document identified by `key`.
       *
       * @return Local view of the document or null if we don't have any cached
       * state for it.
       */;}return t.prototype.zn=function(t,e){var n=this;return this.Kn.Hn(t,e).next(function(r){return n.Yn(t,e,r);});},/** Internal version of `getDocument` that allows reusing batches. */t.prototype.Yn=function(t,e,n){return this.jn.On(t,e).next(function(t){for(var r=0,i=n;r<i.length;r++){t=i[r].In(e,t);}return t;});},// Returns the view of the given `docs` as they would appear after applying
  // all mutations in the given `batches`.
  t.prototype.Jn=function(t,e,n){var r=mt();return e.forEach(function(t,e){for(var i=0,o=n;i<o.length;i++){e=o[i].In(t,e);}r=r.nt(t,e);}),r;},/**
       * Gets the local view of the documents identified by `keys`.
       *
       * If we don't have cached state for a document in `keys`, a NoDocument will
       * be stored for that key in the resulting set.
       */t.prototype.Xn=function(t,e){var n=this;return this.jn.getEntries(t,e).next(function(e){return n.Zn(t,e);});},/**
       * Similar to `getDocuments`, but creates the local view from the given
       * `baseDocs` without retrieving documents from the local store.
       */t.prototype.Zn=function(t,e){var n=this;return this.Kn.ts(t,e).next(function(r){var i=n.Jn(t,e,r),o=yt();return i.forEach(function(t,e){// TODO(http://b/32275378): Don't conflate missing / deleted.
  e||(e=new vn(t,B.min())),o=o.nt(t,e);}),o;});},/**
       * Performs a query against the local view of all documents.
       *
       * @param transaction The persistence transaction.
       * @param query The query to match documents against.
       * @param sinceReadTime If not set to SnapshotVersion.min(), return only
       *     documents that have been read since this snapshot version (exclusive).
       */t.prototype.es=function(t,e,n){/**
   * Returns whether the query matches a single document by path (rather than a
   * collection).
   */return function(t){return W$1.W(t.path)&&null===t.collectionGroup&&0===t.filters.length;}(e)?this.ns(t,e.path):In(e)?this.ss(t,e,n):this.rs(t,e,n);},t.prototype.ns=function(t,e){// Just do a simple document lookup.
  return this.zn(t,new W$1(e)).next(function(t){var e=wt();return t instanceof dn&&(e=e.nt(t.key,t)),e;});},t.prototype.ss=function(t,e,n){var r=this,i=e.collectionGroup,o=wt();return this.Gn.os(t,i).next(function(s){return Yn.forEach(s,function(s){var u=e.rn(s.child(i));return r.rs(t,u,n).next(function(t){t.forEach(function(t,e){o=o.nt(t,e);});});}).next(function(){return o;});});},t.prototype.rs=function(t,e,n){var r,i,o=this;// Query the remote documents and overlay mutations.
  return this.jn.es(t,e,n).next(function(n){return r=n,o.Kn.hs(t,e);}).next(function(e){return i=e,o.as(t,i,r).next(function(t){r=t;for(var e=0,n=i;e<n.length;e++){for(var o=n[e],s=0,u=o.mutations;s<u.length;s++){var a=u[s],c=a.key,h=r.get(c),f=$e(a,h,h,o.wn);r=f instanceof dn?r.nt(c,f):r.remove(c);}}});}).next(function(){// Finally, filter out any documents that don't actually match
  // the query.
  return r.forEach(function(t,n){Sn(e,n)||(r=r.remove(t));}),r;});},t.prototype.as=function(t,e,n){for(var r=Et(),i=0,o=e;i<o.length;i++){for(var s=0,u=o[i].mutations;s<u.length;s++){var a=u[s];a instanceof nn&&null===n.get(a.key)&&(r=r.add(a.key));}}var c=n;return this.jn.getEntries(t,r).next(function(t){return t.forEach(function(t,e){null!==e&&e instanceof dn&&(c=c.nt(t,e));}),c;});},t;}(),er=/** @class */function(){function t(t,e,n,r){this.targetId=t,this.fromCache=e,this.us=n,this.cs=r;}return t.ls=function(e,n){for(var r=Et(),i=Et(),o=0,s=n.docChanges;o<s.length;o++){var u=s[o];switch(u.type){case 0/* Added */:r=r.add(u.doc.key);break;case 1/* Removed */:i=i.add(u.doc.key);// do nothing
  }}return new t(e,n.fromCache,r,i);},t;}(),nr=/** @class */function(){function t(t,e){var n=this;this.previousValue=t,e&&(e._s=function(t){return n.fs(t);},this.ds=function(t){return e.ws(t);});}return t.prototype.fs=function(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue;},t.prototype.next=function(){var t=++this.previousValue;return this.ds&&this.ds(t),t;},t;}();/** The result of applying a mutation batch to the backend. */nr.Ts=-1;/**
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
   */var rr=function rr(){var t=this;this.promise=new Promise(function(e,n){t.resolve=e,t.reject=n;});},ir=/** @class */function(){function t(/**
       * The AsyncQueue to run backoff operations on.
       */t,/**
       * The ID to use when scheduling backoff operations on the AsyncQueue.
       */e,/**
       * The initial delay (used as the base delay on the first retry attempt).
       * Note that jitter will still be applied, so the actual delay could be as
       * little as 0.5*initialDelayMs.
       */n/**
       * The multiplier to use to determine the extended base delay after each
       * attempt.
       */,r/**
       * The maximum base delay after which no further backoff is performed.
       * Note that jitter will still be applied, so the actual delay could be as
       * much as 1.5*maxDelayMs.
       */,i){void 0===n&&(n=1e3),void 0===r&&(r=1.5),void 0===i&&(i=6e4),this.Es=t,this.Is=e,this.ms=n,this.As=r,this.Rs=i,this.Ps=0,this.Vs=null,/** The last backoff attempt, as epoch milliseconds. */this.gs=Date.now(),this.reset();}/**
       * Resets the backoff delay.
       *
       * The very next backoffAndWait() will have no delay. If it is called again
       * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
       * subsequent ones will increase according to the backoffFactor.
       */return t.prototype.reset=function(){this.Ps=0;},/**
       * Resets the backoff delay to the maximum delay (e.g. for use after a
       * RESOURCE_EXHAUSTED error).
       */t.prototype.ys=function(){this.Ps=this.Rs;},/**
       * Returns a promise that resolves after currentDelayMs, and increases the
       * delay for any subsequent attempts. If there was a pending backoff operation
       * already, it will be canceled.
       */t.prototype.ps=function(t){var e=this;// Cancel any pending backoff operation.
  this.cancel();// First schedule using the current base (which may be 0 and should be
  // honored as such).
  var n=Math.floor(this.Ps+this.bs()),r=Math.max(0,Date.now()-this.gs),i=Math.max(0,n-r);// Guard against lastAttemptTime being in the future due to a clock change.
  i>0&&E$1("ExponentialBackoff","Backing off for "+i+" ms (base delay: "+this.Ps+" ms, delay with jitter: "+n+" ms, last attempt: "+r+" ms ago)"),this.Vs=this.Es.vs(this.Is,i,function(){return e.gs=Date.now(),t();}),// Apply backoff factor to determine next delay and ensure it is within
  // bounds.
  this.Ps*=this.As,this.Ps<this.ms&&(this.Ps=this.ms),this.Ps>this.Rs&&(this.Ps=this.Rs);},t.prototype.Ss=function(){null!==this.Vs&&(this.Vs.Ds(),this.Vs=null);},t.prototype.cancel=function(){null!==this.Vs&&(this.Vs.cancel(),this.Vs=null);},/** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */t.prototype.bs=function(){return (Math.random()-.5)*this.Ps;},t;}(),or=/** @class */function(){/*
       * Creates a new SimpleDb wrapper for IndexedDb database `name`.
       *
       * Note that `version` must not be a downgrade. IndexedDB does not support
       * downgrading the schema version. We currently do not support any way to do
       * versioning outside of IndexedDB's versioning mechanism, as only
       * version-upgrade transactions are allowed to do things like create
       * objectstores.
       */function t(e,n,r){this.name=e,this.version=n,this.Cs=r,// NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
  // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
  // whatever reason it's much harder to hit after 12.2 so we only proactively
  // log on 12.2.
  12.2===t.Ns(getUA())&&T$1("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");}/** Deletes the specified database. */return t.delete=function(t){return E$1("SimpleDb","Removing database:",t),fr(window.indexedDB.deleteDatabase(t)).vn();},/** Returns true if IndexedDB is available in the current environment. */t.Fs=function(){if("undefined"==typeof indexedDB)return !1;if(t.ks())return !0;// We extensively use indexed array values and compound keys,
  // which IE and Edge do not support. However, they still have indexedDB
  // defined on the window, so we need to check for them here and make sure
  // to return that persistence is not enabled for those browsers.
  // For tracking support of this feature, see here:
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
  // Check the UA string to find out the browser.
  var e=getUA(),n=t.Ns(e),r=0<n&&n<10,i=t.xs(e),o=0<i&&i<4.5;// IE 10
  // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
  // IE 11
  // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
  // Edge
  // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML,
  // like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';
  // iOS Safari: Disable for users running iOS version < 10.
  return !(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||r||o);},/**
       * Returns true if the backing IndexedDB store is the Node IndexedDBShim
       * (see https://github.com/axemclion/IndexedDBShim).
       */t.ks=function(){var t;return "undefined"!=typeof process&&"YES"===(null===(t=process.env)||void 0===t?void 0:t.$s);},/** Helper to get a typed SimpleDbStore from a transaction. */t.Ms=function(t,e){return t.store(e);},// visible for testing
  /** Parse User Agent to determine iOS version. Returns -1 if not found. */t.Ns=function(t){var e=t.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=e?e[1].split("_").slice(0,2).join("."):"-1";return Number(n);},// visible for testing
  /** Parse User Agent to determine Android version. Returns -1 if not found. */t.xs=function(t){var e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n);},/**
       * Opens the specified database, creating or upgrading it if necessary.
       */t.prototype.Os=function(){return __awaiter$1(this,void 0,void 0,function(){var t,e=this;return __generator$1(this,function(n){switch(n.label){case 0:return this.db?[3/*break*/,2]:(E$1("SimpleDb","Opening database:",this.name),t=this,[4/*yield*/,new Promise(function(t,n){// TODO(mikelehen): Investigate browser compatibility.
  // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  // suggests IE9 and older WebKit browsers handle upgrade
  // differently. They expect setVersion, as described here:
  // https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeRequest/setVersion
  var r=indexedDB.open(e.name,e.version);r.onsuccess=function(e){var n=e.target.result;t(n);},r.onblocked=function(){n(new ur("Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));},r.onerror=function(t){var e=t.target.error;"VersionError"===e.name?n(new j(q$1.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):n(new ur(e));},r.onupgradeneeded=function(t){E$1("SimpleDb",'Database "'+e.name+'" requires upgrade from version:',t.oldVersion);var n=t.target.result;e.Cs.createOrUpgrade(n,r.transaction,t.oldVersion,e.version).next(function(){E$1("SimpleDb","Database upgrade to version "+e.version+" complete");});};})]);case 1:t.db=n.sent(),n.label=2;case 2:return [2/*return*/,(this.Ls&&(this.db.onversionchange=function(t){return e.Ls(t);}),this.db)];}});});},t.prototype.qs=function(t){this.Ls=t,this.db&&(this.db.onversionchange=function(e){return t(e);});},t.prototype.runTransaction=function(t,r,i){return __awaiter$1(this,void 0,void 0,function(){var e,o,s,u,a;return __generator$1(this,function(c){switch(c.label){case 0:e="readonly"===t,o=0,s=function s(){var t,s,a,c,h;return __generator$1(this,function(n){switch(n.label){case 0:++o,n.label=1;case 1:return n.trys.push([1,4,,5]),[4/*yield*/,u.Os()];case 2:// Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
  // fire), but still return the original transactionFnResult back to the
  // caller.
  return u.db=n.sent(),t=cr.open(u.db,e?"readonly":"readwrite",r),s=i(t).catch(function(e){// Abort the transaction if there was an error.
  return t.abort(e),Yn.reject(e);}).vn(),a={},s.catch(function(){}),[4/*yield*/,t.Bs];case 3:return [2/*return*/,(a.value=(// Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
  // fire), but still return the original transactionFnResult back to the
  // caller.
  n.sent(),s),a)];case 4:return c=n.sent(),h="FirebaseError"!==c.name&&o<3,E$1("SimpleDb","Transaction failed with error: %s. Retrying: %s.",c.message,h),u.close(),h?[3/*break*/,5]:[2/*return*/,{value:Promise.reject(c)}];case 5:return [2/*return*/];}});},u=this,c.label=1;case 1:return [5/*yield**/,s()];case 2:if("object"==_typeof(a=c.sent()))return [2/*return*/,a.value];c.label=3;case 3:return [3/*break*/,1];case 4:return [2/*return*/];}});});},t.prototype.close=function(){this.db&&this.db.close(),this.db=void 0;},t;}(),sr=/** @class */function(){function t(t){this.Us=t,this.Qs=!1,this.Ws=null;}return Object.defineProperty(t.prototype,"gn",{get:function get(){return this.Qs;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"js",{get:function get(){return this.Ws;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"cursor",{set:function set(t){this.Us=t;},enumerable:!1,configurable:!0}),/**
       * This function can be called to stop iteration at any point.
       */t.prototype.done=function(){this.Qs=!0;},/**
       * This function can be called to skip to that next key, which could be
       * an index or a primary key.
       */t.prototype.Ks=function(t){this.Ws=t;},/**
       * Delete the current cursor value from the object store.
       *
       * NOTE: You CANNOT do this with a keysOnly query.
       */t.prototype.delete=function(){return fr(this.Us.delete());},t;}(),ur=/** @class */function(e){function n(t){var n=this;return (n=e.call(this,q$1.UNAVAILABLE,"IndexedDB transaction failed: "+t)||this).name="IndexedDbTransactionError",n;}return __extends(n,e),n;}(j);/**
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
   */ /**
   * A helper for running delayed tasks following an exponential backoff curve
   * between attempts.
   *
   * Each delay is made up of a "base" delay which follows the exponential
   * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
   * base delay. This prevents clients from accidentally synchronizing their
   * delays causing spikes of load to the backend.
   */ /** Verifies whether `e` is an IndexedDbTransactionError. */function ar(t){// Use name equality, as instanceof checks on errors don't work with errors
  // that wrap other errors.
  return "IndexedDbTransactionError"===t.name;}/**
   * Wraps an IDBTransaction and exposes a store() method to get a handle to a
   * specific object store.
   */var cr=/** @class */function(){function t(t){var e=this;this.transaction=t,this.aborted=!1,/**
               * A promise that resolves with the result of the IndexedDb transaction.
               */this.Gs=new rr(),this.transaction.oncomplete=function(){e.Gs.resolve();},this.transaction.onabort=function(){t.error?e.Gs.reject(new ur(t.error)):e.Gs.resolve();},this.transaction.onerror=function(t){var n=pr(t.target.error);e.Gs.reject(new ur(n));};}return t.open=function(e,n,r){try{return new t(e.transaction(r,n));}catch(e){throw new ur(e);}},Object.defineProperty(t.prototype,"Bs",{get:function get(){return this.Gs.promise;},enumerable:!1,configurable:!0}),t.prototype.abort=function(t){t&&this.Gs.reject(t),this.aborted||(E$1("SimpleDb","Aborting transaction:",t?t.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort());},/**
       * Returns a SimpleDbStore<KeyType, ValueType> for the specified store. All
       * operations performed on the SimpleDbStore happen within the context of this
       * transaction and it cannot be used anymore once the transaction is
       * completed.
       *
       * Note that we can't actually enforce that the KeyType and ValueType are
       * correct, but they allow type safety through the rest of the consuming code.
       */t.prototype.store=function(t){var e=this.transaction.objectStore(t);return new hr(e);},t;}(),hr=/** @class */function(){function t(t){this.store=t;}return t.prototype.put=function(t,e){var n;return void 0!==e?(E$1("SimpleDb","PUT",this.store.name,t,e),n=this.store.put(e,t)):(E$1("SimpleDb","PUT",this.store.name,"<auto-key>",t),n=this.store.put(t)),fr(n);},/**
       * Adds a new value into an Object Store and returns the new key. Similar to
       * IndexedDb's `add()`, this method will fail on primary key collisions.
       *
       * @param value The object to write.
       * @return The key of the value to add.
       */t.prototype.add=function(t){return E$1("SimpleDb","ADD",this.store.name,t,t),fr(this.store.add(t));},/**
       * Gets the object with the specified key from the specified store, or null
       * if no object exists with the specified key.
       *
       * @key The key of the object to get.
       * @return The object with the specified key or null if no object exists.
       */t.prototype.get=function(t){var e=this;// We're doing an unsafe cast to ValueType.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fr(this.store.get(t)).next(function(n){// Normalize nonexistence to null.
  return void 0===n&&(n=null),E$1("SimpleDb","GET",e.store.name,t,n),n;});},t.prototype.delete=function(t){return E$1("SimpleDb","DELETE",this.store.name,t),fr(this.store.delete(t));},/**
       * If we ever need more of the count variants, we can add overloads. For now,
       * all we need is to count everything in a store.
       *
       * Returns the number of rows in the store.
       */t.prototype.count=function(){return E$1("SimpleDb","COUNT",this.store.name),fr(this.store.count());},t.prototype.zs=function(t,e){var n=this.cursor(this.options(t,e)),r=[];return this.Hs(n,function(t,e){r.push(e);}).next(function(){return r;});},t.prototype.Ys=function(t,e){E$1("SimpleDb","DELETE ALL",this.store.name);var n=this.options(t,e);n.Js=!1;var r=this.cursor(n);return this.Hs(r,function(t,e,n){return n.delete();});},t.prototype.Xs=function(t,e){var n;e?n=t:(n={},e=t);var r=this.cursor(n);return this.Hs(r,e);},/**
       * Iterates over a store, but waits for the given callback to complete for
       * each entry before iterating the next entry. This allows the callback to do
       * asynchronous work to determine if this iteration should continue.
       *
       * The provided callback should return `true` to continue iteration, and
       * `false` otherwise.
       */t.prototype.Zs=function(t){var e=this.cursor({});return new Yn(function(n,r){e.onerror=function(t){var e=pr(t.target.error);r(e);},e.onsuccess=function(e){var r=e.target.result;r?t(r.primaryKey,r.value).next(function(t){t?r.continue():n();}):n();};});},t.prototype.Hs=function(t,e){var n=[];return new Yn(function(r,i){t.onerror=function(t){i(t.target.error);},t.onsuccess=function(t){var i=t.target.result;if(i){var o=new sr(i),s=e(i.primaryKey,i.value,o);if(s instanceof Yn){var u=s.catch(function(t){return o.done(),Yn.reject(t);});n.push(u);}o.gn?r():null===o.js?i.continue():i.continue(o.js);}else r();};}).next(function(){return Yn.Dn(n);});},t.prototype.options=function(t,e){var n=void 0;return void 0!==t&&("string"==typeof t?n=t:e=t),{index:n,range:e};},t.prototype.cursor=function(t){var e="next";if(t.reverse&&(e="prev"),t.index){var n=this.store.index(t.index);return t.Js?n.openKeyCursor(t.range,e):n.openCursor(t.range,e);}return this.store.openCursor(t.range,e);},t;}();/**
   * A wrapper around an IDBObjectStore providing an API that:
   *
   * 1) Has generic KeyType / ValueType parameters to provide strongly-typed
   * methods for acting against the object store.
   * 2) Deals with IndexedDB's onsuccess / onerror event callbacks, making every
   * method return a PersistencePromise instead.
   * 3) Provides a higher-level API to avoid needing to do excessive wrapping of
   * intermediate IndexedDB types (IDBCursorWithValue, etc.)
   */ /**
   * Wraps an IDBRequest in a PersistencePromise, using the onsuccess / onerror
   * handlers to resolve / reject the PersistencePromise as appropriate.
   */function fr(t){return new Yn(function(e,n){t.onsuccess=function(t){var n=t.target.result;e(n);},t.onerror=function(t){var e=pr(t.target.error);n(e);};});}// Guard so we only report the error once.
  var lr=!1;function pr(t){var e=or.Ns(getUA());if(e>=12.2&&e<13){var n="An internal error was encountered in the Indexed Database server";if(t.message.indexOf(n)>=0){// Wrap error in a more descriptive one.
  var r=new j("internal","IOS_INDEXEDDB_BUG1: IndexedDb has thrown '"+n+"'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");return lr||(lr=!0,// Throw a global exception outside of this promise chain, for the user to
  // potentially catch.
  setTimeout(function(){throw r;},0)),r;}}return t;}/**
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
   */ /** The Platform's 'window' implementation or null if not available. */function dr(){// `window` is not always available, e.g. in ReactNative and WebWorkers.
  // eslint-disable-next-line no-restricted-globals
  return "undefined"!=typeof window?window:null;}/** The Platform's 'document' implementation or null if not available. */function vr(){// `document` is not always available, e.g. in ReactNative and WebWorkers.
  // eslint-disable-next-line no-restricted-globals
  return "undefined"!=typeof document?document:null;}/**
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
   */ /**
   * Represents an operation scheduled to be run in the future on an AsyncQueue.
   *
   * It is created via DelayedOperation.createAndSchedule().
   *
   * Supports cancellation (via cancel()) and early execution (via skipDelay()).
   *
   * Note: We implement `PromiseLike` instead of `Promise`, as the `Promise` type
   * in newer versions of TypeScript defines `finally`, which is not available in
   * IE.
   */var yr=/** @class */function(){function t(t,e,n,r,i){this.ti=t,this.Is=e,this.ei=n,this.op=r,this.ni=i,this.si=new rr(),this.then=this.si.promise.then.bind(this.si.promise),// It's normal for the deferred promise to be canceled (due to cancellation)
  // and so we attach a dummy catch callback to avoid
  // 'UnhandledPromiseRejectionWarning' log spam.
  this.si.promise.catch(function(t){})/**
       * Creates and returns a DelayedOperation that has been scheduled to be
       * executed on the provided asyncQueue after the provided delayMs.
       *
       * @param asyncQueue The queue to schedule the operation on.
       * @param id A Timer ID identifying the type of operation this is.
       * @param delayMs The delay (ms) before the operation should be scheduled.
       * @param op The operation to run.
       * @param removalCallback A callback to be called synchronously once the
       *   operation is executed or canceled, notifying the AsyncQueue to remove it
       *   from its delayedOperations list.
       *   PORTING NOTE: This exists to prevent making removeDelayedOperation() and
       *   the DelayedOperation class public.
       */;}return t.ii=function(e,n,r,i,o){var s=new t(e,n,Date.now()+r,i,o);return s.start(r),s;},/**
       * Starts the timer. This is called immediately after construction by
       * createAndSchedule().
       */t.prototype.start=function(t){var e=this;this.ri=setTimeout(function(){return e.oi();},t);},/**
       * Queues the operation to run immediately (if it hasn't already been run or
       * canceled).
       */t.prototype.Ds=function(){return this.oi();},/**
       * Cancels the operation if it hasn't already been executed or canceled. The
       * promise will be rejected.
       *
       * As long as the operation has not yet been run, calling cancel() provides a
       * guarantee that the operation will not be run.
       */t.prototype.cancel=function(t){null!==this.ri&&(this.clearTimeout(),this.si.reject(new j(q$1.CANCELLED,"Operation cancelled"+(t?": "+t:""))));},t.prototype.oi=function(){var t=this;this.ti.hi(function(){return null!==t.ri?(t.clearTimeout(),t.op().then(function(e){return t.si.resolve(e);})):Promise.resolve();});},t.prototype.clearTimeout=function(){null!==this.ri&&(this.ni(this),clearTimeout(this.ri),this.ri=null);},t;}(),mr=/** @class */function(){function t(){var t=this;// The last promise in the queue.
  this.ai=Promise.resolve(),// A list of retryable operations. Retryable operations are run in order and
  // retried with backoff.
  this.ui=[],// Is this AsyncQueue being shut down? Once it is set to true, it will not
  // be changed again.
  this.ci=!1,// Operations scheduled to be queued in the future. Operations are
  // automatically removed after they are run or canceled.
  this.li=[],// visible for testing
  this._i=null,// Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  this.fi=!1,// List of TimerIds to fast-forward delays for.
  this.di=[],// Backoff timer used to schedule retries for retryable operations
  this.wi=new ir(this,"async_queue_retry"/* AsyncQueueRetry */),// Visibility handler that triggers an immediate retry of all retryable
  // operations. Meant to speed up recovery when we regain file system access
  // after page comes into foreground.
  this.Ti=function(){var e=vr();e&&E$1("AsyncQueue","Visibility state changed to  ",e.visibilityState),t.wi.Ss();};var e=vr();e&&"function"==typeof e.addEventListener&&e.addEventListener("visibilitychange",this.Ti);}return Object.defineProperty(t.prototype,"Ei",{// Is this AsyncQueue being shut down? If true, this instance will not enqueue
  // any new operations, Promises from enqueue requests will not resolve.
  get:function get(){return this.ci;},enumerable:!1,configurable:!0}),/**
       * Adds a new operation to the queue without waiting for it to complete (i.e.
       * we ignore the Promise result).
       */t.prototype.hi=function(t){// eslint-disable-next-line @typescript-eslint/no-floating-promises
  this.enqueue(t);},/**
       * Regardless if the queue has initialized shutdown, adds a new operation to the
       * queue without waiting for it to complete (i.e. we ignore the Promise result).
       */t.prototype.Ii=function(t){this.mi(),// eslint-disable-next-line @typescript-eslint/no-floating-promises
  this.Ai(t);},/**
       * Regardless if the queue has initialized shutdown, adds a new operation to the
       * queue.
       */t.prototype.Ri=function(t){return this.mi(),this.Ai(t);},/**
       * Adds a new operation to the queue and initialize the shut down of this queue.
       * Returns a promise that will be resolved when the promise returned by the new
       * operation is (with its value).
       * Once this method is called, the only possible way to request running an operation
       * is through `enqueueAndForgetEvenAfterShutdown`.
       */t.prototype.Pi=function(t){return __awaiter$1(this,void 0,void 0,function(){var e;return __generator$1(this,function(n){switch(n.label){case 0:return this.mi(),this.ci?[3/*break*/,2]:(this.ci=!0,(e=vr())&&"function"==typeof e.removeEventListener&&e.removeEventListener("visibilitychange",this.Ti),[4/*yield*/,this.Ri(t)]);case 1:n.sent(),n.label=2;case 2:return [2/*return*/];}});});},/**
       * Adds a new operation to the queue. Returns a promise that will be resolved
       * when the promise returned by the new operation is (with its value).
       */t.prototype.enqueue=function(t){return this.mi(),this.ci?new Promise(function(t){}):this.Ai(t);},/**
       * Enqueue a retryable operation.
       *
       * A retryable operation is rescheduled with backoff if it fails with a
       * IndexedDbTransactionError (the error type used by SimpleDb). All
       * retryable operations are executed in order and only run if all prior
       * operations were retried successfully.
       */t.prototype.Vi=function(t){var e=this;this.ui.push(t),this.hi(function(){return e.gi();});},/**
       * Runs the next operation from the retryable queue. If the operation fails,
       * reschedules with backoff.
       */t.prototype.gi=function(){return __awaiter$1(this,void 0,void 0,function(){var t,e=this;return __generator$1(this,function(n){switch(n.label){case 0:if(0===this.ui.length)return [3/*break*/,5];n.label=1;case 1:return n.trys.push([1,3,,4]),[4/*yield*/,this.ui[0]()];case 2:return n.sent(),this.ui.shift(),this.wi.reset(),[3/*break*/,4];case 3:if(!ar(t=n.sent()))throw t;// Failure will be handled by AsyncQueue
  return E$1("AsyncQueue","Operation failed with retryable error: "+t),[3/*break*/,4];case 4:this.ui.length>0&&// If there are additional operations, we re-schedule `retryNextOp()`.
  // This is necessary to run retryable operations that failed during
  // their initial attempt since we don't know whether they are already
  // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
  // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
  // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
  // call scheduled here.
  // Since `backoffAndRun()` cancels an existing backoff and schedules a
  // new backoff on every call, there is only ever a single additional
  // operation in the queue.
  this.wi.ps(function(){return e.gi();}),n.label=5;case 5:return [2/*return*/];}});});},t.prototype.Ai=function(t){var e=this,n=this.ai.then(function(){return e.fi=!0,t().catch(function(t){// Re-throw the error so that this.tail becomes a rejected Promise and
  // all further attempts to chain (via .then) will just short-circuit
  // and return the rejected Promise.
  throw e._i=t,e.fi=!1,T$1("INTERNAL UNHANDLED ERROR: ",/**
   * Chrome includes Error.message in Error.stack. Other browsers do not.
   * This returns expected output of message + stack when available.
   * @param error Error or FirestoreError
   */function(t){var e=t.message||"";return t.stack&&(e=t.stack.includes(t.message)?t.stack:t.message+"\n"+t.stack),e;}(t)),t;}).then(function(t){return e.fi=!1,t;});});return this.ai=n,n;},/**
       * Schedules an operation to be queued on the AsyncQueue once the specified
       * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
       * or fast-forward the operation prior to its running.
       */t.prototype.vs=function(t,e,n){var r=this;this.mi(),// Fast-forward delays for timerIds that have been overriden.
  this.di.indexOf(t)>-1&&(e=0);var i=yr.ii(this,t,e,n,function(t){return r.yi(t);});return this.li.push(i),i;},t.prototype.mi=function(){this._i&&_();},/**
       * Verifies there's an operation currently in-progress on the AsyncQueue.
       * Unfortunately we can't verify that the running code is in the promise chain
       * of that operation, so this isn't a foolproof check, but it should be enough
       * to catch some bugs.
       */t.prototype.pi=function(){},/**
       * Waits until all currently queued tasks are finished executing. Delayed
       * operations are not run.
       */t.prototype.bi=function(){return __awaiter$1(this,void 0,void 0,function(){var t;return __generator$1(this,function(e){switch(e.label){case 0:return [4/*yield*/,t=this.ai];case 1:e.sent(),e.label=2;case 2:if(t!==this.ai)return [3/*break*/,0];e.label=3;case 3:return [2/*return*/];}});});},/**
       * For Tests: Determine if a delayed operation with a particular TimerId
       * exists.
       */t.prototype.vi=function(t){for(var e=0,n=this.li;e<n.length;e++){if(n[e].Is===t)return !0;}return !1;},/**
       * For Tests: Runs some or all delayed operations early.
       *
       * @param lastTimerId Delayed operations up to and including this TimerId will
       *  be drained. Pass TimerId.All to run all delayed operations.
       * @returns a Promise that resolves once all operations have been run.
       */t.prototype.Si=function(t){var e=this;// Note that draining may generate more delayed ops, so we do that first.
  return this.bi().then(function(){// Run ops in the same order they'd run if they ran naturally.
  e.li.sort(function(t,e){return t.ei-e.ei;});for(var n=0,r=e.li;n<r.length;n++){var i=r[n];if(i.Ds(),"all"/* All */!==t&&i.Is===t)break;}return e.bi();});},/**
       * For Tests: Skip all subsequent delays for a timer id.
       */t.prototype.Di=function(t){this.di.push(t);},/** Called once a DelayedOperation is run or canceled. */t.prototype.yi=function(t){// NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
  var e=this.li.indexOf(t);this.li.splice(e,1);},t;}();/**
   * Returns a FirestoreError that can be surfaced to the user if the provided
   * error is an IndexedDbTransactionError. Re-throws the error otherwise.
   */function gr(t,e){if(T$1("AsyncQueue",e+": "+t),ar(t))return new j(q$1.UNAVAILABLE,e+": "+t);throw t;}function wr(t,e){var n=t[0],r=t[1],i=e[0],o=e[1],s=P$1(n,i);return 0===s?P$1(r,o):s;}/**
   * Used to calculate the nth sequence number. Keeps a rolling buffer of the
   * lowest n values passed to `addElement`, and finally reports the largest of
   * them in `maxValue`.
   */var br=/** @class */function(){function t(t){this.Ci=t,this.buffer=new pt(wr),this.Ni=0;}return t.prototype.Fi=function(){return ++this.Ni;},t.prototype.ki=function(t){var e=[t,this.Fi()];if(this.buffer.size<this.Ci)this.buffer=this.buffer.add(e);else {var n=this.buffer.last();wr(e,n)<0&&(this.buffer=this.buffer.delete(n).add(e));}},Object.defineProperty(t.prototype,"maxValue",{get:function get(){// Guaranteed to be non-empty. If we decide we are not collecting any
  // sequence numbers, nthSequenceNumber below short-circuits. If we have
  // decided that we are collecting n sequence numbers, it's because n is some
  // percentage of the existing sequence numbers. That means we should never
  // be in a situation where we are collecting sequence numbers but don't
  // actually have any.
  return this.buffer.last()[0];},enumerable:!1,configurable:!0}),t;}(),Ir={xi:!1,$i:0,Mi:0,Oi:0},Er=/** @class */function(){function t(// When we attempt to collect, we will only do so if the cache size is greater than this
  // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
  t,// The percentage of sequence numbers that we will attempt to collect
  e,// A cap on the total number of sequence numbers that will be collected. This prevents
  // us from collecting a huge number of sequence numbers if the cache has grown very large.
  n){this.Li=t,this.qi=e,this.Bi=n;}return t.Ui=function(e){return new t(e,t.Qi,t.Wi);},t;}();Er.ji=-1,Er.Ki=1048576,Er.Gi=41943040,Er.Qi=10,Er.Wi=1e3,Er.zi=new Er(Er.Gi,Er.Qi,Er.Wi),Er.Hi=new Er(Er.ji,0,0);/**
   * This class is responsible for the scheduling of LRU garbage collection. It handles checking
   * whether or not GC is enabled, as well as which delay to use before the next run.
   */var Tr=/** @class */function(){function t(t,e){this.Yi=t,this.ti=e,this.Ji=!1,this.Xi=null;}return t.prototype.start=function(t){this.Yi.params.Li!==Er.ji&&this.Zi(t);},t.prototype.stop=function(){this.Xi&&(this.Xi.cancel(),this.Xi=null);},Object.defineProperty(t.prototype,"tr",{get:function get(){return null!==this.Xi;},enumerable:!1,configurable:!0}),t.prototype.Zi=function(t){var r=this,i=this.Ji?3e5:6e4;E$1("LruGarbageCollector","Garbage collection scheduled in "+i+"ms"),this.Xi=this.ti.vs("lru_garbage_collection"/* LruGarbageCollection */,i,function(){return __awaiter$1(r,void 0,void 0,function(){var e;return __generator$1(this,function(n){switch(n.label){case 0:this.Xi=null,this.Ji=!0,n.label=1;case 1:return n.trys.push([1,3,,7]),[4/*yield*/,t.er(this.Yi)];case 2:return n.sent(),[3/*break*/,7];case 3:return ar(e=n.sent())?(E$1("LruGarbageCollector","Ignoring IndexedDB error during garbage collection: ",e),[3/*break*/,6]):[3/*break*/,4];case 4:return [4/*yield*/,Li(e)];case 5:n.sent(),n.label=6;case 6:return [3/*break*/,7];case 7:return [4/*yield*/,this.Zi(t)];case 8:return n.sent(),[2/*return*/];}});});});},t;}(),Nr=/** @class */function(){function t(t,e){this.nr=t,this.params=e/** Given a percentile of target to collect, returns the number of targets to collect. */;}return t.prototype.sr=function(t,e){return this.nr.ir(t).next(function(t){return Math.floor(e/100*t);});},/** Returns the nth sequence number, counting in order from the smallest. */t.prototype.rr=function(t,e){var n=this;if(0===e)return Yn.resolve(nr.Ts);var r=new br(e);return this.nr.pe(t,function(t){return r.ki(t.sequenceNumber);}).next(function(){return n.nr.or(t,function(t){return r.ki(t);});}).next(function(){return r.maxValue;});},/**
       * Removes targets with a sequence number equal to or less than the given upper bound, and removes
       * document associations with those targets.
       */t.prototype.hr=function(t,e,n){return this.nr.hr(t,e,n);},/**
       * Removes documents that have a sequence number equal to or less than the upper bound and are not
       * otherwise pinned.
       */t.prototype.ar=function(t,e){return this.nr.ar(t,e);},t.prototype.ur=function(t,e){var n=this;return this.params.Li===Er.ji?(E$1("LruGarbageCollector","Garbage collection skipped; disabled"),Yn.resolve(Ir)):this.cr(t).next(function(r){return r<n.params.Li?(E$1("LruGarbageCollector","Garbage collection skipped; Cache size "+r+" is lower than threshold "+n.params.Li),Ir):n.lr(t,e);});},t.prototype.cr=function(t){return this.nr.cr(t);},t.prototype.lr=function(t,e){var n,r,i,o,u,a,c,h=this,f=Date.now();return this.sr(t,this.params.qi).next(function(e){// Cap at the configured max
  return e>h.params.Bi?(E$1("LruGarbageCollector","Capping sequence numbers to collect down to the maximum of "+h.params.Bi+" from "+e),r=h.params.Bi):r=e,o=Date.now(),h.rr(t,r);}).next(function(r){return n=r,u=Date.now(),h.hr(t,n,e);}).next(function(e){return i=e,a=Date.now(),h.ar(t,n);}).next(function(t){return c=Date.now(),I$1()<=LogLevel.DEBUG&&E$1("LruGarbageCollector","LRU Garbage Collection\n\tCounted targets in "+(o-f)+"ms\n\tDetermined least recently used "+r+" in "+(u-o)+"ms\n\tRemoved "+i+" targets in "+(a-u)+"ms\n\tRemoved "+t+" documents in "+(c-a)+"ms\nTotal Duration: "+(c-f)+"ms"),Yn.resolve({xi:!0,$i:r,Mi:i,Oi:t});});},t;}();/** Implements the steps for LRU garbage collection. */ /**
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
   */ /**
   * Encodes a resource path into a IndexedDb-compatible string form.
   */function Ar(t){for(var e="",n=0;n<t.length;n++){e.length>0&&(e=Dr(e)),e=_r(t.get(n),e);}return Dr(e);}/** Encodes a single segment of a resource path into the given result */function _r(t,e){for(var n=e,r=t.length,i=0;i<r;i++){var o=t.charAt(i);switch(o){case"\0":n+="";break;case"":n+="";break;default:n+=o;}}return n;}/** Encodes a path separator into the given result */function Dr(t){return t+"";}/**
   * Decodes the given IndexedDb-compatible string form of a resource path into
   * a ResourcePath instance. Note that this method is not suitable for use with
   * decoding resource names from the server; those are One Platform format
   * strings.
   */function kr(t){// Event the empty path must encode as a path of at least length 2. A path
  // with exactly 2 must be the empty path.
  var e=t.length;if(D$1(e>=2),2===e)return D$1(""===t.charAt(0)&&""===t.charAt(1)),K$1.$();// Escape characters cannot exist past the second-to-last position in the
  // source value.
  for(var n=e-2,r=[],i="",o=0;o<e;){// The last two characters of a valid encoded path must be a separator, so
  // there must be an end to this segment.
  var s=t.indexOf("",o);switch((s<0||s>n)&&_(),t.charAt(s+1)){case"":var u=t.substring(o,s),a=void 0;0===i.length?// Avoid copying for the common case of a segment that excludes \0
  // and \001
  a=u:(a=i+=u,i=""),r.push(a);break;case"":i+=t.substring(o,s),i+="\0";break;case"":// The escape character can be used in the output to encode itself.
  i+=t.substring(o,s+1);break;default:_();}o=s+2;}return new K$1(r);}/**
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
   */ /** Serializer for values stored in the LocalStore. */var xr=function xr(t){this._r=t;};/** Decodes a remote document from storage locally to a Document. */function Sr(t,e){if(e.document)return function(t,e,n){var r=de(t,e.name),i=he(e.updateTime),o=new hn({mapValue:{fields:e.fields}});return new dn(r,i,o,{hasCommittedMutations:!!n});}(t._r,e.document,!!e.hasCommittedMutations);if(e.noDocument){var n=W$1.j(e.noDocument.path),r=Vr(e.noDocument.readTime);return new vn(n,r,{hasCommittedMutations:!!e.hasCommittedMutations});}if(e.unknownDocument){var i=W$1.j(e.unknownDocument.path),o=Vr(e.unknownDocument.version);return new yn(i,o);}return _();}/** Encodes a document for storage locally. */function Pr(t,e,n){var r=Lr(n),i=e.key.path.p().N();if(e instanceof dn){var o=function(t,e){return {name:pe(t,e.key),fields:e.Ze().mapValue.fields,updateTime:ue(t,e.version.A())};}(t._r,e),s=e.hasCommittedMutations;return new si(/* unknownDocument= */null,/* noDocument= */null,o,s,r,i);}if(e instanceof vn){var u=e.key.path.N(),a=Rr(e.version),c=e.hasCommittedMutations;return new si(/* unknownDocument= */null,new ii(u,a),/* document= */null,c,r,i);}if(e instanceof yn){var h=e.key.path.N(),f=Rr(e.version);return new si(new oi(h,f),/* noDocument= */null,/* document= */null,/* hasCommittedMutations= */!0,r,i);}return _();}function Lr(t){var e=t.A();return [e.seconds,e.nanoseconds];}function Or(t){var e=new G$1(t[0],t[1]);return B.I(e);}function Rr(t){var e=t.A();return new Zr(e.seconds,e.nanoseconds);}function Vr(t){var e=new G$1(t.seconds,t.nanoseconds);return B.I(e);}/** Encodes a batch of mutations into a DbMutationBatch for local storage. */ /** Decodes a DbMutationBatch into a MutationBatch */function Ur(t,e){var n=(e.baseMutations||[]).map(function(e){return Ie(t._r,e);}),r=e.mutations.map(function(e){return Ie(t._r,e);}),i=G$1.fromMillis(e.localWriteTimeMs);return new Wn(e.batchId,i,n,r);}/** Decodes a DbTarget into TargetData */function Cr(t){var e,n,r=Vr(t.readTime),i=void 0!==t.lastLimboFreeSnapshotVersion?Vr(t.lastLimboFreeSnapshotVersion):B.min();return void 0!==t.query.documents?(D$1(1===(n=t.query).documents.length),e=Tn(bn(ye(n.documents[0])))):e=function(t){var e=ye(t.parent),n=t.structuredQuery,r=n.from?n.from.length:0,i=null;if(r>0){D$1(1===r);var o=n.from[0];o.allDescendants?i=o.collectionId:e=e.child(o.collectionId);}var s=[];n.where&&(s=function t(e){return e?void 0!==e.unaryFilter?[xe(e)]:void 0!==e.fieldFilter?[ke(e)]:void 0!==e.compositeFilter?e.compositeFilter.filters.map(function(e){return t(e);}).reduce(function(t,e){return t.concat(e);}):_():[];}(n.where));var u=[];n.orderBy&&(u=n.orderBy.map(function(t){return new Kn(De((e=t).field),// visible for testing
  function(t){switch(t){case"ASCENDING":return "asc"/* ASCENDING */;case"DESCENDING":return "desc"/* DESCENDING */;default:return;}}(e.direction));var e;}));var a=null;n.limit&&(a=function(t){var e;return H$1(e="object"==_typeof(t)?t.value:t)?null:e;}(n.limit));var c=null;n.startAt&&(c=Ae(n.startAt));var h=null;return n.endAt&&(h=Ae(n.endAt)),Tn(wn(e,i,u,s,a,"F"/* First */,c,h));}(t.query),new st(e,t.targetId,0/* Listen */,t.lastListenSequenceNumber,r,i,rt.fromBase64String(t.resumeToken))/** Encodes TargetData into a DbTarget for storage locally. */;}function Mr(t,e){var n,r=Rr(e.X),i=Rr(e.lastLimboFreeSnapshotVersion);n=nt(e.target)?Ee(t._r,e.target):Te(t._r,e.target);// We can't store the resumeToken as a ByteString in IndexedDb, so we
  // convert it to a base64 string for storage.
  var o=e.resumeToken.toBase64();// lastListenSequenceNumber is always 0 until we do real GC.
  return new ai(e.targetId,tt(e.target),r,o,e.sequenceNumber,i,n);}/**
   * A helper function for figuring out what kind of query has been stored.
   */ /**
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
   */ /** A mutation queue for a specific user, backed by IndexedDB. */var Fr=/** @class */function(){function t(/**
       * The normalized userId (e.g. null UID => "" userId) used to store /
       * retrieve mutations.
       */t,e,n,r){this.userId=t,this.serializer=e,this.Gn=n,this.dr=r,/**
               * Caches the document keys for pending mutation batches. If the mutation
               * has been removed from IndexedDb, the cached value may continue to
               * be used to retrieve the batch's document keys. To remove a cached value
               * locally, `removeCachedMutationKeys()` should be invoked either directly
               * or through `removeMutationBatches()`.
               *
               * With multi-tab, when the primary client acknowledges or rejects a mutation,
               * this cache is used by secondary clients to invalidate the local
               * view of the documents that were previously affected by the mutation.
               */ // PORTING NOTE: Multi-tab only.
  this.wr={}/**
       * Creates a new mutation queue for the given user.
       * @param user The user for which to create a mutation queue.
       * @param serializer The serializer to use when persisting to IndexedDb.
       */;}return t.Tr=function(e,n,r,i){// TODO(mcg): Figure out what constraints there are on userIDs
  // In particular, are there any reserved characters? are empty ids allowed?
  // For the moment store these together in the same mutations table assuming
  // that empty userIDs aren't allowed.
  return D$1(""!==e.uid),new t(e.Er()?e.uid:"",n,r,i);},t.prototype.Ir=function(t){var e=!0,n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Gr(t).Xs({index:ni.userMutationsIndex,range:n},function(t,n,r){e=!1,r.done();}).next(function(){return e;});},t.prototype.mr=function(t,e,n,r){var i=this,o=Br(t),s=Gr(t);// The IndexedDb implementation in Chrome (and Firefox) does not handle
  // compound indices that include auto-generated keys correctly. To ensure
  // that the index entry is added correctly in all browsers, we perform two
  // writes: The first write is used to retrieve the next auto-generated Batch
  // ID, and the second write populates the index and stores the actual
  // mutation batch.
  // See: https://bugs.chromium.org/p/chromium/issues/detail?id=701972
  // We write an empty object to obtain key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return s.add({}).next(function(u){D$1("number"==typeof u);for(var a=new Wn(u,e,n,r),c=function(t,e,n){var r=n.baseMutations.map(function(e){return be(t._r,e);}),i=n.mutations.map(function(e){return be(t._r,e);});return new ni(e,n.batchId,n.wn.toMillis(),r,i);}(i.serializer,i.userId,a),h=[],f=new pt(function(t,e){return P$1(t.F(),e.F());}),l=0,p=r;l<p.length;l++){var d=p[l],v=ri.key(i.userId,d.key.path,u);f=f.add(d.key.path.p()),h.push(s.put(c)),h.push(o.put(v,ri.PLACEHOLDER));}return f.forEach(function(e){h.push(i.Gn.Ar(t,e));}),t.Qn(function(){i.wr[u]=a.keys();}),Yn.Dn(h).next(function(){return a;});});},t.prototype.Rr=function(t,e){var n=this;return Gr(t).get(e).next(function(t){return t?(D$1(t.userId===n.userId),Ur(n.serializer,t)):null;});},/**
       * Returns the document keys for the mutation batch with the given batchId.
       * For primary clients, this method returns `null` after
       * `removeMutationBatches()` has been called. Secondary clients return a
       * cached result until `removeCachedMutationKeys()` is invoked.
       */ // PORTING NOTE: Multi-tab only.
  t.prototype.Pr=function(t,e){var n=this;return this.wr[e]?Yn.resolve(this.wr[e]):this.Rr(t,e).next(function(t){if(t){var r=t.keys();return n.wr[e]=r,r;}return null;});},t.prototype.Vr=function(t,e){var n=this,r=e+1,i=IDBKeyRange.lowerBound([this.userId,r]),o=null;return Gr(t).Xs({index:ni.userMutationsIndex,range:i},function(t,e,i){e.userId===n.userId&&(D$1(e.batchId>=r),o=Ur(n.serializer,e)),i.done();}).next(function(){return o;});},t.prototype.gr=function(t){var e=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]),n=-1;return Gr(t).Xs({index:ni.userMutationsIndex,range:e,reverse:!0},function(t,e,r){n=e.batchId,r.done();}).next(function(){return n;});},t.prototype.yr=function(t){var e=this,n=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return Gr(t).zs(ni.userMutationsIndex,n).next(function(t){return t.map(function(t){return Ur(e.serializer,t);});});},t.prototype.Hn=function(t,e){var n=this,r=ri.prefixForPath(this.userId,e.path),i=IDBKeyRange.lowerBound(r),o=[];// Scan the document-mutation index starting with a prefix starting with
  // the given documentKey.
  return Br(t).Xs({range:i},function(r,i,s){var u=r[0],a=r[1],c=r[2],h=kr(a);// Only consider rows matching exactly the specific key of
  // interest. Note that because we order by path first, and we
  // order terminators before path separators, we'll encounter all
  // the index rows for documentKey contiguously. In particular, all
  // the rows for documentKey will occur before any rows for
  // documents nested in a subcollection beneath documentKey so we
  // can stop as soon as we hit any such row.
  if(u===n.userId&&e.path.isEqual(h))// Look up the mutation batch in the store.
  return Gr(t).get(c).next(function(t){if(!t)throw _();D$1(t.userId===n.userId),o.push(Ur(n.serializer,t));});s.done();}).next(function(){return o;});},t.prototype.ts=function(t,e){var n=this,r=new pt(P$1),i=[];return e.forEach(function(e){var o=ri.prefixForPath(n.userId,e.path),s=IDBKeyRange.lowerBound(o),u=Br(t).Xs({range:s},function(t,i,o){var s=t[0],u=t[1],a=t[2],c=kr(u);// Only consider rows matching exactly the specific key of
  // interest. Note that because we order by path first, and we
  // order terminators before path separators, we'll encounter all
  // the index rows for documentKey contiguously. In particular, all
  // the rows for documentKey will occur before any rows for
  // documents nested in a subcollection beneath documentKey so we
  // can stop as soon as we hit any such row.
  s===n.userId&&e.path.isEqual(c)?r=r.add(a):o.done();});i.push(u);}),Yn.Dn(i).next(function(){return n.pr(t,r);});},t.prototype.hs=function(t,e){var n=this,r=e.path,i=r.length+1,o=ri.prefixForPath(this.userId,r),s=IDBKeyRange.lowerBound(o),u=new pt(P$1);return Br(t).Xs({range:s},function(t,e,o){var s=t[0],a=t[1],c=t[2],h=kr(a);s===n.userId&&r.D(h)?// Rows with document keys more than one segment longer than the
  // query path can't be matches. For example, a query on 'rooms'
  // can't match the document /rooms/abc/messages/xyx.
  // TODO(mcg): we'll need a different scanner when we implement
  // ancestor queries.
  h.length===i&&(u=u.add(c)):o.done();}).next(function(){return n.pr(t,u);});},t.prototype.pr=function(t,e){var n=this,r=[],i=[];// TODO(rockwood): Implement this using iterate.
  return e.forEach(function(e){i.push(Gr(t).get(e).next(function(t){if(null===t)throw _();D$1(t.userId===n.userId),r.push(Ur(n.serializer,t));}));}),Yn.Dn(i).next(function(){return r;});},t.prototype.br=function(t,e){var n=this;return jr(t.vr,this.userId,e).next(function(r){return t.Qn(function(){n.Sr(e.batchId);}),Yn.forEach(r,function(e){return n.dr.Dr(t,e);});});},/**
       * Clears the cached keys for a mutation batch. This method should be
       * called by secondary clients after they process mutation updates.
       *
       * Note that this method does not have to be called from primary clients as
       * the corresponding cache entries are cleared when an acknowledged or
       * rejected batch is removed from the mutation queue.
       */ // PORTING NOTE: Multi-tab only
  t.prototype.Sr=function(t){delete this.wr[t];},t.prototype.Cr=function(t){var e=this;return this.Ir(t).next(function(n){if(!n)return Yn.resolve();// Verify that there are no entries in the documentMutations index if
  // the queue is empty.
  var r=IDBKeyRange.lowerBound(ri.prefixForUser(e.userId)),i=[];return Br(t).Xs({range:r},function(t,n,r){if(t[0]===e.userId){var o=kr(t[1]);i.push(o);}else r.done();}).next(function(){D$1(0===i.length);});});},t.prototype.Nr=function(t,e){return qr(t,this.userId,e);},// PORTING NOTE: Multi-tab only (state is held in memory in other clients).
  /** Returns the mutation queue's metadata from IndexedDb. */t.prototype.Fr=function(t){var e=this;return zr(t).get(this.userId).next(function(t){return t||new ei(e.userId,-1,/*lastStreamToken=*/"");});},t;}();/**
   * @return true if the mutation queue for the given user contains a pending
   *         mutation for the given key.
   */function qr(t,e,n){var r=ri.prefixForPath(e,n.path),i=r[1],o=IDBKeyRange.lowerBound(r),s=!1;return Br(t).Xs({range:o,Js:!0},function(t,n,r){var o=t[0],u=t[1];t[2];o===e&&u===i&&(s=!0),r.done();}).next(function(){return s;});}/** Returns true if any mutation queue contains the given document. */ /**
   * Delete a mutation batch and the associated document mutations.
   * @return A PersistencePromise of the document mutations that were removed.
   */function jr(t,e,n){var r=t.store(ni.store),i=t.store(ri.store),o=[],s=IDBKeyRange.only(n.batchId),u=0,a=r.Xs({range:s},function(t,e,n){return u++,n.delete();});o.push(a.next(function(){D$1(1===u);}));for(var c=[],h=0,f=n.mutations;h<f.length;h++){var l=f[h],p=ri.key(e,l.key.path,n.batchId);o.push(i.delete(p)),c.push(l.key);}return Yn.Dn(o).next(function(){return c;});}/**
   * Helper to get a typed SimpleDbStore for the mutations object store.
   */function Gr(t){return Ni.Ms(t,ni.store);}/**
   * Helper to get a typed SimpleDbStore for the mutationQueues object store.
   */function Br(t){return Ni.Ms(t,ri.store);}/**
   * Helper to get a typed SimpleDbStore for the mutationQueues object store.
   */function zr(t){return Ni.Ms(t,ei.store);}/**
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
   */var Kr=/** @class */function(){/**
       * @param {LocalSerializer} serializer The document serializer.
       * @param {IndexManager} indexManager The query indexes that need to be maintained.
       */function t(t,e){this.serializer=t,this.Gn=e/**
       * Adds the supplied entries to the cache.
       *
       * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
       */;}return t.prototype.xn=function(t,e,n){return Qr(t).put(Wr(e),n);},/**
       * Removes a document from the cache.
       *
       * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
       */t.prototype.Mn=function(t,e){var n=Qr(t),r=Wr(e);return n.delete(r);},/**
       * Updates the current cache size.
       *
       * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
       * cache's metadata.
       */t.prototype.updateMetadata=function(t,e){var n=this;return this.getMetadata(t).next(function(r){return r.byteSize+=e,n.kr(t,r);});},t.prototype.On=function(t,e){var n=this;return Qr(t).get(Wr(e)).next(function(t){return n.xr(t);});},/**
       * Looks up an entry in the cache.
       *
       * @param documentKey The key of the entry to look up.
       * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
       */t.prototype.$r=function(t,e){var n=this;return Qr(t).get(Wr(e)).next(function(t){var e=n.xr(t);return e?{Mr:e,size:Hr(t)}:null;});},t.prototype.getEntries=function(t,e){var n=this,r=mt();return this.Or(t,e,function(t,e){var i=n.xr(e);r=r.nt(t,i);}).next(function(){return r;});},/**
       * Looks up several entries in the cache.
       *
       * @param documentKeys The set of keys entries to look up.
       * @return A map of MaybeDocuments indexed by key (if a document cannot be
       *     found, the key will be mapped to null) and a map of sizes indexed by
       *     key (zero if the key cannot be found).
       */t.prototype.Lr=function(t,e){var n=this,r=mt(),i=new ht(W$1.P);return this.Or(t,e,function(t,e){var o=n.xr(e);o?(r=r.nt(t,o),i=i.nt(t,Hr(e))):(r=r.nt(t,null),i=i.nt(t,0));}).next(function(){return {qr:r,Br:i};});},t.prototype.Or=function(t,e,n){if(e._())return Yn.resolve();var r=IDBKeyRange.bound(e.first().path.N(),e.last().path.N()),i=e.at(),o=i.dt();return Qr(t).Xs({range:r},function(t,e,r){// Go through keys not found in cache.
  for(var s=W$1.j(t);o&&W$1.P(o,s)<0;){n(o,null),o=i.dt();}o&&o.isEqual(s)&&(// Key found in cache.
  n(o,e),o=i.wt()?i.dt():null),// Skip to the next key (if there is one).
  o?r.Ks(o.path.N()):r.done();}).next(function(){// The rest of the keys are not in the cache. One case where `iterate`
  // above won't go through them is when the cache is empty.
  for(;o;){n(o,null),o=i.wt()?i.dt():null;}});},t.prototype.es=function(t,e,n){var r=this,i=wt(),o=e.path.length+1,s={};if(n.isEqual(B.min())){// Documents are ordered by key, so we can use a prefix scan to narrow
  // down the documents we need to match the query against.
  var u=e.path.N();s.range=IDBKeyRange.lowerBound(u);}else {// Execute an index-free query and filter by read time. This is safe
  // since all document changes to queries that have a
  // lastLimboFreeSnapshotVersion (`sinceReadTime`) have a read time set.
  var a=e.path.N(),c=Lr(n);s.range=IDBKeyRange.lowerBound([a,c],/* open= */!0),s.index=si.collectionReadTimeIndex;}return Qr(t).Xs(s,function(t,n,s){// The query is actually returning any path that starts with the query
  // path prefix which may include documents in subcollections. For
  // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
  // shouldn't match it. Fix this by discarding rows with document keys
  // more than one segment longer than the query path.
  if(t.length===o){var u=Sr(r.serializer,n);e.path.D(u.key.path)?u instanceof dn&&Sn(e,u)&&(i=i.nt(u.key,u)):s.done();}}).next(function(){return i;});},/**
       * Returns the set of documents that have changed since the specified read
       * time.
       */ // PORTING NOTE: This is only used for multi-tab synchronization.
  t.prototype.Ur=function(t,e){var n=this,r=yt(),i=Lr(e),o=Qr(t),s=IDBKeyRange.lowerBound(i,!0);return o.Xs({index:si.readTimeIndex,range:s},function(t,e){// Unlike `getEntry()` and others, `getNewDocumentChanges()` parses
  // the documents directly since we want to keep sentinel deletes.
  var o=Sr(n.serializer,e);r=r.nt(o.key,o),i=e.readTime;}).next(function(){return {Qr:r,readTime:Or(i)};});},/**
       * Returns the read time of the most recently read document in the cache, or
       * SnapshotVersion.min() if not available.
       */ // PORTING NOTE: This is only used for multi-tab synchronization.
  t.prototype.Wr=function(t){var e=Qr(t),n=B.min();// If there are no existing entries, we return SnapshotVersion.min().
  return e.Xs({index:si.readTimeIndex,reverse:!0},function(t,e,r){e.readTime&&(n=Or(e.readTime)),r.done();}).next(function(){return n;});},t.prototype.jr=function(e){return new t.Kr(this,!!e&&e.Gr);},t.prototype.zr=function(t){return this.getMetadata(t).next(function(t){return t.byteSize;});},t.prototype.getMetadata=function(t){return Xr(t).get(ui.key).next(function(t){return D$1(!!t),t;});},t.prototype.kr=function(t,e){return Xr(t).put(ui.key,e);},/**
       * Decodes `remoteDoc` and returns the document (or null, if the document
       * corresponds to the format used for sentinel deletes).
       */t.prototype.xr=function(t){if(t){var e=Sr(this.serializer,t);return e instanceof vn&&e.version.isEqual(B.min())?null:e;}return null;},t;}();/**
   * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
   *
   * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
   * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
   * when we apply the changes.
   */function Xr(t){return Ni.Ms(t,ui.store);}/**
   * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
   */function Qr(t){return Ni.Ms(t,si.store);}function Wr(t){return t.path.N();}/**
   * Retrusn an approximate size for the given document.
   */function Hr(t){var e;if(t.document)e=t.document;else if(t.unknownDocument)e=t.unknownDocument;else {if(!t.noDocument)throw _();e=t.noDocument;}return JSON.stringify(e).length;}/**
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
   */ /**
   * An in-memory implementation of IndexManager.
   */Kr.Kr=/** @class */function(e){/**
       * @param documentCache The IndexedDbRemoteDocumentCache to apply the changes to.
       * @param trackRemovals Whether to create sentinel deletes that can be tracked by
       * `getNewDocumentChanges()`.
       */function n(t,n){var r=this;return (r=e.call(this)||this).Hr=t,r.Gr=n,// A map of document sizes prior to applying the changes in this buffer.
  r.Yr=new F$1(function(t){return t.toString();},function(t,e){return t.isEqual(e);}),r;}return __extends(n,e),n.prototype.Bn=function(t){var e=this,n=[],r=0,i=new pt(function(t,e){return P$1(t.F(),e.F());});return this.Nn.forEach(function(o,s){var u=e.Yr.get(o);if(s){var a=Pr(e.Hr.serializer,s,e.readTime);i=i.add(o.path.p());var c=Hr(a);r+=c-u,n.push(e.Hr.xn(t,o,a));}else if(r-=u,e.Gr){// In order to track removals, we store a "sentinel delete" in the
  // RemoteDocumentCache. This entry is represented by a NoDocument
  // with a version of 0 and ignored by `maybeDecodeDocument()` but
  // preserved in `getNewDocumentChanges()`.
  var h=Pr(e.Hr.serializer,new vn(o,B.min()),e.readTime);n.push(e.Hr.xn(t,o,h));}else n.push(e.Hr.Mn(t,o));}),i.forEach(function(r){n.push(e.Hr.Gn.Ar(t,r));}),n.push(this.Hr.updateMetadata(t,r)),Yn.Dn(n);},n.prototype.Ln=function(t,e){var n=this;// Record the size of everything we load from the cache so we can compute a delta later.
  return this.Hr.$r(t,e).next(function(t){return null===t?(n.Yr.set(e,0),null):(n.Yr.set(e,t.size),t.Mr);});},n.prototype.qn=function(t,e){var n=this;// Record the size of everything we load from the cache so we can compute
  // a delta later.
  return this.Hr.Lr(t,e).next(function(t){var e=t.qr;// Note: `getAllFromCache` returns two maps instead of a single map from
  // keys to `DocumentSizeEntry`s. This is to allow returning the
  // `NullableMaybeDocumentMap` directly, without a conversion.
  return t.Br.forEach(function(t,e){n.Yr.set(t,e);}),e;});},n;}($n);var Yr=/** @class */function(){function t(){this.Jr=new $r();}return t.prototype.Ar=function(t,e){return this.Jr.add(e),Yn.resolve();},t.prototype.os=function(t,e){return Yn.resolve(this.Jr.getEntries(e));},t;}(),$r=/** @class */function(){function t(){this.index={};}// Returns false if the entry already existed.
  return t.prototype.add=function(t){var e=t.S(),n=t.p(),r=this.index[e]||new pt(K$1.P),i=!r.has(n);return this.index[e]=r.add(n),i;},t.prototype.has=function(t){var e=t.S(),n=t.p(),r=this.index[e];return r&&r.has(n);},t.prototype.getEntries=function(t){return (this.index[t]||new pt(K$1.P)).N();},t;}(),Jr=/** @class */function(){function t(t){this.serializer=t;}/**
       * Performs database creation and schema upgrades.
       *
       * Note that in production, this method is only ever used to upgrade the schema
       * to SCHEMA_VERSION. Different values of toVersion are only used for testing
       * and local feature development.
       */return t.prototype.createOrUpgrade=function(t,e,n,r){var i=this;D$1(n<r&&n>=0&&r<=10);var o=new cr(e);n<1&&r>=1&&(function(t){t.createObjectStore(ti.store);}(t),function(t){t.createObjectStore(ei.store,{keyPath:ei.keyPath}),t.createObjectStore(ni.store,{keyPath:ni.keyPath,autoIncrement:!0}).createIndex(ni.userMutationsIndex,ni.userMutationsKeyPath,{unique:!0}),t.createObjectStore(ri.store);}(t),li(t),function(t){t.createObjectStore(si.store);}(t));// Migration 2 to populate the targetGlobal object no longer needed since
  // migration 3 unconditionally clears it.
  var s=Yn.resolve();return n<3&&r>=3&&(// Brand new clients don't need to drop and recreate--only clients that
  // potentially have corrupt data.
  0!==n&&(function(t){t.deleteObjectStore(ci.store),t.deleteObjectStore(ai.store),t.deleteObjectStore(hi.store);}(t),li(t)),s=s.next(function(){/**
       * Creates the target global singleton row.
       *
       * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
       */return function(t){var e=t.store(hi.store),n=new hi(/*highestTargetId=*/0,/*lastListenSequenceNumber=*/0,B.min().A(),/*targetCount=*/0);return e.put(hi.key,n);}(o);})),n<4&&r>=4&&(0!==n&&(// Schema version 3 uses auto-generated keys to generate globally unique
  // mutation batch IDs (this was previously ensured internally by the
  // client). To migrate to the new schema, we have to read all mutations
  // and write them back out. We preserve the existing batch IDs to guarantee
  // consistency with other object stores. Any further mutation batch IDs will
  // be auto-generated.
  s=s.next(function(){return function(t,e){return e.store(ni.store).zs().next(function(n){t.deleteObjectStore(ni.store),t.createObjectStore(ni.store,{keyPath:ni.keyPath,autoIncrement:!0}).createIndex(ni.userMutationsIndex,ni.userMutationsKeyPath,{unique:!0});var r=e.store(ni.store),i=n.map(function(t){return r.put(t);});return Yn.Dn(i);});}(t,o);})),s=s.next(function(){!function(t){t.createObjectStore(pi.store,{keyPath:pi.keyPath});}(t);})),n<5&&r>=5&&(s=s.next(function(){return i.removeAcknowledgedMutations(o);})),n<6&&r>=6&&(s=s.next(function(){return function(t){t.createObjectStore(ui.store);}(t),i.addDocumentGlobal(o);})),n<7&&r>=7&&(s=s.next(function(){return i.ensureSequenceNumbers(o);})),n<8&&r>=8&&(s=s.next(function(){return i.createCollectionParentIndex(t,o);})),n<9&&r>=9&&(s=s.next(function(){// Multi-Tab used to manage its own changelog, but this has been moved
  // to the DbRemoteDocument object store itself. Since the previous change
  // log only contained transient data, we can drop its object store.
  !function(t){t.objectStoreNames.contains("remoteDocumentChanges")&&t.deleteObjectStore("remoteDocumentChanges");}(t),function(t){var e=t.objectStore(si.store);e.createIndex(si.readTimeIndex,si.readTimeIndexPath,{unique:!1}),e.createIndex(si.collectionReadTimeIndex,si.collectionReadTimeIndexPath,{unique:!1});}(e);})),n<10&&r>=10&&(s=s.next(function(){return i.rewriteCanonicalIds(o);})),s;},t.prototype.addDocumentGlobal=function(t){var e=0;return t.store(si.store).Xs(function(t,n){e+=Hr(n);}).next(function(){var n=new ui(e);return t.store(ui.store).put(ui.key,n);});},t.prototype.removeAcknowledgedMutations=function(t){var e=this,n=t.store(ei.store),r=t.store(ni.store);return n.zs().next(function(n){return Yn.forEach(n,function(n){var i=IDBKeyRange.bound([n.userId,-1],[n.userId,n.lastAcknowledgedBatchId]);return r.zs(ni.userMutationsIndex,i).next(function(r){return Yn.forEach(r,function(r){D$1(r.userId===n.userId);var i=Ur(e.serializer,r);return jr(t,n.userId,i).next(function(){});});});});});},/**
       * Ensures that every document in the remote document cache has a corresponding sentinel row
       * with a sequence number. Missing rows are given the most recently used sequence number.
       */t.prototype.ensureSequenceNumbers=function(t){var e=t.store(ci.store),n=t.store(si.store);return t.store(hi.store).get(hi.key).next(function(t){var r=[];return n.Xs(function(n,i){var o=new K$1(n),s=function(t){return [0,Ar(t)];}(o);r.push(e.get(s).next(function(n){return n?Yn.resolve():function(n){return e.put(new ci(0,Ar(n),t.highestListenSequenceNumber));}(o);}));}).next(function(){return Yn.Dn(r);});});},t.prototype.createCollectionParentIndex=function(t,e){// Create the index.
  t.createObjectStore(fi.store,{keyPath:fi.keyPath});var n=e.store(fi.store),r=new $r(),i=function i(t){if(r.add(t)){var e=t.S(),i=t.p();return n.put({collectionId:e,parent:Ar(i)});}};// Helper to add an index entry iff we haven't already written it.
  // Index existing remote documents.
  return e.store(si.store).Xs({Js:!0},function(t,e){var n=new K$1(t);return i(n.p());}).next(function(){return e.store(ri.store).Xs({Js:!0},function(t,e){t[0];var n=t[1],r=(t[2],kr(n));return i(r.p());});});},t.prototype.rewriteCanonicalIds=function(t){var e=this,n=t.store(ai.store);return n.Xs(function(t,r){var i=Cr(r),o=Mr(e.serializer,i);return n.put(o);});},t;}(),Zr=function Zr(t,e){this.seconds=t,this.nanoseconds=e;},ti=function ti(t,/** Whether to allow shared access from multiple tabs. */e,n){this.ownerId=t,this.allowTabSynchronization=e,this.leaseTimestampMs=n;};/**
   * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
   * Also used for in-memory caching by IndexedDbIndexManager and initial index population
   * in indexeddb_schema.ts
   */ /**
   * Name of the IndexedDb object store.
   *
   * Note that the name 'owner' is chosen to ensure backwards compatibility with
   * older clients that only supported single locked access to the persistence
   * layer.
   */ti.store="owner",/**
       * The key string used for the single object that exists in the
       * DbPrimaryClient store.
       */ti.key="owner";var ei=function ei(/**
       * The normalized user ID to which this queue belongs.
       */t,/**
       * An identifier for the highest numbered batch that has been acknowledged
       * by the server. All MutationBatches in this queue with batchIds less
       * than or equal to this value are considered to have been acknowledged by
       * the server.
       *
       * NOTE: this is deprecated and no longer used by the code.
       */e,/**
       * A stream token that was previously sent by the server.
       *
       * See StreamingWriteRequest in datastore.proto for more details about
       * usage.
       *
       * After sending this token, earlier tokens may not be used anymore so
       * only a single stream token is retained.
       *
       * NOTE: this is deprecated and no longer used by the code.
       */n){this.userId=t,this.lastAcknowledgedBatchId=e,this.lastStreamToken=n;};/** Name of the IndexedDb object store.  */ei.store="mutationQueues",/** Keys are automatically assigned via the userId property. */ei.keyPath="userId";/**
   * An object to be stored in the 'mutations' store in IndexedDb.
   *
   * Represents a batch of user-level mutations intended to be sent to the server
   * in a single write. Each user-level batch gets a separate DbMutationBatch
   * with a new batchId.
   */var ni=function ni(/**
       * The normalized user ID to which this batch belongs.
       */t,/**
       * An identifier for this batch, allocated using an auto-generated key.
       */e,/**
       * The local write time of the batch, stored as milliseconds since the
       * epoch.
       */n,/**
       * A list of "mutations" that represent a partial base state from when this
       * write batch was initially created. During local application of the write
       * batch, these baseMutations are applied prior to the real writes in order
       * to override certain document fields from the remote document cache. This
       * is necessary in the case of non-idempotent writes (e.g. `increment()`
       * transforms) to make sure that the local view of the modified documents
       * doesn't flicker if the remote document cache receives the result of the
       * non-idempotent write before the write is removed from the queue.
       *
       * These mutations are never sent to the backend.
       */r,/**
       * A list of mutations to apply. All mutations will be applied atomically.
       *
       * Mutations are serialized via toMutation().
       */i){this.userId=t,this.batchId=e,this.localWriteTimeMs=n,this.baseMutations=r,this.mutations=i;};/** Name of the IndexedDb object store.  */ni.store="mutations",/** Keys are automatically assigned via the userId, batchId properties. */ni.keyPath="batchId",/** The index name for lookup of mutations by user. */ni.userMutationsIndex="userMutationsIndex",/** The user mutations index is keyed by [userId, batchId] pairs. */ni.userMutationsKeyPath=["userId","batchId"];var ri=/** @class */function(){function t(){}/**
       * Creates a [userId] key for use in the DbDocumentMutations index to iterate
       * over all of a user's document mutations.
       */return t.prefixForUser=function(t){return [t];},/**
       * Creates a [userId, encodedPath] key for use in the DbDocumentMutations
       * index to iterate over all at document mutations for a given path or lower.
       */t.prefixForPath=function(t,e){return [t,Ar(e)];},/**
       * Creates a full index key of [userId, encodedPath, batchId] for inserting
       * and deleting into the DbDocumentMutations index.
       */t.key=function(t,e,n){return [t,Ar(e),n];},t;}();ri.store="documentMutations",/**
       * Because we store all the useful information for this store in the key,
       * there is no useful information to store as the value. The raw (unencoded)
       * path cannot be stored because IndexedDb doesn't store prototype
       * information.
       */ri.PLACEHOLDER=new ri();var ii=function ii(t,e){this.path=t,this.readTime=e;},oi=function oi(t,e){this.path=t,this.version=e;},si=// TODO: We are currently storing full document keys almost three times
  // (once as part of the primary key, once - partly - as `parentPath` and once
  // inside the encoded documents). During our next migration, we should
  // rewrite the primary key as parentPath + document ID which would allow us
  // to drop one value.
  function si(/**
       * Set to an instance of DbUnknownDocument if the data for a document is
       * not known, but it is known that a document exists at the specified
       * version (e.g. it had a successful update applied to it)
       */t,/**
       * Set to an instance of a DbNoDocument if it is known that no document
       * exists.
       */e,/**
       * Set to an instance of a Document if there's a cached version of the
       * document.
       */n,/**
       * Documents that were written to the remote document store based on
       * a write acknowledgment are marked with `hasCommittedMutations`. These
       * documents are potentially inconsistent with the backend's copy and use
       * the write's commit version as their document version.
       */r,/**
       * When the document was read from the backend. Undefined for data written
       * prior to schema version 9.
       */i,/**
       * The path of the collection this document is part of. Undefined for data
       * written prior to schema version 9.
       */o){this.unknownDocument=t,this.noDocument=e,this.document=n,this.hasCommittedMutations=r,this.readTime=i,this.parentPath=o;};/**
   * Represents a document that is known to exist but whose data is unknown.
   * Stored in IndexedDb as part of a DbRemoteDocument object.
   */si.store="remoteDocuments",/**
       * An index that provides access to all entries sorted by read time (which
       * corresponds to the last modification time of each row).
       *
       * This index is used to provide a changelog for Multi-Tab.
       */si.readTimeIndex="readTimeIndex",si.readTimeIndexPath="readTime",/**
       * An index that provides access to documents in a collection sorted by read
       * time.
       *
       * This index is used to allow the RemoteDocumentCache to fetch newly changed
       * documents in a collection.
       */si.collectionReadTimeIndex="collectionReadTimeIndex",si.collectionReadTimeIndexPath=["parentPath","readTime"];/**
   * Contains a single entry that has metadata about the remote document cache.
   */var ui=/**
       * @param byteSize Approximately the total size in bytes of all the documents in the document
       * cache.
       */function ui(t){this.byteSize=t;};ui.store="remoteDocumentGlobal",ui.key="remoteDocumentGlobalKey";var ai=function ai(/**
       * An auto-generated sequential numeric identifier for the query.
       *
       * Queries are stored using their canonicalId as the key, but these
       * canonicalIds can be quite long so we additionally assign a unique
       * queryId which can be used by referenced data structures (e.g.
       * indexes) to minimize the on-disk cost.
       */t,/**
       * The canonical string representing this query. This is not unique.
       */e,/**
       * The last readTime received from the Watch Service for this query.
       *
       * This is the same value as TargetChange.read_time in the protos.
       */n,/**
       * An opaque, server-assigned token that allows watching a query to be
       * resumed after disconnecting without retransmitting all the data
       * that matches the query. The resume token essentially identifies a
       * point in time from which the server should resume sending results.
       *
       * This is related to the snapshotVersion in that the resumeToken
       * effectively also encodes that value, but the resumeToken is opaque
       * and sometimes encodes additional information.
       *
       * A consequence of this is that the resumeToken should be used when
       * asking the server to reason about where this client is in the watch
       * stream, but the client should use the snapshotVersion for its own
       * purposes.
       *
       * This is the same value as TargetChange.resume_token in the protos.
       */r,/**
       * A sequence number representing the last time this query was
       * listened to, used for garbage collection purposes.
       *
       * Conventionally this would be a timestamp value, but device-local
       * clocks are unreliable and they must be able to create new listens
       * even while disconnected. Instead this should be a monotonically
       * increasing number that's incremented on each listen call.
       *
       * This is different from the queryId since the queryId is an
       * immutable identifier assigned to the Query on first use while
       * lastListenSequenceNumber is updated every time the query is
       * listened to.
       */i,/**
       * Denotes the maximum snapshot version at which the associated query view
       * contained no limbo documents.  Undefined for data written prior to
       * schema version 9.
       */o,/**
       * The query for this target.
       *
       * Because canonical ids are not unique we must store the actual query. We
       * use the proto to have an object we can persist without having to
       * duplicate translation logic to and from a `Query` object.
       */s){this.targetId=t,this.canonicalId=e,this.readTime=n,this.resumeToken=r,this.lastListenSequenceNumber=i,this.lastLimboFreeSnapshotVersion=o,this.query=s;};ai.store="targets",/** Keys are automatically assigned via the targetId property. */ai.keyPath="targetId",/** The name of the queryTargets index. */ai.queryTargetsIndexName="queryTargetsIndex",/**
       * The index of all canonicalIds to the targets that they match. This is not
       * a unique mapping because canonicalId does not promise a unique name for all
       * possible queries, so we append the targetId to make the mapping unique.
       */ai.queryTargetsKeyPath=["canonicalId","targetId"];/**
   * An object representing an association between a target and a document, or a
   * sentinel row marking the last sequence number at which a document was used.
   * Each document cached must have a corresponding sentinel row before lru
   * garbage collection is enabled.
   *
   * The target associations and sentinel rows are co-located so that orphaned
   * documents and their sequence numbers can be identified efficiently via a scan
   * of this store.
   */var ci=function ci(/**
       * The targetId identifying a target or 0 for a sentinel row.
       */t,/**
       * The path to the document, as encoded in the key.
       */e,/**
       * If this is a sentinel row, this should be the sequence number of the last
       * time the document specified by `path` was used. Otherwise, it should be
       * `undefined`.
       */n){this.targetId=t,this.path=e,this.sequenceNumber=n;};/** Name of the IndexedDb object store.  */ci.store="targetDocuments",/** Keys are automatically assigned via the targetId, path properties. */ci.keyPath=["targetId","path"],/** The index name for the reverse index. */ci.documentTargetsIndex="documentTargetsIndex",/** We also need to create the reverse index for these properties. */ci.documentTargetsKeyPath=["path","targetId"];/**
   * A record of global state tracked across all Targets, tracked separately
   * to avoid the need for extra indexes.
   *
   * This should be kept in-sync with the proto used in the iOS client.
   */var hi=function hi(/**
       * The highest numbered target id across all targets.
       *
       * See DbTarget.targetId.
       */t,/**
       * The highest numbered lastListenSequenceNumber across all targets.
       *
       * See DbTarget.lastListenSequenceNumber.
       */e,/**
       * A global snapshot version representing the last consistent snapshot we
       * received from the backend. This is monotonically increasing and any
       * snapshots received from the backend prior to this version (e.g. for
       * targets resumed with a resumeToken) should be suppressed (buffered)
       * until the backend has caught up to this snapshot version again. This
       * prevents our cache from ever going backwards in time.
       */n,/**
       * The number of targets persisted.
       */r){this.highestTargetId=t,this.highestListenSequenceNumber=e,this.lastRemoteSnapshotVersion=n,this.targetCount=r;};/**
   * The key string used for the single object that exists in the
   * DbTargetGlobal store.
   */hi.key="targetGlobalKey",hi.store="targetGlobal";/**
   * An object representing an association between a Collection id (e.g. 'messages')
   * to a parent path (e.g. '/chats/123') that contains it as a (sub)collection.
   * This is used to efficiently find all collections to query when performing
   * a Collection Group query.
   */var fi=function fi(/**
       * The collectionId (e.g. 'messages')
       */t,/**
       * The path to the parent (either a document location or an empty path for
       * a root-level collection).
       */e){this.collectionId=t,this.parent=e;};/** Name of the IndexedDb object store. */function li(t){t.createObjectStore(ci.store,{keyPath:ci.keyPath}).createIndex(ci.documentTargetsIndex,ci.documentTargetsKeyPath,{unique:!0}),// NOTE: This is unique only because the TargetId is the suffix.
  t.createObjectStore(ai.store,{keyPath:ai.keyPath}).createIndex(ai.queryTargetsIndexName,ai.queryTargetsKeyPath,{unique:!0}),t.createObjectStore(hi.store);}fi.store="collectionParents",/** Keys are automatically assigned via the collectionId, parent properties. */fi.keyPath=["collectionId","parent"];var pi=function pi(// Note: Previous schema versions included a field
  // "lastProcessedDocumentChangeId". Don't use anymore.
  /** The auto-generated client id assigned at client startup. */t,/** The last time this state was updated. */e,/** Whether the client's network connection is enabled. */n,/** Whether this client is running in a foreground tab. */r){this.clientId=t,this.updateTimeMs=e,this.networkEnabled=n,this.inForeground=r;};/** Name of the IndexedDb object store. */pi.store="clientMetadata",/** Keys are automatically assigned via the clientId properties. */pi.keyPath="clientId";var di=__spreadArrays(__spreadArrays(__spreadArrays([ei.store,ni.store,ri.store,si.store,ai.store,ti.store,hi.store,ci.store],[pi.store]),[ui.store]),[fi.store]),vi=/** @class */function(){function t(){/**
           * An in-memory copy of the index entries we've already written since the SDK
           * launched. Used to avoid re-writing the same entry repeatedly.
           *
           * This is *NOT* a complete cache of what's in persistence and so can never be used to
           * satisfy reads.
           */this.Xr=new $r();}/**
       * Adds a new entry to the collection parent index.
       *
       * Repeated calls for the same collectionPath should be avoided within a
       * transaction as IndexedDbIndexManager only caches writes once a transaction
       * has been committed.
       */return t.prototype.Ar=function(t,e){var n=this;if(!this.Xr.has(e)){var r=e.S(),i=e.p();t.Qn(function(){// Add the collection to the in memory cache only if the transaction was
  // successfully committed.
  n.Xr.add(e);});var o={collectionId:r,parent:Ar(i)};return yi(t).put(o);}return Yn.resolve();},t.prototype.os=function(t,e){var n=[],r=IDBKeyRange.bound([e,""],[O$1(e),""],/*lowerOpen=*/!1,/*upperOpen=*/!0);return yi(t).zs(r).next(function(t){for(var r=0,i=t;r<i.length;r++){var o=i[r];// This collectionId guard shouldn't be necessary (and isn't as long
  // as we're running in a real browser), but there's a bug in
  // indexeddbshim that breaks our range in our tests running in node:
  // https://github.com/axemclion/IndexedDBShim/issues/334
  if(o.collectionId!==e)break;n.push(kr(o.parent));}return n;});},t;}();// V2 is no longer usable (see comment at top of file)
  // Visible for testing
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
   */ /**
   * A persisted implementation of IndexManager.
   */ /**
   * Helper to get a typed SimpleDbStore for the collectionParents
   * document store.
   */function yi(t){return Ni.Ms(t,fi.store);}/**
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
   */ /** Offset to ensure non-overlapping target ids. */ /**
   * Generates monotonically increasing target IDs for sending targets to the
   * watch stream.
   *
   * The client constructs two generators, one for the target cache, and one for
   * for the sync engine (to generate limbo documents targets). These
   * generators produce non-overlapping IDs (by using even and odd IDs
   * respectively).
   *
   * By separating the target ID space, the query cache can generate target IDs
   * that persist across client restarts, while sync engine can independently
   * generate in-memory target IDs that are transient and can be reused after a
   * restart.
   */var mi=/** @class */function(){function t(t){this.Zr=t;}return t.prototype.next=function(){return this.Zr+=2,this.Zr;},t.to=function(){// The target cache generator must return '2' in its first call to `next()`
  // as there is no differentiation in the protocol layer between an unset
  // number and the number '0'. If we were to sent a target with target ID
  // '0', the backend would consider it unset and replace it with its own ID.
  return new t(0);},t.eo=function(){// Sync engine assigns target IDs for limbo document detection.
  return new t(-1);},t;}(),gi=/** @class */function(){function t(t,e){this.dr=t,this.serializer=e;}// PORTING NOTE: We don't cache global metadata for the target cache, since
  // some of it (in particular `highestTargetId`) can be modified by secondary
  // tabs. We could perhaps be more granular (and e.g. still cache
  // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
  // to IndexedDb whenever we need to read metadata. We can revisit if it turns
  // out to have a meaningful performance impact.
  return t.prototype.no=function(t){var e=this;return this.so(t).next(function(n){var r=new mi(n.highestTargetId);return n.highestTargetId=r.next(),e.io(t,n).next(function(){return n.highestTargetId;});});},t.prototype.ro=function(t){return this.so(t).next(function(t){return B.I(new G$1(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds));});},t.prototype.oo=function(t){return this.so(t).next(function(t){return t.highestListenSequenceNumber;});},t.prototype.ho=function(t,e,n){var r=this;return this.so(t).next(function(i){return i.highestListenSequenceNumber=e,n&&(i.lastRemoteSnapshotVersion=n.A()),e>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=e),r.io(t,i);});},t.prototype.ao=function(t,e){var n=this;return this.uo(t,e).next(function(){return n.so(t).next(function(r){return r.targetCount+=1,n.co(e,r),n.io(t,r);});});},t.prototype.lo=function(t,e){return this.uo(t,e);},t.prototype._o=function(t,e){var n=this;return this.fo(t,e.targetId).next(function(){return wi(t).delete(e.targetId);}).next(function(){return n.so(t);}).next(function(e){return D$1(e.targetCount>0),e.targetCount-=1,n.io(t,e);});},/**
       * Drops any targets with sequence number less than or equal to the upper bound, excepting those
       * present in `activeTargetIds`. Document associations for the removed targets are also removed.
       * Returns the number of targets removed.
       */t.prototype.hr=function(t,e,n){var r=this,i=0,o=[];return wi(t).Xs(function(s,u){var a=Cr(u);a.sequenceNumber<=e&&null===n.get(a.targetId)&&(i++,o.push(r._o(t,a)));}).next(function(){return Yn.Dn(o);}).next(function(){return i;});},/**
       * Call provided function with each `TargetData` that we have cached.
       */t.prototype.pe=function(t,e){return wi(t).Xs(function(t,n){var r=Cr(n);e(r);});},t.prototype.so=function(t){return bi(t).get(hi.key).next(function(t){return D$1(null!==t),t;});},t.prototype.io=function(t,e){return bi(t).put(hi.key,e);},t.prototype.uo=function(t,e){return wi(t).put(Mr(this.serializer,e));},/**
       * In-place updates the provided metadata to account for values in the given
       * TargetData. Saving is done separately. Returns true if there were any
       * changes to the metadata.
       */t.prototype.co=function(t,e){var n=!1;return t.targetId>e.highestTargetId&&(e.highestTargetId=t.targetId,n=!0),t.sequenceNumber>e.highestListenSequenceNumber&&(e.highestListenSequenceNumber=t.sequenceNumber,n=!0),n;},t.prototype.do=function(t){return this.so(t).next(function(t){return t.targetCount;});},t.prototype.wo=function(t,e){// Iterating by the canonicalId may yield more than one result because
  // canonicalId values are not required to be unique per target. This query
  // depends on the queryTargets index to be efficient.
  var n=tt(e),r=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]),i=null;return wi(t).Xs({range:r,index:ai.queryTargetsIndexName},function(t,n,r){var o=Cr(n);// After finding a potential match, check that the target is
  // actually equal to the requested target.
  et(e,o.target)&&(i=o,r.done());}).next(function(){return i;});},t.prototype.To=function(t,e,n){var r=this,i=[],o=Ii(t);// PORTING NOTE: The reverse index (documentsTargets) is maintained by
  // IndexedDb.
  return e.forEach(function(e){var s=Ar(e.path);i.push(o.put(new ci(n,s))),i.push(r.dr.Eo(t,n,e));}),Yn.Dn(i);},t.prototype.Io=function(t,e,n){var r=this,i=Ii(t);// PORTING NOTE: The reverse index (documentsTargets) is maintained by
  // IndexedDb.
  return Yn.forEach(e,function(e){var o=Ar(e.path);return Yn.Dn([i.delete([n,o]),r.dr.mo(t,n,e)]);});},t.prototype.fo=function(t,e){var n=Ii(t),r=IDBKeyRange.bound([e],[e+1],/*lowerOpen=*/!1,/*upperOpen=*/!0);return n.delete(r);},t.prototype.Ao=function(t,e){var n=IDBKeyRange.bound([e],[e+1],/*lowerOpen=*/!1,/*upperOpen=*/!0),r=Ii(t),i=Et();return r.Xs({range:n,Js:!0},function(t,e,n){var r=kr(t[1]),o=new W$1(r);i=i.add(o);}).next(function(){return i;});},t.prototype.Nr=function(t,e){var n=Ar(e.path),r=IDBKeyRange.bound([n],[O$1(n)],/*lowerOpen=*/!1,/*upperOpen=*/!0),i=0;return Ii(t).Xs({index:ci.documentTargetsIndex,Js:!0,range:r},function(t,e,n){var r=t[0];// Having a sentinel row for a document does not count as containing that document;
  // For the target cache, containing the document means the document is part of some
  // target.
  t[1];0!==r&&(i++,n.done());}).next(function(){return i>0;});},/**
       * Looks up a TargetData entry by target ID.
       *
       * @param targetId The target ID of the TargetData entry to look up.
       * @return The cached TargetData entry, or null if the cache has no entry for
       * the target.
       */ // PORTING NOTE: Multi-tab only.
  t.prototype.Me=function(t,e){return wi(t).get(e).next(function(t){return t?Cr(t):null;});},t;}();/**
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
   */ /**
   * Helper to get a typed SimpleDbStore for the queries object store.
   */function wi(t){return Ni.Ms(t,ai.store);}/**
   * Helper to get a typed SimpleDbStore for the target globals object store.
   */function bi(t){return Ni.Ms(t,hi.store);}/**
   * Helper to get a typed SimpleDbStore for the document target object store.
   */function Ii(t){return Ni.Ms(t,ci.store);}/**
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
   */var Ei="Failed to obtain exclusive access to the persistence layer. To allow shared access, make sure to invoke `enablePersistence()` with `synchronizeTabs:true` in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",Ti=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).vr=t,r.Ro=n,r;}return __extends(n,e),n;}(Zn),Ni=/** @class */function(){function t(/**
       * Whether to synchronize the in-memory state of multiple tabs and share
       * access to local persistence.
       */e,n,r,i,o,s,u,a,c,/**
       * If set to true, forcefully obtains database access. Existing tabs will
       * no longer be able to access IndexedDB.
       */h){if(this.allowTabSynchronization=e,this.persistenceKey=n,this.clientId=r,this.Es=o,this.window=s,this.document=u,this.Po=c,this.Vo=h,this.yo=null,this.po=!1,this.isPrimary=!1,this.networkEnabled=!0,/** Our window.unload handler, if registered. */this.bo=null,this.inForeground=!1,/** Our 'visibilitychange' listener if registered. */this.vo=null,/** The client metadata refresh task. */this.So=null,/** The last time we garbage collected the client metadata object store. */this.Do=Number.NEGATIVE_INFINITY,/** A listener to notify on primary state changes. */this.Co=function(t){return Promise.resolve();},!t.Fs())throw new j(q$1.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.dr=new Di(this,i),this.No=n+"main",this.serializer=new xr(a),this.Fo=new or(this.No,10,new Jr(this.serializer)),this.ko=new gi(this.dr,this.serializer),this.Gn=new vi(),this.jn=new Kr(this.serializer,this.Gn),this.window&&this.window.localStorage?this.xo=this.window.localStorage:(this.xo=null,!1===h&&T$1("IndexedDbPersistence","LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."));}return t.Ms=function(t,e){if(t instanceof Ti)return or.Ms(t.vr,e);throw _();},/**
       * Attempt to start IndexedDb persistence.
       *
       * @return {Promise<void>} Whether persistence was enabled.
       */t.prototype.start=function(){var t=this;// NOTE: This is expected to fail sometimes (in the case of another tab
  // already having the persistence lock), so it's the first thing we should
  // do.
  return this.$o().then(function(){if(!t.isPrimary&&!t.allowTabSynchronization)// Fail `start()` if `synchronizeTabs` is disabled and we cannot
  // obtain the primary lease.
  throw new j(q$1.FAILED_PRECONDITION,Ei);return t.Mo(),t.Oo(),t.Lo(),t.runTransaction("getHighestListenSequenceNumber","readonly",function(e){return t.ko.oo(e);});}).then(function(e){t.yo=new nr(e,t.Po);}).then(function(){t.po=!0;}).catch(function(e){return t.Fo&&t.Fo.close(),Promise.reject(e);});},/**
       * Registers a listener that gets called when the primary state of the
       * instance changes. Upon registering, this listener is invoked immediately
       * with the current primary state.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype.qo=function(t){var r=this;return this.Co=function(i){return __awaiter$1(r,void 0,void 0,function(){return __generator$1(this,function(e){return this.tr?[2/*return*/,t(i)]:[2/*return*/];});});},t(this.isPrimary);},/**
       * Registers a listener that gets called when the database receives a
       * version change event indicating that it has deleted.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype.Bo=function(t){var r=this;this.Fo.qs(function(i){return __awaiter$1(r,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:return null===i.newVersion?[4/*yield*/,t()]:[3/*break*/,2];case 1:e.sent(),e.label=2;case 2:return [2/*return*/];}});});});},/**
       * Adjusts the current network state in the client's metadata, potentially
       * affecting the primary lease.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype.Uo=function(t){var r=this;this.networkEnabled!==t&&(this.networkEnabled=t,// Schedule a primary lease refresh for immediate execution. The eventual
  // lease update will be propagated via `primaryStateListener`.
  this.Es.hi(function(){return __awaiter$1(r,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return this.tr?[4/*yield*/,this.$o()]:[3/*break*/,2];case 1:t.sent(),t.label=2;case 2:return [2/*return*/];}});});}));},/**
       * Updates the client metadata in IndexedDb and attempts to either obtain or
       * extend the primary lease for the local client. Asynchronously notifies the
       * primary state listener if the client either newly obtained or released its
       * primary lease.
       */t.prototype.$o=function(){var t=this;return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",function(e){return _i(e).put(new pi(t.clientId,Date.now(),t.networkEnabled,t.inForeground)).next(function(){if(t.isPrimary)return t.Qo(e).next(function(e){e||(t.isPrimary=!1,t.Es.Vi(function(){return t.Co(!1);}));});}).next(function(){return t.Wo(e);}).next(function(n){return t.isPrimary&&!n?t.jo(e).next(function(){return !1;}):!!n&&t.Ko(e).next(function(){return !0;});});}).catch(function(e){if(ar(e))// Proceed with the existing state. Any subsequent access to
  // IndexedDB will verify the lease.
  return E$1("IndexedDbPersistence","Failed to extend owner lease: ",e),t.isPrimary;if(!t.allowTabSynchronization)throw e;return E$1("IndexedDbPersistence","Releasing owner lease after error during lease refresh",e),/* isPrimary= */!1;}).then(function(e){t.isPrimary!==e&&t.Es.Vi(function(){return t.Co(e);}),t.isPrimary=e;});},t.prototype.Qo=function(t){var e=this;return Ai(t).get(ti.key).next(function(t){return Yn.resolve(e.Go(t));});},t.prototype.zo=function(t){return _i(t).delete(this.clientId);},/**
       * If the garbage collection threshold has passed, prunes the
       * RemoteDocumentChanges and the ClientMetadata store based on the last update
       * time of all clients.
       */t.prototype.Ho=function(){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o,s=this;return __generator$1(this,function(n){switch(n.label){case 0:return !this.isPrimary||this.Yo(this.Do,18e5)?[3/*break*/,2]:(this.Do=Date.now(),[4/*yield*/,this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",function(e){var n=t.Ms(e,pi.store);return n.zs().next(function(t){var e=s.Jo(t,18e5),r=t.filter(function(t){return -1===e.indexOf(t);});// Delete metadata for clients that are no longer considered active.
  return Yn.forEach(r,function(t){return n.delete(t.clientId);}).next(function(){return r;});});}).catch(function(){return [];})]);case 1:// Delete potential leftover entries that may continue to mark the
  // inactive clients as zombied in LocalStorage.
  // Ideally we'd delete the IndexedDb and LocalStorage zombie entries for
  // the client atomically, but we can't. So we opt to delete the IndexedDb
  // entries first to avoid potentially reviving a zombied client.
  if(e=n.sent(),this.xo)for(r=0,i=e;r<i.length;r++){o=i[r],this.xo.removeItem(this.Xo(o.clientId));}n.label=2;case 2:return [2/*return*/];}});});},/**
       * Schedules a recurring timer to update the client metadata and to either
       * extend or acquire the primary lease if the client is eligible.
       */t.prototype.Lo=function(){var t=this;this.So=this.Es.vs("client_metadata_refresh"/* ClientMetadataRefresh */,4e3,function(){return t.$o().then(function(){return t.Ho();}).then(function(){return t.Lo();});});},/** Checks whether `client` is the local client. */t.prototype.Go=function(t){return !!t&&t.ownerId===this.clientId;},/**
       * Evaluate the state of all active clients and determine whether the local
       * client is or can act as the holder of the primary lease. Returns whether
       * the client is eligible for the lease, but does not actually acquire it.
       * May return 'false' even if there is no active leaseholder and another
       * (foreground) client should become leaseholder instead.
       */t.prototype.Wo=function(t){var e=this;return this.Vo?Yn.resolve(!0):Ai(t).get(ti.key).next(function(n){// A client is eligible for the primary lease if:
  // - its network is enabled and the client's tab is in the foreground.
  // - its network is enabled and no other client's tab is in the
  //   foreground.
  // - every clients network is disabled and the client's tab is in the
  //   foreground.
  // - every clients network is disabled and no other client's tab is in
  //   the foreground.
  // - the `forceOwningTab` setting was passed in.
  if(null!==n&&e.Yo(n.leaseTimestampMs,5e3)&&!e.Zo(n.ownerId)){if(e.Go(n)&&e.networkEnabled)return !0;if(!e.Go(n)){if(!n.allowTabSynchronization)// Fail the `canActAsPrimary` check if the current leaseholder has
  // not opted into multi-tab synchronization. If this happens at
  // client startup, we reject the Promise returned by
  // `enablePersistence()` and the user can continue to use Firestore
  // with in-memory persistence.
  // If this fails during a lease refresh, we will instead block the
  // AsyncQueue from executing further operations. Note that this is
  // acceptable since mixing & matching different `synchronizeTabs`
  // settings is not supported.
  // TODO(b/114226234): Remove this check when `synchronizeTabs` can
  // no longer be turned off.
  throw new j(q$1.FAILED_PRECONDITION,Ei);return !1;}}return !(!e.networkEnabled||!e.inForeground)||_i(t).zs().next(function(t){return void 0===e.Jo(t,5e3).find(function(t){if(e.clientId!==t.clientId){var n=!e.networkEnabled&&t.networkEnabled,r=!e.inForeground&&t.inForeground,i=e.networkEnabled===t.networkEnabled;if(n||r&&i)return !0;}return !1;});});}).next(function(t){return e.isPrimary!==t&&E$1("IndexedDbPersistence","Client "+(t?"is":"is not")+" eligible for a primary lease."),t;});},t.prototype.th=function(){return __awaiter$1(this,void 0,void 0,function(){var t=this;return __generator$1(this,function(e){switch(e.label){case 0:// The shutdown() operations are idempotent and can be called even when
  // start() aborted (e.g. because it couldn't acquire the persistence lease).
  return this.po=!1,this.eh(),this.So&&(this.So.cancel(),this.So=null),this.nh(),this.sh(),[4/*yield*/,this.runTransaction("shutdown","readwrite",function(e){return t.jo(e).next(function(){return t.zo(e);});}).catch(function(t){E$1("IndexedDbPersistence","Proceeding with shutdown despite failure: ",t);})];case 1:// The shutdown() operations are idempotent and can be called even when
  // start() aborted (e.g. because it couldn't acquire the persistence lease).
  return e.sent(),this.Fo.close(),// Remove the entry marking the client as zombied from LocalStorage since
  // we successfully deleted its metadata from IndexedDb.
  this.ih(),[2/*return*/];}});});},/**
       * Returns clients that are not zombied and have an updateTime within the
       * provided threshold.
       */t.prototype.Jo=function(t,e){var n=this;return t.filter(function(t){return n.Yo(t.updateTimeMs,e)&&!n.Zo(t.clientId);});},/**
       * Returns the IDs of the clients that are currently active. If multi-tab
       * is not supported, returns an array that only contains the local client's
       * ID.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype.rh=function(){var t=this;return this.runTransaction("getActiveClients","readonly",function(e){return _i(e).zs().next(function(e){return t.Jo(e,18e5).map(function(t){return t.clientId;});});});},Object.defineProperty(t.prototype,"tr",{get:function get(){return this.po;},enumerable:!1,configurable:!0}),t.prototype.oh=function(t){return Fr.Tr(t,this.serializer,this.Gn,this.dr);},t.prototype.hh=function(){return this.ko;},t.prototype.ah=function(){return this.jn;},t.prototype.uh=function(){return this.Gn;},t.prototype.runTransaction=function(t,e,n){var r=this;E$1("IndexedDbPersistence","Starting transaction:",t);var i,o="readonly"===e?"readonly":"readwrite";// Do all transactions as readwrite against all object stores, since we
  // are the only reader/writer.
  return this.Fo.runTransaction(o,di,function(o){return i=new Ti(o,r.yo?r.yo.next():nr.Ts),"readwrite-primary"===e?r.Qo(i).next(function(t){return !!t||r.Wo(i);}).next(function(e){if(!e)throw T$1("Failed to obtain primary lease for action '"+t+"'."),r.isPrimary=!1,r.Es.Vi(function(){return r.Co(!1);}),new j(q$1.FAILED_PRECONDITION,Jn);return n(i);}).next(function(t){return r.Ko(i).next(function(){return t;});}):r.lh(i).next(function(){return n(i);});}).then(function(t){return i.Wn(),t;});},/**
       * Verifies that the current tab is the primary leaseholder or alternatively
       * that the leaseholder has opted into multi-tab synchronization.
       */ // TODO(b/114226234): Remove this check when `synchronizeTabs` can no longer
  // be turned off.
  t.prototype.lh=function(t){var e=this;return Ai(t).get(ti.key).next(function(t){if(null!==t&&e.Yo(t.leaseTimestampMs,5e3)&&!e.Zo(t.ownerId)&&!e.Go(t)&&!(e.Vo||e.allowTabSynchronization&&t.allowTabSynchronization))throw new j(q$1.FAILED_PRECONDITION,Ei);});},/**
       * Obtains or extends the new primary lease for the local client. This
       * method does not verify that the client is eligible for this lease.
       */t.prototype.Ko=function(t){var e=new ti(this.clientId,this.allowTabSynchronization,Date.now());return Ai(t).put(ti.key,e);},t.Fs=function(){return or.Fs();},/** Checks the primary lease and removes it if we are the current primary. */t.prototype.jo=function(t){var e=this,n=Ai(t);return n.get(ti.key).next(function(t){return e.Go(t)?(E$1("IndexedDbPersistence","Releasing primary lease."),n.delete(ti.key)):Yn.resolve();});},/** Verifies that `updateTimeMs` is within `maxAgeMs`. */t.prototype.Yo=function(t,e){var n=Date.now();return !(t<n-e||t>n&&(T$1("Detected an update time that is in the future: "+t+" > "+n),1));},t.prototype.Mo=function(){var t=this;null!==this.document&&"function"==typeof this.document.addEventListener&&(this.vo=function(){t.Es.hi(function(){return t.inForeground="visible"===t.document.visibilityState,t.$o();});},this.document.addEventListener("visibilitychange",this.vo),this.inForeground="visible"===this.document.visibilityState);},t.prototype.nh=function(){this.vo&&(this.document.removeEventListener("visibilitychange",this.vo),this.vo=null);},/**
       * Attaches a window.unload handler that will synchronously write our
       * clientId to a "zombie client id" location in LocalStorage. This can be used
       * by tabs trying to acquire the primary lease to determine that the lease
       * is no longer valid even if the timestamp is recent. This is particularly
       * important for the refresh case (so the tab correctly re-acquires the
       * primary lease). LocalStorage is used for this rather than IndexedDb because
       * it is a synchronous API and so can be used reliably from  an unload
       * handler.
       */t.prototype.Oo=function(){var t,e=this;"function"==typeof(null===(t=this.window)||void 0===t?void 0:t.addEventListener)&&(this.bo=function(){// Note: In theory, this should be scheduled on the AsyncQueue since it
  // accesses internal state. We execute this code directly during shutdown
  // to make sure it gets a chance to run.
  e.eh(),e.Es.hi(function(){return e.th();});},this.window.addEventListener("unload",this.bo));},t.prototype.sh=function(){this.bo&&(this.window.removeEventListener("unload",this.bo),this.bo=null);},/**
       * Returns whether a client is "zombied" based on its LocalStorage entry.
       * Clients become zombied when their tab closes without running all of the
       * cleanup logic in `shutdown()`.
       */t.prototype.Zo=function(t){var e;try{var n=null!==(null===(e=this.xo)||void 0===e?void 0:e.getItem(this.Xo(t)));return E$1("IndexedDbPersistence","Client '"+t+"' "+(n?"is":"is not")+" zombied in LocalStorage"),n;}catch(t){// Gracefully handle if LocalStorage isn't working.
  return T$1("IndexedDbPersistence","Failed to get zombied client id.",t),!1;}},/**
       * Record client as zombied (a client that had its tab closed). Zombied
       * clients are ignored during primary tab selection.
       */t.prototype.eh=function(){if(this.xo)try{this.xo.setItem(this.Xo(this.clientId),String(Date.now()));}catch(t){// Gracefully handle if LocalStorage isn't available / working.
  T$1("Failed to set zombie client id.",t);}},/** Removes the zombied client entry if it exists. */t.prototype.ih=function(){if(this.xo)try{this.xo.removeItem(this.Xo(this.clientId));}catch(t){// Ignore
  }},t.prototype.Xo=function(t){return "firestore_zombie_"+this.persistenceKey+"_"+t;},t;}();/**
   * Oldest acceptable age in milliseconds for client metadata before the client
   * is considered inactive and its associated data is garbage collected.
   */ /**
   * Helper to get a typed SimpleDbStore for the primary client object store.
   */function Ai(t){return Ni.Ms(t,ti.store);}/**
   * Helper to get a typed SimpleDbStore for the client metadata object store.
   */function _i(t){return Ni.Ms(t,pi.store);}/** Provides LRU functionality for IndexedDB persistence. */var Di=/** @class */function(){function t(t,e){this.db=t,this.Yi=new Nr(this,e);}return t.prototype.ir=function(t){var e=this._h(t);return this.db.hh().do(t).next(function(t){return e.next(function(e){return t+e;});});},t.prototype._h=function(t){var e=0;return this.or(t,function(t){e++;}).next(function(){return e;});},t.prototype.pe=function(t,e){return this.db.hh().pe(t,e);},t.prototype.or=function(t,e){return this.fh(t,function(t,n){return e(n);});},t.prototype.Eo=function(t,e,n){return ki(t,n);},t.prototype.mo=function(t,e,n){return ki(t,n);},t.prototype.hr=function(t,e,n){return this.db.hh().hr(t,e,n);},t.prototype.Dr=function(t,e){return ki(t,e);},/**
       * Returns true if anything would prevent this document from being garbage
       * collected, given that the document in question is not present in any
       * targets and has a sequence number less than or equal to the upper bound for
       * the collection run.
       */t.prototype.dh=function(t,e){return function(t,e){var n=!1;return zr(t).Zs(function(r){return qr(t,r,e).next(function(t){return t&&(n=!0),Yn.resolve(!t);});}).next(function(){return n;});}(t,e);},t.prototype.ar=function(t,e){var n=this,r=this.db.ah().jr(),i=[],o=0;return this.fh(t,function(s,u){if(u<=e){var a=n.dh(t,s).next(function(e){if(!e)// Our size accounting requires us to read all documents before
  // removing them.
  return o++,r.On(t,s).next(function(){return r.Mn(s),Ii(t).delete([0,Ar(s.path)]);});});i.push(a);}}).next(function(){return Yn.Dn(i);}).next(function(){return r.apply(t);}).next(function(){return o;});},t.prototype.removeTarget=function(t,e){var n=e.Z(t.Ro);return this.db.hh().lo(t,n);},t.prototype.wh=function(t,e){return ki(t,e);},/**
       * Call provided function for each document in the cache that is 'orphaned'. Orphaned
       * means not a part of any target, so the only entry in the target-document index for
       * that document will be the sentinel row (targetId 0), which will also have the sequence
       * number for the last time the document was accessed.
       */t.prototype.fh=function(t,e){var n,r=Ii(t),i=nr.Ts;return r.Xs({index:ci.documentTargetsIndex},function(t,r){var o=t[0],s=(t[1],r.path),u=r.sequenceNumber;0===o?(// if nextToReport is valid, report it, this is a new key so the
  // last one must not be a member of any targets.
  i!==nr.Ts&&e(new W$1(kr(n)),i),// set nextToReport to be this sequence number. It's the next one we
  // might report, if we don't find any targets for this document.
  // Note that the sequence number must be defined when the targetId
  // is 0.
  i=u,n=s):// set nextToReport to be invalid, we know we don't need to report
  // this one since we found a target for it.
  i=nr.Ts;}).next(function(){// Since we report sequence numbers after getting to the next key, we
  // need to check if the last key we iterated over was an orphaned
  // document and report it.
  i!==nr.Ts&&e(new W$1(kr(n)),i);});},t.prototype.cr=function(t){return this.db.ah().zr(t);},t;}();function ki(t,e){return Ii(t).put(/**
   * @return A value suitable for writing a sentinel row in the target-document
   * store.
   */function(t,e){return new ci(0,Ar(t.path),e);}(e,t.Ro));}/**
   * Generates a string used as a prefix when storing data in IndexedDB and
   * LocalStorage.
   */function xi(t,e){// Use two different prefix formats:
  //   * firestore / persistenceKey / projectID . databaseID / ...
  //   * firestore / persistenceKey / projectID / ...
  // projectIDs are DNS-compatible names and cannot contain dots
  // so there's no danger of collisions.
  var n=t.projectId;return t.i||(n+="."+t.database),"firestore/"+e+"/"+n+"/"/**
   * Implements `LocalStore` interface.
   *
   * Note: some field defined in this class might have public access level, but
   * the class is not exported so they are only accessible from this module.
   * This is useful to implement optional features (like bundles) in free
   * functions, such that they are tree-shakeable.
   */;}var Si=/** @class */function(){function t(/** Manages our in-memory or durable persistence. */t,e,n){this.persistence=t,this.Th=e,/**
               * Maps a targetID to data about its target.
               *
               * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
               * of `applyRemoteEvent()` idempotent.
               */this.Eh=new ht(P$1),/** Maps a target to its targetID. */ // TODO(wuandy): Evaluate if TargetId can be part of Target.
  this.Ih=new F$1(function(t){return tt(t);},et),/**
               * The read time of the last entry processed by `getNewDocumentChanges()`.
               *
               * PORTING NOTE: This is only used for multi-tab synchronization.
               */this.mh=B.min(),this.Kn=t.oh(n),this.Ah=t.ah(),this.ko=t.hh(),this.Rh=new tr(this.Ah,this.Kn,this.persistence.uh()),this.Th.Ph(this.Rh);}return t.prototype.Vh=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o=this;return __generator$1(this,function(n){switch(n.label){case 0:return e=this.Kn,r=this.Rh,[4/*yield*/,this.persistence.runTransaction("Handle user change","readonly",function(n){// Swap out the mutation queue, grabbing the pending mutation batches
  // before and after.
  var i;return o.Kn.yr(n).next(function(s){return i=s,e=o.persistence.oh(t),// Recreate our LocalDocumentsView using the new
  // MutationQueue.
  r=new tr(o.Ah,e,o.persistence.uh()),e.yr(n);}).next(function(t){for(var e=[],o=[],s=Et(),u=0,a=i// Union the old/new changed keys.
  ;u<a.length;u++){var c=a[u];e.push(c.batchId);for(var h=0,f=c.mutations;h<f.length;h++){var l=f[h];s=s.add(l.key);}}for(var p=0,d=t;p<d.length;p++){var v=d[p];o.push(v.batchId);for(var y=0,m=v.mutations;y<m.length;y++){var g=m[y];s=s.add(g.key);}}// Return the set of all (potentially) changed documents and the list
  // of mutation batch IDs that were affected by change.
  return r.Xn(n,s).next(function(t){return {gh:t,yh:e,ph:o};});});})];case 1:return i=n.sent(),[2/*return*/,(this.Kn=e,this.Rh=r,this.Th.Ph(this.Rh),i)];}});});},t.prototype.bh=function(t){var e,n=this,r=G$1.now(),i=t.reduce(function(t,e){return t.add(e.key);},Et());return this.persistence.runTransaction("Locally write mutations","readwrite",function(o){return n.Rh.Xn(o,i).next(function(i){e=i;for(// For non-idempotent mutations (such as `FieldValue.increment()`),
  // we record the base state in a separate patch mutation. This is
  // later used to guarantee consistent values and prevents flicker
  // even if the backend sends us an update that already includes our
  // transform.
  var s=[],u=0,a=t;u<a.length;u++){var c=a[u],h=Je(c,e.get(c.key));null!=h&&// NOTE: The base state should only be applied if there's some
  // existing document to override, so use a Precondition of
  // exists=true
  s.push(new nn(c.key,h,ln(h.proto.mapValue),Qe.exists(!0)));}return n.Kn.mr(o,r,s,t);});}).then(function(t){var n=t.mn(e);return {batchId:t.batchId,Nn:n};});},t.prototype.vh=function(t){var e=this;return this.persistence.runTransaction("Acknowledge batch","readwrite-primary",function(n){var r=t.batch.keys(),i=e.Ah.jr({Gr:!0});return e.Sh(n,t,i).next(function(){return i.apply(n);}).next(function(){return e.Kn.Cr(n);}).next(function(){return e.Rh.Xn(n,r);});});},t.prototype.Dh=function(t){var e=this;return this.persistence.runTransaction("Reject batch","readwrite-primary",function(n){var r;return e.Kn.Rr(n,t).next(function(t){return D$1(null!==t),r=t.keys(),e.Kn.br(n,t);}).next(function(){return e.Kn.Cr(n);}).next(function(){return e.Rh.Xn(n,r);});});},t.prototype.gr=function(){var t=this;return this.persistence.runTransaction("Get highest unacknowledged batch id","readonly",function(e){return t.Kn.gr(e);});},t.prototype.ro=function(){var t=this;return this.persistence.runTransaction("Get last remote snapshot version","readonly",function(e){return t.ko.ro(e);});},t.prototype.Ch=function(e){var n=this,r=e.X,i=this.Eh;return this.persistence.runTransaction("Apply remote event","readwrite-primary",function(o){var s=n.Ah.jr({Gr:!0});// Reset newTargetDataByTargetMap in case this transaction gets re-run.
  i=n.Eh;var u=[];e.Qt.forEach(function(e,s){var a=i.get(s);if(a){// Only update the remote keys if the target is still active. This
  // ensures that we can persist the updated target data along with
  // the updated assignment.
  u.push(n.ko.Io(o,e.Xt,s).next(function(){return n.ko.To(o,e.Yt,s);}));var c=e.resumeToken;// Update the resume token if the change includes one.
  if(c.H()>0){var h=a.tt(c,r).Z(o.Ro);i=i.nt(s,h),// Update the target data if there are target changes (or if
  // sufficient time has passed since the last update).
  t.Nh(a,h,e)&&u.push(n.ko.lo(o,h));}}});var a=yt(),c=Et();// HACK: The only reason we allow a null snapshot version is so that we
  // can synthesize remote events when we get permission denied errors while
  // trying to resolve the state of a locally cached document that is in
  // limbo.
  if(e.jt.forEach(function(t,e){c=c.add(t);}),// Each loop iteration only affects its "own" doc, so it's safe to get all the remote
  // documents in advance in a single call.
  u.push(s.getEntries(o,c).next(function(t){e.jt.forEach(function(i,c){var h=t.get(i);// Note: The order of the steps below is important, since we want
  // to ensure that rejected limbo resolutions (which fabricate
  // NoDocuments with SnapshotVersion.min()) never add documents to
  // cache.
  c instanceof vn&&c.version.isEqual(B.min())?(// NoDocuments with SnapshotVersion.min() are used in manufactured
  // events. We remove these documents from cache since we lost
  // access.
  s.Mn(i,r),a=a.nt(i,c)):null==h||c.version.o(h.version)>0||0===c.version.o(h.version)&&h.hasPendingWrites?(s.xn(c,r),a=a.nt(i,c)):E$1("LocalStore","Ignoring outdated watch update for ",i,". Current version:",h.version," Watch version:",c.version),e.Kt.has(i)&&u.push(n.persistence.dr.wh(o,i));});})),!r.isEqual(B.min())){var h=n.ko.ro(o).next(function(t){return n.ko.ho(o,o.Ro,r);});u.push(h);}return Yn.Dn(u).next(function(){return s.apply(o);}).next(function(){return n.Rh.Zn(o,a);});}).then(function(t){return n.Eh=i,t;});},/**
       * Returns true if the newTargetData should be persisted during an update of
       * an active target. TargetData should always be persisted when a target is
       * being released and should not call this function.
       *
       * While the target is active, TargetData updates can be omitted when nothing
       * about the target has changed except metadata like the resume token or
       * snapshot version. Occasionally it's worth the extra write to prevent these
       * values from getting too stale after a crash, but this doesn't have to be
       * too frequent.
       */t.Nh=function(t,e,n){// Always persist target data if we don't already have a resume token.
  return D$1(e.resumeToken.H()>0),0===t.resumeToken.H()||// Don't allow resume token changes to be buffered indefinitely. This
  // allows us to be reasonably up-to-date after a crash and avoids needing
  // to loop over all active queries on shutdown. Especially in the browser
  // we may not get time to do anything interesting while the current tab is
  // closing.
  e.X.m()-t.X.m()>=this.Fh||n.Yt.size+n.Jt.size+n.Xt.size>0;},t.prototype.kh=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o,s,u,a,c,h=this;return __generator$1(this,function(n){switch(n.label){case 0:return n.trys.push([0,2,,3]),[4/*yield*/,this.persistence.runTransaction("notifyLocalViewChanges","readwrite",function(e){return Yn.forEach(t,function(t){return Yn.forEach(t.us,function(n){return h.persistence.dr.Eo(e,t.targetId,n);}).next(function(){return Yn.forEach(t.cs,function(n){return h.persistence.dr.mo(e,t.targetId,n);});});});})];case 1:return n.sent(),[3/*break*/,3];case 2:if(!ar(e=n.sent()))throw e;// If `notifyLocalViewChanges` fails, we did not advance the sequence
  // number for the documents that were included in this transaction.
  // This might trigger them to be deleted earlier than they otherwise
  // would have, but it should not invalidate the integrity of the data.
  return E$1("LocalStore","Failed to update sequence numbers: "+e),[3/*break*/,3];case 3:for(r=0,i=t;r<i.length;r++){o=i[r],s=o.targetId,o.fromCache||(u=this.Eh.get(s),a=u.X,c=u.et(a),// Advance the last limbo free snapshot version
  this.Eh=this.Eh.nt(s,c));}return [2/*return*/];}});});},t.prototype.xh=function(t){var e=this;return this.persistence.runTransaction("Get next mutation batch","readonly",function(n){return void 0===t&&(t=-1),e.Kn.Vr(n,t);});},t.prototype.$h=function(t){var e=this;return this.persistence.runTransaction("read document","readonly",function(n){return e.Rh.zn(n,t);});},t.prototype.Mh=function(t){var e=this;return this.persistence.runTransaction("Allocate target","readwrite",function(n){var r;return e.ko.wo(n,t).next(function(i){return i?(// This target has been listened to previously, so reuse the
  // previous targetID.
  // TODO(mcg): freshen last accessed date?
  r=i,Yn.resolve(r)):e.ko.no(n).next(function(i){return r=new st(t,i,0/* Listen */,n.Ro),e.ko.ao(n,r).next(function(){return r;});});});}).then(function(n){// If Multi-Tab is enabled, the existing target data may be newer than
  // the in-memory data
  var r=e.Eh.get(n.targetId);return (null===r||n.X.o(r.X)>0)&&(e.Eh=e.Eh.nt(n.targetId,n),e.Ih.set(t,n.targetId)),n;});},t.prototype.wo=function(t,e){var n=this.Ih.get(e);return void 0!==n?Yn.resolve(this.Eh.get(n)):this.ko.wo(t,e);},t.prototype.Oh=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o,s=this;return __generator$1(this,function(n){switch(n.label){case 0:e=this.Eh.get(t),i=r?"readwrite":"readwrite-primary",n.label=1;case 1:return n.trys.push([1,4,,5]),r?[3/*break*/,3]:[4/*yield*/,this.persistence.runTransaction("Release target",i,function(t){return s.persistence.dr.removeTarget(t,e);})];case 2:n.sent(),n.label=3;case 3:return [3/*break*/,5];case 4:if(!ar(o=n.sent()))throw o;// All `releaseTarget` does is record the final metadata state for the
  // target, but we've been recording this periodically during target
  // activity. If we lose this write this could cause a very slight
  // difference in the order of target deletion during GC, but we
  // don't define exact LRU semantics so this is acceptable.
  return E$1("LocalStore","Failed to update sequence numbers for target "+t+": "+o),[3/*break*/,5];case 5:return this.Eh=this.Eh.remove(t),this.Ih.delete(e.target),[2/*return*/];}});});},t.prototype.Lh=function(t,e){var n=this,r=B.min(),i=Et();return this.persistence.runTransaction("Execute query","readonly",function(o){return n.wo(o,Tn(t)).next(function(t){if(t)return r=t.lastLimboFreeSnapshotVersion,n.ko.Ao(o,t.targetId).next(function(t){i=t;});}).next(function(){return n.Th.es(o,t,e?r:B.min(),e?i:Et());}).next(function(t){return {documents:t,qh:i};});});},t.prototype.Sh=function(t,e,n){var r=this,i=e.batch,o=i.keys(),s=Yn.resolve();return o.forEach(function(r){s=s.next(function(){return n.On(t,r);}).next(function(t){var o=t,s=e.Rn.get(r);D$1(null!==s),(!o||o.version.o(s)<0)&&(o=i.Tn(r,o,e))&&// We use the commitVersion as the readTime rather than the
  // document's updateTime since the updateTime is not advanced
  // for updates that do not modify the underlying document.
  n.xn(o,e.An);});}),s.next(function(){return r.Kn.br(t,i);});},t.prototype.er=function(t){var e=this;return this.persistence.runTransaction("Collect garbage","readwrite-primary",function(n){return t.ur(n,e.Eh);});},t;}();/**
   * The maximum time to leave a resume token buffered without writing it out.
   * This value is arbitrary: it's long enough to avoid several writes
   * (possibly indefinitely if updates come more frequently than this) but
   * short enough that restarting after crashing will still have a pretty
   * recent resume token.
   */ // PORTING NOTE: Multi-Tab only.
  function Pi(t,e){var n=k$1(t),r=k$1(n.ko),i=n.Eh.get(e);return i?Promise.resolve(i.target):n.persistence.runTransaction("Get target data","readonly",function(t){return r.Me(t,e).next(function(t){return t?t.target:null;});});}/**
   * Returns the set of documents that have been updated since the last call.
   * If this is the first call, returns the set of changes since client
   * initialization. Further invocations will return document that have changed
   * since the prior call.
   */ // PORTING NOTE: Multi-Tab only.
  /**
   * Verifies the error thrown by a LocalStore operation. If a LocalStore
   * operation fails because the primary lease has been taken by another client,
   * we ignore the error (the persistence layer will immediately call
   * `applyPrimaryLease` to propagate the primary state change). All other errors
   * are re-thrown.
   *
   * @param err An error returned by a LocalStore operation.
   * @return A Promise that resolves after we recovered, or the original error.
   */function Li(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){if(t.code!==q$1.FAILED_PRECONDITION||t.message!==Jn)throw t;return E$1("LocalStore","Unexpectedly lost primary lease"),[2/*return*/];});});}/**
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
   */ /**
   * A collection of references to a document from some kind of numbered entity
   * (either a target ID or batch ID). As references are added to or removed from
   * the set corresponding events are emitted to a registered garbage collector.
   *
   * Each reference is represented by a DocumentReference object. Each of them
   * contains enough information to uniquely identify the reference. They are all
   * stored primarily in a set sorted by key. A document is considered garbage if
   * there's no references in that set (this can be efficiently checked thanks to
   * sorting by key).
   *
   * ReferenceSet also keeps a secondary set that contains references sorted by
   * IDs. This one is used to efficiently implement removal of all references by
   * some target ID.
   */Si.Fh=3e8;var Oi=/** @class */function(){function t(){// A set of outstanding references to a document sorted by key.
  this.Bh=new pt(Ri.Uh),// A set of outstanding references to a document sorted by target id.
  this.Qh=new pt(Ri.Wh)/** Returns true if the reference set contains no references. */;}return t.prototype._=function(){return this.Bh._();},/** Adds a reference to the given document key for the given ID. */t.prototype.Eo=function(t,e){var n=new Ri(t,e);this.Bh=this.Bh.add(n),this.Qh=this.Qh.add(n);},/** Add references to the given document keys for the given ID. */t.prototype.jh=function(t,e){var n=this;t.forEach(function(t){return n.Eo(t,e);});},/**
       * Removes a reference to the given document key for the given
       * ID.
       */t.prototype.mo=function(t,e){this.Kh(new Ri(t,e));},t.prototype.Gh=function(t,e){var n=this;t.forEach(function(t){return n.mo(t,e);});},/**
       * Clears all references with a given ID. Calls removeRef() for each key
       * removed.
       */t.prototype.zh=function(t){var e=this,n=new W$1(new K$1([])),r=new Ri(n,t),i=new Ri(n,t+1),o=[];return this.Qh.vt([r,i],function(t){e.Kh(t),o.push(t.key);}),o;},t.prototype.Hh=function(){var t=this;this.Bh.forEach(function(e){return t.Kh(e);});},t.prototype.Kh=function(t){this.Bh=this.Bh.delete(t),this.Qh=this.Qh.delete(t);},t.prototype.Yh=function(t){var e=new W$1(new K$1([])),n=new Ri(e,t),r=new Ri(e,t+1),i=Et();return this.Qh.vt([n,r],function(t){i=i.add(t.key);}),i;},t.prototype.Nr=function(t){var e=new Ri(t,0),n=this.Bh.Dt(e);return null!==n&&t.isEqual(n.key);},t;}(),Ri=/** @class */function(){function t(t,e){this.key=t,this.Jh=e/** Compare by key then by ID */;}return t.Uh=function(t,e){return W$1.P(t.key,e.key)||P$1(t.Jh,e.Jh);},/** Compare by ID then by key */t.Wh=function(t,e){return P$1(t.Jh,e.Jh)||W$1.P(t.key,e.key);},t;}(),Vi=/** @class */function(){function t(t){this.uid=t;}return t.prototype.Er=function(){return null!=this.uid;},/**
       * Returns a key representing this user, suitable for inclusion in a
       * dictionary.
       */t.prototype.Xh=function(){return this.Er()?"uid:"+this.uid:"anonymous-user";},t.prototype.isEqual=function(t){return t.uid===this.uid;},t;}();/** A user with a null UID. */Vi.UNAUTHENTICATED=new Vi(null),// TODO(mikelehen): Look into getting a proper uid-equivalent for
  // non-FirebaseAuth providers.
  Vi.Zh=new Vi("google-credentials-uid"),Vi.ta=new Vi("first-party-uid");/**
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
   */var Ui=function Ui(t,e){this.user=e,this.type="OAuth",this.ea={},// Set the headers using Object Literal notation to avoid minification
  this.ea.Authorization="Bearer "+t;},Ci=/** @class */function(){function t(){/**
           * Stores the listener registered with setChangeListener()
           * This isn't actually necessary since the UID never changes, but we use this
           * to verify the listen contract is adhered to in tests.
           */this.na=null;}return t.prototype.getToken=function(){return Promise.resolve(null);},t.prototype.sa=function(){},t.prototype.ia=function(t){this.na=t,// Fire with initial user.
  t(Vi.UNAUTHENTICATED);},t.prototype.ra=function(){this.na=null;},t;}(),Mi=/** @class */function(){function t(t){var e=this;/**
           * The auth token listener registered with FirebaseApp, retained here so we
           * can unregister it.
           */this.oa=null,/** Tracks the current User. */this.currentUser=Vi.UNAUTHENTICATED,this.ha=!1,/**
               * Counter used to detect if the token changed while a getToken request was
               * outstanding.
               */this.aa=0,/** The listener registered with setChangeListener(). */this.na=null,this.forceRefresh=!1,this.oa=function(){e.aa++,e.currentUser=e.ua(),e.ha=!0,e.na&&e.na(e.currentUser);},this.aa=0,this.auth=t.getImmediate({optional:!0}),this.auth?this.auth.addAuthTokenListener(this.oa):(// if auth is not available, invoke tokenListener once with null token
  this.oa(null),t.get().then(function(t){e.auth=t,e.oa&&// tokenListener can be removed by removeChangeListener()
  e.auth.addAuthTokenListener(e.oa);},function(){}));}return t.prototype.getToken=function(){var t=this,e=this.aa,n=this.forceRefresh;// Take note of the current value of the tokenCounter so that this method
  // can fail (with an ABORTED error) if there is a token change while the
  // request is outstanding.
  return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(function(n){// Cancel the request since the token changed while the request was
  // outstanding so the response is potentially for a previous user (which
  // user, we can't be sure).
  return t.aa!==e?(E$1("FirebaseCredentialsProvider","getToken aborted due to token change."),t.getToken()):n?(D$1("string"==typeof n.accessToken),new Ui(n.accessToken,t.currentUser)):null;}):Promise.resolve(null);},t.prototype.sa=function(){this.forceRefresh=!0;},t.prototype.ia=function(t){this.na=t,// Fire the initial event
  this.ha&&t(this.currentUser);},t.prototype.ra=function(){this.auth&&this.auth.removeAuthTokenListener(this.oa),this.oa=null,this.na=null;},// Auth.getUid() can return null even with a user logged in. It is because
  // getUid() is synchronous, but the auth code populating Uid is asynchronous.
  // This method should only be called in the AuthTokenListener callback
  // to guarantee to get the actual user.
  t.prototype.ua=function(){var t=this.auth&&this.auth.getUid();return D$1(null===t||"string"==typeof t),new Vi(t);},t;}(),Fi=/** @class */function(){function t(t,e){this.ca=t,this.la=e,this.type="FirstParty",this.user=Vi.ta;}return Object.defineProperty(t.prototype,"ea",{get:function get(){var t={"X-Goog-AuthUser":this.la},e=this.ca.auth._a([]);return e&&(t.Authorization=e),t;},enumerable:!1,configurable:!0}),t;}(),qi=/** @class */function(){function t(t,e){this.ca=t,this.la=e;}return t.prototype.getToken=function(){return Promise.resolve(new Fi(this.ca,this.la));},t.prototype.ia=function(t){// Fire with initial uid.
  t(Vi.ta);},t.prototype.ra=function(){},t.prototype.sa=function(){},t;}(),ji=/** @class */function(){function t(t,e,n,r,i,o){this.Es=t,this.fa=n,this.da=r,this.wa=i,this.listener=o,this.state=0/* Initial */,/**
               * A close count that's incremented every time the stream is closed; used by
               * getCloseGuardedDispatcher() to invalidate callbacks that happen after
               * close.
               */this.Ta=0,this.Ea=null,this.stream=null,this.wi=new ir(t,e)/**
       * Returns true if start() has been called and no error has occurred. True
       * indicates the stream is open or in the process of opening (which
       * encompasses respecting backoff, getting auth tokens, and starting the
       * actual RPC). Use isOpen() to determine if the stream is open and ready for
       * outbound requests.
       */;}return t.prototype.Ia=function(){return 1/* Starting */===this.state||2/* Open */===this.state||4/* Backoff */===this.state;},/**
       * Returns true if the underlying RPC is open (the onOpen() listener has been
       * called) and the stream is ready for outbound requests.
       */t.prototype.ma=function(){return 2/* Open */===this.state;},/**
       * Starts the RPC. Only allowed if isStarted() returns false. The stream is
       * not immediately ready for use: onOpen() will be invoked when the RPC is
       * ready for outbound requests, at which point isOpen() will return true.
       *
       * When start returns, isStarted() will return true.
       */t.prototype.start=function(){3/* Error */!==this.state?this.auth():this.Aa();},/**
       * Stops the RPC. This call is idempotent and allowed regardless of the
       * current isStarted() state.
       *
       * When stop returns, isStarted() and isOpen() will both return false.
       */t.prototype.stop=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return this.Ia()?[4/*yield*/,this.close(0/* Initial */)]:[3/*break*/,2];case 1:t.sent(),t.label=2;case 2:return [2/*return*/];}});});},/**
       * After an error the stream will usually back off on the next attempt to
       * start it. If the error warrants an immediate restart of the stream, the
       * sender can use this to indicate that the receiver should not back off.
       *
       * Each error will call the onClose() listener. That function can decide to
       * inhibit backoff if required.
       */t.prototype.Ra=function(){this.state=0/* Initial */,this.wi.reset();},/**
       * Marks this stream as idle. If no further actions are performed on the
       * stream for one minute, the stream will automatically close itself and
       * notify the stream's onClose() handler with Status.OK. The stream will then
       * be in a !isStarted() state, requiring the caller to start the stream again
       * before further use.
       *
       * Only streams that are in state 'Open' can be marked idle, as all other
       * states imply pending network operations.
       */t.prototype.Pa=function(){var t=this;// Starts the idle time if we are in state 'Open' and are not yet already
  // running a timer (in which case the previous idle timeout still applies).
  this.ma()&&null===this.Ea&&(this.Ea=this.Es.vs(this.fa,6e4,function(){return t.Va();}));},/** Sends a message to the underlying stream. */t.prototype.ga=function(t){this.ya(),this.stream.send(t);},/** Called by the idle timer when the stream should close due to inactivity. */t.prototype.Va=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){return this.ma()?[2/*return*/,this.close(0/* Initial */)]:[2/*return*/];});});},/** Marks the stream as active again. */t.prototype.ya=function(){this.Ea&&(this.Ea.cancel(),this.Ea=null);},/**
       * Closes the stream and cleans up as necessary:
       *
       * * closes the underlying GRPC stream;
       * * calls the onClose handler with the given 'error';
       * * sets internal stream state to 'finalState';
       * * adjusts the backoff timer based on the error
       *
       * A new stream can be opened by calling start().
       *
       * @param finalState the intended state of the stream after closing.
       * @param error the error the connection was closed with.
       */t.prototype.close=function(t,r){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:// Notify the listener that the stream closed.
  // Cancel any outstanding timers (they're guaranteed not to execute).
  return this.ya(),this.wi.cancel(),// Invalidates any stream-related callbacks (e.g. from auth or the
  // underlying stream), guaranteeing they won't execute.
  this.Ta++,3/* Error */!==t?// If this is an intentional close ensure we don't delay our next connection attempt.
  this.wi.reset():r&&r.code===q$1.RESOURCE_EXHAUSTED?(// Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
  T$1(r.toString()),T$1("Using maximum backoff delay to prevent overloading the backend."),this.wi.ys()):r&&r.code===q$1.UNAUTHENTICATED&&// "unauthenticated" error means the token was rejected. Try force refreshing it in case it
  // just expired.
  this.wa.sa(),// Clean up the underlying stream because we are no longer interested in events.
  null!==this.stream&&(this.pa(),this.stream.close(),this.stream=null),// This state must be assigned before calling onClose() to allow the callback to
  // inhibit backoff or otherwise manipulate the state in its non-started state.
  this.state=t,[4/*yield*/,this.listener.ba(r)];case 1:// Cancel any outstanding timers (they're guaranteed not to execute).
  // Notify the listener that the stream closed.
  return e.sent(),[2/*return*/];}});});},/**
       * Can be overridden to perform additional cleanup before the stream is closed.
       * Calling super.tearDown() is not required.
       */t.prototype.pa=function(){},t.prototype.auth=function(){var t=this;this.state=1/* Starting */;var e=this.va(this.Ta),n=this.Ta;// TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
  this.wa.getToken().then(function(e){// Stream can be stopped while waiting for authentication.
  // TODO(mikelehen): We really should just use dispatchIfNotClosed
  // and let this dispatch onto the queue, but that opened a spec test can
  // of worms that I don't want to deal with in this PR.
  t.Ta===n&&// Normally we'd have to schedule the callback on the AsyncQueue.
  // However, the following calls are safe to be called outside the
  // AsyncQueue since they don't chain asynchronous calls
  t.Sa(e);},function(n){e(function(){var e=new j(q$1.UNKNOWN,"Fetching auth token failed: "+n.message);return t.Da(e);});});},t.prototype.Sa=function(t){var e=this,n=this.va(this.Ta);this.stream=this.Ca(t),this.stream.Na(function(){n(function(){return e.state=2/* Open */,e.listener.Na();});}),this.stream.ba(function(t){n(function(){return e.Da(t);});}),this.stream.onMessage(function(t){n(function(){return e.onMessage(t);});});},t.prototype.Aa=function(){var t=this;this.state=4/* Backoff */,this.wi.ps(function(){return __awaiter$1(t,void 0,void 0,function(){return __generator$1(this,function(t){return this.state=0/* Initial */,this.start(),[2/*return*/];});});});},// Visible for tests
  t.prototype.Da=function(t){// In theory the stream could close cleanly, however, in our current model
  // we never expect this to happen because if we stop a stream ourselves,
  // this callback will never be called. To prevent cases where we retry
  // without a backoff accidentally, we set the stream to error in all cases.
  return E$1("PersistentStream","close with error: "+t),this.stream=null,this.close(3/* Error */,t);},/**
       * Returns a "dispatcher" function that dispatches operations onto the
       * AsyncQueue but only runs them if closeCount remains unchanged. This allows
       * us to turn auth / stream callbacks into no-ops if the stream is closed /
       * re-opened, etc.
       */t.prototype.va=function(t){var e=this;return function(n){e.Es.hi(function(){return e.Ta===t?n():(E$1("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve());});};},t;}(),Gi=/** @class */function(e){function n(t,n,r,i,o){var s=this;return (s=e.call(this,t,"listen_stream_connection_backoff"/* ListenStreamConnectionBackoff */,"listen_stream_idle"/* ListenStreamIdle */,n,r,o)||this).serializer=i,s;}return __extends(n,e),n.prototype.Ca=function(t){return this.da.Fa("Listen",t);},n.prototype.onMessage=function(t){// A successful response means the stream is healthy
  this.wi.reset();var e=function(t,e){var n;if("targetChange"in e){e.targetChange;// proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
  // if unset
  var r=function(t){return "NO_CHANGE"===t?0/* NoChange */:"ADD"===t?1/* Added */:"REMOVE"===t?2/* Removed */:"CURRENT"===t?3/* Current */:"RESET"===t?4/* Reset */:_();}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],o=function(t,e){return t.Oe?(D$1(void 0===e||"string"==typeof e),rt.fromBase64String(e||"")):(D$1(void 0===e||e instanceof Uint8Array),rt.fromUint8Array(e||new Uint8Array()));}(t,e.targetChange.resumeToken),s=e.targetChange.cause,u=s&&function(t){var e=void 0===t.code?q$1.UNKNOWN:ct(t.code);return new j(e,t.message||"");}(s);n=new Lt(r,i,o,u||null);}else if("documentChange"in e){e.documentChange;var a=e.documentChange;a.document,a.document.name,a.document.updateTime;var c=de(t,a.document.name),h=he(a.document.updateTime),f=new hn({mapValue:{fields:a.document.fields}}),l=new dn(c,h,f,{}),p=a.targetIds||[],d=a.removedTargetIds||[];n=new St(p,d,l.key,l);}else if("documentDelete"in e){e.documentDelete;var v=e.documentDelete;v.document;var y=de(t,v.document),m=v.readTime?he(v.readTime):B.min(),g=new vn(y,m),w=v.removedTargetIds||[];n=new St([],w,g.key,g);}else if("documentRemove"in e){e.documentRemove;var b=e.documentRemove;b.document;var I=de(t,b.document),E=b.removedTargetIds||[];n=new St([],E,I,null);}else {if(!("filter"in e))return _();e.filter;var T=e.filter;T.targetId;var N=T.count||0,A=new ut(N),k=T.targetId;n=new Pt(k,A);}return n;}(this.serializer,t),n=function(t){// We have only reached a consistent snapshot for the entire stream if there
  // is a read_time set and it applies to all targets (i.e. the list of
  // targets is empty). The backend is guaranteed to send such responses.
  if(!("targetChange"in t))return B.min();var e=t.targetChange;return e.targetIds&&e.targetIds.length?B.min():e.readTime?he(e.readTime):B.min();}(t);return this.listener.ka(e,n);},/**
       * Registers interest in the results of the given target. If the target
       * includes a resumeToken it will be included in the request. Results that
       * affect the target will be streamed back as WatchChange messages that
       * reference the targetId.
       */n.prototype.xa=function(t){var e={};e.database=me(this.serializer),e.addTarget=function(t,e){var n,r=e.target;return (n=nt(r)?{documents:Ee(t,r)}:{query:Te(t,r)}).targetId=e.targetId,e.resumeToken.H()>0&&(n.resumeToken=ae(t,e.resumeToken)),n;}(this.serializer,t);var n=function(t,e){var n=function(t,e){switch(e){case 0/* Listen */:return null;case 1/* ExistenceFilterMismatch */:return "existence-filter-mismatch";case 2/* LimboResolution */:return "limbo-document";default:return _();}}(0,e.J);return null==n?null:{"goog-listen-tags":n};}(this.serializer,t);n&&(e.labels=n),this.ga(e);},/**
       * Unregisters interest in the results of the target associated with the
       * given targetId.
       */n.prototype.$a=function(t){var e={};e.database=me(this.serializer),e.removeTarget=t,this.ga(e);},n;}(ji),Bi=/** @class */function(e){function n(t,n,r,i,o){var s=this;return (s=e.call(this,t,"write_stream_connection_backoff"/* WriteStreamConnectionBackoff */,"write_stream_idle"/* WriteStreamIdle */,n,r,o)||this).serializer=i,s.Ma=!1,s;}return __extends(n,e),Object.defineProperty(n.prototype,"Oa",{/**
           * Tracks whether or not a handshake has been successfully exchanged and
           * the stream is ready to accept mutations.
           */get:function get(){return this.Ma;},enumerable:!1,configurable:!0}),// Override of PersistentStream.start
  n.prototype.start=function(){this.Ma=!1,this.lastStreamToken=void 0,e.prototype.start.call(this);},n.prototype.pa=function(){this.Ma&&this.La([]);},n.prototype.Ca=function(t){return this.da.Fa("Write",t);},n.prototype.onMessage=function(t){if(// Always capture the last stream token.
  D$1(!!t.streamToken),this.lastStreamToken=t.streamToken,this.Ma){// A successful first write response means the stream is healthy,
  // Note, that we could consider a successful handshake healthy, however,
  // the write itself might be causing an error we want to back off from.
  this.wi.reset();var e=function(t,e){return t&&t.length>0?(D$1(void 0!==e),t.map(function(t){return function(t,e){// NOTE: Deletes don't have an updateTime.
  var n=t.updateTime?he(t.updateTime):he(e);n.isEqual(B.min())&&(// The Firestore Emulator currently returns an update time of 0 for
  // deletes of non-existing documents (rather than null). This breaks the
  // test "get deleted doc while offline with source=cache" as NoDocuments
  // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
  // TODO(#2149): Remove this when Emulator is fixed
  n=he(e));var r=null;return t.transformResults&&t.transformResults.length>0&&(r=t.transformResults),new Xe(n,r);}(t,e);})):[];}(t.writeResults,t.commitTime),n=he(t.commitTime);return this.listener.qa(n,e);}// The first response is always the handshake response
  return D$1(!t.writeResults||0===t.writeResults.length),this.Ma=!0,this.listener.Ba();},/**
       * Sends an initial streamToken to the server, performing the handshake
       * required to make the StreamingWrite RPC work. Subsequent
       * calls should wait until onHandshakeComplete was called.
       */n.prototype.Ua=function(){// TODO(dimond): Support stream resumption. We intentionally do not set the
  // stream token on the handshake, ignoring any stream token we might have.
  var t={};t.database=me(this.serializer),this.ga(t);},/** Sends a group of mutations to the Firestore backend to apply. */n.prototype.La=function(t){var e=this,n={streamToken:this.lastStreamToken,writes:t.map(function(t){return be(e.serializer,t);})};this.ga(n);},n;}(ji),zi=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this)||this).credentials=t,i.da=n,i.serializer=r,i.Qa=!1,i;}return __extends(n,e),n.prototype.Wa=function(){if(this.Qa)throw new j(q$1.FAILED_PRECONDITION,"The client has already been terminated.");},/** Gets an auth token and invokes the provided RPC. */n.prototype.ja=function(t,e,n){var r=this;return this.Wa(),this.credentials.getToken().then(function(i){return r.da.ja(t,e,n,i);}).catch(function(t){throw t.code===q$1.UNAUTHENTICATED&&r.credentials.sa(),t;});},/** Gets an auth token and invokes the provided RPC with streamed results. */n.prototype.Ka=function(t,e,n){var r=this;return this.Wa(),this.credentials.getToken().then(function(i){return r.da.Ka(t,e,n,i);}).catch(function(t){throw t.code===q$1.UNAUTHENTICATED&&r.credentials.sa(),t;});},n.prototype.terminate=function(){this.Qa=!1;},n;}(function(){}),Ki=/** @class */function(){function t(t,e){this.ti=t,this.Ga=e,/** The current OnlineState. */this.state="Unknown"/* Unknown */,/**
               * A count of consecutive failures to open the stream. If it reaches the
               * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
               * Offline.
               */this.za=0,/**
               * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
               * transition from OnlineState.Unknown to OnlineState.Offline without waiting
               * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
               */this.Ha=null,/**
               * Whether the client should log a warning message if it fails to connect to
               * the backend (initially true, cleared after a successful stream, or if we've
               * logged the message already).
               */this.Ya=!0/**
       * Called by RemoteStore when a watch stream is started (including on each
       * backoff attempt).
       *
       * If this is the first attempt, it sets the OnlineState to Unknown and starts
       * the onlineStateTimer.
       */;}return t.prototype.Ja=function(){var t=this;0===this.za&&(this.Xa("Unknown"/* Unknown */),this.Ha=this.ti.vs("online_state_timeout"/* OnlineStateTimeout */,1e4,function(){return t.Ha=null,t.Za("Backend didn't respond within 10 seconds."),t.Xa("Offline"/* Offline */),Promise.resolve();}));},/**
       * Updates our OnlineState as appropriate after the watch stream reports a
       * failure. The first failure moves us to the 'Unknown' state. We then may
       * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
       * actually transition to the 'Offline' state.
       */t.prototype.tu=function(t){"Online"/* Online */===this.state?this.Xa("Unknown"/* Unknown */):(this.za++,this.za>=1&&(this.eu(),this.Za("Connection failed 1 times. Most recent error: "+t.toString()),this.Xa("Offline"/* Offline */)));},/**
       * Explicitly sets the OnlineState to the specified state.
       *
       * Note that this resets our timers / failure counters, etc. used by our
       * Offline heuristics, so must not be used in place of
       * handleWatchStreamStart() and handleWatchStreamFailure().
       */t.prototype.set=function(t){this.eu(),this.za=0,"Online"/* Online */===t&&(// We've connected to watch at least once. Don't warn the developer
  // about being offline going forward.
  this.Ya=!1),this.Xa(t);},t.prototype.Xa=function(t){t!==this.state&&(this.state=t,this.Ga(t));},t.prototype.Za=function(t){var e="Could not reach Cloud Firestore backend. "+t+"\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.";this.Ya?(T$1(e),this.Ya=!1):E$1("OnlineStateTracker",e);},t.prototype.eu=function(){null!==this.Ha&&(this.Ha.cancel(),this.Ha=null);},t;}(),Xi=/** @class */function(){function t(/**
       * The local store, used to fill the write pipeline with outbound mutations.
       */t,/** The client-side proxy for interacting with the backend. */r,i,o,s){var u=this;this.nu=t,this.su=r,this.ti=i,/**
               * A list of up to MAX_PENDING_WRITES writes that we have fetched from the
               * LocalStore via fillWritePipeline() and have or will send to the write
               * stream.
               *
               * Whenever writePipeline.length > 0 the RemoteStore will attempt to start or
               * restart the write stream. When the stream is established the writes in the
               * pipeline will be sent in order.
               *
               * Writes remain in writePipeline until they are acknowledged by the backend
               * and thus will automatically be re-sent if the stream is interrupted /
               * restarted before they're acknowledged.
               *
               * Write responses from the backend are linked to their originating request
               * purely based on order, and so we can just shift() writes from the front of
               * the writePipeline as we receive responses.
               */this.iu=[],/**
               * A mapping of watched targets that the client cares about tracking and the
               * user has explicitly called a 'listen' for this target.
               *
               * These targets may or may not have been sent to or acknowledged by the
               * server. On re-establishing the listen stream, these targets should be sent
               * to the server. The targets removed with unlistens are removed eagerly
               * without waiting for confirmation from the listen stream.
               */this.ru=new Map(),this.ou=null,/**
               * A set of reasons for why the RemoteStore may be offline. If empty, the
               * RemoteStore may start its network connections.
               */this.hu=new Set(),this.au=s,this.au.uu(function(t){i.hi(function(){return __awaiter$1(u,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return this.cu()?(E$1("RemoteStore","Restarting streams for network reachability change."),[4/*yield*/,this.lu()]):[3/*break*/,2];case 1:t.sent(),t.label=2;case 2:return [2/*return*/];}});});});}),this._u=new Ki(i,o),// Create streams (but note they're not started yet).
  this.fu=function(t,e,n){var r=k$1(t);return r.Wa(),new Gi(e,r.da,r.credentials,r.serializer,n);}(this.su,i,{Na:this.du.bind(this),ba:this.wu.bind(this),ka:this.Tu.bind(this)}),this.Eu=function(t,e,n){var r=k$1(t);return r.Wa(),new Bi(e,r.da,r.credentials,r.serializer,n);}(this.su,i,{Na:this.Iu.bind(this),ba:this.mu.bind(this),Ba:this.Au.bind(this),qa:this.qa.bind(this)});}/**
       * Starts up the remote store, creating streams, restoring state from
       * LocalStore, etc.
       */return t.prototype.start=function(){return this.enableNetwork();},/** Re-enables the network. Idempotent. */t.prototype.enableNetwork=function(){return this.hu.delete(0/* UserDisabled */),this.Ru();},t.prototype.Ru=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return this.cu()?(this.Pu()?this.Vu():this._u.set("Unknown"/* Unknown */),[4/*yield*/,this.gu()]):[3/*break*/,2];case 1:// This will start the write stream if necessary.
  t.sent(),t.label=2;case 2:return [2/*return*/];}});});},/**
       * Temporarily disables the network. The network can be re-enabled using
       * enableNetwork().
       */t.prototype.disableNetwork=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return this.hu.add(0/* UserDisabled */),[4/*yield*/,this.yu()];case 1:return t.sent(),// Set the OnlineState to Offline so get()s return from cache, etc.
  this._u.set("Offline"/* Offline */),[2/*return*/];}});});},t.prototype.yu=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return [4/*yield*/,this.Eu.stop()];case 1:return t.sent(),[4/*yield*/,this.fu.stop()];case 2:return t.sent(),this.iu.length>0&&(E$1("RemoteStore","Stopping write stream with "+this.iu.length+" pending writes"),this.iu=[]),this.pu(),[2/*return*/];}});});},t.prototype.th=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return E$1("RemoteStore","RemoteStore shutting down."),this.hu.add(5/* Shutdown */),[4/*yield*/,this.yu()];case 1:return t.sent(),this.au.th(),// Set the OnlineState to Unknown (rather than Offline) to avoid potentially
  // triggering spurious listener events with cached data, etc.
  this._u.set("Unknown"/* Unknown */),[2/*return*/];}});});},/**
       * Starts new listen for the given target. Uses resume token if provided. It
       * is a no-op if the target of given `TargetData` is already being listened to.
       */t.prototype.listen=function(t){this.ru.has(t.targetId)||(// Mark this as something the client is currently listening for.
  this.ru.set(t.targetId,t),this.Pu()?// The listen will be sent in onWatchStreamOpen
  this.Vu():this.fu.ma()&&this.bu(t));},/**
       * Removes the listen from server. It is a no-op if the given target id is
       * not being listened to.
       */t.prototype.vu=function(t){this.ru.delete(t),this.fu.ma()&&this.Su(t),0===this.ru.size&&(this.fu.ma()?this.fu.Pa():this.cu()&&// Revert to OnlineState.Unknown if the watch stream is not open and we
  // have no listeners, since without any listens to send we cannot
  // confirm if the stream is healthy and upgrade to OnlineState.Online.
  this._u.set("Unknown"/* Unknown */));},/** {@link TargetMetadataProvider.getTargetDataForTarget} */t.prototype.Me=function(t){return this.ru.get(t)||null;},/** {@link TargetMetadataProvider.getRemoteKeysForTarget} */t.prototype.$e=function(t){return this.Du.$e(t);},/**
       * We need to increment the the expected number of pending responses we're due
       * from watch so we wait for the ack to process any messages from this target.
       */t.prototype.bu=function(t){this.ou.de(t.targetId),this.fu.xa(t);},/**
       * We need to increment the expected number of pending responses we're due
       * from watch so we wait for the removal on the server before we process any
       * messages from this target.
       */t.prototype.Su=function(t){this.ou.de(t),this.fu.$a(t);},t.prototype.Vu=function(){this.ou=new Rt(this),this.fu.start(),this._u.Ja();},/**
       * Returns whether the watch stream should be started because it's necessary
       * and has not yet been started.
       */t.prototype.Pu=function(){return this.cu()&&!this.fu.Ia()&&this.ru.size>0;},t.prototype.cu=function(){return 0===this.hu.size;},t.prototype.pu=function(){this.ou=null;},t.prototype.du=function(){return __awaiter$1(this,void 0,void 0,function(){var t=this;return __generator$1(this,function(e){return this.ru.forEach(function(e,n){t.bu(e);}),[2/*return*/];});});},t.prototype.wu=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){return this.pu(),// If we still need the watch stream, retry the connection.
  this.Pu()?(this._u.tu(t),this.Vu()):// No need to restart watch stream because there are no active targets.
  // The online state is set to unknown because there is no active attempt
  // at establishing a connection
  this._u.set("Unknown"/* Unknown */),[2/*return*/];});});},t.prototype.Tu=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o;return __generator$1(this,function(n){switch(n.label){case 0:if(this._u.set("Online"/* Online */),!(t instanceof Lt&&2/* Removed */===t.state&&t.cause))// Mark the client as online since we got a message from the server
  return [3/*break*/,6];n.label=1;case 1:return n.trys.push([1,3,,5]),[4/*yield*/,this.Cu(t)];case 2:return n.sent(),[3/*break*/,5];case 3:return e=n.sent(),E$1("RemoteStore","Failed to remove targets %s: %s ",t.targetIds.join(","),e),[4/*yield*/,this.Nu(e)];case 4:return n.sent(),[3/*break*/,5];case 5:return [3/*break*/,13];case 6:if(t instanceof St?this.ou.Pe(t):t instanceof Pt?this.ou.De(t):this.ou.ye(t),r.isEqual(B.min()))return [3/*break*/,13];n.label=7;case 7:return n.trys.push([7,11,,13]),[4/*yield*/,this.nu.ro()];case 8:return i=n.sent(),r.o(i)>=0?[4/*yield*/,this.Fu(r)]:[3/*break*/,10];// We have received a target change with a global snapshot if the snapshot
  // version is not equal to SnapshotVersion.min().
  case 9:// We have received a target change with a global snapshot if the snapshot
  // version is not equal to SnapshotVersion.min().
  n.sent(),n.label=10;case 10:return [3/*break*/,13];case 11:return E$1("RemoteStore","Failed to raise snapshot:",o=n.sent()),[4/*yield*/,this.Nu(o)];case 12:return n.sent(),[3/*break*/,13];case 13:return [2/*return*/];}});});},/**
       * Recovery logic for IndexedDB errors that takes the network offline until
       * `op` succeeds. Retries are scheduled with backoff using
       * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
       * validated via a generic operation.
       *
       * The returned Promise is resolved once the network is disabled and before
       * any retry attempt.
       */t.prototype.Nu=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var i=this;return __generator$1(this,function(o){switch(o.label){case 0:if(!ar(t))throw t;// Disable network and raise offline snapshots
  return this.hu.add(1/* IndexedDbFailed */),[4/*yield*/,this.yu()];case 1:// Disable network and raise offline snapshots
  return o.sent(),this._u.set("Offline"/* Offline */),r||(// Use a simple read operation to determine if IndexedDB recovered.
  // Ideally, we would expose a health check directly on SimpleDb, but
  // RemoteStore only has access to persistence through LocalStore.
  r=function r(){return i.nu.ro();}),// Probe IndexedDB periodically and re-enable network
  this.ti.Vi(function(){return __awaiter$1(i,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return E$1("RemoteStore","Retrying IndexedDB access"),[4/*yield*/,r()];case 1:return t.sent(),this.hu.delete(1/* IndexedDbFailed */),[4/*yield*/,this.Ru()];case 2:return t.sent(),[2/*return*/];}});});}),[2/*return*/];}});});},/**
       * Executes `op`. If `op` fails, takes the network offline until `op`
       * succeeds. Returns after the first attempt.
       */t.prototype.ku=function(t){var e=this;return t().catch(function(n){return e.Nu(n,t);});},/**
       * Takes a batch of changes from the Datastore, repackages them as a
       * RemoteEvent, and passes that on to the listener, which is typically the
       * SyncEngine.
       */t.prototype.Fu=function(t){var e=this,n=this.ou.Fe(t);// Update in-memory resume tokens. LocalStore will update the
  // persistent view of these when applying the completed RemoteEvent.
  // Finally raise remote event
  return n.Qt.forEach(function(n,r){if(n.resumeToken.H()>0){var i=e.ru.get(r);// A watched target might have been removed already.
  i&&e.ru.set(r,i.tt(n.resumeToken,t));}}),// Re-establish listens for the targets that have been invalidated by
  // existence filter mismatches.
  n.Wt.forEach(function(t){var n=e.ru.get(t);if(n){// Clear the resume token for the target, since we're in a known mismatch
  // state.
  e.ru.set(t,n.tt(rt.Y,n.X)),// Cause a hard reset by unwatching and rewatching immediately, but
  // deliberately don't send a resume token so that we get a full update.
  e.Su(t);// Mark the target we send as being on behalf of an existence filter
  // mismatch, but don't actually retain that in listenTargets. This ensures
  // that we flag the first re-listen this way without impacting future
  // listens of this target (that might happen e.g. on reconnect).
  var r=new st(n.target,t,1/* ExistenceFilterMismatch */,n.sequenceNumber);e.bu(r);}}),this.Du.Ch(n);},/** Handles an error on a target */t.prototype.Cu=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o;return __generator$1(this,function(n){switch(n.label){case 0:e=t.cause,r=0,i=t.targetIds,n.label=1;case 1:return r<i.length?(o=i[r],this.ru.has(o)?[4/*yield*/,this.Du.xu(o,e)]:[3/*break*/,3]):[3/*break*/,5];case 2:n.sent(),this.ru.delete(o),this.ou.removeTarget(o),n.label=3;case 3:n.label=4;case 4:return r++,[3/*break*/,1];case 5:return [2/*return*/];}});});},/**
       * Attempts to fill our write pipeline with writes from the LocalStore.
       *
       * Called internally to bootstrap or refill the write pipeline and by
       * SyncEngine whenever there are new mutations to process.
       *
       * Starts the write stream if necessary.
       */t.prototype.gu=function(){return __awaiter$1(this,void 0,void 0,function(){var t,e,r;return __generator$1(this,function(n){switch(n.label){case 0:t=this.iu.length>0?this.iu[this.iu.length-1].batchId:-1,n.label=1;case 1:if(!this.$u())return [3/*break*/,7];n.label=2;case 2:return n.trys.push([2,4,,6]),[4/*yield*/,this.nu.xh(t)];case 3:return null===(e=n.sent())?(0===this.iu.length&&this.Eu.Pa(),[3/*break*/,7]):(t=e.batchId,this.Mu(e),[3/*break*/,6]);case 4:return r=n.sent(),[4/*yield*/,this.Nu(r)];case 5:return n.sent(),[3/*break*/,6];case 6:return [3/*break*/,1];case 7:return this.Ou()&&this.Lu(),[2/*return*/];}});});},/**
       * Returns true if we can add to the write pipeline (i.e. the network is
       * enabled and the write pipeline is not full).
       */t.prototype.$u=function(){return this.cu()&&this.iu.length<10;},// For testing
  t.prototype.qu=function(){return this.iu.length;},/**
       * Queues additional writes to be sent to the write stream, sending them
       * immediately if the write stream is established.
       */t.prototype.Mu=function(t){this.iu.push(t),this.Eu.ma()&&this.Eu.Oa&&this.Eu.La(t.mutations);},t.prototype.Ou=function(){return this.cu()&&!this.Eu.Ia()&&this.iu.length>0;},t.prototype.Lu=function(){this.Eu.start();},t.prototype.Iu=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){return this.Eu.Ua(),[2/*return*/];});});},t.prototype.Au=function(){return __awaiter$1(this,void 0,void 0,function(){var t,e,r;return __generator$1(this,function(n){// Send the write pipeline now that the stream is established.
  for(t=0,e=this.iu;t<e.length;t++){r=e[t],this.Eu.La(r.mutations);}return [2/*return*/];});});},t.prototype.qa=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o=this;return __generator$1(this,function(n){switch(n.label){case 0:return e=this.iu.shift(),i=Hn.from(e,t,r),[4/*yield*/,this.ku(function(){return o.Du.Bu(i);})];case 1:// It's possible that with the completion of this mutation another
  // slot has freed up.
  return n.sent(),[4/*yield*/,this.gu()];case 2:// It's possible that with the completion of this mutation another
  // slot has freed up.
  return n.sent(),[2/*return*/];}});});},t.prototype.mu=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:return t&&this.Eu.Oa?[4/*yield*/,this.Uu(t)]:[3/*break*/,2];// This error affects the actual write.
  case 1:// This error affects the actual write.
  e.sent(),e.label=2;case 2:// If the write stream closed after the write handshake completes, a write
  // operation failed and we fail the pending operation.
  // The write stream might have been started by refilling the write
  // pipeline for failed writes
  return this.Ou()&&this.Lu(),[2/*return*/];}});});},t.prototype.Uu=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i=this;return __generator$1(this,function(n){switch(n.label){case 0:return at(r=t.code)&&r!==q$1.ABORTED?(e=this.iu.shift(),// In this case it's also unlikely that the server itself is melting
  // down -- this was just a bad request so inhibit backoff on the next
  // restart.
  this.Eu.Ra(),[4/*yield*/,this.ku(function(){return i.Du.Qu(e.batchId,t);})]):[3/*break*/,3];case 1:// It's possible that with the completion of this mutation
  // another slot has freed up.
  return n.sent(),[4/*yield*/,this.gu()];case 2:// In this case it's also unlikely that the server itself is melting
  // down -- this was just a bad request so inhibit backoff on the next
  // restart.
  // It's possible that with the completion of this mutation
  // another slot has freed up.
  n.sent(),n.label=3;case 3:return [2/*return*/];}});});},t.prototype.lu=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return this.hu.add(4/* ConnectivityChange */),[4/*yield*/,this.yu()];case 1:return t.sent(),this._u.set("Unknown"/* Unknown */),this.Eu.Ra(),this.fu.Ra(),this.hu.delete(4/* ConnectivityChange */),[4/*yield*/,this.Ru()];case 2:return t.sent(),[2/*return*/];}});});},t.prototype.Wu=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:return this.ti.pi(),// Tear down and re-create our network streams. This will ensure we get a
  // fresh auth token for the new user and re-fill the write pipeline with
  // new mutations from the LocalStore (since mutations are per-user).
  E$1("RemoteStore","RemoteStore received new credentials"),this.hu.add(3/* CredentialChange */),[4/*yield*/,this.yu()];case 1:return e.sent(),this._u.set("Unknown"/* Unknown */),[4/*yield*/,this.Du.Wu(t)];case 2:return e.sent(),this.hu.delete(3/* CredentialChange */),[4/*yield*/,this.Ru()];case 3:return e.sent(),[2/*return*/];}});});},/**
       * Toggles the network state when the client gains or loses its primary lease.
       */t.prototype.ju=function(t){return __awaiter$1(this,void 0,void 0,function(){var e;return __generator$1(this,function(n){switch(n.label){case 0:return t?(this.hu.delete(2/* IsSecondary */),[4/*yield*/,this.Ru()]):[3/*break*/,2];case 1:return n.sent(),[3/*break*/,5];case 2:return (e=t)?[3/*break*/,4]:(this.hu.add(2/* IsSecondary */),[4/*yield*/,this.yu()]);case 3:n.sent(),e=this._u.set("Unknown"/* Unknown */),n.label=4;case 4:n.label=5;case 5:return [2/*return*/];}});});},t;}();/** A CredentialsProvider that always yields an empty token. */ /**
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
   */ // The format of the LocalStorage key that stores the client state is:
  //     firestore_clients_<persistence_prefix>_<instance_key>
  /** Assembles the key for a client state in WebStorage */function Qi(t,e){return "firestore_clients_"+t+"_"+e;}// The format of the WebStorage key that stores the mutation state is:
  //     firestore_mutations_<persistence_prefix>_<batch_id>
  //     (for unauthenticated users)
  // or: firestore_mutations_<persistence_prefix>_<batch_id>_<user_uid>
  // 'user_uid' is last to avoid needing to escape '_' characters that it might
  // contain.
  /** Assembles the key for a mutation batch in WebStorage */function Wi(t,e,n){var r="firestore_mutations_"+t+"_"+n;return e.Er()&&(r+="_"+e.uid),r;}// The format of the WebStorage key that stores a query target's metadata is:
  //     firestore_targets_<persistence_prefix>_<target_id>
  /** Assembles the key for a query state in WebStorage */function Hi(t,e){return "firestore_targets_"+t+"_"+e;}// The WebStorage prefix that stores the primary tab's online state. The
  // format of the key is:
  //     firestore_online_state_<persistence_prefix>
  /**
   * Holds the state of a mutation batch, including its user ID, batch ID and
   * whether the batch is 'pending', 'acknowledged' or 'rejected'.
   */ // Visible for testing
  var Yi=/** @class */function(){function t(t,e,n,r){this.user=t,this.batchId=e,this.state=n,this.error=r/**
       * Parses a MutationMetadata from its JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Ku=function(e,n,r){var i=JSON.parse(r),o="object"==_typeof(i)&&-1!==["pending","acknowledged","rejected"].indexOf(i.state)&&(void 0===i.error||"object"==_typeof(i.error)),s=void 0;return o&&i.error&&(o="string"==typeof i.error.message&&"string"==typeof i.error.code)&&(s=new j(i.error.code,i.error.message)),o?new t(e,n,i.state,s):(T$1("SharedClientState","Failed to parse mutation state for ID '"+n+"': "+r),null);},t.prototype.Gu=function(){var t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t);},t;}(),$i=/** @class */function(){function t(t,e,n){this.targetId=t,this.state=e,this.error=n/**
       * Parses a QueryTargetMetadata from its JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Ku=function(e,n){var r=JSON.parse(n),i="object"==_typeof(r)&&-1!==["not-current","current","rejected"].indexOf(r.state)&&(void 0===r.error||"object"==_typeof(r.error)),o=void 0;return i&&r.error&&(i="string"==typeof r.error.message&&"string"==typeof r.error.code)&&(o=new j(r.error.code,r.error.message)),i?new t(e,r.state,o):(T$1("SharedClientState","Failed to parse target state for ID '"+e+"': "+n),null);},t.prototype.Gu=function(){var t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t);},t;}(),Ji=/** @class */function(){function t(t,e){this.clientId=t,this.activeTargetIds=e/**
       * Parses a RemoteClientState from the JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Ku=function(e,n){for(var r=JSON.parse(n),i="object"==_typeof(r)&&r.activeTargetIds instanceof Array,o=Nt(),s=0;i&&s<r.activeTargetIds.length;++s){i=$(r.activeTargetIds[s]),o=o.add(r.activeTargetIds[s]);}return i?new t(e,o):(T$1("SharedClientState","Failed to parse client data for instance '"+e+"': "+n),null);},t;}(),Zi=/** @class */function(){function t(t,e){this.clientId=t,this.onlineState=e/**
       * Parses a SharedOnlineState from its JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Ku=function(e){var n=JSON.parse(e);return "object"==_typeof(n)&&-1!==["Unknown","Online","Offline"].indexOf(n.onlineState)&&"string"==typeof n.clientId?new t(n.clientId,n.onlineState):(T$1("SharedClientState","Failed to parse online state: "+e),null);},t;}(),to=/** @class */function(){function t(){this.activeTargetIds=Nt();}return t.prototype.zu=function(t){this.activeTargetIds=this.activeTargetIds.add(t);},t.prototype.Hu=function(t){this.activeTargetIds=this.activeTargetIds.delete(t);},/**
       * Converts this entry into a JSON-encoded format we can use for WebStorage.
       * Does not encode `clientId` as it is part of the key in WebStorage.
       */t.prototype.Gu=function(){var t={activeTargetIds:this.activeTargetIds.N(),updateTimeMs:Date.now()};return JSON.stringify(t);},t;}(),eo=/** @class */function(){function t(t,e,n,r,i){this.window=t,this.Es=e,this.persistenceKey=n,this.Yu=r,this.Du=null,this.Ga=null,this._s=null,this.Ju=this.Xu.bind(this),this.Zu=new ht(P$1),this.tr=!1,/**
               * Captures WebStorage events that occur before `start()` is called. These
               * events are replayed once `WebStorageSharedClientState` is started.
               */this.tc=[];// Escape the special characters mentioned here:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
  var o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.ec=Qi(this.persistenceKey,this.Yu),this.nc=/** Assembles the key for the current sequence number. */function(t){return "firestore_sequence_number_"+t;}(this.persistenceKey),this.Zu=this.Zu.nt(this.Yu,new to()),this.sc=new RegExp("^firestore_clients_"+o+"_([^_]*)$"),this.ic=new RegExp("^firestore_mutations_"+o+"_(\\d+)(?:_(.*))?$"),this.rc=new RegExp("^firestore_targets_"+o+"_(\\d+)$"),this.oc=/** Assembles the key for the online state of the primary tab. */function(t){return "firestore_online_state_"+t;}(this.persistenceKey),// Rather than adding the storage observer during start(), we add the
  // storage observer during initialization. This ensures that we collect
  // events before other components populate their initial state (during their
  // respective start() calls). Otherwise, we might for example miss a
  // mutation that is added after LocalStore's start() processed the existing
  // mutations but before we observe WebStorage events.
  this.window.addEventListener("storage",this.Ju);}/** Returns 'true' if WebStorage is available in the current environment. */return t.Fs=function(t){return !(!t||!t.localStorage);},t.prototype.start=function(){return __awaiter$1(this,void 0,void 0,function(){var t,e,r,i,o,s,u,a,c,h,f,l=this;return __generator$1(this,function(n){switch(n.label){case 0:return [4/*yield*/,this.Du.rh()];case 1:for(t=n.sent(),e=0,r=t;e<r.length;e++){(i=r[e])!==this.Yu&&(o=this.getItem(Qi(this.persistenceKey,i)))&&(s=Ji.Ku(i,o))&&(this.Zu=this.Zu.nt(s.clientId,s));}for(this.hc(),(u=this.storage.getItem(this.oc))&&(a=this.ac(u))&&this.uc(a),c=0,h=this.tc;c<h.length;c++){f=h[c],this.Xu(f);}return this.tc=[],// Register a window unload hook to remove the client metadata entry from
  // WebStorage even if `shutdown()` was not called.
  this.window.addEventListener("unload",function(){return l.th();}),this.tr=!0,[2/*return*/];}});});},t.prototype.ws=function(t){this.setItem(this.nc,JSON.stringify(t));},t.prototype.cc=function(){return this.lc(this.Zu);},t.prototype._c=function(t){var e=!1;return this.Zu.forEach(function(n,r){r.activeTargetIds.has(t)&&(e=!0);}),e;},t.prototype.fc=function(t){this.dc(t,"pending");},t.prototype.wc=function(t,e,n){this.dc(t,e,n),// Once a final mutation result is observed by other clients, they no longer
  // access the mutation's metadata entry. Since WebStorage replays events
  // in order, it is safe to delete the entry right after updating it.
  this.Tc(t);},t.prototype.Ec=function(t){var e="not-current";// Lookup an existing query state if the target ID was already registered
  // by another tab
  if(this._c(t)){var n=this.storage.getItem(Hi(this.persistenceKey,t));if(n){var r=$i.Ku(t,n);r&&(e=r.state);}}return this.Ic.zu(t),this.hc(),e;},t.prototype.mc=function(t){this.Ic.Hu(t),this.hc();},t.prototype.Ac=function(t){return this.Ic.activeTargetIds.has(t);},t.prototype.Rc=function(t){this.removeItem(Hi(this.persistenceKey,t));},t.prototype.Pc=function(t,e,n){this.Vc(t,e,n);},t.prototype.Vh=function(t,e,n){var r=this;e.forEach(function(t){r.Tc(t);}),this.currentUser=t,n.forEach(function(t){r.fc(t);});},t.prototype.gc=function(t){this.yc(t);},t.prototype.th=function(){this.tr&&(this.window.removeEventListener("storage",this.Ju),this.removeItem(this.ec),this.tr=!1);},t.prototype.getItem=function(t){var e=this.storage.getItem(t);return E$1("SharedClientState","READ",t,e),e;},t.prototype.setItem=function(t,e){E$1("SharedClientState","SET",t,e),this.storage.setItem(t,e);},t.prototype.removeItem=function(t){E$1("SharedClientState","REMOVE",t),this.storage.removeItem(t);},t.prototype.Xu=function(t){var r=this,i=t;// Note: The function is typed to take Event to be interface-compatible with
  // `Window.addEventListener`.
  if(i.storageArea===this.storage){if(E$1("SharedClientState","EVENT",i.key,i.newValue),i.key===this.ec)return void T$1("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Es.Vi(function(){return __awaiter$1(r,void 0,void 0,function(){var t,e,r,o,s,u;return __generator$1(this,function(n){if(this.tr){if(null!==i.key)if(this.sc.test(i.key)){if(null==i.newValue)return t=this.pc(i.key),[2/*return*/,this.bc(t,null)];if(e=this.vc(i.key,i.newValue))return [2/*return*/,this.bc(e.clientId,e)];}else if(this.ic.test(i.key)){if(null!==i.newValue&&(r=this.Sc(i.key,i.newValue)))return [2/*return*/,this.Dc(r)];}else if(this.rc.test(i.key)){if(null!==i.newValue&&(o=this.Cc(i.key,i.newValue)))return [2/*return*/,this.Nc(o)];}else if(i.key===this.oc){if(null!==i.newValue&&(s=this.ac(i.newValue)))return [2/*return*/,this.uc(s)];}else i.key===this.nc&&(u=function(t){var e=nr.Ts;if(null!=t)try{var n=JSON.parse(t);D$1("number"==typeof n),e=n;}catch(t){T$1("SharedClientState","Failed to read sequence number from WebStorage",t);}return e;}(i.newValue))!==nr.Ts&&this._s(u);}else this.tc.push(i);return [2/*return*/];});});});}},Object.defineProperty(t.prototype,"Ic",{get:function get(){return this.Zu.get(this.Yu);},enumerable:!1,configurable:!0}),t.prototype.hc=function(){this.setItem(this.ec,this.Ic.Gu());},t.prototype.dc=function(t,e,n){var r=new Yi(this.currentUser,t,e,n),i=Wi(this.persistenceKey,this.currentUser,t);this.setItem(i,r.Gu());},t.prototype.Tc=function(t){var e=Wi(this.persistenceKey,this.currentUser,t);this.removeItem(e);},t.prototype.yc=function(t){var e={clientId:this.Yu,onlineState:t};this.storage.setItem(this.oc,JSON.stringify(e));},t.prototype.Vc=function(t,e,n){var r=Hi(this.persistenceKey,t),i=new $i(t,e,n);this.setItem(r,i.Gu());},/**
       * Parses a client state key in WebStorage. Returns null if the key does not
       * match the expected key format.
       */t.prototype.pc=function(t){var e=this.sc.exec(t);return e?e[1]:null;},/**
       * Parses a client state in WebStorage. Returns 'null' if the value could not
       * be parsed.
       */t.prototype.vc=function(t,e){var n=this.pc(t);return Ji.Ku(n,e);},/**
       * Parses a mutation batch state in WebStorage. Returns 'null' if the value
       * could not be parsed.
       */t.prototype.Sc=function(t,e){var n=this.ic.exec(t),r=Number(n[1]),i=void 0!==n[2]?n[2]:null;return Yi.Ku(new Vi(i),r,e);},/**
       * Parses a query target state from WebStorage. Returns 'null' if the value
       * could not be parsed.
       */t.prototype.Cc=function(t,e){var n=this.rc.exec(t),r=Number(n[1]);return $i.Ku(r,e);},/**
       * Parses an online state from WebStorage. Returns 'null' if the value
       * could not be parsed.
       */t.prototype.ac=function(t){return Zi.Ku(t);},t.prototype.Dc=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){return t.user.uid===this.currentUser.uid?[2/*return*/,this.Du.Fc(t.batchId,t.state,t.error)]:(E$1("SharedClientState","Ignoring mutation for non-active user "+t.user.uid),[2/*return*/]);});});},t.prototype.Nc=function(t){return this.Du.kc(t.targetId,t.state,t.error);},t.prototype.bc=function(t,e){var n=this,r=e?this.Zu.nt(t,e):this.Zu.remove(t),i=this.lc(this.Zu),o=this.lc(r),s=[],u=[];return o.forEach(function(t){i.has(t)||s.push(t);}),i.forEach(function(t){o.has(t)||u.push(t);}),this.Du.xc(s,u).then(function(){n.Zu=r;});},t.prototype.uc=function(t){// We check whether the client that wrote this online state is still active
  // by comparing its client ID to the list of clients kept active in
  // IndexedDb. If a client does not update their IndexedDb client state
  // within 5 seconds, it is considered inactive and we don't emit an online
  // state event.
  this.Zu.get(t.clientId)&&this.Ga(t.onlineState);},t.prototype.lc=function(t){var e=Nt();return t.forEach(function(t,n){e=e.Ct(n.activeTargetIds);}),e;},t;}(),no=/** @class */function(){function t(){this.$c=new to(),this.Mc={},this.Ga=null,this._s=null;}return t.prototype.fc=function(t){// No op.
  },t.prototype.wc=function(t,e,n){// No op.
  },t.prototype.Ec=function(t){return this.$c.zu(t),this.Mc[t]||"not-current";},t.prototype.Pc=function(t,e,n){this.Mc[t]=e;},t.prototype.mc=function(t){this.$c.Hu(t);},t.prototype.Ac=function(t){return this.$c.activeTargetIds.has(t);},t.prototype.Rc=function(t){delete this.Mc[t];},t.prototype.cc=function(){return this.$c.activeTargetIds;},t.prototype._c=function(t){return this.$c.activeTargetIds.has(t);},t.prototype.start=function(){return this.$c=new to(),Promise.resolve();},t.prototype.Vh=function(t,e,n){// No op.
  },t.prototype.gc=function(t){// No op.
  },t.prototype.th=function(){},t.prototype.ws=function(t){},t;}(),ro=function ro(t){this.key=t;},io=function io(t){this.key=t;},oo=/** @class */function(){function t(t,/** Documents included in the remote target */e){this.query=t,this.Oc=e,this.Lc=null,/**
               * A flag whether the view is current with the backend. A view is considered
               * current after it has seen the current flag from the backend and did not
               * lose consistency within the watch stream (e.g. because of an existence
               * filter mismatch).
               */this.Ht=!1,/** Documents in the view but not in the remote target */this.qc=Et(),/** Document Keys that have local changes */this.Lt=Et(),this.Bc=Pn(t),this.Uc=new At(this.Bc);}return Object.defineProperty(t.prototype,"Qc",{/**
           * The set of remote documents that the server has told us belongs to the target associated with
           * this view.
           */get:function get(){return this.Oc;},enumerable:!1,configurable:!0}),/**
       * Iterates over a set of doc changes, applies the query limit, and computes
       * what the new results should be, what the changes were, and whether we may
       * need to go back to the local cache for more results. Does not make any
       * changes to the view.
       * @param docChanges The doc changes to apply to this view.
       * @param previousChanges If this is being called with a refill, then start
       *        with this set of docs and changes instead of the current view.
       * @return a new set of docs, changes, and refill flag.
       */t.prototype.Wc=function(t,e){var n=this,r=e?e.jc:new _t(),i=e?e.Uc:this.Uc,o=e?e.Lt:this.Lt,s=i,u=!1,a=this.query.hn()&&i.size===this.query.limit?i.last():null,c=this.query.an()&&i.size===this.query.limit?i.first():null;// Drop documents out to meet limit/limitToLast requirement.
  if(t.ot(function(t,e){var h=i.get(t),f=e instanceof dn?e:null;f&&(f=Sn(n.query,f)?f:null);var l=!!h&&n.Lt.has(h.key),p=!!f&&(f.Ke||// We only consider committed mutations for documents that were
  // mutated during the lifetime of the view.
  n.Lt.has(f.key)&&f.hasCommittedMutations),d=!1;// Calculate change
  h&&f?h.data().isEqual(f.data())?l!==p&&(r.track({type:3/* Metadata */,doc:f}),d=!0):n.Kc(h,f)||(r.track({type:2/* Modified */,doc:f}),d=!0,(a&&n.Bc(f,a)>0||c&&n.Bc(f,c)<0)&&(// This doc moved from inside the limit to outside the limit.
  // That means there may be some other doc in the local cache
  // that should be included instead.
  u=!0)):!h&&f?(r.track({type:0/* Added */,doc:f}),d=!0):h&&!f&&(r.track({type:1/* Removed */,doc:h}),d=!0,(a||c)&&(// A doc was removed from a full limit query. We'll need to
  // requery from the local cache to see if we know about some other
  // doc that should be in the results.
  u=!0)),d&&(f?(s=s.add(f),o=p?o.add(t):o.delete(t)):(s=s.delete(t),o=o.delete(t)));}),this.query.hn()||this.query.an())for(;s.size>this.query.limit;){var h=this.query.hn()?s.last():s.first();s=s.delete(h.key),o=o.delete(h.key),r.track({type:1/* Removed */,doc:h});}return {Uc:s,jc:r,Gc:u,Lt:o};},t.prototype.Kc=function(t,e){// We suppress the initial change event for documents that were modified as
  // part of a write acknowledgment (e.g. when the value of a server transform
  // is applied) as Watch will send us the same document again.
  // By suppressing the event, we only raise two user visible events (one with
  // `hasPendingWrites` and the final state of the document) instead of three
  // (one with `hasPendingWrites`, the modified document with
  // `hasPendingWrites` and the final state of the document).
  return t.Ke&&e.hasCommittedMutations&&!e.Ke;},/**
       * Updates the view with the given ViewDocumentChanges and optionally updates
       * limbo docs and sync state from the provided target change.
       * @param docChanges The set of changes to make to the view's docs.
       * @param updateLimboDocuments Whether to update limbo documents based on this
       *        change.
       * @param targetChange A target change to apply for computing limbo docs and
       *        sync state.
       * @return A new ViewChange with the given docs, changes, and sync state.
       */ // PORTING NOTE: The iOS/Android clients always compute limbo document changes.
  t.prototype.Bn=function(t,e,n){var r=this,i=this.Uc;this.Uc=t.Uc,this.Lt=t.Lt;// Sort changes based on type and query comparator
  var o=t.jc.Mt();o.sort(function(t,e){return function(t,e){var n=function n(t){switch(t){case 0/* Added */:return 1;case 2/* Modified */:case 3/* Metadata */:// A metadata change is converted to a modified change at the public
  // api layer.  Since we sort by document key and then change type,
  // metadata and modified changes must be sorted equivalently.
  return 2;case 1/* Removed */:return 0;default:return _();}};return n(t)-n(e);}(t.type,e.type)||r.Bc(t.doc,e.doc);}),this.zc(n);var s=e?this.Hc():[],u=0===this.qc.size&&this.Ht?1/* Synced */:0/* Local */,a=u!==this.Lc;return this.Lc=u,0!==o.length||a?{snapshot:new Dt(this.query,t.Uc,i,o,t.Lt,0/* Local */===u,a,/* excludesMetadataChanges= */!1),Yc:s}:{Yc:s};// no changes
  },/**
       * Applies an OnlineState change to the view, potentially generating a
       * ViewChange if the view's syncState changes as a result.
       */t.prototype.Jc=function(t){return this.Ht&&"Offline"/* Offline */===t?(// If we're offline, set `current` to false and then call applyChanges()
  // to refresh our syncState and generate a ViewChange as appropriate. We
  // are guaranteed to get a new TargetChange that sets `current` back to
  // true once the client is back online.
  this.Ht=!1,this.Bn({Uc:this.Uc,jc:new _t(),Lt:this.Lt,Gc:!1},/* updateLimboDocuments= */!1)):{Yc:[]};},/**
       * Returns whether the doc for the given key should be in limbo.
       */t.prototype.Xc=function(t){// If the remote end says it's part of this query, it's not in limbo.
  return !this.Oc.has(t)&&// The local store doesn't think it's a result, so it shouldn't be in limbo.
  !!this.Uc.has(t)&&!this.Uc.get(t).Ke;},/**
       * Updates syncedDocuments, current, and limbo docs based on the given change.
       * Returns the list of changes to which docs are in limbo.
       */t.prototype.zc=function(t){var e=this;t&&(t.Yt.forEach(function(t){return e.Oc=e.Oc.add(t);}),t.Jt.forEach(function(t){}),t.Xt.forEach(function(t){return e.Oc=e.Oc.delete(t);}),this.Ht=t.Ht);},t.prototype.Hc=function(){var t=this;// We can only determine limbo documents when we're in-sync with the server.
  if(!this.Ht)return [];// TODO(klimt): Do this incrementally so that it's not quadratic when
  // updating many documents.
  var e=this.qc;this.qc=Et(),this.Uc.forEach(function(e){t.Xc(e.key)&&(t.qc=t.qc.add(e.key));});// Diff the new limbo docs with the old limbo docs.
  var n=[];return e.forEach(function(e){t.qc.has(e)||n.push(new io(e));}),this.qc.forEach(function(t){e.has(t)||n.push(new ro(t));}),n;},/**
       * Update the in-memory state of the current view with the state read from
       * persistence.
       *
       * We update the query view whenever a client's primary status changes:
       * - When a client transitions from primary to secondary, it can miss
       *   LocalStorage updates and its query views may temporarily not be
       *   synchronized with the state on disk.
       * - For secondary to primary transitions, the client needs to update the list
       *   of `syncedDocuments` since secondary clients update their query views
       *   based purely on synthesized RemoteEvents.
       *
       * @param queryResult.documents - The documents that match the query according
       * to the LocalStore.
       * @param queryResult.remoteKeys - The keys of the documents that match the
       * query according to the backend.
       *
       * @return The ViewChange that resulted from this synchronization.
       */ // PORTING NOTE: Multi-tab only.
  t.prototype.Zc=function(t){this.Oc=t.qh,this.qc=Et();var e=this.Wc(t.documents);return this.Bn(e,/*updateLimboDocuments=*/!0);},/**
       * Returns a view snapshot as if this query was just listened to. Contains
       * a document add for every existing document and the `fromCache` and
       * `hasPendingWrites` status of the already established view.
       */ // PORTING NOTE: Multi-tab only.
  t.prototype.tl=function(){return Dt.Ut(this.query,this.Uc,this.Lt,0/* Local */===this.Lc);},t;}(),so=function so(/**
       * The query itself.
       */t,/**
       * The target number created by the client that is used in the watch
       * stream to identify this query.
       */e,/**
       * The view is responsible for computing the final merged truth of what
       * docs are in the query. It gets notified of local and remote changes,
       * and applies the query filters and limits to determine the most correct
       * possible results.
       */n){this.query=t,this.targetId=e,this.view=n;},uo=function uo(t){this.key=t,/**
               * Set to true once we've received a document. This is used in
               * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
               * decide whether it needs to manufacture a delete event for the target once
               * the target is CURRENT.
               */this.el=!1;},ao=/** @class */function(){function t(t,e,n,// PORTING NOTE: Manages state synchronization in multi-tab environments.
  r,i,o){this.nu=t,this.nl=e,this.su=n,this.sl=r,this.currentUser=i,this.il=o,this.rl=null,this.ol=new F$1(function(t){return kn(t);},Dn),this.hl=new Map(),/**
               * The keys of documents that are in limbo for which we haven't yet started a
               * limbo resolution query.
               */this.al=[],/**
               * Keeps track of the target ID for each document that is in limbo with an
               * active target.
               */this.ul=new ht(W$1.P),/**
               * Keeps track of the information about an active limbo resolution for each
               * active target ID that was started for the purpose of limbo resolution.
               */this.cl=new Map(),this.ll=new Oi(),/** Stores user completion handlers, indexed by User and BatchId. */this._l={},/** Stores user callbacks waiting for all pending writes to be acknowledged. */this.fl=new Map(),this.dl=mi.eo(),this.onlineState="Unknown"/* Unknown */,// The primary state is set to `true` or `false` immediately after Firestore
  // startup. In the interim, a client should only be considered primary if
  // `isPrimary` is true.
  this.wl=void 0;}return Object.defineProperty(t.prototype,"Tl",{get:function get(){return !0===this.wl;},enumerable:!1,configurable:!0}),t.prototype.subscribe=function(t){this.rl=t;},t.prototype.listen=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o,s;return __generator$1(this,function(n){switch(n.label){case 0:return this.El("listen()"),(i=this.ol.get(t))?(// PORTING NOTE: With Multi-Tab Web, it is possible that a query view
  // already exists when EventManager calls us for the first time. This
  // happens when the primary tab is already listening to this query on
  // behalf of another tab and the user of the primary also starts listening
  // to the query. EventManager will not have an assigned target ID in this
  // case and calls `listen` to obtain this ID.
  e=i.targetId,this.sl.Ec(e),r=i.view.tl(),[3/*break*/,4]):[3/*break*/,1];case 1:return [4/*yield*/,this.nu.Mh(Tn(t))];case 2:return o=n.sent(),s=this.sl.Ec(o.targetId),e=o.targetId,[4/*yield*/,this.Il(t,e,"current"===s)];case 3:r=n.sent(),this.Tl&&this.nl.listen(o),n.label=4;case 4:return [2/*return*/,r];}});});},/**
       * Registers a view for a previously unknown query and computes its initial
       * snapshot.
       */t.prototype.Il=function(t,r,i){return __awaiter$1(this,void 0,void 0,function(){var e,o,s,u,a,c;return __generator$1(this,function(n){switch(n.label){case 0:return [4/*yield*/,this.nu.Lh(t,/* usePreviousResults= */!0)];case 1:return e=n.sent(),o=new oo(t,e.qh),s=o.Wc(e.documents),u=xt.zt(r,i&&"Offline"/* Offline */!==this.onlineState),a=o.Bn(s,/* updateLimboDocuments= */this.Tl,u),this.ml(r,a.Yc),c=new so(t,r,o),[2/*return*/,(this.ol.set(t,c),this.hl.has(r)?this.hl.get(r).push(t):this.hl.set(r,[t]),a.snapshot)];}});});},t.prototype.vu=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i=this;return __generator$1(this,function(n){switch(n.label){case 0:// Only clean up the query view and target if this is the only query mapped
  // to the target.
  return this.El("unlisten()"),e=this.ol.get(t),(r=this.hl.get(e.targetId)).length>1?[2/*return*/,(this.hl.set(e.targetId,r.filter(function(e){return !Dn(e,t);})),void this.ol.delete(t))]:this.Tl?(// We need to remove the local query target first to allow us to verify
  // whether any other client is still interested in this target.
  this.sl.mc(e.targetId),this.sl._c(e.targetId)?[3/*break*/,2]:[4/*yield*/,this.nu.Oh(e.targetId,/*keepPersistedTargetData=*/!1).then(function(){i.sl.Rc(e.targetId),i.nl.vu(e.targetId),i.Al(e.targetId);}).catch(Li)]):[3/*break*/,3];case 1:n.sent(),n.label=2;case 2:return [3/*break*/,5];case 3:return this.Al(e.targetId),[4/*yield*/,this.nu.Oh(e.targetId,/*keepPersistedTargetData=*/!0)];case 4:n.sent(),n.label=5;case 5:return [2/*return*/];}});});},t.prototype.write=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o;return __generator$1(this,function(n){switch(n.label){case 0:this.El("write()"),n.label=1;case 1:return n.trys.push([1,5,,6]),[4/*yield*/,this.nu.bh(t)];case 2:return e=n.sent(),this.sl.fc(e.batchId),this.Rl(e.batchId,r),[4/*yield*/,this.Pl(e.Nn)];case 3:return n.sent(),[4/*yield*/,this.nl.gu()];case 4:return n.sent(),[3/*break*/,6];case 5:return i=n.sent(),o=gr(i,"Failed to persist write"),r.reject(o),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.Ch=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r=this;return __generator$1(this,function(n){switch(n.label){case 0:this.El("applyRemoteEvent()"),n.label=1;case 1:return n.trys.push([1,4,,6]),[4/*yield*/,this.nu.Ch(t)];case 2:return e=n.sent(),// Update `receivedDocument` as appropriate for any limbo targets.
  t.Qt.forEach(function(t,e){var n=r.cl.get(e);n&&(// Since this is a limbo resolution lookup, it's for a single document
  // and it could be added, modified, or removed, but not a combination.
  D$1(t.Yt.size+t.Jt.size+t.Xt.size<=1),t.Yt.size>0?n.el=!0:t.Jt.size>0?D$1(n.el):t.Xt.size>0&&(D$1(n.el),n.el=!1));}),[4/*yield*/,this.Pl(e,t)];case 3:// Update `receivedDocument` as appropriate for any limbo targets.
  return n.sent(),[3/*break*/,6];case 4:return [4/*yield*/,Li(n.sent())];case 5:return n.sent(),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.Jc=function(t,e){// If we are the secondary client, we explicitly ignore the remote store's
  // online state (the local client may go offline, even though the primary
  // tab remains online) and only apply the primary tab's online state from
  // SharedClientState.
  if(this.Tl&&0/* RemoteStore */===e||!this.Tl&&1/* SharedClientState */===e){this.El("applyOnlineStateChange()");var n=[];this.ol.forEach(function(e,r){var i=r.view.Jc(t);i.snapshot&&n.push(i.snapshot);}),this.rl.Vl(t),this.rl.ka(n),this.onlineState=t,this.Tl&&this.sl.gc(t);}},t.prototype.xu=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o,s,u,a=this;return __generator$1(this,function(n){switch(n.label){case 0:return this.El("rejectListens()"),// PORTING NOTE: Multi-tab only.
  this.sl.Pc(t,"rejected",r),e=this.cl.get(t),(i=e&&e.key)?(o=(o=new ht(W$1.P)).nt(i,new vn(i,B.min())),s=Et().add(i),u=new kt(B.min(),/* targetChanges= */new Map(),/* targetMismatches= */new pt(P$1),o,s),[4/*yield*/,this.Ch(u)]):[3/*break*/,2];case 1:return n.sent(),// Since this query failed, we won't want to manually unlisten to it.
  // We only remove it from bookkeeping after we successfully applied the
  // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
  // this query when the RemoteStore restarts the Watch stream, which should
  // re-trigger the target failure.
  this.ul=this.ul.remove(i),this.cl.delete(t),this.gl(),[3/*break*/,4];case 2:return [4/*yield*/,this.nu.Oh(t,/* keepPersistedTargetData */!1).then(function(){return a.Al(t,r);}).catch(Li)];case 3:n.sent(),n.label=4;case 4:return [2/*return*/];}});});},t.prototype.Bu=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r;return __generator$1(this,function(n){switch(n.label){case 0:this.El("applySuccessfulWrite()"),e=t.batch.batchId,n.label=1;case 1:return n.trys.push([1,4,,6]),[4/*yield*/,this.nu.vh(t)];case 2:return r=n.sent(),// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught
  // up), so we raise user callbacks first so that they consistently happen
  // before listen events.
  this.yl(e,/*error=*/null),this.pl(e),this.sl.wc(e,"acknowledged"),[4/*yield*/,this.Pl(r)];case 3:// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught
  // up), so we raise user callbacks first so that they consistently happen
  // before listen events.
  return n.sent(),[3/*break*/,6];case 4:return [4/*yield*/,Li(n.sent())];case 5:return n.sent(),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.Qu=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e;return __generator$1(this,function(n){switch(n.label){case 0:this.El("rejectFailedWrite()"),n.label=1;case 1:return n.trys.push([1,4,,6]),[4/*yield*/,this.nu.Dh(t)];case 2:return e=n.sent(),// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught up),
  // so we raise user callbacks first so that they consistently happen before
  // listen events.
  this.yl(t,r),this.pl(t),this.sl.wc(t,"rejected",r),[4/*yield*/,this.Pl(e)];case 3:// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught up),
  // so we raise user callbacks first so that they consistently happen before
  // listen events.
  return n.sent(),[3/*break*/,6];case 4:return [4/*yield*/,Li(n.sent())];case 5:return n.sent(),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.bl=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o;return __generator$1(this,function(n){switch(n.label){case 0:this.nl.cu()||E$1("SyncEngine","The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled."),n.label=1;case 1:return n.trys.push([1,3,,4]),[4/*yield*/,this.nu.gr()];case 2:return -1===(e=n.sent())?[2/*return*/,void t.resolve()]:((r=this.fl.get(e)||[]).push(t),this.fl.set(e,r),[3/*break*/,4]);case 3:return i=n.sent(),o=gr(i,"Initialization of waitForPendingWrites() operation failed"),t.reject(o),[3/*break*/,4];case 4:return [2/*return*/];}});});},/**
       * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
       * if there are any.
       */t.prototype.pl=function(t){(this.fl.get(t)||[]).forEach(function(t){t.resolve();}),this.fl.delete(t);},/** Reject all outstanding callbacks waiting for pending writes to complete. */t.prototype.vl=function(t){this.fl.forEach(function(e){e.forEach(function(e){e.reject(new j(q$1.CANCELLED,t));});}),this.fl.clear();},t.prototype.Rl=function(t,e){var n=this._l[this.currentUser.Xh()];n||(n=new ht(P$1)),n=n.nt(t,e),this._l[this.currentUser.Xh()]=n;},/**
       * Resolves or rejects the user callback for the given batch and then discards
       * it.
       */t.prototype.yl=function(t,e){var n=this._l[this.currentUser.Xh()];// NOTE: Mutations restored from persistence won't have callbacks, so it's
  // okay for there to be no callback for this ID.
  if(n){var r=n.get(t);r&&(e?r.reject(e):r.resolve(),n=n.remove(t)),this._l[this.currentUser.Xh()]=n;}},t.prototype.Al=function(t,e){var n=this;void 0===e&&(e=null),this.sl.mc(t);for(var r=0,i=this.hl.get(t);r<i.length;r++){var o=i[r];this.ol.delete(o),e&&this.rl.Sl(o,e);}this.hl.delete(t),this.Tl&&this.ll.zh(t).forEach(function(t){n.ll.Nr(t)||// We removed the last reference for this key
  n.Dl(t);});},t.prototype.Dl=function(t){// It's possible that the target already got removed because the query failed. In that case,
  // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
  var e=this.ul.get(t);null!==e&&(this.nl.vu(e),this.ul=this.ul.remove(t),this.cl.delete(e),this.gl());},t.prototype.ml=function(t,e){for(var n=0,r=e;n<r.length;n++){var i=r[n];i instanceof ro?(this.ll.Eo(i.key,t),this.Cl(i)):i instanceof io?(E$1("SyncEngine","Document no longer in limbo: "+i.key),this.ll.mo(i.key,t),this.ll.Nr(i.key)||// We removed the last reference for this key
  this.Dl(i.key)):_();}},t.prototype.Cl=function(t){var e=t.key;this.ul.get(e)||(E$1("SyncEngine","New document in limbo: "+e),this.al.push(e),this.gl());},/**
       * Starts listens for documents in limbo that are enqueued for resolution,
       * subject to a maximum number of concurrent resolutions.
       *
       * Without bounding the number of concurrent resolutions, the server can fail
       * with "resource exhausted" errors which can lead to pathological client
       * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
       */t.prototype.gl=function(){for(;this.al.length>0&&this.ul.size<this.il;){var t=this.al.shift(),e=this.dl.next();this.cl.set(e,new uo(t)),this.ul=this.ul.nt(t,e),this.nl.listen(new st(Tn(bn(t.path)),e,2/* LimboResolution */,nr.Ts));}},// Visible for testing
  t.prototype.Nl=function(){return this.ul;},// Visible for testing
  t.prototype.Fl=function(){return this.al;},t.prototype.Pl=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o,s=this;return __generator$1(this,function(n){switch(n.label){case 0:return e=[],i=[],o=[],this.ol.forEach(function(n,u){o.push(Promise.resolve().then(function(){var e=u.view.Wc(t);return e.Gc?s.nu.Lh(u.query,/* usePreviousResults= */!1).then(function(t){var n=t.documents;return u.view.Wc(n,e);}):e;// The query has a limit and some docs were removed, so we need
  // to re-run the query against the local store to make sure we
  // didn't lose any good docs that had been past the limit.
  }).then(function(t){var n=r&&r.Qt.get(u.targetId),o=u.view.Bn(t,/* updateLimboDocuments= */s.Tl,n);if(s.ml(u.targetId,o.Yc),o.snapshot){s.Tl&&s.sl.Pc(u.targetId,o.snapshot.fromCache?"not-current":"current"),e.push(o.snapshot);var a=er.ls(u.targetId,o.snapshot);i.push(a);}}));}),[4/*yield*/,Promise.all(o)];case 1:return n.sent(),this.rl.ka(e),[4/*yield*/,this.nu.kh(i)];case 2:return n.sent(),[2/*return*/];}});});},t.prototype.El=function(t){},t.prototype.Wu=function(t){return __awaiter$1(this,void 0,void 0,function(){var e;return __generator$1(this,function(n){switch(n.label){case 0:return this.currentUser.isEqual(t)?[3/*break*/,3]:(E$1("SyncEngine","User change. New user:",t.Xh()),[4/*yield*/,this.nu.Vh(t)]);case 1:return e=n.sent(),this.currentUser=t,// Fails tasks waiting for pending writes requested by previous user.
  this.vl("'waitForPendingWrites' promise is rejected due to a user change."),// TODO(b/114226417): Consider calling this only in the primary tab.
  this.sl.Vh(t,e.yh,e.ph),[4/*yield*/,this.Pl(e.gh)];case 2:n.sent(),n.label=3;case 3:return [2/*return*/];}});});},t.prototype.$e=function(t){var e=this.cl.get(t);if(e&&e.el)return Et().add(e.key);var n=Et(),r=this.hl.get(t);if(!r)return n;for(var i=0,o=r;i<o.length;i++){var s=o[i],u=this.ol.get(s);n=n.Ct(u.view.Qc);}return n;},t;}();/**
   * Holds the state of a query target, including its target ID and whether the
   * target is 'not-current', 'current' or 'rejected'.
   */ // Visible for testing
  /**
   * Reconcile the list of synced documents in an existing view with those
   * from persistence.
   */function co(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o;return __generator$1(this,function(n){switch(n.label){case 0:return [4/*yield*/,(e=k$1(t)).nu.Lh(r.query,/* usePreviousResults= */!0)];case 1:return i=n.sent(),o=r.view.Zc(i),[2/*return*/,(e.Tl&&e.ml(r.targetId,o.Yc),o)];}});});}/** Applies a mutation state to an existing batch.  */ // PORTING NOTE: Multi-Tab only.
  function ho(t,r,i,o){return __awaiter$1(this,void 0,void 0,function(){var e,s;return __generator$1(this,function(n){switch(n.label){case 0:return (e=k$1(t)).El("applyBatchState()"),[4/*yield*/,/** Returns the local view of the documents affected by a mutation batch. */ // PORTING NOTE: Multi-Tab only.
  function(t,e){var n=k$1(t),r=k$1(n.Kn);return n.persistence.runTransaction("Lookup mutation documents","readonly",function(t){return r.Pr(t,e).next(function(e){return e?n.Rh.Xn(t,e):Yn.resolve(null);});});}(e.nu,r)];case 1:return null===(s=n.sent())?[3/*break*/,6]:"pending"!==i?[3/*break*/,3]:[4/*yield*/,e.nl.gu()];case 2:// If we are the primary client, we need to send this write to the
  // backend. Secondary clients will ignore these writes since their remote
  // connection is disabled.
  return n.sent(),[3/*break*/,4];case 3:"acknowledged"===i||"rejected"===i?(// NOTE: Both these methods are no-ops for batches that originated from
  // other clients.
  e.yl(r,o||null),function(t,e){k$1(k$1(t).Kn).Sr(e);}(e.nu,r)):_(),n.label=4;case 4:return [4/*yield*/,e.Pl(s)];case 5:return n.sent(),[3/*break*/,7];case 6:// A throttled tab may not have seen the mutation before it was completed
  // and removed from the mutation queue, in which case we won't have cached
  // the affected documents. In this case we can safely ignore the update
  // since that means we didn't apply the mutation locally at all (if we
  // had, we would have cached the affected documents), and so we will just
  // see any resulting document changes via normal remote document updates
  // as applicable.
  E$1("SyncEngine","Cannot apply mutation batch with id: "+r),n.label=7;case 7:return [2/*return*/];}});});}/** Applies a query target change from a different tab. */ // PORTING NOTE: Multi-Tab only.
  function fo(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o,s,u,a,c,h;return __generator$1(this,function(n){switch(n.label){case 0:return e=k$1(t),!0!==r||!0===e.wl?[3/*break*/,3]:(i=e.sl.cc(),[4/*yield*/,lo(e,i.N())]);case 1:return o=n.sent(),e.wl=!0,[4/*yield*/,e.nl.ju(!0)];case 2:for(n.sent(),s=0,u=o;s<u.length;s++){a=u[s],e.nl.listen(a);}return [3/*break*/,7];case 3:return !1!==r||!1===e.wl?[3/*break*/,7]:(c=[],h=Promise.resolve(),e.hl.forEach(function(t,n){e.sl.Ac(n)?c.push(n):h=h.then(function(){return e.Al(n),e.nu.Oh(n,/*keepPersistedTargetData=*/!0);}),e.nl.vu(n);}),[4/*yield*/,h]);case 4:return n.sent(),[4/*yield*/,lo(e,c)];case 5:return n.sent(),// PORTING NOTE: Multi-Tab only.
  function(t){var e=k$1(t);e.cl.forEach(function(t,n){e.nl.vu(n);}),e.ll.Hh(),e.cl=new Map(),e.ul=new ht(W$1.P);}(e),e.wl=!1,[4/*yield*/,e.nl.ju(!1)];case 6:n.sent(),n.label=7;case 7:return [2/*return*/];}});});}function lo(t,r,i){return __awaiter$1(this,void 0,void 0,function(){var e,i,o,s,u,a,c,h,f,l,p,d,v,y;return __generator$1(this,function(n){switch(n.label){case 0:e=k$1(t),i=[],o=[],s=0,u=r,n.label=1;case 1:return s<u.length?(a=u[s],c=void 0,(h=e.hl.get(a))&&0!==h.length?[4/*yield*/,e.nu.Mh(Tn(h[0]))]:[3/*break*/,7]):[3/*break*/,13];case 2:// For queries that have a local View, we fetch their current state
  // from LocalStore (as the resume token and the snapshot version
  // might have changed) and reconcile their views with the persisted
  // state (the list of syncedDocuments may have gotten out of sync).
  c=n.sent(),f=0,l=h,n.label=3;case 3:return f<l.length?(p=l[f],d=e.ol.get(p),[4/*yield*/,co(e,d)]):[3/*break*/,6];case 4:(v=n.sent()).snapshot&&o.push(v.snapshot),n.label=5;case 5:return f++,[3/*break*/,3];case 6:return [3/*break*/,11];case 7:return [4/*yield*/,Pi(e.nu,a)];case 8:return y=n.sent(),[4/*yield*/,e.nu.Mh(y)];case 9:return c=n.sent(),[4/*yield*/,e.Il(po(y),a,/*current=*/!1)];case 10:n.sent(),n.label=11;case 11:i.push(c),n.label=12;case 12:return s++,[3/*break*/,1];case 13:return [2/*return*/,(e.rl.ka(o),i)];}});});}/**
   * Creates a `Query` object from the specified `Target`. There is no way to
   * obtain the original `Query`, so we synthesize a `Query` from the `Target`
   * object.
   *
   * The synthesized result might be different from the original `Query`, but
   * since the synthesized `Query` should return the same results as the
   * original one (only the presentation of results might differ), the potential
   * difference will not cause issues.
   */ // PORTING NOTE: Multi-Tab only.
  function po(t){return wn(t.path,t.collectionGroup,t.orderBy,t.filters,t.limit,"F"/* First */,t.startAt,t.endAt);}/** Returns the IDs of the clients that are currently active. */ // PORTING NOTE: Multi-Tab only.
  function vo(t){var e=k$1(t);return k$1(k$1(e.nu).persistence).rh();}/** Applies a query target change from a different tab. */ // PORTING NOTE: Multi-Tab only.
  function yo(t,r,i,o){return __awaiter$1(this,void 0,void 0,function(){var e,s,u;return __generator$1(this,function(n){switch(n.label){case 0:return (e=k$1(t)).wl?(// If we receive a target state notification via WebStorage, we are
  // either already secondary or another tab has taken the primary lease.
  E$1("SyncEngine","Ignoring unexpected query state notification."),[3/*break*/,8]):[3/*break*/,1];case 1:if(!e.hl.has(r))return [3/*break*/,8];switch(i){case"current":case"not-current":return [3/*break*/,2];case"rejected":return [3/*break*/,5];}return [3/*break*/,7];case 2:return [4/*yield*/,function(t){var e=k$1(t),n=k$1(e.Ah);return e.persistence.runTransaction("Get new document changes","readonly",function(t){return n.Ur(t,e.mh);}).then(function(t){var n=t.Qr,r=t.readTime;return e.mh=r,n;});}(e.nu)];case 3:return s=n.sent(),u=kt.Gt(r,"current"===i),[4/*yield*/,e.Pl(s,u)];case 4:return n.sent(),[3/*break*/,8];case 5:return [4/*yield*/,e.nu.Oh(r,/* keepPersistedTargetData */!0)];case 6:return n.sent(),e.Al(r,o),[3/*break*/,8];case 7:_(),n.label=8;case 8:return [2/*return*/];}});});}/** Adds or removes Watch targets for queries from different tabs. */function mo(t,r,i){return __awaiter$1(this,void 0,void 0,function(){var e,o,s,u,a,c,h,f,l,p;return __generator$1(this,function(d){switch(d.label){case 0:if(!(e=k$1(t)).wl)return [3/*break*/,10];o=0,s=r,d.label=1;case 1:return o<s.length?(u=s[o],e.hl.has(u)?(// A target might have been added in a previous attempt
  E$1("SyncEngine","Adding an already active target "+u),[3/*break*/,5]):[4/*yield*/,Pi(e.nu,u)]):[3/*break*/,6];case 2:return a=d.sent(),[4/*yield*/,e.nu.Mh(a)];case 3:return c=d.sent(),[4/*yield*/,e.Il(po(a),c.targetId,/*current=*/!1)];case 4:d.sent(),e.nl.listen(c),d.label=5;case 5:return o++,[3/*break*/,1];case 6:h=function h(t){return __generator$1(this,function(n){switch(n.label){case 0:return e.hl.has(t)?[4/*yield*/,e.nu.Oh(t,/* keepPersistedTargetData */!1).then(function(){e.nl.vu(t),e.Al(t);}).catch(Li)]:[3/*break*/,2];// Release queries that are still active.
  case 1:// Release queries that are still active.
  n.sent(),n.label=2;case 2:return [2/*return*/];}});},f=0,l=i,d.label=7;case 7:return f<l.length?(p=l[f],[5/*yield**/,h(p)]):[3/*break*/,10];case 8:d.sent(),d.label=9;case 9:return f++,[3/*break*/,7];case 10:return [2/*return*/];}});});}/**
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
   */ /**
   * Holds the listeners and the last received ViewSnapshot for a query being
   * tracked by EventManager.
   */var go=function go(){this.kl=void 0,this.listeners=[];},wo=/** @class */function(){function t(t){this.Du=t,this.xl=new F$1(function(t){return kn(t);},Dn),this.onlineState="Unknown"/* Unknown */,this.$l=new Set(),this.Du.subscribe(this);}return t.prototype.listen=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o,s,u;return __generator$1(this,function(n){switch(n.label){case 0:if(e=t.query,r=!1,(i=this.xl.get(e))||(r=!0,i=new go()),!r)return [3/*break*/,4];n.label=1;case 1:return n.trys.push([1,3,,4]),o=i,[4/*yield*/,this.Du.listen(e)];case 2:return o.kl=n.sent(),[3/*break*/,4];case 3:return s=n.sent(),u=gr(s,"Initialization of query '"+xn(t.query)+"' failed"),[2/*return*/,void t.onError(u)];case 4:return this.xl.set(e,i),i.listeners.push(t),// Run global snapshot listeners if a consistent snapshot has been emitted.
  t.Jc(this.onlineState),i.kl&&t.Ml(i.kl)&&this.Ol(),[2/*return*/];}});});},t.prototype.vu=function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r,i,o;return __generator$1(this,function(n){return e=t.query,r=!1,(i=this.xl.get(e))&&(o=i.listeners.indexOf(t))>=0&&(i.listeners.splice(o,1),r=0===i.listeners.length),r?[2/*return*/,(this.xl.delete(e),this.Du.vu(e))]:[2/*return*/];});});},t.prototype.ka=function(t){for(var e=!1,n=0,r=t;n<r.length;n++){var i=r[n],o=i.query,s=this.xl.get(o);if(s){for(var u=0,a=s.listeners;u<a.length;u++){a[u].Ml(i)&&(e=!0);}s.kl=i;}}e&&this.Ol();},t.prototype.Sl=function(t,e){var n=this.xl.get(t);if(n)for(var r=0,i=n.listeners;r<i.length;r++){i[r].onError(e);}// Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
  // after an error.
  this.xl.delete(t);},t.prototype.Vl=function(t){this.onlineState=t;var e=!1;this.xl.forEach(function(n,r){for(var i=0,o=r.listeners;i<o.length;i++){// Run global snapshot listeners if a consistent snapshot has been emitted.
  o[i].Jc(t)&&(e=!0);}}),e&&this.Ol();},t.prototype.Ll=function(t){this.$l.add(t),// Immediately fire an initial event, indicating all existing listeners
  // are in-sync.
  t.next();},t.prototype.ql=function(t){this.$l.delete(t);},// Call all global snapshot listeners that have been set.
  t.prototype.Ol=function(){this.$l.forEach(function(t){t.next();});},t;}(),bo=/** @class */function(){function t(t,e,n){this.query=t,this.Bl=e,/**
               * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
               * observer. This flag is set to true once we've actually raised an event.
               */this.Ul=!1,this.Ql=null,this.onlineState="Unknown"/* Unknown */,this.options=n||{}/**
       * Applies the new ViewSnapshot to this listener, raising a user-facing event
       * if applicable (depending on what changed, whether the user has opted into
       * metadata-only changes, etc.). Returns true if a user-facing event was
       * indeed raised.
       */;}return t.prototype.Ml=function(t){if(!this.options.includeMetadataChanges){for(// Remove the metadata only changes.
  var e=[],n=0,r=t.docChanges;n<r.length;n++){var i=r[n];3/* Metadata */!==i.type&&e.push(i);}t=new Dt(t.query,t.docs,t.Ot,e,t.Lt,t.fromCache,t.qt,/* excludesMetadataChanges= */!0);}var o=!1;return this.Ul?this.Wl(t)&&(this.Bl.next(t),o=!0):this.jl(t,this.onlineState)&&(this.Kl(t),o=!0),this.Ql=t,o;},t.prototype.onError=function(t){this.Bl.error(t);},/** Returns whether a snapshot was raised. */t.prototype.Jc=function(t){this.onlineState=t;var e=!1;return this.Ql&&!this.Ul&&this.jl(this.Ql,t)&&(this.Kl(this.Ql),e=!0),e;},t.prototype.jl=function(t,e){// Always raise the first event when we're synced
  if(!t.fromCache)return !0;// NOTE: We consider OnlineState.Unknown as online (it should become Offline
  // or Online if we wait long enough).
  var n="Offline"/* Offline */!==e;// Don't raise the event if we're online, aren't synced yet (checked
  // above) and are waiting for a sync.
  return !(this.options.Gl&&n||t.docs._()&&"Offline"/* Offline */!==e);// Raise data from cache if we have any documents or we are offline
  },t.prototype.Wl=function(t){// We don't need to handle includeDocumentMetadataChanges here because
  // the Metadata only changes have already been stripped out if needed.
  // At this point the only changes we will see are the ones we should
  // propagate.
  if(t.docChanges.length>0)return !0;var e=this.Ql&&this.Ql.hasPendingWrites!==t.hasPendingWrites;return !(!t.qt&&!e)&&!0===this.options.includeMetadataChanges;// Generally we should have hit one of the cases above, but it's possible
  // to get here if there were only metadata docChanges and they got
  // stripped out.
  },t.prototype.Kl=function(t){t=Dt.Ut(t.query,t.docs,t.Lt,t.fromCache),this.Ul=!0,this.Bl.next(t);},t;}(),Io=/** @class */function(){function t(){}return t.prototype.Ph=function(t){this.zl=t;},t.prototype.es=function(t,e,n,r){var i=this;// Queries that match all documents don't benefit from using
  // IndexFreeQueries. It is more efficient to scan all documents in a
  // collection, rather than to perform individual lookups.
  return e.on()||n.isEqual(B.min())?this.Hl(t,e):this.zl.Xn(t,r).next(function(o){var u=i.Yl(e,o);return (e.hn()||e.an())&&i.Gc(e.en,u,r,n)?i.Hl(t,e):(I$1()<=LogLevel.DEBUG&&E$1("IndexFreeQueryEngine","Re-using previous result from %s to execute query: %s",n.toString(),xn(e)),i.zl.es(t,e,n).next(function(t){// We merge `previousResults` into `updateResults`, since
  // `updateResults` is already a DocumentMap. If a document is
  // contained in both lists, then its contents are the same.
  return u.forEach(function(e){t=t.nt(e.key,e);}),t;}));});// Queries that have never seen a snapshot without limbo free documents
  // should also be run as a full collection scan.
  },/** Applies the query filter and sorting to the provided documents.  */t.prototype.Yl=function(t,e){// Sort the documents and re-apply the query filter since previously
  // matching documents do not necessarily still match the query.
  var n=new pt(Pn(t));return e.forEach(function(e,r){r instanceof dn&&Sn(t,r)&&(n=n.add(r));}),n;},/**
       * Determines if a limit query needs to be refilled from cache, making it
       * ineligible for index-free execution.
       *
       * @param sortedPreviousResults The documents that matched the query when it
       * was last synchronized, sorted by the query's comparator.
       * @param remoteKeys The document keys that matched the query at the last
       * snapshot.
       * @param limboFreeSnapshotVersion The version of the snapshot when the query
       * was last synchronized.
       */t.prototype.Gc=function(t,e,n,r){// The query needs to be refilled if a previously matching document no
  // longer matches.
  if(n.size!==e.size)return !0;// Limit queries are not eligible for index-free query execution if there is
  // a potential that an older document from cache now sorts before a document
  // that was previously part of the limit. This, however, can only happen if
  // the document at the edge of the limit goes out of limit.
  // If a document that is not the limit boundary sorts differently,
  // the boundary of the limit itself did not change and documents from cache
  // will continue to be "rejected" by this boundary. Therefore, we can ignore
  // any modifications that don't affect the last document.
  var i="F"/* First */===t?e.last():e.first();return !!i&&(i.hasPendingWrites||i.version.o(r)>0);},t.prototype.Hl=function(t,e){return I$1()<=LogLevel.DEBUG&&E$1("IndexFreeQueryEngine","Using full collection scan to execute query:",xn(e)),this.zl.es(t,e,B.min());},t;}(),Eo=/** @class */function(){function t(t,e){this.Gn=t,this.dr=e,/**
               * The set of all mutations that have been sent but not yet been applied to
               * the backend.
               */this.Kn=[],/** Next value to use when assigning sequential IDs to each mutation batch. */this.Jl=1,/** An ordered mapping between documents and the mutations batch IDs. */this.Xl=new pt(Ri.Uh);}return t.prototype.Ir=function(t){return Yn.resolve(0===this.Kn.length);},t.prototype.mr=function(t,e,n,r){var i=this.Jl;this.Jl++,this.Kn.length>0&&this.Kn[this.Kn.length-1];var o=new Wn(i,e,n,r);this.Kn.push(o);// Track references by document key and index collection parents.
  for(var s=0,u=r;s<u.length;s++){var a=u[s];this.Xl=this.Xl.add(new Ri(a.key,i)),this.Gn.Ar(t,a.key.path.p());}return Yn.resolve(o);},t.prototype.Rr=function(t,e){return Yn.resolve(this.Zl(e));},t.prototype.Vr=function(t,e){var n=e+1,r=this.t_(n),i=r<0?0:r;// The requested batchId may still be out of range so normalize it to the
  // start of the queue.
  return Yn.resolve(this.Kn.length>i?this.Kn[i]:null);},t.prototype.gr=function(){return Yn.resolve(0===this.Kn.length?-1:this.Jl-1);},t.prototype.yr=function(t){return Yn.resolve(this.Kn.slice());},t.prototype.Hn=function(t,e){var n=this,r=new Ri(e,0),i=new Ri(e,Number.POSITIVE_INFINITY),o=[];return this.Xl.vt([r,i],function(t){var e=n.Zl(t.Jh);o.push(e);}),Yn.resolve(o);},t.prototype.ts=function(t,e){var n=this,r=new pt(P$1);return e.forEach(function(t){var e=new Ri(t,0),i=new Ri(t,Number.POSITIVE_INFINITY);n.Xl.vt([e,i],function(t){r=r.add(t.Jh);});}),Yn.resolve(this.e_(r));},t.prototype.hs=function(t,e){// Use the query path as a prefix for testing if a document matches the
  // query.
  var n=e.path,r=n.length+1,i=n;// Construct a document reference for actually scanning the index. Unlike
  // the prefix the document key in this reference must have an even number of
  // segments. The empty segment can be used a suffix of the query path
  // because it precedes all other segments in an ordered traversal.
  W$1.W(i)||(i=i.child(""));var o=new Ri(new W$1(i),0),s=new pt(P$1);// Find unique batchIDs referenced by all documents potentially matching the
  // query.
  return this.Xl.St(function(t){var e=t.key.path;return !!n.D(e)&&(// Rows with document keys more than one segment longer than the query
  // path can't be matches. For example, a query on 'rooms' can't match
  // the document /rooms/abc/messages/xyx.
  // TODO(mcg): we'll need a different scanner when we implement
  // ancestor queries.
  e.length===r&&(s=s.add(t.Jh)),!0);},o),Yn.resolve(this.e_(s));},t.prototype.e_=function(t){var e=this,n=[];// Construct an array of matching batches, sorted by batchID to ensure that
  // multiple mutations affecting the same document key are applied in order.
  return t.forEach(function(t){var r=e.Zl(t);null!==r&&n.push(r);}),n;},t.prototype.br=function(t,e){var n=this;D$1(0===this.n_(e.batchId,"removed")),this.Kn.shift();var r=this.Xl;return Yn.forEach(e.mutations,function(i){var o=new Ri(i.key,e.batchId);return r=r.delete(o),n.dr.Dr(t,i.key);}).next(function(){n.Xl=r;});},t.prototype.Sr=function(t){// No-op since the memory mutation queue does not maintain a separate cache.
  },t.prototype.Nr=function(t,e){var n=new Ri(e,0),r=this.Xl.Dt(n);return Yn.resolve(e.isEqual(r&&r.key));},t.prototype.Cr=function(t){return this.Kn.length,Yn.resolve();},/**
       * Finds the index of the given batchId in the mutation queue and asserts that
       * the resulting index is within the bounds of the queue.
       *
       * @param batchId The batchId to search for
       * @param action A description of what the caller is doing, phrased in passive
       * form (e.g. "acknowledged" in a routine that acknowledges batches).
       */t.prototype.n_=function(t,e){return this.t_(t);},/**
       * Finds the index of the given batchId in the mutation queue. This operation
       * is O(1).
       *
       * @return The computed index of the batch with the given batchId, based on
       * the state of the queue. Note this index can be negative if the requested
       * batchId has already been remvoed from the queue or past the end of the
       * queue if the batchId is larger than the last added batch.
       */t.prototype.t_=function(t){return 0===this.Kn.length?0:t-this.Kn[0].batchId;// Examine the front of the queue to figure out the difference between the
  // batchId and indexes in the array. Note that since the queue is ordered
  // by batchId, if the first batch has a larger batchId then the requested
  // batchId doesn't exist in the queue.
  },/**
       * A version of lookupMutationBatch that doesn't return a promise, this makes
       * other functions that uses this code easier to read and more efficent.
       */t.prototype.Zl=function(t){var e=this.t_(t);return e<0||e>=this.Kn.length?null:this.Kn[e];},t;}(),To=/** @class */function(){/**
       * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
       * return 0 to avoid unnecessarily doing the work of calculating the size.
       */function t(t,e){this.Gn=t,this.s_=e,/** Underlying cache of documents and their read times. */this.docs=new ht(W$1.P),/** Size of all cached documents. */this.size=0/**
       * Adds the supplied entry to the cache and updates the cache size as appropriate.
       *
       * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()`.
       */;}return t.prototype.xn=function(t,e,n){var r=e.key,i=this.docs.get(r),o=i?i.size:0,s=this.s_(e);return this.docs=this.docs.nt(r,{Mr:e,size:s,readTime:n}),this.size+=s-o,this.Gn.Ar(t,r.path.p());},/**
       * Removes the specified entry from the cache and updates the cache size as appropriate.
       *
       * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()`.
       */t.prototype.Mn=function(t){var e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size);},t.prototype.On=function(t,e){var n=this.docs.get(e);return Yn.resolve(n?n.Mr:null);},t.prototype.getEntries=function(t,e){var n=this,r=mt();return e.forEach(function(t){var e=n.docs.get(t);r=r.nt(t,e?e.Mr:null);}),Yn.resolve(r);},t.prototype.es=function(t,e,n){for(var r=wt(),i=new W$1(e.path.child("")),o=this.docs.ut(i)// Documents are ordered by key, so we can use a prefix scan to narrow down
  // the documents we need to match the query against.
  ;o.wt();){var s=o.dt(),u=s.key,a=s.value,c=a.Mr,h=a.readTime;if(!e.path.D(u.path))break;h.o(n)<=0||c instanceof dn&&Sn(e,c)&&(r=r.nt(c.key,c));}return Yn.resolve(r);},t.prototype.i_=function(t,e){return Yn.forEach(this.docs,function(t){return e(t);});},t.prototype.jr=function(e){// `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
  // a separate changelog and does not need special handling for removals.
  return new t.Kr(this);},t.prototype.zr=function(t){return Yn.resolve(this.size);},t;}();/**
   * EventManager is responsible for mapping queries to query event emitters.
   * It handles "fan-out". -- Identical queries will re-use the same watch on the
   * backend.
   */ /**
   * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
   */To.Kr=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).Hr=t,n;}return __extends(n,e),n.prototype.Bn=function(t){var e=this,n=[];return this.Nn.forEach(function(r,i){i?n.push(e.Hr.xn(t,i,e.readTime)):e.Hr.Mn(r);}),Yn.Dn(n);},n.prototype.Ln=function(t,e){return this.Hr.On(t,e);},n.prototype.qn=function(t,e){return this.Hr.getEntries(t,e);},n;}($n);/**
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
   */var No=/** @class */function(){function t(t){this.persistence=t,/**
               * Maps a target to the data about that target
               */this.r_=new F$1(function(t){return tt(t);},et),/** The last received snapshot version. */this.lastRemoteSnapshotVersion=B.min(),/** The highest numbered target ID encountered. */this.highestTargetId=0,/** The highest sequence number encountered. */this.o_=0,/**
               * A ordered bidirectional mapping between documents and the remote target
               * IDs.
               */this.h_=new Oi(),this.targetCount=0,this.a_=mi.to();}return t.prototype.pe=function(t,e){return this.r_.forEach(function(t,n){return e(n);}),Yn.resolve();},t.prototype.ro=function(t){return Yn.resolve(this.lastRemoteSnapshotVersion);},t.prototype.oo=function(t){return Yn.resolve(this.o_);},t.prototype.no=function(t){return this.highestTargetId=this.a_.next(),Yn.resolve(this.highestTargetId);},t.prototype.ho=function(t,e,n){return n&&(this.lastRemoteSnapshotVersion=n),e>this.o_&&(this.o_=e),Yn.resolve();},t.prototype.uo=function(t){this.r_.set(t.target,t);var e=t.targetId;e>this.highestTargetId&&(this.a_=new mi(e),this.highestTargetId=e),t.sequenceNumber>this.o_&&(this.o_=t.sequenceNumber);},t.prototype.ao=function(t,e){return this.uo(e),this.targetCount+=1,Yn.resolve();},t.prototype.lo=function(t,e){return this.uo(e),Yn.resolve();},t.prototype._o=function(t,e){return this.r_.delete(e.target),this.h_.zh(e.targetId),this.targetCount-=1,Yn.resolve();},t.prototype.hr=function(t,e,n){var r=this,i=0,o=[];return this.r_.forEach(function(s,u){u.sequenceNumber<=e&&null===n.get(u.targetId)&&(r.r_.delete(s),o.push(r.fo(t,u.targetId)),i++);}),Yn.Dn(o).next(function(){return i;});},t.prototype.do=function(t){return Yn.resolve(this.targetCount);},t.prototype.wo=function(t,e){var n=this.r_.get(e)||null;return Yn.resolve(n);},t.prototype.To=function(t,e,n){return this.h_.jh(e,n),Yn.resolve();},t.prototype.Io=function(t,e,n){this.h_.Gh(e,n);var r=this.persistence.dr,i=[];return r&&e.forEach(function(e){i.push(r.Dr(t,e));}),Yn.Dn(i);},t.prototype.fo=function(t,e){return this.h_.zh(e),Yn.resolve();},t.prototype.Ao=function(t,e){var n=this.h_.Yh(e);return Yn.resolve(n);},t.prototype.Nr=function(t,e){return Yn.resolve(this.h_.Nr(e));},t;}(),Ao=/** @class */function(){/**
       * The constructor accepts a factory for creating a reference delegate. This
       * allows both the delegate and this instance to have strong references to
       * each other without having nullable fields that would then need to be
       * checked or asserted on every access.
       */function t(t){var e=this;this.u_={},this.yo=new nr(0),this.po=!1,this.po=!0,this.dr=t(this),this.ko=new No(this),this.Gn=new Yr(),this.jn=new To(this.Gn,function(t){return e.dr.c_(t);});}return t.prototype.start=function(){return Promise.resolve();},t.prototype.th=function(){// No durable state to ensure is closed on shutdown.
  return this.po=!1,Promise.resolve();},Object.defineProperty(t.prototype,"tr",{get:function get(){return this.po;},enumerable:!1,configurable:!0}),t.prototype.Bo=function(){// No op.
  },t.prototype.Uo=function(){// No op.
  },t.prototype.uh=function(){return this.Gn;},t.prototype.oh=function(t){var e=this.u_[t.Xh()];return e||(e=new Eo(this.Gn,this.dr),this.u_[t.Xh()]=e),e;},t.prototype.hh=function(){return this.ko;},t.prototype.ah=function(){return this.jn;},t.prototype.runTransaction=function(t,e,n){var r=this;E$1("MemoryPersistence","Starting transaction:",t);var i=new _o(this.yo.next());return this.dr.l_(),n(i).next(function(t){return r.dr.__(i).next(function(){return t;});}).vn().then(function(t){return i.Wn(),t;});},t.prototype.f_=function(t,e){return Yn.Cn(Object.values(this.u_).map(function(n){return function(){return n.Nr(t,e);};}));},t;}(),_o=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).Ro=t,n;}return __extends(n,e),n;}(Zn),Do=/** @class */function(){function t(t){this.persistence=t,/** Tracks all documents that are active in Query views. */this.d_=new Oi(),/** The list of documents that are potentially GCed after each transaction. */this.w_=null;}return t.T_=function(e){return new t(e);},Object.defineProperty(t.prototype,"E_",{get:function get(){if(this.w_)return this.w_;throw _();},enumerable:!1,configurable:!0}),t.prototype.Eo=function(t,e,n){return this.d_.Eo(n,e),this.E_.delete(n),Yn.resolve();},t.prototype.mo=function(t,e,n){return this.d_.mo(n,e),this.E_.add(n),Yn.resolve();},t.prototype.Dr=function(t,e){return this.E_.add(e),Yn.resolve();},t.prototype.removeTarget=function(t,e){var n=this;this.d_.zh(e.targetId).forEach(function(t){return n.E_.add(t);});var r=this.persistence.hh();return r.Ao(t,e.targetId).next(function(t){t.forEach(function(t){return n.E_.add(t);});}).next(function(){return r._o(t,e);});},t.prototype.l_=function(){this.w_=new Set();},t.prototype.__=function(t){var e=this,n=this.persistence.ah().jr();// Remove newly orphaned documents.
  return Yn.forEach(this.E_,function(r){return e.I_(t,r).next(function(t){t||n.Mn(r);});}).next(function(){return e.w_=null,n.apply(t);});},t.prototype.wh=function(t,e){var n=this;return this.I_(t,e).next(function(t){t?n.E_.delete(e):n.E_.add(e);});},t.prototype.c_=function(t){// For eager GC, we don't care about the document size, there are no size thresholds.
  return 0;},t.prototype.I_=function(t,e){var n=this;return Yn.Cn([function(){return Yn.resolve(n.d_.Nr(e));},function(){return n.persistence.hh().Nr(t,e);},function(){return n.persistence.f_(t,e);}]);},t;}(),ko=/** @class */function(){function t(t){this.m_=t.m_,this.A_=t.A_;}return t.prototype.Na=function(t){this.R_=t;},t.prototype.ba=function(t){this.P_=t;},t.prototype.onMessage=function(t){this.V_=t;},t.prototype.close=function(){this.A_();},t.prototype.send=function(t){this.m_(t);},t.prototype.g_=function(){this.R_();},t.prototype.y_=function(t){this.P_(t);},t.prototype.p_=function(t){this.V_(t);},t;}(),xo={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery"},So=/** @class */function(e){function n(t){var n=this;return (n=e.call(this,t)||this).forceLongPolling=t.forceLongPolling,n;}/**
       * Base class for all Rest-based connections to the backend (WebChannel and
       * HTTP).
       */return __extends(n,e),n.prototype.N_=function(t,e,n,r){return new Promise(function(i,o){var s=new esm_5();s.listenOnce(esm_3.COMPLETE,function(){try{switch(s.getLastErrorCode()){case esm_2.NO_ERROR:var e=s.getResponseJson();E$1("Connection","XHR received:",JSON.stringify(e)),i(e);break;case esm_2.TIMEOUT:E$1("Connection",'RPC "'+t+'" timed out'),o(new j(q$1.DEADLINE_EXCEEDED,"Request time out"));break;case esm_2.HTTP_ERROR:var n=s.getStatus();if(E$1("Connection",'RPC "'+t+'" failed with status:',n,"response text:",s.getResponseText()),n>0){var r=s.getResponseJson().error;if(r&&r.status&&r.message){var u=function(t){var e=t.toLowerCase().replace("_","-");return Object.values(q$1).indexOf(e)>=0?e:q$1.UNKNOWN;}(r.status);o(new j(u,r.message));}else o(new j(q$1.UNKNOWN,"Server responded with status "+s.getStatus()));}else// If we received an HTTP_ERROR but there's no status code,
  // it's most probably a connection issue
  o(new j(q$1.UNAVAILABLE,"Connection failed."));break;default:_();}}finally{E$1("Connection",'RPC "'+t+'" completed.');}});var u=JSON.stringify(r);s.send(e,"POST",u,n,15);});},n.prototype.Fa=function(t,e){var n=[this.v_,"/","google.firestore.v1.Firestore","/",t,"/channel"],r=esm_1(),i={// Required for backend stickiness, routing behavior is based on this
  // parameter.
  httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{// This param is used to improve routing and project isolation by the
  // backend and must be included in every request.
  database:"projects/"+this.s.projectId+"/databases/"+this.s.database},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{// Override the default timeout (randomized between 10-20 seconds) since
  // a large write batch on a slow internet connection may take a long
  // time to send to the backend. Rather than have WebChannel impose a
  // tight timeout which could lead to infinite timeouts and retries, we
  // set it very large (5-10 minutes) and rely on the browser's builtin
  // timeouts to kick in if the request isn't working.
  forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling};this.C_(i.initMessageHeaders,e),// Sending the custom headers we just added to request.initMessageHeaders
  // (Authorization, etc.) will trigger the browser to make a CORS preflight
  // request because the XHR will no longer meet the criteria for a "simple"
  // CORS request:
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
  // Therefore to avoid the CORS preflight request (an extra network
  // roundtrip), we use the httpHeadersOverwriteParam option to specify that
  // the headers should instead be encoded into a special "$httpHeaders" query
  // parameter, which is recognized by the webchannel backend. This is
  // formally defined here:
  // https://github.com/google/closure-library/blob/b0e1815b13fb92a46d7c9b3c30de5d6a396a3245/closure/goog/net/rpc/httpcors.js#L32
  // TODO(b/145624756): There is a backend bug where $httpHeaders isn't respected if the request
  // doesn't have an Origin header. So we have to exclude a few browser environments that are
  // known to (sometimes) not include an Origin. See
  // https://github.com/firebase/firebase-js-sdk/issues/1491.
  isMobileCordova()||isReactNative()||isElectron()||isIE()||isUWP()||isBrowserExtension()||(i.httpHeadersOverwriteParam="$httpHeaders");var o=n.join("");E$1("Connection","Creating WebChannel: "+o,i);var s=r.createWebChannel(o,i),u=!1,d=!1,v=new ko({m_:function m_(t){d?E$1("Connection","Not sending because WebChannel is closed:",t):(u||(E$1("Connection","Opening WebChannel transport."),s.open(),u=!0),E$1("Connection","WebChannel sending:",t),s.send(t));},A_:function A_(){return s.close();}}),y=function y(t,e){// TODO(dimond): closure typing seems broken because WebChannel does
  // not implement goog.events.Listenable
  s.listen(t,function(t){try{e(t);}catch(t){setTimeout(function(){throw t;},0);}});};// WebChannel supports sending the first message with the handshake - saving
  // a network round trip. However, it will have to call send in the same
  // JS event loop as open. In order to enforce this, we delay actually
  // opening the WebChannel until send is called. Whether we have called
  // open is tracked with this variable.
  // Closure events are guarded and exceptions are swallowed, so catch any
  // exception and rethrow using a setTimeout so they become visible again.
  // Note that eventually this function could go away if we are confident
  // enough the code is exception free.
  return y(esm_4.EventType.OPEN,function(){d||E$1("Connection","WebChannel transport opened.");}),y(esm_4.EventType.CLOSE,function(){d||(d=!0,E$1("Connection","WebChannel transport closed"),v.y_());}),y(esm_4.EventType.ERROR,function(t){d||(d=!0,N$1("Connection","WebChannel transport errored:",t),v.y_(new j(q$1.UNAVAILABLE,"The operation could not be completed")));}),y(esm_4.EventType.MESSAGE,function(t){var e;if(!d){var n=t.data[0];D$1(!!n);// TODO(b/35143891): There is a bug in One Platform that caused errors
  // (and only errors) to be wrapped in an extra array. To be forward
  // compatible with the bug we need to check either condition. The latter
  // can be removed once the fix has been rolled out.
  // Use any because msgData.error is not typed.
  var r=n,i=r.error||(null===(e=r[0])||void 0===e?void 0:e.error);if(i){E$1("Connection","WebChannel received error:",i);// error.status will be a string like 'OK' or 'NOT_FOUND'.
  var o=i.status,u=function(t){// lookup by string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var e=it[t];if(void 0!==e)return ct(e);}(o),a=i.message;void 0===u&&(u=q$1.INTERNAL,a="Unknown error status: "+o+" with message "+i.message),// Mark closed so no further events are propagated
  d=!0,v.y_(new j(u,a)),s.close();}else E$1("Connection","WebChannel received:",n),v.p_(n);}}),setTimeout(function(){// Technically we could/should wait for the WebChannel opened event,
  // but because we want to send the first message with the WebChannel
  // handshake we pretend the channel opened here (asynchronously), and
  // then delay the actual open until the first message is sent.
  v.g_();},0),v;},n;}(/** @class */function(){function t(t){this.b_=t,this.s=t.s;var e=t.ssl?"https":"http";this.v_=e+"://"+t.host,this.S_="projects/"+this.s.projectId+"/databases/"+this.s.database+"/documents";}return t.prototype.ja=function(t,e,n,r){var i=this.D_(t,e);E$1("RestConnection","Sending: ",i,n);var o={};return this.C_(o,r),this.N_(t,i,o,n).then(function(t){return E$1("RestConnection","Received: ",t),t;},function(e){throw N$1("RestConnection",t+" failed with error: ",e,"url: ",i,"request:",n),e;});},t.prototype.Ka=function(t,e,n,r){// The REST API automatically aggregates all of the streamed results, so we
  // can just use the normal invoke() method.
  return this.ja(t,e,n,r);},/**
       * Modifies the headers for a request, adding any authorization token if
       * present and any additional headers for the request.
       */t.prototype.C_=function(t,e){if(t["X-Goog-Api-Client"]="gl-js/ fire/7.18.0",// Content-Type: text/plain will avoid preflight requests which might
  // mess with CORS and redirects by proxies. If we add custom headers
  // we will need to change this code to potentially use the $httpOverwrite
  // parameter supported by ESF to avoid	triggering preflight requests.
  t["Content-Type"]="text/plain",e)for(var n in e.ea){e.ea.hasOwnProperty(n)&&(t[n]=e.ea[n]);}},t.prototype.D_=function(t,e){var n=xo[t];return this.v_+"/v1/"+e+":"+n;},t;}()),Po=/** @class */function(){function t(){var t=this;this.F_=function(){return t.k_();},this.x_=function(){return t.M_();},this.O_=[],this.L_();}return t.prototype.uu=function(t){this.O_.push(t);},t.prototype.th=function(){window.removeEventListener("online",this.F_),window.removeEventListener("offline",this.x_);},t.prototype.L_=function(){window.addEventListener("online",this.F_),window.addEventListener("offline",this.x_);},t.prototype.k_=function(){E$1("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(var t=0,e=this.O_;t<e.length;t++){(0, e[t])(0/* AVAILABLE */);}},t.prototype.M_=function(){E$1("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(var t=0,e=this.O_;t<e.length;t++){(0, e[t])(1/* UNAVAILABLE */);}},// TODO(chenbrian): Consider passing in window either into this component or
  // here for testing via FakeWindow.
  /** Checks that all used attributes of window are available. */t.Fs=function(){return "undefined"!=typeof window&&void 0!==window.addEventListener&&void 0!==window.removeEventListener;},t;}(),Lo=/** @class */function(){function t(){}return t.prototype.uu=function(t){// No-op.
  },t.prototype.th=function(){// No-op.
  },t;}();/**
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
   */ /**
   * A memory-backed instance of Persistence. Data is stored only in RAM and
   * not persisted across sessions.
   */ /**
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
   */ /** Initializes the WebChannelConnection for the browser. */ /**
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
   */function Oo(t){return new re(t,/* useProto3Json= */!0);}/**
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
   */var Ro="You are using the memory-only build of Firestore. Persistence support is only available via the @firebase/firestore bundle or the firebase-firestore.js build.",Vo=/** @class */function(){function t(){}return t.prototype.initialize=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:return this.sl=this.q_(t),this.persistence=this.B_(t),[4/*yield*/,this.persistence.start()];case 1:return e.sent(),this.U_=this.Q_(t),this.nu=this.W_(t),[2/*return*/];}});});},t.prototype.Q_=function(t){return null;},t.prototype.W_=function(t){/** Manages our in-memory or durable persistence. */return e=this.persistence,n=new Io(),r=t.j_,new Si(e,n,r);var e,n,r;},t.prototype.B_=function(t){if(t.G_.K_)throw new j(q$1.FAILED_PRECONDITION,Ro);return new Ao(Do.T_);},t.prototype.q_=function(t){return new no();},t.prototype.terminate=function(){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return this.U_&&this.U_.stop(),[4/*yield*/,this.sl.th()];case 1:return t.sent(),[4/*yield*/,this.persistence.th()];case 2:return t.sent(),[2/*return*/];}});});},t.prototype.clearPersistence=function(t,e){throw new j(q$1.FAILED_PRECONDITION,Ro);},t;}(),Uo=/** @class */function(r){function i(t){var e=this;return (e=r.call(this)||this).z_=t,e;}return __extends(i,r),i.prototype.initialize=function(t){return __awaiter$1(this,void 0,void 0,function(){var i,o=this;return __generator$1(this,function(s){switch(s.label){case 0:return [4/*yield*/,r.prototype.initialize.call(this,t)];case 1:return s.sent(),[4/*yield*/,this.z_.initialize(this,t)];case 2:return s.sent(),i=this.z_.Du,this.sl instanceof eo?(this.sl.Du={Fc:ho.bind(null,i),kc:yo.bind(null,i),xc:mo.bind(null,i),rh:vo.bind(null,i)},[4/*yield*/,this.sl.start()]):[3/*break*/,4];case 3:s.sent(),s.label=4;case 4:// NOTE: This will immediately call the listener, so we make sure to
  // set it after localStore / remoteStore are started.
  return [4/*yield*/,this.persistence.qo(function(t){return __awaiter$1(o,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:return [4/*yield*/,fo(this.z_.Du,t)];case 1:return e.sent(),this.U_&&(t&&!this.U_.tr?this.U_.start(this.nu):t||this.U_.stop()),[2/*return*/];}});});})];case 5:// NOTE: This will immediately call the listener, so we make sure to
  // set it after localStore / remoteStore are started.
  return s.sent(),[2/*return*/];}});});},i.prototype.q_=function(t){if(t.G_.K_&&t.G_.synchronizeTabs){var e=dr();if(!eo.Fs(e))throw new j(q$1.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");var n=xi(t.b_.s,t.b_.persistenceKey);return new eo(e,t.ti,n,t.clientId,t.j_);}return new no();},i;}(/** @class */function(r){function i(){return null!==r&&r.apply(this,arguments)||this;}return __extends(i,r),i.prototype.initialize=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(i){switch(i.label){case 0:return [4/*yield*/,r.prototype.initialize.call(this,t)];case 1:return i.sent(),[4/*yield*/,function(t){return __awaiter$1(this,void 0,void 0,function(){var e,r;return __generator$1(this,function(n){return e=k$1(t),r=k$1(e.Ah),[2/*return*/,e.persistence.runTransaction("Synchronize last document change read time","readonly",function(t){return r.Wr(t);}).then(function(t){e.mh=t;})];});});}(this.nu)];case 2:return i.sent(),[2/*return*/];}});});},i.prototype.Q_=function(t){var e=this.persistence.dr.Yi;return new Tr(e,t.ti);},i.prototype.B_=function(t){var e=xi(t.b_.s,t.b_.persistenceKey),n=Oo(t.b_.s);return new Ni(t.G_.synchronizeTabs,e,t.clientId,Er.Ui(t.G_.cacheSizeBytes),t.ti,dr(),vr(),n,this.sl,t.G_.Vo);},i.prototype.q_=function(t){return new no();},i.prototype.clearPersistence=function(t,r){return function(t){return __awaiter$1(this,void 0,void 0,function(){var e;return __generator$1(this,function(n){switch(n.label){case 0:return or.Fs()?(e=t+"main",[4/*yield*/,or.delete(e)]):[2/*return*/,Promise.resolve()];case 1:return n.sent(),[2/*return*/];}});});}(xi(t,r));},i;}(Vo)),Co=/** @class */function(){function t(){}return t.prototype.initialize=function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e=this;return __generator$1(this,function(n){switch(n.label){case 0:return this.nu?[3/*break*/,3]:(this.nu=t.nu,this.sl=t.sl,this.su=this.H_(r),this.nl=this.Y_(r),this.Du=this.J_(r),this.X_=this.Z_(r),this.sl.Ga=function(t){return e.Du.Jc(t,1/* SharedClientState */);},this.nl.Du=this.Du,[4/*yield*/,this.nl.start()]);case 1:return n.sent(),[4/*yield*/,this.nl.ju(this.Du.Tl)];case 2:n.sent(),n.label=3;case 3:return [2/*return*/];}});});},t.prototype.Z_=function(t){return new wo(this.Du);},t.prototype.H_=function(t){var e,n=Oo(t.b_.s),r=(e=t.b_,new So(e));/** Return the Platform-specific connectivity monitor. */return function(t,e,n){return new zi(t,e,n);}(t.credentials,r,n);},t.prototype.Y_=function(t){var e=this;return new Xi(this.nu,this.su,t.ti,function(t){return e.Du.Jc(t,0/* RemoteStore */);},Po.Fs()?new Po():new Lo());},t.prototype.J_=function(t){return function(t,e,n,// PORTING NOTE: Manages state synchronization in multi-tab environments.
  r,i,o,s){var u=new ao(t,e,n,r,i,o);return s&&(u.wl=!0),u;}(this.nu,this.nl,this.su,this.sl,t.j_,t.il,!t.G_.K_||!t.G_.synchronizeTabs);},t.prototype.terminate=function(){return this.nl.th();},t;}();/**
   * Provides all components needed for Firestore with in-memory persistence.
   * Uses EagerGC garbage collection.
   */ /**
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
   */function Mo(t){/**
   * Returns true if obj is an object and contains at least one of the specified
   * methods.
   */return function(t,e){if("object"!=_typeof(t)||null===t)return !1;for(var n=t,r=0,i=["next","error","complete"];r<i.length;r++){var o=i[r];if(o in n&&"function"==typeof n[o])return !0;}return !1;}(t);}var Fo=/** @class */function(){function t(t){this.observer=t,/**
               * When set to true, will not raise future events. Necessary to deal with
               * async detachment of listener.
               */this.muted=!1;}return t.prototype.next=function(t){this.observer.next&&this.tf(this.observer.next,t);},t.prototype.error=function(t){this.observer.error?this.tf(this.observer.error,t):console.error("Uncaught Error in snapshot listener:",t);},t.prototype.ef=function(){this.muted=!0;},t.prototype.tf=function(t,e){var n=this;this.muted||setTimeout(function(){n.muted||t(e);},0);},t;}();/**
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
   */ /**
   * Validates that no arguments were passed in the invocation of functionName.
   *
   * Forward the magic "arguments" variable as second parameter on which the
   * parameter validation is performed:
   * validateNoArgs('myFunction', arguments);
   */function qo(t,e){if(0!==e.length)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() does not support arguments, but was called with "+is(e.length,"argument")+".");}/**
   * Validates the invocation of functionName has the exact number of arguments.
   *
   * Forward the magic "arguments" variable as second parameter on which the
   * parameter validation is performed:
   * validateExactNumberOfArgs('myFunction', arguments, 2);
   */function jo(t,e,n){if(e.length!==n)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires "+is(n,"argument")+", but was called with "+is(e.length,"argument")+".");}/**
   * Validates the invocation of functionName has at least the provided number of
   * arguments (but can have many more).
   *
   * Forward the magic "arguments" variable as second parameter on which the
   * parameter validation is performed:
   * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
   */function Go(t,e,n){if(e.length<n)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires at least "+is(n,"argument")+", but was called with "+is(e.length,"argument")+".");}/**
   * Validates the invocation of functionName has number of arguments between
   * the values provided.
   *
   * Forward the magic "arguments" variable as second parameter on which the
   * parameter validation is performed:
   * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
   */function Bo(t,e,n,r){if(e.length<n||e.length>r)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires between "+n+" and "+r+" arguments, but was called with "+is(e.length,"argument")+".");}/**
   * Validates the provided argument is an array and has as least the expected
   * number of elements.
   */ /**
   * Validates the provided positional argument has the native JavaScript type
   * using typeof checks.
   */function zo(t,e,n,r){Yo(t,e,rs(n)+" argument",r);}/**
   * Validates the provided argument has the native JavaScript type using
   * typeof checks or is undefined.
   */function Ko(t,e,n,r){void 0!==r&&zo(t,e,n,r);}/**
   * Validates the provided named option has the native JavaScript type using
   * typeof checks.
   */function Xo(t,e,n,r){Yo(t,e,n+" option",r);}/**
   * Validates the provided named option has the native JavaScript type using
   * typeof checks or is undefined.
   */function Qo(t,e,n,r){void 0!==r&&Xo(t,e,n,r);}/**
   * Validates that the provided named option equals one of the expected values.
   */ /**
   * Validates that the provided named option equals one of the expected values or
   * is undefined.
   */function Wo(t,e,n,r,i){void 0!==r&&function(t,e,n,r,i){for(var o=[],s=0,u=i;s<u.length;s++){var a=u[s];if(a===r)return;o.push(Jo(a));}var c=Jo(r);throw new j(q$1.INVALID_ARGUMENT,"Invalid value "+c+" provided to function "+t+'() for option "'+n+'". Acceptable values: '+o.join(", "));}(t,0,n,r,i);}/**
   * Validates that the provided argument is a valid enum.
   *
   * @param functionName Function making the validation call.
   * @param enums Array containing all possible values for the enum.
   * @param position Position of the argument in `functionName`.
   * @param argument Argument to validate.
   * @return The value as T if the argument can be converted.
   */function Ho(t,e,n,r){if(!e.some(function(t){return t===r;}))throw new j(q$1.INVALID_ARGUMENT,"Invalid value "+Jo(r)+" provided to function "+t+"() for its "+rs(n)+" argument. Acceptable values: "+e.join(", "));return r;}/** Helper to validate the type of a provided input. */function Yo(t,e,n,r){if(!("object"===e?$o(r):"non-empty string"===e?"string"==typeof r&&""!==r:_typeof(r)===e)){var i=Jo(r);throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+n+" to be of type "+e+", but it was: "+i);}}/**
   * Returns true if it's a non-null object without a custom prototype
   * (i.e. excludes Array, Date, etc.).
   */function $o(t){return "object"==_typeof(t)&&null!==t&&(Object.getPrototypeOf(t)===Object.prototype||null===Object.getPrototypeOf(t));}/** Returns a string describing the type / value of the provided input. */function Jo(t){if(void 0===t)return "undefined";if(null===t)return "null";if("string"==typeof t)return t.length>20&&(t=t.substring(0,20)+"..."),JSON.stringify(t);if("number"==typeof t||"boolean"==typeof t)return ""+t;if("object"==_typeof(t)){if(t instanceof Array)return "an array";var e=/** Hacky method to try to get the constructor name for an object. */function(t){if(t.constructor){var e=/function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());if(e&&e.length>1)return e[1];}return null;}(t);return e?"a custom "+e+" object":"an object";}return "function"==typeof t?"a function":_();}function Zo(t,e,n){if(void 0===n)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires a valid "+rs(e)+" argument, but it was undefined.");}/**
   * Validates the provided positional argument is an object, and its keys and
   * values match the expected keys and types provided in optionTypes.
   */function ts(t,e,n){C$1(e,function(e,r){if(n.indexOf(e)<0)throw new j(q$1.INVALID_ARGUMENT,"Unknown option '"+e+"' passed to function "+t+"(). Available options: "+n.join(", "));});}/**
   * Helper method to throw an error that the provided argument did not pass
   * an instanceof check.
   */function es(t,e,n,r){var i=Jo(r);return new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+rs(n)+" argument to be a "+e+", but it was: "+i);}function ns(t,e,n){if(n<=0)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+rs(e)+" argument to be a positive number, but it was: "+n+".");}/** Converts a number to its english word representation */function rs(t){switch(t){case 1:return "first";case 2:return "second";case 3:return "third";default:return t+"th";}}/**
   * Formats the given word as plural conditionally given the preceding number.
   */function is(t,e){return t+" "+e+(1===t?"":"s");}/**
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
   */ /** Helper function to assert Uint8Array is available at runtime. */function os(){if("undefined"==typeof Uint8Array)throw new j(q$1.UNIMPLEMENTED,"Uint8Arrays are not available in this environment.");}/** Helper function to assert Base64 functions are available at runtime. */function ss(){if("undefined"==typeof atob)throw new j(q$1.UNIMPLEMENTED,"Blobs are unavailable in Firestore in this environment.");}/**
   * Immutable class holding a blob (binary data).
   * This class is directly exposed in the public API.
   *
   * Note that while you can't hide the constructor in JavaScript code, we are
   * using the hack above to make sure no-one outside this module can call it.
   */var us=/** @class */function(){function t(t){ss(),this.nf=t;}return t.fromBase64String=function(e){jo("Blob.fromBase64String",arguments,1),zo("Blob.fromBase64String","string",1,e),ss();try{return new t(rt.fromBase64String(e));}catch(e){throw new j(q$1.INVALID_ARGUMENT,"Failed to construct Blob from Base64 string: "+e);}},t.fromUint8Array=function(e){if(jo("Blob.fromUint8Array",arguments,1),os(),!(e instanceof Uint8Array))throw es("Blob.fromUint8Array","Uint8Array",1,e);return new t(rt.fromUint8Array(e));},t.prototype.toBase64=function(){return jo("Blob.toBase64",arguments,0),ss(),this.nf.toBase64();},t.prototype.toUint8Array=function(){return jo("Blob.toUint8Array",arguments,0),os(),this.nf.toUint8Array();},t.prototype.toString=function(){return "Blob(base64: "+this.toBase64()+")";},t.prototype.isEqual=function(t){return this.nf.isEqual(t.nf);},t;}(),as=function as(t){!function(t,e,n,r){if(!(e instanceof Array)||e.length<1)throw new j(q$1.INVALID_ARGUMENT,"Function FieldPath() requires its fieldNames argument to be an array with at least "+is(1,"element")+".");}(0,t);for(var e=0;e<t.length;++e){if(zo("FieldPath","string",e,t[e]),0===t[e].length)throw new j(q$1.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");}this.sf=new Q$1(t);},cs=/** @class */function(e){/**
       * Creates a FieldPath from the provided field names. If more than one field
       * name is provided, the path will point to a nested field in a document.
       *
       * @param fieldNames A list of field names.
       */function n(){for(var t=[],n=0;n<arguments.length;n++){t[n]=arguments[n];}return e.call(this,t)||this;}return __extends(n,e),n.documentId=function(){/**
           * Internal Note: The backend doesn't technically support querying by
           * document ID. Instead it queries by the entire document name (full path
           * included), but in the cases we currently support documentId(), the net
           * effect is the same.
           */return new n(Q$1.L().F());},n.prototype.isEqual=function(t){if(!(t instanceof n))throw es("isEqual","FieldPath",1,t);return this.sf.isEqual(t.sf);},n;}(as),hs=new RegExp("[~\\*/\\[\\]]"),fs=function fs(){/** A pointer to the implementing class. */this.if=this;},ls=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).rf=t,n;}return __extends(n,e),n.prototype.hf=function(t){if(2/* MergeSet */!==t.af)throw 1/* Update */===t.af?t.uf(this.rf+"() can only appear at the top level of your update data"):t.uf(this.rf+"() cannot be used with set() unless you pass {merge:true}");// No transform to add for a delete, but we need to add it to our
  // fieldMask so it gets deleted.
  return t.Le.push(t.path),null;},n.prototype.isEqual=function(t){return t instanceof n;},n;}(fs);/**
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
   */ // The objects that are a part of this API are exposed to third-parties as
  // compiled javascript so we want to flag our private members with a leading
  // underscore to discourage their use.
  /**
   * A field class base class that is shared by the lite, full and legacy SDK,
   * which supports shared code that deals with FieldPaths.
   */ /**
   * Creates a child context for parsing SerializableFieldValues.
   *
   * This is different than calling `ParseContext.contextWith` because it keeps
   * the fieldTransforms and fieldMask separate.
   *
   * The created context has its `dataSource` set to `UserDataSource.Argument`.
   * Although these values are used with writes, any elements in these FieldValues
   * are not considered writes since they cannot contain any FieldValue sentinels,
   * etc.
   *
   * @param fieldValue The sentinel FieldValue for which to create a child
   *     context.
   * @param context The parent context.
   * @param arrayElement Whether or not the FieldValue has an array.
   */function ps(t,e,n){return new _s({af:3/* Argument */,cf:e.settings.cf,methodName:t.rf,lf:n},e.s,e.serializer,e.ignoreUndefinedProperties);}var ds=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).rf=t,n;}return __extends(n,e),n.prototype.hf=function(t){return new Ke(t.path,new Ue());},n.prototype.isEqual=function(t){return t instanceof n;},n;}(fs),vs=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).rf=t,r._f=n,r;}return __extends(n,e),n.prototype.hf=function(t){var e=ps(this,t,/*array=*/!0),n=this._f.map(function(t){return Ls(t,e);}),r=new Ce(n);return new Ke(t.path,r);},n.prototype.isEqual=function(t){// TODO(mrschmidt): Implement isEquals
  return this===t;},n;}(fs),ys=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).rf=t,r._f=n,r;}return __extends(n,e),n.prototype.hf=function(t){var e=ps(this,t,/*array=*/!0),n=this._f.map(function(t){return Ls(t,e);}),r=new Fe(n);return new Ke(t.path,r);},n.prototype.isEqual=function(t){// TODO(mrschmidt): Implement isEquals
  return this===t;},n;}(fs),ms=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).rf=t,r.ff=n,r;}return __extends(n,e),n.prototype.hf=function(t){var e=new je(t.serializer,se(t.serializer,this.ff));return new Ke(t.path,e);},n.prototype.isEqual=function(t){// TODO(mrschmidt): Implement isEquals
  return this===t;},n;}(fs),gs=/** @class */function(e){function n(){return e.call(this)||this;}return __extends(n,e),n.delete=function(){return qo("FieldValue.delete",arguments),new ws(new ls("FieldValue.delete"));},n.serverTimestamp=function(){return qo("FieldValue.serverTimestamp",arguments),new ws(new ds("FieldValue.serverTimestamp"));},n.arrayUnion=function(){for(var t=[],e=0;e<arguments.length;e++){t[e]=arguments[e];}// NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return Go("FieldValue.arrayUnion",arguments,1),new ws(new vs("FieldValue.arrayUnion",t));},n.arrayRemove=function(){for(var t=[],e=0;e<arguments.length;e++){t[e]=arguments[e];}// NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return Go("FieldValue.arrayRemove",arguments,1),new ws(new ys("FieldValue.arrayRemove",t));},n.increment=function(t){return zo("FieldValue.increment","number",1,t),jo("FieldValue.increment",arguments,1),new ws(new ms("FieldValue.increment",t));},n;}(fs),ws=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).if=t,n.rf=t.rf,n;}return __extends(n,e),n.prototype.hf=function(t){return this.if.hf(t);},n.prototype.isEqual=function(t){return t instanceof n&&this.if.isEqual(t.if);},n;}(gs),bs=/** @class */function(){function t(t,e){if(jo("GeoPoint",arguments,2),zo("GeoPoint","number",1,t),zo("GeoPoint","number",2,e),!isFinite(t)||t<-90||t>90)throw new j(q$1.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||e>180)throw new j(q$1.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this.df=t,this.wf=e;}return Object.defineProperty(t.prototype,"latitude",{/**
           * Returns the latitude of this geo point, a number between -90 and 90.
           */get:function get(){return this.df;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"longitude",{/**
           * Returns the longitude of this geo point, a number between -180 and 180.
           */get:function get(){return this.wf;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(t){return this.df===t.df&&this.wf===t.wf;},/**
       * Actually private to JS consumers of our API, so this function is prefixed
       * with an underscore.
       */t.prototype.T=function(t){return P$1(this.df,t.df)||P$1(this.wf,t.wf);},t;}(),Is=/^__.*__$/,Es=function Es(t,e,n){this.Tf=t,this.Ef=e,this.If=n;},Ts=/** @class */function(){function t(t,e,n){this.data=t,this.Le=e,this.fieldTransforms=n;}return t.prototype.mf=function(t,e){var n=[];return null!==this.Le?n.push(new nn(t,this.data,this.Le,e)):n.push(new en(t,this.data,e)),this.fieldTransforms.length>0&&n.push(new on(t,this.fieldTransforms)),n;},t;}(),Ns=/** @class */function(){function t(t,e,n){this.data=t,this.Le=e,this.fieldTransforms=n;}return t.prototype.mf=function(t,e){var n=[new nn(t,this.data,this.Le,e)];return this.fieldTransforms.length>0&&n.push(new on(t,this.fieldTransforms)),n;},t;}();function As(t){switch(t){case 0/* Set */:// fall through
  case 2/* MergeSet */:// fall through
  case 1/* Update */:return !0;case 3/* Argument */:case 4/* ArrayArgument */:return !1;default:throw _();}}/** A "context" object passed around while parsing user data. */var _s=/** @class */function(){/**
       * Initializes a ParseContext with the given source and path.
       *
       * @param settings The settings for the parser.
       * @param databaseId The database ID of the Firestore instance.
       * @param serializer The serializer to use to generate the Value proto.
       * @param ignoreUndefinedProperties Whether to ignore undefined properties
       * rather than throw.
       * @param fieldTransforms A mutable list of field transforms encountered while
       *     parsing the data.
       * @param fieldMask A mutable list of field paths encountered while parsing
       *     the data.
       *
       * TODO(b/34871131): We don't support array paths right now, so path can be
       * null to indicate the context represents any location within an array (in
       * which case certain features will not work and errors will be somewhat
       * compromised).
       */function t(t,e,n,r,i,o){this.settings=t,this.s=e,this.serializer=n,this.ignoreUndefinedProperties=r,// Minor hack: If fieldTransforms is undefined, we assume this is an
  // external call and we need to validate the entire path.
  void 0===i&&this.Af(),this.fieldTransforms=i||[],this.Le=o||[];}return Object.defineProperty(t.prototype,"path",{get:function get(){return this.settings.path;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"af",{get:function get(){return this.settings.af;},enumerable:!1,configurable:!0}),/** Returns a new context with the specified settings overwritten. */t.prototype.Rf=function(e){return new t(Object.assign(Object.assign({},this.settings),e),this.s,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.Le);},t.prototype.Pf=function(t){var e,n=null===(e=this.path)||void 0===e?void 0:e.child(t),r=this.Rf({path:n,lf:!1});return r.Vf(t),r;},t.prototype.gf=function(t){var e,n=null===(e=this.path)||void 0===e?void 0:e.child(t),r=this.Rf({path:n,lf:!1});return r.Af(),r;},t.prototype.yf=function(t){// TODO(b/34871131): We don't support array paths right now; so make path
  // undefined.
  return this.Rf({path:void 0,lf:!0});},t.prototype.uf=function(t){return Ms(t,this.settings.methodName,this.settings.pf||!1,this.path,this.settings.cf);},/** Returns 'true' if 'fieldPath' was traversed when creating this context. */t.prototype.contains=function(t){return void 0!==this.Le.find(function(e){return t.D(e);})||void 0!==this.fieldTransforms.find(function(e){return t.D(e.field);});},t.prototype.Af=function(){// TODO(b/34871131): Remove null check once we have proper paths for fields
  // within arrays.
  if(this.path)for(var t=0;t<this.path.length;t++){this.Vf(this.path.get(t));}},t.prototype.Vf=function(t){if(0===t.length)throw this.uf("Document fields must not be empty");if(As(this.af)&&Is.test(t))throw this.uf('Document fields cannot begin and end with "__"');},t;}(),Ds=/** @class */function(){function t(t,e,n){this.s=t,this.ignoreUndefinedProperties=e,this.serializer=n||Oo(t)/** Creates a new top-level parse context. */;}return t.prototype.bf=function(t,e,n,r){return void 0===r&&(r=!1),new _s({af:t,methodName:e,cf:n,path:Q$1.$(),lf:!1,pf:r},this.s,this.serializer,this.ignoreUndefinedProperties);},t;}();/**
   * Helper for parsing raw user input (provided via the API) into internal model
   * classes.
   */ /** Parse document data from a set() call. */function ks(t,e,n,r,i,o){void 0===o&&(o={});var s=t.bf(o.merge||o.mergeFields?2/* MergeSet */:0/* Set */,e,n,i);Vs("Data must be an object, but it was:",s,r);var u,a,c=Os(r,s);if(o.merge)u=new ze(s.Le),a=s.fieldTransforms;else if(o.mergeFields){for(var h=[],f=0,l=o.mergeFields;f<l.length;f++){var p=l[f],d=void 0;if(p instanceof as)d=p.sf;else {if("string"!=typeof p)throw _();d=Cs(e,p,n);}if(!s.contains(d))throw new j(q$1.INVALID_ARGUMENT,"Field '"+d+"' is specified in your field mask but missing from your input data.");Fs(h,d)||h.push(d);}u=new ze(h),a=s.fieldTransforms.filter(function(t){return u.je(t.field);});}else u=null,a=s.fieldTransforms;return new Ts(new hn(c),u,a);}/** Parse update data from an update() call. */function xs(t,e,n,r){var i=t.bf(1/* Update */,e,n);Vs("Data must be an object, but it was:",i,r);var o=[],s=new fn();C$1(r,function(t,r){var u=Cs(e,t,n),a=i.gf(u);if(r instanceof fs&&r.if instanceof ls)// Add it to the field mask, but don't add anything to updateData.
  o.push(u);else {var c=Ls(r,a);null!=c&&(o.push(u),s.set(u,c));}});var u=new ze(o);return new Ns(s.Ge(),u,i.fieldTransforms);}/** Parse update data from a list of field/value arguments. */function Ss(t,e,n,r,i,o){var s=t.bf(1/* Update */,e,n),u=[Us(e,r,n)],a=[i];if(o.length%2!=0)throw new j(q$1.INVALID_ARGUMENT,"Function "+e+"() needs to be called with an even number of arguments that alternate between field names and values.");for(var c=0;c<o.length;c+=2){u.push(Us(e,o[c])),a.push(o[c+1]);}// We iterate in reverse order to pick the last value for a field if the
  // user specified the field multiple times.
  for(var h=[],f=new fn(),l=u.length-1;l>=0;--l){if(!Fs(h,u[l])){var p=u[l],d=a[l],v=s.gf(p);if(d instanceof fs&&d.if instanceof ls)// Add it to the field mask, but don't add anything to updateData.
  h.push(p);else {var y=Ls(d,v);null!=y&&(h.push(p),f.set(p,y));}}}var m=new ze(h);return new Ns(f.Ge(),m,s.fieldTransforms);}/**
   * Parse a "query value" (e.g. value in a where filter or a value in a cursor
   * bound).
   *
   * @param allowArrays Whether the query value is an array that may directly
   * contain additional arrays (e.g. the operand of an `in` query).
   */function Ps(t,e,n,r){return void 0===r&&(r=!1),Ls(n,t.bf(r?4/* ArrayArgument */:3/* Argument */,e));}/**
   * Parses user data to Protobuf Values.
   *
   * @param input Data to be parsed.
   * @param context A context object representing the current path being parsed,
   * the source of the data being parsed, etc.
   * @return The parsed value, or null if the value was a FieldValue sentinel
   * that should not be included in the resulting parsed data.
   */function Ls(t,e){if(Rs(t))return Vs("Unsupported field value:",e,t),Os(t,e);if(t instanceof fs)// FieldValues usually parse into transforms (except FieldValue.delete())
  // in which case we do not want to include this field in our parsed data
  // (as doing so will overwrite the field directly prior to the transform
  // trying to transform it). So we don't add this location to
  // context.fieldMask and we return null as our parsing result.
  /**
       * "Parses" the provided FieldValueImpl, adding any necessary transforms to
       * context.fieldTransforms.
       */return function(t,e){// Sentinels are only supported with writes, and not within arrays.
  if(!As(e.af))throw e.uf(t.rf+"() can only be used with update() and set()");if(!e.path)throw e.uf(t.rf+"() is not currently supported inside arrays");var n=t.hf(e);n&&e.fieldTransforms.push(n);}(t,e),null;if(// If context.path is null we are inside an array and we don't support
  // field mask paths more granular than the top-level array.
  e.path&&e.Le.push(e.path),t instanceof Array){// TODO(b/34871131): Include the path containing the array in the error
  // message.
  // In the case of IN queries, the parsed data is an array (representing
  // the set of values to be included for the IN query) that may directly
  // contain additional arrays (each representing an individual field
  // value), so we disable this validation.
  if(e.settings.lf&&4/* ArrayArgument */!==e.af)throw e.uf("Nested arrays are not supported");return function(t,e){for(var n=[],r=0,i=0,o=t;i<o.length;i++){var s=Ls(o[i],e.yf(r));null==s&&(// Just include nulls in the array for fields being replaced with a
  // sentinel.
  s={nullValue:"NULL_VALUE"}),n.push(s),r++;}return {arrayValue:{values:n}};}(t,e);}return function(t,e){if(null===t)return {nullValue:"NULL_VALUE"};if("number"==typeof t)return se(e.serializer,t);if("boolean"==typeof t)return {booleanValue:t};if("string"==typeof t)return {stringValue:t};if(t instanceof Date){var n=G$1.fromDate(t);return {timestampValue:ue(e.serializer,n)};}if(t instanceof G$1){// Firestore backend truncates precision down to microseconds. To ensure
  // offline mode works the same with regards to truncation, perform the
  // truncation immediately without waiting for the backend to do that.
  var r=new G$1(t.seconds,1e3*Math.floor(t.nanoseconds/1e3));return {timestampValue:ue(e.serializer,r)};}if(t instanceof bs)return {geoPointValue:{latitude:t.latitude,longitude:t.longitude}};if(t instanceof us)return {bytesValue:ae(e.serializer,t)};if(t instanceof Es){var i=e.s,o=t.Tf;if(!o.isEqual(i))throw e.uf("Document reference is for database "+o.projectId+"/"+o.database+" but should be for database "+i.projectId+"/"+i.database);return {referenceValue:fe(t.Tf||e.s,t.Ef.path)};}if(void 0===t&&e.ignoreUndefinedProperties)return null;throw e.uf("Unsupported field value: "+Jo(t));}(t,e);}function Os(t,e){var n={};return M$1(t)?// If we encounter an empty object, we explicitly add it to the update
  // mask to ensure that the server creates a map entry.
  e.path&&e.path.length>0&&e.Le.push(e.path):C$1(t,function(t,r){var i=Ls(r,e.Pf(t));null!=i&&(n[t]=i);}),{mapValue:{fields:n}};}function Rs(t){return !("object"!=_typeof(t)||null===t||t instanceof Array||t instanceof Date||t instanceof G$1||t instanceof bs||t instanceof us||t instanceof Es||t instanceof fs);}function Vs(t,e,n){if(!Rs(n)||!$o(n)){var r=Jo(n);throw "an object"===r?e.uf(t+" a custom object"):e.uf(t+" "+r);}}/**
   * Helper that calls fromDotSeparatedString() but wraps any error thrown.
   */function Us(t,e,n){if(e instanceof as)return e.sf;if("string"==typeof e)return Cs(t,e);throw Ms("Field path arguments must be of type string or FieldPath.",t,/* hasConverter= */!1,/* path= */void 0,n);}/**
   * Wraps fromDotSeparatedString with an error message about the method that
   * was thrown.
   * @param methodName The publicly visible method name
   * @param path The dot-separated string form of a field path which will be split
   * on dots.
   * @param targetDoc The document against which the field path will be evaluated.
   */function Cs(t,e,n){try{return function(t){if(t.search(hs)>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid field path ("+t+"). Paths must not contain '~', '*', '/', '[', or ']'");try{return new(cs.bind.apply(cs,__spreadArrays([void 0],t.split("."))))();}catch(e){throw new j(q$1.INVALID_ARGUMENT,"Invalid field path ("+t+"). Paths must not be empty, begin with '.', end with '.', or contain '..'");}}(e).sf;}catch(e){throw Ms((i=e)instanceof Error?i.message:i.toString(),t,/* hasConverter= */!1,/* path= */void 0,n);}/**
   * Extracts the message from a caught exception, which should be an Error object
   * though JS doesn't guarantee that.
   */var i;/** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}function Ms(t,e,n,r,i){var o=r&&!r._(),s=void 0!==i,u="Function "+e+"() called with invalid data";n&&(u+=" (via `toFirestore()`)");var a="";return (o||s)&&(a+=" (found",o&&(a+=" in field "+r),s&&(a+=" in document "+i),a+=")"),new j(q$1.INVALID_ARGUMENT,(u+=". ")+t+a);}function Fs(t,e){return t.some(function(t){return t.isEqual(e);});}/**
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
   */ /**
   * Internal transaction object responsible for accumulating the mutations to
   * perform and the base versions for any documents read.
   */var qs=/** @class */function(){function t(t){this.su=t,// The version of each document that was read during this transaction.
  this.vf=new Map(),this.mutations=[],this.Sf=!1,/**
               * A deferred usage error that occurred previously in this transaction that
               * will cause the transaction to fail once it actually commits.
               */this.Df=null,/**
               * Set of documents that have been written in the transaction.
               *
               * When there's more than one write to the same key in a transaction, any
               * writes after the first are handled differently.
               */this.Cf=new Set();}return t.prototype.Nf=function(t){return __awaiter$1(this,void 0,void 0,function(){var r,i=this;return __generator$1(this,function(o){switch(o.label){case 0:if(this.Ff(),this.mutations.length>0)throw new j(q$1.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes.");return [4/*yield*/,function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o,s,u,a;return __generator$1(this,function(n){switch(n.label){case 0:return e=k$1(t),i=me(e.serializer)+"/documents",o={documents:r.map(function(t){return pe(e.serializer,t);})},[4/*yield*/,e.Ka("BatchGetDocuments",i,o)];case 1:return s=n.sent(),u=new Map(),s.forEach(function(t){var n=function(t,e){return "found"in e?function(t,e){D$1(!!e.found),e.found.name,e.found.updateTime;var n=de(t,e.found.name),r=he(e.found.updateTime),i=new hn({mapValue:{fields:e.found.fields}});return new dn(n,r,i,{});}(t,e):"missing"in e?function(t,e){D$1(!!e.missing),D$1(!!e.readTime);var n=de(t,e.missing),r=he(e.readTime);return new vn(n,r);}(t,e):_();}(e.serializer,t);u.set(n.key.toString(),n);}),a=[],[2/*return*/,(r.forEach(function(t){var e=u.get(t.toString());D$1(!!e),a.push(e);}),a)];}});});}(this.su,t)];case 1:return [2/*return*/,((r=o.sent()).forEach(function(t){t instanceof vn||t instanceof dn?i.kf(t):_();}),r)];}});});},t.prototype.set=function(t,e){this.write(e.mf(t,this.Ue(t))),this.Cf.add(t);},t.prototype.update=function(t,e){try{this.write(e.mf(t,this.xf(t)));}catch(t){this.Df=t;}this.Cf.add(t);},t.prototype.delete=function(t){this.write([new an(t,this.Ue(t))]),this.Cf.add(t);},t.prototype.commit=function(){return __awaiter$1(this,void 0,void 0,function(){var t,r=this;return __generator$1(this,function(i){switch(i.label){case 0:if(this.Ff(),this.Df)throw this.Df;return t=this.vf,// For each mutation, note that the doc was written.
  this.mutations.forEach(function(e){t.delete(e.key.toString());}),// For each document that was read but not written to, we want to perform
  // a `verify` operation.
  t.forEach(function(t,e){var n=new W$1(K$1.k(e));r.mutations.push(new cn(n,r.Ue(n)));}),[4/*yield*/,function(t,r){return __awaiter$1(this,void 0,void 0,function(){var e,i,o;return __generator$1(this,function(n){switch(n.label){case 0:return e=k$1(t),i=me(e.serializer)+"/documents",o={writes:r.map(function(t){return be(e.serializer,t);})},[4/*yield*/,e.ja("Commit",i,o)];case 1:return n.sent(),[2/*return*/];}});});}(this.su,this.mutations)];case 1:// For each mutation, note that the doc was written.
  return i.sent(),this.Sf=!0,[2/*return*/];}});});},t.prototype.kf=function(t){var e;if(t instanceof dn)e=t.version;else {if(!(t instanceof vn))throw _();// For deleted docs, we must use baseVersion 0 when we overwrite them.
  e=B.min();}var n=this.vf.get(t.key.toString());if(n){if(!e.isEqual(n))// This transaction will fail no matter what.
  throw new j(q$1.ABORTED,"Document version changed between two reads.");}else this.vf.set(t.key.toString(),e);},/**
       * Returns the version of this document when it was read in this transaction,
       * as a precondition, or no precondition if it was not read.
       */t.prototype.Ue=function(t){var e=this.vf.get(t.toString());return !this.Cf.has(t)&&e?Qe.updateTime(e):Qe.Qe();},/**
       * Returns the precondition for a document if the operation is an update.
       */t.prototype.xf=function(t){var e=this.vf.get(t.toString());// The first time a document is written, we want to take into account the
  // read time and existence
  if(!this.Cf.has(t)&&e){if(e.isEqual(B.min()))// The document doesn't exist, so fail the transaction.
  // This has to be validated locally because you can't send a
  // precondition that a document does not exist without changing the
  // semantics of the backend write to be an insert. This is the reverse
  // of what we want, since we want to assert that the document doesn't
  // exist but then send the update and have it fail. Since we can't
  // express that to the backend, we have to validate locally.
  // Note: this can change once we can send separate verify writes in the
  // transaction.
  throw new j(q$1.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");// Document exists, base precondition on document update time.
  return Qe.updateTime(e);}// Document was not read, so we just use the preconditions for a blind
  // update.
  return Qe.exists(!0);},t.prototype.write=function(t){this.Ff(),this.mutations=this.mutations.concat(t);},t.prototype.Ff=function(){},t;}(),js=/** @class */function(){function t(t,e,n,r){this.ti=t,this.su=e,this.updateFunction=n,this.si=r,this.$f=5,this.wi=new ir(this.ti,"transaction_retry"/* TransactionRetry */)/** Runs the transaction and sets the result on deferred. */;}return t.prototype.run=function(){this.Mf();},t.prototype.Mf=function(){var t=this;this.wi.ps(function(){return __awaiter$1(t,void 0,void 0,function(){var t,e,r=this;return __generator$1(this,function(n){return t=new qs(this.su),(e=this.Of(t))&&e.then(function(e){r.ti.hi(function(){return t.commit().then(function(){r.si.resolve(e);}).catch(function(t){r.Lf(t);});});}).catch(function(t){r.Lf(t);}),[2/*return*/];});});});},t.prototype.Of=function(t){try{var e=this.updateFunction(t);return !H$1(e)&&e.catch&&e.then?e:(this.si.reject(Error("Transaction callback must return a Promise")),null);}catch(t){// Do not retry errors thrown by user provided updateFunction.
  return this.si.reject(t),null;}},t.prototype.Lf=function(t){var e=this;this.$f>0&&this.qf(t)?(this.$f-=1,this.ti.hi(function(){return e.Mf(),Promise.resolve();})):this.si.reject(t);},t.prototype.qf=function(t){if("FirebaseError"===t.name){// In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
  // non-matching document versions with ABORTED. These errors should be retried.
  var e=t.code;return "aborted"===e||"failed-precondition"===e||!at(e);}return !1;},t;}(),Gs=/** @class */function(){function t(t,/**
       * Asynchronous queue responsible for all of our internal processing. When
       * we get incoming work from the user (via public API) or the network
       * (incoming GRPC messages), we should always schedule onto this queue.
       * This ensures all of our work is properly serialized (e.g. we don't
       * start processing a new operation while the previous one is waiting for
       * an async I/O to complete).
       */e){this.credentials=t,this.ti=e,this.clientId=S$1.t(),// We defer our initialization until we get the current user from
  // setChangeListener(). We block the async queue until we got the initial
  // user and the initialization is completed. This will prevent any scheduled
  // work from happening before initialization is completed.
  // If initializationDone resolved then the FirestoreClient is in a usable
  // state.
  this.Bf=new rr()/**
       * Starts up the FirestoreClient, returning only whether or not enabling
       * persistence succeeded.
       *
       * The intent here is to "do the right thing" as far as users are concerned.
       * Namely, in cases where offline persistence is requested and possible,
       * enable it, but otherwise fall back to persistence disabled. For the most
       * part we expect this to succeed one way or the other so we don't expect our
       * users to actually wait on the firestore.enablePersistence Promise since
       * they generally won't care.
       *
       * Of course some users actually do care about whether or not persistence
       * was successfully enabled, so the Promise returned from this method
       * indicates this outcome.
       *
       * This presents a problem though: even before enablePersistence resolves or
       * rejects, users may have made calls to e.g. firestore.collection() which
       * means that the FirestoreClient in there will be available and will be
       * enqueuing actions on the async queue.
       *
       * Meanwhile any failure of an operation on the async queue causes it to
       * panic and reject any further work, on the premise that unhandled errors
       * are fatal.
       *
       * Consequently the fallback is handled internally here in start, and if the
       * fallback succeeds we signal success to the async queue even though the
       * start() itself signals failure.
       *
       * @param databaseInfo The connection information for the current instance.
       * @param offlineComponentProvider Provider that returns all components
       * required for memory-only or IndexedDB persistence.
       * @param onlineComponentProvider Provider that returns all components
       * required for online support.
       * @param persistenceSettings Settings object to configure offline
       *     persistence.
       * @returns A deferred result indicating the user-visible result of enabling
       *     offline persistence. This method will reject this if IndexedDB fails to
       *     start for any reason. If usePersistence is false this is
       *     unconditionally resolved.
       */;}return t.prototype.start=function(t,e,n,r){var i=this;this.Uf(),this.b_=t;// If usePersistence is true, certain classes of errors while starting are
  // recoverable but only by falling back to persistence disabled.
  // If there's an error in the first case but not in recovery we cannot
  // reject the promise blocking the async queue because this will cause the
  // async queue to panic.
  var o=new rr(),s=!1;// Return only the result of enabling persistence. Note that this does not
  // need to await the completion of initializationDone because the result of
  // this method should not reflect any other kind of failure to start.
  return this.credentials.ia(function(t){if(!s)return s=!0,E$1("FirestoreClient","Initializing. user=",t.uid),i.Qf(e,n,r,t,o).then(i.Bf.resolve,i.Bf.reject);i.ti.Vi(function(){return i.nl.Wu(t);});}),// Block the async queue until initialization is done
  this.ti.hi(function(){return i.Bf.promise;}),o.promise;},/** Enables the network connection and requeues all pending operations. */t.prototype.enableNetwork=function(){var t=this;return this.Uf(),this.ti.enqueue(function(){return t.persistence.Uo(!0),t.nl.enableNetwork();});},/**
       * Initializes persistent storage, attempting to use IndexedDB if
       * usePersistence is true or memory-only if false.
       *
       * If IndexedDB fails because it's already open in another tab or because the
       * platform can't possibly support our implementation then this method rejects
       * the persistenceResult and falls back on memory-only persistence.
       *
       * @param offlineComponentProvider Provider that returns all components
       * required for memory-only or IndexedDB persistence.
       * @param onlineComponentProvider Provider that returns all components
       * required for online support.
       * @param persistenceSettings Settings object to configure offline persistence
       * @param user The initial user
       * @param persistenceResult A deferred result indicating the user-visible
       *     result of enabling offline persistence. This method will reject this if
       *     IndexedDB fails to start for any reason. If usePersistence is false
       *     this is unconditionally resolved.
       * @returns a Promise indicating whether or not initialization should
       *     continue, i.e. that one of the persistence implementations actually
       *     succeeded.
       */t.prototype.Qf=function(t,r,i,o,s){return __awaiter$1(this,void 0,void 0,function(){var u,a,c=this;return __generator$1(this,function(h){switch(h.label){case 0:return h.trys.push([0,3,,4]),u={ti:this.ti,b_:this.b_,clientId:this.clientId,credentials:this.credentials,j_:o,il:100,G_:i},[4/*yield*/,t.initialize(u)];case 1:return h.sent(),[4/*yield*/,r.initialize(t,u)];case 2:return h.sent(),this.persistence=t.persistence,this.sl=t.sl,this.nu=t.nu,this.U_=t.U_,this.su=r.su,this.nl=r.nl,this.Du=r.Du,this.Wf=r.X_,// When a user calls clearPersistence() in one client, all other clients
  // need to be terminated to allow the delete to succeed.
  this.persistence.Bo(function(){return __awaiter$1(c,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:return [4/*yield*/,this.terminate()];case 1:return t.sent(),[2/*return*/];}});});}),s.resolve(),[3/*break*/,4];case 3:// An unknown failure on the first stage shuts everything down.
  if(a=h.sent(),// Regardless of whether or not the retry succeeds, from an user
  // perspective, offline persistence has failed.
  s.reject(a),!this.jf(a))throw a;return [2/*return*/,(console.warn("Error enabling offline persistence. Falling back to persistence disabled: "+a),this.Qf(new Vo(),new Co(),{K_:!1},o,s))];case 4:return [2/*return*/];}});});},/**
       * Decides whether the provided error allows us to gracefully disable
       * persistence (as opposed to crashing the client).
       */t.prototype.jf=function(t){return "FirebaseError"===t.name?t.code===q$1.FAILED_PRECONDITION||t.code===q$1.UNIMPLEMENTED:!("undefined"!=typeof DOMException&&t instanceof DOMException)||// When the browser is out of quota we could get either quota exceeded
  // or an aborted error depending on whether the error happened during
  // schema migration.
  22===t.code||20===t.code||// Firefox Private Browsing mode disables IndexedDb and returns
  // INVALID_STATE for any usage.
  11===t.code;},/**
       * Checks that the client has not been terminated. Ensures that other methods on
       * this class cannot be called after the client is terminated.
       */t.prototype.Uf=function(){if(this.ti.Ei)throw new j(q$1.FAILED_PRECONDITION,"The client has already been terminated.");},/** Disables the network connection. Pending operations will not complete. */t.prototype.disableNetwork=function(){var t=this;return this.Uf(),this.ti.enqueue(function(){return t.persistence.Uo(!1),t.nl.disableNetwork();});},t.prototype.terminate=function(){var t=this;return this.ti.Pi(function(){return __awaiter$1(t,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:// PORTING NOTE: LocalStore does not need an explicit shutdown on web.
  return this.U_&&this.U_.stop(),[4/*yield*/,this.nl.th()];case 1:return t.sent(),[4/*yield*/,this.sl.th()];case 2:return t.sent(),[4/*yield*/,this.persistence.th()];case 3:// PORTING NOTE: LocalStore does not need an explicit shutdown on web.
  return t.sent(),// `removeChangeListener` must be called after shutting down the
  // RemoteStore as it will prevent the RemoteStore from retrieving
  // auth tokens.
  this.credentials.ra(),[2/*return*/];}});});});},/**
       * Returns a Promise that resolves when all writes that were pending at the time this
       * method was called received server acknowledgement. An acknowledgement can be either acceptance
       * or rejection.
       */t.prototype.waitForPendingWrites=function(){var t=this;this.Uf();var e=new rr();return this.ti.hi(function(){return t.Du.bl(e);}),e.promise;},t.prototype.listen=function(t,e,n){var r=this;this.Uf();var i=new Fo(n),o=new bo(t,i,e);return this.ti.hi(function(){return r.Wf.listen(o);}),function(){i.ef(),r.ti.hi(function(){return r.Wf.vu(o);});};},t.prototype.Kf=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(r){switch(r.label){case 0:return this.Uf(),[4/*yield*/,this.Bf.promise];case 1:return [2/*return*/,(r.sent(),function(t,r,i){return __awaiter$1(this,void 0,void 0,function(){var o,s=this;return __generator$1(this,function(u){switch(u.label){case 0:return o=new rr(),[4/*yield*/,t.enqueue(function(){return __awaiter$1(s,void 0,void 0,function(){var t,e,s;return __generator$1(this,function(n){switch(n.label){case 0:return n.trys.push([0,2,,3]),[4/*yield*/,r.$h(i)];case 1:return (t=n.sent())instanceof dn?o.resolve(t):t instanceof vn?o.resolve(null):o.reject(new j(q$1.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)")),[3/*break*/,3];case 2:return e=n.sent(),s=gr(e,"Failed to get document '"+i+" from cache"),o.reject(s),[3/*break*/,3];case 3:return [2/*return*/];}});});})];case 1:return [2/*return*/,(u.sent(),o.promise)];}});});}(this.ti,this.nu,t))];}});});},t.prototype.Gf=function(t,r){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:return this.Uf(),[4/*yield*/,this.Bf.promise];case 1:return [2/*return*/,(e.sent(),function(t,e,n,r){var i=new rr(),o=Bs(t,e,bn(n.path),{includeMetadataChanges:!0,Gl:!0},{next:function next(t){// Remove query first before passing event to user to avoid
  // user actions affecting the now stale query.
  o();var e=t.docs.has(n);!e&&t.fromCache?// TODO(dimond): If we're online and the document doesn't
  // exist then we resolve with a doc.exists set to false. If
  // we're offline however, we reject the Promise in this
  // case. Two options: 1) Cache the negative response from
  // the server so we can deliver that even when you're
  // offline 2) Actually reject the Promise in the online case
  // if the document doesn't exist.
  i.reject(new j(q$1.UNAVAILABLE,"Failed to get document because the client is offline.")):e&&t.fromCache&&r&&"server"===r.source?i.reject(new j(q$1.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):i.resolve(t);},error:function error(t){return i.reject(t);}});return i.promise;}(this.ti,this.Wf,t,r))];}});});},t.prototype.zf=function(t){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(r){switch(r.label){case 0:return this.Uf(),[4/*yield*/,this.Bf.promise];case 1:return [2/*return*/,(r.sent(),function(t,r,i){return __awaiter$1(this,void 0,void 0,function(){var o,s=this;return __generator$1(this,function(u){switch(u.label){case 0:return o=new rr(),[4/*yield*/,t.enqueue(function(){return __awaiter$1(s,void 0,void 0,function(){var t,e,s,u,a,c;return __generator$1(this,function(n){switch(n.label){case 0:return n.trys.push([0,2,,3]),[4/*yield*/,r.Lh(i,/* usePreviousResults= */!0)];case 1:return t=n.sent(),e=new oo(i,t.qh),s=e.Wc(t.documents),u=e.Bn(s,/* updateLimboDocuments= */!1),o.resolve(u.snapshot),[3/*break*/,3];case 2:return a=n.sent(),c=gr(a,"Failed to execute query '"+i+" against cache"),o.reject(c),[3/*break*/,3];case 3:return [2/*return*/];}});});})];case 1:return [2/*return*/,(u.sent(),o.promise)];}});});}(this.ti,this.nu,t))];}});});},t.prototype.Hf=function(t,r){return __awaiter$1(this,void 0,void 0,function(){return __generator$1(this,function(e){switch(e.label){case 0:return this.Uf(),[4/*yield*/,this.Bf.promise];case 1:return [2/*return*/,(e.sent(),function(t,e,n,r){var i=new rr(),o=Bs(t,e,n,{includeMetadataChanges:!0,Gl:!0},{next:function next(t){// Remove query first before passing event to user to avoid
  // user actions affecting the now stale query.
  o(),t.fromCache&&r&&"server"===r.source?i.reject(new j(q$1.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):i.resolve(t);},error:function error(t){return i.reject(t);}});return i.promise;}(this.ti,this.Wf,t,r))];}});});},t.prototype.write=function(t){var e=this;this.Uf();var n=new rr();return this.ti.hi(function(){return e.Du.write(t,n);}),n.promise;},t.prototype.s=function(){return this.b_.s;},t.prototype.Ll=function(t){var r=this;this.Uf();var i=new Fo(t);return this.ti.hi(function(){return __awaiter$1(r,void 0,void 0,function(){return __generator$1(this,function(t){return [2/*return*/,this.Wf.Ll(i)];});});}),function(){i.ef(),r.ti.hi(function(){return __awaiter$1(r,void 0,void 0,function(){return __generator$1(this,function(t){return [2/*return*/,this.Wf.ql(i)];});});});};},Object.defineProperty(t.prototype,"Yf",{get:function get(){// Technically, the asyncQueue is still running, but only accepting operations
  // related to termination or supposed to be run after termination. It is effectively
  // terminated to the eyes of users.
  return this.ti.Ei;},enumerable:!1,configurable:!0}),/**
       * Takes an updateFunction in which a set of reads and writes can be performed
       * atomically. In the updateFunction, the client can read and write values
       * using the supplied transaction object. After the updateFunction, all
       * changes will be committed. If a retryable error occurs (ex: some other
       * client has changed any of the data referenced), then the updateFunction
       * will be called again after a backoff. If the updateFunction still fails
       * after all retries, then the transaction will be rejected.
       *
       * The transaction object passed to the updateFunction contains methods for
       * accessing documents and collections. Unlike other datastore access, data
       * accessed with the transaction will not reflect local changes that have not
       * been committed. For this reason, it is required that all reads are
       * performed before any writes. Transactions must be performed while online.
       */t.prototype.transaction=function(t){var e=this;this.Uf();var n=new rr();return this.ti.hi(function(){return new js(e.ti,e.su,t,n).run(),Promise.resolve();}),n.promise;},t;}();/**
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
   */ /**
   * TransactionRunner encapsulates the logic needed to run and retry transactions
   * with backoff.
   */function Bs(t,e,n,r,i){var o=new Fo(i),s=new bo(n,o,r);return t.hi(function(){return e.listen(s);}),function(){o.ef(),t.hi(function(){return e.vu(s);});};}var zs=/** @class */function(){function t(t,e,n,r){this.s=t,this.timestampsInSnapshots=e,this.Jf=n,this.Xf=r;}return t.prototype.Zf=function(t){switch(qt(t)){case 0/* NullValue */:return null;case 1/* BooleanValue */:return t.booleanValue;case 2/* NumberValue */:return Qt(t.integerValue||t.doubleValue);case 3/* TimestampValue */:return this.td(t.timestampValue);case 4/* ServerTimestampValue */:return this.ed(t);case 5/* StringValue */:return t.stringValue;case 6/* BlobValue */:return new us(Wt(t.bytesValue));case 7/* RefValue */:return this.nd(t.referenceValue);case 8/* GeoPointValue */:return this.sd(t.geoPointValue);case 9/* ArrayValue */:return this.rd(t.arrayValue);case 10/* ObjectValue */:return this.od(t.mapValue);default:throw _();}},t.prototype.od=function(t){var e=this,n={};return C$1(t.fields||{},function(t,r){n[t]=e.Zf(r);}),n;},t.prototype.sd=function(t){return new bs(Qt(t.latitude),Qt(t.longitude));},t.prototype.rd=function(t){var e=this;return (t.values||[]).map(function(t){return e.Zf(t);});},t.prototype.ed=function(t){switch(this.Jf){case"previous":var e=function t(e){var n=e.mapValue.fields.__previous_value__;return Ct(n)?t(n):n;}(t);return null==e?null:this.Zf(e);case"estimate":return this.td(Mt(t));default:return null;}},t.prototype.td=function(t){var e=Xt(t),n=new G$1(e.seconds,e.nanos);return this.timestampsInSnapshots?n:n.toDate();},t.prototype.nd=function(t){var e=K$1.k(t);D$1(Pe(e));var n=new V$1(e.get(1),e.get(3)),r=new W$1(e.g(5));return n.isEqual(this.s)||// TODO(b/64130202): Somehow support foreign references.
  T$1("Document "+r+" contains a document reference within a different database ("+n.projectId+"/"+n.database+") which is not supported. It will be treated as a reference in the current database ("+this.s.projectId+"/"+this.s.database+") instead."),this.Xf(r);},t;}(),Ks=Er.ji,Xs=/** @class */function(){function t(t){var e,n,r,i;if(void 0===t.host){if(void 0!==t.ssl)throw new j(q$1.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0;}else Xo("settings","non-empty string","host",t.host),this.host=t.host,Qo("settings","boolean","ssl",t.ssl),this.ssl=null===(e=t.ssl)||void 0===e||e;if(ts("settings",t,["host","ssl","credentials","timestampsInSnapshots","cacheSizeBytes","experimentalForceLongPolling","ignoreUndefinedProperties"]),Qo("settings","object","credentials",t.credentials),this.credentials=t.credentials,Qo("settings","boolean","timestampsInSnapshots",t.timestampsInSnapshots),Qo("settings","boolean","ignoreUndefinedProperties",t.ignoreUndefinedProperties),// Nobody should set timestampsInSnapshots anymore, but the error depends on
  // whether they set it to true or false...
  !0===t.timestampsInSnapshots?T$1("The setting 'timestampsInSnapshots: true' is no longer required and should be removed."):!1===t.timestampsInSnapshots&&T$1("Support for 'timestampsInSnapshots: false' will be removed soon. You must update your code to handle Timestamp objects."),this.timestampsInSnapshots=null===(n=t.timestampsInSnapshots)||void 0===n||n,this.ignoreUndefinedProperties=null!==(r=t.ignoreUndefinedProperties)&&void 0!==r&&r,Qo("settings","number","cacheSizeBytes",t.cacheSizeBytes),void 0===t.cacheSizeBytes)this.cacheSizeBytes=Er.Gi;else {if(t.cacheSizeBytes!==Ks&&t.cacheSizeBytes<Er.Ki)throw new j(q$1.INVALID_ARGUMENT,"cacheSizeBytes must be at least "+Er.Ki);this.cacheSizeBytes=t.cacheSizeBytes;}Qo("settings","boolean","experimentalForceLongPolling",t.experimentalForceLongPolling),this.forceLongPolling=null!==(i=t.experimentalForceLongPolling)&&void 0!==i&&i;}return t.prototype.isEqual=function(t){return this.host===t.host&&this.ssl===t.ssl&&this.timestampsInSnapshots===t.timestampsInSnapshots&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.forceLongPolling===t.forceLongPolling&&this.ignoreUndefinedProperties===t.ignoreUndefinedProperties;},t;}(),Qs=/** @class */function(){// Note: We are using `MemoryComponentProvider` as a default
  // ComponentProvider to ensure backwards compatibility with the format
  // expected by the console build.
  function t(r,i,o,s){var u=this;if(void 0===o&&(o=new Vo()),void 0===s&&(s=new Co()),this.hd=o,this.ad=s,this.ud=null,// Public for use in tests.
  // TODO(mikelehen): Use modularized initialization instead.
  this.ld=new mr(),this.INTERNAL={delete:function _delete(){return __awaiter$1(u,void 0,void 0,function(){return __generator$1(this,function(t){switch(t.label){case 0:// The client must be initalized to ensure that all subsequent API usage
  // throws an exception.
  return this._d(),[4/*yield*/,this.fd.terminate()];case 1:// The client must be initalized to ensure that all subsequent API usage
  // throws an exception.
  return t.sent(),[2/*return*/];}});});}},"object"==_typeof(r.options)){// This is very likely a Firebase app object
  // TODO(b/34177605): Can we somehow use instanceof?
  var a=r;this.ud=a,this.Tf=t.dd(a),this.wd=a.name,this.Td=new Mi(i);}else {var c=r;if(!c.projectId)throw new j(q$1.INVALID_ARGUMENT,"Must provide projectId");this.Tf=new V$1(c.projectId,c.database),// Use a default persistenceKey that lines up with FirebaseApp.
  this.wd="[DEFAULT]",this.Td=new Ci();}this.Ed=new Xs({});}return Object.defineProperty(t.prototype,"Id",{get:function get(){return this.md||(// Lazy initialize UserDataReader once the settings are frozen
  this.md=new Ds(this.Tf,this.Ed.ignoreUndefinedProperties)),this.md;},enumerable:!1,configurable:!0}),t.prototype.settings=function(t){jo("Firestore.settings",arguments,1),zo("Firestore.settings","object",1,t);var e=new Xs(t);if(this.fd&&!this.Ed.isEqual(e))throw new j(q$1.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only call settings() before calling any other methods on a Firestore object.");this.Ed=e,void 0!==e.credentials&&(this.Td=function(t){if(!t)return new Ci();switch(t.type){case"gapi":var e=t.Ad;// Make sure this really is a Gapi client.
  return D$1(!("object"!=_typeof(e)||null===e||!e.auth||!e.auth.getAuthHeaderValueForFirstParty)),new qi(e,t.la||"0");case"provider":return t.Ad;default:throw new j(q$1.INVALID_ARGUMENT,"makeCredentialsProvider failed due to invalid credential type");}}(e.credentials));},t.prototype.enableNetwork=function(){return this._d(),this.fd.enableNetwork();},t.prototype.disableNetwork=function(){return this._d(),this.fd.disableNetwork();},t.prototype.enablePersistence=function(t){var e,n;if(this.fd)throw new j(q$1.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only call enablePersistence() before calling any other methods on a Firestore object.");var r=!1,i=!1;if(t&&(void 0!==t.experimentalTabSynchronization&&T$1("The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead."),r=null!==(n=null!==(e=t.synchronizeTabs)&&void 0!==e?e:t.experimentalTabSynchronization)&&void 0!==n&&n,i=!!t.experimentalForceOwningTab&&t.experimentalForceOwningTab,r&&i))throw new j(q$1.INVALID_ARGUMENT,"The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'.");return this.Rd(this.hd,this.ad,{K_:!0,cacheSizeBytes:this.Ed.cacheSizeBytes,synchronizeTabs:r,Vo:i});},t.prototype.clearPersistence=function(){return __awaiter$1(this,void 0,void 0,function(){var t,r=this;return __generator$1(this,function(i){if(void 0!==this.fd&&!this.fd.Yf)throw new j(q$1.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");return t=new rr(),[2/*return*/,(this.ld.Ii(function(){return __awaiter$1(r,void 0,void 0,function(){var e;return __generator$1(this,function(n){switch(n.label){case 0:return n.trys.push([0,2,,3]),[4/*yield*/,this.hd.clearPersistence(this.Tf,this.wd)];case 1:return n.sent(),t.resolve(),[3/*break*/,3];case 2:return e=n.sent(),t.reject(e),[3/*break*/,3];case 3:return [2/*return*/];}});});}),t.promise)];});});},t.prototype.terminate=function(){return this.app._removeServiceInstance("firestore"),this.INTERNAL.delete();},Object.defineProperty(t.prototype,"Pd",{get:function get(){return this._d(),this.fd.Yf;},enumerable:!1,configurable:!0}),t.prototype.waitForPendingWrites=function(){return this._d(),this.fd.waitForPendingWrites();},t.prototype.onSnapshotsInSync=function(t){if(this._d(),Mo(t))return this.fd.Ll(t);zo("Firestore.onSnapshotsInSync","function",1,t);var e={next:t};return this.fd.Ll(e);},t.prototype._d=function(){return this.fd||// Kick off starting the client but don't actually wait for it.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  this.Rd(new Vo(),new Co(),{K_:!1}),this.fd;},t.prototype.Vd=function(){return new R$1(this.Tf,this.wd,this.Ed.host,this.Ed.ssl,this.Ed.forceLongPolling);},t.prototype.Rd=function(t,e,n){var r=this.Vd();return this.fd=new Gs(this.Td,this.ld),this.fd.start(r,t,e,n);},t.dd=function(t){if(e=t.options,!Object.prototype.hasOwnProperty.call(e,"projectId"))throw new j(q$1.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');var e,n=t.options.projectId;/**
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
   */if(!n||"string"!=typeof n)throw new j(q$1.INVALID_ARGUMENT,"projectId must be a string in FirebaseApp.options");return new V$1(n);},Object.defineProperty(t.prototype,"app",{get:function get(){if(!this.ud)throw new j(q$1.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this.ud;},enumerable:!1,configurable:!0}),t.prototype.collection=function(t){return jo("Firestore.collection",arguments,1),zo("Firestore.collection","non-empty string",1,t),this._d(),new au(K$1.k(t),this,/* converter= */null);},t.prototype.doc=function(t){return jo("Firestore.doc",arguments,1),zo("Firestore.doc","non-empty string",1,t),this._d(),Ys.gd(K$1.k(t),this,/* converter= */null);},t.prototype.collectionGroup=function(t){if(jo("Firestore.collectionGroup",arguments,1),zo("Firestore.collectionGroup","non-empty string",1,t),t.indexOf("/")>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid collection ID '"+t+"' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.");return this._d(),new su(function(t){return new gn(K$1.$(),t);}(t),this,/* converter= */null);},t.prototype.runTransaction=function(t){var e=this;return jo("Firestore.runTransaction",arguments,1),zo("Firestore.runTransaction","function",1,t),this._d().transaction(function(n){return t(new Ws(e,n));});},t.prototype.batch=function(){return this._d(),new Hs(this);},Object.defineProperty(t,"logLevel",{get:function get(){switch(I$1()){case LogLevel.DEBUG:return "debug";case LogLevel.ERROR:return "error";case LogLevel.SILENT:return "silent";case LogLevel.WARN:return "warn";case LogLevel.INFO:return "info";case LogLevel.VERBOSE:return "verbose";default:// The default log level is error
  return "error";}},enumerable:!1,configurable:!0}),t.setLogLevel=function(t){var e;jo("Firestore.setLogLevel",arguments,1),Ho("setLogLevel",["debug","error","silent","warn","info","verbose"],1,t),e=t,b.setLogLevel(e);},// Note: this is not a property because the minifier can't work correctly with
  // the way TypeScript compiler outputs properties.
  t.prototype.yd=function(){return this.Ed.timestampsInSnapshots;},t;}(),Ws=/** @class */function(){function t(t,e){this.pd=t,this.bd=e;}return t.prototype.get=function(t){var e=this;jo("Transaction.get",arguments,1);var n=lu("Transaction.get",t,this.pd);return this.bd.Nf([n.Ef]).then(function(t){if(!t||1!==t.length)return _();var r=t[0];if(r instanceof vn)return new Js(e.pd,n.Ef,null,/* fromCache= */!1,/* hasPendingWrites= */!1,n.If);if(r instanceof dn)return new Js(e.pd,n.Ef,r,/* fromCache= */!1,/* hasPendingWrites= */!1,n.If);throw _();});},t.prototype.set=function(t,e,n){Bo("Transaction.set",arguments,2,3);var r=lu("Transaction.set",t,this.pd);n=cu("Transaction.set",n);var i=du(r.If,e,n),o=ks(this.pd.Id,"Transaction.set",r.Ef,i,null!==r.If,n);return this.bd.set(r.Ef,o),this;},t.prototype.update=function(t,e,n){for(var r,i,o=[],s=3;s<arguments.length;s++){o[s-3]=arguments[s];}return "string"==typeof e||e instanceof cs?(Go("Transaction.update",arguments,3),r=lu("Transaction.update",t,this.pd),i=Ss(this.pd.Id,"Transaction.update",r.Ef,e,n,o)):(jo("Transaction.update",arguments,2),r=lu("Transaction.update",t,this.pd),i=xs(this.pd.Id,"Transaction.update",r.Ef,e)),this.bd.update(r.Ef,i),this;},t.prototype.delete=function(t){jo("Transaction.delete",arguments,1);var e=lu("Transaction.delete",t,this.pd);return this.bd.delete(e.Ef),this;},t;}(),Hs=/** @class */function(){function t(t){this.pd=t,this.vd=[],this.Sd=!1;}return t.prototype.set=function(t,e,n){Bo("WriteBatch.set",arguments,2,3),this.Dd();var r=lu("WriteBatch.set",t,this.pd);n=cu("WriteBatch.set",n);var i=du(r.If,e,n),o=ks(this.pd.Id,"WriteBatch.set",r.Ef,i,null!==r.If,n);return this.vd=this.vd.concat(o.mf(r.Ef,Qe.Qe())),this;},t.prototype.update=function(t,e,n){for(var r,i,o=[],s=3;s<arguments.length;s++){o[s-3]=arguments[s];}return this.Dd(),"string"==typeof e||e instanceof cs?(Go("WriteBatch.update",arguments,3),r=lu("WriteBatch.update",t,this.pd),i=Ss(this.pd.Id,"WriteBatch.update",r.Ef,e,n,o)):(jo("WriteBatch.update",arguments,2),r=lu("WriteBatch.update",t,this.pd),i=xs(this.pd.Id,"WriteBatch.update",r.Ef,e)),this.vd=this.vd.concat(i.mf(r.Ef,Qe.exists(!0))),this;},t.prototype.delete=function(t){jo("WriteBatch.delete",arguments,1),this.Dd();var e=lu("WriteBatch.delete",t,this.pd);return this.vd=this.vd.concat(new an(e.Ef,Qe.Qe())),this;},t.prototype.commit=function(){return this.Dd(),this.Sd=!0,this.vd.length>0?this.pd._d().write(this.vd):Promise.resolve();},t.prototype.Dd=function(){if(this.Sd)throw new j(q$1.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.");},t;}(),Ys=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this,n.Tf,t,r)||this).Ef=t,i.firestore=n,i.If=r,i.fd=i.firestore._d(),i;}return __extends(n,e),n.gd=function(t,e,r){if(t.length%2!=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid document reference. Document references must have an even number of segments, but "+t.F()+" has "+t.length);return new n(new W$1(t),e,r);},Object.defineProperty(n.prototype,"id",{get:function get(){return this.Ef.path.S();},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"parent",{get:function get(){return new au(this.Ef.path.p(),this.firestore,this.If);},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"path",{get:function get(){return this.Ef.path.F();},enumerable:!1,configurable:!0}),n.prototype.collection=function(t){if(jo("DocumentReference.collection",arguments,1),zo("DocumentReference.collection","non-empty string",1,t),!t)throw new j(q$1.INVALID_ARGUMENT,"Must provide a non-empty collection name to collection()");var e=K$1.k(t);return new au(this.Ef.path.child(e),this.firestore,/* converter= */null);},n.prototype.isEqual=function(t){if(!(t instanceof n))throw es("isEqual","DocumentReference",1,t);return this.firestore===t.firestore&&this.Ef.isEqual(t.Ef)&&this.If===t.If;},n.prototype.set=function(t,e){Bo("DocumentReference.set",arguments,1,2),e=cu("DocumentReference.set",e);var n=du(this.If,t,e),r=ks(this.firestore.Id,"DocumentReference.set",this.Ef,n,null!==this.If,e);return this.fd.write(r.mf(this.Ef,Qe.Qe()));},n.prototype.update=function(t,e){for(var n,r=[],i=2;i<arguments.length;i++){r[i-2]=arguments[i];}return "string"==typeof t||t instanceof cs?(Go("DocumentReference.update",arguments,2),n=Ss(this.firestore.Id,"DocumentReference.update",this.Ef,t,e,r)):(jo("DocumentReference.update",arguments,1),n=xs(this.firestore.Id,"DocumentReference.update",this.Ef,t)),this.fd.write(n.mf(this.Ef,Qe.exists(!0)));},n.prototype.delete=function(){return jo("DocumentReference.delete",arguments,0),this.fd.write([new an(this.Ef,Qe.Qe())]);},n.prototype.onSnapshot=function(){for(var t,e,n,r=this,i=[],o=0;o<arguments.length;o++){i[o]=arguments[o];}Bo("DocumentReference.onSnapshot",arguments,1,4);var s={includeMetadataChanges:!1},u=0;"object"!=_typeof(i[u])||Mo(i[u])||(ts("DocumentReference.onSnapshot",s=i[u],["includeMetadataChanges"]),Qo("DocumentReference.onSnapshot","boolean","includeMetadataChanges",s.includeMetadataChanges),u++);var a={includeMetadataChanges:s.includeMetadataChanges};if(Mo(i[u])){var c=i[u];i[u]=null===(t=c.next)||void 0===t?void 0:t.bind(c),i[u+1]=null===(e=c.error)||void 0===e?void 0:e.bind(c),i[u+2]=null===(n=c.complete)||void 0===n?void 0:n.bind(c);}else zo("DocumentReference.onSnapshot","function",u,i[u]),Ko("DocumentReference.onSnapshot","function",u+1,i[u+1]),Ko("DocumentReference.onSnapshot","function",u+2,i[u+2]);var h={next:function next(t){i[u]&&i[u](r.Cd(t));},error:i[u+1],complete:i[u+2]};return this.fd.listen(bn(this.Ef.path),a,h);},n.prototype.get=function(t){var e=this;Bo("DocumentReference.get",arguments,0,1),fu("DocumentReference.get",t);var n=this.firestore._d();return t&&"cache"===t.source?n.Kf(this.Ef).then(function(t){return new Js(e.firestore,e.Ef,t,/*fromCache=*/!0,t instanceof dn&&t.Ke,e.If);}):n.Gf(this.Ef,t).then(function(t){return e.Cd(t);});},n.prototype.withConverter=function(t){return new n(this.Ef,this.firestore,t);},/**
       * Converts a ViewSnapshot that contains the current document to a
       * DocumentSnapshot.
       */n.prototype.Cd=function(t){var e=t.docs.get(this.Ef);return new Js(this.firestore,this.Ef,e,t.fromCache,t.hasPendingWrites,this.If);},n;}(Es),$s=/** @class */function(){function t(t,e){this.hasPendingWrites=t,this.fromCache=e;}return t.prototype.isEqual=function(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache;},t;}(),Js=/** @class */function(){function t(t,e,n,r,i,o){this.pd=t,this.Ef=e,this.Nd=n,this.Fd=r,this.kd=i,this.If=o;}return t.prototype.data=function(t){var e=this;if(Bo("DocumentSnapshot.data",arguments,0,1),t=hu("DocumentSnapshot.data",t),this.Nd){// We only want to use the converter and create a new DocumentSnapshot
  // if a converter has been provided.
  if(this.If){var n=new Zs(this.pd,this.Ef,this.Nd,this.Fd,this.kd,/* converter= */null);return this.If.fromFirestore(n,t);}return new zs(this.pd.Tf,this.pd.yd(),t.serverTimestamps||"none",function(t){return new Ys(t,e.pd,/* converter= */null);}).Zf(this.Nd.Ze());}},t.prototype.get=function(t,e){var n=this;if(Bo("DocumentSnapshot.get",arguments,1,2),e=hu("DocumentSnapshot.get",e),this.Nd){var r=this.Nd.data().field(Us("DocumentSnapshot.get",t,this.Ef));if(null!==r)return new zs(this.pd.Tf,this.pd.yd(),e.serverTimestamps||"none",function(t){return new Ys(t,n.pd,n.If);}).Zf(r);}},Object.defineProperty(t.prototype,"id",{get:function get(){return this.Ef.path.S();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"ref",{get:function get(){return new Ys(this.Ef,this.pd,this.If);},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"exists",{get:function get(){return null!==this.Nd;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"metadata",{get:function get(){return new $s(this.kd,this.Fd);},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(e){if(!(e instanceof t))throw es("isEqual","DocumentSnapshot",1,e);return this.pd===e.pd&&this.Fd===e.Fd&&this.Ef.isEqual(e.Ef)&&(null===this.Nd?null===e.Nd:this.Nd.isEqual(e.Nd))&&this.If===e.If;},t;}(),Zs=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends(n,e),n.prototype.data=function(t){return e.prototype.data.call(this,t);},n;}(Js);/**
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
   */ // settings() defaults:
  function tu(t,e,n,r,i,o,s){var u;if(i.O()){if("array-contains"/* ARRAY_CONTAINS */===o||"array-contains-any"/* ARRAY_CONTAINS_ANY */===o)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. You can't perform '"+o+"' queries on FieldPath.documentId().");if("in"/* IN */===o||"not-in"/* NOT_IN */===o){ru(s,o);for(var a=[],c=0,h=s;c<h.length;c++){var f=h[c];a.push(nu(r,t,f));}u={arrayValue:{values:a}};}else u=nu(r,t,s);}else "in"/* IN */!==o&&"not-in"/* NOT_IN */!==o&&"array-contains-any"/* ARRAY_CONTAINS_ANY */!==o||ru(s,o),u=Ps(n,e,s,/* allowArrays= */"in"/* IN */===o||"not-in"/* NOT_IN */===o);var l=Ln.create(i,o,u);return function(t,e){if(e.ln()){var n=t.cn();if(null!==n&&!n.isEqual(e.field))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '"+n.toString()+"' and '"+e.field.toString()+"'");var r=t.un();null!==r&&iu(t,e.field,r);}var i=t._n(/**
   * Given an operator, returns the set of operators that cannot be used with it.
   *
   * Operators in a query must adhere to the following set of rules:
   * 1. Only one array operator is allowed.
   * 2. Only one disjunctive operator is allowed.
   * 3. NOT_EQUAL cannot be used with another NOT_EQUAL operator.
   * 4. NOT_IN cannot be used with array, disjunctive, or NOT_EQUAL operators.
   *
   * Array operators: ARRAY_CONTAINS, ARRAY_CONTAINS_ANY
   * Disjunctive operators: IN, ARRAY_CONTAINS_ANY, NOT_IN
   */function(t){switch(t){case"!="/* NOT_EQUAL */:return ["!="/* NOT_EQUAL */,"not-in"/* NOT_IN */];case"array-contains"/* ARRAY_CONTAINS */:return ["array-contains"/* ARRAY_CONTAINS */,"array-contains-any"/* ARRAY_CONTAINS_ANY */,"not-in"/* NOT_IN */];case"in"/* IN */:return ["array-contains-any"/* ARRAY_CONTAINS_ANY */,"in"/* IN */,"not-in"/* NOT_IN */];case"array-contains-any"/* ARRAY_CONTAINS_ANY */:return ["array-contains"/* ARRAY_CONTAINS */,"array-contains-any"/* ARRAY_CONTAINS_ANY */,"in"/* IN */,"not-in"/* NOT_IN */];case"not-in"/* NOT_IN */:return ["array-contains"/* ARRAY_CONTAINS */,"array-contains-any"/* ARRAY_CONTAINS_ANY */,"in"/* IN */,"not-in"/* NOT_IN */,"!="/* NOT_EQUAL */];default:return [];}}(e.op));if(null!==i)// Special case when it's a duplicate op to give a slightly clearer error message.
  throw i===e.op?new j(q$1.INVALID_ARGUMENT,"Invalid query. You cannot use more than one '"+e.op.toString()+"' filter."):new j(q$1.INVALID_ARGUMENT,"Invalid query. You cannot use '"+e.op.toString()+"' filters with '"+i.toString()+"' filters.");}(t,l),l;}function eu(t,e,n){if(null!==t.startAt)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(null!==t.endAt)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");var r=new Kn(e,n);return function(t,e){if(null===t.un()){// This is the first order by. It must match any inequality.
  var n=t.cn();null!==n&&iu(t,n,e.field);}}(t,r),r/**
   * Create a Bound from a query and a document.
   *
   * Note that the Bound will always include the key of the document
   * and so only the provided document will compare equal to the returned
   * position.
   *
   * Will throw if the document does not contain all fields of the order by
   * of the query or if any of the fields in the order by are an uncommitted
   * server timestamp.
   */ /**
   * Parses the given documentIdValue into a ReferenceValue, throwing
   * appropriate errors if the value is anything other than a DocumentReference
   * or String, or if the string is malformed.
   */;}function nu(t,e,n){if("string"==typeof n){if(""===n)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");if(!In(e)&&-1!==n.indexOf("/"))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '"+n+"' contains a '/' character.");var r=e.path.child(K$1.k(n));if(!W$1.W(r))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '"+r+"' is not because it has an odd number of segments ("+r.length+").");return Ht(t,new W$1(r));}if(n instanceof Es)return Ht(t,n.Ef);throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: "+Jo(n)+".");}/**
   * Validates that the value passed into a disjunctive filter satisfies all
   * array requirements.
   */function ru(t,e){if(!Array.isArray(t)||0===t.length)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. A non-empty array is required for '"+e.toString()+"' filters.");if(t.length>10)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters support a maximum of 10 elements in the value array.");if("in"/* IN */===e||"array-contains-any"/* ARRAY_CONTAINS_ANY */===e){if(t.indexOf(null)>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters cannot contain 'null' in the value array.");if(t.filter(function(t){return Number.isNaN(t);}).length>0)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters cannot contain 'NaN' in the value array.");}}function iu(t,e,n){if(!n.isEqual(e))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '"+e.toString()+"' and so you must also use '"+e.toString()+"' as your first orderBy(), but your first orderBy() is on field '"+n.toString()+"' instead.");}function ou(t){if(t.an()&&0===t.tn.length)throw new j(q$1.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause");}var su=/** @class */function(){function t(t,e,n){this.xd=t,this.firestore=e,this.If=n;}return t.prototype.where=function(e,n,r){// TODO(ne-queries): Add 'not-in' and '!=' to validation.
  var i;jo("Query.where",arguments,3),Zo("Query.where",3,r),i="not-in"===n||"!="===n?n:Ho("Query.where",["<"/* LESS_THAN */,"<="/* LESS_THAN_OR_EQUAL */,"=="/* EQUAL */,">="/* GREATER_THAN_OR_EQUAL */,">"/* GREATER_THAN */,"array-contains"/* ARRAY_CONTAINS */,"in"/* IN */,"array-contains-any"/* ARRAY_CONTAINS_ANY */],2,n);var o=Us("Query.where",e),s=tu(this.xd,"Query.where",this.firestore.Id,this.firestore.Tf,o,i,r);return new t(function(t,e){var n=t.filters.concat([e]);return new gn(t.path,t.collectionGroup,t.tn.slice(),n,t.limit,t.en,t.startAt,t.endAt);}(this.xd,s),this.firestore,this.If);},t.prototype.orderBy=function(e,n){var r;if(Bo("Query.orderBy",arguments,1,2),Ko("Query.orderBy","non-empty string",2,n),void 0===n||"asc"===n)r="asc"/* ASCENDING */;else {if("desc"!==n)throw new j(q$1.INVALID_ARGUMENT,"Function Query.orderBy() has unknown direction '"+n+"', expected 'asc' or 'desc'.");r="desc"/* DESCENDING */;}var i=Us("Query.orderBy",e),o=eu(this.xd,i,r);return new t(function(t,e){// TODO(dimond): validate that orderBy does not list the same key twice.
  var n=t.tn.concat([e]);return new gn(t.path,t.collectionGroup,n,t.filters.slice(),t.limit,t.en,t.startAt,t.endAt);}(this.xd,o),this.firestore,this.If);},t.prototype.limit=function(e){return jo("Query.limit",arguments,1),zo("Query.limit","number",1,e),ns("Query.limit",1,e),new t(Nn(this.xd,e,"F"/* First */),this.firestore,this.If);},t.prototype.limitToLast=function(e){return jo("Query.limitToLast",arguments,1),zo("Query.limitToLast","number",1,e),ns("Query.limitToLast",1,e),new t(Nn(this.xd,e,"L"/* Last */),this.firestore,this.If);},t.prototype.startAt=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}Go("Query.startAt",arguments,1);var i=this.$d("Query.startAt",e,n,/*before=*/!0);return new t(An(this.xd,i),this.firestore,this.If);},t.prototype.startAfter=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}Go("Query.startAfter",arguments,1);var i=this.$d("Query.startAfter",e,n,/*before=*/!1);return new t(An(this.xd,i),this.firestore,this.If);},t.prototype.endBefore=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}Go("Query.endBefore",arguments,1);var i=this.$d("Query.endBefore",e,n,/*before=*/!0);return new t(_n(this.xd,i),this.firestore,this.If);},t.prototype.endAt=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}Go("Query.endAt",arguments,1);var i=this.$d("Query.endAt",e,n,/*before=*/!1);return new t(_n(this.xd,i),this.firestore,this.If);},t.prototype.isEqual=function(e){if(!(e instanceof t))throw es("isEqual","Query",1,e);return this.firestore===e.firestore&&Dn(this.xd,e.xd)&&this.If===e.If;},t.prototype.withConverter=function(e){return new t(this.xd,this.firestore,e);},/** Helper function to create a bound from a document or fields */t.prototype.$d=function(t,e,n,i){if(Zo(t,1,e),e instanceof Js)return jo(t,__spreadArrays([e],n),1),function(t,e,n,r,i){if(!r)throw new j(q$1.NOT_FOUND,"Can't use a DocumentSnapshot that doesn't exist for "+n+"().");// Because people expect to continue/end a query at the exact document
  // provided, we need to use the implicit sort order rather than the explicit
  // sort order, because it's guaranteed to contain the document key. That way
  // the position becomes unambiguous and the query continues/ends exactly at
  // the provided document. Without the key (by using the explicit sort
  // orders), multiple documents could match the position, yielding duplicate
  // results.
  for(var o=[],s=0,u=En(t);s<u.length;s++){var a=u[s];if(a.field.O())o.push(Ht(e,r.key));else {var c=r.field(a.field);if(Ct(c))throw new j(q$1.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+a.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(null===c){var h=a.field.F();throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You are trying to start or end a query using a document for which the field '"+h+"' (used as the orderBy) does not exist.");}o.push(c);}}return new jn(o,i);}(this.xd,this.firestore.Tf,t,e.Nd,i);var o=[e].concat(n);return function(t,e,n,r,i,o){// Use explicit order by's because it has to match the query the user made
  var s=t.tn;if(i.length>s.length)throw new j(q$1.INVALID_ARGUMENT,"Too many arguments provided to "+r+"(). The number of arguments must be less than or equal to the number of orderBy() clauses");for(var u=[],a=0;a<i.length;a++){var c=i[a];if(s[a].field.O()){if("string"!=typeof c)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. Expected a string for document ID in "+r+"(), but got a "+_typeof(c));if(!In(t)&&-1!==c.indexOf("/"))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to "+r+"() must be a plain document ID, but '"+c+"' contains a slash.");var h=t.path.child(K$1.k(c));if(!W$1.W(h))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to "+r+"() must result in a valid document path, but '"+h+"' is not because it contains an odd number of segments.");var f=new W$1(h);u.push(Ht(e,f));}else {var l=Ps(n,r,c);u.push(l);}}return new jn(u,o);}(this.xd,this.firestore.Tf,this.firestore.Id,t,o,i);},t.prototype.onSnapshot=function(){for(var t,e,n,r=this,i=[],o=0;o<arguments.length;o++){i[o]=arguments[o];}Bo("Query.onSnapshot",arguments,1,4);var s={},u=0;if("object"!=_typeof(i[u])||Mo(i[u])||(ts("Query.onSnapshot",s=i[u],["includeMetadataChanges"]),Qo("Query.onSnapshot","boolean","includeMetadataChanges",s.includeMetadataChanges),u++),Mo(i[u])){var a=i[u];i[u]=null===(t=a.next)||void 0===t?void 0:t.bind(a),i[u+1]=null===(e=a.error)||void 0===e?void 0:e.bind(a),i[u+2]=null===(n=a.complete)||void 0===n?void 0:n.bind(a);}else zo("Query.onSnapshot","function",u,i[u]),Ko("Query.onSnapshot","function",u+1,i[u+1]),Ko("Query.onSnapshot","function",u+2,i[u+2]);var c={next:function next(t){i[u]&&i[u](new uu(r.firestore,r.xd,t,r.If));},error:i[u+1],complete:i[u+2]};return ou(this.xd),this.firestore._d().listen(this.xd,s,c);},t.prototype.get=function(t){var e=this;Bo("Query.get",arguments,0,1),fu("Query.get",t),ou(this.xd);var n=this.firestore._d();return (t&&"cache"===t.source?n.zf(this.xd):n.Hf(this.xd,t)).then(function(t){return new uu(e.firestore,e.xd,t,e.If);});},t;}(),uu=/** @class */function(){function t(t,e,n,r){this.pd=t,this.Md=e,this.Od=n,this.If=r,this.Ld=null,this.qd=null,this.metadata=new $s(n.hasPendingWrites,n.fromCache);}return Object.defineProperty(t.prototype,"docs",{get:function get(){var t=[];return this.forEach(function(e){return t.push(e);}),t;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"empty",{get:function get(){return this.Od.docs._();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"size",{get:function get(){return this.Od.docs.size;},enumerable:!1,configurable:!0}),t.prototype.forEach=function(t,e){var n=this;Bo("QuerySnapshot.forEach",arguments,1,2),zo("QuerySnapshot.forEach","function",1,t),this.Od.docs.forEach(function(r){t.call(e,n.Bd(r,n.metadata.fromCache,n.Od.Lt.has(r.key)));});},Object.defineProperty(t.prototype,"query",{get:function get(){return new su(this.Md,this.pd,this.If);},enumerable:!1,configurable:!0}),t.prototype.docChanges=function(t){t&&(ts("QuerySnapshot.docChanges",t,["includeMetadataChanges"]),Qo("QuerySnapshot.docChanges","boolean","includeMetadataChanges",t.includeMetadataChanges));var e=!(!t||!t.includeMetadataChanges);if(e&&this.Od.Bt)throw new j(q$1.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this.Ld&&this.qd===e||(this.Ld=/**
       * Calculates the array of firestore.DocumentChange's for a given ViewSnapshot.
       *
       * Exported for testing.
       *
       * @param snapshot The ViewSnapshot that represents the expected state.
       * @param includeMetadataChanges Whether to include metadata changes.
       * @param converter A factory function that returns a QueryDocumentSnapshot.
       * @return An objecyt that matches the firestore.DocumentChange API.
       */function(t,e,n){if(t.Ot._()){// Special case the first snapshot because index calculation is easy and
  // fast
  var r=0;return t.docChanges.map(function(e){var i=n(e.doc,t.fromCache,t.Lt.has(e.doc.key));return e.doc,{type:"added",doc:i,oldIndex:-1,newIndex:r++};});}// A DocumentSet that is updated incrementally as changes are applied to use
  // to lookup the index of a document.
  var i=t.Ot;return t.docChanges.filter(function(t){return e||3/* Metadata */!==t.type;}).map(function(e){var r=n(e.doc,t.fromCache,t.Lt.has(e.doc.key)),o=-1,s=-1;return 0/* Added */!==e.type&&(o=i.indexOf(e.doc.key),i=i.delete(e.doc.key)),1/* Removed */!==e.type&&(s=(i=i.add(e.doc)).indexOf(e.doc.key)),{type:pu(e.type),doc:r,oldIndex:o,newIndex:s};});}(this.Od,e,this.Bd.bind(this)),this.qd=e),this.Ld;},/** Check the equality. The call can be very expensive. */t.prototype.isEqual=function(e){if(!(e instanceof t))throw es("isEqual","QuerySnapshot",1,e);return this.pd===e.pd&&Dn(this.Md,e.Md)&&this.Od.isEqual(e.Od)&&this.If===e.If;},t.prototype.Bd=function(t,e,n){return new Zs(this.pd,t.key,t,e,n,this.If);},t;}(),au=/** @class */function(e){function n(t,n,r){var i=this;if((i=e.call(this,bn(t),n,r)||this).Ud=t,t.length%2!=1)throw new j(q$1.INVALID_ARGUMENT,"Invalid collection reference. Collection references must have an odd number of segments, but "+t.F()+" has "+t.length);return i;}return __extends(n,e),Object.defineProperty(n.prototype,"id",{get:function get(){return this.xd.path.S();},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"parent",{get:function get(){var t=this.xd.path.p();return t._()?null:new Ys(new W$1(t),this.firestore,/* converter= */null);},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"path",{get:function get(){return this.xd.path.F();},enumerable:!1,configurable:!0}),n.prototype.doc=function(t){Bo("CollectionReference.doc",arguments,0,1),// We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  0===arguments.length&&(t=S$1.t()),zo("CollectionReference.doc","non-empty string",1,t);var e=K$1.k(t);return Ys.gd(this.xd.path.child(e),this.firestore,this.If);},n.prototype.add=function(t){jo("CollectionReference.add",arguments,1),zo("CollectionReference.add","object",1,this.If?this.If.toFirestore(t):t);var e=this.doc();return e.set(t).then(function(){return e;});},n.prototype.withConverter=function(t){return new n(this.Ud,this.firestore,t);},n;}(su);function cu(t,e){if(void 0===e)return {merge:!1};if(ts(t,e,["merge","mergeFields"]),Qo(t,"boolean","merge",e.merge),function(t,e,n,r,i){void 0!==r&&function(t,e,n,r,i){if(!(r instanceof Array))throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+e+" option to be an array, but it was: "+Jo(r));for(var o=0;o<r.length;++o){if(!i(r[o]))throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires all "+e+" elements to be "+n+", but the value at index "+o+" was: "+Jo(r[o]));}}(t,e,n,r,i);}(t,"mergeFields","a string or a FieldPath",e.mergeFields,function(t){return "string"==typeof t||t instanceof cs;}),void 0!==e.mergeFields&&void 0!==e.merge)throw new j(q$1.INVALID_ARGUMENT,"Invalid options passed to function "+t+'(): You cannot specify both "merge" and "mergeFields".');return e;}function hu(t,e){return void 0===e?{}:(ts(t,e,["serverTimestamps"]),Wo(t,0,"serverTimestamps",e.serverTimestamps,["estimate","previous","none"]),e);}function fu(t,e){Ko(t,"object",1,e),e&&(ts(t,e,["source"]),Wo(t,0,"source",e.source,["default","server","cache"]));}function lu(t,e,n){if(e instanceof Es){if(e.firestore!==n)throw new j(q$1.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return e;}throw es(t,"DocumentReference",1,e);}function pu(t){switch(t){case 0/* Added */:return "added";case 2/* Modified */:case 3/* Metadata */:return "modified";case 1/* Removed */:return "removed";default:return _();}}/**
   * Converts custom model object of type T into DocumentData by applying the
   * converter if it exists.
   *
   * This function is used when converting user objects to DocumentData
   * because we want to provide the user with a more specific error message if
   * their set() or fails due to invalid data originating from a toFirestore()
   * call.
   */function du(t,e,n){// Cast to `any` in order to satisfy the union type constraint on
  // toFirestore().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e;}var vu={Firestore:Qs,GeoPoint:bs,Timestamp:G$1,Blob:us,Transaction:Ws,WriteBatch:Hs,DocumentReference:Ys,DocumentSnapshot:Js,Query:su,QueryDocumentSnapshot:Zs,QuerySnapshot:uu,CollectionReference:au,FieldPath:cs,FieldValue:gs,setLogLevel:Qs.setLogLevel,CACHE_SIZE_UNLIMITED:Ks};/**
   * Configures Firestore as part of the Firebase SDK by calling registerService.
   *
   * @param firebase The FirebaseNamespace to register Firestore with
   * @param firestoreFactory A factory function that returns a new Firestore
   *    instance.
   */ /**
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
   */ /**
   * Registers the main Firestore build with the components framework.
   * Persistence can be enabled via `firebase.firestore().enablePersistence()`.
   */function yu(t){!function(t,e){t.INTERNAL.registerComponent(new Component("firestore",function(t){return function(t,e){var n=new Co(),r=new Uo(n);return new Qs(t,e,r,n);}(t.getProvider("app").getImmediate(),t.getProvider("auth-internal"));},"PUBLIC"/* PUBLIC */).setServiceProps(Object.assign({},vu)));}(t),t.registerVersion("@firebase/firestore","1.16.4");}yu(firebase$1);

  var firebaseConfig = {
      apiKey: "AIzaSyDDoNfR79y6dHVOskl1muwOxu_iQru2W1g",
      authDomain: "fireeats-97d5e.firebaseapp.com",
      databaseURL: "https://fireeats-97d5e.firebaseio.com",
      projectId: "fireeats-97d5e",
      storageBucket: "fireeats-97d5e.appspot.com",
      messagingSenderId: "752235126292",
      appId: "1:752235126292:web:3692e4c69e8e5b500c9101"
  };
  var app = firebase$1.initializeApp(firebaseConfig);
  var db$1 = firebase$1.firestore(app);
  function main() {
      return __awaiter(this, void 0, void 0, function () {
          var doc, snap;
          return __generator(this, function (_a) {
              switch (_a.label) {
                  case 0:
                      doc = db$1.doc('firestore-loadlock-demo/doc');
                      return [4 /*yield*/, doc.set({ foo: 'bar' })];
                  case 1:
                      _a.sent();
                      return [4 /*yield*/, doc.get()];
                  case 2:
                      snap = _a.sent();
                      console.log(snap.data());
                      console.log(db$1.clearPersistence);
                      console.log(db$1.loadBundle);
                      db$1.loadBundle('testing');
                      return [2 /*return*/];
              }
          });
      });
  }
  main();

}());
//# sourceMappingURL=bundle.js.map
