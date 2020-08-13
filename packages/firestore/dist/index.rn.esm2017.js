import t from "@firebase/app";

import { Logger as e, LogLevel as n } from "@firebase/logger";

import { base64 as s, getUA as i, isMobileCordova as r, isReactNative as o, isElectron as h, isIE as a, isUWP as c, isBrowserExtension as u } from "@firebase/util";

import { XhrIo as l, EventType as _, ErrorCode as f, createWebChannelTransport as d, WebChannel as w } from "@firebase/webchannel-wrapper";

import { Component as T } from "@firebase/component";

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
const E = new e("@firebase/firestore");

// Helper methods are needed because variables can't be exported as read/write
function I() {
    return E.logLevel;
}

function m(t, ...e) {
    if (E.logLevel <= n.DEBUG) {
        const n = e.map(P);
        E.debug("Firestore (7.17.2): " + t, ...n);
    }
}

function A(t, ...e) {
    if (E.logLevel <= n.ERROR) {
        const n = e.map(P);
        E.error("Firestore (7.17.2): " + t, ...n);
    }
}

function R(t, ...e) {
    if (E.logLevel <= n.WARN) {
        const n = e.map(P);
        E.warn("Firestore (7.17.2): " + t, ...n);
    }
}

/**
 * Converts an additional log parameter to a string representation.
 */ function P(t) {
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
 */ function V(t = "Unexpected state") {
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
    const e = "FIRESTORE (7.17.2) INTERNAL ASSERTION FAILED: " + t;
    // NOTE: We don't use FirestoreError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
    throw A(e), new Error(e);
}

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * Messages are stripped in production builds.
 */ function g(t, e) {
    t || V();
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
 */ class b {
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

/** Helper to compare arrays using isEqual(). */ function S(t, e, n) {
    return t.length === e.length && t.every((t, s) => n(t, e[s]));
}

/**
 * Returns the immediate lexicographically-following string. This is useful to
 * construct an inclusive range for indexeddb iterators.
 */ function D(t) {
    // Return the input string, with an additional NUL byte appended.
    return t + "\0";
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
 */ class C {
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
class N {
    constructor(t, e) {
        this.projectId = t, this.database = e || "(default)";
    }
    get i() {
        return "(default)" === this.database;
    }
    isEqual(t) {
        return t instanceof N && t.projectId === this.projectId && t.database === this.database;
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
 */ function F(t) {
    let e = 0;
    for (const n in t) Object.prototype.hasOwnProperty.call(t, n) && e++;
    return e;
}

function k(t, e) {
    for (const n in t) Object.prototype.hasOwnProperty.call(t, n) && e(n, t[n]);
}

function x(t) {
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
        k(this.l, (e, n) => {
            for (const [e, s] of n) t(e, s);
        });
    }
    _() {
        return x(this.l);
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
 */ const M = {
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
 */ class O extends Error {
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
        if (this.seconds = t, this.nanoseconds = e, e < 0) throw new O(M.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (e >= 1e9) throw new O(M.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (t < -62135596800) throw new O(M.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
        // This will break in the year 10,000.
                if (t >= 253402300800) throw new O(M.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
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
 */ class q {
    constructor(t) {
        this.timestamp = t;
    }
    static I(t) {
        return new q(t);
    }
    static min() {
        return new q(new L(0, 0));
    }
    o(t) {
        return this.timestamp.T(t.timestamp);
    }
    isEqual(t) {
        return this.timestamp.isEqual(t.timestamp);
    }
    /** Returns a number representation of the version for use in spec tests. */    m() {
        // Convert to microseconds.
        return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
    }
    toString() {
        return "SnapshotVersion(" + this.timestamp.toString() + ")";
    }
    A() {
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
class B {
    constructor(t, e, n) {
        void 0 === e ? e = 0 : e > t.length && V(), void 0 === n ? n = t.length - e : n > t.length - e && V(), 
        this.segments = t, this.offset = e, this.R = n;
    }
    get length() {
        return this.R;
    }
    isEqual(t) {
        return 0 === B.P(this, t);
    }
    child(t) {
        const e = this.segments.slice(this.offset, this.limit());
        return t instanceof B ? t.forEach(t => {
            e.push(t);
        }) : e.push(t), this.V(e);
    }
    /** The index of one past the last segment of the path. */    limit() {
        return this.offset + this.length;
    }
    g(t) {
        return t = void 0 === t ? 1 : t, this.V(this.segments, this.offset + t, this.length - t);
    }
    p() {
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
    D(t) {
        if (t.length < this.length) return !1;
        for (let e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }
    C(t) {
        if (this.length + 1 !== t.length) return !1;
        for (let e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }
    forEach(t) {
        for (let e = this.offset, n = this.limit(); e < n; e++) t(this.segments[e]);
    }
    N() {
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
 */ class U extends B {
    V(t, e, n) {
        return new U(t, e, n);
    }
    F() {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        return this.N().join("/");
    }
    toString() {
        return this.F();
    }
    /**
     * Creates a resource path from the given slash-delimited string.
     */    static k(t) {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        if (t.indexOf("//") >= 0) throw new O(M.INVALID_ARGUMENT, `Invalid path (${t}). Paths must not contain // in them.`);
        // We may still have an empty segment at the beginning or end if they had a
        // leading or trailing slash (which we allow).
                const e = t.split("/").filter(t => t.length > 0);
        return new U(e);
    }
    static $() {
        return new U([]);
    }
}

const W = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

/** A dot-separated path for navigating sub-objects within a document. */ class Q extends B {
    V(t, e, n) {
        return new Q(t, e, n);
    }
    /**
     * Returns true if the string could be used as a segment in a field path
     * without escaping.
     */    static M(t) {
        return W.test(t);
    }
    F() {
        return this.N().map(t => (t = t.replace("\\", "\\\\").replace("`", "\\`"), Q.M(t) || (t = "`" + t + "`"), 
        t)).join(".");
    }
    toString() {
        return this.F();
    }
    /**
     * Returns true if this field references the key of a document.
     */    O() {
        return 1 === this.length && "__name__" === this.get(0);
    }
    /**
     * The field designating the key of a document.
     */    static L() {
        return new Q([ "__name__" ]);
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
            if (0 === n.length) throw new O(M.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            e.push(n), n = "";
        };
        let r = !1;
        for (;s < t.length; ) {
            const e = t[s];
            if ("\\" === e) {
                if (s + 1 === t.length) throw new O(M.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
                const e = t[s + 1];
                if ("\\" !== e && "." !== e && "`" !== e) throw new O(M.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
                n += e, s += 2;
            } else "`" === e ? (r = !r, s++) : "." !== e || r ? (n += e, s++) : (i(), s++);
        }
        if (i(), r) throw new O(M.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
        return new Q(e);
    }
    static $() {
        return new Q([]);
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
 */ class j {
    constructor(t) {
        this.path = t;
    }
    static B(t) {
        return new j(U.k(t).g(5));
    }
    /** Returns true if the document is in the specified collectionId. */    U(t) {
        return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
    }
    isEqual(t) {
        return null !== t && 0 === U.P(this.path, t.path);
    }
    toString() {
        return this.path.toString();
    }
    static P(t, e) {
        return U.P(t.path, e.path);
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
        return new j(new U(t.slice()));
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
 */ function K(t) {
    return null == t;
}

/** Returns whether the value represents -0. */ function G(t) {
    // Detect if the value is -0.0. Based on polyfill from
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
    return -0 === t && 1 / t == -1 / 0;
}

/**
 * Returns whether a value is an integer and in the safe integer range
 * @param value The value to test for being an integer and in the safe range
 */ function z(t) {
    return "number" == typeof t && Number.isInteger(t) && !G(t) && t <= Number.MAX_SAFE_INTEGER && t >= Number.MIN_SAFE_INTEGER;
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
// Visible for testing
class H {
    constructor(t, e = null, n = [], s = [], i = null, r = null, o = null) {
        this.path = t, this.collectionGroup = e, this.orderBy = n, this.filters = s, this.limit = i, 
        this.startAt = r, this.endAt = o, this.K = null;
    }
}

/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */ function Y(t, e = null, n = [], s = [], i = null, r = null, o = null) {
    return new H(t, e, n, s, i, r, o);
}

function J(t) {
    const e = y(t);
    if (null === e.K) {
        let t = e.path.F();
        null !== e.collectionGroup && (t += "|cg:" + e.collectionGroup), t += "|f:", t += e.filters.map(t => Ln(t)).join(","), 
        t += "|ob:", t += e.orderBy.map(t => {
            return (e = t).field.F() + e.dir;
            var e;
        }).join(","), K(e.limit) || (t += "|l:", t += e.limit), e.startAt && (t += "|lb:", 
        t += Hn(e.startAt)), e.endAt && (t += "|ub:", t += Hn(e.endAt)), e.K = t;
    }
    return e.K;
}

function X(t) {
    let e = t.path.F();
    return null !== t.collectionGroup && (e += " collectionGroup=" + t.collectionGroup), 
    t.filters.length > 0 && (e += `, filters: [${t.filters.map(t => {
        return `${(e = t).field.F()} ${e.op} ${Qt(e.value)}`;
        /** Returns a debug description for `filter`. */
        var e;
        /** Filter that matches on key fields (i.e. '__name__'). */    }).join(", ")}]`), 
    K(t.limit) || (e += ", limit: " + t.limit), t.orderBy.length > 0 && (e += `, orderBy: [${t.orderBy.map(t => {
        return `${(e = t).field.F()} (${e.dir})`;
        var e;
    }).join(", ")}]`), t.startAt && (e += ", startAt: " + Hn(t.startAt)), t.endAt && (e += ", endAt: " + Hn(t.endAt)), 
    `Target(${e})`;
}

function Z(t, e) {
    if (t.limit !== e.limit) return !1;
    if (t.orderBy.length !== e.orderBy.length) return !1;
    for (let n = 0; n < t.orderBy.length; n++) if (!ts(t.orderBy[n], e.orderBy[n])) return !1;
    if (t.filters.length !== e.filters.length) return !1;
    for (let i = 0; i < t.filters.length; i++) if (n = t.filters[i], s = e.filters[i], 
    n.op !== s.op || !n.field.isEqual(s.field) || !qt(n.value, s.value)) return !1;
    var n, s;
    return t.collectionGroup === e.collectionGroup && (!!t.path.isEqual(e.path) && (!!Jn(t.startAt, e.startAt) && Jn(t.endAt, e.endAt)));
}

function tt(t) {
    return j.W(t.path) && null === t.collectionGroup && 0 === t.filters.length;
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
function et(t) {
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
class nt {
    constructor(t) {
        this.G = t;
    }
    static fromBase64String(t) {
        const e = et(t);
        return new nt(e);
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
        return new nt(e);
    }
    toBase64() {
        return function(t) {
            const e = [];
            for (let n = 0; n < t.length; n++) e[n] = t.charCodeAt(n);
            return s.encodeByteArray(e, !1);
        }(this.G);
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
 */ (this.G);
    }
    H() {
        return 2 * this.G.length;
    }
    o(t) {
        return v(this.G, t.G);
    }
    isEqual(t) {
        return this.G === t.G;
    }
}

nt.Y = new nt("");

class st {
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
    i = q.min()
    /**
     * The maximum snapshot version at which the associated view
     * contained no limbo documents.
     */ , r = q.min()
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */ , o = nt.Y) {
        this.target = t, this.targetId = e, this.J = n, this.sequenceNumber = s, this.X = i, 
        this.lastLimboFreeSnapshotVersion = r, this.resumeToken = o;
    }
    /** Creates a new target data instance with an updated sequence number. */    Z(t) {
        return new st(this.target, this.targetId, this.J, t, this.X, this.lastLimboFreeSnapshotVersion, this.resumeToken);
    }
    /**
     * Creates a new target data instance with an updated resume token and
     * snapshot version.
     */    tt(t, e) {
        return new st(this.target, this.targetId, this.J, this.sequenceNumber, e, this.lastLimboFreeSnapshotVersion, t);
    }
    /**
     * Creates a new target data instance with an updated last limbo free
     * snapshot version number.
     */    et(t) {
        return new st(this.target, this.targetId, this.J, this.sequenceNumber, this.X, t, this.resumeToken);
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
 */ class it {
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
 */ var rt, ot;

/**
 * Determines whether an error code represents a permanent error when received
 * in response to a non-write operation.
 *
 * See isPermanentWriteError for classifying write errors.
 */
function ht(t) {
    switch (t) {
      case M.OK:
        return V();

      case M.CANCELLED:
      case M.UNKNOWN:
      case M.DEADLINE_EXCEEDED:
      case M.RESOURCE_EXHAUSTED:
      case M.INTERNAL:
      case M.UNAVAILABLE:
 // Unauthenticated means something went wrong with our token and we need
        // to retry with new credentials which will happen automatically.
              case M.UNAUTHENTICATED:
        return !1;

      case M.INVALID_ARGUMENT:
      case M.NOT_FOUND:
      case M.ALREADY_EXISTS:
      case M.PERMISSION_DENIED:
      case M.FAILED_PRECONDITION:
 // Aborted might be retried in some scenarios, but that is dependant on
        // the context and should handled individually by the calling code.
        // See https://cloud.google.com/apis/design/errors.
              case M.ABORTED:
      case M.OUT_OF_RANGE:
      case M.UNIMPLEMENTED:
      case M.DATA_LOSS:
        return !0;

      default:
        return V();
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
function at(t) {
    if (void 0 === t) 
    // This shouldn't normally happen, but in certain error cases (like trying
    // to send invalid proto messages) we may get an error with no GRPC code.
    return A("GRPC error has no .code"), M.UNKNOWN;
    switch (t) {
      case rt.OK:
        return M.OK;

      case rt.CANCELLED:
        return M.CANCELLED;

      case rt.UNKNOWN:
        return M.UNKNOWN;

      case rt.DEADLINE_EXCEEDED:
        return M.DEADLINE_EXCEEDED;

      case rt.RESOURCE_EXHAUSTED:
        return M.RESOURCE_EXHAUSTED;

      case rt.INTERNAL:
        return M.INTERNAL;

      case rt.UNAVAILABLE:
        return M.UNAVAILABLE;

      case rt.UNAUTHENTICATED:
        return M.UNAUTHENTICATED;

      case rt.INVALID_ARGUMENT:
        return M.INVALID_ARGUMENT;

      case rt.NOT_FOUND:
        return M.NOT_FOUND;

      case rt.ALREADY_EXISTS:
        return M.ALREADY_EXISTS;

      case rt.PERMISSION_DENIED:
        return M.PERMISSION_DENIED;

      case rt.FAILED_PRECONDITION:
        return M.FAILED_PRECONDITION;

      case rt.ABORTED:
        return M.ABORTED;

      case rt.OUT_OF_RANGE:
        return M.OUT_OF_RANGE;

      case rt.UNIMPLEMENTED:
        return M.UNIMPLEMENTED;

      case rt.DATA_LOSS:
        return M.DATA_LOSS;

      default:
        return V();
    }
}

/**
 * Converts an HTTP response's error status to the equivalent error code.
 *
 * @param status An HTTP error response status ("FAILED_PRECONDITION",
 * "UNKNOWN", etc.)
 * @returns The equivalent Code. Non-matching responses are mapped to
 *     Code.UNKNOWN.
 */ (ot = rt || (rt = {}))[ot.OK = 0] = "OK", ot[ot.CANCELLED = 1] = "CANCELLED", 
ot[ot.UNKNOWN = 2] = "UNKNOWN", ot[ot.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", 
ot[ot.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", ot[ot.NOT_FOUND = 5] = "NOT_FOUND", 
ot[ot.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", ot[ot.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
ot[ot.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", ot[ot.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
ot[ot.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", ot[ot.ABORTED = 10] = "ABORTED", 
ot[ot.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", ot[ot.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
ot[ot.INTERNAL = 13] = "INTERNAL", ot[ot.UNAVAILABLE = 14] = "UNAVAILABLE", ot[ot.DATA_LOSS = 15] = "DATA_LOSS";

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
class ct {
    constructor(t, e) {
        this.P = t, this.root = e || lt.EMPTY;
    }
    // Returns a copy of the map, with the specified key/value added or replaced.
    nt(t, e) {
        return new ct(this.P, this.root.nt(t, e, this.P).copy(null, null, lt.st, null, null));
    }
    // Returns a copy of the map, with the specified key removed.
    remove(t) {
        return new ct(this.P, this.root.remove(t, this.P).copy(null, null, lt.st, null, null));
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
        return new ut(this.root, null, this.P, !1);
    }
    ct(t) {
        return new ut(this.root, t, this.P, !1);
    }
    ut() {
        return new ut(this.root, null, this.P, !0);
    }
    lt(t) {
        return new ut(this.root, t, this.P, !0);
    }
}

 // end SortedMap
// An iterator over an LLRBNode.
class ut {
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
class lt {
    constructor(t, e, n, s, i) {
        this.key = t, this.value = e, this.color = null != n ? n : lt.RED, this.left = null != s ? s : lt.EMPTY, 
        this.right = null != i ? i : lt.EMPTY, this.size = this.left.size + 1 + this.right.size;
    }
    // Returns a copy of the current node, optionally replacing pieces of it.
    copy(t, e, n, s, i) {
        return new lt(null != t ? t : this.key, null != e ? e : this.value, null != n ? n : this.color, null != s ? s : this.left, null != i ? i : this.right);
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
        if (this.left._()) return lt.EMPTY;
        let t = this;
        return t.left.At() || t.left.left.At() || (t = t.Rt()), t = t.copy(null, null, null, t.left.It(), null), 
        t.Et();
    }
    // Returns new tree, with the specified item removed.
    remove(t, e) {
        let n, s = this;
        if (e(t, s.key) < 0) s.left._() || s.left.At() || s.left.left.At() || (s = s.Rt()), 
        s = s.copy(null, null, null, s.left.remove(t, e), null); else {
            if (s.left.At() && (s = s.Pt()), s.right._() || s.right.At() || s.right.left.At() || (s = s.Vt()), 
            0 === e(t, s.key)) {
                if (s.right._()) return lt.EMPTY;
                n = s.right.min(), s = s.copy(n.key, n.value, null, null, s.right.It());
            }
            s = s.copy(null, null, null, null, s.right.remove(t, e));
        }
        return s.Et();
    }
    At() {
        return this.color;
    }
    // Returns new tree after performing any needed rotations.
    Et() {
        let t = this;
        return t.right.At() && !t.left.At() && (t = t.gt()), t.left.At() && t.left.left.At() && (t = t.Pt()), 
        t.left.At() && t.right.At() && (t = t.yt()), t;
    }
    Rt() {
        let t = this.yt();
        return t.right.left.At() && (t = t.copy(null, null, null, null, t.right.Pt()), t = t.gt(), 
        t = t.yt()), t;
    }
    Vt() {
        let t = this.yt();
        return t.left.left.At() && (t = t.Pt(), t = t.yt()), t;
    }
    gt() {
        const t = this.copy(null, null, lt.RED, null, this.right.left);
        return this.right.copy(null, null, this.color, t, null);
    }
    Pt() {
        const t = this.copy(null, null, lt.RED, this.left.right, null);
        return this.left.copy(null, null, this.color, null, t);
    }
    yt() {
        const t = this.left.copy(null, null, !this.left.color, null, null), e = this.right.copy(null, null, !this.right.color, null, null);
        return this.copy(null, null, !this.color, t, e);
    }
    // For testing.
    pt() {
        const t = this.bt();
        return Math.pow(2, t) <= this.size + 1;
    }
    // In a balanced RB tree, the black-depth (number of black nodes) from root to
    // leaves is equal on both sides.  This function verifies that or asserts.
    bt() {
        if (this.At() && this.left.At()) throw V();
        if (this.right.At()) throw V();
        const t = this.left.bt();
        if (t !== this.right.bt()) throw V();
        return t + (this.At() ? 0 : 1);
    }
}

 // end LLRBNode
// Empty node is shared between all LLRB trees.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
lt.EMPTY = null, lt.RED = !0, lt.st = !1;

// end LLRBEmptyNode
lt.EMPTY = new 
// Represents an empty node (a leaf node in the Red-Black Tree).
class {
    constructor() {
        this.size = 0;
    }
    get key() {
        throw V();
    }
    get value() {
        throw V();
    }
    get color() {
        throw V();
    }
    get left() {
        throw V();
    }
    get right() {
        throw V();
    }
    // Returns a copy of the current node.
    copy(t, e, n, s, i) {
        return this;
    }
    // Returns a copy of the tree, with the specified key/value added.
    nt(t, e, n) {
        return new lt(t, e);
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
    At() {
        return !1;
    }
    // For testing.
    pt() {
        return !0;
    }
    bt() {
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
class _t {
    constructor(t) {
        this.P = t, this.data = new ct(this.P);
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
    /** Iterates over `elem`s such that: range[0] <= elem < range[1]. */    vt(t, e) {
        const n = this.data.ct(t[0]);
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
        for (n = void 0 !== e ? this.data.ct(e) : this.data.at(); n.wt(); ) {
            if (!t(n.dt().key)) return;
        }
    }
    /** Finds the least element greater than or equal to `elem`. */    Dt(t) {
        const e = this.data.ct(t);
        return e.wt() ? e.dt().key : null;
    }
    at() {
        return new ft(this.data.at());
    }
    ct(t) {
        return new ft(this.data.ct(t));
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
    Ct(t) {
        let e = this;
        // Make sure `result` always refers to the larger one of the two sets.
                return e.size < t.size && (e = t, t = this), t.forEach(t => {
            e = e.add(t);
        }), e;
    }
    isEqual(t) {
        if (!(t instanceof _t)) return !1;
        if (this.size !== t.size) return !1;
        const e = this.data.at(), n = t.data.at();
        for (;e.wt(); ) {
            const t = e.dt().key, s = n.dt().key;
            if (0 !== this.P(t, s)) return !1;
        }
        return !0;
    }
    N() {
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
        const e = new _t(this.P);
        return e.data = t, e;
    }
}

class ft {
    constructor(t) {
        this.Nt = t;
    }
    dt() {
        return this.Nt.dt().key;
    }
    wt() {
        return this.Nt.wt();
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
 */ const dt = new ct(j.P);

function wt() {
    return dt;
}

function Tt() {
    return wt();
}

const Et = new ct(j.P);

function It() {
    return Et;
}

const mt = new ct(j.P);

const At = new _t(j.P);

function Rt(...t) {
    let e = At;
    for (const n of t) e = e.add(n);
    return e;
}

const Pt = new _t(v);

function Vt() {
    return Pt;
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
 */ class gt {
    /** The default ordering is by key if the comparator is omitted */
    constructor(t) {
        // We are adding document key comparator to the end as it's the only
        // guaranteed unique property of a document.
        this.P = t ? (e, n) => t(e, n) || j.P(e.key, n.key) : (t, e) => j.P(t.key, e.key), 
        this.Ft = It(), this.kt = new ct(this.P);
    }
    /**
     * Returns an empty copy of the existing DocumentSet, using the same
     * comparator.
     */    static xt(t) {
        return new gt(t.P);
    }
    has(t) {
        return null != this.Ft.get(t);
    }
    get(t) {
        return this.Ft.get(t);
    }
    first() {
        return this.kt.it();
    }
    last() {
        return this.kt.rt();
    }
    _() {
        return this.kt._();
    }
    /**
     * Returns the index of the provided key in the document set, or -1 if the
     * document key is not present in the set;
     */    indexOf(t) {
        const e = this.Ft.get(t);
        return e ? this.kt.indexOf(e) : -1;
    }
    get size() {
        return this.kt.size;
    }
    /** Iterates documents in order defined by "comparator" */    forEach(t) {
        this.kt.ot((e, n) => (t(e), !1));
    }
    /** Inserts or updates a document with the same key */    add(t) {
        // First remove the element if we have it.
        const e = this.delete(t.key);
        return e.copy(e.Ft.nt(t.key, t), e.kt.nt(t, null));
    }
    /** Deletes a document with a given key */    delete(t) {
        const e = this.get(t);
        return e ? this.copy(this.Ft.remove(t), this.kt.remove(e)) : this;
    }
    isEqual(t) {
        if (!(t instanceof gt)) return !1;
        if (this.size !== t.size) return !1;
        const e = this.kt.at(), n = t.kt.at();
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
        const n = new gt;
        return n.P = this.P, n.Ft = t, n.kt = e, n;
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
 */ class yt {
    constructor() {
        this.$t = new ct(j.P);
    }
    track(t) {
        const e = t.doc.key, n = this.$t.get(e);
        n ? 
        // Merge the new change with the existing change.
        0 /* Added */ !== t.type && 3 /* Metadata */ === n.type ? this.$t = this.$t.nt(e, t) : 3 /* Metadata */ === t.type && 1 /* Removed */ !== n.type ? this.$t = this.$t.nt(e, {
            type: n.type,
            doc: t.doc
        }) : 2 /* Modified */ === t.type && 2 /* Modified */ === n.type ? this.$t = this.$t.nt(e, {
            type: 2 /* Modified */ ,
            doc: t.doc
        }) : 2 /* Modified */ === t.type && 0 /* Added */ === n.type ? this.$t = this.$t.nt(e, {
            type: 0 /* Added */ ,
            doc: t.doc
        }) : 1 /* Removed */ === t.type && 0 /* Added */ === n.type ? this.$t = this.$t.remove(e) : 1 /* Removed */ === t.type && 2 /* Modified */ === n.type ? this.$t = this.$t.nt(e, {
            type: 1 /* Removed */ ,
            doc: n.doc
        }) : 0 /* Added */ === t.type && 1 /* Removed */ === n.type ? this.$t = this.$t.nt(e, {
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
        V() : this.$t = this.$t.nt(e, t);
    }
    Mt() {
        const t = [];
        return this.$t.ot((e, n) => {
            t.push(n);
        }), t;
    }
}

class pt {
    constructor(t, e, n, s, i, r, o, h) {
        this.query = t, this.docs = e, this.Ot = n, this.docChanges = s, this.Lt = i, this.fromCache = r, 
        this.qt = o, this.Bt = h;
    }
    /** Returns a view snapshot as if all documents in the snapshot were added. */    static Ut(t, e, n, s) {
        const i = [];
        return e.forEach(t => {
            i.push({
                type: 0 /* Added */ ,
                doc: t
            });
        }), new pt(t, e, gt.xt(e), i, n, s, 
        /* syncStateChanged= */ !0, 
        /* excludesMetadataChanges= */ !1);
    }
    get hasPendingWrites() {
        return !this.Lt._();
    }
    isEqual(t) {
        if (!(this.fromCache === t.fromCache && this.qt === t.qt && this.Lt.isEqual(t.Lt) && Fn(this.query, t.query) && this.docs.isEqual(t.docs) && this.Ot.isEqual(t.Ot))) return !1;
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
 */ class bt {
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
        this.X = t, this.Wt = e, this.Qt = n, this.jt = s, this.Kt = i;
    }
    /**
     * HACK: Views require RemoteEvents in order to determine whether the view is
     * CURRENT, but secondary tabs don't receive remote events. So this method is
     * used to create a synthesized RemoteEvent that can be used to apply a
     * CURRENT status change to a View, for queries executed in a different tab.
     */
    // PORTING NOTE: Multi-tab only
    static Gt(t, e) {
        const n = new Map;
        return n.set(t, vt.zt(t, e)), new bt(q.min(), n, Vt(), wt(), Rt());
    }
}

/**
 * A TargetChange specifies the set of changes for a specific target as part of
 * a RemoteEvent. These changes track which documents are added, modified or
 * removed, as well as the target's resume token and whether the target is
 * marked CURRENT.
 * The actual changes *to* documents are not part of the TargetChange since
 * documents may be part of multiple targets.
 */ class vt {
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
        this.resumeToken = t, this.Ht = e, this.Yt = n, this.Jt = s, this.Xt = i;
    }
    /**
     * This method is used to create a synthesized TargetChanges that can be used to
     * apply a CURRENT status change to a View (for queries executed in a different
     * tab) or for new queries (to raise snapshots with correct CURRENT status).
     */    static zt(t, e) {
        return new vt(nt.Y, e, Rt(), Rt(), Rt());
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
 */ class St {
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

class Dt {
    constructor(t, e) {
        this.targetId = t, this.ee = e;
    }
}

class Ct {
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
    n = nt.Y
    /** An RPC error indicating why the watch failed. */ , s = null) {
        this.state = t, this.targetIds = e, this.resumeToken = n, this.cause = s;
    }
}

/** Tracks the internal state of a Watch target. */ class Nt {
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
        this.se = xt(), 
        /** See public getters for explanations of these fields. */
        this.ie = nt.Y, this.re = !1, 
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
     */    ce(t) {
        t.H() > 0 && (this.oe = !0, this.ie = t);
    }
    /**
     * Creates a target change from the current set of changes.
     *
     * To reset the document changes after raising this snapshot, call
     * `clearPendingChanges()`.
     */    ue() {
        let t = Rt(), e = Rt(), n = Rt();
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
                V();
            }
        }), new vt(this.ie, this.re, t, e, n);
    }
    /**
     * Resets the document changes and sets `hasPendingChanges` to false.
     */    le() {
        this.oe = !1, this.se = xt();
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
class Ft {
    constructor(t) {
        this.Ee = t, 
        /** The internal state of all tracked targets. */
        this.Ie = new Map, 
        /** Keeps track of the documents to update since the last raised snapshot. */
        this.me = wt(), 
        /** A mapping of document keys to their set of target IDs. */
        this.Ae = kt(), 
        /**
         * A list of targets with existence filter mismatches. These targets are
         * known to be inconsistent and their listens needs to be re-established by
         * RemoteStore.
         */
        this.Re = new _t(v);
    }
    /**
     * Processes and adds the DocumentWatchChange to the current set of changes.
     */    Pe(t) {
        for (const e of t.Zt) t.te instanceof An ? this.Ve(e, t.te) : t.te instanceof Rn && this.ge(e, t.key, t.te);
        for (const e of t.removedTargetIds) this.ge(e, t.key, t.te);
    }
    /** Processes and adds the WatchTargetChange to the current set of changes. */    ye(t) {
        this.pe(t, e => {
            const n = this.be(e);
            switch (t.state) {
              case 0 /* NoChange */ :
                this.ve(e) && n.ce(t.resumeToken);
                break;

              case 1 /* Added */ :
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                n.we(), n.he || 
                // We have a freshly added target, so we need to reset any state
                // that we had previously. This can happen e.g. when remove and add
                // back a target for existence filter mismatches.
                n.le(), n.ce(t.resumeToken);
                break;

              case 2 /* Removed */ :
                // We need to keep track of removed targets to we can post-filter and
                // remove any target changes.
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                n.we(), n.he || this.removeTarget(e);
                break;

              case 3 /* Current */ :
                this.ve(e) && (n.Te(), n.ce(t.resumeToken));
                break;

              case 4 /* Reset */ :
                this.ve(e) && (
                // Reset the target and synthesizes removes for all existing
                // documents. The backend will re-add any documents that still
                // match the target before it sends the next global snapshot.
                this.Se(e), n.ce(t.resumeToken));
                break;

              default:
                V();
            }
        });
    }
    /**
     * Iterates over all targetIds that the watch change applies to: either the
     * targetIds explicitly listed in the change or the targetIds of all currently
     * active targets.
     */    pe(t, e) {
        t.targetIds.length > 0 ? t.targetIds.forEach(e) : this.Ie.forEach((t, n) => {
            this.ve(n) && e(n);
        });
    }
    /**
     * Handles existence filters and synthesizes deletes for filter mismatches.
     * Targets that are invalidated by filter mismatches are added to
     * `pendingTargetResets`.
     */    De(t) {
        const e = t.targetId, n = t.ee.count, s = this.Ce(e);
        if (s) {
            const t = s.target;
            if (tt(t)) if (0 === n) {
                // The existence filter told us the document does not exist. We deduce
                // that this document does not exist and apply a deleted document to
                // our updates. Without applying this deleted document there might be
                // another query that will raise this document as part of a snapshot
                // until it is resolved, essentially exposing inconsistency between
                // queries.
                const n = new j(t.path);
                this.ge(e, n, new Rn(n, q.min()));
            } else g(1 === n); else {
                this.Ne(e) !== n && (
                // Existence filter mismatch: We reset the mapping and raise a new
                // snapshot with `isFromCache:true`.
                this.Se(e), this.Re = this.Re.add(e));
            }
        }
    }
    /**
     * Converts the currently accumulated state into a remote event at the
     * provided snapshot version. Resets the accumulated changes before returning.
     */    Fe(t) {
        const e = new Map;
        this.Ie.forEach((n, s) => {
            const i = this.Ce(s);
            if (i) {
                if (n.Ht && tt(i.target)) {
                    // Document queries for document that don't exist can produce an empty
                    // result set. To update our local cache, we synthesize a document
                    // delete if we have not previously received the document. This
                    // resolves the limbo state of the document, removing it from
                    // limboDocumentRefs.
                    // TODO(dimond): Ideally we would have an explicit lookup target
                    // instead resulting in an explicit delete message and we could
                    // remove this special logic.
                    const e = new j(i.target.path);
                    null !== this.me.get(e) || this.ke(s, e) || this.ge(s, e, new Rn(e, t));
                }
                n.ae && (e.set(s, n.ue()), n.le());
            }
        });
        let n = Rt();
        // We extract the set of limbo-only document updates as the GC logic
        // special-cases documents that do not appear in the target cache.
        
        // TODO(gsoltis): Expand on this comment once GC is available in the JS
        // client.
                this.Ae.forEach((t, e) => {
            let s = !0;
            e.St(t => {
                const e = this.Ce(t);
                return !e || 2 /* LimboResolution */ === e.J || (s = !1, !1);
            }), s && (n = n.add(t));
        });
        const s = new bt(t, e, this.Re, this.me, n);
        return this.me = wt(), this.Ae = kt(), this.Re = new _t(v), s;
    }
    /**
     * Adds the provided document to the internal list of document updates and
     * its document key to the given target's mapping.
     */
    // Visible for testing.
    Ve(t, e) {
        if (!this.ve(t)) return;
        const n = this.ke(t, e.key) ? 2 /* Modified */ : 0 /* Added */;
        this.be(t)._e(e.key, n), this.me = this.me.nt(e.key, e), this.Ae = this.Ae.nt(e.key, this.xe(e.key).add(t));
    }
    /**
     * Removes the provided document from the target mapping. If the
     * document no longer matches the target, but the document's state is still
     * known (e.g. we know that the document was deleted or we received the change
     * that caused the filter mismatch), the new document can be provided
     * to update the remote document cache.
     */
    // Visible for testing.
    ge(t, e, n) {
        if (!this.ve(t)) return;
        const s = this.be(t);
        this.ke(t, e) ? s._e(e, 1 /* Removed */) : 
        // The document may have entered and left the target before we raised a
        // snapshot, so we can just ignore the change.
        s.fe(e), this.Ae = this.Ae.nt(e, this.xe(e).delete(t)), n && (this.me = this.me.nt(e, n));
    }
    removeTarget(t) {
        this.Ie.delete(t);
    }
    /**
     * Returns the current count of documents in the target. This includes both
     * the number of documents that the LocalStore considers to be part of the
     * target as well as any accumulated changes.
     */    Ne(t) {
        const e = this.be(t).ue();
        return this.Ee.$e(t).size + e.Yt.size - e.Xt.size;
    }
    /**
     * Increment the number of acks needed from watch before we can consider the
     * server to be 'in-sync' with the client's active targets.
     */    de(t) {
        this.be(t).de();
    }
    be(t) {
        let e = this.Ie.get(t);
        return e || (e = new Nt, this.Ie.set(t, e)), e;
    }
    xe(t) {
        let e = this.Ae.get(t);
        return e || (e = new _t(v), this.Ae = this.Ae.nt(t, e)), e;
    }
    /**
     * Verifies that the user is still interested in this target (by calling
     * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
     * from watch.
     */    ve(t) {
        const e = null !== this.Ce(t);
        return e || m("WatchChangeAggregator", "Detected inactive target", t), e;
    }
    /**
     * Returns the TargetData for an active target (i.e. a target that the user
     * is still interested in that has no outstanding target change requests).
     */    Ce(t) {
        const e = this.Ie.get(t);
        return e && e.he ? null : this.Ee.Me(t);
    }
    /**
     * Resets the state of a Watch target to its initial state (e.g. sets
     * 'current' to false, clears the resume token and removes its target mapping
     * from all documents).
     */    Se(t) {
        this.Ie.set(t, new Nt);
        this.Ee.$e(t).forEach(e => {
            this.ge(t, e, /*updatedDocument=*/ null);
        });
    }
    /**
     * Returns whether the LocalStore considers the document to be part of the
     * specified target.
     */    ke(t, e) {
        return this.Ee.$e(t).has(e);
    }
}

function kt() {
    return new ct(j.P);
}

function xt() {
    return new ct(j.P);
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
 */ function $t(t) {
    var e, n;
    return "server_timestamp" === (null === (n = ((null === (e = null == t ? void 0 : t.mapValue) || void 0 === e ? void 0 : e.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
}

/**
 * Creates a new ServerTimestamp proto value (using the internal format).
 */
/**
 * Returns the local time at which this timestamp was first set.
 */
function Mt(t) {
    const e = Kt(t.mapValue.fields.__local_write_time__.timestampValue);
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
const Ot = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

/** Extracts the backend's type order for the provided value. */ function Lt(t) {
    return "nullValue" in t ? 0 /* NullValue */ : "booleanValue" in t ? 1 /* BooleanValue */ : "integerValue" in t || "doubleValue" in t ? 2 /* NumberValue */ : "timestampValue" in t ? 3 /* TimestampValue */ : "stringValue" in t ? 5 /* StringValue */ : "bytesValue" in t ? 6 /* BlobValue */ : "referenceValue" in t ? 7 /* RefValue */ : "geoPointValue" in t ? 8 /* GeoPointValue */ : "arrayValue" in t ? 9 /* ArrayValue */ : "mapValue" in t ? $t(t) ? 4 /* ServerTimestampValue */ : 10 /* ObjectValue */ : V();
}

/** Tests `left` and `right` for equality based on the backend semantics. */ function qt(t, e) {
    const n = Lt(t);
    if (n !== Lt(e)) return !1;
    switch (n) {
      case 0 /* NullValue */ :
        return !0;

      case 1 /* BooleanValue */ :
        return t.booleanValue === e.booleanValue;

      case 4 /* ServerTimestampValue */ :
        return Mt(t).isEqual(Mt(e));

      case 3 /* TimestampValue */ :
        return function(t, e) {
            if ("string" == typeof t.timestampValue && "string" == typeof e.timestampValue && t.timestampValue.length === e.timestampValue.length) 
            // Use string equality for ISO 8601 timestamps
            return t.timestampValue === e.timestampValue;
            const n = Kt(t.timestampValue), s = Kt(e.timestampValue);
            return n.seconds === s.seconds && n.nanos === s.nanos;
        }(t, e);

      case 5 /* StringValue */ :
        return t.stringValue === e.stringValue;

      case 6 /* BlobValue */ :
        return function(t, e) {
            return zt(t.bytesValue).isEqual(zt(e.bytesValue));
        }(t, e);

      case 7 /* RefValue */ :
        return t.referenceValue === e.referenceValue;

      case 8 /* GeoPointValue */ :
        return function(t, e) {
            return Gt(t.geoPointValue.latitude) === Gt(e.geoPointValue.latitude) && Gt(t.geoPointValue.longitude) === Gt(e.geoPointValue.longitude);
        }(t, e);

      case 2 /* NumberValue */ :
        return function(t, e) {
            if ("integerValue" in t && "integerValue" in e) return Gt(t.integerValue) === Gt(e.integerValue);
            if ("doubleValue" in t && "doubleValue" in e) {
                const n = Gt(t.doubleValue), s = Gt(e.doubleValue);
                return n === s ? G(n) === G(s) : isNaN(n) && isNaN(s);
            }
            return !1;
        }(t, e);

      case 9 /* ArrayValue */ :
        return S(t.arrayValue.values || [], e.arrayValue.values || [], qt);

      case 10 /* ObjectValue */ :
        return function(t, e) {
            const n = t.mapValue.fields || {}, s = e.mapValue.fields || {};
            if (F(n) !== F(s)) return !1;
            for (const t in n) if (n.hasOwnProperty(t) && (void 0 === s[t] || !qt(n[t], s[t]))) return !1;
            return !0;
        }
        /** Returns true if the ArrayValue contains the specified element. */ (t, e);

      default:
        return V();
    }
}

function Bt(t, e) {
    return void 0 !== (t.values || []).find(t => qt(t, e));
}

function Ut(t, e) {
    const n = Lt(t), s = Lt(e);
    if (n !== s) return v(n, s);
    switch (n) {
      case 0 /* NullValue */ :
        return 0;

      case 1 /* BooleanValue */ :
        return v(t.booleanValue, e.booleanValue);

      case 2 /* NumberValue */ :
        return function(t, e) {
            const n = Gt(t.integerValue || t.doubleValue), s = Gt(e.integerValue || e.doubleValue);
            return n < s ? -1 : n > s ? 1 : n === s ? 0 : 
            // one or both are NaN.
            isNaN(n) ? isNaN(s) ? 0 : -1 : 1;
        }(t, e);

      case 3 /* TimestampValue */ :
        return Wt(t.timestampValue, e.timestampValue);

      case 4 /* ServerTimestampValue */ :
        return Wt(Mt(t), Mt(e));

      case 5 /* StringValue */ :
        return v(t.stringValue, e.stringValue);

      case 6 /* BlobValue */ :
        return function(t, e) {
            const n = zt(t), s = zt(e);
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
            const n = v(Gt(t.latitude), Gt(e.latitude));
            if (0 !== n) return n;
            return v(Gt(t.longitude), Gt(e.longitude));
        }(t.geoPointValue, e.geoPointValue);

      case 9 /* ArrayValue */ :
        return function(t, e) {
            const n = t.values || [], s = e.values || [];
            for (let t = 0; t < n.length && t < s.length; ++t) {
                const e = Ut(n[t], s[t]);
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
                const o = Ut(n[s[t]], i[r[t]]);
                if (0 !== o) return o;
            }
            return v(s.length, r.length);
        }
        /**
 * Generates the canonical ID for the provided field value (as used in Target
 * serialization).
 */ (t.mapValue, e.mapValue);

      default:
        throw V();
    }
}

function Wt(t, e) {
    if ("string" == typeof t && "string" == typeof e && t.length === e.length) return v(t, e);
    const n = Kt(t), s = Kt(e), i = v(n.seconds, s.seconds);
    return 0 !== i ? i : v(n.nanos, s.nanos);
}

function Qt(t) {
    return jt(t);
}

function jt(t) {
    return "nullValue" in t ? "null" : "booleanValue" in t ? "" + t.booleanValue : "integerValue" in t ? "" + t.integerValue : "doubleValue" in t ? "" + t.doubleValue : "timestampValue" in t ? function(t) {
        const e = Kt(t);
        return `time(${e.seconds},${e.nanos})`;
    }(t.timestampValue) : "stringValue" in t ? t.stringValue : "bytesValue" in t ? zt(t.bytesValue).toBase64() : "referenceValue" in t ? (n = t.referenceValue, 
    j.B(n).toString()) : "geoPointValue" in t ? `geo(${(e = t.geoPointValue).latitude},${e.longitude})` : "arrayValue" in t ? function(t) {
        let e = "[", n = !0;
        for (const s of t.values || []) n ? n = !1 : e += ",", e += jt(s);
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
        for (const i of e) s ? s = !1 : n += ",", n += `${i}:${jt(t.fields[i])}`;
        return n + "}";
    }(t.mapValue) : V();
    var e, n;
}

function Kt(t) {
    // The json interface (for the browser) will return an iso timestamp string,
    // while the proto js library (for node) will return a
    // google.protobuf.Timestamp instance.
    if (g(!!t), "string" == typeof t) {
        // The date string can have higher precision (nanos) than the Date class
        // (millis), so we do some custom parsing here.
        // Parse the nanos right out of the string.
        let e = 0;
        const n = Ot.exec(t);
        if (g(!!n), n[1]) {
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
        seconds: Gt(t.seconds),
        nanos: Gt(t.nanos)
    };
}

/**
 * Converts the possible Proto types for numbers into a JavaScript number.
 * Returns 0 if the value is not numeric.
 */ function Gt(t) {
    // TODO(bjornick): Handle int64 greater than 53 bits.
    return "number" == typeof t ? t : "string" == typeof t ? Number(t) : 0;
}

/** Converts the possible Proto types for Blobs into a ByteString. */ function zt(t) {
    return "string" == typeof t ? nt.fromBase64String(t) : nt.fromUint8Array(t);
}

/** Returns a reference value for the provided database and key. */ function Ht(t, e) {
    return {
        referenceValue: `projects/${t.projectId}/databases/${t.database}/documents/${e.path.F()}`
    };
}

/** Returns true if `value` is an IntegerValue . */ function Yt(t) {
    return !!t && "integerValue" in t;
}

/** Returns true if `value` is a DoubleValue. */
/** Returns true if `value` is an ArrayValue. */
function Jt(t) {
    return !!t && "arrayValue" in t;
}

/** Returns true if `value` is a NullValue. */ function Xt(t) {
    return !!t && "nullValue" in t;
}

/** Returns true if `value` is NaN. */ function Zt(t) {
    return !!t && "doubleValue" in t && isNaN(Number(t.doubleValue));
}

/** Returns true if `value` is a MapValue. */ function te(t) {
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
 */ const ee = (() => {
    const t = {
        asc: "ASCENDING",
        desc: "DESCENDING"
    };
    return t;
})(), ne = (() => {
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
class se {
    constructor(t, e) {
        this.s = t, this.Oe = e;
    }
}

/**
 * Returns an IntegerValue for `value`.
 */
function ie(t) {
    return {
        integerValue: "" + t
    };
}

/**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */ function re(t, e) {
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
        doubleValue: G(e) ? "-0" : e
    };
}

/**
 * Returns a value for a number that's appropriate to put into a proto.
 * The return value is an IntegerValue if it can safely represent the value,
 * otherwise a DoubleValue is returned.
 */ function oe(t, e) {
    return z(e) ? ie(e) : re(t, e);
}

/**
 * Returns a value for a Date that's appropriate to put into a proto.
 */ function he(t, e) {
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
function ae(t, e) {
    return t.Oe ? e.toBase64() : e.toUint8Array();
}

/**
 * Returns a ByteString based on the proto string value.
 */ function ce(t, e) {
    return he(t, e.A());
}

function ue(t) {
    return g(!!t), q.I(function(t) {
        const e = Kt(t);
        return new L(e.seconds, e.nanos);
    }(t));
}

function le(t, e) {
    return function(t) {
        return new U([ "projects", t.projectId, "databases", t.database ]);
    }(t).child("documents").child(e).F();
}

function _e(t) {
    const e = U.k(t);
    return g($e(e)), e;
}

function fe(t, e) {
    return le(t.s, e.path);
}

function de(t, e) {
    const n = _e(e);
    return g(n.get(1) === t.s.projectId), g(!n.get(3) && !t.s.database || n.get(3) === t.s.database), 
    new j(Ie(n));
}

function we(t, e) {
    return le(t.s, e);
}

function Te(t) {
    const e = _e(t);
    // In v1beta1 queries for collections at the root did not have a trailing
    // "/documents". In v1 all resource paths contain "/documents". Preserve the
    // ability to read the v1beta1 form for compatibility with queries persisted
    // in the local target cache.
        return 4 === e.length ? U.$() : Ie(e);
}

function Ee(t) {
    return new U([ "projects", t.s.projectId, "databases", t.s.database ]).F();
}

function Ie(t) {
    return g(t.length > 4 && "documents" === t.get(4)), t.g(5);
}

/** Creates an api.Document from key and fields (but no create/update time) */ function me(t, e, n) {
    return {
        name: fe(t, e),
        fields: n.proto.mapValue.fields
    };
}

function Ae(t, e) {
    return "found" in e ? function(t, e) {
        g(!!e.found), e.found.name, e.found.updateTime;
        const n = de(t, e.found.name), s = ue(e.found.updateTime), i = new Tn({
            mapValue: {
                fields: e.found.fields
            }
        });
        return new An(n, s, i, {});
    }(t, e) : "missing" in e ? function(t, e) {
        g(!!e.missing), g(!!e.readTime);
        const n = de(t, e.missing), s = ue(e.readTime);
        return new Rn(n, s);
    }(t, e) : V();
}

function Re(t, e) {
    let n;
    if ("targetChange" in e) {
        e.targetChange;
        // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
        // if unset
        const s = function(t) {
            return "NO_CHANGE" === t ? 0 /* NoChange */ : "ADD" === t ? 1 /* Added */ : "REMOVE" === t ? 2 /* Removed */ : "CURRENT" === t ? 3 /* Current */ : "RESET" === t ? 4 /* Reset */ : V();
        }(e.targetChange.targetChangeType || "NO_CHANGE"), i = e.targetChange.targetIds || [], r = function(t, e) {
            return t.Oe ? (g(void 0 === e || "string" == typeof e), nt.fromBase64String(e || "")) : (g(void 0 === e || e instanceof Uint8Array), 
            nt.fromUint8Array(e || new Uint8Array));
        }(t, e.targetChange.resumeToken), o = e.targetChange.cause, h = o && function(t) {
            const e = void 0 === t.code ? M.UNKNOWN : at(t.code);
            return new O(e, t.message || "");
        }
        /**
 * Returns a value for a number (or null) that's appropriate to put into
 * a google.protobuf.Int32Value proto.
 * DO NOT USE THIS FOR ANYTHING ELSE.
 * This method cheats. It's typed as returning "number" because that's what
 * our generated proto interfaces say Int32Value must be. But GRPC actually
 * expects a { value: <number> } struct.
 */ (o);
        n = new Ct(s, i, r, h || null);
    } else if ("documentChange" in e) {
        e.documentChange;
        const s = e.documentChange;
        s.document, s.document.name, s.document.updateTime;
        const i = de(t, s.document.name), r = ue(s.document.updateTime), o = new Tn({
            mapValue: {
                fields: s.document.fields
            }
        }), h = new An(i, r, o, {}), a = s.targetIds || [], c = s.removedTargetIds || [];
        n = new St(a, c, h.key, h);
    } else if ("documentDelete" in e) {
        e.documentDelete;
        const s = e.documentDelete;
        s.document;
        const i = de(t, s.document), r = s.readTime ? ue(s.readTime) : q.min(), o = new Rn(i, r), h = s.removedTargetIds || [];
        n = new St([], h, o.key, o);
    } else if ("documentRemove" in e) {
        e.documentRemove;
        const s = e.documentRemove;
        s.document;
        const i = de(t, s.document), r = s.removedTargetIds || [];
        n = new St([], r, i, null);
    } else {
        if (!("filter" in e)) return V();
        {
            e.filter;
            const t = e.filter;
            t.targetId;
            const s = t.count || 0, i = new it(s), r = t.targetId;
            n = new Dt(r, i);
        }
    }
    return n;
}

function Pe(t, e) {
    let n;
    if (e instanceof an) n = {
        update: me(t, e.key, e.value)
    }; else if (e instanceof dn) n = {
        delete: fe(t, e.key)
    }; else if (e instanceof cn) n = {
        update: me(t, e.key, e.data),
        updateMask: xe(e.Le)
    }; else if (e instanceof ln) n = {
        transform: {
            document: fe(t, e.key),
            fieldTransforms: e.fieldTransforms.map(t => function(t, e) {
                const n = e.transform;
                if (n instanceof Be) return {
                    fieldPath: e.field.F(),
                    setToServerValue: "REQUEST_TIME"
                };
                if (n instanceof Ue) return {
                    fieldPath: e.field.F(),
                    appendMissingElements: {
                        values: n.elements
                    }
                };
                if (n instanceof Qe) return {
                    fieldPath: e.field.F(),
                    removeAllFromArray: {
                        values: n.elements
                    }
                };
                if (n instanceof Ke) return {
                    fieldPath: e.field.F(),
                    increment: n.qe
                };
                throw V();
            }(0, t))
        }
    }; else {
        if (!(e instanceof wn)) return V();
        n = {
            verify: fe(t, e.key)
        };
    }
    return e.Ue.Be || (n.currentDocument = function(t, e) {
        return void 0 !== e.updateTime ? {
            updateTime: ce(t, e.updateTime)
        } : void 0 !== e.exists ? {
            exists: e.exists
        } : V();
    }(t, e.Ue)), n;
}

function Ve(t, e) {
    const n = e.currentDocument ? function(t) {
        return void 0 !== t.updateTime ? Ze.updateTime(ue(t.updateTime)) : void 0 !== t.exists ? Ze.exists(t.exists) : Ze.We();
    }(e.currentDocument) : Ze.We();
    if (e.update) {
        e.update.name;
        const s = de(t, e.update.name), i = new Tn({
            mapValue: {
                fields: e.update.fields
            }
        });
        if (e.updateMask) {
            const t = function(t) {
                const e = t.fieldPaths || [];
                return new He(e.map(t => Q.q(t)));
            }(e.updateMask);
            return new cn(s, i, t, n);
        }
        return new an(s, i, n);
    }
    if (e.delete) {
        const s = de(t, e.delete);
        return new dn(s, n);
    }
    if (e.transform) {
        const s = de(t, e.transform.document), i = e.transform.fieldTransforms.map(e => function(t, e) {
            let n = null;
            if ("setToServerValue" in e) g("REQUEST_TIME" === e.setToServerValue), n = new Be; else if ("appendMissingElements" in e) {
                const t = e.appendMissingElements.values || [];
                n = new Ue(t);
            } else if ("removeAllFromArray" in e) {
                const t = e.removeAllFromArray.values || [];
                n = new Qe(t);
            } else "increment" in e ? n = new Ke(t, e.increment) : V();
            const s = Q.q(e.fieldPath);
            return new Ye(s, n);
        }(t, e));
        return g(!0 === n.exists), new ln(s, i);
    }
    if (e.verify) {
        const s = de(t, e.verify);
        return new wn(s, n);
    }
    return V();
}

function ge(t, e) {
    return t && t.length > 0 ? (g(void 0 !== e), t.map(t => function(t, e) {
        // NOTE: Deletes don't have an updateTime.
        let n = t.updateTime ? ue(t.updateTime) : ue(e);
        n.isEqual(q.min()) && (
        // The Firestore Emulator currently returns an update time of 0 for
        // deletes of non-existing documents (rather than null). This breaks the
        // test "get deleted doc while offline with source=cache" as NoDocuments
        // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
        // TODO(#2149): Remove this when Emulator is fixed
        n = ue(e));
        let s = null;
        return t.transformResults && t.transformResults.length > 0 && (s = t.transformResults), 
        new Xe(n, s);
    }(t, e))) : [];
}

function ye(t, e) {
    return {
        documents: [ we(t, e.path) ]
    };
}

function pe(t, e) {
    // Dissect the path into parent, collectionId, and optional key filter.
    const n = {
        structuredQuery: {}
    }, s = e.path;
    null !== e.collectionGroup ? (n.parent = we(t, s), n.structuredQuery.from = [ {
        collectionId: e.collectionGroup,
        allDescendants: !0
    } ]) : (n.parent = we(t, s.p()), n.structuredQuery.from = [ {
        collectionId: s.S()
    } ]);
    const i = function(t) {
        if (0 === t.length) return;
        const e = t.map(t => 
        // visible for testing
        function(t) {
            if ("==" /* EQUAL */ === t.op) {
                if (Zt(t.value)) return {
                    unaryFilter: {
                        field: Ce(t.field),
                        op: "IS_NAN"
                    }
                };
                if (Xt(t.value)) return {
                    unaryFilter: {
                        field: Ce(t.field),
                        op: "IS_NULL"
                    }
                };
            } else if ("!=" /* NOT_EQUAL */ === t.op) {
                if (Zt(t.value)) return {
                    unaryFilter: {
                        field: Ce(t.field),
                        op: "IS_NOT_NAN"
                    }
                };
                if (Xt(t.value)) return {
                    unaryFilter: {
                        field: Ce(t.field),
                        op: "IS_NOT_NULL"
                    }
                };
            }
            return {
                fieldFilter: {
                    field: Ce(t.field),
                    op: (e = t.op, ne[e]),
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
                field: Ce((e = t).field),
                direction: (n = e.dir, ee[n])
            };
            // visible for testing
            var e, n;
        });
    }(e.orderBy);
    r && (n.structuredQuery.orderBy = r);
    const o = function(t, e) {
        return t.Oe || K(e) ? e : {
            value: e
        };
    }
    /**
 * Returns a number (or null) from a google.protobuf.Int32Value proto.
 */ (t, e.limit);
    return null !== o && (n.structuredQuery.limit = o), e.startAt && (n.structuredQuery.startAt = Se(e.startAt)), 
    e.endAt && (n.structuredQuery.endAt = Se(e.endAt)), n;
}

function be(t) {
    let e = Te(t.parent);
    const n = t.structuredQuery, s = n.from ? n.from.length : 0;
    let i = null;
    if (s > 0) {
        g(1 === s);
        const t = n.from[0];
        t.allDescendants ? i = t.collectionId : e = e.child(t.collectionId);
    }
    let r = [];
    n.where && (r = function t(e) {
        return e ? void 0 !== e.unaryFilter ? [ ke(e) ] : void 0 !== e.fieldFilter ? [ Fe(e) ] : void 0 !== e.compositeFilter ? e.compositeFilter.filters.map(e => t(e)).reduce((t, e) => t.concat(e)) : V() : [];
    }(n.where));
    let o = [];
    n.orderBy && (o = n.orderBy.map(t => {
        return new Xn(Ne((e = t).field), 
        // visible for testing
        function(t) {
            switch (t) {
              case "ASCENDING":
                return "asc" /* ASCENDING */;

              case "DESCENDING":
                return "desc" /* DESCENDING */;

              default:
                return;
            }
        }(e.direction));
        var e;
    }));
    let h = null;
    n.limit && (h = function(t) {
        let e;
        return e = "object" == typeof t ? t.value : t, K(e) ? null : e;
    }(n.limit));
    let a = null;
    n.startAt && (a = De(n.startAt));
    let c = null;
    return n.endAt && (c = De(n.endAt)), Sn(yn(e, i, o, r, h, "F" /* First */ , a, c));
}

function ve(t, e) {
    const n = function(t, e) {
        switch (e) {
          case 0 /* Listen */ :
            return null;

          case 1 /* ExistenceFilterMismatch */ :
            return "existence-filter-mismatch";

          case 2 /* LimboResolution */ :
            return "limbo-document";

          default:
            return V();
        }
    }(0, e.J);
    return null == n ? null : {
        "goog-listen-tags": n
    };
}

function Se(t) {
    return {
        before: t.before,
        values: t.position
    };
}

function De(t) {
    const e = !!t.before, n = t.values || [];
    return new zn(n, e);
}

// visible for testing
function Ce(t) {
    return {
        fieldPath: t.F()
    };
}

function Ne(t) {
    return Q.q(t.fieldPath);
}

function Fe(t) {
    return On.create(Ne(t.fieldFilter.field), function(t) {
        switch (t) {
          case "EQUAL":
            return "==" /* EQUAL */;

          case "NOT_EQUAL":
            return "!=" /* NOT_EQUAL */;

          case "GREATER_THAN":
            return ">" /* GREATER_THAN */;

          case "GREATER_THAN_OR_EQUAL":
            return ">=" /* GREATER_THAN_OR_EQUAL */;

          case "LESS_THAN":
            return "<" /* LESS_THAN */;

          case "LESS_THAN_OR_EQUAL":
            return "<=" /* LESS_THAN_OR_EQUAL */;

          case "ARRAY_CONTAINS":
            return "array-contains" /* ARRAY_CONTAINS */;

          case "IN":
            return "in" /* IN */;

          case "NOT_IN":
            return "not-in" /* NOT_IN */;

          case "ARRAY_CONTAINS_ANY":
            return "array-contains-any" /* ARRAY_CONTAINS_ANY */;

          case "OPERATOR_UNSPECIFIED":
          default:
            return V();
        }
    }(t.fieldFilter.op), t.fieldFilter.value);
}

function ke(t) {
    switch (t.unaryFilter.op) {
      case "IS_NAN":
        const e = Ne(t.unaryFilter.field);
        return On.create(e, "==" /* EQUAL */ , {
            doubleValue: NaN
        });

      case "IS_NULL":
        const n = Ne(t.unaryFilter.field);
        return On.create(n, "==" /* EQUAL */ , {
            nullValue: "NULL_VALUE"
        });

      case "IS_NOT_NAN":
        const s = Ne(t.unaryFilter.field);
        return On.create(s, "!=" /* NOT_EQUAL */ , {
            doubleValue: NaN
        });

      case "IS_NOT_NULL":
        const i = Ne(t.unaryFilter.field);
        return On.create(i, "!=" /* NOT_EQUAL */ , {
            nullValue: "NULL_VALUE"
        });

      case "OPERATOR_UNSPECIFIED":
      default:
        return V();
    }
}

function xe(t) {
    const e = [];
    return t.fields.forEach(t => e.push(t.F())), {
        fieldPaths: e
    };
}

function $e(t) {
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
/** Represents a transform within a TransformMutation. */ class Me {
    constructor() {
        // Make sure that the structural type of `TransformOperation` is unique.
        // See https://github.com/microsoft/TypeScript/issues/5451
        this.Qe = void 0;
    }
}

/**
 * Computes the local transform result against the provided `previousValue`,
 * optionally using the provided localWriteTime.
 */ function Oe(t, e, n) {
    return t instanceof Be ? function(t, e) {
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
 */ (n, e) : t instanceof Ue ? We(t, e) : t instanceof Qe ? je(t, e) : function(t, e) {
        // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
        // precision and resolves overflows by reducing precision, we do not
        // manually cap overflows at 2^63.
        const n = qe(t, e), s = Ge(n) + Ge(t.qe);
        return Yt(n) && Yt(t.qe) ? ie(s) : re(t.serializer, s);
    }(t, e);
}

/**
 * Computes a final transform result after the transform has been acknowledged
 * by the server, potentially using the server-provided transformResult.
 */ function Le(t, e, n) {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return t instanceof Ue ? We(t, e) : t instanceof Qe ? je(t, e) : n;
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
 */ function qe(t, e) {
    return t instanceof Ke ? Yt(n = e) || function(t) {
        return !!t && "doubleValue" in t;
    }
    /** Returns true if `value` is either an IntegerValue or a DoubleValue. */ (n) ? e : {
        integerValue: 0
    } : null;
    var n;
}

/** Transforms a value into a server-generated timestamp. */
class Be extends Me {}

/** Transforms an array value via a union operation. */ class Ue extends Me {
    constructor(t) {
        super(), this.elements = t;
    }
}

function We(t, e) {
    const n = ze(e);
    for (const e of t.elements) n.some(t => qt(t, e)) || n.push(e);
    return {
        arrayValue: {
            values: n
        }
    };
}

/** Transforms an array value via a remove operation. */ class Qe extends Me {
    constructor(t) {
        super(), this.elements = t;
    }
}

function je(t, e) {
    let n = ze(e);
    for (const e of t.elements) n = n.filter(t => !qt(t, e));
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
 */ class Ke extends Me {
    constructor(t, e) {
        super(), this.serializer = t, this.qe = e;
    }
}

function Ge(t) {
    return Gt(t.integerValue || t.doubleValue);
}

function ze(t) {
    return Jt(t) && t.arrayValue.values ? t.arrayValue.values.slice() : [];
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
 */ class He {
    constructor(t) {
        this.fields = t, 
        // TODO(dimond): validation of FieldMask
        // Sort the field mask to support `FieldMask.isEqual()` and assert below.
        t.sort(Q.P);
    }
    /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */    je(t) {
        for (const e of this.fields) if (e.D(t)) return !0;
        return !1;
    }
    isEqual(t) {
        return S(this.fields, t.fields, (t, e) => t.isEqual(e));
    }
}

/** A field path and the TransformOperation to perform upon it. */ class Ye {
    constructor(t, e) {
        this.field = t, this.transform = e;
    }
}

function Je(t, e) {
    return t.field.isEqual(e.field) && function(t, e) {
        return t instanceof Ue && e instanceof Ue || t instanceof Qe && e instanceof Qe ? S(t.elements, e.elements, qt) : t instanceof Ke && e instanceof Ke ? qt(t.qe, e.qe) : t instanceof Be && e instanceof Be;
    }(t.transform, e.transform);
}

/** The result of successfully applying a mutation to the backend. */ class Xe {
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
 */ class Ze {
    constructor(t, e) {
        this.updateTime = t, this.exists = e;
    }
    /** Creates a new empty Precondition. */    static We() {
        return new Ze;
    }
    /** Creates a new Precondition with an exists flag. */    static exists(t) {
        return new Ze(void 0, t);
    }
    /** Creates a new Precondition based on a version a document exists at. */    static updateTime(t) {
        return new Ze(t);
    }
    /** Returns whether this Precondition is empty. */    get Be() {
        return void 0 === this.updateTime && void 0 === this.exists;
    }
    isEqual(t) {
        return this.exists === t.exists && (this.updateTime ? !!t.updateTime && this.updateTime.isEqual(t.updateTime) : !t.updateTime);
    }
}

/**
 * Returns true if the preconditions is valid for the given document
 * (or null if no document is available).
 */ function tn(t, e) {
    return void 0 !== t.updateTime ? e instanceof An && e.version.isEqual(t.updateTime) : void 0 === t.exists || t.exists === e instanceof An;
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
 */ class en {}

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
 */ function nn(t, e, n) {
    return t instanceof an ? function(t, e, n) {
        // Unlike applySetMutationToLocalView, if we're applying a mutation to a
        // remote document the server has accepted the mutation so the precondition
        // must have held.
        return new An(t.key, n.version, t.value, {
            hasCommittedMutations: !0
        });
    }(t, 0, n) : t instanceof cn ? function(t, e, n) {
        if (!tn(t.Ue, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new Pn(t.key, n.version);
        const s = un(t, e);
        return new An(t.key, n.version, s, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : t instanceof ln ? function(t, e, n) {
        if (g(null != n.transformResults), !tn(t.Ue, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new Pn(t.key, n.version);
        const s = _n(t, e), i = 
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
            g(t.length === n.length);
            for (let i = 0; i < n.length; i++) {
                const r = t[i], o = r.transform;
                let h = null;
                e instanceof An && (h = e.field(r.field)), s.push(Le(o, h, n[i]));
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
 */ (t.fieldTransforms, e, n.transformResults), r = n.version, o = fn(t, s.data(), i);
        return new An(t.key, r, o, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : function(t, e, n) {
        // Unlike applyToLocalView, if we're applying a mutation to a remote
        // document the server has accepted the mutation so the precondition must
        // have held.
        return new Rn(t.key, n.version, {
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
 */ function sn(t, e, n, s) {
    return t instanceof an ? function(t, e) {
        if (!tn(t.Ue, e)) return e;
        const n = hn(e);
        return new An(t.key, n, t.value, {
            Ke: !0
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
 */ (t, e) : t instanceof cn ? function(t, e) {
        if (!tn(t.Ue, e)) return e;
        const n = hn(e), s = un(t, e);
        return new An(t.key, n, s, {
            Ke: !0
        });
    }
    /**
 * Patches the data of document if available or creates a new document. Note
 * that this does not check whether or not the precondition of this patch
 * holds.
 */ (t, e) : t instanceof ln ? function(t, e, n, s) {
        if (!tn(t.Ue, e)) return e;
        const i = _n(t, e), r = function(t, e, n, s) {
            const i = [];
            for (const r of t) {
                const t = r.transform;
                let o = null;
                n instanceof An && (o = n.field(r.field)), null === o && s instanceof An && (
                // If the current document does not contain a value for the mutated
                // field, use the value that existed before applying this mutation
                // batch. This solves an edge case where a PatchMutation clears the
                // values in a nested map before the TransformMutation is applied.
                o = s.field(r.field)), i.push(Oe(t, o, e));
            }
            return i;
        }(t.fieldTransforms, n, e, s), o = fn(t, i.data(), r);
        return new An(t.key, i.version, o, {
            Ke: !0
        });
    }(t, e, s, n) : function(t, e) {
        if (!tn(t.Ue, e)) return e;
        return new Rn(t.key, q.min());
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
 */ function rn(t, e) {
    return t instanceof ln ? function(t, e) {
        let n = null;
        for (const s of t.fieldTransforms) {
            const t = e instanceof An ? e.field(s.field) : void 0, i = qe(s.transform, t || null);
            null != i && (n = null == n ? (new En).set(s.field, i) : n.set(s.field, i));
        }
        return n ? n.Ge() : null;
    }
    /**
 * Asserts that the given MaybeDocument is actually a Document and verifies
 * that it matches the key for this mutation. Since we only support
 * transformations with precondition exists this method is guaranteed to be
 * safe.
 */ (t, e) : null;
}

function on(t, e) {
    return t.type === e.type && (!!t.key.isEqual(e.key) && (!!t.Ue.isEqual(e.Ue) && (0 /* Set */ === t.type ? t.value.isEqual(e.value) : 1 /* Patch */ === t.type ? t.data.isEqual(e.data) && t.Le.isEqual(e.Le) : 2 /* Transform */ !== t.type || S(t.fieldTransforms, t.fieldTransforms, (t, e) => Je(t, e)))));
}

/**
 * Returns the version from the given document for use as the result of a
 * mutation. Mutations are defined to return the version of the base document
 * only if it is an existing document. Deleted and unknown documents have a
 * post-mutation version of SnapshotVersion.min().
 */ function hn(t) {
    return t instanceof An ? t.version : q.min();
}

/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */ class an extends en {
    constructor(t, e, n) {
        super(), this.key = t, this.value = e, this.Ue = n, this.type = 0 /* Set */;
    }
}

class cn extends en {
    constructor(t, e, n, s) {
        super(), this.key = t, this.data = e, this.Le = n, this.Ue = s, this.type = 1 /* Patch */;
    }
}

function un(t, e) {
    let n;
    return n = e instanceof An ? e.data() : Tn.empty(), function(t, e) {
        const n = new En(e);
        return t.Le.fields.forEach(e => {
            if (!e._()) {
                const s = t.data.field(e);
                null !== s ? n.set(e, s) : n.delete(e);
            }
        }), n.Ge();
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

class ln extends en {
    constructor(t, e) {
        super(), this.key = t, this.fieldTransforms = e, this.type = 2 /* Transform */ , 
        // NOTE: We set a precondition of exists: true as a safety-check, since we
        // always combine TransformMutations with a SetMutation or PatchMutation which
        // (if successful) should end up with an existing document.
        this.Ue = Ze.exists(!0);
    }
}

function _n(t, e) {
    return e;
}

function fn(t, e, n) {
    const s = new En(e);
    for (let e = 0; e < t.fieldTransforms.length; e++) {
        const i = t.fieldTransforms[e];
        s.set(i.field, n[e]);
    }
    return s.Ge();
}

/** A mutation that deletes the document at the given key. */ class dn extends en {
    constructor(t, e) {
        super(), this.key = t, this.Ue = e, this.type = 3 /* Delete */;
    }
}

class wn extends en {
    constructor(t, e) {
        super(), this.key = t, this.Ue = e, this.type = 4 /* Verify */;
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
 */ class Tn {
    constructor(t) {
        this.proto = t;
    }
    static empty() {
        return new Tn({
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
                if (e = e.mapValue.fields[t.get(n)], !te(e)) return null;
            }
            return e = (e.mapValue.fields || {})[t.S()], e || null;
        }
    }
    isEqual(t) {
        return qt(this.proto, t.proto);
    }
}

/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue.
 */ class En {
    /**
     * @param baseObject The object to mutate.
     */
    constructor(t = Tn.empty()) {
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
            n = i : i && 10 /* ObjectValue */ === Lt(i) ? (
            // Convert the existing Protobuf MapValue into a map
            i = new Map(Object.entries(i.mapValue.fields || {})), n.set(s, i), n = i) : (
            // Create an empty map to represent the current nesting level
            i = new Map, n.set(s, i), n = i);
        }
        n.set(t.S(), e);
    }
    /** Returns an ObjectValue with all mutations applied. */    Ge() {
        const t = this.Je(Q.$(), this.He);
        return null != t ? new Tn(t) : this.ze;
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
     */    Je(t, e) {
        let n = !1;
        const s = this.ze.field(t), i = te(s) ? // If there is already data at the current path, base our
        Object.assign({}, s.mapValue.fields) : {};
        return e.forEach((e, s) => {
            if (e instanceof Map) {
                const r = this.Je(t.child(s), e);
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
 */ function In(t) {
    const e = [];
    return k(t.fields || {}, (t, n) => {
        const s = new Q([ t ]);
        if (te(n)) {
            const t = In(n.mapValue).fields;
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
    }), new He(e);
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
 */ class mn {
    constructor(t, e) {
        this.key = t, this.version = e;
    }
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */ class An extends mn {
    constructor(t, e, n, s) {
        super(t, e), this.Xe = n, this.Ke = !!s.Ke, this.hasCommittedMutations = !!s.hasCommittedMutations;
    }
    field(t) {
        return this.Xe.field(t);
    }
    data() {
        return this.Xe;
    }
    Ze() {
        return this.Xe.proto;
    }
    isEqual(t) {
        return t instanceof An && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.Ke === t.Ke && this.hasCommittedMutations === t.hasCommittedMutations && this.Xe.isEqual(t.Xe);
    }
    toString() {
        return `Document(${this.key}, ${this.version}, ${this.Xe.toString()}, {hasLocalMutations: ${this.Ke}}), {hasCommittedMutations: ${this.hasCommittedMutations}})`;
    }
    get hasPendingWrites() {
        return this.Ke || this.hasCommittedMutations;
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
class Rn extends mn {
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
        return t instanceof Rn && t.hasCommittedMutations === this.hasCommittedMutations && t.version.isEqual(this.version) && t.key.isEqual(this.key);
    }
}

/**
 * A class representing an existing document whose data is unknown (e.g. a
 * document that was updated without a known base document).
 */ class Pn extends mn {
    toString() {
        return `UnknownDocument(${this.key}, ${this.version})`;
    }
    get hasPendingWrites() {
        return !0;
    }
    isEqual(t) {
        return t instanceof Pn && t.version.isEqual(this.version) && t.key.isEqual(this.key);
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
 */ function Vn(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
e) {
    if (!(t instanceof e)) throw e.name === t.constructor.name ? new O(M.INVALID_ARGUMENT, `Type does not match the expected instance. Did you pass '${e.name}' from a different Firestore SDK?`) : new O(M.INVALID_ARGUMENT, `Expected type '${e.name}', but was '${t.constructor.name}'`);
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
 */ class gn {
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
        return new gn(t, 
        /*collectionGroup=*/ null, this.tn.slice(), this.filters.slice(), this.limit, this.en, this.startAt, this.endAt);
    }
    on() {
        return 0 === this.filters.length && null === this.limit && null == this.startAt && null == this.endAt && (0 === this.tn.length || 1 === this.tn.length && this.tn[0].field.O());
    }
    hn() {
        return !K(this.limit) && "F" /* First */ === this.en;
    }
    an() {
        return !K(this.limit) && "L" /* Last */ === this.en;
    }
    cn() {
        return this.tn.length > 0 ? this.tn[0].field : null;
    }
    un() {
        for (const t of this.filters) if (t.ln()) return t.field;
        return null;
    }
    _n(t) {
        for (const e of this.filters) if (t.indexOf(e.op) >= 0) return e.op;
        return null;
    }
}

/** Creates a new Query instance with the options provided. */ function yn(t, e, n, s, i, r, o, h) {
    return new gn(t, e, n, s, i, r, o, h);
}

/** Creates a new Query for a query that matches all documents at `path` */ function pn(t) {
    return new gn(t);
}

/**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */
function bn(t) {
    return null !== t.collectionGroup;
}

/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */ function vn(t) {
    const e = Vn(t, gn);
    if (null === e.nn) {
        e.nn = [];
        const t = e.un(), n = e.cn();
        if (null !== t && null === n) 
        // In order to implicitly add key ordering, we must also add the
        // inequality filter field for it to be a valid query.
        // Note that the default inequality field and key ordering is ascending.
        t.O() || e.nn.push(new Xn(t)), e.nn.push(new Xn(Q.L(), "asc" /* ASCENDING */)); else {
            let t = !1;
            for (const n of e.tn) e.nn.push(n), n.field.O() && (t = !0);
            if (!t) {
                // The order of the implicit key ordering always matches the last
                // explicit order by
                const t = e.tn.length > 0 ? e.tn[e.tn.length - 1].dir : "asc" /* ASCENDING */;
                e.nn.push(new Xn(Q.L(), t));
            }
        }
    }
    return e.nn;
}

/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */ function Sn(t) {
    const e = Vn(t, gn);
    if (!e.sn) if ("F" /* First */ === e.en) e.sn = Y(e.path, e.collectionGroup, vn(e), e.filters, e.limit, e.startAt, e.endAt); else {
        // Flip the orderBy directions since we want the last results
        const t = [];
        for (const n of vn(e)) {
            const e = "desc" /* DESCENDING */ === n.dir ? "asc" /* ASCENDING */ : "desc" /* DESCENDING */;
            t.push(new Xn(n.field, e));
        }
        // We need to swap the cursors to match the now-flipped query ordering.
                const n = e.endAt ? new zn(e.endAt.position, !e.endAt.before) : null, s = e.startAt ? new zn(e.startAt.position, !e.startAt.before) : null;
        // Now return as a LimitType.First query.
        e.sn = Y(e.path, e.collectionGroup, t, e.filters, e.limit, n, s);
    }
    return e.sn;
}

function Dn(t, e, n) {
    return new gn(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), e, n, t.startAt, t.endAt);
}

function Cn(t, e) {
    return new gn(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), t.limit, t.en, e, t.endAt);
}

function Nn(t, e) {
    return new gn(t.path, t.collectionGroup, t.tn.slice(), t.filters.slice(), t.limit, t.en, t.startAt, e);
}

function Fn(t, e) {
    return Z(Sn(t), Sn(e)) && t.en === e.en;
}

// TODO(b/29183165): This is used to get a unique string from a query to, for
// example, use as a dictionary key, but the implementation is subject to
// collisions. Make it collision-free.
function kn(t) {
    return `${J(Sn(t))}|lt:${t.en}`;
}

function xn(t) {
    return `Query(target=${X(Sn(t))}; limitType=${t.en})`;
}

/** Returns whether `doc` matches the constraints of `query`. */ function $n(t, e) {
    return function(t, e) {
        const n = e.key.path;
        return null !== t.collectionGroup ? e.key.U(t.collectionGroup) && t.path.D(n) : j.W(t.path) ? t.path.isEqual(n) : t.path.C(n);
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
        if (t.startAt && !Yn(t.startAt, vn(t), e)) return !1;
        if (t.endAt && Yn(t.endAt, vn(t), e)) return !1;
        return !0;
    }
    /**
 * Returns a new comparator function that can be used to compare two documents
 * based on the Query's ordering constraint.
 */ (t, e);
}

function Mn(t) {
    return (e, n) => {
        let s = !1;
        for (const i of vn(t)) {
            const t = Zn(i, e, n);
            if (0 !== t) return t;
            s = s || i.field.O();
        }
        return 0;
    };
}

class On extends class {} {
    constructor(t, e, n) {
        super(), this.field = t, this.op = e, this.value = n;
    }
    /**
     * Creates a filter based on the provided arguments.
     */    static create(t, e, n) {
        if (t.O()) return "in" /* IN */ === e || "not-in" /* NOT_IN */ === e ? this.fn(t, e, n) : new qn(t, e, n);
        if (Xt(n)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new O(M.INVALID_ARGUMENT, "Invalid query. Null supports only equality comparisons.");
            return new On(t, e, n);
        }
        if (Zt(n)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new O(M.INVALID_ARGUMENT, "Invalid query. NaN supports only equality comparisons.");
            return new On(t, e, n);
        }
        return "array-contains" /* ARRAY_CONTAINS */ === e ? new Qn(t, n) : "in" /* IN */ === e ? new jn(t, n) : "not-in" /* NOT_IN */ === e ? new Kn(t, n) : "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e ? new Gn(t, n) : new On(t, e, n);
    }
    static fn(t, e, n) {
        return "in" /* IN */ === e ? new Bn(t, n) : new Un(t, n);
    }
    matches(t) {
        const e = t.field(this.field);
        // Types do not have to match in NOT_EQUAL filters.
                return "!=" /* NOT_EQUAL */ === this.op ? null !== e && this.dn(Ut(e, this.value)) : null !== e && Lt(this.value) === Lt(e) && this.dn(Ut(e, this.value));
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
            return V();
        }
    }
    ln() {
        return [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , ">=" /* GREATER_THAN_OR_EQUAL */ , "!=" /* NOT_EQUAL */ ].indexOf(this.op) >= 0;
    }
}

function Ln(t) {
    // TODO(b/29183165): Technically, this won't be unique if two values have
    // the same description, such as the int 3 and the string "3". So we should
    // add the types in here somehow, too.
    return t.field.F() + t.op.toString() + Qt(t.value);
}

class qn extends On {
    constructor(t, e, n) {
        super(t, e, n), this.key = j.B(n.referenceValue);
    }
    matches(t) {
        const e = j.P(t.key, this.key);
        return this.dn(e);
    }
}

/** Filter that matches on key fields within an array. */ class Bn extends On {
    constructor(t, e) {
        super(t, "in" /* IN */ , e), this.keys = Wn("in" /* IN */ , e);
    }
    matches(t) {
        return this.keys.some(e => e.isEqual(t.key));
    }
}

/** Filter that matches on key fields not present within an array. */ class Un extends On {
    constructor(t, e) {
        super(t, "not-in" /* NOT_IN */ , e), this.keys = Wn("not-in" /* NOT_IN */ , e);
    }
    matches(t) {
        return !this.keys.some(e => e.isEqual(t.key));
    }
}

function Wn(t, e) {
    var n;
    return ((null === (n = e.arrayValue) || void 0 === n ? void 0 : n.values) || []).map(t => j.B(t.referenceValue));
}

/** A Filter that implements the array-contains operator. */ class Qn extends On {
    constructor(t, e) {
        super(t, "array-contains" /* ARRAY_CONTAINS */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return Jt(e) && Bt(e.arrayValue, this.value);
    }
}

/** A Filter that implements the IN operator. */ class jn extends On {
    constructor(t, e) {
        super(t, "in" /* IN */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return null !== e && Bt(this.value.arrayValue, e);
    }
}

/** A Filter that implements the not-in operator. */ class Kn extends On {
    constructor(t, e) {
        super(t, "not-in" /* NOT_IN */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return null !== e && !Bt(this.value.arrayValue, e);
    }
}

/** A Filter that implements the array-contains-any operator. */ class Gn extends On {
    constructor(t, e) {
        super(t, "array-contains-any" /* ARRAY_CONTAINS_ANY */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return !(!Jt(e) || !e.arrayValue.values) && e.arrayValue.values.some(t => Bt(this.value.arrayValue, t));
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
 */ class zn {
    constructor(t, e) {
        this.position = t, this.before = e;
    }
}

function Hn(t) {
    // TODO(b/29183165): Make this collision robust.
    return `${t.before ? "b" : "a"}:${t.position.map(t => Qt(t)).join(",")}`;
}

/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */ function Yn(t, e, n) {
    let s = 0;
    for (let i = 0; i < t.position.length; i++) {
        const r = e[i], o = t.position[i];
        if (r.field.O()) s = j.P(j.B(o.referenceValue), n.key); else {
            s = Ut(o, n.field(r.field));
        }
        if ("desc" /* DESCENDING */ === r.dir && (s *= -1), 0 !== s) break;
    }
    return t.before ? s <= 0 : s < 0;
}

function Jn(t, e) {
    if (null === t) return null === e;
    if (null === e) return !1;
    if (t.before !== e.before || t.position.length !== e.position.length) return !1;
    for (let n = 0; n < t.position.length; n++) {
        if (!qt(t.position[n], e.position[n])) return !1;
    }
    return !0;
}

/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */ class Xn {
    constructor(t, e = "asc" /* ASCENDING */) {
        this.field = t, this.dir = e;
    }
}

function Zn(t, e, n) {
    const s = t.field.O() ? j.P(e.key, n.key) : function(t, e, n) {
        const s = e.field(t), i = n.field(t);
        return null !== s && null !== i ? Ut(s, i) : V();
    }(t.field, e, n);
    switch (t.dir) {
      case "asc" /* ASCENDING */ :
        return s;

      case "desc" /* DESCENDING */ :
        return -1 * s;

      default:
        return V();
    }
}

function ts(t, e) {
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
class es {
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
        const s = n.En;
        for (let n = 0; n < this.mutations.length; n++) {
            const i = this.mutations[n];
            if (i.key.isEqual(t)) {
                e = nn(i, e, s[n]);
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
     */    In(t, e) {
        // First, apply the base state. This allows us to apply non-idempotent
        // transform against a consistent set of values.
        for (const n of this.baseMutations) n.key.isEqual(t) && (e = sn(n, e, e, this.wn));
        const n = e;
        // Second, apply all user-provided mutations.
                for (const s of this.mutations) s.key.isEqual(t) && (e = sn(s, e, n, this.wn));
        return e;
    }
    /**
     * Computes the local view for all provided documents given the mutations in
     * this batch.
     */    mn(t) {
        // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
        // directly (as done in `applyToLocalView()`), we can reduce the complexity
        // to O(n).
        let e = t;
        return this.mutations.forEach(n => {
            const s = this.In(n.key, t.get(n.key));
            s && (e = e.nt(n.key, s));
        }), e;
    }
    keys() {
        return this.mutations.reduce((t, e) => t.add(e.key), Rt());
    }
    isEqual(t) {
        return this.batchId === t.batchId && S(this.mutations, t.mutations, (t, e) => on(t, e)) && S(this.baseMutations, t.baseMutations, (t, e) => on(t, e));
    }
}

/** The result of applying a mutation batch to the backend. */ class ns {
    constructor(t, e, n, 
    /**
     * A pre-computed mapping from each mutated document to the resulting
     * version.
     */
    s) {
        this.batch = t, this.An = e, this.En = n, this.Rn = s;
    }
    /**
     * Creates a new MutationBatchResult for the given batch and results. There
     * must be one result for each mutation in the batch. This static factory
     * caches a document=>version mapping (docVersions).
     */    static from(t, e, n) {
        g(t.mutations.length === n.length);
        let s = mt;
        const i = t.mutations;
        for (let t = 0; t < i.length; t++) s = s.nt(i[t].key, n[t].version);
        return new ns(t, e, n, s);
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
 */ class ss {
    constructor(t) {
        // NOTE: next/catchCallback will always point to our own wrapper functions,
        // not the user's raw next() or catch() callbacks.
        this.Pn = null, this.Vn = null, 
        // When the operation resolves, we'll set result or error and mark isDone.
        this.result = void 0, this.error = void 0, this.gn = !1, 
        // Set to true when .then() or .catch() are called and prevents additional
        // chaining.
        this.yn = !1, t(t => {
            this.gn = !0, this.result = t, this.Pn && 
            // value should be defined unless T is Void, but we can't express
            // that in the type system.
            this.Pn(t);
        }, t => {
            this.gn = !0, this.error = t, this.Vn && this.Vn(t);
        });
    }
    catch(t) {
        return this.next(void 0, t);
    }
    next(t, e) {
        return this.yn && V(), this.yn = !0, this.gn ? this.error ? this.pn(e, this.error) : this.bn(t, this.result) : new ss((n, s) => {
            this.Pn = e => {
                this.bn(t, e).next(n, s);
            }, this.Vn = t => {
                this.pn(e, t).next(n, s);
            };
        });
    }
    vn() {
        return new Promise((t, e) => {
            this.next(t, e);
        });
    }
    Sn(t) {
        try {
            const e = t();
            return e instanceof ss ? e : ss.resolve(e);
        } catch (t) {
            return ss.reject(t);
        }
    }
    bn(t, e) {
        return t ? this.Sn(() => t(e)) : ss.resolve(e);
    }
    pn(t, e) {
        return t ? this.Sn(() => t(e)) : ss.reject(e);
    }
    static resolve(t) {
        return new ss((e, n) => {
            e(t);
        });
    }
    static reject(t) {
        return new ss((e, n) => {
            n(t);
        });
    }
    static Dn(
    // Accept all Promise types in waitFor().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t) {
        return new ss((e, n) => {
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
     */    static Cn(t) {
        let e = ss.resolve(!1);
        for (const n of t) e = e.next(t => t ? ss.resolve(t) : n());
        return e;
    }
    static forEach(t, e) {
        const n = [];
        return t.forEach((t, s) => {
            n.push(e.call(this, t, s));
        }), this.Dn(n);
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
 */ class is {
    constructor() {
        // A mapping of document key to the new cache entry that should be written (or null if any
        // existing cache entry should be removed).
        this.Nn = new $(t => t.toString(), (t, e) => t.isEqual(e)), this.Fn = !1;
    }
    set readTime(t) {
        this.kn = t;
    }
    get readTime() {
        return this.kn;
    }
    /**
     * Buffers a `RemoteDocumentCache.addEntry()` call.
     *
     * You can only modify documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */    xn(t, e) {
        this.$n(), this.readTime = e, this.Nn.set(t.key, t);
    }
    /**
     * Buffers a `RemoteDocumentCache.removeEntry()` call.
     *
     * You can only remove documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */    Mn(t, e) {
        this.$n(), e && (this.readTime = e), this.Nn.set(t, null);
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
        this.$n();
        const n = this.Nn.get(e);
        return void 0 !== n ? ss.resolve(n) : this.Ln(t, e);
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
        return this.qn(t, e);
    }
    /**
     * Applies buffered changes to the underlying RemoteDocumentCache, using
     * the provided transaction.
     */    apply(t) {
        return this.$n(), this.Fn = !0, this.Bn(t);
    }
    /** Helper to assert this.changes is not null  */    $n() {}
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
 */ const rs = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";

/**
 * A base class representing a persistence transaction, encapsulating both the
 * transaction's sequence numbers as well as a list of onCommitted listeners.
 *
 * When you call Persistence.runTransaction(), it will create a transaction and
 * pass it to your callback. You then pass it to any method that operates
 * on persistence.
 */ class os {
    constructor() {
        this.Un = [];
    }
    Wn(t) {
        this.Un.push(t);
    }
    Qn() {
        this.Un.forEach(t => t());
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
 * A readonly view of the local state of all documents we're tracking (i.e. we
 * have a cached version in remoteDocumentCache or local mutations for the
 * document). The view is computed by applying the mutations in the
 * MutationQueue to the RemoteDocumentCache.
 */ class hs {
    constructor(t, e, n) {
        this.jn = t, this.Kn = e, this.Gn = n;
    }
    /**
     * Get the local view of the document identified by `key`.
     *
     * @return Local view of the document or null if we don't have any cached
     * state for it.
     */    zn(t, e) {
        return this.Kn.Hn(t, e).next(n => this.Yn(t, e, n));
    }
    /** Internal version of `getDocument` that allows reusing batches. */    Yn(t, e, n) {
        return this.jn.On(t, e).next(t => {
            for (const s of n) t = s.In(e, t);
            return t;
        });
    }
    // Returns the view of the given `docs` as they would appear after applying
    // all mutations in the given `batches`.
    Jn(t, e, n) {
        let s = Tt();
        return e.forEach((t, e) => {
            for (const s of n) e = s.In(t, e);
            s = s.nt(t, e);
        }), s;
    }
    /**
     * Gets the local view of the documents identified by `keys`.
     *
     * If we don't have cached state for a document in `keys`, a NoDocument will
     * be stored for that key in the resulting set.
     */    Xn(t, e) {
        return this.jn.getEntries(t, e).next(e => this.Zn(t, e));
    }
    /**
     * Similar to `getDocuments`, but creates the local view from the given
     * `baseDocs` without retrieving documents from the local store.
     */    Zn(t, e) {
        return this.Kn.ts(t, e).next(n => {
            const s = this.Jn(t, e, n);
            let i = wt();
            return s.forEach((t, e) => {
                // TODO(http://b/32275378): Don't conflate missing / deleted.
                e || (e = new Rn(t, q.min())), i = i.nt(t, e);
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
     */    es(t, e, n) {
        /**
 * Returns whether the query matches a single document by path (rather than a
 * collection).
 */
        return function(t) {
            return j.W(t.path) && null === t.collectionGroup && 0 === t.filters.length;
        }(e) ? this.ns(t, e.path) : bn(e) ? this.ss(t, e, n) : this.rs(t, e, n);
    }
    ns(t, e) {
        // Just do a simple document lookup.
        return this.zn(t, new j(e)).next(t => {
            let e = It();
            return t instanceof An && (e = e.nt(t.key, t)), e;
        });
    }
    ss(t, e, n) {
        const s = e.collectionGroup;
        let i = It();
        return this.Gn.os(t, s).next(r => ss.forEach(r, r => {
            const o = e.rn(r.child(s));
            return this.rs(t, o, n).next(t => {
                t.forEach((t, e) => {
                    i = i.nt(t, e);
                });
            });
        }).next(() => i));
    }
    rs(t, e, n) {
        // Query the remote documents and overlay mutations.
        let s, i;
        return this.jn.es(t, e, n).next(n => (s = n, this.Kn.hs(t, e))).next(e => (i = e, 
        this.as(t, i, s).next(t => {
            s = t;
            for (const t of i) for (const e of t.mutations) {
                const n = e.key, i = s.get(n), r = sn(e, i, i, t.wn);
                s = r instanceof An ? s.nt(n, r) : s.remove(n);
            }
        }))).next(() => (
        // Finally, filter out any documents that don't actually match
        // the query.
        s.forEach((t, n) => {
            $n(e, n) || (s = s.remove(t));
        }), s));
    }
    as(t, e, n) {
        let s = Rt();
        for (const t of e) for (const e of t.mutations) e instanceof cn && null === n.get(e.key) && (s = s.add(e.key));
        let i = n;
        return this.jn.getEntries(t, s).next(t => (t.forEach((t, e) => {
            null !== e && e instanceof An && (i = i.nt(t, e));
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
 */ class as {
    constructor(t, e, n, s) {
        this.targetId = t, this.fromCache = e, this.cs = n, this.us = s;
    }
    static ls(t, e) {
        let n = Rt(), s = Rt();
        for (const t of e.docChanges) switch (t.type) {
          case 0 /* Added */ :
            n = n.add(t.doc.key);
            break;

          case 1 /* Removed */ :
            s = s.add(t.doc.key);
 // do nothing
                }
        return new as(t, e.fromCache, n, s);
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
 */ class cs {
    constructor(t, e) {
        this.previousValue = t, e && (e._s = t => this.fs(t), this.ds = t => e.ws(t));
    }
    fs(t) {
        return this.previousValue = Math.max(t, this.previousValue), this.previousValue;
    }
    next() {
        const t = ++this.previousValue;
        return this.ds && this.ds(t), t;
    }
}

cs.Ts = -1;

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
class us {
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
class ls {
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
        this.Es = t, this.Is = e, this.ms = n, this.As = s, this.Rs = i, this.Ps = 0, this.Vs = null, 
        /** The last backoff attempt, as epoch milliseconds. */
        this.gs = Date.now(), this.reset();
    }
    /**
     * Resets the backoff delay.
     *
     * The very next backoffAndWait() will have no delay. If it is called again
     * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
     * subsequent ones will increase according to the backoffFactor.
     */    reset() {
        this.Ps = 0;
    }
    /**
     * Resets the backoff delay to the maximum delay (e.g. for use after a
     * RESOURCE_EXHAUSTED error).
     */    ys() {
        this.Ps = this.Rs;
    }
    /**
     * Returns a promise that resolves after currentDelayMs, and increases the
     * delay for any subsequent attempts. If there was a pending backoff operation
     * already, it will be canceled.
     */    ps(t) {
        // Cancel any pending backoff operation.
        this.cancel();
        // First schedule using the current base (which may be 0 and should be
        // honored as such).
        const e = Math.floor(this.Ps + this.bs()), n = Math.max(0, Date.now() - this.gs), s = Math.max(0, e - n);
        // Guard against lastAttemptTime being in the future due to a clock change.
                s > 0 && m("ExponentialBackoff", `Backing off for ${s} ms (base delay: ${this.Ps} ms, delay with jitter: ${e} ms, last attempt: ${n} ms ago)`), 
        this.Vs = this.Es.vs(this.Is, s, () => (this.gs = Date.now(), t())), 
        // Apply backoff factor to determine next delay and ensure it is within
        // bounds.
        this.Ps *= this.As, this.Ps < this.ms && (this.Ps = this.ms), this.Ps > this.Rs && (this.Ps = this.Rs);
    }
    Ss() {
        null !== this.Vs && (this.Vs.Ds(), this.Vs = null);
    }
    cancel() {
        null !== this.Vs && (this.Vs.cancel(), this.Vs = null);
    }
    /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */    bs() {
        return (Math.random() - .5) * this.Ps;
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
// References to `window` are guarded by SimpleDb.isAvailable()
/* eslint-disable no-restricted-globals */
/**
 * Provides a wrapper around IndexedDb with a simplified interface that uses
 * Promise-like return values to chain operations. Real promises cannot be used
 * since .then() continuations are executed asynchronously (e.g. via
 * .setImmediate), which would cause IndexedDB to end the transaction.
 * See PersistencePromise for more details.
 */
class _s {
    /*
     * Creates a new SimpleDb wrapper for IndexedDb database `name`.
     *
     * Note that `version` must not be a downgrade. IndexedDB does not support
     * downgrading the schema version. We currently do not support any way to do
     * versioning outside of IndexedDB's versioning mechanism, as only
     * version-upgrade transactions are allowed to do things like create
     * objectstores.
     */
    constructor(t, e, n) {
        this.name = t, this.version = e, this.Cs = n;
        // NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
        // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
        // whatever reason it's much harder to hit after 12.2 so we only proactively
        // log on 12.2.
        12.2 === _s.Ns(i()) && A("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");
    }
    /** Deletes the specified database. */    static delete(t) {
        return m("SimpleDb", "Removing database:", t), Is(window.indexedDB.deleteDatabase(t)).vn();
    }
    /** Returns true if IndexedDB is available in the current environment. */    static Fs() {
        if ("undefined" == typeof indexedDB) return !1;
        if (_s.ks()) return !0;
        // We extensively use indexed array values and compound keys,
        // which IE and Edge do not support. However, they still have indexedDB
        // defined on the window, so we need to check for them here and make sure
        // to return that persistence is not enabled for those browsers.
        // For tracking support of this feature, see here:
        // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
        // Check the UA string to find out the browser.
                const t = i(), e = _s.Ns(t), n = 0 < e && e < 10, s = _s.xs(t), r = 0 < s && s < 4.5;
        // IE 10
        // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
        // IE 11
        // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
        // Edge
        // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML,
        // like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';
        // iOS Safari: Disable for users running iOS version < 10.
                return !(t.indexOf("MSIE ") > 0 || t.indexOf("Trident/") > 0 || t.indexOf("Edge/") > 0 || n || r);
    }
    /**
     * Returns true if the backing IndexedDB store is the Node IndexedDBShim
     * (see https://github.com/axemclion/IndexedDBShim).
     */    static ks() {
        var t;
        return "undefined" != typeof __PRIVATE_process && "YES" === (null === (t = __PRIVATE_process.__PRIVATE_env) || void 0 === t ? void 0 : t.$s);
    }
    /** Helper to get a typed SimpleDbStore from a transaction. */    static Ms(t, e) {
        return t.store(e);
    }
    // visible for testing
    /** Parse User Agent to determine iOS version. Returns -1 if not found. */
    static Ns(t) {
        const e = t.match(/i(?:phone|pad|pod) os ([\d_]+)/i), n = e ? e[1].split("_").slice(0, 2).join(".") : "-1";
        return Number(n);
    }
    // visible for testing
    /** Parse User Agent to determine Android version. Returns -1 if not found. */
    static xs(t) {
        const e = t.match(/Android ([\d.]+)/i), n = e ? e[1].split(".").slice(0, 2).join(".") : "-1";
        return Number(n);
    }
    /**
     * Opens the specified database, creating or upgrading it if necessary.
     */    async Os() {
        return this.db || (m("SimpleDb", "Opening database:", this.name), this.db = await new Promise((t, e) => {
            // TODO(mikelehen): Investigate browser compatibility.
            // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
            // suggests IE9 and older WebKit browsers handle upgrade
            // differently. They expect setVersion, as described here:
            // https://developer.mozilla.org/en-US/docs/Web/API/IDBVersionChangeRequest/setVersion
            const n = indexedDB.open(this.name, this.version);
            n.onsuccess = e => {
                const n = e.target.result;
                t(n);
            }, n.onblocked = () => {
                e(new ds("Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));
            }, n.onerror = t => {
                const n = t.target.error;
                "VersionError" === n.name ? e(new O(M.FAILED_PRECONDITION, "A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")) : e(new ds(n));
            }, n.onupgradeneeded = t => {
                m("SimpleDb", 'Database "' + this.name + '" requires upgrade from version:', t.oldVersion);
                const e = t.target.result;
                this.Cs.createOrUpgrade(e, n.transaction, t.oldVersion, this.version).next(() => {
                    m("SimpleDb", "Database upgrade to version " + this.version + " complete");
                });
            };
        })), this.Ls && (this.db.onversionchange = t => this.Ls(t)), this.db;
    }
    qs(t) {
        this.Ls = t, this.db && (this.db.onversionchange = e => t(e));
    }
    async runTransaction(t, e, n) {
        const s = "readonly" === t;
        let i = 0;
        for (;;) {
            ++i;
            try {
                this.db = await this.Os();
                const t = Ts.open(this.db, s ? "readonly" : "readwrite", e), i = n(t).catch(e => (
                // Abort the transaction if there was an error.
                t.abort(e), ss.reject(e))).vn();
                // As noted above, errors are propagated by aborting the transaction. So
                // we swallow any error here to avoid the browser logging it as unhandled.
                return i.catch(() => {}), 
                // Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
                // fire), but still return the original transactionFnResult back to the
                // caller.
                await t.Bs, i;
            } catch (t) {
                // TODO(schmidt-sebastian): We could probably be smarter about this and
                // not retry exceptions that are likely unrecoverable (such as quota
                // exceeded errors).
                // Note: We cannot use an instanceof check for FirestoreException, since the
                // exception is wrapped in a generic error by our async/await handling.
                const e = "FirebaseError" !== t.name && i < 3;
                if (m("SimpleDb", "Transaction failed with error: %s. Retrying: %s.", t.message, e), 
                this.close(), !e) return Promise.reject(t);
            }
        }
    }
    close() {
        this.db && this.db.close(), this.db = void 0;
    }
}

/**
 * A controller for iterating over a key range or index. It allows an iterate
 * callback to delete the currently-referenced object, or jump to a new key
 * within the key range or index.
 */ class fs {
    constructor(t) {
        this.Us = t, this.Ws = !1, this.Qs = null;
    }
    get gn() {
        return this.Ws;
    }
    get js() {
        return this.Qs;
    }
    set cursor(t) {
        this.Us = t;
    }
    /**
     * This function can be called to stop iteration at any point.
     */    done() {
        this.Ws = !0;
    }
    /**
     * This function can be called to skip to that next key, which could be
     * an index or a primary key.
     */    Ks(t) {
        this.Qs = t;
    }
    /**
     * Delete the current cursor value from the object store.
     *
     * NOTE: You CANNOT do this with a keysOnly query.
     */    delete() {
        return Is(this.Us.delete());
    }
}

/** An error that wraps exceptions that thrown during IndexedDB execution. */ class ds extends O {
    constructor(t) {
        super(M.UNAVAILABLE, "IndexedDB transaction failed: " + t), this.name = "IndexedDbTransactionError";
    }
}

/** Verifies whether `e` is an IndexedDbTransactionError. */ function ws(t) {
    // Use name equality, as instanceof checks on errors don't work with errors
    // that wrap other errors.
    return "IndexedDbTransactionError" === t.name;
}

/**
 * Wraps an IDBTransaction and exposes a store() method to get a handle to a
 * specific object store.
 */ class Ts {
    constructor(t) {
        this.transaction = t, this.aborted = !1, 
        /**
         * A promise that resolves with the result of the IndexedDb transaction.
         */
        this.Gs = new us, this.transaction.oncomplete = () => {
            this.Gs.resolve();
        }, this.transaction.onabort = () => {
            t.error ? this.Gs.reject(new ds(t.error)) : this.Gs.resolve();
        }, this.transaction.onerror = t => {
            const e = As(t.target.error);
            this.Gs.reject(new ds(e));
        };
    }
    static open(t, e, n) {
        try {
            return new Ts(t.transaction(n, e));
        } catch (t) {
            throw new ds(t);
        }
    }
    get Bs() {
        return this.Gs.promise;
    }
    abort(t) {
        t && this.Gs.reject(t), this.aborted || (m("SimpleDb", "Aborting transaction:", t ? t.message : "Client-initiated abort"), 
        this.aborted = !0, this.transaction.abort());
    }
    /**
     * Returns a SimpleDbStore<KeyType, ValueType> for the specified store. All
     * operations performed on the SimpleDbStore happen within the context of this
     * transaction and it cannot be used anymore once the transaction is
     * completed.
     *
     * Note that we can't actually enforce that the KeyType and ValueType are
     * correct, but they allow type safety through the rest of the consuming code.
     */    store(t) {
        const e = this.transaction.objectStore(t);
        return new Es(e);
    }
}

/**
 * A wrapper around an IDBObjectStore providing an API that:
 *
 * 1) Has generic KeyType / ValueType parameters to provide strongly-typed
 * methods for acting against the object store.
 * 2) Deals with IndexedDB's onsuccess / onerror event callbacks, making every
 * method return a PersistencePromise instead.
 * 3) Provides a higher-level API to avoid needing to do excessive wrapping of
 * intermediate IndexedDB types (IDBCursorWithValue, etc.)
 */ class Es {
    constructor(t) {
        this.store = t;
    }
    put(t, e) {
        let n;
        return void 0 !== e ? (m("SimpleDb", "PUT", this.store.name, t, e), n = this.store.put(e, t)) : (m("SimpleDb", "PUT", this.store.name, "<auto-key>", t), 
        n = this.store.put(t)), Is(n);
    }
    /**
     * Adds a new value into an Object Store and returns the new key. Similar to
     * IndexedDb's `add()`, this method will fail on primary key collisions.
     *
     * @param value The object to write.
     * @return The key of the value to add.
     */    add(t) {
        m("SimpleDb", "ADD", this.store.name, t, t);
        return Is(this.store.add(t));
    }
    /**
     * Gets the object with the specified key from the specified store, or null
     * if no object exists with the specified key.
     *
     * @key The key of the object to get.
     * @return The object with the specified key or null if no object exists.
     */    get(t) {
        // We're doing an unsafe cast to ValueType.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Is(this.store.get(t)).next(e => (
        // Normalize nonexistence to null.
        void 0 === e && (e = null), m("SimpleDb", "GET", this.store.name, t, e), e));
    }
    delete(t) {
        m("SimpleDb", "DELETE", this.store.name, t);
        return Is(this.store.delete(t));
    }
    /**
     * If we ever need more of the count variants, we can add overloads. For now,
     * all we need is to count everything in a store.
     *
     * Returns the number of rows in the store.
     */    count() {
        m("SimpleDb", "COUNT", this.store.name);
        return Is(this.store.count());
    }
    zs(t, e) {
        const n = this.cursor(this.options(t, e)), s = [];
        return this.Hs(n, (t, e) => {
            s.push(e);
        }).next(() => s);
    }
    Ys(t, e) {
        m("SimpleDb", "DELETE ALL", this.store.name);
        const n = this.options(t, e);
        n.Js = !1;
        const s = this.cursor(n);
        return this.Hs(s, (t, e, n) => n.delete());
    }
    Xs(t, e) {
        let n;
        e ? n = t : (n = {}, e = t);
        const s = this.cursor(n);
        return this.Hs(s, e);
    }
    /**
     * Iterates over a store, but waits for the given callback to complete for
     * each entry before iterating the next entry. This allows the callback to do
     * asynchronous work to determine if this iteration should continue.
     *
     * The provided callback should return `true` to continue iteration, and
     * `false` otherwise.
     */    Zs(t) {
        const e = this.cursor({});
        return new ss((n, s) => {
            e.onerror = t => {
                const e = As(t.target.error);
                s(e);
            }, e.onsuccess = e => {
                const s = e.target.result;
                s ? t(s.primaryKey, s.value).next(t => {
                    t ? s.continue() : n();
                }) : n();
            };
        });
    }
    Hs(t, e) {
        const n = [];
        return new ss((s, i) => {
            t.onerror = t => {
                i(t.target.error);
            }, t.onsuccess = t => {
                const i = t.target.result;
                if (!i) return void s();
                const r = new fs(i), o = e(i.primaryKey, i.value, r);
                if (o instanceof ss) {
                    const t = o.catch(t => (r.done(), ss.reject(t)));
                    n.push(t);
                }
                r.gn ? s() : null === r.js ? i.continue() : i.continue(r.js);
            };
        }).next(() => ss.Dn(n));
    }
    options(t, e) {
        let n = void 0;
        return void 0 !== t && ("string" == typeof t ? n = t : e = t), {
            index: n,
            range: e
        };
    }
    cursor(t) {
        let e = "next";
        if (t.reverse && (e = "prev"), t.index) {
            const n = this.store.index(t.index);
            return t.Js ? n.openKeyCursor(t.range, e) : n.openCursor(t.range, e);
        }
        return this.store.openCursor(t.range, e);
    }
}

/**
 * Wraps an IDBRequest in a PersistencePromise, using the onsuccess / onerror
 * handlers to resolve / reject the PersistencePromise as appropriate.
 */ function Is(t) {
    return new ss((e, n) => {
        t.onsuccess = t => {
            const n = t.target.result;
            e(n);
        }, t.onerror = t => {
            const e = As(t.target.error);
            n(e);
        };
    });
}

// Guard so we only report the error once.
let ms = !1;

function As(t) {
    const e = _s.Ns(i());
    if (e >= 12.2 && e < 13) {
        const e = "An internal error was encountered in the Indexed Database server";
        if (t.message.indexOf(e) >= 0) {
            // Wrap error in a more descriptive one.
            const t = new O("internal", `IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${e}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);
            return ms || (ms = !0, 
            // Throw a global exception outside of this promise chain, for the user to
            // potentially catch.
            setTimeout(() => {
                throw t;
            }, 0)), t;
        }
    }
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
/** The Platform's 'window' implementation or null if not available. */ function Rs() {
    // `window` is not always available, e.g. in ReactNative and WebWorkers.
    // eslint-disable-next-line no-restricted-globals
    return "undefined" != typeof window ? window : null;
}

/** The Platform's 'document' implementation or null if not available. */ function Ps() {
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
class Vs {
    constructor(t, e, n, s, i) {
        this.ti = t, this.Is = e, this.ei = n, this.op = s, this.ni = i, this.si = new us, 
        this.then = this.si.promise.then.bind(this.si.promise), 
        // It's normal for the deferred promise to be canceled (due to cancellation)
        // and so we attach a dummy catch callback to avoid
        // 'UnhandledPromiseRejectionWarning' log spam.
        this.si.promise.catch(t => {});
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
     */    static ii(t, e, n, s, i) {
        const r = Date.now() + n, o = new Vs(t, e, r, s, i);
        return o.start(n), o;
    }
    /**
     * Starts the timer. This is called immediately after construction by
     * createAndSchedule().
     */    start(t) {
        this.ri = setTimeout(() => this.oi(), t);
    }
    /**
     * Queues the operation to run immediately (if it hasn't already been run or
     * canceled).
     */    Ds() {
        return this.oi();
    }
    /**
     * Cancels the operation if it hasn't already been executed or canceled. The
     * promise will be rejected.
     *
     * As long as the operation has not yet been run, calling cancel() provides a
     * guarantee that the operation will not be run.
     */    cancel(t) {
        null !== this.ri && (this.clearTimeout(), this.si.reject(new O(M.CANCELLED, "Operation cancelled" + (t ? ": " + t : ""))));
    }
    oi() {
        this.ti.hi(() => null !== this.ri ? (this.clearTimeout(), this.op().then(t => this.si.resolve(t))) : Promise.resolve());
    }
    clearTimeout() {
        null !== this.ri && (this.ni(this), clearTimeout(this.ri), this.ri = null);
    }
}

class gs {
    constructor() {
        // The last promise in the queue.
        this.ai = Promise.resolve(), 
        // A list of retryable operations. Retryable operations are run in order and
        // retried with backoff.
        this.ci = [], 
        // Is this AsyncQueue being shut down? Once it is set to true, it will not
        // be changed again.
        this.ui = !1, 
        // Operations scheduled to be queued in the future. Operations are
        // automatically removed after they are run or canceled.
        this.li = [], 
        // visible for testing
        this._i = null, 
        // Flag set while there's an outstanding AsyncQueue operation, used for
        // assertion sanity-checks.
        this.fi = !1, 
        // List of TimerIds to fast-forward delays for.
        this.di = [], 
        // Backoff timer used to schedule retries for retryable operations
        this.wi = new ls(this, "async_queue_retry" /* AsyncQueueRetry */), 
        // Visibility handler that triggers an immediate retry of all retryable
        // operations. Meant to speed up recovery when we regain file system access
        // after page comes into foreground.
        this.Ti = () => {
            const t = Ps();
            t && m("AsyncQueue", "Visibility state changed to  ", t.visibilityState), this.wi.Ss();
        };
        const t = Ps();
        t && "function" == typeof t.addEventListener && t.addEventListener("visibilitychange", this.Ti);
    }
    // Is this AsyncQueue being shut down? If true, this instance will not enqueue
    // any new operations, Promises from enqueue requests will not resolve.
    get Ei() {
        return this.ui;
    }
    /**
     * Adds a new operation to the queue without waiting for it to complete (i.e.
     * we ignore the Promise result).
     */    hi(t) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.enqueue(t);
    }
    /**
     * Regardless if the queue has initialized shutdown, adds a new operation to the
     * queue without waiting for it to complete (i.e. we ignore the Promise result).
     */    Ii(t) {
        this.mi(), 
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.Ai(t);
    }
    /**
     * Initialize the shutdown of this queue. Once this method is called, the
     * only possible way to request running an operation is through
     * `enqueueEvenWhileRestricted()`.
     */    Ri() {
        if (!this.ui) {
            this.ui = !0;
            const t = Ps();
            t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.Ti);
        }
    }
    /**
     * Adds a new operation to the queue. Returns a promise that will be resolved
     * when the promise returned by the new operation is (with its value).
     */    enqueue(t) {
        return this.mi(), this.ui ? new Promise(t => {}) : this.Ai(t);
    }
    /**
     * Enqueue a retryable operation.
     *
     * A retryable operation is rescheduled with backoff if it fails with a
     * IndexedDbTransactionError (the error type used by SimpleDb). All
     * retryable operations are executed in order and only run if all prior
     * operations were retried successfully.
     */    Pi(t) {
        this.ci.push(t), this.hi(() => this.Vi());
    }
    /**
     * Runs the next operation from the retryable queue. If the operation fails,
     * reschedules with backoff.
     */    async Vi() {
        if (0 !== this.ci.length) {
            try {
                await this.ci[0](), this.ci.shift(), this.wi.reset();
            } catch (t) {
                if (!ws(t)) throw t;
 // Failure will be handled by AsyncQueue
                                m("AsyncQueue", "Operation failed with retryable error: " + t);
            }
            this.ci.length > 0 && 
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
            this.wi.ps(() => this.Vi());
        }
    }
    Ai(t) {
        const e = this.ai.then(() => (this.fi = !0, t().catch(t => {
            this._i = t, this.fi = !1;
            // Re-throw the error so that this.tail becomes a rejected Promise and
            // all further attempts to chain (via .then) will just short-circuit
            // and return the rejected Promise.
            throw A("INTERNAL UNHANDLED ERROR: ", 
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
        }).then(t => (this.fi = !1, t))));
        return this.ai = e, e;
    }
    /**
     * Schedules an operation to be queued on the AsyncQueue once the specified
     * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
     * or fast-forward the operation prior to its running.
     */    vs(t, e, n) {
        this.mi(), 
        // Fast-forward delays for timerIds that have been overriden.
        this.di.indexOf(t) > -1 && (e = 0);
        const s = Vs.ii(this, t, e, n, t => this.gi(t));
        return this.li.push(s), s;
    }
    mi() {
        this._i && V();
    }
    /**
     * Verifies there's an operation currently in-progress on the AsyncQueue.
     * Unfortunately we can't verify that the running code is in the promise chain
     * of that operation, so this isn't a foolproof check, but it should be enough
     * to catch some bugs.
     */    yi() {}
    /**
     * Waits until all currently queued tasks are finished executing. Delayed
     * operations are not run.
     */    async pi() {
        // Operations in the queue prior to draining may have enqueued additional
        // operations. Keep draining the queue until the tail is no longer advanced,
        // which indicates that no more new operations were enqueued and that all
        // operations were executed.
        let t;
        do {
            t = this.ai, await t;
        } while (t !== this.ai);
    }
    /**
     * For Tests: Determine if a delayed operation with a particular TimerId
     * exists.
     */    bi(t) {
        for (const e of this.li) if (e.Is === t) return !0;
        return !1;
    }
    /**
     * For Tests: Runs some or all delayed operations early.
     *
     * @param lastTimerId Delayed operations up to and including this TimerId will
     *  be drained. Pass TimerId.All to run all delayed operations.
     * @returns a Promise that resolves once all operations have been run.
     */    vi(t) {
        // Note that draining may generate more delayed ops, so we do that first.
        return this.pi().then(() => {
            // Run ops in the same order they'd run if they ran naturally.
            this.li.sort((t, e) => t.ei - e.ei);
            for (const e of this.li) if (e.Ds(), "all" /* All */ !== t && e.Is === t) break;
            return this.pi();
        });
    }
    /**
     * For Tests: Skip all subsequent delays for a timer id.
     */    Si(t) {
        this.di.push(t);
    }
    /** Called once a DelayedOperation is run or canceled. */    gi(t) {
        // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
        const e = this.li.indexOf(t);
        this.li.splice(e, 1);
    }
}

/**
 * Returns a FirestoreError that can be surfaced to the user if the provided
 * error is an IndexedDbTransactionError. Re-throws the error otherwise.
 */ function ys(t, e) {
    if (A("AsyncQueue", `${e}: ${t}`), ws(t)) return new O(M.UNAVAILABLE, `${e}: ${t}`);
    throw t;
}

function ps([t, e], [n, s]) {
    const i = v(t, n);
    return 0 === i ? v(e, s) : i;
}

/**
 * Used to calculate the nth sequence number. Keeps a rolling buffer of the
 * lowest n values passed to `addElement`, and finally reports the largest of
 * them in `maxValue`.
 */ class bs {
    constructor(t) {
        this.Di = t, this.buffer = new _t(ps), this.Ci = 0;
    }
    Ni() {
        return ++this.Ci;
    }
    Fi(t) {
        const e = [ t, this.Ni() ];
        if (this.buffer.size < this.Di) this.buffer = this.buffer.add(e); else {
            const t = this.buffer.last();
            ps(e, t) < 0 && (this.buffer = this.buffer.delete(t).add(e));
        }
    }
    get maxValue() {
        // Guaranteed to be non-empty. If we decide we are not collecting any
        // sequence numbers, nthSequenceNumber below short-circuits. If we have
        // decided that we are collecting n sequence numbers, it's because n is some
        // percentage of the existing sequence numbers. That means we should never
        // be in a situation where we are collecting sequence numbers but don't
        // actually have any.
        return this.buffer.last()[0];
    }
}

const vs = {
    ki: !1,
    xi: 0,
    $i: 0,
    Mi: 0
};

class Ss {
    constructor(
    // When we attempt to collect, we will only do so if the cache size is greater than this
    // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
    t, 
    // The percentage of sequence numbers that we will attempt to collect
    e, 
    // A cap on the total number of sequence numbers that will be collected. This prevents
    // us from collecting a huge number of sequence numbers if the cache has grown very large.
    n) {
        this.Oi = t, this.Li = e, this.qi = n;
    }
    static Bi(t) {
        return new Ss(t, Ss.Ui, Ss.Wi);
    }
}

Ss.Qi = -1, Ss.ji = 1048576, Ss.Ki = 41943040, Ss.Ui = 10, Ss.Wi = 1e3, Ss.Gi = new Ss(Ss.Ki, Ss.Ui, Ss.Wi), 
Ss.zi = new Ss(Ss.Qi, 0, 0);

/**
 * This class is responsible for the scheduling of LRU garbage collection. It handles checking
 * whether or not GC is enabled, as well as which delay to use before the next run.
 */
class Ds {
    constructor(t, e) {
        this.Hi = t, this.ti = e, this.Yi = !1, this.Ji = null;
    }
    start(t) {
        this.Hi.params.Oi !== Ss.Qi && this.Xi(t);
    }
    stop() {
        this.Ji && (this.Ji.cancel(), this.Ji = null);
    }
    get Zi() {
        return null !== this.Ji;
    }
    Xi(t) {
        const e = this.Yi ? 3e5 : 6e4;
        m("LruGarbageCollector", `Garbage collection scheduled in ${e}ms`), this.Ji = this.ti.vs("lru_garbage_collection" /* LruGarbageCollection */ , e, async () => {
            this.Ji = null, this.Yi = !0;
            try {
                await t.tr(this.Hi);
            } catch (t) {
                ws(t) ? m("LruGarbageCollector", "Ignoring IndexedDB error during garbage collection: ", t) : await Li(t);
            }
            await this.Xi(t);
        });
    }
}

/** Implements the steps for LRU garbage collection. */ class Cs {
    constructor(t, e) {
        this.er = t, this.params = e;
    }
    /** Given a percentile of target to collect, returns the number of targets to collect. */    nr(t, e) {
        return this.er.sr(t).next(t => Math.floor(e / 100 * t));
    }
    /** Returns the nth sequence number, counting in order from the smallest. */    ir(t, e) {
        if (0 === e) return ss.resolve(cs.Ts);
        const n = new bs(e);
        return this.er.pe(t, t => n.Fi(t.sequenceNumber)).next(() => this.er.rr(t, t => n.Fi(t))).next(() => n.maxValue);
    }
    /**
     * Removes targets with a sequence number equal to or less than the given upper bound, and removes
     * document associations with those targets.
     */    or(t, e, n) {
        return this.er.or(t, e, n);
    }
    /**
     * Removes documents that have a sequence number equal to or less than the upper bound and are not
     * otherwise pinned.
     */    hr(t, e) {
        return this.er.hr(t, e);
    }
    ar(t, e) {
        return this.params.Oi === Ss.Qi ? (m("LruGarbageCollector", "Garbage collection skipped; disabled"), 
        ss.resolve(vs)) : this.cr(t).next(n => n < this.params.Oi ? (m("LruGarbageCollector", `Garbage collection skipped; Cache size ${n} is lower than threshold ` + this.params.Oi), 
        vs) : this.ur(t, e));
    }
    cr(t) {
        return this.er.cr(t);
    }
    ur(t, e) {
        let s, i, r, o, h, a, c;
        const u = Date.now();
        return this.nr(t, this.params.Li).next(e => (
        // Cap at the configured max
        e > this.params.qi ? (m("LruGarbageCollector", `Capping sequence numbers to collect down to the maximum of ${this.params.qi} from ` + e), 
        i = this.params.qi) : i = e, o = Date.now(), this.ir(t, i))).next(n => (s = n, h = Date.now(), 
        this.or(t, s, e))).next(e => (r = e, a = Date.now(), this.hr(t, s))).next(t => {
            if (c = Date.now(), I() <= n.DEBUG) {
                m("LruGarbageCollector", `LRU Garbage Collection\n\tCounted targets in ${o - u}ms\n\tDetermined least recently used ${i} in ` + (h - o) + "ms\n" + `\tRemoved ${r} targets in ` + (a - h) + "ms\n" + `\tRemoved ${t} documents in ` + (c - a) + "ms\n" + `Total Duration: ${c - u}ms`);
            }
            return ss.resolve({
                ki: !0,
                xi: i,
                $i: r,
                Mi: t
            });
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
 * Encodes a resource path into a IndexedDb-compatible string form.
 */
function Ns(t) {
    let e = "";
    for (let n = 0; n < t.length; n++) e.length > 0 && (e = ks(e)), e = Fs(t.get(n), e);
    return ks(e);
}

/** Encodes a single segment of a resource path into the given result */ function Fs(t, e) {
    let n = e;
    const s = t.length;
    for (let e = 0; e < s; e++) {
        const s = t.charAt(e);
        switch (s) {
          case "\0":
            n += "";
            break;

          case "":
            n += "";
            break;

          default:
            n += s;
        }
    }
    return n;
}

/** Encodes a path separator into the given result */ function ks(t) {
    return t + "";
}

/**
 * Decodes the given IndexedDb-compatible string form of a resource path into
 * a ResourcePath instance. Note that this method is not suitable for use with
 * decoding resource names from the server; those are One Platform format
 * strings.
 */ function xs(t) {
    // Event the empty path must encode as a path of at least length 2. A path
    // with exactly 2 must be the empty path.
    const e = t.length;
    if (g(e >= 2), 2 === e) return g("" === t.charAt(0) && "" === t.charAt(1)), U.$();
    // Escape characters cannot exist past the second-to-last position in the
    // source value.
        const n = e - 2, s = [];
    let i = "";
    for (let r = 0; r < e; ) {
        // The last two characters of a valid encoded path must be a separator, so
        // there must be an end to this segment.
        const e = t.indexOf("", r);
        (e < 0 || e > n) && V();
        switch (t.charAt(e + 1)) {
          case "":
            const n = t.substring(r, e);
            let o;
            0 === i.length ? 
            // Avoid copying for the common case of a segment that excludes \0
            // and \001
            o = n : (i += n, o = i, i = ""), s.push(o);
            break;

          case "":
            i += t.substring(r, e), i += "\0";
            break;

          case "":
            // The escape character can be used in the output to encode itself.
            i += t.substring(r, e + 1);
            break;

          default:
            V();
        }
        r = e + 2;
    }
    return new U(s);
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
/** Serializer for values stored in the LocalStore. */ class $s {
    constructor(t) {
        this.lr = t;
    }
}

/** Decodes a remote document from storage locally to a Document. */ function Ms(t, e) {
    if (e.document) return function(t, e, n) {
        const s = de(t, e.name), i = ue(e.updateTime), r = new Tn({
            mapValue: {
                fields: e.fields
            }
        });
        return new An(s, i, r, {
            hasCommittedMutations: !!n
        });
    }(t.lr, e.document, !!e.hasCommittedMutations);
    if (e.noDocument) {
        const t = j.j(e.noDocument.path), n = Us(e.noDocument.readTime);
        return new Rn(t, n, {
            hasCommittedMutations: !!e.hasCommittedMutations
        });
    }
    if (e.unknownDocument) {
        const t = j.j(e.unknownDocument.path), n = Us(e.unknownDocument.version);
        return new Pn(t, n);
    }
    return V();
}

/** Encodes a document for storage locally. */ function Os(t, e, n) {
    const s = Ls(n), i = e.key.path.p().N();
    if (e instanceof An) {
        const n = function(t, e) {
            return {
                name: fe(t, e.key),
                fields: e.Ze().mapValue.fields,
                updateTime: he(t, e.version.A())
            };
        }(t.lr, e), r = e.hasCommittedMutations;
        return new fi(
        /* unknownDocument= */ null, 
        /* noDocument= */ null, n, r, s, i);
    }
    if (e instanceof Rn) {
        const t = e.key.path.N(), n = Bs(e.version), r = e.hasCommittedMutations;
        return new fi(
        /* unknownDocument= */ null, new li(t, n), 
        /* document= */ null, r, s, i);
    }
    if (e instanceof Pn) {
        const t = e.key.path.N(), n = Bs(e.version);
        return new fi(new _i(t, n), 
        /* noDocument= */ null, 
        /* document= */ null, 
        /* hasCommittedMutations= */ !0, s, i);
    }
    return V();
}

function Ls(t) {
    const e = t.A();
    return [ e.seconds, e.nanoseconds ];
}

function qs(t) {
    const e = new L(t[0], t[1]);
    return q.I(e);
}

function Bs(t) {
    const e = t.A();
    return new oi(e.seconds, e.nanoseconds);
}

function Us(t) {
    const e = new L(t.seconds, t.nanoseconds);
    return q.I(e);
}

/** Encodes a batch of mutations into a DbMutationBatch for local storage. */
/** Decodes a DbMutationBatch into a MutationBatch */
function Ws(t, e) {
    const n = (e.baseMutations || []).map(e => Ve(t.lr, e)), s = e.mutations.map(e => Ve(t.lr, e)), i = L.fromMillis(e.localWriteTimeMs);
    return new es(e.batchId, i, n, s);
}

/** Decodes a DbTarget into TargetData */ function Qs(t) {
    const e = Us(t.readTime), n = void 0 !== t.lastLimboFreeSnapshotVersion ? Us(t.lastLimboFreeSnapshotVersion) : q.min();
    let s;
    var i;
    return void 0 !== t.query.documents ? (g(1 === (i = t.query).documents.length), 
    s = Sn(pn(Te(i.documents[0])))) : s = be(t.query), new st(s, t.targetId, 0 /* Listen */ , t.lastListenSequenceNumber, e, n, nt.fromBase64String(t.resumeToken));
}

/** Encodes TargetData into a DbTarget for storage locally. */ function js(t, e) {
    const n = Bs(e.X), s = Bs(e.lastLimboFreeSnapshotVersion);
    let i;
    i = tt(e.target) ? ye(t.lr, e.target) : pe(t.lr, e.target);
    // We can't store the resumeToken as a ByteString in IndexedDb, so we
    // convert it to a base64 string for storage.
        const r = e.resumeToken.toBase64();
    // lastListenSequenceNumber is always 0 until we do real GC.
        return new wi(e.targetId, J(e.target), n, r, e.sequenceNumber, s, i);
}

/**
 * A helper function for figuring out what kind of query has been stored.
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
/** A mutation queue for a specific user, backed by IndexedDB. */
class Ks {
    constructor(
    /**
     * The normalized userId (e.g. null UID => "" userId) used to store /
     * retrieve mutations.
     */
    t, e, n, s) {
        this.userId = t, this.serializer = e, this.Gn = n, this._r = s, 
        /**
         * Caches the document keys for pending mutation batches. If the mutation
         * has been removed from IndexedDb, the cached value may continue to
         * be used to retrieve the batch's document keys. To remove a cached value
         * locally, `removeCachedMutationKeys()` should be invoked either directly
         * or through `removeMutationBatches()`.
         *
         * With multi-tab, when the primary client acknowledges or rejects a mutation,
         * this cache is used by secondary clients to invalidate the local
         * view of the documents that were previously affected by the mutation.
         */
        // PORTING NOTE: Multi-tab only.
        this.dr = {};
    }
    /**
     * Creates a new mutation queue for the given user.
     * @param user The user for which to create a mutation queue.
     * @param serializer The serializer to use when persisting to IndexedDb.
     */    static wr(t, e, n, s) {
        // TODO(mcg): Figure out what constraints there are on userIDs
        // In particular, are there any reserved characters? are empty ids allowed?
        // For the moment store these together in the same mutations table assuming
        // that empty userIDs aren't allowed.
        g("" !== t.uid);
        const i = t.Tr() ? t.uid : "";
        return new Ks(i, e, n, s);
    }
    Er(t) {
        let e = !0;
        const n = IDBKeyRange.bound([ this.userId, Number.NEGATIVE_INFINITY ], [ this.userId, Number.POSITIVE_INFINITY ]);
        return Hs(t).Xs({
            index: ci.userMutationsIndex,
            range: n
        }, (t, n, s) => {
            e = !1, s.done();
        }).next(() => e);
    }
    Ir(t, e, n, s) {
        const i = Ys(t), r = Hs(t);
        // The IndexedDb implementation in Chrome (and Firefox) does not handle
        // compound indices that include auto-generated keys correctly. To ensure
        // that the index entry is added correctly in all browsers, we perform two
        // writes: The first write is used to retrieve the next auto-generated Batch
        // ID, and the second write populates the index and stores the actual
        // mutation batch.
        // See: https://bugs.chromium.org/p/chromium/issues/detail?id=701972
        // We write an empty object to obtain key
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return r.add({}).next(o => {
            g("number" == typeof o);
            const h = new es(o, e, n, s), a = function(t, e, n) {
                const s = n.baseMutations.map(e => Pe(t.lr, e)), i = n.mutations.map(e => Pe(t.lr, e));
                return new ci(e, n.batchId, n.wn.toMillis(), s, i);
            }(this.serializer, this.userId, h), c = [];
            let u = new _t((t, e) => v(t.F(), e.F()));
            for (const t of s) {
                const e = ui.key(this.userId, t.key.path, o);
                u = u.add(t.key.path.p()), c.push(r.put(a)), c.push(i.put(e, ui.PLACEHOLDER));
            }
            return u.forEach(e => {
                c.push(this.Gn.mr(t, e));
            }), t.Wn(() => {
                this.dr[o] = h.keys();
            }), ss.Dn(c).next(() => h);
        });
    }
    Ar(t, e) {
        return Hs(t).get(e).next(t => t ? (g(t.userId === this.userId), Ws(this.serializer, t)) : null);
    }
    /**
     * Returns the document keys for the mutation batch with the given batchId.
     * For primary clients, this method returns `null` after
     * `removeMutationBatches()` has been called. Secondary clients return a
     * cached result until `removeCachedMutationKeys()` is invoked.
     */
    // PORTING NOTE: Multi-tab only.
    Rr(t, e) {
        return this.dr[e] ? ss.resolve(this.dr[e]) : this.Ar(t, e).next(t => {
            if (t) {
                const n = t.keys();
                return this.dr[e] = n, n;
            }
            return null;
        });
    }
    Pr(t, e) {
        const n = e + 1, s = IDBKeyRange.lowerBound([ this.userId, n ]);
        let i = null;
        return Hs(t).Xs({
            index: ci.userMutationsIndex,
            range: s
        }, (t, e, s) => {
            e.userId === this.userId && (g(e.batchId >= n), i = Ws(this.serializer, e)), s.done();
        }).next(() => i);
    }
    Vr(t) {
        const e = IDBKeyRange.upperBound([ this.userId, Number.POSITIVE_INFINITY ]);
        let n = -1;
        return Hs(t).Xs({
            index: ci.userMutationsIndex,
            range: e,
            reverse: !0
        }, (t, e, s) => {
            n = e.batchId, s.done();
        }).next(() => n);
    }
    gr(t) {
        const e = IDBKeyRange.bound([ this.userId, -1 ], [ this.userId, Number.POSITIVE_INFINITY ]);
        return Hs(t).zs(ci.userMutationsIndex, e).next(t => t.map(t => Ws(this.serializer, t)));
    }
    Hn(t, e) {
        // Scan the document-mutation index starting with a prefix starting with
        // the given documentKey.
        const n = ui.prefixForPath(this.userId, e.path), s = IDBKeyRange.lowerBound(n), i = [];
        return Ys(t).Xs({
            range: s
        }, (n, s, r) => {
            const [o, h, a] = n, c = xs(h);
            // Only consider rows matching exactly the specific key of
            // interest. Note that because we order by path first, and we
            // order terminators before path separators, we'll encounter all
            // the index rows for documentKey contiguously. In particular, all
            // the rows for documentKey will occur before any rows for
            // documents nested in a subcollection beneath documentKey so we
            // can stop as soon as we hit any such row.
                        if (o === this.userId && e.path.isEqual(c)) 
            // Look up the mutation batch in the store.
            return Hs(t).get(a).next(t => {
                if (!t) throw V();
                g(t.userId === this.userId), i.push(Ws(this.serializer, t));
            });
            r.done();
        }).next(() => i);
    }
    ts(t, e) {
        let n = new _t(v);
        const s = [];
        return e.forEach(e => {
            const i = ui.prefixForPath(this.userId, e.path), r = IDBKeyRange.lowerBound(i), o = Ys(t).Xs({
                range: r
            }, (t, s, i) => {
                const [r, o, h] = t, a = xs(o);
                // Only consider rows matching exactly the specific key of
                // interest. Note that because we order by path first, and we
                // order terminators before path separators, we'll encounter all
                // the index rows for documentKey contiguously. In particular, all
                // the rows for documentKey will occur before any rows for
                // documents nested in a subcollection beneath documentKey so we
                // can stop as soon as we hit any such row.
                                r === this.userId && e.path.isEqual(a) ? n = n.add(h) : i.done();
            });
            s.push(o);
        }), ss.Dn(s).next(() => this.yr(t, n));
    }
    hs(t, e) {
        const n = e.path, s = n.length + 1, i = ui.prefixForPath(this.userId, n), r = IDBKeyRange.lowerBound(i);
        // Collect up unique batchIDs encountered during a scan of the index. Use a
        // SortedSet to accumulate batch IDs so they can be traversed in order in a
        // scan of the main table.
        let o = new _t(v);
        return Ys(t).Xs({
            range: r
        }, (t, e, i) => {
            const [r, h, a] = t, c = xs(h);
            r === this.userId && n.D(c) ? 
            // Rows with document keys more than one segment longer than the
            // query path can't be matches. For example, a query on 'rooms'
            // can't match the document /rooms/abc/messages/xyx.
            // TODO(mcg): we'll need a different scanner when we implement
            // ancestor queries.
            c.length === s && (o = o.add(a)) : i.done();
        }).next(() => this.yr(t, o));
    }
    yr(t, e) {
        const n = [], s = [];
        // TODO(rockwood): Implement this using iterate.
        return e.forEach(e => {
            s.push(Hs(t).get(e).next(t => {
                if (null === t) throw V();
                g(t.userId === this.userId), n.push(Ws(this.serializer, t));
            }));
        }), ss.Dn(s).next(() => n);
    }
    pr(t, e) {
        return zs(t.br, this.userId, e).next(n => (t.Wn(() => {
            this.vr(e.batchId);
        }), ss.forEach(n, e => this._r.Sr(t, e))));
    }
    /**
     * Clears the cached keys for a mutation batch. This method should be
     * called by secondary clients after they process mutation updates.
     *
     * Note that this method does not have to be called from primary clients as
     * the corresponding cache entries are cleared when an acknowledged or
     * rejected batch is removed from the mutation queue.
     */
    // PORTING NOTE: Multi-tab only
    vr(t) {
        delete this.dr[t];
    }
    Dr(t) {
        return this.Er(t).next(e => {
            if (!e) return ss.resolve();
            // Verify that there are no entries in the documentMutations index if
            // the queue is empty.
                        const n = IDBKeyRange.lowerBound(ui.prefixForUser(this.userId)), s = [];
            return Ys(t).Xs({
                range: n
            }, (t, e, n) => {
                if (t[0] === this.userId) {
                    const e = xs(t[1]);
                    s.push(e);
                } else n.done();
            }).next(() => {
                g(0 === s.length);
            });
        });
    }
    Cr(t, e) {
        return Gs(t, this.userId, e);
    }
    // PORTING NOTE: Multi-tab only (state is held in memory in other clients).
    /** Returns the mutation queue's metadata from IndexedDb. */
    Nr(t) {
        return Js(t).get(this.userId).next(t => t || new ai(this.userId, -1, 
        /*lastStreamToken=*/ ""));
    }
}

/**
 * @return true if the mutation queue for the given user contains a pending
 *         mutation for the given key.
 */ function Gs(t, e, n) {
    const s = ui.prefixForPath(e, n.path), i = s[1], r = IDBKeyRange.lowerBound(s);
    let o = !1;
    return Ys(t).Xs({
        range: r,
        Js: !0
    }, (t, n, s) => {
        const [r, h, /*batchID*/ a] = t;
        r === e && h === i && (o = !0), s.done();
    }).next(() => o);
}

/** Returns true if any mutation queue contains the given document. */
/**
 * Delete a mutation batch and the associated document mutations.
 * @return A PersistencePromise of the document mutations that were removed.
 */
function zs(t, e, n) {
    const s = t.store(ci.store), i = t.store(ui.store), r = [], o = IDBKeyRange.only(n.batchId);
    let h = 0;
    const a = s.Xs({
        range: o
    }, (t, e, n) => (h++, n.delete()));
    r.push(a.next(() => {
        g(1 === h);
    }));
    const c = [];
    for (const t of n.mutations) {
        const s = ui.key(e, t.key.path, n.batchId);
        r.push(i.delete(s)), c.push(t.key);
    }
    return ss.Dn(r).next(() => c);
}

/**
 * Helper to get a typed SimpleDbStore for the mutations object store.
 */ function Hs(t) {
    return Ci.Ms(t, ci.store);
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */ function Ys(t) {
    return Ci.Ms(t, ui.store);
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */ function Js(t) {
    return Ci.Ms(t, ai.store);
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
 */ class Xs {
    /**
     * @param {LocalSerializer} serializer The document serializer.
     * @param {IndexManager} indexManager The query indexes that need to be maintained.
     */
    constructor(t, e) {
        this.serializer = t, this.Gn = e;
    }
    /**
     * Adds the supplied entries to the cache.
     *
     * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
     */    xn(t, e, n) {
        return ti(t).put(ei(e), n);
    }
    /**
     * Removes a document from the cache.
     *
     * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
     */    Mn(t, e) {
        const n = ti(t), s = ei(e);
        return n.delete(s);
    }
    /**
     * Updates the current cache size.
     *
     * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
     * cache's metadata.
     */    updateMetadata(t, e) {
        return this.getMetadata(t).next(n => (n.byteSize += e, this.Fr(t, n)));
    }
    On(t, e) {
        return ti(t).get(ei(e)).next(t => this.kr(t));
    }
    /**
     * Looks up an entry in the cache.
     *
     * @param documentKey The key of the entry to look up.
     * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
     */    xr(t, e) {
        return ti(t).get(ei(e)).next(t => {
            const e = this.kr(t);
            return e ? {
                $r: e,
                size: ni(t)
            } : null;
        });
    }
    getEntries(t, e) {
        let n = Tt();
        return this.Mr(t, e, (t, e) => {
            const s = this.kr(e);
            n = n.nt(t, s);
        }).next(() => n);
    }
    /**
     * Looks up several entries in the cache.
     *
     * @param documentKeys The set of keys entries to look up.
     * @return A map of MaybeDocuments indexed by key (if a document cannot be
     *     found, the key will be mapped to null) and a map of sizes indexed by
     *     key (zero if the key cannot be found).
     */    Or(t, e) {
        let n = Tt(), s = new ct(j.P);
        return this.Mr(t, e, (t, e) => {
            const i = this.kr(e);
            i ? (n = n.nt(t, i), s = s.nt(t, ni(e))) : (n = n.nt(t, null), s = s.nt(t, 0));
        }).next(() => ({
            Lr: n,
            qr: s
        }));
    }
    Mr(t, e, n) {
        if (e._()) return ss.resolve();
        const s = IDBKeyRange.bound(e.first().path.N(), e.last().path.N()), i = e.at();
        let r = i.dt();
        return ti(t).Xs({
            range: s
        }, (t, e, s) => {
            const o = j.j(t);
            // Go through keys not found in cache.
                        for (;r && j.P(r, o) < 0; ) n(r, null), r = i.dt();
            r && r.isEqual(o) && (
            // Key found in cache.
            n(r, e), r = i.wt() ? i.dt() : null), 
            // Skip to the next key (if there is one).
            r ? s.Ks(r.path.N()) : s.done();
        }).next(() => {
            // The rest of the keys are not in the cache. One case where `iterate`
            // above won't go through them is when the cache is empty.
            for (;r; ) n(r, null), r = i.wt() ? i.dt() : null;
        });
    }
    es(t, e, n) {
        let s = It();
        const i = e.path.length + 1, r = {};
        if (n.isEqual(q.min())) {
            // Documents are ordered by key, so we can use a prefix scan to narrow
            // down the documents we need to match the query against.
            const t = e.path.N();
            r.range = IDBKeyRange.lowerBound(t);
        } else {
            // Execute an index-free query and filter by read time. This is safe
            // since all document changes to queries that have a
            // lastLimboFreeSnapshotVersion (`sinceReadTime`) have a read time set.
            const t = e.path.N(), s = Ls(n);
            r.range = IDBKeyRange.lowerBound([ t, s ], 
            /* open= */ !0), r.index = fi.collectionReadTimeIndex;
        }
        return ti(t).Xs(r, (t, n, r) => {
            // The query is actually returning any path that starts with the query
            // path prefix which may include documents in subcollections. For
            // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
            // shouldn't match it. Fix this by discarding rows with document keys
            // more than one segment longer than the query path.
            if (t.length !== i) return;
            const o = Ms(this.serializer, n);
            e.path.D(o.key.path) ? o instanceof An && $n(e, o) && (s = s.nt(o.key, o)) : r.done();
        }).next(() => s);
    }
    /**
     * Returns the set of documents that have changed since the specified read
     * time.
     */
    // PORTING NOTE: This is only used for multi-tab synchronization.
    Br(t, e) {
        let n = wt(), s = Ls(e);
        const i = ti(t), r = IDBKeyRange.lowerBound(s, !0);
        return i.Xs({
            index: fi.readTimeIndex,
            range: r
        }, (t, e) => {
            // Unlike `getEntry()` and others, `getNewDocumentChanges()` parses
            // the documents directly since we want to keep sentinel deletes.
            const i = Ms(this.serializer, e);
            n = n.nt(i.key, i), s = e.readTime;
        }).next(() => ({
            Ur: n,
            readTime: qs(s)
        }));
    }
    /**
     * Returns the read time of the most recently read document in the cache, or
     * SnapshotVersion.min() if not available.
     */
    // PORTING NOTE: This is only used for multi-tab synchronization.
    Wr(t) {
        const e = ti(t);
        // If there are no existing entries, we return SnapshotVersion.min().
                let n = q.min();
        return e.Xs({
            index: fi.readTimeIndex,
            reverse: !0
        }, (t, e, s) => {
            e.readTime && (n = qs(e.readTime)), s.done();
        }).next(() => n);
    }
    Qr(t) {
        return new Xs.jr(this, !!t && t.Kr);
    }
    Gr(t) {
        return this.getMetadata(t).next(t => t.byteSize);
    }
    getMetadata(t) {
        return Zs(t).get(di.key).next(t => (g(!!t), t));
    }
    Fr(t, e) {
        return Zs(t).put(di.key, e);
    }
    /**
     * Decodes `remoteDoc` and returns the document (or null, if the document
     * corresponds to the format used for sentinel deletes).
     */    kr(t) {
        if (t) {
            const e = Ms(this.serializer, t);
            return e instanceof Rn && e.version.isEqual(q.min()) ? null : e;
        }
        return null;
    }
}

/**
 * Handles the details of adding and updating documents in the IndexedDbRemoteDocumentCache.
 *
 * Unlike the MemoryRemoteDocumentChangeBuffer, the IndexedDb implementation computes the size
 * delta for all submitted changes. This avoids having to re-read all documents from IndexedDb
 * when we apply the changes.
 */ function Zs(t) {
    return Ci.Ms(t, di.store);
}

/**
 * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
 */ function ti(t) {
    return Ci.Ms(t, fi.store);
}

function ei(t) {
    return t.path.N();
}

/**
 * Retrusn an approximate size for the given document.
 */ function ni(t) {
    let e;
    if (t.document) e = t.document; else if (t.unknownDocument) e = t.unknownDocument; else {
        if (!t.noDocument) throw V();
        e = t.noDocument;
    }
    return JSON.stringify(e).length;
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
 * An in-memory implementation of IndexManager.
 */ Xs.jr = class extends is {
    /**
     * @param documentCache The IndexedDbRemoteDocumentCache to apply the changes to.
     * @param trackRemovals Whether to create sentinel deletes that can be tracked by
     * `getNewDocumentChanges()`.
     */
    constructor(t, e) {
        super(), this.zr = t, this.Kr = e, 
        // A map of document sizes prior to applying the changes in this buffer.
        this.Hr = new $(t => t.toString(), (t, e) => t.isEqual(e));
    }
    Bn(t) {
        const e = [];
        let n = 0, s = new _t((t, e) => v(t.F(), e.F()));
        return this.Nn.forEach((i, r) => {
            const o = this.Hr.get(i);
            if (r) {
                const h = Os(this.zr.serializer, r, this.readTime);
                s = s.add(i.path.p());
                const a = ni(h);
                n += a - o, e.push(this.zr.xn(t, i, h));
            } else if (n -= o, this.Kr) {
                // In order to track removals, we store a "sentinel delete" in the
                // RemoteDocumentCache. This entry is represented by a NoDocument
                // with a version of 0 and ignored by `maybeDecodeDocument()` but
                // preserved in `getNewDocumentChanges()`.
                const n = Os(this.zr.serializer, new Rn(i, q.min()), this.readTime);
                e.push(this.zr.xn(t, i, n));
            } else e.push(this.zr.Mn(t, i));
        }), s.forEach(n => {
            e.push(this.zr.Gn.mr(t, n));
        }), e.push(this.zr.updateMetadata(t, n)), ss.Dn(e);
    }
    Ln(t, e) {
        // Record the size of everything we load from the cache so we can compute a delta later.
        return this.zr.xr(t, e).next(t => null === t ? (this.Hr.set(e, 0), null) : (this.Hr.set(e, t.size), 
        t.$r));
    }
    qn(t, e) {
        // Record the size of everything we load from the cache so we can compute
        // a delta later.
        return this.zr.Or(t, e).next(({Lr: t, qr: e}) => (
        // Note: `getAllFromCache` returns two maps instead of a single map from
        // keys to `DocumentSizeEntry`s. This is to allow returning the
        // `NullableMaybeDocumentMap` directly, without a conversion.
        e.forEach((t, e) => {
            this.Hr.set(t, e);
        }), t));
    }
};

class si {
    constructor() {
        this.Yr = new ii;
    }
    mr(t, e) {
        return this.Yr.add(e), ss.resolve();
    }
    os(t, e) {
        return ss.resolve(this.Yr.getEntries(e));
    }
}

/**
 * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
 * Also used for in-memory caching by IndexedDbIndexManager and initial index population
 * in indexeddb_schema.ts
 */ class ii {
    constructor() {
        this.index = {};
    }
    // Returns false if the entry already existed.
    add(t) {
        const e = t.S(), n = t.p(), s = this.index[e] || new _t(U.P), i = !s.has(n);
        return this.index[e] = s.add(n), i;
    }
    has(t) {
        const e = t.S(), n = t.p(), s = this.index[e];
        return s && s.has(n);
    }
    getEntries(t) {
        return (this.index[t] || new _t(U.P)).N();
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
 * Schema Version for the Web client:
 * 1.  Initial version including Mutation Queue, Query Cache, and Remote
 *     Document Cache
 * 2.  Used to ensure a targetGlobal object exists and add targetCount to it. No
 *     longer required because migration 3 unconditionally clears it.
 * 3.  Dropped and re-created Query Cache to deal with cache corruption related
 *     to limbo resolution. Addresses
 *     https://github.com/firebase/firebase-ios-sdk/issues/1548
 * 4.  Multi-Tab Support.
 * 5.  Removal of held write acks.
 * 6.  Create document global for tracking document cache size.
 * 7.  Ensure every cached document has a sentinel row with a sequence number.
 * 8.  Add collection-parent index for Collection Group queries.
 * 9.  Change RemoteDocumentChanges store to be keyed by readTime rather than
 *     an auto-incrementing ID. This is required for Index-Free queries.
 * 10. Rewrite the canonical IDs to the explicit Protobuf-based format.
 */
/** Performs database creation and schema upgrades. */
class ri {
    constructor(t) {
        this.serializer = t;
    }
    /**
     * Performs database creation and schema upgrades.
     *
     * Note that in production, this method is only ever used to upgrade the schema
     * to SCHEMA_VERSION. Different values of toVersion are only used for testing
     * and local feature development.
     */    createOrUpgrade(t, e, n, s) {
        g(n < s && n >= 0 && s <= 10);
        const i = new Ts(e);
        n < 1 && s >= 1 && (function(t) {
            t.createObjectStore(hi.store);
        }
        /**
 * An object to be stored in the 'mutationQueues' store in IndexedDb.
 *
 * Each user gets a single queue of MutationBatches to apply to the server.
 * DbMutationQueue tracks the metadata about the queue.
 */ (t), function(t) {
            t.createObjectStore(ai.store, {
                keyPath: ai.keyPath
            });
            t.createObjectStore(ci.store, {
                keyPath: ci.keyPath,
                autoIncrement: !0
            }).createIndex(ci.userMutationsIndex, ci.userMutationsKeyPath, {
                unique: !0
            }), t.createObjectStore(ui.store);
        }
        /**
 * Upgrade function to migrate the 'mutations' store from V1 to V3. Loads
 * and rewrites all data.
 */ (t), mi(t), function(t) {
            t.createObjectStore(fi.store);
        }
        /**
 * Represents the known absence of a document at a particular version.
 * Stored in IndexedDb as part of a DbRemoteDocument object.
 */ (t));
        // Migration 2 to populate the targetGlobal object no longer needed since
        // migration 3 unconditionally clears it.
                let r = ss.resolve();
        return n < 3 && s >= 3 && (
        // Brand new clients don't need to drop and recreate--only clients that
        // potentially have corrupt data.
        0 !== n && (!function(t) {
            t.deleteObjectStore(Ti.store), t.deleteObjectStore(wi.store), t.deleteObjectStore(Ei.store);
        }(t), mi(t)), r = r.next(() => 
        /**
 * Creates the target global singleton row.
 *
 * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
 */
        function(t) {
            const e = t.store(Ei.store), n = new Ei(
            /*highestTargetId=*/ 0, 
            /*lastListenSequenceNumber=*/ 0, q.min().A(), 
            /*targetCount=*/ 0);
            return e.put(Ei.key, n);
        }
        /**
 * Creates indices on the RemoteDocuments store used for both multi-tab
 * and Index-Free queries.
 */ (i))), n < 4 && s >= 4 && (0 !== n && (
        // Schema version 3 uses auto-generated keys to generate globally unique
        // mutation batch IDs (this was previously ensured internally by the
        // client). To migrate to the new schema, we have to read all mutations
        // and write them back out. We preserve the existing batch IDs to guarantee
        // consistency with other object stores. Any further mutation batch IDs will
        // be auto-generated.
        r = r.next(() => function(t, e) {
            return e.store(ci.store).zs().next(n => {
                t.deleteObjectStore(ci.store);
                t.createObjectStore(ci.store, {
                    keyPath: ci.keyPath,
                    autoIncrement: !0
                }).createIndex(ci.userMutationsIndex, ci.userMutationsKeyPath, {
                    unique: !0
                });
                const s = e.store(ci.store), i = n.map(t => s.put(t));
                return ss.Dn(i);
            });
        }
        /**
 * An object to be stored in the 'documentMutations' store in IndexedDb.
 *
 * A manually maintained index of all the mutation batches that affect a given
 * document key. The rows in this table are references based on the contents of
 * DbMutationBatch.mutations.
 */ (t, i))), r = r.next(() => {
            !function(t) {
                t.createObjectStore(Ai.store, {
                    keyPath: Ai.keyPath
                });
            }
            // Visible for testing
            (t);
        })), n < 5 && s >= 5 && (r = r.next(() => this.removeAcknowledgedMutations(i))), 
        n < 6 && s >= 6 && (r = r.next(() => (function(t) {
            t.createObjectStore(di.store);
        }
        /**
 * An object to be stored in the 'targets' store in IndexedDb.
 *
 * This is based on and should be kept in sync with the proto used in the iOS
 * client.
 *
 * Each query the client listens to against the server is tracked on disk so
 * that the query can be efficiently resumed on restart.
 */ (t), this.addDocumentGlobal(i)))), n < 7 && s >= 7 && (r = r.next(() => this.ensureSequenceNumbers(i))), 
        n < 8 && s >= 8 && (r = r.next(() => this.createCollectionParentIndex(t, i))), n < 9 && s >= 9 && (r = r.next(() => {
            // Multi-Tab used to manage its own changelog, but this has been moved
            // to the DbRemoteDocument object store itself. Since the previous change
            // log only contained transient data, we can drop its object store.
            !function(t) {
                t.objectStoreNames.contains("remoteDocumentChanges") && t.deleteObjectStore("remoteDocumentChanges");
            }(t), function(t) {
                const e = t.objectStore(fi.store);
                e.createIndex(fi.readTimeIndex, fi.readTimeIndexPath, {
                    unique: !1
                }), e.createIndex(fi.collectionReadTimeIndex, fi.collectionReadTimeIndexPath, {
                    unique: !1
                });
            }
            /**
 * A record of the metadata state of each client.
 *
 * PORTING NOTE: This is used to synchronize multi-tab state and does not need
 * to be ported to iOS or Android.
 */ (e);
        })), n < 10 && s >= 10 && (r = r.next(() => this.rewriteCanonicalIds(i))), r;
    }
    addDocumentGlobal(t) {
        let e = 0;
        return t.store(fi.store).Xs((t, n) => {
            e += ni(n);
        }).next(() => {
            const n = new di(e);
            return t.store(di.store).put(di.key, n);
        });
    }
    removeAcknowledgedMutations(t) {
        const e = t.store(ai.store), n = t.store(ci.store);
        return e.zs().next(e => ss.forEach(e, e => {
            const s = IDBKeyRange.bound([ e.userId, -1 ], [ e.userId, e.lastAcknowledgedBatchId ]);
            return n.zs(ci.userMutationsIndex, s).next(n => ss.forEach(n, n => {
                g(n.userId === e.userId);
                const s = Ws(this.serializer, n);
                return zs(t, e.userId, s).next(() => {});
            }));
        }));
    }
    /**
     * Ensures that every document in the remote document cache has a corresponding sentinel row
     * with a sequence number. Missing rows are given the most recently used sequence number.
     */    ensureSequenceNumbers(t) {
        const e = t.store(Ti.store), n = t.store(fi.store);
        return t.store(Ei.store).get(Ei.key).next(t => {
            const s = [];
            return n.Xs((n, i) => {
                const r = new U(n), o = function(t) {
                    return [ 0, Ns(t) ];
                }
                /**
 * Wrapper class to store timestamps (seconds and nanos) in IndexedDb objects.
 */ (r);
                s.push(e.get(o).next(n => n ? ss.resolve() : (n => e.put(new Ti(0, Ns(n), t.highestListenSequenceNumber)))(r)));
            }).next(() => ss.Dn(s));
        });
    }
    createCollectionParentIndex(t, e) {
        // Create the index.
        t.createObjectStore(Ii.store, {
            keyPath: Ii.keyPath
        });
        const n = e.store(Ii.store), s = new ii, i = t => {
            if (s.add(t)) {
                const e = t.S(), s = t.p();
                return n.put({
                    collectionId: e,
                    parent: Ns(s)
                });
            }
        };
        // Helper to add an index entry iff we haven't already written it.
                // Index existing remote documents.
        return e.store(fi.store).Xs({
            Js: !0
        }, (t, e) => {
            const n = new U(t);
            return i(n.p());
        }).next(() => e.store(ui.store).Xs({
            Js: !0
        }, ([t, e, n], s) => {
            const r = xs(e);
            return i(r.p());
        }));
    }
    rewriteCanonicalIds(t) {
        const e = t.store(wi.store);
        return e.Xs((t, n) => {
            const s = Qs(n), i = js(this.serializer, s);
            return e.put(i);
        });
    }
}

class oi {
    constructor(t, e) {
        this.seconds = t, this.nanoseconds = e;
    }
}

/**
 * A singleton object to be stored in the 'owner' store in IndexedDb.
 *
 * A given database can have a single primary tab assigned at a given time. That
 * tab must validate that it is still holding the primary lease before every
 * operation that requires locked access. The primary tab should regularly
 * write an updated timestamp to this lease to prevent other tabs from
 * "stealing" the primary lease
 */ class hi {
    constructor(t, 
    /** Whether to allow shared access from multiple tabs. */
    e, n) {
        this.ownerId = t, this.allowTabSynchronization = e, this.leaseTimestampMs = n;
    }
}

/**
 * Name of the IndexedDb object store.
 *
 * Note that the name 'owner' is chosen to ensure backwards compatibility with
 * older clients that only supported single locked access to the persistence
 * layer.
 */ hi.store = "owner", 
/**
 * The key string used for the single object that exists in the
 * DbPrimaryClient store.
 */
hi.key = "owner";

class ai {
    constructor(
    /**
     * The normalized user ID to which this queue belongs.
     */
    t, 
    /**
     * An identifier for the highest numbered batch that has been acknowledged
     * by the server. All MutationBatches in this queue with batchIds less
     * than or equal to this value are considered to have been acknowledged by
     * the server.
     *
     * NOTE: this is deprecated and no longer used by the code.
     */
    e, 
    /**
     * A stream token that was previously sent by the server.
     *
     * See StreamingWriteRequest in datastore.proto for more details about
     * usage.
     *
     * After sending this token, earlier tokens may not be used anymore so
     * only a single stream token is retained.
     *
     * NOTE: this is deprecated and no longer used by the code.
     */
    n) {
        this.userId = t, this.lastAcknowledgedBatchId = e, this.lastStreamToken = n;
    }
}

/** Name of the IndexedDb object store.  */ ai.store = "mutationQueues", 
/** Keys are automatically assigned via the userId property. */
ai.keyPath = "userId";

/**
 * An object to be stored in the 'mutations' store in IndexedDb.
 *
 * Represents a batch of user-level mutations intended to be sent to the server
 * in a single write. Each user-level batch gets a separate DbMutationBatch
 * with a new batchId.
 */
class ci {
    constructor(
    /**
     * The normalized user ID to which this batch belongs.
     */
    t, 
    /**
     * An identifier for this batch, allocated using an auto-generated key.
     */
    e, 
    /**
     * The local write time of the batch, stored as milliseconds since the
     * epoch.
     */
    n, 
    /**
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
     */
    s, 
    /**
     * A list of mutations to apply. All mutations will be applied atomically.
     *
     * Mutations are serialized via toMutation().
     */
    i) {
        this.userId = t, this.batchId = e, this.localWriteTimeMs = n, this.baseMutations = s, 
        this.mutations = i;
    }
}

/** Name of the IndexedDb object store.  */ ci.store = "mutations", 
/** Keys are automatically assigned via the userId, batchId properties. */
ci.keyPath = "batchId", 
/** The index name for lookup of mutations by user. */
ci.userMutationsIndex = "userMutationsIndex", 
/** The user mutations index is keyed by [userId, batchId] pairs. */
ci.userMutationsKeyPath = [ "userId", "batchId" ];

class ui {
    constructor() {}
    /**
     * Creates a [userId] key for use in the DbDocumentMutations index to iterate
     * over all of a user's document mutations.
     */    static prefixForUser(t) {
        return [ t ];
    }
    /**
     * Creates a [userId, encodedPath] key for use in the DbDocumentMutations
     * index to iterate over all at document mutations for a given path or lower.
     */    static prefixForPath(t, e) {
        return [ t, Ns(e) ];
    }
    /**
     * Creates a full index key of [userId, encodedPath, batchId] for inserting
     * and deleting into the DbDocumentMutations index.
     */    static key(t, e, n) {
        return [ t, Ns(e), n ];
    }
}

ui.store = "documentMutations", 
/**
 * Because we store all the useful information for this store in the key,
 * there is no useful information to store as the value. The raw (unencoded)
 * path cannot be stored because IndexedDb doesn't store prototype
 * information.
 */
ui.PLACEHOLDER = new ui;

class li {
    constructor(t, e) {
        this.path = t, this.readTime = e;
    }
}

/**
 * Represents a document that is known to exist but whose data is unknown.
 * Stored in IndexedDb as part of a DbRemoteDocument object.
 */ class _i {
    constructor(t, e) {
        this.path = t, this.version = e;
    }
}

/**
 * An object to be stored in the 'remoteDocuments' store in IndexedDb.
 * It represents either:
 *
 * - A complete document.
 * - A "no document" representing a document that is known not to exist (at
 * some version).
 * - An "unknown document" representing a document that is known to exist (at
 * some version) but whose contents are unknown.
 *
 * Note: This is the persisted equivalent of a MaybeDocument and could perhaps
 * be made more general if necessary.
 */ class fi {
    // TODO: We are currently storing full document keys almost three times
    // (once as part of the primary key, once - partly - as `parentPath` and once
    // inside the encoded documents). During our next migration, we should
    // rewrite the primary key as parentPath + document ID which would allow us
    // to drop one value.
    constructor(
    /**
     * Set to an instance of DbUnknownDocument if the data for a document is
     * not known, but it is known that a document exists at the specified
     * version (e.g. it had a successful update applied to it)
     */
    t, 
    /**
     * Set to an instance of a DbNoDocument if it is known that no document
     * exists.
     */
    e, 
    /**
     * Set to an instance of a Document if there's a cached version of the
     * document.
     */
    n, 
    /**
     * Documents that were written to the remote document store based on
     * a write acknowledgment are marked with `hasCommittedMutations`. These
     * documents are potentially inconsistent with the backend's copy and use
     * the write's commit version as their document version.
     */
    s, 
    /**
     * When the document was read from the backend. Undefined for data written
     * prior to schema version 9.
     */
    i, 
    /**
     * The path of the collection this document is part of. Undefined for data
     * written prior to schema version 9.
     */
    r) {
        this.unknownDocument = t, this.noDocument = e, this.document = n, this.hasCommittedMutations = s, 
        this.readTime = i, this.parentPath = r;
    }
}

fi.store = "remoteDocuments", 
/**
 * An index that provides access to all entries sorted by read time (which
 * corresponds to the last modification time of each row).
 *
 * This index is used to provide a changelog for Multi-Tab.
 */
fi.readTimeIndex = "readTimeIndex", fi.readTimeIndexPath = "readTime", 
/**
 * An index that provides access to documents in a collection sorted by read
 * time.
 *
 * This index is used to allow the RemoteDocumentCache to fetch newly changed
 * documents in a collection.
 */
fi.collectionReadTimeIndex = "collectionReadTimeIndex", fi.collectionReadTimeIndexPath = [ "parentPath", "readTime" ];

/**
 * Contains a single entry that has metadata about the remote document cache.
 */
class di {
    /**
     * @param byteSize Approximately the total size in bytes of all the documents in the document
     * cache.
     */
    constructor(t) {
        this.byteSize = t;
    }
}

di.store = "remoteDocumentGlobal", di.key = "remoteDocumentGlobalKey";

class wi {
    constructor(
    /**
     * An auto-generated sequential numeric identifier for the query.
     *
     * Queries are stored using their canonicalId as the key, but these
     * canonicalIds can be quite long so we additionally assign a unique
     * queryId which can be used by referenced data structures (e.g.
     * indexes) to minimize the on-disk cost.
     */
    t, 
    /**
     * The canonical string representing this query. This is not unique.
     */
    e, 
    /**
     * The last readTime received from the Watch Service for this query.
     *
     * This is the same value as TargetChange.read_time in the protos.
     */
    n, 
    /**
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
     */
    s, 
    /**
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
     */
    i, 
    /**
     * Denotes the maximum snapshot version at which the associated query view
     * contained no limbo documents.  Undefined for data written prior to
     * schema version 9.
     */
    r, 
    /**
     * The query for this target.
     *
     * Because canonical ids are not unique we must store the actual query. We
     * use the proto to have an object we can persist without having to
     * duplicate translation logic to and from a `Query` object.
     */
    o) {
        this.targetId = t, this.canonicalId = e, this.readTime = n, this.resumeToken = s, 
        this.lastListenSequenceNumber = i, this.lastLimboFreeSnapshotVersion = r, this.query = o;
    }
}

wi.store = "targets", 
/** Keys are automatically assigned via the targetId property. */
wi.keyPath = "targetId", 
/** The name of the queryTargets index. */
wi.queryTargetsIndexName = "queryTargetsIndex", 
/**
 * The index of all canonicalIds to the targets that they match. This is not
 * a unique mapping because canonicalId does not promise a unique name for all
 * possible queries, so we append the targetId to make the mapping unique.
 */
wi.queryTargetsKeyPath = [ "canonicalId", "targetId" ];

/**
 * An object representing an association between a target and a document, or a
 * sentinel row marking the last sequence number at which a document was used.
 * Each document cached must have a corresponding sentinel row before lru
 * garbage collection is enabled.
 *
 * The target associations and sentinel rows are co-located so that orphaned
 * documents and their sequence numbers can be identified efficiently via a scan
 * of this store.
 */
class Ti {
    constructor(
    /**
     * The targetId identifying a target or 0 for a sentinel row.
     */
    t, 
    /**
     * The path to the document, as encoded in the key.
     */
    e, 
    /**
     * If this is a sentinel row, this should be the sequence number of the last
     * time the document specified by `path` was used. Otherwise, it should be
     * `undefined`.
     */
    n) {
        this.targetId = t, this.path = e, this.sequenceNumber = n;
    }
}

/** Name of the IndexedDb object store.  */ Ti.store = "targetDocuments", 
/** Keys are automatically assigned via the targetId, path properties. */
Ti.keyPath = [ "targetId", "path" ], 
/** The index name for the reverse index. */
Ti.documentTargetsIndex = "documentTargetsIndex", 
/** We also need to create the reverse index for these properties. */
Ti.documentTargetsKeyPath = [ "path", "targetId" ];

/**
 * A record of global state tracked across all Targets, tracked separately
 * to avoid the need for extra indexes.
 *
 * This should be kept in-sync with the proto used in the iOS client.
 */
class Ei {
    constructor(
    /**
     * The highest numbered target id across all targets.
     *
     * See DbTarget.targetId.
     */
    t, 
    /**
     * The highest numbered lastListenSequenceNumber across all targets.
     *
     * See DbTarget.lastListenSequenceNumber.
     */
    e, 
    /**
     * A global snapshot version representing the last consistent snapshot we
     * received from the backend. This is monotonically increasing and any
     * snapshots received from the backend prior to this version (e.g. for
     * targets resumed with a resumeToken) should be suppressed (buffered)
     * until the backend has caught up to this snapshot version again. This
     * prevents our cache from ever going backwards in time.
     */
    n, 
    /**
     * The number of targets persisted.
     */
    s) {
        this.highestTargetId = t, this.highestListenSequenceNumber = e, this.lastRemoteSnapshotVersion = n, 
        this.targetCount = s;
    }
}

/**
 * The key string used for the single object that exists in the
 * DbTargetGlobal store.
 */ Ei.key = "targetGlobalKey", Ei.store = "targetGlobal";

/**
 * An object representing an association between a Collection id (e.g. 'messages')
 * to a parent path (e.g. '/chats/123') that contains it as a (sub)collection.
 * This is used to efficiently find all collections to query when performing
 * a Collection Group query.
 */
class Ii {
    constructor(
    /**
     * The collectionId (e.g. 'messages')
     */
    t, 
    /**
     * The path to the parent (either a document location or an empty path for
     * a root-level collection).
     */
    e) {
        this.collectionId = t, this.parent = e;
    }
}

/** Name of the IndexedDb object store. */ function mi(t) {
    t.createObjectStore(Ti.store, {
        keyPath: Ti.keyPath
    }).createIndex(Ti.documentTargetsIndex, Ti.documentTargetsKeyPath, {
        unique: !0
    });
    // NOTE: This is unique only because the TargetId is the suffix.
    t.createObjectStore(wi.store, {
        keyPath: wi.keyPath
    }).createIndex(wi.queryTargetsIndexName, wi.queryTargetsKeyPath, {
        unique: !0
    }), t.createObjectStore(Ei.store);
}

Ii.store = "collectionParents", 
/** Keys are automatically assigned via the collectionId, parent properties. */
Ii.keyPath = [ "collectionId", "parent" ];

class Ai {
    constructor(
    // Note: Previous schema versions included a field
    // "lastProcessedDocumentChangeId". Don't use anymore.
    /** The auto-generated client id assigned at client startup. */
    t, 
    /** The last time this state was updated. */
    e, 
    /** Whether the client's network connection is enabled. */
    n, 
    /** Whether this client is running in a foreground tab. */
    s) {
        this.clientId = t, this.updateTimeMs = e, this.networkEnabled = n, this.inForeground = s;
    }
}

/** Name of the IndexedDb object store. */ Ai.store = "clientMetadata", 
/** Keys are automatically assigned via the clientId properties. */
Ai.keyPath = "clientId";

const Ri = [ ...[ ...[ ...[ ai.store, ci.store, ui.store, fi.store, wi.store, hi.store, Ei.store, Ti.store ], Ai.store ], di.store ], Ii.store ];

// V2 is no longer usable (see comment at top of file)
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
 */
/**
 * A persisted implementation of IndexManager.
 */
class Pi {
    constructor() {
        /**
         * An in-memory copy of the index entries we've already written since the SDK
         * launched. Used to avoid re-writing the same entry repeatedly.
         *
         * This is *NOT* a complete cache of what's in persistence and so can never be used to
         * satisfy reads.
         */
        this.Jr = new ii;
    }
    /**
     * Adds a new entry to the collection parent index.
     *
     * Repeated calls for the same collectionPath should be avoided within a
     * transaction as IndexedDbIndexManager only caches writes once a transaction
     * has been committed.
     */    mr(t, e) {
        if (!this.Jr.has(e)) {
            const n = e.S(), s = e.p();
            t.Wn(() => {
                // Add the collection to the in memory cache only if the transaction was
                // successfully committed.
                this.Jr.add(e);
            });
            const i = {
                collectionId: n,
                parent: Ns(s)
            };
            return Vi(t).put(i);
        }
        return ss.resolve();
    }
    os(t, e) {
        const n = [], s = IDBKeyRange.bound([ e, "" ], [ D(e), "" ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0);
        return Vi(t).zs(s).next(t => {
            for (const s of t) {
                // This collectionId guard shouldn't be necessary (and isn't as long
                // as we're running in a real browser), but there's a bug in
                // indexeddbshim that breaks our range in our tests running in node:
                // https://github.com/axemclion/IndexedDBShim/issues/334
                if (s.collectionId !== e) break;
                n.push(xs(s.parent));
            }
            return n;
        });
    }
}

/**
 * Helper to get a typed SimpleDbStore for the collectionParents
 * document store.
 */ function Vi(t) {
    return Ci.Ms(t, Ii.store);
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
class gi {
    constructor(t) {
        this.Xr = t;
    }
    next() {
        return this.Xr += 2, this.Xr;
    }
    static Zr() {
        // The target cache generator must return '2' in its first call to `next()`
        // as there is no differentiation in the protocol layer between an unset
        // number and the number '0'. If we were to sent a target with target ID
        // '0', the backend would consider it unset and replace it with its own ID.
        return new gi(0);
    }
    static to() {
        // Sync engine assigns target IDs for limbo document detection.
        return new gi(-1);
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
 */ class yi {
    constructor(t, e) {
        this._r = t, this.serializer = e;
    }
    // PORTING NOTE: We don't cache global metadata for the target cache, since
    // some of it (in particular `highestTargetId`) can be modified by secondary
    // tabs. We could perhaps be more granular (and e.g. still cache
    // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
    // to IndexedDb whenever we need to read metadata. We can revisit if it turns
    // out to have a meaningful performance impact.
    eo(t) {
        return this.no(t).next(e => {
            const n = new gi(e.highestTargetId);
            return e.highestTargetId = n.next(), this.so(t, e).next(() => e.highestTargetId);
        });
    }
    io(t) {
        return this.no(t).next(t => q.I(new L(t.lastRemoteSnapshotVersion.seconds, t.lastRemoteSnapshotVersion.nanoseconds)));
    }
    ro(t) {
        return this.no(t).next(t => t.highestListenSequenceNumber);
    }
    oo(t, e, n) {
        return this.no(t).next(s => (s.highestListenSequenceNumber = e, n && (s.lastRemoteSnapshotVersion = n.A()), 
        e > s.highestListenSequenceNumber && (s.highestListenSequenceNumber = e), this.so(t, s)));
    }
    ho(t, e) {
        return this.ao(t, e).next(() => this.no(t).next(n => (n.targetCount += 1, this.co(e, n), 
        this.so(t, n))));
    }
    uo(t, e) {
        return this.ao(t, e);
    }
    lo(t, e) {
        return this._o(t, e.targetId).next(() => pi(t).delete(e.targetId)).next(() => this.no(t)).next(e => (g(e.targetCount > 0), 
        e.targetCount -= 1, this.so(t, e)));
    }
    /**
     * Drops any targets with sequence number less than or equal to the upper bound, excepting those
     * present in `activeTargetIds`. Document associations for the removed targets are also removed.
     * Returns the number of targets removed.
     */    or(t, e, n) {
        let s = 0;
        const i = [];
        return pi(t).Xs((r, o) => {
            const h = Qs(o);
            h.sequenceNumber <= e && null === n.get(h.targetId) && (s++, i.push(this.lo(t, h)));
        }).next(() => ss.Dn(i)).next(() => s);
    }
    /**
     * Call provided function with each `TargetData` that we have cached.
     */    pe(t, e) {
        return pi(t).Xs((t, n) => {
            const s = Qs(n);
            e(s);
        });
    }
    no(t) {
        return bi(t).get(Ei.key).next(t => (g(null !== t), t));
    }
    so(t, e) {
        return bi(t).put(Ei.key, e);
    }
    ao(t, e) {
        return pi(t).put(js(this.serializer, e));
    }
    /**
     * In-place updates the provided metadata to account for values in the given
     * TargetData. Saving is done separately. Returns true if there were any
     * changes to the metadata.
     */    co(t, e) {
        let n = !1;
        return t.targetId > e.highestTargetId && (e.highestTargetId = t.targetId, n = !0), 
        t.sequenceNumber > e.highestListenSequenceNumber && (e.highestListenSequenceNumber = t.sequenceNumber, 
        n = !0), n;
    }
    fo(t) {
        return this.no(t).next(t => t.targetCount);
    }
    do(t, e) {
        // Iterating by the canonicalId may yield more than one result because
        // canonicalId values are not required to be unique per target. This query
        // depends on the queryTargets index to be efficient.
        const n = J(e), s = IDBKeyRange.bound([ n, Number.NEGATIVE_INFINITY ], [ n, Number.POSITIVE_INFINITY ]);
        let i = null;
        return pi(t).Xs({
            range: s,
            index: wi.queryTargetsIndexName
        }, (t, n, s) => {
            const r = Qs(n);
            // After finding a potential match, check that the target is
            // actually equal to the requested target.
                        Z(e, r.target) && (i = r, s.done());
        }).next(() => i);
    }
    wo(t, e, n) {
        // PORTING NOTE: The reverse index (documentsTargets) is maintained by
        // IndexedDb.
        const s = [], i = vi(t);
        return e.forEach(e => {
            const r = Ns(e.path);
            s.push(i.put(new Ti(n, r))), s.push(this._r.To(t, n, e));
        }), ss.Dn(s);
    }
    Eo(t, e, n) {
        // PORTING NOTE: The reverse index (documentsTargets) is maintained by
        // IndexedDb.
        const s = vi(t);
        return ss.forEach(e, e => {
            const i = Ns(e.path);
            return ss.Dn([ s.delete([ n, i ]), this._r.Io(t, n, e) ]);
        });
    }
    _o(t, e) {
        const n = vi(t), s = IDBKeyRange.bound([ e ], [ e + 1 ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0);
        return n.delete(s);
    }
    mo(t, e) {
        const n = IDBKeyRange.bound([ e ], [ e + 1 ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0), s = vi(t);
        let i = Rt();
        return s.Xs({
            range: n,
            Js: !0
        }, (t, e, n) => {
            const s = xs(t[1]), r = new j(s);
            i = i.add(r);
        }).next(() => i);
    }
    Cr(t, e) {
        const n = Ns(e.path), s = IDBKeyRange.bound([ n ], [ D(n) ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0);
        let i = 0;
        return vi(t).Xs({
            index: Ti.documentTargetsIndex,
            Js: !0,
            range: s
        }, ([t, e], n, s) => {
            // Having a sentinel row for a document does not count as containing that document;
            // For the target cache, containing the document means the document is part of some
            // target.
            0 !== t && (i++, s.done());
        }).next(() => i > 0);
    }
    /**
     * Looks up a TargetData entry by target ID.
     *
     * @param targetId The target ID of the TargetData entry to look up.
     * @return The cached TargetData entry, or null if the cache has no entry for
     * the target.
     */
    // PORTING NOTE: Multi-tab only.
    Me(t, e) {
        return pi(t).get(e).next(t => t ? Qs(t) : null);
    }
}

/**
 * Helper to get a typed SimpleDbStore for the queries object store.
 */ function pi(t) {
    return Ci.Ms(t, wi.store);
}

/**
 * Helper to get a typed SimpleDbStore for the target globals object store.
 */ function bi(t) {
    return Ci.Ms(t, Ei.store);
}

/**
 * Helper to get a typed SimpleDbStore for the document target object store.
 */ function vi(t) {
    return Ci.Ms(t, Ti.store);
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
 */ const Si = "Failed to obtain exclusive access to the persistence layer. To allow shared access, make sure to invoke `enablePersistence()` with `synchronizeTabs:true` in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.";

/**
 * Oldest acceptable age in milliseconds for client metadata before the client
 * is considered inactive and its associated data is garbage collected.
 */ class Di extends os {
    constructor(t, e) {
        super(), this.br = t, this.Ao = e;
    }
}

/**
 * An IndexedDB-backed instance of Persistence. Data is stored persistently
 * across sessions.
 *
 * On Web only, the Firestore SDKs support shared access to its persistence
 * layer. This allows multiple browser tabs to read and write to IndexedDb and
 * to synchronize state even without network connectivity. Shared access is
 * currently optional and not enabled unless all clients invoke
 * `enablePersistence()` with `{synchronizeTabs:true}`.
 *
 * In multi-tab mode, if multiple clients are active at the same time, the SDK
 * will designate one client as the “primary client”. An effort is made to pick
 * a visible, network-connected and active client, and this client is
 * responsible for letting other clients know about its presence. The primary
 * client writes a unique client-generated identifier (the client ID) to
 * IndexedDb’s “owner” store every 4 seconds. If the primary client fails to
 * update this entry, another client can acquire the lease and take over as
 * primary.
 *
 * Some persistence operations in the SDK are designated as primary-client only
 * operations. This includes the acknowledgment of mutations and all updates of
 * remote documents. The effects of these operations are written to persistence
 * and then broadcast to other tabs via LocalStorage (see
 * `WebStorageSharedClientState`), which then refresh their state from
 * persistence.
 *
 * Similarly, the primary client listens to notifications sent by secondary
 * clients to discover persistence changes written by secondary clients, such as
 * the addition of new mutations and query targets.
 *
 * If multi-tab is not enabled and another tab already obtained the primary
 * lease, IndexedDbPersistence enters a failed state and all subsequent
 * operations will automatically fail.
 *
 * Additionally, there is an optimization so that when a tab is closed, the
 * primary lease is released immediately (this is especially important to make
 * sure that a refreshed tab is able to immediately re-acquire the primary
 * lease). Unfortunately, IndexedDB cannot be reliably used in window.unload
 * since it is an asynchronous API. So in addition to attempting to give up the
 * lease, the leaseholder writes its client ID to a "zombiedClient" entry in
 * LocalStorage which acts as an indicator that another tab should go ahead and
 * take the primary lease immediately regardless of the current lease timestamp.
 *
 * TODO(b/114226234): Remove `synchronizeTabs` section when multi-tab is no
 * longer optional.
 */ class Ci {
    constructor(
    /**
     * Whether to synchronize the in-memory state of multiple tabs and share
     * access to local persistence.
     */
    t, e, n, s, i, r, o, h, a, 
    /**
     * If set to true, forcefully obtains database access. Existing tabs will
     * no longer be able to access IndexedDB.
     */
    c) {
        if (this.allowTabSynchronization = t, this.persistenceKey = e, this.clientId = n, 
        this.Es = i, this.window = r, this.document = o, this.Ro = a, this.Po = c, this.Vo = null, 
        this.yo = !1, this.isPrimary = !1, this.networkEnabled = !0, 
        /** Our window.unload handler, if registered. */
        this.po = null, this.inForeground = !1, 
        /** Our 'visibilitychange' listener if registered. */
        this.bo = null, 
        /** The client metadata refresh task. */
        this.vo = null, 
        /** The last time we garbage collected the client metadata object store. */
        this.So = Number.NEGATIVE_INFINITY, 
        /** A listener to notify on primary state changes. */
        this.Do = t => Promise.resolve(), !Ci.Fs()) throw new O(M.UNIMPLEMENTED, "This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");
        this._r = new ki(this, s), this.Co = e + "main", this.serializer = new $s(h), this.No = new _s(this.Co, 10, new ri(this.serializer)), 
        this.Fo = new yi(this._r, this.serializer), this.Gn = new Pi, this.jn = new Xs(this.serializer, this.Gn), 
        this.window && this.window.localStorage ? this.ko = this.window.localStorage : (this.ko = null, 
        !1 === c && A("IndexedDbPersistence", "LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."));
    }
    static Ms(t, e) {
        if (t instanceof Di) return _s.Ms(t.br, e);
        throw V();
    }
    /**
     * Attempt to start IndexedDb persistence.
     *
     * @return {Promise<void>} Whether persistence was enabled.
     */    start() {
        // NOTE: This is expected to fail sometimes (in the case of another tab
        // already having the persistence lock), so it's the first thing we should
        // do.
        return this.xo().then(() => {
            if (!this.isPrimary && !this.allowTabSynchronization) 
            // Fail `start()` if `synchronizeTabs` is disabled and we cannot
            // obtain the primary lease.
            throw new O(M.FAILED_PRECONDITION, Si);
            return this.$o(), this.Mo(), this.Oo(), this.runTransaction("getHighestListenSequenceNumber", "readonly", t => this.Fo.ro(t));
        }).then(t => {
            this.Vo = new cs(t, this.Ro);
        }).then(() => {
            this.yo = !0;
        }).catch(t => (this.No && this.No.close(), Promise.reject(t)));
    }
    /**
     * Registers a listener that gets called when the primary state of the
     * instance changes. Upon registering, this listener is invoked immediately
     * with the current primary state.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    Lo(t) {
        return this.Do = async e => {
            if (this.Zi) return t(e);
        }, t(this.isPrimary);
    }
    /**
     * Registers a listener that gets called when the database receives a
     * version change event indicating that it has deleted.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    qo(t) {
        this.No.qs(async e => {
            // Check if an attempt is made to delete IndexedDB.
            null === e.newVersion && await t();
        });
    }
    /**
     * Adjusts the current network state in the client's metadata, potentially
     * affecting the primary lease.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    Bo(t) {
        this.networkEnabled !== t && (this.networkEnabled = t, 
        // Schedule a primary lease refresh for immediate execution. The eventual
        // lease update will be propagated via `primaryStateListener`.
        this.Es.hi(async () => {
            this.Zi && await this.xo();
        }));
    }
    /**
     * Updates the client metadata in IndexedDb and attempts to either obtain or
     * extend the primary lease for the local client. Asynchronously notifies the
     * primary state listener if the client either newly obtained or released its
     * primary lease.
     */    xo() {
        return this.runTransaction("updateClientMetadataAndTryBecomePrimary", "readwrite", t => Fi(t).put(new Ai(this.clientId, Date.now(), this.networkEnabled, this.inForeground)).next(() => {
            if (this.isPrimary) return this.Uo(t).next(t => {
                t || (this.isPrimary = !1, this.Es.Pi(() => this.Do(!1)));
            });
        }).next(() => this.Wo(t)).next(e => this.isPrimary && !e ? this.Qo(t).next(() => !1) : !!e && this.jo(t).next(() => !0))).catch(t => {
            if (ws(t)) 
            // Proceed with the existing state. Any subsequent access to
            // IndexedDB will verify the lease.
            return m("IndexedDbPersistence", "Failed to extend owner lease: ", t), this.isPrimary;
            if (!this.allowTabSynchronization) throw t;
            return m("IndexedDbPersistence", "Releasing owner lease after error during lease refresh", t), 
            /* isPrimary= */ !1;
        }).then(t => {
            this.isPrimary !== t && this.Es.Pi(() => this.Do(t)), this.isPrimary = t;
        });
    }
    Uo(t) {
        return Ni(t).get(hi.key).next(t => ss.resolve(this.Ko(t)));
    }
    Go(t) {
        return Fi(t).delete(this.clientId);
    }
    /**
     * If the garbage collection threshold has passed, prunes the
     * RemoteDocumentChanges and the ClientMetadata store based on the last update
     * time of all clients.
     */    async zo() {
        if (this.isPrimary && !this.Ho(this.So, 18e5)) {
            this.So = Date.now();
            const t = await this.runTransaction("maybeGarbageCollectMultiClientState", "readwrite-primary", t => {
                const e = Ci.Ms(t, Ai.store);
                return e.zs().next(t => {
                    const n = this.Yo(t, 18e5), s = t.filter(t => -1 === n.indexOf(t));
                    // Delete metadata for clients that are no longer considered active.
                    return ss.forEach(s, t => e.delete(t.clientId)).next(() => s);
                });
            }).catch(() => []);
            // Delete potential leftover entries that may continue to mark the
            // inactive clients as zombied in LocalStorage.
            // Ideally we'd delete the IndexedDb and LocalStorage zombie entries for
            // the client atomically, but we can't. So we opt to delete the IndexedDb
            // entries first to avoid potentially reviving a zombied client.
                        if (this.ko) for (const e of t) this.ko.removeItem(this.Jo(e.clientId));
        }
    }
    /**
     * Schedules a recurring timer to update the client metadata and to either
     * extend or acquire the primary lease if the client is eligible.
     */    Oo() {
        this.vo = this.Es.vs("client_metadata_refresh" /* ClientMetadataRefresh */ , 4e3, () => this.xo().then(() => this.zo()).then(() => this.Oo()));
    }
    /** Checks whether `client` is the local client. */    Ko(t) {
        return !!t && t.ownerId === this.clientId;
    }
    /**
     * Evaluate the state of all active clients and determine whether the local
     * client is or can act as the holder of the primary lease. Returns whether
     * the client is eligible for the lease, but does not actually acquire it.
     * May return 'false' even if there is no active leaseholder and another
     * (foreground) client should become leaseholder instead.
     */    Wo(t) {
        if (this.Po) return ss.resolve(!0);
        return Ni(t).get(hi.key).next(e => {
            // A client is eligible for the primary lease if:
            // - its network is enabled and the client's tab is in the foreground.
            // - its network is enabled and no other client's tab is in the
            //   foreground.
            // - every clients network is disabled and the client's tab is in the
            //   foreground.
            // - every clients network is disabled and no other client's tab is in
            //   the foreground.
            // - the `forceOwningTab` setting was passed in.
            if (null !== e && this.Ho(e.leaseTimestampMs, 5e3) && !this.Xo(e.ownerId)) {
                if (this.Ko(e) && this.networkEnabled) return !0;
                if (!this.Ko(e)) {
                    if (!e.allowTabSynchronization) 
                    // Fail the `canActAsPrimary` check if the current leaseholder has
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
                    throw new O(M.FAILED_PRECONDITION, Si);
                    return !1;
                }
            }
            return !(!this.networkEnabled || !this.inForeground) || Fi(t).zs().next(t => void 0 === this.Yo(t, 5e3).find(t => {
                if (this.clientId !== t.clientId) {
                    const e = !this.networkEnabled && t.networkEnabled, n = !this.inForeground && t.inForeground, s = this.networkEnabled === t.networkEnabled;
                    if (e || n && s) return !0;
                }
                return !1;
            }));
        }).next(t => (this.isPrimary !== t && m("IndexedDbPersistence", `Client ${t ? "is" : "is not"} eligible for a primary lease.`), 
        t));
    }
    async Zo() {
        // The shutdown() operations are idempotent and can be called even when
        // start() aborted (e.g. because it couldn't acquire the persistence lease).
        this.yo = !1, this.th(), this.vo && (this.vo.cancel(), this.vo = null), this.eh(), 
        this.nh(), 
        // Use `SimpleDb.runTransaction` directly to avoid failing if another tab
        // has obtained the primary lease.
        await this.No.runTransaction("readwrite", [ hi.store, Ai.store ], t => {
            const e = new Di(t, cs.Ts);
            return this.Qo(e).next(() => this.Go(e));
        }), this.No.close(), 
        // Remove the entry marking the client as zombied from LocalStorage since
        // we successfully deleted its metadata from IndexedDb.
        this.sh();
    }
    /**
     * Returns clients that are not zombied and have an updateTime within the
     * provided threshold.
     */    Yo(t, e) {
        return t.filter(t => this.Ho(t.updateTimeMs, e) && !this.Xo(t.clientId));
    }
    /**
     * Returns the IDs of the clients that are currently active. If multi-tab
     * is not supported, returns an array that only contains the local client's
     * ID.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    ih() {
        return this.runTransaction("getActiveClients", "readonly", t => Fi(t).zs().next(t => this.Yo(t, 18e5).map(t => t.clientId)));
    }
    get Zi() {
        return this.yo;
    }
    rh(t) {
        return Ks.wr(t, this.serializer, this.Gn, this._r);
    }
    oh() {
        return this.Fo;
    }
    hh() {
        return this.jn;
    }
    ah() {
        return this.Gn;
    }
    runTransaction(t, e, n) {
        m("IndexedDbPersistence", "Starting transaction:", t);
        const s = "readonly" === e ? "readonly" : "readwrite";
        let i;
        // Do all transactions as readwrite against all object stores, since we
        // are the only reader/writer.
                return this.No.runTransaction(s, Ri, s => (i = new Di(s, this.Vo ? this.Vo.next() : cs.Ts), 
        "readwrite-primary" === e ? this.Uo(i).next(t => !!t || this.Wo(i)).next(e => {
            if (!e) throw A(`Failed to obtain primary lease for action '${t}'.`), this.isPrimary = !1, 
            this.Es.Pi(() => this.Do(!1)), new O(M.FAILED_PRECONDITION, rs);
            return n(i);
        }).next(t => this.jo(i).next(() => t)) : this.uh(i).next(() => n(i)))).then(t => (i.Qn(), 
        t));
    }
    /**
     * Verifies that the current tab is the primary leaseholder or alternatively
     * that the leaseholder has opted into multi-tab synchronization.
     */
    // TODO(b/114226234): Remove this check when `synchronizeTabs` can no longer
    // be turned off.
    uh(t) {
        return Ni(t).get(hi.key).next(t => {
            if (null !== t && this.Ho(t.leaseTimestampMs, 5e3) && !this.Xo(t.ownerId) && !this.Ko(t) && !(this.Po || this.allowTabSynchronization && t.allowTabSynchronization)) throw new O(M.FAILED_PRECONDITION, Si);
        });
    }
    /**
     * Obtains or extends the new primary lease for the local client. This
     * method does not verify that the client is eligible for this lease.
     */    jo(t) {
        const e = new hi(this.clientId, this.allowTabSynchronization, Date.now());
        return Ni(t).put(hi.key, e);
    }
    static Fs() {
        return _s.Fs();
    }
    /** Checks the primary lease and removes it if we are the current primary. */    Qo(t) {
        const e = Ni(t);
        return e.get(hi.key).next(t => this.Ko(t) ? (m("IndexedDbPersistence", "Releasing primary lease."), 
        e.delete(hi.key)) : ss.resolve());
    }
    /** Verifies that `updateTimeMs` is within `maxAgeMs`. */    Ho(t, e) {
        const n = Date.now();
        return !(t < n - e) && (!(t > n) || (A(`Detected an update time that is in the future: ${t} > ${n}`), 
        !1));
    }
    $o() {
        null !== this.document && "function" == typeof this.document.addEventListener && (this.bo = () => {
            this.Es.hi(() => (this.inForeground = "visible" === this.document.visibilityState, 
            this.xo()));
        }, this.document.addEventListener("visibilitychange", this.bo), this.inForeground = "visible" === this.document.visibilityState);
    }
    eh() {
        this.bo && (this.document.removeEventListener("visibilitychange", this.bo), this.bo = null);
    }
    /**
     * Attaches a window.unload handler that will synchronously write our
     * clientId to a "zombie client id" location in LocalStorage. This can be used
     * by tabs trying to acquire the primary lease to determine that the lease
     * is no longer valid even if the timestamp is recent. This is particularly
     * important for the refresh case (so the tab correctly re-acquires the
     * primary lease). LocalStorage is used for this rather than IndexedDb because
     * it is a synchronous API and so can be used reliably from  an unload
     * handler.
     */    Mo() {
        var t;
        "function" == typeof (null === (t = this.window) || void 0 === t ? void 0 : t.addEventListener) && (this.po = () => {
            // Note: In theory, this should be scheduled on the AsyncQueue since it
            // accesses internal state. We execute this code directly during shutdown
            // to make sure it gets a chance to run.
            this.th(), this.Es.hi(() => this.Zo());
        }, this.window.addEventListener("unload", this.po));
    }
    nh() {
        this.po && (this.window.removeEventListener("unload", this.po), this.po = null);
    }
    /**
     * Returns whether a client is "zombied" based on its LocalStorage entry.
     * Clients become zombied when their tab closes without running all of the
     * cleanup logic in `shutdown()`.
     */    Xo(t) {
        var e;
        try {
            const n = null !== (null === (e = this.ko) || void 0 === e ? void 0 : e.getItem(this.Jo(t)));
            return m("IndexedDbPersistence", `Client '${t}' ${n ? "is" : "is not"} zombied in LocalStorage`), 
            n;
        } catch (t) {
            // Gracefully handle if LocalStorage isn't working.
            return A("IndexedDbPersistence", "Failed to get zombied client id.", t), !1;
        }
    }
    /**
     * Record client as zombied (a client that had its tab closed). Zombied
     * clients are ignored during primary tab selection.
     */    th() {
        if (this.ko) try {
            this.ko.setItem(this.Jo(this.clientId), String(Date.now()));
        } catch (t) {
            // Gracefully handle if LocalStorage isn't available / working.
            A("Failed to set zombie client id.", t);
        }
    }
    /** Removes the zombied client entry if it exists. */    sh() {
        if (this.ko) try {
            this.ko.removeItem(this.Jo(this.clientId));
        } catch (t) {
            // Ignore
        }
    }
    Jo(t) {
        return `firestore_zombie_${this.persistenceKey}_${t}`;
    }
}

/**
 * Helper to get a typed SimpleDbStore for the primary client object store.
 */ function Ni(t) {
    return Ci.Ms(t, hi.store);
}

/**
 * Helper to get a typed SimpleDbStore for the client metadata object store.
 */ function Fi(t) {
    return Ci.Ms(t, Ai.store);
}

/** Provides LRU functionality for IndexedDB persistence. */ class ki {
    constructor(t, e) {
        this.db = t, this.Hi = new Cs(this, e);
    }
    sr(t) {
        const e = this.lh(t);
        return this.db.oh().fo(t).next(t => e.next(e => t + e));
    }
    lh(t) {
        let e = 0;
        return this.rr(t, t => {
            e++;
        }).next(() => e);
    }
    pe(t, e) {
        return this.db.oh().pe(t, e);
    }
    rr(t, e) {
        return this._h(t, (t, n) => e(n));
    }
    To(t, e, n) {
        return xi(t, n);
    }
    Io(t, e, n) {
        return xi(t, n);
    }
    or(t, e, n) {
        return this.db.oh().or(t, e, n);
    }
    Sr(t, e) {
        return xi(t, e);
    }
    /**
     * Returns true if anything would prevent this document from being garbage
     * collected, given that the document in question is not present in any
     * targets and has a sequence number less than or equal to the upper bound for
     * the collection run.
     */    fh(t, e) {
        return function(t, e) {
            let n = !1;
            return Js(t).Zs(s => Gs(t, s, e).next(t => (t && (n = !0), ss.resolve(!t)))).next(() => n);
        }(t, e);
    }
    hr(t, e) {
        const n = this.db.hh().Qr(), s = [];
        let i = 0;
        return this._h(t, (r, o) => {
            if (o <= e) {
                const e = this.fh(t, r).next(e => {
                    if (!e) 
                    // Our size accounting requires us to read all documents before
                    // removing them.
                    return i++, n.On(t, r).next(() => (n.Mn(r), vi(t).delete([ 0, Ns(r.path) ])));
                });
                s.push(e);
            }
        }).next(() => ss.Dn(s)).next(() => n.apply(t)).next(() => i);
    }
    removeTarget(t, e) {
        const n = e.Z(t.Ao);
        return this.db.oh().uo(t, n);
    }
    dh(t, e) {
        return xi(t, e);
    }
    /**
     * Call provided function for each document in the cache that is 'orphaned'. Orphaned
     * means not a part of any target, so the only entry in the target-document index for
     * that document will be the sentinel row (targetId 0), which will also have the sequence
     * number for the last time the document was accessed.
     */    _h(t, e) {
        const n = vi(t);
        let s, i = cs.Ts;
        return n.Xs({
            index: Ti.documentTargetsIndex
        }, ([t, n], {path: r, sequenceNumber: o}) => {
            0 === t ? (
            // if nextToReport is valid, report it, this is a new key so the
            // last one must not be a member of any targets.
            i !== cs.Ts && e(new j(xs(s)), i), 
            // set nextToReport to be this sequence number. It's the next one we
            // might report, if we don't find any targets for this document.
            // Note that the sequence number must be defined when the targetId
            // is 0.
            i = o, s = r) : 
            // set nextToReport to be invalid, we know we don't need to report
            // this one since we found a target for it.
            i = cs.Ts;
        }).next(() => {
            // Since we report sequence numbers after getting to the next key, we
            // need to check if the last key we iterated over was an orphaned
            // document and report it.
            i !== cs.Ts && e(new j(xs(s)), i);
        });
    }
    cr(t) {
        return this.db.hh().Gr(t);
    }
}

function xi(t, e) {
    return vi(t).put(
    /**
 * @return A value suitable for writing a sentinel row in the target-document
 * store.
 */
    function(t, e) {
        return new Ti(0, Ns(t.path), e);
    }(e, t.Ao));
}

/**
 * Generates a string used as a prefix when storing data in IndexedDB and
 * LocalStorage.
 */ function $i(t, e) {
    // Use two different prefix formats:
    //   * firestore / persistenceKey / projectID . databaseID / ...
    //   * firestore / persistenceKey / projectID / ...
    // projectIDs are DNS-compatible names and cannot contain dots
    // so there's no danger of collisions.
    let n = t.projectId;
    return t.i || (n += "." + t.database), "firestore/" + e + "/" + n + "/";
}

/**
 * Implements `LocalStore` interface.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */
class Mi {
    constructor(
    /** Manages our in-memory or durable persistence. */
    t, e, n) {
        this.persistence = t, this.wh = e, 
        /**
         * Maps a targetID to data about its target.
         *
         * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
         * of `applyRemoteEvent()` idempotent.
         */
        this.Th = new ct(v), 
        /** Maps a target to its targetID. */
        // TODO(wuandy): Evaluate if TargetId can be part of Target.
        this.Eh = new $(t => J(t), Z), 
        /**
         * The read time of the last entry processed by `getNewDocumentChanges()`.
         *
         * PORTING NOTE: This is only used for multi-tab synchronization.
         */
        this.Ih = q.min(), this.Kn = t.rh(n), this.mh = t.hh(), this.Fo = t.oh(), this.Ah = new hs(this.mh, this.Kn, this.persistence.ah()), 
        this.wh.Rh(this.Ah);
    }
    async Ph(t) {
        let e = this.Kn, n = this.Ah;
        const s = await this.persistence.runTransaction("Handle user change", "readonly", s => {
            // Swap out the mutation queue, grabbing the pending mutation batches
            // before and after.
            let i;
            return this.Kn.gr(s).next(r => (i = r, e = this.persistence.rh(t), 
            // Recreate our LocalDocumentsView using the new
            // MutationQueue.
            n = new hs(this.mh, e, this.persistence.ah()), e.gr(s))).next(t => {
                const e = [], r = [];
                // Union the old/new changed keys.
                let o = Rt();
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
                                return n.Xn(s, o).next(t => ({
                    Vh: t,
                    gh: e,
                    yh: r
                }));
            });
        });
        return this.Kn = e, this.Ah = n, this.wh.Rh(this.Ah), s;
    }
    ph(t) {
        const e = L.now(), n = t.reduce((t, e) => t.add(e.key), Rt());
        let s;
        return this.persistence.runTransaction("Locally write mutations", "readwrite", i => this.Ah.Xn(i, n).next(n => {
            s = n;
            // For non-idempotent mutations (such as `FieldValue.increment()`),
            // we record the base state in a separate patch mutation. This is
            // later used to guarantee consistent values and prevents flicker
            // even if the backend sends us an update that already includes our
            // transform.
            const r = [];
            for (const e of t) {
                const t = rn(e, s.get(e.key));
                null != t && 
                // NOTE: The base state should only be applied if there's some
                // existing document to override, so use a Precondition of
                // exists=true
                r.push(new cn(e.key, t, In(t.proto.mapValue), Ze.exists(!0)));
            }
            return this.Kn.Ir(i, e, r, t);
        })).then(t => {
            const e = t.mn(s);
            return {
                batchId: t.batchId,
                Nn: e
            };
        });
    }
    bh(t) {
        return this.persistence.runTransaction("Acknowledge batch", "readwrite-primary", e => {
            const n = t.batch.keys(), s = this.mh.Qr({
                Kr: !0
            });
            return this.vh(e, t, s).next(() => s.apply(e)).next(() => this.Kn.Dr(e)).next(() => this.Ah.Xn(e, n));
        });
    }
    Sh(t) {
        return this.persistence.runTransaction("Reject batch", "readwrite-primary", e => {
            let n;
            return this.Kn.Ar(e, t).next(t => (g(null !== t), n = t.keys(), this.Kn.pr(e, t))).next(() => this.Kn.Dr(e)).next(() => this.Ah.Xn(e, n));
        });
    }
    Vr() {
        return this.persistence.runTransaction("Get highest unacknowledged batch id", "readonly", t => this.Kn.Vr(t));
    }
    io() {
        return this.persistence.runTransaction("Get last remote snapshot version", "readonly", t => this.Fo.io(t));
    }
    Dh(t) {
        const e = t.X;
        let n = this.Th;
        return this.persistence.runTransaction("Apply remote event", "readwrite-primary", s => {
            const i = this.mh.Qr({
                Kr: !0
            });
            // Reset newTargetDataByTargetMap in case this transaction gets re-run.
                        n = this.Th;
            const r = [];
            t.Wt.forEach((t, i) => {
                const o = n.get(i);
                if (!o) return;
                // Only update the remote keys if the target is still active. This
                // ensures that we can persist the updated target data along with
                // the updated assignment.
                                r.push(this.Fo.Eo(s, t.Xt, i).next(() => this.Fo.wo(s, t.Yt, i)));
                const h = t.resumeToken;
                // Update the resume token if the change includes one.
                                if (h.H() > 0) {
                    const a = o.tt(h, e).Z(s.Ao);
                    n = n.nt(i, a), 
                    // Update the target data if there are target changes (or if
                    // sufficient time has passed since the last update).
                    Mi.Ch(o, a, t) && r.push(this.Fo.uo(s, a));
                }
            });
            let o = wt(), h = Rt();
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
                    const c = n.get(h);
                    // Note: The order of the steps below is important, since we want
                    // to ensure that rejected limbo resolutions (which fabricate
                    // NoDocuments with SnapshotVersion.min()) never add documents to
                    // cache.
                                        a instanceof Rn && a.version.isEqual(q.min()) ? (
                    // NoDocuments with SnapshotVersion.min() are used in manufactured
                    // events. We remove these documents from cache since we lost
                    // access.
                    i.Mn(h, e), o = o.nt(h, a)) : null == c || a.version.o(c.version) > 0 || 0 === a.version.o(c.version) && c.hasPendingWrites ? (i.xn(a, e), 
                    o = o.nt(h, a)) : m("LocalStore", "Ignoring outdated watch update for ", h, ". Current version:", c.version, " Watch version:", a.version), 
                    t.Kt.has(h) && r.push(this.persistence._r.dh(s, h));
                });
            })), !e.isEqual(q.min())) {
                const t = this.Fo.io(s).next(t => this.Fo.oo(s, s.Ao, e));
                r.push(t);
            }
            return ss.Dn(r).next(() => i.apply(s)).next(() => this.Ah.Zn(s, o));
        }).then(t => (this.Th = n, t));
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
     */    static Ch(t, e, n) {
        // Always persist target data if we don't already have a resume token.
        if (g(e.resumeToken.H() > 0), 0 === t.resumeToken.H()) return !0;
        // Don't allow resume token changes to be buffered indefinitely. This
        // allows us to be reasonably up-to-date after a crash and avoids needing
        // to loop over all active queries on shutdown. Especially in the browser
        // we may not get time to do anything interesting while the current tab is
        // closing.
                if (e.X.m() - t.X.m() >= this.Nh) return !0;
        // Otherwise if the only thing that has changed about a target is its resume
        // token it's not worth persisting. Note that the RemoteStore keeps an
        // in-memory view of the currently active targets which includes the current
        // resume token, so stream failure or user changes will still use an
        // up-to-date resume token regardless of what we do here.
                return n.Yt.size + n.Jt.size + n.Xt.size > 0;
    }
    async Fh(t) {
        try {
            await this.persistence.runTransaction("notifyLocalViewChanges", "readwrite", e => ss.forEach(t, t => ss.forEach(t.cs, n => this.persistence._r.To(e, t.targetId, n)).next(() => ss.forEach(t.us, n => this.persistence._r.Io(e, t.targetId, n)))));
        } catch (t) {
            if (!ws(t)) throw t;
            // If `notifyLocalViewChanges` fails, we did not advance the sequence
            // number for the documents that were included in this transaction.
            // This might trigger them to be deleted earlier than they otherwise
            // would have, but it should not invalidate the integrity of the data.
            m("LocalStore", "Failed to update sequence numbers: " + t);
        }
        for (const e of t) {
            const t = e.targetId;
            if (!e.fromCache) {
                const e = this.Th.get(t), n = e.X, s = e.et(n);
                // Advance the last limbo free snapshot version
                                this.Th = this.Th.nt(t, s);
            }
        }
    }
    kh(t) {
        return this.persistence.runTransaction("Get next mutation batch", "readonly", e => (void 0 === t && (t = -1), 
        this.Kn.Pr(e, t)));
    }
    xh(t) {
        return this.persistence.runTransaction("read document", "readonly", e => this.Ah.zn(e, t));
    }
    $h(t) {
        return this.persistence.runTransaction("Allocate target", "readwrite", e => {
            let n;
            return this.Fo.do(e, t).next(s => s ? (
            // This target has been listened to previously, so reuse the
            // previous targetID.
            // TODO(mcg): freshen last accessed date?
            n = s, ss.resolve(n)) : this.Fo.eo(e).next(s => (n = new st(t, s, 0 /* Listen */ , e.Ao), 
            this.Fo.ho(e, n).next(() => n))));
        }).then(e => {
            // If Multi-Tab is enabled, the existing target data may be newer than
            // the in-memory data
            const n = this.Th.get(e.targetId);
            return (null === n || e.X.o(n.X) > 0) && (this.Th = this.Th.nt(e.targetId, e), this.Eh.set(t, e.targetId)), 
            e;
        });
    }
    do(t, e) {
        const n = this.Eh.get(e);
        return void 0 !== n ? ss.resolve(this.Th.get(n)) : this.Fo.do(t, e);
    }
    async Mh(t, e) {
        const n = this.Th.get(t), s = e ? "readwrite" : "readwrite-primary";
        try {
            e || await this.persistence.runTransaction("Release target", s, t => this.persistence._r.removeTarget(t, n));
        } catch (e) {
            if (!ws(e)) throw e;
            // All `releaseTarget` does is record the final metadata state for the
            // target, but we've been recording this periodically during target
            // activity. If we lose this write this could cause a very slight
            // difference in the order of target deletion during GC, but we
            // don't define exact LRU semantics so this is acceptable.
            m("LocalStore", `Failed to update sequence numbers for target ${t}: ${e}`);
        }
        this.Th = this.Th.remove(t), this.Eh.delete(n.target);
    }
    Oh(t, e) {
        let n = q.min(), s = Rt();
        return this.persistence.runTransaction("Execute query", "readonly", i => this.do(i, Sn(t)).next(t => {
            if (t) return n = t.lastLimboFreeSnapshotVersion, this.Fo.mo(i, t.targetId).next(t => {
                s = t;
            });
        }).next(() => this.wh.es(i, t, e ? n : q.min(), e ? s : Rt())).next(t => ({
            documents: t,
            Lh: s
        })));
    }
    vh(t, e, n) {
        const s = e.batch, i = s.keys();
        let r = ss.resolve();
        return i.forEach(i => {
            r = r.next(() => n.On(t, i)).next(t => {
                let r = t;
                const o = e.Rn.get(i);
                g(null !== o), (!r || r.version.o(o) < 0) && (r = s.Tn(i, r, e), r && 
                // We use the commitVersion as the readTime rather than the
                // document's updateTime since the updateTime is not advanced
                // for updates that do not modify the underlying document.
                n.xn(r, e.An));
            });
        }), r.next(() => this.Kn.pr(t, s));
    }
    tr(t) {
        return this.persistence.runTransaction("Collect garbage", "readwrite-primary", e => t.ar(e, this.Th));
    }
}

/**
 * The maximum time to leave a resume token buffered without writing it out.
 * This value is arbitrary: it's long enough to avoid several writes
 * (possibly indefinitely if updates come more frequently than this) but
 * short enough that restarting after crashing will still have a pretty
 * recent resume token.
 */
// PORTING NOTE: Multi-Tab only.
function Oi(t, e) {
    const n = y(t), s = y(n.Fo), i = n.Th.get(e);
    return i ? Promise.resolve(i.target) : n.persistence.runTransaction("Get target data", "readonly", t => s.Me(t, e).next(t => t ? t.target : null));
}

/**
 * Returns the set of documents that have been updated since the last call.
 * If this is the first call, returns the set of changes since client
 * initialization. Further invocations will return document that have changed
 * since the prior call.
 */
// PORTING NOTE: Multi-Tab only.
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
async function Li(t) {
    if (t.code !== M.FAILED_PRECONDITION || t.message !== rs) throw t;
    m("LocalStore", "Unexpectedly lost primary lease");
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
 */ Mi.Nh = 3e8;

class qi {
    constructor() {
        // A set of outstanding references to a document sorted by key.
        this.qh = new _t(Bi.Bh), 
        // A set of outstanding references to a document sorted by target id.
        this.Uh = new _t(Bi.Wh);
    }
    /** Returns true if the reference set contains no references. */    _() {
        return this.qh._();
    }
    /** Adds a reference to the given document key for the given ID. */    To(t, e) {
        const n = new Bi(t, e);
        this.qh = this.qh.add(n), this.Uh = this.Uh.add(n);
    }
    /** Add references to the given document keys for the given ID. */    Qh(t, e) {
        t.forEach(t => this.To(t, e));
    }
    /**
     * Removes a reference to the given document key for the given
     * ID.
     */    Io(t, e) {
        this.jh(new Bi(t, e));
    }
    Kh(t, e) {
        t.forEach(t => this.Io(t, e));
    }
    /**
     * Clears all references with a given ID. Calls removeRef() for each key
     * removed.
     */    Gh(t) {
        const e = new j(new U([])), n = new Bi(e, t), s = new Bi(e, t + 1), i = [];
        return this.Uh.vt([ n, s ], t => {
            this.jh(t), i.push(t.key);
        }), i;
    }
    zh() {
        this.qh.forEach(t => this.jh(t));
    }
    jh(t) {
        this.qh = this.qh.delete(t), this.Uh = this.Uh.delete(t);
    }
    Hh(t) {
        const e = new j(new U([])), n = new Bi(e, t), s = new Bi(e, t + 1);
        let i = Rt();
        return this.Uh.vt([ n, s ], t => {
            i = i.add(t.key);
        }), i;
    }
    Cr(t) {
        const e = new Bi(t, 0), n = this.qh.Dt(e);
        return null !== n && t.isEqual(n.key);
    }
}

class Bi {
    constructor(t, e) {
        this.key = t, this.Yh = e;
    }
    /** Compare by key then by ID */    static Bh(t, e) {
        return j.P(t.key, e.key) || v(t.Yh, e.Yh);
    }
    /** Compare by ID then by key */    static Wh(t, e) {
        return v(t.Yh, e.Yh) || j.P(t.key, e.key);
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
 */ class Ui {
    constructor(t) {
        this.uid = t;
    }
    Tr() {
        return null != this.uid;
    }
    /**
     * Returns a key representing this user, suitable for inclusion in a
     * dictionary.
     */    Jh() {
        return this.Tr() ? "uid:" + this.uid : "anonymous-user";
    }
    isEqual(t) {
        return t.uid === this.uid;
    }
}

/** A user with a null UID. */ Ui.UNAUTHENTICATED = new Ui(null), 
// TODO(mikelehen): Look into getting a proper uid-equivalent for
// non-FirebaseAuth providers.
Ui.Xh = new Ui("google-credentials-uid"), Ui.Zh = new Ui("first-party-uid");

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
class Wi {
    constructor(t, e) {
        this.user = e, this.type = "OAuth", this.ta = {}, 
        // Set the headers using Object Literal notation to avoid minification
        this.ta.Authorization = "Bearer " + t;
    }
}

/** A CredentialsProvider that always yields an empty token. */ class Qi {
    constructor() {
        /**
         * Stores the listener registered with setChangeListener()
         * This isn't actually necessary since the UID never changes, but we use this
         * to verify the listen contract is adhered to in tests.
         */
        this.ea = null;
    }
    getToken() {
        return Promise.resolve(null);
    }
    na() {}
    sa(t) {
        this.ea = t, 
        // Fire with initial user.
        t(Ui.UNAUTHENTICATED);
    }
    ia() {
        this.ea = null;
    }
}

class ji {
    constructor(t) {
        /**
         * The auth token listener registered with FirebaseApp, retained here so we
         * can unregister it.
         */
        this.ra = null, 
        /** Tracks the current User. */
        this.currentUser = Ui.UNAUTHENTICATED, this.oa = !1, 
        /**
         * Counter used to detect if the token changed while a getToken request was
         * outstanding.
         */
        this.ha = 0, 
        /** The listener registered with setChangeListener(). */
        this.ea = null, this.forceRefresh = !1, this.ra = () => {
            this.ha++, this.currentUser = this.aa(), this.oa = !0, this.ea && this.ea(this.currentUser);
        }, this.ha = 0, this.auth = t.getImmediate({
            optional: !0
        }), this.auth ? this.auth.addAuthTokenListener(this.ra) : (
        // if auth is not available, invoke tokenListener once with null token
        this.ra(null), t.get().then(t => {
            this.auth = t, this.ra && 
            // tokenListener can be removed by removeChangeListener()
            this.auth.addAuthTokenListener(this.ra);
        }, () => {}));
    }
    getToken() {
        // Take note of the current value of the tokenCounter so that this method
        // can fail (with an ABORTED error) if there is a token change while the
        // request is outstanding.
        const t = this.ha, e = this.forceRefresh;
        return this.forceRefresh = !1, this.auth ? this.auth.getToken(e).then(e => 
        // Cancel the request since the token changed while the request was
        // outstanding so the response is potentially for a previous user (which
        // user, we can't be sure).
        this.ha !== t ? (m("FirebaseCredentialsProvider", "getToken aborted due to token change."), 
        this.getToken()) : e ? (g("string" == typeof e.accessToken), new Wi(e.accessToken, this.currentUser)) : null) : Promise.resolve(null);
    }
    na() {
        this.forceRefresh = !0;
    }
    sa(t) {
        this.ea = t, 
        // Fire the initial event
        this.oa && t(this.currentUser);
    }
    ia() {
        this.auth && this.auth.removeAuthTokenListener(this.ra), this.ra = null, this.ea = null;
    }
    // Auth.getUid() can return null even with a user logged in. It is because
    // getUid() is synchronous, but the auth code populating Uid is asynchronous.
    // This method should only be called in the AuthTokenListener callback
    // to guarantee to get the actual user.
    aa() {
        const t = this.auth && this.auth.getUid();
        return g(null === t || "string" == typeof t), new Ui(t);
    }
}

/*
 * FirstPartyToken provides a fresh token each time its value
 * is requested, because if the token is too old, requests will be rejected.
 * Technically this may no longer be necessary since the SDK should gracefully
 * recover from unauthenticated errors (see b/33147818 for context), but it's
 * safer to keep the implementation as-is.
 */ class Ki {
    constructor(t, e) {
        this.ca = t, this.ua = e, this.type = "FirstParty", this.user = Ui.Zh;
    }
    get ta() {
        const t = {
            "X-Goog-AuthUser": this.ua
        }, e = this.ca.auth.la([]);
        return e && (t.Authorization = e), t;
    }
}

/*
 * Provides user credentials required for the Firestore JavaScript SDK
 * to authenticate the user, using technique that is only available
 * to applications hosted by Google.
 */ class Gi {
    constructor(t, e) {
        this.ca = t, this.ua = e;
    }
    getToken() {
        return Promise.resolve(new Ki(this.ca, this.ua));
    }
    sa(t) {
        // Fire with initial uid.
        t(Ui.Zh);
    }
    ia() {}
    na() {}
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
class zi {
    constructor(t, e, n, s, i, r) {
        this.Es = t, this._a = n, this.fa = s, this.da = i, this.listener = r, this.state = 0 /* Initial */ , 
        /**
         * A close count that's incremented every time the stream is closed; used by
         * getCloseGuardedDispatcher() to invalidate callbacks that happen after
         * close.
         */
        this.wa = 0, this.Ta = null, this.stream = null, this.wi = new ls(t, e);
    }
    /**
     * Returns true if start() has been called and no error has occurred. True
     * indicates the stream is open or in the process of opening (which
     * encompasses respecting backoff, getting auth tokens, and starting the
     * actual RPC). Use isOpen() to determine if the stream is open and ready for
     * outbound requests.
     */    Ea() {
        return 1 /* Starting */ === this.state || 2 /* Open */ === this.state || 4 /* Backoff */ === this.state;
    }
    /**
     * Returns true if the underlying RPC is open (the onOpen() listener has been
     * called) and the stream is ready for outbound requests.
     */    Ia() {
        return 2 /* Open */ === this.state;
    }
    /**
     * Starts the RPC. Only allowed if isStarted() returns false. The stream is
     * not immediately ready for use: onOpen() will be invoked when the RPC is
     * ready for outbound requests, at which point isOpen() will return true.
     *
     * When start returns, isStarted() will return true.
     */    start() {
        3 /* Error */ !== this.state ? this.auth() : this.ma();
    }
    /**
     * Stops the RPC. This call is idempotent and allowed regardless of the
     * current isStarted() state.
     *
     * When stop returns, isStarted() and isOpen() will both return false.
     */    async stop() {
        this.Ea() && await this.close(0 /* Initial */);
    }
    /**
     * After an error the stream will usually back off on the next attempt to
     * start it. If the error warrants an immediate restart of the stream, the
     * sender can use this to indicate that the receiver should not back off.
     *
     * Each error will call the onClose() listener. That function can decide to
     * inhibit backoff if required.
     */    Aa() {
        this.state = 0 /* Initial */ , this.wi.reset();
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
     */    Ra() {
        // Starts the idle time if we are in state 'Open' and are not yet already
        // running a timer (in which case the previous idle timeout still applies).
        this.Ia() && null === this.Ta && (this.Ta = this.Es.vs(this._a, 6e4, () => this.Pa()));
    }
    /** Sends a message to the underlying stream. */    Va(t) {
        this.ga(), this.stream.send(t);
    }
    /** Called by the idle timer when the stream should close due to inactivity. */    async Pa() {
        if (this.Ia()) 
        // When timing out an idle stream there's no reason to force the stream into backoff when
        // it restarts so set the stream state to Initial instead of Error.
        return this.close(0 /* Initial */);
    }
    /** Marks the stream as active again. */    ga() {
        this.Ta && (this.Ta.cancel(), this.Ta = null);
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
        this.ga(), this.wi.cancel(), 
        // Invalidates any stream-related callbacks (e.g. from auth or the
        // underlying stream), guaranteeing they won't execute.
        this.wa++, 3 /* Error */ !== t ? 
        // If this is an intentional close ensure we don't delay our next connection attempt.
        this.wi.reset() : e && e.code === M.RESOURCE_EXHAUSTED ? (
        // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
        A(e.toString()), A("Using maximum backoff delay to prevent overloading the backend."), 
        this.wi.ys()) : e && e.code === M.UNAUTHENTICATED && 
        // "unauthenticated" error means the token was rejected. Try force refreshing it in case it
        // just expired.
        this.da.na(), 
        // Clean up the underlying stream because we are no longer interested in events.
        null !== this.stream && (this.ya(), this.stream.close(), this.stream = null), 
        // This state must be assigned before calling onClose() to allow the callback to
        // inhibit backoff or otherwise manipulate the state in its non-started state.
        this.state = t, 
        // Notify the listener that the stream closed.
        await this.listener.pa(e);
    }
    /**
     * Can be overridden to perform additional cleanup before the stream is closed.
     * Calling super.tearDown() is not required.
     */    ya() {}
    auth() {
        this.state = 1 /* Starting */;
        const t = this.ba(this.wa), e = this.wa;
        // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                this.da.getToken().then(t => {
            // Stream can be stopped while waiting for authentication.
            // TODO(mikelehen): We really should just use dispatchIfNotClosed
            // and let this dispatch onto the queue, but that opened a spec test can
            // of worms that I don't want to deal with in this PR.
            this.wa === e && 
            // Normally we'd have to schedule the callback on the AsyncQueue.
            // However, the following calls are safe to be called outside the
            // AsyncQueue since they don't chain asynchronous calls
            this.va(t);
        }, e => {
            t(() => {
                const t = new O(M.UNKNOWN, "Fetching auth token failed: " + e.message);
                return this.Sa(t);
            });
        });
    }
    va(t) {
        const e = this.ba(this.wa);
        this.stream = this.Da(t), this.stream.Ca(() => {
            e(() => (this.state = 2 /* Open */ , this.listener.Ca()));
        }), this.stream.pa(t => {
            e(() => this.Sa(t));
        }), this.stream.onMessage(t => {
            e(() => this.onMessage(t));
        });
    }
    ma() {
        this.state = 4 /* Backoff */ , this.wi.ps(async () => {
            this.state = 0 /* Initial */ , this.start();
        });
    }
    // Visible for tests
    Sa(t) {
        // In theory the stream could close cleanly, however, in our current model
        // we never expect this to happen because if we stop a stream ourselves,
        // this callback will never be called. To prevent cases where we retry
        // without a backoff accidentally, we set the stream to error in all cases.
        return m("PersistentStream", "close with error: " + t), this.stream = null, this.close(3 /* Error */ , t);
    }
    /**
     * Returns a "dispatcher" function that dispatches operations onto the
     * AsyncQueue but only runs them if closeCount remains unchanged. This allows
     * us to turn auth / stream callbacks into no-ops if the stream is closed /
     * re-opened, etc.
     */    ba(t) {
        return e => {
            this.Es.hi(() => this.wa === t ? e() : (m("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), 
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
 */ class Hi extends zi {
    constructor(t, e, n, s, i) {
        super(t, "listen_stream_connection_backoff" /* ListenStreamConnectionBackoff */ , "listen_stream_idle" /* ListenStreamIdle */ , e, n, i), 
        this.serializer = s;
    }
    Da(t) {
        return this.fa.Na("Listen", t);
    }
    onMessage(t) {
        // A successful response means the stream is healthy
        this.wi.reset();
        const e = Re(this.serializer, t), n = function(t) {
            // We have only reached a consistent snapshot for the entire stream if there
            // is a read_time set and it applies to all targets (i.e. the list of
            // targets is empty). The backend is guaranteed to send such responses.
            if (!("targetChange" in t)) return q.min();
            const e = t.targetChange;
            return e.targetIds && e.targetIds.length ? q.min() : e.readTime ? ue(e.readTime) : q.min();
        }(t);
        return this.listener.Fa(e, n);
    }
    /**
     * Registers interest in the results of the given target. If the target
     * includes a resumeToken it will be included in the request. Results that
     * affect the target will be streamed back as WatchChange messages that
     * reference the targetId.
     */    ka(t) {
        const e = {};
        e.database = Ee(this.serializer), e.addTarget = function(t, e) {
            let n;
            const s = e.target;
            return n = tt(s) ? {
                documents: ye(t, s)
            } : {
                query: pe(t, s)
            }, n.targetId = e.targetId, e.resumeToken.H() > 0 && (n.resumeToken = ae(t, e.resumeToken)), 
            n;
        }(this.serializer, t);
        const n = ve(this.serializer, t);
        n && (e.labels = n), this.Va(e);
    }
    /**
     * Unregisters interest in the results of the target associated with the
     * given targetId.
     */    xa(t) {
        const e = {};
        e.database = Ee(this.serializer), e.removeTarget = t, this.Va(e);
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
 */ class Yi extends zi {
    constructor(t, e, n, s, i) {
        super(t, "write_stream_connection_backoff" /* WriteStreamConnectionBackoff */ , "write_stream_idle" /* WriteStreamIdle */ , e, n, i), 
        this.serializer = s, this.$a = !1;
    }
    /**
     * Tracks whether or not a handshake has been successfully exchanged and
     * the stream is ready to accept mutations.
     */    get Ma() {
        return this.$a;
    }
    // Override of PersistentStream.start
    start() {
        this.$a = !1, this.lastStreamToken = void 0, super.start();
    }
    ya() {
        this.$a && this.Oa([]);
    }
    Da(t) {
        return this.fa.Na("Write", t);
    }
    onMessage(t) {
        if (
        // Always capture the last stream token.
        g(!!t.streamToken), this.lastStreamToken = t.streamToken, this.$a) {
            // A successful first write response means the stream is healthy,
            // Note, that we could consider a successful handshake healthy, however,
            // the write itself might be causing an error we want to back off from.
            this.wi.reset();
            const e = ge(t.writeResults, t.commitTime), n = ue(t.commitTime);
            return this.listener.La(n, e);
        }
        // The first response is always the handshake response
        return g(!t.writeResults || 0 === t.writeResults.length), this.$a = !0, this.listener.qa();
    }
    /**
     * Sends an initial streamToken to the server, performing the handshake
     * required to make the StreamingWrite RPC work. Subsequent
     * calls should wait until onHandshakeComplete was called.
     */    Ba() {
        // TODO(dimond): Support stream resumption. We intentionally do not set the
        // stream token on the handshake, ignoring any stream token we might have.
        const t = {};
        t.database = Ee(this.serializer), this.Va(t);
    }
    /** Sends a group of mutations to the Firestore backend to apply. */    Oa(t) {
        const e = {
            streamToken: this.lastStreamToken,
            writes: t.map(t => Pe(this.serializer, t))
        };
        this.Va(e);
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
class Ji extends class {} {
    constructor(t, e, n) {
        super(), this.credentials = t, this.fa = e, this.serializer = n, this.Ua = !1;
    }
    Wa() {
        if (this.Ua) throw new O(M.FAILED_PRECONDITION, "The client has already been terminated.");
    }
    /** Gets an auth token and invokes the provided RPC. */    Qa(t, e, n) {
        return this.Wa(), this.credentials.getToken().then(s => this.fa.Qa(t, e, n, s)).catch(t => {
            throw t.code === M.UNAUTHENTICATED && this.credentials.na(), t;
        });
    }
    /** Gets an auth token and invokes the provided RPC with streamed results. */    ja(t, e, n) {
        return this.Wa(), this.credentials.getToken().then(s => this.fa.ja(t, e, n, s)).catch(t => {
            throw t.code === M.UNAUTHENTICATED && this.credentials.na(), t;
        });
    }
    terminate() {
        this.Ua = !1;
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
class Xi {
    constructor(t, e) {
        this.ti = t, this.Ka = e, 
        /** The current OnlineState. */
        this.state = "Unknown" /* Unknown */ , 
        /**
         * A count of consecutive failures to open the stream. If it reaches the
         * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
         * Offline.
         */
        this.Ga = 0, 
        /**
         * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
         * transition from OnlineState.Unknown to OnlineState.Offline without waiting
         * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
         */
        this.za = null, 
        /**
         * Whether the client should log a warning message if it fails to connect to
         * the backend (initially true, cleared after a successful stream, or if we've
         * logged the message already).
         */
        this.Ha = !0;
    }
    /**
     * Called by RemoteStore when a watch stream is started (including on each
     * backoff attempt).
     *
     * If this is the first attempt, it sets the OnlineState to Unknown and starts
     * the onlineStateTimer.
     */    Ya() {
        0 === this.Ga && (this.Ja("Unknown" /* Unknown */), this.za = this.ti.vs("online_state_timeout" /* OnlineStateTimeout */ , 1e4, () => (this.za = null, 
        this.Xa("Backend didn't respond within 10 seconds."), this.Ja("Offline" /* Offline */), 
        Promise.resolve())));
    }
    /**
     * Updates our OnlineState as appropriate after the watch stream reports a
     * failure. The first failure moves us to the 'Unknown' state. We then may
     * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
     * actually transition to the 'Offline' state.
     */    Za(t) {
        "Online" /* Online */ === this.state ? this.Ja("Unknown" /* Unknown */) : (this.Ga++, 
        this.Ga >= 1 && (this.tc(), this.Xa("Connection failed 1 times. Most recent error: " + t.toString()), 
        this.Ja("Offline" /* Offline */)));
    }
    /**
     * Explicitly sets the OnlineState to the specified state.
     *
     * Note that this resets our timers / failure counters, etc. used by our
     * Offline heuristics, so must not be used in place of
     * handleWatchStreamStart() and handleWatchStreamFailure().
     */    set(t) {
        this.tc(), this.Ga = 0, "Online" /* Online */ === t && (
        // We've connected to watch at least once. Don't warn the developer
        // about being offline going forward.
        this.Ha = !1), this.Ja(t);
    }
    Ja(t) {
        t !== this.state && (this.state = t, this.Ka(t));
    }
    Xa(t) {
        const e = `Could not reach Cloud Firestore backend. ${t}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
        this.Ha ? (A(e), this.Ha = !1) : m("OnlineStateTracker", e);
    }
    tc() {
        null !== this.za && (this.za.cancel(), this.za = null);
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
class Zi {
    constructor(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    t, 
    /** The client-side proxy for interacting with the backend. */
    e, n, s, i) {
        this.ec = t, this.nc = e, this.ti = n, 
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
        this.sc = [], 
        /**
         * A mapping of watched targets that the client cares about tracking and the
         * user has explicitly called a 'listen' for this target.
         *
         * These targets may or may not have been sent to or acknowledged by the
         * server. On re-establishing the listen stream, these targets should be sent
         * to the server. The targets removed with unlistens are removed eagerly
         * without waiting for confirmation from the listen stream.
         */
        this.ic = new Map, this.rc = null, 
        /**
         * A set of reasons for why the RemoteStore may be offline. If empty, the
         * RemoteStore may start its network connections.
         */
        this.oc = new Set, this.hc = i, this.hc.ac(t => {
            n.hi(async () => {
                // Porting Note: Unlike iOS, `restartNetwork()` is called even when the
                // network becomes unreachable as we don't have any other way to tear
                // down our streams.
                this.cc() && (m("RemoteStore", "Restarting streams for network reachability change."), 
                await this.uc());
            });
        }), this.lc = new Xi(n, s), 
        // Create streams (but note they're not started yet).
        this._c = function(t, e, n) {
            const s = y(t);
            return s.Wa(), new Hi(e, s.fa, s.credentials, s.serializer, n);
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
 */ (this.nc, n, {
            Ca: this.fc.bind(this),
            pa: this.dc.bind(this),
            Fa: this.wc.bind(this)
        }), this.Tc = function(t, e, n) {
            const s = y(t);
            return s.Wa(), new Yi(e, s.fa, s.credentials, s.serializer, n);
        }(this.nc, n, {
            Ca: this.Ec.bind(this),
            pa: this.Ic.bind(this),
            qa: this.mc.bind(this),
            La: this.La.bind(this)
        });
    }
    /**
     * Starts up the remote store, creating streams, restoring state from
     * LocalStore, etc.
     */    start() {
        return this.enableNetwork();
    }
    /** Re-enables the network. Idempotent. */    enableNetwork() {
        return this.oc.delete(0 /* UserDisabled */), this.Ac();
    }
    async Ac() {
        this.cc() && (this.Rc() ? this.Pc() : this.lc.set("Unknown" /* Unknown */), 
        // This will start the write stream if necessary.
        await this.Vc());
    }
    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */    async disableNetwork() {
        this.oc.add(0 /* UserDisabled */), await this.gc(), 
        // Set the OnlineState to Offline so get()s return from cache, etc.
        this.lc.set("Offline" /* Offline */);
    }
    async gc() {
        await this.Tc.stop(), await this._c.stop(), this.sc.length > 0 && (m("RemoteStore", `Stopping write stream with ${this.sc.length} pending writes`), 
        this.sc = []), this.yc();
    }
    async Zo() {
        m("RemoteStore", "RemoteStore shutting down."), this.oc.add(5 /* Shutdown */), await this.gc(), 
        this.hc.Zo(), 
        // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
        // triggering spurious listener events with cached data, etc.
        this.lc.set("Unknown" /* Unknown */);
    }
    /**
     * Starts new listen for the given target. Uses resume token if provided. It
     * is a no-op if the target of given `TargetData` is already being listened to.
     */    listen(t) {
        this.ic.has(t.targetId) || (
        // Mark this as something the client is currently listening for.
        this.ic.set(t.targetId, t), this.Rc() ? 
        // The listen will be sent in onWatchStreamOpen
        this.Pc() : this._c.Ia() && this.pc(t));
    }
    /**
     * Removes the listen from server. It is a no-op if the given target id is
     * not being listened to.
     */    bc(t) {
        this.ic.delete(t), this._c.Ia() && this.vc(t), 0 === this.ic.size && (this._c.Ia() ? this._c.Ra() : this.cc() && 
        // Revert to OnlineState.Unknown if the watch stream is not open and we
        // have no listeners, since without any listens to send we cannot
        // confirm if the stream is healthy and upgrade to OnlineState.Online.
        this.lc.set("Unknown" /* Unknown */));
    }
    /** {@link TargetMetadataProvider.getTargetDataForTarget} */    Me(t) {
        return this.ic.get(t) || null;
    }
    /** {@link TargetMetadataProvider.getRemoteKeysForTarget} */    $e(t) {
        return this.Sc.$e(t);
    }
    /**
     * We need to increment the the expected number of pending responses we're due
     * from watch so we wait for the ack to process any messages from this target.
     */    pc(t) {
        this.rc.de(t.targetId), this._c.ka(t);
    }
    /**
     * We need to increment the expected number of pending responses we're due
     * from watch so we wait for the removal on the server before we process any
     * messages from this target.
     */    vc(t) {
        this.rc.de(t), this._c.xa(t);
    }
    Pc() {
        this.rc = new Ft(this), this._c.start(), this.lc.Ya();
    }
    /**
     * Returns whether the watch stream should be started because it's necessary
     * and has not yet been started.
     */    Rc() {
        return this.cc() && !this._c.Ea() && this.ic.size > 0;
    }
    cc() {
        return 0 === this.oc.size;
    }
    yc() {
        this.rc = null;
    }
    async fc() {
        this.ic.forEach((t, e) => {
            this.pc(t);
        });
    }
    async dc(t) {
        this.yc(), 
        // If we still need the watch stream, retry the connection.
        this.Rc() ? (this.lc.Za(t), this.Pc()) : 
        // No need to restart watch stream because there are no active targets.
        // The online state is set to unknown because there is no active attempt
        // at establishing a connection
        this.lc.set("Unknown" /* Unknown */);
    }
    async wc(t, e) {
        if (
        // Mark the client as online since we got a message from the server
        this.lc.set("Online" /* Online */), t instanceof Ct && 2 /* Removed */ === t.state && t.cause) 
        // There was an error on a target, don't wait for a consistent snapshot
        // to raise events
        try {
            await this.Dc(t);
        } catch (e) {
            m("RemoteStore", "Failed to remove targets %s: %s ", t.targetIds.join(","), e), 
            await this.Cc(e);
        } else if (t instanceof St ? this.rc.Pe(t) : t instanceof Dt ? this.rc.De(t) : this.rc.ye(t), 
        !e.isEqual(q.min())) try {
            const t = await this.ec.io();
            e.o(t) >= 0 && 
            // We have received a target change with a global snapshot if the snapshot
            // version is not equal to SnapshotVersion.min().
            await this.Nc(e);
        } catch (t) {
            m("RemoteStore", "Failed to raise snapshot:", t), await this.Cc(t);
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
     */    async Cc(t, e) {
        if (!ws(t)) throw t;
        this.oc.add(1 /* IndexedDbFailed */), 
        // Disable network and raise offline snapshots
        await this.gc(), this.lc.set("Offline" /* Offline */), e || (
        // Use a simple read operation to determine if IndexedDB recovered.
        // Ideally, we would expose a health check directly on SimpleDb, but
        // RemoteStore only has access to persistence through LocalStore.
        e = () => this.ec.io()), 
        // Probe IndexedDB periodically and re-enable network
        this.ti.Pi(async () => {
            m("RemoteStore", "Retrying IndexedDB access"), await e(), this.oc.delete(1 /* IndexedDbFailed */), 
            await this.Ac();
        });
    }
    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */    Fc(t) {
        return t().catch(e => this.Cc(e, t));
    }
    /**
     * Takes a batch of changes from the Datastore, repackages them as a
     * RemoteEvent, and passes that on to the listener, which is typically the
     * SyncEngine.
     */    Nc(t) {
        const e = this.rc.Fe(t);
        // Update in-memory resume tokens. LocalStore will update the
        // persistent view of these when applying the completed RemoteEvent.
                // Finally raise remote event
        return e.Wt.forEach((e, n) => {
            if (e.resumeToken.H() > 0) {
                const s = this.ic.get(n);
                // A watched target might have been removed already.
                                s && this.ic.set(n, s.tt(e.resumeToken, t));
            }
        }), 
        // Re-establish listens for the targets that have been invalidated by
        // existence filter mismatches.
        e.Qt.forEach(t => {
            const e = this.ic.get(t);
            if (!e) 
            // A watched target might have been removed already.
            return;
            // Clear the resume token for the target, since we're in a known mismatch
            // state.
                        this.ic.set(t, e.tt(nt.Y, e.X)), 
            // Cause a hard reset by unwatching and rewatching immediately, but
            // deliberately don't send a resume token so that we get a full update.
            this.vc(t);
            // Mark the target we send as being on behalf of an existence filter
            // mismatch, but don't actually retain that in listenTargets. This ensures
            // that we flag the first re-listen this way without impacting future
            // listens of this target (that might happen e.g. on reconnect).
            const n = new st(e.target, t, 1 /* ExistenceFilterMismatch */ , e.sequenceNumber);
            this.pc(n);
        }), this.Sc.Dh(e);
    }
    /** Handles an error on a target */    async Dc(t) {
        const e = t.cause;
        for (const n of t.targetIds) 
        // A watched target might have been removed already.
        this.ic.has(n) && (await this.Sc.kc(n, e), this.ic.delete(n), this.rc.removeTarget(n));
    }
    /**
     * Attempts to fill our write pipeline with writes from the LocalStore.
     *
     * Called internally to bootstrap or refill the write pipeline and by
     * SyncEngine whenever there are new mutations to process.
     *
     * Starts the write stream if necessary.
     */    async Vc() {
        let t = this.sc.length > 0 ? this.sc[this.sc.length - 1].batchId : -1;
        for (;this.xc(); ) try {
            const e = await this.ec.kh(t);
            if (null === e) {
                0 === this.sc.length && this.Tc.Ra();
                break;
            }
            t = e.batchId, this.$c(e);
        } catch (t) {
            await this.Cc(t);
        }
        this.Mc() && this.Oc();
    }
    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */    xc() {
        return this.cc() && this.sc.length < 10;
    }
    // For testing
    Lc() {
        return this.sc.length;
    }
    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */    $c(t) {
        this.sc.push(t), this.Tc.Ia() && this.Tc.Ma && this.Tc.Oa(t.mutations);
    }
    Mc() {
        return this.cc() && !this.Tc.Ea() && this.sc.length > 0;
    }
    Oc() {
        this.Tc.start();
    }
    async Ec() {
        this.Tc.Ba();
    }
    async mc() {
        // Send the write pipeline now that the stream is established.
        for (const t of this.sc) this.Tc.Oa(t.mutations);
    }
    async La(t, e) {
        const n = this.sc.shift(), s = ns.from(n, t, e);
        await this.Fc(() => this.Sc.qc(s)), 
        // It's possible that with the completion of this mutation another
        // slot has freed up.
        await this.Vc();
    }
    async Ic(t) {
        // If the write stream closed after the write handshake completes, a write
        // operation failed and we fail the pending operation.
        t && this.Tc.Ma && 
        // This error affects the actual write.
        await this.Bc(t), 
        // The write stream might have been started by refilling the write
        // pipeline for failed writes
        this.Mc() && this.Oc();
    }
    async Bc(t) {
        // Only handle permanent errors here. If it's transient, just let the retry
        // logic kick in.
        if (ht(e = t.code) && e !== M.ABORTED) {
            // This was a permanent error, the request itself was the problem
            // so it's not going to succeed if we resend it.
            const e = this.sc.shift();
            // In this case it's also unlikely that the server itself is melting
            // down -- this was just a bad request so inhibit backoff on the next
            // restart.
                        this.Tc.Aa(), await this.Fc(() => this.Sc.Uc(e.batchId, t)), 
            // It's possible that with the completion of this mutation
            // another slot has freed up.
            await this.Vc();
        }
        var e;
        /**
 * Maps an error Code from a GRPC status identifier like 'NOT_FOUND'.
 *
 * @returns The Code equivalent to the given status string or undefined if
 *     there is no match.
 */    }
    async uc() {
        this.oc.add(4 /* ConnectivityChange */), await this.gc(), this.lc.set("Unknown" /* Unknown */), 
        this.Tc.Aa(), this._c.Aa(), this.oc.delete(4 /* ConnectivityChange */), await this.Ac();
    }
    async Wc(t) {
        this.ti.yi(), 
        // Tear down and re-create our network streams. This will ensure we get a
        // fresh auth token for the new user and re-fill the write pipeline with
        // new mutations from the LocalStore (since mutations are per-user).
        m("RemoteStore", "RemoteStore received new credentials"), this.oc.add(3 /* CredentialChange */), 
        await this.gc(), this.lc.set("Unknown" /* Unknown */), await this.Sc.Wc(t), this.oc.delete(3 /* CredentialChange */), 
        await this.Ac();
    }
    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */    async Qc(t) {
        t ? (this.oc.delete(2 /* IsSecondary */), await this.Ac()) : t || (this.oc.add(2 /* IsSecondary */), 
        await this.gc(), this.lc.set("Unknown" /* Unknown */));
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
// The format of the LocalStorage key that stores the client state is:
//     firestore_clients_<persistence_prefix>_<instance_key>
/** Assembles the key for a client state in WebStorage */
function tr(t, e) {
    return `firestore_clients_${t}_${e}`;
}

// The format of the WebStorage key that stores the mutation state is:
//     firestore_mutations_<persistence_prefix>_<batch_id>
//     (for unauthenticated users)
// or: firestore_mutations_<persistence_prefix>_<batch_id>_<user_uid>

// 'user_uid' is last to avoid needing to escape '_' characters that it might
// contain.
/** Assembles the key for a mutation batch in WebStorage */
function er(t, e, n) {
    let s = `firestore_mutations_${t}_${n}`;
    return e.Tr() && (s += "_" + e.uid), s;
}

// The format of the WebStorage key that stores a query target's metadata is:
//     firestore_targets_<persistence_prefix>_<target_id>
/** Assembles the key for a query state in WebStorage */
function nr(t, e) {
    return `firestore_targets_${t}_${e}`;
}

// The WebStorage prefix that stores the primary tab's online state. The
// format of the key is:
//     firestore_online_state_<persistence_prefix>
/**
 * Holds the state of a mutation batch, including its user ID, batch ID and
 * whether the batch is 'pending', 'acknowledged' or 'rejected'.
 */
// Visible for testing
class sr {
    constructor(t, e, n, s) {
        this.user = t, this.batchId = e, this.state = n, this.error = s;
    }
    /**
     * Parses a MutationMetadata from its JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static jc(t, e, n) {
        const s = JSON.parse(n);
        let i = "object" == typeof s && -1 !== [ "pending", "acknowledged", "rejected" ].indexOf(s.state) && (void 0 === s.error || "object" == typeof s.error), r = void 0;
        return i && s.error && (i = "string" == typeof s.error.message && "string" == typeof s.error.code, 
        i && (r = new O(s.error.code, s.error.message))), i ? new sr(t, e, s.state, r) : (A("SharedClientState", `Failed to parse mutation state for ID '${e}': ${n}`), 
        null);
    }
    Kc() {
        const t = {
            state: this.state,
            updateTimeMs: Date.now()
        };
        return this.error && (t.error = {
            code: this.error.code,
            message: this.error.message
        }), JSON.stringify(t);
    }
}

/**
 * Holds the state of a query target, including its target ID and whether the
 * target is 'not-current', 'current' or 'rejected'.
 */
// Visible for testing
class ir {
    constructor(t, e, n) {
        this.targetId = t, this.state = e, this.error = n;
    }
    /**
     * Parses a QueryTargetMetadata from its JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static jc(t, e) {
        const n = JSON.parse(e);
        let s = "object" == typeof n && -1 !== [ "not-current", "current", "rejected" ].indexOf(n.state) && (void 0 === n.error || "object" == typeof n.error), i = void 0;
        return s && n.error && (s = "string" == typeof n.error.message && "string" == typeof n.error.code, 
        s && (i = new O(n.error.code, n.error.message))), s ? new ir(t, n.state, i) : (A("SharedClientState", `Failed to parse target state for ID '${t}': ${e}`), 
        null);
    }
    Kc() {
        const t = {
            state: this.state,
            updateTimeMs: Date.now()
        };
        return this.error && (t.error = {
            code: this.error.code,
            message: this.error.message
        }), JSON.stringify(t);
    }
}

/**
 * This class represents the immutable ClientState for a client read from
 * WebStorage, containing the list of active query targets.
 */ class rr {
    constructor(t, e) {
        this.clientId = t, this.activeTargetIds = e;
    }
    /**
     * Parses a RemoteClientState from the JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static jc(t, e) {
        const n = JSON.parse(e);
        let s = "object" == typeof n && n.activeTargetIds instanceof Array, i = Vt();
        for (let t = 0; s && t < n.activeTargetIds.length; ++t) s = z(n.activeTargetIds[t]), 
        i = i.add(n.activeTargetIds[t]);
        return s ? new rr(t, i) : (A("SharedClientState", `Failed to parse client data for instance '${t}': ${e}`), 
        null);
    }
}

/**
 * This class represents the online state for all clients participating in
 * multi-tab. The online state is only written to by the primary client, and
 * used in secondary clients to update their query views.
 */ class or {
    constructor(t, e) {
        this.clientId = t, this.onlineState = e;
    }
    /**
     * Parses a SharedOnlineState from its JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static jc(t) {
        const e = JSON.parse(t);
        return "object" == typeof e && -1 !== [ "Unknown", "Online", "Offline" ].indexOf(e.onlineState) && "string" == typeof e.clientId ? new or(e.clientId, e.onlineState) : (A("SharedClientState", "Failed to parse online state: " + t), 
        null);
    }
}

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
class hr {
    constructor() {
        this.activeTargetIds = Vt();
    }
    Gc(t) {
        this.activeTargetIds = this.activeTargetIds.add(t);
    }
    zc(t) {
        this.activeTargetIds = this.activeTargetIds.delete(t);
    }
    /**
     * Converts this entry into a JSON-encoded format we can use for WebStorage.
     * Does not encode `clientId` as it is part of the key in WebStorage.
     */    Kc() {
        const t = {
            activeTargetIds: this.activeTargetIds.N(),
            updateTimeMs: Date.now()
        };
        return JSON.stringify(t);
    }
}

/**
 * `WebStorageSharedClientState` uses WebStorage (window.localStorage) as the
 * backing store for the SharedClientState. It keeps track of all active
 * clients and supports modifications of the local client's data.
 */ class ar {
    constructor(t, e, n, s, i) {
        this.window = t, this.Es = e, this.persistenceKey = n, this.Hc = s, this.Sc = null, 
        this.Ka = null, this._s = null, this.Yc = this.Jc.bind(this), this.Xc = new ct(v), 
        this.Zi = !1, 
        /**
         * Captures WebStorage events that occur before `start()` is called. These
         * events are replayed once `WebStorageSharedClientState` is started.
         */
        this.Zc = [];
        // Escape the special characters mentioned here:
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
        const r = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        this.storage = this.window.localStorage, this.currentUser = i, this.tu = tr(this.persistenceKey, this.Hc), 
        this.eu = 
        /** Assembles the key for the current sequence number. */
        function(t) {
            return "firestore_sequence_number_" + t;
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
 */ (this.persistenceKey), this.Xc = this.Xc.nt(this.Hc, new hr), this.nu = new RegExp(`^firestore_clients_${r}_([^_]*)$`), 
        this.su = new RegExp(`^firestore_mutations_${r}_(\\d+)(?:_(.*))?$`), this.iu = new RegExp(`^firestore_targets_${r}_(\\d+)$`), 
        this.ru = 
        /** Assembles the key for the online state of the primary tab. */
        function(t) {
            return "firestore_online_state_" + t;
        }
        // The WebStorage key prefix for the key that stores the last sequence number allocated. The key
        // looks like 'firestore_sequence_number_<persistence_prefix>'.
        (this.persistenceKey), 
        // Rather than adding the storage observer during start(), we add the
        // storage observer during initialization. This ensures that we collect
        // events before other components populate their initial state (during their
        // respective start() calls). Otherwise, we might for example miss a
        // mutation that is added after LocalStore's start() processed the existing
        // mutations but before we observe WebStorage events.
        this.window.addEventListener("storage", this.Yc);
    }
    /** Returns 'true' if WebStorage is available in the current environment. */    static Fs(t) {
        return !(!t || !t.localStorage);
    }
    async start() {
        // Retrieve the list of existing clients to backfill the data in
        // SharedClientState.
        const t = await this.Sc.ih();
        for (const e of t) {
            if (e === this.Hc) continue;
            const t = this.getItem(tr(this.persistenceKey, e));
            if (t) {
                const n = rr.jc(e, t);
                n && (this.Xc = this.Xc.nt(n.clientId, n));
            }
        }
        this.ou();
        // Check if there is an existing online state and call the callback handler
        // if applicable.
        const e = this.storage.getItem(this.ru);
        if (e) {
            const t = this.hu(e);
            t && this.au(t);
        }
        for (const t of this.Zc) this.Jc(t);
        this.Zc = [], 
        // Register a window unload hook to remove the client metadata entry from
        // WebStorage even if `shutdown()` was not called.
        this.window.addEventListener("unload", () => this.Zo()), this.Zi = !0;
    }
    ws(t) {
        this.setItem(this.eu, JSON.stringify(t));
    }
    cu() {
        return this.uu(this.Xc);
    }
    lu(t) {
        let e = !1;
        return this.Xc.forEach((n, s) => {
            s.activeTargetIds.has(t) && (e = !0);
        }), e;
    }
    _u(t) {
        this.fu(t, "pending");
    }
    du(t, e, n) {
        this.fu(t, e, n), 
        // Once a final mutation result is observed by other clients, they no longer
        // access the mutation's metadata entry. Since WebStorage replays events
        // in order, it is safe to delete the entry right after updating it.
        this.wu(t);
    }
    Tu(t) {
        let e = "not-current";
        // Lookup an existing query state if the target ID was already registered
        // by another tab
                if (this.lu(t)) {
            const n = this.storage.getItem(nr(this.persistenceKey, t));
            if (n) {
                const s = ir.jc(t, n);
                s && (e = s.state);
            }
        }
        return this.Eu.Gc(t), this.ou(), e;
    }
    Iu(t) {
        this.Eu.zc(t), this.ou();
    }
    mu(t) {
        return this.Eu.activeTargetIds.has(t);
    }
    Au(t) {
        this.removeItem(nr(this.persistenceKey, t));
    }
    Ru(t, e, n) {
        this.Pu(t, e, n);
    }
    Ph(t, e, n) {
        e.forEach(t => {
            this.wu(t);
        }), this.currentUser = t, n.forEach(t => {
            this._u(t);
        });
    }
    Vu(t) {
        this.gu(t);
    }
    Zo() {
        this.Zi && (this.window.removeEventListener("storage", this.Yc), this.removeItem(this.tu), 
        this.Zi = !1);
    }
    getItem(t) {
        const e = this.storage.getItem(t);
        return m("SharedClientState", "READ", t, e), e;
    }
    setItem(t, e) {
        m("SharedClientState", "SET", t, e), this.storage.setItem(t, e);
    }
    removeItem(t) {
        m("SharedClientState", "REMOVE", t), this.storage.removeItem(t);
    }
    Jc(t) {
        // Note: The function is typed to take Event to be interface-compatible with
        // `Window.addEventListener`.
        const e = t;
        if (e.storageArea === this.storage) {
            if (m("SharedClientState", "EVENT", e.key, e.newValue), e.key === this.tu) return void A("Received WebStorage notification for local change. Another client might have garbage-collected our state");
            this.Es.Pi(async () => {
                if (this.Zi) {
                    if (null !== e.key) if (this.nu.test(e.key)) {
                        if (null == e.newValue) {
                            const t = this.yu(e.key);
                            return this.pu(t, null);
                        }
                        {
                            const t = this.bu(e.key, e.newValue);
                            if (t) return this.pu(t.clientId, t);
                        }
                    } else if (this.su.test(e.key)) {
                        if (null !== e.newValue) {
                            const t = this.vu(e.key, e.newValue);
                            if (t) return this.Su(t);
                        }
                    } else if (this.iu.test(e.key)) {
                        if (null !== e.newValue) {
                            const t = this.Du(e.key, e.newValue);
                            if (t) return this.Cu(t);
                        }
                    } else if (e.key === this.ru) {
                        if (null !== e.newValue) {
                            const t = this.hu(e.newValue);
                            if (t) return this.au(t);
                        }
                    } else if (e.key === this.eu) {
                        const t = function(t) {
                            let e = cs.Ts;
                            if (null != t) try {
                                const n = JSON.parse(t);
                                g("number" == typeof n), e = n;
                            } catch (t) {
                                A("SharedClientState", "Failed to read sequence number from WebStorage", t);
                            }
                            return e;
                        }
                        /**
 * `MemorySharedClientState` is a simple implementation of SharedClientState for
 * clients using memory persistence. The state in this class remains fully
 * isolated and no synchronization is performed.
 */ (e.newValue);
                        t !== cs.Ts && this._s(t);
                    }
                } else this.Zc.push(e);
            });
        }
    }
    get Eu() {
        return this.Xc.get(this.Hc);
    }
    ou() {
        this.setItem(this.tu, this.Eu.Kc());
    }
    fu(t, e, n) {
        const s = new sr(this.currentUser, t, e, n), i = er(this.persistenceKey, this.currentUser, t);
        this.setItem(i, s.Kc());
    }
    wu(t) {
        const e = er(this.persistenceKey, this.currentUser, t);
        this.removeItem(e);
    }
    gu(t) {
        const e = {
            clientId: this.Hc,
            onlineState: t
        };
        this.storage.setItem(this.ru, JSON.stringify(e));
    }
    Pu(t, e, n) {
        const s = nr(this.persistenceKey, t), i = new ir(t, e, n);
        this.setItem(s, i.Kc());
    }
    /**
     * Parses a client state key in WebStorage. Returns null if the key does not
     * match the expected key format.
     */    yu(t) {
        const e = this.nu.exec(t);
        return e ? e[1] : null;
    }
    /**
     * Parses a client state in WebStorage. Returns 'null' if the value could not
     * be parsed.
     */    bu(t, e) {
        const n = this.yu(t);
        return rr.jc(n, e);
    }
    /**
     * Parses a mutation batch state in WebStorage. Returns 'null' if the value
     * could not be parsed.
     */    vu(t, e) {
        const n = this.su.exec(t), s = Number(n[1]), i = void 0 !== n[2] ? n[2] : null;
        return sr.jc(new Ui(i), s, e);
    }
    /**
     * Parses a query target state from WebStorage. Returns 'null' if the value
     * could not be parsed.
     */    Du(t, e) {
        const n = this.iu.exec(t), s = Number(n[1]);
        return ir.jc(s, e);
    }
    /**
     * Parses an online state from WebStorage. Returns 'null' if the value
     * could not be parsed.
     */    hu(t) {
        return or.jc(t);
    }
    async Su(t) {
        if (t.user.uid === this.currentUser.uid) return this.Sc.Nu(t.batchId, t.state, t.error);
        m("SharedClientState", "Ignoring mutation for non-active user " + t.user.uid);
    }
    Cu(t) {
        return this.Sc.Fu(t.targetId, t.state, t.error);
    }
    pu(t, e) {
        const n = e ? this.Xc.nt(t, e) : this.Xc.remove(t), s = this.uu(this.Xc), i = this.uu(n), r = [], o = [];
        return i.forEach(t => {
            s.has(t) || r.push(t);
        }), s.forEach(t => {
            i.has(t) || o.push(t);
        }), this.Sc.ku(r, o).then(() => {
            this.Xc = n;
        });
    }
    au(t) {
        // We check whether the client that wrote this online state is still active
        // by comparing its client ID to the list of clients kept active in
        // IndexedDb. If a client does not update their IndexedDb client state
        // within 5 seconds, it is considered inactive and we don't emit an online
        // state event.
        this.Xc.get(t.clientId) && this.Ka(t.onlineState);
    }
    uu(t) {
        let e = Vt();
        return t.forEach((t, n) => {
            e = e.Ct(n.activeTargetIds);
        }), e;
    }
}

class cr {
    constructor() {
        this.xu = new hr, this.$u = {}, this.Ka = null, this._s = null;
    }
    _u(t) {
        // No op.
    }
    du(t, e, n) {
        // No op.
    }
    Tu(t) {
        return this.xu.Gc(t), this.$u[t] || "not-current";
    }
    Ru(t, e, n) {
        this.$u[t] = e;
    }
    Iu(t) {
        this.xu.zc(t);
    }
    mu(t) {
        return this.xu.activeTargetIds.has(t);
    }
    Au(t) {
        delete this.$u[t];
    }
    cu() {
        return this.xu.activeTargetIds;
    }
    lu(t) {
        return this.xu.activeTargetIds.has(t);
    }
    start() {
        return this.xu = new hr, Promise.resolve();
    }
    Ph(t, e, n) {
        // No op.
    }
    Vu(t) {
        // No op.
    }
    Zo() {}
    ws(t) {}
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
 */ class ur {
    constructor(t) {
        this.key = t;
    }
}

class lr {
    constructor(t) {
        this.key = t;
    }
}

/**
 * View is responsible for computing the final merged truth of what docs are in
 * a query. It gets notified of local and remote changes to docs, and applies
 * the query filters and limits to determine the most correct possible results.
 */ class _r {
    constructor(t, 
    /** Documents included in the remote target */
    e) {
        this.query = t, this.Mu = e, this.Ou = null, 
        /**
         * A flag whether the view is current with the backend. A view is considered
         * current after it has seen the current flag from the backend and did not
         * lose consistency within the watch stream (e.g. because of an existence
         * filter mismatch).
         */
        this.Ht = !1, 
        /** Documents in the view but not in the remote target */
        this.Lu = Rt(), 
        /** Document Keys that have local changes */
        this.Lt = Rt(), this.qu = Mn(t), this.Bu = new gt(this.qu);
    }
    /**
     * The set of remote documents that the server has told us belongs to the target associated with
     * this view.
     */    get Uu() {
        return this.Mu;
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
     */    Wu(t, e) {
        const n = e ? e.Qu : new yt, s = e ? e.Bu : this.Bu;
        let i = e ? e.Lt : this.Lt, r = s, o = !1;
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
            const c = s.get(t);
            let u = e instanceof An ? e : null;
            u && (u = $n(this.query, u) ? u : null);
            const l = !!c && this.Lt.has(c.key), _ = !!u && (u.Ke || 
            // We only consider committed mutations for documents that were
            // mutated during the lifetime of the view.
            this.Lt.has(u.key) && u.hasCommittedMutations);
            let f = !1;
            // Calculate change
                        if (c && u) {
                c.data().isEqual(u.data()) ? l !== _ && (n.track({
                    type: 3 /* Metadata */ ,
                    doc: u
                }), f = !0) : this.ju(c, u) || (n.track({
                    type: 2 /* Modified */ ,
                    doc: u
                }), f = !0, (h && this.qu(u, h) > 0 || a && this.qu(u, a) < 0) && (
                // This doc moved from inside the limit to outside the limit.
                // That means there may be some other doc in the local cache
                // that should be included instead.
                o = !0));
            } else !c && u ? (n.track({
                type: 0 /* Added */ ,
                doc: u
            }), f = !0) : c && !u && (n.track({
                type: 1 /* Removed */ ,
                doc: c
            }), f = !0, (h || a) && (
            // A doc was removed from a full limit query. We'll need to
            // requery from the local cache to see if we know about some other
            // doc that should be in the results.
            o = !0));
            f && (u ? (r = r.add(u), i = _ ? i.add(t) : i.delete(t)) : (r = r.delete(t), i = i.delete(t)));
        }), this.query.hn() || this.query.an()) for (;r.size > this.query.limit; ) {
            const t = this.query.hn() ? r.last() : r.first();
            r = r.delete(t.key), i = i.delete(t.key), n.track({
                type: 1 /* Removed */ ,
                doc: t
            });
        }
        return {
            Bu: r,
            Qu: n,
            Ku: o,
            Lt: i
        };
    }
    ju(t, e) {
        // We suppress the initial change event for documents that were modified as
        // part of a write acknowledgment (e.g. when the value of a server transform
        // is applied) as Watch will send us the same document again.
        // By suppressing the event, we only raise two user visible events (one with
        // `hasPendingWrites` and the final state of the document) instead of three
        // (one with `hasPendingWrites`, the modified document with
        // `hasPendingWrites` and the final state of the document).
        return t.Ke && e.hasCommittedMutations && !e.Ke;
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
    Bn(t, e, n) {
        const s = this.Bu;
        this.Bu = t.Bu, this.Lt = t.Lt;
        // Sort changes based on type and query comparator
        const i = t.Qu.Mt();
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
                    return V();
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
 */ (t.type, e.type) || this.qu(t.doc, e.doc)), this.Gu(n);
        const r = e ? this.zu() : [], o = 0 === this.Lu.size && this.Ht ? 1 /* Synced */ : 0 /* Local */ , h = o !== this.Ou;
        if (this.Ou = o, 0 !== i.length || h) {
            return {
                snapshot: new pt(this.query, t.Bu, s, i, t.Lt, 0 /* Local */ === o, h, 
                /* excludesMetadataChanges= */ !1),
                Hu: r
            };
        }
        // no changes
        return {
            Hu: r
        };
    }
    /**
     * Applies an OnlineState change to the view, potentially generating a
     * ViewChange if the view's syncState changes as a result.
     */    Yu(t) {
        return this.Ht && "Offline" /* Offline */ === t ? (
        // If we're offline, set `current` to false and then call applyChanges()
        // to refresh our syncState and generate a ViewChange as appropriate. We
        // are guaranteed to get a new TargetChange that sets `current` back to
        // true once the client is back online.
        this.Ht = !1, this.Bn({
            Bu: this.Bu,
            Qu: new yt,
            Lt: this.Lt,
            Ku: !1
        }, 
        /* updateLimboDocuments= */ !1)) : {
            Hu: []
        };
    }
    /**
     * Returns whether the doc for the given key should be in limbo.
     */    Ju(t) {
        // If the remote end says it's part of this query, it's not in limbo.
        return !this.Mu.has(t) && (
        // The local store doesn't think it's a result, so it shouldn't be in limbo.
        !!this.Bu.has(t) && !this.Bu.get(t).Ke);
    }
    /**
     * Updates syncedDocuments, current, and limbo docs based on the given change.
     * Returns the list of changes to which docs are in limbo.
     */    Gu(t) {
        t && (t.Yt.forEach(t => this.Mu = this.Mu.add(t)), t.Jt.forEach(t => {}), t.Xt.forEach(t => this.Mu = this.Mu.delete(t)), 
        this.Ht = t.Ht);
    }
    zu() {
        // We can only determine limbo documents when we're in-sync with the server.
        if (!this.Ht) return [];
        // TODO(klimt): Do this incrementally so that it's not quadratic when
        // updating many documents.
                const t = this.Lu;
        this.Lu = Rt(), this.Bu.forEach(t => {
            this.Ju(t.key) && (this.Lu = this.Lu.add(t.key));
        });
        // Diff the new limbo docs with the old limbo docs.
        const e = [];
        return t.forEach(t => {
            this.Lu.has(t) || e.push(new lr(t));
        }), this.Lu.forEach(n => {
            t.has(n) || e.push(new ur(n));
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
    Xu(t) {
        this.Mu = t.Lh, this.Lu = Rt();
        const e = this.Wu(t.documents);
        return this.Bn(e, /*updateLimboDocuments=*/ !0);
    }
    /**
     * Returns a view snapshot as if this query was just listened to. Contains
     * a document add for every existing document and the `fromCache` and
     * `hasPendingWrites` status of the already established view.
     */
    // PORTING NOTE: Multi-tab only.
    Zu() {
        return pt.Ut(this.query, this.Bu, this.Lt, 0 /* Local */ === this.Ou);
    }
}

/**
 * QueryView contains all of the data that SyncEngine needs to keep track of for
 * a particular query.
 */
class fr {
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

/** Tracks a limbo resolution. */ class dr {
    constructor(t) {
        this.key = t, 
        /**
         * Set to true once we've received a document. This is used in
         * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
         * decide whether it needs to manufacture a delete event for the target once
         * the target is CURRENT.
         */
        this.tl = !1;
    }
}

/**
 * An implementation of `SyncEngine` coordinating with other parts of SDK.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */ class wr {
    constructor(t, e, n, 
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    s, i, r) {
        this.ec = t, this.el = e, this.nc = n, this.nl = s, this.currentUser = i, this.sl = r, 
        this.il = null, this.rl = new $(t => kn(t), Fn), this.ol = new Map, 
        /**
         * The keys of documents that are in limbo for which we haven't yet started a
         * limbo resolution query.
         */
        this.hl = [], 
        /**
         * Keeps track of the target ID for each document that is in limbo with an
         * active target.
         */
        this.al = new ct(j.P), 
        /**
         * Keeps track of the information about an active limbo resolution for each
         * active target ID that was started for the purpose of limbo resolution.
         */
        this.cl = new Map, this.ul = new qi, 
        /** Stores user completion handlers, indexed by User and BatchId. */
        this.ll = {}, 
        /** Stores user callbacks waiting for all pending writes to be acknowledged. */
        this._l = new Map, this.fl = gi.to(), this.onlineState = "Unknown" /* Unknown */ , 
        // The primary state is set to `true` or `false` immediately after Firestore
        // startup. In the interim, a client should only be considered primary if
        // `isPrimary` is true.
        this.dl = void 0;
    }
    get wl() {
        return !0 === this.dl;
    }
    subscribe(t) {
        this.il = t;
    }
    async listen(t) {
        let e, n;
        this.Tl("listen()");
        const s = this.rl.get(t);
        if (s) 
        // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
        // already exists when EventManager calls us for the first time. This
        // happens when the primary tab is already listening to this query on
        // behalf of another tab and the user of the primary also starts listening
        // to the query. EventManager will not have an assigned target ID in this
        // case and calls `listen` to obtain this ID.
        e = s.targetId, this.nl.Tu(e), n = s.view.Zu(); else {
            const s = await this.ec.$h(Sn(t)), i = this.nl.Tu(s.targetId);
            e = s.targetId, n = await this.El(t, e, "current" === i), this.wl && this.el.listen(s);
        }
        return n;
    }
    /**
     * Registers a view for a previously unknown query and computes its initial
     * snapshot.
     */    async El(t, e, n) {
        const s = await this.ec.Oh(t, 
        /* usePreviousResults= */ !0), i = new _r(t, s.Lh), r = i.Wu(s.documents), o = vt.zt(e, n && "Offline" /* Offline */ !== this.onlineState), h = i.Bn(r, 
        /* updateLimboDocuments= */ this.wl, o);
        this.Il(e, h.Hu);
        const a = new fr(t, e, i);
        return this.rl.set(t, a), this.ol.has(e) ? this.ol.get(e).push(t) : this.ol.set(e, [ t ]), 
        h.snapshot;
    }
    async bc(t) {
        this.Tl("unlisten()");
        const e = this.rl.get(t), n = this.ol.get(e.targetId);
        // Only clean up the query view and target if this is the only query mapped
        // to the target.
                if (n.length > 1) return this.ol.set(e.targetId, n.filter(e => !Fn(e, t))), 
        void this.rl.delete(t);
        // No other queries are mapped to the target, clean up the query and the target.
                if (this.wl) {
            // We need to remove the local query target first to allow us to verify
            // whether any other client is still interested in this target.
            this.nl.Iu(e.targetId);
            this.nl.lu(e.targetId) || await this.ec.Mh(e.targetId, /*keepPersistedTargetData=*/ !1).then(() => {
                this.nl.Au(e.targetId), this.el.bc(e.targetId), this.ml(e.targetId);
            }).catch(Li);
        } else this.ml(e.targetId), await this.ec.Mh(e.targetId, 
        /*keepPersistedTargetData=*/ !0);
    }
    async write(t, e) {
        this.Tl("write()");
        try {
            const n = await this.ec.ph(t);
            this.nl._u(n.batchId), this.Al(n.batchId, e), await this.Rl(n.Nn), await this.el.Vc();
        } catch (t) {
            // If we can't persist the mutation, we reject the user callback and
            // don't send the mutation. The user can then retry the write.
            const n = ys(t, "Failed to persist write");
            e.reject(n);
        }
    }
    async Dh(t) {
        this.Tl("applyRemoteEvent()");
        try {
            const e = await this.ec.Dh(t);
            // Update `receivedDocument` as appropriate for any limbo targets.
                        t.Wt.forEach((t, e) => {
                const n = this.cl.get(e);
                n && (
                // Since this is a limbo resolution lookup, it's for a single document
                // and it could be added, modified, or removed, but not a combination.
                g(t.Yt.size + t.Jt.size + t.Xt.size <= 1), t.Yt.size > 0 ? n.tl = !0 : t.Jt.size > 0 ? g(n.tl) : t.Xt.size > 0 && (g(n.tl), 
                n.tl = !1));
            }), await this.Rl(e, t);
        } catch (t) {
            await Li(t);
        }
    }
    Yu(t, e) {
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
        if (this.wl && 0 /* RemoteStore */ === e || !this.wl && 1 /* SharedClientState */ === e) {
            this.Tl("applyOnlineStateChange()");
            const e = [];
            this.rl.forEach((n, s) => {
                const i = s.view.Yu(t);
                i.snapshot && e.push(i.snapshot);
            }), this.il.Pl(t), this.il.Fa(e), this.onlineState = t, this.wl && this.nl.Vu(t);
        }
    }
    async kc(t, e) {
        this.Tl("rejectListens()"), 
        // PORTING NOTE: Multi-tab only.
        this.nl.Ru(t, "rejected", e);
        const n = this.cl.get(t), s = n && n.key;
        if (s) {
            // TODO(klimt): We really only should do the following on permission
            // denied errors, but we don't have the cause code here.
            // It's a limbo doc. Create a synthetic event saying it was deleted.
            // This is kind of a hack. Ideally, we would have a method in the local
            // store to purge a document. However, it would be tricky to keep all of
            // the local store's invariants with another method.
            let e = new ct(j.P);
            e = e.nt(s, new Rn(s, q.min()));
            const n = Rt().add(s), i = new bt(q.min(), 
            /* targetChanges= */ new Map, 
            /* targetMismatches= */ new _t(v), e, n);
            await this.Dh(i), 
            // Since this query failed, we won't want to manually unlisten to it.
            // We only remove it from bookkeeping after we successfully applied the
            // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
            // this query when the RemoteStore restarts the Watch stream, which should
            // re-trigger the target failure.
            this.al = this.al.remove(s), this.cl.delete(t), this.Vl();
        } else await this.ec.Mh(t, /* keepPersistedTargetData */ !1).then(() => this.ml(t, e)).catch(Li);
    }
    async qc(t) {
        this.Tl("applySuccessfulWrite()");
        const e = t.batch.batchId;
        try {
            const n = await this.ec.bh(t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught
            // up), so we raise user callbacks first so that they consistently happen
            // before listen events.
                        this.gl(e, /*error=*/ null), this.yl(e), this.nl.du(e, "acknowledged"), 
            await this.Rl(n);
        } catch (t) {
            await Li(t);
        }
    }
    async Uc(t, e) {
        this.Tl("rejectFailedWrite()");
        try {
            const n = await this.ec.Sh(t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught up),
            // so we raise user callbacks first so that they consistently happen before
            // listen events.
                        this.gl(t, e), this.yl(t), this.nl.du(t, "rejected", e), await this.Rl(n);
        } catch (e) {
            await Li(e);
        }
    }
    async pl(t) {
        this.el.cc() || m("SyncEngine", "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");
        try {
            const e = await this.ec.Vr();
            if (-1 === e) 
            // Trigger the callback right away if there is no pending writes at the moment.
            return void t.resolve();
            const n = this._l.get(e) || [];
            n.push(t), this._l.set(e, n);
        } catch (e) {
            const n = ys(e, "Initialization of waitForPendingWrites() operation failed");
            t.reject(n);
        }
    }
    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */    yl(t) {
        (this._l.get(t) || []).forEach(t => {
            t.resolve();
        }), this._l.delete(t);
    }
    /** Reject all outstanding callbacks waiting for pending writes to complete. */    bl(t) {
        this._l.forEach(e => {
            e.forEach(e => {
                e.reject(new O(M.CANCELLED, t));
            });
        }), this._l.clear();
    }
    Al(t, e) {
        let n = this.ll[this.currentUser.Jh()];
        n || (n = new ct(v)), n = n.nt(t, e), this.ll[this.currentUser.Jh()] = n;
    }
    /**
     * Resolves or rejects the user callback for the given batch and then discards
     * it.
     */    gl(t, e) {
        let n = this.ll[this.currentUser.Jh()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
                if (n) {
            const s = n.get(t);
            s && (e ? s.reject(e) : s.resolve(), n = n.remove(t)), this.ll[this.currentUser.Jh()] = n;
        }
    }
    ml(t, e = null) {
        this.nl.Iu(t);
        for (const n of this.ol.get(t)) this.rl.delete(n), e && this.il.vl(n, e);
        if (this.ol.delete(t), this.wl) {
            this.ul.Gh(t).forEach(t => {
                this.ul.Cr(t) || 
                // We removed the last reference for this key
                this.Sl(t);
            });
        }
    }
    Sl(t) {
        // It's possible that the target already got removed because the query failed. In that case,
        // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
        const e = this.al.get(t);
        null !== e && (this.el.bc(e), this.al = this.al.remove(t), this.cl.delete(e), this.Vl());
    }
    Il(t, e) {
        for (const n of e) if (n instanceof ur) this.ul.To(n.key, t), this.Dl(n); else if (n instanceof lr) {
            m("SyncEngine", "Document no longer in limbo: " + n.key), this.ul.Io(n.key, t);
            this.ul.Cr(n.key) || 
            // We removed the last reference for this key
            this.Sl(n.key);
        } else V();
    }
    Dl(t) {
        const e = t.key;
        this.al.get(e) || (m("SyncEngine", "New document in limbo: " + e), this.hl.push(e), 
        this.Vl());
    }
    /**
     * Starts listens for documents in limbo that are enqueued for resolution,
     * subject to a maximum number of concurrent resolutions.
     *
     * Without bounding the number of concurrent resolutions, the server can fail
     * with "resource exhausted" errors which can lead to pathological client
     * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
     */    Vl() {
        for (;this.hl.length > 0 && this.al.size < this.sl; ) {
            const t = this.hl.shift(), e = this.fl.next();
            this.cl.set(e, new dr(t)), this.al = this.al.nt(t, e), this.el.listen(new st(Sn(pn(t.path)), e, 2 /* LimboResolution */ , cs.Ts));
        }
    }
    // Visible for testing
    Cl() {
        return this.al;
    }
    // Visible for testing
    Nl() {
        return this.hl;
    }
    async Rl(t, e) {
        const n = [], s = [], i = [];
        this.rl.forEach((r, o) => {
            i.push(Promise.resolve().then(() => {
                const e = o.view.Wu(t);
                return e.Ku ? this.ec.Oh(o.query, /* usePreviousResults= */ !1).then(({documents: t}) => o.view.Wu(t, e)) : e;
                // The query has a limit and some docs were removed, so we need
                // to re-run the query against the local store to make sure we
                // didn't lose any good docs that had been past the limit.
                        }).then(t => {
                const i = e && e.Wt.get(o.targetId), r = o.view.Bn(t, 
                /* updateLimboDocuments= */ this.wl, i);
                if (this.Il(o.targetId, r.Hu), r.snapshot) {
                    this.wl && this.nl.Ru(o.targetId, r.snapshot.fromCache ? "not-current" : "current"), 
                    n.push(r.snapshot);
                    const t = as.ls(o.targetId, r.snapshot);
                    s.push(t);
                }
            }));
        }), await Promise.all(i), this.il.Fa(n), await this.ec.Fh(s);
    }
    Tl(t) {}
    async Wc(t) {
        if (!this.currentUser.isEqual(t)) {
            m("SyncEngine", "User change. New user:", t.Jh());
            const e = await this.ec.Ph(t);
            this.currentUser = t, 
            // Fails tasks waiting for pending writes requested by previous user.
            this.bl("'waitForPendingWrites' promise is rejected due to a user change."), 
            // TODO(b/114226417): Consider calling this only in the primary tab.
            this.nl.Ph(t, e.gh, e.yh), await this.Rl(e.Vh);
        }
    }
    $e(t) {
        const e = this.cl.get(t);
        if (e && e.tl) return Rt().add(e.key);
        {
            let e = Rt();
            const n = this.ol.get(t);
            if (!n) return e;
            for (const t of n) {
                const n = this.rl.get(t);
                e = e.Ct(n.view.Uu);
            }
            return e;
        }
    }
}

/**
 * Reconcile the list of synced documents in an existing view with those
 * from persistence.
 */
async function Tr(t, e) {
    const n = y(t), s = await n.ec.Oh(e.query, 
    /* usePreviousResults= */ !0), i = e.view.Xu(s);
    return n.wl && n.Il(e.targetId, i.Hu), i;
}

/** Applies a mutation state to an existing batch.  */
// PORTING NOTE: Multi-Tab only.
async function Er(t, e, n, s) {
    const i = y(t);
    i.Tl("applyBatchState()");
    const r = await 
    /** Returns the local view of the documents affected by a mutation batch. */
    // PORTING NOTE: Multi-Tab only.
    function(t, e) {
        const n = y(t), s = y(n.Kn);
        return n.persistence.runTransaction("Lookup mutation documents", "readonly", t => s.Rr(t, e).next(e => e ? n.Ah.Xn(t, e) : ss.resolve(null)));
    }
    // PORTING NOTE: Multi-Tab only.
    (i.ec, e);
    null !== r ? ("pending" === n ? 
    // If we are the primary client, we need to send this write to the
    // backend. Secondary clients will ignore these writes since their remote
    // connection is disabled.
    await i.el.Vc() : "acknowledged" === n || "rejected" === n ? (
    // NOTE: Both these methods are no-ops for batches that originated from
    // other clients.
    i.gl(e, s || null), function(t, e) {
        y(y(t).Kn).vr(e);
    }
    // PORTING NOTE: Multi-Tab only.
    (i.ec, e)) : V(), await i.Rl(r)) : 
    // A throttled tab may not have seen the mutation before it was completed
    // and removed from the mutation queue, in which case we won't have cached
    // the affected documents. In this case we can safely ignore the update
    // since that means we didn't apply the mutation locally at all (if we
    // had, we would have cached the affected documents), and so we will just
    // see any resulting document changes via normal remote document updates
    // as applicable.
    m("SyncEngine", "Cannot apply mutation batch with id: " + e);
}

/** Applies a query target change from a different tab. */
// PORTING NOTE: Multi-Tab only.
async function Ir(t, e) {
    const n = y(t);
    if (!0 === e && !0 !== n.dl) {
        // Secondary tabs only maintain Views for their local listeners and the
        // Views internal state may not be 100% populated (in particular
        // secondary tabs don't track syncedDocuments, the set of documents the
        // server considers to be in the target). So when a secondary becomes
        // primary, we need to need to make sure that all views for all targets
        // match the state on disk.
        const t = n.nl.cu(), e = await mr(n, t.N());
        n.dl = !0, await n.el.Qc(!0);
        for (const t of e) n.el.listen(t);
    } else if (!1 === e && !1 !== n.dl) {
        const t = [];
        let e = Promise.resolve();
        n.ol.forEach((s, i) => {
            n.nl.mu(i) ? t.push(i) : e = e.then(() => (n.ml(i), n.ec.Mh(i, 
            /*keepPersistedTargetData=*/ !0))), n.el.bc(i);
        }), await e, await mr(n, t), 
        // PORTING NOTE: Multi-Tab only.
        function(t) {
            const e = y(t);
            e.cl.forEach((t, n) => {
                e.el.bc(n);
            }), e.ul.zh(), e.cl = new Map, e.al = new ct(j.P);
        }
        /**
 * Reconcile the query views of the provided query targets with the state from
 * persistence. Raises snapshots for any changes that affect the local
 * client and returns the updated state of all target's query data.
 *
 * @param targets the list of targets with views that need to be recomputed
 * @param transitionToPrimary `true` iff the tab transitions from a secondary
 * tab to a primary tab
 */
        // PORTING NOTE: Multi-Tab only.
        (n), n.dl = !1, await n.el.Qc(!1);
    }
}

async function mr(t, e, n) {
    const s = y(t), i = [], r = [];
    for (const t of e) {
        let e;
        const n = s.ol.get(t);
        if (n && 0 !== n.length) {
            // For queries that have a local View, we fetch their current state
            // from LocalStore (as the resume token and the snapshot version
            // might have changed) and reconcile their views with the persisted
            // state (the list of syncedDocuments may have gotten out of sync).
            e = await s.ec.$h(Sn(n[0]));
            for (const t of n) {
                const e = s.rl.get(t), n = await Tr(s, e);
                n.snapshot && r.push(n.snapshot);
            }
        } else {
            // For queries that never executed on this client, we need to
            // allocate the target in LocalStore and initialize a new View.
            const n = await Oi(s.ec, t);
            e = await s.ec.$h(n), await s.El(Ar(n), t, 
            /*current=*/ !1);
        }
        i.push(e);
    }
    return s.il.Fa(r), i;
}

/**
 * Creates a `Query` object from the specified `Target`. There is no way to
 * obtain the original `Query`, so we synthesize a `Query` from the `Target`
 * object.
 *
 * The synthesized result might be different from the original `Query`, but
 * since the synthesized `Query` should return the same results as the
 * original one (only the presentation of results might differ), the potential
 * difference will not cause issues.
 */
// PORTING NOTE: Multi-Tab only.
function Ar(t) {
    return yn(t.path, t.collectionGroup, t.orderBy, t.filters, t.limit, "F" /* First */ , t.startAt, t.endAt);
}

/** Returns the IDs of the clients that are currently active. */
// PORTING NOTE: Multi-Tab only.
function Rr(t) {
    const e = y(t);
    return y(y(e.ec).persistence).ih();
}

/** Applies a query target change from a different tab. */
// PORTING NOTE: Multi-Tab only.
async function Pr(t, e, n, s) {
    const i = y(t);
    if (i.dl) 
    // If we receive a target state notification via WebStorage, we are
    // either already secondary or another tab has taken the primary lease.
    m("SyncEngine", "Ignoring unexpected query state notification."); else if (i.ol.has(e)) switch (n) {
      case "current":
      case "not-current":
        {
            const t = await function(t) {
                const e = y(t), n = y(e.mh);
                return e.persistence.runTransaction("Get new document changes", "readonly", t => n.Br(t, e.Ih)).then(({Ur: t, readTime: n}) => (e.Ih = n, 
                t));
            }
            /**
 * Reads the newest document change from persistence and moves the internal
 * synchronization marker forward so that calls to `getNewDocumentChanges()`
 * only return changes that happened after client initialization.
 */
            // PORTING NOTE: Multi-Tab only.
            (i.ec), s = bt.Gt(e, "current" === n);
            await i.Rl(t, s);
            break;
        }

      case "rejected":
        await i.ec.Mh(e, 
        /* keepPersistedTargetData */ !0), i.ml(e, s);
        break;

      default:
        V();
    }
}

/** Adds or removes Watch targets for queries from different tabs. */ async function Vr(t, e, n) {
    const s = y(t);
    if (s.dl) {
        for (const t of e) {
            if (s.ol.has(t)) {
                // A target might have been added in a previous attempt
                m("SyncEngine", "Adding an already active target " + t);
                continue;
            }
            const e = await Oi(s.ec, t), n = await s.ec.$h(e);
            await s.El(Ar(e), n.targetId, 
            /*current=*/ !1), s.el.listen(n);
        }
        for (const t of n) 
        // Check that the target is still active since the target might have been
        // removed if it has been rejected by the backend.
        s.ol.has(t) && 
        // Release queries that are still active.
        await s.ec.Mh(t, /* keepPersistedTargetData */ !1).then(() => {
            s.el.bc(t), s.ml(t);
        }).catch(Li);
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
 */ class gr {
    constructor() {
        this.Fl = void 0, this.kl = [];
    }
}

/**
 * EventManager is responsible for mapping queries to query event emitters.
 * It handles "fan-out". -- Identical queries will re-use the same watch on the
 * backend.
 */ class yr {
    constructor(t) {
        this.Sc = t, this.xl = new $(t => kn(t), Fn), this.onlineState = "Unknown" /* Unknown */ , 
        this.$l = new Set, this.Sc.subscribe(this);
    }
    async listen(t) {
        const e = t.query;
        let n = !1, s = this.xl.get(e);
        if (s || (n = !0, s = new gr), n) try {
            s.Fl = await this.Sc.listen(e);
        } catch (e) {
            const n = ys(e, `Initialization of query '${xn(t.query)}' failed`);
            return void t.onError(n);
        }
        this.xl.set(e, s), s.kl.push(t);
        // Run global snapshot listeners if a consistent snapshot has been emitted.
        t.Yu(this.onlineState);
        if (s.Fl) {
            t.Ml(s.Fl) && this.Ol();
        }
    }
    async bc(t) {
        const e = t.query;
        let n = !1;
        const s = this.xl.get(e);
        if (s) {
            const e = s.kl.indexOf(t);
            e >= 0 && (s.kl.splice(e, 1), n = 0 === s.kl.length);
        }
        if (n) return this.xl.delete(e), this.Sc.bc(e);
    }
    Fa(t) {
        let e = !1;
        for (const n of t) {
            const t = n.query, s = this.xl.get(t);
            if (s) {
                for (const t of s.kl) t.Ml(n) && (e = !0);
                s.Fl = n;
            }
        }
        e && this.Ol();
    }
    vl(t, e) {
        const n = this.xl.get(t);
        if (n) for (const t of n.kl) t.onError(e);
        // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
        // after an error.
                this.xl.delete(t);
    }
    Pl(t) {
        this.onlineState = t;
        let e = !1;
        this.xl.forEach((n, s) => {
            for (const n of s.kl) 
            // Run global snapshot listeners if a consistent snapshot has been emitted.
            n.Yu(t) && (e = !0);
        }), e && this.Ol();
    }
    Ll(t) {
        this.$l.add(t), 
        // Immediately fire an initial event, indicating all existing listeners
        // are in-sync.
        t.next();
    }
    ql(t) {
        this.$l.delete(t);
    }
    // Call all global snapshot listeners that have been set.
    Ol() {
        this.$l.forEach(t => {
            t.next();
        });
    }
}

/**
 * QueryListener takes a series of internal view snapshots and determines
 * when to raise the event.
 *
 * It uses an Observer to dispatch events.
 */ class pr {
    constructor(t, e, n) {
        this.query = t, this.Bl = e, 
        /**
         * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
         * observer. This flag is set to true once we've actually raised an event.
         */
        this.Ul = !1, this.Wl = null, this.onlineState = "Unknown" /* Unknown */ , this.options = n || {};
    }
    /**
     * Applies the new ViewSnapshot to this listener, raising a user-facing event
     * if applicable (depending on what changed, whether the user has opted into
     * metadata-only changes, etc.). Returns true if a user-facing event was
     * indeed raised.
     */    Ml(t) {
        if (!this.options.includeMetadataChanges) {
            // Remove the metadata only changes.
            const e = [];
            for (const n of t.docChanges) 3 /* Metadata */ !== n.type && e.push(n);
            t = new pt(t.query, t.docs, t.Ot, e, t.Lt, t.fromCache, t.qt, 
            /* excludesMetadataChanges= */ !0);
        }
        let e = !1;
        return this.Ul ? this.Ql(t) && (this.Bl.next(t), e = !0) : this.jl(t, this.onlineState) && (this.Kl(t), 
        e = !0), this.Wl = t, e;
    }
    onError(t) {
        this.Bl.error(t);
    }
    /** Returns whether a snapshot was raised. */    Yu(t) {
        this.onlineState = t;
        let e = !1;
        return this.Wl && !this.Ul && this.jl(this.Wl, t) && (this.Kl(this.Wl), e = !0), 
        e;
    }
    jl(t, e) {
        // Always raise the first event when we're synced
        if (!t.fromCache) return !0;
        // NOTE: We consider OnlineState.Unknown as online (it should become Offline
        // or Online if we wait long enough).
                const n = "Offline" /* Offline */ !== e;
        // Don't raise the event if we're online, aren't synced yet (checked
        // above) and are waiting for a sync.
                return (!this.options.Gl || !n) && (!t.docs._() || "Offline" /* Offline */ === e);
        // Raise data from cache if we have any documents or we are offline
        }
    Ql(t) {
        // We don't need to handle includeDocumentMetadataChanges here because
        // the Metadata only changes have already been stripped out if needed.
        // At this point the only changes we will see are the ones we should
        // propagate.
        if (t.docChanges.length > 0) return !0;
        const e = this.Wl && this.Wl.hasPendingWrites !== t.hasPendingWrites;
        return !(!t.qt && !e) && !0 === this.options.includeMetadataChanges;
        // Generally we should have hit one of the cases above, but it's possible
        // to get here if there were only metadata docChanges and they got
        // stripped out.
        }
    Kl(t) {
        t = pt.Ut(t.query, t.docs, t.Lt, t.fromCache), this.Ul = !0, this.Bl.next(t);
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
 */ class br {
    Rh(t) {
        this.zl = t;
    }
    es(t, e, s, i) {
        // Queries that match all documents don't benefit from using
        // IndexFreeQueries. It is more efficient to scan all documents in a
        // collection, rather than to perform individual lookups.
        return e.on() || s.isEqual(q.min()) ? this.Hl(t, e) : this.zl.Xn(t, i).next(r => {
            const o = this.Yl(e, r);
            return (e.hn() || e.an()) && this.Ku(e.en, o, i, s) ? this.Hl(t, e) : (I() <= n.DEBUG && m("IndexFreeQueryEngine", "Re-using previous result from %s to execute query: %s", s.toString(), xn(e)), 
            this.zl.es(t, e, s).next(t => (
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
    /** Applies the query filter and sorting to the provided documents.  */    Yl(t, e) {
        // Sort the documents and re-apply the query filter since previously
        // matching documents do not necessarily still match the query.
        let n = new _t(Mn(t));
        return e.forEach((e, s) => {
            s instanceof An && $n(t, s) && (n = n.add(s));
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
     */    Ku(t, e, n, s) {
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
    Hl(t, e) {
        return I() <= n.DEBUG && m("IndexFreeQueryEngine", "Using full collection scan to execute query:", xn(e)), 
        this.zl.es(t, e, q.min());
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
 */ class vr {
    constructor(t, e) {
        this.Gn = t, this._r = e, 
        /**
         * The set of all mutations that have been sent but not yet been applied to
         * the backend.
         */
        this.Kn = [], 
        /** Next value to use when assigning sequential IDs to each mutation batch. */
        this.Jl = 1, 
        /** An ordered mapping between documents and the mutations batch IDs. */
        this.Xl = new _t(Bi.Bh);
    }
    Er(t) {
        return ss.resolve(0 === this.Kn.length);
    }
    Ir(t, e, n, s) {
        const i = this.Jl;
        if (this.Jl++, this.Kn.length > 0) {
            this.Kn[this.Kn.length - 1];
        }
        const r = new es(i, e, n, s);
        this.Kn.push(r);
        // Track references by document key and index collection parents.
        for (const e of s) this.Xl = this.Xl.add(new Bi(e.key, i)), this.Gn.mr(t, e.key.path.p());
        return ss.resolve(r);
    }
    Ar(t, e) {
        return ss.resolve(this.Zl(e));
    }
    Pr(t, e) {
        const n = e + 1, s = this.t_(n), i = s < 0 ? 0 : s;
        // The requested batchId may still be out of range so normalize it to the
        // start of the queue.
                return ss.resolve(this.Kn.length > i ? this.Kn[i] : null);
    }
    Vr() {
        return ss.resolve(0 === this.Kn.length ? -1 : this.Jl - 1);
    }
    gr(t) {
        return ss.resolve(this.Kn.slice());
    }
    Hn(t, e) {
        const n = new Bi(e, 0), s = new Bi(e, Number.POSITIVE_INFINITY), i = [];
        return this.Xl.vt([ n, s ], t => {
            const e = this.Zl(t.Yh);
            i.push(e);
        }), ss.resolve(i);
    }
    ts(t, e) {
        let n = new _t(v);
        return e.forEach(t => {
            const e = new Bi(t, 0), s = new Bi(t, Number.POSITIVE_INFINITY);
            this.Xl.vt([ e, s ], t => {
                n = n.add(t.Yh);
            });
        }), ss.resolve(this.e_(n));
    }
    hs(t, e) {
        // Use the query path as a prefix for testing if a document matches the
        // query.
        const n = e.path, s = n.length + 1;
        // Construct a document reference for actually scanning the index. Unlike
        // the prefix the document key in this reference must have an even number of
        // segments. The empty segment can be used a suffix of the query path
        // because it precedes all other segments in an ordered traversal.
        let i = n;
        j.W(i) || (i = i.child(""));
        const r = new Bi(new j(i), 0);
        // Find unique batchIDs referenced by all documents potentially matching the
        // query.
                let o = new _t(v);
        return this.Xl.St(t => {
            const e = t.key.path;
            return !!n.D(e) && (
            // Rows with document keys more than one segment longer than the query
            // path can't be matches. For example, a query on 'rooms' can't match
            // the document /rooms/abc/messages/xyx.
            // TODO(mcg): we'll need a different scanner when we implement
            // ancestor queries.
            e.length === s && (o = o.add(t.Yh)), !0);
        }, r), ss.resolve(this.e_(o));
    }
    e_(t) {
        // Construct an array of matching batches, sorted by batchID to ensure that
        // multiple mutations affecting the same document key are applied in order.
        const e = [];
        return t.forEach(t => {
            const n = this.Zl(t);
            null !== n && e.push(n);
        }), e;
    }
    pr(t, e) {
        g(0 === this.n_(e.batchId, "removed")), this.Kn.shift();
        let n = this.Xl;
        return ss.forEach(e.mutations, s => {
            const i = new Bi(s.key, e.batchId);
            return n = n.delete(i), this._r.Sr(t, s.key);
        }).next(() => {
            this.Xl = n;
        });
    }
    vr(t) {
        // No-op since the memory mutation queue does not maintain a separate cache.
    }
    Cr(t, e) {
        const n = new Bi(e, 0), s = this.Xl.Dt(n);
        return ss.resolve(e.isEqual(s && s.key));
    }
    Dr(t) {
        return this.Kn.length, ss.resolve();
    }
    /**
     * Finds the index of the given batchId in the mutation queue and asserts that
     * the resulting index is within the bounds of the queue.
     *
     * @param batchId The batchId to search for
     * @param action A description of what the caller is doing, phrased in passive
     * form (e.g. "acknowledged" in a routine that acknowledges batches).
     */    n_(t, e) {
        return this.t_(t);
    }
    /**
     * Finds the index of the given batchId in the mutation queue. This operation
     * is O(1).
     *
     * @return The computed index of the batch with the given batchId, based on
     * the state of the queue. Note this index can be negative if the requested
     * batchId has already been remvoed from the queue or past the end of the
     * queue if the batchId is larger than the last added batch.
     */    t_(t) {
        if (0 === this.Kn.length) 
        // As an index this is past the end of the queue
        return 0;
        // Examine the front of the queue to figure out the difference between the
        // batchId and indexes in the array. Note that since the queue is ordered
        // by batchId, if the first batch has a larger batchId then the requested
        // batchId doesn't exist in the queue.
                return t - this.Kn[0].batchId;
    }
    /**
     * A version of lookupMutationBatch that doesn't return a promise, this makes
     * other functions that uses this code easier to read and more efficent.
     */    Zl(t) {
        const e = this.t_(t);
        if (e < 0 || e >= this.Kn.length) return null;
        return this.Kn[e];
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
 */ class Sr {
    /**
     * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
     * return 0 to avoid unnecessarily doing the work of calculating the size.
     */
    constructor(t, e) {
        this.Gn = t, this.s_ = e, 
        /** Underlying cache of documents and their read times. */
        this.docs = new ct(j.P), 
        /** Size of all cached documents. */
        this.size = 0;
    }
    /**
     * Adds the supplied entry to the cache and updates the cache size as appropriate.
     *
     * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */    xn(t, e, n) {
        const s = e.key, i = this.docs.get(s), r = i ? i.size : 0, o = this.s_(e);
        return this.docs = this.docs.nt(s, {
            $r: e,
            size: o,
            readTime: n
        }), this.size += o - r, this.Gn.mr(t, s.path.p());
    }
    /**
     * Removes the specified entry from the cache and updates the cache size as appropriate.
     *
     * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */    Mn(t) {
        const e = this.docs.get(t);
        e && (this.docs = this.docs.remove(t), this.size -= e.size);
    }
    On(t, e) {
        const n = this.docs.get(e);
        return ss.resolve(n ? n.$r : null);
    }
    getEntries(t, e) {
        let n = Tt();
        return e.forEach(t => {
            const e = this.docs.get(t);
            n = n.nt(t, e ? e.$r : null);
        }), ss.resolve(n);
    }
    es(t, e, n) {
        let s = It();
        // Documents are ordered by key, so we can use a prefix scan to narrow down
        // the documents we need to match the query against.
                const i = new j(e.path.child("")), r = this.docs.ct(i);
        for (;r.wt(); ) {
            const {key: t, value: {$r: i, readTime: o}} = r.dt();
            if (!e.path.D(t.path)) break;
            o.o(n) <= 0 || i instanceof An && $n(e, i) && (s = s.nt(i.key, i));
        }
        return ss.resolve(s);
    }
    i_(t, e) {
        return ss.forEach(this.docs, t => e(t));
    }
    Qr(t) {
        // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
        // a separate changelog and does not need special handling for removals.
        return new Sr.jr(this);
    }
    Gr(t) {
        return ss.resolve(this.size);
    }
}

/**
 * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
 */ Sr.jr = class extends is {
    constructor(t) {
        super(), this.zr = t;
    }
    Bn(t) {
        const e = [];
        return this.Nn.forEach((n, s) => {
            s ? e.push(this.zr.xn(t, s, this.readTime)) : this.zr.Mn(n);
        }), ss.Dn(e);
    }
    Ln(t, e) {
        return this.zr.On(t, e);
    }
    qn(t, e) {
        return this.zr.getEntries(t, e);
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
class Dr {
    constructor(t) {
        this.persistence = t, 
        /**
         * Maps a target to the data about that target
         */
        this.r_ = new $(t => J(t), Z), 
        /** The last received snapshot version. */
        this.lastRemoteSnapshotVersion = q.min(), 
        /** The highest numbered target ID encountered. */
        this.highestTargetId = 0, 
        /** The highest sequence number encountered. */
        this.o_ = 0, 
        /**
         * A ordered bidirectional mapping between documents and the remote target
         * IDs.
         */
        this.h_ = new qi, this.targetCount = 0, this.a_ = gi.Zr();
    }
    pe(t, e) {
        return this.r_.forEach((t, n) => e(n)), ss.resolve();
    }
    io(t) {
        return ss.resolve(this.lastRemoteSnapshotVersion);
    }
    ro(t) {
        return ss.resolve(this.o_);
    }
    eo(t) {
        return this.highestTargetId = this.a_.next(), ss.resolve(this.highestTargetId);
    }
    oo(t, e, n) {
        return n && (this.lastRemoteSnapshotVersion = n), e > this.o_ && (this.o_ = e), 
        ss.resolve();
    }
    ao(t) {
        this.r_.set(t.target, t);
        const e = t.targetId;
        e > this.highestTargetId && (this.a_ = new gi(e), this.highestTargetId = e), t.sequenceNumber > this.o_ && (this.o_ = t.sequenceNumber);
    }
    ho(t, e) {
        return this.ao(e), this.targetCount += 1, ss.resolve();
    }
    uo(t, e) {
        return this.ao(e), ss.resolve();
    }
    lo(t, e) {
        return this.r_.delete(e.target), this.h_.Gh(e.targetId), this.targetCount -= 1, 
        ss.resolve();
    }
    or(t, e, n) {
        let s = 0;
        const i = [];
        return this.r_.forEach((r, o) => {
            o.sequenceNumber <= e && null === n.get(o.targetId) && (this.r_.delete(r), i.push(this._o(t, o.targetId)), 
            s++);
        }), ss.Dn(i).next(() => s);
    }
    fo(t) {
        return ss.resolve(this.targetCount);
    }
    do(t, e) {
        const n = this.r_.get(e) || null;
        return ss.resolve(n);
    }
    wo(t, e, n) {
        return this.h_.Qh(e, n), ss.resolve();
    }
    Eo(t, e, n) {
        this.h_.Kh(e, n);
        const s = this.persistence._r, i = [];
        return s && e.forEach(e => {
            i.push(s.Sr(t, e));
        }), ss.Dn(i);
    }
    _o(t, e) {
        return this.h_.Gh(e), ss.resolve();
    }
    mo(t, e) {
        const n = this.h_.Hh(e);
        return ss.resolve(n);
    }
    Cr(t, e) {
        return ss.resolve(this.h_.Cr(e));
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
class Cr {
    /**
     * The constructor accepts a factory for creating a reference delegate. This
     * allows both the delegate and this instance to have strong references to
     * each other without having nullable fields that would then need to be
     * checked or asserted on every access.
     */
    constructor(t) {
        this.c_ = {}, this.Vo = new cs(0), this.yo = !1, this.yo = !0, this._r = t(this), 
        this.Fo = new Dr(this);
        this.Gn = new si, this.jn = new Sr(this.Gn, t => this._r.u_(t));
    }
    start() {
        return Promise.resolve();
    }
    Zo() {
        // No durable state to ensure is closed on shutdown.
        return this.yo = !1, Promise.resolve();
    }
    get Zi() {
        return this.yo;
    }
    qo() {
        // No op.
    }
    Bo() {
        // No op.
    }
    ah() {
        return this.Gn;
    }
    rh(t) {
        let e = this.c_[t.Jh()];
        return e || (e = new vr(this.Gn, this._r), this.c_[t.Jh()] = e), e;
    }
    oh() {
        return this.Fo;
    }
    hh() {
        return this.jn;
    }
    runTransaction(t, e, n) {
        m("MemoryPersistence", "Starting transaction:", t);
        const s = new Nr(this.Vo.next());
        return this._r.l_(), n(s).next(t => this._r.__(s).next(() => t)).vn().then(t => (s.Qn(), 
        t));
    }
    f_(t, e) {
        return ss.Cn(Object.values(this.c_).map(n => () => n.Cr(t, e)));
    }
}

/**
 * Memory persistence is not actually transactional, but future implementations
 * may have transaction-scoped state.
 */ class Nr extends os {
    constructor(t) {
        super(), this.Ao = t;
    }
}

class Fr {
    constructor(t) {
        this.persistence = t, 
        /** Tracks all documents that are active in Query views. */
        this.d_ = new qi, 
        /** The list of documents that are potentially GCed after each transaction. */
        this.w_ = null;
    }
    static T_(t) {
        return new Fr(t);
    }
    get E_() {
        if (this.w_) return this.w_;
        throw V();
    }
    To(t, e, n) {
        return this.d_.To(n, e), this.E_.delete(n), ss.resolve();
    }
    Io(t, e, n) {
        return this.d_.Io(n, e), this.E_.add(n), ss.resolve();
    }
    Sr(t, e) {
        return this.E_.add(e), ss.resolve();
    }
    removeTarget(t, e) {
        this.d_.Gh(e.targetId).forEach(t => this.E_.add(t));
        const n = this.persistence.oh();
        return n.mo(t, e.targetId).next(t => {
            t.forEach(t => this.E_.add(t));
        }).next(() => n.lo(t, e));
    }
    l_() {
        this.w_ = new Set;
    }
    __(t) {
        // Remove newly orphaned documents.
        const e = this.persistence.hh().Qr();
        return ss.forEach(this.E_, n => this.I_(t, n).next(t => {
            t || e.Mn(n);
        })).next(() => (this.w_ = null, e.apply(t)));
    }
    dh(t, e) {
        return this.I_(t, e).next(t => {
            t ? this.E_.delete(e) : this.E_.add(e);
        });
    }
    u_(t) {
        // For eager GC, we don't care about the document size, there are no size thresholds.
        return 0;
    }
    I_(t, e) {
        return ss.Cn([ () => ss.resolve(this.d_.Cr(e)), () => this.persistence.oh().Cr(t, e), () => this.persistence.f_(t, e) ]);
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
 */ class kr {
    constructor(t) {
        this.m_ = t.m_, this.A_ = t.A_;
    }
    Ca(t) {
        this.R_ = t;
    }
    pa(t) {
        this.P_ = t;
    }
    onMessage(t) {
        this.V_ = t;
    }
    close() {
        this.A_();
    }
    send(t) {
        this.m_(t);
    }
    g_() {
        this.R_();
    }
    y_(t) {
        this.P_(t);
    }
    p_(t) {
        this.V_(t);
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
 */ const xr = {
    BatchGetDocuments: "batchGet",
    Commit: "commit",
    RunQuery: "runQuery"
};

/**
 * Maps RPC names to the corresponding REST endpoint name.
 *
 * We use array notation to avoid mangling.
 */ class $r extends 
/**
 * Base class for all Rest-based connections to the backend (WebChannel and
 * HTTP).
 */
class {
    constructor(t) {
        this.b_ = t, this.s = t.s;
        const e = t.ssl ? "https" : "http";
        this.v_ = e + "://" + t.host, this.S_ = "projects/" + this.s.projectId + "/databases/" + this.s.database + "/documents";
    }
    Qa(t, e, n, s) {
        const i = this.D_(t, e);
        m("RestConnection", "Sending: ", i, n);
        const r = {};
        return this.C_(r, s), this.N_(t, i, r, n).then(t => (m("RestConnection", "Received: ", t), 
        t), e => {
            throw R("RestConnection", t + " failed with error: ", e, "url: ", i, "request:", n), 
            e;
        });
    }
    ja(t, e, n, s) {
        // The REST API automatically aggregates all of the streamed results, so we
        // can just use the normal invoke() method.
        return this.Qa(t, e, n, s);
    }
    /**
     * Modifies the headers for a request, adding any authorization token if
     * present and any additional headers for the request.
     */    C_(t, e) {
        if (t["X-Goog-Api-Client"] = "gl-js/ fire/7.17.2", 
        // Content-Type: text/plain will avoid preflight requests which might
        // mess with CORS and redirects by proxies. If we add custom headers
        // we will need to change this code to potentially use the $httpOverwrite
        // parameter supported by ESF to avoid	triggering preflight requests.
        t["Content-Type"] = "text/plain", e) for (const n in e.ta) e.ta.hasOwnProperty(n) && (t[n] = e.ta[n]);
    }
    D_(t, e) {
        const n = xr[t];
        return `${this.v_}/v1/${e}:${n}`;
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
    N_(t, e, n, s) {
        return new Promise((i, r) => {
            const o = new l;
            o.listenOnce(_.COMPLETE, () => {
                try {
                    switch (o.getLastErrorCode()) {
                      case f.NO_ERROR:
                        const e = o.getResponseJson();
                        m("Connection", "XHR received:", JSON.stringify(e)), i(e);
                        break;

                      case f.TIMEOUT:
                        m("Connection", 'RPC "' + t + '" timed out'), r(new O(M.DEADLINE_EXCEEDED, "Request time out"));
                        break;

                      case f.HTTP_ERROR:
                        const n = o.getStatus();
                        if (m("Connection", 'RPC "' + t + '" failed with status:', n, "response text:", o.getResponseText()), 
                        n > 0) {
                            const t = o.getResponseJson().error;
                            if (t && t.status && t.message) {
                                const e = function(t) {
                                    const e = t.toLowerCase().replace("_", "-");
                                    return Object.values(M).indexOf(e) >= 0 ? e : M.UNKNOWN;
                                }(t.status);
                                r(new O(e, t.message));
                            } else r(new O(M.UNKNOWN, "Server responded with status " + o.getStatus()));
                        } else 
                        // If we received an HTTP_ERROR but there's no status code,
                        // it's most probably a connection issue
                        r(new O(M.UNAVAILABLE, "Connection failed."));
                        break;

                      default:
                        V();
                    }
                } finally {
                    m("Connection", 'RPC "' + t + '" completed.');
                }
            });
            const h = JSON.stringify(s);
            o.send(e, "POST", h, n, 15);
        });
    }
    Na(t, e) {
        const n = [ this.v_, "/", "google.firestore.v1.Firestore", "/", t, "/channel" ], s = d(), i = {
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
        this.C_(i.initMessageHeaders, e), 
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
        r() || o() || h() || a() || c() || u() || (i.httpHeadersOverwriteParam = "$httpHeaders");
        const l = n.join("");
        m("Connection", "Creating WebChannel: " + l, i);
        const _ = s.createWebChannel(l, i);
        // WebChannel supports sending the first message with the handshake - saving
        // a network round trip. However, it will have to call send in the same
        // JS event loop as open. In order to enforce this, we delay actually
        // opening the WebChannel until send is called. Whether we have called
        // open is tracked with this variable.
                let f = !1, T = !1;
        // A flag to determine whether the stream was closed (by us or through an
        // error/close event) to avoid delivering multiple close events or sending
        // on a closed stream
                const E = new kr({
            m_: t => {
                T ? m("Connection", "Not sending because WebChannel is closed:", t) : (f || (m("Connection", "Opening WebChannel transport."), 
                _.open(), f = !0), m("Connection", "WebChannel sending:", t), _.send(t));
            },
            A_: () => _.close()
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
                return I(w.EventType.OPEN, () => {
            T || m("Connection", "WebChannel transport opened.");
        }), I(w.EventType.CLOSE, () => {
            T || (T = !0, m("Connection", "WebChannel transport closed"), E.y_());
        }), I(w.EventType.ERROR, t => {
            T || (T = !0, R("Connection", "WebChannel transport errored:", t), E.y_(new O(M.UNAVAILABLE, "The operation could not be completed")));
        }), I(w.EventType.MESSAGE, t => {
            var e;
            if (!T) {
                const n = t.data[0];
                g(!!n);
                // TODO(b/35143891): There is a bug in One Platform that caused errors
                // (and only errors) to be wrapped in an extra array. To be forward
                // compatible with the bug we need to check either condition. The latter
                // can be removed once the fix has been rolled out.
                // Use any because msgData.error is not typed.
                const s = n, i = s.error || (null === (e = s[0]) || void 0 === e ? void 0 : e.error);
                if (i) {
                    m("Connection", "WebChannel received error:", i);
                    // error.status will be a string like 'OK' or 'NOT_FOUND'.
                    const t = i.status;
                    let e = function(t) {
                        // lookup by string
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const e = rt[t];
                        if (void 0 !== e) return at(e);
                    }(t), n = i.message;
                    void 0 === e && (e = M.INTERNAL, n = "Unknown error status: " + t + " with message " + i.message), 
                    // Mark closed so no further events are propagated
                    T = !0, E.y_(new O(e, n)), _.close();
                } else m("Connection", "WebChannel received:", n), E.p_(n);
            }
        }), setTimeout(() => {
            // Technically we could/should wait for the WebChannel opened event,
            // but because we want to send the first message with the WebChannel
            // handshake we pretend the channel opened here (asynchronously), and
            // then delay the actual open until the first message is sent.
            E.g_();
        }, 0), E;
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
class Mr {
    constructor() {
        this.F_ = () => this.k_(), this.x_ = () => this.M_(), this.O_ = [], this.L_();
    }
    ac(t) {
        this.O_.push(t);
    }
    Zo() {
        window.removeEventListener("online", this.F_), window.removeEventListener("offline", this.x_);
    }
    L_() {
        window.addEventListener("online", this.F_), window.addEventListener("offline", this.x_);
    }
    k_() {
        m("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
        for (const t of this.O_) t(0 /* AVAILABLE */);
    }
    M_() {
        m("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
        for (const t of this.O_) t(1 /* UNAVAILABLE */);
    }
    // TODO(chenbrian): Consider passing in window either into this component or
    // here for testing via FakeWindow.
    /** Checks that all used attributes of window are available. */
    static Fs() {
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
 */ class Or {
    ac(t) {
        // No-op.
    }
    Zo() {
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
function Lr(t) {
    return new se(t, /* useProto3Json= */ !0);
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
 */ const qr = "You are using the memory-only build of Firestore. Persistence support is only available via the @firebase/firestore bundle or the firebase-firestore.js build.";

/**
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */ class Br {
    async initialize(t) {
        this.nl = this.q_(t), this.persistence = this.B_(t), await this.persistence.start(), 
        this.U_ = this.W_(t), this.ec = this.Q_(t);
    }
    W_(t) {
        return null;
    }
    Q_(t) {
        /** Manages our in-memory or durable persistence. */
        return e = this.persistence, n = new br, s = t.j_, new Mi(e, n, s);
        var e, n, s;
    }
    B_(t) {
        if (t.G_.K_) throw new O(M.FAILED_PRECONDITION, qr);
        return new Cr(Fr.T_);
    }
    q_(t) {
        return new cr;
    }
    async terminate() {
        this.U_ && this.U_.stop(), await this.nl.Zo(), await this.persistence.Zo();
    }
    clearPersistence(t, e) {
        throw new O(M.FAILED_PRECONDITION, qr);
    }
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */ class Ur extends Br {
    async initialize(t) {
        await super.initialize(t), await async function(t) {
            const e = y(t), n = y(e.mh);
            return e.persistence.runTransaction("Synchronize last document change read time", "readonly", t => n.Wr(t)).then(t => {
                e.Ih = t;
            });
        }(this.ec);
    }
    W_(t) {
        const e = this.persistence._r.Hi;
        return new Ds(e, t.ti);
    }
    B_(t) {
        const e = $i(t.b_.s, t.b_.persistenceKey), n = Lr(t.b_.s);
        return new Ci(t.G_.synchronizeTabs, e, t.clientId, Ss.Bi(t.G_.cacheSizeBytes), t.ti, Rs(), Ps(), n, this.nl, t.G_.Po);
    }
    q_(t) {
        return new cr;
    }
    clearPersistence(t, e) {
        return async function(t) {
            if (!_s.Fs()) return Promise.resolve();
            const e = t + "main";
            await _s.delete(e);
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
 */ ($i(t, e));
    }
}

/**
 * Provides all components needed for Firestore with multi-tab IndexedDB
 * persistence.
 *
 * In the legacy client, this provider is used to provide both multi-tab and
 * non-multi-tab persistence since we cannot tell at build time whether
 * `synchronizeTabs` will be enabled.
 */ class Wr extends Ur {
    constructor(t) {
        super(), this.z_ = t;
    }
    async initialize(t) {
        await super.initialize(t), await this.z_.initialize(this, t);
        const e = this.z_.Sc;
        this.nl instanceof ar && (this.nl.Sc = {
            Nu: Er.bind(null, e),
            Fu: Pr.bind(null, e),
            ku: Vr.bind(null, e),
            ih: Rr.bind(null, e)
        }, await this.nl.start()), 
        // NOTE: This will immediately call the listener, so we make sure to
        // set it after localStore / remoteStore are started.
        await this.persistence.Lo(async t => {
            await Ir(this.z_.Sc, t), this.U_ && (t && !this.U_.Zi ? this.U_.start(this.ec) : t || this.U_.stop());
        });
    }
    q_(t) {
        if (t.G_.K_ && t.G_.synchronizeTabs) {
            const e = Rs();
            if (!ar.Fs(e)) throw new O(M.UNIMPLEMENTED, "IndexedDB persistence is only available on platforms that support LocalStorage.");
            const n = $i(t.b_.s, t.b_.persistenceKey);
            return new ar(e, t.ti, n, t.clientId, t.j_);
        }
        return new cr;
    }
}

/**
 * Initializes and wires the components that are needed to interface with the
 * network.
 */ class Qr {
    async initialize(t, e) {
        this.ec || (this.ec = t.ec, this.nl = t.nl, this.nc = this.H_(e), this.el = this.Y_(e), 
        this.Sc = this.J_(e), this.X_ = this.Z_(e), this.nl.Ka = t => this.Sc.Yu(t, 1 /* SharedClientState */), 
        this.el.Sc = this.Sc, await this.el.start(), await this.el.Qc(this.Sc.wl));
    }
    Z_(t) {
        return new yr(this.Sc);
    }
    H_(t) {
        const e = Lr(t.b_.s), n = (s = t.b_, new $r(s));
        var s;
        /** Return the Platform-specific connectivity monitor. */        return function(t, e, n) {
            return new Ji(t, e, n);
        }(t.credentials, n, e);
    }
    Y_(t) {
        return new Zi(this.ec, this.nc, t.ti, t => this.Sc.Yu(t, 0 /* RemoteStore */), Mr.Fs() ? new Mr : new Or);
    }
    J_(t) {
        return function(t, e, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        s, i, r, o) {
            const h = new wr(t, e, n, s, i, r);
            return o && (h.dl = !0), h;
        }(this.ec, this.el, this.nc, this.nl, t.j_, t.sl, !t.G_.K_ || !t.G_.synchronizeTabs);
    }
    terminate() {
        return this.el.Zo();
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
 */ function jr(t) {
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

class Kr {
    constructor(t) {
        this.observer = t, 
        /**
         * When set to true, will not raise future events. Necessary to deal with
         * async detachment of listener.
         */
        this.muted = !1;
    }
    next(t) {
        this.observer.next && this.tf(this.observer.next, t);
    }
    error(t) {
        this.observer.error ? this.tf(this.observer.error, t) : console.error("Uncaught Error in snapshot listener:", t);
    }
    ef() {
        this.muted = !0;
    }
    tf(t, e) {
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
 */ function Gr(t, e) {
    if (0 !== e.length) throw new O(M.INVALID_ARGUMENT, `Function ${t}() does not support arguments, but was called with ` + _o(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has the exact number of arguments.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateExactNumberOfArgs('myFunction', arguments, 2);
 */ function zr(t, e, n) {
    if (e.length !== n) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires ` + _o(n, "argument") + ", but was called with " + _o(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */ function Hr(t, e, n) {
    if (e.length < n) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires at least ` + _o(n, "argument") + ", but was called with " + _o(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has number of arguments between
 * the values provided.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
 */ function Yr(t, e, n, s) {
    if (e.length < n || e.length > s) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires between ${n} and ` + s + " arguments, but was called with " + _o(e.length, "argument") + ".");
}

/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */
function Jr(t, e, n, s) {
    io(t, e, lo(n) + " argument", s);
}

/**
 * Validates the provided argument has the native JavaScript type using
 * typeof checks or is undefined.
 */ function Xr(t, e, n, s) {
    void 0 !== s && Jr(t, e, n, s);
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks.
 */ function Zr(t, e, n, s) {
    io(t, e, n + " option", s);
}

/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks or is undefined.
 */ function to(t, e, n, s) {
    void 0 !== s && Zr(t, e, n, s);
}

function eo(t, e, n, s, i) {
    void 0 !== s && function(t, e, n, s, i) {
        if (!(s instanceof Array)) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires its ${e} option to be an array, but it was: ` + oo(s));
        for (let r = 0; r < s.length; ++r) if (!i(s[r])) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires all ${e} elements to be ${n}, but the value at index ${r} was: ` + oo(s[r]));
    }(t, e, n, s, i);
}

/**
 * Validates that the provided named option equals one of the expected values.
 */
/**
 * Validates that the provided named option equals one of the expected values or
 * is undefined.
 */
function no(t, e, n, s, i) {
    void 0 !== s && function(t, e, n, s, i) {
        const r = [];
        for (const t of i) {
            if (t === s) return;
            r.push(oo(t));
        }
        const o = oo(s);
        throw new O(M.INVALID_ARGUMENT, `Invalid value ${o} provided to function ${t}() for option "${n}". Acceptable values: ${r.join(", ")}`);
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
 */ function so(t, e, n, s) {
    if (!e.some(t => t === s)) throw new O(M.INVALID_ARGUMENT, `Invalid value ${oo(s)} provided to function ${t}() for its ${lo(n)} argument. Acceptable values: ` + e.join(", "));
    return s;
}

/** Helper to validate the type of a provided input. */ function io(t, e, n, s) {
    let i = !1;
    if (i = "object" === e ? ro(s) : "non-empty string" === e ? "string" == typeof s && "" !== s : typeof s === e, 
    !i) {
        const i = oo(s);
        throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires its ${n} to be of type ${e}, but it was: ${i}`);
    }
}

/**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */ function ro(t) {
    return "object" == typeof t && null !== t && (Object.getPrototypeOf(t) === Object.prototype || null === Object.getPrototypeOf(t));
}

/** Returns a string describing the type / value of the provided input. */ function oo(t) {
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
    return "function" == typeof t ? "a function" : V();
}

function ho(t, e, n) {
    if (void 0 === n) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires a valid ${lo(e)} argument, but it was undefined.`);
}

/**
 * Validates the provided positional argument is an object, and its keys and
 * values match the expected keys and types provided in optionTypes.
 */ function ao(t, e, n) {
    k(e, (e, s) => {
        if (n.indexOf(e) < 0) throw new O(M.INVALID_ARGUMENT, `Unknown option '${e}' passed to function ${t}(). Available options: ` + n.join(", "));
    });
}

/**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */ function co(t, e, n, s) {
    const i = oo(s);
    return new O(M.INVALID_ARGUMENT, `Function ${t}() requires its ${lo(n)} argument to be a ${e}, but it was: ${i}`);
}

function uo(t, e, n) {
    if (n <= 0) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires its ${lo(e)} argument to be a positive number, but it was: ${n}.`);
}

/** Converts a number to its english word representation */ function lo(t) {
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
 */ function _o(t, e) {
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
/** Helper function to assert Uint8Array is available at runtime. */ function fo() {
    if ("undefined" == typeof Uint8Array) throw new O(M.UNIMPLEMENTED, "Uint8Arrays are not available in this environment.");
}

/**
 * Immutable class holding a blob (binary data).
 * This class is directly exposed in the public API.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */ class wo {
    constructor(t) {
        this.nf = t;
    }
    static fromBase64String(t) {
        zr("Blob.fromBase64String", arguments, 1), Jr("Blob.fromBase64String", "string", 1, t);
        try {
            return new wo(nt.fromBase64String(t));
        } catch (t) {
            throw new O(M.INVALID_ARGUMENT, "Failed to construct Blob from Base64 string: " + t);
        }
    }
    static fromUint8Array(t) {
        if (zr("Blob.fromUint8Array", arguments, 1), fo(), !(t instanceof Uint8Array)) throw co("Blob.fromUint8Array", "Uint8Array", 1, t);
        return new wo(nt.fromUint8Array(t));
    }
    toBase64() {
        return zr("Blob.toBase64", arguments, 0), this.nf.toBase64();
    }
    toUint8Array() {
        return zr("Blob.toUint8Array", arguments, 0), fo(), this.nf.toUint8Array();
    }
    toString() {
        return "Blob(base64: " + this.toBase64() + ")";
    }
    isEqual(t) {
        return this.nf.isEqual(t.nf);
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
 */ class To {
    constructor(t) {
        !function(t, e, n, s) {
            if (!(e instanceof Array) || e.length < s) throw new O(M.INVALID_ARGUMENT, `Function ${t}() requires its ${n} argument to be an array with at least ` + _o(s, "element") + ".");
        }("FieldPath", t, "fieldNames", 1);
        for (let e = 0; e < t.length; ++e) if (Jr("FieldPath", "string", e, t[e]), 0 === t[e].length) throw new O(M.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
        this.sf = new Q(t);
    }
}

/**
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */ class Eo extends To {
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
        return new Eo(Q.L().F());
    }
    isEqual(t) {
        if (!(t instanceof Eo)) throw co("isEqual", "FieldPath", 1, t);
        return this.sf.isEqual(t.sf);
    }
}

/**
 * Matches any characters in a field path string that are reserved.
 */ const Io = new RegExp("[~\\*/\\[\\]]");

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
class mo {
    constructor() {
        /** A pointer to the implementing class. */
        this.if = this;
    }
}

class Ao extends mo {
    constructor(t) {
        super(), this.rf = t;
    }
    hf(t) {
        if (2 /* MergeSet */ !== t.af) throw 1 /* Update */ === t.af ? t.cf(this.rf + "() can only appear at the top level of your update data") : t.cf(this.rf + "() cannot be used with set() unless you pass {merge:true}");
        // No transform to add for a delete, but we need to add it to our
        // fieldMask so it gets deleted.
        return t.Le.push(t.path), null;
    }
    isEqual(t) {
        return t instanceof Ao;
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
 */ function Ro(t, e, n) {
    return new ko({
        af: 3 /* Argument */ ,
        uf: e.settings.uf,
        methodName: t.rf,
        lf: n
    }, e.s, e.serializer, e.ignoreUndefinedProperties);
}

class Po extends mo {
    constructor(t) {
        super(), this.rf = t;
    }
    hf(t) {
        return new Ye(t.path, new Be);
    }
    isEqual(t) {
        return t instanceof Po;
    }
}

class Vo extends mo {
    constructor(t, e) {
        super(), this.rf = t, this._f = e;
    }
    hf(t) {
        const e = Ro(this, t, 
        /*array=*/ !0), n = this._f.map(t => qo(t, e)), s = new Ue(n);
        return new Ye(t.path, s);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class go extends mo {
    constructor(t, e) {
        super(), this.rf = t, this._f = e;
    }
    hf(t) {
        const e = Ro(this, t, 
        /*array=*/ !0), n = this._f.map(t => qo(t, e)), s = new Qe(n);
        return new Ye(t.path, s);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class yo extends mo {
    constructor(t, e) {
        super(), this.rf = t, this.ff = e;
    }
    hf(t) {
        const e = new Ke(t.serializer, oe(t.serializer, this.ff));
        return new Ye(t.path, e);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

/** The public FieldValue class of the lite API. */ class po extends mo {
    constructor() {
        super();
    }
    static delete() {
        return Gr("FieldValue.delete", arguments), new bo(new Ao("FieldValue.delete"));
    }
    static serverTimestamp() {
        return Gr("FieldValue.serverTimestamp", arguments), new bo(new Po("FieldValue.serverTimestamp"));
    }
    static arrayUnion(...t) {
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
        return Hr("FieldValue.arrayUnion", arguments, 1), new bo(new Vo("FieldValue.arrayUnion", t));
    }
    static arrayRemove(...t) {
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
        return Hr("FieldValue.arrayRemove", arguments, 1), new bo(new go("FieldValue.arrayRemove", t));
    }
    static increment(t) {
        return Jr("FieldValue.increment", "number", 1, t), zr("FieldValue.increment", arguments, 1), 
        new bo(new yo("FieldValue.increment", t));
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
 */ class bo extends po {
    constructor(t) {
        super(), this.if = t, this.rf = t.rf;
    }
    hf(t) {
        return this.if.hf(t);
    }
    isEqual(t) {
        return t instanceof bo && this.if.isEqual(t.if);
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
 */ class vo {
    constructor(t, e) {
        if (zr("GeoPoint", arguments, 2), Jr("GeoPoint", "number", 1, t), Jr("GeoPoint", "number", 2, e), 
        !isFinite(t) || t < -90 || t > 90) throw new O(M.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + t);
        if (!isFinite(e) || e < -180 || e > 180) throw new O(M.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + e);
        this.df = t, this.wf = e;
    }
    /**
     * Returns the latitude of this geo point, a number between -90 and 90.
     */    get latitude() {
        return this.df;
    }
    /**
     * Returns the longitude of this geo point, a number between -180 and 180.
     */    get longitude() {
        return this.wf;
    }
    isEqual(t) {
        return this.df === t.df && this.wf === t.wf;
    }
    /**
     * Actually private to JS consumers of our API, so this function is prefixed
     * with an underscore.
     */    T(t) {
        return v(this.df, t.df) || v(this.wf, t.wf);
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
 */ const So = /^__.*__$/;

/**
 * A reference to a document in a Firebase project.
 *
 * This class serves as a common base class for the public DocumentReferences
 * exposed in the lite, full and legacy SDK.
 */ class Do {
    constructor(t, e, n) {
        this.Tf = t, this.Ef = e, this.If = n;
    }
}

/** The result of parsing document data (e.g. for a setData call). */ class Co {
    constructor(t, e, n) {
        this.data = t, this.Le = e, this.fieldTransforms = n;
    }
    mf(t, e) {
        const n = [];
        return null !== this.Le ? n.push(new cn(t, this.data, this.Le, e)) : n.push(new an(t, this.data, e)), 
        this.fieldTransforms.length > 0 && n.push(new ln(t, this.fieldTransforms)), n;
    }
}

/** The result of parsing "update" data (i.e. for an updateData call). */ class No {
    constructor(t, e, n) {
        this.data = t, this.Le = e, this.fieldTransforms = n;
    }
    mf(t, e) {
        const n = [ new cn(t, this.data, this.Le, e) ];
        return this.fieldTransforms.length > 0 && n.push(new ln(t, this.fieldTransforms)), 
        n;
    }
}

function Fo(t) {
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
        throw V();
    }
}

/** A "context" object passed around while parsing user data. */ class ko {
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
        void 0 === i && this.Af(), this.fieldTransforms = i || [], this.Le = r || [];
    }
    get path() {
        return this.settings.path;
    }
    get af() {
        return this.settings.af;
    }
    /** Returns a new context with the specified settings overwritten. */    Rf(t) {
        return new ko(Object.assign(Object.assign({}, this.settings), t), this.s, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.Le);
    }
    Pf(t) {
        var e;
        const n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), s = this.Rf({
            path: n,
            lf: !1
        });
        return s.Vf(t), s;
    }
    gf(t) {
        var e;
        const n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), s = this.Rf({
            path: n,
            lf: !1
        });
        return s.Af(), s;
    }
    yf(t) {
        // TODO(b/34871131): We don't support array paths right now; so make path
        // undefined.
        return this.Rf({
            path: void 0,
            lf: !0
        });
    }
    cf(t) {
        return Ko(t, this.settings.methodName, this.settings.pf || !1, this.path, this.settings.uf);
    }
    /** Returns 'true' if 'fieldPath' was traversed when creating this context. */    contains(t) {
        return void 0 !== this.Le.find(e => t.D(e)) || void 0 !== this.fieldTransforms.find(e => t.D(e.field));
    }
    Af() {
        // TODO(b/34871131): Remove null check once we have proper paths for fields
        // within arrays.
        if (this.path) for (let t = 0; t < this.path.length; t++) this.Vf(this.path.get(t));
    }
    Vf(t) {
        if (0 === t.length) throw this.cf("Document fields must not be empty");
        if (Fo(this.af) && So.test(t)) throw this.cf('Document fields cannot begin and end with "__"');
    }
}

/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */ class xo {
    constructor(t, e, n) {
        this.s = t, this.ignoreUndefinedProperties = e, this.serializer = n || Lr(t);
    }
    /** Creates a new top-level parse context. */    bf(t, e, n, s = !1) {
        return new ko({
            af: t,
            methodName: e,
            uf: n,
            path: Q.$(),
            lf: !1,
            pf: s
        }, this.s, this.serializer, this.ignoreUndefinedProperties);
    }
}

/** Parse document data from a set() call. */ function $o(t, e, n, s, i, r = {}) {
    const o = t.bf(r.merge || r.mergeFields ? 2 /* MergeSet */ : 0 /* Set */ , e, n, i);
    Wo("Data must be an object, but it was:", o, s);
    const h = Bo(s, o);
    let a, c;
    if (r.merge) a = new He(o.Le), c = o.fieldTransforms; else if (r.mergeFields) {
        const t = [];
        for (const s of r.mergeFields) {
            let i;
            if (s instanceof To) i = s.sf; else {
                if ("string" != typeof s) throw V();
                i = jo(e, s, n);
            }
            if (!o.contains(i)) throw new O(M.INVALID_ARGUMENT, `Field '${i}' is specified in your field mask but missing from your input data.`);
            Go(t, i) || t.push(i);
        }
        a = new He(t), c = o.fieldTransforms.filter(t => a.je(t.field));
    } else a = null, c = o.fieldTransforms;
    return new Co(new Tn(h), a, c);
}

/** Parse update data from an update() call. */ function Mo(t, e, n, s) {
    const i = t.bf(1 /* Update */ , e, n);
    Wo("Data must be an object, but it was:", i, s);
    const r = [], o = new En;
    k(s, (t, s) => {
        const h = jo(e, t, n), a = i.gf(h);
        if (s instanceof mo && s.if instanceof Ao) 
        // Add it to the field mask, but don't add anything to updateData.
        r.push(h); else {
            const t = qo(s, a);
            null != t && (r.push(h), o.set(h, t));
        }
    });
    const h = new He(r);
    return new No(o.Ge(), h, i.fieldTransforms);
}

/** Parse update data from a list of field/value arguments. */ function Oo(t, e, n, s, i, r) {
    const o = t.bf(1 /* Update */ , e, n), h = [ Qo(e, s, n) ], a = [ i ];
    if (r.length % 2 != 0) throw new O(M.INVALID_ARGUMENT, `Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);
    for (let t = 0; t < r.length; t += 2) h.push(Qo(e, r[t])), a.push(r[t + 1]);
    const c = [], u = new En;
    // We iterate in reverse order to pick the last value for a field if the
    // user specified the field multiple times.
    for (let t = h.length - 1; t >= 0; --t) if (!Go(c, h[t])) {
        const e = h[t], n = a[t], s = o.gf(e);
        if (n instanceof mo && n.if instanceof Ao) 
        // Add it to the field mask, but don't add anything to updateData.
        c.push(e); else {
            const t = qo(n, s);
            null != t && (c.push(e), u.set(e, t));
        }
    }
    const l = new He(c);
    return new No(u.Ge(), l, o.fieldTransforms);
}

/**
 * Parse a "query value" (e.g. value in a where filter or a value in a cursor
 * bound).
 *
 * @param allowArrays Whether the query value is an array that may directly
 * contain additional arrays (e.g. the operand of an `in` query).
 */ function Lo(t, e, n, s = !1) {
    return qo(n, t.bf(s ? 4 /* ArrayArgument */ : 3 /* Argument */ , e));
}

/**
 * Parses user data to Protobuf Values.
 *
 * @param input Data to be parsed.
 * @param context A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @return The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */ function qo(t, e) {
    if (Uo(t)) return Wo("Unsupported field value:", e, t), Bo(t, e);
    if (t instanceof mo) 
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
        if (!Fo(e.af)) throw e.cf(t.rf + "() can only be used with update() and set()");
        if (!e.path) throw e.cf(t.rf + "() is not currently supported inside arrays");
        const n = t.hf(e);
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
    e.path && e.Le.push(e.path), t instanceof Array) {
        // TODO(b/34871131): Include the path containing the array in the error
        // message.
        // In the case of IN queries, the parsed data is an array (representing
        // the set of values to be included for the IN query) that may directly
        // contain additional arrays (each representing an individual field
        // value), so we disable this validation.
        if (e.settings.lf && 4 /* ArrayArgument */ !== e.af) throw e.cf("Nested arrays are not supported");
        return function(t, e) {
            const n = [];
            let s = 0;
            for (const i of t) {
                let t = qo(i, e.yf(s));
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
        if ("number" == typeof t) return oe(e.serializer, t);
        if ("boolean" == typeof t) return {
            booleanValue: t
        };
        if ("string" == typeof t) return {
            stringValue: t
        };
        if (t instanceof Date) {
            const n = L.fromDate(t);
            return {
                timestampValue: he(e.serializer, n)
            };
        }
        if (t instanceof L) {
            // Firestore backend truncates precision down to microseconds. To ensure
            // offline mode works the same with regards to truncation, perform the
            // truncation immediately without waiting for the backend to do that.
            const n = new L(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3));
            return {
                timestampValue: he(e.serializer, n)
            };
        }
        if (t instanceof vo) return {
            geoPointValue: {
                latitude: t.latitude,
                longitude: t.longitude
            }
        };
        if (t instanceof wo) return {
            bytesValue: ae(e.serializer, t)
        };
        if (t instanceof Do) {
            const n = e.s, s = t.Tf;
            if (!s.isEqual(n)) throw e.cf(`Document reference is for database ${s.projectId}/${s.database} but should be for database ${n.projectId}/${n.database}`);
            return {
                referenceValue: le(t.Tf || e.s, t.Ef.path)
            };
        }
        if (void 0 === t && e.ignoreUndefinedProperties) return null;
        throw e.cf("Unsupported field value: " + oo(t));
    }
    /**
 * Checks whether an object looks like a JSON object that should be converted
 * into a struct. Normal class/prototype instances are considered to look like
 * JSON objects since they should be converted to a struct value. Arrays, Dates,
 * GeoPoints, etc. are not considered to look like JSON objects since they map
 * to specific FieldValue types other than ObjectValue.
 */ (t, e);
}

function Bo(t, e) {
    const n = {};
    return x(t) ? 
    // If we encounter an empty object, we explicitly add it to the update
    // mask to ensure that the server creates a map entry.
    e.path && e.path.length > 0 && e.Le.push(e.path) : k(t, (t, s) => {
        const i = qo(s, e.Pf(t));
        null != i && (n[t] = i);
    }), {
        mapValue: {
            fields: n
        }
    };
}

function Uo(t) {
    return !("object" != typeof t || null === t || t instanceof Array || t instanceof Date || t instanceof L || t instanceof vo || t instanceof wo || t instanceof Do || t instanceof mo);
}

function Wo(t, e, n) {
    if (!Uo(n) || !ro(n)) {
        const s = oo(n);
        throw "an object" === s ? e.cf(t + " a custom object") : e.cf(t + " " + s);
    }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */ function Qo(t, e, n) {
    if (e instanceof To) return e.sf;
    if ("string" == typeof e) return jo(t, e);
    throw Ko("Field path arguments must be of type string or FieldPath.", t, 
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
 */ function jo(t, e, n) {
    try {
        return function(t) {
            if (t.search(Io) >= 0) throw new O(M.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`);
            try {
                return new Eo(...t.split("."));
            } catch (e) {
                throw new O(M.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            }
        }(e).sf;
    } catch (e) {
        throw Ko((s = e) instanceof Error ? s.message : s.toString(), t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
    }
    /**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */
    var s;
    /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}

function Ko(t, e, n, s, i) {
    const r = s && !s._(), o = void 0 !== i;
    let h = `Function ${e}() called with invalid data`;
    n && (h += " (via `toFirestore()`)"), h += ". ";
    let a = "";
    return (r || o) && (a += " (found", r && (a += " in field " + s), o && (a += " in document " + i), 
    a += ")"), new O(M.INVALID_ARGUMENT, h + t + a);
}

function Go(t, e) {
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
 */ class zo {
    constructor(t) {
        this.nc = t, 
        // The version of each document that was read during this transaction.
        this.vf = new Map, this.mutations = [], this.Sf = !1, 
        /**
         * A deferred usage error that occurred previously in this transaction that
         * will cause the transaction to fail once it actually commits.
         */
        this.Df = null, 
        /**
         * Set of documents that have been written in the transaction.
         *
         * When there's more than one write to the same key in a transaction, any
         * writes after the first are handled differently.
         */
        this.Cf = new Set;
    }
    async Nf(t) {
        if (this.Ff(), this.mutations.length > 0) throw new O(M.INVALID_ARGUMENT, "Firestore transactions require all reads to be executed before all writes.");
        const e = await async function(t, e) {
            const n = y(t), s = Ee(n.serializer) + "/documents", i = {
                documents: e.map(t => fe(n.serializer, t))
            }, r = await n.ja("BatchGetDocuments", s, i), o = new Map;
            r.forEach(t => {
                const e = Ae(n.serializer, t);
                o.set(e.key.toString(), e);
            });
            const h = [];
            return e.forEach(t => {
                const e = o.get(t.toString());
                g(!!e), h.push(e);
            }), h;
        }(this.nc, t);
        return e.forEach(t => {
            t instanceof Rn || t instanceof An ? this.kf(t) : V();
        }), e;
    }
    set(t, e) {
        this.write(e.mf(t, this.Ue(t))), this.Cf.add(t);
    }
    update(t, e) {
        try {
            this.write(e.mf(t, this.xf(t)));
        } catch (t) {
            this.Df = t;
        }
        this.Cf.add(t);
    }
    delete(t) {
        this.write([ new dn(t, this.Ue(t)) ]), this.Cf.add(t);
    }
    async commit() {
        if (this.Ff(), this.Df) throw this.Df;
        const t = this.vf;
        // For each mutation, note that the doc was written.
                this.mutations.forEach(e => {
            t.delete(e.key.toString());
        }), 
        // For each document that was read but not written to, we want to perform
        // a `verify` operation.
        t.forEach((t, e) => {
            const n = new j(U.k(e));
            this.mutations.push(new wn(n, this.Ue(n)));
        }), await async function(t, e) {
            const n = y(t), s = Ee(n.serializer) + "/documents", i = {
                writes: e.map(t => Pe(n.serializer, t))
            };
            await n.Qa("Commit", s, i);
        }(this.nc, this.mutations), this.Sf = !0;
    }
    kf(t) {
        let e;
        if (t instanceof An) e = t.version; else {
            if (!(t instanceof Rn)) throw V();
            // For deleted docs, we must use baseVersion 0 when we overwrite them.
            e = q.min();
        }
        const n = this.vf.get(t.key.toString());
        if (n) {
            if (!e.isEqual(n)) 
            // This transaction will fail no matter what.
            throw new O(M.ABORTED, "Document version changed between two reads.");
        } else this.vf.set(t.key.toString(), e);
    }
    /**
     * Returns the version of this document when it was read in this transaction,
     * as a precondition, or no precondition if it was not read.
     */    Ue(t) {
        const e = this.vf.get(t.toString());
        return !this.Cf.has(t) && e ? Ze.updateTime(e) : Ze.We();
    }
    /**
     * Returns the precondition for a document if the operation is an update.
     */    xf(t) {
        const e = this.vf.get(t.toString());
        // The first time a document is written, we want to take into account the
        // read time and existence
                if (!this.Cf.has(t) && e) {
            if (e.isEqual(q.min())) 
            // The document doesn't exist, so fail the transaction.
            // This has to be validated locally because you can't send a
            // precondition that a document does not exist without changing the
            // semantics of the backend write to be an insert. This is the reverse
            // of what we want, since we want to assert that the document doesn't
            // exist but then send the update and have it fail. Since we can't
            // express that to the backend, we have to validate locally.
            // Note: this can change once we can send separate verify writes in the
            // transaction.
            throw new O(M.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
            // Document exists, base precondition on document update time.
                        return Ze.updateTime(e);
        }
        // Document was not read, so we just use the preconditions for a blind
        // update.
        return Ze.exists(!0);
    }
    write(t) {
        this.Ff(), this.mutations = this.mutations.concat(t);
    }
    Ff() {}
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
class Ho {
    constructor(t, e, n, s) {
        this.ti = t, this.nc = e, this.updateFunction = n, this.si = s, this.$f = 5, this.wi = new ls(this.ti, "transaction_retry" /* TransactionRetry */);
    }
    /** Runs the transaction and sets the result on deferred. */    Mf() {
        this.Of();
    }
    Of() {
        this.wi.ps(async () => {
            const t = new zo(this.nc), e = this.Lf(t);
            e && e.then(e => {
                this.ti.hi(() => t.commit().then(() => {
                    this.si.resolve(e);
                }).catch(t => {
                    this.qf(t);
                }));
            }).catch(t => {
                this.qf(t);
            });
        });
    }
    Lf(t) {
        try {
            const e = this.updateFunction(t);
            return !K(e) && e.catch && e.then ? e : (this.si.reject(Error("Transaction callback must return a Promise")), 
            null);
        } catch (t) {
            // Do not retry errors thrown by user provided updateFunction.
            return this.si.reject(t), null;
        }
    }
    qf(t) {
        this.$f > 0 && this.Bf(t) ? (this.$f -= 1, this.ti.hi(() => (this.Of(), Promise.resolve()))) : this.si.reject(t);
    }
    Bf(t) {
        if ("FirebaseError" === t.name) {
            // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
            // non-matching document versions with ABORTED. These errors should be retried.
            const e = t.code;
            return "aborted" === e || "failed-precondition" === e || !ht(e);
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
class Yo {
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
        this.credentials = t, this.ti = e, this.clientId = b.t(), 
        // We defer our initialization until we get the current user from
        // setChangeListener(). We block the async queue until we got the initial
        // user and the initialization is completed. This will prevent any scheduled
        // work from happening before initialization is completed.
        // If initializationDone resolved then the FirestoreClient is in a usable
        // state.
        this.Uf = new us;
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
        this.Wf(), this.b_ = t;
        // If usePersistence is true, certain classes of errors while starting are
        // recoverable but only by falling back to persistence disabled.
        // If there's an error in the first case but not in recovery we cannot
        // reject the promise blocking the async queue because this will cause the
        // async queue to panic.
        const i = new us;
        let r = !1;
        // Return only the result of enabling persistence. Note that this does not
        // need to await the completion of initializationDone because the result of
        // this method should not reflect any other kind of failure to start.
        return this.credentials.sa(t => {
            if (!r) return r = !0, m("FirestoreClient", "Initializing. user=", t.uid), this.Qf(e, n, s, t, i).then(this.Uf.resolve, this.Uf.reject);
            this.ti.Pi(() => this.el.Wc(t));
        }), 
        // Block the async queue until initialization is done
        this.ti.hi(() => this.Uf.promise), i.promise;
    }
    /** Enables the network connection and requeues all pending operations. */    enableNetwork() {
        return this.Wf(), this.ti.enqueue(() => (this.persistence.Bo(!0), this.el.enableNetwork()));
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
     */    async Qf(t, e, n, s, i) {
        try {
            const r = {
                ti: this.ti,
                b_: this.b_,
                clientId: this.clientId,
                credentials: this.credentials,
                j_: s,
                sl: 100,
                G_: n
            };
            await t.initialize(r), await e.initialize(t, r), this.persistence = t.persistence, 
            this.nl = t.nl, this.ec = t.ec, this.U_ = t.U_, this.nc = e.nc, this.el = e.el, 
            this.Sc = e.Sc, this.jf = e.X_, 
            // When a user calls clearPersistence() in one client, all other clients
            // need to be terminated to allow the delete to succeed.
            this.persistence.qo(async () => {
                await this.terminate();
            }), i.resolve();
        } catch (t) {
            // An unknown failure on the first stage shuts everything down.
            if (
            // Regardless of whether or not the retry succeeds, from an user
            // perspective, offline persistence has failed.
            i.reject(t), !this.Kf(t)) throw t;
            return console.warn("Error enabling offline persistence. Falling back to persistence disabled: " + t), 
            this.Qf(new Br, new Qr, {
                K_: !1
            }, s, i);
        }
    }
    /**
     * Decides whether the provided error allows us to gracefully disable
     * persistence (as opposed to crashing the client).
     */    Kf(t) {
        return "FirebaseError" === t.name ? t.code === M.FAILED_PRECONDITION || t.code === M.UNIMPLEMENTED : !("undefined" != typeof DOMException && t instanceof DOMException) || (
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
     */    Wf() {
        if (this.ti.Ei) throw new O(M.FAILED_PRECONDITION, "The client has already been terminated.");
    }
    /** Disables the network connection. Pending operations will not complete. */    disableNetwork() {
        return this.Wf(), this.ti.enqueue(() => (this.persistence.Bo(!1), this.el.disableNetwork()));
    }
    terminate() {
        this.ti.Ri();
        const t = new us;
        return this.ti.Ii(async () => {
            try {
                // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
                this.U_ && this.U_.stop(), await this.el.Zo(), await this.nl.Zo(), await this.persistence.Zo(), 
                // `removeChangeListener` must be called after shutting down the
                // RemoteStore as it will prevent the RemoteStore from retrieving
                // auth tokens.
                this.credentials.ia(), t.resolve();
            } catch (e) {
                const n = ys(e, "Failed to shutdown persistence");
                t.reject(n);
            }
        }), t.promise;
    }
    /**
     * Returns a Promise that resolves when all writes that were pending at the time this
     * method was called received server acknowledgement. An acknowledgement can be either acceptance
     * or rejection.
     */    waitForPendingWrites() {
        this.Wf();
        const t = new us;
        return this.ti.hi(() => this.Sc.pl(t)), t.promise;
    }
    listen(t, e, n) {
        this.Wf();
        const s = new Kr(n), i = new pr(t, s, e);
        return this.ti.hi(() => this.jf.listen(i)), () => {
            s.ef(), this.ti.hi(() => this.jf.bc(i));
        };
    }
    async Gf(t) {
        return this.Wf(), await this.Uf.promise, async function(t, e, n) {
            const s = new us;
            return await t.enqueue(async () => {
                try {
                    const t = await e.xh(n);
                    t instanceof An ? s.resolve(t) : t instanceof Rn ? s.resolve(null) : s.reject(new O(M.UNAVAILABLE, "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"));
                } catch (t) {
                    const e = ys(t, `Failed to get document '${n} from cache`);
                    s.reject(e);
                }
            }), s.promise;
        }
        /**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */ (this.ti, this.ec, t);
    }
    async zf(t, e) {
        return this.Wf(), await this.Uf.promise, function(t, e, n, s) {
            const i = new us, r = Jo(t, e, pn(n.path), {
                includeMetadataChanges: !0,
                Gl: !0
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
                    i.reject(new O(M.UNAVAILABLE, "Failed to get document because the client is offline.")) : e && t.fromCache && s && "server" === s.source ? i.reject(new O(M.UNAVAILABLE, 'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')) : i.resolve(t);
                },
                error: t => i.reject(t)
            });
            return i.promise;
        }(this.ti, this.jf, t, e);
    }
    async Hf(t) {
        return this.Wf(), await this.Uf.promise, async function(t, e, n) {
            const s = new us;
            return await t.enqueue(async () => {
                try {
                    const t = await e.Oh(n, 
                    /* usePreviousResults= */ !0), i = new _r(n, t.Lh), r = i.Wu(t.documents), o = i.Bn(r, 
                    /* updateLimboDocuments= */ !1);
                    s.resolve(o.snapshot);
                } catch (t) {
                    const e = ys(t, `Failed to execute query '${n} against cache`);
                    s.reject(e);
                }
            }), s.promise;
        }
        /**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */ (this.ti, this.ec, t);
    }
    async Yf(t, e) {
        return this.Wf(), await this.Uf.promise, function(t, e, n, s) {
            const i = new us, r = Jo(t, e, n, {
                includeMetadataChanges: !0,
                Gl: !0
            }, {
                next: t => {
                    // Remove query first before passing event to user to avoid
                    // user actions affecting the now stale query.
                    r(), t.fromCache && s && "server" === s.source ? i.reject(new O(M.UNAVAILABLE, 'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')) : i.resolve(t);
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
 */ (this.ti, this.jf, t, e);
    }
    write(t) {
        this.Wf();
        const e = new us;
        return this.ti.hi(() => this.Sc.write(t, e)), e.promise;
    }
    s() {
        return this.b_.s;
    }
    Ll(t) {
        this.Wf();
        const e = new Kr(t);
        return this.ti.hi(async () => this.jf.Ll(e)), () => {
            e.ef(), this.ti.hi(async () => this.jf.ql(e));
        };
    }
    get Jf() {
        // Technically, the asyncQueue is still running, but only accepting operations
        // related to termination or supposed to be run after termination. It is effectively
        // terminated to the eyes of users.
        return this.ti.Ei;
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
        this.Wf();
        const e = new us;
        return this.ti.hi(() => (new Ho(this.ti, this.nc, t, e).Mf(), Promise.resolve())), 
        e.promise;
    }
}

function Jo(t, e, n, s, i) {
    const r = new Kr(i), o = new pr(n, r, s);
    return t.hi(() => e.listen(o)), () => {
        r.ef(), t.hi(() => e.bc(o));
    };
}

class Xo {
    constructor(t, e, n, s) {
        this.s = t, this.timestampsInSnapshots = e, this.Xf = n, this.Zf = s;
    }
    td(t) {
        switch (Lt(t)) {
          case 0 /* NullValue */ :
            return null;

          case 1 /* BooleanValue */ :
            return t.booleanValue;

          case 2 /* NumberValue */ :
            return Gt(t.integerValue || t.doubleValue);

          case 3 /* TimestampValue */ :
            return this.ed(t.timestampValue);

          case 4 /* ServerTimestampValue */ :
            return this.nd(t);

          case 5 /* StringValue */ :
            return t.stringValue;

          case 6 /* BlobValue */ :
            return new wo(zt(t.bytesValue));

          case 7 /* RefValue */ :
            return this.sd(t.referenceValue);

          case 8 /* GeoPointValue */ :
            return this.rd(t.geoPointValue);

          case 9 /* ArrayValue */ :
            return this.od(t.arrayValue);

          case 10 /* ObjectValue */ :
            return this.hd(t.mapValue);

          default:
            throw V();
        }
    }
    hd(t) {
        const e = {};
        return k(t.fields || {}, (t, n) => {
            e[t] = this.td(n);
        }), e;
    }
    rd(t) {
        return new vo(Gt(t.latitude), Gt(t.longitude));
    }
    od(t) {
        return (t.values || []).map(t => this.td(t));
    }
    nd(t) {
        switch (this.Xf) {
          case "previous":
            const e = function t(e) {
                const n = e.mapValue.fields.__previous_value__;
                return $t(n) ? t(n) : n;
            }(t);
            return null == e ? null : this.td(e);

          case "estimate":
            return this.ed(Mt(t));

          default:
            return null;
        }
    }
    ed(t) {
        const e = Kt(t), n = new L(e.seconds, e.nanos);
        return this.timestampsInSnapshots ? n : n.toDate();
    }
    sd(t) {
        const e = U.k(t);
        g($e(e));
        const n = new N(e.get(1), e.get(3)), s = new j(e.g(5));
        return n.isEqual(this.s) || 
        // TODO(b/64130202): Somehow support foreign references.
        A(`Document ${s} contains a document reference within a different database (${n.projectId}/${n.database}) which is not supported. It will be treated as a reference in the current database (${this.s.projectId}/${this.s.database}) instead.`), 
        this.Zf(s);
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
const Zo = Ss.Qi;

/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied firestore.Settings object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
class th {
    constructor(t) {
        var e, n, s, i;
        if (void 0 === t.host) {
            if (void 0 !== t.ssl) throw new O(M.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
            this.host = "firestore.googleapis.com", this.ssl = !0;
        } else Zr("settings", "non-empty string", "host", t.host), this.host = t.host, to("settings", "boolean", "ssl", t.ssl), 
        this.ssl = null === (e = t.ssl) || void 0 === e || e;
        if (ao("settings", t, [ "host", "ssl", "credentials", "timestampsInSnapshots", "cacheSizeBytes", "experimentalForceLongPolling", "ignoreUndefinedProperties" ]), 
        to("settings", "object", "credentials", t.credentials), this.credentials = t.credentials, 
        to("settings", "boolean", "timestampsInSnapshots", t.timestampsInSnapshots), to("settings", "boolean", "ignoreUndefinedProperties", t.ignoreUndefinedProperties), 
        // Nobody should set timestampsInSnapshots anymore, but the error depends on
        // whether they set it to true or false...
        !0 === t.timestampsInSnapshots ? A("The setting 'timestampsInSnapshots: true' is no longer required and should be removed.") : !1 === t.timestampsInSnapshots && A("Support for 'timestampsInSnapshots: false' will be removed soon. You must update your code to handle Timestamp objects."), 
        this.timestampsInSnapshots = null === (n = t.timestampsInSnapshots) || void 0 === n || n, 
        this.ignoreUndefinedProperties = null !== (s = t.ignoreUndefinedProperties) && void 0 !== s && s, 
        to("settings", "number", "cacheSizeBytes", t.cacheSizeBytes), void 0 === t.cacheSizeBytes) this.cacheSizeBytes = Ss.Ki; else {
            if (t.cacheSizeBytes !== Zo && t.cacheSizeBytes < Ss.ji) throw new O(M.INVALID_ARGUMENT, "cacheSizeBytes must be at least " + Ss.ji);
            this.cacheSizeBytes = t.cacheSizeBytes;
        }
        to("settings", "boolean", "experimentalForceLongPolling", t.experimentalForceLongPolling), 
        this.forceLongPolling = null !== (i = t.experimentalForceLongPolling) && void 0 !== i && i;
    }
    isEqual(t) {
        return this.host === t.host && this.ssl === t.ssl && this.timestampsInSnapshots === t.timestampsInSnapshots && this.credentials === t.credentials && this.cacheSizeBytes === t.cacheSizeBytes && this.forceLongPolling === t.forceLongPolling && this.ignoreUndefinedProperties === t.ignoreUndefinedProperties;
    }
}

/**
 * The root reference to the database.
 */ class eh {
    // Note: We are using `MemoryComponentProvider` as a default
    // ComponentProvider to ensure backwards compatibility with the format
    // expected by the console build.
    constructor(t, e, n = new Br, s = new Qr) {
        if (this.ad = n, this.ud = s, this.ld = null, 
        // Public for use in tests.
        // TODO(mikelehen): Use modularized initialization instead.
        this._d = new gs, this.INTERNAL = {
            delete: async () => {
                // The client must be initalized to ensure that all subsequent API usage
                // throws an exception.
                this.fd(), await this.dd.terminate();
            }
        }, "object" == typeof t.options) {
            // This is very likely a Firebase app object
            // TODO(b/34177605): Can we somehow use instanceof?
            const n = t;
            this.ld = n, this.Tf = eh.wd(n), this.Td = n.name, this.Ed = new ji(e);
        } else {
            const e = t;
            if (!e.projectId) throw new O(M.INVALID_ARGUMENT, "Must provide projectId");
            this.Tf = new N(e.projectId, e.database), 
            // Use a default persistenceKey that lines up with FirebaseApp.
            this.Td = "[DEFAULT]", this.Ed = new Qi;
        }
        this.Id = new th({});
    }
    get md() {
        return this.Ad || (
        // Lazy initialize UserDataReader once the settings are frozen
        this.Ad = new xo(this.Tf, this.Id.ignoreUndefinedProperties)), this.Ad;
    }
    settings(t) {
        zr("Firestore.settings", arguments, 1), Jr("Firestore.settings", "object", 1, t);
        const e = new th(t);
        if (this.dd && !this.Id.isEqual(e)) throw new O(M.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. You can only call settings() before calling any other methods on a Firestore object.");
        this.Id = e, void 0 !== e.credentials && (this.Ed = function(t) {
            if (!t) return new Qi;
            switch (t.type) {
              case "gapi":
                const e = t.Rd;
                // Make sure this really is a Gapi client.
                                return g(!("object" != typeof e || null === e || !e.auth || !e.auth.getAuthHeaderValueForFirstParty)), 
                new Gi(e, t.ua || "0");

              case "provider":
                return t.Rd;

              default:
                throw new O(M.INVALID_ARGUMENT, "makeCredentialsProvider failed due to invalid credential type");
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
        return this.fd(), this.dd.enableNetwork();
    }
    disableNetwork() {
        return this.fd(), this.dd.disableNetwork();
    }
    enablePersistence(t) {
        var e, n;
        if (this.dd) throw new O(M.FAILED_PRECONDITION, "Firestore has already been started and persistence can no longer be enabled. You can only call enablePersistence() before calling any other methods on a Firestore object.");
        let s = !1, i = !1;
        if (t && (void 0 !== t.experimentalTabSynchronization && A("The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead."), 
        s = null !== (n = null !== (e = t.synchronizeTabs) && void 0 !== e ? e : t.experimentalTabSynchronization) && void 0 !== n && n, 
        i = !!t.experimentalForceOwningTab && t.experimentalForceOwningTab, s && i)) throw new O(M.INVALID_ARGUMENT, "The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'.");
        return this.Pd(this.ad, this.ud, {
            K_: !0,
            cacheSizeBytes: this.Id.cacheSizeBytes,
            synchronizeTabs: s,
            Po: i
        });
    }
    async clearPersistence() {
        if (void 0 !== this.dd && !this.dd.Jf) throw new O(M.FAILED_PRECONDITION, "Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");
        const t = new us;
        return this._d.Ii(async () => {
            try {
                await this.ad.clearPersistence(this.Tf, this.Td), t.resolve();
            } catch (e) {
                t.reject(e);
            }
        }), t.promise;
    }
    terminate() {
        return this.app._removeServiceInstance("firestore"), this.INTERNAL.delete();
    }
    get Vd() {
        return this.fd(), this.dd.Jf;
    }
    waitForPendingWrites() {
        return this.fd(), this.dd.waitForPendingWrites();
    }
    onSnapshotsInSync(t) {
        if (this.fd(), jr(t)) return this.dd.Ll(t);
        {
            Jr("Firestore.onSnapshotsInSync", "function", 1, t);
            const e = {
                next: t
            };
            return this.dd.Ll(e);
        }
    }
    fd() {
        return this.dd || 
        // Kick off starting the client but don't actually wait for it.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.Pd(new Br, new Qr, {
            K_: !1
        }), this.dd;
    }
    gd() {
        return new C(this.Tf, this.Td, this.Id.host, this.Id.ssl, this.Id.forceLongPolling);
    }
    Pd(t, e, n) {
        const s = this.gd();
        return this.dd = new Yo(this.Ed, this._d), this.dd.start(s, t, e, n);
    }
    static wd(t) {
        if (e = t.options, n = "projectId", !Object.prototype.hasOwnProperty.call(e, n)) throw new O(M.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
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
        if (!s || "string" != typeof s) throw new O(M.INVALID_ARGUMENT, "projectId must be a string in FirebaseApp.options");
        return new N(s);
    }
    get app() {
        if (!this.ld) throw new O(M.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is not available");
        return this.ld;
    }
    collection(t) {
        return zr("Firestore.collection", arguments, 1), Jr("Firestore.collection", "non-empty string", 1, t), 
        this.fd(), new Th(U.k(t), this, 
        /* converter= */ null);
    }
    doc(t) {
        return zr("Firestore.doc", arguments, 1), Jr("Firestore.doc", "non-empty string", 1, t), 
        this.fd(), ih.yd(U.k(t), this, 
        /* converter= */ null);
    }
    collectionGroup(t) {
        if (zr("Firestore.collectionGroup", arguments, 1), Jr("Firestore.collectionGroup", "non-empty string", 1, t), 
        t.indexOf("/") >= 0) throw new O(M.INVALID_ARGUMENT, `Invalid collection ID '${t}' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.`);
        return this.fd(), new dh(function(t) {
            return new gn(U.$(), t);
        }(t), this, 
        /* converter= */ null);
    }
    runTransaction(t) {
        return zr("Firestore.runTransaction", arguments, 1), Jr("Firestore.runTransaction", "function", 1, t), 
        this.fd().transaction(e => t(new nh(this, e)));
    }
    batch() {
        return this.fd(), new sh(this);
    }
    static get logLevel() {
        switch (I()) {
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
        zr("Firestore.setLogLevel", arguments, 1), so("setLogLevel", [ "debug", "error", "silent", "warn", "info", "verbose" ], 1, t), 
        e = t, E.setLogLevel(e);
    }
    // Note: this is not a property because the minifier can't work correctly with
    // the way TypeScript compiler outputs properties.
    pd() {
        return this.Id.timestampsInSnapshots;
    }
}

/**
 * A reference to a transaction.
 */ class nh {
    constructor(t, e) {
        this.bd = t, this.vd = e;
    }
    get(t) {
        zr("Transaction.get", arguments, 1);
        const e = Ah("Transaction.get", t, this.bd);
        return this.vd.Nf([ e.Ef ]).then(t => {
            if (!t || 1 !== t.length) return V();
            const n = t[0];
            if (n instanceof Rn) return new oh(this.bd, e.Ef, null, 
            /* fromCache= */ !1, 
            /* hasPendingWrites= */ !1, e.If);
            if (n instanceof An) return new oh(this.bd, e.Ef, n, 
            /* fromCache= */ !1, 
            /* hasPendingWrites= */ !1, e.If);
            throw V();
        });
    }
    set(t, e, n) {
        Yr("Transaction.set", arguments, 2, 3);
        const s = Ah("Transaction.set", t, this.bd);
        n = Eh("Transaction.set", n);
        const i = Ph(s.If, e, n), r = $o(this.bd.md, "Transaction.set", s.Ef, i, null !== s.If, n);
        return this.vd.set(s.Ef, r), this;
    }
    update(t, e, n, ...s) {
        let i, r;
        return "string" == typeof e || e instanceof Eo ? (Hr("Transaction.update", arguments, 3), 
        i = Ah("Transaction.update", t, this.bd), r = Oo(this.bd.md, "Transaction.update", i.Ef, e, n, s)) : (zr("Transaction.update", arguments, 2), 
        i = Ah("Transaction.update", t, this.bd), r = Mo(this.bd.md, "Transaction.update", i.Ef, e)), 
        this.vd.update(i.Ef, r), this;
    }
    delete(t) {
        zr("Transaction.delete", arguments, 1);
        const e = Ah("Transaction.delete", t, this.bd);
        return this.vd.delete(e.Ef), this;
    }
}

class sh {
    constructor(t) {
        this.bd = t, this.Sd = [], this.Dd = !1;
    }
    set(t, e, n) {
        Yr("WriteBatch.set", arguments, 2, 3), this.Cd();
        const s = Ah("WriteBatch.set", t, this.bd);
        n = Eh("WriteBatch.set", n);
        const i = Ph(s.If, e, n), r = $o(this.bd.md, "WriteBatch.set", s.Ef, i, null !== s.If, n);
        return this.Sd = this.Sd.concat(r.mf(s.Ef, Ze.We())), this;
    }
    update(t, e, n, ...s) {
        let i, r;
        return this.Cd(), "string" == typeof e || e instanceof Eo ? (Hr("WriteBatch.update", arguments, 3), 
        i = Ah("WriteBatch.update", t, this.bd), r = Oo(this.bd.md, "WriteBatch.update", i.Ef, e, n, s)) : (zr("WriteBatch.update", arguments, 2), 
        i = Ah("WriteBatch.update", t, this.bd), r = Mo(this.bd.md, "WriteBatch.update", i.Ef, e)), 
        this.Sd = this.Sd.concat(r.mf(i.Ef, Ze.exists(!0))), this;
    }
    delete(t) {
        zr("WriteBatch.delete", arguments, 1), this.Cd();
        const e = Ah("WriteBatch.delete", t, this.bd);
        return this.Sd = this.Sd.concat(new dn(e.Ef, Ze.We())), this;
    }
    commit() {
        return this.Cd(), this.Dd = !0, this.Sd.length > 0 ? this.bd.fd().write(this.Sd) : Promise.resolve();
    }
    Cd() {
        if (this.Dd) throw new O(M.FAILED_PRECONDITION, "A write batch can no longer be used after commit() has been called.");
    }
}

/**
 * A reference to a particular document in a collection in the database.
 */ class ih extends Do {
    constructor(t, e, n) {
        super(e.Tf, t, n), this.Ef = t, this.firestore = e, this.If = n, this.dd = this.firestore.fd();
    }
    static yd(t, e, n) {
        if (t.length % 2 != 0) throw new O(M.INVALID_ARGUMENT, `Invalid document reference. Document references must have an even number of segments, but ${t.F()} has ${t.length}`);
        return new ih(new j(t), e, n);
    }
    get id() {
        return this.Ef.path.S();
    }
    get parent() {
        return new Th(this.Ef.path.p(), this.firestore, this.If);
    }
    get path() {
        return this.Ef.path.F();
    }
    collection(t) {
        if (zr("DocumentReference.collection", arguments, 1), Jr("DocumentReference.collection", "non-empty string", 1, t), 
        !t) throw new O(M.INVALID_ARGUMENT, "Must provide a non-empty collection name to collection()");
        const e = U.k(t);
        return new Th(this.Ef.path.child(e), this.firestore, 
        /* converter= */ null);
    }
    isEqual(t) {
        if (!(t instanceof ih)) throw co("isEqual", "DocumentReference", 1, t);
        return this.firestore === t.firestore && this.Ef.isEqual(t.Ef) && this.If === t.If;
    }
    set(t, e) {
        Yr("DocumentReference.set", arguments, 1, 2), e = Eh("DocumentReference.set", e);
        const n = Ph(this.If, t, e), s = $o(this.firestore.md, "DocumentReference.set", this.Ef, n, null !== this.If, e);
        return this.dd.write(s.mf(this.Ef, Ze.We()));
    }
    update(t, e, ...n) {
        let s;
        return "string" == typeof t || t instanceof Eo ? (Hr("DocumentReference.update", arguments, 2), 
        s = Oo(this.firestore.md, "DocumentReference.update", this.Ef, t, e, n)) : (zr("DocumentReference.update", arguments, 1), 
        s = Mo(this.firestore.md, "DocumentReference.update", this.Ef, t)), this.dd.write(s.mf(this.Ef, Ze.exists(!0)));
    }
    delete() {
        return zr("DocumentReference.delete", arguments, 0), this.dd.write([ new dn(this.Ef, Ze.We()) ]);
    }
    onSnapshot(...t) {
        var e, n, s;
        Yr("DocumentReference.onSnapshot", arguments, 1, 4);
        let i = {
            includeMetadataChanges: !1
        }, r = 0;
        "object" != typeof t[r] || jr(t[r]) || (i = t[r], ao("DocumentReference.onSnapshot", i, [ "includeMetadataChanges" ]), 
        to("DocumentReference.onSnapshot", "boolean", "includeMetadataChanges", i.includeMetadataChanges), 
        r++);
        const o = {
            includeMetadataChanges: i.includeMetadataChanges
        };
        if (jr(t[r])) {
            const i = t[r];
            t[r] = null === (e = i.next) || void 0 === e ? void 0 : e.bind(i), t[r + 1] = null === (n = i.error) || void 0 === n ? void 0 : n.bind(i), 
            t[r + 2] = null === (s = i.complete) || void 0 === s ? void 0 : s.bind(i);
        } else Jr("DocumentReference.onSnapshot", "function", r, t[r]), Xr("DocumentReference.onSnapshot", "function", r + 1, t[r + 1]), 
        Xr("DocumentReference.onSnapshot", "function", r + 2, t[r + 2]);
        const h = {
            next: e => {
                t[r] && t[r](this.Nd(e));
            },
            error: t[r + 1],
            complete: t[r + 2]
        };
        return this.dd.listen(pn(this.Ef.path), o, h);
    }
    get(t) {
        Yr("DocumentReference.get", arguments, 0, 1), mh("DocumentReference.get", t);
        const e = this.firestore.fd();
        return t && "cache" === t.source ? e.Gf(this.Ef).then(t => new oh(this.firestore, this.Ef, t, 
        /*fromCache=*/ !0, t instanceof An && t.Ke, this.If)) : e.zf(this.Ef, t).then(t => this.Nd(t));
    }
    withConverter(t) {
        return new ih(this.Ef, this.firestore, t);
    }
    /**
     * Converts a ViewSnapshot that contains the current document to a
     * DocumentSnapshot.
     */    Nd(t) {
        const e = t.docs.get(this.Ef);
        return new oh(this.firestore, this.Ef, e, t.fromCache, t.hasPendingWrites, this.If);
    }
}

class rh {
    constructor(t, e) {
        this.hasPendingWrites = t, this.fromCache = e;
    }
    isEqual(t) {
        return this.hasPendingWrites === t.hasPendingWrites && this.fromCache === t.fromCache;
    }
}

class oh {
    constructor(t, e, n, s, i, r) {
        this.bd = t, this.Ef = e, this.Fd = n, this.kd = s, this.xd = i, this.If = r;
    }
    data(t) {
        if (Yr("DocumentSnapshot.data", arguments, 0, 1), t = Ih("DocumentSnapshot.data", t), 
        this.Fd) {
            // We only want to use the converter and create a new DocumentSnapshot
            // if a converter has been provided.
            if (this.If) {
                const e = new hh(this.bd, this.Ef, this.Fd, this.kd, this.xd, 
                /* converter= */ null);
                return this.If.fromFirestore(e, t);
            }
            return new Xo(this.bd.Tf, this.bd.pd(), t.serverTimestamps || "none", t => new ih(t, this.bd, /* converter= */ null)).td(this.Fd.Ze());
        }
    }
    get(t, e) {
        if (Yr("DocumentSnapshot.get", arguments, 1, 2), e = Ih("DocumentSnapshot.get", e), 
        this.Fd) {
            const n = this.Fd.data().field(Qo("DocumentSnapshot.get", t, this.Ef));
            if (null !== n) {
                return new Xo(this.bd.Tf, this.bd.pd(), e.serverTimestamps || "none", t => new ih(t, this.bd, this.If)).td(n);
            }
        }
    }
    get id() {
        return this.Ef.path.S();
    }
    get ref() {
        return new ih(this.Ef, this.bd, this.If);
    }
    get exists() {
        return null !== this.Fd;
    }
    get metadata() {
        return new rh(this.xd, this.kd);
    }
    isEqual(t) {
        if (!(t instanceof oh)) throw co("isEqual", "DocumentSnapshot", 1, t);
        return this.bd === t.bd && this.kd === t.kd && this.Ef.isEqual(t.Ef) && (null === this.Fd ? null === t.Fd : this.Fd.isEqual(t.Fd)) && this.If === t.If;
    }
}

class hh extends oh {
    data(t) {
        return super.data(t);
    }
}

function ah(t, e, n, s, i, r, o) {
    let h;
    if (i.O()) {
        if ("array-contains" /* ARRAY_CONTAINS */ === r || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === r) throw new O(M.INVALID_ARGUMENT, `Invalid Query. You can't perform '${r}' queries on FieldPath.documentId().`);
        if ("in" /* IN */ === r || "not-in" /* NOT_IN */ === r) {
            lh(o, r);
            const e = [];
            for (const n of o) e.push(uh(s, t, n));
            h = {
                arrayValue: {
                    values: e
                }
            };
        } else h = uh(s, t, o);
    } else "in" /* IN */ !== r && "not-in" /* NOT_IN */ !== r && "array-contains-any" /* ARRAY_CONTAINS_ANY */ !== r || lh(o, r), 
    h = Lo(n, e, o, 
    /* allowArrays= */ "in" /* IN */ === r || "not-in" /* NOT_IN */ === r);
    const a = On.create(i, r, h);
    return function(t, e) {
        if (e.ln()) {
            const n = t.un();
            if (null !== n && !n.isEqual(e.field)) throw new O(M.INVALID_ARGUMENT, `Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '${n.toString()}' and '${e.field.toString()}'`);
            const s = t.cn();
            null !== s && _h(t, e.field, s);
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
        throw n === e.op ? new O(M.INVALID_ARGUMENT, `Invalid query. You cannot use more than one '${e.op.toString()}' filter.`) : new O(M.INVALID_ARGUMENT, `Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`);
    }(t, a), a;
}

function ch(t, e, n) {
    if (null !== t.startAt) throw new O(M.INVALID_ARGUMENT, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
    if (null !== t.endAt) throw new O(M.INVALID_ARGUMENT, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
    const s = new Xn(e, n);
    return function(t, e) {
        if (null === t.cn()) {
            // This is the first order by. It must match any inequality.
            const n = t.un();
            null !== n && _h(t, n, e.field);
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
function uh(t, e, n) {
    if ("string" == typeof n) {
        if ("" === n) throw new O(M.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");
        if (!bn(e) && -1 !== n.indexOf("/")) throw new O(M.INVALID_ARGUMENT, `Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);
        const s = e.path.child(U.k(n));
        if (!j.W(s)) throw new O(M.INVALID_ARGUMENT, `Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '${s}' is not because it has an odd number of segments (${s.length}).`);
        return Ht(t, new j(s));
    }
    if (n instanceof Do) return Ht(t, n.Ef);
    throw new O(M.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: " + oo(n) + ".");
}

/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */ function lh(t, e) {
    if (!Array.isArray(t) || 0 === t.length) throw new O(M.INVALID_ARGUMENT, `Invalid Query. A non-empty array is required for '${e.toString()}' filters.`);
    if (t.length > 10) throw new O(M.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters support a maximum of 10 elements in the value array.`);
    if ("in" /* IN */ === e || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e) {
        if (t.indexOf(null) >= 0) throw new O(M.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters cannot contain 'null' in the value array.`);
        if (t.filter(t => Number.isNaN(t)).length > 0) throw new O(M.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters cannot contain 'NaN' in the value array.`);
    }
}

function _h(t, e, n) {
    if (!n.isEqual(e)) throw new O(M.INVALID_ARGUMENT, `Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '${e.toString()}' and so you must also use '${e.toString()}' as your first orderBy(), but your first orderBy() is on field '${n.toString()}' instead.`);
}

function fh(t) {
    if (t.an() && 0 === t.tn.length) throw new O(M.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
}

class dh {
    constructor(t, e, n) {
        this.$d = t, this.firestore = e, this.If = n;
    }
    where(t, e, n) {
        // TODO(ne-queries): Add 'not-in' and '!=' to validation.
        let s;
        if (zr("Query.where", arguments, 3), ho("Query.where", 3, n), "not-in" === e || "!=" === e) s = e; else {
            s = so("Query.where", [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , "==" /* EQUAL */ , ">=" /* GREATER_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , "array-contains" /* ARRAY_CONTAINS */ , "in" /* IN */ , "array-contains-any" /* ARRAY_CONTAINS_ANY */ ], 2, e);
        }
        const i = Qo("Query.where", t), r = ah(this.$d, "Query.where", this.firestore.md, this.firestore.Tf, i, s, n);
        return new dh(function(t, e) {
            const n = t.filters.concat([ e ]);
            return new gn(t.path, t.collectionGroup, t.tn.slice(), n, t.limit, t.en, t.startAt, t.endAt);
        }(this.$d, r), this.firestore, this.If);
    }
    orderBy(t, e) {
        let n;
        if (Yr("Query.orderBy", arguments, 1, 2), Xr("Query.orderBy", "non-empty string", 2, e), 
        void 0 === e || "asc" === e) n = "asc" /* ASCENDING */; else {
            if ("desc" !== e) throw new O(M.INVALID_ARGUMENT, `Function Query.orderBy() has unknown direction '${e}', expected 'asc' or 'desc'.`);
            n = "desc" /* DESCENDING */;
        }
        const s = Qo("Query.orderBy", t), i = ch(this.$d, s, n);
        return new dh(function(t, e) {
            // TODO(dimond): validate that orderBy does not list the same key twice.
            const n = t.tn.concat([ e ]);
            return new gn(t.path, t.collectionGroup, n, t.filters.slice(), t.limit, t.en, t.startAt, t.endAt);
        }(this.$d, i), this.firestore, this.If);
    }
    limit(t) {
        return zr("Query.limit", arguments, 1), Jr("Query.limit", "number", 1, t), uo("Query.limit", 1, t), 
        new dh(Dn(this.$d, t, "F" /* First */), this.firestore, this.If);
    }
    limitToLast(t) {
        return zr("Query.limitToLast", arguments, 1), Jr("Query.limitToLast", "number", 1, t), 
        uo("Query.limitToLast", 1, t), new dh(Dn(this.$d, t, "L" /* Last */), this.firestore, this.If);
    }
    startAt(t, ...e) {
        Hr("Query.startAt", arguments, 1);
        const n = this.Md("Query.startAt", t, e, 
        /*before=*/ !0);
        return new dh(Cn(this.$d, n), this.firestore, this.If);
    }
    startAfter(t, ...e) {
        Hr("Query.startAfter", arguments, 1);
        const n = this.Md("Query.startAfter", t, e, 
        /*before=*/ !1);
        return new dh(Cn(this.$d, n), this.firestore, this.If);
    }
    endBefore(t, ...e) {
        Hr("Query.endBefore", arguments, 1);
        const n = this.Md("Query.endBefore", t, e, 
        /*before=*/ !0);
        return new dh(Nn(this.$d, n), this.firestore, this.If);
    }
    endAt(t, ...e) {
        Hr("Query.endAt", arguments, 1);
        const n = this.Md("Query.endAt", t, e, 
        /*before=*/ !1);
        return new dh(Nn(this.$d, n), this.firestore, this.If);
    }
    isEqual(t) {
        if (!(t instanceof dh)) throw co("isEqual", "Query", 1, t);
        return this.firestore === t.firestore && Fn(this.$d, t.$d) && this.If === t.If;
    }
    withConverter(t) {
        return new dh(this.$d, this.firestore, t);
    }
    /** Helper function to create a bound from a document or fields */    Md(t, e, n, s) {
        if (ho(t, 1, e), e instanceof oh) return zr(t, [ e, ...n ], 1), function(t, e, n, s, i) {
            if (!s) throw new O(M.NOT_FOUND, "Can't use a DocumentSnapshot that doesn't exist for " + n + "().");
            const r = [];
            // Because people expect to continue/end a query at the exact document
            // provided, we need to use the implicit sort order rather than the explicit
            // sort order, because it's guaranteed to contain the document key. That way
            // the position becomes unambiguous and the query continues/ends exactly at
            // the provided document. Without the key (by using the explicit sort
            // orders), multiple documents could match the position, yielding duplicate
            // results.
                        for (const n of vn(t)) if (n.field.O()) r.push(Ht(e, s.key)); else {
                const t = s.field(n.field);
                if ($t(t)) throw new O(M.INVALID_ARGUMENT, 'Invalid query. You are trying to start or end a query using a document for which the field "' + n.field + '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');
                if (null === t) {
                    const t = n.field.F();
                    throw new O(M.INVALID_ARGUMENT, `Invalid query. You are trying to start or end a query using a document for which the field '${t}' (used as the orderBy) does not exist.`);
                }
                r.push(t);
            }
            return new zn(r, i);
        }
        /**
 * Converts a list of field values to a Bound for the given query.
 */ (this.$d, this.firestore.Tf, t, e.Fd, s);
        {
            const i = [ e ].concat(n);
            return function(t, e, n, s, i, r) {
                // Use explicit order by's because it has to match the query the user made
                const o = t.tn;
                if (i.length > o.length) throw new O(M.INVALID_ARGUMENT, `Too many arguments provided to ${s}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);
                const h = [];
                for (let r = 0; r < i.length; r++) {
                    const a = i[r];
                    if (o[r].field.O()) {
                        if ("string" != typeof a) throw new O(M.INVALID_ARGUMENT, `Invalid query. Expected a string for document ID in ${s}(), but got a ${typeof a}`);
                        if (!bn(t) && -1 !== a.indexOf("/")) throw new O(M.INVALID_ARGUMENT, `Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to ${s}() must be a plain document ID, but '${a}' contains a slash.`);
                        const n = t.path.child(U.k(a));
                        if (!j.W(n)) throw new O(M.INVALID_ARGUMENT, `Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to ${s}() must result in a valid document path, but '${n}' is not because it contains an odd number of segments.`);
                        const i = new j(n);
                        h.push(Ht(e, i));
                    } else {
                        const t = Lo(n, s, a);
                        h.push(t);
                    }
                }
                return new zn(h, r);
            }(this.$d, this.firestore.Tf, this.firestore.md, t, i, s);
        }
    }
    onSnapshot(...t) {
        var e, n, s;
        Yr("Query.onSnapshot", arguments, 1, 4);
        let i = {}, r = 0;
        if ("object" != typeof t[r] || jr(t[r]) || (i = t[r], ao("Query.onSnapshot", i, [ "includeMetadataChanges" ]), 
        to("Query.onSnapshot", "boolean", "includeMetadataChanges", i.includeMetadataChanges), 
        r++), jr(t[r])) {
            const i = t[r];
            t[r] = null === (e = i.next) || void 0 === e ? void 0 : e.bind(i), t[r + 1] = null === (n = i.error) || void 0 === n ? void 0 : n.bind(i), 
            t[r + 2] = null === (s = i.complete) || void 0 === s ? void 0 : s.bind(i);
        } else Jr("Query.onSnapshot", "function", r, t[r]), Xr("Query.onSnapshot", "function", r + 1, t[r + 1]), 
        Xr("Query.onSnapshot", "function", r + 2, t[r + 2]);
        const o = {
            next: e => {
                t[r] && t[r](new wh(this.firestore, this.$d, e, this.If));
            },
            error: t[r + 1],
            complete: t[r + 2]
        };
        fh(this.$d);
        return this.firestore.fd().listen(this.$d, i, o);
    }
    get(t) {
        Yr("Query.get", arguments, 0, 1), mh("Query.get", t), fh(this.$d);
        const e = this.firestore.fd();
        return (t && "cache" === t.source ? e.Hf(this.$d) : e.Yf(this.$d, t)).then(t => new wh(this.firestore, this.$d, t, this.If));
    }
}

class wh {
    constructor(t, e, n, s) {
        this.bd = t, this.Od = e, this.Ld = n, this.If = s, this.qd = null, this.Bd = null, 
        this.metadata = new rh(n.hasPendingWrites, n.fromCache);
    }
    get docs() {
        const t = [];
        return this.forEach(e => t.push(e)), t;
    }
    get empty() {
        return this.Ld.docs._();
    }
    get size() {
        return this.Ld.docs.size;
    }
    forEach(t, e) {
        Yr("QuerySnapshot.forEach", arguments, 1, 2), Jr("QuerySnapshot.forEach", "function", 1, t), 
        this.Ld.docs.forEach(n => {
            t.call(e, this.Ud(n, this.metadata.fromCache, this.Ld.Lt.has(n.key)));
        });
    }
    get query() {
        return new dh(this.Od, this.bd, this.If);
    }
    docChanges(t) {
        t && (ao("QuerySnapshot.docChanges", t, [ "includeMetadataChanges" ]), to("QuerySnapshot.docChanges", "boolean", "includeMetadataChanges", t.includeMetadataChanges));
        const e = !(!t || !t.includeMetadataChanges);
        if (e && this.Ld.Bt) throw new O(M.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
        return this.qd && this.Bd === e || (this.qd = 
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
                    const r = n(i.doc, t.fromCache, t.Lt.has(i.doc.key));
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
                    const i = n(e.doc, t.fromCache, t.Lt.has(e.doc.key));
                    let r = -1, o = -1;
                    return 0 /* Added */ !== e.type && (r = s.indexOf(e.doc.key), s = s.delete(e.doc.key)), 
                    1 /* Removed */ !== e.type && (s = s.add(e.doc), o = s.indexOf(e.doc.key)), {
                        type: Rh(e.type),
                        doc: i,
                        oldIndex: r,
                        newIndex: o
                    };
                });
            }
        }(this.Ld, e, this.Ud.bind(this)), this.Bd = e), this.qd;
    }
    /** Check the equality. The call can be very expensive. */    isEqual(t) {
        if (!(t instanceof wh)) throw co("isEqual", "QuerySnapshot", 1, t);
        return this.bd === t.bd && Fn(this.Od, t.Od) && this.Ld.isEqual(t.Ld) && this.If === t.If;
    }
    Ud(t, e, n) {
        return new hh(this.bd, t.key, t, e, n, this.If);
    }
}

class Th extends dh {
    constructor(t, e, n) {
        if (super(pn(t), e, n), this.Wd = t, t.length % 2 != 1) throw new O(M.INVALID_ARGUMENT, `Invalid collection reference. Collection references must have an odd number of segments, but ${t.F()} has ${t.length}`);
    }
    get id() {
        return this.$d.path.S();
    }
    get parent() {
        const t = this.$d.path.p();
        return t._() ? null : new ih(new j(t), this.firestore, 
        /* converter= */ null);
    }
    get path() {
        return this.$d.path.F();
    }
    doc(t) {
        Yr("CollectionReference.doc", arguments, 0, 1), 
        // We allow omission of 'pathString' but explicitly prohibit passing in both
        // 'undefined' and 'null'.
        0 === arguments.length && (t = b.t()), Jr("CollectionReference.doc", "non-empty string", 1, t);
        const e = U.k(t);
        return ih.yd(this.$d.path.child(e), this.firestore, this.If);
    }
    add(t) {
        zr("CollectionReference.add", arguments, 1);
        Jr("CollectionReference.add", "object", 1, this.If ? this.If.toFirestore(t) : t);
        const e = this.doc();
        return e.set(t).then(() => e);
    }
    withConverter(t) {
        return new Th(this.Wd, this.firestore, t);
    }
}

function Eh(t, e) {
    if (void 0 === e) return {
        merge: !1
    };
    if (ao(t, e, [ "merge", "mergeFields" ]), to(t, "boolean", "merge", e.merge), eo(t, "mergeFields", "a string or a FieldPath", e.mergeFields, t => "string" == typeof t || t instanceof Eo), 
    void 0 !== e.mergeFields && void 0 !== e.merge) throw new O(M.INVALID_ARGUMENT, `Invalid options passed to function ${t}(): You cannot specify both "merge" and "mergeFields".`);
    return e;
}

function Ih(t, e) {
    return void 0 === e ? {} : (ao(t, e, [ "serverTimestamps" ]), no(t, 0, "serverTimestamps", e.serverTimestamps, [ "estimate", "previous", "none" ]), 
    e);
}

function mh(t, e) {
    Xr(t, "object", 1, e), e && (ao(t, e, [ "source" ]), no(t, 0, "source", e.source, [ "default", "server", "cache" ]));
}

function Ah(t, e, n) {
    if (e instanceof Do) {
        if (e.firestore !== n) throw new O(M.INVALID_ARGUMENT, "Provided document reference is from a different Firestore instance.");
        return e;
    }
    throw co(t, "DocumentReference", 1, e);
}

function Rh(t) {
    switch (t) {
      case 0 /* Added */ :
        return "added";

      case 2 /* Modified */ :
      case 3 /* Metadata */ :
        return "modified";

      case 1 /* Removed */ :
        return "removed";

      default:
        return V();
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
 */ function Ph(t, e, n) {
    let s;
    // Cast to `any` in order to satisfy the union type constraint on
    // toFirestore().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return s = t ? n && (n.merge || n.mergeFields) ? t.toFirestore(e, n) : t.toFirestore(e) : e, 
    s;
}

const Vh = {
    Firestore: eh,
    GeoPoint: vo,
    Timestamp: L,
    Blob: wo,
    Transaction: nh,
    WriteBatch: sh,
    DocumentReference: ih,
    DocumentSnapshot: oh,
    Query: dh,
    QueryDocumentSnapshot: hh,
    QuerySnapshot: wh,
    CollectionReference: Th,
    FieldPath: Eo,
    FieldValue: po,
    setLogLevel: eh.setLogLevel,
    CACHE_SIZE_UNLIMITED: Zo
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
 * Registers the main Firestore ReactNative build with the components framework.
 * Persistence can be enabled via `firebase.firestore().enablePersistence()`.
 */
function gh(t) {
    !function(t, e) {
        t.INTERNAL.registerComponent(new T("firestore", t => {
            const n = t.getProvider("app").getImmediate();
            return e(n, t.getProvider("auth-internal"));
        }, "PUBLIC" /* PUBLIC */).setServiceProps(Object.assign({}, Vh)));
    }(t, (t, e) => {
        const n = new Qr, s = new Wr(n);
        return new eh(t, e, s, n);
    }), t.registerVersion("@firebase/firestore", "1.16.3", "rn");
}

gh(t);

export { gh as __PRIVATE_registerFirestore };
//# sourceMappingURL=index.rn.esm2017.js.map
