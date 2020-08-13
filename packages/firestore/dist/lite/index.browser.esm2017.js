import { _getProvider as t, _removeServiceInstance as n, _registerComponent as e, registerVersion as r } from "@firebase/app";

import { Component as s } from "@firebase/component";

import { Logger as i, LogLevel as o } from "@firebase/logger";

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ const u = "ok", a = "cancelled", c = "unknown", h = "invalid-argument", l = "deadline-exceeded", f = "not-found", d = "already-exists", _ = "permission-denied", w = "unauthenticated", m = "resource-exhausted", p = "failed-precondition", y = "aborted", E = "out-of-range", I = "unimplemented", A = "internal", T = "unavailable", P = "data-loss";

/**
 * An error class used for Firestore-generated errors. Ideally we should be
 * using FirebaseError, but integrating with it is overly arduous at the moment,
 * so we define our own compatible error class (with a `name` of 'FirebaseError'
 * and compatible `code` and `message` fields.)
 */ class R extends Error {
    constructor(t, n) {
        super(n), this.code = t, this.message = n, this.name = "FirebaseError", 
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
const V = new i("@firebase/firestore");

function b(t) {
    V.setLogLevel(t);
}

function g(t, ...n) {
    if (V.logLevel <= o.DEBUG) {
        const e = n.map(N);
        V.debug("Firestore (7.17.2): " + t, ...e);
    }
}

function v(t, ...n) {
    if (V.logLevel <= o.ERROR) {
        const e = n.map(N);
        V.error("Firestore (7.17.2): " + t, ...e);
    }
}

/**
 * Converts an additional log parameter to a string representation.
 */
function N(t) {
    if ("string" == typeof t) return t;
    try {
        return n = t, JSON.stringify(n);
    } catch (n) {
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
    var n;
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
 */ function F(t = "Unexpected state") {
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
    const n = "FIRESTORE (7.17.2) INTERNAL ASSERTION FAILED: " + t;
    // NOTE: We don't use FirestoreError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
    throw v(n), new Error(n);
}

/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * Messages are stripped in production builds.
 */ function $(t, n) {
    t || F();
}

/**
 * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
 * instance of `T` before casting.
 */ function D(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
n) {
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
 */ function q(t) {
    // Polyfills for IE and WebWorker by using `self` and `msCrypto` when `crypto` is not available.
    const n = 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "undefined" != typeof self && (self.crypto || self.msCrypto), e = new Uint8Array(t);
    if (n) n.getRandomValues(e); else 
    // Falls back to Math.random
    for (let n = 0; n < t; n++) e[n] = Math.floor(256 * Math.random());
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
 */ class x {
    static t() {
        // Alphanumeric characters
        const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", n = Math.floor(256 / t.length) * t.length;
        // The largest byte value that is a multiple of `char.length`.
                let e = "";
        for (;e.length < 20; ) {
            const r = q(40);
            for (let s = 0; s < r.length; ++s) 
            // Only accept values that are [0, maxMultiple), this ensures they can
            // be evenly mapped to indices of `chars` via a modulo operation.
            e.length < 20 && r[s] < n && (e += t.charAt(r[s] % t.length));
        }
        return e;
    }
}

function S(t, n) {
    return t < n ? -1 : t > n ? 1 : 0;
}

/** Helper to compare arrays using isEqual(). */ function O(t, n, e) {
    return t.length === n.length && t.every((t, r) => e(t, n[r]));
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
    constructor(t, n, e, r, s) {
        this.s = t, this.persistenceKey = n, this.host = e, this.ssl = r, this.forceLongPolling = s;
    }
}

/** The default database name for a project. */
/** Represents the database ID a Firestore client is associated with. */
class U {
    constructor(t, n) {
        this.projectId = t, this.database = n || "(default)";
    }
    get i() {
        return "(default)" === this.database;
    }
    isEqual(t) {
        return t instanceof U && t.projectId === this.projectId && t.database === this.database;
    }
    o(t) {
        return S(this.projectId, t.projectId) || S(this.database, t.database);
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
 */ class L {
    constructor(t) {
        this.uid = t;
    }
    u() {
        return null != this.uid;
    }
    /**
     * Returns a key representing this user, suitable for inclusion in a
     * dictionary.
     */    h() {
        return this.u() ? "uid:" + this.uid : "anonymous-user";
    }
    isEqual(t) {
        return t.uid === this.uid;
    }
}

/** A user with a null UID. */ L.UNAUTHENTICATED = new L(null), 
// TODO(mikelehen): Look into getting a proper uid-equivalent for
// non-FirebaseAuth providers.
L.l = new L("google-credentials-uid"), L._ = new L("first-party-uid");

/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class B {
    constructor(t, n) {
        this.user = n, this.type = "OAuth", this.m = {}, 
        // Set the headers using Object Literal notation to avoid minification
        this.m.Authorization = "Bearer " + t;
    }
}

class M {
    constructor(t) {
        /**
         * The auth token listener registered with FirebaseApp, retained here so we
         * can unregister it.
         */
        this.p = null, 
        /** Tracks the current User. */
        this.currentUser = L.UNAUTHENTICATED, this.I = !1, 
        /**
         * Counter used to detect if the token changed while a getToken request was
         * outstanding.
         */
        this.A = 0, 
        /** The listener registered with setChangeListener(). */
        this.T = null, this.forceRefresh = !1, this.p = () => {
            this.A++, this.currentUser = this.P(), this.I = !0, this.T && this.T(this.currentUser);
        }, this.A = 0, this.auth = t.getImmediate({
            optional: !0
        }), this.auth ? this.auth.addAuthTokenListener(this.p) : (
        // if auth is not available, invoke tokenListener once with null token
        this.p(null), t.get().then(t => {
            this.auth = t, this.p && 
            // tokenListener can be removed by removeChangeListener()
            this.auth.addAuthTokenListener(this.p);
        }, () => {}));
    }
    getToken() {
        // Take note of the current value of the tokenCounter so that this method
        // can fail (with an ABORTED error) if there is a token change while the
        // request is outstanding.
        const t = this.A, n = this.forceRefresh;
        return this.forceRefresh = !1, this.auth ? this.auth.getToken(n).then(n => 
        // Cancel the request since the token changed while the request was
        // outstanding so the response is potentially for a previous user (which
        // user, we can't be sure).
        this.A !== t ? (g("FirebaseCredentialsProvider", "getToken aborted due to token change."), 
        this.getToken()) : n ? ($("string" == typeof n.accessToken), new B(n.accessToken, this.currentUser)) : null) : Promise.resolve(null);
    }
    R() {
        this.forceRefresh = !0;
    }
    V(t) {
        this.T = t, 
        // Fire the initial event
        this.I && t(this.currentUser);
    }
    g() {
        this.auth && this.auth.removeAuthTokenListener(this.p), this.p = null, this.T = null;
    }
    // Auth.getUid() can return null even with a user logged in. It is because
    // getUid() is synchronous, but the auth code populating Uid is asynchronous.
    // This method should only be called in the AuthTokenListener callback
    // to guarantee to get the actual user.
    P() {
        const t = this.auth && this.auth.getUid();
        return $(null === t || "string" == typeof t), new L(t);
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
 */ function j(t, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
n) {
    if (!(t instanceof n)) throw n.name === t.constructor.name ? new R(h, `Type does not match the expected instance. Did you pass '${n.name}' from a different Firestore SDK?`) : new R(h, `Expected type '${n.name}', but was '${t.constructor.name}'`);
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
// The earlist date supported by Firestore timestamps (0001-01-01T00:00:00Z).
class k {
    constructor(t, n) {
        if (this.seconds = t, this.nanoseconds = n, n < 0) throw new R(h, "Timestamp nanoseconds out of range: " + n);
        if (n >= 1e9) throw new R(h, "Timestamp nanoseconds out of range: " + n);
        if (t < -62135596800) throw new R(h, "Timestamp seconds out of range: " + t);
        // This will break in the year 10,000.
                if (t >= 253402300800) throw new R(h, "Timestamp seconds out of range: " + t);
    }
    static now() {
        return k.fromMillis(Date.now());
    }
    static fromDate(t) {
        return k.fromMillis(t.getTime());
    }
    static fromMillis(t) {
        const n = Math.floor(t / 1e3);
        return new k(n, 1e6 * (t - 1e3 * n));
    }
    toDate() {
        return new Date(this.toMillis());
    }
    toMillis() {
        return 1e3 * this.seconds + this.nanoseconds / 1e6;
    }
    v(t) {
        return this.seconds === t.seconds ? S(this.nanoseconds, t.nanoseconds) : S(this.seconds, t.seconds);
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
 */ class Q {
    constructor(t) {
        this.timestamp = t;
    }
    static N(t) {
        return new Q(t);
    }
    static min() {
        return new Q(new k(0, 0));
    }
    o(t) {
        return this.timestamp.v(t.timestamp);
    }
    isEqual(t) {
        return this.timestamp.isEqual(t.timestamp);
    }
    /** Returns a number representation of the version for use in spec tests. */    F() {
        // Convert to microseconds.
        return 1e6 * this.timestamp.seconds + this.timestamp.nanoseconds / 1e3;
    }
    toString() {
        return "SnapshotVersion(" + this.timestamp.toString() + ")";
    }
    $() {
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
class G {
    constructor(t, n, e) {
        void 0 === n ? n = 0 : n > t.length && F(), void 0 === e ? e = t.length - n : e > t.length - n && F(), 
        this.segments = t, this.offset = n, this.D = e;
    }
    get length() {
        return this.D;
    }
    isEqual(t) {
        return 0 === G.q(this, t);
    }
    child(t) {
        const n = this.segments.slice(this.offset, this.limit());
        return t instanceof G ? t.forEach(t => {
            n.push(t);
        }) : n.push(t), this.S(n);
    }
    /** The index of one past the last segment of the path. */    limit() {
        return this.offset + this.length;
    }
    O(t) {
        return t = void 0 === t ? 1 : t, this.S(this.segments, this.offset + t, this.length - t);
    }
    C() {
        return this.S(this.segments, this.offset, this.length - 1);
    }
    U() {
        return this.segments[this.offset];
    }
    L() {
        return this.get(this.length - 1);
    }
    get(t) {
        return this.segments[this.offset + t];
    }
    B() {
        return 0 === this.length;
    }
    M(t) {
        if (t.length < this.length) return !1;
        for (let n = 0; n < this.length; n++) if (this.get(n) !== t.get(n)) return !1;
        return !0;
    }
    j(t) {
        if (this.length + 1 !== t.length) return !1;
        for (let n = 0; n < this.length; n++) if (this.get(n) !== t.get(n)) return !1;
        return !0;
    }
    forEach(t) {
        for (let n = this.offset, e = this.limit(); n < e; n++) t(this.segments[n]);
    }
    k() {
        return this.segments.slice(this.offset, this.limit());
    }
    static q(t, n) {
        const e = Math.min(t.length, n.length);
        for (let r = 0; r < e; r++) {
            const e = t.get(r), s = n.get(r);
            if (e < s) return -1;
            if (e > s) return 1;
        }
        return t.length < n.length ? -1 : t.length > n.length ? 1 : 0;
    }
}

/**
 * A slash-separated path for navigating resources (documents and collections)
 * within Firestore.
 */ class W extends G {
    S(t, n, e) {
        return new W(t, n, e);
    }
    G() {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        return this.k().join("/");
    }
    toString() {
        return this.G();
    }
    /**
     * Creates a resource path from the given slash-delimited string.
     */    static W(t) {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        if (t.indexOf("//") >= 0) throw new R(h, `Invalid path (${t}). Paths must not contain // in them.`);
        // We may still have an empty segment at the beginning or end if they had a
        // leading or trailing slash (which we allow).
                const n = t.split("/").filter(t => t.length > 0);
        return new W(n);
    }
    static Y() {
        return new W([]);
    }
}

const Y = /^[_a-zA-Z][_a-zA-Z0-9]*$/;

/** A dot-separated path for navigating sub-objects within a document. */ class z extends G {
    S(t, n, e) {
        return new z(t, n, e);
    }
    /**
     * Returns true if the string could be used as a segment in a field path
     * without escaping.
     */    static H(t) {
        return Y.test(t);
    }
    G() {
        return this.k().map(t => (t = t.replace("\\", "\\\\").replace("`", "\\`"), z.H(t) || (t = "`" + t + "`"), 
        t)).join(".");
    }
    toString() {
        return this.G();
    }
    /**
     * Returns true if this field references the key of a document.
     */    K() {
        return 1 === this.length && "__name__" === this.get(0);
    }
    /**
     * The field designating the key of a document.
     */    static Z() {
        return new z([ "__name__" ]);
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
        const n = [];
        let e = "", r = 0;
        const s = () => {
            if (0 === e.length) throw new R(h, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            n.push(e), e = "";
        };
        let i = !1;
        for (;r < t.length; ) {
            const n = t[r];
            if ("\\" === n) {
                if (r + 1 === t.length) throw new R(h, "Path has trailing escape character: " + t);
                const n = t[r + 1];
                if ("\\" !== n && "." !== n && "`" !== n) throw new R(h, "Path has invalid escape sequence: " + t);
                e += n, r += 2;
            } else "`" === n ? (i = !i, r++) : "." !== n || i ? (e += n, r++) : (s(), r++);
        }
        if (s(), i) throw new R(h, "Unterminated ` in path: " + t);
        return new z(n);
    }
    static Y() {
        return new z([]);
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
 */ class H {
    constructor(t) {
        this.path = t;
    }
    static X(t) {
        return new H(W.W(t).O(5));
    }
    /** Returns true if the document is in the specified collectionId. */    tt(t) {
        return this.path.length >= 2 && this.path.get(this.path.length - 2) === t;
    }
    isEqual(t) {
        return null !== t && 0 === W.q(this.path, t.path);
    }
    toString() {
        return this.path.toString();
    }
    static q(t, n) {
        return W.q(t.path, n.path);
    }
    static nt(t) {
        return t.length % 2 == 0;
    }
    /**
     * Creates and returns a new document key with the given segments.
     *
     * @param segments The segments of the path to the document
     * @return A new instance of DocumentKey
     */    static et(t) {
        return new H(new W(t.slice()));
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
 */ function K(t) {
    let n = 0;
    for (const e in t) Object.prototype.hasOwnProperty.call(t, e) && n++;
    return n;
}

function Z(t, n) {
    for (const e in t) Object.prototype.hasOwnProperty.call(t, e) && n(e, t[e]);
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
 * Immutable class that represents a "proto" byte string.
 *
 * Proto byte strings can either be Base64-encoded strings or Uint8Arrays when
 * sent on the wire. This class abstracts away this differentiation by holding
 * the proto byte string in a common class that must be converted into a string
 * before being sent as a proto.
 */
class J {
    constructor(t) {
        this.rt = t;
    }
    static fromBase64String(t) {
        const n = atob(t);
        return new J(n);
    }
    static fromUint8Array(t) {
        const n = 
        /**
 * Helper function to convert an Uint8array to a binary string.
 */
        function(t) {
            let n = "";
            for (let e = 0; e < t.length; ++e) n += String.fromCharCode(t[e]);
            return n;
        }
        /**
 * Helper function to convert a binary string to an Uint8Array.
 */ (t);
        return new J(n);
    }
    toBase64() {
        return t = this.rt, btoa(t);
        /** Converts a binary string to a Base64 encoded string. */
        var t;
        /** True if and only if the Base64 conversion functions are available. */    }
    toUint8Array() {
        return function(t) {
            const n = new Uint8Array(t.length);
            for (let e = 0; e < t.length; e++) n[e] = t.charCodeAt(e);
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
 */
        /**
 * Returns whether a variable is either undefined or null.
 */ (this.rt);
    }
    st() {
        return 2 * this.rt.length;
    }
    o(t) {
        return S(this.rt, t.rt);
    }
    isEqual(t) {
        return this.rt === t.rt;
    }
}

function X(t) {
    return null == t;
}

/** Returns whether the value represents -0. */ function tt(t) {
    // Detect if the value is -0.0. Based on polyfill from
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
    return -0 === t && 1 / t == -1 / 0;
}

/**
 * Returns whether a value is an integer and in the safe integer range
 * @param value The value to test for being an integer and in the safe range
 */ J.it = new J("");

function nt(t) {
    var n, e;
    return "server_timestamp" === (null === (e = ((null === (n = null == t ? void 0 : t.mapValue) || void 0 === n ? void 0 : n.fields) || {}).__type__) || void 0 === e ? void 0 : e.stringValue);
}

/**
 * Returns the value of the field before this ServerTimestamp was set.
 *
 * Preserving the previous values allows the user to display the last resoled
 * value until the backend responds with the timestamp.
 */
/**
 * Returns the local time at which this timestamp was first set.
 */
function et(t) {
    const n = ct(t.mapValue.fields.__local_write_time__.timestampValue);
    return new k(n.seconds, n.nanos);
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
const rt = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);

/** Extracts the backend's type order for the provided value. */ function st(t) {
    return "nullValue" in t ? 0 /* NullValue */ : "booleanValue" in t ? 1 /* BooleanValue */ : "integerValue" in t || "doubleValue" in t ? 2 /* NumberValue */ : "timestampValue" in t ? 3 /* TimestampValue */ : "stringValue" in t ? 5 /* StringValue */ : "bytesValue" in t ? 6 /* BlobValue */ : "referenceValue" in t ? 7 /* RefValue */ : "geoPointValue" in t ? 8 /* GeoPointValue */ : "arrayValue" in t ? 9 /* ArrayValue */ : "mapValue" in t ? nt(t) ? 4 /* ServerTimestampValue */ : 10 /* ObjectValue */ : F();
}

/** Tests `left` and `right` for equality based on the backend semantics. */ function it(t, n) {
    const e = st(t);
    if (e !== st(n)) return !1;
    switch (e) {
      case 0 /* NullValue */ :
        return !0;

      case 1 /* BooleanValue */ :
        return t.booleanValue === n.booleanValue;

      case 4 /* ServerTimestampValue */ :
        return et(t).isEqual(et(n));

      case 3 /* TimestampValue */ :
        return function(t, n) {
            if ("string" == typeof t.timestampValue && "string" == typeof n.timestampValue && t.timestampValue.length === n.timestampValue.length) 
            // Use string equality for ISO 8601 timestamps
            return t.timestampValue === n.timestampValue;
            const e = ct(t.timestampValue), r = ct(n.timestampValue);
            return e.seconds === r.seconds && e.nanos === r.nanos;
        }(t, n);

      case 5 /* StringValue */ :
        return t.stringValue === n.stringValue;

      case 6 /* BlobValue */ :
        return function(t, n) {
            return lt(t.bytesValue).isEqual(lt(n.bytesValue));
        }(t, n);

      case 7 /* RefValue */ :
        return t.referenceValue === n.referenceValue;

      case 8 /* GeoPointValue */ :
        return function(t, n) {
            return ht(t.geoPointValue.latitude) === ht(n.geoPointValue.latitude) && ht(t.geoPointValue.longitude) === ht(n.geoPointValue.longitude);
        }(t, n);

      case 2 /* NumberValue */ :
        return function(t, n) {
            if ("integerValue" in t && "integerValue" in n) return ht(t.integerValue) === ht(n.integerValue);
            if ("doubleValue" in t && "doubleValue" in n) {
                const e = ht(t.doubleValue), r = ht(n.doubleValue);
                return e === r ? tt(e) === tt(r) : isNaN(e) && isNaN(r);
            }
            return !1;
        }(t, n);

      case 9 /* ArrayValue */ :
        return O(t.arrayValue.values || [], n.arrayValue.values || [], it);

      case 10 /* ObjectValue */ :
        return function(t, n) {
            const e = t.mapValue.fields || {}, r = n.mapValue.fields || {};
            if (K(e) !== K(r)) return !1;
            for (const t in e) if (e.hasOwnProperty(t) && (void 0 === r[t] || !it(e[t], r[t]))) return !1;
            return !0;
        }
        /** Returns true if the ArrayValue contains the specified element. */ (t, n);

      default:
        return F();
    }
}

function ot(t, n) {
    return void 0 !== (t.values || []).find(t => it(t, n));
}

function ut(t, n) {
    const e = st(t), r = st(n);
    if (e !== r) return S(e, r);
    switch (e) {
      case 0 /* NullValue */ :
        return 0;

      case 1 /* BooleanValue */ :
        return S(t.booleanValue, n.booleanValue);

      case 2 /* NumberValue */ :
        return function(t, n) {
            const e = ht(t.integerValue || t.doubleValue), r = ht(n.integerValue || n.doubleValue);
            return e < r ? -1 : e > r ? 1 : e === r ? 0 : 
            // one or both are NaN.
            isNaN(e) ? isNaN(r) ? 0 : -1 : 1;
        }(t, n);

      case 3 /* TimestampValue */ :
        return at(t.timestampValue, n.timestampValue);

      case 4 /* ServerTimestampValue */ :
        return at(et(t), et(n));

      case 5 /* StringValue */ :
        return S(t.stringValue, n.stringValue);

      case 6 /* BlobValue */ :
        return function(t, n) {
            const e = lt(t), r = lt(n);
            return e.o(r);
        }(t.bytesValue, n.bytesValue);

      case 7 /* RefValue */ :
        return function(t, n) {
            const e = t.split("/"), r = n.split("/");
            for (let t = 0; t < e.length && t < r.length; t++) {
                const n = S(e[t], r[t]);
                if (0 !== n) return n;
            }
            return S(e.length, r.length);
        }(t.referenceValue, n.referenceValue);

      case 8 /* GeoPointValue */ :
        return function(t, n) {
            const e = S(ht(t.latitude), ht(n.latitude));
            if (0 !== e) return e;
            return S(ht(t.longitude), ht(n.longitude));
        }(t.geoPointValue, n.geoPointValue);

      case 9 /* ArrayValue */ :
        return function(t, n) {
            const e = t.values || [], r = n.values || [];
            for (let t = 0; t < e.length && t < r.length; ++t) {
                const n = ut(e[t], r[t]);
                if (n) return n;
            }
            return S(e.length, r.length);
        }(t.arrayValue, n.arrayValue);

      case 10 /* ObjectValue */ :
        return function(t, n) {
            const e = t.fields || {}, r = Object.keys(e), s = n.fields || {}, i = Object.keys(s);
            // Even though MapValues are likely sorted correctly based on their insertion
            // order (e.g. when received from the backend), local modifications can bring
            // elements out of order. We need to re-sort the elements to ensure that
            // canonical IDs are independent of insertion order.
            r.sort(), i.sort();
            for (let t = 0; t < r.length && t < i.length; ++t) {
                const n = S(r[t], i[t]);
                if (0 !== n) return n;
                const o = ut(e[r[t]], s[i[t]]);
                if (0 !== o) return o;
            }
            return S(r.length, i.length);
        }
        /**
 * Converts the possible Proto values for a timestamp value into a "seconds and
 * nanos" representation.
 */ (t.mapValue, n.mapValue);

      default:
        throw F();
    }
}

function at(t, n) {
    if ("string" == typeof t && "string" == typeof n && t.length === n.length) return S(t, n);
    const e = ct(t), r = ct(n), s = S(e.seconds, r.seconds);
    return 0 !== s ? s : S(e.nanos, r.nanos);
}

function ct(t) {
    // The json interface (for the browser) will return an iso timestamp string,
    // while the proto js library (for node) will return a
    // google.protobuf.Timestamp instance.
    if ($(!!t), "string" == typeof t) {
        // The date string can have higher precision (nanos) than the Date class
        // (millis), so we do some custom parsing here.
        // Parse the nanos right out of the string.
        let n = 0;
        const e = rt.exec(t);
        if ($(!!e), e[1]) {
            // Pad the fraction out to 9 digits (nanos).
            let t = e[1];
            t = (t + "000000000").substr(0, 9), n = Number(t);
        }
        // Parse the date to get the seconds.
                const r = new Date(t);
        return {
            seconds: Math.floor(r.getTime() / 1e3),
            nanos: n
        };
    }
    return {
        seconds: ht(t.seconds),
        nanos: ht(t.nanos)
    };
}

/**
 * Converts the possible Proto types for numbers into a JavaScript number.
 * Returns 0 if the value is not numeric.
 */ function ht(t) {
    // TODO(bjornick): Handle int64 greater than 53 bits.
    return "number" == typeof t ? t : "string" == typeof t ? Number(t) : 0;
}

/** Converts the possible Proto types for Blobs into a ByteString. */ function lt(t) {
    return "string" == typeof t ? J.fromBase64String(t) : J.fromUint8Array(t);
}

/** Returns a reference value for the provided database and key. */ function ft(t, n) {
    return {
        referenceValue: `projects/${t.projectId}/databases/${t.database}/documents/${n.path.G()}`
    };
}

/** Returns true if `value` is an ArrayValue. */ function dt(t) {
    return !!t && "arrayValue" in t;
}

/** Returns true if `value` is a NullValue. */ function _t(t) {
    return !!t && "nullValue" in t;
}

/** Returns true if `value` is NaN. */ function wt(t) {
    return !!t && "doubleValue" in t && isNaN(Number(t.doubleValue));
}

/** Returns true if `value` is a MapValue. */ function mt(t) {
    return !!t && "mapValue" in t;
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
class pt {
    constructor(t, n = null, e = [], r = [], s = null, i = null, o = null) {
        this.path = t, this.collectionGroup = n, this.orderBy = e, this.filters = r, this.limit = s, 
        this.startAt = i, this.endAt = o, this.ot = null;
    }
}

/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */ function yt(t, n = null, e = [], r = [], s = null, i = null, o = null) {
    return new pt(t, n, e, r, s, i, o);
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
 */
class Et {
    /**
     * Initializes a Query with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     */
    constructor(t, n = null, e = [], r = [], s = null, i = "F" /* First */ , o = null, u = null) {
        this.path = t, this.collectionGroup = n, this.ut = e, this.filters = r, this.limit = s, 
        this.at = i, this.startAt = o, this.endAt = u, this.ct = null, 
        // The corresponding `Target` of this `Query` instance.
        this.ht = null, this.startAt, this.endAt;
    }
    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */    lt(t) {
        return new Et(t, 
        /*collectionGroup=*/ null, this.ut.slice(), this.filters.slice(), this.limit, this.at, this.startAt, this.endAt);
    }
    ft() {
        return 0 === this.filters.length && null === this.limit && null == this.startAt && null == this.endAt && (0 === this.ut.length || 1 === this.ut.length && this.ut[0].field.K());
    }
    dt() {
        return !X(this.limit) && "F" /* First */ === this.at;
    }
    _t() {
        return !X(this.limit) && "L" /* Last */ === this.at;
    }
    wt() {
        return this.ut.length > 0 ? this.ut[0].field : null;
    }
    pt() {
        for (const t of this.filters) if (t.yt()) return t.field;
        return null;
    }
    Et(t) {
        for (const n of this.filters) if (t.indexOf(n.op) >= 0) return n.op;
        return null;
    }
}

/** Creates a new Query for a query that matches all documents at `path` */
/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */
function It(t) {
    return null !== t.collectionGroup;
}

/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */ function At(t) {
    const n = j(t, Et);
    if (null === n.ct) {
        n.ct = [];
        const t = n.pt(), e = n.wt();
        if (null !== t && null === e) 
        // In order to implicitly add key ordering, we must also add the
        // inequality filter field for it to be a valid query.
        // Note that the default inequality field and key ordering is ascending.
        t.K() || n.ct.push(new St(t)), n.ct.push(new St(z.Z(), "asc" /* ASCENDING */)); else {
            let t = !1;
            for (const e of n.ut) n.ct.push(e), e.field.K() && (t = !0);
            if (!t) {
                // The order of the implicit key ordering always matches the last
                // explicit order by
                const t = n.ut.length > 0 ? n.ut[n.ut.length - 1].dir : "asc" /* ASCENDING */;
                n.ct.push(new St(z.Z(), t));
            }
        }
    }
    return n.ct;
}

/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */ function Tt(t) {
    const n = j(t, Et);
    if (!n.ht) if ("F" /* First */ === n.at) n.ht = yt(n.path, n.collectionGroup, At(n), n.filters, n.limit, n.startAt, n.endAt); else {
        // Flip the orderBy directions since we want the last results
        const t = [];
        for (const e of At(n)) {
            const n = "desc" /* DESCENDING */ === e.dir ? "asc" /* ASCENDING */ : "desc" /* DESCENDING */;
            t.push(new St(e.field, n));
        }
        // We need to swap the cursors to match the now-flipped query ordering.
                const e = n.endAt ? new qt(n.endAt.position, !n.endAt.before) : null, r = n.startAt ? new qt(n.startAt.position, !n.startAt.before) : null;
        // Now return as a LimitType.First query.
        n.ht = yt(n.path, n.collectionGroup, t, n.filters, n.limit, e, r);
    }
    return n.ht;
}

function Pt(t, n) {
    return function(t, n) {
        if (t.limit !== n.limit) return !1;
        if (t.orderBy.length !== n.orderBy.length) return !1;
        for (let e = 0; e < t.orderBy.length; e++) if (!Ot(t.orderBy[e], n.orderBy[e])) return !1;
        if (t.filters.length !== n.filters.length) return !1;
        for (let s = 0; s < t.filters.length; s++) if (e = t.filters[s], r = n.filters[s], 
        e.op !== r.op || !e.field.isEqual(r.field) || !it(e.value, r.value)) return !1;
        var e, r;
        /** Filter that matches on key fields (i.e. '__name__'). */        return t.collectionGroup === n.collectionGroup && (!!t.path.isEqual(n.path) && (!!xt(t.startAt, n.startAt) && xt(t.endAt, n.endAt)));
    }(Tt(t), Tt(n)) && t.at === n.at;
}

class Rt extends class {} {
    constructor(t, n, e) {
        super(), this.field = t, this.op = n, this.value = e;
    }
    /**
     * Creates a filter based on the provided arguments.
     */    static create(t, n, e) {
        if (t.K()) return "in" /* IN */ === n || "not-in" /* NOT_IN */ === n ? this.It(t, n, e) : new Vt(t, n, e);
        if (_t(e)) {
            if ("==" /* EQUAL */ !== n && "!=" /* NOT_EQUAL */ !== n) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new R(h, "Invalid query. Null supports only equality comparisons.");
            return new Rt(t, n, e);
        }
        if (wt(e)) {
            if ("==" /* EQUAL */ !== n && "!=" /* NOT_EQUAL */ !== n) 
            // TODO(ne-queries): Update error message to include != comparison.
            throw new R(h, "Invalid query. NaN supports only equality comparisons.");
            return new Rt(t, n, e);
        }
        return "array-contains" /* ARRAY_CONTAINS */ === n ? new Nt(t, e) : "in" /* IN */ === n ? new Ft(t, e) : "not-in" /* NOT_IN */ === n ? new $t(t, e) : "array-contains-any" /* ARRAY_CONTAINS_ANY */ === n ? new Dt(t, e) : new Rt(t, n, e);
    }
    static It(t, n, e) {
        return "in" /* IN */ === n ? new bt(t, e) : new gt(t, e);
    }
    matches(t) {
        const n = t.field(this.field);
        // Types do not have to match in NOT_EQUAL filters.
                return "!=" /* NOT_EQUAL */ === this.op ? null !== n && this.At(ut(n, this.value)) : null !== n && st(this.value) === st(n) && this.At(ut(n, this.value));
        // Only compare types with matching backend order (such as double and int).
        }
    At(t) {
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
            return F();
        }
    }
    yt() {
        return [ "<" /* LESS_THAN */ , "<=" /* LESS_THAN_OR_EQUAL */ , ">" /* GREATER_THAN */ , ">=" /* GREATER_THAN_OR_EQUAL */ , "!=" /* NOT_EQUAL */ ].indexOf(this.op) >= 0;
    }
}

class Vt extends Rt {
    constructor(t, n, e) {
        super(t, n, e), this.key = H.X(e.referenceValue);
    }
    matches(t) {
        const n = H.q(t.key, this.key);
        return this.At(n);
    }
}

/** Filter that matches on key fields within an array. */ class bt extends Rt {
    constructor(t, n) {
        super(t, "in" /* IN */ , n), this.keys = vt("in" /* IN */ , n);
    }
    matches(t) {
        return this.keys.some(n => n.isEqual(t.key));
    }
}

/** Filter that matches on key fields not present within an array. */ class gt extends Rt {
    constructor(t, n) {
        super(t, "not-in" /* NOT_IN */ , n), this.keys = vt("not-in" /* NOT_IN */ , n);
    }
    matches(t) {
        return !this.keys.some(n => n.isEqual(t.key));
    }
}

function vt(t, n) {
    var e;
    return ((null === (e = n.arrayValue) || void 0 === e ? void 0 : e.values) || []).map(t => H.X(t.referenceValue));
}

/** A Filter that implements the array-contains operator. */ class Nt extends Rt {
    constructor(t, n) {
        super(t, "array-contains" /* ARRAY_CONTAINS */ , n);
    }
    matches(t) {
        const n = t.field(this.field);
        return dt(n) && ot(n.arrayValue, this.value);
    }
}

/** A Filter that implements the IN operator. */ class Ft extends Rt {
    constructor(t, n) {
        super(t, "in" /* IN */ , n);
    }
    matches(t) {
        const n = t.field(this.field);
        return null !== n && ot(this.value.arrayValue, n);
    }
}

/** A Filter that implements the not-in operator. */ class $t extends Rt {
    constructor(t, n) {
        super(t, "not-in" /* NOT_IN */ , n);
    }
    matches(t) {
        const n = t.field(this.field);
        return null !== n && !ot(this.value.arrayValue, n);
    }
}

/** A Filter that implements the array-contains-any operator. */ class Dt extends Rt {
    constructor(t, n) {
        super(t, "array-contains-any" /* ARRAY_CONTAINS_ANY */ , n);
    }
    matches(t) {
        const n = t.field(this.field);
        return !(!dt(n) || !n.arrayValue.values) && n.arrayValue.values.some(t => ot(this.value.arrayValue, t));
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
 */ class qt {
    constructor(t, n) {
        this.position = t, this.before = n;
    }
}

function xt(t, n) {
    if (null === t) return null === n;
    if (null === n) return !1;
    if (t.before !== n.before || t.position.length !== n.position.length) return !1;
    for (let e = 0; e < t.position.length; e++) {
        if (!it(t.position[e], n.position[e])) return !1;
    }
    return !0;
}

/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */ class St {
    constructor(t, n = "asc" /* ASCENDING */) {
        this.field = t, this.dir = n;
    }
}

function Ot(t, n) {
    return t.dir === n.dir && t.field.isEqual(n.field);
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
 */ var Ct, Ut;

/**
 * Converts an HTTP Status Code to the equivalent error code.
 *
 * @param status An HTTP Status Code, like 200, 404, 503, etc.
 * @returns The equivalent Code. Unknown status codes are mapped to
 *     Code.UNKNOWN.
 */
function Lt(t) {
    if (void 0 === t) return v("RPC_ERROR", "HTTP error has no status"), c;
    // The canonical error codes for Google APIs [1] specify mapping onto HTTP
    // status codes but the mapping is not bijective. In each case of ambiguity
    // this function chooses a primary error.
    
    // [1]
    // https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
        switch (t) {
      case 200:
        // OK
        return u;

      case 400:
        // Bad Request
        return p;

        // Other possibilities based on the forward mapping
        // return Code.INVALID_ARGUMENT;
        // return Code.OUT_OF_RANGE;
              case 401:
        // Unauthorized
        return w;

      case 403:
        // Forbidden
        return _;

      case 404:
        // Not Found
        return f;

      case 409:
        // Conflict
        return y;

        // Other possibilities:
        // return Code.ALREADY_EXISTS;
              case 416:
        // Range Not Satisfiable
        return E;

      case 429:
        // Too Many Requests
        return m;

      case 499:
        // Client Closed Request
        return a;

      case 500:
        // Internal Server Error
        return c;

        // Other possibilities:
        // return Code.INTERNAL;
        // return Code.DATA_LOSS;
              case 501:
        // Unimplemented
        return I;

      case 503:
        // Service Unavailable
        return T;

      case 504:
        // Gateway Timeout
        return l;

      default:
        return t >= 200 && t < 300 ? u : t >= 400 && t < 500 ? p : t >= 500 && t < 600 ? A : c;
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
 */ (Ut = Ct || (Ct = {}))[Ut.OK = 0] = "OK", Ut[Ut.CANCELLED = 1] = "CANCELLED", 
Ut[Ut.UNKNOWN = 2] = "UNKNOWN", Ut[Ut.INVALID_ARGUMENT = 3] = "INVALID_ARGUMENT", 
Ut[Ut.DEADLINE_EXCEEDED = 4] = "DEADLINE_EXCEEDED", Ut[Ut.NOT_FOUND = 5] = "NOT_FOUND", 
Ut[Ut.ALREADY_EXISTS = 6] = "ALREADY_EXISTS", Ut[Ut.PERMISSION_DENIED = 7] = "PERMISSION_DENIED", 
Ut[Ut.UNAUTHENTICATED = 16] = "UNAUTHENTICATED", Ut[Ut.RESOURCE_EXHAUSTED = 8] = "RESOURCE_EXHAUSTED", 
Ut[Ut.FAILED_PRECONDITION = 9] = "FAILED_PRECONDITION", Ut[Ut.ABORTED = 10] = "ABORTED", 
Ut[Ut.OUT_OF_RANGE = 11] = "OUT_OF_RANGE", Ut[Ut.UNIMPLEMENTED = 12] = "UNIMPLEMENTED", 
Ut[Ut.INTERNAL = 13] = "INTERNAL", Ut[Ut.UNAVAILABLE = 14] = "UNAVAILABLE", Ut[Ut.DATA_LOSS = 15] = "DATA_LOSS";

const Bt = (() => {
    const t = {
        asc: "ASCENDING",
        desc: "DESCENDING"
    };
    return t;
})(), Mt = (() => {
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
class jt {
    constructor(t, n) {
        this.s = t, this.Tt = n;
    }
}

/**
 * Returns a value for a number (or null) that's appropriate to put into
 * a google.protobuf.Int32Value proto.
 * DO NOT USE THIS FOR ANYTHING ELSE.
 * This method cheats. It's typed as returning "number" because that's what
 * our generated proto interfaces say Int32Value must be. But GRPC actually
 * expects a { value: <number> } struct.
 */
/**
 * Returns a value for a number that's appropriate to put into a proto.
 * The return value is an IntegerValue if it can safely represent the value,
 * otherwise a DoubleValue is returned.
 */
function kt(t, n) {
    return function(t) {
        return "number" == typeof t && Number.isInteger(t) && !tt(t) && t <= Number.MAX_SAFE_INTEGER && t >= Number.MIN_SAFE_INTEGER;
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
 */ (n) ? 
    /**
 * Returns an IntegerValue for `value`.
 */
    function(t) {
        return {
            integerValue: "" + t
        };
    }
    /**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */ (n) : function(t, n) {
        if (t.Tt) {
            if (isNaN(n)) return {
                doubleValue: "NaN"
            };
            if (n === 1 / 0) return {
                doubleValue: "Infinity"
            };
            if (n === -1 / 0) return {
                doubleValue: "-Infinity"
            };
        }
        return {
            doubleValue: tt(n) ? "-0" : n
        };
    }(t, n);
}

/**
 * Returns a value for a Date that's appropriate to put into a proto.
 */ function Qt(t, n) {
    if (t.Tt) {
        return `${new Date(1e3 * n.seconds).toISOString().replace(/\.\d*/, "").replace("Z", "")}.${("000000000" + n.nanoseconds).slice(-9)}Z`;
    }
    return {
        seconds: "" + n.seconds,
        nanos: n.nanoseconds
    };
}

function Gt(t, n) {
    return Qt(t, n.$());
}

function Wt(t) {
    return $(!!t), Q.N(function(t) {
        const n = ct(t);
        return new k(n.seconds, n.nanos);
    }
    /**
 * Returns a value for bytes that's appropriate to put in a proto.
 *
 * Visible for testing.
 */ (t));
}

function Yt(t, n) {
    return function(t) {
        return new W([ "projects", t.projectId, "databases", t.database ]);
    }(t).child("documents").child(n).G();
}

function zt(t, n) {
    return Yt(t.s, n.path);
}

function Ht(t, n) {
    const e = function(t) {
        const n = W.W(t);
        return $(on(n)), n;
    }(n);
    return $(e.get(1) === t.s.projectId), $(!e.get(3) && !t.s.database || e.get(3) === t.s.database), 
    new H(($((r = e).length > 4 && "documents" === r.get(4)), r.O(5)));
    var r;
    /** Creates an api.Document from key and fields (but no create/update time) */}

function Kt(t, n) {
    return Yt(t.s, n);
}

function Zt(t) {
    return new W([ "projects", t.s.projectId, "databases", t.s.database ]).G();
}

function Jt(t, n, e) {
    return {
        name: zt(t, n),
        fields: e.proto.mapValue.fields
    };
}

function Xt(t, n) {
    return "found" in n ? function(t, n) {
        $(!!n.found), n.found.name, n.found.updateTime;
        const e = Ht(t, n.found.name), r = Wt(n.found.updateTime), s = new An({
            mapValue: {
                fields: n.found.fields
            }
        });
        return new Rn(e, r, s, {});
    }(t, n) : "missing" in n ? function(t, n) {
        $(!!n.missing), $(!!n.readTime);
        const e = Ht(t, n.missing), r = Wt(n.readTime);
        return new Vn(e, r);
    }(t, n) : F();
}

function tn(t, n) {
    let e;
    if (n instanceof mn) e = {
        update: Jt(t, n.key, n.value)
    }; else if (n instanceof En) e = {
        delete: zt(t, n.key)
    }; else if (n instanceof pn) e = {
        update: Jt(t, n.key, n.data),
        updateMask: sn(n.Pt)
    }; else if (n instanceof yn) e = {
        transform: {
            document: zt(t, n.key),
            fieldTransforms: n.fieldTransforms.map(t => function(t, n) {
                const e = n.transform;
                if (e instanceof an) return {
                    fieldPath: n.field.G(),
                    setToServerValue: "REQUEST_TIME"
                };
                if (e instanceof cn) return {
                    fieldPath: n.field.G(),
                    appendMissingElements: {
                        values: e.elements
                    }
                };
                if (e instanceof hn) return {
                    fieldPath: n.field.G(),
                    removeAllFromArray: {
                        values: e.elements
                    }
                };
                if (e instanceof ln) return {
                    fieldPath: n.field.G(),
                    increment: e.Rt
                };
                throw F();
            }(0, t))
        }
    }; else {
        if (!(n instanceof In)) return F();
        e = {
            verify: zt(t, n.key)
        };
    }
    return n.bt.Vt || (e.currentDocument = function(t, n) {
        return void 0 !== n.updateTime ? {
            updateTime: Gt(t, n.updateTime)
        } : void 0 !== n.exists ? {
            exists: n.exists
        } : F();
    }(t, n.bt)), e;
}

function nn(t, n) {
    // Dissect the path into parent, collectionId, and optional key filter.
    const e = {
        structuredQuery: {}
    }, r = n.path;
    null !== n.collectionGroup ? (e.parent = Kt(t, r), e.structuredQuery.from = [ {
        collectionId: n.collectionGroup,
        allDescendants: !0
    } ]) : (e.parent = Kt(t, r.C()), e.structuredQuery.from = [ {
        collectionId: r.L()
    } ]);
    const s = function(t) {
        if (0 === t.length) return;
        const n = t.map(t => 
        // visible for testing
        function(t) {
            if ("==" /* EQUAL */ === t.op) {
                if (wt(t.value)) return {
                    unaryFilter: {
                        field: rn(t.field),
                        op: "IS_NAN"
                    }
                };
                if (_t(t.value)) return {
                    unaryFilter: {
                        field: rn(t.field),
                        op: "IS_NULL"
                    }
                };
            } else if ("!=" /* NOT_EQUAL */ === t.op) {
                if (wt(t.value)) return {
                    unaryFilter: {
                        field: rn(t.field),
                        op: "IS_NOT_NAN"
                    }
                };
                if (_t(t.value)) return {
                    unaryFilter: {
                        field: rn(t.field),
                        op: "IS_NOT_NULL"
                    }
                };
            }
            return {
                fieldFilter: {
                    field: rn(t.field),
                    op: (n = t.op, Mt[n]),
                    value: t.value
                }
            };
            // visible for testing
            var n;
        }(t));
        if (1 === n.length) return n[0];
        return {
            compositeFilter: {
                op: "AND",
                filters: n
            }
        };
    }(n.filters);
    s && (e.structuredQuery.where = s);
    const i = function(t) {
        if (0 === t.length) return;
        return t.map(t => 
        // visible for testing
        function(t) {
            return {
                field: rn(t.field),
                direction: (n = t.dir, Bt[n])
            };
            // visible for testing
            var n;
        }(t));
    }(n.orderBy);
    i && (e.structuredQuery.orderBy = i);
    const o = function(t, n) {
        return t.Tt || X(n) ? n : {
            value: n
        };
    }(t, n.limit);
    return null !== o && (e.structuredQuery.limit = o), n.startAt && (e.structuredQuery.startAt = en(n.startAt)), 
    n.endAt && (e.structuredQuery.endAt = en(n.endAt)), e;
}

function en(t) {
    return {
        before: t.before,
        values: t.position
    };
}

function rn(t) {
    return {
        fieldPath: t.G()
    };
}

function sn(t) {
    const n = [];
    return t.fields.forEach(t => n.push(t.G())), {
        fieldPaths: n
    };
}

function on(t) {
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
/** Represents a transform within a TransformMutation. */ class un {
    constructor() {
        // Make sure that the structural type of `TransformOperation` is unique.
        // See https://github.com/microsoft/TypeScript/issues/5451
        this.gt = void 0;
    }
}

/** Transforms a value into a server-generated timestamp. */ class an extends un {}

/** Transforms an array value via a union operation. */ class cn extends un {
    constructor(t) {
        super(), this.elements = t;
    }
}

/** Transforms an array value via a remove operation. */ class hn extends un {
    constructor(t) {
        super(), this.elements = t;
    }
}

/**
 * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
 * transforms. Converts all field values to integers or doubles, but unlike the
 * backend does not cap integer values at 2^63. Instead, JavaScript number
 * arithmetic is used and precision loss can occur for values greater than 2^53.
 */ class ln extends un {
    constructor(t, n) {
        super(), this.serializer = t, this.Rt = n;
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
 * Provides a set of fields that can be used to partially patch a document.
 * FieldMask is used in conjunction with ObjectValue.
 * Examples:
 *   foo - Overwrites foo entirely with the provided value. If foo is not
 *         present in the companion ObjectValue, the field is deleted.
 *   foo.bar - Overwrites only the field bar of the object foo.
 *             If foo is not an object, foo is replaced with an object
 *             containing foo
 */ class fn {
    constructor(t) {
        this.fields = t, 
        // TODO(dimond): validation of FieldMask
        // Sort the field mask to support `FieldMask.isEqual()` and assert below.
        t.sort(z.q);
    }
    /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */    vt(t) {
        for (const n of this.fields) if (n.M(t)) return !0;
        return !1;
    }
    isEqual(t) {
        return O(this.fields, t.fields, (t, n) => t.isEqual(n));
    }
}

/** A field path and the TransformOperation to perform upon it. */ class dn {
    constructor(t, n) {
        this.field = t, this.transform = n;
    }
}

/**
 * Encodes a precondition for a mutation. This follows the model that the
 * backend accepts with the special case of an explicit "empty" precondition
 * (meaning no precondition).
 */ class _n {
    constructor(t, n) {
        this.updateTime = t, this.exists = n;
    }
    /** Creates a new empty Precondition. */    static Nt() {
        return new _n;
    }
    /** Creates a new Precondition with an exists flag. */    static exists(t) {
        return new _n(void 0, t);
    }
    /** Creates a new Precondition based on a version a document exists at. */    static updateTime(t) {
        return new _n(t);
    }
    /** Returns whether this Precondition is empty. */    get Vt() {
        return void 0 === this.updateTime && void 0 === this.exists;
    }
    isEqual(t) {
        return this.exists === t.exists && (this.updateTime ? !!t.updateTime && this.updateTime.isEqual(t.updateTime) : !t.updateTime);
    }
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
 */ class wn {}

/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */ class mn extends wn {
    constructor(t, n, e) {
        super(), this.key = t, this.value = n, this.bt = e, this.type = 0 /* Set */;
    }
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
 */ class pn extends wn {
    constructor(t, n, e, r) {
        super(), this.key = t, this.data = n, this.Pt = e, this.bt = r, this.type = 1 /* Patch */;
    }
}

/**
 * A mutation that modifies specific fields of the document with transform
 * operations. Currently the only supported transform is a server timestamp, but
 * IP Address, increment(n), etc. could be supported in the future.
 *
 * It is somewhat similar to a PatchMutation in that it patches specific fields
 * and has no effect when applied to a null or NoDocument (see comment on
 * Mutation for rationale).
 */ class yn extends wn {
    constructor(t, n) {
        super(), this.key = t, this.fieldTransforms = n, this.type = 2 /* Transform */ , 
        // NOTE: We set a precondition of exists: true as a safety-check, since we
        // always combine TransformMutations with a SetMutation or PatchMutation which
        // (if successful) should end up with an existing document.
        this.bt = _n.exists(!0);
    }
}

/** A mutation that deletes the document at the given key. */ class En extends wn {
    constructor(t, n) {
        super(), this.key = t, this.bt = n, this.type = 3 /* Delete */;
    }
}

/**
 * A mutation that verifies the existence of the document at the given key with
 * the provided precondition.
 *
 * The `verify` operation is only used in Transactions, and this class serves
 * primarily to facilitate serialization into protos.
 */ class In extends wn {
    constructor(t, n) {
        super(), this.key = t, this.bt = n, this.type = 4 /* Verify */;
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
 */ class An {
    constructor(t) {
        this.proto = t;
    }
    static empty() {
        return new An({
            mapValue: {}
        });
    }
    /**
     * Returns the value at the given path or null.
     *
     * @param path the path to search
     * @return The value at the path or if there it doesn't exist.
     */    field(t) {
        if (t.B()) return this.proto;
        {
            let n = this.proto;
            for (let e = 0; e < t.length - 1; ++e) {
                if (!n.mapValue.fields) return null;
                if (n = n.mapValue.fields[t.get(e)], !mt(n)) return null;
            }
            return n = (n.mapValue.fields || {})[t.L()], n || null;
        }
    }
    isEqual(t) {
        return it(this.proto, t.proto);
    }
}

/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue.
 */ class Tn {
    /**
     * @param baseObject The object to mutate.
     */
    constructor(t = An.empty()) {
        this.Ft = t, 
        /** A map that contains the accumulated changes in this builder. */
        this.$t = new Map;
    }
    /**
     * Sets the field to the provided value.
     *
     * @param path The field path to set.
     * @param value The value to set.
     * @return The current Builder instance.
     */    set(t, n) {
        return this.Dt(t, n), this;
    }
    /**
     * Removes the field at the specified path. If there is no field at the
     * specified path, nothing is changed.
     *
     * @param path The field path to remove.
     * @return The current Builder instance.
     */    delete(t) {
        return this.Dt(t, null), this;
    }
    /**
     * Adds `value` to the overlay map at `path`. Creates nested map entries if
     * needed.
     */    Dt(t, n) {
        let e = this.$t;
        for (let n = 0; n < t.length - 1; ++n) {
            const r = t.get(n);
            let s = e.get(r);
            s instanceof Map ? 
            // Re-use a previously created map
            e = s : s && 10 /* ObjectValue */ === st(s) ? (
            // Convert the existing Protobuf MapValue into a map
            s = new Map(Object.entries(s.mapValue.fields || {})), e.set(r, s), e = s) : (
            // Create an empty map to represent the current nesting level
            s = new Map, e.set(r, s), e = s);
        }
        e.set(t.L(), n);
    }
    /** Returns an ObjectValue with all mutations applied. */    qt() {
        const t = this.xt(z.Y(), this.$t);
        return null != t ? new An(t) : this.Ft;
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
     */    xt(t, n) {
        let e = !1;
        const r = this.Ft.field(t), s = mt(r) ? // If there is already data at the current path, base our
        Object.assign({}, r.mapValue.fields) : {};
        return n.forEach((n, r) => {
            if (n instanceof Map) {
                const i = this.xt(t.child(r), n);
                null != i && (s[r] = i, e = !0);
            } else null !== n ? (s[r] = n, e = !0) : s.hasOwnProperty(r) && (delete s[r], e = !0);
        }), e ? {
            mapValue: {
                fields: s
            }
        } : null;
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
 * The result of a lookup for a given path may be an existing document or a
 * marker that this document does not exist at a given version.
 */ class Pn {
    constructor(t, n) {
        this.key = t, this.version = n;
    }
}

/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */ class Rn extends Pn {
    constructor(t, n, e, r) {
        super(t, n), this.St = e, this.Ot = !!r.Ot, this.hasCommittedMutations = !!r.hasCommittedMutations;
    }
    field(t) {
        return this.St.field(t);
    }
    data() {
        return this.St;
    }
    Ct() {
        return this.St.proto;
    }
    isEqual(t) {
        return t instanceof Rn && this.key.isEqual(t.key) && this.version.isEqual(t.version) && this.Ot === t.Ot && this.hasCommittedMutations === t.hasCommittedMutations && this.St.isEqual(t.St);
    }
    toString() {
        return `Document(${this.key}, ${this.version}, ${this.St.toString()}, {hasLocalMutations: ${this.Ot}}), {hasCommittedMutations: ${this.hasCommittedMutations}})`;
    }
    get hasPendingWrites() {
        return this.Ot || this.hasCommittedMutations;
    }
}

/**
 * A class representing a deleted document.
 * Version is set to 0 if we don't point to any specific time, otherwise it
 * denotes time we know it didn't exist at.
 */ class Vn extends Pn {
    constructor(t, n, e) {
        super(t, n), this.hasCommittedMutations = !(!e || !e.hasCommittedMutations);
    }
    toString() {
        return `NoDocument(${this.key}, ${this.version})`;
    }
    get hasPendingWrites() {
        return this.hasCommittedMutations;
    }
    isEqual(t) {
        return t instanceof Vn && t.hasCommittedMutations === this.hasCommittedMutations && t.version.isEqual(this.version) && t.key.isEqual(this.key);
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
 */ class bn {
    constructor() {
        this.promise = new Promise((t, n) => {
            this.resolve = t, this.reject = n;
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
class gn {
    constructor(
    /**
     * The AsyncQueue to run backoff operations on.
     */
    t, 
    /**
     * The ID to use when scheduling backoff operations on the AsyncQueue.
     */
    n, 
    /**
     * The initial delay (used as the base delay on the first retry attempt).
     * Note that jitter will still be applied, so the actual delay could be as
     * little as 0.5*initialDelayMs.
     */
    e = 1e3
    /**
     * The multiplier to use to determine the extended base delay after each
     * attempt.
     */ , r = 1.5
    /**
     * The maximum base delay after which no further backoff is performed.
     * Note that jitter will still be applied, so the actual delay could be as
     * much as 1.5*maxDelayMs.
     */ , s = 6e4) {
        this.Ut = t, this.Lt = n, this.Bt = e, this.Mt = r, this.jt = s, this.kt = 0, this.Qt = null, 
        /** The last backoff attempt, as epoch milliseconds. */
        this.Gt = Date.now(), this.reset();
    }
    /**
     * Resets the backoff delay.
     *
     * The very next backoffAndWait() will have no delay. If it is called again
     * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
     * subsequent ones will increase according to the backoffFactor.
     */    reset() {
        this.kt = 0;
    }
    /**
     * Resets the backoff delay to the maximum delay (e.g. for use after a
     * RESOURCE_EXHAUSTED error).
     */    Wt() {
        this.kt = this.jt;
    }
    /**
     * Returns a promise that resolves after currentDelayMs, and increases the
     * delay for any subsequent attempts. If there was a pending backoff operation
     * already, it will be canceled.
     */    Yt(t) {
        // Cancel any pending backoff operation.
        this.cancel();
        // First schedule using the current base (which may be 0 and should be
        // honored as such).
        const n = Math.floor(this.kt + this.zt()), e = Math.max(0, Date.now() - this.Gt), r = Math.max(0, n - e);
        // Guard against lastAttemptTime being in the future due to a clock change.
                r > 0 && g("ExponentialBackoff", `Backing off for ${r} ms (base delay: ${this.kt} ms, delay with jitter: ${n} ms, last attempt: ${e} ms ago)`), 
        this.Qt = this.Ut.Ht(this.Lt, r, () => (this.Gt = Date.now(), t())), 
        // Apply backoff factor to determine next delay and ensure it is within
        // bounds.
        this.kt *= this.Mt, this.kt < this.Bt && (this.kt = this.Bt), this.kt > this.jt && (this.kt = this.jt);
    }
    Kt() {
        null !== this.Qt && (this.Qt.Zt(), this.Qt = null);
    }
    cancel() {
        null !== this.Qt && (this.Qt.cancel(), this.Qt = null);
    }
    /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */    zt() {
        return (Math.random() - .5) * this.kt;
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
/** Verifies whether `e` is an IndexedDbTransactionError. */
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
/** The Platform's 'document' implementation or null if not available. */
function vn() {
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
class Nn {
    constructor(t, n, e, r, s) {
        this.Jt = t, this.Lt = n, this.Xt = e, this.op = r, this.tn = s, this.nn = new bn, 
        this.then = this.nn.promise.then.bind(this.nn.promise), 
        // It's normal for the deferred promise to be canceled (due to cancellation)
        // and so we attach a dummy catch callback to avoid
        // 'UnhandledPromiseRejectionWarning' log spam.
        this.nn.promise.catch(t => {});
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
     */    static en(t, n, e, r, s) {
        const i = Date.now() + e, o = new Nn(t, n, i, r, s);
        return o.start(e), o;
    }
    /**
     * Starts the timer. This is called immediately after construction by
     * createAndSchedule().
     */    start(t) {
        this.rn = setTimeout(() => this.sn(), t);
    }
    /**
     * Queues the operation to run immediately (if it hasn't already been run or
     * canceled).
     */    Zt() {
        return this.sn();
    }
    /**
     * Cancels the operation if it hasn't already been executed or canceled. The
     * promise will be rejected.
     *
     * As long as the operation has not yet been run, calling cancel() provides a
     * guarantee that the operation will not be run.
     */    cancel(t) {
        null !== this.rn && (this.clearTimeout(), this.nn.reject(new R(a, "Operation cancelled" + (t ? ": " + t : ""))));
    }
    sn() {
        this.Jt.on(() => null !== this.rn ? (this.clearTimeout(), this.op().then(t => this.nn.resolve(t))) : Promise.resolve());
    }
    clearTimeout() {
        null !== this.rn && (this.tn(this), clearTimeout(this.rn), this.rn = null);
    }
}

class Fn {
    constructor() {
        // The last promise in the queue.
        this.un = Promise.resolve(), 
        // A list of retryable operations. Retryable operations are run in order and
        // retried with backoff.
        this.an = [], 
        // Is this AsyncQueue being shut down? Once it is set to true, it will not
        // be changed again.
        this.cn = !1, 
        // Operations scheduled to be queued in the future. Operations are
        // automatically removed after they are run or canceled.
        this.hn = [], 
        // visible for testing
        this.ln = null, 
        // Flag set while there's an outstanding AsyncQueue operation, used for
        // assertion sanity-checks.
        this.fn = !1, 
        // List of TimerIds to fast-forward delays for.
        this.dn = [], 
        // Backoff timer used to schedule retries for retryable operations
        this._n = new gn(this, "async_queue_retry" /* AsyncQueueRetry */), 
        // Visibility handler that triggers an immediate retry of all retryable
        // operations. Meant to speed up recovery when we regain file system access
        // after page comes into foreground.
        this.wn = () => {
            const t = vn();
            t && g("AsyncQueue", "Visibility state changed to  ", t.visibilityState), this._n.Kt();
        };
        const t = vn();
        t && "function" == typeof t.addEventListener && t.addEventListener("visibilitychange", this.wn);
    }
    // Is this AsyncQueue being shut down? If true, this instance will not enqueue
    // any new operations, Promises from enqueue requests will not resolve.
    get mn() {
        return this.cn;
    }
    /**
     * Adds a new operation to the queue without waiting for it to complete (i.e.
     * we ignore the Promise result).
     */    on(t) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.enqueue(t);
    }
    /**
     * Regardless if the queue has initialized shutdown, adds a new operation to the
     * queue without waiting for it to complete (i.e. we ignore the Promise result).
     */    pn(t) {
        this.yn(), 
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.En(t);
    }
    /**
     * Initialize the shutdown of this queue. Once this method is called, the
     * only possible way to request running an operation is through
     * `enqueueEvenWhileRestricted()`.
     */    In() {
        if (!this.cn) {
            this.cn = !0;
            const t = vn();
            t && "function" == typeof t.removeEventListener && t.removeEventListener("visibilitychange", this.wn);
        }
    }
    /**
     * Adds a new operation to the queue. Returns a promise that will be resolved
     * when the promise returned by the new operation is (with its value).
     */    enqueue(t) {
        return this.yn(), this.cn ? new Promise(t => {}) : this.En(t);
    }
    /**
     * Enqueue a retryable operation.
     *
     * A retryable operation is rescheduled with backoff if it fails with a
     * IndexedDbTransactionError (the error type used by SimpleDb). All
     * retryable operations are executed in order and only run if all prior
     * operations were retried successfully.
     */    An(t) {
        this.an.push(t), this.on(() => this.Tn());
    }
    /**
     * Runs the next operation from the retryable queue. If the operation fails,
     * reschedules with backoff.
     */    async Tn() {
        if (0 !== this.an.length) {
            try {
                await this.an[0](), this.an.shift(), this._n.reset();
            } catch (t) {
                if (!function(t) {
                    // Use name equality, as instanceof checks on errors don't work with errors
                    // that wrap other errors.
                    return "IndexedDbTransactionError" === t.name;
                }(t)) throw t;
 // Failure will be handled by AsyncQueue
                                g("AsyncQueue", "Operation failed with retryable error: " + t);
            }
            this.an.length > 0 && 
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
            this._n.Yt(() => this.Tn());
        }
    }
    En(t) {
        const n = this.un.then(() => (this.fn = !0, t().catch(t => {
            this.ln = t, this.fn = !1;
            // Re-throw the error so that this.tail becomes a rejected Promise and
            // all further attempts to chain (via .then) will just short-circuit
            // and return the rejected Promise.
            throw v("INTERNAL UNHANDLED ERROR: ", 
            /**
 * Chrome includes Error.message in Error.stack. Other browsers do not.
 * This returns expected output of message + stack when available.
 * @param error Error or FirestoreError
 */
            function(t) {
                let n = t.message || "";
                t.stack && (n = t.stack.includes(t.message) ? t.stack : t.message + "\n" + t.stack);
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
 */
            /**
 * Datastore and its related methods are a wrapper around the external Google
 * Cloud Datastore grpc API, which provides an interface that is more convenient
 * for the rest of the client SDK architecture to consume.
 */ (t)), t;
        }).then(t => (this.fn = !1, t))));
        return this.un = n, n;
    }
    /**
     * Schedules an operation to be queued on the AsyncQueue once the specified
     * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
     * or fast-forward the operation prior to its running.
     */    Ht(t, n, e) {
        this.yn(), 
        // Fast-forward delays for timerIds that have been overriden.
        this.dn.indexOf(t) > -1 && (n = 0);
        const r = Nn.en(this, t, n, e, t => this.Pn(t));
        return this.hn.push(r), r;
    }
    yn() {
        this.ln && F();
    }
    /**
     * Verifies there's an operation currently in-progress on the AsyncQueue.
     * Unfortunately we can't verify that the running code is in the promise chain
     * of that operation, so this isn't a foolproof check, but it should be enough
     * to catch some bugs.
     */    Rn() {}
    /**
     * Waits until all currently queued tasks are finished executing. Delayed
     * operations are not run.
     */    async Vn() {
        // Operations in the queue prior to draining may have enqueued additional
        // operations. Keep draining the queue until the tail is no longer advanced,
        // which indicates that no more new operations were enqueued and that all
        // operations were executed.
        let t;
        do {
            t = this.un, await t;
        } while (t !== this.un);
    }
    /**
     * For Tests: Determine if a delayed operation with a particular TimerId
     * exists.
     */    bn(t) {
        for (const n of this.hn) if (n.Lt === t) return !0;
        return !1;
    }
    /**
     * For Tests: Runs some or all delayed operations early.
     *
     * @param lastTimerId Delayed operations up to and including this TimerId will
     *  be drained. Pass TimerId.All to run all delayed operations.
     * @returns a Promise that resolves once all operations have been run.
     */    gn(t) {
        // Note that draining may generate more delayed ops, so we do that first.
        return this.Vn().then(() => {
            // Run ops in the same order they'd run if they ran naturally.
            this.hn.sort((t, n) => t.Xt - n.Xt);
            for (const n of this.hn) if (n.Zt(), "all" /* All */ !== t && n.Lt === t) break;
            return this.Vn();
        });
    }
    /**
     * For Tests: Skip all subsequent delays for a timer id.
     */    vn(t) {
        this.dn.push(t);
    }
    /** Called once a DelayedOperation is run or canceled. */    Pn(t) {
        // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
        const n = this.hn.indexOf(t);
        this.hn.splice(n, 1);
    }
}

/**
 * An implementation of Datastore that exposes additional state for internal
 * consumption.
 */
class $n extends class {} {
    constructor(t, n, e) {
        super(), this.credentials = t, this.Nn = n, this.serializer = e, this.Fn = !1;
    }
    $n() {
        if (this.Fn) throw new R(p, "The client has already been terminated.");
    }
    /** Gets an auth token and invokes the provided RPC. */    Dn(t, n, e) {
        return this.$n(), this.credentials.getToken().then(r => this.Nn.Dn(t, n, e, r)).catch(t => {
            throw t.code === w && this.credentials.R(), t;
        });
    }
    /** Gets an auth token and invokes the provided RPC with streamed results. */    qn(t, n, e) {
        return this.$n(), this.credentials.getToken().then(r => this.Nn.qn(t, n, e, r)).catch(t => {
            throw t.code === w && this.credentials.R(), t;
        });
    }
    terminate() {
        this.Fn = !1;
    }
}

// TODO(firestorexp): Make sure there is only one Datastore instance per
// firestore-exp client.
async function Dn(t, n) {
    const e = D(t), r = Zt(e.serializer) + "/documents", s = {
        writes: n.map(t => tn(e.serializer, t))
    };
    await e.Dn("Commit", r, s);
}

async function qn(t, n) {
    const e = D(t), r = Zt(e.serializer) + "/documents", s = {
        documents: n.map(t => zt(e.serializer, t))
    }, i = await e.qn("BatchGetDocuments", r, s), o = new Map;
    i.forEach(t => {
        const n = Xt(e.serializer, t);
        o.set(n.key.toString(), n);
    });
    const u = [];
    return n.forEach(t => {
        const n = o.get(t.toString());
        $(!!n), u.push(n);
    }), u;
}

async function xn(t, n) {
    const e = D(t), r = nn(e.serializer, Tt(n));
    return (await e.qn("RunQuery", r.parent, {
        structuredQuery: r.structuredQuery
    })).filter(t => !!t.document).map(t => function(t, n, e) {
        const r = Ht(t, n.name), s = Wt(n.updateTime), i = new An({
            mapValue: {
                fields: n.fields
            }
        });
        return new Rn(r, s, i, {
            hasCommittedMutations: !!e
        });
    }(e.serializer, t.document, void 0));
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
 */ const Sn = {
    BatchGetDocuments: "batchGet",
    Commit: "commit",
    RunQuery: "runQuery"
};

/**
 * Maps RPC names to the corresponding REST endpoint name.
 *
 * We use array notation to avoid mangling.
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
 * A Rest-based connection that relies on the native HTTP stack
 * (e.g. `fetch` or a polyfill).
 */
class On extends 
/**
 * Base class for all Rest-based connections to the backend (WebChannel and
 * HTTP).
 */
class {
    constructor(t) {
        this.xn = t, this.s = t.s;
        const n = t.ssl ? "https" : "http";
        this.Sn = n + "://" + t.host, this.On = "projects/" + this.s.projectId + "/databases/" + this.s.database + "/documents";
    }
    Dn(t, n, e, r) {
        const s = this.Cn(t, n);
        g("RestConnection", "Sending: ", s, e);
        const i = {};
        return this.Un(i, r), this.Ln(t, s, i, e).then(t => (g("RestConnection", "Received: ", t), 
        t), n => {
            throw function(t, ...n) {
                if (V.logLevel <= o.WARN) {
                    const e = n.map(N);
                    V.warn("Firestore (7.17.2): " + t, ...e);
                }
            }("RestConnection", t + " failed with error: ", n, "url: ", s, "request:", e), n;
        });
    }
    qn(t, n, e, r) {
        // The REST API automatically aggregates all of the streamed results, so we
        // can just use the normal invoke() method.
        return this.Dn(t, n, e, r);
    }
    /**
     * Modifies the headers for a request, adding any authorization token if
     * present and any additional headers for the request.
     */    Un(t, n) {
        if (t["X-Goog-Api-Client"] = "gl-js/ fire/7.17.2", 
        // Content-Type: text/plain will avoid preflight requests which might
        // mess with CORS and redirects by proxies. If we add custom headers
        // we will need to change this code to potentially use the $httpOverwrite
        // parameter supported by ESF to avoid	triggering preflight requests.
        t["Content-Type"] = "text/plain", n) for (const e in n.m) n.m.hasOwnProperty(e) && (t[e] = n.m[e]);
    }
    Cn(t, n) {
        const e = Sn[t];
        return `${this.Sn}/v1/${n}:${e}`;
    }
} {
    /**
     * @param databaseInfo The connection info.
     * @param fetchImpl `fetch` or a Polyfill that implements the fetch API.
     */
    constructor(t, n) {
        super(t), this.Bn = n;
    }
    Mn(t, n) {
        throw new Error("Not supported by FetchConnection");
    }
    async Ln(t, n, e, r) {
        const s = JSON.stringify(r);
        let i;
        try {
            i = await this.Bn(n, {
                method: "POST",
                headers: e,
                body: s
            });
        } catch (t) {
            throw new R(Lt(t.status), "Request failed with error: " + t.statusText);
        }
        if (!i.ok) throw new R(Lt(i.status), "Request failed with error: " + i.statusText);
        return i.json();
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
/** Initializes the HTTP connection for the REST API. */
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
function Cn(t) {
    return new jt(t, /* useProto3Json= */ !0);
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
 */ const Un = new Map;

// settings() defaults:
/**
 * Returns an initialized and started Datastore for the given Firestore
 * instance. Callers must invoke removeDatastore() when the Firestore
 * instance is terminated.
 */
function Ln(t) {
    var n, e;
    if (t.jn) throw new R(p, "The client has already been terminated.");
    if (!Un.has(t)) {
        g("ComponentProvider", "Initializing Datastore");
        const r = t.kn(), s = new C(t.Qn, t.Gn, null !== (n = r.host) && void 0 !== n ? n : "firestore.googleapis.com", null === (e = r.ssl) || void 0 === e || e, 
        /* forceLongPolling= */ !1), i = function(t) {
            return new On(t, fetch.bind(null));
        }(s), o = Cn(s.s), u = function(t, n, e) {
            return new $n(t, n, e);
        }(t.Wn, i, o);
        Un.set(t, u);
    }
    return Un.get(t);
}

/**
 * Removes all components associated with the provided instance. Must be called
 * when the Firestore instance is terminated.
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
 * The root reference to the Firestore Lite database.
 */
class Bn {
    constructor(t, n) {
        this.app = t, this.Gn = "(lite)", this.Yn = !1, 
        // TODO(firestoreexp): `deleteApp()` should call the delete method above,
        // but it still calls INTERNAL.delete().
        this.INTERNAL = {
            delete: () => this.delete()
        }, this.Qn = Bn.zn(t), this.Wn = new M(n);
    }
    get Hn() {
        return this.Yn;
    }
    get jn() {
        return void 0 !== this.Kn;
    }
    Zn(t) {
        if (this.Yn) throw new R(p, "Firestore has already been started and its settings can no longer be changed. initializeFirestore() cannot be called after calling getFirestore().");
        this.Jn = t;
    }
    kn() {
        return this.Jn || (this.Jn = {}), this.Yn = !0, this.Jn;
    }
    static zn(t) {
        if (!Object.prototype.hasOwnProperty.apply(t.options, [ "projectId" ])) throw new R(h, '"projectId" not provided in firebase.initializeApp.');
        return new U(t.options.projectId);
    }
    delete() {
        return this.Kn || (this.Kn = this.Xn()), this.Kn;
    }
    /**
     * Terminates all components used by this client. Subclasses can override
     * this method to clean up their own dependencies, but must also call this
     * method.
     *
     * Only ever called once.
     */    Xn() {
        return function(t) {
            const n = Un.get(t);
            n && (g("ComponentProvider", "Removing Datastore"), Un.delete(t), n.terminate());
        }(this), Promise.resolve();
    }
}

function Mn(n, e) {
    const r = t(n, "firestore/lite").getImmediate();
    return r.Zn(e), r;
}

function jn(n) {
    return t(n, "firestore/lite").getImmediate();
}

function kn(t) {
    n(t.app, "firestore/lite");
    return j(t, Bn).delete();
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
 */
function Qn(t, n, e) {
    if (n.length !== e) throw new R(h, `Function ${t}() requires ` + te(e, "argument") + ", but was called with " + te(n.length, "argument") + ".");
}

/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */ function Gn(t, n, e) {
    if (n.length < e) throw new R(h, `Function ${t}() requires at least ` + te(e, "argument") + ", but was called with " + te(n.length, "argument") + ".");
}

/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */
function Wn(t, n, e, r) {
    !
    /** Helper to validate the type of a provided input. */
    function(t, n, e, r) {
        let s = !1;
        s = "object" === n ? Hn(r) : "non-empty string" === n ? "string" == typeof r && "" !== r : typeof r === n;
        if (!s) {
            const s = Kn(r);
            throw new R(h, `Function ${t}() requires its ${e} to be of type ${n}, but it was: ${s}`);
        }
    }
    /**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */ (t, n, Xn(e) + " argument", r);
}

/**
 * Validates that `path` refers to a document (indicated by the fact it contains
 * an even numbers of segments).
 */ function Yn(t) {
    if (!H.nt(t)) throw new R(h, `Invalid document reference. Document references must have an even number of segments, but ${t} has ${t.length}.`);
}

/**
 * Validates that `path` refers to a collection (indicated by the fact it
 * contains an odd numbers of segments).
 */ function zn(t) {
    if (H.nt(t)) throw new R(h, `Invalid collection reference. Collection references must have an odd number of segments, but ${t} has ${t.length}.`);
}

function Hn(t) {
    return "object" == typeof t && null !== t && (Object.getPrototypeOf(t) === Object.prototype || null === Object.getPrototypeOf(t));
}

/** Returns a string describing the type / value of the provided input. */ function Kn(t) {
    if (void 0 === t) return "undefined";
    if (null === t) return "null";
    if ("string" == typeof t) return t.length > 20 && (t = t.substring(0, 20) + "..."), 
    JSON.stringify(t);
    if ("number" == typeof t || "boolean" == typeof t) return "" + t;
    if ("object" == typeof t) {
        if (t instanceof Array) return "an array";
        {
            const n = 
            /** Hacky method to try to get the constructor name for an object. */
            function(t) {
                if (t.constructor) {
                    const n = /function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());
                    if (n && n.length > 1) return n[1];
                }
                return null;
            }
            /**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */ (t);
            return n ? `a custom ${n} object` : "an object";
        }
    }
    return "function" == typeof t ? "a function" : F();
}

function Zn(t, n, e, r) {
    const s = Kn(r);
    return new R(h, `Function ${t}() requires its ${Xn(e)} argument to be a ${n}, but it was: ${s}`);
}

function Jn(t, n, e) {
    if (e <= 0) throw new R(h, `Function ${t}() requires its ${Xn(n)} argument to be a positive number, but it was: ${e}.`);
}

/** Converts a number to its english word representation */ function Xn(t) {
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
 */ function te(t, n) {
    return `${t} ${n}` + (1 === t ? "" : "s");
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
/** Helper function to assert Uint8Array is available at runtime. */ function ne() {
    if ("undefined" == typeof Uint8Array) throw new R(I, "Uint8Arrays are not available in this environment.");
}

/** Helper function to assert Base64 functions are available at runtime. */ function ee() {
    if ("undefined" == typeof atob) throw new R(I, "Blobs are unavailable in Firestore in this environment.");
}

/**
 * Immutable class holding a blob (binary data).
 * This class is directly exposed in the public API.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */ class re {
    constructor(t) {
        ee(), this.te = t;
    }
    static fromBase64String(t) {
        Qn("Blob.fromBase64String", arguments, 1), Wn("Blob.fromBase64String", "string", 1, t), 
        ee();
        try {
            return new re(J.fromBase64String(t));
        } catch (t) {
            throw new R(h, "Failed to construct Blob from Base64 string: " + t);
        }
    }
    static fromUint8Array(t) {
        if (Qn("Blob.fromUint8Array", arguments, 1), ne(), !(t instanceof Uint8Array)) throw Zn("Blob.fromUint8Array", "Uint8Array", 1, t);
        return new re(J.fromUint8Array(t));
    }
    toBase64() {
        return Qn("Blob.toBase64", arguments, 0), ee(), this.te.toBase64();
    }
    toUint8Array() {
        return Qn("Blob.toUint8Array", arguments, 0), ne(), this.te.toUint8Array();
    }
    toString() {
        return "Blob(base64: " + this.toBase64() + ")";
    }
    isEqual(t) {
        return this.te.isEqual(t.te);
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
 */ class se {
    constructor(t) {
        !function(t, n, e, r) {
            if (!(n instanceof Array) || n.length < r) throw new R(h, `Function ${t}() requires its ${e} argument to be an array with at least ` + te(r, "element") + ".");
        }("FieldPath", t, "fieldNames", 1);
        for (let n = 0; n < t.length; ++n) if (Wn("FieldPath", "string", n, t[n]), 0 === t[n].length) throw new R(h, "Invalid field name at argument $(i + 1). Field names must not be empty.");
        this.ne = new z(t);
    }
}

/**
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */ class ie extends se {
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
        return new ie(z.Z().G());
    }
    isEqual(t) {
        if (!(t instanceof ie)) throw Zn("isEqual", "FieldPath", 1, t);
        return this.ne.isEqual(t.ne);
    }
}

/**
 * Matches any characters in a field path string that are reserved.
 */ const oe = new RegExp("[~\\*/\\[\\]]");

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
class ue {
    constructor() {
        /** A pointer to the implementing class. */
        this.ee = this;
    }
}

class ae extends ue {
    constructor(t) {
        super(), this.re = t;
    }
    se(t) {
        if (2 /* MergeSet */ !== t.ie) throw 1 /* Update */ === t.ie ? t.oe(this.re + "() can only appear at the top level of your update data") : t.oe(this.re + "() cannot be used with set() unless you pass {merge:true}");
        // No transform to add for a delete, but we need to add it to our
        // fieldMask so it gets deleted.
        return t.Pt.push(t.path), null;
    }
    isEqual(t) {
        return t instanceof ae;
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
 */ function ce(t, n, e) {
    return new Ie({
        ie: 3 /* Argument */ ,
        ue: n.settings.ue,
        methodName: t.re,
        ae: e
    }, n.s, n.serializer, n.ignoreUndefinedProperties);
}

class he extends ue {
    constructor(t) {
        super(), this.re = t;
    }
    se(t) {
        return new dn(t.path, new an);
    }
    isEqual(t) {
        return t instanceof he;
    }
}

class le extends ue {
    constructor(t, n) {
        super(), this.re = t, this.ce = n;
    }
    se(t) {
        const n = ce(this, t, 
        /*array=*/ !0), e = this.ce.map(t => be(t, n)), r = new cn(e);
        return new dn(t.path, r);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class fe extends ue {
    constructor(t, n) {
        super(), this.re = t, this.ce = n;
    }
    se(t) {
        const n = ce(this, t, 
        /*array=*/ !0), e = this.ce.map(t => be(t, n)), r = new hn(e);
        return new dn(t.path, r);
    }
    isEqual(t) {
        // TODO(mrschmidt): Implement isEquals
        return this === t;
    }
}

class de extends ue {
    constructor(t, n) {
        super(), this.re = t, this.he = n;
    }
    se(t) {
        const n = new ln(t.serializer, kt(t.serializer, this.he));
        return new dn(t.path, n);
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
 */ class _e {
    constructor(t, n) {
        if (Qn("GeoPoint", arguments, 2), Wn("GeoPoint", "number", 1, t), Wn("GeoPoint", "number", 2, n), 
        !isFinite(t) || t < -90 || t > 90) throw new R(h, "Latitude must be a number between -90 and 90, but was: " + t);
        if (!isFinite(n) || n < -180 || n > 180) throw new R(h, "Longitude must be a number between -180 and 180, but was: " + n);
        this.le = t, this.fe = n;
    }
    /**
     * Returns the latitude of this geo point, a number between -90 and 90.
     */    get latitude() {
        return this.le;
    }
    /**
     * Returns the longitude of this geo point, a number between -180 and 180.
     */    get longitude() {
        return this.fe;
    }
    isEqual(t) {
        return this.le === t.le && this.fe === t.fe;
    }
    /**
     * Actually private to JS consumers of our API, so this function is prefixed
     * with an underscore.
     */    v(t) {
        return S(this.le, t.le) || S(this.fe, t.fe);
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
 */ const we = /^__.*__$/;

/**
 * A reference to a document in a Firebase project.
 *
 * This class serves as a common base class for the public DocumentReferences
 * exposed in the lite, full and legacy SDK.
 */ class me {
    constructor(t, n, e) {
        this.Qn = t, this.de = n, this._e = e;
    }
}

/** The result of parsing document data (e.g. for a setData call). */ class pe {
    constructor(t, n, e) {
        this.data = t, this.Pt = n, this.fieldTransforms = e;
    }
    we(t, n) {
        const e = [];
        return null !== this.Pt ? e.push(new pn(t, this.data, this.Pt, n)) : e.push(new mn(t, this.data, n)), 
        this.fieldTransforms.length > 0 && e.push(new yn(t, this.fieldTransforms)), e;
    }
}

/** The result of parsing "update" data (i.e. for an updateData call). */ class ye {
    constructor(t, n, e) {
        this.data = t, this.Pt = n, this.fieldTransforms = e;
    }
    we(t, n) {
        const e = [ new pn(t, this.data, this.Pt, n) ];
        return this.fieldTransforms.length > 0 && e.push(new yn(t, this.fieldTransforms)), 
        e;
    }
}

function Ee(t) {
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
        throw F();
    }
}

/** A "context" object passed around while parsing user data. */ class Ie {
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
    constructor(t, n, e, r, s, i) {
        this.settings = t, this.s = n, this.serializer = e, this.ignoreUndefinedProperties = r, 
        // Minor hack: If fieldTransforms is undefined, we assume this is an
        // external call and we need to validate the entire path.
        void 0 === s && this.me(), this.fieldTransforms = s || [], this.Pt = i || [];
    }
    get path() {
        return this.settings.path;
    }
    get ie() {
        return this.settings.ie;
    }
    /** Returns a new context with the specified settings overwritten. */    pe(t) {
        return new Ie(Object.assign(Object.assign({}, this.settings), t), this.s, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.Pt);
    }
    ye(t) {
        var n;
        const e = null === (n = this.path) || void 0 === n ? void 0 : n.child(t), r = this.pe({
            path: e,
            ae: !1
        });
        return r.Ee(t), r;
    }
    Ie(t) {
        var n;
        const e = null === (n = this.path) || void 0 === n ? void 0 : n.child(t), r = this.pe({
            path: e,
            ae: !1
        });
        return r.me(), r;
    }
    Ae(t) {
        // TODO(b/34871131): We don't support array paths right now; so make path
        // undefined.
        return this.pe({
            path: void 0,
            ae: !0
        });
    }
    oe(t) {
        return De(t, this.settings.methodName, this.settings.Te || !1, this.path, this.settings.ue);
    }
    /** Returns 'true' if 'fieldPath' was traversed when creating this context. */    contains(t) {
        return void 0 !== this.Pt.find(n => t.M(n)) || void 0 !== this.fieldTransforms.find(n => t.M(n.field));
    }
    me() {
        // TODO(b/34871131): Remove null check once we have proper paths for fields
        // within arrays.
        if (this.path) for (let t = 0; t < this.path.length; t++) this.Ee(this.path.get(t));
    }
    Ee(t) {
        if (0 === t.length) throw this.oe("Document fields must not be empty");
        if (Ee(this.ie) && we.test(t)) throw this.oe('Document fields cannot begin and end with "__"');
    }
}

/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */ class Ae {
    constructor(t, n, e) {
        this.s = t, this.ignoreUndefinedProperties = n, this.serializer = e || Cn(t);
    }
    /** Creates a new top-level parse context. */    Pe(t, n, e, r = !1) {
        return new Ie({
            ie: t,
            methodName: n,
            ue: e,
            path: z.Y(),
            ae: !1,
            Te: r
        }, this.s, this.serializer, this.ignoreUndefinedProperties);
    }
}

/** Parse document data from a set() call. */ function Te(t, n, e, r, s, i = {}) {
    const o = t.Pe(i.merge || i.mergeFields ? 2 /* MergeSet */ : 0 /* Set */ , n, e, s);
    Ne("Data must be an object, but it was:", o, r);
    const u = ge(r, o);
    let a, c;
    if (i.merge) a = new fn(o.Pt), c = o.fieldTransforms; else if (i.mergeFields) {
        const t = [];
        for (const r of i.mergeFields) {
            let s;
            if (r instanceof se) s = r.ne; else {
                if ("string" != typeof r) throw F();
                s = $e(n, r, e);
            }
            if (!o.contains(s)) throw new R(h, `Field '${s}' is specified in your field mask but missing from your input data.`);
            qe(t, s) || t.push(s);
        }
        a = new fn(t), c = o.fieldTransforms.filter(t => a.vt(t.field));
    } else a = null, c = o.fieldTransforms;
    return new pe(new An(u), a, c);
}

/** Parse update data from an update() call. */ function Pe(t, n, e, r) {
    const s = t.Pe(1 /* Update */ , n, e);
    Ne("Data must be an object, but it was:", s, r);
    const i = [], o = new Tn;
    Z(r, (t, r) => {
        const u = $e(n, t, e), a = s.Ie(u);
        if (r instanceof ue && r.ee instanceof ae) 
        // Add it to the field mask, but don't add anything to updateData.
        i.push(u); else {
            const t = be(r, a);
            null != t && (i.push(u), o.set(u, t));
        }
    });
    const u = new fn(i);
    return new ye(o.qt(), u, s.fieldTransforms);
}

/** Parse update data from a list of field/value arguments. */ function Re(t, n, e, r, s, i) {
    const o = t.Pe(1 /* Update */ , n, e), u = [ Fe(n, r, e) ], a = [ s ];
    if (i.length % 2 != 0) throw new R(h, `Function ${n}() needs to be called with an even number of arguments that alternate between field names and values.`);
    for (let t = 0; t < i.length; t += 2) u.push(Fe(n, i[t])), a.push(i[t + 1]);
    const c = [], l = new Tn;
    // We iterate in reverse order to pick the last value for a field if the
    // user specified the field multiple times.
    for (let t = u.length - 1; t >= 0; --t) if (!qe(c, u[t])) {
        const n = u[t], e = a[t], r = o.Ie(n);
        if (e instanceof ue && e.ee instanceof ae) 
        // Add it to the field mask, but don't add anything to updateData.
        c.push(n); else {
            const t = be(e, r);
            null != t && (c.push(n), l.set(n, t));
        }
    }
    const f = new fn(c);
    return new ye(l.qt(), f, o.fieldTransforms);
}

/**
 * Parse a "query value" (e.g. value in a where filter or a value in a cursor
 * bound).
 *
 * @param allowArrays Whether the query value is an array that may directly
 * contain additional arrays (e.g. the operand of an `in` query).
 */ function Ve(t, n, e, r = !1) {
    return be(e, t.Pe(r ? 4 /* ArrayArgument */ : 3 /* Argument */ , n));
}

/**
 * Parses user data to Protobuf Values.
 *
 * @param input Data to be parsed.
 * @param context A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @return The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */ function be(t, n) {
    if (ve(t)) return Ne("Unsupported field value:", n, t), ge(t, n);
    if (t instanceof ue) 
    // FieldValues usually parse into transforms (except FieldValue.delete())
    // in which case we do not want to include this field in our parsed data
    // (as doing so will overwrite the field directly prior to the transform
    // trying to transform it). So we don't add this location to
    // context.fieldMask and we return null as our parsing result.
    /**
 * "Parses" the provided FieldValueImpl, adding any necessary transforms to
 * context.fieldTransforms.
 */
    return function(t, n) {
        // Sentinels are only supported with writes, and not within arrays.
        if (!Ee(n.ie)) throw n.oe(t.re + "() can only be used with update() and set()");
        if (!n.path) throw n.oe(t.re + "() is not currently supported inside arrays");
        const e = t.se(n);
        e && n.fieldTransforms.push(e);
    }
    /**
 * Helper to parse a scalar value (i.e. not an Object, Array, or FieldValue)
 *
 * @return The parsed value
 */ (t, n), null;
    if (
    // If context.path is null we are inside an array and we don't support
    // field mask paths more granular than the top-level array.
    n.path && n.Pt.push(n.path), t instanceof Array) {
        // TODO(b/34871131): Include the path containing the array in the error
        // message.
        // In the case of IN queries, the parsed data is an array (representing
        // the set of values to be included for the IN query) that may directly
        // contain additional arrays (each representing an individual field
        // value), so we disable this validation.
        if (n.settings.ae && 4 /* ArrayArgument */ !== n.ie) throw n.oe("Nested arrays are not supported");
        return function(t, n) {
            const e = [];
            let r = 0;
            for (const s of t) {
                let t = be(s, n.Ae(r));
                null == t && (
                // Just include nulls in the array for fields being replaced with a
                // sentinel.
                t = {
                    nullValue: "NULL_VALUE"
                }), e.push(t), r++;
            }
            return {
                arrayValue: {
                    values: e
                }
            };
        }(t, n);
    }
    return function(t, n) {
        if (null === t) return {
            nullValue: "NULL_VALUE"
        };
        if ("number" == typeof t) return kt(n.serializer, t);
        if ("boolean" == typeof t) return {
            booleanValue: t
        };
        if ("string" == typeof t) return {
            stringValue: t
        };
        if (t instanceof Date) {
            const e = k.fromDate(t);
            return {
                timestampValue: Qt(n.serializer, e)
            };
        }
        if (t instanceof k) {
            // Firestore backend truncates precision down to microseconds. To ensure
            // offline mode works the same with regards to truncation, perform the
            // truncation immediately without waiting for the backend to do that.
            const e = new k(t.seconds, 1e3 * Math.floor(t.nanoseconds / 1e3));
            return {
                timestampValue: Qt(n.serializer, e)
            };
        }
        if (t instanceof _e) return {
            geoPointValue: {
                latitude: t.latitude,
                longitude: t.longitude
            }
        };
        if (t instanceof re) return {
            bytesValue: (e = n.serializer, r = t, e.Tt ? r.toBase64() : r.toUint8Array())
        };
        if (t instanceof me) {
            const e = n.s, r = t.Qn;
            if (!r.isEqual(e)) throw n.oe(`Document reference is for database ${r.projectId}/${r.database} but should be for database ${e.projectId}/${e.database}`);
            return {
                referenceValue: Yt(t.Qn || n.s, t.de.path)
            };
        }
        if (void 0 === t && n.ignoreUndefinedProperties) return null;
        throw n.oe("Unsupported field value: " + Kn(t));
        var e, r;
    }
    /**
 * Checks whether an object looks like a JSON object that should be converted
 * into a struct. Normal class/prototype instances are considered to look like
 * JSON objects since they should be converted to a struct value. Arrays, Dates,
 * GeoPoints, etc. are not considered to look like JSON objects since they map
 * to specific FieldValue types other than ObjectValue.
 */ (t, n);
}

function ge(t, n) {
    const e = {};
    return !function(t) {
        for (const n in t) if (Object.prototype.hasOwnProperty.call(t, n)) return !1;
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
    /** Converts a Base64 encoded string to a binary string. */ (t) ? Z(t, (t, r) => {
        const s = be(r, n.ye(t));
        null != s && (e[t] = s);
    }) : 
    // If we encounter an empty object, we explicitly add it to the update
    // mask to ensure that the server creates a map entry.
    n.path && n.path.length > 0 && n.Pt.push(n.path), {
        mapValue: {
            fields: e
        }
    };
}

function ve(t) {
    return !("object" != typeof t || null === t || t instanceof Array || t instanceof Date || t instanceof k || t instanceof _e || t instanceof re || t instanceof me || t instanceof ue);
}

function Ne(t, n, e) {
    if (!ve(e) || !Hn(e)) {
        const r = Kn(e);
        throw "an object" === r ? n.oe(t + " a custom object") : n.oe(t + " " + r);
    }
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */ function Fe(t, n, e) {
    if (n instanceof se) return n.ne;
    if ("string" == typeof n) return $e(t, n);
    throw De("Field path arguments must be of type string or FieldPath.", t, 
    /* hasConverter= */ !1, 
    /* path= */ void 0, e);
}

/**
 * Wraps fromDotSeparatedString with an error message about the method that
 * was thrown.
 * @param methodName The publicly visible method name
 * @param path The dot-separated string form of a field path which will be split
 * on dots.
 * @param targetDoc The document against which the field path will be evaluated.
 */ function $e(t, n, e) {
    try {
        return function(t) {
            if (t.search(oe) >= 0) throw new R(h, `Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`);
            try {
                return new ie(...t.split("."));
            } catch (n) {
                throw new R(h, `Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);
            }
        }(n).ne;
    } catch (n) {
        throw De((r = n) instanceof Error ? r.message : r.toString(), t, 
        /* hasConverter= */ !1, 
        /* path= */ void 0, e);
    }
    /**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */
    var r;
    /** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */}

function De(t, n, e, r, s) {
    const i = r && !r.B(), o = void 0 !== s;
    let u = `Function ${n}() called with invalid data`;
    e && (u += " (via `toFirestore()`)"), u += ". ";
    let a = "";
    return (i || o) && (a += " (found", i && (a += " in field " + r), o && (a += " in document " + s), 
    a += ")"), new R(h, u + t + a);
}

function qe(t, n) {
    return t.some(t => t.isEqual(n));
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
 */ class xe extends se {
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
        const n = j(t, xe);
        return this.ne.isEqual(n.ne);
    }
}

function Se() {
    return new xe("__name__");
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
 */ class Oe {
    constructor(t, n, e, r) {
        this.s = t, this.timestampsInSnapshots = n, this.Re = e, this.Ve = r;
    }
    be(t) {
        switch (st(t)) {
          case 0 /* NullValue */ :
            return null;

          case 1 /* BooleanValue */ :
            return t.booleanValue;

          case 2 /* NumberValue */ :
            return ht(t.integerValue || t.doubleValue);

          case 3 /* TimestampValue */ :
            return this.ge(t.timestampValue);

          case 4 /* ServerTimestampValue */ :
            return this.ve(t);

          case 5 /* StringValue */ :
            return t.stringValue;

          case 6 /* BlobValue */ :
            return new re(lt(t.bytesValue));

          case 7 /* RefValue */ :
            return this.Ne(t.referenceValue);

          case 8 /* GeoPointValue */ :
            return this.Fe(t.geoPointValue);

          case 9 /* ArrayValue */ :
            return this.$e(t.arrayValue);

          case 10 /* ObjectValue */ :
            return this.De(t.mapValue);

          default:
            throw F();
        }
    }
    De(t) {
        const n = {};
        return Z(t.fields || {}, (t, e) => {
            n[t] = this.be(e);
        }), n;
    }
    Fe(t) {
        return new _e(ht(t.latitude), ht(t.longitude));
    }
    $e(t) {
        return (t.values || []).map(t => this.be(t));
    }
    ve(t) {
        switch (this.Re) {
          case "previous":
            const n = function t(n) {
                const e = n.mapValue.fields.__previous_value__;
                return nt(e) ? t(e) : e;
            }(t);
            return null == n ? null : this.be(n);

          case "estimate":
            return this.ge(et(t));

          default:
            return null;
        }
    }
    ge(t) {
        const n = ct(t), e = new k(n.seconds, n.nanos);
        return this.timestampsInSnapshots ? e : e.toDate();
    }
    Ne(t) {
        const n = W.W(t);
        $(on(n));
        const e = new U(n.get(1), n.get(3)), r = new H(n.O(5));
        return e.isEqual(this.s) || 
        // TODO(b/64130202): Somehow support foreign references.
        v(`Document ${r} contains a document reference within a different database (${e.projectId}/${e.database}) which is not supported. It will be treated as a reference in the current database (${this.s.projectId}/${this.s.database}) instead.`), 
        this.Ve(r);
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
 */ class Ce {
    // Note: This class is stripped down version of the DocumentSnapshot in
    // the legacy SDK. The changes are:
    // - No support for SnapshotMetadata.
    // - No support for SnapshotOptions.
    constructor(t, n, e, r) {
        this.qe = t, this.de = n, this.xe = e, this._e = r;
    }
    get id() {
        return this.de.path.L();
    }
    get ref() {
        return new Ke(this.qe, this._e, this.de.path);
    }
    exists() {
        return null !== this.xe;
    }
    data() {
        if (this.xe) {
            if (this._e) {
                // We only want to use the converter and create a new DocumentSnapshot
                // if a converter has been provided.
                const t = new Ue(this.qe, this.de, this.xe, 
                /* converter= */ null);
                return this._e.fromFirestore(t);
            }
            return new Oe(this.qe.Qn, 
            /* timestampsInSnapshots= */ !0, 
            /* serverTimestampBehavior=*/ "none", t => new Ke(this.qe, 
            /* converter= */ null, t.path)).be(this.xe.Ct());
        }
    }
    get(t) {
        if (this.xe) {
            const n = this.xe.data().field(Me("DocumentSnapshot.get", t));
            if (null !== n) {
                return new Oe(this.qe.Qn, 
                /* timestampsInSnapshots= */ !0, 
                /* serverTimestampBehavior=*/ "none", t => new Ke(this.qe, this._e, t.path)).be(n);
            }
        }
    }
}

class Ue extends Ce {
    data() {
        return super.data();
    }
}

class Le {
    constructor(t, n) {
        this.query = t, this.Se = n;
    }
    get docs() {
        return [ ...this.Se ];
    }
    get size() {
        return this.docs.length;
    }
    get empty() {
        return 0 === this.docs.length;
    }
    forEach(t, n) {
        this.Se.forEach(t, n);
    }
}

function Be(t, n) {
    return t instanceof Ce && n instanceof Ce ? t.qe === n.qe && t.de.isEqual(n.de) && (null === t.xe ? null === n.xe : t.xe.isEqual(n.xe)) && t._e === n._e : t instanceof Le && n instanceof Le && (br(t.query, n.query) && O(t.docs, n.docs, Be));
}

/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */ function Me(t, n) {
    if ("string" == typeof n) return $e(t, n);
    return j(n, xe).ne;
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
 */ class je {
    constructor(t) {
        this.Oe = t, 
        // The version of each document that was read during this transaction.
        this.Ce = new Map, this.mutations = [], this.Ue = !1, 
        /**
         * A deferred usage error that occurred previously in this transaction that
         * will cause the transaction to fail once it actually commits.
         */
        this.Le = null, 
        /**
         * Set of documents that have been written in the transaction.
         *
         * When there's more than one write to the same key in a transaction, any
         * writes after the first are handled differently.
         */
        this.Be = new Set;
    }
    async Me(t) {
        if (this.je(), this.mutations.length > 0) throw new R(h, "Firestore transactions require all reads to be executed before all writes.");
        const n = await qn(this.Oe, t);
        return n.forEach(t => {
            t instanceof Vn || t instanceof Rn ? this.ke(t) : F();
        }), n;
    }
    set(t, n) {
        this.write(n.we(t, this.bt(t))), this.Be.add(t);
    }
    update(t, n) {
        try {
            this.write(n.we(t, this.Qe(t)));
        } catch (t) {
            this.Le = t;
        }
        this.Be.add(t);
    }
    delete(t) {
        this.write([ new En(t, this.bt(t)) ]), this.Be.add(t);
    }
    async commit() {
        if (this.je(), this.Le) throw this.Le;
        const t = this.Ce;
        // For each mutation, note that the doc was written.
                this.mutations.forEach(n => {
            t.delete(n.key.toString());
        }), 
        // For each document that was read but not written to, we want to perform
        // a `verify` operation.
        t.forEach((t, n) => {
            const e = new H(W.W(n));
            this.mutations.push(new In(e, this.bt(e)));
        }), await Dn(this.Oe, this.mutations), this.Ue = !0;
    }
    ke(t) {
        let n;
        if (t instanceof Rn) n = t.version; else {
            if (!(t instanceof Vn)) throw F();
            // For deleted docs, we must use baseVersion 0 when we overwrite them.
            n = Q.min();
        }
        const e = this.Ce.get(t.key.toString());
        if (e) {
            if (!n.isEqual(e)) 
            // This transaction will fail no matter what.
            throw new R(y, "Document version changed between two reads.");
        } else this.Ce.set(t.key.toString(), n);
    }
    /**
     * Returns the version of this document when it was read in this transaction,
     * as a precondition, or no precondition if it was not read.
     */    bt(t) {
        const n = this.Ce.get(t.toString());
        return !this.Be.has(t) && n ? _n.updateTime(n) : _n.Nt();
    }
    /**
     * Returns the precondition for a document if the operation is an update.
     */    Qe(t) {
        const n = this.Ce.get(t.toString());
        // The first time a document is written, we want to take into account the
        // read time and existence
                if (!this.Be.has(t) && n) {
            if (n.isEqual(Q.min())) 
            // The document doesn't exist, so fail the transaction.
            // This has to be validated locally because you can't send a
            // precondition that a document does not exist without changing the
            // semantics of the backend write to be an insert. This is the reverse
            // of what we want, since we want to assert that the document doesn't
            // exist but then send the update and have it fail. Since we can't
            // express that to the backend, we have to validate locally.
            // Note: this can change once we can send separate verify writes in the
            // transaction.
            throw new R(h, "Can't update a document that doesn't exist.");
            // Document exists, base precondition on document update time.
                        return _n.updateTime(n);
        }
        // Document was not read, so we just use the preconditions for a blind
        // update.
        return _n.exists(!0);
    }
    write(t) {
        this.je(), this.mutations = this.mutations.concat(t);
    }
    je() {}
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
class ke {
    constructor(t, n, e, r) {
        this.Jt = t, this.Oe = n, this.updateFunction = e, this.nn = r, this.Ge = 5, this._n = new gn(this.Jt, "transaction_retry" /* TransactionRetry */);
    }
    /** Runs the transaction and sets the result on deferred. */    We() {
        this.Ye();
    }
    Ye() {
        this._n.Yt(async () => {
            const t = new je(this.Oe), n = this.ze(t);
            n && n.then(n => {
                this.Jt.on(() => t.commit().then(() => {
                    this.nn.resolve(n);
                }).catch(t => {
                    this.He(t);
                }));
            }).catch(t => {
                this.He(t);
            });
        });
    }
    ze(t) {
        try {
            const n = this.updateFunction(t);
            return !X(n) && n.catch && n.then ? n : (this.nn.reject(Error("Transaction callback must return a Promise")), 
            null);
        } catch (t) {
            // Do not retry errors thrown by user provided updateFunction.
            return this.nn.reject(t), null;
        }
    }
    He(t) {
        this.Ge > 0 && this.Ke(t) ? (this.Ge -= 1, this.Jt.on(() => (this.Ye(), Promise.resolve()))) : this.nn.reject(t);
    }
    Ke(t) {
        if ("FirebaseError" === t.name) {
            // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
            // non-matching document versions with ABORTED. These errors should be retried.
            const n = t.code;
            return "aborted" === n || "failed-precondition" === n || !
            /**
 * Determines whether an error code represents a permanent error when received
 * in response to a non-write operation.
 *
 * See isPermanentWriteError for classifying write errors.
 */
            function(t) {
                switch (t) {
                  case u:
                    return F();

                  case a:
                  case c:
                  case l:
                  case m:
                  case A:
                  case T:
 // Unauthenticated means something went wrong with our token and we need
                    // to retry with new credentials which will happen automatically.
                                      case w:
                    return !1;

                  case h:
                  case f:
                  case d:
                  case _:
                  case p:
 // Aborted might be retried in some scenarios, but that is dependant on
                    // the context and should handled individually by the calling code.
                    // See https://cloud.google.com/apis/design/errors.
                                      case y:
                  case E:
                  case I:
                  case P:
                    return !0;

                  default:
                    return F();
                }
            }(n);
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
 */ function Qe(t, n, e, r, s, i, o) {
    let u;
    if (s.K()) {
        if ("array-contains" /* ARRAY_CONTAINS */ === i || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === i) throw new R(h, `Invalid Query. You can't perform '${i}' queries on FieldPath.documentId().`);
        if ("in" /* IN */ === i || "not-in" /* NOT_IN */ === i) {
            Ye(o, i);
            const n = [];
            for (const e of o) n.push(We(r, t, e));
            u = {
                arrayValue: {
                    values: n
                }
            };
        } else u = We(r, t, o);
    } else "in" /* IN */ !== i && "not-in" /* NOT_IN */ !== i && "array-contains-any" /* ARRAY_CONTAINS_ANY */ !== i || Ye(o, i), 
    u = Ve(e, n, o, 
    /* allowArrays= */ "in" /* IN */ === i || "not-in" /* NOT_IN */ === i);
    const a = Rt.create(s, i, u);
    return function(t, n) {
        if (n.yt()) {
            const e = t.pt();
            if (null !== e && !e.isEqual(n.field)) throw new R(h, `Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '${e.toString()}' and '${n.field.toString()}'`);
            const r = t.wt();
            null !== r && ze(t, n.field, r);
        }
        const e = t.Et(
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
        }(n.op));
        if (null !== e) 
        // Special case when it's a duplicate op to give a slightly clearer error message.
        throw e === n.op ? new R(h, `Invalid query. You cannot use more than one '${n.op.toString()}' filter.`) : new R(h, `Invalid query. You cannot use '${n.op.toString()}' filters with '${e.toString()}' filters.`);
    }(t, a), a;
}

function Ge(t, n, e) {
    if (null !== t.startAt) throw new R(h, "Invalid query. You must not call startAt() or startAfter() before calling orderBy().");
    if (null !== t.endAt) throw new R(h, "Invalid query. You must not call endAt() or endBefore() before calling orderBy().");
    const r = new St(n, e);
    return function(t, n) {
        if (null === t.wt()) {
            // This is the first order by. It must match any inequality.
            const e = t.pt();
            null !== e && ze(t, e, n.field);
        }
    }(t, r), r;
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
function We(t, n, e) {
    if ("string" == typeof e) {
        if ("" === e) throw new R(h, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");
        if (!It(n) && -1 !== e.indexOf("/")) throw new R(h, `Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '${e}' contains a '/' character.`);
        const r = n.path.child(W.W(e));
        if (!H.nt(r)) throw new R(h, `Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);
        return ft(t, new H(r));
    }
    if (e instanceof me) return ft(t, e.de);
    throw new R(h, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: " + Kn(e) + ".");
}

/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */ function Ye(t, n) {
    if (!Array.isArray(t) || 0 === t.length) throw new R(h, `Invalid Query. A non-empty array is required for '${n.toString()}' filters.`);
    if (t.length > 10) throw new R(h, `Invalid Query. '${n.toString()}' filters support a maximum of 10 elements in the value array.`);
    if ("in" /* IN */ === n || "array-contains-any" /* ARRAY_CONTAINS_ANY */ === n) {
        if (t.indexOf(null) >= 0) throw new R(h, `Invalid Query. '${n.toString()}' filters cannot contain 'null' in the value array.`);
        if (t.filter(t => Number.isNaN(t)).length > 0) throw new R(h, `Invalid Query. '${n.toString()}' filters cannot contain 'NaN' in the value array.`);
    }
}

function ze(t, n, e) {
    if (!e.isEqual(n)) throw new R(h, `Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '${n.toString()}' and so you must also use '${n.toString()}' as your first orderBy(), but your first orderBy() is on field '${e.toString()}' instead.`);
}

/**
 * Converts custom model object of type T into DocumentData by applying the
 * converter if it exists.
 *
 * This function is used when converting user objects to DocumentData
 * because we want to provide the user with a more specific error message if
 * their set() or fails due to invalid data originating from a toFirestore()
 * call.
 */
function He(t, n, e) {
    let r;
    // Cast to `any` in order to satisfy the union type constraint on
    // toFirestore().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return r = t ? e && (e.merge || e.mergeFields) ? t.toFirestore(n, e) : t.toFirestore(n) : n, 
    r;
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
 */ class Ke extends me {
    constructor(t, n, e) {
        super(t.Qn, new H(e), n), this.firestore = t, this.converter = n, this.Ze = e, this.type = "document";
    }
    get id() {
        return this.Ze.L();
    }
    get path() {
        return this.Ze.G();
    }
    withConverter(t) {
        return new Ke(this.firestore, t, this.Ze);
    }
}

class Ze {
    // This is the lite version of the Query class in the main SDK.
    constructor(t, n, e) {
        this.firestore = t, this.converter = n, this.Je = e, this.type = "query";
    }
    withConverter(t) {
        return new Ze(this.firestore, t, this.Je);
    }
}

class Je {}

function Xe(t, ...n) {
    let e = j(t, Ze);
    for (const t of n) e = t.apply(e);
    return e;
}

class tr extends Je {
    constructor(t, n, e) {
        super(), this.Xe = t, this.tr = n, this.nr = e, this.type = "where";
    }
    apply(t) {
        const n = gr(t.firestore), e = Qe(t.Je, "where", n, t.firestore.Qn, this.Xe, this.tr, this.nr);
        return new Ze(t.firestore, t.converter, function(t, n) {
            const e = t.filters.concat([ n ]);
            return new Et(t.path, t.collectionGroup, t.ut.slice(), e, t.limit, t.at, t.startAt, t.endAt);
        }(t.Je, e));
    }
}

function nr(t, n, e) {
    // TODO(firestorelite): Consider validating the enum strings (note that
    // TypeScript does not support passing invalid values).
    const r = n, s = Me("where", t);
    return new tr(s, r, e);
}

class er extends Je {
    constructor(t, n) {
        super(), this.Xe = t, this.er = n, this.type = "orderBy";
    }
    apply(t) {
        const n = Ge(t.Je, this.Xe, this.er);
        return new Ze(t.firestore, t.converter, function(t, n) {
            // TODO(dimond): validate that orderBy does not list the same key twice.
            const e = t.ut.concat([ n ]);
            return new Et(t.path, t.collectionGroup, e, t.filters.slice(), t.limit, t.at, t.startAt, t.endAt);
        }(t.Je, n));
    }
}

function rr(t, n = "asc") {
    // TODO(firestorelite): Consider validating the enum strings (note that
    // TypeScript does not support passing invalid values).
    const e = n, r = Me("orderBy", t);
    return new er(r, e);
}

class sr extends Je {
    constructor(t, n, e) {
        super(), this.type = t, this.rr = n, this.sr = e;
    }
    apply(t) {
        return new Ze(t.firestore, t.converter, function(t, n, e) {
            return new Et(t.path, t.collectionGroup, t.ut.slice(), t.filters.slice(), n, e, t.startAt, t.endAt);
        }(t.Je, this.rr, this.sr));
    }
}

function ir(t) {
    return Jn("limit", 1, t), new sr("limit", t, "F" /* First */);
}

function or(t) {
    return Jn("limitToLast", 1, t), new sr("limitToLast", t, "L" /* Last */);
}

class ur extends Je {
    constructor(t, n, e) {
        super(), this.type = t, this.ir = n, this.or = e;
    }
    apply(t) {
        const n = dr(t, this.type, this.ir, this.or);
        return new Ze(t.firestore, t.converter, function(t, n) {
            return new Et(t.path, t.collectionGroup, t.ut.slice(), t.filters.slice(), t.limit, t.at, n, t.endAt);
        }(t.Je, n));
    }
}

function ar(...t) {
    return new ur("startAt", t, /*before=*/ !0);
}

function cr(...t) {
    return new ur("startAfter", t, 
    /*before=*/ !1);
}

class hr extends Je {
    constructor(t, n, e) {
        super(), this.type = t, this.ir = n, this.or = e;
    }
    apply(t) {
        const n = dr(t, this.type, this.ir, this.or);
        return new Ze(t.firestore, t.converter, function(t, n) {
            return new Et(t.path, t.collectionGroup, t.ut.slice(), t.filters.slice(), t.limit, t.at, t.startAt, n);
        }(t.Je, n));
    }
}

function lr(...t) {
    return new hr("endBefore", t, /*before=*/ !0);
}

function fr(...t) {
    return new hr("endAt", t, /*before=*/ !1);
}

/** Helper function to create a bound from a document or fields */ function dr(t, n, e, r) {
    if (e[0] instanceof Ce) return Qn(n, e, 1), function(t, n, e, r, s) {
        if (!r) throw new R(f, "Can't use a DocumentSnapshot that doesn't exist for " + e + "().");
        const i = [];
        // Because people expect to continue/end a query at the exact document
        // provided, we need to use the implicit sort order rather than the explicit
        // sort order, because it's guaranteed to contain the document key. That way
        // the position becomes unambiguous and the query continues/ends exactly at
        // the provided document. Without the key (by using the explicit sort
        // orders), multiple documents could match the position, yielding duplicate
        // results.
                for (const e of At(t)) if (e.field.K()) i.push(ft(n, r.key)); else {
            const t = r.field(e.field);
            if (nt(t)) throw new R(h, 'Invalid query. You are trying to start or end a query using a document for which the field "' + e.field + '" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');
            if (null === t) {
                const t = e.field.G();
                throw new R(h, `Invalid query. You are trying to start or end a query using a document for which the field '${t}' (used as the orderBy) does not exist.`);
            }
            i.push(t);
        }
        return new qt(i, s);
    }
    /**
 * Converts a list of field values to a Bound for the given query.
 */ (t.Je, t.firestore.Qn, n, e[0].xe, r);
    {
        const s = gr(t.firestore);
        return function(t, n, e, r, s, i) {
            // Use explicit order by's because it has to match the query the user made
            const o = t.ut;
            if (s.length > o.length) throw new R(h, `Too many arguments provided to ${r}(). The number of arguments must be less than or equal to the number of orderBy() clauses`);
            const u = [];
            for (let i = 0; i < s.length; i++) {
                const a = s[i];
                if (o[i].field.K()) {
                    if ("string" != typeof a) throw new R(h, `Invalid query. Expected a string for document ID in ${r}(), but got a ${typeof a}`);
                    if (!It(t) && -1 !== a.indexOf("/")) throw new R(h, `Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to ${r}() must be a plain document ID, but '${a}' contains a slash.`);
                    const e = t.path.child(W.W(a));
                    if (!H.nt(e)) throw new R(h, `Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to ${r}() must result in a valid document path, but '${e}' is not because it contains an odd number of segments.`);
                    const s = new H(e);
                    u.push(ft(n, s));
                } else {
                    const t = Ve(e, r, a);
                    u.push(t);
                }
            }
            return new qt(u, i);
        }(t.Je, t.firestore.Qn, s, n, e, r);
    }
}

class _r extends Ze {
    constructor(t, n, e) {
        super(t, e, new Et(n)), this.firestore = t, this.Ze = n, this.type = "collection";
    }
    get id() {
        return this.Je.path.L();
    }
    get path() {
        return this.Je.path.G();
    }
    withConverter(t) {
        return new _r(this.firestore, this.Ze, t);
    }
}

function wr(t, n) {
    if (Wn("collection", "non-empty string", 2, n), t instanceof Bn) {
        const e = W.W(n);
        return zn(e), new _r(t, e, /* converter= */ null);
    }
    {
        if (!(t instanceof Ke || t instanceof _r)) throw new R(h, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
        const e = W.W(t.path).child(W.W(n));
        return zn(e), new _r(t.firestore, e, 
        /* converter= */ null);
    }
}

// TODO(firestorelite): Consider using ErrorFactory -
// https://github.com/firebase/firebase-js-sdk/blob/0131e1f/packages/util/src/errors.ts#L106
function mr(t, n) {
    const e = j(t, Bn);
    if (Wn("collectionGroup", "non-empty string", 1, n), n.indexOf("/") >= 0) throw new R(h, `Invalid collection ID '${n}' passed to function collectionGroup(). Collection IDs must not contain '/'.`);
    return new Ze(e, 
    /* converter= */ null, 
    /**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
    function(t) {
        return new Et(W.Y(), t);
    }(n));
}

function pr(t, n) {
    if (
    // We allow omission of 'pathString' but explicitly prohibit passing in both
    // 'undefined' and 'null'.
    1 === arguments.length && (n = x.t()), Wn("doc", "non-empty string", 2, n), t instanceof Bn) {
        const e = W.W(n);
        return Yn(e), new Ke(t, /* converter= */ null, e);
    }
    {
        if (!(t instanceof Ke || t instanceof _r)) throw new R(h, "Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");
        const e = t.Ze.child(W.W(n));
        return Yn(e), new Ke(t.firestore, t instanceof _r ? t.converter : null, e);
    }
}

function yr(t) {
    if (t instanceof _r) {
        const n = t.Ze.C();
        return n.B() ? null : new Ke(t.firestore, 
        /* converter= */ null, n);
    }
    {
        const n = j(t, Ke);
        return new _r(n.firestore, n.de.path.C(), n._e);
    }
}

function Er(t) {
    const n = j(t, Ke);
    return qn(Ln(n.firestore), [ n.de ]).then(t => {
        $(1 === t.length);
        const e = t[0];
        return new Ce(n.firestore, n.de, e instanceof Rn ? e : null, n._e);
    });
}

function Ir(t) {
    const n = j(t, Ze);
    !function(t) {
        if (t._t() && 0 === t.ut.length) throw new R(I, "limitToLast() queries require specifying at least one orderBy() clause");
    }(n.Je);
    return xn(Ln(n.firestore), n.Je).then(e => {
        const r = e.map(t => new Ue(n.firestore, t.key, t, n.converter));
        return n.Je._t() && 
        // Limit to last queries reverse the orderBy constraint that was
        // specified by the user. As such, we need to reverse the order of the
        // results to return the documents in the expected order.
        r.reverse(), new Le(t, r);
    });
}

function Ar(t, n, e) {
    const r = j(t, Ke), s = He(r._e, n, e), i = Te(gr(r.firestore), "setDoc", r.de, s, null !== r._e, e);
    return Dn(Ln(r.firestore), i.we(r.de, _n.Nt()));
}

function Tr(t, n, e, ...r) {
    const s = j(t, Ke), i = gr(s.firestore);
    let o;
    o = "string" == typeof n || n instanceof xe ? Re(i, "updateDoc", s.de, n, e, r) : Pe(i, "updateDoc", s.de, n);
    return Dn(Ln(s.firestore), o.we(s.de, _n.exists(!0)));
}

function Pr(t) {
    const n = j(t, Ke);
    return Dn(Ln(n.firestore), [ new En(n.de, _n.Nt()) ]);
}

function Rr(t, n) {
    const e = j(t, _r), r = pr(e), s = He(e.converter, n), i = Te(gr(e.firestore), "addDoc", r.de, s, null !== r._e, {});
    return Dn(Ln(e.firestore), i.we(r.de, _n.exists(!1))).then(() => r);
}

function Vr(t, n) {
    return (t instanceof Ke || t instanceof _r) && (n instanceof Ke || n instanceof _r) && (t.firestore === n.firestore && t.path === n.path && t.converter === n.converter);
}

function br(t, n) {
    return t instanceof Ze && n instanceof Ze && (t.firestore === n.firestore && Pt(t.Je, n.Je) && t.converter === n.converter);
}

function gr(t) {
    const n = t.kn(), e = Cn(t.Qn);
    return new Ae(t.Qn, !!n.ignoreUndefinedProperties, e);
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
/** The public FieldValue class of the lite API. */ class vr extends ue {}

/**
 * A delegate class that allows the FieldValue implementations returned by
 * deleteField(), serverTimestamp(), arrayUnion(), arrayRemove() and
 * increment() to be an instance of the lite FieldValue class declared above.
 *
 * We don't directly subclass `FieldValue` in the various field value
 * implementations as the base FieldValue class differs between the lite, full
 * and legacy SDK.
 */ class Nr extends vr {
    constructor(t) {
        super(), this.ee = t, this.re = t.re;
    }
    se(t) {
        return this.ee.se(t);
    }
    isEqual(t) {
        return t instanceof Nr && this.ee.isEqual(t.ee);
    }
}

function Fr() {
    return new Nr(new ae("deleteField"));
}

function $r() {
    return new Nr(new he("serverTimestamp"));
}

function Dr(...t) {
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we'd need the Firestore instance to do this.
    return Gn("arrayUnion()", arguments, 1), new Nr(new le("arrayUnion", t));
}

function qr(...t) {
    // NOTE: We don't actually parse the data until it's used in set() or
    // update() since we'd need the Firestore instance to do this.
    return Gn("arrayRemove()", arguments, 1), new Nr(new fe("arrayRemove", t));
}

function xr(t) {
    return new Nr(new de("increment", t));
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
 */ class Sr {
    constructor(t, n) {
        this.qe = t, this.ur = n, this.ar = [], this.cr = !1, this.hr = gr(t);
    }
    set(t, n, e) {
        this.lr();
        const r = Or(t, this.qe), s = He(r._e, n, e), i = Te(this.hr, "WriteBatch.set", r.de, s, null !== r._e, e);
        return this.ar = this.ar.concat(i.we(r.de, _n.Nt())), this;
    }
    update(t, n, e, ...r) {
        this.lr();
        const s = Or(t, this.qe);
        let i;
        return i = "string" == typeof n || n instanceof xe ? Re(this.hr, "WriteBatch.update", s.de, n, e, r) : Pe(this.hr, "WriteBatch.update", s.de, n), 
        this.ar = this.ar.concat(i.we(s.de, _n.exists(!0))), this;
    }
    delete(t) {
        this.lr();
        const n = Or(t, this.qe);
        return this.ar = this.ar.concat(new En(n.de, _n.Nt())), this;
    }
    commit() {
        return this.lr(), this.cr = !0, this.ar.length > 0 ? this.ur(this.ar) : Promise.resolve();
    }
    lr() {
        if (this.cr) throw new R(p, "A write batch can no longer be used after commit() has been called.");
    }
}

function Or(t, n) {
    if (t.firestore !== n) throw new R(h, "Provided document reference is from a different Firestore instance.");
    return j(t, Ke);
}

function Cr(t) {
    const n = j(t, Bn), e = Ln(n);
    return new Sr(n, t => Dn(e, t));
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
class Ur {
    constructor(t, n) {
        this.qe = t, this.dr = n, this.hr = gr(t);
    }
    get(t) {
        const n = Or(t, this.qe);
        return this.dr.Me([ n.de ]).then(t => {
            if (!t || 1 !== t.length) return F();
            const e = t[0];
            if (e instanceof Vn) return new Ce(this.qe, n.de, null, n._e);
            if (e instanceof Rn) return new Ce(this.qe, e.key, e, n._e);
            throw F();
        });
    }
    set(t, n, e) {
        const r = Or(t, this.qe), s = He(r._e, n, e), i = Te(this.hr, "Transaction.set", r.de, s, null !== r._e, e);
        return this.dr.set(r.de, i), this;
    }
    update(t, n, e, ...r) {
        const s = Or(t, this.qe);
        let i;
        return i = "string" == typeof n || n instanceof xe ? Re(this.hr, "Transaction.update", s.de, n, e, r) : Pe(this.hr, "Transaction.update", s.de, n), 
        this.dr.update(s.de, i), this;
    }
    delete(t) {
        const n = Or(t, this.qe);
        return this.dr.delete(n.de), this;
    }
}

function Lr(t, n) {
    const e = j(t, Bn), r = Ln(e), s = new bn;
    return new ke(new Fn, r, t => n(new Ur(e, t)), s).We(), s.promise;
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
 */ e(new s("firestore/lite", t => ((t, n) => new Bn(t, n))(t.getProvider("app-exp").getImmediate(), t.getProvider("auth-internal")), "PUBLIC" /* PUBLIC */)), 
r("firestore-lite", "1.16.3", "node");

export { re as Blob, _r as CollectionReference, Ke as DocumentReference, Ce as DocumentSnapshot, xe as FieldPath, vr as FieldValue, Bn as FirebaseFirestore, _e as GeoPoint, Ze as Query, Je as QueryConstraint, Ue as QueryDocumentSnapshot, Le as QuerySnapshot, k as Timestamp, Ur as Transaction, Sr as WriteBatch, Rr as addDoc, qr as arrayRemove, Dr as arrayUnion, wr as collection, mr as collectionGroup, Pr as deleteDoc, Fr as deleteField, pr as doc, Se as documentId, fr as endAt, lr as endBefore, Er as getDoc, Ir as getDocs, jn as getFirestore, xr as increment, Mn as initializeFirestore, ir as limit, or as limitToLast, rr as orderBy, yr as parent, Xe as query, br as queryEqual, Vr as refEqual, Lr as runTransaction, $r as serverTimestamp, Ar as setDoc, b as setLogLevel, Be as snapshotEqual, cr as startAfter, ar as startAt, kn as terminate, Tr as updateDoc, nr as where, Cr as writeBatch };
//# sourceMappingURL=index.browser.esm2017.js.map
