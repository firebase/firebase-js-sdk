import t from "@firebase/app";

import { Logger as e, LogLevel as n } from "@firebase/logger";

import { base64 as s, isMobileCordova as i, isReactNative as r, isElectron as o, isIE as h, isUWP as a, isBrowserExtension as u } from "@firebase/util";

import { XhrIo as c, EventType as l, ErrorCode as _, createWebChannelTransport as f, WebChannel as d } from "@firebase/webchannel-wrapper";

import { Component as w } from "@firebase/component";

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
const T = new e("@firebase/firestore");

// Helper methods are needed because variables can't be exported as read/write
function m() {
    return T.logLevel;
}

function E(t, ...e) {
    if (T.logLevel <= n.DEBUG) {
        const n = e.map(A);
        T.debug("Firestore (7.17.2): " + t, ...n);
    }
}

function I(t, ...e) {
    if (T.logLevel <= n.ERROR) {
        const n = e.map(A);
        T.error("Firestore (7.17.2): " + t, ...n);
    }
}

function R(t, ...e) {
    if (T.logLevel <= n.WARN) {
        const n = e.map(A);
        T.warn("Firestore (7.17.2): " + t, ...n);
    }
}

/**
 * Converts an additional log parameter to a string representation.
 */ function A(t) {
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
    /** Formats an object as a JSON string, suitable for logging. */
    var e;
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
 */ function P(t = "Unexpected state") {
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
    const e = "FIRESTORE (7.17.2) INTERNAL ASSERTION FAILED: " + t;
    // NOTE: We don't use FirestoreError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
    throw I(e), new Error(e);
}

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * Messages are stripped in production builds.
 */ function V(t, e) {
    t || P();
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
 */ function p(t) {
    // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
    const e = 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "undefined" != typeof self && (self.crypto || self.msCrypto), n = new Uint8Array(t);
    if (e) e.getRandomValues(n); else 
    // Falls back to Math.random
    for (let e = 0; e < t; e++) n[e] = Math.floor(256 * Math.random());
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
 */ class g {
    static t() {
        // Alphanumeric characters
        const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", e = Math.floor(256 / t.length) * t.length;
        // The largest byte value that is a multiple of `char.length`.
                let n = "";
        for (;n.length < 20; ) {
            const s = p(40);
            for (let i = 0; i < s.length; ++i) 
            // Only accept values that are [0, maxMultiple), this ensures they can
            // be evenly mapped to indices of `chars` via a modulo operation.
            n.length < 20 && s[i] < e && (n += t.charAt(s[i] % t.length));
        }
        return n;
    }
}

function v(t, e) {
    return t < e ? -1 : t > e ? 1 : 0;
}

/** Helper to compare arrays using isEqual(). */ function b(t, e, n) {
    return t.length === e.length && t.every((t, s) => n(t, e[s]));
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
 */ class S {
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
    constructor(t, e, n, s, i) {
        this.s = t, this.persistenceKey = e, this.host = n, this.ssl = s, this.forceLongPolling = i;
    }
}

/** The default database name for a project. */
/** Represents the database ID a Firestore client is associated with. */
class C {
    constructor(t, e) {
        this.projectId = t, this.database = e || "(default)";
    }
    get i() {
        return "(default)" === this.database;
    }
    isEqual(t) {
        return t instanceof C && t.projectId === this.projectId && t.database === this.database;
    }
    o(t) {
        return v(this.projectId, t.projectId) || v(this.database, t.database);
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
 */ function D(t) {
    let e = 0;
    for (const n in t) Object.prototype.hasOwnProperty.call(t, n) && e++;
    return e;
}

function F(t, e) {
    for (const n in t) Object.prototype.hasOwnProperty.call(t, n) && e(n, t[n]);
}

function N(t) {
    for (const e in t) if (Object.prototype.hasOwnProperty.call(t, e)) return !1;
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
 */ class $ {
    constructor(t, e) {
        this.h = t, this.u = e, 
        /**
         * The inner map for a key -> value pair. Due to the possibility of
         * collisions we keep a list of entries that we do a linear search through
         * to find an actual match. Note that collisions should be rare, so we still
         * expect near constant time lookups in practice.
         */
        this.l = {};
    }
    /** Get a value for this key, or undefined if it does not exist. */    get(t) {
        const e = this.h(t), n = this.l[e];
        if (void 0 !== n) for (const [e, s] of n) if (this.u(e, t)) return s;
    }
    has(t) {
        return void 0 !== this.get(t);
    }
    /** Put this key and value in the map. */    set(t, e) {
        const n = this.h(t), s = this.l[n];
        if (void 0 !== s) {
            for (let n = 0; n < s.length; n++) if (this.u(s[n][0], t)) return void (s[n] = [ t, e ]);
            s.push([ t, e ]);
        } else this.l[n] = [ [ t, e ] ];
    }
    /**
     * Remove this key from the map. Returns a boolean if anything was deleted.
     */    delete(t) {
        const e = this.h(t), n = this.l[e];
        if (void 0 === n) return !1;
        for (let s = 0; s < n.length; s++) if (this.u(n[s][0], t)) return 1 === n.length ? delete this.l[e] : n.splice(s, 1), 
        !0;
        return !1;
    }
    forEach(t) {
        F(this.l, (e, n) => {
            for (const [e, s] of n) t(e, s);
        });
    }
    _() {
        return N(this.l);
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
 */ const k = {
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
};

/**
 * An error class used for Firestore-generated errors. Ideally we should be
 * using FirebaseError, but integrating with it is overly arduous at the moment,
 * so we define our own compatible error class (with a `name` of 'FirebaseError'
 * and compatible `code` and `message` fields.)
 */ class x extends Error {
    constructor(t, e) {
        super(e), this.code = t, this.message = e, this.name = "FirebaseError", 
        // HACK: We write a toString property directly because Error is not a real
        // class and so inheritance does not work correctly. We could alternatively
        // do the same "back-door inheritance" trick that FirebaseError does.
        this.toString = () => `${this.name}: [code=${this.code}]: ${this.message}`;
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
 */
// The earlist date supported by Firestore timestamps (0001-01-01T00:00:00Z).
class L {
    constructor(t, e) {
        if (this.seconds = t, this.nanoseconds = e, e < 0) throw new x(k.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (e >= 1e9) throw new x(k.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (t < -62135596800) throw new x(k.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
        // This will break in the year 10,000.
                if (t >= 253402300800) throw new x(k.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
    }
    static now() {
        return L.fromMillis(Date.now());
    }
    static fromDate(t) {
        return L.fromMillis(t.getTime());
    }
    static fromMillis(t) {
        const e = Math.floor(t / 1e3);
        return new L(e, 1e6 * (t - 1e3 * e));
    }
    toDate() {
        return new Date(this.toMillis());
    }
    toMillis() {
        return 1e3 * this.seconds + this.nanoseconds / 1e6;
    }
    T(t) {
        return this.seconds === t.seconds ? v(this.nanoseconds, t.nanoseconds) : v(this.seconds, t.seconds);
    }
    isEqual(t) {
        return t.seconds === this.seconds && t.nanoseconds === this.nanoseconds;
    }
    toString() {
        return "Timestamp(seconds=" + this.seconds + ", nanoseconds=" + this.nanoseconds + ")";
    }
    valueOf() {
        // This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
        // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
        // with zeroes to be a consistent length. Strings with this format then have a lexiographical
        // ordering that matches the expected ordering. The <seconds> translation is done to avoid
        // having a leading negative sign (i.e. a leading '-' character) in its string representation,
        // which would affect its lexiographical ordering.
        const t = this.seconds - -62135596800;
        // Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
                return String(t).padStart(12, "0") + "." + String(this.nanoseconds).padStart(9, "0");
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
 */
/**
 * A version of a document in Firestore. This corresponds to the version
 * timestamp, such as update_time or read_time.
 */ class O {
    constructor(t) {
        this.timestamp = t;
    }
    static m(t) {
        return new O(t);
    }
    static min() {
        return new O(new L(0, 0));
    }
    o(t) {
        return this.timestamp.T(t.timestamp);
    }
    isEqual(t) {
        return this.timestamp.isEqual(t.timestamp);
    }
    /** Returns a number representation of the version for use in spec tests. */    I() {
        // Convert to microseconds.
        return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
    }
    toString() {
        return "SnapshotVersion(" + this.timestamp.toString() + ")";
    }
    R() {
        return this.timestamp;
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
 */
/**
 * Path represents an ordered sequence of string segments.
 */
class M {
    constructor(t, e, n) {
        void 0 === e ? e = 0 : e > t.length && P(), void 0 === n ? n = t.length - e : n > t.length - e && P(), 
        this.segments = t, this.offset = e, this.A = n;
    }
    get length() {
        return this.A;
    }
    isEqual(t) {
        return 0 === M.P(this, t);
    }
    child(t) {
        const e = this.segments.slice(this.offset, this.limit());
        return t instanceof M ? t.forEach(t => {
            e.push(t);
        }) : e.push(t), this.V(e);
    }
    /** The index of one past the last segment of the path. */    limit() {
        return this.offset + this.length;
    }
    p(t) {
        return t = void 0 === t ? 1 : t, this.V(this.segments, this.offset + t, this.length - t);
    }
    g() {
        return this.V(this.segments, this.offset, this.length - 1);
    }
    v() {
        return this.segments[this.offset];
    }
    S() {
        return this.get(this.length - 1);
    }
    get(t) {
        return this.segments[this.offset + t];
    }
    _() {
        return 0 === this.length;
    }
    C(t) {
        if (t.length < this.length) return !1;
        for (let e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }
    D(t) {
        if (this.length + 1 !== t.length) return !1;
        for (let e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }
    forEach(t) {
        for (let e = this.offset, n = this.limit(); e < n; e++) t(this.segments[e]);
    }
    F() {
        return this.segments.slice(this.offset, this.limit());
    }
    static P(t, e) {
        const n = Math.min(t.length, e.length);
        for (let s = 0; s < n; s++) {
            const n = t.get(s), i = e.get(s);
            if (n < i) return -1;
            if (n > i) return 1;
        }
        return t.length < e.length ? -1 : t.length > e.length ? 1 : 0;
    }
}

/**
 * A slash-separated path for navigating resources (documents and collections)
 * within Firestore.
 */ class q extends M {
    V(t, e, n) {
        return new q(t, e, n);
    }
    N() {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        return this.F().join("/");
    }
    toString() {
        return this.N();
    }
    /**
     * Creates a resource path from the given slash-delimited string.
     */    static $(t) {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        if (t.indexOf("//") >= 0) throw new x(k.INVALID_ARGUMENT, `Invalid path (${t}). Paths must not contain // in them.`);
        // We may still have an empty segment at the beginning or end if they had a
        // leading or trailing slash (which we allow).
                const e = t.split("/").filter(t => t.length > 0);
        return new q(e);
    }
    static k() {
        return new q([]);
    }
}

const U = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

/** A dot-separated path for navigating sub-objects within a document. */ class B extends M {
    V(t, e, n) {
        return new B(t, e, n);
    }
    /**
     * Returns true if the string could be used as a segment in a field path
     * without escaping.
     */    static L(t) {
        return U.test(t);
    }
    N() {
        return this.F().map(t => (t = t.replace("\\", "\\\\").replace("`", "\\`"), B.L(t) || (t = "`" + t + "`"), 
        t)).join(".");
    }
    toString() {
        return this.N();
    }
    /**
     * Returns true if this field references the key of a document.
     */    O() {
        return 1 === this.length && "__name__" === this.get(0);
    }
    /**
     * The field designating the key of a document.
     */    static M() {
        return new B([ "__name__" ]);
    }
    /**
     * Parses a field string from the given server-formatted string.
     *
     * - Splitting the empty string is not allowed (for now at least).
     * - Empty segments within the string (e.g. if there are two consecutive
     *   separators) are not allowed.
     *
     * TODO(b/37244157): we should make this more strict. Right now, it allows
     * non-identifier path components, even if they aren't escaped.
     */    static q(t) {
        const e = [];
        let n = "", s = 0;
        const i = () => {
            if (0 === n.length) throw new x(k.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            e.push(n), n = "";
        };
        let r = !1;
        for (;s < t.length; ) {
            const e = t[s];
            if ("\\" === e) {
                if (s + 1 === t.length) throw new x(k.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
                const e = t[s + 1];
                if ("\\" !== e && "." !== e && "`" !== e) throw new x(k.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
                n += e, s += 2;
            } else "`" === e ? (r = !r, s++) : "." !== e || r ? (n += e, s++) : (i(), s++);
        }
        if (i(), r) throw new x(k.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
        return new B(e);
    }
    static k() {
        return new B([]);
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
 */ class W {
    constructor(t) {
        this.path = t;
    }
    static U(t) {
        return new W(q.$(t).p(5));
    }
    /** Returns true if the document is in the specified collectionId. */    B(t) {
        return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
    }
    isEqual(t) {
        return null !== t && 0 === q.P(this.path, t.path);
    }
    toString() {
        return this.path.toString();
    }
    static P(t, e) {
        return q.P(t.path, e.path);
    }
    static W(t) {
        return t.length % 2 == 0;
    }
    /**
     * Creates and returns a new document key with the given segments.
     *
     * @param segments The segments of the path to the document
     * @return A new instance of DocumentKey
     */    static j(t) {
        return new W(new q(t.slice()));
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
 */
/**
 * Returns whether a variable is either undefined or null.
 */ function Q(t) {
    return null == t;
}

/** Returns whether the value represents -0. */ function j(t) {
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
class G {
    constructor(t, e = null, n = [], s = [], i = null, r = null, o = null) {
        this.path = t, this.collectionGroup = e, this.orderBy = n, this.filters = s, this.limit = i, 
        this.startAt = r, this.endAt = o, this.G = null;
    }
}

/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */ function K(t, e = null, n = [], s = [], i = null, r = null, o = null) {
    return new G(t, e, n, s, i, r, o);
}

function z(t) {
    const e = y(t);
    if (null === e.G) {
        let t = e.path.N();
        null !== e.collectionGroup && (t += "|cg:" + e.collectionGroup), t += "|f:", t += e.filters.map(t => gn(t)).join(","), 
        t += "|ob:", t += e.orderBy.map(t => {
            return (e = t).field.N() + e.dir;
            var e;
        }).join(","), Q(e.limit) || (t += "|l:", t += e.limit), e.startAt && (t += "|lb:", 
        t += xn(e.startAt)), e.endAt && (t += "|ub:", t += xn(e.endAt)), e.G = t;
    }
    return e.G;
}

function H(t) {
    let e = t.path.N();
    return null !== t.collectionGroup && (e += " collectionGroup=" + t.collectionGroup), 
    t.filters.length > 0 && (e += `, filters: [${t.filters.map(t => {
        return `${(e = t).field.N()} ${e.op} ${Ut(e.value)}`;
        /** Returns a debug description for `filter`. */
        var e;
        /** Filter that matches on key fields (i.e. '__name__'). */    }).join(", ")}]`), 
    Q(t.limit) || (e += ", limit: " + t.limit), t.orderBy.length > 0 && (e += `, orderBy: [${t.orderBy.map(t => {
        return `${(e = t).field.N()} (${e.dir})`;
        var e;
    }).join(", ")}]`), t.startAt && (e += ", startAt: " + xn(t.startAt)), t.endAt && (e += ", endAt: " + xn(t.endAt)), 
    `Target(${e})`;
}

function Y(t, e) {
    if (t.limit !== e.limit) return !1;
    if (t.orderBy.length !== e.orderBy.length) return !1;
    for (let n = 0; n < t.orderBy.length; n++) if (!Un(t.orderBy[n], e.orderBy[n])) return !1;
    if (t.filters.length !== e.filters.length) return !1;
    for (let i = 0; i < t.filters.length; i++) if (n = t.filters[i], s = e.filters[i], 
    n.op !== s.op || !n.field.isEqual(s.field) || !Lt(n.value, s.value)) return !1;
    var n, s;
    return t.collectionGroup === e.collectionGroup && (!!t.path.isEqual(e.path) && (!!On(t.startAt, e.startAt) && On(t.endAt, e.endAt)));
}

function X(t) {
    return W.W(t.path) && null === t.collectionGroup && 0 === t.filters.length;
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
// WebSafe uses a different URL-encoding safe alphabet that doesn't match
// the encoding used on the backend.
/** Converts a Base64 encoded string to a binary string. */
function J(t) {
    return String.fromCharCode.apply(null, 
    // We use `decodeStringToByteArray()` instead of `decodeString()` since
    // `decodeString()` returns Unicode strings, which doesn't match the values
    // returned by `atob()`'s Latin1 representation.
    s.decodeStringToByteArray(t, !1));
}

/** Converts a binary string to a Base64 encoded string. */
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
 */
class Z {
    constructor(t) {
        this.K = t;
    }
    static fromBase64String(t) {
        const e = J(t);
        return new Z(e);
    }
    static fromUint8Array(t) {
        const e = 
        /**
 * Helper function to convert an Uint8array to a binary string.
 */
        function(t) {
            let e = "";
            for (let n = 0; n < t.length; ++n) e += String.fromCharCode(t[n]);
            return e;
        }
        /**
 * Helper function to convert a binary string to an Uint8Array.
 */ (t);
        return new Z(e);
    }
    toBase64() {
        return function(t) {
            const e = [];
            for (let n = 0; n < t.length; n++) e[n] = t.charCodeAt(n);
            return s.encodeByteArray(e, !1);
        }(this.K);
    }
    toUint8Array() {
        return function(t) {
            const e = new Uint8Array(t.length);
            for (let n = 0; n < t.length; n++) e[n] = t.charCodeAt(n);
            return e;
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
 * An immutable set of metadata that the local store tracks for each target.
 */ (this.K);
    }
    H() {
        return 2 * this.K.length;
    }
    o(t) {
        return v(this.K, t.K);
    }
    isEqual(t) {
        return this.K === t.K;
    }
}

Z.Y = new Z("");

class tt {
    constructor(
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
    s, 
    /** The latest snapshot version seen for this target. */
    i = O.min()
    /**
     * The maximum snapshot version at which the associated view
     * contained no limbo documents.
     */ , r = O.min()
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */ , o = Z.Y) {
        this.target = t, this.targetId = e, this.X = n, this.sequenceNumber = s, this.J = i, 
        this.lastLimboFreeSnapshotVersion = r, this.resumeToken = o;
    }
    /** Creates a new target data instance with an updated sequence number. */    Z(t) {
        return new tt(this.target, this.targetId, this.X, t, this.J, this.lastLimboFreeSnapshotVersion, this.resumeToken);
    }
    /**
     * Creates a new target data instance with an updated resume token and
     * snapshot version.
     */    tt(t, e) {
        return new tt(this.target, this.targetId, this.X, this.sequenceNumber, e, this.lastLimboFreeSnapshotVersion, t);
    }
    /**
     * Creates a new target data instance with an updated last limbo free
     * snapshot version number.
     */    et(t) {
        return new tt(this.target, this.targetId, this.X, this.sequenceNumber, this.J, t, this.resumeToken);
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
 */ class et {
    // TODO(b/33078163): just use simplest form of existence filter for now
    constructor(t) {
        this.count = t;
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
 */
/**
 * Error Codes describing the different ways GRPC can fail. These are copied
 * directly from GRPC's sources here:
 *
 * https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
 *
 * Important! The names of these identifiers matter because the string forms
 * are used for reverse lookups from the webchannel stream. Do NOT change the
 * names of these identifiers or change this into a const enum.
 */ var nt, st;

/**
 * Determines whether an error code represents a permanent error when received
 * in response to a non-write operation.
 *
 * See isPermanentWriteError for classifying write errors.
 */
function it(t) {
    switch (t) {
      case k.OK:
        return P();

      case k.CANCELLED:
      case k.UNKNOWN:
      case k.DEADLINE_EXCEEDED:
      case k.RESOURCE_EXHAUSTED:
      case k.INTERNAL:
      case k.UNAVAILABLE:
 // Unauthenticated means something went wrong with our token and we need
        // to retry with new credentials which will happen automatically.
              case k.UNAUTHENTICATED:
        return !1;

      case k.INVALID_ARGUMENT:
      case k.NOT_FOUND:
      case k.ALREADY_EXISTS:
      case k.PERMISSION_DENIED:
      case k.FAILED_PRECONDITION:
 // Aborted might be retried in some scenarios, but that is dependant on
        // the context and should handled individually by the calling code.
        // See https://cloud.google.com/apis/design/errors.
              case k.ABORTED:
      case k.OUT_OF_RANGE:
      case k.UNIMPLEMENTED:
      case k.DATA_LOSS:
        return !0;

      default:
        return P();
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
 */
function rt(t) {
    if (void 0 === t) 
    // This shouldn't normally happen, but in certain error cases (like trying
    // to send invalid proto messages) we may get an error with no GRPC code.
    return I("GRPC error has no .code"), k.UNKNOWN;
    switch (t) {
      case nt.OK:
        return k.OK;

      case nt.CANCELLED:
        return k.CANCELLED;

      case nt.UNKNOWN:
        return k.UNKNOWN;

      case nt.DEADLINE_EXCEEDED:
        return k.DEADLINE_EXCEEDED;

      case nt.RESOURCE_EXHAUSTED:
        return k.RESOURCE_EXHAUSTED;

      case nt.INTERNAL:
        return k.INTERNAL;

      case nt.UNAVAILABLE:
        return k.UNAVAILABLE;

      case nt.UNAUTHENTICATED:
        return k.UNAUTHENTICATED;

      case nt.INVALID_ARGUMENT:
        return k.INVALID_ARGUMENT;

      case nt.NOT_FOUND:
        return k.NOT_FOUND;

      case nt.ALREADY_EXISTS:
        return k.ALREADY_EXISTS;

      case nt.PERMISSION_DENIED:
        return k.PERMISSION_DENIED;

      case nt.FAILED_PRECONDITION:
        return k.FAILED_PRECONDITION;

      case nt.ABORTED:
        return k.ABORTED;

      case nt.OUT_OF_RANGE:
        return k.OUT_OF_RANGE;

      case nt.UNIMPLEMENTED:
        return k.UNIMPLEMENTED;

      case nt.DATA_LOSS:
        return k.DATA_LOSS;

      default:
        return P();
    }
}

/**
 * Converts an HTTP response's error status to the equivalent error code.
 *
 * @param status An HTTP error response status ("FAILED_PRECONDITION",
 * "UNKNOWN", etc.)
 * @returns The equivalent Code. Non-matching responses are mapped to
 *     Code.UNKNOWN.
 */ (st = nt || (nt = {}))[st.OK = 0] = "OK", st[st.CANCELLED = 1] = "CANCELLED", 
st[st.UNKNOWN = 2] = "UNKNOWN", st[st.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", 
st[st.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", st[st.NOT_FOUND = 5] = "NOT_FOUND", 
st[st.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", st[st.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
st[st.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", st[st.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
st[st.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", st[st.ABORTED = 10] = "ABORTED", 
st[st.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", st[st.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
st[st.INTERNAL = 13] = "INTERNAL", st[st.UNAVAILABLE = 14] = "UNAVAILABLE", st[st.DATA_LOSS = 15] = "DATA_LOSS";

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
class ot {
    constructor(t, e) {
        this.P = t, this.root = e || at.EMPTY;
    }
    // Returns a copy of the map, with the specified key/value added or replaced.
    nt(t, e) {
        return new ot(this.P, this.root.nt(t, e, this.P).copy(null, null, at.st, null, null));
    }
    // Returns a copy of the map, with the specified key removed.
    remove(t) {
        return new ot(this.P, this.root.remove(t, this.P).copy(null, null, at.st, null, null));
    }
    // Returns the value of the node with the given key, or null.
    get(t) {
        let e = this.root;
        for (;!e._(); ) {
            const n = this.P(t, e.key);
            if (0 === n) return e.value;
            n < 0 ? e = e.left : n > 0 && (e = e.right);
        }
        return null;
    }
    // Returns the index of the element in this sorted map, or -1 if it doesn't
    // exist.
    indexOf(t) {
        // Number of nodes that were pruned when descending right
        let e = 0, n = this.root;
        for (;!n._(); ) {
            const s = this.P(t, n.key);
            if (0 === s) return e + n.left.size;
            s < 0 ? n = n.left : (
            // Count all nodes left of the node plus the node itself
            e += n.left.size + 1, n = n.right);
        }
        // Node not found
                return -1;
    }
    _() {
        return this.root._();
    }
    // Returns the total number of nodes in the map.
    get size() {
        return this.root.size;
    }
    // Returns the minimum key in the map.
    it() {
        return this.root.it();
    }
    // Returns the maximum key in the map.
    rt() {
        return this.root.rt();
    }
    // Traverses the map in key order and calls the specified action function
    // for each key/value pair. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    ot(t) {
        return this.root.ot(t);
    }
    forEach(t) {
        this.ot((e, n) => (t(e, n), !1));
    }
    toString() {
        const t = [];
        return this.ot((e, n) => (t.push(`${e}:${n}`), !1)), `{${t.join(", ")}}`;
    }
    // Traverses the map in reverse key order and calls the specified action
    // function for each key/value pair. If action returns true, traversal is
    // aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    ht(t) {
        return this.root.ht(t);
    }
    // Returns an iterator over the SortedMap.
    at() {
        return new ht(this.root, null, this.P, !1);
    }
    ut(t) {
        return new ht(this.root, t, this.P, !1);
    }
    ct() {
        return new ht(this.root, null, this.P, !0);
    }
    lt(t) {
        return new ht(this.root, t, this.P, !0);
    }
}

 // end SortedMap
// An iterator over an LLRBNode.
class ht {
    constructor(t, e, n, s) {
        this._t = s, this.ft = [];
        let i = 1;
        for (;!t._(); ) if (i = e ? n(t.key, e) : 1, 
        // flip the comparison if we're going in reverse
        s && (i *= -1), i < 0) 
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
    dt() {
        let t = this.ft.pop();
        const e = {
            key: t.key,
            value: t.value
        };
        if (this._t) for (t = t.left; !t._(); ) this.ft.push(t), t = t.right; else for (t = t.right; !t._(); ) this.ft.push(t), 
        t = t.left;
        return e;
    }
    wt() {
        return this.ft.length > 0;
    }
    Tt() {
        if (0 === this.ft.length) return null;
        const t = this.ft[this.ft.length - 1];
        return {
            key: t.key,
            value: t.value
        };
    }
}

 // end SortedMapIterator
// Represents a node in a Left-leaning Red-Black tree.
class at {
    constructor(t, e, n, s, i) {
        this.key = t, this.value = e, this.color = null != n ? n : at.RED, this.left = null != s ? s : at.EMPTY, 
        this.right = null != i ? i : at.EMPTY, this.size = this.left.size + 1 + this.right.size;
    }
    // Returns a copy of the current node, optionally replacing pieces of it.
    copy(t, e, n, s, i) {
        return new at(null != t ? t : this.key, null != e ? e : this.value, null != n ? n : this.color, null != s ? s : this.left, null != i ? i : this.right);
    }
    _() {
        return !1;
    }
    // Traverses the tree in key order and calls the specified action function
    // for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    ot(t) {
        return this.left.ot(t) || t(this.key, this.value) || this.right.ot(t);
    }
    // Traverses the tree in reverse key order and calls the specified action
    // function for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    ht(t) {
        return this.right.ht(t) || t(this.key, this.value) || this.left.ht(t);
    }
    // Returns the minimum node in the tree.
    min() {
        return this.left._() ? this : this.left.min();
    }
    // Returns the maximum key in the tree.
    it() {
        return this.min().key;
    }
    // Returns the maximum key in the tree.
    rt() {
        return this.right._() ? this.key : this.right.rt();
    }
    // Returns new tree, with the key/value added.
    nt(t, e, n) {
        let s = this;
        const i = n(t, s.key);
        return s = i < 0 ? s.copy(null, null, null, s.left.nt(t, e, n), null) : 0 === i ? s.copy(null, e, null, null, null) : s.copy(null, null, null, null, s.right.nt(t, e, n)), 
        s.Et();
    }
    It() {
        if (this.left._()) return at.EMPTY;
        let t = this;
        return t.left.Rt() || t.left.left.Rt() || (t = t.At()), t = t.copy(null, null, null, t.left.It(), null), 
        t.Et();
    }
    // Returns new tree, with the specified item removed.
    remove(t, e) {
        let n, s = this;
        if (e(t, s.key) < 0) s.left._() || s.left.Rt() || s.left.left.Rt() || (s = s.At()), 
        s = s.copy(null, null, null, s.left.remove(t, e), null); else {
            if (s.left.Rt() && (s = s.Pt()), s.right._() || s.right.Rt() || s.right.left.Rt() || (s = s.Vt()), 
            0 === e(t, s.key)) {
                if (s.right._()) return at.EMPTY;
                n = s.right.min(), s = s.copy(n.key, n.value, null, null, s.right.It());
            }
            s = s.copy(null, null, null, null, s.right.remove(t, e));
        }
        return s.Et();
    }
    Rt() {
        return this.color;
    }
    // Returns new tree after performing any needed rotations.
    Et() {
        let t = this;
        return t.right.Rt() && !t.left.Rt() && (t = t.yt()), t.left.Rt() && t.left.left.Rt() && (t = t.Pt()), 
        t.left.Rt() && t.right.Rt() && (t = t.pt()), t;
    }
    At() {
        let t = this.pt();
        return t.right.left.Rt() && (t = t.copy(null, null, null, null, t.right.Pt()), t = t.yt(), 
        t = t.pt()), t;
    }
    Vt() {
        let t = this.pt();
        return t.left.left.Rt() && (t = t.Pt(), t = t.pt()), t;
    }
    yt() {
        const t = this.copy(null, null, at.RED, null, this.right.left);
        return this.right.copy(null, null, this.color, t, null);
    }
    Pt() {
        const t = this.copy(null, null, at.RED, this.left.right, null);
        return this.left.copy(null, null, this.color, null, t);
    }
    pt() {
        const t = this.left.copy(null, null, !this.left.color, null, null), e = this.right.copy(null, null, !this.right.color, null, null);
        return this.copy(null, null, !this.color, t, e);
    }
    // For testing.
    gt() {
        const t = this.vt();
        return Math.pow(2, t) <= this.size + 1;
    }
    // In a balanced RB tree, the black-depth (number of black nodes) from root to
    // leaves is equal on both sides.  This function verifies that or asserts.
    vt() {
        if (this.Rt() && this.left.Rt()) throw P();
        if (this.right.Rt()) throw P();
        const t = this.left.vt();
        if (t !== this.right.vt()) throw P();
        return t + (this.Rt() ? 0 : 1);
    }
}

 // end LLRBNode
// Empty node is shared between all LLRB trees.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
at.EMPTY = null, at.RED = !0, at.st = !1;

// end LLRBEmptyNode
at.EMPTY = new 
// Represents an empty node (a leaf node in the Red-Black Tree).
class {
    constructor() {
        this.size = 0;
    }
    get key() {
        throw P();
    }
    get value() {
        throw P();
    }
    get color() {
        throw P();
    }
    get left() {
        throw P();
    }
    get right() {
        throw P();
    }
    // Returns a copy of the current node.
    copy(t, e, n, s, i) {
        return this;
    }
    // Returns a copy of the tree, with the specified key/value added.
    nt(t, e, n) {
        return new at(t, e);
    }
    // Returns a copy of the tree, with the specified key removed.
    remove(t, e) {
        return this;
    }
    _() {
        return !0;
    }
    ot(t) {
        return !1;
    }
    ht(t) {
        return !1;
    }
    it() {
        return null;
    }
    rt() {
        return null;
    }
    Rt() {
        return !1;
    }
    // For testing.
    gt() {
        return !0;
    }
    vt() {
        return 0;
    }
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
 * SortedSet is an immutable (copy-on-write) collection that holds elements
 * in order specified by the provided comparator.
 *
 * NOTE: if provided comparator returns 0 for two elements, we consider them to
 * be equal!
 */
class ut {
    constructor(t) {
        this.P = t, this.data = new ot(this.P);
    }
    has(t) {
        return null !== this.data.get(t);
    }
    first() {
        return this.data.it();
    }
    last() {
        return this.data.rt();
    }
    get size() {
        return this.data.size;
    }
    indexOf(t) {
        return this.data.indexOf(t);
    }
    /** Iterates elements in order defined by "comparator" */    forEach(t) {
        this.data.ot((e, n) => (t(e), !1));
    }
    /** Iterates over `elem`s such that: range[0] <= elem < range[1]. */    bt(t, e) {
        const n = this.data.ut(t[0]);
        for (;n.wt(); ) {
            const s = n.dt();
            if (this.P(s.key, t[1]) >= 0) return;
            e(s.key);
        }
    }
    /**
     * Iterates over `elem`s such that: start <= elem until false is returned.
     */    St(t, e) {
        let n;
        for (n = void 0 !== e ? this.data.ut(e) : this.data.at(); n.wt(); ) {
            if (!t(n.dt().key)) return;
        }
    }
    /** Finds the least element greater than or equal to `elem`. */    Ct(t) {
        const e = this.data.ut(t);
        return e.wt() ? e.dt().key : null;
    }
    at() {
        return new ct(this.data.at());
    }
    ut(t) {
        return new ct(this.data.ut(t));
    }
    /** Inserts or updates an element */    add(t) {
        return this.copy(this.data.remove(t).nt(t, !0));
    }
    /** Deletes an element */    delete(t) {
        return this.has(t) ? this.copy(this.data.remove(t)) : this;
    }
    _() {
        return this.data._();
    }
    Dt(t) {
        let e = this;
        // Make sure `result` always refers to the larger one of the two sets.
                return e.size < t.size && (e = t, t = this), t.forEach(t => {
            e = e.add(t);
        }), e;
    }
    isEqual(t) {
        if (!(t instanceof ut)) return !1;
        if (this.size !== t.size) return !1;
        const e = this.data.at(), n = t.data.at();
        for (;e.wt(); ) {
            const t = e.dt().key, s = n.dt().key;
            if (0 !== this.P(t, s)) return !1;
        }
        return !0;
    }
    F() {
        const t = [];
        return this.forEach(e => {
            t.push(e);
        }), t;
    }
    toString() {
        const t = [];
        return this.forEach(e => t.push(e)), "SortedSet(" + t.toString() + ")";
    }
    copy(t) {
        const e = new ut(this.P);
        return e.data = t, e;
    }
}

class ct {
    constructor(t) {
        this.Ft = t;
    }
    dt() {
        return this.Ft.dt().key;
    }
    wt() {
        return this.Ft.wt();
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
 */ const lt = new ot(W.P);

function _t() {
    return lt;
}

function ft() {
    return _t();
}

const dt = new ot(W.P);

function wt() {
    return dt;
}

const Tt = new ot(W.P);

const mt = new ut(W.P);

function Et(...t) {
    let e = mt;
    for (const n of t) e = e.add(n);
    return e;
}

const It = new ut(v);

function Rt() {
    return It;
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
 */ class At {
    /** The default ordering is by key if the comparator is omitted */
    constructor(t) {
        // We are adding document key comparator to the end as it's the only
        // guaranteed unique property of a document.
        this.P = t ? (e, n) => t(e, n) || W.P(e.key, n.key) : (t, e) => W.P(t.key, e.key), 
        this.Nt = wt(), this.$t = new ot(this.P);
    }
    /**
     * Returns an empty copy of the existing DocumentSet, using the same
     * comparator.
     */    static kt(t) {
        return new At(t.P);
    }
    has(t) {
        return null != this.Nt.get(t);
    }
    get(t) {
        return this.Nt.get(t);
    }
    first() {
        return this.$t.it();
    }
    last() {
        return this.$t.rt();
    }
    _() {
        return this.$t._();
    }
    /**
     * Returns the index of the provided key in the document set, or -1 if the
     * document key is not present in the set;
     */    indexOf(t) {
        const e = this.Nt.get(t);
        return e ? this.$t.indexOf(e) : -1;
    }
    get size() {
        return this.$t.size;
    }
    /** Iterates documents in order defined by "comparator" */    forEach(t) {
        this.$t.ot((e, n) => (t(e), !1));
    }
    /** Inserts or updates a document with the same key */    add(t) {
        // First remove the element if we have it.
        const e = this.delete(t.key);
        return e.copy(e.Nt.nt(t.key, t), e.$t.nt(t, null));
    }
    /** Deletes a document with a given key */    delete(t) {
        const e = this.get(t);
        return e ? this.copy(this.Nt.remove(t), this.$t.remove(e)) : this;
    }
    isEqual(t) {
        if (!(t instanceof At)) return !1;
        if (this.size !== t.size) return !1;
        const e = this.$t.at(), n = t.$t.at();
        for (;e.wt(); ) {
            const t = e.dt().key, s = n.dt().key;
            if (!t.isEqual(s)) return !1;
        }
        return !0;
    }
    toString() {
        const t = [];
        return this.forEach(e => {
            t.push(e.toString());
        }), 0 === t.length ? "DocumentSet ()" : "DocumentSet (\n  " + t.join("  \n") + "\n)";
    }
    copy(t, e) {
        const n = new At;
        return n.P = this.P, n.Nt = t, n.$t = e, n;
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
 */
/**
 * DocumentChangeSet keeps track of a set of changes to docs in a query, merging
 * duplicate events for the same doc.
 */ class Pt {
    constructor() {
        this.xt = new ot(W.P);
    }
    track(t) {
        const e = t.doc.key, n = this.xt.get(e);
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
        P() : this.xt = this.xt.nt(e, t);
    }
    Lt() {
        const t = [];
        return this.xt.ot((e, n) => {
            t.push(n);
        }), t;
    }
}

class Vt {
    constructor(t, e, n, s, i, r, o, h) {
        this.query = t, this.docs = e, this.Ot = n, this.docChanges = s, this.Mt = i, this.fromCache = r, 
        this.qt = o, this.Ut = h;
    }
    /** Returns a view snapshot as if all documents in the snapshot were added. */    static Bt(t, e, n, s) {
        const i = [];
        return e.forEach(t => {
            i.push({
                type: 0 /* Added */ ,
                doc: t
            });
        }), new Vt(t, e, At.kt(e), i, n, s, 
        /* syncStateChanged= */ !0, 
        /* excludesMetadataChanges= */ !1);
    }
    get hasPendingWrites() {
        return !this.Mt._();
    }
    isEqual(t) {
        if (!(this.fromCache === t.fromCache && this.qt === t.qt && this.Mt.isEqual(t.Mt) && Rn(this.query, t.query) && this.docs.isEqual(t.docs) && this.Ot.isEqual(t.Ot))) return !1;
        const e = this.docChanges, n = t.docChanges;
        if (e.length !== n.length) return !1;
        for (let t = 0; t < e.length; t++) if (e[t].type !== n[t].type || !e[t].doc.isEqual(n[t].doc)) return !1;
        return !0;
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
 */
/**
 * An event from the RemoteStore. It is split into targetChanges (changes to the
 * state or the set of documents in our watched targets) and documentUpdates
 * (changes to the actual documents).
 */ class yt {
    constructor(
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
    s, 
    /**
     * A set of which document updates are due only to limbo resolution targets.
     */
    i) {
        this.J = t, this.Wt = e, this.Qt = n, this.jt = s, this.Gt = i;
    }
    /**
     * HACK: Views require RemoteEvents in order to determine whether the view is
     * CURRENT, but secondary tabs don't receive remote events. So this method is
     * used to create a synthesized RemoteEvent that can be used to apply a
     * CURRENT status change to a View, for queries executed in a different tab.
     */
    // PORTING NOTE: Multi-tab only
    static Kt(t, e) {
        const n = new Map;
        return n.set(t, pt.zt(t, e)), new yt(O.min(), n, Rt(), _t(), Et());
    }
}

/**
 * A TargetChange specifies the set of changes for a specific target as part of
 * a RemoteEvent. These changes track which documents are added, modified or
 * removed, as well as the target's resume token and whether the target is
 * marked CURRENT.
 * The actual changes *to* documents are not part of the TargetChange since
 * documents may be part of multiple targets.
 */ class pt {
    constructor(
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
    s, 
    /**
     * The set of documents that were removed from this target as part of this
     * remote event.
     */
    i) {
        this.resumeToken = t, this.Ht = e, this.Yt = n, this.Xt = s, this.Jt = i;
    }
    /**
     * This method is used to create a synthesized TargetChanges that can be used to
     * apply a CURRENT status change to a View (for queries executed in a different
     * tab) or for new queries (to raise snapshots with correct CURRENT status).
     */    static zt(t, e) {
        return new pt(Z.Y, e, Et(), Et(), Et());
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
 */
/**
 * Represents a changed document and a list of target ids to which this change
 * applies.
 *
 * If document has been deleted NoDocument will be provided.
 */ class gt {
    constructor(
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
    s) {
        this.Zt = t, this.removedTargetIds = e, this.key = n, this.te = s;
    }
}

class vt {
    constructor(t, e) {
        this.targetId = t, this.ee = e;
    }
}

class bt {
    constructor(
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
    n = Z.Y
    /** An RPC error indicating why the watch failed. */ , s = null) {
        this.state = t, this.targetIds = e, this.resumeToken = n, this.cause = s;
    }
}

/** Tracks the internal state of a Watch target. */ class St {
    constructor() {
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
        this.se = Ft(), 
        /** See public getters for explanations of these fields. */
        this.ie = Z.Y, this.re = !1, 
        /**
         * Whether this target state should be included in the next snapshot. We
         * initialize to true so that newly-added targets are included in the next
         * RemoteEvent.
         */
        this.oe = !0;
    }
    /**
     * Whether this target has been marked 'current'.
     *
     * 'Current' has special meaning in the RPC protocol: It implies that the
     * Watch backend has sent us all changes up to the point at which the target
     * was added and that the target is consistent with the rest of the watch
     * stream.
     */    get Ht() {
        return this.re;
    }
    /** The last resume token sent to us for this target. */    get resumeToken() {
        return this.ie;
    }
    /** Whether this target has pending target adds or target removes. */    get he() {
        return 0 !== this.ne;
    }
    /** Whether we have modified any state that should trigger a snapshot. */    get ae() {
        return this.oe;
    }
    /**
     * Applies the resume token to the TargetChange, but only when it has a new
     * value. Empty resumeTokens are discarded.
     */    ue(t) {
        t.H() > 0 && (this.oe = !0, this.ie = t);
    }
    /**
     * Creates a target change from the current set of changes.
     *
     * To reset the document changes after raising this snapshot, call
     * `clearPendingChanges()`.
     */    ce() {
        let t = Et(), e = Et(), n = Et();
        return this.se.forEach((s, i) => {
            switch (i) {
              case 0 /* Added */ :
                t = t.add(s);
                break;

              case 2 /* Modified */ :
                e = e.add(s);
                break;

              case 1 /* Removed */ :
                n = n.add(s);
                break;

              default:
                P();
            }
        }), new pt(this.ie, this.re, t, e, n);
    }
    /**
     * Resets the document changes and sets `hasPendingChanges` to false.
     */    le() {
        this.oe = !1, this.se = Ft();
    }
    _e(t, e) {
        this.oe = !0, this.se = this.se.nt(t, e);
    }
    fe(t) {
        this.oe = !0, this.se = this.se.remove(t);
    }
    de() {
        this.ne += 1;
    }
    we() {
        this.ne -= 1;
    }
    Te() {
        this.oe = !0, this.re = !0;
    }
}

/**
 * A helper class to accumulate watch changes into a RemoteEvent.
 */
class Ct {
    constructor(t) {
        this.me = t, 
        /** The internal state of all tracked targets. */
        this.Ee = new Map, 
        /** Keeps track of the documents to update since the last raised snapshot. */
        this.Ie = _t(), 
        /** A mapping of document keys to their set of target IDs. */
        this.Re = Dt(), 
        /**
         * A list of targets with existence filter mismatches. These targets are
         * known to be inconsistent and their listens needs to be re-established by
         * RemoteStore.
         */
        this.Ae = new ut(v);
    }
    /**
     * Processes and adds the DocumentWatchChange to the current set of changes.
     */    Pe(t) {
        for (const e of t.Zt) t.te instanceof an ? this.Ve(e, t.te) : t.te instanceof un && this.ye(e, t.key, t.te);
        for (const e of t.removedTargetIds) this.ye(e, t.key, t.te);
    }
    /** Processes and adds the WatchTargetChange to the current set of changes. */    pe(t) {
        this.ge(t, e => {
            const n = this.ve(e);
            switch (t.state) {
              case 0 /* NoChange */ :
                this.be(e) && n.ue(t.resumeToken);
                break;

              case 1 /* Added */ :
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                n.we(), n.he || 
                // We have a freshly added target, so we need to reset any state
                // that we had previously. This can happen e.g. when remove and add
                // back a target for existence filter mismatches.
                n.le(), n.ue(t.resumeToken);
                break;

              case 2 /* Removed */ :
                // We need to keep track of removed targets to we can post-filter and
                // remove any target changes.
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                n.we(), n.he || this.removeTarget(e);
                break;

              case 3 /* Current */ :
                this.be(e) && (n.Te(), n.ue(t.resumeToken));
                break;

              case 4 /* Reset */ :
                this.be(e) && (
                // Reset the target and synthesizes removes for all existing
                // documents. The backend will re-add any documents that still
                // match the target before it sends the next global snapshot.
                this.Se(e), n.ue(t.resumeToken));
                break;

              default:
                P();
            }
        });
    }
    /**
     * Iterates over all targetIds that the watch change applies to: either the
     * targetIds explicitly listed in the change or the targetIds of all currently
     * active targets.
     */    ge(t, e) {
        t.targetIds.length > 0 ? t.targetIds.forEach(e) : this.Ee.forEach((t, n) => {
            this.be(n) && e(n);
        });
    }
    /**
     * Handles existence filters and synthesizes deletes for filter mismatches.
     * Targets that are invalidated by filter mismatches are added to
     * `pendingTargetResets`.
     */    Ce(t) {
        const e = t.targetId, n = t.ee.count, s = this.De(e);
        if (s) {
            const t = s.target;
            if (X(t)) if (0 === n) {
                // The existence filter told us the document does not exist. We deduce
                // that this document does not exist and apply a deleted document to
                // our updates. Without applying this deleted document there might be
                // another query that will raise this document as part of a snapshot
                // until it is resolved, essentially exposing inconsistency between
                // queries.
                const n = new W(t.path);
                this.ye(e, n, new un(n, O.min()));
            } else V(1 === n); else {
                this.Fe(e) !== n && (
                // Existence filter mismatch: We reset the mapping and raise a new
                // snapshot with `isFromCache:true`.
                this.Se(e), this.Ae = this.Ae.add(e));
            }
        }
    }
    /**
     * Converts the currently accumulated state into a remote event at the
     * provided snapshot version. Resets the accumulated changes before returning.
     */    Ne(t) {
        const e = new Map;
        this.Ee.forEach((n, s) => {
            const i = this.De(s);
            if (i) {
                if (n.Ht && X(i.target)) {
                    // Document queries for document that don't exist can produce an empty
                    // result set. To update our local cache, we synthesize a document
                    // delete if we have not previously received the document. This
                    // resolves the limbo state of the document, removing it from
                    // limboDocumentRefs.
                    // TODO(dimond): Ideally we would have an explicit lookup target
                    // instead resulting in an explicit delete message and we could
                    // remove this special logic.
                    const e = new W(i.target.path);
                    null !== this.Ie.get(e) || this.$e(s, e) || this.ye(s, e, new un(e, t));
                }
                n.ae && (e.set(s, n.ce()), n.le());
            }
        });
        let n = Et();
        // We extract the set of limbo-only document updates as the GC logic
        // special-cases documents that do not appear in the target cache.
        
        // TODO(gsoltis): Expand on this comment once GC is available in the JS
        // client.
                this.Re.forEach((t, e) => {
            let s = !0;
            e.St(t => {
                const e = this.De(t);
                return !e || 2 /* LimboResolution */ === e.X || (s = !1, !1);
            }), s && (n = n.add(t));
        });
        const s = new yt(t, e, this.Ae, this.Ie, n);
        return this.Ie = _t(), this.Re = Dt(), this.Ae = new ut(v), s;
    }
    /**
     * Adds the provided document to the internal list of document updates and
     * its document key to the given target's mapping.
     */
    // Visible for testing.
    Ve(t, e) {
        if (!this.be(t)) return;
        const n = this.$e(t, e.key) ? 2 /* Modified */ : 0 /* Added */;
        this.ve(t)._e(e.key, n), this.Ie = this.Ie.nt(e.key, e), this.Re = this.Re.nt(e.key, this.ke(e.key).add(t));
    }
    /**
     * Removes the provided document from the target mapping. If the
     * document no longer matches the target, but the document's state is still
     * known (e.g. we know that the document was deleted or we received the change
     * that caused the filter mismatch), the new document can be provided
     * to update the remote document cache.
     */
    // Visible for testing.
    ye(t, e, n) {
        if (!this.be(t)) return;
        const s = this.ve(t);
        this.$e(t, e) ? s._e(e, 1 /* Removed */) : 
        // The document may have entered and left the target before we raised a
        // snapshot, so we can just ignore the change.
        s.fe(e), this.Re = this.Re.nt(e, this.ke(e).delete(t)), n && (this.Ie = this.Ie.nt(e, n));
    }
    removeTarget(t) {
        this.Ee.delete(t);
    }
    /**
     * Returns the current count of documents in the target. This includes both
     * the number of documents that the LocalStore considers to be part of the
     * target as well as any accumulated changes.
     */    Fe(t) {
        const e = this.ve(t).ce();
        return this.me.xe(t).size + e.Yt.size - e.Jt.size;
    }
    /**
     * Increment the number of acks needed from watch before we can consider the
     * server to be 'in-sync' with the client's active targets.
     */    de(t) {
        this.ve(t).de();
    }
    ve(t) {
        let e = this.Ee.get(t);
        return e || (e = new St, this.Ee.set(t, e)), e;
    }
    ke(t) {
        let e = this.Re.get(t);
        return e || (e = new ut(v), this.Re = this.Re.nt(t, e)), e;
    }
    /**
     * Verifies that the user is still interested in this target (by calling
     * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
     * from watch.
     */    be(t) {
        const e = null !== this.De(t);
        return e || E("WatchChangeAggregator", "Detected inactive target", t), e;
    }
    /**
     * Returns the TargetData for an active target (i.e. a target that the user
     * is still interested in that has no outstanding target change requests).
     */    De(t) {
        const e = this.Ee.get(t);
        return e && e.he ? null : this.me.Le(t);
    }
    /**
     * Resets the state of a Watch target to its initial state (e.g. sets
     * 'current' to false, clears the resume token and removes its target mapping
     * from all documents).
     */    Se(t) {
        this.Ee.set(t, new St);
        this.me.xe(t).forEach(e => {
            this.ye(t, e, /*updatedDocument=*/ null);
        });
    }
    /**
     * Returns whether the LocalStore considers the document to be part of the
     * specified target.
     */    $e(t, e) {
        return this.me.xe(t).has(e);
    }
}

function Dt() {
    return new ot(W.P);
}

function Ft() {
    return new ot(W.P);
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
 */ function Nt(t) {
    var e, n;
    return "server_timestamp" === (null === (n = ((null === (e = null == t ? void 0 : t.mapValue) || void 0 === e ? void 0 : e.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
}

/**
 * Creates a new ServerTimestamp proto value (using the internal format).
 */
/**
 * Returns the local time at which this timestamp was first set.
 */
function $t(t) {
    const e = Wt(t.mapValue.fields.__local_write_time__.timestampValue);
    return new L(e.seconds, e.nanos);
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
const kt = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

/** Extracts the backend's type order for the provided value. */ function xt(t) {
    return "nullValue" in t ? 0 /* NullValue */ : "booleanValue" in t ? 1 /* BooleanValue */ : "integerValue" in t || "doubleValue" in t ? 2 /* NumberValue */ : "timestampValue" in t ? 3 /* TimestampValue */ : "stringValue" in t ? 5 /* StringValue */ : "bytesValue" in t ? 6 /* BlobValue */ : "referenceValue" in t ? 7 /* RefValue */ : "geoPointValue" in t ? 8 /* GeoPointValue */ : "arrayValue" in t ? 9 /* ArrayValue */ : "mapValue" in t ? Nt(t) ? 4 /* ServerTimestampValue */ : 10 /* ObjectValue */ : P();
}

/** Tests `left` and `right` for equality based on the backend semantics. */ function Lt(t, e) {
    const n = xt(t);
    if (n !== xt(e)) return !1;
    switch (n) {
      case 0 /* NullValue */ :
        return !0;

      case 1 /* BooleanValue */ :
        return t.booleanValue === e.booleanValue;

      case 4 /* ServerTimestampValue */ :
        return $t(t).isEqual($t(e));

      case 3 /* TimestampValue */ :
        return function(t, e) {
            if ("string" == typeof t.timestampValue && "string" == typeof e.timestampValue && t.timestampValue.length === e.timestampValue.length) 
            // Use string equality for ISO 8601 timestamps
            return t.timestampValue === e.timestampValue;
            const n = Wt(t.timestampValue), s = Wt(e.timestampValue);
            return n.seconds === s.seconds && n.nanos === s.nanos;
        }(t, e);

      case 5 /* StringValue */ :
        return t.stringValue === e.stringValue;

      case 6 /* BlobValue */ :
        return function(t, e) {
            return jt(t.bytesValue).isEqual(jt(e.bytesValue));
        }(t, e);

      case 7 /* RefValue */ :
        return t.referenceValue === e.referenceValue;

      case 8 /* GeoPointValue */ :
        return function(t, e) {
            return Qt(t.geoPointValue.latitude) === Qt(e.geoPointValue.latitude) && Qt(t.geoPointValue.longitude) === Qt(e.geoPointValue.longitude);
        }(t, e);

      case 2 /* NumberValue */ :
        return function(t, e) {
            if ("integerValue" in t && "integerValue" in e) return Qt(t.integerValue) === Qt(e.integerValue);
            if ("doubleValue" in t && "doubleValue" in e) {
                const n = Qt(t.doubleValue), s = Qt(e.doubleValue);
                return n === s ? j(n) === j(s) : isNaN(n) && isNaN(s);
            }
            return !1;
        }(t, e);

      case 9 /* ArrayValue */ :
        return b(t.arrayValue.values || [], e.arrayValue.values || [], Lt);

      case 10 /* ObjectValue */ :
        return function(t, e) {
            const n = t.mapValue.fields || {}, s = e.mapValue.fields || {};
            if (D(n) !== D(s)) return !1;
            for (const t in n) if (n.hasOwnProperty(t) && (void 0 === s[t] || !Lt(n[t], s[t]))) return !1;
            return !0;
        }
        /** Returns true if the ArrayValue contains the specified element. */ (t, e);

      default:
        return P();
    }
}

function Ot(t, e) {
    return void 0 !== (t.values || []).find(t => Lt(t, e));
}

function Mt(t, e) {
    const n = xt(t), s = xt(e);
    if (n !== s) return v(n, s);
    switch (n) {
      case 0 /* NullValue */ :
        return 0;

      case 1 /* BooleanValue */ :
        return v(t.booleanValue, e.booleanValue);

      case 2 /* NumberValue */ :
        return function(t, e) {
            const n = Qt(t.integerValue || t.doubleValue), s = Qt(e.integerValue || e.doubleValue);
            return n < s ? -1 : n > s ? 1 : n === s ? 0 : 
            // one or both are NaN.
            isNaN(n) ? isNaN(s) ? 0 : -1 : 1;
        }(t, e);

      case 3 /* TimestampValue */ :
        return qt(t.timestampValue, e.timestampValue);

      case 4 /* ServerTimestampValue */ :
        return qt($t(t), $t(e));

      case 5 /* StringValue */ :
        return v(t.stringValue, e.stringValue);

      case 6 /* BlobValue */ :
        return function(t, e) {
            const n = jt(t), s = jt(e);
            return n.o(s);
        }(t.bytesValue, e.bytesValue);

      case 7 /* RefValue */ :
        return function(t, e) {
            const n = t.split("/"), s = e.split("/");
            for (let t = 0; t < n.length && t < s.length; t++) {
                const e = v(n[t], s[t]);
                if (0 !== e) return e;
            }
            return v(n.length, s.length);
        }(t.referenceValue, e.referenceValue);

      case 8 /* GeoPointValue */ :
        return function(t, e) {
            const n = v(Qt(t.latitude), Qt(e.latitude));
            if (0 !== n) return n;
            return v(Qt(t.longitude), Qt(e.longitude));
        }(t.geoPointValue, e.geoPointValue);

      case 9 /* ArrayValue */ :
        return function(t, e) {
            const n = t.values || [], s = e.values || [];
            for (let t = 0; t < n.length && t < s.length; ++t) {
                const e = Mt(n[t], s[t]);
                if (e) return e;
            }
            return v(n.length, s.length);
        }(t.arrayValue, e.arrayValue);

      case 10 /* ObjectValue */ :
        return function(t, e) {
            const n = t.fields || {}, s = Object.keys(n), i = e.fields || {}, r = Object.keys(i);
            // Even though MapValues are likely sorted correctly based on their insertion
            // order (e.g. when received from the backend), local modifications can bring
            // elements out of order. We need to re-sort the elements to ensure that
            // canonical IDs are independent of insertion order.
            s.sort(), r.sort();
            for (let t = 0; t < s.length && t < r.length; ++t) {
                const e = v(s[t], r[t]);
                if (0 !== e) return e;
                const o = Mt(n[s[t]], i[r[t]]);
                if (0 !== o) return o;
            }
            return v(s.length, r.length);
        }
        /**
 * Generates the canonical ID for the provided field value (as used in Target
 * serialization).
 */ (t.mapValue, e.mapValue);

      default:
        throw P();
    }
}

function qt(t, e) {
    if ("string" == typeof t && "string" == typeof e && t.length === e.length) return v(t, e);
    const n = Wt(t), s = Wt(e), i = v(n.seconds, s.seconds);
    return 0 !== i ? i : v(n.nanos, s.nanos);
}

function Ut(t) {
    return Bt(t);
}

function Bt(t) {
    return "nullValue" in t ? "null" : "booleanValue" in t ? "" + t.booleanValue : "integerValue" in t ? "" + t.integerValue : "doubleValue" in t ? "" + t.doubleValue : "timestampValue" in t ? function(t) {
        const e = Wt(t);
        return `time(${e.seconds},${e.nanos})`;
    }(t.timestampValue) : "stringValue" in t ? t.stringValue : "bytesValue" in t ? jt(t.bytesValue).toBase64() : "referenceValue" in t ? (n = t.referenceValue, 
    W.U(n).toString()) : "geoPointValue" in t ? `geo(${(e = t.geoPointValue).latitude},${e.longitude})` : "arrayValue" in t ? function(t) {
        let e = "[", n = !0;
        for (const s of t.values || []) n ? n = !1 : e += ",", e += Bt(s);
        return e + "]";
    }
    /**
 * Converts the possible Proto values for a timestamp value into a "seconds and
 * nanos" representation.
 */ (t.arrayValue) : "mapValue" in t ? function(t) {
        // Iteration order in JavaScript is not guaranteed. To ensure that we generate
        // matching canonical IDs for identical maps, we need to sort the keys.
        const e = Object.keys(t.fields || {}).sort();
        let n = "{", s = !0;
        for (const i of e) s ? s = !1 : n += ",", n += `${i}:${Bt(t.fields[i])}`;
        return n + "}";
    }(t.mapValue) : P();
    var e, n;
}

function Wt(t) {
    // The json interface (for the browser) will return an iso timestamp string,
    // while the proto js library (for node) will return a
    // google.protobuf.Timestamp instance.
    if (V(!!t), "string" == typeof t) {
        // The date string can have higher precision (nanos) than the Date class
        // (millis), so we do some custom parsing here.
        // Parse the nanos right out of the string.
        let e = 0;
        const n = kt.exec(t);
        if (V(!!n), n[1]) {
            // Pad the fraction out to 9 digits (nanos).
            let t = n[1];
            t = (t + "000000000").substr(0, 9), e = Number(t);
        }
        // Parse the date to get the seconds.
                const s = new Date(t);
        return {
            seconds: Math.floor(s.getTime() / 1e3),
            nanos: e
        };
    }
    return {
        seconds: Qt(t.seconds),
        nanos: Qt(t.nanos)
    };
}

/**
 * Converts the possible Proto types for numbers into a JavaScript number.
 * Returns 0 if the value is not numeric.
 */ function Qt(t) {
    // TODO(bjornick): Handle int64 greater than 53 bits.
    return "number" == typeof t ? t : "string" == typeof t ? Number(t) : 0;
}

/** Converts the possible Proto types for Blobs into a ByteString. */ function jt(t) {
    return "string" == typeof t ? Z.fromBase64String(t) : Z.fromUint8Array(t);
}

/** Returns a reference value for the provided database and key. */ function Gt(t, e) {
    return {
        referenceValue: `projects/${t.projectId}/databases/${t.database}/documents/${e.path.N()}`
    };
}

/** Returns true if `value` is an IntegerValue . */ function Kt(t) {
    return !!t && "integerValue" in t;
}

/** Returns true if `value` is a DoubleValue. */
/** Returns true if `value` is an ArrayValue. */
function zt(t) {
    return !!t && "arrayValue" in t;
}

/** Returns true if `value` is a NullValue. */ function Ht(t) {
    return !!t && "nullValue" in t;
}

/** Returns true if `value` is NaN. */ function Yt(t) {
    return !!t && "doubleValue" in t && isNaN(Number(t.doubleValue));
}

/** Returns true if `value` is a MapValue. */ function Xt(t) {
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
 */ const Jt = (() => {
    const t = {
        asc: "ASCENDING",
        desc: "DESCENDING"
    };
    return t;
})(), Zt = (() => {
    const t = {
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
    };
    return t;
})();

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
class te {
    constructor(t, e) {
        this.s = t, this.Oe = e;
    }
}

/**
 * Returns an IntegerValue for `value`.
 */
function ee(t) {
    return {
        integerValue: "" + t
    };
}

/**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */ function ne(t, e) {
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
        doubleValue: j(e) ? "-0" : e
    };
}

/**
 * Returns a value for a number that's appropriate to put into a proto.
 * The return value is an IntegerValue if it can safely represent the value,
 * otherwise a DoubleValue is returned.
 */ function se(t, e) {
    return function(t) {
        return "number" == typeof t && Number.isInteger(t) && !j(t) && t <= Number.MAX_SAFE_INTEGER && t >= Number.MIN_SAFE_INTEGER;
    }(e) ? ee(e) : ne(t, e);
}

/**
 * Returns a value for a Date that's appropriate to put into a proto.
 */ function ie(t, e) {
    if (t.Oe) {
        return `${new Date(1e3 * e.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "")}.${("000000000" + e.nanoseconds).slice(-9)}Z`;
    }
    return {
        seconds: "" + e.seconds,
        nanos: e.nanoseconds
    };
}

/**
 * Returns a value for bytes that's appropriate to put in a proto.
 *
 * Visible for testing.
 */
function re(t, e) {
    return t.Oe ? e.toBase64() : e.toUint8Array();
}

/**
 * Returns a ByteString based on the proto string value.
 */ function oe(t, e) {
    return ie(t, e.R());
}

function he(t) {
    return V(!!t), O.m(function(t) {
        const e = Wt(t);
        return new L(e.seconds, e.nanos);
    }(t));
}

function ae(t, e) {
    return function(t) {
        return new q([ "projects", t.projectId, "databases", t.database ]);
    }(t).child("documents").child(e).N();
}

function ue(t, e) {
    return ae(t.s, e.path);
}

function ce(t, e) {
    const n = function(t) {
        const e = q.$(t);
        return V(ye(e)), e;
    }(e);
    return V(n.get(1) === t.s.projectId), V(!n.get(3) && !t.s.database || n.get(3) === t.s.database), 
    new W((V((s = n).length > 4 && "documents" === s.get(4)), s.p(5)));
    var s;
    /** Creates an api.Document from key and fields (but no create/update time) */}

function le(t, e) {
    return ae(t.s, e);
}

function _e(t) {
    return new q([ "projects", t.s.projectId, "databases", t.s.database ]).N();
}

function fe(t, e, n) {
    return {
        name: ue(t, e),
        fields: n.proto.mapValue.fields
    };
}

function de(t, e) {
    return "found" in e ? function(t, e) {
        V(!!e.found), e.found.name, e.found.updateTime;
        const n = ce(t, e.found.name), s = he(e.found.updateTime), i = new sn({
            mapValue: {
                fields: e.found.fields
            }
        });
        return new an(n, s, i, {});
    }(t, e) : "missing" in e ? function(t, e) {
        V(!!e.missing), V(!!e.readTime);
        const n = ce(t, e.missing), s = he(e.readTime);
        return new un(n, s);
    }(t, e) : P();
}

function we(t, e) {
    let n;
    if ("targetChange" in e) {
        e.targetChange;
        // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
        // if unset
        const s = function(t) {
            return "NO_CHANGE" === t ? 0 /* NoChange */ : "ADD" === t ? 1 /* Added */ : "REMOVE" === t ? 2 /* Removed */ : "CURRENT" === t ? 3 /* Current */ : "RESET" === t ? 4 /* Reset */ : P();
        }(e.targetChange.targetChangeType || "NO_CHANGE"), i = e.targetChange.targetIds || [], r = function(t, e) {
            return t.Oe ? (V(void 0 === e || "string" == typeof e), Z.fromBase64String(e || "")) : (V(void 0 === e || e instanceof Uint8Array), 
            Z.fromUint8Array(e || new Uint8Array));
        }(t, e.targetChange.resumeToken), o = e.targetChange.cause, h = o && function(t) {
            const e = void 0 === t.code ? k.UNKNOWN : rt(t.code);
            return new x(e, t.message || "");
        }
        /**
 * Returns a value for a number (or null) that's appropriate to put into
 * a google.protobuf.Int32Value proto.
 * DO NOT USE THIS FOR ANYTHING ELSE.
 * This method cheats. It's typed as returning "number" because that's what
 * our generated proto interfaces say Int32Value must be. But GRPC actually
 * expects a { value: <number> } struct.
 */ (o);
        n = new bt(s, i, r, h || null);
    } else if ("documentChange" in e) {
        e.documentChange;
        const s = e.documentChange;
        s.document, s.document.name, s.document.updateTime;
        const i = ce(t, s.document.name), r = he(s.document.updateTime), o = new sn({
            mapValue: {
                fields: s.document.fields
            }
        }), h = new an(i, r, o, {}), a = s.targetIds || [], u = s.removedTargetIds || [];
        n = new gt(a, u, h.key, h);
    } else if ("documentDelete" in e) {
        e.documentDelete;
        const s = e.documentDelete;
        s.document;
        const i = ce(t, s.document), r = s.readTime ? he(s.readTime) : O.min(), o = new un(i, r), h = s.removedTargetIds || [];
        n = new gt([], h, o.key, o);
    } else if ("documentRemove" in e) {
        e.documentRemove;
        const s = e.documentRemove;
        s.document;
        const i = ce(t, s.document), r = s.removedTargetIds || [];
        n = new gt([], r, i, null);
    } else {
        if (!("filter" in e)) return P();
        {
            e.filter;
            const t = e.filter;
            t.targetId;
            const s = t.count || 0, i = new et(s), r = t.targetId;
            n = new vt(r, i);
        }
    }
    return n;
}

function Te(t, e) {
    let n;
    if (e instanceof He) n = {
        update: fe(t, e.key, e.value)
    }; else if (e instanceof en) n = {
        delete: ue(t, e.key)
    }; else if (e instanceof Ye) n = {
        update: fe(t, e.key, e.data),
        updateMask: Ve(e.Me)
    }; else if (e instanceof Je) n = {
        transform: {
            document: ue(t, e.key),
            fieldTransforms: e.fieldTransforms.map(t => function(t, e) {
                const n = e.transform;
                if (n instanceof Se) return {
                    fieldPath: e.field.N(),
                    setToServerValue: "REQUEST_TIME"
                };
                if (n instanceof Ce) return {
                    fieldPath: e.field.N(),
                    appendMissingElements: {
                        values: n.elements
                    }
                };
                if (n instanceof Fe) return {
                    fieldPath: e.field.N(),
                    removeAllFromArray: {
                        values: n.elements
                    }
                };
                if (n instanceof $e) return {
                    fieldPath: e.field.N(),
                    increment: n.qe
                };
                throw P();
            }(0, t))
        }
    }; else {
        if (!(e instanceof nn)) return P();
        n = {
            verify: ue(t, e.key)
        };
    }
    return e.Be.Ue || (n.currentDocument = function(t, e) {
        return void 0 !== e.updateTime ? {
            updateTime: oe(t, e.updateTime)
        } : void 0 !== e.exists ? {
            exists: e.exists
        } : P();
    }(t, e.Be)), n;
}

function me(t, e) {
    return t && t.length > 0 ? (V(void 0 !== e), t.map(t => function(t, e) {
        // NOTE: Deletes don't have an updateTime.
        let n = t.updateTime ? he(t.updateTime) : he(e);
        n.isEqual(O.min()) && (
        // The Firestore Emulator currently returns an update time of 0 for
        // deletes of non-existing documents (rather than null). This breaks the
        // test "get deleted doc while offline with source=cache" as NoDocuments
        // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
        // TODO(#2149): Remove this when Emulator is fixed
        n = he(e));
        let s = null;
        return t.transformResults && t.transformResults.length > 0 && (s = t.transformResults), 
        new qe(n, s);
    }(t, e))) : [];
}

function Ee(t, e) {
    return {
        documents: [ le(t, e.path) ]
    };
}

function Ie(t, e) {
    // Dissect the path into parent, collectionId, and optional key filter.
    const n = {
        structuredQuery: {}
    }, s = e.path;
    null !== e.collectionGroup ? (n.parent = le(t, s), n.structuredQuery.from = [ {
        collectionId: e.collectionGroup,
        allDescendants: !0
    } ]) : (n.parent = le(t, s.g()), n.structuredQuery.from = [ {
        collectionId: s.S()
    } ]);
    const i = function(t) {
        if (0 === t.length) return;
        const e = t.map(t => 
        // visible for testing
        function(t) {
            if ("==" /* EQUAL */ === t.op) {
                if (Yt(t.value)) return {
                    unaryFilter: {
                        field: Pe(t.field),
                        op: "IS_NAN"
                    }
                };
                if (Ht(t.value)) return {
                    unaryFilter: {
                        field: Pe(t.field),
                        op: "IS_NULL"
                    }
                };
            } else if ("!=" /* NOT_EQUAL */ === t.op) {
                if (Yt(t.value)) return {
                    unaryFilter: {
                        field: Pe(t.field),
                        op: "IS_NOT_NAN"
                    }
                };
                if (Ht(t.value)) return {
                    unaryFilter: {
                        field: Pe(t.field),
                        op: "IS_NOT_NULL"
                    }
                };
            }
            return {
                fieldFilter: {
                    field: Pe(t.field),
                    op: (e = t.op, Zt[e]),
                    value: t.value
                }
            };
            // visible for testing
            var e;
        }(t));
        if (1 === e.length) return e[0];
        return {
            compositeFilter: {
                op: "AND",
                filters: e
            }
        };
    }(e.filters);
    i && (n.structuredQuery.where = i);
    const r = function(t) {
        if (0 === t.length) return;
        return t.map(t => {
            return {
                field: Pe((e = t).field),
                direction: (n = e.dir, Jt[n])
            };
            // visible for testing
            var e, n;
        });
    }(e.orderBy);
    r && (n.structuredQuery.orderBy = r);
    const o = function(t, e) {
        return t.Oe || Q(e) ? e : {
            value: e
        };
    }(t, e.limit);
    return null !== o && (n.structuredQuery.limit = o), e.startAt && (n.structuredQuery.startAt = Ae(e.startAt)), 
    e.endAt && (n.structuredQuery.endAt = Ae(e.endAt)), n;
}

function Re(t, e) {
    const n = function(t, e) {
        switch (e) {
          case 0 /* Listen */ :
            return null;

          case 1 /* ExistenceFilterMismatch */ :
            return "existence-filter-mismatch";

          case 2 /* LimboResolution */ :
            return "limbo-document";

          default:
            return P();
        }
    }(0, e.X);
    return null == n ? null : {
        "goog-listen-tags": n
    };
}

function Ae(t) {
    return {
        before: t.before,
        values: t.position
    };
}

// visible for testing
function Pe(t) {
    return {
        fieldPath: t.N()
    };
}

function Ve(t) {
    const e = [];
    return t.fields.forEach(t => e.push(t.N())), {
        fieldPaths: e
    };
}

function ye(t) {
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
/** Represents a transform within a TransformMutation. */ class pe {
    constructor() {
        // Make sure that the structural type of `TransformOperation` is unique.
        // See https://github.com/microsoft/TypeScript/issues/5451
        this.We = void 0;
    }
}

/**
 * Computes the local transform result against the provided `previousValue`,
 * optionally using the provided localWriteTime.
 */ function ge(t, e, n) {
    return t instanceof Se ? function(t, e) {
        const n = {
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
    }
    /**
 * Returns the value of the field before this ServerTimestamp was set.
 *
 * Preserving the previous values allows the user to display the last resoled
 * value until the backend responds with the timestamp.
 */ (n, e) : t instanceof Ce ? De(t, e) : t instanceof Fe ? Ne(t, e) : function(t, e) {
        // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
        // precision and resolves overflows by reducing precision, we do not
        // manually cap overflows at 2^63.
        const n = be(t, e), s = ke(n) + ke(t.qe);
        return Kt(n) && Kt(t.qe) ? ee(s) : ne(t.serializer, s);
    }(t, e);
}

/**
 * Computes a final transform result after the transform has been acknowledged
 * by the server, potentially using the server-provided transformResult.
 */ function ve(t, e, n) {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return t instanceof Ce ? De(t, e) : t instanceof Fe ? Ne(t, e) : n;
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
 */ function be(t, e) {
    return t instanceof $e ? Kt(n = e) || function(t) {
        return !!t && "doubleValue" in t;
    }
    /** Returns true if `value` is either an IntegerValue or a DoubleValue. */ (n) ? e : {
        integerValue: 0
    } : null;
    var n;
}

/** Transforms a value into a server-generated timestamp. */
class Se extends pe {}

/** Transforms an array value via a union operation. */ class Ce extends pe {
    constructor(t) {
        super(), this.elements = t;
    }
}

function De(t, e) {
    const n = xe(e);
    for (const e of t.elements) n.some(t => Lt(t, e)) || n.push(e);
    return {
        arrayValue: {
            values: n
        }
    };
}

/** Transforms an array value via a remove operation. */ class Fe extends pe {
    constructor(t) {
        super(), this.elements = t;
    }
}

function Ne(t, e) {
    let n = xe(e);
    for (const e of t.elements) n = n.filter(t => !Lt(t, e));
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
 */ class $e extends pe {
    constructor(t, e) {
        super(), this.serializer = t, this.qe = e;
    }
}

function ke(t) {
    return Qt(t.integerValue || t.doubleValue);
}

function xe(t) {
    return zt(t) && t.arrayValue.values ? t.arrayValue.values.slice() : [];
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
 */ class Le {
    constructor(t) {
        this.fields = t, 
        // TODO(dimond): validation of FieldMask
        // Sort the field mask to support `FieldMask.isEqual()` and assert below.
        t.sort(B.P);
    }
    /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */    Qe(t) {
        for (const e of this.fields) if (e.C(t)) return !0;
        return !1;
    }
    isEqual(t) {
        return b(this.fields, t.fields, (t, e) => t.isEqual(e));
    }
}

/** A field path and the TransformOperation to perform upon it. */ class Oe {
    constructor(t, e) {
        this.field = t, this.transform = e;
    }
}

function Me(t, e) {
    return t.field.isEqual(e.field) && function(t, e) {
        return t instanceof Ce && e instanceof Ce || t instanceof Fe && e instanceof Fe ? b(t.elements, e.elements, Lt) : t instanceof $e && e instanceof $e ? Lt(t.qe, e.qe) : t instanceof Se && e instanceof Se;
    }(t.transform, e.transform);
}

/** The result of successfully applying a mutation to the backend. */ class qe {
    constructor(
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
    }
}

/**
 * Encodes a precondition for a mutation. This follows the model that the
 * backend accepts with the special case of an explicit "empty" precondition
 * (meaning no precondition).
 */ class Ue {
    constructor(t, e) {
        this.updateTime = t, this.exists = e;
    }
    /** Creates a new empty Precondition. */    static je() {
        return new Ue;
    }
    /** Creates a new Precondition with an exists flag. */    static exists(t) {
        return new Ue(void 0, t);
    }
    /** Creates a new Precondition based on a version a document exists at. */    static updateTime(t) {
        return new Ue(t);
    }
    /** Returns whether this Precondition is empty. */    get Ue() {
        return void 0 === this.updateTime && void 0 === this.exists;
    }
    isEqual(t) {
        return this.exists === t.exists && (this.updateTime ? !!t.updateTime && this.updateTime.isEqual(t.updateTime) : !t.updateTime);
    }
}

/**
 * Returns true if the preconditions is valid for the given document
 * (or null if no document is available).
 */ function Be(t, e) {
    return void 0 !== t.updateTime ? e instanceof an && e.version.isEqual(t.updateTime) : void 0 === t.exists || t.exists === e instanceof an;
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
 */ class We {}

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
 */ function Qe(t, e, n) {
    return t instanceof He ? function(t, e, n) {
        // Unlike applySetMutationToLocalView, if we're applying a mutation to a
        // remote document the server has accepted the mutation so the precondition
        // must have held.
        return new an(t.key, n.version, t.value, {
            hasCommittedMutations: !0
        });
    }(t, 0, n) : t instanceof Ye ? function(t, e, n) {
        if (!Be(t.Be, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new cn(t.key, n.version);
        const s = Xe(t, e);
        return new an(t.key, n.version, s, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : t instanceof Je ? function(t, e, n) {
        if (V(null != n.transformResults), !Be(t.Be, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new cn(t.key, n.version);
        const s = Ze(t, e), i = 
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
            const s = [];
            V(t.length === n.length);
            for (let i = 0; i < n.length; i++) {
                const r = t[i], o = r.transform;
                let h = null;
                e instanceof an && (h = e.field(r.field)), s.push(ve(o, h, n[i]));
            }
            return s;
        }
        /**
 * Creates a list of "transform results" (a transform result is a field value
 * representing the result of applying a transform) for use when applying a
 * TransformMutation locally.
 *
 * @param fieldTransforms The field transforms to apply the result to.
 * @param localWriteTime The local time of the transform mutation (used to
 *     generate ServerTimestampValues).
 * @param maybeDoc The current state of the document after applying all
 *     previous mutations.
 * @param baseDoc The document prior to applying this mutation batch.
 * @return The transform results list.
 */ (t.fieldTransforms, e, n.transformResults), r = n.version, o = tn(t, s.data(), i);
        return new an(t.key, r, o, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : function(t, e, n) {
        // Unlike applyToLocalView, if we're applying a mutation to a remote
        // document the server has accepted the mutation so the precondition must
        // have held.
        return new un(t.key, n.version, {
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
 */ function je(t, e, n, s) {
    return t instanceof He ? function(t, e) {
        if (!Be(t.Be, e)) return e;
        const n = ze(e);
        return new an(t.key, n, t.value, {
            Ge: !0
        });
    }
    /**
 * A mutation that modifies fields of the document at the given key with the
 * given values. The values are applied through a field mask:
 *
 *  * When a field is in both the mask and the values, the corresponding field
 *    is updated.
 *  * When a field is in neither the mask nor the values, the corresponding
 *    field is unmodified.
 *  * When a field is in the mask but not in the values, the corresponding field
 *    is deleted.
 *  * When a field is not in the mask but is in the values, the values map is
 *    ignored.
 */ (t, e) : t instanceof Ye ? function(t, e) {
        if (!Be(t.Be, e)) return e;
        const n = ze(e), s = Xe(t, e);
        return new an(t.key, n, s, {
            Ge: !0
        });
    }
    /**
 * Patches the data of document if available or creates a new document. Note
 * that this does not check whether or not the precondition of this patch
 * holds.
 */ (t, e) : t instanceof Je ? function(t, e, n, s) {
        if (!Be(t.Be, e)) return e;
        const i = Ze(t, e), r = function(t, e, n, s) {
            const i = [];
            for (const r of t) {
                const t = r.transform;
                let o = null;
                n instanceof an && (o = n.field(r.field)), null === o && s instanceof an && (
                // If the current document does not contain a value for the mutated
                // field, use the value that existed before applying this mutation
                // batch. This solves an edge case where a PatchMutation clears the
                // values in a nested map before the TransformMutation is applied.
                o = s.field(r.field)), i.push(ge(t, o, e));
            }
            return i;
        }(t.fieldTransforms, n, e, s), o = tn(t, i.data(), r);
        return new an(t.key, i.version, o, {
            Ge: !0
        });
    }(t, e, s, n) : function(t, e) {
        if (!Be(t.Be, e)) return e;
        return new un(t.key, O.min());
    }
    /**
 * A mutation that verifies the existence of the document at the given key with
 * the provided precondition.
 *
 * The `verify` operation is only used in Transactions, and this class serves
 * primarily to facilitate serialization into protos.
 */ (t, e);
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
 */ function Ge(t, e) {
    return t instanceof Je ? function(t, e) {
        let n = null;
        for (const s of t.fieldTransforms) {
            const t = e instanceof an ? e.field(s.field) : void 0, i = be(s.transform, t || null);
            null != i && (n = null == n ? (new rn).set(s.field, i) : n.set(s.field, i));
        }
        return n ? n.Ke() : null;
    }
    /**
 * Asserts that the given MaybeDocument is actually a Document and verifies
 * that it matches the key for this mutation. Since we only support
 * transformations with precondition exists this method is guaranteed to be
 * safe.
 */ (t, e) : null;
}

function Ke(t, e) {
    return t.type === e.type && (!!t.key.isEqual(e.key) && (!!t.Be.isEqual(e.Be) && (0 /* Set */ === t.type ? t.value.isEqual(e.value) : 1 /* Patch */ === t.type ? t.data.isEqual(e.data) && t.Me.isEqual(e.Me) : 2 /* Transform */ !== t.type || b(t.fieldTransforms, t.fieldTransforms, (t, e) => Me(t, e)))));
}

/**
 * Returns the version from the given document for use as the result of a
 * mutation. Mutations are defined to return the version of the base document
 * only if it is an existing document. Deleted and unknown documents have a
 * post-mutation version of SnapshotVersion.min().
 */ function ze(t) {
    return t instanceof an ? t.version : O.min();
}

/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */ class He extends We {
    constructor(t, e, n) {
        super(), this.key = t, this.value = e, this.Be = n, this.type = 0 /* Set */;
    }
}

class Ye extends We {
    constructor(t, e, n, s) {
        super(), this.key = t, this.data = e, this.Me = n, this.Be = s, this.type = 1 /* Patch */;
    }
}

function Xe(t, e) {
    let n;
    return n = e instanceof an ? e.data() : sn.empty(), function(t, e) {
        const n = new rn(e);
        return t.Me.fields.forEach(e => {
            if (!e._()) {
                const s = t.data.field(e);
                null !== s ? n.set(e, s) : n.delete(e);
            }
        }), n.Ke();
    }
    /**
 * A mutation that modifies specific fields of the document with transform
 * operations. Currently the only supported transform is a server timestamp, but
 * IP Address, increment(n), etc. could be supported in the future.
 *
 * It is somewhat similar to a PatchMutation in that it patches specific fields
 * and has no effect when applied to a null or NoDocument (see comment on
 * Mutation for rationale).
 */ (t, n);
}

class Je extends We {
    constructor(t, e) {
        super(), this.key = t, this.fieldTransforms = e, this.type = 2 /* Transform */ , 
        // NOTE: We set a precondition of exists: true as a safety-check, since we
        // always combine TransformMutations with a SetMutation or PatchMutation which
        // (if successful) should end up with an existing document.
        this.Be = Ue.exists(!0);
    }
}

function Ze(t, e) {
    return e;
}

function tn(t, e, n) {
    const s = new rn(e);
    for (let e = 0; e < t.fieldTransforms.length; e++) {
        const i = t.fieldTransforms[e];
        s.set(i.field, n[e]);
    }
    return s.Ke();
}

/** A mutation that deletes the document at the given key. */ class en extends We {
    constructor(t, e) {
        super(), this.key = t, this.Be = e, this.type = 3 /* Delete */;
    }
}

class nn extends We {
    constructor(t, e) {
        super(), this.key = t, this.Be = e, this.type = 4 /* Verify */;
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
 */
/**
 * An ObjectValue represents a MapValue in the Firestore Proto and offers the
 * ability to add and remove fields (via the ObjectValueBuilder).
 */ class sn {
    constructor(t) {
        this.proto = t;
    }
    static empty() {
        return new sn({
            mapValue: {}
        });
    }
    /**
     * Returns the value at the given path or null.
     *
     * @param path the path to search
     * @return The value at the path or if there it doesn't exist.
     */    field(t) {
        if (t._()) return this.proto;
        {
            let e = this.proto;
            for (let n = 0; n < t.length - 1; ++n) {
                if (!e.mapValue.fields) return null;
                if (e = e.mapValue.fields[t.get(n)], !Xt(e)) return null;
            }
            return e = (e.mapValue.fields || {})[t.S()], e || null;
        }
    }
    isEqual(t) {
        return Lt(this.proto, t.proto);
    }
}

/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue.
 */ class rn {
    /**
     * @param baseObject The object to mutate.
     */
    constructor(t = sn.empty()) {
        this.ze = t, 
        /** A map that contains the accumulated changes in this builder. */
        this.He = new Map;
    }
    /**
     * Sets the field to the provided value.
     *
     * @param path The field path to set.
     * @param value The value to set.
     * @return The current Builder instance.
     */    set(t, e) {
        return this.Ye(t, e), this;
    }
    /**
     * Removes the field at the specified path. If there is no field at the
     * specified path, nothing is changed.
     *
     * @param path The field path to remove.
     * @return The current Builder instance.
     */    delete(t) {
        return this.Ye(t, null), this;
    }
    /**
     * Adds `value` to the overlay map at `path`. Creates nested map entries if
     * needed.
     */    Ye(t, e) {
        let n = this.He;
        for (let e = 0; e < t.length - 1; ++e) {
            const s = t.get(e);
            let i = n.get(s);
            i instanceof Map ? 
            // Re-use a previously created map
            n = i : i && 10 /* ObjectValue */ === xt(i) ? (
            // Convert the existing Protobuf MapValue into a map
            i = new Map(Object.entries(i.mapValue.fields || {})), n.set(s, i), n = i) : (
            // Create an empty map to represent the current nesting level
            i = new Map, n.set(s, i), n = i);
        }
        n.set(t.S(), e);
    }
    /** Returns an ObjectValue with all mutations applied. */    Ke() {
        const t = this.Xe(B.k(), this.He);
        return null != t ? new sn(t) : this.ze;
    }
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
     */    Xe(t, e) {
        let n = !1;
        const s = this.ze.field(t), i = Xt(s) ? // If there is already data at the current path, base our
        Object.assign({}, s.mapValue.fields) : {};
        return e.forEach((e, s) => {
            if (e instanceof Map) {
                const r = this.Xe(t.child(s), e);
                null != r && (i[s] = r, n = !0);
            } else null !== e ? (i[s] = e, n = !0) : i.hasOwnProperty(s) && (delete i[s], n = !0);
        }), n ? {
            mapValue: {
                fields: i
            }
        } : null;
    }
}

/**
 * Returns a FieldMask built from all fields in a MapValue.
 */ function on(t) {
    const e = [];
    return F(t.fields || {}, (t, n) => {
        const s = new B([ t ]);
        if (Xt(n)) {
            const t = on(n.mapValue).fields;
            if (0 === t.length) 
            // Preserve the empty map by adding it to the FieldMask.
            e.push(s); else 
            // For nested and non-empty ObjectValues, add the FieldPath of the
            // leaf nodes.
            for (const n of t) e.push(s.child(n));
        } else 
        // For nested and non-empty ObjectValues, add the FieldPath of the leaf
        // nodes.
        e.push(s);
    }), new Le(e);
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
 * The result of a lookup for a given path may be an existing document or a
 * marker that this document does not exist at a given version.
 */ class hn {
    constructor(t, e) {
        this.key = t, this.version = e;
    }
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */ class an extends hn {
    constructor(t, e, n, s) {
        super(t, e), this.Je = n, this.Ge = !!s.Ge, this.hasCommittedMutations = !!s.hasCommittedMutations;
    }
    field(t) {
        return this.Je.field(t);
    }
    data() {
        return this.Je;
    }
    Ze() {
        return this.Je.proto;
    }
    isEqual(t) {
        return t instanceof an && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.Ge === t.Ge && this.hasCommittedMutations === t.hasCommittedMutations && this.Je.isEqual(t.Je);
    }
    toString() {
        return `Document(${this.key}, ${this.version}, ${this.Je.toString()}, {hasLocalMutations: ${this.Ge}}), {hasCommittedMutations: ${this.hasCommittedMutations}})`;
    }
    get hasPendingWrites() {
        return this.Ge || this.hasCommittedMutations;
    }
}

/**
 * Compares the value for field `field` in the provided documents. Throws if
 * the field does not exist in both documents.
 */
/**
 * A class representing a deleted document.
 * Version is set to 0 if we don't point to any specific time, otherwise it
 * denotes time we know it didn't exist at.
 */
class un extends hn {
    constructor(t, e, n) {
        super(t, e), this.hasCommittedMutations = !(!n || !n.hasCommittedMutations);
    }
    toString() {
        return `NoDocument(${this.key}, ${this.version})`;
    }
    get hasPendingWrites() {
        return this.hasCommittedMutations;
    }
    isEqual(t) {
        return t instanceof un && t.hasCommittedMutations === this.hasCommittedMutations && t.version.isEqual(this.version) && t.key.isEqual(this.key);
    }
}

/**
 * A class representing an existing document whose data is unknown (e.g. a
 * document that was updated without a known base document).
 */ class cn extends hn {
    toString() {
        return `UnknownDocument(${this.key}, ${this.version})`;
    }
    get hasPendingWrites() {
        return !0;
    }
    isEqual(t) {
        return t instanceof cn && t.version.isEqual(this.version) && t.key.isEqual(this.key);
    }
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
 * Casts `obj` to `T`. Throws if  `obj` is not an instance of `T`.
 *
 * This cast is used in the Lite and Full SDK to verify instance types for
 * arguments passed to the public API.
 */ function ln(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
e) {
    if (!(t instanceof e)) throw e.name === t.constructor.name ? new x(k.INVALID_ARGUMENT, `Type does not match the expected instance. Did you pass '${e.name}' from a different Firestore SDK?`) : new x(k.INVALID_ARGUMENT, `Expected type '${e.name}', but was '${t.constructor.name}'`);
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
 */ class _n {
    /**
     * Initializes a Query with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     */
    constructor(t, e = null, n = [], s = [], i = null, r = "F" /* First */ , o = null, h = null) {
        this.path = t, this.collectionGroup = e, this.tn = n, this.filters = s, this.limit = i, 
        this.en = r, this.startAt = o, this.endAt = h, this.nn = null, 
        // The corresponding `Target` of this `Query` instance.
        this.sn = null, this.startAt, this.endAt;
    }
    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */    rn(t) {
        return new _n(t, 
        /*collectionGroup=*/ null, this.tn.slice(), this.filters.slice(), this.limit, this.en, this.startAt, this.endAt);
    }
    on() {
        return 0 === this.filters.length && null === this.limit && null == this.startAt && null == this.endAt && (0 === this.tn.length || 1 === this.tn.length && this.tn[0].field.O());
    }
    hn() {
        return !Q(this.limit) && "F" /* First */ === this.en;
    }
    an() {
        return !Q(this.limit) && "L" /* Last */ === this.en;
    }
    un() {
        return this.tn.length > 0 ? this.tn[0].field : null;
    }
    cn() {
        for (const t of this.filters) if (t.ln()) return t.field;
        return null;
    }
    _n(t) {
        for (const e of this.filters) if (t.indexOf(e.op) >= 0) return e.op;
        return null;
    }
}

/** Creates a new Query for a query that matches all documents at `path` */ function fn(t) {
    return new _n(t);
}

/**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */
function dn(t) {
    return null !== t.collectionGroup;
}

/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */ function wn(t) {
    const e = ln(t, _n);
    if (null === e.nn) {
        e.nn = [];
        const t = e.cn(), n = e.un();
        if (null !== t && null === n) 
        // In order to implicitly add key ordering, we must also add the
        // inequality filter field for it to be a valid query.
        // Note that the default inequality field and key ordering is ascending.
        t.O() || e.nn.push(new Mn(t)), e.nn.push(new Mn(B.M(), "asc" /* ASCENDING */)); else {
            let t = !1;
            for (const n of e.tn) e.nn.push(n), n.field.O() && (t = !0);
            if (!t) {
                // The order of the implicit key ordering always matches the last
                // explicit order by
                const t = e.tn.length > 0 ? e.tn[e.tn.length - 1].dir : "asc" /* ASCENDING */;
                e.nn.push(new Mn(B.M(), t));
            }
        }
    }
    return e.nn;
}

/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */ function Tn(t) {
    const e = ln(t, _n);
    if (!e.sn) if ("F" /* First */ === e.en) e.sn = K(e.path, e.collectionGroup, wn(e), e.filters, e.limit, e.startAt, e.endAt); else {
        // Flip the orderBy directions since we want the last results
        const t = [];
        for (const n of wn(e)) {
            const e = "desc" /* DESCENDING */ === n.dir ? "asc" /* ASCENDING */ : "desc" /* DESCENDING */;
            t.push(new Mn(n.field, e));
        }
        // We need to swap the cursors to match the now-flipped query ordering.
                const n = e.endAt ? new kn(e.endAt.position, !e.endAt.before) : null, s = e.startAt ? new kn(e.startAt.position, !e.startAt.before) : null;
        // Now return as a LimitType.First query.
        e.sn = K(e.path, e.collectionGroup, t, e.filters, e.limit, n, s);
    }
    return e.sn;
}

function mn(t, e, n) {
    return new _n(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), e, n, t.startAt, t.endAt);
}

function En(t, e) {
    return new _n(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), t.limit, t.en, e, t.endAt);
}

function In(t, e) {
    return new _n(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), t.limit, t.en, t.startAt, e);
}

function Rn(t, e) {
    return Y(Tn(t), Tn(e)) && t.en === e.en;
}

// TODO(b/29183165): This is used to get a unique string from a query to, for
// example, use as a dictionary key, but the implementation is subject to
// collisions. Make it collision-free.
function An(t) {
    return `${z(Tn(t))}|lt:${t.en}`;
}

function Pn(t) {
    return `Query(target=${H(Tn(t))}; limitType=${t.en})`;
}

/** Returns whether `doc` matches the constraints of `query`. */ function Vn(t, e) {
    return function(t, e) {
        const n = e.key.path;
        return null !== t.collectionGroup ? e.key.B(t.collectionGroup) && t.path.C(n) : W.W(t.path) ? t.path.isEqual(n) : t.path.D(n);
    }
    /**
 * A document must have a value for every ordering clause in order to show up
 * in the results.
 */ (t, e) && function(t, e) {
        for (const n of t.tn) 
        // order by key always matches
        if (!n.field.O() && null === e.field(n.field)) return !1;
        return !0;
    }(t, e) && function(t, e) {
        for (const n of t.filters) if (!n.matches(e)) return !1;
        return !0;
    }
    /** Makes sure a document is within the bounds, if provided. */ (t, e) && function(t, e) {
        if (t.startAt && !Ln(t.startAt, wn(t), e)) return !1;
        if (t.endAt && Ln(t.endAt, wn(t), e)) return !1;
        return !0;
    }
    /**
 * Returns a new comparator function that can be used to compare two documents
 * based on the Query's ordering constraint.
 */ (t, e);
}

function yn(t) {
    return (e, n) => {
        let s = !1;
        for (const i of wn(t)) {
            const t = qn(i, e, n);
            if (0 !== t) return t;
            s = s || i.field.O();
        }
        return 0;
    };
}

class pn extends class {} {
    constructor(t, e, n) {
        super(), this.field = t, this.op = e, this.value = n;
    }
    /**
     * Creates a filter based on the provided arguments.
     */    static create(t, e, n) {
        if (t.O()) return "in" /* IN */ === e || "not-in" /* NOT_IN */ === e ? this.fn(t, e, n) : new vn(t, e, n);
        if (Ht(n)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new x(k.INVALID_ARGUMENT, "Invalid query. Null supports only equality comparisons.");
            return new pn(t, e, n);
        }
        if (Yt(n)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new x(k.INVALID_ARGUMENT, "Invalid query. NaN supports only equality comparisons.");
            return new pn(t, e, n);
        }
        return "array-contains" /* ARRAY_CONTAINS */ === e ? new Dn(t, n) : "in" /* IN */ === e ? new Fn(t, n) : "not-in" /* NOT_IN */ === e ? new Nn(t, n) : "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e ? new $n(t, n) : new pn(t, e, n);
    }
    static fn(t, e, n) {
        return "in" /* IN */ === e ? new bn(t, n) : new Sn(t, n);
    }
    matches(t) {
        const e = t.field(this.field);
        // Types do not have to match in NOT_EQUAL filters.
                return "!=" /* NOT_EQUAL */ === this.op ? null !== e && this.dn(Mt(e, this.value)) : null !== e && xt(this.value) === xt(e) && this.dn(Mt(e, this.value));
        // Only compare types with matching backend order (such as double and int).
        }
    dn(t) {
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
            return P();
        }
    }
    ln() {
        return [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , ">=" /* GREATER_THAN_OR_EQUAL */ , "!=" /* NOT_EQUAL */ ].indexOf(this.op) >= 0;
    }
}

function gn(t) {
    // TODO(b/29183165): Technically, this won't be unique if two values have
    // the same description, such as the int 3 and the string "3". So we should
    // add the types in here somehow, too.
    return t.field.N() + t.op.toString() + Ut(t.value);
}

class vn extends pn {
    constructor(t, e, n) {
        super(t, e, n), this.key = W.U(n.referenceValue);
    }
    matches(t) {
        const e = W.P(t.key, this.key);
        return this.dn(e);
    }
}

/** Filter that matches on key fields within an array. */ class bn extends pn {
    constructor(t, e) {
        super(t, "in" /* IN */ , e), this.keys = Cn("in" /* IN */ , e);
    }
    matches(t) {
        return this.keys.some(e => e.isEqual(t.key));
    }
}

/** Filter that matches on key fields not present within an array. */ class Sn extends pn {
    constructor(t, e) {
        super(t, "not-in" /* NOT_IN */ , e), this.keys = Cn("not-in" /* NOT_IN */ , e);
    }
    matches(t) {
        return !this.keys.some(e => e.isEqual(t.key));
    }
}

function Cn(t, e) {
    var n;
    return ((null === (n = e.arrayValue) || void 0 === n ? void 0 : n.values) || []).map(t => W.U(t.referenceValue));
}

/** A Filter that implements the array-contains operator. */ class Dn extends pn {
    constructor(t, e) {
        super(t, "array-contains" /* ARRAY_CONTAINS */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return zt(e) && Ot(e.arrayValue, this.value);
    }
}

/** A Filter that implements the IN operator. */ class Fn extends pn {
    constructor(t, e) {
        super(t, "in" /* IN */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return null !== e && Ot(this.value.arrayValue, e);
    }
}

/** A Filter that implements the not-in operator. */ class Nn extends pn {
    constructor(t, e) {
        super(t, "not-in" /* NOT_IN */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return null !== e && !Ot(this.value.arrayValue, e);
    }
}

/** A Filter that implements the array-contains-any operator. */ class $n extends pn {
    constructor(t, e) {
        super(t, "array-contains-any" /* ARRAY_CONTAINS_ANY */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return !(!zt(e) || !e.arrayValue.values) && e.arrayValue.values.some(t => Ot(this.value.arrayValue, t));
    }
}

/**
 * Represents a bound of a query.
 *
 * The bound is specified with the given components representing a position and
 * whether it's just before or just after the position (relative to whatever the
 * query order is).
 *
 * The position represents a logical index position for a query. It's a prefix
 * of values for the (potentially implicit) order by clauses of a query.
 *
 * Bound provides a function to determine whether a document comes before or
 * after a bound. This is influenced by whether the position is just before or
 * just after the provided values.
 */ class kn {
    constructor(t, e) {
        this.position = t, this.before = e;
    }
}

function xn(t) {
    // TODO(b/29183165): Make this collision robust.
    return `${t.before ? "b" : "a"}:${t.position.map(t => Ut(t)).join(",")}`;
}

/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */ function Ln(t, e, n) {
    let s = 0;
    for (let i = 0; i < t.position.length; i++) {
        const r = e[i], o = t.position[i];
        if (r.field.O()) s = W.P(W.U(o.referenceValue), n.key); else {
            s = Mt(o, n.field(r.field));
        }
        if ("desc" /* DESCENDING */ === r.dir && (s *= -1), 0 !== s) break;
    }
    return t.before ? s <= 0 : s < 0;
}

function On(t, e) {
    if (null === t) return null === e;
    if (null === e) return !1;
    if (t.before !== e.before || t.position.length !== e.position.length) return !1;
    for (let n = 0; n < t.position.length; n++) {
        if (!Lt(t.position[n], e.position[n])) return !1;
    }
    return !0;
}

/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */ class Mn {
    constructor(t, e = "asc" /* ASCENDING */) {
        this.field = t, this.dir = e;
    }
}

function qn(t, e, n) {
    const s = t.field.O() ? W.P(e.key, n.key) : function(t, e, n) {
        const s = e.field(t), i = n.field(t);
        return null !== s && null !== i ? Mt(s, i) : P();
    }(t.field, e, n);
    switch (t.dir) {
      case "asc" /* ASCENDING */ :
        return s;

      case "desc" /* DESCENDING */ :
        return -1 * s;

      default:
        return P();
    }
}

function Un(t, e) {
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
 */
class Bn {
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
    constructor(t, e, n, s) {
        this.batchId = t, this.wn = e, this.baseMutations = n, this.mutations = s;
    }
    /**
     * Applies all the mutations in this MutationBatch to the specified document
     * to create a new remote document
     *
     * @param docKey The key of the document to apply mutations to.
     * @param maybeDoc The document to apply mutations to.
     * @param batchResult The result of applying the MutationBatch to the
     * backend.
     */    Tn(t, e, n) {
        const s = n.mn;
        for (let n = 0; n < this.mutations.length; n++) {
            const i = this.mutations[n];
            if (i.key.isEqual(t)) {
                e = Qe(i, e, s[n]);
            }
        }
        return e;
    }
    /**
     * Computes the local view of a document given all the mutations in this
     * batch.
     *
     * @param docKey The key of the document to apply mutations to.
     * @param maybeDoc The document to apply mutations to.
     */    En(t, e) {
        // First, apply the base state. This allows us to apply non-idempotent
        // transform against a consistent set of values.
        for (const n of this.baseMutations) n.key.isEqual(t) && (e = je(n, e, e, this.wn));
        const n = e;
        // Second, apply all user-provided mutations.
                for (const s of this.mutations) s.key.isEqual(t) && (e = je(s, e, n, this.wn));
        return e;
    }
    /**
     * Computes the local view for all provided documents given the mutations in
     * this batch.
     */    In(t) {
        // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
        // directly (as done in `applyToLocalView()`), we can reduce the complexity
        // to O(n).
        let e = t;
        return this.mutations.forEach(n => {
            const s = this.En(n.key, t.get(n.key));
            s && (e = e.nt(n.key, s));
        }), e;
    }
    keys() {
        return this.mutations.reduce((t, e) => t.add(e.key), Et());
    }
    isEqual(t) {
        return this.batchId === t.batchId && b(this.mutations, t.mutations, (t, e) => Ke(t, e)) && b(this.baseMutations, t.baseMutations, (t, e) => Ke(t, e));
    }
}

/** The result of applying a mutation batch to the backend. */ class Wn {
    constructor(t, e, n, 
    /**
     * A pre-computed mapping from each mutated document to the resulting
     * version.
     */
    s) {
        this.batch = t, this.Rn = e, this.mn = n, this.An = s;
    }
    /**
     * Creates a new MutationBatchResult for the given batch and results. There
     * must be one result for each mutation in the batch. This static factory
     * caches a document=>version mapping (docVersions).
     */    static from(t, e, n) {
        V(t.mutations.length === n.length);
        let s = Tt;
        const i = t.mutations;
        for (let t = 0; t < i.length; t++) s = s.nt(i[t].key, n[t].version);
        return new Wn(t, e, n, s);
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
 */
/**
 * PersistencePromise<> is essentially a re-implementation of Promise<> except
 * it has a .next() method instead of .then() and .next() and .catch() callbacks
 * are executed synchronously when a PersistencePromise resolves rather than
 * asynchronously (Promise<> implementations use setImmediate() or similar).
 *
 * This is necessary to interoperate with IndexedDB which will automatically
 * commit transactions if control is returned to the event loop without
 * synchronously initiating another operation on the transaction.
 *
 * NOTE: .then() and .catch() only allow a single consumer, unlike normal
 * Promises.
 */ class Qn {
    constructor(t) {
        // NOTE: next/catchCallback will always point to our own wrapper functions,
        // not the user's raw next() or catch() callbacks.
        this.Pn = null, this.Vn = null, 
        // When the operation resolves, we'll set result or error and mark isDone.
        this.result = void 0, this.error = void 0, this.yn = !1, 
        // Set to true when .then() or .catch() are called and prevents additional
        // chaining.
        this.pn = !1, t(t => {
            this.yn = !0, this.result = t, this.Pn && 
            // value should be defined unless T is Void, but we can't express
            // that in the type system.
            this.Pn(t);
        }, t => {
            this.yn = !0, this.error = t, this.Vn && this.Vn(t);
        });
    }
    catch(t) {
        return this.next(void 0, t);
    }
    next(t, e) {
        return this.pn && P(), this.pn = !0, this.yn ? this.error ? this.gn(e, this.error) : this.vn(t, this.result) : new Qn((n, s) => {
            this.Pn = e => {
                this.vn(t, e).next(n, s);
            }, this.Vn = t => {
                this.gn(e, t).next(n, s);
            };
        });
    }
    bn() {
        return new Promise((t, e) => {
            this.next(t, e);
        });
    }
    Sn(t) {
        try {
            const e = t();
            return e instanceof Qn ? e : Qn.resolve(e);
        } catch (t) {
            return Qn.reject(t);
        }
    }
    vn(t, e) {
        return t ? this.Sn(() => t(e)) : Qn.resolve(e);
    }
    gn(t, e) {
        return t ? this.Sn(() => t(e)) : Qn.reject(e);
    }
    static resolve(t) {
        return new Qn((e, n) => {
            e(t);
        });
    }
    static reject(t) {
        return new Qn((e, n) => {
            n(t);
        });
    }
    static Cn(
    // Accept all Promise types in waitFor().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t) {
        return new Qn((e, n) => {
            let s = 0, i = 0, r = !1;
            t.forEach(t => {
                ++s, t.next(() => {
                    ++i, r && i === s && e();
                }, t => n(t));
            }), r = !0, i === s && e();
        });
    }
    /**
     * Given an array of predicate functions that asynchronously evaluate to a
     * boolean, implements a short-circuiting `or` between the results. Predicates
     * will be evaluated until one of them returns `true`, then stop. The final
     * result will be whether any of them returned `true`.
     */    static Dn(t) {
        let e = Qn.resolve(!1);
        for (const n of t) e = e.next(t => t ? Qn.resolve(t) : n());
        return e;
    }
    static forEach(t, e) {
        const n = [];
        return t.forEach((t, s) => {
            n.push(e.call(this, t, s));
        }), this.Cn(n);
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
 */
/**
 * An in-memory buffer of entries to be written to a RemoteDocumentCache.
 * It can be used to batch up a set of changes to be written to the cache, but
 * additionally supports reading entries back with the `getEntry()` method,
 * falling back to the underlying RemoteDocumentCache if no entry is
 * buffered.
 *
 * Entries added to the cache *must* be read first. This is to facilitate
 * calculating the size delta of the pending changes.
 *
 * PORTING NOTE: This class was implemented then removed from other platforms.
 * If byte-counting ends up being needed on the other platforms, consider
 * porting this class as part of that implementation work.
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
 * A readonly view of the local state of all documents we're tracking (i.e. we
 * have a cached version in remoteDocumentCache or local mutations for the
 * document). The view is computed by applying the mutations in the
 * MutationQueue to the RemoteDocumentCache.
 */
class jn {
    constructor(t, e, n) {
        this.Fn = t, this.Nn = e, this.$n = n;
    }
    /**
     * Get the local view of the document identified by `key`.
     *
     * @return Local view of the document or null if we don't have any cached
     * state for it.
     */    kn(t, e) {
        return this.Nn.xn(t, e).next(n => this.Ln(t, e, n));
    }
    /** Internal version of `getDocument` that allows reusing batches. */    Ln(t, e, n) {
        return this.Fn.On(t, e).next(t => {
            for (const s of n) t = s.En(e, t);
            return t;
        });
    }
    // Returns the view of the given `docs` as they would appear after applying
    // all mutations in the given `batches`.
    Mn(t, e, n) {
        let s = ft();
        return e.forEach((t, e) => {
            for (const s of n) e = s.En(t, e);
            s = s.nt(t, e);
        }), s;
    }
    /**
     * Gets the local view of the documents identified by `keys`.
     *
     * If we don't have cached state for a document in `keys`, a NoDocument will
     * be stored for that key in the resulting set.
     */    qn(t, e) {
        return this.Fn.getEntries(t, e).next(e => this.Un(t, e));
    }
    /**
     * Similar to `getDocuments`, but creates the local view from the given
     * `baseDocs` without retrieving documents from the local store.
     */    Un(t, e) {
        return this.Nn.Bn(t, e).next(n => {
            const s = this.Mn(t, e, n);
            let i = _t();
            return s.forEach((t, e) => {
                // TODO(http://b/32275378): Don't conflate missing / deleted.
                e || (e = new un(t, O.min())), i = i.nt(t, e);
            }), i;
        });
    }
    /**
     * Performs a query against the local view of all documents.
     *
     * @param transaction The persistence transaction.
     * @param query The query to match documents against.
     * @param sinceReadTime If not set to SnapshotVersion.min(), return only
     *     documents that have been read since this snapshot version (exclusive).
     */    Wn(t, e, n) {
        /**
 * Returns whether the query matches a single document by path (rather than a
 * collection).
 */
        return function(t) {
            return W.W(t.path) && null === t.collectionGroup && 0 === t.filters.length;
        }(e) ? this.Qn(t, e.path) : dn(e) ? this.jn(t, e, n) : this.Gn(t, e, n);
    }
    Qn(t, e) {
        // Just do a simple document lookup.
        return this.kn(t, new W(e)).next(t => {
            let e = wt();
            return t instanceof an && (e = e.nt(t.key, t)), e;
        });
    }
    jn(t, e, n) {
        const s = e.collectionGroup;
        let i = wt();
        return this.$n.Kn(t, s).next(r => Qn.forEach(r, r => {
            const o = e.rn(r.child(s));
            return this.Gn(t, o, n).next(t => {
                t.forEach((t, e) => {
                    i = i.nt(t, e);
                });
            });
        }).next(() => i));
    }
    Gn(t, e, n) {
        // Query the remote documents and overlay mutations.
        let s, i;
        return this.Fn.Wn(t, e, n).next(n => (s = n, this.Nn.zn(t, e))).next(e => (i = e, 
        this.Hn(t, i, s).next(t => {
            s = t;
            for (const t of i) for (const e of t.mutations) {
                const n = e.key, i = s.get(n), r = je(e, i, i, t.wn);
                s = r instanceof an ? s.nt(n, r) : s.remove(n);
            }
        }))).next(() => (
        // Finally, filter out any documents that don't actually match
        // the query.
        s.forEach((t, n) => {
            Vn(e, n) || (s = s.remove(t));
        }), s));
    }
    Hn(t, e, n) {
        let s = Et();
        for (const t of e) for (const e of t.mutations) e instanceof Ye && null === n.get(e.key) && (s = s.add(e.key));
        let i = n;
        return this.Fn.getEntries(t, s).next(t => (t.forEach((t, e) => {
            null !== e && e instanceof an && (i = i.nt(t, e));
        }), i));
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
 */
/**
 * A set of changes to what documents are currently in view and out of view for
 * a given query. These changes are sent to the LocalStore by the View (via
 * the SyncEngine) and are used to pin / unpin documents as appropriate.
 */ class Gn {
    constructor(t, e, n, s) {
        this.targetId = t, this.fromCache = e, this.Yn = n, this.Xn = s;
    }
    static Jn(t, e) {
        let n = Et(), s = Et();
        for (const t of e.docChanges) switch (t.type) {
          case 0 /* Added */ :
            n = n.add(t.doc.key);
            break;

          case 1 /* Removed */ :
            s = s.add(t.doc.key);
 // do nothing
                }
        return new Gn(t, e.fromCache, n, s);
    }
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
/**
 * `ListenSequence` is a monotonic sequence. It is initialized with a minimum value to
 * exceed. All subsequent calls to next will return increasing values. If provided with a
 * `SequenceNumberSyncer`, it will additionally bump its next value when told of a new value, as
 * well as write out sequence numbers that it produces via `next()`.
 */ class Kn {
    constructor(t, e) {
        this.previousValue = t, e && (e.Zn = t => this.ts(t), this.es = t => e.ns(t));
    }
    ts(t) {
        return this.previousValue = Math.max(t, this.previousValue), this.previousValue;
    }
    next() {
        const t = ++this.previousValue;
        return this.es && this.es(t), t;
    }
}

Kn.ss = -1;

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
class zn {
    constructor() {
        this.promise = new Promise((t, e) => {
            this.resolve = t, this.reject = e;
        });
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
class Hn {
    constructor(
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
    n = 1e3
    /**
     * The multiplier to use to determine the extended base delay after each
     * attempt.
     */ , s = 1.5
    /**
     * The maximum base delay after which no further backoff is performed.
     * Note that jitter will still be applied, so the actual delay could be as
     * much as 1.5*maxDelayMs.
     */ , i = 6e4) {
        this.rs = t, this.os = e, this.hs = n, this.as = s, this.us = i, this.cs = 0, this.ls = null, 
        /** The last backoff attempt, as epoch milliseconds. */
        this._s = Date.now(), this.reset();
    }
    /**
     * Resets the backoff delay.
     *
     * The very next backoffAndWait() will have no delay. If it is called again
     * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
     * subsequent ones will increase according to the backoffFactor.
     */    reset() {
        this.cs = 0;
    }
    /**
     * Resets the backoff delay to the maximum delay (e.g. for use after a
     * RESOURCE_EXHAUSTED error).
     */    fs() {
        this.cs = this.us;
    }
    /**
     * Returns a promise that resolves after currentDelayMs, and increases the
     * delay for any subsequent attempts. If there was a pending backoff operation
     * already, it will be canceled.
     */    ds(t) {
        // Cancel any pending backoff operation.
        this.cancel();
        // First schedule using the current base (which may be 0 and should be
        // honored as such).
        const e = Math.floor(this.cs + this.ws()), n = Math.max(0, Date.now() - this._s), s = Math.max(0, e - n);
        // Guard against lastAttemptTime being in the future due to a clock change.
                s > 0 && E("ExponentialBackoff", `Backing off for ${s} ms (base delay: ${this.cs} ms, delay with jitter: ${e} ms, last attempt: ${n} ms ago)`), 
        this.ls = this.rs.Ts(this.os, s, () => (this._s = Date.now(), t())), 
        // Apply backoff factor to determine next delay and ensure it is within
        // bounds.
        this.cs *= this.as, this.cs < this.hs && (this.cs = this.hs), this.cs > this.us && (this.cs = this.us);
    }
    ms() {
        null !== this.ls && (this.ls.Es(), this.ls = null);
    }
    cancel() {
        null !== this.ls && (this.ls.cancel(), this.ls = null);
    }
    /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */    ws() {
        return (Math.random() - .5) * this.cs;
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
 */
/** Verifies whether `e` is an IndexedDbTransactionError. */ function Yn(t) {
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
/** The Platform's 'document' implementation or null if not available. */ function Xn() {
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
 */
class Jn {
    constructor(t, e, n, s, i) {
        this.Is = t, this.os = e, this.Rs = n, this.op = s, this.As = i, this.Ps = new zn, 
        this.then = this.Ps.promise.then.bind(this.Ps.promise), 
        // It's normal for the deferred promise to be canceled (due to cancellation)
        // and so we attach a dummy catch callback to avoid
        // 'UnhandledPromiseRejectionWarning' log spam.
        this.Ps.promise.catch(t => {});
    }
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
     */    static Vs(t, e, n, s, i) {
        const r = Date.now() + n, o = new Jn(t, e, r, s, i);
        return o.start(n), o;
    }
    /**
     * Starts the timer. This is called immediately after construction by
     * createAndSchedule().
     */    start(t) {
        this.ys = setTimeout(() => this.ps(), t);
    }
    /**
     * Queues the operation to run immediately (if it hasn't already been run or
     * canceled).
     */    Es() {
        return this.ps();
    }
    /**
     * Cancels the operation if it hasn't already been executed or canceled. The
     * promise will be rejected.
     *
     * As long as the operation has not yet been run, calling cancel() provides a
     * guarantee that the operation will not be run.
     */    cancel(t) {
        null !== this.ys && (this.clearTimeout(), this.Ps.reject(new x(k.CANCELLED, "Operation cancelled" + (t ? ": " + t : ""))));
    }
    ps() {
        this.Is.gs(() => null !== this.ys ? (this.clearTimeout(), this.op().then(t => this.Ps.resolve(t))) : Promise.resolve());
    }
    clearTimeout() {
        null !== this.ys && (this.As(this), clearTimeout(this.ys), this.ys = null);
    }
}

class Zn {
    constructor() {
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
        this.$s = new Hn(this, "async_queue_retry" /* AsyncQueueRetry */), 
        // Visibility handler that triggers an immediate retry of all retryable
        // operations. Meant to speed up recovery when we regain file system access
        // after page comes into foreground.
        this.ks = () => {
            const t = Xn();
            t && E("AsyncQueue", "Visibility state changed to  ", t.visibilityState), this.$s.ms();
        };
        const t = Xn();
        t && "function" == typeof t.addEventListener && t.addEventListener("visibilitychange", this.ks);
    }
    // Is this AsyncQueue being shut down? If true, this instance will not enqueue
    // any new operations, Promises from enqueue requests will not resolve.
    get xs() {
        return this.Ss;
    }
    /**
     * Adds a new operation to the queue without waiting for it to complete (i.e.
     * we ignore the Promise result).
     */    gs(t) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.enqueue(t);
    }
    /**
     * Regardless if the queue has initialized shutdown, adds a new operation to the
     * queue without waiting for it to complete (i.e. we ignore the Promise result).
     */    Ls(t) {
        this.Os(), 
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.Ms(t);
    }
    /**
     * Initialize the shutdown of this queue. Once this method is called, the
     * only possible way to request running an operation is through
     * `enqueueEvenWhileRestricted()`.
     */    qs() {
        if (!this.Ss) {
            this.Ss = !0;
            const t = Xn();
            t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.ks);
        }
    }
    /**
     * Adds a new operation to the queue. Returns a promise that will be resolved
     * when the promise returned by the new operation is (with its value).
     */    enqueue(t) {
        return this.Os(), this.Ss ? new Promise(t => {}) : this.Ms(t);
    }
    /**
     * Enqueue a retryable operation.
     *
     * A retryable operation is rescheduled with backoff if it fails with a
     * IndexedDbTransactionError (the error type used by SimpleDb). All
     * retryable operations are executed in order and only run if all prior
     * operations were retried successfully.
     */    Us(t) {
        this.bs.push(t), this.gs(() => this.Bs());
    }
    /**
     * Runs the next operation from the retryable queue. If the operation fails,
     * reschedules with backoff.
     */    async Bs() {
        if (0 !== this.bs.length) {
            try {
                await this.bs[0](), this.bs.shift(), this.$s.reset();
            } catch (t) {
                if (!Yn(t)) throw t;
 // Failure will be handled by AsyncQueue
                                E("AsyncQueue", "Operation failed with retryable error: " + t);
            }
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
            this.$s.ds(() => this.Bs());
        }
    }
    Ms(t) {
        const e = this.vs.then(() => (this.Fs = !0, t().catch(t => {
            this.Ds = t, this.Fs = !1;
            // Re-throw the error so that this.tail becomes a rejected Promise and
            // all further attempts to chain (via .then) will just short-circuit
            // and return the rejected Promise.
            throw I("INTERNAL UNHANDLED ERROR: ", 
            /**
 * Chrome includes Error.message in Error.stack. Other browsers do not.
 * This returns expected output of message + stack when available.
 * @param error Error or FirestoreError
 */
            function(t) {
                let e = t.message || "";
                t.stack && (e = t.stack.includes(t.message) ? t.stack : t.message + "\n" + t.stack);
                return e;
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
 */ (t)), t;
        }).then(t => (this.Fs = !1, t))));
        return this.vs = e, e;
    }
    /**
     * Schedules an operation to be queued on the AsyncQueue once the specified
     * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
     * or fast-forward the operation prior to its running.
     */    Ts(t, e, n) {
        this.Os(), 
        // Fast-forward delays for timerIds that have been overriden.
        this.Ns.indexOf(t) > -1 && (e = 0);
        const s = Jn.Vs(this, t, e, n, t => this.Ws(t));
        return this.Cs.push(s), s;
    }
    Os() {
        this.Ds && P();
    }
    /**
     * Verifies there's an operation currently in-progress on the AsyncQueue.
     * Unfortunately we can't verify that the running code is in the promise chain
     * of that operation, so this isn't a foolproof check, but it should be enough
     * to catch some bugs.
     */    Qs() {}
    /**
     * Waits until all currently queued tasks are finished executing. Delayed
     * operations are not run.
     */    async js() {
        // Operations in the queue prior to draining may have enqueued additional
        // operations. Keep draining the queue until the tail is no longer advanced,
        // which indicates that no more new operations were enqueued and that all
        // operations were executed.
        let t;
        do {
            t = this.vs, await t;
        } while (t !== this.vs);
    }
    /**
     * For Tests: Determine if a delayed operation with a particular TimerId
     * exists.
     */    Gs(t) {
        for (const e of this.Cs) if (e.os === t) return !0;
        return !1;
    }
    /**
     * For Tests: Runs some or all delayed operations early.
     *
     * @param lastTimerId Delayed operations up to and including this TimerId will
     *  be drained. Pass TimerId.All to run all delayed operations.
     * @returns a Promise that resolves once all operations have been run.
     */    Ks(t) {
        // Note that draining may generate more delayed ops, so we do that first.
        return this.js().then(() => {
            // Run ops in the same order they'd run if they ran naturally.
            this.Cs.sort((t, e) => t.Rs - e.Rs);
            for (const e of this.Cs) if (e.Es(), "all" /* All */ !== t && e.os === t) break;
            return this.js();
        });
    }
    /**
     * For Tests: Skip all subsequent delays for a timer id.
     */    zs(t) {
        this.Ns.push(t);
    }
    /** Called once a DelayedOperation is run or canceled. */    Ws(t) {
        // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
        const e = this.Cs.indexOf(t);
        this.Cs.splice(e, 1);
    }
}

/**
 * Returns a FirestoreError that can be surfaced to the user if the provided
 * error is an IndexedDbTransactionError. Re-throws the error otherwise.
 */ function ts(t, e) {
    if (I("AsyncQueue", `${e}: ${t}`), Yn(t)) return new x(k.UNAVAILABLE, `${e}: ${t}`);
    throw t;
}

class es {
    constructor(
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
    static Js(t) {
        return new es(t, es.Zs, es.ti);
    }
}

es.ei = -1, es.ni = 1048576, es.si = 41943040, es.Zs = 10, es.ti = 1e3, es.ii = new es(es.si, es.Zs, es.ti), 
es.ri = new es(es.ei, 0, 0);

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
class ns {
    constructor() {
        this.oi = new ss;
    }
    hi(t, e) {
        return this.oi.add(e), Qn.resolve();
    }
    Kn(t, e) {
        return Qn.resolve(this.oi.getEntries(e));
    }
}

/**
 * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
 * Also used for in-memory caching by IndexedDbIndexManager and initial index population
 * in indexeddb_schema.ts
 */ class ss {
    constructor() {
        this.index = {};
    }
    // Returns false if the entry already existed.
    add(t) {
        const e = t.S(), n = t.g(), s = this.index[e] || new ut(q.P), i = !s.has(n);
        return this.index[e] = s.add(n), i;
    }
    has(t) {
        const e = t.S(), n = t.g(), s = this.index[e];
        return s && s.has(n);
    }
    getEntries(t) {
        return (this.index[t] || new ut(q.P)).F();
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
 */
/** Offset to ensure non-overlapping target ids. */
/**
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
 */
class is {
    constructor(t) {
        this.ai = t;
    }
    next() {
        return this.ai += 2, this.ai;
    }
    static ui() {
        // The target cache generator must return '2' in its first call to `next()`
        // as there is no differentiation in the protocol layer between an unset
        // number and the number '0'. If we were to sent a target with target ID
        // '0', the backend would consider it unset and replace it with its own ID.
        return new is(0);
    }
    static ci() {
        // Sync engine assigns target IDs for limbo document detection.
        return new is(-1);
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
 */
/**
 * Implements `LocalStore` interface.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */
class rs {
    constructor(
    /** Manages our in-memory or durable persistence. */
    t, e, n) {
        this.persistence = t, this.li = e, 
        /**
         * Maps a targetID to data about its target.
         *
         * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
         * of `applyRemoteEvent()` idempotent.
         */
        this._i = new ot(v), 
        /** Maps a target to its targetID. */
        // TODO(wuandy): Evaluate if TargetId can be part of Target.
        this.fi = new $(t => z(t), Y), 
        /**
         * The read time of the last entry processed by `getNewDocumentChanges()`.
         *
         * PORTING NOTE: This is only used for multi-tab synchronization.
         */
        this.di = O.min(), this.Nn = t.wi(n), this.Ti = t.mi(), this.Ei = t.Ii(), this.Ri = new jn(this.Ti, this.Nn, this.persistence.Ai()), 
        this.li.Pi(this.Ri);
    }
    async Vi(t) {
        let e = this.Nn, n = this.Ri;
        const s = await this.persistence.runTransaction("Handle user change", "readonly", s => {
            // Swap out the mutation queue, grabbing the pending mutation batches
            // before and after.
            let i;
            return this.Nn.yi(s).next(r => (i = r, e = this.persistence.wi(t), 
            // Recreate our LocalDocumentsView using the new
            // MutationQueue.
            n = new jn(this.Ti, e, this.persistence.Ai()), e.yi(s))).next(t => {
                const e = [], r = [];
                // Union the old/new changed keys.
                let o = Et();
                for (const t of i) {
                    e.push(t.batchId);
                    for (const e of t.mutations) o = o.add(e.key);
                }
                for (const e of t) {
                    r.push(e.batchId);
                    for (const t of e.mutations) o = o.add(t.key);
                }
                // Return the set of all (potentially) changed documents and the list
                // of mutation batch IDs that were affected by change.
                                return n.qn(s, o).next(t => ({
                    pi: t,
                    gi: e,
                    vi: r
                }));
            });
        });
        return this.Nn = e, this.Ri = n, this.li.Pi(this.Ri), s;
    }
    bi(t) {
        const e = L.now(), n = t.reduce((t, e) => t.add(e.key), Et());
        let s;
        return this.persistence.runTransaction("Locally write mutations", "readwrite", i => this.Ri.qn(i, n).next(n => {
            s = n;
            // For non-idempotent mutations (such as `FieldValue.increment()`),
            // we record the base state in a separate patch mutation. This is
            // later used to guarantee consistent values and prevents flicker
            // even if the backend sends us an update that already includes our
            // transform.
            const r = [];
            for (const e of t) {
                const t = Ge(e, s.get(e.key));
                null != t && 
                // NOTE: The base state should only be applied if there's some
                // existing document to override, so use a Precondition of
                // exists=true
                r.push(new Ye(e.key, t, on(t.proto.mapValue), Ue.exists(!0)));
            }
            return this.Nn.Si(i, e, r, t);
        })).then(t => {
            const e = t.In(s);
            return {
                batchId: t.batchId,
                Ci: e
            };
        });
    }
    Di(t) {
        return this.persistence.runTransaction("Acknowledge batch", "readwrite-primary", e => {
            const n = t.batch.keys(), s = this.Ti.Fi({
                Ni: !0
            });
            return this.$i(e, t, s).next(() => s.apply(e)).next(() => this.Nn.ki(e)).next(() => this.Ri.qn(e, n));
        });
    }
    xi(t) {
        return this.persistence.runTransaction("Reject batch", "readwrite-primary", e => {
            let n;
            return this.Nn.Li(e, t).next(t => (V(null !== t), n = t.keys(), this.Nn.Oi(e, t))).next(() => this.Nn.ki(e)).next(() => this.Ri.qn(e, n));
        });
    }
    Mi() {
        return this.persistence.runTransaction("Get highest unacknowledged batch id", "readonly", t => this.Nn.Mi(t));
    }
    qi() {
        return this.persistence.runTransaction("Get last remote snapshot version", "readonly", t => this.Ei.qi(t));
    }
    Ui(t) {
        const e = t.J;
        let n = this._i;
        return this.persistence.runTransaction("Apply remote event", "readwrite-primary", s => {
            const i = this.Ti.Fi({
                Ni: !0
            });
            // Reset newTargetDataByTargetMap in case this transaction gets re-run.
                        n = this._i;
            const r = [];
            t.Wt.forEach((t, i) => {
                const o = n.get(i);
                if (!o) return;
                // Only update the remote keys if the target is still active. This
                // ensures that we can persist the updated target data along with
                // the updated assignment.
                                r.push(this.Ei.Bi(s, t.Jt, i).next(() => this.Ei.Wi(s, t.Yt, i)));
                const h = t.resumeToken;
                // Update the resume token if the change includes one.
                                if (h.H() > 0) {
                    const a = o.tt(h, e).Z(s.Qi);
                    n = n.nt(i, a), 
                    // Update the target data if there are target changes (or if
                    // sufficient time has passed since the last update).
                    rs.ji(o, a, t) && r.push(this.Ei.Gi(s, a));
                }
            });
            let o = _t(), h = Et();
            // HACK: The only reason we allow a null snapshot version is so that we
            // can synthesize remote events when we get permission denied errors while
            // trying to resolve the state of a locally cached document that is in
            // limbo.
            if (t.jt.forEach((t, e) => {
                h = h.add(t);
            }), 
            // Each loop iteration only affects its "own" doc, so it's safe to get all the remote
            // documents in advance in a single call.
            r.push(i.getEntries(s, h).next(n => {
                t.jt.forEach((h, a) => {
                    const u = n.get(h);
                    // Note: The order of the steps below is important, since we want
                    // to ensure that rejected limbo resolutions (which fabricate
                    // NoDocuments with SnapshotVersion.min()) never add documents to
                    // cache.
                                        a instanceof un && a.version.isEqual(O.min()) ? (
                    // NoDocuments with SnapshotVersion.min() are used in manufactured
                    // events. We remove these documents from cache since we lost
                    // access.
                    i.Ki(h, e), o = o.nt(h, a)) : null == u || a.version.o(u.version) > 0 || 0 === a.version.o(u.version) && u.hasPendingWrites ? (i.zi(a, e), 
                    o = o.nt(h, a)) : E("LocalStore", "Ignoring outdated watch update for ", h, ". Current version:", u.version, " Watch version:", a.version), 
                    t.Gt.has(h) && r.push(this.persistence.Yi.Hi(s, h));
                });
            })), !e.isEqual(O.min())) {
                const t = this.Ei.qi(s).next(t => this.Ei.Xi(s, s.Qi, e));
                r.push(t);
            }
            return Qn.Cn(r).next(() => i.apply(s)).next(() => this.Ri.Un(s, o));
        }).then(t => (this._i = n, t));
    }
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
     */    static ji(t, e, n) {
        // Always persist target data if we don't already have a resume token.
        if (V(e.resumeToken.H() > 0), 0 === t.resumeToken.H()) return !0;
        // Don't allow resume token changes to be buffered indefinitely. This
        // allows us to be reasonably up-to-date after a crash and avoids needing
        // to loop over all active queries on shutdown. Especially in the browser
        // we may not get time to do anything interesting while the current tab is
        // closing.
                if (e.J.I() - t.J.I() >= this.Ji) return !0;
        // Otherwise if the only thing that has changed about a target is its resume
        // token it's not worth persisting. Note that the RemoteStore keeps an
        // in-memory view of the currently active targets which includes the current
        // resume token, so stream failure or user changes will still use an
        // up-to-date resume token regardless of what we do here.
                return n.Yt.size + n.Xt.size + n.Jt.size > 0;
    }
    async Zi(t) {
        try {
            await this.persistence.runTransaction("notifyLocalViewChanges", "readwrite", e => Qn.forEach(t, t => Qn.forEach(t.Yn, n => this.persistence.Yi.tr(e, t.targetId, n)).next(() => Qn.forEach(t.Xn, n => this.persistence.Yi.er(e, t.targetId, n)))));
        } catch (t) {
            if (!Yn(t)) throw t;
            // If `notifyLocalViewChanges` fails, we did not advance the sequence
            // number for the documents that were included in this transaction.
            // This might trigger them to be deleted earlier than they otherwise
            // would have, but it should not invalidate the integrity of the data.
            E("LocalStore", "Failed to update sequence numbers: " + t);
        }
        for (const e of t) {
            const t = e.targetId;
            if (!e.fromCache) {
                const e = this._i.get(t), n = e.J, s = e.et(n);
                // Advance the last limbo free snapshot version
                                this._i = this._i.nt(t, s);
            }
        }
    }
    nr(t) {
        return this.persistence.runTransaction("Get next mutation batch", "readonly", e => (void 0 === t && (t = -1), 
        this.Nn.sr(e, t)));
    }
    ir(t) {
        return this.persistence.runTransaction("read document", "readonly", e => this.Ri.kn(e, t));
    }
    rr(t) {
        return this.persistence.runTransaction("Allocate target", "readwrite", e => {
            let n;
            return this.Ei.or(e, t).next(s => s ? (
            // This target has been listened to previously, so reuse the
            // previous targetID.
            // TODO(mcg): freshen last accessed date?
            n = s, Qn.resolve(n)) : this.Ei.hr(e).next(s => (n = new tt(t, s, 0 /* Listen */ , e.Qi), 
            this.Ei.ar(e, n).next(() => n))));
        }).then(e => {
            // If Multi-Tab is enabled, the existing target data may be newer than
            // the in-memory data
            const n = this._i.get(e.targetId);
            return (null === n || e.J.o(n.J) > 0) && (this._i = this._i.nt(e.targetId, e), this.fi.set(t, e.targetId)), 
            e;
        });
    }
    or(t, e) {
        const n = this.fi.get(e);
        return void 0 !== n ? Qn.resolve(this._i.get(n)) : this.Ei.or(t, e);
    }
    async ur(t, e) {
        const n = this._i.get(t), s = e ? "readwrite" : "readwrite-primary";
        try {
            e || await this.persistence.runTransaction("Release target", s, t => this.persistence.Yi.removeTarget(t, n));
        } catch (e) {
            if (!Yn(e)) throw e;
            // All `releaseTarget` does is record the final metadata state for the
            // target, but we've been recording this periodically during target
            // activity. If we lose this write this could cause a very slight
            // difference in the order of target deletion during GC, but we
            // don't define exact LRU semantics so this is acceptable.
            E("LocalStore", `Failed to update sequence numbers for target ${t}: ${e}`);
        }
        this._i = this._i.remove(t), this.fi.delete(n.target);
    }
    cr(t, e) {
        let n = O.min(), s = Et();
        return this.persistence.runTransaction("Execute query", "readonly", i => this.or(i, Tn(t)).next(t => {
            if (t) return n = t.lastLimboFreeSnapshotVersion, this.Ei.lr(i, t.targetId).next(t => {
                s = t;
            });
        }).next(() => this.li.Wn(i, t, e ? n : O.min(), e ? s : Et())).next(t => ({
            documents: t,
            _r: s
        })));
    }
    $i(t, e, n) {
        const s = e.batch, i = s.keys();
        let r = Qn.resolve();
        return i.forEach(i => {
            r = r.next(() => n.On(t, i)).next(t => {
                let r = t;
                const o = e.An.get(i);
                V(null !== o), (!r || r.version.o(o) < 0) && (r = s.Tn(i, r, e), r && 
                // We use the commitVersion as the readTime rather than the
                // document's updateTime since the updateTime is not advanced
                // for updates that do not modify the underlying document.
                n.zi(r, e.Rn));
            });
        }), r.next(() => this.Nn.Oi(t, s));
    }
    dr(t) {
        return this.persistence.runTransaction("Collect garbage", "readwrite-primary", e => t.wr(e, this._i));
    }
}

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
async function os(t) {
    if (t.code !== k.FAILED_PRECONDITION || "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab." !== t.message) throw t;
    E("LocalStore", "Unexpectedly lost primary lease");
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
 */ rs.Ji = 3e8;

class hs {
    constructor() {
        // A set of outstanding references to a document sorted by key.
        this.Tr = new ut(as.mr), 
        // A set of outstanding references to a document sorted by target id.
        this.Er = new ut(as.Ir);
    }
    /** Returns true if the reference set contains no references. */    _() {
        return this.Tr._();
    }
    /** Adds a reference to the given document key for the given ID. */    tr(t, e) {
        const n = new as(t, e);
        this.Tr = this.Tr.add(n), this.Er = this.Er.add(n);
    }
    /** Add references to the given document keys for the given ID. */    Rr(t, e) {
        t.forEach(t => this.tr(t, e));
    }
    /**
     * Removes a reference to the given document key for the given
     * ID.
     */    er(t, e) {
        this.Ar(new as(t, e));
    }
    Pr(t, e) {
        t.forEach(t => this.er(t, e));
    }
    /**
     * Clears all references with a given ID. Calls removeRef() for each key
     * removed.
     */    Vr(t) {
        const e = new W(new q([])), n = new as(e, t), s = new as(e, t + 1), i = [];
        return this.Er.bt([ n, s ], t => {
            this.Ar(t), i.push(t.key);
        }), i;
    }
    yr() {
        this.Tr.forEach(t => this.Ar(t));
    }
    Ar(t) {
        this.Tr = this.Tr.delete(t), this.Er = this.Er.delete(t);
    }
    pr(t) {
        const e = new W(new q([])), n = new as(e, t), s = new as(e, t + 1);
        let i = Et();
        return this.Er.bt([ n, s ], t => {
            i = i.add(t.key);
        }), i;
    }
    gr(t) {
        const e = new as(t, 0), n = this.Tr.Ct(e);
        return null !== n && t.isEqual(n.key);
    }
}

class as {
    constructor(t, e) {
        this.key = t, this.vr = e;
    }
    /** Compare by key then by ID */    static mr(t, e) {
        return W.P(t.key, e.key) || v(t.vr, e.vr);
    }
    /** Compare by ID then by key */    static Ir(t, e) {
        return v(t.vr, e.vr) || W.P(t.key, e.key);
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
 */
/**
 * Simple wrapper around a nullable UID. Mostly exists to make code more
 * readable.
 */ class us {
    constructor(t) {
        this.uid = t;
    }
    br() {
        return null != this.uid;
    }
    /**
     * Returns a key representing this user, suitable for inclusion in a
     * dictionary.
     */    Sr() {
        return this.br() ? "uid:" + this.uid : "anonymous-user";
    }
    isEqual(t) {
        return t.uid === this.uid;
    }
}

/** A user with a null UID. */ us.UNAUTHENTICATED = new us(null), 
// TODO(mikelehen): Look into getting a proper uid-equivalent for
// non-FirebaseAuth providers.
us.Cr = new us("google-credentials-uid"), us.Dr = new us("first-party-uid");

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
class cs {
    constructor(t, e) {
        this.user = e, this.type = "OAuth", this.Fr = {}, 
        // Set the headers using Object Literal notation to avoid minification
        this.Fr.Authorization = "Bearer " + t;
    }
}

/** A CredentialsProvider that always yields an empty token. */ class ls {
    constructor() {
        /**
         * Stores the listener registered with setChangeListener()
         * This isn't actually necessary since the UID never changes, but we use this
         * to verify the listen contract is adhered to in tests.
         */
        this.Nr = null;
    }
    getToken() {
        return Promise.resolve(null);
    }
    $r() {}
    kr(t) {
        this.Nr = t, 
        // Fire with initial user.
        t(us.UNAUTHENTICATED);
    }
    xr() {
        this.Nr = null;
    }
}

class _s {
    constructor(t) {
        /**
         * The auth token listener registered with FirebaseApp, retained here so we
         * can unregister it.
         */
        this.Lr = null, 
        /** Tracks the current User. */
        this.currentUser = us.UNAUTHENTICATED, this.Or = !1, 
        /**
         * Counter used to detect if the token changed while a getToken request was
         * outstanding.
         */
        this.Mr = 0, 
        /** The listener registered with setChangeListener(). */
        this.Nr = null, this.forceRefresh = !1, this.Lr = () => {
            this.Mr++, this.currentUser = this.qr(), this.Or = !0, this.Nr && this.Nr(this.currentUser);
        }, this.Mr = 0, this.auth = t.getImmediate({
            optional: !0
        }), this.auth ? this.auth.addAuthTokenListener(this.Lr) : (
        // if auth is not available, invoke tokenListener once with null token
        this.Lr(null), t.get().then(t => {
            this.auth = t, this.Lr && 
            // tokenListener can be removed by removeChangeListener()
            this.auth.addAuthTokenListener(this.Lr);
        }, () => {}));
    }
    getToken() {
        // Take note of the current value of the tokenCounter so that this method
        // can fail (with an ABORTED error) if there is a token change while the
        // request is outstanding.
        const t = this.Mr, e = this.forceRefresh;
        return this.forceRefresh = !1, this.auth ? this.auth.getToken(e).then(e => 
        // Cancel the request since the token changed while the request was
        // outstanding so the response is potentially for a previous user (which
        // user, we can't be sure).
        this.Mr !== t ? (E("FirebaseCredentialsProvider", "getToken aborted due to token change."), 
        this.getToken()) : e ? (V("string" == typeof e.accessToken), new cs(e.accessToken, this.currentUser)) : null) : Promise.resolve(null);
    }
    $r() {
        this.forceRefresh = !0;
    }
    kr(t) {
        this.Nr = t, 
        // Fire the initial event
        this.Or && t(this.currentUser);
    }
    xr() {
        this.auth && this.auth.removeAuthTokenListener(this.Lr), this.Lr = null, this.Nr = null;
    }
    // Auth.getUid() can return null even with a user logged in. It is because
    // getUid() is synchronous, but the auth code populating Uid is asynchronous.
    // This method should only be called in the AuthTokenListener callback
    // to guarantee to get the actual user.
    qr() {
        const t = this.auth && this.auth.getUid();
        return V(null === t || "string" == typeof t), new us(t);
    }
}

/*
 * FirstPartyToken provides a fresh token each time its value
 * is requested, because if the token is too old, requests will be rejected.
 * Technically this may no longer be necessary since the SDK should gracefully
 * recover from unauthenticated errors (see b/33147818 for context), but it's
 * safer to keep the implementation as-is.
 */ class fs {
    constructor(t, e) {
        this.Ur = t, this.Br = e, this.type = "FirstParty", this.user = us.Dr;
    }
    get Fr() {
        const t = {
            "X-Goog-AuthUser": this.Br
        }, e = this.Ur.auth.Wr([]);
        return e && (t.Authorization = e), t;
    }
}

/*
 * Provides user credentials required for the Firestore JavaScript SDK
 * to authenticate the user, using technique that is only available
 * to applications hosted by Google.
 */ class ds {
    constructor(t, e) {
        this.Ur = t, this.Br = e;
    }
    getToken() {
        return Promise.resolve(new fs(this.Ur, this.Br));
    }
    kr(t) {
        // Fire with initial uid.
        t(us.Dr);
    }
    xr() {}
    $r() {}
}

/**
 * Builds a CredentialsProvider depending on the type of
 * the credentials passed in.
 */
/**
 * A PersistentStream is an abstract base class that represents a streaming RPC
 * to the Firestore backend. It's built on top of the connections own support
 * for streaming RPCs, and adds several critical features for our clients:
 *
 *   - Exponential backoff on failure
 *   - Authentication via CredentialsProvider
 *   - Dispatching all callbacks into the shared worker queue
 *   - Closing idle streams after 60 seconds of inactivity
 *
 * Subclasses of PersistentStream implement serialization of models to and
 * from the JSON representation of the protocol buffers for a specific
 * streaming RPC.
 *
 * ## Starting and Stopping
 *
 * Streaming RPCs are stateful and need to be start()ed before messages can
 * be sent and received. The PersistentStream will call the onOpen() function
 * of the listener once the stream is ready to accept requests.
 *
 * Should a start() fail, PersistentStream will call the registered onClose()
 * listener with a FirestoreError indicating what went wrong.
 *
 * A PersistentStream can be started and stopped repeatedly.
 *
 * Generic types:
 *  SendType: The type of the outgoing message of the underlying
 *    connection stream
 *  ReceiveType: The type of the incoming message of the underlying
 *    connection stream
 *  ListenerType: The type of the listener that will be used for callbacks
 */
class ws {
    constructor(t, e, n, s, i, r) {
        this.rs = t, this.Qr = n, this.jr = s, this.Gr = i, this.listener = r, this.state = 0 /* Initial */ , 
        /**
         * A close count that's incremented every time the stream is closed; used by
         * getCloseGuardedDispatcher() to invalidate callbacks that happen after
         * close.
         */
        this.Kr = 0, this.zr = null, this.stream = null, this.$s = new Hn(t, e);
    }
    /**
     * Returns true if start() has been called and no error has occurred. True
     * indicates the stream is open or in the process of opening (which
     * encompasses respecting backoff, getting auth tokens, and starting the
     * actual RPC). Use isOpen() to determine if the stream is open and ready for
     * outbound requests.
     */    Hr() {
        return 1 /* Starting */ === this.state || 2 /* Open */ === this.state || 4 /* Backoff */ === this.state;
    }
    /**
     * Returns true if the underlying RPC is open (the onOpen() listener has been
     * called) and the stream is ready for outbound requests.
     */    Yr() {
        return 2 /* Open */ === this.state;
    }
    /**
     * Starts the RPC. Only allowed if isStarted() returns false. The stream is
     * not immediately ready for use: onOpen() will be invoked when the RPC is
     * ready for outbound requests, at which point isOpen() will return true.
     *
     * When start returns, isStarted() will return true.
     */    start() {
        3 /* Error */ !== this.state ? this.auth() : this.Xr();
    }
    /**
     * Stops the RPC. This call is idempotent and allowed regardless of the
     * current isStarted() state.
     *
     * When stop returns, isStarted() and isOpen() will both return false.
     */    async stop() {
        this.Hr() && await this.close(0 /* Initial */);
    }
    /**
     * After an error the stream will usually back off on the next attempt to
     * start it. If the error warrants an immediate restart of the stream, the
     * sender can use this to indicate that the receiver should not back off.
     *
     * Each error will call the onClose() listener. That function can decide to
     * inhibit backoff if required.
     */    Jr() {
        this.state = 0 /* Initial */ , this.$s.reset();
    }
    /**
     * Marks this stream as idle. If no further actions are performed on the
     * stream for one minute, the stream will automatically close itself and
     * notify the stream's onClose() handler with Status.OK. The stream will then
     * be in a !isStarted() state, requiring the caller to start the stream again
     * before further use.
     *
     * Only streams that are in state 'Open' can be marked idle, as all other
     * states imply pending network operations.
     */    Zr() {
        // Starts the idle time if we are in state 'Open' and are not yet already
        // running a timer (in which case the previous idle timeout still applies).
        this.Yr() && null === this.zr && (this.zr = this.rs.Ts(this.Qr, 6e4, () => this.to()));
    }
    /** Sends a message to the underlying stream. */    eo(t) {
        this.no(), this.stream.send(t);
    }
    /** Called by the idle timer when the stream should close due to inactivity. */    async to() {
        if (this.Yr()) 
        // When timing out an idle stream there's no reason to force the stream into backoff when
        // it restarts so set the stream state to Initial instead of Error.
        return this.close(0 /* Initial */);
    }
    /** Marks the stream as active again. */    no() {
        this.zr && (this.zr.cancel(), this.zr = null);
    }
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
     */    async close(t, e) {
        // Cancel any outstanding timers (they're guaranteed not to execute).
        this.no(), this.$s.cancel(), 
        // Invalidates any stream-related callbacks (e.g. from auth or the
        // underlying stream), guaranteeing they won't execute.
        this.Kr++, 3 /* Error */ !== t ? 
        // If this is an intentional close ensure we don't delay our next connection attempt.
        this.$s.reset() : e && e.code === k.RESOURCE_EXHAUSTED ? (
        // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
        I(e.toString()), I("Using maximum backoff delay to prevent overloading the backend."), 
        this.$s.fs()) : e && e.code === k.UNAUTHENTICATED && 
        // "unauthenticated" error means the token was rejected. Try force refreshing it in case it
        // just expired.
        this.Gr.$r(), 
        // Clean up the underlying stream because we are no longer interested in events.
        null !== this.stream && (this.so(), this.stream.close(), this.stream = null), 
        // This state must be assigned before calling onClose() to allow the callback to
        // inhibit backoff or otherwise manipulate the state in its non-started state.
        this.state = t, 
        // Notify the listener that the stream closed.
        await this.listener.io(e);
    }
    /**
     * Can be overridden to perform additional cleanup before the stream is closed.
     * Calling super.tearDown() is not required.
     */    so() {}
    auth() {
        this.state = 1 /* Starting */;
        const t = this.ro(this.Kr), e = this.Kr;
        // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                this.Gr.getToken().then(t => {
            // Stream can be stopped while waiting for authentication.
            // TODO(mikelehen): We really should just use dispatchIfNotClosed
            // and let this dispatch onto the queue, but that opened a spec test can
            // of worms that I don't want to deal with in this PR.
            this.Kr === e && 
            // Normally we'd have to schedule the callback on the AsyncQueue.
            // However, the following calls are safe to be called outside the
            // AsyncQueue since they don't chain asynchronous calls
            this.oo(t);
        }, e => {
            t(() => {
                const t = new x(k.UNKNOWN, "Fetching auth token failed: " + e.message);
                return this.ho(t);
            });
        });
    }
    oo(t) {
        const e = this.ro(this.Kr);
        this.stream = this.ao(t), this.stream.uo(() => {
            e(() => (this.state = 2 /* Open */ , this.listener.uo()));
        }), this.stream.io(t => {
            e(() => this.ho(t));
        }), this.stream.onMessage(t => {
            e(() => this.onMessage(t));
        });
    }
    Xr() {
        this.state = 4 /* Backoff */ , this.$s.ds(async () => {
            this.state = 0 /* Initial */ , this.start();
        });
    }
    // Visible for tests
    ho(t) {
        // In theory the stream could close cleanly, however, in our current model
        // we never expect this to happen because if we stop a stream ourselves,
        // this callback will never be called. To prevent cases where we retry
        // without a backoff accidentally, we set the stream to error in all cases.
        return E("PersistentStream", "close with error: " + t), this.stream = null, this.close(3 /* Error */ , t);
    }
    /**
     * Returns a "dispatcher" function that dispatches operations onto the
     * AsyncQueue but only runs them if closeCount remains unchanged. This allows
     * us to turn auth / stream callbacks into no-ops if the stream is closed /
     * re-opened, etc.
     */    ro(t) {
        return e => {
            this.rs.gs(() => this.Kr === t ? e() : (E("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), 
            Promise.resolve()));
        };
    }
}

/**
 * A PersistentStream that implements the Listen RPC.
 *
 * Once the Listen stream has called the onOpen() listener, any number of
 * listen() and unlisten() calls can be made to control what changes will be
 * sent from the server for ListenResponses.
 */ class Ts extends ws {
    constructor(t, e, n, s, i) {
        super(t, "listen_stream_connection_backoff" /* ListenStreamConnectionBackoff */ , "listen_stream_idle" /* ListenStreamIdle */ , e, n, i), 
        this.serializer = s;
    }
    ao(t) {
        return this.jr.co("Listen", t);
    }
    onMessage(t) {
        // A successful response means the stream is healthy
        this.$s.reset();
        const e = we(this.serializer, t), n = function(t) {
            // We have only reached a consistent snapshot for the entire stream if there
            // is a read_time set and it applies to all targets (i.e. the list of
            // targets is empty). The backend is guaranteed to send such responses.
            if (!("targetChange" in t)) return O.min();
            const e = t.targetChange;
            return e.targetIds && e.targetIds.length ? O.min() : e.readTime ? he(e.readTime) : O.min();
        }(t);
        return this.listener.lo(e, n);
    }
    /**
     * Registers interest in the results of the given target. If the target
     * includes a resumeToken it will be included in the request. Results that
     * affect the target will be streamed back as WatchChange messages that
     * reference the targetId.
     */    _o(t) {
        const e = {};
        e.database = _e(this.serializer), e.addTarget = function(t, e) {
            let n;
            const s = e.target;
            return n = X(s) ? {
                documents: Ee(t, s)
            } : {
                query: Ie(t, s)
            }, n.targetId = e.targetId, e.resumeToken.H() > 0 && (n.resumeToken = re(t, e.resumeToken)), 
            n;
        }(this.serializer, t);
        const n = Re(this.serializer, t);
        n && (e.labels = n), this.eo(e);
    }
    /**
     * Unregisters interest in the results of the target associated with the
     * given targetId.
     */    fo(t) {
        const e = {};
        e.database = _e(this.serializer), e.removeTarget = t, this.eo(e);
    }
}

/**
 * A Stream that implements the Write RPC.
 *
 * The Write RPC requires the caller to maintain special streamToken
 * state in between calls, to help the server understand which responses the
 * client has processed by the time the next request is made. Every response
 * will contain a streamToken; this value must be passed to the next
 * request.
 *
 * After calling start() on this stream, the next request must be a handshake,
 * containing whatever streamToken is on hand. Once a response to this
 * request is received, all pending mutations may be submitted. When
 * submitting multiple batches of mutations at the same time, it's
 * okay to use the same streamToken for the calls to writeMutations.
 *
 * TODO(b/33271235): Use proto types
 */ class ms extends ws {
    constructor(t, e, n, s, i) {
        super(t, "write_stream_connection_backoff" /* WriteStreamConnectionBackoff */ , "write_stream_idle" /* WriteStreamIdle */ , e, n, i), 
        this.serializer = s, this.do = !1;
    }
    /**
     * Tracks whether or not a handshake has been successfully exchanged and
     * the stream is ready to accept mutations.
     */    get wo() {
        return this.do;
    }
    // Override of PersistentStream.start
    start() {
        this.do = !1, this.lastStreamToken = void 0, super.start();
    }
    so() {
        this.do && this.To([]);
    }
    ao(t) {
        return this.jr.co("Write", t);
    }
    onMessage(t) {
        if (
        // Always capture the last stream token.
        V(!!t.streamToken), this.lastStreamToken = t.streamToken, this.do) {
            // A successful first write response means the stream is healthy,
            // Note, that we could consider a successful handshake healthy, however,
            // the write itself might be causing an error we want to back off from.
            this.$s.reset();
            const e = me(t.writeResults, t.commitTime), n = he(t.commitTime);
            return this.listener.mo(n, e);
        }
        // The first response is always the handshake response
        return V(!t.writeResults || 0 === t.writeResults.length), this.do = !0, this.listener.Eo();
    }
    /**
     * Sends an initial streamToken to the server, performing the handshake
     * required to make the StreamingWrite RPC work. Subsequent
     * calls should wait until onHandshakeComplete was called.
     */    Io() {
        // TODO(dimond): Support stream resumption. We intentionally do not set the
        // stream token on the handshake, ignoring any stream token we might have.
        const t = {};
        t.database = _e(this.serializer), this.eo(t);
    }
    /** Sends a group of mutations to the Firestore backend to apply. */    To(t) {
        const e = {
            streamToken: this.lastStreamToken,
            writes: t.map(t => Te(this.serializer, t))
        };
        this.eo(e);
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
 */
/**
 * Datastore and its related methods are a wrapper around the external Google
 * Cloud Datastore grpc API, which provides an interface that is more convenient
 * for the rest of the client SDK architecture to consume.
 */
/**
 * An implementation of Datastore that exposes additional state for internal
 * consumption.
 */
class Es extends class {} {
    constructor(t, e, n) {
        super(), this.credentials = t, this.jr = e, this.serializer = n, this.Ro = !1;
    }
    Ao() {
        if (this.Ro) throw new x(k.FAILED_PRECONDITION, "The client has already been terminated.");
    }
    /** Gets an auth token and invokes the provided RPC. */    Po(t, e, n) {
        return this.Ao(), this.credentials.getToken().then(s => this.jr.Po(t, e, n, s)).catch(t => {
            throw t.code === k.UNAUTHENTICATED && this.credentials.$r(), t;
        });
    }
    /** Gets an auth token and invokes the provided RPC with streamed results. */    Vo(t, e, n) {
        return this.Ao(), this.credentials.getToken().then(s => this.jr.Vo(t, e, n, s)).catch(t => {
            throw t.code === k.UNAUTHENTICATED && this.credentials.$r(), t;
        });
    }
    terminate() {
        this.Ro = !1;
    }
}

// TODO(firestorexp): Make sure there is only one Datastore instance per
// firestore-exp client.
/**
 * A component used by the RemoteStore to track the OnlineState (that is,
 * whether or not the client as a whole should be considered to be online or
 * offline), implementing the appropriate heuristics.
 *
 * In particular, when the client is trying to connect to the backend, we
 * allow up to MAX_WATCH_STREAM_FAILURES within ONLINE_STATE_TIMEOUT_MS for
 * a connection to succeed. If we have too many failures or the timeout elapses,
 * then we set the OnlineState to Offline, and the client will behave as if
 * it is offline (get()s will return cached data, etc.).
 */
class Is {
    constructor(t, e) {
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
        this.bo = !0;
    }
    /**
     * Called by RemoteStore when a watch stream is started (including on each
     * backoff attempt).
     *
     * If this is the first attempt, it sets the OnlineState to Unknown and starts
     * the onlineStateTimer.
     */    So() {
        0 === this.po && (this.Co("Unknown" /* Unknown */), this.vo = this.Is.Ts("online_state_timeout" /* OnlineStateTimeout */ , 1e4, () => (this.vo = null, 
        this.Do("Backend didn't respond within 10 seconds."), this.Co("Offline" /* Offline */), 
        Promise.resolve())));
    }
    /**
     * Updates our OnlineState as appropriate after the watch stream reports a
     * failure. The first failure moves us to the 'Unknown' state. We then may
     * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
     * actually transition to the 'Offline' state.
     */    Fo(t) {
        "Online" /* Online */ === this.state ? this.Co("Unknown" /* Unknown */) : (this.po++, 
        this.po >= 1 && (this.No(), this.Do("Connection failed 1 times. Most recent error: " + t.toString()), 
        this.Co("Offline" /* Offline */)));
    }
    /**
     * Explicitly sets the OnlineState to the specified state.
     *
     * Note that this resets our timers / failure counters, etc. used by our
     * Offline heuristics, so must not be used in place of
     * handleWatchStreamStart() and handleWatchStreamFailure().
     */    set(t) {
        this.No(), this.po = 0, "Online" /* Online */ === t && (
        // We've connected to watch at least once. Don't warn the developer
        // about being offline going forward.
        this.bo = !1), this.Co(t);
    }
    Co(t) {
        t !== this.state && (this.state = t, this.yo(t));
    }
    Do(t) {
        const e = `Could not reach Cloud Firestore backend. ${t}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
        this.bo ? (I(e), this.bo = !1) : E("OnlineStateTracker", e);
    }
    No() {
        null !== this.vo && (this.vo.cancel(), this.vo = null);
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
 */
/**
 * RemoteStore - An interface to remotely stored data, basically providing a
 * wrapper around the Datastore that is more reliable for the rest of the
 * system.
 *
 * RemoteStore is responsible for maintaining the connection to the server.
 * - maintaining a list of active listens.
 * - reconnecting when the connection is dropped.
 * - resuming all the active listens on reconnect.
 *
 * RemoteStore handles all incoming events from the Datastore.
 * - listening to the watch stream and repackaging the events as RemoteEvents
 * - notifying SyncEngine of any changes to the active listens.
 *
 * RemoteStore takes writes from other components and handles them reliably.
 * - pulling pending mutations from LocalStore and sending them to Datastore.
 * - retrying mutations that failed because of network problems.
 * - acking mutations to the SyncEngine once they are accepted or rejected.
 */
class Rs {
    constructor(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    t, 
    /** The client-side proxy for interacting with the backend. */
    e, n, s, i) {
        this.$o = t, this.ko = e, this.Is = n, 
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
        this.Mo = new Set, this.qo = i, this.qo.Uo(t => {
            n.gs(async () => {
                // Porting Note: Unlike iOS, `restartNetwork()` is called even when the
                // network becomes unreachable as we don't have any other way to tear
                // down our streams.
                this.Bo() && (E("RemoteStore", "Restarting streams for network reachability change."), 
                await this.Wo());
            });
        }), this.Qo = new Is(n, s), 
        // Create streams (but note they're not started yet).
        this.jo = function(t, e, n) {
            const s = y(t);
            return s.Ao(), new Ts(e, s.jr, s.credentials, s.serializer, n);
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
 */ (this.ko, n, {
            uo: this.Go.bind(this),
            io: this.Ko.bind(this),
            lo: this.zo.bind(this)
        }), this.Ho = function(t, e, n) {
            const s = y(t);
            return s.Ao(), new ms(e, s.jr, s.credentials, s.serializer, n);
        }(this.ko, n, {
            uo: this.Yo.bind(this),
            io: this.Xo.bind(this),
            Eo: this.Jo.bind(this),
            mo: this.mo.bind(this)
        });
    }
    /**
     * Starts up the remote store, creating streams, restoring state from
     * LocalStore, etc.
     */    start() {
        return this.enableNetwork();
    }
    /** Re-enables the network. Idempotent. */    enableNetwork() {
        return this.Mo.delete(0 /* UserDisabled */), this.Zo();
    }
    async Zo() {
        this.Bo() && (this.th() ? this.eh() : this.Qo.set("Unknown" /* Unknown */), 
        // This will start the write stream if necessary.
        await this.nh());
    }
    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */    async disableNetwork() {
        this.Mo.add(0 /* UserDisabled */), await this.sh(), 
        // Set the OnlineState to Offline so get()s return from cache, etc.
        this.Qo.set("Offline" /* Offline */);
    }
    async sh() {
        await this.Ho.stop(), await this.jo.stop(), this.xo.length > 0 && (E("RemoteStore", `Stopping write stream with ${this.xo.length} pending writes`), 
        this.xo = []), this.ih();
    }
    async rh() {
        E("RemoteStore", "RemoteStore shutting down."), this.Mo.add(5 /* Shutdown */), await this.sh(), 
        this.qo.rh(), 
        // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
        // triggering spurious listener events with cached data, etc.
        this.Qo.set("Unknown" /* Unknown */);
    }
    /**
     * Starts new listen for the given target. Uses resume token if provided. It
     * is a no-op if the target of given `TargetData` is already being listened to.
     */    listen(t) {
        this.Lo.has(t.targetId) || (
        // Mark this as something the client is currently listening for.
        this.Lo.set(t.targetId, t), this.th() ? 
        // The listen will be sent in onWatchStreamOpen
        this.eh() : this.jo.Yr() && this.oh(t));
    }
    /**
     * Removes the listen from server. It is a no-op if the given target id is
     * not being listened to.
     */    hh(t) {
        this.Lo.delete(t), this.jo.Yr() && this.ah(t), 0 === this.Lo.size && (this.jo.Yr() ? this.jo.Zr() : this.Bo() && 
        // Revert to OnlineState.Unknown if the watch stream is not open and we
        // have no listeners, since without any listens to send we cannot
        // confirm if the stream is healthy and upgrade to OnlineState.Online.
        this.Qo.set("Unknown" /* Unknown */));
    }
    /** {@link TargetMetadataProvider.getTargetDataForTarget} */    Le(t) {
        return this.Lo.get(t) || null;
    }
    /** {@link TargetMetadataProvider.getRemoteKeysForTarget} */    xe(t) {
        return this.uh.xe(t);
    }
    /**
     * We need to increment the the expected number of pending responses we're due
     * from watch so we wait for the ack to process any messages from this target.
     */    oh(t) {
        this.Oo.de(t.targetId), this.jo._o(t);
    }
    /**
     * We need to increment the expected number of pending responses we're due
     * from watch so we wait for the removal on the server before we process any
     * messages from this target.
     */    ah(t) {
        this.Oo.de(t), this.jo.fo(t);
    }
    eh() {
        this.Oo = new Ct(this), this.jo.start(), this.Qo.So();
    }
    /**
     * Returns whether the watch stream should be started because it's necessary
     * and has not yet been started.
     */    th() {
        return this.Bo() && !this.jo.Hr() && this.Lo.size > 0;
    }
    Bo() {
        return 0 === this.Mo.size;
    }
    ih() {
        this.Oo = null;
    }
    async Go() {
        this.Lo.forEach((t, e) => {
            this.oh(t);
        });
    }
    async Ko(t) {
        this.ih(), 
        // If we still need the watch stream, retry the connection.
        this.th() ? (this.Qo.Fo(t), this.eh()) : 
        // No need to restart watch stream because there are no active targets.
        // The online state is set to unknown because there is no active attempt
        // at establishing a connection
        this.Qo.set("Unknown" /* Unknown */);
    }
    async zo(t, e) {
        if (
        // Mark the client as online since we got a message from the server
        this.Qo.set("Online" /* Online */), t instanceof bt && 2 /* Removed */ === t.state && t.cause) 
        // There was an error on a target, don't wait for a consistent snapshot
        // to raise events
        try {
            await this.lh(t);
        } catch (e) {
            E("RemoteStore", "Failed to remove targets %s: %s ", t.targetIds.join(","), e), 
            await this._h(e);
        } else if (t instanceof gt ? this.Oo.Pe(t) : t instanceof vt ? this.Oo.Ce(t) : this.Oo.pe(t), 
        !e.isEqual(O.min())) try {
            const t = await this.$o.qi();
            e.o(t) >= 0 && 
            // We have received a target change with a global snapshot if the snapshot
            // version is not equal to SnapshotVersion.min().
            await this.fh(e);
        } catch (t) {
            E("RemoteStore", "Failed to raise snapshot:", t), await this._h(t);
        }
    }
    /**
     * Recovery logic for IndexedDB errors that takes the network offline until
     * `op` succeeds. Retries are scheduled with backoff using
     * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
     * validated via a generic operation.
     *
     * The returned Promise is resolved once the network is disabled and before
     * any retry attempt.
     */    async _h(t, e) {
        if (!Yn(t)) throw t;
        this.Mo.add(1 /* IndexedDbFailed */), 
        // Disable network and raise offline snapshots
        await this.sh(), this.Qo.set("Offline" /* Offline */), e || (
        // Use a simple read operation to determine if IndexedDB recovered.
        // Ideally, we would expose a health check directly on SimpleDb, but
        // RemoteStore only has access to persistence through LocalStore.
        e = () => this.$o.qi()), 
        // Probe IndexedDB periodically and re-enable network
        this.Is.Us(async () => {
            E("RemoteStore", "Retrying IndexedDB access"), await e(), this.Mo.delete(1 /* IndexedDbFailed */), 
            await this.Zo();
        });
    }
    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */    dh(t) {
        return t().catch(e => this._h(e, t));
    }
    /**
     * Takes a batch of changes from the Datastore, repackages them as a
     * RemoteEvent, and passes that on to the listener, which is typically the
     * SyncEngine.
     */    fh(t) {
        const e = this.Oo.Ne(t);
        // Update in-memory resume tokens. LocalStore will update the
        // persistent view of these when applying the completed RemoteEvent.
                // Finally raise remote event
        return e.Wt.forEach((e, n) => {
            if (e.resumeToken.H() > 0) {
                const s = this.Lo.get(n);
                // A watched target might have been removed already.
                                s && this.Lo.set(n, s.tt(e.resumeToken, t));
            }
        }), 
        // Re-establish listens for the targets that have been invalidated by
        // existence filter mismatches.
        e.Qt.forEach(t => {
            const e = this.Lo.get(t);
            if (!e) 
            // A watched target might have been removed already.
            return;
            // Clear the resume token for the target, since we're in a known mismatch
            // state.
                        this.Lo.set(t, e.tt(Z.Y, e.J)), 
            // Cause a hard reset by unwatching and rewatching immediately, but
            // deliberately don't send a resume token so that we get a full update.
            this.ah(t);
            // Mark the target we send as being on behalf of an existence filter
            // mismatch, but don't actually retain that in listenTargets. This ensures
            // that we flag the first re-listen this way without impacting future
            // listens of this target (that might happen e.g. on reconnect).
            const n = new tt(e.target, t, 1 /* ExistenceFilterMismatch */ , e.sequenceNumber);
            this.oh(n);
        }), this.uh.Ui(e);
    }
    /** Handles an error on a target */    async lh(t) {
        const e = t.cause;
        for (const n of t.targetIds) 
        // A watched target might have been removed already.
        this.Lo.has(n) && (await this.uh.wh(n, e), this.Lo.delete(n), this.Oo.removeTarget(n));
    }
    /**
     * Attempts to fill our write pipeline with writes from the LocalStore.
     *
     * Called internally to bootstrap or refill the write pipeline and by
     * SyncEngine whenever there are new mutations to process.
     *
     * Starts the write stream if necessary.
     */    async nh() {
        let t = this.xo.length > 0 ? this.xo[this.xo.length - 1].batchId : -1;
        for (;this.Th(); ) try {
            const e = await this.$o.nr(t);
            if (null === e) {
                0 === this.xo.length && this.Ho.Zr();
                break;
            }
            t = e.batchId, this.mh(e);
        } catch (t) {
            await this._h(t);
        }
        this.Eh() && this.Ih();
    }
    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */    Th() {
        return this.Bo() && this.xo.length < 10;
    }
    // For testing
    Rh() {
        return this.xo.length;
    }
    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */    mh(t) {
        this.xo.push(t), this.Ho.Yr() && this.Ho.wo && this.Ho.To(t.mutations);
    }
    Eh() {
        return this.Bo() && !this.Ho.Hr() && this.xo.length > 0;
    }
    Ih() {
        this.Ho.start();
    }
    async Yo() {
        this.Ho.Io();
    }
    async Jo() {
        // Send the write pipeline now that the stream is established.
        for (const t of this.xo) this.Ho.To(t.mutations);
    }
    async mo(t, e) {
        const n = this.xo.shift(), s = Wn.from(n, t, e);
        await this.dh(() => this.uh.Ah(s)), 
        // It's possible that with the completion of this mutation another
        // slot has freed up.
        await this.nh();
    }
    async Xo(t) {
        // If the write stream closed after the write handshake completes, a write
        // operation failed and we fail the pending operation.
        t && this.Ho.wo && 
        // This error affects the actual write.
        await this.Ph(t), 
        // The write stream might have been started by refilling the write
        // pipeline for failed writes
        this.Eh() && this.Ih();
    }
    async Ph(t) {
        // Only handle permanent errors here. If it's transient, just let the retry
        // logic kick in.
        if (it(e = t.code) && e !== k.ABORTED) {
            // This was a permanent error, the request itself was the problem
            // so it's not going to succeed if we resend it.
            const e = this.xo.shift();
            // In this case it's also unlikely that the server itself is melting
            // down -- this was just a bad request so inhibit backoff on the next
            // restart.
                        this.Ho.Jr(), await this.dh(() => this.uh.Vh(e.batchId, t)), 
            // It's possible that with the completion of this mutation
            // another slot has freed up.
            await this.nh();
        }
        var e;
        /**
 * Maps an error Code from a GRPC status identifier like 'NOT_FOUND'.
 *
 * @returns The Code equivalent to the given status string or undefined if
 *     there is no match.
 */    }
    async Wo() {
        this.Mo.add(4 /* ConnectivityChange */), await this.sh(), this.Qo.set("Unknown" /* Unknown */), 
        this.Ho.Jr(), this.jo.Jr(), this.Mo.delete(4 /* ConnectivityChange */), await this.Zo();
    }
    async yh(t) {
        this.Is.Qs(), 
        // Tear down and re-create our network streams. This will ensure we get a
        // fresh auth token for the new user and re-fill the write pipeline with
        // new mutations from the LocalStore (since mutations are per-user).
        E("RemoteStore", "RemoteStore received new credentials"), this.Mo.add(3 /* CredentialChange */), 
        await this.sh(), this.Qo.set("Unknown" /* Unknown */), await this.uh.yh(t), this.Mo.delete(3 /* CredentialChange */), 
        await this.Zo();
    }
    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */    async ph(t) {
        t ? (this.Mo.delete(2 /* IsSecondary */), await this.Zo()) : t || (this.Mo.add(2 /* IsSecondary */), 
        await this.sh(), this.Qo.set("Unknown" /* Unknown */));
    }
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
/**
 * Metadata state of the local client. Unlike `RemoteClientState`, this class is
 * mutable and keeps track of all pending mutations, which allows us to
 * update the range of pending mutation batch IDs as new mutations are added or
 * removed.
 *
 * The data in `LocalClientState` is not read from WebStorage and instead
 * updated via its instance methods. The updated state can be serialized via
 * `toWebStorageJSON()`.
 */
// Visible for testing.
class As {
    constructor() {
        this.activeTargetIds = Rt();
    }
    gh(t) {
        this.activeTargetIds = this.activeTargetIds.add(t);
    }
    vh(t) {
        this.activeTargetIds = this.activeTargetIds.delete(t);
    }
    /**
     * Converts this entry into a JSON-encoded format we can use for WebStorage.
     * Does not encode `clientId` as it is part of the key in WebStorage.
     */    bh() {
        const t = {
            activeTargetIds: this.activeTargetIds.F(),
            updateTimeMs: Date.now()
        };
        return JSON.stringify(t);
    }
}

/**
 * `MemorySharedClientState` is a simple implementation of SharedClientState for
 * clients using memory persistence. The state in this class remains fully
 * isolated and no synchronization is performed.
 */ class Ps {
    constructor() {
        this.Sh = new As, this.Ch = {}, this.yo = null, this.Zn = null;
    }
    Dh(t) {
        // No op.
    }
    Fh(t, e, n) {
        // No op.
    }
    Nh(t) {
        return this.Sh.gh(t), this.Ch[t] || "not-current";
    }
    $h(t, e, n) {
        this.Ch[t] = e;
    }
    kh(t) {
        this.Sh.vh(t);
    }
    xh(t) {
        return this.Sh.activeTargetIds.has(t);
    }
    Lh(t) {
        delete this.Ch[t];
    }
    Oh() {
        return this.Sh.activeTargetIds;
    }
    Mh(t) {
        return this.Sh.activeTargetIds.has(t);
    }
    start() {
        return this.Sh = new As, Promise.resolve();
    }
    Vi(t, e, n) {
        // No op.
    }
    qh(t) {
        // No op.
    }
    rh() {}
    ns(t) {}
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
 */ class Vs {
    constructor(t) {
        this.key = t;
    }
}

class ys {
    constructor(t) {
        this.key = t;
    }
}

/**
 * View is responsible for computing the final merged truth of what docs are in
 * a query. It gets notified of local and remote changes to docs, and applies
 * the query filters and limits to determine the most correct possible results.
 */ class ps {
    constructor(t, 
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
        this.Wh = Et(), 
        /** Document Keys that have local changes */
        this.Mt = Et(), this.Qh = yn(t), this.jh = new At(this.Qh);
    }
    /**
     * The set of remote documents that the server has told us belongs to the target associated with
     * this view.
     */    get Gh() {
        return this.Uh;
    }
    /**
     * Iterates over a set of doc changes, applies the query limit, and computes
     * what the new results should be, what the changes were, and whether we may
     * need to go back to the local cache for more results. Does not make any
     * changes to the view.
     * @param docChanges The doc changes to apply to this view.
     * @param previousChanges If this is being called with a refill, then start
     *        with this set of docs and changes instead of the current view.
     * @return a new set of docs, changes, and refill flag.
     */    Kh(t, e) {
        const n = e ? e.zh : new Pt, s = e ? e.jh : this.jh;
        let i = e ? e.Mt : this.Mt, r = s, o = !1;
        // Track the last doc in a (full) limit. This is necessary, because some
        // update (a delete, or an update moving a doc past the old limit) might
        // mean there is some other document in the local cache that either should
        // come (1) between the old last limit doc and the new last document, in the
        // case of updates, or (2) after the new last document, in the case of
        // deletes. So we keep this doc at the old limit to compare the updates to.
        // Note that this should never get used in a refill (when previousChanges is
        // set), because there will only be adds -- no deletes or updates.
        const h = this.query.hn() && s.size === this.query.limit ? s.last() : null, a = this.query.an() && s.size === this.query.limit ? s.first() : null;
        // Drop documents out to meet limit/limitToLast requirement.
        if (t.ot((t, e) => {
            const u = s.get(t);
            let c = e instanceof an ? e : null;
            c && (c = Vn(this.query, c) ? c : null);
            const l = !!u && this.Mt.has(u.key), _ = !!c && (c.Ge || 
            // We only consider committed mutations for documents that were
            // mutated during the lifetime of the view.
            this.Mt.has(c.key) && c.hasCommittedMutations);
            let f = !1;
            // Calculate change
                        if (u && c) {
                u.data().isEqual(c.data()) ? l !== _ && (n.track({
                    type: 3 /* Metadata */ ,
                    doc: c
                }), f = !0) : this.Hh(u, c) || (n.track({
                    type: 2 /* Modified */ ,
                    doc: c
                }), f = !0, (h && this.Qh(c, h) > 0 || a && this.Qh(c, a) < 0) && (
                // This doc moved from inside the limit to outside the limit.
                // That means there may be some other doc in the local cache
                // that should be included instead.
                o = !0));
            } else !u && c ? (n.track({
                type: 0 /* Added */ ,
                doc: c
            }), f = !0) : u && !c && (n.track({
                type: 1 /* Removed */ ,
                doc: u
            }), f = !0, (h || a) && (
            // A doc was removed from a full limit query. We'll need to
            // requery from the local cache to see if we know about some other
            // doc that should be in the results.
            o = !0));
            f && (c ? (r = r.add(c), i = _ ? i.add(t) : i.delete(t)) : (r = r.delete(t), i = i.delete(t)));
        }), this.query.hn() || this.query.an()) for (;r.size > this.query.limit; ) {
            const t = this.query.hn() ? r.last() : r.first();
            r = r.delete(t.key), i = i.delete(t.key), n.track({
                type: 1 /* Removed */ ,
                doc: t
            });
        }
        return {
            jh: r,
            zh: n,
            Yh: o,
            Mt: i
        };
    }
    Hh(t, e) {
        // We suppress the initial change event for documents that were modified as
        // part of a write acknowledgment (e.g. when the value of a server transform
        // is applied) as Watch will send us the same document again.
        // By suppressing the event, we only raise two user visible events (one with
        // `hasPendingWrites` and the final state of the document) instead of three
        // (one with `hasPendingWrites`, the modified document with
        // `hasPendingWrites` and the final state of the document).
        return t.Ge && e.hasCommittedMutations && !e.Ge;
    }
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
    Xh(t, e, n) {
        const s = this.jh;
        this.jh = t.jh, this.Mt = t.Mt;
        // Sort changes based on type and query comparator
        const i = t.zh.Lt();
        i.sort((t, e) => function(t, e) {
            const n = t => {
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
                    return P();
                }
            };
            return n(t) - n(e);
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
 */ (t.type, e.type) || this.Qh(t.doc, e.doc)), this.Jh(n);
        const r = e ? this.Zh() : [], o = 0 === this.Wh.size && this.Ht ? 1 /* Synced */ : 0 /* Local */ , h = o !== this.Bh;
        if (this.Bh = o, 0 !== i.length || h) {
            return {
                snapshot: new Vt(this.query, t.jh, s, i, t.Mt, 0 /* Local */ === o, h, 
                /* excludesMetadataChanges= */ !1),
                ta: r
            };
        }
        // no changes
        return {
            ta: r
        };
    }
    /**
     * Applies an OnlineState change to the view, potentially generating a
     * ViewChange if the view's syncState changes as a result.
     */    ea(t) {
        return this.Ht && "Offline" /* Offline */ === t ? (
        // If we're offline, set `current` to false and then call applyChanges()
        // to refresh our syncState and generate a ViewChange as appropriate. We
        // are guaranteed to get a new TargetChange that sets `current` back to
        // true once the client is back online.
        this.Ht = !1, this.Xh({
            jh: this.jh,
            zh: new Pt,
            Mt: this.Mt,
            Yh: !1
        }, 
        /* updateLimboDocuments= */ !1)) : {
            ta: []
        };
    }
    /**
     * Returns whether the doc for the given key should be in limbo.
     */    na(t) {
        // If the remote end says it's part of this query, it's not in limbo.
        return !this.Uh.has(t) && (
        // The local store doesn't think it's a result, so it shouldn't be in limbo.
        !!this.jh.has(t) && !this.jh.get(t).Ge);
    }
    /**
     * Updates syncedDocuments, current, and limbo docs based on the given change.
     * Returns the list of changes to which docs are in limbo.
     */    Jh(t) {
        t && (t.Yt.forEach(t => this.Uh = this.Uh.add(t)), t.Xt.forEach(t => {}), t.Jt.forEach(t => this.Uh = this.Uh.delete(t)), 
        this.Ht = t.Ht);
    }
    Zh() {
        // We can only determine limbo documents when we're in-sync with the server.
        if (!this.Ht) return [];
        // TODO(klimt): Do this incrementally so that it's not quadratic when
        // updating many documents.
                const t = this.Wh;
        this.Wh = Et(), this.jh.forEach(t => {
            this.na(t.key) && (this.Wh = this.Wh.add(t.key));
        });
        // Diff the new limbo docs with the old limbo docs.
        const e = [];
        return t.forEach(t => {
            this.Wh.has(t) || e.push(new ys(t));
        }), this.Wh.forEach(n => {
            t.has(n) || e.push(new Vs(n));
        }), e;
    }
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
    sa(t) {
        this.Uh = t._r, this.Wh = Et();
        const e = this.Kh(t.documents);
        return this.Xh(e, /*updateLimboDocuments=*/ !0);
    }
    /**
     * Returns a view snapshot as if this query was just listened to. Contains
     * a document add for every existing document and the `fromCache` and
     * `hasPendingWrites` status of the already established view.
     */
    // PORTING NOTE: Multi-tab only.
    ia() {
        return Vt.Bt(this.query, this.jh, this.Mt, 0 /* Local */ === this.Bh);
    }
}

/**
 * QueryView contains all of the data that SyncEngine needs to keep track of for
 * a particular query.
 */
class gs {
    constructor(
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
    }
}

/** Tracks a limbo resolution. */ class vs {
    constructor(t) {
        this.key = t, 
        /**
         * Set to true once we've received a document. This is used in
         * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
         * decide whether it needs to manufacture a delete event for the target once
         * the target is CURRENT.
         */
        this.ra = !1;
    }
}

/**
 * An implementation of `SyncEngine` coordinating with other parts of SDK.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */ class bs {
    constructor(t, e, n, 
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    s, i, r) {
        this.$o = t, this.oa = e, this.ko = n, this.ha = s, this.currentUser = i, this.aa = r, 
        this.ua = null, this.ca = new $(t => An(t), Rn), this.la = new Map, 
        /**
         * The keys of documents that are in limbo for which we haven't yet started a
         * limbo resolution query.
         */
        this._a = [], 
        /**
         * Keeps track of the target ID for each document that is in limbo with an
         * active target.
         */
        this.fa = new ot(W.P), 
        /**
         * Keeps track of the information about an active limbo resolution for each
         * active target ID that was started for the purpose of limbo resolution.
         */
        this.da = new Map, this.wa = new hs, 
        /** Stores user completion handlers, indexed by User and BatchId. */
        this.Ta = {}, 
        /** Stores user callbacks waiting for all pending writes to be acknowledged. */
        this.ma = new Map, this.Ea = is.ci(), this.onlineState = "Unknown" /* Unknown */ , 
        // The primary state is set to `true` or `false` immediately after Firestore
        // startup. In the interim, a client should only be considered primary if
        // `isPrimary` is true.
        this.Ia = void 0;
    }
    get Ra() {
        return !0 === this.Ia;
    }
    subscribe(t) {
        this.ua = t;
    }
    async listen(t) {
        let e, n;
        this.Aa("listen()");
        const s = this.ca.get(t);
        if (s) 
        // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
        // already exists when EventManager calls us for the first time. This
        // happens when the primary tab is already listening to this query on
        // behalf of another tab and the user of the primary also starts listening
        // to the query. EventManager will not have an assigned target ID in this
        // case and calls `listen` to obtain this ID.
        e = s.targetId, this.ha.Nh(e), n = s.view.ia(); else {
            const s = await this.$o.rr(Tn(t)), i = this.ha.Nh(s.targetId);
            e = s.targetId, n = await this.Pa(t, e, "current" === i), this.Ra && this.oa.listen(s);
        }
        return n;
    }
    /**
     * Registers a view for a previously unknown query and computes its initial
     * snapshot.
     */    async Pa(t, e, n) {
        const s = await this.$o.cr(t, 
        /* usePreviousResults= */ !0), i = new ps(t, s._r), r = i.Kh(s.documents), o = pt.zt(e, n && "Offline" /* Offline */ !== this.onlineState), h = i.Xh(r, 
        /* updateLimboDocuments= */ this.Ra, o);
        this.Va(e, h.ta);
        const a = new gs(t, e, i);
        return this.ca.set(t, a), this.la.has(e) ? this.la.get(e).push(t) : this.la.set(e, [ t ]), 
        h.snapshot;
    }
    async hh(t) {
        this.Aa("unlisten()");
        const e = this.ca.get(t), n = this.la.get(e.targetId);
        // Only clean up the query view and target if this is the only query mapped
        // to the target.
                if (n.length > 1) return this.la.set(e.targetId, n.filter(e => !Rn(e, t))), 
        void this.ca.delete(t);
        // No other queries are mapped to the target, clean up the query and the target.
                if (this.Ra) {
            // We need to remove the local query target first to allow us to verify
            // whether any other client is still interested in this target.
            this.ha.kh(e.targetId);
            this.ha.Mh(e.targetId) || await this.$o.ur(e.targetId, /*keepPersistedTargetData=*/ !1).then(() => {
                this.ha.Lh(e.targetId), this.oa.hh(e.targetId), this.ya(e.targetId);
            }).catch(os);
        } else this.ya(e.targetId), await this.$o.ur(e.targetId, 
        /*keepPersistedTargetData=*/ !0);
    }
    async write(t, e) {
        this.Aa("write()");
        try {
            const n = await this.$o.bi(t);
            this.ha.Dh(n.batchId), this.pa(n.batchId, e), await this.ga(n.Ci), await this.oa.nh();
        } catch (t) {
            // If we can't persist the mutation, we reject the user callback and
            // don't send the mutation. The user can then retry the write.
            const n = ts(t, "Failed to persist write");
            e.reject(n);
        }
    }
    async Ui(t) {
        this.Aa("applyRemoteEvent()");
        try {
            const e = await this.$o.Ui(t);
            // Update `receivedDocument` as appropriate for any limbo targets.
                        t.Wt.forEach((t, e) => {
                const n = this.da.get(e);
                n && (
                // Since this is a limbo resolution lookup, it's for a single document
                // and it could be added, modified, or removed, but not a combination.
                V(t.Yt.size + t.Xt.size + t.Jt.size <= 1), t.Yt.size > 0 ? n.ra = !0 : t.Xt.size > 0 ? V(n.ra) : t.Jt.size > 0 && (V(n.ra), 
                n.ra = !1));
            }), await this.ga(e, t);
        } catch (t) {
            await os(t);
        }
    }
    ea(t, e) {
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
        if (this.Ra && 0 /* RemoteStore */ === e || !this.Ra && 1 /* SharedClientState */ === e) {
            this.Aa("applyOnlineStateChange()");
            const e = [];
            this.ca.forEach((n, s) => {
                const i = s.view.ea(t);
                i.snapshot && e.push(i.snapshot);
            }), this.ua.va(t), this.ua.lo(e), this.onlineState = t, this.Ra && this.ha.qh(t);
        }
    }
    async wh(t, e) {
        this.Aa("rejectListens()"), 
        // PORTING NOTE: Multi-tab only.
        this.ha.$h(t, "rejected", e);
        const n = this.da.get(t), s = n && n.key;
        if (s) {
            // TODO(klimt): We really only should do the following on permission
            // denied errors, but we don't have the cause code here.
            // It's a limbo doc. Create a synthetic event saying it was deleted.
            // This is kind of a hack. Ideally, we would have a method in the local
            // store to purge a document. However, it would be tricky to keep all of
            // the local store's invariants with another method.
            let e = new ot(W.P);
            e = e.nt(s, new un(s, O.min()));
            const n = Et().add(s), i = new yt(O.min(), 
            /* targetChanges= */ new Map, 
            /* targetMismatches= */ new ut(v), e, n);
            await this.Ui(i), 
            // Since this query failed, we won't want to manually unlisten to it.
            // We only remove it from bookkeeping after we successfully applied the
            // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
            // this query when the RemoteStore restarts the Watch stream, which should
            // re-trigger the target failure.
            this.fa = this.fa.remove(s), this.da.delete(t), this.ba();
        } else await this.$o.ur(t, /* keepPersistedTargetData */ !1).then(() => this.ya(t, e)).catch(os);
    }
    async Ah(t) {
        this.Aa("applySuccessfulWrite()");
        const e = t.batch.batchId;
        try {
            const n = await this.$o.Di(t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught
            // up), so we raise user callbacks first so that they consistently happen
            // before listen events.
                        this.Sa(e, /*error=*/ null), this.Ca(e), this.ha.Fh(e, "acknowledged"), 
            await this.ga(n);
        } catch (t) {
            await os(t);
        }
    }
    async Vh(t, e) {
        this.Aa("rejectFailedWrite()");
        try {
            const n = await this.$o.xi(t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught up),
            // so we raise user callbacks first so that they consistently happen before
            // listen events.
                        this.Sa(t, e), this.Ca(t), this.ha.Fh(t, "rejected", e), await this.ga(n);
        } catch (e) {
            await os(e);
        }
    }
    async Da(t) {
        this.oa.Bo() || E("SyncEngine", "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");
        try {
            const e = await this.$o.Mi();
            if (-1 === e) 
            // Trigger the callback right away if there is no pending writes at the moment.
            return void t.resolve();
            const n = this.ma.get(e) || [];
            n.push(t), this.ma.set(e, n);
        } catch (e) {
            const n = ts(e, "Initialization of waitForPendingWrites() operation failed");
            t.reject(n);
        }
    }
    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */    Ca(t) {
        (this.ma.get(t) || []).forEach(t => {
            t.resolve();
        }), this.ma.delete(t);
    }
    /** Reject all outstanding callbacks waiting for pending writes to complete. */    Fa(t) {
        this.ma.forEach(e => {
            e.forEach(e => {
                e.reject(new x(k.CANCELLED, t));
            });
        }), this.ma.clear();
    }
    pa(t, e) {
        let n = this.Ta[this.currentUser.Sr()];
        n || (n = new ot(v)), n = n.nt(t, e), this.Ta[this.currentUser.Sr()] = n;
    }
    /**
     * Resolves or rejects the user callback for the given batch and then discards
     * it.
     */    Sa(t, e) {
        let n = this.Ta[this.currentUser.Sr()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
                if (n) {
            const s = n.get(t);
            s && (e ? s.reject(e) : s.resolve(), n = n.remove(t)), this.Ta[this.currentUser.Sr()] = n;
        }
    }
    ya(t, e = null) {
        this.ha.kh(t);
        for (const n of this.la.get(t)) this.ca.delete(n), e && this.ua.Na(n, e);
        if (this.la.delete(t), this.Ra) {
            this.wa.Vr(t).forEach(t => {
                this.wa.gr(t) || 
                // We removed the last reference for this key
                this.$a(t);
            });
        }
    }
    $a(t) {
        // It's possible that the target already got removed because the query failed. In that case,
        // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
        const e = this.fa.get(t);
        null !== e && (this.oa.hh(e), this.fa = this.fa.remove(t), this.da.delete(e), this.ba());
    }
    Va(t, e) {
        for (const n of e) if (n instanceof Vs) this.wa.tr(n.key, t), this.ka(n); else if (n instanceof ys) {
            E("SyncEngine", "Document no longer in limbo: " + n.key), this.wa.er(n.key, t);
            this.wa.gr(n.key) || 
            // We removed the last reference for this key
            this.$a(n.key);
        } else P();
    }
    ka(t) {
        const e = t.key;
        this.fa.get(e) || (E("SyncEngine", "New document in limbo: " + e), this._a.push(e), 
        this.ba());
    }
    /**
     * Starts listens for documents in limbo that are enqueued for resolution,
     * subject to a maximum number of concurrent resolutions.
     *
     * Without bounding the number of concurrent resolutions, the server can fail
     * with "resource exhausted" errors which can lead to pathological client
     * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
     */    ba() {
        for (;this._a.length > 0 && this.fa.size < this.aa; ) {
            const t = this._a.shift(), e = this.Ea.next();
            this.da.set(e, new vs(t)), this.fa = this.fa.nt(t, e), this.oa.listen(new tt(Tn(fn(t.path)), e, 2 /* LimboResolution */ , Kn.ss));
        }
    }
    // Visible for testing
    xa() {
        return this.fa;
    }
    // Visible for testing
    La() {
        return this._a;
    }
    async ga(t, e) {
        const n = [], s = [], i = [];
        this.ca.forEach((r, o) => {
            i.push(Promise.resolve().then(() => {
                const e = o.view.Kh(t);
                return e.Yh ? this.$o.cr(o.query, /* usePreviousResults= */ !1).then(({documents: t}) => o.view.Kh(t, e)) : e;
                // The query has a limit and some docs were removed, so we need
                // to re-run the query against the local store to make sure we
                // didn't lose any good docs that had been past the limit.
                        }).then(t => {
                const i = e && e.Wt.get(o.targetId), r = o.view.Xh(t, 
                /* updateLimboDocuments= */ this.Ra, i);
                if (this.Va(o.targetId, r.ta), r.snapshot) {
                    this.Ra && this.ha.$h(o.targetId, r.snapshot.fromCache ? "not-current" : "current"), 
                    n.push(r.snapshot);
                    const t = Gn.Jn(o.targetId, r.snapshot);
                    s.push(t);
                }
            }));
        }), await Promise.all(i), this.ua.lo(n), await this.$o.Zi(s);
    }
    Aa(t) {}
    async yh(t) {
        if (!this.currentUser.isEqual(t)) {
            E("SyncEngine", "User change. New user:", t.Sr());
            const e = await this.$o.Vi(t);
            this.currentUser = t, 
            // Fails tasks waiting for pending writes requested by previous user.
            this.Fa("'waitForPendingWrites' promise is rejected due to a user change."), 
            // TODO(b/114226417): Consider calling this only in the primary tab.
            this.ha.Vi(t, e.gi, e.vi), await this.ga(e.pi);
        }
    }
    xe(t) {
        const e = this.da.get(t);
        if (e && e.ra) return Et().add(e.key);
        {
            let e = Et();
            const n = this.la.get(t);
            if (!n) return e;
            for (const t of n) {
                const n = this.ca.get(t);
                e = e.Dt(n.view.Gh);
            }
            return e;
        }
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
 */
/**
 * Holds the listeners and the last received ViewSnapshot for a query being
 * tracked by EventManager.
 */
class Ss {
    constructor() {
        this.Oa = void 0, this.Ma = [];
    }
}

/**
 * EventManager is responsible for mapping queries to query event emitters.
 * It handles "fan-out". -- Identical queries will re-use the same watch on the
 * backend.
 */ class Cs {
    constructor(t) {
        this.uh = t, this.qa = new $(t => An(t), Rn), this.onlineState = "Unknown" /* Unknown */ , 
        this.Ua = new Set, this.uh.subscribe(this);
    }
    async listen(t) {
        const e = t.query;
        let n = !1, s = this.qa.get(e);
        if (s || (n = !0, s = new Ss), n) try {
            s.Oa = await this.uh.listen(e);
        } catch (e) {
            const n = ts(e, `Initialization of query '${Pn(t.query)}' failed`);
            return void t.onError(n);
        }
        this.qa.set(e, s), s.Ma.push(t);
        // Run global snapshot listeners if a consistent snapshot has been emitted.
        t.ea(this.onlineState);
        if (s.Oa) {
            t.Ba(s.Oa) && this.Wa();
        }
    }
    async hh(t) {
        const e = t.query;
        let n = !1;
        const s = this.qa.get(e);
        if (s) {
            const e = s.Ma.indexOf(t);
            e >= 0 && (s.Ma.splice(e, 1), n = 0 === s.Ma.length);
        }
        if (n) return this.qa.delete(e), this.uh.hh(e);
    }
    lo(t) {
        let e = !1;
        for (const n of t) {
            const t = n.query, s = this.qa.get(t);
            if (s) {
                for (const t of s.Ma) t.Ba(n) && (e = !0);
                s.Oa = n;
            }
        }
        e && this.Wa();
    }
    Na(t, e) {
        const n = this.qa.get(t);
        if (n) for (const t of n.Ma) t.onError(e);
        // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
        // after an error.
                this.qa.delete(t);
    }
    va(t) {
        this.onlineState = t;
        let e = !1;
        this.qa.forEach((n, s) => {
            for (const n of s.Ma) 
            // Run global snapshot listeners if a consistent snapshot has been emitted.
            n.ea(t) && (e = !0);
        }), e && this.Wa();
    }
    Qa(t) {
        this.Ua.add(t), 
        // Immediately fire an initial event, indicating all existing listeners
        // are in-sync.
        t.next();
    }
    ja(t) {
        this.Ua.delete(t);
    }
    // Call all global snapshot listeners that have been set.
    Wa() {
        this.Ua.forEach(t => {
            t.next();
        });
    }
}

/**
 * QueryListener takes a series of internal view snapshots and determines
 * when to raise the event.
 *
 * It uses an Observer to dispatch events.
 */ class Ds {
    constructor(t, e, n) {
        this.query = t, this.Ga = e, 
        /**
         * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
         * observer. This flag is set to true once we've actually raised an event.
         */
        this.Ka = !1, this.za = null, this.onlineState = "Unknown" /* Unknown */ , this.options = n || {};
    }
    /**
     * Applies the new ViewSnapshot to this listener, raising a user-facing event
     * if applicable (depending on what changed, whether the user has opted into
     * metadata-only changes, etc.). Returns true if a user-facing event was
     * indeed raised.
     */    Ba(t) {
        if (!this.options.includeMetadataChanges) {
            // Remove the metadata only changes.
            const e = [];
            for (const n of t.docChanges) 3 /* Metadata */ !== n.type && e.push(n);
            t = new Vt(t.query, t.docs, t.Ot, e, t.Mt, t.fromCache, t.qt, 
            /* excludesMetadataChanges= */ !0);
        }
        let e = !1;
        return this.Ka ? this.Ha(t) && (this.Ga.next(t), e = !0) : this.Ya(t, this.onlineState) && (this.Xa(t), 
        e = !0), this.za = t, e;
    }
    onError(t) {
        this.Ga.error(t);
    }
    /** Returns whether a snapshot was raised. */    ea(t) {
        this.onlineState = t;
        let e = !1;
        return this.za && !this.Ka && this.Ya(this.za, t) && (this.Xa(this.za), e = !0), 
        e;
    }
    Ya(t, e) {
        // Always raise the first event when we're synced
        if (!t.fromCache) return !0;
        // NOTE: We consider OnlineState.Unknown as online (it should become Offline
        // or Online if we wait long enough).
                const n = "Offline" /* Offline */ !== e;
        // Don't raise the event if we're online, aren't synced yet (checked
        // above) and are waiting for a sync.
                return (!this.options.Ja || !n) && (!t.docs._() || "Offline" /* Offline */ === e);
        // Raise data from cache if we have any documents or we are offline
        }
    Ha(t) {
        // We don't need to handle includeDocumentMetadataChanges here because
        // the Metadata only changes have already been stripped out if needed.
        // At this point the only changes we will see are the ones we should
        // propagate.
        if (t.docChanges.length > 0) return !0;
        const e = this.za && this.za.hasPendingWrites !== t.hasPendingWrites;
        return !(!t.qt && !e) && !0 === this.options.includeMetadataChanges;
        // Generally we should have hit one of the cases above, but it's possible
        // to get here if there were only metadata docChanges and they got
        // stripped out.
        }
    Xa(t) {
        t = Vt.Bt(t.query, t.docs, t.Mt, t.fromCache), this.Ka = !0, this.Ga.next(t);
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
// TOOD(b/140938512): Drop SimpleQueryEngine and rename IndexFreeQueryEngine.
/**
 * A query engine that takes advantage of the target document mapping in the
 * QueryCache. The IndexFreeQueryEngine optimizes query execution by only
 * reading the documents that previously matched a query plus any documents that were
 * edited after the query was last listened to.
 *
 * There are some cases where Index-Free queries are not guaranteed to produce
 * the same results as full collection scans. In these cases, the
 * IndexFreeQueryEngine falls back to full query processing. These cases are:
 *
 * - Limit queries where a document that matched the query previously no longer
 *   matches the query.
 *
 * - Limit queries where a document edit may cause the document to sort below
 *   another document that is in the local cache.
 *
 * - Queries that have never been CURRENT or free of Limbo documents.
 */ class Fs {
    Pi(t) {
        this.Za = t;
    }
    Wn(t, e, s, i) {
        // Queries that match all documents don't benefit from using
        // IndexFreeQueries. It is more efficient to scan all documents in a
        // collection, rather than to perform individual lookups.
        return e.on() || s.isEqual(O.min()) ? this.tu(t, e) : this.Za.qn(t, i).next(r => {
            const o = this.eu(e, r);
            return (e.hn() || e.an()) && this.Yh(e.en, o, i, s) ? this.tu(t, e) : (m() <= n.DEBUG && E("IndexFreeQueryEngine", "Re-using previous result from %s to execute query: %s", s.toString(), Pn(e)), 
            this.Za.Wn(t, e, s).next(t => (
            // We merge `previousResults` into `updateResults`, since
            // `updateResults` is already a DocumentMap. If a document is
            // contained in both lists, then its contents are the same.
            o.forEach(e => {
                t = t.nt(e.key, e);
            }), t)));
        });
        // Queries that have never seen a snapshot without limbo free documents
        // should also be run as a full collection scan.
        }
    /** Applies the query filter and sorting to the provided documents.  */    eu(t, e) {
        // Sort the documents and re-apply the query filter since previously
        // matching documents do not necessarily still match the query.
        let n = new ut(yn(t));
        return e.forEach((e, s) => {
            s instanceof an && Vn(t, s) && (n = n.add(s));
        }), n;
    }
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
     */    Yh(t, e, n, s) {
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
                const i = "F" /* First */ === t ? e.last() : e.first();
        return !!i && (i.hasPendingWrites || i.version.o(s) > 0);
    }
    tu(t, e) {
        return m() <= n.DEBUG && E("IndexFreeQueryEngine", "Using full collection scan to execute query:", Pn(e)), 
        this.Za.Wn(t, e, O.min());
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
 */ class Ns {
    constructor(t, e) {
        this.$n = t, this.Yi = e, 
        /**
         * The set of all mutations that have been sent but not yet been applied to
         * the backend.
         */
        this.Nn = [], 
        /** Next value to use when assigning sequential IDs to each mutation batch. */
        this.nu = 1, 
        /** An ordered mapping between documents and the mutations batch IDs. */
        this.su = new ut(as.mr);
    }
    iu(t) {
        return Qn.resolve(0 === this.Nn.length);
    }
    Si(t, e, n, s) {
        const i = this.nu;
        if (this.nu++, this.Nn.length > 0) {
            this.Nn[this.Nn.length - 1];
        }
        const r = new Bn(i, e, n, s);
        this.Nn.push(r);
        // Track references by document key and index collection parents.
        for (const e of s) this.su = this.su.add(new as(e.key, i)), this.$n.hi(t, e.key.path.g());
        return Qn.resolve(r);
    }
    Li(t, e) {
        return Qn.resolve(this.ru(e));
    }
    sr(t, e) {
        const n = e + 1, s = this.ou(n), i = s < 0 ? 0 : s;
        // The requested batchId may still be out of range so normalize it to the
        // start of the queue.
                return Qn.resolve(this.Nn.length > i ? this.Nn[i] : null);
    }
    Mi() {
        return Qn.resolve(0 === this.Nn.length ? -1 : this.nu - 1);
    }
    yi(t) {
        return Qn.resolve(this.Nn.slice());
    }
    xn(t, e) {
        const n = new as(e, 0), s = new as(e, Number.POSITIVE_INFINITY), i = [];
        return this.su.bt([ n, s ], t => {
            const e = this.ru(t.vr);
            i.push(e);
        }), Qn.resolve(i);
    }
    Bn(t, e) {
        let n = new ut(v);
        return e.forEach(t => {
            const e = new as(t, 0), s = new as(t, Number.POSITIVE_INFINITY);
            this.su.bt([ e, s ], t => {
                n = n.add(t.vr);
            });
        }), Qn.resolve(this.hu(n));
    }
    zn(t, e) {
        // Use the query path as a prefix for testing if a document matches the
        // query.
        const n = e.path, s = n.length + 1;
        // Construct a document reference for actually scanning the index. Unlike
        // the prefix the document key in this reference must have an even number of
        // segments. The empty segment can be used a suffix of the query path
        // because it precedes all other segments in an ordered traversal.
        let i = n;
        W.W(i) || (i = i.child(""));
        const r = new as(new W(i), 0);
        // Find unique batchIDs referenced by all documents potentially matching the
        // query.
                let o = new ut(v);
        return this.su.St(t => {
            const e = t.key.path;
            return !!n.C(e) && (
            // Rows with document keys more than one segment longer than the query
            // path can't be matches. For example, a query on 'rooms' can't match
            // the document /rooms/abc/messages/xyx.
            // TODO(mcg): we'll need a different scanner when we implement
            // ancestor queries.
            e.length === s && (o = o.add(t.vr)), !0);
        }, r), Qn.resolve(this.hu(o));
    }
    hu(t) {
        // Construct an array of matching batches, sorted by batchID to ensure that
        // multiple mutations affecting the same document key are applied in order.
        const e = [];
        return t.forEach(t => {
            const n = this.ru(t);
            null !== n && e.push(n);
        }), e;
    }
    Oi(t, e) {
        V(0 === this.au(e.batchId, "removed")), this.Nn.shift();
        let n = this.su;
        return Qn.forEach(e.mutations, s => {
            const i = new as(s.key, e.batchId);
            return n = n.delete(i), this.Yi.uu(t, s.key);
        }).next(() => {
            this.su = n;
        });
    }
    cu(t) {
        // No-op since the memory mutation queue does not maintain a separate cache.
    }
    gr(t, e) {
        const n = new as(e, 0), s = this.su.Ct(n);
        return Qn.resolve(e.isEqual(s && s.key));
    }
    ki(t) {
        return this.Nn.length, Qn.resolve();
    }
    /**
     * Finds the index of the given batchId in the mutation queue and asserts that
     * the resulting index is within the bounds of the queue.
     *
     * @param batchId The batchId to search for
     * @param action A description of what the caller is doing, phrased in passive
     * form (e.g. "acknowledged" in a routine that acknowledges batches).
     */    au(t, e) {
        return this.ou(t);
    }
    /**
     * Finds the index of the given batchId in the mutation queue. This operation
     * is O(1).
     *
     * @return The computed index of the batch with the given batchId, based on
     * the state of the queue. Note this index can be negative if the requested
     * batchId has already been remvoed from the queue or past the end of the
     * queue if the batchId is larger than the last added batch.
     */    ou(t) {
        if (0 === this.Nn.length) 
        // As an index this is past the end of the queue
        return 0;
        // Examine the front of the queue to figure out the difference between the
        // batchId and indexes in the array. Note that since the queue is ordered
        // by batchId, if the first batch has a larger batchId then the requested
        // batchId doesn't exist in the queue.
                return t - this.Nn[0].batchId;
    }
    /**
     * A version of lookupMutationBatch that doesn't return a promise, this makes
     * other functions that uses this code easier to read and more efficent.
     */    ru(t) {
        const e = this.ou(t);
        if (e < 0 || e >= this.Nn.length) return null;
        return this.Nn[e];
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
 */ class $s {
    /**
     * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
     * return 0 to avoid unnecessarily doing the work of calculating the size.
     */
    constructor(t, e) {
        this.$n = t, this.lu = e, 
        /** Underlying cache of documents and their read times. */
        this.docs = new ot(W.P), 
        /** Size of all cached documents. */
        this.size = 0;
    }
    /**
     * Adds the supplied entry to the cache and updates the cache size as appropriate.
     *
     * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */    zi(t, e, n) {
        const s = e.key, i = this.docs.get(s), r = i ? i.size : 0, o = this.lu(e);
        return this.docs = this.docs.nt(s, {
            _u: e,
            size: o,
            readTime: n
        }), this.size += o - r, this.$n.hi(t, s.path.g());
    }
    /**
     * Removes the specified entry from the cache and updates the cache size as appropriate.
     *
     * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */    Ki(t) {
        const e = this.docs.get(t);
        e && (this.docs = this.docs.remove(t), this.size -= e.size);
    }
    On(t, e) {
        const n = this.docs.get(e);
        return Qn.resolve(n ? n._u : null);
    }
    getEntries(t, e) {
        let n = ft();
        return e.forEach(t => {
            const e = this.docs.get(t);
            n = n.nt(t, e ? e._u : null);
        }), Qn.resolve(n);
    }
    Wn(t, e, n) {
        let s = wt();
        // Documents are ordered by key, so we can use a prefix scan to narrow down
        // the documents we need to match the query against.
                const i = new W(e.path.child("")), r = this.docs.ut(i);
        for (;r.wt(); ) {
            const {key: t, value: {_u: i, readTime: o}} = r.dt();
            if (!e.path.C(t.path)) break;
            o.o(n) <= 0 || i instanceof an && Vn(e, i) && (s = s.nt(i.key, i));
        }
        return Qn.resolve(s);
    }
    fu(t, e) {
        return Qn.forEach(this.docs, t => e(t));
    }
    Fi(t) {
        // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
        // a separate changelog and does not need special handling for removals.
        return new $s.du(this);
    }
    wu(t) {
        return Qn.resolve(this.size);
    }
}

/**
 * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
 */ $s.du = class extends class {
    constructor() {
        // A mapping of document key to the new cache entry that should be written (or null if any
        // existing cache entry should be removed).
        this.Ci = new $(t => t.toString(), (t, e) => t.isEqual(e)), this.Tu = !1;
    }
    set readTime(t) {
        this.mu = t;
    }
    get readTime() {
        return this.mu;
    }
    /**
     * Buffers a `RemoteDocumentCache.addEntry()` call.
     *
     * You can only modify documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */    zi(t, e) {
        this.Eu(), this.readTime = e, this.Ci.set(t.key, t);
    }
    /**
     * Buffers a `RemoteDocumentCache.removeEntry()` call.
     *
     * You can only remove documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */    Ki(t, e) {
        this.Eu(), e && (this.readTime = e), this.Ci.set(t, null);
    }
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
     */    On(t, e) {
        this.Eu();
        const n = this.Ci.get(e);
        return void 0 !== n ? Qn.resolve(n) : this.Iu(t, e);
    }
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
     */    getEntries(t, e) {
        return this.Ru(t, e);
    }
    /**
     * Applies buffered changes to the underlying RemoteDocumentCache, using
     * the provided transaction.
     */    apply(t) {
        return this.Eu(), this.Tu = !0, this.Xh(t);
    }
    /** Helper to assert this.changes is not null  */    Eu() {}
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
 */ {
    constructor(t) {
        super(), this.Au = t;
    }
    Xh(t) {
        const e = [];
        return this.Ci.forEach((n, s) => {
            s ? e.push(this.Au.zi(t, s, this.readTime)) : this.Au.Ki(n);
        }), Qn.Cn(e);
    }
    Iu(t, e) {
        return this.Au.On(t, e);
    }
    Ru(t, e) {
        return this.Au.getEntries(t, e);
    }
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
class ks {
    constructor(t) {
        this.persistence = t, 
        /**
         * Maps a target to the data about that target
         */
        this.Pu = new $(t => z(t), Y), 
        /** The last received snapshot version. */
        this.lastRemoteSnapshotVersion = O.min(), 
        /** The highest numbered target ID encountered. */
        this.highestTargetId = 0, 
        /** The highest sequence number encountered. */
        this.Vu = 0, 
        /**
         * A ordered bidirectional mapping between documents and the remote target
         * IDs.
         */
        this.yu = new hs, this.targetCount = 0, this.pu = is.ui();
    }
    ge(t, e) {
        return this.Pu.forEach((t, n) => e(n)), Qn.resolve();
    }
    qi(t) {
        return Qn.resolve(this.lastRemoteSnapshotVersion);
    }
    gu(t) {
        return Qn.resolve(this.Vu);
    }
    hr(t) {
        return this.highestTargetId = this.pu.next(), Qn.resolve(this.highestTargetId);
    }
    Xi(t, e, n) {
        return n && (this.lastRemoteSnapshotVersion = n), e > this.Vu && (this.Vu = e), 
        Qn.resolve();
    }
    vu(t) {
        this.Pu.set(t.target, t);
        const e = t.targetId;
        e > this.highestTargetId && (this.pu = new is(e), this.highestTargetId = e), t.sequenceNumber > this.Vu && (this.Vu = t.sequenceNumber);
    }
    ar(t, e) {
        return this.vu(e), this.targetCount += 1, Qn.resolve();
    }
    Gi(t, e) {
        return this.vu(e), Qn.resolve();
    }
    bu(t, e) {
        return this.Pu.delete(e.target), this.yu.Vr(e.targetId), this.targetCount -= 1, 
        Qn.resolve();
    }
    Su(t, e, n) {
        let s = 0;
        const i = [];
        return this.Pu.forEach((r, o) => {
            o.sequenceNumber <= e && null === n.get(o.targetId) && (this.Pu.delete(r), i.push(this.Cu(t, o.targetId)), 
            s++);
        }), Qn.Cn(i).next(() => s);
    }
    Du(t) {
        return Qn.resolve(this.targetCount);
    }
    or(t, e) {
        const n = this.Pu.get(e) || null;
        return Qn.resolve(n);
    }
    Wi(t, e, n) {
        return this.yu.Rr(e, n), Qn.resolve();
    }
    Bi(t, e, n) {
        this.yu.Pr(e, n);
        const s = this.persistence.Yi, i = [];
        return s && e.forEach(e => {
            i.push(s.uu(t, e));
        }), Qn.Cn(i);
    }
    Cu(t, e) {
        return this.yu.Vr(e), Qn.resolve();
    }
    lr(t, e) {
        const n = this.yu.pr(e);
        return Qn.resolve(n);
    }
    gr(t, e) {
        return Qn.resolve(this.yu.gr(e));
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
 */
/**
 * A memory-backed instance of Persistence. Data is stored only in RAM and
 * not persisted across sessions.
 */
class xs {
    /**
     * The constructor accepts a factory for creating a reference delegate. This
     * allows both the delegate and this instance to have strong references to
     * each other without having nullable fields that would then need to be
     * checked or asserted on every access.
     */
    constructor(t) {
        this.Fu = {}, this.Nu = new Kn(0), this.$u = !1, this.$u = !0, this.Yi = t(this), 
        this.Ei = new ks(this);
        this.$n = new ns, this.Fn = new $s(this.$n, t => this.Yi.ku(t));
    }
    start() {
        return Promise.resolve();
    }
    rh() {
        // No durable state to ensure is closed on shutdown.
        return this.$u = !1, Promise.resolve();
    }
    get xu() {
        return this.$u;
    }
    Lu() {
        // No op.
    }
    Ou() {
        // No op.
    }
    Ai() {
        return this.$n;
    }
    wi(t) {
        let e = this.Fu[t.Sr()];
        return e || (e = new Ns(this.$n, this.Yi), this.Fu[t.Sr()] = e), e;
    }
    Ii() {
        return this.Ei;
    }
    mi() {
        return this.Fn;
    }
    runTransaction(t, e, n) {
        E("MemoryPersistence", "Starting transaction:", t);
        const s = new Ls(this.Nu.next());
        return this.Yi.Mu(), n(s).next(t => this.Yi.qu(s).next(() => t)).bn().then(t => (s.Uu(), 
        t));
    }
    Bu(t, e) {
        return Qn.Dn(Object.values(this.Fu).map(n => () => n.gr(t, e)));
    }
}

/**
 * Memory persistence is not actually transactional, but future implementations
 * may have transaction-scoped state.
 */ class Ls extends 
/**
 * A base class representing a persistence transaction, encapsulating both the
 * transaction's sequence numbers as well as a list of onCommitted listeners.
 *
 * When you call Persistence.runTransaction(), it will create a transaction and
 * pass it to your callback. You then pass it to any method that operates
 * on persistence.
 */
class {
    constructor() {
        this.Wu = [];
    }
    Qu(t) {
        this.Wu.push(t);
    }
    Uu() {
        this.Wu.forEach(t => t());
    }
} {
    constructor(t) {
        super(), this.Qi = t;
    }
}

class Os {
    constructor(t) {
        this.persistence = t, 
        /** Tracks all documents that are active in Query views. */
        this.ju = new hs, 
        /** The list of documents that are potentially GCed after each transaction. */
        this.Gu = null;
    }
    static Ku(t) {
        return new Os(t);
    }
    get zu() {
        if (this.Gu) return this.Gu;
        throw P();
    }
    tr(t, e, n) {
        return this.ju.tr(n, e), this.zu.delete(n), Qn.resolve();
    }
    er(t, e, n) {
        return this.ju.er(n, e), this.zu.add(n), Qn.resolve();
    }
    uu(t, e) {
        return this.zu.add(e), Qn.resolve();
    }
    removeTarget(t, e) {
        this.ju.Vr(e.targetId).forEach(t => this.zu.add(t));
        const n = this.persistence.Ii();
        return n.lr(t, e.targetId).next(t => {
            t.forEach(t => this.zu.add(t));
        }).next(() => n.bu(t, e));
    }
    Mu() {
        this.Gu = new Set;
    }
    qu(t) {
        // Remove newly orphaned documents.
        const e = this.persistence.mi().Fi();
        return Qn.forEach(this.zu, n => this.Hu(t, n).next(t => {
            t || e.Ki(n);
        })).next(() => (this.Gu = null, e.apply(t)));
    }
    Hi(t, e) {
        return this.Hu(t, e).next(t => {
            t ? this.zu.delete(e) : this.zu.add(e);
        });
    }
    ku(t) {
        // For eager GC, we don't care about the document size, there are no size thresholds.
        return 0;
    }
    Hu(t, e) {
        return Qn.Dn([ () => Qn.resolve(this.ju.gr(e)), () => this.persistence.Ii().gr(t, e), () => this.persistence.Bu(t, e) ]);
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
 */
/**
 * Provides a simple helper class that implements the Stream interface to
 * bridge to other implementations that are streams but do not implement the
 * interface. The stream callbacks are invoked with the callOn... methods.
 */ class Ms {
    constructor(t) {
        this.Yu = t.Yu, this.Xu = t.Xu;
    }
    uo(t) {
        this.Ju = t;
    }
    io(t) {
        this.Zu = t;
    }
    onMessage(t) {
        this.tc = t;
    }
    close() {
        this.Xu();
    }
    send(t) {
        this.Yu(t);
    }
    ec() {
        this.Ju();
    }
    nc(t) {
        this.Zu(t);
    }
    sc(t) {
        this.tc(t);
    }
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
 */ const qs = {
    BatchGetDocuments: "batchGet",
    Commit: "commit",
    RunQuery: "runQuery"
};

/**
 * Maps RPC names to the corresponding REST endpoint name.
 *
 * We use array notation to avoid mangling.
 */ class Us extends 
/**
 * Base class for all Rest-based connections to the backend (WebChannel and
 * HTTP).
 */
class {
    constructor(t) {
        this.ic = t, this.s = t.s;
        const e = t.ssl ? "https" : "http";
        this.rc = e + "://" + t.host, this.oc = "projects/" + this.s.projectId + "/databases/" + this.s.database + "/documents";
    }
    Po(t, e, n, s) {
        const i = this.hc(t, e);
        E("RestConnection", "Sending: ", i, n);
        const r = {};
        return this.ac(r, s), this.uc(t, i, r, n).then(t => (E("RestConnection", "Received: ", t), 
        t), e => {
            throw R("RestConnection", t + " failed with error: ", e, "url: ", i, "request:", n), 
            e;
        });
    }
    Vo(t, e, n, s) {
        // The REST API automatically aggregates all of the streamed results, so we
        // can just use the normal invoke() method.
        return this.Po(t, e, n, s);
    }
    /**
     * Modifies the headers for a request, adding any authorization token if
     * present and any additional headers for the request.
     */    ac(t, e) {
        if (t["X-Goog-Api-Client"] = "gl-js/ fire/7.17.2", 
        // Content-Type: text/plain will avoid preflight requests which might
        // mess with CORS and redirects by proxies. If we add custom headers
        // we will need to change this code to potentially use the $httpOverwrite
        // parameter supported by ESF to avoid	triggering preflight requests.
        t["Content-Type"] = "text/plain", e) for (const n in e.Fr) e.Fr.hasOwnProperty(n) && (t[n] = e.Fr[n]);
    }
    hc(t, e) {
        const n = qs[t];
        return `${this.rc}/v1/${e}:${n}`;
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
 */ {
    constructor(t) {
        super(t), this.forceLongPolling = t.forceLongPolling;
    }
    uc(t, e, n, s) {
        return new Promise((i, r) => {
            const o = new c;
            o.listenOnce(l.COMPLETE, () => {
                try {
                    switch (o.getLastErrorCode()) {
                      case _.NO_ERROR:
                        const e = o.getResponseJson();
                        E("Connection", "XHR received:", JSON.stringify(e)), i(e);
                        break;

                      case _.TIMEOUT:
                        E("Connection", 'RPC "' + t + '" timed out'), r(new x(k.DEADLINE_EXCEEDED, "Request time out"));
                        break;

                      case _.HTTP_ERROR:
                        const n = o.getStatus();
                        if (E("Connection", 'RPC "' + t + '" failed with status:', n, "response text:", o.getResponseText()), 
                        n > 0) {
                            const t = o.getResponseJson().error;
                            if (t && t.status && t.message) {
                                const e = function(t) {
                                    const e = t.toLowerCase().replace("_", "-");
                                    return Object.values(k).indexOf(e) >= 0 ? e : k.UNKNOWN;
                                }(t.status);
                                r(new x(e, t.message));
                            } else r(new x(k.UNKNOWN, "Server responded with status " + o.getStatus()));
                        } else 
                        // If we received an HTTP_ERROR but there's no status code,
                        // it's most probably a connection issue
                        r(new x(k.UNAVAILABLE, "Connection failed."));
                        break;

                      default:
                        P();
                    }
                } finally {
                    E("Connection", 'RPC "' + t + '" completed.');
                }
            });
            const h = JSON.stringify(s);
            o.send(e, "POST", h, n, 15);
        });
    }
    co(t, e) {
        const n = [ this.rc, "/", "google.firestore.v1.Firestore", "/", t, "/channel" ], s = f(), c = {
            // Required for backend stickiness, routing behavior is based on this
            // parameter.
            httpSessionIdParam: "gsessionid",
            initMessageHeaders: {},
            messageUrlParams: {
                // This param is used to improve routing and project isolation by the
                // backend and must be included in every request.
                database: `projects/${this.s.projectId}/databases/${this.s.database}`
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
        this.ac(c.initMessageHeaders, e), 
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
        i() || r() || o() || h() || a() || u() || (c.httpHeadersOverwriteParam = "$httpHeaders");
        const l = n.join("");
        E("Connection", "Creating WebChannel: " + l, c);
        const _ = s.createWebChannel(l, c);
        // WebChannel supports sending the first message with the handshake - saving
        // a network round trip. However, it will have to call send in the same
        // JS event loop as open. In order to enforce this, we delay actually
        // opening the WebChannel until send is called. Whether we have called
        // open is tracked with this variable.
                let w = !1, T = !1;
        // A flag to determine whether the stream was closed (by us or through an
        // error/close event) to avoid delivering multiple close events or sending
        // on a closed stream
                const m = new Ms({
            Yu: t => {
                T ? E("Connection", "Not sending because WebChannel is closed:", t) : (w || (E("Connection", "Opening WebChannel transport."), 
                _.open(), w = !0), E("Connection", "WebChannel sending:", t), _.send(t));
            },
            Xu: () => _.close()
        }), I = (t, e) => {
            // TODO(dimond): closure typing seems broken because WebChannel does
            // not implement goog.events.Listenable
            _.listen(t, t => {
                try {
                    e(t);
                } catch (t) {
                    setTimeout(() => {
                        throw t;
                    }, 0);
                }
            });
        };
        // Closure events are guarded and exceptions are swallowed, so catch any
        // exception and rethrow using a setTimeout so they become visible again.
        // Note that eventually this function could go away if we are confident
        // enough the code is exception free.
                return I(d.EventType.OPEN, () => {
            T || E("Connection", "WebChannel transport opened.");
        }), I(d.EventType.CLOSE, () => {
            T || (T = !0, E("Connection", "WebChannel transport closed"), m.nc());
        }), I(d.EventType.ERROR, t => {
            T || (T = !0, R("Connection", "WebChannel transport errored:", t), m.nc(new x(k.UNAVAILABLE, "The operation could not be completed")));
        }), I(d.EventType.MESSAGE, t => {
            var e;
            if (!T) {
                const n = t.data[0];
                V(!!n);
                // TODO(b/35143891): There is a bug in One Platform that caused errors
                // (and only errors) to be wrapped in an extra array. To be forward
                // compatible with the bug we need to check either condition. The latter
                // can be removed once the fix has been rolled out.
                // Use any because msgData.error is not typed.
                const s = n, i = s.error || (null === (e = s[0]) || void 0 === e ? void 0 : e.error);
                if (i) {
                    E("Connection", "WebChannel received error:", i);
                    // error.status will be a string like 'OK' or 'NOT_FOUND'.
                    const t = i.status;
                    let e = function(t) {
                        // lookup by string
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const e = nt[t];
                        if (void 0 !== e) return rt(e);
                    }(t), n = i.message;
                    void 0 === e && (e = k.INTERNAL, n = "Unknown error status: " + t + " with message " + i.message), 
                    // Mark closed so no further events are propagated
                    T = !0, m.nc(new x(e, n)), _.close();
                } else E("Connection", "WebChannel received:", n), m.sc(n);
            }
        }), setTimeout(() => {
            // Technically we could/should wait for the WebChannel opened event,
            // but because we want to send the first message with the WebChannel
            // handshake we pretend the channel opened here (asynchronously), and
            // then delay the actual open until the first message is sent.
            m.ec();
        }, 0), m;
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
// References to `window` are guarded by BrowserConnectivityMonitor.isAvailable()
/* eslint-disable no-restricted-globals */
/**
 * Browser implementation of ConnectivityMonitor.
 */
class Bs {
    constructor() {
        this.cc = () => this.lc(), this._c = () => this.fc(), this.dc = [], this.wc();
    }
    Uo(t) {
        this.dc.push(t);
    }
    rh() {
        window.removeEventListener("online", this.cc), window.removeEventListener("offline", this._c);
    }
    wc() {
        window.addEventListener("online", this.cc), window.addEventListener("offline", this._c);
    }
    lc() {
        E("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
        for (const t of this.dc) t(0 /* AVAILABLE */);
    }
    fc() {
        E("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
        for (const t of this.dc) t(1 /* UNAVAILABLE */);
    }
    // TODO(chenbrian): Consider passing in window either into this component or
    // here for testing via FakeWindow.
    /** Checks that all used attributes of window are available. */
    static Tc() {
        return "undefined" != typeof window && void 0 !== window.addEventListener && void 0 !== window.removeEventListener;
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
 */ class Ws {
    Uo(t) {
        // No-op.
    }
    rh() {
        // No-op.
    }
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
function Qs(t) {
    return new te(t, /* useProto3Json= */ !0);
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
 */ const js = "You are using the memory-only build of Firestore. Persistence support is only available via the @firebase/firestore bundle or the firebase-firestore.js build.";

/**
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */ class Gs {
    async initialize(t) {
        this.ha = this.mc(t), this.persistence = this.Ec(t), await this.persistence.start(), 
        this.Ic = this.Rc(t), this.$o = this.Ac(t);
    }
    Rc(t) {
        return null;
    }
    Ac(t) {
        /** Manages our in-memory or durable persistence. */
        return e = this.persistence, n = new Fs, s = t.Pc, new rs(e, n, s);
        var e, n, s;
    }
    Ec(t) {
        if (t.yc.Vc) throw new x(k.FAILED_PRECONDITION, js);
        return new xs(Os.Ku);
    }
    mc(t) {
        return new Ps;
    }
    async terminate() {
        this.Ic && this.Ic.stop(), await this.ha.rh(), await this.persistence.rh();
    }
    clearPersistence(t, e) {
        throw new x(k.FAILED_PRECONDITION, js);
    }
}

/**
 * Initializes and wires the components that are needed to interface with the
 * network.
 */ class Ks {
    async initialize(t, e) {
        this.$o || (this.$o = t.$o, this.ha = t.ha, this.ko = this.pc(e), this.oa = this.gc(e), 
        this.uh = this.vc(e), this.bc = this.Sc(e), this.ha.yo = t => this.uh.ea(t, 1 /* SharedClientState */), 
        this.oa.uh = this.uh, await this.oa.start(), await this.oa.ph(this.uh.Ra));
    }
    Sc(t) {
        return new Cs(this.uh);
    }
    pc(t) {
        const e = Qs(t.ic.s), n = (s = t.ic, new Us(s));
        var s;
        /** Return the Platform-specific connectivity monitor. */        return function(t, e, n) {
            return new Es(t, e, n);
        }(t.credentials, n, e);
    }
    gc(t) {
        return new Rs(this.$o, this.ko, t.Is, t => this.uh.ea(t, 0 /* RemoteStore */), Bs.Tc() ? new Bs : new Ws);
    }
    vc(t) {
        return function(t, e, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        s, i, r, o) {
            const h = new bs(t, e, n, s, i, r);
            return o && (h.Ia = !0), h;
        }(this.$o, this.oa, this.ko, this.ha, t.Pc, t.aa, !t.yc.Vc || !t.yc.synchronizeTabs);
    }
    terminate() {
        return this.oa.rh();
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
 */ function zs(t) {
    /**
 * Returns true if obj is an object and contains at least one of the specified
 * methods.
 */
    return function(t, e) {
        if ("object" != typeof t || null === t) return !1;
        const n = t;
        for (const t of e) if (t in n && "function" == typeof n[t]) return !0;
        return !1;
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
    /*
 * A wrapper implementation of Observer<T> that will dispatch events
 * asynchronously. To allow immediate silencing, a mute call is added which
 * causes events scheduled to no longer be raised.
 */ (t, [ "next", "error", "complete" ]);
}

class Hs {
    constructor(t) {
        this.observer = t, 
        /**
         * When set to true, will not raise future events. Necessary to deal with
         * async detachment of listener.
         */
        this.muted = !1;
    }
    next(t) {
        this.observer.next && this.Cc(this.observer.next, t);
    }
    error(t) {
        this.observer.error ? this.Cc(this.observer.error, t) : console.error("Uncaught Error in snapshot listener:", t);
    }
    Dc() {
        this.muted = !0;
    }
    Cc(t, e) {
        this.muted || setTimeout(() => {
            this.muted || t(e);
        }, 0);
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
 */
/**
 * Validates that no arguments were passed in the invocation of functionName.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateNoArgs('myFunction', arguments);
 */ function Ys(t, e) {
    if (0 !== e.length) throw new x(k.INVALID_ARGUMENT, `Function ${t}() does not support arguments, but was called with ` + wi(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has the exact number of arguments.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateExactNumberOfArgs('myFunction', arguments, 2);
 */ function Xs(t, e, n) {
    if (e.length !== n) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires ` + wi(n, "argument") + ", but was called with " + wi(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */ function Js(t, e, n) {
    if (e.length < n) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires at least ` + wi(n, "argument") + ", but was called with " + wi(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has number of arguments between
 * the values provided.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
 */ function Zs(t, e, n, s) {
    if (e.length < n || e.length > s) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires between ${n} and ` + s + " arguments, but was called with " + wi(e.length, "argument") + ".");
}

/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */
function ti(t, e, n, s) {
    hi(t, e, di(n) + " argument", s);
}

/**
 * Validates the provided argument has the native JavaScript type using
 * typeof checks or is undefined.
 */ function ei(t, e, n, s) {
    void 0 !== s && ti(t, e, n, s);
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks.
 */ function ni(t, e, n, s) {
    hi(t, e, n + " option", s);
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks or is undefined.
 */ function si(t, e, n, s) {
    void 0 !== s && ni(t, e, n, s);
}

function ii(t, e, n, s, i) {
    void 0 !== s && function(t, e, n, s, i) {
        if (!(s instanceof Array)) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires its ${e} option to be an array, but it was: ` + ui(s));
        for (let r = 0; r < s.length; ++r) if (!i(s[r])) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires all ${e} elements to be ${n}, but the value at index ${r} was: ` + ui(s[r]));
    }(t, e, n, s, i);
}

/**
 * Validates that the provided named option equals one of the expected values.
 */
/**
 * Validates that the provided named option equals one of the expected values or
 * is undefined.
 */
function ri(t, e, n, s, i) {
    void 0 !== s && function(t, e, n, s, i) {
        const r = [];
        for (const t of i) {
            if (t === s) return;
            r.push(ui(t));
        }
        const o = ui(s);
        throw new x(k.INVALID_ARGUMENT, `Invalid value ${o} provided to function ${t}() for option "${n}". Acceptable values: ${r.join(", ")}`);
    }(t, 0, n, s, i);
}

/**
 * Validates that the provided argument is a valid enum.
 *
 * @param functionName Function making the validation call.
 * @param enums Array containing all possible values for the enum.
 * @param position Position of the argument in `functionName`.
 * @param argument Argument to validate.
 * @return The value as T if the argument can be converted.
 */ function oi(t, e, n, s) {
    if (!e.some(t => t === s)) throw new x(k.INVALID_ARGUMENT, `Invalid value ${ui(s)} provided to function ${t}() for its ${di(n)} argument. Acceptable values: ` + e.join(", "));
    return s;
}

/** Helper to validate the type of a provided input. */ function hi(t, e, n, s) {
    let i = !1;
    if (i = "object" === e ? ai(s) : "non-empty string" === e ? "string" == typeof s && "" !== s : typeof s === e, 
    !i) {
        const i = ui(s);
        throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires its ${n} to be of type ${e}, but it was: ${i}`);
    }
}

/**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */ function ai(t) {
    return "object" == typeof t && null !== t && (Object.getPrototypeOf(t) === Object.prototype || null === Object.getPrototypeOf(t));
}

/** Returns a string describing the type / value of the provided input. */ function ui(t) {
    if (void 0 === t) return "undefined";
    if (null === t) return "null";
    if ("string" == typeof t) return t.length > 20 && (t = t.substring(0, 20) + "..."), 
    JSON.stringify(t);
    if ("number" == typeof t || "boolean" == typeof t) return "" + t;
    if ("object" == typeof t) {
        if (t instanceof Array) return "an array";
        {
            const e = 
            /** Hacky method to try to get the constructor name for an object. */
            function(t) {
                if (t.constructor) {
                    const e = /function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());
                    if (e && e.length > 1) return e[1];
                }
                return null;
            }
            /** Validates the provided argument is defined. */ (t);
            return e ? `a custom ${e} object` : "an object";
        }
    }
    return "function" == typeof t ? "a function" : P();
}

function ci(t, e, n) {
    if (void 0 === n) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires a valid ${di(e)} argument, but it was undefined.`);
}

/**
 * Validates the provided positional argument is an object, and its keys and
 * values match the expected keys and types provided in optionTypes.
 */ function li(t, e, n) {
    F(e, (e, s) => {
        if (n.indexOf(e) < 0) throw new x(k.INVALID_ARGUMENT, `Unknown option '${e}' passed to function ${t}(). Available options: ` + n.join(", "));
    });
}

/**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */ function _i(t, e, n, s) {
    const i = ui(s);
    return new x(k.INVALID_ARGUMENT, `Function ${t}() requires its ${di(n)} argument to be a ${e}, but it was: ${i}`);
}

function fi(t, e, n) {
    if (n <= 0) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires its ${di(e)} argument to be a positive number, but it was: ${n}.`);
}

/** Converts a number to its english word representation */ function di(t) {
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
 */ function wi(t, e) {
    return `${t} ${e}` + (1 === t ? "" : "s");
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
/** Helper function to assert Uint8Array is available at runtime. */ function Ti() {
    if ("undefined" == typeof Uint8Array) throw new x(k.UNIMPLEMENTED, "Uint8Arrays are not available in this environment.");
}

/**
 * Immutable class holding a blob (binary data).
 * This class is directly exposed in the public API.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */ class mi {
    constructor(t) {
        this.Fc = t;
    }
    static fromBase64String(t) {
        Xs("Blob.fromBase64String", arguments, 1), ti("Blob.fromBase64String", "string", 1, t);
        try {
            return new mi(Z.fromBase64String(t));
        } catch (t) {
            throw new x(k.INVALID_ARGUMENT, "Failed to construct Blob from Base64 string: " + t);
        }
    }
    static fromUint8Array(t) {
        if (Xs("Blob.fromUint8Array", arguments, 1), Ti(), !(t instanceof Uint8Array)) throw _i("Blob.fromUint8Array", "Uint8Array", 1, t);
        return new mi(Z.fromUint8Array(t));
    }
    toBase64() {
        return Xs("Blob.toBase64", arguments, 0), this.Fc.toBase64();
    }
    toUint8Array() {
        return Xs("Blob.toUint8Array", arguments, 0), Ti(), this.Fc.toUint8Array();
    }
    toString() {
        return "Blob(base64: " + this.toBase64() + ")";
    }
    isEqual(t) {
        return this.Fc.isEqual(t.Fc);
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
 */
// The objects that are a part of this API are exposed to third-parties as
// compiled javascript so we want to flag our private members with a leading
// underscore to discourage their use.
/**
 * A field class base class that is shared by the lite, full and legacy SDK,
 * which supports shared code that deals with FieldPaths.
 */ class Ei {
    constructor(t) {
        !function(t, e, n, s) {
            if (!(e instanceof Array) || e.length < s) throw new x(k.INVALID_ARGUMENT, `Function ${t}() requires its ${n} argument to be an array with at least ` + wi(s, "element") + ".");
        }("FieldPath", t, "fieldNames", 1);
        for (let e = 0; e < t.length; ++e) if (ti("FieldPath", "string", e, t[e]), 0 === t[e].length) throw new x(k.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
        this.Nc = new B(t);
    }
}

/**
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */ class Ii extends Ei {
    /**
     * Creates a FieldPath from the provided field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     *
     * @param fieldNames A list of field names.
     */
    constructor(...t) {
        super(t);
    }
    static documentId() {
        /**
         * Internal Note: The backend doesn't technically support querying by
         * document ID. Instead it queries by the entire document name (full path
         * included), but in the cases we currently support documentId(), the net
         * effect is the same.
         */
        return new Ii(B.M().N());
    }
    isEqual(t) {
        if (!(t instanceof Ii)) throw _i("isEqual", "FieldPath", 1, t);
        return this.Nc.isEqual(t.Nc);
    }
}

/**
 * Matches any characters in a field path string that are reserved.
 */ const Ri = new RegExp("[~\\*/\\[\\]]");

/**
 * Parses a field path string into a FieldPath, treating dots as separators.
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
 * An opaque base class for FieldValue sentinel objects in our public API that
 * is shared between the full, lite and legacy SDK.
 */
class Ai {
    constructor() {
        /** A pointer to the implementing class. */
        this.$c = this;
    }
}

class Pi extends Ai {
    constructor(t) {
        super(), this.kc = t;
    }
    xc(t) {
        if (2 /* MergeSet */ !== t.Lc) throw 1 /* Update */ === t.Lc ? t.Oc(this.kc + "() can only appear at the top level of your update data") : t.Oc(this.kc + "() cannot be used with set() unless you pass {merge:true}");
        // No transform to add for a delete, but we need to add it to our
        // fieldMask so it gets deleted.
        return t.Me.push(t.path), null;
    }
    isEqual(t) {
        return t instanceof Pi;
    }
}

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
 */ function Vi(t, e, n) {
    return new xi({
        Lc: 3 /* Argument */ ,
        Mc: e.settings.Mc,
        methodName: t.kc,
        qc: n
    }, e.s, e.serializer, e.ignoreUndefinedProperties);
}

class yi extends Ai {
    constructor(t) {
        super(), this.kc = t;
    }
    xc(t) {
        return new Oe(t.path, new Se);
    }
    isEqual(t) {
        return t instanceof yi;
    }
}

class pi extends Ai {
    constructor(t, e) {
        super(), this.kc = t, this.Uc = e;
    }
    xc(t) {
        const e = Vi(this, t, 
        /*array=*/ !0), n = this.Uc.map(t => Bi(t, e)), s = new Ce(n);
        return new Oe(t.path, s);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class gi extends Ai {
    constructor(t, e) {
        super(), this.kc = t, this.Uc = e;
    }
    xc(t) {
        const e = Vi(this, t, 
        /*array=*/ !0), n = this.Uc.map(t => Bi(t, e)), s = new Fe(n);
        return new Oe(t.path, s);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class vi extends Ai {
    constructor(t, e) {
        super(), this.kc = t, this.Bc = e;
    }
    xc(t) {
        const e = new $e(t.serializer, se(t.serializer, this.Bc));
        return new Oe(t.path, e);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

/** The public FieldValue class of the lite API. */ class bi extends Ai {
    constructor() {
        super();
    }
    static delete() {
        return Ys("FieldValue.delete", arguments), new Si(new Pi("FieldValue.delete"));
    }
    static serverTimestamp() {
        return Ys("FieldValue.serverTimestamp", arguments), new Si(new yi("FieldValue.serverTimestamp"));
    }
    static arrayUnion(...t) {
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
        return Js("FieldValue.arrayUnion", arguments, 1), new Si(new pi("FieldValue.arrayUnion", t));
    }
    static arrayRemove(...t) {
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
        return Js("FieldValue.arrayRemove", arguments, 1), new Si(new gi("FieldValue.arrayRemove", t));
    }
    static increment(t) {
        return ti("FieldValue.increment", "number", 1, t), Xs("FieldValue.increment", arguments, 1), 
        new Si(new vi("FieldValue.increment", t));
    }
}

/**
 * A delegate class that allows the FieldValue implementations returned by
 * deleteField(), serverTimestamp(), arrayUnion(), arrayRemove() and
 * increment() to be an instance of the legacy FieldValue class declared above.
 *
 * We don't directly subclass `FieldValue` in the various field value
 * implementations as the base FieldValue class differs between the lite, full
 * and legacy SDK.
 */ class Si extends bi {
    constructor(t) {
        super(), this.$c = t, this.kc = t.kc;
    }
    xc(t) {
        return this.$c.xc(t);
    }
    isEqual(t) {
        return t instanceof Si && this.$c.isEqual(t.$c);
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
 */
/**
 * Immutable class representing a geo point as latitude-longitude pair.
 * This class is directly exposed in the public API, including its constructor.
 */ class Ci {
    constructor(t, e) {
        if (Xs("GeoPoint", arguments, 2), ti("GeoPoint", "number", 1, t), ti("GeoPoint", "number", 2, e), 
        !isFinite(t) || t < -90 || t > 90) throw new x(k.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + t);
        if (!isFinite(e) || e < -180 || e > 180) throw new x(k.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + e);
        this.Wc = t, this.Qc = e;
    }
    /**
     * Returns the latitude of this geo point, a number between -90 and 90.
     */    get latitude() {
        return this.Wc;
    }
    /**
     * Returns the longitude of this geo point, a number between -180 and 180.
     */    get longitude() {
        return this.Qc;
    }
    isEqual(t) {
        return this.Wc === t.Wc && this.Qc === t.Qc;
    }
    /**
     * Actually private to JS consumers of our API, so this function is prefixed
     * with an underscore.
     */    T(t) {
        return v(this.Wc, t.Wc) || v(this.Qc, t.Qc);
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
 */ const Di = /^__.*__$/;

/**
 * A reference to a document in a Firebase project.
 *
 * This class serves as a common base class for the public DocumentReferences
 * exposed in the lite, full and legacy SDK.
 */ class Fi {
    constructor(t, e, n) {
        this.jc = t, this.Gc = e, this.Kc = n;
    }
}

/** The result of parsing document data (e.g. for a setData call). */ class Ni {
    constructor(t, e, n) {
        this.data = t, this.Me = e, this.fieldTransforms = n;
    }
    zc(t, e) {
        const n = [];
        return null !== this.Me ? n.push(new Ye(t, this.data, this.Me, e)) : n.push(new He(t, this.data, e)), 
        this.fieldTransforms.length > 0 && n.push(new Je(t, this.fieldTransforms)), n;
    }
}

/** The result of parsing "update" data (i.e. for an updateData call). */ class $i {
    constructor(t, e, n) {
        this.data = t, this.Me = e, this.fieldTransforms = n;
    }
    zc(t, e) {
        const n = [ new Ye(t, this.data, this.Me, e) ];
        return this.fieldTransforms.length > 0 && n.push(new Je(t, this.fieldTransforms)), 
        n;
    }
}

function ki(t) {
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
        throw P();
    }
}

/** A "context" object passed around while parsing user data. */ class xi {
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
    constructor(t, e, n, s, i, r) {
        this.settings = t, this.s = e, this.serializer = n, this.ignoreUndefinedProperties = s, 
        // Minor hack: If fieldTransforms is undefined, we assume this is an
        // external call and we need to validate the entire path.
        void 0 === i && this.Hc(), this.fieldTransforms = i || [], this.Me = r || [];
    }
    get path() {
        return this.settings.path;
    }
    get Lc() {
        return this.settings.Lc;
    }
    /** Returns a new context with the specified settings overwritten. */    Yc(t) {
        return new xi(Object.assign(Object.assign({}, this.settings), t), this.s, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.Me);
    }
    Xc(t) {
        var e;
        const n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), s = this.Yc({
            path: n,
            qc: !1
        });
        return s.Jc(t), s;
    }
    Zc(t) {
        var e;
        const n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), s = this.Yc({
            path: n,
            qc: !1
        });
        return s.Hc(), s;
    }
    tl(t) {
        // TODO(b/34871131): We don't support array paths right now; so make path
        // undefined.
        return this.Yc({
            path: void 0,
            qc: !0
        });
    }
    Oc(t) {
        return zi(t, this.settings.methodName, this.settings.el || !1, this.path, this.settings.Mc);
    }
    /** Returns 'true' if 'fieldPath' was traversed when creating this context. */    contains(t) {
        return void 0 !== this.Me.find(e => t.C(e)) || void 0 !== this.fieldTransforms.find(e => t.C(e.field));
    }
    Hc() {
        // TODO(b/34871131): Remove null check once we have proper paths for fields
        // within arrays.
        if (this.path) for (let t = 0; t < this.path.length; t++) this.Jc(this.path.get(t));
    }
    Jc(t) {
        if (0 === t.length) throw this.Oc("Document fields must not be empty");
        if (ki(this.Lc) && Di.test(t)) throw this.Oc('Document fields cannot begin and end with "__"');
    }
}

/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */ class Li {
    constructor(t, e, n) {
        this.s = t, this.ignoreUndefinedProperties = e, this.serializer = n || Qs(t);
    }
    /** Creates a new top-level parse context. */    nl(t, e, n, s = !1) {
        return new xi({
            Lc: t,
            methodName: e,
            Mc: n,
            path: B.k(),
            qc: !1,
            el: s
        }, this.s, this.serializer, this.ignoreUndefinedProperties);
    }
}

/** Parse document data from a set() call. */ function Oi(t, e, n, s, i, r = {}) {
    const o = t.nl(r.merge || r.mergeFields ? 2 /* MergeSet */ : 0 /* Set */ , e, n, i);
    ji("Data must be an object, but it was:", o, s);
    const h = Wi(s, o);
    let a, u;
    if (r.merge) a = new Le(o.Me), u = o.fieldTransforms; else if (r.mergeFields) {
        const t = [];
        for (const s of r.mergeFields) {
            let i;
            if (s instanceof Ei) i = s.Nc; else {
                if ("string" != typeof s) throw P();
                i = Ki(e, s, n);
            }
            if (!o.contains(i)) throw new x(k.INVALID_ARGUMENT, `Field '${i}' is specified in your field mask but missing from your input data.`);
            Hi(t, i) || t.push(i);
        }
        a = new Le(t), u = o.fieldTransforms.filter(t => a.Qe(t.field));
    } else a = null, u = o.fieldTransforms;
    return new Ni(new sn(h), a, u);
}

/** Parse update data from an update() call. */ function Mi(t, e, n, s) {
    const i = t.nl(1 /* Update */ , e, n);
    ji("Data must be an object, but it was:", i, s);
    const r = [], o = new rn;
    F(s, (t, s) => {
        const h = Ki(e, t, n), a = i.Zc(h);
        if (s instanceof Ai && s.$c instanceof Pi) 
        // Add it to the field mask, but don't add anything to updateData.
        r.push(h); else {
            const t = Bi(s, a);
            null != t && (r.push(h), o.set(h, t));
        }
    });
    const h = new Le(r);
    return new $i(o.Ke(), h, i.fieldTransforms);
}

/** Parse update data from a list of field/value arguments. */ function qi(t, e, n, s, i, r) {
    const o = t.nl(1 /* Update */ , e, n), h = [ Gi(e, s, n) ], a = [ i ];
    if (r.length % 2 != 0) throw new x(k.INVALID_ARGUMENT, `Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);
    for (let t = 0; t < r.length; t += 2) h.push(Gi(e, r[t])), a.push(r[t + 1]);
    const u = [], c = new rn;
    // We iterate in reverse order to pick the last value for a field if the
    // user specified the field multiple times.
    for (let t = h.length - 1; t >= 0; --t) if (!Hi(u, h[t])) {
        const e = h[t], n = a[t], s = o.Zc(e);
        if (n instanceof Ai && n.$c instanceof Pi) 
        // Add it to the field mask, but don't add anything to updateData.
        u.push(e); else {
            const t = Bi(n, s);
            null != t && (u.push(e), c.set(e, t));
        }
    }
    const l = new Le(u);
    return new $i(c.Ke(), l, o.fieldTransforms);
}

/**
 * Parse a "query value" (e.g. value in a where filter or a value in a cursor
 * bound).
 *
 * @param allowArrays Whether the query value is an array that may directly
 * contain additional arrays (e.g. the operand of an `in` query).
 */ function Ui(t, e, n, s = !1) {
    return Bi(n, t.nl(s ? 4 /* ArrayArgument */ : 3 /* Argument */ , e));
}

/**
 * Parses user data to Protobuf Values.
 *
 * @param input Data to be parsed.
 * @param context A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @return The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */ function Bi(t, e) {
    if (Qi(t)) return ji("Unsupported field value:", e, t), Wi(t, e);
    if (t instanceof Ai) 
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
        if (!ki(e.Lc)) throw e.Oc(t.kc + "() can only be used with update() and set()");
        if (!e.path) throw e.Oc(t.kc + "() is not currently supported inside arrays");
        const n = t.xc(e);
        n && e.fieldTransforms.push(n);
    }
    /**
 * Helper to parse a scalar value (i.e. not an Object, Array, or FieldValue)
 *
 * @return The parsed value
 */ (t, e), null;
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
            const n = [];
            let s = 0;
            for (const i of t) {
                let t = Bi(i, e.tl(s));
                null == t && (
                // Just include nulls in the array for fields being replaced with a
                // sentinel.
                t = {
                    nullValue: "NULL_VALUE"
                }), n.push(t), s++;
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
        if ("number" == typeof t) return se(e.serializer, t);
        if ("boolean" == typeof t) return {
            booleanValue: t
        };
        if ("string" == typeof t) return {
            stringValue: t
        };
        if (t instanceof Date) {
            const n = L.fromDate(t);
            return {
                timestampValue: ie(e.serializer, n)
            };
        }
        if (t instanceof L) {
            // Firestore backend truncates precision down to microseconds. To ensure
            // offline mode works the same with regards to truncation, perform the
            // truncation immediately without waiting for the backend to do that.
            const n = new L(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3));
            return {
                timestampValue: ie(e.serializer, n)
            };
        }
        if (t instanceof Ci) return {
            geoPointValue: {
                latitude: t.latitude,
                longitude: t.longitude
            }
        };
        if (t instanceof mi) return {
            bytesValue: re(e.serializer, t)
        };
        if (t instanceof Fi) {
            const n = e.s, s = t.jc;
            if (!s.isEqual(n)) throw e.Oc(`Document reference is for database ${s.projectId}/${s.database} but should be for database ${n.projectId}/${n.database}`);
            return {
                referenceValue: ae(t.jc || e.s, t.Gc.path)
            };
        }
        if (void 0 === t && e.ignoreUndefinedProperties) return null;
        throw e.Oc("Unsupported field value: " + ui(t));
    }
    /**
 * Checks whether an object looks like a JSON object that should be converted
 * into a struct. Normal class/prototype instances are considered to look like
 * JSON objects since they should be converted to a struct value. Arrays, Dates,
 * GeoPoints, etc. are not considered to look like JSON objects since they map
 * to specific FieldValue types other than ObjectValue.
 */ (t, e);
}

function Wi(t, e) {
    const n = {};
    return N(t) ? 
    // If we encounter an empty object, we explicitly add it to the update
    // mask to ensure that the server creates a map entry.
    e.path && e.path.length > 0 && e.Me.push(e.path) : F(t, (t, s) => {
        const i = Bi(s, e.Xc(t));
        null != i && (n[t] = i);
    }), {
        mapValue: {
            fields: n
        }
    };
}

function Qi(t) {
    return !("object" != typeof t || null === t || t instanceof Array || t instanceof Date || t instanceof L || t instanceof Ci || t instanceof mi || t instanceof Fi || t instanceof Ai);
}

function ji(t, e, n) {
    if (!Qi(n) || !ai(n)) {
        const s = ui(n);
        throw "an object" === s ? e.Oc(t + " a custom object") : e.Oc(t + " " + s);
    }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */ function Gi(t, e, n) {
    if (e instanceof Ei) return e.Nc;
    if ("string" == typeof e) return Ki(t, e);
    throw zi("Field path arguments must be of type string or FieldPath.", t, 
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
 */ function Ki(t, e, n) {
    try {
        return function(t) {
            if (t.search(Ri) >= 0) throw new x(k.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`);
            try {
                return new Ii(...t.split("."));
            } catch (e) {
                throw new x(k.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            }
        }(e).Nc;
    } catch (e) {
        throw zi((s = e) instanceof Error ? s.message : s.toString(), t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
    }
    /**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */
    var s;
    /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}

function zi(t, e, n, s, i) {
    const r = s && !s._(), o = void 0 !== i;
    let h = `Function ${e}() called with invalid data`;
    n && (h += " (via `toFirestore()`)"), h += ". ";
    let a = "";
    return (r || o) && (a += " (found", r && (a += " in field " + s), o && (a += " in document " + i), 
    a += ")"), new x(k.INVALID_ARGUMENT, h + t + a);
}

function Hi(t, e) {
    return t.some(t => t.isEqual(e));
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
 */ class Yi {
    constructor(t) {
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
    async hl(t) {
        if (this.al(), this.mutations.length > 0) throw new x(k.INVALID_ARGUMENT, "Firestore transactions require all reads to be executed before all writes.");
        const e = await async function(t, e) {
            const n = y(t), s = _e(n.serializer) + "/documents", i = {
                documents: e.map(t => ue(n.serializer, t))
            }, r = await n.Vo("BatchGetDocuments", s, i), o = new Map;
            r.forEach(t => {
                const e = de(n.serializer, t);
                o.set(e.key.toString(), e);
            });
            const h = [];
            return e.forEach(t => {
                const e = o.get(t.toString());
                V(!!e), h.push(e);
            }), h;
        }(this.ko, t);
        return e.forEach(t => {
            t instanceof un || t instanceof an ? this.ul(t) : P();
        }), e;
    }
    set(t, e) {
        this.write(e.zc(t, this.Be(t))), this.ol.add(t);
    }
    update(t, e) {
        try {
            this.write(e.zc(t, this.cl(t)));
        } catch (t) {
            this.rl = t;
        }
        this.ol.add(t);
    }
    delete(t) {
        this.write([ new en(t, this.Be(t)) ]), this.ol.add(t);
    }
    async commit() {
        if (this.al(), this.rl) throw this.rl;
        const t = this.sl;
        // For each mutation, note that the doc was written.
                this.mutations.forEach(e => {
            t.delete(e.key.toString());
        }), 
        // For each document that was read but not written to, we want to perform
        // a `verify` operation.
        t.forEach((t, e) => {
            const n = new W(q.$(e));
            this.mutations.push(new nn(n, this.Be(n)));
        }), await async function(t, e) {
            const n = y(t), s = _e(n.serializer) + "/documents", i = {
                writes: e.map(t => Te(n.serializer, t))
            };
            await n.Po("Commit", s, i);
        }(this.ko, this.mutations), this.il = !0;
    }
    ul(t) {
        let e;
        if (t instanceof an) e = t.version; else {
            if (!(t instanceof un)) throw P();
            // For deleted docs, we must use baseVersion 0 when we overwrite them.
            e = O.min();
        }
        const n = this.sl.get(t.key.toString());
        if (n) {
            if (!e.isEqual(n)) 
            // This transaction will fail no matter what.
            throw new x(k.ABORTED, "Document version changed between two reads.");
        } else this.sl.set(t.key.toString(), e);
    }
    /**
     * Returns the version of this document when it was read in this transaction,
     * as a precondition, or no precondition if it was not read.
     */    Be(t) {
        const e = this.sl.get(t.toString());
        return !this.ol.has(t) && e ? Ue.updateTime(e) : Ue.je();
    }
    /**
     * Returns the precondition for a document if the operation is an update.
     */    cl(t) {
        const e = this.sl.get(t.toString());
        // The first time a document is written, we want to take into account the
        // read time and existence
                if (!this.ol.has(t) && e) {
            if (e.isEqual(O.min())) 
            // The document doesn't exist, so fail the transaction.
            // This has to be validated locally because you can't send a
            // precondition that a document does not exist without changing the
            // semantics of the backend write to be an insert. This is the reverse
            // of what we want, since we want to assert that the document doesn't
            // exist but then send the update and have it fail. Since we can't
            // express that to the backend, we have to validate locally.
            // Note: this can change once we can send separate verify writes in the
            // transaction.
            throw new x(k.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
            // Document exists, base precondition on document update time.
                        return Ue.updateTime(e);
        }
        // Document was not read, so we just use the preconditions for a blind
        // update.
        return Ue.exists(!0);
    }
    write(t) {
        this.al(), this.mutations = this.mutations.concat(t);
    }
    al() {}
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
 * TransactionRunner encapsulates the logic needed to run and retry transactions
 * with backoff.
 */
class Xi {
    constructor(t, e, n, s) {
        this.Is = t, this.ko = e, this.updateFunction = n, this.Ps = s, this.ll = 5, this.$s = new Hn(this.Is, "transaction_retry" /* TransactionRetry */);
    }
    /** Runs the transaction and sets the result on deferred. */    _l() {
        this.fl();
    }
    fl() {
        this.$s.ds(async () => {
            const t = new Yi(this.ko), e = this.dl(t);
            e && e.then(e => {
                this.Is.gs(() => t.commit().then(() => {
                    this.Ps.resolve(e);
                }).catch(t => {
                    this.wl(t);
                }));
            }).catch(t => {
                this.wl(t);
            });
        });
    }
    dl(t) {
        try {
            const e = this.updateFunction(t);
            return !Q(e) && e.catch && e.then ? e : (this.Ps.reject(Error("Transaction callback must return a Promise")), 
            null);
        } catch (t) {
            // Do not retry errors thrown by user provided updateFunction.
            return this.Ps.reject(t), null;
        }
    }
    wl(t) {
        this.ll > 0 && this.Tl(t) ? (this.ll -= 1, this.Is.gs(() => (this.fl(), Promise.resolve()))) : this.Ps.reject(t);
    }
    Tl(t) {
        if ("FirebaseError" === t.name) {
            // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
            // non-matching document versions with ABORTED. These errors should be retried.
            const e = t.code;
            return "aborted" === e || "failed-precondition" === e || !it(e);
        }
        return !1;
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
 */
/**
 * FirestoreClient is a top-level class that constructs and owns all of the
 * pieces of the client SDK architecture. It is responsible for creating the
 * async queue that is shared by all of the other components in the system.
 */
class Ji {
    constructor(t, 
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
        this.ml = new zn;
    }
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
     */    start(t, e, n, s) {
        this.El(), this.ic = t;
        // If usePersistence is true, certain classes of errors while starting are
        // recoverable but only by falling back to persistence disabled.
        // If there's an error in the first case but not in recovery we cannot
        // reject the promise blocking the async queue because this will cause the
        // async queue to panic.
        const i = new zn;
        let r = !1;
        // Return only the result of enabling persistence. Note that this does not
        // need to await the completion of initializationDone because the result of
        // this method should not reflect any other kind of failure to start.
        return this.credentials.kr(t => {
            if (!r) return r = !0, E("FirestoreClient", "Initializing. user=", t.uid), this.Il(e, n, s, t, i).then(this.ml.resolve, this.ml.reject);
            this.Is.Us(() => this.oa.yh(t));
        }), 
        // Block the async queue until initialization is done
        this.Is.gs(() => this.ml.promise), i.promise;
    }
    /** Enables the network connection and requeues all pending operations. */    enableNetwork() {
        return this.El(), this.Is.enqueue(() => (this.persistence.Ou(!0), this.oa.enableNetwork()));
    }
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
     */    async Il(t, e, n, s, i) {
        try {
            const r = {
                Is: this.Is,
                ic: this.ic,
                clientId: this.clientId,
                credentials: this.credentials,
                Pc: s,
                aa: 100,
                yc: n
            };
            await t.initialize(r), await e.initialize(t, r), this.persistence = t.persistence, 
            this.ha = t.ha, this.$o = t.$o, this.Ic = t.Ic, this.ko = e.ko, this.oa = e.oa, 
            this.uh = e.uh, this.Rl = e.bc, 
            // When a user calls clearPersistence() in one client, all other clients
            // need to be terminated to allow the delete to succeed.
            this.persistence.Lu(async () => {
                await this.terminate();
            }), i.resolve();
        } catch (t) {
            // An unknown failure on the first stage shuts everything down.
            if (
            // Regardless of whether or not the retry succeeds, from an user
            // perspective, offline persistence has failed.
            i.reject(t), !this.Al(t)) throw t;
            return console.warn("Error enabling offline persistence. Falling back to persistence disabled: " + t), 
            this.Il(new Gs, new Ks, {
                Vc: !1
            }, s, i);
        }
    }
    /**
     * Decides whether the provided error allows us to gracefully disable
     * persistence (as opposed to crashing the client).
     */    Al(t) {
        return "FirebaseError" === t.name ? t.code === k.FAILED_PRECONDITION || t.code === k.UNIMPLEMENTED : !("undefined" != typeof DOMException && t instanceof DOMException) || (
        // When the browser is out of quota we could get either quota exceeded
        // or an aborted error depending on whether the error happened during
        // schema migration.
        22 === t.code || 20 === t.code || 
        // Firefox Private Browsing mode disables IndexedDb and returns
        // INVALID_STATE for any usage.
        11 === t.code);
    }
    /**
     * Checks that the client has not been terminated. Ensures that other methods on
     * this class cannot be called after the client is terminated.
     */    El() {
        if (this.Is.xs) throw new x(k.FAILED_PRECONDITION, "The client has already been terminated.");
    }
    /** Disables the network connection. Pending operations will not complete. */    disableNetwork() {
        return this.El(), this.Is.enqueue(() => (this.persistence.Ou(!1), this.oa.disableNetwork()));
    }
    terminate() {
        this.Is.qs();
        const t = new zn;
        return this.Is.Ls(async () => {
            try {
                // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
                this.Ic && this.Ic.stop(), await this.oa.rh(), await this.ha.rh(), await this.persistence.rh(), 
                // `removeChangeListener` must be called after shutting down the
                // RemoteStore as it will prevent the RemoteStore from retrieving
                // auth tokens.
                this.credentials.xr(), t.resolve();
            } catch (e) {
                const n = ts(e, "Failed to shutdown persistence");
                t.reject(n);
            }
        }), t.promise;
    }
    /**
     * Returns a Promise that resolves when all writes that were pending at the time this
     * method was called received server acknowledgement. An acknowledgement can be either acceptance
     * or rejection.
     */    waitForPendingWrites() {
        this.El();
        const t = new zn;
        return this.Is.gs(() => this.uh.Da(t)), t.promise;
    }
    listen(t, e, n) {
        this.El();
        const s = new Hs(n), i = new Ds(t, s, e);
        return this.Is.gs(() => this.Rl.listen(i)), () => {
            s.Dc(), this.Is.gs(() => this.Rl.hh(i));
        };
    }
    async Pl(t) {
        return this.El(), await this.ml.promise, async function(t, e, n) {
            const s = new zn;
            return await t.enqueue(async () => {
                try {
                    const t = await e.ir(n);
                    t instanceof an ? s.resolve(t) : t instanceof un ? s.resolve(null) : s.reject(new x(k.UNAVAILABLE, "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"));
                } catch (t) {
                    const e = ts(t, `Failed to get document '${n} from cache`);
                    s.reject(e);
                }
            }), s.promise;
        }
        /**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */ (this.Is, this.$o, t);
    }
    async Vl(t, e) {
        return this.El(), await this.ml.promise, function(t, e, n, s) {
            const i = new zn, r = Zi(t, e, fn(n.path), {
                includeMetadataChanges: !0,
                Ja: !0
            }, {
                next: t => {
                    // Remove query first before passing event to user to avoid
                    // user actions affecting the now stale query.
                    r();
                    const e = t.docs.has(n);
                    !e && t.fromCache ? 
                    // TODO(dimond): If we're online and the document doesn't
                    // exist then we resolve with a doc.exists set to false. If
                    // we're offline however, we reject the Promise in this
                    // case. Two options: 1) Cache the negative response from
                    // the server so we can deliver that even when you're
                    // offline 2) Actually reject the Promise in the online case
                    // if the document doesn't exist.
                    i.reject(new x(k.UNAVAILABLE, "Failed to get document because the client is offline.")) : e && t.fromCache && s && "server" === s.source ? i.reject(new x(k.UNAVAILABLE, 'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')) : i.resolve(t);
                },
                error: t => i.reject(t)
            });
            return i.promise;
        }(this.Is, this.Rl, t, e);
    }
    async yl(t) {
        return this.El(), await this.ml.promise, async function(t, e, n) {
            const s = new zn;
            return await t.enqueue(async () => {
                try {
                    const t = await e.cr(n, 
                    /* usePreviousResults= */ !0), i = new ps(n, t._r), r = i.Kh(t.documents), o = i.Xh(r, 
                    /* updateLimboDocuments= */ !1);
                    s.resolve(o.snapshot);
                } catch (t) {
                    const e = ts(t, `Failed to execute query '${n} against cache`);
                    s.reject(e);
                }
            }), s.promise;
        }
        /**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */ (this.Is, this.$o, t);
    }
    async pl(t, e) {
        return this.El(), await this.ml.promise, function(t, e, n, s) {
            const i = new zn, r = Zi(t, e, n, {
                includeMetadataChanges: !0,
                Ja: !0
            }, {
                next: t => {
                    // Remove query first before passing event to user to avoid
                    // user actions affecting the now stale query.
                    r(), t.fromCache && s && "server" === s.source ? i.reject(new x(k.UNAVAILABLE, 'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')) : i.resolve(t);
                },
                error: t => i.reject(t)
            });
            return i.promise;
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
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 */ (this.Is, this.Rl, t, e);
    }
    write(t) {
        this.El();
        const e = new zn;
        return this.Is.gs(() => this.uh.write(t, e)), e.promise;
    }
    s() {
        return this.ic.s;
    }
    Qa(t) {
        this.El();
        const e = new Hs(t);
        return this.Is.gs(async () => this.Rl.Qa(e)), () => {
            e.Dc(), this.Is.gs(async () => this.Rl.ja(e));
        };
    }
    get gl() {
        // Technically, the asyncQueue is still running, but only accepting operations
        // related to termination or supposed to be run after termination. It is effectively
        // terminated to the eyes of users.
        return this.Is.xs;
    }
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
     */    transaction(t) {
        this.El();
        const e = new zn;
        return this.Is.gs(() => (new Xi(this.Is, this.ko, t, e)._l(), Promise.resolve())), 
        e.promise;
    }
}

function Zi(t, e, n, s, i) {
    const r = new Hs(i), o = new Ds(n, r, s);
    return t.gs(() => e.listen(o)), () => {
        r.Dc(), t.gs(() => e.hh(o));
    };
}

class tr {
    constructor(t, e, n, s) {
        this.s = t, this.timestampsInSnapshots = e, this.vl = n, this.bl = s;
    }
    Sl(t) {
        switch (xt(t)) {
          case 0 /* NullValue */ :
            return null;

          case 1 /* BooleanValue */ :
            return t.booleanValue;

          case 2 /* NumberValue */ :
            return Qt(t.integerValue || t.doubleValue);

          case 3 /* TimestampValue */ :
            return this.Cl(t.timestampValue);

          case 4 /* ServerTimestampValue */ :
            return this.Dl(t);

          case 5 /* StringValue */ :
            return t.stringValue;

          case 6 /* BlobValue */ :
            return new mi(jt(t.bytesValue));

          case 7 /* RefValue */ :
            return this.Fl(t.referenceValue);

          case 8 /* GeoPointValue */ :
            return this.Nl(t.geoPointValue);

          case 9 /* ArrayValue */ :
            return this.$l(t.arrayValue);

          case 10 /* ObjectValue */ :
            return this.kl(t.mapValue);

          default:
            throw P();
        }
    }
    kl(t) {
        const e = {};
        return F(t.fields || {}, (t, n) => {
            e[t] = this.Sl(n);
        }), e;
    }
    Nl(t) {
        return new Ci(Qt(t.latitude), Qt(t.longitude));
    }
    $l(t) {
        return (t.values || []).map(t => this.Sl(t));
    }
    Dl(t) {
        switch (this.vl) {
          case "previous":
            const e = function t(e) {
                const n = e.mapValue.fields.__previous_value__;
                return Nt(n) ? t(n) : n;
            }(t);
            return null == e ? null : this.Sl(e);

          case "estimate":
            return this.Cl($t(t));

          default:
            return null;
        }
    }
    Cl(t) {
        const e = Wt(t), n = new L(e.seconds, e.nanos);
        return this.timestampsInSnapshots ? n : n.toDate();
    }
    Fl(t) {
        const e = q.$(t);
        V(ye(e));
        const n = new C(e.get(1), e.get(3)), s = new W(e.p(5));
        return n.isEqual(this.s) || 
        // TODO(b/64130202): Somehow support foreign references.
        I(`Document ${s} contains a document reference within a different database (${n.projectId}/${n.database}) which is not supported. It will be treated as a reference in the current database (${this.s.projectId}/${this.s.database}) instead.`), 
        this.bl(s);
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
 */
// settings() defaults:
const er = es.ei;

/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied firestore.Settings object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
class nr {
    constructor(t) {
        var e, n, s, i;
        if (void 0 === t.host) {
            if (void 0 !== t.ssl) throw new x(k.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
            this.host = "firestore.googleapis.com", this.ssl = !0;
        } else ni("settings", "non-empty string", "host", t.host), this.host = t.host, si("settings", "boolean", "ssl", t.ssl), 
        this.ssl = null === (e = t.ssl) || void 0 === e || e;
        if (li("settings", t, [ "host", "ssl", "credentials", "timestampsInSnapshots", "cacheSizeBytes", "experimentalForceLongPolling", "ignoreUndefinedProperties" ]), 
        si("settings", "object", "credentials", t.credentials), this.credentials = t.credentials, 
        si("settings", "boolean", "timestampsInSnapshots", t.timestampsInSnapshots), si("settings", "boolean", "ignoreUndefinedProperties", t.ignoreUndefinedProperties), 
        // Nobody should set timestampsInSnapshots anymore, but the error depends on
        // whether they set it to true or false...
        !0 === t.timestampsInSnapshots ? I("The setting 'timestampsInSnapshots: true' is no longer required and should be removed.") : !1 === t.timestampsInSnapshots && I("Support for 'timestampsInSnapshots: false' will be removed soon. You must update your code to handle Timestamp objects."), 
        this.timestampsInSnapshots = null === (n = t.timestampsInSnapshots) || void 0 === n || n, 
        this.ignoreUndefinedProperties = null !== (s = t.ignoreUndefinedProperties) && void 0 !== s && s, 
        si("settings", "number", "cacheSizeBytes", t.cacheSizeBytes), void 0 === t.cacheSizeBytes) this.cacheSizeBytes = es.si; else {
            if (t.cacheSizeBytes !== er && t.cacheSizeBytes < es.ni) throw new x(k.INVALID_ARGUMENT, "cacheSizeBytes must be at least " + es.ni);
            this.cacheSizeBytes = t.cacheSizeBytes;
        }
        si("settings", "boolean", "experimentalForceLongPolling", t.experimentalForceLongPolling), 
        this.forceLongPolling = null !== (i = t.experimentalForceLongPolling) && void 0 !== i && i;
    }
    isEqual(t) {
        return this.host === t.host && this.ssl === t.ssl && this.timestampsInSnapshots === t.timestampsInSnapshots && this.credentials === t.credentials && this.cacheSizeBytes === t.cacheSizeBytes && this.forceLongPolling === t.forceLongPolling && this.ignoreUndefinedProperties === t.ignoreUndefinedProperties;
    }
}

/**
 * The root reference to the database.
 */ class sr {
    // Note: We are using `MemoryComponentProvider` as a default
    // ComponentProvider to ensure backwards compatibility with the format
    // expected by the console build.
    constructor(t, e, n = new Gs, s = new Ks) {
        if (this.xl = n, this.Ll = s, this.Ol = null, 
        // Public for use in tests.
        // TODO(mikelehen): Use modularized initialization instead.
        this.Ml = new Zn, this.INTERNAL = {
            delete: async () => {
                // The client must be initalized to ensure that all subsequent API usage
                // throws an exception.
                this.ql(), await this.Ul.terminate();
            }
        }, "object" == typeof t.options) {
            // This is very likely a Firebase app object
            // TODO(b/34177605): Can we somehow use instanceof?
            const n = t;
            this.Ol = n, this.jc = sr.Bl(n), this.Wl = n.name, this.Ql = new _s(e);
        } else {
            const e = t;
            if (!e.projectId) throw new x(k.INVALID_ARGUMENT, "Must provide projectId");
            this.jc = new C(e.projectId, e.database), 
            // Use a default persistenceKey that lines up with FirebaseApp.
            this.Wl = "[DEFAULT]", this.Ql = new ls;
        }
        this.jl = new nr({});
    }
    get Gl() {
        return this.Kl || (
        // Lazy initialize UserDataReader once the settings are frozen
        this.Kl = new Li(this.jc, this.jl.ignoreUndefinedProperties)), this.Kl;
    }
    settings(t) {
        Xs("Firestore.settings", arguments, 1), ti("Firestore.settings", "object", 1, t);
        const e = new nr(t);
        if (this.Ul && !this.jl.isEqual(e)) throw new x(k.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only call settings() before calling any other methods on a Firestore object.");
        this.jl = e, void 0 !== e.credentials && (this.Ql = function(t) {
            if (!t) return new ls;
            switch (t.type) {
              case "gapi":
                const e = t.zl;
                // Make sure this really is a Gapi client.
                                return V(!("object" != typeof e || null === e || !e.auth || !e.auth.getAuthHeaderValueForFirstParty)), 
                new ds(e, t.Br || "0");

              case "provider":
                return t.zl;

              default:
                throw new x(k.INVALID_ARGUMENT, "makeCredentialsProvider failed due to invalid credential type");
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
 */ (e.credentials));
    }
    enableNetwork() {
        return this.ql(), this.Ul.enableNetwork();
    }
    disableNetwork() {
        return this.ql(), this.Ul.disableNetwork();
    }
    enablePersistence(t) {
        var e, n;
        if (this.Ul) throw new x(k.FAILED_PRECONDITION, "Firestore has already been started and persistence can no longer be enabled. You can only call enablePersistence() before calling any other methods on a Firestore object.");
        let s = !1, i = !1;
        if (t && (void 0 !== t.experimentalTabSynchronization && I("The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead."), 
        s = null !== (n = null !== (e = t.synchronizeTabs) && void 0 !== e ? e : t.experimentalTabSynchronization) && void 0 !== n && n, 
        i = !!t.experimentalForceOwningTab && t.experimentalForceOwningTab, s && i)) throw new x(k.INVALID_ARGUMENT, "The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'.");
        return this.Hl(this.xl, this.Ll, {
            Vc: !0,
            cacheSizeBytes: this.jl.cacheSizeBytes,
            synchronizeTabs: s,
            Yl: i
        });
    }
    async clearPersistence() {
        if (void 0 !== this.Ul && !this.Ul.gl) throw new x(k.FAILED_PRECONDITION, "Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");
        const t = new zn;
        return this.Ml.Ls(async () => {
            try {
                await this.xl.clearPersistence(this.jc, this.Wl), t.resolve();
            } catch (e) {
                t.reject(e);
            }
        }), t.promise;
    }
    terminate() {
        return this.app._removeServiceInstance("firestore"), this.INTERNAL.delete();
    }
    get Xl() {
        return this.ql(), this.Ul.gl;
    }
    waitForPendingWrites() {
        return this.ql(), this.Ul.waitForPendingWrites();
    }
    onSnapshotsInSync(t) {
        if (this.ql(), zs(t)) return this.Ul.Qa(t);
        {
            ti("Firestore.onSnapshotsInSync", "function", 1, t);
            const e = {
                next: t
            };
            return this.Ul.Qa(e);
        }
    }
    ql() {
        return this.Ul || 
        // Kick off starting the client but don't actually wait for it.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.Hl(new Gs, new Ks, {
            Vc: !1
        }), this.Ul;
    }
    Jl() {
        return new S(this.jc, this.Wl, this.jl.host, this.jl.ssl, this.jl.forceLongPolling);
    }
    Hl(t, e, n) {
        const s = this.Jl();
        return this.Ul = new Ji(this.Ql, this.Ml), this.Ul.start(s, t, e, n);
    }
    static Bl(t) {
        if (e = t.options, n = "projectId", !Object.prototype.hasOwnProperty.call(e, n)) throw new x(k.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
        var e, n;
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
 */        const s = t.options.projectId;
        if (!s || "string" != typeof s) throw new x(k.INVALID_ARGUMENT, "projectId must be a string in FirebaseApp.options");
        return new C(s);
    }
    get app() {
        if (!this.Ol) throw new x(k.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
        return this.Ol;
    }
    collection(t) {
        return Xs("Firestore.collection", arguments, 1), ti("Firestore.collection", "non-empty string", 1, t), 
        this.ql(), new Er(q.$(t), this, 
        /* converter= */ null);
    }
    doc(t) {
        return Xs("Firestore.doc", arguments, 1), ti("Firestore.doc", "non-empty string", 1, t), 
        this.ql(), or.Zl(q.$(t), this, 
        /* converter= */ null);
    }
    collectionGroup(t) {
        if (Xs("Firestore.collectionGroup", arguments, 1), ti("Firestore.collectionGroup", "non-empty string", 1, t), 
        t.indexOf("/") >= 0) throw new x(k.INVALID_ARGUMENT, `Invalid collection ID '${t}' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.`);
        return this.ql(), new Tr(function(t) {
            return new _n(q.k(), t);
        }(t), this, 
        /* converter= */ null);
    }
    runTransaction(t) {
        return Xs("Firestore.runTransaction", arguments, 1), ti("Firestore.runTransaction", "function", 1, t), 
        this.ql().transaction(e => t(new ir(this, e)));
    }
    batch() {
        return this.ql(), new rr(this);
    }
    static get logLevel() {
        switch (m()) {
          case n.DEBUG:
            return "debug";

          case n.ERROR:
            return "error";

          case n.SILENT:
            return "silent";

          case n.WARN:
            return "warn";

          case n.INFO:
            return "info";

          case n.VERBOSE:
            return "verbose";

          default:
            // The default log level is error
            return "error";
        }
    }
    static setLogLevel(t) {
        var e;
        Xs("Firestore.setLogLevel", arguments, 1), oi("setLogLevel", [ "debug", "error", "silent", "warn", "info", "verbose" ], 1, t), 
        e = t, T.setLogLevel(e);
    }
    // Note: this is not a property because the minifier can't work correctly with
    // the way TypeScript compiler outputs properties.
    t_() {
        return this.jl.timestampsInSnapshots;
    }
}

/**
 * A reference to a transaction.
 */ class ir {
    constructor(t, e) {
        this.e_ = t, this.n_ = e;
    }
    get(t) {
        Xs("Transaction.get", arguments, 1);
        const e = Pr("Transaction.get", t, this.e_);
        return this.n_.hl([ e.Gc ]).then(t => {
            if (!t || 1 !== t.length) return P();
            const n = t[0];
            if (n instanceof un) return new ar(this.e_, e.Gc, null, 
            /* fromCache= */ !1, 
            /* hasPendingWrites= */ !1, e.Kc);
            if (n instanceof an) return new ar(this.e_, e.Gc, n, 
            /* fromCache= */ !1, 
            /* hasPendingWrites= */ !1, e.Kc);
            throw P();
        });
    }
    set(t, e, n) {
        Zs("Transaction.set", arguments, 2, 3);
        const s = Pr("Transaction.set", t, this.e_);
        n = Ir("Transaction.set", n);
        const i = yr(s.Kc, e, n), r = Oi(this.e_.Gl, "Transaction.set", s.Gc, i, null !== s.Kc, n);
        return this.n_.set(s.Gc, r), this;
    }
    update(t, e, n, ...s) {
        let i, r;
        return "string" == typeof e || e instanceof Ii ? (Js("Transaction.update", arguments, 3), 
        i = Pr("Transaction.update", t, this.e_), r = qi(this.e_.Gl, "Transaction.update", i.Gc, e, n, s)) : (Xs("Transaction.update", arguments, 2), 
        i = Pr("Transaction.update", t, this.e_), r = Mi(this.e_.Gl, "Transaction.update", i.Gc, e)), 
        this.n_.update(i.Gc, r), this;
    }
    delete(t) {
        Xs("Transaction.delete", arguments, 1);
        const e = Pr("Transaction.delete", t, this.e_);
        return this.n_.delete(e.Gc), this;
    }
}

class rr {
    constructor(t) {
        this.e_ = t, this.s_ = [], this.i_ = !1;
    }
    set(t, e, n) {
        Zs("WriteBatch.set", arguments, 2, 3), this.r_();
        const s = Pr("WriteBatch.set", t, this.e_);
        n = Ir("WriteBatch.set", n);
        const i = yr(s.Kc, e, n), r = Oi(this.e_.Gl, "WriteBatch.set", s.Gc, i, null !== s.Kc, n);
        return this.s_ = this.s_.concat(r.zc(s.Gc, Ue.je())), this;
    }
    update(t, e, n, ...s) {
        let i, r;
        return this.r_(), "string" == typeof e || e instanceof Ii ? (Js("WriteBatch.update", arguments, 3), 
        i = Pr("WriteBatch.update", t, this.e_), r = qi(this.e_.Gl, "WriteBatch.update", i.Gc, e, n, s)) : (Xs("WriteBatch.update", arguments, 2), 
        i = Pr("WriteBatch.update", t, this.e_), r = Mi(this.e_.Gl, "WriteBatch.update", i.Gc, e)), 
        this.s_ = this.s_.concat(r.zc(i.Gc, Ue.exists(!0))), this;
    }
    delete(t) {
        Xs("WriteBatch.delete", arguments, 1), this.r_();
        const e = Pr("WriteBatch.delete", t, this.e_);
        return this.s_ = this.s_.concat(new en(e.Gc, Ue.je())), this;
    }
    commit() {
        return this.r_(), this.i_ = !0, this.s_.length > 0 ? this.e_.ql().write(this.s_) : Promise.resolve();
    }
    r_() {
        if (this.i_) throw new x(k.FAILED_PRECONDITION, "A write batch can no longer be used after commit() has been called.");
    }
}

/**
 * A reference to a particular document in a collection in the database.
 */ class or extends Fi {
    constructor(t, e, n) {
        super(e.jc, t, n), this.Gc = t, this.firestore = e, this.Kc = n, this.Ul = this.firestore.ql();
    }
    static Zl(t, e, n) {
        if (t.length % 2 != 0) throw new x(k.INVALID_ARGUMENT, `Invalid document reference. Document references must have an even number of segments, but ${t.N()} has ${t.length}`);
        return new or(new W(t), e, n);
    }
    get id() {
        return this.Gc.path.S();
    }
    get parent() {
        return new Er(this.Gc.path.g(), this.firestore, this.Kc);
    }
    get path() {
        return this.Gc.path.N();
    }
    collection(t) {
        if (Xs("DocumentReference.collection", arguments, 1), ti("DocumentReference.collection", "non-empty string", 1, t), 
        !t) throw new x(k.INVALID_ARGUMENT, "Must provide a non-empty collection name to collection()");
        const e = q.$(t);
        return new Er(this.Gc.path.child(e), this.firestore, 
        /* converter= */ null);
    }
    isEqual(t) {
        if (!(t instanceof or)) throw _i("isEqual", "DocumentReference", 1, t);
        return this.firestore === t.firestore && this.Gc.isEqual(t.Gc) && this.Kc === t.Kc;
    }
    set(t, e) {
        Zs("DocumentReference.set", arguments, 1, 2), e = Ir("DocumentReference.set", e);
        const n = yr(this.Kc, t, e), s = Oi(this.firestore.Gl, "DocumentReference.set", this.Gc, n, null !== this.Kc, e);
        return this.Ul.write(s.zc(this.Gc, Ue.je()));
    }
    update(t, e, ...n) {
        let s;
        return "string" == typeof t || t instanceof Ii ? (Js("DocumentReference.update", arguments, 2), 
        s = qi(this.firestore.Gl, "DocumentReference.update", this.Gc, t, e, n)) : (Xs("DocumentReference.update", arguments, 1), 
        s = Mi(this.firestore.Gl, "DocumentReference.update", this.Gc, t)), this.Ul.write(s.zc(this.Gc, Ue.exists(!0)));
    }
    delete() {
        return Xs("DocumentReference.delete", arguments, 0), this.Ul.write([ new en(this.Gc, Ue.je()) ]);
    }
    onSnapshot(...t) {
        var e, n, s;
        Zs("DocumentReference.onSnapshot", arguments, 1, 4);
        let i = {
            includeMetadataChanges: !1
        }, r = 0;
        "object" != typeof t[r] || zs(t[r]) || (i = t[r], li("DocumentReference.onSnapshot", i, [ "includeMetadataChanges" ]), 
        si("DocumentReference.onSnapshot", "boolean", "includeMetadataChanges", i.includeMetadataChanges), 
        r++);
        const o = {
            includeMetadataChanges: i.includeMetadataChanges
        };
        if (zs(t[r])) {
            const i = t[r];
            t[r] = null === (e = i.next) || void 0 === e ? void 0 : e.bind(i), t[r + 1] = null === (n = i.error) || void 0 === n ? void 0 : n.bind(i), 
            t[r + 2] = null === (s = i.complete) || void 0 === s ? void 0 : s.bind(i);
        } else ti("DocumentReference.onSnapshot", "function", r, t[r]), ei("DocumentReference.onSnapshot", "function", r + 1, t[r + 1]), 
        ei("DocumentReference.onSnapshot", "function", r + 2, t[r + 2]);
        const h = {
            next: e => {
                t[r] && t[r](this.o_(e));
            },
            error: t[r + 1],
            complete: t[r + 2]
        };
        return this.Ul.listen(fn(this.Gc.path), o, h);
    }
    get(t) {
        Zs("DocumentReference.get", arguments, 0, 1), Ar("DocumentReference.get", t);
        const e = this.firestore.ql();
        return t && "cache" === t.source ? e.Pl(this.Gc).then(t => new ar(this.firestore, this.Gc, t, 
        /*fromCache=*/ !0, t instanceof an && t.Ge, this.Kc)) : e.Vl(this.Gc, t).then(t => this.o_(t));
    }
    withConverter(t) {
        return new or(this.Gc, this.firestore, t);
    }
    /**
     * Converts a ViewSnapshot that contains the current document to a
     * DocumentSnapshot.
     */    o_(t) {
        const e = t.docs.get(this.Gc);
        return new ar(this.firestore, this.Gc, e, t.fromCache, t.hasPendingWrites, this.Kc);
    }
}

class hr {
    constructor(t, e) {
        this.hasPendingWrites = t, this.fromCache = e;
    }
    isEqual(t) {
        return this.hasPendingWrites === t.hasPendingWrites && this.fromCache === t.fromCache;
    }
}

class ar {
    constructor(t, e, n, s, i, r) {
        this.e_ = t, this.Gc = e, this.h_ = n, this.a_ = s, this.u_ = i, this.Kc = r;
    }
    data(t) {
        if (Zs("DocumentSnapshot.data", arguments, 0, 1), t = Rr("DocumentSnapshot.data", t), 
        this.h_) {
            // We only want to use the converter and create a new DocumentSnapshot
            // if a converter has been provided.
            if (this.Kc) {
                const e = new ur(this.e_, this.Gc, this.h_, this.a_, this.u_, 
                /* converter= */ null);
                return this.Kc.fromFirestore(e, t);
            }
            return new tr(this.e_.jc, this.e_.t_(), t.serverTimestamps || "none", t => new or(t, this.e_, /* converter= */ null)).Sl(this.h_.Ze());
        }
    }
    get(t, e) {
        if (Zs("DocumentSnapshot.get", arguments, 1, 2), e = Rr("DocumentSnapshot.get", e), 
        this.h_) {
            const n = this.h_.data().field(Gi("DocumentSnapshot.get", t, this.Gc));
            if (null !== n) {
                return new tr(this.e_.jc, this.e_.t_(), e.serverTimestamps || "none", t => new or(t, this.e_, this.Kc)).Sl(n);
            }
        }
    }
    get id() {
        return this.Gc.path.S();
    }
    get ref() {
        return new or(this.Gc, this.e_, this.Kc);
    }
    get exists() {
        return null !== this.h_;
    }
    get metadata() {
        return new hr(this.u_, this.a_);
    }
    isEqual(t) {
        if (!(t instanceof ar)) throw _i("isEqual", "DocumentSnapshot", 1, t);
        return this.e_ === t.e_ && this.a_ === t.a_ && this.Gc.isEqual(t.Gc) && (null === this.h_ ? null === t.h_ : this.h_.isEqual(t.h_)) && this.Kc === t.Kc;
    }
}

class ur extends ar {
    data(t) {
        return super.data(t);
    }
}

function cr(t, e, n, s, i, r, o) {
    let h;
    if (i.O()) {
        if ("array-contains" /* ARRAY_CONTAINS */ === r || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === r) throw new x(k.INVALID_ARGUMENT, `Invalid Query. You can't perform '${r}' queries on FieldPath.documentId().`);
        if ("in" /* IN */ === r || "not-in" /* NOT_IN */ === r) {
            fr(o, r);
            const e = [];
            for (const n of o) e.push(_r(s, t, n));
            h = {
                arrayValue: {
                    values: e
                }
            };
        } else h = _r(s, t, o);
    } else "in" /* IN */ !== r && "not-in" /* NOT_IN */ !== r && "array-contains-any" /* ARRAY_CONTAINS_ANY */ !== r || fr(o, r), 
    h = Ui(n, e, o, 
    /* allowArrays= */ "in" /* IN */ === r || "not-in" /* NOT_IN */ === r);
    const a = pn.create(i, r, h);
    return function(t, e) {
        if (e.ln()) {
            const n = t.cn();
            if (null !== n && !n.isEqual(e.field)) throw new x(k.INVALID_ARGUMENT, `Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '${n.toString()}' and '${e.field.toString()}'`);
            const s = t.un();
            null !== s && dr(t, e.field, s);
        }
        const n = t._n(
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
        if (null !== n) 
        // Special case when it's a duplicate op to give a slightly clearer error message.
        throw n === e.op ? new x(k.INVALID_ARGUMENT, `Invalid query. You cannot use more than one '${e.op.toString()}' filter.`) : new x(k.INVALID_ARGUMENT, `Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`);
    }(t, a), a;
}

function lr(t, e, n) {
    if (null !== t.startAt) throw new x(k.INVALID_ARGUMENT, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
    if (null !== t.endAt) throw new x(k.INVALID_ARGUMENT, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
    const s = new Mn(e, n);
    return function(t, e) {
        if (null === t.un()) {
            // This is the first order by. It must match any inequality.
            const n = t.cn();
            null !== n && dr(t, n, e.field);
        }
    }(t, s), s;
}

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
 */
function _r(t, e, n) {
    if ("string" == typeof n) {
        if ("" === n) throw new x(k.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");
        if (!dn(e) && -1 !== n.indexOf("/")) throw new x(k.INVALID_ARGUMENT, `Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);
        const s = e.path.child(q.$(n));
        if (!W.W(s)) throw new x(k.INVALID_ARGUMENT, `Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '${s}' is not because it has an odd number of segments (${s.length}).`);
        return Gt(t, new W(s));
    }
    if (n instanceof Fi) return Gt(t, n.Gc);
    throw new x(k.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: " + ui(n) + ".");
}

/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */ function fr(t, e) {
    if (!Array.isArray(t) || 0 === t.length) throw new x(k.INVALID_ARGUMENT, `Invalid Query. A non-empty array is required for '${e.toString()}' filters.`);
    if (t.length > 10) throw new x(k.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters support a maximum of 10 elements in the value array.`);
    if ("in" /* IN */ === e || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e) {
        if (t.indexOf(null) >= 0) throw new x(k.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters cannot contain 'null' in the value array.`);
        if (t.filter(t => Number.isNaN(t)).length > 0) throw new x(k.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters cannot contain 'NaN' in the value array.`);
    }
}

function dr(t, e, n) {
    if (!n.isEqual(e)) throw new x(k.INVALID_ARGUMENT, `Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '${e.toString()}' and so you must also use '${e.toString()}' as your first orderBy(), but your first orderBy() is on field '${n.toString()}' instead.`);
}

function wr(t) {
    if (t.an() && 0 === t.tn.length) throw new x(k.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
}

class Tr {
    constructor(t, e, n) {
        this.c_ = t, this.firestore = e, this.Kc = n;
    }
    where(t, e, n) {
        // TODO(ne-queries): Add 'not-in' and '!=' to validation.
        let s;
        if (Xs("Query.where", arguments, 3), ci("Query.where", 3, n), "not-in" === e || "!=" === e) s = e; else {
            s = oi("Query.where", [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , "==" /* EQUAL */ , ">=" /* GREATER_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , "array-contains" /* ARRAY_CONTAINS */ , "in" /* IN */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ ], 2, e);
        }
        const i = Gi("Query.where", t), r = cr(this.c_, "Query.where", this.firestore.Gl, this.firestore.jc, i, s, n);
        return new Tr(function(t, e) {
            const n = t.filters.concat([ e ]);
            return new _n(t.path, t.collectionGroup, t.tn.slice(), n, t.limit, t.en, t.startAt, t.endAt);
        }(this.c_, r), this.firestore, this.Kc);
    }
    orderBy(t, e) {
        let n;
        if (Zs("Query.orderBy", arguments, 1, 2), ei("Query.orderBy", "non-empty string", 2, e), 
        void 0 === e || "asc" === e) n = "asc" /* ASCENDING */; else {
            if ("desc" !== e) throw new x(k.INVALID_ARGUMENT, `Function Query.orderBy() has unknown direction '${e}', expected 'asc' or 'desc'.`);
            n = "desc" /* DESCENDING */;
        }
        const s = Gi("Query.orderBy", t), i = lr(this.c_, s, n);
        return new Tr(function(t, e) {
            // TODO(dimond): validate that orderBy does not list the same key twice.
            const n = t.tn.concat([ e ]);
            return new _n(t.path, t.collectionGroup, n, t.filters.slice(), t.limit, t.en, t.startAt, t.endAt);
        }(this.c_, i), this.firestore, this.Kc);
    }
    limit(t) {
        return Xs("Query.limit", arguments, 1), ti("Query.limit", "number", 1, t), fi("Query.limit", 1, t), 
        new Tr(mn(this.c_, t, "F" /* First */), this.firestore, this.Kc);
    }
    limitToLast(t) {
        return Xs("Query.limitToLast", arguments, 1), ti("Query.limitToLast", "number", 1, t), 
        fi("Query.limitToLast", 1, t), new Tr(mn(this.c_, t, "L" /* Last */), this.firestore, this.Kc);
    }
    startAt(t, ...e) {
        Js("Query.startAt", arguments, 1);
        const n = this.l_("Query.startAt", t, e, 
        /*before=*/ !0);
        return new Tr(En(this.c_, n), this.firestore, this.Kc);
    }
    startAfter(t, ...e) {
        Js("Query.startAfter", arguments, 1);
        const n = this.l_("Query.startAfter", t, e, 
        /*before=*/ !1);
        return new Tr(En(this.c_, n), this.firestore, this.Kc);
    }
    endBefore(t, ...e) {
        Js("Query.endBefore", arguments, 1);
        const n = this.l_("Query.endBefore", t, e, 
        /*before=*/ !0);
        return new Tr(In(this.c_, n), this.firestore, this.Kc);
    }
    endAt(t, ...e) {
        Js("Query.endAt", arguments, 1);
        const n = this.l_("Query.endAt", t, e, 
        /*before=*/ !1);
        return new Tr(In(this.c_, n), this.firestore, this.Kc);
    }
    isEqual(t) {
        if (!(t instanceof Tr)) throw _i("isEqual", "Query", 1, t);
        return this.firestore === t.firestore && Rn(this.c_, t.c_) && this.Kc === t.Kc;
    }
    withConverter(t) {
        return new Tr(this.c_, this.firestore, t);
    }
    /** Helper function to create a bound from a document or fields */    l_(t, e, n, s) {
        if (ci(t, 1, e), e instanceof ar) return Xs(t, [ e, ...n ], 1), function(t, e, n, s, i) {
            if (!s) throw new x(k.NOT_FOUND, "Can't use a DocumentSnapshot that doesn't exist for " + n + "().");
            const r = [];
            // Because people expect to continue/end a query at the exact document
            // provided, we need to use the implicit sort order rather than the explicit
            // sort order, because it's guaranteed to contain the document key. That way
            // the position becomes unambiguous and the query continues/ends exactly at
            // the provided document. Without the key (by using the explicit sort
            // orders), multiple documents could match the position, yielding duplicate
            // results.
                        for (const n of wn(t)) if (n.field.O()) r.push(Gt(e, s.key)); else {
                const t = s.field(n.field);
                if (Nt(t)) throw new x(k.INVALID_ARGUMENT, 'Invalid query. You are trying to start or end a query using a document for which the field "' + n.field + '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');
                if (null === t) {
                    const t = n.field.N();
                    throw new x(k.INVALID_ARGUMENT, `Invalid query. You are trying to start or end a query using a document for which the field '${t}' (used as the orderBy) does not exist.`);
                }
                r.push(t);
            }
            return new kn(r, i);
        }
        /**
 * Converts a list of field values to a Bound for the given query.
 */ (this.c_, this.firestore.jc, t, e.h_, s);
        {
            const i = [ e ].concat(n);
            return function(t, e, n, s, i, r) {
                // Use explicit order by's because it has to match the query the user made
                const o = t.tn;
                if (i.length > o.length) throw new x(k.INVALID_ARGUMENT, `Too many arguments provided to ${s}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);
                const h = [];
                for (let r = 0; r < i.length; r++) {
                    const a = i[r];
                    if (o[r].field.O()) {
                        if ("string" != typeof a) throw new x(k.INVALID_ARGUMENT, `Invalid query. Expected a string for document ID in ${s}(), but got a ${typeof a}`);
                        if (!dn(t) && -1 !== a.indexOf("/")) throw new x(k.INVALID_ARGUMENT, `Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to ${s}() must be a plain document ID, but '${a}' contains a slash.`);
                        const n = t.path.child(q.$(a));
                        if (!W.W(n)) throw new x(k.INVALID_ARGUMENT, `Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to ${s}() must result in a valid document path, but '${n}' is not because it contains an odd number of segments.`);
                        const i = new W(n);
                        h.push(Gt(e, i));
                    } else {
                        const t = Ui(n, s, a);
                        h.push(t);
                    }
                }
                return new kn(h, r);
            }(this.c_, this.firestore.jc, this.firestore.Gl, t, i, s);
        }
    }
    onSnapshot(...t) {
        var e, n, s;
        Zs("Query.onSnapshot", arguments, 1, 4);
        let i = {}, r = 0;
        if ("object" != typeof t[r] || zs(t[r]) || (i = t[r], li("Query.onSnapshot", i, [ "includeMetadataChanges" ]), 
        si("Query.onSnapshot", "boolean", "includeMetadataChanges", i.includeMetadataChanges), 
        r++), zs(t[r])) {
            const i = t[r];
            t[r] = null === (e = i.next) || void 0 === e ? void 0 : e.bind(i), t[r + 1] = null === (n = i.error) || void 0 === n ? void 0 : n.bind(i), 
            t[r + 2] = null === (s = i.complete) || void 0 === s ? void 0 : s.bind(i);
        } else ti("Query.onSnapshot", "function", r, t[r]), ei("Query.onSnapshot", "function", r + 1, t[r + 1]), 
        ei("Query.onSnapshot", "function", r + 2, t[r + 2]);
        const o = {
            next: e => {
                t[r] && t[r](new mr(this.firestore, this.c_, e, this.Kc));
            },
            error: t[r + 1],
            complete: t[r + 2]
        };
        wr(this.c_);
        return this.firestore.ql().listen(this.c_, i, o);
    }
    get(t) {
        Zs("Query.get", arguments, 0, 1), Ar("Query.get", t), wr(this.c_);
        const e = this.firestore.ql();
        return (t && "cache" === t.source ? e.yl(this.c_) : e.pl(this.c_, t)).then(t => new mr(this.firestore, this.c_, t, this.Kc));
    }
}

class mr {
    constructor(t, e, n, s) {
        this.e_ = t, this.__ = e, this.f_ = n, this.Kc = s, this.d_ = null, this.w_ = null, 
        this.metadata = new hr(n.hasPendingWrites, n.fromCache);
    }
    get docs() {
        const t = [];
        return this.forEach(e => t.push(e)), t;
    }
    get empty() {
        return this.f_.docs._();
    }
    get size() {
        return this.f_.docs.size;
    }
    forEach(t, e) {
        Zs("QuerySnapshot.forEach", arguments, 1, 2), ti("QuerySnapshot.forEach", "function", 1, t), 
        this.f_.docs.forEach(n => {
            t.call(e, this.T_(n, this.metadata.fromCache, this.f_.Mt.has(n.key)));
        });
    }
    get query() {
        return new Tr(this.__, this.e_, this.Kc);
    }
    docChanges(t) {
        t && (li("QuerySnapshot.docChanges", t, [ "includeMetadataChanges" ]), si("QuerySnapshot.docChanges", "boolean", "includeMetadataChanges", t.includeMetadataChanges));
        const e = !(!t || !t.includeMetadataChanges);
        if (e && this.f_.Ut) throw new x(k.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
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
                let e, s = 0;
                return t.docChanges.map(i => {
                    const r = n(i.doc, t.fromCache, t.Mt.has(i.doc.key));
                    return e = i.doc, {
                        type: "added",
                        doc: r,
                        oldIndex: -1,
                        newIndex: s++
                    };
                });
            }
            {
                // A DocumentSet that is updated incrementally as changes are applied to use
                // to lookup the index of a document.
                let s = t.Ot;
                return t.docChanges.filter(t => e || 3 /* Metadata */ !== t.type).map(e => {
                    const i = n(e.doc, t.fromCache, t.Mt.has(e.doc.key));
                    let r = -1, o = -1;
                    return 0 /* Added */ !== e.type && (r = s.indexOf(e.doc.key), s = s.delete(e.doc.key)), 
                    1 /* Removed */ !== e.type && (s = s.add(e.doc), o = s.indexOf(e.doc.key)), {
                        type: Vr(e.type),
                        doc: i,
                        oldIndex: r,
                        newIndex: o
                    };
                });
            }
        }(this.f_, e, this.T_.bind(this)), this.w_ = e), this.d_;
    }
    /** Check the equality. The call can be very expensive. */    isEqual(t) {
        if (!(t instanceof mr)) throw _i("isEqual", "QuerySnapshot", 1, t);
        return this.e_ === t.e_ && Rn(this.__, t.__) && this.f_.isEqual(t.f_) && this.Kc === t.Kc;
    }
    T_(t, e, n) {
        return new ur(this.e_, t.key, t, e, n, this.Kc);
    }
}

class Er extends Tr {
    constructor(t, e, n) {
        if (super(fn(t), e, n), this.m_ = t, t.length % 2 != 1) throw new x(k.INVALID_ARGUMENT, `Invalid collection reference. Collection references must have an odd number of segments, but ${t.N()} has ${t.length}`);
    }
    get id() {
        return this.c_.path.S();
    }
    get parent() {
        const t = this.c_.path.g();
        return t._() ? null : new or(new W(t), this.firestore, 
        /* converter= */ null);
    }
    get path() {
        return this.c_.path.N();
    }
    doc(t) {
        Zs("CollectionReference.doc", arguments, 0, 1), 
        // We allow omission of 'pathString' but explicitly prohibit passing in both
        // 'undefined' and 'null'.
        0 === arguments.length && (t = g.t()), ti("CollectionReference.doc", "non-empty string", 1, t);
        const e = q.$(t);
        return or.Zl(this.c_.path.child(e), this.firestore, this.Kc);
    }
    add(t) {
        Xs("CollectionReference.add", arguments, 1);
        ti("CollectionReference.add", "object", 1, this.Kc ? this.Kc.toFirestore(t) : t);
        const e = this.doc();
        return e.set(t).then(() => e);
    }
    withConverter(t) {
        return new Er(this.m_, this.firestore, t);
    }
}

function Ir(t, e) {
    if (void 0 === e) return {
        merge: !1
    };
    if (li(t, e, [ "merge", "mergeFields" ]), si(t, "boolean", "merge", e.merge), ii(t, "mergeFields", "a string or a FieldPath", e.mergeFields, t => "string" == typeof t || t instanceof Ii), 
    void 0 !== e.mergeFields && void 0 !== e.merge) throw new x(k.INVALID_ARGUMENT, `Invalid options passed to function ${t}(): You cannot specify both "merge" and "mergeFields".`);
    return e;
}

function Rr(t, e) {
    return void 0 === e ? {} : (li(t, e, [ "serverTimestamps" ]), ri(t, 0, "serverTimestamps", e.serverTimestamps, [ "estimate", "previous", "none" ]), 
    e);
}

function Ar(t, e) {
    ei(t, "object", 1, e), e && (li(t, e, [ "source" ]), ri(t, 0, "source", e.source, [ "default", "server", "cache" ]));
}

function Pr(t, e, n) {
    if (e instanceof Fi) {
        if (e.firestore !== n) throw new x(k.INVALID_ARGUMENT, "Provided document reference is from a different Firestore instance.");
        return e;
    }
    throw _i(t, "DocumentReference", 1, e);
}

function Vr(t) {
    switch (t) {
      case 0 /* Added */ :
        return "added";

      case 2 /* Modified */ :
      case 3 /* Metadata */ :
        return "modified";

      case 1 /* Removed */ :
        return "removed";

      default:
        return P();
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
 */ function yr(t, e, n) {
    let s;
    // Cast to `any` in order to satisfy the union type constraint on
    // toFirestore().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return s = t ? n && (n.merge || n.mergeFields) ? t.toFirestore(e, n) : t.toFirestore(e) : e, 
    s;
}

const pr = {
    Firestore: sr,
    GeoPoint: Ci,
    Timestamp: L,
    Blob: mi,
    Transaction: ir,
    WriteBatch: rr,
    DocumentReference: or,
    DocumentSnapshot: ar,
    Query: Tr,
    QueryDocumentSnapshot: ur,
    QuerySnapshot: mr,
    CollectionReference: Er,
    FieldPath: Ii,
    FieldValue: bi,
    setLogLevel: sr.setLogLevel,
    CACHE_SIZE_UNLIMITED: er
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
 * Registers the memory-only Firestore build for ReactNative with the components
 * framework.
 */
function gr(t) {
    !function(t, e) {
        t.INTERNAL.registerComponent(new w("firestore", t => {
            const n = t.getProvider("app").getImmediate();
            return e(n, t.getProvider("auth-internal"));
        }, "PUBLIC" /* PUBLIC */).setServiceProps(Object.assign({}, pr)));
    }(t, (t, e) => new sr(t, e, new Gs, new Ks)), t.registerVersion("@firebase/firestore", "1.16.3", "rn");
}

gr(t);

export { gr as __PRIVATE_registerFirestore };
//# sourceMappingURL=index.memory.rn.esm2017.js.map
