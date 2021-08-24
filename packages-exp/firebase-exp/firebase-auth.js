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
        (e.firebase.auth = e.firebase.auth || {})),
        e.firebase.app
      );
})(this, function (di, li) {
  'use strict';
  try {
    (function () {
      var r = function (e, t) {
        return (r =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (e, t) {
              e.__proto__ = t;
            }) ||
          function (e, t) {
            for (var n in t) t.hasOwnProperty(n) && (e[n] = t[n]);
          })(e, t);
      };
      function e(e, t) {
        function n() {
          this.constructor = e;
        }
        r(e, t),
          (e.prototype =
            null === t
              ? Object.create(t)
              : ((n.prototype = t.prototype), new n()));
      }
      var p = function () {
        return (p =
          Object.assign ||
          function (e) {
            for (var t, n = 1, r = arguments.length; n < r; n++)
              for (var i in (t = arguments[n]))
                Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
            return e;
          }).apply(this, arguments);
      };
      function u(e, t) {
        var n = {};
        for (i in e)
          Object.prototype.hasOwnProperty.call(e, i) &&
            t.indexOf(i) < 0 &&
            (n[i] = e[i]);
        if (null != e && 'function' == typeof Object.getOwnPropertySymbols)
          for (
            var r = 0, i = Object.getOwnPropertySymbols(e);
            r < i.length;
            r++
          )
            t.indexOf(i[r]) < 0 &&
              Object.prototype.propertyIsEnumerable.call(e, i[r]) &&
              (n[i[r]] = e[i[r]]);
        return n;
      }
      function f(e, s, a, u) {
        return new (a = a || Promise)(function (n, t) {
          function r(e) {
            try {
              o(u.next(e));
            } catch (e) {
              t(e);
            }
          }
          function i(e) {
            try {
              o(u.throw(e));
            } catch (e) {
              t(e);
            }
          }
          function o(e) {
            var t;
            e.done
              ? n(e.value)
              : ((t = e.value) instanceof a
                  ? t
                  : new a(function (e) {
                      e(t);
                    })
                ).then(r, i);
          }
          o((u = u.apply(e, s || [])).next());
        });
      }
      function v(n, r) {
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
              for (; a; )
                try {
                  if (
                    ((i = 1),
                    o &&
                      (s =
                        2 & t[0]
                          ? o.return
                          : t[0]
                          ? o.throw || ((s = o.return) && s.call(o), 0)
                          : o.next) &&
                      !(s = s.call(o, t[1])).done)
                  )
                    return s;
                  switch (((o = 0), s && (t = [2 & t[0], s.value]), t[0])) {
                    case 0:
                    case 1:
                      s = t;
                      break;
                    case 4:
                      return a.label++, { value: t[1], done: !1 };
                    case 5:
                      a.label++, (o = t[1]), (t = [0]);
                      continue;
                    case 7:
                      (t = a.ops.pop()), a.trys.pop();
                      continue;
                    default:
                      if (
                        !(s = 0 < (s = a.trys).length && s[s.length - 1]) &&
                        (6 === t[0] || 2 === t[0])
                      ) {
                        a = 0;
                        continue;
                      }
                      if (3 === t[0] && (!s || (t[1] > s[0] && t[1] < s[3]))) {
                        a.label = t[1];
                        break;
                      }
                      if (6 === t[0] && a.label < s[1]) {
                        (a.label = s[1]), (s = t);
                        break;
                      }
                      if (s && a.label < s[2]) {
                        (a.label = s[2]), a.ops.push(t);
                        break;
                      }
                      s[2] && a.ops.pop(), a.trys.pop();
                      continue;
                  }
                  t = r.call(n, a);
                } catch (e) {
                  (t = [6, e]), (o = 0);
                } finally {
                  i = s = 0;
                }
              if (5 & t[0]) throw t[1];
              return { value: t[0] ? t[1] : void 0, done: !0 };
            })([t, e]);
          };
        }
      }
      function c() {
        for (var e = 0, t = 0, n = arguments.length; t < n; t++)
          e += arguments[t].length;
        for (var r = Array(e), i = 0, t = 0; t < n; t++)
          for (var o = arguments[t], s = 0, a = o.length; s < a; s++, i++)
            r[i] = o[s];
        return r;
      }
      var t = {
          byteToCharMap_: null,
          charToByteMap_: null,
          byteToCharMapWebSafe_: null,
          charToByteMapWebSafe_: null,
          ENCODED_VALS_BASE:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
          get ENCODED_VALS() {
            return this.ENCODED_VALS_BASE + '+/=';
          },
          get ENCODED_VALS_WEBSAFE() {
            return this.ENCODED_VALS_BASE + '-_.';
          },
          HAS_NATIVE_SUPPORT: 'function' == typeof atob,
          encodeByteArray: function (e, t) {
            if (!Array.isArray(e))
              throw Error('encodeByteArray takes an array as a parameter');
            this.init_();
            for (
              var n = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_,
                r = [],
                i = 0;
              i < e.length;
              i += 3
            ) {
              var o = e[i],
                s = i + 1 < e.length,
                a = s ? e[i + 1] : 0,
                u = i + 2 < e.length,
                c = u ? e[i + 2] : 0,
                h = o >> 2,
                o = ((3 & o) << 4) | (a >> 4),
                a = ((15 & a) << 2) | (c >> 6),
                c = 63 & c;
              u || ((c = 64), s || (a = 64)), r.push(n[h], n[o], n[a], n[c]);
            }
            return r.join('');
          },
          encodeString: function (e, t) {
            return this.HAS_NATIVE_SUPPORT && !t
              ? btoa(e)
              : this.encodeByteArray(
                  (function (e) {
                    for (var t = [], n = 0, r = 0; r < e.length; r++) {
                      var i = e.charCodeAt(r);
                      i < 128
                        ? (t[n++] = i)
                        : (i < 2048
                            ? (t[n++] = (i >> 6) | 192)
                            : (55296 == (64512 & i) &&
                              r + 1 < e.length &&
                              56320 == (64512 & e.charCodeAt(r + 1))
                                ? ((i =
                                    65536 +
                                    ((1023 & i) << 10) +
                                    (1023 & e.charCodeAt(++r))),
                                  (t[n++] = (i >> 18) | 240),
                                  (t[n++] = ((i >> 12) & 63) | 128))
                                : (t[n++] = (i >> 12) | 224),
                              (t[n++] = ((i >> 6) & 63) | 128)),
                          (t[n++] = (63 & i) | 128));
                    }
                    return t;
                  })(e),
                  t
                );
          },
          decodeString: function (e, t) {
            return this.HAS_NATIVE_SUPPORT && !t
              ? atob(e)
              : (function (e) {
                  for (var t = [], n = 0, r = 0; n < e.length; ) {
                    var i,
                      o,
                      s,
                      a = e[n++];
                    a < 128
                      ? (t[r++] = String.fromCharCode(a))
                      : 191 < a && a < 224
                      ? ((o = e[n++]),
                        (t[r++] = String.fromCharCode(
                          ((31 & a) << 6) | (63 & o)
                        )))
                      : 239 < a && a < 365
                      ? ((i =
                          (((7 & a) << 18) |
                            ((63 & (o = e[n++])) << 12) |
                            ((63 & (s = e[n++])) << 6) |
                            (63 & e[n++])) -
                          65536),
                        (t[r++] = String.fromCharCode(55296 + (i >> 10))),
                        (t[r++] = String.fromCharCode(56320 + (1023 & i))))
                      : ((o = e[n++]),
                        (s = e[n++]),
                        (t[r++] = String.fromCharCode(
                          ((15 & a) << 12) | ((63 & o) << 6) | (63 & s)
                        )));
                  }
                  return t.join('');
                })(this.decodeStringToByteArray(e, t));
          },
          decodeStringToByteArray: function (e, t) {
            this.init_();
            for (
              var n = t ? this.charToByteMapWebSafe_ : this.charToByteMap_,
                r = [],
                i = 0;
              i < e.length;

            ) {
              var o = n[e.charAt(i++)],
                s = i < e.length ? n[e.charAt(i)] : 0,
                a = ++i < e.length ? n[e.charAt(i)] : 64,
                u = ++i < e.length ? n[e.charAt(i)] : 64;
              if ((++i, null == o || null == s || null == a || null == u))
                throw Error();
              o = (o << 2) | (s >> 4);
              r.push(o),
                64 !== a &&
                  ((s = ((s << 4) & 240) | (a >> 2)),
                  r.push(s),
                  64 !== u && ((u = ((a << 6) & 192) | u), r.push(u)));
            }
            return r;
          },
          init_: function () {
            if (!this.byteToCharMap_) {
              (this.byteToCharMap_ = {}),
                (this.charToByteMap_ = {}),
                (this.byteToCharMapWebSafe_ = {}),
                (this.charToByteMapWebSafe_ = {});
              for (var e = 0; e < this.ENCODED_VALS.length; e++)
                (this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e)),
                  (this.charToByteMap_[this.byteToCharMap_[e]] = e),
                  (this.byteToCharMapWebSafe_[e] =
                    this.ENCODED_VALS_WEBSAFE.charAt(e)),
                  (this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] =
                    e) >= this.ENCODED_VALS_BASE.length &&
                    ((this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] =
                      e),
                    (this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] =
                      e));
            }
          }
        },
        i = function (e) {
          try {
            return t.decodeString(e, !0);
          } catch (e) {
            console.error('base64Decode failed: ', e);
          }
          return null;
        };
      function h() {
        return 'undefined' != typeof navigator &&
          'string' == typeof navigator.userAgent
          ? navigator.userAgent
          : '';
      }
      var o,
        s = 'FirebaseError',
        d = (e(a, (o = Error)), a);
      function a(e, t, n) {
        t = o.call(this, t) || this;
        return (
          (t.code = e),
          (t.customData = n),
          (t.name = s),
          Object.setPrototypeOf(t, a.prototype),
          Error.captureStackTrace &&
            Error.captureStackTrace(t, l.prototype.create),
          t
        );
      }
      var l =
        ((n.prototype.create = function (e) {
          for (var t = [], n = 1; n < arguments.length; n++)
            t[n - 1] = arguments[n];
          var r,
            i = t[0] || {},
            o = this.service + '/' + e,
            e = this.errors[e],
            e = e
              ? ((r = i),
                e.replace(m, function (e, t) {
                  var n = r[t];
                  return null != n ? String(n) : '<' + t + '?>';
                }))
              : 'Error',
            e = this.serviceName + ': ' + e + ' (' + o + ').';
          return new d(o, e, i);
        }),
        n);
      function n(e, t, n) {
        (this.service = e), (this.serviceName = t), (this.errors = n);
      }
      var m = /\{\$([^}]+)}/g;
      function g(e) {
        for (var n = [], t = 0, r = Object.entries(e); t < r.length; t++) {
          var i = r[t];
          !(function (t, e) {
            Array.isArray(e)
              ? e.forEach(function (e) {
                  n.push(encodeURIComponent(t) + '=' + encodeURIComponent(e));
                })
              : n.push(encodeURIComponent(t) + '=' + encodeURIComponent(e));
          })(i[0], i[1]);
        }
        return n.length ? '&' + n.join('&') : '';
      }
      var y,
        I =
          ((b.prototype.next = function (t) {
            this.forEachObserver(function (e) {
              e.next(t);
            });
          }),
          (b.prototype.error = function (t) {
            this.forEachObserver(function (e) {
              e.error(t);
            }),
              this.close(t);
          }),
          (b.prototype.complete = function () {
            this.forEachObserver(function (e) {
              e.complete();
            }),
              this.close();
          }),
          (b.prototype.subscribe = function (e, t, n) {
            var r,
              i = this;
            if (void 0 === e && void 0 === t && void 0 === n)
              throw new Error('Missing Observer.');
            void 0 ===
              (r = (function (e, t) {
                if ('object' != typeof e || null === e) return !1;
                for (var n = 0, r = t; n < r.length; n++) {
                  var i = r[n];
                  if (i in e && 'function' == typeof e[i]) return !0;
                }
                return !1;
              })(e, ['next', 'error', 'complete'])
                ? e
                : { next: e, error: t, complete: n }).next && (r.next = _),
              void 0 === r.error && (r.error = _),
              void 0 === r.complete && (r.complete = _);
            n = this.unsubscribeOne.bind(this, this.observers.length);
            return (
              this.finalized &&
                this.task.then(function () {
                  try {
                    i.finalError ? r.error(i.finalError) : r.complete();
                  } catch (e) {}
                }),
              this.observers.push(r),
              n
            );
          }),
          (b.prototype.unsubscribeOne = function (e) {
            void 0 !== this.observers &&
              void 0 !== this.observers[e] &&
              (delete this.observers[e],
              --this.observerCount,
              0 === this.observerCount &&
                void 0 !== this.onNoObservers &&
                this.onNoObservers(this));
          }),
          (b.prototype.forEachObserver = function (e) {
            if (!this.finalized)
              for (var t = 0; t < this.observers.length; t++)
                this.sendOne(t, e);
          }),
          (b.prototype.sendOne = function (e, t) {
            var n = this;
            this.task.then(function () {
              if (void 0 !== n.observers && void 0 !== n.observers[e])
                try {
                  t(n.observers[e]);
                } catch (e) {
                  'undefined' != typeof console &&
                    console.error &&
                    console.error(e);
                }
            });
          }),
          (b.prototype.close = function (e) {
            var t = this;
            this.finalized ||
              ((this.finalized = !0),
              void 0 !== e && (this.finalError = e),
              this.task.then(function () {
                (t.observers = void 0), (t.onNoObservers = void 0);
              }));
          }),
          b);
      function b(e, t) {
        var n = this;
        (this.observers = []),
          (this.unsubscribes = []),
          (this.observerCount = 0),
          (this.task = Promise.resolve()),
          (this.finalized = !1),
          (this.onNoObservers = t),
          this.task
            .then(function () {
              e(n);
            })
            .catch(function (e) {
              n.error(e);
            });
      }
      function _() {}
      function T() {
        for (var e = 0, t = 0, n = arguments.length; t < n; t++)
          e += arguments[t].length;
        for (var r = Array(e), i = 0, t = 0; t < n; t++)
          for (var o = arguments[t], s = 0, a = o.length; s < a; s++, i++)
            r[i] = o[s];
        return r;
      }
      ((je = y = y || {})[(je.DEBUG = 0)] = 'DEBUG'),
        (je[(je.VERBOSE = 1)] = 'VERBOSE'),
        (je[(je.INFO = 2)] = 'INFO'),
        (je[(je.WARN = 3)] = 'WARN'),
        (je[(je.ERROR = 4)] = 'ERROR'),
        (je[(je.SILENT = 5)] = 'SILENT');
      function w(e, t) {
        for (var n = [], r = 2; r < arguments.length; r++)
          n[r - 2] = arguments[r];
        if (!(t < e.logLevel)) {
          var i = new Date().toISOString(),
            o = R[t];
          if (!o)
            throw new Error(
              'Attempted to log a message with an invalid logType (value: ' +
                t +
                ')'
            );
          console[o].apply(console, T(['[' + i + ']  ' + e.name + ':'], n));
        }
      }
      var k = {
          debug: y.DEBUG,
          verbose: y.VERBOSE,
          info: y.INFO,
          warn: y.WARN,
          error: y.ERROR,
          silent: y.SILENT
        },
        E = y.INFO,
        R =
          (((ze = {})[y.DEBUG] = 'log'),
          (ze[y.VERBOSE] = 'log'),
          (ze[y.INFO] = 'info'),
          (ze[y.WARN] = 'warn'),
          (ze[y.ERROR] = 'error'),
          ze),
        S =
          (Object.defineProperty(A.prototype, 'logLevel', {
            get: function () {
              return this._logLevel;
            },
            set: function (e) {
              if (!(e in y))
                throw new TypeError(
                  'Invalid value "' + e + '" assigned to `logLevel`'
                );
              this._logLevel = e;
            },
            enumerable: !1,
            configurable: !0
          }),
          (A.prototype.setLogLevel = function (e) {
            this._logLevel = 'string' == typeof e ? k[e] : e;
          }),
          Object.defineProperty(A.prototype, 'logHandler', {
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
          Object.defineProperty(A.prototype, 'userLogHandler', {
            get: function () {
              return this._userLogHandler;
            },
            set: function (e) {
              this._userLogHandler = e;
            },
            enumerable: !1,
            configurable: !0
          }),
          (A.prototype.debug = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this._userLogHandler &&
              this._userLogHandler.apply(this, T([this, y.DEBUG], e)),
              this._logHandler.apply(this, T([this, y.DEBUG], e));
          }),
          (A.prototype.log = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this._userLogHandler &&
              this._userLogHandler.apply(this, T([this, y.VERBOSE], e)),
              this._logHandler.apply(this, T([this, y.VERBOSE], e));
          }),
          (A.prototype.info = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this._userLogHandler &&
              this._userLogHandler.apply(this, T([this, y.INFO], e)),
              this._logHandler.apply(this, T([this, y.INFO], e));
          }),
          (A.prototype.warn = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this._userLogHandler &&
              this._userLogHandler.apply(this, T([this, y.WARN], e)),
              this._logHandler.apply(this, T([this, y.WARN], e));
          }),
          (A.prototype.error = function () {
            for (var e = [], t = 0; t < arguments.length; t++)
              e[t] = arguments[t];
            this._userLogHandler &&
              this._userLogHandler.apply(this, T([this, y.ERROR], e)),
              this._logHandler.apply(this, T([this, y.ERROR], e));
          }),
          A);
      function A(e) {
        (this.name = e),
          (this._logLevel = E),
          (this._logHandler = w),
          (this._userLogHandler = null);
      }
      var P =
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
      function N(e, t, n) {
        (this.name = e),
          (this.instanceFactory = t),
          (this.type = n),
          (this.multipleInstances = !1),
          (this.serviceProps = {}),
          (this.instantiationMode = 'LAZY');
      }
      function O() {
        return {};
      }
      function C() {
        var e = {
          'admin-restricted-operation':
            'This operation is restricted to administrators only.',
          'argument-error': '',
          'app-not-authorized':
            "This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.",
          'app-not-installed':
            'The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.',
          'captcha-check-failed':
            'The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.',
          'code-expired':
            'The SMS code has expired. Please re-send the verification code to try again.',
          'cordova-not-ready': 'Cordova framework is not ready.',
          'cors-unsupported': 'This browser is not supported.',
          'credential-already-in-use':
            'This credential is already associated with a different user account.',
          'custom-token-mismatch':
            'The custom token corresponds to a different audience.',
          'requires-recent-login':
            'This operation is sensitive and requires recent authentication. Log in again before retrying this request.',
          'dynamic-link-not-activated':
            'Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.',
          'email-change-needs-verification':
            'Multi-factor users must always have a verified email.',
          'email-already-in-use':
            'The email address is already in use by another account.',
          'emulator-config-failed':
            'Auth instance has already been used to make a network call. Auth can no longer be configured to use the emulator. Try calling "useEmulator()" sooner.',
          'expired-action-code': 'The action code has expired.',
          'cancelled-popup-request':
            'This operation has been cancelled due to another conflicting popup being opened.',
          'internal-error': 'An internal AuthError has occurred.',
          'invalid-app-credential':
            'The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.',
          'invalid-app-id':
            'The mobile app identifier is not registed for the current project.',
          'invalid-user-token':
            "This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.",
          'invalid-auth-event': 'An internal AuthError has occurred.',
          'invalid-verification-code':
            'The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure use the verification code provided by the user.',
          'invalid-continue-uri':
            'The continue URL provided in the request is invalid.',
          'invalid-cordova-configuration':
            'The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.',
          'invalid-custom-token':
            'The custom token format is incorrect. Please check the documentation.',
          'invalid-dynamic-link-domain':
            'The provided dynamic link domain is not configured or authorized for the current project.',
          'invalid-email': 'The email address is badly formatted.',
          'invalid-emulator-scheme':
            'Emulator URL must start with a valid scheme (http:// or https://).',
          'invalid-api-key':
            'Your API key is invalid, please check you have copied it correctly.',
          'invalid-cert-hash':
            'The SHA-1 certificate hash provided is invalid.',
          'invalid-credential':
            'The supplied auth credential is malformed or has expired.',
          'invalid-message-payload':
            'The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.',
          'invalid-multi-factor-session':
            'The request does not contain a valid proof of first factor successful sign-in.',
          'invalid-oauth-provider':
            'EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.',
          'invalid-oauth-client-id':
            'The OAuth client ID provided is either invalid or does not match the specified API key.',
          'unauthorized-domain':
            'This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.',
          'invalid-action-code':
            'The action code is invalid. This can happen if the code is malformed, expired, or has already been used.',
          'wrong-password':
            'The password is invalid or the user does not have a password.',
          'invalid-persistence-type':
            'The specified persistence type is invalid. It can only be local, session or none.',
          'invalid-phone-number':
            'The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].',
          'invalid-provider-id': 'The specified provider ID is invalid.',
          'invalid-recipient-email':
            'The email corresponding to this action failed to send as the provided recipient email address is invalid.',
          'invalid-sender':
            'The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.',
          'invalid-verification-id':
            'The verification ID used to create the phone auth credential is invalid.',
          'invalid-tenant-id': "The Auth instance's tenant ID is invalid.",
          'missing-android-pkg-name':
            'An Android Package Name must be provided if the Android App is required to be installed.',
          'auth-domain-config-required':
            'Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.',
          'missing-app-credential':
            'The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.',
          'missing-verification-code':
            'The phone auth credential was created with an empty SMS verification code.',
          'missing-continue-uri':
            'A continue URL must be provided in the request.',
          'missing-iframe-start': 'An internal AuthError has occurred.',
          'missing-ios-bundle-id':
            'An iOS Bundle ID must be provided if an App Store ID is provided.',
          'missing-or-invalid-nonce':
            'The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.',
          'missing-multi-factor-info':
            'No second factor identifier is provided.',
          'missing-multi-factor-session':
            'The request is missing proof of first factor successful sign-in.',
          'missing-phone-number':
            'To send verification codes, provide a phone number for the recipient.',
          'missing-verification-id':
            'The phone auth credential was created with an empty verification ID.',
          'app-deleted': 'This instance of FirebaseApp has been deleted.',
          'multi-factor-info-not-found':
            'The user does not have a second factor matching the identifier provided.',
          'multi-factor-auth-required':
            'Proof of ownership of a second factor is required to complete sign-in.',
          'account-exists-with-different-credential':
            'An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.',
          'network-request-failed':
            'A network AuthError (such as timeout, interrupted connection or unreachable host) has occurred.',
          'no-auth-event': 'An internal AuthError has occurred.',
          'no-such-provider':
            'User was not linked to an account with the given provider.',
          'null-user':
            'A null user object was provided as the argument for an operation which requires a non-null user object.',
          'operation-not-allowed':
            'The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.',
          'operation-not-supported-in-this-environment':
            'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',
          'popup-blocked':
            'Unable to establish a connection with the popup. It may have been blocked by the browser.',
          'popup-closed-by-user':
            'The popup has been closed by the user before finalizing the operation.',
          'provider-already-linked':
            'User can only be linked to one identity for the given provider.',
          'quota-exceeded':
            "The project's quota for this operation has been exceeded.",
          'redirect-cancelled-by-user':
            'The redirect operation has been cancelled by the user before finalizing.',
          'redirect-operation-pending':
            'A redirect sign-in operation is already pending.',
          'rejected-credential':
            'The request contains malformed or mismatching credentials.',
          'second-factor-already-in-use':
            'The second factor is already enrolled on this account.',
          'maximum-second-factor-count-exceeded':
            'The maximum allowed number of second factors on a user has been exceeded.',
          'tenant-id-mismatch':
            "The provided tenant ID does not match the Auth instance's tenant ID",
          timeout: 'The operation has timed out.',
          'user-token-expired':
            "The user's credential is no longer valid. The user must sign in again.",
          'too-many-requests':
            'We have blocked all requests from this device due to unusual activity. Try again later.',
          'unauthorized-continue-uri':
            'The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.',
          'unsupported-first-factor':
            'Enrolling a second factor or signing in with a multi-factor account requires sign-in with a supported first factor.',
          'unsupported-persistence-type':
            'The current environment does not support the specified persistence type.',
          'unsupported-tenant-operation':
            'This operation is not supported in a multi-tenant context.',
          'unverified-email': 'The operation requires a verified email.',
          'user-cancelled':
            'The user did not grant your application the permissions it requested.',
          'user-not-found':
            'There is no user record corresponding to this identifier. The user may have been deleted.',
          'user-disabled':
            'The user account has been disabled by an administrator.',
          'user-mismatch':
            'The supplied credentials do not correspond to the previously signed in user.',
          'user-signed-out': '',
          'weak-password': 'The password must be 6 characters long or more.',
          'web-storage-unsupported':
            'This browser is not supported or 3rd party cookies and data may be disabled.'
        };
        return e;
      }
      var L = O,
        D = new l('auth', 'Firebase', {}),
        M = new S('@firebase/auth-exp');
      function U(e) {
        for (var t = [], n = 1; n < arguments.length; n++)
          t[n - 1] = arguments[n];
        M.logLevel <= y.ERROR &&
          M.error.apply(M, c(['Auth (' + li.SDK_VERSION + '): ' + e], t));
      }
      function x(e) {
        for (var t = [], n = 1; n < arguments.length; n++)
          t[n - 1] = arguments[n];
        throw V.apply(void 0, c([e], t));
      }
      function F(e) {
        for (var t = [], n = 1; n < arguments.length; n++)
          t[n - 1] = arguments[n];
        return V.apply(void 0, c([e], t));
      }
      function V(e) {
        for (var t = [], n = 1; n < arguments.length; n++)
          t[n - 1] = arguments[n];
        if ('string' == typeof e) return D.create.apply(D, c([e], t));
        var r = t[0],
          i = c(t.slice(1));
        return (
          i[0] && (i[0].appName = e.name),
          (e = e._errorFactory).create.apply(e, c([r], i))
        );
      }
      function W(e, t) {
        for (var n = [], r = 2; r < arguments.length; r++)
          n[r - 2] = arguments[r];
        if (!e) throw V.apply(void 0, c([t], n));
      }
      function j(e) {
        e = 'INTERNAL ASSERTION FAILED: ' + e;
        throw (U(e), new Error(e));
      }
      function H(e, t) {
        e || j(t);
      }
      var q = new Map();
      function z(e) {
        H(e instanceof Function, 'Expected a class definition');
        var t = q.get(e);
        return (
          t
            ? H(
                t instanceof e,
                'Instance stored in cache mismatched with class'
              )
            : ((t = new e()), q.set(e, t)),
          t
        );
      }
      function B(e, t) {
        e = li._getProvider(e, 'auth-exp').getImmediate();
        return (
          (function (e, t) {
            var n = (null == t ? void 0 : t.persistence) || [],
              n = (Array.isArray(n) ? n : [n]).map(z);
            null != t && t.errorMap && e._updateErrorMap(t.errorMap);
            e._initializeWithPersistence(
              n,
              null == t ? void 0 : t.popupRedirectResolver
            );
          })(e, t),
          e
        );
      }
      var G =
        ((K.prototype.toJSON = function () {
          return j('not implemented');
        }),
        (K.prototype._getIdTokenResponse = function (e) {
          return j('not implemented');
        }),
        (K.prototype._linkToIdToken = function (e, t) {
          return j('not implemented');
        }),
        (K.prototype._getReauthenticationResolver = function (e) {
          return j('not implemented');
        }),
        K);
      function K(e, t) {
        (this.providerId = e), (this.signInMethod = t);
      }
      function J() {
        var e;
        return (
          ('undefined' != typeof self &&
            (null === (e = self.location) || void 0 === e ? void 0 : e.href)) ||
          ''
        );
      }
      function Y() {
        return 'http:' === X() || 'https:' === X();
      }
      function X() {
        var e;
        return (
          ('undefined' != typeof self &&
            (null === (e = self.location) || void 0 === e
              ? void 0
              : e.protocol)) ||
          null
        );
      }
      function Z() {
        return (
          !(
            'undefined' != typeof navigator &&
            navigator &&
            'onLine' in navigator &&
            'boolean' == typeof navigator.onLine &&
            (Y() ||
              ('object' ==
                typeof (e =
                  'object' == typeof chrome
                    ? chrome.runtime
                    : 'object' == typeof browser
                    ? browser.runtime
                    : void 0) &&
                void 0 !== e.id) ||
              'connection' in navigator)
          ) || navigator.onLine
        );
        var e;
      }
      var $ =
        ((Q.prototype.get = function () {
          return Z()
            ? this.isMobile
              ? this.longDelay
              : this.shortDelay
            : Math.min(5e3, this.shortDelay);
        }),
        Q);
      function Q(e, t) {
        H(
          (this.shortDelay = e) < (this.longDelay = t),
          'Short delay should be less than long delay!'
        ),
          (this.isMobile =
            ('undefined' != typeof window &&
              !!(window.cordova || window.phonegap || window.PhoneGap) &&
              /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(h())) ||
            ('object' == typeof navigator &&
              'ReactNative' === navigator.product));
      }
      function ee(e, t) {
        H(e.emulator, 'Emulator should always be set here');
        (e = e.emulator.url), (e = new URL(e).toString());
        return t ? '' + e + (t.startsWith('/') ? t.slice(1) : t) : e;
      }
      var te =
        ((ne.initialize = function (e, t, n) {
          (this.fetchImpl = e),
            t && (this.headersImpl = t),
            n && (this.responseImpl = n);
        }),
        (ne.fetch = function () {
          return this.fetchImpl
            ? this.fetchImpl
            : 'undefined' != typeof self && 'fetch' in self
            ? self.fetch
            : void j(
                'Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill'
              );
        }),
        (ne.headers = function () {
          return this.headersImpl
            ? this.headersImpl
            : 'undefined' != typeof self && 'Headers' in self
            ? self.Headers
            : void j(
                'Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill'
              );
        }),
        (ne.response = function () {
          return this.responseImpl
            ? this.responseImpl
            : 'undefined' != typeof self && 'Response' in self
            ? self.Response
            : void j(
                'Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill'
              );
        }),
        ne);
      function ne() {}
      var re =
          (((Tn = {}).CREDENTIAL_MISMATCH = 'custom-token-mismatch'),
          (Tn.MISSING_CUSTOM_TOKEN = 'internal-error'),
          (Tn.INVALID_IDENTIFIER = 'invalid-email'),
          (Tn.MISSING_CONTINUE_URI = 'internal-error'),
          (Tn.INVALID_PASSWORD = 'wrong-password'),
          (Tn.MISSING_PASSWORD = 'internal-error'),
          (Tn.EMAIL_EXISTS = 'email-already-in-use'),
          (Tn.PASSWORD_LOGIN_DISABLED = 'operation-not-allowed'),
          (Tn.INVALID_IDP_RESPONSE = 'invalid-credential'),
          (Tn.INVALID_PENDING_TOKEN = 'invalid-credential'),
          (Tn.FEDERATED_USER_ID_ALREADY_LINKED = 'credential-already-in-use'),
          (Tn.MISSING_REQ_TYPE = 'internal-error'),
          (Tn.EMAIL_NOT_FOUND = 'user-not-found'),
          (Tn.RESET_PASSWORD_EXCEED_LIMIT = 'too-many-requests'),
          (Tn.EXPIRED_OOB_CODE = 'expired-action-code'),
          (Tn.INVALID_OOB_CODE = 'invalid-action-code'),
          (Tn.MISSING_OOB_CODE = 'internal-error'),
          (Tn.CREDENTIAL_TOO_OLD_LOGIN_AGAIN = 'requires-recent-login'),
          (Tn.INVALID_ID_TOKEN = 'invalid-user-token'),
          (Tn.TOKEN_EXPIRED = 'user-token-expired'),
          (Tn.USER_NOT_FOUND = 'user-token-expired'),
          (Tn.TOO_MANY_ATTEMPTS_TRY_LATER = 'too-many-requests'),
          (Tn.INVALID_CODE = 'invalid-verification-code'),
          (Tn.INVALID_SESSION_INFO = 'invalid-verification-id'),
          (Tn.INVALID_TEMPORARY_PROOF = 'invalid-credential'),
          (Tn.MISSING_SESSION_INFO = 'missing-verification-id'),
          (Tn.SESSION_EXPIRED = 'code-expired'),
          (Tn.MISSING_ANDROID_PACKAGE_NAME = 'missing-android-pkg-name'),
          (Tn.UNAUTHORIZED_DOMAIN = 'unauthorized-continue-uri'),
          (Tn.INVALID_OAUTH_CLIENT_ID = 'invalid-oauth-client-id'),
          (Tn.ADMIN_ONLY_OPERATION = 'admin-restricted-operation'),
          (Tn.INVALID_MFA_PENDING_CREDENTIAL = 'invalid-multi-factor-session'),
          (Tn.MFA_ENROLLMENT_NOT_FOUND = 'multi-factor-info-not-found'),
          (Tn.MISSING_MFA_ENROLLMENT_ID = 'missing-multi-factor-info'),
          (Tn.MISSING_MFA_PENDING_CREDENTIAL = 'missing-multi-factor-session'),
          (Tn.SECOND_FACTOR_EXISTS = 'second-factor-already-in-use'),
          (Tn.SECOND_FACTOR_LIMIT_EXCEEDED =
            'maximum-second-factor-count-exceeded'),
          Tn),
        ie = new $(3e4, 6e4);
      function oe(r, i, o, s, t) {
        return (
          void 0 === t && (t = {}),
          f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return [
                2,
                se(r, t, function () {
                  var e = {},
                    t = {};
                  s &&
                    ('GET' === i ? (t = s) : (e = { body: JSON.stringify(s) }));
                  var n = g(p({ key: r.config.apiKey }, t)).slice(1),
                    t = new (te.headers())();
                  return (
                    t.set('Content-Type', 'application/json'),
                    t.set('X-Client-Version', r.config.sdkClientVersion),
                    r.languageCode &&
                      t.set('X-Firebase-Locale', r.languageCode),
                    te.fetch()(
                      ue(r, r.config.apiHost, o, n),
                      p(
                        {
                          method: i,
                          headers: t,
                          referrerPolicy: 'no-referrer'
                        },
                        e
                      )
                    )
                  );
                })
              ];
            });
          })
        );
      }
      function se(o, s, a) {
        return f(this, void 0, void 0, function () {
          var t, n, r, i;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                (o._canInitEmulator = !1), (t = p(p({}, re), s)), (e.label = 1);
              case 1:
                return (
                  e.trys.push([1, 4, , 5]),
                  (r = new ce(o)),
                  [4, Promise.race([a(), r.promise])]
                );
              case 2:
                return (n = e.sent()), r.clearNetworkTimeout(), [4, n.json()];
              case 3:
                if ('needConfirmation' in (r = e.sent()))
                  throw de(o, 'account-exists-with-different-credential', r);
                if (n.ok) return [2, r];
                if (
                  'FEDERATED_USER_ID_ALREADY_LINKED' ===
                  (i = r.error.message.split(' : ')[0])
                )
                  throw de(o, 'credential-already-in-use', r);
                if ('EMAIL_EXISTS' === i)
                  throw de(o, 'email-already-in-use', r);
                return (
                  (i = t[i] || i.toLowerCase().replace(/[_\s]+/g, '-')),
                  x(o, i),
                  [3, 5]
                );
              case 4:
                if ((i = e.sent()) instanceof d) throw i;
                return x(o, 'network-request-failed'), [3, 5];
              case 5:
                return [2];
            }
          });
        });
      }
      function ae(n, r, i, o, s) {
        return (
          void 0 === s && (s = {}),
          f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, oe(n, r, i, o, s)];
                case 1:
                  return (
                    'mfaPendingCredential' in (t = e.sent()) &&
                      x(n, 'multi-factor-auth-required', { serverResponse: t }),
                    [2, t]
                  );
              }
            });
          })
        );
      }
      function ue(e, t, n, r) {
        r = '' + t + n + '?' + r;
        return e.config.emulator
          ? ee(e.config, r)
          : e.config.apiScheme + '://' + r;
      }
      var ce =
        ((he.prototype.clearNetworkTimeout = function () {
          clearTimeout(this.timer);
        }),
        he);
      function he(e) {
        var n = this;
        (this.auth = e),
          (this.timer = null),
          (this.promise = new Promise(function (e, t) {
            n.timer = setTimeout(function () {
              return t(F(n.auth, 'timeout'));
            }, ie.get());
          }));
      }
      function de(e, t, n) {
        var r = { appName: e.name };
        n.email && (r.email = n.email),
          n.phoneNumber && (r.phoneNumber = n.phoneNumber);
        r = F(e, t, r);
        return (r.customData._tokenResponse = n), r;
      }
      function le(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, oe(t, 'POST', '/v1/accounts:resetPassword', n)];
          });
        });
      }
      function fe(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, oe(t, 'POST', '/v1/accounts:update', n)];
          });
        });
      }
      function pe(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, oe(t, 'POST', '/v1/accounts:sendOobCode', n)];
          });
        });
      }
      var ve,
        me =
          (e(ge, (ve = G)),
          (ge._fromEmailAndPassword = function (e, t) {
            return new ge(e, t, 'password');
          }),
          (ge._fromEmailAndCode = function (e, t, n) {
            return void 0 === n && (n = null), new ge(e, t, 'emailLink', n);
          }),
          (ge.prototype.toJSON = function () {
            return {
              email: this.email,
              password: this.password,
              signInMethod: this.signInMethod,
              tenantId: this.tenantId
            };
          }),
          (ge.fromJSON = function (e) {
            e = 'string' == typeof e ? JSON.parse(e) : e;
            if (null != e && e.email && null != e && e.password) {
              if ('password' === e.signInMethod)
                return this._fromEmailAndPassword(e.email, e.password);
              if ('emailLink' === e.signInMethod)
                return this._fromEmailAndCode(e.email, e.password, e.tenantId);
            }
            return null;
          }),
          (ge.prototype._getIdTokenResponse = function (t) {
            return f(this, void 0, void 0, function () {
              return v(this, function (e) {
                switch (this.signInMethod) {
                  case 'password':
                    return [
                      2,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [
                              2,
                              ae(
                                t,
                                'POST',
                                '/v1/accounts:signInWithPassword',
                                n
                              )
                            ];
                          });
                        });
                      })(t, {
                        returnSecureToken: !0,
                        email: this.email,
                        password: this.password
                      })
                    ];
                  case 'emailLink':
                    return [
                      2,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [
                              2,
                              ae(
                                t,
                                'POST',
                                '/v1/accounts:signInWithEmailLink',
                                n
                              )
                            ];
                          });
                        });
                      })(t, { email: this.email, oobCode: this.password })
                    ];
                  default:
                    x(t, 'internal-error');
                }
                return [2];
              });
            });
          }),
          (ge.prototype._linkToIdToken = function (t, n) {
            return f(this, void 0, void 0, function () {
              return v(this, function (e) {
                switch (this.signInMethod) {
                  case 'password':
                    return [
                      2,
                      fe(t, {
                        idToken: n,
                        returnSecureToken: !0,
                        email: this.email,
                        password: this.password
                      })
                    ];
                  case 'emailLink':
                    return [
                      2,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [
                              2,
                              ae(
                                t,
                                'POST',
                                '/v1/accounts:signInWithEmailLink',
                                n
                              )
                            ];
                          });
                        });
                      })(t, {
                        idToken: n,
                        email: this.email,
                        oobCode: this.password
                      })
                    ];
                  default:
                    x(t, 'internal-error');
                }
                return [2];
              });
            });
          }),
          (ge.prototype._getReauthenticationResolver = function (e) {
            return this._getIdTokenResponse(e);
          }),
          ge);
      function ge(e, t, n, r) {
        void 0 === r && (r = null);
        n = ve.call(this, 'password', n) || this;
        return (n.email = e), (n.password = t), (n.tenantId = r), n;
      }
      function ye(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, ae(t, 'POST', '/v1/accounts:signInWithIdp', n)];
          });
        });
      }
      var Ie,
        be =
          (e(_e, (Ie = G)),
          (_e._fromParams = function (e) {
            var t = new _e(e.providerId, e.signInMethod);
            return (
              e.idToken || e.accessToken
                ? (e.idToken && (t.idToken = e.idToken),
                  e.accessToken && (t.accessToken = e.accessToken),
                  e.nonce && !e.pendingToken && (t.nonce = e.nonce),
                  e.pendingToken && (t.pendingToken = e.pendingToken))
                : e.oauthToken && e.oauthTokenSecret
                ? ((t.accessToken = e.oauthToken),
                  (t.secret = e.oauthTokenSecret))
                : x('argument-error'),
              t
            );
          }),
          (_e.prototype.toJSON = function () {
            return {
              idToken: this.idToken,
              accessToken: this.accessToken,
              secret: this.secret,
              nonce: this.nonce,
              pendingToken: this.pendingToken,
              providerId: this.providerId,
              signInMethod: this.signInMethod
            };
          }),
          (_e.fromJSON = function (e) {
            var t = 'string' == typeof e ? JSON.parse(e) : e,
              n = t.providerId,
              e = t.signInMethod,
              t = u(t, ['providerId', 'signInMethod']);
            if (!n || !e) return null;
            e = new _e(n, e);
            return Object.assign(e, t), e;
          }),
          (_e.prototype._getIdTokenResponse = function (e) {
            return ye(e, this.buildRequest());
          }),
          (_e.prototype._linkToIdToken = function (e, t) {
            var n = this.buildRequest();
            return (n.idToken = t), ye(e, n);
          }),
          (_e.prototype._getReauthenticationResolver = function (e) {
            var t = this.buildRequest();
            return (t.autoCreate = !1), ye(e, t);
          }),
          (_e.prototype.buildRequest = function () {
            var e,
              t = {
                requestUri: 'http://localhost',
                returnSecureToken: !0,
                postBody: null
              };
            return (
              this.pendingToken
                ? (t.pendingToken = this.pendingToken)
                : ((e = {}),
                  this.idToken && (e.id_token = this.idToken),
                  this.accessToken && (e.access_token = this.accessToken),
                  this.secret && (e.oauth_token_secret = this.secret),
                  (e.providerId = this.providerId),
                  this.nonce && !this.pendingToken && (e.nonce = this.nonce),
                  (t.postBody = g(e))),
              t
            );
          }),
          _e);
      function _e() {
        var e = (null !== Ie && Ie.apply(this, arguments)) || this;
        return (e.pendingToken = null), e;
      }
      var Te = (((wr = {}).USER_NOT_FOUND = 'user-not-found'), wr);
      var we,
        ke =
          (e(Ee, (we = G)),
          (Ee._fromVerification = function (e, t) {
            return new Ee({ verificationId: e, verificationCode: t });
          }),
          (Ee._fromTokenResponse = function (e, t) {
            return new Ee({ phoneNumber: e, temporaryProof: t });
          }),
          (Ee.prototype._getIdTokenResponse = function (e) {
            return (function (t, n) {
              return f(this, void 0, void 0, function () {
                return v(this, function (e) {
                  return [
                    2,
                    ae(t, 'POST', '/v1/accounts:signInWithPhoneNumber', n)
                  ];
                });
              });
            })(e, this._makeVerificationRequest());
          }),
          (Ee.prototype._linkToIdToken = function (e, t) {
            return (function (t, n) {
              return f(this, void 0, void 0, function () {
                return v(this, function (e) {
                  return [
                    2,
                    ae(t, 'POST', '/v1/accounts:signInWithPhoneNumber', n)
                  ];
                });
              });
            })(e, p({ idToken: t }, this._makeVerificationRequest()));
          }),
          (Ee.prototype._getReauthenticationResolver = function (e) {
            return (function (n, r) {
              return f(this, void 0, void 0, function () {
                var t;
                return v(this, function (e) {
                  return (
                    (t = p(p({}, r), { operation: 'REAUTH' })),
                    [
                      2,
                      ae(n, 'POST', '/v1/accounts:signInWithPhoneNumber', t, Te)
                    ]
                  );
                });
              });
            })(e, this._makeVerificationRequest());
          }),
          (Ee.prototype._makeVerificationRequest = function () {
            var e = this.params,
              t = e.temporaryProof,
              n = e.phoneNumber,
              r = e.verificationId,
              e = e.verificationCode;
            return t && n
              ? { temporaryProof: t, phoneNumber: n }
              : { sessionInfo: r, code: e };
          }),
          (Ee.prototype.toJSON = function () {
            var e = { providerId: this.providerId };
            return (
              this.params.phoneNumber &&
                (e.phoneNumber = this.params.phoneNumber),
              this.params.temporaryProof &&
                (e.temporaryProof = this.params.temporaryProof),
              this.params.verificationCode &&
                (e.verificationCode = this.params.verificationCode),
              this.params.verificationId &&
                (e.verificationId = this.params.verificationId),
              e
            );
          }),
          (Ee.fromJSON = function (e) {
            'string' == typeof e && (e = JSON.parse(e));
            var t = e.verificationId,
              n = e.verificationCode,
              r = e.phoneNumber,
              e = e.temporaryProof;
            return n || t || r || e
              ? new Ee({
                  verificationId: t,
                  verificationCode: n,
                  phoneNumber: r,
                  temporaryProof: e
                })
              : null;
          }),
          Ee);
      function Ee(e) {
        var t = we.call(this, 'phone', 'phone') || this;
        return (t.params = e), t;
      }
      function Re() {
        (this.type = 'NONE'), (this.storage = {});
      }
      var Se =
        ((Re.prototype._isAvailable = function () {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return [2, !0];
            });
          });
        }),
        (Re.prototype._set = function (t, n) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return (this.storage[t] = n), [2];
            });
          });
        }),
        (Re.prototype._get = function (n) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              return [2, void 0 === (t = this.storage[n]) ? null : t];
            });
          });
        }),
        (Re.prototype._remove = function (t) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return delete this.storage[t], [2];
            });
          });
        }),
        (Re.prototype._addListener = function (e, t) {}),
        (Re.prototype._removeListener = function (e, t) {}),
        (Re.type = 'NONE'),
        Re);
      var Ae =
        ((Pe.parseLink = function (e) {
          var t,
            n,
            r,
            i =
              ((t = e),
              (n = new URL(t)),
              (r = n.searchParams.get('link')),
              (e = r ? new URL(r).searchParams.get('link') : null),
              ((n = n.searchParams.get('deep_link_id'))
                ? new URL(n).searchParams.get('link')
                : null) ||
                n ||
                e ||
                r ||
                t);
          try {
            return new Pe(i);
          } catch (e) {
            return null;
          }
        }),
        Pe);
      function Pe(e) {
        var t = new URL(e),
          n = t.searchParams.get('apiKey'),
          r = t.searchParams.get('oobCode'),
          e = (function (e) {
            switch (e) {
              case 'recoverEmail':
                return 'RECOVER_EMAIL';
              case 'resetPassword':
                return 'PASSWORD_RESET';
              case 'signIn':
                return 'EMAIL_SIGNIN';
              case 'verifyEmail':
                return 'VERIFY_EMAIL';
              case 'verifyAndChangeEmail':
                return 'VERIFY_AND_CHANGE_EMAIL';
              case 'revertSecondFactorAddition':
                return 'REVERT_SECOND_FACTOR_ADDITION';
              default:
                return null;
            }
          })(t.searchParams.get('mode'));
        W(n && r && e, 'argument-error'),
          (this.apiKey = n),
          (this.operation = e),
          (this.code = r),
          (this.continueUrl = t.searchParams.get('continueUrl')),
          (this.languageCode = t.searchParams.get('languageCode')),
          (this.tenantId = t.searchParams.get('tenantId'));
      }
      var Ne =
        ((Oe.credential = function (e, t) {
          return me._fromEmailAndPassword(e, t);
        }),
        (Oe.credentialWithLink = function (e, t) {
          t = Ae.parseLink(t);
          return (
            W(t, 'argument-error'), me._fromEmailAndCode(e, t.code, t.tenantId)
          );
        }),
        (Oe.PROVIDER_ID = 'password'),
        (Oe.EMAIL_PASSWORD_SIGN_IN_METHOD = 'password'),
        (Oe.EMAIL_LINK_SIGN_IN_METHOD = 'emailLink'),
        Oe);
      function Oe() {
        this.providerId = Oe.PROVIDER_ID;
      }
      var Ce =
        ((Le.credentialFromJSON = function (e) {
          e = 'string' == typeof e ? JSON.parse(e) : e;
          return (
            W('providerId' in e && 'signInMethod' in e, 'argument-error'),
            be._fromParams(e)
          );
        }),
        (Le.prototype.credential = function (e) {
          return (
            W(e.idToken && e.accessToken, 'argument-error'),
            be._fromParams(
              p(
                { providerId: this.providerId, signInMethod: this.providerId },
                e
              )
            )
          );
        }),
        (Le.prototype.setDefaultLanguage = function (e) {
          this.defaultLanguageCode = e;
        }),
        (Le.prototype.setCustomParameters = function (e) {
          return (this.customParameters = e), this;
        }),
        (Le.prototype.getCustomParameters = function () {
          return this.customParameters;
        }),
        (Le.prototype.addScope = function (e) {
          return this.scopes.includes(e) || this.scopes.push(e), this;
        }),
        (Le.prototype.getScopes = function () {
          return c(this.scopes);
        }),
        (Le.credentialFromResult = function (e) {
          return Le.oauthCredentialFromTaggedObject(e);
        }),
        (Le.credentialFromError = function (e) {
          return Le.oauthCredentialFromTaggedObject(e.customData || {});
        }),
        (Le.oauthCredentialFromTaggedObject = function (e) {
          var t = e._tokenResponse;
          if (!t) return null;
          var n = t.oauthIdToken,
            r = t.oauthAccessToken,
            i = t.oauthTokenSecret,
            e = t.pendingToken,
            o = t.nonce,
            s = t.providerId;
          if (!(r || i || n || e)) return null;
          if (!s) return null;
          try {
            return new Le(s).credential({
              idToken: n,
              accessToken: r,
              rawNonce: o
            });
          } catch (e) {
            return null;
          }
        }),
        Le);
      function Le(e) {
        (this.providerId = e),
          (this.defaultLanguageCode = null),
          (this.scopes = []),
          (this.customParameters = {});
      }
      var De,
        Me =
          (e(Ue, (De = Ce)),
          (Ue.credential = function (e) {
            return be._fromParams({
              providerId: Ue.PROVIDER_ID,
              signInMethod: Ue.FACEBOOK_SIGN_IN_METHOD,
              accessToken: e
            });
          }),
          (Ue.credentialFromResult = function (e) {
            return Ue.credentialFromTaggedObject(e);
          }),
          (Ue.credentialFromError = function (e) {
            return Ue.credentialFromTaggedObject(e.customData || {});
          }),
          (Ue.credentialFromTaggedObject = function (e) {
            var t = e._tokenResponse;
            if (!(t && 'oauthAccessToken' in t)) return null;
            if (!t.oauthAccessToken) return null;
            try {
              return Ue.credential(t.oauthAccessToken);
            } catch (e) {
              return null;
            }
          }),
          (Ue.FACEBOOK_SIGN_IN_METHOD = 'facebook.com'),
          (Ue.PROVIDER_ID = 'facebook.com'),
          Ue);
      function Ue() {
        return De.call(this, 'facebook.com') || this;
      }
      var xe,
        Fe =
          (e(Ve, (xe = Ce)),
          (Ve.credential = function (e, t) {
            return be._fromParams({
              providerId: Ve.PROVIDER_ID,
              signInMethod: Ve.GOOGLE_SIGN_IN_METHOD,
              idToken: e,
              accessToken: t
            });
          }),
          (Ve.credentialFromResult = function (e) {
            return Ve.credentialFromTaggedObject(e);
          }),
          (Ve.credentialFromError = function (e) {
            return Ve.credentialFromTaggedObject(e.customData || {});
          }),
          (Ve.credentialFromTaggedObject = function (e) {
            e = e._tokenResponse;
            if (!e) return null;
            var t = e.oauthIdToken,
              n = e.oauthAccessToken;
            if (!t && !n) return null;
            try {
              return Ve.credential(t, n);
            } catch (e) {
              return null;
            }
          }),
          (Ve.GOOGLE_SIGN_IN_METHOD = 'google.com'),
          (Ve.PROVIDER_ID = 'google.com'),
          Ve);
      function Ve() {
        var e = xe.call(this, 'google.com') || this;
        return e.addScope('profile'), e;
      }
      var We,
        je =
          (e(He, (We = Ce)),
          (He.credential = function (e) {
            return be._fromParams({
              providerId: He.PROVIDER_ID,
              signInMethod: He.GITHUB_SIGN_IN_METHOD,
              accessToken: e
            });
          }),
          (He.credentialFromResult = function (e) {
            return He.credentialFromTaggedObject(e);
          }),
          (He.credentialFromError = function (e) {
            return He.credentialFromTaggedObject(e.customData || {});
          }),
          (He.credentialFromTaggedObject = function (e) {
            var t = e._tokenResponse;
            if (!(t && 'oauthAccessToken' in t)) return null;
            if (!t.oauthAccessToken) return null;
            try {
              return He.credential(t.oauthAccessToken);
            } catch (e) {
              return null;
            }
          }),
          (He.GITHUB_SIGN_IN_METHOD = 'github.com'),
          (He.PROVIDER_ID = 'github.com'),
          He);
      function He() {
        return We.call(this, 'github.com') || this;
      }
      var qe,
        ze =
          (e(Be, (qe = Ce)),
          (Be.credential = function (e, t) {
            return be._fromParams({
              providerId: Be.PROVIDER_ID,
              signInMethod: Be.TWITTER_SIGN_IN_METHOD,
              oauthToken: e,
              oauthTokenSecret: t
            });
          }),
          (Be.credentialFromResult = function (e) {
            return Be.credentialFromTaggedObject(e);
          }),
          (Be.credentialFromError = function (e) {
            return Be.credentialFromTaggedObject(e.customData || {});
          }),
          (Be.credentialFromTaggedObject = function (e) {
            e = e._tokenResponse;
            if (!e) return null;
            var t = e.oauthAccessToken,
              n = e.oauthTokenSecret;
            if (!t || !n) return null;
            try {
              return Be.credential(t, n);
            } catch (e) {
              return null;
            }
          }),
          (Be.TWITTER_SIGN_IN_METHOD = 'twitter.com'),
          (Be.PROVIDER_ID = 'twitter.com'),
          Be);
      function Be() {
        return qe.call(this, 'twitter.com') || this;
      }
      function Ge(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, ae(t, 'POST', '/v1/accounts:signUp', n)];
          });
        });
      }
      function Ke(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, oe(t, 'POST', '/v1/accounts:update', n)];
          });
        });
      }
      function Je(e) {
        if (e)
          try {
            var t = new Date(Number(e));
            if (!isNaN(t.getTime())) return t.toUTCString();
          } catch (e) {}
      }
      function Ye(o, s) {
        return (
          void 0 === s && (s = !1),
          f(this, void 0, void 0, function () {
            var t, n, r, i;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, (i = o).getIdToken(s)];
                case 1:
                  return (
                    (t = e.sent()),
                    W(
                      (n = Ze(t)) && n.exp && n.auth_time && n.iat,
                      i.auth,
                      'internal-error'
                    ),
                    (r = 'object' == typeof n.firebase ? n.firebase : void 0),
                    (i = null == r ? void 0 : r.sign_in_provider),
                    [
                      2,
                      {
                        claims: n,
                        token: t,
                        authTime: Je(Xe(n.auth_time)),
                        issuedAtTime: Je(Xe(n.iat)),
                        expirationTime: Je(Xe(n.exp)),
                        signInProvider: i || null,
                        signInSecondFactor:
                          (null == r ? void 0 : r.sign_in_second_factor) || null
                      }
                    ]
                  );
              }
            });
          })
        );
      }
      function Xe(e) {
        return 1e3 * Number(e);
      }
      function Ze(e) {
        var t = e.split('.'),
          e = t[0],
          n = t[1],
          t = t[2];
        if (void 0 === e || void 0 === n || void 0 === t)
          return U('JWT malformed, contained fewer than 3 sections'), null;
        try {
          var r = i(n);
          return r
            ? JSON.parse(r)
            : (U('Failed to decode base64 JWT payload'), null);
        } catch (e) {
          return U('Caught error parsing JWT payload as JSON', e), null;
        }
      }
      function $e(n, r, i) {
        return (
          void 0 === i && (i = !1),
          f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  if (i) return [2, r];
                  e.label = 1;
                case 1:
                  return e.trys.push([1, 3, , 6]), [4, r];
                case 2:
                  return [2, e.sent()];
                case 3:
                  return !(
                    (t = e.sent()) instanceof d &&
                    (function (e) {
                      e = e.code;
                      return (
                        'auth/user-disabled' === e ||
                        'auth/user-token-expired' === e
                      );
                    })(t)
                  ) || n.auth.currentUser !== n
                    ? [3, 5]
                    : [4, n.auth.signOut()];
                case 4:
                  e.sent(), (e.label = 5);
                case 5:
                  throw t;
                case 6:
                  return [2];
              }
            });
          })
        );
      }
      var Qe =
        ((et.prototype._start = function () {
          this.isRunning || ((this.isRunning = !0), this.schedule());
        }),
        (et.prototype._stop = function () {
          this.isRunning &&
            ((this.isRunning = !1),
            null !== this.timerId && clearTimeout(this.timerId));
        }),
        (et.prototype.getInterval = function (e) {
          if (e) {
            var t = this.errorBackoff;
            return (
              (this.errorBackoff = Math.min(2 * this.errorBackoff, 96e4)), t
            );
          }
          this.errorBackoff = 3e4;
          t =
            (null !== (e = this.user.stsTokenManager.expirationTime) &&
            void 0 !== e
              ? e
              : 0) -
            Date.now() -
            3e5;
          return Math.max(0, t);
        }),
        (et.prototype.schedule = function (e) {
          var t = this;
          void 0 === e && (e = !1),
            this.isRunning &&
              ((e = this.getInterval(e)),
              (this.timerId = setTimeout(function () {
                return f(t, void 0, void 0, function () {
                  return v(this, function (e) {
                    switch (e.label) {
                      case 0:
                        return [4, this.iteration()];
                      case 1:
                        return e.sent(), [2];
                    }
                  });
                });
              }, e)));
        }),
        (et.prototype.iteration = function () {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    e.trys.push([0, 2, , 3]), [4, this.user.getIdToken(!0)]
                  );
                case 1:
                  return e.sent(), [3, 3];
                case 2:
                  return (
                    'auth/network-request-failed' === e.sent().code &&
                      this.schedule(!0),
                    [2]
                  );
                case 3:
                  return this.schedule(), [2];
              }
            });
          });
        }),
        et);
      function et(e) {
        (this.user = e),
          (this.isRunning = !1),
          (this.timerId = null),
          (this.errorBackoff = 3e4);
      }
      var tt =
        ((nt.prototype._initializeTime = function () {
          (this.lastSignInTime = Je(this.lastLoginAt)),
            (this.creationTime = Je(this.createdAt));
        }),
        (nt.prototype._copy = function (e) {
          (this.createdAt = e.createdAt),
            (this.lastLoginAt = e.lastLoginAt),
            this._initializeTime();
        }),
        (nt.prototype.toJSON = function () {
          return { createdAt: this.createdAt, lastLoginAt: this.lastLoginAt };
        }),
        nt);
      function nt(e, t) {
        (this.createdAt = e), (this.lastLoginAt = t), this._initializeTime();
      }
      function rt(s) {
        var a;
        return f(this, void 0, void 0, function () {
          var t, r, i, o;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return (r = s.auth), [4, s.getIdToken()];
              case 1:
                return (
                  (o = e.sent()),
                  [
                    4,
                    $e(
                      s,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [2, oe(t, 'POST', '/v1/accounts:lookup', n)];
                          });
                        });
                      })(r, { idToken: o })
                    )
                  ]
                );
              case 2:
                return (
                  W(
                    null == (i = e.sent()) ? void 0 : i.users.length,
                    r,
                    'internal-error'
                  ),
                  (t = i.users[0]),
                  s._notifyReloadListener(t),
                  (o =
                    null !== (a = t.providerUserInfo) &&
                    void 0 !== a &&
                    a.length
                      ? t.providerUserInfo.map(function (e) {
                          var t = e.providerId,
                            e = u(e, ['providerId']);
                          return {
                            providerId: t,
                            uid: e.rawId || '',
                            displayName: e.displayName || null,
                            email: e.email || null,
                            phoneNumber: e.phoneNumber || null,
                            photoURL: e.photoUrl || null
                          };
                        })
                      : []),
                  (e = s.providerData),
                  (n = o),
                  (r = c(
                    e.filter(function (t) {
                      return !n.some(function (e) {
                        return e.providerId === t.providerId;
                      });
                    }),
                    n
                  )),
                  (i = s.isAnonymous),
                  (o = !(
                    (s.email && t.passwordHash) ||
                    (null != r && r.length)
                  )),
                  (o = !!i && o),
                  (o = {
                    uid: t.localId,
                    displayName: t.displayName || null,
                    photoURL: t.photoUrl || null,
                    email: t.email || null,
                    emailVerified: t.emailVerified || !1,
                    phoneNumber: t.phoneNumber || null,
                    tenantId: t.tenantId || null,
                    providerData: r,
                    metadata: new tt(t.createdAt, t.lastLoginAt),
                    isAnonymous: o
                  }),
                  Object.assign(s, o),
                  [2]
                );
            }
            var n;
          });
        });
      }
      function it(n) {
        return f(this, void 0, void 0, function () {
          var t;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, rt((t = n))];
              case 1:
                return e.sent(), [4, t.auth._persistUserIfCurrent(t)];
              case 2:
                return e.sent(), t.auth._notifyListenersIfCurrent(t), [2];
            }
          });
        });
      }
      var ot =
        (Object.defineProperty(st.prototype, 'isExpired', {
          get: function () {
            return (
              !this.expirationTime || Date.now() > this.expirationTime - 3e4
            );
          },
          enumerable: !1,
          configurable: !0
        }),
        (st.prototype.updateFromServerResponse = function (e) {
          W(e.idToken, 'internal-error'),
            W(void 0 !== e.idToken, 'internal-error'),
            W(void 0 !== e.refreshToken, 'internal-error');
          var t,
            t =
              'expiresIn' in e && void 0 !== e.expiresIn
                ? Number(e.expiresIn)
                : (W((t = Ze((t = e.idToken))), 'internal-error'),
                  W(void 0 !== t.exp, 'internal-error'),
                  W(void 0 !== t.iat, 'internal-error'),
                  Number(t.exp) - Number(t.iat));
          this.updateTokensAndExpiration(e.idToken, e.refreshToken, t);
        }),
        (st.prototype.getToken = function (t, n) {
          return (
            void 0 === n && (n = !1),
            f(this, void 0, void 0, function () {
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      W(
                        !this.accessToken || this.refreshToken,
                        t,
                        'user-token-expired'
                      ),
                      n || !this.accessToken || this.isExpired
                        ? this.refreshToken
                          ? [4, this.refresh(t, this.refreshToken)]
                          : [3, 2]
                        : [2, this.accessToken]
                    );
                  case 1:
                    return e.sent(), [2, this.accessToken];
                  case 2:
                    return [2, null];
                }
              });
            })
          );
        }),
        (st.prototype.clearRefreshToken = function () {
          this.refreshToken = null;
        }),
        (st.prototype.refresh = function (i, o) {
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [
                    4,
                    (function (i, o) {
                      return f(this, void 0, void 0, function () {
                        var t;
                        return v(this, function (e) {
                          switch (e.label) {
                            case 0:
                              return [
                                4,
                                se(i, {}, function () {
                                  var e = g({
                                      grant_type: 'refresh_token',
                                      refresh_token: o
                                    }).slice(1),
                                    t = i.config,
                                    n = t.tokenApiHost,
                                    r = t.apiKey,
                                    t = t.sdkClientVersion,
                                    r = ue(i, n, '/v1/token', 'key=' + r);
                                  return te.fetch()(r, {
                                    method: 'POST',
                                    headers: {
                                      'X-Client-Version': t,
                                      'Content-Type':
                                        'application/x-www-form-urlencoded'
                                    },
                                    body: e
                                  });
                                })
                              ];
                            case 1:
                              return [
                                2,
                                {
                                  accessToken: (t = e.sent()).access_token,
                                  expiresIn: t.expires_in,
                                  refreshToken: t.refresh_token
                                }
                              ];
                          }
                        });
                      });
                    })(i, o)
                  ];
                case 1:
                  return (
                    (r = e.sent()),
                    (t = r.accessToken),
                    (n = r.refreshToken),
                    (r = r.expiresIn),
                    this.updateTokensAndExpiration(t, n, Number(r)),
                    [2]
                  );
              }
            });
          });
        }),
        (st.prototype.updateTokensAndExpiration = function (e, t, n) {
          (this.refreshToken = t || null),
            (this.accessToken = e || null),
            (this.expirationTime = Date.now() + 1e3 * n);
        }),
        (st.fromJSON = function (e, t) {
          var n = t.refreshToken,
            r = t.accessToken,
            i = t.expirationTime,
            t = new st();
          return (
            n &&
              (W('string' == typeof n, 'internal-error', { appName: e }),
              (t.refreshToken = n)),
            r &&
              (W('string' == typeof r, 'internal-error', { appName: e }),
              (t.accessToken = r)),
            i &&
              (W('number' == typeof i, 'internal-error', { appName: e }),
              (t.expirationTime = i)),
            t
          );
        }),
        (st.prototype.toJSON = function () {
          return {
            refreshToken: this.refreshToken,
            accessToken: this.accessToken,
            expirationTime: this.expirationTime
          };
        }),
        (st.prototype._assign = function (e) {
          (this.accessToken = e.accessToken),
            (this.refreshToken = e.refreshToken),
            (this.expirationTime = e.expirationTime);
        }),
        (st.prototype._clone = function () {
          return Object.assign(new st(), this.toJSON());
        }),
        (st.prototype._performRefresh = function () {
          return j('not implemented');
        }),
        st);
      function st() {
        (this.refreshToken = null),
          (this.accessToken = null),
          (this.expirationTime = null);
      }
      function at(e, t) {
        W('string' == typeof e || void 0 === e, 'internal-error', {
          appName: t
        });
      }
      var ut =
        ((ct.prototype.getIdToken = function (n) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [
                    4,
                    $e(this, this.stsTokenManager.getToken(this.auth, n))
                  ];
                case 1:
                  return (W((t = e.sent()), this.auth, 'internal-error'),
                  this.accessToken === t)
                    ? [3, 3]
                    : ((this.accessToken = t),
                      [4, this.auth._persistUserIfCurrent(this)]);
                case 2:
                  e.sent(),
                    this.auth._notifyListenersIfCurrent(this),
                    (e.label = 3);
                case 3:
                  return [2, t];
              }
            });
          });
        }),
        (ct.prototype.getIdTokenResult = function (e) {
          return Ye(this, e);
        }),
        (ct.prototype.reload = function () {
          return it(this);
        }),
        (ct.prototype._assign = function (e) {
          this !== e &&
            (W(this.uid === e.uid, this.auth, 'internal-error'),
            (this.displayName = e.displayName),
            (this.photoURL = e.photoURL),
            (this.email = e.email),
            (this.emailVerified = e.emailVerified),
            (this.phoneNumber = e.phoneNumber),
            (this.isAnonymous = e.isAnonymous),
            (this.tenantId = e.tenantId),
            (this.providerData = e.providerData.map(function (e) {
              return p({}, e);
            })),
            this.metadata._copy(e.metadata),
            this.stsTokenManager._assign(e.stsTokenManager));
        }),
        (ct.prototype._clone = function () {
          return new ct(
            p(p({}, this), { stsTokenManager: this.stsTokenManager._clone() })
          );
        }),
        (ct.prototype._onReload = function (e) {
          W(!this.reloadListener, this.auth, 'internal-error'),
            (this.reloadListener = e),
            this.reloadUserInfo &&
              (this._notifyReloadListener(this.reloadUserInfo),
              (this.reloadUserInfo = null));
        }),
        (ct.prototype._notifyReloadListener = function (e) {
          this.reloadListener
            ? this.reloadListener(e)
            : (this.reloadUserInfo = e);
        }),
        (ct.prototype._startProactiveRefresh = function () {
          this.proactiveRefresh._start();
        }),
        (ct.prototype._stopProactiveRefresh = function () {
          this.proactiveRefresh._stop();
        }),
        (ct.prototype._updateTokensIfNecessary = function (n, r) {
          return (
            void 0 === r && (r = !1),
            f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      (t = !1),
                      n.idToken &&
                        n.idToken !== this.stsTokenManager.accessToken &&
                        (this.stsTokenManager.updateFromServerResponse(n),
                        (t = !0)),
                      r ? [4, rt(this)] : [3, 2]
                    );
                  case 1:
                    e.sent(), (e.label = 2);
                  case 2:
                    return [4, this.auth._persistUserIfCurrent(this)];
                  case 3:
                    return (
                      e.sent(),
                      t && this.auth._notifyListenersIfCurrent(this),
                      [2]
                    );
                }
              });
            })
          );
        }),
        (ct.prototype.delete = function () {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, this.getIdToken()];
                case 1:
                  return (
                    (t = e.sent()),
                    [
                      4,
                      $e(
                        this,
                        (function (t, n) {
                          return f(this, void 0, void 0, function () {
                            return v(this, function (e) {
                              return [
                                2,
                                oe(t, 'POST', '/v1/accounts:delete', n)
                              ];
                            });
                          });
                        })(this.auth, { idToken: t })
                      )
                    ]
                  );
                case 2:
                  return (
                    e.sent(),
                    this.stsTokenManager.clearRefreshToken(),
                    [2, this.auth.signOut()]
                  );
              }
            });
          });
        }),
        (ct.prototype.toJSON = function () {
          return p(
            {
              uid: this.uid,
              email: this.email || void 0,
              emailVerified: this.emailVerified,
              displayName: this.displayName || void 0,
              isAnonymous: this.isAnonymous,
              photoURL: this.photoURL || void 0,
              phoneNumber: this.phoneNumber || void 0,
              tenantId: this.tenantId || void 0,
              providerData: this.providerData.map(function (e) {
                return p({}, e);
              }),
              stsTokenManager: this.stsTokenManager.toJSON(),
              _redirectEventId: this._redirectEventId
            },
            this.metadata.toJSON()
          );
        }),
        Object.defineProperty(ct.prototype, 'refreshToken', {
          get: function () {
            return this.stsTokenManager.refreshToken || '';
          },
          enumerable: !1,
          configurable: !0
        }),
        (ct._fromJSON = function (e, t) {
          var n = null !== (l = t.displayName) && void 0 !== l ? l : void 0,
            r = null !== (u = t.email) && void 0 !== u ? u : void 0,
            i = null !== (f = t.phoneNumber) && void 0 !== f ? f : void 0,
            o = null !== (c = t.photoURL) && void 0 !== c ? c : void 0,
            s = null !== (h = t.tenantId) && void 0 !== h ? h : void 0,
            a = null !== (d = t._redirectEventId) && void 0 !== d ? d : void 0,
            u = null !== (l = t.createdAt) && void 0 !== l ? l : void 0,
            c = null !== (f = t.lastLoginAt) && void 0 !== f ? f : void 0,
            h = t.uid,
            d = t.emailVerified,
            l = t.isAnonymous,
            f = t.providerData,
            t = t.stsTokenManager;
          W(h && t, e, 'internal-error');
          t = ot.fromJSON(this.name, t);
          W('string' == typeof h, e, 'internal-error'),
            at(n, e.name),
            at(r, e.name),
            W('boolean' == typeof d, e, 'internal-error'),
            W('boolean' == typeof l, e, 'internal-error'),
            at(i, e.name),
            at(o, e.name),
            at(s, e.name),
            at(a, e.name),
            at(u, e.name),
            at(c, e.name);
          c = new ct({
            uid: h,
            auth: e,
            email: r,
            emailVerified: d,
            displayName: n,
            isAnonymous: l,
            photoURL: o,
            phoneNumber: i,
            tenantId: s,
            stsTokenManager: t,
            createdAt: u,
            lastLoginAt: c
          });
          return (
            f &&
              Array.isArray(f) &&
              (c.providerData = f.map(function (e) {
                return p({}, e);
              })),
            a && (c._redirectEventId = a),
            c
          );
        }),
        (ct._fromIdTokenResponse = function (n, r, i) {
          return (
            void 0 === i && (i = !1),
            f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      (t = new ot()).updateFromServerResponse(r),
                      [
                        4,
                        rt(
                          (t = new ct({
                            uid: r.localId,
                            auth: n,
                            stsTokenManager: t,
                            isAnonymous: i
                          }))
                        )
                      ]
                    );
                  case 1:
                    return e.sent(), [2, t];
                }
              });
            })
          );
        }),
        ct);
      function ct(e) {
        var t = e.uid,
          n = e.auth,
          r = e.stsTokenManager,
          e = u(e, ['uid', 'auth', 'stsTokenManager']);
        (this.providerId = 'firebase'),
          (this.emailVerified = !1),
          (this.isAnonymous = !1),
          (this.tenantId = null),
          (this.providerData = []),
          (this.proactiveRefresh = new Qe(this)),
          (this.reloadUserInfo = null),
          (this.reloadListener = null),
          (this.uid = t),
          (this.auth = n),
          (this.stsTokenManager = r),
          (this.accessToken = r.accessToken),
          (this.displayName = e.displayName || null),
          (this.email = e.email || null),
          (this.phoneNumber = e.phoneNumber || null),
          (this.photoURL = e.photoURL || null),
          (this.isAnonymous = e.isAnonymous || !1),
          (this.metadata = new tt(
            e.createdAt || void 0,
            e.lastLoginAt || void 0
          ));
      }
      var ht =
        ((dt._fromIdTokenResponse = function (r, i, o, s) {
          return (
            void 0 === s && (s = !1),
            f(this, void 0, void 0, function () {
              var t, n;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [4, ut._fromIdTokenResponse(r, o, s)];
                  case 1:
                    return (
                      (t = e.sent()),
                      (n = lt(o)),
                      [
                        2,
                        new dt({
                          user: t,
                          providerId: n,
                          _tokenResponse: o,
                          operationType: i
                        })
                      ]
                    );
                }
              });
            })
          );
        }),
        (dt._forOperation = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, n._updateTokensIfNecessary(i, !0)];
                case 1:
                  return (
                    e.sent(),
                    (t = lt(i)),
                    [
                      2,
                      new dt({
                        user: n,
                        providerId: t,
                        _tokenResponse: i,
                        operationType: r
                      })
                    ]
                  );
              }
            });
          });
        }),
        dt);
      function dt(e) {
        (this.user = e.user),
          (this.providerId = e.providerId),
          (this._tokenResponse = e._tokenResponse),
          (this.operationType = e.operationType);
      }
      function lt(e) {
        return e.providerId
          ? e.providerId
          : 'phoneNumber' in e
          ? 'phone'
          : null;
      }
      function ft(e, t, n) {
        return 'firebase:' + e + ':' + t + ':' + n;
      }
      var pt =
        ((vt.prototype.setCurrentUser = function (e) {
          return this.persistence._set(this.fullUserKey, e.toJSON());
        }),
        (vt.prototype.getCurrentUser = function () {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, this.persistence._get(this.fullUserKey)];
                case 1:
                  return [
                    2,
                    (t = e.sent()) ? ut._fromJSON(this.auth, t) : null
                  ];
              }
            });
          });
        }),
        (vt.prototype.removeCurrentUser = function () {
          return this.persistence._remove(this.fullUserKey);
        }),
        (vt.prototype.savePersistenceForRedirect = function () {
          return this.persistence._set(
            this.fullPersistenceKey,
            this.persistence.type
          );
        }),
        (vt.prototype.setPersistence = function (n) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return this.persistence.type === n.type
                    ? [2]
                    : [4, this.getCurrentUser()];
                case 1:
                  return (t = e.sent()), [4, this.removeCurrentUser()];
                case 2:
                  return (
                    e.sent(),
                    (this.persistence = n),
                    t ? [2, this.setCurrentUser(t)] : [2]
                  );
              }
            });
          });
        }),
        (vt.prototype.delete = function () {
          this.persistence._removeListener(
            this.fullUserKey,
            this.boundEventHandler
          );
        }),
        (vt.create = function (o, s, a) {
          return (
            void 0 === a && (a = 'authUser'),
            f(this, void 0, void 0, function () {
              var t, n, r, i;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    if (!s.length) return [2, new vt(z(Se), o, a)];
                    (t = ft(a, o.config.apiKey, o.name)),
                      (n = 0),
                      (r = s),
                      (e.label = 1);
                  case 1:
                    return n < r.length ? [4, (i = r[n])._get(t)] : [3, 4];
                  case 2:
                    if (e.sent()) return [2, new vt(i, o, a)];
                    e.label = 3;
                  case 3:
                    return n++, [3, 1];
                  case 4:
                    return [2, new vt(s[0], o, a)];
                }
              });
            })
          );
        }),
        vt);
      function vt(e, t, n) {
        (this.persistence = e), (this.auth = t), (this.userKey = n);
        (e = this.auth), (n = e.config), (e = e.name);
        (this.fullUserKey = ft(this.userKey, n.apiKey, e)),
          (this.fullPersistenceKey = ft('persistence', n.apiKey, e)),
          (this.boundEventHandler = t._onStorageEvent.bind(t)),
          this.persistence._addListener(
            this.fullUserKey,
            this.boundEventHandler
          );
      }
      var mt =
        ((gt.prototype._initializeWithPersistence = function (n, r) {
          var e = this;
          return (
            (this._initializationPromise = this.queue(function () {
              return f(e, void 0, void 0, function () {
                var t;
                return v(this, function (e) {
                  switch (e.label) {
                    case 0:
                      return this._deleted
                        ? [2]
                        : (r && (this._popupRedirectResolver = z(r)),
                          (t = this),
                          [4, pt.create(this, n)]);
                    case 1:
                      return (
                        (t.persistenceManager = e.sent()),
                        this._deleted ? [2] : [4, this.initializeCurrentUser(r)]
                      );
                    case 2:
                      return (e.sent(), this._deleted)
                        ? [2]
                        : ((this._isInitialized = !0), [2]);
                  }
                });
              });
            })),
            this._initializationPromise.then(function () {
              if (e.redirectInitializerError) throw e.redirectInitializerError;
            })
          );
        }),
        (gt.prototype._onStorageEvent = function () {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return this._deleted
                    ? [2]
                    : [4, this.assertedPersistence.getCurrentUser()];
                case 1:
                  return ((t = e.sent()), this.currentUser || t)
                    ? this.currentUser && t && this.currentUser.uid === t.uid
                      ? (this._currentUser._assign(t),
                        [4, this.currentUser.getIdToken()])
                      : [3, 3]
                    : [2];
                case 2:
                  return e.sent(), [2];
                case 3:
                  return [4, this._updateCurrentUser(t)];
                case 4:
                  return e.sent(), [2];
              }
            });
          });
        }),
        (gt.prototype.initializeCurrentUser = function (o) {
          var s;
          return f(this, void 0, void 0, function () {
            var t, n, r, i;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, this.assertedPersistence.getCurrentUser()];
                case 1:
                  return (
                    (t = e.sent()),
                    o && this.config.authDomain
                      ? [4, this.getOrInitRedirectPersistenceManager()]
                      : [3, 4]
                  );
                case 2:
                  return (
                    e.sent(),
                    (n =
                      null === (s = this.redirectUser) || void 0 === s
                        ? void 0
                        : s._redirectEventId),
                    (r = null == t ? void 0 : t._redirectEventId),
                    [4, this.tryRedirectSignIn(o)]
                  );
                case 3:
                  (i = e.sent()),
                    (n && n !== r) || null == i || !i.user || (t = i.user),
                    (e.label = 4);
                case 4:
                  return t
                    ? t._redirectEventId
                      ? (W(this._popupRedirectResolver, this, 'argument-error'),
                        [4, this.getOrInitRedirectPersistenceManager()])
                      : [2, this.reloadAndSetCurrentUserOrClear(t)]
                    : [2, this.directlySetCurrentUser(null)];
                case 5:
                  return (
                    e.sent(),
                    this.redirectUser &&
                    this.redirectUser._redirectEventId === t._redirectEventId
                      ? [2, this.directlySetCurrentUser(t)]
                      : [2, this.reloadAndSetCurrentUserOrClear(t)]
                  );
              }
            });
          });
        }),
        (gt.prototype.tryRedirectSignIn = function (r) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  (t = null), (e.label = 1);
                case 1:
                  return (
                    e.trys.push([1, 3, , 5]),
                    [
                      4,
                      this._popupRedirectResolver._completeRedirectFn(
                        this,
                        r,
                        !0
                      )
                    ]
                  );
                case 2:
                  return (t = e.sent()), [3, 5];
                case 3:
                  return (
                    (n = e.sent()),
                    (this.redirectInitializerError = n),
                    [4, this._setRedirectUser(null)]
                  );
                case 4:
                  return e.sent(), [3, 5];
                case 5:
                  return [2, t];
              }
            });
          });
        }),
        (gt.prototype.reloadAndSetCurrentUserOrClear = function (t) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return e.trys.push([0, 2, , 3]), [4, rt(t)];
                case 1:
                  return e.sent(), [3, 3];
                case 2:
                  return 'auth/network-request-failed' !== e.sent().code
                    ? [2, this.directlySetCurrentUser(null)]
                    : [3, 3];
                case 3:
                  return [2, this.directlySetCurrentUser(t)];
              }
            });
          });
        }),
        (gt.prototype.useDeviceLanguage = function () {
          this.languageCode = (function () {
            if ('undefined' == typeof navigator) return null;
            var e = navigator;
            return (e.languages && e.languages[0]) || e.language || null;
          })();
        }),
        (gt.prototype.useEmulator = function (e, t) {
          W(this._canInitEmulator, this, 'emulator-config-failed'),
            W(/^https?:\/\//.test(e), this, 'invalid-emulator-scheme'),
            (this.config.emulator = { url: e }),
            (this.settings.appVerificationDisabledForTesting = !0),
            (function (e) {
              function t() {
                var e = document.createElement('p'),
                  t = e.style;
                (e.innerText =
                  'Running in emulator mode. Do not use with production credentials.'),
                  (t.position = 'fixed'),
                  (t.width = '100%'),
                  (t.backgroundColor = '#ffffff'),
                  (t.border = '.1em solid #000000'),
                  (t.color = '#ff0000'),
                  (t.bottom = '0px'),
                  (t.left = '0px'),
                  (t.margin = '0px'),
                  (t.zIndex = '10000'),
                  (t.textAlign = 'center'),
                  e.classList.add('firebase-emulator-warning'),
                  document.body.appendChild(e);
              }
              'undefined' != typeof console &&
                'function' == typeof console.info &&
                console.info(
                  'WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials.'
                );
              'undefined' == typeof window ||
                'undefined' == typeof document ||
                e ||
                ('loading' === document.readyState
                  ? window.addEventListener('DOMContentLoaded', t)
                  : t());
            })(!(null == t || !t.disableWarnings));
        }),
        (gt.prototype._delete = function () {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return (this._deleted = !0), [2];
            });
          });
        }),
        (gt.prototype.updateCurrentUser = function (n) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              return (
                W(
                  !(t = n) || t.auth.name === this.name,
                  this,
                  'argument-error'
                ),
                [2, this._updateCurrentUser(t && t._clone())]
              );
            });
          });
        }),
        (gt.prototype._updateCurrentUser = function (n) {
          return f(this, void 0, void 0, function () {
            var t = this;
            return v(this, function (e) {
              return this._deleted
                ? [2]
                : (n &&
                    W(this.tenantId === n.tenantId, this, 'tenant-id-mismatch'),
                  [
                    2,
                    this.queue(function () {
                      return f(t, void 0, void 0, function () {
                        return v(this, function (e) {
                          switch (e.label) {
                            case 0:
                              return [4, this.directlySetCurrentUser(n)];
                            case 1:
                              return e.sent(), this.notifyAuthListeners(), [2];
                          }
                        });
                      });
                    })
                  ]);
            });
          });
        }),
        (gt.prototype.signOut = function () {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return this.redirectPersistenceManager ||
                    this._popupRedirectResolver
                    ? [4, this._setRedirectUser(null)]
                    : [3, 2];
                case 1:
                  e.sent(), (e.label = 2);
                case 2:
                  return [2, this._updateCurrentUser(null)];
              }
            });
          });
        }),
        (gt.prototype.setPersistence = function (t) {
          var e = this;
          return this.queue(function () {
            return f(e, void 0, void 0, function () {
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [4, this.assertedPersistence.setPersistence(z(t))];
                  case 1:
                    return e.sent(), [2];
                }
              });
            });
          });
        }),
        (gt.prototype._getPersistence = function () {
          return this.assertedPersistence.persistence.type;
        }),
        (gt.prototype._updateErrorMap = function (e) {
          this._errorFactory = new l('auth', 'Firebase', e());
        }),
        (gt.prototype.onAuthStateChanged = function (e, t, n) {
          return this.registerStateListener(
            this.authStateSubscription,
            e,
            t,
            n
          );
        }),
        (gt.prototype.onIdTokenChanged = function (e, t, n) {
          return this.registerStateListener(this.idTokenSubscription, e, t, n);
        }),
        (gt.prototype.toJSON = function () {
          var e;
          return {
            apiKey: this.config.apiKey,
            authDomain: this.config.authDomain,
            appName: this.name,
            currentUser:
              null === (e = this._currentUser) || void 0 === e
                ? void 0
                : e.toJSON()
          };
        }),
        (gt.prototype._setRedirectUser = function (n, r) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, this.getOrInitRedirectPersistenceManager(r)];
                case 1:
                  return (
                    (t = e.sent()),
                    [
                      2,
                      null === n ? t.removeCurrentUser() : t.setCurrentUser(n)
                    ]
                  );
              }
            });
          });
        }),
        (gt.prototype.getOrInitRedirectPersistenceManager = function (i) {
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return this.redirectPersistenceManager
                    ? [3, 3]
                    : (W(
                        (t = (i && z(i)) || this._popupRedirectResolver),
                        this,
                        'argument-error'
                      ),
                      (n = this),
                      [
                        4,
                        pt.create(
                          this,
                          [z(t._redirectPersistence)],
                          'redirectUser'
                        )
                      ]);
                case 1:
                  return (
                    (n.redirectPersistenceManager = e.sent()),
                    [4, (r = this).redirectPersistenceManager.getCurrentUser()]
                  );
                case 2:
                  (r.redirectUser = e.sent()), (e.label = 3);
                case 3:
                  return [2, this.redirectPersistenceManager];
              }
            });
          });
        }),
        (gt.prototype._redirectUserForId = function (n) {
          var r;
          return f(this, void 0, void 0, function () {
            var t = this;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return this._isInitialized
                    ? [
                        4,
                        this.queue(function () {
                          return f(t, void 0, void 0, function () {
                            return v(this, function (e) {
                              return [2];
                            });
                          });
                        })
                      ]
                    : [3, 2];
                case 1:
                  e.sent(), (e.label = 2);
                case 2:
                  return (null === (r = this._currentUser) || void 0 === r
                    ? void 0
                    : r._redirectEventId) === n
                    ? [2, this._currentUser]
                    : (null === (r = this.redirectUser) || void 0 === r
                        ? void 0
                        : r._redirectEventId) === n
                    ? [2, this.redirectUser]
                    : [2, null];
              }
            });
          });
        }),
        (gt.prototype._persistUserIfCurrent = function (n) {
          return f(this, void 0, void 0, function () {
            var t = this;
            return v(this, function (e) {
              return n === this.currentUser
                ? [
                    2,
                    this.queue(function () {
                      return f(t, void 0, void 0, function () {
                        return v(this, function (e) {
                          return [2, this.directlySetCurrentUser(n)];
                        });
                      });
                    })
                  ]
                : [2];
            });
          });
        }),
        (gt.prototype._notifyListenersIfCurrent = function (e) {
          e === this.currentUser && this.notifyAuthListeners();
        }),
        (gt.prototype._key = function () {
          return (
            this.config.authDomain + ':' + this.config.apiKey + ':' + this.name
          );
        }),
        (gt.prototype._startProactiveRefresh = function () {
          (this.isProactiveRefreshEnabled = !0),
            this.currentUser && this._currentUser._startProactiveRefresh();
        }),
        (gt.prototype._stopProactiveRefresh = function () {
          (this.isProactiveRefreshEnabled = !1),
            this.currentUser && this._currentUser._stopProactiveRefresh();
        }),
        Object.defineProperty(gt.prototype, '_currentUser', {
          get: function () {
            return this.currentUser;
          },
          enumerable: !1,
          configurable: !0
        }),
        (gt.prototype.notifyAuthListeners = function () {
          var e;
          this._isInitialized &&
            (this.idTokenSubscription.next(this.currentUser),
            (e =
              null !==
                (e =
                  null === (e = this.currentUser) || void 0 === e
                    ? void 0
                    : e.uid) && void 0 !== e
                ? e
                : null),
            this.lastNotifiedUid !== e &&
              ((this.lastNotifiedUid = e),
              this.authStateSubscription.next(this.currentUser)));
        }),
        (gt.prototype.registerStateListener = function (e, t, n, r) {
          var i = this;
          if (this._deleted) return function () {};
          var o = 'function' == typeof t ? t : t.next,
            s = this._isInitialized
              ? Promise.resolve()
              : this._initializationPromise;
          return (
            W(s, this, 'internal-error'),
            s.then(function () {
              return o(i.currentUser);
            }),
            'function' == typeof t ? e.addObserver(t, n, r) : e.addObserver(t)
          );
        }),
        (gt.prototype.directlySetCurrentUser = function (t) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    this.currentUser &&
                      this.currentUser !== t &&
                      (this._currentUser._stopProactiveRefresh(),
                      t &&
                        this.isProactiveRefreshEnabled &&
                        t._startProactiveRefresh()),
                    (this.currentUser = t)
                      ? [4, this.assertedPersistence.setCurrentUser(t)]
                      : [3, 2]
                  );
                case 1:
                  return e.sent(), [3, 4];
                case 2:
                  return [4, this.assertedPersistence.removeCurrentUser()];
                case 3:
                  e.sent(), (e.label = 4);
                case 4:
                  return [2];
              }
            });
          });
        }),
        (gt.prototype.queue = function (e) {
          return (
            (this.operations = this.operations.then(e, e)), this.operations
          );
        }),
        Object.defineProperty(gt.prototype, 'assertedPersistence', {
          get: function () {
            return (
              W(this.persistenceManager, this, 'internal-error'),
              this.persistenceManager
            );
          },
          enumerable: !1,
          configurable: !0
        }),
        gt);
      function gt(e, t) {
        (this.app = e),
          (this.config = t),
          (this.currentUser = null),
          (this.operations = Promise.resolve()),
          (this.authStateSubscription = new yt(this)),
          (this.idTokenSubscription = new yt(this)),
          (this.redirectUser = null),
          (this.isProactiveRefreshEnabled = !1),
          (this.redirectInitializerError = null),
          (this._canInitEmulator = !0),
          (this._isInitialized = !1),
          (this._deleted = !1),
          (this._initializationPromise = null),
          (this._popupRedirectResolver = null),
          (this._errorFactory = D),
          (this.lastNotifiedUid = void 0),
          (this.languageCode = null),
          (this.tenantId = null),
          (this.settings = { appVerificationDisabledForTesting: !1 }),
          (this.name = e.name);
      }
      var yt =
        (Object.defineProperty(It.prototype, 'next', {
          get: function () {
            return (
              W(this.observer, this.auth, 'internal-error'),
              this.observer.next.bind(this.observer)
            );
          },
          enumerable: !1,
          configurable: !0
        }),
        It);
      function It(e) {
        var t,
          n = this;
        (this.auth = e),
          (this.observer = null),
          (this.addObserver = (t = new I(function (e) {
            return (n.observer = e);
          }, t)).subscribe.bind(t));
      }
      var bt,
        _t =
          (e(Tt, (bt = d)),
          (Tt._fromErrorAndOperation = function (e, t, n, r) {
            return new Tt(e, t, n, r);
          }),
          Tt);
      function Tt(e, t, n, r) {
        var i = bt.call(this, t.code, t.message) || this;
        return (
          (i.operationType = n),
          (i.user = r),
          (i.name = 'FirebaseError'),
          Object.setPrototypeOf(i, Tt.prototype),
          (i.appName = e.name),
          (i.code = t.code),
          (i.tenantId = null !== (e = e.tenantId) && void 0 !== e ? e : void 0),
          (i.serverResponse = t.customData.serverResponse),
          i
        );
      }
      function wt(t, n, e, r) {
        return (
          'reauthenticate' === n
            ? e._getReauthenticationResolver(t)
            : e._getIdTokenResponse(t)
        ).catch(function (e) {
          if ('auth/multi-factor-auth-required' === e.code)
            throw _t._fromErrorAndOperation(t, e, n, r);
          throw e;
        });
      }
      function kt(e) {
        return new Set(
          e
            .map(function (e) {
              return e.providerId;
            })
            .filter(function (e) {
              return !!e;
            })
        );
      }
      function Et(s, a, u) {
        return (
          void 0 === u && (u = !1),
          f(this, void 0, void 0, function () {
            var t, n, r, i, o;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    (t = $e),
                    (n = [s]),
                    (i = (r = a)._linkToIdToken),
                    (o = [s.auth]),
                    [4, s.getIdToken()]
                  );
                case 1:
                  return [
                    4,
                    t.apply(
                      void 0,
                      n.concat([i.apply(r, o.concat([e.sent()])), u])
                    )
                  ];
                case 2:
                  return (o = e.sent()), [2, ht._forOperation(s, 'link', o)];
              }
            });
          })
        );
      }
      function Rt(r, i, o) {
        return f(this, void 0, void 0, function () {
          var t, n;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, rt(i)];
              case 1:
                return (
                  e.sent(),
                  (t = kt(i.providerData)),
                  (n =
                    !1 === r ? 'provider-already-linked' : 'no-such-provider'),
                  W(t.has(o) === r, i.auth, n),
                  [2]
                );
            }
          });
        });
      }
      function St(o, s, a) {
        return (
          void 0 === a && (a = !1),
          f(this, void 0, void 0, function () {
            var t, n, r, i;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  (t = o.auth), (n = 'reauthenticate'), (e.label = 1);
                case 1:
                  return (
                    e.trys.push([1, 3, , 4]), [4, $e(o, wt(t, n, s, o), a)]
                  );
                case 2:
                  return (
                    W((i = e.sent()).idToken, t, 'internal-error'),
                    W((r = Ze(i.idToken)), t, 'internal-error'),
                    (r = r.sub),
                    W(o.uid === r, t, 'user-mismatch'),
                    [2, ht._forOperation(o, n, i)]
                  );
                case 3:
                  throw (
                    ('auth/user-not-found' ===
                      (null == (i = e.sent()) ? void 0 : i.code) &&
                      x(t, 'user-mismatch'),
                    i)
                  );
                case 4:
                  return [2];
              }
            });
          })
        );
      }
      function At(i, o, s) {
        return (
          void 0 === s && (s = !1),
          f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, wt(i, (t = 'signIn'), o)];
                case 1:
                  return (n = e.sent()), [4, ht._fromIdTokenResponse(i, t, n)];
                case 2:
                  return (
                    (r = e.sent()),
                    s ? [3, 4] : [4, i._updateCurrentUser(r.user)]
                  );
                case 3:
                  e.sent(), (e.label = 4);
                case 4:
                  return [2, r];
              }
            });
          })
        );
      }
      function Pt(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, At(t, n)];
          });
        });
      }
      function Nt(n, r) {
        return f(this, void 0, void 0, function () {
          var t;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, Rt(!1, (t = n), r.providerId)];
              case 1:
                return e.sent(), [2, Et(t, r)];
            }
          });
        });
      }
      function Ot(t, n) {
        return f(this, void 0, void 0, function () {
          return v(this, function (e) {
            return [2, St(t, n)];
          });
        });
      }
      var Ct =
        ((Lt._fromServerResponse = function (e, t) {
          return 'phoneInfo' in t
            ? Mt._fromServerResponse(e, t)
            : x(e, 'internal-error');
        }),
        Lt);
      function Lt(e, t) {
        (this.factorId = e),
          (this.uid = t.mfaEnrollmentId),
          (this.enrollmentTime = new Date(t.enrolledAt).toUTCString()),
          (this.displayName = t.displayName);
      }
      var Dt,
        Mt =
          (e(Ut, (Dt = Ct)),
          (Ut._fromServerResponse = function (e, t) {
            return new Ut(t);
          }),
          Ut);
      function Ut(e) {
        var t = Dt.call(this, 'phone', e) || this;
        return (t.phoneNumber = e.phoneInfo), t;
      }
      function xt(e, t, n) {
        var r;
        W(
          0 < (null === (r = n.url) || void 0 === r ? void 0 : r.length),
          e,
          'invalid-continue-uri'
        ),
          W(
            void 0 === n.dynamicLinkDomain || 0 < n.dynamicLinkDomain.length,
            e,
            'invalid-dynamic-link-domain'
          ),
          (t.continueUrl = n.url),
          (t.dynamicLinkDomain = n.dynamicLinkDomain),
          (t.canHandleCodeInApp = n.handleCodeInApp),
          n.iOS &&
            (W(0 < n.iOS.bundleId.length, e, 'missing-ios-bundle-id'),
            (t.iosBundleId = n.iOS.bundleId)),
          n.android &&
            (W(0 < n.android.packageName.length, e, 'missing-android-pkg-name'),
            (t.androidInstallApp = n.android.installApp),
            (t.androidMinimumVersionCode = n.android.minimumVersion),
            (t.androidPackageName = n.android.packageName));
      }
      function Ft(i, o) {
        return f(this, void 0, void 0, function () {
          var t, n, r;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, le(i, { oobCode: o })];
              case 1:
                switch (
                  ((t = e.sent()),
                  W((n = t.requestType), i, 'internal-error'),
                  n)
                ) {
                  case 'EMAIL_SIGNIN':
                    break;
                  case 'VERIFY_AND_CHANGE_EMAIL':
                    W(t.newEmail, i, 'internal-error');
                    break;
                  case 'REVERT_SECOND_FACTOR_ADDITION':
                    W(t.mfaInfo, i, 'internal-error');
                  default:
                    W(t.email, i, 'internal-error');
                }
                return (
                  (r = null),
                  t.mfaInfo && (r = Ct._fromServerResponse(i, t.mfaInfo)),
                  [
                    2,
                    {
                      data: {
                        email:
                          ('VERIFY_AND_CHANGE_EMAIL' === t.requestType
                            ? t.newEmail
                            : t.email) || null,
                        previousEmail:
                          ('VERIFY_AND_CHANGE_EMAIL' === t.requestType
                            ? t.email
                            : t.newEmail) || null,
                        multiFactorInfo: r
                      },
                      operation: n
                    }
                  ]
                );
            }
          });
        });
      }
      function Vt(r, i, o) {
        return f(this, void 0, void 0, function () {
          var t, n;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return (t = r.auth), [4, r.getIdToken()];
              case 1:
                return (
                  (n = e.sent()),
                  (n = { idToken: n, returnSecureToken: !0 }),
                  i && (n.email = i),
                  o && (n.password = o),
                  [4, $e(r, fe(t, n))]
                );
              case 2:
                return (n = e.sent()), [4, r._updateTokensIfNecessary(n, !0)];
              case 3:
                return e.sent(), [2];
            }
          });
        });
      }
      var Wt,
        jt = function (e, t, n) {
          void 0 === n && (n = {}),
            (this.isNewUser = e),
            (this.providerId = t),
            (this.profile = n);
        },
        S = (e(Ht, (Wt = jt)), Ht);
      function Ht(e, t, n, r) {
        n = Wt.call(this, e, t, n) || this;
        return (n.username = r), n;
      }
      var qt,
        zt = (e(Bt, (qt = jt)), Bt);
      function Bt(e, t) {
        return qt.call(this, e, 'facebook.com', t) || this;
      }
      var Gt,
        Kt = (e(Jt, (Gt = S)), Jt);
      function Jt(e, t) {
        return (
          Gt.call(
            this,
            e,
            'github.com',
            t,
            'string' == typeof (null == t ? void 0 : t.login)
              ? null == t
                ? void 0
                : t.login
              : null
          ) || this
        );
      }
      var Yt,
        Xt = (e(Zt, (Yt = jt)), Zt);
      function Zt(e, t) {
        return Yt.call(this, e, 'google.com', t) || this;
      }
      var $t,
        Qt = (e(en, ($t = S)), en);
      function en(e, t, n) {
        return $t.call(this, e, 'twitter.com', t, n) || this;
      }
      var tn =
        ((nn._fromIdtoken = function (e) {
          return new nn('enroll', e);
        }),
        (nn._fromMfaPendingCredential = function (e) {
          return new nn('signin', e);
        }),
        (nn.prototype.toJSON = function () {
          var e;
          return {
            multiFactorSession:
              (((e = {})[
                'enroll' === this.type ? 'idToken' : 'pendingCredential'
              ] = this.credential),
              e)
          };
        }),
        (nn.fromJSON = function (e) {
          var t;
          if (null != e && e.multiFactorSession) {
            if (
              null !== (t = e.multiFactorSession) &&
              void 0 !== t &&
              t.pendingCredential
            )
              return nn._fromMfaPendingCredential(
                e.multiFactorSession.pendingCredential
              );
            if (
              null !== (t = e.multiFactorSession) &&
              void 0 !== t &&
              t.idToken
            )
              return nn._fromIdtoken(e.multiFactorSession.idToken);
          }
          return null;
        }),
        nn);
      function nn(e, t) {
        (this.type = e), (this.credential = t);
      }
      var rn =
        ((on._fromError = function (e, i) {
          var t = this,
            o = e,
            e = (i.serverResponse.mfaInfo || []).map(function (e) {
              return Ct._fromServerResponse(o, e);
            });
          W(i.serverResponse.mfaPendingCredential, o, 'internal-error');
          var s = tn._fromMfaPendingCredential(
            i.serverResponse.mfaPendingCredential
          );
          return new on(s, e, function (r) {
            return f(t, void 0, void 0, function () {
              var t, n;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [4, r._process(o, s)];
                  case 1:
                    switch (
                      ((t = e.sent()),
                      delete i.serverResponse.mfaInfo,
                      delete i.serverResponse.mfaPendingCredential,
                      (t = p(p({}, i.serverResponse), {
                        idToken: t.idToken,
                        refreshToken: t.refreshToken
                      })),
                      i.operationType)
                    ) {
                      case 'signIn':
                        return [3, 2];
                      case 'reauthenticate':
                        return [3, 5];
                    }
                    return [3, 6];
                  case 2:
                    return [4, ht._fromIdTokenResponse(o, i.operationType, t)];
                  case 3:
                    return (n = e.sent()), [4, o._updateCurrentUser(n.user)];
                  case 4:
                    return e.sent(), [2, n];
                  case 5:
                    return (
                      W(i.user, o, 'internal-error'),
                      [2, ht._forOperation(i.user, i.operationType, t)]
                    );
                  case 6:
                    x(o, 'internal-error'), (e.label = 7);
                  case 7:
                    return [2];
                }
              });
            });
          });
        }),
        (on.prototype.resolveSignIn = function (t) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return [2, this.signInResolver(t)];
            });
          });
        }),
        on);
      function on(e, t, n) {
        (this.session = e), (this.hints = t), (this.signInResolver = n);
      }
      var sn =
        ((an._fromUser = function (e) {
          return new an(e);
        }),
        (an.prototype.getSession = function () {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    (n = (t = tn)._fromIdtoken), [4, this.user.getIdToken()]
                  );
                case 1:
                  return [2, n.apply(t, [e.sent()])];
              }
            });
          });
        }),
        (an.prototype.enroll = function (r, i) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (t = r), [4, this.getSession()];
                case 1:
                  return (
                    (n = e.sent()),
                    [4, $e(this.user, t._process(this.user.auth, n, i))]
                  );
                case 2:
                  return (
                    (n = e.sent()), [4, this.user._updateTokensIfNecessary(n)]
                  );
                case 3:
                  return e.sent(), [2, this.user.reload()];
              }
            });
          });
        }),
        (an.prototype.unenroll = function (s) {
          return f(this, void 0, void 0, function () {
            var r, i, o;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    (r = 'string' == typeof s ? s : s.uid),
                    [4, this.user.getIdToken()]
                  );
                case 1:
                  return (
                    (i = e.sent()),
                    [
                      4,
                      $e(
                        this.user,
                        ((t = this.user.auth),
                        (n = { idToken: i, mfaEnrollmentId: r }),
                        oe(
                          t,
                          'POST',
                          '/v2/accounts/mfaEnrollment:withdraw',
                          p({ tenantId: t.tenantId }, n)
                        ))
                      )
                    ]
                  );
                case 2:
                  return (
                    (o = e.sent()),
                    (this.enrolledFactors = this.enrolledFactors.filter(
                      function (e) {
                        return e.uid !== r;
                      }
                    )),
                    [4, this.user._updateTokensIfNecessary(o)]
                  );
                case 3:
                  e.sent(), (e.label = 4);
                case 4:
                  return e.trys.push([4, 6, , 7]), [4, this.user.reload()];
                case 5:
                  return e.sent(), [3, 7];
                case 6:
                  if ('auth/user-token-expired' !== (o = e.sent()).code)
                    throw o;
                  return [3, 7];
                case 7:
                  return [2];
              }
              var t, n;
            });
          });
        }),
        an);
      function an(t) {
        var n = this;
        (this.user = t),
          (this.enrolledFactors = []),
          t._onReload(function (e) {
            e.mfaInfo &&
              (n.enrolledFactors = e.mfaInfo.map(function (e) {
                return Ct._fromServerResponse(t.auth, e);
              }));
          });
      }
      var un = new WeakMap();
      function cn(e) {
        var t = e.toLowerCase();
        if (t.includes('opera/') || t.includes('opr/') || t.includes('opios/'))
          return 'Opera';
        if (fn(t)) return 'IEMobile';
        if (t.includes('msie') || t.includes('trident/')) return 'IE';
        if (t.includes('edge/')) return 'Edge';
        if (hn(t)) return 'Firefox';
        if (t.includes('silk/')) return 'Silk';
        if (vn(t)) return 'Blackberry';
        if (mn(t)) return 'Webos';
        if (dn(t)) return 'Safari';
        if ((t.includes('chrome/') || ln(t)) && !t.includes('edge/'))
          return 'Chrome';
        if (pn(t)) return 'Android';
        e = e.match(/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/);
        return 2 === (null == e ? void 0 : e.length) ? e[1] : 'Other';
      }
      function hn(e) {
        return /firefox\//i.test(e);
      }
      function dn(e) {
        e = e.toLowerCase();
        return (
          e.includes('safari/') &&
          !e.includes('chrome/') &&
          !e.includes('crios/') &&
          !e.includes('android')
        );
      }
      function ln(e) {
        return /crios\//i.test(e);
      }
      function fn(e) {
        return /iemobile/i.test(e);
      }
      function pn(e) {
        return /android/i.test(e);
      }
      function vn(e) {
        return /blackberry/i.test(e);
      }
      function mn(e) {
        return /webos/i.test(e);
      }
      function gn(e) {
        return /iphone|ipad|ipod/i.test(e);
      }
      function yn() {
        return (
          (0 <= (e = h()).indexOf('MSIE ') || 0 <= e.indexOf('Trident/')) &&
          10 === document.documentMode
        );
        var e;
      }
      var In =
        ((bn.prototype.getUid = function () {
          var e;
          return (
            (null === (e = this.auth.currentUser) || void 0 === e
              ? void 0
              : e.uid) || null
          );
        }),
        (bn.prototype.getToken = function (t) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, this.auth._initializationPromise];
                case 1:
                  return (
                    e.sent(),
                    this.auth.currentUser
                      ? [4, this.auth.currentUser.getIdToken(t)]
                      : [2, null]
                  );
                case 2:
                  return [2, { accessToken: e.sent() }];
              }
            });
          });
        }),
        (bn.prototype.addAuthTokenListener = function (t) {
          var e;
          this.internalListeners.has(t) ||
            ((e = this.auth.onIdTokenChanged(function (e) {
              t(
                (null === e || void 0 === e
                  ? void 0
                  : e.stsTokenManager.accessToken) || null
              );
            })),
            this.internalListeners.set(t, e),
            this.updateProactiveRefresh());
        }),
        (bn.prototype.removeAuthTokenListener = function (e) {
          var t = this.internalListeners.get(e);
          t &&
            (this.internalListeners.delete(e),
            t(),
            this.updateProactiveRefresh());
        }),
        (bn.prototype.updateProactiveRefresh = function () {
          0 < this.internalListeners.size
            ? this.auth._startProactiveRefresh()
            : this.auth._stopProactiveRefresh();
        }),
        bn);
      function bn(e) {
        (this.auth = e), (this.internalListeners = new Map());
      }
      var _n = '__sak',
        Tn =
          ((wn.prototype._isAvailable = function () {
            try {
              return this.storage
                ? (this.storage.setItem(_n, '1'),
                  this.storage.removeItem(_n),
                  Promise.resolve(!0))
                : Promise.resolve(!1);
            } catch (e) {
              return Promise.resolve(!1);
            }
          }),
          (wn.prototype._set = function (e, t) {
            return (
              this.storage.setItem(e, JSON.stringify(t)), Promise.resolve()
            );
          }),
          (wn.prototype._get = function (e) {
            e = this.storage.getItem(e);
            return Promise.resolve(e ? JSON.parse(e) : null);
          }),
          (wn.prototype._remove = function (e) {
            return this.storage.removeItem(e), Promise.resolve();
          }),
          wn);
      function wn(e, t) {
        (this.storage = e), (this.type = t);
      }
      var kn;
      function En() {
        var e,
          t,
          n = kn.call(this, localStorage, 'LOCAL') || this;
        return (
          (n.listeners = {}),
          (n.localCache = {}),
          (n.pollTimer = null),
          (n.safariLocalStorageNotSynced =
            (dn((e = h())) || gn(e)) &&
            (function () {
              try {
                return !(!window || window === window.top);
              } catch (e) {
                return !1;
              }
            })()),
          (n.fallbackToPolling =
            (void 0 === t && (t = h()),
            gn(t) ||
              pn(t) ||
              mn(t) ||
              vn(t) ||
              /windows phone/i.test(t) ||
              fn(t))),
          (n.boundEventHandler = n.onStorageEvent.bind(n)),
          n
        );
      }
      var Rn =
        (e(En, (kn = Tn)),
        (En.prototype.forAllChangedKeys = function (e) {
          for (var t = 0, n = Object.keys(this.listeners); t < n.length; t++) {
            var r = n[t],
              i = this.storage.getItem(r),
              o = this.localCache[r];
            i !== o && e(r, o, i);
          }
        }),
        (En.prototype.onStorageEvent = function (e, t) {
          var r = this;
          if ((void 0 === t && (t = !1), e.key)) {
            var n = e.key;
            if (this.listeners[n]) {
              if (
                (t ? this.detachListener() : this.stopPolling(),
                this.safariLocalStorageNotSynced)
              ) {
                var i = this.storage.getItem(n);
                if (e.newValue !== i)
                  null !== e.newValue
                    ? this.storage.setItem(n, e.newValue)
                    : this.storage.removeItem(n);
                else if (this.localCache[n] === e.newValue && !t) return;
              }
              var o = function () {
                  var e = r.storage.getItem(n);
                  (!t && r.localCache[n] === e) || r.notifyListeners(n, e);
                },
                i = this.storage.getItem(n);
              yn() && i !== e.newValue && e.newValue !== e.oldValue
                ? setTimeout(o, 10)
                : o();
            }
          } else
            this.forAllChangedKeys(function (e, t, n) {
              r.notifyListeners(e, n);
            });
        }),
        (En.prototype.notifyListeners = function (e, t) {
          if (this.listeners[e]) {
            this.localCache[e] = t;
            for (
              var n = 0, r = Array.from(this.listeners[e]);
              n < r.length;
              n++
            ) {
              (0, r[n])(t ? JSON.parse(t) : t);
            }
          }
        }),
        (En.prototype.startPolling = function () {
          var r = this;
          this.stopPolling(),
            (this.pollTimer = setInterval(function () {
              r.forAllChangedKeys(function (e, t, n) {
                r.onStorageEvent(
                  new StorageEvent('storage', {
                    key: e,
                    oldValue: t,
                    newValue: n
                  }),
                  !0
                );
              });
            }, 1e3));
        }),
        (En.prototype.stopPolling = function () {
          this.pollTimer &&
            (clearInterval(this.pollTimer), (this.pollTimer = null));
        }),
        (En.prototype.attachListener = function () {
          window.addEventListener('storage', this.boundEventHandler);
        }),
        (En.prototype.detachListener = function () {
          window.removeEventListener('storage', this.boundEventHandler);
        }),
        (En.prototype._addListener = function (e, t) {
          (this.localCache[e] = this.storage.getItem(e)),
            0 === Object.keys(this.listeners).length &&
              (this.fallbackToPolling
                ? this.startPolling()
                : this.attachListener()),
            (this.listeners[e] = this.listeners[e] || new Set()),
            this.listeners[e].add(t);
        }),
        (En.prototype._removeListener = function (e, t) {
          this.listeners[e] &&
            (this.listeners[e].delete(t),
            0 === this.listeners[e].size &&
              (delete this.listeners[e], delete this.localCache[e])),
            0 === Object.keys(this.listeners).length &&
              (this.detachListener(), this.stopPolling());
        }),
        (En.type = 'LOCAL'),
        En);
      var Sn =
        ((An._getInstance = function (t) {
          var e = this.receivers.find(function (e) {
            return e.isListeningto(t);
          });
          if (e) return e;
          e = new An(t);
          return this.receivers.push(e), e;
        }),
        (An.prototype.isListeningto = function (e) {
          return this.eventTarget === e;
        }),
        (An.prototype.handleEvent = function (a) {
          return f(this, void 0, void 0, function () {
            var n,
              t,
              r,
              i,
              o,
              s = this;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return ((o = (n = a).data),
                  (t = o.eventId),
                  (r = o.eventType),
                  (i = o.data),
                  null != (o = this.handlersMap[r]) && o.size)
                    ? (n.ports[0].postMessage({
                        status: 'ack',
                        eventId: t,
                        eventType: r
                      }),
                      [
                        4,
                        (function (e) {
                          var n = this;
                          return Promise.all(
                            e.map(function (t) {
                              return f(n, void 0, void 0, function () {
                                return v(this, function (e) {
                                  switch (e.label) {
                                    case 0:
                                      return e.trys.push([0, 2, , 3]), [4, t];
                                    case 1:
                                      return [
                                        2,
                                        { fulfilled: !0, value: e.sent() }
                                      ];
                                    case 2:
                                      return [
                                        2,
                                        { fulfilled: !1, reason: e.sent() }
                                      ];
                                    case 3:
                                      return [2];
                                  }
                                });
                              });
                            })
                          );
                        })(
                          Array.from(o).map(function (t) {
                            return f(s, void 0, void 0, function () {
                              return v(this, function (e) {
                                return [2, t(n.origin, i)];
                              });
                            });
                          })
                        )
                      ])
                    : [2];
                case 1:
                  return (
                    (o = e.sent()),
                    n.ports[0].postMessage({
                      status: 'done',
                      eventId: t,
                      eventType: r,
                      response: o
                    }),
                    [2]
                  );
              }
            });
          });
        }),
        (An.prototype._subscribe = function (e, t) {
          0 === Object.keys(this.handlersMap).length &&
            this.eventTarget.addEventListener(
              'message',
              this.boundEventHandler
            ),
            this.handlersMap[e] || (this.handlersMap[e] = new Set()),
            this.handlersMap[e].add(t);
        }),
        (An.prototype._unsubscribe = function (e, t) {
          this.handlersMap[e] && t && this.handlersMap[e].delete(t),
            (t && 0 !== this.handlersMap[e].size) || delete this.handlersMap[e],
            0 === Object.keys(this.handlersMap).length &&
              this.eventTarget.removeEventListener(
                'message',
                this.boundEventHandler
              );
        }),
        (An.receivers = []),
        An);
      function An(e) {
        (this.eventTarget = e),
          (this.handlersMap = {}),
          (this.boundEventHandler = this.handleEvent.bind(this));
      }
      var Pn =
        ((Nn.prototype.removeMessageHandler = function (e) {
          e.messageChannel &&
            (e.messageChannel.port1.removeEventListener('message', e.onMessage),
            e.messageChannel.port1.close()),
            this.handlers.delete(e);
        }),
        (Nn.prototype._send = function (h, d, l) {
          return (
            void 0 === l && (l = 50),
            f(this, void 0, void 0, function () {
              var s,
                a,
                u,
                c = this;
              return v(this, function (e) {
                if (
                  !(s =
                    'undefined' != typeof MessageChannel
                      ? new MessageChannel()
                      : null)
                )
                  throw new Error('connection_unavailable');
                return [
                  2,
                  new Promise(function (t, n) {
                    var e,
                      r,
                      i =
                        (void 0 === e && (e = ''),
                        void 0 === r && (r = 20),
                        '' + e + Math.floor(Math.random() * Math.pow(10, r)));
                    s.port1.start();
                    var o = setTimeout(function () {
                      n(new Error('unsupported_event'));
                    }, l);
                    (u = {
                      messageChannel: s,
                      onMessage: function (e) {
                        if (e.data.eventId === i)
                          switch (e.data.status) {
                            case 'ack':
                              clearTimeout(o),
                                (a = setTimeout(function () {
                                  n(new Error('timeout'));
                                }, 3e3));
                              break;
                            case 'done':
                              clearTimeout(a), t(e.data.response);
                              break;
                            default:
                              clearTimeout(o),
                                clearTimeout(a),
                                n(new Error('invalid_response'));
                          }
                      }
                    }),
                      c.handlers.add(u),
                      s.port1.addEventListener('message', u.onMessage),
                      c.target.postMessage(
                        { eventType: h, eventId: i, data: d },
                        [s.port2]
                      );
                  }).finally(function () {
                    u && c.removeMessageHandler(u);
                  })
                ];
              });
            })
          );
        }),
        Nn);
      function Nn(e) {
        (this.target = e), (this.handlers = new Set());
      }
      function On() {
        return window;
      }
      function Cn() {
        return (
          void 0 !== On().WorkerGlobalScope &&
          'function' == typeof On().importScripts
        );
      }
      var Ln = 'firebaseLocalStorageDb',
        Dn = 1,
        Mn = 'firebaseLocalStorage',
        Un = 'fbase_key',
        xn =
          ((Fn.prototype.toPromise = function () {
            var n = this;
            return new Promise(function (e, t) {
              n.request.addEventListener('success', function () {
                e(n.request.result);
              }),
                n.request.addEventListener('error', function () {
                  t(n.request.error);
                });
            });
          }),
          Fn);
      function Fn(e) {
        this.request = e;
      }
      function Vn(e, t) {
        return e
          .transaction([Mn], t ? 'readwrite' : 'readonly')
          .objectStore(Mn);
      }
      function Wn() {
        var e = this,
          i = indexedDB.open(Ln, Dn);
        return new Promise(function (r, t) {
          i.addEventListener('error', function () {
            t(i.error);
          }),
            i.addEventListener('upgradeneeded', function () {
              var e = i.result;
              try {
                e.createObjectStore(Mn, { keyPath: Un });
              } catch (e) {
                t(e);
              }
            }),
            i.addEventListener('success', function () {
              return f(e, void 0, void 0, function () {
                var n;
                return v(this, function (e) {
                  switch (e.label) {
                    case 0:
                      return (n = i.result).objectStoreNames.contains(Mn)
                        ? [3, 2]
                        : [
                            4,
                            ((t = indexedDB.deleteDatabase(Ln)),
                            new xn(t).toPromise())
                          ];
                    case 1:
                      return e.sent(), [2, Wn()];
                    case 2:
                      r(n), (e.label = 3);
                    case 3:
                      return [2];
                  }
                  var t;
                });
              });
            });
        });
      }
      function jn(r, i, o) {
        return f(this, void 0, void 0, function () {
          var t, n;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return (t = Vn(r, !1).get(i)), [4, new xn(t).toPromise()];
              case 1:
                return (
                  (t = e.sent()),
                  (n = t
                    ? ((t.value = o), Vn(r, !0).put(t))
                    : Vn(r, !0).add((((n = {})[Un] = i), (n.value = o), n))),
                  [2, new xn(n).toPromise()]
                );
            }
          });
        });
      }
      function Hn(e, t) {
        t = Vn(e, !0).delete(t);
        return new xn(t).toPromise();
      }
      function qn() {
        (this.type = 'LOCAL'),
          (this.listeners = {}),
          (this.localCache = {}),
          (this.pollTimer = null),
          (this.pendingWrites = 0),
          (this.receiver = null),
          (this.sender = null),
          (this.serviceWorkerReceiverAvailable = !1),
          (this.activeServiceWorker = null),
          (this._workerInitializationPromise =
            this.initializeServiceWorkerMessaging().then(
              function () {},
              function () {}
            ));
      }
      var zn =
          ((qn.prototype._openDb = function () {
            return f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return this.db ? [2, this.db] : ((t = this), [4, Wn()]);
                  case 1:
                    return (t.db = e.sent()), [2, this.db];
                }
              });
            });
          }),
          (qn.prototype._withRetries = function (r) {
            return f(this, void 0, void 0, function () {
              var t, n;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    (t = 0), (e.label = 1);
                  case 1:
                    e.label = 2;
                  case 2:
                    return e.trys.push([2, 5, , 6]), [4, this._openDb()];
                  case 3:
                    return (n = e.sent()), [4, r(n)];
                  case 4:
                    return [2, e.sent()];
                  case 5:
                    if (((n = e.sent()), 3 < t++)) throw n;
                    return (
                      this.db && (this.db.close(), (this.db = void 0)), [3, 6]
                    );
                  case 6:
                    return [3, 1];
                  case 7:
                    return [2];
                }
              });
            });
          }),
          (qn.prototype.initializeServiceWorkerMessaging = function () {
            return f(this, void 0, void 0, function () {
              return v(this, function (e) {
                return [
                  2,
                  Cn() ? this.initializeReceiver() : this.initializeSender()
                ];
              });
            });
          }),
          (qn.prototype.initializeReceiver = function () {
            return f(this, void 0, void 0, function () {
              var n = this;
              return v(this, function (e) {
                return (
                  (this.receiver = Sn._getInstance(Cn() ? self : null)),
                  this.receiver._subscribe('keyChanged', function (e, t) {
                    return f(n, void 0, void 0, function () {
                      return v(this, function (e) {
                        switch (e.label) {
                          case 0:
                            return [4, this._poll()];
                          case 1:
                            return [
                              2,
                              { keyProcessed: e.sent().includes(t.key) }
                            ];
                        }
                      });
                    });
                  }),
                  this.receiver._subscribe('ping', function (e, t) {
                    return f(n, void 0, void 0, function () {
                      return v(this, function (e) {
                        return [2, ['keyChanged']];
                      });
                    });
                  }),
                  [2]
                );
              });
            });
          }),
          (qn.prototype.initializeSender = function () {
            var n, r;
            return f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      (t = this),
                      [
                        4,
                        (function () {
                          return f(this, void 0, void 0, function () {
                            return v(this, function (e) {
                              switch (e.label) {
                                case 0:
                                  if (
                                    null === navigator ||
                                    void 0 === navigator ||
                                    !navigator.serviceWorker
                                  )
                                    return [2, null];
                                  e.label = 1;
                                case 1:
                                  return (
                                    e.trys.push([1, 3, , 4]),
                                    [4, navigator.serviceWorker.ready]
                                  );
                                case 2:
                                  return [2, e.sent().active];
                                case 3:
                                  return e.sent(), [2, null];
                                case 4:
                                  return [2];
                              }
                            });
                          });
                        })()
                      ]
                    );
                  case 1:
                    return ((t.activeServiceWorker = e.sent()),
                    this.activeServiceWorker)
                      ? ((this.sender = new Pn(this.activeServiceWorker)),
                        [4, this.sender._send('ping', {}, 800)])
                      : [2];
                  case 2:
                    return (t = e.sent())
                      ? (null !== (n = t[0]) &&
                          void 0 !== n &&
                          n.fulfilled &&
                          null !== (r = t[0]) &&
                          void 0 !== r &&
                          r.value.includes('keyChanged') &&
                          (this.serviceWorkerReceiverAvailable = !0),
                        [2])
                      : [2];
                }
              });
            });
          }),
          (qn.prototype.notifyServiceWorker = function (n) {
            return f(this, void 0, void 0, function () {
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    if (
                      !this.sender ||
                      !this.activeServiceWorker ||
                      ((null ===
                        (t =
                          null === navigator || void 0 === navigator
                            ? void 0
                            : navigator.serviceWorker) || void 0 === t
                        ? void 0
                        : t.controller) || null) !== this.activeServiceWorker
                    )
                      return [2];
                    e.label = 1;
                  case 1:
                    return (
                      e.trys.push([1, 3, , 4]),
                      [
                        4,
                        this.sender._send(
                          'keyChanged',
                          { key: n },
                          this.serviceWorkerReceiverAvailable ? 800 : 50
                        )
                      ]
                    );
                  case 2:
                    return e.sent(), [3, 4];
                  case 3:
                    return e.sent(), [3, 4];
                  case 4:
                    return [2];
                }
                var t;
              });
            });
          }),
          (qn.prototype._isAvailable = function () {
            return f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      e.trys.push([0, 4, , 5]), indexedDB ? [4, Wn()] : [2, !1]
                    );
                  case 1:
                    return [4, jn((t = e.sent()), _n, '1')];
                  case 2:
                    return e.sent(), [4, Hn(t, _n)];
                  case 3:
                    return e.sent(), [2, !0];
                  case 4:
                    return e.sent(), [3, 5];
                  case 5:
                    return [2, !1];
                }
              });
            });
          }),
          (qn.prototype._withPendingWrite = function (t) {
            return f(this, void 0, void 0, function () {
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    this.pendingWrites++, (e.label = 1);
                  case 1:
                    return e.trys.push([1, , 3, 4]), [4, t()];
                  case 2:
                    return e.sent(), [3, 4];
                  case 3:
                    return this.pendingWrites--, [7];
                  case 4:
                    return [2];
                }
              });
            });
          }),
          (qn.prototype._set = function (n, r) {
            return f(this, void 0, void 0, function () {
              var t = this;
              return v(this, function (e) {
                return [
                  2,
                  this._withPendingWrite(function () {
                    return f(t, void 0, void 0, function () {
                      return v(this, function (e) {
                        switch (e.label) {
                          case 0:
                            return [
                              4,
                              this._withRetries(function (e) {
                                return jn(e, n, r);
                              })
                            ];
                          case 1:
                            return (
                              e.sent(),
                              (this.localCache[n] = r),
                              [2, this.notifyServiceWorker(n)]
                            );
                        }
                      });
                    });
                  })
                ];
              });
            });
          }),
          (qn.prototype._get = function (n) {
            return f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [
                      4,
                      this._withRetries(function (e) {
                        return (function (n, r) {
                          return f(this, void 0, void 0, function () {
                            var t;
                            return v(this, function (e) {
                              switch (e.label) {
                                case 0:
                                  return (
                                    (t = Vn(n, !1).get(r)),
                                    [4, new xn(t).toPromise()]
                                  );
                                case 1:
                                  return [
                                    2,
                                    void 0 === (t = e.sent()) ? null : t.value
                                  ];
                              }
                            });
                          });
                        })(e, n);
                      })
                    ];
                  case 1:
                    return (t = e.sent()), [2, (this.localCache[n] = t)];
                }
              });
            });
          }),
          (qn.prototype._remove = function (n) {
            return f(this, void 0, void 0, function () {
              var t = this;
              return v(this, function (e) {
                return [
                  2,
                  this._withPendingWrite(function () {
                    return f(t, void 0, void 0, function () {
                      return v(this, function (e) {
                        switch (e.label) {
                          case 0:
                            return [
                              4,
                              this._withRetries(function (e) {
                                return Hn(e, n);
                              })
                            ];
                          case 1:
                            return (
                              e.sent(),
                              delete this.localCache[n],
                              [2, this.notifyServiceWorker(n)]
                            );
                        }
                      });
                    });
                  })
                ];
              });
            });
          }),
          (qn.prototype._poll = function () {
            return f(this, void 0, void 0, function () {
              var t, n, r, i, o, s;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [
                      4,
                      this._withRetries(function (e) {
                        e = Vn(e, !1).getAll();
                        return new xn(e).toPromise();
                      })
                    ];
                  case 1:
                    if (!(t = e.sent())) return [2, []];
                    if (0 !== this.pendingWrites) return [2, []];
                    for (n = [], r = 0, i = t; r < i.length; r++)
                      (s = i[r]),
                        (o = s.fbase_key),
                        (s = s.value),
                        JSON.stringify(this.localCache[o]) !==
                          JSON.stringify(s) &&
                          (this.notifyListeners(o, s), n.push(o));
                    return [2, n];
                }
              });
            });
          }),
          (qn.prototype.notifyListeners = function (e, t) {
            if (this.listeners[e]) {
              this.localCache[e] = t;
              for (
                var n = 0, r = Array.from(this.listeners[e]);
                n < r.length;
                n++
              ) {
                (0, r[n])(t);
              }
            }
          }),
          (qn.prototype.startPolling = function () {
            var e = this;
            this.stopPolling(),
              (this.pollTimer = setInterval(function () {
                return f(e, void 0, void 0, function () {
                  return v(this, function (e) {
                    return [2, this._poll()];
                  });
                });
              }, 800));
          }),
          (qn.prototype.stopPolling = function () {
            this.pollTimer &&
              (clearInterval(this.pollTimer), (this.pollTimer = null));
          }),
          (qn.prototype._addListener = function (e, t) {
            0 === Object.keys(this.listeners).length && this.startPolling(),
              (this.listeners[e] = this.listeners[e] || new Set()),
              this.listeners[e].add(t);
          }),
          (qn.prototype._removeListener = function (e, t) {
            this.listeners[e] &&
              (this.listeners[e].delete(t),
              0 === this.listeners[e].size &&
                (delete this.listeners[e], delete this.localCache[e])),
              0 === Object.keys(this.listeners).length && this.stopPolling();
          }),
          (qn.type = 'LOCAL'),
          qn),
        Bn =
          ((Gn.prototype.registerConsumer = function (e) {
            this.consumers.add(e),
              this.queuedRedirectEvent &&
                this.isEventForConsumer(this.queuedRedirectEvent, e) &&
                (this.sendToConsumer(this.queuedRedirectEvent, e),
                this.saveEventToCache(this.queuedRedirectEvent),
                (this.queuedRedirectEvent = null));
          }),
          (Gn.prototype.unregisterConsumer = function (e) {
            this.consumers.delete(e);
          }),
          (Gn.prototype.onEvent = function (t) {
            var n = this;
            if (this.hasEventBeenHandled(t)) return !1;
            var r = !1;
            return (
              this.consumers.forEach(function (e) {
                n.isEventForConsumer(t, e) &&
                  ((r = !0), n.sendToConsumer(t, e), n.saveEventToCache(t));
              }),
              this.hasHandledPotentialRedirect ||
                !(function (e) {
                  switch (e.type) {
                    case 'signInViaRedirect':
                    case 'linkViaRedirect':
                    case 'reauthViaRedirect':
                      return !0;
                    case 'unknown':
                      return Jn(e);
                    default:
                      return !1;
                  }
                })(t) ||
                ((this.hasHandledPotentialRedirect = !0),
                r || ((this.queuedRedirectEvent = t), (r = !0))),
              r
            );
          }),
          (Gn.prototype.sendToConsumer = function (e, t) {
            var n;
            e.error && !Jn(e)
              ? ((n =
                  (null === (n = e.error.code) || void 0 === n
                    ? void 0
                    : n.split('auth/')[1]) || 'internal-error'),
                t.onError(F(this.auth, n)))
              : t.onAuthEvent(e);
          }),
          (Gn.prototype.isEventForConsumer = function (e, t) {
            var n =
              null === t.eventId || (!!e.eventId && e.eventId === t.eventId);
            return t.filter.includes(e.type) && n;
          }),
          (Gn.prototype.hasEventBeenHandled = function (e) {
            return (
              6e5 <= Date.now() - this.lastProcessedEventTime &&
                this.cachedEventUids.clear(),
              this.cachedEventUids.has(Kn(e))
            );
          }),
          (Gn.prototype.saveEventToCache = function (e) {
            this.cachedEventUids.add(Kn(e)),
              (this.lastProcessedEventTime = Date.now());
          }),
          Gn);
      function Gn(e) {
        (this.auth = e),
          (this.cachedEventUids = new Set()),
          (this.consumers = new Set()),
          (this.queuedRedirectEvent = null),
          (this.hasHandledPotentialRedirect = !1),
          (this.lastProcessedEventTime = Date.now());
      }
      function Kn(e) {
        return [e.type, e.eventId, e.sessionId, e.tenantId]
          .filter(function (e) {
            return e;
          })
          .join('-');
      }
      function Jn(e) {
        var t = e.type,
          e = e.error;
        return (
          'unknown' === t &&
          'auth/no-auth-event' === (null == e ? void 0 : e.code)
        );
      }
      function Yn(e) {
        return '' + (e || '') + Math.floor(1e9 * Math.random());
      }
      var Xn = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
        Zn = /^https?/;
      function $n(o) {
        return f(this, void 0, void 0, function () {
          var t, n, r, i;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return o.config.emulator
                  ? [2]
                  : [
                      4,
                      (function (t) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [2, oe(t, 'GET', '/v1/projects', {})];
                          });
                        });
                      })(o)
                    ];
              case 1:
                for (
                  t = e.sent().authorizedDomains, n = 0, r = t;
                  n < r.length;
                  n++
                ) {
                  i = r[n];
                  try {
                    if (
                      (function (e) {
                        var t = J(),
                          n = new URL(t),
                          r = n.protocol,
                          i = n.hostname;
                        if (e.startsWith('chrome-extension://')) {
                          n = new URL(e);
                          return '' === n.hostname && '' === i
                            ? 'chrome-extension:' === r &&
                                e.replace('chrome-extension://', '') ===
                                  t.replace('chrome-extension://', '')
                            : 'chrome-extension:' === r && n.hostname === i;
                        }
                        if (!Zn.test(r)) return !1;
                        if (Xn.test(e)) return i === e;
                        e = e.replace(/\./g, '\\.');
                        return new RegExp(
                          '^(.+\\.' + e + '|' + e + ')$',
                          'i'
                        ).test(i);
                      })(i)
                    )
                      return [2];
                  } catch (e) {}
                }
                return x(o, 'unauthorized-domain'), [2];
            }
          });
        });
      }
      function Qn(r) {
        return new Promise(function (e, t) {
          var n = document.createElement('script');
          n.setAttribute('src', r),
            (n.onload = e),
            (n.onerror = t),
            (n.type = 'text/javascript'),
            (n.charset = 'UTF-8'),
            (null !==
              (t =
                null === (t = document.getElementsByTagName('head')) ||
                void 0 === t
                  ? void 0
                  : t[0]) && void 0 !== t
              ? t
              : document
            ).appendChild(n);
        });
      }
      function er(e) {
        return '__' + e + Math.floor(1e6 * Math.random());
      }
      var tr = new $(3e4, 6e4);
      function nr() {
        var e = On().___jsl;
        if (null != e && e.H)
          for (var t = 0, n = Object.keys(e.H); t < n.length; t++) {
            var r = n[t];
            if (
              ((e.H[r].r = e.H[r].r || []),
              (e.H[r].L = e.H[r].L || []),
              (e.H[r].r = c(e.H[r].L)),
              e.CP)
            )
              for (var i = 0; i < e.CP.length; i++) e.CP[i] = null;
          }
      }
      var rr = null;
      function ir(e) {
        var i;
        return (rr =
          rr ||
          ((i = e),
          new Promise(function (e, t) {
            function n() {
              nr(),
                gapi.load('gapi.iframes', {
                  callback: function () {
                    e(gapi.iframes.getContext());
                  },
                  ontimeout: function () {
                    nr(), t(F(i, 'network-request-failed'));
                  },
                  timeout: tr.get()
                });
            }
            if (
              null !==
                (r =
                  null === (r = On().gapi) || void 0 === r
                    ? void 0
                    : r.iframes) &&
              void 0 !== r &&
              r.Iframe
            )
              e(gapi.iframes.getContext());
            else {
              if (null === (r = On().gapi) || void 0 === r || !r.load) {
                var r = er('iframefcb');
                return (
                  (On()[r] = function () {
                    gapi.load ? n() : t(F(i, 'network-request-failed'));
                  }),
                  Qn('https://apis.google.com/js/api.js?onload=' + r)
                );
              }
              n();
            }
          }).catch(function (e) {
            throw ((rr = null), e);
          })));
      }
      var or,
        sr = new $(5e3, 15e3),
        ar = '__/auth/iframe',
        ur = 'emulator/auth/iframe',
        cr = {
          style: {
            position: 'absolute',
            top: '-100px',
            width: '1px',
            height: '1px'
          }
        };
      function hr(a) {
        return f(this, void 0, void 0, function () {
          var n,
            r,
            s = this;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, ir(a)];
              case 1:
                return (
                  (n = e.sent()),
                  W((r = On().gapi), a, 'internal-error'),
                  [
                    2,
                    n.open(
                      {
                        where: document.body,
                        url:
                          (W(
                            (e = (t = a).config).authDomain,
                            t,
                            'auth-domain-config-required'
                          ),
                          (e.emulator
                            ? ee(e, ur)
                            : 'https://' + t.config.authDomain + '/' + ar) +
                            '?' +
                            g({
                              apiKey: e.apiKey,
                              appName: t.name,
                              v: li.SDK_VERSION
                            }).slice(1)),
                        messageHandlersFilter:
                          r.iframes.CROSS_ORIGIN_IFRAMES_FILTER,
                        attributes: cr,
                        dontclear: !0
                      },
                      function (o) {
                        return new Promise(function (e, i) {
                          return f(s, void 0, void 0, function () {
                            function t() {
                              On().clearTimeout(r), e(o);
                            }
                            var n, r;
                            return v(this, function (e) {
                              switch (e.label) {
                                case 0:
                                  return [4, o.restyle({ setHideOnLeave: !1 })];
                                case 1:
                                  return (
                                    e.sent(),
                                    (n = F(a, 'network-request-failed')),
                                    (r = On().setTimeout(function () {
                                      i(n);
                                    }, sr.get())),
                                    o.ping(t).then(t, function () {
                                      i(n);
                                    }),
                                    [2]
                                  );
                              }
                            });
                          });
                        });
                      }
                    )
                  ]
                );
            }
            var t;
          });
        });
      }
      function dr() {
        return or.call(this, sessionStorage, 'SESSION') || this;
      }
      var lr =
          (e(dr, (or = Tn)),
          (dr.prototype._addListener = function (e, t) {}),
          (dr.prototype._removeListener = function (e, t) {}),
          (dr.type = 'SESSION'),
          dr),
        fr = {
          location: 'yes',
          resizable: 'yes',
          statusbar: 'yes',
          toolbar: 'no'
        },
        pr =
          ((vr.prototype.close = function () {
            if (this.window)
              try {
                this.window.close();
              } catch (e) {}
          }),
          vr);
      function vr(e) {
        (this.window = e), (this.associatedEvent = null);
      }
      function mr(e, t, n, r, i) {
        void 0 === r && (r = 500), void 0 === i && (i = 600);
        var o = Math.min((window.screen.availHeight - i) / 2, 0).toString(),
          s = Math.min((window.screen.availWidth - r) / 2, 0).toString(),
          a = '',
          o = p(p({}, fr), {
            width: r.toString(),
            height: i.toString(),
            top: o,
            left: s
          }),
          s = h().toLowerCase();
        n && (a = ln(s) ? '_blank' : n),
          hn(s) && ((t = t || 'http://localhost'), (o.scrollbars = 'yes'));
        var u,
          o = Object.entries(o).reduce(function (e, t) {
            return '' + e + t[0] + '=' + t[1] + ',';
          }, '');
        if (
          gn(s) &&
          null !== (u = window.navigator) &&
          void 0 !== u &&
          u.standalone &&
          '_self' !== a
        )
          return (
            (function (e, t) {
              var n = document.createElement('a');
              (n.href = e), (n.target = t);
              t = document.createEvent('MouseEvent');
              t.initMouseEvent(
                'click',
                !0,
                !0,
                window,
                1,
                0,
                0,
                0,
                0,
                !1,
                !1,
                !1,
                !1,
                1,
                null
              ),
                n.dispatchEvent(t);
            })(t || '', a),
            new pr(null)
          );
        var c = window.open(t || '', a, o);
        W(c, e, 'popup-blocked');
        try {
          c.focus();
        } catch (e) {}
        return new pr(c);
      }
      var gr,
        yr =
          (e(Ir, (gr = G)),
          (Ir.prototype._getIdTokenResponse = function (e) {
            return ye(e, this._buildIdpRequest());
          }),
          (Ir.prototype._linkToIdToken = function (e, t) {
            return ye(e, this._buildIdpRequest(t));
          }),
          (Ir.prototype._getReauthenticationResolver = function (e) {
            return ye(e, this._buildIdpRequest());
          }),
          (Ir.prototype._buildIdpRequest = function (e) {
            var t = {
              requestUri: this.params.requestUri,
              sessionId: this.params.sessionId,
              postBody: this.params.postBody || null,
              tenantId: this.params.tenantId,
              pendingToken: this.params.pendingToken,
              returnSecureToken: !0
            };
            return e && (t.idToken = e), t;
          }),
          Ir);
      function Ir(e) {
        var t = gr.call(this, 'custom', 'custom') || this;
        return (t.params = e), t;
      }
      function br(e) {
        return At(e.auth, new yr(e), e.bypassAuthState);
      }
      function _r(e) {
        var t = e.auth,
          n = e.user;
        return W(n, t, 'internal-error'), St(n, new yr(e), e.bypassAuthState);
      }
      function Tr(r) {
        return f(this, void 0, void 0, function () {
          var t, n;
          return v(this, function (e) {
            return (
              (t = r.auth),
              W((n = r.user), t, 'internal-error'),
              [2, Et(n, new yr(r), r.bypassAuthState)]
            );
          });
        });
      }
      var wr =
        ((kr.prototype.execute = function () {
          var e = this;
          return new Promise(function (n, r) {
            return f(e, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    (this.pendingPromise = { resolve: n, reject: r }),
                      (e.label = 1);
                  case 1:
                    return (
                      e.trys.push([1, 4, , 5]),
                      [4, (t = this).resolver._initialize(this.auth)]
                    );
                  case 2:
                    return (t.eventManager = e.sent()), [4, this.onExecution()];
                  case 3:
                    return (
                      e.sent(), this.eventManager.registerConsumer(this), [3, 5]
                    );
                  case 4:
                    return (t = e.sent()), this.reject(t), [3, 5];
                  case 5:
                    return [2];
                }
              });
            });
          });
        }),
        (kr.prototype.onAuthEvent = function (u) {
          return f(this, void 0, void 0, function () {
            var t, n, r, i, o, s, a;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  if (
                    ((t = u.urlResponse),
                    (n = u.sessionId),
                    (s = u.postBody),
                    (r = u.tenantId),
                    (i = u.error),
                    (o = u.type),
                    i)
                  )
                    return this.reject(i), [2];
                  (s = {
                    auth: this.auth,
                    requestUri: t,
                    sessionId: n,
                    tenantId: r || void 0,
                    postBody: s || void 0,
                    user: this.user,
                    bypassAuthState: this.bypassAuthState
                  }),
                    (e.label = 1);
                case 1:
                  return (
                    e.trys.push([1, 3, , 4]),
                    (a = this.resolve),
                    [4, this.getIdpTask(o)(s)]
                  );
                case 2:
                  return a.apply(this, [e.sent()]), [3, 4];
                case 3:
                  return (a = e.sent()), this.reject(a), [3, 4];
                case 4:
                  return [2];
              }
            });
          });
        }),
        (kr.prototype.onError = function (e) {
          this.reject(e);
        }),
        (kr.prototype.getIdpTask = function (e) {
          switch (e) {
            case 'signInViaPopup':
            case 'signInViaRedirect':
              return br;
            case 'linkViaPopup':
            case 'linkViaRedirect':
              return Tr;
            case 'reauthViaPopup':
            case 'reauthViaRedirect':
              return _r;
            default:
              x(this.auth, 'internal-error');
          }
        }),
        (kr.prototype.resolve = function (e) {
          H(this.pendingPromise, 'Pending promise was never set'),
            this.pendingPromise.resolve(e),
            this.unregisterAndCleanUp();
        }),
        (kr.prototype.reject = function (e) {
          H(this.pendingPromise, 'Pending promise was never set'),
            this.pendingPromise.reject(e),
            this.unregisterAndCleanUp();
        }),
        (kr.prototype.unregisterAndCleanUp = function () {
          this.eventManager && this.eventManager.unregisterConsumer(this),
            (this.pendingPromise = null),
            this.cleanUp();
        }),
        kr);
      function kr(e, t, n, r, i) {
        void 0 === i && (i = !1),
          (this.auth = e),
          (this.resolver = n),
          (this.user = r),
          (this.bypassAuthState = i),
          (this.pendingPromise = null),
          (this.eventManager = null),
          (this.filter = Array.isArray(t) ? t : [t]);
      }
      function Er(i, o, s) {
        return (
          void 0 === s && (s = !1),
          f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (n = Dr((t = i), o)), [4, new Pr(t, n, s).execute()];
                case 1:
                  return !(r = e.sent()) || s
                    ? [3, 4]
                    : (delete r.user._redirectEventId,
                      [4, t._persistUserIfCurrent(r.user)]);
                case 2:
                  return e.sent(), [4, t._setRedirectUser(null, o)];
                case 3:
                  e.sent(), (e.label = 4);
                case 4:
                  return [2, r];
              }
            });
          })
        );
      }
      function Rr(n) {
        return f(this, void 0, void 0, function () {
          var t;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return (
                  (t = Yn(n.uid + ':::')),
                  (n._redirectEventId = t),
                  [4, n.auth._setRedirectUser(n)]
                );
              case 1:
                return e.sent(), [4, n.auth._persistUserIfCurrent(n)];
              case 2:
                return e.sent(), [2, t];
            }
          });
        });
      }
      var Sr,
        Ar = new Map(),
        Pr =
          (e(Nr, (Sr = wr)),
          (Nr.prototype.execute = function () {
            return f(this, void 0, void 0, function () {
              var t, n, r;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    if ((t = Ar.get(this.auth._key()))) return [3, 5];
                    e.label = 1;
                  case 1:
                    return (
                      e.trys.push([1, 3, , 4]),
                      [4, Sr.prototype.execute.call(this)]
                    );
                  case 2:
                    return (
                      (n = e.sent()),
                      (t = function () {
                        return Promise.resolve(n);
                      }),
                      [3, 4]
                    );
                  case 3:
                    return (
                      (r = e.sent()),
                      (t = function () {
                        return Promise.reject(r);
                      }),
                      [3, 4]
                    );
                  case 4:
                    Ar.set(this.auth._key(), t), (e.label = 5);
                  case 5:
                    return [2, t()];
                }
              });
            });
          }),
          (Nr.prototype.onAuthEvent = function (n) {
            return f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return 'signInViaRedirect' === n.type
                      ? [2, Sr.prototype.onAuthEvent.call(this, n)]
                      : 'unknown' === n.type
                      ? (this.resolve(null), [2])
                      : n.eventId
                      ? [4, this.auth._redirectUserForId(n.eventId)]
                      : [3, 2];
                  case 1:
                    if ((t = e.sent()))
                      return (
                        (this.user = t),
                        [2, Sr.prototype.onAuthEvent.call(this, n)]
                      );
                    this.resolve(null), (e.label = 2);
                  case 2:
                    return [2];
                }
              });
            });
          }),
          (Nr.prototype.onExecution = function () {
            return f(this, void 0, void 0, function () {
              return v(this, function (e) {
                return [2];
              });
            });
          }),
          (Nr.prototype.cleanUp = function () {}),
          Nr);
      function Nr(e, t, n) {
        void 0 === n && (n = !1);
        n =
          Sr.call(
            this,
            e,
            [
              'signInViaRedirect',
              'linkViaRedirect',
              'reauthViaRedirect',
              'unknown'
            ],
            t,
            void 0,
            n
          ) || this;
        return (n.eventId = null), n;
      }
      var Or = '__/auth/handler',
        Cr = 'emulator/auth/handler',
        Lr = 'webStorageSupport';
      function Dr(e, t) {
        return t
          ? z(t)
          : (W(e._popupRedirectResolver, e, 'argument-error'),
            e._popupRedirectResolver);
      }
      function Mr() {
        (this.eventManagers = {}),
          (this.iframes = {}),
          (this.originValidationPromises = {}),
          (this._redirectPersistence = lr),
          (this._completeRedirectFn = Er);
      }
      var Ur =
        ((Mr.prototype._openPopup = function (n, r, i, o) {
          var s;
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    H(
                      null === (s = this.eventManagers[n._key()]) ||
                        void 0 === s
                        ? void 0
                        : s.manager,
                      '_initialize() not called before _openPopup()'
                    ),
                    [4, this.originValidation(n)]
                  );
                case 1:
                  return e.sent(), (t = xr(n, r, i, o)), [2, mr(n, t, Yn())];
              }
            });
          });
        }),
        (Mr.prototype._openRedirect = function (t, n, r, i) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, this.originValidation(t)];
                case 1:
                  return (
                    e.sent(),
                    (e = xr(t, n, r, i)),
                    (On().location.href = e),
                    [2, new Promise(function () {})]
                  );
              }
            });
          });
        }),
        (Mr.prototype._initialize = function (e) {
          var t = e._key();
          if (this.eventManagers[t]) {
            var n = this.eventManagers[t],
              r = n.manager,
              n = n.promise;
            return r
              ? Promise.resolve(r)
              : (H(n, 'If manager is not set, promise should be'), n);
          }
          e = this.initAndGetManager(e);
          return (this.eventManagers[t] = { promise: e }), e;
        }),
        (Mr.prototype.initAndGetManager = function (r) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, hr(r)];
                case 1:
                  return (
                    (t = e.sent()),
                    (n = new Bn(r)),
                    t.register(
                      'authEvent',
                      function (e) {
                        return (
                          W(
                            null == e ? void 0 : e.authEvent,
                            r,
                            'invalid-auth-event'
                          ),
                          { status: n.onEvent(e.authEvent) ? 'ACK' : 'ERROR' }
                        );
                      },
                      gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER
                    ),
                    (this.eventManagers[r._key()] = { manager: n }),
                    (this.iframes[r._key()] = t),
                    [2, n]
                  );
              }
            });
          });
        }),
        (Mr.prototype._isIframeWebStorageSupported = function (t, n) {
          this.iframes[t._key()].send(
            Lr,
            { type: Lr },
            function (e) {
              e =
                null === (e = null == e ? void 0 : e[0]) || void 0 === e
                  ? void 0
                  : e[Lr];
              void 0 !== e && n(!!e), x(t, 'internal-error');
            },
            gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER
          );
        }),
        (Mr.prototype.originValidation = function (e) {
          var t = e._key();
          return (
            this.originValidationPromises[t] ||
              (this.originValidationPromises[t] = $n(e)),
            this.originValidationPromises[t]
          );
        }),
        Mr);
      function xr(e, t, n, r) {
        W(e.config.authDomain, e, 'auth-domain-config-required'),
          W(e.config.apiKey, e, 'invalid-api-key');
        var i = {
          apiKey: e.config.apiKey,
          appName: e.name,
          authType: n,
          redirectUrl: J(),
          v: li.SDK_VERSION,
          eventId: r
        };
        t instanceof Ce &&
          (t.setDefaultLanguage(e.languageCode),
          (i.providerId = t.providerId || ''),
          (function (e) {
            for (var t in e)
              if (Object.prototype.hasOwnProperty.call(e, t)) return;
            return 1;
          })(t.getCustomParameters()) ||
            (i.customParameters = JSON.stringify(t.getCustomParameters())),
          0 <
            (t = t.getScopes().filter(function (e) {
              return '' !== e;
            })).length && (i.scopes = t.join(','))),
          e.tenantId && (i.tid = e.tenantId);
        for (var o = 0, s = Object.keys(i); o < s.length; o++) {
          var a = s[o];
          void 0 === i[a] && delete i[a];
        }
        return new URL(
          (function (e) {
            e = e.config;
            return e.emulator
              ? ee(e, Cr)
              : 'https://' + e.authDomain + '/' + Or;
          })(e) +
            '?' +
            g(i).slice(1)
        ).toString();
      }
      var Fr =
        ((Vr.prototype.render = function (e, t) {
          var n = this.counter;
          return (
            this._widgets.set(n, new Wr(e, this.auth.name, t || {})),
            this.counter++,
            n
          );
        }),
        (Vr.prototype.reset = function (e) {
          var t = e || 1e12;
          null === (e = this._widgets.get(t)) || void 0 === e || e.delete(),
            this._widgets.delete(t);
        }),
        (Vr.prototype.getResponse = function (e) {
          var e = e || 1e12;
          return (
            (null === (e = this._widgets.get(e)) || void 0 === e
              ? void 0
              : e.getResponse()) || ''
          );
        }),
        (Vr.prototype.execute = function (n) {
          var r;
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              return (
                (t = n || 1e12),
                null === (r = this._widgets.get(t)) ||
                  void 0 === r ||
                  r.execute(),
                [2, '']
              );
            });
          });
        }),
        Vr);
      function Vr(e) {
        (this.auth = e), (this.counter = 1e12), (this._widgets = new Map());
      }
      var Wr =
        ((jr.prototype.getResponse = function () {
          return this.checkIfDeleted(), this.responseToken;
        }),
        (jr.prototype.delete = function () {
          this.checkIfDeleted(),
            (this.deleted = !0),
            this.timerId && (clearTimeout(this.timerId), (this.timerId = null)),
            this.container.removeEventListener('click', this.clickHandler);
        }),
        (jr.prototype.execute = function () {
          var r = this;
          this.checkIfDeleted(),
            this.timerId ||
              (this.timerId = window.setTimeout(function () {
                r.responseToken = (function (e) {
                  for (
                    var t = [],
                      n =
                        '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
                      r = 0;
                    r < e;
                    r++
                  )
                    t.push(n.charAt(Math.floor(Math.random() * n.length)));
                  return t.join('');
                })(50);
                var e = r.params,
                  t = e.callback,
                  n = e['expired-callback'];
                if (t)
                  try {
                    t(r.responseToken);
                  } catch (e) {}
                r.timerId = window.setTimeout(function () {
                  if (((r.timerId = null), (r.responseToken = null), n))
                    try {
                      n();
                    } catch (e) {}
                  r.isVisible && r.execute();
                }, 6e4);
              }, 500));
        }),
        (jr.prototype.checkIfDeleted = function () {
          if (this.deleted)
            throw new Error('reCAPTCHA mock was already deleted!');
        }),
        jr);
      function jr(e, t, n) {
        var r = this;
        (this.params = n),
          (this.timerId = null),
          (this.deleted = !1),
          (this.responseToken = null),
          (this.clickHandler = function () {
            r.execute();
          });
        e = 'string' == typeof e ? document.getElementById(e) : e;
        W(e, 'argument-error', { appName: t }),
          (this.container = e),
          (this.isVisible = 'invisible' !== this.params.size),
          this.isVisible
            ? this.execute()
            : this.container.addEventListener('click', this.clickHandler);
      }
      var Hr = er('rcb'),
        qr = new $(3e4, 6e4),
        zr =
          ((Br.prototype.load = function (o, s) {
            var e,
              a = this;
            return (
              void 0 === s && (s = ''),
              W(
                (e = s).length <= 6 && /^\s*[a-zA-Z0-9\-]*\s*$/.test(e),
                o,
                'argument-error'
              ),
              this.shouldResolveImmediately(s)
                ? Promise.resolve(On().grecaptcha)
                : new Promise(function (t, r) {
                    var i = On().setTimeout(function () {
                      r(F(o, 'network-request-failed'));
                    }, qr.get());
                    (On()[Hr] = function () {
                      On().clearTimeout(i), delete On()[Hr];
                      var n,
                        e = On().grecaptcha;
                      e
                        ? ((n = e.render),
                          (e.render = function (e, t) {
                            t = n(e, t);
                            return a.counter++, t;
                          }),
                          (a.hostLanguage = s),
                          t(e))
                        : r(F(o, 'internal-error'));
                    }),
                      Qn(
                        'https://www.google.com/recaptcha/api.js??' +
                          g({ onload: Hr, render: 'explicit', hl: s })
                      ).catch(function () {
                        clearTimeout(i), r(F(o, 'internal-error'));
                      });
                  })
            );
          }),
          (Br.prototype.clearedOneInstance = function () {
            this.counter--;
          }),
          (Br.prototype.shouldResolveImmediately = function (e) {
            return (
              !!On().grecaptcha &&
              (e === this.hostLanguage ||
                0 < this.counter ||
                this.librarySeparatelyLoaded)
            );
          }),
          Br);
      function Br() {
        (this.hostLanguage = ''),
          (this.counter = 0),
          (this.librarySeparatelyLoaded = !!On().grecaptcha);
      }
      var Gr =
        ((Kr.prototype.load = function (t) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return [2, new Fr(t)];
            });
          });
        }),
        (Kr.prototype.clearedOneInstance = function () {}),
        Kr);
      function Kr() {}
      var Jr = 'recaptcha',
        Yr = { theme: 'light', type: 'image' },
        S =
          ((Xr.prototype.verify = function () {
            return f(this, void 0, void 0, function () {
              var r,
                i,
                t,
                o = this;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return this.assertNotDestroyed(), [4, this.render()];
                  case 1:
                    return (
                      (r = e.sent()),
                      (i = this.getAssertedRecaptcha()),
                      (t = i.getResponse(r))
                        ? [2, t]
                        : [
                            2,
                            new Promise(function (t) {
                              var n = function (e) {
                                e && (o.tokenChangeListeners.delete(n), t(e));
                              };
                              o.tokenChangeListeners.add(n),
                                o.isInvisible && i.execute(r);
                            })
                          ]
                    );
                }
              });
            });
          }),
          (Xr.prototype.render = function () {
            var t = this;
            try {
              this.assertNotDestroyed();
            } catch (e) {
              return Promise.reject(e);
            }
            return (
              this.renderPromise ||
                (this.renderPromise = this.makeRenderPromise().catch(function (
                  e
                ) {
                  throw ((t.renderPromise = null), e);
                })),
              this.renderPromise
            );
          }),
          (Xr.prototype._reset = function () {
            this.assertNotDestroyed(),
              null !== this.widgetId &&
                this.getAssertedRecaptcha().reset(this.widgetId);
          }),
          (Xr.prototype.clear = function () {
            var t = this;
            this.assertNotDestroyed(),
              (this.destroyed = !0),
              this._recaptchaLoader.clearedOneInstance(),
              this.isInvisible ||
                this.container.childNodes.forEach(function (e) {
                  t.container.removeChild(e);
                });
          }),
          (Xr.prototype.validateStartingState = function () {
            W(!this.parameters.sitekey, this.auth, 'argument-error'),
              W(
                this.isInvisible || !this.container.hasChildNodes(),
                this.auth,
                'argument-error'
              );
          }),
          (Xr.prototype.makeTokenCallback = function (n) {
            var r = this;
            return function (t) {
              var e;
              r.tokenChangeListeners.forEach(function (e) {
                return e(t);
              }),
                'function' == typeof n
                  ? n(t)
                  : 'string' != typeof n ||
                    ('function' == typeof (e = On()[n]) && e(t));
            };
          }),
          (Xr.prototype.assertNotDestroyed = function () {
            W(!this.destroyed, this.auth, 'internal-error');
          }),
          (Xr.prototype.makeRenderPromise = function () {
            return f(this, void 0, void 0, function () {
              var t, n;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [4, this.init()];
                  case 1:
                    return (
                      e.sent(),
                      this.widgetId ||
                        ((t = this.container),
                        this.isInvisible ||
                          ((n = document.createElement('div')),
                          t.appendChild(n),
                          (t = n)),
                        (this.widgetId = this.getAssertedRecaptcha().render(
                          t,
                          this.parameters
                        ))),
                      [2, this.widgetId]
                    );
                }
              });
            });
          }),
          (Xr.prototype.init = function () {
            return f(this, void 0, void 0, function () {
              var n;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      W(Y() && !Cn(), this.auth, 'internal-error'),
                      [
                        4,
                        ((t = null),
                        new Promise(function (e) {
                          'complete' !== document.readyState
                            ? ((t = function () {
                                return e();
                              }),
                              window.addEventListener('load', t))
                            : e();
                        }).catch(function (e) {
                          throw (t && window.removeEventListener('load', t), e);
                        }))
                      ]
                    );
                  case 1:
                    return (
                      e.sent(),
                      [
                        4,
                        (n = this)._recaptchaLoader.load(
                          this.auth,
                          this.auth.languageCode || void 0
                        )
                      ]
                    );
                  case 2:
                    return (
                      (n.recaptcha = e.sent()),
                      [
                        4,
                        (function (t) {
                          return f(this, void 0, void 0, function () {
                            return v(this, function (e) {
                              switch (e.label) {
                                case 0:
                                  return [
                                    4,
                                    oe(t, 'GET', '/v1/recaptchaParams')
                                  ];
                                case 1:
                                  return [2, e.sent().recaptchaSiteKey || ''];
                              }
                            });
                          });
                        })(this.auth)
                      ]
                    );
                  case 3:
                    return (
                      W((n = e.sent()), this.auth, 'internal-error'),
                      (this.parameters.sitekey = n),
                      [2]
                    );
                }
                var t;
              });
            });
          }),
          (Xr.prototype.getAssertedRecaptcha = function () {
            return (
              W(this.recaptcha, this.auth, 'internal-error'), this.recaptcha
            );
          }),
          Xr);
      function Xr(e, t, n) {
        void 0 === t && (t = p({}, Yr)),
          (this.parameters = t),
          (this.type = Jr),
          (this.destroyed = !1),
          (this.widgetId = null),
          (this.tokenChangeListeners = new Set()),
          (this.renderPromise = null),
          (this.recaptcha = null),
          (this.auth = n),
          (this.isInvisible = 'invisible' === this.parameters.size),
          W(
            'undefined' != typeof document,
            this.auth,
            'operation-not-supported-in-this-environment'
          );
        e = 'string' == typeof e ? document.getElementById(e) : e;
        W(e, this.auth, 'argument-error'),
          (this.container = e),
          (this.parameters.callback = this.makeTokenCallback(
            this.parameters.callback
          )),
          (this._recaptchaLoader = new (
            this.auth.settings.appVerificationDisabledForTesting ? Gr : zr
          )()),
          this.validateStartingState();
      }
      var Zr =
        (($r.prototype.confirm = function (e) {
          e = ke._fromVerification(this.verificationId, e);
          return this.onConfirmation(e);
        }),
        $r);
      function $r(e, t) {
        (this.verificationId = e), (this.onConfirmation = t);
      }
      function Qr(a, u, c) {
        var h;
        return f(this, void 0, void 0, function () {
          var r, i, o, s;
          return v(this, function (e) {
            switch (e.label) {
              case 0:
                return [4, c.verify()];
              case 1:
                (r = e.sent()), (e.label = 2);
              case 2:
                return (e.trys.push([2, , 10, 11]),
                W('string' == typeof r, a, 'argument-error'),
                W(c.type === Jr, a, 'argument-error'),
                (i = void 0),
                'session' in
                  (i = 'string' == typeof u ? { phoneNumber: u } : u))
                  ? ((o = i.session),
                    'phoneNumber' in i
                      ? (W('enroll' === o.type, a, 'internal-error'),
                        [
                          4,
                          ((t = a),
                          (n = {
                            idToken: o.credential,
                            phoneEnrollmentInfo: {
                              phoneNumber: i.phoneNumber,
                              recaptchaToken: r
                            }
                          }),
                          oe(
                            t,
                            'POST',
                            '/v2/accounts/mfaEnrollment:start',
                            p({ tenantId: t.tenantId }, n)
                          ))
                        ])
                      : [3, 4])
                  : [3, 7];
              case 3:
                return [2, e.sent().phoneSessionInfo.sessionInfo];
              case 4:
                return (
                  W('signin' === o.type, a, 'internal-error'),
                  W(
                    (s =
                      (null === (h = i.multiFactorHint) || void 0 === h
                        ? void 0
                        : h.uid) || i.multiFactorUid),
                    a,
                    'missing-multi-factor-info'
                  ),
                  [
                    4,
                    ((t = a),
                    (n = {
                      mfaPendingCredential: o.credential,
                      mfaEnrollmentId: s,
                      phoneSignInInfo: { recaptchaToken: r }
                    }),
                    oe(
                      t,
                      'POST',
                      '/v2/accounts/mfaSignIn:start',
                      p({ tenantId: t.tenantId }, n)
                    ))
                  ]
                );
              case 5:
                return [2, e.sent().phoneResponseInfo.sessionInfo];
              case 6:
                return [3, 9];
              case 7:
                return [
                  4,
                  (function (t, n) {
                    return f(this, void 0, void 0, function () {
                      return v(this, function (e) {
                        return [
                          2,
                          oe(t, 'POST', '/v1/accounts:sendVerificationCode', n)
                        ];
                      });
                    });
                  })(a, { phoneNumber: i.phoneNumber, recaptchaToken: r })
                ];
              case 8:
                return [2, e.sent().sessionInfo];
              case 9:
                return [3, 11];
              case 10:
                return c._reset(), [7];
              case 11:
                return [2];
            }
            var t, n;
          });
        });
      }
      (ei.prototype.verifyPhoneNumber = function (e, t) {
        return Qr(this.auth, e, t);
      }),
        (ei.credential = function (e, t) {
          return ke._fromVerification(e, t);
        }),
        (ei.credentialFromResult = function (e) {
          var t = e;
          W(t._tokenResponse, t.user.auth, 'argument-error');
          var n = t._tokenResponse,
            e = n.phoneNumber,
            n = n.temporaryProof;
          if (e && n) return ke._fromTokenResponse(e, n);
          x(t.user.auth, 'argument-error');
        }),
        (ei.PROVIDER_ID = 'phone'),
        (ei.PHONE_SIGN_IN_METHOD = 'phone'),
        (Tn = ei);
      function ei(e) {
        (this.providerId = ei.PROVIDER_ID), (this.auth = e);
      }
      var ti = new $(2e3, 1e4);
      var ni,
        ri =
          (e(ii, (ni = wr)),
          (ii.prototype.executeNotNull = function () {
            return f(this, void 0, void 0, function () {
              var t;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return [4, this.execute()];
                  case 1:
                    return (
                      W((t = e.sent()), this.auth, 'internal-error'), [2, t]
                    );
                }
              });
            });
          }),
          (ii.prototype.onExecution = function () {
            return f(this, void 0, void 0, function () {
              var t,
                n,
                r = this;
              return v(this, function (e) {
                switch (e.label) {
                  case 0:
                    return (
                      H(
                        1 === this.filter.length,
                        'Popup operations only handle one event'
                      ),
                      (t = Yn()),
                      [
                        4,
                        (n = this).resolver._openPopup(
                          this.auth,
                          this.provider,
                          this.filter[0],
                          t
                        )
                      ]
                    );
                  case 1:
                    return (
                      (n.authWindow = e.sent()),
                      (this.authWindow.associatedEvent = t),
                      this.resolver._isIframeWebStorageSupported(
                        this.auth,
                        function (e) {
                          e || r.reject(F(r.auth, 'web-storage-unsupported'));
                        }
                      ),
                      this.pollUserCancellation(),
                      [2]
                    );
                }
              });
            });
          }),
          Object.defineProperty(ii.prototype, 'eventId', {
            get: function () {
              var e;
              return (
                (null === (e = this.authWindow) || void 0 === e
                  ? void 0
                  : e.associatedEvent) || null
              );
            },
            enumerable: !1,
            configurable: !0
          }),
          (ii.prototype.cancel = function () {
            this.reject(F(this.auth, 'cancelled-popup-request'));
          }),
          (ii.prototype.cleanUp = function () {
            this.authWindow && this.authWindow.close(),
              this.pollId && window.clearTimeout(this.pollId),
              (this.authWindow = null),
              (this.pollId = null),
              (ii.currentPopupAction = null);
          }),
          (ii.prototype.pollUserCancellation = function () {
            var t = this,
              n = function () {
                var e;
                null !==
                  (e =
                    null === (e = t.authWindow) || void 0 === e
                      ? void 0
                      : e.window) &&
                void 0 !== e &&
                e.closed
                  ? (t.pollId = window.setTimeout(function () {
                      (t.pollId = null),
                        t.reject(F(t.auth, 'popup-closed-by-user'));
                    }, 2e3))
                  : (t.pollId = window.setTimeout(n, ti.get()));
              };
            n();
          }),
          (ii.currentPopupAction = null),
          ii);
      function ii(e, t, n, r, i) {
        i = ni.call(this, e, t, r, i) || this;
        return (
          (i.provider = n),
          (i.authWindow = null),
          (i.pollId = null),
          ii.currentPopupAction && ii.currentPopupAction.cancel(),
          (ii.currentPopupAction = i)
        );
      }
      (oi.prototype._process = function (e, t, n) {
        switch (t.type) {
          case 'enroll':
            return this._finalizeEnroll(e, t.credential, n);
          case 'signin':
            return this._finalizeSignIn(e, t.credential);
          default:
            return j('unexpected MultiFactorSessionType');
        }
      }),
        (wr = oi);
      function oi(e) {
        this.factorId = e;
      }
      var si,
        ai =
          (e(ui, (si = wr)),
          (ui._fromCredential = function (e) {
            return new ui(e);
          }),
          (ui.prototype._finalizeEnroll = function (e, t, n) {
            return (
              (e = e),
              (n = {
                idToken: t,
                displayName: n,
                phoneVerificationInfo:
                  this.credential._makeVerificationRequest()
              }),
              oe(
                e,
                'POST',
                '/v2/accounts/mfaEnrollment:finalize',
                p({ tenantId: e.tenantId }, n)
              )
            );
          }),
          (ui.prototype._finalizeSignIn = function (e, t) {
            return (
              (e = e),
              (t = {
                mfaPendingCredential: t,
                phoneVerificationInfo:
                  this.credential._makeVerificationRequest()
              }),
              oe(
                e,
                'POST',
                '/v2/accounts/mfaSignIn:finalize',
                p({ tenantId: e.tenantId }, t)
              )
            );
          }),
          ui);
      function ui(e) {
        var t = si.call(this, 'phone') || this;
        return (t.credential = e), t;
      }
      var ci,
        wr =
          ((hi.assertion = function (e) {
            return ai._fromCredential(e);
          }),
          hi);
      function hi() {}
      (ci = 'Browser'),
        li._registerComponent(
          new P(
            'auth-exp',
            function (e) {
              var t = e.getProvider('app-exp').getImmediate(),
                e = t.options,
                n = e.apiKey,
                r = e.authDomain;
              return (function (e) {
                W(n, 'invalid-api-key', { appName: e.name });
                var t = {
                  apiKey: n,
                  authDomain: r,
                  apiHost: 'identitytoolkit.googleapis.com',
                  tokenApiHost: 'securetoken.googleapis.com',
                  apiScheme: 'https',
                  sdkClientVersion: (function (e) {
                    var t;
                    switch (e) {
                      case 'Browser':
                        t = cn(h());
                        break;
                      case 'Worker':
                        t = cn(h()) + '-' + e;
                        break;
                      default:
                        t = e;
                    }
                    return (
                      t + '/JsCore/' + li.SDK_VERSION + '/FirebaseCore-web'
                    );
                  })(ci)
                };
                return new mt(e, t);
              })(t);
            },
            'PUBLIC'
          )
        ),
        li._registerComponent(
          new P(
            'auth-internal',
            function (e) {
              e = e.getProvider('auth-exp').getImmediate();
              return new In(e);
            },
            'PRIVATE'
          )
        ),
        li.registerVersion(
          'auth-exp',
          '0.0.900',
          (function (e) {
            switch (e) {
              case 'Node':
                return 'node';
              case 'ReactNative':
                return 'rn';
              case 'Worker':
                return 'webworker';
              default:
                return;
            }
          })(ci)
        ),
        (di.ActionCodeURL = Ae),
        (di.AuthCredential = G),
        (di.EmailAuthCredential = me),
        (di.EmailAuthProvider = Ne),
        (di.FacebookAuthProvider = Me),
        (di.GithubAuthProvider = je),
        (di.GoogleAuthProvider = Fe),
        (di.OAuthCredential = be),
        (di.OAuthProvider = Ce),
        (di.PhoneAuthCredential = ke),
        (di.PhoneAuthProvider = Tn),
        (di.PhoneMultiFactorGenerator = wr),
        (di.RecaptchaVerifier = S),
        (di.TwitterAuthProvider = ze),
        (di.applyActionCode = function (t, n) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [
                    4,
                    (function (t, n) {
                      return f(this, void 0, void 0, function () {
                        return v(this, function (e) {
                          return [2, oe(t, 'POST', '/v1/accounts:update', n)];
                        });
                      });
                    })(t, { oobCode: n })
                  ];
                case 1:
                  return e.sent(), [2];
              }
            });
          });
        }),
        (di.browserLocalPersistence = Rn),
        (di.browserPopupRedirectResolver = Ur),
        (di.browserSessionPersistence = lr),
        (di.checkActionCode = Ft),
        (di.confirmPasswordReset = function (t, n, r) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, le(t, { oobCode: n, newPassword: r })];
                case 1:
                  return e.sent(), [2];
              }
            });
          });
        }),
        (di.createUserWithEmailAndPassword = function (i, o, s) {
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [
                    4,
                    Ge((t = i), {
                      returnSecureToken: !0,
                      email: o,
                      password: s
                    })
                  ];
                case 1:
                  return (
                    (n = e.sent()), [4, ht._fromIdTokenResponse(t, 'signIn', n)]
                  );
                case 2:
                  return (r = e.sent()), [4, t._updateCurrentUser(r.user)];
                case 3:
                  return e.sent(), [2, r];
              }
            });
          });
        }),
        (di.debugErrorMap = C),
        (di.deleteUser = function (t) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              return [2, t.delete()];
            });
          });
        }),
        (di.fetchSignInMethodsForEmail = function (n, r) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    (t = Y() ? J() : 'http://localhost'),
                    [
                      4,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [
                              2,
                              oe(t, 'POST', '/v1/accounts:createAuthUri', n)
                            ];
                          });
                        });
                      })(n, { identifier: r, continueUri: t })
                    ]
                  );
                case 1:
                  return [2, e.sent().signinMethods || []];
              }
            });
          });
        }),
        (di.getAdditionalUserInfo = function (e) {
          var t = e.user,
            e = e._tokenResponse;
          return t.isAnonymous && !e
            ? { providerId: null, isNewUser: !1, profile: null }
            : (function (e) {
                if (!e) return null;
                var t = e.providerId,
                  n = e.rawUserInfo ? JSON.parse(e.rawUserInfo) : {},
                  r =
                    e.isNewUser ||
                    'identitytoolkit#SignupNewUserResponse' === e.kind;
                if (!t && null != e && e.idToken) {
                  var i =
                    null ===
                      (i =
                        null === (i = Ze(e.idToken)) || void 0 === i
                          ? void 0
                          : i.firebase) || void 0 === i
                      ? void 0
                      : i.sign_in_provider;
                  if (i)
                    return new jt(
                      r,
                      'anonymous' !== i && 'custom' !== i ? i : null
                    );
                }
                if (!t) return null;
                switch (t) {
                  case 'facebook.com':
                    return new zt(r, n);
                  case 'github.com':
                    return new Kt(r, n);
                  case 'google.com':
                    return new Xt(r, n);
                  case 'twitter.com':
                    return new Qt(r, n, e.screenName || null);
                  case 'custom':
                  case 'anonymous':
                    return new jt(r, null);
                  default:
                    return new jt(r, t, n);
                }
              })(e);
        }),
        (di.getAuth = function (e) {
          return B(e, { popupRedirectResolver: Ur, persistence: [zn, Rn] });
        }),
        (di.getIdToken = function (e, t) {
          return void 0 === t && (t = !1), e.getIdToken(t);
        }),
        (di.getIdTokenResult = Ye),
        (di.getMultiFactorResolver = function (e, t) {
          var n = t;
          return (
            W(t.operationType, e, 'argument-error'),
            W(
              null === (t = n.serverResponse) || void 0 === t
                ? void 0
                : t.mfaPendingCredential,
              e,
              'argument-error'
            ),
            rn._fromError(e, n)
          );
        }),
        (di.getRedirectResult = function (t, n) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, t._initializationPromise];
                case 1:
                  return e.sent(), [2, Er(t, n, !1)];
              }
            });
          });
        }),
        (di.inMemoryPersistence = Se),
        (di.indexedDBLocalPersistence = zn),
        (di.initializeAuth = B),
        (di.isSignInWithEmailLink = function (e, t) {
          return (
            'EMAIL_SIGNIN' ===
            (null == (t = Ae.parseLink(t)) ? void 0 : t.operation)
          );
        }),
        (di.linkWithCredential = Nt),
        (di.linkWithPhoneNumber = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, Rt(!1, (t = n), 'phone')];
                case 1:
                  return e.sent(), [4, Qr(t.auth, r, i)];
                case 2:
                  return (
                    (t = e.sent()),
                    [
                      2,
                      new Zr(t, function (e) {
                        return Nt(n, e);
                      })
                    ]
                  );
              }
            });
          });
        }),
        (di.linkWithPopup = function (r, i, o) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              return (
                W(i instanceof Ce, (t = r).auth, 'argument-error'),
                (n = Dr(t.auth, o)),
                [2, new ri(t.auth, 'linkViaPopup', i, n, t).executeNotNull()]
              );
            });
          });
        }),
        (di.linkWithRedirect = function (i, o, s) {
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    W(o instanceof Ce, (t = i).auth, 'argument-error'),
                    (n = Dr(t.auth, s)),
                    [4, Rt(!1, t, o.providerId)]
                  );
                case 1:
                  return e.sent(), [4, Rr(t)];
                case 2:
                  return (
                    (r = e.sent()),
                    [2, n._openRedirect(t.auth, o, 'linkViaRedirect', r)]
                  );
              }
            });
          });
        }),
        (di.multiFactor = function (e) {
          return un.has(e) || un.set(e, sn._fromUser(e)), un.get(e);
        }),
        (di.onAuthStateChanged = function (e, t, n, r) {
          return e.onAuthStateChanged(t, n, r);
        }),
        (di.onIdTokenChanged = function (e, t, n, r) {
          return e.onIdTokenChanged(t, n, r);
        }),
        (di.parseActionCodeURL = function (e) {
          return Ae.parseLink(e);
        }),
        (di.prodErrorMap = L),
        (di.reauthenticateWithCredential = Ot),
        (di.reauthenticateWithPhoneNumber = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, Qr(n.auth, r, i)];
                case 1:
                  return (
                    (t = e.sent()),
                    [
                      2,
                      new Zr(t, function (e) {
                        return Ot(n, e);
                      })
                    ]
                  );
              }
            });
          });
        }),
        (di.reauthenticateWithPopup = function (r, i, o) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              return (
                W(i instanceof Ce, (t = r).auth, 'argument-error'),
                (n = Dr(t.auth, o)),
                [2, new ri(t.auth, 'reauthViaPopup', i, n, t).executeNotNull()]
              );
            });
          });
        }),
        (di.reauthenticateWithRedirect = function (i, o, s) {
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    W(o instanceof Ce, (t = i).auth, 'argument-error'),
                    (n = Dr(t.auth, s)),
                    [4, Rr(t)]
                  );
                case 1:
                  return (
                    (r = e.sent()),
                    [2, n._openRedirect(t.auth, o, 'reauthViaRedirect', r)]
                  );
              }
            });
          });
        }),
        (di.reload = it),
        (di.sendEmailVerification = function (r, i) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, (t = r).getIdToken()];
                case 1:
                  return (
                    (n = e.sent()),
                    (n = { requestType: 'VERIFY_EMAIL', idToken: n }),
                    i && xt(t.auth, n, i),
                    [
                      4,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [2, pe(t, n)];
                          });
                        });
                      })(t.auth, n)
                    ]
                  );
                case 2:
                  return e.sent().email === r.email ? [3, 4] : [4, r.reload()];
                case 3:
                  e.sent(), (e.label = 4);
                case 4:
                  return [2];
              }
            });
          });
        }),
        (di.sendPasswordResetEmail = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    (t = { requestType: 'PASSWORD_RESET', email: r }),
                    i && xt(n, t, i),
                    [
                      4,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [2, pe(t, n)];
                          });
                        });
                      })(n, t)
                    ]
                  );
                case 1:
                  return e.sent(), [2];
              }
            });
          });
        }),
        (di.sendSignInLinkToEmail = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return (
                    (t = { requestType: 'EMAIL_SIGNIN', email: r }),
                    W(
                      null == i ? void 0 : i.handleCodeInApp,
                      n,
                      'argument-error'
                    ),
                    i && xt(n, t, i),
                    [
                      4,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [2, pe(t, n)];
                          });
                        });
                      })(n, t)
                    ]
                  );
                case 1:
                  return e.sent(), [2];
              }
            });
          });
        }),
        (di.setPersistence = function (e, t) {
          return e.setPersistence(t);
        }),
        (di.signInAnonymously = function (i) {
          var o;
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return null !== (o = (t = i).currentUser) &&
                    void 0 !== o &&
                    o.isAnonymous
                    ? [
                        2,
                        new ht({
                          user: t.currentUser,
                          providerId: null,
                          operationType: 'signIn'
                        })
                      ]
                    : [4, Ge(t, { returnSecureToken: !0 })];
                case 1:
                  return (
                    (n = e.sent()),
                    [4, ht._fromIdTokenResponse(t, 'signIn', n, !0)]
                  );
                case 2:
                  return (r = e.sent()), [4, t._updateCurrentUser(r.user)];
                case 3:
                  return e.sent(), [2, r];
              }
            });
          });
        }),
        (di.signInWithCredential = Pt),
        (di.signInWithCustomToken = function (i, o) {
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [
                    4,
                    (function (t, n) {
                      return f(this, void 0, void 0, function () {
                        return v(this, function (e) {
                          return [
                            2,
                            ae(
                              t,
                              'POST',
                              '/v1/accounts:signInWithCustomToken',
                              n
                            )
                          ];
                        });
                      });
                    })(i, { token: o, returnSecureToken: !0 })
                  ];
                case 1:
                  return (
                    (t = e.sent()),
                    (n = i),
                    [4, ht._fromIdTokenResponse(n, 'signIn', t)]
                  );
                case 2:
                  return (r = e.sent()), [4, n._updateCurrentUser(r.user)];
                case 3:
                  return e.sent(), [2, r];
              }
            });
          });
        }),
        (di.signInWithEmailAndPassword = function (e, t, n) {
          return Pt(e, Ne.credential(t, n));
        }),
        (di.signInWithEmailLink = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              return (
                W(
                  (t = Ne.credentialWithLink(r, i || J())).tenantId ===
                    (n.tenantId || null),
                  n,
                  'tenant-id-mismatch'
                ),
                [2, Pt(n, t)]
              );
            });
          });
        }),
        (di.signInWithPhoneNumber = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, Qr(n, r, i)];
                case 1:
                  return (
                    (t = e.sent()),
                    [
                      2,
                      new Zr(t, function (e) {
                        return Pt(n, e);
                      })
                    ]
                  );
              }
            });
          });
        }),
        (di.signInWithPopup = function (r, i, o) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              return (
                W(i instanceof Ce, (t = r), 'argument-error'),
                (n = Dr(t, o)),
                [2, new ri(t, 'signInViaPopup', i, n).executeNotNull()]
              );
            });
          });
        }),
        (di.signInWithRedirect = function (n, r, i) {
          return f(this, void 0, void 0, function () {
            var t;
            return v(this, function (e) {
              return (
                W(r instanceof Ce, (t = n), 'argument-error'),
                [2, Dr(t, i)._openRedirect(t, r, 'signInViaRedirect')]
              );
            });
          });
        }),
        (di.signOut = function (e) {
          return e.signOut();
        }),
        (di.unlink = function (s, a) {
          return f(this, void 0, void 0, function () {
            var t, n, r, i, o;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, Rt(!0, (t = s), a)];
                case 1:
                  return (
                    e.sent(),
                    (n = Ke),
                    (r = [t.auth]),
                    (o = {}),
                    [4, s.getIdToken()]
                  );
                case 2:
                  return [
                    4,
                    n.apply(
                      void 0,
                      r.concat([
                        ((o.idToken = e.sent()), (o.deleteProvider = [a]), o)
                      ])
                    )
                  ];
                case 3:
                  return (
                    (o = e.sent().providerUserInfo),
                    (i = kt(o || [])),
                    (t.providerData = s.providerData.filter(function (e) {
                      return i.has(e.providerId);
                    })),
                    i.has('phone') || (t.phoneNumber = null),
                    [4, t.auth._persistUserIfCurrent(t)]
                  );
                case 4:
                  return e.sent(), [2, s];
              }
            });
          });
        }),
        (di.updateCurrentUser = function (e, t) {
          return e.updateCurrentUser(t);
        }),
        (di.updateEmail = function (e, t) {
          return Vt(e, t, null);
        }),
        (di.updatePassword = function (e, t) {
          return Vt(e, null, t);
        }),
        (di.updatePhoneNumber = function (t, n) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, Et(t, n)];
                case 1:
                  return e.sent(), [2];
              }
            });
          });
        }),
        (di.updateProfile = function (i, e) {
          var o = e.displayName,
            s = e.photoURL;
          return f(this, void 0, void 0, function () {
            var t, n, r;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return void 0 === o && void 0 === s
                    ? [2]
                    : [4, (t = i).getIdToken()];
                case 1:
                  return (
                    (n = e.sent()),
                    (r = {
                      idToken: n,
                      displayName: o,
                      photoUrl: s,
                      returnSecureToken: !0
                    }),
                    [
                      4,
                      $e(
                        t,
                        (function (t, n) {
                          return f(this, void 0, void 0, function () {
                            return v(this, function (e) {
                              return [
                                2,
                                oe(t, 'POST', '/v1/accounts:update', n)
                              ];
                            });
                          });
                        })(t.auth, r)
                      )
                    ]
                  );
                case 2:
                  return (
                    (n = e.sent()),
                    (t.displayName = n.displayName || null),
                    (t.photoURL = n.photoUrl || null),
                    (r = t.providerData.find(function (e) {
                      return 'password' === e.providerId;
                    })) &&
                      ((r.displayName = i.displayName),
                      (r.photoURL = i.photoURL)),
                    [4, t._updateTokensIfNecessary(n)]
                  );
                case 3:
                  return e.sent(), [2];
              }
            });
          });
        }),
        (di.useDeviceLanguage = function (e) {
          e.useDeviceLanguage();
        }),
        (di.verifyBeforeUpdateEmail = function (r, i, o) {
          return f(this, void 0, void 0, function () {
            var t, n;
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, (t = r).getIdToken()];
                case 1:
                  return (
                    (n = e.sent()),
                    (n = {
                      requestType: 'VERIFY_AND_CHANGE_EMAIL',
                      idToken: n,
                      newEmail: i
                    }),
                    o && xt(t.auth, n, o),
                    [
                      4,
                      (function (t, n) {
                        return f(this, void 0, void 0, function () {
                          return v(this, function (e) {
                            return [2, pe(t, n)];
                          });
                        });
                      })(t.auth, n)
                    ]
                  );
                case 2:
                  return e.sent().email === r.email ? [3, 4] : [4, r.reload()];
                case 3:
                  e.sent(), (e.label = 4);
                case 4:
                  return [2];
              }
            });
          });
        }),
        (di.verifyPasswordResetCode = function (t, n) {
          return f(this, void 0, void 0, function () {
            return v(this, function (e) {
              switch (e.label) {
                case 0:
                  return [4, Ft(t, n)];
                case 1:
                  return [2, e.sent().data.email];
              }
            });
          });
        }),
        Object.defineProperty(di, '__esModule', { value: !0 });
    }.apply(this, arguments));
  } catch (e) {
    throw (
      (console.error(e),
      new Error(
        'Cannot instantiate firebase-auth.js - be sure to load firebase-app.js first.'
      ))
    );
  }
});
//# sourceMappingURL=firebase-auth.js.map
