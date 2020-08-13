"use strict";

Object.defineProperty(exports, "__esModule", {
    value: !0
});

var t, e = require("tslib"), n = (t = require("@firebase/app")) && "object" == typeof t && "default" in t ? t.default : t, r = require("@firebase/logger"), i = require("@firebase/util"), o = require("@firebase/webchannel-wrapper"), s = require("@firebase/component"), u = new r.Logger("@firebase/firestore");

// Helper methods are needed because variables can't be exported as read/write
function a() {
    return u.logLevel;
}

function c(t) {
    for (var n = [], i = 1; i < arguments.length; i++) n[i - 1] = arguments[i];
    if (u.logLevel <= r.LogLevel.DEBUG) {
        var o = n.map(l);
        u.debug.apply(u, e.__spreadArrays([ "Firestore (7.17.2): " + t ], o));
    }
}

function h(t) {
    for (var n = [], i = 1; i < arguments.length; i++) n[i - 1] = arguments[i];
    if (u.logLevel <= r.LogLevel.ERROR) {
        var o = n.map(l);
        u.error.apply(u, e.__spreadArrays([ "Firestore (7.17.2): " + t ], o));
    }
}

function f(t) {
    for (var n = [], i = 1; i < arguments.length; i++) n[i - 1] = arguments[i];
    if (u.logLevel <= r.LogLevel.WARN) {
        var o = n.map(l);
        u.warn.apply(u, e.__spreadArrays([ "Firestore (7.17.2): " + t ], o));
    }
}

/**
 * Converts an additional log parameter to a string representation.
 */ function l(t) {
    if ("string" == typeof t) return t;
    try {
        return e = t, JSON.stringify(e);
    } catch (e) {
        // Converting to JSON failed, just log the object directly
        return t;
    }
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
    /** Formats an object as a JSON string, suitable for logging. */    var e;
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
 * Unconditionally fails, throwing an Error with the given message.
 * Messages are stripped in production builds.
 *
 * Returns `never` and can be used in expressions:
 * @example
 * let futureVar = fail('not implemented yet');
 */ function p(t) {
    void 0 === t && (t = "Unexpected state");
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
        var e = "FIRESTORE (7.17.2) INTERNAL ASSERTION FAILED: " + t;
    // NOTE: We don't use FirestoreError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
        throw h(e), new Error(e)
    /**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * Messages are stripped in production builds.
 */;
}

function d(t, e) {
    t || p();
}

/**
 * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
 * instance of `T` before casting.
 */ function y(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
e) {
    return t;
}

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
/**
 * Generates `nBytes` of random bytes.
 *
 * If `nBytes < 0` , an error will be thrown.
 */ function v(t) {
    // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
    var e = 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "undefined" != typeof self && (self.crypto || self.msCrypto), n = new Uint8Array(t);
    if (e) e.getRandomValues(n); else 
    // Falls back to Math.random
    for (var r = 0; r < t; r++) n[r] = Math.floor(256 * Math.random());
    return n;
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
 */ var g = /** @class */ function() {
    function t() {}
    return t.t = function() {
        for (
        // Alphanumeric characters
        var t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", e = Math.floor(256 / t.length) * t.length, n = ""
        // The largest byte value that is a multiple of `char.length`.
        ; n.length < 20; ) for (var r = v(40), i = 0; i < r.length; ++i) 
        // Only accept values that are [0, maxMultiple), this ensures they can
        // be evenly mapped to indices of `chars` via a modulo operation.
        n.length < 20 && r[i] < e && (n += t.charAt(r[i] % t.length));
        return n;
    }, t;
}();

function m(t, e) {
    return t < e ? -1 : t > e ? 1 : 0;
}

/** Helper to compare arrays using isEqual(). */ function w(t, e, n) {
    return t.length === e.length && t.every((function(t, r) {
        return n(t, e[r]);
    }));
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
 */ var _ = 
/**
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
     */
function(t, e, n, r, i) {
    this.s = t, this.persistenceKey = e, this.host = n, this.ssl = r, this.forceLongPolling = i;
}, b = /** @class */ function() {
    function t(t, e) {
        this.projectId = t, this.database = e || "(default)";
    }
    return Object.defineProperty(t.prototype, "i", {
        get: function() {
            return "(default)" === this.database;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.isEqual = function(e) {
        return e instanceof t && e.projectId === this.projectId && e.database === this.database;
    }, t.prototype.o = function(t) {
        return m(this.projectId, t.projectId) || m(this.database, t.database);
    }, t;
}();

/** The default database name for a project. */
/** Represents the database ID a Firestore client is associated with. */
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
function E(t) {
    var e = 0;
    for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e++;
    return e;
}

function I(t, e) {
    for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && e(n, t[n]);
}

function N(t) {
    for (var e in t) if (Object.prototype.hasOwnProperty.call(t, e)) return !1;
    return !0;
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
 * A map implementation that uses objects as keys. Objects must have an
 * associated equals function and must be immutable. Entries in the map are
 * stored together with the key being produced from the mapKeyFn. This map
 * automatically handles collisions of keys.
 */ var A = /** @class */ function() {
    function t(t, e) {
        this.h = t, this.u = e, 
        /**
             * The inner map for a key -> value pair. Due to the possibility of
             * collisions we keep a list of entries that we do a linear search through
             * to find an actual match. Note that collisions should be rare, so we still
             * expect near constant time lookups in practice.
             */
        this.l = {}
        /** Get a value for this key, or undefined if it does not exist. */;
    }
    return t.prototype.get = function(t) {
        var e = this.h(t), n = this.l[e];
        if (void 0 !== n) for (var r = 0, i = n; r < i.length; r++) {
            var o = i[r], s = o[0], u = o[1];
            if (this.u(s, t)) return u;
        }
    }, t.prototype.has = function(t) {
        return void 0 !== this.get(t);
    }, 
    /** Put this key and value in the map. */ t.prototype.set = function(t, e) {
        var n = this.h(t), r = this.l[n];
        if (void 0 !== r) {
            for (var i = 0; i < r.length; i++) if (this.u(r[i][0], t)) return void (r[i] = [ t, e ]);
            r.push([ t, e ]);
        } else this.l[n] = [ [ t, e ] ];
    }, 
    /**
     * Remove this key from the map. Returns a boolean if anything was deleted.
     */
    t.prototype.delete = function(t) {
        var e = this.h(t), n = this.l[e];
        if (void 0 === n) return !1;
        for (var r = 0; r < n.length; r++) if (this.u(n[r][0], t)) return 1 === n.length ? delete this.l[e] : n.splice(r, 1), 
        !0;
        return !1;
    }, t.prototype.forEach = function(t) {
        I(this.l, (function(e, n) {
            for (var r = 0, i = n; r < i.length; r++) {
                var o = i[r], s = o[0], u = o[1];
                t(s, u);
            }
        }));
    }, t.prototype._ = function() {
        return N(this.l);
    }, t;
}(), T = {
    // Causes are copied from:
    // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
    /** Not an error; returned on success. */
    OK: "ok",
    /** The operation was cancelled (typically by the caller). */
    CANCELLED: "cancelled",
    /** Unknown error or an error from a different error domain. */
    UNKNOWN: "unknown",
    /**
     * Client specified an invalid argument. Note that this differs from
     * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
     * problematic regardless of the state of the system (e.g., a malformed file
     * name).
     */
    INVALID_ARGUMENT: "invalid-argument",
    /**
     * Deadline expired before operation could complete. For operations that
     * change the state of the system, this error may be returned even if the
     * operation has completed successfully. For example, a successful response
     * from a server could have been delayed long enough for the deadline to
     * expire.
     */
    DEADLINE_EXCEEDED: "deadline-exceeded",
    /** Some requested entity (e.g., file or directory) was not found. */
    NOT_FOUND: "not-found",
    /**
     * Some entity that we attempted to create (e.g., file or directory) already
     * exists.
     */
    ALREADY_EXISTS: "already-exists",
    /**
     * The caller does not have permission to execute the specified operation.
     * PERMISSION_DENIED must not be used for rejections caused by exhausting
     * some resource (use RESOURCE_EXHAUSTED instead for those errors).
     * PERMISSION_DENIED must not be used if the caller can not be identified
     * (use UNAUTHENTICATED instead for those errors).
     */
    PERMISSION_DENIED: "permission-denied",
    /**
     * The request does not have valid authentication credentials for the
     * operation.
     */
    UNAUTHENTICATED: "unauthenticated",
    /**
     * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
     * entire file system is out of space.
     */
    RESOURCE_EXHAUSTED: "resource-exhausted",
    /**
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
     */
    FAILED_PRECONDITION: "failed-precondition",
    /**
     * The operation was aborted, typically due to a concurrency issue like
     * sequencer check failures, transaction aborts, etc.
     *
     * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
     * and UNAVAILABLE.
     */
    ABORTED: "aborted",
    /**
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
     */
    OUT_OF_RANGE: "out-of-range",
    /** Operation is not implemented or not supported/enabled in this service. */
    UNIMPLEMENTED: "unimplemented",
    /**
     * Internal errors. Means some invariants expected by underlying System has
     * been broken. If you see one of these errors, Something is very broken.
     */
    INTERNAL: "internal",
    /**
     * The service is currently unavailable. This is a most likely a transient
     * condition and may be corrected by retrying with a backoff.
     *
     * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
     * and UNAVAILABLE.
     */
    UNAVAILABLE: "unavailable",
    /** Unrecoverable data loss or corruption. */
    DATA_LOSS: "data-loss"
}, R = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this, n) || this).code = e, r.message = n, r.name = "FirebaseError", 
        // HACK: We write a toString property directly because Error is not a real
        // class and so inheritance does not work correctly. We could alternatively
        // do the same "back-door inheritance" trick that FirebaseError does.
        r.toString = function() {
            return r.name + ": [code=" + r.code + "]: " + r.message;
        }, r;
    }
    return e.__extends(n, t), n;
}(Error), D = /** @class */ function() {
    function t(t, e) {
        if (this.seconds = t, this.nanoseconds = e, e < 0) throw new R(T.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (e >= 1e9) throw new R(T.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (t < -62135596800) throw new R(T.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
        // This will break in the year 10,000.
                if (t >= 253402300800) throw new R(T.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
    }
    return t.now = function() {
        return t.fromMillis(Date.now());
    }, t.fromDate = function(e) {
        return t.fromMillis(e.getTime());
    }, t.fromMillis = function(e) {
        var n = Math.floor(e / 1e3);
        return new t(n, 1e6 * (e - 1e3 * n));
    }, t.prototype.toDate = function() {
        return new Date(this.toMillis());
    }, t.prototype.toMillis = function() {
        return 1e3 * this.seconds + this.nanoseconds / 1e6;
    }, t.prototype.T = function(t) {
        return this.seconds === t.seconds ? m(this.nanoseconds, t.nanoseconds) : m(this.seconds, t.seconds);
    }, t.prototype.isEqual = function(t) {
        return t.seconds === this.seconds && t.nanoseconds === this.nanoseconds;
    }, t.prototype.toString = function() {
        return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
    }, t.prototype.valueOf = function() {
        // This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
        // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
        // with zeroes to be a consistent length. Strings with this format then have a lexiographical
        // ordering that matches the expected ordering. The <seconds> translation is done to avoid
        // having a leading negative sign (i.e. a leading '-' character) in its string representation,
        // which would affect its lexiographical ordering.
        var t = this.seconds - -62135596800;
        // Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
                return String(t).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
    }, t;
}(), L = /** @class */ function() {
    function t(t) {
        this.timestamp = t;
    }
    return t.m = function(e) {
        return new t(e);
    }, t.min = function() {
        return new t(new D(0, 0));
    }, t.prototype.o = function(t) {
        return this.timestamp.T(t.timestamp);
    }, t.prototype.isEqual = function(t) {
        return this.timestamp.isEqual(t.timestamp);
    }, 
    /** Returns a number representation of the version for use in spec tests. */ t.prototype.I = function() {
        // Convert to microseconds.
        return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
    }, t.prototype.toString = function() {
        return "SnapshotVersion(" + this.timestamp.toString() + ")";
    }, t.prototype.R = function() {
        return this.timestamp;
    }, t;
}(), k = /** @class */ function() {
    function t(t, e, n) {
        void 0 === e ? e = 0 : e > t.length && p(), void 0 === n ? n = t.length - e : n > t.length - e && p(), 
        this.segments = t, this.offset = e, this.A = n;
    }
    return Object.defineProperty(t.prototype, "length", {
        get: function() {
            return this.A;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.isEqual = function(e) {
        return 0 === t.P(this, e);
    }, t.prototype.child = function(e) {
        var n = this.segments.slice(this.offset, this.limit());
        return e instanceof t ? e.forEach((function(t) {
            n.push(t);
        })) : n.push(e), this.V(n);
    }, 
    /** The index of one past the last segment of the path. */ t.prototype.limit = function() {
        return this.offset + this.length;
    }, t.prototype.p = function(t) {
        return t = void 0 === t ? 1 : t, this.V(this.segments, this.offset + t, this.length - t);
    }, t.prototype.g = function() {
        return this.V(this.segments, this.offset, this.length - 1);
    }, t.prototype.v = function() {
        return this.segments[this.offset];
    }, t.prototype.S = function() {
        return this.get(this.length - 1);
    }, t.prototype.get = function(t) {
        return this.segments[this.offset + t];
    }, t.prototype._ = function() {
        return 0 === this.length;
    }, t.prototype.C = function(t) {
        if (t.length < this.length) return !1;
        for (var e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }, t.prototype.D = function(t) {
        if (this.length + 1 !== t.length) return !1;
        for (var e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }, t.prototype.forEach = function(t) {
        for (var e = this.offset, n = this.limit(); e < n; e++) t(this.segments[e]);
    }, t.prototype.F = function() {
        return this.segments.slice(this.offset, this.limit());
    }, t.P = function(t, e) {
        for (var n = Math.min(t.length, e.length), r = 0; r < n; r++) {
            var i = t.get(r), o = e.get(r);
            if (i < o) return -1;
            if (i > o) return 1;
        }
        return t.length < e.length ? -1 : t.length > e.length ? 1 : 0;
    }, t;
}(), O = /** @class */ function(t) {
    function n() {
        return null !== t && t.apply(this, arguments) || this;
    }
    return e.__extends(n, t), n.prototype.V = function(t, e, r) {
        return new n(t, e, r);
    }, n.prototype.N = function() {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        return this.F().join("/");
    }, n.prototype.toString = function() {
        return this.N();
    }, 
    /**
     * Creates a resource path from the given slash-delimited string.
     */
    n.$ = function(t) {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        if (t.indexOf("//") >= 0) throw new R(T.INVALID_ARGUMENT, "Invalid path (" + t + "). Paths must not contain // in them.");
        // We may still have an empty segment at the beginning or end if they had a
        // leading or trailing slash (which we allow).
                return new n(t.split("/").filter((function(t) {
            return t.length > 0;
        })));
    }, n.k = function() {
        return new n([]);
    }, n;
}(k), P = /^[_a-zA-Z][_a-zA-Z0-9]*$/, V = /** @class */ function(t) {
    function n() {
        return null !== t && t.apply(this, arguments) || this;
    }
    return e.__extends(n, t), n.prototype.V = function(t, e, r) {
        return new n(t, e, r);
    }, 
    /**
     * Returns true if the string could be used as a segment in a field path
     * without escaping.
     */
    n.L = function(t) {
        return P.test(t);
    }, n.prototype.N = function() {
        return this.F().map((function(t) {
            return t = t.replace("\\", "\\\\").replace("`", "\\`"), n.L(t) || (t = "`" + t + "`"), 
            t;
        })).join(".");
    }, n.prototype.toString = function() {
        return this.N();
    }, 
    /**
     * Returns true if this field references the key of a document.
     */
    n.prototype.O = function() {
        return 1 === this.length && "__name__" === this.get(0);
    }, 
    /**
     * The field designating the key of a document.
     */
    n.M = function() {
        return new n([ "__name__" ]);
    }, 
    /**
     * Parses a field string from the given server-formatted string.
     *
     * - Splitting the empty string is not allowed (for now at least).
     * - Empty segments within the string (e.g. if there are two consecutive
     *   separators) are not allowed.
     *
     * TODO(b/37244157): we should make this more strict. Right now, it allows
     * non-identifier path components, even if they aren't escaped.
     */
    n.q = function(t) {
        for (var e = [], r = "", i = 0, o = function() {
            if (0 === r.length) throw new R(T.INVALID_ARGUMENT, "Invalid field path (" + t + "). Paths must not be empty, begin with '.', end with '.', or contain '..'");
            e.push(r), r = "";
        }, s = !1; i < t.length; ) {
            var u = t[i];
            if ("\\" === u) {
                if (i + 1 === t.length) throw new R(T.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
                var a = t[i + 1];
                if ("\\" !== a && "." !== a && "`" !== a) throw new R(T.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
                r += a, i += 2;
            } else "`" === u ? (s = !s, i++) : "." !== u || s ? (r += u, i++) : (o(), i++);
        }
        if (o(), s) throw new R(T.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
        return new n(e);
    }, n.k = function() {
        return new n([]);
    }, n;
}(k), U = /** @class */ function() {
    function t(t) {
        this.path = t;
    }
    return t.U = function(e) {
        return new t(O.$(e).p(5));
    }, 
    /** Returns true if the document is in the specified collectionId. */ t.prototype.B = function(t) {
        return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
    }, t.prototype.isEqual = function(t) {
        return null !== t && 0 === O.P(this.path, t.path);
    }, t.prototype.toString = function() {
        return this.path.toString();
    }, t.P = function(t, e) {
        return O.P(t.path, e.path);
    }, t.W = function(t) {
        return t.length % 2 == 0;
    }, 
    /**
     * Creates and returns a new document key with the given segments.
     *
     * @param segments The segments of the path to the document
     * @return A new instance of DocumentKey
     */
    t.j = function(e) {
        return new t(new O(e.slice()));
    }, t;
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
 * Returns whether a variable is either undefined or null.
 */
function S(t) {
    return null == t;
}

/** Returns whether the value represents -0. */ function M(t) {
    // Detect if the value is -0.0. Based on polyfill from
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
    return -0 === t && 1 / t == -1 / 0;
}

/**
 * Returns whether a value is an integer and in the safe integer range
 * @param value The value to test for being an integer and in the safe range
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
// Visible for testing
var C = function(t, e, n, r, i, o, s) {
    void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
    void 0 === i && (i = null), void 0 === o && (o = null), void 0 === s && (s = null), 
    this.path = t, this.collectionGroup = e, this.orderBy = n, this.filters = r, this.limit = i, 
    this.startAt = o, this.endAt = s, this.G = null;
};

/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */ function x(t, e, n, r, i, o, s) {
    return void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
    void 0 === i && (i = null), void 0 === o && (o = null), void 0 === s && (s = null), 
    new C(t, e, n, r, i, o, s);
}

function q(t) {
    var e = y(t);
    if (null === e.G) {
        var n = e.path.N();
        null !== e.collectionGroup && (n += "|cg:" + e.collectionGroup), n += "|f:", n += e.filters.map((function(t) {
            return function(t) {
                // TODO(b/29183165): Technically, this won't be unique if two values have
                // the same description, such as the int 3 and the string "3". So we should
                // add the types in here somehow, too.
                return t.field.N() + t.op.toString() + kt(t.value);
            }(t);
        })).join(","), n += "|ob:", n += e.orderBy.map((function(t) {
            return (e = t).field.N() + e.dir;
            var e;
        })).join(","), S(e.limit) || (n += "|l:", n += e.limit), e.startAt && (n += "|lb:", 
        n += mn(e.startAt)), e.endAt && (n += "|ub:", n += mn(e.endAt)), e.G = n;
    }
    return e.G;
}

function j(t, e) {
    if (t.limit !== e.limit) return !1;
    if (t.orderBy.length !== e.orderBy.length) return !1;
    for (var n = 0; n < t.orderBy.length; n++) if (!In(t.orderBy[n], e.orderBy[n])) return !1;
    if (t.filters.length !== e.filters.length) return !1;
    for (var r = 0; r < t.filters.length; r++) if (i = t.filters[r], o = e.filters[r], 
    i.op !== o.op || !i.field.isEqual(o.field) || !Tt(i.value, o.value)) return !1;
    var i, o;
    return t.collectionGroup === e.collectionGroup && !!t.path.isEqual(e.path) && !!_n(t.startAt, e.startAt) && _n(t.endAt, e.endAt);
}

function G(t) {
    return U.W(t.path) && null === t.collectionGroup && 0 === t.filters.length;
}

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
/** Converts a Base64 encoded string to a binary string. */
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
/**
 * Immutable class that represents a "proto" byte string.
 *
 * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
 * sent on the wire. This class abstracts away this differentiation by holding
 * the proto byte string in a common class that must be converted into a string
 * before being sent as a proto.
 */ var F = /** @class */ function() {
    function t(t) {
        this.K = t;
    }
    return t.fromBase64String = function(e) {
        return new t(atob(e));
    }, t.fromUint8Array = function(e) {
        return new t(
        /**
 * Helper function to convert an Uint8array to a binary string.
 */
        function(t) {
            for (var e = "", n = 0; n < t.length; ++n) e += String.fromCharCode(t[n]);
            return e;
        }(e));
    }, t.prototype.toBase64 = function() {
        return t = this.K, btoa(t);
        /** Converts a binary string to a Base64 encoded string. */        var t;
        /** True if and only if the Base64 conversion functions are available. */    }, 
    t.prototype.toUint8Array = function() {
        return function(t) {
            for (var e = new Uint8Array(t.length), n = 0; n < t.length; n++) e[n] = t.charCodeAt(n);
            return e;
        }(this.K);
    }, t.prototype.H = function() {
        return 2 * this.K.length;
    }, t.prototype.o = function(t) {
        return m(this.K, t.K);
    }, t.prototype.isEqual = function(t) {
        return this.K === t.K;
    }, t;
}();

F.Y = new F("");

var B, z, W = /** @class */ function() {
    function t(
    /** The target being listened to. */
    t, 
    /**
     * The target ID to which the target corresponds; Assigned by the
     * LocalStore for user listens and by the SyncEngine for limbo watches.
     */
    e, 
    /** The purpose of the target. */
    n, 
    /**
     * The sequence number of the last transaction during which this target data
     * was modified.
     */
    r, 
    /** The latest snapshot version seen for this target. */
    i
    /**
     * The maximum snapshot version at which the associated view
     * contained no limbo documents.
     */ , o
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */ , s) {
        void 0 === i && (i = L.min()), void 0 === o && (o = L.min()), void 0 === s && (s = F.Y), 
        this.target = t, this.targetId = e, this.X = n, this.sequenceNumber = r, this.J = i, 
        this.lastLimboFreeSnapshotVersion = o, this.resumeToken = s;
    }
    /** Creates a new target data instance with an updated sequence number. */    return t.prototype.Z = function(e) {
        return new t(this.target, this.targetId, this.X, e, this.J, this.lastLimboFreeSnapshotVersion, this.resumeToken);
    }, 
    /**
     * Creates a new target data instance with an updated resume token and
     * snapshot version.
     */
    t.prototype.tt = function(e, n) {
        return new t(this.target, this.targetId, this.X, this.sequenceNumber, n, this.lastLimboFreeSnapshotVersion, e);
    }, 
    /**
     * Creates a new target data instance with an updated last limbo free
     * snapshot version number.
     */
    t.prototype.et = function(e) {
        return new t(this.target, this.targetId, this.X, this.sequenceNumber, this.J, e, this.resumeToken);
    }, t;
}(), Q = 
// TODO(b/33078163): just use simplest form of existence filter for now
function(t) {
    this.count = t;
};

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
 * Determines whether an error code represents a permanent error when received
 * in response to a non-write operation.
 *
 * See isPermanentWriteError for classifying write errors.
 */
function K(t) {
    switch (t) {
      case T.OK:
        return p();

      case T.CANCELLED:
      case T.UNKNOWN:
      case T.DEADLINE_EXCEEDED:
      case T.RESOURCE_EXHAUSTED:
      case T.INTERNAL:
      case T.UNAVAILABLE:
 // Unauthenticated means something went wrong with our token and we need
        // to retry with new credentials which will happen automatically.
              case T.UNAUTHENTICATED:
        return !1;

      case T.INVALID_ARGUMENT:
      case T.NOT_FOUND:
      case T.ALREADY_EXISTS:
      case T.PERMISSION_DENIED:
      case T.FAILED_PRECONDITION:
 // Aborted might be retried in some scenarios, but that is dependant on
        // the context and should handled individually by the calling code.
        // See https://cloud.google.com/apis/design/errors.
              case T.ABORTED:
      case T.OUT_OF_RANGE:
      case T.UNIMPLEMENTED:
      case T.DATA_LOSS:
        return !0;

      default:
        return p();
    }
}

/**
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
 */
/**
 * Maps an error Code from GRPC status code number, like 0, 1, or 14. These
 * are not the same as HTTP status codes.
 *
 * @returns The Code equivalent to the given GRPC status code. Fails if there
 *     is no match.
 */ function $(t) {
    if (void 0 === t) 
    // This shouldn't normally happen, but in certain error cases (like trying
    // to send invalid proto messages) we may get an error with no GRPC code.
    return h("GRPC error has no .code"), T.UNKNOWN;
    switch (t) {
      case B.OK:
        return T.OK;

      case B.CANCELLED:
        return T.CANCELLED;

      case B.UNKNOWN:
        return T.UNKNOWN;

      case B.DEADLINE_EXCEEDED:
        return T.DEADLINE_EXCEEDED;

      case B.RESOURCE_EXHAUSTED:
        return T.RESOURCE_EXHAUSTED;

      case B.INTERNAL:
        return T.INTERNAL;

      case B.UNAVAILABLE:
        return T.UNAVAILABLE;

      case B.UNAUTHENTICATED:
        return T.UNAUTHENTICATED;

      case B.INVALID_ARGUMENT:
        return T.INVALID_ARGUMENT;

      case B.NOT_FOUND:
        return T.NOT_FOUND;

      case B.ALREADY_EXISTS:
        return T.ALREADY_EXISTS;

      case B.PERMISSION_DENIED:
        return T.PERMISSION_DENIED;

      case B.FAILED_PRECONDITION:
        return T.FAILED_PRECONDITION;

      case B.ABORTED:
        return T.ABORTED;

      case B.OUT_OF_RANGE:
        return T.OUT_OF_RANGE;

      case B.UNIMPLEMENTED:
        return T.UNIMPLEMENTED;

      case B.DATA_LOSS:
        return T.DATA_LOSS;

      default:
        return p();
    }
}

/**
 * Converts an HTTP response's error status to the equivalent error code.
 *
 * @param status An HTTP error response status ("FAILED_PRECONDITION",
 * "UNKNOWN", etc.)
 * @returns The equivalent Code. Non-matching responses are mapped to
 *     Code.UNKNOWN.
 */ (z = B || (B = {}))[z.OK = 0] = "OK", z[z.CANCELLED = 1] = "CANCELLED", z[z.UNKNOWN = 2] = "UNKNOWN", 
z[z.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", z[z.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", 
z[z.NOT_FOUND = 5] = "NOT_FOUND", z[z.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", z[z.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
z[z.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", z[z.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
z[z.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", z[z.ABORTED = 10] = "ABORTED", 
z[z.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", z[z.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
z[z.INTERNAL = 13] = "INTERNAL", z[z.UNAVAILABLE = 14] = "UNAVAILABLE", z[z.DATA_LOSS = 15] = "DATA_LOSS";

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
// An immutable sorted map implementation, based on a Left-leaning Red-Black
// tree.
var H = /** @class */ function() {
    function t(t, e) {
        this.P = t, this.root = e || X.EMPTY;
    }
    // Returns a copy of the map, with the specified key/value added or replaced.
        return t.prototype.nt = function(e, n) {
        return new t(this.P, this.root.nt(e, n, this.P).copy(null, null, X.st, null, null));
    }, 
    // Returns a copy of the map, with the specified key removed.
    t.prototype.remove = function(e) {
        return new t(this.P, this.root.remove(e, this.P).copy(null, null, X.st, null, null));
    }, 
    // Returns the value of the node with the given key, or null.
    t.prototype.get = function(t) {
        for (var e = this.root; !e._(); ) {
            var n = this.P(t, e.key);
            if (0 === n) return e.value;
            n < 0 ? e = e.left : n > 0 && (e = e.right);
        }
        return null;
    }, 
    // Returns the index of the element in this sorted map, or -1 if it doesn't
    // exist.
    t.prototype.indexOf = function(t) {
        for (
        // Number of nodes that were pruned when descending right
        var e = 0, n = this.root; !n._(); ) {
            var r = this.P(t, n.key);
            if (0 === r) return e + n.left.size;
            r < 0 ? n = n.left : (
            // Count all nodes left of the node plus the node itself
            e += n.left.size + 1, n = n.right);
        }
        // Node not found
                return -1;
    }, t.prototype._ = function() {
        return this.root._();
    }, Object.defineProperty(t.prototype, "size", {
        // Returns the total number of nodes in the map.
        get: function() {
            return this.root.size;
        },
        enumerable: !1,
        configurable: !0
    }), 
    // Returns the minimum key in the map.
    t.prototype.it = function() {
        return this.root.it();
    }, 
    // Returns the maximum key in the map.
    t.prototype.rt = function() {
        return this.root.rt();
    }, 
    // Traverses the map in key order and calls the specified action function
    // for each key/value pair. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    t.prototype.ot = function(t) {
        return this.root.ot(t);
    }, t.prototype.forEach = function(t) {
        this.ot((function(e, n) {
            return t(e, n), !1;
        }));
    }, t.prototype.toString = function() {
        var t = [];
        return this.ot((function(e, n) {
            return t.push(e + ":" + n), !1;
        })), "{" + t.join(", ") + "}";
    }, 
    // Traverses the map in reverse key order and calls the specified action
    // function for each key/value pair. If action returns true, traversal is
    // aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    t.prototype.ht = function(t) {
        return this.root.ht(t);
    }, 
    // Returns an iterator over the SortedMap.
    t.prototype.at = function() {
        return new Y(this.root, null, this.P, !1);
    }, t.prototype.ut = function(t) {
        return new Y(this.root, t, this.P, !1);
    }, t.prototype.ct = function() {
        return new Y(this.root, null, this.P, !0);
    }, t.prototype.lt = function(t) {
        return new Y(this.root, t, this.P, !0);
    }, t;
}(), Y = /** @class */ function() {
    function t(t, e, n, r) {
        this._t = r, this.ft = [];
        for (var i = 1; !t._(); ) if (i = e ? n(t.key, e) : 1, 
        // flip the comparison if we're going in reverse
        r && (i *= -1), i < 0) 
        // This node is less than our start key. ignore it
        t = this._t ? t.left : t.right; else {
            if (0 === i) {
                // This node is exactly equal to our start key. Push it on the stack,
                // but stop iterating;
                this.ft.push(t);
                break;
            }
            // This node is greater than our start key, add it to the stack and move
            // to the next one
                        this.ft.push(t), t = this._t ? t.right : t.left;
        }
    }
    return t.prototype.dt = function() {
        var t = this.ft.pop(), e = {
            key: t.key,
            value: t.value
        };
        if (this._t) for (t = t.left; !t._(); ) this.ft.push(t), t = t.right; else for (t = t.right; !t._(); ) this.ft.push(t), 
        t = t.left;
        return e;
    }, t.prototype.wt = function() {
        return this.ft.length > 0;
    }, t.prototype.Tt = function() {
        if (0 === this.ft.length) return null;
        var t = this.ft[this.ft.length - 1];
        return {
            key: t.key,
            value: t.value
        };
    }, t;
}(), X = /** @class */ function() {
    function t(e, n, r, i, o) {
        this.key = e, this.value = n, this.color = null != r ? r : t.RED, this.left = null != i ? i : t.EMPTY, 
        this.right = null != o ? o : t.EMPTY, this.size = this.left.size + 1 + this.right.size;
    }
    // Returns a copy of the current node, optionally replacing pieces of it.
        return t.prototype.copy = function(e, n, r, i, o) {
        return new t(null != e ? e : this.key, null != n ? n : this.value, null != r ? r : this.color, null != i ? i : this.left, null != o ? o : this.right);
    }, t.prototype._ = function() {
        return !1;
    }, 
    // Traverses the tree in key order and calls the specified action function
    // for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    t.prototype.ot = function(t) {
        return this.left.ot(t) || t(this.key, this.value) || this.right.ot(t);
    }, 
    // Traverses the tree in reverse key order and calls the specified action
    // function for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    t.prototype.ht = function(t) {
        return this.right.ht(t) || t(this.key, this.value) || this.left.ht(t);
    }, 
    // Returns the minimum node in the tree.
    t.prototype.min = function() {
        return this.left._() ? this : this.left.min();
    }, 
    // Returns the maximum key in the tree.
    t.prototype.it = function() {
        return this.min().key;
    }, 
    // Returns the maximum key in the tree.
    t.prototype.rt = function() {
        return this.right._() ? this.key : this.right.rt();
    }, 
    // Returns new tree, with the key/value added.
    t.prototype.nt = function(t, e, n) {
        var r = this, i = n(t, r.key);
        return (r = i < 0 ? r.copy(null, null, null, r.left.nt(t, e, n), null) : 0 === i ? r.copy(null, e, null, null, null) : r.copy(null, null, null, null, r.right.nt(t, e, n))).Et();
    }, t.prototype.It = function() {
        if (this.left._()) return t.EMPTY;
        var e = this;
        return e.left.Rt() || e.left.left.Rt() || (e = e.At()), (e = e.copy(null, null, null, e.left.It(), null)).Et();
    }, 
    // Returns new tree, with the specified item removed.
    t.prototype.remove = function(e, n) {
        var r, i = this;
        if (n(e, i.key) < 0) i.left._() || i.left.Rt() || i.left.left.Rt() || (i = i.At()), 
        i = i.copy(null, null, null, i.left.remove(e, n), null); else {
            if (i.left.Rt() && (i = i.Pt()), i.right._() || i.right.Rt() || i.right.left.Rt() || (i = i.Vt()), 
            0 === n(e, i.key)) {
                if (i.right._()) return t.EMPTY;
                r = i.right.min(), i = i.copy(r.key, r.value, null, null, i.right.It());
            }
            i = i.copy(null, null, null, null, i.right.remove(e, n));
        }
        return i.Et();
    }, t.prototype.Rt = function() {
        return this.color;
    }, 
    // Returns new tree after performing any needed rotations.
    t.prototype.Et = function() {
        var t = this;
        return t.right.Rt() && !t.left.Rt() && (t = t.yt()), t.left.Rt() && t.left.left.Rt() && (t = t.Pt()), 
        t.left.Rt() && t.right.Rt() && (t = t.pt()), t;
    }, t.prototype.At = function() {
        var t = this.pt();
        return t.right.left.Rt() && (t = (t = (t = t.copy(null, null, null, null, t.right.Pt())).yt()).pt()), 
        t;
    }, t.prototype.Vt = function() {
        var t = this.pt();
        return t.left.left.Rt() && (t = (t = t.Pt()).pt()), t;
    }, t.prototype.yt = function() {
        var e = this.copy(null, null, t.RED, null, this.right.left);
        return this.right.copy(null, null, this.color, e, null);
    }, t.prototype.Pt = function() {
        var e = this.copy(null, null, t.RED, this.left.right, null);
        return this.left.copy(null, null, this.color, null, e);
    }, t.prototype.pt = function() {
        var t = this.left.copy(null, null, !this.left.color, null, null), e = this.right.copy(null, null, !this.right.color, null, null);
        return this.copy(null, null, !this.color, t, e);
    }, 
    // For testing.
    t.prototype.gt = function() {
        var t = this.vt();
        return Math.pow(2, t) <= this.size + 1;
    }, 
    // In a balanced RB tree, the black-depth (number of black nodes) from root to
    // leaves is equal on both sides.  This function verifies that or asserts.
    t.prototype.vt = function() {
        if (this.Rt() && this.left.Rt()) throw p();
        if (this.right.Rt()) throw p();
        var t = this.left.vt();
        if (t !== this.right.vt()) throw p();
        return t + (this.Rt() ? 0 : 1);
    }, t;
}();

// end SortedMap
// An iterator over an LLRBNode.
// end LLRBNode
// Empty node is shared between all LLRB trees.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
X.EMPTY = null, X.RED = !0, X.st = !1, 
// end LLRBEmptyNode
X.EMPTY = new (/** @class */ function() {
    function t() {
        this.size = 0;
    }
    return Object.defineProperty(t.prototype, "key", {
        get: function() {
            throw p();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "value", {
        get: function() {
            throw p();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "color", {
        get: function() {
            throw p();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "left", {
        get: function() {
            throw p();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "right", {
        get: function() {
            throw p();
        },
        enumerable: !1,
        configurable: !0
    }), 
    // Returns a copy of the current node.
    t.prototype.copy = function(t, e, n, r, i) {
        return this;
    }, 
    // Returns a copy of the tree, with the specified key/value added.
    t.prototype.nt = function(t, e, n) {
        return new X(t, e);
    }, 
    // Returns a copy of the tree, with the specified key removed.
    t.prototype.remove = function(t, e) {
        return this;
    }, t.prototype._ = function() {
        return !0;
    }, t.prototype.ot = function(t) {
        return !1;
    }, t.prototype.ht = function(t) {
        return !1;
    }, t.prototype.it = function() {
        return null;
    }, t.prototype.rt = function() {
        return null;
    }, t.prototype.Rt = function() {
        return !1;
    }, 
    // For testing.
    t.prototype.gt = function() {
        return !0;
    }, t.prototype.vt = function() {
        return 0;
    }, t;
}());

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
 * SortedSet is an immutable (copy-on-write) collection that holds elements
 * in order specified by the provided comparator.
 *
 * NOTE: if provided comparator returns 0 for two elements, we consider them to
 * be equal!
 */
var J = /** @class */ function() {
    function t(t) {
        this.P = t, this.data = new H(this.P);
    }
    return t.prototype.has = function(t) {
        return null !== this.data.get(t);
    }, t.prototype.first = function() {
        return this.data.it();
    }, t.prototype.last = function() {
        return this.data.rt();
    }, Object.defineProperty(t.prototype, "size", {
        get: function() {
            return this.data.size;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.indexOf = function(t) {
        return this.data.indexOf(t);
    }, 
    /** Iterates elements in order defined by "comparator" */ t.prototype.forEach = function(t) {
        this.data.ot((function(e, n) {
            return t(e), !1;
        }));
    }, 
    /** Iterates over `elem`s such that: range[0] <= elem < range[1]. */ t.prototype.bt = function(t, e) {
        for (var n = this.data.ut(t[0]); n.wt(); ) {
            var r = n.dt();
            if (this.P(r.key, t[1]) >= 0) return;
            e(r.key);
        }
    }, 
    /**
     * Iterates over `elem`s such that: start <= elem until false is returned.
     */
    t.prototype.St = function(t, e) {
        var n;
        for (n = void 0 !== e ? this.data.ut(e) : this.data.at(); n.wt(); ) if (!t(n.dt().key)) return;
    }, 
    /** Finds the least element greater than or equal to `elem`. */ t.prototype.Ct = function(t) {
        var e = this.data.ut(t);
        return e.wt() ? e.dt().key : null;
    }, t.prototype.at = function() {
        return new Z(this.data.at());
    }, t.prototype.ut = function(t) {
        return new Z(this.data.ut(t));
    }, 
    /** Inserts or updates an element */ t.prototype.add = function(t) {
        return this.copy(this.data.remove(t).nt(t, !0));
    }, 
    /** Deletes an element */ t.prototype.delete = function(t) {
        return this.has(t) ? this.copy(this.data.remove(t)) : this;
    }, t.prototype._ = function() {
        return this.data._();
    }, t.prototype.Dt = function(t) {
        var e = this;
        // Make sure `result` always refers to the larger one of the two sets.
                return e.size < t.size && (e = t, t = this), t.forEach((function(t) {
            e = e.add(t);
        })), e;
    }, t.prototype.isEqual = function(e) {
        if (!(e instanceof t)) return !1;
        if (this.size !== e.size) return !1;
        for (var n = this.data.at(), r = e.data.at(); n.wt(); ) {
            var i = n.dt().key, o = r.dt().key;
            if (0 !== this.P(i, o)) return !1;
        }
        return !0;
    }, t.prototype.F = function() {
        var t = [];
        return this.forEach((function(e) {
            t.push(e);
        })), t;
    }, t.prototype.toString = function() {
        var t = [];
        return this.forEach((function(e) {
            return t.push(e);
        })), "SortedSet(" + t.toString() + ")";
    }, t.prototype.copy = function(e) {
        var n = new t(this.P);
        return n.data = e, n;
    }, t;
}(), Z = /** @class */ function() {
    function t(t) {
        this.Ft = t;
    }
    return t.prototype.dt = function() {
        return this.Ft.dt().key;
    }, t.prototype.wt = function() {
        return this.Ft.wt();
    }, t;
}(), tt = new H(U.P);

function et() {
    return tt;
}

function nt() {
    return et();
}

var rt = new H(U.P);

function it() {
    return rt;
}

var ot = new H(U.P), st = new J(U.P);

function ut() {
    for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
    for (var n = st, r = 0, i = t; r < i.length; r++) {
        var o = i[r];
        n = n.add(o);
    }
    return n;
}

var at = new J(m);

function ct() {
    return at;
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
 * DocumentSet is an immutable (copy-on-write) collection that holds documents
 * in order specified by the provided comparator. We always add a document key
 * comparator on top of what is provided to guarantee document equality based on
 * the key.
 */ var ht = /** @class */ function() {
    /** The default ordering is by key if the comparator is omitted */
    function t(t) {
        // We are adding document key comparator to the end as it's the only
        // guaranteed unique property of a document.
        this.P = t ? function(e, n) {
            return t(e, n) || U.P(e.key, n.key);
        } : function(t, e) {
            return U.P(t.key, e.key);
        }, this.Nt = it(), this.$t = new H(this.P)
        /**
     * Returns an empty copy of the existing DocumentSet, using the same
     * comparator.
     */;
    }
    return t.kt = function(e) {
        return new t(e.P);
    }, t.prototype.has = function(t) {
        return null != this.Nt.get(t);
    }, t.prototype.get = function(t) {
        return this.Nt.get(t);
    }, t.prototype.first = function() {
        return this.$t.it();
    }, t.prototype.last = function() {
        return this.$t.rt();
    }, t.prototype._ = function() {
        return this.$t._();
    }, 
    /**
     * Returns the index of the provided key in the document set, or -1 if the
     * document key is not present in the set;
     */
    t.prototype.indexOf = function(t) {
        var e = this.Nt.get(t);
        return e ? this.$t.indexOf(e) : -1;
    }, Object.defineProperty(t.prototype, "size", {
        get: function() {
            return this.$t.size;
        },
        enumerable: !1,
        configurable: !0
    }), 
    /** Iterates documents in order defined by "comparator" */ t.prototype.forEach = function(t) {
        this.$t.ot((function(e, n) {
            return t(e), !1;
        }));
    }, 
    /** Inserts or updates a document with the same key */ t.prototype.add = function(t) {
        // First remove the element if we have it.
        var e = this.delete(t.key);
        return e.copy(e.Nt.nt(t.key, t), e.$t.nt(t, null));
    }, 
    /** Deletes a document with a given key */ t.prototype.delete = function(t) {
        var e = this.get(t);
        return e ? this.copy(this.Nt.remove(t), this.$t.remove(e)) : this;
    }, t.prototype.isEqual = function(e) {
        if (!(e instanceof t)) return !1;
        if (this.size !== e.size) return !1;
        for (var n = this.$t.at(), r = e.$t.at(); n.wt(); ) {
            var i = n.dt().key, o = r.dt().key;
            if (!i.isEqual(o)) return !1;
        }
        return !0;
    }, t.prototype.toString = function() {
        var t = [];
        return this.forEach((function(e) {
            t.push(e.toString());
        })), 0 === t.length ? "DocumentSet ()" : "DocumentSet (\n  " + t.join("  \n") + "\n)";
    }, t.prototype.copy = function(e, n) {
        var r = new t;
        return r.P = this.P, r.Nt = e, r.$t = n, r;
    }, t;
}(), ft = /** @class */ function() {
    function t() {
        this.xt = new H(U.P);
    }
    return t.prototype.track = function(t) {
        var e = t.doc.key, n = this.xt.get(e);
        n ? 
        // Merge the new change with the existing change.
        0 /* Added */ !== t.type && 3 /* Metadata */ === n.type ? this.xt = this.xt.nt(e, t) : 3 /* Metadata */ === t.type && 1 /* Removed */ !== n.type ? this.xt = this.xt.nt(e, {
            type: n.type,
            doc: t.doc
        }) : 2 /* Modified */ === t.type && 2 /* Modified */ === n.type ? this.xt = this.xt.nt(e, {
            type: 2 /* Modified */ ,
            doc: t.doc
        }) : 2 /* Modified */ === t.type && 0 /* Added */ === n.type ? this.xt = this.xt.nt(e, {
            type: 0 /* Added */ ,
            doc: t.doc
        }) : 1 /* Removed */ === t.type && 0 /* Added */ === n.type ? this.xt = this.xt.remove(e) : 1 /* Removed */ === t.type && 2 /* Modified */ === n.type ? this.xt = this.xt.nt(e, {
            type: 1 /* Removed */ ,
            doc: n.doc
        }) : 0 /* Added */ === t.type && 1 /* Removed */ === n.type ? this.xt = this.xt.nt(e, {
            type: 2 /* Modified */ ,
            doc: t.doc
        }) : 
        // This includes these cases, which don't make sense:
        // Added->Added
        // Removed->Removed
        // Modified->Added
        // Removed->Modified
        // Metadata->Added
        // Removed->Metadata
        p() : this.xt = this.xt.nt(e, t);
    }, t.prototype.Lt = function() {
        var t = [];
        return this.xt.ot((function(e, n) {
            t.push(n);
        })), t;
    }, t;
}(), lt = /** @class */ function() {
    function t(t, e, n, r, i, o, s, u) {
        this.query = t, this.docs = e, this.Ot = n, this.docChanges = r, this.Mt = i, this.fromCache = o, 
        this.qt = s, this.Ut = u
        /** Returns a view snapshot as if all documents in the snapshot were added. */;
    }
    return t.Bt = function(e, n, r, i) {
        var o = [];
        return n.forEach((function(t) {
            o.push({
                type: 0 /* Added */ ,
                doc: t
            });
        })), new t(e, n, ht.kt(n), o, r, i, 
        /* syncStateChanged= */ !0, 
        /* excludesMetadataChanges= */ !1);
    }, Object.defineProperty(t.prototype, "hasPendingWrites", {
        get: function() {
            return !this.Mt._();
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.isEqual = function(t) {
        if (!(this.fromCache === t.fromCache && this.qt === t.qt && this.Mt.isEqual(t.Mt) && nn(this.query, t.query) && this.docs.isEqual(t.docs) && this.Ot.isEqual(t.Ot))) return !1;
        var e = this.docChanges, n = t.docChanges;
        if (e.length !== n.length) return !1;
        for (var r = 0; r < e.length; r++) if (e[r].type !== n[r].type || !e[r].doc.isEqual(n[r].doc)) return !1;
        return !0;
    }, t;
}(), pt = /** @class */ function() {
    function t(
    /**
     * The snapshot version this event brings us up to, or MIN if not set.
     */
    t, 
    /**
     * A map from target to changes to the target. See TargetChange.
     */
    e, 
    /**
     * A set of targets that is known to be inconsistent. Listens for these
     * targets should be re-established without resume tokens.
     */
    n, 
    /**
     * A set of which documents have changed or been deleted, along with the
     * doc's new values (if not deleted).
     */
    r, 
    /**
     * A set of which document updates are due only to limbo resolution targets.
     */
    i) {
        this.J = t, this.Wt = e, this.Qt = n, this.jt = r, this.Gt = i;
    }
    /**
     * HACK: Views require RemoteEvents in order to determine whether the view is
     * CURRENT, but secondary tabs don't receive remote events. So this method is
     * used to create a synthesized RemoteEvent that can be used to apply a
     * CURRENT status change to a View, for queries executed in a different tab.
     */
    // PORTING NOTE: Multi-tab only
        return t.Kt = function(e, n) {
        var r = new Map;
        return r.set(e, dt.zt(e, n)), new t(L.min(), r, ct(), et(), ut());
    }, t;
}(), dt = /** @class */ function() {
    function t(
    /**
     * An opaque, server-assigned token that allows watching a query to be resumed
     * after disconnecting without retransmitting all the data that matches the
     * query. The resume token essentially identifies a point in time from which
     * the server should resume sending results.
     */
    t, 
    /**
     * The "current" (synced) status of this target. Note that "current"
     * has special meaning in the RPC protocol that implies that a target is
     * both up-to-date and consistent with the rest of the watch stream.
     */
    e, 
    /**
     * The set of documents that were newly assigned to this target as part of
     * this remote event.
     */
    n, 
    /**
     * The set of documents that were already assigned to this target but received
     * an update during this remote event.
     */
    r, 
    /**
     * The set of documents that were removed from this target as part of this
     * remote event.
     */
    i) {
        this.resumeToken = t, this.Ht = e, this.Yt = n, this.Xt = r, this.Jt = i
        /**
     * This method is used to create a synthesized TargetChanges that can be used to
     * apply a CURRENT status change to a View (for queries executed in a different
     * tab) or for new queries (to raise snapshots with correct CURRENT status).
     */;
    }
    return t.zt = function(e, n) {
        return new t(F.Y, n, ut(), ut(), ut());
    }, t;
}(), yt = function(
/** The new document applies to all of these targets. */
t, 
/** The new document is removed from all of these targets. */
e, 
/** The key of the document for this change. */
n, 
/**
     * The new document or NoDocument if it was deleted. Is null if the
     * document went out of view without the server sending a new document.
     */
r) {
    this.Zt = t, this.removedTargetIds = e, this.key = n, this.te = r;
}, vt = function(t, e) {
    this.targetId = t, this.ee = e;
}, gt = function(
/** What kind of change occurred to the watch target. */
t, 
/** The target IDs that were added/removed/set. */
e, 
/**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
n
/** An RPC error indicating why the watch failed. */ , r) {
    void 0 === n && (n = F.Y), void 0 === r && (r = null), this.state = t, this.targetIds = e, 
    this.resumeToken = n, this.cause = r;
}, mt = /** @class */ function() {
    function t() {
        /**
         * The number of pending responses (adds or removes) that we are waiting on.
         * We only consider targets active that have no pending responses.
         */
        this.ne = 0, 
        /**
             * Keeps track of the document changes since the last raised snapshot.
             *
             * These changes are continuously updated as we receive document updates and
             * always reflect the current set of changes against the last issued snapshot.
             */
        this.se = bt(), 
        /** See public getters for explanations of these fields. */
        this.ie = F.Y, this.re = !1, 
        /**
             * Whether this target state should be included in the next snapshot. We
             * initialize to true so that newly-added targets are included in the next
             * RemoteEvent.
             */
        this.oe = !0;
    }
    return Object.defineProperty(t.prototype, "Ht", {
        /**
         * Whether this target has been marked 'current'.
         *
         * 'Current' has special meaning in the RPC protocol: It implies that the
         * Watch backend has sent us all changes up to the point at which the target
         * was added and that the target is consistent with the rest of the watch
         * stream.
         */
        get: function() {
            return this.re;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "resumeToken", {
        /** The last resume token sent to us for this target. */ get: function() {
            return this.ie;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "he", {
        /** Whether this target has pending target adds or target removes. */ get: function() {
            return 0 !== this.ne;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "ae", {
        /** Whether we have modified any state that should trigger a snapshot. */ get: function() {
            return this.oe;
        },
        enumerable: !1,
        configurable: !0
    }), 
    /**
     * Applies the resume token to the TargetChange, but only when it has a new
     * value. Empty resumeTokens are discarded.
     */
    t.prototype.ue = function(t) {
        t.H() > 0 && (this.oe = !0, this.ie = t);
    }, 
    /**
     * Creates a target change from the current set of changes.
     *
     * To reset the document changes after raising this snapshot, call
     * `clearPendingChanges()`.
     */
    t.prototype.ce = function() {
        var t = ut(), e = ut(), n = ut();
        return this.se.forEach((function(r, i) {
            switch (i) {
              case 0 /* Added */ :
                t = t.add(r);
                break;

              case 2 /* Modified */ :
                e = e.add(r);
                break;

              case 1 /* Removed */ :
                n = n.add(r);
                break;

              default:
                p();
            }
        })), new dt(this.ie, this.re, t, e, n);
    }, 
    /**
     * Resets the document changes and sets `hasPendingChanges` to false.
     */
    t.prototype.le = function() {
        this.oe = !1, this.se = bt();
    }, t.prototype._e = function(t, e) {
        this.oe = !0, this.se = this.se.nt(t, e);
    }, t.prototype.fe = function(t) {
        this.oe = !0, this.se = this.se.remove(t);
    }, t.prototype.de = function() {
        this.ne += 1;
    }, t.prototype.we = function() {
        this.ne -= 1;
    }, t.prototype.Te = function() {
        this.oe = !0, this.re = !0;
    }, t;
}(), wt = /** @class */ function() {
    function t(t) {
        this.me = t, 
        /** The internal state of all tracked targets. */
        this.Ee = new Map, 
        /** Keeps track of the documents to update since the last raised snapshot. */
        this.Ie = et(), 
        /** A mapping of document keys to their set of target IDs. */
        this.Re = _t(), 
        /**
             * A list of targets with existence filter mismatches. These targets are
             * known to be inconsistent and their listens needs to be re-established by
             * RemoteStore.
             */
        this.Ae = new J(m)
        /**
     * Processes and adds the DocumentWatchChange to the current set of changes.
     */;
    }
    return t.prototype.Pe = function(t) {
        for (var e = 0, n = t.Zt; e < n.length; e++) {
            var r = n[e];
            t.te instanceof ze ? this.Ve(r, t.te) : t.te instanceof We && this.ye(r, t.key, t.te);
        }
        for (var i = 0, o = t.removedTargetIds; i < o.length; i++) {
            var s = o[i];
            this.ye(s, t.key, t.te);
        }
    }, 
    /** Processes and adds the WatchTargetChange to the current set of changes. */ t.prototype.pe = function(t) {
        var e = this;
        this.ge(t, (function(n) {
            var r = e.ve(n);
            switch (t.state) {
              case 0 /* NoChange */ :
                e.be(n) && r.ue(t.resumeToken);
                break;

              case 1 /* Added */ :
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                r.we(), r.he || 
                // We have a freshly added target, so we need to reset any state
                // that we had previously. This can happen e.g. when remove and add
                // back a target for existence filter mismatches.
                r.le(), r.ue(t.resumeToken);
                break;

              case 2 /* Removed */ :
                // We need to keep track of removed targets to we can post-filter and
                // remove any target changes.
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                r.we(), r.he || e.removeTarget(n);
                break;

              case 3 /* Current */ :
                e.be(n) && (r.Te(), r.ue(t.resumeToken));
                break;

              case 4 /* Reset */ :
                e.be(n) && (
                // Reset the target and synthesizes removes for all existing
                // documents. The backend will re-add any documents that still
                // match the target before it sends the next global snapshot.
                e.Se(n), r.ue(t.resumeToken));
                break;

              default:
                p();
            }
        }));
    }, 
    /**
     * Iterates over all targetIds that the watch change applies to: either the
     * targetIds explicitly listed in the change or the targetIds of all currently
     * active targets.
     */
    t.prototype.ge = function(t, e) {
        var n = this;
        t.targetIds.length > 0 ? t.targetIds.forEach(e) : this.Ee.forEach((function(t, r) {
            n.be(r) && e(r);
        }));
    }, 
    /**
     * Handles existence filters and synthesizes deletes for filter mismatches.
     * Targets that are invalidated by filter mismatches are added to
     * `pendingTargetResets`.
     */
    t.prototype.Ce = function(t) {
        var e = t.targetId, n = t.ee.count, r = this.De(e);
        if (r) {
            var i = r.target;
            if (G(i)) if (0 === n) {
                // The existence filter told us the document does not exist. We deduce
                // that this document does not exist and apply a deleted document to
                // our updates. Without applying this deleted document there might be
                // another query that will raise this document as part of a snapshot
                // until it is resolved, essentially exposing inconsistency between
                // queries.
                var o = new U(i.path);
                this.ye(e, o, new We(o, L.min()));
            } else d(1 === n); else this.Fe(e) !== n && (
            // Existence filter mismatch: We reset the mapping and raise a new
            // snapshot with `isFromCache:true`.
            this.Se(e), this.Ae = this.Ae.add(e));
        }
    }, 
    /**
     * Converts the currently accumulated state into a remote event at the
     * provided snapshot version. Resets the accumulated changes before returning.
     */
    t.prototype.Ne = function(t) {
        var e = this, n = new Map;
        this.Ee.forEach((function(r, i) {
            var o = e.De(i);
            if (o) {
                if (r.Ht && G(o.target)) {
                    // Document queries for document that don't exist can produce an empty
                    // result set. To update our local cache, we synthesize a document
                    // delete if we have not previously received the document. This
                    // resolves the limbo state of the document, removing it from
                    // limboDocumentRefs.
                    // TODO(dimond): Ideally we would have an explicit lookup target
                    // instead resulting in an explicit delete message and we could
                    // remove this special logic.
                    var s = new U(o.target.path);
                    null !== e.Ie.get(s) || e.$e(i, s) || e.ye(i, s, new We(s, t));
                }
                r.ae && (n.set(i, r.ce()), r.le());
            }
        }));
        var r = ut();
        // We extract the set of limbo-only document updates as the GC logic
        // special-cases documents that do not appear in the target cache.
        // TODO(gsoltis): Expand on this comment once GC is available in the JS
        // client.
                this.Re.forEach((function(t, n) {
            var i = !0;
            n.St((function(t) {
                var n = e.De(t);
                return !n || 2 /* LimboResolution */ === n.X || (i = !1, !1);
            })), i && (r = r.add(t));
        }));
        var i = new pt(t, n, this.Ae, this.Ie, r);
        return this.Ie = et(), this.Re = _t(), this.Ae = new J(m), i;
    }, 
    /**
     * Adds the provided document to the internal list of document updates and
     * its document key to the given target's mapping.
     */
    // Visible for testing.
    t.prototype.Ve = function(t, e) {
        if (this.be(t)) {
            var n = this.$e(t, e.key) ? 2 /* Modified */ : 0 /* Added */;
            this.ve(t)._e(e.key, n), this.Ie = this.Ie.nt(e.key, e), this.Re = this.Re.nt(e.key, this.ke(e.key).add(t));
        }
    }, 
    /**
     * Removes the provided document from the target mapping. If the
     * document no longer matches the target, but the document's state is still
     * known (e.g. we know that the document was deleted or we received the change
     * that caused the filter mismatch), the new document can be provided
     * to update the remote document cache.
     */
    // Visible for testing.
    t.prototype.ye = function(t, e, n) {
        if (this.be(t)) {
            var r = this.ve(t);
            this.$e(t, e) ? r._e(e, 1 /* Removed */) : 
            // The document may have entered and left the target before we raised a
            // snapshot, so we can just ignore the change.
            r.fe(e), this.Re = this.Re.nt(e, this.ke(e).delete(t)), n && (this.Ie = this.Ie.nt(e, n));
        }
    }, t.prototype.removeTarget = function(t) {
        this.Ee.delete(t);
    }, 
    /**
     * Returns the current count of documents in the target. This includes both
     * the number of documents that the LocalStore considers to be part of the
     * target as well as any accumulated changes.
     */
    t.prototype.Fe = function(t) {
        var e = this.ve(t).ce();
        return this.me.xe(t).size + e.Yt.size - e.Jt.size;
    }, 
    /**
     * Increment the number of acks needed from watch before we can consider the
     * server to be 'in-sync' with the client's active targets.
     */
    t.prototype.de = function(t) {
        this.ve(t).de();
    }, t.prototype.ve = function(t) {
        var e = this.Ee.get(t);
        return e || (e = new mt, this.Ee.set(t, e)), e;
    }, t.prototype.ke = function(t) {
        var e = this.Re.get(t);
        return e || (e = new J(m), this.Re = this.Re.nt(t, e)), e;
    }, 
    /**
     * Verifies that the user is still interested in this target (by calling
     * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
     * from watch.
     */
    t.prototype.be = function(t) {
        var e = null !== this.De(t);
        return e || c("WatchChangeAggregator", "Detected inactive target", t), e;
    }, 
    /**
     * Returns the TargetData for an active target (i.e. a target that the user
     * is still interested in that has no outstanding target change requests).
     */
    t.prototype.De = function(t) {
        var e = this.Ee.get(t);
        return e && e.he ? null : this.me.Le(t);
    }, 
    /**
     * Resets the state of a Watch target to its initial state (e.g. sets
     * 'current' to false, clears the resume token and removes its target mapping
     * from all documents).
     */
    t.prototype.Se = function(t) {
        var e = this;
        this.Ee.set(t, new mt), this.me.xe(t).forEach((function(n) {
            e.ye(t, n, /*updatedDocument=*/ null);
        }));
    }, 
    /**
     * Returns whether the LocalStore considers the document to be part of the
     * specified target.
     */
    t.prototype.$e = function(t, e) {
        return this.me.xe(t).has(e);
    }, t;
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
 * DocumentChangeSet keeps track of a set of changes to docs in a query, merging
 * duplicate events for the same doc.
 */ function _t() {
    return new H(U.P);
}

function bt() {
    return new H(U.P);
}

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
/**
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
 */ function Et(t) {
    var e, n;
    return "server_timestamp" === (null === (n = ((null === (e = null == t ? void 0 : t.mapValue) || void 0 === e ? void 0 : e.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
}

/**
 * Creates a new ServerTimestamp proto value (using the internal format).
 */
/**
 * Returns the local time at which this timestamp was first set.
 */ function It(t) {
    var e = Ot(t.mapValue.fields.__local_write_time__.timestampValue);
    return new D(e.seconds, e.nanos);
}

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
// A RegExp matching ISO 8601 UTC timestamps with optional fraction.
var Nt = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

/** Extracts the backend's type order for the provided value. */ function At(t) {
    return "nullValue" in t ? 0 /* NullValue */ : "booleanValue" in t ? 1 /* BooleanValue */ : "integerValue" in t || "doubleValue" in t ? 2 /* NumberValue */ : "timestampValue" in t ? 3 /* TimestampValue */ : "stringValue" in t ? 5 /* StringValue */ : "bytesValue" in t ? 6 /* BlobValue */ : "referenceValue" in t ? 7 /* RefValue */ : "geoPointValue" in t ? 8 /* GeoPointValue */ : "arrayValue" in t ? 9 /* ArrayValue */ : "mapValue" in t ? Et(t) ? 4 /* ServerTimestampValue */ : 10 /* ObjectValue */ : p();
}

/** Tests `left` and `right` for equality based on the backend semantics. */ function Tt(t, e) {
    var n = At(t);
    if (n !== At(e)) return !1;
    switch (n) {
      case 0 /* NullValue */ :
        return !0;

      case 1 /* BooleanValue */ :
        return t.booleanValue === e.booleanValue;

      case 4 /* ServerTimestampValue */ :
        return It(t).isEqual(It(e));

      case 3 /* TimestampValue */ :
        return function(t, e) {
            if ("string" == typeof t.timestampValue && "string" == typeof e.timestampValue && t.timestampValue.length === e.timestampValue.length) 
            // Use string equality for ISO 8601 timestamps
            return t.timestampValue === e.timestampValue;
            var n = Ot(t.timestampValue), r = Ot(e.timestampValue);
            return n.seconds === r.seconds && n.nanos === r.nanos;
        }(t, e);

      case 5 /* StringValue */ :
        return t.stringValue === e.stringValue;

      case 6 /* BlobValue */ :
        return function(t, e) {
            return Vt(t.bytesValue).isEqual(Vt(e.bytesValue));
        }(t, e);

      case 7 /* RefValue */ :
        return t.referenceValue === e.referenceValue;

      case 8 /* GeoPointValue */ :
        return function(t, e) {
            return Pt(t.geoPointValue.latitude) === Pt(e.geoPointValue.latitude) && Pt(t.geoPointValue.longitude) === Pt(e.geoPointValue.longitude);
        }(t, e);

      case 2 /* NumberValue */ :
        return function(t, e) {
            if ("integerValue" in t && "integerValue" in e) return Pt(t.integerValue) === Pt(e.integerValue);
            if ("doubleValue" in t && "doubleValue" in e) {
                var n = Pt(t.doubleValue), r = Pt(e.doubleValue);
                return n === r ? M(n) === M(r) : isNaN(n) && isNaN(r);
            }
            return !1;
        }(t, e);

      case 9 /* ArrayValue */ :
        return w(t.arrayValue.values || [], e.arrayValue.values || [], Tt);

      case 10 /* ObjectValue */ :
        return function(t, e) {
            var n = t.mapValue.fields || {}, r = e.mapValue.fields || {};
            if (E(n) !== E(r)) return !1;
            for (var i in n) if (n.hasOwnProperty(i) && (void 0 === r[i] || !Tt(n[i], r[i]))) return !1;
            return !0;
        }(t, e);

      default:
        return p();
    }
}

function Rt(t, e) {
    return void 0 !== (t.values || []).find((function(t) {
        return Tt(t, e);
    }));
}

function Dt(t, e) {
    var n = At(t), r = At(e);
    if (n !== r) return m(n, r);
    switch (n) {
      case 0 /* NullValue */ :
        return 0;

      case 1 /* BooleanValue */ :
        return m(t.booleanValue, e.booleanValue);

      case 2 /* NumberValue */ :
        return function(t, e) {
            var n = Pt(t.integerValue || t.doubleValue), r = Pt(e.integerValue || e.doubleValue);
            return n < r ? -1 : n > r ? 1 : n === r ? 0 : 
            // one or both are NaN.
            isNaN(n) ? isNaN(r) ? 0 : -1 : 1;
        }(t, e);

      case 3 /* TimestampValue */ :
        return Lt(t.timestampValue, e.timestampValue);

      case 4 /* ServerTimestampValue */ :
        return Lt(It(t), It(e));

      case 5 /* StringValue */ :
        return m(t.stringValue, e.stringValue);

      case 6 /* BlobValue */ :
        return function(t, e) {
            var n = Vt(t), r = Vt(e);
            return n.o(r);
        }(t.bytesValue, e.bytesValue);

      case 7 /* RefValue */ :
        return function(t, e) {
            for (var n = t.split("/"), r = e.split("/"), i = 0; i < n.length && i < r.length; i++) {
                var o = m(n[i], r[i]);
                if (0 !== o) return o;
            }
            return m(n.length, r.length);
        }(t.referenceValue, e.referenceValue);

      case 8 /* GeoPointValue */ :
        return function(t, e) {
            var n = m(Pt(t.latitude), Pt(e.latitude));
            return 0 !== n ? n : m(Pt(t.longitude), Pt(e.longitude));
        }(t.geoPointValue, e.geoPointValue);

      case 9 /* ArrayValue */ :
        return function(t, e) {
            for (var n = t.values || [], r = e.values || [], i = 0; i < n.length && i < r.length; ++i) {
                var o = Dt(n[i], r[i]);
                if (o) return o;
            }
            return m(n.length, r.length);
        }(t.arrayValue, e.arrayValue);

      case 10 /* ObjectValue */ :
        return function(t, e) {
            var n = t.fields || {}, r = Object.keys(n), i = e.fields || {}, o = Object.keys(i);
            // Even though MapValues are likely sorted correctly based on their insertion
            // order (e.g. when received from the backend), local modifications can bring
            // elements out of order. We need to re-sort the elements to ensure that
            // canonical IDs are independent of insertion order.
                        r.sort(), o.sort();
            for (var s = 0; s < r.length && s < o.length; ++s) {
                var u = m(r[s], o[s]);
                if (0 !== u) return u;
                var a = Dt(n[r[s]], i[o[s]]);
                if (0 !== a) return a;
            }
            return m(r.length, o.length);
        }(t.mapValue, e.mapValue);

      default:
        throw p();
    }
}

function Lt(t, e) {
    if ("string" == typeof t && "string" == typeof e && t.length === e.length) return m(t, e);
    var n = Ot(t), r = Ot(e), i = m(n.seconds, r.seconds);
    return 0 !== i ? i : m(n.nanos, r.nanos);
}

function kt(t) {
    return function t(e) {
        return "nullValue" in e ? "null" : "booleanValue" in e ? "" + e.booleanValue : "integerValue" in e ? "" + e.integerValue : "doubleValue" in e ? "" + e.doubleValue : "timestampValue" in e ? function(t) {
            var e = Ot(t);
            return "time(" + e.seconds + "," + e.nanos + ")";
        }(e.timestampValue) : "stringValue" in e ? e.stringValue : "bytesValue" in e ? Vt(e.bytesValue).toBase64() : "referenceValue" in e ? (r = e.referenceValue, 
        U.U(r).toString()) : "geoPointValue" in e ? "geo(" + (n = e.geoPointValue).latitude + "," + n.longitude + ")" : "arrayValue" in e ? function(e) {
            for (var n = "[", r = !0, i = 0, o = e.values || []; i < o.length; i++) {
                var s = o[i];
                r ? r = !1 : n += ",", n += t(s);
            }
            return n + "]";
        }(e.arrayValue) : "mapValue" in e ? function(e) {
            for (
            // Iteration order in JavaScript is not guaranteed. To ensure that we generate
            // matching canonical IDs for identical maps, we need to sort the keys.
            var n = "{", r = !0, i = 0, o = Object.keys(e.fields || {}).sort(); i < o.length; i++) {
                var s = o[i];
                r ? r = !1 : n += ",", n += s + ":" + t(e.fields[s]);
            }
            return n + "}";
        }(e.mapValue) : p();
        var n, r;
    }(t);
}

function Ot(t) {
    // The json interface (for the browser) will return an iso timestamp string,
    // while the proto js library (for node) will return a
    // google.protobuf.Timestamp instance.
    if (d(!!t), "string" == typeof t) {
        // The date string can have higher precision (nanos) than the Date class
        // (millis), so we do some custom parsing here.
        // Parse the nanos right out of the string.
        var e = 0, n = Nt.exec(t);
        if (d(!!n), n[1]) {
            // Pad the fraction out to 9 digits (nanos).
            var r = n[1];
            r = (r + "000000000").substr(0, 9), e = Number(r);
        }
        // Parse the date to get the seconds.
                var i = new Date(t);
        return {
            seconds: Math.floor(i.getTime() / 1e3),
            nanos: e
        };
    }
    return {
        seconds: Pt(t.seconds),
        nanos: Pt(t.nanos)
    };
}

/**
 * Converts the possible Proto types for numbers into a JavaScript number.
 * Returns 0 if the value is not numeric.
 */ function Pt(t) {
    // TODO(bjornick): Handle int64 greater than 53 bits.
    return "number" == typeof t ? t : "string" == typeof t ? Number(t) : 0;
}

/** Converts the possible Proto types for Blobs into a ByteString. */ function Vt(t) {
    return "string" == typeof t ? F.fromBase64String(t) : F.fromUint8Array(t);
}

/** Returns a reference value for the provided database and key. */ function Ut(t, e) {
    return {
        referenceValue: "projects/" + t.projectId + "/databases/" + t.database + "/documents/" + e.path.N()
    };
}

/** Returns true if `value` is an IntegerValue . */ function St(t) {
    return !!t && "integerValue" in t;
}

/** Returns true if `value` is a DoubleValue. */
/** Returns true if `value` is an ArrayValue. */ function Mt(t) {
    return !!t && "arrayValue" in t;
}

/** Returns true if `value` is a NullValue. */ function Ct(t) {
    return !!t && "nullValue" in t;
}

/** Returns true if `value` is NaN. */ function xt(t) {
    return !!t && "doubleValue" in t && isNaN(Number(t.doubleValue));
}

/** Returns true if `value` is a MapValue. */ function qt(t) {
    return !!t && "mapValue" in t;
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
 */ var jt = {
    asc: "ASCENDING",
    desc: "DESCENDING"
}, Gt = {
    "<": "LESS_THAN",
    "<=": "LESS_THAN_OR_EQUAL",
    ">": "GREATER_THAN",
    ">=": "GREATER_THAN_OR_EQUAL",
    "==": "EQUAL",
    "!=": "NOT_EQUAL",
    "array-contains": "ARRAY_CONTAINS",
    in: "IN",
    "not-in": "NOT_IN",
    "array-contains-any": "ARRAY_CONTAINS_ANY"
}, Ft = function(t, e) {
    this.s = t, this.Oe = e;
};

/**
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
 */
/**
 * Returns an IntegerValue for `value`.
 */
function Bt(t) {
    return {
        integerValue: "" + t
    };
}

/**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */ function zt(t, e) {
    if (t.Oe) {
        if (isNaN(e)) return {
            doubleValue: "NaN"
        };
        if (e === 1 / 0) return {
            doubleValue: "Infinity"
        };
        if (e === -1 / 0) return {
            doubleValue: "-Infinity"
        };
    }
    return {
        doubleValue: M(e) ? "-0" : e
    };
}

/**
 * Returns a value for a number that's appropriate to put into a proto.
 * The return value is an IntegerValue if it can safely represent the value,
 * otherwise a DoubleValue is returned.
 */ function Wt(t, e) {
    return function(t) {
        return "number" == typeof t && Number.isInteger(t) && !M(t) && t <= Number.MAX_SAFE_INTEGER && t >= Number.MIN_SAFE_INTEGER;
    }(e) ? Bt(e) : zt(t, e);
}

/**
 * Returns a value for a Date that's appropriate to put into a proto.
 */ function Qt(t, e) {
    return t.Oe ? new Date(1e3 * e.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "") + "." + ("000000000" + e.nanoseconds).slice(-9) + "Z" : {
        seconds: "" + e.seconds,
        nanos: e.nanoseconds
    };
}

/**
 * Returns a value for bytes that's appropriate to put in a proto.
 *
 * Visible for testing.
 */ function Kt(t, e) {
    return t.Oe ? e.toBase64() : e.toUint8Array();
}

/**
 * Returns a ByteString based on the proto string value.
 */ function $t(t, e) {
    return Qt(t, e.R());
}

function Ht(t) {
    return d(!!t), L.m(function(t) {
        var e = Ot(t);
        return new D(e.seconds, e.nanos);
    }(t));
}

function Yt(t, e) {
    return function(t) {
        return new O([ "projects", t.projectId, "databases", t.database ]);
    }(t).child("documents").child(e).N();
}

function Xt(t, e) {
    return Yt(t.s, e.path);
}

function Jt(t, e) {
    var n, r = function(t) {
        var e = O.$(t);
        return d(ae(e)), e;
    }(e);
    return d(r.get(1) === t.s.projectId), d(!r.get(3) && !t.s.database || r.get(3) === t.s.database), 
    new U((d((n = r).length > 4 && "documents" === n.get(4)), n.p(5)));
}

function Zt(t, e) {
    return Yt(t.s, e);
}

function te(t) {
    return new O([ "projects", t.s.projectId, "databases", t.s.database ]).N();
}

function ee(t, e, n) {
    return {
        name: Xt(t, e),
        fields: n.proto.mapValue.fields
    };
}

function ne(t, e) {
    var n;
    if (e instanceof Pe) n = {
        update: ee(t, e.key, e.value)
    }; else if (e instanceof xe) n = {
        delete: Xt(t, e.key)
    }; else if (e instanceof Ve) n = {
        update: ee(t, e.key, e.data),
        updateMask: ue(e.Me)
    }; else if (e instanceof Se) n = {
        transform: {
            document: Xt(t, e.key),
            fieldTransforms: e.fieldTransforms.map((function(t) {
                return function(t, e) {
                    var n = e.transform;
                    if (n instanceof pe) return {
                        fieldPath: e.field.N(),
                        setToServerValue: "REQUEST_TIME"
                    };
                    if (n instanceof de) return {
                        fieldPath: e.field.N(),
                        appendMissingElements: {
                            values: n.elements
                        }
                    };
                    if (n instanceof ve) return {
                        fieldPath: e.field.N(),
                        removeAllFromArray: {
                            values: n.elements
                        }
                    };
                    if (n instanceof me) return {
                        fieldPath: e.field.N(),
                        increment: n.qe
                    };
                    throw p();
                }(0, t);
            }))
        }
    }; else {
        if (!(e instanceof qe)) return p();
        n = {
            verify: Xt(t, e.key)
        };
    }
    return e.Be.Ue || (n.currentDocument = function(t, e) {
        return void 0 !== e.updateTime ? {
            updateTime: $t(t, e.updateTime)
        } : void 0 !== e.exists ? {
            exists: e.exists
        } : p();
    }(t, e.Be)), n;
}

function re(t, e) {
    return {
        documents: [ Zt(t, e.path) ]
    };
}

function ie(t, e) {
    // Dissect the path into parent, collectionId, and optional key filter.
    var n = {
        structuredQuery: {}
    }, r = e.path;
    null !== e.collectionGroup ? (n.parent = Zt(t, r), n.structuredQuery.from = [ {
        collectionId: e.collectionGroup,
        allDescendants: !0
    } ]) : (n.parent = Zt(t, r.g()), n.structuredQuery.from = [ {
        collectionId: r.S()
    } ]);
    var i = function(t) {
        if (0 !== t.length) {
            var e = t.map((function(t) {
                // visible for testing
                return function(t) {
                    if ("==" /* EQUAL */ === t.op) {
                        if (xt(t.value)) return {
                            unaryFilter: {
                                field: se(t.field),
                                op: "IS_NAN"
                            }
                        };
                        if (Ct(t.value)) return {
                            unaryFilter: {
                                field: se(t.field),
                                op: "IS_NULL"
                            }
                        };
                    } else if ("!=" /* NOT_EQUAL */ === t.op) {
                        if (xt(t.value)) return {
                            unaryFilter: {
                                field: se(t.field),
                                op: "IS_NOT_NAN"
                            }
                        };
                        if (Ct(t.value)) return {
                            unaryFilter: {
                                field: se(t.field),
                                op: "IS_NOT_NULL"
                            }
                        };
                    }
                    return {
                        fieldFilter: {
                            field: se(t.field),
                            op: (e = t.op, Gt[e]),
                            value: t.value
                        }
                    };
                    // visible for testing
                                        var e;
                }(t);
            }));
            return 1 === e.length ? e[0] : {
                compositeFilter: {
                    op: "AND",
                    filters: e
                }
            };
        }
    }(e.filters);
    i && (n.structuredQuery.where = i);
    var o = function(t) {
        if (0 !== t.length) return t.map((function(t) {
            return {
                field: se((e = t).field),
                direction: (n = e.dir, jt[n])
            };
            // visible for testing
                        var e, n;
        }));
    }(e.orderBy);
    o && (n.structuredQuery.orderBy = o);
    var s = function(t, e) {
        return t.Oe || S(e) ? e : {
            value: e
        };
    }(t, e.limit);
    return null !== s && (n.structuredQuery.limit = s), e.startAt && (n.structuredQuery.startAt = oe(e.startAt)), 
    e.endAt && (n.structuredQuery.endAt = oe(e.endAt)), n;
}

function oe(t) {
    return {
        before: t.before,
        values: t.position
    };
}

// visible for testing
function se(t) {
    return {
        fieldPath: t.N()
    };
}

function ue(t) {
    var e = [];
    return t.fields.forEach((function(t) {
        return e.push(t.N());
    })), {
        fieldPaths: e
    };
}

function ae(t) {
    // Resource names have at least 4 components (project ID, database ID)
    return t.length >= 4 && "projects" === t.get(0) && "databases" === t.get(2);
}

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
/** Represents a transform within a TransformMutation. */ var ce = function() {
    // Make sure that the structural type of `TransformOperation` is unique.
    // See https://github.com/microsoft/TypeScript/issues/5451
    this.We = void 0;
};

/**
 * Computes the local transform result against the provided `previousValue`,
 * optionally using the provided localWriteTime.
 */ function he(t, e, n) {
    return t instanceof pe ? function(t, e) {
        var n = {
            fields: {
                __type__: {
                    stringValue: "server_timestamp"
                },
                __local_write_time__: {
                    timestampValue: {
                        seconds: t.seconds,
                        nanos: t.nanoseconds
                    }
                }
            }
        };
        return e && (n.fields.__previous_value__ = e), {
            mapValue: n
        };
    }(n, e) : t instanceof de ? ye(t, e) : t instanceof ve ? ge(t, e) : function(t, e) {
        // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
        // precision and resolves overflows by reducing precision, we do not
        // manually cap overflows at 2^63.
        var n = le(t, e), r = we(n) + we(t.qe);
        return St(n) && St(t.qe) ? Bt(r) : zt(t.serializer, r);
    }(t, e);
}

/**
 * Computes a final transform result after the transform has been acknowledged
 * by the server, potentially using the server-provided transformResult.
 */ function fe(t, e, n) {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return t instanceof de ? ye(t, e) : t instanceof ve ? ge(t, e) : n;
}

/**
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
 */ function le(t, e) {
    return t instanceof me ? St(n = e) || function(t) {
        return !!t && "doubleValue" in t;
    }(n) ? e : {
        integerValue: 0
    } : null;
    var n;
}

/** Transforms a value into a server-generated timestamp. */ var pe = /** @class */ function(t) {
    function n() {
        return null !== t && t.apply(this, arguments) || this;
    }
    return e.__extends(n, t), n;
}(ce), de = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this) || this).elements = e, n;
    }
    return e.__extends(n, t), n;
}(ce);

/** Transforms an array value via a union operation. */ function ye(t, e) {
    for (var n = _e(e), r = function(t) {
        n.some((function(e) {
            return Tt(e, t);
        })) || n.push(t);
    }, i = 0, o = t.elements; i < o.length; i++) {
        r(o[i]);
    }
    return {
        arrayValue: {
            values: n
        }
    };
}

/** Transforms an array value via a remove operation. */ var ve = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this) || this).elements = e, n;
    }
    return e.__extends(n, t), n;
}(ce);

function ge(t, e) {
    for (var n = _e(e), r = function(t) {
        n = n.filter((function(e) {
            return !Tt(e, t);
        }));
    }, i = 0, o = t.elements; i < o.length; i++) {
        r(o[i]);
    }
    return {
        arrayValue: {
            values: n
        }
    };
}

/**
 * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
 * transforms. Converts all field values to integers or doubles, but unlike the
 * backend does not cap integer values at 2^63. Instead, JavaScript number
 * arithmetic is used and precision loss can occur for values greater than 2^53.
 */ var me = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this) || this).serializer = e, r.qe = n, r;
    }
    return e.__extends(n, t), n;
}(ce);

function we(t) {
    return Pt(t.integerValue || t.doubleValue);
}

function _e(t) {
    return Mt(t) && t.arrayValue.values ? t.arrayValue.values.slice() : [];
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
 * Provides a set of fields that can be used to partially patch a document.
 * FieldMask is used in conjunction with ObjectValue.
 * Examples:
 *   foo - Overwrites foo entirely with the provided value. If foo is not
 *         present in the companion ObjectValue, the field is deleted.
 *   foo.bar - Overwrites only the field bar of the object foo.
 *             If foo is not an object, foo is replaced with an object
 *             containing foo
 */ var be = /** @class */ function() {
    function t(t) {
        this.fields = t, 
        // TODO(dimond): validation of FieldMask
        // Sort the field mask to support `FieldMask.isEqual()` and assert below.
        t.sort(V.P)
        /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */;
    }
    return t.prototype.Qe = function(t) {
        for (var e = 0, n = this.fields; e < n.length; e++) {
            if (n[e].C(t)) return !0;
        }
        return !1;
    }, t.prototype.isEqual = function(t) {
        return w(this.fields, t.fields, (function(t, e) {
            return t.isEqual(e);
        }));
    }, t;
}(), Ee = function(t, e) {
    this.field = t, this.transform = e;
};

/** A field path and the TransformOperation to perform upon it. */
/** The result of successfully applying a mutation to the backend. */ var Ie = function(
/**
     * The version at which the mutation was committed:
     *
     * - For most operations, this is the updateTime in the WriteResult.
     * - For deletes, the commitTime of the WriteResponse (because deletes are
     *   not stored and have no updateTime).
     *
     * Note that these versions can be different: No-op writes will not change
     * the updateTime even though the commitTime advances.
     */
t, 
/**
     * The resulting fields returned from the backend after a
     * TransformMutation has been committed. Contains one FieldValue for each
     * FieldTransform that was in the mutation.
     *
     * Will be null if the mutation was not a TransformMutation.
     */
e) {
    this.version = t, this.transformResults = e;
}, Ne = /** @class */ function() {
    function t(t, e) {
        this.updateTime = t, this.exists = e
        /** Creates a new empty Precondition. */;
    }
    return t.je = function() {
        return new t;
    }, 
    /** Creates a new Precondition with an exists flag. */ t.exists = function(e) {
        return new t(void 0, e);
    }, 
    /** Creates a new Precondition based on a version a document exists at. */ t.updateTime = function(e) {
        return new t(e);
    }, Object.defineProperty(t.prototype, "Ue", {
        /** Returns whether this Precondition is empty. */ get: function() {
            return void 0 === this.updateTime && void 0 === this.exists;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.isEqual = function(t) {
        return this.exists === t.exists && (this.updateTime ? !!t.updateTime && this.updateTime.isEqual(t.updateTime) : !t.updateTime);
    }, t;
}();

/**
 * Encodes a precondition for a mutation. This follows the model that the
 * backend accepts with the special case of an explicit "empty" precondition
 * (meaning no precondition).
 */
/**
 * Returns true if the preconditions is valid for the given document
 * (or null if no document is available).
 */
function Ae(t, e) {
    return void 0 !== t.updateTime ? e instanceof ze && e.version.isEqual(t.updateTime) : void 0 === t.exists || t.exists === e instanceof ze;
}

/**
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
 */ var Te = function() {};

/**
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
 */ function Re(t, e, n) {
    return t instanceof Pe ? function(t, e, n) {
        // Unlike applySetMutationToLocalView, if we're applying a mutation to a
        // remote document the server has accepted the mutation so the precondition
        // must have held.
        return new ze(t.key, n.version, t.value, {
            hasCommittedMutations: !0
        });
    }(t, 0, n) : t instanceof Ve ? function(t, e, n) {
        if (!Ae(t.Be, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new Qe(t.key, n.version);
        var r = Ue(t, e);
        return new ze(t.key, n.version, r, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : t instanceof Se ? function(t, e, n) {
        if (d(null != n.transformResults), !Ae(t.Be, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new Qe(t.key, n.version);
        var r = Me(t, e), i = 
        /**
 * Creates a list of "transform results" (a transform result is a field value
 * representing the result of applying a transform) for use after a
 * TransformMutation has been acknowledged by the server.
 *
 * @param fieldTransforms The field transforms to apply the result to.
 * @param baseDoc The document prior to applying this mutation batch.
 * @param serverTransformResults The transform results received by the server.
 * @return The transform results list.
 */
        function(t, e, n) {
            var r = [];
            d(t.length === n.length);
            for (var i = 0; i < n.length; i++) {
                var o = t[i], s = o.transform, u = null;
                e instanceof ze && (u = e.field(o.field)), r.push(fe(s, u, n[i]));
            }
            return r;
        }(t.fieldTransforms, e, n.transformResults), o = n.version, s = Ce(t, r.data(), i);
        return new ze(t.key, o, s, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : function(t, e, n) {
        // Unlike applyToLocalView, if we're applying a mutation to a remote
        // document the server has accepted the mutation so the precondition must
        // have held.
        return new We(t.key, n.version, {
            hasCommittedMutations: !0
        });
    }(t, 0, n);
}

/**
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
 */ function De(t, e, n, r) {
    return t instanceof Pe ? function(t, e) {
        if (!Ae(t.Be, e)) return e;
        var n = Oe(e);
        return new ze(t.key, n, t.value, {
            Ge: !0
        });
    }(t, e) : t instanceof Ve ? function(t, e) {
        if (!Ae(t.Be, e)) return e;
        var n = Oe(e), r = Ue(t, e);
        return new ze(t.key, n, r, {
            Ge: !0
        });
    }(t, e) : t instanceof Se ? function(t, e, n, r) {
        if (!Ae(t.Be, e)) return e;
        var i = Me(t, e), o = function(t, e, n, r) {
            for (var i = [], o = 0, s = t; o < s.length; o++) {
                var u = s[o], a = u.transform, c = null;
                n instanceof ze && (c = n.field(u.field)), null === c && r instanceof ze && (
                // If the current document does not contain a value for the mutated
                // field, use the value that existed before applying this mutation
                // batch. This solves an edge case where a PatchMutation clears the
                // values in a nested map before the TransformMutation is applied.
                c = r.field(u.field)), i.push(he(a, c, e));
            }
            return i;
        }(t.fieldTransforms, n, e, r), s = Ce(t, i.data(), o);
        return new ze(t.key, i.version, s, {
            Ge: !0
        });
    }(t, e, r, n) : function(t, e) {
        return Ae(t.Be, e) ? new We(t.key, L.min()) : e;
    }(t, e);
}

/**
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
 */ function Le(t, e) {
    return t instanceof Se ? function(t, e) {
        for (var n = null, r = 0, i = t.fieldTransforms; r < i.length; r++) {
            var o = i[r], s = e instanceof ze ? e.field(o.field) : void 0, u = le(o.transform, s || null);
            null != u && (n = null == n ? (new Ge).set(o.field, u) : n.set(o.field, u));
        }
        return n ? n.Ke() : null;
    }(t, e) : null;
}

function ke(t, e) {
    return t.type === e.type && !!t.key.isEqual(e.key) && !!t.Be.isEqual(e.Be) && (0 /* Set */ === t.type ? t.value.isEqual(e.value) : 1 /* Patch */ === t.type ? t.data.isEqual(e.data) && t.Me.isEqual(e.Me) : 2 /* Transform */ !== t.type || w(t.fieldTransforms, t.fieldTransforms, (function(t, e) {
        return function(t, e) {
            return t.field.isEqual(e.field) && function(t, e) {
                return t instanceof de && e instanceof de || t instanceof ve && e instanceof ve ? w(t.elements, e.elements, Tt) : t instanceof me && e instanceof me ? Tt(t.qe, e.qe) : t instanceof pe && e instanceof pe;
            }(t.transform, e.transform);
        }(t, e);
    })));
}

/**
 * Returns the version from the given document for use as the result of a
 * mutation. Mutations are defined to return the version of the base document
 * only if it is an existing document. Deleted and unknown documents have a
 * post-mutation version of SnapshotVersion.min().
 */ function Oe(t) {
    return t instanceof ze ? t.version : L.min();
}

/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */ var Pe = /** @class */ function(t) {
    function n(e, n, r) {
        var i = this;
        return (i = t.call(this) || this).key = e, i.value = n, i.Be = r, i.type = 0 /* Set */ , 
        i;
    }
    return e.__extends(n, t), n;
}(Te), Ve = /** @class */ function(t) {
    function n(e, n, r, i) {
        var o = this;
        return (o = t.call(this) || this).key = e, o.data = n, o.Me = r, o.Be = i, o.type = 1 /* Patch */ , 
        o;
    }
    return e.__extends(n, t), n;
}(Te);

function Ue(t, e) {
    return function(t, e) {
        var n = new Ge(e);
        return t.Me.fields.forEach((function(e) {
            if (!e._()) {
                var r = t.data.field(e);
                null !== r ? n.set(e, r) : n.delete(e);
            }
        })), n.Ke();
    }(t, e instanceof ze ? e.data() : je.empty());
}

var Se = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this) || this).key = e, r.fieldTransforms = n, r.type = 2 /* Transform */ , 
        // NOTE: We set a precondition of exists: true as a safety-check, since we
        // always combine TransformMutations with a SetMutation or PatchMutation which
        // (if successful) should end up with an existing document.
        r.Be = Ne.exists(!0), r;
    }
    return e.__extends(n, t), n;
}(Te);

function Me(t, e) {
    return e;
}

function Ce(t, e, n) {
    for (var r = new Ge(e), i = 0; i < t.fieldTransforms.length; i++) {
        var o = t.fieldTransforms[i];
        r.set(o.field, n[i]);
    }
    return r.Ke();
}

/** A mutation that deletes the document at the given key. */ var xe = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this) || this).key = e, r.Be = n, r.type = 3 /* Delete */ , r;
    }
    return e.__extends(n, t), n;
}(Te), qe = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this) || this).key = e, r.Be = n, r.type = 4 /* Verify */ , r;
    }
    return e.__extends(n, t), n;
}(Te), je = /** @class */ function() {
    function t(t) {
        this.proto = t;
    }
    return t.empty = function() {
        return new t({
            mapValue: {}
        });
    }, 
    /**
     * Returns the value at the given path or null.
     *
     * @param path the path to search
     * @return The value at the path or if there it doesn't exist.
     */
    t.prototype.field = function(t) {
        if (t._()) return this.proto;
        for (var e = this.proto, n = 0; n < t.length - 1; ++n) {
            if (!e.mapValue.fields) return null;
            if (!qt(e = e.mapValue.fields[t.get(n)])) return null;
        }
        return (e = (e.mapValue.fields || {})[t.S()]) || null;
    }, t.prototype.isEqual = function(t) {
        return Tt(this.proto, t.proto);
    }, t;
}(), Ge = /** @class */ function() {
    /**
     * @param baseObject The object to mutate.
     */
    function t(t) {
        void 0 === t && (t = je.empty()), this.ze = t, 
        /** A map that contains the accumulated changes in this builder. */
        this.He = new Map;
    }
    /**
     * Sets the field to the provided value.
     *
     * @param path The field path to set.
     * @param value The value to set.
     * @return The current Builder instance.
     */    return t.prototype.set = function(t, e) {
        return this.Ye(t, e), this;
    }, 
    /**
     * Removes the field at the specified path. If there is no field at the
     * specified path, nothing is changed.
     *
     * @param path The field path to remove.
     * @return The current Builder instance.
     */
    t.prototype.delete = function(t) {
        return this.Ye(t, null), this;
    }, 
    /**
     * Adds `value` to the overlay map at `path`. Creates nested map entries if
     * needed.
     */
    t.prototype.Ye = function(t, e) {
        for (var n = this.He, r = 0; r < t.length - 1; ++r) {
            var i = t.get(r), o = n.get(i);
            o instanceof Map ? 
            // Re-use a previously created map
            n = o : o && 10 /* ObjectValue */ === At(o) ? (
            // Convert the existing Protobuf MapValue into a map
            o = new Map(Object.entries(o.mapValue.fields || {})), n.set(i, o), n = o) : (
            // Create an empty map to represent the current nesting level
            o = new Map, n.set(i, o), n = o);
        }
        n.set(t.S(), e);
    }, 
    /** Returns an ObjectValue with all mutations applied. */ t.prototype.Ke = function() {
        var t = this.Xe(V.k(), this.He);
        return null != t ? new je(t) : this.ze;
    }, 
    /**
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
     */
    t.prototype.Xe = function(t, e) {
        var n = this, r = !1, i = this.ze.field(t), o = qt(i) ? // If there is already data at the current path, base our
        Object.assign({}, i.mapValue.fields) : {};
        return e.forEach((function(e, i) {
            if (e instanceof Map) {
                var s = n.Xe(t.child(i), e);
                null != s && (o[i] = s, r = !0);
            } else null !== e ? (o[i] = e, r = !0) : o.hasOwnProperty(i) && (delete o[i], r = !0);
        })), r ? {
            mapValue: {
                fields: o
            }
        } : null;
    }, t;
}();

/**
 * Returns a FieldMask built from all fields in a MapValue.
 */
function Fe(t) {
    var e = [];
    return I(t.fields || {}, (function(t, n) {
        var r = new V([ t ]);
        if (qt(n)) {
            var i = Fe(n.mapValue).fields;
            if (0 === i.length) 
            // Preserve the empty map by adding it to the FieldMask.
            e.push(r); else 
            // For nested and non-empty ObjectValues, add the FieldPath of the
            // leaf nodes.
            for (var o = 0, s = i; o < s.length; o++) {
                var u = s[o];
                e.push(r.child(u));
            }
        } else 
        // For nested and non-empty ObjectValues, add the FieldPath of the leaf
        // nodes.
        e.push(r);
    })), new be(e)
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
 * The result of a lookup for a given path may be an existing document or a
 * marker that this document does not exist at a given version.
 */;
}

var Be = function(t, e) {
    this.key = t, this.version = e;
}, ze = /** @class */ function(t) {
    function n(e, n, r, i) {
        var o = this;
        return (o = t.call(this, e, n) || this).Je = r, o.Ge = !!i.Ge, o.hasCommittedMutations = !!i.hasCommittedMutations, 
        o;
    }
    return e.__extends(n, t), n.prototype.field = function(t) {
        return this.Je.field(t);
    }, n.prototype.data = function() {
        return this.Je;
    }, n.prototype.Ze = function() {
        return this.Je.proto;
    }, n.prototype.isEqual = function(t) {
        return t instanceof n && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.Ge === t.Ge && this.hasCommittedMutations === t.hasCommittedMutations && this.Je.isEqual(t.Je);
    }, n.prototype.toString = function() {
        return "Document(" + this.key + ", " + this.version + ", " + this.Je.toString() + ", {hasLocalMutations: " + this.Ge + "}), {hasCommittedMutations: " + this.hasCommittedMutations + "})";
    }, Object.defineProperty(n.prototype, "hasPendingWrites", {
        get: function() {
            return this.Ge || this.hasCommittedMutations;
        },
        enumerable: !1,
        configurable: !0
    }), n;
}(Be), We = /** @class */ function(t) {
    function n(e, n, r) {
        var i = this;
        return (i = t.call(this, e, n) || this).hasCommittedMutations = !(!r || !r.hasCommittedMutations), 
        i;
    }
    return e.__extends(n, t), n.prototype.toString = function() {
        return "NoDocument(" + this.key + ", " + this.version + ")";
    }, Object.defineProperty(n.prototype, "hasPendingWrites", {
        get: function() {
            return this.hasCommittedMutations;
        },
        enumerable: !1,
        configurable: !0
    }), n.prototype.isEqual = function(t) {
        return t instanceof n && t.hasCommittedMutations === this.hasCommittedMutations && t.version.isEqual(this.version) && t.key.isEqual(this.key);
    }, n;
}(Be), Qe = /** @class */ function(t) {
    function n() {
        return null !== t && t.apply(this, arguments) || this;
    }
    return e.__extends(n, t), n.prototype.toString = function() {
        return "UnknownDocument(" + this.key + ", " + this.version + ")";
    }, Object.defineProperty(n.prototype, "hasPendingWrites", {
        get: function() {
            return !0;
        },
        enumerable: !1,
        configurable: !0
    }), n.prototype.isEqual = function(t) {
        return t instanceof n && t.version.isEqual(this.version) && t.key.isEqual(this.key);
    }, n;
}(Be);

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */
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
/**
 * Casts `obj` to `T`. Throws if  `obj` is not an instance of `T`.
 *
 * This cast is used in the Lite and Full SDK to verify instance types for
 * arguments passed to the public API.
 */
function Ke(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
e) {
    if (!(t instanceof e)) throw e.name === t.constructor.name ? new R(T.INVALID_ARGUMENT, "Type does not match the expected instance. Did you pass '" + e.name + "' from a different Firestore SDK?") : new R(T.INVALID_ARGUMENT, "Expected type '" + e.name + "', but was '" + t.constructor.name + "'");
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
/**
 * Query encapsulates all the query attributes we support in the SDK. It can
 * be run against the LocalStore, as well as be converted to a `Target` to
 * query the RemoteStore results.
 *
 * Visible for testing.
 */ var $e = /** @class */ function() {
    /**
     * Initializes a Query with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     */
    function t(t, e, n, r, i, o /* First */ , s, u) {
        void 0 === e && (e = null), void 0 === n && (n = []), void 0 === r && (r = []), 
        void 0 === i && (i = null), void 0 === o && (o = "F"), void 0 === s && (s = null), 
        void 0 === u && (u = null), this.path = t, this.collectionGroup = e, this.tn = n, 
        this.filters = r, this.limit = i, this.en = o, this.startAt = s, this.endAt = u, 
        this.nn = null, 
        // The corresponding `Target` of this `Query` instance.
        this.sn = null, this.startAt, this.endAt;
    }
    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */    return t.prototype.rn = function(e) {
        return new t(e, 
        /*collectionGroup=*/ null, this.tn.slice(), this.filters.slice(), this.limit, this.en, this.startAt, this.endAt);
    }, t.prototype.on = function() {
        return 0 === this.filters.length && null === this.limit && null == this.startAt && null == this.endAt && (0 === this.tn.length || 1 === this.tn.length && this.tn[0].field.O());
    }, t.prototype.hn = function() {
        return !S(this.limit) && "F" /* First */ === this.en;
    }, t.prototype.an = function() {
        return !S(this.limit) && "L" /* Last */ === this.en;
    }, t.prototype.un = function() {
        return this.tn.length > 0 ? this.tn[0].field : null;
    }, t.prototype.cn = function() {
        for (var t = 0, e = this.filters; t < e.length; t++) {
            var n = e[t];
            if (n.ln()) return n.field;
        }
        return null;
    }, t.prototype._n = function(t) {
        for (var e = 0, n = this.filters; e < n.length; e++) {
            var r = n[e];
            if (t.indexOf(r.op) >= 0) return r.op;
        }
        return null;
    }, t;
}();

/** Creates a new Query for a query that matches all documents at `path` */ function He(t) {
    return new $e(t);
}

/**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */ function Ye(t) {
    return null !== t.collectionGroup;
}

/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */ function Xe(t) {
    var e = Ke(t, $e);
    if (null === e.nn) {
        e.nn = [];
        var n = e.cn(), r = e.un();
        if (null !== n && null === r) 
        // In order to implicitly add key ordering, we must also add the
        // inequality filter field for it to be a valid query.
        // Note that the default inequality field and key ordering is ascending.
        n.O() || e.nn.push(new bn(n)), e.nn.push(new bn(V.M(), "asc" /* ASCENDING */)); else {
            for (var i = !1, o = 0, s = e.tn; o < s.length; o++) {
                var u = s[o];
                e.nn.push(u), u.field.O() && (i = !0);
            }
            if (!i) {
                // The order of the implicit key ordering always matches the last
                // explicit order by
                var a = e.tn.length > 0 ? e.tn[e.tn.length - 1].dir : "asc" /* ASCENDING */;
                e.nn.push(new bn(V.M(), a));
            }
        }
    }
    return e.nn;
}

/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */ function Je(t) {
    var e = Ke(t, $e);
    if (!e.sn) if ("F" /* First */ === e.en) e.sn = x(e.path, e.collectionGroup, Xe(e), e.filters, e.limit, e.startAt, e.endAt); else {
        for (
        // Flip the orderBy directions since we want the last results
        var n = [], r = 0, i = Xe(e); r < i.length; r++) {
            var o = i[r], s = "desc" /* DESCENDING */ === o.dir ? "asc" /* ASCENDING */ : "desc" /* DESCENDING */;
            n.push(new bn(o.field, s));
        }
        // We need to swap the cursors to match the now-flipped query ordering.
                var u = e.endAt ? new gn(e.endAt.position, !e.endAt.before) : null, a = e.startAt ? new gn(e.startAt.position, !e.startAt.before) : null;
        // Now return as a LimitType.First query.
                e.sn = x(e.path, e.collectionGroup, n, e.filters, e.limit, u, a);
    }
    return e.sn;
}

function Ze(t, e, n) {
    return new $e(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), e, n, t.startAt, t.endAt);
}

function tn(t, e) {
    return new $e(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), t.limit, t.en, e, t.endAt);
}

function en(t, e) {
    return new $e(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), t.limit, t.en, t.startAt, e);
}

function nn(t, e) {
    return j(Je(t), Je(e)) && t.en === e.en;
}

// TODO(b/29183165): This is used to get a unique string from a query to, for
// example, use as a dictionary key, but the implementation is subject to
// collisions. Make it collision-free.
function rn(t) {
    return q(Je(t)) + "|lt:" + t.en;
}

function on(t) {
    return "Query(target=" + function(t) {
        var e = t.path.N();
        return null !== t.collectionGroup && (e += " collectionGroup=" + t.collectionGroup), 
        t.filters.length > 0 && (e += ", filters: [" + t.filters.map((function(t) {
            return (e = t).field.N() + " " + e.op + " " + kt(e.value);
            /** Returns a debug description for `filter`. */            var e;
            /** Filter that matches on key fields (i.e. '__name__'). */        })).join(", ") + "]"), 
        S(t.limit) || (e += ", limit: " + t.limit), t.orderBy.length > 0 && (e += ", orderBy: [" + t.orderBy.map((function(t) {
            return (e = t).field.N() + " (" + e.dir + ")";
            var e;
        })).join(", ") + "]"), t.startAt && (e += ", startAt: " + mn(t.startAt)), t.endAt && (e += ", endAt: " + mn(t.endAt)), 
        "Target(" + e + ")";
    }(Je(t)) + "; limitType=" + t.en + ")";
}

/** Returns whether `doc` matches the constraints of `query`. */ function sn(t, e) {
    return function(t, e) {
        var n = e.key.path;
        return null !== t.collectionGroup ? e.key.B(t.collectionGroup) && t.path.C(n) : U.W(t.path) ? t.path.isEqual(n) : t.path.D(n);
    }(t, e) && function(t, e) {
        for (var n = 0, r = t.tn; n < r.length; n++) {
            var i = r[n];
            // order by key always matches
                        if (!i.field.O() && null === e.field(i.field)) return !1;
        }
        return !0;
    }(t, e) && function(t, e) {
        for (var n = 0, r = t.filters; n < r.length; n++) {
            if (!r[n].matches(e)) return !1;
        }
        return !0;
    }(t, e) && function(t, e) {
        return !(t.startAt && !wn(t.startAt, Xe(t), e)) && (!t.endAt || !wn(t.endAt, Xe(t), e));
    }(t, e);
}

function un(t) {
    return function(e, n) {
        for (var r = !1, i = 0, o = Xe(t); i < o.length; i++) {
            var s = o[i], u = En(s, e, n);
            if (0 !== u) return u;
            r = r || s.field.O();
        }
        return 0;
    };
}

var an = /** @class */ function(t) {
    function n(e, n, r) {
        var i = this;
        return (i = t.call(this) || this).field = e, i.op = n, i.value = r, i;
    }
    /**
     * Creates a filter based on the provided arguments.
     */    return e.__extends(n, t), n.create = function(t, e, r) {
        if (t.O()) return "in" /* IN */ === e || "not-in" /* NOT_IN */ === e ? this.fn(t, e, r) : new cn(t, e, r);
        if (Ct(r)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new R(T.INVALID_ARGUMENT, "Invalid query. Null supports only equality comparisons.");
            return new n(t, e, r);
        }
        if (xt(r)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new R(T.INVALID_ARGUMENT, "Invalid query. NaN supports only equality comparisons.");
            return new n(t, e, r);
        }
        return "array-contains" /* ARRAY_CONTAINS */ === e ? new pn(t, r) : "in" /* IN */ === e ? new dn(t, r) : "not-in" /* NOT_IN */ === e ? new yn(t, r) : "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e ? new vn(t, r) : new n(t, e, r);
    }, n.fn = function(t, e, n) {
        return "in" /* IN */ === e ? new hn(t, n) : new fn(t, n);
    }, n.prototype.matches = function(t) {
        var e = t.field(this.field);
        // Types do not have to match in NOT_EQUAL filters.
                return "!=" /* NOT_EQUAL */ === this.op ? null !== e && this.dn(Dt(e, this.value)) : null !== e && At(this.value) === At(e) && this.dn(Dt(e, this.value));
        // Only compare types with matching backend order (such as double and int).
        }, n.prototype.dn = function(t) {
        switch (this.op) {
          case "<" /* LESS_THAN */ :
            return t < 0;

          case "<=" /* LESS_THAN_OR_EQUAL */ :
            return t <= 0;

          case "==" /* EQUAL */ :
            return 0 === t;

          case "!=" /* NOT_EQUAL */ :
            return 0 !== t;

          case ">" /* GREATER_THAN */ :
            return t > 0;

          case ">=" /* GREATER_THAN_OR_EQUAL */ :
            return t >= 0;

          default:
            return p();
        }
    }, n.prototype.ln = function() {
        return [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , ">=" /* GREATER_THAN_OR_EQUAL */ , "!=" /* NOT_EQUAL */ ].indexOf(this.op) >= 0;
    }, n;
}((function() {}));

var cn = /** @class */ function(t) {
    function n(e, n, r) {
        var i = this;
        return (i = t.call(this, e, n, r) || this).key = U.U(r.referenceValue), i;
    }
    return e.__extends(n, t), n.prototype.matches = function(t) {
        var e = U.P(t.key, this.key);
        return this.dn(e);
    }, n;
}(an), hn = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this, e, "in" /* IN */ , n) || this).keys = ln("in" /* IN */ , n), 
        r;
    }
    return e.__extends(n, t), n.prototype.matches = function(t) {
        return this.keys.some((function(e) {
            return e.isEqual(t.key);
        }));
    }, n;
}(an), fn = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this, e, "not-in" /* NOT_IN */ , n) || this).keys = ln("not-in" /* NOT_IN */ , n), 
        r;
    }
    return e.__extends(n, t), n.prototype.matches = function(t) {
        return !this.keys.some((function(e) {
            return e.isEqual(t.key);
        }));
    }, n;
}(an);

/** Filter that matches on key fields within an array. */ function ln(t, e) {
    var n;
    return ((null === (n = e.arrayValue) || void 0 === n ? void 0 : n.values) || []).map((function(t) {
        return U.U(t.referenceValue);
    }));
}

/** A Filter that implements the array-contains operator. */ var pn = /** @class */ function(t) {
    function n(e, n) {
        return t.call(this, e, "array-contains" /* ARRAY_CONTAINS */ , n) || this;
    }
    return e.__extends(n, t), n.prototype.matches = function(t) {
        var e = t.field(this.field);
        return Mt(e) && Rt(e.arrayValue, this.value);
    }, n;
}(an), dn = /** @class */ function(t) {
    function n(e, n) {
        return t.call(this, e, "in" /* IN */ , n) || this;
    }
    return e.__extends(n, t), n.prototype.matches = function(t) {
        var e = t.field(this.field);
        return null !== e && Rt(this.value.arrayValue, e);
    }, n;
}(an), yn = /** @class */ function(t) {
    function n(e, n) {
        return t.call(this, e, "not-in" /* NOT_IN */ , n) || this;
    }
    return e.__extends(n, t), n.prototype.matches = function(t) {
        var e = t.field(this.field);
        return null !== e && !Rt(this.value.arrayValue, e);
    }, n;
}(an), vn = /** @class */ function(t) {
    function n(e, n) {
        return t.call(this, e, "array-contains-any" /* ARRAY_CONTAINS_ANY */ , n) || this;
    }
    return e.__extends(n, t), n.prototype.matches = function(t) {
        var e = this, n = t.field(this.field);
        return !(!Mt(n) || !n.arrayValue.values) && n.arrayValue.values.some((function(t) {
            return Rt(e.value.arrayValue, t);
        }));
    }, n;
}(an), gn = function(t, e) {
    this.position = t, this.before = e;
};

/** A Filter that implements the IN operator. */ function mn(t) {
    // TODO(b/29183165): Make this collision robust.
    return (t.before ? "b" : "a") + ":" + t.position.map((function(t) {
        return kt(t);
    })).join(",");
}

/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */ function wn(t, e, n) {
    for (var r = 0, i = 0; i < t.position.length; i++) {
        var o = e[i], s = t.position[i];
        if (r = o.field.O() ? U.P(U.U(s.referenceValue), n.key) : Dt(s, n.field(o.field)), 
        "desc" /* DESCENDING */ === o.dir && (r *= -1), 0 !== r) break;
    }
    return t.before ? r <= 0 : r < 0;
}

function _n(t, e) {
    if (null === t) return null === e;
    if (null === e) return !1;
    if (t.before !== e.before || t.position.length !== e.position.length) return !1;
    for (var n = 0; n < t.position.length; n++) if (!Tt(t.position[n], e.position[n])) return !1;
    return !0;
}

/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */ var bn = function(t, e /* ASCENDING */) {
    void 0 === e && (e = "asc"), this.field = t, this.dir = e;
};

function En(t, e, n) {
    var r = t.field.O() ? U.P(e.key, n.key) : function(t, e, n) {
        var r = e.field(t), i = n.field(t);
        return null !== r && null !== i ? Dt(r, i) : p();
    }(t.field, e, n);
    switch (t.dir) {
      case "asc" /* ASCENDING */ :
        return r;

      case "desc" /* DESCENDING */ :
        return -1 * r;

      default:
        return p();
    }
}

function In(t, e) {
    return t.dir === e.dir && t.field.isEqual(e.field);
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
 * A batch of mutations that will be sent as one unit to the backend.
 */ var Nn = /** @class */ function() {
    /**
     * @param batchId The unique ID of this mutation batch.
     * @param localWriteTime The original write time of this mutation.
     * @param baseMutations Mutations that are used to populate the base
     * values when this mutation is applied locally. This can be used to locally
     * overwrite values that are persisted in the remote document cache. Base
     * mutations are never sent to the backend.
     * @param mutations The user-provided mutations in this mutation batch.
     * User-provided mutations are applied both locally and remotely on the
     * backend.
     */
    function t(t, e, n, r) {
        this.batchId = t, this.wn = e, this.baseMutations = n, this.mutations = r
        /**
     * Applies all the mutations in this MutationBatch to the specified document
     * to create a new remote document
     *
     * @param docKey The key of the document to apply mutations to.
     * @param maybeDoc The document to apply mutations to.
     * @param batchResult The result of applying the MutationBatch to the
     * backend.
     */;
    }
    return t.prototype.Tn = function(t, e, n) {
        for (var r = n.mn, i = 0; i < this.mutations.length; i++) {
            var o = this.mutations[i];
            o.key.isEqual(t) && (e = Re(o, e, r[i]));
        }
        return e;
    }, 
    /**
     * Computes the local view of a document given all the mutations in this
     * batch.
     *
     * @param docKey The key of the document to apply mutations to.
     * @param maybeDoc The document to apply mutations to.
     */
    t.prototype.En = function(t, e) {
        // First, apply the base state. This allows us to apply non-idempotent
        // transform against a consistent set of values.
        for (var n = 0, r = this.baseMutations; n < r.length; n++) {
            var i = r[n];
            i.key.isEqual(t) && (e = De(i, e, e, this.wn));
        }
        // Second, apply all user-provided mutations.
        for (var o = e, s = 0, u = this.mutations; s < u.length; s++) {
            var a = u[s];
            a.key.isEqual(t) && (e = De(a, e, o, this.wn));
        }
        return e;
    }, 
    /**
     * Computes the local view for all provided documents given the mutations in
     * this batch.
     */
    t.prototype.In = function(t) {
        var e = this, n = t;
        // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
        // directly (as done in `applyToLocalView()`), we can reduce the complexity
        // to O(n).
                return this.mutations.forEach((function(r) {
            var i = e.En(r.key, t.get(r.key));
            i && (n = n.nt(r.key, i));
        })), n;
    }, t.prototype.keys = function() {
        return this.mutations.reduce((function(t, e) {
            return t.add(e.key);
        }), ut());
    }, t.prototype.isEqual = function(t) {
        return this.batchId === t.batchId && w(this.mutations, t.mutations, (function(t, e) {
            return ke(t, e);
        })) && w(this.baseMutations, t.baseMutations, (function(t, e) {
            return ke(t, e);
        }));
    }, t;
}(), An = /** @class */ function() {
    function t(t, e, n, 
    /**
     * A pre-computed mapping from each mutated document to the resulting
     * version.
     */
    r) {
        this.batch = t, this.Rn = e, this.mn = n, this.An = r
        /**
     * Creates a new MutationBatchResult for the given batch and results. There
     * must be one result for each mutation in the batch. This static factory
     * caches a document=>version mapping (docVersions).
     */;
    }
    return t.from = function(e, n, r) {
        d(e.mutations.length === r.length);
        for (var i = ot, o = e.mutations, s = 0; s < o.length; s++) i = i.nt(o[s].key, r[s].version);
        return new t(e, n, r, i);
    }, t;
}(), Tn = /** @class */ function() {
    function t(t) {
        var e = this;
        // NOTE: next/catchCallback will always point to our own wrapper functions,
        // not the user's raw next() or catch() callbacks.
                this.Pn = null, this.Vn = null, 
        // When the operation resolves, we'll set result or error and mark isDone.
        this.result = void 0, this.error = void 0, this.yn = !1, 
        // Set to true when .then() or .catch() are called and prevents additional
        // chaining.
        this.pn = !1, t((function(t) {
            e.yn = !0, e.result = t, e.Pn && 
            // value should be defined unless T is Void, but we can't express
            // that in the type system.
            e.Pn(t);
        }), (function(t) {
            e.yn = !0, e.error = t, e.Vn && e.Vn(t);
        }));
    }
    return t.prototype.catch = function(t) {
        return this.next(void 0, t);
    }, t.prototype.next = function(e, n) {
        var r = this;
        return this.pn && p(), this.pn = !0, this.yn ? this.error ? this.gn(n, this.error) : this.vn(e, this.result) : new t((function(t, i) {
            r.Pn = function(n) {
                r.vn(e, n).next(t, i);
            }, r.Vn = function(e) {
                r.gn(n, e).next(t, i);
            };
        }));
    }, t.prototype.bn = function() {
        var t = this;
        return new Promise((function(e, n) {
            t.next(e, n);
        }));
    }, t.prototype.Sn = function(e) {
        try {
            var n = e();
            return n instanceof t ? n : t.resolve(n);
        } catch (e) {
            return t.reject(e);
        }
    }, t.prototype.vn = function(e, n) {
        return e ? this.Sn((function() {
            return e(n);
        })) : t.resolve(n);
    }, t.prototype.gn = function(e, n) {
        return e ? this.Sn((function() {
            return e(n);
        })) : t.reject(n);
    }, t.resolve = function(e) {
        return new t((function(t, n) {
            t(e);
        }));
    }, t.reject = function(e) {
        return new t((function(t, n) {
            n(e);
        }));
    }, t.Cn = function(
    // Accept all Promise types in waitFor().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    e) {
        return new t((function(t, n) {
            var r = 0, i = 0, o = !1;
            e.forEach((function(e) {
                ++r, e.next((function() {
                    ++i, o && i === r && t();
                }), (function(t) {
                    return n(t);
                }));
            })), o = !0, i === r && t();
        }));
    }, 
    /**
     * Given an array of predicate functions that asynchronously evaluate to a
     * boolean, implements a short-circuiting `or` between the results. Predicates
     * will be evaluated until one of them returns `true`, then stop. The final
     * result will be whether any of them returned `true`.
     */
    t.Dn = function(e) {
        for (var n = t.resolve(!1), r = function(e) {
            n = n.next((function(n) {
                return n ? t.resolve(n) : e();
            }));
        }, i = 0, o = e; i < o.length; i++) {
            r(o[i]);
        }
        return n;
    }, t.forEach = function(t, e) {
        var n = this, r = [];
        return t.forEach((function(t, i) {
            r.push(e.call(n, t, i));
        })), this.Cn(r);
    }, t;
}(), Rn = /** @class */ function() {
    function t(t, e, n) {
        this.Fn = t, this.Nn = e, this.$n = n
        /**
     * Get the local view of the document identified by `key`.
     *
     * @return Local view of the document or null if we don't have any cached
     * state for it.
     */;
    }
    return t.prototype.kn = function(t, e) {
        var n = this;
        return this.Nn.xn(t, e).next((function(r) {
            return n.Ln(t, e, r);
        }));
    }, 
    /** Internal version of `getDocument` that allows reusing batches. */ t.prototype.Ln = function(t, e, n) {
        return this.Fn.On(t, e).next((function(t) {
            for (var r = 0, i = n; r < i.length; r++) {
                t = i[r].En(e, t);
            }
            return t;
        }));
    }, 
    // Returns the view of the given `docs` as they would appear after applying
    // all mutations in the given `batches`.
    t.prototype.Mn = function(t, e, n) {
        var r = nt();
        return e.forEach((function(t, e) {
            for (var i = 0, o = n; i < o.length; i++) {
                e = o[i].En(t, e);
            }
            r = r.nt(t, e);
        })), r;
    }, 
    /**
     * Gets the local view of the documents identified by `keys`.
     *
     * If we don't have cached state for a document in `keys`, a NoDocument will
     * be stored for that key in the resulting set.
     */
    t.prototype.qn = function(t, e) {
        var n = this;
        return this.Fn.getEntries(t, e).next((function(e) {
            return n.Un(t, e);
        }));
    }, 
    /**
     * Similar to `getDocuments`, but creates the local view from the given
     * `baseDocs` without retrieving documents from the local store.
     */
    t.prototype.Un = function(t, e) {
        var n = this;
        return this.Nn.Bn(t, e).next((function(r) {
            var i = n.Mn(t, e, r), o = et();
            return i.forEach((function(t, e) {
                // TODO(http://b/32275378): Don't conflate missing / deleted.
                e || (e = new We(t, L.min())), o = o.nt(t, e);
            })), o;
        }));
    }, 
    /**
     * Performs a query against the local view of all documents.
     *
     * @param transaction The persistence transaction.
     * @param query The query to match documents against.
     * @param sinceReadTime If not set to SnapshotVersion.min(), return only
     *     documents that have been read since this snapshot version (exclusive).
     */
    t.prototype.Wn = function(t, e, n) {
        /**
 * Returns whether the query matches a single document by path (rather than a
 * collection).
 */
        return function(t) {
            return U.W(t.path) && null === t.collectionGroup && 0 === t.filters.length;
        }(e) ? this.Qn(t, e.path) : Ye(e) ? this.jn(t, e, n) : this.Gn(t, e, n);
    }, t.prototype.Qn = function(t, e) {
        // Just do a simple document lookup.
        return this.kn(t, new U(e)).next((function(t) {
            var e = it();
            return t instanceof ze && (e = e.nt(t.key, t)), e;
        }));
    }, t.prototype.jn = function(t, e, n) {
        var r = this, i = e.collectionGroup, o = it();
        return this.$n.Kn(t, i).next((function(s) {
            return Tn.forEach(s, (function(s) {
                var u = e.rn(s.child(i));
                return r.Gn(t, u, n).next((function(t) {
                    t.forEach((function(t, e) {
                        o = o.nt(t, e);
                    }));
                }));
            })).next((function() {
                return o;
            }));
        }));
    }, t.prototype.Gn = function(t, e, n) {
        var r, i, o = this;
        // Query the remote documents and overlay mutations.
                return this.Fn.Wn(t, e, n).next((function(n) {
            return r = n, o.Nn.zn(t, e);
        })).next((function(e) {
            return i = e, o.Hn(t, i, r).next((function(t) {
                r = t;
                for (var e = 0, n = i; e < n.length; e++) for (var o = n[e], s = 0, u = o.mutations; s < u.length; s++) {
                    var a = u[s], c = a.key, h = r.get(c), f = De(a, h, h, o.wn);
                    r = f instanceof ze ? r.nt(c, f) : r.remove(c);
                }
            }));
        })).next((function() {
            // Finally, filter out any documents that don't actually match
            // the query.
            return r.forEach((function(t, n) {
                sn(e, n) || (r = r.remove(t));
            })), r;
        }));
    }, t.prototype.Hn = function(t, e, n) {
        for (var r = ut(), i = 0, o = e; i < o.length; i++) for (var s = 0, u = o[i].mutations; s < u.length; s++) {
            var a = u[s];
            a instanceof Ve && null === n.get(a.key) && (r = r.add(a.key));
        }
        var c = n;
        return this.Fn.getEntries(t, r).next((function(t) {
            return t.forEach((function(t, e) {
                null !== e && e instanceof ze && (c = c.nt(t, e));
            })), c;
        }));
    }, t;
}(), Dn = /** @class */ function() {
    function t(t, e, n, r) {
        this.targetId = t, this.fromCache = e, this.Yn = n, this.Xn = r;
    }
    return t.Jn = function(e, n) {
        for (var r = ut(), i = ut(), o = 0, s = n.docChanges; o < s.length; o++) {
            var u = s[o];
            switch (u.type) {
              case 0 /* Added */ :
                r = r.add(u.doc.key);
                break;

              case 1 /* Removed */ :
                i = i.add(u.doc.key);
                // do nothing
                        }
        }
        return new t(e, n.fromCache, r, i);
    }, t;
}(), Ln = /** @class */ function() {
    function t(t, e) {
        var n = this;
        this.previousValue = t, e && (e.Zn = function(t) {
            return n.ts(t);
        }, this.es = function(t) {
            return e.ns(t);
        });
    }
    return t.prototype.ts = function(t) {
        return this.previousValue = Math.max(t, this.previousValue), this.previousValue;
    }, t.prototype.next = function() {
        var t = ++this.previousValue;
        return this.es && this.es(t), t;
    }, t;
}();

/** The result of applying a mutation batch to the backend. */ Ln.ss = -1;

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
var kn = function() {
    var t = this;
    this.promise = new Promise((function(e, n) {
        t.resolve = e, t.reject = n;
    }));
}, On = /** @class */ function() {
    function t(
    /**
     * The AsyncQueue to run backoff operations on.
     */
    t, 
    /**
     * The ID to use when scheduling backoff operations on the AsyncQueue.
     */
    e, 
    /**
     * The initial delay (used as the base delay on the first retry attempt).
     * Note that jitter will still be applied, so the actual delay could be as
     * little as 0.5*initialDelayMs.
     */
    n
    /**
     * The multiplier to use to determine the extended base delay after each
     * attempt.
     */ , r
    /**
     * The maximum base delay after which no further backoff is performed.
     * Note that jitter will still be applied, so the actual delay could be as
     * much as 1.5*maxDelayMs.
     */ , i) {
        void 0 === n && (n = 1e3), void 0 === r && (r = 1.5), void 0 === i && (i = 6e4), 
        this.rs = t, this.os = e, this.hs = n, this.as = r, this.us = i, this.cs = 0, this.ls = null, 
        /** The last backoff attempt, as epoch milliseconds. */
        this._s = Date.now(), this.reset();
    }
    /**
     * Resets the backoff delay.
     *
     * The very next backoffAndWait() will have no delay. If it is called again
     * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
     * subsequent ones will increase according to the backoffFactor.
     */    return t.prototype.reset = function() {
        this.cs = 0;
    }, 
    /**
     * Resets the backoff delay to the maximum delay (e.g. for use after a
     * RESOURCE_EXHAUSTED error).
     */
    t.prototype.fs = function() {
        this.cs = this.us;
    }, 
    /**
     * Returns a promise that resolves after currentDelayMs, and increases the
     * delay for any subsequent attempts. If there was a pending backoff operation
     * already, it will be canceled.
     */
    t.prototype.ds = function(t) {
        var e = this;
        // Cancel any pending backoff operation.
                this.cancel();
        // First schedule using the current base (which may be 0 and should be
        // honored as such).
        var n = Math.floor(this.cs + this.ws()), r = Math.max(0, Date.now() - this._s), i = Math.max(0, n - r);
        // Guard against lastAttemptTime being in the future due to a clock change.
                i > 0 && c("ExponentialBackoff", "Backing off for " + i + " ms (base delay: " + this.cs + " ms, delay with jitter: " + n + " ms, last attempt: " + r + " ms ago)"), 
        this.ls = this.rs.Ts(this.os, i, (function() {
            return e._s = Date.now(), t();
        })), 
        // Apply backoff factor to determine next delay and ensure it is within
        // bounds.
        this.cs *= this.as, this.cs < this.hs && (this.cs = this.hs), this.cs > this.us && (this.cs = this.us);
    }, t.prototype.ms = function() {
        null !== this.ls && (this.ls.Es(), this.ls = null);
    }, t.prototype.cancel = function() {
        null !== this.ls && (this.ls.cancel(), this.ls = null);
    }, 
    /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */ t.prototype.ws = function() {
        return (Math.random() - .5) * this.cs;
    }, t;
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
 * A helper for running delayed tasks following an exponential backoff curve
 * between attempts.
 *
 * Each delay is made up of a "base" delay which follows the exponential
 * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
 * base delay. This prevents clients from accidentally synchronizing their
 * delays causing spikes of load to the backend.
 */
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
/** Verifies whether `e` is an IndexedDbTransactionError. */ function Pn(t) {
    // Use name equality, as instanceof checks on errors don't work with errors
    // that wrap other errors.
    return "IndexedDbTransactionError" === t.name;
}

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
/** The Platform's 'document' implementation or null if not available. */ function Vn() {
    // `document` is not always available, e.g. in ReactNative and WebWorkers.
    // eslint-disable-next-line no-restricted-globals
    return "undefined" != typeof document ? document : null;
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
 * Represents an operation scheduled to be run in the future on an AsyncQueue.
 *
 * It is created via DelayedOperation.createAndSchedule().
 *
 * Supports cancellation (via cancel()) and early execution (via skipDelay()).
 *
 * Note: We implement `PromiseLike` instead of `Promise`, as the `Promise` type
 * in newer versions of TypeScript defines `finally`, which is not available in
 * IE.
 */ var Un = /** @class */ function() {
    function t(t, e, n, r, i) {
        this.Is = t, this.os = e, this.Rs = n, this.op = r, this.As = i, this.Ps = new kn, 
        this.then = this.Ps.promise.then.bind(this.Ps.promise), 
        // It's normal for the deferred promise to be canceled (due to cancellation)
        // and so we attach a dummy catch callback to avoid
        // 'UnhandledPromiseRejectionWarning' log spam.
        this.Ps.promise.catch((function(t) {}))
        /**
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
     */;
    }
    return t.Vs = function(e, n, r, i, o) {
        var s = new t(e, n, Date.now() + r, i, o);
        return s.start(r), s;
    }, 
    /**
     * Starts the timer. This is called immediately after construction by
     * createAndSchedule().
     */
    t.prototype.start = function(t) {
        var e = this;
        this.ys = setTimeout((function() {
            return e.ps();
        }), t);
    }, 
    /**
     * Queues the operation to run immediately (if it hasn't already been run or
     * canceled).
     */
    t.prototype.Es = function() {
        return this.ps();
    }, 
    /**
     * Cancels the operation if it hasn't already been executed or canceled. The
     * promise will be rejected.
     *
     * As long as the operation has not yet been run, calling cancel() provides a
     * guarantee that the operation will not be run.
     */
    t.prototype.cancel = function(t) {
        null !== this.ys && (this.clearTimeout(), this.Ps.reject(new R(T.CANCELLED, "Operation cancelled" + (t ? ": " + t : ""))));
    }, t.prototype.ps = function() {
        var t = this;
        this.Is.gs((function() {
            return null !== t.ys ? (t.clearTimeout(), t.op().then((function(e) {
                return t.Ps.resolve(e);
            }))) : Promise.resolve();
        }));
    }, t.prototype.clearTimeout = function() {
        null !== this.ys && (this.As(this), clearTimeout(this.ys), this.ys = null);
    }, t;
}(), Sn = /** @class */ function() {
    function t() {
        var t = this;
        // The last promise in the queue.
                this.vs = Promise.resolve(), 
        // A list of retryable operations. Retryable operations are run in order and
        // retried with backoff.
        this.bs = [], 
        // Is this AsyncQueue being shut down? Once it is set to true, it will not
        // be changed again.
        this.Ss = !1, 
        // Operations scheduled to be queued in the future. Operations are
        // automatically removed after they are run or canceled.
        this.Cs = [], 
        // visible for testing
        this.Ds = null, 
        // Flag set while there's an outstanding AsyncQueue operation, used for
        // assertion sanity-checks.
        this.Fs = !1, 
        // List of TimerIds to fast-forward delays for.
        this.Ns = [], 
        // Backoff timer used to schedule retries for retryable operations
        this.$s = new On(this, "async_queue_retry" /* AsyncQueueRetry */), 
        // Visibility handler that triggers an immediate retry of all retryable
        // operations. Meant to speed up recovery when we regain file system access
        // after page comes into foreground.
        this.ks = function() {
            var e = Vn();
            e && c("AsyncQueue", "Visibility state changed to  ", e.visibilityState), t.$s.ms();
        };
        var e = Vn();
        e && "function" == typeof e.addEventListener && e.addEventListener("visibilitychange", this.ks);
    }
    return Object.defineProperty(t.prototype, "xs", {
        // Is this AsyncQueue being shut down? If true, this instance will not enqueue
        // any new operations, Promises from enqueue requests will not resolve.
        get: function() {
            return this.Ss;
        },
        enumerable: !1,
        configurable: !0
    }), 
    /**
     * Adds a new operation to the queue without waiting for it to complete (i.e.
     * we ignore the Promise result).
     */
    t.prototype.gs = function(t) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.enqueue(t);
    }, 
    /**
     * Regardless if the queue has initialized shutdown, adds a new operation to the
     * queue without waiting for it to complete (i.e. we ignore the Promise result).
     */
    t.prototype.Ls = function(t) {
        this.Os(), 
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.Ms(t);
    }, 
    /**
     * Initialize the shutdown of this queue. Once this method is called, the
     * only possible way to request running an operation is through
     * `enqueueEvenWhileRestricted()`.
     */
    t.prototype.qs = function() {
        if (!this.Ss) {
            this.Ss = !0;
            var t = Vn();
            t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.ks);
        }
    }, 
    /**
     * Adds a new operation to the queue. Returns a promise that will be resolved
     * when the promise returned by the new operation is (with its value).
     */
    t.prototype.enqueue = function(t) {
        return this.Os(), this.Ss ? new Promise((function(t) {})) : this.Ms(t);
    }, 
    /**
     * Enqueue a retryable operation.
     *
     * A retryable operation is rescheduled with backoff if it fails with a
     * IndexedDbTransactionError (the error type used by SimpleDb). All
     * retryable operations are executed in order and only run if all prior
     * operations were retried successfully.
     */
    t.prototype.Us = function(t) {
        var e = this;
        this.bs.push(t), this.gs((function() {
            return e.Bs();
        }));
    }, 
    /**
     * Runs the next operation from the retryable queue. If the operation fails,
     * reschedules with backoff.
     */
    t.prototype.Bs = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            var t, n = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    if (0 === this.bs.length) return [ 3 /*break*/ , 5 ];
                    e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , this.bs[0]() ];

                  case 2:
                    return e.sent(), this.bs.shift(), this.$s.reset(), [ 3 /*break*/ , 4 ];

                  case 3:
                    if (!Pn(t = e.sent())) throw t;
                    // Failure will be handled by AsyncQueue
                                        return c("AsyncQueue", "Operation failed with retryable error: " + t), 
                    [ 3 /*break*/ , 4 ];

                  case 4:
                    this.bs.length > 0 && 
                    // If there are additional operations, we re-schedule `retryNextOp()`.
                    // This is necessary to run retryable operations that failed during
                    // their initial attempt since we don't know whether they are already
                    // enqueued. If, for example, `op1`, `op2`, `op3` are enqueued and `op1`
                    // needs to  be re-run, we will run `op1`, `op1`, `op2` using the
                    // already enqueued calls to `retryNextOp()`. `op3()` will then run in the
                    // call scheduled here.
                    // Since `backoffAndRun()` cancels an existing backoff and schedules a
                    // new backoff on every call, there is only ever a single additional
                    // operation in the queue.
                    this.$s.ds((function() {
                        return n.Bs();
                    })), e.label = 5;

                  case 5:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Ms = function(t) {
        var e = this, n = this.vs.then((function() {
            return e.Fs = !0, t().catch((function(t) {
                // Re-throw the error so that this.tail becomes a rejected Promise and
                // all further attempts to chain (via .then) will just short-circuit
                // and return the rejected Promise.
                throw e.Ds = t, e.Fs = !1, h("INTERNAL UNHANDLED ERROR: ", 
                /**
 * Chrome includes Error.message in Error.stack. Other browsers do not.
 * This returns expected output of message + stack when available.
 * @param error Error or FirestoreError
 */
                function(t) {
                    var e = t.message || "";
                    return t.stack && (e = t.stack.includes(t.message) ? t.stack : t.message + "\n" + t.stack), 
                    e;
                }(t)), t;
            })).then((function(t) {
                return e.Fs = !1, t;
            }));
        }));
        return this.vs = n, n;
    }, 
    /**
     * Schedules an operation to be queued on the AsyncQueue once the specified
     * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
     * or fast-forward the operation prior to its running.
     */
    t.prototype.Ts = function(t, e, n) {
        var r = this;
        this.Os(), 
        // Fast-forward delays for timerIds that have been overriden.
        this.Ns.indexOf(t) > -1 && (e = 0);
        var i = Un.Vs(this, t, e, n, (function(t) {
            return r.Ws(t);
        }));
        return this.Cs.push(i), i;
    }, t.prototype.Os = function() {
        this.Ds && p();
    }, 
    /**
     * Verifies there's an operation currently in-progress on the AsyncQueue.
     * Unfortunately we can't verify that the running code is in the promise chain
     * of that operation, so this isn't a foolproof check, but it should be enough
     * to catch some bugs.
     */
    t.prototype.Qs = function() {}, 
    /**
     * Waits until all currently queued tasks are finished executing. Delayed
     * operations are not run.
     */
    t.prototype.js = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            var t;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return [ 4 /*yield*/ , t = this.vs ];

                  case 1:
                    e.sent(), e.label = 2;

                  case 2:
                    if (t !== this.vs) return [ 3 /*break*/ , 0 ];
                    e.label = 3;

                  case 3:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * For Tests: Determine if a delayed operation with a particular TimerId
     * exists.
     */
    t.prototype.Gs = function(t) {
        for (var e = 0, n = this.Cs; e < n.length; e++) {
            if (n[e].os === t) return !0;
        }
        return !1;
    }, 
    /**
     * For Tests: Runs some or all delayed operations early.
     *
     * @param lastTimerId Delayed operations up to and including this TimerId will
     *  be drained. Pass TimerId.All to run all delayed operations.
     * @returns a Promise that resolves once all operations have been run.
     */
    t.prototype.Ks = function(t) {
        var e = this;
        // Note that draining may generate more delayed ops, so we do that first.
                return this.js().then((function() {
            // Run ops in the same order they'd run if they ran naturally.
            e.Cs.sort((function(t, e) {
                return t.Rs - e.Rs;
            }));
            for (var n = 0, r = e.Cs; n < r.length; n++) {
                var i = r[n];
                if (i.Es(), "all" /* All */ !== t && i.os === t) break;
            }
            return e.js();
        }));
    }, 
    /**
     * For Tests: Skip all subsequent delays for a timer id.
     */
    t.prototype.zs = function(t) {
        this.Ns.push(t);
    }, 
    /** Called once a DelayedOperation is run or canceled. */ t.prototype.Ws = function(t) {
        // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
        var e = this.Cs.indexOf(t);
        this.Cs.splice(e, 1);
    }, t;
}();

/**
 * Returns a FirestoreError that can be surfaced to the user if the provided
 * error is an IndexedDbTransactionError. Re-throws the error otherwise.
 */
function Mn(t, e) {
    if (h("AsyncQueue", e + ": " + t), Pn(t)) return new R(T.UNAVAILABLE, e + ": " + t);
    throw t;
}

var Cn = /** @class */ function() {
    function t(
    // When we attempt to collect, we will only do so if the cache size is greater than this
    // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
    t, 
    // The percentage of sequence numbers that we will attempt to collect
    e, 
    // A cap on the total number of sequence numbers that will be collected. This prevents
    // us from collecting a huge number of sequence numbers if the cache has grown very large.
    n) {
        this.Hs = t, this.Ys = e, this.Xs = n;
    }
    return t.Js = function(e) {
        return new t(e, t.Zs, t.ti);
    }, t;
}();

Cn.ei = -1, Cn.ni = 1048576, Cn.si = 41943040, Cn.Zs = 10, Cn.ti = 1e3, Cn.ii = new Cn(Cn.si, Cn.Zs, Cn.ti), 
Cn.ri = new Cn(Cn.ei, 0, 0);

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
 * An in-memory implementation of IndexManager.
 */
var xn = /** @class */ function() {
    function t() {
        this.oi = new qn;
    }
    return t.prototype.hi = function(t, e) {
        return this.oi.add(e), Tn.resolve();
    }, t.prototype.Kn = function(t, e) {
        return Tn.resolve(this.oi.getEntries(e));
    }, t;
}(), qn = /** @class */ function() {
    function t() {
        this.index = {};
    }
    // Returns false if the entry already existed.
        return t.prototype.add = function(t) {
        var e = t.S(), n = t.g(), r = this.index[e] || new J(O.P), i = !r.has(n);
        return this.index[e] = r.add(n), i;
    }, t.prototype.has = function(t) {
        var e = t.S(), n = t.g(), r = this.index[e];
        return r && r.has(n);
    }, t.prototype.getEntries = function(t) {
        return (this.index[t] || new J(O.P)).F();
    }, t;
}(), jn = /** @class */ function() {
    function t(t) {
        this.ai = t;
    }
    return t.prototype.next = function() {
        return this.ai += 2, this.ai;
    }, t.ui = function() {
        // The target cache generator must return '2' in its first call to `next()`
        // as there is no differentiation in the protocol layer between an unset
        // number and the number '0'. If we were to sent a target with target ID
        // '0', the backend would consider it unset and replace it with its own ID.
        return new t(0);
    }, t.ci = function() {
        // Sync engine assigns target IDs for limbo document detection.
        return new t(-1);
    }, t;
}(), Gn = /** @class */ function() {
    function t(
    /** Manages our in-memory or durable persistence. */
    t, e, n) {
        this.persistence = t, this.li = e, 
        /**
             * Maps a targetID to data about its target.
             *
             * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
             * of `applyRemoteEvent()` idempotent.
             */
        this._i = new H(m), 
        /** Maps a target to its targetID. */
        // TODO(wuandy): Evaluate if TargetId can be part of Target.
        this.fi = new A((function(t) {
            return q(t);
        }), j), 
        /**
             * The read time of the last entry processed by `getNewDocumentChanges()`.
             *
             * PORTING NOTE: This is only used for multi-tab synchronization.
             */
        this.di = L.min(), this.Nn = t.wi(n), this.Ti = t.mi(), this.Ei = t.Ii(), this.Ri = new Rn(this.Ti, this.Nn, this.persistence.Ai()), 
        this.li.Pi(this.Ri);
    }
    return t.prototype.Vi = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i, o = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return n = this.Nn, r = this.Ri, [ 4 /*yield*/ , this.persistence.runTransaction("Handle user change", "readonly", (function(e) {
                        // Swap out the mutation queue, grabbing the pending mutation batches
                        // before and after.
                        var i;
                        return o.Nn.yi(e).next((function(s) {
                            return i = s, n = o.persistence.wi(t), 
                            // Recreate our LocalDocumentsView using the new
                            // MutationQueue.
                            r = new Rn(o.Ti, n, o.persistence.Ai()), n.yi(e);
                        })).next((function(t) {
                            for (var n = [], o = [], s = ut(), u = 0, a = i
                            // Union the old/new changed keys.
                            ; u < a.length; u++) {
                                var c = a[u];
                                n.push(c.batchId);
                                for (var h = 0, f = c.mutations; h < f.length; h++) {
                                    var l = f[h];
                                    s = s.add(l.key);
                                }
                            }
                            for (var p = 0, d = t; p < d.length; p++) {
                                var y = d[p];
                                o.push(y.batchId);
                                for (var v = 0, g = y.mutations; v < g.length; v++) {
                                    var m = g[v];
                                    s = s.add(m.key);
                                }
                            }
                            // Return the set of all (potentially) changed documents and the list
                            // of mutation batch IDs that were affected by change.
                                                        return r.qn(e, s).next((function(t) {
                                return {
                                    pi: t,
                                    gi: n,
                                    vi: o
                                };
                            }));
                        }));
                    })) ];

                  case 1:
                    return i = e.sent(), [ 2 /*return*/ , (this.Nn = n, this.Ri = r, this.li.Pi(this.Ri), 
                    i) ];
                }
            }));
        }));
    }, t.prototype.bi = function(t) {
        var e, n = this, r = D.now(), i = t.reduce((function(t, e) {
            return t.add(e.key);
        }), ut());
        return this.persistence.runTransaction("Locally write mutations", "readwrite", (function(o) {
            return n.Ri.qn(o, i).next((function(i) {
                e = i;
                for (
                // For non-idempotent mutations (such as `FieldValue.increment()`),
                // we record the base state in a separate patch mutation. This is
                // later used to guarantee consistent values and prevents flicker
                // even if the backend sends us an update that already includes our
                // transform.
                var s = [], u = 0, a = t; u < a.length; u++) {
                    var c = a[u], h = Le(c, e.get(c.key));
                    null != h && 
                    // NOTE: The base state should only be applied if there's some
                    // existing document to override, so use a Precondition of
                    // exists=true
                    s.push(new Ve(c.key, h, Fe(h.proto.mapValue), Ne.exists(!0)));
                }
                return n.Nn.Si(o, r, s, t);
            }));
        })).then((function(t) {
            var n = t.In(e);
            return {
                batchId: t.batchId,
                Ci: n
            };
        }));
    }, t.prototype.Di = function(t) {
        var e = this;
        return this.persistence.runTransaction("Acknowledge batch", "readwrite-primary", (function(n) {
            var r = t.batch.keys(), i = e.Ti.Fi({
                Ni: !0
            });
            return e.$i(n, t, i).next((function() {
                return i.apply(n);
            })).next((function() {
                return e.Nn.ki(n);
            })).next((function() {
                return e.Ri.qn(n, r);
            }));
        }));
    }, t.prototype.xi = function(t) {
        var e = this;
        return this.persistence.runTransaction("Reject batch", "readwrite-primary", (function(n) {
            var r;
            return e.Nn.Li(n, t).next((function(t) {
                return d(null !== t), r = t.keys(), e.Nn.Oi(n, t);
            })).next((function() {
                return e.Nn.ki(n);
            })).next((function() {
                return e.Ri.qn(n, r);
            }));
        }));
    }, t.prototype.Mi = function() {
        var t = this;
        return this.persistence.runTransaction("Get highest unacknowledged batch id", "readonly", (function(e) {
            return t.Nn.Mi(e);
        }));
    }, t.prototype.qi = function() {
        var t = this;
        return this.persistence.runTransaction("Get last remote snapshot version", "readonly", (function(e) {
            return t.Ei.qi(e);
        }));
    }, t.prototype.Ui = function(e) {
        var n = this, r = e.J, i = this._i;
        return this.persistence.runTransaction("Apply remote event", "readwrite-primary", (function(o) {
            var s = n.Ti.Fi({
                Ni: !0
            });
            // Reset newTargetDataByTargetMap in case this transaction gets re-run.
                        i = n._i;
            var u = [];
            e.Wt.forEach((function(e, s) {
                var a = i.get(s);
                if (a) {
                    // Only update the remote keys if the target is still active. This
                    // ensures that we can persist the updated target data along with
                    // the updated assignment.
                    u.push(n.Ei.Bi(o, e.Jt, s).next((function() {
                        return n.Ei.Wi(o, e.Yt, s);
                    })));
                    var c = e.resumeToken;
                    // Update the resume token if the change includes one.
                                        if (c.H() > 0) {
                        var h = a.tt(c, r).Z(o.Qi);
                        i = i.nt(s, h), 
                        // Update the target data if there are target changes (or if
                        // sufficient time has passed since the last update).
                        t.ji(a, h, e) && u.push(n.Ei.Gi(o, h));
                    }
                }
            }));
            var a = et(), h = ut();
            // HACK: The only reason we allow a null snapshot version is so that we
            // can synthesize remote events when we get permission denied errors while
            // trying to resolve the state of a locally cached document that is in
            // limbo.
                        if (e.jt.forEach((function(t, e) {
                h = h.add(t);
            })), 
            // Each loop iteration only affects its "own" doc, so it's safe to get all the remote
            // documents in advance in a single call.
            u.push(s.getEntries(o, h).next((function(t) {
                e.jt.forEach((function(i, h) {
                    var f = t.get(i);
                    // Note: The order of the steps below is important, since we want
                    // to ensure that rejected limbo resolutions (which fabricate
                    // NoDocuments with SnapshotVersion.min()) never add documents to
                    // cache.
                                        h instanceof We && h.version.isEqual(L.min()) ? (
                    // NoDocuments with SnapshotVersion.min() are used in manufactured
                    // events. We remove these documents from cache since we lost
                    // access.
                    s.Ki(i, r), a = a.nt(i, h)) : null == f || h.version.o(f.version) > 0 || 0 === h.version.o(f.version) && f.hasPendingWrites ? (s.zi(h, r), 
                    a = a.nt(i, h)) : c("LocalStore", "Ignoring outdated watch update for ", i, ". Current version:", f.version, " Watch version:", h.version), 
                    e.Gt.has(i) && u.push(n.persistence.Yi.Hi(o, i));
                }));
            }))), !r.isEqual(L.min())) {
                var f = n.Ei.qi(o).next((function(t) {
                    return n.Ei.Xi(o, o.Qi, r);
                }));
                u.push(f);
            }
            return Tn.Cn(u).next((function() {
                return s.apply(o);
            })).next((function() {
                return n.Ri.Un(o, a);
            }));
        })).then((function(t) {
            return n._i = i, t;
        }));
    }, 
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
     */
    t.ji = function(t, e, n) {
        // Always persist target data if we don't already have a resume token.
        return d(e.resumeToken.H() > 0), 0 === t.resumeToken.H() || (
        // Don't allow resume token changes to be buffered indefinitely. This
        // allows us to be reasonably up-to-date after a crash and avoids needing
        // to loop over all active queries on shutdown. Especially in the browser
        // we may not get time to do anything interesting while the current tab is
        // closing.
        e.J.I() - t.J.I() >= this.Ji || n.Yt.size + n.Xt.size + n.Jt.size > 0);
    }, t.prototype.Zi = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i, o, s, u, a, h, f = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return e.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , this.persistence.runTransaction("notifyLocalViewChanges", "readwrite", (function(e) {
                        return Tn.forEach(t, (function(t) {
                            return Tn.forEach(t.Yn, (function(n) {
                                return f.persistence.Yi.tr(e, t.targetId, n);
                            })).next((function() {
                                return Tn.forEach(t.Xn, (function(n) {
                                    return f.persistence.Yi.er(e, t.targetId, n);
                                }));
                            }));
                        }));
                    })) ];

                  case 1:
                    return e.sent(), [ 3 /*break*/ , 3 ];

                  case 2:
                    if (!Pn(n = e.sent())) throw n;
                    // If `notifyLocalViewChanges` fails, we did not advance the sequence
                    // number for the documents that were included in this transaction.
                    // This might trigger them to be deleted earlier than they otherwise
                    // would have, but it should not invalidate the integrity of the data.
                                        return c("LocalStore", "Failed to update sequence numbers: " + n), 
                    [ 3 /*break*/ , 3 ];

                  case 3:
                    for (r = 0, i = t; r < i.length; r++) o = i[r], s = o.targetId, o.fromCache || (u = this._i.get(s), 
                    a = u.J, h = u.et(a), 
                    // Advance the last limbo free snapshot version
                    this._i = this._i.nt(s, h));
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.nr = function(t) {
        var e = this;
        return this.persistence.runTransaction("Get next mutation batch", "readonly", (function(n) {
            return void 0 === t && (t = -1), e.Nn.sr(n, t);
        }));
    }, t.prototype.ir = function(t) {
        var e = this;
        return this.persistence.runTransaction("read document", "readonly", (function(n) {
            return e.Ri.kn(n, t);
        }));
    }, t.prototype.rr = function(t) {
        var e = this;
        return this.persistence.runTransaction("Allocate target", "readwrite", (function(n) {
            var r;
            return e.Ei.or(n, t).next((function(i) {
                return i ? (
                // This target has been listened to previously, so reuse the
                // previous targetID.
                // TODO(mcg): freshen last accessed date?
                r = i, Tn.resolve(r)) : e.Ei.hr(n).next((function(i) {
                    return r = new W(t, i, 0 /* Listen */ , n.Qi), e.Ei.ar(n, r).next((function() {
                        return r;
                    }));
                }));
            }));
        })).then((function(n) {
            // If Multi-Tab is enabled, the existing target data may be newer than
            // the in-memory data
            var r = e._i.get(n.targetId);
            return (null === r || n.J.o(r.J) > 0) && (e._i = e._i.nt(n.targetId, n), e.fi.set(t, n.targetId)), 
            n;
        }));
    }, t.prototype.or = function(t, e) {
        var n = this.fi.get(e);
        return void 0 !== n ? Tn.resolve(this._i.get(n)) : this.Ei.or(t, e);
    }, t.prototype.ur = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r, i, o, s = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    r = this._i.get(t), i = n ? "readwrite" : "readwrite-primary", e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 4, , 5 ]), n ? [ 3 /*break*/ , 3 ] : [ 4 /*yield*/ , this.persistence.runTransaction("Release target", i, (function(t) {
                        return s.persistence.Yi.removeTarget(t, r);
                    })) ];

                  case 2:
                    e.sent(), e.label = 3;

                  case 3:
                    return [ 3 /*break*/ , 5 ];

                  case 4:
                    if (!Pn(o = e.sent())) throw o;
                    // All `releaseTarget` does is record the final metadata state for the
                    // target, but we've been recording this periodically during target
                    // activity. If we lose this write this could cause a very slight
                    // difference in the order of target deletion during GC, but we
                    // don't define exact LRU semantics so this is acceptable.
                                        return c("LocalStore", "Failed to update sequence numbers for target " + t + ": " + o), 
                    [ 3 /*break*/ , 5 ];

                  case 5:
                    return this._i = this._i.remove(t), this.fi.delete(r.target), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.cr = function(t, e) {
        var n = this, r = L.min(), i = ut();
        return this.persistence.runTransaction("Execute query", "readonly", (function(o) {
            return n.or(o, Je(t)).next((function(t) {
                if (t) return r = t.lastLimboFreeSnapshotVersion, n.Ei.lr(o, t.targetId).next((function(t) {
                    i = t;
                }));
            })).next((function() {
                return n.li.Wn(o, t, e ? r : L.min(), e ? i : ut());
            })).next((function(t) {
                return {
                    documents: t,
                    _r: i
                };
            }));
        }));
    }, t.prototype.$i = function(t, e, n) {
        var r = this, i = e.batch, o = i.keys(), s = Tn.resolve();
        return o.forEach((function(r) {
            s = s.next((function() {
                return n.On(t, r);
            })).next((function(t) {
                var o = t, s = e.An.get(r);
                d(null !== s), (!o || o.version.o(s) < 0) && ((o = i.Tn(r, o, e)) && 
                // We use the commitVersion as the readTime rather than the
                // document's updateTime since the updateTime is not advanced
                // for updates that do not modify the underlying document.
                n.zi(o, e.Rn));
            }));
        })), s.next((function() {
            return r.Nn.Oi(t, i);
        }));
    }, t.prototype.dr = function(t) {
        var e = this;
        return this.persistence.runTransaction("Collect garbage", "readwrite-primary", (function(n) {
            return t.wr(n, e._i);
        }));
    }, t;
}();

/**
 * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
 * Also used for in-memory caching by IndexedDbIndexManager and initial index population
 * in indexeddb_schema.ts
 */
/**
 * The maximum time to leave a resume token buffered without writing it out.
 * This value is arbitrary: it's long enough to avoid several writes
 * (possibly indefinitely if updates come more frequently than this) but
 * short enough that restarting after crashing will still have a pretty
 * recent resume token.
 */
/**
 * Verifies the error thrown by a LocalStore operation. If a LocalStore
 * operation fails because the primary lease has been taken by another client,
 * we ignore the error (the persistence layer will immediately call
 * `applyPrimaryLease` to propagate the primary state change). All other errors
 * are re-thrown.
 *
 * @param err An error returned by a LocalStore operation.
 * @return A Promise that resolves after we recovered, or the original error.
 */
function Fn(t) {
    return e.__awaiter(this, void 0, void 0, (function() {
        return e.__generator(this, (function(e) {
            if (t.code !== T.FAILED_PRECONDITION || "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab." !== t.message) throw t;
            return c("LocalStore", "Unexpectedly lost primary lease"), [ 2 /*return*/ ];
        }));
    }));
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
 */ Gn.Ji = 3e8;

var Bn = /** @class */ function() {
    function t() {
        // A set of outstanding references to a document sorted by key.
        this.Tr = new J(zn.mr), 
        // A set of outstanding references to a document sorted by target id.
        this.Er = new J(zn.Ir)
        /** Returns true if the reference set contains no references. */;
    }
    return t.prototype._ = function() {
        return this.Tr._();
    }, 
    /** Adds a reference to the given document key for the given ID. */ t.prototype.tr = function(t, e) {
        var n = new zn(t, e);
        this.Tr = this.Tr.add(n), this.Er = this.Er.add(n);
    }, 
    /** Add references to the given document keys for the given ID. */ t.prototype.Rr = function(t, e) {
        var n = this;
        t.forEach((function(t) {
            return n.tr(t, e);
        }));
    }, 
    /**
     * Removes a reference to the given document key for the given
     * ID.
     */
    t.prototype.er = function(t, e) {
        this.Ar(new zn(t, e));
    }, t.prototype.Pr = function(t, e) {
        var n = this;
        t.forEach((function(t) {
            return n.er(t, e);
        }));
    }, 
    /**
     * Clears all references with a given ID. Calls removeRef() for each key
     * removed.
     */
    t.prototype.Vr = function(t) {
        var e = this, n = new U(new O([])), r = new zn(n, t), i = new zn(n, t + 1), o = [];
        return this.Er.bt([ r, i ], (function(t) {
            e.Ar(t), o.push(t.key);
        })), o;
    }, t.prototype.yr = function() {
        var t = this;
        this.Tr.forEach((function(e) {
            return t.Ar(e);
        }));
    }, t.prototype.Ar = function(t) {
        this.Tr = this.Tr.delete(t), this.Er = this.Er.delete(t);
    }, t.prototype.pr = function(t) {
        var e = new U(new O([])), n = new zn(e, t), r = new zn(e, t + 1), i = ut();
        return this.Er.bt([ n, r ], (function(t) {
            i = i.add(t.key);
        })), i;
    }, t.prototype.gr = function(t) {
        var e = new zn(t, 0), n = this.Tr.Ct(e);
        return null !== n && t.isEqual(n.key);
    }, t;
}(), zn = /** @class */ function() {
    function t(t, e) {
        this.key = t, this.vr = e
        /** Compare by key then by ID */;
    }
    return t.mr = function(t, e) {
        return U.P(t.key, e.key) || m(t.vr, e.vr);
    }, 
    /** Compare by ID then by key */ t.Ir = function(t, e) {
        return m(t.vr, e.vr) || U.P(t.key, e.key);
    }, t;
}(), Wn = /** @class */ function() {
    function t(t) {
        this.uid = t;
    }
    return t.prototype.br = function() {
        return null != this.uid;
    }, 
    /**
     * Returns a key representing this user, suitable for inclusion in a
     * dictionary.
     */
    t.prototype.Sr = function() {
        return this.br() ? "uid:" + this.uid : "anonymous-user";
    }, t.prototype.isEqual = function(t) {
        return t.uid === this.uid;
    }, t;
}();

/** A user with a null UID. */ Wn.UNAUTHENTICATED = new Wn(null), 
// TODO(mikelehen): Look into getting a proper uid-equivalent for
// non-FirebaseAuth providers.
Wn.Cr = new Wn("google-credentials-uid"), Wn.Dr = new Wn("first-party-uid");

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
var Qn = function(t, e) {
    this.user = e, this.type = "OAuth", this.Fr = {}, 
    // Set the headers using Object Literal notation to avoid minification
    this.Fr.Authorization = "Bearer " + t;
}, Kn = /** @class */ function() {
    function t() {
        /**
         * Stores the listener registered with setChangeListener()
         * This isn't actually necessary since the UID never changes, but we use this
         * to verify the listen contract is adhered to in tests.
         */
        this.Nr = null;
    }
    return t.prototype.getToken = function() {
        return Promise.resolve(null);
    }, t.prototype.$r = function() {}, t.prototype.kr = function(t) {
        this.Nr = t, 
        // Fire with initial user.
        t(Wn.UNAUTHENTICATED);
    }, t.prototype.xr = function() {
        this.Nr = null;
    }, t;
}(), $n = /** @class */ function() {
    function t(t) {
        var e = this;
        /**
         * The auth token listener registered with FirebaseApp, retained here so we
         * can unregister it.
         */        this.Lr = null, 
        /** Tracks the current User. */
        this.currentUser = Wn.UNAUTHENTICATED, this.Or = !1, 
        /**
             * Counter used to detect if the token changed while a getToken request was
             * outstanding.
             */
        this.Mr = 0, 
        /** The listener registered with setChangeListener(). */
        this.Nr = null, this.forceRefresh = !1, this.Lr = function() {
            e.Mr++, e.currentUser = e.qr(), e.Or = !0, e.Nr && e.Nr(e.currentUser);
        }, this.Mr = 0, this.auth = t.getImmediate({
            optional: !0
        }), this.auth ? this.auth.addAuthTokenListener(this.Lr) : (
        // if auth is not available, invoke tokenListener once with null token
        this.Lr(null), t.get().then((function(t) {
            e.auth = t, e.Lr && 
            // tokenListener can be removed by removeChangeListener()
            e.auth.addAuthTokenListener(e.Lr);
        }), (function() {})));
    }
    return t.prototype.getToken = function() {
        var t = this, e = this.Mr, n = this.forceRefresh;
        // Take note of the current value of the tokenCounter so that this method
        // can fail (with an ABORTED error) if there is a token change while the
        // request is outstanding.
                return this.forceRefresh = !1, this.auth ? this.auth.getToken(n).then((function(n) {
            // Cancel the request since the token changed while the request was
            // outstanding so the response is potentially for a previous user (which
            // user, we can't be sure).
            return t.Mr !== e ? (c("FirebaseCredentialsProvider", "getToken aborted due to token change."), 
            t.getToken()) : n ? (d("string" == typeof n.accessToken), new Qn(n.accessToken, t.currentUser)) : null;
        })) : Promise.resolve(null);
    }, t.prototype.$r = function() {
        this.forceRefresh = !0;
    }, t.prototype.kr = function(t) {
        this.Nr = t, 
        // Fire the initial event
        this.Or && t(this.currentUser);
    }, t.prototype.xr = function() {
        this.auth && this.auth.removeAuthTokenListener(this.Lr), this.Lr = null, this.Nr = null;
    }, 
    // Auth.getUid() can return null even with a user logged in. It is because
    // getUid() is synchronous, but the auth code populating Uid is asynchronous.
    // This method should only be called in the AuthTokenListener callback
    // to guarantee to get the actual user.
    t.prototype.qr = function() {
        var t = this.auth && this.auth.getUid();
        return d(null === t || "string" == typeof t), new Wn(t);
    }, t;
}(), Hn = /** @class */ function() {
    function t(t, e) {
        this.Ur = t, this.Br = e, this.type = "FirstParty", this.user = Wn.Dr;
    }
    return Object.defineProperty(t.prototype, "Fr", {
        get: function() {
            var t = {
                "X-Goog-AuthUser": this.Br
            }, e = this.Ur.auth.Wr([]);
            return e && (t.Authorization = e), t;
        },
        enumerable: !1,
        configurable: !0
    }), t;
}(), Yn = /** @class */ function() {
    function t(t, e) {
        this.Ur = t, this.Br = e;
    }
    return t.prototype.getToken = function() {
        return Promise.resolve(new Hn(this.Ur, this.Br));
    }, t.prototype.kr = function(t) {
        // Fire with initial uid.
        t(Wn.Dr);
    }, t.prototype.xr = function() {}, t.prototype.$r = function() {}, t;
}(), Xn = /** @class */ function() {
    function t(t, e, n, r, i, o) {
        this.rs = t, this.Qr = n, this.jr = r, this.Gr = i, this.listener = o, this.state = 0 /* Initial */ , 
        /**
             * A close count that's incremented every time the stream is closed; used by
             * getCloseGuardedDispatcher() to invalidate callbacks that happen after
             * close.
             */
        this.Kr = 0, this.zr = null, this.stream = null, this.$s = new On(t, e)
        /**
     * Returns true if start() has been called and no error has occurred. True
     * indicates the stream is open or in the process of opening (which
     * encompasses respecting backoff, getting auth tokens, and starting the
     * actual RPC). Use isOpen() to determine if the stream is open and ready for
     * outbound requests.
     */;
    }
    return t.prototype.Hr = function() {
        return 1 /* Starting */ === this.state || 2 /* Open */ === this.state || 4 /* Backoff */ === this.state;
    }, 
    /**
     * Returns true if the underlying RPC is open (the onOpen() listener has been
     * called) and the stream is ready for outbound requests.
     */
    t.prototype.Yr = function() {
        return 2 /* Open */ === this.state;
    }, 
    /**
     * Starts the RPC. Only allowed if isStarted() returns false. The stream is
     * not immediately ready for use: onOpen() will be invoked when the RPC is
     * ready for outbound requests, at which point isOpen() will return true.
     *
     * When start returns, isStarted() will return true.
     */
    t.prototype.start = function() {
        3 /* Error */ !== this.state ? this.auth() : this.Xr();
    }, 
    /**
     * Stops the RPC. This call is idempotent and allowed regardless of the
     * current isStarted() state.
     *
     * When stop returns, isStarted() and isOpen() will both return false.
     */
    t.prototype.stop = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return this.Hr() ? [ 4 /*yield*/ , this.close(0 /* Initial */) ] : [ 3 /*break*/ , 2 ];

                  case 1:
                    t.sent(), t.label = 2;

                  case 2:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * After an error the stream will usually back off on the next attempt to
     * start it. If the error warrants an immediate restart of the stream, the
     * sender can use this to indicate that the receiver should not back off.
     *
     * Each error will call the onClose() listener. That function can decide to
     * inhibit backoff if required.
     */
    t.prototype.Jr = function() {
        this.state = 0 /* Initial */ , this.$s.reset();
    }, 
    /**
     * Marks this stream as idle. If no further actions are performed on the
     * stream for one minute, the stream will automatically close itself and
     * notify the stream's onClose() handler with Status.OK. The stream will then
     * be in a !isStarted() state, requiring the caller to start the stream again
     * before further use.
     *
     * Only streams that are in state 'Open' can be marked idle, as all other
     * states imply pending network operations.
     */
    t.prototype.Zr = function() {
        var t = this;
        // Starts the idle time if we are in state 'Open' and are not yet already
        // running a timer (in which case the previous idle timeout still applies).
                this.Yr() && null === this.zr && (this.zr = this.rs.Ts(this.Qr, 6e4, (function() {
            return t.to();
        })));
    }, 
    /** Sends a message to the underlying stream. */ t.prototype.eo = function(t) {
        this.no(), this.stream.send(t);
    }, 
    /** Called by the idle timer when the stream should close due to inactivity. */ t.prototype.to = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                return this.Yr() ? [ 2 /*return*/ , this.close(0 /* Initial */) ] : [ 2 /*return*/ ];
            }));
        }));
    }, 
    /** Marks the stream as active again. */ t.prototype.no = function() {
        this.zr && (this.zr.cancel(), this.zr = null);
    }, 
    /**
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
     */
    t.prototype.close = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    // Notify the listener that the stream closed.
                    // Cancel any outstanding timers (they're guaranteed not to execute).
                    return this.no(), this.$s.cancel(), 
                    // Invalidates any stream-related callbacks (e.g. from auth or the
                    // underlying stream), guaranteeing they won't execute.
                    this.Kr++, 3 /* Error */ !== t ? 
                    // If this is an intentional close ensure we don't delay our next connection attempt.
                    this.$s.reset() : n && n.code === T.RESOURCE_EXHAUSTED ? (
                    // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
                    h(n.toString()), h("Using maximum backoff delay to prevent overloading the backend."), 
                    this.$s.fs()) : n && n.code === T.UNAUTHENTICATED && 
                    // "unauthenticated" error means the token was rejected. Try force refreshing it in case it
                    // just expired.
                    this.Gr.$r(), 
                    // Clean up the underlying stream because we are no longer interested in events.
                    null !== this.stream && (this.so(), this.stream.close(), this.stream = null), 
                    // This state must be assigned before calling onClose() to allow the callback to
                    // inhibit backoff or otherwise manipulate the state in its non-started state.
                    this.state = t, [ 4 /*yield*/ , this.listener.io(n) ];

                  case 1:
                    // Cancel any outstanding timers (they're guaranteed not to execute).
                    // Notify the listener that the stream closed.
                    return e.sent(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Can be overridden to perform additional cleanup before the stream is closed.
     * Calling super.tearDown() is not required.
     */
    t.prototype.so = function() {}, t.prototype.auth = function() {
        var t = this;
        this.state = 1 /* Starting */;
        var e = this.ro(this.Kr), n = this.Kr;
        // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                this.Gr.getToken().then((function(e) {
            // Stream can be stopped while waiting for authentication.
            // TODO(mikelehen): We really should just use dispatchIfNotClosed
            // and let this dispatch onto the queue, but that opened a spec test can
            // of worms that I don't want to deal with in this PR.
            t.Kr === n && 
            // Normally we'd have to schedule the callback on the AsyncQueue.
            // However, the following calls are safe to be called outside the
            // AsyncQueue since they don't chain asynchronous calls
            t.oo(e);
        }), (function(n) {
            e((function() {
                var e = new R(T.UNKNOWN, "Fetching auth token failed: " + n.message);
                return t.ho(e);
            }));
        }));
    }, t.prototype.oo = function(t) {
        var e = this, n = this.ro(this.Kr);
        this.stream = this.ao(t), this.stream.uo((function() {
            n((function() {
                return e.state = 2 /* Open */ , e.listener.uo();
            }));
        })), this.stream.io((function(t) {
            n((function() {
                return e.ho(t);
            }));
        })), this.stream.onMessage((function(t) {
            n((function() {
                return e.onMessage(t);
            }));
        }));
    }, t.prototype.Xr = function() {
        var t = this;
        this.state = 4 /* Backoff */ , this.$s.ds((function() {
            return e.__awaiter(t, void 0, void 0, (function() {
                return e.__generator(this, (function(t) {
                    return this.state = 0 /* Initial */ , this.start(), [ 2 /*return*/ ];
                }));
            }));
        }));
    }, 
    // Visible for tests
    t.prototype.ho = function(t) {
        // In theory the stream could close cleanly, however, in our current model
        // we never expect this to happen because if we stop a stream ourselves,
        // this callback will never be called. To prevent cases where we retry
        // without a backoff accidentally, we set the stream to error in all cases.
        return c("PersistentStream", "close with error: " + t), this.stream = null, this.close(3 /* Error */ , t);
    }, 
    /**
     * Returns a "dispatcher" function that dispatches operations onto the
     * AsyncQueue but only runs them if closeCount remains unchanged. This allows
     * us to turn auth / stream callbacks into no-ops if the stream is closed /
     * re-opened, etc.
     */
    t.prototype.ro = function(t) {
        var e = this;
        return function(n) {
            e.rs.gs((function() {
                return e.Kr === t ? n() : (c("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), 
                Promise.resolve());
            }));
        };
    }, t;
}(), Jn = /** @class */ function(t) {
    function n(e, n, r, i, o) {
        var s = this;
        return (s = t.call(this, e, "listen_stream_connection_backoff" /* ListenStreamConnectionBackoff */ , "listen_stream_idle" /* ListenStreamIdle */ , n, r, o) || this).serializer = i, 
        s;
    }
    return e.__extends(n, t), n.prototype.ao = function(t) {
        return this.jr.co("Listen", t);
    }, n.prototype.onMessage = function(t) {
        // A successful response means the stream is healthy
        this.$s.reset();
        var e = function(t, e) {
            var n;
            if ("targetChange" in e) {
                e.targetChange;
                // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
                // if unset
                var r = function(t) {
                    return "NO_CHANGE" === t ? 0 /* NoChange */ : "ADD" === t ? 1 /* Added */ : "REMOVE" === t ? 2 /* Removed */ : "CURRENT" === t ? 3 /* Current */ : "RESET" === t ? 4 /* Reset */ : p();
                }(e.targetChange.targetChangeType || "NO_CHANGE"), i = e.targetChange.targetIds || [], o = function(t, e) {
                    return t.Oe ? (d(void 0 === e || "string" == typeof e), F.fromBase64String(e || "")) : (d(void 0 === e || e instanceof Uint8Array), 
                    F.fromUint8Array(e || new Uint8Array));
                }(t, e.targetChange.resumeToken), s = e.targetChange.cause, u = s && function(t) {
                    var e = void 0 === t.code ? T.UNKNOWN : $(t.code);
                    return new R(e, t.message || "");
                }(s);
                n = new gt(r, i, o, u || null);
            } else if ("documentChange" in e) {
                e.documentChange;
                var a = e.documentChange;
                a.document, a.document.name, a.document.updateTime;
                var c = Jt(t, a.document.name), h = Ht(a.document.updateTime), f = new je({
                    mapValue: {
                        fields: a.document.fields
                    }
                }), l = new ze(c, h, f, {}), y = a.targetIds || [], v = a.removedTargetIds || [];
                n = new yt(y, v, l.key, l);
            } else if ("documentDelete" in e) {
                e.documentDelete;
                var g = e.documentDelete;
                g.document;
                var m = Jt(t, g.document), w = g.readTime ? Ht(g.readTime) : L.min(), _ = new We(m, w), b = g.removedTargetIds || [];
                n = new yt([], b, _.key, _);
            } else if ("documentRemove" in e) {
                e.documentRemove;
                var E = e.documentRemove;
                E.document;
                var I = Jt(t, E.document), N = E.removedTargetIds || [];
                n = new yt([], N, I, null);
            } else {
                if (!("filter" in e)) return p();
                e.filter;
                var A = e.filter;
                A.targetId;
                var D = A.count || 0, k = new Q(D), O = A.targetId;
                n = new vt(O, k);
            }
            return n;
        }(this.serializer, t), n = function(t) {
            // We have only reached a consistent snapshot for the entire stream if there
            // is a read_time set and it applies to all targets (i.e. the list of
            // targets is empty). The backend is guaranteed to send such responses.
            if (!("targetChange" in t)) return L.min();
            var e = t.targetChange;
            return e.targetIds && e.targetIds.length ? L.min() : e.readTime ? Ht(e.readTime) : L.min();
        }(t);
        return this.listener.lo(e, n);
    }, 
    /**
     * Registers interest in the results of the given target. If the target
     * includes a resumeToken it will be included in the request. Results that
     * affect the target will be streamed back as WatchChange messages that
     * reference the targetId.
     */
    n.prototype._o = function(t) {
        var e = {};
        e.database = te(this.serializer), e.addTarget = function(t, e) {
            var n, r = e.target;
            return (n = G(r) ? {
                documents: re(t, r)
            } : {
                query: ie(t, r)
            }).targetId = e.targetId, e.resumeToken.H() > 0 && (n.resumeToken = Kt(t, e.resumeToken)), 
            n;
        }(this.serializer, t);
        var n = function(t, e) {
            var n = function(t, e) {
                switch (e) {
                  case 0 /* Listen */ :
                    return null;

                  case 1 /* ExistenceFilterMismatch */ :
                    return "existence-filter-mismatch";

                  case 2 /* LimboResolution */ :
                    return "limbo-document";

                  default:
                    return p();
                }
            }(0, e.X);
            return null == n ? null : {
                "goog-listen-tags": n
            };
        }(this.serializer, t);
        n && (e.labels = n), this.eo(e);
    }, 
    /**
     * Unregisters interest in the results of the target associated with the
     * given targetId.
     */
    n.prototype.fo = function(t) {
        var e = {};
        e.database = te(this.serializer), e.removeTarget = t, this.eo(e);
    }, n;
}(Xn), Zn = /** @class */ function(t) {
    function n(e, n, r, i, o) {
        var s = this;
        return (s = t.call(this, e, "write_stream_connection_backoff" /* WriteStreamConnectionBackoff */ , "write_stream_idle" /* WriteStreamIdle */ , n, r, o) || this).serializer = i, 
        s.do = !1, s;
    }
    return e.__extends(n, t), Object.defineProperty(n.prototype, "wo", {
        /**
         * Tracks whether or not a handshake has been successfully exchanged and
         * the stream is ready to accept mutations.
         */
        get: function() {
            return this.do;
        },
        enumerable: !1,
        configurable: !0
    }), 
    // Override of PersistentStream.start
    n.prototype.start = function() {
        this.do = !1, this.lastStreamToken = void 0, t.prototype.start.call(this);
    }, n.prototype.so = function() {
        this.do && this.To([]);
    }, n.prototype.ao = function(t) {
        return this.jr.co("Write", t);
    }, n.prototype.onMessage = function(t) {
        if (
        // Always capture the last stream token.
        d(!!t.streamToken), this.lastStreamToken = t.streamToken, this.do) {
            // A successful first write response means the stream is healthy,
            // Note, that we could consider a successful handshake healthy, however,
            // the write itself might be causing an error we want to back off from.
            this.$s.reset();
            var e = function(t, e) {
                return t && t.length > 0 ? (d(void 0 !== e), t.map((function(t) {
                    return function(t, e) {
                        // NOTE: Deletes don't have an updateTime.
                        var n = t.updateTime ? Ht(t.updateTime) : Ht(e);
                        n.isEqual(L.min()) && (
                        // The Firestore Emulator currently returns an update time of 0 for
                        // deletes of non-existing documents (rather than null). This breaks the
                        // test "get deleted doc while offline with source=cache" as NoDocuments
                        // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
                        // TODO(#2149): Remove this when Emulator is fixed
                        n = Ht(e));
                        var r = null;
                        return t.transformResults && t.transformResults.length > 0 && (r = t.transformResults), 
                        new Ie(n, r);
                    }(t, e);
                }))) : [];
            }(t.writeResults, t.commitTime), n = Ht(t.commitTime);
            return this.listener.mo(n, e);
        }
        // The first response is always the handshake response
                return d(!t.writeResults || 0 === t.writeResults.length), this.do = !0, 
        this.listener.Eo();
    }, 
    /**
     * Sends an initial streamToken to the server, performing the handshake
     * required to make the StreamingWrite RPC work. Subsequent
     * calls should wait until onHandshakeComplete was called.
     */
    n.prototype.Io = function() {
        // TODO(dimond): Support stream resumption. We intentionally do not set the
        // stream token on the handshake, ignoring any stream token we might have.
        var t = {};
        t.database = te(this.serializer), this.eo(t);
    }, 
    /** Sends a group of mutations to the Firestore backend to apply. */ n.prototype.To = function(t) {
        var e = this, n = {
            streamToken: this.lastStreamToken,
            writes: t.map((function(t) {
                return ne(e.serializer, t);
            }))
        };
        this.eo(n);
    }, n;
}(Xn), tr = /** @class */ function(t) {
    function n(e, n, r) {
        var i = this;
        return (i = t.call(this) || this).credentials = e, i.jr = n, i.serializer = r, i.Ro = !1, 
        i;
    }
    return e.__extends(n, t), n.prototype.Ao = function() {
        if (this.Ro) throw new R(T.FAILED_PRECONDITION, "The client has already been terminated.");
    }, 
    /** Gets an auth token and invokes the provided RPC. */ n.prototype.Po = function(t, e, n) {
        var r = this;
        return this.Ao(), this.credentials.getToken().then((function(i) {
            return r.jr.Po(t, e, n, i);
        })).catch((function(t) {
            throw t.code === T.UNAUTHENTICATED && r.credentials.$r(), t;
        }));
    }, 
    /** Gets an auth token and invokes the provided RPC with streamed results. */ n.prototype.Vo = function(t, e, n) {
        var r = this;
        return this.Ao(), this.credentials.getToken().then((function(i) {
            return r.jr.Vo(t, e, n, i);
        })).catch((function(t) {
            throw t.code === T.UNAUTHENTICATED && r.credentials.$r(), t;
        }));
    }, n.prototype.terminate = function() {
        this.Ro = !1;
    }, n;
}((function() {})), er = /** @class */ function() {
    function t(t, e) {
        this.Is = t, this.yo = e, 
        /** The current OnlineState. */
        this.state = "Unknown" /* Unknown */ , 
        /**
             * A count of consecutive failures to open the stream. If it reaches the
             * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
             * Offline.
             */
        this.po = 0, 
        /**
             * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
             * transition from OnlineState.Unknown to OnlineState.Offline without waiting
             * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
             */
        this.vo = null, 
        /**
             * Whether the client should log a warning message if it fails to connect to
             * the backend (initially true, cleared after a successful stream, or if we've
             * logged the message already).
             */
        this.bo = !0
        /**
     * Called by RemoteStore when a watch stream is started (including on each
     * backoff attempt).
     *
     * If this is the first attempt, it sets the OnlineState to Unknown and starts
     * the onlineStateTimer.
     */;
    }
    return t.prototype.So = function() {
        var t = this;
        0 === this.po && (this.Co("Unknown" /* Unknown */), this.vo = this.Is.Ts("online_state_timeout" /* OnlineStateTimeout */ , 1e4, (function() {
            return t.vo = null, t.Do("Backend didn't respond within 10 seconds."), t.Co("Offline" /* Offline */), 
            Promise.resolve();
        })));
    }, 
    /**
     * Updates our OnlineState as appropriate after the watch stream reports a
     * failure. The first failure moves us to the 'Unknown' state. We then may
     * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
     * actually transition to the 'Offline' state.
     */
    t.prototype.Fo = function(t) {
        "Online" /* Online */ === this.state ? this.Co("Unknown" /* Unknown */) : (this.po++, 
        this.po >= 1 && (this.No(), this.Do("Connection failed 1 times. Most recent error: " + t.toString()), 
        this.Co("Offline" /* Offline */)));
    }, 
    /**
     * Explicitly sets the OnlineState to the specified state.
     *
     * Note that this resets our timers / failure counters, etc. used by our
     * Offline heuristics, so must not be used in place of
     * handleWatchStreamStart() and handleWatchStreamFailure().
     */
    t.prototype.set = function(t) {
        this.No(), this.po = 0, "Online" /* Online */ === t && (
        // We've connected to watch at least once. Don't warn the developer
        // about being offline going forward.
        this.bo = !1), this.Co(t);
    }, t.prototype.Co = function(t) {
        t !== this.state && (this.state = t, this.yo(t));
    }, t.prototype.Do = function(t) {
        var e = "Could not reach Cloud Firestore backend. " + t + "\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.";
        this.bo ? (h(e), this.bo = !1) : c("OnlineStateTracker", e);
    }, t.prototype.No = function() {
        null !== this.vo && (this.vo.cancel(), this.vo = null);
    }, t;
}(), nr = /** @class */ function() {
    function t(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    t, 
    /** The client-side proxy for interacting with the backend. */
    n, r, i, o) {
        var s = this;
        this.$o = t, this.ko = n, this.Is = r, 
        /**
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
             */
        this.xo = [], 
        /**
             * A mapping of watched targets that the client cares about tracking and the
             * user has explicitly called a 'listen' for this target.
             *
             * These targets may or may not have been sent to or acknowledged by the
             * server. On re-establishing the listen stream, these targets should be sent
             * to the server. The targets removed with unlistens are removed eagerly
             * without waiting for confirmation from the listen stream.
             */
        this.Lo = new Map, this.Oo = null, 
        /**
             * A set of reasons for why the RemoteStore may be offline. If empty, the
             * RemoteStore may start its network connections.
             */
        this.Mo = new Set, this.qo = o, this.qo.Uo((function(t) {
            r.gs((function() {
                return e.__awaiter(s, void 0, void 0, (function() {
                    return e.__generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            return this.Bo() ? (c("RemoteStore", "Restarting streams for network reachability change."), 
                            [ 4 /*yield*/ , this.Wo() ]) : [ 3 /*break*/ , 2 ];

                          case 1:
                            t.sent(), t.label = 2;

                          case 2:
                            return [ 2 /*return*/ ];
                        }
                    }));
                }));
            }));
        })), this.Qo = new er(r, i), 
        // Create streams (but note they're not started yet).
        this.jo = function(t, e, n) {
            var r = y(t);
            return r.Ao(), new Jn(e, r.jr, r.credentials, r.serializer, n);
        }(this.ko, r, {
            uo: this.Go.bind(this),
            io: this.Ko.bind(this),
            lo: this.zo.bind(this)
        }), this.Ho = function(t, e, n) {
            var r = y(t);
            return r.Ao(), new Zn(e, r.jr, r.credentials, r.serializer, n);
        }(this.ko, r, {
            uo: this.Yo.bind(this),
            io: this.Xo.bind(this),
            Eo: this.Jo.bind(this),
            mo: this.mo.bind(this)
        });
    }
    /**
     * Starts up the remote store, creating streams, restoring state from
     * LocalStore, etc.
     */    return t.prototype.start = function() {
        return this.enableNetwork();
    }, 
    /** Re-enables the network. Idempotent. */ t.prototype.enableNetwork = function() {
        return this.Mo.delete(0 /* UserDisabled */), this.Zo();
    }, t.prototype.Zo = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return this.Bo() ? (this.th() ? this.eh() : this.Qo.set("Unknown" /* Unknown */), 
                    [ 4 /*yield*/ , this.nh() ]) : [ 3 /*break*/ , 2 ];

                  case 1:
                    // This will start the write stream if necessary.
                    t.sent(), t.label = 2;

                  case 2:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */
    t.prototype.disableNetwork = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return this.Mo.add(0 /* UserDisabled */), [ 4 /*yield*/ , this.sh() ];

                  case 1:
                    return t.sent(), 
                    // Set the OnlineState to Offline so get()s return from cache, etc.
                    this.Qo.set("Offline" /* Offline */), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.sh = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return [ 4 /*yield*/ , this.Ho.stop() ];

                  case 1:
                    return t.sent(), [ 4 /*yield*/ , this.jo.stop() ];

                  case 2:
                    return t.sent(), this.xo.length > 0 && (c("RemoteStore", "Stopping write stream with " + this.xo.length + " pending writes"), 
                    this.xo = []), this.ih(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.rh = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return c("RemoteStore", "RemoteStore shutting down."), this.Mo.add(5 /* Shutdown */), 
                    [ 4 /*yield*/ , this.sh() ];

                  case 1:
                    return t.sent(), this.qo.rh(), 
                    // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
                    // triggering spurious listener events with cached data, etc.
                    this.Qo.set("Unknown" /* Unknown */), [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Starts new listen for the given target. Uses resume token if provided. It
     * is a no-op if the target of given `TargetData` is already being listened to.
     */
    t.prototype.listen = function(t) {
        this.Lo.has(t.targetId) || (
        // Mark this as something the client is currently listening for.
        this.Lo.set(t.targetId, t), this.th() ? 
        // The listen will be sent in onWatchStreamOpen
        this.eh() : this.jo.Yr() && this.oh(t));
    }, 
    /**
     * Removes the listen from server. It is a no-op if the given target id is
     * not being listened to.
     */
    t.prototype.hh = function(t) {
        this.Lo.delete(t), this.jo.Yr() && this.ah(t), 0 === this.Lo.size && (this.jo.Yr() ? this.jo.Zr() : this.Bo() && 
        // Revert to OnlineState.Unknown if the watch stream is not open and we
        // have no listeners, since without any listens to send we cannot
        // confirm if the stream is healthy and upgrade to OnlineState.Online.
        this.Qo.set("Unknown" /* Unknown */));
    }, 
    /** {@link TargetMetadataProvider.getTargetDataForTarget} */ t.prototype.Le = function(t) {
        return this.Lo.get(t) || null;
    }, 
    /** {@link TargetMetadataProvider.getRemoteKeysForTarget} */ t.prototype.xe = function(t) {
        return this.uh.xe(t);
    }, 
    /**
     * We need to increment the the expected number of pending responses we're due
     * from watch so we wait for the ack to process any messages from this target.
     */
    t.prototype.oh = function(t) {
        this.Oo.de(t.targetId), this.jo._o(t);
    }, 
    /**
     * We need to increment the expected number of pending responses we're due
     * from watch so we wait for the removal on the server before we process any
     * messages from this target.
     */
    t.prototype.ah = function(t) {
        this.Oo.de(t), this.jo.fo(t);
    }, t.prototype.eh = function() {
        this.Oo = new wt(this), this.jo.start(), this.Qo.So();
    }, 
    /**
     * Returns whether the watch stream should be started because it's necessary
     * and has not yet been started.
     */
    t.prototype.th = function() {
        return this.Bo() && !this.jo.Hr() && this.Lo.size > 0;
    }, t.prototype.Bo = function() {
        return 0 === this.Mo.size;
    }, t.prototype.ih = function() {
        this.Oo = null;
    }, t.prototype.Go = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            var t = this;
            return e.__generator(this, (function(e) {
                return this.Lo.forEach((function(e, n) {
                    t.oh(e);
                })), [ 2 /*return*/ ];
            }));
        }));
    }, t.prototype.Ko = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(e) {
                return this.ih(), 
                // If we still need the watch stream, retry the connection.
                this.th() ? (this.Qo.Fo(t), this.eh()) : 
                // No need to restart watch stream because there are no active targets.
                // The online state is set to unknown because there is no active attempt
                // at establishing a connection
                this.Qo.set("Unknown" /* Unknown */), [ 2 /*return*/ ];
            }));
        }));
    }, t.prototype.zo = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r, i, o;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    if (this.Qo.set("Online" /* Online */), !(t instanceof gt && 2 /* Removed */ === t.state && t.cause)) 
                    // Mark the client as online since we got a message from the server
                    return [ 3 /*break*/ , 6 ];
                    e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 3, , 5 ]), [ 4 /*yield*/ , this.lh(t) ];

                  case 2:
                    return e.sent(), [ 3 /*break*/ , 5 ];

                  case 3:
                    return r = e.sent(), c("RemoteStore", "Failed to remove targets %s: %s ", t.targetIds.join(","), r), 
                    [ 4 /*yield*/ , this._h(r) ];

                  case 4:
                    return e.sent(), [ 3 /*break*/ , 5 ];

                  case 5:
                    return [ 3 /*break*/ , 13 ];

                  case 6:
                    if (t instanceof yt ? this.Oo.Pe(t) : t instanceof vt ? this.Oo.Ce(t) : this.Oo.pe(t), 
                    n.isEqual(L.min())) return [ 3 /*break*/ , 13 ];
                    e.label = 7;

                  case 7:
                    return e.trys.push([ 7, 11, , 13 ]), [ 4 /*yield*/ , this.$o.qi() ];

                  case 8:
                    return i = e.sent(), n.o(i) >= 0 ? [ 4 /*yield*/ , this.fh(n) ] : [ 3 /*break*/ , 10 ];

                    // We have received a target change with a global snapshot if the snapshot
                    // version is not equal to SnapshotVersion.min().
                                      case 9:
                    // We have received a target change with a global snapshot if the snapshot
                    // version is not equal to SnapshotVersion.min().
                    e.sent(), e.label = 10;

                  case 10:
                    return [ 3 /*break*/ , 13 ];

                  case 11:
                    return c("RemoteStore", "Failed to raise snapshot:", o = e.sent()), [ 4 /*yield*/ , this._h(o) ];

                  case 12:
                    return e.sent(), [ 3 /*break*/ , 13 ];

                  case 13:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Recovery logic for IndexedDB errors that takes the network offline until
     * `op` succeeds. Retries are scheduled with backoff using
     * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
     * validated via a generic operation.
     *
     * The returned Promise is resolved once the network is disabled and before
     * any retry attempt.
     */
    t.prototype._h = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r = this;
            return e.__generator(this, (function(i) {
                switch (i.label) {
                  case 0:
                    if (!Pn(t)) throw t;
                    // Disable network and raise offline snapshots
                    return this.Mo.add(1 /* IndexedDbFailed */), [ 4 /*yield*/ , this.sh() ];

                  case 1:
                    // Disable network and raise offline snapshots
                    return i.sent(), this.Qo.set("Offline" /* Offline */), n || (
                    // Use a simple read operation to determine if IndexedDB recovered.
                    // Ideally, we would expose a health check directly on SimpleDb, but
                    // RemoteStore only has access to persistence through LocalStore.
                    n = function() {
                        return r.$o.qi();
                    }), 
                    // Probe IndexedDB periodically and re-enable network
                    this.Is.Us((function() {
                        return e.__awaiter(r, void 0, void 0, (function() {
                            return e.__generator(this, (function(t) {
                                switch (t.label) {
                                  case 0:
                                    return c("RemoteStore", "Retrying IndexedDB access"), [ 4 /*yield*/ , n() ];

                                  case 1:
                                    return t.sent(), this.Mo.delete(1 /* IndexedDbFailed */), [ 4 /*yield*/ , this.Zo() ];

                                  case 2:
                                    return t.sent(), [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    })), [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */
    t.prototype.dh = function(t) {
        var e = this;
        return t().catch((function(n) {
            return e._h(n, t);
        }));
    }, 
    /**
     * Takes a batch of changes from the Datastore, repackages them as a
     * RemoteEvent, and passes that on to the listener, which is typically the
     * SyncEngine.
     */
    t.prototype.fh = function(t) {
        var e = this, n = this.Oo.Ne(t);
        // Update in-memory resume tokens. LocalStore will update the
        // persistent view of these when applying the completed RemoteEvent.
        // Finally raise remote event
        return n.Wt.forEach((function(n, r) {
            if (n.resumeToken.H() > 0) {
                var i = e.Lo.get(r);
                // A watched target might have been removed already.
                                i && e.Lo.set(r, i.tt(n.resumeToken, t));
            }
        })), 
        // Re-establish listens for the targets that have been invalidated by
        // existence filter mismatches.
        n.Qt.forEach((function(t) {
            var n = e.Lo.get(t);
            if (n) {
                // Clear the resume token for the target, since we're in a known mismatch
                // state.
                e.Lo.set(t, n.tt(F.Y, n.J)), 
                // Cause a hard reset by unwatching and rewatching immediately, but
                // deliberately don't send a resume token so that we get a full update.
                e.ah(t);
                // Mark the target we send as being on behalf of an existence filter
                // mismatch, but don't actually retain that in listenTargets. This ensures
                // that we flag the first re-listen this way without impacting future
                // listens of this target (that might happen e.g. on reconnect).
                var r = new W(n.target, t, 1 /* ExistenceFilterMismatch */ , n.sequenceNumber);
                e.oh(r);
            }
        })), this.uh.Ui(n);
    }, 
    /** Handles an error on a target */ t.prototype.lh = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i, o;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    n = t.cause, r = 0, i = t.targetIds, e.label = 1;

                  case 1:
                    return r < i.length ? (o = i[r], this.Lo.has(o) ? [ 4 /*yield*/ , this.uh.wh(o, n) ] : [ 3 /*break*/ , 3 ]) : [ 3 /*break*/ , 5 ];

                  case 2:
                    e.sent(), this.Lo.delete(o), this.Oo.removeTarget(o), e.label = 3;

                  case 3:
                    e.label = 4;

                  case 4:
                    return r++, [ 3 /*break*/ , 1 ];

                  case 5:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Attempts to fill our write pipeline with writes from the LocalStore.
     *
     * Called internally to bootstrap or refill the write pipeline and by
     * SyncEngine whenever there are new mutations to process.
     *
     * Starts the write stream if necessary.
     */
    t.prototype.nh = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            var t, n, r;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    t = this.xo.length > 0 ? this.xo[this.xo.length - 1].batchId : -1, e.label = 1;

                  case 1:
                    if (!this.Th()) return [ 3 /*break*/ , 7 ];
                    e.label = 2;

                  case 2:
                    return e.trys.push([ 2, 4, , 6 ]), [ 4 /*yield*/ , this.$o.nr(t) ];

                  case 3:
                    return null === (n = e.sent()) ? (0 === this.xo.length && this.Ho.Zr(), [ 3 /*break*/ , 7 ]) : (t = n.batchId, 
                    this.mh(n), [ 3 /*break*/ , 6 ]);

                  case 4:
                    return r = e.sent(), [ 4 /*yield*/ , this._h(r) ];

                  case 5:
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 3 /*break*/ , 1 ];

                  case 7:
                    return this.Eh() && this.Ih(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */
    t.prototype.Th = function() {
        return this.Bo() && this.xo.length < 10;
    }, 
    // For testing
    t.prototype.Rh = function() {
        return this.xo.length;
    }, 
    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */
    t.prototype.mh = function(t) {
        this.xo.push(t), this.Ho.Yr() && this.Ho.wo && this.Ho.To(t.mutations);
    }, t.prototype.Eh = function() {
        return this.Bo() && !this.Ho.Hr() && this.xo.length > 0;
    }, t.prototype.Ih = function() {
        this.Ho.start();
    }, t.prototype.Yo = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                return this.Ho.Io(), [ 2 /*return*/ ];
            }));
        }));
    }, t.prototype.Jo = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            var t, n, r;
            return e.__generator(this, (function(e) {
                // Send the write pipeline now that the stream is established.
                for (t = 0, n = this.xo; t < n.length; t++) r = n[t], this.Ho.To(r.mutations);
                return [ 2 /*return*/ ];
            }));
        }));
    }, t.prototype.mo = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r, i, o = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return r = this.xo.shift(), i = An.from(r, t, n), [ 4 /*yield*/ , this.dh((function() {
                        return o.uh.Ah(i);
                    })) ];

                  case 1:
                    // It's possible that with the completion of this mutation another
                    // slot has freed up.
                    return e.sent(), [ 4 /*yield*/ , this.nh() ];

                  case 2:
                    // It's possible that with the completion of this mutation another
                    // slot has freed up.
                    return e.sent(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Xo = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return t && this.Ho.wo ? [ 4 /*yield*/ , this.Ph(t) ] : [ 3 /*break*/ , 2 ];

                    // This error affects the actual write.
                                      case 1:
                    // This error affects the actual write.
                    e.sent(), e.label = 2;

                  case 2:
                    // If the write stream closed after the write handshake completes, a write
                    // operation failed and we fail the pending operation.
                    // The write stream might have been started by refilling the write
                    // pipeline for failed writes
                    return this.Eh() && this.Ih(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Ph = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return K(r = t.code) && r !== T.ABORTED ? (n = this.xo.shift(), 
                    // In this case it's also unlikely that the server itself is melting
                    // down -- this was just a bad request so inhibit backoff on the next
                    // restart.
                    this.Ho.Jr(), [ 4 /*yield*/ , this.dh((function() {
                        return i.uh.Vh(n.batchId, t);
                    })) ]) : [ 3 /*break*/ , 3 ];

                  case 1:
                    // It's possible that with the completion of this mutation
                    // another slot has freed up.
                    return e.sent(), [ 4 /*yield*/ , this.nh() ];

                  case 2:
                    // In this case it's also unlikely that the server itself is melting
                    // down -- this was just a bad request so inhibit backoff on the next
                    // restart.
                    // It's possible that with the completion of this mutation
                    // another slot has freed up.
                    e.sent(), e.label = 3;

                  case 3:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Wo = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return this.Mo.add(4 /* ConnectivityChange */), [ 4 /*yield*/ , this.sh() ];

                  case 1:
                    return t.sent(), this.Qo.set("Unknown" /* Unknown */), this.Ho.Jr(), this.jo.Jr(), 
                    this.Mo.delete(4 /* ConnectivityChange */), [ 4 /*yield*/ , this.Zo() ];

                  case 2:
                    return t.sent(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.yh = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.Is.Qs(), 
                    // Tear down and re-create our network streams. This will ensure we get a
                    // fresh auth token for the new user and re-fill the write pipeline with
                    // new mutations from the LocalStore (since mutations are per-user).
                    c("RemoteStore", "RemoteStore received new credentials"), this.Mo.add(3 /* CredentialChange */), 
                    [ 4 /*yield*/ , this.sh() ];

                  case 1:
                    return e.sent(), this.Qo.set("Unknown" /* Unknown */), [ 4 /*yield*/ , this.uh.yh(t) ];

                  case 2:
                    return e.sent(), this.Mo.delete(3 /* CredentialChange */), [ 4 /*yield*/ , this.Zo() ];

                  case 3:
                    return e.sent(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */
    t.prototype.ph = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return t ? (this.Mo.delete(2 /* IsSecondary */), [ 4 /*yield*/ , this.Zo() ]) : [ 3 /*break*/ , 2 ];

                  case 1:
                    return e.sent(), [ 3 /*break*/ , 5 ];

                  case 2:
                    return (n = t) ? [ 3 /*break*/ , 4 ] : (this.Mo.add(2 /* IsSecondary */), [ 4 /*yield*/ , this.sh() ]);

                  case 3:
                    e.sent(), n = this.Qo.set("Unknown" /* Unknown */), e.label = 4;

                  case 4:
                    n, e.label = 5;

                  case 5:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t;
}(), rr = /** @class */ function() {
    function t() {
        this.activeTargetIds = ct();
    }
    return t.prototype.gh = function(t) {
        this.activeTargetIds = this.activeTargetIds.add(t);
    }, t.prototype.vh = function(t) {
        this.activeTargetIds = this.activeTargetIds.delete(t);
    }, 
    /**
     * Converts this entry into a JSON-encoded format we can use for WebStorage.
     * Does not encode `clientId` as it is part of the key in WebStorage.
     */
    t.prototype.bh = function() {
        var t = {
            activeTargetIds: this.activeTargetIds.F(),
            updateTimeMs: Date.now()
        };
        return JSON.stringify(t);
    }, t;
}(), ir = /** @class */ function() {
    function t() {
        this.Sh = new rr, this.Ch = {}, this.yo = null, this.Zn = null;
    }
    return t.prototype.Dh = function(t) {
        // No op.
    }, t.prototype.Fh = function(t, e, n) {
        // No op.
    }, t.prototype.Nh = function(t) {
        return this.Sh.gh(t), this.Ch[t] || "not-current";
    }, t.prototype.$h = function(t, e, n) {
        this.Ch[t] = e;
    }, t.prototype.kh = function(t) {
        this.Sh.vh(t);
    }, t.prototype.xh = function(t) {
        return this.Sh.activeTargetIds.has(t);
    }, t.prototype.Lh = function(t) {
        delete this.Ch[t];
    }, t.prototype.Oh = function() {
        return this.Sh.activeTargetIds;
    }, t.prototype.Mh = function(t) {
        return this.Sh.activeTargetIds.has(t);
    }, t.prototype.start = function() {
        return this.Sh = new rr, Promise.resolve();
    }, t.prototype.Vi = function(t, e, n) {
        // No op.
    }, t.prototype.qh = function(t) {
        // No op.
    }, t.prototype.rh = function() {}, t.prototype.ns = function(t) {}, t;
}(), or = function(t) {
    this.key = t;
}, sr = function(t) {
    this.key = t;
}, ur = /** @class */ function() {
    function t(t, 
    /** Documents included in the remote target */
    e) {
        this.query = t, this.Uh = e, this.Bh = null, 
        /**
             * A flag whether the view is current with the backend. A view is considered
             * current after it has seen the current flag from the backend and did not
             * lose consistency within the watch stream (e.g. because of an existence
             * filter mismatch).
             */
        this.Ht = !1, 
        /** Documents in the view but not in the remote target */
        this.Wh = ut(), 
        /** Document Keys that have local changes */
        this.Mt = ut(), this.Qh = un(t), this.jh = new ht(this.Qh);
    }
    return Object.defineProperty(t.prototype, "Gh", {
        /**
         * The set of remote documents that the server has told us belongs to the target associated with
         * this view.
         */
        get: function() {
            return this.Uh;
        },
        enumerable: !1,
        configurable: !0
    }), 
    /**
     * Iterates over a set of doc changes, applies the query limit, and computes
     * what the new results should be, what the changes were, and whether we may
     * need to go back to the local cache for more results. Does not make any
     * changes to the view.
     * @param docChanges The doc changes to apply to this view.
     * @param previousChanges If this is being called with a refill, then start
     *        with this set of docs and changes instead of the current view.
     * @return a new set of docs, changes, and refill flag.
     */
    t.prototype.Kh = function(t, e) {
        var n = this, r = e ? e.zh : new ft, i = e ? e.jh : this.jh, o = e ? e.Mt : this.Mt, s = i, u = !1, a = this.query.hn() && i.size === this.query.limit ? i.last() : null, c = this.query.an() && i.size === this.query.limit ? i.first() : null;
        // Drop documents out to meet limit/limitToLast requirement.
        if (t.ot((function(t, e) {
            var h = i.get(t), f = e instanceof ze ? e : null;
            f && (f = sn(n.query, f) ? f : null);
            var l = !!h && n.Mt.has(h.key), p = !!f && (f.Ge || 
            // We only consider committed mutations for documents that were
            // mutated during the lifetime of the view.
            n.Mt.has(f.key) && f.hasCommittedMutations), d = !1;
            // Calculate change
            h && f ? h.data().isEqual(f.data()) ? l !== p && (r.track({
                type: 3 /* Metadata */ ,
                doc: f
            }), d = !0) : n.Hh(h, f) || (r.track({
                type: 2 /* Modified */ ,
                doc: f
            }), d = !0, (a && n.Qh(f, a) > 0 || c && n.Qh(f, c) < 0) && (
            // This doc moved from inside the limit to outside the limit.
            // That means there may be some other doc in the local cache
            // that should be included instead.
            u = !0)) : !h && f ? (r.track({
                type: 0 /* Added */ ,
                doc: f
            }), d = !0) : h && !f && (r.track({
                type: 1 /* Removed */ ,
                doc: h
            }), d = !0, (a || c) && (
            // A doc was removed from a full limit query. We'll need to
            // requery from the local cache to see if we know about some other
            // doc that should be in the results.
            u = !0)), d && (f ? (s = s.add(f), o = p ? o.add(t) : o.delete(t)) : (s = s.delete(t), 
            o = o.delete(t)));
        })), this.query.hn() || this.query.an()) for (;s.size > this.query.limit; ) {
            var h = this.query.hn() ? s.last() : s.first();
            s = s.delete(h.key), o = o.delete(h.key), r.track({
                type: 1 /* Removed */ ,
                doc: h
            });
        }
        return {
            jh: s,
            zh: r,
            Yh: u,
            Mt: o
        };
    }, t.prototype.Hh = function(t, e) {
        // We suppress the initial change event for documents that were modified as
        // part of a write acknowledgment (e.g. when the value of a server transform
        // is applied) as Watch will send us the same document again.
        // By suppressing the event, we only raise two user visible events (one with
        // `hasPendingWrites` and the final state of the document) instead of three
        // (one with `hasPendingWrites`, the modified document with
        // `hasPendingWrites` and the final state of the document).
        return t.Ge && e.hasCommittedMutations && !e.Ge;
    }, 
    /**
     * Updates the view with the given ViewDocumentChanges and optionally updates
     * limbo docs and sync state from the provided target change.
     * @param docChanges The set of changes to make to the view's docs.
     * @param updateLimboDocuments Whether to update limbo documents based on this
     *        change.
     * @param targetChange A target change to apply for computing limbo docs and
     *        sync state.
     * @return A new ViewChange with the given docs, changes, and sync state.
     */
    // PORTING NOTE: The iOS/Android clients always compute limbo document changes.
    t.prototype.Xh = function(t, e, n) {
        var r = this, i = this.jh;
        this.jh = t.jh, this.Mt = t.Mt;
        // Sort changes based on type and query comparator
        var o = t.zh.Lt();
        o.sort((function(t, e) {
            return function(t, e) {
                var n = function(t) {
                    switch (t) {
                      case 0 /* Added */ :
                        return 1;

                      case 2 /* Modified */ :
                      case 3 /* Metadata */ :
                        // A metadata change is converted to a modified change at the public
                        // api layer.  Since we sort by document key and then change type,
                        // metadata and modified changes must be sorted equivalently.
                        return 2;

                      case 1 /* Removed */ :
                        return 0;

                      default:
                        return p();
                    }
                };
                return n(t) - n(e);
            }(t.type, e.type) || r.Qh(t.doc, e.doc);
        })), this.Jh(n);
        var s = e ? this.Zh() : [], u = 0 === this.Wh.size && this.Ht ? 1 /* Synced */ : 0 /* Local */ , a = u !== this.Bh;
        return this.Bh = u, 0 !== o.length || a ? {
            snapshot: new lt(this.query, t.jh, i, o, t.Mt, 0 /* Local */ === u, a, 
            /* excludesMetadataChanges= */ !1),
            ta: s
        } : {
            ta: s
        };
        // no changes
        }, 
    /**
     * Applies an OnlineState change to the view, potentially generating a
     * ViewChange if the view's syncState changes as a result.
     */
    t.prototype.ea = function(t) {
        return this.Ht && "Offline" /* Offline */ === t ? (
        // If we're offline, set `current` to false and then call applyChanges()
        // to refresh our syncState and generate a ViewChange as appropriate. We
        // are guaranteed to get a new TargetChange that sets `current` back to
        // true once the client is back online.
        this.Ht = !1, this.Xh({
            jh: this.jh,
            zh: new ft,
            Mt: this.Mt,
            Yh: !1
        }, 
        /* updateLimboDocuments= */ !1)) : {
            ta: []
        };
    }, 
    /**
     * Returns whether the doc for the given key should be in limbo.
     */
    t.prototype.na = function(t) {
        // If the remote end says it's part of this query, it's not in limbo.
        return !this.Uh.has(t) && 
        // The local store doesn't think it's a result, so it shouldn't be in limbo.
        !!this.jh.has(t) && !this.jh.get(t).Ge;
    }, 
    /**
     * Updates syncedDocuments, current, and limbo docs based on the given change.
     * Returns the list of changes to which docs are in limbo.
     */
    t.prototype.Jh = function(t) {
        var e = this;
        t && (t.Yt.forEach((function(t) {
            return e.Uh = e.Uh.add(t);
        })), t.Xt.forEach((function(t) {})), t.Jt.forEach((function(t) {
            return e.Uh = e.Uh.delete(t);
        })), this.Ht = t.Ht);
    }, t.prototype.Zh = function() {
        var t = this;
        // We can only determine limbo documents when we're in-sync with the server.
                if (!this.Ht) return [];
        // TODO(klimt): Do this incrementally so that it's not quadratic when
        // updating many documents.
                var e = this.Wh;
        this.Wh = ut(), this.jh.forEach((function(e) {
            t.na(e.key) && (t.Wh = t.Wh.add(e.key));
        }));
        // Diff the new limbo docs with the old limbo docs.
        var n = [];
        return e.forEach((function(e) {
            t.Wh.has(e) || n.push(new sr(e));
        })), this.Wh.forEach((function(t) {
            e.has(t) || n.push(new or(t));
        })), n;
    }, 
    /**
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
     */
    // PORTING NOTE: Multi-tab only.
    t.prototype.sa = function(t) {
        this.Uh = t._r, this.Wh = ut();
        var e = this.Kh(t.documents);
        return this.Xh(e, /*updateLimboDocuments=*/ !0);
    }, 
    /**
     * Returns a view snapshot as if this query was just listened to. Contains
     * a document add for every existing document and the `fromCache` and
     * `hasPendingWrites` status of the already established view.
     */
    // PORTING NOTE: Multi-tab only.
    t.prototype.ia = function() {
        return lt.Bt(this.query, this.jh, this.Mt, 0 /* Local */ === this.Bh);
    }, t;
}(), ar = function(
/**
     * The query itself.
     */
t, 
/**
     * The target number created by the client that is used in the watch
     * stream to identify this query.
     */
e, 
/**
     * The view is responsible for computing the final merged truth of what
     * docs are in the query. It gets notified of local and remote changes,
     * and applies the query filters and limits to determine the most correct
     * possible results.
     */
n) {
    this.query = t, this.targetId = e, this.view = n;
}, cr = function(t) {
    this.key = t, 
    /**
             * Set to true once we've received a document. This is used in
             * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
             * decide whether it needs to manufacture a delete event for the target once
             * the target is CURRENT.
             */
    this.ra = !1;
}, hr = /** @class */ function() {
    function t(t, e, n, 
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    r, i, o) {
        this.$o = t, this.oa = e, this.ko = n, this.ha = r, this.currentUser = i, this.aa = o, 
        this.ua = null, this.ca = new A((function(t) {
            return rn(t);
        }), nn), this.la = new Map, 
        /**
             * The keys of documents that are in limbo for which we haven't yet started a
             * limbo resolution query.
             */
        this._a = [], 
        /**
             * Keeps track of the target ID for each document that is in limbo with an
             * active target.
             */
        this.fa = new H(U.P), 
        /**
             * Keeps track of the information about an active limbo resolution for each
             * active target ID that was started for the purpose of limbo resolution.
             */
        this.da = new Map, this.wa = new Bn, 
        /** Stores user completion handlers, indexed by User and BatchId. */
        this.Ta = {}, 
        /** Stores user callbacks waiting for all pending writes to be acknowledged. */
        this.ma = new Map, this.Ea = jn.ci(), this.onlineState = "Unknown" /* Unknown */ , 
        // The primary state is set to `true` or `false` immediately after Firestore
        // startup. In the interim, a client should only be considered primary if
        // `isPrimary` is true.
        this.Ia = void 0;
    }
    return Object.defineProperty(t.prototype, "Ra", {
        get: function() {
            return !0 === this.Ia;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.subscribe = function(t) {
        this.ua = t;
    }, t.prototype.listen = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i, o, s;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.Aa("listen()"), (i = this.ca.get(t)) ? (
                    // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
                    // already exists when EventManager calls us for the first time. This
                    // happens when the primary tab is already listening to this query on
                    // behalf of another tab and the user of the primary also starts listening
                    // to the query. EventManager will not have an assigned target ID in this
                    // case and calls `listen` to obtain this ID.
                    n = i.targetId, this.ha.Nh(n), r = i.view.ia(), [ 3 /*break*/ , 4 ]) : [ 3 /*break*/ , 1 ];

                  case 1:
                    return [ 4 /*yield*/ , this.$o.rr(Je(t)) ];

                  case 2:
                    return o = e.sent(), s = this.ha.Nh(o.targetId), n = o.targetId, [ 4 /*yield*/ , this.Pa(t, n, "current" === s) ];

                  case 3:
                    r = e.sent(), this.Ra && this.oa.listen(o), e.label = 4;

                  case 4:
                    return [ 2 /*return*/ , r ];
                }
            }));
        }));
    }, 
    /**
     * Registers a view for a previously unknown query and computes its initial
     * snapshot.
     */
    t.prototype.Pa = function(t, n, r) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var i, o, s, u, a, c;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return [ 4 /*yield*/ , this.$o.cr(t, 
                    /* usePreviousResults= */ !0) ];

                  case 1:
                    return i = e.sent(), o = new ur(t, i._r), s = o.Kh(i.documents), u = dt.zt(n, r && "Offline" /* Offline */ !== this.onlineState), 
                    a = o.Xh(s, 
                    /* updateLimboDocuments= */ this.Ra, u), this.Va(n, a.ta), c = new ar(t, n, o), 
                    [ 2 /*return*/ , (this.ca.set(t, c), this.la.has(n) ? this.la.get(n).push(t) : this.la.set(n, [ t ]), 
                    a.snapshot) ];
                }
            }));
        }));
    }, t.prototype.hh = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    // Only clean up the query view and target if this is the only query mapped
                    // to the target.
                    return this.Aa("unlisten()"), n = this.ca.get(t), (r = this.la.get(n.targetId)).length > 1 ? [ 2 /*return*/ , (this.la.set(n.targetId, r.filter((function(e) {
                        return !nn(e, t);
                    }))), void this.ca.delete(t)) ] : this.Ra ? (
                    // We need to remove the local query target first to allow us to verify
                    // whether any other client is still interested in this target.
                    this.ha.kh(n.targetId), this.ha.Mh(n.targetId) ? [ 3 /*break*/ , 2 ] : [ 4 /*yield*/ , this.$o.ur(n.targetId, /*keepPersistedTargetData=*/ !1).then((function() {
                        i.ha.Lh(n.targetId), i.oa.hh(n.targetId), i.ya(n.targetId);
                    })).catch(Fn) ]) : [ 3 /*break*/ , 3 ];

                  case 1:
                    e.sent(), e.label = 2;

                  case 2:
                    return [ 3 /*break*/ , 5 ];

                  case 3:
                    return this.ya(n.targetId), [ 4 /*yield*/ , this.$o.ur(n.targetId, 
                    /*keepPersistedTargetData=*/ !0) ];

                  case 4:
                    e.sent(), e.label = 5;

                  case 5:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.write = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r, i, o;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    this.Aa("write()"), e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 5, , 6 ]), [ 4 /*yield*/ , this.$o.bi(t) ];

                  case 2:
                    return r = e.sent(), this.ha.Dh(r.batchId), this.pa(r.batchId, n), [ 4 /*yield*/ , this.ga(r.Ci) ];

                  case 3:
                    return e.sent(), [ 4 /*yield*/ , this.oa.nh() ];

                  case 4:
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 5:
                    return i = e.sent(), o = Mn(i, "Failed to persist write"), n.reject(o), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Ui = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    this.Aa("applyRemoteEvent()"), e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , this.$o.Ui(t) ];

                  case 2:
                    return n = e.sent(), 
                    // Update `receivedDocument` as appropriate for any limbo targets.
                    t.Wt.forEach((function(t, e) {
                        var n = r.da.get(e);
                        n && (
                        // Since this is a limbo resolution lookup, it's for a single document
                        // and it could be added, modified, or removed, but not a combination.
                        d(t.Yt.size + t.Xt.size + t.Jt.size <= 1), t.Yt.size > 0 ? n.ra = !0 : t.Xt.size > 0 ? d(n.ra) : t.Jt.size > 0 && (d(n.ra), 
                        n.ra = !1));
                    })), [ 4 /*yield*/ , this.ga(n, t) ];

                  case 3:
                    // Update `receivedDocument` as appropriate for any limbo targets.
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 4:
                    return [ 4 /*yield*/ , Fn(e.sent()) ];

                  case 5:
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.ea = function(t, e) {
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
        if (this.Ra && 0 /* RemoteStore */ === e || !this.Ra && 1 /* SharedClientState */ === e) {
            this.Aa("applyOnlineStateChange()");
            var n = [];
            this.ca.forEach((function(e, r) {
                var i = r.view.ea(t);
                i.snapshot && n.push(i.snapshot);
            })), this.ua.va(t), this.ua.lo(n), this.onlineState = t, this.Ra && this.ha.qh(t);
        }
    }, t.prototype.wh = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r, i, o, s, u, a = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.Aa("rejectListens()"), 
                    // PORTING NOTE: Multi-tab only.
                    this.ha.$h(t, "rejected", n), r = this.da.get(t), (i = r && r.key) ? (o = (o = new H(U.P)).nt(i, new We(i, L.min())), 
                    s = ut().add(i), u = new pt(L.min(), 
                    /* targetChanges= */ new Map, 
                    /* targetMismatches= */ new J(m), o, s), [ 4 /*yield*/ , this.Ui(u) ]) : [ 3 /*break*/ , 2 ];

                  case 1:
                    return e.sent(), 
                    // Since this query failed, we won't want to manually unlisten to it.
                    // We only remove it from bookkeeping after we successfully applied the
                    // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
                    // this query when the RemoteStore restarts the Watch stream, which should
                    // re-trigger the target failure.
                    this.fa = this.fa.remove(i), this.da.delete(t), this.ba(), [ 3 /*break*/ , 4 ];

                  case 2:
                    return [ 4 /*yield*/ , this.$o.ur(t, /* keepPersistedTargetData */ !1).then((function() {
                        return a.ya(t, n);
                    })).catch(Fn) ];

                  case 3:
                    e.sent(), e.label = 4;

                  case 4:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Ah = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    this.Aa("applySuccessfulWrite()"), n = t.batch.batchId, e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , this.$o.Di(t) ];

                  case 2:
                    return r = e.sent(), 
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught
                    // up), so we raise user callbacks first so that they consistently happen
                    // before listen events.
                    this.Sa(n, /*error=*/ null), this.Ca(n), this.ha.Fh(n, "acknowledged"), [ 4 /*yield*/ , this.ga(r) ];

                  case 3:
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught
                    // up), so we raise user callbacks first so that they consistently happen
                    // before listen events.
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 4:
                    return [ 4 /*yield*/ , Fn(e.sent()) ];

                  case 5:
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Vh = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    this.Aa("rejectFailedWrite()"), e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 4, , 6 ]), [ 4 /*yield*/ , this.$o.xi(t) ];

                  case 2:
                    return r = e.sent(), 
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught up),
                    // so we raise user callbacks first so that they consistently happen before
                    // listen events.
                    this.Sa(t, n), this.Ca(t), this.ha.Fh(t, "rejected", n), [ 4 /*yield*/ , this.ga(r) ];

                  case 3:
                    // The local store may or may not be able to apply the write result and
                    // raise events immediately (depending on whether the watcher is caught up),
                    // so we raise user callbacks first so that they consistently happen before
                    // listen events.
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 4:
                    return [ 4 /*yield*/ , Fn(e.sent()) ];

                  case 5:
                    return e.sent(), [ 3 /*break*/ , 6 ];

                  case 6:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Da = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i, o;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    this.oa.Bo() || c("SyncEngine", "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled."), 
                    e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 3, , 4 ]), [ 4 /*yield*/ , this.$o.Mi() ];

                  case 2:
                    return -1 === (n = e.sent()) ? [ 2 /*return*/ , void t.resolve() ] : ((r = this.ma.get(n) || []).push(t), 
                    this.ma.set(n, r), [ 3 /*break*/ , 4 ]);

                  case 3:
                    return i = e.sent(), o = Mn(i, "Initialization of waitForPendingWrites() operation failed"), 
                    t.reject(o), [ 3 /*break*/ , 4 ];

                  case 4:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */
    t.prototype.Ca = function(t) {
        (this.ma.get(t) || []).forEach((function(t) {
            t.resolve();
        })), this.ma.delete(t);
    }, 
    /** Reject all outstanding callbacks waiting for pending writes to complete. */ t.prototype.Fa = function(t) {
        this.ma.forEach((function(e) {
            e.forEach((function(e) {
                e.reject(new R(T.CANCELLED, t));
            }));
        })), this.ma.clear();
    }, t.prototype.pa = function(t, e) {
        var n = this.Ta[this.currentUser.Sr()];
        n || (n = new H(m)), n = n.nt(t, e), this.Ta[this.currentUser.Sr()] = n;
    }, 
    /**
     * Resolves or rejects the user callback for the given batch and then discards
     * it.
     */
    t.prototype.Sa = function(t, e) {
        var n = this.Ta[this.currentUser.Sr()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
                if (n) {
            var r = n.get(t);
            r && (e ? r.reject(e) : r.resolve(), n = n.remove(t)), this.Ta[this.currentUser.Sr()] = n;
        }
    }, t.prototype.ya = function(t, e) {
        var n = this;
        void 0 === e && (e = null), this.ha.kh(t);
        for (var r = 0, i = this.la.get(t); r < i.length; r++) {
            var o = i[r];
            this.ca.delete(o), e && this.ua.Na(o, e);
        }
        this.la.delete(t), this.Ra && this.wa.Vr(t).forEach((function(t) {
            n.wa.gr(t) || 
            // We removed the last reference for this key
            n.$a(t);
        }));
    }, t.prototype.$a = function(t) {
        // It's possible that the target already got removed because the query failed. In that case,
        // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
        var e = this.fa.get(t);
        null !== e && (this.oa.hh(e), this.fa = this.fa.remove(t), this.da.delete(e), this.ba());
    }, t.prototype.Va = function(t, e) {
        for (var n = 0, r = e; n < r.length; n++) {
            var i = r[n];
            i instanceof or ? (this.wa.tr(i.key, t), this.ka(i)) : i instanceof sr ? (c("SyncEngine", "Document no longer in limbo: " + i.key), 
            this.wa.er(i.key, t), this.wa.gr(i.key) || 
            // We removed the last reference for this key
            this.$a(i.key)) : p();
        }
    }, t.prototype.ka = function(t) {
        var e = t.key;
        this.fa.get(e) || (c("SyncEngine", "New document in limbo: " + e), this._a.push(e), 
        this.ba());
    }, 
    /**
     * Starts listens for documents in limbo that are enqueued for resolution,
     * subject to a maximum number of concurrent resolutions.
     *
     * Without bounding the number of concurrent resolutions, the server can fail
     * with "resource exhausted" errors which can lead to pathological client
     * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
     */
    t.prototype.ba = function() {
        for (;this._a.length > 0 && this.fa.size < this.aa; ) {
            var t = this._a.shift(), e = this.Ea.next();
            this.da.set(e, new cr(t)), this.fa = this.fa.nt(t, e), this.oa.listen(new W(Je(He(t.path)), e, 2 /* LimboResolution */ , Ln.ss));
        }
    }, 
    // Visible for testing
    t.prototype.xa = function() {
        return this.fa;
    }, 
    // Visible for testing
    t.prototype.La = function() {
        return this._a;
    }, t.prototype.ga = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r, i, o, s = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return r = [], i = [], o = [], this.ca.forEach((function(e, u) {
                        o.push(Promise.resolve().then((function() {
                            var e = u.view.Kh(t);
                            return e.Yh ? s.$o.cr(u.query, /* usePreviousResults= */ !1).then((function(t) {
                                var n = t.documents;
                                return u.view.Kh(n, e);
                            })) : e;
                            // The query has a limit and some docs were removed, so we need
                            // to re-run the query against the local store to make sure we
                            // didn't lose any good docs that had been past the limit.
                                                })).then((function(t) {
                            var e = n && n.Wt.get(u.targetId), o = u.view.Xh(t, 
                            /* updateLimboDocuments= */ s.Ra, e);
                            if (s.Va(u.targetId, o.ta), o.snapshot) {
                                s.Ra && s.ha.$h(u.targetId, o.snapshot.fromCache ? "not-current" : "current"), r.push(o.snapshot);
                                var a = Dn.Jn(u.targetId, o.snapshot);
                                i.push(a);
                            }
                        })));
                    })), [ 4 /*yield*/ , Promise.all(o) ];

                  case 1:
                    return e.sent(), this.ua.lo(r), [ 4 /*yield*/ , this.$o.Zi(i) ];

                  case 2:
                    return e.sent(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Aa = function(t) {}, t.prototype.yh = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.currentUser.isEqual(t) ? [ 3 /*break*/ , 3 ] : (c("SyncEngine", "User change. New user:", t.Sr()), 
                    [ 4 /*yield*/ , this.$o.Vi(t) ]);

                  case 1:
                    return n = e.sent(), this.currentUser = t, 
                    // Fails tasks waiting for pending writes requested by previous user.
                    this.Fa("'waitForPendingWrites' promise is rejected due to a user change."), 
                    // TODO(b/114226417): Consider calling this only in the primary tab.
                    this.ha.Vi(t, n.gi, n.vi), [ 4 /*yield*/ , this.ga(n.pi) ];

                  case 2:
                    e.sent(), e.label = 3;

                  case 3:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.xe = function(t) {
        var e = this.da.get(t);
        if (e && e.ra) return ut().add(e.key);
        var n = ut(), r = this.la.get(t);
        if (!r) return n;
        for (var i = 0, o = r; i < o.length; i++) {
            var s = o[i], u = this.ca.get(s);
            n = n.Dt(u.view.Gh);
        }
        return n;
    }, t;
}(), fr = function() {
    this.Oa = void 0, this.Ma = [];
}, lr = /** @class */ function() {
    function t(t) {
        this.uh = t, this.qa = new A((function(t) {
            return rn(t);
        }), nn), this.onlineState = "Unknown" /* Unknown */ , this.Ua = new Set, this.uh.subscribe(this);
    }
    return t.prototype.listen = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i, o, s, u;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    if (n = t.query, r = !1, (i = this.qa.get(n)) || (r = !0, i = new fr), !r) return [ 3 /*break*/ , 4 ];
                    e.label = 1;

                  case 1:
                    return e.trys.push([ 1, 3, , 4 ]), o = i, [ 4 /*yield*/ , this.uh.listen(n) ];

                  case 2:
                    return o.Oa = e.sent(), [ 3 /*break*/ , 4 ];

                  case 3:
                    return s = e.sent(), u = Mn(s, "Initialization of query '" + on(t.query) + "' failed"), 
                    [ 2 /*return*/ , void t.onError(u) ];

                  case 4:
                    return this.qa.set(n, i), i.Ma.push(t), 
                    // Run global snapshot listeners if a consistent snapshot has been emitted.
                    t.ea(this.onlineState), i.Oa && t.Ba(i.Oa) && this.Wa(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.hh = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r, i, o;
            return e.__generator(this, (function(e) {
                return n = t.query, r = !1, (i = this.qa.get(n)) && (o = i.Ma.indexOf(t)) >= 0 && (i.Ma.splice(o, 1), 
                r = 0 === i.Ma.length), r ? [ 2 /*return*/ , (this.qa.delete(n), this.uh.hh(n)) ] : [ 2 /*return*/ ];
            }));
        }));
    }, t.prototype.lo = function(t) {
        for (var e = !1, n = 0, r = t; n < r.length; n++) {
            var i = r[n], o = i.query, s = this.qa.get(o);
            if (s) {
                for (var u = 0, a = s.Ma; u < a.length; u++) {
                    a[u].Ba(i) && (e = !0);
                }
                s.Oa = i;
            }
        }
        e && this.Wa();
    }, t.prototype.Na = function(t, e) {
        var n = this.qa.get(t);
        if (n) for (var r = 0, i = n.Ma; r < i.length; r++) {
            i[r].onError(e);
        }
        // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
        // after an error.
                this.qa.delete(t);
    }, t.prototype.va = function(t) {
        this.onlineState = t;
        var e = !1;
        this.qa.forEach((function(n, r) {
            for (var i = 0, o = r.Ma; i < o.length; i++) {
                // Run global snapshot listeners if a consistent snapshot has been emitted.
                o[i].ea(t) && (e = !0);
            }
        })), e && this.Wa();
    }, t.prototype.Qa = function(t) {
        this.Ua.add(t), 
        // Immediately fire an initial event, indicating all existing listeners
        // are in-sync.
        t.next();
    }, t.prototype.ja = function(t) {
        this.Ua.delete(t);
    }, 
    // Call all global snapshot listeners that have been set.
    t.prototype.Wa = function() {
        this.Ua.forEach((function(t) {
            t.next();
        }));
    }, t;
}(), pr = /** @class */ function() {
    function t(t, e, n) {
        this.query = t, this.Ga = e, 
        /**
             * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
             * observer. This flag is set to true once we've actually raised an event.
             */
        this.Ka = !1, this.za = null, this.onlineState = "Unknown" /* Unknown */ , this.options = n || {}
        /**
     * Applies the new ViewSnapshot to this listener, raising a user-facing event
     * if applicable (depending on what changed, whether the user has opted into
     * metadata-only changes, etc.). Returns true if a user-facing event was
     * indeed raised.
     */;
    }
    return t.prototype.Ba = function(t) {
        if (!this.options.includeMetadataChanges) {
            for (
            // Remove the metadata only changes.
            var e = [], n = 0, r = t.docChanges; n < r.length; n++) {
                var i = r[n];
                3 /* Metadata */ !== i.type && e.push(i);
            }
            t = new lt(t.query, t.docs, t.Ot, e, t.Mt, t.fromCache, t.qt, 
            /* excludesMetadataChanges= */ !0);
        }
        var o = !1;
        return this.Ka ? this.Ha(t) && (this.Ga.next(t), o = !0) : this.Ya(t, this.onlineState) && (this.Xa(t), 
        o = !0), this.za = t, o;
    }, t.prototype.onError = function(t) {
        this.Ga.error(t);
    }, 
    /** Returns whether a snapshot was raised. */ t.prototype.ea = function(t) {
        this.onlineState = t;
        var e = !1;
        return this.za && !this.Ka && this.Ya(this.za, t) && (this.Xa(this.za), e = !0), 
        e;
    }, t.prototype.Ya = function(t, e) {
        // Always raise the first event when we're synced
        if (!t.fromCache) return !0;
        // NOTE: We consider OnlineState.Unknown as online (it should become Offline
        // or Online if we wait long enough).
                var n = "Offline" /* Offline */ !== e;
        // Don't raise the event if we're online, aren't synced yet (checked
        // above) and are waiting for a sync.
                return !(this.options.Ja && n || t.docs._() && "Offline" /* Offline */ !== e);
        // Raise data from cache if we have any documents or we are offline
        }, t.prototype.Ha = function(t) {
        // We don't need to handle includeDocumentMetadataChanges here because
        // the Metadata only changes have already been stripped out if needed.
        // At this point the only changes we will see are the ones we should
        // propagate.
        if (t.docChanges.length > 0) return !0;
        var e = this.za && this.za.hasPendingWrites !== t.hasPendingWrites;
        return !(!t.qt && !e) && !0 === this.options.includeMetadataChanges;
        // Generally we should have hit one of the cases above, but it's possible
        // to get here if there were only metadata docChanges and they got
        // stripped out.
        }, t.prototype.Xa = function(t) {
        t = lt.Bt(t.query, t.docs, t.Mt, t.fromCache), this.Ka = !0, this.Ga.next(t);
    }, t;
}(), dr = /** @class */ function() {
    function t() {}
    return t.prototype.Pi = function(t) {
        this.Za = t;
    }, t.prototype.Wn = function(t, e, n, i) {
        var o = this;
        // Queries that match all documents don't benefit from using
        // IndexFreeQueries. It is more efficient to scan all documents in a
        // collection, rather than to perform individual lookups.
                return e.on() || n.isEqual(L.min()) ? this.tu(t, e) : this.Za.qn(t, i).next((function(s) {
            var u = o.eu(e, s);
            return (e.hn() || e.an()) && o.Yh(e.en, u, i, n) ? o.tu(t, e) : (a() <= r.LogLevel.DEBUG && c("IndexFreeQueryEngine", "Re-using previous result from %s to execute query: %s", n.toString(), on(e)), 
            o.Za.Wn(t, e, n).next((function(t) {
                // We merge `previousResults` into `updateResults`, since
                // `updateResults` is already a DocumentMap. If a document is
                // contained in both lists, then its contents are the same.
                return u.forEach((function(e) {
                    t = t.nt(e.key, e);
                })), t;
            })));
        }));
        // Queries that have never seen a snapshot without limbo free documents
        // should also be run as a full collection scan.
        }, 
    /** Applies the query filter and sorting to the provided documents.  */ t.prototype.eu = function(t, e) {
        // Sort the documents and re-apply the query filter since previously
        // matching documents do not necessarily still match the query.
        var n = new J(un(t));
        return e.forEach((function(e, r) {
            r instanceof ze && sn(t, r) && (n = n.add(r));
        })), n;
    }, 
    /**
     * Determines if a limit query needs to be refilled from cache, making it
     * ineligible for index-free execution.
     *
     * @param sortedPreviousResults The documents that matched the query when it
     * was last synchronized, sorted by the query's comparator.
     * @param remoteKeys The document keys that matched the query at the last
     * snapshot.
     * @param limboFreeSnapshotVersion The version of the snapshot when the query
     * was last synchronized.
     */
    t.prototype.Yh = function(t, e, n, r) {
        // The query needs to be refilled if a previously matching document no
        // longer matches.
        if (n.size !== e.size) return !0;
        // Limit queries are not eligible for index-free query execution if there is
        // a potential that an older document from cache now sorts before a document
        // that was previously part of the limit. This, however, can only happen if
        // the document at the edge of the limit goes out of limit.
        // If a document that is not the limit boundary sorts differently,
        // the boundary of the limit itself did not change and documents from cache
        // will continue to be "rejected" by this boundary. Therefore, we can ignore
        // any modifications that don't affect the last document.
                var i = "F" /* First */ === t ? e.last() : e.first();
        return !!i && (i.hasPendingWrites || i.version.o(r) > 0);
    }, t.prototype.tu = function(t, e) {
        return a() <= r.LogLevel.DEBUG && c("IndexFreeQueryEngine", "Using full collection scan to execute query:", on(e)), 
        this.Za.Wn(t, e, L.min());
    }, t;
}(), yr = /** @class */ function() {
    function t(t, e) {
        this.$n = t, this.Yi = e, 
        /**
             * The set of all mutations that have been sent but not yet been applied to
             * the backend.
             */
        this.Nn = [], 
        /** Next value to use when assigning sequential IDs to each mutation batch. */
        this.nu = 1, 
        /** An ordered mapping between documents and the mutations batch IDs. */
        this.su = new J(zn.mr);
    }
    return t.prototype.iu = function(t) {
        return Tn.resolve(0 === this.Nn.length);
    }, t.prototype.Si = function(t, e, n, r) {
        var i = this.nu;
        this.nu++, this.Nn.length > 0 && this.Nn[this.Nn.length - 1];
        var o = new Nn(i, e, n, r);
        this.Nn.push(o);
        // Track references by document key and index collection parents.
        for (var s = 0, u = r; s < u.length; s++) {
            var a = u[s];
            this.su = this.su.add(new zn(a.key, i)), this.$n.hi(t, a.key.path.g());
        }
        return Tn.resolve(o);
    }, t.prototype.Li = function(t, e) {
        return Tn.resolve(this.ru(e));
    }, t.prototype.sr = function(t, e) {
        var n = e + 1, r = this.ou(n), i = r < 0 ? 0 : r;
        // The requested batchId may still be out of range so normalize it to the
        // start of the queue.
                return Tn.resolve(this.Nn.length > i ? this.Nn[i] : null);
    }, t.prototype.Mi = function() {
        return Tn.resolve(0 === this.Nn.length ? -1 : this.nu - 1);
    }, t.prototype.yi = function(t) {
        return Tn.resolve(this.Nn.slice());
    }, t.prototype.xn = function(t, e) {
        var n = this, r = new zn(e, 0), i = new zn(e, Number.POSITIVE_INFINITY), o = [];
        return this.su.bt([ r, i ], (function(t) {
            var e = n.ru(t.vr);
            o.push(e);
        })), Tn.resolve(o);
    }, t.prototype.Bn = function(t, e) {
        var n = this, r = new J(m);
        return e.forEach((function(t) {
            var e = new zn(t, 0), i = new zn(t, Number.POSITIVE_INFINITY);
            n.su.bt([ e, i ], (function(t) {
                r = r.add(t.vr);
            }));
        })), Tn.resolve(this.hu(r));
    }, t.prototype.zn = function(t, e) {
        // Use the query path as a prefix for testing if a document matches the
        // query.
        var n = e.path, r = n.length + 1, i = n;
        // Construct a document reference for actually scanning the index. Unlike
        // the prefix the document key in this reference must have an even number of
        // segments. The empty segment can be used a suffix of the query path
        // because it precedes all other segments in an ordered traversal.
                U.W(i) || (i = i.child(""));
        var o = new zn(new U(i), 0), s = new J(m);
        // Find unique batchIDs referenced by all documents potentially matching the
        // query.
                return this.su.St((function(t) {
            var e = t.key.path;
            return !!n.C(e) && (
            // Rows with document keys more than one segment longer than the query
            // path can't be matches. For example, a query on 'rooms' can't match
            // the document /rooms/abc/messages/xyx.
            // TODO(mcg): we'll need a different scanner when we implement
            // ancestor queries.
            e.length === r && (s = s.add(t.vr)), !0);
        }), o), Tn.resolve(this.hu(s));
    }, t.prototype.hu = function(t) {
        var e = this, n = [];
        // Construct an array of matching batches, sorted by batchID to ensure that
        // multiple mutations affecting the same document key are applied in order.
                return t.forEach((function(t) {
            var r = e.ru(t);
            null !== r && n.push(r);
        })), n;
    }, t.prototype.Oi = function(t, e) {
        var n = this;
        d(0 === this.au(e.batchId, "removed")), this.Nn.shift();
        var r = this.su;
        return Tn.forEach(e.mutations, (function(i) {
            var o = new zn(i.key, e.batchId);
            return r = r.delete(o), n.Yi.uu(t, i.key);
        })).next((function() {
            n.su = r;
        }));
    }, t.prototype.cu = function(t) {
        // No-op since the memory mutation queue does not maintain a separate cache.
    }, t.prototype.gr = function(t, e) {
        var n = new zn(e, 0), r = this.su.Ct(n);
        return Tn.resolve(e.isEqual(r && r.key));
    }, t.prototype.ki = function(t) {
        return this.Nn.length, Tn.resolve();
    }, 
    /**
     * Finds the index of the given batchId in the mutation queue and asserts that
     * the resulting index is within the bounds of the queue.
     *
     * @param batchId The batchId to search for
     * @param action A description of what the caller is doing, phrased in passive
     * form (e.g. "acknowledged" in a routine that acknowledges batches).
     */
    t.prototype.au = function(t, e) {
        return this.ou(t);
    }, 
    /**
     * Finds the index of the given batchId in the mutation queue. This operation
     * is O(1).
     *
     * @return The computed index of the batch with the given batchId, based on
     * the state of the queue. Note this index can be negative if the requested
     * batchId has already been remvoed from the queue or past the end of the
     * queue if the batchId is larger than the last added batch.
     */
    t.prototype.ou = function(t) {
        return 0 === this.Nn.length ? 0 : t - this.Nn[0].batchId;
        // Examine the front of the queue to figure out the difference between the
        // batchId and indexes in the array. Note that since the queue is ordered
        // by batchId, if the first batch has a larger batchId then the requested
        // batchId doesn't exist in the queue.
        }, 
    /**
     * A version of lookupMutationBatch that doesn't return a promise, this makes
     * other functions that uses this code easier to read and more efficent.
     */
    t.prototype.ru = function(t) {
        var e = this.ou(t);
        return e < 0 || e >= this.Nn.length ? null : this.Nn[e];
    }, t;
}(), vr = /** @class */ function() {
    /**
     * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
     * return 0 to avoid unnecessarily doing the work of calculating the size.
     */
    function t(t, e) {
        this.$n = t, this.lu = e, 
        /** Underlying cache of documents and their read times. */
        this.docs = new H(U.P), 
        /** Size of all cached documents. */
        this.size = 0
        /**
     * Adds the supplied entry to the cache and updates the cache size as appropriate.
     *
     * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */;
    }
    return t.prototype.zi = function(t, e, n) {
        var r = e.key, i = this.docs.get(r), o = i ? i.size : 0, s = this.lu(e);
        return this.docs = this.docs.nt(r, {
            _u: e,
            size: s,
            readTime: n
        }), this.size += s - o, this.$n.hi(t, r.path.g());
    }, 
    /**
     * Removes the specified entry from the cache and updates the cache size as appropriate.
     *
     * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */
    t.prototype.Ki = function(t) {
        var e = this.docs.get(t);
        e && (this.docs = this.docs.remove(t), this.size -= e.size);
    }, t.prototype.On = function(t, e) {
        var n = this.docs.get(e);
        return Tn.resolve(n ? n._u : null);
    }, t.prototype.getEntries = function(t, e) {
        var n = this, r = nt();
        return e.forEach((function(t) {
            var e = n.docs.get(t);
            r = r.nt(t, e ? e._u : null);
        })), Tn.resolve(r);
    }, t.prototype.Wn = function(t, e, n) {
        for (var r = it(), i = new U(e.path.child("")), o = this.docs.ut(i)
        // Documents are ordered by key, so we can use a prefix scan to narrow down
        // the documents we need to match the query against.
        ; o.wt(); ) {
            var s = o.dt(), u = s.key, a = s.value, c = a._u, h = a.readTime;
            if (!e.path.C(u.path)) break;
            h.o(n) <= 0 || c instanceof ze && sn(e, c) && (r = r.nt(c.key, c));
        }
        return Tn.resolve(r);
    }, t.prototype.fu = function(t, e) {
        return Tn.forEach(this.docs, (function(t) {
            return e(t);
        }));
    }, t.prototype.Fi = function(e) {
        // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
        // a separate changelog and does not need special handling for removals.
        return new t.du(this);
    }, t.prototype.wu = function(t) {
        return Tn.resolve(this.size);
    }, t;
}();

/** A CredentialsProvider that always yields an empty token. */
/**
 * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
 */
vr.du = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this) || this).Au = e, n;
    }
    return e.__extends(n, t), n.prototype.Xh = function(t) {
        var e = this, n = [];
        return this.Ci.forEach((function(r, i) {
            i ? n.push(e.Au.zi(t, i, e.readTime)) : e.Au.Ki(r);
        })), Tn.Cn(n);
    }, n.prototype.Iu = function(t, e) {
        return this.Au.On(t, e);
    }, n.prototype.Ru = function(t, e) {
        return this.Au.getEntries(t, e);
    }, n;
}(/** @class */ function() {
    function t() {
        // A mapping of document key to the new cache entry that should be written (or null if any
        // existing cache entry should be removed).
        this.Ci = new A((function(t) {
            return t.toString();
        }), (function(t, e) {
            return t.isEqual(e);
        })), this.Tu = !1;
    }
    return Object.defineProperty(t.prototype, "readTime", {
        get: function() {
            return this.mu;
        },
        set: function(t) {
            this.mu = t;
        },
        enumerable: !1,
        configurable: !0
    }), 
    /**
     * Buffers a `RemoteDocumentCache.addEntry()` call.
     *
     * You can only modify documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */
    t.prototype.zi = function(t, e) {
        this.Eu(), this.readTime = e, this.Ci.set(t.key, t);
    }, 
    /**
     * Buffers a `RemoteDocumentCache.removeEntry()` call.
     *
     * You can only remove documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */
    t.prototype.Ki = function(t, e) {
        this.Eu(), e && (this.readTime = e), this.Ci.set(t, null);
    }, 
    /**
     * Looks up an entry in the cache. The buffered changes will first be checked,
     * and if no buffered change applies, this will forward to
     * `RemoteDocumentCache.getEntry()`.
     *
     * @param transaction The transaction in which to perform any persistence
     *     operations.
     * @param documentKey The key of the entry to look up.
     * @return The cached Document or NoDocument entry, or null if we have nothing
     * cached.
     */
    t.prototype.On = function(t, e) {
        this.Eu();
        var n = this.Ci.get(e);
        return void 0 !== n ? Tn.resolve(n) : this.Iu(t, e);
    }, 
    /**
     * Looks up several entries in the cache, forwarding to
     * `RemoteDocumentCache.getEntry()`.
     *
     * @param transaction The transaction in which to perform any persistence
     *     operations.
     * @param documentKeys The keys of the entries to look up.
     * @return A map of cached `Document`s or `NoDocument`s, indexed by key. If an
     *     entry cannot be found, the corresponding key will be mapped to a null
     *     value.
     */
    t.prototype.getEntries = function(t, e) {
        return this.Ru(t, e);
    }, 
    /**
     * Applies buffered changes to the underlying RemoteDocumentCache, using
     * the provided transaction.
     */
    t.prototype.apply = function(t) {
        return this.Eu(), this.Tu = !0, this.Xh(t);
    }, 
    /** Helper to assert this.changes is not null  */ t.prototype.Eu = function() {}, 
    t;
}());

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
var gr = /** @class */ function() {
    function t(t) {
        this.persistence = t, 
        /**
             * Maps a target to the data about that target
             */
        this.Pu = new A((function(t) {
            return q(t);
        }), j), 
        /** The last received snapshot version. */
        this.lastRemoteSnapshotVersion = L.min(), 
        /** The highest numbered target ID encountered. */
        this.highestTargetId = 0, 
        /** The highest sequence number encountered. */
        this.Vu = 0, 
        /**
             * A ordered bidirectional mapping between documents and the remote target
             * IDs.
             */
        this.yu = new Bn, this.targetCount = 0, this.pu = jn.ui();
    }
    return t.prototype.ge = function(t, e) {
        return this.Pu.forEach((function(t, n) {
            return e(n);
        })), Tn.resolve();
    }, t.prototype.qi = function(t) {
        return Tn.resolve(this.lastRemoteSnapshotVersion);
    }, t.prototype.gu = function(t) {
        return Tn.resolve(this.Vu);
    }, t.prototype.hr = function(t) {
        return this.highestTargetId = this.pu.next(), Tn.resolve(this.highestTargetId);
    }, t.prototype.Xi = function(t, e, n) {
        return n && (this.lastRemoteSnapshotVersion = n), e > this.Vu && (this.Vu = e), 
        Tn.resolve();
    }, t.prototype.vu = function(t) {
        this.Pu.set(t.target, t);
        var e = t.targetId;
        e > this.highestTargetId && (this.pu = new jn(e), this.highestTargetId = e), t.sequenceNumber > this.Vu && (this.Vu = t.sequenceNumber);
    }, t.prototype.ar = function(t, e) {
        return this.vu(e), this.targetCount += 1, Tn.resolve();
    }, t.prototype.Gi = function(t, e) {
        return this.vu(e), Tn.resolve();
    }, t.prototype.bu = function(t, e) {
        return this.Pu.delete(e.target), this.yu.Vr(e.targetId), this.targetCount -= 1, 
        Tn.resolve();
    }, t.prototype.Su = function(t, e, n) {
        var r = this, i = 0, o = [];
        return this.Pu.forEach((function(s, u) {
            u.sequenceNumber <= e && null === n.get(u.targetId) && (r.Pu.delete(s), o.push(r.Cu(t, u.targetId)), 
            i++);
        })), Tn.Cn(o).next((function() {
            return i;
        }));
    }, t.prototype.Du = function(t) {
        return Tn.resolve(this.targetCount);
    }, t.prototype.or = function(t, e) {
        var n = this.Pu.get(e) || null;
        return Tn.resolve(n);
    }, t.prototype.Wi = function(t, e, n) {
        return this.yu.Rr(e, n), Tn.resolve();
    }, t.prototype.Bi = function(t, e, n) {
        this.yu.Pr(e, n);
        var r = this.persistence.Yi, i = [];
        return r && e.forEach((function(e) {
            i.push(r.uu(t, e));
        })), Tn.Cn(i);
    }, t.prototype.Cu = function(t, e) {
        return this.yu.Vr(e), Tn.resolve();
    }, t.prototype.lr = function(t, e) {
        var n = this.yu.pr(e);
        return Tn.resolve(n);
    }, t.prototype.gr = function(t, e) {
        return Tn.resolve(this.yu.gr(e));
    }, t;
}(), mr = /** @class */ function() {
    /**
     * The constructor accepts a factory for creating a reference delegate. This
     * allows both the delegate and this instance to have strong references to
     * each other without having nullable fields that would then need to be
     * checked or asserted on every access.
     */
    function t(t) {
        var e = this;
        this.Fu = {}, this.Nu = new Ln(0), this.$u = !1, this.$u = !0, this.Yi = t(this), 
        this.Ei = new gr(this), this.$n = new xn, this.Fn = new vr(this.$n, (function(t) {
            return e.Yi.ku(t);
        }));
    }
    return t.prototype.start = function() {
        return Promise.resolve();
    }, t.prototype.rh = function() {
        // No durable state to ensure is closed on shutdown.
        return this.$u = !1, Promise.resolve();
    }, Object.defineProperty(t.prototype, "xu", {
        get: function() {
            return this.$u;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.Lu = function() {
        // No op.
    }, t.prototype.Ou = function() {
        // No op.
    }, t.prototype.Ai = function() {
        return this.$n;
    }, t.prototype.wi = function(t) {
        var e = this.Fu[t.Sr()];
        return e || (e = new yr(this.$n, this.Yi), this.Fu[t.Sr()] = e), e;
    }, t.prototype.Ii = function() {
        return this.Ei;
    }, t.prototype.mi = function() {
        return this.Fn;
    }, t.prototype.runTransaction = function(t, e, n) {
        var r = this;
        c("MemoryPersistence", "Starting transaction:", t);
        var i = new wr(this.Nu.next());
        return this.Yi.Mu(), n(i).next((function(t) {
            return r.Yi.qu(i).next((function() {
                return t;
            }));
        })).bn().then((function(t) {
            return i.Uu(), t;
        }));
    }, t.prototype.Bu = function(t, e) {
        return Tn.Dn(Object.values(this.Fu).map((function(n) {
            return function() {
                return n.gr(t, e);
            };
        })));
    }, t;
}(), wr = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this) || this).Qi = e, n;
    }
    /**
     * A base class representing a persistence transaction, encapsulating both the
     * transaction's sequence numbers as well as a list of onCommitted listeners.
     *
     * When you call Persistence.runTransaction(), it will create a transaction and
     * pass it to your callback. You then pass it to any method that operates
     * on persistence.
     */
    return e.__extends(n, t), n;
}(/** @class */ function() {
    function t() {
        this.Wu = [];
    }
    return t.prototype.Qu = function(t) {
        this.Wu.push(t);
    }, t.prototype.Uu = function() {
        this.Wu.forEach((function(t) {
            return t();
        }));
    }, t;
}()), _r = /** @class */ function() {
    function t(t) {
        this.persistence = t, 
        /** Tracks all documents that are active in Query views. */
        this.ju = new Bn, 
        /** The list of documents that are potentially GCed after each transaction. */
        this.Gu = null;
    }
    return t.Ku = function(e) {
        return new t(e);
    }, Object.defineProperty(t.prototype, "zu", {
        get: function() {
            if (this.Gu) return this.Gu;
            throw p();
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.tr = function(t, e, n) {
        return this.ju.tr(n, e), this.zu.delete(n), Tn.resolve();
    }, t.prototype.er = function(t, e, n) {
        return this.ju.er(n, e), this.zu.add(n), Tn.resolve();
    }, t.prototype.uu = function(t, e) {
        return this.zu.add(e), Tn.resolve();
    }, t.prototype.removeTarget = function(t, e) {
        var n = this;
        this.ju.Vr(e.targetId).forEach((function(t) {
            return n.zu.add(t);
        }));
        var r = this.persistence.Ii();
        return r.lr(t, e.targetId).next((function(t) {
            t.forEach((function(t) {
                return n.zu.add(t);
            }));
        })).next((function() {
            return r.bu(t, e);
        }));
    }, t.prototype.Mu = function() {
        this.Gu = new Set;
    }, t.prototype.qu = function(t) {
        var e = this, n = this.persistence.mi().Fi();
        // Remove newly orphaned documents.
                return Tn.forEach(this.zu, (function(r) {
            return e.Hu(t, r).next((function(t) {
                t || n.Ki(r);
            }));
        })).next((function() {
            return e.Gu = null, n.apply(t);
        }));
    }, t.prototype.Hi = function(t, e) {
        var n = this;
        return this.Hu(t, e).next((function(t) {
            t ? n.zu.delete(e) : n.zu.add(e);
        }));
    }, t.prototype.ku = function(t) {
        // For eager GC, we don't care about the document size, there are no size thresholds.
        return 0;
    }, t.prototype.Hu = function(t, e) {
        var n = this;
        return Tn.Dn([ function() {
            return Tn.resolve(n.ju.gr(e));
        }, function() {
            return n.persistence.Ii().gr(t, e);
        }, function() {
            return n.persistence.Bu(t, e);
        } ]);
    }, t;
}(), br = /** @class */ function() {
    function t(t) {
        this.Yu = t.Yu, this.Xu = t.Xu;
    }
    return t.prototype.uo = function(t) {
        this.Ju = t;
    }, t.prototype.io = function(t) {
        this.Zu = t;
    }, t.prototype.onMessage = function(t) {
        this.tc = t;
    }, t.prototype.close = function() {
        this.Xu();
    }, t.prototype.send = function(t) {
        this.Yu(t);
    }, t.prototype.ec = function() {
        this.Ju();
    }, t.prototype.nc = function(t) {
        this.Zu(t);
    }, t.prototype.sc = function(t) {
        this.tc(t);
    }, t;
}(), Er = {
    BatchGetDocuments: "batchGet",
    Commit: "commit",
    RunQuery: "runQuery"
}, Ir = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this, e) || this).forceLongPolling = e.forceLongPolling, n;
    }
    /**
     * Base class for all Rest-based connections to the backend (WebChannel and
     * HTTP).
     */
    return e.__extends(n, t), n.prototype.uc = function(t, e, n, r) {
        return new Promise((function(i, s) {
            var u = new o.XhrIo;
            u.listenOnce(o.EventType.COMPLETE, (function() {
                try {
                    switch (u.getLastErrorCode()) {
                      case o.ErrorCode.NO_ERROR:
                        var e = u.getResponseJson();
                        c("Connection", "XHR received:", JSON.stringify(e)), i(e);
                        break;

                      case o.ErrorCode.TIMEOUT:
                        c("Connection", 'RPC "' + t + '" timed out'), s(new R(T.DEADLINE_EXCEEDED, "Request time out"));
                        break;

                      case o.ErrorCode.HTTP_ERROR:
                        var n = u.getStatus();
                        if (c("Connection", 'RPC "' + t + '" failed with status:', n, "response text:", u.getResponseText()), 
                        n > 0) {
                            var r = u.getResponseJson().error;
                            if (r && r.status && r.message) {
                                var a = function(t) {
                                    var e = t.toLowerCase().replace("_", "-");
                                    return Object.values(T).indexOf(e) >= 0 ? e : T.UNKNOWN;
                                }(r.status);
                                s(new R(a, r.message));
                            } else s(new R(T.UNKNOWN, "Server responded with status " + u.getStatus()));
                        } else 
                        // If we received an HTTP_ERROR but there's no status code,
                        // it's most probably a connection issue
                        s(new R(T.UNAVAILABLE, "Connection failed."));
                        break;

                      default:
                        p();
                    }
                } finally {
                    c("Connection", 'RPC "' + t + '" completed.');
                }
            }));
            var a = JSON.stringify(r);
            u.send(e, "POST", a, n, 15);
        }));
    }, n.prototype.co = function(t, e) {
        var n = [ this.rc, "/", "google.firestore.v1.Firestore", "/", t, "/channel" ], r = o.createWebChannelTransport(), s = {
            // Required for backend stickiness, routing behavior is based on this
            // parameter.
            httpSessionIdParam: "gsessionid",
            initMessageHeaders: {},
            messageUrlParams: {
                // This param is used to improve routing and project isolation by the
                // backend and must be included in every request.
                database: "projects/" + this.s.projectId + "/databases/" + this.s.database
            },
            sendRawJson: !0,
            supportsCrossDomainXhr: !0,
            internalChannelParams: {
                // Override the default timeout (randomized between 10-20 seconds) since
                // a large write batch on a slow internet connection may take a long
                // time to send to the backend. Rather than have WebChannel impose a
                // tight timeout which could lead to infinite timeouts and retries, we
                // set it very large (5-10 minutes) and rely on the browser's builtin
                // timeouts to kick in if the request isn't working.
                forwardChannelRequestTimeoutMs: 6e5
            },
            forceLongPolling: this.forceLongPolling
        };
        this.ac(s.initMessageHeaders, e), 
        // Sending the custom headers we just added to request.initMessageHeaders
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
        i.isMobileCordova() || i.isReactNative() || i.isElectron() || i.isIE() || i.isUWP() || i.isBrowserExtension() || (s.httpHeadersOverwriteParam = "$httpHeaders");
        var u = n.join("");
        c("Connection", "Creating WebChannel: " + u, s);
        var a = r.createWebChannel(u, s), h = !1, l = !1, p = new br({
            Yu: function(t) {
                l ? c("Connection", "Not sending because WebChannel is closed:", t) : (h || (c("Connection", "Opening WebChannel transport."), 
                a.open(), h = !0), c("Connection", "WebChannel sending:", t), a.send(t));
            },
            Xu: function() {
                return a.close();
            }
        }), y = function(t, e) {
            // TODO(dimond): closure typing seems broken because WebChannel does
            // not implement goog.events.Listenable
            a.listen(t, (function(t) {
                try {
                    e(t);
                } catch (t) {
                    setTimeout((function() {
                        throw t;
                    }), 0);
                }
            }));
        };
        // WebChannel supports sending the first message with the handshake - saving
        // a network round trip. However, it will have to call send in the same
        // JS event loop as open. In order to enforce this, we delay actually
        // opening the WebChannel until send is called. Whether we have called
        // open is tracked with this variable.
                // Closure events are guarded and exceptions are swallowed, so catch any
        // exception and rethrow using a setTimeout so they become visible again.
        // Note that eventually this function could go away if we are confident
        // enough the code is exception free.
        return y(o.WebChannel.EventType.OPEN, (function() {
            l || c("Connection", "WebChannel transport opened.");
        })), y(o.WebChannel.EventType.CLOSE, (function() {
            l || (l = !0, c("Connection", "WebChannel transport closed"), p.nc());
        })), y(o.WebChannel.EventType.ERROR, (function(t) {
            l || (l = !0, f("Connection", "WebChannel transport errored:", t), p.nc(new R(T.UNAVAILABLE, "The operation could not be completed")));
        })), y(o.WebChannel.EventType.MESSAGE, (function(t) {
            var e;
            if (!l) {
                var n = t.data[0];
                d(!!n);
                // TODO(b/35143891): There is a bug in One Platform that caused errors
                // (and only errors) to be wrapped in an extra array. To be forward
                // compatible with the bug we need to check either condition. The latter
                // can be removed once the fix has been rolled out.
                // Use any because msgData.error is not typed.
                var r = n, i = r.error || (null === (e = r[0]) || void 0 === e ? void 0 : e.error);
                if (i) {
                    c("Connection", "WebChannel received error:", i);
                    // error.status will be a string like 'OK' or 'NOT_FOUND'.
                    var o = i.status, s = function(t) {
                        // lookup by string
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        var e = B[t];
                        if (void 0 !== e) return $(e);
                    }(o), u = i.message;
                    void 0 === s && (s = T.INTERNAL, u = "Unknown error status: " + o + " with message " + i.message), 
                    // Mark closed so no further events are propagated
                    l = !0, p.nc(new R(s, u)), a.close();
                } else c("Connection", "WebChannel received:", n), p.sc(n);
            }
        })), setTimeout((function() {
            // Technically we could/should wait for the WebChannel opened event,
            // but because we want to send the first message with the WebChannel
            // handshake we pretend the channel opened here (asynchronously), and
            // then delay the actual open until the first message is sent.
            p.ec();
        }), 0), p;
    }, n;
}(/** @class */ function() {
    function t(t) {
        this.ic = t, this.s = t.s;
        var e = t.ssl ? "https" : "http";
        this.rc = e + "://" + t.host, this.oc = "projects/" + this.s.projectId + "/databases/" + this.s.database + "/documents";
    }
    return t.prototype.Po = function(t, e, n, r) {
        var i = this.hc(t, e);
        c("RestConnection", "Sending: ", i, n);
        var o = {};
        return this.ac(o, r), this.uc(t, i, o, n).then((function(t) {
            return c("RestConnection", "Received: ", t), t;
        }), (function(e) {
            throw f("RestConnection", t + " failed with error: ", e, "url: ", i, "request:", n), 
            e;
        }));
    }, t.prototype.Vo = function(t, e, n, r) {
        // The REST API automatically aggregates all of the streamed results, so we
        // can just use the normal invoke() method.
        return this.Po(t, e, n, r);
    }, 
    /**
     * Modifies the headers for a request, adding any authorization token if
     * present and any additional headers for the request.
     */
    t.prototype.ac = function(t, e) {
        if (t["X-Goog-Api-Client"] = "gl-js/ fire/7.17.2", 
        // Content-Type: text/plain will avoid preflight requests which might
        // mess with CORS and redirects by proxies. If we add custom headers
        // we will need to change this code to potentially use the $httpOverwrite
        // parameter supported by ESF to avoid	triggering preflight requests.
        t["Content-Type"] = "text/plain", e) for (var n in e.Fr) e.Fr.hasOwnProperty(n) && (t[n] = e.Fr[n]);
    }, t.prototype.hc = function(t, e) {
        var n = Er[t];
        return this.rc + "/v1/" + e + ":" + n;
    }, t;
}()), Nr = /** @class */ function() {
    function t() {
        var t = this;
        this.cc = function() {
            return t.lc();
        }, this._c = function() {
            return t.fc();
        }, this.dc = [], this.wc();
    }
    return t.prototype.Uo = function(t) {
        this.dc.push(t);
    }, t.prototype.rh = function() {
        window.removeEventListener("online", this.cc), window.removeEventListener("offline", this._c);
    }, t.prototype.wc = function() {
        window.addEventListener("online", this.cc), window.addEventListener("offline", this._c);
    }, t.prototype.lc = function() {
        c("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
        for (var t = 0, e = this.dc; t < e.length; t++) {
            (0, e[t])(0 /* AVAILABLE */);
        }
    }, t.prototype.fc = function() {
        c("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
        for (var t = 0, e = this.dc; t < e.length; t++) {
            (0, e[t])(1 /* UNAVAILABLE */);
        }
    }, 
    // TODO(chenbrian): Consider passing in window either into this component or
    // here for testing via FakeWindow.
    /** Checks that all used attributes of window are available. */
    t.Tc = function() {
        return "undefined" != typeof window && void 0 !== window.addEventListener && void 0 !== window.removeEventListener;
    }, t;
}(), Ar = /** @class */ function() {
    function t() {}
    return t.prototype.Uo = function(t) {
        // No-op.
    }, t.prototype.rh = function() {
        // No-op.
    }, t;
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
 * A memory-backed instance of Persistence. Data is stored only in RAM and
 * not persisted across sessions.
 */
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
/** Initializes the WebChannelConnection for the browser. */
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
function Tr(t) {
    return new Ft(t, /* useProto3Json= */ !0);
}

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
 */ var Rr = "You are using the memory-only build of Firestore. Persistence support is only available via the @firebase/firestore bundle or the firebase-firestore.js build.", Dr = /** @class */ function() {
    function t() {}
    return t.prototype.initialize = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.ha = this.mc(t), this.persistence = this.Ec(t), [ 4 /*yield*/ , this.persistence.start() ];

                  case 1:
                    return e.sent(), this.Ic = this.Rc(t), this.$o = this.Ac(t), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Rc = function(t) {
        return null;
    }, t.prototype.Ac = function(t) {
        /** Manages our in-memory or durable persistence. */
        return e = this.persistence, n = new dr, r = t.Pc, new Gn(e, n, r);
        var e, n, r;
    }, t.prototype.Ec = function(t) {
        if (t.yc.Vc) throw new R(T.FAILED_PRECONDITION, Rr);
        return new mr(_r.Ku);
    }, t.prototype.mc = function(t) {
        return new ir;
    }, t.prototype.terminate = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return this.Ic && this.Ic.stop(), [ 4 /*yield*/ , this.ha.rh() ];

                  case 1:
                    return t.sent(), [ 4 /*yield*/ , this.persistence.rh() ];

                  case 2:
                    return t.sent(), [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.clearPersistence = function(t, e) {
        throw new R(T.FAILED_PRECONDITION, Rr);
    }, t;
}(), Lr = /** @class */ function() {
    function t() {}
    return t.prototype.initialize = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var r = this;
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.$o ? [ 3 /*break*/ , 3 ] : (this.$o = t.$o, this.ha = t.ha, this.ko = this.pc(n), 
                    this.oa = this.gc(n), this.uh = this.vc(n), this.bc = this.Sc(n), this.ha.yo = function(t) {
                        return r.uh.ea(t, 1 /* SharedClientState */);
                    }, this.oa.uh = this.uh, [ 4 /*yield*/ , this.oa.start() ]);

                  case 1:
                    return e.sent(), [ 4 /*yield*/ , this.oa.ph(this.uh.Ra) ];

                  case 2:
                    e.sent(), e.label = 3;

                  case 3:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.Sc = function(t) {
        return new lr(this.uh);
    }, t.prototype.pc = function(t) {
        var e, n = Tr(t.ic.s), r = (e = t.ic, new Ir(e));
        /** Return the Platform-specific connectivity monitor. */ return function(t, e, n) {
            return new tr(t, e, n);
        }(t.credentials, r, n);
    }, t.prototype.gc = function(t) {
        var e = this;
        return new nr(this.$o, this.ko, t.Is, (function(t) {
            return e.uh.ea(t, 0 /* RemoteStore */);
        }), Nr.Tc() ? new Nr : new Ar);
    }, t.prototype.vc = function(t) {
        return function(t, e, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        r, i, o, s) {
            var u = new hr(t, e, n, r, i, o);
            return s && (u.Ia = !0), u;
        }(this.$o, this.oa, this.ko, this.ha, t.Pc, t.aa, !t.yc.Vc || !t.yc.synchronizeTabs);
    }, t.prototype.terminate = function() {
        return this.oa.rh();
    }, t;
}();

/**
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */
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
function kr(t) {
    /**
 * Returns true if obj is an object and contains at least one of the specified
 * methods.
 */
    return function(t, e) {
        if ("object" != typeof t || null === t) return !1;
        for (var n = t, r = 0, i = [ "next", "error", "complete" ]; r < i.length; r++) {
            var o = i[r];
            if (o in n && "function" == typeof n[o]) return !0;
        }
        return !1;
    }(t);
}

var Or = /** @class */ function() {
    function t(t) {
        this.observer = t, 
        /**
             * When set to true, will not raise future events. Necessary to deal with
             * async detachment of listener.
             */
        this.muted = !1;
    }
    return t.prototype.next = function(t) {
        this.observer.next && this.Cc(this.observer.next, t);
    }, t.prototype.error = function(t) {
        this.observer.error ? this.Cc(this.observer.error, t) : console.error("Uncaught Error in snapshot listener:", t);
    }, t.prototype.Dc = function() {
        this.muted = !0;
    }, t.prototype.Cc = function(t, e) {
        var n = this;
        this.muted || setTimeout((function() {
            n.muted || t(e);
        }), 0);
    }, t;
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
 * Validates that no arguments were passed in the invocation of functionName.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateNoArgs('myFunction', arguments);
 */ function Pr(t, e) {
    if (0 !== e.length) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() does not support arguments, but was called with " + Yr(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has the exact number of arguments.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateExactNumberOfArgs('myFunction', arguments, 2);
 */ function Vr(t, e, n) {
    if (e.length !== n) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires " + Yr(n, "argument") + ", but was called with " + Yr(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */ function Ur(t, e, n) {
    if (e.length < n) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires at least " + Yr(n, "argument") + ", but was called with " + Yr(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has number of arguments between
 * the values provided.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
 */ function Sr(t, e, n, r) {
    if (e.length < n || e.length > r) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires between " + n + " and " + r + " arguments, but was called with " + Yr(e.length, "argument") + ".");
}

/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */ function Mr(t, e, n, r) {
    Fr(t, e, Hr(n) + " argument", r);
}

/**
 * Validates the provided argument has the native JavaScript type using
 * typeof checks or is undefined.
 */ function Cr(t, e, n, r) {
    void 0 !== r && Mr(t, e, n, r);
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks.
 */ function xr(t, e, n, r) {
    Fr(t, e, n + " option", r);
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks or is undefined.
 */ function qr(t, e, n, r) {
    void 0 !== r && xr(t, e, n, r);
}

/**
 * Validates that the provided named option equals one of the expected values.
 */
/**
 * Validates that the provided named option equals one of the expected values or
 * is undefined.
 */
function jr(t, e, n, r, i) {
    void 0 !== r && function(t, e, n, r, i) {
        for (var o = [], s = 0, u = i; s < u.length; s++) {
            var a = u[s];
            if (a === r) return;
            o.push(zr(a));
        }
        var c = zr(r);
        throw new R(T.INVALID_ARGUMENT, "Invalid value " + c + " provided to function " + t + '() for option "' + n + '". Acceptable values: ' + o.join(", "));
    }(t, 0, n, r, i);
}

/**
 * Validates that the provided argument is a valid enum.
 *
 * @param functionName Function making the validation call.
 * @param enums Array containing all possible values for the enum.
 * @param position Position of the argument in `functionName`.
 * @param argument Argument to validate.
 * @return The value as T if the argument can be converted.
 */ function Gr(t, e, n, r) {
    if (!e.some((function(t) {
        return t === r;
    }))) throw new R(T.INVALID_ARGUMENT, "Invalid value " + zr(r) + " provided to function " + t + "() for its " + Hr(n) + " argument. Acceptable values: " + e.join(", "));
    return r;
}

/** Helper to validate the type of a provided input. */ function Fr(t, e, n, r) {
    if (!("object" === e ? Br(r) : "non-empty string" === e ? "string" == typeof r && "" !== r : typeof r === e)) {
        var i = zr(r);
        throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires its " + n + " to be of type " + e + ", but it was: " + i);
    }
}

/**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */ function Br(t) {
    return "object" == typeof t && null !== t && (Object.getPrototypeOf(t) === Object.prototype || null === Object.getPrototypeOf(t));
}

/** Returns a string describing the type / value of the provided input. */ function zr(t) {
    if (void 0 === t) return "undefined";
    if (null === t) return "null";
    if ("string" == typeof t) return t.length > 20 && (t = t.substring(0, 20) + "..."), 
    JSON.stringify(t);
    if ("number" == typeof t || "boolean" == typeof t) return "" + t;
    if ("object" == typeof t) {
        if (t instanceof Array) return "an array";
        var e = 
        /** Hacky method to try to get the constructor name for an object. */
        function(t) {
            if (t.constructor) {
                var e = /function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());
                if (e && e.length > 1) return e[1];
            }
            return null;
        }(t);
        return e ? "a custom " + e + " object" : "an object";
    }
    return "function" == typeof t ? "a function" : p();
}

function Wr(t, e, n) {
    if (void 0 === n) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires a valid " + Hr(e) + " argument, but it was undefined.");
}

/**
 * Validates the provided positional argument is an object, and its keys and
 * values match the expected keys and types provided in optionTypes.
 */ function Qr(t, e, n) {
    I(e, (function(e, r) {
        if (n.indexOf(e) < 0) throw new R(T.INVALID_ARGUMENT, "Unknown option '" + e + "' passed to function " + t + "(). Available options: " + n.join(", "));
    }));
}

/**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */ function Kr(t, e, n, r) {
    var i = zr(r);
    return new R(T.INVALID_ARGUMENT, "Function " + t + "() requires its " + Hr(n) + " argument to be a " + e + ", but it was: " + i);
}

function $r(t, e, n) {
    if (n <= 0) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires its " + Hr(e) + " argument to be a positive number, but it was: " + n + ".");
}

/** Converts a number to its english word representation */ function Hr(t) {
    switch (t) {
      case 1:
        return "first";

      case 2:
        return "second";

      case 3:
        return "third";

      default:
        return t + "th";
    }
}

/**
 * Formats the given word as plural conditionally given the preceding number.
 */ function Yr(t, e) {
    return t + " " + e + (1 === t ? "" : "s");
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
/** Helper function to assert Uint8Array is available at runtime. */ function Xr() {
    if ("undefined" == typeof Uint8Array) throw new R(T.UNIMPLEMENTED, "Uint8Arrays are not available in this environment.");
}

/** Helper function to assert Base64 functions are available at runtime. */ function Jr() {
    if ("undefined" == typeof atob) throw new R(T.UNIMPLEMENTED, "Blobs are unavailable in Firestore in this environment.");
}

/**
 * Immutable class holding a blob (binary data).
 * This class is directly exposed in the public API.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */ var Zr = /** @class */ function() {
    function t(t) {
        Jr(), this.Fc = t;
    }
    return t.fromBase64String = function(e) {
        Vr("Blob.fromBase64String", arguments, 1), Mr("Blob.fromBase64String", "string", 1, e), 
        Jr();
        try {
            return new t(F.fromBase64String(e));
        } catch (e) {
            throw new R(T.INVALID_ARGUMENT, "Failed to construct Blob from Base64 string: " + e);
        }
    }, t.fromUint8Array = function(e) {
        if (Vr("Blob.fromUint8Array", arguments, 1), Xr(), !(e instanceof Uint8Array)) throw Kr("Blob.fromUint8Array", "Uint8Array", 1, e);
        return new t(F.fromUint8Array(e));
    }, t.prototype.toBase64 = function() {
        return Vr("Blob.toBase64", arguments, 0), Jr(), this.Fc.toBase64();
    }, t.prototype.toUint8Array = function() {
        return Vr("Blob.toUint8Array", arguments, 0), Xr(), this.Fc.toUint8Array();
    }, t.prototype.toString = function() {
        return "Blob(base64: " + this.toBase64() + ")";
    }, t.prototype.isEqual = function(t) {
        return this.Fc.isEqual(t.Fc);
    }, t;
}(), ti = function(t) {
    !function(t, e, n, r) {
        if (!(e instanceof Array) || e.length < 1) throw new R(T.INVALID_ARGUMENT, "Function FieldPath() requires its fieldNames argument to be an array with at least " + Yr(1, "element") + ".");
    }(0, t);
    for (var e = 0; e < t.length; ++e) if (Mr("FieldPath", "string", e, t[e]), 0 === t[e].length) throw new R(T.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
    this.Nc = new V(t);
}, ei = /** @class */ function(t) {
    /**
     * Creates a FieldPath from the provided field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     *
     * @param fieldNames A list of field names.
     */
    function n() {
        for (var e = [], n = 0; n < arguments.length; n++) e[n] = arguments[n];
        return t.call(this, e) || this;
    }
    return e.__extends(n, t), n.documentId = function() {
        /**
         * Internal Note: The backend doesn't technically support querying by
         * document ID. Instead it queries by the entire document name (full path
         * included), but in the cases we currently support documentId(), the net
         * effect is the same.
         */
        return new n(V.M().N());
    }, n.prototype.isEqual = function(t) {
        if (!(t instanceof n)) throw Kr("isEqual", "FieldPath", 1, t);
        return this.Nc.isEqual(t.Nc);
    }, n;
}(ti), ni = new RegExp("[~\\*/\\[\\]]"), ri = function() {
    /** A pointer to the implementing class. */
    this.$c = this;
}, ii = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this) || this).kc = e, n;
    }
    return e.__extends(n, t), n.prototype.xc = function(t) {
        if (2 /* MergeSet */ !== t.Lc) throw 1 /* Update */ === t.Lc ? t.Oc(this.kc + "() can only appear at the top level of your update data") : t.Oc(this.kc + "() cannot be used with set() unless you pass {merge:true}");
        // No transform to add for a delete, but we need to add it to our
        // fieldMask so it gets deleted.
                return t.Me.push(t.path), null;
    }, n.prototype.isEqual = function(t) {
        return t instanceof n;
    }, n;
}(ri);

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
// The objects that are a part of this API are exposed to third-parties as
// compiled javascript so we want to flag our private members with a leading
// underscore to discourage their use.
/**
 * A field class base class that is shared by the lite, full and legacy SDK,
 * which supports shared code that deals with FieldPaths.
 */
/**
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
 */
function oi(t, e, n) {
    return new mi({
        Lc: 3 /* Argument */ ,
        Mc: e.settings.Mc,
        methodName: t.kc,
        qc: n
    }, e.s, e.serializer, e.ignoreUndefinedProperties);
}

var si = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this) || this).kc = e, n;
    }
    return e.__extends(n, t), n.prototype.xc = function(t) {
        return new Ee(t.path, new pe);
    }, n.prototype.isEqual = function(t) {
        return t instanceof n;
    }, n;
}(ri), ui = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this) || this).kc = e, r.Uc = n, r;
    }
    return e.__extends(n, t), n.prototype.xc = function(t) {
        var e = oi(this, t, 
        /*array=*/ !0), n = this.Uc.map((function(t) {
            return Ni(t, e);
        })), r = new de(n);
        return new Ee(t.path, r);
    }, n.prototype.isEqual = function(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }, n;
}(ri), ai = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this) || this).kc = e, r.Uc = n, r;
    }
    return e.__extends(n, t), n.prototype.xc = function(t) {
        var e = oi(this, t, 
        /*array=*/ !0), n = this.Uc.map((function(t) {
            return Ni(t, e);
        })), r = new ve(n);
        return new Ee(t.path, r);
    }, n.prototype.isEqual = function(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }, n;
}(ri), ci = /** @class */ function(t) {
    function n(e, n) {
        var r = this;
        return (r = t.call(this) || this).kc = e, r.Bc = n, r;
    }
    return e.__extends(n, t), n.prototype.xc = function(t) {
        var e = new me(t.serializer, Wt(t.serializer, this.Bc));
        return new Ee(t.path, e);
    }, n.prototype.isEqual = function(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }, n;
}(ri), hi = /** @class */ function(t) {
    function n() {
        return t.call(this) || this;
    }
    return e.__extends(n, t), n.delete = function() {
        return Pr("FieldValue.delete", arguments), new fi(new ii("FieldValue.delete"));
    }, n.serverTimestamp = function() {
        return Pr("FieldValue.serverTimestamp", arguments), new fi(new si("FieldValue.serverTimestamp"));
    }, n.arrayUnion = function() {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
                return Ur("FieldValue.arrayUnion", arguments, 1), new fi(new ui("FieldValue.arrayUnion", t));
    }, n.arrayRemove = function() {
        for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
                return Ur("FieldValue.arrayRemove", arguments, 1), new fi(new ai("FieldValue.arrayRemove", t));
    }, n.increment = function(t) {
        return Mr("FieldValue.increment", "number", 1, t), Vr("FieldValue.increment", arguments, 1), 
        new fi(new ci("FieldValue.increment", t));
    }, n;
}(ri), fi = /** @class */ function(t) {
    function n(e) {
        var n = this;
        return (n = t.call(this) || this).$c = e, n.kc = e.kc, n;
    }
    return e.__extends(n, t), n.prototype.xc = function(t) {
        return this.$c.xc(t);
    }, n.prototype.isEqual = function(t) {
        return t instanceof n && this.$c.isEqual(t.$c);
    }, n;
}(hi), li = /** @class */ function() {
    function t(t, e) {
        if (Vr("GeoPoint", arguments, 2), Mr("GeoPoint", "number", 1, t), Mr("GeoPoint", "number", 2, e), 
        !isFinite(t) || t < -90 || t > 90) throw new R(T.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + t);
        if (!isFinite(e) || e < -180 || e > 180) throw new R(T.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + e);
        this.Wc = t, this.Qc = e;
    }
    return Object.defineProperty(t.prototype, "latitude", {
        /**
         * Returns the latitude of this geo point, a number between -90 and 90.
         */
        get: function() {
            return this.Wc;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "longitude", {
        /**
         * Returns the longitude of this geo point, a number between -180 and 180.
         */
        get: function() {
            return this.Qc;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.isEqual = function(t) {
        return this.Wc === t.Wc && this.Qc === t.Qc;
    }, 
    /**
     * Actually private to JS consumers of our API, so this function is prefixed
     * with an underscore.
     */
    t.prototype.T = function(t) {
        return m(this.Wc, t.Wc) || m(this.Qc, t.Qc);
    }, t;
}(), pi = /^__.*__$/, di = function(t, e, n) {
    this.jc = t, this.Gc = e, this.Kc = n;
}, yi = /** @class */ function() {
    function t(t, e, n) {
        this.data = t, this.Me = e, this.fieldTransforms = n;
    }
    return t.prototype.zc = function(t, e) {
        var n = [];
        return null !== this.Me ? n.push(new Ve(t, this.data, this.Me, e)) : n.push(new Pe(t, this.data, e)), 
        this.fieldTransforms.length > 0 && n.push(new Se(t, this.fieldTransforms)), n;
    }, t;
}(), vi = /** @class */ function() {
    function t(t, e, n) {
        this.data = t, this.Me = e, this.fieldTransforms = n;
    }
    return t.prototype.zc = function(t, e) {
        var n = [ new Ve(t, this.data, this.Me, e) ];
        return this.fieldTransforms.length > 0 && n.push(new Se(t, this.fieldTransforms)), 
        n;
    }, t;
}();

function gi(t) {
    switch (t) {
      case 0 /* Set */ :
 // fall through
              case 2 /* MergeSet */ :
 // fall through
              case 1 /* Update */ :
        return !0;

      case 3 /* Argument */ :
      case 4 /* ArrayArgument */ :
        return !1;

      default:
        throw p();
    }
}

/** A "context" object passed around while parsing user data. */ var mi = /** @class */ function() {
    /**
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
     */
    function t(t, e, n, r, i, o) {
        this.settings = t, this.s = e, this.serializer = n, this.ignoreUndefinedProperties = r, 
        // Minor hack: If fieldTransforms is undefined, we assume this is an
        // external call and we need to validate the entire path.
        void 0 === i && this.Hc(), this.fieldTransforms = i || [], this.Me = o || [];
    }
    return Object.defineProperty(t.prototype, "path", {
        get: function() {
            return this.settings.path;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "Lc", {
        get: function() {
            return this.settings.Lc;
        },
        enumerable: !1,
        configurable: !0
    }), 
    /** Returns a new context with the specified settings overwritten. */ t.prototype.Yc = function(e) {
        return new t(Object.assign(Object.assign({}, this.settings), e), this.s, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.Me);
    }, t.prototype.Xc = function(t) {
        var e, n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), r = this.Yc({
            path: n,
            qc: !1
        });
        return r.Jc(t), r;
    }, t.prototype.Zc = function(t) {
        var e, n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), r = this.Yc({
            path: n,
            qc: !1
        });
        return r.Hc(), r;
    }, t.prototype.tl = function(t) {
        // TODO(b/34871131): We don't support array paths right now; so make path
        // undefined.
        return this.Yc({
            path: void 0,
            qc: !0
        });
    }, t.prototype.Oc = function(t) {
        return ki(t, this.settings.methodName, this.settings.el || !1, this.path, this.settings.Mc);
    }, 
    /** Returns 'true' if 'fieldPath' was traversed when creating this context. */ t.prototype.contains = function(t) {
        return void 0 !== this.Me.find((function(e) {
            return t.C(e);
        })) || void 0 !== this.fieldTransforms.find((function(e) {
            return t.C(e.field);
        }));
    }, t.prototype.Hc = function() {
        // TODO(b/34871131): Remove null check once we have proper paths for fields
        // within arrays.
        if (this.path) for (var t = 0; t < this.path.length; t++) this.Jc(this.path.get(t));
    }, t.prototype.Jc = function(t) {
        if (0 === t.length) throw this.Oc("Document fields must not be empty");
        if (gi(this.Lc) && pi.test(t)) throw this.Oc('Document fields cannot begin and end with "__"');
    }, t;
}(), wi = /** @class */ function() {
    function t(t, e, n) {
        this.s = t, this.ignoreUndefinedProperties = e, this.serializer = n || Tr(t)
        /** Creates a new top-level parse context. */;
    }
    return t.prototype.nl = function(t, e, n, r) {
        return void 0 === r && (r = !1), new mi({
            Lc: t,
            methodName: e,
            Mc: n,
            path: V.k(),
            qc: !1,
            el: r
        }, this.s, this.serializer, this.ignoreUndefinedProperties);
    }, t;
}();

/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */
/** Parse document data from a set() call. */ function _i(t, e, n, r, i, o) {
    void 0 === o && (o = {});
    var s = t.nl(o.merge || o.mergeFields ? 2 /* MergeSet */ : 0 /* Set */ , e, n, i);
    Ri("Data must be an object, but it was:", s, r);
    var u, a, c = Ai(r, s);
    if (o.merge) u = new be(s.Me), a = s.fieldTransforms; else if (o.mergeFields) {
        for (var h = [], f = 0, l = o.mergeFields; f < l.length; f++) {
            var d = l[f], y = void 0;
            if (d instanceof ti) y = d.Nc; else {
                if ("string" != typeof d) throw p();
                y = Li(e, d, n);
            }
            if (!s.contains(y)) throw new R(T.INVALID_ARGUMENT, "Field '" + y + "' is specified in your field mask but missing from your input data.");
            Oi(h, y) || h.push(y);
        }
        u = new be(h), a = s.fieldTransforms.filter((function(t) {
            return u.Qe(t.field);
        }));
    } else u = null, a = s.fieldTransforms;
    return new yi(new je(c), u, a);
}

/** Parse update data from an update() call. */ function bi(t, e, n, r) {
    var i = t.nl(1 /* Update */ , e, n);
    Ri("Data must be an object, but it was:", i, r);
    var o = [], s = new Ge;
    I(r, (function(t, r) {
        var u = Li(e, t, n), a = i.Zc(u);
        if (r instanceof ri && r.$c instanceof ii) 
        // Add it to the field mask, but don't add anything to updateData.
        o.push(u); else {
            var c = Ni(r, a);
            null != c && (o.push(u), s.set(u, c));
        }
    }));
    var u = new be(o);
    return new vi(s.Ke(), u, i.fieldTransforms);
}

/** Parse update data from a list of field/value arguments. */ function Ei(t, e, n, r, i, o) {
    var s = t.nl(1 /* Update */ , e, n), u = [ Di(e, r, n) ], a = [ i ];
    if (o.length % 2 != 0) throw new R(T.INVALID_ARGUMENT, "Function " + e + "() needs to be called with an even number of arguments that alternate between field names and values.");
    for (var c = 0; c < o.length; c += 2) u.push(Di(e, o[c])), a.push(o[c + 1]);
    // We iterate in reverse order to pick the last value for a field if the
    // user specified the field multiple times.
    for (var h = [], f = new Ge, l = u.length - 1; l >= 0; --l) if (!Oi(h, u[l])) {
        var p = u[l], d = a[l], y = s.Zc(p);
        if (d instanceof ri && d.$c instanceof ii) 
        // Add it to the field mask, but don't add anything to updateData.
        h.push(p); else {
            var v = Ni(d, y);
            null != v && (h.push(p), f.set(p, v));
        }
    }
    var g = new be(h);
    return new vi(f.Ke(), g, s.fieldTransforms);
}

/**
 * Parse a "query value" (e.g. value in a where filter or a value in a cursor
 * bound).
 *
 * @param allowArrays Whether the query value is an array that may directly
 * contain additional arrays (e.g. the operand of an `in` query).
 */ function Ii(t, e, n, r) {
    return void 0 === r && (r = !1), Ni(n, t.nl(r ? 4 /* ArrayArgument */ : 3 /* Argument */ , e));
}

/**
 * Parses user data to Protobuf Values.
 *
 * @param input Data to be parsed.
 * @param context A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @return The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */ function Ni(t, e) {
    if (Ti(t)) return Ri("Unsupported field value:", e, t), Ai(t, e);
    if (t instanceof ri) 
    // FieldValues usually parse into transforms (except FieldValue.delete())
    // in which case we do not want to include this field in our parsed data
    // (as doing so will overwrite the field directly prior to the transform
    // trying to transform it). So we don't add this location to
    // context.fieldMask and we return null as our parsing result.
    /**
     * "Parses" the provided FieldValueImpl, adding any necessary transforms to
     * context.fieldTransforms.
     */
    return function(t, e) {
        // Sentinels are only supported with writes, and not within arrays.
        if (!gi(e.Lc)) throw e.Oc(t.kc + "() can only be used with update() and set()");
        if (!e.path) throw e.Oc(t.kc + "() is not currently supported inside arrays");
        var n = t.xc(e);
        n && e.fieldTransforms.push(n);
    }(t, e), null;
    if (
    // If context.path is null we are inside an array and we don't support
    // field mask paths more granular than the top-level array.
    e.path && e.Me.push(e.path), t instanceof Array) {
        // TODO(b/34871131): Include the path containing the array in the error
        // message.
        // In the case of IN queries, the parsed data is an array (representing
        // the set of values to be included for the IN query) that may directly
        // contain additional arrays (each representing an individual field
        // value), so we disable this validation.
        if (e.settings.qc && 4 /* ArrayArgument */ !== e.Lc) throw e.Oc("Nested arrays are not supported");
        return function(t, e) {
            for (var n = [], r = 0, i = 0, o = t; i < o.length; i++) {
                var s = Ni(o[i], e.tl(r));
                null == s && (
                // Just include nulls in the array for fields being replaced with a
                // sentinel.
                s = {
                    nullValue: "NULL_VALUE"
                }), n.push(s), r++;
            }
            return {
                arrayValue: {
                    values: n
                }
            };
        }(t, e);
    }
    return function(t, e) {
        if (null === t) return {
            nullValue: "NULL_VALUE"
        };
        if ("number" == typeof t) return Wt(e.serializer, t);
        if ("boolean" == typeof t) return {
            booleanValue: t
        };
        if ("string" == typeof t) return {
            stringValue: t
        };
        if (t instanceof Date) {
            var n = D.fromDate(t);
            return {
                timestampValue: Qt(e.serializer, n)
            };
        }
        if (t instanceof D) {
            // Firestore backend truncates precision down to microseconds. To ensure
            // offline mode works the same with regards to truncation, perform the
            // truncation immediately without waiting for the backend to do that.
            var r = new D(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3));
            return {
                timestampValue: Qt(e.serializer, r)
            };
        }
        if (t instanceof li) return {
            geoPointValue: {
                latitude: t.latitude,
                longitude: t.longitude
            }
        };
        if (t instanceof Zr) return {
            bytesValue: Kt(e.serializer, t)
        };
        if (t instanceof di) {
            var i = e.s, o = t.jc;
            if (!o.isEqual(i)) throw e.Oc("Document reference is for database " + o.projectId + "/" + o.database + " but should be for database " + i.projectId + "/" + i.database);
            return {
                referenceValue: Yt(t.jc || e.s, t.Gc.path)
            };
        }
        if (void 0 === t && e.ignoreUndefinedProperties) return null;
        throw e.Oc("Unsupported field value: " + zr(t));
    }(t, e);
}

function Ai(t, e) {
    var n = {};
    return N(t) ? 
    // If we encounter an empty object, we explicitly add it to the update
    // mask to ensure that the server creates a map entry.
    e.path && e.path.length > 0 && e.Me.push(e.path) : I(t, (function(t, r) {
        var i = Ni(r, e.Xc(t));
        null != i && (n[t] = i);
    })), {
        mapValue: {
            fields: n
        }
    };
}

function Ti(t) {
    return !("object" != typeof t || null === t || t instanceof Array || t instanceof Date || t instanceof D || t instanceof li || t instanceof Zr || t instanceof di || t instanceof ri);
}

function Ri(t, e, n) {
    if (!Ti(n) || !Br(n)) {
        var r = zr(n);
        throw "an object" === r ? e.Oc(t + " a custom object") : e.Oc(t + " " + r);
    }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */ function Di(t, e, n) {
    if (e instanceof ti) return e.Nc;
    if ("string" == typeof e) return Li(t, e);
    throw ki("Field path arguments must be of type string or FieldPath.", t, 
    /* hasConverter= */ !1, 
    /* path= */ void 0, n);
}

/**
 * Wraps fromDotSeparatedString with an error message about the method that
 * was thrown.
 * @param methodName The publicly visible method name
 * @param path The dot-separated string form of a field path which will be split
 * on dots.
 * @param targetDoc The document against which the field path will be evaluated.
 */ function Li(t, n, r) {
    try {
        return function(t) {
            if (t.search(ni) >= 0) throw new R(T.INVALID_ARGUMENT, "Invalid field path (" + t + "). Paths must not contain '~', '*', '/', '[', or ']'");
            try {
                return new (ei.bind.apply(ei, e.__spreadArrays([ void 0 ], t.split("."))));
            } catch (e) {
                throw new R(T.INVALID_ARGUMENT, "Invalid field path (" + t + "). Paths must not be empty, begin with '.', end with '.', or contain '..'");
            }
        }(n).Nc;
    } catch (n) {
        throw ki((i = n) instanceof Error ? i.message : i.toString(), t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, r);
    }
    /**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */    var i;
    /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}

function ki(t, e, n, r, i) {
    var o = r && !r._(), s = void 0 !== i, u = "Function " + e + "() called with invalid data";
    n && (u += " (via `toFirestore()`)");
    var a = "";
    return (o || s) && (a += " (found", o && (a += " in field " + r), s && (a += " in document " + i), 
    a += ")"), new R(T.INVALID_ARGUMENT, (u += ". ") + t + a);
}

function Oi(t, e) {
    return t.some((function(t) {
        return t.isEqual(e);
    }));
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
 * Internal transaction object responsible for accumulating the mutations to
 * perform and the base versions for any documents read.
 */ var Pi = /** @class */ function() {
    function t(t) {
        this.ko = t, 
        // The version of each document that was read during this transaction.
        this.sl = new Map, this.mutations = [], this.il = !1, 
        /**
             * A deferred usage error that occurred previously in this transaction that
             * will cause the transaction to fail once it actually commits.
             */
        this.rl = null, 
        /**
             * Set of documents that have been written in the transaction.
             *
             * When there's more than one write to the same key in a transaction, any
             * writes after the first are handled differently.
             */
        this.ol = new Set;
    }
    return t.prototype.hl = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var n, r = this;
            return e.__generator(this, (function(i) {
                switch (i.label) {
                  case 0:
                    if (this.al(), this.mutations.length > 0) throw new R(T.INVALID_ARGUMENT, "Firestore transactions require all reads to be executed before all writes.");
                    return [ 4 /*yield*/ , function(t, n) {
                        return e.__awaiter(this, void 0, void 0, (function() {
                            var r, i, o, s, u, a;
                            return e.__generator(this, (function(e) {
                                switch (e.label) {
                                  case 0:
                                    return r = y(t), i = te(r.serializer) + "/documents", o = {
                                        documents: n.map((function(t) {
                                            return Xt(r.serializer, t);
                                        }))
                                    }, [ 4 /*yield*/ , r.Vo("BatchGetDocuments", i, o) ];

                                  case 1:
                                    return s = e.sent(), u = new Map, s.forEach((function(t) {
                                        var e = function(t, e) {
                                            return "found" in e ? function(t, e) {
                                                d(!!e.found), e.found.name, e.found.updateTime;
                                                var n = Jt(t, e.found.name), r = Ht(e.found.updateTime), i = new je({
                                                    mapValue: {
                                                        fields: e.found.fields
                                                    }
                                                });
                                                return new ze(n, r, i, {});
                                            }(t, e) : "missing" in e ? function(t, e) {
                                                d(!!e.missing), d(!!e.readTime);
                                                var n = Jt(t, e.missing), r = Ht(e.readTime);
                                                return new We(n, r);
                                            }(t, e) : p();
                                        }(r.serializer, t);
                                        u.set(e.key.toString(), e);
                                    })), a = [], [ 2 /*return*/ , (n.forEach((function(t) {
                                        var e = u.get(t.toString());
                                        d(!!e), a.push(e);
                                    })), a) ];
                                }
                            }));
                        }));
                    }(this.ko, t) ];

                  case 1:
                    return [ 2 /*return*/ , ((n = i.sent()).forEach((function(t) {
                        t instanceof We || t instanceof ze ? r.ul(t) : p();
                    })), n) ];
                }
            }));
        }));
    }, t.prototype.set = function(t, e) {
        this.write(e.zc(t, this.Be(t))), this.ol.add(t);
    }, t.prototype.update = function(t, e) {
        try {
            this.write(e.zc(t, this.cl(t)));
        } catch (t) {
            this.rl = t;
        }
        this.ol.add(t);
    }, t.prototype.delete = function(t) {
        this.write([ new xe(t, this.Be(t)) ]), this.ol.add(t);
    }, t.prototype.commit = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            var t, n = this;
            return e.__generator(this, (function(r) {
                switch (r.label) {
                  case 0:
                    if (this.al(), this.rl) throw this.rl;
                    return t = this.sl, 
                    // For each mutation, note that the doc was written.
                    this.mutations.forEach((function(e) {
                        t.delete(e.key.toString());
                    })), 
                    // For each document that was read but not written to, we want to perform
                    // a `verify` operation.
                    t.forEach((function(t, e) {
                        var r = new U(O.$(e));
                        n.mutations.push(new qe(r, n.Be(r)));
                    })), [ 4 /*yield*/ , function(t, n) {
                        return e.__awaiter(this, void 0, void 0, (function() {
                            var r, i, o;
                            return e.__generator(this, (function(e) {
                                switch (e.label) {
                                  case 0:
                                    return r = y(t), i = te(r.serializer) + "/documents", o = {
                                        writes: n.map((function(t) {
                                            return ne(r.serializer, t);
                                        }))
                                    }, [ 4 /*yield*/ , r.Po("Commit", i, o) ];

                                  case 1:
                                    return e.sent(), [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    }(this.ko, this.mutations) ];

                  case 1:
                    // For each mutation, note that the doc was written.
                    return r.sent(), this.il = !0, [ 2 /*return*/ ];
                }
            }));
        }));
    }, t.prototype.ul = function(t) {
        var e;
        if (t instanceof ze) e = t.version; else {
            if (!(t instanceof We)) throw p();
            // For deleted docs, we must use baseVersion 0 when we overwrite them.
                        e = L.min();
        }
        var n = this.sl.get(t.key.toString());
        if (n) {
            if (!e.isEqual(n)) 
            // This transaction will fail no matter what.
            throw new R(T.ABORTED, "Document version changed between two reads.");
        } else this.sl.set(t.key.toString(), e);
    }, 
    /**
     * Returns the version of this document when it was read in this transaction,
     * as a precondition, or no precondition if it was not read.
     */
    t.prototype.Be = function(t) {
        var e = this.sl.get(t.toString());
        return !this.ol.has(t) && e ? Ne.updateTime(e) : Ne.je();
    }, 
    /**
     * Returns the precondition for a document if the operation is an update.
     */
    t.prototype.cl = function(t) {
        var e = this.sl.get(t.toString());
        // The first time a document is written, we want to take into account the
        // read time and existence
                if (!this.ol.has(t) && e) {
            if (e.isEqual(L.min())) 
            // The document doesn't exist, so fail the transaction.
            // This has to be validated locally because you can't send a
            // precondition that a document does not exist without changing the
            // semantics of the backend write to be an insert. This is the reverse
            // of what we want, since we want to assert that the document doesn't
            // exist but then send the update and have it fail. Since we can't
            // express that to the backend, we have to validate locally.
            // Note: this can change once we can send separate verify writes in the
            // transaction.
            throw new R(T.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
            // Document exists, base precondition on document update time.
                        return Ne.updateTime(e);
        }
        // Document was not read, so we just use the preconditions for a blind
        // update.
                return Ne.exists(!0);
    }, t.prototype.write = function(t) {
        this.al(), this.mutations = this.mutations.concat(t);
    }, t.prototype.al = function() {}, t;
}(), Vi = /** @class */ function() {
    function t(t, e, n, r) {
        this.Is = t, this.ko = e, this.updateFunction = n, this.Ps = r, this.ll = 5, this.$s = new On(this.Is, "transaction_retry" /* TransactionRetry */)
        /** Runs the transaction and sets the result on deferred. */;
    }
    return t.prototype._l = function() {
        this.fl();
    }, t.prototype.fl = function() {
        var t = this;
        this.$s.ds((function() {
            return e.__awaiter(t, void 0, void 0, (function() {
                var t, n, r = this;
                return e.__generator(this, (function(e) {
                    return t = new Pi(this.ko), (n = this.dl(t)) && n.then((function(e) {
                        r.Is.gs((function() {
                            return t.commit().then((function() {
                                r.Ps.resolve(e);
                            })).catch((function(t) {
                                r.wl(t);
                            }));
                        }));
                    })).catch((function(t) {
                        r.wl(t);
                    })), [ 2 /*return*/ ];
                }));
            }));
        }));
    }, t.prototype.dl = function(t) {
        try {
            var e = this.updateFunction(t);
            return !S(e) && e.catch && e.then ? e : (this.Ps.reject(Error("Transaction callback must return a Promise")), 
            null);
        } catch (t) {
            // Do not retry errors thrown by user provided updateFunction.
            return this.Ps.reject(t), null;
        }
    }, t.prototype.wl = function(t) {
        var e = this;
        this.ll > 0 && this.Tl(t) ? (this.ll -= 1, this.Is.gs((function() {
            return e.fl(), Promise.resolve();
        }))) : this.Ps.reject(t);
    }, t.prototype.Tl = function(t) {
        if ("FirebaseError" === t.name) {
            // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
            // non-matching document versions with ABORTED. These errors should be retried.
            var e = t.code;
            return "aborted" === e || "failed-precondition" === e || !K(e);
        }
        return !1;
    }, t;
}(), Ui = /** @class */ function() {
    function t(t, 
    /**
     * Asynchronous queue responsible for all of our internal processing. When
     * we get incoming work from the user (via public API) or the network
     * (incoming GRPC messages), we should always schedule onto this queue.
     * This ensures all of our work is properly serialized (e.g. we don't
     * start processing a new operation while the previous one is waiting for
     * an async I/O to complete).
     */
    e) {
        this.credentials = t, this.Is = e, this.clientId = g.t(), 
        // We defer our initialization until we get the current user from
        // setChangeListener(). We block the async queue until we got the initial
        // user and the initialization is completed. This will prevent any scheduled
        // work from happening before initialization is completed.
        // If initializationDone resolved then the FirestoreClient is in a usable
        // state.
        this.ml = new kn
        /**
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
     */;
    }
    return t.prototype.start = function(t, e, n, r) {
        var i = this;
        this.El(), this.ic = t;
        // If usePersistence is true, certain classes of errors while starting are
        // recoverable but only by falling back to persistence disabled.
        // If there's an error in the first case but not in recovery we cannot
        // reject the promise blocking the async queue because this will cause the
        // async queue to panic.
        var o = new kn, s = !1;
        // Return only the result of enabling persistence. Note that this does not
        // need to await the completion of initializationDone because the result of
        // this method should not reflect any other kind of failure to start.
        return this.credentials.kr((function(t) {
            if (!s) return s = !0, c("FirestoreClient", "Initializing. user=", t.uid), i.Il(e, n, r, t, o).then(i.ml.resolve, i.ml.reject);
            i.Is.Us((function() {
                return i.oa.yh(t);
            }));
        })), 
        // Block the async queue until initialization is done
        this.Is.gs((function() {
            return i.ml.promise;
        })), o.promise;
    }, 
    /** Enables the network connection and requeues all pending operations. */ t.prototype.enableNetwork = function() {
        var t = this;
        return this.El(), this.Is.enqueue((function() {
            return t.persistence.Ou(!0), t.oa.enableNetwork();
        }));
    }, 
    /**
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
     */
    t.prototype.Il = function(t, n, r, i, o) {
        return e.__awaiter(this, void 0, void 0, (function() {
            var s, u, a = this;
            return e.__generator(this, (function(c) {
                switch (c.label) {
                  case 0:
                    return c.trys.push([ 0, 3, , 4 ]), s = {
                        Is: this.Is,
                        ic: this.ic,
                        clientId: this.clientId,
                        credentials: this.credentials,
                        Pc: i,
                        aa: 100,
                        yc: r
                    }, [ 4 /*yield*/ , t.initialize(s) ];

                  case 1:
                    return c.sent(), [ 4 /*yield*/ , n.initialize(t, s) ];

                  case 2:
                    return c.sent(), this.persistence = t.persistence, this.ha = t.ha, this.$o = t.$o, 
                    this.Ic = t.Ic, this.ko = n.ko, this.oa = n.oa, this.uh = n.uh, this.Rl = n.bc, 
                    // When a user calls clearPersistence() in one client, all other clients
                    // need to be terminated to allow the delete to succeed.
                    this.persistence.Lu((function() {
                        return e.__awaiter(a, void 0, void 0, (function() {
                            return e.__generator(this, (function(t) {
                                switch (t.label) {
                                  case 0:
                                    return [ 4 /*yield*/ , this.terminate() ];

                                  case 1:
                                    return t.sent(), [ 2 /*return*/ ];
                                }
                            }));
                        }));
                    })), o.resolve(), [ 3 /*break*/ , 4 ];

                  case 3:
                    // An unknown failure on the first stage shuts everything down.
                    if (u = c.sent(), 
                    // Regardless of whether or not the retry succeeds, from an user
                    // perspective, offline persistence has failed.
                    o.reject(u), !this.Al(u)) throw u;
                    return [ 2 /*return*/ , (console.warn("Error enabling offline persistence. Falling back to persistence disabled: " + u), 
                    this.Il(new Dr, new Lr, {
                        Vc: !1
                    }, i, o)) ];

                  case 4:
                    return [ 2 /*return*/ ];
                }
            }));
        }));
    }, 
    /**
     * Decides whether the provided error allows us to gracefully disable
     * persistence (as opposed to crashing the client).
     */
    t.prototype.Al = function(t) {
        return "FirebaseError" === t.name ? t.code === T.FAILED_PRECONDITION || t.code === T.UNIMPLEMENTED : !("undefined" != typeof DOMException && t instanceof DOMException) || 
        // When the browser is out of quota we could get either quota exceeded
        // or an aborted error depending on whether the error happened during
        // schema migration.
        22 === t.code || 20 === t.code || 
        // Firefox Private Browsing mode disables IndexedDb and returns
        // INVALID_STATE for any usage.
        11 === t.code;
    }, 
    /**
     * Checks that the client has not been terminated. Ensures that other methods on
     * this class cannot be called after the client is terminated.
     */
    t.prototype.El = function() {
        if (this.Is.xs) throw new R(T.FAILED_PRECONDITION, "The client has already been terminated.");
    }, 
    /** Disables the network connection. Pending operations will not complete. */ t.prototype.disableNetwork = function() {
        var t = this;
        return this.El(), this.Is.enqueue((function() {
            return t.persistence.Ou(!1), t.oa.disableNetwork();
        }));
    }, t.prototype.terminate = function() {
        var t = this;
        this.Is.qs();
        var n = new kn;
        return this.Is.Ls((function() {
            return e.__awaiter(t, void 0, void 0, (function() {
                var t, r;
                return e.__generator(this, (function(e) {
                    switch (e.label) {
                      case 0:
                        return e.trys.push([ 0, 4, , 5 ]), 
                        // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
                        this.Ic && this.Ic.stop(), [ 4 /*yield*/ , this.oa.rh() ];

                      case 1:
                        return e.sent(), [ 4 /*yield*/ , this.ha.rh() ];

                      case 2:
                        return e.sent(), [ 4 /*yield*/ , this.persistence.rh() ];

                      case 3:
                        // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
                        return e.sent(), 
                        // `removeChangeListener` must be called after shutting down the
                        // RemoteStore as it will prevent the RemoteStore from retrieving
                        // auth tokens.
                        this.credentials.xr(), n.resolve(), [ 3 /*break*/ , 5 ];

                      case 4:
                        return t = e.sent(), r = Mn(t, "Failed to shutdown persistence"), n.reject(r), [ 3 /*break*/ , 5 ];

                      case 5:
                        return [ 2 /*return*/ ];
                    }
                }));
            }));
        })), n.promise;
    }, 
    /**
     * Returns a Promise that resolves when all writes that were pending at the time this
     * method was called received server acknowledgement. An acknowledgement can be either acceptance
     * or rejection.
     */
    t.prototype.waitForPendingWrites = function() {
        var t = this;
        this.El();
        var e = new kn;
        return this.Is.gs((function() {
            return t.uh.Da(e);
        })), e.promise;
    }, t.prototype.listen = function(t, e, n) {
        var r = this;
        this.El();
        var i = new Or(n), o = new pr(t, i, e);
        return this.Is.gs((function() {
            return r.Rl.listen(o);
        })), function() {
            i.Dc(), r.Is.gs((function() {
                return r.Rl.hh(o);
            }));
        };
    }, t.prototype.Pl = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return this.El(), [ 4 /*yield*/ , this.ml.promise ];

                  case 1:
                    return [ 2 /*return*/ , (n.sent(), function(t, n, r) {
                        return e.__awaiter(this, void 0, void 0, (function() {
                            var i, o = this;
                            return e.__generator(this, (function(s) {
                                switch (s.label) {
                                  case 0:
                                    return i = new kn, [ 4 /*yield*/ , t.enqueue((function() {
                                        return e.__awaiter(o, void 0, void 0, (function() {
                                            var t, o, s;
                                            return e.__generator(this, (function(e) {
                                                switch (e.label) {
                                                  case 0:
                                                    return e.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , n.ir(r) ];

                                                  case 1:
                                                    return (t = e.sent()) instanceof ze ? i.resolve(t) : t instanceof We ? i.resolve(null) : i.reject(new R(T.UNAVAILABLE, "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)")), 
                                                    [ 3 /*break*/ , 3 ];

                                                  case 2:
                                                    return o = e.sent(), s = Mn(o, "Failed to get document '" + r + " from cache"), 
                                                    i.reject(s), [ 3 /*break*/ , 3 ];

                                                  case 3:
                                                    return [ 2 /*return*/ ];
                                                }
                                            }));
                                        }));
                                    })) ];

                                  case 1:
                                    return [ 2 /*return*/ , (s.sent(), i.promise) ];
                                }
                            }));
                        }));
                    }(this.Is, this.$o, t)) ];
                }
            }));
        }));
    }, t.prototype.Vl = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.El(), [ 4 /*yield*/ , this.ml.promise ];

                  case 1:
                    return [ 2 /*return*/ , (e.sent(), function(t, e, n, r) {
                        var i = new kn, o = Si(t, e, He(n.path), {
                            includeMetadataChanges: !0,
                            Ja: !0
                        }, {
                            next: function(t) {
                                // Remove query first before passing event to user to avoid
                                // user actions affecting the now stale query.
                                o();
                                var e = t.docs.has(n);
                                !e && t.fromCache ? 
                                // TODO(dimond): If we're online and the document doesn't
                                // exist then we resolve with a doc.exists set to false. If
                                // we're offline however, we reject the Promise in this
                                // case. Two options: 1) Cache the negative response from
                                // the server so we can deliver that even when you're
                                // offline 2) Actually reject the Promise in the online case
                                // if the document doesn't exist.
                                i.reject(new R(T.UNAVAILABLE, "Failed to get document because the client is offline.")) : e && t.fromCache && r && "server" === r.source ? i.reject(new R(T.UNAVAILABLE, 'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')) : i.resolve(t);
                            },
                            error: function(t) {
                                return i.reject(t);
                            }
                        });
                        return i.promise;
                    }(this.Is, this.Rl, t, n)) ];
                }
            }));
        }));
    }, t.prototype.yl = function(t) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(n) {
                switch (n.label) {
                  case 0:
                    return this.El(), [ 4 /*yield*/ , this.ml.promise ];

                  case 1:
                    return [ 2 /*return*/ , (n.sent(), function(t, n, r) {
                        return e.__awaiter(this, void 0, void 0, (function() {
                            var i, o = this;
                            return e.__generator(this, (function(s) {
                                switch (s.label) {
                                  case 0:
                                    return i = new kn, [ 4 /*yield*/ , t.enqueue((function() {
                                        return e.__awaiter(o, void 0, void 0, (function() {
                                            var t, o, s, u, a, c;
                                            return e.__generator(this, (function(e) {
                                                switch (e.label) {
                                                  case 0:
                                                    return e.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , n.cr(r, 
                                                    /* usePreviousResults= */ !0) ];

                                                  case 1:
                                                    return t = e.sent(), o = new ur(r, t._r), s = o.Kh(t.documents), u = o.Xh(s, 
                                                    /* updateLimboDocuments= */ !1), i.resolve(u.snapshot), [ 3 /*break*/ , 3 ];

                                                  case 2:
                                                    return a = e.sent(), c = Mn(a, "Failed to execute query '" + r + " against cache"), 
                                                    i.reject(c), [ 3 /*break*/ , 3 ];

                                                  case 3:
                                                    return [ 2 /*return*/ ];
                                                }
                                            }));
                                        }));
                                    })) ];

                                  case 1:
                                    return [ 2 /*return*/ , (s.sent(), i.promise) ];
                                }
                            }));
                        }));
                    }(this.Is, this.$o, t)) ];
                }
            }));
        }));
    }, t.prototype.pl = function(t, n) {
        return e.__awaiter(this, void 0, void 0, (function() {
            return e.__generator(this, (function(e) {
                switch (e.label) {
                  case 0:
                    return this.El(), [ 4 /*yield*/ , this.ml.promise ];

                  case 1:
                    return [ 2 /*return*/ , (e.sent(), function(t, e, n, r) {
                        var i = new kn, o = Si(t, e, n, {
                            includeMetadataChanges: !0,
                            Ja: !0
                        }, {
                            next: function(t) {
                                // Remove query first before passing event to user to avoid
                                // user actions affecting the now stale query.
                                o(), t.fromCache && r && "server" === r.source ? i.reject(new R(T.UNAVAILABLE, 'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')) : i.resolve(t);
                            },
                            error: function(t) {
                                return i.reject(t);
                            }
                        });
                        return i.promise;
                    }(this.Is, this.Rl, t, n)) ];
                }
            }));
        }));
    }, t.prototype.write = function(t) {
        var e = this;
        this.El();
        var n = new kn;
        return this.Is.gs((function() {
            return e.uh.write(t, n);
        })), n.promise;
    }, t.prototype.s = function() {
        return this.ic.s;
    }, t.prototype.Qa = function(t) {
        var n = this;
        this.El();
        var r = new Or(t);
        return this.Is.gs((function() {
            return e.__awaiter(n, void 0, void 0, (function() {
                return e.__generator(this, (function(t) {
                    return [ 2 /*return*/ , this.Rl.Qa(r) ];
                }));
            }));
        })), function() {
            r.Dc(), n.Is.gs((function() {
                return e.__awaiter(n, void 0, void 0, (function() {
                    return e.__generator(this, (function(t) {
                        return [ 2 /*return*/ , this.Rl.ja(r) ];
                    }));
                }));
            }));
        };
    }, Object.defineProperty(t.prototype, "gl", {
        get: function() {
            // Technically, the asyncQueue is still running, but only accepting operations
            // related to termination or supposed to be run after termination. It is effectively
            // terminated to the eyes of users.
            return this.Is.xs;
        },
        enumerable: !1,
        configurable: !0
    }), 
    /**
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
     */
    t.prototype.transaction = function(t) {
        var e = this;
        this.El();
        var n = new kn;
        return this.Is.gs((function() {
            return new Vi(e.Is, e.ko, t, n)._l(), Promise.resolve();
        })), n.promise;
    }, t;
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
/**
 * TransactionRunner encapsulates the logic needed to run and retry transactions
 * with backoff.
 */ function Si(t, e, n, r, i) {
    var o = new Or(i), s = new pr(n, o, r);
    return t.gs((function() {
        return e.listen(s);
    })), function() {
        o.Dc(), t.gs((function() {
            return e.hh(s);
        }));
    };
}

var Mi = /** @class */ function() {
    function t(t, e, n, r) {
        this.s = t, this.timestampsInSnapshots = e, this.vl = n, this.bl = r;
    }
    return t.prototype.Sl = function(t) {
        switch (At(t)) {
          case 0 /* NullValue */ :
            return null;

          case 1 /* BooleanValue */ :
            return t.booleanValue;

          case 2 /* NumberValue */ :
            return Pt(t.integerValue || t.doubleValue);

          case 3 /* TimestampValue */ :
            return this.Cl(t.timestampValue);

          case 4 /* ServerTimestampValue */ :
            return this.Dl(t);

          case 5 /* StringValue */ :
            return t.stringValue;

          case 6 /* BlobValue */ :
            return new Zr(Vt(t.bytesValue));

          case 7 /* RefValue */ :
            return this.Fl(t.referenceValue);

          case 8 /* GeoPointValue */ :
            return this.Nl(t.geoPointValue);

          case 9 /* ArrayValue */ :
            return this.$l(t.arrayValue);

          case 10 /* ObjectValue */ :
            return this.kl(t.mapValue);

          default:
            throw p();
        }
    }, t.prototype.kl = function(t) {
        var e = this, n = {};
        return I(t.fields || {}, (function(t, r) {
            n[t] = e.Sl(r);
        })), n;
    }, t.prototype.Nl = function(t) {
        return new li(Pt(t.latitude), Pt(t.longitude));
    }, t.prototype.$l = function(t) {
        var e = this;
        return (t.values || []).map((function(t) {
            return e.Sl(t);
        }));
    }, t.prototype.Dl = function(t) {
        switch (this.vl) {
          case "previous":
            var e = function t(e) {
                var n = e.mapValue.fields.__previous_value__;
                return Et(n) ? t(n) : n;
            }(t);
            return null == e ? null : this.Sl(e);

          case "estimate":
            return this.Cl(It(t));

          default:
            return null;
        }
    }, t.prototype.Cl = function(t) {
        var e = Ot(t), n = new D(e.seconds, e.nanos);
        return this.timestampsInSnapshots ? n : n.toDate();
    }, t.prototype.Fl = function(t) {
        var e = O.$(t);
        d(ae(e));
        var n = new b(e.get(1), e.get(3)), r = new U(e.p(5));
        return n.isEqual(this.s) || 
        // TODO(b/64130202): Somehow support foreign references.
        h("Document " + r + " contains a document reference within a different database (" + n.projectId + "/" + n.database + ") which is not supported. It will be treated as a reference in the current database (" + this.s.projectId + "/" + this.s.database + ") instead."), 
        this.bl(r);
    }, t;
}(), Ci = Cn.ei, xi = /** @class */ function() {
    function t(t) {
        var e, n, r, i;
        if (void 0 === t.host) {
            if (void 0 !== t.ssl) throw new R(T.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
            this.host = "firestore.googleapis.com", this.ssl = !0;
        } else xr("settings", "non-empty string", "host", t.host), this.host = t.host, qr("settings", "boolean", "ssl", t.ssl), 
        this.ssl = null === (e = t.ssl) || void 0 === e || e;
        if (Qr("settings", t, [ "host", "ssl", "credentials", "timestampsInSnapshots", "cacheSizeBytes", "experimentalForceLongPolling", "ignoreUndefinedProperties" ]), 
        qr("settings", "object", "credentials", t.credentials), this.credentials = t.credentials, 
        qr("settings", "boolean", "timestampsInSnapshots", t.timestampsInSnapshots), qr("settings", "boolean", "ignoreUndefinedProperties", t.ignoreUndefinedProperties), 
        // Nobody should set timestampsInSnapshots anymore, but the error depends on
        // whether they set it to true or false...
        !0 === t.timestampsInSnapshots ? h("The setting 'timestampsInSnapshots: true' is no longer required and should be removed.") : !1 === t.timestampsInSnapshots && h("Support for 'timestampsInSnapshots: false' will be removed soon. You must update your code to handle Timestamp objects."), 
        this.timestampsInSnapshots = null === (n = t.timestampsInSnapshots) || void 0 === n || n, 
        this.ignoreUndefinedProperties = null !== (r = t.ignoreUndefinedProperties) && void 0 !== r && r, 
        qr("settings", "number", "cacheSizeBytes", t.cacheSizeBytes), void 0 === t.cacheSizeBytes) this.cacheSizeBytes = Cn.si; else {
            if (t.cacheSizeBytes !== Ci && t.cacheSizeBytes < Cn.ni) throw new R(T.INVALID_ARGUMENT, "cacheSizeBytes must be at least " + Cn.ni);
            this.cacheSizeBytes = t.cacheSizeBytes;
        }
        qr("settings", "boolean", "experimentalForceLongPolling", t.experimentalForceLongPolling), 
        this.forceLongPolling = null !== (i = t.experimentalForceLongPolling) && void 0 !== i && i;
    }
    return t.prototype.isEqual = function(t) {
        return this.host === t.host && this.ssl === t.ssl && this.timestampsInSnapshots === t.timestampsInSnapshots && this.credentials === t.credentials && this.cacheSizeBytes === t.cacheSizeBytes && this.forceLongPolling === t.forceLongPolling && this.ignoreUndefinedProperties === t.ignoreUndefinedProperties;
    }, t;
}(), qi = /** @class */ function() {
    // Note: We are using `MemoryComponentProvider` as a default
    // ComponentProvider to ensure backwards compatibility with the format
    // expected by the console build.
    function t(n, r, i, o) {
        var s = this;
        if (void 0 === i && (i = new Dr), void 0 === o && (o = new Lr), this.xl = i, this.Ll = o, 
        this.Ol = null, 
        // Public for use in tests.
        // TODO(mikelehen): Use modularized initialization instead.
        this.Ml = new Sn, this.INTERNAL = {
            delete: function() {
                return e.__awaiter(s, void 0, void 0, (function() {
                    return e.__generator(this, (function(t) {
                        switch (t.label) {
                          case 0:
                            // The client must be initalized to ensure that all subsequent API usage
                            // throws an exception.
                            return this.ql(), [ 4 /*yield*/ , this.Ul.terminate() ];

                          case 1:
                            // The client must be initalized to ensure that all subsequent API usage
                            // throws an exception.
                            return t.sent(), [ 2 /*return*/ ];
                        }
                    }));
                }));
            }
        }, "object" == typeof n.options) {
            // This is very likely a Firebase app object
            // TODO(b/34177605): Can we somehow use instanceof?
            var u = n;
            this.Ol = u, this.jc = t.Bl(u), this.Wl = u.name, this.Ql = new $n(r);
        } else {
            var a = n;
            if (!a.projectId) throw new R(T.INVALID_ARGUMENT, "Must provide projectId");
            this.jc = new b(a.projectId, a.database), 
            // Use a default persistenceKey that lines up with FirebaseApp.
            this.Wl = "[DEFAULT]", this.Ql = new Kn;
        }
        this.jl = new xi({});
    }
    return Object.defineProperty(t.prototype, "Gl", {
        get: function() {
            return this.Kl || (
            // Lazy initialize UserDataReader once the settings are frozen
            this.Kl = new wi(this.jc, this.jl.ignoreUndefinedProperties)), this.Kl;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.settings = function(t) {
        Vr("Firestore.settings", arguments, 1), Mr("Firestore.settings", "object", 1, t);
        var e = new xi(t);
        if (this.Ul && !this.jl.isEqual(e)) throw new R(T.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only call settings() before calling any other methods on a Firestore object.");
        this.jl = e, void 0 !== e.credentials && (this.Ql = function(t) {
            if (!t) return new Kn;
            switch (t.type) {
              case "gapi":
                var e = t.zl;
                // Make sure this really is a Gapi client.
                                return d(!("object" != typeof e || null === e || !e.auth || !e.auth.getAuthHeaderValueForFirstParty)), 
                new Yn(e, t.Br || "0");

              case "provider":
                return t.zl;

              default:
                throw new R(T.INVALID_ARGUMENT, "makeCredentialsProvider failed due to invalid credential type");
            }
        }(e.credentials));
    }, t.prototype.enableNetwork = function() {
        return this.ql(), this.Ul.enableNetwork();
    }, t.prototype.disableNetwork = function() {
        return this.ql(), this.Ul.disableNetwork();
    }, t.prototype.enablePersistence = function(t) {
        var e, n;
        if (this.Ul) throw new R(T.FAILED_PRECONDITION, "Firestore has already been started and persistence can no longer be enabled. You can only call enablePersistence() before calling any other methods on a Firestore object.");
        var r = !1, i = !1;
        if (t && (void 0 !== t.experimentalTabSynchronization && h("The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead."), 
        r = null !== (n = null !== (e = t.synchronizeTabs) && void 0 !== e ? e : t.experimentalTabSynchronization) && void 0 !== n && n, 
        i = !!t.experimentalForceOwningTab && t.experimentalForceOwningTab, r && i)) throw new R(T.INVALID_ARGUMENT, "The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'.");
        return this.Hl(this.xl, this.Ll, {
            Vc: !0,
            cacheSizeBytes: this.jl.cacheSizeBytes,
            synchronizeTabs: r,
            Yl: i
        });
    }, t.prototype.clearPersistence = function() {
        return e.__awaiter(this, void 0, void 0, (function() {
            var t, n = this;
            return e.__generator(this, (function(r) {
                if (void 0 !== this.Ul && !this.Ul.gl) throw new R(T.FAILED_PRECONDITION, "Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");
                return t = new kn, [ 2 /*return*/ , (this.Ml.Ls((function() {
                    return e.__awaiter(n, void 0, void 0, (function() {
                        var n;
                        return e.__generator(this, (function(e) {
                            switch (e.label) {
                              case 0:
                                return e.trys.push([ 0, 2, , 3 ]), [ 4 /*yield*/ , this.xl.clearPersistence(this.jc, this.Wl) ];

                              case 1:
                                return e.sent(), t.resolve(), [ 3 /*break*/ , 3 ];

                              case 2:
                                return n = e.sent(), t.reject(n), [ 3 /*break*/ , 3 ];

                              case 3:
                                return [ 2 /*return*/ ];
                            }
                        }));
                    }));
                })), t.promise) ];
            }));
        }));
    }, t.prototype.terminate = function() {
        return this.app._removeServiceInstance("firestore"), this.INTERNAL.delete();
    }, Object.defineProperty(t.prototype, "Xl", {
        get: function() {
            return this.ql(), this.Ul.gl;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.waitForPendingWrites = function() {
        return this.ql(), this.Ul.waitForPendingWrites();
    }, t.prototype.onSnapshotsInSync = function(t) {
        if (this.ql(), kr(t)) return this.Ul.Qa(t);
        Mr("Firestore.onSnapshotsInSync", "function", 1, t);
        var e = {
            next: t
        };
        return this.Ul.Qa(e);
    }, t.prototype.ql = function() {
        return this.Ul || 
        // Kick off starting the client but don't actually wait for it.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.Hl(new Dr, new Lr, {
            Vc: !1
        }), this.Ul;
    }, t.prototype.Jl = function() {
        return new _(this.jc, this.Wl, this.jl.host, this.jl.ssl, this.jl.forceLongPolling);
    }, t.prototype.Hl = function(t, e, n) {
        var r = this.Jl();
        return this.Ul = new Ui(this.Ql, this.Ml), this.Ul.start(r, t, e, n);
    }, t.Bl = function(t) {
        if (e = t.options, "projectId", !Object.prototype.hasOwnProperty.call(e, "projectId")) throw new R(T.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
        var e, n = t.options.projectId;
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
 */        if (!n || "string" != typeof n) throw new R(T.INVALID_ARGUMENT, "projectId must be a string in FirebaseApp.options");
        return new b(n);
    }, Object.defineProperty(t.prototype, "app", {
        get: function() {
            if (!this.Ol) throw new R(T.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
            return this.Ol;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.collection = function(t) {
        return Vr("Firestore.collection", arguments, 1), Mr("Firestore.collection", "non-empty string", 1, t), 
        this.ql(), new to(O.$(t), this, 
        /* converter= */ null);
    }, t.prototype.doc = function(t) {
        return Vr("Firestore.doc", arguments, 1), Mr("Firestore.doc", "non-empty string", 1, t), 
        this.ql(), Fi.Zl(O.$(t), this, 
        /* converter= */ null);
    }, t.prototype.collectionGroup = function(t) {
        if (Vr("Firestore.collectionGroup", arguments, 1), Mr("Firestore.collectionGroup", "non-empty string", 1, t), 
        t.indexOf("/") >= 0) throw new R(T.INVALID_ARGUMENT, "Invalid collection ID '" + t + "' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.");
        return this.ql(), new Ji(function(t) {
            return new $e(O.k(), t);
        }(t), this, 
        /* converter= */ null);
    }, t.prototype.runTransaction = function(t) {
        var e = this;
        return Vr("Firestore.runTransaction", arguments, 1), Mr("Firestore.runTransaction", "function", 1, t), 
        this.ql().transaction((function(n) {
            return t(new ji(e, n));
        }));
    }, t.prototype.batch = function() {
        return this.ql(), new Gi(this);
    }, Object.defineProperty(t, "logLevel", {
        get: function() {
            switch (a()) {
              case r.LogLevel.DEBUG:
                return "debug";

              case r.LogLevel.ERROR:
                return "error";

              case r.LogLevel.SILENT:
                return "silent";

              case r.LogLevel.WARN:
                return "warn";

              case r.LogLevel.INFO:
                return "info";

              case r.LogLevel.VERBOSE:
                return "verbose";

              default:
                // The default log level is error
                return "error";
            }
        },
        enumerable: !1,
        configurable: !0
    }), t.setLogLevel = function(t) {
        var e;
        Vr("Firestore.setLogLevel", arguments, 1), Gr("setLogLevel", [ "debug", "error", "silent", "warn", "info", "verbose" ], 1, t), 
        e = t, u.setLogLevel(e);
    }, 
    // Note: this is not a property because the minifier can't work correctly with
    // the way TypeScript compiler outputs properties.
    t.prototype.t_ = function() {
        return this.jl.timestampsInSnapshots;
    }, t;
}(), ji = /** @class */ function() {
    function t(t, e) {
        this.e_ = t, this.n_ = e;
    }
    return t.prototype.get = function(t) {
        var e = this;
        Vr("Transaction.get", arguments, 1);
        var n = io("Transaction.get", t, this.e_);
        return this.n_.hl([ n.Gc ]).then((function(t) {
            if (!t || 1 !== t.length) return p();
            var r = t[0];
            if (r instanceof We) return new zi(e.e_, n.Gc, null, 
            /* fromCache= */ !1, 
            /* hasPendingWrites= */ !1, n.Kc);
            if (r instanceof ze) return new zi(e.e_, n.Gc, r, 
            /* fromCache= */ !1, 
            /* hasPendingWrites= */ !1, n.Kc);
            throw p();
        }));
    }, t.prototype.set = function(t, e, n) {
        Sr("Transaction.set", arguments, 2, 3);
        var r = io("Transaction.set", t, this.e_);
        n = eo("Transaction.set", n);
        var i = so(r.Kc, e, n), o = _i(this.e_.Gl, "Transaction.set", r.Gc, i, null !== r.Kc, n);
        return this.n_.set(r.Gc, o), this;
    }, t.prototype.update = function(t, e, n) {
        for (var r, i, o = [], s = 3; s < arguments.length; s++) o[s - 3] = arguments[s];
        return "string" == typeof e || e instanceof ei ? (Ur("Transaction.update", arguments, 3), 
        r = io("Transaction.update", t, this.e_), i = Ei(this.e_.Gl, "Transaction.update", r.Gc, e, n, o)) : (Vr("Transaction.update", arguments, 2), 
        r = io("Transaction.update", t, this.e_), i = bi(this.e_.Gl, "Transaction.update", r.Gc, e)), 
        this.n_.update(r.Gc, i), this;
    }, t.prototype.delete = function(t) {
        Vr("Transaction.delete", arguments, 1);
        var e = io("Transaction.delete", t, this.e_);
        return this.n_.delete(e.Gc), this;
    }, t;
}(), Gi = /** @class */ function() {
    function t(t) {
        this.e_ = t, this.s_ = [], this.i_ = !1;
    }
    return t.prototype.set = function(t, e, n) {
        Sr("WriteBatch.set", arguments, 2, 3), this.r_();
        var r = io("WriteBatch.set", t, this.e_);
        n = eo("WriteBatch.set", n);
        var i = so(r.Kc, e, n), o = _i(this.e_.Gl, "WriteBatch.set", r.Gc, i, null !== r.Kc, n);
        return this.s_ = this.s_.concat(o.zc(r.Gc, Ne.je())), this;
    }, t.prototype.update = function(t, e, n) {
        for (var r, i, o = [], s = 3; s < arguments.length; s++) o[s - 3] = arguments[s];
        return this.r_(), "string" == typeof e || e instanceof ei ? (Ur("WriteBatch.update", arguments, 3), 
        r = io("WriteBatch.update", t, this.e_), i = Ei(this.e_.Gl, "WriteBatch.update", r.Gc, e, n, o)) : (Vr("WriteBatch.update", arguments, 2), 
        r = io("WriteBatch.update", t, this.e_), i = bi(this.e_.Gl, "WriteBatch.update", r.Gc, e)), 
        this.s_ = this.s_.concat(i.zc(r.Gc, Ne.exists(!0))), this;
    }, t.prototype.delete = function(t) {
        Vr("WriteBatch.delete", arguments, 1), this.r_();
        var e = io("WriteBatch.delete", t, this.e_);
        return this.s_ = this.s_.concat(new xe(e.Gc, Ne.je())), this;
    }, t.prototype.commit = function() {
        return this.r_(), this.i_ = !0, this.s_.length > 0 ? this.e_.ql().write(this.s_) : Promise.resolve();
    }, t.prototype.r_ = function() {
        if (this.i_) throw new R(T.FAILED_PRECONDITION, "A write batch can no longer be used after commit() has been called.");
    }, t;
}(), Fi = /** @class */ function(t) {
    function n(e, n, r) {
        var i = this;
        return (i = t.call(this, n.jc, e, r) || this).Gc = e, i.firestore = n, i.Kc = r, 
        i.Ul = i.firestore.ql(), i;
    }
    return e.__extends(n, t), n.Zl = function(t, e, r) {
        if (t.length % 2 != 0) throw new R(T.INVALID_ARGUMENT, "Invalid document reference. Document references must have an even number of segments, but " + t.N() + " has " + t.length);
        return new n(new U(t), e, r);
    }, Object.defineProperty(n.prototype, "id", {
        get: function() {
            return this.Gc.path.S();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(n.prototype, "parent", {
        get: function() {
            return new to(this.Gc.path.g(), this.firestore, this.Kc);
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(n.prototype, "path", {
        get: function() {
            return this.Gc.path.N();
        },
        enumerable: !1,
        configurable: !0
    }), n.prototype.collection = function(t) {
        if (Vr("DocumentReference.collection", arguments, 1), Mr("DocumentReference.collection", "non-empty string", 1, t), 
        !t) throw new R(T.INVALID_ARGUMENT, "Must provide a non-empty collection name to collection()");
        var e = O.$(t);
        return new to(this.Gc.path.child(e), this.firestore, 
        /* converter= */ null);
    }, n.prototype.isEqual = function(t) {
        if (!(t instanceof n)) throw Kr("isEqual", "DocumentReference", 1, t);
        return this.firestore === t.firestore && this.Gc.isEqual(t.Gc) && this.Kc === t.Kc;
    }, n.prototype.set = function(t, e) {
        Sr("DocumentReference.set", arguments, 1, 2), e = eo("DocumentReference.set", e);
        var n = so(this.Kc, t, e), r = _i(this.firestore.Gl, "DocumentReference.set", this.Gc, n, null !== this.Kc, e);
        return this.Ul.write(r.zc(this.Gc, Ne.je()));
    }, n.prototype.update = function(t, e) {
        for (var n, r = [], i = 2; i < arguments.length; i++) r[i - 2] = arguments[i];
        return "string" == typeof t || t instanceof ei ? (Ur("DocumentReference.update", arguments, 2), 
        n = Ei(this.firestore.Gl, "DocumentReference.update", this.Gc, t, e, r)) : (Vr("DocumentReference.update", arguments, 1), 
        n = bi(this.firestore.Gl, "DocumentReference.update", this.Gc, t)), this.Ul.write(n.zc(this.Gc, Ne.exists(!0)));
    }, n.prototype.delete = function() {
        return Vr("DocumentReference.delete", arguments, 0), this.Ul.write([ new xe(this.Gc, Ne.je()) ]);
    }, n.prototype.onSnapshot = function() {
        for (var t, e, n, r = this, i = [], o = 0; o < arguments.length; o++) i[o] = arguments[o];
        Sr("DocumentReference.onSnapshot", arguments, 1, 4);
        var s = {
            includeMetadataChanges: !1
        }, u = 0;
        "object" != typeof i[u] || kr(i[u]) || (Qr("DocumentReference.onSnapshot", s = i[u], [ "includeMetadataChanges" ]), 
        qr("DocumentReference.onSnapshot", "boolean", "includeMetadataChanges", s.includeMetadataChanges), 
        u++);
        var a = {
            includeMetadataChanges: s.includeMetadataChanges
        };
        if (kr(i[u])) {
            var c = i[u];
            i[u] = null === (t = c.next) || void 0 === t ? void 0 : t.bind(c), i[u + 1] = null === (e = c.error) || void 0 === e ? void 0 : e.bind(c), 
            i[u + 2] = null === (n = c.complete) || void 0 === n ? void 0 : n.bind(c);
        } else Mr("DocumentReference.onSnapshot", "function", u, i[u]), Cr("DocumentReference.onSnapshot", "function", u + 1, i[u + 1]), 
        Cr("DocumentReference.onSnapshot", "function", u + 2, i[u + 2]);
        var h = {
            next: function(t) {
                i[u] && i[u](r.o_(t));
            },
            error: i[u + 1],
            complete: i[u + 2]
        };
        return this.Ul.listen(He(this.Gc.path), a, h);
    }, n.prototype.get = function(t) {
        var e = this;
        Sr("DocumentReference.get", arguments, 0, 1), ro("DocumentReference.get", t);
        var n = this.firestore.ql();
        return t && "cache" === t.source ? n.Pl(this.Gc).then((function(t) {
            return new zi(e.firestore, e.Gc, t, 
            /*fromCache=*/ !0, t instanceof ze && t.Ge, e.Kc);
        })) : n.Vl(this.Gc, t).then((function(t) {
            return e.o_(t);
        }));
    }, n.prototype.withConverter = function(t) {
        return new n(this.Gc, this.firestore, t);
    }, 
    /**
     * Converts a ViewSnapshot that contains the current document to a
     * DocumentSnapshot.
     */
    n.prototype.o_ = function(t) {
        var e = t.docs.get(this.Gc);
        return new zi(this.firestore, this.Gc, e, t.fromCache, t.hasPendingWrites, this.Kc);
    }, n;
}(di), Bi = /** @class */ function() {
    function t(t, e) {
        this.hasPendingWrites = t, this.fromCache = e;
    }
    return t.prototype.isEqual = function(t) {
        return this.hasPendingWrites === t.hasPendingWrites && this.fromCache === t.fromCache;
    }, t;
}(), zi = /** @class */ function() {
    function t(t, e, n, r, i, o) {
        this.e_ = t, this.Gc = e, this.h_ = n, this.a_ = r, this.u_ = i, this.Kc = o;
    }
    return t.prototype.data = function(t) {
        var e = this;
        if (Sr("DocumentSnapshot.data", arguments, 0, 1), t = no("DocumentSnapshot.data", t), 
        this.h_) {
            // We only want to use the converter and create a new DocumentSnapshot
            // if a converter has been provided.
            if (this.Kc) {
                var n = new Wi(this.e_, this.Gc, this.h_, this.a_, this.u_, 
                /* converter= */ null);
                return this.Kc.fromFirestore(n, t);
            }
            return new Mi(this.e_.jc, this.e_.t_(), t.serverTimestamps || "none", (function(t) {
                return new Fi(t, e.e_, /* converter= */ null);
            })).Sl(this.h_.Ze());
        }
    }, t.prototype.get = function(t, e) {
        var n = this;
        if (Sr("DocumentSnapshot.get", arguments, 1, 2), e = no("DocumentSnapshot.get", e), 
        this.h_) {
            var r = this.h_.data().field(Di("DocumentSnapshot.get", t, this.Gc));
            if (null !== r) return new Mi(this.e_.jc, this.e_.t_(), e.serverTimestamps || "none", (function(t) {
                return new Fi(t, n.e_, n.Kc);
            })).Sl(r);
        }
    }, Object.defineProperty(t.prototype, "id", {
        get: function() {
            return this.Gc.path.S();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "ref", {
        get: function() {
            return new Fi(this.Gc, this.e_, this.Kc);
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "exists", {
        get: function() {
            return null !== this.h_;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "metadata", {
        get: function() {
            return new Bi(this.u_, this.a_);
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.isEqual = function(e) {
        if (!(e instanceof t)) throw Kr("isEqual", "DocumentSnapshot", 1, e);
        return this.e_ === e.e_ && this.a_ === e.a_ && this.Gc.isEqual(e.Gc) && (null === this.h_ ? null === e.h_ : this.h_.isEqual(e.h_)) && this.Kc === e.Kc;
    }, t;
}(), Wi = /** @class */ function(t) {
    function n() {
        return null !== t && t.apply(this, arguments) || this;
    }
    return e.__extends(n, t), n.prototype.data = function(e) {
        return t.prototype.data.call(this, e);
    }, n;
}(zi);

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
// settings() defaults:
function Qi(t, e, n, r, i, o, s) {
    var u;
    if (i.O()) {
        if ("array-contains" /* ARRAY_CONTAINS */ === o || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === o) throw new R(T.INVALID_ARGUMENT, "Invalid Query. You can't perform '" + o + "' queries on FieldPath.documentId().");
        if ("in" /* IN */ === o || "not-in" /* NOT_IN */ === o) {
            Hi(s, o);
            for (var a = [], c = 0, h = s; c < h.length; c++) {
                var f = h[c];
                a.push($i(r, t, f));
            }
            u = {
                arrayValue: {
                    values: a
                }
            };
        } else u = $i(r, t, s);
    } else "in" /* IN */ !== o && "not-in" /* NOT_IN */ !== o && "array-contains-any" /* ARRAY_CONTAINS_ANY */ !== o || Hi(s, o), 
    u = Ii(n, e, s, 
    /* allowArrays= */ "in" /* IN */ === o || "not-in" /* NOT_IN */ === o);
    var l = an.create(i, o, u);
    return function(t, e) {
        if (e.ln()) {
            var n = t.cn();
            if (null !== n && !n.isEqual(e.field)) throw new R(T.INVALID_ARGUMENT, "Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '" + n.toString() + "' and '" + e.field.toString() + "'");
            var r = t.un();
            null !== r && Yi(t, e.field, r);
        }
        var i = t._n(
        /**
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
 */
        function(t) {
            switch (t) {
              case "!=" /* NOT_EQUAL */ :
                return [ "!=" /* NOT_EQUAL */ , "not-in" /* NOT_IN */ ];

              case "array-contains" /* ARRAY_CONTAINS */ :
                return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "not-in" /* NOT_IN */ ];

              case "in" /* IN */ :
                return [ "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ ];

              case "array-contains-any" /* ARRAY_CONTAINS_ANY */ :
                return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ ];

              case "not-in" /* NOT_IN */ :
                return [ "array-contains" /* ARRAY_CONTAINS */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ , "in" /* IN */ , "not-in" /* NOT_IN */ , "!=" /* NOT_EQUAL */ ];

              default:
                return [];
            }
        }(e.op));
        if (null !== i) 
        // Special case when it's a duplicate op to give a slightly clearer error message.
        throw i === e.op ? new R(T.INVALID_ARGUMENT, "Invalid query. You cannot use more than one '" + e.op.toString() + "' filter.") : new R(T.INVALID_ARGUMENT, "Invalid query. You cannot use '" + e.op.toString() + "' filters with '" + i.toString() + "' filters.");
    }(t, l), l;
}

function Ki(t, e, n) {
    if (null !== t.startAt) throw new R(T.INVALID_ARGUMENT, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
    if (null !== t.endAt) throw new R(T.INVALID_ARGUMENT, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
    var r = new bn(e, n);
    return function(t, e) {
        if (null === t.un()) {
            // This is the first order by. It must match any inequality.
            var n = t.cn();
            null !== n && Yi(t, n, e.field);
        }
    }(t, r), r
    /**
 * Create a Bound from a query and a document.
 *
 * Note that the Bound will always include the key of the document
 * and so only the provided document will compare equal to the returned
 * position.
 *
 * Will throw if the document does not contain all fields of the order by
 * of the query or if any of the fields in the order by are an uncommitted
 * server timestamp.
 */
    /**
 * Parses the given documentIdValue into a ReferenceValue, throwing
 * appropriate errors if the value is anything other than a DocumentReference
 * or String, or if the string is malformed.
 */;
}

function $i(t, e, n) {
    if ("string" == typeof n) {
        if ("" === n) throw new R(T.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");
        if (!Ye(e) && -1 !== n.indexOf("/")) throw new R(T.INVALID_ARGUMENT, "Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '" + n + "' contains a '/' character.");
        var r = e.path.child(O.$(n));
        if (!U.W(r)) throw new R(T.INVALID_ARGUMENT, "Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '" + r + "' is not because it has an odd number of segments (" + r.length + ").");
        return Ut(t, new U(r));
    }
    if (n instanceof di) return Ut(t, n.Gc);
    throw new R(T.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: " + zr(n) + ".");
}

/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */ function Hi(t, e) {
    if (!Array.isArray(t) || 0 === t.length) throw new R(T.INVALID_ARGUMENT, "Invalid Query. A non-empty array is required for '" + e.toString() + "' filters.");
    if (t.length > 10) throw new R(T.INVALID_ARGUMENT, "Invalid Query. '" + e.toString() + "' filters support a maximum of 10 elements in the value array.");
    if ("in" /* IN */ === e || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e) {
        if (t.indexOf(null) >= 0) throw new R(T.INVALID_ARGUMENT, "Invalid Query. '" + e.toString() + "' filters cannot contain 'null' in the value array.");
        if (t.filter((function(t) {
            return Number.isNaN(t);
        })).length > 0) throw new R(T.INVALID_ARGUMENT, "Invalid Query. '" + e.toString() + "' filters cannot contain 'NaN' in the value array.");
    }
}

function Yi(t, e, n) {
    if (!n.isEqual(e)) throw new R(T.INVALID_ARGUMENT, "Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '" + e.toString() + "' and so you must also use '" + e.toString() + "' as your first orderBy(), but your first orderBy() is on field '" + n.toString() + "' instead.");
}

function Xi(t) {
    if (t.an() && 0 === t.tn.length) throw new R(T.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
}

var Ji = /** @class */ function() {
    function t(t, e, n) {
        this.c_ = t, this.firestore = e, this.Kc = n;
    }
    return t.prototype.where = function(e, n, r) {
        // TODO(ne-queries): Add 'not-in' and '!=' to validation.
        var i;
        Vr("Query.where", arguments, 3), Wr("Query.where", 3, r), i = "not-in" === n || "!=" === n ? n : Gr("Query.where", [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , "==" /* EQUAL */ , ">=" /* GREATER_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , "array-contains" /* ARRAY_CONTAINS */ , "in" /* IN */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ ], 2, n);
        var o = Di("Query.where", e), s = Qi(this.c_, "Query.where", this.firestore.Gl, this.firestore.jc, o, i, r);
        return new t(function(t, e) {
            var n = t.filters.concat([ e ]);
            return new $e(t.path, t.collectionGroup, t.tn.slice(), n, t.limit, t.en, t.startAt, t.endAt);
        }(this.c_, s), this.firestore, this.Kc);
    }, t.prototype.orderBy = function(e, n) {
        var r;
        if (Sr("Query.orderBy", arguments, 1, 2), Cr("Query.orderBy", "non-empty string", 2, n), 
        void 0 === n || "asc" === n) r = "asc" /* ASCENDING */; else {
            if ("desc" !== n) throw new R(T.INVALID_ARGUMENT, "Function Query.orderBy() has unknown direction '" + n + "', expected 'asc' or 'desc'.");
            r = "desc" /* DESCENDING */;
        }
        var i = Di("Query.orderBy", e), o = Ki(this.c_, i, r);
        return new t(function(t, e) {
            // TODO(dimond): validate that orderBy does not list the same key twice.
            var n = t.tn.concat([ e ]);
            return new $e(t.path, t.collectionGroup, n, t.filters.slice(), t.limit, t.en, t.startAt, t.endAt);
        }(this.c_, o), this.firestore, this.Kc);
    }, t.prototype.limit = function(e) {
        return Vr("Query.limit", arguments, 1), Mr("Query.limit", "number", 1, e), $r("Query.limit", 1, e), 
        new t(Ze(this.c_, e, "F" /* First */), this.firestore, this.Kc);
    }, t.prototype.limitToLast = function(e) {
        return Vr("Query.limitToLast", arguments, 1), Mr("Query.limitToLast", "number", 1, e), 
        $r("Query.limitToLast", 1, e), new t(Ze(this.c_, e, "L" /* Last */), this.firestore, this.Kc);
    }, t.prototype.startAt = function(e) {
        for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        Ur("Query.startAt", arguments, 1);
        var i = this.l_("Query.startAt", e, n, 
        /*before=*/ !0);
        return new t(tn(this.c_, i), this.firestore, this.Kc);
    }, t.prototype.startAfter = function(e) {
        for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        Ur("Query.startAfter", arguments, 1);
        var i = this.l_("Query.startAfter", e, n, 
        /*before=*/ !1);
        return new t(tn(this.c_, i), this.firestore, this.Kc);
    }, t.prototype.endBefore = function(e) {
        for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        Ur("Query.endBefore", arguments, 1);
        var i = this.l_("Query.endBefore", e, n, 
        /*before=*/ !0);
        return new t(en(this.c_, i), this.firestore, this.Kc);
    }, t.prototype.endAt = function(e) {
        for (var n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        Ur("Query.endAt", arguments, 1);
        var i = this.l_("Query.endAt", e, n, 
        /*before=*/ !1);
        return new t(en(this.c_, i), this.firestore, this.Kc);
    }, t.prototype.isEqual = function(e) {
        if (!(e instanceof t)) throw Kr("isEqual", "Query", 1, e);
        return this.firestore === e.firestore && nn(this.c_, e.c_) && this.Kc === e.Kc;
    }, t.prototype.withConverter = function(e) {
        return new t(this.c_, this.firestore, e);
    }, 
    /** Helper function to create a bound from a document or fields */ t.prototype.l_ = function(t, n, r, i) {
        if (Wr(t, 1, n), n instanceof zi) return Vr(t, e.__spreadArrays([ n ], r), 1), function(t, e, n, r, i) {
            if (!r) throw new R(T.NOT_FOUND, "Can't use a DocumentSnapshot that doesn't exist for " + n + "().");
            // Because people expect to continue/end a query at the exact document
            // provided, we need to use the implicit sort order rather than the explicit
            // sort order, because it's guaranteed to contain the document key. That way
            // the position becomes unambiguous and the query continues/ends exactly at
            // the provided document. Without the key (by using the explicit sort
            // orders), multiple documents could match the position, yielding duplicate
            // results.
            for (var o = [], s = 0, u = Xe(t); s < u.length; s++) {
                var a = u[s];
                if (a.field.O()) o.push(Ut(e, r.key)); else {
                    var c = r.field(a.field);
                    if (Et(c)) throw new R(T.INVALID_ARGUMENT, 'Invalid query. You are trying to start or end a query using a document for which the field "' + a.field + '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');
                    if (null === c) {
                        var h = a.field.N();
                        throw new R(T.INVALID_ARGUMENT, "Invalid query. You are trying to start or end a query using a document for which the field '" + h + "' (used as the orderBy) does not exist.");
                    }
                    o.push(c);
                }
            }
            return new gn(o, i);
        }(this.c_, this.firestore.jc, t, n.h_, i);
        var o = [ n ].concat(r);
        return function(t, e, n, r, i, o) {
            // Use explicit order by's because it has to match the query the user made
            var s = t.tn;
            if (i.length > s.length) throw new R(T.INVALID_ARGUMENT, "Too many arguments provided to " + r + "(). The number of arguments must be less than or equal to the number of orderBy() clauses");
            for (var u = [], a = 0; a < i.length; a++) {
                var c = i[a];
                if (s[a].field.O()) {
                    if ("string" != typeof c) throw new R(T.INVALID_ARGUMENT, "Invalid query. Expected a string for document ID in " + r + "(), but got a " + typeof c);
                    if (!Ye(t) && -1 !== c.indexOf("/")) throw new R(T.INVALID_ARGUMENT, "Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to " + r + "() must be a plain document ID, but '" + c + "' contains a slash.");
                    var h = t.path.child(O.$(c));
                    if (!U.W(h)) throw new R(T.INVALID_ARGUMENT, "Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to " + r + "() must result in a valid document path, but '" + h + "' is not because it contains an odd number of segments.");
                    var f = new U(h);
                    u.push(Ut(e, f));
                } else {
                    var l = Ii(n, r, c);
                    u.push(l);
                }
            }
            return new gn(u, o);
        }(this.c_, this.firestore.jc, this.firestore.Gl, t, o, i);
    }, t.prototype.onSnapshot = function() {
        for (var t, e, n, r = this, i = [], o = 0; o < arguments.length; o++) i[o] = arguments[o];
        Sr("Query.onSnapshot", arguments, 1, 4);
        var s = {}, u = 0;
        if ("object" != typeof i[u] || kr(i[u]) || (Qr("Query.onSnapshot", s = i[u], [ "includeMetadataChanges" ]), 
        qr("Query.onSnapshot", "boolean", "includeMetadataChanges", s.includeMetadataChanges), 
        u++), kr(i[u])) {
            var a = i[u];
            i[u] = null === (t = a.next) || void 0 === t ? void 0 : t.bind(a), i[u + 1] = null === (e = a.error) || void 0 === e ? void 0 : e.bind(a), 
            i[u + 2] = null === (n = a.complete) || void 0 === n ? void 0 : n.bind(a);
        } else Mr("Query.onSnapshot", "function", u, i[u]), Cr("Query.onSnapshot", "function", u + 1, i[u + 1]), 
        Cr("Query.onSnapshot", "function", u + 2, i[u + 2]);
        var c = {
            next: function(t) {
                i[u] && i[u](new Zi(r.firestore, r.c_, t, r.Kc));
            },
            error: i[u + 1],
            complete: i[u + 2]
        };
        return Xi(this.c_), this.firestore.ql().listen(this.c_, s, c);
    }, t.prototype.get = function(t) {
        var e = this;
        Sr("Query.get", arguments, 0, 1), ro("Query.get", t), Xi(this.c_);
        var n = this.firestore.ql();
        return (t && "cache" === t.source ? n.yl(this.c_) : n.pl(this.c_, t)).then((function(t) {
            return new Zi(e.firestore, e.c_, t, e.Kc);
        }));
    }, t;
}(), Zi = /** @class */ function() {
    function t(t, e, n, r) {
        this.e_ = t, this.__ = e, this.f_ = n, this.Kc = r, this.d_ = null, this.w_ = null, 
        this.metadata = new Bi(n.hasPendingWrites, n.fromCache);
    }
    return Object.defineProperty(t.prototype, "docs", {
        get: function() {
            var t = [];
            return this.forEach((function(e) {
                return t.push(e);
            })), t;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "empty", {
        get: function() {
            return this.f_.docs._();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "size", {
        get: function() {
            return this.f_.docs.size;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.forEach = function(t, e) {
        var n = this;
        Sr("QuerySnapshot.forEach", arguments, 1, 2), Mr("QuerySnapshot.forEach", "function", 1, t), 
        this.f_.docs.forEach((function(r) {
            t.call(e, n.T_(r, n.metadata.fromCache, n.f_.Mt.has(r.key)));
        }));
    }, Object.defineProperty(t.prototype, "query", {
        get: function() {
            return new Ji(this.__, this.e_, this.Kc);
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.docChanges = function(t) {
        t && (Qr("QuerySnapshot.docChanges", t, [ "includeMetadataChanges" ]), qr("QuerySnapshot.docChanges", "boolean", "includeMetadataChanges", t.includeMetadataChanges));
        var e = !(!t || !t.includeMetadataChanges);
        if (e && this.f_.Ut) throw new R(T.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
        return this.d_ && this.w_ === e || (this.d_ = 
        /**
     * Calculates the array of firestore.DocumentChange's for a given ViewSnapshot.
     *
     * Exported for testing.
     *
     * @param snapshot The ViewSnapshot that represents the expected state.
     * @param includeMetadataChanges Whether to include metadata changes.
     * @param converter A factory function that returns a QueryDocumentSnapshot.
     * @return An objecyt that matches the firestore.DocumentChange API.
     */
        function(t, e, n) {
            if (t.Ot._()) {
                // Special case the first snapshot because index calculation is easy and
                // fast
                var r = 0;
                return t.docChanges.map((function(e) {
                    var i = n(e.doc, t.fromCache, t.Mt.has(e.doc.key));
                    return e.doc, {
                        type: "added",
                        doc: i,
                        oldIndex: -1,
                        newIndex: r++
                    };
                }));
            }
            // A DocumentSet that is updated incrementally as changes are applied to use
            // to lookup the index of a document.
            var i = t.Ot;
            return t.docChanges.filter((function(t) {
                return e || 3 /* Metadata */ !== t.type;
            })).map((function(e) {
                var r = n(e.doc, t.fromCache, t.Mt.has(e.doc.key)), o = -1, s = -1;
                return 0 /* Added */ !== e.type && (o = i.indexOf(e.doc.key), i = i.delete(e.doc.key)), 
                1 /* Removed */ !== e.type && (s = (i = i.add(e.doc)).indexOf(e.doc.key)), {
                    type: oo(e.type),
                    doc: r,
                    oldIndex: o,
                    newIndex: s
                };
            }));
        }(this.f_, e, this.T_.bind(this)), this.w_ = e), this.d_;
    }, 
    /** Check the equality. The call can be very expensive. */ t.prototype.isEqual = function(e) {
        if (!(e instanceof t)) throw Kr("isEqual", "QuerySnapshot", 1, e);
        return this.e_ === e.e_ && nn(this.__, e.__) && this.f_.isEqual(e.f_) && this.Kc === e.Kc;
    }, t.prototype.T_ = function(t, e, n) {
        return new Wi(this.e_, t.key, t, e, n, this.Kc);
    }, t;
}(), to = /** @class */ function(t) {
    function n(e, n, r) {
        var i = this;
        if ((i = t.call(this, He(e), n, r) || this).m_ = e, e.length % 2 != 1) throw new R(T.INVALID_ARGUMENT, "Invalid collection reference. Collection references must have an odd number of segments, but " + e.N() + " has " + e.length);
        return i;
    }
    return e.__extends(n, t), Object.defineProperty(n.prototype, "id", {
        get: function() {
            return this.c_.path.S();
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(n.prototype, "parent", {
        get: function() {
            var t = this.c_.path.g();
            return t._() ? null : new Fi(new U(t), this.firestore, 
            /* converter= */ null);
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(n.prototype, "path", {
        get: function() {
            return this.c_.path.N();
        },
        enumerable: !1,
        configurable: !0
    }), n.prototype.doc = function(t) {
        Sr("CollectionReference.doc", arguments, 0, 1), 
        // We allow omission of 'pathString' but explicitly prohibit passing in both
        // 'undefined' and 'null'.
        0 === arguments.length && (t = g.t()), Mr("CollectionReference.doc", "non-empty string", 1, t);
        var e = O.$(t);
        return Fi.Zl(this.c_.path.child(e), this.firestore, this.Kc);
    }, n.prototype.add = function(t) {
        Vr("CollectionReference.add", arguments, 1), Mr("CollectionReference.add", "object", 1, this.Kc ? this.Kc.toFirestore(t) : t);
        var e = this.doc();
        return e.set(t).then((function() {
            return e;
        }));
    }, n.prototype.withConverter = function(t) {
        return new n(this.m_, this.firestore, t);
    }, n;
}(Ji);

function eo(t, e) {
    if (void 0 === e) return {
        merge: !1
    };
    if (Qr(t, e, [ "merge", "mergeFields" ]), qr(t, "boolean", "merge", e.merge), function(t, e, n, r, i) {
        void 0 !== r && function(t, e, n, r, i) {
            if (!(r instanceof Array)) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires its " + e + " option to be an array, but it was: " + zr(r));
            for (var o = 0; o < r.length; ++o) if (!i(r[o])) throw new R(T.INVALID_ARGUMENT, "Function " + t + "() requires all " + e + " elements to be " + n + ", but the value at index " + o + " was: " + zr(r[o]));
        }(t, e, n, r, i);
    }(t, "mergeFields", "a string or a FieldPath", e.mergeFields, (function(t) {
        return "string" == typeof t || t instanceof ei;
    })), void 0 !== e.mergeFields && void 0 !== e.merge) throw new R(T.INVALID_ARGUMENT, "Invalid options passed to function " + t + '(): You cannot specify both "merge" and "mergeFields".');
    return e;
}

function no(t, e) {
    return void 0 === e ? {} : (Qr(t, e, [ "serverTimestamps" ]), jr(t, 0, "serverTimestamps", e.serverTimestamps, [ "estimate", "previous", "none" ]), 
    e);
}

function ro(t, e) {
    Cr(t, "object", 1, e), e && (Qr(t, e, [ "source" ]), jr(t, 0, "source", e.source, [ "default", "server", "cache" ]));
}

function io(t, e, n) {
    if (e instanceof di) {
        if (e.firestore !== n) throw new R(T.INVALID_ARGUMENT, "Provided document reference is from a different Firestore instance.");
        return e;
    }
    throw Kr(t, "DocumentReference", 1, e);
}

function oo(t) {
    switch (t) {
      case 0 /* Added */ :
        return "added";

      case 2 /* Modified */ :
      case 3 /* Metadata */ :
        return "modified";

      case 1 /* Removed */ :
        return "removed";

      default:
        return p();
    }
}

/**
 * Converts custom model object of type T into DocumentData by applying the
 * converter if it exists.
 *
 * This function is used when converting user objects to DocumentData
 * because we want to provide the user with a more specific error message if
 * their set() or fails due to invalid data originating from a toFirestore()
 * call.
 */ function so(t, e, n) {
    // Cast to `any` in order to satisfy the union type constraint on
    // toFirestore().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return t ? n && (n.merge || n.mergeFields) ? t.toFirestore(e, n) : t.toFirestore(e) : e;
}

var uo = {
    Firestore: qi,
    GeoPoint: li,
    Timestamp: D,
    Blob: Zr,
    Transaction: ji,
    WriteBatch: Gi,
    DocumentReference: Fi,
    DocumentSnapshot: zi,
    Query: Ji,
    QueryDocumentSnapshot: Wi,
    QuerySnapshot: Zi,
    CollectionReference: to,
    FieldPath: ei,
    FieldValue: hi,
    setLogLevel: qi.setLogLevel,
    CACHE_SIZE_UNLIMITED: Ci
};

/**
 * Configures Firestore as part of the Firebase SDK by calling registerService.
 *
 * @param firebase The FirebaseNamespace to register Firestore with
 * @param firestoreFactory A factory function that returns a new Firestore
 *    instance.
 */
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
/**
 * Registers the memory-only Firestore build with the components framework.
 */ function ao(t) {
    !function(t, e) {
        t.INTERNAL.registerComponent(new s.Component("firestore", (function(t) {
            return function(t, e) {
                return new qi(t, e, new Dr, new Lr);
            }(t.getProvider("app").getImmediate(), t.getProvider("auth-internal"));
        }), "PUBLIC" /* PUBLIC */).setServiceProps(Object.assign({}, uo)));
    }(t), t.registerVersion("@firebase/firestore", "1.16.3");
}

ao(n), exports.__PRIVATE_registerFirestore = ao;
//# sourceMappingURL=index.memory.cjs.js.map
