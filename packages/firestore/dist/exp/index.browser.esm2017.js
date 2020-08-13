import { _getProvider as t, _removeServiceInstance as e, _registerComponent as n, registerVersion as s } from "@firebase/app";

import { Component as i } from "@firebase/component";

import { Logger as r, LogLevel as o } from "@firebase/logger";

import { getUA as h, isMobileCordova as a, isReactNative as c, isElectron as u, isIE as l, isUWP as _, isBrowserExtension as f } from "@firebase/util";

import { XhrIo as d, EventType as w, ErrorCode as T, createWebChannelTransport as E, WebChannel as I } from "@firebase/webchannel-wrapper";

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
 */ class A {
    constructor(t) {
        this.uid = t;
    }
    t() {
        return null != this.uid;
    }
    /**
     * Returns a key representing this user, suitable for inclusion in a
     * dictionary.
     */    s() {
        return this.t() ? "uid:" + this.uid : "anonymous-user";
    }
    isEqual(t) {
        return t.uid === this.uid;
    }
}

/** A user with a null UID. */ A.UNAUTHENTICATED = new A(null), 
// TODO(mikelehen): Look into getting a proper uid-equivalent for
// non-FirebaseAuth providers.
A.i = new A("google-credentials-uid"), A.o = new A("first-party-uid");

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
const R = new r("@firebase/firestore");

// Helper methods are needed because variables can't be exported as read/write
function m() {
    return R.logLevel;
}

function P(t) {
    R.setLogLevel(t);
}

function V(t, ...e) {
    if (R.logLevel <= o.DEBUG) {
        const n = e.map(p);
        R.debug("Firestore (7.17.2): " + t, ...n);
    }
}

function g(t, ...e) {
    if (R.logLevel <= o.ERROR) {
        const n = e.map(p);
        R.error("Firestore (7.17.2): " + t, ...n);
    }
}

function y(t, ...e) {
    if (R.logLevel <= o.WARN) {
        const n = e.map(p);
        R.warn("Firestore (7.17.2): " + t, ...n);
    }
}

/**
 * Converts an additional log parameter to a string representation.
 */ function p(t) {
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
 */ function b(t = "Unexpected state") {
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
    const e = "FIRESTORE (7.17.2) INTERNAL ASSERTION FAILED: " + t;
    // NOTE: We don't use FirestoreError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
    throw g(e), new Error(e);
}

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * Messages are stripped in production builds.
 */ function v(t, e) {
    t || b();
}

/**
 * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
 * instance of `T` before casting.
 */ function S(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
e) {
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
 */ const C = {
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
 */ class D extends Error {
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
 */ class N {
    constructor(t, e) {
        this.user = e, this.type = "OAuth", this.h = {}, 
        // Set the headers using Object Literal notation to avoid minification
        this.h.Authorization = "Bearer " + t;
    }
}

class x {
    constructor(t) {
        /**
         * The auth token listener registered with FirebaseApp, retained here so we
         * can unregister it.
         */
        this.u = null, 
        /** Tracks the current User. */
        this.currentUser = A.UNAUTHENTICATED, this.l = !1, 
        /**
         * Counter used to detect if the token changed while a getToken request was
         * outstanding.
         */
        this._ = 0, 
        /** The listener registered with setChangeListener(). */
        this.T = null, this.forceRefresh = !1, this.u = () => {
            this._++, this.currentUser = this.I(), this.l = !0, this.T && this.T(this.currentUser);
        }, this._ = 0, this.auth = t.getImmediate({
            optional: !0
        }), this.auth ? this.auth.addAuthTokenListener(this.u) : (
        // if auth is not available, invoke tokenListener once with null token
        this.u(null), t.get().then(t => {
            this.auth = t, this.u && 
            // tokenListener can be removed by removeChangeListener()
            this.auth.addAuthTokenListener(this.u);
        }, () => {}));
    }
    getToken() {
        // Take note of the current value of the tokenCounter so that this method
        // can fail (with an ABORTED error) if there is a token change while the
        // request is outstanding.
        const t = this._, e = this.forceRefresh;
        return this.forceRefresh = !1, this.auth ? this.auth.getToken(e).then(e => 
        // Cancel the request since the token changed while the request was
        // outstanding so the response is potentially for a previous user (which
        // user, we can't be sure).
        this._ !== t ? (V("FirebaseCredentialsProvider", "getToken aborted due to token change."), 
        this.getToken()) : e ? (v("string" == typeof e.accessToken), new N(e.accessToken, this.currentUser)) : null) : Promise.resolve(null);
    }
    A() {
        this.forceRefresh = !0;
    }
    R(t) {
        this.T = t, 
        // Fire the initial event
        this.l && t(this.currentUser);
    }
    m() {
        this.auth && this.auth.removeAuthTokenListener(this.u), this.u = null, this.T = null;
    }
    // Auth.getUid() can return null even with a user logged in. It is because
    // getUid() is synchronous, but the auth code populating Uid is asynchronous.
    // This method should only be called in the AuthTokenListener callback
    // to guarantee to get the actual user.
    I() {
        const t = this.auth && this.auth.getUid();
        return v(null === t || "string" == typeof t), new A(t);
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
 * Generates `nBytes` of random bytes.
 *
 * If `nBytes < 0` , an error will be thrown.
 */ function k(t) {
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
 */ class F {
    static P() {
        // Alphanumeric characters
        const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", e = Math.floor(256 / t.length) * t.length;
        // The largest byte value that is a multiple of `char.length`.
                let n = "";
        for (;n.length < 20; ) {
            const s = k(40);
            for (let i = 0; i < s.length; ++i) 
            // Only accept values that are [0, maxMultiple), this ensures they can
            // be evenly mapped to indices of `chars` via a modulo operation.
            n.length < 20 && s[i] < e && (n += t.charAt(s[i] % t.length));
        }
        return n;
    }
}

function O(t, e) {
    return t < e ? -1 : t > e ? 1 : 0;
}

/** Helper to compare arrays using isEqual(). */ function M(t, e, n) {
    return t.length === e.length && t.every((t, s) => n(t, e[s]));
}

/**
 * Returns the immediate lexicographically-following string. This is useful to
 * construct an inclusive range for indexeddb iterators.
 */ function $(t) {
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
 */
// The earlist date supported by Firestore timestamps (0001-01-01T00:00:00Z).
class L {
    constructor(t, e) {
        if (this.seconds = t, this.nanoseconds = e, e < 0) throw new D(C.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (e >= 1e9) throw new D(C.INVALID_ARGUMENT, "Timestamp nanoseconds out of range: " + e);
        if (t < -62135596800) throw new D(C.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
        // This will break in the year 10,000.
                if (t >= 253402300800) throw new D(C.INVALID_ARGUMENT, "Timestamp seconds out of range: " + t);
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
    V(t) {
        return this.seconds === t.seconds ? O(this.nanoseconds, t.nanoseconds) : O(this.seconds, t.seconds);
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
    static g(t) {
        return new q(t);
    }
    static min() {
        return new q(new L(0, 0));
    }
    p(t) {
        return this.timestamp.V(t.timestamp);
    }
    isEqual(t) {
        return this.timestamp.isEqual(t.timestamp);
    }
    /** Returns a number representation of the version for use in spec tests. */    v() {
        // Convert to microseconds.
        return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
    }
    toString() {
        return "SnapshotVersion(" + this.timestamp.toString() + ")";
    }
    S() {
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
        void 0 === e ? e = 0 : e > t.length && b(), void 0 === n ? n = t.length - e : n > t.length - e && b(), 
        this.segments = t, this.offset = e, this.C = n;
    }
    get length() {
        return this.C;
    }
    isEqual(t) {
        return 0 === B.D(this, t);
    }
    child(t) {
        const e = this.segments.slice(this.offset, this.limit());
        return t instanceof B ? t.forEach(t => {
            e.push(t);
        }) : e.push(t), this.N(e);
    }
    /** The index of one past the last segment of the path. */    limit() {
        return this.offset + this.length;
    }
    k(t) {
        return t = void 0 === t ? 1 : t, this.N(this.segments, this.offset + t, this.length - t);
    }
    F() {
        return this.N(this.segments, this.offset, this.length - 1);
    }
    O() {
        return this.segments[this.offset];
    }
    M() {
        return this.get(this.length - 1);
    }
    get(t) {
        return this.segments[this.offset + t];
    }
    $() {
        return 0 === this.length;
    }
    L(t) {
        if (t.length < this.length) return !1;
        for (let e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }
    q(t) {
        if (this.length + 1 !== t.length) return !1;
        for (let e = 0; e < this.length; e++) if (this.get(e) !== t.get(e)) return !1;
        return !0;
    }
    forEach(t) {
        for (let e = this.offset, n = this.limit(); e < n; e++) t(this.segments[e]);
    }
    B() {
        return this.segments.slice(this.offset, this.limit());
    }
    static D(t, e) {
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
    N(t, e, n) {
        return new U(t, e, n);
    }
    U() {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        return this.B().join("/");
    }
    toString() {
        return this.U();
    }
    /**
     * Creates a resource path from the given slash-delimited string.
     */    static W(t) {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        if (t.indexOf("//") >= 0) throw new D(C.INVALID_ARGUMENT, `Invalid path (${t}). Paths must not contain // in them.`);
        // We may still have an empty segment at the beginning or end if they had a
        // leading or trailing slash (which we allow).
                const e = t.split("/").filter(t => t.length > 0);
        return new U(e);
    }
    static K() {
        return new U([]);
    }
}

const W = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

/** A dot-separated path for navigating sub-objects within a document. */ class K extends B {
    N(t, e, n) {
        return new K(t, e, n);
    }
    /**
     * Returns true if the string could be used as a segment in a field path
     * without escaping.
     */    static j(t) {
        return W.test(t);
    }
    U() {
        return this.B().map(t => (t = t.replace("\\", "\\\\").replace("`", "\\`"), K.j(t) || (t = "`" + t + "`"), 
        t)).join(".");
    }
    toString() {
        return this.U();
    }
    /**
     * Returns true if this field references the key of a document.
     */    G() {
        return 1 === this.length && "__name__" === this.get(0);
    }
    /**
     * The field designating the key of a document.
     */    static H() {
        return new K([ "__name__" ]);
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
     */    static J(t) {
        const e = [];
        let n = "", s = 0;
        const i = () => {
            if (0 === n.length) throw new D(C.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            e.push(n), n = "";
        };
        let r = !1;
        for (;s < t.length; ) {
            const e = t[s];
            if ("\\" === e) {
                if (s + 1 === t.length) throw new D(C.INVALID_ARGUMENT, "Path has trailing escape character: " + t);
                const e = t[s + 1];
                if ("\\" !== e && "." !== e && "`" !== e) throw new D(C.INVALID_ARGUMENT, "Path has invalid escape sequence: " + t);
                n += e, s += 2;
            } else "`" === e ? (r = !r, s++) : "." !== e || r ? (n += e, s++) : (i(), s++);
        }
        if (i(), r) throw new D(C.INVALID_ARGUMENT, "Unterminated ` in path: " + t);
        return new K(e);
    }
    static K() {
        return new K([]);
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
    static Y(t) {
        return new j(U.W(t).k(5));
    }
    /** Returns true if the document is in the specified collectionId. */    X(t) {
        return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
    }
    isEqual(t) {
        return null !== t && 0 === U.D(this.path, t.path);
    }
    toString() {
        return this.path.toString();
    }
    static D(t, e) {
        return U.D(t.path, e.path);
    }
    static Z(t) {
        return t.length % 2 == 0;
    }
    /**
     * Creates and returns a new document key with the given segments.
     *
     * @param segments The segments of the path to the document
     * @return A new instance of DocumentKey
     */    static tt(t) {
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
 */ class Q {
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
        this.et = t, this.persistenceKey = e, this.host = n, this.ssl = s, this.forceLongPolling = i;
    }
}

/** The default database name for a project. */
/** Represents the database ID a Firestore client is associated with. */
class G {
    constructor(t, e) {
        this.projectId = t, this.database = e || "(default)";
    }
    get nt() {
        return "(default)" === this.database;
    }
    isEqual(t) {
        return t instanceof G && t.projectId === this.projectId && t.database === this.database;
    }
    p(t) {
        return O(this.projectId, t.projectId) || O(this.database, t.database);
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
 */ function z(t) {
    return null == t;
}

/** Returns whether the value represents -0. */ function H(t) {
    // Detect if the value is -0.0. Based on polyfill from
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
    return -0 === t && 1 / t == -1 / 0;
}

/**
 * Returns whether a value is an integer and in the safe integer range
 * @param value The value to test for being an integer and in the safe range
 */ function J(t) {
    return "number" == typeof t && Number.isInteger(t) && !H(t) && t <= Number.MAX_SAFE_INTEGER && t >= Number.MIN_SAFE_INTEGER;
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
class Y {
    constructor(t, e = null, n = [], s = [], i = null, r = null, o = null) {
        this.path = t, this.collectionGroup = e, this.orderBy = n, this.filters = s, this.limit = i, 
        this.startAt = r, this.endAt = o, this.st = null;
    }
}

/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */ function X(t, e = null, n = [], s = [], i = null, r = null, o = null) {
    return new Y(t, e, n, s, i, r, o);
}

function Z(t) {
    const e = S(t);
    if (null === e.st) {
        let t = e.path.U();
        null !== e.collectionGroup && (t += "|cg:" + e.collectionGroup), t += "|f:", t += e.filters.map(t => qn(t)).join(","), 
        t += "|ob:", t += e.orderBy.map(t => function(t) {
            // TODO(b/29183165): Make this collision robust.
            return t.field.U() + t.dir;
        }(t)).join(","), z(e.limit) || (t += "|l:", t += e.limit), e.startAt && (t += "|lb:", 
        t += Jn(e.startAt)), e.endAt && (t += "|ub:", t += Jn(e.endAt)), e.st = t;
    }
    return e.st;
}

function tt(t) {
    let e = t.path.U();
    return null !== t.collectionGroup && (e += " collectionGroup=" + t.collectionGroup), 
    t.filters.length > 0 && (e += `, filters: [${t.filters.map(t => {
        return `${(e = t).field.U()} ${e.op} ${zt(e.value)}`;
        /** Returns a debug description for `filter`. */
        var e;
        /** Filter that matches on key fields (i.e. '__name__'). */    }).join(", ")}]`), 
    z(t.limit) || (e += ", limit: " + t.limit), t.orderBy.length > 0 && (e += `, orderBy: [${t.orderBy.map(t => function(t) {
        return `${t.field.U()} (${t.dir})`;
    }(t)).join(", ")}]`), t.startAt && (e += ", startAt: " + Jn(t.startAt)), t.endAt && (e += ", endAt: " + Jn(t.endAt)), 
    `Target(${e})`;
}

function et(t, e) {
    if (t.limit !== e.limit) return !1;
    if (t.orderBy.length !== e.orderBy.length) return !1;
    for (let n = 0; n < t.orderBy.length; n++) if (!es(t.orderBy[n], e.orderBy[n])) return !1;
    if (t.filters.length !== e.filters.length) return !1;
    for (let i = 0; i < t.filters.length; i++) if (n = t.filters[i], s = e.filters[i], 
    n.op !== s.op || !n.field.isEqual(s.field) || !Kt(n.value, s.value)) return !1;
    var n, s;
    return t.collectionGroup === e.collectionGroup && (!!t.path.isEqual(e.path) && (!!Xn(t.startAt, e.startAt) && Xn(t.endAt, e.endAt)));
}

function nt(t) {
    return j.Z(t.path) && null === t.collectionGroup && 0 === t.filters.length;
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
 */
class st {
    constructor(t) {
        this.it = t;
    }
    static fromBase64String(t) {
        const e = atob(t);
        return new st(e);
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
        return new st(e);
    }
    toBase64() {
        return t = this.it, btoa(t);
        /** Converts a binary string to a Base64 encoded string. */
        var t;
        /** True if and only if the Base64 conversion functions are available. */    }
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
 */ (this.it);
    }
    rt() {
        return 2 * this.it.length;
    }
    p(t) {
        return O(this.it, t.it);
    }
    isEqual(t) {
        return this.it === t.it;
    }
}

st.ot = new st("");

class it {
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
     */ , o = st.ot) {
        this.target = t, this.targetId = e, this.ht = n, this.sequenceNumber = s, this.at = i, 
        this.lastLimboFreeSnapshotVersion = r, this.resumeToken = o;
    }
    /** Creates a new target data instance with an updated sequence number. */    ct(t) {
        return new it(this.target, this.targetId, this.ht, t, this.at, this.lastLimboFreeSnapshotVersion, this.resumeToken);
    }
    /**
     * Creates a new target data instance with an updated resume token and
     * snapshot version.
     */    ut(t, e) {
        return new it(this.target, this.targetId, this.ht, this.sequenceNumber, e, this.lastLimboFreeSnapshotVersion, t);
    }
    /**
     * Creates a new target data instance with an updated last limbo free
     * snapshot version number.
     */    lt(t) {
        return new it(this.target, this.targetId, this.ht, this.sequenceNumber, this.at, t, this.resumeToken);
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
 */ class rt {
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
 */ var ot, ht;

/**
 * Determines whether an error code represents a permanent error when received
 * in response to a non-write operation.
 *
 * See isPermanentWriteError for classifying write errors.
 */
function at(t) {
    switch (t) {
      case C.OK:
        return b();

      case C.CANCELLED:
      case C.UNKNOWN:
      case C.DEADLINE_EXCEEDED:
      case C.RESOURCE_EXHAUSTED:
      case C.INTERNAL:
      case C.UNAVAILABLE:
 // Unauthenticated means something went wrong with our token and we need
        // to retry with new credentials which will happen automatically.
              case C.UNAUTHENTICATED:
        return !1;

      case C.INVALID_ARGUMENT:
      case C.NOT_FOUND:
      case C.ALREADY_EXISTS:
      case C.PERMISSION_DENIED:
      case C.FAILED_PRECONDITION:
 // Aborted might be retried in some scenarios, but that is dependant on
        // the context and should handled individually by the calling code.
        // See https://cloud.google.com/apis/design/errors.
              case C.ABORTED:
      case C.OUT_OF_RANGE:
      case C.UNIMPLEMENTED:
      case C.DATA_LOSS:
        return !0;

      default:
        return b();
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
function ct(t) {
    if (void 0 === t) 
    // This shouldn't normally happen, but in certain error cases (like trying
    // to send invalid proto messages) we may get an error with no GRPC code.
    return g("GRPC error has no .code"), C.UNKNOWN;
    switch (t) {
      case ot.OK:
        return C.OK;

      case ot.CANCELLED:
        return C.CANCELLED;

      case ot.UNKNOWN:
        return C.UNKNOWN;

      case ot.DEADLINE_EXCEEDED:
        return C.DEADLINE_EXCEEDED;

      case ot.RESOURCE_EXHAUSTED:
        return C.RESOURCE_EXHAUSTED;

      case ot.INTERNAL:
        return C.INTERNAL;

      case ot.UNAVAILABLE:
        return C.UNAVAILABLE;

      case ot.UNAUTHENTICATED:
        return C.UNAUTHENTICATED;

      case ot.INVALID_ARGUMENT:
        return C.INVALID_ARGUMENT;

      case ot.NOT_FOUND:
        return C.NOT_FOUND;

      case ot.ALREADY_EXISTS:
        return C.ALREADY_EXISTS;

      case ot.PERMISSION_DENIED:
        return C.PERMISSION_DENIED;

      case ot.FAILED_PRECONDITION:
        return C.FAILED_PRECONDITION;

      case ot.ABORTED:
        return C.ABORTED;

      case ot.OUT_OF_RANGE:
        return C.OUT_OF_RANGE;

      case ot.UNIMPLEMENTED:
        return C.UNIMPLEMENTED;

      case ot.DATA_LOSS:
        return C.DATA_LOSS;

      default:
        return b();
    }
}

/**
 * Converts an HTTP response's error status to the equivalent error code.
 *
 * @param status An HTTP error response status ("FAILED_PRECONDITION",
 * "UNKNOWN", etc.)
 * @returns The equivalent Code. Non-matching responses are mapped to
 *     Code.UNKNOWN.
 */ (ht = ot || (ot = {}))[ht.OK = 0] = "OK", ht[ht.CANCELLED = 1] = "CANCELLED", 
ht[ht.UNKNOWN = 2] = "UNKNOWN", ht[ht.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", 
ht[ht.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", ht[ht.NOT_FOUND = 5] = "NOT_FOUND", 
ht[ht.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", ht[ht.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
ht[ht.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", ht[ht.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
ht[ht.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", ht[ht.ABORTED = 10] = "ABORTED", 
ht[ht.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", ht[ht.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
ht[ht.INTERNAL = 13] = "INTERNAL", ht[ht.UNAVAILABLE = 14] = "UNAVAILABLE", ht[ht.DATA_LOSS = 15] = "DATA_LOSS";

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
class ut {
    constructor(t, e) {
        this.D = t, this.root = e || _t.EMPTY;
    }
    // Returns a copy of the map, with the specified key/value added or replaced.
    _t(t, e) {
        return new ut(this.D, this.root._t(t, e, this.D).copy(null, null, _t.ft, null, null));
    }
    // Returns a copy of the map, with the specified key removed.
    remove(t) {
        return new ut(this.D, this.root.remove(t, this.D).copy(null, null, _t.ft, null, null));
    }
    // Returns the value of the node with the given key, or null.
    get(t) {
        let e = this.root;
        for (;!e.$(); ) {
            const n = this.D(t, e.key);
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
        for (;!n.$(); ) {
            const s = this.D(t, n.key);
            if (0 === s) return e + n.left.size;
            s < 0 ? n = n.left : (
            // Count all nodes left of the node plus the node itself
            e += n.left.size + 1, n = n.right);
        }
        // Node not found
                return -1;
    }
    $() {
        return this.root.$();
    }
    // Returns the total number of nodes in the map.
    get size() {
        return this.root.size;
    }
    // Returns the minimum key in the map.
    dt() {
        return this.root.dt();
    }
    // Returns the maximum key in the map.
    wt() {
        return this.root.wt();
    }
    // Traverses the map in key order and calls the specified action function
    // for each key/value pair. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    Tt(t) {
        return this.root.Tt(t);
    }
    forEach(t) {
        this.Tt((e, n) => (t(e, n), !1));
    }
    toString() {
        const t = [];
        return this.Tt((e, n) => (t.push(`${e}:${n}`), !1)), `{${t.join(", ")}}`;
    }
    // Traverses the map in reverse key order and calls the specified action
    // function for each key/value pair. If action returns true, traversal is
    // aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    Et(t) {
        return this.root.Et(t);
    }
    // Returns an iterator over the SortedMap.
    It() {
        return new lt(this.root, null, this.D, !1);
    }
    At(t) {
        return new lt(this.root, t, this.D, !1);
    }
    Rt() {
        return new lt(this.root, null, this.D, !0);
    }
    Pt(t) {
        return new lt(this.root, t, this.D, !0);
    }
}

 // end SortedMap
// An iterator over an LLRBNode.
class lt {
    constructor(t, e, n, s) {
        this.Vt = s, this.gt = [];
        let i = 1;
        for (;!t.$(); ) if (i = e ? n(t.key, e) : 1, 
        // flip the comparison if we're going in reverse
        s && (i *= -1), i < 0) 
        // This node is less than our start key. ignore it
        t = this.Vt ? t.left : t.right; else {
            if (0 === i) {
                // This node is exactly equal to our start key. Push it on the stack,
                // but stop iterating;
                this.gt.push(t);
                break;
            }
            // This node is greater than our start key, add it to the stack and move
            // to the next one
            this.gt.push(t), t = this.Vt ? t.right : t.left;
        }
    }
    yt() {
        let t = this.gt.pop();
        const e = {
            key: t.key,
            value: t.value
        };
        if (this.Vt) for (t = t.left; !t.$(); ) this.gt.push(t), t = t.right; else for (t = t.right; !t.$(); ) this.gt.push(t), 
        t = t.left;
        return e;
    }
    pt() {
        return this.gt.length > 0;
    }
    bt() {
        if (0 === this.gt.length) return null;
        const t = this.gt[this.gt.length - 1];
        return {
            key: t.key,
            value: t.value
        };
    }
}

 // end SortedMapIterator
// Represents a node in a Left-leaning Red-Black tree.
class _t {
    constructor(t, e, n, s, i) {
        this.key = t, this.value = e, this.color = null != n ? n : _t.RED, this.left = null != s ? s : _t.EMPTY, 
        this.right = null != i ? i : _t.EMPTY, this.size = this.left.size + 1 + this.right.size;
    }
    // Returns a copy of the current node, optionally replacing pieces of it.
    copy(t, e, n, s, i) {
        return new _t(null != t ? t : this.key, null != e ? e : this.value, null != n ? n : this.color, null != s ? s : this.left, null != i ? i : this.right);
    }
    $() {
        return !1;
    }
    // Traverses the tree in key order and calls the specified action function
    // for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    Tt(t) {
        return this.left.Tt(t) || t(this.key, this.value) || this.right.Tt(t);
    }
    // Traverses the tree in reverse key order and calls the specified action
    // function for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    Et(t) {
        return this.right.Et(t) || t(this.key, this.value) || this.left.Et(t);
    }
    // Returns the minimum node in the tree.
    min() {
        return this.left.$() ? this : this.left.min();
    }
    // Returns the maximum key in the tree.
    dt() {
        return this.min().key;
    }
    // Returns the maximum key in the tree.
    wt() {
        return this.right.$() ? this.key : this.right.wt();
    }
    // Returns new tree, with the key/value added.
    _t(t, e, n) {
        let s = this;
        const i = n(t, s.key);
        return s = i < 0 ? s.copy(null, null, null, s.left._t(t, e, n), null) : 0 === i ? s.copy(null, e, null, null, null) : s.copy(null, null, null, null, s.right._t(t, e, n)), 
        s.vt();
    }
    St() {
        if (this.left.$()) return _t.EMPTY;
        let t = this;
        return t.left.Ct() || t.left.left.Ct() || (t = t.Dt()), t = t.copy(null, null, null, t.left.St(), null), 
        t.vt();
    }
    // Returns new tree, with the specified item removed.
    remove(t, e) {
        let n, s = this;
        if (e(t, s.key) < 0) s.left.$() || s.left.Ct() || s.left.left.Ct() || (s = s.Dt()), 
        s = s.copy(null, null, null, s.left.remove(t, e), null); else {
            if (s.left.Ct() && (s = s.Nt()), s.right.$() || s.right.Ct() || s.right.left.Ct() || (s = s.xt()), 
            0 === e(t, s.key)) {
                if (s.right.$()) return _t.EMPTY;
                n = s.right.min(), s = s.copy(n.key, n.value, null, null, s.right.St());
            }
            s = s.copy(null, null, null, null, s.right.remove(t, e));
        }
        return s.vt();
    }
    Ct() {
        return this.color;
    }
    // Returns new tree after performing any needed rotations.
    vt() {
        let t = this;
        return t.right.Ct() && !t.left.Ct() && (t = t.kt()), t.left.Ct() && t.left.left.Ct() && (t = t.Nt()), 
        t.left.Ct() && t.right.Ct() && (t = t.Ft()), t;
    }
    Dt() {
        let t = this.Ft();
        return t.right.left.Ct() && (t = t.copy(null, null, null, null, t.right.Nt()), t = t.kt(), 
        t = t.Ft()), t;
    }
    xt() {
        let t = this.Ft();
        return t.left.left.Ct() && (t = t.Nt(), t = t.Ft()), t;
    }
    kt() {
        const t = this.copy(null, null, _t.RED, null, this.right.left);
        return this.right.copy(null, null, this.color, t, null);
    }
    Nt() {
        const t = this.copy(null, null, _t.RED, this.left.right, null);
        return this.left.copy(null, null, this.color, null, t);
    }
    Ft() {
        const t = this.left.copy(null, null, !this.left.color, null, null), e = this.right.copy(null, null, !this.right.color, null, null);
        return this.copy(null, null, !this.color, t, e);
    }
    // For testing.
    Ot() {
        const t = this.Mt();
        return Math.pow(2, t) <= this.size + 1;
    }
    // In a balanced RB tree, the black-depth (number of black nodes) from root to
    // leaves is equal on both sides.  This function verifies that or asserts.
    Mt() {
        if (this.Ct() && this.left.Ct()) throw b();
        if (this.right.Ct()) throw b();
        const t = this.left.Mt();
        if (t !== this.right.Mt()) throw b();
        return t + (this.Ct() ? 0 : 1);
    }
}

 // end LLRBNode
// Empty node is shared between all LLRB trees.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
_t.EMPTY = null, _t.RED = !0, _t.ft = !1;

// end LLRBEmptyNode
_t.EMPTY = new 
// Represents an empty node (a leaf node in the Red-Black Tree).
class {
    constructor() {
        this.size = 0;
    }
    get key() {
        throw b();
    }
    get value() {
        throw b();
    }
    get color() {
        throw b();
    }
    get left() {
        throw b();
    }
    get right() {
        throw b();
    }
    // Returns a copy of the current node.
    copy(t, e, n, s, i) {
        return this;
    }
    // Returns a copy of the tree, with the specified key/value added.
    _t(t, e, n) {
        return new _t(t, e);
    }
    // Returns a copy of the tree, with the specified key removed.
    remove(t, e) {
        return this;
    }
    $() {
        return !0;
    }
    Tt(t) {
        return !1;
    }
    Et(t) {
        return !1;
    }
    dt() {
        return null;
    }
    wt() {
        return null;
    }
    Ct() {
        return !1;
    }
    // For testing.
    Ot() {
        return !0;
    }
    Mt() {
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
class ft {
    constructor(t) {
        this.D = t, this.data = new ut(this.D);
    }
    has(t) {
        return null !== this.data.get(t);
    }
    first() {
        return this.data.dt();
    }
    last() {
        return this.data.wt();
    }
    get size() {
        return this.data.size;
    }
    indexOf(t) {
        return this.data.indexOf(t);
    }
    /** Iterates elements in order defined by "comparator" */    forEach(t) {
        this.data.Tt((e, n) => (t(e), !1));
    }
    /** Iterates over `elem`s such that: range[0] <= elem < range[1]. */    $t(t, e) {
        const n = this.data.At(t[0]);
        for (;n.pt(); ) {
            const s = n.yt();
            if (this.D(s.key, t[1]) >= 0) return;
            e(s.key);
        }
    }
    /**
     * Iterates over `elem`s such that: start <= elem until false is returned.
     */    Lt(t, e) {
        let n;
        for (n = void 0 !== e ? this.data.At(e) : this.data.It(); n.pt(); ) {
            if (!t(n.yt().key)) return;
        }
    }
    /** Finds the least element greater than or equal to `elem`. */    qt(t) {
        const e = this.data.At(t);
        return e.pt() ? e.yt().key : null;
    }
    It() {
        return new dt(this.data.It());
    }
    At(t) {
        return new dt(this.data.At(t));
    }
    /** Inserts or updates an element */    add(t) {
        return this.copy(this.data.remove(t)._t(t, !0));
    }
    /** Deletes an element */    delete(t) {
        return this.has(t) ? this.copy(this.data.remove(t)) : this;
    }
    $() {
        return this.data.$();
    }
    Bt(t) {
        let e = this;
        // Make sure `result` always refers to the larger one of the two sets.
                return e.size < t.size && (e = t, t = this), t.forEach(t => {
            e = e.add(t);
        }), e;
    }
    isEqual(t) {
        if (!(t instanceof ft)) return !1;
        if (this.size !== t.size) return !1;
        const e = this.data.It(), n = t.data.It();
        for (;e.pt(); ) {
            const t = e.yt().key, s = n.yt().key;
            if (0 !== this.D(t, s)) return !1;
        }
        return !0;
    }
    B() {
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
        const e = new ft(this.D);
        return e.data = t, e;
    }
}

class dt {
    constructor(t) {
        this.Ut = t;
    }
    yt() {
        return this.Ut.yt().key;
    }
    pt() {
        return this.Ut.pt();
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
 */ const wt = new ut(j.D);

function Tt() {
    return wt;
}

function Et() {
    return Tt();
}

const It = new ut(j.D);

function At() {
    return It;
}

const Rt = new ut(j.D);

const mt = new ft(j.D);

function Pt(...t) {
    let e = mt;
    for (const n of t) e = e.add(n);
    return e;
}

const Vt = new ft(O);

function gt() {
    return Vt;
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
 */ class yt {
    /** The default ordering is by key if the comparator is omitted */
    constructor(t) {
        // We are adding document key comparator to the end as it's the only
        // guaranteed unique property of a document.
        this.D = t ? (e, n) => t(e, n) || j.D(e.key, n.key) : (t, e) => j.D(t.key, e.key), 
        this.Wt = At(), this.Kt = new ut(this.D);
    }
    /**
     * Returns an empty copy of the existing DocumentSet, using the same
     * comparator.
     */    static jt(t) {
        return new yt(t.D);
    }
    has(t) {
        return null != this.Wt.get(t);
    }
    get(t) {
        return this.Wt.get(t);
    }
    first() {
        return this.Kt.dt();
    }
    last() {
        return this.Kt.wt();
    }
    $() {
        return this.Kt.$();
    }
    /**
     * Returns the index of the provided key in the document set, or -1 if the
     * document key is not present in the set;
     */    indexOf(t) {
        const e = this.Wt.get(t);
        return e ? this.Kt.indexOf(e) : -1;
    }
    get size() {
        return this.Kt.size;
    }
    /** Iterates documents in order defined by "comparator" */    forEach(t) {
        this.Kt.Tt((e, n) => (t(e), !1));
    }
    /** Inserts or updates a document with the same key */    add(t) {
        // First remove the element if we have it.
        const e = this.delete(t.key);
        return e.copy(e.Wt._t(t.key, t), e.Kt._t(t, null));
    }
    /** Deletes a document with a given key */    delete(t) {
        const e = this.get(t);
        return e ? this.copy(this.Wt.remove(t), this.Kt.remove(e)) : this;
    }
    isEqual(t) {
        if (!(t instanceof yt)) return !1;
        if (this.size !== t.size) return !1;
        const e = this.Kt.It(), n = t.Kt.It();
        for (;e.pt(); ) {
            const t = e.yt().key, s = n.yt().key;
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
        const n = new yt;
        return n.D = this.D, n.Wt = t, n.Kt = e, n;
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
 */ class pt {
    constructor() {
        this.Qt = new ut(j.D);
    }
    track(t) {
        const e = t.doc.key, n = this.Qt.get(e);
        n ? 
        // Merge the new change with the existing change.
        0 /* Added */ !== t.type && 3 /* Metadata */ === n.type ? this.Qt = this.Qt._t(e, t) : 3 /* Metadata */ === t.type && 1 /* Removed */ !== n.type ? this.Qt = this.Qt._t(e, {
            type: n.type,
            doc: t.doc
        }) : 2 /* Modified */ === t.type && 2 /* Modified */ === n.type ? this.Qt = this.Qt._t(e, {
            type: 2 /* Modified */ ,
            doc: t.doc
        }) : 2 /* Modified */ === t.type && 0 /* Added */ === n.type ? this.Qt = this.Qt._t(e, {
            type: 0 /* Added */ ,
            doc: t.doc
        }) : 1 /* Removed */ === t.type && 0 /* Added */ === n.type ? this.Qt = this.Qt.remove(e) : 1 /* Removed */ === t.type && 2 /* Modified */ === n.type ? this.Qt = this.Qt._t(e, {
            type: 1 /* Removed */ ,
            doc: n.doc
        }) : 0 /* Added */ === t.type && 1 /* Removed */ === n.type ? this.Qt = this.Qt._t(e, {
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
        b() : this.Qt = this.Qt._t(e, t);
    }
    Gt() {
        const t = [];
        return this.Qt.Tt((e, n) => {
            t.push(n);
        }), t;
    }
}

class bt {
    constructor(t, e, n, s, i, r, o, h) {
        this.query = t, this.docs = e, this.zt = n, this.docChanges = s, this.Ht = i, this.fromCache = r, 
        this.Jt = o, this.Yt = h;
    }
    /** Returns a view snapshot as if all documents in the snapshot were added. */    static Xt(t, e, n, s) {
        const i = [];
        return e.forEach(t => {
            i.push({
                type: 0 /* Added */ ,
                doc: t
            });
        }), new bt(t, e, yt.jt(e), i, n, s, 
        /* syncStateChanged= */ !0, 
        /* excludesMetadataChanges= */ !1);
    }
    get hasPendingWrites() {
        return !this.Ht.$();
    }
    isEqual(t) {
        if (!(this.fromCache === t.fromCache && this.Jt === t.Jt && this.Ht.isEqual(t.Ht) && kn(this.query, t.query) && this.docs.isEqual(t.docs) && this.zt.isEqual(t.zt))) return !1;
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
 */ class vt {
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
        this.at = t, this.Zt = e, this.te = n, this.ee = s, this.ne = i;
    }
    /**
     * HACK: Views require RemoteEvents in order to determine whether the view is
     * CURRENT, but secondary tabs don't receive remote events. So this method is
     * used to create a synthesized RemoteEvent that can be used to apply a
     * CURRENT status change to a View, for queries executed in a different tab.
     */
    // PORTING NOTE: Multi-tab only
    static se(t, e) {
        const n = new Map;
        return n.set(t, St.ie(t, e)), new vt(q.min(), n, gt(), Tt(), Pt());
    }
}

/**
 * A TargetChange specifies the set of changes for a specific target as part of
 * a RemoteEvent. These changes track which documents are added, modified or
 * removed, as well as the target's resume token and whether the target is
 * marked CURRENT.
 * The actual changes *to* documents are not part of the TargetChange since
 * documents may be part of multiple targets.
 */ class St {
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
        this.resumeToken = t, this.re = e, this.oe = n, this.he = s, this.ae = i;
    }
    /**
     * This method is used to create a synthesized TargetChanges that can be used to
     * apply a CURRENT status change to a View (for queries executed in a different
     * tab) or for new queries (to raise snapshots with correct CURRENT status).
     */    static ie(t, e) {
        return new St(st.ot, e, Pt(), Pt(), Pt());
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
 */ class Ct {
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
        this.ce = t, this.removedTargetIds = e, this.key = n, this.ue = s;
    }
}

class Dt {
    constructor(t, e) {
        this.targetId = t, this.le = e;
    }
}

class Nt {
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
    n = st.ot
    /** An RPC error indicating why the watch failed. */ , s = null) {
        this.state = t, this.targetIds = e, this.resumeToken = n, this.cause = s;
    }
}

/** Tracks the internal state of a Watch target. */ class xt {
    constructor() {
        /**
         * The number of pending responses (adds or removes) that we are waiting on.
         * We only consider targets active that have no pending responses.
         */
        this._e = 0, 
        /**
         * Keeps track of the document changes since the last raised snapshot.
         *
         * These changes are continuously updated as we receive document updates and
         * always reflect the current set of changes against the last issued snapshot.
         */
        this.fe = Ot(), 
        /** See public getters for explanations of these fields. */
        this.de = st.ot, this.we = !1, 
        /**
         * Whether this target state should be included in the next snapshot. We
         * initialize to true so that newly-added targets are included in the next
         * RemoteEvent.
         */
        this.Te = !0;
    }
    /**
     * Whether this target has been marked 'current'.
     *
     * 'Current' has special meaning in the RPC protocol: It implies that the
     * Watch backend has sent us all changes up to the point at which the target
     * was added and that the target is consistent with the rest of the watch
     * stream.
     */    get re() {
        return this.we;
    }
    /** The last resume token sent to us for this target. */    get resumeToken() {
        return this.de;
    }
    /** Whether this target has pending target adds or target removes. */    get Ee() {
        return 0 !== this._e;
    }
    /** Whether we have modified any state that should trigger a snapshot. */    get Ie() {
        return this.Te;
    }
    /**
     * Applies the resume token to the TargetChange, but only when it has a new
     * value. Empty resumeTokens are discarded.
     */    Ae(t) {
        t.rt() > 0 && (this.Te = !0, this.de = t);
    }
    /**
     * Creates a target change from the current set of changes.
     *
     * To reset the document changes after raising this snapshot, call
     * `clearPendingChanges()`.
     */    Re() {
        let t = Pt(), e = Pt(), n = Pt();
        return this.fe.forEach((s, i) => {
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
                b();
            }
        }), new St(this.de, this.we, t, e, n);
    }
    /**
     * Resets the document changes and sets `hasPendingChanges` to false.
     */    me() {
        this.Te = !1, this.fe = Ot();
    }
    Pe(t, e) {
        this.Te = !0, this.fe = this.fe._t(t, e);
    }
    Ve(t) {
        this.Te = !0, this.fe = this.fe.remove(t);
    }
    ge() {
        this._e += 1;
    }
    ye() {
        this._e -= 1;
    }
    pe() {
        this.Te = !0, this.we = !0;
    }
}

/**
 * A helper class to accumulate watch changes into a RemoteEvent.
 */
class kt {
    constructor(t) {
        this.be = t, 
        /** The internal state of all tracked targets. */
        this.ve = new Map, 
        /** Keeps track of the documents to update since the last raised snapshot. */
        this.Se = Tt(), 
        /** A mapping of document keys to their set of target IDs. */
        this.Ce = Ft(), 
        /**
         * A list of targets with existence filter mismatches. These targets are
         * known to be inconsistent and their listens needs to be re-established by
         * RemoteStore.
         */
        this.De = new ft(O);
    }
    /**
     * Processes and adds the DocumentWatchChange to the current set of changes.
     */    Ne(t) {
        for (const e of t.ce) t.ue instanceof gn ? this.xe(e, t.ue) : t.ue instanceof yn && this.ke(e, t.key, t.ue);
        for (const e of t.removedTargetIds) this.ke(e, t.key, t.ue);
    }
    /** Processes and adds the WatchTargetChange to the current set of changes. */    Fe(t) {
        this.Oe(t, e => {
            const n = this.Me(e);
            switch (t.state) {
              case 0 /* NoChange */ :
                this.$e(e) && n.Ae(t.resumeToken);
                break;

              case 1 /* Added */ :
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                n.ye(), n.Ee || 
                // We have a freshly added target, so we need to reset any state
                // that we had previously. This can happen e.g. when remove and add
                // back a target for existence filter mismatches.
                n.me(), n.Ae(t.resumeToken);
                break;

              case 2 /* Removed */ :
                // We need to keep track of removed targets to we can post-filter and
                // remove any target changes.
                // We need to decrement the number of pending acks needed from watch
                // for this targetId.
                n.ye(), n.Ee || this.removeTarget(e);
                break;

              case 3 /* Current */ :
                this.$e(e) && (n.pe(), n.Ae(t.resumeToken));
                break;

              case 4 /* Reset */ :
                this.$e(e) && (
                // Reset the target and synthesizes removes for all existing
                // documents. The backend will re-add any documents that still
                // match the target before it sends the next global snapshot.
                this.Le(e), n.Ae(t.resumeToken));
                break;

              default:
                b();
            }
        });
    }
    /**
     * Iterates over all targetIds that the watch change applies to: either the
     * targetIds explicitly listed in the change or the targetIds of all currently
     * active targets.
     */    Oe(t, e) {
        t.targetIds.length > 0 ? t.targetIds.forEach(e) : this.ve.forEach((t, n) => {
            this.$e(n) && e(n);
        });
    }
    /**
     * Handles existence filters and synthesizes deletes for filter mismatches.
     * Targets that are invalidated by filter mismatches are added to
     * `pendingTargetResets`.
     */    qe(t) {
        const e = t.targetId, n = t.le.count, s = this.Be(e);
        if (s) {
            const t = s.target;
            if (nt(t)) if (0 === n) {
                // The existence filter told us the document does not exist. We deduce
                // that this document does not exist and apply a deleted document to
                // our updates. Without applying this deleted document there might be
                // another query that will raise this document as part of a snapshot
                // until it is resolved, essentially exposing inconsistency between
                // queries.
                const n = new j(t.path);
                this.ke(e, n, new yn(n, q.min()));
            } else v(1 === n); else {
                this.Ue(e) !== n && (
                // Existence filter mismatch: We reset the mapping and raise a new
                // snapshot with `isFromCache:true`.
                this.Le(e), this.De = this.De.add(e));
            }
        }
    }
    /**
     * Converts the currently accumulated state into a remote event at the
     * provided snapshot version. Resets the accumulated changes before returning.
     */    We(t) {
        const e = new Map;
        this.ve.forEach((n, s) => {
            const i = this.Be(s);
            if (i) {
                if (n.re && nt(i.target)) {
                    // Document queries for document that don't exist can produce an empty
                    // result set. To update our local cache, we synthesize a document
                    // delete if we have not previously received the document. This
                    // resolves the limbo state of the document, removing it from
                    // limboDocumentRefs.
                    // TODO(dimond): Ideally we would have an explicit lookup target
                    // instead resulting in an explicit delete message and we could
                    // remove this special logic.
                    const e = new j(i.target.path);
                    null !== this.Se.get(e) || this.Ke(s, e) || this.ke(s, e, new yn(e, t));
                }
                n.Ie && (e.set(s, n.Re()), n.me());
            }
        });
        let n = Pt();
        // We extract the set of limbo-only document updates as the GC logic
        // special-cases documents that do not appear in the target cache.
        
        // TODO(gsoltis): Expand on this comment once GC is available in the JS
        // client.
                this.Ce.forEach((t, e) => {
            let s = !0;
            e.Lt(t => {
                const e = this.Be(t);
                return !e || 2 /* LimboResolution */ === e.ht || (s = !1, !1);
            }), s && (n = n.add(t));
        });
        const s = new vt(t, e, this.De, this.Se, n);
        return this.Se = Tt(), this.Ce = Ft(), this.De = new ft(O), s;
    }
    /**
     * Adds the provided document to the internal list of document updates and
     * its document key to the given target's mapping.
     */
    // Visible for testing.
    xe(t, e) {
        if (!this.$e(t)) return;
        const n = this.Ke(t, e.key) ? 2 /* Modified */ : 0 /* Added */;
        this.Me(t).Pe(e.key, n), this.Se = this.Se._t(e.key, e), this.Ce = this.Ce._t(e.key, this.je(e.key).add(t));
    }
    /**
     * Removes the provided document from the target mapping. If the
     * document no longer matches the target, but the document's state is still
     * known (e.g. we know that the document was deleted or we received the change
     * that caused the filter mismatch), the new document can be provided
     * to update the remote document cache.
     */
    // Visible for testing.
    ke(t, e, n) {
        if (!this.$e(t)) return;
        const s = this.Me(t);
        this.Ke(t, e) ? s.Pe(e, 1 /* Removed */) : 
        // The document may have entered and left the target before we raised a
        // snapshot, so we can just ignore the change.
        s.Ve(e), this.Ce = this.Ce._t(e, this.je(e).delete(t)), n && (this.Se = this.Se._t(e, n));
    }
    removeTarget(t) {
        this.ve.delete(t);
    }
    /**
     * Returns the current count of documents in the target. This includes both
     * the number of documents that the LocalStore considers to be part of the
     * target as well as any accumulated changes.
     */    Ue(t) {
        const e = this.Me(t).Re();
        return this.be.Qe(t).size + e.oe.size - e.ae.size;
    }
    /**
     * Increment the number of acks needed from watch before we can consider the
     * server to be 'in-sync' with the client's active targets.
     */    ge(t) {
        this.Me(t).ge();
    }
    Me(t) {
        let e = this.ve.get(t);
        return e || (e = new xt, this.ve.set(t, e)), e;
    }
    je(t) {
        let e = this.Ce.get(t);
        return e || (e = new ft(O), this.Ce = this.Ce._t(t, e)), e;
    }
    /**
     * Verifies that the user is still interested in this target (by calling
     * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
     * from watch.
     */    $e(t) {
        const e = null !== this.Be(t);
        return e || V("WatchChangeAggregator", "Detected inactive target", t), e;
    }
    /**
     * Returns the TargetData for an active target (i.e. a target that the user
     * is still interested in that has no outstanding target change requests).
     */    Be(t) {
        const e = this.ve.get(t);
        return e && e.Ee ? null : this.be.Ge(t);
    }
    /**
     * Resets the state of a Watch target to its initial state (e.g. sets
     * 'current' to false, clears the resume token and removes its target mapping
     * from all documents).
     */    Le(t) {
        this.ve.set(t, new xt);
        this.be.Qe(t).forEach(e => {
            this.ke(t, e, /*updatedDocument=*/ null);
        });
    }
    /**
     * Returns whether the LocalStore considers the document to be part of the
     * specified target.
     */    Ke(t, e) {
        return this.be.Qe(t).has(e);
    }
}

function Ft() {
    return new ut(j.D);
}

function Ot() {
    return new ut(j.D);
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
 */ function Mt(t) {
    let e = 0;
    for (const n in t) Object.prototype.hasOwnProperty.call(t, n) && e++;
    return e;
}

function $t(t, e) {
    for (const n in t) Object.prototype.hasOwnProperty.call(t, n) && e(n, t[n]);
}

function Lt(t) {
    for (const e in t) if (Object.prototype.hasOwnProperty.call(t, e)) return !1;
    return !0;
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
 */ function qt(t) {
    var e, n;
    return "server_timestamp" === (null === (n = ((null === (e = null == t ? void 0 : t.mapValue) || void 0 === e ? void 0 : e.fields) || {}).__type__) || void 0 === n ? void 0 : n.stringValue);
}

/**
 * Creates a new ServerTimestamp proto value (using the internal format).
 */
/**
 * Returns the local time at which this timestamp was first set.
 */
function Bt(t) {
    const e = Jt(t.mapValue.fields.__local_write_time__.timestampValue);
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
const Ut = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

/** Extracts the backend's type order for the provided value. */ function Wt(t) {
    return "nullValue" in t ? 0 /* NullValue */ : "booleanValue" in t ? 1 /* BooleanValue */ : "integerValue" in t || "doubleValue" in t ? 2 /* NumberValue */ : "timestampValue" in t ? 3 /* TimestampValue */ : "stringValue" in t ? 5 /* StringValue */ : "bytesValue" in t ? 6 /* BlobValue */ : "referenceValue" in t ? 7 /* RefValue */ : "geoPointValue" in t ? 8 /* GeoPointValue */ : "arrayValue" in t ? 9 /* ArrayValue */ : "mapValue" in t ? qt(t) ? 4 /* ServerTimestampValue */ : 10 /* ObjectValue */ : b();
}

/** Tests `left` and `right` for equality based on the backend semantics. */ function Kt(t, e) {
    const n = Wt(t);
    if (n !== Wt(e)) return !1;
    switch (n) {
      case 0 /* NullValue */ :
        return !0;

      case 1 /* BooleanValue */ :
        return t.booleanValue === e.booleanValue;

      case 4 /* ServerTimestampValue */ :
        return Bt(t).isEqual(Bt(e));

      case 3 /* TimestampValue */ :
        return function(t, e) {
            if ("string" == typeof t.timestampValue && "string" == typeof e.timestampValue && t.timestampValue.length === e.timestampValue.length) 
            // Use string equality for ISO 8601 timestamps
            return t.timestampValue === e.timestampValue;
            const n = Jt(t.timestampValue), s = Jt(e.timestampValue);
            return n.seconds === s.seconds && n.nanos === s.nanos;
        }(t, e);

      case 5 /* StringValue */ :
        return t.stringValue === e.stringValue;

      case 6 /* BlobValue */ :
        return function(t, e) {
            return Xt(t.bytesValue).isEqual(Xt(e.bytesValue));
        }(t, e);

      case 7 /* RefValue */ :
        return t.referenceValue === e.referenceValue;

      case 8 /* GeoPointValue */ :
        return function(t, e) {
            return Yt(t.geoPointValue.latitude) === Yt(e.geoPointValue.latitude) && Yt(t.geoPointValue.longitude) === Yt(e.geoPointValue.longitude);
        }(t, e);

      case 2 /* NumberValue */ :
        return function(t, e) {
            if ("integerValue" in t && "integerValue" in e) return Yt(t.integerValue) === Yt(e.integerValue);
            if ("doubleValue" in t && "doubleValue" in e) {
                const n = Yt(t.doubleValue), s = Yt(e.doubleValue);
                return n === s ? H(n) === H(s) : isNaN(n) && isNaN(s);
            }
            return !1;
        }(t, e);

      case 9 /* ArrayValue */ :
        return M(t.arrayValue.values || [], e.arrayValue.values || [], Kt);

      case 10 /* ObjectValue */ :
        return function(t, e) {
            const n = t.mapValue.fields || {}, s = e.mapValue.fields || {};
            if (Mt(n) !== Mt(s)) return !1;
            for (const t in n) if (n.hasOwnProperty(t) && (void 0 === s[t] || !Kt(n[t], s[t]))) return !1;
            return !0;
        }
        /** Returns true if the ArrayValue contains the specified element. */ (t, e);

      default:
        return b();
    }
}

function jt(t, e) {
    return void 0 !== (t.values || []).find(t => Kt(t, e));
}

function Qt(t, e) {
    const n = Wt(t), s = Wt(e);
    if (n !== s) return O(n, s);
    switch (n) {
      case 0 /* NullValue */ :
        return 0;

      case 1 /* BooleanValue */ :
        return O(t.booleanValue, e.booleanValue);

      case 2 /* NumberValue */ :
        return function(t, e) {
            const n = Yt(t.integerValue || t.doubleValue), s = Yt(e.integerValue || e.doubleValue);
            return n < s ? -1 : n > s ? 1 : n === s ? 0 : 
            // one or both are NaN.
            isNaN(n) ? isNaN(s) ? 0 : -1 : 1;
        }(t, e);

      case 3 /* TimestampValue */ :
        return Gt(t.timestampValue, e.timestampValue);

      case 4 /* ServerTimestampValue */ :
        return Gt(Bt(t), Bt(e));

      case 5 /* StringValue */ :
        return O(t.stringValue, e.stringValue);

      case 6 /* BlobValue */ :
        return function(t, e) {
            const n = Xt(t), s = Xt(e);
            return n.p(s);
        }(t.bytesValue, e.bytesValue);

      case 7 /* RefValue */ :
        return function(t, e) {
            const n = t.split("/"), s = e.split("/");
            for (let t = 0; t < n.length && t < s.length; t++) {
                const e = O(n[t], s[t]);
                if (0 !== e) return e;
            }
            return O(n.length, s.length);
        }(t.referenceValue, e.referenceValue);

      case 8 /* GeoPointValue */ :
        return function(t, e) {
            const n = O(Yt(t.latitude), Yt(e.latitude));
            if (0 !== n) return n;
            return O(Yt(t.longitude), Yt(e.longitude));
        }(t.geoPointValue, e.geoPointValue);

      case 9 /* ArrayValue */ :
        return function(t, e) {
            const n = t.values || [], s = e.values || [];
            for (let t = 0; t < n.length && t < s.length; ++t) {
                const e = Qt(n[t], s[t]);
                if (e) return e;
            }
            return O(n.length, s.length);
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
                const e = O(s[t], r[t]);
                if (0 !== e) return e;
                const o = Qt(n[s[t]], i[r[t]]);
                if (0 !== o) return o;
            }
            return O(s.length, r.length);
        }
        /**
 * Generates the canonical ID for the provided field value (as used in Target
 * serialization).
 */ (t.mapValue, e.mapValue);

      default:
        throw b();
    }
}

function Gt(t, e) {
    if ("string" == typeof t && "string" == typeof e && t.length === e.length) return O(t, e);
    const n = Jt(t), s = Jt(e), i = O(n.seconds, s.seconds);
    return 0 !== i ? i : O(n.nanos, s.nanos);
}

function zt(t) {
    return Ht(t);
}

function Ht(t) {
    return "nullValue" in t ? "null" : "booleanValue" in t ? "" + t.booleanValue : "integerValue" in t ? "" + t.integerValue : "doubleValue" in t ? "" + t.doubleValue : "timestampValue" in t ? function(t) {
        const e = Jt(t);
        return `time(${e.seconds},${e.nanos})`;
    }(t.timestampValue) : "stringValue" in t ? t.stringValue : "bytesValue" in t ? Xt(t.bytesValue).toBase64() : "referenceValue" in t ? (n = t.referenceValue, 
    j.Y(n).toString()) : "geoPointValue" in t ? `geo(${(e = t.geoPointValue).latitude},${e.longitude})` : "arrayValue" in t ? function(t) {
        let e = "[", n = !0;
        for (const s of t.values || []) n ? n = !1 : e += ",", e += Ht(s);
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
        for (const i of e) s ? s = !1 : n += ",", n += `${i}:${Ht(t.fields[i])}`;
        return n + "}";
    }(t.mapValue) : b();
    var e, n;
}

function Jt(t) {
    // The json interface (for the browser) will return an iso timestamp string,
    // while the proto js library (for node) will return a
    // google.protobuf.Timestamp instance.
    if (v(!!t), "string" == typeof t) {
        // The date string can have higher precision (nanos) than the Date class
        // (millis), so we do some custom parsing here.
        // Parse the nanos right out of the string.
        let e = 0;
        const n = Ut.exec(t);
        if (v(!!n), n[1]) {
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
        seconds: Yt(t.seconds),
        nanos: Yt(t.nanos)
    };
}

/**
 * Converts the possible Proto types for numbers into a JavaScript number.
 * Returns 0 if the value is not numeric.
 */ function Yt(t) {
    // TODO(bjornick): Handle int64 greater than 53 bits.
    return "number" == typeof t ? t : "string" == typeof t ? Number(t) : 0;
}

/** Converts the possible Proto types for Blobs into a ByteString. */ function Xt(t) {
    return "string" == typeof t ? st.fromBase64String(t) : st.fromUint8Array(t);
}

/** Returns a reference value for the provided database and key. */ function Zt(t, e) {
    return {
        referenceValue: `projects/${t.projectId}/databases/${t.database}/documents/${e.path.U()}`
    };
}

/** Returns true if `value` is an IntegerValue . */ function te(t) {
    return !!t && "integerValue" in t;
}

/** Returns true if `value` is a DoubleValue. */
/** Returns true if `value` is an ArrayValue. */
function ee(t) {
    return !!t && "arrayValue" in t;
}

/** Returns true if `value` is a NullValue. */ function ne(t) {
    return !!t && "nullValue" in t;
}

/** Returns true if `value` is NaN. */ function se(t) {
    return !!t && "doubleValue" in t && isNaN(Number(t.doubleValue));
}

/** Returns true if `value` is a MapValue. */ function ie(t) {
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
 */ const re = (() => {
    const t = {
        asc: "ASCENDING",
        desc: "DESCENDING"
    };
    return t;
})(), oe = (() => {
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
class he {
    constructor(t, e) {
        this.et = t, this.ze = e;
    }
}

/**
 * Returns an IntegerValue for `value`.
 */
function ae(t) {
    return {
        integerValue: "" + t
    };
}

/**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */ function ce(t, e) {
    if (t.ze) {
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
        doubleValue: H(e) ? "-0" : e
    };
}

/**
 * Returns a value for a number that's appropriate to put into a proto.
 * The return value is an IntegerValue if it can safely represent the value,
 * otherwise a DoubleValue is returned.
 */ function ue(t, e) {
    return J(e) ? ae(e) : ce(t, e);
}

/**
 * Returns a value for a Date that's appropriate to put into a proto.
 */ function le(t, e) {
    if (t.ze) {
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
function _e(t, e) {
    return t.ze ? e.toBase64() : e.toUint8Array();
}

/**
 * Returns a ByteString based on the proto string value.
 */ function fe(t, e) {
    return le(t, e.S());
}

function de(t) {
    return v(!!t), q.g(function(t) {
        const e = Jt(t);
        return new L(e.seconds, e.nanos);
    }(t));
}

function we(t, e) {
    return function(t) {
        return new U([ "projects", t.projectId, "databases", t.database ]);
    }(t).child("documents").child(e).U();
}

function Te(t) {
    const e = U.W(t);
    return v(qe(e)), e;
}

function Ee(t, e) {
    return we(t.et, e.path);
}

function Ie(t, e) {
    const n = Te(e);
    return v(n.get(1) === t.et.projectId), v(!n.get(3) && !t.et.database || n.get(3) === t.et.database), 
    new j(Pe(n));
}

function Ae(t, e) {
    return we(t.et, e);
}

function Re(t) {
    const e = Te(t);
    // In v1beta1 queries for collections at the root did not have a trailing
    // "/documents". In v1 all resource paths contain "/documents". Preserve the
    // ability to read the v1beta1 form for compatibility with queries persisted
    // in the local target cache.
        return 4 === e.length ? U.K() : Pe(e);
}

function me(t) {
    return new U([ "projects", t.et.projectId, "databases", t.et.database ]).U();
}

function Pe(t) {
    return v(t.length > 4 && "documents" === t.get(4)), t.k(5);
}

/** Creates an api.Document from key and fields (but no create/update time) */ function Ve(t, e, n) {
    return {
        name: Ee(t, e),
        fields: n.proto.mapValue.fields
    };
}

function ge(t, e) {
    return "found" in e ? function(t, e) {
        v(!!e.found), e.found.name, e.found.updateTime;
        const n = Ie(t, e.found.name), s = de(e.found.updateTime), i = new Rn({
            mapValue: {
                fields: e.found.fields
            }
        });
        return new gn(n, s, i, {});
    }(t, e) : "missing" in e ? function(t, e) {
        v(!!e.missing), v(!!e.readTime);
        const n = Ie(t, e.missing), s = de(e.readTime);
        return new yn(n, s);
    }(t, e) : b();
}

function ye(t, e) {
    let n;
    if ("targetChange" in e) {
        e.targetChange;
        // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
        // if unset
        const s = function(t) {
            return "NO_CHANGE" === t ? 0 /* NoChange */ : "ADD" === t ? 1 /* Added */ : "REMOVE" === t ? 2 /* Removed */ : "CURRENT" === t ? 3 /* Current */ : "RESET" === t ? 4 /* Reset */ : b();
        }(e.targetChange.targetChangeType || "NO_CHANGE"), i = e.targetChange.targetIds || [], r = function(t, e) {
            return t.ze ? (v(void 0 === e || "string" == typeof e), st.fromBase64String(e || "")) : (v(void 0 === e || e instanceof Uint8Array), 
            st.fromUint8Array(e || new Uint8Array));
        }(t, e.targetChange.resumeToken), o = e.targetChange.cause, h = o && function(t) {
            const e = void 0 === t.code ? C.UNKNOWN : ct(t.code);
            return new D(e, t.message || "");
        }
        /**
 * Returns a value for a number (or null) that's appropriate to put into
 * a google.protobuf.Int32Value proto.
 * DO NOT USE THIS FOR ANYTHING ELSE.
 * This method cheats. It's typed as returning "number" because that's what
 * our generated proto interfaces say Int32Value must be. But GRPC actually
 * expects a { value: <number> } struct.
 */ (o);
        n = new Nt(s, i, r, h || null);
    } else if ("documentChange" in e) {
        e.documentChange;
        const s = e.documentChange;
        s.document, s.document.name, s.document.updateTime;
        const i = Ie(t, s.document.name), r = de(s.document.updateTime), o = new Rn({
            mapValue: {
                fields: s.document.fields
            }
        }), h = new gn(i, r, o, {}), a = s.targetIds || [], c = s.removedTargetIds || [];
        n = new Ct(a, c, h.key, h);
    } else if ("documentDelete" in e) {
        e.documentDelete;
        const s = e.documentDelete;
        s.document;
        const i = Ie(t, s.document), r = s.readTime ? de(s.readTime) : q.min(), o = new yn(i, r), h = s.removedTargetIds || [];
        n = new Ct([], h, o.key, o);
    } else if ("documentRemove" in e) {
        e.documentRemove;
        const s = e.documentRemove;
        s.document;
        const i = Ie(t, s.document), r = s.removedTargetIds || [];
        n = new Ct([], r, i, null);
    } else {
        if (!("filter" in e)) return b();
        {
            e.filter;
            const t = e.filter;
            t.targetId;
            const s = t.count || 0, i = new rt(s), r = t.targetId;
            n = new Dt(r, i);
        }
    }
    return n;
}

function pe(t, e) {
    let n;
    if (e instanceof _n) n = {
        update: Ve(t, e.key, e.value)
    }; else if (e instanceof In) n = {
        delete: Ee(t, e.key)
    }; else if (e instanceof fn) n = {
        update: Ve(t, e.key, e.data),
        updateMask: Le(e.He)
    }; else if (e instanceof wn) n = {
        transform: {
            document: Ee(t, e.key),
            fieldTransforms: e.fieldTransforms.map(t => function(t, e) {
                const n = e.transform;
                if (n instanceof je) return {
                    fieldPath: e.field.U(),
                    setToServerValue: "REQUEST_TIME"
                };
                if (n instanceof Qe) return {
                    fieldPath: e.field.U(),
                    appendMissingElements: {
                        values: n.elements
                    }
                };
                if (n instanceof ze) return {
                    fieldPath: e.field.U(),
                    removeAllFromArray: {
                        values: n.elements
                    }
                };
                if (n instanceof Je) return {
                    fieldPath: e.field.U(),
                    increment: n.Je
                };
                throw b();
            }(0, t))
        }
    }; else {
        if (!(e instanceof An)) return b();
        n = {
            verify: Ee(t, e.key)
        };
    }
    return e.Xe.Ye || (n.currentDocument = function(t, e) {
        return void 0 !== e.updateTime ? {
            updateTime: fe(t, e.updateTime)
        } : void 0 !== e.exists ? {
            exists: e.exists
        } : b();
    }(t, e.Xe)), n;
}

function be(t, e) {
    const n = e.currentDocument ? function(t) {
        return void 0 !== t.updateTime ? sn.updateTime(de(t.updateTime)) : void 0 !== t.exists ? sn.exists(t.exists) : sn.Ze();
    }(e.currentDocument) : sn.Ze();
    if (e.update) {
        e.update.name;
        const s = Ie(t, e.update.name), i = new Rn({
            mapValue: {
                fields: e.update.fields
            }
        });
        if (e.updateMask) {
            const t = function(t) {
                const e = t.fieldPaths || [];
                return new Ze(e.map(t => K.J(t)));
            }(e.updateMask);
            return new fn(s, i, t, n);
        }
        return new _n(s, i, n);
    }
    if (e.delete) {
        const s = Ie(t, e.delete);
        return new In(s, n);
    }
    if (e.transform) {
        const s = Ie(t, e.transform.document), i = e.transform.fieldTransforms.map(e => function(t, e) {
            let n = null;
            if ("setToServerValue" in e) v("REQUEST_TIME" === e.setToServerValue), n = new je; else if ("appendMissingElements" in e) {
                const t = e.appendMissingElements.values || [];
                n = new Qe(t);
            } else if ("removeAllFromArray" in e) {
                const t = e.removeAllFromArray.values || [];
                n = new ze(t);
            } else "increment" in e ? n = new Je(t, e.increment) : b();
            const s = K.J(e.fieldPath);
            return new tn(s, n);
        }(t, e));
        return v(!0 === n.exists), new wn(s, i);
    }
    if (e.verify) {
        const s = Ie(t, e.verify);
        return new An(s, n);
    }
    return b();
}

function ve(t, e) {
    return t && t.length > 0 ? (v(void 0 !== e), t.map(t => function(t, e) {
        // NOTE: Deletes don't have an updateTime.
        let n = t.updateTime ? de(t.updateTime) : de(e);
        n.isEqual(q.min()) && (
        // The Firestore Emulator currently returns an update time of 0 for
        // deletes of non-existing documents (rather than null). This breaks the
        // test "get deleted doc while offline with source=cache" as NoDocuments
        // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
        // TODO(#2149): Remove this when Emulator is fixed
        n = de(e));
        let s = null;
        return t.transformResults && t.transformResults.length > 0 && (s = t.transformResults), 
        new nn(n, s);
    }(t, e))) : [];
}

function Se(t, e) {
    return {
        documents: [ Ae(t, e.path) ]
    };
}

function Ce(t, e) {
    // Dissect the path into parent, collectionId, and optional key filter.
    const n = {
        structuredQuery: {}
    }, s = e.path;
    null !== e.collectionGroup ? (n.parent = Ae(t, s), n.structuredQuery.from = [ {
        collectionId: e.collectionGroup,
        allDescendants: !0
    } ]) : (n.parent = Ae(t, s.F()), n.structuredQuery.from = [ {
        collectionId: s.M()
    } ]);
    const i = function(t) {
        if (0 === t.length) return;
        const e = t.map(t => 
        // visible for testing
        function(t) {
            if ("==" /* EQUAL */ === t.op) {
                if (se(t.value)) return {
                    unaryFilter: {
                        field: Fe(t.field),
                        op: "IS_NAN"
                    }
                };
                if (ne(t.value)) return {
                    unaryFilter: {
                        field: Fe(t.field),
                        op: "IS_NULL"
                    }
                };
            } else if ("!=" /* NOT_EQUAL */ === t.op) {
                if (se(t.value)) return {
                    unaryFilter: {
                        field: Fe(t.field),
                        op: "IS_NOT_NAN"
                    }
                };
                if (ne(t.value)) return {
                    unaryFilter: {
                        field: Fe(t.field),
                        op: "IS_NOT_NULL"
                    }
                };
            }
            return {
                fieldFilter: {
                    field: Fe(t.field),
                    op: (e = t.op, oe[e]),
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
        return t.map(t => 
        // visible for testing
        function(t) {
            return {
                field: Fe(t.field),
                direction: (e = t.dir, re[e])
            };
            // visible for testing
            var e;
            // visible for testing
                }(t));
    }(e.orderBy);
    r && (n.structuredQuery.orderBy = r);
    const o = function(t, e) {
        return t.ze || z(e) ? e : {
            value: e
        };
    }
    /**
 * Returns a number (or null) from a google.protobuf.Int32Value proto.
 */ (t, e.limit);
    return null !== o && (n.structuredQuery.limit = o), e.startAt && (n.structuredQuery.startAt = xe(e.startAt)), 
    e.endAt && (n.structuredQuery.endAt = xe(e.endAt)), n;
}

function De(t) {
    let e = Re(t.parent);
    const n = t.structuredQuery, s = n.from ? n.from.length : 0;
    let i = null;
    if (s > 0) {
        v(1 === s);
        const t = n.from[0];
        t.allDescendants ? i = t.collectionId : e = e.child(t.collectionId);
    }
    let r = [];
    n.where && (r = function t(e) {
        return e ? void 0 !== e.unaryFilter ? [ $e(e) ] : void 0 !== e.fieldFilter ? [ Me(e) ] : void 0 !== e.compositeFilter ? e.compositeFilter.filters.map(e => t(e)).reduce((t, e) => t.concat(e)) : b() : [];
    }(n.where));
    let o = [];
    n.orderBy && (o = n.orderBy.map(t => function(t) {
        return new Zn(Oe(t.field), function(t) {
            switch (t) {
              case "ASCENDING":
                return "asc" /* ASCENDING */;

              case "DESCENDING":
                return "desc" /* DESCENDING */;

              default:
                return;
            }
        }(t.direction));
    }(t)));
    let h = null;
    n.limit && (h = function(t) {
        let e;
        return e = "object" == typeof t ? t.value : t, z(e) ? null : e;
    }(n.limit));
    let a = null;
    n.startAt && (a = ke(n.startAt));
    let c = null;
    return n.endAt && (c = ke(n.endAt)), xn(Sn(e, i, o, r, h, "F" /* First */ , a, c));
}

function Ne(t, e) {
    const n = function(t, e) {
        switch (e) {
          case 0 /* Listen */ :
            return null;

          case 1 /* ExistenceFilterMismatch */ :
            return "existence-filter-mismatch";

          case 2 /* LimboResolution */ :
            return "limbo-document";

          default:
            return b();
        }
    }(0, e.ht);
    return null == n ? null : {
        "goog-listen-tags": n
    };
}

function xe(t) {
    return {
        before: t.before,
        values: t.position
    };
}

function ke(t) {
    const e = !!t.before, n = t.values || [];
    return new Hn(n, e);
}

function Fe(t) {
    return {
        fieldPath: t.U()
    };
}

function Oe(t) {
    return K.J(t.fieldPath);
}

function Me(t) {
    return Ln.create(Oe(t.fieldFilter.field), function(t) {
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
            return b();
        }
    }(t.fieldFilter.op), t.fieldFilter.value);
}

function $e(t) {
    switch (t.unaryFilter.op) {
      case "IS_NAN":
        const e = Oe(t.unaryFilter.field);
        return Ln.create(e, "==" /* EQUAL */ , {
            doubleValue: NaN
        });

      case "IS_NULL":
        const n = Oe(t.unaryFilter.field);
        return Ln.create(n, "==" /* EQUAL */ , {
            nullValue: "NULL_VALUE"
        });

      case "IS_NOT_NAN":
        const s = Oe(t.unaryFilter.field);
        return Ln.create(s, "!=" /* NOT_EQUAL */ , {
            doubleValue: NaN
        });

      case "IS_NOT_NULL":
        const i = Oe(t.unaryFilter.field);
        return Ln.create(i, "!=" /* NOT_EQUAL */ , {
            nullValue: "NULL_VALUE"
        });

      case "OPERATOR_UNSPECIFIED":
      default:
        return b();
    }
}

function Le(t) {
    const e = [];
    return t.fields.forEach(t => e.push(t.U())), {
        fieldPaths: e
    };
}

function qe(t) {
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
/** Represents a transform within a TransformMutation. */ class Be {
    constructor() {
        // Make sure that the structural type of `TransformOperation` is unique.
        // See https://github.com/microsoft/TypeScript/issues/5451
        this.tn = void 0;
    }
}

/**
 * Computes the local transform result against the provided `previousValue`,
 * optionally using the provided localWriteTime.
 */ function Ue(t, e, n) {
    return t instanceof je ? function(t, e) {
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
 */ (n, e) : t instanceof Qe ? Ge(t, e) : t instanceof ze ? He(t, e) : function(t, e) {
        // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
        // precision and resolves overflows by reducing precision, we do not
        // manually cap overflows at 2^63.
        const n = Ke(t, e), s = Ye(n) + Ye(t.Je);
        return te(n) && te(t.Je) ? ae(s) : ce(t.serializer, s);
    }(t, e);
}

/**
 * Computes a final transform result after the transform has been acknowledged
 * by the server, potentially using the server-provided transformResult.
 */ function We(t, e, n) {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return t instanceof Qe ? Ge(t, e) : t instanceof ze ? He(t, e) : n;
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
 */ function Ke(t, e) {
    return t instanceof Je ? te(n = e) || function(t) {
        return !!t && "doubleValue" in t;
    }
    /** Returns true if `value` is either an IntegerValue or a DoubleValue. */ (n) ? e : {
        integerValue: 0
    } : null;
    var n;
}

/** Transforms a value into a server-generated timestamp. */
class je extends Be {}

/** Transforms an array value via a union operation. */ class Qe extends Be {
    constructor(t) {
        super(), this.elements = t;
    }
}

function Ge(t, e) {
    const n = Xe(e);
    for (const e of t.elements) n.some(t => Kt(t, e)) || n.push(e);
    return {
        arrayValue: {
            values: n
        }
    };
}

/** Transforms an array value via a remove operation. */ class ze extends Be {
    constructor(t) {
        super(), this.elements = t;
    }
}

function He(t, e) {
    let n = Xe(e);
    for (const e of t.elements) n = n.filter(t => !Kt(t, e));
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
 */ class Je extends Be {
    constructor(t, e) {
        super(), this.serializer = t, this.Je = e;
    }
}

function Ye(t) {
    return Yt(t.integerValue || t.doubleValue);
}

function Xe(t) {
    return ee(t) && t.arrayValue.values ? t.arrayValue.values.slice() : [];
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
 */ class Ze {
    constructor(t) {
        this.fields = t, 
        // TODO(dimond): validation of FieldMask
        // Sort the field mask to support `FieldMask.isEqual()` and assert below.
        t.sort(K.D);
    }
    /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */    en(t) {
        for (const e of this.fields) if (e.L(t)) return !0;
        return !1;
    }
    isEqual(t) {
        return M(this.fields, t.fields, (t, e) => t.isEqual(e));
    }
}

/** A field path and the TransformOperation to perform upon it. */ class tn {
    constructor(t, e) {
        this.field = t, this.transform = e;
    }
}

function en(t, e) {
    return t.field.isEqual(e.field) && function(t, e) {
        return t instanceof Qe && e instanceof Qe || t instanceof ze && e instanceof ze ? M(t.elements, e.elements, Kt) : t instanceof Je && e instanceof Je ? Kt(t.Je, e.Je) : t instanceof je && e instanceof je;
    }(t.transform, e.transform);
}

/** The result of successfully applying a mutation to the backend. */ class nn {
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
 */ class sn {
    constructor(t, e) {
        this.updateTime = t, this.exists = e;
    }
    /** Creates a new empty Precondition. */    static Ze() {
        return new sn;
    }
    /** Creates a new Precondition with an exists flag. */    static exists(t) {
        return new sn(void 0, t);
    }
    /** Creates a new Precondition based on a version a document exists at. */    static updateTime(t) {
        return new sn(t);
    }
    /** Returns whether this Precondition is empty. */    get Ye() {
        return void 0 === this.updateTime && void 0 === this.exists;
    }
    isEqual(t) {
        return this.exists === t.exists && (this.updateTime ? !!t.updateTime && this.updateTime.isEqual(t.updateTime) : !t.updateTime);
    }
}

/**
 * Returns true if the preconditions is valid for the given document
 * (or null if no document is available).
 */ function rn(t, e) {
    return void 0 !== t.updateTime ? e instanceof gn && e.version.isEqual(t.updateTime) : void 0 === t.exists || t.exists === e instanceof gn;
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
 */ class on {}

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
 */ function hn(t, e, n) {
    return t instanceof _n ? function(t, e, n) {
        // Unlike applySetMutationToLocalView, if we're applying a mutation to a
        // remote document the server has accepted the mutation so the precondition
        // must have held.
        return new gn(t.key, n.version, t.value, {
            hasCommittedMutations: !0
        });
    }(t, 0, n) : t instanceof fn ? function(t, e, n) {
        if (!rn(t.Xe, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new pn(t.key, n.version);
        const s = dn(t, e);
        return new gn(t.key, n.version, s, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : t instanceof wn ? function(t, e, n) {
        if (v(null != n.transformResults), !rn(t.Xe, e)) 
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new pn(t.key, n.version);
        const s = Tn(t, e), i = 
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
            v(t.length === n.length);
            for (let i = 0; i < n.length; i++) {
                const r = t[i], o = r.transform;
                let h = null;
                e instanceof gn && (h = e.field(r.field)), s.push(We(o, h, n[i]));
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
 */ (t.fieldTransforms, e, n.transformResults), r = n.version, o = En(t, s.data(), i);
        return new gn(t.key, r, o, {
            hasCommittedMutations: !0
        });
    }(t, e, n) : function(t, e, n) {
        // Unlike applyToLocalView, if we're applying a mutation to a remote
        // document the server has accepted the mutation so the precondition must
        // have held.
        return new yn(t.key, n.version, {
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
 */ function an(t, e, n, s) {
    return t instanceof _n ? function(t, e) {
        if (!rn(t.Xe, e)) return e;
        const n = ln(e);
        return new gn(t.key, n, t.value, {
            nn: !0
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
 */ (t, e) : t instanceof fn ? function(t, e) {
        if (!rn(t.Xe, e)) return e;
        const n = ln(e), s = dn(t, e);
        return new gn(t.key, n, s, {
            nn: !0
        });
    }
    /**
 * Patches the data of document if available or creates a new document. Note
 * that this does not check whether or not the precondition of this patch
 * holds.
 */ (t, e) : t instanceof wn ? function(t, e, n, s) {
        if (!rn(t.Xe, e)) return e;
        const i = Tn(t, e), r = function(t, e, n, s) {
            const i = [];
            for (const r of t) {
                const t = r.transform;
                let o = null;
                n instanceof gn && (o = n.field(r.field)), null === o && s instanceof gn && (
                // If the current document does not contain a value for the mutated
                // field, use the value that existed before applying this mutation
                // batch. This solves an edge case where a PatchMutation clears the
                // values in a nested map before the TransformMutation is applied.
                o = s.field(r.field)), i.push(Ue(t, o, e));
            }
            return i;
        }(t.fieldTransforms, n, e, s), o = En(t, i.data(), r);
        return new gn(t.key, i.version, o, {
            nn: !0
        });
    }(t, e, s, n) : function(t, e) {
        if (!rn(t.Xe, e)) return e;
        return new yn(t.key, q.min());
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
 */ function cn(t, e) {
    return t instanceof wn ? function(t, e) {
        let n = null;
        for (const s of t.fieldTransforms) {
            const t = e instanceof gn ? e.field(s.field) : void 0, i = Ke(s.transform, t || null);
            null != i && (n = null == n ? (new mn).set(s.field, i) : n.set(s.field, i));
        }
        return n ? n.sn() : null;
    }
    /**
 * Asserts that the given MaybeDocument is actually a Document and verifies
 * that it matches the key for this mutation. Since we only support
 * transformations with precondition exists this method is guaranteed to be
 * safe.
 */ (t, e) : null;
}

function un(t, e) {
    return t.type === e.type && (!!t.key.isEqual(e.key) && (!!t.Xe.isEqual(e.Xe) && (0 /* Set */ === t.type ? t.value.isEqual(e.value) : 1 /* Patch */ === t.type ? t.data.isEqual(e.data) && t.He.isEqual(e.He) : 2 /* Transform */ !== t.type || M(t.fieldTransforms, t.fieldTransforms, (t, e) => en(t, e)))));
}

/**
 * Returns the version from the given document for use as the result of a
 * mutation. Mutations are defined to return the version of the base document
 * only if it is an existing document. Deleted and unknown documents have a
 * post-mutation version of SnapshotVersion.min().
 */ function ln(t) {
    return t instanceof gn ? t.version : q.min();
}

/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */ class _n extends on {
    constructor(t, e, n) {
        super(), this.key = t, this.value = e, this.Xe = n, this.type = 0 /* Set */;
    }
}

class fn extends on {
    constructor(t, e, n, s) {
        super(), this.key = t, this.data = e, this.He = n, this.Xe = s, this.type = 1 /* Patch */;
    }
}

function dn(t, e) {
    let n;
    return n = e instanceof gn ? e.data() : Rn.empty(), function(t, e) {
        const n = new mn(e);
        return t.He.fields.forEach(e => {
            if (!e.$()) {
                const s = t.data.field(e);
                null !== s ? n.set(e, s) : n.delete(e);
            }
        }), n.sn();
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

class wn extends on {
    constructor(t, e) {
        super(), this.key = t, this.fieldTransforms = e, this.type = 2 /* Transform */ , 
        // NOTE: We set a precondition of exists: true as a safety-check, since we
        // always combine TransformMutations with a SetMutation or PatchMutation which
        // (if successful) should end up with an existing document.
        this.Xe = sn.exists(!0);
    }
}

function Tn(t, e) {
    return e;
}

function En(t, e, n) {
    const s = new mn(e);
    for (let e = 0; e < t.fieldTransforms.length; e++) {
        const i = t.fieldTransforms[e];
        s.set(i.field, n[e]);
    }
    return s.sn();
}

/** A mutation that deletes the document at the given key. */ class In extends on {
    constructor(t, e) {
        super(), this.key = t, this.Xe = e, this.type = 3 /* Delete */;
    }
}

class An extends on {
    constructor(t, e) {
        super(), this.key = t, this.Xe = e, this.type = 4 /* Verify */;
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
 */ class Rn {
    constructor(t) {
        this.proto = t;
    }
    static empty() {
        return new Rn({
            mapValue: {}
        });
    }
    /**
     * Returns the value at the given path or null.
     *
     * @param path the path to search
     * @return The value at the path or if there it doesn't exist.
     */    field(t) {
        if (t.$()) return this.proto;
        {
            let e = this.proto;
            for (let n = 0; n < t.length - 1; ++n) {
                if (!e.mapValue.fields) return null;
                if (e = e.mapValue.fields[t.get(n)], !ie(e)) return null;
            }
            return e = (e.mapValue.fields || {})[t.M()], e || null;
        }
    }
    isEqual(t) {
        return Kt(this.proto, t.proto);
    }
}

/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue.
 */ class mn {
    /**
     * @param baseObject The object to mutate.
     */
    constructor(t = Rn.empty()) {
        this.rn = t, 
        /** A map that contains the accumulated changes in this builder. */
        this.on = new Map;
    }
    /**
     * Sets the field to the provided value.
     *
     * @param path The field path to set.
     * @param value The value to set.
     * @return The current Builder instance.
     */    set(t, e) {
        return this.hn(t, e), this;
    }
    /**
     * Removes the field at the specified path. If there is no field at the
     * specified path, nothing is changed.
     *
     * @param path The field path to remove.
     * @return The current Builder instance.
     */    delete(t) {
        return this.hn(t, null), this;
    }
    /**
     * Adds `value` to the overlay map at `path`. Creates nested map entries if
     * needed.
     */    hn(t, e) {
        let n = this.on;
        for (let e = 0; e < t.length - 1; ++e) {
            const s = t.get(e);
            let i = n.get(s);
            i instanceof Map ? 
            // Re-use a previously created map
            n = i : i && 10 /* ObjectValue */ === Wt(i) ? (
            // Convert the existing Protobuf MapValue into a map
            i = new Map(Object.entries(i.mapValue.fields || {})), n.set(s, i), n = i) : (
            // Create an empty map to represent the current nesting level
            i = new Map, n.set(s, i), n = i);
        }
        n.set(t.M(), e);
    }
    /** Returns an ObjectValue with all mutations applied. */    sn() {
        const t = this.an(K.K(), this.on);
        return null != t ? new Rn(t) : this.rn;
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
     */    an(t, e) {
        let n = !1;
        const s = this.rn.field(t), i = ie(s) ? // If there is already data at the current path, base our
        Object.assign({}, s.mapValue.fields) : {};
        return e.forEach((e, s) => {
            if (e instanceof Map) {
                const r = this.an(t.child(s), e);
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
 */ function Pn(t) {
    const e = [];
    return $t(t.fields || {}, (t, n) => {
        const s = new K([ t ]);
        if (ie(n)) {
            const t = Pn(n.mapValue).fields;
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
    }), new Ze(e);
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
 */ class Vn {
    constructor(t, e) {
        this.key = t, this.version = e;
    }
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */ class gn extends Vn {
    constructor(t, e, n, s) {
        super(t, e), this.cn = n, this.nn = !!s.nn, this.hasCommittedMutations = !!s.hasCommittedMutations;
    }
    field(t) {
        return this.cn.field(t);
    }
    data() {
        return this.cn;
    }
    un() {
        return this.cn.proto;
    }
    isEqual(t) {
        return t instanceof gn && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.nn === t.nn && this.hasCommittedMutations === t.hasCommittedMutations && this.cn.isEqual(t.cn);
    }
    toString() {
        return `Document(${this.key}, ${this.version}, ${this.cn.toString()}, {hasLocalMutations: ${this.nn}}), {hasCommittedMutations: ${this.hasCommittedMutations}})`;
    }
    get hasPendingWrites() {
        return this.nn || this.hasCommittedMutations;
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
class yn extends Vn {
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
        return t instanceof yn && t.hasCommittedMutations === this.hasCommittedMutations && t.version.isEqual(this.version) && t.key.isEqual(this.key);
    }
}

/**
 * A class representing an existing document whose data is unknown (e.g. a
 * document that was updated without a known base document).
 */ class pn extends Vn {
    toString() {
        return `UnknownDocument(${this.key}, ${this.version})`;
    }
    get hasPendingWrites() {
        return !0;
    }
    isEqual(t) {
        return t instanceof pn && t.version.isEqual(this.version) && t.key.isEqual(this.key);
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
 */ function bn(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
e) {
    if (!(t instanceof e)) throw e.name === t.constructor.name ? new D(C.INVALID_ARGUMENT, `Type does not match the expected instance. Did you pass '${e.name}' from a different Firestore SDK?`) : new D(C.INVALID_ARGUMENT, `Expected type '${e.name}', but was '${t.constructor.name}'`);
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
 */ class vn {
    /**
     * Initializes a Query with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     */
    constructor(t, e = null, n = [], s = [], i = null, r = "F" /* First */ , o = null, h = null) {
        this.path = t, this.collectionGroup = e, this.ln = n, this.filters = s, this.limit = i, 
        this._n = r, this.startAt = o, this.endAt = h, this.fn = null, 
        // The corresponding `Target` of this `Query` instance.
        this.dn = null, this.startAt, this.endAt;
    }
    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */    wn(t) {
        return new vn(t, 
        /*collectionGroup=*/ null, this.ln.slice(), this.filters.slice(), this.limit, this._n, this.startAt, this.endAt);
    }
    Tn() {
        return 0 === this.filters.length && null === this.limit && null == this.startAt && null == this.endAt && (0 === this.ln.length || 1 === this.ln.length && this.ln[0].field.G());
    }
    En() {
        return !z(this.limit) && "F" /* First */ === this._n;
    }
    In() {
        return !z(this.limit) && "L" /* Last */ === this._n;
    }
    An() {
        return this.ln.length > 0 ? this.ln[0].field : null;
    }
    Rn() {
        for (const t of this.filters) if (t.mn()) return t.field;
        return null;
    }
    Pn(t) {
        for (const e of this.filters) if (t.indexOf(e.op) >= 0) return e.op;
        return null;
    }
}

/** Creates a new Query instance with the options provided. */ function Sn(t, e, n, s, i, r, o, h) {
    return new vn(t, e, n, s, i, r, o, h);
}

/** Creates a new Query for a query that matches all documents at `path` */ function Cn(t) {
    return new vn(t);
}

/**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */
function Dn(t) {
    return null !== t.collectionGroup;
}

/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */ function Nn(t) {
    const e = bn(t, vn);
    if (null === e.fn) {
        e.fn = [];
        const t = e.Rn(), n = e.An();
        if (null !== t && null === n) 
        // In order to implicitly add key ordering, we must also add the
        // inequality filter field for it to be a valid query.
        // Note that the default inequality field and key ordering is ascending.
        t.G() || e.fn.push(new Zn(t)), e.fn.push(new Zn(K.H(), "asc" /* ASCENDING */)); else {
            let t = !1;
            for (const n of e.ln) e.fn.push(n), n.field.G() && (t = !0);
            if (!t) {
                // The order of the implicit key ordering always matches the last
                // explicit order by
                const t = e.ln.length > 0 ? e.ln[e.ln.length - 1].dir : "asc" /* ASCENDING */;
                e.fn.push(new Zn(K.H(), t));
            }
        }
    }
    return e.fn;
}

/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */ function xn(t) {
    const e = bn(t, vn);
    if (!e.dn) if ("F" /* First */ === e._n) e.dn = X(e.path, e.collectionGroup, Nn(e), e.filters, e.limit, e.startAt, e.endAt); else {
        // Flip the orderBy directions since we want the last results
        const t = [];
        for (const n of Nn(e)) {
            const e = "desc" /* DESCENDING */ === n.dir ? "asc" /* ASCENDING */ : "desc" /* DESCENDING */;
            t.push(new Zn(n.field, e));
        }
        // We need to swap the cursors to match the now-flipped query ordering.
                const n = e.endAt ? new Hn(e.endAt.position, !e.endAt.before) : null, s = e.startAt ? new Hn(e.startAt.position, !e.startAt.before) : null;
        // Now return as a LimitType.First query.
        e.dn = X(e.path, e.collectionGroup, t, e.filters, e.limit, n, s);
    }
    return e.dn;
}

function kn(t, e) {
    return et(xn(t), xn(e)) && t._n === e._n;
}

// TODO(b/29183165): This is used to get a unique string from a query to, for
// example, use as a dictionary key, but the implementation is subject to
// collisions. Make it collision-free.
function Fn(t) {
    return `${Z(xn(t))}|lt:${t._n}`;
}

function On(t) {
    return `Query(target=${tt(xn(t))}; limitType=${t._n})`;
}

/** Returns whether `doc` matches the constraints of `query`. */ function Mn(t, e) {
    return function(t, e) {
        const n = e.key.path;
        return null !== t.collectionGroup ? e.key.X(t.collectionGroup) && t.path.L(n) : j.Z(t.path) ? t.path.isEqual(n) : t.path.q(n);
    }
    /**
 * A document must have a value for every ordering clause in order to show up
 * in the results.
 */ (t, e) && function(t, e) {
        for (const n of t.ln) 
        // order by key always matches
        if (!n.field.G() && null === e.field(n.field)) return !1;
        return !0;
    }(t, e) && function(t, e) {
        for (const n of t.filters) if (!n.matches(e)) return !1;
        return !0;
    }
    /** Makes sure a document is within the bounds, if provided. */ (t, e) && function(t, e) {
        if (t.startAt && !Yn(t.startAt, Nn(t), e)) return !1;
        if (t.endAt && Yn(t.endAt, Nn(t), e)) return !1;
        return !0;
    }
    /**
 * Returns a new comparator function that can be used to compare two documents
 * based on the Query's ordering constraint.
 */ (t, e);
}

function $n(t) {
    return (e, n) => {
        let s = !1;
        for (const i of Nn(t)) {
            const t = ts(i, e, n);
            if (0 !== t) return t;
            s = s || i.field.G();
        }
        return 0;
    };
}

class Ln extends class {} {
    constructor(t, e, n) {
        super(), this.field = t, this.op = e, this.value = n;
    }
    /**
     * Creates a filter based on the provided arguments.
     */    static create(t, e, n) {
        if (t.G()) return "in" /* IN */ === e || "not-in" /* NOT_IN */ === e ? this.Vn(t, e, n) : new Bn(t, e, n);
        if (ne(n)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new D(C.INVALID_ARGUMENT, "Invalid query. Null supports only equality comparisons.");
            return new Ln(t, e, n);
        }
        if (se(n)) {
            if ("==" /* EQUAL */ !== e && "!=" /* NOT_EQUAL */ !== e) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new D(C.INVALID_ARGUMENT, "Invalid query. NaN supports only equality comparisons.");
            return new Ln(t, e, n);
        }
        return "array-contains" /* ARRAY_CONTAINS */ === e ? new jn(t, n) : "in" /* IN */ === e ? new Qn(t, n) : "not-in" /* NOT_IN */ === e ? new Gn(t, n) : "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e ? new zn(t, n) : new Ln(t, e, n);
    }
    static Vn(t, e, n) {
        return "in" /* IN */ === e ? new Un(t, n) : new Wn(t, n);
    }
    matches(t) {
        const e = t.field(this.field);
        // Types do not have to match in NOT_EQUAL filters.
                return "!=" /* NOT_EQUAL */ === this.op ? null !== e && this.gn(Qt(e, this.value)) : null !== e && Wt(this.value) === Wt(e) && this.gn(Qt(e, this.value));
        // Only compare types with matching backend order (such as double and int).
        }
    gn(t) {
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
            return b();
        }
    }
    mn() {
        return [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , ">=" /* GREATER_THAN_OR_EQUAL */ , "!=" /* NOT_EQUAL */ ].indexOf(this.op) >= 0;
    }
}

function qn(t) {
    // TODO(b/29183165): Technically, this won't be unique if two values have
    // the same description, such as the int 3 and the string "3". So we should
    // add the types in here somehow, too.
    return t.field.U() + t.op.toString() + zt(t.value);
}

class Bn extends Ln {
    constructor(t, e, n) {
        super(t, e, n), this.key = j.Y(n.referenceValue);
    }
    matches(t) {
        const e = j.D(t.key, this.key);
        return this.gn(e);
    }
}

/** Filter that matches on key fields within an array. */ class Un extends Ln {
    constructor(t, e) {
        super(t, "in" /* IN */ , e), this.keys = Kn("in" /* IN */ , e);
    }
    matches(t) {
        return this.keys.some(e => e.isEqual(t.key));
    }
}

/** Filter that matches on key fields not present within an array. */ class Wn extends Ln {
    constructor(t, e) {
        super(t, "not-in" /* NOT_IN */ , e), this.keys = Kn("not-in" /* NOT_IN */ , e);
    }
    matches(t) {
        return !this.keys.some(e => e.isEqual(t.key));
    }
}

function Kn(t, e) {
    var n;
    return ((null === (n = e.arrayValue) || void 0 === n ? void 0 : n.values) || []).map(t => j.Y(t.referenceValue));
}

/** A Filter that implements the array-contains operator. */ class jn extends Ln {
    constructor(t, e) {
        super(t, "array-contains" /* ARRAY_CONTAINS */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return ee(e) && jt(e.arrayValue, this.value);
    }
}

/** A Filter that implements the IN operator. */ class Qn extends Ln {
    constructor(t, e) {
        super(t, "in" /* IN */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return null !== e && jt(this.value.arrayValue, e);
    }
}

/** A Filter that implements the not-in operator. */ class Gn extends Ln {
    constructor(t, e) {
        super(t, "not-in" /* NOT_IN */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return null !== e && !jt(this.value.arrayValue, e);
    }
}

/** A Filter that implements the array-contains-any operator. */ class zn extends Ln {
    constructor(t, e) {
        super(t, "array-contains-any" /* ARRAY_CONTAINS_ANY */ , e);
    }
    matches(t) {
        const e = t.field(this.field);
        return !(!ee(e) || !e.arrayValue.values) && e.arrayValue.values.some(t => jt(this.value.arrayValue, t));
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
 */ class Hn {
    constructor(t, e) {
        this.position = t, this.before = e;
    }
}

function Jn(t) {
    // TODO(b/29183165): Make this collision robust.
    return `${t.before ? "b" : "a"}:${t.position.map(t => zt(t)).join(",")}`;
}

/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */ function Yn(t, e, n) {
    let s = 0;
    for (let i = 0; i < t.position.length; i++) {
        const r = e[i], o = t.position[i];
        if (r.field.G()) s = j.D(j.Y(o.referenceValue), n.key); else {
            s = Qt(o, n.field(r.field));
        }
        if ("desc" /* DESCENDING */ === r.dir && (s *= -1), 0 !== s) break;
    }
    return t.before ? s <= 0 : s < 0;
}

function Xn(t, e) {
    if (null === t) return null === e;
    if (null === e) return !1;
    if (t.before !== e.before || t.position.length !== e.position.length) return !1;
    for (let n = 0; n < t.position.length; n++) {
        if (!Kt(t.position[n], e.position[n])) return !1;
    }
    return !0;
}

/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */ class Zn {
    constructor(t, e = "asc" /* ASCENDING */) {
        this.field = t, this.dir = e;
    }
}

function ts(t, e, n) {
    const s = t.field.G() ? j.D(e.key, n.key) : function(t, e, n) {
        const s = e.field(t), i = n.field(t);
        return null !== s && null !== i ? Qt(s, i) : b();
    }(t.field, e, n);
    switch (t.dir) {
      case "asc" /* ASCENDING */ :
        return s;

      case "desc" /* DESCENDING */ :
        return -1 * s;

      default:
        return b();
    }
}

function es(t, e) {
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
class ns {
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
        this.batchId = t, this.yn = e, this.baseMutations = n, this.mutations = s;
    }
    /**
     * Applies all the mutations in this MutationBatch to the specified document
     * to create a new remote document
     *
     * @param docKey The key of the document to apply mutations to.
     * @param maybeDoc The document to apply mutations to.
     * @param batchResult The result of applying the MutationBatch to the
     * backend.
     */    pn(t, e, n) {
        const s = n.bn;
        for (let n = 0; n < this.mutations.length; n++) {
            const i = this.mutations[n];
            if (i.key.isEqual(t)) {
                e = hn(i, e, s[n]);
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
     */    vn(t, e) {
        // First, apply the base state. This allows us to apply non-idempotent
        // transform against a consistent set of values.
        for (const n of this.baseMutations) n.key.isEqual(t) && (e = an(n, e, e, this.yn));
        const n = e;
        // Second, apply all user-provided mutations.
                for (const s of this.mutations) s.key.isEqual(t) && (e = an(s, e, n, this.yn));
        return e;
    }
    /**
     * Computes the local view for all provided documents given the mutations in
     * this batch.
     */    Sn(t) {
        // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
        // directly (as done in `applyToLocalView()`), we can reduce the complexity
        // to O(n).
        let e = t;
        return this.mutations.forEach(n => {
            const s = this.vn(n.key, t.get(n.key));
            s && (e = e._t(n.key, s));
        }), e;
    }
    keys() {
        return this.mutations.reduce((t, e) => t.add(e.key), Pt());
    }
    isEqual(t) {
        return this.batchId === t.batchId && M(this.mutations, t.mutations, (t, e) => un(t, e)) && M(this.baseMutations, t.baseMutations, (t, e) => un(t, e));
    }
}

/** The result of applying a mutation batch to the backend. */ class ss {
    constructor(t, e, n, 
    /**
     * A pre-computed mapping from each mutated document to the resulting
     * version.
     */
    s) {
        this.batch = t, this.Cn = e, this.bn = n, this.Dn = s;
    }
    /**
     * Creates a new MutationBatchResult for the given batch and results. There
     * must be one result for each mutation in the batch. This static factory
     * caches a document=>version mapping (docVersions).
     */    static from(t, e, n) {
        v(t.mutations.length === n.length);
        let s = Rt;
        const i = t.mutations;
        for (let t = 0; t < i.length; t++) s = s._t(i[t].key, n[t].version);
        return new ss(t, e, n, s);
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
 * A map implementation that uses objects as keys. Objects must have an
 * associated equals function and must be immutable. Entries in the map are
 * stored together with the key being produced from the mapKeyFn. This map
 * automatically handles collisions of keys.
 */ class is {
    constructor(t, e) {
        this.Nn = t, this.xn = e, 
        /**
         * The inner map for a key -> value pair. Due to the possibility of
         * collisions we keep a list of entries that we do a linear search through
         * to find an actual match. Note that collisions should be rare, so we still
         * expect near constant time lookups in practice.
         */
        this.kn = {};
    }
    /** Get a value for this key, or undefined if it does not exist. */    get(t) {
        const e = this.Nn(t), n = this.kn[e];
        if (void 0 !== n) for (const [e, s] of n) if (this.xn(e, t)) return s;
    }
    has(t) {
        return void 0 !== this.get(t);
    }
    /** Put this key and value in the map. */    set(t, e) {
        const n = this.Nn(t), s = this.kn[n];
        if (void 0 !== s) {
            for (let n = 0; n < s.length; n++) if (this.xn(s[n][0], t)) return void (s[n] = [ t, e ]);
            s.push([ t, e ]);
        } else this.kn[n] = [ [ t, e ] ];
    }
    /**
     * Remove this key from the map. Returns a boolean if anything was deleted.
     */    delete(t) {
        const e = this.Nn(t), n = this.kn[e];
        if (void 0 === n) return !1;
        for (let s = 0; s < n.length; s++) if (this.xn(n[s][0], t)) return 1 === n.length ? delete this.kn[e] : n.splice(s, 1), 
        !0;
        return !1;
    }
    forEach(t) {
        $t(this.kn, (e, n) => {
            for (const [e, s] of n) t(e, s);
        });
    }
    $() {
        return Lt(this.kn);
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
 */ class rs {
    constructor(t) {
        // NOTE: next/catchCallback will always point to our own wrapper functions,
        // not the user's raw next() or catch() callbacks.
        this.Fn = null, this.On = null, 
        // When the operation resolves, we'll set result or error and mark isDone.
        this.result = void 0, this.error = void 0, this.Mn = !1, 
        // Set to true when .then() or .catch() are called and prevents additional
        // chaining.
        this.$n = !1, t(t => {
            this.Mn = !0, this.result = t, this.Fn && 
            // value should be defined unless T is Void, but we can't express
            // that in the type system.
            this.Fn(t);
        }, t => {
            this.Mn = !0, this.error = t, this.On && this.On(t);
        });
    }
    catch(t) {
        return this.next(void 0, t);
    }
    next(t, e) {
        return this.$n && b(), this.$n = !0, this.Mn ? this.error ? this.Ln(e, this.error) : this.qn(t, this.result) : new rs((n, s) => {
            this.Fn = e => {
                this.qn(t, e).next(n, s);
            }, this.On = t => {
                this.Ln(e, t).next(n, s);
            };
        });
    }
    Bn() {
        return new Promise((t, e) => {
            this.next(t, e);
        });
    }
    Un(t) {
        try {
            const e = t();
            return e instanceof rs ? e : rs.resolve(e);
        } catch (t) {
            return rs.reject(t);
        }
    }
    qn(t, e) {
        return t ? this.Un(() => t(e)) : rs.resolve(e);
    }
    Ln(t, e) {
        return t ? this.Un(() => t(e)) : rs.reject(e);
    }
    static resolve(t) {
        return new rs((e, n) => {
            e(t);
        });
    }
    static reject(t) {
        return new rs((e, n) => {
            n(t);
        });
    }
    static Wn(
    // Accept all Promise types in waitFor().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t) {
        return new rs((e, n) => {
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
     */    static Kn(t) {
        let e = rs.resolve(!1);
        for (const n of t) e = e.next(t => t ? rs.resolve(t) : n());
        return e;
    }
    static forEach(t, e) {
        const n = [];
        return t.forEach((t, s) => {
            n.push(e.call(this, t, s));
        }), this.Wn(n);
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
 */ class os {
    constructor() {
        // A mapping of document key to the new cache entry that should be written (or null if any
        // existing cache entry should be removed).
        this.jn = new is(t => t.toString(), (t, e) => t.isEqual(e)), this.Qn = !1;
    }
    set readTime(t) {
        this.Gn = t;
    }
    get readTime() {
        return this.Gn;
    }
    /**
     * Buffers a `RemoteDocumentCache.addEntry()` call.
     *
     * You can only modify documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */    zn(t, e) {
        this.Hn(), this.readTime = e, this.jn.set(t.key, t);
    }
    /**
     * Buffers a `RemoteDocumentCache.removeEntry()` call.
     *
     * You can only remove documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */    Jn(t, e) {
        this.Hn(), e && (this.readTime = e), this.jn.set(t, null);
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
     */    Yn(t, e) {
        this.Hn();
        const n = this.jn.get(e);
        return void 0 !== n ? rs.resolve(n) : this.Xn(t, e);
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
        return this.Zn(t, e);
    }
    /**
     * Applies buffered changes to the underlying RemoteDocumentCache, using
     * the provided transaction.
     */    apply(t) {
        return this.Hn(), this.Qn = !0, this.ts(t);
    }
    /** Helper to assert this.changes is not null  */    Hn() {}
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
 */ const hs = "The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";

/**
 * A base class representing a persistence transaction, encapsulating both the
 * transaction's sequence numbers as well as a list of onCommitted listeners.
 *
 * When you call Persistence.runTransaction(), it will create a transaction and
 * pass it to your callback. You then pass it to any method that operates
 * on persistence.
 */ class as {
    constructor() {
        this.es = [];
    }
    ns(t) {
        this.es.push(t);
    }
    ss() {
        this.es.forEach(t => t());
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
 */ class cs {
    constructor(t, e, n) {
        this.rs = t, this.os = e, this.hs = n;
    }
    /**
     * Get the local view of the document identified by `key`.
     *
     * @return Local view of the document or null if we don't have any cached
     * state for it.
     */    as(t, e) {
        return this.os.cs(t, e).next(n => this.us(t, e, n));
    }
    /** Internal version of `getDocument` that allows reusing batches. */    us(t, e, n) {
        return this.rs.Yn(t, e).next(t => {
            for (const s of n) t = s.vn(e, t);
            return t;
        });
    }
    // Returns the view of the given `docs` as they would appear after applying
    // all mutations in the given `batches`.
    ls(t, e, n) {
        let s = Et();
        return e.forEach((t, e) => {
            for (const s of n) e = s.vn(t, e);
            s = s._t(t, e);
        }), s;
    }
    /**
     * Gets the local view of the documents identified by `keys`.
     *
     * If we don't have cached state for a document in `keys`, a NoDocument will
     * be stored for that key in the resulting set.
     */    _s(t, e) {
        return this.rs.getEntries(t, e).next(e => this.fs(t, e));
    }
    /**
     * Similar to `getDocuments`, but creates the local view from the given
     * `baseDocs` without retrieving documents from the local store.
     */    fs(t, e) {
        return this.os.ds(t, e).next(n => {
            const s = this.ls(t, e, n);
            let i = Tt();
            return s.forEach((t, e) => {
                // TODO(http://b/32275378): Don't conflate missing / deleted.
                e || (e = new yn(t, q.min())), i = i._t(t, e);
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
     */    ws(t, e, n) {
        /**
 * Returns whether the query matches a single document by path (rather than a
 * collection).
 */
        return function(t) {
            return j.Z(t.path) && null === t.collectionGroup && 0 === t.filters.length;
        }(e) ? this.Ts(t, e.path) : Dn(e) ? this.Es(t, e, n) : this.Is(t, e, n);
    }
    Ts(t, e) {
        // Just do a simple document lookup.
        return this.as(t, new j(e)).next(t => {
            let e = At();
            return t instanceof gn && (e = e._t(t.key, t)), e;
        });
    }
    Es(t, e, n) {
        const s = e.collectionGroup;
        let i = At();
        return this.hs.As(t, s).next(r => rs.forEach(r, r => {
            const o = e.wn(r.child(s));
            return this.Is(t, o, n).next(t => {
                t.forEach((t, e) => {
                    i = i._t(t, e);
                });
            });
        }).next(() => i));
    }
    Is(t, e, n) {
        // Query the remote documents and overlay mutations.
        let s, i;
        return this.rs.ws(t, e, n).next(n => (s = n, this.os.Rs(t, e))).next(e => (i = e, 
        this.ms(t, i, s).next(t => {
            s = t;
            for (const t of i) for (const e of t.mutations) {
                const n = e.key, i = s.get(n), r = an(e, i, i, t.yn);
                s = r instanceof gn ? s._t(n, r) : s.remove(n);
            }
        }))).next(() => (
        // Finally, filter out any documents that don't actually match
        // the query.
        s.forEach((t, n) => {
            Mn(e, n) || (s = s.remove(t));
        }), s));
    }
    ms(t, e, n) {
        let s = Pt();
        for (const t of e) for (const e of t.mutations) e instanceof fn && null === n.get(e.key) && (s = s.add(e.key));
        let i = n;
        return this.rs.getEntries(t, s).next(t => (t.forEach((t, e) => {
            null !== e && e instanceof gn && (i = i._t(t, e));
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
 */ class us {
    constructor(t, e, n, s) {
        this.targetId = t, this.fromCache = e, this.Ps = n, this.Vs = s;
    }
    static gs(t, e) {
        let n = Pt(), s = Pt();
        for (const t of e.docChanges) switch (t.type) {
          case 0 /* Added */ :
            n = n.add(t.doc.key);
            break;

          case 1 /* Removed */ :
            s = s.add(t.doc.key);
 // do nothing
                }
        return new us(t, e.fromCache, n, s);
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
 */ class ls {
    constructor(t, e) {
        this.previousValue = t, e && (e.ys = t => this.ps(t), this.bs = t => e.vs(t));
    }
    ps(t) {
        return this.previousValue = Math.max(t, this.previousValue), this.previousValue;
    }
    next() {
        const t = ++this.previousValue;
        return this.bs && this.bs(t), t;
    }
}

ls.Ss = -1;

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
class _s {
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
class fs {
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
        this.Cs = t, this.Ds = e, this.Ns = n, this.xs = s, this.ks = i, this.Fs = 0, this.Os = null, 
        /** The last backoff attempt, as epoch milliseconds. */
        this.Ms = Date.now(), this.reset();
    }
    /**
     * Resets the backoff delay.
     *
     * The very next backoffAndWait() will have no delay. If it is called again
     * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
     * subsequent ones will increase according to the backoffFactor.
     */    reset() {
        this.Fs = 0;
    }
    /**
     * Resets the backoff delay to the maximum delay (e.g. for use after a
     * RESOURCE_EXHAUSTED error).
     */    $s() {
        this.Fs = this.ks;
    }
    /**
     * Returns a promise that resolves after currentDelayMs, and increases the
     * delay for any subsequent attempts. If there was a pending backoff operation
     * already, it will be canceled.
     */    Ls(t) {
        // Cancel any pending backoff operation.
        this.cancel();
        // First schedule using the current base (which may be 0 and should be
        // honored as such).
        const e = Math.floor(this.Fs + this.qs()), n = Math.max(0, Date.now() - this.Ms), s = Math.max(0, e - n);
        // Guard against lastAttemptTime being in the future due to a clock change.
                s > 0 && V("ExponentialBackoff", `Backing off for ${s} ms (base delay: ${this.Fs} ms, delay with jitter: ${e} ms, last attempt: ${n} ms ago)`), 
        this.Os = this.Cs.Bs(this.Ds, s, () => (this.Ms = Date.now(), t())), 
        // Apply backoff factor to determine next delay and ensure it is within
        // bounds.
        this.Fs *= this.xs, this.Fs < this.Ns && (this.Fs = this.Ns), this.Fs > this.ks && (this.Fs = this.ks);
    }
    Us() {
        null !== this.Os && (this.Os.Ws(), this.Os = null);
    }
    cancel() {
        null !== this.Os && (this.Os.cancel(), this.Os = null);
    }
    /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */    qs() {
        return (Math.random() - .5) * this.Fs;
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
class ds {
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
        this.name = t, this.version = e, this.Ks = n;
        // NOTE: According to https://bugs.webkit.org/show_bug.cgi?id=197050, the
        // bug we're checking for should exist in iOS >= 12.2 and < 13, but for
        // whatever reason it's much harder to hit after 12.2 so we only proactively
        // log on 12.2.
        12.2 === ds.js(h()) && g("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");
    }
    /** Deletes the specified database. */    static delete(t) {
        return V("SimpleDb", "Removing database:", t), Rs(window.indexedDB.deleteDatabase(t)).Bn();
    }
    /** Returns true if IndexedDB is available in the current environment. */    static Qs() {
        if ("undefined" == typeof indexedDB) return !1;
        if (ds.Gs()) return !0;
        // We extensively use indexed array values and compound keys,
        // which IE and Edge do not support. However, they still have indexedDB
        // defined on the window, so we need to check for them here and make sure
        // to return that persistence is not enabled for those browsers.
        // For tracking support of this feature, see here:
        // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/indexeddbarraysandmultientrysupport/
        // Check the UA string to find out the browser.
                const t = h(), e = ds.js(t), n = 0 < e && e < 10, s = ds.zs(t), i = 0 < s && s < 4.5;
        // IE 10
        // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';
        // IE 11
        // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';
        // Edge
        // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML,
        // like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';
        // iOS Safari: Disable for users running iOS version < 10.
                return !(t.indexOf("MSIE ") > 0 || t.indexOf("Trident/") > 0 || t.indexOf("Edge/") > 0 || n || i);
    }
    /**
     * Returns true if the backing IndexedDB store is the Node IndexedDBShim
     * (see https://github.com/axemclion/IndexedDBShim).
     */    static Gs() {
        var t;
        return "undefined" != typeof __PRIVATE_process && "YES" === (null === (t = __PRIVATE_process.__PRIVATE_env) || void 0 === t ? void 0 : t.Hs);
    }
    /** Helper to get a typed SimpleDbStore from a transaction. */    static Js(t, e) {
        return t.store(e);
    }
    // visible for testing
    /** Parse User Agent to determine iOS version. Returns -1 if not found. */
    static js(t) {
        const e = t.match(/i(?:phone|pad|pod) os ([\d_]+)/i), n = e ? e[1].split("_").slice(0, 2).join(".") : "-1";
        return Number(n);
    }
    // visible for testing
    /** Parse User Agent to determine Android version. Returns -1 if not found. */
    static zs(t) {
        const e = t.match(/Android ([\d.]+)/i), n = e ? e[1].split(".").slice(0, 2).join(".") : "-1";
        return Number(n);
    }
    /**
     * Opens the specified database, creating or upgrading it if necessary.
     */    async Ys() {
        return this.db || (V("SimpleDb", "Opening database:", this.name), this.db = await new Promise((t, e) => {
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
                e(new Ts("Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));
            }, n.onerror = t => {
                const n = t.target.error;
                "VersionError" === n.name ? e(new D(C.FAILED_PRECONDITION, "A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")) : e(new Ts(n));
            }, n.onupgradeneeded = t => {
                V("SimpleDb", 'Database "' + this.name + '" requires upgrade from version:', t.oldVersion);
                const e = t.target.result;
                this.Ks.createOrUpgrade(e, n.transaction, t.oldVersion, this.version).next(() => {
                    V("SimpleDb", "Database upgrade to version " + this.version + " complete");
                });
            };
        })), this.Xs && (this.db.onversionchange = t => this.Xs(t)), this.db;
    }
    Zs(t) {
        this.Xs = t, this.db && (this.db.onversionchange = e => t(e));
    }
    async runTransaction(t, e, n) {
        const s = "readonly" === t;
        let i = 0;
        for (;;) {
            ++i;
            try {
                this.db = await this.Ys();
                const t = Is.open(this.db, s ? "readonly" : "readwrite", e), i = n(t).catch(e => (
                // Abort the transaction if there was an error.
                t.abort(e), rs.reject(e))).Bn();
                // As noted above, errors are propagated by aborting the transaction. So
                // we swallow any error here to avoid the browser logging it as unhandled.
                return i.catch(() => {}), 
                // Wait for the transaction to complete (i.e. IndexedDb's onsuccess event to
                // fire), but still return the original transactionFnResult back to the
                // caller.
                await t.ti, i;
            } catch (t) {
                // TODO(schmidt-sebastian): We could probably be smarter about this and
                // not retry exceptions that are likely unrecoverable (such as quota
                // exceeded errors).
                // Note: We cannot use an instanceof check for FirestoreException, since the
                // exception is wrapped in a generic error by our async/await handling.
                const e = "FirebaseError" !== t.name && i < 3;
                if (V("SimpleDb", "Transaction failed with error: %s. Retrying: %s.", t.message, e), 
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
 */ class ws {
    constructor(t) {
        this.ei = t, this.ni = !1, this.si = null;
    }
    get Mn() {
        return this.ni;
    }
    get ii() {
        return this.si;
    }
    set cursor(t) {
        this.ei = t;
    }
    /**
     * This function can be called to stop iteration at any point.
     */    done() {
        this.ni = !0;
    }
    /**
     * This function can be called to skip to that next key, which could be
     * an index or a primary key.
     */    ri(t) {
        this.si = t;
    }
    /**
     * Delete the current cursor value from the object store.
     *
     * NOTE: You CANNOT do this with a keysOnly query.
     */    delete() {
        return Rs(this.ei.delete());
    }
}

/** An error that wraps exceptions that thrown during IndexedDB execution. */ class Ts extends D {
    constructor(t) {
        super(C.UNAVAILABLE, "IndexedDB transaction failed: " + t), this.name = "IndexedDbTransactionError";
    }
}

/** Verifies whether `e` is an IndexedDbTransactionError. */ function Es(t) {
    // Use name equality, as instanceof checks on errors don't work with errors
    // that wrap other errors.
    return "IndexedDbTransactionError" === t.name;
}

/**
 * Wraps an IDBTransaction and exposes a store() method to get a handle to a
 * specific object store.
 */ class Is {
    constructor(t) {
        this.transaction = t, this.aborted = !1, 
        /**
         * A promise that resolves with the result of the IndexedDb transaction.
         */
        this.oi = new _s, this.transaction.oncomplete = () => {
            this.oi.resolve();
        }, this.transaction.onabort = () => {
            t.error ? this.oi.reject(new Ts(t.error)) : this.oi.resolve();
        }, this.transaction.onerror = t => {
            const e = Ps(t.target.error);
            this.oi.reject(new Ts(e));
        };
    }
    static open(t, e, n) {
        try {
            return new Is(t.transaction(n, e));
        } catch (t) {
            throw new Ts(t);
        }
    }
    get ti() {
        return this.oi.promise;
    }
    abort(t) {
        t && this.oi.reject(t), this.aborted || (V("SimpleDb", "Aborting transaction:", t ? t.message : "Client-initiated abort"), 
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
        return new As(e);
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
 */ class As {
    constructor(t) {
        this.store = t;
    }
    put(t, e) {
        let n;
        return void 0 !== e ? (V("SimpleDb", "PUT", this.store.name, t, e), n = this.store.put(e, t)) : (V("SimpleDb", "PUT", this.store.name, "<auto-key>", t), 
        n = this.store.put(t)), Rs(n);
    }
    /**
     * Adds a new value into an Object Store and returns the new key. Similar to
     * IndexedDb's `add()`, this method will fail on primary key collisions.
     *
     * @param value The object to write.
     * @return The key of the value to add.
     */    add(t) {
        V("SimpleDb", "ADD", this.store.name, t, t);
        return Rs(this.store.add(t));
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
        return Rs(this.store.get(t)).next(e => (
        // Normalize nonexistence to null.
        void 0 === e && (e = null), V("SimpleDb", "GET", this.store.name, t, e), e));
    }
    delete(t) {
        V("SimpleDb", "DELETE", this.store.name, t);
        return Rs(this.store.delete(t));
    }
    /**
     * If we ever need more of the count variants, we can add overloads. For now,
     * all we need is to count everything in a store.
     *
     * Returns the number of rows in the store.
     */    count() {
        V("SimpleDb", "COUNT", this.store.name);
        return Rs(this.store.count());
    }
    hi(t, e) {
        const n = this.cursor(this.options(t, e)), s = [];
        return this.ai(n, (t, e) => {
            s.push(e);
        }).next(() => s);
    }
    ci(t, e) {
        V("SimpleDb", "DELETE ALL", this.store.name);
        const n = this.options(t, e);
        n.ui = !1;
        const s = this.cursor(n);
        return this.ai(s, (t, e, n) => n.delete());
    }
    li(t, e) {
        let n;
        e ? n = t : (n = {}, e = t);
        const s = this.cursor(n);
        return this.ai(s, e);
    }
    /**
     * Iterates over a store, but waits for the given callback to complete for
     * each entry before iterating the next entry. This allows the callback to do
     * asynchronous work to determine if this iteration should continue.
     *
     * The provided callback should return `true` to continue iteration, and
     * `false` otherwise.
     */    _i(t) {
        const e = this.cursor({});
        return new rs((n, s) => {
            e.onerror = t => {
                const e = Ps(t.target.error);
                s(e);
            }, e.onsuccess = e => {
                const s = e.target.result;
                s ? t(s.primaryKey, s.value).next(t => {
                    t ? s.continue() : n();
                }) : n();
            };
        });
    }
    ai(t, e) {
        const n = [];
        return new rs((s, i) => {
            t.onerror = t => {
                i(t.target.error);
            }, t.onsuccess = t => {
                const i = t.target.result;
                if (!i) return void s();
                const r = new ws(i), o = e(i.primaryKey, i.value, r);
                if (o instanceof rs) {
                    const t = o.catch(t => (r.done(), rs.reject(t)));
                    n.push(t);
                }
                r.Mn ? s() : null === r.ii ? i.continue() : i.continue(r.ii);
            };
        }).next(() => rs.Wn(n));
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
            return t.ui ? n.openKeyCursor(t.range, e) : n.openCursor(t.range, e);
        }
        return this.store.openCursor(t.range, e);
    }
}

/**
 * Wraps an IDBRequest in a PersistencePromise, using the onsuccess / onerror
 * handlers to resolve / reject the PersistencePromise as appropriate.
 */ function Rs(t) {
    return new rs((e, n) => {
        t.onsuccess = t => {
            const n = t.target.result;
            e(n);
        }, t.onerror = t => {
            const e = Ps(t.target.error);
            n(e);
        };
    });
}

// Guard so we only report the error once.
let ms = !1;

function Ps(t) {
    const e = ds.js(h());
    if (e >= 12.2 && e < 13) {
        const e = "An internal error was encountered in the Indexed Database server";
        if (t.message.indexOf(e) >= 0) {
            // Wrap error in a more descriptive one.
            const t = new D("internal", `IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${e}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);
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
/** The Platform's 'window' implementation or null if not available. */ function Vs() {
    // `window` is not always available, e.g. in ReactNative and WebWorkers.
    // eslint-disable-next-line no-restricted-globals
    return "undefined" != typeof window ? window : null;
}

/** The Platform's 'document' implementation or null if not available. */ function gs() {
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
class ys {
    constructor(t, e, n, s, i) {
        this.fi = t, this.Ds = e, this.di = n, this.op = s, this.wi = i, this.Ti = new _s, 
        this.then = this.Ti.promise.then.bind(this.Ti.promise), 
        // It's normal for the deferred promise to be canceled (due to cancellation)
        // and so we attach a dummy catch callback to avoid
        // 'UnhandledPromiseRejectionWarning' log spam.
        this.Ti.promise.catch(t => {});
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
     */    static Ei(t, e, n, s, i) {
        const r = Date.now() + n, o = new ys(t, e, r, s, i);
        return o.start(n), o;
    }
    /**
     * Starts the timer. This is called immediately after construction by
     * createAndSchedule().
     */    start(t) {
        this.Ii = setTimeout(() => this.Ai(), t);
    }
    /**
     * Queues the operation to run immediately (if it hasn't already been run or
     * canceled).
     */    Ws() {
        return this.Ai();
    }
    /**
     * Cancels the operation if it hasn't already been executed or canceled. The
     * promise will be rejected.
     *
     * As long as the operation has not yet been run, calling cancel() provides a
     * guarantee that the operation will not be run.
     */    cancel(t) {
        null !== this.Ii && (this.clearTimeout(), this.Ti.reject(new D(C.CANCELLED, "Operation cancelled" + (t ? ": " + t : ""))));
    }
    Ai() {
        this.fi.Ri(() => null !== this.Ii ? (this.clearTimeout(), this.op().then(t => this.Ti.resolve(t))) : Promise.resolve());
    }
    clearTimeout() {
        null !== this.Ii && (this.wi(this), clearTimeout(this.Ii), this.Ii = null);
    }
}

class ps {
    constructor() {
        // The last promise in the queue.
        this.mi = Promise.resolve(), 
        // A list of retryable operations. Retryable operations are run in order and
        // retried with backoff.
        this.Pi = [], 
        // Is this AsyncQueue being shut down? Once it is set to true, it will not
        // be changed again.
        this.Vi = !1, 
        // Operations scheduled to be queued in the future. Operations are
        // automatically removed after they are run or canceled.
        this.gi = [], 
        // visible for testing
        this.yi = null, 
        // Flag set while there's an outstanding AsyncQueue operation, used for
        // assertion sanity-checks.
        this.pi = !1, 
        // List of TimerIds to fast-forward delays for.
        this.bi = [], 
        // Backoff timer used to schedule retries for retryable operations
        this.vi = new fs(this, "async_queue_retry" /* AsyncQueueRetry */), 
        // Visibility handler that triggers an immediate retry of all retryable
        // operations. Meant to speed up recovery when we regain file system access
        // after page comes into foreground.
        this.Si = () => {
            const t = gs();
            t && V("AsyncQueue", "Visibility state changed to  ", t.visibilityState), this.vi.Us();
        };
        const t = gs();
        t && "function" == typeof t.addEventListener && t.addEventListener("visibilitychange", this.Si);
    }
    // Is this AsyncQueue being shut down? If true, this instance will not enqueue
    // any new operations, Promises from enqueue requests will not resolve.
    get Ci() {
        return this.Vi;
    }
    /**
     * Adds a new operation to the queue without waiting for it to complete (i.e.
     * we ignore the Promise result).
     */    Ri(t) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.enqueue(t);
    }
    /**
     * Regardless if the queue has initialized shutdown, adds a new operation to the
     * queue without waiting for it to complete (i.e. we ignore the Promise result).
     */    Di(t) {
        this.Ni(), 
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.xi(t);
    }
    /**
     * Initialize the shutdown of this queue. Once this method is called, the
     * only possible way to request running an operation is through
     * `enqueueEvenWhileRestricted()`.
     */    ki() {
        if (!this.Vi) {
            this.Vi = !0;
            const t = gs();
            t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.Si);
        }
    }
    /**
     * Adds a new operation to the queue. Returns a promise that will be resolved
     * when the promise returned by the new operation is (with its value).
     */    enqueue(t) {
        return this.Ni(), this.Vi ? new Promise(t => {}) : this.xi(t);
    }
    /**
     * Enqueue a retryable operation.
     *
     * A retryable operation is rescheduled with backoff if it fails with a
     * IndexedDbTransactionError (the error type used by SimpleDb). All
     * retryable operations are executed in order and only run if all prior
     * operations were retried successfully.
     */    Fi(t) {
        this.Pi.push(t), this.Ri(() => this.Oi());
    }
    /**
     * Runs the next operation from the retryable queue. If the operation fails,
     * reschedules with backoff.
     */    async Oi() {
        if (0 !== this.Pi.length) {
            try {
                await this.Pi[0](), this.Pi.shift(), this.vi.reset();
            } catch (t) {
                if (!Es(t)) throw t;
 // Failure will be handled by AsyncQueue
                                V("AsyncQueue", "Operation failed with retryable error: " + t);
            }
            this.Pi.length > 0 && 
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
            this.vi.Ls(() => this.Oi());
        }
    }
    xi(t) {
        const e = this.mi.then(() => (this.pi = !0, t().catch(t => {
            this.yi = t, this.pi = !1;
            // Re-throw the error so that this.tail becomes a rejected Promise and
            // all further attempts to chain (via .then) will just short-circuit
            // and return the rejected Promise.
            throw g("INTERNAL UNHANDLED ERROR: ", 
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
        }).then(t => (this.pi = !1, t))));
        return this.mi = e, e;
    }
    /**
     * Schedules an operation to be queued on the AsyncQueue once the specified
     * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
     * or fast-forward the operation prior to its running.
     */    Bs(t, e, n) {
        this.Ni(), 
        // Fast-forward delays for timerIds that have been overriden.
        this.bi.indexOf(t) > -1 && (e = 0);
        const s = ys.Ei(this, t, e, n, t => this.Mi(t));
        return this.gi.push(s), s;
    }
    Ni() {
        this.yi && b();
    }
    /**
     * Verifies there's an operation currently in-progress on the AsyncQueue.
     * Unfortunately we can't verify that the running code is in the promise chain
     * of that operation, so this isn't a foolproof check, but it should be enough
     * to catch some bugs.
     */    $i() {}
    /**
     * Waits until all currently queued tasks are finished executing. Delayed
     * operations are not run.
     */    async Li() {
        // Operations in the queue prior to draining may have enqueued additional
        // operations. Keep draining the queue until the tail is no longer advanced,
        // which indicates that no more new operations were enqueued and that all
        // operations were executed.
        let t;
        do {
            t = this.mi, await t;
        } while (t !== this.mi);
    }
    /**
     * For Tests: Determine if a delayed operation with a particular TimerId
     * exists.
     */    qi(t) {
        for (const e of this.gi) if (e.Ds === t) return !0;
        return !1;
    }
    /**
     * For Tests: Runs some or all delayed operations early.
     *
     * @param lastTimerId Delayed operations up to and including this TimerId will
     *  be drained. Pass TimerId.All to run all delayed operations.
     * @returns a Promise that resolves once all operations have been run.
     */    Bi(t) {
        // Note that draining may generate more delayed ops, so we do that first.
        return this.Li().then(() => {
            // Run ops in the same order they'd run if they ran naturally.
            this.gi.sort((t, e) => t.di - e.di);
            for (const e of this.gi) if (e.Ws(), "all" /* All */ !== t && e.Ds === t) break;
            return this.Li();
        });
    }
    /**
     * For Tests: Skip all subsequent delays for a timer id.
     */    Ui(t) {
        this.bi.push(t);
    }
    /** Called once a DelayedOperation is run or canceled. */    Mi(t) {
        // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
        const e = this.gi.indexOf(t);
        this.gi.splice(e, 1);
    }
}

/**
 * Returns a FirestoreError that can be surfaced to the user if the provided
 * error is an IndexedDbTransactionError. Re-throws the error otherwise.
 */ function bs(t, e) {
    if (g("AsyncQueue", `${e}: ${t}`), Es(t)) return new D(C.UNAVAILABLE, `${e}: ${t}`);
    throw t;
}

function vs([t, e], [n, s]) {
    const i = O(t, n);
    return 0 === i ? O(e, s) : i;
}

/**
 * Used to calculate the nth sequence number. Keeps a rolling buffer of the
 * lowest n values passed to `addElement`, and finally reports the largest of
 * them in `maxValue`.
 */ class Ss {
    constructor(t) {
        this.Wi = t, this.buffer = new ft(vs), this.Ki = 0;
    }
    ji() {
        return ++this.Ki;
    }
    Qi(t) {
        const e = [ t, this.ji() ];
        if (this.buffer.size < this.Wi) this.buffer = this.buffer.add(e); else {
            const t = this.buffer.last();
            vs(e, t) < 0 && (this.buffer = this.buffer.delete(t).add(e));
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

const Cs = {
    Gi: !1,
    zi: 0,
    Hi: 0,
    Ji: 0
};

class Ds {
    constructor(
    // When we attempt to collect, we will only do so if the cache size is greater than this
    // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
    t, 
    // The percentage of sequence numbers that we will attempt to collect
    e, 
    // A cap on the total number of sequence numbers that will be collected. This prevents
    // us from collecting a huge number of sequence numbers if the cache has grown very large.
    n) {
        this.Yi = t, this.Xi = e, this.Zi = n;
    }
    static tr(t) {
        return new Ds(t, Ds.er, Ds.nr);
    }
}

Ds.sr = -1, Ds.ir = 1048576, Ds.rr = 41943040, Ds.er = 10, Ds.nr = 1e3, Ds.or = new Ds(Ds.rr, Ds.er, Ds.nr), 
Ds.hr = new Ds(Ds.sr, 0, 0);

/**
 * This class is responsible for the scheduling of LRU garbage collection. It handles checking
 * whether or not GC is enabled, as well as which delay to use before the next run.
 */
class Ns {
    constructor(t, e) {
        this.ar = t, this.fi = e, this.cr = !1, this.ur = null;
    }
    start(t) {
        this.ar.params.Yi !== Ds.sr && this.lr(t);
    }
    stop() {
        this.ur && (this.ur.cancel(), this.ur = null);
    }
    get _r() {
        return null !== this.ur;
    }
    lr(t) {
        const e = this.cr ? 3e5 : 6e4;
        V("LruGarbageCollector", `Garbage collection scheduled in ${e}ms`), this.ur = this.fi.Bs("lru_garbage_collection" /* LruGarbageCollection */ , e, async () => {
            this.ur = null, this.cr = !0;
            try {
                await t.dr(this.ar);
            } catch (t) {
                Es(t) ? V("LruGarbageCollector", "Ignoring IndexedDB error during garbage collection: ", t) : await Ui(t);
            }
            await this.lr(t);
        });
    }
}

/** Implements the steps for LRU garbage collection. */ class xs {
    constructor(t, e) {
        this.wr = t, this.params = e;
    }
    /** Given a percentile of target to collect, returns the number of targets to collect. */    Tr(t, e) {
        return this.wr.Er(t).next(t => Math.floor(e / 100 * t));
    }
    /** Returns the nth sequence number, counting in order from the smallest. */    Ir(t, e) {
        if (0 === e) return rs.resolve(ls.Ss);
        const n = new Ss(e);
        return this.wr.Oe(t, t => n.Qi(t.sequenceNumber)).next(() => this.wr.Ar(t, t => n.Qi(t))).next(() => n.maxValue);
    }
    /**
     * Removes targets with a sequence number equal to or less than the given upper bound, and removes
     * document associations with those targets.
     */    Rr(t, e, n) {
        return this.wr.Rr(t, e, n);
    }
    /**
     * Removes documents that have a sequence number equal to or less than the upper bound and are not
     * otherwise pinned.
     */    mr(t, e) {
        return this.wr.mr(t, e);
    }
    Pr(t, e) {
        return this.params.Yi === Ds.sr ? (V("LruGarbageCollector", "Garbage collection skipped; disabled"), 
        rs.resolve(Cs)) : this.Vr(t).next(n => n < this.params.Yi ? (V("LruGarbageCollector", `Garbage collection skipped; Cache size ${n} is lower than threshold ` + this.params.Yi), 
        Cs) : this.gr(t, e));
    }
    Vr(t) {
        return this.wr.Vr(t);
    }
    gr(t, e) {
        let n, s, i, r, h, a, c;
        const u = Date.now();
        return this.Tr(t, this.params.Xi).next(e => (
        // Cap at the configured max
        e > this.params.Zi ? (V("LruGarbageCollector", `Capping sequence numbers to collect down to the maximum of ${this.params.Zi} from ` + e), 
        s = this.params.Zi) : s = e, r = Date.now(), this.Ir(t, s))).next(s => (n = s, h = Date.now(), 
        this.Rr(t, n, e))).next(e => (i = e, a = Date.now(), this.mr(t, n))).next(t => {
            if (c = Date.now(), m() <= o.DEBUG) {
                V("LruGarbageCollector", `LRU Garbage Collection\n\tCounted targets in ${r - u}ms\n\tDetermined least recently used ${s} in ` + (h - r) + "ms\n" + `\tRemoved ${i} targets in ` + (a - h) + "ms\n" + `\tRemoved ${t} documents in ` + (c - a) + "ms\n" + `Total Duration: ${c - u}ms`);
            }
            return rs.resolve({
                Gi: !0,
                zi: s,
                Hi: i,
                Ji: t
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
function ks(t) {
    let e = "";
    for (let n = 0; n < t.length; n++) e.length > 0 && (e = Os(e)), e = Fs(t.get(n), e);
    return Os(e);
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

/** Encodes a path separator into the given result */ function Os(t) {
    return t + "";
}

/**
 * Decodes the given IndexedDb-compatible string form of a resource path into
 * a ResourcePath instance. Note that this method is not suitable for use with
 * decoding resource names from the server; those are One Platform format
 * strings.
 */ function Ms(t) {
    // Event the empty path must encode as a path of at least length 2. A path
    // with exactly 2 must be the empty path.
    const e = t.length;
    if (v(e >= 2), 2 === e) return v("" === t.charAt(0) && "" === t.charAt(1)), U.K();
    // Escape characters cannot exist past the second-to-last position in the
    // source value.
        const n = e - 2, s = [];
    let i = "";
    for (let r = 0; r < e; ) {
        // The last two characters of a valid encoded path must be a separator, so
        // there must be an end to this segment.
        const e = t.indexOf("", r);
        (e < 0 || e > n) && b();
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
            b();
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
        this.yr = t;
    }
}

/** Decodes a remote document from storage locally to a Document. */ function Ls(t, e) {
    if (e.document) return function(t, e, n) {
        const s = Ie(t, e.name), i = de(e.updateTime), r = new Rn({
            mapValue: {
                fields: e.fields
            }
        });
        return new gn(s, i, r, {
            hasCommittedMutations: !!n
        });
    }(t.yr, e.document, !!e.hasCommittedMutations);
    if (e.noDocument) {
        const t = j.tt(e.noDocument.path), n = Ks(e.noDocument.readTime);
        return new yn(t, n, {
            hasCommittedMutations: !!e.hasCommittedMutations
        });
    }
    if (e.unknownDocument) {
        const t = j.tt(e.unknownDocument.path), n = Ks(e.unknownDocument.version);
        return new pn(t, n);
    }
    return b();
}

/** Encodes a document for storage locally. */ function qs(t, e, n) {
    const s = Bs(n), i = e.key.path.F().B();
    if (e instanceof gn) {
        const n = function(t, e) {
            return {
                name: Ee(t, e.key),
                fields: e.un().mapValue.fields,
                updateTime: le(t, e.version.S())
            };
        }(t.yr, e), r = e.hasCommittedMutations;
        return new wi(
        /* unknownDocument= */ null, 
        /* noDocument= */ null, n, r, s, i);
    }
    if (e instanceof yn) {
        const t = e.key.path.B(), n = Ws(e.version), r = e.hasCommittedMutations;
        return new wi(
        /* unknownDocument= */ null, new fi(t, n), 
        /* document= */ null, r, s, i);
    }
    if (e instanceof pn) {
        const t = e.key.path.B(), n = Ws(e.version);
        return new wi(new di(t, n), 
        /* noDocument= */ null, 
        /* document= */ null, 
        /* hasCommittedMutations= */ !0, s, i);
    }
    return b();
}

function Bs(t) {
    const e = t.S();
    return [ e.seconds, e.nanoseconds ];
}

function Us(t) {
    const e = new L(t[0], t[1]);
    return q.g(e);
}

function Ws(t) {
    const e = t.S();
    return new ai(e.seconds, e.nanoseconds);
}

function Ks(t) {
    const e = new L(t.seconds, t.nanoseconds);
    return q.g(e);
}

/** Encodes a batch of mutations into a DbMutationBatch for local storage. */
/** Decodes a DbMutationBatch into a MutationBatch */
function js(t, e) {
    const n = (e.baseMutations || []).map(e => be(t.yr, e)), s = e.mutations.map(e => be(t.yr, e)), i = L.fromMillis(e.localWriteTimeMs);
    return new ns(e.batchId, i, n, s);
}

/** Decodes a DbTarget into TargetData */ function Qs(t) {
    const e = Ks(t.readTime), n = void 0 !== t.lastLimboFreeSnapshotVersion ? Ks(t.lastLimboFreeSnapshotVersion) : q.min();
    let s;
    var i;
    return void 0 !== t.query.documents ? (v(1 === (i = t.query).documents.length), 
    s = xn(Cn(Re(i.documents[0])))) : s = De(t.query), new it(s, t.targetId, 0 /* Listen */ , t.lastListenSequenceNumber, e, n, st.fromBase64String(t.resumeToken));
}

/** Encodes TargetData into a DbTarget for storage locally. */ function Gs(t, e) {
    const n = Ws(e.at), s = Ws(e.lastLimboFreeSnapshotVersion);
    let i;
    i = nt(e.target) ? Se(t.yr, e.target) : Ce(t.yr, e.target);
    // We can't store the resumeToken as a ByteString in IndexedDb, so we
    // convert it to a base64 string for storage.
        const r = e.resumeToken.toBase64();
    // lastListenSequenceNumber is always 0 until we do real GC.
        return new Ei(e.targetId, Z(e.target), n, r, e.sequenceNumber, s, i);
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
class zs {
    constructor(
    /**
     * The normalized userId (e.g. null UID => "" userId) used to store /
     * retrieve mutations.
     */
    t, e, n, s) {
        this.userId = t, this.serializer = e, this.hs = n, this.pr = s, 
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
        this.br = {};
    }
    /**
     * Creates a new mutation queue for the given user.
     * @param user The user for which to create a mutation queue.
     * @param serializer The serializer to use when persisting to IndexedDb.
     */    static vr(t, e, n, s) {
        // TODO(mcg): Figure out what constraints there are on userIDs
        // In particular, are there any reserved characters? are empty ids allowed?
        // For the moment store these together in the same mutations table assuming
        // that empty userIDs aren't allowed.
        v("" !== t.uid);
        const i = t.t() ? t.uid : "";
        return new zs(i, e, n, s);
    }
    Sr(t) {
        let e = !0;
        const n = IDBKeyRange.bound([ this.userId, Number.NEGATIVE_INFINITY ], [ this.userId, Number.POSITIVE_INFINITY ]);
        return Ys(t).li({
            index: li.userMutationsIndex,
            range: n
        }, (t, n, s) => {
            e = !1, s.done();
        }).next(() => e);
    }
    Cr(t, e, n, s) {
        const i = Xs(t), r = Ys(t);
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
            v("number" == typeof o);
            const h = new ns(o, e, n, s), a = function(t, e, n) {
                const s = n.baseMutations.map(e => pe(t.yr, e)), i = n.mutations.map(e => pe(t.yr, e));
                return new li(e, n.batchId, n.yn.toMillis(), s, i);
            }(this.serializer, this.userId, h), c = [];
            let u = new ft((t, e) => O(t.U(), e.U()));
            for (const t of s) {
                const e = _i.key(this.userId, t.key.path, o);
                u = u.add(t.key.path.F()), c.push(r.put(a)), c.push(i.put(e, _i.PLACEHOLDER));
            }
            return u.forEach(e => {
                c.push(this.hs.Dr(t, e));
            }), t.ns(() => {
                this.br[o] = h.keys();
            }), rs.Wn(c).next(() => h);
        });
    }
    Nr(t, e) {
        return Ys(t).get(e).next(t => t ? (v(t.userId === this.userId), js(this.serializer, t)) : null);
    }
    /**
     * Returns the document keys for the mutation batch with the given batchId.
     * For primary clients, this method returns `null` after
     * `removeMutationBatches()` has been called. Secondary clients return a
     * cached result until `removeCachedMutationKeys()` is invoked.
     */
    // PORTING NOTE: Multi-tab only.
    xr(t, e) {
        return this.br[e] ? rs.resolve(this.br[e]) : this.Nr(t, e).next(t => {
            if (t) {
                const n = t.keys();
                return this.br[e] = n, n;
            }
            return null;
        });
    }
    kr(t, e) {
        const n = e + 1, s = IDBKeyRange.lowerBound([ this.userId, n ]);
        let i = null;
        return Ys(t).li({
            index: li.userMutationsIndex,
            range: s
        }, (t, e, s) => {
            e.userId === this.userId && (v(e.batchId >= n), i = js(this.serializer, e)), s.done();
        }).next(() => i);
    }
    Fr(t) {
        const e = IDBKeyRange.upperBound([ this.userId, Number.POSITIVE_INFINITY ]);
        let n = -1;
        return Ys(t).li({
            index: li.userMutationsIndex,
            range: e,
            reverse: !0
        }, (t, e, s) => {
            n = e.batchId, s.done();
        }).next(() => n);
    }
    Or(t) {
        const e = IDBKeyRange.bound([ this.userId, -1 ], [ this.userId, Number.POSITIVE_INFINITY ]);
        return Ys(t).hi(li.userMutationsIndex, e).next(t => t.map(t => js(this.serializer, t)));
    }
    cs(t, e) {
        // Scan the document-mutation index starting with a prefix starting with
        // the given documentKey.
        const n = _i.prefixForPath(this.userId, e.path), s = IDBKeyRange.lowerBound(n), i = [];
        return Xs(t).li({
            range: s
        }, (n, s, r) => {
            const [o, h, a] = n, c = Ms(h);
            // Only consider rows matching exactly the specific key of
            // interest. Note that because we order by path first, and we
            // order terminators before path separators, we'll encounter all
            // the index rows for documentKey contiguously. In particular, all
            // the rows for documentKey will occur before any rows for
            // documents nested in a subcollection beneath documentKey so we
            // can stop as soon as we hit any such row.
                        if (o === this.userId && e.path.isEqual(c)) 
            // Look up the mutation batch in the store.
            return Ys(t).get(a).next(t => {
                if (!t) throw b();
                v(t.userId === this.userId), i.push(js(this.serializer, t));
            });
            r.done();
        }).next(() => i);
    }
    ds(t, e) {
        let n = new ft(O);
        const s = [];
        return e.forEach(e => {
            const i = _i.prefixForPath(this.userId, e.path), r = IDBKeyRange.lowerBound(i), o = Xs(t).li({
                range: r
            }, (t, s, i) => {
                const [r, o, h] = t, a = Ms(o);
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
        }), rs.Wn(s).next(() => this.Mr(t, n));
    }
    Rs(t, e) {
        const n = e.path, s = n.length + 1, i = _i.prefixForPath(this.userId, n), r = IDBKeyRange.lowerBound(i);
        // Collect up unique batchIDs encountered during a scan of the index. Use a
        // SortedSet to accumulate batch IDs so they can be traversed in order in a
        // scan of the main table.
        let o = new ft(O);
        return Xs(t).li({
            range: r
        }, (t, e, i) => {
            const [r, h, a] = t, c = Ms(h);
            r === this.userId && n.L(c) ? 
            // Rows with document keys more than one segment longer than the
            // query path can't be matches. For example, a query on 'rooms'
            // can't match the document /rooms/abc/messages/xyx.
            // TODO(mcg): we'll need a different scanner when we implement
            // ancestor queries.
            c.length === s && (o = o.add(a)) : i.done();
        }).next(() => this.Mr(t, o));
    }
    Mr(t, e) {
        const n = [], s = [];
        // TODO(rockwood): Implement this using iterate.
        return e.forEach(e => {
            s.push(Ys(t).get(e).next(t => {
                if (null === t) throw b();
                v(t.userId === this.userId), n.push(js(this.serializer, t));
            }));
        }), rs.Wn(s).next(() => n);
    }
    $r(t, e) {
        return Js(t.Lr, this.userId, e).next(n => (t.ns(() => {
            this.qr(e.batchId);
        }), rs.forEach(n, e => this.pr.Br(t, e))));
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
    qr(t) {
        delete this.br[t];
    }
    Ur(t) {
        return this.Sr(t).next(e => {
            if (!e) return rs.resolve();
            // Verify that there are no entries in the documentMutations index if
            // the queue is empty.
                        const n = IDBKeyRange.lowerBound(_i.prefixForUser(this.userId)), s = [];
            return Xs(t).li({
                range: n
            }, (t, e, n) => {
                if (t[0] === this.userId) {
                    const e = Ms(t[1]);
                    s.push(e);
                } else n.done();
            }).next(() => {
                v(0 === s.length);
            });
        });
    }
    Wr(t, e) {
        return Hs(t, this.userId, e);
    }
    // PORTING NOTE: Multi-tab only (state is held in memory in other clients).
    /** Returns the mutation queue's metadata from IndexedDb. */
    Kr(t) {
        return Zs(t).get(this.userId).next(t => t || new ui(this.userId, -1, 
        /*lastStreamToken=*/ ""));
    }
}

/**
 * @return true if the mutation queue for the given user contains a pending
 *         mutation for the given key.
 */ function Hs(t, e, n) {
    const s = _i.prefixForPath(e, n.path), i = s[1], r = IDBKeyRange.lowerBound(s);
    let o = !1;
    return Xs(t).li({
        range: r,
        ui: !0
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
function Js(t, e, n) {
    const s = t.store(li.store), i = t.store(_i.store), r = [], o = IDBKeyRange.only(n.batchId);
    let h = 0;
    const a = s.li({
        range: o
    }, (t, e, n) => (h++, n.delete()));
    r.push(a.next(() => {
        v(1 === h);
    }));
    const c = [];
    for (const t of n.mutations) {
        const s = _i.key(e, t.key.path, n.batchId);
        r.push(i.delete(s)), c.push(t.key);
    }
    return rs.Wn(r).next(() => c);
}

/**
 * Helper to get a typed SimpleDbStore for the mutations object store.
 */ function Ys(t) {
    return xi.Js(t, li.store);
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */ function Xs(t) {
    return xi.Js(t, _i.store);
}

/**
 * Helper to get a typed SimpleDbStore for the mutationQueues object store.
 */ function Zs(t) {
    return xi.Js(t, ui.store);
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
 */ class ti {
    /**
     * @param {LocalSerializer} serializer The document serializer.
     * @param {IndexManager} indexManager The query indexes that need to be maintained.
     */
    constructor(t, e) {
        this.serializer = t, this.hs = e;
    }
    /**
     * Adds the supplied entries to the cache.
     *
     * All calls of `addEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
     */    zn(t, e, n) {
        return ni(t).put(si(e), n);
    }
    /**
     * Removes a document from the cache.
     *
     * All calls of `removeEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()` to ensure proper accounting of metadata.
     */    Jn(t, e) {
        const n = ni(t), s = si(e);
        return n.delete(s);
    }
    /**
     * Updates the current cache size.
     *
     * Callers to `addEntry()` and `removeEntry()` *must* call this afterwards to update the
     * cache's metadata.
     */    updateMetadata(t, e) {
        return this.getMetadata(t).next(n => (n.byteSize += e, this.jr(t, n)));
    }
    Yn(t, e) {
        return ni(t).get(si(e)).next(t => this.Qr(t));
    }
    /**
     * Looks up an entry in the cache.
     *
     * @param documentKey The key of the entry to look up.
     * @return The cached MaybeDocument entry and its size, or null if we have nothing cached.
     */    Gr(t, e) {
        return ni(t).get(si(e)).next(t => {
            const e = this.Qr(t);
            return e ? {
                zr: e,
                size: ii(t)
            } : null;
        });
    }
    getEntries(t, e) {
        let n = Et();
        return this.Hr(t, e, (t, e) => {
            const s = this.Qr(e);
            n = n._t(t, s);
        }).next(() => n);
    }
    /**
     * Looks up several entries in the cache.
     *
     * @param documentKeys The set of keys entries to look up.
     * @return A map of MaybeDocuments indexed by key (if a document cannot be
     *     found, the key will be mapped to null) and a map of sizes indexed by
     *     key (zero if the key cannot be found).
     */    Jr(t, e) {
        let n = Et(), s = new ut(j.D);
        return this.Hr(t, e, (t, e) => {
            const i = this.Qr(e);
            i ? (n = n._t(t, i), s = s._t(t, ii(e))) : (n = n._t(t, null), s = s._t(t, 0));
        }).next(() => ({
            Yr: n,
            Xr: s
        }));
    }
    Hr(t, e, n) {
        if (e.$()) return rs.resolve();
        const s = IDBKeyRange.bound(e.first().path.B(), e.last().path.B()), i = e.It();
        let r = i.yt();
        return ni(t).li({
            range: s
        }, (t, e, s) => {
            const o = j.tt(t);
            // Go through keys not found in cache.
                        for (;r && j.D(r, o) < 0; ) n(r, null), r = i.yt();
            r && r.isEqual(o) && (
            // Key found in cache.
            n(r, e), r = i.pt() ? i.yt() : null), 
            // Skip to the next key (if there is one).
            r ? s.ri(r.path.B()) : s.done();
        }).next(() => {
            // The rest of the keys are not in the cache. One case where `iterate`
            // above won't go through them is when the cache is empty.
            for (;r; ) n(r, null), r = i.pt() ? i.yt() : null;
        });
    }
    ws(t, e, n) {
        let s = At();
        const i = e.path.length + 1, r = {};
        if (n.isEqual(q.min())) {
            // Documents are ordered by key, so we can use a prefix scan to narrow
            // down the documents we need to match the query against.
            const t = e.path.B();
            r.range = IDBKeyRange.lowerBound(t);
        } else {
            // Execute an index-free query and filter by read time. This is safe
            // since all document changes to queries that have a
            // lastLimboFreeSnapshotVersion (`sinceReadTime`) have a read time set.
            const t = e.path.B(), s = Bs(n);
            r.range = IDBKeyRange.lowerBound([ t, s ], 
            /* open= */ !0), r.index = wi.collectionReadTimeIndex;
        }
        return ni(t).li(r, (t, n, r) => {
            // The query is actually returning any path that starts with the query
            // path prefix which may include documents in subcollections. For
            // example, a query on 'rooms' will return rooms/abc/messages/xyx but we
            // shouldn't match it. Fix this by discarding rows with document keys
            // more than one segment longer than the query path.
            if (t.length !== i) return;
            const o = Ls(this.serializer, n);
            e.path.L(o.key.path) ? o instanceof gn && Mn(e, o) && (s = s._t(o.key, o)) : r.done();
        }).next(() => s);
    }
    /**
     * Returns the set of documents that have changed since the specified read
     * time.
     */
    // PORTING NOTE: This is only used for multi-tab synchronization.
    Zr(t, e) {
        let n = Tt(), s = Bs(e);
        const i = ni(t), r = IDBKeyRange.lowerBound(s, !0);
        return i.li({
            index: wi.readTimeIndex,
            range: r
        }, (t, e) => {
            // Unlike `getEntry()` and others, `getNewDocumentChanges()` parses
            // the documents directly since we want to keep sentinel deletes.
            const i = Ls(this.serializer, e);
            n = n._t(i.key, i), s = e.readTime;
        }).next(() => ({
            to: n,
            readTime: Us(s)
        }));
    }
    /**
     * Returns the read time of the most recently read document in the cache, or
     * SnapshotVersion.min() if not available.
     */
    // PORTING NOTE: This is only used for multi-tab synchronization.
    eo(t) {
        const e = ni(t);
        // If there are no existing entries, we return SnapshotVersion.min().
                let n = q.min();
        return e.li({
            index: wi.readTimeIndex,
            reverse: !0
        }, (t, e, s) => {
            e.readTime && (n = Us(e.readTime)), s.done();
        }).next(() => n);
    }
    no(t) {
        return new ti.so(this, !!t && t.io);
    }
    ro(t) {
        return this.getMetadata(t).next(t => t.byteSize);
    }
    getMetadata(t) {
        return ei(t).get(Ti.key).next(t => (v(!!t), t));
    }
    jr(t, e) {
        return ei(t).put(Ti.key, e);
    }
    /**
     * Decodes `remoteDoc` and returns the document (or null, if the document
     * corresponds to the format used for sentinel deletes).
     */    Qr(t) {
        if (t) {
            const e = Ls(this.serializer, t);
            return e instanceof yn && e.version.isEqual(q.min()) ? null : e;
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
 */ function ei(t) {
    return xi.Js(t, Ti.store);
}

/**
 * Helper to get a typed SimpleDbStore for the remoteDocuments object store.
 */ function ni(t) {
    return xi.Js(t, wi.store);
}

function si(t) {
    return t.path.B();
}

/**
 * Retrusn an approximate size for the given document.
 */ function ii(t) {
    let e;
    if (t.document) e = t.document; else if (t.unknownDocument) e = t.unknownDocument; else {
        if (!t.noDocument) throw b();
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
 */ ti.so = class extends os {
    /**
     * @param documentCache The IndexedDbRemoteDocumentCache to apply the changes to.
     * @param trackRemovals Whether to create sentinel deletes that can be tracked by
     * `getNewDocumentChanges()`.
     */
    constructor(t, e) {
        super(), this.oo = t, this.io = e, 
        // A map of document sizes prior to applying the changes in this buffer.
        this.ho = new is(t => t.toString(), (t, e) => t.isEqual(e));
    }
    ts(t) {
        const e = [];
        let n = 0, s = new ft((t, e) => O(t.U(), e.U()));
        return this.jn.forEach((i, r) => {
            const o = this.ho.get(i);
            if (r) {
                const h = qs(this.oo.serializer, r, this.readTime);
                s = s.add(i.path.F());
                const a = ii(h);
                n += a - o, e.push(this.oo.zn(t, i, h));
            } else if (n -= o, this.io) {
                // In order to track removals, we store a "sentinel delete" in the
                // RemoteDocumentCache. This entry is represented by a NoDocument
                // with a version of 0 and ignored by `maybeDecodeDocument()` but
                // preserved in `getNewDocumentChanges()`.
                const n = qs(this.oo.serializer, new yn(i, q.min()), this.readTime);
                e.push(this.oo.zn(t, i, n));
            } else e.push(this.oo.Jn(t, i));
        }), s.forEach(n => {
            e.push(this.oo.hs.Dr(t, n));
        }), e.push(this.oo.updateMetadata(t, n)), rs.Wn(e);
    }
    Xn(t, e) {
        // Record the size of everything we load from the cache so we can compute a delta later.
        return this.oo.Gr(t, e).next(t => null === t ? (this.ho.set(e, 0), null) : (this.ho.set(e, t.size), 
        t.zr));
    }
    Zn(t, e) {
        // Record the size of everything we load from the cache so we can compute
        // a delta later.
        return this.oo.Jr(t, e).next(({Yr: t, Xr: e}) => (
        // Note: `getAllFromCache` returns two maps instead of a single map from
        // keys to `DocumentSizeEntry`s. This is to allow returning the
        // `NullableMaybeDocumentMap` directly, without a conversion.
        e.forEach((t, e) => {
            this.ho.set(t, e);
        }), t));
    }
};

class ri {
    constructor() {
        this.ao = new oi;
    }
    Dr(t, e) {
        return this.ao.add(e), rs.resolve();
    }
    As(t, e) {
        return rs.resolve(this.ao.getEntries(e));
    }
}

/**
 * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
 * Also used for in-memory caching by IndexedDbIndexManager and initial index population
 * in indexeddb_schema.ts
 */ class oi {
    constructor() {
        this.index = {};
    }
    // Returns false if the entry already existed.
    add(t) {
        const e = t.M(), n = t.F(), s = this.index[e] || new ft(U.D), i = !s.has(n);
        return this.index[e] = s.add(n), i;
    }
    has(t) {
        const e = t.M(), n = t.F(), s = this.index[e];
        return s && s.has(n);
    }
    getEntries(t) {
        return (this.index[t] || new ft(U.D)).B();
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
class hi {
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
        v(n < s && n >= 0 && s <= 10);
        const i = new Is(e);
        n < 1 && s >= 1 && (function(t) {
            t.createObjectStore(ci.store);
        }
        /**
 * An object to be stored in the 'mutationQueues' store in IndexedDb.
 *
 * Each user gets a single queue of MutationBatches to apply to the server.
 * DbMutationQueue tracks the metadata about the queue.
 */ (t), function(t) {
            t.createObjectStore(ui.store, {
                keyPath: ui.keyPath
            });
            t.createObjectStore(li.store, {
                keyPath: li.keyPath,
                autoIncrement: !0
            }).createIndex(li.userMutationsIndex, li.userMutationsKeyPath, {
                unique: !0
            }), t.createObjectStore(_i.store);
        }
        /**
 * Upgrade function to migrate the 'mutations' store from V1 to V3. Loads
 * and rewrites all data.
 */ (t), mi(t), function(t) {
            t.createObjectStore(wi.store);
        }
        /**
 * Represents the known absence of a document at a particular version.
 * Stored in IndexedDb as part of a DbRemoteDocument object.
 */ (t));
        // Migration 2 to populate the targetGlobal object no longer needed since
        // migration 3 unconditionally clears it.
                let r = rs.resolve();
        return n < 3 && s >= 3 && (
        // Brand new clients don't need to drop and recreate--only clients that
        // potentially have corrupt data.
        0 !== n && (!function(t) {
            t.deleteObjectStore(Ii.store), t.deleteObjectStore(Ei.store), t.deleteObjectStore(Ai.store);
        }(t), mi(t)), r = r.next(() => 
        /**
 * Creates the target global singleton row.
 *
 * @param {IDBTransaction} txn The version upgrade transaction for indexeddb
 */
        function(t) {
            const e = t.store(Ai.store), n = new Ai(
            /*highestTargetId=*/ 0, 
            /*lastListenSequenceNumber=*/ 0, q.min().S(), 
            /*targetCount=*/ 0);
            return e.put(Ai.key, n);
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
            return e.store(li.store).hi().next(n => {
                t.deleteObjectStore(li.store);
                t.createObjectStore(li.store, {
                    keyPath: li.keyPath,
                    autoIncrement: !0
                }).createIndex(li.userMutationsIndex, li.userMutationsKeyPath, {
                    unique: !0
                });
                const s = e.store(li.store), i = n.map(t => s.put(t));
                return rs.Wn(i);
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
                t.createObjectStore(Pi.store, {
                    keyPath: Pi.keyPath
                });
            }
            // Visible for testing
            (t);
        })), n < 5 && s >= 5 && (r = r.next(() => this.removeAcknowledgedMutations(i))), 
        n < 6 && s >= 6 && (r = r.next(() => (function(t) {
            t.createObjectStore(Ti.store);
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
                const e = t.objectStore(wi.store);
                e.createIndex(wi.readTimeIndex, wi.readTimeIndexPath, {
                    unique: !1
                }), e.createIndex(wi.collectionReadTimeIndex, wi.collectionReadTimeIndexPath, {
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
        return t.store(wi.store).li((t, n) => {
            e += ii(n);
        }).next(() => {
            const n = new Ti(e);
            return t.store(Ti.store).put(Ti.key, n);
        });
    }
    removeAcknowledgedMutations(t) {
        const e = t.store(ui.store), n = t.store(li.store);
        return e.hi().next(e => rs.forEach(e, e => {
            const s = IDBKeyRange.bound([ e.userId, -1 ], [ e.userId, e.lastAcknowledgedBatchId ]);
            return n.hi(li.userMutationsIndex, s).next(n => rs.forEach(n, n => {
                v(n.userId === e.userId);
                const s = js(this.serializer, n);
                return Js(t, e.userId, s).next(() => {});
            }));
        }));
    }
    /**
     * Ensures that every document in the remote document cache has a corresponding sentinel row
     * with a sequence number. Missing rows are given the most recently used sequence number.
     */    ensureSequenceNumbers(t) {
        const e = t.store(Ii.store), n = t.store(wi.store);
        return t.store(Ai.store).get(Ai.key).next(t => {
            const s = [];
            return n.li((n, i) => {
                const r = new U(n), o = function(t) {
                    return [ 0, ks(t) ];
                }
                /**
 * Wrapper class to store timestamps (seconds and nanos) in IndexedDb objects.
 */ (r);
                s.push(e.get(o).next(n => n ? rs.resolve() : (n => e.put(new Ii(0, ks(n), t.highestListenSequenceNumber)))(r)));
            }).next(() => rs.Wn(s));
        });
    }
    createCollectionParentIndex(t, e) {
        // Create the index.
        t.createObjectStore(Ri.store, {
            keyPath: Ri.keyPath
        });
        const n = e.store(Ri.store), s = new oi, i = t => {
            if (s.add(t)) {
                const e = t.M(), s = t.F();
                return n.put({
                    collectionId: e,
                    parent: ks(s)
                });
            }
        };
        // Helper to add an index entry iff we haven't already written it.
                // Index existing remote documents.
        return e.store(wi.store).li({
            ui: !0
        }, (t, e) => {
            const n = new U(t);
            return i(n.F());
        }).next(() => e.store(_i.store).li({
            ui: !0
        }, ([t, e, n], s) => {
            const r = Ms(e);
            return i(r.F());
        }));
    }
    rewriteCanonicalIds(t) {
        const e = t.store(Ei.store);
        return e.li((t, n) => {
            const s = Qs(n), i = Gs(this.serializer, s);
            return e.put(i);
        });
    }
}

class ai {
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
 */ class ci {
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
 */ ci.store = "owner", 
/**
 * The key string used for the single object that exists in the
 * DbPrimaryClient store.
 */
ci.key = "owner";

class ui {
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

/** Name of the IndexedDb object store.  */ ui.store = "mutationQueues", 
/** Keys are automatically assigned via the userId property. */
ui.keyPath = "userId";

/**
 * An object to be stored in the 'mutations' store in IndexedDb.
 *
 * Represents a batch of user-level mutations intended to be sent to the server
 * in a single write. Each user-level batch gets a separate DbMutationBatch
 * with a new batchId.
 */
class li {
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

/** Name of the IndexedDb object store.  */ li.store = "mutations", 
/** Keys are automatically assigned via the userId, batchId properties. */
li.keyPath = "batchId", 
/** The index name for lookup of mutations by user. */
li.userMutationsIndex = "userMutationsIndex", 
/** The user mutations index is keyed by [userId, batchId] pairs. */
li.userMutationsKeyPath = [ "userId", "batchId" ];

class _i {
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
        return [ t, ks(e) ];
    }
    /**
     * Creates a full index key of [userId, encodedPath, batchId] for inserting
     * and deleting into the DbDocumentMutations index.
     */    static key(t, e, n) {
        return [ t, ks(e), n ];
    }
}

_i.store = "documentMutations", 
/**
 * Because we store all the useful information for this store in the key,
 * there is no useful information to store as the value. The raw (unencoded)
 * path cannot be stored because IndexedDb doesn't store prototype
 * information.
 */
_i.PLACEHOLDER = new _i;

class fi {
    constructor(t, e) {
        this.path = t, this.readTime = e;
    }
}

/**
 * Represents a document that is known to exist but whose data is unknown.
 * Stored in IndexedDb as part of a DbRemoteDocument object.
 */ class di {
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
 */ class wi {
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

wi.store = "remoteDocuments", 
/**
 * An index that provides access to all entries sorted by read time (which
 * corresponds to the last modification time of each row).
 *
 * This index is used to provide a changelog for Multi-Tab.
 */
wi.readTimeIndex = "readTimeIndex", wi.readTimeIndexPath = "readTime", 
/**
 * An index that provides access to documents in a collection sorted by read
 * time.
 *
 * This index is used to allow the RemoteDocumentCache to fetch newly changed
 * documents in a collection.
 */
wi.collectionReadTimeIndex = "collectionReadTimeIndex", wi.collectionReadTimeIndexPath = [ "parentPath", "readTime" ];

/**
 * Contains a single entry that has metadata about the remote document cache.
 */
class Ti {
    /**
     * @param byteSize Approximately the total size in bytes of all the documents in the document
     * cache.
     */
    constructor(t) {
        this.byteSize = t;
    }
}

Ti.store = "remoteDocumentGlobal", Ti.key = "remoteDocumentGlobalKey";

class Ei {
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

Ei.store = "targets", 
/** Keys are automatically assigned via the targetId property. */
Ei.keyPath = "targetId", 
/** The name of the queryTargets index. */
Ei.queryTargetsIndexName = "queryTargetsIndex", 
/**
 * The index of all canonicalIds to the targets that they match. This is not
 * a unique mapping because canonicalId does not promise a unique name for all
 * possible queries, so we append the targetId to make the mapping unique.
 */
Ei.queryTargetsKeyPath = [ "canonicalId", "targetId" ];

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
class Ii {
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

/** Name of the IndexedDb object store.  */ Ii.store = "targetDocuments", 
/** Keys are automatically assigned via the targetId, path properties. */
Ii.keyPath = [ "targetId", "path" ], 
/** The index name for the reverse index. */
Ii.documentTargetsIndex = "documentTargetsIndex", 
/** We also need to create the reverse index for these properties. */
Ii.documentTargetsKeyPath = [ "path", "targetId" ];

/**
 * A record of global state tracked across all Targets, tracked separately
 * to avoid the need for extra indexes.
 *
 * This should be kept in-sync with the proto used in the iOS client.
 */
class Ai {
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
 */ Ai.key = "targetGlobalKey", Ai.store = "targetGlobal";

/**
 * An object representing an association between a Collection id (e.g. 'messages')
 * to a parent path (e.g. '/chats/123') that contains it as a (sub)collection.
 * This is used to efficiently find all collections to query when performing
 * a Collection Group query.
 */
class Ri {
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
    t.createObjectStore(Ii.store, {
        keyPath: Ii.keyPath
    }).createIndex(Ii.documentTargetsIndex, Ii.documentTargetsKeyPath, {
        unique: !0
    });
    // NOTE: This is unique only because the TargetId is the suffix.
    t.createObjectStore(Ei.store, {
        keyPath: Ei.keyPath
    }).createIndex(Ei.queryTargetsIndexName, Ei.queryTargetsKeyPath, {
        unique: !0
    }), t.createObjectStore(Ai.store);
}

Ri.store = "collectionParents", 
/** Keys are automatically assigned via the collectionId, parent properties. */
Ri.keyPath = [ "collectionId", "parent" ];

class Pi {
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

/** Name of the IndexedDb object store. */ Pi.store = "clientMetadata", 
/** Keys are automatically assigned via the clientId properties. */
Pi.keyPath = "clientId";

const Vi = [ ...[ ...[ ...[ ui.store, li.store, _i.store, wi.store, Ei.store, ci.store, Ai.store, Ii.store ], Pi.store ], Ti.store ], Ri.store ];

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
class gi {
    constructor() {
        /**
         * An in-memory copy of the index entries we've already written since the SDK
         * launched. Used to avoid re-writing the same entry repeatedly.
         *
         * This is *NOT* a complete cache of what's in persistence and so can never be used to
         * satisfy reads.
         */
        this.co = new oi;
    }
    /**
     * Adds a new entry to the collection parent index.
     *
     * Repeated calls for the same collectionPath should be avoided within a
     * transaction as IndexedDbIndexManager only caches writes once a transaction
     * has been committed.
     */    Dr(t, e) {
        if (!this.co.has(e)) {
            const n = e.M(), s = e.F();
            t.ns(() => {
                // Add the collection to the in memory cache only if the transaction was
                // successfully committed.
                this.co.add(e);
            });
            const i = {
                collectionId: n,
                parent: ks(s)
            };
            return yi(t).put(i);
        }
        return rs.resolve();
    }
    As(t, e) {
        const n = [], s = IDBKeyRange.bound([ e, "" ], [ $(e), "" ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0);
        return yi(t).hi(s).next(t => {
            for (const s of t) {
                // This collectionId guard shouldn't be necessary (and isn't as long
                // as we're running in a real browser), but there's a bug in
                // indexeddbshim that breaks our range in our tests running in node:
                // https://github.com/axemclion/IndexedDBShim/issues/334
                if (s.collectionId !== e) break;
                n.push(Ms(s.parent));
            }
            return n;
        });
    }
}

/**
 * Helper to get a typed SimpleDbStore for the collectionParents
 * document store.
 */ function yi(t) {
    return xi.Js(t, Ri.store);
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
class pi {
    constructor(t) {
        this.uo = t;
    }
    next() {
        return this.uo += 2, this.uo;
    }
    static lo() {
        // The target cache generator must return '2' in its first call to `next()`
        // as there is no differentiation in the protocol layer between an unset
        // number and the number '0'. If we were to sent a target with target ID
        // '0', the backend would consider it unset and replace it with its own ID.
        return new pi(0);
    }
    static _o() {
        // Sync engine assigns target IDs for limbo document detection.
        return new pi(-1);
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
 */ class bi {
    constructor(t, e) {
        this.pr = t, this.serializer = e;
    }
    // PORTING NOTE: We don't cache global metadata for the target cache, since
    // some of it (in particular `highestTargetId`) can be modified by secondary
    // tabs. We could perhaps be more granular (and e.g. still cache
    // `lastRemoteSnapshotVersion` in memory) but for simplicity we currently go
    // to IndexedDb whenever we need to read metadata. We can revisit if it turns
    // out to have a meaningful performance impact.
    fo(t) {
        return this.do(t).next(e => {
            const n = new pi(e.highestTargetId);
            return e.highestTargetId = n.next(), this.wo(t, e).next(() => e.highestTargetId);
        });
    }
    To(t) {
        return this.do(t).next(t => q.g(new L(t.lastRemoteSnapshotVersion.seconds, t.lastRemoteSnapshotVersion.nanoseconds)));
    }
    Eo(t) {
        return this.do(t).next(t => t.highestListenSequenceNumber);
    }
    Io(t, e, n) {
        return this.do(t).next(s => (s.highestListenSequenceNumber = e, n && (s.lastRemoteSnapshotVersion = n.S()), 
        e > s.highestListenSequenceNumber && (s.highestListenSequenceNumber = e), this.wo(t, s)));
    }
    Ao(t, e) {
        return this.Ro(t, e).next(() => this.do(t).next(n => (n.targetCount += 1, this.mo(e, n), 
        this.wo(t, n))));
    }
    Po(t, e) {
        return this.Ro(t, e);
    }
    Vo(t, e) {
        return this.yo(t, e.targetId).next(() => vi(t).delete(e.targetId)).next(() => this.do(t)).next(e => (v(e.targetCount > 0), 
        e.targetCount -= 1, this.wo(t, e)));
    }
    /**
     * Drops any targets with sequence number less than or equal to the upper bound, excepting those
     * present in `activeTargetIds`. Document associations for the removed targets are also removed.
     * Returns the number of targets removed.
     */    Rr(t, e, n) {
        let s = 0;
        const i = [];
        return vi(t).li((r, o) => {
            const h = Qs(o);
            h.sequenceNumber <= e && null === n.get(h.targetId) && (s++, i.push(this.Vo(t, h)));
        }).next(() => rs.Wn(i)).next(() => s);
    }
    /**
     * Call provided function with each `TargetData` that we have cached.
     */    Oe(t, e) {
        return vi(t).li((t, n) => {
            const s = Qs(n);
            e(s);
        });
    }
    do(t) {
        return Si(t).get(Ai.key).next(t => (v(null !== t), t));
    }
    wo(t, e) {
        return Si(t).put(Ai.key, e);
    }
    Ro(t, e) {
        return vi(t).put(Gs(this.serializer, e));
    }
    /**
     * In-place updates the provided metadata to account for values in the given
     * TargetData. Saving is done separately. Returns true if there were any
     * changes to the metadata.
     */    mo(t, e) {
        let n = !1;
        return t.targetId > e.highestTargetId && (e.highestTargetId = t.targetId, n = !0), 
        t.sequenceNumber > e.highestListenSequenceNumber && (e.highestListenSequenceNumber = t.sequenceNumber, 
        n = !0), n;
    }
    po(t) {
        return this.do(t).next(t => t.targetCount);
    }
    bo(t, e) {
        // Iterating by the canonicalId may yield more than one result because
        // canonicalId values are not required to be unique per target. This query
        // depends on the queryTargets index to be efficient.
        const n = Z(e), s = IDBKeyRange.bound([ n, Number.NEGATIVE_INFINITY ], [ n, Number.POSITIVE_INFINITY ]);
        let i = null;
        return vi(t).li({
            range: s,
            index: Ei.queryTargetsIndexName
        }, (t, n, s) => {
            const r = Qs(n);
            // After finding a potential match, check that the target is
            // actually equal to the requested target.
                        et(e, r.target) && (i = r, s.done());
        }).next(() => i);
    }
    vo(t, e, n) {
        // PORTING NOTE: The reverse index (documentsTargets) is maintained by
        // IndexedDb.
        const s = [], i = Ci(t);
        return e.forEach(e => {
            const r = ks(e.path);
            s.push(i.put(new Ii(n, r))), s.push(this.pr.So(t, n, e));
        }), rs.Wn(s);
    }
    Co(t, e, n) {
        // PORTING NOTE: The reverse index (documentsTargets) is maintained by
        // IndexedDb.
        const s = Ci(t);
        return rs.forEach(e, e => {
            const i = ks(e.path);
            return rs.Wn([ s.delete([ n, i ]), this.pr.Do(t, n, e) ]);
        });
    }
    yo(t, e) {
        const n = Ci(t), s = IDBKeyRange.bound([ e ], [ e + 1 ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0);
        return n.delete(s);
    }
    No(t, e) {
        const n = IDBKeyRange.bound([ e ], [ e + 1 ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0), s = Ci(t);
        let i = Pt();
        return s.li({
            range: n,
            ui: !0
        }, (t, e, n) => {
            const s = Ms(t[1]), r = new j(s);
            i = i.add(r);
        }).next(() => i);
    }
    Wr(t, e) {
        const n = ks(e.path), s = IDBKeyRange.bound([ n ], [ $(n) ], 
        /*lowerOpen=*/ !1, 
        /*upperOpen=*/ !0);
        let i = 0;
        return Ci(t).li({
            index: Ii.documentTargetsIndex,
            ui: !0,
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
    Ge(t, e) {
        return vi(t).get(e).next(t => t ? Qs(t) : null);
    }
}

/**
 * Helper to get a typed SimpleDbStore for the queries object store.
 */ function vi(t) {
    return xi.Js(t, Ei.store);
}

/**
 * Helper to get a typed SimpleDbStore for the target globals object store.
 */ function Si(t) {
    return xi.Js(t, Ai.store);
}

/**
 * Helper to get a typed SimpleDbStore for the document target object store.
 */ function Ci(t) {
    return xi.Js(t, Ii.store);
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
 */ const Di = "Failed to obtain exclusive access to the persistence layer. To allow shared access, make sure to invoke `enablePersistence()` with `synchronizeTabs:true` in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.";

/**
 * Oldest acceptable age in milliseconds for client metadata before the client
 * is considered inactive and its associated data is garbage collected.
 */ class Ni extends as {
    constructor(t, e) {
        super(), this.Lr = t, this.xo = e;
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
 */ class xi {
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
        this.Cs = i, this.window = r, this.document = o, this.ko = a, this.Fo = c, this.Oo = null, 
        this.Mo = !1, this.isPrimary = !1, this.networkEnabled = !0, 
        /** Our window.unload handler, if registered. */
        this.$o = null, this.inForeground = !1, 
        /** Our 'visibilitychange' listener if registered. */
        this.Lo = null, 
        /** The client metadata refresh task. */
        this.qo = null, 
        /** The last time we garbage collected the client metadata object store. */
        this.Bo = Number.NEGATIVE_INFINITY, 
        /** A listener to notify on primary state changes. */
        this.Uo = t => Promise.resolve(), !xi.Qs()) throw new D(C.UNIMPLEMENTED, "This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");
        this.pr = new Oi(this, s), this.Wo = e + "main", this.serializer = new $s(h), this.Ko = new ds(this.Wo, 10, new hi(this.serializer)), 
        this.jo = new bi(this.pr, this.serializer), this.hs = new gi, this.rs = new ti(this.serializer, this.hs), 
        this.window && this.window.localStorage ? this.Qo = this.window.localStorage : (this.Qo = null, 
        !1 === c && g("IndexedDbPersistence", "LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."));
    }
    static Js(t, e) {
        if (t instanceof Ni) return ds.Js(t.Lr, e);
        throw b();
    }
    /**
     * Attempt to start IndexedDb persistence.
     *
     * @return {Promise<void>} Whether persistence was enabled.
     */    start() {
        // NOTE: This is expected to fail sometimes (in the case of another tab
        // already having the persistence lock), so it's the first thing we should
        // do.
        return this.Go().then(() => {
            if (!this.isPrimary && !this.allowTabSynchronization) 
            // Fail `start()` if `synchronizeTabs` is disabled and we cannot
            // obtain the primary lease.
            throw new D(C.FAILED_PRECONDITION, Di);
            return this.zo(), this.Ho(), this.Jo(), this.runTransaction("getHighestListenSequenceNumber", "readonly", t => this.jo.Eo(t));
        }).then(t => {
            this.Oo = new ls(t, this.ko);
        }).then(() => {
            this.Mo = !0;
        }).catch(t => (this.Ko && this.Ko.close(), Promise.reject(t)));
    }
    /**
     * Registers a listener that gets called when the primary state of the
     * instance changes. Upon registering, this listener is invoked immediately
     * with the current primary state.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    Yo(t) {
        return this.Uo = async e => {
            if (this._r) return t(e);
        }, t(this.isPrimary);
    }
    /**
     * Registers a listener that gets called when the database receives a
     * version change event indicating that it has deleted.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    Xo(t) {
        this.Ko.Zs(async e => {
            // Check if an attempt is made to delete IndexedDB.
            null === e.newVersion && await t();
        });
    }
    /**
     * Adjusts the current network state in the client's metadata, potentially
     * affecting the primary lease.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    Zo(t) {
        this.networkEnabled !== t && (this.networkEnabled = t, 
        // Schedule a primary lease refresh for immediate execution. The eventual
        // lease update will be propagated via `primaryStateListener`.
        this.Cs.Ri(async () => {
            this._r && await this.Go();
        }));
    }
    /**
     * Updates the client metadata in IndexedDb and attempts to either obtain or
     * extend the primary lease for the local client. Asynchronously notifies the
     * primary state listener if the client either newly obtained or released its
     * primary lease.
     */    Go() {
        return this.runTransaction("updateClientMetadataAndTryBecomePrimary", "readwrite", t => Fi(t).put(new Pi(this.clientId, Date.now(), this.networkEnabled, this.inForeground)).next(() => {
            if (this.isPrimary) return this.th(t).next(t => {
                t || (this.isPrimary = !1, this.Cs.Fi(() => this.Uo(!1)));
            });
        }).next(() => this.eh(t)).next(e => this.isPrimary && !e ? this.nh(t).next(() => !1) : !!e && this.sh(t).next(() => !0))).catch(t => {
            if (Es(t)) 
            // Proceed with the existing state. Any subsequent access to
            // IndexedDB will verify the lease.
            return V("IndexedDbPersistence", "Failed to extend owner lease: ", t), this.isPrimary;
            if (!this.allowTabSynchronization) throw t;
            return V("IndexedDbPersistence", "Releasing owner lease after error during lease refresh", t), 
            /* isPrimary= */ !1;
        }).then(t => {
            this.isPrimary !== t && this.Cs.Fi(() => this.Uo(t)), this.isPrimary = t;
        });
    }
    th(t) {
        return ki(t).get(ci.key).next(t => rs.resolve(this.ih(t)));
    }
    rh(t) {
        return Fi(t).delete(this.clientId);
    }
    /**
     * If the garbage collection threshold has passed, prunes the
     * RemoteDocumentChanges and the ClientMetadata store based on the last update
     * time of all clients.
     */    async oh() {
        if (this.isPrimary && !this.hh(this.Bo, 18e5)) {
            this.Bo = Date.now();
            const t = await this.runTransaction("maybeGarbageCollectMultiClientState", "readwrite-primary", t => {
                const e = xi.Js(t, Pi.store);
                return e.hi().next(t => {
                    const n = this.ah(t, 18e5), s = t.filter(t => -1 === n.indexOf(t));
                    // Delete metadata for clients that are no longer considered active.
                    return rs.forEach(s, t => e.delete(t.clientId)).next(() => s);
                });
            }).catch(() => []);
            // Delete potential leftover entries that may continue to mark the
            // inactive clients as zombied in LocalStorage.
            // Ideally we'd delete the IndexedDb and LocalStorage zombie entries for
            // the client atomically, but we can't. So we opt to delete the IndexedDb
            // entries first to avoid potentially reviving a zombied client.
                        if (this.Qo) for (const e of t) this.Qo.removeItem(this.uh(e.clientId));
        }
    }
    /**
     * Schedules a recurring timer to update the client metadata and to either
     * extend or acquire the primary lease if the client is eligible.
     */    Jo() {
        this.qo = this.Cs.Bs("client_metadata_refresh" /* ClientMetadataRefresh */ , 4e3, () => this.Go().then(() => this.oh()).then(() => this.Jo()));
    }
    /** Checks whether `client` is the local client. */    ih(t) {
        return !!t && t.ownerId === this.clientId;
    }
    /**
     * Evaluate the state of all active clients and determine whether the local
     * client is or can act as the holder of the primary lease. Returns whether
     * the client is eligible for the lease, but does not actually acquire it.
     * May return 'false' even if there is no active leaseholder and another
     * (foreground) client should become leaseholder instead.
     */    eh(t) {
        if (this.Fo) return rs.resolve(!0);
        return ki(t).get(ci.key).next(e => {
            // A client is eligible for the primary lease if:
            // - its network is enabled and the client's tab is in the foreground.
            // - its network is enabled and no other client's tab is in the
            //   foreground.
            // - every clients network is disabled and the client's tab is in the
            //   foreground.
            // - every clients network is disabled and no other client's tab is in
            //   the foreground.
            // - the `forceOwningTab` setting was passed in.
            if (null !== e && this.hh(e.leaseTimestampMs, 5e3) && !this.lh(e.ownerId)) {
                if (this.ih(e) && this.networkEnabled) return !0;
                if (!this.ih(e)) {
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
                    throw new D(C.FAILED_PRECONDITION, Di);
                    return !1;
                }
            }
            return !(!this.networkEnabled || !this.inForeground) || Fi(t).hi().next(t => void 0 === this.ah(t, 5e3).find(t => {
                if (this.clientId !== t.clientId) {
                    const e = !this.networkEnabled && t.networkEnabled, n = !this.inForeground && t.inForeground, s = this.networkEnabled === t.networkEnabled;
                    if (e || n && s) return !0;
                }
                return !1;
            }));
        }).next(t => (this.isPrimary !== t && V("IndexedDbPersistence", `Client ${t ? "is" : "is not"} eligible for a primary lease.`), 
        t));
    }
    async _h() {
        // The shutdown() operations are idempotent and can be called even when
        // start() aborted (e.g. because it couldn't acquire the persistence lease).
        this.Mo = !1, this.fh(), this.qo && (this.qo.cancel(), this.qo = null), this.dh(), 
        this.wh(), 
        // Use `SimpleDb.runTransaction` directly to avoid failing if another tab
        // has obtained the primary lease.
        await this.Ko.runTransaction("readwrite", [ ci.store, Pi.store ], t => {
            const e = new Ni(t, ls.Ss);
            return this.nh(e).next(() => this.rh(e));
        }), this.Ko.close(), 
        // Remove the entry marking the client as zombied from LocalStorage since
        // we successfully deleted its metadata from IndexedDb.
        this.Th();
    }
    /**
     * Returns clients that are not zombied and have an updateTime within the
     * provided threshold.
     */    ah(t, e) {
        return t.filter(t => this.hh(t.updateTimeMs, e) && !this.lh(t.clientId));
    }
    /**
     * Returns the IDs of the clients that are currently active. If multi-tab
     * is not supported, returns an array that only contains the local client's
     * ID.
     *
     * PORTING NOTE: This is only used for Web multi-tab.
     */    Eh() {
        return this.runTransaction("getActiveClients", "readonly", t => Fi(t).hi().next(t => this.ah(t, 18e5).map(t => t.clientId)));
    }
    get _r() {
        return this.Mo;
    }
    Ih(t) {
        return zs.vr(t, this.serializer, this.hs, this.pr);
    }
    Ah() {
        return this.jo;
    }
    Rh() {
        return this.rs;
    }
    mh() {
        return this.hs;
    }
    runTransaction(t, e, n) {
        V("IndexedDbPersistence", "Starting transaction:", t);
        const s = "readonly" === e ? "readonly" : "readwrite";
        let i;
        // Do all transactions as readwrite against all object stores, since we
        // are the only reader/writer.
                return this.Ko.runTransaction(s, Vi, s => (i = new Ni(s, this.Oo ? this.Oo.next() : ls.Ss), 
        "readwrite-primary" === e ? this.th(i).next(t => !!t || this.eh(i)).next(e => {
            if (!e) throw g(`Failed to obtain primary lease for action '${t}'.`), this.isPrimary = !1, 
            this.Cs.Fi(() => this.Uo(!1)), new D(C.FAILED_PRECONDITION, hs);
            return n(i);
        }).next(t => this.sh(i).next(() => t)) : this.Ph(i).next(() => n(i)))).then(t => (i.ss(), 
        t));
    }
    /**
     * Verifies that the current tab is the primary leaseholder or alternatively
     * that the leaseholder has opted into multi-tab synchronization.
     */
    // TODO(b/114226234): Remove this check when `synchronizeTabs` can no longer
    // be turned off.
    Ph(t) {
        return ki(t).get(ci.key).next(t => {
            if (null !== t && this.hh(t.leaseTimestampMs, 5e3) && !this.lh(t.ownerId) && !this.ih(t) && !(this.Fo || this.allowTabSynchronization && t.allowTabSynchronization)) throw new D(C.FAILED_PRECONDITION, Di);
        });
    }
    /**
     * Obtains or extends the new primary lease for the local client. This
     * method does not verify that the client is eligible for this lease.
     */    sh(t) {
        const e = new ci(this.clientId, this.allowTabSynchronization, Date.now());
        return ki(t).put(ci.key, e);
    }
    static Qs() {
        return ds.Qs();
    }
    /** Checks the primary lease and removes it if we are the current primary. */    nh(t) {
        const e = ki(t);
        return e.get(ci.key).next(t => this.ih(t) ? (V("IndexedDbPersistence", "Releasing primary lease."), 
        e.delete(ci.key)) : rs.resolve());
    }
    /** Verifies that `updateTimeMs` is within `maxAgeMs`. */    hh(t, e) {
        const n = Date.now();
        return !(t < n - e) && (!(t > n) || (g(`Detected an update time that is in the future: ${t} > ${n}`), 
        !1));
    }
    zo() {
        null !== this.document && "function" == typeof this.document.addEventListener && (this.Lo = () => {
            this.Cs.Ri(() => (this.inForeground = "visible" === this.document.visibilityState, 
            this.Go()));
        }, this.document.addEventListener("visibilitychange", this.Lo), this.inForeground = "visible" === this.document.visibilityState);
    }
    dh() {
        this.Lo && (this.document.removeEventListener("visibilitychange", this.Lo), this.Lo = null);
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
     */    Ho() {
        var t;
        "function" == typeof (null === (t = this.window) || void 0 === t ? void 0 : t.addEventListener) && (this.$o = () => {
            // Note: In theory, this should be scheduled on the AsyncQueue since it
            // accesses internal state. We execute this code directly during shutdown
            // to make sure it gets a chance to run.
            this.fh(), this.Cs.Ri(() => this._h());
        }, this.window.addEventListener("unload", this.$o));
    }
    wh() {
        this.$o && (this.window.removeEventListener("unload", this.$o), this.$o = null);
    }
    /**
     * Returns whether a client is "zombied" based on its LocalStorage entry.
     * Clients become zombied when their tab closes without running all of the
     * cleanup logic in `shutdown()`.
     */    lh(t) {
        var e;
        try {
            const n = null !== (null === (e = this.Qo) || void 0 === e ? void 0 : e.getItem(this.uh(t)));
            return V("IndexedDbPersistence", `Client '${t}' ${n ? "is" : "is not"} zombied in LocalStorage`), 
            n;
        } catch (t) {
            // Gracefully handle if LocalStorage isn't working.
            return g("IndexedDbPersistence", "Failed to get zombied client id.", t), !1;
        }
    }
    /**
     * Record client as zombied (a client that had its tab closed). Zombied
     * clients are ignored during primary tab selection.
     */    fh() {
        if (this.Qo) try {
            this.Qo.setItem(this.uh(this.clientId), String(Date.now()));
        } catch (t) {
            // Gracefully handle if LocalStorage isn't available / working.
            g("Failed to set zombie client id.", t);
        }
    }
    /** Removes the zombied client entry if it exists. */    Th() {
        if (this.Qo) try {
            this.Qo.removeItem(this.uh(this.clientId));
        } catch (t) {
            // Ignore
        }
    }
    uh(t) {
        return `firestore_zombie_${this.persistenceKey}_${t}`;
    }
}

/**
 * Helper to get a typed SimpleDbStore for the primary client object store.
 */ function ki(t) {
    return xi.Js(t, ci.store);
}

/**
 * Helper to get a typed SimpleDbStore for the client metadata object store.
 */ function Fi(t) {
    return xi.Js(t, Pi.store);
}

/** Provides LRU functionality for IndexedDB persistence. */ class Oi {
    constructor(t, e) {
        this.db = t, this.ar = new xs(this, e);
    }
    Er(t) {
        const e = this.Vh(t);
        return this.db.Ah().po(t).next(t => e.next(e => t + e));
    }
    Vh(t) {
        let e = 0;
        return this.Ar(t, t => {
            e++;
        }).next(() => e);
    }
    Oe(t, e) {
        return this.db.Ah().Oe(t, e);
    }
    Ar(t, e) {
        return this.gh(t, (t, n) => e(n));
    }
    So(t, e, n) {
        return Mi(t, n);
    }
    Do(t, e, n) {
        return Mi(t, n);
    }
    Rr(t, e, n) {
        return this.db.Ah().Rr(t, e, n);
    }
    Br(t, e) {
        return Mi(t, e);
    }
    /**
     * Returns true if anything would prevent this document from being garbage
     * collected, given that the document in question is not present in any
     * targets and has a sequence number less than or equal to the upper bound for
     * the collection run.
     */    yh(t, e) {
        return function(t, e) {
            let n = !1;
            return Zs(t)._i(s => Hs(t, s, e).next(t => (t && (n = !0), rs.resolve(!t)))).next(() => n);
        }(t, e);
    }
    mr(t, e) {
        const n = this.db.Rh().no(), s = [];
        let i = 0;
        return this.gh(t, (r, o) => {
            if (o <= e) {
                const e = this.yh(t, r).next(e => {
                    if (!e) 
                    // Our size accounting requires us to read all documents before
                    // removing them.
                    return i++, n.Yn(t, r).next(() => (n.Jn(r), Ci(t).delete([ 0, ks(r.path) ])));
                });
                s.push(e);
            }
        }).next(() => rs.Wn(s)).next(() => n.apply(t)).next(() => i);
    }
    removeTarget(t, e) {
        const n = e.ct(t.xo);
        return this.db.Ah().Po(t, n);
    }
    ph(t, e) {
        return Mi(t, e);
    }
    /**
     * Call provided function for each document in the cache that is 'orphaned'. Orphaned
     * means not a part of any target, so the only entry in the target-document index for
     * that document will be the sentinel row (targetId 0), which will also have the sequence
     * number for the last time the document was accessed.
     */    gh(t, e) {
        const n = Ci(t);
        let s, i = ls.Ss;
        return n.li({
            index: Ii.documentTargetsIndex
        }, ([t, n], {path: r, sequenceNumber: o}) => {
            0 === t ? (
            // if nextToReport is valid, report it, this is a new key so the
            // last one must not be a member of any targets.
            i !== ls.Ss && e(new j(Ms(s)), i), 
            // set nextToReport to be this sequence number. It's the next one we
            // might report, if we don't find any targets for this document.
            // Note that the sequence number must be defined when the targetId
            // is 0.
            i = o, s = r) : 
            // set nextToReport to be invalid, we know we don't need to report
            // this one since we found a target for it.
            i = ls.Ss;
        }).next(() => {
            // Since we report sequence numbers after getting to the next key, we
            // need to check if the last key we iterated over was an orphaned
            // document and report it.
            i !== ls.Ss && e(new j(Ms(s)), i);
        });
    }
    Vr(t) {
        return this.db.Rh().ro(t);
    }
}

function Mi(t, e) {
    return Ci(t).put(
    /**
 * @return A value suitable for writing a sentinel row in the target-document
 * store.
 */
    function(t, e) {
        return new Ii(0, ks(t.path), e);
    }(e, t.xo));
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
    return t.nt || (n += "." + t.database), "firestore/" + e + "/" + n + "/";
}

async function Li(t) {
    if (!ds.Qs()) return Promise.resolve();
    const e = t + "main";
    await ds.delete(e);
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
class qi {
    constructor(
    /** Manages our in-memory or durable persistence. */
    t, e, n) {
        this.persistence = t, this.bh = e, 
        /**
         * Maps a targetID to data about its target.
         *
         * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
         * of `applyRemoteEvent()` idempotent.
         */
        this.vh = new ut(O), 
        /** Maps a target to its targetID. */
        // TODO(wuandy): Evaluate if TargetId can be part of Target.
        this.Sh = new is(t => Z(t), et), 
        /**
         * The read time of the last entry processed by `getNewDocumentChanges()`.
         *
         * PORTING NOTE: This is only used for multi-tab synchronization.
         */
        this.Ch = q.min(), this.os = t.Ih(n), this.Dh = t.Rh(), this.jo = t.Ah(), this.Nh = new cs(this.Dh, this.os, this.persistence.mh()), 
        this.bh.xh(this.Nh);
    }
    async kh(t) {
        let e = this.os, n = this.Nh;
        const s = await this.persistence.runTransaction("Handle user change", "readonly", s => {
            // Swap out the mutation queue, grabbing the pending mutation batches
            // before and after.
            let i;
            return this.os.Or(s).next(r => (i = r, e = this.persistence.Ih(t), 
            // Recreate our LocalDocumentsView using the new
            // MutationQueue.
            n = new cs(this.Dh, e, this.persistence.mh()), e.Or(s))).next(t => {
                const e = [], r = [];
                // Union the old/new changed keys.
                let o = Pt();
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
                                return n._s(s, o).next(t => ({
                    Fh: t,
                    Oh: e,
                    Mh: r
                }));
            });
        });
        return this.os = e, this.Nh = n, this.bh.xh(this.Nh), s;
    }
    $h(t) {
        const e = L.now(), n = t.reduce((t, e) => t.add(e.key), Pt());
        let s;
        return this.persistence.runTransaction("Locally write mutations", "readwrite", i => this.Nh._s(i, n).next(n => {
            s = n;
            // For non-idempotent mutations (such as `FieldValue.increment()`),
            // we record the base state in a separate patch mutation. This is
            // later used to guarantee consistent values and prevents flicker
            // even if the backend sends us an update that already includes our
            // transform.
            const r = [];
            for (const e of t) {
                const t = cn(e, s.get(e.key));
                null != t && 
                // NOTE: The base state should only be applied if there's some
                // existing document to override, so use a Precondition of
                // exists=true
                r.push(new fn(e.key, t, Pn(t.proto.mapValue), sn.exists(!0)));
            }
            return this.os.Cr(i, e, r, t);
        })).then(t => {
            const e = t.Sn(s);
            return {
                batchId: t.batchId,
                jn: e
            };
        });
    }
    Lh(t) {
        return this.persistence.runTransaction("Acknowledge batch", "readwrite-primary", e => {
            const n = t.batch.keys(), s = this.Dh.no({
                io: !0
            });
            return this.qh(e, t, s).next(() => s.apply(e)).next(() => this.os.Ur(e)).next(() => this.Nh._s(e, n));
        });
    }
    Bh(t) {
        return this.persistence.runTransaction("Reject batch", "readwrite-primary", e => {
            let n;
            return this.os.Nr(e, t).next(t => (v(null !== t), n = t.keys(), this.os.$r(e, t))).next(() => this.os.Ur(e)).next(() => this.Nh._s(e, n));
        });
    }
    Fr() {
        return this.persistence.runTransaction("Get highest unacknowledged batch id", "readonly", t => this.os.Fr(t));
    }
    To() {
        return this.persistence.runTransaction("Get last remote snapshot version", "readonly", t => this.jo.To(t));
    }
    Uh(t) {
        const e = t.at;
        let n = this.vh;
        return this.persistence.runTransaction("Apply remote event", "readwrite-primary", s => {
            const i = this.Dh.no({
                io: !0
            });
            // Reset newTargetDataByTargetMap in case this transaction gets re-run.
                        n = this.vh;
            const r = [];
            t.Zt.forEach((t, i) => {
                const o = n.get(i);
                if (!o) return;
                // Only update the remote keys if the target is still active. This
                // ensures that we can persist the updated target data along with
                // the updated assignment.
                                r.push(this.jo.Co(s, t.ae, i).next(() => this.jo.vo(s, t.oe, i)));
                const h = t.resumeToken;
                // Update the resume token if the change includes one.
                                if (h.rt() > 0) {
                    const a = o.ut(h, e).ct(s.xo);
                    n = n._t(i, a), 
                    // Update the target data if there are target changes (or if
                    // sufficient time has passed since the last update).
                    qi.Wh(o, a, t) && r.push(this.jo.Po(s, a));
                }
            });
            let o = Tt(), h = Pt();
            // HACK: The only reason we allow a null snapshot version is so that we
            // can synthesize remote events when we get permission denied errors while
            // trying to resolve the state of a locally cached document that is in
            // limbo.
            if (t.ee.forEach((t, e) => {
                h = h.add(t);
            }), 
            // Each loop iteration only affects its "own" doc, so it's safe to get all the remote
            // documents in advance in a single call.
            r.push(i.getEntries(s, h).next(n => {
                t.ee.forEach((h, a) => {
                    const c = n.get(h);
                    // Note: The order of the steps below is important, since we want
                    // to ensure that rejected limbo resolutions (which fabricate
                    // NoDocuments with SnapshotVersion.min()) never add documents to
                    // cache.
                                        a instanceof yn && a.version.isEqual(q.min()) ? (
                    // NoDocuments with SnapshotVersion.min() are used in manufactured
                    // events. We remove these documents from cache since we lost
                    // access.
                    i.Jn(h, e), o = o._t(h, a)) : null == c || a.version.p(c.version) > 0 || 0 === a.version.p(c.version) && c.hasPendingWrites ? (i.zn(a, e), 
                    o = o._t(h, a)) : V("LocalStore", "Ignoring outdated watch update for ", h, ". Current version:", c.version, " Watch version:", a.version), 
                    t.ne.has(h) && r.push(this.persistence.pr.ph(s, h));
                });
            })), !e.isEqual(q.min())) {
                const t = this.jo.To(s).next(t => this.jo.Io(s, s.xo, e));
                r.push(t);
            }
            return rs.Wn(r).next(() => i.apply(s)).next(() => this.Nh.fs(s, o));
        }).then(t => (this.vh = n, t));
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
     */    static Wh(t, e, n) {
        // Always persist target data if we don't already have a resume token.
        if (v(e.resumeToken.rt() > 0), 0 === t.resumeToken.rt()) return !0;
        // Don't allow resume token changes to be buffered indefinitely. This
        // allows us to be reasonably up-to-date after a crash and avoids needing
        // to loop over all active queries on shutdown. Especially in the browser
        // we may not get time to do anything interesting while the current tab is
        // closing.
                if (e.at.v() - t.at.v() >= this.Kh) return !0;
        // Otherwise if the only thing that has changed about a target is its resume
        // token it's not worth persisting. Note that the RemoteStore keeps an
        // in-memory view of the currently active targets which includes the current
        // resume token, so stream failure or user changes will still use an
        // up-to-date resume token regardless of what we do here.
                return n.oe.size + n.he.size + n.ae.size > 0;
    }
    async jh(t) {
        try {
            await this.persistence.runTransaction("notifyLocalViewChanges", "readwrite", e => rs.forEach(t, t => rs.forEach(t.Ps, n => this.persistence.pr.So(e, t.targetId, n)).next(() => rs.forEach(t.Vs, n => this.persistence.pr.Do(e, t.targetId, n)))));
        } catch (t) {
            if (!Es(t)) throw t;
            // If `notifyLocalViewChanges` fails, we did not advance the sequence
            // number for the documents that were included in this transaction.
            // This might trigger them to be deleted earlier than they otherwise
            // would have, but it should not invalidate the integrity of the data.
            V("LocalStore", "Failed to update sequence numbers: " + t);
        }
        for (const e of t) {
            const t = e.targetId;
            if (!e.fromCache) {
                const e = this.vh.get(t), n = e.at, s = e.lt(n);
                // Advance the last limbo free snapshot version
                                this.vh = this.vh._t(t, s);
            }
        }
    }
    Qh(t) {
        return this.persistence.runTransaction("Get next mutation batch", "readonly", e => (void 0 === t && (t = -1), 
        this.os.kr(e, t)));
    }
    Gh(t) {
        return this.persistence.runTransaction("read document", "readonly", e => this.Nh.as(e, t));
    }
    zh(t) {
        return this.persistence.runTransaction("Allocate target", "readwrite", e => {
            let n;
            return this.jo.bo(e, t).next(s => s ? (
            // This target has been listened to previously, so reuse the
            // previous targetID.
            // TODO(mcg): freshen last accessed date?
            n = s, rs.resolve(n)) : this.jo.fo(e).next(s => (n = new it(t, s, 0 /* Listen */ , e.xo), 
            this.jo.Ao(e, n).next(() => n))));
        }).then(e => {
            // If Multi-Tab is enabled, the existing target data may be newer than
            // the in-memory data
            const n = this.vh.get(e.targetId);
            return (null === n || e.at.p(n.at) > 0) && (this.vh = this.vh._t(e.targetId, e), 
            this.Sh.set(t, e.targetId)), e;
        });
    }
    bo(t, e) {
        const n = this.Sh.get(e);
        return void 0 !== n ? rs.resolve(this.vh.get(n)) : this.jo.bo(t, e);
    }
    async Hh(t, e) {
        const n = this.vh.get(t), s = e ? "readwrite" : "readwrite-primary";
        try {
            e || await this.persistence.runTransaction("Release target", s, t => this.persistence.pr.removeTarget(t, n));
        } catch (e) {
            if (!Es(e)) throw e;
            // All `releaseTarget` does is record the final metadata state for the
            // target, but we've been recording this periodically during target
            // activity. If we lose this write this could cause a very slight
            // difference in the order of target deletion during GC, but we
            // don't define exact LRU semantics so this is acceptable.
            V("LocalStore", `Failed to update sequence numbers for target ${t}: ${e}`);
        }
        this.vh = this.vh.remove(t), this.Sh.delete(n.target);
    }
    Jh(t, e) {
        let n = q.min(), s = Pt();
        return this.persistence.runTransaction("Execute query", "readonly", i => this.bo(i, xn(t)).next(t => {
            if (t) return n = t.lastLimboFreeSnapshotVersion, this.jo.No(i, t.targetId).next(t => {
                s = t;
            });
        }).next(() => this.bh.ws(i, t, e ? n : q.min(), e ? s : Pt())).next(t => ({
            documents: t,
            Yh: s
        })));
    }
    qh(t, e, n) {
        const s = e.batch, i = s.keys();
        let r = rs.resolve();
        return i.forEach(i => {
            r = r.next(() => n.Yn(t, i)).next(t => {
                let r = t;
                const o = e.Dn.get(i);
                v(null !== o), (!r || r.version.p(o) < 0) && (r = s.pn(i, r, e), r && 
                // We use the commitVersion as the readTime rather than the
                // document's updateTime since the updateTime is not advanced
                // for updates that do not modify the underlying document.
                n.zn(r, e.Cn));
            });
        }), r.next(() => this.os.$r(t, s));
    }
    dr(t) {
        return this.persistence.runTransaction("Collect garbage", "readwrite-primary", e => t.Pr(e, this.vh));
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
function Bi(t, e) {
    const n = S(t), s = S(n.jo), i = n.vh.get(e);
    return i ? Promise.resolve(i.target) : n.persistence.runTransaction("Get target data", "readonly", t => s.Ge(t, e).next(t => t ? t.target : null));
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
async function Ui(t) {
    if (t.code !== C.FAILED_PRECONDITION || t.message !== hs) throw t;
    V("LocalStore", "Unexpectedly lost primary lease");
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
 */ qi.Kh = 3e8;

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
class Wi {
    constructor(t, e, n, s, i, r) {
        this.Cs = t, this.Xh = n, this.Zh = s, this.ta = i, this.listener = r, this.state = 0 /* Initial */ , 
        /**
         * A close count that's incremented every time the stream is closed; used by
         * getCloseGuardedDispatcher() to invalidate callbacks that happen after
         * close.
         */
        this.ea = 0, this.na = null, this.stream = null, this.vi = new fs(t, e);
    }
    /**
     * Returns true if start() has been called and no error has occurred. True
     * indicates the stream is open or in the process of opening (which
     * encompasses respecting backoff, getting auth tokens, and starting the
     * actual RPC). Use isOpen() to determine if the stream is open and ready for
     * outbound requests.
     */    sa() {
        return 1 /* Starting */ === this.state || 2 /* Open */ === this.state || 4 /* Backoff */ === this.state;
    }
    /**
     * Returns true if the underlying RPC is open (the onOpen() listener has been
     * called) and the stream is ready for outbound requests.
     */    ia() {
        return 2 /* Open */ === this.state;
    }
    /**
     * Starts the RPC. Only allowed if isStarted() returns false. The stream is
     * not immediately ready for use: onOpen() will be invoked when the RPC is
     * ready for outbound requests, at which point isOpen() will return true.
     *
     * When start returns, isStarted() will return true.
     */    start() {
        3 /* Error */ !== this.state ? this.auth() : this.ra();
    }
    /**
     * Stops the RPC. This call is idempotent and allowed regardless of the
     * current isStarted() state.
     *
     * When stop returns, isStarted() and isOpen() will both return false.
     */    async stop() {
        this.sa() && await this.close(0 /* Initial */);
    }
    /**
     * After an error the stream will usually back off on the next attempt to
     * start it. If the error warrants an immediate restart of the stream, the
     * sender can use this to indicate that the receiver should not back off.
     *
     * Each error will call the onClose() listener. That function can decide to
     * inhibit backoff if required.
     */    oa() {
        this.state = 0 /* Initial */ , this.vi.reset();
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
     */    ha() {
        // Starts the idle time if we are in state 'Open' and are not yet already
        // running a timer (in which case the previous idle timeout still applies).
        this.ia() && null === this.na && (this.na = this.Cs.Bs(this.Xh, 6e4, () => this.aa()));
    }
    /** Sends a message to the underlying stream. */    ca(t) {
        this.ua(), this.stream.send(t);
    }
    /** Called by the idle timer when the stream should close due to inactivity. */    async aa() {
        if (this.ia()) 
        // When timing out an idle stream there's no reason to force the stream into backoff when
        // it restarts so set the stream state to Initial instead of Error.
        return this.close(0 /* Initial */);
    }
    /** Marks the stream as active again. */    ua() {
        this.na && (this.na.cancel(), this.na = null);
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
        this.ua(), this.vi.cancel(), 
        // Invalidates any stream-related callbacks (e.g. from auth or the
        // underlying stream), guaranteeing they won't execute.
        this.ea++, 3 /* Error */ !== t ? 
        // If this is an intentional close ensure we don't delay our next connection attempt.
        this.vi.reset() : e && e.code === C.RESOURCE_EXHAUSTED ? (
        // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
        g(e.toString()), g("Using maximum backoff delay to prevent overloading the backend."), 
        this.vi.$s()) : e && e.code === C.UNAUTHENTICATED && 
        // "unauthenticated" error means the token was rejected. Try force refreshing it in case it
        // just expired.
        this.ta.A(), 
        // Clean up the underlying stream because we are no longer interested in events.
        null !== this.stream && (this.la(), this.stream.close(), this.stream = null), 
        // This state must be assigned before calling onClose() to allow the callback to
        // inhibit backoff or otherwise manipulate the state in its non-started state.
        this.state = t, 
        // Notify the listener that the stream closed.
        await this.listener._a(e);
    }
    /**
     * Can be overridden to perform additional cleanup before the stream is closed.
     * Calling super.tearDown() is not required.
     */    la() {}
    auth() {
        this.state = 1 /* Starting */;
        const t = this.fa(this.ea), e = this.ea;
        // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
                this.ta.getToken().then(t => {
            // Stream can be stopped while waiting for authentication.
            // TODO(mikelehen): We really should just use dispatchIfNotClosed
            // and let this dispatch onto the queue, but that opened a spec test can
            // of worms that I don't want to deal with in this PR.
            this.ea === e && 
            // Normally we'd have to schedule the callback on the AsyncQueue.
            // However, the following calls are safe to be called outside the
            // AsyncQueue since they don't chain asynchronous calls
            this.da(t);
        }, e => {
            t(() => {
                const t = new D(C.UNKNOWN, "Fetching auth token failed: " + e.message);
                return this.wa(t);
            });
        });
    }
    da(t) {
        const e = this.fa(this.ea);
        this.stream = this.Ta(t), this.stream.Ea(() => {
            e(() => (this.state = 2 /* Open */ , this.listener.Ea()));
        }), this.stream._a(t => {
            e(() => this.wa(t));
        }), this.stream.onMessage(t => {
            e(() => this.onMessage(t));
        });
    }
    ra() {
        this.state = 4 /* Backoff */ , this.vi.Ls(async () => {
            this.state = 0 /* Initial */ , this.start();
        });
    }
    // Visible for tests
    wa(t) {
        // In theory the stream could close cleanly, however, in our current model
        // we never expect this to happen because if we stop a stream ourselves,
        // this callback will never be called. To prevent cases where we retry
        // without a backoff accidentally, we set the stream to error in all cases.
        return V("PersistentStream", "close with error: " + t), this.stream = null, this.close(3 /* Error */ , t);
    }
    /**
     * Returns a "dispatcher" function that dispatches operations onto the
     * AsyncQueue but only runs them if closeCount remains unchanged. This allows
     * us to turn auth / stream callbacks into no-ops if the stream is closed /
     * re-opened, etc.
     */    fa(t) {
        return e => {
            this.Cs.Ri(() => this.ea === t ? e() : (V("PersistentStream", "stream callback skipped by getCloseGuardedDispatcher."), 
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
 */ class Ki extends Wi {
    constructor(t, e, n, s, i) {
        super(t, "listen_stream_connection_backoff" /* ListenStreamConnectionBackoff */ , "listen_stream_idle" /* ListenStreamIdle */ , e, n, i), 
        this.serializer = s;
    }
    Ta(t) {
        return this.Zh.Ia("Listen", t);
    }
    onMessage(t) {
        // A successful response means the stream is healthy
        this.vi.reset();
        const e = ye(this.serializer, t), n = function(t) {
            // We have only reached a consistent snapshot for the entire stream if there
            // is a read_time set and it applies to all targets (i.e. the list of
            // targets is empty). The backend is guaranteed to send such responses.
            if (!("targetChange" in t)) return q.min();
            const e = t.targetChange;
            return e.targetIds && e.targetIds.length ? q.min() : e.readTime ? de(e.readTime) : q.min();
        }(t);
        return this.listener.Aa(e, n);
    }
    /**
     * Registers interest in the results of the given target. If the target
     * includes a resumeToken it will be included in the request. Results that
     * affect the target will be streamed back as WatchChange messages that
     * reference the targetId.
     */    Ra(t) {
        const e = {};
        e.database = me(this.serializer), e.addTarget = function(t, e) {
            let n;
            const s = e.target;
            return n = nt(s) ? {
                documents: Se(t, s)
            } : {
                query: Ce(t, s)
            }, n.targetId = e.targetId, e.resumeToken.rt() > 0 && (n.resumeToken = _e(t, e.resumeToken)), 
            n;
        }(this.serializer, t);
        const n = Ne(this.serializer, t);
        n && (e.labels = n), this.ca(e);
    }
    /**
     * Unregisters interest in the results of the target associated with the
     * given targetId.
     */    ma(t) {
        const e = {};
        e.database = me(this.serializer), e.removeTarget = t, this.ca(e);
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
 */ class ji extends Wi {
    constructor(t, e, n, s, i) {
        super(t, "write_stream_connection_backoff" /* WriteStreamConnectionBackoff */ , "write_stream_idle" /* WriteStreamIdle */ , e, n, i), 
        this.serializer = s, this.Pa = !1;
    }
    /**
     * Tracks whether or not a handshake has been successfully exchanged and
     * the stream is ready to accept mutations.
     */    get Va() {
        return this.Pa;
    }
    // Override of PersistentStream.start
    start() {
        this.Pa = !1, this.lastStreamToken = void 0, super.start();
    }
    la() {
        this.Pa && this.ga([]);
    }
    Ta(t) {
        return this.Zh.Ia("Write", t);
    }
    onMessage(t) {
        if (
        // Always capture the last stream token.
        v(!!t.streamToken), this.lastStreamToken = t.streamToken, this.Pa) {
            // A successful first write response means the stream is healthy,
            // Note, that we could consider a successful handshake healthy, however,
            // the write itself might be causing an error we want to back off from.
            this.vi.reset();
            const e = ve(t.writeResults, t.commitTime), n = de(t.commitTime);
            return this.listener.ya(n, e);
        }
        // The first response is always the handshake response
        return v(!t.writeResults || 0 === t.writeResults.length), this.Pa = !0, this.listener.pa();
    }
    /**
     * Sends an initial streamToken to the server, performing the handshake
     * required to make the StreamingWrite RPC work. Subsequent
     * calls should wait until onHandshakeComplete was called.
     */    ba() {
        // TODO(dimond): Support stream resumption. We intentionally do not set the
        // stream token on the handshake, ignoring any stream token we might have.
        const t = {};
        t.database = me(this.serializer), this.ca(t);
    }
    /** Sends a group of mutations to the Firestore backend to apply. */    ga(t) {
        const e = {
            streamToken: this.lastStreamToken,
            writes: t.map(t => pe(this.serializer, t))
        };
        this.ca(e);
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
class Qi extends class {} {
    constructor(t, e, n) {
        super(), this.credentials = t, this.Zh = e, this.serializer = n, this.va = !1;
    }
    Sa() {
        if (this.va) throw new D(C.FAILED_PRECONDITION, "The client has already been terminated.");
    }
    /** Gets an auth token and invokes the provided RPC. */    Ca(t, e, n) {
        return this.Sa(), this.credentials.getToken().then(s => this.Zh.Ca(t, e, n, s)).catch(t => {
            throw t.code === C.UNAUTHENTICATED && this.credentials.A(), t;
        });
    }
    /** Gets an auth token and invokes the provided RPC with streamed results. */    Da(t, e, n) {
        return this.Sa(), this.credentials.getToken().then(s => this.Zh.Da(t, e, n, s)).catch(t => {
            throw t.code === C.UNAUTHENTICATED && this.credentials.A(), t;
        });
    }
    terminate() {
        this.va = !1;
    }
}

// TODO(firestorexp): Make sure there is only one Datastore instance per
// firestore-exp client.
function Gi(t, e, n) {
    return new Qi(t, e, n);
}

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
class zi {
    constructor(t, e) {
        this.fi = t, this.Na = e, 
        /** The current OnlineState. */
        this.state = "Unknown" /* Unknown */ , 
        /**
         * A count of consecutive failures to open the stream. If it reaches the
         * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
         * Offline.
         */
        this.xa = 0, 
        /**
         * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
         * transition from OnlineState.Unknown to OnlineState.Offline without waiting
         * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
         */
        this.ka = null, 
        /**
         * Whether the client should log a warning message if it fails to connect to
         * the backend (initially true, cleared after a successful stream, or if we've
         * logged the message already).
         */
        this.Fa = !0;
    }
    /**
     * Called by RemoteStore when a watch stream is started (including on each
     * backoff attempt).
     *
     * If this is the first attempt, it sets the OnlineState to Unknown and starts
     * the onlineStateTimer.
     */    Oa() {
        0 === this.xa && (this.Ma("Unknown" /* Unknown */), this.ka = this.fi.Bs("online_state_timeout" /* OnlineStateTimeout */ , 1e4, () => (this.ka = null, 
        this.$a("Backend didn't respond within 10 seconds."), this.Ma("Offline" /* Offline */), 
        Promise.resolve())));
    }
    /**
     * Updates our OnlineState as appropriate after the watch stream reports a
     * failure. The first failure moves us to the 'Unknown' state. We then may
     * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
     * actually transition to the 'Offline' state.
     */    La(t) {
        "Online" /* Online */ === this.state ? this.Ma("Unknown" /* Unknown */) : (this.xa++, 
        this.xa >= 1 && (this.qa(), this.$a("Connection failed 1 times. Most recent error: " + t.toString()), 
        this.Ma("Offline" /* Offline */)));
    }
    /**
     * Explicitly sets the OnlineState to the specified state.
     *
     * Note that this resets our timers / failure counters, etc. used by our
     * Offline heuristics, so must not be used in place of
     * handleWatchStreamStart() and handleWatchStreamFailure().
     */    set(t) {
        this.qa(), this.xa = 0, "Online" /* Online */ === t && (
        // We've connected to watch at least once. Don't warn the developer
        // about being offline going forward.
        this.Fa = !1), this.Ma(t);
    }
    Ma(t) {
        t !== this.state && (this.state = t, this.Na(t));
    }
    $a(t) {
        const e = `Could not reach Cloud Firestore backend. ${t}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;
        this.Fa ? (g(e), this.Fa = !1) : V("OnlineStateTracker", e);
    }
    qa() {
        null !== this.ka && (this.ka.cancel(), this.ka = null);
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
class Hi {
    constructor(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    t, 
    /** The client-side proxy for interacting with the backend. */
    e, n, s, i) {
        this.Ba = t, this.Ua = e, this.fi = n, 
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
        this.Wa = [], 
        /**
         * A mapping of watched targets that the client cares about tracking and the
         * user has explicitly called a 'listen' for this target.
         *
         * These targets may or may not have been sent to or acknowledged by the
         * server. On re-establishing the listen stream, these targets should be sent
         * to the server. The targets removed with unlistens are removed eagerly
         * without waiting for confirmation from the listen stream.
         */
        this.Ka = new Map, this.ja = null, 
        /**
         * A set of reasons for why the RemoteStore may be offline. If empty, the
         * RemoteStore may start its network connections.
         */
        this.Qa = new Set, this.Ga = i, this.Ga.za(t => {
            n.Ri(async () => {
                // Porting Note: Unlike iOS, `restartNetwork()` is called even when the
                // network becomes unreachable as we don't have any other way to tear
                // down our streams.
                this.Ha() && (V("RemoteStore", "Restarting streams for network reachability change."), 
                await this.Ja());
            });
        }), this.Ya = new zi(n, s), 
        // Create streams (but note they're not started yet).
        this.Xa = function(t, e, n) {
            const s = S(t);
            return s.Sa(), new Ki(e, s.Zh, s.credentials, s.serializer, n);
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
 */ (this.Ua, n, {
            Ea: this.Za.bind(this),
            _a: this.tc.bind(this),
            Aa: this.ec.bind(this)
        }), this.nc = function(t, e, n) {
            const s = S(t);
            return s.Sa(), new ji(e, s.Zh, s.credentials, s.serializer, n);
        }(this.Ua, n, {
            Ea: this.sc.bind(this),
            _a: this.ic.bind(this),
            pa: this.rc.bind(this),
            ya: this.ya.bind(this)
        });
    }
    /**
     * Starts up the remote store, creating streams, restoring state from
     * LocalStore, etc.
     */    start() {
        return this.enableNetwork();
    }
    /** Re-enables the network. Idempotent. */    enableNetwork() {
        return this.Qa.delete(0 /* UserDisabled */), this.oc();
    }
    async oc() {
        this.Ha() && (this.hc() ? this.ac() : this.Ya.set("Unknown" /* Unknown */), 
        // This will start the write stream if necessary.
        await this.cc());
    }
    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */    async disableNetwork() {
        this.Qa.add(0 /* UserDisabled */), await this.uc(), 
        // Set the OnlineState to Offline so get()s return from cache, etc.
        this.Ya.set("Offline" /* Offline */);
    }
    async uc() {
        await this.nc.stop(), await this.Xa.stop(), this.Wa.length > 0 && (V("RemoteStore", `Stopping write stream with ${this.Wa.length} pending writes`), 
        this.Wa = []), this.lc();
    }
    async _h() {
        V("RemoteStore", "RemoteStore shutting down."), this.Qa.add(5 /* Shutdown */), await this.uc(), 
        this.Ga._h(), 
        // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
        // triggering spurious listener events with cached data, etc.
        this.Ya.set("Unknown" /* Unknown */);
    }
    /**
     * Starts new listen for the given target. Uses resume token if provided. It
     * is a no-op if the target of given `TargetData` is already being listened to.
     */    listen(t) {
        this.Ka.has(t.targetId) || (
        // Mark this as something the client is currently listening for.
        this.Ka.set(t.targetId, t), this.hc() ? 
        // The listen will be sent in onWatchStreamOpen
        this.ac() : this.Xa.ia() && this._c(t));
    }
    /**
     * Removes the listen from server. It is a no-op if the given target id is
     * not being listened to.
     */    fc(t) {
        this.Ka.delete(t), this.Xa.ia() && this.dc(t), 0 === this.Ka.size && (this.Xa.ia() ? this.Xa.ha() : this.Ha() && 
        // Revert to OnlineState.Unknown if the watch stream is not open and we
        // have no listeners, since without any listens to send we cannot
        // confirm if the stream is healthy and upgrade to OnlineState.Online.
        this.Ya.set("Unknown" /* Unknown */));
    }
    /** {@link TargetMetadataProvider.getTargetDataForTarget} */    Ge(t) {
        return this.Ka.get(t) || null;
    }
    /** {@link TargetMetadataProvider.getRemoteKeysForTarget} */    Qe(t) {
        return this.wc.Qe(t);
    }
    /**
     * We need to increment the the expected number of pending responses we're due
     * from watch so we wait for the ack to process any messages from this target.
     */    _c(t) {
        this.ja.ge(t.targetId), this.Xa.Ra(t);
    }
    /**
     * We need to increment the expected number of pending responses we're due
     * from watch so we wait for the removal on the server before we process any
     * messages from this target.
     */    dc(t) {
        this.ja.ge(t), this.Xa.ma(t);
    }
    ac() {
        this.ja = new kt(this), this.Xa.start(), this.Ya.Oa();
    }
    /**
     * Returns whether the watch stream should be started because it's necessary
     * and has not yet been started.
     */    hc() {
        return this.Ha() && !this.Xa.sa() && this.Ka.size > 0;
    }
    Ha() {
        return 0 === this.Qa.size;
    }
    lc() {
        this.ja = null;
    }
    async Za() {
        this.Ka.forEach((t, e) => {
            this._c(t);
        });
    }
    async tc(t) {
        this.lc(), 
        // If we still need the watch stream, retry the connection.
        this.hc() ? (this.Ya.La(t), this.ac()) : 
        // No need to restart watch stream because there are no active targets.
        // The online state is set to unknown because there is no active attempt
        // at establishing a connection
        this.Ya.set("Unknown" /* Unknown */);
    }
    async ec(t, e) {
        if (
        // Mark the client as online since we got a message from the server
        this.Ya.set("Online" /* Online */), t instanceof Nt && 2 /* Removed */ === t.state && t.cause) 
        // There was an error on a target, don't wait for a consistent snapshot
        // to raise events
        try {
            await this.Tc(t);
        } catch (e) {
            V("RemoteStore", "Failed to remove targets %s: %s ", t.targetIds.join(","), e), 
            await this.Ec(e);
        } else if (t instanceof Ct ? this.ja.Ne(t) : t instanceof Dt ? this.ja.qe(t) : this.ja.Fe(t), 
        !e.isEqual(q.min())) try {
            const t = await this.Ba.To();
            e.p(t) >= 0 && 
            // We have received a target change with a global snapshot if the snapshot
            // version is not equal to SnapshotVersion.min().
            await this.Ic(e);
        } catch (t) {
            V("RemoteStore", "Failed to raise snapshot:", t), await this.Ec(t);
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
     */    async Ec(t, e) {
        if (!Es(t)) throw t;
        this.Qa.add(1 /* IndexedDbFailed */), 
        // Disable network and raise offline snapshots
        await this.uc(), this.Ya.set("Offline" /* Offline */), e || (
        // Use a simple read operation to determine if IndexedDB recovered.
        // Ideally, we would expose a health check directly on SimpleDb, but
        // RemoteStore only has access to persistence through LocalStore.
        e = () => this.Ba.To()), 
        // Probe IndexedDB periodically and re-enable network
        this.fi.Fi(async () => {
            V("RemoteStore", "Retrying IndexedDB access"), await e(), this.Qa.delete(1 /* IndexedDbFailed */), 
            await this.oc();
        });
    }
    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */    Ac(t) {
        return t().catch(e => this.Ec(e, t));
    }
    /**
     * Takes a batch of changes from the Datastore, repackages them as a
     * RemoteEvent, and passes that on to the listener, which is typically the
     * SyncEngine.
     */    Ic(t) {
        const e = this.ja.We(t);
        // Update in-memory resume tokens. LocalStore will update the
        // persistent view of these when applying the completed RemoteEvent.
                // Finally raise remote event
        return e.Zt.forEach((e, n) => {
            if (e.resumeToken.rt() > 0) {
                const s = this.Ka.get(n);
                // A watched target might have been removed already.
                                s && this.Ka.set(n, s.ut(e.resumeToken, t));
            }
        }), 
        // Re-establish listens for the targets that have been invalidated by
        // existence filter mismatches.
        e.te.forEach(t => {
            const e = this.Ka.get(t);
            if (!e) 
            // A watched target might have been removed already.
            return;
            // Clear the resume token for the target, since we're in a known mismatch
            // state.
                        this.Ka.set(t, e.ut(st.ot, e.at)), 
            // Cause a hard reset by unwatching and rewatching immediately, but
            // deliberately don't send a resume token so that we get a full update.
            this.dc(t);
            // Mark the target we send as being on behalf of an existence filter
            // mismatch, but don't actually retain that in listenTargets. This ensures
            // that we flag the first re-listen this way without impacting future
            // listens of this target (that might happen e.g. on reconnect).
            const n = new it(e.target, t, 1 /* ExistenceFilterMismatch */ , e.sequenceNumber);
            this._c(n);
        }), this.wc.Uh(e);
    }
    /** Handles an error on a target */    async Tc(t) {
        const e = t.cause;
        for (const n of t.targetIds) 
        // A watched target might have been removed already.
        this.Ka.has(n) && (await this.wc.Rc(n, e), this.Ka.delete(n), this.ja.removeTarget(n));
    }
    /**
     * Attempts to fill our write pipeline with writes from the LocalStore.
     *
     * Called internally to bootstrap or refill the write pipeline and by
     * SyncEngine whenever there are new mutations to process.
     *
     * Starts the write stream if necessary.
     */    async cc() {
        let t = this.Wa.length > 0 ? this.Wa[this.Wa.length - 1].batchId : -1;
        for (;this.mc(); ) try {
            const e = await this.Ba.Qh(t);
            if (null === e) {
                0 === this.Wa.length && this.nc.ha();
                break;
            }
            t = e.batchId, this.Pc(e);
        } catch (t) {
            await this.Ec(t);
        }
        this.Vc() && this.gc();
    }
    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */    mc() {
        return this.Ha() && this.Wa.length < 10;
    }
    // For testing
    yc() {
        return this.Wa.length;
    }
    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */    Pc(t) {
        this.Wa.push(t), this.nc.ia() && this.nc.Va && this.nc.ga(t.mutations);
    }
    Vc() {
        return this.Ha() && !this.nc.sa() && this.Wa.length > 0;
    }
    gc() {
        this.nc.start();
    }
    async sc() {
        this.nc.ba();
    }
    async rc() {
        // Send the write pipeline now that the stream is established.
        for (const t of this.Wa) this.nc.ga(t.mutations);
    }
    async ya(t, e) {
        const n = this.Wa.shift(), s = ss.from(n, t, e);
        await this.Ac(() => this.wc.pc(s)), 
        // It's possible that with the completion of this mutation another
        // slot has freed up.
        await this.cc();
    }
    async ic(t) {
        // If the write stream closed after the write handshake completes, a write
        // operation failed and we fail the pending operation.
        t && this.nc.Va && 
        // This error affects the actual write.
        await this.bc(t), 
        // The write stream might have been started by refilling the write
        // pipeline for failed writes
        this.Vc() && this.gc();
    }
    async bc(t) {
        // Only handle permanent errors here. If it's transient, just let the retry
        // logic kick in.
        if (at(e = t.code) && e !== C.ABORTED) {
            // This was a permanent error, the request itself was the problem
            // so it's not going to succeed if we resend it.
            const e = this.Wa.shift();
            // In this case it's also unlikely that the server itself is melting
            // down -- this was just a bad request so inhibit backoff on the next
            // restart.
                        this.nc.oa(), await this.Ac(() => this.wc.vc(e.batchId, t)), 
            // It's possible that with the completion of this mutation
            // another slot has freed up.
            await this.cc();
        }
        var e;
        /**
 * Maps an error Code from a GRPC status identifier like 'NOT_FOUND'.
 *
 * @returns The Code equivalent to the given status string or undefined if
 *     there is no match.
 */    }
    async Ja() {
        this.Qa.add(4 /* ConnectivityChange */), await this.uc(), this.Ya.set("Unknown" /* Unknown */), 
        this.nc.oa(), this.Xa.oa(), this.Qa.delete(4 /* ConnectivityChange */), await this.oc();
    }
    async Sc(t) {
        this.fi.$i(), 
        // Tear down and re-create our network streams. This will ensure we get a
        // fresh auth token for the new user and re-fill the write pipeline with
        // new mutations from the LocalStore (since mutations are per-user).
        V("RemoteStore", "RemoteStore received new credentials"), this.Qa.add(3 /* CredentialChange */), 
        await this.uc(), this.Ya.set("Unknown" /* Unknown */), await this.wc.Sc(t), this.Qa.delete(3 /* CredentialChange */), 
        await this.oc();
    }
    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */    async Cc(t) {
        t ? (this.Qa.delete(2 /* IsSecondary */), await this.oc()) : t || (this.Qa.add(2 /* IsSecondary */), 
        await this.uc(), this.Ya.set("Unknown" /* Unknown */));
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
 */ class Ji {
    constructor() {
        // A set of outstanding references to a document sorted by key.
        this.Dc = new ft(Yi.Nc), 
        // A set of outstanding references to a document sorted by target id.
        this.xc = new ft(Yi.kc);
    }
    /** Returns true if the reference set contains no references. */    $() {
        return this.Dc.$();
    }
    /** Adds a reference to the given document key for the given ID. */    So(t, e) {
        const n = new Yi(t, e);
        this.Dc = this.Dc.add(n), this.xc = this.xc.add(n);
    }
    /** Add references to the given document keys for the given ID. */    Fc(t, e) {
        t.forEach(t => this.So(t, e));
    }
    /**
     * Removes a reference to the given document key for the given
     * ID.
     */    Do(t, e) {
        this.Oc(new Yi(t, e));
    }
    Mc(t, e) {
        t.forEach(t => this.Do(t, e));
    }
    /**
     * Clears all references with a given ID. Calls removeRef() for each key
     * removed.
     */    $c(t) {
        const e = new j(new U([])), n = new Yi(e, t), s = new Yi(e, t + 1), i = [];
        return this.xc.$t([ n, s ], t => {
            this.Oc(t), i.push(t.key);
        }), i;
    }
    Lc() {
        this.Dc.forEach(t => this.Oc(t));
    }
    Oc(t) {
        this.Dc = this.Dc.delete(t), this.xc = this.xc.delete(t);
    }
    qc(t) {
        const e = new j(new U([])), n = new Yi(e, t), s = new Yi(e, t + 1);
        let i = Pt();
        return this.xc.$t([ n, s ], t => {
            i = i.add(t.key);
        }), i;
    }
    Wr(t) {
        const e = new Yi(t, 0), n = this.Dc.qt(e);
        return null !== n && t.isEqual(n.key);
    }
}

class Yi {
    constructor(t, e) {
        this.key = t, this.Bc = e;
    }
    /** Compare by key then by ID */    static Nc(t, e) {
        return j.D(t.key, e.key) || O(t.Bc, e.Bc);
    }
    /** Compare by ID then by key */    static kc(t, e) {
        return O(t.Bc, e.Bc) || j.D(t.key, e.key);
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
function Xi(t, e) {
    return `firestore_clients_${t}_${e}`;
}

// The format of the WebStorage key that stores the mutation state is:
//     firestore_mutations_<persistence_prefix>_<batch_id>
//     (for unauthenticated users)
// or: firestore_mutations_<persistence_prefix>_<batch_id>_<user_uid>

// 'user_uid' is last to avoid needing to escape '_' characters that it might
// contain.
/** Assembles the key for a mutation batch in WebStorage */
function Zi(t, e, n) {
    let s = `firestore_mutations_${t}_${n}`;
    return e.t() && (s += "_" + e.uid), s;
}

// The format of the WebStorage key that stores a query target's metadata is:
//     firestore_targets_<persistence_prefix>_<target_id>
/** Assembles the key for a query state in WebStorage */
function tr(t, e) {
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
class er {
    constructor(t, e, n, s) {
        this.user = t, this.batchId = e, this.state = n, this.error = s;
    }
    /**
     * Parses a MutationMetadata from its JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static Uc(t, e, n) {
        const s = JSON.parse(n);
        let i = "object" == typeof s && -1 !== [ "pending", "acknowledged", "rejected" ].indexOf(s.state) && (void 0 === s.error || "object" == typeof s.error), r = void 0;
        return i && s.error && (i = "string" == typeof s.error.message && "string" == typeof s.error.code, 
        i && (r = new D(s.error.code, s.error.message))), i ? new er(t, e, s.state, r) : (g("SharedClientState", `Failed to parse mutation state for ID '${e}': ${n}`), 
        null);
    }
    Wc() {
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
class nr {
    constructor(t, e, n) {
        this.targetId = t, this.state = e, this.error = n;
    }
    /**
     * Parses a QueryTargetMetadata from its JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static Uc(t, e) {
        const n = JSON.parse(e);
        let s = "object" == typeof n && -1 !== [ "not-current", "current", "rejected" ].indexOf(n.state) && (void 0 === n.error || "object" == typeof n.error), i = void 0;
        return s && n.error && (s = "string" == typeof n.error.message && "string" == typeof n.error.code, 
        s && (i = new D(n.error.code, n.error.message))), s ? new nr(t, n.state, i) : (g("SharedClientState", `Failed to parse target state for ID '${t}': ${e}`), 
        null);
    }
    Wc() {
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
 */ class sr {
    constructor(t, e) {
        this.clientId = t, this.activeTargetIds = e;
    }
    /**
     * Parses a RemoteClientState from the JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static Uc(t, e) {
        const n = JSON.parse(e);
        let s = "object" == typeof n && n.activeTargetIds instanceof Array, i = gt();
        for (let t = 0; s && t < n.activeTargetIds.length; ++t) s = J(n.activeTargetIds[t]), 
        i = i.add(n.activeTargetIds[t]);
        return s ? new sr(t, i) : (g("SharedClientState", `Failed to parse client data for instance '${t}': ${e}`), 
        null);
    }
}

/**
 * This class represents the online state for all clients participating in
 * multi-tab. The online state is only written to by the primary client, and
 * used in secondary clients to update their query views.
 */ class ir {
    constructor(t, e) {
        this.clientId = t, this.onlineState = e;
    }
    /**
     * Parses a SharedOnlineState from its JSON representation in WebStorage.
     * Logs a warning and returns null if the format of the data is not valid.
     */    static Uc(t) {
        const e = JSON.parse(t);
        return "object" == typeof e && -1 !== [ "Unknown", "Online", "Offline" ].indexOf(e.onlineState) && "string" == typeof e.clientId ? new ir(e.clientId, e.onlineState) : (g("SharedClientState", "Failed to parse online state: " + t), 
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
class rr {
    constructor() {
        this.activeTargetIds = gt();
    }
    Kc(t) {
        this.activeTargetIds = this.activeTargetIds.add(t);
    }
    jc(t) {
        this.activeTargetIds = this.activeTargetIds.delete(t);
    }
    /**
     * Converts this entry into a JSON-encoded format we can use for WebStorage.
     * Does not encode `clientId` as it is part of the key in WebStorage.
     */    Wc() {
        const t = {
            activeTargetIds: this.activeTargetIds.B(),
            updateTimeMs: Date.now()
        };
        return JSON.stringify(t);
    }
}

/**
 * `WebStorageSharedClientState` uses WebStorage (window.localStorage) as the
 * backing store for the SharedClientState. It keeps track of all active
 * clients and supports modifications of the local client's data.
 */ class or {
    constructor(t, e, n, s, i) {
        this.window = t, this.Cs = e, this.persistenceKey = n, this.Qc = s, this.wc = null, 
        this.Na = null, this.ys = null, this.Gc = this.zc.bind(this), this.Hc = new ut(O), 
        this._r = !1, 
        /**
         * Captures WebStorage events that occur before `start()` is called. These
         * events are replayed once `WebStorageSharedClientState` is started.
         */
        this.Jc = [];
        // Escape the special characters mentioned here:
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
        const r = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        this.storage = this.window.localStorage, this.currentUser = i, this.Yc = Xi(this.persistenceKey, this.Qc), 
        this.Xc = 
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
 */ (this.persistenceKey), this.Hc = this.Hc._t(this.Qc, new rr), this.Zc = new RegExp(`^firestore_clients_${r}_([^_]*)$`), 
        this.tu = new RegExp(`^firestore_mutations_${r}_(\\d+)(?:_(.*))?$`), this.eu = new RegExp(`^firestore_targets_${r}_(\\d+)$`), 
        this.nu = 
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
        this.window.addEventListener("storage", this.Gc);
    }
    /** Returns 'true' if WebStorage is available in the current environment. */    static Qs(t) {
        return !(!t || !t.localStorage);
    }
    async start() {
        // Retrieve the list of existing clients to backfill the data in
        // SharedClientState.
        const t = await this.wc.Eh();
        for (const e of t) {
            if (e === this.Qc) continue;
            const t = this.getItem(Xi(this.persistenceKey, e));
            if (t) {
                const n = sr.Uc(e, t);
                n && (this.Hc = this.Hc._t(n.clientId, n));
            }
        }
        this.su();
        // Check if there is an existing online state and call the callback handler
        // if applicable.
        const e = this.storage.getItem(this.nu);
        if (e) {
            const t = this.iu(e);
            t && this.ru(t);
        }
        for (const t of this.Jc) this.zc(t);
        this.Jc = [], 
        // Register a window unload hook to remove the client metadata entry from
        // WebStorage even if `shutdown()` was not called.
        this.window.addEventListener("unload", () => this._h()), this._r = !0;
    }
    vs(t) {
        this.setItem(this.Xc, JSON.stringify(t));
    }
    ou() {
        return this.hu(this.Hc);
    }
    au(t) {
        let e = !1;
        return this.Hc.forEach((n, s) => {
            s.activeTargetIds.has(t) && (e = !0);
        }), e;
    }
    cu(t) {
        this.uu(t, "pending");
    }
    lu(t, e, n) {
        this.uu(t, e, n), 
        // Once a final mutation result is observed by other clients, they no longer
        // access the mutation's metadata entry. Since WebStorage replays events
        // in order, it is safe to delete the entry right after updating it.
        this._u(t);
    }
    fu(t) {
        let e = "not-current";
        // Lookup an existing query state if the target ID was already registered
        // by another tab
                if (this.au(t)) {
            const n = this.storage.getItem(tr(this.persistenceKey, t));
            if (n) {
                const s = nr.Uc(t, n);
                s && (e = s.state);
            }
        }
        return this.du.Kc(t), this.su(), e;
    }
    wu(t) {
        this.du.jc(t), this.su();
    }
    Tu(t) {
        return this.du.activeTargetIds.has(t);
    }
    Eu(t) {
        this.removeItem(tr(this.persistenceKey, t));
    }
    Iu(t, e, n) {
        this.Au(t, e, n);
    }
    kh(t, e, n) {
        e.forEach(t => {
            this._u(t);
        }), this.currentUser = t, n.forEach(t => {
            this.cu(t);
        });
    }
    Ru(t) {
        this.mu(t);
    }
    _h() {
        this._r && (this.window.removeEventListener("storage", this.Gc), this.removeItem(this.Yc), 
        this._r = !1);
    }
    getItem(t) {
        const e = this.storage.getItem(t);
        return V("SharedClientState", "READ", t, e), e;
    }
    setItem(t, e) {
        V("SharedClientState", "SET", t, e), this.storage.setItem(t, e);
    }
    removeItem(t) {
        V("SharedClientState", "REMOVE", t), this.storage.removeItem(t);
    }
    zc(t) {
        // Note: The function is typed to take Event to be interface-compatible with
        // `Window.addEventListener`.
        const e = t;
        if (e.storageArea === this.storage) {
            if (V("SharedClientState", "EVENT", e.key, e.newValue), e.key === this.Yc) return void g("Received WebStorage notification for local change. Another client might have garbage-collected our state");
            this.Cs.Fi(async () => {
                if (this._r) {
                    if (null !== e.key) if (this.Zc.test(e.key)) {
                        if (null == e.newValue) {
                            const t = this.Pu(e.key);
                            return this.Vu(t, null);
                        }
                        {
                            const t = this.gu(e.key, e.newValue);
                            if (t) return this.Vu(t.clientId, t);
                        }
                    } else if (this.tu.test(e.key)) {
                        if (null !== e.newValue) {
                            const t = this.yu(e.key, e.newValue);
                            if (t) return this.pu(t);
                        }
                    } else if (this.eu.test(e.key)) {
                        if (null !== e.newValue) {
                            const t = this.bu(e.key, e.newValue);
                            if (t) return this.vu(t);
                        }
                    } else if (e.key === this.nu) {
                        if (null !== e.newValue) {
                            const t = this.iu(e.newValue);
                            if (t) return this.ru(t);
                        }
                    } else if (e.key === this.Xc) {
                        const t = function(t) {
                            let e = ls.Ss;
                            if (null != t) try {
                                const n = JSON.parse(t);
                                v("number" == typeof n), e = n;
                            } catch (t) {
                                g("SharedClientState", "Failed to read sequence number from WebStorage", t);
                            }
                            return e;
                        }
                        /**
 * `MemorySharedClientState` is a simple implementation of SharedClientState for
 * clients using memory persistence. The state in this class remains fully
 * isolated and no synchronization is performed.
 */ (e.newValue);
                        t !== ls.Ss && this.ys(t);
                    }
                } else this.Jc.push(e);
            });
        }
    }
    get du() {
        return this.Hc.get(this.Qc);
    }
    su() {
        this.setItem(this.Yc, this.du.Wc());
    }
    uu(t, e, n) {
        const s = new er(this.currentUser, t, e, n), i = Zi(this.persistenceKey, this.currentUser, t);
        this.setItem(i, s.Wc());
    }
    _u(t) {
        const e = Zi(this.persistenceKey, this.currentUser, t);
        this.removeItem(e);
    }
    mu(t) {
        const e = {
            clientId: this.Qc,
            onlineState: t
        };
        this.storage.setItem(this.nu, JSON.stringify(e));
    }
    Au(t, e, n) {
        const s = tr(this.persistenceKey, t), i = new nr(t, e, n);
        this.setItem(s, i.Wc());
    }
    /**
     * Parses a client state key in WebStorage. Returns null if the key does not
     * match the expected key format.
     */    Pu(t) {
        const e = this.Zc.exec(t);
        return e ? e[1] : null;
    }
    /**
     * Parses a client state in WebStorage. Returns 'null' if the value could not
     * be parsed.
     */    gu(t, e) {
        const n = this.Pu(t);
        return sr.Uc(n, e);
    }
    /**
     * Parses a mutation batch state in WebStorage. Returns 'null' if the value
     * could not be parsed.
     */    yu(t, e) {
        const n = this.tu.exec(t), s = Number(n[1]), i = void 0 !== n[2] ? n[2] : null;
        return er.Uc(new A(i), s, e);
    }
    /**
     * Parses a query target state from WebStorage. Returns 'null' if the value
     * could not be parsed.
     */    bu(t, e) {
        const n = this.eu.exec(t), s = Number(n[1]);
        return nr.Uc(s, e);
    }
    /**
     * Parses an online state from WebStorage. Returns 'null' if the value
     * could not be parsed.
     */    iu(t) {
        return ir.Uc(t);
    }
    async pu(t) {
        if (t.user.uid === this.currentUser.uid) return this.wc.Su(t.batchId, t.state, t.error);
        V("SharedClientState", "Ignoring mutation for non-active user " + t.user.uid);
    }
    vu(t) {
        return this.wc.Cu(t.targetId, t.state, t.error);
    }
    Vu(t, e) {
        const n = e ? this.Hc._t(t, e) : this.Hc.remove(t), s = this.hu(this.Hc), i = this.hu(n), r = [], o = [];
        return i.forEach(t => {
            s.has(t) || r.push(t);
        }), s.forEach(t => {
            i.has(t) || o.push(t);
        }), this.wc.Du(r, o).then(() => {
            this.Hc = n;
        });
    }
    ru(t) {
        // We check whether the client that wrote this online state is still active
        // by comparing its client ID to the list of clients kept active in
        // IndexedDb. If a client does not update their IndexedDb client state
        // within 5 seconds, it is considered inactive and we don't emit an online
        // state event.
        this.Hc.get(t.clientId) && this.Na(t.onlineState);
    }
    hu(t) {
        let e = gt();
        return t.forEach((t, n) => {
            e = e.Bt(n.activeTargetIds);
        }), e;
    }
}

class hr {
    constructor() {
        this.Nu = new rr, this.xu = {}, this.Na = null, this.ys = null;
    }
    cu(t) {
        // No op.
    }
    lu(t, e, n) {
        // No op.
    }
    fu(t) {
        return this.Nu.Kc(t), this.xu[t] || "not-current";
    }
    Iu(t, e, n) {
        this.xu[t] = e;
    }
    wu(t) {
        this.Nu.jc(t);
    }
    Tu(t) {
        return this.Nu.activeTargetIds.has(t);
    }
    Eu(t) {
        delete this.xu[t];
    }
    ou() {
        return this.Nu.activeTargetIds;
    }
    au(t) {
        return this.Nu.activeTargetIds.has(t);
    }
    start() {
        return this.Nu = new rr, Promise.resolve();
    }
    kh(t, e, n) {
        // No op.
    }
    Ru(t) {
        // No op.
    }
    _h() {}
    vs(t) {}
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
 */ class ar {
    constructor(t) {
        this.key = t;
    }
}

class cr {
    constructor(t) {
        this.key = t;
    }
}

/**
 * View is responsible for computing the final merged truth of what docs are in
 * a query. It gets notified of local and remote changes to docs, and applies
 * the query filters and limits to determine the most correct possible results.
 */ class ur {
    constructor(t, 
    /** Documents included in the remote target */
    e) {
        this.query = t, this.ku = e, this.Fu = null, 
        /**
         * A flag whether the view is current with the backend. A view is considered
         * current after it has seen the current flag from the backend and did not
         * lose consistency within the watch stream (e.g. because of an existence
         * filter mismatch).
         */
        this.re = !1, 
        /** Documents in the view but not in the remote target */
        this.Ou = Pt(), 
        /** Document Keys that have local changes */
        this.Ht = Pt(), this.Mu = $n(t), this.$u = new yt(this.Mu);
    }
    /**
     * The set of remote documents that the server has told us belongs to the target associated with
     * this view.
     */    get Lu() {
        return this.ku;
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
     */    qu(t, e) {
        const n = e ? e.Bu : new pt, s = e ? e.$u : this.$u;
        let i = e ? e.Ht : this.Ht, r = s, o = !1;
        // Track the last doc in a (full) limit. This is necessary, because some
        // update (a delete, or an update moving a doc past the old limit) might
        // mean there is some other document in the local cache that either should
        // come (1) between the old last limit doc and the new last document, in the
        // case of updates, or (2) after the new last document, in the case of
        // deletes. So we keep this doc at the old limit to compare the updates to.
        // Note that this should never get used in a refill (when previousChanges is
        // set), because there will only be adds -- no deletes or updates.
        const h = this.query.En() && s.size === this.query.limit ? s.last() : null, a = this.query.In() && s.size === this.query.limit ? s.first() : null;
        // Drop documents out to meet limit/limitToLast requirement.
        if (t.Tt((t, e) => {
            const c = s.get(t);
            let u = e instanceof gn ? e : null;
            u && (u = Mn(this.query, u) ? u : null);
            const l = !!c && this.Ht.has(c.key), _ = !!u && (u.nn || 
            // We only consider committed mutations for documents that were
            // mutated during the lifetime of the view.
            this.Ht.has(u.key) && u.hasCommittedMutations);
            let f = !1;
            // Calculate change
                        if (c && u) {
                c.data().isEqual(u.data()) ? l !== _ && (n.track({
                    type: 3 /* Metadata */ ,
                    doc: u
                }), f = !0) : this.Uu(c, u) || (n.track({
                    type: 2 /* Modified */ ,
                    doc: u
                }), f = !0, (h && this.Mu(u, h) > 0 || a && this.Mu(u, a) < 0) && (
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
        }), this.query.En() || this.query.In()) for (;r.size > this.query.limit; ) {
            const t = this.query.En() ? r.last() : r.first();
            r = r.delete(t.key), i = i.delete(t.key), n.track({
                type: 1 /* Removed */ ,
                doc: t
            });
        }
        return {
            $u: r,
            Bu: n,
            Wu: o,
            Ht: i
        };
    }
    Uu(t, e) {
        // We suppress the initial change event for documents that were modified as
        // part of a write acknowledgment (e.g. when the value of a server transform
        // is applied) as Watch will send us the same document again.
        // By suppressing the event, we only raise two user visible events (one with
        // `hasPendingWrites` and the final state of the document) instead of three
        // (one with `hasPendingWrites`, the modified document with
        // `hasPendingWrites` and the final state of the document).
        return t.nn && e.hasCommittedMutations && !e.nn;
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
    ts(t, e, n) {
        const s = this.$u;
        this.$u = t.$u, this.Ht = t.Ht;
        // Sort changes based on type and query comparator
        const i = t.Bu.Gt();
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
                    return b();
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
 */ (t.type, e.type) || this.Mu(t.doc, e.doc)), this.Ku(n);
        const r = e ? this.ju() : [], o = 0 === this.Ou.size && this.re ? 1 /* Synced */ : 0 /* Local */ , h = o !== this.Fu;
        if (this.Fu = o, 0 !== i.length || h) {
            return {
                snapshot: new bt(this.query, t.$u, s, i, t.Ht, 0 /* Local */ === o, h, 
                /* excludesMetadataChanges= */ !1),
                Qu: r
            };
        }
        // no changes
        return {
            Qu: r
        };
    }
    /**
     * Applies an OnlineState change to the view, potentially generating a
     * ViewChange if the view's syncState changes as a result.
     */    Gu(t) {
        return this.re && "Offline" /* Offline */ === t ? (
        // If we're offline, set `current` to false and then call applyChanges()
        // to refresh our syncState and generate a ViewChange as appropriate. We
        // are guaranteed to get a new TargetChange that sets `current` back to
        // true once the client is back online.
        this.re = !1, this.ts({
            $u: this.$u,
            Bu: new pt,
            Ht: this.Ht,
            Wu: !1
        }, 
        /* updateLimboDocuments= */ !1)) : {
            Qu: []
        };
    }
    /**
     * Returns whether the doc for the given key should be in limbo.
     */    zu(t) {
        // If the remote end says it's part of this query, it's not in limbo.
        return !this.ku.has(t) && (
        // The local store doesn't think it's a result, so it shouldn't be in limbo.
        !!this.$u.has(t) && !this.$u.get(t).nn);
    }
    /**
     * Updates syncedDocuments, current, and limbo docs based on the given change.
     * Returns the list of changes to which docs are in limbo.
     */    Ku(t) {
        t && (t.oe.forEach(t => this.ku = this.ku.add(t)), t.he.forEach(t => {}), t.ae.forEach(t => this.ku = this.ku.delete(t)), 
        this.re = t.re);
    }
    ju() {
        // We can only determine limbo documents when we're in-sync with the server.
        if (!this.re) return [];
        // TODO(klimt): Do this incrementally so that it's not quadratic when
        // updating many documents.
                const t = this.Ou;
        this.Ou = Pt(), this.$u.forEach(t => {
            this.zu(t.key) && (this.Ou = this.Ou.add(t.key));
        });
        // Diff the new limbo docs with the old limbo docs.
        const e = [];
        return t.forEach(t => {
            this.Ou.has(t) || e.push(new cr(t));
        }), this.Ou.forEach(n => {
            t.has(n) || e.push(new ar(n));
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
    Hu(t) {
        this.ku = t.Yh, this.Ou = Pt();
        const e = this.qu(t.documents);
        return this.ts(e, /*updateLimboDocuments=*/ !0);
    }
    /**
     * Returns a view snapshot as if this query was just listened to. Contains
     * a document add for every existing document and the `fromCache` and
     * `hasPendingWrites` status of the already established view.
     */
    // PORTING NOTE: Multi-tab only.
    Ju() {
        return bt.Xt(this.query, this.$u, this.Ht, 0 /* Local */ === this.Fu);
    }
}

/**
 * QueryView contains all of the data that SyncEngine needs to keep track of for
 * a particular query.
 */
class lr {
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

/** Tracks a limbo resolution. */ class _r {
    constructor(t) {
        this.key = t, 
        /**
         * Set to true once we've received a document. This is used in
         * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
         * decide whether it needs to manufacture a delete event for the target once
         * the target is CURRENT.
         */
        this.Yu = !1;
    }
}

/**
 * An implementation of `SyncEngine` coordinating with other parts of SDK.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */ class fr {
    constructor(t, e, n, 
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    s, i, r) {
        this.Ba = t, this.Xu = e, this.Ua = n, this.Zu = s, this.currentUser = i, this.tl = r, 
        this.el = null, this.nl = new is(t => Fn(t), kn), this.sl = new Map, 
        /**
         * The keys of documents that are in limbo for which we haven't yet started a
         * limbo resolution query.
         */
        this.il = [], 
        /**
         * Keeps track of the target ID for each document that is in limbo with an
         * active target.
         */
        this.rl = new ut(j.D), 
        /**
         * Keeps track of the information about an active limbo resolution for each
         * active target ID that was started for the purpose of limbo resolution.
         */
        this.ol = new Map, this.hl = new Ji, 
        /** Stores user completion handlers, indexed by User and BatchId. */
        this.al = {}, 
        /** Stores user callbacks waiting for all pending writes to be acknowledged. */
        this.cl = new Map, this.ul = pi._o(), this.onlineState = "Unknown" /* Unknown */ , 
        // The primary state is set to `true` or `false` immediately after Firestore
        // startup. In the interim, a client should only be considered primary if
        // `isPrimary` is true.
        this.ll = void 0;
    }
    get _l() {
        return !0 === this.ll;
    }
    subscribe(t) {
        this.el = t;
    }
    async listen(t) {
        let e, n;
        this.fl("listen()");
        const s = this.nl.get(t);
        if (s) 
        // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
        // already exists when EventManager calls us for the first time. This
        // happens when the primary tab is already listening to this query on
        // behalf of another tab and the user of the primary also starts listening
        // to the query. EventManager will not have an assigned target ID in this
        // case and calls `listen` to obtain this ID.
        e = s.targetId, this.Zu.fu(e), n = s.view.Ju(); else {
            const s = await this.Ba.zh(xn(t)), i = this.Zu.fu(s.targetId);
            e = s.targetId, n = await this.dl(t, e, "current" === i), this._l && this.Xu.listen(s);
        }
        return n;
    }
    /**
     * Registers a view for a previously unknown query and computes its initial
     * snapshot.
     */    async dl(t, e, n) {
        const s = await this.Ba.Jh(t, 
        /* usePreviousResults= */ !0), i = new ur(t, s.Yh), r = i.qu(s.documents), o = St.ie(e, n && "Offline" /* Offline */ !== this.onlineState), h = i.ts(r, 
        /* updateLimboDocuments= */ this._l, o);
        this.wl(e, h.Qu);
        const a = new lr(t, e, i);
        return this.nl.set(t, a), this.sl.has(e) ? this.sl.get(e).push(t) : this.sl.set(e, [ t ]), 
        h.snapshot;
    }
    async fc(t) {
        this.fl("unlisten()");
        const e = this.nl.get(t), n = this.sl.get(e.targetId);
        // Only clean up the query view and target if this is the only query mapped
        // to the target.
                if (n.length > 1) return this.sl.set(e.targetId, n.filter(e => !kn(e, t))), 
        void this.nl.delete(t);
        // No other queries are mapped to the target, clean up the query and the target.
                if (this._l) {
            // We need to remove the local query target first to allow us to verify
            // whether any other client is still interested in this target.
            this.Zu.wu(e.targetId);
            this.Zu.au(e.targetId) || await this.Ba.Hh(e.targetId, /*keepPersistedTargetData=*/ !1).then(() => {
                this.Zu.Eu(e.targetId), this.Xu.fc(e.targetId), this.Tl(e.targetId);
            }).catch(Ui);
        } else this.Tl(e.targetId), await this.Ba.Hh(e.targetId, 
        /*keepPersistedTargetData=*/ !0);
    }
    async write(t, e) {
        this.fl("write()");
        try {
            const n = await this.Ba.$h(t);
            this.Zu.cu(n.batchId), this.El(n.batchId, e), await this.Il(n.jn), await this.Xu.cc();
        } catch (t) {
            // If we can't persist the mutation, we reject the user callback and
            // don't send the mutation. The user can then retry the write.
            const n = bs(t, "Failed to persist write");
            e.reject(n);
        }
    }
    async Uh(t) {
        this.fl("applyRemoteEvent()");
        try {
            const e = await this.Ba.Uh(t);
            // Update `receivedDocument` as appropriate for any limbo targets.
                        t.Zt.forEach((t, e) => {
                const n = this.ol.get(e);
                n && (
                // Since this is a limbo resolution lookup, it's for a single document
                // and it could be added, modified, or removed, but not a combination.
                v(t.oe.size + t.he.size + t.ae.size <= 1), t.oe.size > 0 ? n.Yu = !0 : t.he.size > 0 ? v(n.Yu) : t.ae.size > 0 && (v(n.Yu), 
                n.Yu = !1));
            }), await this.Il(e, t);
        } catch (t) {
            await Ui(t);
        }
    }
    Gu(t, e) {
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
        if (this._l && 0 /* RemoteStore */ === e || !this._l && 1 /* SharedClientState */ === e) {
            this.fl("applyOnlineStateChange()");
            const e = [];
            this.nl.forEach((n, s) => {
                const i = s.view.Gu(t);
                i.snapshot && e.push(i.snapshot);
            }), this.el.Al(t), this.el.Aa(e), this.onlineState = t, this._l && this.Zu.Ru(t);
        }
    }
    async Rc(t, e) {
        this.fl("rejectListens()"), 
        // PORTING NOTE: Multi-tab only.
        this.Zu.Iu(t, "rejected", e);
        const n = this.ol.get(t), s = n && n.key;
        if (s) {
            // TODO(klimt): We really only should do the following on permission
            // denied errors, but we don't have the cause code here.
            // It's a limbo doc. Create a synthetic event saying it was deleted.
            // This is kind of a hack. Ideally, we would have a method in the local
            // store to purge a document. However, it would be tricky to keep all of
            // the local store's invariants with another method.
            let e = new ut(j.D);
            e = e._t(s, new yn(s, q.min()));
            const n = Pt().add(s), i = new vt(q.min(), 
            /* targetChanges= */ new Map, 
            /* targetMismatches= */ new ft(O), e, n);
            await this.Uh(i), 
            // Since this query failed, we won't want to manually unlisten to it.
            // We only remove it from bookkeeping after we successfully applied the
            // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
            // this query when the RemoteStore restarts the Watch stream, which should
            // re-trigger the target failure.
            this.rl = this.rl.remove(s), this.ol.delete(t), this.Rl();
        } else await this.Ba.Hh(t, /* keepPersistedTargetData */ !1).then(() => this.Tl(t, e)).catch(Ui);
    }
    async pc(t) {
        this.fl("applySuccessfulWrite()");
        const e = t.batch.batchId;
        try {
            const n = await this.Ba.Lh(t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught
            // up), so we raise user callbacks first so that they consistently happen
            // before listen events.
                        this.ml(e, /*error=*/ null), this.Pl(e), this.Zu.lu(e, "acknowledged"), 
            await this.Il(n);
        } catch (t) {
            await Ui(t);
        }
    }
    async vc(t, e) {
        this.fl("rejectFailedWrite()");
        try {
            const n = await this.Ba.Bh(t);
            // The local store may or may not be able to apply the write result and
            // raise events immediately (depending on whether the watcher is caught up),
            // so we raise user callbacks first so that they consistently happen before
            // listen events.
                        this.ml(t, e), this.Pl(t), this.Zu.lu(t, "rejected", e), await this.Il(n);
        } catch (e) {
            await Ui(e);
        }
    }
    async Vl(t) {
        this.Xu.Ha() || V("SyncEngine", "The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled.");
        try {
            const e = await this.Ba.Fr();
            if (-1 === e) 
            // Trigger the callback right away if there is no pending writes at the moment.
            return void t.resolve();
            const n = this.cl.get(e) || [];
            n.push(t), this.cl.set(e, n);
        } catch (e) {
            const n = bs(e, "Initialization of waitForPendingWrites() operation failed");
            t.reject(n);
        }
    }
    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */    Pl(t) {
        (this.cl.get(t) || []).forEach(t => {
            t.resolve();
        }), this.cl.delete(t);
    }
    /** Reject all outstanding callbacks waiting for pending writes to complete. */    gl(t) {
        this.cl.forEach(e => {
            e.forEach(e => {
                e.reject(new D(C.CANCELLED, t));
            });
        }), this.cl.clear();
    }
    El(t, e) {
        let n = this.al[this.currentUser.s()];
        n || (n = new ut(O)), n = n._t(t, e), this.al[this.currentUser.s()] = n;
    }
    /**
     * Resolves or rejects the user callback for the given batch and then discards
     * it.
     */    ml(t, e) {
        let n = this.al[this.currentUser.s()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
                if (n) {
            const s = n.get(t);
            s && (e ? s.reject(e) : s.resolve(), n = n.remove(t)), this.al[this.currentUser.s()] = n;
        }
    }
    Tl(t, e = null) {
        this.Zu.wu(t);
        for (const n of this.sl.get(t)) this.nl.delete(n), e && this.el.yl(n, e);
        if (this.sl.delete(t), this._l) {
            this.hl.$c(t).forEach(t => {
                this.hl.Wr(t) || 
                // We removed the last reference for this key
                this.pl(t);
            });
        }
    }
    pl(t) {
        // It's possible that the target already got removed because the query failed. In that case,
        // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
        const e = this.rl.get(t);
        null !== e && (this.Xu.fc(e), this.rl = this.rl.remove(t), this.ol.delete(e), this.Rl());
    }
    wl(t, e) {
        for (const n of e) if (n instanceof ar) this.hl.So(n.key, t), this.bl(n); else if (n instanceof cr) {
            V("SyncEngine", "Document no longer in limbo: " + n.key), this.hl.Do(n.key, t);
            this.hl.Wr(n.key) || 
            // We removed the last reference for this key
            this.pl(n.key);
        } else b();
    }
    bl(t) {
        const e = t.key;
        this.rl.get(e) || (V("SyncEngine", "New document in limbo: " + e), this.il.push(e), 
        this.Rl());
    }
    /**
     * Starts listens for documents in limbo that are enqueued for resolution,
     * subject to a maximum number of concurrent resolutions.
     *
     * Without bounding the number of concurrent resolutions, the server can fail
     * with "resource exhausted" errors which can lead to pathological client
     * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
     */    Rl() {
        for (;this.il.length > 0 && this.rl.size < this.tl; ) {
            const t = this.il.shift(), e = this.ul.next();
            this.ol.set(e, new _r(t)), this.rl = this.rl._t(t, e), this.Xu.listen(new it(xn(Cn(t.path)), e, 2 /* LimboResolution */ , ls.Ss));
        }
    }
    // Visible for testing
    vl() {
        return this.rl;
    }
    // Visible for testing
    Sl() {
        return this.il;
    }
    async Il(t, e) {
        const n = [], s = [], i = [];
        this.nl.forEach((r, o) => {
            i.push(Promise.resolve().then(() => {
                const e = o.view.qu(t);
                return e.Wu ? this.Ba.Jh(o.query, /* usePreviousResults= */ !1).then(({documents: t}) => o.view.qu(t, e)) : e;
                // The query has a limit and some docs were removed, so we need
                // to re-run the query against the local store to make sure we
                // didn't lose any good docs that had been past the limit.
                        }).then(t => {
                const i = e && e.Zt.get(o.targetId), r = o.view.ts(t, 
                /* updateLimboDocuments= */ this._l, i);
                if (this.wl(o.targetId, r.Qu), r.snapshot) {
                    this._l && this.Zu.Iu(o.targetId, r.snapshot.fromCache ? "not-current" : "current"), 
                    n.push(r.snapshot);
                    const t = us.gs(o.targetId, r.snapshot);
                    s.push(t);
                }
            }));
        }), await Promise.all(i), this.el.Aa(n), await this.Ba.jh(s);
    }
    fl(t) {}
    async Sc(t) {
        if (!this.currentUser.isEqual(t)) {
            V("SyncEngine", "User change. New user:", t.s());
            const e = await this.Ba.kh(t);
            this.currentUser = t, 
            // Fails tasks waiting for pending writes requested by previous user.
            this.gl("'waitForPendingWrites' promise is rejected due to a user change."), 
            // TODO(b/114226417): Consider calling this only in the primary tab.
            this.Zu.kh(t, e.Oh, e.Mh), await this.Il(e.Fh);
        }
    }
    Qe(t) {
        const e = this.ol.get(t);
        if (e && e.Yu) return Pt().add(e.key);
        {
            let e = Pt();
            const n = this.sl.get(t);
            if (!n) return e;
            for (const t of n) {
                const n = this.nl.get(t);
                e = e.Bt(n.view.Lu);
            }
            return e;
        }
    }
}

/**
 * Reconcile the list of synced documents in an existing view with those
 * from persistence.
 */
async function dr(t, e) {
    const n = S(t), s = await n.Ba.Jh(e.query, 
    /* usePreviousResults= */ !0), i = e.view.Hu(s);
    return n._l && n.wl(e.targetId, i.Qu), i;
}

/** Applies a mutation state to an existing batch.  */
// PORTING NOTE: Multi-Tab only.
async function wr(t, e, n, s) {
    const i = S(t);
    i.fl("applyBatchState()");
    const r = await 
    /** Returns the local view of the documents affected by a mutation batch. */
    // PORTING NOTE: Multi-Tab only.
    function(t, e) {
        const n = S(t), s = S(n.os);
        return n.persistence.runTransaction("Lookup mutation documents", "readonly", t => s.xr(t, e).next(e => e ? n.Nh._s(t, e) : rs.resolve(null)));
    }
    // PORTING NOTE: Multi-Tab only.
    (i.Ba, e);
    null !== r ? ("pending" === n ? 
    // If we are the primary client, we need to send this write to the
    // backend. Secondary clients will ignore these writes since their remote
    // connection is disabled.
    await i.Xu.cc() : "acknowledged" === n || "rejected" === n ? (
    // NOTE: Both these methods are no-ops for batches that originated from
    // other clients.
    i.ml(e, s || null), function(t, e) {
        S(S(t).os).qr(e);
    }
    // PORTING NOTE: Multi-Tab only.
    (i.Ba, e)) : b(), await i.Il(r)) : 
    // A throttled tab may not have seen the mutation before it was completed
    // and removed from the mutation queue, in which case we won't have cached
    // the affected documents. In this case we can safely ignore the update
    // since that means we didn't apply the mutation locally at all (if we
    // had, we would have cached the affected documents), and so we will just
    // see any resulting document changes via normal remote document updates
    // as applicable.
    V("SyncEngine", "Cannot apply mutation batch with id: " + e);
}

/** Applies a query target change from a different tab. */
// PORTING NOTE: Multi-Tab only.
async function Tr(t, e) {
    const n = S(t);
    if (!0 === e && !0 !== n.ll) {
        // Secondary tabs only maintain Views for their local listeners and the
        // Views internal state may not be 100% populated (in particular
        // secondary tabs don't track syncedDocuments, the set of documents the
        // server considers to be in the target). So when a secondary becomes
        // primary, we need to need to make sure that all views for all targets
        // match the state on disk.
        const t = n.Zu.ou(), e = await Er(n, t.B());
        n.ll = !0, await n.Xu.Cc(!0);
        for (const t of e) n.Xu.listen(t);
    } else if (!1 === e && !1 !== n.ll) {
        const t = [];
        let e = Promise.resolve();
        n.sl.forEach((s, i) => {
            n.Zu.Tu(i) ? t.push(i) : e = e.then(() => (n.Tl(i), n.Ba.Hh(i, 
            /*keepPersistedTargetData=*/ !0))), n.Xu.fc(i);
        }), await e, await Er(n, t), 
        // PORTING NOTE: Multi-Tab only.
        function(t) {
            const e = S(t);
            e.ol.forEach((t, n) => {
                e.Xu.fc(n);
            }), e.hl.Lc(), e.ol = new Map, e.rl = new ut(j.D);
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
        (n), n.ll = !1, await n.Xu.Cc(!1);
    }
}

async function Er(t, e, n) {
    const s = S(t), i = [], r = [];
    for (const t of e) {
        let e;
        const n = s.sl.get(t);
        if (n && 0 !== n.length) {
            // For queries that have a local View, we fetch their current state
            // from LocalStore (as the resume token and the snapshot version
            // might have changed) and reconcile their views with the persisted
            // state (the list of syncedDocuments may have gotten out of sync).
            e = await s.Ba.zh(xn(n[0]));
            for (const t of n) {
                const e = s.nl.get(t), n = await dr(s, e);
                n.snapshot && r.push(n.snapshot);
            }
        } else {
            // For queries that never executed on this client, we need to
            // allocate the target in LocalStore and initialize a new View.
            const n = await Bi(s.Ba, t);
            e = await s.Ba.zh(n), await s.dl(Ir(n), t, 
            /*current=*/ !1);
        }
        i.push(e);
    }
    return s.el.Aa(r), i;
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
function Ir(t) {
    return Sn(t.path, t.collectionGroup, t.orderBy, t.filters, t.limit, "F" /* First */ , t.startAt, t.endAt);
}

/** Returns the IDs of the clients that are currently active. */
// PORTING NOTE: Multi-Tab only.
function Ar(t) {
    const e = S(t);
    return S(S(e.Ba).persistence).Eh();
}

/** Applies a query target change from a different tab. */
// PORTING NOTE: Multi-Tab only.
async function Rr(t, e, n, s) {
    const i = S(t);
    if (i.ll) 
    // If we receive a target state notification via WebStorage, we are
    // either already secondary or another tab has taken the primary lease.
    V("SyncEngine", "Ignoring unexpected query state notification."); else if (i.sl.has(e)) switch (n) {
      case "current":
      case "not-current":
        {
            const t = await function(t) {
                const e = S(t), n = S(e.Dh);
                return e.persistence.runTransaction("Get new document changes", "readonly", t => n.Zr(t, e.Ch)).then(({to: t, readTime: n}) => (e.Ch = n, 
                t));
            }
            /**
 * Reads the newest document change from persistence and moves the internal
 * synchronization marker forward so that calls to `getNewDocumentChanges()`
 * only return changes that happened after client initialization.
 */
            // PORTING NOTE: Multi-Tab only.
            (i.Ba), s = vt.se(e, "current" === n);
            await i.Il(t, s);
            break;
        }

      case "rejected":
        await i.Ba.Hh(e, 
        /* keepPersistedTargetData */ !0), i.Tl(e, s);
        break;

      default:
        b();
    }
}

/** Adds or removes Watch targets for queries from different tabs. */ async function mr(t, e, n) {
    const s = S(t);
    if (s.ll) {
        for (const t of e) {
            if (s.sl.has(t)) {
                // A target might have been added in a previous attempt
                V("SyncEngine", "Adding an already active target " + t);
                continue;
            }
            const e = await Bi(s.Ba, t), n = await s.Ba.zh(e);
            await s.dl(Ir(e), n.targetId, 
            /*current=*/ !1), s.Xu.listen(n);
        }
        for (const t of n) 
        // Check that the target is still active since the target might have been
        // removed if it has been rejected by the backend.
        s.sl.has(t) && 
        // Release queries that are still active.
        await s.Ba.Hh(t, /* keepPersistedTargetData */ !1).then(() => {
            s.Xu.fc(t), s.Tl(t);
        }).catch(Ui);
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
 */ class Pr {
    constructor() {
        this.Cl = void 0, this.Dl = [];
    }
}

/**
 * EventManager is responsible for mapping queries to query event emitters.
 * It handles "fan-out". -- Identical queries will re-use the same watch on the
 * backend.
 */ class Vr {
    constructor(t) {
        this.wc = t, this.Nl = new is(t => Fn(t), kn), this.onlineState = "Unknown" /* Unknown */ , 
        this.xl = new Set, this.wc.subscribe(this);
    }
    async listen(t) {
        const e = t.query;
        let n = !1, s = this.Nl.get(e);
        if (s || (n = !0, s = new Pr), n) try {
            s.Cl = await this.wc.listen(e);
        } catch (e) {
            const n = bs(e, `Initialization of query '${On(t.query)}' failed`);
            return void t.onError(n);
        }
        this.Nl.set(e, s), s.Dl.push(t);
        // Run global snapshot listeners if a consistent snapshot has been emitted.
        t.Gu(this.onlineState);
        if (s.Cl) {
            t.kl(s.Cl) && this.Fl();
        }
    }
    async fc(t) {
        const e = t.query;
        let n = !1;
        const s = this.Nl.get(e);
        if (s) {
            const e = s.Dl.indexOf(t);
            e >= 0 && (s.Dl.splice(e, 1), n = 0 === s.Dl.length);
        }
        if (n) return this.Nl.delete(e), this.wc.fc(e);
    }
    Aa(t) {
        let e = !1;
        for (const n of t) {
            const t = n.query, s = this.Nl.get(t);
            if (s) {
                for (const t of s.Dl) t.kl(n) && (e = !0);
                s.Cl = n;
            }
        }
        e && this.Fl();
    }
    yl(t, e) {
        const n = this.Nl.get(t);
        if (n) for (const t of n.Dl) t.onError(e);
        // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
        // after an error.
                this.Nl.delete(t);
    }
    Al(t) {
        this.onlineState = t;
        let e = !1;
        this.Nl.forEach((n, s) => {
            for (const n of s.Dl) 
            // Run global snapshot listeners if a consistent snapshot has been emitted.
            n.Gu(t) && (e = !0);
        }), e && this.Fl();
    }
    Ol(t) {
        this.xl.add(t), 
        // Immediately fire an initial event, indicating all existing listeners
        // are in-sync.
        t.next();
    }
    Ml(t) {
        this.xl.delete(t);
    }
    // Call all global snapshot listeners that have been set.
    Fl() {
        this.xl.forEach(t => {
            t.next();
        });
    }
}

/**
 * QueryListener takes a series of internal view snapshots and determines
 * when to raise the event.
 *
 * It uses an Observer to dispatch events.
 */ class gr {
    constructor(t, e, n) {
        this.query = t, this.$l = e, 
        /**
         * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
         * observer. This flag is set to true once we've actually raised an event.
         */
        this.Ll = !1, this.ql = null, this.onlineState = "Unknown" /* Unknown */ , this.options = n || {};
    }
    /**
     * Applies the new ViewSnapshot to this listener, raising a user-facing event
     * if applicable (depending on what changed, whether the user has opted into
     * metadata-only changes, etc.). Returns true if a user-facing event was
     * indeed raised.
     */    kl(t) {
        if (!this.options.includeMetadataChanges) {
            // Remove the metadata only changes.
            const e = [];
            for (const n of t.docChanges) 3 /* Metadata */ !== n.type && e.push(n);
            t = new bt(t.query, t.docs, t.zt, e, t.Ht, t.fromCache, t.Jt, 
            /* excludesMetadataChanges= */ !0);
        }
        let e = !1;
        return this.Ll ? this.Bl(t) && (this.$l.next(t), e = !0) : this.Ul(t, this.onlineState) && (this.Wl(t), 
        e = !0), this.ql = t, e;
    }
    onError(t) {
        this.$l.error(t);
    }
    /** Returns whether a snapshot was raised. */    Gu(t) {
        this.onlineState = t;
        let e = !1;
        return this.ql && !this.Ll && this.Ul(this.ql, t) && (this.Wl(this.ql), e = !0), 
        e;
    }
    Ul(t, e) {
        // Always raise the first event when we're synced
        if (!t.fromCache) return !0;
        // NOTE: We consider OnlineState.Unknown as online (it should become Offline
        // or Online if we wait long enough).
                const n = "Offline" /* Offline */ !== e;
        // Don't raise the event if we're online, aren't synced yet (checked
        // above) and are waiting for a sync.
                return (!this.options.Kl || !n) && (!t.docs.$() || "Offline" /* Offline */ === e);
        // Raise data from cache if we have any documents or we are offline
        }
    Bl(t) {
        // We don't need to handle includeDocumentMetadataChanges here because
        // the Metadata only changes have already been stripped out if needed.
        // At this point the only changes we will see are the ones we should
        // propagate.
        if (t.docChanges.length > 0) return !0;
        const e = this.ql && this.ql.hasPendingWrites !== t.hasPendingWrites;
        return !(!t.Jt && !e) && !0 === this.options.includeMetadataChanges;
        // Generally we should have hit one of the cases above, but it's possible
        // to get here if there were only metadata docChanges and they got
        // stripped out.
        }
    Wl(t) {
        t = bt.Xt(t.query, t.docs, t.Ht, t.fromCache), this.Ll = !0, this.$l.next(t);
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
 */ class yr {
    xh(t) {
        this.jl = t;
    }
    ws(t, e, n, s) {
        // Queries that match all documents don't benefit from using
        // IndexFreeQueries. It is more efficient to scan all documents in a
        // collection, rather than to perform individual lookups.
        return e.Tn() || n.isEqual(q.min()) ? this.Ql(t, e) : this.jl._s(t, s).next(i => {
            const r = this.Gl(e, i);
            return (e.En() || e.In()) && this.Wu(e._n, r, s, n) ? this.Ql(t, e) : (m() <= o.DEBUG && V("IndexFreeQueryEngine", "Re-using previous result from %s to execute query: %s", n.toString(), On(e)), 
            this.jl.ws(t, e, n).next(t => (
            // We merge `previousResults` into `updateResults`, since
            // `updateResults` is already a DocumentMap. If a document is
            // contained in both lists, then its contents are the same.
            r.forEach(e => {
                t = t._t(e.key, e);
            }), t)));
        });
        // Queries that have never seen a snapshot without limbo free documents
        // should also be run as a full collection scan.
        }
    /** Applies the query filter and sorting to the provided documents.  */    Gl(t, e) {
        // Sort the documents and re-apply the query filter since previously
        // matching documents do not necessarily still match the query.
        let n = new ft($n(t));
        return e.forEach((e, s) => {
            s instanceof gn && Mn(t, s) && (n = n.add(s));
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
     */    Wu(t, e, n, s) {
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
        return !!i && (i.hasPendingWrites || i.version.p(s) > 0);
    }
    Ql(t, e) {
        return m() <= o.DEBUG && V("IndexFreeQueryEngine", "Using full collection scan to execute query:", On(e)), 
        this.jl.ws(t, e, q.min());
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
 */ class pr {
    constructor(t, e) {
        this.hs = t, this.pr = e, 
        /**
         * The set of all mutations that have been sent but not yet been applied to
         * the backend.
         */
        this.os = [], 
        /** Next value to use when assigning sequential IDs to each mutation batch. */
        this.zl = 1, 
        /** An ordered mapping between documents and the mutations batch IDs. */
        this.Hl = new ft(Yi.Nc);
    }
    Sr(t) {
        return rs.resolve(0 === this.os.length);
    }
    Cr(t, e, n, s) {
        const i = this.zl;
        if (this.zl++, this.os.length > 0) {
            this.os[this.os.length - 1];
        }
        const r = new ns(i, e, n, s);
        this.os.push(r);
        // Track references by document key and index collection parents.
        for (const e of s) this.Hl = this.Hl.add(new Yi(e.key, i)), this.hs.Dr(t, e.key.path.F());
        return rs.resolve(r);
    }
    Nr(t, e) {
        return rs.resolve(this.Jl(e));
    }
    kr(t, e) {
        const n = e + 1, s = this.Yl(n), i = s < 0 ? 0 : s;
        // The requested batchId may still be out of range so normalize it to the
        // start of the queue.
                return rs.resolve(this.os.length > i ? this.os[i] : null);
    }
    Fr() {
        return rs.resolve(0 === this.os.length ? -1 : this.zl - 1);
    }
    Or(t) {
        return rs.resolve(this.os.slice());
    }
    cs(t, e) {
        const n = new Yi(e, 0), s = new Yi(e, Number.POSITIVE_INFINITY), i = [];
        return this.Hl.$t([ n, s ], t => {
            const e = this.Jl(t.Bc);
            i.push(e);
        }), rs.resolve(i);
    }
    ds(t, e) {
        let n = new ft(O);
        return e.forEach(t => {
            const e = new Yi(t, 0), s = new Yi(t, Number.POSITIVE_INFINITY);
            this.Hl.$t([ e, s ], t => {
                n = n.add(t.Bc);
            });
        }), rs.resolve(this.Xl(n));
    }
    Rs(t, e) {
        // Use the query path as a prefix for testing if a document matches the
        // query.
        const n = e.path, s = n.length + 1;
        // Construct a document reference for actually scanning the index. Unlike
        // the prefix the document key in this reference must have an even number of
        // segments. The empty segment can be used a suffix of the query path
        // because it precedes all other segments in an ordered traversal.
        let i = n;
        j.Z(i) || (i = i.child(""));
        const r = new Yi(new j(i), 0);
        // Find unique batchIDs referenced by all documents potentially matching the
        // query.
                let o = new ft(O);
        return this.Hl.Lt(t => {
            const e = t.key.path;
            return !!n.L(e) && (
            // Rows with document keys more than one segment longer than the query
            // path can't be matches. For example, a query on 'rooms' can't match
            // the document /rooms/abc/messages/xyx.
            // TODO(mcg): we'll need a different scanner when we implement
            // ancestor queries.
            e.length === s && (o = o.add(t.Bc)), !0);
        }, r), rs.resolve(this.Xl(o));
    }
    Xl(t) {
        // Construct an array of matching batches, sorted by batchID to ensure that
        // multiple mutations affecting the same document key are applied in order.
        const e = [];
        return t.forEach(t => {
            const n = this.Jl(t);
            null !== n && e.push(n);
        }), e;
    }
    $r(t, e) {
        v(0 === this.Zl(e.batchId, "removed")), this.os.shift();
        let n = this.Hl;
        return rs.forEach(e.mutations, s => {
            const i = new Yi(s.key, e.batchId);
            return n = n.delete(i), this.pr.Br(t, s.key);
        }).next(() => {
            this.Hl = n;
        });
    }
    qr(t) {
        // No-op since the memory mutation queue does not maintain a separate cache.
    }
    Wr(t, e) {
        const n = new Yi(e, 0), s = this.Hl.qt(n);
        return rs.resolve(e.isEqual(s && s.key));
    }
    Ur(t) {
        return this.os.length, rs.resolve();
    }
    /**
     * Finds the index of the given batchId in the mutation queue and asserts that
     * the resulting index is within the bounds of the queue.
     *
     * @param batchId The batchId to search for
     * @param action A description of what the caller is doing, phrased in passive
     * form (e.g. "acknowledged" in a routine that acknowledges batches).
     */    Zl(t, e) {
        return this.Yl(t);
    }
    /**
     * Finds the index of the given batchId in the mutation queue. This operation
     * is O(1).
     *
     * @return The computed index of the batch with the given batchId, based on
     * the state of the queue. Note this index can be negative if the requested
     * batchId has already been remvoed from the queue or past the end of the
     * queue if the batchId is larger than the last added batch.
     */    Yl(t) {
        if (0 === this.os.length) 
        // As an index this is past the end of the queue
        return 0;
        // Examine the front of the queue to figure out the difference between the
        // batchId and indexes in the array. Note that since the queue is ordered
        // by batchId, if the first batch has a larger batchId then the requested
        // batchId doesn't exist in the queue.
                return t - this.os[0].batchId;
    }
    /**
     * A version of lookupMutationBatch that doesn't return a promise, this makes
     * other functions that uses this code easier to read and more efficent.
     */    Jl(t) {
        const e = this.Yl(t);
        if (e < 0 || e >= this.os.length) return null;
        return this.os[e];
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
 */ class br {
    /**
     * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
     * return 0 to avoid unnecessarily doing the work of calculating the size.
     */
    constructor(t, e) {
        this.hs = t, this.t_ = e, 
        /** Underlying cache of documents and their read times. */
        this.docs = new ut(j.D), 
        /** Size of all cached documents. */
        this.size = 0;
    }
    /**
     * Adds the supplied entry to the cache and updates the cache size as appropriate.
     *
     * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */    zn(t, e, n) {
        const s = e.key, i = this.docs.get(s), r = i ? i.size : 0, o = this.t_(e);
        return this.docs = this.docs._t(s, {
            zr: e,
            size: o,
            readTime: n
        }), this.size += o - r, this.hs.Dr(t, s.path.F());
    }
    /**
     * Removes the specified entry from the cache and updates the cache size as appropriate.
     *
     * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */    Jn(t) {
        const e = this.docs.get(t);
        e && (this.docs = this.docs.remove(t), this.size -= e.size);
    }
    Yn(t, e) {
        const n = this.docs.get(e);
        return rs.resolve(n ? n.zr : null);
    }
    getEntries(t, e) {
        let n = Et();
        return e.forEach(t => {
            const e = this.docs.get(t);
            n = n._t(t, e ? e.zr : null);
        }), rs.resolve(n);
    }
    ws(t, e, n) {
        let s = At();
        // Documents are ordered by key, so we can use a prefix scan to narrow down
        // the documents we need to match the query against.
                const i = new j(e.path.child("")), r = this.docs.At(i);
        for (;r.pt(); ) {
            const {key: t, value: {zr: i, readTime: o}} = r.yt();
            if (!e.path.L(t.path)) break;
            o.p(n) <= 0 || i instanceof gn && Mn(e, i) && (s = s._t(i.key, i));
        }
        return rs.resolve(s);
    }
    e_(t, e) {
        return rs.forEach(this.docs, t => e(t));
    }
    no(t) {
        // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
        // a separate changelog and does not need special handling for removals.
        return new br.so(this);
    }
    ro(t) {
        return rs.resolve(this.size);
    }
}

/**
 * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
 */ br.so = class extends os {
    constructor(t) {
        super(), this.oo = t;
    }
    ts(t) {
        const e = [];
        return this.jn.forEach((n, s) => {
            s ? e.push(this.oo.zn(t, s, this.readTime)) : this.oo.Jn(n);
        }), rs.Wn(e);
    }
    Xn(t, e) {
        return this.oo.Yn(t, e);
    }
    Zn(t, e) {
        return this.oo.getEntries(t, e);
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
class vr {
    constructor(t) {
        this.persistence = t, 
        /**
         * Maps a target to the data about that target
         */
        this.n_ = new is(t => Z(t), et), 
        /** The last received snapshot version. */
        this.lastRemoteSnapshotVersion = q.min(), 
        /** The highest numbered target ID encountered. */
        this.highestTargetId = 0, 
        /** The highest sequence number encountered. */
        this.s_ = 0, 
        /**
         * A ordered bidirectional mapping between documents and the remote target
         * IDs.
         */
        this.i_ = new Ji, this.targetCount = 0, this.r_ = pi.lo();
    }
    Oe(t, e) {
        return this.n_.forEach((t, n) => e(n)), rs.resolve();
    }
    To(t) {
        return rs.resolve(this.lastRemoteSnapshotVersion);
    }
    Eo(t) {
        return rs.resolve(this.s_);
    }
    fo(t) {
        return this.highestTargetId = this.r_.next(), rs.resolve(this.highestTargetId);
    }
    Io(t, e, n) {
        return n && (this.lastRemoteSnapshotVersion = n), e > this.s_ && (this.s_ = e), 
        rs.resolve();
    }
    Ro(t) {
        this.n_.set(t.target, t);
        const e = t.targetId;
        e > this.highestTargetId && (this.r_ = new pi(e), this.highestTargetId = e), t.sequenceNumber > this.s_ && (this.s_ = t.sequenceNumber);
    }
    Ao(t, e) {
        return this.Ro(e), this.targetCount += 1, rs.resolve();
    }
    Po(t, e) {
        return this.Ro(e), rs.resolve();
    }
    Vo(t, e) {
        return this.n_.delete(e.target), this.i_.$c(e.targetId), this.targetCount -= 1, 
        rs.resolve();
    }
    Rr(t, e, n) {
        let s = 0;
        const i = [];
        return this.n_.forEach((r, o) => {
            o.sequenceNumber <= e && null === n.get(o.targetId) && (this.n_.delete(r), i.push(this.yo(t, o.targetId)), 
            s++);
        }), rs.Wn(i).next(() => s);
    }
    po(t) {
        return rs.resolve(this.targetCount);
    }
    bo(t, e) {
        const n = this.n_.get(e) || null;
        return rs.resolve(n);
    }
    vo(t, e, n) {
        return this.i_.Fc(e, n), rs.resolve();
    }
    Co(t, e, n) {
        this.i_.Mc(e, n);
        const s = this.persistence.pr, i = [];
        return s && e.forEach(e => {
            i.push(s.Br(t, e));
        }), rs.Wn(i);
    }
    yo(t, e) {
        return this.i_.$c(e), rs.resolve();
    }
    No(t, e) {
        const n = this.i_.qc(e);
        return rs.resolve(n);
    }
    Wr(t, e) {
        return rs.resolve(this.i_.Wr(e));
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
class Sr {
    /**
     * The constructor accepts a factory for creating a reference delegate. This
     * allows both the delegate and this instance to have strong references to
     * each other without having nullable fields that would then need to be
     * checked or asserted on every access.
     */
    constructor(t) {
        this.o_ = {}, this.Oo = new ls(0), this.Mo = !1, this.Mo = !0, this.pr = t(this), 
        this.jo = new vr(this);
        this.hs = new ri, this.rs = new br(this.hs, t => this.pr.h_(t));
    }
    start() {
        return Promise.resolve();
    }
    _h() {
        // No durable state to ensure is closed on shutdown.
        return this.Mo = !1, Promise.resolve();
    }
    get _r() {
        return this.Mo;
    }
    Xo() {
        // No op.
    }
    Zo() {
        // No op.
    }
    mh() {
        return this.hs;
    }
    Ih(t) {
        let e = this.o_[t.s()];
        return e || (e = new pr(this.hs, this.pr), this.o_[t.s()] = e), e;
    }
    Ah() {
        return this.jo;
    }
    Rh() {
        return this.rs;
    }
    runTransaction(t, e, n) {
        V("MemoryPersistence", "Starting transaction:", t);
        const s = new Cr(this.Oo.next());
        return this.pr.a_(), n(s).next(t => this.pr.c_(s).next(() => t)).Bn().then(t => (s.ss(), 
        t));
    }
    u_(t, e) {
        return rs.Kn(Object.values(this.o_).map(n => () => n.Wr(t, e)));
    }
}

/**
 * Memory persistence is not actually transactional, but future implementations
 * may have transaction-scoped state.
 */ class Cr extends as {
    constructor(t) {
        super(), this.xo = t;
    }
}

class Dr {
    constructor(t) {
        this.persistence = t, 
        /** Tracks all documents that are active in Query views. */
        this.l_ = new Ji, 
        /** The list of documents that are potentially GCed after each transaction. */
        this.__ = null;
    }
    static f_(t) {
        return new Dr(t);
    }
    get d_() {
        if (this.__) return this.__;
        throw b();
    }
    So(t, e, n) {
        return this.l_.So(n, e), this.d_.delete(n), rs.resolve();
    }
    Do(t, e, n) {
        return this.l_.Do(n, e), this.d_.add(n), rs.resolve();
    }
    Br(t, e) {
        return this.d_.add(e), rs.resolve();
    }
    removeTarget(t, e) {
        this.l_.$c(e.targetId).forEach(t => this.d_.add(t));
        const n = this.persistence.Ah();
        return n.No(t, e.targetId).next(t => {
            t.forEach(t => this.d_.add(t));
        }).next(() => n.Vo(t, e));
    }
    a_() {
        this.__ = new Set;
    }
    c_(t) {
        // Remove newly orphaned documents.
        const e = this.persistence.Rh().no();
        return rs.forEach(this.d_, n => this.w_(t, n).next(t => {
            t || e.Jn(n);
        })).next(() => (this.__ = null, e.apply(t)));
    }
    ph(t, e) {
        return this.w_(t, e).next(t => {
            t ? this.d_.delete(e) : this.d_.add(e);
        });
    }
    h_(t) {
        // For eager GC, we don't care about the document size, there are no size thresholds.
        return 0;
    }
    w_(t, e) {
        return rs.Kn([ () => rs.resolve(this.l_.Wr(e)), () => this.persistence.Ah().Wr(t, e), () => this.persistence.u_(t, e) ]);
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
 */ class Nr {
    constructor(t) {
        this.T_ = t.T_, this.E_ = t.E_;
    }
    Ea(t) {
        this.I_ = t;
    }
    _a(t) {
        this.A_ = t;
    }
    onMessage(t) {
        this.R_ = t;
    }
    close() {
        this.E_();
    }
    send(t) {
        this.T_(t);
    }
    m_() {
        this.I_();
    }
    P_(t) {
        this.A_(t);
    }
    V_(t) {
        this.R_(t);
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
 */ class kr extends 
/**
 * Base class for all Rest-based connections to the backend (WebChannel and
 * HTTP).
 */
class {
    constructor(t) {
        this.g_ = t, this.et = t.et;
        const e = t.ssl ? "https" : "http";
        this.y_ = e + "://" + t.host, this.p_ = "projects/" + this.et.projectId + "/databases/" + this.et.database + "/documents";
    }
    Ca(t, e, n, s) {
        const i = this.b_(t, e);
        V("RestConnection", "Sending: ", i, n);
        const r = {};
        return this.v_(r, s), this.S_(t, i, r, n).then(t => (V("RestConnection", "Received: ", t), 
        t), e => {
            throw y("RestConnection", t + " failed with error: ", e, "url: ", i, "request:", n), 
            e;
        });
    }
    Da(t, e, n, s) {
        // The REST API automatically aggregates all of the streamed results, so we
        // can just use the normal invoke() method.
        return this.Ca(t, e, n, s);
    }
    /**
     * Modifies the headers for a request, adding any authorization token if
     * present and any additional headers for the request.
     */    v_(t, e) {
        if (t["X-Goog-Api-Client"] = "gl-js/ fire/7.17.2", 
        // Content-Type: text/plain will avoid preflight requests which might
        // mess with CORS and redirects by proxies. If we add custom headers
        // we will need to change this code to potentially use the $httpOverwrite
        // parameter supported by ESF to avoid	triggering preflight requests.
        t["Content-Type"] = "text/plain", e) for (const n in e.h) e.h.hasOwnProperty(n) && (t[n] = e.h[n]);
    }
    b_(t, e) {
        const n = xr[t];
        return `${this.y_}/v1/${e}:${n}`;
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
    S_(t, e, n, s) {
        return new Promise((i, r) => {
            const o = new d;
            o.listenOnce(w.COMPLETE, () => {
                try {
                    switch (o.getLastErrorCode()) {
                      case T.NO_ERROR:
                        const e = o.getResponseJson();
                        V("Connection", "XHR received:", JSON.stringify(e)), i(e);
                        break;

                      case T.TIMEOUT:
                        V("Connection", 'RPC "' + t + '" timed out'), r(new D(C.DEADLINE_EXCEEDED, "Request time out"));
                        break;

                      case T.HTTP_ERROR:
                        const n = o.getStatus();
                        if (V("Connection", 'RPC "' + t + '" failed with status:', n, "response text:", o.getResponseText()), 
                        n > 0) {
                            const t = o.getResponseJson().error;
                            if (t && t.status && t.message) {
                                const e = function(t) {
                                    const e = t.toLowerCase().replace("_", "-");
                                    return Object.values(C).indexOf(e) >= 0 ? e : C.UNKNOWN;
                                }(t.status);
                                r(new D(e, t.message));
                            } else r(new D(C.UNKNOWN, "Server responded with status " + o.getStatus()));
                        } else 
                        // If we received an HTTP_ERROR but there's no status code,
                        // it's most probably a connection issue
                        r(new D(C.UNAVAILABLE, "Connection failed."));
                        break;

                      default:
                        b();
                    }
                } finally {
                    V("Connection", 'RPC "' + t + '" completed.');
                }
            });
            const h = JSON.stringify(s);
            o.send(e, "POST", h, n, 15);
        });
    }
    Ia(t, e) {
        const n = [ this.y_, "/", "google.firestore.v1.Firestore", "/", t, "/channel" ], s = E(), i = {
            // Required for backend stickiness, routing behavior is based on this
            // parameter.
            httpSessionIdParam: "gsessionid",
            initMessageHeaders: {},
            messageUrlParams: {
                // This param is used to improve routing and project isolation by the
                // backend and must be included in every request.
                database: `projects/${this.et.projectId}/databases/${this.et.database}`
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
        this.v_(i.initMessageHeaders, e), 
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
        a() || c() || u() || l() || _() || f() || (i.httpHeadersOverwriteParam = "$httpHeaders");
        const r = n.join("");
        V("Connection", "Creating WebChannel: " + r, i);
        const o = s.createWebChannel(r, i);
        // WebChannel supports sending the first message with the handshake - saving
        // a network round trip. However, it will have to call send in the same
        // JS event loop as open. In order to enforce this, we delay actually
        // opening the WebChannel until send is called. Whether we have called
        // open is tracked with this variable.
                let h = !1, d = !1;
        // A flag to determine whether the stream was closed (by us or through an
        // error/close event) to avoid delivering multiple close events or sending
        // on a closed stream
                const w = new Nr({
            T_: t => {
                d ? V("Connection", "Not sending because WebChannel is closed:", t) : (h || (V("Connection", "Opening WebChannel transport."), 
                o.open(), h = !0), V("Connection", "WebChannel sending:", t), o.send(t));
            },
            E_: () => o.close()
        }), T = (t, e) => {
            // TODO(dimond): closure typing seems broken because WebChannel does
            // not implement goog.events.Listenable
            o.listen(t, t => {
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
                return T(I.EventType.OPEN, () => {
            d || V("Connection", "WebChannel transport opened.");
        }), T(I.EventType.CLOSE, () => {
            d || (d = !0, V("Connection", "WebChannel transport closed"), w.P_());
        }), T(I.EventType.ERROR, t => {
            d || (d = !0, y("Connection", "WebChannel transport errored:", t), w.P_(new D(C.UNAVAILABLE, "The operation could not be completed")));
        }), T(I.EventType.MESSAGE, t => {
            var e;
            if (!d) {
                const n = t.data[0];
                v(!!n);
                // TODO(b/35143891): There is a bug in One Platform that caused errors
                // (and only errors) to be wrapped in an extra array. To be forward
                // compatible with the bug we need to check either condition. The latter
                // can be removed once the fix has been rolled out.
                // Use any because msgData.error is not typed.
                const s = n, i = s.error || (null === (e = s[0]) || void 0 === e ? void 0 : e.error);
                if (i) {
                    V("Connection", "WebChannel received error:", i);
                    // error.status will be a string like 'OK' or 'NOT_FOUND'.
                    const t = i.status;
                    let e = function(t) {
                        // lookup by string
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const e = ot[t];
                        if (void 0 !== e) return ct(e);
                    }(t), n = i.message;
                    void 0 === e && (e = C.INTERNAL, n = "Unknown error status: " + t + " with message " + i.message), 
                    // Mark closed so no further events are propagated
                    d = !0, w.P_(new D(e, n)), o.close();
                } else V("Connection", "WebChannel received:", n), w.V_(n);
            }
        }), setTimeout(() => {
            // Technically we could/should wait for the WebChannel opened event,
            // but because we want to send the first message with the WebChannel
            // handshake we pretend the channel opened here (asynchronously), and
            // then delay the actual open until the first message is sent.
            w.m_();
        }, 0), w;
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
class Fr {
    constructor() {
        this.C_ = () => this.D_(), this.N_ = () => this.x_(), this.k_ = [], this.F_();
    }
    za(t) {
        this.k_.push(t);
    }
    _h() {
        window.removeEventListener("online", this.C_), window.removeEventListener("offline", this.N_);
    }
    F_() {
        window.addEventListener("online", this.C_), window.addEventListener("offline", this.N_);
    }
    D_() {
        V("ConnectivityMonitor", "Network connectivity changed: AVAILABLE");
        for (const t of this.k_) t(0 /* AVAILABLE */);
    }
    x_() {
        V("ConnectivityMonitor", "Network connectivity changed: UNAVAILABLE");
        for (const t of this.k_) t(1 /* UNAVAILABLE */);
    }
    // TODO(chenbrian): Consider passing in window either into this component or
    // here for testing via FakeWindow.
    /** Checks that all used attributes of window are available. */
    static Qs() {
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
    za(t) {
        // No-op.
    }
    _h() {
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
/** Initializes the WebChannelConnection for the browser. */ function Mr(t) {
    return new kr(t);
}

/** Return the Platform-specific connectivity monitor. */
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
function $r(t) {
    return new he(t, /* useProto3Json= */ !0);
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
 */ const Lr = "You are using the memory-only build of Firestore. Persistence support is only available via the @firebase/firestore bundle or the firebase-firestore.js build.";

/**
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */ class qr {
    async initialize(t) {
        this.Zu = this.O_(t), this.persistence = this.M_(t), await this.persistence.start(), 
        this.L_ = this.q_(t), this.Ba = this.B_(t);
    }
    q_(t) {
        return null;
    }
    B_(t) {
        /** Manages our in-memory or durable persistence. */
        return e = this.persistence, n = new yr, s = t.U_, new qi(e, n, s);
        var e, n, s;
    }
    M_(t) {
        if (t.K_.W_) throw new D(C.FAILED_PRECONDITION, Lr);
        return new Sr(Dr.f_);
    }
    O_(t) {
        return new hr;
    }
    async terminate() {
        this.L_ && this.L_.stop(), await this.Zu._h(), await this.persistence._h();
    }
    clearPersistence(t, e) {
        throw new D(C.FAILED_PRECONDITION, Lr);
    }
}

/**
 * Provides all components needed for Firestore with IndexedDB persistence.
 */ class Br extends qr {
    async initialize(t) {
        await super.initialize(t), await async function(t) {
            const e = S(t), n = S(e.Dh);
            return e.persistence.runTransaction("Synchronize last document change read time", "readonly", t => n.eo(t)).then(t => {
                e.Ch = t;
            });
        }(this.Ba);
    }
    q_(t) {
        const e = this.persistence.pr.ar;
        return new Ns(e, t.fi);
    }
    M_(t) {
        const e = $i(t.g_.et, t.g_.persistenceKey), n = $r(t.g_.et);
        return new xi(t.K_.synchronizeTabs, e, t.clientId, Ds.tr(t.K_.cacheSizeBytes), t.fi, Vs(), gs(), n, this.Zu, t.K_.Fo);
    }
    O_(t) {
        return new hr;
    }
    clearPersistence(t, e) {
        return Li($i(t, e));
    }
}

/**
 * Provides all components needed for Firestore with multi-tab IndexedDB
 * persistence.
 *
 * In the legacy client, this provider is used to provide both multi-tab and
 * non-multi-tab persistence since we cannot tell at build time whether
 * `synchronizeTabs` will be enabled.
 */ class Ur extends Br {
    constructor(t) {
        super(), this.j_ = t;
    }
    async initialize(t) {
        await super.initialize(t), await this.j_.initialize(this, t);
        const e = this.j_.wc;
        this.Zu instanceof or && (this.Zu.wc = {
            Su: wr.bind(null, e),
            Cu: Rr.bind(null, e),
            Du: mr.bind(null, e),
            Eh: Ar.bind(null, e)
        }, await this.Zu.start()), 
        // NOTE: This will immediately call the listener, so we make sure to
        // set it after localStore / remoteStore are started.
        await this.persistence.Yo(async t => {
            await Tr(this.j_.wc, t), this.L_ && (t && !this.L_._r ? this.L_.start(this.Ba) : t || this.L_.stop());
        });
    }
    O_(t) {
        if (t.K_.W_ && t.K_.synchronizeTabs) {
            const e = Vs();
            if (!or.Qs(e)) throw new D(C.UNIMPLEMENTED, "IndexedDB persistence is only available on platforms that support LocalStorage.");
            const n = $i(t.g_.et, t.g_.persistenceKey);
            return new or(e, t.fi, n, t.clientId, t.U_);
        }
        return new hr;
    }
}

/**
 * Initializes and wires the components that are needed to interface with the
 * network.
 */ class Wr {
    async initialize(t, e) {
        this.Ba || (this.Ba = t.Ba, this.Zu = t.Zu, this.Ua = this.Q_(e), this.Xu = this.G_(e), 
        this.wc = this.z_(e), this.H_ = this.J_(e), this.Zu.Na = t => this.wc.Gu(t, 1 /* SharedClientState */), 
        this.Xu.wc = this.wc, await this.Xu.start(), await this.Xu.Cc(this.wc._l));
    }
    J_(t) {
        return new Vr(this.wc);
    }
    Q_(t) {
        const e = $r(t.g_.et), n = Mr(t.g_);
        return Gi(t.credentials, n, e);
    }
    G_(t) {
        return new Hi(this.Ba, this.Ua, t.fi, t => this.wc.Gu(t, 0 /* RemoteStore */), Fr.Qs() ? new Fr : new Or);
    }
    z_(t) {
        return function(t, e, n, 
        // PORTING NOTE: Manages state synchronization in multi-tab environments.
        s, i, r, o) {
            const h = new fr(t, e, n, s, i, r);
            return o && (h.ll = !0), h;
        }(this.Ba, this.Xu, this.Ua, this.Zu, t.U_, t.tl, !t.K_.W_ || !t.K_.synchronizeTabs);
    }
    terminate() {
        return this.Xu._h();
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
 */ function Kr(t) {
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

class jr {
    constructor(t) {
        this.observer = t, 
        /**
         * When set to true, will not raise future events. Necessary to deal with
         * async detachment of listener.
         */
        this.muted = !1;
    }
    next(t) {
        this.observer.next && this.Y_(this.observer.next, t);
    }
    error(t) {
        this.observer.error ? this.Y_(this.observer.error, t) : console.error("Uncaught Error in snapshot listener:", t);
    }
    X_() {
        this.muted = !0;
    }
    Y_(t, e) {
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
 * Validates the invocation of functionName has the exact number of arguments.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateExactNumberOfArgs('myFunction', arguments, 2);
 */ function Qr(t, e, n) {
    if (e.length !== n) throw new D(C.INVALID_ARGUMENT, `Function ${t}() requires ` + no(n, "argument") + ", but was called with " + no(e.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */ function Gr(t, e, n) {
    if (e.length < n) throw new D(C.INVALID_ARGUMENT, `Function ${t}() requires at least ` + no(n, "argument") + ", but was called with " + no(e.length, "argument") + ".");
}

/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */
function zr(t, e, n, s) {
    !
    /** Helper to validate the type of a provided input. */
    function(t, e, n, s) {
        let i = !1;
        i = "object" === e ? Yr(s) : "non-empty string" === e ? "string" == typeof s && "" !== s : typeof s === e;
        if (!i) {
            const i = Xr(s);
            throw new D(C.INVALID_ARGUMENT, `Function ${t}() requires its ${n} to be of type ${e}, but it was: ${i}`);
        }
    }
    /**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */ (t, e, eo(n) + " argument", s);
}

/**
 * Validates that `path` refers to a document (indicated by the fact it contains
 * an even numbers of segments).
 */ function Hr(t) {
    if (!j.Z(t)) throw new D(C.INVALID_ARGUMENT, `Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`);
}

/**
 * Validates that `path` refers to a collection (indicated by the fact it
 * contains an odd numbers of segments).
 */ function Jr(t) {
    if (j.Z(t)) throw new D(C.INVALID_ARGUMENT, `Invalid collection reference. Collection references must have an odd number of segments, but ${t} has ${t.length}.`);
}

function Yr(t) {
    return "object" == typeof t && null !== t && (Object.getPrototypeOf(t) === Object.prototype || null === Object.getPrototypeOf(t));
}

/** Returns a string describing the type / value of the provided input. */ function Xr(t) {
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
            /**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */ (t);
            return e ? `a custom ${e} object` : "an object";
        }
    }
    return "function" == typeof t ? "a function" : b();
}

function Zr(t, e, n, s) {
    const i = Xr(s);
    return new D(C.INVALID_ARGUMENT, `Function ${t}() requires its ${eo(n)} argument to be a ${e}, but it was: ${i}`);
}

function to(t, e, n) {
    if (n <= 0) throw new D(C.INVALID_ARGUMENT, `Function ${t}() requires its ${eo(e)} argument to be a positive number, but it was: ${n}.`);
}

/** Converts a number to its english word representation */ function eo(t) {
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
 */ function no(t, e) {
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
/** Helper function to assert Uint8Array is available at runtime. */ function so() {
    if ("undefined" == typeof Uint8Array) throw new D(C.UNIMPLEMENTED, "Uint8Arrays are not available in this environment.");
}

/** Helper function to assert Base64 functions are available at runtime. */ function io() {
    if ("undefined" == typeof atob) throw new D(C.UNIMPLEMENTED, "Blobs are unavailable in Firestore in this environment.");
}

/**
 * Immutable class holding a blob (binary data).
 * This class is directly exposed in the public API.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */ class ro {
    constructor(t) {
        io(), this.Z_ = t;
    }
    static fromBase64String(t) {
        Qr("Blob.fromBase64String", arguments, 1), zr("Blob.fromBase64String", "string", 1, t), 
        io();
        try {
            return new ro(st.fromBase64String(t));
        } catch (t) {
            throw new D(C.INVALID_ARGUMENT, "Failed to construct Blob from Base64 string: " + t);
        }
    }
    static fromUint8Array(t) {
        if (Qr("Blob.fromUint8Array", arguments, 1), so(), !(t instanceof Uint8Array)) throw Zr("Blob.fromUint8Array", "Uint8Array", 1, t);
        return new ro(st.fromUint8Array(t));
    }
    toBase64() {
        return Qr("Blob.toBase64", arguments, 0), io(), this.Z_.toBase64();
    }
    toUint8Array() {
        return Qr("Blob.toUint8Array", arguments, 0), so(), this.Z_.toUint8Array();
    }
    toString() {
        return "Blob(base64: " + this.toBase64() + ")";
    }
    isEqual(t) {
        return this.Z_.isEqual(t.Z_);
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
 */ class oo {
    constructor(t) {
        !function(t, e, n, s) {
            if (!(e instanceof Array) || e.length < s) throw new D(C.INVALID_ARGUMENT, `Function ${t}() requires its ${n} argument to be an array with at least ` + no(s, "element") + ".");
        }("FieldPath", t, "fieldNames", 1);
        for (let e = 0; e < t.length; ++e) if (zr("FieldPath", "string", e, t[e]), 0 === t[e].length) throw new D(C.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). Field names must not be empty.");
        this.tf = new K(t);
    }
}

/**
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */ class ho extends oo {
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
        return new ho(K.H().U());
    }
    isEqual(t) {
        if (!(t instanceof ho)) throw Zr("isEqual", "FieldPath", 1, t);
        return this.tf.isEqual(t.tf);
    }
}

/**
 * Matches any characters in a field path string that are reserved.
 */ const ao = new RegExp("[~\\*/\\[\\]]");

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
class co {
    constructor() {
        /** A pointer to the implementing class. */
        this.ef = this;
    }
}

class uo extends co {
    constructor(t) {
        super(), this.nf = t;
    }
    sf(t) {
        if (2 /* MergeSet */ !== t.if) throw 1 /* Update */ === t.if ? t.rf(this.nf + "() can only appear at the top level of your update data") : t.rf(this.nf + "() cannot be used with set() unless you pass {merge:true}");
        // No transform to add for a delete, but we need to add it to our
        // fieldMask so it gets deleted.
        return t.He.push(t.path), null;
    }
    isEqual(t) {
        return t instanceof uo;
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
 */ function lo(t, e, n) {
    return new Vo({
        if: 3 /* Argument */ ,
        hf: e.settings.hf,
        methodName: t.nf,
        af: n
    }, e.et, e.serializer, e.ignoreUndefinedProperties);
}

class _o extends co {
    constructor(t) {
        super(), this.nf = t;
    }
    sf(t) {
        return new tn(t.path, new je);
    }
    isEqual(t) {
        return t instanceof _o;
    }
}

class fo extends co {
    constructor(t, e) {
        super(), this.nf = t, this.cf = e;
    }
    sf(t) {
        const e = lo(this, t, 
        /*array=*/ !0), n = this.cf.map(t => So(t, e)), s = new Qe(n);
        return new tn(t.path, s);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class wo extends co {
    constructor(t, e) {
        super(), this.nf = t, this.cf = e;
    }
    sf(t) {
        const e = lo(this, t, 
        /*array=*/ !0), n = this.cf.map(t => So(t, e)), s = new ze(n);
        return new tn(t.path, s);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class To extends co {
    constructor(t, e) {
        super(), this.nf = t, this.uf = e;
    }
    sf(t) {
        const e = new Je(t.serializer, ue(t.serializer, this.uf));
        return new tn(t.path, e);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
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
 */ class Eo {
    constructor(t, e) {
        if (Qr("GeoPoint", arguments, 2), zr("GeoPoint", "number", 1, t), zr("GeoPoint", "number", 2, e), 
        !isFinite(t) || t < -90 || t > 90) throw new D(C.INVALID_ARGUMENT, "Latitude must be a number between -90 and 90, but was: " + t);
        if (!isFinite(e) || e < -180 || e > 180) throw new D(C.INVALID_ARGUMENT, "Longitude must be a number between -180 and 180, but was: " + e);
        this.lf = t, this._f = e;
    }
    /**
     * Returns the latitude of this geo point, a number between -90 and 90.
     */    get latitude() {
        return this.lf;
    }
    /**
     * Returns the longitude of this geo point, a number between -180 and 180.
     */    get longitude() {
        return this._f;
    }
    isEqual(t) {
        return this.lf === t.lf && this._f === t._f;
    }
    /**
     * Actually private to JS consumers of our API, so this function is prefixed
     * with an underscore.
     */    V(t) {
        return O(this.lf, t.lf) || O(this._f, t._f);
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
 */ const Io = /^__.*__$/;

/**
 * A reference to a document in a Firebase project.
 *
 * This class serves as a common base class for the public DocumentReferences
 * exposed in the lite, full and legacy SDK.
 */ class Ao {
    constructor(t, e, n) {
        this.ff = t, this.df = e, this.wf = n;
    }
}

/** The result of parsing document data (e.g. for a setData call). */ class Ro {
    constructor(t, e, n) {
        this.data = t, this.He = e, this.fieldTransforms = n;
    }
    Tf(t, e) {
        const n = [];
        return null !== this.He ? n.push(new fn(t, this.data, this.He, e)) : n.push(new _n(t, this.data, e)), 
        this.fieldTransforms.length > 0 && n.push(new wn(t, this.fieldTransforms)), n;
    }
}

/** The result of parsing "update" data (i.e. for an updateData call). */ class mo {
    constructor(t, e, n) {
        this.data = t, this.He = e, this.fieldTransforms = n;
    }
    Tf(t, e) {
        const n = [ new fn(t, this.data, this.He, e) ];
        return this.fieldTransforms.length > 0 && n.push(new wn(t, this.fieldTransforms)), 
        n;
    }
}

function Po(t) {
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
        throw b();
    }
}

/** A "context" object passed around while parsing user data. */ class Vo {
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
        this.settings = t, this.et = e, this.serializer = n, this.ignoreUndefinedProperties = s, 
        // Minor hack: If fieldTransforms is undefined, we assume this is an
        // external call and we need to validate the entire path.
        void 0 === i && this.Ef(), this.fieldTransforms = i || [], this.He = r || [];
    }
    get path() {
        return this.settings.path;
    }
    get if() {
        return this.settings.if;
    }
    /** Returns a new context with the specified settings overwritten. */    If(t) {
        return new Vo(Object.assign(Object.assign({}, this.settings), t), this.et, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.He);
    }
    Af(t) {
        var e;
        const n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), s = this.If({
            path: n,
            af: !1
        });
        return s.Rf(t), s;
    }
    mf(t) {
        var e;
        const n = null === (e = this.path) || void 0 === e ? void 0 : e.child(t), s = this.If({
            path: n,
            af: !1
        });
        return s.Ef(), s;
    }
    Pf(t) {
        // TODO(b/34871131): We don't support array paths right now; so make path
        // undefined.
        return this.If({
            path: void 0,
            af: !0
        });
    }
    rf(t) {
        return Fo(t, this.settings.methodName, this.settings.Vf || !1, this.path, this.settings.hf);
    }
    /** Returns 'true' if 'fieldPath' was traversed when creating this context. */    contains(t) {
        return void 0 !== this.He.find(e => t.L(e)) || void 0 !== this.fieldTransforms.find(e => t.L(e.field));
    }
    Ef() {
        // TODO(b/34871131): Remove null check once we have proper paths for fields
        // within arrays.
        if (this.path) for (let t = 0; t < this.path.length; t++) this.Rf(this.path.get(t));
    }
    Rf(t) {
        if (0 === t.length) throw this.rf("Document fields must not be empty");
        if (Po(this.if) && Io.test(t)) throw this.rf('Document fields cannot begin and end with "__"');
    }
}

/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */ class go {
    constructor(t, e, n) {
        this.et = t, this.ignoreUndefinedProperties = e, this.serializer = n || $r(t);
    }
    /** Creates a new top-level parse context. */    gf(t, e, n, s = !1) {
        return new Vo({
            if: t,
            methodName: e,
            hf: n,
            path: K.K(),
            af: !1,
            Vf: s
        }, this.et, this.serializer, this.ignoreUndefinedProperties);
    }
}

/** Parse document data from a set() call. */ function yo(t, e, n, s, i, r = {}) {
    const o = t.gf(r.merge || r.mergeFields ? 2 /* MergeSet */ : 0 /* Set */ , e, n, i);
    No("Data must be an object, but it was:", o, s);
    const h = Co(s, o);
    let a, c;
    if (r.merge) a = new Ze(o.He), c = o.fieldTransforms; else if (r.mergeFields) {
        const t = [];
        for (const s of r.mergeFields) {
            let i;
            if (s instanceof oo) i = s.tf; else {
                if ("string" != typeof s) throw b();
                i = ko(e, s, n);
            }
            if (!o.contains(i)) throw new D(C.INVALID_ARGUMENT, `Field '${i}' is specified in your field mask but missing from your input data.`);
            Oo(t, i) || t.push(i);
        }
        a = new Ze(t), c = o.fieldTransforms.filter(t => a.en(t.field));
    } else a = null, c = o.fieldTransforms;
    return new Ro(new Rn(h), a, c);
}

/** Parse update data from an update() call. */ function po(t, e, n, s) {
    const i = t.gf(1 /* Update */ , e, n);
    No("Data must be an object, but it was:", i, s);
    const r = [], o = new mn;
    $t(s, (t, s) => {
        const h = ko(e, t, n), a = i.mf(h);
        if (s instanceof co && s.ef instanceof uo) 
        // Add it to the field mask, but don't add anything to updateData.
        r.push(h); else {
            const t = So(s, a);
            null != t && (r.push(h), o.set(h, t));
        }
    });
    const h = new Ze(r);
    return new mo(o.sn(), h, i.fieldTransforms);
}

/** Parse update data from a list of field/value arguments. */ function bo(t, e, n, s, i, r) {
    const o = t.gf(1 /* Update */ , e, n), h = [ xo(e, s, n) ], a = [ i ];
    if (r.length % 2 != 0) throw new D(C.INVALID_ARGUMENT, `Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);
    for (let t = 0; t < r.length; t += 2) h.push(xo(e, r[t])), a.push(r[t + 1]);
    const c = [], u = new mn;
    // We iterate in reverse order to pick the last value for a field if the
    // user specified the field multiple times.
    for (let t = h.length - 1; t >= 0; --t) if (!Oo(c, h[t])) {
        const e = h[t], n = a[t], s = o.mf(e);
        if (n instanceof co && n.ef instanceof uo) 
        // Add it to the field mask, but don't add anything to updateData.
        c.push(e); else {
            const t = So(n, s);
            null != t && (c.push(e), u.set(e, t));
        }
    }
    const l = new Ze(c);
    return new mo(u.sn(), l, o.fieldTransforms);
}

/**
 * Parse a "query value" (e.g. value in a where filter or a value in a cursor
 * bound).
 *
 * @param allowArrays Whether the query value is an array that may directly
 * contain additional arrays (e.g. the operand of an `in` query).
 */ function vo(t, e, n, s = !1) {
    return So(n, t.gf(s ? 4 /* ArrayArgument */ : 3 /* Argument */ , e));
}

/**
 * Parses user data to Protobuf Values.
 *
 * @param input Data to be parsed.
 * @param context A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @return The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */ function So(t, e) {
    if (Do(t)) return No("Unsupported field value:", e, t), Co(t, e);
    if (t instanceof co) 
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
        if (!Po(e.if)) throw e.rf(t.nf + "() can only be used with update() and set()");
        if (!e.path) throw e.rf(t.nf + "() is not currently supported inside arrays");
        const n = t.sf(e);
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
    e.path && e.He.push(e.path), t instanceof Array) {
        // TODO(b/34871131): Include the path containing the array in the error
        // message.
        // In the case of IN queries, the parsed data is an array (representing
        // the set of values to be included for the IN query) that may directly
        // contain additional arrays (each representing an individual field
        // value), so we disable this validation.
        if (e.settings.af && 4 /* ArrayArgument */ !== e.if) throw e.rf("Nested arrays are not supported");
        return function(t, e) {
            const n = [];
            let s = 0;
            for (const i of t) {
                let t = So(i, e.Pf(s));
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
        if ("number" == typeof t) return ue(e.serializer, t);
        if ("boolean" == typeof t) return {
            booleanValue: t
        };
        if ("string" == typeof t) return {
            stringValue: t
        };
        if (t instanceof Date) {
            const n = L.fromDate(t);
            return {
                timestampValue: le(e.serializer, n)
            };
        }
        if (t instanceof L) {
            // Firestore backend truncates precision down to microseconds. To ensure
            // offline mode works the same with regards to truncation, perform the
            // truncation immediately without waiting for the backend to do that.
            const n = new L(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3));
            return {
                timestampValue: le(e.serializer, n)
            };
        }
        if (t instanceof Eo) return {
            geoPointValue: {
                latitude: t.latitude,
                longitude: t.longitude
            }
        };
        if (t instanceof ro) return {
            bytesValue: _e(e.serializer, t)
        };
        if (t instanceof Ao) {
            const n = e.et, s = t.ff;
            if (!s.isEqual(n)) throw e.rf(`Document reference is for database ${s.projectId}/${s.database} but should be for database ${n.projectId}/${n.database}`);
            return {
                referenceValue: we(t.ff || e.et, t.df.path)
            };
        }
        if (void 0 === t && e.ignoreUndefinedProperties) return null;
        throw e.rf("Unsupported field value: " + Xr(t));
    }
    /**
 * Checks whether an object looks like a JSON object that should be converted
 * into a struct. Normal class/prototype instances are considered to look like
 * JSON objects since they should be converted to a struct value. Arrays, Dates,
 * GeoPoints, etc. are not considered to look like JSON objects since they map
 * to specific FieldValue types other than ObjectValue.
 */ (t, e);
}

function Co(t, e) {
    const n = {};
    return Lt(t) ? 
    // If we encounter an empty object, we explicitly add it to the update
    // mask to ensure that the server creates a map entry.
    e.path && e.path.length > 0 && e.He.push(e.path) : $t(t, (t, s) => {
        const i = So(s, e.Af(t));
        null != i && (n[t] = i);
    }), {
        mapValue: {
            fields: n
        }
    };
}

function Do(t) {
    return !("object" != typeof t || null === t || t instanceof Array || t instanceof Date || t instanceof L || t instanceof Eo || t instanceof ro || t instanceof Ao || t instanceof co);
}

function No(t, e, n) {
    if (!Do(n) || !Yr(n)) {
        const s = Xr(n);
        throw "an object" === s ? e.rf(t + " a custom object") : e.rf(t + " " + s);
    }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */ function xo(t, e, n) {
    if (e instanceof oo) return e.tf;
    if ("string" == typeof e) return ko(t, e);
    throw Fo("Field path arguments must be of type string or FieldPath.", t, 
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
 */ function ko(t, e, n) {
    try {
        return function(t) {
            if (t.search(ao) >= 0) throw new D(C.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`);
            try {
                return new ho(...t.split("."));
            } catch (e) {
                throw new D(C.INVALID_ARGUMENT, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            }
        }(e).tf;
    } catch (e) {
        throw Fo((s = e) instanceof Error ? s.message : s.toString(), t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, n);
    }
    /**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */
    var s;
    /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}

function Fo(t, e, n, s, i) {
    const r = s && !s.$(), o = void 0 !== i;
    let h = `Function ${e}() called with invalid data`;
    n && (h += " (via `toFirestore()`)"), h += ". ";
    let a = "";
    return (r || o) && (a += " (found", r && (a += " in field " + s), o && (a += " in document " + i), 
    a += ")"), new D(C.INVALID_ARGUMENT, h + t + a);
}

function Oo(t, e) {
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
 */ class Mo {
    constructor(t) {
        this.Ua = t, 
        // The version of each document that was read during this transaction.
        this.yf = new Map, this.mutations = [], this.pf = !1, 
        /**
         * A deferred usage error that occurred previously in this transaction that
         * will cause the transaction to fail once it actually commits.
         */
        this.bf = null, 
        /**
         * Set of documents that have been written in the transaction.
         *
         * When there's more than one write to the same key in a transaction, any
         * writes after the first are handled differently.
         */
        this.vf = new Set;
    }
    async Sf(t) {
        if (this.Cf(), this.mutations.length > 0) throw new D(C.INVALID_ARGUMENT, "Firestore transactions require all reads to be executed before all writes.");
        const e = await async function(t, e) {
            const n = S(t), s = me(n.serializer) + "/documents", i = {
                documents: e.map(t => Ee(n.serializer, t))
            }, r = await n.Da("BatchGetDocuments", s, i), o = new Map;
            r.forEach(t => {
                const e = ge(n.serializer, t);
                o.set(e.key.toString(), e);
            });
            const h = [];
            return e.forEach(t => {
                const e = o.get(t.toString());
                v(!!e), h.push(e);
            }), h;
        }(this.Ua, t);
        return e.forEach(t => {
            t instanceof yn || t instanceof gn ? this.Df(t) : b();
        }), e;
    }
    set(t, e) {
        this.write(e.Tf(t, this.Xe(t))), this.vf.add(t);
    }
    update(t, e) {
        try {
            this.write(e.Tf(t, this.Nf(t)));
        } catch (t) {
            this.bf = t;
        }
        this.vf.add(t);
    }
    delete(t) {
        this.write([ new In(t, this.Xe(t)) ]), this.vf.add(t);
    }
    async commit() {
        if (this.Cf(), this.bf) throw this.bf;
        const t = this.yf;
        // For each mutation, note that the doc was written.
                this.mutations.forEach(e => {
            t.delete(e.key.toString());
        }), 
        // For each document that was read but not written to, we want to perform
        // a `verify` operation.
        t.forEach((t, e) => {
            const n = new j(U.W(e));
            this.mutations.push(new An(n, this.Xe(n)));
        }), await async function(t, e) {
            const n = S(t), s = me(n.serializer) + "/documents", i = {
                writes: e.map(t => pe(n.serializer, t))
            };
            await n.Ca("Commit", s, i);
        }(this.Ua, this.mutations), this.pf = !0;
    }
    Df(t) {
        let e;
        if (t instanceof gn) e = t.version; else {
            if (!(t instanceof yn)) throw b();
            // For deleted docs, we must use baseVersion 0 when we overwrite them.
            e = q.min();
        }
        const n = this.yf.get(t.key.toString());
        if (n) {
            if (!e.isEqual(n)) 
            // This transaction will fail no matter what.
            throw new D(C.ABORTED, "Document version changed between two reads.");
        } else this.yf.set(t.key.toString(), e);
    }
    /**
     * Returns the version of this document when it was read in this transaction,
     * as a precondition, or no precondition if it was not read.
     */    Xe(t) {
        const e = this.yf.get(t.toString());
        return !this.vf.has(t) && e ? sn.updateTime(e) : sn.Ze();
    }
    /**
     * Returns the precondition for a document if the operation is an update.
     */    Nf(t) {
        const e = this.yf.get(t.toString());
        // The first time a document is written, we want to take into account the
        // read time and existence
                if (!this.vf.has(t) && e) {
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
            throw new D(C.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
            // Document exists, base precondition on document update time.
                        return sn.updateTime(e);
        }
        // Document was not read, so we just use the preconditions for a blind
        // update.
        return sn.exists(!0);
    }
    write(t) {
        this.Cf(), this.mutations = this.mutations.concat(t);
    }
    Cf() {}
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
class $o {
    constructor(t, e, n, s) {
        this.fi = t, this.Ua = e, this.updateFunction = n, this.Ti = s, this.xf = 5, this.vi = new fs(this.fi, "transaction_retry" /* TransactionRetry */);
    }
    /** Runs the transaction and sets the result on deferred. */    kf() {
        this.Ff();
    }
    Ff() {
        this.vi.Ls(async () => {
            const t = new Mo(this.Ua), e = this.Of(t);
            e && e.then(e => {
                this.fi.Ri(() => t.commit().then(() => {
                    this.Ti.resolve(e);
                }).catch(t => {
                    this.Mf(t);
                }));
            }).catch(t => {
                this.Mf(t);
            });
        });
    }
    Of(t) {
        try {
            const e = this.updateFunction(t);
            return !z(e) && e.catch && e.then ? e : (this.Ti.reject(Error("Transaction callback must return a Promise")), 
            null);
        } catch (t) {
            // Do not retry errors thrown by user provided updateFunction.
            return this.Ti.reject(t), null;
        }
    }
    Mf(t) {
        this.xf > 0 && this.$f(t) ? (this.xf -= 1, this.fi.Ri(() => (this.Ff(), Promise.resolve()))) : this.Ti.reject(t);
    }
    $f(t) {
        if ("FirebaseError" === t.name) {
            // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
            // non-matching document versions with ABORTED. These errors should be retried.
            const e = t.code;
            return "aborted" === e || "failed-precondition" === e || !at(e);
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
 */ function Lo(t, e, n) {
    const s = new _s;
    return t.Ri(() => e.write(n, s)), s.promise;
}

function qo(t, e, n, s) {
    return t.enqueue(() => (n.Zo(s), s ? e.enableNetwork() : e.disableNetwork()));
}

function Bo(t, e, n, s, i) {
    const r = new jr(i), o = new gr(n, r, s);
    return t.Ri(() => e.listen(o)), () => {
        r.X_(), t.Ri(() => e.fc(o));
    };
}

/**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */
function Uo(t, e, n, s) {
    const i = new _s, r = Bo(t, e, Cn(n.path), {
        includeMetadataChanges: !0,
        Kl: !0
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
            i.reject(new D(C.UNAVAILABLE, "Failed to get document because the client is offline.")) : e && t.fromCache && s && "server" === s.source ? i.reject(new D(C.UNAVAILABLE, 'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')) : i.resolve(t);
        },
        error: t => i.reject(t)
    });
    return i.promise;
}

/**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */
function Wo(t, e, n, s) {
    const i = new _s, r = Bo(t, e, n, {
        includeMetadataChanges: !0,
        Kl: !0
    }, {
        next: t => {
            // Remove query first before passing event to user to avoid
            // user actions affecting the now stale query.
            r(), t.fromCache && s && "server" === s.source ? i.reject(new D(C.UNAVAILABLE, 'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')) : i.resolve(t);
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
 */ const Ko = new Map;

// settings() defaults:
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
 * The root reference to the Firestore Lite database.
 */
class jo {
    constructor(t, e) {
        this.app = t, this.Lf = "(lite)", this.qf = !1, 
        // TODO(firestoreexp): `deleteApp()` should call the delete method above,
        // but it still calls INTERNAL.delete().
        this.INTERNAL = {
            delete: () => this.delete()
        }, this.ff = jo.Bf(t), this.Uf = new x(e);
    }
    get Wf() {
        return this.qf;
    }
    get Kf() {
        return void 0 !== this.jf;
    }
    Qf(t) {
        if (this.qf) throw new D(C.FAILED_PRECONDITION, "Firestore has already been started and its settings can no longer be changed. initializeFirestore() cannot be called after calling getFirestore().");
        this.Gf = t;
    }
    zf() {
        return this.Gf || (this.Gf = {}), this.qf = !0, this.Gf;
    }
    static Bf(t) {
        if (!Object.prototype.hasOwnProperty.apply(t.options, [ "projectId" ])) throw new D(C.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
        return new G(t.options.projectId);
    }
    delete() {
        return this.jf || (this.jf = this.Hf()), this.jf;
    }
    /**
     * Terminates all components used by this client. Subclasses can override
     * this method to clean up their own dependencies, but must also call this
     * method.
     *
     * Only ever called once.
     */    Hf() {
        /**
 * Removes all components associated with the provided instance. Must be called
 * when the Firestore instance is terminated.
 */
        return function(t) {
            const e = Ko.get(t);
            e && (V("ComponentProvider", "Removing Datastore"), Ko.delete(t), e.terminate());
        }(this), Promise.resolve();
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
 * Converts Firestore's internal types to the JavaScript types that we expose
 * to the user.
 */ class Qo {
    constructor(t, e, n, s) {
        this.et = t, this.timestampsInSnapshots = e, this.Jf = n, this.Yf = s;
    }
    Xf(t) {
        switch (Wt(t)) {
          case 0 /* NullValue */ :
            return null;

          case 1 /* BooleanValue */ :
            return t.booleanValue;

          case 2 /* NumberValue */ :
            return Yt(t.integerValue || t.doubleValue);

          case 3 /* TimestampValue */ :
            return this.Zf(t.timestampValue);

          case 4 /* ServerTimestampValue */ :
            return this.td(t);

          case 5 /* StringValue */ :
            return t.stringValue;

          case 6 /* BlobValue */ :
            return new ro(Xt(t.bytesValue));

          case 7 /* RefValue */ :
            return this.ed(t.referenceValue);

          case 8 /* GeoPointValue */ :
            return this.nd(t.geoPointValue);

          case 9 /* ArrayValue */ :
            return this.sd(t.arrayValue);

          case 10 /* ObjectValue */ :
            return this.rd(t.mapValue);

          default:
            throw b();
        }
    }
    rd(t) {
        const e = {};
        return $t(t.fields || {}, (t, n) => {
            e[t] = this.Xf(n);
        }), e;
    }
    nd(t) {
        return new Eo(Yt(t.latitude), Yt(t.longitude));
    }
    sd(t) {
        return (t.values || []).map(t => this.Xf(t));
    }
    td(t) {
        switch (this.Jf) {
          case "previous":
            const e = function t(e) {
                const n = e.mapValue.fields.__previous_value__;
                return qt(n) ? t(n) : n;
            }(t);
            return null == e ? null : this.Xf(e);

          case "estimate":
            return this.Zf(Bt(t));

          default:
            return null;
        }
    }
    Zf(t) {
        const e = Jt(t), n = new L(e.seconds, e.nanos);
        return this.timestampsInSnapshots ? n : n.toDate();
    }
    ed(t) {
        const e = U.W(t);
        v(qe(e));
        const n = new G(e.get(1), e.get(3)), s = new j(e.k(5));
        return n.isEqual(this.et) || 
        // TODO(b/64130202): Somehow support foreign references.
        g(`Document ${s} contains a document reference within a different database (${n.projectId}/${n.database}) which is not supported. It will be treated as a reference in the current database (${this.et.projectId}/${this.et.database}) instead.`), 
        this.Yf(s);
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
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */ const Go = Ds.sr;

class zo {
    constructor(t, e) {
        this.hasPendingWrites = t, this.fromCache = e;
    }
    isEqual(t) {
        return this.hasPendingWrites === t.hasPendingWrites && this.fromCache === t.fromCache;
    }
}

function Ho(t, e, n, s, i, r, o) {
    let h;
    if (i.G()) {
        if ("array-contains" /* ARRAY_CONTAINS */ === r || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === r) throw new D(C.INVALID_ARGUMENT, `Invalid Query. You can't perform '${r}' queries on FieldPath.documentId().`);
        if ("in" /* IN */ === r || "not-in" /* NOT_IN */ === r) {
            Xo(o, r);
            const e = [];
            for (const n of o) e.push(Yo(s, t, n));
            h = {
                arrayValue: {
                    values: e
                }
            };
        } else h = Yo(s, t, o);
    } else "in" /* IN */ !== r && "not-in" /* NOT_IN */ !== r && "array-contains-any" /* ARRAY_CONTAINS_ANY */ !== r || Xo(o, r), 
    h = vo(n, e, o, 
    /* allowArrays= */ "in" /* IN */ === r || "not-in" /* NOT_IN */ === r);
    const a = Ln.create(i, r, h);
    return function(t, e) {
        if (e.mn()) {
            const n = t.Rn();
            if (null !== n && !n.isEqual(e.field)) throw new D(C.INVALID_ARGUMENT, `Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '${n.toString()}' and '${e.field.toString()}'`);
            const s = t.An();
            null !== s && Zo(t, e.field, s);
        }
        const n = t.Pn(
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
        throw n === e.op ? new D(C.INVALID_ARGUMENT, `Invalid query. You cannot use more than one '${e.op.toString()}' filter.`) : new D(C.INVALID_ARGUMENT, `Invalid query. You cannot use '${e.op.toString()}' filters with '${n.toString()}' filters.`);
    }(t, a), a;
}

function Jo(t, e, n) {
    if (null !== t.startAt) throw new D(C.INVALID_ARGUMENT, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
    if (null !== t.endAt) throw new D(C.INVALID_ARGUMENT, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
    const s = new Zn(e, n);
    return function(t, e) {
        if (null === t.An()) {
            // This is the first order by. It must match any inequality.
            const n = t.Rn();
            null !== n && Zo(t, n, e.field);
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
function Yo(t, e, n) {
    if ("string" == typeof n) {
        if ("" === n) throw new D(C.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");
        if (!Dn(e) && -1 !== n.indexOf("/")) throw new D(C.INVALID_ARGUMENT, `Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);
        const s = e.path.child(U.W(n));
        if (!j.Z(s)) throw new D(C.INVALID_ARGUMENT, `Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '${s}' is not because it has an odd number of segments (${s.length}).`);
        return Zt(t, new j(s));
    }
    if (n instanceof Ao) return Zt(t, n.df);
    throw new D(C.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: " + Xr(n) + ".");
}

/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */ function Xo(t, e) {
    if (!Array.isArray(t) || 0 === t.length) throw new D(C.INVALID_ARGUMENT, `Invalid Query. A non-empty array is required for '${e.toString()}' filters.`);
    if (t.length > 10) throw new D(C.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters support a maximum of 10 elements in the value array.`);
    if ("in" /* IN */ === e || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === e) {
        if (t.indexOf(null) >= 0) throw new D(C.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters cannot contain 'null' in the value array.`);
        if (t.filter(t => Number.isNaN(t)).length > 0) throw new D(C.INVALID_ARGUMENT, `Invalid Query. '${e.toString()}' filters cannot contain 'NaN' in the value array.`);
    }
}

function Zo(t, e, n) {
    if (!n.isEqual(e)) throw new D(C.INVALID_ARGUMENT, `Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '${e.toString()}' and so you must also use '${e.toString()}' as your first orderBy(), but your first orderBy() is on field '${n.toString()}' instead.`);
}

function th(t) {
    if (t.In() && 0 === t.ln.length) throw new D(C.UNIMPLEMENTED, "limitToLast() queries require specifying at least one orderBy() clause");
}

/**
 * Calculates the array of firestore.DocumentChange's for a given ViewSnapshot.
 *
 * Exported for testing.
 *
 * @param snapshot The ViewSnapshot that represents the expected state.
 * @param includeMetadataChanges Whether to include metadata changes.
 * @param converter A factory function that returns a QueryDocumentSnapshot.
 * @return An objecyt that matches the firestore.DocumentChange API.
 */ function eh(t) {
    switch (t) {
      case 0 /* Added */ :
        return "added";

      case 2 /* Modified */ :
      case 3 /* Metadata */ :
        return "modified";

      case 1 /* Removed */ :
        return "removed";

      default:
        return b();
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
 */ function nh(t, e, n) {
    let s;
    // Cast to `any` in order to satisfy the union type constraint on
    // toFirestore().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return s = t ? n && (n.merge || n.mergeFields) ? t.toFirestore(e, n) : t.toFirestore(e) : e, 
    s;
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
 */ const sh = new Map, ih = new Map;

// The components module manages the lifetime of dependencies of the Firestore
// client. Dependencies can be lazily constructed and only one exists per
// Firestore instance.
// Instance maps that ensure that only one component provider exists per
// Firestore instance.
async function rh(t, e, n) {
    const s = new _s;
    sh.set(t, s.promise);
    const i = await t.od();
    i.K_ = e, V("ComponentProvider", "Initializing OfflineComponentProvider"), await n.initialize(i), 
    t.hd(e => 
    // TODO(firestorexp): This should be a retryable IndexedDB operation
    t.ad.Ri(() => 
    // TODO(firestorexp): Make sure handleUserChange is a no-op if user
    // didn't change
    n.Ba.kh(e))), 
    // When a user calls clearPersistence() in one client, all other clients
    // need to be terminated to allow the delete to succeed.
    n.persistence.Xo(() => t.delete()), s.resolve(n);
}

async function oh(t, e) {
    const n = new _s;
    ih.set(t, n.promise);
    const s = await t.od(), i = await hh(t);
    V("ComponentProvider", "Initializing OnlineComponentProvider"), await e.initialize(i, s), 
    // The CredentialChangeListener of the online component provider takes
    // precedence over the offline component provider.
    t.hd(n => t.ad.Ri(() => e.Xu.Sc(n))), n.resolve(e);
}

function hh(t) {
    return ch(t), sh.has(t) || (V("ComponentProvider", "Using default OfflineComponentProvider"), 
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    rh(t, {
        W_: !1
    }, new qr)), sh.get(t);
}

function ah(t) {
    return ch(t), ih.has(t) || (V("ComponentProvider", "Using default OnlineComponentProvider"), 
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    oh(t, new Wr)), ih.get(t);
}

function ch(t) {
    if (t.Kf) throw new D(C.FAILED_PRECONDITION, "The client has already been terminated.");
}

function uh(t) {
    return ah(t).then(t => t.wc);
}

function lh(t) {
    return ah(t).then(t => t.Xu);
}

function _h(t) {
    return ah(t).then(t => t.H_);
}

function fh(t) {
    return hh(t).then(t => t.persistence);
}

function dh(t) {
    return hh(t).then(t => t.Ba);
}

/**
 * Removes all components associated with the provided instance. Must be called
 * when the Firestore instance is terminated.
 */
/**
 * The root reference to the Firestore database and the entry point for the
 * tree-shakeable SDK.
 */
class wh extends jo {
    constructor(t, e) {
        super(t, e), this.ad = new ps, this.ud = F.P(), this.ld = new _s, this._d = A.UNAUTHENTICATED, 
        this.fd = () => {}, this.Lf = t.name, this.Uf.R(t => {
            this._d = t, this.ld.resolve();
        });
    }
    hd(t) {
        V("Firestore", "Registering credential change listener"), this.fd = t, 
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.ld.promise.then(() => this.fd(this._d));
    }
    async od() {
        var t, e;
        const n = this.zf();
        await this.ld.promise;
        const s = new Q(this.ff, this.Lf, null !== (t = n.host) && void 0 !== t ? t : "firestore.googleapis.com", null === (e = n.ssl) || void 0 === e || e, 
        /* forceLongPolling= */ !1);
        return {
            fi: this.ad,
            g_: s,
            clientId: this.ud,
            credentials: this.Uf,
            U_: this._d,
            tl: 100,
            // Note: This will be overwritten if IndexedDB persistence is enabled.
            K_: {
                W_: !1
            }
        };
    }
    zf() {
        return super.zf();
    }
    Hf() {
        this.ad.ki();
        const t = new _s;
        return this.ad.Di(async () => {
            try {
                await super.Hf(), await async function(t) {
                    const e = ih.get(t);
                    e && (V("ComponentProvider", "Removing OnlineComponentProvider"), ih.delete(t), 
                    await (await e).terminate());
                    const n = sh.get(t);
                    n && (V("ComponentProvider", "Removing OfflineComponentProvider"), sh.delete(t), 
                    await (await n).terminate());
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
 */ (this), 
                // `removeChangeListener` must be called after shutting down the
                // RemoteStore as it will prevent the RemoteStore from retrieving
                // auth tokens.
                this.Uf.m(), t.resolve();
            } catch (e) {
                const n = bs(e, "Failed to shutdown persistence");
                t.reject(n);
            }
        }), t.promise;
    }
}

function Th(e, n) {
    const s = t(e, "firestore-exp").getImmediate();
    if (void 0 !== n.cacheSizeBytes && n.cacheSizeBytes !== Go && n.cacheSizeBytes < Ds.ir) throw new D(C.INVALID_ARGUMENT, "cacheSizeBytes must be at least " + Ds.ir);
    return s.Qf(n), s;
}

function Eh(e) {
    return t(e, "firestore-exp").getImmediate();
}

function Ih(t) {
    const e = bn(t, wh);
    yh(e);
    // `_getSettings()` freezes the client settings and prevents further changes
    // to the components (as `verifyNotInitialized()` would fail). Components can
    // then be accessed via `getOfflineComponentProvider()` and
    // `getOnlineComponentProvider()`
    const n = e.zf();
    // TODO(firestoreexp): Add forceOwningTab
        return rh(e, {
        W_: !0,
        synchronizeTabs: !1,
        cacheSizeBytes: n.cacheSizeBytes || Ds.rr,
        Fo: !1
    }, new Br);
}

function Ah(t) {
    const e = bn(t, wh);
    yh(e);
    // `_getSettings()` freezes the client settings and prevents further changes
    // to the components (as `verifyNotInitialized()` would fail). Components can
    // then be accessed via `getOfflineComponentProvider()` and
    // `getOnlineComponentProvider()`
    const n = e.zf(), s = new Wr, i = new Ur(s);
    return rh(e, {
        W_: !0,
        synchronizeTabs: !0,
        cacheSizeBytes: n.cacheSizeBytes || Ds.rr,
        Fo: !1
    }, i).then(() => oh(e, s));
}

function Rh(t) {
    const e = bn(t, wh);
    if (e.Wf && !e.Kf) throw new D(C.FAILED_PRECONDITION, "Persistence can only be cleared before a Firestore instance is initialized or after it is terminated.");
    const n = new _s;
    return e.ad.Di(async () => {
        try {
            await Li($i(e.ff, e.Lf)), n.resolve();
        } catch (t) {
            n.reject(t);
        }
    }), n.promise;
}

function mh(t) {
    const e = bn(t, wh);
    return uh(e).then(t => function(t, e) {
        const n = new _s;
        return t.Ri(() => e.Vl(n)), n.promise;
    }(e.ad, t));
}

function Ph(t) {
    const e = bn(t, wh);
    return Promise.all([ lh(e), fh(e) ]).then(([t, n]) => qo(e.ad, t, n, 
    /* enabled= */ !0));
}

function Vh(t) {
    const e = bn(t, wh);
    return Promise.all([ lh(e), fh(e) ]).then(([t, n]) => qo(e.ad, t, n, 
    /* enabled= */ !1));
}

function gh(t) {
    e(t.app, "firestore-exp");
    return bn(t, wh).delete();
}

function yh(t) {
    if (t.Wf) throw new D(C.FAILED_PRECONDITION, "Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other methods on a Firestore object.");
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
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */
class ph extends oo {
    // Note: This class is stripped down a copy of the FieldPath class in the
    // legacy SDK. The changes are:
    // - The `documentId()` static method has been removed
    // - Input validation is limited to errors that cannot be caught by the
    //   TypeScript transpiler.
    /**
     * Creates a FieldPath from the provided field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     *
     * @param fieldNames A list of field names.
     */
    constructor(...t) {
        super(t);
    }
    isEqual(t) {
        const e = bn(t, ph);
        return this.tf.isEqual(e.tf);
    }
}

function bh() {
    return new ph("__name__");
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
 * A reference to a particular document in a collection in the database.
 */ class vh extends Ao {
    constructor(t, e, n) {
        super(t.ff, new j(n), e), this.firestore = t, this.converter = e, this.dd = n, this.type = "document";
    }
    get id() {
        return this.dd.M();
    }
    get path() {
        return this.dd.U();
    }
    withConverter(t) {
        return new vh(this.firestore, t, this.dd);
    }
}

class Sh {
    // This is the lite version of the Query class in the main SDK.
    constructor(t, e, n) {
        this.firestore = t, this.converter = e, this.wd = n, this.type = "query";
    }
    withConverter(t) {
        return new Sh(this.firestore, t, this.wd);
    }
}

class Ch {}

function Dh(t, ...e) {
    let n = bn(t, Sh);
    for (const t of e) n = t.apply(n);
    return n;
}

class Nh extends Ch {
    constructor(t, e, n) {
        super(), this.Td = t, this.Ed = e, this.Id = n, this.type = "where";
    }
    apply(t) {
        const e = Zh(t.firestore), n = Ho(t.wd, "where", e, t.firestore.ff, this.Td, this.Ed, this.Id);
        return new Sh(t.firestore, t.converter, function(t, e) {
            const n = t.filters.concat([ e ]);
            return new vn(t.path, t.collectionGroup, t.ln.slice(), n, t.limit, t._n, t.startAt, t.endAt);
        }(t.wd, n));
    }
}

function xh(t, e, n) {
    // TODO(firestorelite): Consider validating the enum strings (note that
    // TypeScript does not support passing invalid values).
    const s = e, i = na("where", t);
    return new Nh(i, s, n);
}

class kh extends Ch {
    constructor(t, e) {
        super(), this.Td = t, this.Ad = e, this.type = "orderBy";
    }
    apply(t) {
        const e = Jo(t.wd, this.Td, this.Ad);
        return new Sh(t.firestore, t.converter, function(t, e) {
            // TODO(dimond): validate that orderBy does not list the same key twice.
            const n = t.ln.concat([ e ]);
            return new vn(t.path, t.collectionGroup, n, t.filters.slice(), t.limit, t._n, t.startAt, t.endAt);
        }(t.wd, e));
    }
}

function Fh(t, e = "asc") {
    // TODO(firestorelite): Consider validating the enum strings (note that
    // TypeScript does not support passing invalid values).
    const n = e, s = na("orderBy", t);
    return new kh(s, n);
}

class Oh extends Ch {
    constructor(t, e, n) {
        super(), this.type = t, this.Rd = e, this.md = n;
    }
    apply(t) {
        return new Sh(t.firestore, t.converter, function(t, e, n) {
            return new vn(t.path, t.collectionGroup, t.ln.slice(), t.filters.slice(), e, n, t.startAt, t.endAt);
        }(t.wd, this.Rd, this.md));
    }
}

function Mh(t) {
    return to("limit", 1, t), new Oh("limit", t, "F" /* First */);
}

function $h(t) {
    return to("limitToLast", 1, t), new Oh("limitToLast", t, "L" /* Last */);
}

class Lh extends Ch {
    constructor(t, e, n) {
        super(), this.type = t, this.Pd = e, this.Vd = n;
    }
    apply(t) {
        const e = jh(t, this.type, this.Pd, this.Vd);
        return new Sh(t.firestore, t.converter, function(t, e) {
            return new vn(t.path, t.collectionGroup, t.ln.slice(), t.filters.slice(), t.limit, t._n, e, t.endAt);
        }(t.wd, e));
    }
}

function qh(...t) {
    return new Lh("startAt", t, /*before=*/ !0);
}

function Bh(...t) {
    return new Lh("startAfter", t, 
    /*before=*/ !1);
}

class Uh extends Ch {
    constructor(t, e, n) {
        super(), this.type = t, this.Pd = e, this.Vd = n;
    }
    apply(t) {
        const e = jh(t, this.type, this.Pd, this.Vd);
        return new Sh(t.firestore, t.converter, function(t, e) {
            return new vn(t.path, t.collectionGroup, t.ln.slice(), t.filters.slice(), t.limit, t._n, t.startAt, e);
        }(t.wd, e));
    }
}

function Wh(...t) {
    return new Uh("endBefore", t, /*before=*/ !0);
}

function Kh(...t) {
    return new Uh("endAt", t, /*before=*/ !1);
}

/** Helper function to create a bound from a document or fields */ function jh(t, e, n, s) {
    if (n[0] instanceof ta) return Qr(e, n, 1), function(t, e, n, s, i) {
        if (!s) throw new D(C.NOT_FOUND, "Can't use a DocumentSnapshot that doesn't exist for " + n + "().");
        const r = [];
        // Because people expect to continue/end a query at the exact document
        // provided, we need to use the implicit sort order rather than the explicit
        // sort order, because it's guaranteed to contain the document key. That way
        // the position becomes unambiguous and the query continues/ends exactly at
        // the provided document. Without the key (by using the explicit sort
        // orders), multiple documents could match the position, yielding duplicate
        // results.
                for (const n of Nn(t)) if (n.field.G()) r.push(Zt(e, s.key)); else {
            const t = s.field(n.field);
            if (qt(t)) throw new D(C.INVALID_ARGUMENT, 'Invalid query. You are trying to start or end a query using a document for which the field "' + n.field + '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');
            if (null === t) {
                const t = n.field.U();
                throw new D(C.INVALID_ARGUMENT, `Invalid query. You are trying to start or end a query using a document for which the field '${t}' (used as the orderBy) does not exist.`);
            }
            r.push(t);
        }
        return new Hn(r, i);
    }
    /**
 * Converts a list of field values to a Bound for the given query.
 */ (t.wd, t.firestore.ff, e, n[0].gd, s);
    {
        const i = Zh(t.firestore);
        return function(t, e, n, s, i, r) {
            // Use explicit order by's because it has to match the query the user made
            const o = t.ln;
            if (i.length > o.length) throw new D(C.INVALID_ARGUMENT, `Too many arguments provided to ${s}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);
            const h = [];
            for (let r = 0; r < i.length; r++) {
                const a = i[r];
                if (o[r].field.G()) {
                    if ("string" != typeof a) throw new D(C.INVALID_ARGUMENT, `Invalid query. Expected a string for document ID in ${s}(), but got a ${typeof a}`);
                    if (!Dn(t) && -1 !== a.indexOf("/")) throw new D(C.INVALID_ARGUMENT, `Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to ${s}() must be a plain document ID, but '${a}' contains a slash.`);
                    const n = t.path.child(U.W(a));
                    if (!j.Z(n)) throw new D(C.INVALID_ARGUMENT, `Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to ${s}() must result in a valid document path, but '${n}' is not because it contains an odd number of segments.`);
                    const i = new j(n);
                    h.push(Zt(e, i));
                } else {
                    const t = vo(n, s, a);
                    h.push(t);
                }
            }
            return new Hn(h, r);
        }(t.wd, t.firestore.ff, i, e, n, s);
    }
}

class Qh extends Sh {
    constructor(t, e, n) {
        super(t, n, Cn(e)), this.firestore = t, this.dd = e, this.type = "collection";
    }
    get id() {
        return this.wd.path.M();
    }
    get path() {
        return this.wd.path.U();
    }
    withConverter(t) {
        return new Qh(this.firestore, this.dd, t);
    }
}

function Gh(t, e) {
    if (zr("collection", "non-empty string", 2, e), t instanceof jo) {
        const n = U.W(e);
        return Jr(n), new Qh(t, n, /* converter= */ null);
    }
    {
        if (!(t instanceof vh || t instanceof Qh)) throw new D(C.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
        const n = U.W(t.path).child(U.W(e));
        return Jr(n), new Qh(t.firestore, n, 
        /* converter= */ null);
    }
}

// TODO(firestorelite): Consider using ErrorFactory -
// https://github.com/firebase/firebase-js-sdk/blob/0131e1f/packages/util/src/errors.ts#L106
function zh(t, e) {
    const n = bn(t, jo);
    if (zr("collectionGroup", "non-empty string", 1, e), e.indexOf("/") >= 0) throw new D(C.INVALID_ARGUMENT, `Invalid collection ID '${e}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);
    return new Sh(n, 
    /* converter= */ null, function(t) {
        return new vn(U.K(), t);
    }(e));
}

function Hh(t, e) {
    if (
    // We allow omission of 'pathString' but explicitly prohibit passing in both
    // 'undefined' and 'null'.
    1 === arguments.length && (e = F.P()), zr("doc", "non-empty string", 2, e), t instanceof jo) {
        const n = U.W(e);
        return Hr(n), new vh(t, /* converter= */ null, n);
    }
    {
        if (!(t instanceof vh || t instanceof Qh)) throw new D(C.INVALID_ARGUMENT, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
        const n = t.dd.child(U.W(e));
        return Hr(n), new vh(t.firestore, t instanceof Qh ? t.converter : null, n);
    }
}

function Jh(t) {
    if (t instanceof Qh) {
        const e = t.dd.F();
        return e.$() ? null : new vh(t.firestore, 
        /* converter= */ null, e);
    }
    {
        const e = bn(t, vh);
        return new Qh(e.firestore, e.df.path.F(), e.wf);
    }
}

function Yh(t, e) {
    return (t instanceof vh || t instanceof Qh) && (e instanceof vh || e instanceof Qh) && (t.firestore === e.firestore && t.path === e.path && t.converter === e.converter);
}

function Xh(t, e) {
    return t instanceof Sh && e instanceof Sh && (t.firestore === e.firestore && kn(t.wd, e.wd) && t.converter === e.converter);
}

function Zh(t) {
    const e = t.zf(), n = $r(t.ff);
    return new go(t.ff, !!e.ignoreUndefinedProperties, n);
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
 */ class ta {
    // Note: This class is stripped down version of the DocumentSnapshot in
    // the legacy SDK. The changes are:
    // - No support for SnapshotMetadata.
    // - No support for SnapshotOptions.
    constructor(t, e, n, s) {
        this.yd = t, this.df = e, this.gd = n, this.wf = s;
    }
    get id() {
        return this.df.path.M();
    }
    get ref() {
        return new vh(this.yd, this.wf, this.df.path);
    }
    exists() {
        return null !== this.gd;
    }
    data() {
        if (this.gd) {
            if (this.wf) {
                // We only want to use the converter and create a new DocumentSnapshot
                // if a converter has been provided.
                const t = new ea(this.yd, this.df, this.gd, 
                /* converter= */ null);
                return this.wf.fromFirestore(t);
            }
            return new Qo(this.yd.ff, 
            /* timestampsInSnapshots= */ !0, 
            /* serverTimestampBehavior=*/ "none", t => new vh(this.yd, 
            /* converter= */ null, t.path)).Xf(this.gd.un());
        }
    }
    get(t) {
        if (this.gd) {
            const e = this.gd.data().field(na("DocumentSnapshot.get", t));
            if (null !== e) {
                return new Qo(this.yd.ff, 
                /* timestampsInSnapshots= */ !0, 
                /* serverTimestampBehavior=*/ "none", t => new vh(this.yd, this.wf, t.path)).Xf(e);
            }
        }
    }
}

class ea extends ta {
    data() {
        return super.data();
    }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */ function na(t, e) {
    if ("string" == typeof e) return ko(t, e);
    return bn(e, ph).tf;
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
 */ class sa extends ta {
    constructor(t, e, n, s, i) {
        super(t, e, n, i), this.yd = t, this.metadata = s, this.pd = bn(t, wh);
    }
    exists() {
        return super.exists();
    }
    data(t) {
        if (this.gd) {
            if (this.wf) {
                // We only want to use the converter and create a new DocumentSnapshot
                // if a converter has been provided.
                const e = new ia(this.yd, this.df, this.gd, this.metadata, 
                /* converter= */ null);
                return this.wf.fromFirestore(e, t);
            }
            return new Qo(this.pd.ff, 
            /* timestampsInSnapshots= */ !0, (null == t ? void 0 : t.serverTimestamps) || "none", t => new vh(this.yd, 
            /* converter= */ null, t.path)).Xf(this.gd.un());
        }
    }
    get(t, e = {}) {
        if (this.gd) {
            const n = this.gd.data().field(na("DocumentSnapshot.get", t));
            if (null !== n) {
                return new Qo(this.pd.ff, 
                /* timestampsInSnapshots= */ !0, e.serverTimestamps || "none", t => new vh(this.yd, this.wf, t.path)).Xf(n);
            }
        }
    }
}

class ia extends sa {
    data(t = {}) {
        return super.data(t);
    }
}

class ra {
    constructor(t, e, n) {
        this.yd = t, this.query = e, this.bd = n, this.metadata = new zo(n.hasPendingWrites, n.fromCache);
    }
    get docs() {
        const t = [];
        return this.forEach(e => t.push(e)), t;
    }
    get size() {
        return this.bd.docs.size;
    }
    get empty() {
        return 0 === this.size;
    }
    forEach(t, e) {
        this.bd.docs.forEach(n => {
            t.call(e, this.vd(n, this.bd.fromCache, this.bd.Ht.has(n.key)));
        });
    }
    docChanges(t = {}) {
        const e = !!t.includeMetadataChanges;
        if (e && this.bd.Yt) throw new D(C.INVALID_ARGUMENT, "To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");
        return this.Sd && this.Cd === e || (this.Sd = function(t, e, n) {
            if (t.zt.$()) {
                // Special case the first snapshot because index calculation is easy and
                // fast
                let e, s = 0;
                return t.docChanges.map(i => {
                    const r = n(i.doc, t.fromCache, t.Ht.has(i.doc.key));
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
                let s = t.zt;
                return t.docChanges.filter(t => e || 3 /* Metadata */ !== t.type).map(e => {
                    const i = n(e.doc, t.fromCache, t.Ht.has(e.doc.key));
                    let r = -1, o = -1;
                    return 0 /* Added */ !== e.type && (r = s.indexOf(e.doc.key), s = s.delete(e.doc.key)), 
                    1 /* Removed */ !== e.type && (s = s.add(e.doc), o = s.indexOf(e.doc.key)), {
                        type: eh(e.type),
                        doc: i,
                        oldIndex: r,
                        newIndex: o
                    };
                });
            }
        }(this.bd, e, this.vd.bind(this)), this.Cd = e), this.Sd;
    }
    vd(t, e, n) {
        return new ia(this.yd, t.key, t, new zo(n, e), this.query.converter);
    }
}

// TODO(firestoreexp): Add tests for snapshotEqual with different snapshot
// metadata
function oa(t, e) {
    return t instanceof sa && e instanceof sa ? t.yd === e.yd && t.df.isEqual(e.df) && (null === t.gd ? null === e.gd : t.gd.isEqual(e.gd)) && t.wf === e.wf : t instanceof ra && e instanceof ra && (t.yd === e.yd && Xh(t.query, e.query) && t.metadata.isEqual(e.metadata) && t.bd.isEqual(e.bd));
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
 */ class ha {
    constructor(t, e) {
        this.yd = t, this.Dd = e, this.Nd = [], this.xd = !1, this.kd = Zh(t);
    }
    set(t, e, n) {
        this.Fd();
        const s = aa(t, this.yd), i = nh(s.wf, e, n), r = yo(this.kd, "WriteBatch.set", s.df, i, null !== s.wf, n);
        return this.Nd = this.Nd.concat(r.Tf(s.df, sn.Ze())), this;
    }
    update(t, e, n, ...s) {
        this.Fd();
        const i = aa(t, this.yd);
        let r;
        return r = "string" == typeof e || e instanceof ph ? bo(this.kd, "WriteBatch.update", i.df, e, n, s) : po(this.kd, "WriteBatch.update", i.df, e), 
        this.Nd = this.Nd.concat(r.Tf(i.df, sn.exists(!0))), this;
    }
    delete(t) {
        this.Fd();
        const e = aa(t, this.yd);
        return this.Nd = this.Nd.concat(new In(e.df, sn.Ze())), this;
    }
    commit() {
        return this.Fd(), this.xd = !0, this.Nd.length > 0 ? this.Dd(this.Nd) : Promise.resolve();
    }
    Fd() {
        if (this.xd) throw new D(C.FAILED_PRECONDITION, "A write batch can no longer be used after commit() has been called.");
    }
}

function aa(t, e) {
    if (t.firestore !== e) throw new D(C.INVALID_ARGUMENT, "Provided document reference is from a different Firestore instance.");
    return bn(t, vh);
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
// TODO(mrschmidt) Consider using `BaseTransaction` as the base class in the
// legacy SDK.
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
class ca extends class {
    constructor(t, e) {
        this.yd = t, this.Od = e, this.kd = Zh(t);
    }
    get(t) {
        const e = aa(t, this.yd);
        return this.Od.Sf([ e.df ]).then(t => {
            if (!t || 1 !== t.length) return b();
            const n = t[0];
            if (n instanceof yn) return new ta(this.yd, e.df, null, e.wf);
            if (n instanceof gn) return new ta(this.yd, n.key, n, e.wf);
            throw b();
        });
    }
    set(t, e, n) {
        const s = aa(t, this.yd), i = nh(s.wf, e, n), r = yo(this.kd, "Transaction.set", s.df, i, null !== s.wf, n);
        return this.Od.set(s.df, r), this;
    }
    update(t, e, n, ...s) {
        const i = aa(t, this.yd);
        let r;
        return r = "string" == typeof e || e instanceof ph ? bo(this.kd, "Transaction.update", i.df, e, n, s) : po(this.kd, "Transaction.update", i.df, e), 
        this.Od.update(i.df, r), this;
    }
    delete(t) {
        const e = aa(t, this.yd);
        return this.Od.delete(e.df), this;
    }
} {
    // This class implements the same logic as the Transaction API in the Lite SDK
    // but is subclassed in order to return its own DocumentSnapshot types.
    constructor(t, e) {
        super(t, e), this.yd = t;
    }
    get(t) {
        const e = aa(t, this.yd);
        return super.get(t).then(t => new sa(this.yd, e.df, t.gd, new zo(
        /* hasPendingWrites= */ !1, 
        /* fromCache= */ !1), e.wf));
    }
}

function ua(t, e) {
    const n = bn(t, wh), s = 
    /**
 * Returns an initialized and started Datastore for the given Firestore
 * instance. Callers must invoke removeDatastore() when the Firestore
 * instance is terminated.
 */
    function(t) {
        var e, n;
        if (t.Kf) throw new D(C.FAILED_PRECONDITION, "The client has already been terminated.");
        if (!Ko.has(t)) {
            V("ComponentProvider", "Initializing Datastore");
            const s = t.zf(), i = new Q(t.ff, t.Lf, null !== (e = s.host) && void 0 !== e ? e : "firestore.googleapis.com", null === (n = s.ssl) || void 0 === n || n, 
            /* forceLongPolling= */ !1), r = Mr(i), o = $r(i.et), h = Gi(t.Uf, r, o);
            Ko.set(t, h);
        }
        return Ko.get(t);
    }(n), i = new _s;
    return new $o(new ps, s, t => e(new ca(n, t)), i).kf(), i.promise;
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
 */ function la(t) {
    const e = bn(t, vh), n = bn(e.firestore, wh);
    return _h(n).then(t => Uo(n.ad, t, e.df).then(t => Va(n, e, t)));
}

function _a(t) {
    const e = bn(t, vh), n = bn(e.firestore, wh);
    return dh(n).then(t => async function(t, e, n) {
        const s = new _s;
        return await t.enqueue(async () => {
            try {
                const t = await e.Gh(n);
                t instanceof gn ? s.resolve(t) : t instanceof yn ? s.resolve(null) : s.reject(new D(C.UNAVAILABLE, "Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)"));
            } catch (t) {
                const e = bs(t, `Failed to get document '${n} from cache`);
                s.reject(e);
            }
        }), s.promise;
    }(n.ad, t, e.df).then(t => new sa(n, e.df, t, new zo(t instanceof gn && t.nn, 
    /* fromCache= */ !0), e.wf)));
}

function fa(t) {
    const e = bn(t, vh), n = bn(e.firestore, wh);
    return _h(n).then(t => Uo(n.ad, t, e.df, {
        source: "server"
    }).then(t => Va(n, e, t)));
}

function da(t) {
    const e = bn(t, Sh), n = bn(t.firestore, wh);
    return th(e.wd), _h(n).then(t => Wo(n.ad, t, e.wd).then(t => new ra(n, e, t)));
}

function wa(t) {
    const e = bn(t, Sh), n = bn(t.firestore, wh);
    return dh(n).then(t => async function(t, e, n) {
        const s = new _s;
        return await t.enqueue(async () => {
            try {
                const t = await e.Jh(n, 
                /* usePreviousResults= */ !0), i = new ur(n, t.Yh), r = i.qu(t.documents), o = i.ts(r, 
                /* updateLimboDocuments= */ !1);
                s.resolve(o.snapshot);
            } catch (t) {
                const e = bs(t, `Failed to execute query '${n} against cache`);
                s.reject(e);
            }
        }), s.promise;
    }(n.ad, t, e.wd).then(t => new ra(n, e, t)));
}

function Ta(t) {
    const e = bn(t, Sh), n = bn(t.firestore, wh);
    return _h(n).then(t => Wo(n.ad, t, e.wd, {
        source: "server"
    }).then(t => new ra(n, e, t)));
}

function Ea(t, e, n) {
    const s = bn(t, vh), i = bn(s.firestore, wh), r = nh(s.wf, e, n), o = yo(Zh(i), "setDoc", s.df, r, null !== s.wf, n);
    return uh(i).then(t => Lo(i.ad, t, o.Tf(s.df, sn.Ze())));
}

function Ia(t, e, n, ...s) {
    const i = bn(t, vh), r = bn(i.firestore, wh), o = Zh(r);
    let h;
    return h = "string" == typeof e || e instanceof ph ? bo(o, "updateDoc", i.df, e, n, s) : po(o, "updateDoc", i.df, e), 
    uh(r).then(t => Lo(r.ad, t, h.Tf(i.df, sn.exists(!0))));
}

function Aa(t) {
    const e = bn(t, vh), n = bn(e.firestore, wh);
    return uh(n).then(t => Lo(n.ad, t, [ new In(e.df, sn.Ze()) ]));
}

function Ra(t, e) {
    const n = bn(t, Qh), s = bn(n.firestore, wh), i = Hh(n), r = nh(n.converter, e), o = yo(Zh(n.firestore), "addDoc", i.df, r, null !== n.converter, {});
    return uh(s).then(t => Lo(s.ad, t, o.Tf(i.df, sn.exists(!1)))).then(() => i);
}

function ma(t, ...e) {
    var n, s, i;
    let r = {
        includeMetadataChanges: !1
    }, o = 0;
    "object" != typeof e[o] || Kr(e[o]) || (r = e[o], o++);
    const h = {
        includeMetadataChanges: r.includeMetadataChanges
    };
    if (Kr(e[o])) {
        const t = e[o];
        e[o] = null === (n = t.next) || void 0 === n ? void 0 : n.bind(t), e[o + 1] = null === (s = t.error) || void 0 === s ? void 0 : s.bind(t), 
        e[o + 2] = null === (i = t.complete) || void 0 === i ? void 0 : i.bind(t);
    }
    let a;
    if (t instanceof vh) {
        const n = bn(t.firestore, wh), s = {
            next: s => {
                e[o] && e[o](Va(n, t, s));
            },
            error: e[o + 1],
            complete: e[o + 2]
        };
        a = _h(n).then(e => Bo(n.ad, e, Cn(t.df.path), h, s));
    } else {
        const n = bn(t, Sh), s = bn(n.firestore, wh), i = {
            next: t => {
                e[o] && e[o](new ra(s, n, t));
            },
            error: e[o + 1],
            complete: e[o + 2]
        };
        th(n.wd), a = _h(s).then(t => Bo(s.ad, t, n.wd, h, i));
    }
    // TODO(firestorexp): Add test that verifies that we don't raise a snapshot if
    // unsubscribe is called before `asyncObserver` resolves.
        return () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        a.then(t => t());
    };
}

function Pa(t, e) {
    const n = bn(t, wh), s = Kr(e) ? e : {
        next: e
    }, i = _h(n).then(t => function(t, e, n) {
        const s = new jr(n);
        return t.Ri(async () => e.Ol(s)), () => {
            s.X_(), t.Ri(async () => e.Ml(s));
        };
    }(n.ad, t, s));
    // TODO(firestorexp): Add test that verifies that we don't raise a snapshot if
    // unsubscribe is called before `asyncObserver` resolves.
    return () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        i.then(t => t());
    };
}

/**
 * Converts a ViewSnapshot that contains the single document specified by `ref`
 * to a DocumentSnapshot.
 */ function Va(t, e, n) {
    const s = n.docs.get(e.df);
    return new sa(t, e.df, s, new zo(n.hasPendingWrites, n.fromCache), e.wf);
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
/** The public FieldValue class of the lite API. */ class ga extends co {}

/**
 * A delegate class that allows the FieldValue implementations returned by
 * deleteField(), serverTimestamp(), arrayUnion(), arrayRemove() and
 * increment() to be an instance of the lite FieldValue class declared above.
 *
 * We don't directly subclass `FieldValue` in the various field value
 * implementations as the base FieldValue class differs between the lite, full
 * and legacy SDK.
 */ class ya extends ga {
    constructor(t) {
        super(), this.ef = t, this.nf = t.nf;
    }
    sf(t) {
        return this.ef.sf(t);
    }
    isEqual(t) {
        return t instanceof ya && this.ef.isEqual(t.ef);
    }
}

function pa() {
    return new ya(new uo("deleteField"));
}

function ba() {
    return new ya(new _o("serverTimestamp"));
}

function va(...t) {
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we'd need the Firestore instance to do this.
    return Gr("arrayUnion()", arguments, 1), new ya(new fo("arrayUnion", t));
}

function Sa(...t) {
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we'd need the Firestore instance to do this.
    return Gr("arrayRemove()", arguments, 1), new ya(new wo("arrayRemove", t));
}

function Ca(t) {
    return new ya(new To("increment", t));
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
 */ function Da(t) {
    const e = bn(t, wh);
    return new ha(e, t => uh(e).then(n => Lo(e.ad, n, t)));
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
 */ n(new i("firestore-exp", t => ((t, e) => new wh(t, e))(t.getProvider("app-exp").getImmediate(), t.getProvider("auth-internal")), "PUBLIC" /* PUBLIC */)), 
s("firestore-exp", "1.16.3", "node");

export { ro as Blob, Qh as CollectionReference, vh as DocumentReference, sa as DocumentSnapshot, ph as FieldPath, ga as FieldValue, wh as FirebaseFirestore, Eo as GeoPoint, Sh as Query, Ch as QueryConstraint, ia as QueryDocumentSnapshot, ra as QuerySnapshot, zo as SnapshotMetadata, L as Timestamp, ca as Transaction, ha as WriteBatch, Ra as addDoc, Sa as arrayRemove, va as arrayUnion, Rh as clearIndexedDbPersistence, Gh as collection, zh as collectionGroup, Aa as deleteDoc, pa as deleteField, Vh as disableNetwork, Hh as doc, bh as documentId, Ih as enableIndexedDbPersistence, Ah as enableMultiTabIndexedDbPersistence, Ph as enableNetwork, Kh as endAt, Wh as endBefore, la as getDoc, _a as getDocFromCache, fa as getDocFromServer, da as getDocs, wa as getDocsFromCache, Ta as getDocsFromServer, Eh as getFirestore, Ca as increment, Th as initializeFirestore, Mh as limit, $h as limitToLast, ma as onSnapshot, Pa as onSnapshotsInSync, Fh as orderBy, Jh as parent, Dh as query, Xh as queryEqual, Yh as refEqual, ua as runTransaction, ba as serverTimestamp, Ea as setDoc, P as setLogLevel, oa as snapshotEqual, Bh as startAfter, qh as startAt, gh as terminate, Ia as updateDoc, mh as waitForPendingWrites, xh as where, Da as writeBatch };
//# sourceMappingURL=index.browser.esm2017.js.map
