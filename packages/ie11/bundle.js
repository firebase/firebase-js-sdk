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

  var _assign$1 = function __assign() {
    _assign$1 = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];

        for (var p in s) {
          if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
      }

      return t;
    };

    return _assign$1.apply(this, arguments);
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
      var _a = _assign$1({
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
        for (var _b = __values$1(this.instancesDeferred.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
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
      console[method].apply(console, __spreadArrays(["[" + now + "]  " + instance.name + ":"], args));
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

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, LogLevel.DEBUG], args));

      this._logHandler.apply(this, __spreadArrays([this, LogLevel.DEBUG], args));
    };

    Logger.prototype.log = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, LogLevel.VERBOSE], args));

      this._logHandler.apply(this, __spreadArrays([this, LogLevel.VERBOSE], args));
    };

    Logger.prototype.info = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, LogLevel.INFO], args));

      this._logHandler.apply(this, __spreadArrays([this, LogLevel.INFO], args));
    };

    Logger.prototype.warn = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, LogLevel.WARN], args));

      this._logHandler.apply(this, __spreadArrays([this, LogLevel.WARN], args));
    };

    Logger.prototype.error = function () {
      var args = [];

      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }

      this._userLogHandler && this._userLogHandler.apply(this, __spreadArrays([this, LogLevel.ERROR], args));

      this._logHandler.apply(this, __spreadArrays([this, LogLevel.ERROR], args));
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
  var version$2 = "7.19.0";
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
  function __awaiter$2(thisArg, _arguments, P, generator) {
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
  function __generator$2(thisArg, body) {
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
  var _extendStatics$2 = function extendStatics(d, b) {
    _extendStatics$2 = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (b.hasOwnProperty(p)) d[p] = b[p];
      }
    };

    return _extendStatics$2(d, b);
  };

  function __extends$2(d, b) {
    _extendStatics$2(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  function __values$2(o) {
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
    __extends$2(Lb, _super);

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
        for (var _b = __values$2(this.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
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
        for (var _b = __values$2(a.a.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
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
  function I$1(){return b.logLevel;}function E$1(t){for(var e=[],n=1;n<arguments.length;n++){e[n-1]=arguments[n];}if(b.logLevel<=LogLevel.DEBUG){var i=e.map(A$1);b.debug.apply(b,__spreadArrays$1(["Firestore (7.18.0): "+t],i));}}function T$1(t){for(var e=[],n=1;n<arguments.length;n++){e[n-1]=arguments[n];}if(b.logLevel<=LogLevel.ERROR){var i=e.map(A$1);b.error.apply(b,__spreadArrays$1(["Firestore (7.18.0): "+t],i));}}function N$1(t){for(var e=[],n=1;n<arguments.length;n++){e[n-1]=arguments[n];}if(b.logLevel<=LogLevel.WARN){var i=e.map(A$1);b.warn.apply(b,__spreadArrays$1(["Firestore (7.18.0): "+t],i));}}/**
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
   */;}function S$1(t,e){t||_();}/**
   * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
   * instance of `T` before casting.
   */function D$1(t,// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
   */function k$1(t){// Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
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
   */var x$1=/** @class */function(){function t(){}return t.t=function(){for(// Alphanumeric characters
  var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e=Math.floor(256/t.length)*t.length,n=""// The largest byte value that is a multiple of `char.length`.
  ;n.length<20;){for(var r=k$1(40),i=0;i<r.length;++i){// Only accept values that are [0, maxMultiple), this ensures they can
  // be evenly mapped to indices of `chars` via a modulo operation.
  n.length<20&&r[i]<e&&(n+=t.charAt(r[i]%t.length));}}return n;},t;}();function O$1(t,e){return t<e?-1:t>e?1:0;}/** Helper to compare arrays using isEqual(). */function P$1(t,e,n){return t.length===e.length&&t.every(function(t,r){return n(t,e[r]);});}/**
   * Returns the immediate lexicographically-following string. This is useful to
   * construct an inclusive range for indexeddb iterators.
   */function L$1(t){// Return the input string, with an additional NUL byte appended.
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
       */function R(t,e,n,r,i){this.s=t,this.persistenceKey=e,this.host=n,this.ssl=r,this.forceLongPolling=i;},M$1=/** @class */function(){function t(t,e){this.projectId=t,this.database=e||"(default)";}return Object.defineProperty(t.prototype,"i",{get:function get(){return "(default)"===this.database;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(e){return e instanceof t&&e.projectId===this.projectId&&e.database===this.database;},t.prototype.o=function(t){return O$1(this.projectId,t.projectId)||O$1(this.database,t.database);},t;}();/** The default database name for a project. */ /** Represents the database ID a Firestore client is associated with. */ /**
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
   */function V$1(t){var e=0;for(var n in t){Object.prototype.hasOwnProperty.call(t,n)&&e++;}return e;}function U$1(t,e){for(var n in t){Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n]);}}function C$1(t){for(var e in t){if(Object.prototype.hasOwnProperty.call(t,e))return !1;}return !0;}/**
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
       */t.prototype.delete=function(t){var e=this.h(t),n=this.l[e];if(void 0===n)return !1;for(var r=0;r<n.length;r++){if(this.u(n[r][0],t))return 1===n.length?delete this.l[e]:n.splice(r,1),!0;}return !1;},t.prototype.forEach=function(t){U$1(this.l,function(e,n){for(var r=0,i=n;r<i.length;r++){var o=i[r],s=o[0],u=o[1];t(s,u);}});},t.prototype._=function(){return C$1(this.l);},t;}(),q$1={// Causes are copied from:
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
  r.toString=function(){return r.name+": [code="+r.code+"]: "+r.message;},r;}return __extends$1(n,e),n;}(Error),B=/** @class */function(){function t(t,e){if(this.seconds=t,this.nanoseconds=e,e<0)throw new j(q$1.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(e>=1e9)throw new j(q$1.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<-62135596800)throw new j(q$1.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);// This will break in the year 10,000.
  if(t>=253402300800)throw new j(q$1.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);}return t.now=function(){return t.fromMillis(Date.now());},t.fromDate=function(e){return t.fromMillis(e.getTime());},t.fromMillis=function(e){var n=Math.floor(e/1e3);return new t(n,1e6*(e-1e3*n));},t.prototype.toDate=function(){return new Date(this.toMillis());},t.prototype.toMillis=function(){return 1e3*this.seconds+this.nanoseconds/1e6;},t.prototype.T=function(t){return this.seconds===t.seconds?O$1(this.nanoseconds,t.nanoseconds):O$1(this.seconds,t.seconds);},t.prototype.isEqual=function(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds;},t.prototype.toString=function(){return "Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")";},t.prototype.toJSON=function(){return {seconds:this.seconds,nanoseconds:this.nanoseconds};},t.prototype.valueOf=function(){// This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
  // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
  // with zeroes to be a consistent length. Strings with this format then have a lexiographical
  // ordering that matches the expected ordering. The <seconds> translation is done to avoid
  // having a leading negative sign (i.e. a leading '-' character) in its string representation,
  // which would affect its lexiographical ordering.
  var t=this.seconds- -62135596800;// Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
  return String(t).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0");},t;}(),z=/** @class */function(){function t(t){this.timestamp=t;}return t.m=function(e){return new t(e);},t.min=function(){return new t(new B(0,0));},t.prototype.o=function(t){return this.timestamp.T(t.timestamp);},t.prototype.isEqual=function(t){return this.timestamp.isEqual(t.timestamp);},/** Returns a number representation of the version for use in spec tests. */t.prototype.I=function(){// Convert to microseconds.
  return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3;},t.prototype.toString=function(){return "SnapshotVersion("+this.timestamp.toString()+")";},t.prototype.A=function(){return this.timestamp;},t;}(),G$1=/** @class */function(){function t(t,e,n){void 0===e?e=0:e>t.length&&_(),void 0===n?n=t.length-e:n>t.length-e&&_(),this.segments=t,this.offset=e,this.R=n;}return Object.defineProperty(t.prototype,"length",{get:function get(){return this.R;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(e){return 0===t.P(this,e);},t.prototype.child=function(e){var n=this.segments.slice(this.offset,this.limit());return e instanceof t?e.forEach(function(t){n.push(t);}):n.push(e),this.g(n);},/** The index of one past the last segment of the path. */t.prototype.limit=function(){return this.offset+this.length;},t.prototype.V=function(t){return t=void 0===t?1:t,this.g(this.segments,this.offset+t,this.length-t);},t.prototype.p=function(){return this.g(this.segments,this.offset,this.length-1);},t.prototype.v=function(){return this.segments[this.offset];},t.prototype.S=function(){return this.get(this.length-1);},t.prototype.get=function(t){return this.segments[this.offset+t];},t.prototype._=function(){return 0===this.length;},t.prototype.D=function(t){if(t.length<this.length)return !1;for(var e=0;e<this.length;e++){if(this.get(e)!==t.get(e))return !1;}return !0;},t.prototype.C=function(t){if(this.length+1!==t.length)return !1;for(var e=0;e<this.length;e++){if(this.get(e)!==t.get(e))return !1;}return !0;},t.prototype.forEach=function(t){for(var e=this.offset,n=this.limit();e<n;e++){t(this.segments[e]);}},t.prototype.N=function(){return this.segments.slice(this.offset,this.limit());},t.P=function(t,e){for(var n=Math.min(t.length,e.length),r=0;r<n;r++){var i=t.get(r),o=e.get(r);if(i<o)return -1;if(i>o)return 1;}return t.length<e.length?-1:t.length>e.length?1:0;},t;}(),Q$1=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends$1(n,e),n.prototype.g=function(t,e,r){return new n(t,e,r);},n.prototype.F=function(){// NOTE: The client is ignorant of any path segments containing escape
  // sequences (e.g. __id123__) and just passes them through raw (they exist
  // for legacy reasons and should not be used frequently).
  return this.N().join("/");},n.prototype.toString=function(){return this.F();},/**
       * Creates a resource path from the given slash-delimited string.
       */n.k=function(t){// NOTE: The client is ignorant of any path segments containing escape
  // sequences (e.g. __id123__) and just passes them through raw (they exist
  // for legacy reasons and should not be used frequently).
  if(t.indexOf("//")>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid path ("+t+"). Paths must not contain // in them.");// We may still have an empty segment at the beginning or end if they had a
  // leading or trailing slash (which we allow).
  return new n(t.split("/").filter(function(t){return t.length>0;}));},n.M=function(){return new n([]);},n;}(G$1),H$1=/^[_a-zA-Z][_a-zA-Z0-9]*$/,K$1=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends$1(n,e),n.prototype.g=function(t,e,r){return new n(t,e,r);},/**
       * Returns true if the string could be used as a segment in a field path
       * without escaping.
       */n.O=function(t){return H$1.test(t);},n.prototype.F=function(){return this.N().map(function(t){return t=t.replace("\\","\\\\").replace("`","\\`"),n.O(t)||(t="`"+t+"`"),t;}).join(".");},n.prototype.toString=function(){return this.F();},/**
       * Returns true if this field references the key of a document.
       */n.prototype.$=function(){return 1===this.length&&"__name__"===this.get(0);},/**
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
       */n.B=function(t){for(var e=[],r="",i=0,o=function o(){if(0===r.length)throw new j(q$1.INVALID_ARGUMENT,"Invalid field path ("+t+"). Paths must not be empty, begin with '.', end with '.', or contain '..'");e.push(r),r="";},s=!1;i<t.length;){var u=t[i];if("\\"===u){if(i+1===t.length)throw new j(q$1.INVALID_ARGUMENT,"Path has trailing escape character: "+t);var a=t[i+1];if("\\"!==a&&"."!==a&&"`"!==a)throw new j(q$1.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);r+=a,i+=2;}else "`"===u?(s=!s,i++):"."!==u||s?(r+=u,i++):(o(),i++);}if(o(),s)throw new j(q$1.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new n(e);},n.M=function(){return new n([]);},n;}(G$1),W$1=/** @class */function(){function t(t){this.path=t;}return t.q=function(e){return new t(Q$1.k(e).V(5));},/** Returns true if the document is in the specified collectionId. */t.prototype.U=function(t){return this.path.length>=2&&this.path.get(this.path.length-2)===t;},t.prototype.isEqual=function(t){return null!==t&&0===Q$1.P(this.path,t.path);},t.prototype.toString=function(){return this.path.toString();},t.P=function(t,e){return Q$1.P(t.path,e.path);},t.W=function(t){return t.length%2==0;},/**
       * Creates and returns a new document key with the given segments.
       *
       * @param segments The segments of the path to the document
       * @return A new instance of DocumentKey
       */t.j=function(e){return new t(new Q$1(e.slice()));},t;}();/**
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
   */function $(t){return null==t;}/** Returns whether the value represents -0. */function Y$1(t){// Detect if the value is -0.0. Based on polyfill from
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
  return -0===t&&1/t==-1/0;}/**
   * Returns whether a value is an integer and in the safe integer range
   * @param value The value to test for being an integer and in the safe range
   */function X$1(t){return "number"==typeof t&&Number.isInteger(t)&&!Y$1(t)&&t<=Number.MAX_SAFE_INTEGER&&t>=Number.MIN_SAFE_INTEGER;}/**
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
   */function Z$1(t,e,n,r,i,o,s){return void 0===e&&(e=null),void 0===n&&(n=[]),void 0===r&&(r=[]),void 0===i&&(i=null),void 0===o&&(o=null),void 0===s&&(s=null),new J$1(t,e,n,r,i,o,s);}function tt(t){var e=D$1(t);if(null===e.K){var n=e.path.F();null!==e.collectionGroup&&(n+="|cg:"+e.collectionGroup),n+="|f:",n+=e.filters.map(function(t){return function(t){// TODO(b/29183165): Technically, this won't be unique if two values have
  // the same description, such as the int 3 and the string "3". So we should
  // add the types in here somehow, too.
  return t.field.F()+t.op.toString()+Ht(t.value);}(t);}).join(","),n+="|ob:",n+=e.orderBy.map(function(t){return (e=t).field.F()+e.dir;var e;}).join(","),$(e.limit)||(n+="|l:",n+=e.limit),e.startAt&&(n+="|lb:",n+=Qn(e.startAt)),e.endAt&&(n+="|ub:",n+=Qn(e.endAt)),e.K=n;}return e.K;}function et(t,e){if(t.limit!==e.limit)return !1;if(t.orderBy.length!==e.orderBy.length)return !1;for(var n=0;n<t.orderBy.length;n++){if(!Yn(t.orderBy[n],e.orderBy[n]))return !1;}if(t.filters.length!==e.filters.length)return !1;for(var r=0;r<t.filters.length;r++){if(i=t.filters[r],o=e.filters[r],i.op!==o.op||!i.field.isEqual(o.field)||!Bt(i.value,o.value))return !1;}var i,o;return t.collectionGroup===e.collectionGroup&&!!t.path.isEqual(e.path)&&!!Kn(t.startAt,e.startAt)&&Kn(t.endAt,e.endAt);}function nt(t){return W$1.W(t.path)&&null===t.collectionGroup&&0===t.filters.length;}/**
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
   */function(t){for(var e="",n=0;n<t.length;++n){e+=String.fromCharCode(t[n]);}return e;}(e));},t.prototype.toBase64=function(){return t=this.G,btoa(t);/** Converts a binary string to a Base64 encoded string. */var t;/** True if and only if the Base64 conversion functions are available. */},t.prototype.toUint8Array=function(){return function(t){for(var e=new Uint8Array(t.length),n=0;n<t.length;n++){e[n]=t.charCodeAt(n);}return e;}(this.G);},t.prototype.H=function(){return 2*this.G.length;},t.prototype.o=function(t){return O$1(this.G,t.G);},t.prototype.isEqual=function(t){return this.G===t.G;},t;}();rt.J=new rt("");var it,ot,st=/** @class */function(){function t(/** The target being listened to. */t,/**
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
       */,s){void 0===i&&(i=z.min()),void 0===o&&(o=z.min()),void 0===s&&(s=rt.J),this.target=t,this.targetId=e,this.Y=n,this.sequenceNumber=r,this.X=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=s;}/** Creates a new target data instance with an updated sequence number. */return t.prototype.Z=function(e){return new t(this.target,this.targetId,this.Y,e,this.X,this.lastLimboFreeSnapshotVersion,this.resumeToken);},/**
       * Creates a new target data instance with an updated resume token and
       * snapshot version.
       */t.prototype.tt=function(e,n){return new t(this.target,this.targetId,this.Y,this.sequenceNumber,n,this.lastLimboFreeSnapshotVersion,e);},/**
       * Creates a new target data instance with an updated last limbo free
       * snapshot version number.
       */t.prototype.et=function(e){return new t(this.target,this.targetId,this.Y,this.sequenceNumber,this.X,e,this.resumeToken);},t;}(),ut=// TODO(b/33078163): just use simplest form of existence filter for now
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
  t.prototype.remove=function(e,n){var r,i=this;if(n(e,i.key)<0)i.left._()||i.left.At()||i.left.left.At()||(i=i.Rt()),i=i.copy(null,null,null,i.left.remove(e,n),null);else {if(i.left.At()&&(i=i.Pt()),i.right._()||i.right.At()||i.right.left.At()||(i=i.gt()),0===n(e,i.key)){if(i.right._())return t.EMPTY;r=i.right.min(),i=i.copy(r.key,r.value,null,null,i.right.It());}i=i.copy(null,null,null,null,i.right.remove(e,n));}return i.Et();},t.prototype.At=function(){return this.color;},// Returns new tree after performing any needed rotations.
  t.prototype.Et=function(){var t=this;return t.right.At()&&!t.left.At()&&(t=t.Vt()),t.left.At()&&t.left.left.At()&&(t=t.Pt()),t.left.At()&&t.right.At()&&(t=t.yt()),t;},t.prototype.Rt=function(){var t=this.yt();return t.right.left.At()&&(t=(t=(t=t.copy(null,null,null,null,t.right.Pt())).Vt()).yt()),t;},t.prototype.gt=function(){var t=this.yt();return t.left.left.At()&&(t=(t=t.Pt()).yt()),t;},t.prototype.Vt=function(){var e=this.copy(null,null,t.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null);},t.prototype.Pt=function(){var e=this.copy(null,null,t.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e);},t.prototype.yt=function(){var t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e);},// For testing.
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
  return e.size<t.size&&(e=t,t=this),t.forEach(function(t){e=e.add(t);}),e;},t.prototype.isEqual=function(e){if(!(e instanceof t))return !1;if(this.size!==e.size)return !1;for(var n=this.data.at(),r=e.data.at();n.wt();){var i=n.dt().key,o=r.dt().key;if(0!==this.P(i,o))return !1;}return !0;},t.prototype.N=function(){var t=[];return this.forEach(function(e){t.push(e);}),t;},t.prototype.toString=function(){var t=[];return this.forEach(function(e){return t.push(e);}),"SortedSet("+t.toString()+")";},t.prototype.copy=function(e){var n=new t(this.P);return n.data=e,n;},t;}(),dt=/** @class */function(){function t(t){this.Nt=t;}return t.prototype.dt=function(){return this.Nt.dt().key;},t.prototype.wt=function(){return this.Nt.wt();},t;}(),yt=new ht(W$1.P);function vt(){return yt;}function mt(){return vt();}var gt=new ht(W$1.P);function wt(){return gt;}var bt=new ht(W$1.P);function It(){return bt;}var Et=new pt(W$1.P);function Tt(){for(var t=[],e=0;e<arguments.length;e++){t[e]=arguments[e];}for(var n=Et,r=0,i=t;r<i.length;r++){var o=i[r];n=n.add(o);}return n;}var Nt=new pt(O$1);function At(){return Nt;}/**
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
   */var _t=/** @class */function(){/** The default ordering is by key if the comparator is omitted */function t(t){// We are adding document key comparator to the end as it's the only
  // guaranteed unique property of a document.
  this.P=t?function(e,n){return t(e,n)||W$1.P(e.key,n.key);}:function(t,e){return W$1.P(t.key,e.key);},this.Ft=wt(),this.kt=new ht(this.P)/**
       * Returns an empty copy of the existing DocumentSet, using the same
       * comparator.
       */;}return t.xt=function(e){return new t(e.P);},t.prototype.has=function(t){return null!=this.Ft.get(t);},t.prototype.get=function(t){return this.Ft.get(t);},t.prototype.first=function(){return this.kt.it();},t.prototype.last=function(){return this.kt.rt();},t.prototype._=function(){return this.kt._();},/**
       * Returns the index of the provided key in the document set, or -1 if the
       * document key is not present in the set;
       */t.prototype.indexOf=function(t){var e=this.Ft.get(t);return e?this.kt.indexOf(e):-1;},Object.defineProperty(t.prototype,"size",{get:function get(){return this.kt.size;},enumerable:!1,configurable:!0}),/** Iterates documents in order defined by "comparator" */t.prototype.forEach=function(t){this.kt.ot(function(e,n){return t(e),!1;});},/** Inserts or updates a document with the same key */t.prototype.add=function(t){// First remove the element if we have it.
  var e=this.delete(t.key);return e.copy(e.Ft.nt(t.key,t),e.kt.nt(t,null));},/** Deletes a document with a given key */t.prototype.delete=function(t){var e=this.get(t);return e?this.copy(this.Ft.remove(t),this.kt.remove(e)):this;},t.prototype.isEqual=function(e){if(!(e instanceof t))return !1;if(this.size!==e.size)return !1;for(var n=this.kt.at(),r=e.kt.at();n.wt();){var i=n.dt().key,o=r.dt().key;if(!i.isEqual(o))return !1;}return !0;},t.prototype.toString=function(){var t=[];return this.forEach(function(e){t.push(e.toString());}),0===t.length?"DocumentSet ()":"DocumentSet (\n  "+t.join("  \n")+"\n)";},t.prototype.copy=function(e,n){var r=new t();return r.P=this.P,r.Ft=e,r.kt=n,r;},t;}(),St=/** @class */function(){function t(){this.Mt=new ht(W$1.P);}return t.prototype.track=function(t){var e=t.doc.key,n=this.Mt.get(e);n?// Merge the new change with the existing change.
  0/* Added */!==t.type&&3/* Metadata */===n.type?this.Mt=this.Mt.nt(e,t):3/* Metadata */===t.type&&1/* Removed */!==n.type?this.Mt=this.Mt.nt(e,{type:n.type,doc:t.doc}):2/* Modified */===t.type&&2/* Modified */===n.type?this.Mt=this.Mt.nt(e,{type:2/* Modified */,doc:t.doc}):2/* Modified */===t.type&&0/* Added */===n.type?this.Mt=this.Mt.nt(e,{type:0/* Added */,doc:t.doc}):1/* Removed */===t.type&&0/* Added */===n.type?this.Mt=this.Mt.remove(e):1/* Removed */===t.type&&2/* Modified */===n.type?this.Mt=this.Mt.nt(e,{type:1/* Removed */,doc:n.doc}):0/* Added */===t.type&&1/* Removed */===n.type?this.Mt=this.Mt.nt(e,{type:2/* Modified */,doc:t.doc}):// This includes these cases, which don't make sense:
  // Added->Added
  // Removed->Removed
  // Modified->Added
  // Removed->Modified
  // Metadata->Added
  // Removed->Metadata
  _():this.Mt=this.Mt.nt(e,t);},t.prototype.Ot=function(){var t=[];return this.Mt.ot(function(e,n){t.push(n);}),t;},t;}(),Dt=/** @class */function(){function t(t,e,n,r,i,o,s,u){this.query=t,this.docs=e,this.$t=n,this.docChanges=r,this.Lt=i,this.fromCache=o,this.Bt=s,this.qt=u/** Returns a view snapshot as if all documents in the snapshot were added. */;}return t.Ut=function(e,n,r,i){var o=[];return n.forEach(function(t){o.push({type:0/* Added */,doc:t});}),new t(e,n,_t.xt(n),o,r,i,/* syncStateChanged= */!0,/* excludesMetadataChanges= */!1);},Object.defineProperty(t.prototype,"hasPendingWrites",{get:function get(){return !this.Lt._();},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(t){if(!(this.fromCache===t.fromCache&&this.Bt===t.Bt&&this.Lt.isEqual(t.Lt)&&xn(this.query,t.query)&&this.docs.isEqual(t.docs)&&this.$t.isEqual(t.$t)))return !1;var e=this.docChanges,n=t.docChanges;if(e.length!==n.length)return !1;for(var r=0;r<e.length;r++){if(e[r].type!==n[r].type||!e[r].doc.isEqual(n[r].doc))return !1;}return !0;},t;}(),kt=/** @class */function(){function t(/**
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
  return t.Gt=function(e,n){var r=new Map();return r.set(e,xt.zt(e,n)),new t(z.min(),r,At(),vt(),Tt());},t;}(),xt=/** @class */function(){function t(/**
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
       */i){this.resumeToken=t,this.Ht=e,this.Jt=n,this.Yt=r,this.Xt=i/**
       * This method is used to create a synthesized TargetChanges that can be used to
       * apply a CURRENT status change to a View (for queries executed in a different
       * tab) or for new queries (to raise snapshots with correct CURRENT status).
       */;}return t.zt=function(e,n){return new t(rt.J,n,Tt(),Tt(),Tt());},t;}(),Ot=function Ot(/** The new document applies to all of these targets. */t,/** The new document is removed from all of these targets. */e,/** The key of the document for this change. */n,/**
       * The new document or NoDocument if it was deleted. Is null if the
       * document went out of view without the server sending a new document.
       */r){this.Zt=t,this.removedTargetIds=e,this.key=n,this.te=r;},Pt=function Pt(t,e){this.targetId=t,this.ee=e;},Lt=function Lt(/** What kind of change occurred to the watch target. */t,/** The target IDs that were added/removed/set. */e,/**
       * An opaque, server-assigned token that allows watching a target to be
       * resumed after disconnecting without retransmitting all the data that
       * matches the target. The resume token essentially identifies a point in
       * time from which the server should resume sending results.
       */n/** An RPC error indicating why the watch failed. */,r){void 0===n&&(n=rt.J),void 0===r&&(r=null),this.state=t,this.targetIds=e,this.resumeToken=n,this.cause=r;},Rt=/** @class */function(){function t(){/**
           * The number of pending responses (adds or removes) that we are waiting on.
           * We only consider targets active that have no pending responses.
           */this.ne=0,/**
               * Keeps track of the document changes since the last raised snapshot.
               *
               * These changes are continuously updated as we receive document updates and
               * always reflect the current set of changes against the last issued snapshot.
               */this.se=Ut(),/** See public getters for explanations of these fields. */this.ie=rt.J,this.re=!1,/**
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
       */t.prototype.ce=function(){var t=Tt(),e=Tt(),n=Tt();return this.se.forEach(function(r,i){switch(i){case 0/* Added */:t=t.add(r);break;case 2/* Modified */:e=e.add(r);break;case 1/* Removed */:n=n.add(r);break;default:_();}}),new xt(this.ie,this.re,t,e,n);},/**
       * Resets the document changes and sets `hasPendingChanges` to false.
       */t.prototype.le=function(){this.oe=!1,this.se=Ut();},t.prototype._e=function(t,e){this.oe=!0,this.se=this.se.nt(t,e);},t.prototype.fe=function(t){this.oe=!0,this.se=this.se.remove(t);},t.prototype.de=function(){this.ne+=1;},t.prototype.we=function(){this.ne-=1;},t.prototype.Te=function(){this.oe=!0,this.re=!0;},t;}(),Mt=/** @class */function(){function t(t){this.me=t,/** The internal state of all tracked targets. */this.Ee=new Map(),/** Keeps track of the documents to update since the last raised snapshot. */this.Ie=vt(),/** A mapping of document keys to their set of target IDs. */this.Ae=Vt(),/**
               * A list of targets with existence filter mismatches. These targets are
               * known to be inconsistent and their listens needs to be re-established by
               * RemoteStore.
               */this.Re=new pt(O$1)/**
       * Processes and adds the DocumentWatchChange to the current set of changes.
       */;}return t.prototype.Pe=function(t){for(var e=0,n=t.Zt;e<n.length;e++){var r=n[e];t.te instanceof mn?this.ge(r,t.te):t.te instanceof gn&&this.Ve(r,t.key,t.te);}for(var i=0,o=t.removedTargetIds;i<o.length;i++){var s=o[i];this.Ve(s,t.key,t.te);}},/** Processes and adds the WatchTargetChange to the current set of changes. */t.prototype.ye=function(t){var e=this;this.pe(t,function(n){var r=e.be(n);switch(t.state){case 0/* NoChange */:e.ve(n)&&r.ue(t.resumeToken);break;case 1/* Added */:// We need to decrement the number of pending acks needed from watch
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
       */t.prototype.pe=function(t,e){var n=this;t.targetIds.length>0?t.targetIds.forEach(e):this.Ee.forEach(function(t,r){n.ve(r)&&e(r);});},/**
       * Handles existence filters and synthesizes deletes for filter mismatches.
       * Targets that are invalidated by filter mismatches are added to
       * `pendingTargetResets`.
       */t.prototype.De=function(t){var e=t.targetId,n=t.ee.count,r=this.Ce(e);if(r){var i=r.target;if(nt(i)){if(0===n){// The existence filter told us the document does not exist. We deduce
  // that this document does not exist and apply a deleted document to
  // our updates. Without applying this deleted document there might be
  // another query that will raise this document as part of a snapshot
  // until it is resolved, essentially exposing inconsistency between
  // queries.
  var o=new W$1(i.path);this.Ve(e,o,new gn(o,z.min()));}else S$1(1===n);}else this.Ne(e)!==n&&(// Existence filter mismatch: We reset the mapping and raise a new
  // snapshot with `isFromCache:true`.
  this.Se(e),this.Re=this.Re.add(e));}},/**
       * Converts the currently accumulated state into a remote event at the
       * provided snapshot version. Resets the accumulated changes before returning.
       */t.prototype.Fe=function(t){var e=this,n=new Map();this.Ee.forEach(function(r,i){var o=e.Ce(i);if(o){if(r.Ht&&nt(o.target)){// Document queries for document that don't exist can produce an empty
  // result set. To update our local cache, we synthesize a document
  // delete if we have not previously received the document. This
  // resolves the limbo state of the document, removing it from
  // limboDocumentRefs.
  // TODO(dimond): Ideally we would have an explicit lookup target
  // instead resulting in an explicit delete message and we could
  // remove this special logic.
  var s=new W$1(o.target.path);null!==e.Ie.get(s)||e.ke(i,s)||e.Ve(i,s,new gn(s,t));}r.ae&&(n.set(i,r.ce()),r.le());}});var r=Tt();// We extract the set of limbo-only document updates as the GC logic
  // special-cases documents that do not appear in the target cache.
  // TODO(gsoltis): Expand on this comment once GC is available in the JS
  // client.
  this.Ae.forEach(function(t,n){var i=!0;n.St(function(t){var n=e.Ce(t);return !n||2/* LimboResolution */===n.Y||(i=!1,!1);}),i&&(r=r.add(t));});var i=new kt(t,n,this.Re,this.Ie,r);return this.Ie=vt(),this.Ae=Vt(),this.Re=new pt(O$1),i;},/**
       * Adds the provided document to the internal list of document updates and
       * its document key to the given target's mapping.
       */ // Visible for testing.
  t.prototype.ge=function(t,e){if(this.ve(t)){var n=this.ke(t,e.key)?2/* Modified */:0/* Added */;this.be(t)._e(e.key,n),this.Ie=this.Ie.nt(e.key,e),this.Ae=this.Ae.nt(e.key,this.xe(e.key).add(t));}},/**
       * Removes the provided document from the target mapping. If the
       * document no longer matches the target, but the document's state is still
       * known (e.g. we know that the document was deleted or we received the change
       * that caused the filter mismatch), the new document can be provided
       * to update the remote document cache.
       */ // Visible for testing.
  t.prototype.Ve=function(t,e,n){if(this.ve(t)){var r=this.be(t);this.ke(t,e)?r._e(e,1/* Removed */):// The document may have entered and left the target before we raised a
  // snapshot, so we can just ignore the change.
  r.fe(e),this.Ae=this.Ae.nt(e,this.xe(e).delete(t)),n&&(this.Ie=this.Ie.nt(e,n));}},t.prototype.removeTarget=function(t){this.Ee.delete(t);},/**
       * Returns the current count of documents in the target. This includes both
       * the number of documents that the LocalStore considers to be part of the
       * target as well as any accumulated changes.
       */t.prototype.Ne=function(t){var e=this.be(t).ce();return this.me.Me(t).size+e.Jt.size-e.Xt.size;},/**
       * Increment the number of acks needed from watch before we can consider the
       * server to be 'in-sync' with the client's active targets.
       */t.prototype.de=function(t){this.be(t).de();},t.prototype.be=function(t){var e=this.Ee.get(t);return e||(e=new Rt(),this.Ee.set(t,e)),e;},t.prototype.xe=function(t){var e=this.Ae.get(t);return e||(e=new pt(O$1),this.Ae=this.Ae.nt(t,e)),e;},/**
       * Verifies that the user is still interested in this target (by calling
       * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
       * from watch.
       */t.prototype.ve=function(t){var e=null!==this.Ce(t);return e||E$1("WatchChangeAggregator","Detected inactive target",t),e;},/**
       * Returns the TargetData for an active target (i.e. a target that the user
       * is still interested in that has no outstanding target change requests).
       */t.prototype.Ce=function(t){var e=this.Ee.get(t);return e&&e.he?null:this.me.Oe(t);},/**
       * Resets the state of a Watch target to its initial state (e.g. sets
       * 'current' to false, clears the resume token and removes its target mapping
       * from all documents).
       */t.prototype.Se=function(t){var e=this;this.Ee.set(t,new Rt()),this.me.Me(t).forEach(function(n){e.Ve(t,n,/*updatedDocument=*/null);});},/**
       * Returns whether the LocalStore considers the document to be part of the
       * specified target.
       */t.prototype.ke=function(t,e){return this.me.Me(t).has(e);},t;}();/**
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
   */function Ft(t){var e=Kt(t.mapValue.fields.__local_write_time__.timestampValue);return new B(e.seconds,e.nanos);}/**
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
  var qt=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);/** Extracts the backend's type order for the provided value. */function jt(t){return "nullValue"in t?0/* NullValue */:"booleanValue"in t?1/* BooleanValue */:"integerValue"in t||"doubleValue"in t?2/* NumberValue */:"timestampValue"in t?3/* TimestampValue */:"stringValue"in t?5/* StringValue */:"bytesValue"in t?6/* BlobValue */:"referenceValue"in t?7/* RefValue */:"geoPointValue"in t?8/* GeoPointValue */:"arrayValue"in t?9/* ArrayValue */:"mapValue"in t?Ct(t)?4/* ServerTimestampValue */:10/* ObjectValue */:_();}/** Tests `left` and `right` for equality based on the backend semantics. */function Bt(t,e){var n=jt(t);if(n!==jt(e))return !1;switch(n){case 0/* NullValue */:return !0;case 1/* BooleanValue */:return t.booleanValue===e.booleanValue;case 4/* ServerTimestampValue */:return Ft(t).isEqual(Ft(e));case 3/* TimestampValue */:return function(t,e){if("string"==typeof t.timestampValue&&"string"==typeof e.timestampValue&&t.timestampValue.length===e.timestampValue.length)// Use string equality for ISO 8601 timestamps
  return t.timestampValue===e.timestampValue;var n=Kt(t.timestampValue),r=Kt(e.timestampValue);return n.seconds===r.seconds&&n.nanos===r.nanos;}(t,e);case 5/* StringValue */:return t.stringValue===e.stringValue;case 6/* BlobValue */:return function(t,e){return $t(t.bytesValue).isEqual($t(e.bytesValue));}(t,e);case 7/* RefValue */:return t.referenceValue===e.referenceValue;case 8/* GeoPointValue */:return function(t,e){return Wt(t.geoPointValue.latitude)===Wt(e.geoPointValue.latitude)&&Wt(t.geoPointValue.longitude)===Wt(e.geoPointValue.longitude);}(t,e);case 2/* NumberValue */:return function(t,e){if("integerValue"in t&&"integerValue"in e)return Wt(t.integerValue)===Wt(e.integerValue);if("doubleValue"in t&&"doubleValue"in e){var n=Wt(t.doubleValue),r=Wt(e.doubleValue);return n===r?Y$1(n)===Y$1(r):isNaN(n)&&isNaN(r);}return !1;}(t,e);case 9/* ArrayValue */:return P$1(t.arrayValue.values||[],e.arrayValue.values||[],Bt);case 10/* ObjectValue */:return function(t,e){var n=t.mapValue.fields||{},r=e.mapValue.fields||{};if(V$1(n)!==V$1(r))return !1;for(var i in n){if(n.hasOwnProperty(i)&&(void 0===r[i]||!Bt(n[i],r[i])))return !1;}return !0;}(t,e);default:return _();}}function zt(t,e){return void 0!==(t.values||[]).find(function(t){return Bt(t,e);});}function Gt(t,e){var n=jt(t),r=jt(e);if(n!==r)return O$1(n,r);switch(n){case 0/* NullValue */:return 0;case 1/* BooleanValue */:return O$1(t.booleanValue,e.booleanValue);case 2/* NumberValue */:return function(t,e){var n=Wt(t.integerValue||t.doubleValue),r=Wt(e.integerValue||e.doubleValue);return n<r?-1:n>r?1:n===r?0:// one or both are NaN.
  isNaN(n)?isNaN(r)?0:-1:1;}(t,e);case 3/* TimestampValue */:return Qt(t.timestampValue,e.timestampValue);case 4/* ServerTimestampValue */:return Qt(Ft(t),Ft(e));case 5/* StringValue */:return O$1(t.stringValue,e.stringValue);case 6/* BlobValue */:return function(t,e){var n=$t(t),r=$t(e);return n.o(r);}(t.bytesValue,e.bytesValue);case 7/* RefValue */:return function(t,e){for(var n=t.split("/"),r=e.split("/"),i=0;i<n.length&&i<r.length;i++){var o=O$1(n[i],r[i]);if(0!==o)return o;}return O$1(n.length,r.length);}(t.referenceValue,e.referenceValue);case 8/* GeoPointValue */:return function(t,e){var n=O$1(Wt(t.latitude),Wt(e.latitude));return 0!==n?n:O$1(Wt(t.longitude),Wt(e.longitude));}(t.geoPointValue,e.geoPointValue);case 9/* ArrayValue */:return function(t,e){for(var n=t.values||[],r=e.values||[],i=0;i<n.length&&i<r.length;++i){var o=Gt(n[i],r[i]);if(o)return o;}return O$1(n.length,r.length);}(t.arrayValue,e.arrayValue);case 10/* ObjectValue */:return function(t,e){var n=t.fields||{},r=Object.keys(n),i=e.fields||{},o=Object.keys(i);// Even though MapValues are likely sorted correctly based on their insertion
  // order (e.g. when received from the backend), local modifications can bring
  // elements out of order. We need to re-sort the elements to ensure that
  // canonical IDs are independent of insertion order.
  r.sort(),o.sort();for(var s=0;s<r.length&&s<o.length;++s){var u=O$1(r[s],o[s]);if(0!==u)return u;var a=Gt(n[r[s]],i[o[s]]);if(0!==a)return a;}return O$1(r.length,o.length);}(t.mapValue,e.mapValue);default:throw _();}}function Qt(t,e){if("string"==typeof t&&"string"==typeof e&&t.length===e.length)return O$1(t,e);var n=Kt(t),r=Kt(e),i=O$1(n.seconds,r.seconds);return 0!==i?i:O$1(n.nanos,r.nanos);}function Ht(t){return function t(e){return "nullValue"in e?"null":"booleanValue"in e?""+e.booleanValue:"integerValue"in e?""+e.integerValue:"doubleValue"in e?""+e.doubleValue:"timestampValue"in e?function(t){var e=Kt(t);return "time("+e.seconds+","+e.nanos+")";}(e.timestampValue):"stringValue"in e?e.stringValue:"bytesValue"in e?$t(e.bytesValue).toBase64():"referenceValue"in e?(r=e.referenceValue,W$1.q(r).toString()):"geoPointValue"in e?"geo("+(n=e.geoPointValue).latitude+","+n.longitude+")":"arrayValue"in e?function(e){for(var n="[",r=!0,i=0,o=e.values||[];i<o.length;i++){var s=o[i];r?r=!1:n+=",",n+=t(s);}return n+"]";}(e.arrayValue):"mapValue"in e?function(e){for(// Iteration order in JavaScript is not guaranteed. To ensure that we generate
  // matching canonical IDs for identical maps, we need to sort the keys.
  var n="{",r=!0,i=0,o=Object.keys(e.fields||{}).sort();i<o.length;i++){var s=o[i];r?r=!1:n+=",",n+=s+":"+t(e.fields[s]);}return n+"}";}(e.mapValue):_();var n,r;}(t);}function Kt(t){// The json interface (for the browser) will return an iso timestamp string,
  // while the proto js library (for node) will return a
  // google.protobuf.Timestamp instance.
  if(S$1(!!t),"string"==typeof t){// The date string can have higher precision (nanos) than the Date class
  // (millis), so we do some custom parsing here.
  // Parse the nanos right out of the string.
  var e=0,n=qt.exec(t);if(S$1(!!n),n[1]){// Pad the fraction out to 9 digits (nanos).
  var r=n[1];r=(r+"000000000").substr(0,9),e=Number(r);}// Parse the date to get the seconds.
  var i=new Date(t);return {seconds:Math.floor(i.getTime()/1e3),nanos:e};}return {seconds:Wt(t.seconds),nanos:Wt(t.nanos)};}/**
   * Converts the possible Proto types for numbers into a JavaScript number.
   * Returns 0 if the value is not numeric.
   */function Wt(t){// TODO(bjornick): Handle int64 greater than 53 bits.
  return "number"==typeof t?t:"string"==typeof t?Number(t):0;}/** Converts the possible Proto types for Blobs into a ByteString. */function $t(t){return "string"==typeof t?rt.fromBase64String(t):rt.fromUint8Array(t);}/** Returns a reference value for the provided database and key. */function Yt(t,e){return {referenceValue:"projects/"+t.projectId+"/databases/"+t.database+"/documents/"+e.path.F()};}/** Returns true if `value` is an IntegerValue . */function Xt(t){return !!t&&"integerValue"in t;}/** Returns true if `value` is a DoubleValue. */ /** Returns true if `value` is an ArrayValue. */function Jt(t){return !!t&&"arrayValue"in t;}/** Returns true if `value` is a NullValue. */function Zt(t){return !!t&&"nullValue"in t;}/** Returns true if `value` is NaN. */function te(t){return !!t&&"doubleValue"in t&&isNaN(Number(t.doubleValue));}/** Returns true if `value` is a MapValue. */function ee(t){return !!t&&"mapValue"in t;}/**
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
   */var ne={asc:"ASCENDING",desc:"DESCENDING"},re={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},ie=function ie(t,e){this.s=t,this.$e=e;};/**
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
   */function oe(t){return {integerValue:""+t};}/**
   * Returns an DoubleValue for `value` that is encoded based the serializer's
   * `useProto3Json` setting.
   */function se(t,e){if(t.$e){if(isNaN(e))return {doubleValue:"NaN"};if(e===1/0)return {doubleValue:"Infinity"};if(e===-1/0)return {doubleValue:"-Infinity"};}return {doubleValue:Y$1(e)?"-0":e};}/**
   * Returns a value for a number that's appropriate to put into a proto.
   * The return value is an IntegerValue if it can safely represent the value,
   * otherwise a DoubleValue is returned.
   */function ue(t,e){return X$1(e)?oe(e):se(t,e);}/**
   * Returns a value for a Date that's appropriate to put into a proto.
   */function ae(t,e){return t.$e?new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")+"."+("000000000"+e.nanoseconds).slice(-9)+"Z":{seconds:""+e.seconds,nanos:e.nanoseconds};}/**
   * Returns a value for bytes that's appropriate to put in a proto.
   *
   * Visible for testing.
   */function ce(t,e){return t.$e?e.toBase64():e.toUint8Array();}/**
   * Returns a ByteString based on the proto string value.
   */function he(t,e){return ae(t,e.A());}function fe(t){return S$1(!!t),z.m(function(t){var e=Kt(t);return new B(e.seconds,e.nanos);}(t));}function le(t,e){return function(t){return new Q$1(["projects",t.projectId,"databases",t.database]);}(t).child("documents").child(e).F();}function pe(t){var e=Q$1.k(t);return S$1(Re(e)),e;}function de(t,e){return le(t.s,e.path);}function ye(t,e){var n=pe(e);return S$1(n.get(1)===t.s.projectId),S$1(!n.get(3)&&!t.s.database||n.get(3)===t.s.database),new W$1(we(n));}function ve(t,e){return le(t.s,e);}function me(t){var e=pe(t);// In v1beta1 queries for collections at the root did not have a trailing
  // "/documents". In v1 all resource paths contain "/documents". Preserve the
  // ability to read the v1beta1 form for compatibility with queries persisted
  // in the local target cache.
  return 4===e.length?Q$1.M():we(e);}function ge(t){return new Q$1(["projects",t.s.projectId,"databases",t.s.database]).F();}function we(t){return S$1(t.length>4&&"documents"===t.get(4)),t.V(5)/** Creates an api.Document from key and fields (but no create/update time) */;}function be(t,e,n){return {name:de(t,e),fields:n.proto.mapValue.fields};}function Ie(t,e,n){var r=ye(t,e.name),i=fe(e.updateTime),o=new pn({mapValue:{fields:e.fields}});return new mn(r,i,o,{hasCommittedMutations:!!n});}function Ee(t,e){var n;if(e instanceof on)n={update:be(t,e.key,e.value)};else if(e instanceof fn)n={delete:de(t,e.key)};else if(e instanceof sn)n={update:be(t,e.key,e.data),updateMask:Le(e.Le)};else if(e instanceof an)n={transform:{document:de(t,e.key),fieldTransforms:e.fieldTransforms.map(function(t){return function(t,e){var n=e.transform;if(n instanceof Fe)return {fieldPath:e.field.F(),setToServerValue:"REQUEST_TIME"};if(n instanceof qe)return {fieldPath:e.field.F(),appendMissingElements:{values:n.elements}};if(n instanceof Be)return {fieldPath:e.field.F(),removeAllFromArray:{values:n.elements}};if(n instanceof Ge)return {fieldPath:e.field.F(),increment:n.Be};throw _();}(0,t);})}};else {if(!(e instanceof ln))return _();n={verify:de(t,e.key)};}return e.Ue.qe||(n.currentDocument=function(t,e){return void 0!==e.updateTime?{updateTime:he(t,e.updateTime)}:void 0!==e.exists?{exists:e.exists}:_();}(t,e.Ue)),n;}function Te(t,e){var n=e.currentDocument?function(t){return void 0!==t.updateTime?Ye.updateTime(fe(t.updateTime)):void 0!==t.exists?Ye.exists(t.exists):Ye.Qe();}(e.currentDocument):Ye.Qe();if(e.update){e.update.name;var r=ye(t,e.update.name),i=new pn({mapValue:{fields:e.update.fields}});if(e.updateMask){var o=function(t){var e=t.fieldPaths||[];return new Ke(e.map(function(t){return K$1.B(t);}));}(e.updateMask);return new sn(r,i,o,n);}return new on(r,i,n);}if(e.delete){var s=ye(t,e.delete);return new fn(s,n);}if(e.transform){var u=ye(t,e.transform.document),a=e.transform.fieldTransforms.map(function(e){return function(t,e){var n=null;if("setToServerValue"in e)S$1("REQUEST_TIME"===e.setToServerValue),n=new Fe();else if("appendMissingElements"in e){var r=e.appendMissingElements.values||[];n=new qe(r);}else if("removeAllFromArray"in e){var i=e.removeAllFromArray.values||[];n=new Be(i);}else "increment"in e?n=new Ge(t,e.increment):_();var o=K$1.B(e.fieldPath);return new We(o,n);}(t,e);});return S$1(!0===n.exists),new an(u,a);}if(e.verify){var c=ye(t,e.verify);return new ln(c,n);}return _();}function Ne(t,e){return {documents:[ve(t,e.path)]};}function Ae(t,e){// Dissect the path into parent, collectionId, and optional key filter.
  var n={structuredQuery:{}},r=e.path;null!==e.collectionGroup?(n.parent=ve(t,r),n.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(n.parent=ve(t,r.p()),n.structuredQuery.from=[{collectionId:r.S()}]);var i=function(t){if(0!==t.length){var e=t.map(function(t){// visible for testing
  return function(t){if("=="/* EQUAL */===t.op){if(te(t.value))return {unaryFilter:{field:ke(t.field),op:"IS_NAN"}};if(Zt(t.value))return {unaryFilter:{field:ke(t.field),op:"IS_NULL"}};}else if("!="/* NOT_EQUAL */===t.op){if(te(t.value))return {unaryFilter:{field:ke(t.field),op:"IS_NOT_NAN"}};if(Zt(t.value))return {unaryFilter:{field:ke(t.field),op:"IS_NOT_NULL"}};}return {fieldFilter:{field:ke(t.field),op:(e=t.op,re[e]),value:t.value}};// visible for testing
  var e;}(t);});return 1===e.length?e[0]:{compositeFilter:{op:"AND",filters:e}};}}(e.filters);i&&(n.structuredQuery.where=i);var o=function(t){if(0!==t.length)return t.map(function(t){return {field:ke((e=t).field),direction:(n=e.dir,ne[n])};// visible for testing
  var e,n;});}(e.orderBy);o&&(n.structuredQuery.orderBy=o);var s=function(t,e){return t.$e||$(e)?e:{value:e};}(t,e.limit);return null!==s&&(n.structuredQuery.limit=s),e.startAt&&(n.structuredQuery.startAt=Se(e.startAt)),e.endAt&&(n.structuredQuery.endAt=Se(e.endAt)),n;}function _e(t){var e=me(t.parent),n=t.structuredQuery,r=n.from?n.from.length:0,i=null;if(r>0){S$1(1===r);var o=n.from[0];o.allDescendants?i=o.collectionId:e=e.child(o.collectionId);}var s=[];n.where&&(s=function t(e){return e?void 0!==e.unaryFilter?[Pe(e)]:void 0!==e.fieldFilter?[Oe(e)]:void 0!==e.compositeFilter?e.compositeFilter.filters.map(function(e){return t(e);}).reduce(function(t,e){return t.concat(e);}):_():[];}(n.where));var u=[];n.orderBy&&(u=n.orderBy.map(function(t){return new Wn(xe((e=t).field),// visible for testing
  function(t){switch(t){case"ASCENDING":return "asc"/* ASCENDING */;case"DESCENDING":return "desc"/* DESCENDING */;default:return;}}(e.direction));var e;}));var a=null;n.limit&&(a=function(t){var e;return $(e="object"==_typeof(t)?t.value:t)?null:e;}(n.limit));var c=null;n.startAt&&(c=De(n.startAt));var h=null;return n.endAt&&(h=De(n.endAt)),En(e,i,u,s,a,"F"/* First */,c,h);}function Se(t){return {before:t.before,values:t.position};}function De(t){var e=!!t.before,n=t.values||[];return new Gn(n,e);}// visible for testing
  function ke(t){return {fieldPath:t.F()};}function xe(t){return K$1.B(t.fieldPath);}function Oe(t){return Mn.create(xe(t.fieldFilter.field),function(t){switch(t){case"EQUAL":return "=="/* EQUAL */;case"NOT_EQUAL":return "!="/* NOT_EQUAL */;case"GREATER_THAN":return ">"/* GREATER_THAN */;case"GREATER_THAN_OR_EQUAL":return ">="/* GREATER_THAN_OR_EQUAL */;case"LESS_THAN":return "<"/* LESS_THAN */;case"LESS_THAN_OR_EQUAL":return "<="/* LESS_THAN_OR_EQUAL */;case"ARRAY_CONTAINS":return "array-contains"/* ARRAY_CONTAINS */;case"IN":return "in"/* IN */;case"NOT_IN":return "not-in"/* NOT_IN */;case"ARRAY_CONTAINS_ANY":return "array-contains-any"/* ARRAY_CONTAINS_ANY */;case"OPERATOR_UNSPECIFIED":default:return _();}}(t.fieldFilter.op),t.fieldFilter.value);}function Pe(t){switch(t.unaryFilter.op){case"IS_NAN":var e=xe(t.unaryFilter.field);return Mn.create(e,"=="/* EQUAL */,{doubleValue:NaN});case"IS_NULL":var n=xe(t.unaryFilter.field);return Mn.create(n,"=="/* EQUAL */,{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":var r=xe(t.unaryFilter.field);return Mn.create(r,"!="/* NOT_EQUAL */,{doubleValue:NaN});case"IS_NOT_NULL":var i=xe(t.unaryFilter.field);return Mn.create(i,"!="/* NOT_EQUAL */,{nullValue:"NULL_VALUE"});case"OPERATOR_UNSPECIFIED":default:return _();}}function Le(t){var e=[];return t.fields.forEach(function(t){return e.push(t.F());}),{fieldPaths:e};}function Re(t){// Resource names have at least 4 components (project ID, database ID)
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
   */ /** Represents a transform within a TransformMutation. */var Me=function Me(){// Make sure that the structural type of `TransformOperation` is unique.
  // See https://github.com/microsoft/TypeScript/issues/5451
  this.We=void 0;};/**
   * Computes the local transform result against the provided `previousValue`,
   * optionally using the provided localWriteTime.
   */function Ve(t,e,n){return t instanceof Fe?function(t,e){var n={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:t.seconds,nanos:t.nanoseconds}}}};return e&&(n.fields.__previous_value__=e),{mapValue:n};}(n,e):t instanceof qe?je(t,e):t instanceof Be?ze(t,e):function(t,e){// PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
  // precision and resolves overflows by reducing precision, we do not
  // manually cap overflows at 2^63.
  var n=Ce(t,e),r=Qe(n)+Qe(t.Be);return Xt(n)&&Xt(t.Be)?oe(r):se(t.serializer,r);}(t,e);}/**
   * Computes a final transform result after the transform has been acknowledged
   * by the server, potentially using the server-provided transformResult.
   */function Ue(t,e,n){// The server just sends null as the transform result for array operations,
  // so we have to calculate a result the same as we do for local
  // applications.
  return t instanceof qe?je(t,e):t instanceof Be?ze(t,e):n;}/**
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
   */function Ce(t,e){return t instanceof Ge?Xt(n=e)||function(t){return !!t&&"doubleValue"in t;}(n)?e:{integerValue:0}:null;var n;}/** Transforms a value into a server-generated timestamp. */var Fe=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends$1(n,e),n;}(Me),qe=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).elements=t,n;}return __extends$1(n,e),n;}(Me);/** Transforms an array value via a union operation. */function je(t,e){for(var n=He(e),r=function r(t){n.some(function(e){return Bt(e,t);})||n.push(t);},i=0,o=t.elements;i<o.length;i++){r(o[i]);}return {arrayValue:{values:n}};}/** Transforms an array value via a remove operation. */var Be=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).elements=t,n;}return __extends$1(n,e),n;}(Me);function ze(t,e){for(var n=He(e),r=function r(t){n=n.filter(function(e){return !Bt(e,t);});},i=0,o=t.elements;i<o.length;i++){r(o[i]);}return {arrayValue:{values:n}};}/**
   * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
   * transforms. Converts all field values to integers or doubles, but unlike the
   * backend does not cap integer values at 2^63. Instead, JavaScript number
   * arithmetic is used and precision loss can occur for values greater than 2^53.
   */var Ge=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).serializer=t,r.Be=n,r;}return __extends$1(n,e),n;}(Me);function Qe(t){return Wt(t.integerValue||t.doubleValue);}function He(t){return Jt(t)&&t.arrayValue.values?t.arrayValue.values.slice():[];}/**
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
   */var Ke=/** @class */function(){function t(t){this.fields=t,// TODO(dimond): validation of FieldMask
  // Sort the field mask to support `FieldMask.isEqual()` and assert below.
  t.sort(K$1.P)/**
       * Verifies that `fieldPath` is included by at least one field in this field
       * mask.
       *
       * This is an O(n) operation, where `n` is the size of the field mask.
       */;}return t.prototype.je=function(t){for(var e=0,n=this.fields;e<n.length;e++){if(n[e].D(t))return !0;}return !1;},t.prototype.isEqual=function(t){return P$1(this.fields,t.fields,function(t,e){return t.isEqual(e);});},t;}(),We=function We(t,e){this.field=t,this.transform=e;};/** A field path and the TransformOperation to perform upon it. */ /** The result of successfully applying a mutation to the backend. */var $e=function $e(/**
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
       */e){this.version=t,this.transformResults=e;},Ye=/** @class */function(){function t(t,e){this.updateTime=t,this.exists=e/** Creates a new empty Precondition. */;}return t.Qe=function(){return new t();},/** Creates a new Precondition with an exists flag. */t.exists=function(e){return new t(void 0,e);},/** Creates a new Precondition based on a version a document exists at. */t.updateTime=function(e){return new t(e);},Object.defineProperty(t.prototype,"qe",{/** Returns whether this Precondition is empty. */get:function get(){return void 0===this.updateTime&&void 0===this.exists;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(t){return this.exists===t.exists&&(this.updateTime?!!t.updateTime&&this.updateTime.isEqual(t.updateTime):!t.updateTime);},t;}();/**
   * Encodes a precondition for a mutation. This follows the model that the
   * backend accepts with the special case of an explicit "empty" precondition
   * (meaning no precondition).
   */ /**
   * Returns true if the preconditions is valid for the given document
   * (or null if no document is available).
   */function Xe(t,e){return void 0!==t.updateTime?e instanceof mn&&e.version.isEqual(t.updateTime):void 0===t.exists||t.exists===e instanceof mn;}/**
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
   */var Je=function Je(){};/**
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
   */function Ze(t,e,n){return t instanceof on?function(t,e,n){// Unlike applySetMutationToLocalView, if we're applying a mutation to a
  // remote document the server has accepted the mutation so the precondition
  // must have held.
  return new mn(t.key,n.version,t.value,{hasCommittedMutations:!0});}(t,0,n):t instanceof sn?function(t,e,n){if(!Xe(t.Ue,e))// Since the mutation was not rejected, we know that the  precondition
  // matched on the backend. We therefore must not have the expected version
  // of the document in our cache and return an UnknownDocument with the
  // known updateTime.
  return new wn(t.key,n.version);var r=un(t,e);return new mn(t.key,n.version,r,{hasCommittedMutations:!0});}(t,e,n):t instanceof an?function(t,e,n){if(S$1(null!=n.transformResults),!Xe(t.Ue,e))// Since the mutation was not rejected, we know that the  precondition
  // matched on the backend. We therefore must not have the expected version
  // of the document in our cache and return an UnknownDocument with the
  // known updateTime.
  return new wn(t.key,n.version);var r=cn(t,e),i=/**
   * Creates a list of "transform results" (a transform result is a field value
   * representing the result of applying a transform) for use after a
   * TransformMutation has been acknowledged by the server.
   *
   * @param fieldTransforms The field transforms to apply the result to.
   * @param baseDoc The document prior to applying this mutation batch.
   * @param serverTransformResults The transform results received by the server.
   * @return The transform results list.
   */function(t,e,n){var r=[];S$1(t.length===n.length);for(var i=0;i<n.length;i++){var o=t[i],s=o.transform,u=null;e instanceof mn&&(u=e.field(o.field)),r.push(Ue(s,u,n[i]));}return r;}(t.fieldTransforms,e,n.transformResults),o=n.version,s=hn(t,r.data(),i);return new mn(t.key,o,s,{hasCommittedMutations:!0});}(t,e,n):function(t,e,n){// Unlike applyToLocalView, if we're applying a mutation to a remote
  // document the server has accepted the mutation so the precondition must
  // have held.
  return new gn(t.key,n.version,{hasCommittedMutations:!0});}(t,0,n);}/**
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
   */function tn(t,e,n,r){return t instanceof on?function(t,e){if(!Xe(t.Ue,e))return e;var n=rn(e);return new mn(t.key,n,t.value,{Ke:!0});}(t,e):t instanceof sn?function(t,e){if(!Xe(t.Ue,e))return e;var n=rn(e),r=un(t,e);return new mn(t.key,n,r,{Ke:!0});}(t,e):t instanceof an?function(t,e,n,r){if(!Xe(t.Ue,e))return e;var i=cn(t,e),o=function(t,e,n,r){for(var i=[],o=0,s=t;o<s.length;o++){var u=s[o],a=u.transform,c=null;n instanceof mn&&(c=n.field(u.field)),null===c&&r instanceof mn&&(// If the current document does not contain a value for the mutated
  // field, use the value that existed before applying this mutation
  // batch. This solves an edge case where a PatchMutation clears the
  // values in a nested map before the TransformMutation is applied.
  c=r.field(u.field)),i.push(Ve(a,c,e));}return i;}(t.fieldTransforms,n,e,r),s=hn(t,i.data(),o);return new mn(t.key,i.version,s,{Ke:!0});}(t,e,r,n):function(t,e){return Xe(t.Ue,e)?new gn(t.key,z.min()):e;}(t,e);}/**
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
   */function en(t,e){return t instanceof an?function(t,e){for(var n=null,r=0,i=t.fieldTransforms;r<i.length;r++){var o=i[r],s=e instanceof mn?e.field(o.field):void 0,u=Ce(o.transform,s||null);null!=u&&(n=null==n?new dn().set(o.field,u):n.set(o.field,u));}return n?n.Ge():null;}(t,e):null;}function nn(t,e){return t.type===e.type&&!!t.key.isEqual(e.key)&&!!t.Ue.isEqual(e.Ue)&&(0/* Set */===t.type?t.value.isEqual(e.value):1/* Patch */===t.type?t.data.isEqual(e.data)&&t.Le.isEqual(e.Le):2/* Transform */!==t.type||P$1(t.fieldTransforms,t.fieldTransforms,function(t,e){return function(t,e){return t.field.isEqual(e.field)&&function(t,e){return t instanceof qe&&e instanceof qe||t instanceof Be&&e instanceof Be?P$1(t.elements,e.elements,Bt):t instanceof Ge&&e instanceof Ge?Bt(t.Be,e.Be):t instanceof Fe&&e instanceof Fe;}(t.transform,e.transform);}(t,e);}));}/**
   * Returns the version from the given document for use as the result of a
   * mutation. Mutations are defined to return the version of the base document
   * only if it is an existing document. Deleted and unknown documents have a
   * post-mutation version of SnapshotVersion.min().
   */function rn(t){return t instanceof mn?t.version:z.min();}/**
   * A mutation that creates or replaces the document at the given key with the
   * object value contents.
   */var on=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this)||this).key=t,i.value=n,i.Ue=r,i.type=0/* Set */,i;}return __extends$1(n,e),n;}(Je),sn=/** @class */function(e){function n(t,n,r,i){var o=this;return (o=e.call(this)||this).key=t,o.data=n,o.Le=r,o.Ue=i,o.type=1/* Patch */,o;}return __extends$1(n,e),n;}(Je);function un(t,e){return function(t,e){var n=new dn(e);return t.Le.fields.forEach(function(e){if(!e._()){var r=t.data.field(e);null!==r?n.set(e,r):n.delete(e);}}),n.Ge();}(t,e instanceof mn?e.data():pn.empty());}var an=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).key=t,r.fieldTransforms=n,r.type=2/* Transform */,// NOTE: We set a precondition of exists: true as a safety-check, since we
  // always combine TransformMutations with a SetMutation or PatchMutation which
  // (if successful) should end up with an existing document.
  r.Ue=Ye.exists(!0),r;}return __extends$1(n,e),n;}(Je);function cn(t,e){return e;}function hn(t,e,n){for(var r=new dn(e),i=0;i<t.fieldTransforms.length;i++){var o=t.fieldTransforms[i];r.set(o.field,n[i]);}return r.Ge();}/** A mutation that deletes the document at the given key. */var fn=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).key=t,r.Ue=n,r.type=3/* Delete */,r;}return __extends$1(n,e),n;}(Je),ln=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).key=t,r.Ue=n,r.type=4/* Verify */,r;}return __extends$1(n,e),n;}(Je),pn=/** @class */function(){function t(t){this.proto=t;}return t.empty=function(){return new t({mapValue:{}});},/**
       * Returns the value at the given path or null.
       *
       * @param path the path to search
       * @return The value at the path or if there it doesn't exist.
       */t.prototype.field=function(t){if(t._())return this.proto;for(var e=this.proto,n=0;n<t.length-1;++n){if(!e.mapValue.fields)return null;if(!ee(e=e.mapValue.fields[t.get(n)]))return null;}return (e=(e.mapValue.fields||{})[t.S()])||null;},t.prototype.isEqual=function(t){return Bt(this.proto,t.proto);},t;}(),dn=/** @class */function(){/**
       * @param baseObject The object to mutate.
       */function t(t){void 0===t&&(t=pn.empty()),this.ze=t,/** A map that contains the accumulated changes in this builder. */this.He=new Map();}/**
       * Sets the field to the provided value.
       *
       * @param path The field path to set.
       * @param value The value to set.
       * @return The current Builder instance.
       */return t.prototype.set=function(t,e){return this.Je(t,e),this;},/**
       * Removes the field at the specified path. If there is no field at the
       * specified path, nothing is changed.
       *
       * @param path The field path to remove.
       * @return The current Builder instance.
       */t.prototype.delete=function(t){return this.Je(t,null),this;},/**
       * Adds `value` to the overlay map at `path`. Creates nested map entries if
       * needed.
       */t.prototype.Je=function(t,e){for(var n=this.He,r=0;r<t.length-1;++r){var i=t.get(r),o=n.get(i);o instanceof Map?// Re-use a previously created map
  n=o:o&&10/* ObjectValue */===jt(o)?(// Convert the existing Protobuf MapValue into a map
  o=new Map(Object.entries(o.mapValue.fields||{})),n.set(i,o),n=o):(// Create an empty map to represent the current nesting level
  o=new Map(),n.set(i,o),n=o);}n.set(t.S(),e);},/** Returns an ObjectValue with all mutations applied. */t.prototype.Ge=function(){var t=this.Ye(K$1.M(),this.He);return null!=t?new pn(t):this.ze;},/**
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
       */t.prototype.Ye=function(t,e){var n=this,r=!1,i=this.ze.field(t),o=ee(i)?// If there is already data at the current path, base our
  Object.assign({},i.mapValue.fields):{};return e.forEach(function(e,i){if(e instanceof Map){var s=n.Ye(t.child(i),e);null!=s&&(o[i]=s,r=!0);}else null!==e?(o[i]=e,r=!0):o.hasOwnProperty(i)&&(delete o[i],r=!0);}),r?{mapValue:{fields:o}}:null;},t;}();/**
   * Returns a FieldMask built from all fields in a MapValue.
   */function yn(t){var e=[];return U$1(t.fields||{},function(t,n){var r=new K$1([t]);if(ee(n)){var i=yn(n.mapValue).fields;if(0===i.length)// Preserve the empty map by adding it to the FieldMask.
  e.push(r);else// For nested and non-empty ObjectValues, add the FieldPath of the
  // leaf nodes.
  for(var o=0,s=i;o<s.length;o++){var u=s[o];e.push(r.child(u));}}else// For nested and non-empty ObjectValues, add the FieldPath of the leaf
  // nodes.
  e.push(r);}),new Ke(e)/**
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
   */;}var vn=function vn(t,e){this.key=t,this.version=e;},mn=/** @class */function(e){function n(t,n,r,i){var o=this;return (o=e.call(this,t,n)||this).Xe=r,o.Ke=!!i.Ke,o.hasCommittedMutations=!!i.hasCommittedMutations,o;}return __extends$1(n,e),n.prototype.field=function(t){return this.Xe.field(t);},n.prototype.data=function(){return this.Xe;},n.prototype.Ze=function(){return this.Xe.proto;},n.prototype.isEqual=function(t){return t instanceof n&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.Ke===t.Ke&&this.hasCommittedMutations===t.hasCommittedMutations&&this.Xe.isEqual(t.Xe);},n.prototype.toString=function(){return "Document("+this.key+", "+this.version+", "+this.Xe.toString()+", {hasLocalMutations: "+this.Ke+"}), {hasCommittedMutations: "+this.hasCommittedMutations+"})";},Object.defineProperty(n.prototype,"hasPendingWrites",{get:function get(){return this.Ke||this.hasCommittedMutations;},enumerable:!1,configurable:!0}),n;}(vn),gn=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this,t,n)||this).hasCommittedMutations=!(!r||!r.hasCommittedMutations),i;}return __extends$1(n,e),n.prototype.toString=function(){return "NoDocument("+this.key+", "+this.version+")";},Object.defineProperty(n.prototype,"hasPendingWrites",{get:function get(){return this.hasCommittedMutations;},enumerable:!1,configurable:!0}),n.prototype.isEqual=function(t){return t instanceof n&&t.hasCommittedMutations===this.hasCommittedMutations&&t.version.isEqual(this.version)&&t.key.isEqual(this.key);},n;}(vn),wn=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends$1(n,e),n.prototype.toString=function(){return "UnknownDocument("+this.key+", "+this.version+")";},Object.defineProperty(n.prototype,"hasPendingWrites",{get:function get(){return !0;},enumerable:!1,configurable:!0}),n.prototype.isEqual=function(t){return t instanceof n&&t.version.isEqual(this.version)&&t.key.isEqual(this.key);},n;}(vn);/**
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
   */function bn(t,// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
   */var In=/** @class */function(){/**
       * Initializes a Query with a path and optional additional query constraints.
       * Path must currently be empty if this is a collection group query.
       */function t(t,e,n,r,i,o/* First */,s,u){void 0===e&&(e=null),void 0===n&&(n=[]),void 0===r&&(r=[]),void 0===i&&(i=null),void 0===o&&(o="F"),void 0===s&&(s=null),void 0===u&&(u=null),this.path=t,this.collectionGroup=e,this.tn=n,this.filters=r,this.limit=i,this.en=o,this.startAt=s,this.endAt=u,this.nn=null,// The corresponding `Target` of this `Query` instance.
  this.sn=null,this.startAt,this.endAt;}/**
       * Helper to convert a collection group query into a collection query at a
       * specific path. This is used when executing collection group queries, since
       * we have to split the query into a set of collection queries at multiple
       * paths.
       */return t.prototype.rn=function(e){return new t(e,/*collectionGroup=*/null,this.tn.slice(),this.filters.slice(),this.limit,this.en,this.startAt,this.endAt);},t.prototype.on=function(){return 0===this.filters.length&&null===this.limit&&null==this.startAt&&null==this.endAt&&(0===this.tn.length||1===this.tn.length&&this.tn[0].field.$());},t.prototype.hn=function(){return !$(this.limit)&&"F"/* First */===this.en;},t.prototype.an=function(){return !$(this.limit)&&"L"/* Last */===this.en;},t.prototype.un=function(){return this.tn.length>0?this.tn[0].field:null;},t.prototype.cn=function(){for(var t=0,e=this.filters;t<e.length;t++){var n=e[t];if(n.ln())return n.field;}return null;},t.prototype._n=function(t){for(var e=0,n=this.filters;e<n.length;e++){var r=n[e];if(t.indexOf(r.op)>=0)return r.op;}return null;},t;}();/** Creates a new Query instance with the options provided. */function En(t,e,n,r,i,o,s,u){return new In(t,e,n,r,i,o,s,u);}/** Creates a new Query for a query that matches all documents at `path` */function Tn(t){return new In(t);}/**
   * Creates a new Query for a collection group query that matches all documents
   * within the provided collection group.
   */ /**
   * Returns whether the query matches a collection group rather than a specific
   * collection.
   */function Nn(t){return null!==t.collectionGroup;}/**
   * Returns the implicit order by constraint that is used to execute the Query,
   * which can be different from the order by constraints the user provided (e.g.
   * the SDK and backend always orders by `__name__`).
   */function An(t){var e=bn(t,In);if(null===e.nn){e.nn=[];var n=e.cn(),r=e.un();if(null!==n&&null===r)// In order to implicitly add key ordering, we must also add the
  // inequality filter field for it to be a valid query.
  // Note that the default inequality field and key ordering is ascending.
  n.$()||e.nn.push(new Wn(n)),e.nn.push(new Wn(K$1.L(),"asc"/* ASCENDING */));else {for(var i=!1,o=0,s=e.tn;o<s.length;o++){var u=s[o];e.nn.push(u),u.field.$()&&(i=!0);}if(!i){// The order of the implicit key ordering always matches the last
  // explicit order by
  var a=e.tn.length>0?e.tn[e.tn.length-1].dir:"asc"/* ASCENDING */;e.nn.push(new Wn(K$1.L(),a));}}}return e.nn;}/**
   * Converts this `Query` instance to it's corresponding `Target` representation.
   */function _n(t){var e=bn(t,In);if(!e.sn)if("F"/* First */===e.en)e.sn=Z$1(e.path,e.collectionGroup,An(e),e.filters,e.limit,e.startAt,e.endAt);else {for(// Flip the orderBy directions since we want the last results
  var n=[],r=0,i=An(e);r<i.length;r++){var o=i[r],s="desc"/* DESCENDING */===o.dir?"asc"/* ASCENDING */:"desc"/* DESCENDING */;n.push(new Wn(o.field,s));}// We need to swap the cursors to match the now-flipped query ordering.
  var u=e.endAt?new Gn(e.endAt.position,!e.endAt.before):null,a=e.startAt?new Gn(e.startAt.position,!e.startAt.before):null;// Now return as a LimitType.First query.
  e.sn=Z$1(e.path,e.collectionGroup,n,e.filters,e.limit,u,a);}return e.sn;}function Sn(t,e,n){return new In(t.path,t.collectionGroup,t.tn.slice(),t.filters.slice(),e,n,t.startAt,t.endAt);}function Dn(t,e){return new In(t.path,t.collectionGroup,t.tn.slice(),t.filters.slice(),t.limit,t.en,e,t.endAt);}function kn(t,e){return new In(t.path,t.collectionGroup,t.tn.slice(),t.filters.slice(),t.limit,t.en,t.startAt,e);}function xn(t,e){return et(_n(t),_n(e))&&t.en===e.en;}// TODO(b/29183165): This is used to get a unique string from a query to, for
  // example, use as a dictionary key, but the implementation is subject to
  // collisions. Make it collision-free.
  function On(t){return tt(_n(t))+"|lt:"+t.en;}function Pn(t){return "Query(target="+function(t){var e=t.path.F();return null!==t.collectionGroup&&(e+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(e+=", filters: ["+t.filters.map(function(t){return (e=t).field.F()+" "+e.op+" "+Ht(e.value);/** Returns a debug description for `filter`. */var e;/** Filter that matches on key fields (i.e. '__name__'). */}).join(", ")+"]"),$(t.limit)||(e+=", limit: "+t.limit),t.orderBy.length>0&&(e+=", orderBy: ["+t.orderBy.map(function(t){return (e=t).field.F()+" ("+e.dir+")";var e;}).join(", ")+"]"),t.startAt&&(e+=", startAt: "+Qn(t.startAt)),t.endAt&&(e+=", endAt: "+Qn(t.endAt)),"Target("+e+")";}(_n(t))+"; limitType="+t.en+")";}/** Returns whether `doc` matches the constraints of `query`. */function Ln(t,e){return function(t,e){var n=e.key.path;return null!==t.collectionGroup?e.key.U(t.collectionGroup)&&t.path.D(n):W$1.W(t.path)?t.path.isEqual(n):t.path.C(n);}(t,e)&&function(t,e){for(var n=0,r=t.tn;n<r.length;n++){var i=r[n];// order by key always matches
  if(!i.field.$()&&null===e.field(i.field))return !1;}return !0;}(t,e)&&function(t,e){for(var n=0,r=t.filters;n<r.length;n++){if(!r[n].matches(e))return !1;}return !0;}(t,e)&&function(t,e){return !(t.startAt&&!Hn(t.startAt,An(t),e))&&(!t.endAt||!Hn(t.endAt,An(t),e));}(t,e);}function Rn(t){return function(e,n){for(var r=!1,i=0,o=An(t);i<o.length;i++){var s=o[i],u=$n(s,e,n);if(0!==u)return u;r=r||s.field.$();}return 0;};}var Mn=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this)||this).field=t,i.op=n,i.value=r,i;}/**
       * Creates a filter based on the provided arguments.
       */return __extends$1(n,e),n.create=function(t,e,r){if(t.$())return "in"/* IN */===e||"not-in"/* NOT_IN */===e?this.fn(t,e,r):new Vn(t,e,r);if(Zt(r)){if("=="/* EQUAL */!==e&&"!="/* NOT_EQUAL */!==e)// TODO(ne-queries): Update error message to include != comparison.
  throw new j(q$1.INVALID_ARGUMENT,"Invalid query. Null supports only equality comparisons.");return new n(t,e,r);}if(te(r)){if("=="/* EQUAL */!==e&&"!="/* NOT_EQUAL */!==e)// TODO(ne-queries): Update error message to include != comparison.
  throw new j(q$1.INVALID_ARGUMENT,"Invalid query. NaN supports only equality comparisons.");return new n(t,e,r);}return "array-contains"/* ARRAY_CONTAINS */===e?new qn(t,r):"in"/* IN */===e?new jn(t,r):"not-in"/* NOT_IN */===e?new Bn(t,r):"array-contains-any"/* ARRAY_CONTAINS_ANY */===e?new zn(t,r):new n(t,e,r);},n.fn=function(t,e,n){return "in"/* IN */===e?new Un(t,n):new Cn(t,n);},n.prototype.matches=function(t){var e=t.field(this.field);// Types do not have to match in NOT_EQUAL filters.
  return "!="/* NOT_EQUAL */===this.op?null!==e&&this.dn(Gt(e,this.value)):null!==e&&jt(this.value)===jt(e)&&this.dn(Gt(e,this.value));// Only compare types with matching backend order (such as double and int).
  },n.prototype.dn=function(t){switch(this.op){case"<"/* LESS_THAN */:return t<0;case"<="/* LESS_THAN_OR_EQUAL */:return t<=0;case"=="/* EQUAL */:return 0===t;case"!="/* NOT_EQUAL */:return 0!==t;case">"/* GREATER_THAN */:return t>0;case">="/* GREATER_THAN_OR_EQUAL */:return t>=0;default:return _();}},n.prototype.ln=function(){return ["<"/* LESS_THAN */,"<="/* LESS_THAN_OR_EQUAL */,">"/* GREATER_THAN */,">="/* GREATER_THAN_OR_EQUAL */,"!="/* NOT_EQUAL */].indexOf(this.op)>=0;},n;}(function(){});var Vn=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this,t,n,r)||this).key=W$1.q(r.referenceValue),i;}return __extends$1(n,e),n.prototype.matches=function(t){var e=W$1.P(t.key,this.key);return this.dn(e);},n;}(Mn),Un=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this,t,"in"/* IN */,n)||this).keys=Fn("in"/* IN */,n),r;}return __extends$1(n,e),n.prototype.matches=function(t){return this.keys.some(function(e){return e.isEqual(t.key);});},n;}(Mn),Cn=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this,t,"not-in"/* NOT_IN */,n)||this).keys=Fn("not-in"/* NOT_IN */,n),r;}return __extends$1(n,e),n.prototype.matches=function(t){return !this.keys.some(function(e){return e.isEqual(t.key);});},n;}(Mn);/** Filter that matches on key fields within an array. */function Fn(t,e){var n;return ((null===(n=e.arrayValue)||void 0===n?void 0:n.values)||[]).map(function(t){return W$1.q(t.referenceValue);});}/** A Filter that implements the array-contains operator. */var qn=/** @class */function(e){function n(t,n){return e.call(this,t,"array-contains"/* ARRAY_CONTAINS */,n)||this;}return __extends$1(n,e),n.prototype.matches=function(t){var e=t.field(this.field);return Jt(e)&&zt(e.arrayValue,this.value);},n;}(Mn),jn=/** @class */function(e){function n(t,n){return e.call(this,t,"in"/* IN */,n)||this;}return __extends$1(n,e),n.prototype.matches=function(t){var e=t.field(this.field);return null!==e&&zt(this.value.arrayValue,e);},n;}(Mn),Bn=/** @class */function(e){function n(t,n){return e.call(this,t,"not-in"/* NOT_IN */,n)||this;}return __extends$1(n,e),n.prototype.matches=function(t){var e=t.field(this.field);return null!==e&&!zt(this.value.arrayValue,e);},n;}(Mn),zn=/** @class */function(e){function n(t,n){return e.call(this,t,"array-contains-any"/* ARRAY_CONTAINS_ANY */,n)||this;}return __extends$1(n,e),n.prototype.matches=function(t){var e=this,n=t.field(this.field);return !(!Jt(n)||!n.arrayValue.values)&&n.arrayValue.values.some(function(t){return zt(e.value.arrayValue,t);});},n;}(Mn),Gn=function Gn(t,e){this.position=t,this.before=e;};/** A Filter that implements the IN operator. */function Qn(t){// TODO(b/29183165): Make this collision robust.
  return (t.before?"b":"a")+":"+t.position.map(function(t){return Ht(t);}).join(",");}/**
   * Returns true if a document sorts before a bound using the provided sort
   * order.
   */function Hn(t,e,n){for(var r=0,i=0;i<t.position.length;i++){var o=e[i],s=t.position[i];if(r=o.field.$()?W$1.P(W$1.q(s.referenceValue),n.key):Gt(s,n.field(o.field)),"desc"/* DESCENDING */===o.dir&&(r*=-1),0!==r)break;}return t.before?r<=0:r<0;}function Kn(t,e){if(null===t)return null===e;if(null===e)return !1;if(t.before!==e.before||t.position.length!==e.position.length)return !1;for(var n=0;n<t.position.length;n++){if(!Bt(t.position[n],e.position[n]))return !1;}return !0;}/**
   * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
   */var Wn=function Wn(t,e/* ASCENDING */){void 0===e&&(e="asc"),this.field=t,this.dir=e;};function $n(t,e,n){var r=t.field.$()?W$1.P(e.key,n.key):function(t,e,n){var r=e.field(t),i=n.field(t);return null!==r&&null!==i?Gt(r,i):_();}(t.field,e,n);switch(t.dir){case"asc"/* ASCENDING */:return r;case"desc"/* DESCENDING */:return -1*r;default:return _();}}function Yn(t,e){return t.dir===e.dir&&t.field.isEqual(e.field);}/**
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
   */var Xn=/** @class */function(){/**
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
       */;}return t.prototype.Tn=function(t,e,n){for(var r=n.mn,i=0;i<this.mutations.length;i++){var o=this.mutations[i];o.key.isEqual(t)&&(e=Ze(o,e,r[i]));}return e;},/**
       * Computes the local view of a document given all the mutations in this
       * batch.
       *
       * @param docKey The key of the document to apply mutations to.
       * @param maybeDoc The document to apply mutations to.
       */t.prototype.En=function(t,e){// First, apply the base state. This allows us to apply non-idempotent
  // transform against a consistent set of values.
  for(var n=0,r=this.baseMutations;n<r.length;n++){var i=r[n];i.key.isEqual(t)&&(e=tn(i,e,e,this.wn));}// Second, apply all user-provided mutations.
  for(var o=e,s=0,u=this.mutations;s<u.length;s++){var a=u[s];a.key.isEqual(t)&&(e=tn(a,e,o,this.wn));}return e;},/**
       * Computes the local view for all provided documents given the mutations in
       * this batch.
       */t.prototype.In=function(t){var e=this,n=t;// TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
  // directly (as done in `applyToLocalView()`), we can reduce the complexity
  // to O(n).
  return this.mutations.forEach(function(r){var i=e.En(r.key,t.get(r.key));i&&(n=n.nt(r.key,i));}),n;},t.prototype.keys=function(){return this.mutations.reduce(function(t,e){return t.add(e.key);},Tt());},t.prototype.isEqual=function(t){return this.batchId===t.batchId&&P$1(this.mutations,t.mutations,function(t,e){return nn(t,e);})&&P$1(this.baseMutations,t.baseMutations,function(t,e){return nn(t,e);});},t;}(),Jn=/** @class */function(){function t(t,e,n,/**
       * A pre-computed mapping from each mutated document to the resulting
       * version.
       */r){this.batch=t,this.An=e,this.mn=n,this.Rn=r/**
       * Creates a new MutationBatchResult for the given batch and results. There
       * must be one result for each mutation in the batch. This static factory
       * caches a document=>version mapping (docVersions).
       */;}return t.from=function(e,n,r){S$1(e.mutations.length===r.length);for(var i=It(),o=e.mutations,s=0;s<o.length;s++){i=i.nt(o[s].key,r[s].version);}return new t(e,n,r,i);},t;}(),Zn=/** @class */function(){function t(t){var e=this;// NOTE: next/catchCallback will always point to our own wrapper functions,
  // not the user's raw next() or catch() callbacks.
  this.Pn=null,this.gn=null,// When the operation resolves, we'll set result or error and mark isDone.
  this.result=void 0,this.error=void 0,this.Vn=!1,// Set to true when .then() or .catch() are called and prevents additional
  // chaining.
  this.yn=!1,t(function(t){e.Vn=!0,e.result=t,e.Pn&&// value should be defined unless T is Void, but we can't express
  // that in the type system.
  e.Pn(t);},function(t){e.Vn=!0,e.error=t,e.gn&&e.gn(t);});}return t.prototype.catch=function(t){return this.next(void 0,t);},t.prototype.next=function(e,n){var r=this;return this.yn&&_(),this.yn=!0,this.Vn?this.error?this.pn(n,this.error):this.bn(e,this.result):new t(function(t,i){r.Pn=function(n){r.bn(e,n).next(t,i);},r.gn=function(e){r.pn(n,e).next(t,i);};});},t.prototype.vn=function(){var t=this;return new Promise(function(e,n){t.next(e,n);});},t.prototype.Sn=function(e){try{var n=e();return n instanceof t?n:t.resolve(n);}catch(e){return t.reject(e);}},t.prototype.bn=function(e,n){return e?this.Sn(function(){return e(n);}):t.resolve(n);},t.prototype.pn=function(e,n){return e?this.Sn(function(){return e(n);}):t.reject(n);},t.resolve=function(e){return new t(function(t,n){t(e);});},t.reject=function(e){return new t(function(t,n){n(e);});},t.Dn=function(// Accept all Promise types in waitFor().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e){return new t(function(t,n){var r=0,i=0,o=!1;e.forEach(function(e){++r,e.next(function(){++i,o&&i===r&&t();},function(t){return n(t);});}),o=!0,i===r&&t();});},/**
       * Given an array of predicate functions that asynchronously evaluate to a
       * boolean, implements a short-circuiting `or` between the results. Predicates
       * will be evaluated until one of them returns `true`, then stop. The final
       * result will be whether any of them returned `true`.
       */t.Cn=function(e){for(var n=t.resolve(!1),r=function r(e){n=n.next(function(n){return n?t.resolve(n):e();});},i=0,o=e;i<o.length;i++){r(o[i]);}return n;},t.forEach=function(t,e){var n=this,r=[];return t.forEach(function(t,i){r.push(e.call(n,t,i));}),this.Dn(r);},t;}(),tr=/** @class */function(){function t(){// A mapping of document key to the new cache entry that should be written (or null if any
  // existing cache entry should be removed).
  this.Nn=new F$1(function(t){return t.toString();},function(t,e){return t.isEqual(e);}),this.Fn=!1;}return t.prototype.kn=function(t){var e=this.Nn.get(t);return e?e.readTime:z.min();},/**
       * Buffers a `RemoteDocumentCache.addEntry()` call.
       *
       * You can only modify documents that have already been retrieved via
       * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
       */t.prototype.xn=function(t,e){this.Mn(),this.Nn.set(t.key,{On:t,readTime:e});},/**
       * Buffers a `RemoteDocumentCache.removeEntry()` call.
       *
       * You can only remove documents that have already been retrieved via
       * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
       */t.prototype.$n=function(t,e){void 0===e&&(e=null),this.Mn(),this.Nn.set(t,{On:null,readTime:e});},/**
       * Looks up an entry in the cache. The buffered changes will first be checked,
       * and if no buffered change applies, this will forward to
       * `RemoteDocumentCache.getEntry()`.
       *
       * @param transaction The transaction in which to perform any persistence
       *     operations.
       * @param documentKey The key of the entry to look up.
       * @return The cached Document or NoDocument entry, or null if we have nothing
       * cached.
       */t.prototype.Ln=function(t,e){this.Mn();var n=this.Nn.get(e);return void 0!==n?Zn.resolve(n.On):this.Bn(t,e);},/**
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
       */t.prototype.apply=function(t){return this.Mn(),this.Fn=!0,this.Un(t);},/** Helper to assert this.changes is not null  */t.prototype.Mn=function(){},t;}(),er=function er(){var t=this;this.promise=new Promise(function(e,n){t.resolve=e,t.reject=n;});};/** The result of applying a mutation batch to the backend. */ /**
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
   * How many bytes to read each time when `ReadableStreamReader.read()` is
   * called. Only applicable for byte streams that we control (e.g. those backed
   * by an UInt8Array).
   */ /**
   * Builds a `ByteStreamReader` from a UInt8Array.
   * @param source The data source to use.
   * @param bytesPerRead How many bytes each `read()` from the returned reader
   *        will read.
   */function nr(t,r){void 0===r&&(r=10240);var i=0;return {read:function read(){return __awaiter$2(this,void 0,void 0,function(){var e;return __generator$2(this,function(n){return i<t.byteLength?(e={value:t.slice(i,i+r),done:!1},[2/*return*/,(i+=r,e)]):[2/*return*/,{value:void 0,done:!0}];});});},cancel:function cancel(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){return [2/*return*/];});});},releaseLock:function releaseLock(){}};}/**
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
   * On web, a `ReadableStream` is wrapped around by a `ByteStreamReader`.
   */function rr(t,e){if(t instanceof Uint8Array)return nr(t,e);if(t instanceof ArrayBuffer)return nr(new Uint8Array(t),e);if(t instanceof ReadableStream)return t.getReader();throw new Error("Source of `toByteStreamReader` has to be a ArrayBuffer or ReadableStream");}/**
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
   */function ir(t){return new ie(t,/* useProto3Json= */!0);}/**
   * An instance of the Platform's 'TextEncoder' implementation.
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
   * A complete element in the bundle stream, together with the byte length it
   * occupies in the stream.
   */var or=/** @class */function(){function t(t,// How many bytes this element takes to store in the bundle.
  e){this.payload=t,this.byteLength=e;}return t.prototype.Qn=function(){return "metadata"in this.payload;},t;}(),sr=/** @class */function(){function t(/** The reader to read from underlying binary bundle data source. */t,e){var n=this;this.Wn=t,this.serializer=e,/** Cached bundle metadata. */this.metadata=new er(),/**
               * Internal buffer to hold bundle content, accumulating incomplete element
               * content.
               */this.buffer=new Uint8Array(),this.jn=new TextDecoder("utf-8"),// Read the metadata (which is the first element).
  this.Kn().then(function(t){t&&t.Qn()?n.metadata.resolve(t.payload.metadata):n.metadata.reject(new Error("The first element of the bundle is not a metadata, it is\n             "+JSON.stringify(null==t?void 0:t.payload)));},function(t){return n.metadata.reject(t);});}return t.Gn=function(e,n){return new t(rr(e,10240),n);},t.prototype.close=function(){return this.Wn.cancel();},/**
       * Returns the metadata of the bundle.
       */t.prototype.getMetadata=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){return [2/*return*/,this.metadata.promise];});});},/**
       * Returns the next BundleElement (together with its byte size in the bundle)
       * that has not been read from underlying ReadableStream. Returns null if we
       * have reached the end of the stream.
       */t.prototype.zn=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return [4/*yield*/,this.getMetadata()];case 1:// Makes sure metadata is read before proceeding.
  return [2/*return*/,(t.sent(),this.Kn())];}});});},/**
       * Reads from the head of internal buffer, and pulling more data from
       * underlying stream if a complete element cannot be found, until an
       * element(including the prefixed length and the JSON string) is found.
       *
       * Once a complete element is read, it is dropped from internal buffer.
       *
       * Returns either the bundled element, or null if we have reached the end of
       * the stream.
       */t.prototype.Kn=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e,r,i;return __generator$2(this,function(n){switch(n.label){case 0:return [4/*yield*/,this.Hn()];case 1:return null===(t=n.sent())?[2/*return*/,null]:(e=this.jn.decode(t),r=Number(e),isNaN(r)&&this.Jn("length string ("+e+") is not valid number"),[4/*yield*/,this.Yn(r)]);case 2:return i=n.sent(),[2/*return*/,new or(JSON.parse(i),t.length+r)];}});});},/** First index of '{' from the underlying buffer. */t.prototype.Xn=function(){return this.buffer.findIndex(function(t){return t==="{".charCodeAt(0);});},/**
       * Reads from the beginning of the internal buffer, until the first '{', and
       * return the content.
       *
       * If reached end of the stream, returns a null.
       */t.prototype.Hn=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e;return __generator$2(this,function(n){switch(n.label){case 0:return this.Xn()<0?[4/*yield*/,this.Zn()]:[3/*break*/,3];case 1:if(n.sent())return [3/*break*/,3];n.label=2;case 2:return [3/*break*/,0];case 3:// Broke out of the loop because underlying stream is closed, and there
  // happens to be no more data to process.
  return 0===this.buffer.length?[2/*return*/,null]:(// Broke out of the loop because underlying stream is closed, but still
  // cannot find an open bracket.
  (t=this.Xn())<0&&this.Jn("Reached the end of bundle when a length string is expected."),e=this.buffer.slice(0,t),[2/*return*/,(this.buffer=this.buffer.slice(t),e)]);}});});},/**
       * Reads from a specified position from the internal buffer, for a specified
       * number of bytes, pulling more data from the underlying stream if needed.
       *
       * Returns a string decoded from the read bytes.
       */t.prototype.Yn=function(t){return __awaiter$2(this,void 0,void 0,function(){var e;return __generator$2(this,function(n){switch(n.label){case 0:return this.buffer.length<t?[4/*yield*/,this.Zn()]:[3/*break*/,3];case 1:n.sent()&&this.Jn("Reached the end of bundle when more is expected."),n.label=2;case 2:return [3/*break*/,0];case 3:// Update the internal buffer to drop the read json string.
  return e=this.jn.decode(this.buffer.slice(0,t)),[2/*return*/,(this.buffer=this.buffer.slice(t),e)];}});});},t.prototype.Jn=function(t){// eslint-disable-next-line @typescript-eslint/no-floating-promises
  throw this.Wn.cancel(),new Error("Invalid bundle format: "+t);},/**
       * Pulls more data from underlying stream to internal buffer.
       * Returns a boolean indicating whether the stream is finished.
       */t.prototype.Zn=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e;return __generator$2(this,function(n){switch(n.label){case 0:return [4/*yield*/,this.Wn.read()];case 1:return (t=n.sent()).done||((e=new Uint8Array(this.buffer.length+t.value.length)).set(this.buffer),e.set(t.value,this.buffer.length),this.buffer=e),[2/*return*/,t.done];}});});},t;}(),ur=/** @class */function(){function t(t){this.serializer=t;}return t.prototype.ts=function(t){return ye(this.serializer,t);},/**
       * Converts a BundleDocument to a MaybeDocument.
       */t.prototype.es=function(t){return t.metadata.exists?Ie(this.serializer,t.document,!1):new gn(this.ts(t.metadata.name),this.ns(t.metadata.readTime));},t.prototype.ns=function(t){return fe(t);},t;}();/**
   * When applicable, how many bytes to read from the underlying data source
   * each time.
   *
   * Not applicable for ReadableStreams.
   */ /**
   * A class representing a bundle.
   *
   * Takes a bundle stream or buffer, and presents abstractions to read bundled
   * elements out of the underlying content.
   */ /**
   * Returns a `LoadBundleTaskProgress` representing the initial progress of
   * loading a bundle.
   */function ar(t){return {taskState:"Running",documentsLoaded:0,bytesLoaded:0,totalDocuments:t.totalDocuments,totalBytes:t.totalBytes};}/**
   * Returns a `LoadBundleTaskProgress` representing the progress that the loading
   * has succeeded.
   */var cr=function cr(t,e){this.progress=t,this.ss=e;},hr=/** @class */function(){function t(t,e,n){this.rs=t,this.os=e,this.serializer=n,/** Batched queries to be saved into storage */this.queries=[],/** Batched documents to be saved into storage */this.documents=[],this.progress=ar(t)/**
       * Adds an element from the bundle to the loader.
       *
       * Returns a new progress if adding the element leads to a new progress,
       * otherwise returns null.
       */;}return t.prototype.hs=function(t){this.progress.bytesLoaded+=t.byteLength;var e=this.progress.documentsLoaded;return console.log("pushing "+JSON.stringify(t.payload)),console.log(""+t.payload.documentMetadata),t.payload.namedQuery?(console.log("pushing named query"),this.queries.push(t.payload.namedQuery)):t.payload.documentMetadata?(console.log("pushing documentMetadata"),this.documents.push({metadata:t.payload.documentMetadata}),console.log("this.documents is "+JSON.stringify(this.documents)),t.payload.documentMetadata.exists||++e):t.payload.document&&(console.log("pushing document"),console.log("this.documents is "+JSON.stringify(this.documents)),this.documents[this.documents.length-1].document=t.payload.document,++e),e!==this.progress.documentsLoaded?(this.progress.documentsLoaded=e,Object.assign({},this.progress)):null;},t.prototype.as=function(t){for(var e=new Map(),n=new ur(this.serializer),r=0,i=t;r<i.length;r++){var o=i[r];if(o.metadata.queries)for(var s=n.ts(o.metadata.name),u=0,a=o.metadata.queries;u<a.length;u++){var c=a[u],h=(e.get(c)||Tt()).add(s);e.set(c,h);}}return e;},/**
       * Update the progress to 'Success' and return the updated progress.
       */t.prototype.complete=function(){return __awaiter$2(this,void 0,void 0,function(){var t,r,i,o,s;return __generator$2(this,function(u){switch(u.label){case 0:return console.log("Applying bundled doc"),[4/*yield*/,/**
                       * Applies the documents from a bundle to the "ground-state" (remote)
                       * documents.
                       *
                       * LocalDocuments are re-calculated if there are remaining mutations in the
                       * queue.
                       */function(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var e,o,s,u,a,c,h,f,l,p,d;return __generator$2(this,function(n){switch(n.label){case 0:for(e=D$1(t),o=new ur(e.serializer),s=Tt(),u=vt(),a=It(),c=0,h=r;c<h.length;c++){f=h[c],l=o.ts(f.metadata.name),f.document&&(s=s.add(l)),u=u.nt(l,o.es(f)),a=a.nt(l,o.ns(f.metadata.readTime));}return p=e.cs.us({ls:!0}),[4/*yield*/,eo(e,/**
                                           * Creates a new target using the given bundle name, which will be used to
                                           * hold the keys of all documents from the bundle in query-document mappings.
                                           * This ensures that the loaded documents do not get garbage collected
                                           * right away.
                                           */function(t){// It is OK that the path used for the query is not valid, because this will
  // not be read and queried.
  return _n(Tn(Q$1.k("__bundle__/docs/"+t)));}(i))];case 1:// Allocates a target to hold all document keys from the bundle, such that
  // they will not get garbage collected right away.
  return d=n.sent(),[2/*return*/,e.persistence.runTransaction("Apply bundle documents","readwrite",function(t){return Zi(t,p,u,z.min(),a).next(function(e){return p.apply(t),e;}).next(function(n){return e.fs._s(t,d.targetId).next(function(){return e.fs.ds(t,s,d.targetId);}).next(function(){return e.Ts.ws(t,n);});});})];}});});}(this.os,this.documents,this.rs.id)];case 1:t=u.sent(),console.log("Finished applying bundled doc"),r=this.as(this.documents),i=0,o=this.queries,u.label=2;case 2:return i<o.length?(s=o[i],console.log("Saving named query "+s.name),[4/*yield*/,uo(this.os,s,r.get(s.name))]):[3/*break*/,5];case 3:u.sent(),u.label=4;case 4:return i++,[3/*break*/,2];case 5:return [2/*return*/,(this.progress.taskState="Success",new cr(Object.assign({},this.progress),t))];}});});},t;}(),fr="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.",lr=/** @class */function(){function t(){this.ms=[];}return t.prototype.Es=function(t){this.ms.push(t);},t.prototype.Is=function(){this.ms.forEach(function(t){return t();});},t;}(),pr=/** @class */function(){function t(t,e,n){this.As=t,this.Rs=e,this.Ps=n/**
       * Get the local view of the document identified by `key`.
       *
       * @return Local view of the document or null if we don't have any cached
       * state for it.
       */;}return t.prototype.gs=function(t,e){var n=this;return this.Rs.Vs(t,e).next(function(r){return n.ys(t,e,r);});},/** Internal version of `getDocument` that allows reusing batches. */t.prototype.ys=function(t,e,n){return this.As.Ln(t,e).next(function(t){for(var r=0,i=n;r<i.length;r++){t=i[r].En(e,t);}return t;});},// Returns the view of the given `docs` as they would appear after applying
  // all mutations in the given `batches`.
  t.prototype.ps=function(t,e,n){var r=mt();return e.forEach(function(t,e){for(var i=0,o=n;i<o.length;i++){e=o[i].En(t,e);}r=r.nt(t,e);}),r;},/**
       * Gets the local view of the documents identified by `keys`.
       *
       * If we don't have cached state for a document in `keys`, a NoDocument will
       * be stored for that key in the resulting set.
       */t.prototype.bs=function(t,e){var n=this;return this.As.getEntries(t,e).next(function(e){return n.ws(t,e);});},/**
       * Similar to `getDocuments`, but creates the local view from the given
       * `baseDocs` without retrieving documents from the local store.
       */t.prototype.ws=function(t,e){var n=this;return this.Rs.vs(t,e).next(function(r){var i=n.ps(t,e,r),o=vt();return i.forEach(function(t,e){// TODO(http://b/32275378): Don't conflate missing / deleted.
  e||(e=new gn(t,z.min())),o=o.nt(t,e);}),o;});},/**
       * Performs a query against the local view of all documents.
       *
       * @param transaction The persistence transaction.
       * @param query The query to match documents against.
       * @param sinceReadTime If not set to SnapshotVersion.min(), return only
       *     documents that have been read since this snapshot version (exclusive).
       */t.prototype.Ss=function(t,e,n){/**
   * Returns whether the query matches a single document by path (rather than a
   * collection).
   */return function(t){return W$1.W(t.path)&&null===t.collectionGroup&&0===t.filters.length;}(e)?this.Ds(t,e.path):Nn(e)?this.Cs(t,e,n):this.Ns(t,e,n);},t.prototype.Ds=function(t,e){// Just do a simple document lookup.
  return this.gs(t,new W$1(e)).next(function(t){var e=wt();return t instanceof mn&&(e=e.nt(t.key,t)),e;});},t.prototype.Cs=function(t,e,n){var r=this,i=e.collectionGroup,o=wt();return this.Ps.Fs(t,i).next(function(s){return Zn.forEach(s,function(s){var u=e.rn(s.child(i));return r.Ns(t,u,n).next(function(t){t.forEach(function(t,e){o=o.nt(t,e);});});}).next(function(){return o;});});},t.prototype.Ns=function(t,e,n){var r,i,o=this;// Query the remote documents and overlay mutations.
  return this.As.Ss(t,e,n).next(function(n){return r=n,o.Rs.ks(t,e);}).next(function(e){return i=e,o.xs(t,i,r).next(function(t){r=t;for(var e=0,n=i;e<n.length;e++){for(var o=n[e],s=0,u=o.mutations;s<u.length;s++){var a=u[s],c=a.key,h=r.get(c),f=tn(a,h,h,o.wn);r=f instanceof mn?r.nt(c,f):r.remove(c);}}});}).next(function(){// Finally, filter out any documents that don't actually match
  // the query.
  return r.forEach(function(t,n){Ln(e,n)||(r=r.remove(t));}),r;});},t.prototype.xs=function(t,e,n){for(var r=Tt(),i=0,o=e;i<o.length;i++){for(var s=0,u=o[i].mutations;s<u.length;s++){var a=u[s];a instanceof sn&&null===n.get(a.key)&&(r=r.add(a.key));}}var c=n;return this.As.getEntries(t,r).next(function(t){return t.forEach(function(t,e){null!==e&&e instanceof mn&&(c=c.nt(t,e));}),c;});},t;}(),dr=/** @class */function(){function t(t,e,n,r){this.targetId=t,this.fromCache=e,this.Ms=n,this.Os=r;}return t.$s=function(e,n){for(var r=Tt(),i=Tt(),o=0,s=n.docChanges;o<s.length;o++){var u=s[o];switch(u.type){case 0/* Added */:r=r.add(u.doc.key);break;case 1/* Removed */:i=i.add(u.doc.key);// do nothing
  }}return new t(e,n.fromCache,r,i);},t;}(),yr=/** @class */function(){function t(t,e){var n=this;this.previousValue=t,e&&(e.Ls=function(t){return n.Bs(t);},this.qs=function(t){return e.Us(t);});}return t.prototype.Bs=function(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue;},t.prototype.next=function(){var t=++this.previousValue;return this.qs&&this.qs(t),t;},t;}();/**
   * A class to process the elements from a bundle, load them into local
   * storage and provide progress update while loading.
   */yr.Qs=-1;/**
   * A helper for running delayed tasks following an exponential backoff curve
   * between attempts.
   *
   * Each delay is made up of a "base" delay which follows the exponential
   * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
   * base delay. This prevents clients from accidentally synchronizing their
   * delays causing spikes of load to the backend.
   */var vr=/** @class */function(){function t(/**
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
       */,i){void 0===n&&(n=1e3),void 0===r&&(r=1.5),void 0===i&&(i=6e4),this.Ws=t,this.js=e,this.Ks=n,this.Gs=r,this.zs=i,this.Hs=0,this.Js=null,/** The last backoff attempt, as epoch milliseconds. */this.Ys=Date.now(),this.reset();}/**
       * Resets the backoff delay.
       *
       * The very next backoffAndWait() will have no delay. If it is called again
       * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
       * subsequent ones will increase according to the backoffFactor.
       */return t.prototype.reset=function(){this.Hs=0;},/**
       * Resets the backoff delay to the maximum delay (e.g. for use after a
       * RESOURCE_EXHAUSTED error).
       */t.prototype.Xs=function(){this.Hs=this.zs;},/**
       * Returns a promise that resolves after currentDelayMs, and increases the
       * delay for any subsequent attempts. If there was a pending backoff operation
       * already, it will be canceled.
       */t.prototype.Zs=function(t){var e=this;// Cancel any pending backoff operation.
  this.cancel();// First schedule using the current base (which may be 0 and should be
  // honored as such).
  var n=Math.floor(this.Hs+this.ti()),r=Math.max(0,Date.now()-this.Ys),i=Math.max(0,n-r);// Guard against lastAttemptTime being in the future due to a clock change.
  i>0&&E$1("ExponentialBackoff","Backing off for "+i+" ms (base delay: "+this.Hs+" ms, delay with jitter: "+n+" ms, last attempt: "+r+" ms ago)"),this.Js=this.Ws.ei(this.js,i,function(){return e.Ys=Date.now(),t();}),// Apply backoff factor to determine next delay and ensure it is within
  // bounds.
  this.Hs*=this.Gs,this.Hs<this.Ks&&(this.Hs=this.Ks),this.Hs>this.zs&&(this.Hs=this.zs);},t.prototype.ni=function(){null!==this.Js&&(this.Js.si(),this.Js=null);},t.prototype.cancel=function(){null!==this.Js&&(this.Js.cancel(),this.Js=null);},/** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */t.prototype.ti=function(){return (Math.random()-.5)*this.Hs;},t;}(),mr=/** @class */function(){/*
       * Creates a new SimpleDb wrapper for IndexedDb database `name`.
       *
       * Note that `version` must not be a downgrade. IndexedDB does not support
       * downgrading the schema version. We currently do not support any way to do
       * versioning outside of IndexedDB's versioning mechanism, as only
       * version-upgrade transactions are allowed to do things like create
       * objectstores.
       */function t(e,n,r){this.name=e,this.version=n,this.ii=r,// NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
  // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
  // whatever reason it's much harder to hit after 12.2 so we only proactively
  // log on 12.2.
  12.2===t.ri(getUA())&&T$1("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");}/** Deletes the specified database. */return t.delete=function(t){return E$1("SimpleDb","Removing database:",t),Tr(window.indexedDB.deleteDatabase(t)).vn();},/** Returns true if IndexedDB is available in the current environment. */t.oi=function(){if("undefined"==typeof indexedDB)return !1;if(t.hi())return !0;// We extensively use indexed array values and compound keys,
  // which IE and Edge do not support. However, they still have indexedDB
  // defined on the window, so we need to check for them here and make sure
  // to return that persistence is not enabled for those browsers.
  // For tracking support of this feature, see here:
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
  // Check the UA string to find out the browser.
  var e=getUA(),n=t.ri(e),r=0<n&&n<10,i=t.ai(e),o=0<i&&i<4.5;// IE 10
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
       */t.hi=function(){var t;return "undefined"!=typeof process&&"YES"===(null===(t=process.env)||void 0===t?void 0:t.ui);},/** Helper to get a typed SimpleDbStore from a transaction. */t.ci=function(t,e){return t.store(e);},// visible for testing
  /** Parse User Agent to determine iOS version. Returns -1 if not found. */t.ri=function(t){var e=t.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=e?e[1].split("_").slice(0,2).join("."):"-1";return Number(n);},// visible for testing
  /** Parse User Agent to determine Android version. Returns -1 if not found. */t.ai=function(t){var e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n);},/**
       * Opens the specified database, creating or upgrading it if necessary.
       */t.prototype.li=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e=this;return __generator$2(this,function(n){switch(n.label){case 0:return this.db?[3/*break*/,2]:(E$1("SimpleDb","Opening database:",this.name),t=this,[4/*yield*/,new Promise(function(t,n){// TODO(mikelehen): Investigate browser compatibility.
  // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  // suggests IE9 and older WebKit browsers handle upgrade
  // differently. They expect setVersion, as described here:
  // https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeRequest/setVersion
  var r=indexedDB.open(e.name,e.version);r.onsuccess=function(e){var n=e.target.result;t(n);},r.onblocked=function(){n(new wr("Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));},r.onerror=function(t){var e=t.target.error;"VersionError"===e.name?n(new j(q$1.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):n(new wr(e));},r.onupgradeneeded=function(t){E$1("SimpleDb",'Database "'+e.name+'" requires upgrade from version:',t.oldVersion);var n=t.target.result;e.ii.createOrUpgrade(n,r.transaction,t.oldVersion,e.version).next(function(){E$1("SimpleDb","Database upgrade to version "+e.version+" complete");});};})]);case 1:t.db=n.sent(),n.label=2;case 2:return [2/*return*/,(this._i&&(this.db.onversionchange=function(t){return e._i(t);}),this.db)];}});});},t.prototype.fi=function(t){this._i=t,this.db&&(this.db.onversionchange=function(e){return t(e);});},t.prototype.runTransaction=function(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var e,o,s,u,a;return __generator$2(this,function(c){switch(c.label){case 0:e="readonly"===t,o=0,s=function s(){var t,s,a,c,h;return __generator$2(this,function(n){switch(n.label){case 0:++o,n.label=1;case 1:return n.trys.push([1,4,,5]),[4/*yield*/,u.li()];case 2:// Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
  // fire), but still return the original transactionFnResult back to the
  // caller.
  return u.db=n.sent(),t=Ir.open(u.db,e?"readonly":"readwrite",r),s=i(t).catch(function(e){// Abort the transaction if there was an error.
  return t.abort(e),Zn.reject(e);}).vn(),a={},s.catch(function(){}),[4/*yield*/,t.di];case 3:return [2/*return*/,(a.value=(// Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
  // fire), but still return the original transactionFnResult back to the
  // caller.
  n.sent(),s),a)];case 4:return c=n.sent(),h="FirebaseError"!==c.name&&o<3,E$1("SimpleDb","Transaction failed with error: %s. Retrying: %s.",c.message,h),u.close(),h?[3/*break*/,5]:[2/*return*/,{value:Promise.reject(c)}];case 5:return [2/*return*/];}});},u=this,c.label=1;case 1:return [5/*yield**/,s()];case 2:if("object"==_typeof(a=c.sent()))return [2/*return*/,a.value];c.label=3;case 3:return [3/*break*/,1];case 4:return [2/*return*/];}});});},t.prototype.close=function(){this.db&&this.db.close(),this.db=void 0;},t;}(),gr=/** @class */function(){function t(t){this.wi=t,this.Ti=!1,this.mi=null;}return Object.defineProperty(t.prototype,"Vn",{get:function get(){return this.Ti;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"Ei",{get:function get(){return this.mi;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"cursor",{set:function set(t){this.wi=t;},enumerable:!1,configurable:!0}),/**
       * This function can be called to stop iteration at any point.
       */t.prototype.done=function(){this.Ti=!0;},/**
       * This function can be called to skip to that next key, which could be
       * an index or a primary key.
       */t.prototype.Ii=function(t){this.mi=t;},/**
       * Delete the current cursor value from the object store.
       *
       * NOTE: You CANNOT do this with a keysOnly query.
       */t.prototype.delete=function(){return Tr(this.wi.delete());},t;}(),wr=/** @class */function(e){function n(t){var n=this;return (n=e.call(this,q$1.UNAVAILABLE,"IndexedDB transaction failed: "+t)||this).name="IndexedDbTransactionError",n;}return __extends$1(n,e),n;}(j);/**
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
   */ // References to `window` are guarded by SimpleDb.isAvailable()
  /* eslint-disable no-restricted-globals */ /**
   * Provides a wrapper around IndexedDb with a simplified interface that uses
   * Promise-like return values to chain operations. Real promises cannot be used
   * since .then() continuations are executed asynchronously (e.g. via
   * .setImmediate), which would cause IndexedDB to end the transaction.
   * See PersistencePromise for more details.
   */ /** Verifies whether `e` is an IndexedDbTransactionError. */function br(t){// Use name equality, as instanceof checks on errors don't work with errors
  // that wrap other errors.
  return "IndexedDbTransactionError"===t.name;}/**
   * Wraps an IDBTransaction and exposes a store() method to get a handle to a
   * specific object store.
   */var Ir=/** @class */function(){function t(t){var e=this;this.transaction=t,this.aborted=!1,/**
               * A promise that resolves with the result of the IndexedDb transaction.
               */this.Ai=new er(),this.transaction.oncomplete=function(){e.Ai.resolve();},this.transaction.onabort=function(){t.error?e.Ai.reject(new wr(t.error)):e.Ai.resolve();},this.transaction.onerror=function(t){var n=Ar(t.target.error);e.Ai.reject(new wr(n));};}return t.open=function(e,n,r){try{return new t(e.transaction(r,n));}catch(e){throw new wr(e);}},Object.defineProperty(t.prototype,"di",{get:function get(){return this.Ai.promise;},enumerable:!1,configurable:!0}),t.prototype.abort=function(t){t&&this.Ai.reject(t),this.aborted||(E$1("SimpleDb","Aborting transaction:",t?t.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort());},/**
       * Returns a SimpleDbStore<KeyType, ValueType> for the specified store. All
       * operations performed on the SimpleDbStore happen within the context of this
       * transaction and it cannot be used anymore once the transaction is
       * completed.
       *
       * Note that we can't actually enforce that the KeyType and ValueType are
       * correct, but they allow type safety through the rest of the consuming code.
       */t.prototype.store=function(t){var e=this.transaction.objectStore(t);return new Er(e);},t;}(),Er=/** @class */function(){function t(t){this.store=t;}return t.prototype.put=function(t,e){var n;return void 0!==e?(E$1("SimpleDb","PUT",this.store.name,t,e),n=this.store.put(e,t)):(E$1("SimpleDb","PUT",this.store.name,"<auto-key>",t),n=this.store.put(t)),Tr(n);},/**
       * Adds a new value into an Object Store and returns the new key. Similar to
       * IndexedDb's `add()`, this method will fail on primary key collisions.
       *
       * @param value The object to write.
       * @return The key of the value to add.
       */t.prototype.add=function(t){return E$1("SimpleDb","ADD",this.store.name,t,t),Tr(this.store.add(t));},/**
       * Gets the object with the specified key from the specified store, or null
       * if no object exists with the specified key.
       *
       * @key The key of the object to get.
       * @return The object with the specified key or null if no object exists.
       */t.prototype.get=function(t){var e=this;// We're doing an unsafe cast to ValueType.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Tr(this.store.get(t)).next(function(n){// Normalize nonexistence to null.
  return void 0===n&&(n=null),E$1("SimpleDb","GET",e.store.name,t,n),n;});},t.prototype.delete=function(t){return E$1("SimpleDb","DELETE",this.store.name,t),Tr(this.store.delete(t));},/**
       * If we ever need more of the count variants, we can add overloads. For now,
       * all we need is to count everything in a store.
       *
       * Returns the number of rows in the store.
       */t.prototype.count=function(){return E$1("SimpleDb","COUNT",this.store.name),Tr(this.store.count());},t.prototype.Ri=function(t,e){var n=this.cursor(this.options(t,e)),r=[];return this.Pi(n,function(t,e){r.push(e);}).next(function(){return r;});},t.prototype.gi=function(t,e){E$1("SimpleDb","DELETE ALL",this.store.name);var n=this.options(t,e);n.Vi=!1;var r=this.cursor(n);return this.Pi(r,function(t,e,n){return n.delete();});},t.prototype.yi=function(t,e){var n;e?n=t:(n={},e=t);var r=this.cursor(n);return this.Pi(r,e);},/**
       * Iterates over a store, but waits for the given callback to complete for
       * each entry before iterating the next entry. This allows the callback to do
       * asynchronous work to determine if this iteration should continue.
       *
       * The provided callback should return `true` to continue iteration, and
       * `false` otherwise.
       */t.prototype.pi=function(t){var e=this.cursor({});return new Zn(function(n,r){e.onerror=function(t){var e=Ar(t.target.error);r(e);},e.onsuccess=function(e){var r=e.target.result;r?t(r.primaryKey,r.value).next(function(t){t?r.continue():n();}):n();};});},t.prototype.Pi=function(t,e){var n=[];return new Zn(function(r,i){t.onerror=function(t){i(t.target.error);},t.onsuccess=function(t){var i=t.target.result;if(i){var o=new gr(i),s=e(i.primaryKey,i.value,o);if(s instanceof Zn){var u=s.catch(function(t){return o.done(),Zn.reject(t);});n.push(u);}o.Vn?r():null===o.Ei?i.continue():i.continue(o.Ei);}else r();};}).next(function(){return Zn.Dn(n);});},t.prototype.options=function(t,e){var n=void 0;return void 0!==t&&("string"==typeof t?n=t:e=t),{index:n,range:e};},t.prototype.cursor=function(t){var e="next";if(t.reverse&&(e="prev"),t.index){var n=this.store.index(t.index);return t.Vi?n.openKeyCursor(t.range,e):n.openCursor(t.range,e);}return this.store.openCursor(t.range,e);},t;}();/**
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
   */function Tr(t){return new Zn(function(e,n){t.onsuccess=function(t){var n=t.target.result;e(n);},t.onerror=function(t){var e=Ar(t.target.error);n(e);};});}// Guard so we only report the error once.
  var Nr=!1;function Ar(t){var e=mr.ri(getUA());if(e>=12.2&&e<13){var n="An internal error was encountered in the Indexed Database server";if(t.message.indexOf(n)>=0){// Wrap error in a more descriptive one.
  var r=new j("internal","IOS_INDEXEDDB_BUG1: IndexedDb has thrown '"+n+"'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");return Nr||(Nr=!0,// Throw a global exception outside of this promise chain, for the user to
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
   */ /** The Platform's 'window' implementation or null if not available. */function _r(){// `window` is not always available, e.g. in ReactNative and WebWorkers.
  // eslint-disable-next-line no-restricted-globals
  return "undefined"!=typeof window?window:null;}/** The Platform's 'document' implementation or null if not available. */function Sr(){// `document` is not always available, e.g. in ReactNative and WebWorkers.
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
   */var Dr=/** @class */function(){function t(t,e,n,r,i){this.bi=t,this.js=e,this.vi=n,this.op=r,this.Si=i,this.Di=new er(),this.then=this.Di.promise.then.bind(this.Di.promise),// It's normal for the deferred promise to be canceled (due to cancellation)
  // and so we attach a dummy catch callback to avoid
  // 'UnhandledPromiseRejectionWarning' log spam.
  this.Di.promise.catch(function(t){})/**
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
       */;}return t.Ci=function(e,n,r,i,o){var s=new t(e,n,Date.now()+r,i,o);return s.start(r),s;},/**
       * Starts the timer. This is called immediately after construction by
       * createAndSchedule().
       */t.prototype.start=function(t){var e=this;this.Ni=setTimeout(function(){return e.Fi();},t);},/**
       * Queues the operation to run immediately (if it hasn't already been run or
       * canceled).
       */t.prototype.si=function(){return this.Fi();},/**
       * Cancels the operation if it hasn't already been executed or canceled. The
       * promise will be rejected.
       *
       * As long as the operation has not yet been run, calling cancel() provides a
       * guarantee that the operation will not be run.
       */t.prototype.cancel=function(t){null!==this.Ni&&(this.clearTimeout(),this.Di.reject(new j(q$1.CANCELLED,"Operation cancelled"+(t?": "+t:""))));},t.prototype.Fi=function(){var t=this;this.bi.ki(function(){return null!==t.Ni?(t.clearTimeout(),t.op().then(function(e){return t.Di.resolve(e);})):Promise.resolve();});},t.prototype.clearTimeout=function(){null!==this.Ni&&(this.Si(this),clearTimeout(this.Ni),this.Ni=null);},t;}(),kr=/** @class */function(){function t(){var t=this;// The last promise in the queue.
  this.xi=Promise.resolve(),// A list of retryable operations. Retryable operations are run in order and
  // retried with backoff.
  this.Mi=[],// Is this AsyncQueue being shut down? Once it is set to true, it will not
  // be changed again.
  this.Oi=!1,// Operations scheduled to be queued in the future. Operations are
  // automatically removed after they are run or canceled.
  this.$i=[],// visible for testing
  this.Li=null,// Flag set while there's an outstanding AsyncQueue operation, used for
  // assertion sanity-checks.
  this.Bi=!1,// List of TimerIds to fast-forward delays for.
  this.qi=[],// Backoff timer used to schedule retries for retryable operations
  this.Ui=new vr(this,"async_queue_retry"/* AsyncQueueRetry */),// Visibility handler that triggers an immediate retry of all retryable
  // operations. Meant to speed up recovery when we regain file system access
  // after page comes into foreground.
  this.Qi=function(){var e=Sr();e&&E$1("AsyncQueue","Visibility state changed to  ",e.visibilityState),t.Ui.ni();};var e=Sr();e&&"function"==typeof e.addEventListener&&e.addEventListener("visibilitychange",this.Qi);}return Object.defineProperty(t.prototype,"Wi",{// Is this AsyncQueue being shut down? If true, this instance will not enqueue
  // any new operations, Promises from enqueue requests will not resolve.
  get:function get(){return this.Oi;},enumerable:!1,configurable:!0}),/**
       * Adds a new operation to the queue without waiting for it to complete (i.e.
       * we ignore the Promise result).
       */t.prototype.ki=function(t){// eslint-disable-next-line @typescript-eslint/no-floating-promises
  this.enqueue(t);},/**
       * Regardless if the queue has initialized shutdown, adds a new operation to the
       * queue without waiting for it to complete (i.e. we ignore the Promise result).
       */t.prototype.ji=function(t){this.Ki(),// eslint-disable-next-line @typescript-eslint/no-floating-promises
  this.Gi(t);},/**
       * Initialize the shutdown of this queue. Once this method is called, the
       * only possible way to request running an operation is through
       * `enqueueEvenWhileRestricted()`.
       */t.prototype.zi=function(){if(!this.Oi){this.Oi=!0;var t=Sr();t&&"function"==typeof t.removeEventListener&&t.removeEventListener("visibilitychange",this.Qi);}},/**
       * Adds a new operation to the queue. Returns a promise that will be resolved
       * when the promise returned by the new operation is (with its value).
       */t.prototype.enqueue=function(t){return this.Ki(),this.Oi?new Promise(function(t){}):this.Gi(t);},/**
       * Enqueue a retryable operation.
       *
       * A retryable operation is rescheduled with backoff if it fails with a
       * IndexedDbTransactionError (the error type used by SimpleDb). All
       * retryable operations are executed in order and only run if all prior
       * operations were retried successfully.
       */t.prototype.Hi=function(t){var e=this;this.Mi.push(t),this.ki(function(){return e.Ji();});},/**
       * Runs the next operation from the retryable queue. If the operation fails,
       * reschedules with backoff.
       */t.prototype.Ji=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e=this;return __generator$2(this,function(n){switch(n.label){case 0:if(0===this.Mi.length)return [3/*break*/,5];n.label=1;case 1:return n.trys.push([1,3,,4]),[4/*yield*/,this.Mi[0]()];case 2:return n.sent(),this.Mi.shift(),this.Ui.reset(),[3/*break*/,4];case 3:if(!br(t=n.sent()))throw t;// Failure will be handled by AsyncQueue
  return E$1("AsyncQueue","Operation failed with retryable error: "+t),[3/*break*/,4];case 4:this.Mi.length>0&&// If there are additional operations, we re-schedule `retryNextOp()`.
  // This is necessary to run retryable operations that failed during
  // their initial attempt since we don't know whether they are already
  // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
  // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
  // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
  // call scheduled here.
  // Since `backoffAndRun()` cancels an existing backoff and schedules a
  // new backoff on every call, there is only ever a single additional
  // operation in the queue.
  this.Ui.Zs(function(){return e.Ji();}),n.label=5;case 5:return [2/*return*/];}});});},t.prototype.Gi=function(t){var e=this,n=this.xi.then(function(){return e.Bi=!0,t().catch(function(t){// Re-throw the error so that this.tail becomes a rejected Promise and
  // all further attempts to chain (via .then) will just short-circuit
  // and return the rejected Promise.
  throw e.Li=t,e.Bi=!1,T$1("INTERNAL UNHANDLED ERROR: ",/**
   * Chrome includes Error.message in Error.stack. Other browsers do not.
   * This returns expected output of message + stack when available.
   * @param error Error or FirestoreError
   */function(t){var e=t.message||"";return t.stack&&(e=t.stack.includes(t.message)?t.stack:t.message+"\n"+t.stack),e;}(t)),t;}).then(function(t){return e.Bi=!1,t;});});return this.xi=n,n;},/**
       * Schedules an operation to be queued on the AsyncQueue once the specified
       * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
       * or fast-forward the operation prior to its running.
       */t.prototype.ei=function(t,e,n){var r=this;this.Ki(),// Fast-forward delays for timerIds that have been overriden.
  this.qi.indexOf(t)>-1&&(e=0);var i=Dr.Ci(this,t,e,n,function(t){return r.Yi(t);});return this.$i.push(i),i;},t.prototype.Ki=function(){this.Li&&_();},/**
       * Verifies there's an operation currently in-progress on the AsyncQueue.
       * Unfortunately we can't verify that the running code is in the promise chain
       * of that operation, so this isn't a foolproof check, but it should be enough
       * to catch some bugs.
       */t.prototype.Xi=function(){},/**
       * Waits until all currently queued tasks are finished executing. Delayed
       * operations are not run.
       */t.prototype.Zi=function(){return __awaiter$2(this,void 0,void 0,function(){var t;return __generator$2(this,function(e){switch(e.label){case 0:return [4/*yield*/,t=this.xi];case 1:e.sent(),e.label=2;case 2:if(t!==this.xi)return [3/*break*/,0];e.label=3;case 3:return [2/*return*/];}});});},/**
       * For Tests: Determine if a delayed operation with a particular TimerId
       * exists.
       */t.prototype.tr=function(t){for(var e=0,n=this.$i;e<n.length;e++){if(n[e].js===t)return !0;}return !1;},/**
       * For Tests: Runs some or all delayed operations early.
       *
       * @param lastTimerId Delayed operations up to and including this TimerId will
       *  be drained. Pass TimerId.All to run all delayed operations.
       * @returns a Promise that resolves once all operations have been run.
       */t.prototype.er=function(t){var e=this;// Note that draining may generate more delayed ops, so we do that first.
  return this.Zi().then(function(){// Run ops in the same order they'd run if they ran naturally.
  e.$i.sort(function(t,e){return t.vi-e.vi;});for(var n=0,r=e.$i;n<r.length;n++){var i=r[n];if(i.si(),"all"/* All */!==t&&i.js===t)break;}return e.Zi();});},/**
       * For Tests: Skip all subsequent delays for a timer id.
       */t.prototype.nr=function(t){this.qi.push(t);},/** Called once a DelayedOperation is run or canceled. */t.prototype.Yi=function(t){// NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
  var e=this.$i.indexOf(t);this.$i.splice(e,1);},t;}();/**
   * Returns a FirestoreError that can be surfaced to the user if the provided
   * error is an IndexedDbTransactionError. Re-throws the error otherwise.
   */function xr(t,e){if(T$1("AsyncQueue",e+": "+t),br(t))return new j(q$1.UNAVAILABLE,e+": "+t);throw t;}function Or(t,e){var n=t[0],r=t[1],i=e[0],o=e[1],s=O$1(n,i);return 0===s?O$1(r,o):s;}/**
   * Used to calculate the nth sequence number. Keeps a rolling buffer of the
   * lowest n values passed to `addElement`, and finally reports the largest of
   * them in `maxValue`.
   */var Pr=/** @class */function(){function t(t){this.sr=t,this.buffer=new pt(Or),this.ir=0;}return t.prototype.rr=function(){return ++this.ir;},t.prototype.or=function(t){var e=[t,this.rr()];if(this.buffer.size<this.sr)this.buffer=this.buffer.add(e);else {var n=this.buffer.last();Or(e,n)<0&&(this.buffer=this.buffer.delete(n).add(e));}},Object.defineProperty(t.prototype,"maxValue",{get:function get(){// Guaranteed to be non-empty. If we decide we are not collecting any
  // sequence numbers, nthSequenceNumber below short-circuits. If we have
  // decided that we are collecting n sequence numbers, it's because n is some
  // percentage of the existing sequence numbers. That means we should never
  // be in a situation where we are collecting sequence numbers but don't
  // actually have any.
  return this.buffer.last()[0];},enumerable:!1,configurable:!0}),t;}(),Lr={hr:!1,ar:0,ur:0,cr:0},Rr=/** @class */function(){function t(// When we attempt to collect, we will only do so if the cache size is greater than this
  // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
  t,// The percentage of sequence numbers that we will attempt to collect
  e,// A cap on the total number of sequence numbers that will be collected. This prevents
  // us from collecting a huge number of sequence numbers if the cache has grown very large.
  n){this.lr=t,this._r=e,this.dr=n;}return t.wr=function(e){return new t(e,t.Tr,t.mr);},t;}();Rr.Er=-1,Rr.Ir=1048576,Rr.Ar=41943040,Rr.Tr=10,Rr.mr=1e3,Rr.Rr=new Rr(Rr.Ar,Rr.Tr,Rr.mr),Rr.Pr=new Rr(Rr.Er,0,0);/**
   * This class is responsible for the scheduling of LRU garbage collection. It handles checking
   * whether or not GC is enabled, as well as which delay to use before the next run.
   */var Mr=/** @class */function(){function t(t,e){this.gr=t,this.bi=e,this.Vr=!1,this.yr=null;}return t.prototype.start=function(t){this.gr.params.lr!==Rr.Er&&this.pr(t);},t.prototype.stop=function(){this.yr&&(this.yr.cancel(),this.yr=null);},Object.defineProperty(t.prototype,"br",{get:function get(){return null!==this.yr;},enumerable:!1,configurable:!0}),t.prototype.pr=function(t){var r=this,i=this.Vr?3e5:6e4;E$1("LruGarbageCollector","Garbage collection scheduled in "+i+"ms"),this.yr=this.bi.ei("lru_garbage_collection"/* LruGarbageCollection */,i,function(){return __awaiter$2(r,void 0,void 0,function(){var e;return __generator$2(this,function(n){switch(n.label){case 0:this.yr=null,this.Vr=!0,n.label=1;case 1:return n.trys.push([1,3,,7]),[4/*yield*/,t.vr(this.gr)];case 2:return n.sent(),[3/*break*/,7];case 3:return br(e=n.sent())?(E$1("LruGarbageCollector","Ignoring IndexedDB error during garbage collection: ",e),[3/*break*/,6]):[3/*break*/,4];case 4:return [4/*yield*/,so(e)];case 5:n.sent(),n.label=6;case 6:return [3/*break*/,7];case 7:return [4/*yield*/,this.pr(t)];case 8:return n.sent(),[2/*return*/];}});});});},t;}(),Vr=/** @class */function(){function t(t,e){this.Sr=t,this.params=e/** Given a percentile of target to collect, returns the number of targets to collect. */;}return t.prototype.Dr=function(t,e){return this.Sr.Cr(t).next(function(t){return Math.floor(e/100*t);});},/** Returns the nth sequence number, counting in order from the smallest. */t.prototype.Nr=function(t,e){var n=this;if(0===e)return Zn.resolve(yr.Qs);var r=new Pr(e);return this.Sr.pe(t,function(t){return r.or(t.sequenceNumber);}).next(function(){return n.Sr.Fr(t,function(t){return r.or(t);});}).next(function(){return r.maxValue;});},/**
       * Removes targets with a sequence number equal to or less than the given upper bound, and removes
       * document associations with those targets.
       */t.prototype.kr=function(t,e,n){return this.Sr.kr(t,e,n);},/**
       * Removes documents that have a sequence number equal to or less than the upper bound and are not
       * otherwise pinned.
       */t.prototype.xr=function(t,e){return this.Sr.xr(t,e);},t.prototype.Mr=function(t,e){var n=this;return this.params.lr===Rr.Er?(E$1("LruGarbageCollector","Garbage collection skipped; disabled"),Zn.resolve(Lr)):this.Or(t).next(function(r){return r<n.params.lr?(E$1("LruGarbageCollector","Garbage collection skipped; Cache size "+r+" is lower than threshold "+n.params.lr),Lr):n.$r(t,e);});},t.prototype.Or=function(t){return this.Sr.Or(t);},t.prototype.$r=function(t,e){var n,r,i,o,u,a,c,h=this,f=Date.now();return this.Dr(t,this.params._r).next(function(e){// Cap at the configured max
  return e>h.params.dr?(E$1("LruGarbageCollector","Capping sequence numbers to collect down to the maximum of "+h.params.dr+" from "+e),r=h.params.dr):r=e,o=Date.now(),h.Nr(t,r);}).next(function(r){return n=r,u=Date.now(),h.kr(t,n,e);}).next(function(e){return i=e,a=Date.now(),h.xr(t,n);}).next(function(t){return c=Date.now(),I$1()<=LogLevel.DEBUG&&E$1("LruGarbageCollector","LRU Garbage Collection\n\tCounted targets in "+(o-f)+"ms\n\tDetermined least recently used "+r+" in "+(u-o)+"ms\n\tRemoved "+i+" targets in "+(a-u)+"ms\n\tRemoved "+t+" documents in "+(c-a)+"ms\nTotal Duration: "+(c-f)+"ms"),Zn.resolve({hr:!0,ar:r,ur:i,cr:t});});},t;}();/** Implements the steps for LRU garbage collection. */ /**
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
   */function Ur(t){for(var e="",n=0;n<t.length;n++){e.length>0&&(e=Fr(e)),e=Cr(t.get(n),e);}return Fr(e);}/** Encodes a single segment of a resource path into the given result */function Cr(t,e){for(var n=e,r=t.length,i=0;i<r;i++){var o=t.charAt(i);switch(o){case"\0":n+="";break;case"":n+="";break;default:n+=o;}}return n;}/** Encodes a path separator into the given result */function Fr(t){return t+"";}/**
   * Decodes the given IndexedDb-compatible string form of a resource path into
   * a ResourcePath instance. Note that this method is not suitable for use with
   * decoding resource names from the server; those are One Platform format
   * strings.
   */function qr(t){// Event the empty path must encode as a path of at least length 2. A path
  // with exactly 2 must be the empty path.
  var e=t.length;if(S$1(e>=2),2===e)return S$1(""===t.charAt(0)&&""===t.charAt(1)),Q$1.M();// Escape characters cannot exist past the second-to-last position in the
  // source value.
  for(var n=e-2,r=[],i="",o=0;o<e;){// The last two characters of a valid encoded path must be a separator, so
  // there must be an end to this segment.
  var s=t.indexOf("",o);switch((s<0||s>n)&&_(),t.charAt(s+1)){case"":var u=t.substring(o,s),a=void 0;0===i.length?// Avoid copying for the common case of a segment that excludes \0
  // and \001
  a=u:(a=i+=u,i=""),r.push(a);break;case"":i+=t.substring(o,s),i+="\0";break;case"":// The escape character can be used in the output to encode itself.
  i+=t.substring(o,s+1);break;default:_();}o=s+2;}return new Q$1(r);}/**
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
   */ /** Serializer for values stored in the LocalStore. */var jr=function jr(t){this.Lr=t;};/** Decodes a remote document from storage locally to a Document. */function Br(t,e){if(e.document)return Ie(t.Lr,e.document,!!e.hasCommittedMutations);if(e.noDocument){var n=W$1.j(e.noDocument.path),r=Kr(e.noDocument.readTime);return new gn(n,r,{hasCommittedMutations:!!e.hasCommittedMutations});}if(e.unknownDocument){var i=W$1.j(e.unknownDocument.path),o=Kr(e.unknownDocument.version);return new wn(i,o);}return _();}/** Encodes a document for storage locally. */function zr(t,e,n){var r=Gr(n),i=e.key.path.p().N();if(e instanceof mn){var o=function(t,e){return {name:de(t,e.key),fields:e.Ze().mapValue.fields,updateTime:ae(t,e.version.A())};}(t.Lr,e),s=e.hasCommittedMutations;return new wi(/* unknownDocument= */null,/* noDocument= */null,o,s,r,i);}if(e instanceof gn){var u=e.key.path.N(),a=Hr(e.version),c=e.hasCommittedMutations;return new wi(/* unknownDocument= */null,new mi(u,a),/* document= */null,c,r,i);}if(e instanceof wn){var h=e.key.path.N(),f=Hr(e.version);return new wi(new gi(h,f),/* noDocument= */null,/* document= */null,/* hasCommittedMutations= */!0,r,i);}return _();}function Gr(t){var e=t.A();return [e.seconds,e.nanoseconds];}function Qr(t){var e=new B(t[0],t[1]);return z.m(e);}function Hr(t){var e=t.A();return new li(e.seconds,e.nanoseconds);}function Kr(t){var e=new B(t.seconds,t.nanoseconds);return z.m(e);}/** Encodes a batch of mutations into a DbMutationBatch for local storage. */ /** Decodes a DbMutationBatch into a MutationBatch */function Wr(t,e){var n=(e.baseMutations||[]).map(function(e){return Te(t.Lr,e);}),r=e.mutations.map(function(e){return Te(t.Lr,e);}),i=B.fromMillis(e.localWriteTimeMs);return new Xn(e.batchId,i,n,r);}/** Decodes a DbTarget into TargetData */function $r(t){var e,n,r=Kr(t.readTime),i=void 0!==t.lastLimboFreeSnapshotVersion?Kr(t.lastLimboFreeSnapshotVersion):z.min();return void 0!==t.query.documents?(S$1(1===(n=t.query).documents.length),e=_n(Tn(me(n.documents[0])))):e=function(t){return _n(_e(t));}(t.query),new st(e,t.targetId,0/* Listen */,t.lastListenSequenceNumber,r,i,rt.fromBase64String(t.resumeToken))/** Encodes TargetData into a DbTarget for storage locally. */;}function Yr(t,e){var n,r=Hr(e.X),i=Hr(e.lastLimboFreeSnapshotVersion);n=nt(e.target)?Ne(t.Lr,e.target):Ae(t.Lr,e.target);// We can't store the resumeToken as a ByteString in IndexedDb, so we
  // convert it to a base64 string for storage.
  var o=e.resumeToken.toBase64();// lastListenSequenceNumber is always 0 until we do real GC.
  return new Ii(e.targetId,tt(e.target),r,o,e.sequenceNumber,i,n);}/**
   * A helper function for figuring out what kind of query has been stored.
   */ /**
   * Encodes a `BundledQuery` from bundle proto to a Query object.
   *
   * This reconstructs the original query used to build the bundle being loaded,
   * including features exists only in SDKs (for example: limit-to-last).
   */function Xr(t){var e=_e({parent:t.parent,structuredQuery:t.structuredQuery});return "LAST"===t.en?Sn(e,e.limit,"L"/* Last */):e;}/** Encodes a NamedQuery proto object to a NamedQuery model object. */ /**
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
   */ /** A mutation queue for a specific user, backed by IndexedDB. */var Jr=/** @class */function(){function t(/**
       * The normalized userId (e.g. null UID => "" userId) used to store /
       * retrieve mutations.
       */t,e,n,r){this.userId=t,this.serializer=e,this.Ps=n,this.Br=r,/**
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
  this.qr={}/**
       * Creates a new mutation queue for the given user.
       * @param user The user for which to create a mutation queue.
       * @param serializer The serializer to use when persisting to IndexedDb.
       */;}return t.Ur=function(e,n,r,i){// TODO(mcg): Figure out what constraints there are on userIDs
  // In particular, are there any reserved characters? are empty ids allowed?
  // For the moment store these together in the same mutations table assuming
  // that empty userIDs aren't allowed.
  return S$1(""!==e.uid),new t(e.Qr()?e.uid:"",n,r,i);},t.prototype.Wr=function(t){var e=!0,n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return ei(t).yi({index:yi.userMutationsIndex,range:n},function(t,n,r){e=!1,r.done();}).next(function(){return e;});},t.prototype.jr=function(t,e,n,r){var i=this,o=ni(t),s=ei(t);// The IndexedDb implementation in Chrome (and Firefox) does not handle
  // compound indices that include auto-generated keys correctly. To ensure
  // that the index entry is added correctly in all browsers, we perform two
  // writes: The first write is used to retrieve the next auto-generated Batch
  // ID, and the second write populates the index and stores the actual
  // mutation batch.
  // See: https://bugs.chromium.org/p/chromium/issues/detail?id=701972
  // We write an empty object to obtain key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return s.add({}).next(function(u){S$1("number"==typeof u);for(var a=new Xn(u,e,n,r),c=function(t,e,n){var r=n.baseMutations.map(function(e){return Ee(t.Lr,e);}),i=n.mutations.map(function(e){return Ee(t.Lr,e);});return new yi(e,n.batchId,n.wn.toMillis(),r,i);}(i.serializer,i.userId,a),h=[],f=new pt(function(t,e){return O$1(t.F(),e.F());}),l=0,p=r;l<p.length;l++){var d=p[l],y=vi.key(i.userId,d.key.path,u);f=f.add(d.key.path.p()),h.push(s.put(c)),h.push(o.put(y,vi.PLACEHOLDER));}return f.forEach(function(e){h.push(i.Ps.Kr(t,e));}),t.Es(function(){i.qr[u]=a.keys();}),Zn.Dn(h).next(function(){return a;});});},t.prototype.Gr=function(t,e){var n=this;return ei(t).get(e).next(function(t){return t?(S$1(t.userId===n.userId),Wr(n.serializer,t)):null;});},/**
       * Returns the document keys for the mutation batch with the given batchId.
       * For primary clients, this method returns `null` after
       * `removeMutationBatches()` has been called. Secondary clients return a
       * cached result until `removeCachedMutationKeys()` is invoked.
       */ // PORTING NOTE: Multi-tab only.
  t.prototype.zr=function(t,e){var n=this;return this.qr[e]?Zn.resolve(this.qr[e]):this.Gr(t,e).next(function(t){if(t){var r=t.keys();return n.qr[e]=r,r;}return null;});},t.prototype.Hr=function(t,e){var n=this,r=e+1,i=IDBKeyRange.lowerBound([this.userId,r]),o=null;return ei(t).yi({index:yi.userMutationsIndex,range:i},function(t,e,i){e.userId===n.userId&&(S$1(e.batchId>=r),o=Wr(n.serializer,e)),i.done();}).next(function(){return o;});},t.prototype.Jr=function(t){var e=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]),n=-1;return ei(t).yi({index:yi.userMutationsIndex,range:e,reverse:!0},function(t,e,r){n=e.batchId,r.done();}).next(function(){return n;});},t.prototype.Yr=function(t){var e=this,n=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return ei(t).Ri(yi.userMutationsIndex,n).next(function(t){return t.map(function(t){return Wr(e.serializer,t);});});},t.prototype.Vs=function(t,e){var n=this,r=vi.prefixForPath(this.userId,e.path),i=IDBKeyRange.lowerBound(r),o=[];// Scan the document-mutation index starting with a prefix starting with
  // the given documentKey.
  return ni(t).yi({range:i},function(r,i,s){var u=r[0],a=r[1],c=r[2],h=qr(a);// Only consider rows matching exactly the specific key of
  // interest. Note that because we order by path first, and we
  // order terminators before path separators, we'll encounter all
  // the index rows for documentKey contiguously. In particular, all
  // the rows for documentKey will occur before any rows for
  // documents nested in a subcollection beneath documentKey so we
  // can stop as soon as we hit any such row.
  if(u===n.userId&&e.path.isEqual(h))// Look up the mutation batch in the store.
  return ei(t).get(c).next(function(t){if(!t)throw _();S$1(t.userId===n.userId),o.push(Wr(n.serializer,t));});s.done();}).next(function(){return o;});},t.prototype.vs=function(t,e){var n=this,r=new pt(O$1),i=[];return e.forEach(function(e){var o=vi.prefixForPath(n.userId,e.path),s=IDBKeyRange.lowerBound(o),u=ni(t).yi({range:s},function(t,i,o){var s=t[0],u=t[1],a=t[2],c=qr(u);// Only consider rows matching exactly the specific key of
  // interest. Note that because we order by path first, and we
  // order terminators before path separators, we'll encounter all
  // the index rows for documentKey contiguously. In particular, all
  // the rows for documentKey will occur before any rows for
  // documents nested in a subcollection beneath documentKey so we
  // can stop as soon as we hit any such row.
  s===n.userId&&e.path.isEqual(c)?r=r.add(a):o.done();});i.push(u);}),Zn.Dn(i).next(function(){return n.Xr(t,r);});},t.prototype.ks=function(t,e){var n=this,r=e.path,i=r.length+1,o=vi.prefixForPath(this.userId,r),s=IDBKeyRange.lowerBound(o),u=new pt(O$1);return ni(t).yi({range:s},function(t,e,o){var s=t[0],a=t[1],c=t[2],h=qr(a);s===n.userId&&r.D(h)?// Rows with document keys more than one segment longer than the
  // query path can't be matches. For example, a query on 'rooms'
  // can't match the document /rooms/abc/messages/xyx.
  // TODO(mcg): we'll need a different scanner when we implement
  // ancestor queries.
  h.length===i&&(u=u.add(c)):o.done();}).next(function(){return n.Xr(t,u);});},t.prototype.Xr=function(t,e){var n=this,r=[],i=[];// TODO(rockwood): Implement this using iterate.
  return e.forEach(function(e){i.push(ei(t).get(e).next(function(t){if(null===t)throw _();S$1(t.userId===n.userId),r.push(Wr(n.serializer,t));}));}),Zn.Dn(i).next(function(){return r;});},t.prototype.Zr=function(t,e){var n=this;return ti(t.to,this.userId,e).next(function(r){return t.Es(function(){n.eo(e.batchId);}),Zn.forEach(r,function(e){return n.Br.no(t,e);});});},/**
       * Clears the cached keys for a mutation batch. This method should be
       * called by secondary clients after they process mutation updates.
       *
       * Note that this method does not have to be called from primary clients as
       * the corresponding cache entries are cleared when an acknowledged or
       * rejected batch is removed from the mutation queue.
       */ // PORTING NOTE: Multi-tab only
  t.prototype.eo=function(t){delete this.qr[t];},t.prototype.so=function(t){var e=this;return this.Wr(t).next(function(n){if(!n)return Zn.resolve();// Verify that there are no entries in the documentMutations index if
  // the queue is empty.
  var r=IDBKeyRange.lowerBound(vi.prefixForUser(e.userId)),i=[];return ni(t).yi({range:r},function(t,n,r){if(t[0]===e.userId){var o=qr(t[1]);i.push(o);}else r.done();}).next(function(){S$1(0===i.length);});});},t.prototype.io=function(t,e){return Zr(t,this.userId,e);},// PORTING NOTE: Multi-tab only (state is held in memory in other clients).
  /** Returns the mutation queue's metadata from IndexedDb. */t.prototype.ro=function(t){var e=this;return ri(t).get(this.userId).next(function(t){return t||new di(e.userId,-1,/*lastStreamToken=*/"");});},t;}();/**
   * @return true if the mutation queue for the given user contains a pending
   *         mutation for the given key.
   */function Zr(t,e,n){var r=vi.prefixForPath(e,n.path),i=r[1],o=IDBKeyRange.lowerBound(r),s=!1;return ni(t).yi({range:o,Vi:!0},function(t,n,r){var o=t[0],u=t[1];t[2];o===e&&u===i&&(s=!0),r.done();}).next(function(){return s;});}/** Returns true if any mutation queue contains the given document. */ /**
   * Delete a mutation batch and the associated document mutations.
   * @return A PersistencePromise of the document mutations that were removed.
   */function ti(t,e,n){var r=t.store(yi.store),i=t.store(vi.store),o=[],s=IDBKeyRange.only(n.batchId),u=0,a=r.yi({range:s},function(t,e,n){return u++,n.delete();});o.push(a.next(function(){S$1(1===u);}));for(var c=[],h=0,f=n.mutations;h<f.length;h++){var l=f[h],p=vi.key(e,l.key.path,n.batchId);o.push(i.delete(p)),c.push(l.key);}return Zn.Dn(o).next(function(){return c;});}/**
   * Helper to get a typed SimpleDbStore for the mutations object store.
   */function ei(t){return Bi.ci(t,yi.store);}/**
   * Helper to get a typed SimpleDbStore for the mutationQueues object store.
   */function ni(t){return Bi.ci(t,vi.store);}/**
   * Helper to get a typed SimpleDbStore for the mutationQueues object store.
   */function ri(t){return Bi.ci(t,di.store);}/**
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
   */var ii=/** @class */function(){/**
       * @param {LocalSerializer} serializer The document serializer.
       * @param {IndexManager} indexManager The query indexes that need to be maintained.
       */function t(t,e){this.serializer=t,this.Ps=e/**
       * Adds the supplied entries to the cache.
       *
       * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
       */;}return t.prototype.xn=function(t,e,n){return si(t).put(ui(e),n);},/**
       * Removes a document from the cache.
       *
       * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
       */t.prototype.$n=function(t,e){var n=si(t),r=ui(e);return n.delete(r);},/**
       * Updates the current cache size.
       *
       * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
       * cache's metadata.
       */t.prototype.updateMetadata=function(t,e){var n=this;return this.getMetadata(t).next(function(r){return r.byteSize+=e,n.oo(t,r);});},t.prototype.Ln=function(t,e){var n=this;return si(t).get(ui(e)).next(function(t){return n.ho(t);});},/**
       * Looks up an entry in the cache.
       *
       * @param documentKey The key of the entry to look up.
       * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
       */t.prototype.ao=function(t,e){var n=this;return si(t).get(ui(e)).next(function(t){var e=n.ho(t);return e?{On:e,size:ai(t)}:null;});},t.prototype.getEntries=function(t,e){var n=this,r=mt();return this.uo(t,e,function(t,e){var i=n.ho(e);r=r.nt(t,i);}).next(function(){return r;});},/**
       * Looks up several entries in the cache.
       *
       * @param documentKeys The set of keys entries to look up.
       * @return A map of MaybeDocuments indexed by key (if a document cannot be
       *     found, the key will be mapped to null) and a map of sizes indexed by
       *     key (zero if the key cannot be found).
       */t.prototype.co=function(t,e){var n=this,r=mt(),i=new ht(W$1.P);return this.uo(t,e,function(t,e){var o=n.ho(e);o?(r=r.nt(t,o),i=i.nt(t,ai(e))):(r=r.nt(t,null),i=i.nt(t,0));}).next(function(){return {lo:r,_o:i};});},t.prototype.uo=function(t,e,n){if(e._())return Zn.resolve();var r=IDBKeyRange.bound(e.first().path.N(),e.last().path.N()),i=e.at(),o=i.dt();return si(t).yi({range:r},function(t,e,r){// Go through keys not found in cache.
  for(var s=W$1.j(t);o&&W$1.P(o,s)<0;){n(o,null),o=i.dt();}o&&o.isEqual(s)&&(// Key found in cache.
  n(o,e),o=i.wt()?i.dt():null),// Skip to the next key (if there is one).
  o?r.Ii(o.path.N()):r.done();}).next(function(){// The rest of the keys are not in the cache. One case where `iterate`
  // above won't go through them is when the cache is empty.
  for(;o;){n(o,null),o=i.wt()?i.dt():null;}});},t.prototype.Ss=function(t,e,n){var r=this,i=wt(),o=e.path.length+1,s={};if(n.isEqual(z.min())){// Documents are ordered by key, so we can use a prefix scan to narrow
  // down the documents we need to match the query against.
  var u=e.path.N();s.range=IDBKeyRange.lowerBound(u);}else {// Execute an index-free query and filter by read time. This is safe
  // since all document changes to queries that have a
  // lastLimboFreeSnapshotVersion (`sinceReadTime`) have a read time set.
  var a=e.path.N(),c=Gr(n);s.range=IDBKeyRange.lowerBound([a,c],/* open= */!0),s.index=wi.collectionReadTimeIndex;}return si(t).yi(s,function(t,n,s){// The query is actually returning any path that starts with the query
  // path prefix which may include documents in subcollections. For
  // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
  // shouldn't match it. Fix this by discarding rows with document keys
  // more than one segment longer than the query path.
  if(t.length===o){var u=Br(r.serializer,n);e.path.D(u.key.path)?u instanceof mn&&Ln(e,u)&&(i=i.nt(u.key,u)):s.done();}}).next(function(){return i;});},/**
       * Returns the set of documents that have changed since the specified read
       * time.
       */ // PORTING NOTE: This is only used for multi-tab synchronization.
  t.prototype.fo=function(t,e){var n=this,r=vt(),i=Gr(e),o=si(t),s=IDBKeyRange.lowerBound(i,!0);return o.yi({index:wi.readTimeIndex,range:s},function(t,e){// Unlike `getEntry()` and others, `getNewDocumentChanges()` parses
  // the documents directly since we want to keep sentinel deletes.
  var o=Br(n.serializer,e);r=r.nt(o.key,o),i=e.readTime;}).next(function(){return {ss:r,readTime:Qr(i)};});},/**
       * Returns the read time of the most recently read document in the cache, or
       * SnapshotVersion.min() if not available.
       */ // PORTING NOTE: This is only used for multi-tab synchronization.
  t.prototype.wo=function(t){var e=si(t),n=z.min();// If there are no existing entries, we return SnapshotVersion.min().
  return e.yi({index:wi.readTimeIndex,reverse:!0},function(t,e,r){e.readTime&&(n=Qr(e.readTime)),r.done();}).next(function(){return n;});},t.prototype.us=function(e){return new t.To(this,!!e&&e.ls);},t.prototype.mo=function(t){return this.getMetadata(t).next(function(t){return t.byteSize;});},t.prototype.getMetadata=function(t){return oi(t).get(bi.key).next(function(t){return S$1(!!t),t;});},t.prototype.oo=function(t,e){return oi(t).put(bi.key,e);},/**
       * Decodes `remoteDoc` and returns the document (or null, if the document
       * corresponds to the format used for sentinel deletes).
       */t.prototype.ho=function(t){if(t){var e=Br(this.serializer,t);return e instanceof gn&&e.version.isEqual(z.min())?null:e;}return null;},t;}();/**
   * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
   *
   * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
   * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
   * when we apply the changes.
   */function oi(t){return Bi.ci(t,bi.store);}/**
   * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
   */function si(t){return Bi.ci(t,wi.store);}function ui(t){return t.path.N();}/**
   * Retrusn an approximate size for the given document.
   */function ai(t){var e;if(t.document)e=t.document;else if(t.unknownDocument)e=t.unknownDocument;else {if(!t.noDocument)throw _();e=t.noDocument;}return JSON.stringify(e).length;}/**
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
   */ii.To=/** @class */function(e){/**
       * @param documentCache The IndexedDbRemoteDocumentCache to apply the changes to.
       * @param trackRemovals Whether to create sentinel deletes that can be tracked by
       * `getNewDocumentChanges()`.
       */function n(t,n){var r=this;return (r=e.call(this)||this).Eo=t,r.ls=n,// A map of document sizes prior to applying the changes in this buffer.
  r.Io=new F$1(function(t){return t.toString();},function(t,e){return t.isEqual(e);}),r;}return __extends$1(n,e),n.prototype.Un=function(t){var e=this,n=[],r=0,i=new pt(function(t,e){return O$1(t.F(),e.F());});return this.Nn.forEach(function(o,s){var u=e.Io.get(o);if(s.On){var a=zr(e.Eo.serializer,s.On,e.kn(o));i=i.add(o.path.p());var c=ai(a);r+=c-u,n.push(e.Eo.xn(t,o,a));}else if(r-=u,e.ls){// In order to track removals, we store a "sentinel delete" in the
  // RemoteDocumentCache. This entry is represented by a NoDocument
  // with a version of 0 and ignored by `maybeDecodeDocument()` but
  // preserved in `getNewDocumentChanges()`.
  var h=zr(e.Eo.serializer,new gn(o,z.min()),e.kn(o));n.push(e.Eo.xn(t,o,h));}else n.push(e.Eo.$n(t,o));}),i.forEach(function(r){n.push(e.Eo.Ps.Kr(t,r));}),n.push(this.Eo.updateMetadata(t,r)),Zn.Dn(n);},n.prototype.Bn=function(t,e){var n=this;// Record the size of everything we load from the cache so we can compute a delta later.
  return this.Eo.ao(t,e).next(function(t){return null===t?(n.Io.set(e,0),null):(n.Io.set(e,t.size),t.On);});},n.prototype.qn=function(t,e){var n=this;// Record the size of everything we load from the cache so we can compute
  // a delta later.
  return this.Eo.co(t,e).next(function(t){var e=t.lo;// Note: `getAllFromCache` returns two maps instead of a single map from
  // keys to `DocumentSizeEntry`s. This is to allow returning the
  // `NullableMaybeDocumentMap` directly, without a conversion.
  return t._o.forEach(function(t,e){n.Io.set(t,e);}),e;});},n;}(tr);var ci=/** @class */function(){function t(){this.Ao=new hi();}return t.prototype.Kr=function(t,e){return this.Ao.add(e),Zn.resolve();},t.prototype.Fs=function(t,e){return Zn.resolve(this.Ao.getEntries(e));},t;}(),hi=/** @class */function(){function t(){this.index={};}// Returns false if the entry already existed.
  return t.prototype.add=function(t){var e=t.S(),n=t.p(),r=this.index[e]||new pt(Q$1.P),i=!r.has(n);return this.index[e]=r.add(n),i;},t.prototype.has=function(t){var e=t.S(),n=t.p(),r=this.index[e];return r&&r.has(n);},t.prototype.getEntries=function(t){return (this.index[t]||new pt(Q$1.P)).N();},t;}(),fi=/** @class */function(){function t(t){this.serializer=t;}/**
       * Performs database creation and schema upgrades.
       *
       * Note that in production, this method is only ever used to upgrade the schema
       * to SCHEMA_VERSION. Different values of toVersion are only used for testing
       * and local feature development.
       */return t.prototype.createOrUpgrade=function(t,e,n,r){var i=this;S$1(n<r&&n>=0&&r<=11);var o=new Ir(e);n<1&&r>=1&&(function(t){t.createObjectStore(pi.store);}(t),function(t){t.createObjectStore(di.store,{keyPath:di.keyPath}),t.createObjectStore(yi.store,{keyPath:yi.keyPath,autoIncrement:!0}).createIndex(yi.userMutationsIndex,yi.userMutationsKeyPath,{unique:!0}),t.createObjectStore(vi.store);}(t),Ai(t),function(t){t.createObjectStore(wi.store);}(t));// Migration 2 to populate the targetGlobal object no longer needed since
  // migration 3 unconditionally clears it.
  var s=Zn.resolve();return n<3&&r>=3&&(// Brand new clients don't need to drop and recreate--only clients that
  // potentially have corrupt data.
  0!==n&&(function(t){t.deleteObjectStore(Ei.store),t.deleteObjectStore(Ii.store),t.deleteObjectStore(Ti.store);}(t),Ai(t)),s=s.next(function(){/**
       * Creates the target global singleton row.
       *
       * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
       */return function(t){var e=t.store(Ti.store),n=new Ti(/*highestTargetId=*/0,/*lastListenSequenceNumber=*/0,z.min().A(),/*targetCount=*/0);return e.put(Ti.key,n);}(o);})),n<4&&r>=4&&(0!==n&&(// Schema version 3 uses auto-generated keys to generate globally unique
  // mutation batch IDs (this was previously ensured internally by the
  // client). To migrate to the new schema, we have to read all mutations
  // and write them back out. We preserve the existing batch IDs to guarantee
  // consistency with other object stores. Any further mutation batch IDs will
  // be auto-generated.
  s=s.next(function(){return function(t,e){return e.store(yi.store).Ri().next(function(n){t.deleteObjectStore(yi.store),t.createObjectStore(yi.store,{keyPath:yi.keyPath,autoIncrement:!0}).createIndex(yi.userMutationsIndex,yi.userMutationsKeyPath,{unique:!0});var r=e.store(yi.store),i=n.map(function(t){return r.put(t);});return Zn.Dn(i);});}(t,o);})),s=s.next(function(){!function(t){t.createObjectStore(_i.store,{keyPath:_i.keyPath});}(t);})),n<5&&r>=5&&(s=s.next(function(){return i.removeAcknowledgedMutations(o);})),n<6&&r>=6&&(s=s.next(function(){return function(t){t.createObjectStore(bi.store);}(t),i.addDocumentGlobal(o);})),n<7&&r>=7&&(s=s.next(function(){return i.ensureSequenceNumbers(o);})),n<8&&r>=8&&(s=s.next(function(){return i.createCollectionParentIndex(t,o);})),n<9&&r>=9&&(s=s.next(function(){// Multi-Tab used to manage its own changelog, but this has been moved
  // to the DbRemoteDocument object store itself. Since the previous change
  // log only contained transient data, we can drop its object store.
  !function(t){t.objectStoreNames.contains("remoteDocumentChanges")&&t.deleteObjectStore("remoteDocumentChanges");}(t),function(t){var e=t.objectStore(wi.store);e.createIndex(wi.readTimeIndex,wi.readTimeIndexPath,{unique:!1}),e.createIndex(wi.collectionReadTimeIndex,wi.collectionReadTimeIndexPath,{unique:!1});}(e);})),n<10&&r>=10&&(s=s.next(function(){return i.rewriteCanonicalIds(o);})),n<11&&r>=11&&(s=s.next(function(){!function(t){t.createObjectStore(Si.store,{keyPath:Si.keyPath});}(t),function(t){t.createObjectStore(Di.store,{keyPath:Di.keyPath});}(t);})),s;},t.prototype.addDocumentGlobal=function(t){var e=0;return t.store(wi.store).yi(function(t,n){e+=ai(n);}).next(function(){var n=new bi(e);return t.store(bi.store).put(bi.key,n);});},t.prototype.removeAcknowledgedMutations=function(t){var e=this,n=t.store(di.store),r=t.store(yi.store);return n.Ri().next(function(n){return Zn.forEach(n,function(n){var i=IDBKeyRange.bound([n.userId,-1],[n.userId,n.lastAcknowledgedBatchId]);return r.Ri(yi.userMutationsIndex,i).next(function(r){return Zn.forEach(r,function(r){S$1(r.userId===n.userId);var i=Wr(e.serializer,r);return ti(t,n.userId,i).next(function(){});});});});});},/**
       * Ensures that every document in the remote document cache has a corresponding sentinel row
       * with a sequence number. Missing rows are given the most recently used sequence number.
       */t.prototype.ensureSequenceNumbers=function(t){var e=t.store(Ei.store),n=t.store(wi.store);return t.store(Ti.store).get(Ti.key).next(function(t){var r=[];return n.yi(function(n,i){var o=new Q$1(n),s=function(t){return [0,Ur(t)];}(o);r.push(e.get(s).next(function(n){return n?Zn.resolve():function(n){return e.put(new Ei(0,Ur(n),t.highestListenSequenceNumber));}(o);}));}).next(function(){return Zn.Dn(r);});});},t.prototype.createCollectionParentIndex=function(t,e){// Create the index.
  t.createObjectStore(Ni.store,{keyPath:Ni.keyPath});var n=e.store(Ni.store),r=new hi(),i=function i(t){if(r.add(t)){var e=t.S(),i=t.p();return n.put({collectionId:e,parent:Ur(i)});}};// Helper to add an index entry iff we haven't already written it.
  // Index existing remote documents.
  return e.store(wi.store).yi({Vi:!0},function(t,e){var n=new Q$1(t);return i(n.p());}).next(function(){return e.store(vi.store).yi({Vi:!0},function(t,e){t[0];var n=t[1],r=(t[2],qr(n));return i(r.p());});});},t.prototype.rewriteCanonicalIds=function(t){var e=this,n=t.store(Ii.store);return n.yi(function(t,r){var i=$r(r),o=Yr(e.serializer,i);return n.put(o);});},t;}(),li=function li(t,e){this.seconds=t,this.nanoseconds=e;},pi=function pi(t,/** Whether to allow shared access from multiple tabs. */e,n){this.ownerId=t,this.allowTabSynchronization=e,this.leaseTimestampMs=n;};/**
   * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
   * Also used for in-memory caching by IndexedDbIndexManager and initial index population
   * in indexeddb_schema.ts
   */ /**
   * Name of the IndexedDb object store.
   *
   * Note that the name 'owner' is chosen to ensure backwards compatibility with
   * older clients that only supported single locked access to the persistence
   * layer.
   */pi.store="owner",/**
       * The key string used for the single object that exists in the
       * DbPrimaryClient store.
       */pi.key="owner";var di=function di(/**
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
       */n){this.userId=t,this.lastAcknowledgedBatchId=e,this.lastStreamToken=n;};/** Name of the IndexedDb object store.  */di.store="mutationQueues",/** Keys are automatically assigned via the userId property. */di.keyPath="userId";/**
   * An object to be stored in the 'mutations' store in IndexedDb.
   *
   * Represents a batch of user-level mutations intended to be sent to the server
   * in a single write. Each user-level batch gets a separate DbMutationBatch
   * with a new batchId.
   */var yi=function yi(/**
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
       */i){this.userId=t,this.batchId=e,this.localWriteTimeMs=n,this.baseMutations=r,this.mutations=i;};/** Name of the IndexedDb object store.  */yi.store="mutations",/** Keys are automatically assigned via the userId, batchId properties. */yi.keyPath="batchId",/** The index name for lookup of mutations by user. */yi.userMutationsIndex="userMutationsIndex",/** The user mutations index is keyed by [userId, batchId] pairs. */yi.userMutationsKeyPath=["userId","batchId"];var vi=/** @class */function(){function t(){}/**
       * Creates a [userId] key for use in the DbDocumentMutations index to iterate
       * over all of a user's document mutations.
       */return t.prefixForUser=function(t){return [t];},/**
       * Creates a [userId, encodedPath] key for use in the DbDocumentMutations
       * index to iterate over all at document mutations for a given path or lower.
       */t.prefixForPath=function(t,e){return [t,Ur(e)];},/**
       * Creates a full index key of [userId, encodedPath, batchId] for inserting
       * and deleting into the DbDocumentMutations index.
       */t.key=function(t,e,n){return [t,Ur(e),n];},t;}();vi.store="documentMutations",/**
       * Because we store all the useful information for this store in the key,
       * there is no useful information to store as the value. The raw (unencoded)
       * path cannot be stored because IndexedDb doesn't store prototype
       * information.
       */vi.PLACEHOLDER=new vi();var mi=function mi(t,e){this.path=t,this.readTime=e;},gi=function gi(t,e){this.path=t,this.version=e;},wi=// TODO: We are currently storing full document keys almost three times
  // (once as part of the primary key, once - partly - as `parentPath` and once
  // inside the encoded documents). During our next migration, we should
  // rewrite the primary key as parentPath + document ID which would allow us
  // to drop one value.
  function wi(/**
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
   */wi.store="remoteDocuments",/**
       * An index that provides access to all entries sorted by read time (which
       * corresponds to the last modification time of each row).
       *
       * This index is used to provide a changelog for Multi-Tab.
       */wi.readTimeIndex="readTimeIndex",wi.readTimeIndexPath="readTime",/**
       * An index that provides access to documents in a collection sorted by read
       * time.
       *
       * This index is used to allow the RemoteDocumentCache to fetch newly changed
       * documents in a collection.
       */wi.collectionReadTimeIndex="collectionReadTimeIndex",wi.collectionReadTimeIndexPath=["parentPath","readTime"];/**
   * Contains a single entry that has metadata about the remote document cache.
   */var bi=/**
       * @param byteSize Approximately the total size in bytes of all the documents in the document
       * cache.
       */function bi(t){this.byteSize=t;};bi.store="remoteDocumentGlobal",bi.key="remoteDocumentGlobalKey";var Ii=function Ii(/**
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
       */s){this.targetId=t,this.canonicalId=e,this.readTime=n,this.resumeToken=r,this.lastListenSequenceNumber=i,this.lastLimboFreeSnapshotVersion=o,this.query=s;};Ii.store="targets",/** Keys are automatically assigned via the targetId property. */Ii.keyPath="targetId",/** The name of the queryTargets index. */Ii.queryTargetsIndexName="queryTargetsIndex",/**
       * The index of all canonicalIds to the targets that they match. This is not
       * a unique mapping because canonicalId does not promise a unique name for all
       * possible queries, so we append the targetId to make the mapping unique.
       */Ii.queryTargetsKeyPath=["canonicalId","targetId"];/**
   * An object representing an association between a target and a document, or a
   * sentinel row marking the last sequence number at which a document was used.
   * Each document cached must have a corresponding sentinel row before lru
   * garbage collection is enabled.
   *
   * The target associations and sentinel rows are co-located so that orphaned
   * documents and their sequence numbers can be identified efficiently via a scan
   * of this store.
   */var Ei=function Ei(/**
       * The targetId identifying a target or 0 for a sentinel row.
       */t,/**
       * The path to the document, as encoded in the key.
       */e,/**
       * If this is a sentinel row, this should be the sequence number of the last
       * time the document specified by `path` was used. Otherwise, it should be
       * `undefined`.
       */n){this.targetId=t,this.path=e,this.sequenceNumber=n;};/** Name of the IndexedDb object store.  */Ei.store="targetDocuments",/** Keys are automatically assigned via the targetId, path properties. */Ei.keyPath=["targetId","path"],/** The index name for the reverse index. */Ei.documentTargetsIndex="documentTargetsIndex",/** We also need to create the reverse index for these properties. */Ei.documentTargetsKeyPath=["path","targetId"];/**
   * A record of global state tracked across all Targets, tracked separately
   * to avoid the need for extra indexes.
   *
   * This should be kept in-sync with the proto used in the iOS client.
   */var Ti=function Ti(/**
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
   */Ti.key="targetGlobalKey",Ti.store="targetGlobal";/**
   * An object representing an association between a Collection id (e.g. 'messages')
   * to a parent path (e.g. '/chats/123') that contains it as a (sub)collection.
   * This is used to efficiently find all collections to query when performing
   * a Collection Group query.
   */var Ni=function Ni(/**
       * The collectionId (e.g. 'messages')
       */t,/**
       * The path to the parent (either a document location or an empty path for
       * a root-level collection).
       */e){this.collectionId=t,this.parent=e;};/** Name of the IndexedDb object store. */function Ai(t){t.createObjectStore(Ei.store,{keyPath:Ei.keyPath}).createIndex(Ei.documentTargetsIndex,Ei.documentTargetsKeyPath,{unique:!0}),// NOTE: This is unique only because the TargetId is the suffix.
  t.createObjectStore(Ii.store,{keyPath:Ii.keyPath}).createIndex(Ii.queryTargetsIndexName,Ii.queryTargetsKeyPath,{unique:!0}),t.createObjectStore(Ti.store);}Ni.store="collectionParents",/** Keys are automatically assigned via the collectionId, parent properties. */Ni.keyPath=["collectionId","parent"];var _i=function _i(// Note: Previous schema versions included a field
  // "lastProcessedDocumentChangeId". Don't use anymore.
  /** The auto-generated client id assigned at client startup. */t,/** The last time this state was updated. */e,/** Whether the client's network connection is enabled. */n,/** Whether this client is running in a foreground tab. */r){this.clientId=t,this.updateTimeMs=e,this.networkEnabled=n,this.inForeground=r;};/** Name of the IndexedDb object store. */_i.store="clientMetadata",/** Keys are automatically assigned via the clientId properties. */_i.keyPath="clientId";var Si=function Si(/** The ID of the loaded bundle. */t,/** The create time of the loaded bundle. */e,/** The schema version of the loaded bundle. */n){this.bundleId=t,this.createTime=e,this.version=n;};/** Name of the IndexedDb object store. */Si.store="bundles",Si.keyPath="bundleId";var Di=function Di(/** The name of the query. */t,/** The read time of the results saved in the bundle from the named query. */e,/** The query saved in the bundle. */n){this.name=t,this.readTime=e,this.bundledQuery=n;};/** Name of the IndexedDb object store. */Di.store="namedQueries",Di.keyPath="name";var ki=__spreadArrays$1(__spreadArrays$1(__spreadArrays$1(__spreadArrays$1([di.store,yi.store,vi.store,wi.store,Ii.store,pi.store,Ti.store,Ei.store],[_i.store]),[bi.store]),[Ni.store]),[Si.store,Di.store]),xi=/** @class */function(){function t(t){this.serializer=t;}return t.prototype.Ro=function(t,e){return Oi(t).get(e).next(function(t){if(t)return {id:(e=t).bundleId,createTime:Kr(e.createTime),version:e.version};/** Encodes a DbBundle to a Bundle. */var e;/** Encodes a BundleMetadata to a DbBundle. */});},t.prototype.Po=function(t,e){return Oi(t).put({bundleId:(n=e).id,createTime:Hr(fe(n.createTime)),version:n.version});var n;/** Encodes a DbNamedQuery to a NamedQuery. */},t.prototype.Vo=function(t,e){return Pi(t).get(e).next(function(t){if(t)return {name:(e=t).name,query:Xr(e.bundledQuery),readTime:Kr(e.readTime)};var e;/** Encodes a NamedQuery from a bundle proto to a DbNamedQuery. */});},t.prototype.yo=function(t,e){return Pi(t).put(function(t){return {name:t.name,readTime:Hr(fe(t.readTime)),bundledQuery:t.bundledQuery};}(e));},t;}();// V2 is no longer usable (see comment at top of file)
  // Visible for testing
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
   */ /**
   * Helper to get a typed SimpleDbStore for the bundles object store.
   */function Oi(t){return Bi.ci(t,Si.store);}/**
   * Helper to get a typed SimpleDbStore for the namedQueries object store.
   */function Pi(t){return Bi.ci(t,Di.store);}/**
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
   */var Li=/** @class */function(){function t(){/**
           * An in-memory copy of the index entries we've already written since the SDK
           * launched. Used to avoid re-writing the same entry repeatedly.
           *
           * This is *NOT* a complete cache of what's in persistence and so can never be used to
           * satisfy reads.
           */this.po=new hi();}/**
       * Adds a new entry to the collection parent index.
       *
       * Repeated calls for the same collectionPath should be avoided within a
       * transaction as IndexedDbIndexManager only caches writes once a transaction
       * has been committed.
       */return t.prototype.Kr=function(t,e){var n=this;if(!this.po.has(e)){var r=e.S(),i=e.p();t.Es(function(){// Add the collection to the in memory cache only if the transaction was
  // successfully committed.
  n.po.add(e);});var o={collectionId:r,parent:Ur(i)};return Ri(t).put(o);}return Zn.resolve();},t.prototype.Fs=function(t,e){var n=[],r=IDBKeyRange.bound([e,""],[L$1(e),""],/*lowerOpen=*/!1,/*upperOpen=*/!0);return Ri(t).Ri(r).next(function(t){for(var r=0,i=t;r<i.length;r++){var o=i[r];// This collectionId guard shouldn't be necessary (and isn't as long
  // as we're running in a real browser), but there's a bug in
  // indexeddbshim that breaks our range in our tests running in node:
  // https://github.com/axemclion/IndexedDBShim/issues/334
  if(o.collectionId!==e)break;n.push(qr(o.parent));}return n;});},t;}();/**
   * Helper to get a typed SimpleDbStore for the collectionParents
   * document store.
   */function Ri(t){return Bi.ci(t,Ni.store);}/**
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
   */var Mi=/** @class */function(){function t(t){this.bo=t;}return t.prototype.next=function(){return this.bo+=2,this.bo;},t.vo=function(){// The target cache generator must return '2' in its first call to `next()`
  // as there is no differentiation in the protocol layer between an unset
  // number and the number '0'. If we were to sent a target with target ID
  // '0', the backend would consider it unset and replace it with its own ID.
  return new t(0);},t.So=function(){// Sync engine assigns target IDs for limbo document detection.
  return new t(-1);},t;}(),Vi=/** @class */function(){function t(t,e){this.Br=t,this.serializer=e;}// PORTING NOTE: We don't cache global metadata for the target cache, since
  // some of it (in particular `highestTargetId`) can be modified by secondary
  // tabs. We could perhaps be more granular (and e.g. still cache
  // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
  // to IndexedDb whenever we need to read metadata. We can revisit if it turns
  // out to have a meaningful performance impact.
  return t.prototype.Do=function(t){var e=this;return this.Co(t).next(function(n){var r=new Mi(n.highestTargetId);return n.highestTargetId=r.next(),e.No(t,n).next(function(){return n.highestTargetId;});});},t.prototype.Fo=function(t){return this.Co(t).next(function(t){return z.m(new B(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds));});},t.prototype.ko=function(t){return this.Co(t).next(function(t){return t.highestListenSequenceNumber;});},t.prototype.xo=function(t,e,n){var r=this;return this.Co(t).next(function(i){return i.highestListenSequenceNumber=e,n&&(i.lastRemoteSnapshotVersion=n.A()),e>i.highestListenSequenceNumber&&(i.highestListenSequenceNumber=e),r.No(t,i);});},t.prototype.Mo=function(t,e){var n=this;return this.Oo(t,e).next(function(){return n.Co(t).next(function(r){return r.targetCount+=1,n.$o(e,r),n.No(t,r);});});},t.prototype.Lo=function(t,e){return this.Oo(t,e);},t.prototype.Bo=function(t,e){var n=this;return this._s(t,e.targetId).next(function(){return Ui(t).delete(e.targetId);}).next(function(){return n.Co(t);}).next(function(e){return S$1(e.targetCount>0),e.targetCount-=1,n.No(t,e);});},/**
       * Drops any targets with sequence number less than or equal to the upper bound, excepting those
       * present in `activeTargetIds`. Document associations for the removed targets are also removed.
       * Returns the number of targets removed.
       */t.prototype.kr=function(t,e,n){var r=this,i=0,o=[];return Ui(t).yi(function(s,u){var a=$r(u);a.sequenceNumber<=e&&null===n.get(a.targetId)&&(i++,o.push(r.Bo(t,a)));}).next(function(){return Zn.Dn(o);}).next(function(){return i;});},/**
       * Call provided function with each `TargetData` that we have cached.
       */t.prototype.pe=function(t,e){return Ui(t).yi(function(t,n){var r=$r(n);e(r);});},t.prototype.Co=function(t){return Ci(t).get(Ti.key).next(function(t){return S$1(null!==t),t;});},t.prototype.No=function(t,e){return Ci(t).put(Ti.key,e);},t.prototype.Oo=function(t,e){return Ui(t).put(Yr(this.serializer,e));},/**
       * In-place updates the provided metadata to account for values in the given
       * TargetData. Saving is done separately. Returns true if there were any
       * changes to the metadata.
       */t.prototype.$o=function(t,e){var n=!1;return t.targetId>e.highestTargetId&&(e.highestTargetId=t.targetId,n=!0),t.sequenceNumber>e.highestListenSequenceNumber&&(e.highestListenSequenceNumber=t.sequenceNumber,n=!0),n;},t.prototype.qo=function(t){return this.Co(t).next(function(t){return t.targetCount;});},t.prototype.Uo=function(t,e){// Iterating by the canonicalId may yield more than one result because
  // canonicalId values are not required to be unique per target. This query
  // depends on the queryTargets index to be efficient.
  var n=tt(e),r=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]),i=null;return Ui(t).yi({range:r,index:Ii.queryTargetsIndexName},function(t,n,r){var o=$r(n);// After finding a potential match, check that the target is
  // actually equal to the requested target.
  et(e,o.target)&&(i=o,r.done());}).next(function(){return i;});},t.prototype.ds=function(t,e,n){var r=this,i=[],o=Fi(t);// PORTING NOTE: The reverse index (documentsTargets) is maintained by
  // IndexedDb.
  return e.forEach(function(e){var s=Ur(e.path);i.push(o.put(new Ei(n,s))),i.push(r.Br.Qo(t,n,e));}),Zn.Dn(i);},t.prototype.Wo=function(t,e,n){var r=this,i=Fi(t);// PORTING NOTE: The reverse index (documentsTargets) is maintained by
  // IndexedDb.
  return Zn.forEach(e,function(e){var o=Ur(e.path);return Zn.Dn([i.delete([n,o]),r.Br.jo(t,n,e)]);});},t.prototype._s=function(t,e){var n=Fi(t),r=IDBKeyRange.bound([e],[e+1],/*lowerOpen=*/!1,/*upperOpen=*/!0);return n.delete(r);},t.prototype.Ko=function(t,e){var n=IDBKeyRange.bound([e],[e+1],/*lowerOpen=*/!1,/*upperOpen=*/!0),r=Fi(t),i=Tt();return r.yi({range:n,Vi:!0},function(t,e,n){var r=qr(t[1]),o=new W$1(r);i=i.add(o);}).next(function(){return i;});},t.prototype.io=function(t,e){var n=Ur(e.path),r=IDBKeyRange.bound([n],[L$1(n)],/*lowerOpen=*/!1,/*upperOpen=*/!0),i=0;return Fi(t).yi({index:Ei.documentTargetsIndex,Vi:!0,range:r},function(t,e,n){var r=t[0];// Having a sentinel row for a document does not count as containing that document;
  // For the target cache, containing the document means the document is part of some
  // target.
  t[1];0!==r&&(i++,n.done());}).next(function(){return i>0;});},/**
       * Looks up a TargetData entry by target ID.
       *
       * @param targetId The target ID of the TargetData entry to look up.
       * @return The cached TargetData entry, or null if the cache has no entry for
       * the target.
       */ // PORTING NOTE: Multi-tab only.
  t.prototype.Oe=function(t,e){return Ui(t).get(e).next(function(t){return t?$r(t):null;});},t;}();/**
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
   */function Ui(t){return Bi.ci(t,Ii.store);}/**
   * Helper to get a typed SimpleDbStore for the target globals object store.
   */function Ci(t){return Bi.ci(t,Ti.store);}/**
   * Helper to get a typed SimpleDbStore for the document target object store.
   */function Fi(t){return Bi.ci(t,Ei.store);}/**
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
   */var qi="Failed to obtain exclusive access to the persistence layer. To allow shared access, make sure to invoke `enablePersistence()` with `synchronizeTabs:true` in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.",ji=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).to=t,r.Go=n,r;}return __extends$1(n,e),n;}(lr),Bi=/** @class */function(){function t(/**
       * Whether to synchronize the in-memory state of multiple tabs and share
       * access to local persistence.
       */e,n,r,i,o,s,u,a,c,/**
       * If set to true, forcefully obtains database access. Existing tabs will
       * no longer be able to access IndexedDB.
       */h){if(this.allowTabSynchronization=e,this.persistenceKey=n,this.clientId=r,this.Ws=o,this.window=s,this.document=u,this.zo=c,this.Ho=h,this.Jo=null,this.Yo=!1,this.isPrimary=!1,this.networkEnabled=!0,/** Our window.unload handler, if registered. */this.Xo=null,this.inForeground=!1,/** Our 'visibilitychange' listener if registered. */this.Zo=null,/** The client metadata refresh task. */this.th=null,/** The last time we garbage collected the client metadata object store. */this.eh=Number.NEGATIVE_INFINITY,/** A listener to notify on primary state changes. */this.nh=function(t){return Promise.resolve();},!t.oi())throw new j(q$1.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.Br=new Qi(this,i),this.sh=n+"main",this.serializer=new jr(a),this.ih=new mr(this.sh,11,new fi(this.serializer)),this.fs=new Vi(this.Br,this.serializer),this.Ps=new Li(),this.As=new ii(this.serializer,this.Ps),this.rh=new xi(this.serializer),this.window&&this.window.localStorage?this.oh=this.window.localStorage:(this.oh=null,!1===h&&T$1("IndexedDbPersistence","LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."));}return t.ci=function(t,e){if(t instanceof ji)return mr.ci(t.to,e);throw _();},/**
       * Attempt to start IndexedDb persistence.
       *
       * @return {Promise<void>} Whether persistence was enabled.
       */t.prototype.start=function(){var t=this;// NOTE: This is expected to fail sometimes (in the case of another tab
  // already having the persistence lock), so it's the first thing we should
  // do.
  return this.hh().then(function(){if(!t.isPrimary&&!t.allowTabSynchronization)// Fail `start()` if `synchronizeTabs` is disabled and we cannot
  // obtain the primary lease.
  throw new j(q$1.FAILED_PRECONDITION,qi);return t.ah(),t.uh(),t.lh(),t.runTransaction("getHighestListenSequenceNumber","readonly",function(e){return t.fs.ko(e);});}).then(function(e){t.Jo=new yr(e,t.zo);}).then(function(){t.Yo=!0;}).catch(function(e){return t.ih&&t.ih.close(),Promise.reject(e);});},/**
       * Registers a listener that gets called when the primary state of the
       * instance changes. Upon registering, this listener is invoked immediately
       * with the current primary state.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype._h=function(t){var r=this;return this.nh=function(i){return __awaiter$2(r,void 0,void 0,function(){return __generator$2(this,function(e){return this.br?[2/*return*/,t(i)]:[2/*return*/];});});},t(this.isPrimary);},/**
       * Registers a listener that gets called when the database receives a
       * version change event indicating that it has deleted.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype.fh=function(t){var r=this;this.ih.fi(function(i){return __awaiter$2(r,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:return null===i.newVersion?[4/*yield*/,t()]:[3/*break*/,2];case 1:e.sent(),e.label=2;case 2:return [2/*return*/];}});});});},/**
       * Adjusts the current network state in the client's metadata, potentially
       * affecting the primary lease.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype.dh=function(t){var r=this;this.networkEnabled!==t&&(this.networkEnabled=t,// Schedule a primary lease refresh for immediate execution. The eventual
  // lease update will be propagated via `primaryStateListener`.
  this.Ws.ki(function(){return __awaiter$2(r,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return this.br?[4/*yield*/,this.hh()]:[3/*break*/,2];case 1:t.sent(),t.label=2;case 2:return [2/*return*/];}});});}));},/**
       * Updates the client metadata in IndexedDb and attempts to either obtain or
       * extend the primary lease for the local client. Asynchronously notifies the
       * primary state listener if the client either newly obtained or released its
       * primary lease.
       */t.prototype.hh=function(){var t=this;return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",function(e){return Gi(e).put(new _i(t.clientId,Date.now(),t.networkEnabled,t.inForeground)).next(function(){if(t.isPrimary)return t.wh(e).next(function(e){e||(t.isPrimary=!1,t.Ws.Hi(function(){return t.nh(!1);}));});}).next(function(){return t.Th(e);}).next(function(n){return t.isPrimary&&!n?t.mh(e).next(function(){return !1;}):!!n&&t.Eh(e).next(function(){return !0;});});}).catch(function(e){if(br(e))// Proceed with the existing state. Any subsequent access to
  // IndexedDB will verify the lease.
  return E$1("IndexedDbPersistence","Failed to extend owner lease: ",e),t.isPrimary;if(!t.allowTabSynchronization)throw e;return E$1("IndexedDbPersistence","Releasing owner lease after error during lease refresh",e),/* isPrimary= */!1;}).then(function(e){t.isPrimary!==e&&t.Ws.Hi(function(){return t.nh(e);}),t.isPrimary=e;});},t.prototype.wh=function(t){var e=this;return zi(t).get(pi.key).next(function(t){return Zn.resolve(e.Ih(t));});},t.prototype.Ah=function(t){return Gi(t).delete(this.clientId);},/**
       * If the garbage collection threshold has passed, prunes the
       * RemoteDocumentChanges and the ClientMetadata store based on the last update
       * time of all clients.
       */t.prototype.Rh=function(){return __awaiter$2(this,void 0,void 0,function(){var e,r,i,o,s=this;return __generator$2(this,function(n){switch(n.label){case 0:return !this.isPrimary||this.Ph(this.eh,18e5)?[3/*break*/,2]:(this.eh=Date.now(),[4/*yield*/,this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",function(e){var n=t.ci(e,_i.store);return n.Ri().next(function(t){var e=s.gh(t,18e5),r=t.filter(function(t){return -1===e.indexOf(t);});// Delete metadata for clients that are no longer considered active.
  return Zn.forEach(r,function(t){return n.delete(t.clientId);}).next(function(){return r;});});}).catch(function(){return [];})]);case 1:// Delete potential leftover entries that may continue to mark the
  // inactive clients as zombied in LocalStorage.
  // Ideally we'd delete the IndexedDb and LocalStorage zombie entries for
  // the client atomically, but we can't. So we opt to delete the IndexedDb
  // entries first to avoid potentially reviving a zombied client.
  if(e=n.sent(),this.oh)for(r=0,i=e;r<i.length;r++){o=i[r],this.oh.removeItem(this.Vh(o.clientId));}n.label=2;case 2:return [2/*return*/];}});});},/**
       * Schedules a recurring timer to update the client metadata and to either
       * extend or acquire the primary lease if the client is eligible.
       */t.prototype.lh=function(){var t=this;this.th=this.Ws.ei("client_metadata_refresh"/* ClientMetadataRefresh */,4e3,function(){return t.hh().then(function(){return t.Rh();}).then(function(){return t.lh();});});},/** Checks whether `client` is the local client. */t.prototype.Ih=function(t){return !!t&&t.ownerId===this.clientId;},/**
       * Evaluate the state of all active clients and determine whether the local
       * client is or can act as the holder of the primary lease. Returns whether
       * the client is eligible for the lease, but does not actually acquire it.
       * May return 'false' even if there is no active leaseholder and another
       * (foreground) client should become leaseholder instead.
       */t.prototype.Th=function(t){var e=this;return this.Ho?Zn.resolve(!0):zi(t).get(pi.key).next(function(n){// A client is eligible for the primary lease if:
  // - its network is enabled and the client's tab is in the foreground.
  // - its network is enabled and no other client's tab is in the
  //   foreground.
  // - every clients network is disabled and the client's tab is in the
  //   foreground.
  // - every clients network is disabled and no other client's tab is in
  //   the foreground.
  // - the `forceOwningTab` setting was passed in.
  if(null!==n&&e.Ph(n.leaseTimestampMs,5e3)&&!e.yh(n.ownerId)){if(e.Ih(n)&&e.networkEnabled)return !0;if(!e.Ih(n)){if(!n.allowTabSynchronization)// Fail the `canActAsPrimary` check if the current leaseholder has
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
  throw new j(q$1.FAILED_PRECONDITION,qi);return !1;}}return !(!e.networkEnabled||!e.inForeground)||Gi(t).Ri().next(function(t){return void 0===e.gh(t,5e3).find(function(t){if(e.clientId!==t.clientId){var n=!e.networkEnabled&&t.networkEnabled,r=!e.inForeground&&t.inForeground,i=e.networkEnabled===t.networkEnabled;if(n||r&&i)return !0;}return !1;});});}).next(function(t){return e.isPrimary!==t&&E$1("IndexedDbPersistence","Client "+(t?"is":"is not")+" eligible for a primary lease."),t;});},t.prototype.ph=function(){return __awaiter$2(this,void 0,void 0,function(){var t=this;return __generator$2(this,function(e){switch(e.label){case 0:// Use `SimpleDb.runTransaction` directly to avoid failing if another tab
  // has obtained the primary lease.
  // The shutdown() operations are idempotent and can be called even when
  // start() aborted (e.g. because it couldn't acquire the persistence lease).
  return this.Yo=!1,this.bh(),this.th&&(this.th.cancel(),this.th=null),this.vh(),this.Sh(),[4/*yield*/,this.ih.runTransaction("readwrite",[pi.store,_i.store],function(e){var n=new ji(e,yr.Qs);return t.mh(n).next(function(){return t.Ah(n);});})];case 1:// The shutdown() operations are idempotent and can be called even when
  // start() aborted (e.g. because it couldn't acquire the persistence lease).
  // Use `SimpleDb.runTransaction` directly to avoid failing if another tab
  // has obtained the primary lease.
  return e.sent(),this.ih.close(),// Remove the entry marking the client as zombied from LocalStorage since
  // we successfully deleted its metadata from IndexedDb.
  this.Dh(),[2/*return*/];}});});},/**
       * Returns clients that are not zombied and have an updateTime within the
       * provided threshold.
       */t.prototype.gh=function(t,e){var n=this;return t.filter(function(t){return n.Ph(t.updateTimeMs,e)&&!n.yh(t.clientId);});},/**
       * Returns the IDs of the clients that are currently active. If multi-tab
       * is not supported, returns an array that only contains the local client's
       * ID.
       *
       * PORTING NOTE: This is only used for Web multi-tab.
       */t.prototype.Ch=function(){var t=this;return this.runTransaction("getActiveClients","readonly",function(e){return Gi(e).Ri().next(function(e){return t.gh(e,18e5).map(function(t){return t.clientId;});});});},Object.defineProperty(t.prototype,"br",{get:function get(){return this.Yo;},enumerable:!1,configurable:!0}),t.prototype.Nh=function(t){return Jr.Ur(t,this.serializer,this.Ps,this.Br);},t.prototype.Fh=function(){return this.fs;},t.prototype.kh=function(){return this.As;},t.prototype.xh=function(){return this.Ps;},t.prototype.Mh=function(){return this.rh;},t.prototype.runTransaction=function(t,e,n){var r=this;E$1("IndexedDbPersistence","Starting transaction:",t);var i,o="readonly"===e?"readonly":"readwrite";// Do all transactions as readwrite against all object stores, since we
  // are the only reader/writer.
  return this.ih.runTransaction(o,ki,function(o){return i=new ji(o,r.Jo?r.Jo.next():yr.Qs),"readwrite-primary"===e?r.wh(i).next(function(t){return !!t||r.Th(i);}).next(function(e){if(!e)throw T$1("Failed to obtain primary lease for action '"+t+"'."),r.isPrimary=!1,r.Ws.Hi(function(){return r.nh(!1);}),new j(q$1.FAILED_PRECONDITION,fr);return n(i);}).next(function(t){return r.Eh(i).next(function(){return t;});}):r.Oh(i).next(function(){return n(i);});}).then(function(t){return i.Is(),t;});},/**
       * Verifies that the current tab is the primary leaseholder or alternatively
       * that the leaseholder has opted into multi-tab synchronization.
       */ // TODO(b/114226234): Remove this check when `synchronizeTabs` can no longer
  // be turned off.
  t.prototype.Oh=function(t){var e=this;return zi(t).get(pi.key).next(function(t){if(null!==t&&e.Ph(t.leaseTimestampMs,5e3)&&!e.yh(t.ownerId)&&!e.Ih(t)&&!(e.Ho||e.allowTabSynchronization&&t.allowTabSynchronization))throw new j(q$1.FAILED_PRECONDITION,qi);});},/**
       * Obtains or extends the new primary lease for the local client. This
       * method does not verify that the client is eligible for this lease.
       */t.prototype.Eh=function(t){var e=new pi(this.clientId,this.allowTabSynchronization,Date.now());return zi(t).put(pi.key,e);},t.oi=function(){return mr.oi();},/** Checks the primary lease and removes it if we are the current primary. */t.prototype.mh=function(t){var e=this,n=zi(t);return n.get(pi.key).next(function(t){return e.Ih(t)?(E$1("IndexedDbPersistence","Releasing primary lease."),n.delete(pi.key)):Zn.resolve();});},/** Verifies that `updateTimeMs` is within `maxAgeMs`. */t.prototype.Ph=function(t,e){var n=Date.now();return !(t<n-e||t>n&&(T$1("Detected an update time that is in the future: "+t+" > "+n),1));},t.prototype.ah=function(){var t=this;null!==this.document&&"function"==typeof this.document.addEventListener&&(this.Zo=function(){t.Ws.ki(function(){return t.inForeground="visible"===t.document.visibilityState,t.hh();});},this.document.addEventListener("visibilitychange",this.Zo),this.inForeground="visible"===this.document.visibilityState);},t.prototype.vh=function(){this.Zo&&(this.document.removeEventListener("visibilitychange",this.Zo),this.Zo=null);},/**
       * Attaches a window.unload handler that will synchronously write our
       * clientId to a "zombie client id" location in LocalStorage. This can be used
       * by tabs trying to acquire the primary lease to determine that the lease
       * is no longer valid even if the timestamp is recent. This is particularly
       * important for the refresh case (so the tab correctly re-acquires the
       * primary lease). LocalStorage is used for this rather than IndexedDb because
       * it is a synchronous API and so can be used reliably from  an unload
       * handler.
       */t.prototype.uh=function(){var t,e=this;"function"==typeof(null===(t=this.window)||void 0===t?void 0:t.addEventListener)&&(this.Xo=function(){// Note: In theory, this should be scheduled on the AsyncQueue since it
  // accesses internal state. We execute this code directly during shutdown
  // to make sure it gets a chance to run.
  e.bh(),e.Ws.ki(function(){return e.ph();});},this.window.addEventListener("unload",this.Xo));},t.prototype.Sh=function(){this.Xo&&(this.window.removeEventListener("unload",this.Xo),this.Xo=null);},/**
       * Returns whether a client is "zombied" based on its LocalStorage entry.
       * Clients become zombied when their tab closes without running all of the
       * cleanup logic in `shutdown()`.
       */t.prototype.yh=function(t){var e;try{var n=null!==(null===(e=this.oh)||void 0===e?void 0:e.getItem(this.Vh(t)));return E$1("IndexedDbPersistence","Client '"+t+"' "+(n?"is":"is not")+" zombied in LocalStorage"),n;}catch(t){// Gracefully handle if LocalStorage isn't working.
  return T$1("IndexedDbPersistence","Failed to get zombied client id.",t),!1;}},/**
       * Record client as zombied (a client that had its tab closed). Zombied
       * clients are ignored during primary tab selection.
       */t.prototype.bh=function(){if(this.oh)try{this.oh.setItem(this.Vh(this.clientId),String(Date.now()));}catch(t){// Gracefully handle if LocalStorage isn't available / working.
  T$1("Failed to set zombie client id.",t);}},/** Removes the zombied client entry if it exists. */t.prototype.Dh=function(){if(this.oh)try{this.oh.removeItem(this.Vh(this.clientId));}catch(t){// Ignore
  }},t.prototype.Vh=function(t){return "firestore_zombie_"+this.persistenceKey+"_"+t;},t;}();/**
   * Oldest acceptable age in milliseconds for client metadata before the client
   * is considered inactive and its associated data is garbage collected.
   */ /**
   * Helper to get a typed SimpleDbStore for the primary client object store.
   */function zi(t){return Bi.ci(t,pi.store);}/**
   * Helper to get a typed SimpleDbStore for the client metadata object store.
   */function Gi(t){return Bi.ci(t,_i.store);}/** Provides LRU functionality for IndexedDB persistence. */var Qi=/** @class */function(){function t(t,e){this.db=t,this.gr=new Vr(this,e);}return t.prototype.Cr=function(t){var e=this.$h(t);return this.db.Fh().qo(t).next(function(t){return e.next(function(e){return t+e;});});},t.prototype.$h=function(t){var e=0;return this.Fr(t,function(t){e++;}).next(function(){return e;});},t.prototype.pe=function(t,e){return this.db.Fh().pe(t,e);},t.prototype.Fr=function(t,e){return this.Lh(t,function(t,n){return e(n);});},t.prototype.Qo=function(t,e,n){return Hi(t,n);},t.prototype.jo=function(t,e,n){return Hi(t,n);},t.prototype.kr=function(t,e,n){return this.db.Fh().kr(t,e,n);},t.prototype.no=function(t,e){return Hi(t,e);},/**
       * Returns true if anything would prevent this document from being garbage
       * collected, given that the document in question is not present in any
       * targets and has a sequence number less than or equal to the upper bound for
       * the collection run.
       */t.prototype.Bh=function(t,e){return function(t,e){var n=!1;return ri(t).pi(function(r){return Zr(t,r,e).next(function(t){return t&&(n=!0),Zn.resolve(!t);});}).next(function(){return n;});}(t,e);},t.prototype.xr=function(t,e){var n=this,r=this.db.kh().us(),i=[],o=0;return this.Lh(t,function(s,u){if(u<=e){var a=n.Bh(t,s).next(function(e){if(!e)// Our size accounting requires us to read all documents before
  // removing them.
  return o++,r.Ln(t,s).next(function(){return r.$n(s),Fi(t).delete([0,Ur(s.path)]);});});i.push(a);}}).next(function(){return Zn.Dn(i);}).next(function(){return r.apply(t);}).next(function(){return o;});},t.prototype.removeTarget=function(t,e){var n=e.Z(t.Go);return this.db.Fh().Lo(t,n);},t.prototype.qh=function(t,e){return Hi(t,e);},/**
       * Call provided function for each document in the cache that is 'orphaned'. Orphaned
       * means not a part of any target, so the only entry in the target-document index for
       * that document will be the sentinel row (targetId 0), which will also have the sequence
       * number for the last time the document was accessed.
       */t.prototype.Lh=function(t,e){var n,r=Fi(t),i=yr.Qs;return r.yi({index:Ei.documentTargetsIndex},function(t,r){var o=t[0],s=(t[1],r.path),u=r.sequenceNumber;0===o?(// if nextToReport is valid, report it, this is a new key so the
  // last one must not be a member of any targets.
  i!==yr.Qs&&e(new W$1(qr(n)),i),// set nextToReport to be this sequence number. It's the next one we
  // might report, if we don't find any targets for this document.
  // Note that the sequence number must be defined when the targetId
  // is 0.
  i=u,n=s):// set nextToReport to be invalid, we know we don't need to report
  // this one since we found a target for it.
  i=yr.Qs;}).next(function(){// Since we report sequence numbers after getting to the next key, we
  // need to check if the last key we iterated over was an orphaned
  // document and report it.
  i!==yr.Qs&&e(new W$1(qr(n)),i);});},t.prototype.Or=function(t){return this.db.kh().mo(t);},t;}();function Hi(t,e){return Fi(t).put(/**
   * @return A value suitable for writing a sentinel row in the target-document
   * store.
   */function(t,e){return new Ei(0,Ur(t.path),e);}(e,t.Go));}/**
   * Generates a string used as a prefix when storing data in IndexedDB and
   * LocalStorage.
   */function Ki(t,e){// Use two different prefix formats:
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
   */;}var Wi=/** @class */function(){function t(/** Manages our in-memory or durable persistence. */t,e,n,r){this.persistence=t,this.Uh=e,this.serializer=r,/**
               * Maps a targetID to data about its target.
               *
               * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
               * of `applyRemoteEvent()` idempotent.
               */this.Qh=new ht(O$1),/** Maps a target to its targetID. */ // TODO(wuandy): Evaluate if TargetId can be part of Target.
  this.Wh=new F$1(function(t){return tt(t);},et),/**
               * The read time of the last entry processed by `getNewDocumentChanges()`.
               *
               * PORTING NOTE: This is only used for multi-tab synchronization.
               */this.jh=z.min(),this.Rs=t.Nh(n),this.cs=t.kh(),this.fs=t.Fh(),this.Ts=new pr(this.cs,this.Rs,this.persistence.xh()),this.rh=t.Mh(),this.Uh.Kh(this.Ts);}return t.prototype.vr=function(t){var e=this;return this.persistence.runTransaction("Collect garbage","readwrite-primary",function(n){return t.Mr(n,e.Qh);});},t;}();function $i(/** Manages our in-memory or durable persistence. */t,e,n,r){return new Wi(t,e,n,r);}/**
   * Tells the LocalStore that the currently authenticated user has changed.
   *
   * In response the local store switches the mutation queue to the new user and
   * returns any resulting document changes.
   */ // PORTING NOTE: Android and iOS only return the documents affected by the
  // change.
  /**
   * Acknowledges the given batch.
   *
   * On the happy path when a batch is acknowledged, the local store will
   *
   *  + remove the batch from the mutation queue;
   *  + apply the changes to the remote document cache;
   *  + recalculate the latency compensated view implied by those changes (there
   *    may be mutations in the queue that affect the documents but haven't been
   *    acknowledged yet); and
   *  + give the changed documents back the sync engine
   *
   * @returns The resulting (modified) documents.
   */function Yi(t,e){var n=D$1(t);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",function(t){var r=e.batch.keys(),i=n.cs.us({ls:!0});return function(t,e,n,r){var i=n.batch,o=i.keys(),s=Zn.resolve();return o.forEach(function(t){s=s.next(function(){return r.Ln(e,t);}).next(function(e){var o=e,s=n.Rn.get(t);S$1(null!==s),(!o||o.version.o(s)<0)&&(o=i.Tn(t,o,n))&&// We use the commitVersion as the readTime rather than the
  // document's updateTime since the updateTime is not advanced
  // for updates that do not modify the underlying document.
  r.xn(o,n.An);});}),s.next(function(){return t.Rs.Zr(e,i);});}(n,t,e,i).next(function(){return i.apply(t);}).next(function(){return n.Rs.so(t);}).next(function(){return n.Ts.bs(t,r);});});}/**
   * Removes mutations from the MutationQueue for the specified batch;
   * LocalDocuments will be recalculated.
   *
   * @returns The resulting modified documents.
   */ /**
   * Returns the last consistent snapshot processed (used by the RemoteStore to
   * determine whether to buffer incoming snapshots from the backend).
   */function Xi(t){var e=D$1(t);return e.persistence.runTransaction("Get last remote snapshot version","readonly",function(t){return e.fs.Fo(t);});}/**
   * Updates the "ground-state" (remote) documents. We assume that the remote
   * event reflects any write batches that have been acknowledged or rejected
   * (i.e. we do not re-apply local mutations to updates from this event).
   *
   * LocalDocuments are re-calculated if there are remaining mutations in the
   * queue.
   */function Ji(t,e){var n=D$1(t),r=e.X,i=n.Qh;return n.persistence.runTransaction("Apply remote event","readwrite-primary",function(t){var o=n.cs.us({ls:!0});// Reset newTargetDataByTargetMap in case this transaction gets re-run.
  i=n.Qh;var s=[];e.Qt.forEach(function(e,o){var u=i.get(o);if(u){// Only update the remote keys if the target is still active. This
  // ensures that we can persist the updated target data along with
  // the updated assignment.
  s.push(n.fs.Wo(t,e.Xt,o).next(function(){return n.fs.ds(t,e.Jt,o);}));var a=e.resumeToken;// Update the resume token if the change includes one.
  if(a.H()>0){var c=u.tt(a,r).Z(t.Go);i=i.nt(o,c),// Update the target data if there are target changes (or if
  // sufficient time has passed since the last update).
  /**
       * Returns true if the newTargetData should be persisted during an update of
       * an active target. TargetData should always be persisted when a target is
       * being released and should not call this function.
       *
       * While the target is active, TargetData updates can be omitted when nothing
       * about the target has changed except metadata like the resume token or
       * snapshot version. Occasionally it's worth the extra write to prevent these
       * values from getting too stale after a crash, but this doesn't have to be
       * too frequent.
       */function(t,e,n){// Always persist target data if we don't already have a resume token.
  return S$1(e.resumeToken.H()>0),0===t.resumeToken.H()||// Don't allow resume token changes to be buffered indefinitely. This
  // allows us to be reasonably up-to-date after a crash and avoids needing
  // to loop over all active queries on shutdown. Especially in the browser
  // we may not get time to do anything interesting while the current tab is
  // closing.
  e.X.I()-t.X.I()>=3e8||n.Jt.size+n.Yt.size+n.Xt.size>0;}(u,c,e)&&s.push(n.fs.Lo(t,c));}}});var u=vt();// HACK: The only reason we allow a null snapshot version is so that we
  // can synthesize remote events when we get permission denied errors while
  // trying to resolve the state of a locally cached document that is in
  // limbo.
  if(e.jt.forEach(function(r,i){e.Kt.has(r)&&s.push(n.persistence.Br.qh(t,r));}),// Each loop iteration only affects its "own" doc, so it's safe to get all the remote
  // documents in advance in a single call.
  s.push(Zi(t,o,e.jt,r,void 0).next(function(t){u=t;})),!r.isEqual(z.min())){var a=n.fs.Fo(t).next(function(e){return n.fs.xo(t,t.Go,r);});s.push(a);}return Zn.Dn(s).next(function(){return o.apply(t);}).next(function(){return n.Ts.ws(t,u);});}).then(function(t){return n.Qh=i,t;});}/**
   * Populates document change buffer with documents from backend or a bundle.
   * Returns the document changes resulting from applying those documents.
   *
   * @param txn Transaction to use to read existing documents from storage.
   * @param documentBuffer Document buffer to collect the resulted changes to be
   *        applied to storage.
   * @param documents Documents to be applied.
   * @param globalVersion A `SnapshotVersion` representing the read time if all
   *        documents have the same read time.
   * @param documentVersions A DocumentKey-to-SnapshotVersion map if documents
   *        have their own read time.
   *
   * Note: this function will use `documentVersions` if it is defined;
   * when it is not defined, resorts to `globalVersion`.
   */function Zi(t,e,n,r,// TODO(wuandy): We could add `readTime` to MaybeDocument instead to remove
  // this parameter.
  i){var o=Tt();return n.forEach(function(t){return o=o.add(t);}),e.getEntries(t,o).next(function(t){var o=vt();return n.forEach(function(n,s){var u=t.get(n),a=(null==i?void 0:i.get(n))||r;// Note: The order of the steps below is important, since we want
  // to ensure that rejected limbo resolutions (which fabricate
  // NoDocuments with SnapshotVersion.min()) never add documents to
  // cache.
  s instanceof gn&&s.version.isEqual(z.min())?(// NoDocuments with SnapshotVersion.min() are used in manufactured
  // events. We remove these documents from cache since we lost
  // access.
  e.$n(n,a),o=o.nt(n,s)):null==u||s.version.o(u.version)>0||0===s.version.o(u.version)&&u.hasPendingWrites?(e.xn(s,a),o=o.nt(n,s)):E$1("LocalStore","Ignoring outdated watch update for ",n,". Current version:",u.version," Watch version:",s.version);}),o;})/**
   * Gets the mutation batch after the passed in batchId in the mutation queue
   * or null if empty.
   * @param afterBatchId If provided, the batch to search after.
   * @returns The next mutation or null if there wasn't one.
   */;}function to(t,e){var n=D$1(t);return n.persistence.runTransaction("Get next mutation batch","readonly",function(t){return void 0===e&&(e=-1),n.Rs.Hr(t,e);});}/**
   * Reads the current value of a Document with a given key or null if not
   * found - used for testing.
   */ /**
   * Assigns the given target an internal ID so that its results can be pinned so
   * they don't get GC'd. A target must be allocated in the local store before
   * the store can be used to manage its view.
   *
   * Allocating an already allocated `Target` will return the existing `TargetData`
   * for that `Target`.
   */function eo(t,e){var n=D$1(t);return n.persistence.runTransaction("Allocate target","readwrite",function(t){var r;return n.fs.Uo(t,e).next(function(i){return i?(// This target has been listened to previously, so reuse the
  // previous targetID.
  // TODO(mcg): freshen last accessed date?
  r=i,Zn.resolve(r)):n.fs.Do(t).next(function(i){return r=new st(e,i,0/* Listen */,t.Go),n.fs.Mo(t,r).next(function(){return r;});});});}).then(function(t){// If Multi-Tab is enabled, the existing target data may be newer than
  // the in-memory data
  var r=n.Qh.get(t.targetId);return (null===r||t.X.o(r.X)>0)&&(n.Qh=n.Qh.nt(t.targetId,t),n.Wh.set(e,t.targetId)),t;});}/**
   * Returns the TargetData as seen by the LocalStore, including updates that may
   * have not yet been persisted to the TargetCache.
   */ // Visible for testing.
  /**
   * Unpins all the documents associated with the given target. If
   * `keepPersistedTargetData` is set to false and Eager GC enabled, the method
   * directly removes the associated target data from the target cache.
   *
   * Releasing a non-existing `Target` is a no-op.
   */ // PORTING NOTE: `keepPersistedTargetData` is multi-tab only.
  function no(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var e,o,s,u;return __generator$2(this,function(n){switch(n.label){case 0:e=D$1(t),o=e.Qh.get(r),s=i?"readwrite":"readwrite-primary",n.label=1;case 1:return n.trys.push([1,4,,5]),i?[3/*break*/,3]:[4/*yield*/,e.persistence.runTransaction("Release target",s,function(t){return e.persistence.Br.removeTarget(t,o);})];case 2:n.sent(),n.label=3;case 3:return [3/*break*/,5];case 4:if(!br(u=n.sent()))throw u;// All `releaseTarget` does is record the final metadata state for the
  // target, but we've been recording this periodically during target
  // activity. If we lose this write this could cause a very slight
  // difference in the order of target deletion during GC, but we
  // don't define exact LRU semantics so this is acceptable.
  return E$1("LocalStore","Failed to update sequence numbers for target "+r+": "+u),[3/*break*/,5];case 5:return e.Qh=e.Qh.remove(r),e.Wh.delete(o.target),[2/*return*/];}});});}/**
   * Runs the specified query against the local store and returns the results,
   * potentially taking advantage of query data from previous executions (such
   * as the set of remote keys).
   *
   * @param usePreviousResults Whether results from previous executions can
   * be used to optimize this query execution.
   */function ro(t,e,n){var r=D$1(t),i=z.min(),o=Tt();return r.persistence.runTransaction("Execute query","readonly",function(t){return function(t,e,n){var r=D$1(t),i=r.Wh.get(n);return void 0!==i?Zn.resolve(r.Qh.get(i)):r.fs.Uo(e,n);}(r,t,_n(e)).next(function(e){if(e)return i=e.lastLimboFreeSnapshotVersion,r.fs.Ko(t,e.targetId).next(function(t){o=t;});}).next(function(){return r.Uh.Ss(t,e,n?i:z.min(),n?o:Tt());}).next(function(t){return {documents:t,Gh:o};});});}// PORTING NOTE: Multi-Tab only.
  function io(t,e){var n=D$1(t),r=D$1(n.fs),i=n.Qh.get(e);return i?Promise.resolve(i.target):n.persistence.runTransaction("Get target data","readonly",function(t){return r.Oe(t,e).next(function(t){return t?t.target:null;});});}/**
   * Returns the set of documents that have been updated since the last call.
   * If this is the first call, returns the set of changes since client
   * initialization. Further invocations will return document that have changed
   * since the prior call.
   */ // PORTING NOTE: Multi-Tab only.
  function oo(t){var e=D$1(t),n=D$1(e.cs);return e.persistence.runTransaction("Get new document changes","readonly",function(t){return n.fo(t,e.jh);}).then(function(t){var n=t.ss,r=t.readTime;return e.jh=r,n;});}/**
   * Reads the newest document change from persistence and moves the internal
   * synchronization marker forward so that calls to `getNewDocumentChanges()`
   * only return changes that happened after client initialization.
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
   */function so(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){if(t.code!==q$1.FAILED_PRECONDITION||t.message!==fr)throw t;return E$1("LocalStore","Unexpectedly lost primary lease"),[2/*return*/];});});}/**
   * Saves the given `NamedQuery` to local persistence.
   */function uo(t,r,i){return void 0===i&&(i=Tt()),__awaiter$2(this,void 0,void 0,function(){var e,o;return __generator$2(this,function(n){switch(n.label){case 0:return [4/*yield*/,eo(t,_n(Xr(r.bundledQuery)))];case 1:return e=n.sent(),[2/*return*/,(o=D$1(t)).persistence.runTransaction("Save named query","readwrite",function(t){var n=fe(r.readTime);// Simply save the query itself if it is older than what the SDK already
  // has.
  if(e.X.o(n)>=0)return o.rh.yo(t,r);// Update existing target data because the query from the bundle is newer.
  var s=e.tt(rt.J,n);return o.Qh=o.Qh.nt(s.targetId,s),o.fs.Lo(t,s).next(function(){return o.fs._s(t,e.targetId);}).next(function(){return o.fs.ds(t,i,e.targetId);}).next(function(){return o.rh.yo(t,r);});})];}});});}/**
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
   */var ao=/** @class */function(){function t(){// A set of outstanding references to a document sorted by key.
  this.zh=new pt(co.Hh),// A set of outstanding references to a document sorted by target id.
  this.Jh=new pt(co.Yh)/** Returns true if the reference set contains no references. */;}return t.prototype._=function(){return this.zh._();},/** Adds a reference to the given document key for the given ID. */t.prototype.Qo=function(t,e){var n=new co(t,e);this.zh=this.zh.add(n),this.Jh=this.Jh.add(n);},/** Add references to the given document keys for the given ID. */t.prototype.Xh=function(t,e){var n=this;t.forEach(function(t){return n.Qo(t,e);});},/**
       * Removes a reference to the given document key for the given
       * ID.
       */t.prototype.jo=function(t,e){this.Zh(new co(t,e));},t.prototype.ta=function(t,e){var n=this;t.forEach(function(t){return n.jo(t,e);});},/**
       * Clears all references with a given ID. Calls removeRef() for each key
       * removed.
       */t.prototype.ea=function(t){var e=this,n=new W$1(new Q$1([])),r=new co(n,t),i=new co(n,t+1),o=[];return this.Jh.vt([r,i],function(t){e.Zh(t),o.push(t.key);}),o;},t.prototype.na=function(){var t=this;this.zh.forEach(function(e){return t.Zh(e);});},t.prototype.Zh=function(t){this.zh=this.zh.delete(t),this.Jh=this.Jh.delete(t);},t.prototype.sa=function(t){var e=new W$1(new Q$1([])),n=new co(e,t),r=new co(e,t+1),i=Tt();return this.Jh.vt([n,r],function(t){i=i.add(t.key);}),i;},t.prototype.io=function(t){var e=new co(t,0),n=this.zh.Dt(e);return null!==n&&t.isEqual(n.key);},t;}(),co=/** @class */function(){function t(t,e){this.key=t,this.ia=e/** Compare by key then by ID */;}return t.Hh=function(t,e){return W$1.P(t.key,e.key)||O$1(t.ia,e.ia);},/** Compare by ID then by key */t.Yh=function(t,e){return O$1(t.ia,e.ia)||W$1.P(t.key,e.key);},t;}(),ho=/** @class */function(){function t(t){this.uid=t;}return t.prototype.Qr=function(){return null!=this.uid;},/**
       * Returns a key representing this user, suitable for inclusion in a
       * dictionary.
       */t.prototype.ra=function(){return this.Qr()?"uid:"+this.uid:"anonymous-user";},t.prototype.isEqual=function(t){return t.uid===this.uid;},t;}();/** A user with a null UID. */ho.UNAUTHENTICATED=new ho(null),// TODO(mikelehen): Look into getting a proper uid-equivalent for
  // non-FirebaseAuth providers.
  ho.oa=new ho("google-credentials-uid"),ho.ha=new ho("first-party-uid");/**
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
   */var fo=function fo(t,e){this.user=e,this.type="OAuth",this.aa={},// Set the headers using Object Literal notation to avoid minification
  this.aa.Authorization="Bearer "+t;},lo=/** @class */function(){function t(){/**
           * Stores the listener registered with setChangeListener()
           * This isn't actually necessary since the UID never changes, but we use this
           * to verify the listen contract is adhered to in tests.
           */this.ua=null;}return t.prototype.getToken=function(){return Promise.resolve(null);},t.prototype.ca=function(){},t.prototype.la=function(t){this.ua=t,// Fire with initial user.
  t(ho.UNAUTHENTICATED);},t.prototype._a=function(){this.ua=null;},t;}(),po=/** @class */function(){function t(t){var e=this;/**
           * The auth token listener registered with FirebaseApp, retained here so we
           * can unregister it.
           */this.fa=null,/** Tracks the current User. */this.currentUser=ho.UNAUTHENTICATED,this.da=!1,/**
               * Counter used to detect if the token changed while a getToken request was
               * outstanding.
               */this.wa=0,/** The listener registered with setChangeListener(). */this.ua=null,this.forceRefresh=!1,this.fa=function(){e.wa++,e.currentUser=e.Ta(),e.da=!0,e.ua&&e.ua(e.currentUser);},this.wa=0,this.auth=t.getImmediate({optional:!0}),this.auth?this.auth.addAuthTokenListener(this.fa):(// if auth is not available, invoke tokenListener once with null token
  this.fa(null),t.get().then(function(t){e.auth=t,e.fa&&// tokenListener can be removed by removeChangeListener()
  e.auth.addAuthTokenListener(e.fa);},function(){}));}return t.prototype.getToken=function(){var t=this,e=this.wa,n=this.forceRefresh;// Take note of the current value of the tokenCounter so that this method
  // can fail (with an ABORTED error) if there is a token change while the
  // request is outstanding.
  return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then(function(n){// Cancel the request since the token changed while the request was
  // outstanding so the response is potentially for a previous user (which
  // user, we can't be sure).
  return t.wa!==e?(E$1("FirebaseCredentialsProvider","getToken aborted due to token change."),t.getToken()):n?(S$1("string"==typeof n.accessToken),new fo(n.accessToken,t.currentUser)):null;}):Promise.resolve(null);},t.prototype.ca=function(){this.forceRefresh=!0;},t.prototype.la=function(t){this.ua=t,// Fire the initial event
  this.da&&t(this.currentUser);},t.prototype._a=function(){this.auth&&this.auth.removeAuthTokenListener(this.fa),this.fa=null,this.ua=null;},// Auth.getUid() can return null even with a user logged in. It is because
  // getUid() is synchronous, but the auth code populating Uid is asynchronous.
  // This method should only be called in the AuthTokenListener callback
  // to guarantee to get the actual user.
  t.prototype.Ta=function(){var t=this.auth&&this.auth.getUid();return S$1(null===t||"string"==typeof t),new ho(t);},t;}(),yo=/** @class */function(){function t(t,e){this.ma=t,this.Ea=e,this.type="FirstParty",this.user=ho.ha;}return Object.defineProperty(t.prototype,"aa",{get:function get(){var t={"X-Goog-AuthUser":this.Ea},e=this.ma.auth.Ia([]);return e&&(t.Authorization=e),t;},enumerable:!1,configurable:!0}),t;}(),vo=/** @class */function(){function t(t,e){this.ma=t,this.Ea=e;}return t.prototype.getToken=function(){return Promise.resolve(new yo(this.ma,this.Ea));},t.prototype.la=function(t){// Fire with initial uid.
  t(ho.ha);},t.prototype._a=function(){},t.prototype.ca=function(){},t;}(),mo=/** @class */function(){function t(t,e,n,r,i,o){this.Ws=t,this.Aa=n,this.Ra=r,this.Pa=i,this.listener=o,this.state=0/* Initial */,/**
               * A close count that's incremented every time the stream is closed; used by
               * getCloseGuardedDispatcher() to invalidate callbacks that happen after
               * close.
               */this.ga=0,this.Va=null,this.stream=null,this.Ui=new vr(t,e)/**
       * Returns true if start() has been called and no error has occurred. True
       * indicates the stream is open or in the process of opening (which
       * encompasses respecting backoff, getting auth tokens, and starting the
       * actual RPC). Use isOpen() to determine if the stream is open and ready for
       * outbound requests.
       */;}return t.prototype.ya=function(){return 1/* Starting */===this.state||2/* Open */===this.state||4/* Backoff */===this.state;},/**
       * Returns true if the underlying RPC is open (the onOpen() listener has been
       * called) and the stream is ready for outbound requests.
       */t.prototype.pa=function(){return 2/* Open */===this.state;},/**
       * Starts the RPC. Only allowed if isStarted() returns false. The stream is
       * not immediately ready for use: onOpen() will be invoked when the RPC is
       * ready for outbound requests, at which point isOpen() will return true.
       *
       * When start returns, isStarted() will return true.
       */t.prototype.start=function(){3/* Error */!==this.state?this.auth():this.ba();},/**
       * Stops the RPC. This call is idempotent and allowed regardless of the
       * current isStarted() state.
       *
       * When stop returns, isStarted() and isOpen() will both return false.
       */t.prototype.stop=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return this.ya()?[4/*yield*/,this.close(0/* Initial */)]:[3/*break*/,2];case 1:t.sent(),t.label=2;case 2:return [2/*return*/];}});});},/**
       * After an error the stream will usually back off on the next attempt to
       * start it. If the error warrants an immediate restart of the stream, the
       * sender can use this to indicate that the receiver should not back off.
       *
       * Each error will call the onClose() listener. That function can decide to
       * inhibit backoff if required.
       */t.prototype.va=function(){this.state=0/* Initial */,this.Ui.reset();},/**
       * Marks this stream as idle. If no further actions are performed on the
       * stream for one minute, the stream will automatically close itself and
       * notify the stream's onClose() handler with Status.OK. The stream will then
       * be in a !isStarted() state, requiring the caller to start the stream again
       * before further use.
       *
       * Only streams that are in state 'Open' can be marked idle, as all other
       * states imply pending network operations.
       */t.prototype.Sa=function(){var t=this;// Starts the idle time if we are in state 'Open' and are not yet already
  // running a timer (in which case the previous idle timeout still applies).
  this.pa()&&null===this.Va&&(this.Va=this.Ws.ei(this.Aa,6e4,function(){return t.Da();}));},/** Sends a message to the underlying stream. */t.prototype.Ca=function(t){this.Na(),this.stream.send(t);},/** Called by the idle timer when the stream should close due to inactivity. */t.prototype.Da=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){return this.pa()?[2/*return*/,this.close(0/* Initial */)]:[2/*return*/];});});},/** Marks the stream as active again. */t.prototype.Na=function(){this.Va&&(this.Va.cancel(),this.Va=null);},/**
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
       */t.prototype.close=function(t,r){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:// Notify the listener that the stream closed.
  // Cancel any outstanding timers (they're guaranteed not to execute).
  return this.Na(),this.Ui.cancel(),// Invalidates any stream-related callbacks (e.g. from auth or the
  // underlying stream), guaranteeing they won't execute.
  this.ga++,3/* Error */!==t?// If this is an intentional close ensure we don't delay our next connection attempt.
  this.Ui.reset():r&&r.code===q$1.RESOURCE_EXHAUSTED?(// Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
  T$1(r.toString()),T$1("Using maximum backoff delay to prevent overloading the backend."),this.Ui.Xs()):r&&r.code===q$1.UNAUTHENTICATED&&// "unauthenticated" error means the token was rejected. Try force refreshing it in case it
  // just expired.
  this.Pa.ca(),// Clean up the underlying stream because we are no longer interested in events.
  null!==this.stream&&(this.Fa(),this.stream.close(),this.stream=null),// This state must be assigned before calling onClose() to allow the callback to
  // inhibit backoff or otherwise manipulate the state in its non-started state.
  this.state=t,[4/*yield*/,this.listener.ka(r)];case 1:// Cancel any outstanding timers (they're guaranteed not to execute).
  // Notify the listener that the stream closed.
  return e.sent(),[2/*return*/];}});});},/**
       * Can be overridden to perform additional cleanup before the stream is closed.
       * Calling super.tearDown() is not required.
       */t.prototype.Fa=function(){},t.prototype.auth=function(){var t=this;this.state=1/* Starting */;var e=this.xa(this.ga),n=this.ga;// TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
  this.Pa.getToken().then(function(e){// Stream can be stopped while waiting for authentication.
  // TODO(mikelehen): We really should just use dispatchIfNotClosed
  // and let this dispatch onto the queue, but that opened a spec test can
  // of worms that I don't want to deal with in this PR.
  t.ga===n&&// Normally we'd have to schedule the callback on the AsyncQueue.
  // However, the following calls are safe to be called outside the
  // AsyncQueue since they don't chain asynchronous calls
  t.Ma(e);},function(n){e(function(){var e=new j(q$1.UNKNOWN,"Fetching auth token failed: "+n.message);return t.Oa(e);});});},t.prototype.Ma=function(t){var e=this,n=this.xa(this.ga);this.stream=this.$a(t),this.stream.La(function(){n(function(){return e.state=2/* Open */,e.listener.La();});}),this.stream.ka(function(t){n(function(){return e.Oa(t);});}),this.stream.onMessage(function(t){n(function(){return e.onMessage(t);});});},t.prototype.ba=function(){var t=this;this.state=4/* Backoff */,this.Ui.Zs(function(){return __awaiter$2(t,void 0,void 0,function(){return __generator$2(this,function(t){return this.state=0/* Initial */,this.start(),[2/*return*/];});});});},// Visible for tests
  t.prototype.Oa=function(t){// In theory the stream could close cleanly, however, in our current model
  // we never expect this to happen because if we stop a stream ourselves,
  // this callback will never be called. To prevent cases where we retry
  // without a backoff accidentally, we set the stream to error in all cases.
  return E$1("PersistentStream","close with error: "+t),this.stream=null,this.close(3/* Error */,t);},/**
       * Returns a "dispatcher" function that dispatches operations onto the
       * AsyncQueue but only runs them if closeCount remains unchanged. This allows
       * us to turn auth / stream callbacks into no-ops if the stream is closed /
       * re-opened, etc.
       */t.prototype.xa=function(t){var e=this;return function(n){e.Ws.ki(function(){return e.ga===t?n():(E$1("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve());});};},t;}(),go=/** @class */function(e){function n(t,n,r,i,o){var s=this;return (s=e.call(this,t,"listen_stream_connection_backoff"/* ListenStreamConnectionBackoff */,"listen_stream_idle"/* ListenStreamIdle */,n,r,o)||this).serializer=i,s;}return __extends$1(n,e),n.prototype.$a=function(t){return this.Ra.Ba("Listen",t);},n.prototype.onMessage=function(t){// A successful response means the stream is healthy
  this.Ui.reset();var e=function(t,e){var n;if("targetChange"in e){e.targetChange;// proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
  // if unset
  var r=function(t){return "NO_CHANGE"===t?0/* NoChange */:"ADD"===t?1/* Added */:"REMOVE"===t?2/* Removed */:"CURRENT"===t?3/* Current */:"RESET"===t?4/* Reset */:_();}(e.targetChange.targetChangeType||"NO_CHANGE"),i=e.targetChange.targetIds||[],o=function(t,e){return t.$e?(S$1(void 0===e||"string"==typeof e),rt.fromBase64String(e||"")):(S$1(void 0===e||e instanceof Uint8Array),rt.fromUint8Array(e||new Uint8Array()));}(t,e.targetChange.resumeToken),s=e.targetChange.cause,u=s&&function(t){var e=void 0===t.code?q$1.UNKNOWN:ct(t.code);return new j(e,t.message||"");}(s);n=new Lt(r,i,o,u||null);}else if("documentChange"in e){e.documentChange;var a=e.documentChange;a.document,a.document.name,a.document.updateTime;var c=ye(t,a.document.name),h=fe(a.document.updateTime),f=new pn({mapValue:{fields:a.document.fields}}),l=new mn(c,h,f,{}),p=a.targetIds||[],d=a.removedTargetIds||[];n=new Ot(p,d,l.key,l);}else if("documentDelete"in e){e.documentDelete;var y=e.documentDelete;y.document;var v=ye(t,y.document),m=y.readTime?fe(y.readTime):z.min(),g=new gn(v,m),w=y.removedTargetIds||[];n=new Ot([],w,g.key,g);}else if("documentRemove"in e){e.documentRemove;var b=e.documentRemove;b.document;var I=ye(t,b.document),E=b.removedTargetIds||[];n=new Ot([],E,I,null);}else {if(!("filter"in e))return _();e.filter;var T=e.filter;T.targetId;var N=T.count||0,A=new ut(N),D=T.targetId;n=new Pt(D,A);}return n;}(this.serializer,t),n=function(t){// We have only reached a consistent snapshot for the entire stream if there
  // is a read_time set and it applies to all targets (i.e. the list of
  // targets is empty). The backend is guaranteed to send such responses.
  if(!("targetChange"in t))return z.min();var e=t.targetChange;return e.targetIds&&e.targetIds.length?z.min():e.readTime?fe(e.readTime):z.min();}(t);return this.listener.qa(e,n);},/**
       * Registers interest in the results of the given target. If the target
       * includes a resumeToken it will be included in the request. Results that
       * affect the target will be streamed back as WatchChange messages that
       * reference the targetId.
       */n.prototype.Ua=function(t){var e={};e.database=ge(this.serializer),e.addTarget=function(t,e){var n,r=e.target;return (n=nt(r)?{documents:Ne(t,r)}:{query:Ae(t,r)}).targetId=e.targetId,e.resumeToken.H()>0?n.resumeToken=ce(t,e.resumeToken):e.X.o(z.min())>0&&(// TODO(wuandy): Consider removing above check because it is most likely true.
  // Right now, many tests depend on this behaviour though (leaving min() out
  // of serialization).
  n.readTime=ae(t,e.X.A())),n;}(this.serializer,t);var n=function(t,e){var n=function(t,e){switch(e){case 0/* Listen */:return null;case 1/* ExistenceFilterMismatch */:return "existence-filter-mismatch";case 2/* LimboResolution */:return "limbo-document";default:return _();}}(0,e.Y);return null==n?null:{"goog-listen-tags":n};}(this.serializer,t);n&&(e.labels=n),this.Ca(e);},/**
       * Unregisters interest in the results of the target associated with the
       * given targetId.
       */n.prototype.Qa=function(t){var e={};e.database=ge(this.serializer),e.removeTarget=t,this.Ca(e);},n;}(mo),wo=/** @class */function(e){function n(t,n,r,i,o){var s=this;return (s=e.call(this,t,"write_stream_connection_backoff"/* WriteStreamConnectionBackoff */,"write_stream_idle"/* WriteStreamIdle */,n,r,o)||this).serializer=i,s.Wa=!1,s;}return __extends$1(n,e),Object.defineProperty(n.prototype,"ja",{/**
           * Tracks whether or not a handshake has been successfully exchanged and
           * the stream is ready to accept mutations.
           */get:function get(){return this.Wa;},enumerable:!1,configurable:!0}),// Override of PersistentStream.start
  n.prototype.start=function(){this.Wa=!1,this.lastStreamToken=void 0,e.prototype.start.call(this);},n.prototype.Fa=function(){this.Wa&&this.Ka([]);},n.prototype.$a=function(t){return this.Ra.Ba("Write",t);},n.prototype.onMessage=function(t){if(// Always capture the last stream token.
  S$1(!!t.streamToken),this.lastStreamToken=t.streamToken,this.Wa){// A successful first write response means the stream is healthy,
  // Note, that we could consider a successful handshake healthy, however,
  // the write itself might be causing an error we want to back off from.
  this.Ui.reset();var e=function(t,e){return t&&t.length>0?(S$1(void 0!==e),t.map(function(t){return function(t,e){// NOTE: Deletes don't have an updateTime.
  var n=t.updateTime?fe(t.updateTime):fe(e);n.isEqual(z.min())&&(// The Firestore Emulator currently returns an update time of 0 for
  // deletes of non-existing documents (rather than null). This breaks the
  // test "get deleted doc while offline with source=cache" as NoDocuments
  // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
  // TODO(#2149): Remove this when Emulator is fixed
  n=fe(e));var r=null;return t.transformResults&&t.transformResults.length>0&&(r=t.transformResults),new $e(n,r);}(t,e);})):[];}(t.writeResults,t.commitTime),n=fe(t.commitTime);return this.listener.Ga(n,e);}// The first response is always the handshake response
  return S$1(!t.writeResults||0===t.writeResults.length),this.Wa=!0,this.listener.za();},/**
       * Sends an initial streamToken to the server, performing the handshake
       * required to make the StreamingWrite RPC work. Subsequent
       * calls should wait until onHandshakeComplete was called.
       */n.prototype.Ha=function(){// TODO(dimond): Support stream resumption. We intentionally do not set the
  // stream token on the handshake, ignoring any stream token we might have.
  var t={};t.database=ge(this.serializer),this.Ca(t);},/** Sends a group of mutations to the Firestore backend to apply. */n.prototype.Ka=function(t){var e=this,n={streamToken:this.lastStreamToken,writes:t.map(function(t){return Ee(e.serializer,t);})};this.Ca(n);},n;}(mo),bo=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this)||this).credentials=t,i.Ra=n,i.serializer=r,i.Ja=!1,i;}return __extends$1(n,e),n.prototype.Ya=function(){if(this.Ja)throw new j(q$1.FAILED_PRECONDITION,"The client has already been terminated.");},/** Gets an auth token and invokes the provided RPC. */n.prototype.Xa=function(t,e,n){var r=this;return this.Ya(),this.credentials.getToken().then(function(i){return r.Ra.Xa(t,e,n,i);}).catch(function(t){throw t.code===q$1.UNAUTHENTICATED&&r.credentials.ca(),t;});},/** Gets an auth token and invokes the provided RPC with streamed results. */n.prototype.Za=function(t,e,n){var r=this;return this.Ya(),this.credentials.getToken().then(function(i){return r.Ra.Za(t,e,n,i);}).catch(function(t){throw t.code===q$1.UNAUTHENTICATED&&r.credentials.ca(),t;});},n.prototype.terminate=function(){this.Ja=!1;},n;}(function(){}),Io=/** @class */function(){function t(t,e){this.bi=t,this.tu=e,/** The current OnlineState. */this.state="Unknown"/* Unknown */,/**
               * A count of consecutive failures to open the stream. If it reaches the
               * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
               * Offline.
               */this.eu=0,/**
               * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
               * transition from OnlineState.Unknown to OnlineState.Offline without waiting
               * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
               */this.nu=null,/**
               * Whether the client should log a warning message if it fails to connect to
               * the backend (initially true, cleared after a successful stream, or if we've
               * logged the message already).
               */this.su=!0/**
       * Called by RemoteStore when a watch stream is started (including on each
       * backoff attempt).
       *
       * If this is the first attempt, it sets the OnlineState to Unknown and starts
       * the onlineStateTimer.
       */;}return t.prototype.iu=function(){var t=this;0===this.eu&&(this.ru("Unknown"/* Unknown */),this.nu=this.bi.ei("online_state_timeout"/* OnlineStateTimeout */,1e4,function(){return t.nu=null,t.ou("Backend didn't respond within 10 seconds."),t.ru("Offline"/* Offline */),Promise.resolve();}));},/**
       * Updates our OnlineState as appropriate after the watch stream reports a
       * failure. The first failure moves us to the 'Unknown' state. We then may
       * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
       * actually transition to the 'Offline' state.
       */t.prototype.hu=function(t){"Online"/* Online */===this.state?this.ru("Unknown"/* Unknown */):(this.eu++,this.eu>=1&&(this.au(),this.ou("Connection failed 1 times. Most recent error: "+t.toString()),this.ru("Offline"/* Offline */)));},/**
       * Explicitly sets the OnlineState to the specified state.
       *
       * Note that this resets our timers / failure counters, etc. used by our
       * Offline heuristics, so must not be used in place of
       * handleWatchStreamStart() and handleWatchStreamFailure().
       */t.prototype.set=function(t){this.au(),this.eu=0,"Online"/* Online */===t&&(// We've connected to watch at least once. Don't warn the developer
  // about being offline going forward.
  this.su=!1),this.ru(t);},t.prototype.ru=function(t){t!==this.state&&(this.state=t,this.tu(t));},t.prototype.ou=function(t){var e="Could not reach Cloud Firestore backend. "+t+"\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.";this.su?(T$1(e),this.su=!1):E$1("OnlineStateTracker",e);},t.prototype.au=function(){null!==this.nu&&(this.nu.cancel(),this.nu=null);},t;}(),Eo=/** @class */function(){function t(/**
       * The local store, used to fill the write pipeline with outbound mutations.
       */t,/** The client-side proxy for interacting with the backend. */r,i,o,s){var u=this;this.os=t,this.uu=r,this.bi=i,/**
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
               */this.cu=[],/**
               * A mapping of watched targets that the client cares about tracking and the
               * user has explicitly called a 'listen' for this target.
               *
               * These targets may or may not have been sent to or acknowledged by the
               * server. On re-establishing the listen stream, these targets should be sent
               * to the server. The targets removed with unlistens are removed eagerly
               * without waiting for confirmation from the listen stream.
               */this.lu=new Map(),this._u=null,/**
               * A set of reasons for why the RemoteStore may be offline. If empty, the
               * RemoteStore may start its network connections.
               */this.fu=new Set(),this.du=s,this.du.wu(function(t){i.ki(function(){return __awaiter$2(u,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return this.Tu()?(E$1("RemoteStore","Restarting streams for network reachability change."),[4/*yield*/,this.mu()]):[3/*break*/,2];case 1:t.sent(),t.label=2;case 2:return [2/*return*/];}});});});}),this.Eu=new Io(i,o),// Create streams (but note they're not started yet).
  this.Iu=function(t,e,n){var r=D$1(t);return r.Ya(),new go(e,r.Ra,r.credentials,r.serializer,n);}(this.uu,i,{La:this.Au.bind(this),ka:this.Ru.bind(this),qa:this.Pu.bind(this)}),this.gu=function(t,e,n){var r=D$1(t);return r.Ya(),new wo(e,r.Ra,r.credentials,r.serializer,n);}(this.uu,i,{La:this.Vu.bind(this),ka:this.yu.bind(this),za:this.pu.bind(this),Ga:this.Ga.bind(this)});}/**
       * Starts up the remote store, creating streams, restoring state from
       * LocalStore, etc.
       */return t.prototype.start=function(){return this.enableNetwork();},/** Re-enables the network. Idempotent. */t.prototype.enableNetwork=function(){return this.fu.delete(0/* UserDisabled */),this.bu();},t.prototype.bu=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return this.Tu()?(this.vu()?this.Su():this.Eu.set("Unknown"/* Unknown */),[4/*yield*/,this.Du()]):[3/*break*/,2];case 1:// This will start the write stream if necessary.
  t.sent(),t.label=2;case 2:return [2/*return*/];}});});},/**
       * Temporarily disables the network. The network can be re-enabled using
       * enableNetwork().
       */t.prototype.disableNetwork=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return this.fu.add(0/* UserDisabled */),[4/*yield*/,this.Cu()];case 1:return t.sent(),// Set the OnlineState to Offline so get()s return from cache, etc.
  this.Eu.set("Offline"/* Offline */),[2/*return*/];}});});},t.prototype.Cu=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return [4/*yield*/,this.gu.stop()];case 1:return t.sent(),[4/*yield*/,this.Iu.stop()];case 2:return t.sent(),this.cu.length>0&&(E$1("RemoteStore","Stopping write stream with "+this.cu.length+" pending writes"),this.cu=[]),this.Nu(),[2/*return*/];}});});},t.prototype.ph=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return E$1("RemoteStore","RemoteStore shutting down."),this.fu.add(5/* Shutdown */),[4/*yield*/,this.Cu()];case 1:return t.sent(),this.du.ph(),// Set the OnlineState to Unknown (rather than Offline) to avoid potentially
  // triggering spurious listener events with cached data, etc.
  this.Eu.set("Unknown"/* Unknown */),[2/*return*/];}});});},/**
       * Starts new listen for the given target. Uses resume token if provided. It
       * is a no-op if the target of given `TargetData` is already being listened to.
       */t.prototype.listen=function(t){this.lu.has(t.targetId)||(// Mark this as something the client is currently listening for.
  this.lu.set(t.targetId,t),this.vu()?// The listen will be sent in onWatchStreamOpen
  this.Su():this.Iu.pa()&&this.Fu(t));},/**
       * Removes the listen from server. It is a no-op if the given target id is
       * not being listened to.
       */t.prototype.ku=function(t){this.lu.delete(t),this.Iu.pa()&&this.xu(t),0===this.lu.size&&(this.Iu.pa()?this.Iu.Sa():this.Tu()&&// Revert to OnlineState.Unknown if the watch stream is not open and we
  // have no listeners, since without any listens to send we cannot
  // confirm if the stream is healthy and upgrade to OnlineState.Online.
  this.Eu.set("Unknown"/* Unknown */));},/** {@link TargetMetadataProvider.getTargetDataForTarget} */t.prototype.Oe=function(t){return this.lu.get(t)||null;},/** {@link TargetMetadataProvider.getRemoteKeysForTarget} */t.prototype.Me=function(t){return this.Mu.Me(t);},/**
       * We need to increment the the expected number of pending responses we're due
       * from watch so we wait for the ack to process any messages from this target.
       */t.prototype.Fu=function(t){this._u.de(t.targetId),this.Iu.Ua(t);},/**
       * We need to increment the expected number of pending responses we're due
       * from watch so we wait for the removal on the server before we process any
       * messages from this target.
       */t.prototype.xu=function(t){this._u.de(t),this.Iu.Qa(t);},t.prototype.Su=function(){this._u=new Mt(this),this.Iu.start(),this.Eu.iu();},/**
       * Returns whether the watch stream should be started because it's necessary
       * and has not yet been started.
       */t.prototype.vu=function(){return this.Tu()&&!this.Iu.ya()&&this.lu.size>0;},t.prototype.Tu=function(){return 0===this.fu.size;},t.prototype.Nu=function(){this._u=null;},t.prototype.Au=function(){return __awaiter$2(this,void 0,void 0,function(){var t=this;return __generator$2(this,function(e){return this.lu.forEach(function(e,n){t.Fu(e);}),[2/*return*/];});});},t.prototype.Ru=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){return this.Nu(),// If we still need the watch stream, retry the connection.
  this.vu()?(this.Eu.hu(t),this.Su()):// No need to restart watch stream because there are no active targets.
  // The online state is set to unknown because there is no active attempt
  // at establishing a connection
  this.Eu.set("Unknown"/* Unknown */),[2/*return*/];});});},t.prototype.Pu=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o;return __generator$2(this,function(n){switch(n.label){case 0:if(this.Eu.set("Online"/* Online */),!(t instanceof Lt&&2/* Removed */===t.state&&t.cause))// Mark the client as online since we got a message from the server
  return [3/*break*/,6];n.label=1;case 1:return n.trys.push([1,3,,5]),[4/*yield*/,this.Ou(t)];case 2:return n.sent(),[3/*break*/,5];case 3:return e=n.sent(),E$1("RemoteStore","Failed to remove targets %s: %s ",t.targetIds.join(","),e),[4/*yield*/,this.$u(e)];case 4:return n.sent(),[3/*break*/,5];case 5:return [3/*break*/,13];case 6:if(t instanceof Ot?this._u.Pe(t):t instanceof Pt?this._u.De(t):this._u.ye(t),r.isEqual(z.min()))return [3/*break*/,13];n.label=7;case 7:return n.trys.push([7,11,,13]),[4/*yield*/,Xi(this.os)];case 8:return i=n.sent(),r.o(i)>=0?[4/*yield*/,this.Lu(r)]:[3/*break*/,10];// We have received a target change with a global snapshot if the snapshot
  // version is not equal to SnapshotVersion.min().
  case 9:// We have received a target change with a global snapshot if the snapshot
  // version is not equal to SnapshotVersion.min().
  n.sent(),n.label=10;case 10:return [3/*break*/,13];case 11:return E$1("RemoteStore","Failed to raise snapshot:",o=n.sent()),[4/*yield*/,this.$u(o)];case 12:return n.sent(),[3/*break*/,13];case 13:return [2/*return*/];}});});},/**
       * Recovery logic for IndexedDB errors that takes the network offline until
       * `op` succeeds. Retries are scheduled with backoff using
       * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
       * validated via a generic operation.
       *
       * The returned Promise is resolved once the network is disabled and before
       * any retry attempt.
       */t.prototype.$u=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var i=this;return __generator$2(this,function(o){switch(o.label){case 0:if(!br(t))throw t;// Disable network and raise offline snapshots
  return this.fu.add(1/* IndexedDbFailed */),[4/*yield*/,this.Cu()];case 1:// Disable network and raise offline snapshots
  return o.sent(),this.Eu.set("Offline"/* Offline */),r||(// Use a simple read operation to determine if IndexedDB recovered.
  // Ideally, we would expose a health check directly on SimpleDb, but
  // RemoteStore only has access to persistence through LocalStore.
  r=function r(){return Xi(i.os);}),// Probe IndexedDB periodically and re-enable network
  this.bi.Hi(function(){return __awaiter$2(i,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return E$1("RemoteStore","Retrying IndexedDB access"),[4/*yield*/,r()];case 1:return t.sent(),this.fu.delete(1/* IndexedDbFailed */),[4/*yield*/,this.bu()];case 2:return t.sent(),[2/*return*/];}});});}),[2/*return*/];}});});},/**
       * Executes `op`. If `op` fails, takes the network offline until `op`
       * succeeds. Returns after the first attempt.
       */t.prototype.Bu=function(t){var e=this;return t().catch(function(n){return e.$u(n,t);});},/**
       * Takes a batch of changes from the Datastore, repackages them as a
       * RemoteEvent, and passes that on to the listener, which is typically the
       * SyncEngine.
       */t.prototype.Lu=function(t){var e=this,n=this._u.Fe(t);// Update in-memory resume tokens. LocalStore will update the
  // persistent view of these when applying the completed RemoteEvent.
  // Finally raise remote event
  return n.Qt.forEach(function(n,r){if(n.resumeToken.H()>0){var i=e.lu.get(r);// A watched target might have been removed already.
  i&&e.lu.set(r,i.tt(n.resumeToken,t));}}),// Re-establish listens for the targets that have been invalidated by
  // existence filter mismatches.
  n.Wt.forEach(function(t){var n=e.lu.get(t);if(n){// Clear the resume token for the target, since we're in a known mismatch
  // state.
  e.lu.set(t,n.tt(rt.J,n.X)),// Cause a hard reset by unwatching and rewatching immediately, but
  // deliberately don't send a resume token so that we get a full update.
  e.xu(t);// Mark the target we send as being on behalf of an existence filter
  // mismatch, but don't actually retain that in listenTargets. This ensures
  // that we flag the first re-listen this way without impacting future
  // listens of this target (that might happen e.g. on reconnect).
  var r=new st(n.target,t,1/* ExistenceFilterMismatch */,n.sequenceNumber);e.Fu(r);}}),this.Mu.qu(n);},/** Handles an error on a target */t.prototype.Ou=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r,i,o;return __generator$2(this,function(n){switch(n.label){case 0:e=t.cause,r=0,i=t.targetIds,n.label=1;case 1:return r<i.length?(o=i[r],this.lu.has(o)?[4/*yield*/,this.Mu.Uu(o,e)]:[3/*break*/,3]):[3/*break*/,5];case 2:n.sent(),this.lu.delete(o),this._u.removeTarget(o),n.label=3;case 3:n.label=4;case 4:return r++,[3/*break*/,1];case 5:return [2/*return*/];}});});},/**
       * Attempts to fill our write pipeline with writes from the LocalStore.
       *
       * Called internally to bootstrap or refill the write pipeline and by
       * SyncEngine whenever there are new mutations to process.
       *
       * Starts the write stream if necessary.
       */t.prototype.Du=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e,r;return __generator$2(this,function(n){switch(n.label){case 0:t=this.cu.length>0?this.cu[this.cu.length-1].batchId:-1,n.label=1;case 1:if(!this.Qu())return [3/*break*/,7];n.label=2;case 2:return n.trys.push([2,4,,6]),[4/*yield*/,to(this.os,t)];case 3:return null===(e=n.sent())?(0===this.cu.length&&this.gu.Sa(),[3/*break*/,7]):(t=e.batchId,this.Wu(e),[3/*break*/,6]);case 4:return r=n.sent(),[4/*yield*/,this.$u(r)];case 5:return n.sent(),[3/*break*/,6];case 6:return [3/*break*/,1];case 7:return this.ju()&&this.Ku(),[2/*return*/];}});});},/**
       * Returns true if we can add to the write pipeline (i.e. the network is
       * enabled and the write pipeline is not full).
       */t.prototype.Qu=function(){return this.Tu()&&this.cu.length<10;},// For testing
  t.prototype.Gu=function(){return this.cu.length;},/**
       * Queues additional writes to be sent to the write stream, sending them
       * immediately if the write stream is established.
       */t.prototype.Wu=function(t){this.cu.push(t),this.gu.pa()&&this.gu.ja&&this.gu.Ka(t.mutations);},t.prototype.ju=function(){return this.Tu()&&!this.gu.ya()&&this.cu.length>0;},t.prototype.Ku=function(){this.gu.start();},t.prototype.Vu=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){return this.gu.Ha(),[2/*return*/];});});},t.prototype.pu=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e,r;return __generator$2(this,function(n){// Send the write pipeline now that the stream is established.
  for(t=0,e=this.cu;t<e.length;t++){r=e[t],this.gu.Ka(r.mutations);}return [2/*return*/];});});},t.prototype.Ga=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o=this;return __generator$2(this,function(n){switch(n.label){case 0:return e=this.cu.shift(),i=Jn.from(e,t,r),[4/*yield*/,this.Bu(function(){return o.Mu.zu(i);})];case 1:// It's possible that with the completion of this mutation another
  // slot has freed up.
  return n.sent(),[4/*yield*/,this.Du()];case 2:// It's possible that with the completion of this mutation another
  // slot has freed up.
  return n.sent(),[2/*return*/];}});});},t.prototype.yu=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:return t&&this.gu.ja?[4/*yield*/,this.Hu(t)]:[3/*break*/,2];// This error affects the actual write.
  case 1:// This error affects the actual write.
  e.sent(),e.label=2;case 2:// If the write stream closed after the write handshake completes, a write
  // operation failed and we fail the pending operation.
  // The write stream might have been started by refilling the write
  // pipeline for failed writes
  return this.ju()&&this.Ku(),[2/*return*/];}});});},t.prototype.Hu=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r,i=this;return __generator$2(this,function(n){switch(n.label){case 0:return at(r=t.code)&&r!==q$1.ABORTED?(e=this.cu.shift(),// In this case it's also unlikely that the server itself is melting
  // down -- this was just a bad request so inhibit backoff on the next
  // restart.
  this.gu.va(),[4/*yield*/,this.Bu(function(){return i.Mu.Ju(e.batchId,t);})]):[3/*break*/,3];case 1:// It's possible that with the completion of this mutation
  // another slot has freed up.
  return n.sent(),[4/*yield*/,this.Du()];case 2:// In this case it's also unlikely that the server itself is melting
  // down -- this was just a bad request so inhibit backoff on the next
  // restart.
  // It's possible that with the completion of this mutation
  // another slot has freed up.
  n.sent(),n.label=3;case 3:return [2/*return*/];}});});},t.prototype.mu=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return this.fu.add(4/* ConnectivityChange */),[4/*yield*/,this.Cu()];case 1:return t.sent(),this.Eu.set("Unknown"/* Unknown */),this.gu.va(),this.Iu.va(),this.fu.delete(4/* ConnectivityChange */),[4/*yield*/,this.bu()];case 2:return t.sent(),[2/*return*/];}});});},t.prototype.Yu=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:return this.bi.Xi(),// Tear down and re-create our network streams. This will ensure we get a
  // fresh auth token for the new user and re-fill the write pipeline with
  // new mutations from the LocalStore (since mutations are per-user).
  E$1("RemoteStore","RemoteStore received new credentials"),this.fu.add(3/* CredentialChange */),[4/*yield*/,this.Cu()];case 1:return e.sent(),this.Eu.set("Unknown"/* Unknown */),[4/*yield*/,this.Mu.Yu(t)];case 2:return e.sent(),this.fu.delete(3/* CredentialChange */),[4/*yield*/,this.bu()];case 3:return e.sent(),[2/*return*/];}});});},/**
       * Toggles the network state when the client gains or loses its primary lease.
       */t.prototype.Xu=function(t){return __awaiter$2(this,void 0,void 0,function(){var e;return __generator$2(this,function(n){switch(n.label){case 0:return t?(this.fu.delete(2/* IsSecondary */),[4/*yield*/,this.bu()]):[3/*break*/,2];case 1:return n.sent(),[3/*break*/,5];case 2:return (e=t)?[3/*break*/,4]:(this.fu.add(2/* IsSecondary */),[4/*yield*/,this.Cu()]);case 3:n.sent(),e=this.Eu.set("Unknown"/* Unknown */),n.label=4;case 4:n.label=5;case 5:return [2/*return*/];}});});},t;}();/** A CredentialsProvider that always yields an empty token. */ /**
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
  /** Assembles the key for a client state in WebStorage */function To(t,e){return "firestore_clients_"+t+"_"+e;}// The format of the WebStorage key that stores the mutation state is:
  //     firestore_mutations_<persistence_prefix>_<batch_id>
  //     (for unauthenticated users)
  // or: firestore_mutations_<persistence_prefix>_<batch_id>_<user_uid>
  // 'user_uid' is last to avoid needing to escape '_' characters that it might
  // contain.
  /** Assembles the key for a mutation batch in WebStorage */function No(t,e,n){var r="firestore_mutations_"+t+"_"+n;return e.Qr()&&(r+="_"+e.uid),r;}// The format of the WebStorage key that stores a query target's metadata is:
  //     firestore_targets_<persistence_prefix>_<target_id>
  /** Assembles the key for a query state in WebStorage */function Ao(t,e){return "firestore_targets_"+t+"_"+e;}// The WebStorage prefix that stores the primary tab's online state. The
  // format of the key is:
  //     firestore_online_state_<persistence_prefix>
  /**
   * Holds the state of a mutation batch, including its user ID, batch ID and
   * whether the batch is 'pending', 'acknowledged' or 'rejected'.
   */ // Visible for testing
  var _o=/** @class */function(){function t(t,e,n,r){this.user=t,this.batchId=e,this.state=n,this.error=r/**
       * Parses a MutationMetadata from its JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Zu=function(e,n,r){var i=JSON.parse(r),o="object"==_typeof(i)&&-1!==["pending","acknowledged","rejected"].indexOf(i.state)&&(void 0===i.error||"object"==_typeof(i.error)),s=void 0;return o&&i.error&&(o="string"==typeof i.error.message&&"string"==typeof i.error.code)&&(s=new j(i.error.code,i.error.message)),o?new t(e,n,i.state,s):(T$1("SharedClientState","Failed to parse mutation state for ID '"+n+"': "+r),null);},t.prototype.tc=function(){var t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t);},t;}(),So=/** @class */function(){function t(t,e,n){this.targetId=t,this.state=e,this.error=n/**
       * Parses a QueryTargetMetadata from its JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Zu=function(e,n){var r=JSON.parse(n),i="object"==_typeof(r)&&-1!==["not-current","current","rejected"].indexOf(r.state)&&(void 0===r.error||"object"==_typeof(r.error)),o=void 0;return i&&r.error&&(i="string"==typeof r.error.message&&"string"==typeof r.error.code)&&(o=new j(r.error.code,r.error.message)),i?new t(e,r.state,o):(T$1("SharedClientState","Failed to parse target state for ID '"+e+"': "+n),null);},t.prototype.tc=function(){var t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t);},t;}(),Do=/** @class */function(){function t(t,e){this.clientId=t,this.activeTargetIds=e/**
       * Parses a RemoteClientState from the JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Zu=function(e,n){for(var r=JSON.parse(n),i="object"==_typeof(r)&&r.activeTargetIds instanceof Array,o=At(),s=0;i&&s<r.activeTargetIds.length;++s){i=X$1(r.activeTargetIds[s]),o=o.add(r.activeTargetIds[s]);}return i?new t(e,o):(T$1("SharedClientState","Failed to parse client data for instance '"+e+"': "+n),null);},t;}(),ko=/** @class */function(){function t(t,e){this.clientId=t,this.onlineState=e/**
       * Parses a SharedOnlineState from its JSON representation in WebStorage.
       * Logs a warning and returns null if the format of the data is not valid.
       */;}return t.Zu=function(e){var n=JSON.parse(e);return "object"==_typeof(n)&&-1!==["Unknown","Online","Offline"].indexOf(n.onlineState)&&"string"==typeof n.clientId?new t(n.clientId,n.onlineState):(T$1("SharedClientState","Failed to parse online state: "+e),null);},t;}(),xo=/** @class */function(){function t(){this.activeTargetIds=At();}return t.prototype.ec=function(t){this.activeTargetIds=this.activeTargetIds.add(t);},t.prototype.nc=function(t){this.activeTargetIds=this.activeTargetIds.delete(t);},/**
       * Converts this entry into a JSON-encoded format we can use for WebStorage.
       * Does not encode `clientId` as it is part of the key in WebStorage.
       */t.prototype.tc=function(){var t={activeTargetIds:this.activeTargetIds.N(),updateTimeMs:Date.now()};return JSON.stringify(t);},t;}(),Oo=/** @class */function(){function t(t,e,n,r,i){this.window=t,this.Ws=e,this.persistenceKey=n,this.sc=r,this.Mu=null,this.tu=null,this.Ls=null,this.ic=this.rc.bind(this),this.oc=new ht(O$1),this.br=!1,/**
               * Captures WebStorage events that occur before `start()` is called. These
               * events are replayed once `WebStorageSharedClientState` is started.
               */this.hc=[];// Escape the special characters mentioned here:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
  var o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=i,this.ac=To(this.persistenceKey,this.sc),this.uc=/** Assembles the key for the current sequence number. */function(t){return "firestore_sequence_number_"+t;}(this.persistenceKey),this.oc=this.oc.nt(this.sc,new xo()),this.cc=new RegExp("^firestore_clients_"+o+"_([^_]*)$"),this.lc=new RegExp("^firestore_mutations_"+o+"_(\\d+)(?:_(.*))?$"),this._c=new RegExp("^firestore_targets_"+o+"_(\\d+)$"),this.fc=/** Assembles the key for the online state of the primary tab. */function(t){return "firestore_online_state_"+t;}(this.persistenceKey),this.dc=function(t){return "firestore_bundle_loaded_"+t;}(this.persistenceKey),// Rather than adding the storage observer during start(), we add the
  // storage observer during initialization. This ensures that we collect
  // events before other components populate their initial state (during their
  // respective start() calls). Otherwise, we might for example miss a
  // mutation that is added after LocalStore's start() processed the existing
  // mutations but before we observe WebStorage events.
  this.window.addEventListener("storage",this.ic);}/** Returns 'true' if WebStorage is available in the current environment. */return t.oi=function(t){return !(!t||!t.localStorage);},t.prototype.start=function(){return __awaiter$2(this,void 0,void 0,function(){var t,e,r,i,o,s,u,a,c,h,f,l=this;return __generator$2(this,function(n){switch(n.label){case 0:return [4/*yield*/,this.Mu.Ch()];case 1:for(t=n.sent(),e=0,r=t;e<r.length;e++){(i=r[e])!==this.sc&&(o=this.getItem(To(this.persistenceKey,i)))&&(s=Do.Zu(i,o))&&(this.oc=this.oc.nt(s.clientId,s));}for(this.wc(),(u=this.storage.getItem(this.fc))&&(a=this.Tc(u))&&this.mc(a),c=0,h=this.hc;c<h.length;c++){f=h[c],this.rc(f);}return this.hc=[],// Register a window unload hook to remove the client metadata entry from
  // WebStorage even if `shutdown()` was not called.
  this.window.addEventListener("unload",function(){return l.ph();}),this.br=!0,[2/*return*/];}});});},t.prototype.Us=function(t){this.setItem(this.uc,JSON.stringify(t));},t.prototype.Ec=function(){return this.Ic(this.oc);},t.prototype.Ac=function(t){var e=!1;return this.oc.forEach(function(n,r){r.activeTargetIds.has(t)&&(e=!0);}),e;},t.prototype.Rc=function(t){this.Pc(t,"pending");},t.prototype.gc=function(t,e,n){this.Pc(t,e,n),// Once a final mutation result is observed by other clients, they no longer
  // access the mutation's metadata entry. Since WebStorage replays events
  // in order, it is safe to delete the entry right after updating it.
  this.Vc(t);},t.prototype.yc=function(t){var e="not-current";// Lookup an existing query state if the target ID was already registered
  // by another tab
  if(this.Ac(t)){var n=this.storage.getItem(Ao(this.persistenceKey,t));if(n){var r=So.Zu(t,n);r&&(e=r.state);}}return this.pc.ec(t),this.wc(),e;},t.prototype.bc=function(t){this.pc.nc(t),this.wc();},t.prototype.vc=function(t){return this.pc.activeTargetIds.has(t);},t.prototype.Sc=function(t){this.removeItem(Ao(this.persistenceKey,t));},t.prototype.Dc=function(t,e,n){this.Cc(t,e,n);},t.prototype.Nc=function(t,e,n){var r=this;e.forEach(function(t){r.Vc(t);}),this.currentUser=t,n.forEach(function(t){r.Rc(t);});},t.prototype.Fc=function(t){this.kc(t);},t.prototype.xc=function(){this.Mc();},t.prototype.ph=function(){this.br&&(this.window.removeEventListener("storage",this.ic),this.removeItem(this.ac),this.br=!1);},t.prototype.getItem=function(t){var e=this.storage.getItem(t);return E$1("SharedClientState","READ",t,e),e;},t.prototype.setItem=function(t,e){E$1("SharedClientState","SET",t,e),this.storage.setItem(t,e);},t.prototype.removeItem=function(t){E$1("SharedClientState","REMOVE",t),this.storage.removeItem(t);},t.prototype.rc=function(t){var r=this,i=t;// Note: The function is typed to take Event to be interface-compatible with
  // `Window.addEventListener`.
  if(i.storageArea===this.storage){if(E$1("SharedClientState","EVENT",i.key,i.newValue),i.key===this.ac)return void T$1("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.Ws.Hi(function(){return __awaiter$2(r,void 0,void 0,function(){var t,e,r,o,s,u;return __generator$2(this,function(n){if(this.br){if(null!==i.key)if(this.cc.test(i.key)){if(null==i.newValue)return t=this.Oc(i.key),[2/*return*/,this.$c(t,null)];if(e=this.Lc(i.key,i.newValue))return [2/*return*/,this.$c(e.clientId,e)];}else if(this.lc.test(i.key)){if(null!==i.newValue&&(r=this.Bc(i.key,i.newValue)))return [2/*return*/,this.qc(r)];}else if(this._c.test(i.key)){if(null!==i.newValue&&(o=this.Uc(i.key,i.newValue)))return [2/*return*/,this.Qc(o)];}else if(i.key===this.fc){if(null!==i.newValue&&(s=this.Tc(i.newValue)))return [2/*return*/,this.mc(s)];}else if(i.key===this.uc)(u=function(t){var e=yr.Qs;if(null!=t)try{var n=JSON.parse(t);S$1("number"==typeof n),e=n;}catch(t){T$1("SharedClientState","Failed to read sequence number from WebStorage",t);}return e;}(i.newValue))!==yr.Qs&&this.Ls(u);else if(i.key===this.dc)return [2/*return*/,this.Mu.Wc()];}else this.hc.push(i);return [2/*return*/];});});});}},Object.defineProperty(t.prototype,"pc",{get:function get(){return this.oc.get(this.sc);},enumerable:!1,configurable:!0}),t.prototype.wc=function(){this.setItem(this.ac,this.pc.tc());},t.prototype.Pc=function(t,e,n){var r=new _o(this.currentUser,t,e,n),i=No(this.persistenceKey,this.currentUser,t);this.setItem(i,r.tc());},t.prototype.Vc=function(t){var e=No(this.persistenceKey,this.currentUser,t);this.removeItem(e);},t.prototype.kc=function(t){var e={clientId:this.sc,onlineState:t};this.storage.setItem(this.fc,JSON.stringify(e));},t.prototype.Cc=function(t,e,n){var r=Ao(this.persistenceKey,t),i=new So(t,e,n);this.setItem(r,i.tc());},t.prototype.Mc=function(){this.setItem(this.dc,"value-not-used");},/**
       * Parses a client state key in WebStorage. Returns null if the key does not
       * match the expected key format.
       */t.prototype.Oc=function(t){var e=this.cc.exec(t);return e?e[1]:null;},/**
       * Parses a client state in WebStorage. Returns 'null' if the value could not
       * be parsed.
       */t.prototype.Lc=function(t,e){var n=this.Oc(t);return Do.Zu(n,e);},/**
       * Parses a mutation batch state in WebStorage. Returns 'null' if the value
       * could not be parsed.
       */t.prototype.Bc=function(t,e){var n=this.lc.exec(t),r=Number(n[1]),i=void 0!==n[2]?n[2]:null;return _o.Zu(new ho(i),r,e);},/**
       * Parses a query target state from WebStorage. Returns 'null' if the value
       * could not be parsed.
       */t.prototype.Uc=function(t,e){var n=this._c.exec(t),r=Number(n[1]);return So.Zu(r,e);},/**
       * Parses an online state from WebStorage. Returns 'null' if the value
       * could not be parsed.
       */t.prototype.Tc=function(t){return ko.Zu(t);},t.prototype.qc=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){return t.user.uid===this.currentUser.uid?[2/*return*/,this.Mu.jc(t.batchId,t.state,t.error)]:(E$1("SharedClientState","Ignoring mutation for non-active user "+t.user.uid),[2/*return*/]);});});},t.prototype.Qc=function(t){return this.Mu.Kc(t.targetId,t.state,t.error);},t.prototype.$c=function(t,e){var n=this,r=e?this.oc.nt(t,e):this.oc.remove(t),i=this.Ic(this.oc),o=this.Ic(r),s=[],u=[];return o.forEach(function(t){i.has(t)||s.push(t);}),i.forEach(function(t){o.has(t)||u.push(t);}),this.Mu.Gc(s,u).then(function(){n.oc=r;});},t.prototype.mc=function(t){// We check whether the client that wrote this online state is still active
  // by comparing its client ID to the list of clients kept active in
  // IndexedDb. If a client does not update their IndexedDb client state
  // within 5 seconds, it is considered inactive and we don't emit an online
  // state event.
  this.oc.get(t.clientId)&&this.tu(t.onlineState);},t.prototype.Ic=function(t){var e=At();return t.forEach(function(t,n){e=e.Ct(n.activeTargetIds);}),e;},t;}(),Po=/** @class */function(){function t(){this.zc=new xo(),this.Hc={},this.tu=null,this.Ls=null;}return t.prototype.Rc=function(t){// No op.
  },t.prototype.gc=function(t,e,n){// No op.
  },t.prototype.yc=function(t){return this.zc.ec(t),this.Hc[t]||"not-current";},t.prototype.Dc=function(t,e,n){this.Hc[t]=e;},t.prototype.bc=function(t){this.zc.nc(t);},t.prototype.vc=function(t){return this.zc.activeTargetIds.has(t);},t.prototype.Sc=function(t){delete this.Hc[t];},t.prototype.Ec=function(){return this.zc.activeTargetIds;},t.prototype.Ac=function(t){return this.zc.activeTargetIds.has(t);},t.prototype.start=function(){return this.zc=new xo(),Promise.resolve();},t.prototype.Nc=function(t,e,n){// No op.
  },t.prototype.Fc=function(t){// No op.
  },t.prototype.ph=function(){},t.prototype.Us=function(t){},t.prototype.xc=function(){// No op.
  },t;}(),Lo=function Lo(t){this.key=t;},Ro=function Ro(t){this.key=t;},Mo=/** @class */function(){function t(t,/** Documents included in the remote target */e){this.query=t,this.Jc=e,this.Yc=null,/**
               * A flag whether the view is current with the backend. A view is considered
               * current after it has seen the current flag from the backend and did not
               * lose consistency within the watch stream (e.g. because of an existence
               * filter mismatch).
               */this.Ht=!1,/** Documents in the view but not in the remote target */this.Xc=Tt(),/** Document Keys that have local changes */this.Lt=Tt(),this.Zc=Rn(t),this.tl=new _t(this.Zc);}return Object.defineProperty(t.prototype,"el",{/**
           * The set of remote documents that the server has told us belongs to the target associated with
           * this view.
           */get:function get(){return this.Jc;},enumerable:!1,configurable:!0}),/**
       * Iterates over a set of doc changes, applies the query limit, and computes
       * what the new results should be, what the changes were, and whether we may
       * need to go back to the local cache for more results. Does not make any
       * changes to the view.
       * @param docChanges The doc changes to apply to this view.
       * @param previousChanges If this is being called with a refill, then start
       *        with this set of docs and changes instead of the current view.
       * @return a new set of docs, changes, and refill flag.
       */t.prototype.nl=function(t,e){var n=this,r=e?e.sl:new St(),i=e?e.tl:this.tl,o=e?e.Lt:this.Lt,s=i,u=!1,a=this.query.hn()&&i.size===this.query.limit?i.last():null,c=this.query.an()&&i.size===this.query.limit?i.first():null;// Drop documents out to meet limit/limitToLast requirement.
  if(t.ot(function(t,e){var h=i.get(t),f=e instanceof mn?e:null;f&&(f=Ln(n.query,f)?f:null);var l=!!h&&n.Lt.has(h.key),p=!!f&&(f.Ke||// We only consider committed mutations for documents that were
  // mutated during the lifetime of the view.
  n.Lt.has(f.key)&&f.hasCommittedMutations),d=!1;// Calculate change
  h&&f?h.data().isEqual(f.data())?l!==p&&(r.track({type:3/* Metadata */,doc:f}),d=!0):n.il(h,f)||(r.track({type:2/* Modified */,doc:f}),d=!0,(a&&n.Zc(f,a)>0||c&&n.Zc(f,c)<0)&&(// This doc moved from inside the limit to outside the limit.
  // That means there may be some other doc in the local cache
  // that should be included instead.
  u=!0)):!h&&f?(r.track({type:0/* Added */,doc:f}),d=!0):h&&!f&&(r.track({type:1/* Removed */,doc:h}),d=!0,(a||c)&&(// A doc was removed from a full limit query. We'll need to
  // requery from the local cache to see if we know about some other
  // doc that should be in the results.
  u=!0)),d&&(f?(s=s.add(f),o=p?o.add(t):o.delete(t)):(s=s.delete(t),o=o.delete(t)));}),this.query.hn()||this.query.an())for(;s.size>this.query.limit;){var h=this.query.hn()?s.last():s.first();s=s.delete(h.key),o=o.delete(h.key),r.track({type:1/* Removed */,doc:h});}return {tl:s,sl:r,rl:u,Lt:o};},t.prototype.il=function(t,e){// We suppress the initial change event for documents that were modified as
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
  t.prototype.Un=function(t,e,n){var r=this,i=this.tl;this.tl=t.tl,this.Lt=t.Lt;// Sort changes based on type and query comparator
  var o=t.sl.Ot();o.sort(function(t,e){return function(t,e){var n=function n(t){switch(t){case 0/* Added */:return 1;case 2/* Modified */:case 3/* Metadata */:// A metadata change is converted to a modified change at the public
  // api layer.  Since we sort by document key and then change type,
  // metadata and modified changes must be sorted equivalently.
  return 2;case 1/* Removed */:return 0;default:return _();}};return n(t)-n(e);}(t.type,e.type)||r.Zc(t.doc,e.doc);}),this.ol(n);var s=e?this.hl():[],u=0===this.Xc.size&&this.Ht?1/* Synced */:0/* Local */,a=u!==this.Yc;return this.Yc=u,0!==o.length||a?{snapshot:new Dt(this.query,t.tl,i,o,t.Lt,0/* Local */===u,a,/* excludesMetadataChanges= */!1),al:s}:{al:s};// no changes
  },/**
       * Applies an OnlineState change to the view, potentially generating a
       * ViewChange if the view's syncState changes as a result.
       */t.prototype.ul=function(t){return this.Ht&&"Offline"/* Offline */===t?(// If we're offline, set `current` to false and then call applyChanges()
  // to refresh our syncState and generate a ViewChange as appropriate. We
  // are guaranteed to get a new TargetChange that sets `current` back to
  // true once the client is back online.
  this.Ht=!1,this.Un({tl:this.tl,sl:new St(),Lt:this.Lt,rl:!1},/* updateLimboDocuments= */!1)):{al:[]};},/**
       * Returns whether the doc for the given key should be in limbo.
       */t.prototype.cl=function(t){// If the remote end says it's part of this query, it's not in limbo.
  return !this.Jc.has(t)&&// The local store doesn't think it's a result, so it shouldn't be in limbo.
  !!this.tl.has(t)&&!this.tl.get(t).Ke;},/**
       * Updates syncedDocuments, current, and limbo docs based on the given change.
       * Returns the list of changes to which docs are in limbo.
       */t.prototype.ol=function(t){var e=this;t&&(t.Jt.forEach(function(t){return e.Jc=e.Jc.add(t);}),t.Yt.forEach(function(t){}),t.Xt.forEach(function(t){return e.Jc=e.Jc.delete(t);}),this.Ht=t.Ht);},t.prototype.hl=function(){var t=this;// We can only determine limbo documents when we're in-sync with the server.
  if(!this.Ht)return [];// TODO(klimt): Do this incrementally so that it's not quadratic when
  // updating many documents.
  var e=this.Xc;this.Xc=Tt(),this.tl.forEach(function(e){t.cl(e.key)&&(t.Xc=t.Xc.add(e.key));});// Diff the new limbo docs with the old limbo docs.
  var n=[];return e.forEach(function(e){t.Xc.has(e)||n.push(new Ro(e));}),this.Xc.forEach(function(t){e.has(t)||n.push(new Lo(t));}),n;},/**
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
  t.prototype.ll=function(t){this.Jc=t.Gh,this.Xc=Tt();var e=this.nl(t.documents);return this.Un(e,/*updateLimboDocuments=*/!0);},/**
       * Returns a view snapshot as if this query was just listened to. Contains
       * a document add for every existing document and the `fromCache` and
       * `hasPendingWrites` status of the already established view.
       */ // PORTING NOTE: Multi-tab only.
  t.prototype._l=function(){return Dt.Ut(this.query,this.tl,this.Lt,0/* Local */===this.Yc);},t;}(),Vo=function Vo(/**
       * The query itself.
       */t,/**
       * The target number created by the client that is used in the watch
       * stream to identify this query.
       */e,/**
       * The view is responsible for computing the final merged truth of what
       * docs are in the query. It gets notified of local and remote changes,
       * and applies the query filters and limits to determine the most correct
       * possible results.
       */n){this.query=t,this.targetId=e,this.view=n;},Uo=function Uo(t){this.key=t,/**
               * Set to true once we've received a document. This is used in
               * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
               * decide whether it needs to manufacture a delete event for the target once
               * the target is CURRENT.
               */this.fl=!1;},Co=/** @class */function(){function t(t,e,n,// PORTING NOTE: Manages state synchronization in multi-tab environments.
  r,i,o){this.os=t,this.dl=e,this.uu=n,this.wl=r,this.currentUser=i,this.Tl=o,this.ml=null,this.El=new F$1(function(t){return On(t);},xn),this.Il=new Map(),/**
               * The keys of documents that are in limbo for which we haven't yet started a
               * limbo resolution query.
               */this.Al=[],/**
               * Keeps track of the target ID for each document that is in limbo with an
               * active target.
               */this.Rl=new ht(W$1.P),/**
               * Keeps track of the information about an active limbo resolution for each
               * active target ID that was started for the purpose of limbo resolution.
               */this.Pl=new Map(),this.gl=new ao(),/** Stores user completion handlers, indexed by User and BatchId. */this.Vl={},/** Stores user callbacks waiting for all pending writes to be acknowledged. */this.yl=new Map(),this.pl=Mi.So(),this.onlineState="Unknown"/* Unknown */,// The primary state is set to `true` or `false` immediately after Firestore
  // startup. In the interim, a client should only be considered primary if
  // `isPrimary` is true.
  this.bl=void 0;}return Object.defineProperty(t.prototype,"vl",{get:function get(){return !0===this.bl;},enumerable:!1,configurable:!0}),t.prototype.subscribe=function(t){this.ml=t;},t.prototype.listen=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r,i,o,s;return __generator$2(this,function(n){switch(n.label){case 0:return this.Sl("listen()"),(i=this.El.get(t))?(// PORTING NOTE: With Multi-Tab Web, it is possible that a query view
  // already exists when EventManager calls us for the first time. This
  // happens when the primary tab is already listening to this query on
  // behalf of another tab and the user of the primary also starts listening
  // to the query. EventManager will not have an assigned target ID in this
  // case and calls `listen` to obtain this ID.
  e=i.targetId,this.wl.yc(e),r=i.view._l(),[3/*break*/,4]):[3/*break*/,1];case 1:return [4/*yield*/,eo(this.os,_n(t))];case 2:return o=n.sent(),s=this.wl.yc(o.targetId),e=o.targetId,[4/*yield*/,this.Dl(t,e,"current"===s)];case 3:r=n.sent(),this.vl&&this.dl.listen(o),n.label=4;case 4:return [2/*return*/,r];}});});},/**
       * Registers a view for a previously unknown query and computes its initial
       * snapshot.
       */t.prototype.Dl=function(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var e,o,s,u,a,c;return __generator$2(this,function(n){switch(n.label){case 0:return [4/*yield*/,ro(this.os,t,/* usePreviousResults= */!0)];case 1:return e=n.sent(),o=new Mo(t,e.Gh),s=o.nl(e.documents),u=xt.zt(r,i&&"Offline"/* Offline */!==this.onlineState),a=o.Un(s,/* updateLimboDocuments= */this.vl,u),this.Cl(r,a.al),c=new Vo(t,r,o),[2/*return*/,(this.El.set(t,c),this.Il.has(r)?this.Il.get(r).push(t):this.Il.set(r,[t]),a.snapshot)];}});});},t.prototype.ku=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r,i=this;return __generator$2(this,function(n){switch(n.label){case 0:// Only clean up the query view and target if this is the only query mapped
  // to the target.
  return this.Sl("unlisten()"),e=this.El.get(t),(r=this.Il.get(e.targetId)).length>1?[2/*return*/,(this.Il.set(e.targetId,r.filter(function(e){return !xn(e,t);})),void this.El.delete(t))]:this.vl?(// We need to remove the local query target first to allow us to verify
  // whether any other client is still interested in this target.
  this.wl.bc(e.targetId),this.wl.Ac(e.targetId)?[3/*break*/,2]:[4/*yield*/,no(this.os,e.targetId,/*keepPersistedTargetData=*/!1).then(function(){i.wl.Sc(e.targetId),i.dl.ku(e.targetId),i.Nl(e.targetId);}).catch(so)]):[3/*break*/,3];case 1:n.sent(),n.label=2;case 2:return [3/*break*/,5];case 3:return this.Nl(e.targetId),[4/*yield*/,no(this.os,e.targetId,/*keepPersistedTargetData=*/!0)];case 4:n.sent(),n.label=5;case 5:return [2/*return*/];}});});},t.prototype.write=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o;return __generator$2(this,function(n){switch(n.label){case 0:this.Sl("write()"),n.label=1;case 1:return n.trys.push([1,5,,6]),[4/*yield*/,/* Accepts locally generated Mutations and commit them to storage. */function(t,e){var n,r=D$1(t),i=B.now(),o=e.reduce(function(t,e){return t.add(e.key);},Tt());return r.persistence.runTransaction("Locally write mutations","readwrite",function(t){return r.Ts.bs(t,o).next(function(o){n=o;for(// For non-idempotent mutations (such as `FieldValue.increment()`),
  // we record the base state in a separate patch mutation. This is
  // later used to guarantee consistent values and prevents flicker
  // even if the backend sends us an update that already includes our
  // transform.
  var s=[],u=0,a=e;u<a.length;u++){var c=a[u],h=en(c,n.get(c.key));null!=h&&// NOTE: The base state should only be applied if there's some
  // existing document to override, so use a Precondition of
  // exists=true
  s.push(new sn(c.key,h,yn(h.proto.mapValue),Ye.exists(!0)));}return r.Rs.jr(t,i,s,e);});}).then(function(t){var e=t.In(n);return {batchId:t.batchId,Nn:e};});}(this.os,t)];case 2:return e=n.sent(),this.wl.Rc(e.batchId),this.Fl(e.batchId,r),[4/*yield*/,this.kl(e.Nn)];case 3:return n.sent(),[4/*yield*/,this.dl.Du()];case 4:return n.sent(),[3/*break*/,6];case 5:return i=n.sent(),o=xr(i,"Failed to persist write"),r.reject(o),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.qu=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r=this;return __generator$2(this,function(n){switch(n.label){case 0:this.Sl("applyRemoteEvent()"),n.label=1;case 1:return n.trys.push([1,4,,6]),[4/*yield*/,Ji(this.os,t)];case 2:return e=n.sent(),// Update `receivedDocument` as appropriate for any limbo targets.
  t.Qt.forEach(function(t,e){var n=r.Pl.get(e);n&&(// Since this is a limbo resolution lookup, it's for a single document
  // and it could be added, modified, or removed, but not a combination.
  S$1(t.Jt.size+t.Yt.size+t.Xt.size<=1),t.Jt.size>0?n.fl=!0:t.Yt.size>0?S$1(n.fl):t.Xt.size>0&&(S$1(n.fl),n.fl=!1));}),[4/*yield*/,this.kl(e,t)];case 3:// Update `receivedDocument` as appropriate for any limbo targets.
  return n.sent(),[3/*break*/,6];case 4:return [4/*yield*/,so(n.sent())];case 5:return n.sent(),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.ul=function(t,e){// If we are the secondary client, we explicitly ignore the remote store's
  // online state (the local client may go offline, even though the primary
  // tab remains online) and only apply the primary tab's online state from
  // SharedClientState.
  if(this.vl&&0/* RemoteStore */===e||!this.vl&&1/* SharedClientState */===e){this.Sl("applyOnlineStateChange()");var n=[];this.El.forEach(function(e,r){var i=r.view.ul(t);i.snapshot&&n.push(i.snapshot);}),this.ml.xl(t),this.ml.qa(n),this.onlineState=t,this.vl&&this.wl.Fc(t);}},t.prototype.Uu=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o,s,u,a=this;return __generator$2(this,function(n){switch(n.label){case 0:return this.Sl("rejectListens()"),// PORTING NOTE: Multi-tab only.
  this.wl.Dc(t,"rejected",r),e=this.Pl.get(t),(i=e&&e.key)?(o=(o=new ht(W$1.P)).nt(i,new gn(i,z.min())),s=Tt().add(i),u=new kt(z.min(),/* targetChanges= */new Map(),/* targetMismatches= */new pt(O$1),o,s),[4/*yield*/,this.qu(u)]):[3/*break*/,2];case 1:return n.sent(),// Since this query failed, we won't want to manually unlisten to it.
  // We only remove it from bookkeeping after we successfully applied the
  // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
  // this query when the RemoteStore restarts the Watch stream, which should
  // re-trigger the target failure.
  this.Rl=this.Rl.remove(i),this.Pl.delete(t),this.Ml(),[3/*break*/,4];case 2:return [4/*yield*/,no(this.os,t,/* keepPersistedTargetData */!1).then(function(){return a.Nl(t,r);}).catch(so)];case 3:n.sent(),n.label=4;case 4:return [2/*return*/];}});});},t.prototype.zu=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r;return __generator$2(this,function(n){switch(n.label){case 0:this.Sl("applySuccessfulWrite()"),e=t.batch.batchId,n.label=1;case 1:return n.trys.push([1,4,,6]),[4/*yield*/,Yi(this.os,t)];case 2:return r=n.sent(),// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught
  // up), so we raise user callbacks first so that they consistently happen
  // before listen events.
  this.Ol(e,/*error=*/null),this.$l(e),this.wl.gc(e,"acknowledged"),[4/*yield*/,this.kl(r)];case 3:// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught
  // up), so we raise user callbacks first so that they consistently happen
  // before listen events.
  return n.sent(),[3/*break*/,6];case 4:return [4/*yield*/,so(n.sent())];case 5:return n.sent(),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.Ju=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e;return __generator$2(this,function(n){switch(n.label){case 0:this.Sl("rejectFailedWrite()"),n.label=1;case 1:return n.trys.push([1,4,,6]),[4/*yield*/,function(t,e){var n=D$1(t);return n.persistence.runTransaction("Reject batch","readwrite-primary",function(t){var r;return n.Rs.Gr(t,e).next(function(e){return S$1(null!==e),r=e.keys(),n.Rs.Zr(t,e);}).next(function(){return n.Rs.so(t);}).next(function(){return n.Ts.bs(t,r);});});}(this.os,t)];case 2:return e=n.sent(),// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught up),
  // so we raise user callbacks first so that they consistently happen before
  // listen events.
  this.Ol(t,r),this.$l(t),this.wl.gc(t,"rejected",r),[4/*yield*/,this.kl(e)];case 3:// The local store may or may not be able to apply the write result and
  // raise events immediately (depending on whether the watcher is caught up),
  // so we raise user callbacks first so that they consistently happen before
  // listen events.
  return n.sent(),[3/*break*/,6];case 4:return [4/*yield*/,so(n.sent())];case 5:return n.sent(),[3/*break*/,6];case 6:return [2/*return*/];}});});},t.prototype.Ll=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r,i,o;return __generator$2(this,function(n){switch(n.label){case 0:this.dl.Tu()||E$1("SyncEngine","The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled."),n.label=1;case 1:return n.trys.push([1,3,,4]),[4/*yield*/,function(t){var e=D$1(t);return e.persistence.runTransaction("Get highest unacknowledged batch id","readonly",function(t){return e.Rs.Jr(t);});}(this.os)];case 2:return -1===(e=n.sent())?[2/*return*/,void t.resolve()]:((r=this.yl.get(e)||[]).push(t),this.yl.set(e,r),[3/*break*/,4]);case 3:return i=n.sent(),o=xr(i,"Initialization of waitForPendingWrites() operation failed"),t.reject(o),[3/*break*/,4];case 4:return [2/*return*/];}});});},/**
       * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
       * if there are any.
       */t.prototype.$l=function(t){(this.yl.get(t)||[]).forEach(function(t){t.resolve();}),this.yl.delete(t);},/** Reject all outstanding callbacks waiting for pending writes to complete. */t.prototype.Bl=function(t){this.yl.forEach(function(e){e.forEach(function(e){e.reject(new j(q$1.CANCELLED,t));});}),this.yl.clear();},t.prototype.Fl=function(t,e){var n=this.Vl[this.currentUser.ra()];n||(n=new ht(O$1)),n=n.nt(t,e),this.Vl[this.currentUser.ra()]=n;},/**
       * Resolves or rejects the user callback for the given batch and then discards
       * it.
       */t.prototype.Ol=function(t,e){var n=this.Vl[this.currentUser.ra()];// NOTE: Mutations restored from persistence won't have callbacks, so it's
  // okay for there to be no callback for this ID.
  if(n){var r=n.get(t);r&&(e?r.reject(e):r.resolve(),n=n.remove(t)),this.Vl[this.currentUser.ra()]=n;}},t.prototype.Nl=function(t,e){var n=this;void 0===e&&(e=null),this.wl.bc(t);for(var r=0,i=this.Il.get(t);r<i.length;r++){var o=i[r];this.El.delete(o),e&&this.ml.ql(o,e);}this.Il.delete(t),this.vl&&this.gl.ea(t).forEach(function(t){n.gl.io(t)||// We removed the last reference for this key
  n.Ul(t);});},t.prototype.Ul=function(t){// It's possible that the target already got removed because the query failed. In that case,
  // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
  var e=this.Rl.get(t);null!==e&&(this.dl.ku(e),this.Rl=this.Rl.remove(t),this.Pl.delete(e),this.Ml());},t.prototype.Cl=function(t,e){for(var n=0,r=e;n<r.length;n++){var i=r[n];i instanceof Lo?(this.gl.Qo(i.key,t),this.Ql(i)):i instanceof Ro?(E$1("SyncEngine","Document no longer in limbo: "+i.key),this.gl.jo(i.key,t),this.gl.io(i.key)||// We removed the last reference for this key
  this.Ul(i.key)):_();}},t.prototype.Ql=function(t){var e=t.key;this.Rl.get(e)||(E$1("SyncEngine","New document in limbo: "+e),this.Al.push(e),this.Ml());},/**
       * Starts listens for documents in limbo that are enqueued for resolution,
       * subject to a maximum number of concurrent resolutions.
       *
       * Without bounding the number of concurrent resolutions, the server can fail
       * with "resource exhausted" errors which can lead to pathological client
       * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
       */t.prototype.Ml=function(){for(;this.Al.length>0&&this.Rl.size<this.Tl;){var t=this.Al.shift(),e=this.pl.next();this.Pl.set(e,new Uo(t)),this.Rl=this.Rl.nt(t,e),this.dl.listen(new st(_n(Tn(t.path)),e,2/* LimboResolution */,yr.Qs));}},// Visible for testing
  t.prototype.Wl=function(){return this.Rl;},// Visible for testing
  t.prototype.jl=function(){return this.Al;},t.prototype.kl=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var i,o,s,u=this;return __generator$2(this,function(a){switch(a.label){case 0:return i=[],o=[],s=[],this.El.forEach(function(e,n){s.push(Promise.resolve().then(function(){var e=n.view.nl(t);return e.rl?ro(u.os,n.query,/* usePreviousResults= */!1).then(function(t){var r=t.documents;return n.view.nl(r,e);}):e;// The query has a limit and some docs were removed, so we need
  // to re-run the query against the local store to make sure we
  // didn't lose any good docs that had been past the limit.
  }).then(function(t){var e=r&&r.Qt.get(n.targetId),s=n.view.Un(t,/* updateLimboDocuments= */u.vl,e);if(u.Cl(n.targetId,s.al),s.snapshot){u.vl&&u.wl.Dc(n.targetId,s.snapshot.fromCache?"not-current":"current"),i.push(s.snapshot);var a=dr.$s(n.targetId,s.snapshot);o.push(a);}}));}),[4/*yield*/,Promise.all(s)];case 1:return a.sent(),this.ml.qa(i),[4/*yield*/,function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o,s,u,a,c,h,f;return __generator$2(this,function(n){switch(n.label){case 0:e=D$1(t),n.label=1;case 1:return n.trys.push([1,3,,4]),[4/*yield*/,e.persistence.runTransaction("notifyLocalViewChanges","readwrite",function(t){return Zn.forEach(r,function(n){return Zn.forEach(n.Ms,function(r){return e.persistence.Br.Qo(t,n.targetId,r);}).next(function(){return Zn.forEach(n.Os,function(r){return e.persistence.Br.jo(t,n.targetId,r);});});});})];case 2:return n.sent(),[3/*break*/,4];case 3:if(!br(i=n.sent()))throw i;// If `notifyLocalViewChanges` fails, we did not advance the sequence
  // number for the documents that were included in this transaction.
  // This might trigger them to be deleted earlier than they otherwise
  // would have, but it should not invalidate the integrity of the data.
  return E$1("LocalStore","Failed to update sequence numbers: "+i),[3/*break*/,4];case 4:for(o=0,s=r;o<s.length;o++){u=s[o],a=u.targetId,u.fromCache||(c=e.Qh.get(a),h=c.X,f=c.et(h),// Advance the last limbo free snapshot version
  e.Qh=e.Qh.nt(a,f));}return [2/*return*/];}});});}(this.os,o)];case 2:return a.sent(),[2/*return*/];}});});},t.prototype.Sl=function(t){},t.prototype.Yu=function(t){return __awaiter$2(this,void 0,void 0,function(){var r;return __generator$2(this,function(i){switch(i.label){case 0:return this.currentUser.isEqual(t)?[3/*break*/,3]:(E$1("SyncEngine","User change. New user:",t.ra()),[4/*yield*/,function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o,s;return __generator$2(this,function(n){switch(n.label){case 0:return e=D$1(t),i=e.Rs,o=e.Ts,[4/*yield*/,e.persistence.runTransaction("Handle user change","readonly",function(t){// Swap out the mutation queue, grabbing the pending mutation batches
  // before and after.
  var n;return e.Rs.Yr(t).next(function(s){return n=s,i=e.persistence.Nh(r),// Recreate our LocalDocumentsView using the new
  // MutationQueue.
  o=new pr(e.cs,i,e.persistence.xh()),i.Yr(t);}).next(function(e){for(var r=[],i=[],s=Tt(),u=0,a=n// Union the old/new changed keys.
  ;u<a.length;u++){var c=a[u];r.push(c.batchId);for(var h=0,f=c.mutations;h<f.length;h++){var l=f[h];s=s.add(l.key);}}for(var p=0,d=e;p<d.length;p++){var y=d[p];i.push(y.batchId);for(var v=0,m=y.mutations;v<m.length;v++){var g=m[v];s=s.add(g.key);}}// Return the set of all (potentially) changed documents and the list
  // of mutation batch IDs that were affected by change.
  return o.bs(t,s).next(function(t){return {Kl:t,Gl:r,zl:i};});});})];case 1:return s=n.sent(),[2/*return*/,(e.Rs=i,e.Ts=o,e.Uh.Kh(e.Ts),s)];}});});}(this.os,t)]);case 1:return r=i.sent(),this.currentUser=t,// Fails tasks waiting for pending writes requested by previous user.
  this.Bl("'waitForPendingWrites' promise is rejected due to a user change."),// TODO(b/114226417): Consider calling this only in the primary tab.
  this.wl.Nc(t,r.Gl,r.zl),[4/*yield*/,this.kl(r.Kl)];case 2:i.sent(),i.label=3;case 3:return [2/*return*/];}});});},t.prototype.Me=function(t){var e=this.Pl.get(t);if(e&&e.fl)return Tt().add(e.key);var n=Tt(),r=this.Il.get(t);if(!r)return n;for(var i=0,o=r;i<o.length;i++){var s=o[i],u=this.El.get(s);n=n.Ct(u.view.el);}return n;},t;}();/**
   * Holds the state of a query target, including its target ID and whether the
   * target is 'not-current', 'current' or 'rejected'.
   */ // Visible for testing
  /**
   * Reconcile the list of synced documents in an existing view with those
   * from persistence.
   */function Fo(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o;return __generator$2(this,function(n){switch(n.label){case 0:return [4/*yield*/,ro((e=D$1(t)).os,r.query,/* usePreviousResults= */!0)];case 1:return i=n.sent(),o=r.view.ll(i),[2/*return*/,(e.vl&&e.Cl(r.targetId,o.al),o)];}});});}/**
   * Retrieves newly changed documents from remote document cache and raises
   * snapshots if needed.
   */ // PORTING NOTE: Multi-Tab only.
  function qo(t){return __awaiter$2(this,void 0,void 0,function(){var e;return __generator$2(this,function(n){return [2/*return*/,((e=D$1(t)).Sl("synchronizeWithChangedDocuments()"),oo(e.os).then(function(t){return e.kl(t);}))];});});}/** Applies a mutation state to an existing batch.  */ // PORTING NOTE: Multi-Tab only.
  function jo(t,r,i,o){return __awaiter$2(this,void 0,void 0,function(){var e,s;return __generator$2(this,function(n){switch(n.label){case 0:return (e=D$1(t)).Sl("applyBatchState()"),[4/*yield*/,function(t,e){var n=D$1(t),r=D$1(n.Rs);return n.persistence.runTransaction("Lookup mutation documents","readonly",function(t){return r.zr(t,e).next(function(e){return e?n.Ts.bs(t,e):Zn.resolve(null);});});}(e.os,r)];case 1:return null===(s=n.sent())?[3/*break*/,6]:"pending"!==i?[3/*break*/,3]:[4/*yield*/,e.dl.Du()];case 2:// If we are the primary client, we need to send this write to the
  // backend. Secondary clients will ignore these writes since their remote
  // connection is disabled.
  return n.sent(),[3/*break*/,4];case 3:"acknowledged"===i||"rejected"===i?(// NOTE: Both these methods are no-ops for batches that originated from
  // other clients.
  e.Ol(r,o||null),function(t,e){D$1(D$1(t).Rs).eo(e);}(e.os,r)):_(),n.label=4;case 4:return [4/*yield*/,e.kl(s)];case 5:return n.sent(),[3/*break*/,7];case 6:// A throttled tab may not have seen the mutation before it was completed
  // and removed from the mutation queue, in which case we won't have cached
  // the affected documents. In this case we can safely ignore the update
  // since that means we didn't apply the mutation locally at all (if we
  // had, we would have cached the affected documents), and so we will just
  // see any resulting document changes via normal remote document updates
  // as applicable.
  E$1("SyncEngine","Cannot apply mutation batch with id: "+r),n.label=7;case 7:return [2/*return*/];}});});}/** Applies a query target change from a different tab. */ // PORTING NOTE: Multi-Tab only.
  function Bo(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o,s,u,a,c,h;return __generator$2(this,function(n){switch(n.label){case 0:return e=D$1(t),!0!==r||!0===e.bl?[3/*break*/,3]:(i=e.wl.Ec(),[4/*yield*/,zo(e,i.N())]);case 1:return o=n.sent(),e.bl=!0,[4/*yield*/,e.dl.Xu(!0)];case 2:for(n.sent(),s=0,u=o;s<u.length;s++){a=u[s],e.dl.listen(a);}return [3/*break*/,7];case 3:return !1!==r||!1===e.bl?[3/*break*/,7]:(c=[],h=Promise.resolve(),e.Il.forEach(function(t,n){e.wl.vc(n)?c.push(n):h=h.then(function(){return e.Nl(n),no(e.os,n,/*keepPersistedTargetData=*/!0);}),e.dl.ku(n);}),[4/*yield*/,h]);case 4:return n.sent(),[4/*yield*/,zo(e,c)];case 5:return n.sent(),// PORTING NOTE: Multi-Tab only.
  function(t){var e=D$1(t);e.Pl.forEach(function(t,n){e.dl.ku(n);}),e.gl.na(),e.Pl=new Map(),e.Rl=new ht(W$1.P);}(e),e.bl=!1,[4/*yield*/,e.dl.Xu(!1)];case 6:n.sent(),n.label=7;case 7:return [2/*return*/];}});});}function zo(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var e,i,o,s,u,a,c,h,f,l,p,d,y,v;return __generator$2(this,function(n){switch(n.label){case 0:e=D$1(t),i=[],o=[],s=0,u=r,n.label=1;case 1:return s<u.length?(a=u[s],c=void 0,(h=e.Il.get(a))&&0!==h.length?[4/*yield*/,eo(e.os,_n(h[0]))]:[3/*break*/,7]):[3/*break*/,13];case 2:// For queries that have a local View, we fetch their current state
  // from LocalStore (as the resume token and the snapshot version
  // might have changed) and reconcile their views with the persisted
  // state (the list of syncedDocuments may have gotten out of sync).
  c=n.sent(),f=0,l=h,n.label=3;case 3:return f<l.length?(p=l[f],d=e.El.get(p),[4/*yield*/,Fo(e,d)]):[3/*break*/,6];case 4:(y=n.sent()).snapshot&&o.push(y.snapshot),n.label=5;case 5:return f++,[3/*break*/,3];case 6:return [3/*break*/,11];case 7:return [4/*yield*/,io(e.os,a)];case 8:return v=n.sent(),[4/*yield*/,eo(e.os,v)];case 9:return c=n.sent(),[4/*yield*/,e.Dl(Go(v),a,/*current=*/!1)];case 10:n.sent(),n.label=11;case 11:i.push(c),n.label=12;case 12:return s++,[3/*break*/,1];case 13:return [2/*return*/,(e.ml.qa(o),i)];}});});}/**
   * Creates a `Query` object from the specified `Target`. There is no way to
   * obtain the original `Query`, so we synthesize a `Query` from the `Target`
   * object.
   *
   * The synthesized result might be different from the original `Query`, but
   * since the synthesized `Query` should return the same results as the
   * original one (only the presentation of results might differ), the potential
   * difference will not cause issues.
   */ // PORTING NOTE: Multi-Tab only.
  function Go(t){return En(t.path,t.collectionGroup,t.orderBy,t.filters,t.limit,"F"/* First */,t.startAt,t.endAt);}/** Returns the IDs of the clients that are currently active. */ // PORTING NOTE: Multi-Tab only.
  function Qo(t){var e=D$1(t);return D$1(D$1(e.os).persistence).Ch();}/** Applies a query target change from a different tab. */ // PORTING NOTE: Multi-Tab only.
  function Ho(t,r,i,o){return __awaiter$2(this,void 0,void 0,function(){var e,s,u;return __generator$2(this,function(n){switch(n.label){case 0:return (e=D$1(t)).bl?(// If we receive a target state notification via WebStorage, we are
  // either already secondary or another tab has taken the primary lease.
  E$1("SyncEngine","Ignoring unexpected query state notification."),[3/*break*/,8]):[3/*break*/,1];case 1:if(!e.Il.has(r))return [3/*break*/,8];switch(i){case"current":case"not-current":return [3/*break*/,2];case"rejected":return [3/*break*/,5];}return [3/*break*/,7];case 2:return [4/*yield*/,oo(e.os)];case 3:return s=n.sent(),u=kt.Gt(r,"current"===i),[4/*yield*/,e.kl(s,u)];case 4:return n.sent(),[3/*break*/,8];case 5:return [4/*yield*/,no(e.os,r,/* keepPersistedTargetData */!0)];case 6:return n.sent(),e.Nl(r,o),[3/*break*/,8];case 7:_(),n.label=8;case 8:return [2/*return*/];}});});}/** Adds or removes Watch targets for queries from different tabs. */function Ko(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var e,o,s,u,a,c,h,f,l,p;return __generator$2(this,function(d){switch(d.label){case 0:if(!(e=D$1(t)).bl)return [3/*break*/,10];o=0,s=r,d.label=1;case 1:return o<s.length?(u=s[o],e.Il.has(u)?(// A target might have been added in a previous attempt
  E$1("SyncEngine","Adding an already active target "+u),[3/*break*/,5]):[4/*yield*/,io(e.os,u)]):[3/*break*/,6];case 2:return a=d.sent(),[4/*yield*/,eo(e.os,a)];case 3:return c=d.sent(),[4/*yield*/,e.Dl(Go(a),c.targetId,/*current=*/!1)];case 4:d.sent(),e.dl.listen(c),d.label=5;case 5:return o++,[3/*break*/,1];case 6:h=function h(t){return __generator$2(this,function(n){switch(n.label){case 0:return e.Il.has(t)?[4/*yield*/,no(e.os,t,/* keepPersistedTargetData */!1).then(function(){e.dl.ku(t),e.Nl(t);}).catch(so)]:[3/*break*/,2];// Release queries that are still active.
  case 1:// Release queries that are still active.
  n.sent(),n.label=2;case 2:return [2/*return*/];}});},f=0,l=i,d.label=7;case 7:return f<l.length?(p=l[f],[5/*yield**/,h(p)]):[3/*break*/,10];case 8:d.sent(),d.label=9;case 9:return f++,[3/*break*/,7];case 10:return [2/*return*/];}});});}/**
   * Loads a Firestore bundle into the SDK. The returned promise resolves when
   * the bundle finished loading.
   *
   * @param bundleReader Bundle to load into the SDK.
   * @param task LoadBundleTask used to update the loading progress to public API.
   */function Wo(t,r,i){var o=D$1(t);o.Sl("loadBundle()"),// eslint-disable-next-line @typescript-eslint/no-floating-promises
  function(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var e,o,s,u,a,c;return __generator$2(this,function(n){switch(n.label){case 0:return n.trys.push([0,14,,15]),console.log("start loading"),[4/*yield*/,r.getMetadata()];case 1:return e=n.sent(),console.log("metadata "+JSON.stringify(e)),[4/*yield*/,function(t,e){var n=D$1(t),r=new ur(n.serializer).ns(e.createTime);return n.persistence.runTransaction("hasNewerBundle","readonly",function(t){return n.rh.Ro(t,e.id);}).then(function(t){return !!t&&t.createTime.o(r)>=0;});}(t.os,e)];case 2:return n.sent()?[4/*yield*/,r.close()]:[3/*break*/,4];case 3:return [2/*return*/,(n.sent(),void i.Hl(function(t){return {taskState:"Success",documentsLoaded:t.totalDocuments,bytesLoaded:t.totalBytes,totalDocuments:t.totalDocuments,totalBytes:t.totalBytes};}(e)))];case 4:return i.Jl(ar(e)),o=new hr(e,t.os,r.serializer),console.log("created loader"),[4/*yield*/,r.zn()];case 5:s=n.sent(),n.label=6;case 6:return s?(console.log("element "+JSON.stringify(s)),[4/*yield*/,o.hs(s)]):[3/*break*/,10];case 7:return u=n.sent(),console.log("added to loader"),u&&i.Jl(u),[4/*yield*/,r.zn()];case 8:s=n.sent(),n.label=9;case 9:return [3/*break*/,6];case 10:return console.log("start to call complete()"),[4/*yield*/,o.complete()];case 11:// TODO(b/160876443): This currently raises snapshots with
  // `fromCache=false` if users already listen to some queries and bundles
  // has newer version.
  return a=n.sent(),console.log("with result "+a),[4/*yield*/,t.kl(a.ss,/* remoteEvent */void 0)];case 12:// Save metadata, so loading the same bundle will skip.
  // TODO(b/160876443): This currently raises snapshots with
  // `fromCache=false` if users already listen to some queries and bundles
  // has newer version.
  return n.sent(),console.log("emitted snapshot"),[4/*yield*/,function(t,e){var n=D$1(t);return n.persistence.runTransaction("Save bundle","readwrite",function(t){return n.rh.Po(t,e);});}(t.os,e)];case 13:// Save metadata, so loading the same bundle will skip.
  return n.sent(),console.log("saved bundle"),i.Hl(a.progress),[3/*break*/,15];case 14:return c=n.sent(),i.Yl(c),[3/*break*/,15];case 15:return [2/*return*/];}});});}(o,r,i).then(function(){o.wl.xc();});}var $o=function $o(){this.Xl=void 0,this.listeners=[];},Yo=/** @class */function(){function t(t){this.Mu=t,this.Zl=new F$1(function(t){return On(t);},xn),this.onlineState="Unknown"/* Unknown */,this.t_=new Set(),this.Mu.subscribe(this);}return t.prototype.listen=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r,i,o,s,u;return __generator$2(this,function(n){switch(n.label){case 0:if(e=t.query,r=!1,(i=this.Zl.get(e))||(r=!0,i=new $o()),!r)return [3/*break*/,4];n.label=1;case 1:return n.trys.push([1,3,,4]),o=i,[4/*yield*/,this.Mu.listen(e)];case 2:return o.Xl=n.sent(),[3/*break*/,4];case 3:return s=n.sent(),u=xr(s,"Initialization of query '"+Pn(t.query)+"' failed"),[2/*return*/,void t.onError(u)];case 4:return this.Zl.set(e,i),i.listeners.push(t),// Run global snapshot listeners if a consistent snapshot has been emitted.
  t.ul(this.onlineState),i.Xl&&t.e_(i.Xl)&&this.n_(),[2/*return*/];}});});},t.prototype.ku=function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r,i,o;return __generator$2(this,function(n){return e=t.query,r=!1,(i=this.Zl.get(e))&&(o=i.listeners.indexOf(t))>=0&&(i.listeners.splice(o,1),r=0===i.listeners.length),r?[2/*return*/,(this.Zl.delete(e),this.Mu.ku(e))]:[2/*return*/];});});},t.prototype.qa=function(t){for(var e=!1,n=0,r=t;n<r.length;n++){var i=r[n],o=i.query,s=this.Zl.get(o);if(s){for(var u=0,a=s.listeners;u<a.length;u++){a[u].e_(i)&&(e=!0);}s.Xl=i;}}e&&this.n_();},t.prototype.ql=function(t,e){var n=this.Zl.get(t);if(n)for(var r=0,i=n.listeners;r<i.length;r++){i[r].onError(e);}// Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
  // after an error.
  this.Zl.delete(t);},t.prototype.xl=function(t){this.onlineState=t;var e=!1;this.Zl.forEach(function(n,r){for(var i=0,o=r.listeners;i<o.length;i++){// Run global snapshot listeners if a consistent snapshot has been emitted.
  o[i].ul(t)&&(e=!0);}}),e&&this.n_();},t.prototype.s_=function(t){this.t_.add(t),// Immediately fire an initial event, indicating all existing listeners
  // are in-sync.
  t.next();},t.prototype.i_=function(t){this.t_.delete(t);},// Call all global snapshot listeners that have been set.
  t.prototype.n_=function(){this.t_.forEach(function(t){t.next();});},t;}(),Xo=/** @class */function(){function t(t,e,n){this.query=t,this.r_=e,/**
               * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
               * observer. This flag is set to true once we've actually raised an event.
               */this.o_=!1,this.h_=null,this.onlineState="Unknown"/* Unknown */,this.options=n||{}/**
       * Applies the new ViewSnapshot to this listener, raising a user-facing event
       * if applicable (depending on what changed, whether the user has opted into
       * metadata-only changes, etc.). Returns true if a user-facing event was
       * indeed raised.
       */;}return t.prototype.e_=function(t){if(!this.options.includeMetadataChanges){for(// Remove the metadata only changes.
  var e=[],n=0,r=t.docChanges;n<r.length;n++){var i=r[n];3/* Metadata */!==i.type&&e.push(i);}t=new Dt(t.query,t.docs,t.$t,e,t.Lt,t.fromCache,t.Bt,/* excludesMetadataChanges= */!0);}var o=!1;return this.o_?this.a_(t)&&(this.r_.next(t),o=!0):this.u_(t,this.onlineState)&&(this.c_(t),o=!0),this.h_=t,o;},t.prototype.onError=function(t){this.r_.error(t);},/** Returns whether a snapshot was raised. */t.prototype.ul=function(t){this.onlineState=t;var e=!1;return this.h_&&!this.o_&&this.u_(this.h_,t)&&(this.c_(this.h_),e=!0),e;},t.prototype.u_=function(t,e){// Always raise the first event when we're synced
  if(!t.fromCache)return !0;// NOTE: We consider OnlineState.Unknown as online (it should become Offline
  // or Online if we wait long enough).
  var n="Offline"/* Offline */!==e;// Don't raise the event if we're online, aren't synced yet (checked
  // above) and are waiting for a sync.
  return !(this.options.l_&&n||t.docs._()&&"Offline"/* Offline */!==e);// Raise data from cache if we have any documents or we are offline
  },t.prototype.a_=function(t){// We don't need to handle includeDocumentMetadataChanges here because
  // the Metadata only changes have already been stripped out if needed.
  // At this point the only changes we will see are the ones we should
  // propagate.
  if(t.docChanges.length>0)return !0;var e=this.h_&&this.h_.hasPendingWrites!==t.hasPendingWrites;return !(!t.Bt&&!e)&&!0===this.options.includeMetadataChanges;// Generally we should have hit one of the cases above, but it's possible
  // to get here if there were only metadata docChanges and they got
  // stripped out.
  },t.prototype.c_=function(t){t=Dt.Ut(t.query,t.docs,t.Lt,t.fromCache),this.o_=!0,this.r_.next(t);},t;}(),Jo=/** @class */function(){function t(){}return t.prototype.Kh=function(t){this.__=t;},t.prototype.Ss=function(t,e,n,r){var i=this;// Queries that match all documents don't benefit from using
  // IndexFreeQueries. It is more efficient to scan all documents in a
  // collection, rather than to perform individual lookups.
  return e.on()||n.isEqual(z.min())?this.f_(t,e):this.__.bs(t,r).next(function(o){var u=i.d_(e,o);return (e.hn()||e.an())&&i.rl(e.en,u,r,n)?i.f_(t,e):(I$1()<=LogLevel.DEBUG&&E$1("IndexFreeQueryEngine","Re-using previous result from %s to execute query: %s",n.toString(),Pn(e)),i.__.Ss(t,e,n).next(function(t){// We merge `previousResults` into `updateResults`, since
  // `updateResults` is already a DocumentMap. If a document is
  // contained in both lists, then its contents are the same.
  return u.forEach(function(e){t=t.nt(e.key,e);}),t;}));});// Queries that have never seen a snapshot without limbo free documents
  // should also be run as a full collection scan.
  },/** Applies the query filter and sorting to the provided documents.  */t.prototype.d_=function(t,e){// Sort the documents and re-apply the query filter since previously
  // matching documents do not necessarily still match the query.
  var n=new pt(Rn(t));return e.forEach(function(e,r){r instanceof mn&&Ln(t,r)&&(n=n.add(r));}),n;},/**
       * Determines if a limit query needs to be refilled from cache, making it
       * ineligible for index-free execution.
       *
       * @param sortedPreviousResults The documents that matched the query when it
       * was last synchronized, sorted by the query's comparator.
       * @param remoteKeys The document keys that matched the query at the last
       * snapshot.
       * @param limboFreeSnapshotVersion The version of the snapshot when the query
       * was last synchronized.
       */t.prototype.rl=function(t,e,n,r){// The query needs to be refilled if a previously matching document no
  // longer matches.
  if(n.size!==e.size)return !0;// Limit queries are not eligible for index-free query execution if there is
  // a potential that an older document from cache now sorts before a document
  // that was previously part of the limit. This, however, can only happen if
  // the document at the edge of the limit goes out of limit.
  // If a document that is not the limit boundary sorts differently,
  // the boundary of the limit itself did not change and documents from cache
  // will continue to be "rejected" by this boundary. Therefore, we can ignore
  // any modifications that don't affect the last document.
  var i="F"/* First */===t?e.last():e.first();return !!i&&(i.hasPendingWrites||i.version.o(r)>0);},t.prototype.f_=function(t,e){return I$1()<=LogLevel.DEBUG&&E$1("IndexFreeQueryEngine","Using full collection scan to execute query:",Pn(e)),this.__.Ss(t,e,z.min());},t;}(),Zo=/** @class */function(){function t(t,e){this.Ps=t,this.Br=e,/**
               * The set of all mutations that have been sent but not yet been applied to
               * the backend.
               */this.Rs=[],/** Next value to use when assigning sequential IDs to each mutation batch. */this.w_=1,/** An ordered mapping between documents and the mutations batch IDs. */this.T_=new pt(co.Hh);}return t.prototype.Wr=function(t){return Zn.resolve(0===this.Rs.length);},t.prototype.jr=function(t,e,n,r){var i=this.w_;this.w_++,this.Rs.length>0&&this.Rs[this.Rs.length-1];var o=new Xn(i,e,n,r);this.Rs.push(o);// Track references by document key and index collection parents.
  for(var s=0,u=r;s<u.length;s++){var a=u[s];this.T_=this.T_.add(new co(a.key,i)),this.Ps.Kr(t,a.key.path.p());}return Zn.resolve(o);},t.prototype.Gr=function(t,e){return Zn.resolve(this.m_(e));},t.prototype.Hr=function(t,e){var n=e+1,r=this.E_(n),i=r<0?0:r;// The requested batchId may still be out of range so normalize it to the
  // start of the queue.
  return Zn.resolve(this.Rs.length>i?this.Rs[i]:null);},t.prototype.Jr=function(){return Zn.resolve(0===this.Rs.length?-1:this.w_-1);},t.prototype.Yr=function(t){return Zn.resolve(this.Rs.slice());},t.prototype.Vs=function(t,e){var n=this,r=new co(e,0),i=new co(e,Number.POSITIVE_INFINITY),o=[];return this.T_.vt([r,i],function(t){var e=n.m_(t.ia);o.push(e);}),Zn.resolve(o);},t.prototype.vs=function(t,e){var n=this,r=new pt(O$1);return e.forEach(function(t){var e=new co(t,0),i=new co(t,Number.POSITIVE_INFINITY);n.T_.vt([e,i],function(t){r=r.add(t.ia);});}),Zn.resolve(this.I_(r));},t.prototype.ks=function(t,e){// Use the query path as a prefix for testing if a document matches the
  // query.
  var n=e.path,r=n.length+1,i=n;// Construct a document reference for actually scanning the index. Unlike
  // the prefix the document key in this reference must have an even number of
  // segments. The empty segment can be used a suffix of the query path
  // because it precedes all other segments in an ordered traversal.
  W$1.W(i)||(i=i.child(""));var o=new co(new W$1(i),0),s=new pt(O$1);// Find unique batchIDs referenced by all documents potentially matching the
  // query.
  return this.T_.St(function(t){var e=t.key.path;return !!n.D(e)&&(// Rows with document keys more than one segment longer than the query
  // path can't be matches. For example, a query on 'rooms' can't match
  // the document /rooms/abc/messages/xyx.
  // TODO(mcg): we'll need a different scanner when we implement
  // ancestor queries.
  e.length===r&&(s=s.add(t.ia)),!0);},o),Zn.resolve(this.I_(s));},t.prototype.I_=function(t){var e=this,n=[];// Construct an array of matching batches, sorted by batchID to ensure that
  // multiple mutations affecting the same document key are applied in order.
  return t.forEach(function(t){var r=e.m_(t);null!==r&&n.push(r);}),n;},t.prototype.Zr=function(t,e){var n=this;S$1(0===this.A_(e.batchId,"removed")),this.Rs.shift();var r=this.T_;return Zn.forEach(e.mutations,function(i){var o=new co(i.key,e.batchId);return r=r.delete(o),n.Br.no(t,i.key);}).next(function(){n.T_=r;});},t.prototype.eo=function(t){// No-op since the memory mutation queue does not maintain a separate cache.
  },t.prototype.io=function(t,e){var n=new co(e,0),r=this.T_.Dt(n);return Zn.resolve(e.isEqual(r&&r.key));},t.prototype.so=function(t){return this.Rs.length,Zn.resolve();},/**
       * Finds the index of the given batchId in the mutation queue and asserts that
       * the resulting index is within the bounds of the queue.
       *
       * @param batchId The batchId to search for
       * @param action A description of what the caller is doing, phrased in passive
       * form (e.g. "acknowledged" in a routine that acknowledges batches).
       */t.prototype.A_=function(t,e){return this.E_(t);},/**
       * Finds the index of the given batchId in the mutation queue. This operation
       * is O(1).
       *
       * @return The computed index of the batch with the given batchId, based on
       * the state of the queue. Note this index can be negative if the requested
       * batchId has already been remvoed from the queue or past the end of the
       * queue if the batchId is larger than the last added batch.
       */t.prototype.E_=function(t){return 0===this.Rs.length?0:t-this.Rs[0].batchId;// Examine the front of the queue to figure out the difference between the
  // batchId and indexes in the array. Note that since the queue is ordered
  // by batchId, if the first batch has a larger batchId then the requested
  // batchId doesn't exist in the queue.
  },/**
       * A version of lookupMutationBatch that doesn't return a promise, this makes
       * other functions that uses this code easier to read and more efficent.
       */t.prototype.m_=function(t){var e=this.E_(t);return e<0||e>=this.Rs.length?null:this.Rs[e];},t;}(),ts=/** @class */function(){/**
       * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
       * return 0 to avoid unnecessarily doing the work of calculating the size.
       */function t(t,e){this.Ps=t,this.R_=e,/** Underlying cache of documents and their read times. */this.docs=new ht(W$1.P),/** Size of all cached documents. */this.size=0/**
       * Adds the supplied entry to the cache and updates the cache size as appropriate.
       *
       * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()`.
       */;}return t.prototype.xn=function(t,e,n){var r=e.key,i=this.docs.get(r),o=i?i.size:0,s=this.R_(e);return this.docs=this.docs.nt(r,{On:e,size:s,readTime:n}),this.size+=s-o,this.Ps.Kr(t,r.path.p());},/**
       * Removes the specified entry from the cache and updates the cache size as appropriate.
       *
       * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
       * returned by `newChangeBuffer()`.
       */t.prototype.$n=function(t){var e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size);},t.prototype.Ln=function(t,e){var n=this.docs.get(e);return Zn.resolve(n?n.On:null);},t.prototype.getEntries=function(t,e){var n=this,r=mt();return e.forEach(function(t){var e=n.docs.get(t);r=r.nt(t,e?e.On:null);}),Zn.resolve(r);},t.prototype.Ss=function(t,e,n){for(var r=wt(),i=new W$1(e.path.child("")),o=this.docs.ut(i)// Documents are ordered by key, so we can use a prefix scan to narrow down
  // the documents we need to match the query against.
  ;o.wt();){var s=o.dt(),u=s.key,a=s.value,c=a.On,h=a.readTime;if(!e.path.D(u.path))break;h.o(n)<=0||c instanceof mn&&Ln(e,c)&&(r=r.nt(c.key,c));}return Zn.resolve(r);},t.prototype.P_=function(t,e){return Zn.forEach(this.docs,function(t){return e(t);});},t.prototype.us=function(e){// `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
  // a separate changelog and does not need special handling for removals.
  return new t.To(this);},t.prototype.mo=function(t){return Zn.resolve(this.size);},t;}();/**
   * EventManager is responsible for mapping queries to query event emitters.
   * It handles "fan-out". -- Identical queries will re-use the same watch on the
   * backend.
   */ /**
   * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
   */ts.To=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).Eo=t,n;}return __extends$1(n,e),n.prototype.Un=function(t){var e=this,n=[];return this.Nn.forEach(function(r,i){i&&i.On?n.push(e.Eo.xn(t,i.On,e.kn(r))):e.Eo.$n(r);}),Zn.Dn(n);},n.prototype.Bn=function(t,e){return this.Eo.Ln(t,e);},n.prototype.qn=function(t,e){return this.Eo.getEntries(t,e);},n;}(tr);/**
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
   */var es=/** @class */function(){function t(t){this.persistence=t,/**
               * Maps a target to the data about that target
               */this.g_=new F$1(function(t){return tt(t);},et),/** The last received snapshot version. */this.lastRemoteSnapshotVersion=z.min(),/** The highest numbered target ID encountered. */this.highestTargetId=0,/** The highest sequence number encountered. */this.V_=0,/**
               * A ordered bidirectional mapping between documents and the remote target
               * IDs.
               */this.y_=new ao(),this.targetCount=0,this.p_=Mi.vo();}return t.prototype.pe=function(t,e){return this.g_.forEach(function(t,n){return e(n);}),Zn.resolve();},t.prototype.Fo=function(t){return Zn.resolve(this.lastRemoteSnapshotVersion);},t.prototype.ko=function(t){return Zn.resolve(this.V_);},t.prototype.Do=function(t){return this.highestTargetId=this.p_.next(),Zn.resolve(this.highestTargetId);},t.prototype.xo=function(t,e,n){return n&&(this.lastRemoteSnapshotVersion=n),e>this.V_&&(this.V_=e),Zn.resolve();},t.prototype.Oo=function(t){this.g_.set(t.target,t);var e=t.targetId;e>this.highestTargetId&&(this.p_=new Mi(e),this.highestTargetId=e),t.sequenceNumber>this.V_&&(this.V_=t.sequenceNumber);},t.prototype.Mo=function(t,e){return this.Oo(e),this.targetCount+=1,Zn.resolve();},t.prototype.Lo=function(t,e){return this.Oo(e),Zn.resolve();},t.prototype.Bo=function(t,e){return this.g_.delete(e.target),this.y_.ea(e.targetId),this.targetCount-=1,Zn.resolve();},t.prototype.kr=function(t,e,n){var r=this,i=0,o=[];return this.g_.forEach(function(s,u){u.sequenceNumber<=e&&null===n.get(u.targetId)&&(r.g_.delete(s),o.push(r._s(t,u.targetId)),i++);}),Zn.Dn(o).next(function(){return i;});},t.prototype.qo=function(t){return Zn.resolve(this.targetCount);},t.prototype.Uo=function(t,e){var n=this.g_.get(e)||null;return Zn.resolve(n);},t.prototype.ds=function(t,e,n){return this.y_.Xh(e,n),Zn.resolve();},t.prototype.Wo=function(t,e,n){this.y_.ta(e,n);var r=this.persistence.Br,i=[];return r&&e.forEach(function(e){i.push(r.no(t,e));}),Zn.Dn(i);},t.prototype._s=function(t,e){return this.y_.ea(e),Zn.resolve();},t.prototype.Ko=function(t,e){var n=this.y_.sa(e);return Zn.resolve(n);},t.prototype.io=function(t,e){return Zn.resolve(this.y_.io(e));},t;}(),ns=/** @class */function(){function t(t){this.serializer=t,this.b_=new Map(),this.v_=new Map();}return t.prototype.Ro=function(t,e){return Zn.resolve(this.b_.get(e));},t.prototype.Po=function(t,e){/** Encodes a BundleMetadata proto object to a Bundle model object. */var n;return this.b_.set(e.id,{id:(n=e).id,version:n.version,createTime:fe(n.createTime)}),Zn.resolve();},t.prototype.Vo=function(t,e){return Zn.resolve(this.v_.get(e));},t.prototype.yo=function(t,e){var n;return this.v_.set(e.name,{name:(n=e).name,query:Xr(n.bundledQuery),readTime:fe(n.readTime)}),Zn.resolve();},t;}(),rs=/** @class */function(){/**
       * The constructor accepts a factory for creating a reference delegate. This
       * allows both the delegate and this instance to have strong references to
       * each other without having nullable fields that would then need to be
       * checked or asserted on every access.
       */function t(t,e){var n=this;this.S_={},this.Jo=new yr(0),this.Yo=!1,this.Yo=!0,this.Br=t(this),this.fs=new es(this),this.Ps=new ci(),this.As=new ts(this.Ps,function(t){return n.Br.D_(t);}),this.serializer=new jr(e),this.rh=new ns(this.serializer);}return t.prototype.start=function(){return Promise.resolve();},t.prototype.ph=function(){// No durable state to ensure is closed on shutdown.
  return this.Yo=!1,Promise.resolve();},Object.defineProperty(t.prototype,"br",{get:function get(){return this.Yo;},enumerable:!1,configurable:!0}),t.prototype.fh=function(){// No op.
  },t.prototype.dh=function(){// No op.
  },t.prototype.xh=function(){return this.Ps;},t.prototype.Nh=function(t){var e=this.S_[t.ra()];return e||(e=new Zo(this.Ps,this.Br),this.S_[t.ra()]=e),e;},t.prototype.Fh=function(){return this.fs;},t.prototype.kh=function(){return this.As;},t.prototype.Mh=function(){return this.rh;},t.prototype.runTransaction=function(t,e,n){var r=this;E$1("MemoryPersistence","Starting transaction:",t);var i=new is(this.Jo.next());return this.Br.C_(),n(i).next(function(t){return r.Br.N_(i).next(function(){return t;});}).vn().then(function(t){return i.Is(),t;});},t.prototype.F_=function(t,e){return Zn.Cn(Object.values(this.S_).map(function(n){return function(){return n.io(t,e);};}));},t;}(),is=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).Go=t,n;}return __extends$1(n,e),n;}(lr),os=/** @class */function(){function t(t){this.persistence=t,/** Tracks all documents that are active in Query views. */this.k_=new ao(),/** The list of documents that are potentially GCed after each transaction. */this.x_=null;}return t.M_=function(e){return new t(e);},Object.defineProperty(t.prototype,"O_",{get:function get(){if(this.x_)return this.x_;throw _();},enumerable:!1,configurable:!0}),t.prototype.Qo=function(t,e,n){return this.k_.Qo(n,e),this.O_.delete(n),Zn.resolve();},t.prototype.jo=function(t,e,n){return this.k_.jo(n,e),this.O_.add(n),Zn.resolve();},t.prototype.no=function(t,e){return this.O_.add(e),Zn.resolve();},t.prototype.removeTarget=function(t,e){var n=this;this.k_.ea(e.targetId).forEach(function(t){return n.O_.add(t);});var r=this.persistence.Fh();return r.Ko(t,e.targetId).next(function(t){t.forEach(function(t){return n.O_.add(t);});}).next(function(){return r.Bo(t,e);});},t.prototype.C_=function(){this.x_=new Set();},t.prototype.N_=function(t){var e=this,n=this.persistence.kh().us();// Remove newly orphaned documents.
  return Zn.forEach(this.O_,function(r){return e.L_(t,r).next(function(t){t||n.$n(r);});}).next(function(){return e.x_=null,n.apply(t);});},t.prototype.qh=function(t,e){var n=this;return this.L_(t,e).next(function(t){t?n.O_.delete(e):n.O_.add(e);});},t.prototype.D_=function(t){// For eager GC, we don't care about the document size, there are no size thresholds.
  return 0;},t.prototype.L_=function(t,e){var n=this;return Zn.Cn([function(){return Zn.resolve(n.k_.io(e));},function(){return n.persistence.Fh().io(t,e);},function(){return n.persistence.F_(t,e);}]);},t;}(),ss=/** @class */function(){function t(t){this.B_=t.B_,this.q_=t.q_;}return t.prototype.La=function(t){this.U_=t;},t.prototype.ka=function(t){this.Q_=t;},t.prototype.onMessage=function(t){this.W_=t;},t.prototype.close=function(){this.q_();},t.prototype.send=function(t){this.B_(t);},t.prototype.j_=function(){this.U_();},t.prototype.K_=function(t){this.Q_(t);},t.prototype.G_=function(t){this.W_(t);},t;}(),us={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery"},as=/** @class */function(e){function n(t){var n=this;return (n=e.call(this,t)||this).forceLongPolling=t.forceLongPolling,n;}/**
       * Base class for all Rest-based connections to the backend (WebChannel and
       * HTTP).
       */return __extends$1(n,e),n.prototype.Z_=function(t,e,n,r){return new Promise(function(i,o){var s=new esm_5();s.listenOnce(esm_3.COMPLETE,function(){try{switch(s.getLastErrorCode()){case esm_2.NO_ERROR:var e=s.getResponseJson();E$1("Connection","XHR received:",JSON.stringify(e)),i(e);break;case esm_2.TIMEOUT:E$1("Connection",'RPC "'+t+'" timed out'),o(new j(q$1.DEADLINE_EXCEEDED,"Request time out"));break;case esm_2.HTTP_ERROR:var n=s.getStatus();if(E$1("Connection",'RPC "'+t+'" failed with status:',n,"response text:",s.getResponseText()),n>0){var r=s.getResponseJson().error;if(r&&r.status&&r.message){var u=function(t){var e=t.toLowerCase().replace("_","-");return Object.values(q$1).indexOf(e)>=0?e:q$1.UNKNOWN;}(r.status);o(new j(u,r.message));}else o(new j(q$1.UNKNOWN,"Server responded with status "+s.getStatus()));}else// If we received an HTTP_ERROR but there's no status code,
  // it's most probably a connection issue
  o(new j(q$1.UNAVAILABLE,"Connection failed."));break;default:_();}}finally{E$1("Connection",'RPC "'+t+'" completed.');}});var u=JSON.stringify(r);s.send(e,"POST",u,n,15);});},n.prototype.Ba=function(t,e){var n=[this.H_,"/","google.firestore.v1.Firestore","/",t,"/channel"],r=esm_1(),i={// Required for backend stickiness, routing behavior is based on this
  // parameter.
  httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{// This param is used to improve routing and project isolation by the
  // backend and must be included in every request.
  database:"projects/"+this.s.projectId+"/databases/"+this.s.database},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{// Override the default timeout (randomized between 10-20 seconds) since
  // a large write batch on a slow internet connection may take a long
  // time to send to the backend. Rather than have WebChannel impose a
  // tight timeout which could lead to infinite timeouts and retries, we
  // set it very large (5-10 minutes) and rely on the browser's builtin
  // timeouts to kick in if the request isn't working.
  forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling};this.X_(i.initMessageHeaders,e),// Sending the custom headers we just added to request.initMessageHeaders
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
  isMobileCordova()||isReactNative()||isElectron()||isIE()||isUWP()||isBrowserExtension()||(i.httpHeadersOverwriteParam="$httpHeaders");var o=n.join("");E$1("Connection","Creating WebChannel: "+o,i);var s=r.createWebChannel(o,i),u=!1,d=!1,y=new ss({B_:function B_(t){d?E$1("Connection","Not sending because WebChannel is closed:",t):(u||(E$1("Connection","Opening WebChannel transport."),s.open(),u=!0),E$1("Connection","WebChannel sending:",t),s.send(t));},q_:function q_(){return s.close();}}),v=function v(t,e){// TODO(dimond): closure typing seems broken because WebChannel does
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
  return v(esm_4.EventType.OPEN,function(){d||E$1("Connection","WebChannel transport opened.");}),v(esm_4.EventType.CLOSE,function(){d||(d=!0,E$1("Connection","WebChannel transport closed"),y.K_());}),v(esm_4.EventType.ERROR,function(t){d||(d=!0,N$1("Connection","WebChannel transport errored:",t),y.K_(new j(q$1.UNAVAILABLE,"The operation could not be completed")));}),v(esm_4.EventType.MESSAGE,function(t){var e;if(!d){var n=t.data[0];S$1(!!n);// TODO(b/35143891): There is a bug in One Platform that caused errors
  // (and only errors) to be wrapped in an extra array. To be forward
  // compatible with the bug we need to check either condition. The latter
  // can be removed once the fix has been rolled out.
  // Use any because msgData.error is not typed.
  var r=n,i=r.error||(null===(e=r[0])||void 0===e?void 0:e.error);if(i){E$1("Connection","WebChannel received error:",i);// error.status will be a string like 'OK' or 'NOT_FOUND'.
  var o=i.status,u=function(t){// lookup by string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var e=it[t];if(void 0!==e)return ct(e);}(o),a=i.message;void 0===u&&(u=q$1.INTERNAL,a="Unknown error status: "+o+" with message "+i.message),// Mark closed so no further events are propagated
  d=!0,y.K_(new j(u,a)),s.close();}else E$1("Connection","WebChannel received:",n),y.G_(n);}}),setTimeout(function(){// Technically we could/should wait for the WebChannel opened event,
  // but because we want to send the first message with the WebChannel
  // handshake we pretend the channel opened here (asynchronously), and
  // then delay the actual open until the first message is sent.
  y.j_();},0),y;},n;}(/** @class */function(){function t(t){this.z_=t,this.s=t.s;var e=t.ssl?"https":"http";this.H_=e+"://"+t.host,this.J_="projects/"+this.s.projectId+"/databases/"+this.s.database+"/documents";}return t.prototype.Xa=function(t,e,n,r){var i=this.Y_(t,e);E$1("RestConnection","Sending: ",i,n);var o={};return this.X_(o,r),this.Z_(t,i,o,n).then(function(t){return E$1("RestConnection","Received: ",t),t;},function(e){throw N$1("RestConnection",t+" failed with error: ",e,"url: ",i,"request:",n),e;});},t.prototype.Za=function(t,e,n,r){// The REST API automatically aggregates all of the streamed results, so we
  // can just use the normal invoke() method.
  return this.Xa(t,e,n,r);},/**
       * Modifies the headers for a request, adding any authorization token if
       * present and any additional headers for the request.
       */t.prototype.X_=function(t,e){if(t["X-Goog-Api-Client"]="gl-js/ fire/7.18.0",// Content-Type: text/plain will avoid preflight requests which might
  // mess with CORS and redirects by proxies. If we add custom headers
  // we will need to change this code to potentially use the $httpOverwrite
  // parameter supported by ESF to avoid	triggering preflight requests.
  t["Content-Type"]="text/plain",e)for(var n in e.aa){e.aa.hasOwnProperty(n)&&(t[n]=e.aa[n]);}},t.prototype.Y_=function(t,e){var n=us[t];return this.H_+"/v1/"+e+":"+n;},t;}()),cs=/** @class */function(){function t(){var t=this;this.tf=function(){return t.ef();},this.nf=function(){return t.sf();},this.if=[],this.rf();}return t.prototype.wu=function(t){this.if.push(t);},t.prototype.ph=function(){window.removeEventListener("online",this.tf),window.removeEventListener("offline",this.nf);},t.prototype.rf=function(){window.addEventListener("online",this.tf),window.addEventListener("offline",this.nf);},t.prototype.ef=function(){E$1("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(var t=0,e=this.if;t<e.length;t++){(0, e[t])(0/* AVAILABLE */);}},t.prototype.sf=function(){E$1("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(var t=0,e=this.if;t<e.length;t++){(0, e[t])(1/* UNAVAILABLE */);}},// TODO(chenbrian): Consider passing in window either into this component or
  // here for testing via FakeWindow.
  /** Checks that all used attributes of window are available. */t.oi=function(){return "undefined"!=typeof window&&void 0!==window.addEventListener&&void 0!==window.removeEventListener;},t;}(),hs=/** @class */function(){function t(){}return t.prototype.wu=function(t){// No-op.
  },t.prototype.ph=function(){// No-op.
  },t;}(),fs="You are using the memory-only build of Firestore. Persistence support is only available via the @firebase/firestore bundle or the firebase-firestore.js build.",ls=/** @class */function(){function t(){}return t.prototype.initialize=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:return this.serializer=ir(t.z_.s),this.wl=this.hf(t),this.persistence=this.af(t),[4/*yield*/,this.persistence.start()];case 1:return e.sent(),this.uf=this.cf(t),this.os=this.lf(t),[2/*return*/];}});});},t.prototype.cf=function(t){return null;},t.prototype.lf=function(t){return $i(this.persistence,new Jo(),t._f,this.serializer);},t.prototype.af=function(t){if(t.df.ff)throw new j(q$1.FAILED_PRECONDITION,fs);return new rs(os.M_,this.serializer);},t.prototype.hf=function(t){return new Po();},t.prototype.terminate=function(){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return this.uf&&this.uf.stop(),[4/*yield*/,this.wl.ph()];case 1:return t.sent(),[4/*yield*/,this.persistence.ph()];case 2:return t.sent(),[2/*return*/];}});});},t.prototype.clearPersistence=function(t,e){throw new j(q$1.FAILED_PRECONDITION,fs);},t;}(),ps=/** @class */function(r){function i(t){var e=this;return (e=r.call(this)||this).wf=t,e;}return __extends$1(i,r),i.prototype.initialize=function(t){return __awaiter$2(this,void 0,void 0,function(){var i,o=this;return __generator$2(this,function(s){switch(s.label){case 0:return [4/*yield*/,r.prototype.initialize.call(this,t)];case 1:return s.sent(),[4/*yield*/,this.wf.initialize(this,t)];case 2:return s.sent(),i=this.wf.Mu,this.wl instanceof Oo?(this.wl.Mu={jc:jo.bind(null,i),Kc:Ho.bind(null,i),Gc:Ko.bind(null,i),Ch:Qo.bind(null,i),Wc:qo.bind(null,i)},[4/*yield*/,this.wl.start()]):[3/*break*/,4];case 3:s.sent(),s.label=4;case 4:// NOTE: This will immediately call the listener, so we make sure to
  // set it after localStore / remoteStore are started.
  return [4/*yield*/,this.persistence._h(function(t){return __awaiter$2(o,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:return [4/*yield*/,Bo(this.wf.Mu,t)];case 1:return e.sent(),this.uf&&(t&&!this.uf.br?this.uf.start(this.os):t||this.uf.stop()),[2/*return*/];}});});})];case 5:// NOTE: This will immediately call the listener, so we make sure to
  // set it after localStore / remoteStore are started.
  return s.sent(),[2/*return*/];}});});},i.prototype.hf=function(t){if(t.df.ff&&t.df.synchronizeTabs){var e=_r();if(!Oo.oi(e))throw new j(q$1.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");var n=Ki(t.z_.s,t.z_.persistenceKey);return new Oo(e,t.bi,n,t.clientId,t._f);}return new Po();},i;}(/** @class */function(r){function i(){return null!==r&&r.apply(this,arguments)||this;}return __extends$1(i,r),i.prototype.initialize=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(i){switch(i.label){case 0:return [4/*yield*/,r.prototype.initialize.call(this,t)];case 1:return i.sent(),[4/*yield*/,function(t){return __awaiter$2(this,void 0,void 0,function(){var e,r;return __generator$2(this,function(n){return e=D$1(t),r=D$1(e.cs),[2/*return*/,e.persistence.runTransaction("Synchronize last document change read time","readonly",function(t){return r.wo(t);}).then(function(t){e.jh=t;})];});});}(this.os)];case 2:return i.sent(),[2/*return*/];}});});},i.prototype.lf=function(t){return $i(this.persistence,new Jo(),t._f,this.serializer);},i.prototype.cf=function(t){var e=this.persistence.Br.gr;return new Mr(e,t.bi);},i.prototype.af=function(t){var e=Ki(t.z_.s,t.z_.persistenceKey);return new Bi(t.df.synchronizeTabs,e,t.clientId,Rr.wr(t.df.cacheSizeBytes),t.bi,_r(),Sr(),this.serializer,this.wl,t.df.Ho);},i.prototype.hf=function(t){return new Po();},i.prototype.clearPersistence=function(t,r){return function(t){return __awaiter$2(this,void 0,void 0,function(){var e;return __generator$2(this,function(n){switch(n.label){case 0:return mr.oi()?(e=t+"main",[4/*yield*/,mr.delete(e)]):[2/*return*/,Promise.resolve()];case 1:return n.sent(),[2/*return*/];}});});}(Ki(t,r));},i;}(ls)),ds=/** @class */function(){function t(){}return t.prototype.initialize=function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e=this;return __generator$2(this,function(n){switch(n.label){case 0:return this.os?[3/*break*/,3]:(this.os=t.os,this.wl=t.wl,this.uu=this.Tf(r),this.dl=this.mf(r),this.Mu=this.Ef(r),this.If=this.Af(r),this.wl.tu=function(t){return e.Mu.ul(t,1/* SharedClientState */);},this.dl.Mu=this.Mu,[4/*yield*/,this.dl.start()]);case 1:return n.sent(),[4/*yield*/,this.dl.Xu(this.Mu.vl)];case 2:n.sent(),n.label=3;case 3:return [2/*return*/];}});});},t.prototype.Af=function(t){return new Yo(this.Mu);},t.prototype.Tf=function(t){var e,n=ir(t.z_.s),r=(e=t.z_,new as(e));/** Return the Platform-specific connectivity monitor. */return function(t,e,n){return new bo(t,e,n);}(t.credentials,r,n);},t.prototype.mf=function(t){var e=this;return new Eo(this.os,this.uu,t.bi,function(t){return e.Mu.ul(t,0/* RemoteStore */);},cs.oi()?new cs():new hs());},t.prototype.Ef=function(t){return function(t,e,n,// PORTING NOTE: Manages state synchronization in multi-tab environments.
  r,i,o,s){var u=new Co(t,e,n,r,i,o);return s&&(u.bl=!0),u;}(this.os,this.dl,this.uu,this.wl,t._f,t.Tl,!t.df.ff||!t.df.synchronizeTabs);},t.prototype.terminate=function(){return this.dl.ph();},t;}();/**
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
   */function ys(t){/**
   * Returns true if obj is an object and contains at least one of the specified
   * methods.
   */return function(t,e){if("object"!=_typeof(t)||null===t)return !1;for(var n=t,r=0,i=["next","error","complete"];r<i.length;r++){var o=i[r];if(o in n&&"function"==typeof n[o])return !0;}return !1;}(t);}var vs=/** @class */function(){function t(t){this.observer=t,/**
               * When set to true, will not raise future events. Necessary to deal with
               * async detachment of listener.
               */this.muted=!1;}return t.prototype.next=function(t){this.observer.next&&this.Rf(this.observer.next,t);},t.prototype.error=function(t){this.observer.error?this.Rf(this.observer.error,t):console.error("Uncaught Error in snapshot listener:",t);},t.prototype.Pf=function(){this.muted=!0;},t.prototype.Rf=function(t,e){var n=this;this.muted||setTimeout(function(){n.muted||t(e);},0);},t;}();/**
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
   */function ms(t,e){if(0!==e.length)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() does not support arguments, but was called with "+Ms(e.length,"argument")+".");}/**
   * Validates the invocation of functionName has the exact number of arguments.
   *
   * Forward the magic "arguments" variable as second parameter on which the
   * parameter validation is performed:
   * validateExactNumberOfArgs('myFunction', arguments, 2);
   */function gs(t,e,n){if(e.length!==n)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires "+Ms(n,"argument")+", but was called with "+Ms(e.length,"argument")+".");}/**
   * Validates the invocation of functionName has at least the provided number of
   * arguments (but can have many more).
   *
   * Forward the magic "arguments" variable as second parameter on which the
   * parameter validation is performed:
   * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
   */function ws(t,e,n){if(e.length<n)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires at least "+Ms(n,"argument")+", but was called with "+Ms(e.length,"argument")+".");}/**
   * Validates the invocation of functionName has number of arguments between
   * the values provided.
   *
   * Forward the magic "arguments" variable as second parameter on which the
   * parameter validation is performed:
   * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
   */function bs(t,e,n,r){if(e.length<n||e.length>r)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires between "+n+" and "+r+" arguments, but was called with "+Ms(e.length,"argument")+".");}/**
   * Validates the provided argument is an array and has as least the expected
   * number of elements.
   */ /**
   * Validates the provided positional argument has the native JavaScript type
   * using typeof checks.
   */function Is(t,e,n,r){Ss(t,e,Rs(n)+" argument",r);}/**
   * Validates the provided argument has the native JavaScript type using
   * typeof checks or is undefined.
   */function Es(t,e,n,r){void 0!==r&&Is(t,e,n,r);}/**
   * Validates the provided named option has the native JavaScript type using
   * typeof checks.
   */function Ts(t,e,n,r){Ss(t,e,n+" option",r);}/**
   * Validates the provided named option has the native JavaScript type using
   * typeof checks or is undefined.
   */function Ns(t,e,n,r){void 0!==r&&Ts(t,e,n,r);}/**
   * Validates that the provided named option equals one of the expected values.
   */ /**
   * Validates that the provided named option equals one of the expected values or
   * is undefined.
   */function As(t,e,n,r,i){void 0!==r&&function(t,e,n,r,i){for(var o=[],s=0,u=i;s<u.length;s++){var a=u[s];if(a===r)return;o.push(ks(a));}var c=ks(r);throw new j(q$1.INVALID_ARGUMENT,"Invalid value "+c+" provided to function "+t+'() for option "'+n+'". Acceptable values: '+o.join(", "));}(t,0,n,r,i);}/**
   * Validates that the provided argument is a valid enum.
   *
   * @param functionName Function making the validation call.
   * @param enums Array containing all possible values for the enum.
   * @param position Position of the argument in `functionName`.
   * @param argument Argument to validate.
   * @return The value as T if the argument can be converted.
   */function _s(t,e,n,r){if(!e.some(function(t){return t===r;}))throw new j(q$1.INVALID_ARGUMENT,"Invalid value "+ks(r)+" provided to function "+t+"() for its "+Rs(n)+" argument. Acceptable values: "+e.join(", "));return r;}/** Helper to validate the type of a provided input. */function Ss(t,e,n,r){if(!("object"===e?Ds(r):"non-empty string"===e?"string"==typeof r&&""!==r:_typeof(r)===e)){var i=ks(r);throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+n+" to be of type "+e+", but it was: "+i);}}/**
   * Returns true if it's a non-null object without a custom prototype
   * (i.e. excludes Array, Date, etc.).
   */function Ds(t){return "object"==_typeof(t)&&null!==t&&(Object.getPrototypeOf(t)===Object.prototype||null===Object.getPrototypeOf(t));}/** Returns a string describing the type / value of the provided input. */function ks(t){if(void 0===t)return "undefined";if(null===t)return "null";if("string"==typeof t)return t.length>20&&(t=t.substring(0,20)+"..."),JSON.stringify(t);if("number"==typeof t||"boolean"==typeof t)return ""+t;if("object"==_typeof(t)){if(t instanceof Array)return "an array";var e=/** Hacky method to try to get the constructor name for an object. */function(t){if(t.constructor){var e=/function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());if(e&&e.length>1)return e[1];}return null;}(t);return e?"a custom "+e+" object":"an object";}return "function"==typeof t?"a function":_();}function xs(t,e,n){if(void 0===n)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires a valid "+Rs(e)+" argument, but it was undefined.");}/**
   * Validates the provided positional argument is an object, and its keys and
   * values match the expected keys and types provided in optionTypes.
   */function Os(t,e,n){U$1(e,function(e,r){if(n.indexOf(e)<0)throw new j(q$1.INVALID_ARGUMENT,"Unknown option '"+e+"' passed to function "+t+"(). Available options: "+n.join(", "));});}/**
   * Helper method to throw an error that the provided argument did not pass
   * an instanceof check.
   */function Ps(t,e,n,r){var i=ks(r);return new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+Rs(n)+" argument to be a "+e+", but it was: "+i);}function Ls(t,e,n){if(n<=0)throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+Rs(e)+" argument to be a positive number, but it was: "+n+".");}/** Converts a number to its english word representation */function Rs(t){switch(t){case 1:return "first";case 2:return "second";case 3:return "third";default:return t+"th";}}/**
   * Formats the given word as plural conditionally given the preceding number.
   */function Ms(t,e){return t+" "+e+(1===t?"":"s");}/**
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
   */ /** Helper function to assert Uint8Array is available at runtime. */function Vs(){if("undefined"==typeof Uint8Array)throw new j(q$1.UNIMPLEMENTED,"Uint8Arrays are not available in this environment.");}/** Helper function to assert Base64 functions are available at runtime. */function Us(){if("undefined"==typeof atob)throw new j(q$1.UNIMPLEMENTED,"Blobs are unavailable in Firestore in this environment.");}/**
   * Immutable class holding a blob (binary data).
   * This class is directly exposed in the public API.
   *
   * Note that while you can't hide the constructor in JavaScript code, we are
   * using the hack above to make sure no-one outside this module can call it.
   */var Cs=/** @class */function(){function t(t){Us(),this.gf=t;}return t.fromBase64String=function(e){gs("Blob.fromBase64String",arguments,1),Is("Blob.fromBase64String","string",1,e),Us();try{return new t(rt.fromBase64String(e));}catch(e){throw new j(q$1.INVALID_ARGUMENT,"Failed to construct Blob from Base64 string: "+e);}},t.fromUint8Array=function(e){if(gs("Blob.fromUint8Array",arguments,1),Vs(),!(e instanceof Uint8Array))throw Ps("Blob.fromUint8Array","Uint8Array",1,e);return new t(rt.fromUint8Array(e));},t.prototype.toBase64=function(){return gs("Blob.toBase64",arguments,0),Us(),this.gf.toBase64();},t.prototype.toUint8Array=function(){return gs("Blob.toUint8Array",arguments,0),Vs(),this.gf.toUint8Array();},t.prototype.toString=function(){return "Blob(base64: "+this.toBase64()+")";},t.prototype.isEqual=function(t){return this.gf.isEqual(t.gf);},t;}(),Fs=function Fs(t){!function(t,e,n,r){if(!(e instanceof Array)||e.length<1)throw new j(q$1.INVALID_ARGUMENT,"Function FieldPath() requires its fieldNames argument to be an array with at least "+Ms(1,"element")+".");}(0,t);for(var e=0;e<t.length;++e){if(Is("FieldPath","string",e,t[e]),0===t[e].length)throw new j(q$1.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");}this.Vf=new K$1(t);},qs=/** @class */function(e){/**
       * Creates a FieldPath from the provided field names. If more than one field
       * name is provided, the path will point to a nested field in a document.
       *
       * @param fieldNames A list of field names.
       */function n(){for(var t=[],n=0;n<arguments.length;n++){t[n]=arguments[n];}return e.call(this,t)||this;}return __extends$1(n,e),n.documentId=function(){/**
           * Internal Note: The backend doesn't technically support querying by
           * document ID. Instead it queries by the entire document name (full path
           * included), but in the cases we currently support documentId(), the net
           * effect is the same.
           */return new n(K$1.L().F());},n.prototype.isEqual=function(t){if(!(t instanceof n))throw Ps("isEqual","FieldPath",1,t);return this.Vf.isEqual(t.Vf);},n;}(Fs),js=new RegExp("[~\\*/\\[\\]]"),Bs=function Bs(){/** A pointer to the implementing class. */this.yf=this;},zs=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).pf=t,n;}return __extends$1(n,e),n.prototype.bf=function(t){if(2/* MergeSet */!==t.vf)throw 1/* Update */===t.vf?t.Sf(this.pf+"() can only appear at the top level of your update data"):t.Sf(this.pf+"() cannot be used with set() unless you pass {merge:true}");// No transform to add for a delete, but we need to add it to our
  // fieldMask so it gets deleted.
  return t.Le.push(t.path),null;},n.prototype.isEqual=function(t){return t instanceof n;},n;}(Bs);/**
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
   */function Gs(t,e,n){return new ru({vf:3/* Argument */,Df:e.settings.Df,methodName:t.pf,Cf:n},e.s,e.serializer,e.ignoreUndefinedProperties);}var Qs=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).pf=t,n;}return __extends$1(n,e),n.prototype.bf=function(t){return new We(t.path,new Fe());},n.prototype.isEqual=function(t){return t instanceof n;},n;}(Bs),Hs=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).pf=t,r.Nf=n,r;}return __extends$1(n,e),n.prototype.bf=function(t){var e=Gs(this,t,/*array=*/!0),n=this.Nf.map(function(t){return cu(t,e);}),r=new qe(n);return new We(t.path,r);},n.prototype.isEqual=function(t){// TODO(mrschmidt): Implement isEquals
  return this===t;},n;}(Bs),Ks=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).pf=t,r.Nf=n,r;}return __extends$1(n,e),n.prototype.bf=function(t){var e=Gs(this,t,/*array=*/!0),n=this.Nf.map(function(t){return cu(t,e);}),r=new Be(n);return new We(t.path,r);},n.prototype.isEqual=function(t){// TODO(mrschmidt): Implement isEquals
  return this===t;},n;}(Bs),Ws=/** @class */function(e){function n(t,n){var r=this;return (r=e.call(this)||this).pf=t,r.Ff=n,r;}return __extends$1(n,e),n.prototype.bf=function(t){var e=new Ge(t.serializer,ue(t.serializer,this.Ff));return new We(t.path,e);},n.prototype.isEqual=function(t){// TODO(mrschmidt): Implement isEquals
  return this===t;},n;}(Bs),$s=/** @class */function(e){function n(){return e.call(this)||this;}return __extends$1(n,e),n.delete=function(){return ms("FieldValue.delete",arguments),new Ys(new zs("FieldValue.delete"));},n.serverTimestamp=function(){return ms("FieldValue.serverTimestamp",arguments),new Ys(new Qs("FieldValue.serverTimestamp"));},n.arrayUnion=function(){for(var t=[],e=0;e<arguments.length;e++){t[e]=arguments[e];}// NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return ws("FieldValue.arrayUnion",arguments,1),new Ys(new Hs("FieldValue.arrayUnion",t));},n.arrayRemove=function(){for(var t=[],e=0;e<arguments.length;e++){t[e]=arguments[e];}// NOTE: We don't actually parse the data until it's used in set() or
  // update() since we'd need the Firestore instance to do this.
  return ws("FieldValue.arrayRemove",arguments,1),new Ys(new Ks("FieldValue.arrayRemove",t));},n.increment=function(t){return Is("FieldValue.increment","number",1,t),gs("FieldValue.increment",arguments,1),new Ys(new Ws("FieldValue.increment",t));},n;}(Bs),Ys=/** @class */function(e){function n(t){var n=this;return (n=e.call(this)||this).yf=t,n.pf=t.pf,n;}return __extends$1(n,e),n.prototype.bf=function(t){return this.yf.bf(t);},n.prototype.isEqual=function(t){return t instanceof n&&this.yf.isEqual(t.yf);},n;}($s),Xs=/** @class */function(){function t(t,e){if(gs("GeoPoint",arguments,2),Is("GeoPoint","number",1,t),Is("GeoPoint","number",2,e),!isFinite(t)||t<-90||t>90)throw new j(q$1.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||e>180)throw new j(q$1.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this.kf=t,this.xf=e;}return Object.defineProperty(t.prototype,"latitude",{/**
           * Returns the latitude of this geo point, a number between -90 and 90.
           */get:function get(){return this.kf;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"longitude",{/**
           * Returns the longitude of this geo point, a number between -180 and 180.
           */get:function get(){return this.xf;},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(t){return this.kf===t.kf&&this.xf===t.xf;},t.prototype.toJSON=function(){return {latitude:this.kf,longitude:this.xf};},/**
       * Actually private to JS consumers of our API, so this function is prefixed
       * with an underscore.
       */t.prototype.T=function(t){return O$1(this.kf,t.kf)||O$1(this.xf,t.xf);},t;}(),Js=/^__.*__$/,Zs=function Zs(t,e,n){this.Mf=t,this.Of=e,this.$f=n;},tu=/** @class */function(){function t(t,e,n){this.data=t,this.Le=e,this.fieldTransforms=n;}return t.prototype.Lf=function(t,e){var n=[];return null!==this.Le?n.push(new sn(t,this.data,this.Le,e)):n.push(new on(t,this.data,e)),this.fieldTransforms.length>0&&n.push(new an(t,this.fieldTransforms)),n;},t;}(),eu=/** @class */function(){function t(t,e,n){this.data=t,this.Le=e,this.fieldTransforms=n;}return t.prototype.Lf=function(t,e){var n=[new sn(t,this.data,this.Le,e)];return this.fieldTransforms.length>0&&n.push(new an(t,this.fieldTransforms)),n;},t;}();function nu(t){switch(t){case 0/* Set */:// fall through
  case 2/* MergeSet */:// fall through
  case 1/* Update */:return !0;case 3/* Argument */:case 4/* ArrayArgument */:return !1;default:throw _();}}/** A "context" object passed around while parsing user data. */var ru=/** @class */function(){/**
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
  void 0===i&&this.Bf(),this.fieldTransforms=i||[],this.Le=o||[];}return Object.defineProperty(t.prototype,"path",{get:function get(){return this.settings.path;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"vf",{get:function get(){return this.settings.vf;},enumerable:!1,configurable:!0}),/** Returns a new context with the specified settings overwritten. */t.prototype.qf=function(e){return new t(Object.assign(Object.assign({},this.settings),e),this.s,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.Le);},t.prototype.Uf=function(t){var e,n=null===(e=this.path)||void 0===e?void 0:e.child(t),r=this.qf({path:n,Cf:!1});return r.Qf(t),r;},t.prototype.Wf=function(t){var e,n=null===(e=this.path)||void 0===e?void 0:e.child(t),r=this.qf({path:n,Cf:!1});return r.Bf(),r;},t.prototype.jf=function(t){// TODO(b/34871131): We don't support array paths right now; so make path
  // undefined.
  return this.qf({path:void 0,Cf:!0});},t.prototype.Sf=function(t){return yu(t,this.settings.methodName,this.settings.Kf||!1,this.path,this.settings.Df);},/** Returns 'true' if 'fieldPath' was traversed when creating this context. */t.prototype.contains=function(t){return void 0!==this.Le.find(function(e){return t.D(e);})||void 0!==this.fieldTransforms.find(function(e){return t.D(e.field);});},t.prototype.Bf=function(){// TODO(b/34871131): Remove null check once we have proper paths for fields
  // within arrays.
  if(this.path)for(var t=0;t<this.path.length;t++){this.Qf(this.path.get(t));}},t.prototype.Qf=function(t){if(0===t.length)throw this.Sf("Document fields must not be empty");if(nu(this.vf)&&Js.test(t))throw this.Sf('Document fields cannot begin and end with "__"');},t;}(),iu=/** @class */function(){function t(t,e,n){this.s=t,this.ignoreUndefinedProperties=e,this.serializer=n||ir(t)/** Creates a new top-level parse context. */;}return t.prototype.Gf=function(t,e,n,r){return void 0===r&&(r=!1),new ru({vf:t,methodName:e,Df:n,path:K$1.M(),Cf:!1,Kf:r},this.s,this.serializer,this.ignoreUndefinedProperties);},t;}();/**
   * Helper for parsing raw user input (provided via the API) into internal model
   * classes.
   */ /** Parse document data from a set() call. */function ou(t,e,n,r,i,o){void 0===o&&(o={});var s=t.Gf(o.merge||o.mergeFields?2/* MergeSet */:0/* Set */,e,n,i);lu("Data must be an object, but it was:",s,r);var u,a,c=hu(r,s);if(o.merge)u=new Ke(s.Le),a=s.fieldTransforms;else if(o.mergeFields){for(var h=[],f=0,l=o.mergeFields;f<l.length;f++){var p=l[f],d=void 0;if(p instanceof Fs)d=p.Vf;else {if("string"!=typeof p)throw _();d=du(e,p,n);}if(!s.contains(d))throw new j(q$1.INVALID_ARGUMENT,"Field '"+d+"' is specified in your field mask but missing from your input data.");vu(h,d)||h.push(d);}u=new Ke(h),a=s.fieldTransforms.filter(function(t){return u.je(t.field);});}else u=null,a=s.fieldTransforms;return new tu(new pn(c),u,a);}/** Parse update data from an update() call. */function su(t,e,n,r){var i=t.Gf(1/* Update */,e,n);lu("Data must be an object, but it was:",i,r);var o=[],s=new dn();U$1(r,function(t,r){var u=du(e,t,n),a=i.Wf(u);if(r instanceof Bs&&r.yf instanceof zs)// Add it to the field mask, but don't add anything to updateData.
  o.push(u);else {var c=cu(r,a);null!=c&&(o.push(u),s.set(u,c));}});var u=new Ke(o);return new eu(s.Ge(),u,i.fieldTransforms);}/** Parse update data from a list of field/value arguments. */function uu(t,e,n,r,i,o){var s=t.Gf(1/* Update */,e,n),u=[pu(e,r,n)],a=[i];if(o.length%2!=0)throw new j(q$1.INVALID_ARGUMENT,"Function "+e+"() needs to be called with an even number of arguments that alternate between field names and values.");for(var c=0;c<o.length;c+=2){u.push(pu(e,o[c])),a.push(o[c+1]);}// We iterate in reverse order to pick the last value for a field if the
  // user specified the field multiple times.
  for(var h=[],f=new dn(),l=u.length-1;l>=0;--l){if(!vu(h,u[l])){var p=u[l],d=a[l],y=s.Wf(p);if(d instanceof Bs&&d.yf instanceof zs)// Add it to the field mask, but don't add anything to updateData.
  h.push(p);else {var v=cu(d,y);null!=v&&(h.push(p),f.set(p,v));}}}var m=new Ke(h);return new eu(f.Ge(),m,s.fieldTransforms);}/**
   * Parse a "query value" (e.g. value in a where filter or a value in a cursor
   * bound).
   *
   * @param allowArrays Whether the query value is an array that may directly
   * contain additional arrays (e.g. the operand of an `in` query).
   */function au(t,e,n,r){return void 0===r&&(r=!1),cu(n,t.Gf(r?4/* ArrayArgument */:3/* Argument */,e));}/**
   * Parses user data to Protobuf Values.
   *
   * @param input Data to be parsed.
   * @param context A context object representing the current path being parsed,
   * the source of the data being parsed, etc.
   * @return The parsed value, or null if the value was a FieldValue sentinel
   * that should not be included in the resulting parsed data.
   */function cu(t,e){if(fu(t))return lu("Unsupported field value:",e,t),hu(t,e);if(t instanceof Bs)// FieldValues usually parse into transforms (except FieldValue.delete())
  // in which case we do not want to include this field in our parsed data
  // (as doing so will overwrite the field directly prior to the transform
  // trying to transform it). So we don't add this location to
  // context.fieldMask and we return null as our parsing result.
  /**
       * "Parses" the provided FieldValueImpl, adding any necessary transforms to
       * context.fieldTransforms.
       */return function(t,e){// Sentinels are only supported with writes, and not within arrays.
  if(!nu(e.vf))throw e.Sf(t.pf+"() can only be used with update() and set()");if(!e.path)throw e.Sf(t.pf+"() is not currently supported inside arrays");var n=t.bf(e);n&&e.fieldTransforms.push(n);}(t,e),null;if(// If context.path is null we are inside an array and we don't support
  // field mask paths more granular than the top-level array.
  e.path&&e.Le.push(e.path),t instanceof Array){// TODO(b/34871131): Include the path containing the array in the error
  // message.
  // In the case of IN queries, the parsed data is an array (representing
  // the set of values to be included for the IN query) that may directly
  // contain additional arrays (each representing an individual field
  // value), so we disable this validation.
  if(e.settings.Cf&&4/* ArrayArgument */!==e.vf)throw e.Sf("Nested arrays are not supported");return function(t,e){for(var n=[],r=0,i=0,o=t;i<o.length;i++){var s=cu(o[i],e.jf(r));null==s&&(// Just include nulls in the array for fields being replaced with a
  // sentinel.
  s={nullValue:"NULL_VALUE"}),n.push(s),r++;}return {arrayValue:{values:n}};}(t,e);}return function(t,e){if(null===t)return {nullValue:"NULL_VALUE"};if("number"==typeof t)return ue(e.serializer,t);if("boolean"==typeof t)return {booleanValue:t};if("string"==typeof t)return {stringValue:t};if(t instanceof Date){var n=B.fromDate(t);return {timestampValue:ae(e.serializer,n)};}if(t instanceof B){// Firestore backend truncates precision down to microseconds. To ensure
  // offline mode works the same with regards to truncation, perform the
  // truncation immediately without waiting for the backend to do that.
  var r=new B(t.seconds,1e3*Math.floor(t.nanoseconds/1e3));return {timestampValue:ae(e.serializer,r)};}if(t instanceof Xs)return {geoPointValue:{latitude:t.latitude,longitude:t.longitude}};if(t instanceof Cs)return {bytesValue:ce(e.serializer,t)};if(t instanceof Zs){var i=e.s,o=t.Mf;if(!o.isEqual(i))throw e.Sf("Document reference is for database "+o.projectId+"/"+o.database+" but should be for database "+i.projectId+"/"+i.database);return {referenceValue:le(t.Mf||e.s,t.Of.path)};}if(void 0===t&&e.ignoreUndefinedProperties)return null;throw e.Sf("Unsupported field value: "+ks(t));}(t,e);}function hu(t,e){var n={};return C$1(t)?// If we encounter an empty object, we explicitly add it to the update
  // mask to ensure that the server creates a map entry.
  e.path&&e.path.length>0&&e.Le.push(e.path):U$1(t,function(t,r){var i=cu(r,e.Uf(t));null!=i&&(n[t]=i);}),{mapValue:{fields:n}};}function fu(t){return !("object"!=_typeof(t)||null===t||t instanceof Array||t instanceof Date||t instanceof B||t instanceof Xs||t instanceof Cs||t instanceof Zs||t instanceof Bs);}function lu(t,e,n){if(!fu(n)||!Ds(n)){var r=ks(n);throw "an object"===r?e.Sf(t+" a custom object"):e.Sf(t+" "+r);}}/**
   * Helper that calls fromDotSeparatedString() but wraps any error thrown.
   */function pu(t,e,n){if(e instanceof Fs)return e.Vf;if("string"==typeof e)return du(t,e);throw yu("Field path arguments must be of type string or FieldPath.",t,/* hasConverter= */!1,/* path= */void 0,n);}/**
   * Wraps fromDotSeparatedString with an error message about the method that
   * was thrown.
   * @param methodName The publicly visible method name
   * @param path The dot-separated string form of a field path which will be split
   * on dots.
   * @param targetDoc The document against which the field path will be evaluated.
   */function du(t,e,n){try{return function(t){if(t.search(js)>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid field path ("+t+"). Paths must not contain '~', '*', '/', '[', or ']'");try{return new(qs.bind.apply(qs,__spreadArrays$1([void 0],t.split("."))))();}catch(e){throw new j(q$1.INVALID_ARGUMENT,"Invalid field path ("+t+"). Paths must not be empty, begin with '.', end with '.', or contain '..'");}}(e).Vf;}catch(e){throw yu((i=e)instanceof Error?i.message:i.toString(),t,/* hasConverter= */!1,/* path= */void 0,n);}/**
   * Extracts the message from a caught exception, which should be an Error object
   * though JS doesn't guarantee that.
   */var i;/** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}function yu(t,e,n,r,i){var o=r&&!r._(),s=void 0!==i,u="Function "+e+"() called with invalid data";n&&(u+=" (via `toFirestore()`)");var a="";return (o||s)&&(a+=" (found",o&&(a+=" in field "+r),s&&(a+=" in document "+i),a+=")"),new j(q$1.INVALID_ARGUMENT,(u+=". ")+t+a);}function vu(t,e){return t.some(function(t){return t.isEqual(e);});}/**
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
   */var mu=/** @class */function(){function t(t){this.uu=t,// The version of each document that was read during this transaction.
  this.zf=new Map(),this.mutations=[],this.Hf=!1,/**
               * A deferred usage error that occurred previously in this transaction that
               * will cause the transaction to fail once it actually commits.
               */this.Jf=null,/**
               * Set of documents that have been written in the transaction.
               *
               * When there's more than one write to the same key in a transaction, any
               * writes after the first are handled differently.
               */this.Yf=new Set();}return t.prototype.Xf=function(t){return __awaiter$2(this,void 0,void 0,function(){var r,i=this;return __generator$2(this,function(o){switch(o.label){case 0:if(this.Zf(),this.mutations.length>0)throw new j(q$1.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes.");return [4/*yield*/,function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o,s,u,a;return __generator$2(this,function(n){switch(n.label){case 0:return e=D$1(t),i=ge(e.serializer)+"/documents",o={documents:r.map(function(t){return de(e.serializer,t);})},[4/*yield*/,e.Za("BatchGetDocuments",i,o)];case 1:return s=n.sent(),u=new Map(),s.forEach(function(t){var n=function(t,e){return "found"in e?function(t,e){S$1(!!e.found),e.found.name,e.found.updateTime;var n=ye(t,e.found.name),r=fe(e.found.updateTime),i=new pn({mapValue:{fields:e.found.fields}});return new mn(n,r,i,{});}(t,e):"missing"in e?function(t,e){S$1(!!e.missing),S$1(!!e.readTime);var n=ye(t,e.missing),r=fe(e.readTime);return new gn(n,r);}(t,e):_();}(e.serializer,t);u.set(n.key.toString(),n);}),a=[],[2/*return*/,(r.forEach(function(t){var e=u.get(t.toString());S$1(!!e),a.push(e);}),a)];}});});}(this.uu,t)];case 1:return [2/*return*/,((r=o.sent()).forEach(function(t){t instanceof gn||t instanceof mn?i.td(t):_();}),r)];}});});},t.prototype.set=function(t,e){this.write(e.Lf(t,this.Ue(t))),this.Yf.add(t);},t.prototype.update=function(t,e){try{this.write(e.Lf(t,this.ed(t)));}catch(t){this.Jf=t;}this.Yf.add(t);},t.prototype.delete=function(t){this.write([new fn(t,this.Ue(t))]),this.Yf.add(t);},t.prototype.commit=function(){return __awaiter$2(this,void 0,void 0,function(){var t,r=this;return __generator$2(this,function(i){switch(i.label){case 0:if(this.Zf(),this.Jf)throw this.Jf;return t=this.zf,// For each mutation, note that the doc was written.
  this.mutations.forEach(function(e){t.delete(e.key.toString());}),// For each document that was read but not written to, we want to perform
  // a `verify` operation.
  t.forEach(function(t,e){var n=new W$1(Q$1.k(e));r.mutations.push(new ln(n,r.Ue(n)));}),[4/*yield*/,function(t,r){return __awaiter$2(this,void 0,void 0,function(){var e,i,o;return __generator$2(this,function(n){switch(n.label){case 0:return e=D$1(t),i=ge(e.serializer)+"/documents",o={writes:r.map(function(t){return Ee(e.serializer,t);})},[4/*yield*/,e.Xa("Commit",i,o)];case 1:return n.sent(),[2/*return*/];}});});}(this.uu,this.mutations)];case 1:// For each mutation, note that the doc was written.
  return i.sent(),this.Hf=!0,[2/*return*/];}});});},t.prototype.td=function(t){var e;if(t instanceof mn)e=t.version;else {if(!(t instanceof gn))throw _();// For deleted docs, we must use baseVersion 0 when we overwrite them.
  e=z.min();}var n=this.zf.get(t.key.toString());if(n){if(!e.isEqual(n))// This transaction will fail no matter what.
  throw new j(q$1.ABORTED,"Document version changed between two reads.");}else this.zf.set(t.key.toString(),e);},/**
       * Returns the version of this document when it was read in this transaction,
       * as a precondition, or no precondition if it was not read.
       */t.prototype.Ue=function(t){var e=this.zf.get(t.toString());return !this.Yf.has(t)&&e?Ye.updateTime(e):Ye.Qe();},/**
       * Returns the precondition for a document if the operation is an update.
       */t.prototype.ed=function(t){var e=this.zf.get(t.toString());// The first time a document is written, we want to take into account the
  // read time and existence
  if(!this.Yf.has(t)&&e){if(e.isEqual(z.min()))// The document doesn't exist, so fail the transaction.
  // This has to be validated locally because you can't send a
  // precondition that a document does not exist without changing the
  // semantics of the backend write to be an insert. This is the reverse
  // of what we want, since we want to assert that the document doesn't
  // exist but then send the update and have it fail. Since we can't
  // express that to the backend, we have to validate locally.
  // Note: this can change once we can send separate verify writes in the
  // transaction.
  throw new j(q$1.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");// Document exists, base precondition on document update time.
  return Ye.updateTime(e);}// Document was not read, so we just use the preconditions for a blind
  // update.
  return Ye.exists(!0);},t.prototype.write=function(t){this.Zf(),this.mutations=this.mutations.concat(t);},t.prototype.Zf=function(){},t;}(),gu=/** @class */function(){function t(t,e,n,r){this.bi=t,this.uu=e,this.updateFunction=n,this.Di=r,this.nd=5,this.Ui=new vr(this.bi,"transaction_retry"/* TransactionRetry */)/** Runs the transaction and sets the result on deferred. */;}return t.prototype.run=function(){this.sd();},t.prototype.sd=function(){var t=this;this.Ui.Zs(function(){return __awaiter$2(t,void 0,void 0,function(){var t,e,r=this;return __generator$2(this,function(n){return t=new mu(this.uu),(e=this.rd(t))&&e.then(function(e){r.bi.ki(function(){return t.commit().then(function(){r.Di.resolve(e);}).catch(function(t){r.od(t);});});}).catch(function(t){r.od(t);}),[2/*return*/];});});});},t.prototype.rd=function(t){try{var e=this.updateFunction(t);return !$(e)&&e.catch&&e.then?e:(this.Di.reject(Error("Transaction callback must return a Promise")),null);}catch(t){// Do not retry errors thrown by user provided updateFunction.
  return this.Di.reject(t),null;}},t.prototype.od=function(t){var e=this;this.nd>0&&this.hd(t)?(this.nd-=1,this.bi.ki(function(){return e.sd(),Promise.resolve();})):this.Di.reject(t);},t.prototype.hd=function(t){if("FirebaseError"===t.name){// In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
  // non-matching document versions with ABORTED. These errors should be retried.
  var e=t.code;return "aborted"===e||"failed-precondition"===e||!at(e);}return !1;},t;}(),wu=/** @class */function(){function t(t,/**
       * Asynchronous queue responsible for all of our internal processing. When
       * we get incoming work from the user (via public API) or the network
       * (incoming GRPC messages), we should always schedule onto this queue.
       * This ensures all of our work is properly serialized (e.g. we don't
       * start processing a new operation while the previous one is waiting for
       * an async I/O to complete).
       */e){this.credentials=t,this.bi=e,this.clientId=x$1.t(),// We defer our initialization until we get the current user from
  // setChangeListener(). We block the async queue until we got the initial
  // user and the initialization is completed. This will prevent any scheduled
  // work from happening before initialization is completed.
  // If initializationDone resolved then the FirestoreClient is in a usable
  // state.
  this.ad=new er()/**
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
       */;}return t.prototype.start=function(t,e,n,r){var i=this;this.ud(),this.z_=t;// If usePersistence is true, certain classes of errors while starting are
  // recoverable but only by falling back to persistence disabled.
  // If there's an error in the first case but not in recovery we cannot
  // reject the promise blocking the async queue because this will cause the
  // async queue to panic.
  var o=new er(),s=!1;// Return only the result of enabling persistence. Note that this does not
  // need to await the completion of initializationDone because the result of
  // this method should not reflect any other kind of failure to start.
  return this.credentials.la(function(t){if(!s)return s=!0,E$1("FirestoreClient","Initializing. user=",t.uid),i.ld(e,n,r,t,o).then(i.ad.resolve,i.ad.reject);i.bi.Hi(function(){return i.dl.Yu(t);});}),// Block the async queue until initialization is done
  this.bi.ki(function(){return i.ad.promise;}),o.promise;},/** Enables the network connection and requeues all pending operations. */t.prototype.enableNetwork=function(){var t=this;return this.ud(),this.bi.enqueue(function(){return t.persistence.dh(!0),t.dl.enableNetwork();});},/**
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
       */t.prototype.ld=function(t,r,i,o,s){return __awaiter$2(this,void 0,void 0,function(){var u,a,c=this;return __generator$2(this,function(h){switch(h.label){case 0:return h.trys.push([0,3,,4]),u={bi:this.bi,z_:this.z_,clientId:this.clientId,credentials:this.credentials,_f:o,Tl:100,df:i},[4/*yield*/,t.initialize(u)];case 1:return h.sent(),[4/*yield*/,r.initialize(t,u)];case 2:return h.sent(),this.persistence=t.persistence,this.wl=t.wl,this.os=t.os,this.uf=t.uf,this.uu=r.uu,this.dl=r.dl,this.Mu=r.Mu,this._d=r.If,// When a user calls clearPersistence() in one client, all other clients
  // need to be terminated to allow the delete to succeed.
  this.persistence.fh(function(){return __awaiter$2(c,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:return [4/*yield*/,this.terminate()];case 1:return t.sent(),[2/*return*/];}});});}),s.resolve(),[3/*break*/,4];case 3:// An unknown failure on the first stage shuts everything down.
  if(a=h.sent(),// Regardless of whether or not the retry succeeds, from an user
  // perspective, offline persistence has failed.
  s.reject(a),!this.fd(a))throw a;return [2/*return*/,(console.warn("Error enabling offline persistence. Falling back to persistence disabled: "+a),this.ld(new ls(),new ds(),{ff:!1},o,s))];case 4:return [2/*return*/];}});});},/**
       * Decides whether the provided error allows us to gracefully disable
       * persistence (as opposed to crashing the client).
       */t.prototype.fd=function(t){return "FirebaseError"===t.name?t.code===q$1.FAILED_PRECONDITION||t.code===q$1.UNIMPLEMENTED:!("undefined"!=typeof DOMException&&t instanceof DOMException)||// When the browser is out of quota we could get either quota exceeded
  // or an aborted error depending on whether the error happened during
  // schema migration.
  22===t.code||20===t.code||// Firefox Private Browsing mode disables IndexedDb and returns
  // INVALID_STATE for any usage.
  11===t.code;},/**
       * Checks that the client has not been terminated. Ensures that other methods on
       * this class cannot be called after the client is terminated.
       */t.prototype.ud=function(){if(this.bi.Wi)throw new j(q$1.FAILED_PRECONDITION,"The client has already been terminated.");},/** Disables the network connection. Pending operations will not complete. */t.prototype.disableNetwork=function(){var t=this;return this.ud(),this.bi.enqueue(function(){return t.persistence.dh(!1),t.dl.disableNetwork();});},t.prototype.terminate=function(){var t=this;this.bi.zi();var r=new er();return this.bi.ji(function(){return __awaiter$2(t,void 0,void 0,function(){var t,e;return __generator$2(this,function(n){switch(n.label){case 0:return n.trys.push([0,4,,5]),// PORTING NOTE: LocalStore does not need an explicit shutdown on web.
  this.uf&&this.uf.stop(),[4/*yield*/,this.dl.ph()];case 1:return n.sent(),[4/*yield*/,this.wl.ph()];case 2:return n.sent(),[4/*yield*/,this.persistence.ph()];case 3:// PORTING NOTE: LocalStore does not need an explicit shutdown on web.
  return n.sent(),// `removeChangeListener` must be called after shutting down the
  // RemoteStore as it will prevent the RemoteStore from retrieving
  // auth tokens.
  this.credentials._a(),r.resolve(),[3/*break*/,5];case 4:return t=n.sent(),e=xr(t,"Failed to shutdown persistence"),r.reject(e),[3/*break*/,5];case 5:return [2/*return*/];}});});}),r.promise;},/**
       * Returns a Promise that resolves when all writes that were pending at the time this
       * method was called received server acknowledgement. An acknowledgement can be either acceptance
       * or rejection.
       */t.prototype.waitForPendingWrites=function(){var t=this;this.ud();var e=new er();return this.bi.ki(function(){return t.Mu.Ll(e);}),e.promise;},t.prototype.listen=function(t,e,n){var r=this;this.ud();var i=new vs(n),o=new Xo(t,i,e);return this.bi.ki(function(){return r._d.listen(o);}),function(){i.Pf(),r.bi.ki(function(){return r._d.ku(o);});};},t.prototype.dd=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(r){switch(r.label){case 0:return this.ud(),[4/*yield*/,this.ad.promise];case 1:return [2/*return*/,(r.sent(),function(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var o,s=this;return __generator$2(this,function(u){switch(u.label){case 0:return o=new er(),[4/*yield*/,t.enqueue(function(){return __awaiter$2(s,void 0,void 0,function(){var t,e,s;return __generator$2(this,function(n){switch(n.label){case 0:return n.trys.push([0,2,,3]),[4/*yield*/,function(t,e){var n=D$1(t);return n.persistence.runTransaction("read document","readonly",function(t){return n.Ts.gs(t,e);});}(r,i)];case 1:return (t=n.sent())instanceof mn?o.resolve(t):t instanceof gn?o.resolve(null):o.reject(new j(q$1.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)")),[3/*break*/,3];case 2:return e=n.sent(),s=xr(e,"Failed to get document '"+i+" from cache"),o.reject(s),[3/*break*/,3];case 3:return [2/*return*/];}});});})];case 1:return [2/*return*/,(u.sent(),o.promise)];}});});}(this.bi,this.os,t))];}});});},t.prototype.wd=function(t,r){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:return this.ud(),[4/*yield*/,this.ad.promise];case 1:return [2/*return*/,(e.sent(),function(t,e,n,r){var i=new er(),o=bu(t,e,Tn(n.path),{includeMetadataChanges:!0,l_:!0},{next:function next(t){// Remove query first before passing event to user to avoid
  // user actions affecting the now stale query.
  o();var e=t.docs.has(n);!e&&t.fromCache?// TODO(dimond): If we're online and the document doesn't
  // exist then we resolve with a doc.exists set to false. If
  // we're offline however, we reject the Promise in this
  // case. Two options: 1) Cache the negative response from
  // the server so we can deliver that even when you're
  // offline 2) Actually reject the Promise in the online case
  // if the document doesn't exist.
  i.reject(new j(q$1.UNAVAILABLE,"Failed to get document because the client is offline.")):e&&t.fromCache&&r&&"server"===r.source?i.reject(new j(q$1.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):i.resolve(t);},error:function error(t){return i.reject(t);}});return i.promise;}(this.bi,this._d,t,r))];}});});},t.prototype.Td=function(t){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(r){switch(r.label){case 0:return this.ud(),[4/*yield*/,this.ad.promise];case 1:return [2/*return*/,(r.sent(),function(t,r,i){return __awaiter$2(this,void 0,void 0,function(){var o,s=this;return __generator$2(this,function(u){switch(u.label){case 0:return o=new er(),[4/*yield*/,t.enqueue(function(){return __awaiter$2(s,void 0,void 0,function(){var t,e,s,u,a,c;return __generator$2(this,function(n){switch(n.label){case 0:return n.trys.push([0,2,,3]),[4/*yield*/,ro(r,i,/* usePreviousResults= */!0)];case 1:return t=n.sent(),e=new Mo(i,t.Gh),s=e.nl(t.documents),u=e.Un(s,/* updateLimboDocuments= */!1),o.resolve(u.snapshot),[3/*break*/,3];case 2:return a=n.sent(),c=xr(a,"Failed to execute query '"+i+" against cache"),o.reject(c),[3/*break*/,3];case 3:return [2/*return*/];}});});})];case 1:return [2/*return*/,(u.sent(),o.promise)];}});});}(this.bi,this.os,t))];}});});},t.prototype.md=function(t,r){return __awaiter$2(this,void 0,void 0,function(){return __generator$2(this,function(e){switch(e.label){case 0:return this.ud(),[4/*yield*/,this.ad.promise];case 1:return [2/*return*/,(e.sent(),function(t,e,n,r){var i=new er(),o=bu(t,e,n,{includeMetadataChanges:!0,l_:!0},{next:function next(t){// Remove query first before passing event to user to avoid
  // user actions affecting the now stale query.
  o(),t.fromCache&&r&&"server"===r.source?i.reject(new j(q$1.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):i.resolve(t);},error:function error(t){return i.reject(t);}});return i.promise;}(this.bi,this._d,t,r))];}});});},t.prototype.write=function(t){var e=this;this.ud();var n=new er();return this.bi.ki(function(){return e.Mu.write(t,n);}),n.promise;},t.prototype.s=function(){return this.z_.s;},t.prototype.s_=function(t){var r=this;this.ud();var i=new vs(t);return this.bi.ki(function(){return __awaiter$2(r,void 0,void 0,function(){return __generator$2(this,function(t){return [2/*return*/,this._d.s_(i)];});});}),function(){i.Pf(),r.bi.ki(function(){return __awaiter$2(r,void 0,void 0,function(){return __generator$2(this,function(t){return [2/*return*/,this._d.i_(i)];});});});};},Object.defineProperty(t.prototype,"Ed",{get:function get(){// Technically, the asyncQueue is still running, but only accepting operations
  // related to termination or supposed to be run after termination. It is effectively
  // terminated to the eyes of users.
  return this.bi.Wi;},enumerable:!1,configurable:!0}),/**
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
       */t.prototype.transaction=function(t){var e=this;this.ud();var n=new er();return this.bi.ki(function(){return new gu(e.bi,e.uu,t,n).run(),Promise.resolve();}),n.promise;},t.prototype.loadBundle=function(t,r){var i=this;this.ud();var o=function(t,e){var n;return n="string"==typeof t?new TextEncoder().encode(t):t,new sr(rr(n),e);}(t,ir(this.z_.s));this.bi.ki(function(){return __awaiter$2(i,void 0,void 0,function(){return __generator$2(this,function(t){return [2/*return*/,(Wo(this.Mu,o,r),r.catch(function(t){N$1("FirestoreClient","Loading bundle failed with "+t);}))];});});});},t.prototype.Vo=function(t){return this.ud(),function(t,e){var n=D$1(t);return n.persistence.runTransaction("Get named query","readonly",function(t){return n.rh.Vo(t,e);});}(this.os,t);},t;}();/**
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
   */function bu(t,e,n,r,i){var o=new vs(i),s=new Xo(n,o,r);return t.ki(function(){return e.listen(s);}),function(){o.Pf(),t.ki(function(){return e.ku(s);});};}var Iu=/** @class */function(){function t(t,e,n,r){this.s=t,this.timestampsInSnapshots=e,this.Id=n,this.Ad=r;}return t.prototype.Rd=function(t){switch(jt(t)){case 0/* NullValue */:return null;case 1/* BooleanValue */:return t.booleanValue;case 2/* NumberValue */:return Wt(t.integerValue||t.doubleValue);case 3/* TimestampValue */:return this.Pd(t.timestampValue);case 4/* ServerTimestampValue */:return this.gd(t);case 5/* StringValue */:return t.stringValue;case 6/* BlobValue */:return new Cs($t(t.bytesValue));case 7/* RefValue */:return this.Vd(t.referenceValue);case 8/* GeoPointValue */:return this.yd(t.geoPointValue);case 9/* ArrayValue */:return this.pd(t.arrayValue);case 10/* ObjectValue */:return this.bd(t.mapValue);default:throw _();}},t.prototype.bd=function(t){var e=this,n={};return U$1(t.fields||{},function(t,r){n[t]=e.Rd(r);}),n;},t.prototype.yd=function(t){return new Xs(Wt(t.latitude),Wt(t.longitude));},t.prototype.pd=function(t){var e=this;return (t.values||[]).map(function(t){return e.Rd(t);});},t.prototype.gd=function(t){switch(this.Id){case"previous":var e=function t(e){var n=e.mapValue.fields.__previous_value__;return Ct(n)?t(n):n;}(t);return null==e?null:this.Rd(e);case"estimate":return this.Pd(Ft(t));default:return null;}},t.prototype.Pd=function(t){var e=Kt(t),n=new B(e.seconds,e.nanos);return this.timestampsInSnapshots?n:n.toDate();},t.prototype.Vd=function(t){var e=Q$1.k(t);S$1(Re(e));var n=new M$1(e.get(1),e.get(3)),r=new W$1(e.V(5));return n.isEqual(this.s)||// TODO(b/64130202): Somehow support foreign references.
  T$1("Document "+r+" contains a document reference within a different database ("+n.projectId+"/"+n.database+") which is not supported. It will be treated as a reference in the current database ("+this.s.projectId+"/"+this.s.database+") instead."),this.Ad(r);},t;}(),Eu=/** @class */function(){function t(){this.vd={},this.Sd=new er(),this.Dd={taskState:"Running",totalBytes:0,totalDocuments:0,bytesLoaded:0,documentsLoaded:0};}return t.prototype.onProgress=function(t,e,n){this.vd={next:t,error:e,complete:n};},t.prototype.catch=function(t){return this.Sd.promise.catch(t);},t.prototype.then=function(t,e){return this.Sd.promise.then(t,e);},/**
       * Notifies all observers that bundle loading has completed, with a provided
       * `LoadBundleTaskProgress` object.
       */t.prototype.Hl=function(t){this.Jl(t),this.vd.complete&&this.vd.complete(),this.Sd.resolve(t);},/**
       * Notifies all observers that bundle loading has failed, with a provided
       * `Error` as the reason.
       */t.prototype.Yl=function(t){this.Dd.taskState="Error",this.vd.next&&this.vd.next(this.Dd),this.vd.error&&this.vd.error(t),this.Sd.reject(t);},/**
       * Notifies a progress update of loading a bundle.
       * @param progress The new progress.
       */t.prototype.Jl=function(t){this.Dd=t,this.vd.next&&this.vd.next(t);},t;}(),Tu=Rr.Er,Nu=/** @class */function(){function t(t){var e,n,r,i;if(void 0===t.host){if(void 0!==t.ssl)throw new j(q$1.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0;}else Ts("settings","non-empty string","host",t.host),this.host=t.host,Ns("settings","boolean","ssl",t.ssl),this.ssl=null===(e=t.ssl)||void 0===e||e;if(Os("settings",t,["host","ssl","credentials","timestampsInSnapshots","cacheSizeBytes","experimentalForceLongPolling","ignoreUndefinedProperties"]),Ns("settings","object","credentials",t.credentials),this.credentials=t.credentials,Ns("settings","boolean","timestampsInSnapshots",t.timestampsInSnapshots),Ns("settings","boolean","ignoreUndefinedProperties",t.ignoreUndefinedProperties),// Nobody should set timestampsInSnapshots anymore, but the error depends on
  // whether they set it to true or false...
  !0===t.timestampsInSnapshots?T$1("The setting 'timestampsInSnapshots: true' is no longer required and should be removed."):!1===t.timestampsInSnapshots&&T$1("Support for 'timestampsInSnapshots: false' will be removed soon. You must update your code to handle Timestamp objects."),this.timestampsInSnapshots=null===(n=t.timestampsInSnapshots)||void 0===n||n,this.ignoreUndefinedProperties=null!==(r=t.ignoreUndefinedProperties)&&void 0!==r&&r,Ns("settings","number","cacheSizeBytes",t.cacheSizeBytes),void 0===t.cacheSizeBytes)this.cacheSizeBytes=Rr.Ar;else {if(t.cacheSizeBytes!==Tu&&t.cacheSizeBytes<Rr.Ir)throw new j(q$1.INVALID_ARGUMENT,"cacheSizeBytes must be at least "+Rr.Ir);this.cacheSizeBytes=t.cacheSizeBytes;}Ns("settings","boolean","experimentalForceLongPolling",t.experimentalForceLongPolling),this.forceLongPolling=null!==(i=t.experimentalForceLongPolling)&&void 0!==i&&i;}return t.prototype.isEqual=function(t){return this.host===t.host&&this.ssl===t.ssl&&this.timestampsInSnapshots===t.timestampsInSnapshots&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.forceLongPolling===t.forceLongPolling&&this.ignoreUndefinedProperties===t.ignoreUndefinedProperties;},t;}(),Au=/** @class */function(){// Note: We are using `MemoryComponentProvider` as a default
  // ComponentProvider to ensure backwards compatibility with the format
  // expected by the console build.
  function t(r,i,o,s){var u=this;if(void 0===o&&(o=new ls()),void 0===s&&(s=new ds()),this.Cd=o,this.Nd=s,this.Fd=null,// Public for use in tests.
  // TODO(mikelehen): Use modularized initialization instead.
  this.kd=new kr(),this.INTERNAL={delete:function _delete(){return __awaiter$2(u,void 0,void 0,function(){return __generator$2(this,function(t){switch(t.label){case 0:// The client must be initalized to ensure that all subsequent API usage
  // throws an exception.
  return this.xd(),[4/*yield*/,this.Md.terminate()];case 1:// The client must be initalized to ensure that all subsequent API usage
  // throws an exception.
  return t.sent(),[2/*return*/];}});});}},"object"==_typeof(r.options)){// This is very likely a Firebase app object
  // TODO(b/34177605): Can we somehow use instanceof?
  var a=r;this.Fd=a,this.Mf=t.Od(a),this.$d=a.name,this.Ld=new po(i);}else {var c=r;if(!c.projectId)throw new j(q$1.INVALID_ARGUMENT,"Must provide projectId");this.Mf=new M$1(c.projectId,c.database),// Use a default persistenceKey that lines up with FirebaseApp.
  this.$d="[DEFAULT]",this.Ld=new lo();}this.Bd=new Nu({});}return Object.defineProperty(t.prototype,"qd",{get:function get(){return this.Ud||(// Lazy initialize UserDataReader once the settings are frozen
  this.Ud=new iu(this.Mf,this.Bd.ignoreUndefinedProperties)),this.Ud;},enumerable:!1,configurable:!0}),t.prototype.settings=function(t){gs("Firestore.settings",arguments,1),Is("Firestore.settings","object",1,t);var e=new Nu(t);if(this.Md&&!this.Bd.isEqual(e))throw new j(q$1.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only call settings() before calling any other methods on a Firestore object.");this.Bd=e,void 0!==e.credentials&&(this.Ld=function(t){if(!t)return new lo();switch(t.type){case"gapi":var e=t.Qd;// Make sure this really is a Gapi client.
  return S$1(!("object"!=_typeof(e)||null===e||!e.auth||!e.auth.getAuthHeaderValueForFirstParty)),new vo(e,t.Ea||"0");case"provider":return t.Qd;default:throw new j(q$1.INVALID_ARGUMENT,"makeCredentialsProvider failed due to invalid credential type");}}(e.credentials));},t.prototype.enableNetwork=function(){return this.xd(),this.Md.enableNetwork();},t.prototype.disableNetwork=function(){return this.xd(),this.Md.disableNetwork();},t.prototype.enablePersistence=function(t){var e,n;if(this.Md)throw new j(q$1.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only call enablePersistence() before calling any other methods on a Firestore object.");var r=!1,i=!1;if(t&&(void 0!==t.experimentalTabSynchronization&&T$1("The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead."),r=null!==(n=null!==(e=t.synchronizeTabs)&&void 0!==e?e:t.experimentalTabSynchronization)&&void 0!==n&&n,i=!!t.experimentalForceOwningTab&&t.experimentalForceOwningTab,r&&i))throw new j(q$1.INVALID_ARGUMENT,"The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'.");return this.Wd(this.Cd,this.Nd,{ff:!0,cacheSizeBytes:this.Bd.cacheSizeBytes,synchronizeTabs:r,Ho:i});},t.prototype.clearPersistence=function(){return __awaiter$2(this,void 0,void 0,function(){var t,r=this;return __generator$2(this,function(i){if(void 0!==this.Md&&!this.Md.Ed)throw new j(q$1.FAILED_PRECONDITION,"Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");return t=new er(),[2/*return*/,(this.kd.ji(function(){return __awaiter$2(r,void 0,void 0,function(){var e;return __generator$2(this,function(n){switch(n.label){case 0:return n.trys.push([0,2,,3]),[4/*yield*/,this.Cd.clearPersistence(this.Mf,this.$d)];case 1:return n.sent(),t.resolve(),[3/*break*/,3];case 2:return e=n.sent(),t.reject(e),[3/*break*/,3];case 3:return [2/*return*/];}});});}),t.promise)];});});},t.prototype.terminate=function(){return this.app._removeServiceInstance("firestore"),this.INTERNAL.delete();},Object.defineProperty(t.prototype,"jd",{get:function get(){return this.xd(),this.Md.Ed;},enumerable:!1,configurable:!0}),t.prototype.waitForPendingWrites=function(){return this.xd(),this.Md.waitForPendingWrites();},t.prototype.onSnapshotsInSync=function(t){if(this.xd(),ys(t))return this.Md.s_(t);Is("Firestore.onSnapshotsInSync","function",1,t);var e={next:t};return this.Md.s_(e);},t.prototype.loadBundle=function(t){this.xd();var e=new Eu();return this.Md.loadBundle(t,e),e;},t.prototype.namedQuery=function(t){return __awaiter$2(this,void 0,void 0,function(){var e;return __generator$2(this,function(n){switch(n.label){case 0:return this.xd(),[4/*yield*/,this.Md.Vo(t)];case 1:return [2/*return*/,(e=n.sent())?new Cu(e.query,this,null):null];}});});},t.prototype.xd=function(){return this.Md||// Kick off starting the client but don't actually wait for it.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  this.Wd(new ls(),new ds(),{ff:!1}),this.Md;},t.prototype.Kd=function(){return new R$1(this.Mf,this.$d,this.Bd.host,this.Bd.ssl,this.Bd.forceLongPolling);},t.prototype.Wd=function(t,e,n){var r=this.Kd();return this.Md=new wu(this.Ld,this.kd),this.Md.start(r,t,e,n);},t.Od=function(t){if(e=t.options,!Object.prototype.hasOwnProperty.call(e,"projectId"))throw new j(q$1.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');var e,n=t.options.projectId;/**
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
   */if(!n||"string"!=typeof n)throw new j(q$1.INVALID_ARGUMENT,"projectId must be a string in FirebaseApp.options");return new M$1(n);},Object.defineProperty(t.prototype,"app",{get:function get(){if(!this.Fd)throw new j(q$1.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this.Fd;},enumerable:!1,configurable:!0}),t.prototype.collection=function(t){return gs("Firestore.collection",arguments,1),Is("Firestore.collection","non-empty string",1,t),this.xd(),new qu(Q$1.k(t),this,/* converter= */null);},t.prototype.doc=function(t){return gs("Firestore.doc",arguments,1),Is("Firestore.doc","non-empty string",1,t),this.xd(),Du.Gd(Q$1.k(t),this,/* converter= */null);},t.prototype.collectionGroup=function(t){if(gs("Firestore.collectionGroup",arguments,1),Is("Firestore.collectionGroup","non-empty string",1,t),t.indexOf("/")>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid collection ID '"+t+"' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.");return this.xd(),new Cu(function(t){return new In(Q$1.M(),t);}(t),this,/* converter= */null);},t.prototype.runTransaction=function(t){var e=this;return gs("Firestore.runTransaction",arguments,1),Is("Firestore.runTransaction","function",1,t),this.xd().transaction(function(n){return t(new _u(e,n));});},t.prototype.batch=function(){return this.xd(),new Su(this);},Object.defineProperty(t,"logLevel",{get:function get(){switch(I$1()){case LogLevel.DEBUG:return "debug";case LogLevel.ERROR:return "error";case LogLevel.SILENT:return "silent";case LogLevel.WARN:return "warn";case LogLevel.INFO:return "info";case LogLevel.VERBOSE:return "verbose";default:// The default log level is error
  return "error";}},enumerable:!1,configurable:!0}),t.setLogLevel=function(t){var e;gs("Firestore.setLogLevel",arguments,1),_s("setLogLevel",["debug","error","silent","warn","info","verbose"],1,t),e=t,b.setLogLevel(e);},// Note: this is not a property because the minifier can't work correctly with
  // the way TypeScript compiler outputs properties.
  t.prototype.zd=function(){return this.Bd.timestampsInSnapshots;},t;}(),_u=/** @class */function(){function t(t,e){this.Hd=t,this.Jd=e;}return t.prototype.get=function(t){var e=this;gs("Transaction.get",arguments,1);var n=Gu("Transaction.get",t,this.Hd);return this.Jd.Xf([n.Of]).then(function(t){if(!t||1!==t.length)return _();var r=t[0];if(r instanceof gn)return new xu(e.Hd,n.Of,null,/* fromCache= */!1,/* hasPendingWrites= */!1,n.$f);if(r instanceof mn)return new xu(e.Hd,n.Of,r,/* fromCache= */!1,/* hasPendingWrites= */!1,n.$f);throw _();});},t.prototype.set=function(t,e,n){bs("Transaction.set",arguments,2,3);var r=Gu("Transaction.set",t,this.Hd);n=ju("Transaction.set",n);var i=Hu(r.$f,e,n),o=ou(this.Hd.qd,"Transaction.set",r.Of,i,null!==r.$f,n);return this.Jd.set(r.Of,o),this;},t.prototype.update=function(t,e,n){for(var r,i,o=[],s=3;s<arguments.length;s++){o[s-3]=arguments[s];}return "string"==typeof e||e instanceof qs?(ws("Transaction.update",arguments,3),r=Gu("Transaction.update",t,this.Hd),i=uu(this.Hd.qd,"Transaction.update",r.Of,e,n,o)):(gs("Transaction.update",arguments,2),r=Gu("Transaction.update",t,this.Hd),i=su(this.Hd.qd,"Transaction.update",r.Of,e)),this.Jd.update(r.Of,i),this;},t.prototype.delete=function(t){gs("Transaction.delete",arguments,1);var e=Gu("Transaction.delete",t,this.Hd);return this.Jd.delete(e.Of),this;},t;}(),Su=/** @class */function(){function t(t){this.Hd=t,this.Yd=[],this.Xd=!1;}return t.prototype.set=function(t,e,n){bs("WriteBatch.set",arguments,2,3),this.Zd();var r=Gu("WriteBatch.set",t,this.Hd);n=ju("WriteBatch.set",n);var i=Hu(r.$f,e,n),o=ou(this.Hd.qd,"WriteBatch.set",r.Of,i,null!==r.$f,n);return this.Yd=this.Yd.concat(o.Lf(r.Of,Ye.Qe())),this;},t.prototype.update=function(t,e,n){for(var r,i,o=[],s=3;s<arguments.length;s++){o[s-3]=arguments[s];}return this.Zd(),"string"==typeof e||e instanceof qs?(ws("WriteBatch.update",arguments,3),r=Gu("WriteBatch.update",t,this.Hd),i=uu(this.Hd.qd,"WriteBatch.update",r.Of,e,n,o)):(gs("WriteBatch.update",arguments,2),r=Gu("WriteBatch.update",t,this.Hd),i=su(this.Hd.qd,"WriteBatch.update",r.Of,e)),this.Yd=this.Yd.concat(i.Lf(r.Of,Ye.exists(!0))),this;},t.prototype.delete=function(t){gs("WriteBatch.delete",arguments,1),this.Zd();var e=Gu("WriteBatch.delete",t,this.Hd);return this.Yd=this.Yd.concat(new fn(e.Of,Ye.Qe())),this;},t.prototype.commit=function(){return this.Zd(),this.Xd=!0,this.Yd.length>0?this.Hd.xd().write(this.Yd):Promise.resolve();},t.prototype.Zd=function(){if(this.Xd)throw new j(q$1.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.");},t;}(),Du=/** @class */function(e){function n(t,n,r){var i=this;return (i=e.call(this,n.Mf,t,r)||this).Of=t,i.firestore=n,i.$f=r,i.Md=i.firestore.xd(),i;}return __extends$1(n,e),n.Gd=function(t,e,r){if(t.length%2!=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid document reference. Document references must have an even number of segments, but "+t.F()+" has "+t.length);return new n(new W$1(t),e,r);},Object.defineProperty(n.prototype,"id",{get:function get(){return this.Of.path.S();},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"parent",{get:function get(){return new qu(this.Of.path.p(),this.firestore,this.$f);},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"path",{get:function get(){return this.Of.path.F();},enumerable:!1,configurable:!0}),n.prototype.collection=function(t){if(gs("DocumentReference.collection",arguments,1),Is("DocumentReference.collection","non-empty string",1,t),!t)throw new j(q$1.INVALID_ARGUMENT,"Must provide a non-empty collection name to collection()");var e=Q$1.k(t);return new qu(this.Of.path.child(e),this.firestore,/* converter= */null);},n.prototype.isEqual=function(t){if(!(t instanceof n))throw Ps("isEqual","DocumentReference",1,t);return this.firestore===t.firestore&&this.Of.isEqual(t.Of)&&this.$f===t.$f;},n.prototype.set=function(t,e){bs("DocumentReference.set",arguments,1,2),e=ju("DocumentReference.set",e);var n=Hu(this.$f,t,e),r=ou(this.firestore.qd,"DocumentReference.set",this.Of,n,null!==this.$f,e);return this.Md.write(r.Lf(this.Of,Ye.Qe()));},n.prototype.update=function(t,e){for(var n,r=[],i=2;i<arguments.length;i++){r[i-2]=arguments[i];}return "string"==typeof t||t instanceof qs?(ws("DocumentReference.update",arguments,2),n=uu(this.firestore.qd,"DocumentReference.update",this.Of,t,e,r)):(gs("DocumentReference.update",arguments,1),n=su(this.firestore.qd,"DocumentReference.update",this.Of,t)),this.Md.write(n.Lf(this.Of,Ye.exists(!0)));},n.prototype.delete=function(){return gs("DocumentReference.delete",arguments,0),this.Md.write([new fn(this.Of,Ye.Qe())]);},n.prototype.onSnapshot=function(){for(var t,e,n,r=this,i=[],o=0;o<arguments.length;o++){i[o]=arguments[o];}bs("DocumentReference.onSnapshot",arguments,1,4);var s={includeMetadataChanges:!1},u=0;"object"!=_typeof(i[u])||ys(i[u])||(Os("DocumentReference.onSnapshot",s=i[u],["includeMetadataChanges"]),Ns("DocumentReference.onSnapshot","boolean","includeMetadataChanges",s.includeMetadataChanges),u++);var a={includeMetadataChanges:s.includeMetadataChanges};if(ys(i[u])){var c=i[u];i[u]=null===(t=c.next)||void 0===t?void 0:t.bind(c),i[u+1]=null===(e=c.error)||void 0===e?void 0:e.bind(c),i[u+2]=null===(n=c.complete)||void 0===n?void 0:n.bind(c);}else Is("DocumentReference.onSnapshot","function",u,i[u]),Es("DocumentReference.onSnapshot","function",u+1,i[u+1]),Es("DocumentReference.onSnapshot","function",u+2,i[u+2]);var h={next:function next(t){i[u]&&i[u](r.tw(t));},error:i[u+1],complete:i[u+2]};return this.Md.listen(Tn(this.Of.path),a,h);},n.prototype.get=function(t){var e=this;bs("DocumentReference.get",arguments,0,1),zu("DocumentReference.get",t);var n=this.firestore.xd();return t&&"cache"===t.source?n.dd(this.Of).then(function(t){return new xu(e.firestore,e.Of,t,/*fromCache=*/!0,t instanceof mn&&t.Ke,e.$f);}):n.wd(this.Of,t).then(function(t){return e.tw(t);});},n.prototype.withConverter=function(t){return new n(this.Of,this.firestore,t);},/**
       * Converts a ViewSnapshot that contains the current document to a
       * DocumentSnapshot.
       */n.prototype.tw=function(t){var e=t.docs.get(this.Of);return new xu(this.firestore,this.Of,e,t.fromCache,t.hasPendingWrites,this.$f);},n;}(Zs),ku=/** @class */function(){function t(t,e){this.hasPendingWrites=t,this.fromCache=e;}return t.prototype.isEqual=function(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache;},t;}(),xu=/** @class */function(){function t(t,e,n,r,i,o){this.Hd=t,this.Of=e,this.ew=n,this.nw=r,this.sw=i,this.$f=o;}return t.prototype.data=function(t){var e=this;if(bs("DocumentSnapshot.data",arguments,0,1),t=Bu("DocumentSnapshot.data",t),this.ew){// We only want to use the converter and create a new DocumentSnapshot
  // if a converter has been provided.
  if(this.$f){var n=new Ou(this.Hd,this.Of,this.ew,this.nw,this.sw,/* converter= */null);return this.$f.fromFirestore(n,t);}return new Iu(this.Hd.Mf,this.Hd.zd(),t.serverTimestamps||"none",function(t){return new Du(t,e.Hd,/* converter= */null);}).Rd(this.ew.Ze());}},t.prototype.get=function(t,e){var n=this;if(bs("DocumentSnapshot.get",arguments,1,2),e=Bu("DocumentSnapshot.get",e),this.ew){var r=this.ew.data().field(pu("DocumentSnapshot.get",t,this.Of));if(null!==r)return new Iu(this.Hd.Mf,this.Hd.zd(),e.serverTimestamps||"none",function(t){return new Du(t,n.Hd,n.$f);}).Rd(r);}},Object.defineProperty(t.prototype,"id",{get:function get(){return this.Of.path.S();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"ref",{get:function get(){return new Du(this.Of,this.Hd,this.$f);},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"exists",{get:function get(){return null!==this.ew;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"metadata",{get:function get(){return new ku(this.sw,this.nw);},enumerable:!1,configurable:!0}),t.prototype.isEqual=function(e){if(!(e instanceof t))throw Ps("isEqual","DocumentSnapshot",1,e);return this.Hd===e.Hd&&this.nw===e.nw&&this.Of.isEqual(e.Of)&&(null===this.ew?null===e.ew:this.ew.isEqual(e.ew))&&this.$f===e.$f;},t;}(),Ou=/** @class */function(e){function n(){return null!==e&&e.apply(this,arguments)||this;}return __extends$1(n,e),n.prototype.data=function(t){return e.prototype.data.call(this,t);},n;}(xu);/**
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
   */function Pu(t,e,n,r,i,o,s){var u;if(i.$()){if("array-contains"/* ARRAY_CONTAINS */===o||"array-contains-any"/* ARRAY_CONTAINS_ANY */===o)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. You can't perform '"+o+"' queries on FieldPath.documentId().");if("in"/* IN */===o||"not-in"/* NOT_IN */===o){Mu(s,o);for(var a=[],c=0,h=s;c<h.length;c++){var f=h[c];a.push(Ru(r,t,f));}u={arrayValue:{values:a}};}else u=Ru(r,t,s);}else "in"/* IN */!==o&&"not-in"/* NOT_IN */!==o&&"array-contains-any"/* ARRAY_CONTAINS_ANY */!==o||Mu(s,o),u=au(n,e,s,/* allowArrays= */"in"/* IN */===o||"not-in"/* NOT_IN */===o);var l=Mn.create(i,o,u);return function(t,e){if(e.ln()){var n=t.cn();if(null!==n&&!n.isEqual(e.field))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '"+n.toString()+"' and '"+e.field.toString()+"'");var r=t.un();null!==r&&Vu(t,e.field,r);}var i=t._n(/**
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
  throw i===e.op?new j(q$1.INVALID_ARGUMENT,"Invalid query. You cannot use more than one '"+e.op.toString()+"' filter."):new j(q$1.INVALID_ARGUMENT,"Invalid query. You cannot use '"+e.op.toString()+"' filters with '"+i.toString()+"' filters.");}(t,l),l;}function Lu(t,e,n){if(null!==t.startAt)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(null!==t.endAt)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");var r=new Wn(e,n);return function(t,e){if(null===t.un()){// This is the first order by. It must match any inequality.
  var n=t.cn();null!==n&&Vu(t,n,e.field);}}(t,r),r/**
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
   */;}function Ru(t,e,n){if("string"==typeof n){if(""===n)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");if(!Nn(e)&&-1!==n.indexOf("/"))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '"+n+"' contains a '/' character.");var r=e.path.child(Q$1.k(n));if(!W$1.W(r))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '"+r+"' is not because it has an odd number of segments ("+r.length+").");return Yt(t,new W$1(r));}if(n instanceof Zs)return Yt(t,n.Of);throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: "+ks(n)+".");}/**
   * Validates that the value passed into a disjunctive filter satisfies all
   * array requirements.
   */function Mu(t,e){if(!Array.isArray(t)||0===t.length)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. A non-empty array is required for '"+e.toString()+"' filters.");if(t.length>10)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters support a maximum of 10 elements in the value array.");if("in"/* IN */===e||"array-contains-any"/* ARRAY_CONTAINS_ANY */===e){if(t.indexOf(null)>=0)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters cannot contain 'null' in the value array.");if(t.filter(function(t){return Number.isNaN(t);}).length>0)throw new j(q$1.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters cannot contain 'NaN' in the value array.");}}function Vu(t,e,n){if(!n.isEqual(e))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '"+e.toString()+"' and so you must also use '"+e.toString()+"' as your first orderBy(), but your first orderBy() is on field '"+n.toString()+"' instead.");}function Uu(t){if(t.an()&&0===t.tn.length)throw new j(q$1.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause");}var Cu=/** @class */function(){function t(t,e,n){this.iw=t,this.firestore=e,this.$f=n;}return t.prototype.where=function(e,n,r){// TODO(ne-queries): Add 'not-in' and '!=' to validation.
  var i;gs("Query.where",arguments,3),xs("Query.where",3,r),i="not-in"===n||"!="===n?n:_s("Query.where",["<"/* LESS_THAN */,"<="/* LESS_THAN_OR_EQUAL */,"=="/* EQUAL */,">="/* GREATER_THAN_OR_EQUAL */,">"/* GREATER_THAN */,"array-contains"/* ARRAY_CONTAINS */,"in"/* IN */,"array-contains-any"/* ARRAY_CONTAINS_ANY */],2,n);var o=pu("Query.where",e),s=Pu(this.iw,"Query.where",this.firestore.qd,this.firestore.Mf,o,i,r);return new t(function(t,e){var n=t.filters.concat([e]);return new In(t.path,t.collectionGroup,t.tn.slice(),n,t.limit,t.en,t.startAt,t.endAt);}(this.iw,s),this.firestore,this.$f);},t.prototype.orderBy=function(e,n){var r;if(bs("Query.orderBy",arguments,1,2),Es("Query.orderBy","non-empty string",2,n),void 0===n||"asc"===n)r="asc"/* ASCENDING */;else {if("desc"!==n)throw new j(q$1.INVALID_ARGUMENT,"Function Query.orderBy() has unknown direction '"+n+"', expected 'asc' or 'desc'.");r="desc"/* DESCENDING */;}var i=pu("Query.orderBy",e),o=Lu(this.iw,i,r);return new t(function(t,e){// TODO(dimond): validate that orderBy does not list the same key twice.
  var n=t.tn.concat([e]);return new In(t.path,t.collectionGroup,n,t.filters.slice(),t.limit,t.en,t.startAt,t.endAt);}(this.iw,o),this.firestore,this.$f);},t.prototype.limit=function(e){return gs("Query.limit",arguments,1),Is("Query.limit","number",1,e),Ls("Query.limit",1,e),new t(Sn(this.iw,e,"F"/* First */),this.firestore,this.$f);},t.prototype.limitToLast=function(e){return gs("Query.limitToLast",arguments,1),Is("Query.limitToLast","number",1,e),Ls("Query.limitToLast",1,e),new t(Sn(this.iw,e,"L"/* Last */),this.firestore,this.$f);},t.prototype.startAt=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}ws("Query.startAt",arguments,1);var i=this.rw("Query.startAt",e,n,/*before=*/!0);return new t(Dn(this.iw,i),this.firestore,this.$f);},t.prototype.startAfter=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}ws("Query.startAfter",arguments,1);var i=this.rw("Query.startAfter",e,n,/*before=*/!1);return new t(Dn(this.iw,i),this.firestore,this.$f);},t.prototype.endBefore=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}ws("Query.endBefore",arguments,1);var i=this.rw("Query.endBefore",e,n,/*before=*/!0);return new t(kn(this.iw,i),this.firestore,this.$f);},t.prototype.endAt=function(e){for(var n=[],r=1;r<arguments.length;r++){n[r-1]=arguments[r];}ws("Query.endAt",arguments,1);var i=this.rw("Query.endAt",e,n,/*before=*/!1);return new t(kn(this.iw,i),this.firestore,this.$f);},t.prototype.isEqual=function(e){if(!(e instanceof t))throw Ps("isEqual","Query",1,e);return this.firestore===e.firestore&&xn(this.iw,e.iw)&&this.$f===e.$f;},t.prototype.withConverter=function(e){return new t(this.iw,this.firestore,e);},/** Helper function to create a bound from a document or fields */t.prototype.rw=function(t,e,n,i){if(xs(t,1,e),e instanceof xu)return gs(t,__spreadArrays$1([e],n),1),function(t,e,n,r,i){if(!r)throw new j(q$1.NOT_FOUND,"Can't use a DocumentSnapshot that doesn't exist for "+n+"().");// Because people expect to continue/end a query at the exact document
  // provided, we need to use the implicit sort order rather than the explicit
  // sort order, because it's guaranteed to contain the document key. That way
  // the position becomes unambiguous and the query continues/ends exactly at
  // the provided document. Without the key (by using the explicit sort
  // orders), multiple documents could match the position, yielding duplicate
  // results.
  for(var o=[],s=0,u=An(t);s<u.length;s++){var a=u[s];if(a.field.$())o.push(Yt(e,r.key));else {var c=r.field(a.field);if(Ct(c))throw new j(q$1.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+a.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(null===c){var h=a.field.F();throw new j(q$1.INVALID_ARGUMENT,"Invalid query. You are trying to start or end a query using a document for which the field '"+h+"' (used as the orderBy) does not exist.");}o.push(c);}}return new Gn(o,i);}(this.iw,this.firestore.Mf,t,e.ew,i);var o=[e].concat(n);return function(t,e,n,r,i,o){// Use explicit order by's because it has to match the query the user made
  var s=t.tn;if(i.length>s.length)throw new j(q$1.INVALID_ARGUMENT,"Too many arguments provided to "+r+"(). The number of arguments must be less than or equal to the number of orderBy() clauses");for(var u=[],a=0;a<i.length;a++){var c=i[a];if(s[a].field.$()){if("string"!=typeof c)throw new j(q$1.INVALID_ARGUMENT,"Invalid query. Expected a string for document ID in "+r+"(), but got a "+_typeof(c));if(!Nn(t)&&-1!==c.indexOf("/"))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to "+r+"() must be a plain document ID, but '"+c+"' contains a slash.");var h=t.path.child(Q$1.k(c));if(!W$1.W(h))throw new j(q$1.INVALID_ARGUMENT,"Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to "+r+"() must result in a valid document path, but '"+h+"' is not because it contains an odd number of segments.");var f=new W$1(h);u.push(Yt(e,f));}else {var l=au(n,r,c);u.push(l);}}return new Gn(u,o);}(this.iw,this.firestore.Mf,this.firestore.qd,t,o,i);},t.prototype.onSnapshot=function(){for(var t,e,n,r=this,i=[],o=0;o<arguments.length;o++){i[o]=arguments[o];}bs("Query.onSnapshot",arguments,1,4);var s={},u=0;if("object"!=_typeof(i[u])||ys(i[u])||(Os("Query.onSnapshot",s=i[u],["includeMetadataChanges"]),Ns("Query.onSnapshot","boolean","includeMetadataChanges",s.includeMetadataChanges),u++),ys(i[u])){var a=i[u];i[u]=null===(t=a.next)||void 0===t?void 0:t.bind(a),i[u+1]=null===(e=a.error)||void 0===e?void 0:e.bind(a),i[u+2]=null===(n=a.complete)||void 0===n?void 0:n.bind(a);}else Is("Query.onSnapshot","function",u,i[u]),Es("Query.onSnapshot","function",u+1,i[u+1]),Es("Query.onSnapshot","function",u+2,i[u+2]);var c={next:function next(t){i[u]&&i[u](new Fu(r.firestore,r.iw,t,r.$f));},error:i[u+1],complete:i[u+2]};return Uu(this.iw),this.firestore.xd().listen(this.iw,s,c);},t.prototype.get=function(t){var e=this;bs("Query.get",arguments,0,1),zu("Query.get",t),Uu(this.iw);var n=this.firestore.xd();return (t&&"cache"===t.source?n.Td(this.iw):n.md(this.iw,t)).then(function(t){return new Fu(e.firestore,e.iw,t,e.$f);});},t;}(),Fu=/** @class */function(){function t(t,e,n,r){this.Hd=t,this.ow=e,this.hw=n,this.$f=r,this.aw=null,this.uw=null,this.metadata=new ku(n.hasPendingWrites,n.fromCache);}return Object.defineProperty(t.prototype,"docs",{get:function get(){var t=[];return this.forEach(function(e){return t.push(e);}),t;},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"empty",{get:function get(){return this.hw.docs._();},enumerable:!1,configurable:!0}),Object.defineProperty(t.prototype,"size",{get:function get(){return this.hw.docs.size;},enumerable:!1,configurable:!0}),t.prototype.forEach=function(t,e){var n=this;bs("QuerySnapshot.forEach",arguments,1,2),Is("QuerySnapshot.forEach","function",1,t),this.hw.docs.forEach(function(r){t.call(e,n.cw(r,n.metadata.fromCache,n.hw.Lt.has(r.key)));});},Object.defineProperty(t.prototype,"query",{get:function get(){return new Cu(this.ow,this.Hd,this.$f);},enumerable:!1,configurable:!0}),t.prototype.docChanges=function(t){t&&(Os("QuerySnapshot.docChanges",t,["includeMetadataChanges"]),Ns("QuerySnapshot.docChanges","boolean","includeMetadataChanges",t.includeMetadataChanges));var e=!(!t||!t.includeMetadataChanges);if(e&&this.hw.qt)throw new j(q$1.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this.aw&&this.uw===e||(this.aw=/**
       * Calculates the array of firestore.DocumentChange's for a given ViewSnapshot.
       *
       * Exported for testing.
       *
       * @param snapshot The ViewSnapshot that represents the expected state.
       * @param includeMetadataChanges Whether to include metadata changes.
       * @param converter A factory function that returns a QueryDocumentSnapshot.
       * @return An objecyt that matches the firestore.DocumentChange API.
       */function(t,e,n){if(t.$t._()){// Special case the first snapshot because index calculation is easy and
  // fast
  var r=0;return t.docChanges.map(function(e){var i=n(e.doc,t.fromCache,t.Lt.has(e.doc.key));return e.doc,{type:"added",doc:i,oldIndex:-1,newIndex:r++};});}// A DocumentSet that is updated incrementally as changes are applied to use
  // to lookup the index of a document.
  var i=t.$t;return t.docChanges.filter(function(t){return e||3/* Metadata */!==t.type;}).map(function(e){var r=n(e.doc,t.fromCache,t.Lt.has(e.doc.key)),o=-1,s=-1;return 0/* Added */!==e.type&&(o=i.indexOf(e.doc.key),i=i.delete(e.doc.key)),1/* Removed */!==e.type&&(s=(i=i.add(e.doc)).indexOf(e.doc.key)),{type:Qu(e.type),doc:r,oldIndex:o,newIndex:s};});}(this.hw,e,this.cw.bind(this)),this.uw=e),this.aw;},/** Check the equality. The call can be very expensive. */t.prototype.isEqual=function(e){if(!(e instanceof t))throw Ps("isEqual","QuerySnapshot",1,e);return this.Hd===e.Hd&&xn(this.ow,e.ow)&&this.hw.isEqual(e.hw)&&this.$f===e.$f;},t.prototype.cw=function(t,e,n){return new Ou(this.Hd,t.key,t,e,n,this.$f);},t;}(),qu=/** @class */function(e){function n(t,n,r){var i=this;if((i=e.call(this,Tn(t),n,r)||this).lw=t,t.length%2!=1)throw new j(q$1.INVALID_ARGUMENT,"Invalid collection reference. Collection references must have an odd number of segments, but "+t.F()+" has "+t.length);return i;}return __extends$1(n,e),Object.defineProperty(n.prototype,"id",{get:function get(){return this.iw.path.S();},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"parent",{get:function get(){var t=this.iw.path.p();return t._()?null:new Du(new W$1(t),this.firestore,/* converter= */null);},enumerable:!1,configurable:!0}),Object.defineProperty(n.prototype,"path",{get:function get(){return this.iw.path.F();},enumerable:!1,configurable:!0}),n.prototype.doc=function(t){bs("CollectionReference.doc",arguments,0,1),// We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  0===arguments.length&&(t=x$1.t()),Is("CollectionReference.doc","non-empty string",1,t);var e=Q$1.k(t);return Du.Gd(this.iw.path.child(e),this.firestore,this.$f);},n.prototype.add=function(t){gs("CollectionReference.add",arguments,1),Is("CollectionReference.add","object",1,this.$f?this.$f.toFirestore(t):t);var e=this.doc();return e.set(t).then(function(){return e;});},n.prototype.withConverter=function(t){return new n(this.lw,this.firestore,t);},n;}(Cu);function ju(t,e){if(void 0===e)return {merge:!1};if(Os(t,e,["merge","mergeFields"]),Ns(t,"boolean","merge",e.merge),function(t,e,n,r,i){void 0!==r&&function(t,e,n,r,i){if(!(r instanceof Array))throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires its "+e+" option to be an array, but it was: "+ks(r));for(var o=0;o<r.length;++o){if(!i(r[o]))throw new j(q$1.INVALID_ARGUMENT,"Function "+t+"() requires all "+e+" elements to be "+n+", but the value at index "+o+" was: "+ks(r[o]));}}(t,e,n,r,i);}(t,"mergeFields","a string or a FieldPath",e.mergeFields,function(t){return "string"==typeof t||t instanceof qs;}),void 0!==e.mergeFields&&void 0!==e.merge)throw new j(q$1.INVALID_ARGUMENT,"Invalid options passed to function "+t+'(): You cannot specify both "merge" and "mergeFields".');return e;}function Bu(t,e){return void 0===e?{}:(Os(t,e,["serverTimestamps"]),As(t,0,"serverTimestamps",e.serverTimestamps,["estimate","previous","none"]),e);}function zu(t,e){Es(t,"object",1,e),e&&(Os(t,e,["source"]),As(t,0,"source",e.source,["default","server","cache"]));}function Gu(t,e,n){if(e instanceof Zs){if(e.firestore!==n)throw new j(q$1.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return e;}throw Ps(t,"DocumentReference",1,e);}function Qu(t){switch(t){case 0/* Added */:return "added";case 2/* Modified */:case 3/* Metadata */:return "modified";case 1/* Removed */:return "removed";default:return _();}}/**
   * Converts custom model object of type T into DocumentData by applying the
   * converter if it exists.
   *
   * This function is used when converting user objects to DocumentData
   * because we want to provide the user with a more specific error message if
   * their set() or fails due to invalid data originating from a toFirestore()
   * call.
   */function Hu(t,e,n){// Cast to `any` in order to satisfy the union type constraint on
  // toFirestore().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t?n&&(n.merge||n.mergeFields)?t.toFirestore(e,n):t.toFirestore(e):e;}var Ku={Firestore:Au,GeoPoint:Xs,Timestamp:B,Blob:Cs,Transaction:_u,WriteBatch:Su,DocumentReference:Du,DocumentSnapshot:xu,Query:Cu,QueryDocumentSnapshot:Ou,QuerySnapshot:Fu,CollectionReference:qu,FieldPath:qs,FieldValue:$s,setLogLevel:Au.setLogLevel,CACHE_SIZE_UNLIMITED:Tu};/**
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
   */function Wu(t){!function(t,e){t.INTERNAL.registerComponent(new Component("firestore",function(t){return function(t,e){var n=new ds(),r=new ps(n);return new Au(t,e,r,n);}(t.getProvider("app").getImmediate(),t.getProvider("auth-internal"));},"PUBLIC"/* PUBLIC */).setServiceProps(Object.assign({},Ku)));}(t),t.registerVersion("@firebase/firestore","1.16.4");}Wu(firebase$1);

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
          var doc, snap, querySnap;
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
                      db$1.loadBundle('136{"metadata":{"id":"test-bundle","createTime":{"seconds":1598032960,"nanos":299528000},"version":1,"totalDocuments":1,"totalBytes":1419}}358{"namedQuery":{"name":"limitQuery","bundledQuery":{"parent":"projects/fireeats-97d5e/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"node_4.2.0_uPypnKxZaMqgDXCwhJSe"}],"orderBy":[{"field":{"fieldPath":"sort"},"direction":"DESCENDING"}],"limit":{"value":1}},"limitType":"FIRST"},"readTime":{"seconds":1598032960,"nanos":215513000}}}362{"namedQuery":{"name":"limitToLastQuery","bundledQuery":{"parent":"projects/fireeats-97d5e/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"node_4.2.0_uPypnKxZaMqgDXCwhJSe"}],"orderBy":[{"field":{"fieldPath":"sort"},"direction":"ASCENDING"}],"limit":{"value":1}},"limitType":"LAST"},"readTime":{"seconds":1598032960,"nanos":299528000}}}232{"documentMetadata":{"name":"projects/fireeats-97d5e/databases/(default)/documents/node_4.2.0_uPypnKxZaMqgDXCwhJSe/doc4","readTime":{"seconds":1598032960,"nanos":299528000},"exists":true,"queries":["limitQuery","limitToLastQuery"]}}455{"document":{"name":"projects/fireeats-97d5e/databases/(default)/documents/node_4.2.0_uPypnKxZaMqgDXCwhJSe/doc4","createTime":{"_seconds":1598032960,"_nanoseconds":105293000},"updateTime":{"_seconds":1598032960,"_nanoseconds":105293000},"fields":{"sort":{"integerValue":"4","valueType":"integerValue"},"name":{"stringValue":"4","valueType":"stringValue"},"value":{"timestampValue":{"seconds":"1598032960","nanos":66000000},"valueType":"timestampValue"}}}}').onProgress(function (p) { return console.log(JSON.stringify(p)); });
                      return [4 /*yield*/, db$1.collection('node_4.2.0_uPypnKxZaMqgDXCwhJSe').get({ source: 'cache' })];
                  case 3:
                      querySnap = _a.sent();
                      console.log("" + JSON.stringify(querySnap.docs.map(function (d) { return d.data(); })));
                      return [2 /*return*/];
              }
          });
      });
  }
  main();

}());
//# sourceMappingURL=bundle.js.map
