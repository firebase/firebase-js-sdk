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
    ? (module.exports = e())
    : 'function' == typeof define && define.amd
    ? define(e)
    : ((t =
        'undefined' != typeof globalThis ? globalThis : t || self).firebase =
        e());
})(this, function () {
  'use strict';
  function n(t) {
    if (
      ('string' != typeof t && (t = String(t)),
      /[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(t))
    )
      throw new TypeError('Invalid character in header field name');
    return t.toLowerCase();
  }
  function o(t) {
    return 'string' != typeof t && (t = String(t)), t;
  }
  function t(e) {
    var t = {
      next: function () {
        var t = e.shift();
        return { done: void 0 === t, value: t };
      }
    };
    return (
      h &&
        (t[Symbol.iterator] = function () {
          return t;
        }),
      t
    );
  }
  function a(e) {
    (this.map = {}),
      e instanceof a
        ? e.forEach(function (t, e) {
            this.append(e, t);
          }, this)
        : Array.isArray(e)
        ? e.forEach(function (t) {
            this.append(t[0], t[1]);
          }, this)
        : e &&
          Object.getOwnPropertyNames(e).forEach(function (t) {
            this.append(t, e[t]);
          }, this);
  }
  function i(t) {
    if (t.bodyUsed) return Promise.reject(new TypeError('Already read'));
    t.bodyUsed = !0;
  }
  function s(r) {
    return new Promise(function (t, e) {
      (r.onload = function () {
        t(r.result);
      }),
        (r.onerror = function () {
          e(r.error);
        });
    });
  }
  function e(t) {
    var e = new FileReader(),
      r = s(e);
    return e.readAsArrayBuffer(t), r;
  }
  function r(t) {
    if (t.slice) return t.slice(0);
    var e = new Uint8Array(t.byteLength);
    return e.set(new Uint8Array(t)), e.buffer;
  }
  function u() {
    return (
      (this.bodyUsed = !1),
      (this._initBody = function (t) {
        if ((this._bodyInit = t))
          if ('string' == typeof t) this._bodyText = t;
          else if (d && Blob.prototype.isPrototypeOf(t)) this._bodyBlob = t;
          else if (v && FormData.prototype.isPrototypeOf(t))
            this._bodyFormData = t;
          else if (p && URLSearchParams.prototype.isPrototypeOf(t))
            this._bodyText = t.toString();
          else if (y && d && m(t))
            (this._bodyArrayBuffer = r(t.buffer)),
              (this._bodyInit = new Blob([this._bodyArrayBuffer]));
          else {
            if (!y || (!ArrayBuffer.prototype.isPrototypeOf(t) && !b(t)))
              throw new Error('unsupported BodyInit type');
            this._bodyArrayBuffer = r(t);
          }
        else this._bodyText = '';
        this.headers.get('content-type') ||
          ('string' == typeof t
            ? this.headers.set('content-type', 'text/plain;charset=UTF-8')
            : this._bodyBlob && this._bodyBlob.type
            ? this.headers.set('content-type', this._bodyBlob.type)
            : p &&
              URLSearchParams.prototype.isPrototypeOf(t) &&
              this.headers.set(
                'content-type',
                'application/x-www-form-urlencoded;charset=UTF-8'
              ));
      }),
      d &&
        ((this.blob = function () {
          var t = i(this);
          if (t) return t;
          if (this._bodyBlob) return Promise.resolve(this._bodyBlob);
          if (this._bodyArrayBuffer)
            return Promise.resolve(new Blob([this._bodyArrayBuffer]));
          if (this._bodyFormData)
            throw new Error('could not read FormData body as blob');
          return Promise.resolve(new Blob([this._bodyText]));
        }),
        (this.arrayBuffer = function () {
          return this._bodyArrayBuffer
            ? i(this) || Promise.resolve(this._bodyArrayBuffer)
            : this.blob().then(e);
        })),
      (this.text = function () {
        var t,
          e,
          r = i(this);
        if (r) return r;
        if (this._bodyBlob)
          return (
            (t = this._bodyBlob),
            (e = new FileReader()),
            (r = s(e)),
            e.readAsText(t),
            r
          );
        if (this._bodyArrayBuffer)
          return Promise.resolve(
            (function (t) {
              for (
                var e = new Uint8Array(t), r = new Array(e.length), n = 0;
                n < e.length;
                n++
              )
                r[n] = String.fromCharCode(e[n]);
              return r.join('');
            })(this._bodyArrayBuffer)
          );
        if (this._bodyFormData)
          throw new Error('could not read FormData body as text');
        return Promise.resolve(this._bodyText);
      }),
      v &&
        (this.formData = function () {
          return this.text().then(f);
        }),
      (this.json = function () {
        return this.text().then(JSON.parse);
      }),
      this
    );
  }
  function c(t, e) {
    var r,
      n = (e = e || {}).body;
    if (t instanceof c) {
      if (t.bodyUsed) throw new TypeError('Already read');
      (this.url = t.url),
        (this.credentials = t.credentials),
        e.headers || (this.headers = new a(t.headers)),
        (this.method = t.method),
        (this.mode = t.mode),
        n || null == t._bodyInit || ((n = t._bodyInit), (t.bodyUsed = !0));
    } else this.url = String(t);
    if (
      ((this.credentials = e.credentials || this.credentials || 'omit'),
      (!e.headers && this.headers) || (this.headers = new a(e.headers)),
      (this.method =
        ((r = e.method || this.method || 'GET'),
        (t = r.toUpperCase()),
        -1 < w.indexOf(t) ? t : r)),
      (this.mode = e.mode || this.mode || null),
      (this.referrer = null),
      ('GET' === this.method || 'HEAD' === this.method) && n)
    )
      throw new TypeError('Body not allowed for GET or HEAD requests');
    this._initBody(n);
  }
  function f(t) {
    var r = new FormData();
    return (
      t
        .trim()
        .split('&')
        .forEach(function (t) {
          var e;
          t &&
            ((t = (e = t.split('=')).shift().replace(/\+/g, ' ')),
            (e = e.join('=').replace(/\+/g, ' ')),
            r.append(decodeURIComponent(t), decodeURIComponent(e)));
        }),
      r
    );
  }
  function l(t, e) {
    (e = e || {}),
      (this.type = 'default'),
      (this.status = void 0 === e.status ? 200 : e.status),
      (this.ok = 200 <= this.status && this.status < 300),
      (this.statusText = 'statusText' in e ? e.statusText : 'OK'),
      (this.headers = new a(e.headers)),
      (this.url = e.url || ''),
      this._initBody(t);
  }
  var p, h, d, v, y, g, m, b, w, S;
  (Ht = 'undefined' != typeof self ? self : void 0).fetch ||
    ((p = 'URLSearchParams' in Ht),
    (h = 'Symbol' in Ht && 'iterator' in Symbol),
    (d =
      'FileReader' in Ht &&
      'Blob' in Ht &&
      (function () {
        try {
          return new Blob(), !0;
        } catch (t) {
          return !1;
        }
      })()),
    (v = 'FormData' in Ht),
    (y = 'ArrayBuffer' in Ht) &&
      ((g = [
        '[object Int8Array]',
        '[object Uint8Array]',
        '[object Uint8ClampedArray]',
        '[object Int16Array]',
        '[object Uint16Array]',
        '[object Int32Array]',
        '[object Uint32Array]',
        '[object Float32Array]',
        '[object Float64Array]'
      ]),
      (m = function (t) {
        return t && DataView.prototype.isPrototypeOf(t);
      }),
      (b =
        ArrayBuffer.isView ||
        function (t) {
          return t && -1 < g.indexOf(Object.prototype.toString.call(t));
        })),
    (a.prototype.append = function (t, e) {
      (t = n(t)), (e = o(e));
      var r = this.map[t];
      this.map[t] = r ? r + ',' + e : e;
    }),
    (a.prototype.delete = function (t) {
      delete this.map[n(t)];
    }),
    (a.prototype.get = function (t) {
      return (t = n(t)), this.has(t) ? this.map[t] : null;
    }),
    (a.prototype.has = function (t) {
      return this.map.hasOwnProperty(n(t));
    }),
    (a.prototype.set = function (t, e) {
      this.map[n(t)] = o(e);
    }),
    (a.prototype.forEach = function (t, e) {
      for (var r in this.map)
        this.map.hasOwnProperty(r) && t.call(e, this.map[r], r, this);
    }),
    (a.prototype.keys = function () {
      var r = [];
      return (
        this.forEach(function (t, e) {
          r.push(e);
        }),
        t(r)
      );
    }),
    (a.prototype.values = function () {
      var e = [];
      return (
        this.forEach(function (t) {
          e.push(t);
        }),
        t(e)
      );
    }),
    (a.prototype.entries = function () {
      var r = [];
      return (
        this.forEach(function (t, e) {
          r.push([e, t]);
        }),
        t(r)
      );
    }),
    h && (a.prototype[Symbol.iterator] = a.prototype.entries),
    (w = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']),
    (c.prototype.clone = function () {
      return new c(this, { body: this._bodyInit });
    }),
    u.call(c.prototype),
    u.call(l.prototype),
    (l.prototype.clone = function () {
      return new l(this._bodyInit, {
        status: this.status,
        statusText: this.statusText,
        headers: new a(this.headers),
        url: this.url
      });
    }),
    (l.error = function () {
      var t = new l(null, { status: 0, statusText: '' });
      return (t.type = 'error'), t;
    }),
    (S = [301, 302, 303, 307, 308]),
    (l.redirect = function (t, e) {
      if (-1 === S.indexOf(e)) throw new RangeError('Invalid status code');
      return new l(null, { status: e, headers: { location: t } });
    }),
    (Ht.Headers = a),
    (Ht.Request = c),
    (Ht.Response = l),
    (Ht.fetch = function (r, i) {
      return new Promise(function (n, t) {
        var e = new c(r, i),
          o = new XMLHttpRequest();
        (o.onload = function () {
          var r,
            t = {
              status: o.status,
              statusText: o.statusText,
              headers:
                ((e = o.getAllResponseHeaders() || ''),
                (r = new a()),
                e
                  .replace(/\r?\n[\t ]+/g, ' ')
                  .split(/\r?\n/)
                  .forEach(function (t) {
                    var e = t.split(':'),
                      t = e.shift().trim();
                    t && ((e = e.join(':').trim()), r.append(t, e));
                  }),
                r)
            };
          t.url =
            'responseURL' in o ? o.responseURL : t.headers.get('X-Request-URL');
          var e = 'response' in o ? o.response : o.responseText;
          n(new l(e, t));
        }),
          (o.onerror = function () {
            t(new TypeError('Network request failed'));
          }),
          (o.ontimeout = function () {
            t(new TypeError('Network request failed'));
          }),
          o.open(e.method, e.url, !0),
          'include' === e.credentials
            ? (o.withCredentials = !0)
            : 'omit' === e.credentials && (o.withCredentials = !1),
          'responseType' in o && d && (o.responseType = 'blob'),
          e.headers.forEach(function (t, e) {
            o.setRequestHeader(e, t);
          }),
          o.send(void 0 === e._bodyInit ? null : e._bodyInit);
      });
    }),
    (Ht.fetch.polyfill = !0));
  var E =
    'undefined' != typeof globalThis
      ? globalThis
      : 'undefined' != typeof window
      ? window
      : 'undefined' != typeof global
      ? global
      : 'undefined' != typeof self
      ? self
      : {};
  function O(t, e, r) {
    return (
      t(
        (r = {
          path: e,
          exports: {},
          require: function (t, e) {
            return (function () {
              throw new Error(
                'Dynamic requires are not currently supported by @rollup/plugin-commonjs'
              );
            })(null == e && r.path);
          }
        }),
        r.exports
      ),
      r.exports
    );
  }
  function A(t) {
    try {
      return !!t();
    } catch (t) {
      return !0;
    }
  }
  function T(t, e) {
    return {
      enumerable: !(1 & t),
      configurable: !(2 & t),
      writable: !(4 & t),
      value: e
    };
  }
  function I(t) {
    return H.call(t).slice(8, -1);
  }
  function R(t) {
    if (null == t) throw TypeError("Can't call method on " + t);
    return t;
  }
  function _(t) {
    return V(R(t));
  }
  function j(t) {
    return 'object' == typeof t ? null !== t : 'function' == typeof t;
  }
  function P(t, e) {
    if (!j(t)) return t;
    var r, n;
    if (e && 'function' == typeof (r = t.toString) && !j((n = r.call(t))))
      return n;
    if ('function' == typeof (r = t.valueOf) && !j((n = r.call(t)))) return n;
    if (!e && 'function' == typeof (r = t.toString) && !j((n = r.call(t))))
      return n;
    throw TypeError("Can't convert object to primitive value");
  }
  function x(t, e) {
    return G.call(t, e);
  }
  function N(t) {
    return q ? W.createElement(t) : {};
  }
  function D(t) {
    if (!j(t)) throw TypeError(String(t) + ' is not an object');
    return t;
  }
  function L(e, r) {
    try {
      X(F, e, r);
    } catch (t) {
      F[e] = r;
    }
    return r;
  }
  var C = function (t) {
      return t && t.Math == Math && t;
    },
    F =
      C('object' == typeof globalThis && globalThis) ||
      C('object' == typeof window && window) ||
      C('object' == typeof self && self) ||
      C('object' == typeof E && E) ||
      (function () {
        return this;
      })() ||
      Function('return this')(),
    k = !A(function () {
      return (
        7 !=
        Object.defineProperty({}, 1, {
          get: function () {
            return 7;
          }
        })[1]
      );
    }),
    M = {}.propertyIsEnumerable,
    U = Object.getOwnPropertyDescriptor,
    B = {
      f:
        U && !M.call({ 1: 2 }, 1)
          ? function (t) {
              t = U(this, t);
              return !!t && t.enumerable;
            }
          : M
    },
    H = {}.toString,
    z = ''.split,
    V = A(function () {
      return !Object('z').propertyIsEnumerable(0);
    })
      ? function (t) {
          return 'String' == I(t) ? z.call(t, '') : Object(t);
        }
      : Object,
    G = {}.hasOwnProperty,
    W = F.document,
    q = j(W) && j(W.createElement),
    K =
      !k &&
      !A(function () {
        return (
          7 !=
          Object.defineProperty(N('div'), 'a', {
            get: function () {
              return 7;
            }
          }).a
        );
      }),
    $ = Object.getOwnPropertyDescriptor,
    Y = {
      f: k
        ? $
        : function (t, e) {
            if (((t = _(t)), (e = P(e, !0)), K))
              try {
                return $(t, e);
              } catch (t) {}
            if (x(t, e)) return T(!B.f.call(t, e), t[e]);
          }
    },
    J = Object.defineProperty,
    Q = {
      f: k
        ? J
        : function (t, e, r) {
            if ((D(t), (e = P(e, !0)), D(r), K))
              try {
                return J(t, e, r);
              } catch (t) {}
            if ('get' in r || 'set' in r)
              throw TypeError('Accessors not supported');
            return 'value' in r && (t[e] = r.value), t;
          }
    },
    X = k
      ? function (t, e, r) {
          return Q.f(t, e, T(1, r));
        }
      : function (t, e, r) {
          return (t[e] = r), t;
        },
    Z = '__core-js_shared__',
    tt = F[Z] || L(Z, {}),
    et = Function.toString;
  'function' != typeof tt.inspectSource &&
    (tt.inspectSource = function (t) {
      return et.call(t);
    });
  function rt(t) {
    return (
      'Symbol(' +
      String(void 0 === t ? '' : t) +
      ')_' +
      (++yt + gt).toString(36)
    );
  }
  var nt,
    ot,
    it,
    at,
    st,
    ut,
    ct,
    ft,
    lt = tt.inspectSource,
    pt = F.WeakMap,
    ht = 'function' == typeof pt && /native code/.test(lt(pt)),
    dt = !1,
    vt = O(function (t) {
      (t.exports = function (t, e) {
        return tt[t] || (tt[t] = void 0 !== e ? e : {});
      })('versions', []).push({
        version: '3.7.0',
        mode: 'global',
        copyright: '© 2020 Denis Pushkarev (zloirock.ru)'
      });
    }),
    yt = 0,
    gt = Math.random(),
    mt = vt('keys'),
    bt = function (t) {
      return mt[t] || (mt[t] = rt(t));
    },
    wt = {},
    St = F.WeakMap;
  ct = ht
    ? ((nt = tt.state || (tt.state = new St())),
      (ot = nt.get),
      (it = nt.has),
      (at = nt.set),
      (st = function (t, e) {
        return (e.facade = t), at.call(nt, t, e), e;
      }),
      (ut = function (t) {
        return ot.call(nt, t) || {};
      }),
      function (t) {
        return it.call(nt, t);
      })
    : ((ft = bt('state')),
      (wt[ft] = !0),
      (st = function (t, e) {
        return (e.facade = t), X(t, ft, e), e;
      }),
      (ut = function (t) {
        return x(t, ft) ? t[ft] : {};
      }),
      function (t) {
        return x(t, ft);
      });
  function Et(t) {
    return 'function' == typeof t ? t : void 0;
  }
  function Ot(t, e) {
    return arguments.length < 2
      ? Et(Ct[t]) || Et(F[t])
      : (Ct[t] && Ct[t][e]) || (F[t] && F[t][e]);
  }
  function At(t) {
    return isNaN((t = +t)) ? 0 : (0 < t ? kt : Ft)(t);
  }
  function Tt(t) {
    return 0 < t ? Mt(At(t), 9007199254740991) : 0;
  }
  function It(t, e) {
    var r,
      n = _(t),
      o = 0,
      i = [];
    for (r in n) !x(wt, r) && x(n, r) && i.push(r);
    for (; e.length > o; ) x(n, (r = e[o++])) && (~zt(i, r) || i.push(r));
    return i;
  }
  function Rt(t, e) {
    for (var r = Kt(e), n = Q.f, o = Y.f, i = 0; i < r.length; i++) {
      var a = r[i];
      x(t, a) || n(t, a, o(e, a));
    }
  }
  function _t(t, e) {
    var r,
      n,
      o,
      i = t.target,
      a = t.global,
      s = t.stat,
      u = a ? F : s ? F[i] || L(i, {}) : (F[i] || {}).prototype;
    if (u)
      for (r in e) {
        if (
          ((n = e[r]),
          (o = t.noTargetGet ? (o = te(u, r)) && o.value : u[r]),
          !Zt(a ? r : i + (s ? '.' : '#') + r, t.forced) && void 0 !== o)
        ) {
          if (typeof n == typeof o) continue;
          Rt(n, o);
        }
        (t.sham || (o && o.sham)) && X(n, 'sham', !0), Lt(u, r, n, t);
      }
  }
  function jt(t) {
    return Object(R(t));
  }
  function Pt() {}
  function xt(t) {
    return '<script>' + t + '</' + ce + '>';
  }
  var Nt,
    Dt = {
      set: st,
      get: ut,
      has: ct,
      enforce: function (t) {
        return ct(t) ? ut(t) : st(t, {});
      },
      getterFor: function (r) {
        return function (t) {
          var e;
          if (!j(t) || (e = ut(t)).type !== r)
            throw TypeError('Incompatible receiver, ' + r + ' required');
          return e;
        };
      }
    },
    Lt = O(function (t) {
      var e = Dt.get,
        s = Dt.enforce,
        u = String(String).split('String');
      (t.exports = function (t, e, r, n) {
        var o = !!n && !!n.unsafe,
          i = !!n && !!n.enumerable,
          a = !!n && !!n.noTargetGet;
        'function' == typeof r &&
          ('string' != typeof e || x(r, 'name') || X(r, 'name', e),
          (n = s(r)).source ||
            (n.source = u.join('string' == typeof e ? e : ''))),
          t !== F
            ? (o ? !a && t[e] && (i = !0) : delete t[e],
              i ? (t[e] = r) : X(t, e, r))
            : i
            ? (t[e] = r)
            : L(e, r);
      })(Function.prototype, 'toString', function () {
        return ('function' == typeof this && e(this).source) || lt(this);
      });
    }),
    Ct = F,
    Ft = Math.ceil,
    kt = Math.floor,
    Mt = Math.min,
    Ut = Math.max,
    Bt = Math.min,
    Ht = function (s) {
      return function (t, e, r) {
        var n,
          o = _(t),
          i = Tt(o.length),
          a = (function (t, e) {
            t = At(t);
            return t < 0 ? Ut(t + e, 0) : Bt(t, e);
          })(r, i);
        if (s && e != e) {
          for (; a < i; ) if ((n = o[a++]) != n) return !0;
        } else
          for (; a < i; a++)
            if ((s || a in o) && o[a] === e) return s || a || 0;
        return !s && -1;
      };
    },
    zt = { includes: Ht(!0), indexOf: Ht(!1) }.indexOf,
    Vt = [
      'constructor',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf'
    ],
    Gt = Vt.concat('length', 'prototype'),
    Wt = {
      f:
        Object.getOwnPropertyNames ||
        function (t) {
          return It(t, Gt);
        }
    },
    qt = { f: Object.getOwnPropertySymbols },
    Kt =
      Ot('Reflect', 'ownKeys') ||
      function (t) {
        var e = Wt.f(D(t)),
          r = qt.f;
        return r ? e.concat(r(t)) : e;
      },
    $t = /#|\.prototype\./,
    C = function (t, e) {
      t = Jt[Yt(t)];
      return t == Xt || (t != Qt && ('function' == typeof e ? A(e) : !!e));
    },
    Yt = (C.normalize = function (t) {
      return String(t).replace($t, '.').toLowerCase();
    }),
    Jt = (C.data = {}),
    Qt = (C.NATIVE = 'N'),
    Xt = (C.POLYFILL = 'P'),
    Zt = C,
    te = Y.f,
    E = !A(function () {
      function t() {}
      return (
        (t.prototype.constructor = null),
        Object.getPrototypeOf(new t()) !== t.prototype
      );
    }),
    ee = bt('IE_PROTO'),
    re = Object.prototype,
    ne = E
      ? Object.getPrototypeOf
      : function (t) {
          return (
            (t = jt(t)),
            x(t, ee)
              ? t[ee]
              : 'function' == typeof t.constructor && t instanceof t.constructor
              ? t.constructor.prototype
              : t instanceof Object
              ? re
              : null
          );
        },
    oe =
      Object.setPrototypeOf ||
      ('__proto__' in {}
        ? (function () {
            var r,
              n = !1,
              t = {};
            try {
              (r = Object.getOwnPropertyDescriptor(
                Object.prototype,
                '__proto__'
              ).set).call(t, []),
                (n = t instanceof Array);
            } catch (t) {}
            return function (t, e) {
              return (
                D(t),
                (function (t) {
                  if (!j(t) && null !== t)
                    throw TypeError(
                      "Can't set " + String(t) + ' as a prototype'
                    );
                })(e),
                n ? r.call(t, e) : (t.__proto__ = e),
                t
              );
            };
          })()
        : void 0),
    ie =
      Object.keys ||
      function (t) {
        return It(t, Vt);
      },
    ae = k
      ? Object.defineProperties
      : function (t, e) {
          D(t);
          for (var r, n = ie(e), o = n.length, i = 0; i < o; )
            Q.f(t, (r = n[i++]), e[r]);
          return t;
        },
    se = Ot('document', 'documentElement'),
    ue = 'prototype',
    ce = 'script',
    fe = bt('IE_PROTO'),
    le = function () {
      try {
        Nt = document.domain && new ActiveXObject('htmlfile');
      } catch (t) {}
      var t;
      le = Nt
        ? (function (t) {
            t.write(xt('')), t.close();
            var e = t.parentWindow.Object;
            return (t = null), e;
          })(Nt)
        : (((t = N('iframe')).style.display = 'none'),
          se.appendChild(t),
          (t.src = String('javascript:')),
          (t = t.contentWindow.document).open(),
          t.write(xt('document.F=Object')),
          t.close(),
          t.F);
      for (var e = Vt.length; e--; ) delete le[ue][Vt[e]];
      return le();
    };
  wt[fe] = !0;
  function pe(t) {
    return (
      x(me, t) ||
        (ge && x(be, t) ? (me[t] = be[t]) : (me[t] = we('Symbol.' + t))),
      me[t]
    );
  }
  function he(t) {
    return void 0 !== t && (Se.Array === t || Oe[Ee] === t);
  }
  function de(t) {
    if ('function' != typeof t)
      throw TypeError(String(t) + ' is not a function');
    return t;
  }
  function ve(n, o, t) {
    if ((de(n), void 0 === o)) return n;
    switch (t) {
      case 0:
        return function () {
          return n.call(o);
        };
      case 1:
        return function (t) {
          return n.call(o, t);
        };
      case 2:
        return function (t, e) {
          return n.call(o, t, e);
        };
      case 3:
        return function (t, e, r) {
          return n.call(o, t, e, r);
        };
    }
    return function () {
      return n.apply(o, arguments);
    };
  }
  var ye =
      Object.create ||
      function (t, e) {
        var r;
        return (
          null !== t
            ? ((Pt[ue] = D(t)), (r = new Pt()), (Pt[ue] = null), (r[fe] = t))
            : (r = le()),
          void 0 === e ? r : ae(r, e)
        );
      },
    ge =
      !!Object.getOwnPropertySymbols &&
      !A(function () {
        return !String(Symbol());
      }),
    M = ge && !Symbol.sham && 'symbol' == typeof Symbol.iterator,
    me = vt('wks'),
    be = F.Symbol,
    we = M ? be : (be && be.withoutSetter) || rt,
    Se = {},
    Ee = pe('iterator'),
    Oe = Array.prototype,
    Z = {};
  Z[pe('toStringTag')] = 'z';
  function Ae(t) {
    if (null != t) return t[xe] || t['@@iterator'] || Se[Pe(t)];
  }
  function Te(t) {
    var e = t.return;
    return void 0 !== e && D(e.call(t)).value;
  }
  function Ie(t, e) {
    (this.stopped = t), (this.result = e);
  }
  function Re(t, e, r) {
    function n(t) {
      return i && Te(i), new Ie(!0, t);
    }
    function o(t) {
      return p
        ? (D(t), d ? v(t[0], t[1], n) : v(t[0], t[1]))
        : d
        ? v(t, n)
        : v(t);
    }
    var i,
      a,
      s,
      u,
      c,
      f,
      l = r && r.that,
      p = !(!r || !r.AS_ENTRIES),
      h = !(!r || !r.IS_ITERATOR),
      d = !(!r || !r.INTERRUPTED),
      v = ve(e, l, 1 + p + d);
    if (h) i = t;
    else {
      if ('function' != typeof (h = Ae(t)))
        throw TypeError('Target is not iterable');
      if (he(h)) {
        for (a = 0, s = Tt(t.length); a < s; a++)
          if ((u = o(t[a])) && u instanceof Ie) return u;
        return new Ie(!1);
      }
      i = h.call(t);
    }
    for (c = i.next; !(f = c.call(i)).done; ) {
      try {
        u = o(f.value);
      } catch (t) {
        throw (Te(i), t);
      }
      if ('object' == typeof u && u && u instanceof Ie) return u;
    }
    return new Ie(!1);
  }
  var pt = '[object z]' === String(Z),
    _e = pe('toStringTag'),
    je =
      'Arguments' ==
      I(
        (function () {
          return arguments;
        })()
      ),
    Pe = pt
      ? I
      : function (t) {
          var e;
          return void 0 === t
            ? 'Undefined'
            : null === t
            ? 'Null'
            : 'string' ==
              typeof (t = (function (t, e) {
                try {
                  return t[e];
                } catch (t) {}
              })((e = Object(t)), _e))
            ? t
            : je
            ? I(e)
            : 'Object' == (t = I(e)) && 'function' == typeof e.callee
            ? 'Arguments'
            : t;
        },
    xe = pe('iterator'),
    Ne = function (t, e) {
      var r = this;
      if (!(r instanceof Ne)) return new Ne(t, e);
      oe && (r = oe(new Error(void 0), ne(r))),
        void 0 !== e && X(r, 'message', String(e));
      e = [];
      return Re(t, e.push, { that: e }), X(r, 'errors', e), r;
    };
  (Ne.prototype = ye(Error.prototype, {
    constructor: T(5, Ne),
    message: T(5, ''),
    name: T(5, 'AggregateError')
  })),
    _t({ global: !0 }, { AggregateError: Ne });
  ht = pt
    ? {}.toString
    : function () {
        return '[object ' + Pe(this) + ']';
      };
  pt || Lt(Object.prototype, 'toString', ht, { unsafe: !0 });
  function De(t, e, r) {
    for (var n in e) Lt(t, n, e[n], r);
    return t;
  }
  function Le(t, e, r) {
    t &&
      !x((t = r ? t : t.prototype), Ue) &&
      Me(t, Ue, { configurable: !0, value: e });
  }
  function Ce(t) {
    var e = Ot(t),
      t = Q.f;
    k &&
      e &&
      !e[Be] &&
      t(e, Be, {
        configurable: !0,
        get: function () {
          return this;
        }
      });
  }
  function Fe(t, e, r) {
    if (!(t instanceof e))
      throw TypeError('Incorrect ' + (r ? r + ' ' : '') + 'invocation');
    return t;
  }
  var ke = F.Promise,
    Me = Q.f,
    Ue = pe('toStringTag'),
    Be = pe('species'),
    He = pe('iterator'),
    ze = !1;
  try {
    var Ve = 0,
      Ge = {
        next: function () {
          return { done: !!Ve++ };
        },
        return: function () {
          ze = !0;
        }
      };
    (Ge[He] = function () {
      return this;
    }),
      Array.from(Ge, function () {
        throw 2;
      });
  } catch (t) {}
  function We(t, e) {
    if (!e && !ze) return !1;
    var r = !1;
    try {
      var n = {};
      (n[He] = function () {
        return {
          next: function () {
            return { done: (r = !0) };
          }
        };
      }),
        t(n);
    } catch (t) {}
    return r;
  }
  function qe(t, e) {
    var r;
    return void 0 === (t = D(t).constructor) || null == (r = D(t)[Je])
      ? e
      : de(r);
  }
  function Ke(t) {
    var e;
    rr.hasOwnProperty(t) && ((e = rr[t]), delete rr[t], e());
  }
  function $e(t) {
    return function () {
      Ke(t);
    };
  }
  var Ye,
    Je = pe('species'),
    St = Ot('navigator', 'userAgent') || '',
    Ht = /(iphone|ipod|ipad).*applewebkit/i.test(St),
    Qe = 'process' == I(F.process),
    Xe = F.location,
    C = F.setImmediate,
    E = F.clearImmediate,
    Ze = F.process,
    Z = F.MessageChannel,
    tr = F.Dispatch,
    er = 0,
    rr = {},
    nr = 'onreadystatechange',
    pt = function (t) {
      Ke(t.data);
    },
    ht = function (t) {
      F.postMessage(t + '', Xe.protocol + '//' + Xe.host);
    };
  (C && E) ||
    ((C = function (t) {
      for (var e = [], r = 1; r < arguments.length; ) e.push(arguments[r++]);
      return (
        (rr[++er] = function () {
          ('function' == typeof t ? t : Function(t)).apply(void 0, e);
        }),
        Ye(er),
        er
      );
    }),
    (E = function (t) {
      delete rr[t];
    }),
    Qe
      ? (Ye = function (t) {
          Ze.nextTick($e(t));
        })
      : tr && tr.now
      ? (Ye = function (t) {
          tr.now($e(t));
        })
      : Z && !Ht
      ? ((pr = (Z = new Z()).port2),
        (Z.port1.onmessage = pt),
        (Ye = ve(pr.postMessage, pr, 1)))
      : F.addEventListener &&
        'function' == typeof postMessage &&
        !F.importScripts &&
        Xe &&
        'file:' !== Xe.protocol &&
        !A(ht)
      ? ((Ye = ht), F.addEventListener('message', pt, !1))
      : (Ye =
          nr in N('script')
            ? function (t) {
                se.appendChild(N('script'))[nr] = function () {
                  se.removeChild(this), Ke(t);
                };
              }
            : function (t) {
                setTimeout($e(t), 0);
              }));
  var or,
    ir,
    ar,
    sr,
    ur,
    cr,
    fr,
    lr,
    pr = { set: C, clear: E },
    ht = Y.f,
    hr = pr.set,
    pt = F.MutationObserver || F.WebKitMutationObserver,
    C = F.document,
    dr = F.process,
    E = F.Promise,
    ht = ht(F, 'queueMicrotask'),
    ht = ht && ht.value;
  ht ||
    ((or = function () {
      var t, e;
      for (Qe && (t = dr.domain) && t.exit(); ir; ) {
        (e = ir.fn), (ir = ir.next);
        try {
          e();
        } catch (t) {
          throw (ir ? sr() : (ar = void 0), t);
        }
      }
      (ar = void 0), t && t.enter();
    }),
    (sr =
      !Ht && !Qe && pt && C
        ? ((ur = !0),
          (cr = C.createTextNode('')),
          new pt(or).observe(cr, { characterData: !0 }),
          function () {
            cr.data = ur = !ur;
          })
        : E && E.resolve
        ? ((fr = E.resolve(void 0)),
          (lr = fr.then),
          function () {
            lr.call(fr, or);
          })
        : Qe
        ? function () {
            dr.nextTick(or);
          }
        : function () {
            hr.call(F, or);
          }));
  function vr(t) {
    var r, n;
    (this.promise = new t(function (t, e) {
      if (void 0 !== r || void 0 !== n)
        throw TypeError('Bad Promise constructor');
      (r = t), (n = e);
    })),
      (this.resolve = de(r)),
      (this.reject = de(n));
  }
  function yr(t, e) {
    return (
      D(t),
      j(e) && e.constructor === t
        ? e
        : ((0, (t = br.f(t)).resolve)(e), t.promise)
    );
  }
  function gr(t) {
    try {
      return { error: !1, value: t() };
    } catch (t) {
      return { error: !0, value: t };
    }
  }
  var mr =
      ht ||
      function (t) {
        t = { fn: t, next: void 0 };
        ar && (ar.next = t), ir || ((ir = t), sr()), (ar = t);
      },
    br = {
      f: function (t) {
        return new vr(t);
      }
    },
    ht = F.process,
    ht = ht && ht.versions,
    ht = ht && ht.v8;
  ht
    ? (Xr = (qr = ht.split('.'))[0] + qr[1])
    : St &&
      (!(qr = St.match(/Edge\/(\d+)/)) || 74 <= qr[1]) &&
      (qr = St.match(/Chrome\/(\d+)/)) &&
      (Xr = qr[1]);
  function wr(t) {
    var e;
    return !(!j(t) || 'function' != typeof (e = t.then)) && e;
  }
  function Sr(l, p) {
    var h;
    l.notified ||
      ((l.notified = !0),
      (h = l.reactions),
      mr(function () {
        for (var t = l.value, e = 1 == l.state, r = 0; h.length > r; ) {
          var n,
            o,
            i,
            a = h[r++],
            s = e ? a.ok : a.fail,
            u = a.resolve,
            c = a.reject,
            f = a.domain;
          try {
            s
              ? (e || (2 === l.rejection && Yr(l), (l.rejection = 1)),
                !0 === s
                  ? (n = t)
                  : (f && f.enter(), (n = s(t)), f && (f.exit(), (i = !0))),
                n === a.promise
                  ? c(kr('Promise-chain cycle'))
                  : (o = wr(n))
                  ? o.call(n, u, c)
                  : u(n))
              : c(t);
          } catch (t) {
            f && !i && f.exit(), c(t);
          }
        }
        (l.reactions = []), (l.notified = !1), p && !l.rejection && Kr(l);
      }));
  }
  function Er(t, e, r) {
    var n, o;
    Vr
      ? (((n = Mr.createEvent('Event')).promise = e),
        (n.reason = r),
        n.initEvent(t, !1, !0),
        F.dispatchEvent(n))
      : (n = { promise: e, reason: r }),
      !Gr && (o = F['on' + t])
        ? o(n)
        : t === Wr &&
          (function (t, e) {
            var r = F.console;
            r &&
              r.error &&
              (1 === arguments.length ? r.error(t) : r.error(t, e));
          })('Unhandled promise rejection', r);
  }
  function Or(e, r, n) {
    return function (t) {
      e(r, t, n);
    };
  }
  function Ar(t, e, r) {
    t.done ||
      ((t.done = !0), r && (t = r), (t.value = e), (t.state = 2), Sr(t, !0));
  }
  var Tr,
    Ir,
    Rr,
    _r,
    jr = Xr && +Xr,
    Pr = pr.set,
    xr = pe('species'),
    Nr = 'Promise',
    Dr = Dt.get,
    Lr = Dt.set,
    Cr = Dt.getterFor(Nr),
    Fr = ke,
    kr = F.TypeError,
    Mr = F.document,
    Ur = F.process,
    Br = Ot('fetch'),
    Hr = br.f,
    zr = Hr,
    Vr = !!(Mr && Mr.createEvent && F.dispatchEvent),
    Gr = 'function' == typeof PromiseRejectionEvent,
    Wr = 'unhandledrejection',
    St = Zt(Nr, function () {
      if (!(lt(Fr) !== String(Fr))) {
        if (66 === jr) return !0;
        if (!Qe && !Gr) return !0;
      }
      if (51 <= jr && /native code/.test(Fr)) return !1;
      function t(t) {
        t(
          function () {},
          function () {}
        );
      }
      var e = Fr.resolve(1);
      return (
        ((e.constructor = {})[xr] = t), !(e.then(function () {}) instanceof t)
      );
    }),
    qr =
      St ||
      !We(function (t) {
        Fr.all(t).catch(function () {});
      }),
    Kr = function (n) {
      Pr.call(F, function () {
        var t,
          e = n.facade,
          r = n.value;
        if (
          $r(n) &&
          ((t = gr(function () {
            Qe ? Ur.emit('unhandledRejection', r, e) : Er(Wr, e, r);
          })),
          (n.rejection = Qe || $r(n) ? 2 : 1),
          t.error)
        )
          throw t.value;
      });
    },
    $r = function (t) {
      return 1 !== t.rejection && !t.parent;
    },
    Yr = function (e) {
      Pr.call(F, function () {
        var t = e.facade;
        Qe
          ? Ur.emit('rejectionHandled', t)
          : Er('rejectionhandled', t, e.value);
      });
    },
    Jr = function (r, t, e) {
      if (!r.done) {
        (r.done = !0), e && (r = e);
        try {
          if (r.facade === t) throw kr("Promise can't be resolved itself");
          var n = wr(t);
          n
            ? mr(function () {
                var e = { done: !1 };
                try {
                  n.call(t, Or(Jr, e, r), Or(Ar, e, r));
                } catch (t) {
                  Ar(e, t, r);
                }
              })
            : ((r.value = t), (r.state = 1), Sr(r, !1));
        } catch (t) {
          Ar({ done: !1 }, t, r);
        }
      }
    };
  St &&
    ((Fr = function (t) {
      Fe(this, Fr, Nr), de(t), Tr.call(this);
      var e = Dr(this);
      try {
        t(Or(Jr, e), Or(Ar, e));
      } catch (t) {
        Ar(e, t);
      }
    }),
    ((Tr = function () {
      Lr(this, {
        type: Nr,
        done: !1,
        notified: !1,
        parent: !1,
        reactions: [],
        rejection: !1,
        state: 0,
        value: void 0
      });
    }).prototype = De(Fr.prototype, {
      then: function (t, e) {
        var r = Cr(this),
          n = Hr(qe(this, Fr));
        return (
          (n.ok = 'function' != typeof t || t),
          (n.fail = 'function' == typeof e && e),
          (n.domain = Qe ? Ur.domain : void 0),
          (r.parent = !0),
          r.reactions.push(n),
          0 != r.state && Sr(r, !1),
          n.promise
        );
      },
      catch: function (t) {
        return this.then(void 0, t);
      }
    })),
    (Ir = function () {
      var t = new Tr(),
        e = Dr(t);
      (this.promise = t), (this.resolve = Or(Jr, e)), (this.reject = Or(Ar, e));
    }),
    (br.f = Hr =
      function (t) {
        return t === Fr || t === Rr ? new Ir() : zr(t);
      }),
    'function' == typeof ke &&
      ((_r = ke.prototype.then),
      Lt(
        ke.prototype,
        'then',
        function (t, e) {
          var r = this;
          return new Fr(function (t, e) {
            _r.call(r, t, e);
          }).then(t, e);
        },
        { unsafe: !0 }
      ),
      'function' == typeof Br &&
        _t(
          { global: !0, enumerable: !0, forced: !0 },
          {
            fetch: function () {
              return yr(Fr, Br.apply(F, arguments));
            }
          }
        ))),
    _t({ global: !0, wrap: !0, forced: St }, { Promise: Fr }),
    Le(Fr, Nr, !1),
    Ce(Nr),
    (Rr = Ot(Nr)),
    _t(
      { target: Nr, stat: !0, forced: St },
      {
        reject: function (t) {
          var e = Hr(this);
          return e.reject.call(void 0, t), e.promise;
        }
      }
    ),
    _t(
      { target: Nr, stat: !0, forced: St },
      {
        resolve: function (t) {
          return yr(this, t);
        }
      }
    ),
    _t(
      { target: Nr, stat: !0, forced: qr },
      {
        all: function (t) {
          var s = this,
            e = Hr(s),
            u = e.resolve,
            c = e.reject,
            r = gr(function () {
              var n = de(s.resolve),
                o = [],
                i = 0,
                a = 1;
              Re(t, function (t) {
                var e = i++,
                  r = !1;
                o.push(void 0),
                  a++,
                  n.call(s, t).then(function (t) {
                    r || ((r = !0), (o[e] = t), --a || u(o));
                  }, c);
              }),
                --a || u(o);
            });
          return r.error && c(r.value), e.promise;
        },
        race: function (t) {
          var r = this,
            n = Hr(r),
            o = n.reject,
            e = gr(function () {
              var e = de(r.resolve);
              Re(t, function (t) {
                e.call(r, t).then(n.resolve, o);
              });
            });
          return e.error && o(e.value), n.promise;
        }
      }
    ),
    _t(
      { target: 'Promise', stat: !0 },
      {
        allSettled: function (t) {
          var s = this,
            e = br.f(s),
            u = e.resolve,
            r = e.reject,
            n = gr(function () {
              var n = de(s.resolve),
                o = [],
                i = 0,
                a = 1;
              Re(t, function (t) {
                var e = i++,
                  r = !1;
                o.push(void 0),
                  a++,
                  n.call(s, t).then(
                    function (t) {
                      r ||
                        ((r = !0),
                        (o[e] = { status: 'fulfilled', value: t }),
                        --a || u(o));
                    },
                    function (t) {
                      r ||
                        ((r = !0),
                        (o[e] = { status: 'rejected', reason: t }),
                        --a || u(o));
                    }
                  );
              }),
                --a || u(o);
            });
          return n.error && r(n.value), e.promise;
        }
      }
    );
  var Qr = 'No one promise resolved';
  _t(
    { target: 'Promise', stat: !0 },
    {
      any: function (t) {
        var u = this,
          e = br.f(u),
          c = e.resolve,
          f = e.reject,
          r = gr(function () {
            var n = de(u.resolve),
              o = [],
              i = 0,
              a = 1,
              s = !1;
            Re(t, function (t) {
              var e = i++,
                r = !1;
              o.push(void 0),
                a++,
                n.call(u, t).then(
                  function (t) {
                    r || s || ((s = !0), c(t));
                  },
                  function (t) {
                    r ||
                      s ||
                      ((r = !0),
                      (o[e] = t),
                      --a || f(new (Ot('AggregateError'))(o, Qr)));
                  }
                );
            }),
              --a || f(new (Ot('AggregateError'))(o, Qr));
          });
        return r.error && f(r.value), e.promise;
      }
    }
  );
  var Xr =
    !!ke &&
    A(function () {
      ke.prototype.finally.call({ then: function () {} }, function () {});
    });
  _t(
    { target: 'Promise', proto: !0, real: !0, forced: Xr },
    {
      finally: function (e) {
        var r = qe(this, Ot('Promise')),
          t = 'function' == typeof e;
        return this.then(
          t
            ? function (t) {
                return yr(r, e()).then(function () {
                  return t;
                });
              }
            : e,
          t
            ? function (t) {
                return yr(r, e()).then(function () {
                  throw t;
                });
              }
            : e
        );
      }
    }
  ),
    'function' != typeof ke ||
      ke.prototype.finally ||
      Lt(ke.prototype, 'finally', Ot('Promise').prototype.finally);
  (pr = function (i) {
    return function (t, e) {
      var r,
        n = String(R(t)),
        o = At(e),
        t = n.length;
      return o < 0 || t <= o
        ? i
          ? ''
          : void 0
        : (e = n.charCodeAt(o)) < 55296 ||
          56319 < e ||
          o + 1 === t ||
          (r = n.charCodeAt(o + 1)) < 56320 ||
          57343 < r
        ? i
          ? n.charAt(o)
          : e
        : i
        ? n.slice(o, o + 2)
        : r - 56320 + ((e - 55296) << 10) + 65536;
    };
  }),
    (St = { codeAt: pr(!1), charAt: pr(!0) }),
    (qr = pe('iterator')),
    (Xr = !1);
  [].keys &&
    ('next' in (yn = [].keys())
      ? (Dn = ne(ne(yn))) !== Object.prototype && (Fn = Dn)
      : (Xr = !0)),
    null == Fn && (Fn = {}),
    x(Fn, qr) ||
      X(Fn, qr, function () {
        return this;
      });
  function Zr() {
    return this;
  }
  function tn() {
    return this;
  }
  function en(t, e, r, n, o, i, a) {
    function s(t) {
      if (t === o && d) return d;
      if (!on && t in p) return p[t];
      switch (t) {
        case 'keys':
        case sn:
        case un:
          return function () {
            return new r(this, t);
          };
      }
      return function () {
        return new r(this);
      };
    }
    !(function (t, e, r) {
      e += ' Iterator';
      (t.prototype = ye(rn, { next: T(1, r) })), Le(t, e, !1), (Se[e] = Zr);
    })(r, e, n);
    var u,
      c,
      f = e + ' Iterator',
      l = !1,
      p = t.prototype,
      h = p[an] || p['@@iterator'] || (o && p[o]),
      d = (!on && h) || s(o);
    if (
      ((n = ('Array' == e && p.entries) || h) &&
        ((t = ne(n.call(new t()))),
        nn !== Object.prototype &&
          t.next &&
          (ne(t) !== nn &&
            (oe ? oe(t, nn) : 'function' != typeof t[an] && X(t, an, tn)),
          Le(t, f, !0))),
      o == sn &&
        h &&
        h.name !== sn &&
        ((l = !0),
        (d = function () {
          return h.call(this);
        })),
      p[an] !== d && X(p, an, d),
      (Se[e] = d),
      o)
    )
      if (((u = { values: s(sn), keys: i ? d : s('keys'), entries: s(un) }), a))
        for (c in u) (!on && !l && c in p) || Lt(p, c, u[c]);
      else _t({ target: e, proto: !0, forced: on || l }, u);
    return u;
  }
  var pr = { IteratorPrototype: Fn, BUGGY_SAFARI_ITERATORS: Xr },
    rn = pr.IteratorPrototype,
    nn = pr.IteratorPrototype,
    on = pr.BUGGY_SAFARI_ITERATORS,
    an = pe('iterator'),
    sn = 'values',
    un = 'entries',
    cn = St.charAt,
    fn = 'String Iterator',
    ln = Dt.set,
    pn = Dt.getterFor(fn);
  en(
    String,
    'String',
    function (t) {
      ln(this, { type: fn, string: String(t), index: 0 });
    },
    function () {
      var t = pn(this),
        e = t.string,
        r = t.index;
      return r >= e.length
        ? { value: void 0, done: !0 }
        : ((r = cn(e, r)), (t.index += r.length), { value: r, done: !1 });
    }
  );
  var hn = {
      CSSRuleList: 0,
      CSSStyleDeclaration: 0,
      CSSValueList: 0,
      ClientRectList: 0,
      DOMRectList: 0,
      DOMStringList: 0,
      DOMTokenList: 1,
      DataTransferItemList: 0,
      FileList: 0,
      HTMLAllCollection: 0,
      HTMLCollection: 0,
      HTMLFormElement: 0,
      HTMLSelectElement: 0,
      MediaList: 0,
      MimeTypeArray: 0,
      NamedNodeMap: 0,
      NodeList: 1,
      PaintRequestList: 0,
      Plugin: 0,
      PluginArray: 0,
      SVGLengthList: 0,
      SVGNumberList: 0,
      SVGPathSegList: 0,
      SVGPointList: 0,
      SVGStringList: 0,
      SVGTransformList: 0,
      SourceBufferList: 0,
      StyleSheetList: 0,
      TextTrackCueList: 0,
      TextTrackList: 0,
      TouchList: 0
    },
    dn = pe('unscopables'),
    vn = Array.prototype;
  null == vn[dn] && Q.f(vn, dn, { configurable: !0, value: ye(null) });
  var yn = function (t) {
      vn[dn][t] = !0;
    },
    gn = 'Array Iterator',
    mn = Dt.set,
    bn = Dt.getterFor(gn),
    wn = en(
      Array,
      'Array',
      function (t, e) {
        mn(this, { type: gn, target: _(t), index: 0, kind: e });
      },
      function () {
        var t = bn(this),
          e = t.target,
          r = t.kind,
          n = t.index++;
        return !e || n >= e.length
          ? { value: (t.target = void 0), done: !0 }
          : 'keys' == r
          ? { value: n, done: !1 }
          : 'values' == r
          ? { value: e[n], done: !1 }
          : { value: [n, e[n]], done: !1 };
      },
      'values'
    );
  (Se.Arguments = Se.Array), yn('keys'), yn('values'), yn('entries');
  var Sn,
    En = pe('iterator'),
    On = pe('toStringTag'),
    An = wn.values;
  for (Sn in hn) {
    var Tn = F[Sn],
      In = Tn && Tn.prototype;
    if (In) {
      if (In[En] !== An)
        try {
          X(In, En, An);
        } catch (t) {
          In[En] = An;
        }
      if ((In[On] || X(In, On, Sn), hn[Sn]))
        for (var Rn in wn)
          if (In[Rn] !== wn[Rn])
            try {
              X(In, Rn, wn[Rn]);
            } catch (t) {
              In[Rn] = wn[Rn];
            }
    }
  }
  Ct.Promise;
  _t(
    { target: 'Promise', stat: !0 },
    {
      try: function (t) {
        var e = br.f(this),
          t = gr(t);
        return (t.error ? e.reject : e.resolve)(t.value), e.promise;
      }
    }
  );
  function _n(t, e) {
    var r;
    return (
      Pn(t) &&
        (('function' == typeof (r = t.constructor) &&
          (r === Array || Pn(r.prototype))) ||
          (j(r) && null === (r = r[xn]))) &&
        (r = void 0),
      new (void 0 === r ? Array : r)(0 === e ? 0 : e)
    );
  }
  function jn(t) {
    throw t;
  }
  var Pn =
      Array.isArray ||
      function (t) {
        return 'Array' == I(t);
      },
    xn = pe('species'),
    Nn = [].push,
    Dn = function (p) {
      var h = 1 == p,
        d = 2 == p,
        v = 3 == p,
        y = 4 == p,
        g = 6 == p,
        m = 5 == p || g;
      return function (t, e, r, n) {
        for (
          var o,
            i,
            a = jt(t),
            s = V(a),
            u = ve(e, r, 3),
            c = Tt(s.length),
            f = 0,
            n = n || _n,
            l = h ? n(t, c) : d ? n(t, 0) : void 0;
          f < c;
          f++
        )
          if ((m || f in s) && ((i = u((o = s[f]), f, a)), p))
            if (h) l[f] = i;
            else if (i)
              switch (p) {
                case 3:
                  return !0;
                case 5:
                  return o;
                case 6:
                  return f;
                case 2:
                  Nn.call(l, o);
              }
            else if (y) return !1;
        return g ? -1 : v || y ? y : l;
      };
    },
    qr = {
      forEach: Dn(0),
      map: Dn(1),
      filter: Dn(2),
      some: Dn(3),
      every: Dn(4),
      find: Dn(5),
      findIndex: Dn(6)
    },
    Ln = Object.defineProperty,
    Cn = {},
    Fn = function (t, e) {
      if (x(Cn, t)) return Cn[t];
      var r = [][t],
        n = !!x((e = e || {}), 'ACCESSORS') && e.ACCESSORS,
        o = x(e, 0) ? e[0] : jn,
        i = x(e, 1) ? e[1] : void 0;
      return (Cn[t] =
        !!r &&
        !A(function () {
          if (n && !k) return 1;
          var t = { length: -1 };
          n ? Ln(t, 1, { enumerable: !0, get: jn }) : (t[1] = 1),
            r.call(t, o, i);
        }));
    },
    kn = qr.find,
    Xr = 'find',
    Mn = !0,
    pr = Fn(Xr);
  Xr in [] &&
    Array(1)[Xr](function () {
      Mn = !1;
    }),
    _t(
      { target: 'Array', proto: !0, forced: Mn || !pr },
      {
        find: function (t, e) {
          return kn(this, t, 1 < arguments.length ? e : void 0);
        }
      }
    ),
    yn(Xr);
  var Un = Function.call,
    St = function (t, e, r) {
      return ve(Un, F[t].prototype[e], r);
    },
    Bn = (St('Array', 'find'), qr.findIndex),
    Dn = 'findIndex',
    Hn = !0,
    pr = Fn(Dn);
  Dn in [] &&
    Array(1)[Dn](function () {
      Hn = !1;
    }),
    _t(
      { target: 'Array', proto: !0, forced: Hn || !pr },
      {
        findIndex: function (t, e) {
          return Bn(this, t, 1 < arguments.length ? e : void 0);
        }
      }
    ),
    yn(Dn);
  function zn(t, e, r) {
    (e = P(e)) in t ? Q.f(t, e, T(0, r)) : (t[e] = r);
  }
  St('Array', 'findIndex');
  Xr = !We(function (t) {
    Array.from(t);
  });
  _t(
    { target: 'Array', stat: !0, forced: Xr },
    {
      from: function (t, e, r) {
        var n,
          o,
          i,
          a,
          s,
          u,
          c = jt(t),
          f = 'function' == typeof this ? this : Array,
          t = arguments.length,
          l = 1 < t ? e : void 0,
          p = void 0 !== l,
          e = Ae(c),
          h = 0;
        if (
          (p && (l = ve(l, 2 < t ? r : void 0, 2)),
          null == e || (f == Array && he(e)))
        )
          for (o = new f((n = Tt(c.length))); h < n; h++)
            (u = p ? l(c[h], h) : c[h]), zn(o, h, u);
        else
          for (
            s = (a = e.call(c)).next, o = new f();
            !(i = s.call(a)).done;
            h++
          )
            (u = p
              ? (function (e, t, r, n) {
                  try {
                    return n ? t(D(r)[0], r[1]) : t(r);
                  } catch (t) {
                    throw (Te(e), t);
                  }
                })(a, l, [i.value, h], !0)
              : i.value),
              zn(o, h, u);
        return (o.length = h), o;
      }
    }
  );
  Ct.Array.from;
  var Vn,
    Gn,
    Wn = qr.some,
    pr =
      !!(Gn = []['some']) &&
      A(function () {
        Gn.call(
          null,
          Vn ||
            function () {
              throw 1;
            },
          1
        );
      }),
    yn = Fn('some');
  _t(
    { target: 'Array', proto: !0, forced: !pr || !yn },
    {
      some: function (t, e) {
        return Wn(this, t, 1 < arguments.length ? e : void 0);
      }
    }
  );
  St('Array', 'some');
  function qn(t) {
    return j(t) && x(to, Pe(t));
  }
  var Kn,
    Dn = 'undefined' != typeof ArrayBuffer && 'undefined' != typeof DataView,
    Xr = Q.f,
    $n = F.Int8Array,
    Yn = $n && $n.prototype,
    Fn = F.Uint8ClampedArray,
    pr = Fn && Fn.prototype,
    Jn = $n && ne($n),
    Qn = Yn && ne(Yn),
    yn = Object.prototype,
    Fn = (yn.isPrototypeOf, pe('toStringTag')),
    Xn = rt('TYPED_ARRAY_TAG'),
    Zn = Dn && !!oe && 'Opera' !== Pe(F.opera),
    Dn = !1,
    to = {
      Int8Array: 1,
      Uint8Array: 1,
      Uint8ClampedArray: 1,
      Int16Array: 2,
      Uint16Array: 2,
      Int32Array: 4,
      Uint32Array: 4,
      Float32Array: 4,
      Float64Array: 8
    };
  for (Kn in to) F[Kn] || (Zn = !1);
  if (
    (!Zn || 'function' != typeof Jn || Jn === Function.prototype) &&
    ((Jn = function () {
      throw TypeError('Incorrect invocation');
    }),
    Zn)
  )
    for (Kn in to) F[Kn] && oe(F[Kn], Jn);
  if ((!Zn || !Qn || Qn === yn) && ((Qn = Jn.prototype), Zn))
    for (Kn in to) F[Kn] && oe(F[Kn].prototype, Qn);
  if ((Zn && ne(pr) !== Qn && oe(pr, Qn), k && !x(Qn, Fn)))
    for (Kn in ((Dn = !0),
    Xr(Qn, Fn, {
      get: function () {
        return j(this) ? this[Xn] : void 0;
      }
    }),
    to))
      F[Kn] && X(F[Kn], Xn, Kn);
  var pr = function (t) {
      if (qn(t)) return t;
      throw TypeError('Target is not a typed array');
    },
    Xr = function (t, e, r) {
      if (k) {
        if (r)
          for (var n in to) {
            var o = F[n];
            o && x(o.prototype, t) && delete o.prototype[t];
          }
        (Qn[t] && !r) || Lt(Qn, t, (!r && Zn && Yn[t]) || e);
      }
    },
    Fn = pe('iterator'),
    Dn = F.Uint8Array,
    eo = wn.values,
    ro = wn.keys,
    no = wn.entries,
    oo = pr,
    pr = Xr,
    Xr = Dn && Dn.prototype[Fn],
    Dn = !!Xr && ('values' == Xr.name || null == Xr.name),
    Xr = function () {
      return eo.call(oo(this));
    };
  pr('entries', function () {
    return no.call(oo(this));
  }),
    pr('keys', function () {
      return ro.call(oo(this));
    }),
    pr('values', Xr, !Dn),
    pr(Fn, Xr, !Dn);
  var io = Object.assign,
    ao = Object.defineProperty,
    Xr =
      !io ||
      A(function () {
        if (
          k &&
          1 !==
            io(
              { b: 1 },
              io(
                ao({}, 'a', {
                  enumerable: !0,
                  get: function () {
                    ao(this, 'b', { value: 3, enumerable: !1 });
                  }
                }),
                { b: 2 }
              )
            ).b
        )
          return 1;
        var t = {},
          e = {},
          r = Symbol(),
          n = 'abcdefghijklmnopqrst';
        return (
          (t[r] = 7),
          n.split('').forEach(function (t) {
            e[t] = t;
          }),
          7 != io({}, t)[r] || ie(io({}, e)).join('') != n
        );
      })
        ? function (t) {
            for (
              var e = jt(t), r = arguments.length, n = 1, o = qt.f, i = B.f;
              n < r;

            )
              for (
                var a,
                  s = V(arguments[n++]),
                  u = o ? ie(s).concat(o(s)) : ie(s),
                  c = u.length,
                  f = 0;
                f < c;

              )
                (a = u[f++]), (k && !i.call(s, a)) || (e[a] = s[a]);
            return e;
          }
        : io;
  _t(
    { target: 'Object', stat: !0, forced: Object.assign !== Xr },
    { assign: Xr }
  );
  Ct.Object.assign;
  var so = B.f,
    Dn = function (s) {
      return function (t) {
        for (var e, r = _(t), n = ie(r), o = n.length, i = 0, a = []; i < o; )
          (e = n[i++]), (k && !so.call(r, e)) || a.push(s ? [e, r[e]] : r[e]);
        return a;
      };
    },
    Xr = { entries: Dn(!0), values: Dn(!1) },
    uo = Xr.entries;
  _t(
    { target: 'Object', stat: !0 },
    {
      entries: function (t) {
        return uo(t);
      }
    }
  );
  Ct.Object.entries;
  var co = Xr.values;
  _t(
    { target: 'Object', stat: !0 },
    {
      values: function (t) {
        return co(t);
      }
    }
  );
  Ct.Object.values;
  function fo(t) {
    if (j((e = t)) && (void 0 !== (r = e[lo]) ? !!r : 'RegExp' == I(e)))
      throw TypeError("The method doesn't accept regular expressions");
    var e, r;
    return t;
  }
  var lo = pe('match'),
    po = pe('match'),
    Dn = function (e) {
      var r = /./;
      try {
        '/./'[e](r);
      } catch (t) {
        try {
          return (r[po] = !1), '/./'[e](r);
        } catch (t) {}
      }
      return !1;
    };
  _t(
    { target: 'String', proto: !0, forced: !Dn('includes') },
    {
      includes: function (t, e) {
        return !!~String(R(this)).indexOf(
          fo(t),
          1 < arguments.length ? e : void 0
        );
      }
    }
  );
  St('String', 'includes');
  var ho,
    Xr = Y.f,
    vo = ''.startsWith,
    yo = Math.min,
    Dn = Dn('startsWith'),
    ho = !(Dn || !(ho = Xr(String.prototype, 'startsWith')) || ho.writable);
  _t(
    { target: 'String', proto: !0, forced: !ho && !Dn },
    {
      startsWith: function (t, e) {
        var r = String(R(this));
        fo(t);
        (e = Tt(yo(1 < arguments.length ? e : void 0, r.length))),
          (t = String(t));
        return vo ? vo.call(r, t, e) : r.slice(e, e + t.length) === t;
      }
    }
  );
  St('String', 'startsWith');
  _t(
    { target: 'String', proto: !0 },
    {
      repeat:
        ''.repeat ||
        function (t) {
          var e = String(R(this)),
            r = '',
            n = At(t);
          if (n < 0 || n == 1 / 0)
            throw RangeError('Wrong number of repetitions');
          for (; 0 < n; (n >>>= 1) && (e += e)) 1 & n && (r += e);
          return r;
        }
    }
  );
  St('String', 'repeat');
  var go,
    mo = pe('species'),
    bo = pe('isConcatSpreadable'),
    wo = 9007199254740991,
    So = 'Maximum allowed index exceeded',
    Dn =
      51 <= jr ||
      !A(function () {
        var t = [];
        return (t[bo] = !1), t.concat()[0] !== t;
      }),
    St =
      ((go = 'concat'),
      51 <= jr ||
        !A(function () {
          var t = [];
          return (
            ((t.constructor = {})[mo] = function () {
              return { foo: 1 };
            }),
            1 !== t[go](Boolean).foo
          );
        }));
  _t(
    { target: 'Array', proto: !0, forced: !Dn || !St },
    {
      concat: function () {
        for (
          var t,
            e,
            r,
            n = jt(this),
            o = _n(n, 0),
            i = 0,
            a = -1,
            s = arguments.length;
          a < s;
          a++
        )
          if (
            (function (t) {
              if (!j(t)) return !1;
              var e = t[bo];
              return void 0 !== e ? !!e : Pn(t);
            })((r = -1 === a ? n : arguments[a]))
          ) {
            if (((e = Tt(r.length)), wo < i + e)) throw TypeError(So);
            for (t = 0; t < e; t++, i++) t in r && zn(o, i, r[t]);
          } else {
            if (wo <= i) throw TypeError(So);
            zn(o, i++, r);
          }
        return (o.length = i), o;
      }
    }
  );
  function Eo(t) {
    var e = Ct.Symbol || (Ct.Symbol = {});
    x(e, t) || jo(e, t, { value: _o.f(t) });
  }
  function Oo(t, e) {
    var r = (Vo[t] = ye(ko[Do]));
    return (
      Lo(r, { type: No, tag: t, description: e }), k || (r.description = e), r
    );
  }
  function Ao(e, t) {
    D(e);
    var r = _(t),
      t = ie(r).concat(Xo(r));
    return (
      Po(t, function (t) {
        (k && !Qo.call(r, t)) || Jo(e, t, r[t]);
      }),
      e
    );
  }
  var To = Wt.f,
    Io = {}.toString,
    Ro =
      'object' == typeof window && window && Object.getOwnPropertyNames
        ? Object.getOwnPropertyNames(window)
        : [],
    St = {
      f: function (t) {
        return Ro && '[object Window]' == Io.call(t)
          ? (function (t) {
              try {
                return To(t);
              } catch (t) {
                return Ro.slice();
              }
            })(t)
          : To(_(t));
      }
    },
    _o = { f: pe },
    jo = Q.f,
    Po = qr.forEach,
    xo = bt('hidden'),
    No = 'Symbol',
    Do = 'prototype',
    qr = pe('toPrimitive'),
    Lo = Dt.set,
    Co = Dt.getterFor(No),
    Fo = Object[Do],
    ko = F.Symbol,
    Mo = Ot('JSON', 'stringify'),
    Uo = Y.f,
    Bo = Q.f,
    Ho = St.f,
    zo = B.f,
    Vo = vt('symbols'),
    Go = vt('op-symbols'),
    Wo = vt('string-to-symbol-registry'),
    qo = vt('symbol-to-string-registry'),
    bt = vt('wks'),
    vt = F.QObject,
    Ko = !vt || !vt[Do] || !vt[Do].findChild,
    $o =
      k &&
      A(function () {
        return (
          7 !=
          ye(
            Bo({}, 'a', {
              get: function () {
                return Bo(this, 'a', { value: 7 }).a;
              }
            })
          ).a
        );
      })
        ? function (t, e, r) {
            var n = Uo(Fo, e);
            n && delete Fo[e], Bo(t, e, r), n && t !== Fo && Bo(Fo, e, n);
          }
        : Bo,
    Yo = M
      ? function (t) {
          return 'symbol' == typeof t;
        }
      : function (t) {
          return Object(t) instanceof ko;
        },
    Jo = function (t, e, r) {
      t === Fo && Jo(Go, e, r), D(t);
      e = P(e, !0);
      return (
        D(r),
        x(Vo, e)
          ? (r.enumerable
              ? (x(t, xo) && t[xo][e] && (t[xo][e] = !1),
                (r = ye(r, { enumerable: T(0, !1) })))
              : (x(t, xo) || Bo(t, xo, T(1, {})), (t[xo][e] = !0)),
            $o(t, e, r))
          : Bo(t, e, r)
      );
    },
    Qo = function (t) {
      var e = P(t, !0),
        t = zo.call(this, e);
      return (
        !(this === Fo && x(Vo, e) && !x(Go, e)) &&
        (!(t || !x(this, e) || !x(Vo, e) || (x(this, xo) && this[xo][e])) || t)
      );
    },
    vt = function (t, e) {
      var r = _(t),
        t = P(e, !0);
      if (r !== Fo || !x(Vo, t) || x(Go, t)) {
        e = Uo(r, t);
        return (
          !e || !x(Vo, t) || (x(r, xo) && r[xo][t]) || (e.enumerable = !0), e
        );
      }
    },
    M = function (t) {
      var t = Ho(_(t)),
        e = [];
      return (
        Po(t, function (t) {
          x(Vo, t) || x(wt, t) || e.push(t);
        }),
        e
      );
    },
    Xo = function (t) {
      var e = t === Fo,
        t = Ho(e ? Go : _(t)),
        r = [];
      return (
        Po(t, function (t) {
          !x(Vo, t) || (e && !x(Fo, t)) || r.push(Vo[t]);
        }),
        r
      );
    };
  ge ||
    (Lt(
      (ko = function (t) {
        if (this instanceof ko) throw TypeError('Symbol is not a constructor');
        var t = arguments.length && void 0 !== t ? String(t) : void 0,
          e = rt(t),
          r = function (t) {
            this === Fo && r.call(Go, t),
              x(this, xo) && x(this[xo], e) && (this[xo][e] = !1),
              $o(this, e, T(1, t));
          };
        return k && Ko && $o(Fo, e, { configurable: !0, set: r }), Oo(e, t);
      })[Do],
      'toString',
      function () {
        return Co(this).tag;
      }
    ),
    Lt(ko, 'withoutSetter', function (t) {
      return Oo(rt(t), t);
    }),
    (B.f = Qo),
    (Q.f = Jo),
    (Y.f = vt),
    (Wt.f = St.f = M),
    (qt.f = Xo),
    (_o.f = function (t) {
      return Oo(pe(t), t);
    }),
    k &&
      (Bo(ko[Do], 'description', {
        configurable: !0,
        get: function () {
          return Co(this).description;
        }
      }),
      Lt(Fo, 'propertyIsEnumerable', Qo, { unsafe: !0 }))),
    _t({ global: !0, wrap: !0, forced: !ge, sham: !ge }, { Symbol: ko }),
    Po(ie(bt), function (t) {
      Eo(t);
    }),
    _t(
      { target: No, stat: !0, forced: !ge },
      {
        for: function (t) {
          var e = String(t);
          if (x(Wo, e)) return Wo[e];
          t = ko(e);
          return (Wo[e] = t), (qo[t] = e), t;
        },
        keyFor: function (t) {
          if (!Yo(t)) throw TypeError(t + ' is not a symbol');
          if (x(qo, t)) return qo[t];
        },
        useSetter: function () {
          Ko = !0;
        },
        useSimple: function () {
          Ko = !1;
        }
      }
    ),
    _t(
      { target: 'Object', stat: !0, forced: !ge, sham: !k },
      {
        create: function (t, e) {
          return void 0 === e ? ye(t) : Ao(ye(t), e);
        },
        defineProperty: Jo,
        defineProperties: Ao,
        getOwnPropertyDescriptor: vt
      }
    ),
    _t(
      { target: 'Object', stat: !0, forced: !ge },
      { getOwnPropertyNames: M, getOwnPropertySymbols: Xo }
    ),
    _t(
      {
        target: 'Object',
        stat: !0,
        forced: A(function () {
          qt.f(1);
        })
      },
      {
        getOwnPropertySymbols: function (t) {
          return qt.f(jt(t));
        }
      }
    ),
    Mo &&
      ((li =
        !ge ||
        A(function () {
          var t = ko();
          return (
            '[null]' != Mo([t]) || '{}' != Mo({ a: t }) || '{}' != Mo(Object(t))
          );
        })),
      _t(
        { target: 'JSON', stat: !0, forced: li },
        {
          stringify: function (t, e) {
            for (var r, n = [t], o = 1; o < arguments.length; )
              n.push(arguments[o++]);
            if ((j((r = e)) || void 0 !== t) && !Yo(t))
              return (
                Pn(e) ||
                  (e = function (t, e) {
                    if (
                      ('function' == typeof r && (e = r.call(this, t, e)),
                      !Yo(e))
                    )
                      return e;
                  }),
                (n[1] = e),
                Mo.apply(null, n)
              );
          }
        }
      )),
    ko[Do][qr] || X(ko[Do], qr, ko[Do].valueOf),
    Le(ko, No),
    (wt[xo] = !0),
    Eo('asyncIterator');
  var Zo,
    ti,
    ei,
    ri,
    ni,
    vt = Q.f,
    oi = F.Symbol;
  !k ||
    'function' != typeof oi ||
    ('description' in oi.prototype && void 0 === oi().description) ||
    ((Zo = {}),
    Rt(
      (ti = function (t) {
        var e = arguments.length < 1 || void 0 === t ? void 0 : String(t),
          t = this instanceof ti ? new oi(e) : void 0 === e ? oi() : oi(e);
        return '' === e && (Zo[t] = !0), t;
      }),
      oi
    ),
    ((di = ti.prototype = oi.prototype).constructor = ti),
    (ei = di.toString),
    (ri = 'Symbol(test)' == String(oi('test'))),
    (ni = /^Symbol\((.*)\)[^)]+$/),
    vt(di, 'description', {
      configurable: !0,
      get: function () {
        var t = j(this) ? this.valueOf() : this,
          e = ei.call(t);
        if (x(Zo, t)) return '';
        e = ri ? e.slice(7, -1) : e.replace(ni, '$1');
        return '' === e ? void 0 : e;
      }
    }),
    _t({ global: !0, forced: !0 }, { Symbol: ti })),
    Eo('hasInstance'),
    Eo('isConcatSpreadable'),
    Eo('iterator'),
    Eo('match'),
    Eo('matchAll'),
    Eo('replace'),
    Eo('search'),
    Eo('species'),
    Eo('split'),
    Eo('toPrimitive'),
    Eo('toStringTag'),
    Eo('unscopables'),
    Le(F.JSON, 'JSON', !0),
    Le(Math, 'Math', !0),
    _t({ global: !0 }, { Reflect: {} }),
    Le(F.Reflect, 'Reflect', !0);
  Ct.Symbol;
  Eo('asyncDispose'),
    Eo('dispose'),
    Eo('observable'),
    Eo('patternMatch'),
    Eo('replaceAll');
  _o.f('iterator');
  var ii = !A(function () {
      return Object.isExtensible(Object.preventExtensions({}));
    }),
    ai = O(function (t) {
      function r(t) {
        e(t, n, { value: { objectID: 'O' + ++o, weakData: {} } });
      }
      var e = Q.f,
        n = rt('meta'),
        o = 0,
        i =
          Object.isExtensible ||
          function () {
            return !0;
          },
        a = (t.exports = {
          REQUIRED: !1,
          fastKey: function (t, e) {
            if (!j(t))
              return 'symbol' == typeof t
                ? t
                : ('string' == typeof t ? 'S' : 'P') + t;
            if (!x(t, n)) {
              if (!i(t)) return 'F';
              if (!e) return 'E';
              r(t);
            }
            return t[n].objectID;
          },
          getWeakData: function (t, e) {
            if (!x(t, n)) {
              if (!i(t)) return !0;
              if (!e) return !1;
              r(t);
            }
            return t[n].weakData;
          },
          onFreeze: function (t) {
            return ii && a.REQUIRED && i(t) && !x(t, n) && r(t), t;
          }
        });
      wt[n] = !0;
    }),
    M = function (a, t, e) {
      function r(t) {
        var r = h[t];
        Lt(
          h,
          t,
          'add' == t
            ? function (t) {
                return r.call(this, 0 === t ? 0 : t), this;
              }
            : 'delete' == t
            ? function (t) {
                return !(f && !j(t)) && r.call(this, 0 === t ? 0 : t);
              }
            : 'get' == t
            ? function (t) {
                return f && !j(t) ? void 0 : r.call(this, 0 === t ? 0 : t);
              }
            : 'has' == t
            ? function (t) {
                return !(f && !j(t)) && r.call(this, 0 === t ? 0 : t);
              }
            : function (t, e) {
                return r.call(this, 0 === t ? 0 : t, e), this;
              }
        );
      }
      var n,
        o,
        i,
        s,
        u,
        c = -1 !== a.indexOf('Map'),
        f = -1 !== a.indexOf('Weak'),
        l = c ? 'set' : 'add',
        p = F[a],
        h = p && p.prototype,
        d = p,
        v = {};
      return (
        Zt(
          a,
          'function' != typeof p ||
            !(
              f ||
              (h.forEach &&
                !A(function () {
                  new p().entries().next();
                }))
            )
        )
          ? ((d = e.getConstructor(t, a, c, l)), (ai.REQUIRED = !0))
          : Zt(a, !0) &&
            ((o = (n = new d())[l](f ? {} : -0, 1) != n),
            (i = A(function () {
              n.has(1);
            })),
            (s = We(function (t) {
              new p(t);
            })),
            (u =
              !f &&
              A(function () {
                for (var t = new p(), e = 5; e--; ) t[l](e, e);
                return !t.has(-0);
              })),
            s ||
              (((d = t(function (t, e) {
                Fe(t, d, a);
                var r,
                  n,
                  o,
                  i,
                  r =
                    ((r = new p()),
                    (n = t),
                    (t = d),
                    oe &&
                      'function' == typeof (o = n.constructor) &&
                      o !== t &&
                      j((i = o.prototype)) &&
                      i !== t.prototype &&
                      oe(r, i),
                    r);
                return null != e && Re(e, r[l], { that: r, AS_ENTRIES: c }), r;
              })).prototype = h).constructor = d),
            (i || u) && (r('delete'), r('has'), c && r('get')),
            (u || o) && r(l),
            f && h.clear && delete h.clear),
        (v[a] = d),
        _t({ global: !0, forced: d != p }, v),
        Le(d, a),
        f || e.setStrong(d, a, c),
        d
      );
    },
    si = Q.f,
    ui = ai.fastKey,
    ci = Dt.set,
    fi = Dt.getterFor,
    li = {
      getConstructor: function (t, r, n, o) {
        function i(t, e, r) {
          var n,
            o = s(t),
            i = u(t, e);
          return (
            i
              ? (i.value = r)
              : ((o.last = i =
                  {
                    index: (n = ui(e, !0)),
                    key: e,
                    value: r,
                    previous: (r = o.last),
                    next: void 0,
                    removed: !1
                  }),
                o.first || (o.first = i),
                r && (r.next = i),
                k ? o.size++ : t.size++,
                'F' !== n && (o.index[n] = i)),
            t
          );
        }
        var a = t(function (t, e) {
            Fe(t, a, r),
              ci(t, {
                type: r,
                index: ye(null),
                first: void 0,
                last: void 0,
                size: 0
              }),
              k || (t.size = 0),
              null != e && Re(e, t[o], { that: t, AS_ENTRIES: n });
          }),
          s = fi(r),
          u = function (t, e) {
            var r,
              n = s(t),
              t = ui(e);
            if ('F' !== t) return n.index[t];
            for (r = n.first; r; r = r.next) if (r.key == e) return r;
          };
        return (
          De(a.prototype, {
            clear: function () {
              for (var t = s(this), e = t.index, r = t.first; r; )
                (r.removed = !0),
                  r.previous && (r.previous = r.previous.next = void 0),
                  delete e[r.index],
                  (r = r.next);
              (t.first = t.last = void 0), k ? (t.size = 0) : (this.size = 0);
            },
            delete: function (t) {
              var e,
                r = s(this),
                n = u(this, t);
              return (
                n &&
                  ((e = n.next),
                  (t = n.previous),
                  delete r.index[n.index],
                  (n.removed = !0),
                  t && (t.next = e),
                  e && (e.previous = t),
                  r.first == n && (r.first = e),
                  r.last == n && (r.last = t),
                  k ? r.size-- : this.size--),
                !!n
              );
            },
            forEach: function (t, e) {
              for (
                var r,
                  n = s(this),
                  o = ve(t, 1 < arguments.length ? e : void 0, 3);
                (r = r ? r.next : n.first);

              )
                for (o(r.value, r.key, this); r && r.removed; ) r = r.previous;
            },
            has: function (t) {
              return !!u(this, t);
            }
          }),
          De(
            a.prototype,
            n
              ? {
                  get: function (t) {
                    t = u(this, t);
                    return t && t.value;
                  },
                  set: function (t, e) {
                    return i(this, 0 === t ? 0 : t, e);
                  }
                }
              : {
                  add: function (t) {
                    return i(this, (t = 0 === t ? 0 : t), t);
                  }
                }
          ),
          k &&
            si(a.prototype, 'size', {
              get: function () {
                return s(this).size;
              }
            }),
          a
        );
      },
      setStrong: function (t, e, r) {
        var n = e + ' Iterator',
          o = fi(e),
          i = fi(n);
        en(
          t,
          e,
          function (t, e) {
            ci(this, {
              type: n,
              target: t,
              state: o(t),
              kind: e,
              last: void 0
            });
          },
          function () {
            for (var t = i(this), e = t.kind, r = t.last; r && r.removed; )
              r = r.previous;
            return t.target && (t.last = r = r ? r.next : t.state.first)
              ? 'keys' == e
                ? { value: r.key, done: !1 }
                : 'values' == e
                ? { value: r.value, done: !1 }
                : { value: [r.key, r.value], done: !1 }
              : { value: (t.target = void 0), done: !0 };
          },
          r ? 'entries' : 'values',
          !r,
          !0
        ),
          Ce(e);
      }
    },
    qr =
      (M(
        'Map',
        function (e) {
          return function (t) {
            return e(this, arguments.length ? t : void 0);
          };
        },
        li
      ),
      Ct.Map,
      function (t, e, r) {
        var n,
          o,
          i,
          a = arguments.length,
          s = 1 < a ? e : void 0;
        return (
          de(this),
          (e = void 0 !== s) && de(s),
          null == t
            ? new this()
            : ((n = []),
              e
                ? ((o = 0),
                  (i = ve(s, 2 < a ? r : void 0, 2)),
                  Re(t, function (t) {
                    n.push(i(t, o++));
                  }))
                : Re(t, n.push, { that: n }),
              new this(n))
        );
      });
  _t({ target: 'Map', stat: !0 }, { from: qr });
  vt = function () {
    for (var t = arguments.length, e = new Array(t); t--; ) e[t] = arguments[t];
    return new this(e);
  };
  _t({ target: 'Map', stat: !0 }, { of: vt });
  function pi() {
    for (
      var t, e = D(this), r = de(e.delete), n = !0, o = 0, i = arguments.length;
      o < i;
      o++
    )
      (t = r.call(e, arguments[o])), (n = n && t);
    return !!n;
  }
  _t(
    { target: 'Map', proto: !0, real: !0, forced: dt },
    {
      deleteAll: function () {
        return pi.apply(this, arguments);
      }
    }
  );
  _t(
    { target: 'Map', proto: !0, real: !0, forced: dt },
    {
      emplace: function (t, e) {
        var r = D(this),
          e =
            r.has(t) && 'update' in e
              ? e.update(r.get(t), t, r)
              : e.insert(t, r);
        return r.set(t, e), e;
      }
    }
  );
  function hi(t) {
    return Map.prototype.entries.call(t);
  }
  _t(
    { target: 'Map', proto: !0, real: !0, forced: dt },
    {
      every: function (t, e) {
        var n = D(this),
          r = hi(n),
          o = ve(t, 1 < arguments.length ? e : void 0, 3);
        return !Re(
          r,
          function (t, e, r) {
            if (!o(e, t, n)) return r();
          },
          { AS_ENTRIES: !0, IS_ITERATOR: !0, INTERRUPTED: !0 }
        ).stopped;
      }
    }
  ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        filter: function (t, e) {
          var r = D(this),
            n = hi(r),
            o = ve(t, 1 < arguments.length ? e : void 0, 3),
            i = new (qe(r, Ot('Map')))(),
            a = de(i.set);
          return (
            Re(
              n,
              function (t, e) {
                o(e, t, r) && a.call(i, t, e);
              },
              { AS_ENTRIES: !0, IS_ITERATOR: !0 }
            ),
            i
          );
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        find: function (t, e) {
          var n = D(this),
            r = hi(n),
            o = ve(t, 1 < arguments.length ? e : void 0, 3);
          return Re(
            r,
            function (t, e, r) {
              if (o(e, t, n)) return r(e);
            },
            { AS_ENTRIES: !0, IS_ITERATOR: !0, INTERRUPTED: !0 }
          ).result;
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        findKey: function (t, e) {
          var n = D(this),
            r = hi(n),
            o = ve(t, 1 < arguments.length ? e : void 0, 3);
          return Re(
            r,
            function (t, e, r) {
              if (o(e, t, n)) return r(t);
            },
            { AS_ENTRIES: !0, IS_ITERATOR: !0, INTERRUPTED: !0 }
          ).result;
        }
      }
    ),
    _t(
      { target: 'Map', stat: !0 },
      {
        groupBy: function (t, r) {
          var n = new this();
          de(r);
          var o = de(n.has),
            i = de(n.get),
            a = de(n.set);
          return (
            Re(t, function (t) {
              var e = r(t);
              o.call(n, e) ? i.call(n, e).push(t) : a.call(n, e, [t]);
            }),
            n
          );
        }
      }
    );
  _t(
    { target: 'Map', proto: !0, real: !0, forced: dt },
    {
      includes: function (o) {
        return Re(
          hi(D(this)),
          function (t, e, r) {
            if ((n = e) === (e = o) || (n != n && e != e)) return r();
            var n;
          },
          { AS_ENTRIES: !0, IS_ITERATOR: !0, INTERRUPTED: !0 }
        ).stopped;
      }
    }
  ),
    _t(
      { target: 'Map', stat: !0 },
      {
        keyBy: function (t, e) {
          var r = new this();
          de(e);
          var n = de(r.set);
          return (
            Re(t, function (t) {
              n.call(r, e(t), t);
            }),
            r
          );
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        keyOf: function (n) {
          return Re(
            hi(D(this)),
            function (t, e, r) {
              if (e === n) return r(t);
            },
            { AS_ENTRIES: !0, IS_ITERATOR: !0, INTERRUPTED: !0 }
          ).result;
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        mapKeys: function (t, e) {
          var r = D(this),
            n = hi(r),
            o = ve(t, 1 < arguments.length ? e : void 0, 3),
            i = new (qe(r, Ot('Map')))(),
            a = de(i.set);
          return (
            Re(
              n,
              function (t, e) {
                a.call(i, o(e, t, r), e);
              },
              { AS_ENTRIES: !0, IS_ITERATOR: !0 }
            ),
            i
          );
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        mapValues: function (t, e) {
          var r = D(this),
            n = hi(r),
            o = ve(t, 1 < arguments.length ? e : void 0, 3),
            i = new (qe(r, Ot('Map')))(),
            a = de(i.set);
          return (
            Re(
              n,
              function (t, e) {
                a.call(i, t, o(e, t, r));
              },
              { AS_ENTRIES: !0, IS_ITERATOR: !0 }
            ),
            i
          );
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        merge: function () {
          for (var t = D(this), e = de(t.set), r = 0; r < arguments.length; )
            Re(arguments[r++], e, { that: t, AS_ENTRIES: !0 });
          return t;
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        reduce: function (r, t) {
          var n = D(this),
            e = hi(n),
            o = arguments.length < 2,
            i = o ? void 0 : t;
          if (
            (de(r),
            Re(
              e,
              function (t, e) {
                i = o ? ((o = !1), e) : r(i, e, t, n);
              },
              { AS_ENTRIES: !0, IS_ITERATOR: !0 }
            ),
            o)
          )
            throw TypeError('Reduce of empty map with no initial value');
          return i;
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        some: function (t, e) {
          var n = D(this),
            r = hi(n),
            o = ve(t, 1 < arguments.length ? e : void 0, 3);
          return Re(
            r,
            function (t, e, r) {
              if (o(e, t, n)) return r();
            },
            { AS_ENTRIES: !0, IS_ITERATOR: !0, INTERRUPTED: !0 }
          ).stopped;
        }
      }
    ),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      {
        update: function (t, e, r) {
          var n = D(this),
            o = arguments.length;
          de(e);
          var i = n.has(t);
          if (!i && o < 3) throw TypeError('Updating absent value');
          r = i ? n.get(t) : de(2 < o ? r : void 0)(t, n);
          return n.set(t, e(r, t, n)), n;
        }
      }
    );
  var di = function (t, e, r) {
    var n,
      o = D(this),
      r = 2 < arguments.length ? r : void 0;
    if ('function' != typeof e && 'function' != typeof r)
      throw TypeError('At least one callback required');
    return (
      o.has(t)
        ? ((n = o.get(t)), 'function' == typeof e && ((n = e(n)), o.set(t, n)))
        : 'function' == typeof r && ((n = r()), o.set(t, n)),
      n
    );
  };
  _t({ target: 'Map', proto: !0, real: !0, forced: dt }, { upsert: di }),
    _t(
      { target: 'Map', proto: !0, real: !0, forced: dt },
      { updateOrInsert: di }
    );
  M(
    'Set',
    function (e) {
      return function (t) {
        return e(this, arguments.length ? t : void 0);
      };
    },
    li
  ),
    Ct.Set;
  _t({ target: 'Set', stat: !0 }, { from: qr }),
    _t({ target: 'Set', stat: !0 }, { of: vt });
  _t(
    { target: 'Set', proto: !0, real: !0, forced: dt },
    {
      addAll: function () {
        return function () {
          for (
            var t = D(this), e = de(t.add), r = 0, n = arguments.length;
            r < n;
            r++
          )
            e.call(t, arguments[r]);
          return t;
        }.apply(this, arguments);
      }
    }
  ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        deleteAll: function () {
          return pi.apply(this, arguments);
        }
      }
    );
  function vi(t) {
    return Set.prototype.values.call(t);
  }
  _t(
    { target: 'Set', proto: !0, real: !0, forced: dt },
    {
      every: function (t, e) {
        var r = D(this),
          n = vi(r),
          o = ve(t, 1 < arguments.length ? e : void 0, 3);
        return !Re(
          n,
          function (t, e) {
            if (!o(t, t, r)) return e();
          },
          { IS_ITERATOR: !0, INTERRUPTED: !0 }
        ).stopped;
      }
    }
  ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        difference: function (t) {
          var e = D(this),
            r = new (qe(e, Ot('Set')))(e),
            n = de(r.delete);
          return (
            Re(t, function (t) {
              n.call(r, t);
            }),
            r
          );
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        filter: function (t, e) {
          var r = D(this),
            n = vi(r),
            o = ve(t, 1 < arguments.length ? e : void 0, 3),
            i = new (qe(r, Ot('Set')))(),
            a = de(i.add);
          return (
            Re(
              n,
              function (t) {
                o(t, t, r) && a.call(i, t);
              },
              { IS_ITERATOR: !0 }
            ),
            i
          );
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        find: function (t, e) {
          var r = D(this),
            n = vi(r),
            o = ve(t, 1 < arguments.length ? e : void 0, 3);
          return Re(
            n,
            function (t, e) {
              if (o(t, t, r)) return e(t);
            },
            { IS_ITERATOR: !0, INTERRUPTED: !0 }
          ).result;
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        intersection: function (t) {
          var e = D(this),
            r = new (qe(e, Ot('Set')))(),
            n = de(e.has),
            o = de(r.add);
          return (
            Re(t, function (t) {
              n.call(e, t) && o.call(r, t);
            }),
            r
          );
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        isDisjointFrom: function (t) {
          var r = D(this),
            n = de(r.has);
          return !Re(
            t,
            function (t, e) {
              if (!0 === n.call(r, t)) return e();
            },
            { INTERRUPTED: !0 }
          ).stopped;
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        isSubsetOf: function (t) {
          var e = (function (t) {
              var e = Ae(t);
              if ('function' != typeof e)
                throw TypeError(String(t) + ' is not iterable');
              return D(e.call(t));
            })(this),
            r = D(t),
            n = r.has;
          return (
            'function' != typeof n &&
              ((r = new (Ot('Set'))(t)), (n = de(r.has))),
            !Re(
              e,
              function (t, e) {
                if (!1 === n.call(r, t)) return e();
              },
              { IS_ITERATOR: !0, INTERRUPTED: !0 }
            ).stopped
          );
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        isSupersetOf: function (t) {
          var r = D(this),
            n = de(r.has);
          return !Re(
            t,
            function (t, e) {
              if (!1 === n.call(r, t)) return e();
            },
            { INTERRUPTED: !0 }
          ).stopped;
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        join: function (t) {
          var e = D(this),
            r = vi(e),
            e = void 0 === t ? ',' : String(t),
            t = [];
          return Re(r, t.push, { that: t, IS_ITERATOR: !0 }), t.join(e);
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        map: function (t, e) {
          var r = D(this),
            n = vi(r),
            o = ve(t, 1 < arguments.length ? e : void 0, 3),
            i = new (qe(r, Ot('Set')))(),
            a = de(i.add);
          return (
            Re(
              n,
              function (t) {
                a.call(i, o(t, t, r));
              },
              { IS_ITERATOR: !0 }
            ),
            i
          );
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        reduce: function (e, t) {
          var r = D(this),
            n = vi(r),
            o = arguments.length < 2,
            i = o ? void 0 : t;
          if (
            (de(e),
            Re(
              n,
              function (t) {
                i = o ? ((o = !1), t) : e(i, t, t, r);
              },
              { IS_ITERATOR: !0 }
            ),
            o)
          )
            throw TypeError('Reduce of empty set with no initial value');
          return i;
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        some: function (t, e) {
          var r = D(this),
            n = vi(r),
            o = ve(t, 1 < arguments.length ? e : void 0, 3);
          return Re(
            n,
            function (t, e) {
              if (o(t, t, r)) return e();
            },
            { IS_ITERATOR: !0, INTERRUPTED: !0 }
          ).stopped;
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        symmetricDifference: function (t) {
          var e = D(this),
            r = new (qe(e, Ot('Set')))(e),
            n = de(r.delete),
            o = de(r.add);
          return (
            Re(t, function (t) {
              n.call(r, t) || o.call(r, t);
            }),
            r
          );
        }
      }
    ),
    _t(
      { target: 'Set', proto: !0, real: !0, forced: dt },
      {
        union: function (t) {
          var e = D(this),
            e = new (qe(e, Ot('Set')))(e);
          return Re(t, de(e.add), { that: e }), e;
        }
      }
    );
  var yi = Math.floor;
  _t(
    { target: 'Number', stat: !0 },
    {
      isInteger: function (t) {
        return !j(t) && isFinite(t) && yi(t) === t;
      }
    }
  );
  Ct.Number.isInteger;
  _t(
    { target: 'Number', stat: !0 },
    {
      isNaN: function (t) {
        return t != t;
      }
    }
  );
  Ct.Number.isNaN;
  var gi = function (t, e) {
    return (gi =
      Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array &&
        function (t, e) {
          t.__proto__ = e;
        }) ||
      function (t, e) {
        for (var r in e) e.hasOwnProperty(r) && (t[r] = e[r]);
      })(t, e);
  };
  var mi = function () {
    return (mi =
      Object.assign ||
      function (t) {
        for (var e, r = 1, n = arguments.length; r < n; r++)
          for (var o in (e = arguments[r]))
            Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
        return t;
      }).apply(this, arguments);
  };
  function bi(t, a, s, u) {
    return new (s = s || Promise)(function (r, e) {
      function n(t) {
        try {
          i(u.next(t));
        } catch (t) {
          e(t);
        }
      }
      function o(t) {
        try {
          i(u.throw(t));
        } catch (t) {
          e(t);
        }
      }
      function i(t) {
        var e;
        t.done
          ? r(t.value)
          : ((e = t.value) instanceof s
              ? e
              : new s(function (t) {
                  t(e);
                })
            ).then(n, o);
      }
      i((u = u.apply(t, a || [])).next());
    });
  }
  function wi(r, n) {
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
          if (o) throw new TypeError('Generator is already executing.');
          for (; s; )
            try {
              if (
                ((o = 1),
                i &&
                  (a =
                    2 & e[0]
                      ? i.return
                      : e[0]
                      ? i.throw || ((a = i.return) && a.call(i), 0)
                      : i.next) &&
                  !(a = a.call(i, e[1])).done)
              )
                return a;
              switch (((i = 0), a && (e = [2 & e[0], a.value]), e[0])) {
                case 0:
                case 1:
                  a = e;
                  break;
                case 4:
                  return s.label++, { value: e[1], done: !1 };
                case 5:
                  s.label++, (i = e[1]), (e = [0]);
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
              e = n.call(r, s);
            } catch (t) {
              (e = [6, t]), (i = 0);
            } finally {
              o = a = 0;
            }
          if (5 & e[0]) throw e[1];
          return { value: e[0] ? e[1] : void 0, done: !0 };
        })([e, t]);
      };
    }
  }
  function Si(t) {
    var e = 'function' == typeof Symbol && Symbol.iterator,
      r = e && t[e],
      n = 0;
    if (r) return r.call(t);
    if (t && 'number' == typeof t.length)
      return {
        next: function () {
          return (
            t && n >= t.length && (t = void 0), { value: t && t[n++], done: !t }
          );
        }
      };
    throw new TypeError(
      e ? 'Object is not iterable.' : 'Symbol.iterator is not defined.'
    );
  }
  function Ei(t, e) {
    var r = 'function' == typeof Symbol && t[Symbol.iterator];
    if (!r) return t;
    var n,
      o,
      i = r.call(t),
      a = [];
    try {
      for (; (void 0 === e || 0 < e--) && !(n = i.next()).done; )
        a.push(n.value);
    } catch (t) {
      o = { error: t };
    } finally {
      try {
        n && !n.done && (r = i.return) && r.call(i);
      } finally {
        if (o) throw o.error;
      }
    }
    return a;
  }
  function Oi(t, e) {
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
    for (var r in e)
      e.hasOwnProperty(r) && '__proto__' !== r && (t[r] = Oi(t[r], e[r]));
    return t;
  }
  var Ai =
    ((Ti.prototype.wrapCallback = function (r) {
      var n = this;
      return function (t, e) {
        t ? n.reject(t) : n.resolve(e),
          'function' == typeof r &&
            (n.promise.catch(function () {}), 1 === r.length ? r(t) : r(t, e));
      };
    }),
    Ti);
  function Ti() {
    var r = this;
    (this.reject = function () {}),
      (this.resolve = function () {}),
      (this.promise = new Promise(function (t, e) {
        (r.resolve = t), (r.reject = e);
      }));
  }
  var Ii,
    Ri,
    _i,
    ji = 'FirebaseError',
    Pi =
      ((Ii = Error),
      gi((Ri = Ni), (_i = Ii)),
      (Ri.prototype =
        null === _i
          ? Object.create(_i)
          : ((xi.prototype = _i.prototype), new xi())),
      Ni);
  function xi() {
    this.constructor = Ri;
  }
  function Ni(t, e, r) {
    e = Ii.call(this, e) || this;
    return (
      (e.code = t),
      (e.customData = r),
      (e.name = ji),
      Object.setPrototypeOf(e, Ni.prototype),
      Error.captureStackTrace &&
        Error.captureStackTrace(e, Di.prototype.create),
      e
    );
  }
  var Di =
    ((Li.prototype.create = function (t) {
      for (var e = [], r = 1; r < arguments.length; r++)
        e[r - 1] = arguments[r];
      var n,
        o = e[0] || {},
        i = this.service + '/' + t,
        t = this.errors[t],
        t = t
          ? ((n = o),
            t.replace(Ci, function (t, e) {
              var r = n[e];
              return null != r ? String(r) : '<' + e + '?>';
            }))
          : 'Error',
        t = this.serviceName + ': ' + t + ' (' + i + ').';
      return new Pi(i, t, o);
    }),
    Li);
  function Li(t, e, r) {
    (this.service = t), (this.serviceName = e), (this.errors = r);
  }
  var Ci = /\{\$([^}]+)}/g;
  function Fi(t, e) {
    e = new ki(t, e);
    return e.subscribe.bind(e);
  }
  var ki =
    ((Mi.prototype.next = function (e) {
      this.forEachObserver(function (t) {
        t.next(e);
      });
    }),
    (Mi.prototype.error = function (e) {
      this.forEachObserver(function (t) {
        t.error(e);
      }),
        this.close(e);
    }),
    (Mi.prototype.complete = function () {
      this.forEachObserver(function (t) {
        t.complete();
      }),
        this.close();
    }),
    (Mi.prototype.subscribe = function (t, e, r) {
      var n,
        o = this;
      if (void 0 === t && void 0 === e && void 0 === r)
        throw new Error('Missing Observer.');
      void 0 ===
        (n = (function (t, e) {
          if ('object' != typeof t || null === t) return !1;
          for (var r = 0, n = e; r < n.length; r++) {
            var o = n[r];
            if (o in t && 'function' == typeof t[o]) return !0;
          }
          return !1;
        })(t, ['next', 'error', 'complete'])
          ? t
          : { next: t, error: e, complete: r }).next && (n.next = Ui),
        void 0 === n.error && (n.error = Ui),
        void 0 === n.complete && (n.complete = Ui);
      r = this.unsubscribeOne.bind(this, this.observers.length);
      return (
        this.finalized &&
          this.task.then(function () {
            try {
              o.finalError ? n.error(o.finalError) : n.complete();
            } catch (t) {}
          }),
        this.observers.push(n),
        r
      );
    }),
    (Mi.prototype.unsubscribeOne = function (t) {
      void 0 !== this.observers &&
        void 0 !== this.observers[t] &&
        (delete this.observers[t],
        --this.observerCount,
        0 === this.observerCount &&
          void 0 !== this.onNoObservers &&
          this.onNoObservers(this));
    }),
    (Mi.prototype.forEachObserver = function (t) {
      if (!this.finalized)
        for (var e = 0; e < this.observers.length; e++) this.sendOne(e, t);
    }),
    (Mi.prototype.sendOne = function (t, e) {
      var r = this;
      this.task.then(function () {
        if (void 0 !== r.observers && void 0 !== r.observers[t])
          try {
            e(r.observers[t]);
          } catch (t) {
            'undefined' != typeof console && console.error && console.error(t);
          }
      });
    }),
    (Mi.prototype.close = function (t) {
      var e = this;
      this.finalized ||
        ((this.finalized = !0),
        void 0 !== t && (this.finalError = t),
        this.task.then(function () {
          (e.observers = void 0), (e.onNoObservers = void 0);
        }));
    }),
    Mi);
  function Mi(t, e) {
    var r = this;
    (this.observers = []),
      (this.unsubscribes = []),
      (this.observerCount = 0),
      (this.task = Promise.resolve()),
      (this.finalized = !1),
      (this.onNoObservers = e),
      this.task
        .then(function () {
          t(r);
        })
        .catch(function (t) {
          r.error(t);
        });
  }
  function Ui() {}
  var Bi =
    ((Hi.prototype.setInstantiationMode = function (t) {
      return (this.instantiationMode = t), this;
    }),
    (Hi.prototype.setMultipleInstances = function (t) {
      return (this.multipleInstances = t), this;
    }),
    (Hi.prototype.setServiceProps = function (t) {
      return (this.serviceProps = t), this;
    }),
    Hi);
  function Hi(t, e, r) {
    (this.name = t),
      (this.instanceFactory = e),
      (this.type = r),
      (this.multipleInstances = !1),
      (this.serviceProps = {}),
      (this.instantiationMode = 'LAZY');
  }
  var zi = '[DEFAULT]',
    Vi =
      ((Gi.prototype.get = function (t) {
        void 0 === t && (t = zi);
        var e = this.normalizeInstanceIdentifier(t);
        if (!this.instancesDeferred.has(e)) {
          var r = new Ai();
          this.instancesDeferred.set(e, r);
          try {
            var n = this.getOrInitializeService(e);
            n && r.resolve(n);
          } catch (t) {}
        }
        return this.instancesDeferred.get(e).promise;
      }),
      (Gi.prototype.getImmediate = function (t) {
        var e = mi({ identifier: zi, optional: !1 }, t),
          t = e.identifier,
          r = e.optional,
          n = this.normalizeInstanceIdentifier(t);
        try {
          var o = this.getOrInitializeService(n);
          if (o) return o;
          if (r) return null;
          throw Error('Service ' + this.name + ' is not available');
        } catch (t) {
          if (r) return null;
          throw t;
        }
      }),
      (Gi.prototype.getComponent = function () {
        return this.component;
      }),
      (Gi.prototype.setComponent = function (t) {
        var e, r;
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
            this.getOrInitializeService(zi);
          } catch (t) {}
        try {
          for (
            var n = Si(this.instancesDeferred.entries()), o = n.next();
            !o.done;
            o = n.next()
          ) {
            var i = Ei(o.value, 2),
              a = i[0],
              s = i[1],
              u = this.normalizeInstanceIdentifier(a);
            try {
              var c = this.getOrInitializeService(u);
              s.resolve(c);
            } catch (t) {}
          }
        } catch (t) {
          e = { error: t };
        } finally {
          try {
            o && !o.done && (r = n.return) && r.call(n);
          } finally {
            if (e) throw e.error;
          }
        }
      }),
      (Gi.prototype.clearInstance = function (t) {
        void 0 === t && (t = zi),
          this.instancesDeferred.delete(t),
          this.instances.delete(t);
      }),
      (Gi.prototype.delete = function () {
        return bi(this, void 0, void 0, function () {
          var e;
          return wi(this, function (t) {
            switch (t.label) {
              case 0:
                return (
                  (e = Array.from(this.instances.values())),
                  [
                    4,
                    Promise.all(
                      (function () {
                        for (var t = [], e = 0; e < arguments.length; e++)
                          t = t.concat(Ei(arguments[e]));
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
      (Gi.prototype.isComponentSet = function () {
        return null != this.component;
      }),
      (Gi.prototype.getOrInitializeService = function (t) {
        var e,
          r = this.instances.get(t);
        return (
          !r &&
            this.component &&
            ((r = this.component.instanceFactory(
              this.container,
              (e = t) === zi ? void 0 : e
            )),
            this.instances.set(t, r)),
          r || null
        );
      }),
      (Gi.prototype.normalizeInstanceIdentifier = function (t) {
        return !this.component || this.component.multipleInstances ? t : zi;
      }),
      Gi);
  function Gi(t, e) {
    (this.name = t),
      (this.container = e),
      (this.component = null),
      (this.instances = new Map()),
      (this.instancesDeferred = new Map());
  }
  var Wi =
    ((qi.prototype.addComponent = function (t) {
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
    (qi.prototype.addOrOverwriteComponent = function (t) {
      this.getProvider(t.name).isComponentSet() &&
        this.providers.delete(t.name),
        this.addComponent(t);
    }),
    (qi.prototype.getProvider = function (t) {
      if (this.providers.has(t)) return this.providers.get(t);
      var e = new Vi(t, this);
      return this.providers.set(t, e), e;
    }),
    (qi.prototype.getProviders = function () {
      return Array.from(this.providers.values());
    }),
    qi);
  function qi(t) {
    (this.name = t), (this.providers = new Map());
  }
  function Ki() {
    for (var t = 0, e = 0, r = arguments.length; e < r; e++)
      t += arguments[e].length;
    for (var n = Array(t), o = 0, e = 0; e < r; e++)
      for (var i = arguments[e], a = 0, s = i.length; a < s; a++, o++)
        n[o] = i[a];
    return n;
  }
  var $i,
    Yi = [];
  ((qr = $i = $i || {})[(qr.DEBUG = 0)] = 'DEBUG'),
    (qr[(qr.VERBOSE = 1)] = 'VERBOSE'),
    (qr[(qr.INFO = 2)] = 'INFO'),
    (qr[(qr.WARN = 3)] = 'WARN'),
    (qr[(qr.ERROR = 4)] = 'ERROR'),
    (qr[(qr.SILENT = 5)] = 'SILENT');
  function Ji(t, e) {
    for (var r = [], n = 2; n < arguments.length; n++) r[n - 2] = arguments[n];
    if (!(e < t.logLevel)) {
      var o = new Date().toISOString(),
        i = Zi[e];
      if (!i)
        throw new Error(
          'Attempted to log a message with an invalid logType (value: ' +
            e +
            ')'
        );
      console[i].apply(console, Ki(['[' + o + ']  ' + t.name + ':'], r));
    }
  }
  var Qi = {
      debug: $i.DEBUG,
      verbose: $i.VERBOSE,
      info: $i.INFO,
      warn: $i.WARN,
      error: $i.ERROR,
      silent: $i.SILENT
    },
    Xi = $i.INFO,
    Zi =
      (((vt = {})[$i.DEBUG] = 'log'),
      (vt[$i.VERBOSE] = 'log'),
      (vt[$i.INFO] = 'info'),
      (vt[$i.WARN] = 'warn'),
      (vt[$i.ERROR] = 'error'),
      vt),
    dt =
      (Object.defineProperty(ta.prototype, 'logLevel', {
        get: function () {
          return this._logLevel;
        },
        set: function (t) {
          if (!(t in $i))
            throw new TypeError(
              'Invalid value "' + t + '" assigned to `logLevel`'
            );
          this._logLevel = t;
        },
        enumerable: !1,
        configurable: !0
      }),
      (ta.prototype.setLogLevel = function (t) {
        this._logLevel = 'string' == typeof t ? Qi[t] : t;
      }),
      Object.defineProperty(ta.prototype, 'logHandler', {
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
      Object.defineProperty(ta.prototype, 'userLogHandler', {
        get: function () {
          return this._userLogHandler;
        },
        set: function (t) {
          this._userLogHandler = t;
        },
        enumerable: !1,
        configurable: !0
      }),
      (ta.prototype.debug = function () {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        this._userLogHandler &&
          this._userLogHandler.apply(this, Ki([this, $i.DEBUG], t)),
          this._logHandler.apply(this, Ki([this, $i.DEBUG], t));
      }),
      (ta.prototype.log = function () {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        this._userLogHandler &&
          this._userLogHandler.apply(this, Ki([this, $i.VERBOSE], t)),
          this._logHandler.apply(this, Ki([this, $i.VERBOSE], t));
      }),
      (ta.prototype.info = function () {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        this._userLogHandler &&
          this._userLogHandler.apply(this, Ki([this, $i.INFO], t)),
          this._logHandler.apply(this, Ki([this, $i.INFO], t));
      }),
      (ta.prototype.warn = function () {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        this._userLogHandler &&
          this._userLogHandler.apply(this, Ki([this, $i.WARN], t)),
          this._logHandler.apply(this, Ki([this, $i.WARN], t));
      }),
      (ta.prototype.error = function () {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        this._userLogHandler &&
          this._userLogHandler.apply(this, Ki([this, $i.ERROR], t)),
          this._logHandler.apply(this, Ki([this, $i.ERROR], t));
      }),
      ta);
  function ta(t) {
    (this.name = t),
      (this._logLevel = Xi),
      (this._logHandler = Ji),
      (this._userLogHandler = null),
      Yi.push(this);
  }
  var ea =
    ((ra.prototype.getPlatformInfoString = function () {
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
    ra);
  function ra(t) {
    this.container = t;
  }
  var na = '@firebase/app-exp',
    oa = new dt('@firebase/app'),
    ia = '[DEFAULT]',
    aa =
      (((qr = {})[na] = 'fire-core'),
      (qr['@firebase/app-compat'] = 'fire-core-compat'),
      (qr['@firebase/analytics'] = 'fire-analytics'),
      (qr['@firebase/auth'] = 'fire-auth'),
      (qr['@firebase/database'] = 'fire-rtdb'),
      (qr['@firebase/functions-exp'] = 'fire-fn'),
      (qr['@firebase/functions-compat'] = 'fire-fn-compat'),
      (qr['@firebase/installations'] = 'fire-iid'),
      (qr['@firebase/messaging'] = 'fire-fcm'),
      (qr['@firebase/performance'] = 'fire-perf'),
      (qr['@firebase/remote-config'] = 'fire-rc'),
      (qr['@firebase/storage'] = 'fire-gcs'),
      (qr['@firebase/firestore'] = 'fire-fst'),
      (qr['fire-js'] = 'fire-js'),
      (qr['firebase-exp'] = 'fire-js-all'),
      qr),
    sa = new Map(),
    ua = new Map();
  function ca(e, r) {
    try {
      e.container.addComponent(r);
    } catch (t) {
      oa.debug(
        'Component ' +
          r.name +
          ' failed to register with FirebaseApp ' +
          e.name,
        t
      );
    }
  }
  function fa(t, e) {
    t.container.addOrOverwriteComponent(e);
  }
  function la(t) {
    var e,
      r,
      n = t.name;
    if (ua.has(n))
      return (
        oa.debug(
          'There were multiple attempts to register component ' + n + '.'
        ),
        !1
      );
    ua.set(n, t);
    try {
      for (var o = Si(sa.values()), i = o.next(); !i.done; i = o.next()) {
        ca(i.value, t);
      }
    } catch (t) {
      e = { error: t };
    } finally {
      try {
        i && !i.done && (r = o.return) && r.call(o);
      } finally {
        if (e) throw e.error;
      }
    }
    return !0;
  }
  function pa(t, e) {
    return t.container.getProvider(e);
  }
  var qr =
      (((vt = {})['no-app'] =
        "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
      (vt['bad-app-name'] = "Illegal App name: '{$appName}"),
      (vt['duplicate-app'] = "Firebase App named '{$appName}' already exists"),
      (vt['app-deleted'] = "Firebase App named '{$appName}' already deleted"),
      (vt['invalid-app-argument'] =
        'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
      (vt['invalid-log-argument'] =
        'First argument to `onLog` must be null or a function.'),
      vt),
    ha = new Di('app', 'Firebase', qr),
    da =
      (Object.defineProperty(va.prototype, 'automaticDataCollectionEnabled', {
        get: function () {
          return this.checkDestroyed(), this.automaticDataCollectionEnabled_;
        },
        set: function (t) {
          this.checkDestroyed(), (this.automaticDataCollectionEnabled_ = t);
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(va.prototype, 'name', {
        get: function () {
          return this.checkDestroyed(), this.name_;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(va.prototype, 'options', {
        get: function () {
          return this.checkDestroyed(), this.options_;
        },
        enumerable: !1,
        configurable: !0
      }),
      (va.prototype.checkDestroyed = function () {
        if (this.isDeleted)
          throw ha.create('app-deleted', { appName: this.name_ });
      }),
      va);
  function va(t, e, r) {
    var n = this;
    (this.isDeleted = !1),
      (this.options_ = mi({}, t)),
      (this.name_ = e.name),
      (this.automaticDataCollectionEnabled_ = e.automaticDataCollectionEnabled),
      (this.container = r),
      this.container.addComponent(
        new Bi(
          'app-exp',
          function () {
            return n;
          },
          'PUBLIC'
        )
      );
  }
  var ya,
    ga = '0.900.4';
  function ma(t, e) {
    var r, n;
    void 0 === e && (e = {}), 'object' != typeof e && (e = { name: e });
    var o = mi({ name: ia, automaticDataCollectionEnabled: !1 }, e),
      e = o.name;
    if ('string' != typeof e || !e)
      throw ha.create('bad-app-name', { appName: String(e) });
    if (sa.has(e)) throw ha.create('duplicate-app', { appName: e });
    var i = new Wi(e);
    try {
      for (var a = Si(ua.values()), s = a.next(); !s.done; s = a.next()) {
        var u = s.value;
        i.addComponent(u);
      }
    } catch (t) {
      r = { error: t };
    } finally {
      try {
        s && !s.done && (n = a.return) && n.call(a);
      } finally {
        if (r) throw r.error;
      }
    }
    o = new da(t, o, i);
    return sa.set(e, o), o;
  }
  function ba(r) {
    return bi(this, void 0, void 0, function () {
      var e;
      return wi(this, function (t) {
        switch (t.label) {
          case 0:
            return ((e = r.name), sa.has(e))
              ? (sa.delete(e),
                [
                  4,
                  Promise.all(
                    r.container.getProviders().map(function (t) {
                      return t.delete();
                    })
                  )
                ])
              : [3, 2];
          case 1:
            t.sent(), (r.isDeleted = !0), (t.label = 2);
          case 2:
            return [2];
        }
      });
    });
  }
  function wa(t, e, r) {
    var n = null !== (o = aa[t]) && void 0 !== o ? o : t;
    r && (n += '-' + r);
    var o = n.match(/\s|\//),
      t = e.match(/\s|\//);
    if (o || t) {
      r = ['Unable to register library "' + n + '" with version "' + e + '":'];
      return (
        o &&
          r.push(
            'library name "' +
              n +
              '" contains illegal characters (whitespace or "/")'
          ),
        o && t && r.push('and'),
        t &&
          r.push(
            'version name "' +
              e +
              '" contains illegal characters (whitespace or "/")'
          ),
        void oa.warn(r.join(' '))
      );
    }
    la(
      new Bi(
        n + '-version',
        function () {
          return { library: n, version: e };
        },
        'VERSION'
      )
    );
  }
  function Sa(t, e) {
    if (null !== t && 'function' != typeof t)
      throw ha.create('invalid-log-argument', { appName: name });
    !(function (a, e) {
      for (var t = 0, r = Yi; t < r.length; t++) {
        !(function (t) {
          var i = null;
          e && e.level && (i = Qi[e.level]),
            (t.userLogHandler =
              null === a
                ? null
                : function (t, e) {
                    for (var r = [], n = 2; n < arguments.length; n++)
                      r[n - 2] = arguments[n];
                    var o = r
                      .map(function (t) {
                        if (null == t) return null;
                        if ('string' == typeof t) return t;
                        if ('number' == typeof t || 'boolean' == typeof t)
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
                    e >= (null != i ? i : t.logLevel) &&
                      a({
                        level: $i[e].toLowerCase(),
                        message: o,
                        args: r,
                        type: t.name
                      });
                  });
        })(r[t]);
      }
    })(t, e);
  }
  function Ea(t) {
    var e;
    (e = t),
      Yi.forEach(function (t) {
        t.setLogLevel(e);
      });
  }
  la(
    new Bi(
      'platform-logger',
      function (t) {
        return new ea(t);
      },
      'PRIVATE'
    )
  ),
    wa(na, '0.0.900', ya),
    wa('fire-js', '');
  var Oa = Object.freeze({
      __proto__: null,
      SDK_VERSION: ga,
      _DEFAULT_ENTRY_NAME: ia,
      _addComponent: ca,
      _addOrOverwriteComponent: fa,
      _apps: sa,
      _clearComponents: function () {
        ua.clear();
      },
      _components: ua,
      _getProvider: pa,
      _registerComponent: la,
      _removeServiceInstance: function (t, e, r) {
        void 0 === r && (r = ia), pa(t, e).clearInstance(r);
      },
      deleteApp: ba,
      getApp: function (t) {
        void 0 === t && (t = ia);
        var e = sa.get(t);
        if (!e) throw ha.create('no-app', { appName: t });
        return e;
      },
      getApps: function () {
        return Array.from(sa.values());
      },
      initializeApp: ma,
      onLog: Sa,
      registerVersion: wa,
      setLogLevel: Ea
    }),
    Aa =
      (Object.defineProperty(Ta.prototype, 'automaticDataCollectionEnabled', {
        get: function () {
          return this.app.automaticDataCollectionEnabled;
        },
        set: function (t) {
          this.app.automaticDataCollectionEnabled = t;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(Ta.prototype, 'name', {
        get: function () {
          return this.app.name;
        },
        enumerable: !1,
        configurable: !0
      }),
      Object.defineProperty(Ta.prototype, 'options', {
        get: function () {
          return this.app.options;
        },
        enumerable: !1,
        configurable: !0
      }),
      (Ta.prototype.delete = function () {
        var e = this;
        return new Promise(function (t) {
          e.app.checkDestroyed(), t();
        }).then(function () {
          return e.firebase.INTERNAL.removeApp(e.name), ba(e.app);
        });
      }),
      (Ta.prototype._getService = function (t, e) {
        return (
          void 0 === e && (e = ia),
          this.app.checkDestroyed(),
          this.app.container.getProvider(t).getImmediate({ identifier: e })
        );
      }),
      (Ta.prototype._removeServiceInstance = function (t, e) {
        void 0 === e && (e = ia),
          this.app.container.getProvider(t).clearInstance(e);
      }),
      (Ta.prototype._addComponent = function (t) {
        ca(this.app, t);
      }),
      (Ta.prototype._addOrOverwriteComponent = function (t) {
        fa(this.app, t);
      }),
      Ta);
  function Ta(t, e) {
    var r = this;
    (this.app = t),
      (this.firebase = e),
      ca(
        t,
        new Bi(
          'app',
          function () {
            return r;
          },
          'PUBLIC'
        )
      ),
      (this.container = t.container);
  }
  var qr =
      (((vt = {})['no-app'] =
        "No Firebase App '{$appName}' has been created - call Firebase App.initializeApp()"),
      (vt['invalid-app-argument'] =
        'firebase.{$appName}() takes either no argument or a Firebase App instance.'),
      vt),
    Ia = new Di('app-compat', 'Firebase', qr);
  function Ra(o) {
    var n = {},
      i = {
        __esModule: !0,
        initializeApp: function (t, e) {
          void 0 === e && (e = {});
          (t = ma(t, e)), (e = new o(t, i));
          return (n[t.name] = e);
        },
        app: e,
        registerVersion: wa,
        setLogLevel: Ea,
        onLog: Sa,
        apps: null,
        SDK_VERSION: ga,
        INTERNAL: {
          registerComponent: function (r) {
            var n = r.name;
            {
              var t;
              la(r) &&
                'PUBLIC' === r.type &&
                ((t = function (t) {
                  if ((void 0 === t && (t = e()), 'function' != typeof t[n]))
                    throw Ia.create('invalid-app-argument', { appName: n });
                  return t[n]();
                }),
                void 0 !== r.serviceProps && Oi(t, r.serviceProps),
                (i[n] = t),
                (o.prototype[n] = function () {
                  for (var t = [], e = 0; e < arguments.length; e++)
                    t[e] = arguments[e];
                  return this._getService
                    .bind(this, n)
                    .apply(this, r.multipleInstances ? t : []);
                }));
            }
            return 'PUBLIC' === r.type ? i[n] : null;
          },
          removeApp: function (t) {
            delete n[t];
          },
          useAsService: function (t, e) {
            if ('serverAuth' === e) return null;
            return e;
          },
          modularAPIs: Oa
        }
      };
    function e(t) {
      if (
        ((e = n),
        (r = t = t || ia),
        !Object.prototype.hasOwnProperty.call(e, r))
      )
        throw Ia.create('no-app', { appName: t });
      var e, r;
      return n[t];
    }
    return (
      (i.default = i),
      Object.defineProperty(i, 'apps', {
        get: function () {
          return Object.keys(n).map(function (t) {
            return n[t];
          });
        }
      }),
      (e.App = o),
      i
    );
  }
  (vt = (function t() {
    var e = Ra(Aa);
    return (
      (e.INTERNAL = mi(mi({}, e.INTERNAL), {
        createFirebaseNamespace: t,
        extendNamespace: function (t) {
          Oi(e, t);
        },
        createSubscribe: Fi,
        ErrorFactory: Di,
        deepExtend: Oi
      })),
      e
    );
  })()),
    (qr = new dt('@firebase/app-compat'));
  'object' == typeof self &&
    self.self === self &&
    void 0 !== self.firebase &&
    (qr.warn(
      '\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  '
    ),
    (dt = self.firebase.SDK_VERSION) &&
      0 <= dt.indexOf('LITE') &&
      qr.warn(
        '\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    '
      ));
  wa('@firebase/app-compat', '0.0.900', void 0);
  vt.registerVersion('firebase-exp', '0.900.4', 'app-compat');
  return (
    console.warn(
      "\nIt looks like you're using the development build of the Firebase JS SDK.\nWhen deploying Firebase apps to production, it is advisable to only import\nthe individual SDK components you intend to use.\n\nFor the CDN builds, these are available in the following manner\n(replace <PACKAGE> with the name of a component - i.e. auth, database, etc):\n\nhttps://www.gstatic.com/firebasejs/5.0.0/firebase-<PACKAGE>.js\n"
    ),
    vt.registerVersion('firebase-exp', '0.900.4', 'compat-cdn'),
    vt
  );
});
//# sourceMappingURL=firebase-compat.js.map
