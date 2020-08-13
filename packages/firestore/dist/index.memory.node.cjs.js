'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib = require('tslib');
var firebase = _interopDefault(require('@firebase/app'));
var logger = require('@firebase/logger');
var util = require('util');
var crypto = require('crypto');
require('@firebase/util');
var protoLoader = require('@grpc/proto-loader');
var grpcJs = require('@grpc/grpc-js');
var path = require('path');
require('protobufjs');
var package_json = require('@grpc/grpc-js/package.json');
var component = require('@firebase/component');

var version = "7.17.2";
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
function formatJSON(value) {
    // util.inspect() results in much more readable output than JSON.stringify()
    return util.inspect(value, { depth: 100 });
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
var logClient = new logger.Logger('@firebase/firestore');
// Helper methods are needed because variables can't be exported as read/write
function getLogLevel() {
    return logClient.logLevel;
}
function setLogLevel(newLevel) {
    logClient.setLogLevel(newLevel);
}
function logDebug(msg) {
    var obj = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        obj[_i - 1] = arguments[_i];
    }
    if (logClient.logLevel <= logger.LogLevel.DEBUG) {
        var args = obj.map(argToString);
        logClient.debug.apply(logClient, tslib.__spreadArrays(["Firestore (" + version + "): " + msg], args));
    }
}
function logError(msg) {
    var obj = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        obj[_i - 1] = arguments[_i];
    }
    if (logClient.logLevel <= logger.LogLevel.ERROR) {
        var args = obj.map(argToString);
        logClient.error.apply(logClient, tslib.__spreadArrays(["Firestore (" + version + "): " + msg], args));
    }
}
function logWarn(msg) {
    var obj = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        obj[_i - 1] = arguments[_i];
    }
    if (logClient.logLevel <= logger.LogLevel.WARN) {
        var args = obj.map(argToString);
        logClient.warn.apply(logClient, tslib.__spreadArrays(["Firestore (" + version + "): " + msg], args));
    }
}
/**
 * Converts an additional log parameter to a string representation.
 */
function argToString(obj) {
    if (typeof obj === 'string') {
        return obj;
    }
    else {
        try {
            return formatJSON(obj);
        }
        catch (e) {
            // Converting to JSON failed, just log the object directly
            return obj;
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
 * Unconditionally fails, throwing an Error with the given message.
 * Messages are stripped in production builds.
 *
 * Returns `never` and can be used in expressions:
 * @example
 * let futureVar = fail('not implemented yet');
 */
function fail(failure) {
    if (failure === void 0) { failure = 'Unexpected state'; }
    // Log the failure in addition to throw an exception, just in case the
    // exception is swallowed.
    var message = "FIRESTORE (" + version + ") INTERNAL ASSERTION FAILED: " + failure;
    logError(message);
    // NOTE: We don't use FirestoreError here because these are internal failures
    // that cannot be handled by the user. (Also it would create a circular
    // dependency between the error and assert modules which doesn't work.)
    throw new Error(message);
}
/**
 * Fails if the given assertion condition is false, throwing an Error with the
 * given message if it did.
 *
 * Messages are stripped in production builds.
 */
function hardAssert(assertion, message) {
    if (!assertion) {
        fail();
    }
}
/**
 * Casts `obj` to `T`. In non-production builds, verifies that `obj` is an
 * instance of `T` before casting.
 */
function debugCast(obj, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
constructor) {
    return obj;
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
 */
function randomBytes(nBytes) {
    return crypto.randomBytes(nBytes);
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
var AutoId = /** @class */ (function () {
    function AutoId() {
    }
    AutoId.newId = function () {
        // Alphanumeric characters
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        // The largest byte value that is a multiple of `char.length`.
        var maxMultiple = Math.floor(256 / chars.length) * chars.length;
        var autoId = '';
        var targetLength = 20;
        while (autoId.length < targetLength) {
            var bytes = randomBytes(40);
            for (var i = 0; i < bytes.length; ++i) {
                // Only accept values that are [0, maxMultiple), this ensures they can
                // be evenly mapped to indices of `chars` via a modulo operation.
                if (autoId.length < targetLength && bytes[i] < maxMultiple) {
                    autoId += chars.charAt(bytes[i] % chars.length);
                }
            }
        }
        return autoId;
    };
    return AutoId;
}());
function primitiveComparator(left, right) {
    if (left < right) {
        return -1;
    }
    if (left > right) {
        return 1;
    }
    return 0;
}
/** Helper to compare arrays using isEqual(). */
function arrayEquals(left, right, comparator) {
    if (left.length !== right.length) {
        return false;
    }
    return left.every(function (value, index) { return comparator(value, right[index]); });
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
var DatabaseInfo = /** @class */ (function () {
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
    function DatabaseInfo(databaseId, persistenceKey, host, ssl, forceLongPolling) {
        this.databaseId = databaseId;
        this.persistenceKey = persistenceKey;
        this.host = host;
        this.ssl = ssl;
        this.forceLongPolling = forceLongPolling;
    }
    return DatabaseInfo;
}());
/** The default database name for a project. */
var DEFAULT_DATABASE_NAME = '(default)';
/** Represents the database ID a Firestore client is associated with. */
var DatabaseId = /** @class */ (function () {
    function DatabaseId(projectId, database) {
        this.projectId = projectId;
        this.database = database ? database : DEFAULT_DATABASE_NAME;
    }
    Object.defineProperty(DatabaseId.prototype, "isDefaultDatabase", {
        get: function () {
            return this.database === DEFAULT_DATABASE_NAME;
        },
        enumerable: false,
        configurable: true
    });
    DatabaseId.prototype.isEqual = function (other) {
        return (other instanceof DatabaseId &&
            other.projectId === this.projectId &&
            other.database === this.database);
    };
    DatabaseId.prototype.compareTo = function (other) {
        return (primitiveComparator(this.projectId, other.projectId) ||
            primitiveComparator(this.database, other.database));
    };
    return DatabaseId;
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
 * Simple wrapper around a nullable UID. Mostly exists to make code more
 * readable.
 */
var User = /** @class */ (function () {
    function User(uid) {
        this.uid = uid;
    }
    User.prototype.isAuthenticated = function () {
        return this.uid != null;
    };
    /**
     * Returns a key representing this user, suitable for inclusion in a
     * dictionary.
     */
    User.prototype.toKey = function () {
        if (this.isAuthenticated()) {
            return 'uid:' + this.uid;
        }
        else {
            return 'anonymous-user';
        }
    };
    User.prototype.isEqual = function (otherUser) {
        return otherUser.uid === this.uid;
    };
    return User;
}());
/** A user with a null UID. */
User.UNAUTHENTICATED = new User(null);
// TODO(mikelehen): Look into getting a proper uid-equivalent for
// non-FirebaseAuth providers.
User.GOOGLE_CREDENTIALS = new User('google-credentials-uid');
User.FIRST_PARTY = new User('first-party-uid');
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
 */
var ListenSequence = /** @class */ (function () {
    function ListenSequence(previousValue, sequenceNumberSyncer) {
        var _this = this;
        this.previousValue = previousValue;
        if (sequenceNumberSyncer) {
            sequenceNumberSyncer.sequenceNumberHandler = function (sequenceNumber) { return _this.setPreviousValue(sequenceNumber); };
            this.writeNewSequenceNumber = function (sequenceNumber) { return sequenceNumberSyncer.writeSequenceNumber(sequenceNumber); };
        }
    }
    ListenSequence.prototype.setPreviousValue = function (externalPreviousValue) {
        this.previousValue = Math.max(externalPreviousValue, this.previousValue);
        return this.previousValue;
    };
    ListenSequence.prototype.next = function () {
        var nextValue = ++this.previousValue;
        if (this.writeNewSequenceNumber) {
            this.writeNewSequenceNumber(nextValue);
        }
        return nextValue;
    };
    return ListenSequence;
}());
ListenSequence.INVALID = -1;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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
var SortedMap = /** @class */ (function () {
    function SortedMap(comparator, root) {
        this.comparator = comparator;
        this.root = root ? root : LLRBNode.EMPTY;
    }
    // Returns a copy of the map, with the specified key/value added or replaced.
    SortedMap.prototype.insert = function (key, value) {
        return new SortedMap(this.comparator, this.root
            .insert(key, value, this.comparator)
            .copy(null, null, LLRBNode.BLACK, null, null));
    };
    // Returns a copy of the map, with the specified key removed.
    SortedMap.prototype.remove = function (key) {
        return new SortedMap(this.comparator, this.root
            .remove(key, this.comparator)
            .copy(null, null, LLRBNode.BLACK, null, null));
    };
    // Returns the value of the node with the given key, or null.
    SortedMap.prototype.get = function (key) {
        var node = this.root;
        while (!node.isEmpty()) {
            var cmp = this.comparator(key, node.key);
            if (cmp === 0) {
                return node.value;
            }
            else if (cmp < 0) {
                node = node.left;
            }
            else if (cmp > 0) {
                node = node.right;
            }
        }
        return null;
    };
    // Returns the index of the element in this sorted map, or -1 if it doesn't
    // exist.
    SortedMap.prototype.indexOf = function (key) {
        // Number of nodes that were pruned when descending right
        var prunedNodes = 0;
        var node = this.root;
        while (!node.isEmpty()) {
            var cmp = this.comparator(key, node.key);
            if (cmp === 0) {
                return prunedNodes + node.left.size;
            }
            else if (cmp < 0) {
                node = node.left;
            }
            else {
                // Count all nodes left of the node plus the node itself
                prunedNodes += node.left.size + 1;
                node = node.right;
            }
        }
        // Node not found
        return -1;
    };
    SortedMap.prototype.isEmpty = function () {
        return this.root.isEmpty();
    };
    Object.defineProperty(SortedMap.prototype, "size", {
        // Returns the total number of nodes in the map.
        get: function () {
            return this.root.size;
        },
        enumerable: false,
        configurable: true
    });
    // Returns the minimum key in the map.
    SortedMap.prototype.minKey = function () {
        return this.root.minKey();
    };
    // Returns the maximum key in the map.
    SortedMap.prototype.maxKey = function () {
        return this.root.maxKey();
    };
    // Traverses the map in key order and calls the specified action function
    // for each key/value pair. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    SortedMap.prototype.inorderTraversal = function (action) {
        return this.root.inorderTraversal(action);
    };
    SortedMap.prototype.forEach = function (fn) {
        this.inorderTraversal(function (k, v) {
            fn(k, v);
            return false;
        });
    };
    SortedMap.prototype.toString = function () {
        var descriptions = [];
        this.inorderTraversal(function (k, v) {
            descriptions.push(k + ":" + v);
            return false;
        });
        return "{" + descriptions.join(', ') + "}";
    };
    // Traverses the map in reverse key order and calls the specified action
    // function for each key/value pair. If action returns true, traversal is
    // aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    SortedMap.prototype.reverseTraversal = function (action) {
        return this.root.reverseTraversal(action);
    };
    // Returns an iterator over the SortedMap.
    SortedMap.prototype.getIterator = function () {
        return new SortedMapIterator(this.root, null, this.comparator, false);
    };
    SortedMap.prototype.getIteratorFrom = function (key) {
        return new SortedMapIterator(this.root, key, this.comparator, false);
    };
    SortedMap.prototype.getReverseIterator = function () {
        return new SortedMapIterator(this.root, null, this.comparator, true);
    };
    SortedMap.prototype.getReverseIteratorFrom = function (key) {
        return new SortedMapIterator(this.root, key, this.comparator, true);
    };
    return SortedMap;
}()); // end SortedMap
// An iterator over an LLRBNode.
var SortedMapIterator = /** @class */ (function () {
    function SortedMapIterator(node, startKey, comparator, isReverse) {
        this.isReverse = isReverse;
        this.nodeStack = [];
        var cmp = 1;
        while (!node.isEmpty()) {
            cmp = startKey ? comparator(node.key, startKey) : 1;
            // flip the comparison if we're going in reverse
            if (isReverse) {
                cmp *= -1;
            }
            if (cmp < 0) {
                // This node is less than our start key. ignore it
                if (this.isReverse) {
                    node = node.left;
                }
                else {
                    node = node.right;
                }
            }
            else if (cmp === 0) {
                // This node is exactly equal to our start key. Push it on the stack,
                // but stop iterating;
                this.nodeStack.push(node);
                break;
            }
            else {
                // This node is greater than our start key, add it to the stack and move
                // to the next one
                this.nodeStack.push(node);
                if (this.isReverse) {
                    node = node.right;
                }
                else {
                    node = node.left;
                }
            }
        }
    }
    SortedMapIterator.prototype.getNext = function () {
        var node = this.nodeStack.pop();
        var result = { key: node.key, value: node.value };
        if (this.isReverse) {
            node = node.left;
            while (!node.isEmpty()) {
                this.nodeStack.push(node);
                node = node.right;
            }
        }
        else {
            node = node.right;
            while (!node.isEmpty()) {
                this.nodeStack.push(node);
                node = node.left;
            }
        }
        return result;
    };
    SortedMapIterator.prototype.hasNext = function () {
        return this.nodeStack.length > 0;
    };
    SortedMapIterator.prototype.peek = function () {
        if (this.nodeStack.length === 0) {
            return null;
        }
        var node = this.nodeStack[this.nodeStack.length - 1];
        return { key: node.key, value: node.value };
    };
    return SortedMapIterator;
}()); // end SortedMapIterator
// Represents a node in a Left-leaning Red-Black tree.
var LLRBNode = /** @class */ (function () {
    function LLRBNode(key, value, color, left, right) {
        this.key = key;
        this.value = value;
        this.color = color != null ? color : LLRBNode.RED;
        this.left = left != null ? left : LLRBNode.EMPTY;
        this.right = right != null ? right : LLRBNode.EMPTY;
        this.size = this.left.size + 1 + this.right.size;
    }
    // Returns a copy of the current node, optionally replacing pieces of it.
    LLRBNode.prototype.copy = function (key, value, color, left, right) {
        return new LLRBNode(key != null ? key : this.key, value != null ? value : this.value, color != null ? color : this.color, left != null ? left : this.left, right != null ? right : this.right);
    };
    LLRBNode.prototype.isEmpty = function () {
        return false;
    };
    // Traverses the tree in key order and calls the specified action function
    // for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    LLRBNode.prototype.inorderTraversal = function (action) {
        return (this.left.inorderTraversal(action) ||
            action(this.key, this.value) ||
            this.right.inorderTraversal(action));
    };
    // Traverses the tree in reverse key order and calls the specified action
    // function for each node. If action returns true, traversal is aborted.
    // Returns the first truthy value returned by action, or the last falsey
    // value returned by action.
    LLRBNode.prototype.reverseTraversal = function (action) {
        return (this.right.reverseTraversal(action) ||
            action(this.key, this.value) ||
            this.left.reverseTraversal(action));
    };
    // Returns the minimum node in the tree.
    LLRBNode.prototype.min = function () {
        if (this.left.isEmpty()) {
            return this;
        }
        else {
            return this.left.min();
        }
    };
    // Returns the maximum key in the tree.
    LLRBNode.prototype.minKey = function () {
        return this.min().key;
    };
    // Returns the maximum key in the tree.
    LLRBNode.prototype.maxKey = function () {
        if (this.right.isEmpty()) {
            return this.key;
        }
        else {
            return this.right.maxKey();
        }
    };
    // Returns new tree, with the key/value added.
    LLRBNode.prototype.insert = function (key, value, comparator) {
        var n = this;
        var cmp = comparator(key, n.key);
        if (cmp < 0) {
            n = n.copy(null, null, null, n.left.insert(key, value, comparator), null);
        }
        else if (cmp === 0) {
            n = n.copy(null, value, null, null, null);
        }
        else {
            n = n.copy(null, null, null, null, n.right.insert(key, value, comparator));
        }
        return n.fixUp();
    };
    LLRBNode.prototype.removeMin = function () {
        if (this.left.isEmpty()) {
            return LLRBNode.EMPTY;
        }
        var n = this;
        if (!n.left.isRed() && !n.left.left.isRed()) {
            n = n.moveRedLeft();
        }
        n = n.copy(null, null, null, n.left.removeMin(), null);
        return n.fixUp();
    };
    // Returns new tree, with the specified item removed.
    LLRBNode.prototype.remove = function (key, comparator) {
        var smallest;
        var n = this;
        if (comparator(key, n.key) < 0) {
            if (!n.left.isEmpty() && !n.left.isRed() && !n.left.left.isRed()) {
                n = n.moveRedLeft();
            }
            n = n.copy(null, null, null, n.left.remove(key, comparator), null);
        }
        else {
            if (n.left.isRed()) {
                n = n.rotateRight();
            }
            if (!n.right.isEmpty() && !n.right.isRed() && !n.right.left.isRed()) {
                n = n.moveRedRight();
            }
            if (comparator(key, n.key) === 0) {
                if (n.right.isEmpty()) {
                    return LLRBNode.EMPTY;
                }
                else {
                    smallest = n.right.min();
                    n = n.copy(smallest.key, smallest.value, null, null, n.right.removeMin());
                }
            }
            n = n.copy(null, null, null, null, n.right.remove(key, comparator));
        }
        return n.fixUp();
    };
    LLRBNode.prototype.isRed = function () {
        return this.color;
    };
    // Returns new tree after performing any needed rotations.
    LLRBNode.prototype.fixUp = function () {
        var n = this;
        if (n.right.isRed() && !n.left.isRed()) {
            n = n.rotateLeft();
        }
        if (n.left.isRed() && n.left.left.isRed()) {
            n = n.rotateRight();
        }
        if (n.left.isRed() && n.right.isRed()) {
            n = n.colorFlip();
        }
        return n;
    };
    LLRBNode.prototype.moveRedLeft = function () {
        var n = this.colorFlip();
        if (n.right.left.isRed()) {
            n = n.copy(null, null, null, null, n.right.rotateRight());
            n = n.rotateLeft();
            n = n.colorFlip();
        }
        return n;
    };
    LLRBNode.prototype.moveRedRight = function () {
        var n = this.colorFlip();
        if (n.left.left.isRed()) {
            n = n.rotateRight();
            n = n.colorFlip();
        }
        return n;
    };
    LLRBNode.prototype.rotateLeft = function () {
        var nl = this.copy(null, null, LLRBNode.RED, null, this.right.left);
        return this.right.copy(null, null, this.color, nl, null);
    };
    LLRBNode.prototype.rotateRight = function () {
        var nr = this.copy(null, null, LLRBNode.RED, this.left.right, null);
        return this.left.copy(null, null, this.color, null, nr);
    };
    LLRBNode.prototype.colorFlip = function () {
        var left = this.left.copy(null, null, !this.left.color, null, null);
        var right = this.right.copy(null, null, !this.right.color, null, null);
        return this.copy(null, null, !this.color, left, right);
    };
    // For testing.
    LLRBNode.prototype.checkMaxDepth = function () {
        var blackDepth = this.check();
        if (Math.pow(2.0, blackDepth) <= this.size + 1) {
            return true;
        }
        else {
            return false;
        }
    };
    // In a balanced RB tree, the black-depth (number of black nodes) from root to
    // leaves is equal on both sides.  This function verifies that or asserts.
    LLRBNode.prototype.check = function () {
        if (this.isRed() && this.left.isRed()) {
            throw fail();
        }
        if (this.right.isRed()) {
            throw fail();
        }
        var blackDepth = this.left.check();
        if (blackDepth !== this.right.check()) {
            throw fail();
        }
        else {
            return blackDepth + (this.isRed() ? 0 : 1);
        }
    };
    return LLRBNode;
}()); // end LLRBNode
// Empty node is shared between all LLRB trees.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
LLRBNode.EMPTY = null;
LLRBNode.RED = true;
LLRBNode.BLACK = false;
// Represents an empty node (a leaf node in the Red-Black Tree).
var LLRBEmptyNode = /** @class */ (function () {
    function LLRBEmptyNode() {
        this.size = 0;
    }
    Object.defineProperty(LLRBEmptyNode.prototype, "key", {
        get: function () {
            throw fail();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(LLRBEmptyNode.prototype, "value", {
        get: function () {
            throw fail();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(LLRBEmptyNode.prototype, "color", {
        get: function () {
            throw fail();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(LLRBEmptyNode.prototype, "left", {
        get: function () {
            throw fail();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(LLRBEmptyNode.prototype, "right", {
        get: function () {
            throw fail();
        },
        enumerable: false,
        configurable: true
    });
    // Returns a copy of the current node.
    LLRBEmptyNode.prototype.copy = function (key, value, color, left, right) {
        return this;
    };
    // Returns a copy of the tree, with the specified key/value added.
    LLRBEmptyNode.prototype.insert = function (key, value, comparator) {
        return new LLRBNode(key, value);
    };
    // Returns a copy of the tree, with the specified key removed.
    LLRBEmptyNode.prototype.remove = function (key, comparator) {
        return this;
    };
    LLRBEmptyNode.prototype.isEmpty = function () {
        return true;
    };
    LLRBEmptyNode.prototype.inorderTraversal = function (action) {
        return false;
    };
    LLRBEmptyNode.prototype.reverseTraversal = function (action) {
        return false;
    };
    LLRBEmptyNode.prototype.minKey = function () {
        return null;
    };
    LLRBEmptyNode.prototype.maxKey = function () {
        return null;
    };
    LLRBEmptyNode.prototype.isRed = function () {
        return false;
    };
    // For testing.
    LLRBEmptyNode.prototype.checkMaxDepth = function () {
        return true;
    };
    LLRBEmptyNode.prototype.check = function () {
        return 0;
    };
    return LLRBEmptyNode;
}()); // end LLRBEmptyNode
LLRBNode.EMPTY = new LLRBEmptyNode();
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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
var SortedSet = /** @class */ (function () {
    function SortedSet(comparator) {
        this.comparator = comparator;
        this.data = new SortedMap(this.comparator);
    }
    SortedSet.prototype.has = function (elem) {
        return this.data.get(elem) !== null;
    };
    SortedSet.prototype.first = function () {
        return this.data.minKey();
    };
    SortedSet.prototype.last = function () {
        return this.data.maxKey();
    };
    Object.defineProperty(SortedSet.prototype, "size", {
        get: function () {
            return this.data.size;
        },
        enumerable: false,
        configurable: true
    });
    SortedSet.prototype.indexOf = function (elem) {
        return this.data.indexOf(elem);
    };
    /** Iterates elements in order defined by "comparator" */
    SortedSet.prototype.forEach = function (cb) {
        this.data.inorderTraversal(function (k, v) {
            cb(k);
            return false;
        });
    };
    /** Iterates over `elem`s such that: range[0] <= elem < range[1]. */
    SortedSet.prototype.forEachInRange = function (range, cb) {
        var iter = this.data.getIteratorFrom(range[0]);
        while (iter.hasNext()) {
            var elem = iter.getNext();
            if (this.comparator(elem.key, range[1]) >= 0) {
                return;
            }
            cb(elem.key);
        }
    };
    /**
     * Iterates over `elem`s such that: start <= elem until false is returned.
     */
    SortedSet.prototype.forEachWhile = function (cb, start) {
        var iter;
        if (start !== undefined) {
            iter = this.data.getIteratorFrom(start);
        }
        else {
            iter = this.data.getIterator();
        }
        while (iter.hasNext()) {
            var elem = iter.getNext();
            var result = cb(elem.key);
            if (!result) {
                return;
            }
        }
    };
    /** Finds the least element greater than or equal to `elem`. */
    SortedSet.prototype.firstAfterOrEqual = function (elem) {
        var iter = this.data.getIteratorFrom(elem);
        return iter.hasNext() ? iter.getNext().key : null;
    };
    SortedSet.prototype.getIterator = function () {
        return new SortedSetIterator(this.data.getIterator());
    };
    SortedSet.prototype.getIteratorFrom = function (key) {
        return new SortedSetIterator(this.data.getIteratorFrom(key));
    };
    /** Inserts or updates an element */
    SortedSet.prototype.add = function (elem) {
        return this.copy(this.data.remove(elem).insert(elem, true));
    };
    /** Deletes an element */
    SortedSet.prototype.delete = function (elem) {
        if (!this.has(elem)) {
            return this;
        }
        return this.copy(this.data.remove(elem));
    };
    SortedSet.prototype.isEmpty = function () {
        return this.data.isEmpty();
    };
    SortedSet.prototype.unionWith = function (other) {
        var result = this;
        // Make sure `result` always refers to the larger one of the two sets.
        if (result.size < other.size) {
            result = other;
            other = this;
        }
        other.forEach(function (elem) {
            result = result.add(elem);
        });
        return result;
    };
    SortedSet.prototype.isEqual = function (other) {
        if (!(other instanceof SortedSet)) {
            return false;
        }
        if (this.size !== other.size) {
            return false;
        }
        var thisIt = this.data.getIterator();
        var otherIt = other.data.getIterator();
        while (thisIt.hasNext()) {
            var thisElem = thisIt.getNext().key;
            var otherElem = otherIt.getNext().key;
            if (this.comparator(thisElem, otherElem) !== 0) {
                return false;
            }
        }
        return true;
    };
    SortedSet.prototype.toArray = function () {
        var res = [];
        this.forEach(function (targetId) {
            res.push(targetId);
        });
        return res;
    };
    SortedSet.prototype.toString = function () {
        var result = [];
        this.forEach(function (elem) { return result.push(elem); });
        return 'SortedSet(' + result.toString() + ')';
    };
    SortedSet.prototype.copy = function (data) {
        var result = new SortedSet(this.comparator);
        result.data = data;
        return result;
    };
    return SortedSet;
}());
var SortedSetIterator = /** @class */ (function () {
    function SortedSetIterator(iter) {
        this.iter = iter;
    }
    SortedSetIterator.prototype.getNext = function () {
        return this.iter.getNext().key;
    };
    SortedSetIterator.prototype.hasNext = function () {
        return this.iter.hasNext();
    };
    return SortedSetIterator;
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
var Code = {
    // Causes are copied from:
    // https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
    /** Not an error; returned on success. */
    OK: 'ok',
    /** The operation was cancelled (typically by the caller). */
    CANCELLED: 'cancelled',
    /** Unknown error or an error from a different error domain. */
    UNKNOWN: 'unknown',
    /**
     * Client specified an invalid argument. Note that this differs from
     * FAILED_PRECONDITION. INVALID_ARGUMENT indicates arguments that are
     * problematic regardless of the state of the system (e.g., a malformed file
     * name).
     */
    INVALID_ARGUMENT: 'invalid-argument',
    /**
     * Deadline expired before operation could complete. For operations that
     * change the state of the system, this error may be returned even if the
     * operation has completed successfully. For example, a successful response
     * from a server could have been delayed long enough for the deadline to
     * expire.
     */
    DEADLINE_EXCEEDED: 'deadline-exceeded',
    /** Some requested entity (e.g., file or directory) was not found. */
    NOT_FOUND: 'not-found',
    /**
     * Some entity that we attempted to create (e.g., file or directory) already
     * exists.
     */
    ALREADY_EXISTS: 'already-exists',
    /**
     * The caller does not have permission to execute the specified operation.
     * PERMISSION_DENIED must not be used for rejections caused by exhausting
     * some resource (use RESOURCE_EXHAUSTED instead for those errors).
     * PERMISSION_DENIED must not be used if the caller can not be identified
     * (use UNAUTHENTICATED instead for those errors).
     */
    PERMISSION_DENIED: 'permission-denied',
    /**
     * The request does not have valid authentication credentials for the
     * operation.
     */
    UNAUTHENTICATED: 'unauthenticated',
    /**
     * Some resource has been exhausted, perhaps a per-user quota, or perhaps the
     * entire file system is out of space.
     */
    RESOURCE_EXHAUSTED: 'resource-exhausted',
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
    FAILED_PRECONDITION: 'failed-precondition',
    /**
     * The operation was aborted, typically due to a concurrency issue like
     * sequencer check failures, transaction aborts, etc.
     *
     * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
     * and UNAVAILABLE.
     */
    ABORTED: 'aborted',
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
    OUT_OF_RANGE: 'out-of-range',
    /** Operation is not implemented or not supported/enabled in this service. */
    UNIMPLEMENTED: 'unimplemented',
    /**
     * Internal errors. Means some invariants expected by underlying System has
     * been broken. If you see one of these errors, Something is very broken.
     */
    INTERNAL: 'internal',
    /**
     * The service is currently unavailable. This is a most likely a transient
     * condition and may be corrected by retrying with a backoff.
     *
     * See litmus test above for deciding between FAILED_PRECONDITION, ABORTED,
     * and UNAVAILABLE.
     */
    UNAVAILABLE: 'unavailable',
    /** Unrecoverable data loss or corruption. */
    DATA_LOSS: 'data-loss'
};
/**
 * An error class used for Firestore-generated errors. Ideally we should be
 * using FirebaseError, but integrating with it is overly arduous at the moment,
 * so we define our own compatible error class (with a `name` of 'FirebaseError'
 * and compatible `code` and `message` fields.)
 */
var FirestoreError = /** @class */ (function (_super) {
    tslib.__extends(FirestoreError, _super);
    function FirestoreError(code, message) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.message = message;
        _this.name = 'FirebaseError';
        // HACK: We write a toString property directly because Error is not a real
        // class and so inheritance does not work correctly. We could alternatively
        // do the same "back-door inheritance" trick that FirebaseError does.
        _this.toString = function () { return _this.name + ": [code=" + _this.code + "]: " + _this.message; };
        return _this;
    }
    return FirestoreError;
}(Error));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DOCUMENT_KEY_NAME = '__name__';
/**
 * Path represents an ordered sequence of string segments.
 */
var BasePath = /** @class */ (function () {
    function BasePath(segments, offset, length) {
        if (offset === undefined) {
            offset = 0;
        }
        else if (offset > segments.length) {
            fail();
        }
        if (length === undefined) {
            length = segments.length - offset;
        }
        else if (length > segments.length - offset) {
            fail();
        }
        this.segments = segments;
        this.offset = offset;
        this.len = length;
    }
    Object.defineProperty(BasePath.prototype, "length", {
        get: function () {
            return this.len;
        },
        enumerable: false,
        configurable: true
    });
    BasePath.prototype.isEqual = function (other) {
        return BasePath.comparator(this, other) === 0;
    };
    BasePath.prototype.child = function (nameOrPath) {
        var segments = this.segments.slice(this.offset, this.limit());
        if (nameOrPath instanceof BasePath) {
            nameOrPath.forEach(function (segment) {
                segments.push(segment);
            });
        }
        else {
            segments.push(nameOrPath);
        }
        return this.construct(segments);
    };
    /** The index of one past the last segment of the path. */
    BasePath.prototype.limit = function () {
        return this.offset + this.length;
    };
    BasePath.prototype.popFirst = function (size) {
        size = size === undefined ? 1 : size;
        return this.construct(this.segments, this.offset + size, this.length - size);
    };
    BasePath.prototype.popLast = function () {
        return this.construct(this.segments, this.offset, this.length - 1);
    };
    BasePath.prototype.firstSegment = function () {
        return this.segments[this.offset];
    };
    BasePath.prototype.lastSegment = function () {
        return this.get(this.length - 1);
    };
    BasePath.prototype.get = function (index) {
        return this.segments[this.offset + index];
    };
    BasePath.prototype.isEmpty = function () {
        return this.length === 0;
    };
    BasePath.prototype.isPrefixOf = function (other) {
        if (other.length < this.length) {
            return false;
        }
        for (var i = 0; i < this.length; i++) {
            if (this.get(i) !== other.get(i)) {
                return false;
            }
        }
        return true;
    };
    BasePath.prototype.isImmediateParentOf = function (potentialChild) {
        if (this.length + 1 !== potentialChild.length) {
            return false;
        }
        for (var i = 0; i < this.length; i++) {
            if (this.get(i) !== potentialChild.get(i)) {
                return false;
            }
        }
        return true;
    };
    BasePath.prototype.forEach = function (fn) {
        for (var i = this.offset, end = this.limit(); i < end; i++) {
            fn(this.segments[i]);
        }
    };
    BasePath.prototype.toArray = function () {
        return this.segments.slice(this.offset, this.limit());
    };
    BasePath.comparator = function (p1, p2) {
        var len = Math.min(p1.length, p2.length);
        for (var i = 0; i < len; i++) {
            var left = p1.get(i);
            var right = p2.get(i);
            if (left < right) {
                return -1;
            }
            if (left > right) {
                return 1;
            }
        }
        if (p1.length < p2.length) {
            return -1;
        }
        if (p1.length > p2.length) {
            return 1;
        }
        return 0;
    };
    return BasePath;
}());
/**
 * A slash-separated path for navigating resources (documents and collections)
 * within Firestore.
 */
var ResourcePath = /** @class */ (function (_super) {
    tslib.__extends(ResourcePath, _super);
    function ResourcePath() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ResourcePath.prototype.construct = function (segments, offset, length) {
        return new ResourcePath(segments, offset, length);
    };
    ResourcePath.prototype.canonicalString = function () {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        return this.toArray().join('/');
    };
    ResourcePath.prototype.toString = function () {
        return this.canonicalString();
    };
    /**
     * Creates a resource path from the given slash-delimited string.
     */
    ResourcePath.fromString = function (path) {
        // NOTE: The client is ignorant of any path segments containing escape
        // sequences (e.g. __id123__) and just passes them through raw (they exist
        // for legacy reasons and should not be used frequently).
        if (path.indexOf('//') >= 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid path (" + path + "). Paths must not contain // in them.");
        }
        // We may still have an empty segment at the beginning or end if they had a
        // leading or trailing slash (which we allow).
        var segments = path.split('/').filter(function (segment) { return segment.length > 0; });
        return new ResourcePath(segments);
    };
    ResourcePath.emptyPath = function () {
        return new ResourcePath([]);
    };
    return ResourcePath;
}(BasePath));
var identifierRegExp = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
/** A dot-separated path for navigating sub-objects within a document. */
var FieldPath = /** @class */ (function (_super) {
    tslib.__extends(FieldPath, _super);
    function FieldPath() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FieldPath.prototype.construct = function (segments, offset, length) {
        return new FieldPath(segments, offset, length);
    };
    /**
     * Returns true if the string could be used as a segment in a field path
     * without escaping.
     */
    FieldPath.isValidIdentifier = function (segment) {
        return identifierRegExp.test(segment);
    };
    FieldPath.prototype.canonicalString = function () {
        return this.toArray()
            .map(function (str) {
            str = str.replace('\\', '\\\\').replace('`', '\\`');
            if (!FieldPath.isValidIdentifier(str)) {
                str = '`' + str + '`';
            }
            return str;
        })
            .join('.');
    };
    FieldPath.prototype.toString = function () {
        return this.canonicalString();
    };
    /**
     * Returns true if this field references the key of a document.
     */
    FieldPath.prototype.isKeyField = function () {
        return this.length === 1 && this.get(0) === DOCUMENT_KEY_NAME;
    };
    /**
     * The field designating the key of a document.
     */
    FieldPath.keyField = function () {
        return new FieldPath([DOCUMENT_KEY_NAME]);
    };
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
    FieldPath.fromServerFormat = function (path) {
        var segments = [];
        var current = '';
        var i = 0;
        var addCurrentSegment = function () {
            if (current.length === 0) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid field path (" + path + "). Paths must not be empty, begin " +
                    "with '.', end with '.', or contain '..'");
            }
            segments.push(current);
            current = '';
        };
        var inBackticks = false;
        while (i < path.length) {
            var c = path[i];
            if (c === '\\') {
                if (i + 1 === path.length) {
                    throw new FirestoreError(Code.INVALID_ARGUMENT, 'Path has trailing escape character: ' + path);
                }
                var next = path[i + 1];
                if (!(next === '\\' || next === '.' || next === '`')) {
                    throw new FirestoreError(Code.INVALID_ARGUMENT, 'Path has invalid escape sequence: ' + path);
                }
                current += next;
                i += 2;
            }
            else if (c === '`') {
                inBackticks = !inBackticks;
                i++;
            }
            else if (c === '.' && !inBackticks) {
                addCurrentSegment();
                i++;
            }
            else {
                current += c;
                i++;
            }
        }
        addCurrentSegment();
        if (inBackticks) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Unterminated ` in path: ' + path);
        }
        return new FieldPath(segments);
    };
    FieldPath.emptyPath = function () {
        return new FieldPath([]);
    };
    return FieldPath;
}(BasePath));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DocumentKey = /** @class */ (function () {
    function DocumentKey(path) {
        this.path = path;
    }
    DocumentKey.fromName = function (name) {
        return new DocumentKey(ResourcePath.fromString(name).popFirst(5));
    };
    /** Returns true if the document is in the specified collectionId. */
    DocumentKey.prototype.hasCollectionId = function (collectionId) {
        return (this.path.length >= 2 &&
            this.path.get(this.path.length - 2) === collectionId);
    };
    DocumentKey.prototype.isEqual = function (other) {
        return (other !== null && ResourcePath.comparator(this.path, other.path) === 0);
    };
    DocumentKey.prototype.toString = function () {
        return this.path.toString();
    };
    DocumentKey.comparator = function (k1, k2) {
        return ResourcePath.comparator(k1.path, k2.path);
    };
    DocumentKey.isDocumentKey = function (path) {
        return path.length % 2 === 0;
    };
    /**
     * Creates and returns a new document key with the given segments.
     *
     * @param segments The segments of the path to the document
     * @return A new instance of DocumentKey
     */
    DocumentKey.fromSegments = function (segments) {
        return new DocumentKey(new ResourcePath(segments.slice()));
    };
    return DocumentKey;
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
var EMPTY_MAYBE_DOCUMENT_MAP = new SortedMap(DocumentKey.comparator);
function maybeDocumentMap() {
    return EMPTY_MAYBE_DOCUMENT_MAP;
}
function nullableMaybeDocumentMap() {
    return maybeDocumentMap();
}
var EMPTY_DOCUMENT_MAP = new SortedMap(DocumentKey.comparator);
function documentMap() {
    return EMPTY_DOCUMENT_MAP;
}
var EMPTY_DOCUMENT_VERSION_MAP = new SortedMap(DocumentKey.comparator);
function documentVersionMap() {
    return EMPTY_DOCUMENT_VERSION_MAP;
}
var EMPTY_DOCUMENT_KEY_SET = new SortedSet(DocumentKey.comparator);
function documentKeySet() {
    var keys = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        keys[_i] = arguments[_i];
    }
    var set = EMPTY_DOCUMENT_KEY_SET;
    for (var _e = 0, keys_1 = keys; _e < keys_1.length; _e++) {
        var key = keys_1[_e];
        set = set.add(key);
    }
    return set;
}
var EMPTY_TARGET_ID_SET = new SortedSet(primitiveComparator);
function targetIdSet() {
    return EMPTY_TARGET_ID_SET;
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
 */
function isNullOrUndefined(value) {
    return value === null || value === undefined;
}
/** Returns whether the value represents -0. */
function isNegativeZero(value) {
    // Detect if the value is -0.0. Based on polyfill from
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
    return value === -0 && 1 / value === 1 / -0;
}
/**
 * Returns whether a value is an integer and in the safe integer range
 * @param value The value to test for being an integer and in the safe range
 */
function isSafeInteger(value) {
    return (typeof value === 'number' &&
        Number.isInteger(value) &&
        !isNegativeZero(value) &&
        value <= Number.MAX_SAFE_INTEGER &&
        value >= Number.MIN_SAFE_INTEGER);
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
var LocalClientState = /** @class */ (function () {
    function LocalClientState() {
        this.activeTargetIds = targetIdSet();
    }
    LocalClientState.prototype.addQueryTarget = function (targetId) {
        this.activeTargetIds = this.activeTargetIds.add(targetId);
    };
    LocalClientState.prototype.removeQueryTarget = function (targetId) {
        this.activeTargetIds = this.activeTargetIds.delete(targetId);
    };
    /**
     * Converts this entry into a JSON-encoded format we can use for WebStorage.
     * Does not encode `clientId` as it is part of the key in WebStorage.
     */
    LocalClientState.prototype.toWebStorageJSON = function () {
        var data = {
            activeTargetIds: this.activeTargetIds.toArray(),
            updateTimeMs: Date.now() // Modify the existing value to trigger update.
        };
        return JSON.stringify(data);
    };
    return LocalClientState;
}());
/**
 * `MemorySharedClientState` is a simple implementation of SharedClientState for
 * clients using memory persistence. The state in this class remains fully
 * isolated and no synchronization is performed.
 */
var MemorySharedClientState = /** @class */ (function () {
    function MemorySharedClientState() {
        this.localState = new LocalClientState();
        this.queryState = {};
        this.onlineStateHandler = null;
        this.sequenceNumberHandler = null;
    }
    MemorySharedClientState.prototype.addPendingMutation = function (batchId) {
        // No op.
    };
    MemorySharedClientState.prototype.updateMutationState = function (batchId, state, error) {
        // No op.
    };
    MemorySharedClientState.prototype.addLocalQueryTarget = function (targetId) {
        this.localState.addQueryTarget(targetId);
        return this.queryState[targetId] || 'not-current';
    };
    MemorySharedClientState.prototype.updateQueryState = function (targetId, state, error) {
        this.queryState[targetId] = state;
    };
    MemorySharedClientState.prototype.removeLocalQueryTarget = function (targetId) {
        this.localState.removeQueryTarget(targetId);
    };
    MemorySharedClientState.prototype.isLocalQueryTarget = function (targetId) {
        return this.localState.activeTargetIds.has(targetId);
    };
    MemorySharedClientState.prototype.clearQueryState = function (targetId) {
        delete this.queryState[targetId];
    };
    MemorySharedClientState.prototype.getAllActiveQueryTargets = function () {
        return this.localState.activeTargetIds;
    };
    MemorySharedClientState.prototype.isActiveQueryTarget = function (targetId) {
        return this.localState.activeTargetIds.has(targetId);
    };
    MemorySharedClientState.prototype.start = function () {
        this.localState = new LocalClientState();
        return Promise.resolve();
    };
    MemorySharedClientState.prototype.handleUserChange = function (user, removedBatchIds, addedBatchIds) {
        // No op.
    };
    MemorySharedClientState.prototype.setOnlineState = function (onlineState) {
        // No op.
    };
    MemorySharedClientState.prototype.shutdown = function () { };
    MemorySharedClientState.prototype.writeSequenceNumber = function (sequenceNumber) { };
    return MemorySharedClientState;
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
// The earlist date supported by Firestore timestamps (0001-01-01T00:00:00Z).
var MIN_SECONDS = -62135596800;
var Timestamp = /** @class */ (function () {
    function Timestamp(seconds, nanoseconds) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
        if (nanoseconds < 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Timestamp nanoseconds out of range: ' + nanoseconds);
        }
        if (nanoseconds >= 1e9) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Timestamp nanoseconds out of range: ' + nanoseconds);
        }
        if (seconds < MIN_SECONDS) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Timestamp seconds out of range: ' + seconds);
        }
        // This will break in the year 10,000.
        if (seconds >= 253402300800) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Timestamp seconds out of range: ' + seconds);
        }
    }
    Timestamp.now = function () {
        return Timestamp.fromMillis(Date.now());
    };
    Timestamp.fromDate = function (date) {
        return Timestamp.fromMillis(date.getTime());
    };
    Timestamp.fromMillis = function (milliseconds) {
        var seconds = Math.floor(milliseconds / 1000);
        var nanos = (milliseconds - seconds * 1000) * 1e6;
        return new Timestamp(seconds, nanos);
    };
    Timestamp.prototype.toDate = function () {
        return new Date(this.toMillis());
    };
    Timestamp.prototype.toMillis = function () {
        return this.seconds * 1000 + this.nanoseconds / 1e6;
    };
    Timestamp.prototype._compareTo = function (other) {
        if (this.seconds === other.seconds) {
            return primitiveComparator(this.nanoseconds, other.nanoseconds);
        }
        return primitiveComparator(this.seconds, other.seconds);
    };
    Timestamp.prototype.isEqual = function (other) {
        return (other.seconds === this.seconds && other.nanoseconds === this.nanoseconds);
    };
    Timestamp.prototype.toString = function () {
        return ('Timestamp(seconds=' +
            this.seconds +
            ', nanoseconds=' +
            this.nanoseconds +
            ')');
    };
    Timestamp.prototype.valueOf = function () {
        // This method returns a string of the form <seconds>.<nanoseconds> where <seconds> is
        // translated to have a non-negative value and both <seconds> and <nanoseconds> are left-padded
        // with zeroes to be a consistent length. Strings with this format then have a lexiographical
        // ordering that matches the expected ordering. The <seconds> translation is done to avoid
        // having a leading negative sign (i.e. a leading '-' character) in its string representation,
        // which would affect its lexiographical ordering.
        var adjustedSeconds = this.seconds - MIN_SECONDS;
        // Note: Up to 12 decimal digits are required to represent all valid 'seconds' values.
        var formattedSeconds = String(adjustedSeconds).padStart(12, '0');
        var formattedNanoseconds = String(this.nanoseconds).padStart(9, '0');
        return formattedSeconds + '.' + formattedNanoseconds;
    };
    return Timestamp;
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
function objectSize(obj) {
    var count = 0;
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            count++;
        }
    }
    return count;
}
function forEach(obj, fn) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn(key, obj[key]);
        }
    }
}
function isEmpty(obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
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
function decodeBase64(encoded) {
    // Node actually doesn't validate base64 strings.
    // A quick sanity check that is not a fool-proof validation
    if (/[^-A-Za-z0-9+/=]/.test(encoded)) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, 'Not a valid Base64 string: ' + encoded);
    }
    return new Buffer(encoded, 'base64').toString('binary');
}
/** Converts a binary string to a Base64 encoded string. */
function encodeBase64(raw) {
    return new Buffer(raw, 'binary').toString('base64');
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
var ByteString = /** @class */ (function () {
    function ByteString(binaryString) {
        this.binaryString = binaryString;
    }
    ByteString.fromBase64String = function (base64) {
        var binaryString = decodeBase64(base64);
        return new ByteString(binaryString);
    };
    ByteString.fromUint8Array = function (array) {
        var binaryString = binaryStringFromUint8Array(array);
        return new ByteString(binaryString);
    };
    ByteString.prototype.toBase64 = function () {
        return encodeBase64(this.binaryString);
    };
    ByteString.prototype.toUint8Array = function () {
        return uint8ArrayFromBinaryString(this.binaryString);
    };
    ByteString.prototype.approximateByteSize = function () {
        return this.binaryString.length * 2;
    };
    ByteString.prototype.compareTo = function (other) {
        return primitiveComparator(this.binaryString, other.binaryString);
    };
    ByteString.prototype.isEqual = function (other) {
        return this.binaryString === other.binaryString;
    };
    return ByteString;
}());
ByteString.EMPTY_BYTE_STRING = new ByteString('');
/**
 * Helper function to convert an Uint8array to a binary string.
 */
function binaryStringFromUint8Array(array) {
    var binaryString = '';
    for (var i = 0; i < array.length; ++i) {
        binaryString += String.fromCharCode(array[i]);
    }
    return binaryString;
}
/**
 * Helper function to convert a binary string to an Uint8Array.
 */
function uint8ArrayFromBinaryString(binaryString) {
    var buffer = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
    }
    return buffer;
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
 */
var SERVER_TIMESTAMP_SENTINEL = 'server_timestamp';
var TYPE_KEY = '__type__';
var PREVIOUS_VALUE_KEY = '__previous_value__';
var LOCAL_WRITE_TIME_KEY = '__local_write_time__';
function isServerTimestamp(value) {
    var _a, _b;
    var type = (_b = (((_a = value === null || value === void 0 ? void 0 : value.mapValue) === null || _a === void 0 ? void 0 : _a.fields) || {})[TYPE_KEY]) === null || _b === void 0 ? void 0 : _b.stringValue;
    return type === SERVER_TIMESTAMP_SENTINEL;
}
/**
 * Creates a new ServerTimestamp proto value (using the internal format).
 */
function serverTimestamp(localWriteTime, previousValue) {
    var _e;
    var mapValue = {
        fields: (_e = {},
            _e[TYPE_KEY] = {
                stringValue: SERVER_TIMESTAMP_SENTINEL
            },
            _e[LOCAL_WRITE_TIME_KEY] = {
                timestampValue: {
                    seconds: localWriteTime.seconds,
                    nanos: localWriteTime.nanoseconds
                }
            },
            _e)
    };
    if (previousValue) {
        mapValue.fields[PREVIOUS_VALUE_KEY] = previousValue;
    }
    return { mapValue: mapValue };
}
/**
 * Returns the value of the field before this ServerTimestamp was set.
 *
 * Preserving the previous values allows the user to display the last resoled
 * value until the backend responds with the timestamp.
 */
function getPreviousValue(value) {
    var previousValue = value.mapValue.fields[PREVIOUS_VALUE_KEY];
    if (isServerTimestamp(previousValue)) {
        return getPreviousValue(previousValue);
    }
    return previousValue;
}
/**
 * Returns the local time at which this timestamp was first set.
 */
function getLocalWriteTime(value) {
    var localWriteTime = normalizeTimestamp(value.mapValue.fields[LOCAL_WRITE_TIME_KEY].timestampValue);
    return new Timestamp(localWriteTime.seconds, localWriteTime.nanos);
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
var ISO_TIMESTAMP_REG_EXP = new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);
/** Extracts the backend's type order for the provided value. */
function typeOrder(value) {
    if ('nullValue' in value) {
        return 0 /* NullValue */;
    }
    else if ('booleanValue' in value) {
        return 1 /* BooleanValue */;
    }
    else if ('integerValue' in value || 'doubleValue' in value) {
        return 2 /* NumberValue */;
    }
    else if ('timestampValue' in value) {
        return 3 /* TimestampValue */;
    }
    else if ('stringValue' in value) {
        return 5 /* StringValue */;
    }
    else if ('bytesValue' in value) {
        return 6 /* BlobValue */;
    }
    else if ('referenceValue' in value) {
        return 7 /* RefValue */;
    }
    else if ('geoPointValue' in value) {
        return 8 /* GeoPointValue */;
    }
    else if ('arrayValue' in value) {
        return 9 /* ArrayValue */;
    }
    else if ('mapValue' in value) {
        if (isServerTimestamp(value)) {
            return 4 /* ServerTimestampValue */;
        }
        return 10 /* ObjectValue */;
    }
    else {
        return fail();
    }
}
/** Tests `left` and `right` for equality based on the backend semantics. */
function valueEquals(left, right) {
    var leftType = typeOrder(left);
    var rightType = typeOrder(right);
    if (leftType !== rightType) {
        return false;
    }
    switch (leftType) {
        case 0 /* NullValue */:
            return true;
        case 1 /* BooleanValue */:
            return left.booleanValue === right.booleanValue;
        case 4 /* ServerTimestampValue */:
            return getLocalWriteTime(left).isEqual(getLocalWriteTime(right));
        case 3 /* TimestampValue */:
            return timestampEquals(left, right);
        case 5 /* StringValue */:
            return left.stringValue === right.stringValue;
        case 6 /* BlobValue */:
            return blobEquals(left, right);
        case 7 /* RefValue */:
            return left.referenceValue === right.referenceValue;
        case 8 /* GeoPointValue */:
            return geoPointEquals(left, right);
        case 2 /* NumberValue */:
            return numberEquals(left, right);
        case 9 /* ArrayValue */:
            return arrayEquals(left.arrayValue.values || [], right.arrayValue.values || [], valueEquals);
        case 10 /* ObjectValue */:
            return objectEquals(left, right);
        default:
            return fail();
    }
}
function timestampEquals(left, right) {
    if (typeof left.timestampValue === 'string' &&
        typeof right.timestampValue === 'string' &&
        left.timestampValue.length === right.timestampValue.length) {
        // Use string equality for ISO 8601 timestamps
        return left.timestampValue === right.timestampValue;
    }
    var leftTimestamp = normalizeTimestamp(left.timestampValue);
    var rightTimestamp = normalizeTimestamp(right.timestampValue);
    return (leftTimestamp.seconds === rightTimestamp.seconds &&
        leftTimestamp.nanos === rightTimestamp.nanos);
}
function geoPointEquals(left, right) {
    return (normalizeNumber(left.geoPointValue.latitude) ===
        normalizeNumber(right.geoPointValue.latitude) &&
        normalizeNumber(left.geoPointValue.longitude) ===
            normalizeNumber(right.geoPointValue.longitude));
}
function blobEquals(left, right) {
    return normalizeByteString(left.bytesValue).isEqual(normalizeByteString(right.bytesValue));
}
function numberEquals(left, right) {
    if ('integerValue' in left && 'integerValue' in right) {
        return (normalizeNumber(left.integerValue) === normalizeNumber(right.integerValue));
    }
    else if ('doubleValue' in left && 'doubleValue' in right) {
        var n1 = normalizeNumber(left.doubleValue);
        var n2 = normalizeNumber(right.doubleValue);
        if (n1 === n2) {
            return isNegativeZero(n1) === isNegativeZero(n2);
        }
        else {
            return isNaN(n1) && isNaN(n2);
        }
    }
    return false;
}
function objectEquals(left, right) {
    var leftMap = left.mapValue.fields || {};
    var rightMap = right.mapValue.fields || {};
    if (objectSize(leftMap) !== objectSize(rightMap)) {
        return false;
    }
    for (var key in leftMap) {
        if (leftMap.hasOwnProperty(key)) {
            if (rightMap[key] === undefined ||
                !valueEquals(leftMap[key], rightMap[key])) {
                return false;
            }
        }
    }
    return true;
}
/** Returns true if the ArrayValue contains the specified element. */
function arrayValueContains(haystack, needle) {
    return ((haystack.values || []).find(function (v) { return valueEquals(v, needle); }) !== undefined);
}
function valueCompare(left, right) {
    var leftType = typeOrder(left);
    var rightType = typeOrder(right);
    if (leftType !== rightType) {
        return primitiveComparator(leftType, rightType);
    }
    switch (leftType) {
        case 0 /* NullValue */:
            return 0;
        case 1 /* BooleanValue */:
            return primitiveComparator(left.booleanValue, right.booleanValue);
        case 2 /* NumberValue */:
            return compareNumbers(left, right);
        case 3 /* TimestampValue */:
            return compareTimestamps(left.timestampValue, right.timestampValue);
        case 4 /* ServerTimestampValue */:
            return compareTimestamps(getLocalWriteTime(left), getLocalWriteTime(right));
        case 5 /* StringValue */:
            return primitiveComparator(left.stringValue, right.stringValue);
        case 6 /* BlobValue */:
            return compareBlobs(left.bytesValue, right.bytesValue);
        case 7 /* RefValue */:
            return compareReferences(left.referenceValue, right.referenceValue);
        case 8 /* GeoPointValue */:
            return compareGeoPoints(left.geoPointValue, right.geoPointValue);
        case 9 /* ArrayValue */:
            return compareArrays(left.arrayValue, right.arrayValue);
        case 10 /* ObjectValue */:
            return compareMaps(left.mapValue, right.mapValue);
        default:
            throw fail();
    }
}
function compareNumbers(left, right) {
    var leftNumber = normalizeNumber(left.integerValue || left.doubleValue);
    var rightNumber = normalizeNumber(right.integerValue || right.doubleValue);
    if (leftNumber < rightNumber) {
        return -1;
    }
    else if (leftNumber > rightNumber) {
        return 1;
    }
    else if (leftNumber === rightNumber) {
        return 0;
    }
    else {
        // one or both are NaN.
        if (isNaN(leftNumber)) {
            return isNaN(rightNumber) ? 0 : -1;
        }
        else {
            return 1;
        }
    }
}
function compareTimestamps(left, right) {
    if (typeof left === 'string' &&
        typeof right === 'string' &&
        left.length === right.length) {
        return primitiveComparator(left, right);
    }
    var leftTimestamp = normalizeTimestamp(left);
    var rightTimestamp = normalizeTimestamp(right);
    var comparison = primitiveComparator(leftTimestamp.seconds, rightTimestamp.seconds);
    if (comparison !== 0) {
        return comparison;
    }
    return primitiveComparator(leftTimestamp.nanos, rightTimestamp.nanos);
}
function compareReferences(leftPath, rightPath) {
    var leftSegments = leftPath.split('/');
    var rightSegments = rightPath.split('/');
    for (var i = 0; i < leftSegments.length && i < rightSegments.length; i++) {
        var comparison = primitiveComparator(leftSegments[i], rightSegments[i]);
        if (comparison !== 0) {
            return comparison;
        }
    }
    return primitiveComparator(leftSegments.length, rightSegments.length);
}
function compareGeoPoints(left, right) {
    var comparison = primitiveComparator(normalizeNumber(left.latitude), normalizeNumber(right.latitude));
    if (comparison !== 0) {
        return comparison;
    }
    return primitiveComparator(normalizeNumber(left.longitude), normalizeNumber(right.longitude));
}
function compareBlobs(left, right) {
    var leftBytes = normalizeByteString(left);
    var rightBytes = normalizeByteString(right);
    return leftBytes.compareTo(rightBytes);
}
function compareArrays(left, right) {
    var leftArray = left.values || [];
    var rightArray = right.values || [];
    for (var i = 0; i < leftArray.length && i < rightArray.length; ++i) {
        var compare = valueCompare(leftArray[i], rightArray[i]);
        if (compare) {
            return compare;
        }
    }
    return primitiveComparator(leftArray.length, rightArray.length);
}
function compareMaps(left, right) {
    var leftMap = left.fields || {};
    var leftKeys = Object.keys(leftMap);
    var rightMap = right.fields || {};
    var rightKeys = Object.keys(rightMap);
    // Even though MapValues are likely sorted correctly based on their insertion
    // order (e.g. when received from the backend), local modifications can bring
    // elements out of order. We need to re-sort the elements to ensure that
    // canonical IDs are independent of insertion order.
    leftKeys.sort();
    rightKeys.sort();
    for (var i = 0; i < leftKeys.length && i < rightKeys.length; ++i) {
        var keyCompare = primitiveComparator(leftKeys[i], rightKeys[i]);
        if (keyCompare !== 0) {
            return keyCompare;
        }
        var compare = valueCompare(leftMap[leftKeys[i]], rightMap[rightKeys[i]]);
        if (compare !== 0) {
            return compare;
        }
    }
    return primitiveComparator(leftKeys.length, rightKeys.length);
}
/**
 * Generates the canonical ID for the provided field value (as used in Target
 * serialization).
 */
function canonicalId(value) {
    return canonifyValue(value);
}
function canonifyValue(value) {
    if ('nullValue' in value) {
        return 'null';
    }
    else if ('booleanValue' in value) {
        return '' + value.booleanValue;
    }
    else if ('integerValue' in value) {
        return '' + value.integerValue;
    }
    else if ('doubleValue' in value) {
        return '' + value.doubleValue;
    }
    else if ('timestampValue' in value) {
        return canonifyTimestamp(value.timestampValue);
    }
    else if ('stringValue' in value) {
        return value.stringValue;
    }
    else if ('bytesValue' in value) {
        return canonifyByteString(value.bytesValue);
    }
    else if ('referenceValue' in value) {
        return canonifyReference(value.referenceValue);
    }
    else if ('geoPointValue' in value) {
        return canonifyGeoPoint(value.geoPointValue);
    }
    else if ('arrayValue' in value) {
        return canonifyArray(value.arrayValue);
    }
    else if ('mapValue' in value) {
        return canonifyMap(value.mapValue);
    }
    else {
        return fail();
    }
}
function canonifyByteString(byteString) {
    return normalizeByteString(byteString).toBase64();
}
function canonifyTimestamp(timestamp) {
    var normalizedTimestamp = normalizeTimestamp(timestamp);
    return "time(" + normalizedTimestamp.seconds + "," + normalizedTimestamp.nanos + ")";
}
function canonifyGeoPoint(geoPoint) {
    return "geo(" + geoPoint.latitude + "," + geoPoint.longitude + ")";
}
function canonifyReference(referenceValue) {
    return DocumentKey.fromName(referenceValue).toString();
}
function canonifyMap(mapValue) {
    // Iteration order in JavaScript is not guaranteed. To ensure that we generate
    // matching canonical IDs for identical maps, we need to sort the keys.
    var sortedKeys = Object.keys(mapValue.fields || {}).sort();
    var result = '{';
    var first = true;
    for (var _i = 0, sortedKeys_1 = sortedKeys; _i < sortedKeys_1.length; _i++) {
        var key = sortedKeys_1[_i];
        if (!first) {
            result += ',';
        }
        else {
            first = false;
        }
        result += key + ":" + canonifyValue(mapValue.fields[key]);
    }
    return result + '}';
}
function canonifyArray(arrayValue) {
    var result = '[';
    var first = true;
    for (var _i = 0, _e = arrayValue.values || []; _i < _e.length; _i++) {
        var value = _e[_i];
        if (!first) {
            result += ',';
        }
        else {
            first = false;
        }
        result += canonifyValue(value);
    }
    return result + ']';
}
/**
 * Converts the possible Proto values for a timestamp value into a "seconds and
 * nanos" representation.
 */
function normalizeTimestamp(date) {
    hardAssert(!!date);
    // The json interface (for the browser) will return an iso timestamp string,
    // while the proto js library (for node) will return a
    // google.protobuf.Timestamp instance.
    if (typeof date === 'string') {
        // The date string can have higher precision (nanos) than the Date class
        // (millis), so we do some custom parsing here.
        // Parse the nanos right out of the string.
        var nanos = 0;
        var fraction = ISO_TIMESTAMP_REG_EXP.exec(date);
        hardAssert(!!fraction);
        if (fraction[1]) {
            // Pad the fraction out to 9 digits (nanos).
            var nanoStr = fraction[1];
            nanoStr = (nanoStr + '000000000').substr(0, 9);
            nanos = Number(nanoStr);
        }
        // Parse the date to get the seconds.
        var parsedDate = new Date(date);
        var seconds = Math.floor(parsedDate.getTime() / 1000);
        return { seconds: seconds, nanos: nanos };
    }
    else {
        // TODO(b/37282237): Use strings for Proto3 timestamps
        // assert(!this.options.useProto3Json,
        //   'The timestamp instance format requires Proto JS.');
        var seconds = normalizeNumber(date.seconds);
        var nanos = normalizeNumber(date.nanos);
        return { seconds: seconds, nanos: nanos };
    }
}
/**
 * Converts the possible Proto types for numbers into a JavaScript number.
 * Returns 0 if the value is not numeric.
 */
function normalizeNumber(value) {
    // TODO(bjornick): Handle int64 greater than 53 bits.
    if (typeof value === 'number') {
        return value;
    }
    else if (typeof value === 'string') {
        return Number(value);
    }
    else {
        return 0;
    }
}
/** Converts the possible Proto types for Blobs into a ByteString. */
function normalizeByteString(blob) {
    if (typeof blob === 'string') {
        return ByteString.fromBase64String(blob);
    }
    else {
        return ByteString.fromUint8Array(blob);
    }
}
/** Returns a reference value for the provided database and key. */
function refValue(databaseId, key) {
    return {
        referenceValue: "projects/" + databaseId.projectId + "/databases/" + databaseId.database + "/documents/" + key.path.canonicalString()
    };
}
/** Returns true if `value` is an IntegerValue . */
function isInteger(value) {
    return !!value && 'integerValue' in value;
}
/** Returns true if `value` is a DoubleValue. */
function isDouble(value) {
    return !!value && 'doubleValue' in value;
}
/** Returns true if `value` is either an IntegerValue or a DoubleValue. */
function isNumber(value) {
    return isInteger(value) || isDouble(value);
}
/** Returns true if `value` is an ArrayValue. */
function isArray(value) {
    return !!value && 'arrayValue' in value;
}
/** Returns true if `value` is a NullValue. */
function isNullValue(value) {
    return !!value && 'nullValue' in value;
}
/** Returns true if `value` is NaN. */
function isNanValue(value) {
    return !!value && 'doubleValue' in value && isNaN(Number(value.doubleValue));
}
/** Returns true if `value` is a MapValue. */
function isMapValue(value) {
    return !!value && 'mapValue' in value;
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
 */
var MaybeDocument = /** @class */ (function () {
    function MaybeDocument(key, version) {
        this.key = key;
        this.version = version;
    }
    return MaybeDocument;
}());
/**
 * Represents a document in Firestore with a key, version, data and whether the
 * data has local mutations applied to it.
 */
var Document = /** @class */ (function (_super) {
    tslib.__extends(Document, _super);
    function Document(key, version, objectValue, options) {
        var _this = _super.call(this, key, version) || this;
        _this.objectValue = objectValue;
        _this.hasLocalMutations = !!options.hasLocalMutations;
        _this.hasCommittedMutations = !!options.hasCommittedMutations;
        return _this;
    }
    Document.prototype.field = function (path) {
        return this.objectValue.field(path);
    };
    Document.prototype.data = function () {
        return this.objectValue;
    };
    Document.prototype.toProto = function () {
        return this.objectValue.proto;
    };
    Document.prototype.isEqual = function (other) {
        return (other instanceof Document &&
            this.key.isEqual(other.key) &&
            this.version.isEqual(other.version) &&
            this.hasLocalMutations === other.hasLocalMutations &&
            this.hasCommittedMutations === other.hasCommittedMutations &&
            this.objectValue.isEqual(other.objectValue));
    };
    Document.prototype.toString = function () {
        return ("Document(" + this.key + ", " + this.version + ", " + this.objectValue.toString() + ", " +
            ("{hasLocalMutations: " + this.hasLocalMutations + "}), ") +
            ("{hasCommittedMutations: " + this.hasCommittedMutations + "})"));
    };
    Object.defineProperty(Document.prototype, "hasPendingWrites", {
        get: function () {
            return this.hasLocalMutations || this.hasCommittedMutations;
        },
        enumerable: false,
        configurable: true
    });
    return Document;
}(MaybeDocument));
/**
 * Compares the value for field `field` in the provided documents. Throws if
 * the field does not exist in both documents.
 */
function compareDocumentsByField(field, d1, d2) {
    var v1 = d1.field(field);
    var v2 = d2.field(field);
    if (v1 !== null && v2 !== null) {
        return valueCompare(v1, v2);
    }
    else {
        return fail();
    }
}
/**
 * A class representing a deleted document.
 * Version is set to 0 if we don't point to any specific time, otherwise it
 * denotes time we know it didn't exist at.
 */
var NoDocument = /** @class */ (function (_super) {
    tslib.__extends(NoDocument, _super);
    function NoDocument(key, version, options) {
        var _this = _super.call(this, key, version) || this;
        _this.hasCommittedMutations = !!(options && options.hasCommittedMutations);
        return _this;
    }
    NoDocument.prototype.toString = function () {
        return "NoDocument(" + this.key + ", " + this.version + ")";
    };
    Object.defineProperty(NoDocument.prototype, "hasPendingWrites", {
        get: function () {
            return this.hasCommittedMutations;
        },
        enumerable: false,
        configurable: true
    });
    NoDocument.prototype.isEqual = function (other) {
        return (other instanceof NoDocument &&
            other.hasCommittedMutations === this.hasCommittedMutations &&
            other.version.isEqual(this.version) &&
            other.key.isEqual(this.key));
    };
    return NoDocument;
}(MaybeDocument));
/**
 * A class representing an existing document whose data is unknown (e.g. a
 * document that was updated without a known base document).
 */
var UnknownDocument = /** @class */ (function (_super) {
    tslib.__extends(UnknownDocument, _super);
    function UnknownDocument() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UnknownDocument.prototype.toString = function () {
        return "UnknownDocument(" + this.key + ", " + this.version + ")";
    };
    Object.defineProperty(UnknownDocument.prototype, "hasPendingWrites", {
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    UnknownDocument.prototype.isEqual = function (other) {
        return (other instanceof UnknownDocument &&
            other.version.isEqual(this.version) &&
            other.key.isEqual(this.key));
    };
    return UnknownDocument;
}(MaybeDocument));
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
var TargetImpl = /** @class */ (function () {
    function TargetImpl(path, collectionGroup, orderBy, filters, limit, startAt, endAt) {
        if (collectionGroup === void 0) { collectionGroup = null; }
        if (orderBy === void 0) { orderBy = []; }
        if (filters === void 0) { filters = []; }
        if (limit === void 0) { limit = null; }
        if (startAt === void 0) { startAt = null; }
        if (endAt === void 0) { endAt = null; }
        this.path = path;
        this.collectionGroup = collectionGroup;
        this.orderBy = orderBy;
        this.filters = filters;
        this.limit = limit;
        this.startAt = startAt;
        this.endAt = endAt;
        this.memoizedCanonicalId = null;
    }
    return TargetImpl;
}());
/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */
function newTarget(path, collectionGroup, orderBy, filters, limit, startAt, endAt) {
    if (collectionGroup === void 0) { collectionGroup = null; }
    if (orderBy === void 0) { orderBy = []; }
    if (filters === void 0) { filters = []; }
    if (limit === void 0) { limit = null; }
    if (startAt === void 0) { startAt = null; }
    if (endAt === void 0) { endAt = null; }
    return new TargetImpl(path, collectionGroup, orderBy, filters, limit, startAt, endAt);
}
function canonifyTarget(target) {
    var targetImpl = debugCast(target);
    if (targetImpl.memoizedCanonicalId === null) {
        var canonicalId_1 = targetImpl.path.canonicalString();
        if (targetImpl.collectionGroup !== null) {
            canonicalId_1 += '|cg:' + targetImpl.collectionGroup;
        }
        canonicalId_1 += '|f:';
        canonicalId_1 += targetImpl.filters.map(function (f) { return canonifyFilter(f); }).join(',');
        canonicalId_1 += '|ob:';
        canonicalId_1 += targetImpl.orderBy.map(function (o) { return canonifyOrderBy(o); }).join(',');
        if (!isNullOrUndefined(targetImpl.limit)) {
            canonicalId_1 += '|l:';
            canonicalId_1 += targetImpl.limit;
        }
        if (targetImpl.startAt) {
            canonicalId_1 += '|lb:';
            canonicalId_1 += canonifyBound(targetImpl.startAt);
        }
        if (targetImpl.endAt) {
            canonicalId_1 += '|ub:';
            canonicalId_1 += canonifyBound(targetImpl.endAt);
        }
        targetImpl.memoizedCanonicalId = canonicalId_1;
    }
    return targetImpl.memoizedCanonicalId;
}
function stringifyTarget(target) {
    var str = target.path.canonicalString();
    if (target.collectionGroup !== null) {
        str += ' collectionGroup=' + target.collectionGroup;
    }
    if (target.filters.length > 0) {
        str += ", filters: [" + target.filters
            .map(function (f) { return stringifyFilter(f); })
            .join(', ') + "]";
    }
    if (!isNullOrUndefined(target.limit)) {
        str += ', limit: ' + target.limit;
    }
    if (target.orderBy.length > 0) {
        str += ", orderBy: [" + target.orderBy
            .map(function (o) { return stringifyOrderBy(o); })
            .join(', ') + "]";
    }
    if (target.startAt) {
        str += ', startAt: ' + canonifyBound(target.startAt);
    }
    if (target.endAt) {
        str += ', endAt: ' + canonifyBound(target.endAt);
    }
    return "Target(" + str + ")";
}
function targetEquals(left, right) {
    if (left.limit !== right.limit) {
        return false;
    }
    if (left.orderBy.length !== right.orderBy.length) {
        return false;
    }
    for (var i = 0; i < left.orderBy.length; i++) {
        if (!orderByEquals(left.orderBy[i], right.orderBy[i])) {
            return false;
        }
    }
    if (left.filters.length !== right.filters.length) {
        return false;
    }
    for (var i = 0; i < left.filters.length; i++) {
        if (!filterEquals(left.filters[i], right.filters[i])) {
            return false;
        }
    }
    if (left.collectionGroup !== right.collectionGroup) {
        return false;
    }
    if (!left.path.isEqual(right.path)) {
        return false;
    }
    if (!boundEquals(left.startAt, right.startAt)) {
        return false;
    }
    return boundEquals(left.endAt, right.endAt);
}
function isDocumentTarget(target) {
    return (DocumentKey.isDocumentKey(target.path) &&
        target.collectionGroup === null &&
        target.filters.length === 0);
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
 */
function cast(obj, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
constructor) {
    if (!(obj instanceof constructor)) {
        if (constructor.name === obj.constructor.name) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Type does not match the expected instance. Did you pass ' +
                ("'" + constructor.name + "' from a different Firestore SDK?"));
        }
        else {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Expected type '" + constructor.name + "', but was '" + obj.constructor.name + "'");
        }
    }
    return obj;
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
var QueryImpl = /** @class */ (function () {
    /**
     * Initializes a Query with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     */
    function QueryImpl(path, collectionGroup, explicitOrderBy, filters, limit, limitType /* First */, startAt, endAt) {
        if (collectionGroup === void 0) { collectionGroup = null; }
        if (explicitOrderBy === void 0) { explicitOrderBy = []; }
        if (filters === void 0) { filters = []; }
        if (limit === void 0) { limit = null; }
        if (limitType === void 0) { limitType = "F"; }
        if (startAt === void 0) { startAt = null; }
        if (endAt === void 0) { endAt = null; }
        this.path = path;
        this.collectionGroup = collectionGroup;
        this.explicitOrderBy = explicitOrderBy;
        this.filters = filters;
        this.limit = limit;
        this.limitType = limitType;
        this.startAt = startAt;
        this.endAt = endAt;
        this.memoizedOrderBy = null;
        // The corresponding `Target` of this `Query` instance.
        this.memoizedTarget = null;
        if (this.startAt)
            ;
        if (this.endAt)
            ;
    }
    /**
     * Helper to convert a collection group query into a collection query at a
     * specific path. This is used when executing collection group queries, since
     * we have to split the query into a set of collection queries at multiple
     * paths.
     */
    QueryImpl.prototype.asCollectionQueryAtPath = function (path) {
        return new QueryImpl(path, 
        /*collectionGroup=*/ null, this.explicitOrderBy.slice(), this.filters.slice(), this.limit, this.limitType, this.startAt, this.endAt);
    };
    QueryImpl.prototype.matchesAllDocuments = function () {
        return (this.filters.length === 0 &&
            this.limit === null &&
            this.startAt == null &&
            this.endAt == null &&
            (this.explicitOrderBy.length === 0 ||
                (this.explicitOrderBy.length === 1 &&
                    this.explicitOrderBy[0].field.isKeyField())));
    };
    QueryImpl.prototype.hasLimitToFirst = function () {
        return !isNullOrUndefined(this.limit) && this.limitType === "F" /* First */;
    };
    QueryImpl.prototype.hasLimitToLast = function () {
        return !isNullOrUndefined(this.limit) && this.limitType === "L" /* Last */;
    };
    QueryImpl.prototype.getFirstOrderByField = function () {
        return this.explicitOrderBy.length > 0
            ? this.explicitOrderBy[0].field
            : null;
    };
    QueryImpl.prototype.getInequalityFilterField = function () {
        for (var _i = 0, _e = this.filters; _i < _e.length; _i++) {
            var filter = _e[_i];
            if (filter.isInequality()) {
                return filter.field;
            }
        }
        return null;
    };
    QueryImpl.prototype.findFilterOperator = function (operators) {
        for (var _i = 0, _e = this.filters; _i < _e.length; _i++) {
            var filter = _e[_i];
            if (operators.indexOf(filter.op) >= 0) {
                return filter.op;
            }
        }
        return null;
    };
    return QueryImpl;
}());
/** Creates a new Query for a query that matches all documents at `path` */
function newQueryForPath(path) {
    return new QueryImpl(path);
}
/**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
function newQueryForCollectionGroup(collectionId) {
    return new QueryImpl(ResourcePath.emptyPath(), collectionId);
}
/**
 * Returns whether the query matches a single document by path (rather than a
 * collection).
 */
function isDocumentQuery(query) {
    return (DocumentKey.isDocumentKey(query.path) &&
        query.collectionGroup === null &&
        query.filters.length === 0);
}
/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */
function isCollectionGroupQuery(query) {
    return query.collectionGroup !== null;
}
/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */
function queryOrderBy(query) {
    var queryImpl = cast(query, QueryImpl);
    if (queryImpl.memoizedOrderBy === null) {
        queryImpl.memoizedOrderBy = [];
        var inequalityField = queryImpl.getInequalityFilterField();
        var firstOrderByField = queryImpl.getFirstOrderByField();
        if (inequalityField !== null && firstOrderByField === null) {
            // In order to implicitly add key ordering, we must also add the
            // inequality filter field for it to be a valid query.
            // Note that the default inequality field and key ordering is ascending.
            if (!inequalityField.isKeyField()) {
                queryImpl.memoizedOrderBy.push(new OrderBy(inequalityField));
            }
            queryImpl.memoizedOrderBy.push(new OrderBy(FieldPath.keyField(), "asc" /* ASCENDING */));
        }
        else {
            var foundKeyOrdering = false;
            for (var _i = 0, _e = queryImpl.explicitOrderBy; _i < _e.length; _i++) {
                var orderBy = _e[_i];
                queryImpl.memoizedOrderBy.push(orderBy);
                if (orderBy.field.isKeyField()) {
                    foundKeyOrdering = true;
                }
            }
            if (!foundKeyOrdering) {
                // The order of the implicit key ordering always matches the last
                // explicit order by
                var lastDirection = queryImpl.explicitOrderBy.length > 0
                    ? queryImpl.explicitOrderBy[queryImpl.explicitOrderBy.length - 1]
                        .dir
                    : "asc" /* ASCENDING */;
                queryImpl.memoizedOrderBy.push(new OrderBy(FieldPath.keyField(), lastDirection));
            }
        }
    }
    return queryImpl.memoizedOrderBy;
}
/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */
function queryToTarget(query) {
    var queryImpl = cast(query, QueryImpl);
    if (!queryImpl.memoizedTarget) {
        if (queryImpl.limitType === "F" /* First */) {
            queryImpl.memoizedTarget = newTarget(queryImpl.path, queryImpl.collectionGroup, queryOrderBy(queryImpl), queryImpl.filters, queryImpl.limit, queryImpl.startAt, queryImpl.endAt);
        }
        else {
            // Flip the orderBy directions since we want the last results
            var orderBys = [];
            for (var _i = 0, _e = queryOrderBy(queryImpl); _i < _e.length; _i++) {
                var orderBy = _e[_i];
                var dir = orderBy.dir === "desc" /* DESCENDING */
                    ? "asc" /* ASCENDING */
                    : "desc" /* DESCENDING */;
                orderBys.push(new OrderBy(orderBy.field, dir));
            }
            // We need to swap the cursors to match the now-flipped query ordering.
            var startAt = queryImpl.endAt
                ? new Bound(queryImpl.endAt.position, !queryImpl.endAt.before)
                : null;
            var endAt = queryImpl.startAt
                ? new Bound(queryImpl.startAt.position, !queryImpl.startAt.before)
                : null;
            // Now return as a LimitType.First query.
            queryImpl.memoizedTarget = newTarget(queryImpl.path, queryImpl.collectionGroup, orderBys, queryImpl.filters, queryImpl.limit, startAt, endAt);
        }
    }
    return queryImpl.memoizedTarget;
}
function queryWithAddedFilter(query, filter) {
    var newFilters = query.filters.concat([filter]);
    return new QueryImpl(query.path, query.collectionGroup, query.explicitOrderBy.slice(), newFilters, query.limit, query.limitType, query.startAt, query.endAt);
}
function queryWithAddedOrderBy(query, orderBy) {
    // TODO(dimond): validate that orderBy does not list the same key twice.
    var newOrderBy = query.explicitOrderBy.concat([orderBy]);
    return new QueryImpl(query.path, query.collectionGroup, newOrderBy, query.filters.slice(), query.limit, query.limitType, query.startAt, query.endAt);
}
function queryWithLimit(query, limit, limitType) {
    return new QueryImpl(query.path, query.collectionGroup, query.explicitOrderBy.slice(), query.filters.slice(), limit, limitType, query.startAt, query.endAt);
}
function queryWithStartAt(query, bound) {
    return new QueryImpl(query.path, query.collectionGroup, query.explicitOrderBy.slice(), query.filters.slice(), query.limit, query.limitType, bound, query.endAt);
}
function queryWithEndAt(query, bound) {
    return new QueryImpl(query.path, query.collectionGroup, query.explicitOrderBy.slice(), query.filters.slice(), query.limit, query.limitType, query.startAt, bound);
}
function queryEquals(left, right) {
    return (targetEquals(queryToTarget(left), queryToTarget(right)) &&
        left.limitType === right.limitType);
}
// TODO(b/29183165): This is used to get a unique string from a query to, for
// example, use as a dictionary key, but the implementation is subject to
// collisions. Make it collision-free.
function canonifyQuery(query) {
    return canonifyTarget(queryToTarget(query)) + "|lt:" + query.limitType;
}
function stringifyQuery(query) {
    return "Query(target=" + stringifyTarget(queryToTarget(query)) + "; limitType=" + query.limitType + ")";
}
/** Returns whether `doc` matches the constraints of `query`. */
function queryMatches(query, doc) {
    return (queryMatchesPathAndCollectionGroup(query, doc) &&
        queryMatchesOrderBy(query, doc) &&
        queryMatchesFilters(query, doc) &&
        queryMatchesBounds(query, doc));
}
function queryMatchesPathAndCollectionGroup(query, doc) {
    var docPath = doc.key.path;
    if (query.collectionGroup !== null) {
        // NOTE: this.path is currently always empty since we don't expose Collection
        // Group queries rooted at a document path yet.
        return (doc.key.hasCollectionId(query.collectionGroup) &&
            query.path.isPrefixOf(docPath));
    }
    else if (DocumentKey.isDocumentKey(query.path)) {
        // exact match for document queries
        return query.path.isEqual(docPath);
    }
    else {
        // shallow ancestor queries by default
        return query.path.isImmediateParentOf(docPath);
    }
}
/**
 * A document must have a value for every ordering clause in order to show up
 * in the results.
 */
function queryMatchesOrderBy(query, doc) {
    for (var _i = 0, _e = query.explicitOrderBy; _i < _e.length; _i++) {
        var orderBy = _e[_i];
        // order by key always matches
        if (!orderBy.field.isKeyField() && doc.field(orderBy.field) === null) {
            return false;
        }
    }
    return true;
}
function queryMatchesFilters(query, doc) {
    for (var _i = 0, _e = query.filters; _i < _e.length; _i++) {
        var filter = _e[_i];
        if (!filter.matches(doc)) {
            return false;
        }
    }
    return true;
}
/** Makes sure a document is within the bounds, if provided. */
function queryMatchesBounds(query, doc) {
    if (query.startAt &&
        !sortsBeforeDocument(query.startAt, queryOrderBy(query), doc)) {
        return false;
    }
    if (query.endAt &&
        sortsBeforeDocument(query.endAt, queryOrderBy(query), doc)) {
        return false;
    }
    return true;
}
/**
 * Returns a new comparator function that can be used to compare two documents
 * based on the Query's ordering constraint.
 */
function newQueryComparator(query) {
    return function (d1, d2) {
        var comparedOnKeyField = false;
        for (var _i = 0, _e = queryOrderBy(query); _i < _e.length; _i++) {
            var orderBy = _e[_i];
            var comp = compareDocs(orderBy, d1, d2);
            if (comp !== 0) {
                return comp;
            }
            comparedOnKeyField = comparedOnKeyField || orderBy.field.isKeyField();
        }
        return 0;
    };
}
var Filter = /** @class */ (function () {
    function Filter() {
    }
    return Filter;
}());
var FieldFilter = /** @class */ (function (_super) {
    tslib.__extends(FieldFilter, _super);
    function FieldFilter(field, op, value) {
        var _this = _super.call(this) || this;
        _this.field = field;
        _this.op = op;
        _this.value = value;
        return _this;
    }
    /**
     * Creates a filter based on the provided arguments.
     */
    FieldFilter.create = function (field, op, value) {
        if (field.isKeyField()) {
            if (op === "in" /* IN */ || op === "not-in" /* NOT_IN */) {
                return this.createKeyFieldInFilter(field, op, value);
            }
            else {
                return new KeyFieldFilter(field, op, value);
            }
        }
        else if (isNullValue(value)) {
            if (op !== "==" /* EQUAL */ && op !== "!=" /* NOT_EQUAL */) {
                // TODO(ne-queries): Update error message to include != comparison.
                throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. Null supports only equality comparisons.');
            }
            return new FieldFilter(field, op, value);
        }
        else if (isNanValue(value)) {
            if (op !== "==" /* EQUAL */ && op !== "!=" /* NOT_EQUAL */) {
                // TODO(ne-queries): Update error message to include != comparison.
                throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. NaN supports only equality comparisons.');
            }
            return new FieldFilter(field, op, value);
        }
        else if (op === "array-contains" /* ARRAY_CONTAINS */) {
            return new ArrayContainsFilter(field, value);
        }
        else if (op === "in" /* IN */) {
            return new InFilter(field, value);
        }
        else if (op === "not-in" /* NOT_IN */) {
            return new NotInFilter(field, value);
        }
        else if (op === "array-contains-any" /* ARRAY_CONTAINS_ANY */) {
            return new ArrayContainsAnyFilter(field, value);
        }
        else {
            return new FieldFilter(field, op, value);
        }
    };
    FieldFilter.createKeyFieldInFilter = function (field, op, value) {
        return op === "in" /* IN */
            ? new KeyFieldInFilter(field, value)
            : new KeyFieldNotInFilter(field, value);
    };
    FieldFilter.prototype.matches = function (doc) {
        var other = doc.field(this.field);
        // Types do not have to match in NOT_EQUAL filters.
        if (this.op === "!=" /* NOT_EQUAL */) {
            return (other !== null &&
                this.matchesComparison(valueCompare(other, this.value)));
        }
        // Only compare types with matching backend order (such as double and int).
        return (other !== null &&
            typeOrder(this.value) === typeOrder(other) &&
            this.matchesComparison(valueCompare(other, this.value)));
    };
    FieldFilter.prototype.matchesComparison = function (comparison) {
        switch (this.op) {
            case "<" /* LESS_THAN */:
                return comparison < 0;
            case "<=" /* LESS_THAN_OR_EQUAL */:
                return comparison <= 0;
            case "==" /* EQUAL */:
                return comparison === 0;
            case "!=" /* NOT_EQUAL */:
                return comparison !== 0;
            case ">" /* GREATER_THAN */:
                return comparison > 0;
            case ">=" /* GREATER_THAN_OR_EQUAL */:
                return comparison >= 0;
            default:
                return fail();
        }
    };
    FieldFilter.prototype.isInequality = function () {
        return ([
            "<" /* LESS_THAN */,
            "<=" /* LESS_THAN_OR_EQUAL */,
            ">" /* GREATER_THAN */,
            ">=" /* GREATER_THAN_OR_EQUAL */,
            "!=" /* NOT_EQUAL */
        ].indexOf(this.op) >= 0);
    };
    return FieldFilter;
}(Filter));
function canonifyFilter(filter) {
    // TODO(b/29183165): Technically, this won't be unique if two values have
    // the same description, such as the int 3 and the string "3". So we should
    // add the types in here somehow, too.
    return (filter.field.canonicalString() +
        filter.op.toString() +
        canonicalId(filter.value));
}
function filterEquals(f1, f2) {
    return (f1.op === f2.op &&
        f1.field.isEqual(f2.field) &&
        valueEquals(f1.value, f2.value));
}
/** Returns a debug description for `filter`. */
function stringifyFilter(filter) {
    return filter.field.canonicalString() + " " + filter.op + " " + canonicalId(filter.value);
}
/** Filter that matches on key fields (i.e. '__name__'). */
var KeyFieldFilter = /** @class */ (function (_super) {
    tslib.__extends(KeyFieldFilter, _super);
    function KeyFieldFilter(field, op, value) {
        var _this = _super.call(this, field, op, value) || this;
        _this.key = DocumentKey.fromName(value.referenceValue);
        return _this;
    }
    KeyFieldFilter.prototype.matches = function (doc) {
        var comparison = DocumentKey.comparator(doc.key, this.key);
        return this.matchesComparison(comparison);
    };
    return KeyFieldFilter;
}(FieldFilter));
/** Filter that matches on key fields within an array. */
var KeyFieldInFilter = /** @class */ (function (_super) {
    tslib.__extends(KeyFieldInFilter, _super);
    function KeyFieldInFilter(field, value) {
        var _this = _super.call(this, field, "in" /* IN */, value) || this;
        _this.keys = extractDocumentKeysFromArrayValue("in" /* IN */, value);
        return _this;
    }
    KeyFieldInFilter.prototype.matches = function (doc) {
        return this.keys.some(function (key) { return key.isEqual(doc.key); });
    };
    return KeyFieldInFilter;
}(FieldFilter));
/** Filter that matches on key fields not present within an array. */
var KeyFieldNotInFilter = /** @class */ (function (_super) {
    tslib.__extends(KeyFieldNotInFilter, _super);
    function KeyFieldNotInFilter(field, value) {
        var _this = _super.call(this, field, "not-in" /* NOT_IN */, value) || this;
        _this.keys = extractDocumentKeysFromArrayValue("not-in" /* NOT_IN */, value);
        return _this;
    }
    KeyFieldNotInFilter.prototype.matches = function (doc) {
        return !this.keys.some(function (key) { return key.isEqual(doc.key); });
    };
    return KeyFieldNotInFilter;
}(FieldFilter));
function extractDocumentKeysFromArrayValue(op, value) {
    var _a;
    return (((_a = value.arrayValue) === null || _a === void 0 ? void 0 : _a.values) || []).map(function (v) {
        return DocumentKey.fromName(v.referenceValue);
    });
}
/** A Filter that implements the array-contains operator. */
var ArrayContainsFilter = /** @class */ (function (_super) {
    tslib.__extends(ArrayContainsFilter, _super);
    function ArrayContainsFilter(field, value) {
        return _super.call(this, field, "array-contains" /* ARRAY_CONTAINS */, value) || this;
    }
    ArrayContainsFilter.prototype.matches = function (doc) {
        var other = doc.field(this.field);
        return isArray(other) && arrayValueContains(other.arrayValue, this.value);
    };
    return ArrayContainsFilter;
}(FieldFilter));
/** A Filter that implements the IN operator. */
var InFilter = /** @class */ (function (_super) {
    tslib.__extends(InFilter, _super);
    function InFilter(field, value) {
        return _super.call(this, field, "in" /* IN */, value) || this;
    }
    InFilter.prototype.matches = function (doc) {
        var other = doc.field(this.field);
        return other !== null && arrayValueContains(this.value.arrayValue, other);
    };
    return InFilter;
}(FieldFilter));
/** A Filter that implements the not-in operator. */
var NotInFilter = /** @class */ (function (_super) {
    tslib.__extends(NotInFilter, _super);
    function NotInFilter(field, value) {
        return _super.call(this, field, "not-in" /* NOT_IN */, value) || this;
    }
    NotInFilter.prototype.matches = function (doc) {
        var other = doc.field(this.field);
        return other !== null && !arrayValueContains(this.value.arrayValue, other);
    };
    return NotInFilter;
}(FieldFilter));
/** A Filter that implements the array-contains-any operator. */
var ArrayContainsAnyFilter = /** @class */ (function (_super) {
    tslib.__extends(ArrayContainsAnyFilter, _super);
    function ArrayContainsAnyFilter(field, value) {
        return _super.call(this, field, "array-contains-any" /* ARRAY_CONTAINS_ANY */, value) || this;
    }
    ArrayContainsAnyFilter.prototype.matches = function (doc) {
        var _this = this;
        var other = doc.field(this.field);
        if (!isArray(other) || !other.arrayValue.values) {
            return false;
        }
        return other.arrayValue.values.some(function (val) { return arrayValueContains(_this.value.arrayValue, val); });
    };
    return ArrayContainsAnyFilter;
}(FieldFilter));
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
 */
var Bound = /** @class */ (function () {
    function Bound(position, before) {
        this.position = position;
        this.before = before;
    }
    return Bound;
}());
function canonifyBound(bound) {
    // TODO(b/29183165): Make this collision robust.
    return (bound.before ? 'b' : 'a') + ":" + bound.position
        .map(function (p) { return canonicalId(p); })
        .join(',');
}
/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */
function sortsBeforeDocument(bound, orderBy, doc) {
    var comparison = 0;
    for (var i = 0; i < bound.position.length; i++) {
        var orderByComponent = orderBy[i];
        var component = bound.position[i];
        if (orderByComponent.field.isKeyField()) {
            comparison = DocumentKey.comparator(DocumentKey.fromName(component.referenceValue), doc.key);
        }
        else {
            var docValue = doc.field(orderByComponent.field);
            comparison = valueCompare(component, docValue);
        }
        if (orderByComponent.dir === "desc" /* DESCENDING */) {
            comparison = comparison * -1;
        }
        if (comparison !== 0) {
            break;
        }
    }
    return bound.before ? comparison <= 0 : comparison < 0;
}
function boundEquals(left, right) {
    if (left === null) {
        return right === null;
    }
    else if (right === null) {
        return false;
    }
    if (left.before !== right.before ||
        left.position.length !== right.position.length) {
        return false;
    }
    for (var i = 0; i < left.position.length; i++) {
        var leftPosition = left.position[i];
        var rightPosition = right.position[i];
        if (!valueEquals(leftPosition, rightPosition)) {
            return false;
        }
    }
    return true;
}
/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */
var OrderBy = /** @class */ (function () {
    function OrderBy(field, dir /* ASCENDING */) {
        if (dir === void 0) { dir = "asc"; }
        this.field = field;
        this.dir = dir;
    }
    return OrderBy;
}());
function compareDocs(orderBy, d1, d2) {
    var comparison = orderBy.field.isKeyField()
        ? DocumentKey.comparator(d1.key, d2.key)
        : compareDocumentsByField(orderBy.field, d1, d2);
    switch (orderBy.dir) {
        case "asc" /* ASCENDING */:
            return comparison;
        case "desc" /* DESCENDING */:
            return -1 * comparison;
        default:
            return fail();
    }
}
function canonifyOrderBy(orderBy) {
    // TODO(b/29183165): Make this collision robust.
    return orderBy.field.canonicalString() + orderBy.dir;
}
function stringifyOrderBy(orderBy) {
    return orderBy.field.canonicalString() + " (" + orderBy.dir + ")";
}
function orderByEquals(left, right) {
    return left.dir === right.dir && left.field.isEqual(right.field);
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
 */
var SnapshotVersion = /** @class */ (function () {
    function SnapshotVersion(timestamp) {
        this.timestamp = timestamp;
    }
    SnapshotVersion.fromTimestamp = function (value) {
        return new SnapshotVersion(value);
    };
    SnapshotVersion.min = function () {
        return new SnapshotVersion(new Timestamp(0, 0));
    };
    SnapshotVersion.prototype.compareTo = function (other) {
        return this.timestamp._compareTo(other.timestamp);
    };
    SnapshotVersion.prototype.isEqual = function (other) {
        return this.timestamp.isEqual(other.timestamp);
    };
    /** Returns a number representation of the version for use in spec tests. */
    SnapshotVersion.prototype.toMicroseconds = function () {
        // Convert to microseconds.
        return this.timestamp.seconds * 1e6 + this.timestamp.nanoseconds / 1000;
    };
    SnapshotVersion.prototype.toString = function () {
        return 'SnapshotVersion(' + this.timestamp.toString() + ')';
    };
    SnapshotVersion.prototype.toTimestamp = function () {
        return this.timestamp;
    };
    return SnapshotVersion;
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
 * An ObjectValue represents a MapValue in the Firestore Proto and offers the
 * ability to add and remove fields (via the ObjectValueBuilder).
 */
var ObjectValue = /** @class */ (function () {
    function ObjectValue(proto) {
        this.proto = proto;
    }
    ObjectValue.empty = function () {
        return new ObjectValue({ mapValue: {} });
    };
    /**
     * Returns the value at the given path or null.
     *
     * @param path the path to search
     * @return The value at the path or if there it doesn't exist.
     */
    ObjectValue.prototype.field = function (path) {
        if (path.isEmpty()) {
            return this.proto;
        }
        else {
            var value = this.proto;
            for (var i = 0; i < path.length - 1; ++i) {
                if (!value.mapValue.fields) {
                    return null;
                }
                value = value.mapValue.fields[path.get(i)];
                if (!isMapValue(value)) {
                    return null;
                }
            }
            value = (value.mapValue.fields || {})[path.lastSegment()];
            return value || null;
        }
    };
    ObjectValue.prototype.isEqual = function (other) {
        return valueEquals(this.proto, other.proto);
    };
    return ObjectValue;
}());
/**
 * An ObjectValueBuilder provides APIs to set and delete fields from an
 * ObjectValue.
 */
var ObjectValueBuilder = /** @class */ (function () {
    /**
     * @param baseObject The object to mutate.
     */
    function ObjectValueBuilder(baseObject) {
        if (baseObject === void 0) { baseObject = ObjectValue.empty(); }
        this.baseObject = baseObject;
        /** A map that contains the accumulated changes in this builder. */
        this.overlayMap = new Map();
    }
    /**
     * Sets the field to the provided value.
     *
     * @param path The field path to set.
     * @param value The value to set.
     * @return The current Builder instance.
     */
    ObjectValueBuilder.prototype.set = function (path, value) {
        this.setOverlay(path, value);
        return this;
    };
    /**
     * Removes the field at the specified path. If there is no field at the
     * specified path, nothing is changed.
     *
     * @param path The field path to remove.
     * @return The current Builder instance.
     */
    ObjectValueBuilder.prototype.delete = function (path) {
        this.setOverlay(path, null);
        return this;
    };
    /**
     * Adds `value` to the overlay map at `path`. Creates nested map entries if
     * needed.
     */
    ObjectValueBuilder.prototype.setOverlay = function (path, value) {
        var currentLevel = this.overlayMap;
        for (var i = 0; i < path.length - 1; ++i) {
            var currentSegment = path.get(i);
            var currentValue = currentLevel.get(currentSegment);
            if (currentValue instanceof Map) {
                // Re-use a previously created map
                currentLevel = currentValue;
            }
            else if (currentValue &&
                typeOrder(currentValue) === 10 /* ObjectValue */) {
                // Convert the existing Protobuf MapValue into a map
                currentValue = new Map(Object.entries(currentValue.mapValue.fields || {}));
                currentLevel.set(currentSegment, currentValue);
                currentLevel = currentValue;
            }
            else {
                // Create an empty map to represent the current nesting level
                currentValue = new Map();
                currentLevel.set(currentSegment, currentValue);
                currentLevel = currentValue;
            }
        }
        currentLevel.set(path.lastSegment(), value);
    };
    /** Returns an ObjectValue with all mutations applied. */
    ObjectValueBuilder.prototype.build = function () {
        var mergedResult = this.applyOverlay(FieldPath.emptyPath(), this.overlayMap);
        if (mergedResult != null) {
            return new ObjectValue(mergedResult);
        }
        else {
            return this.baseObject;
        }
    };
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
    ObjectValueBuilder.prototype.applyOverlay = function (currentPath, currentOverlays) {
        var _this = this;
        var modified = false;
        var existingValue = this.baseObject.field(currentPath);
        var resultAtPath = isMapValue(existingValue)
            ? // If there is already data at the current path, base our
                Object.assign({}, existingValue.mapValue.fields) : {};
        currentOverlays.forEach(function (value, pathSegment) {
            if (value instanceof Map) {
                var nested = _this.applyOverlay(currentPath.child(pathSegment), value);
                if (nested != null) {
                    resultAtPath[pathSegment] = nested;
                    modified = true;
                }
            }
            else if (value !== null) {
                resultAtPath[pathSegment] = value;
                modified = true;
            }
            else if (resultAtPath.hasOwnProperty(pathSegment)) {
                delete resultAtPath[pathSegment];
                modified = true;
            }
        });
        return modified ? { mapValue: { fields: resultAtPath } } : null;
    };
    return ObjectValueBuilder;
}());
/**
 * Returns a FieldMask built from all fields in a MapValue.
 */
function extractFieldMask(value) {
    var fields = [];
    forEach(value.fields || {}, function (key, value) {
        var currentPath = new FieldPath([key]);
        if (isMapValue(value)) {
            var nestedMask = extractFieldMask(value.mapValue);
            var nestedFields = nestedMask.fields;
            if (nestedFields.length === 0) {
                // Preserve the empty map by adding it to the FieldMask.
                fields.push(currentPath);
            }
            else {
                // For nested and non-empty ObjectValues, add the FieldPath of the
                // leaf nodes.
                for (var _i = 0, nestedFields_1 = nestedFields; _i < nestedFields_1.length; _i++) {
                    var nestedPath = nestedFields_1[_i];
                    fields.push(currentPath.child(nestedPath));
                }
            }
        }
        else {
            // For nested and non-empty ObjectValues, add the FieldPath of the leaf
            // nodes.
            fields.push(currentPath);
        }
    });
    return new FieldMask(fields);
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
var ExistenceFilter = /** @class */ (function () {
    // TODO(b/33078163): just use simplest form of existence filter for now
    function ExistenceFilter(count) {
        this.count = count;
    }
    return ExistenceFilter;
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
 * Error Codes describing the different ways GRPC can fail. These are copied
 * directly from GRPC's sources here:
 *
 * https://github.com/grpc/grpc/blob/bceec94ea4fc5f0085d81235d8e1c06798dc341a/include/grpc%2B%2B/impl/codegen/status_code_enum.h
 *
 * Important! The names of these identifiers matter because the string forms
 * are used for reverse lookups from the webchannel stream. Do NOT change the
 * names of these identifiers or change this into a const enum.
 */
var RpcCode;
(function (RpcCode) {
    RpcCode[RpcCode["OK"] = 0] = "OK";
    RpcCode[RpcCode["CANCELLED"] = 1] = "CANCELLED";
    RpcCode[RpcCode["UNKNOWN"] = 2] = "UNKNOWN";
    RpcCode[RpcCode["INVALID_ARGUMENT"] = 3] = "INVALID_ARGUMENT";
    RpcCode[RpcCode["DEADLINE_EXCEEDED"] = 4] = "DEADLINE_EXCEEDED";
    RpcCode[RpcCode["NOT_FOUND"] = 5] = "NOT_FOUND";
    RpcCode[RpcCode["ALREADY_EXISTS"] = 6] = "ALREADY_EXISTS";
    RpcCode[RpcCode["PERMISSION_DENIED"] = 7] = "PERMISSION_DENIED";
    RpcCode[RpcCode["UNAUTHENTICATED"] = 16] = "UNAUTHENTICATED";
    RpcCode[RpcCode["RESOURCE_EXHAUSTED"] = 8] = "RESOURCE_EXHAUSTED";
    RpcCode[RpcCode["FAILED_PRECONDITION"] = 9] = "FAILED_PRECONDITION";
    RpcCode[RpcCode["ABORTED"] = 10] = "ABORTED";
    RpcCode[RpcCode["OUT_OF_RANGE"] = 11] = "OUT_OF_RANGE";
    RpcCode[RpcCode["UNIMPLEMENTED"] = 12] = "UNIMPLEMENTED";
    RpcCode[RpcCode["INTERNAL"] = 13] = "INTERNAL";
    RpcCode[RpcCode["UNAVAILABLE"] = 14] = "UNAVAILABLE";
    RpcCode[RpcCode["DATA_LOSS"] = 15] = "DATA_LOSS";
})(RpcCode || (RpcCode = {}));
/**
 * Determines whether an error code represents a permanent error when received
 * in response to a non-write operation.
 *
 * See isPermanentWriteError for classifying write errors.
 */
function isPermanentError(code) {
    switch (code) {
        case Code.OK:
            return fail();
        case Code.CANCELLED:
        case Code.UNKNOWN:
        case Code.DEADLINE_EXCEEDED:
        case Code.RESOURCE_EXHAUSTED:
        case Code.INTERNAL:
        case Code.UNAVAILABLE:
        // Unauthenticated means something went wrong with our token and we need
        // to retry with new credentials which will happen automatically.
        case Code.UNAUTHENTICATED:
            return false;
        case Code.INVALID_ARGUMENT:
        case Code.NOT_FOUND:
        case Code.ALREADY_EXISTS:
        case Code.PERMISSION_DENIED:
        case Code.FAILED_PRECONDITION:
        // Aborted might be retried in some scenarios, but that is dependant on
        // the context and should handled individually by the calling code.
        // See https://cloud.google.com/apis/design/errors.
        case Code.ABORTED:
        case Code.OUT_OF_RANGE:
        case Code.UNIMPLEMENTED:
        case Code.DATA_LOSS:
            return true;
        default:
            return fail();
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
function isPermanentWriteError(code) {
    return isPermanentError(code) && code !== Code.ABORTED;
}
/**
 * Maps an error Code from GRPC status code number, like 0, 1, or 14. These
 * are not the same as HTTP status codes.
 *
 * @returns The Code equivalent to the given GRPC status code. Fails if there
 *     is no match.
 */
function mapCodeFromRpcCode(code) {
    if (code === undefined) {
        // This shouldn't normally happen, but in certain error cases (like trying
        // to send invalid proto messages) we may get an error with no GRPC code.
        logError('GRPC error has no .code');
        return Code.UNKNOWN;
    }
    switch (code) {
        case RpcCode.OK:
            return Code.OK;
        case RpcCode.CANCELLED:
            return Code.CANCELLED;
        case RpcCode.UNKNOWN:
            return Code.UNKNOWN;
        case RpcCode.DEADLINE_EXCEEDED:
            return Code.DEADLINE_EXCEEDED;
        case RpcCode.RESOURCE_EXHAUSTED:
            return Code.RESOURCE_EXHAUSTED;
        case RpcCode.INTERNAL:
            return Code.INTERNAL;
        case RpcCode.UNAVAILABLE:
            return Code.UNAVAILABLE;
        case RpcCode.UNAUTHENTICATED:
            return Code.UNAUTHENTICATED;
        case RpcCode.INVALID_ARGUMENT:
            return Code.INVALID_ARGUMENT;
        case RpcCode.NOT_FOUND:
            return Code.NOT_FOUND;
        case RpcCode.ALREADY_EXISTS:
            return Code.ALREADY_EXISTS;
        case RpcCode.PERMISSION_DENIED:
            return Code.PERMISSION_DENIED;
        case RpcCode.FAILED_PRECONDITION:
            return Code.FAILED_PRECONDITION;
        case RpcCode.ABORTED:
            return Code.ABORTED;
        case RpcCode.OUT_OF_RANGE:
            return Code.OUT_OF_RANGE;
        case RpcCode.UNIMPLEMENTED:
            return Code.UNIMPLEMENTED;
        case RpcCode.DATA_LOSS:
            return Code.DATA_LOSS;
        default:
            return fail();
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
 */
var RemoteEvent = /** @class */ (function () {
    function RemoteEvent(
    /**
     * The snapshot version this event brings us up to, or MIN if not set.
     */
    snapshotVersion, 
    /**
     * A map from target to changes to the target. See TargetChange.
     */
    targetChanges, 
    /**
     * A set of targets that is known to be inconsistent. Listens for these
     * targets should be re-established without resume tokens.
     */
    targetMismatches, 
    /**
     * A set of which documents have changed or been deleted, along with the
     * doc's new values (if not deleted).
     */
    documentUpdates, 
    /**
     * A set of which document updates are due only to limbo resolution targets.
     */
    resolvedLimboDocuments) {
        this.snapshotVersion = snapshotVersion;
        this.targetChanges = targetChanges;
        this.targetMismatches = targetMismatches;
        this.documentUpdates = documentUpdates;
        this.resolvedLimboDocuments = resolvedLimboDocuments;
    }
    /**
     * HACK: Views require RemoteEvents in order to determine whether the view is
     * CURRENT, but secondary tabs don't receive remote events. So this method is
     * used to create a synthesized RemoteEvent that can be used to apply a
     * CURRENT status change to a View, for queries executed in a different tab.
     */
    // PORTING NOTE: Multi-tab only
    RemoteEvent.createSynthesizedRemoteEventForCurrentChange = function (targetId, current) {
        var targetChanges = new Map();
        targetChanges.set(targetId, TargetChange.createSynthesizedTargetChangeForCurrentChange(targetId, current));
        return new RemoteEvent(SnapshotVersion.min(), targetChanges, targetIdSet(), maybeDocumentMap(), documentKeySet());
    };
    return RemoteEvent;
}());
/**
 * A TargetChange specifies the set of changes for a specific target as part of
 * a RemoteEvent. These changes track which documents are added, modified or
 * removed, as well as the target's resume token and whether the target is
 * marked CURRENT.
 * The actual changes *to* documents are not part of the TargetChange since
 * documents may be part of multiple targets.
 */
var TargetChange = /** @class */ (function () {
    function TargetChange(
    /**
     * An opaque, server-assigned token that allows watching a query to be resumed
     * after disconnecting without retransmitting all the data that matches the
     * query. The resume token essentially identifies a point in time from which
     * the server should resume sending results.
     */
    resumeToken, 
    /**
     * The "current" (synced) status of this target. Note that "current"
     * has special meaning in the RPC protocol that implies that a target is
     * both up-to-date and consistent with the rest of the watch stream.
     */
    current, 
    /**
     * The set of documents that were newly assigned to this target as part of
     * this remote event.
     */
    addedDocuments, 
    /**
     * The set of documents that were already assigned to this target but received
     * an update during this remote event.
     */
    modifiedDocuments, 
    /**
     * The set of documents that were removed from this target as part of this
     * remote event.
     */
    removedDocuments) {
        this.resumeToken = resumeToken;
        this.current = current;
        this.addedDocuments = addedDocuments;
        this.modifiedDocuments = modifiedDocuments;
        this.removedDocuments = removedDocuments;
    }
    /**
     * This method is used to create a synthesized TargetChanges that can be used to
     * apply a CURRENT status change to a View (for queries executed in a different
     * tab) or for new queries (to raise snapshots with correct CURRENT status).
     */
    TargetChange.createSynthesizedTargetChangeForCurrentChange = function (targetId, current) {
        return new TargetChange(ByteString.EMPTY_BYTE_STRING, current, documentKeySet(), documentKeySet(), documentKeySet());
    };
    return TargetChange;
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
 * Represents a changed document and a list of target ids to which this change
 * applies.
 *
 * If document has been deleted NoDocument will be provided.
 */
var DocumentWatchChange = /** @class */ (function () {
    function DocumentWatchChange(
    /** The new document applies to all of these targets. */
    updatedTargetIds, 
    /** The new document is removed from all of these targets. */
    removedTargetIds, 
    /** The key of the document for this change. */
    key, 
    /**
     * The new document or NoDocument if it was deleted. Is null if the
     * document went out of view without the server sending a new document.
     */
    newDoc) {
        this.updatedTargetIds = updatedTargetIds;
        this.removedTargetIds = removedTargetIds;
        this.key = key;
        this.newDoc = newDoc;
    }
    return DocumentWatchChange;
}());
var ExistenceFilterChange = /** @class */ (function () {
    function ExistenceFilterChange(targetId, existenceFilter) {
        this.targetId = targetId;
        this.existenceFilter = existenceFilter;
    }
    return ExistenceFilterChange;
}());
var WatchTargetChange = /** @class */ (function () {
    function WatchTargetChange(
    /** What kind of change occurred to the watch target. */
    state, 
    /** The target IDs that were added/removed/set. */
    targetIds, 
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
    resumeToken, 
    /** An RPC error indicating why the watch failed. */
    cause) {
        if (resumeToken === void 0) { resumeToken = ByteString.EMPTY_BYTE_STRING; }
        if (cause === void 0) { cause = null; }
        this.state = state;
        this.targetIds = targetIds;
        this.resumeToken = resumeToken;
        this.cause = cause;
    }
    return WatchTargetChange;
}());
/** Tracks the internal state of a Watch target. */
var TargetState = /** @class */ (function () {
    function TargetState() {
        /**
         * The number of pending responses (adds or removes) that we are waiting on.
         * We only consider targets active that have no pending responses.
         */
        this.pendingResponses = 0;
        /**
         * Keeps track of the document changes since the last raised snapshot.
         *
         * These changes are continuously updated as we receive document updates and
         * always reflect the current set of changes against the last issued snapshot.
         */
        this.documentChanges = snapshotChangesMap();
        /** See public getters for explanations of these fields. */
        this._resumeToken = ByteString.EMPTY_BYTE_STRING;
        this._current = false;
        /**
         * Whether this target state should be included in the next snapshot. We
         * initialize to true so that newly-added targets are included in the next
         * RemoteEvent.
         */
        this._hasPendingChanges = true;
    }
    Object.defineProperty(TargetState.prototype, "current", {
        /**
         * Whether this target has been marked 'current'.
         *
         * 'Current' has special meaning in the RPC protocol: It implies that the
         * Watch backend has sent us all changes up to the point at which the target
         * was added and that the target is consistent with the rest of the watch
         * stream.
         */
        get: function () {
            return this._current;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TargetState.prototype, "resumeToken", {
        /** The last resume token sent to us for this target. */
        get: function () {
            return this._resumeToken;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TargetState.prototype, "isPending", {
        /** Whether this target has pending target adds or target removes. */
        get: function () {
            return this.pendingResponses !== 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TargetState.prototype, "hasPendingChanges", {
        /** Whether we have modified any state that should trigger a snapshot. */
        get: function () {
            return this._hasPendingChanges;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Applies the resume token to the TargetChange, but only when it has a new
     * value. Empty resumeTokens are discarded.
     */
    TargetState.prototype.updateResumeToken = function (resumeToken) {
        if (resumeToken.approximateByteSize() > 0) {
            this._hasPendingChanges = true;
            this._resumeToken = resumeToken;
        }
    };
    /**
     * Creates a target change from the current set of changes.
     *
     * To reset the document changes after raising this snapshot, call
     * `clearPendingChanges()`.
     */
    TargetState.prototype.toTargetChange = function () {
        var addedDocuments = documentKeySet();
        var modifiedDocuments = documentKeySet();
        var removedDocuments = documentKeySet();
        this.documentChanges.forEach(function (key, changeType) {
            switch (changeType) {
                case 0 /* Added */:
                    addedDocuments = addedDocuments.add(key);
                    break;
                case 2 /* Modified */:
                    modifiedDocuments = modifiedDocuments.add(key);
                    break;
                case 1 /* Removed */:
                    removedDocuments = removedDocuments.add(key);
                    break;
                default:
                    fail();
            }
        });
        return new TargetChange(this._resumeToken, this._current, addedDocuments, modifiedDocuments, removedDocuments);
    };
    /**
     * Resets the document changes and sets `hasPendingChanges` to false.
     */
    TargetState.prototype.clearPendingChanges = function () {
        this._hasPendingChanges = false;
        this.documentChanges = snapshotChangesMap();
    };
    TargetState.prototype.addDocumentChange = function (key, changeType) {
        this._hasPendingChanges = true;
        this.documentChanges = this.documentChanges.insert(key, changeType);
    };
    TargetState.prototype.removeDocumentChange = function (key) {
        this._hasPendingChanges = true;
        this.documentChanges = this.documentChanges.remove(key);
    };
    TargetState.prototype.recordPendingTargetRequest = function () {
        this.pendingResponses += 1;
    };
    TargetState.prototype.recordTargetResponse = function () {
        this.pendingResponses -= 1;
    };
    TargetState.prototype.markCurrent = function () {
        this._hasPendingChanges = true;
        this._current = true;
    };
    return TargetState;
}());
var LOG_TAG = 'WatchChangeAggregator';
/**
 * A helper class to accumulate watch changes into a RemoteEvent.
 */
var WatchChangeAggregator = /** @class */ (function () {
    function WatchChangeAggregator(metadataProvider) {
        this.metadataProvider = metadataProvider;
        /** The internal state of all tracked targets. */
        this.targetStates = new Map();
        /** Keeps track of the documents to update since the last raised snapshot. */
        this.pendingDocumentUpdates = maybeDocumentMap();
        /** A mapping of document keys to their set of target IDs. */
        this.pendingDocumentTargetMapping = documentTargetMap();
        /**
         * A list of targets with existence filter mismatches. These targets are
         * known to be inconsistent and their listens needs to be re-established by
         * RemoteStore.
         */
        this.pendingTargetResets = new SortedSet(primitiveComparator);
    }
    /**
     * Processes and adds the DocumentWatchChange to the current set of changes.
     */
    WatchChangeAggregator.prototype.handleDocumentChange = function (docChange) {
        for (var _i = 0, _e = docChange.updatedTargetIds; _i < _e.length; _i++) {
            var targetId = _e[_i];
            if (docChange.newDoc instanceof Document) {
                this.addDocumentToTarget(targetId, docChange.newDoc);
            }
            else if (docChange.newDoc instanceof NoDocument) {
                this.removeDocumentFromTarget(targetId, docChange.key, docChange.newDoc);
            }
        }
        for (var _f = 0, _g = docChange.removedTargetIds; _f < _g.length; _f++) {
            var targetId = _g[_f];
            this.removeDocumentFromTarget(targetId, docChange.key, docChange.newDoc);
        }
    };
    /** Processes and adds the WatchTargetChange to the current set of changes. */
    WatchChangeAggregator.prototype.handleTargetChange = function (targetChange) {
        var _this = this;
        this.forEachTarget(targetChange, function (targetId) {
            var targetState = _this.ensureTargetState(targetId);
            switch (targetChange.state) {
                case 0 /* NoChange */:
                    if (_this.isActiveTarget(targetId)) {
                        targetState.updateResumeToken(targetChange.resumeToken);
                    }
                    break;
                case 1 /* Added */:
                    // We need to decrement the number of pending acks needed from watch
                    // for this targetId.
                    targetState.recordTargetResponse();
                    if (!targetState.isPending) {
                        // We have a freshly added target, so we need to reset any state
                        // that we had previously. This can happen e.g. when remove and add
                        // back a target for existence filter mismatches.
                        targetState.clearPendingChanges();
                    }
                    targetState.updateResumeToken(targetChange.resumeToken);
                    break;
                case 2 /* Removed */:
                    // We need to keep track of removed targets to we can post-filter and
                    // remove any target changes.
                    // We need to decrement the number of pending acks needed from watch
                    // for this targetId.
                    targetState.recordTargetResponse();
                    if (!targetState.isPending) {
                        _this.removeTarget(targetId);
                    }
                    break;
                case 3 /* Current */:
                    if (_this.isActiveTarget(targetId)) {
                        targetState.markCurrent();
                        targetState.updateResumeToken(targetChange.resumeToken);
                    }
                    break;
                case 4 /* Reset */:
                    if (_this.isActiveTarget(targetId)) {
                        // Reset the target and synthesizes removes for all existing
                        // documents. The backend will re-add any documents that still
                        // match the target before it sends the next global snapshot.
                        _this.resetTarget(targetId);
                        targetState.updateResumeToken(targetChange.resumeToken);
                    }
                    break;
                default:
                    fail();
            }
        });
    };
    /**
     * Iterates over all targetIds that the watch change applies to: either the
     * targetIds explicitly listed in the change or the targetIds of all currently
     * active targets.
     */
    WatchChangeAggregator.prototype.forEachTarget = function (targetChange, fn) {
        var _this = this;
        if (targetChange.targetIds.length > 0) {
            targetChange.targetIds.forEach(fn);
        }
        else {
            this.targetStates.forEach(function (_, targetId) {
                if (_this.isActiveTarget(targetId)) {
                    fn(targetId);
                }
            });
        }
    };
    /**
     * Handles existence filters and synthesizes deletes for filter mismatches.
     * Targets that are invalidated by filter mismatches are added to
     * `pendingTargetResets`.
     */
    WatchChangeAggregator.prototype.handleExistenceFilter = function (watchChange) {
        var targetId = watchChange.targetId;
        var expectedCount = watchChange.existenceFilter.count;
        var targetData = this.targetDataForActiveTarget(targetId);
        if (targetData) {
            var target = targetData.target;
            if (isDocumentTarget(target)) {
                if (expectedCount === 0) {
                    // The existence filter told us the document does not exist. We deduce
                    // that this document does not exist and apply a deleted document to
                    // our updates. Without applying this deleted document there might be
                    // another query that will raise this document as part of a snapshot
                    // until it is resolved, essentially exposing inconsistency between
                    // queries.
                    var key = new DocumentKey(target.path);
                    this.removeDocumentFromTarget(targetId, key, new NoDocument(key, SnapshotVersion.min()));
                }
                else {
                    hardAssert(expectedCount === 1);
                }
            }
            else {
                var currentSize = this.getCurrentDocumentCountForTarget(targetId);
                if (currentSize !== expectedCount) {
                    // Existence filter mismatch: We reset the mapping and raise a new
                    // snapshot with `isFromCache:true`.
                    this.resetTarget(targetId);
                    this.pendingTargetResets = this.pendingTargetResets.add(targetId);
                }
            }
        }
    };
    /**
     * Converts the currently accumulated state into a remote event at the
     * provided snapshot version. Resets the accumulated changes before returning.
     */
    WatchChangeAggregator.prototype.createRemoteEvent = function (snapshotVersion) {
        var _this = this;
        var targetChanges = new Map();
        this.targetStates.forEach(function (targetState, targetId) {
            var targetData = _this.targetDataForActiveTarget(targetId);
            if (targetData) {
                if (targetState.current && isDocumentTarget(targetData.target)) {
                    // Document queries for document that don't exist can produce an empty
                    // result set. To update our local cache, we synthesize a document
                    // delete if we have not previously received the document. This
                    // resolves the limbo state of the document, removing it from
                    // limboDocumentRefs.
                    //
                    // TODO(dimond): Ideally we would have an explicit lookup target
                    // instead resulting in an explicit delete message and we could
                    // remove this special logic.
                    var key = new DocumentKey(targetData.target.path);
                    if (_this.pendingDocumentUpdates.get(key) === null &&
                        !_this.targetContainsDocument(targetId, key)) {
                        _this.removeDocumentFromTarget(targetId, key, new NoDocument(key, snapshotVersion));
                    }
                }
                if (targetState.hasPendingChanges) {
                    targetChanges.set(targetId, targetState.toTargetChange());
                    targetState.clearPendingChanges();
                }
            }
        });
        var resolvedLimboDocuments = documentKeySet();
        // We extract the set of limbo-only document updates as the GC logic
        // special-cases documents that do not appear in the target cache.
        //
        // TODO(gsoltis): Expand on this comment once GC is available in the JS
        // client.
        this.pendingDocumentTargetMapping.forEach(function (key, targets) {
            var isOnlyLimboTarget = true;
            targets.forEachWhile(function (targetId) {
                var targetData = _this.targetDataForActiveTarget(targetId);
                if (targetData &&
                    targetData.purpose !== 2 /* LimboResolution */) {
                    isOnlyLimboTarget = false;
                    return false;
                }
                return true;
            });
            if (isOnlyLimboTarget) {
                resolvedLimboDocuments = resolvedLimboDocuments.add(key);
            }
        });
        var remoteEvent = new RemoteEvent(snapshotVersion, targetChanges, this.pendingTargetResets, this.pendingDocumentUpdates, resolvedLimboDocuments);
        this.pendingDocumentUpdates = maybeDocumentMap();
        this.pendingDocumentTargetMapping = documentTargetMap();
        this.pendingTargetResets = new SortedSet(primitiveComparator);
        return remoteEvent;
    };
    /**
     * Adds the provided document to the internal list of document updates and
     * its document key to the given target's mapping.
     */
    // Visible for testing.
    WatchChangeAggregator.prototype.addDocumentToTarget = function (targetId, document) {
        if (!this.isActiveTarget(targetId)) {
            return;
        }
        var changeType = this.targetContainsDocument(targetId, document.key)
            ? 2 /* Modified */
            : 0 /* Added */;
        var targetState = this.ensureTargetState(targetId);
        targetState.addDocumentChange(document.key, changeType);
        this.pendingDocumentUpdates = this.pendingDocumentUpdates.insert(document.key, document);
        this.pendingDocumentTargetMapping = this.pendingDocumentTargetMapping.insert(document.key, this.ensureDocumentTargetMapping(document.key).add(targetId));
    };
    /**
     * Removes the provided document from the target mapping. If the
     * document no longer matches the target, but the document's state is still
     * known (e.g. we know that the document was deleted or we received the change
     * that caused the filter mismatch), the new document can be provided
     * to update the remote document cache.
     */
    // Visible for testing.
    WatchChangeAggregator.prototype.removeDocumentFromTarget = function (targetId, key, updatedDocument) {
        if (!this.isActiveTarget(targetId)) {
            return;
        }
        var targetState = this.ensureTargetState(targetId);
        if (this.targetContainsDocument(targetId, key)) {
            targetState.addDocumentChange(key, 1 /* Removed */);
        }
        else {
            // The document may have entered and left the target before we raised a
            // snapshot, so we can just ignore the change.
            targetState.removeDocumentChange(key);
        }
        this.pendingDocumentTargetMapping = this.pendingDocumentTargetMapping.insert(key, this.ensureDocumentTargetMapping(key).delete(targetId));
        if (updatedDocument) {
            this.pendingDocumentUpdates = this.pendingDocumentUpdates.insert(key, updatedDocument);
        }
    };
    WatchChangeAggregator.prototype.removeTarget = function (targetId) {
        this.targetStates.delete(targetId);
    };
    /**
     * Returns the current count of documents in the target. This includes both
     * the number of documents that the LocalStore considers to be part of the
     * target as well as any accumulated changes.
     */
    WatchChangeAggregator.prototype.getCurrentDocumentCountForTarget = function (targetId) {
        var targetState = this.ensureTargetState(targetId);
        var targetChange = targetState.toTargetChange();
        return (this.metadataProvider.getRemoteKeysForTarget(targetId).size +
            targetChange.addedDocuments.size -
            targetChange.removedDocuments.size);
    };
    /**
     * Increment the number of acks needed from watch before we can consider the
     * server to be 'in-sync' with the client's active targets.
     */
    WatchChangeAggregator.prototype.recordPendingTargetRequest = function (targetId) {
        // For each request we get we need to record we need a response for it.
        var targetState = this.ensureTargetState(targetId);
        targetState.recordPendingTargetRequest();
    };
    WatchChangeAggregator.prototype.ensureTargetState = function (targetId) {
        var result = this.targetStates.get(targetId);
        if (!result) {
            result = new TargetState();
            this.targetStates.set(targetId, result);
        }
        return result;
    };
    WatchChangeAggregator.prototype.ensureDocumentTargetMapping = function (key) {
        var targetMapping = this.pendingDocumentTargetMapping.get(key);
        if (!targetMapping) {
            targetMapping = new SortedSet(primitiveComparator);
            this.pendingDocumentTargetMapping = this.pendingDocumentTargetMapping.insert(key, targetMapping);
        }
        return targetMapping;
    };
    /**
     * Verifies that the user is still interested in this target (by calling
     * `getTargetDataForTarget()`) and that we are not waiting for pending ADDs
     * from watch.
     */
    WatchChangeAggregator.prototype.isActiveTarget = function (targetId) {
        var targetActive = this.targetDataForActiveTarget(targetId) !== null;
        if (!targetActive) {
            logDebug(LOG_TAG, 'Detected inactive target', targetId);
        }
        return targetActive;
    };
    /**
     * Returns the TargetData for an active target (i.e. a target that the user
     * is still interested in that has no outstanding target change requests).
     */
    WatchChangeAggregator.prototype.targetDataForActiveTarget = function (targetId) {
        var targetState = this.targetStates.get(targetId);
        return targetState && targetState.isPending
            ? null
            : this.metadataProvider.getTargetDataForTarget(targetId);
    };
    /**
     * Resets the state of a Watch target to its initial state (e.g. sets
     * 'current' to false, clears the resume token and removes its target mapping
     * from all documents).
     */
    WatchChangeAggregator.prototype.resetTarget = function (targetId) {
        var _this = this;
        this.targetStates.set(targetId, new TargetState());
        // Trigger removal for any documents currently mapped to this target.
        // These removals will be part of the initial snapshot if Watch does not
        // resend these documents.
        var existingKeys = this.metadataProvider.getRemoteKeysForTarget(targetId);
        existingKeys.forEach(function (key) {
            _this.removeDocumentFromTarget(targetId, key, /*updatedDocument=*/ null);
        });
    };
    /**
     * Returns whether the LocalStore considers the document to be part of the
     * specified target.
     */
    WatchChangeAggregator.prototype.targetContainsDocument = function (targetId, key) {
        var existingKeys = this.metadataProvider.getRemoteKeysForTarget(targetId);
        return existingKeys.has(key);
    };
    return WatchChangeAggregator;
}());
function documentTargetMap() {
    return new SortedMap(DocumentKey.comparator);
}
function snapshotChangesMap() {
    return new SortedMap(DocumentKey.comparator);
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
var DIRECTIONS = (function () {
    var dirs = {};
    dirs["asc" /* ASCENDING */] = 'ASCENDING';
    dirs["desc" /* DESCENDING */] = 'DESCENDING';
    return dirs;
})();
var OPERATORS = (function () {
    var ops = {};
    ops["<" /* LESS_THAN */] = 'LESS_THAN';
    ops["<=" /* LESS_THAN_OR_EQUAL */] = 'LESS_THAN_OR_EQUAL';
    ops[">" /* GREATER_THAN */] = 'GREATER_THAN';
    ops[">=" /* GREATER_THAN_OR_EQUAL */] = 'GREATER_THAN_OR_EQUAL';
    ops["==" /* EQUAL */] = 'EQUAL';
    ops["!=" /* NOT_EQUAL */] = 'NOT_EQUAL';
    ops["array-contains" /* ARRAY_CONTAINS */] = 'ARRAY_CONTAINS';
    ops["in" /* IN */] = 'IN';
    ops["not-in" /* NOT_IN */] = 'NOT_IN';
    ops["array-contains-any" /* ARRAY_CONTAINS_ANY */] = 'ARRAY_CONTAINS_ANY';
    return ops;
})();
function assertPresent(value, description) {
}
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
var JsonProtoSerializer = /** @class */ (function () {
    function JsonProtoSerializer(databaseId, useProto3Json) {
        this.databaseId = databaseId;
        this.useProto3Json = useProto3Json;
    }
    return JsonProtoSerializer;
}());
function fromRpcStatus(status) {
    var code = status.code === undefined ? Code.UNKNOWN : mapCodeFromRpcCode(status.code);
    return new FirestoreError(code, status.message || '');
}
/**
 * Returns a value for a number (or null) that's appropriate to put into
 * a google.protobuf.Int32Value proto.
 * DO NOT USE THIS FOR ANYTHING ELSE.
 * This method cheats. It's typed as returning "number" because that's what
 * our generated proto interfaces say Int32Value must be. But GRPC actually
 * expects a { value: <number> } struct.
 */
function toInt32Proto(serializer, val) {
    if (serializer.useProto3Json || isNullOrUndefined(val)) {
        return val;
    }
    else {
        return { value: val };
    }
}
/**
 * Returns an IntegerValue for `value`.
 */
function toInteger(value) {
    return { integerValue: '' + value };
}
/**
 * Returns an DoubleValue for `value` that is encoded based the serializer's
 * `useProto3Json` setting.
 */
function toDouble(serializer, value) {
    if (serializer.useProto3Json) {
        if (isNaN(value)) {
            return { doubleValue: 'NaN' };
        }
        else if (value === Infinity) {
            return { doubleValue: 'Infinity' };
        }
        else if (value === -Infinity) {
            return { doubleValue: '-Infinity' };
        }
    }
    return { doubleValue: isNegativeZero(value) ? '-0' : value };
}
/**
 * Returns a value for a number that's appropriate to put into a proto.
 * The return value is an IntegerValue if it can safely represent the value,
 * otherwise a DoubleValue is returned.
 */
function toNumber(serializer, value) {
    return isSafeInteger(value) ? toInteger(value) : toDouble(serializer, value);
}
/**
 * Returns a value for a Date that's appropriate to put into a proto.
 */
function toTimestamp(serializer, timestamp) {
    if (serializer.useProto3Json) {
        // Serialize to ISO-8601 date format, but with full nano resolution.
        // Since JS Date has only millis, let's only use it for the seconds and
        // then manually add the fractions to the end.
        var jsDateStr = new Date(timestamp.seconds * 1000).toISOString();
        // Remove .xxx frac part and Z in the end.
        var strUntilSeconds = jsDateStr.replace(/\.\d*/, '').replace('Z', '');
        // Pad the fraction out to 9 digits (nanos).
        var nanoStr = ('000000000' + timestamp.nanoseconds).slice(-9);
        return strUntilSeconds + "." + nanoStr + "Z";
    }
    else {
        return {
            seconds: '' + timestamp.seconds,
            nanos: timestamp.nanoseconds
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        };
    }
}
function fromTimestamp(date) {
    var timestamp = normalizeTimestamp(date);
    return new Timestamp(timestamp.seconds, timestamp.nanos);
}
/**
 * Returns a value for bytes that's appropriate to put in a proto.
 *
 * Visible for testing.
 */
function toBytes(serializer, bytes) {
    if (serializer.useProto3Json) {
        return bytes.toBase64();
    }
    else {
        return bytes.toUint8Array();
    }
}
/**
 * Returns a ByteString based on the proto string value.
 */
function fromBytes(serializer, value) {
    if (serializer.useProto3Json) {
        hardAssert(value === undefined || typeof value === 'string');
        return ByteString.fromBase64String(value ? value : '');
    }
    else {
        hardAssert(value === undefined || value instanceof Uint8Array);
        return ByteString.fromUint8Array(value ? value : new Uint8Array());
    }
}
function toVersion(serializer, version) {
    return toTimestamp(serializer, version.toTimestamp());
}
function fromVersion(version) {
    hardAssert(!!version);
    return SnapshotVersion.fromTimestamp(fromTimestamp(version));
}
function toResourceName(databaseId, path) {
    return fullyQualifiedPrefixPath(databaseId)
        .child('documents')
        .child(path)
        .canonicalString();
}
function fromResourceName(name) {
    var resource = ResourcePath.fromString(name);
    hardAssert(isValidResourceName(resource));
    return resource;
}
function toName(serializer, key) {
    return toResourceName(serializer.databaseId, key.path);
}
function fromName(serializer, name) {
    var resource = fromResourceName(name);
    hardAssert(resource.get(1) === serializer.databaseId.projectId);
    hardAssert((!resource.get(3) && !serializer.databaseId.database) ||
        resource.get(3) === serializer.databaseId.database);
    return new DocumentKey(extractLocalPathFromResourceName(resource));
}
function toQueryPath(serializer, path) {
    return toResourceName(serializer.databaseId, path);
}
function getEncodedDatabaseId(serializer) {
    var path = new ResourcePath([
        'projects',
        serializer.databaseId.projectId,
        'databases',
        serializer.databaseId.database
    ]);
    return path.canonicalString();
}
function fullyQualifiedPrefixPath(databaseId) {
    return new ResourcePath([
        'projects',
        databaseId.projectId,
        'databases',
        databaseId.database
    ]);
}
function extractLocalPathFromResourceName(resourceName) {
    hardAssert(resourceName.length > 4 && resourceName.get(4) === 'documents');
    return resourceName.popFirst(5);
}
/** Creates an api.Document from key and fields (but no create/update time) */
function toMutationDocument(serializer, key, fields) {
    return {
        name: toName(serializer, key),
        fields: fields.proto.mapValue.fields
    };
}
function fromFound(serializer, doc) {
    hardAssert(!!doc.found);
    assertPresent(doc.found.name);
    assertPresent(doc.found.updateTime);
    var key = fromName(serializer, doc.found.name);
    var version = fromVersion(doc.found.updateTime);
    var data = new ObjectValue({ mapValue: { fields: doc.found.fields } });
    return new Document(key, version, data, {});
}
function fromMissing(serializer, result) {
    hardAssert(!!result.missing);
    hardAssert(!!result.readTime);
    var key = fromName(serializer, result.missing);
    var version = fromVersion(result.readTime);
    return new NoDocument(key, version);
}
function fromMaybeDocument(serializer, result) {
    if ('found' in result) {
        return fromFound(serializer, result);
    }
    else if ('missing' in result) {
        return fromMissing(serializer, result);
    }
    return fail();
}
function fromWatchChange(serializer, change) {
    var watchChange;
    if ('targetChange' in change) {
        assertPresent(change.targetChange);
        // proto3 default value is unset in JSON (undefined), so use 'NO_CHANGE'
        // if unset
        var state = fromWatchTargetChangeState(change.targetChange.targetChangeType || 'NO_CHANGE');
        var targetIds = change.targetChange.targetIds || [];
        var resumeToken = fromBytes(serializer, change.targetChange.resumeToken);
        var causeProto = change.targetChange.cause;
        var cause = causeProto && fromRpcStatus(causeProto);
        watchChange = new WatchTargetChange(state, targetIds, resumeToken, cause || null);
    }
    else if ('documentChange' in change) {
        assertPresent(change.documentChange);
        var entityChange = change.documentChange;
        assertPresent(entityChange.document);
        assertPresent(entityChange.document.name);
        assertPresent(entityChange.document.updateTime);
        var key = fromName(serializer, entityChange.document.name);
        var version_1 = fromVersion(entityChange.document.updateTime);
        var data = new ObjectValue({
            mapValue: { fields: entityChange.document.fields }
        });
        var doc = new Document(key, version_1, data, {});
        var updatedTargetIds = entityChange.targetIds || [];
        var removedTargetIds = entityChange.removedTargetIds || [];
        watchChange = new DocumentWatchChange(updatedTargetIds, removedTargetIds, doc.key, doc);
    }
    else if ('documentDelete' in change) {
        assertPresent(change.documentDelete);
        var docDelete = change.documentDelete;
        assertPresent(docDelete.document);
        var key = fromName(serializer, docDelete.document);
        var version_2 = docDelete.readTime
            ? fromVersion(docDelete.readTime)
            : SnapshotVersion.min();
        var doc = new NoDocument(key, version_2);
        var removedTargetIds = docDelete.removedTargetIds || [];
        watchChange = new DocumentWatchChange([], removedTargetIds, doc.key, doc);
    }
    else if ('documentRemove' in change) {
        assertPresent(change.documentRemove);
        var docRemove = change.documentRemove;
        assertPresent(docRemove.document);
        var key = fromName(serializer, docRemove.document);
        var removedTargetIds = docRemove.removedTargetIds || [];
        watchChange = new DocumentWatchChange([], removedTargetIds, key, null);
    }
    else if ('filter' in change) {
        // TODO(dimond): implement existence filter parsing with strategy.
        assertPresent(change.filter);
        var filter = change.filter;
        assertPresent(filter.targetId);
        var count = filter.count || 0;
        var existenceFilter = new ExistenceFilter(count);
        var targetId = filter.targetId;
        watchChange = new ExistenceFilterChange(targetId, existenceFilter);
    }
    else {
        return fail();
    }
    return watchChange;
}
function fromWatchTargetChangeState(state) {
    if (state === 'NO_CHANGE') {
        return 0 /* NoChange */;
    }
    else if (state === 'ADD') {
        return 1 /* Added */;
    }
    else if (state === 'REMOVE') {
        return 2 /* Removed */;
    }
    else if (state === 'CURRENT') {
        return 3 /* Current */;
    }
    else if (state === 'RESET') {
        return 4 /* Reset */;
    }
    else {
        return fail();
    }
}
function versionFromListenResponse(change) {
    // We have only reached a consistent snapshot for the entire stream if there
    // is a read_time set and it applies to all targets (i.e. the list of
    // targets is empty). The backend is guaranteed to send such responses.
    if (!('targetChange' in change)) {
        return SnapshotVersion.min();
    }
    var targetChange = change.targetChange;
    if (targetChange.targetIds && targetChange.targetIds.length) {
        return SnapshotVersion.min();
    }
    if (!targetChange.readTime) {
        return SnapshotVersion.min();
    }
    return fromVersion(targetChange.readTime);
}
function toMutation(serializer, mutation) {
    var result;
    if (mutation instanceof SetMutation) {
        result = {
            update: toMutationDocument(serializer, mutation.key, mutation.value)
        };
    }
    else if (mutation instanceof DeleteMutation) {
        result = { delete: toName(serializer, mutation.key) };
    }
    else if (mutation instanceof PatchMutation) {
        result = {
            update: toMutationDocument(serializer, mutation.key, mutation.data),
            updateMask: toDocumentMask(mutation.fieldMask)
        };
    }
    else if (mutation instanceof TransformMutation) {
        result = {
            transform: {
                document: toName(serializer, mutation.key),
                fieldTransforms: mutation.fieldTransforms.map(function (transform) { return toFieldTransform(serializer, transform); })
            }
        };
    }
    else if (mutation instanceof VerifyMutation) {
        result = {
            verify: toName(serializer, mutation.key)
        };
    }
    else {
        return fail();
    }
    if (!mutation.precondition.isNone) {
        result.currentDocument = toPrecondition(serializer, mutation.precondition);
    }
    return result;
}
function toPrecondition(serializer, precondition) {
    if (precondition.updateTime !== undefined) {
        return {
            updateTime: toVersion(serializer, precondition.updateTime)
        };
    }
    else if (precondition.exists !== undefined) {
        return { exists: precondition.exists };
    }
    else {
        return fail();
    }
}
function fromWriteResult(proto, commitTime) {
    // NOTE: Deletes don't have an updateTime.
    var version = proto.updateTime
        ? fromVersion(proto.updateTime)
        : fromVersion(commitTime);
    if (version.isEqual(SnapshotVersion.min())) {
        // The Firestore Emulator currently returns an update time of 0 for
        // deletes of non-existing documents (rather than null). This breaks the
        // test "get deleted doc while offline with source=cache" as NoDocuments
        // with version 0 are filtered by IndexedDb's RemoteDocumentCache.
        // TODO(#2149): Remove this when Emulator is fixed
        version = fromVersion(commitTime);
    }
    var transformResults = null;
    if (proto.transformResults && proto.transformResults.length > 0) {
        transformResults = proto.transformResults;
    }
    return new MutationResult(version, transformResults);
}
function fromWriteResults(protos, commitTime) {
    if (protos && protos.length > 0) {
        hardAssert(commitTime !== undefined);
        return protos.map(function (proto) { return fromWriteResult(proto, commitTime); });
    }
    else {
        return [];
    }
}
function toFieldTransform(serializer, fieldTransform) {
    var transform = fieldTransform.transform;
    if (transform instanceof ServerTimestampTransform) {
        return {
            fieldPath: fieldTransform.field.canonicalString(),
            setToServerValue: 'REQUEST_TIME'
        };
    }
    else if (transform instanceof ArrayUnionTransformOperation) {
        return {
            fieldPath: fieldTransform.field.canonicalString(),
            appendMissingElements: {
                values: transform.elements
            }
        };
    }
    else if (transform instanceof ArrayRemoveTransformOperation) {
        return {
            fieldPath: fieldTransform.field.canonicalString(),
            removeAllFromArray: {
                values: transform.elements
            }
        };
    }
    else if (transform instanceof NumericIncrementTransformOperation) {
        return {
            fieldPath: fieldTransform.field.canonicalString(),
            increment: transform.operand
        };
    }
    else {
        throw fail();
    }
}
function toDocumentsTarget(serializer, target) {
    return { documents: [toQueryPath(serializer, target.path)] };
}
function toQueryTarget(serializer, target) {
    // Dissect the path into parent, collectionId, and optional key filter.
    var result = { structuredQuery: {} };
    var path = target.path;
    if (target.collectionGroup !== null) {
        result.parent = toQueryPath(serializer, path);
        result.structuredQuery.from = [
            {
                collectionId: target.collectionGroup,
                allDescendants: true
            }
        ];
    }
    else {
        result.parent = toQueryPath(serializer, path.popLast());
        result.structuredQuery.from = [{ collectionId: path.lastSegment() }];
    }
    var where = toFilter(target.filters);
    if (where) {
        result.structuredQuery.where = where;
    }
    var orderBy = toOrder(target.orderBy);
    if (orderBy) {
        result.structuredQuery.orderBy = orderBy;
    }
    var limit = toInt32Proto(serializer, target.limit);
    if (limit !== null) {
        result.structuredQuery.limit = limit;
    }
    if (target.startAt) {
        result.structuredQuery.startAt = toCursor(target.startAt);
    }
    if (target.endAt) {
        result.structuredQuery.endAt = toCursor(target.endAt);
    }
    return result;
}
function toListenRequestLabels(serializer, targetData) {
    var value = toLabel(serializer, targetData.purpose);
    if (value == null) {
        return null;
    }
    else {
        return {
            'goog-listen-tags': value
        };
    }
}
function toLabel(serializer, purpose) {
    switch (purpose) {
        case 0 /* Listen */:
            return null;
        case 1 /* ExistenceFilterMismatch */:
            return 'existence-filter-mismatch';
        case 2 /* LimboResolution */:
            return 'limbo-document';
        default:
            return fail();
    }
}
function toTarget(serializer, targetData) {
    var result;
    var target = targetData.target;
    if (isDocumentTarget(target)) {
        result = { documents: toDocumentsTarget(serializer, target) };
    }
    else {
        result = { query: toQueryTarget(serializer, target) };
    }
    result.targetId = targetData.targetId;
    if (targetData.resumeToken.approximateByteSize() > 0) {
        result.resumeToken = toBytes(serializer, targetData.resumeToken);
    }
    return result;
}
function toFilter(filters) {
    if (filters.length === 0) {
        return;
    }
    var protos = filters.map(function (filter) {
        return toUnaryOrFieldFilter(filter);
    });
    if (protos.length === 1) {
        return protos[0];
    }
    return { compositeFilter: { op: 'AND', filters: protos } };
}
function toOrder(orderBys) {
    if (orderBys.length === 0) {
        return;
    }
    return orderBys.map(function (order) { return toPropertyOrder(order); });
}
function toCursor(cursor) {
    return {
        before: cursor.before,
        values: cursor.position
    };
}
// visible for testing
function toDirection(dir) {
    return DIRECTIONS[dir];
}
// visible for testing
function toOperatorName(op) {
    return OPERATORS[op];
}
function toFieldPathReference(path) {
    return { fieldPath: path.canonicalString() };
}
// visible for testing
function toPropertyOrder(orderBy) {
    return {
        field: toFieldPathReference(orderBy.field),
        direction: toDirection(orderBy.dir)
    };
}
// visible for testing
function toUnaryOrFieldFilter(filter) {
    if (filter.op === "==" /* EQUAL */) {
        if (isNanValue(filter.value)) {
            return {
                unaryFilter: {
                    field: toFieldPathReference(filter.field),
                    op: 'IS_NAN'
                }
            };
        }
        else if (isNullValue(filter.value)) {
            return {
                unaryFilter: {
                    field: toFieldPathReference(filter.field),
                    op: 'IS_NULL'
                }
            };
        }
    }
    else if (filter.op === "!=" /* NOT_EQUAL */) {
        if (isNanValue(filter.value)) {
            return {
                unaryFilter: {
                    field: toFieldPathReference(filter.field),
                    op: 'IS_NOT_NAN'
                }
            };
        }
        else if (isNullValue(filter.value)) {
            return {
                unaryFilter: {
                    field: toFieldPathReference(filter.field),
                    op: 'IS_NOT_NULL'
                }
            };
        }
    }
    return {
        fieldFilter: {
            field: toFieldPathReference(filter.field),
            op: toOperatorName(filter.op),
            value: filter.value
        }
    };
}
function toDocumentMask(fieldMask) {
    var canonicalFields = [];
    fieldMask.fields.forEach(function (field) { return canonicalFields.push(field.canonicalString()); });
    return {
        fieldPaths: canonicalFields
    };
}
function isValidResourceName(path) {
    // Resource names have at least 4 components (project ID, database ID)
    return (path.length >= 4 &&
        path.get(0) === 'projects' &&
        path.get(2) === 'databases');
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
/** Represents a transform within a TransformMutation. */
var TransformOperation = /** @class */ (function () {
    function TransformOperation() {
        // Make sure that the structural type of `TransformOperation` is unique.
        // See https://github.com/microsoft/TypeScript/issues/5451
        this._ = undefined;
    }
    return TransformOperation;
}());
/**
 * Computes the local transform result against the provided `previousValue`,
 * optionally using the provided localWriteTime.
 */
function applyTransformOperationToLocalView(transform, previousValue, localWriteTime) {
    if (transform instanceof ServerTimestampTransform) {
        return serverTimestamp(localWriteTime, previousValue);
    }
    else if (transform instanceof ArrayUnionTransformOperation) {
        return applyArrayUnionTransformOperation(transform, previousValue);
    }
    else if (transform instanceof ArrayRemoveTransformOperation) {
        return applyArrayRemoveTransformOperation(transform, previousValue);
    }
    else {
        return applyNumericIncrementTransformOperationToLocalView(transform, previousValue);
    }
}
/**
 * Computes a final transform result after the transform has been acknowledged
 * by the server, potentially using the server-provided transformResult.
 */
function applyTransformOperationToRemoteDocument(transform, previousValue, transformResult) {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    if (transform instanceof ArrayUnionTransformOperation) {
        return applyArrayUnionTransformOperation(transform, previousValue);
    }
    else if (transform instanceof ArrayRemoveTransformOperation) {
        return applyArrayRemoveTransformOperation(transform, previousValue);
    }
    return transformResult;
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
 */
function computeTransformOperationBaseValue(transform, previousValue) {
    if (transform instanceof NumericIncrementTransformOperation) {
        return isNumber(previousValue) ? previousValue : { integerValue: 0 };
    }
    return null;
}
function transformOperationEquals(left, right) {
    if (left instanceof ArrayUnionTransformOperation &&
        right instanceof ArrayUnionTransformOperation) {
        return arrayEquals(left.elements, right.elements, valueEquals);
    }
    else if (left instanceof ArrayRemoveTransformOperation &&
        right instanceof ArrayRemoveTransformOperation) {
        return arrayEquals(left.elements, right.elements, valueEquals);
    }
    else if (left instanceof NumericIncrementTransformOperation &&
        right instanceof NumericIncrementTransformOperation) {
        return valueEquals(left.operand, right.operand);
    }
    return (left instanceof ServerTimestampTransform &&
        right instanceof ServerTimestampTransform);
}
/** Transforms a value into a server-generated timestamp. */
var ServerTimestampTransform = /** @class */ (function (_super) {
    tslib.__extends(ServerTimestampTransform, _super);
    function ServerTimestampTransform() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ServerTimestampTransform;
}(TransformOperation));
/** Transforms an array value via a union operation. */
var ArrayUnionTransformOperation = /** @class */ (function (_super) {
    tslib.__extends(ArrayUnionTransformOperation, _super);
    function ArrayUnionTransformOperation(elements) {
        var _this = _super.call(this) || this;
        _this.elements = elements;
        return _this;
    }
    return ArrayUnionTransformOperation;
}(TransformOperation));
function applyArrayUnionTransformOperation(transform, previousValue) {
    var values = coercedFieldValuesArray(previousValue);
    var _loop_1 = function (toUnion) {
        if (!values.some(function (element) { return valueEquals(element, toUnion); })) {
            values.push(toUnion);
        }
    };
    for (var _i = 0, _e = transform.elements; _i < _e.length; _i++) {
        var toUnion = _e[_i];
        _loop_1(toUnion);
    }
    return { arrayValue: { values: values } };
}
/** Transforms an array value via a remove operation. */
var ArrayRemoveTransformOperation = /** @class */ (function (_super) {
    tslib.__extends(ArrayRemoveTransformOperation, _super);
    function ArrayRemoveTransformOperation(elements) {
        var _this = _super.call(this) || this;
        _this.elements = elements;
        return _this;
    }
    return ArrayRemoveTransformOperation;
}(TransformOperation));
function applyArrayRemoveTransformOperation(transform, previousValue) {
    var values = coercedFieldValuesArray(previousValue);
    var _loop_2 = function (toRemove) {
        values = values.filter(function (element) { return !valueEquals(element, toRemove); });
    };
    for (var _i = 0, _e = transform.elements; _i < _e.length; _i++) {
        var toRemove = _e[_i];
        _loop_2(toRemove);
    }
    return { arrayValue: { values: values } };
}
/**
 * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
 * transforms. Converts all field values to integers or doubles, but unlike the
 * backend does not cap integer values at 2^63. Instead, JavaScript number
 * arithmetic is used and precision loss can occur for values greater than 2^53.
 */
var NumericIncrementTransformOperation = /** @class */ (function (_super) {
    tslib.__extends(NumericIncrementTransformOperation, _super);
    function NumericIncrementTransformOperation(serializer, operand) {
        var _this = _super.call(this) || this;
        _this.serializer = serializer;
        _this.operand = operand;
        return _this;
    }
    return NumericIncrementTransformOperation;
}(TransformOperation));
function applyNumericIncrementTransformOperationToLocalView(transform, previousValue) {
    // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
    // precision and resolves overflows by reducing precision, we do not
    // manually cap overflows at 2^63.
    var baseValue = computeTransformOperationBaseValue(transform, previousValue);
    var sum = asNumber(baseValue) + asNumber(transform.operand);
    if (isInteger(baseValue) && isInteger(transform.operand)) {
        return toInteger(sum);
    }
    else {
        return toDouble(transform.serializer, sum);
    }
}
function asNumber(value) {
    return normalizeNumber(value.integerValue || value.doubleValue);
}
function coercedFieldValuesArray(value) {
    return isArray(value) && value.arrayValue.values
        ? value.arrayValue.values.slice()
        : [];
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
 */
var FieldMask = /** @class */ (function () {
    function FieldMask(fields) {
        this.fields = fields;
        // TODO(dimond): validation of FieldMask
        // Sort the field mask to support `FieldMask.isEqual()` and assert below.
        fields.sort(FieldPath.comparator);
    }
    /**
     * Verifies that `fieldPath` is included by at least one field in this field
     * mask.
     *
     * This is an O(n) operation, where `n` is the size of the field mask.
     */
    FieldMask.prototype.covers = function (fieldPath) {
        for (var _i = 0, _e = this.fields; _i < _e.length; _i++) {
            var fieldMaskPath = _e[_i];
            if (fieldMaskPath.isPrefixOf(fieldPath)) {
                return true;
            }
        }
        return false;
    };
    FieldMask.prototype.isEqual = function (other) {
        return arrayEquals(this.fields, other.fields, function (l, r) { return l.isEqual(r); });
    };
    return FieldMask;
}());
/** A field path and the TransformOperation to perform upon it. */
var FieldTransform = /** @class */ (function () {
    function FieldTransform(field, transform) {
        this.field = field;
        this.transform = transform;
    }
    return FieldTransform;
}());
function fieldTransformEquals(left, right) {
    return (left.field.isEqual(right.field) &&
        transformOperationEquals(left.transform, right.transform));
}
/** The result of successfully applying a mutation to the backend. */
var MutationResult = /** @class */ (function () {
    function MutationResult(
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
    version, 
    /**
     * The resulting fields returned from the backend after a
     * TransformMutation has been committed. Contains one FieldValue for each
     * FieldTransform that was in the mutation.
     *
     * Will be null if the mutation was not a TransformMutation.
     */
    transformResults) {
        this.version = version;
        this.transformResults = transformResults;
    }
    return MutationResult;
}());
/**
 * Encodes a precondition for a mutation. This follows the model that the
 * backend accepts with the special case of an explicit "empty" precondition
 * (meaning no precondition).
 */
var Precondition = /** @class */ (function () {
    function Precondition(updateTime, exists) {
        this.updateTime = updateTime;
        this.exists = exists;
    }
    /** Creates a new empty Precondition. */
    Precondition.none = function () {
        return new Precondition();
    };
    /** Creates a new Precondition with an exists flag. */
    Precondition.exists = function (exists) {
        return new Precondition(undefined, exists);
    };
    /** Creates a new Precondition based on a version a document exists at. */
    Precondition.updateTime = function (version) {
        return new Precondition(version);
    };
    Object.defineProperty(Precondition.prototype, "isNone", {
        /** Returns whether this Precondition is empty. */
        get: function () {
            return this.updateTime === undefined && this.exists === undefined;
        },
        enumerable: false,
        configurable: true
    });
    Precondition.prototype.isEqual = function (other) {
        return (this.exists === other.exists &&
            (this.updateTime
                ? !!other.updateTime && this.updateTime.isEqual(other.updateTime)
                : !other.updateTime));
    };
    return Precondition;
}());
/**
 * Returns true if the preconditions is valid for the given document
 * (or null if no document is available).
 */
function preconditionIsValidForDocument(precondition, maybeDoc) {
    if (precondition.updateTime !== undefined) {
        return (maybeDoc instanceof Document &&
            maybeDoc.version.isEqual(precondition.updateTime));
    }
    else if (precondition.exists !== undefined) {
        return precondition.exists === maybeDoc instanceof Document;
    }
    else {
        return true;
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
 */
var Mutation = /** @class */ (function () {
    function Mutation() {
    }
    return Mutation;
}());
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
 */
function applyMutationToRemoteDocument(mutation, maybeDoc, mutationResult) {
    if (mutation instanceof SetMutation) {
        return applySetMutationToRemoteDocument(mutation, maybeDoc, mutationResult);
    }
    else if (mutation instanceof PatchMutation) {
        return applyPatchMutationToRemoteDocument(mutation, maybeDoc, mutationResult);
    }
    else if (mutation instanceof TransformMutation) {
        return applyTransformMutationToRemoteDocument(mutation, maybeDoc, mutationResult);
    }
    else {
        return applyDeleteMutationToRemoteDocument(mutation, maybeDoc, mutationResult);
    }
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
 */
function applyMutationToLocalView(mutation, maybeDoc, baseDoc, localWriteTime) {
    if (mutation instanceof SetMutation) {
        return applySetMutationToLocalView(mutation, maybeDoc);
    }
    else if (mutation instanceof PatchMutation) {
        return applyPatchMutationToLocalView(mutation, maybeDoc);
    }
    else if (mutation instanceof TransformMutation) {
        return applyTransformMutationToLocalView(mutation, maybeDoc, localWriteTime, baseDoc);
    }
    else {
        return applyDeleteMutationToLocalView(mutation, maybeDoc);
    }
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
 */
function extractMutationBaseValue(mutation, maybeDoc) {
    if (mutation instanceof TransformMutation) {
        return extractTransformMutationBaseValue(mutation, maybeDoc);
    }
    return null;
}
function mutationEquals(left, right) {
    if (left.type !== right.type) {
        return false;
    }
    if (!left.key.isEqual(right.key)) {
        return false;
    }
    if (!left.precondition.isEqual(right.precondition)) {
        return false;
    }
    if (left.type === 0 /* Set */) {
        return left.value.isEqual(right.value);
    }
    if (left.type === 1 /* Patch */) {
        return (left.data.isEqual(right.data) &&
            left.fieldMask.isEqual(right.fieldMask));
    }
    if (left.type === 2 /* Transform */) {
        return arrayEquals(left.fieldTransforms, left.fieldTransforms, function (l, r) { return fieldTransformEquals(l, r); });
    }
    return true;
}
/**
 * Returns the version from the given document for use as the result of a
 * mutation. Mutations are defined to return the version of the base document
 * only if it is an existing document. Deleted and unknown documents have a
 * post-mutation version of SnapshotVersion.min().
 */
function getPostMutationVersion(maybeDoc) {
    if (maybeDoc instanceof Document) {
        return maybeDoc.version;
    }
    else {
        return SnapshotVersion.min();
    }
}
/**
 * A mutation that creates or replaces the document at the given key with the
 * object value contents.
 */
var SetMutation = /** @class */ (function (_super) {
    tslib.__extends(SetMutation, _super);
    function SetMutation(key, value, precondition) {
        var _this = _super.call(this) || this;
        _this.key = key;
        _this.value = value;
        _this.precondition = precondition;
        _this.type = 0 /* Set */;
        return _this;
    }
    return SetMutation;
}(Mutation));
function applySetMutationToRemoteDocument(mutation, maybeDoc, mutationResult) {
    // Unlike applySetMutationToLocalView, if we're applying a mutation to a
    // remote document the server has accepted the mutation so the precondition
    // must have held.
    return new Document(mutation.key, mutationResult.version, mutation.value, {
        hasCommittedMutations: true
    });
}
function applySetMutationToLocalView(mutation, maybeDoc) {
    if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
        return maybeDoc;
    }
    var version = getPostMutationVersion(maybeDoc);
    return new Document(mutation.key, version, mutation.value, {
        hasLocalMutations: true
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
 */
var PatchMutation = /** @class */ (function (_super) {
    tslib.__extends(PatchMutation, _super);
    function PatchMutation(key, data, fieldMask, precondition) {
        var _this = _super.call(this) || this;
        _this.key = key;
        _this.data = data;
        _this.fieldMask = fieldMask;
        _this.precondition = precondition;
        _this.type = 1 /* Patch */;
        return _this;
    }
    return PatchMutation;
}(Mutation));
function applyPatchMutationToRemoteDocument(mutation, maybeDoc, mutationResult) {
    if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new UnknownDocument(mutation.key, mutationResult.version);
    }
    var newData = patchDocument(mutation, maybeDoc);
    return new Document(mutation.key, mutationResult.version, newData, {
        hasCommittedMutations: true
    });
}
function applyPatchMutationToLocalView(mutation, maybeDoc) {
    if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
        return maybeDoc;
    }
    var version = getPostMutationVersion(maybeDoc);
    var newData = patchDocument(mutation, maybeDoc);
    return new Document(mutation.key, version, newData, {
        hasLocalMutations: true
    });
}
/**
 * Patches the data of document if available or creates a new document. Note
 * that this does not check whether or not the precondition of this patch
 * holds.
 */
function patchDocument(mutation, maybeDoc) {
    var data;
    if (maybeDoc instanceof Document) {
        data = maybeDoc.data();
    }
    else {
        data = ObjectValue.empty();
    }
    return patchObject(mutation, data);
}
function patchObject(mutation, data) {
    var builder = new ObjectValueBuilder(data);
    mutation.fieldMask.fields.forEach(function (fieldPath) {
        if (!fieldPath.isEmpty()) {
            var newValue = mutation.data.field(fieldPath);
            if (newValue !== null) {
                builder.set(fieldPath, newValue);
            }
            else {
                builder.delete(fieldPath);
            }
        }
    });
    return builder.build();
}
/**
 * A mutation that modifies specific fields of the document with transform
 * operations. Currently the only supported transform is a server timestamp, but
 * IP Address, increment(n), etc. could be supported in the future.
 *
 * It is somewhat similar to a PatchMutation in that it patches specific fields
 * and has no effect when applied to a null or NoDocument (see comment on
 * Mutation for rationale).
 */
var TransformMutation = /** @class */ (function (_super) {
    tslib.__extends(TransformMutation, _super);
    function TransformMutation(key, fieldTransforms) {
        var _this = _super.call(this) || this;
        _this.key = key;
        _this.fieldTransforms = fieldTransforms;
        _this.type = 2 /* Transform */;
        // NOTE: We set a precondition of exists: true as a safety-check, since we
        // always combine TransformMutations with a SetMutation or PatchMutation which
        // (if successful) should end up with an existing document.
        _this.precondition = Precondition.exists(true);
        return _this;
    }
    return TransformMutation;
}(Mutation));
function applyTransformMutationToRemoteDocument(mutation, maybeDoc, mutationResult) {
    hardAssert(mutationResult.transformResults != null);
    if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
        // Since the mutation was not rejected, we know that the  precondition
        // matched on the backend. We therefore must not have the expected version
        // of the document in our cache and return an UnknownDocument with the
        // known updateTime.
        return new UnknownDocument(mutation.key, mutationResult.version);
    }
    var doc = requireDocument(mutation, maybeDoc);
    var transformResults = serverTransformResults(mutation.fieldTransforms, maybeDoc, mutationResult.transformResults);
    var version = mutationResult.version;
    var newData = transformObject(mutation, doc.data(), transformResults);
    return new Document(mutation.key, version, newData, {
        hasCommittedMutations: true
    });
}
function applyTransformMutationToLocalView(mutation, maybeDoc, localWriteTime, baseDoc) {
    if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
        return maybeDoc;
    }
    var doc = requireDocument(mutation, maybeDoc);
    var transformResults = localTransformResults(mutation.fieldTransforms, localWriteTime, maybeDoc, baseDoc);
    var newData = transformObject(mutation, doc.data(), transformResults);
    return new Document(mutation.key, doc.version, newData, {
        hasLocalMutations: true
    });
}
function extractTransformMutationBaseValue(mutation, maybeDoc) {
    var baseObject = null;
    for (var _i = 0, _e = mutation.fieldTransforms; _i < _e.length; _i++) {
        var fieldTransform = _e[_i];
        var existingValue = maybeDoc instanceof Document
            ? maybeDoc.field(fieldTransform.field)
            : undefined;
        var coercedValue = computeTransformOperationBaseValue(fieldTransform.transform, existingValue || null);
        if (coercedValue != null) {
            if (baseObject == null) {
                baseObject = new ObjectValueBuilder().set(fieldTransform.field, coercedValue);
            }
            else {
                baseObject = baseObject.set(fieldTransform.field, coercedValue);
            }
        }
    }
    return baseObject ? baseObject.build() : null;
}
/**
 * Asserts that the given MaybeDocument is actually a Document and verifies
 * that it matches the key for this mutation. Since we only support
 * transformations with precondition exists this method is guaranteed to be
 * safe.
 */
function requireDocument(mutation, maybeDoc) {
    return maybeDoc;
}
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
function serverTransformResults(fieldTransforms, baseDoc, serverTransformResults) {
    var transformResults = [];
    hardAssert(fieldTransforms.length === serverTransformResults.length);
    for (var i = 0; i < serverTransformResults.length; i++) {
        var fieldTransform = fieldTransforms[i];
        var transform = fieldTransform.transform;
        var previousValue = null;
        if (baseDoc instanceof Document) {
            previousValue = baseDoc.field(fieldTransform.field);
        }
        transformResults.push(applyTransformOperationToRemoteDocument(transform, previousValue, serverTransformResults[i]));
    }
    return transformResults;
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
 */
function localTransformResults(fieldTransforms, localWriteTime, maybeDoc, baseDoc) {
    var transformResults = [];
    for (var _i = 0, fieldTransforms_1 = fieldTransforms; _i < fieldTransforms_1.length; _i++) {
        var fieldTransform = fieldTransforms_1[_i];
        var transform = fieldTransform.transform;
        var previousValue = null;
        if (maybeDoc instanceof Document) {
            previousValue = maybeDoc.field(fieldTransform.field);
        }
        if (previousValue === null && baseDoc instanceof Document) {
            // If the current document does not contain a value for the mutated
            // field, use the value that existed before applying this mutation
            // batch. This solves an edge case where a PatchMutation clears the
            // values in a nested map before the TransformMutation is applied.
            previousValue = baseDoc.field(fieldTransform.field);
        }
        transformResults.push(applyTransformOperationToLocalView(transform, previousValue, localWriteTime));
    }
    return transformResults;
}
function transformObject(mutation, data, transformResults) {
    var builder = new ObjectValueBuilder(data);
    for (var i = 0; i < mutation.fieldTransforms.length; i++) {
        var fieldTransform = mutation.fieldTransforms[i];
        builder.set(fieldTransform.field, transformResults[i]);
    }
    return builder.build();
}
/** A mutation that deletes the document at the given key. */
var DeleteMutation = /** @class */ (function (_super) {
    tslib.__extends(DeleteMutation, _super);
    function DeleteMutation(key, precondition) {
        var _this = _super.call(this) || this;
        _this.key = key;
        _this.precondition = precondition;
        _this.type = 3 /* Delete */;
        return _this;
    }
    return DeleteMutation;
}(Mutation));
function applyDeleteMutationToRemoteDocument(mutation, maybeDoc, mutationResult) {
    // Unlike applyToLocalView, if we're applying a mutation to a remote
    // document the server has accepted the mutation so the precondition must
    // have held.
    return new NoDocument(mutation.key, mutationResult.version, {
        hasCommittedMutations: true
    });
}
function applyDeleteMutationToLocalView(mutation, maybeDoc) {
    if (!preconditionIsValidForDocument(mutation.precondition, maybeDoc)) {
        return maybeDoc;
    }
    return new NoDocument(mutation.key, SnapshotVersion.min());
}
/**
 * A mutation that verifies the existence of the document at the given key with
 * the provided precondition.
 *
 * The `verify` operation is only used in Transactions, and this class serves
 * primarily to facilitate serialization into protos.
 */
var VerifyMutation = /** @class */ (function (_super) {
    tslib.__extends(VerifyMutation, _super);
    function VerifyMutation(key, precondition) {
        var _this = _super.call(this) || this;
        _this.key = key;
        _this.precondition = precondition;
        _this.type = 4 /* Verify */;
        return _this;
    }
    return VerifyMutation;
}(Mutation));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var BATCHID_UNKNOWN = -1;
/**
 * A batch of mutations that will be sent as one unit to the backend.
 */
var MutationBatch = /** @class */ (function () {
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
    function MutationBatch(batchId, localWriteTime, baseMutations, mutations) {
        this.batchId = batchId;
        this.localWriteTime = localWriteTime;
        this.baseMutations = baseMutations;
        this.mutations = mutations;
    }
    /**
     * Applies all the mutations in this MutationBatch to the specified document
     * to create a new remote document
     *
     * @param docKey The key of the document to apply mutations to.
     * @param maybeDoc The document to apply mutations to.
     * @param batchResult The result of applying the MutationBatch to the
     * backend.
     */
    MutationBatch.prototype.applyToRemoteDocument = function (docKey, maybeDoc, batchResult) {
        var mutationResults = batchResult.mutationResults;
        for (var i = 0; i < this.mutations.length; i++) {
            var mutation = this.mutations[i];
            if (mutation.key.isEqual(docKey)) {
                var mutationResult = mutationResults[i];
                maybeDoc = applyMutationToRemoteDocument(mutation, maybeDoc, mutationResult);
            }
        }
        return maybeDoc;
    };
    /**
     * Computes the local view of a document given all the mutations in this
     * batch.
     *
     * @param docKey The key of the document to apply mutations to.
     * @param maybeDoc The document to apply mutations to.
     */
    MutationBatch.prototype.applyToLocalView = function (docKey, maybeDoc) {
        // First, apply the base state. This allows us to apply non-idempotent
        // transform against a consistent set of values.
        for (var _i = 0, _e = this.baseMutations; _i < _e.length; _i++) {
            var mutation = _e[_i];
            if (mutation.key.isEqual(docKey)) {
                maybeDoc = applyMutationToLocalView(mutation, maybeDoc, maybeDoc, this.localWriteTime);
            }
        }
        var baseDoc = maybeDoc;
        // Second, apply all user-provided mutations.
        for (var _f = 0, _g = this.mutations; _f < _g.length; _f++) {
            var mutation = _g[_f];
            if (mutation.key.isEqual(docKey)) {
                maybeDoc = applyMutationToLocalView(mutation, maybeDoc, baseDoc, this.localWriteTime);
            }
        }
        return maybeDoc;
    };
    /**
     * Computes the local view for all provided documents given the mutations in
     * this batch.
     */
    MutationBatch.prototype.applyToLocalDocumentSet = function (maybeDocs) {
        var _this = this;
        // TODO(mrschmidt): This implementation is O(n^2). If we apply the mutations
        // directly (as done in `applyToLocalView()`), we can reduce the complexity
        // to O(n).
        var mutatedDocuments = maybeDocs;
        this.mutations.forEach(function (m) {
            var mutatedDocument = _this.applyToLocalView(m.key, maybeDocs.get(m.key));
            if (mutatedDocument) {
                mutatedDocuments = mutatedDocuments.insert(m.key, mutatedDocument);
            }
        });
        return mutatedDocuments;
    };
    MutationBatch.prototype.keys = function () {
        return this.mutations.reduce(function (keys, m) { return keys.add(m.key); }, documentKeySet());
    };
    MutationBatch.prototype.isEqual = function (other) {
        return (this.batchId === other.batchId &&
            arrayEquals(this.mutations, other.mutations, function (l, r) { return mutationEquals(l, r); }) &&
            arrayEquals(this.baseMutations, other.baseMutations, function (l, r) { return mutationEquals(l, r); }));
    };
    return MutationBatch;
}());
/** The result of applying a mutation batch to the backend. */
var MutationBatchResult = /** @class */ (function () {
    function MutationBatchResult(batch, commitVersion, mutationResults, 
    /**
     * A pre-computed mapping from each mutated document to the resulting
     * version.
     */
    docVersions) {
        this.batch = batch;
        this.commitVersion = commitVersion;
        this.mutationResults = mutationResults;
        this.docVersions = docVersions;
    }
    /**
     * Creates a new MutationBatchResult for the given batch and results. There
     * must be one result for each mutation in the batch. This static factory
     * caches a document=>version mapping (docVersions).
     */
    MutationBatchResult.from = function (batch, commitVersion, results) {
        hardAssert(batch.mutations.length === results.length);
        var versionMap = documentVersionMap();
        var mutations = batch.mutations;
        for (var i = 0; i < mutations.length; i++) {
            versionMap = versionMap.insert(mutations[i].key, results[i].version);
        }
        return new MutationBatchResult(batch, commitVersion, results, versionMap);
    };
    return MutationBatchResult;
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
 * A map implementation that uses objects as keys. Objects must have an
 * associated equals function and must be immutable. Entries in the map are
 * stored together with the key being produced from the mapKeyFn. This map
 * automatically handles collisions of keys.
 */
var ObjectMap = /** @class */ (function () {
    function ObjectMap(mapKeyFn, equalsFn) {
        this.mapKeyFn = mapKeyFn;
        this.equalsFn = equalsFn;
        /**
         * The inner map for a key -> value pair. Due to the possibility of
         * collisions we keep a list of entries that we do a linear search through
         * to find an actual match. Note that collisions should be rare, so we still
         * expect near constant time lookups in practice.
         */
        this.inner = {};
    }
    /** Get a value for this key, or undefined if it does not exist. */
    ObjectMap.prototype.get = function (key) {
        var id = this.mapKeyFn(key);
        var matches = this.inner[id];
        if (matches === undefined) {
            return undefined;
        }
        for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
            var _e = matches_1[_i], otherKey = _e[0], value = _e[1];
            if (this.equalsFn(otherKey, key)) {
                return value;
            }
        }
        return undefined;
    };
    ObjectMap.prototype.has = function (key) {
        return this.get(key) !== undefined;
    };
    /** Put this key and value in the map. */
    ObjectMap.prototype.set = function (key, value) {
        var id = this.mapKeyFn(key);
        var matches = this.inner[id];
        if (matches === undefined) {
            this.inner[id] = [[key, value]];
            return;
        }
        for (var i = 0; i < matches.length; i++) {
            if (this.equalsFn(matches[i][0], key)) {
                matches[i] = [key, value];
                return;
            }
        }
        matches.push([key, value]);
    };
    /**
     * Remove this key from the map. Returns a boolean if anything was deleted.
     */
    ObjectMap.prototype.delete = function (key) {
        var id = this.mapKeyFn(key);
        var matches = this.inner[id];
        if (matches === undefined) {
            return false;
        }
        for (var i = 0; i < matches.length; i++) {
            if (this.equalsFn(matches[i][0], key)) {
                if (matches.length === 1) {
                    delete this.inner[id];
                }
                else {
                    matches.splice(i, 1);
                }
                return true;
            }
        }
        return false;
    };
    ObjectMap.prototype.forEach = function (fn) {
        forEach(this.inner, function (_, entries) {
            for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                var _e = entries_1[_i], k = _e[0], v = _e[1];
                fn(k, v);
            }
        });
    };
    ObjectMap.prototype.isEmpty = function () {
        return isEmpty(this.inner);
    };
    return ObjectMap;
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
 */
var PersistencePromise = /** @class */ (function () {
    function PersistencePromise(callback) {
        var _this = this;
        // NOTE: next/catchCallback will always point to our own wrapper functions,
        // not the user's raw next() or catch() callbacks.
        this.nextCallback = null;
        this.catchCallback = null;
        // When the operation resolves, we'll set result or error and mark isDone.
        this.result = undefined;
        this.error = undefined;
        this.isDone = false;
        // Set to true when .then() or .catch() are called and prevents additional
        // chaining.
        this.callbackAttached = false;
        callback(function (value) {
            _this.isDone = true;
            _this.result = value;
            if (_this.nextCallback) {
                // value should be defined unless T is Void, but we can't express
                // that in the type system.
                _this.nextCallback(value);
            }
        }, function (error) {
            _this.isDone = true;
            _this.error = error;
            if (_this.catchCallback) {
                _this.catchCallback(error);
            }
        });
    }
    PersistencePromise.prototype.catch = function (fn) {
        return this.next(undefined, fn);
    };
    PersistencePromise.prototype.next = function (nextFn, catchFn) {
        var _this = this;
        if (this.callbackAttached) {
            fail();
        }
        this.callbackAttached = true;
        if (this.isDone) {
            if (!this.error) {
                return this.wrapSuccess(nextFn, this.result);
            }
            else {
                return this.wrapFailure(catchFn, this.error);
            }
        }
        else {
            return new PersistencePromise(function (resolve, reject) {
                _this.nextCallback = function (value) {
                    _this.wrapSuccess(nextFn, value).next(resolve, reject);
                };
                _this.catchCallback = function (error) {
                    _this.wrapFailure(catchFn, error).next(resolve, reject);
                };
            });
        }
    };
    PersistencePromise.prototype.toPromise = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.next(resolve, reject);
        });
    };
    PersistencePromise.prototype.wrapUserFunction = function (fn) {
        try {
            var result = fn();
            if (result instanceof PersistencePromise) {
                return result;
            }
            else {
                return PersistencePromise.resolve(result);
            }
        }
        catch (e) {
            return PersistencePromise.reject(e);
        }
    };
    PersistencePromise.prototype.wrapSuccess = function (nextFn, value) {
        if (nextFn) {
            return this.wrapUserFunction(function () { return nextFn(value); });
        }
        else {
            // If there's no nextFn, then R must be the same as T
            return PersistencePromise.resolve(value);
        }
    };
    PersistencePromise.prototype.wrapFailure = function (catchFn, error) {
        if (catchFn) {
            return this.wrapUserFunction(function () { return catchFn(error); });
        }
        else {
            return PersistencePromise.reject(error);
        }
    };
    PersistencePromise.resolve = function (result) {
        return new PersistencePromise(function (resolve, reject) {
            resolve(result);
        });
    };
    PersistencePromise.reject = function (error) {
        return new PersistencePromise(function (resolve, reject) {
            reject(error);
        });
    };
    PersistencePromise.waitFor = function (
    // Accept all Promise types in waitFor().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all) {
        return new PersistencePromise(function (resolve, reject) {
            var expectedCount = 0;
            var resolvedCount = 0;
            var done = false;
            all.forEach(function (element) {
                ++expectedCount;
                element.next(function () {
                    ++resolvedCount;
                    if (done && resolvedCount === expectedCount) {
                        resolve();
                    }
                }, function (err) { return reject(err); });
            });
            done = true;
            if (resolvedCount === expectedCount) {
                resolve();
            }
        });
    };
    /**
     * Given an array of predicate functions that asynchronously evaluate to a
     * boolean, implements a short-circuiting `or` between the results. Predicates
     * will be evaluated until one of them returns `true`, then stop. The final
     * result will be whether any of them returned `true`.
     */
    PersistencePromise.or = function (predicates) {
        var p = PersistencePromise.resolve(false);
        var _loop_3 = function (predicate) {
            p = p.next(function (isTrue) {
                if (isTrue) {
                    return PersistencePromise.resolve(isTrue);
                }
                else {
                    return predicate();
                }
            });
        };
        for (var _i = 0, predicates_1 = predicates; _i < predicates_1.length; _i++) {
            var predicate = predicates_1[_i];
            _loop_3(predicate);
        }
        return p;
    };
    PersistencePromise.forEach = function (collection, f) {
        var _this = this;
        var promises = [];
        collection.forEach(function (r, s) {
            promises.push(f.call(_this, r, s));
        });
        return this.waitFor(promises);
    };
    return PersistencePromise;
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
 * A readonly view of the local state of all documents we're tracking (i.e. we
 * have a cached version in remoteDocumentCache or local mutations for the
 * document). The view is computed by applying the mutations in the
 * MutationQueue to the RemoteDocumentCache.
 */
var LocalDocumentsView = /** @class */ (function () {
    function LocalDocumentsView(remoteDocumentCache, mutationQueue, indexManager) {
        this.remoteDocumentCache = remoteDocumentCache;
        this.mutationQueue = mutationQueue;
        this.indexManager = indexManager;
    }
    /**
     * Get the local view of the document identified by `key`.
     *
     * @return Local view of the document or null if we don't have any cached
     * state for it.
     */
    LocalDocumentsView.prototype.getDocument = function (transaction, key) {
        var _this = this;
        return this.mutationQueue
            .getAllMutationBatchesAffectingDocumentKey(transaction, key)
            .next(function (batches) { return _this.getDocumentInternal(transaction, key, batches); });
    };
    /** Internal version of `getDocument` that allows reusing batches. */
    LocalDocumentsView.prototype.getDocumentInternal = function (transaction, key, inBatches) {
        return this.remoteDocumentCache.getEntry(transaction, key).next(function (doc) {
            for (var _i = 0, inBatches_1 = inBatches; _i < inBatches_1.length; _i++) {
                var batch = inBatches_1[_i];
                doc = batch.applyToLocalView(key, doc);
            }
            return doc;
        });
    };
    // Returns the view of the given `docs` as they would appear after applying
    // all mutations in the given `batches`.
    LocalDocumentsView.prototype.applyLocalMutationsToDocuments = function (transaction, docs, batches) {
        var results = nullableMaybeDocumentMap();
        docs.forEach(function (key, localView) {
            for (var _i = 0, batches_1 = batches; _i < batches_1.length; _i++) {
                var batch = batches_1[_i];
                localView = batch.applyToLocalView(key, localView);
            }
            results = results.insert(key, localView);
        });
        return results;
    };
    /**
     * Gets the local view of the documents identified by `keys`.
     *
     * If we don't have cached state for a document in `keys`, a NoDocument will
     * be stored for that key in the resulting set.
     */
    LocalDocumentsView.prototype.getDocuments = function (transaction, keys) {
        var _this = this;
        return this.remoteDocumentCache
            .getEntries(transaction, keys)
            .next(function (docs) { return _this.getLocalViewOfDocuments(transaction, docs); });
    };
    /**
     * Similar to `getDocuments`, but creates the local view from the given
     * `baseDocs` without retrieving documents from the local store.
     */
    LocalDocumentsView.prototype.getLocalViewOfDocuments = function (transaction, baseDocs) {
        var _this = this;
        return this.mutationQueue
            .getAllMutationBatchesAffectingDocumentKeys(transaction, baseDocs)
            .next(function (batches) {
            var docs = _this.applyLocalMutationsToDocuments(transaction, baseDocs, batches);
            var results = maybeDocumentMap();
            docs.forEach(function (key, maybeDoc) {
                // TODO(http://b/32275378): Don't conflate missing / deleted.
                if (!maybeDoc) {
                    maybeDoc = new NoDocument(key, SnapshotVersion.min());
                }
                results = results.insert(key, maybeDoc);
            });
            return results;
        });
    };
    /**
     * Performs a query against the local view of all documents.
     *
     * @param transaction The persistence transaction.
     * @param query The query to match documents against.
     * @param sinceReadTime If not set to SnapshotVersion.min(), return only
     *     documents that have been read since this snapshot version (exclusive).
     */
    LocalDocumentsView.prototype.getDocumentsMatchingQuery = function (transaction, query, sinceReadTime) {
        if (isDocumentQuery(query)) {
            return this.getDocumentsMatchingDocumentQuery(transaction, query.path);
        }
        else if (isCollectionGroupQuery(query)) {
            return this.getDocumentsMatchingCollectionGroupQuery(transaction, query, sinceReadTime);
        }
        else {
            return this.getDocumentsMatchingCollectionQuery(transaction, query, sinceReadTime);
        }
    };
    LocalDocumentsView.prototype.getDocumentsMatchingDocumentQuery = function (transaction, docPath) {
        // Just do a simple document lookup.
        return this.getDocument(transaction, new DocumentKey(docPath)).next(function (maybeDoc) {
            var result = documentMap();
            if (maybeDoc instanceof Document) {
                result = result.insert(maybeDoc.key, maybeDoc);
            }
            return result;
        });
    };
    LocalDocumentsView.prototype.getDocumentsMatchingCollectionGroupQuery = function (transaction, query, sinceReadTime) {
        var _this = this;
        var collectionId = query.collectionGroup;
        var results = documentMap();
        return this.indexManager
            .getCollectionParents(transaction, collectionId)
            .next(function (parents) {
            // Perform a collection query against each parent that contains the
            // collectionId and aggregate the results.
            return PersistencePromise.forEach(parents, function (parent) {
                var collectionQuery = query.asCollectionQueryAtPath(parent.child(collectionId));
                return _this.getDocumentsMatchingCollectionQuery(transaction, collectionQuery, sinceReadTime).next(function (r) {
                    r.forEach(function (key, doc) {
                        results = results.insert(key, doc);
                    });
                });
            }).next(function () { return results; });
        });
    };
    LocalDocumentsView.prototype.getDocumentsMatchingCollectionQuery = function (transaction, query, sinceReadTime) {
        var _this = this;
        // Query the remote documents and overlay mutations.
        var results;
        var mutationBatches;
        return this.remoteDocumentCache
            .getDocumentsMatchingQuery(transaction, query, sinceReadTime)
            .next(function (queryResults) {
            results = queryResults;
            return _this.mutationQueue.getAllMutationBatchesAffectingQuery(transaction, query);
        })
            .next(function (matchingMutationBatches) {
            mutationBatches = matchingMutationBatches;
            // It is possible that a PatchMutation can make a document match a query, even if
            // the version in the RemoteDocumentCache is not a match yet (waiting for server
            // to ack). To handle this, we find all document keys affected by the PatchMutations
            // that are not in `result` yet, and back fill them via `remoteDocumentCache.getEntries`,
            // otherwise those `PatchMutations` will be ignored because no base document can be found,
            // and lead to missing result for the query.
            return _this.addMissingBaseDocuments(transaction, mutationBatches, results).next(function (mergedDocuments) {
                results = mergedDocuments;
                for (var _i = 0, mutationBatches_1 = mutationBatches; _i < mutationBatches_1.length; _i++) {
                    var batch = mutationBatches_1[_i];
                    for (var _e = 0, _f = batch.mutations; _e < _f.length; _e++) {
                        var mutation = _f[_e];
                        var key = mutation.key;
                        var baseDoc = results.get(key);
                        var mutatedDoc = applyMutationToLocalView(mutation, baseDoc, baseDoc, batch.localWriteTime);
                        if (mutatedDoc instanceof Document) {
                            results = results.insert(key, mutatedDoc);
                        }
                        else {
                            results = results.remove(key);
                        }
                    }
                }
            });
        })
            .next(function () {
            // Finally, filter out any documents that don't actually match
            // the query.
            results.forEach(function (key, doc) {
                if (!queryMatches(query, doc)) {
                    results = results.remove(key);
                }
            });
            return results;
        });
    };
    LocalDocumentsView.prototype.addMissingBaseDocuments = function (transaction, matchingMutationBatches, existingDocuments) {
        var missingBaseDocEntriesForPatching = documentKeySet();
        for (var _i = 0, matchingMutationBatches_1 = matchingMutationBatches; _i < matchingMutationBatches_1.length; _i++) {
            var batch = matchingMutationBatches_1[_i];
            for (var _e = 0, _f = batch.mutations; _e < _f.length; _e++) {
                var mutation = _f[_e];
                if (mutation instanceof PatchMutation &&
                    existingDocuments.get(mutation.key) === null) {
                    missingBaseDocEntriesForPatching = missingBaseDocEntriesForPatching.add(mutation.key);
                }
            }
        }
        var mergedDocuments = existingDocuments;
        return this.remoteDocumentCache
            .getEntries(transaction, missingBaseDocEntriesForPatching)
            .next(function (missingBaseDocs) {
            missingBaseDocs.forEach(function (key, doc) {
                if (doc !== null && doc instanceof Document) {
                    mergedDocuments = mergedDocuments.insert(key, doc);
                }
            });
            return mergedDocuments;
        });
    };
    return LocalDocumentsView;
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
var PRIMARY_LEASE_LOST_ERROR_MSG = 'The current tab is not in the required state to perform this operation. ' +
    'It might be necessary to refresh the browser tab.';
/**
 * A base class representing a persistence transaction, encapsulating both the
 * transaction's sequence numbers as well as a list of onCommitted listeners.
 *
 * When you call Persistence.runTransaction(), it will create a transaction and
 * pass it to your callback. You then pass it to any method that operates
 * on persistence.
 */
var PersistenceTransaction = /** @class */ (function () {
    function PersistenceTransaction() {
        this.onCommittedListeners = [];
    }
    PersistenceTransaction.prototype.addOnCommittedListener = function (listener) {
        this.onCommittedListeners.push(listener);
    };
    PersistenceTransaction.prototype.raiseOnCommittedEvent = function () {
        this.onCommittedListeners.forEach(function (listener) { return listener(); });
    };
    return PersistenceTransaction;
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
 * An immutable set of metadata that the local store tracks for each target.
 */
var TargetData = /** @class */ (function () {
    function TargetData(
    /** The target being listened to. */
    target, 
    /**
     * The target ID to which the target corresponds; Assigned by the
     * LocalStore for user listens and by the SyncEngine for limbo watches.
     */
    targetId, 
    /** The purpose of the target. */
    purpose, 
    /**
     * The sequence number of the last transaction during which this target data
     * was modified.
     */
    sequenceNumber, 
    /** The latest snapshot version seen for this target. */
    snapshotVersion, 
    /**
     * The maximum snapshot version at which the associated view
     * contained no limbo documents.
     */
    lastLimboFreeSnapshotVersion, 
    /**
     * An opaque, server-assigned token that allows watching a target to be
     * resumed after disconnecting without retransmitting all the data that
     * matches the target. The resume token essentially identifies a point in
     * time from which the server should resume sending results.
     */
    resumeToken) {
        if (snapshotVersion === void 0) { snapshotVersion = SnapshotVersion.min(); }
        if (lastLimboFreeSnapshotVersion === void 0) { lastLimboFreeSnapshotVersion = SnapshotVersion.min(); }
        if (resumeToken === void 0) { resumeToken = ByteString.EMPTY_BYTE_STRING; }
        this.target = target;
        this.targetId = targetId;
        this.purpose = purpose;
        this.sequenceNumber = sequenceNumber;
        this.snapshotVersion = snapshotVersion;
        this.lastLimboFreeSnapshotVersion = lastLimboFreeSnapshotVersion;
        this.resumeToken = resumeToken;
    }
    /** Creates a new target data instance with an updated sequence number. */
    TargetData.prototype.withSequenceNumber = function (sequenceNumber) {
        return new TargetData(this.target, this.targetId, this.purpose, sequenceNumber, this.snapshotVersion, this.lastLimboFreeSnapshotVersion, this.resumeToken);
    };
    /**
     * Creates a new target data instance with an updated resume token and
     * snapshot version.
     */
    TargetData.prototype.withResumeToken = function (resumeToken, snapshotVersion) {
        return new TargetData(this.target, this.targetId, this.purpose, this.sequenceNumber, snapshotVersion, this.lastLimboFreeSnapshotVersion, resumeToken);
    };
    /**
     * Creates a new target data instance with an updated last limbo free
     * snapshot version number.
     */
    TargetData.prototype.withLastLimboFreeSnapshotVersion = function (lastLimboFreeSnapshotVersion) {
        return new TargetData(this.target, this.targetId, this.purpose, this.sequenceNumber, this.snapshotVersion, lastLimboFreeSnapshotVersion, this.resumeToken);
    };
    return TargetData;
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
var RemoteDocumentChangeBuffer = /** @class */ (function () {
    function RemoteDocumentChangeBuffer() {
        // A mapping of document key to the new cache entry that should be written (or null if any
        // existing cache entry should be removed).
        this.changes = new ObjectMap(function (key) { return key.toString(); }, function (l, r) { return l.isEqual(r); });
        this.changesApplied = false;
    }
    Object.defineProperty(RemoteDocumentChangeBuffer.prototype, "readTime", {
        get: function () {
            return this._readTime;
        },
        set: function (value) {
            this._readTime = value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Buffers a `RemoteDocumentCache.addEntry()` call.
     *
     * You can only modify documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */
    RemoteDocumentChangeBuffer.prototype.addEntry = function (maybeDocument, readTime) {
        this.assertNotApplied();
        this.readTime = readTime;
        this.changes.set(maybeDocument.key, maybeDocument);
    };
    /**
     * Buffers a `RemoteDocumentCache.removeEntry()` call.
     *
     * You can only remove documents that have already been retrieved via
     * `getEntry()/getEntries()` (enforced via IndexedDbs `apply()`).
     */
    RemoteDocumentChangeBuffer.prototype.removeEntry = function (key, readTime) {
        this.assertNotApplied();
        if (readTime) {
            this.readTime = readTime;
        }
        this.changes.set(key, null);
    };
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
    RemoteDocumentChangeBuffer.prototype.getEntry = function (transaction, documentKey) {
        this.assertNotApplied();
        var bufferedEntry = this.changes.get(documentKey);
        if (bufferedEntry !== undefined) {
            return PersistencePromise.resolve(bufferedEntry);
        }
        else {
            return this.getFromCache(transaction, documentKey);
        }
    };
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
    RemoteDocumentChangeBuffer.prototype.getEntries = function (transaction, documentKeys) {
        return this.getAllFromCache(transaction, documentKeys);
    };
    /**
     * Applies buffered changes to the underlying RemoteDocumentCache, using
     * the provided transaction.
     */
    RemoteDocumentChangeBuffer.prototype.apply = function (transaction) {
        this.assertNotApplied();
        this.changesApplied = true;
        return this.applyChanges(transaction);
    };
    /** Helper to assert this.changes is not null  */
    RemoteDocumentChangeBuffer.prototype.assertNotApplied = function () {
    };
    return RemoteDocumentChangeBuffer;
}());
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
var MemoryIndexManager = /** @class */ (function () {
    function MemoryIndexManager() {
        this.collectionParentIndex = new MemoryCollectionParentIndex();
    }
    MemoryIndexManager.prototype.addToCollectionParentIndex = function (transaction, collectionPath) {
        this.collectionParentIndex.add(collectionPath);
        return PersistencePromise.resolve();
    };
    MemoryIndexManager.prototype.getCollectionParents = function (transaction, collectionId) {
        return PersistencePromise.resolve(this.collectionParentIndex.getEntries(collectionId));
    };
    return MemoryIndexManager;
}());
/**
 * Internal implementation of the collection-parent index exposed by MemoryIndexManager.
 * Also used for in-memory caching by IndexedDbIndexManager and initial index population
 * in indexeddb_schema.ts
 */
var MemoryCollectionParentIndex = /** @class */ (function () {
    function MemoryCollectionParentIndex() {
        this.index = {};
    }
    // Returns false if the entry already existed.
    MemoryCollectionParentIndex.prototype.add = function (collectionPath) {
        var collectionId = collectionPath.lastSegment();
        var parentPath = collectionPath.popLast();
        var existingParents = this.index[collectionId] ||
            new SortedSet(ResourcePath.comparator);
        var added = !existingParents.has(parentPath);
        this.index[collectionId] = existingParents.add(parentPath);
        return added;
    };
    MemoryCollectionParentIndex.prototype.has = function (collectionPath) {
        var collectionId = collectionPath.lastSegment();
        var parentPath = collectionPath.popLast();
        var existingParents = this.index[collectionId];
        return existingParents && existingParents.has(parentPath);
    };
    MemoryCollectionParentIndex.prototype.getEntries = function (collectionId) {
        var parentPaths = this.index[collectionId] ||
            new SortedSet(ResourcePath.comparator);
        return parentPaths.toArray();
    };
    return MemoryCollectionParentIndex;
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
var Deferred = /** @class */ (function () {
    function Deferred() {
        var _this = this;
        this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    }
    return Deferred;
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
/** Verifies whether `e` is an IndexedDbTransactionError. */
function isIndexedDbTransactionError(e) {
    // Use name equality, as instanceof checks on errors don't work with errors
    // that wrap other errors.
    return e.name === 'IndexedDbTransactionError';
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
var OFFSET = 2;
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
var TargetIdGenerator = /** @class */ (function () {
    function TargetIdGenerator(lastId) {
        this.lastId = lastId;
    }
    TargetIdGenerator.prototype.next = function () {
        this.lastId += OFFSET;
        return this.lastId;
    };
    TargetIdGenerator.forTargetCache = function () {
        // The target cache generator must return '2' in its first call to `next()`
        // as there is no differentiation in the protocol layer between an unset
        // number and the number '0'. If we were to sent a target with target ID
        // '0', the backend would consider it unset and replace it with its own ID.
        return new TargetIdGenerator(2 - OFFSET);
    };
    TargetIdGenerator.forSyncEngine = function () {
        // Sync engine assigns target IDs for limbo document detection.
        return new TargetIdGenerator(1 - OFFSET);
    };
    return TargetIdGenerator;
}());
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
var LruParams = /** @class */ (function () {
    function LruParams(
    // When we attempt to collect, we will only do so if the cache size is greater than this
    // threshold. Passing `COLLECTION_DISABLED` here will cause collection to always be skipped.
    cacheSizeCollectionThreshold, 
    // The percentage of sequence numbers that we will attempt to collect
    percentileToCollect, 
    // A cap on the total number of sequence numbers that will be collected. This prevents
    // us from collecting a huge number of sequence numbers if the cache has grown very large.
    maximumSequenceNumbersToCollect) {
        this.cacheSizeCollectionThreshold = cacheSizeCollectionThreshold;
        this.percentileToCollect = percentileToCollect;
        this.maximumSequenceNumbersToCollect = maximumSequenceNumbersToCollect;
    }
    LruParams.withCacheSize = function (cacheSize) {
        return new LruParams(cacheSize, LruParams.DEFAULT_COLLECTION_PERCENTILE, LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT);
    };
    return LruParams;
}());
LruParams.COLLECTION_DISABLED = -1;
LruParams.MINIMUM_CACHE_SIZE_BYTES = 1 * 1024 * 1024;
LruParams.DEFAULT_CACHE_SIZE_BYTES = 40 * 1024 * 1024;
LruParams.DEFAULT_COLLECTION_PERCENTILE = 10;
LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT = 1000;
LruParams.DEFAULT = new LruParams(LruParams.DEFAULT_CACHE_SIZE_BYTES, LruParams.DEFAULT_COLLECTION_PERCENTILE, LruParams.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT);
LruParams.DISABLED = new LruParams(LruParams.COLLECTION_DISABLED, 0, 0);
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var LOG_TAG$1 = 'LocalStore';
/**
 * Implements `LocalStore` interface.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */
var LocalStoreImpl = /** @class */ (function () {
    function LocalStoreImpl(
    /** Manages our in-memory or durable persistence. */
    persistence, queryEngine, initialUser) {
        this.persistence = persistence;
        this.queryEngine = queryEngine;
        /**
         * Maps a targetID to data about its target.
         *
         * PORTING NOTE: We are using an immutable data structure on Web to make re-runs
         * of `applyRemoteEvent()` idempotent.
         */
        this.targetDataByTarget = new SortedMap(primitiveComparator);
        /** Maps a target to its targetID. */
        // TODO(wuandy): Evaluate if TargetId can be part of Target.
        this.targetIdByTarget = new ObjectMap(function (t) { return canonifyTarget(t); }, targetEquals);
        /**
         * The read time of the last entry processed by `getNewDocumentChanges()`.
         *
         * PORTING NOTE: This is only used for multi-tab synchronization.
         */
        this.lastDocumentChangeReadTime = SnapshotVersion.min();
        this.mutationQueue = persistence.getMutationQueue(initialUser);
        this.remoteDocuments = persistence.getRemoteDocumentCache();
        this.targetCache = persistence.getTargetCache();
        this.localDocuments = new LocalDocumentsView(this.remoteDocuments, this.mutationQueue, this.persistence.getIndexManager());
        this.queryEngine.setLocalDocumentsView(this.localDocuments);
    }
    LocalStoreImpl.prototype.handleUserChange = function (user) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var newMutationQueue, newLocalDocuments, result;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        newMutationQueue = this.mutationQueue;
                        newLocalDocuments = this.localDocuments;
                        return [4 /*yield*/, this.persistence.runTransaction('Handle user change', 'readonly', function (txn) {
                                // Swap out the mutation queue, grabbing the pending mutation batches
                                // before and after.
                                var oldBatches;
                                return _this.mutationQueue
                                    .getAllMutationBatches(txn)
                                    .next(function (promisedOldBatches) {
                                    oldBatches = promisedOldBatches;
                                    newMutationQueue = _this.persistence.getMutationQueue(user);
                                    // Recreate our LocalDocumentsView using the new
                                    // MutationQueue.
                                    newLocalDocuments = new LocalDocumentsView(_this.remoteDocuments, newMutationQueue, _this.persistence.getIndexManager());
                                    return newMutationQueue.getAllMutationBatches(txn);
                                })
                                    .next(function (newBatches) {
                                    var removedBatchIds = [];
                                    var addedBatchIds = [];
                                    // Union the old/new changed keys.
                                    var changedKeys = documentKeySet();
                                    for (var _i = 0, oldBatches_1 = oldBatches; _i < oldBatches_1.length; _i++) {
                                        var batch = oldBatches_1[_i];
                                        removedBatchIds.push(batch.batchId);
                                        for (var _e = 0, _f = batch.mutations; _e < _f.length; _e++) {
                                            var mutation = _f[_e];
                                            changedKeys = changedKeys.add(mutation.key);
                                        }
                                    }
                                    for (var _g = 0, newBatches_1 = newBatches; _g < newBatches_1.length; _g++) {
                                        var batch = newBatches_1[_g];
                                        addedBatchIds.push(batch.batchId);
                                        for (var _h = 0, _j = batch.mutations; _h < _j.length; _h++) {
                                            var mutation = _j[_h];
                                            changedKeys = changedKeys.add(mutation.key);
                                        }
                                    }
                                    // Return the set of all (potentially) changed documents and the list
                                    // of mutation batch IDs that were affected by change.
                                    return newLocalDocuments
                                        .getDocuments(txn, changedKeys)
                                        .next(function (affectedDocuments) {
                                        return {
                                            affectedDocuments: affectedDocuments,
                                            removedBatchIds: removedBatchIds,
                                            addedBatchIds: addedBatchIds
                                        };
                                    });
                                });
                            })];
                    case 1:
                        result = _e.sent();
                        this.mutationQueue = newMutationQueue;
                        this.localDocuments = newLocalDocuments;
                        this.queryEngine.setLocalDocumentsView(this.localDocuments);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    LocalStoreImpl.prototype.localWrite = function (mutations) {
        var _this = this;
        var localWriteTime = Timestamp.now();
        var keys = mutations.reduce(function (keys, m) { return keys.add(m.key); }, documentKeySet());
        var existingDocs;
        return this.persistence
            .runTransaction('Locally write mutations', 'readwrite', function (txn) {
            // Load and apply all existing mutations. This lets us compute the
            // current base state for all non-idempotent transforms before applying
            // any additional user-provided writes.
            return _this.localDocuments.getDocuments(txn, keys).next(function (docs) {
                existingDocs = docs;
                // For non-idempotent mutations (such as `FieldValue.increment()`),
                // we record the base state in a separate patch mutation. This is
                // later used to guarantee consistent values and prevents flicker
                // even if the backend sends us an update that already includes our
                // transform.
                var baseMutations = [];
                for (var _i = 0, mutations_1 = mutations; _i < mutations_1.length; _i++) {
                    var mutation = mutations_1[_i];
                    var baseValue = extractMutationBaseValue(mutation, existingDocs.get(mutation.key));
                    if (baseValue != null) {
                        // NOTE: The base state should only be applied if there's some
                        // existing document to override, so use a Precondition of
                        // exists=true
                        baseMutations.push(new PatchMutation(mutation.key, baseValue, extractFieldMask(baseValue.proto.mapValue), Precondition.exists(true)));
                    }
                }
                return _this.mutationQueue.addMutationBatch(txn, localWriteTime, baseMutations, mutations);
            });
        })
            .then(function (batch) {
            var changes = batch.applyToLocalDocumentSet(existingDocs);
            return { batchId: batch.batchId, changes: changes };
        });
    };
    LocalStoreImpl.prototype.acknowledgeBatch = function (batchResult) {
        var _this = this;
        return this.persistence.runTransaction('Acknowledge batch', 'readwrite-primary', function (txn) {
            var affected = batchResult.batch.keys();
            var documentBuffer = _this.remoteDocuments.newChangeBuffer({
                trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
            });
            return _this.applyWriteToRemoteDocuments(txn, batchResult, documentBuffer)
                .next(function () { return documentBuffer.apply(txn); })
                .next(function () { return _this.mutationQueue.performConsistencyCheck(txn); })
                .next(function () { return _this.localDocuments.getDocuments(txn, affected); });
        });
    };
    LocalStoreImpl.prototype.rejectBatch = function (batchId) {
        var _this = this;
        return this.persistence.runTransaction('Reject batch', 'readwrite-primary', function (txn) {
            var affectedKeys;
            return _this.mutationQueue
                .lookupMutationBatch(txn, batchId)
                .next(function (batch) {
                hardAssert(batch !== null);
                affectedKeys = batch.keys();
                return _this.mutationQueue.removeMutationBatch(txn, batch);
            })
                .next(function () {
                return _this.mutationQueue.performConsistencyCheck(txn);
            })
                .next(function () {
                return _this.localDocuments.getDocuments(txn, affectedKeys);
            });
        });
    };
    LocalStoreImpl.prototype.getHighestUnacknowledgedBatchId = function () {
        var _this = this;
        return this.persistence.runTransaction('Get highest unacknowledged batch id', 'readonly', function (txn) {
            return _this.mutationQueue.getHighestUnacknowledgedBatchId(txn);
        });
    };
    LocalStoreImpl.prototype.getLastRemoteSnapshotVersion = function () {
        var _this = this;
        return this.persistence.runTransaction('Get last remote snapshot version', 'readonly', function (txn) { return _this.targetCache.getLastRemoteSnapshotVersion(txn); });
    };
    LocalStoreImpl.prototype.applyRemoteEvent = function (remoteEvent) {
        var _this = this;
        var remoteVersion = remoteEvent.snapshotVersion;
        var newTargetDataByTargetMap = this.targetDataByTarget;
        return this.persistence
            .runTransaction('Apply remote event', 'readwrite-primary', function (txn) {
            var documentBuffer = _this.remoteDocuments.newChangeBuffer({
                trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
            });
            // Reset newTargetDataByTargetMap in case this transaction gets re-run.
            newTargetDataByTargetMap = _this.targetDataByTarget;
            var promises = [];
            remoteEvent.targetChanges.forEach(function (change, targetId) {
                var oldTargetData = newTargetDataByTargetMap.get(targetId);
                if (!oldTargetData) {
                    return;
                }
                // Only update the remote keys if the target is still active. This
                // ensures that we can persist the updated target data along with
                // the updated assignment.
                promises.push(_this.targetCache
                    .removeMatchingKeys(txn, change.removedDocuments, targetId)
                    .next(function () {
                    return _this.targetCache.addMatchingKeys(txn, change.addedDocuments, targetId);
                }));
                var resumeToken = change.resumeToken;
                // Update the resume token if the change includes one.
                if (resumeToken.approximateByteSize() > 0) {
                    var newTargetData = oldTargetData
                        .withResumeToken(resumeToken, remoteVersion)
                        .withSequenceNumber(txn.currentSequenceNumber);
                    newTargetDataByTargetMap = newTargetDataByTargetMap.insert(targetId, newTargetData);
                    // Update the target data if there are target changes (or if
                    // sufficient time has passed since the last update).
                    if (LocalStoreImpl.shouldPersistTargetData(oldTargetData, newTargetData, change)) {
                        promises.push(_this.targetCache.updateTargetData(txn, newTargetData));
                    }
                }
            });
            var changedDocs = maybeDocumentMap();
            var updatedKeys = documentKeySet();
            remoteEvent.documentUpdates.forEach(function (key, doc) {
                updatedKeys = updatedKeys.add(key);
            });
            // Each loop iteration only affects its "own" doc, so it's safe to get all the remote
            // documents in advance in a single call.
            promises.push(documentBuffer.getEntries(txn, updatedKeys).next(function (existingDocs) {
                remoteEvent.documentUpdates.forEach(function (key, doc) {
                    var existingDoc = existingDocs.get(key);
                    // Note: The order of the steps below is important, since we want
                    // to ensure that rejected limbo resolutions (which fabricate
                    // NoDocuments with SnapshotVersion.min()) never add documents to
                    // cache.
                    if (doc instanceof NoDocument &&
                        doc.version.isEqual(SnapshotVersion.min())) {
                        // NoDocuments with SnapshotVersion.min() are used in manufactured
                        // events. We remove these documents from cache since we lost
                        // access.
                        documentBuffer.removeEntry(key, remoteVersion);
                        changedDocs = changedDocs.insert(key, doc);
                    }
                    else if (existingDoc == null ||
                        doc.version.compareTo(existingDoc.version) > 0 ||
                        (doc.version.compareTo(existingDoc.version) === 0 &&
                            existingDoc.hasPendingWrites)) {
                        documentBuffer.addEntry(doc, remoteVersion);
                        changedDocs = changedDocs.insert(key, doc);
                    }
                    else {
                        logDebug(LOG_TAG$1, 'Ignoring outdated watch update for ', key, '. Current version:', existingDoc.version, ' Watch version:', doc.version);
                    }
                    if (remoteEvent.resolvedLimboDocuments.has(key)) {
                        promises.push(_this.persistence.referenceDelegate.updateLimboDocument(txn, key));
                    }
                });
            }));
            // HACK: The only reason we allow a null snapshot version is so that we
            // can synthesize remote events when we get permission denied errors while
            // trying to resolve the state of a locally cached document that is in
            // limbo.
            if (!remoteVersion.isEqual(SnapshotVersion.min())) {
                var updateRemoteVersion = _this.targetCache
                    .getLastRemoteSnapshotVersion(txn)
                    .next(function (lastRemoteSnapshotVersion) {
                    return _this.targetCache.setTargetsMetadata(txn, txn.currentSequenceNumber, remoteVersion);
                });
                promises.push(updateRemoteVersion);
            }
            return PersistencePromise.waitFor(promises)
                .next(function () { return documentBuffer.apply(txn); })
                .next(function () {
                return _this.localDocuments.getLocalViewOfDocuments(txn, changedDocs);
            });
        })
            .then(function (changedDocs) {
            _this.targetDataByTarget = newTargetDataByTargetMap;
            return changedDocs;
        });
    };
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
    LocalStoreImpl.shouldPersistTargetData = function (oldTargetData, newTargetData, change) {
        hardAssert(newTargetData.resumeToken.approximateByteSize() > 0);
        // Always persist target data if we don't already have a resume token.
        if (oldTargetData.resumeToken.approximateByteSize() === 0) {
            return true;
        }
        // Don't allow resume token changes to be buffered indefinitely. This
        // allows us to be reasonably up-to-date after a crash and avoids needing
        // to loop over all active queries on shutdown. Especially in the browser
        // we may not get time to do anything interesting while the current tab is
        // closing.
        var timeDelta = newTargetData.snapshotVersion.toMicroseconds() -
            oldTargetData.snapshotVersion.toMicroseconds();
        if (timeDelta >= this.RESUME_TOKEN_MAX_AGE_MICROS) {
            return true;
        }
        // Otherwise if the only thing that has changed about a target is its resume
        // token it's not worth persisting. Note that the RemoteStore keeps an
        // in-memory view of the currently active targets which includes the current
        // resume token, so stream failure or user changes will still use an
        // up-to-date resume token regardless of what we do here.
        var changes = change.addedDocuments.size +
            change.modifiedDocuments.size +
            change.removedDocuments.size;
        return changes > 0;
    };
    LocalStoreImpl.prototype.notifyLocalViewChanges = function (viewChanges) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var e_1, _i, viewChanges_1, viewChange, targetId, targetData, lastLimboFreeSnapshotVersion, updatedTargetData;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.persistence.runTransaction('notifyLocalViewChanges', 'readwrite', function (txn) {
                                return PersistencePromise.forEach(viewChanges, function (viewChange) {
                                    return PersistencePromise.forEach(viewChange.addedKeys, function (key) { return _this.persistence.referenceDelegate.addReference(txn, viewChange.targetId, key); }).next(function () { return PersistencePromise.forEach(viewChange.removedKeys, function (key) { return _this.persistence.referenceDelegate.removeReference(txn, viewChange.targetId, key); }); });
                                });
                            })];
                    case 1:
                        _e.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _e.sent();
                        if (isIndexedDbTransactionError(e_1)) {
                            // If `notifyLocalViewChanges` fails, we did not advance the sequence
                            // number for the documents that were included in this transaction.
                            // This might trigger them to be deleted earlier than they otherwise
                            // would have, but it should not invalidate the integrity of the data.
                            logDebug(LOG_TAG$1, 'Failed to update sequence numbers: ' + e_1);
                        }
                        else {
                            throw e_1;
                        }
                        return [3 /*break*/, 3];
                    case 3:
                        for (_i = 0, viewChanges_1 = viewChanges; _i < viewChanges_1.length; _i++) {
                            viewChange = viewChanges_1[_i];
                            targetId = viewChange.targetId;
                            if (!viewChange.fromCache) {
                                targetData = this.targetDataByTarget.get(targetId);
                                lastLimboFreeSnapshotVersion = targetData.snapshotVersion;
                                updatedTargetData = targetData.withLastLimboFreeSnapshotVersion(lastLimboFreeSnapshotVersion);
                                this.targetDataByTarget = this.targetDataByTarget.insert(targetId, updatedTargetData);
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    LocalStoreImpl.prototype.nextMutationBatch = function (afterBatchId) {
        var _this = this;
        return this.persistence.runTransaction('Get next mutation batch', 'readonly', function (txn) {
            if (afterBatchId === undefined) {
                afterBatchId = BATCHID_UNKNOWN;
            }
            return _this.mutationQueue.getNextMutationBatchAfterBatchId(txn, afterBatchId);
        });
    };
    LocalStoreImpl.prototype.readDocument = function (key) {
        var _this = this;
        return this.persistence.runTransaction('read document', 'readonly', function (txn) {
            return _this.localDocuments.getDocument(txn, key);
        });
    };
    LocalStoreImpl.prototype.allocateTarget = function (target) {
        var _this = this;
        return this.persistence
            .runTransaction('Allocate target', 'readwrite', function (txn) {
            var targetData;
            return _this.targetCache
                .getTargetData(txn, target)
                .next(function (cached) {
                if (cached) {
                    // This target has been listened to previously, so reuse the
                    // previous targetID.
                    // TODO(mcg): freshen last accessed date?
                    targetData = cached;
                    return PersistencePromise.resolve(targetData);
                }
                else {
                    return _this.targetCache.allocateTargetId(txn).next(function (targetId) {
                        targetData = new TargetData(target, targetId, 0 /* Listen */, txn.currentSequenceNumber);
                        return _this.targetCache
                            .addTargetData(txn, targetData)
                            .next(function () { return targetData; });
                    });
                }
            });
        })
            .then(function (targetData) {
            // If Multi-Tab is enabled, the existing target data may be newer than
            // the in-memory data
            var cachedTargetData = _this.targetDataByTarget.get(targetData.targetId);
            if (cachedTargetData === null ||
                targetData.snapshotVersion.compareTo(cachedTargetData.snapshotVersion) > 0) {
                _this.targetDataByTarget = _this.targetDataByTarget.insert(targetData.targetId, targetData);
                _this.targetIdByTarget.set(target, targetData.targetId);
            }
            return targetData;
        });
    };
    LocalStoreImpl.prototype.getTargetData = function (transaction, target) {
        var targetId = this.targetIdByTarget.get(target);
        if (targetId !== undefined) {
            return PersistencePromise.resolve(this.targetDataByTarget.get(targetId));
        }
        else {
            return this.targetCache.getTargetData(transaction, target);
        }
    };
    LocalStoreImpl.prototype.releaseTarget = function (targetId, keepPersistedTargetData) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var targetData, mode, e_2;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        targetData = this.targetDataByTarget.get(targetId);
                        mode = keepPersistedTargetData ? 'readwrite' : 'readwrite-primary';
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 4, , 5]);
                        if (!!keepPersistedTargetData) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.persistence.runTransaction('Release target', mode, function (txn) {
                                return _this.persistence.referenceDelegate.removeTarget(txn, targetData);
                            })];
                    case 2:
                        _e.sent();
                        _e.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        e_2 = _e.sent();
                        if (isIndexedDbTransactionError(e_2)) {
                            // All `releaseTarget` does is record the final metadata state for the
                            // target, but we've been recording this periodically during target
                            // activity. If we lose this write this could cause a very slight
                            // difference in the order of target deletion during GC, but we
                            // don't define exact LRU semantics so this is acceptable.
                            logDebug(LOG_TAG$1, "Failed to update sequence numbers for target " + targetId + ": " + e_2);
                        }
                        else {
                            throw e_2;
                        }
                        return [3 /*break*/, 5];
                    case 5:
                        this.targetDataByTarget = this.targetDataByTarget.remove(targetId);
                        this.targetIdByTarget.delete(targetData.target);
                        return [2 /*return*/];
                }
            });
        });
    };
    LocalStoreImpl.prototype.executeQuery = function (query, usePreviousResults) {
        var _this = this;
        var lastLimboFreeSnapshotVersion = SnapshotVersion.min();
        var remoteKeys = documentKeySet();
        return this.persistence.runTransaction('Execute query', 'readonly', function (txn) {
            return _this.getTargetData(txn, queryToTarget(query))
                .next(function (targetData) {
                if (targetData) {
                    lastLimboFreeSnapshotVersion =
                        targetData.lastLimboFreeSnapshotVersion;
                    return _this.targetCache
                        .getMatchingKeysForTargetId(txn, targetData.targetId)
                        .next(function (result) {
                        remoteKeys = result;
                    });
                }
            })
                .next(function () { return _this.queryEngine.getDocumentsMatchingQuery(txn, query, usePreviousResults
                ? lastLimboFreeSnapshotVersion
                : SnapshotVersion.min(), usePreviousResults ? remoteKeys : documentKeySet()); })
                .next(function (documents) {
                return { documents: documents, remoteKeys: remoteKeys };
            });
        });
    };
    LocalStoreImpl.prototype.applyWriteToRemoteDocuments = function (txn, batchResult, documentBuffer) {
        var _this = this;
        var batch = batchResult.batch;
        var docKeys = batch.keys();
        var promiseChain = PersistencePromise.resolve();
        docKeys.forEach(function (docKey) {
            promiseChain = promiseChain
                .next(function () {
                return documentBuffer.getEntry(txn, docKey);
            })
                .next(function (remoteDoc) {
                var doc = remoteDoc;
                var ackVersion = batchResult.docVersions.get(docKey);
                hardAssert(ackVersion !== null);
                if (!doc || doc.version.compareTo(ackVersion) < 0) {
                    doc = batch.applyToRemoteDocument(docKey, doc, batchResult);
                    if (!doc)
                        ;
                    else {
                        // We use the commitVersion as the readTime rather than the
                        // document's updateTime since the updateTime is not advanced
                        // for updates that do not modify the underlying document.
                        documentBuffer.addEntry(doc, batchResult.commitVersion);
                    }
                }
            });
        });
        return promiseChain.next(function () { return _this.mutationQueue.removeMutationBatch(txn, batch); });
    };
    LocalStoreImpl.prototype.collectGarbage = function (garbageCollector) {
        var _this = this;
        return this.persistence.runTransaction('Collect garbage', 'readwrite-primary', function (txn) { return garbageCollector.collect(txn, _this.targetDataByTarget); });
    };
    return LocalStoreImpl;
}());
/**
 * The maximum time to leave a resume token buffered without writing it out.
 * This value is arbitrary: it's long enough to avoid several writes
 * (possibly indefinitely if updates come more frequently than this) but
 * short enough that restarting after crashing will still have a pretty
 * recent resume token.
 */
LocalStoreImpl.RESUME_TOKEN_MAX_AGE_MICROS = 5 * 60 * 1e6;
function newLocalStore(
/** Manages our in-memory or durable persistence. */
persistence, queryEngine, initialUser) {
    return new LocalStoreImpl(persistence, queryEngine, initialUser);
}
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
function ignoreIfPrimaryLeaseLoss(err) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        return tslib.__generator(this, function (_e) {
            if (err.code === Code.FAILED_PRECONDITION &&
                err.message === PRIMARY_LEASE_LOST_ERROR_MSG) {
                logDebug(LOG_TAG$1, 'Unexpectedly lost primary lease');
            }
            else {
                throw err;
            }
            return [2 /*return*/];
        });
    });
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
 */
var LocalViewChanges = /** @class */ (function () {
    function LocalViewChanges(targetId, fromCache, addedKeys, removedKeys) {
        this.targetId = targetId;
        this.fromCache = fromCache;
        this.addedKeys = addedKeys;
        this.removedKeys = removedKeys;
    }
    LocalViewChanges.fromSnapshot = function (targetId, viewSnapshot) {
        var addedKeys = documentKeySet();
        var removedKeys = documentKeySet();
        for (var _i = 0, _e = viewSnapshot.docChanges; _i < _e.length; _i++) {
            var docChange = _e[_i];
            switch (docChange.type) {
                case 0 /* Added */:
                    addedKeys = addedKeys.add(docChange.doc.key);
                    break;
                case 1 /* Removed */:
                    removedKeys = removedKeys.add(docChange.doc.key);
                    break;
                // do nothing
            }
        }
        return new LocalViewChanges(targetId, viewSnapshot.fromCache, addedKeys, removedKeys);
    };
    return LocalViewChanges;
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
 */
var ReferenceSet = /** @class */ (function () {
    function ReferenceSet() {
        // A set of outstanding references to a document sorted by key.
        this.refsByKey = new SortedSet(DocReference.compareByKey);
        // A set of outstanding references to a document sorted by target id.
        this.refsByTarget = new SortedSet(DocReference.compareByTargetId);
    }
    /** Returns true if the reference set contains no references. */
    ReferenceSet.prototype.isEmpty = function () {
        return this.refsByKey.isEmpty();
    };
    /** Adds a reference to the given document key for the given ID. */
    ReferenceSet.prototype.addReference = function (key, id) {
        var ref = new DocReference(key, id);
        this.refsByKey = this.refsByKey.add(ref);
        this.refsByTarget = this.refsByTarget.add(ref);
    };
    /** Add references to the given document keys for the given ID. */
    ReferenceSet.prototype.addReferences = function (keys, id) {
        var _this = this;
        keys.forEach(function (key) { return _this.addReference(key, id); });
    };
    /**
     * Removes a reference to the given document key for the given
     * ID.
     */
    ReferenceSet.prototype.removeReference = function (key, id) {
        this.removeRef(new DocReference(key, id));
    };
    ReferenceSet.prototype.removeReferences = function (keys, id) {
        var _this = this;
        keys.forEach(function (key) { return _this.removeReference(key, id); });
    };
    /**
     * Clears all references with a given ID. Calls removeRef() for each key
     * removed.
     */
    ReferenceSet.prototype.removeReferencesForId = function (id) {
        var _this = this;
        var emptyKey = new DocumentKey(new ResourcePath([]));
        var startRef = new DocReference(emptyKey, id);
        var endRef = new DocReference(emptyKey, id + 1);
        var keys = [];
        this.refsByTarget.forEachInRange([startRef, endRef], function (ref) {
            _this.removeRef(ref);
            keys.push(ref.key);
        });
        return keys;
    };
    ReferenceSet.prototype.removeAllReferences = function () {
        var _this = this;
        this.refsByKey.forEach(function (ref) { return _this.removeRef(ref); });
    };
    ReferenceSet.prototype.removeRef = function (ref) {
        this.refsByKey = this.refsByKey.delete(ref);
        this.refsByTarget = this.refsByTarget.delete(ref);
    };
    ReferenceSet.prototype.referencesForId = function (id) {
        var emptyKey = new DocumentKey(new ResourcePath([]));
        var startRef = new DocReference(emptyKey, id);
        var endRef = new DocReference(emptyKey, id + 1);
        var keys = documentKeySet();
        this.refsByTarget.forEachInRange([startRef, endRef], function (ref) {
            keys = keys.add(ref.key);
        });
        return keys;
    };
    ReferenceSet.prototype.containsKey = function (key) {
        var ref = new DocReference(key, 0);
        var firstRef = this.refsByKey.firstAfterOrEqual(ref);
        return firstRef !== null && key.isEqual(firstRef.key);
    };
    return ReferenceSet;
}());
var DocReference = /** @class */ (function () {
    function DocReference(key, targetOrBatchId) {
        this.key = key;
        this.targetOrBatchId = targetOrBatchId;
    }
    /** Compare by key then by ID */
    DocReference.compareByKey = function (left, right) {
        return (DocumentKey.comparator(left.key, right.key) ||
            primitiveComparator(left.targetOrBatchId, right.targetOrBatchId));
    };
    /** Compare by ID then by key */
    DocReference.compareByTargetId = function (left, right) {
        return (primitiveComparator(left.targetOrBatchId, right.targetOrBatchId) ||
            DocumentKey.comparator(left.key, right.key));
    };
    return DocReference;
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
 * DocumentSet is an immutable (copy-on-write) collection that holds documents
 * in order specified by the provided comparator. We always add a document key
 * comparator on top of what is provided to guarantee document equality based on
 * the key.
 */
var DocumentSet = /** @class */ (function () {
    /** The default ordering is by key if the comparator is omitted */
    function DocumentSet(comp) {
        // We are adding document key comparator to the end as it's the only
        // guaranteed unique property of a document.
        if (comp) {
            this.comparator = function (d1, d2) { return comp(d1, d2) || DocumentKey.comparator(d1.key, d2.key); };
        }
        else {
            this.comparator = function (d1, d2) { return DocumentKey.comparator(d1.key, d2.key); };
        }
        this.keyedMap = documentMap();
        this.sortedSet = new SortedMap(this.comparator);
    }
    /**
     * Returns an empty copy of the existing DocumentSet, using the same
     * comparator.
     */
    DocumentSet.emptySet = function (oldSet) {
        return new DocumentSet(oldSet.comparator);
    };
    DocumentSet.prototype.has = function (key) {
        return this.keyedMap.get(key) != null;
    };
    DocumentSet.prototype.get = function (key) {
        return this.keyedMap.get(key);
    };
    DocumentSet.prototype.first = function () {
        return this.sortedSet.minKey();
    };
    DocumentSet.prototype.last = function () {
        return this.sortedSet.maxKey();
    };
    DocumentSet.prototype.isEmpty = function () {
        return this.sortedSet.isEmpty();
    };
    /**
     * Returns the index of the provided key in the document set, or -1 if the
     * document key is not present in the set;
     */
    DocumentSet.prototype.indexOf = function (key) {
        var doc = this.keyedMap.get(key);
        return doc ? this.sortedSet.indexOf(doc) : -1;
    };
    Object.defineProperty(DocumentSet.prototype, "size", {
        get: function () {
            return this.sortedSet.size;
        },
        enumerable: false,
        configurable: true
    });
    /** Iterates documents in order defined by "comparator" */
    DocumentSet.prototype.forEach = function (cb) {
        this.sortedSet.inorderTraversal(function (k, v) {
            cb(k);
            return false;
        });
    };
    /** Inserts or updates a document with the same key */
    DocumentSet.prototype.add = function (doc) {
        // First remove the element if we have it.
        var set = this.delete(doc.key);
        return set.copy(set.keyedMap.insert(doc.key, doc), set.sortedSet.insert(doc, null));
    };
    /** Deletes a document with a given key */
    DocumentSet.prototype.delete = function (key) {
        var doc = this.get(key);
        if (!doc) {
            return this;
        }
        return this.copy(this.keyedMap.remove(key), this.sortedSet.remove(doc));
    };
    DocumentSet.prototype.isEqual = function (other) {
        if (!(other instanceof DocumentSet)) {
            return false;
        }
        if (this.size !== other.size) {
            return false;
        }
        var thisIt = this.sortedSet.getIterator();
        var otherIt = other.sortedSet.getIterator();
        while (thisIt.hasNext()) {
            var thisDoc = thisIt.getNext().key;
            var otherDoc = otherIt.getNext().key;
            if (!thisDoc.isEqual(otherDoc)) {
                return false;
            }
        }
        return true;
    };
    DocumentSet.prototype.toString = function () {
        var docStrings = [];
        this.forEach(function (doc) {
            docStrings.push(doc.toString());
        });
        if (docStrings.length === 0) {
            return 'DocumentSet ()';
        }
        else {
            return 'DocumentSet (\n  ' + docStrings.join('  \n') + '\n)';
        }
    };
    DocumentSet.prototype.copy = function (keyedMap, sortedSet) {
        var newSet = new DocumentSet();
        newSet.comparator = this.comparator;
        newSet.keyedMap = keyedMap;
        newSet.sortedSet = sortedSet;
        return newSet;
    };
    return DocumentSet;
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
 * DocumentChangeSet keeps track of a set of changes to docs in a query, merging
 * duplicate events for the same doc.
 */
var DocumentChangeSet = /** @class */ (function () {
    function DocumentChangeSet() {
        this.changeMap = new SortedMap(DocumentKey.comparator);
    }
    DocumentChangeSet.prototype.track = function (change) {
        var key = change.doc.key;
        var oldChange = this.changeMap.get(key);
        if (!oldChange) {
            this.changeMap = this.changeMap.insert(key, change);
            return;
        }
        // Merge the new change with the existing change.
        if (change.type !== 0 /* Added */ &&
            oldChange.type === 3 /* Metadata */) {
            this.changeMap = this.changeMap.insert(key, change);
        }
        else if (change.type === 3 /* Metadata */ &&
            oldChange.type !== 1 /* Removed */) {
            this.changeMap = this.changeMap.insert(key, {
                type: oldChange.type,
                doc: change.doc
            });
        }
        else if (change.type === 2 /* Modified */ &&
            oldChange.type === 2 /* Modified */) {
            this.changeMap = this.changeMap.insert(key, {
                type: 2 /* Modified */,
                doc: change.doc
            });
        }
        else if (change.type === 2 /* Modified */ &&
            oldChange.type === 0 /* Added */) {
            this.changeMap = this.changeMap.insert(key, {
                type: 0 /* Added */,
                doc: change.doc
            });
        }
        else if (change.type === 1 /* Removed */ &&
            oldChange.type === 0 /* Added */) {
            this.changeMap = this.changeMap.remove(key);
        }
        else if (change.type === 1 /* Removed */ &&
            oldChange.type === 2 /* Modified */) {
            this.changeMap = this.changeMap.insert(key, {
                type: 1 /* Removed */,
                doc: oldChange.doc
            });
        }
        else if (change.type === 0 /* Added */ &&
            oldChange.type === 1 /* Removed */) {
            this.changeMap = this.changeMap.insert(key, {
                type: 2 /* Modified */,
                doc: change.doc
            });
        }
        else {
            // This includes these cases, which don't make sense:
            // Added->Added
            // Removed->Removed
            // Modified->Added
            // Removed->Modified
            // Metadata->Added
            // Removed->Metadata
            fail();
        }
    };
    DocumentChangeSet.prototype.getChanges = function () {
        var changes = [];
        this.changeMap.inorderTraversal(function (key, change) {
            changes.push(change);
        });
        return changes;
    };
    return DocumentChangeSet;
}());
var ViewSnapshot = /** @class */ (function () {
    function ViewSnapshot(query, docs, oldDocs, docChanges, mutatedKeys, fromCache, syncStateChanged, excludesMetadataChanges) {
        this.query = query;
        this.docs = docs;
        this.oldDocs = oldDocs;
        this.docChanges = docChanges;
        this.mutatedKeys = mutatedKeys;
        this.fromCache = fromCache;
        this.syncStateChanged = syncStateChanged;
        this.excludesMetadataChanges = excludesMetadataChanges;
    }
    /** Returns a view snapshot as if all documents in the snapshot were added. */
    ViewSnapshot.fromInitialDocuments = function (query, documents, mutatedKeys, fromCache) {
        var changes = [];
        documents.forEach(function (doc) {
            changes.push({ type: 0 /* Added */, doc: doc });
        });
        return new ViewSnapshot(query, documents, DocumentSet.emptySet(documents), changes, mutatedKeys, fromCache, 
        /* syncStateChanged= */ true, 
        /* excludesMetadataChanges= */ false);
    };
    Object.defineProperty(ViewSnapshot.prototype, "hasPendingWrites", {
        get: function () {
            return !this.mutatedKeys.isEmpty();
        },
        enumerable: false,
        configurable: true
    });
    ViewSnapshot.prototype.isEqual = function (other) {
        if (this.fromCache !== other.fromCache ||
            this.syncStateChanged !== other.syncStateChanged ||
            !this.mutatedKeys.isEqual(other.mutatedKeys) ||
            !queryEquals(this.query, other.query) ||
            !this.docs.isEqual(other.docs) ||
            !this.oldDocs.isEqual(other.oldDocs)) {
            return false;
        }
        var changes = this.docChanges;
        var otherChanges = other.docChanges;
        if (changes.length !== otherChanges.length) {
            return false;
        }
        for (var i = 0; i < changes.length; i++) {
            if (changes[i].type !== otherChanges[i].type ||
                !changes[i].doc.isEqual(otherChanges[i].doc)) {
                return false;
            }
        }
        return true;
    };
    return ViewSnapshot;
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
var AddedLimboDocument = /** @class */ (function () {
    function AddedLimboDocument(key) {
        this.key = key;
    }
    return AddedLimboDocument;
}());
var RemovedLimboDocument = /** @class */ (function () {
    function RemovedLimboDocument(key) {
        this.key = key;
    }
    return RemovedLimboDocument;
}());
/**
 * View is responsible for computing the final merged truth of what docs are in
 * a query. It gets notified of local and remote changes to docs, and applies
 * the query filters and limits to determine the most correct possible results.
 */
var View = /** @class */ (function () {
    function View(query, 
    /** Documents included in the remote target */
    _syncedDocuments) {
        this.query = query;
        this._syncedDocuments = _syncedDocuments;
        this.syncState = null;
        /**
         * A flag whether the view is current with the backend. A view is considered
         * current after it has seen the current flag from the backend and did not
         * lose consistency within the watch stream (e.g. because of an existence
         * filter mismatch).
         */
        this.current = false;
        /** Documents in the view but not in the remote target */
        this.limboDocuments = documentKeySet();
        /** Document Keys that have local changes */
        this.mutatedKeys = documentKeySet();
        this.docComparator = newQueryComparator(query);
        this.documentSet = new DocumentSet(this.docComparator);
    }
    Object.defineProperty(View.prototype, "syncedDocuments", {
        /**
         * The set of remote documents that the server has told us belongs to the target associated with
         * this view.
         */
        get: function () {
            return this._syncedDocuments;
        },
        enumerable: false,
        configurable: true
    });
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
    View.prototype.computeDocChanges = function (docChanges, previousChanges) {
        var _this = this;
        var changeSet = previousChanges
            ? previousChanges.changeSet
            : new DocumentChangeSet();
        var oldDocumentSet = previousChanges
            ? previousChanges.documentSet
            : this.documentSet;
        var newMutatedKeys = previousChanges
            ? previousChanges.mutatedKeys
            : this.mutatedKeys;
        var newDocumentSet = oldDocumentSet;
        var needsRefill = false;
        // Track the last doc in a (full) limit. This is necessary, because some
        // update (a delete, or an update moving a doc past the old limit) might
        // mean there is some other document in the local cache that either should
        // come (1) between the old last limit doc and the new last document, in the
        // case of updates, or (2) after the new last document, in the case of
        // deletes. So we keep this doc at the old limit to compare the updates to.
        //
        // Note that this should never get used in a refill (when previousChanges is
        // set), because there will only be adds -- no deletes or updates.
        var lastDocInLimit = this.query.hasLimitToFirst() && oldDocumentSet.size === this.query.limit
            ? oldDocumentSet.last()
            : null;
        var firstDocInLimit = this.query.hasLimitToLast() && oldDocumentSet.size === this.query.limit
            ? oldDocumentSet.first()
            : null;
        docChanges.inorderTraversal(function (key, newMaybeDoc) {
            var oldDoc = oldDocumentSet.get(key);
            var newDoc = newMaybeDoc instanceof Document ? newMaybeDoc : null;
            if (newDoc) {
                newDoc = queryMatches(_this.query, newDoc) ? newDoc : null;
            }
            var oldDocHadPendingMutations = oldDoc
                ? _this.mutatedKeys.has(oldDoc.key)
                : false;
            var newDocHasPendingMutations = newDoc
                ? newDoc.hasLocalMutations ||
                    // We only consider committed mutations for documents that were
                    // mutated during the lifetime of the view.
                    (_this.mutatedKeys.has(newDoc.key) && newDoc.hasCommittedMutations)
                : false;
            var changeApplied = false;
            // Calculate change
            if (oldDoc && newDoc) {
                var docsEqual = oldDoc.data().isEqual(newDoc.data());
                if (!docsEqual) {
                    if (!_this.shouldWaitForSyncedDocument(oldDoc, newDoc)) {
                        changeSet.track({
                            type: 2 /* Modified */,
                            doc: newDoc
                        });
                        changeApplied = true;
                        if ((lastDocInLimit &&
                            _this.docComparator(newDoc, lastDocInLimit) > 0) ||
                            (firstDocInLimit &&
                                _this.docComparator(newDoc, firstDocInLimit) < 0)) {
                            // This doc moved from inside the limit to outside the limit.
                            // That means there may be some other doc in the local cache
                            // that should be included instead.
                            needsRefill = true;
                        }
                    }
                }
                else if (oldDocHadPendingMutations !== newDocHasPendingMutations) {
                    changeSet.track({ type: 3 /* Metadata */, doc: newDoc });
                    changeApplied = true;
                }
            }
            else if (!oldDoc && newDoc) {
                changeSet.track({ type: 0 /* Added */, doc: newDoc });
                changeApplied = true;
            }
            else if (oldDoc && !newDoc) {
                changeSet.track({ type: 1 /* Removed */, doc: oldDoc });
                changeApplied = true;
                if (lastDocInLimit || firstDocInLimit) {
                    // A doc was removed from a full limit query. We'll need to
                    // requery from the local cache to see if we know about some other
                    // doc that should be in the results.
                    needsRefill = true;
                }
            }
            if (changeApplied) {
                if (newDoc) {
                    newDocumentSet = newDocumentSet.add(newDoc);
                    if (newDocHasPendingMutations) {
                        newMutatedKeys = newMutatedKeys.add(key);
                    }
                    else {
                        newMutatedKeys = newMutatedKeys.delete(key);
                    }
                }
                else {
                    newDocumentSet = newDocumentSet.delete(key);
                    newMutatedKeys = newMutatedKeys.delete(key);
                }
            }
        });
        // Drop documents out to meet limit/limitToLast requirement.
        if (this.query.hasLimitToFirst() || this.query.hasLimitToLast()) {
            while (newDocumentSet.size > this.query.limit) {
                var oldDoc = this.query.hasLimitToFirst()
                    ? newDocumentSet.last()
                    : newDocumentSet.first();
                newDocumentSet = newDocumentSet.delete(oldDoc.key);
                newMutatedKeys = newMutatedKeys.delete(oldDoc.key);
                changeSet.track({ type: 1 /* Removed */, doc: oldDoc });
            }
        }
        return {
            documentSet: newDocumentSet,
            changeSet: changeSet,
            needsRefill: needsRefill,
            mutatedKeys: newMutatedKeys
        };
    };
    View.prototype.shouldWaitForSyncedDocument = function (oldDoc, newDoc) {
        // We suppress the initial change event for documents that were modified as
        // part of a write acknowledgment (e.g. when the value of a server transform
        // is applied) as Watch will send us the same document again.
        // By suppressing the event, we only raise two user visible events (one with
        // `hasPendingWrites` and the final state of the document) instead of three
        // (one with `hasPendingWrites`, the modified document with
        // `hasPendingWrites` and the final state of the document).
        return (oldDoc.hasLocalMutations &&
            newDoc.hasCommittedMutations &&
            !newDoc.hasLocalMutations);
    };
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
    View.prototype.applyChanges = function (docChanges, updateLimboDocuments, targetChange) {
        var _this = this;
        var oldDocs = this.documentSet;
        this.documentSet = docChanges.documentSet;
        this.mutatedKeys = docChanges.mutatedKeys;
        // Sort changes based on type and query comparator
        var changes = docChanges.changeSet.getChanges();
        changes.sort(function (c1, c2) {
            return (compareChangeType(c1.type, c2.type) ||
                _this.docComparator(c1.doc, c2.doc));
        });
        this.applyTargetChange(targetChange);
        var limboChanges = updateLimboDocuments
            ? this.updateLimboDocuments()
            : [];
        var synced = this.limboDocuments.size === 0 && this.current;
        var newSyncState = synced ? 1 /* Synced */ : 0 /* Local */;
        var syncStateChanged = newSyncState !== this.syncState;
        this.syncState = newSyncState;
        if (changes.length === 0 && !syncStateChanged) {
            // no changes
            return { limboChanges: limboChanges };
        }
        else {
            var snap = new ViewSnapshot(this.query, docChanges.documentSet, oldDocs, changes, docChanges.mutatedKeys, newSyncState === 0 /* Local */, syncStateChanged, 
            /* excludesMetadataChanges= */ false);
            return {
                snapshot: snap,
                limboChanges: limboChanges
            };
        }
    };
    /**
     * Applies an OnlineState change to the view, potentially generating a
     * ViewChange if the view's syncState changes as a result.
     */
    View.prototype.applyOnlineStateChange = function (onlineState) {
        if (this.current && onlineState === "Offline" /* Offline */) {
            // If we're offline, set `current` to false and then call applyChanges()
            // to refresh our syncState and generate a ViewChange as appropriate. We
            // are guaranteed to get a new TargetChange that sets `current` back to
            // true once the client is back online.
            this.current = false;
            return this.applyChanges({
                documentSet: this.documentSet,
                changeSet: new DocumentChangeSet(),
                mutatedKeys: this.mutatedKeys,
                needsRefill: false
            }, 
            /* updateLimboDocuments= */ false);
        }
        else {
            // No effect, just return a no-op ViewChange.
            return { limboChanges: [] };
        }
    };
    /**
     * Returns whether the doc for the given key should be in limbo.
     */
    View.prototype.shouldBeInLimbo = function (key) {
        // If the remote end says it's part of this query, it's not in limbo.
        if (this._syncedDocuments.has(key)) {
            return false;
        }
        // The local store doesn't think it's a result, so it shouldn't be in limbo.
        if (!this.documentSet.has(key)) {
            return false;
        }
        // If there are local changes to the doc, they might explain why the server
        // doesn't know that it's part of the query. So don't put it in limbo.
        // TODO(klimt): Ideally, we would only consider changes that might actually
        // affect this specific query.
        if (this.documentSet.get(key).hasLocalMutations) {
            return false;
        }
        // Everything else is in limbo.
        return true;
    };
    /**
     * Updates syncedDocuments, current, and limbo docs based on the given change.
     * Returns the list of changes to which docs are in limbo.
     */
    View.prototype.applyTargetChange = function (targetChange) {
        var _this = this;
        if (targetChange) {
            targetChange.addedDocuments.forEach(function (key) { return (_this._syncedDocuments = _this._syncedDocuments.add(key)); });
            targetChange.modifiedDocuments.forEach(function (key) {
            });
            targetChange.removedDocuments.forEach(function (key) { return (_this._syncedDocuments = _this._syncedDocuments.delete(key)); });
            this.current = targetChange.current;
        }
    };
    View.prototype.updateLimboDocuments = function () {
        var _this = this;
        // We can only determine limbo documents when we're in-sync with the server.
        if (!this.current) {
            return [];
        }
        // TODO(klimt): Do this incrementally so that it's not quadratic when
        // updating many documents.
        var oldLimboDocuments = this.limboDocuments;
        this.limboDocuments = documentKeySet();
        this.documentSet.forEach(function (doc) {
            if (_this.shouldBeInLimbo(doc.key)) {
                _this.limboDocuments = _this.limboDocuments.add(doc.key);
            }
        });
        // Diff the new limbo docs with the old limbo docs.
        var changes = [];
        oldLimboDocuments.forEach(function (key) {
            if (!_this.limboDocuments.has(key)) {
                changes.push(new RemovedLimboDocument(key));
            }
        });
        this.limboDocuments.forEach(function (key) {
            if (!oldLimboDocuments.has(key)) {
                changes.push(new AddedLimboDocument(key));
            }
        });
        return changes;
    };
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
    View.prototype.synchronizeWithPersistedState = function (queryResult) {
        this._syncedDocuments = queryResult.remoteKeys;
        this.limboDocuments = documentKeySet();
        var docChanges = this.computeDocChanges(queryResult.documents);
        return this.applyChanges(docChanges, /*updateLimboDocuments=*/ true);
    };
    /**
     * Returns a view snapshot as if this query was just listened to. Contains
     * a document add for every existing document and the `fromCache` and
     * `hasPendingWrites` status of the already established view.
     */
    // PORTING NOTE: Multi-tab only.
    View.prototype.computeInitialSnapshot = function () {
        return ViewSnapshot.fromInitialDocuments(this.query, this.documentSet, this.mutatedKeys, this.syncState === 0 /* Local */);
    };
    return View;
}());
function compareChangeType(c1, c2) {
    var order = function (change) {
        switch (change) {
            case 0 /* Added */:
                return 1;
            case 2 /* Modified */:
                return 2;
            case 3 /* Metadata */:
                // A metadata change is converted to a modified change at the public
                // api layer.  Since we sort by document key and then change type,
                // metadata and modified changes must be sorted equivalently.
                return 2;
            case 1 /* Removed */:
                return 0;
            default:
                return fail();
        }
    };
    return order(c1) - order(c2);
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
var LOG_TAG$2 = 'ExponentialBackoff';
/**
 * Initial backoff time in milliseconds after an error.
 * Set to 1s according to https://cloud.google.com/apis/design/errors.
 */
var DEFAULT_BACKOFF_INITIAL_DELAY_MS = 1000;
var DEFAULT_BACKOFF_FACTOR = 1.5;
/** Maximum backoff time in milliseconds */
var DEFAULT_BACKOFF_MAX_DELAY_MS = 60 * 1000;
/**
 * A helper for running delayed tasks following an exponential backoff curve
 * between attempts.
 *
 * Each delay is made up of a "base" delay which follows the exponential
 * backoff curve, and a +/- 50% "jitter" that is calculated and added to the
 * base delay. This prevents clients from accidentally synchronizing their
 * delays causing spikes of load to the backend.
 */
var ExponentialBackoff = /** @class */ (function () {
    function ExponentialBackoff(
    /**
     * The AsyncQueue to run backoff operations on.
     */
    queue, 
    /**
     * The ID to use when scheduling backoff operations on the AsyncQueue.
     */
    timerId, 
    /**
     * The initial delay (used as the base delay on the first retry attempt).
     * Note that jitter will still be applied, so the actual delay could be as
     * little as 0.5*initialDelayMs.
     */
    initialDelayMs, 
    /**
     * The multiplier to use to determine the extended base delay after each
     * attempt.
     */
    backoffFactor, 
    /**
     * The maximum base delay after which no further backoff is performed.
     * Note that jitter will still be applied, so the actual delay could be as
     * much as 1.5*maxDelayMs.
     */
    maxDelayMs) {
        if (initialDelayMs === void 0) { initialDelayMs = DEFAULT_BACKOFF_INITIAL_DELAY_MS; }
        if (backoffFactor === void 0) { backoffFactor = DEFAULT_BACKOFF_FACTOR; }
        if (maxDelayMs === void 0) { maxDelayMs = DEFAULT_BACKOFF_MAX_DELAY_MS; }
        this.queue = queue;
        this.timerId = timerId;
        this.initialDelayMs = initialDelayMs;
        this.backoffFactor = backoffFactor;
        this.maxDelayMs = maxDelayMs;
        this.currentBaseMs = 0;
        this.timerPromise = null;
        /** The last backoff attempt, as epoch milliseconds. */
        this.lastAttemptTime = Date.now();
        this.reset();
    }
    /**
     * Resets the backoff delay.
     *
     * The very next backoffAndWait() will have no delay. If it is called again
     * (i.e. due to an error), initialDelayMs (plus jitter) will be used, and
     * subsequent ones will increase according to the backoffFactor.
     */
    ExponentialBackoff.prototype.reset = function () {
        this.currentBaseMs = 0;
    };
    /**
     * Resets the backoff delay to the maximum delay (e.g. for use after a
     * RESOURCE_EXHAUSTED error).
     */
    ExponentialBackoff.prototype.resetToMax = function () {
        this.currentBaseMs = this.maxDelayMs;
    };
    /**
     * Returns a promise that resolves after currentDelayMs, and increases the
     * delay for any subsequent attempts. If there was a pending backoff operation
     * already, it will be canceled.
     */
    ExponentialBackoff.prototype.backoffAndRun = function (op) {
        var _this = this;
        // Cancel any pending backoff operation.
        this.cancel();
        // First schedule using the current base (which may be 0 and should be
        // honored as such).
        var desiredDelayWithJitterMs = Math.floor(this.currentBaseMs + this.jitterDelayMs());
        // Guard against lastAttemptTime being in the future due to a clock change.
        var delaySoFarMs = Math.max(0, Date.now() - this.lastAttemptTime);
        // Guard against the backoff delay already being past.
        var remainingDelayMs = Math.max(0, desiredDelayWithJitterMs - delaySoFarMs);
        if (remainingDelayMs > 0) {
            logDebug(LOG_TAG$2, "Backing off for " + remainingDelayMs + " ms " +
                ("(base delay: " + this.currentBaseMs + " ms, ") +
                ("delay with jitter: " + desiredDelayWithJitterMs + " ms, ") +
                ("last attempt: " + delaySoFarMs + " ms ago)"));
        }
        this.timerPromise = this.queue.enqueueAfterDelay(this.timerId, remainingDelayMs, function () {
            _this.lastAttemptTime = Date.now();
            return op();
        });
        // Apply backoff factor to determine next delay and ensure it is within
        // bounds.
        this.currentBaseMs *= this.backoffFactor;
        if (this.currentBaseMs < this.initialDelayMs) {
            this.currentBaseMs = this.initialDelayMs;
        }
        if (this.currentBaseMs > this.maxDelayMs) {
            this.currentBaseMs = this.maxDelayMs;
        }
    };
    ExponentialBackoff.prototype.skipBackoff = function () {
        if (this.timerPromise !== null) {
            this.timerPromise.skipDelay();
            this.timerPromise = null;
        }
    };
    ExponentialBackoff.prototype.cancel = function () {
        if (this.timerPromise !== null) {
            this.timerPromise.cancel();
            this.timerPromise = null;
        }
    };
    /** Returns a random value in the range [-currentBaseMs/2, currentBaseMs/2] */
    ExponentialBackoff.prototype.jitterDelayMs = function () {
        return (Math.random() - 0.5) * this.currentBaseMs;
    };
    return ExponentialBackoff;
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
var LOG_TAG$3 = 'AsyncQueue';
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
var DelayedOperation = /** @class */ (function () {
    function DelayedOperation(asyncQueue, timerId, targetTimeMs, op, removalCallback) {
        this.asyncQueue = asyncQueue;
        this.timerId = timerId;
        this.targetTimeMs = targetTimeMs;
        this.op = op;
        this.removalCallback = removalCallback;
        this.deferred = new Deferred();
        this.then = this.deferred.promise.then.bind(this.deferred.promise);
        // It's normal for the deferred promise to be canceled (due to cancellation)
        // and so we attach a dummy catch callback to avoid
        // 'UnhandledPromiseRejectionWarning' log spam.
        this.deferred.promise.catch(function (err) { });
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
     */
    DelayedOperation.createAndSchedule = function (asyncQueue, timerId, delayMs, op, removalCallback) {
        var targetTime = Date.now() + delayMs;
        var delayedOp = new DelayedOperation(asyncQueue, timerId, targetTime, op, removalCallback);
        delayedOp.start(delayMs);
        return delayedOp;
    };
    /**
     * Starts the timer. This is called immediately after construction by
     * createAndSchedule().
     */
    DelayedOperation.prototype.start = function (delayMs) {
        var _this = this;
        this.timerHandle = setTimeout(function () { return _this.handleDelayElapsed(); }, delayMs);
    };
    /**
     * Queues the operation to run immediately (if it hasn't already been run or
     * canceled).
     */
    DelayedOperation.prototype.skipDelay = function () {
        return this.handleDelayElapsed();
    };
    /**
     * Cancels the operation if it hasn't already been executed or canceled. The
     * promise will be rejected.
     *
     * As long as the operation has not yet been run, calling cancel() provides a
     * guarantee that the operation will not be run.
     */
    DelayedOperation.prototype.cancel = function (reason) {
        if (this.timerHandle !== null) {
            this.clearTimeout();
            this.deferred.reject(new FirestoreError(Code.CANCELLED, 'Operation cancelled' + (reason ? ': ' + reason : '')));
        }
    };
    DelayedOperation.prototype.handleDelayElapsed = function () {
        var _this = this;
        this.asyncQueue.enqueueAndForget(function () {
            if (_this.timerHandle !== null) {
                _this.clearTimeout();
                return _this.op().then(function (result) {
                    return _this.deferred.resolve(result);
                });
            }
            else {
                return Promise.resolve();
            }
        });
    };
    DelayedOperation.prototype.clearTimeout = function () {
        if (this.timerHandle !== null) {
            this.removalCallback(this);
            clearTimeout(this.timerHandle);
            this.timerHandle = null;
        }
    };
    return DelayedOperation;
}());
var AsyncQueue = /** @class */ (function () {
    function AsyncQueue() {
        var _this = this;
        // The last promise in the queue.
        this.tail = Promise.resolve();
        // A list of retryable operations. Retryable operations are run in order and
        // retried with backoff.
        this.retryableOps = [];
        // Is this AsyncQueue being shut down? Once it is set to true, it will not
        // be changed again.
        this._isShuttingDown = false;
        // Operations scheduled to be queued in the future. Operations are
        // automatically removed after they are run or canceled.
        this.delayedOperations = [];
        // visible for testing
        this.failure = null;
        // Flag set while there's an outstanding AsyncQueue operation, used for
        // assertion sanity-checks.
        this.operationInProgress = false;
        // List of TimerIds to fast-forward delays for.
        this.timerIdsToSkip = [];
        // Backoff timer used to schedule retries for retryable operations
        this.backoff = new ExponentialBackoff(this, "async_queue_retry" /* AsyncQueueRetry */);
        // Visibility handler that triggers an immediate retry of all retryable
        // operations. Meant to speed up recovery when we regain file system access
        // after page comes into foreground.
        this.visibilityHandler = function () {
            _this.backoff.skipBackoff();
        };
    }
    Object.defineProperty(AsyncQueue.prototype, "isShuttingDown", {
        // Is this AsyncQueue being shut down? If true, this instance will not enqueue
        // any new operations, Promises from enqueue requests will not resolve.
        get: function () {
            return this._isShuttingDown;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Adds a new operation to the queue without waiting for it to complete (i.e.
     * we ignore the Promise result).
     */
    AsyncQueue.prototype.enqueueAndForget = function (op) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.enqueue(op);
    };
    /**
     * Regardless if the queue has initialized shutdown, adds a new operation to the
     * queue without waiting for it to complete (i.e. we ignore the Promise result).
     */
    AsyncQueue.prototype.enqueueAndForgetEvenWhileRestricted = function (op) {
        this.verifyNotFailed();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.enqueueInternal(op);
    };
    /**
     * Initialize the shutdown of this queue. Once this method is called, the
     * only possible way to request running an operation is through
     * `enqueueEvenWhileRestricted()`.
     */
    AsyncQueue.prototype.enterRestrictedMode = function () {
        if (!this._isShuttingDown) {
            this._isShuttingDown = true;
        }
    };
    /**
     * Adds a new operation to the queue. Returns a promise that will be resolved
     * when the promise returned by the new operation is (with its value).
     */
    AsyncQueue.prototype.enqueue = function (op) {
        this.verifyNotFailed();
        if (this._isShuttingDown) {
            // Return a Promise which never resolves.
            return new Promise(function (resolve) { });
        }
        return this.enqueueInternal(op);
    };
    /**
     * Enqueue a retryable operation.
     *
     * A retryable operation is rescheduled with backoff if it fails with a
     * IndexedDbTransactionError (the error type used by SimpleDb). All
     * retryable operations are executed in order and only run if all prior
     * operations were retried successfully.
     */
    AsyncQueue.prototype.enqueueRetryable = function (op) {
        var _this = this;
        this.retryableOps.push(op);
        this.enqueueAndForget(function () { return _this.retryNextOp(); });
    };
    /**
     * Runs the next operation from the retryable queue. If the operation fails,
     * reschedules with backoff.
     */
    AsyncQueue.prototype.retryNextOp = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var e_3;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (this.retryableOps.length === 0) {
                            return [2 /*return*/];
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.retryableOps[0]()];
                    case 2:
                        _e.sent();
                        this.retryableOps.shift();
                        this.backoff.reset();
                        return [3 /*break*/, 4];
                    case 3:
                        e_3 = _e.sent();
                        if (isIndexedDbTransactionError(e_3)) {
                            logDebug(LOG_TAG$3, 'Operation failed with retryable error: ' + e_3);
                        }
                        else {
                            throw e_3; // Failure will be handled by AsyncQueue
                        }
                        return [3 /*break*/, 4];
                    case 4:
                        if (this.retryableOps.length > 0) {
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
                            this.backoff.backoffAndRun(function () { return _this.retryNextOp(); });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    AsyncQueue.prototype.enqueueInternal = function (op) {
        var _this = this;
        var newTail = this.tail.then(function () {
            _this.operationInProgress = true;
            return op()
                .catch(function (error) {
                _this.failure = error;
                _this.operationInProgress = false;
                var message = getMessageOrStack(error);
                logError('INTERNAL UNHANDLED ERROR: ', message);
                // Re-throw the error so that this.tail becomes a rejected Promise and
                // all further attempts to chain (via .then) will just short-circuit
                // and return the rejected Promise.
                throw error;
            })
                .then(function (result) {
                _this.operationInProgress = false;
                return result;
            });
        });
        this.tail = newTail;
        return newTail;
    };
    /**
     * Schedules an operation to be queued on the AsyncQueue once the specified
     * `delayMs` has elapsed. The returned DelayedOperation can be used to cancel
     * or fast-forward the operation prior to its running.
     */
    AsyncQueue.prototype.enqueueAfterDelay = function (timerId, delayMs, op) {
        var _this = this;
        this.verifyNotFailed();
        // Fast-forward delays for timerIds that have been overriden.
        if (this.timerIdsToSkip.indexOf(timerId) > -1) {
            delayMs = 0;
        }
        var delayedOp = DelayedOperation.createAndSchedule(this, timerId, delayMs, op, function (removedOp) { return _this.removeDelayedOperation(removedOp); });
        this.delayedOperations.push(delayedOp);
        return delayedOp;
    };
    AsyncQueue.prototype.verifyNotFailed = function () {
        if (this.failure) {
            fail();
        }
    };
    /**
     * Verifies there's an operation currently in-progress on the AsyncQueue.
     * Unfortunately we can't verify that the running code is in the promise chain
     * of that operation, so this isn't a foolproof check, but it should be enough
     * to catch some bugs.
     */
    AsyncQueue.prototype.verifyOperationInProgress = function () {
    };
    /**
     * Waits until all currently queued tasks are finished executing. Delayed
     * operations are not run.
     */
    AsyncQueue.prototype.drain = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var currentTail;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        currentTail = this.tail;
                        return [4 /*yield*/, currentTail];
                    case 1:
                        _e.sent();
                        _e.label = 2;
                    case 2:
                        if (currentTail !== this.tail) return [3 /*break*/, 0];
                        _e.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * For Tests: Determine if a delayed operation with a particular TimerId
     * exists.
     */
    AsyncQueue.prototype.containsDelayedOperation = function (timerId) {
        for (var _i = 0, _e = this.delayedOperations; _i < _e.length; _i++) {
            var op = _e[_i];
            if (op.timerId === timerId) {
                return true;
            }
        }
        return false;
    };
    /**
     * For Tests: Runs some or all delayed operations early.
     *
     * @param lastTimerId Delayed operations up to and including this TimerId will
     *  be drained. Pass TimerId.All to run all delayed operations.
     * @returns a Promise that resolves once all operations have been run.
     */
    AsyncQueue.prototype.runAllDelayedOperationsUntil = function (lastTimerId) {
        var _this = this;
        // Note that draining may generate more delayed ops, so we do that first.
        return this.drain().then(function () {
            // Run ops in the same order they'd run if they ran naturally.
            _this.delayedOperations.sort(function (a, b) { return a.targetTimeMs - b.targetTimeMs; });
            for (var _i = 0, _e = _this.delayedOperations; _i < _e.length; _i++) {
                var op = _e[_i];
                op.skipDelay();
                if (lastTimerId !== "all" /* All */ && op.timerId === lastTimerId) {
                    break;
                }
            }
            return _this.drain();
        });
    };
    /**
     * For Tests: Skip all subsequent delays for a timer id.
     */
    AsyncQueue.prototype.skipDelaysForTimerId = function (timerId) {
        this.timerIdsToSkip.push(timerId);
    };
    /** Called once a DelayedOperation is run or canceled. */
    AsyncQueue.prototype.removeDelayedOperation = function (op) {
        // NOTE: indexOf / slice are O(n), but delayedOperations is expected to be small.
        var index = this.delayedOperations.indexOf(op);
        this.delayedOperations.splice(index, 1);
    };
    return AsyncQueue;
}());
/**
 * Returns a FirestoreError that can be surfaced to the user if the provided
 * error is an IndexedDbTransactionError. Re-throws the error otherwise.
 */
function wrapInUserErrorIfRecoverable(e, msg) {
    logError(LOG_TAG$3, msg + ": " + e);
    if (isIndexedDbTransactionError(e)) {
        return new FirestoreError(Code.UNAVAILABLE, msg + ": " + e);
    }
    else {
        throw e;
    }
}
/**
 * Chrome includes Error.message in Error.stack. Other browsers do not.
 * This returns expected output of message + stack when available.
 * @param error Error or FirestoreError
 */
function getMessageOrStack(error) {
    var message = error.message || '';
    if (error.stack) {
        if (error.stack.includes(error.message)) {
            message = error.stack;
        }
        else {
            message = error.message + '\n' + error.stack;
        }
    }
    return message;
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
var LOG_TAG$4 = 'SyncEngine';
/**
 * QueryView contains all of the data that SyncEngine needs to keep track of for
 * a particular query.
 */
var QueryView = /** @class */ (function () {
    function QueryView(
    /**
     * The query itself.
     */
    query, 
    /**
     * The target number created by the client that is used in the watch
     * stream to identify this query.
     */
    targetId, 
    /**
     * The view is responsible for computing the final merged truth of what
     * docs are in the query. It gets notified of local and remote changes,
     * and applies the query filters and limits to determine the most correct
     * possible results.
     */
    view) {
        this.query = query;
        this.targetId = targetId;
        this.view = view;
    }
    return QueryView;
}());
/** Tracks a limbo resolution. */
var LimboResolution = /** @class */ (function () {
    function LimboResolution(key) {
        this.key = key;
        /**
         * Set to true once we've received a document. This is used in
         * getRemoteKeysForTarget() and ultimately used by WatchChangeAggregator to
         * decide whether it needs to manufacture a delete event for the target once
         * the target is CURRENT.
         */
        this.receivedDocument = false;
    }
    return LimboResolution;
}());
/**
 * An implementation of `SyncEngine` coordinating with other parts of SDK.
 *
 * Note: some field defined in this class might have public access level, but
 * the class is not exported so they are only accessible from this module.
 * This is useful to implement optional features (like bundles) in free
 * functions, such that they are tree-shakeable.
 */
var SyncEngineImpl = /** @class */ (function () {
    function SyncEngineImpl(localStore, remoteStore, datastore, 
    // PORTING NOTE: Manages state synchronization in multi-tab environments.
    sharedClientState, currentUser, maxConcurrentLimboResolutions) {
        this.localStore = localStore;
        this.remoteStore = remoteStore;
        this.datastore = datastore;
        this.sharedClientState = sharedClientState;
        this.currentUser = currentUser;
        this.maxConcurrentLimboResolutions = maxConcurrentLimboResolutions;
        this.syncEngineListener = null;
        this.queryViewsByQuery = new ObjectMap(function (q) { return canonifyQuery(q); }, queryEquals);
        this.queriesByTarget = new Map();
        /**
         * The keys of documents that are in limbo for which we haven't yet started a
         * limbo resolution query.
         */
        this.enqueuedLimboResolutions = [];
        /**
         * Keeps track of the target ID for each document that is in limbo with an
         * active target.
         */
        this.activeLimboTargetsByKey = new SortedMap(DocumentKey.comparator);
        /**
         * Keeps track of the information about an active limbo resolution for each
         * active target ID that was started for the purpose of limbo resolution.
         */
        this.activeLimboResolutionsByTarget = new Map();
        this.limboDocumentRefs = new ReferenceSet();
        /** Stores user completion handlers, indexed by User and BatchId. */
        this.mutationUserCallbacks = {};
        /** Stores user callbacks waiting for all pending writes to be acknowledged. */
        this.pendingWritesCallbacks = new Map();
        this.limboTargetIdGenerator = TargetIdGenerator.forSyncEngine();
        this.onlineState = "Unknown" /* Unknown */;
        // The primary state is set to `true` or `false` immediately after Firestore
        // startup. In the interim, a client should only be considered primary if
        // `isPrimary` is true.
        this._isPrimaryClient = undefined;
    }
    Object.defineProperty(SyncEngineImpl.prototype, "isPrimaryClient", {
        get: function () {
            return this._isPrimaryClient === true;
        },
        enumerable: false,
        configurable: true
    });
    SyncEngineImpl.prototype.subscribe = function (syncEngineListener) {
        this.syncEngineListener = syncEngineListener;
    };
    SyncEngineImpl.prototype.listen = function (query) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var targetId, viewSnapshot, queryView, targetData, status_1;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.assertSubscribed('listen()');
                        queryView = this.queryViewsByQuery.get(query);
                        if (!queryView) return [3 /*break*/, 1];
                        // PORTING NOTE: With Multi-Tab Web, it is possible that a query view
                        // already exists when EventManager calls us for the first time. This
                        // happens when the primary tab is already listening to this query on
                        // behalf of another tab and the user of the primary also starts listening
                        // to the query. EventManager will not have an assigned target ID in this
                        // case and calls `listen` to obtain this ID.
                        targetId = queryView.targetId;
                        this.sharedClientState.addLocalQueryTarget(targetId);
                        viewSnapshot = queryView.view.computeInitialSnapshot();
                        return [3 /*break*/, 4];
                    case 1: return [4 /*yield*/, this.localStore.allocateTarget(queryToTarget(query))];
                    case 2:
                        targetData = _e.sent();
                        status_1 = this.sharedClientState.addLocalQueryTarget(targetData.targetId);
                        targetId = targetData.targetId;
                        return [4 /*yield*/, this.initializeViewAndComputeSnapshot(query, targetId, status_1 === 'current')];
                    case 3:
                        viewSnapshot = _e.sent();
                        if (this.isPrimaryClient) {
                            this.remoteStore.listen(targetData);
                        }
                        _e.label = 4;
                    case 4: return [2 /*return*/, viewSnapshot];
                }
            });
        });
    };
    /**
     * Registers a view for a previously unknown query and computes its initial
     * snapshot.
     */
    SyncEngineImpl.prototype.initializeViewAndComputeSnapshot = function (query, targetId, current) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var queryResult, view, viewDocChanges, synthesizedTargetChange, viewChange, data;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.localStore.executeQuery(query, 
                        /* usePreviousResults= */ true)];
                    case 1:
                        queryResult = _e.sent();
                        view = new View(query, queryResult.remoteKeys);
                        viewDocChanges = view.computeDocChanges(queryResult.documents);
                        synthesizedTargetChange = TargetChange.createSynthesizedTargetChangeForCurrentChange(targetId, current && this.onlineState !== "Offline" /* Offline */);
                        viewChange = view.applyChanges(viewDocChanges, 
                        /* updateLimboDocuments= */ this.isPrimaryClient, synthesizedTargetChange);
                        this.updateTrackedLimbos(targetId, viewChange.limboChanges);
                        data = new QueryView(query, targetId, view);
                        this.queryViewsByQuery.set(query, data);
                        if (this.queriesByTarget.has(targetId)) {
                            this.queriesByTarget.get(targetId).push(query);
                        }
                        else {
                            this.queriesByTarget.set(targetId, [query]);
                        }
                        return [2 /*return*/, viewChange.snapshot];
                }
            });
        });
    };
    SyncEngineImpl.prototype.unlisten = function (query) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var queryView, queries, targetRemainsActive;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.assertSubscribed('unlisten()');
                        queryView = this.queryViewsByQuery.get(query);
                        queries = this.queriesByTarget.get(queryView.targetId);
                        if (queries.length > 1) {
                            this.queriesByTarget.set(queryView.targetId, queries.filter(function (q) { return !queryEquals(q, query); }));
                            this.queryViewsByQuery.delete(query);
                            return [2 /*return*/];
                        }
                        if (!this.isPrimaryClient) return [3 /*break*/, 3];
                        // We need to remove the local query target first to allow us to verify
                        // whether any other client is still interested in this target.
                        this.sharedClientState.removeLocalQueryTarget(queryView.targetId);
                        targetRemainsActive = this.sharedClientState.isActiveQueryTarget(queryView.targetId);
                        if (!!targetRemainsActive) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.localStore
                                .releaseTarget(queryView.targetId, /*keepPersistedTargetData=*/ false)
                                .then(function () {
                                _this.sharedClientState.clearQueryState(queryView.targetId);
                                _this.remoteStore.unlisten(queryView.targetId);
                                _this.removeAndCleanupTarget(queryView.targetId);
                            })
                                .catch(ignoreIfPrimaryLeaseLoss)];
                    case 1:
                        _e.sent();
                        _e.label = 2;
                    case 2: return [3 /*break*/, 5];
                    case 3:
                        this.removeAndCleanupTarget(queryView.targetId);
                        return [4 /*yield*/, this.localStore.releaseTarget(queryView.targetId, 
                            /*keepPersistedTargetData=*/ true)];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.write = function (batch, userCallback) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var result, e_4, error;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.assertSubscribed('write()');
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.localStore.localWrite(batch)];
                    case 2:
                        result = _e.sent();
                        this.sharedClientState.addPendingMutation(result.batchId);
                        this.addMutationCallback(result.batchId, userCallback);
                        return [4 /*yield*/, this.emitNewSnapsAndNotifyLocalStore(result.changes)];
                    case 3:
                        _e.sent();
                        return [4 /*yield*/, this.remoteStore.fillWritePipeline()];
                    case 4:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_4 = _e.sent();
                        error = wrapInUserErrorIfRecoverable(e_4, "Failed to persist write");
                        userCallback.reject(error);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.applyRemoteEvent = function (remoteEvent) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var changes, error_1;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.assertSubscribed('applyRemoteEvent()');
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 4, , 6]);
                        return [4 /*yield*/, this.localStore.applyRemoteEvent(remoteEvent)];
                    case 2:
                        changes = _e.sent();
                        // Update `receivedDocument` as appropriate for any limbo targets.
                        remoteEvent.targetChanges.forEach(function (targetChange, targetId) {
                            var limboResolution = _this.activeLimboResolutionsByTarget.get(targetId);
                            if (limboResolution) {
                                // Since this is a limbo resolution lookup, it's for a single document
                                // and it could be added, modified, or removed, but not a combination.
                                hardAssert(targetChange.addedDocuments.size +
                                    targetChange.modifiedDocuments.size +
                                    targetChange.removedDocuments.size <=
                                    1);
                                if (targetChange.addedDocuments.size > 0) {
                                    limboResolution.receivedDocument = true;
                                }
                                else if (targetChange.modifiedDocuments.size > 0) {
                                    hardAssert(limboResolution.receivedDocument);
                                }
                                else if (targetChange.removedDocuments.size > 0) {
                                    hardAssert(limboResolution.receivedDocument);
                                    limboResolution.receivedDocument = false;
                                }
                            }
                        });
                        return [4 /*yield*/, this.emitNewSnapsAndNotifyLocalStore(changes, remoteEvent)];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        error_1 = _e.sent();
                        return [4 /*yield*/, ignoreIfPrimaryLeaseLoss(error_1)];
                    case 5:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.applyOnlineStateChange = function (onlineState, source) {
        // If we are the secondary client, we explicitly ignore the remote store's
        // online state (the local client may go offline, even though the primary
        // tab remains online) and only apply the primary tab's online state from
        // SharedClientState.
        if ((this.isPrimaryClient && source === 0 /* RemoteStore */) ||
            (!this.isPrimaryClient && source === 1 /* SharedClientState */)) {
            this.assertSubscribed('applyOnlineStateChange()');
            var newViewSnapshots_1 = [];
            this.queryViewsByQuery.forEach(function (query, queryView) {
                var viewChange = queryView.view.applyOnlineStateChange(onlineState);
                if (viewChange.snapshot) {
                    newViewSnapshots_1.push(viewChange.snapshot);
                }
            });
            this.syncEngineListener.onOnlineStateChange(onlineState);
            this.syncEngineListener.onWatchChange(newViewSnapshots_1);
            this.onlineState = onlineState;
            if (this.isPrimaryClient) {
                this.sharedClientState.setOnlineState(onlineState);
            }
        }
    };
    SyncEngineImpl.prototype.rejectListen = function (targetId, err) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var limboResolution, limboKey, documentUpdates, resolvedLimboDocuments, event_1;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.assertSubscribed('rejectListens()');
                        // PORTING NOTE: Multi-tab only.
                        this.sharedClientState.updateQueryState(targetId, 'rejected', err);
                        limboResolution = this.activeLimboResolutionsByTarget.get(targetId);
                        limboKey = limboResolution && limboResolution.key;
                        if (!limboKey) return [3 /*break*/, 2];
                        documentUpdates = new SortedMap(DocumentKey.comparator);
                        documentUpdates = documentUpdates.insert(limboKey, new NoDocument(limboKey, SnapshotVersion.min()));
                        resolvedLimboDocuments = documentKeySet().add(limboKey);
                        event_1 = new RemoteEvent(SnapshotVersion.min(), 
                        /* targetChanges= */ new Map(), 
                        /* targetMismatches= */ new SortedSet(primitiveComparator), documentUpdates, resolvedLimboDocuments);
                        return [4 /*yield*/, this.applyRemoteEvent(event_1)];
                    case 1:
                        _e.sent();
                        // Since this query failed, we won't want to manually unlisten to it.
                        // We only remove it from bookkeeping after we successfully applied the
                        // RemoteEvent. If `applyRemoteEvent()` throws, we want to re-listen to
                        // this query when the RemoteStore restarts the Watch stream, which should
                        // re-trigger the target failure.
                        this.activeLimboTargetsByKey = this.activeLimboTargetsByKey.remove(limboKey);
                        this.activeLimboResolutionsByTarget.delete(targetId);
                        this.pumpEnqueuedLimboResolutions();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.localStore
                            .releaseTarget(targetId, /* keepPersistedTargetData */ false)
                            .then(function () { return _this.removeAndCleanupTarget(targetId, err); })
                            .catch(ignoreIfPrimaryLeaseLoss)];
                    case 3:
                        _e.sent();
                        _e.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.applySuccessfulWrite = function (mutationBatchResult) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var batchId, changes, error_2;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.assertSubscribed('applySuccessfulWrite()');
                        batchId = mutationBatchResult.batch.batchId;
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 4, , 6]);
                        return [4 /*yield*/, this.localStore.acknowledgeBatch(mutationBatchResult)];
                    case 2:
                        changes = _e.sent();
                        // The local store may or may not be able to apply the write result and
                        // raise events immediately (depending on whether the watcher is caught
                        // up), so we raise user callbacks first so that they consistently happen
                        // before listen events.
                        this.processUserCallback(batchId, /*error=*/ null);
                        this.triggerPendingWritesCallbacks(batchId);
                        this.sharedClientState.updateMutationState(batchId, 'acknowledged');
                        return [4 /*yield*/, this.emitNewSnapsAndNotifyLocalStore(changes)];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        error_2 = _e.sent();
                        return [4 /*yield*/, ignoreIfPrimaryLeaseLoss(error_2)];
                    case 5:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.rejectFailedWrite = function (batchId, error) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var changes, error_3;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.assertSubscribed('rejectFailedWrite()');
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 4, , 6]);
                        return [4 /*yield*/, this.localStore.rejectBatch(batchId)];
                    case 2:
                        changes = _e.sent();
                        // The local store may or may not be able to apply the write result and
                        // raise events immediately (depending on whether the watcher is caught up),
                        // so we raise user callbacks first so that they consistently happen before
                        // listen events.
                        this.processUserCallback(batchId, error);
                        this.triggerPendingWritesCallbacks(batchId);
                        this.sharedClientState.updateMutationState(batchId, 'rejected', error);
                        return [4 /*yield*/, this.emitNewSnapsAndNotifyLocalStore(changes)];
                    case 3:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        error_3 = _e.sent();
                        return [4 /*yield*/, ignoreIfPrimaryLeaseLoss(error_3)];
                    case 5:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.registerPendingWritesCallback = function (callback) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var highestBatchId, callbacks, e_5, firestoreError;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!this.remoteStore.canUseNetwork()) {
                            logDebug(LOG_TAG$4, 'The network is disabled. The task returned by ' +
                                "'awaitPendingWrites()' will not complete until the network is enabled.");
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.localStore.getHighestUnacknowledgedBatchId()];
                    case 2:
                        highestBatchId = _e.sent();
                        if (highestBatchId === BATCHID_UNKNOWN) {
                            // Trigger the callback right away if there is no pending writes at the moment.
                            callback.resolve();
                            return [2 /*return*/];
                        }
                        callbacks = this.pendingWritesCallbacks.get(highestBatchId) || [];
                        callbacks.push(callback);
                        this.pendingWritesCallbacks.set(highestBatchId, callbacks);
                        return [3 /*break*/, 4];
                    case 3:
                        e_5 = _e.sent();
                        firestoreError = wrapInUserErrorIfRecoverable(e_5, 'Initialization of waitForPendingWrites() operation failed');
                        callback.reject(firestoreError);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Triggers the callbacks that are waiting for this batch id to get acknowledged by server,
     * if there are any.
     */
    SyncEngineImpl.prototype.triggerPendingWritesCallbacks = function (batchId) {
        (this.pendingWritesCallbacks.get(batchId) || []).forEach(function (callback) {
            callback.resolve();
        });
        this.pendingWritesCallbacks.delete(batchId);
    };
    /** Reject all outstanding callbacks waiting for pending writes to complete. */
    SyncEngineImpl.prototype.rejectOutstandingPendingWritesCallbacks = function (errorMessage) {
        this.pendingWritesCallbacks.forEach(function (callbacks) {
            callbacks.forEach(function (callback) {
                callback.reject(new FirestoreError(Code.CANCELLED, errorMessage));
            });
        });
        this.pendingWritesCallbacks.clear();
    };
    SyncEngineImpl.prototype.addMutationCallback = function (batchId, callback) {
        var newCallbacks = this.mutationUserCallbacks[this.currentUser.toKey()];
        if (!newCallbacks) {
            newCallbacks = new SortedMap(primitiveComparator);
        }
        newCallbacks = newCallbacks.insert(batchId, callback);
        this.mutationUserCallbacks[this.currentUser.toKey()] = newCallbacks;
    };
    /**
     * Resolves or rejects the user callback for the given batch and then discards
     * it.
     */
    SyncEngineImpl.prototype.processUserCallback = function (batchId, error) {
        var newCallbacks = this.mutationUserCallbacks[this.currentUser.toKey()];
        // NOTE: Mutations restored from persistence won't have callbacks, so it's
        // okay for there to be no callback for this ID.
        if (newCallbacks) {
            var callback = newCallbacks.get(batchId);
            if (callback) {
                if (error) {
                    callback.reject(error);
                }
                else {
                    callback.resolve();
                }
                newCallbacks = newCallbacks.remove(batchId);
            }
            this.mutationUserCallbacks[this.currentUser.toKey()] = newCallbacks;
        }
    };
    SyncEngineImpl.prototype.removeAndCleanupTarget = function (targetId, error) {
        var _this = this;
        if (error === void 0) { error = null; }
        this.sharedClientState.removeLocalQueryTarget(targetId);
        for (var _i = 0, _e = this.queriesByTarget.get(targetId); _i < _e.length; _i++) {
            var query = _e[_i];
            this.queryViewsByQuery.delete(query);
            if (error) {
                this.syncEngineListener.onWatchError(query, error);
            }
        }
        this.queriesByTarget.delete(targetId);
        if (this.isPrimaryClient) {
            var limboKeys = this.limboDocumentRefs.removeReferencesForId(targetId);
            limboKeys.forEach(function (limboKey) {
                var isReferenced = _this.limboDocumentRefs.containsKey(limboKey);
                if (!isReferenced) {
                    // We removed the last reference for this key
                    _this.removeLimboTarget(limboKey);
                }
            });
        }
    };
    SyncEngineImpl.prototype.removeLimboTarget = function (key) {
        // It's possible that the target already got removed because the query failed. In that case,
        // the key won't exist in `limboTargetsByKey`. Only do the cleanup if we still have the target.
        var limboTargetId = this.activeLimboTargetsByKey.get(key);
        if (limboTargetId === null) {
            // This target already got removed, because the query failed.
            return;
        }
        this.remoteStore.unlisten(limboTargetId);
        this.activeLimboTargetsByKey = this.activeLimboTargetsByKey.remove(key);
        this.activeLimboResolutionsByTarget.delete(limboTargetId);
        this.pumpEnqueuedLimboResolutions();
    };
    SyncEngineImpl.prototype.updateTrackedLimbos = function (targetId, limboChanges) {
        for (var _i = 0, limboChanges_1 = limboChanges; _i < limboChanges_1.length; _i++) {
            var limboChange = limboChanges_1[_i];
            if (limboChange instanceof AddedLimboDocument) {
                this.limboDocumentRefs.addReference(limboChange.key, targetId);
                this.trackLimboChange(limboChange);
            }
            else if (limboChange instanceof RemovedLimboDocument) {
                logDebug(LOG_TAG$4, 'Document no longer in limbo: ' + limboChange.key);
                this.limboDocumentRefs.removeReference(limboChange.key, targetId);
                var isReferenced = this.limboDocumentRefs.containsKey(limboChange.key);
                if (!isReferenced) {
                    // We removed the last reference for this key
                    this.removeLimboTarget(limboChange.key);
                }
            }
            else {
                fail();
            }
        }
    };
    SyncEngineImpl.prototype.trackLimboChange = function (limboChange) {
        var key = limboChange.key;
        if (!this.activeLimboTargetsByKey.get(key)) {
            logDebug(LOG_TAG$4, 'New document in limbo: ' + key);
            this.enqueuedLimboResolutions.push(key);
            this.pumpEnqueuedLimboResolutions();
        }
    };
    /**
     * Starts listens for documents in limbo that are enqueued for resolution,
     * subject to a maximum number of concurrent resolutions.
     *
     * Without bounding the number of concurrent resolutions, the server can fail
     * with "resource exhausted" errors which can lead to pathological client
     * behavior as seen in https://github.com/firebase/firebase-js-sdk/issues/2683.
     */
    SyncEngineImpl.prototype.pumpEnqueuedLimboResolutions = function () {
        while (this.enqueuedLimboResolutions.length > 0 &&
            this.activeLimboTargetsByKey.size < this.maxConcurrentLimboResolutions) {
            var key = this.enqueuedLimboResolutions.shift();
            var limboTargetId = this.limboTargetIdGenerator.next();
            this.activeLimboResolutionsByTarget.set(limboTargetId, new LimboResolution(key));
            this.activeLimboTargetsByKey = this.activeLimboTargetsByKey.insert(key, limboTargetId);
            this.remoteStore.listen(new TargetData(queryToTarget(newQueryForPath(key.path)), limboTargetId, 2 /* LimboResolution */, ListenSequence.INVALID));
        }
    };
    // Visible for testing
    SyncEngineImpl.prototype.activeLimboDocumentResolutions = function () {
        return this.activeLimboTargetsByKey;
    };
    // Visible for testing
    SyncEngineImpl.prototype.enqueuedLimboDocumentResolutions = function () {
        return this.enqueuedLimboResolutions;
    };
    SyncEngineImpl.prototype.emitNewSnapsAndNotifyLocalStore = function (changes, remoteEvent) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var newSnaps, docChangesInAllViews, queriesProcessed;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        newSnaps = [];
                        docChangesInAllViews = [];
                        queriesProcessed = [];
                        this.queryViewsByQuery.forEach(function (_, queryView) {
                            queriesProcessed.push(Promise.resolve()
                                .then(function () {
                                var viewDocChanges = queryView.view.computeDocChanges(changes);
                                if (!viewDocChanges.needsRefill) {
                                    return viewDocChanges;
                                }
                                // The query has a limit and some docs were removed, so we need
                                // to re-run the query against the local store to make sure we
                                // didn't lose any good docs that had been past the limit.
                                return _this.localStore
                                    .executeQuery(queryView.query, /* usePreviousResults= */ false)
                                    .then(function (_e) {
                                    var documents = _e.documents;
                                    return queryView.view.computeDocChanges(documents, viewDocChanges);
                                });
                            })
                                .then(function (viewDocChanges) {
                                var targetChange = remoteEvent && remoteEvent.targetChanges.get(queryView.targetId);
                                var viewChange = queryView.view.applyChanges(viewDocChanges, 
                                /* updateLimboDocuments= */ _this.isPrimaryClient, targetChange);
                                _this.updateTrackedLimbos(queryView.targetId, viewChange.limboChanges);
                                if (viewChange.snapshot) {
                                    if (_this.isPrimaryClient) {
                                        _this.sharedClientState.updateQueryState(queryView.targetId, viewChange.snapshot.fromCache ? 'not-current' : 'current');
                                    }
                                    newSnaps.push(viewChange.snapshot);
                                    var docChanges = LocalViewChanges.fromSnapshot(queryView.targetId, viewChange.snapshot);
                                    docChangesInAllViews.push(docChanges);
                                }
                            }));
                        });
                        return [4 /*yield*/, Promise.all(queriesProcessed)];
                    case 1:
                        _e.sent();
                        this.syncEngineListener.onWatchChange(newSnaps);
                        return [4 /*yield*/, this.localStore.notifyLocalViewChanges(docChangesInAllViews)];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.assertSubscribed = function (fnName) {
    };
    SyncEngineImpl.prototype.handleCredentialChange = function (user) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var userChanged, result;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        userChanged = !this.currentUser.isEqual(user);
                        if (!userChanged) return [3 /*break*/, 3];
                        logDebug(LOG_TAG$4, 'User change. New user:', user.toKey());
                        return [4 /*yield*/, this.localStore.handleUserChange(user)];
                    case 1:
                        result = _e.sent();
                        this.currentUser = user;
                        // Fails tasks waiting for pending writes requested by previous user.
                        this.rejectOutstandingPendingWritesCallbacks("'waitForPendingWrites' promise is rejected due to a user change.");
                        // TODO(b/114226417): Consider calling this only in the primary tab.
                        this.sharedClientState.handleUserChange(user, result.removedBatchIds, result.addedBatchIds);
                        return [4 /*yield*/, this.emitNewSnapsAndNotifyLocalStore(result.affectedDocuments)];
                    case 2:
                        _e.sent();
                        _e.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SyncEngineImpl.prototype.getRemoteKeysForTarget = function (targetId) {
        var limboResolution = this.activeLimboResolutionsByTarget.get(targetId);
        if (limboResolution && limboResolution.receivedDocument) {
            return documentKeySet().add(limboResolution.key);
        }
        else {
            var keySet = documentKeySet();
            var queries = this.queriesByTarget.get(targetId);
            if (!queries) {
                return keySet;
            }
            for (var _i = 0, queries_1 = queries; _i < queries_1.length; _i++) {
                var query = queries_1[_i];
                var queryView = this.queryViewsByQuery.get(query);
                keySet = keySet.unionWith(queryView.view.syncedDocuments);
            }
            return keySet;
        }
    };
    return SyncEngineImpl;
}());
function newSyncEngine(localStore, remoteStore, datastore, 
// PORTING NOTE: Manages state synchronization in multi-tab environments.
sharedClientState, currentUser, maxConcurrentLimboResolutions, isPrimary) {
    var syncEngine = new SyncEngineImpl(localStore, remoteStore, datastore, sharedClientState, currentUser, maxConcurrentLimboResolutions);
    if (isPrimary) {
        syncEngine._isPrimaryClient = true;
    }
    return syncEngine;
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
var LOG_TAG$5 = 'PersistentStream';
/** The time a stream stays open after it is marked idle. */
var IDLE_TIMEOUT_MS = 60 * 1000;
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
var PersistentStream = /** @class */ (function () {
    function PersistentStream(queue, connectionTimerId, idleTimerId, connection, credentialsProvider, listener) {
        this.queue = queue;
        this.idleTimerId = idleTimerId;
        this.connection = connection;
        this.credentialsProvider = credentialsProvider;
        this.listener = listener;
        this.state = 0 /* Initial */;
        /**
         * A close count that's incremented every time the stream is closed; used by
         * getCloseGuardedDispatcher() to invalidate callbacks that happen after
         * close.
         */
        this.closeCount = 0;
        this.idleTimer = null;
        this.stream = null;
        this.backoff = new ExponentialBackoff(queue, connectionTimerId);
    }
    /**
     * Returns true if start() has been called and no error has occurred. True
     * indicates the stream is open or in the process of opening (which
     * encompasses respecting backoff, getting auth tokens, and starting the
     * actual RPC). Use isOpen() to determine if the stream is open and ready for
     * outbound requests.
     */
    PersistentStream.prototype.isStarted = function () {
        return (this.state === 1 /* Starting */ ||
            this.state === 2 /* Open */ ||
            this.state === 4 /* Backoff */);
    };
    /**
     * Returns true if the underlying RPC is open (the onOpen() listener has been
     * called) and the stream is ready for outbound requests.
     */
    PersistentStream.prototype.isOpen = function () {
        return this.state === 2 /* Open */;
    };
    /**
     * Starts the RPC. Only allowed if isStarted() returns false. The stream is
     * not immediately ready for use: onOpen() will be invoked when the RPC is
     * ready for outbound requests, at which point isOpen() will return true.
     *
     * When start returns, isStarted() will return true.
     */
    PersistentStream.prototype.start = function () {
        if (this.state === 3 /* Error */) {
            this.performBackoff();
            return;
        }
        this.auth();
    };
    /**
     * Stops the RPC. This call is idempotent and allowed regardless of the
     * current isStarted() state.
     *
     * When stop returns, isStarted() and isOpen() will both return false.
     */
    PersistentStream.prototype.stop = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!this.isStarted()) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.close(0 /* Initial */)];
                    case 1:
                        _e.sent();
                        _e.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * After an error the stream will usually back off on the next attempt to
     * start it. If the error warrants an immediate restart of the stream, the
     * sender can use this to indicate that the receiver should not back off.
     *
     * Each error will call the onClose() listener. That function can decide to
     * inhibit backoff if required.
     */
    PersistentStream.prototype.inhibitBackoff = function () {
        this.state = 0 /* Initial */;
        this.backoff.reset();
    };
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
    PersistentStream.prototype.markIdle = function () {
        var _this = this;
        // Starts the idle time if we are in state 'Open' and are not yet already
        // running a timer (in which case the previous idle timeout still applies).
        if (this.isOpen() && this.idleTimer === null) {
            this.idleTimer = this.queue.enqueueAfterDelay(this.idleTimerId, IDLE_TIMEOUT_MS, function () { return _this.handleIdleCloseTimer(); });
        }
    };
    /** Sends a message to the underlying stream. */
    PersistentStream.prototype.sendRequest = function (msg) {
        this.cancelIdleCheck();
        this.stream.send(msg);
    };
    /** Called by the idle timer when the stream should close due to inactivity. */
    PersistentStream.prototype.handleIdleCloseTimer = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                if (this.isOpen()) {
                    // When timing out an idle stream there's no reason to force the stream into backoff when
                    // it restarts so set the stream state to Initial instead of Error.
                    return [2 /*return*/, this.close(0 /* Initial */)];
                }
                return [2 /*return*/];
            });
        });
    };
    /** Marks the stream as active again. */
    PersistentStream.prototype.cancelIdleCheck = function () {
        if (this.idleTimer) {
            this.idleTimer.cancel();
            this.idleTimer = null;
        }
    };
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
    PersistentStream.prototype.close = function (finalState, error) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        // Cancel any outstanding timers (they're guaranteed not to execute).
                        this.cancelIdleCheck();
                        this.backoff.cancel();
                        // Invalidates any stream-related callbacks (e.g. from auth or the
                        // underlying stream), guaranteeing they won't execute.
                        this.closeCount++;
                        if (finalState !== 3 /* Error */) {
                            // If this is an intentional close ensure we don't delay our next connection attempt.
                            this.backoff.reset();
                        }
                        else if (error && error.code === Code.RESOURCE_EXHAUSTED) {
                            // Log the error. (Probably either 'quota exceeded' or 'max queue length reached'.)
                            logError(error.toString());
                            logError('Using maximum backoff delay to prevent overloading the backend.');
                            this.backoff.resetToMax();
                        }
                        else if (error && error.code === Code.UNAUTHENTICATED) {
                            // "unauthenticated" error means the token was rejected. Try force refreshing it in case it
                            // just expired.
                            this.credentialsProvider.invalidateToken();
                        }
                        // Clean up the underlying stream because we are no longer interested in events.
                        if (this.stream !== null) {
                            this.tearDown();
                            this.stream.close();
                            this.stream = null;
                        }
                        // This state must be assigned before calling onClose() to allow the callback to
                        // inhibit backoff or otherwise manipulate the state in its non-started state.
                        this.state = finalState;
                        // Notify the listener that the stream closed.
                        return [4 /*yield*/, this.listener.onClose(error)];
                    case 1:
                        // Notify the listener that the stream closed.
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Can be overridden to perform additional cleanup before the stream is closed.
     * Calling super.tearDown() is not required.
     */
    PersistentStream.prototype.tearDown = function () { };
    PersistentStream.prototype.auth = function () {
        var _this = this;
        this.state = 1 /* Starting */;
        var dispatchIfNotClosed = this.getCloseGuardedDispatcher(this.closeCount);
        // TODO(mikelehen): Just use dispatchIfNotClosed, but see TODO below.
        var closeCount = this.closeCount;
        this.credentialsProvider.getToken().then(function (token) {
            // Stream can be stopped while waiting for authentication.
            // TODO(mikelehen): We really should just use dispatchIfNotClosed
            // and let this dispatch onto the queue, but that opened a spec test can
            // of worms that I don't want to deal with in this PR.
            if (_this.closeCount === closeCount) {
                // Normally we'd have to schedule the callback on the AsyncQueue.
                // However, the following calls are safe to be called outside the
                // AsyncQueue since they don't chain asynchronous calls
                _this.startStream(token);
            }
        }, function (error) {
            dispatchIfNotClosed(function () {
                var rpcError = new FirestoreError(Code.UNKNOWN, 'Fetching auth token failed: ' + error.message);
                return _this.handleStreamClose(rpcError);
            });
        });
    };
    PersistentStream.prototype.startStream = function (token) {
        var _this = this;
        var dispatchIfNotClosed = this.getCloseGuardedDispatcher(this.closeCount);
        this.stream = this.startRpc(token);
        this.stream.onOpen(function () {
            dispatchIfNotClosed(function () {
                _this.state = 2 /* Open */;
                return _this.listener.onOpen();
            });
        });
        this.stream.onClose(function (error) {
            dispatchIfNotClosed(function () {
                return _this.handleStreamClose(error);
            });
        });
        this.stream.onMessage(function (msg) {
            dispatchIfNotClosed(function () {
                return _this.onMessage(msg);
            });
        });
    };
    PersistentStream.prototype.performBackoff = function () {
        var _this = this;
        this.state = 4 /* Backoff */;
        this.backoff.backoffAndRun(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                this.state = 0 /* Initial */;
                this.start();
                return [2 /*return*/];
            });
        }); });
    };
    // Visible for tests
    PersistentStream.prototype.handleStreamClose = function (error) {
        logDebug(LOG_TAG$5, "close with error: " + error);
        this.stream = null;
        // In theory the stream could close cleanly, however, in our current model
        // we never expect this to happen because if we stop a stream ourselves,
        // this callback will never be called. To prevent cases where we retry
        // without a backoff accidentally, we set the stream to error in all cases.
        return this.close(3 /* Error */, error);
    };
    /**
     * Returns a "dispatcher" function that dispatches operations onto the
     * AsyncQueue but only runs them if closeCount remains unchanged. This allows
     * us to turn auth / stream callbacks into no-ops if the stream is closed /
     * re-opened, etc.
     */
    PersistentStream.prototype.getCloseGuardedDispatcher = function (startCloseCount) {
        var _this = this;
        return function (fn) {
            _this.queue.enqueueAndForget(function () {
                if (_this.closeCount === startCloseCount) {
                    return fn();
                }
                else {
                    logDebug(LOG_TAG$5, 'stream callback skipped by getCloseGuardedDispatcher.');
                    return Promise.resolve();
                }
            });
        };
    };
    return PersistentStream;
}());
/**
 * A PersistentStream that implements the Listen RPC.
 *
 * Once the Listen stream has called the onOpen() listener, any number of
 * listen() and unlisten() calls can be made to control what changes will be
 * sent from the server for ListenResponses.
 */
var PersistentListenStream = /** @class */ (function (_super) {
    tslib.__extends(PersistentListenStream, _super);
    function PersistentListenStream(queue, connection, credentials, serializer, listener) {
        var _this = _super.call(this, queue, "listen_stream_connection_backoff" /* ListenStreamConnectionBackoff */, "listen_stream_idle" /* ListenStreamIdle */, connection, credentials, listener) || this;
        _this.serializer = serializer;
        return _this;
    }
    PersistentListenStream.prototype.startRpc = function (token) {
        return this.connection.openStream('Listen', token);
    };
    PersistentListenStream.prototype.onMessage = function (watchChangeProto) {
        // A successful response means the stream is healthy
        this.backoff.reset();
        var watchChange = fromWatchChange(this.serializer, watchChangeProto);
        var snapshot = versionFromListenResponse(watchChangeProto);
        return this.listener.onWatchChange(watchChange, snapshot);
    };
    /**
     * Registers interest in the results of the given target. If the target
     * includes a resumeToken it will be included in the request. Results that
     * affect the target will be streamed back as WatchChange messages that
     * reference the targetId.
     */
    PersistentListenStream.prototype.watch = function (targetData) {
        var request = {};
        request.database = getEncodedDatabaseId(this.serializer);
        request.addTarget = toTarget(this.serializer, targetData);
        var labels = toListenRequestLabels(this.serializer, targetData);
        if (labels) {
            request.labels = labels;
        }
        this.sendRequest(request);
    };
    /**
     * Unregisters interest in the results of the target associated with the
     * given targetId.
     */
    PersistentListenStream.prototype.unwatch = function (targetId) {
        var request = {};
        request.database = getEncodedDatabaseId(this.serializer);
        request.removeTarget = targetId;
        this.sendRequest(request);
    };
    return PersistentListenStream;
}(PersistentStream));
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
 */
var PersistentWriteStream = /** @class */ (function (_super) {
    tslib.__extends(PersistentWriteStream, _super);
    function PersistentWriteStream(queue, connection, credentials, serializer, listener) {
        var _this = _super.call(this, queue, "write_stream_connection_backoff" /* WriteStreamConnectionBackoff */, "write_stream_idle" /* WriteStreamIdle */, connection, credentials, listener) || this;
        _this.serializer = serializer;
        _this.handshakeComplete_ = false;
        return _this;
    }
    Object.defineProperty(PersistentWriteStream.prototype, "handshakeComplete", {
        /**
         * Tracks whether or not a handshake has been successfully exchanged and
         * the stream is ready to accept mutations.
         */
        get: function () {
            return this.handshakeComplete_;
        },
        enumerable: false,
        configurable: true
    });
    // Override of PersistentStream.start
    PersistentWriteStream.prototype.start = function () {
        this.handshakeComplete_ = false;
        this.lastStreamToken = undefined;
        _super.prototype.start.call(this);
    };
    PersistentWriteStream.prototype.tearDown = function () {
        if (this.handshakeComplete_) {
            this.writeMutations([]);
        }
    };
    PersistentWriteStream.prototype.startRpc = function (token) {
        return this.connection.openStream('Write', token);
    };
    PersistentWriteStream.prototype.onMessage = function (responseProto) {
        // Always capture the last stream token.
        hardAssert(!!responseProto.streamToken);
        this.lastStreamToken = responseProto.streamToken;
        if (!this.handshakeComplete_) {
            // The first response is always the handshake response
            hardAssert(!responseProto.writeResults || responseProto.writeResults.length === 0);
            this.handshakeComplete_ = true;
            return this.listener.onHandshakeComplete();
        }
        else {
            // A successful first write response means the stream is healthy,
            // Note, that we could consider a successful handshake healthy, however,
            // the write itself might be causing an error we want to back off from.
            this.backoff.reset();
            var results = fromWriteResults(responseProto.writeResults, responseProto.commitTime);
            var commitVersion = fromVersion(responseProto.commitTime);
            return this.listener.onMutationResult(commitVersion, results);
        }
    };
    /**
     * Sends an initial streamToken to the server, performing the handshake
     * required to make the StreamingWrite RPC work. Subsequent
     * calls should wait until onHandshakeComplete was called.
     */
    PersistentWriteStream.prototype.writeHandshake = function () {
        // TODO(dimond): Support stream resumption. We intentionally do not set the
        // stream token on the handshake, ignoring any stream token we might have.
        var request = {};
        request.database = getEncodedDatabaseId(this.serializer);
        this.sendRequest(request);
    };
    /** Sends a group of mutations to the Firestore backend to apply. */
    PersistentWriteStream.prototype.writeMutations = function (mutations) {
        var _this = this;
        var request = {
            streamToken: this.lastStreamToken,
            writes: mutations.map(function (mutation) { return toMutation(_this.serializer, mutation); })
        };
        this.sendRequest(request);
    };
    return PersistentWriteStream;
}(PersistentStream));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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
var Datastore = /** @class */ (function () {
    function Datastore() {
    }
    return Datastore;
}());
/**
 * An implementation of Datastore that exposes additional state for internal
 * consumption.
 */
var DatastoreImpl = /** @class */ (function (_super) {
    tslib.__extends(DatastoreImpl, _super);
    function DatastoreImpl(credentials, connection, serializer) {
        var _this = _super.call(this) || this;
        _this.credentials = credentials;
        _this.connection = connection;
        _this.serializer = serializer;
        _this.terminated = false;
        return _this;
    }
    DatastoreImpl.prototype.verifyInitialized = function () {
        if (this.terminated) {
            throw new FirestoreError(Code.FAILED_PRECONDITION, 'The client has already been terminated.');
        }
    };
    /** Gets an auth token and invokes the provided RPC. */
    DatastoreImpl.prototype.invokeRPC = function (rpcName, path, request) {
        var _this = this;
        this.verifyInitialized();
        return this.credentials
            .getToken()
            .then(function (token) {
            return _this.connection.invokeRPC(rpcName, path, request, token);
        })
            .catch(function (error) {
            if (error.code === Code.UNAUTHENTICATED) {
                _this.credentials.invalidateToken();
            }
            throw error;
        });
    };
    /** Gets an auth token and invokes the provided RPC with streamed results. */
    DatastoreImpl.prototype.invokeStreamingRPC = function (rpcName, path, request) {
        var _this = this;
        this.verifyInitialized();
        return this.credentials
            .getToken()
            .then(function (token) {
            return _this.connection.invokeStreamingRPC(rpcName, path, request, token);
        })
            .catch(function (error) {
            if (error.code === Code.UNAUTHENTICATED) {
                _this.credentials.invalidateToken();
            }
            throw error;
        });
    };
    DatastoreImpl.prototype.terminate = function () {
        this.terminated = false;
    };
    return DatastoreImpl;
}(Datastore));
// TODO(firestorexp): Make sure there is only one Datastore instance per
// firestore-exp client.
function newDatastore(credentials, connection, serializer) {
    return new DatastoreImpl(credentials, connection, serializer);
}
function invokeCommitRpc(datastore, mutations) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        var datastoreImpl, path, request;
        return tslib.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    datastoreImpl = debugCast(datastore);
                    path = getEncodedDatabaseId(datastoreImpl.serializer) + '/documents';
                    request = {
                        writes: mutations.map(function (m) { return toMutation(datastoreImpl.serializer, m); })
                    };
                    return [4 /*yield*/, datastoreImpl.invokeRPC('Commit', path, request)];
                case 1:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function invokeBatchGetDocumentsRpc(datastore, keys) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        var datastoreImpl, path, request, response, docs, result;
        return tslib.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    datastoreImpl = debugCast(datastore);
                    path = getEncodedDatabaseId(datastoreImpl.serializer) + '/documents';
                    request = {
                        documents: keys.map(function (k) { return toName(datastoreImpl.serializer, k); })
                    };
                    return [4 /*yield*/, datastoreImpl.invokeStreamingRPC('BatchGetDocuments', path, request)];
                case 1:
                    response = _e.sent();
                    docs = new Map();
                    response.forEach(function (proto) {
                        var doc = fromMaybeDocument(datastoreImpl.serializer, proto);
                        docs.set(doc.key.toString(), doc);
                    });
                    result = [];
                    keys.forEach(function (key) {
                        var doc = docs.get(key.toString());
                        hardAssert(!!doc);
                        result.push(doc);
                    });
                    return [2 /*return*/, result];
            }
        });
    });
}
function newPersistentWriteStream(datastore, queue, listener) {
    var datastoreImpl = debugCast(datastore);
    datastoreImpl.verifyInitialized();
    return new PersistentWriteStream(queue, datastoreImpl.connection, datastoreImpl.credentials, datastoreImpl.serializer, listener);
}
function newPersistentWatchStream(datastore, queue, listener) {
    var datastoreImpl = debugCast(datastore);
    datastoreImpl.verifyInitialized();
    return new PersistentListenStream(queue, datastoreImpl.connection, datastoreImpl.credentials, datastoreImpl.serializer, listener);
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
var LOG_TAG$6 = 'OnlineStateTracker';
// To deal with transient failures, we allow multiple stream attempts before
// giving up and transitioning from OnlineState.Unknown to Offline.
// TODO(mikelehen): This used to be set to 2 as a mitigation for b/66228394.
// @jdimond thinks that bug is sufficiently fixed so that we can set this back
// to 1. If that works okay, we could potentially remove this logic entirely.
var MAX_WATCH_STREAM_FAILURES = 1;
// To deal with stream attempts that don't succeed or fail in a timely manner,
// we have a timeout for OnlineState to reach Online or Offline.
// If the timeout is reached, we transition to Offline rather than waiting
// indefinitely.
var ONLINE_STATE_TIMEOUT_MS = 10 * 1000;
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
var OnlineStateTracker = /** @class */ (function () {
    function OnlineStateTracker(asyncQueue, onlineStateHandler) {
        this.asyncQueue = asyncQueue;
        this.onlineStateHandler = onlineStateHandler;
        /** The current OnlineState. */
        this.state = "Unknown" /* Unknown */;
        /**
         * A count of consecutive failures to open the stream. If it reaches the
         * maximum defined by MAX_WATCH_STREAM_FAILURES, we'll set the OnlineState to
         * Offline.
         */
        this.watchStreamFailures = 0;
        /**
         * A timer that elapses after ONLINE_STATE_TIMEOUT_MS, at which point we
         * transition from OnlineState.Unknown to OnlineState.Offline without waiting
         * for the stream to actually fail (MAX_WATCH_STREAM_FAILURES times).
         */
        this.onlineStateTimer = null;
        /**
         * Whether the client should log a warning message if it fails to connect to
         * the backend (initially true, cleared after a successful stream, or if we've
         * logged the message already).
         */
        this.shouldWarnClientIsOffline = true;
    }
    /**
     * Called by RemoteStore when a watch stream is started (including on each
     * backoff attempt).
     *
     * If this is the first attempt, it sets the OnlineState to Unknown and starts
     * the onlineStateTimer.
     */
    OnlineStateTracker.prototype.handleWatchStreamStart = function () {
        var _this = this;
        if (this.watchStreamFailures === 0) {
            this.setAndBroadcast("Unknown" /* Unknown */);
            this.onlineStateTimer = this.asyncQueue.enqueueAfterDelay("online_state_timeout" /* OnlineStateTimeout */, ONLINE_STATE_TIMEOUT_MS, function () {
                _this.onlineStateTimer = null;
                _this.logClientOfflineWarningIfNecessary("Backend didn't respond within " + ONLINE_STATE_TIMEOUT_MS / 1000 + " " +
                    "seconds.");
                _this.setAndBroadcast("Offline" /* Offline */);
                // NOTE: handleWatchStreamFailure() will continue to increment
                // watchStreamFailures even though we are already marked Offline,
                // but this is non-harmful.
                return Promise.resolve();
            });
        }
    };
    /**
     * Updates our OnlineState as appropriate after the watch stream reports a
     * failure. The first failure moves us to the 'Unknown' state. We then may
     * allow multiple failures (based on MAX_WATCH_STREAM_FAILURES) before we
     * actually transition to the 'Offline' state.
     */
    OnlineStateTracker.prototype.handleWatchStreamFailure = function (error) {
        if (this.state === "Online" /* Online */) {
            this.setAndBroadcast("Unknown" /* Unknown */);
        }
        else {
            this.watchStreamFailures++;
            if (this.watchStreamFailures >= MAX_WATCH_STREAM_FAILURES) {
                this.clearOnlineStateTimer();
                this.logClientOfflineWarningIfNecessary("Connection failed " + MAX_WATCH_STREAM_FAILURES + " " +
                    ("times. Most recent error: " + error.toString()));
                this.setAndBroadcast("Offline" /* Offline */);
            }
        }
    };
    /**
     * Explicitly sets the OnlineState to the specified state.
     *
     * Note that this resets our timers / failure counters, etc. used by our
     * Offline heuristics, so must not be used in place of
     * handleWatchStreamStart() and handleWatchStreamFailure().
     */
    OnlineStateTracker.prototype.set = function (newState) {
        this.clearOnlineStateTimer();
        this.watchStreamFailures = 0;
        if (newState === "Online" /* Online */) {
            // We've connected to watch at least once. Don't warn the developer
            // about being offline going forward.
            this.shouldWarnClientIsOffline = false;
        }
        this.setAndBroadcast(newState);
    };
    OnlineStateTracker.prototype.setAndBroadcast = function (newState) {
        if (newState !== this.state) {
            this.state = newState;
            this.onlineStateHandler(newState);
        }
    };
    OnlineStateTracker.prototype.logClientOfflineWarningIfNecessary = function (details) {
        var message = "Could not reach Cloud Firestore backend. " + details + "\n" +
            "This typically indicates that your device does not have a healthy " +
            "Internet connection at the moment. The client will operate in offline " +
            "mode until it is able to successfully connect to the backend.";
        if (this.shouldWarnClientIsOffline) {
            logError(message);
            this.shouldWarnClientIsOffline = false;
        }
        else {
            logDebug(LOG_TAG$6, message);
        }
    };
    OnlineStateTracker.prototype.clearOnlineStateTimer = function () {
        if (this.onlineStateTimer !== null) {
            this.onlineStateTimer.cancel();
            this.onlineStateTimer = null;
        }
    };
    return OnlineStateTracker;
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
var LOG_TAG$7 = 'RemoteStore';
// TODO(b/35853402): Negotiate this with the stream.
var MAX_PENDING_WRITES = 10;
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
var RemoteStore = /** @class */ (function () {
    function RemoteStore(
    /**
     * The local store, used to fill the write pipeline with outbound mutations.
     */
    localStore, 
    /** The client-side proxy for interacting with the backend. */
    datastore, asyncQueue, onlineStateHandler, connectivityMonitor) {
        var _this = this;
        this.localStore = localStore;
        this.datastore = datastore;
        this.asyncQueue = asyncQueue;
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
        this.writePipeline = [];
        /**
         * A mapping of watched targets that the client cares about tracking and the
         * user has explicitly called a 'listen' for this target.
         *
         * These targets may or may not have been sent to or acknowledged by the
         * server. On re-establishing the listen stream, these targets should be sent
         * to the server. The targets removed with unlistens are removed eagerly
         * without waiting for confirmation from the listen stream.
         */
        this.listenTargets = new Map();
        this.watchChangeAggregator = null;
        /**
         * A set of reasons for why the RemoteStore may be offline. If empty, the
         * RemoteStore may start its network connections.
         */
        this.offlineCauses = new Set();
        this.connectivityMonitor = connectivityMonitor;
        this.connectivityMonitor.addCallback(function (_) {
            asyncQueue.enqueueAndForget(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                return tslib.__generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            if (!this.canUseNetwork()) return [3 /*break*/, 2];
                            logDebug(LOG_TAG$7, 'Restarting streams for network reachability change.');
                            return [4 /*yield*/, this.restartNetwork()];
                        case 1:
                            _e.sent();
                            _e.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            }); });
        });
        this.onlineStateTracker = new OnlineStateTracker(asyncQueue, onlineStateHandler);
        // Create streams (but note they're not started yet).
        this.watchStream = newPersistentWatchStream(this.datastore, asyncQueue, {
            onOpen: this.onWatchStreamOpen.bind(this),
            onClose: this.onWatchStreamClose.bind(this),
            onWatchChange: this.onWatchStreamChange.bind(this)
        });
        this.writeStream = newPersistentWriteStream(this.datastore, asyncQueue, {
            onOpen: this.onWriteStreamOpen.bind(this),
            onClose: this.onWriteStreamClose.bind(this),
            onHandshakeComplete: this.onWriteHandshakeComplete.bind(this),
            onMutationResult: this.onMutationResult.bind(this)
        });
    }
    /**
     * Starts up the remote store, creating streams, restoring state from
     * LocalStore, etc.
     */
    RemoteStore.prototype.start = function () {
        return this.enableNetwork();
    };
    /** Re-enables the network. Idempotent. */
    RemoteStore.prototype.enableNetwork = function () {
        this.offlineCauses.delete(0 /* UserDisabled */);
        return this.enableNetworkInternal();
    };
    RemoteStore.prototype.enableNetworkInternal = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!this.canUseNetwork()) return [3 /*break*/, 2];
                        if (this.shouldStartWatchStream()) {
                            this.startWatchStream();
                        }
                        else {
                            this.onlineStateTracker.set("Unknown" /* Unknown */);
                        }
                        // This will start the write stream if necessary.
                        return [4 /*yield*/, this.fillWritePipeline()];
                    case 1:
                        // This will start the write stream if necessary.
                        _e.sent();
                        _e.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Temporarily disables the network. The network can be re-enabled using
     * enableNetwork().
     */
    RemoteStore.prototype.disableNetwork = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.offlineCauses.add(0 /* UserDisabled */);
                        return [4 /*yield*/, this.disableNetworkInternal()];
                    case 1:
                        _e.sent();
                        // Set the OnlineState to Offline so get()s return from cache, etc.
                        this.onlineStateTracker.set("Offline" /* Offline */);
                        return [2 /*return*/];
                }
            });
        });
    };
    RemoteStore.prototype.disableNetworkInternal = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0: return [4 /*yield*/, this.writeStream.stop()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, this.watchStream.stop()];
                    case 2:
                        _e.sent();
                        if (this.writePipeline.length > 0) {
                            logDebug(LOG_TAG$7, "Stopping write stream with " + this.writePipeline.length + " pending writes");
                            this.writePipeline = [];
                        }
                        this.cleanUpWatchStreamState();
                        return [2 /*return*/];
                }
            });
        });
    };
    RemoteStore.prototype.shutdown = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        logDebug(LOG_TAG$7, 'RemoteStore shutting down.');
                        this.offlineCauses.add(5 /* Shutdown */);
                        return [4 /*yield*/, this.disableNetworkInternal()];
                    case 1:
                        _e.sent();
                        this.connectivityMonitor.shutdown();
                        // Set the OnlineState to Unknown (rather than Offline) to avoid potentially
                        // triggering spurious listener events with cached data, etc.
                        this.onlineStateTracker.set("Unknown" /* Unknown */);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Starts new listen for the given target. Uses resume token if provided. It
     * is a no-op if the target of given `TargetData` is already being listened to.
     */
    RemoteStore.prototype.listen = function (targetData) {
        if (this.listenTargets.has(targetData.targetId)) {
            return;
        }
        // Mark this as something the client is currently listening for.
        this.listenTargets.set(targetData.targetId, targetData);
        if (this.shouldStartWatchStream()) {
            // The listen will be sent in onWatchStreamOpen
            this.startWatchStream();
        }
        else if (this.watchStream.isOpen()) {
            this.sendWatchRequest(targetData);
        }
    };
    /**
     * Removes the listen from server. It is a no-op if the given target id is
     * not being listened to.
     */
    RemoteStore.prototype.unlisten = function (targetId) {
        this.listenTargets.delete(targetId);
        if (this.watchStream.isOpen()) {
            this.sendUnwatchRequest(targetId);
        }
        if (this.listenTargets.size === 0) {
            if (this.watchStream.isOpen()) {
                this.watchStream.markIdle();
            }
            else if (this.canUseNetwork()) {
                // Revert to OnlineState.Unknown if the watch stream is not open and we
                // have no listeners, since without any listens to send we cannot
                // confirm if the stream is healthy and upgrade to OnlineState.Online.
                this.onlineStateTracker.set("Unknown" /* Unknown */);
            }
        }
    };
    /** {@link TargetMetadataProvider.getTargetDataForTarget} */
    RemoteStore.prototype.getTargetDataForTarget = function (targetId) {
        return this.listenTargets.get(targetId) || null;
    };
    /** {@link TargetMetadataProvider.getRemoteKeysForTarget} */
    RemoteStore.prototype.getRemoteKeysForTarget = function (targetId) {
        return this.syncEngine.getRemoteKeysForTarget(targetId);
    };
    /**
     * We need to increment the the expected number of pending responses we're due
     * from watch so we wait for the ack to process any messages from this target.
     */
    RemoteStore.prototype.sendWatchRequest = function (targetData) {
        this.watchChangeAggregator.recordPendingTargetRequest(targetData.targetId);
        this.watchStream.watch(targetData);
    };
    /**
     * We need to increment the expected number of pending responses we're due
     * from watch so we wait for the removal on the server before we process any
     * messages from this target.
     */
    RemoteStore.prototype.sendUnwatchRequest = function (targetId) {
        this.watchChangeAggregator.recordPendingTargetRequest(targetId);
        this.watchStream.unwatch(targetId);
    };
    RemoteStore.prototype.startWatchStream = function () {
        this.watchChangeAggregator = new WatchChangeAggregator(this);
        this.watchStream.start();
        this.onlineStateTracker.handleWatchStreamStart();
    };
    /**
     * Returns whether the watch stream should be started because it's necessary
     * and has not yet been started.
     */
    RemoteStore.prototype.shouldStartWatchStream = function () {
        return (this.canUseNetwork() &&
            !this.watchStream.isStarted() &&
            this.listenTargets.size > 0);
    };
    RemoteStore.prototype.canUseNetwork = function () {
        return this.offlineCauses.size === 0;
    };
    RemoteStore.prototype.cleanUpWatchStreamState = function () {
        this.watchChangeAggregator = null;
    };
    RemoteStore.prototype.onWatchStreamOpen = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib.__generator(this, function (_e) {
                this.listenTargets.forEach(function (targetData, targetId) {
                    _this.sendWatchRequest(targetData);
                });
                return [2 /*return*/];
            });
        });
    };
    RemoteStore.prototype.onWatchStreamClose = function (error) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                this.cleanUpWatchStreamState();
                // If we still need the watch stream, retry the connection.
                if (this.shouldStartWatchStream()) {
                    this.onlineStateTracker.handleWatchStreamFailure(error);
                    this.startWatchStream();
                }
                else {
                    // No need to restart watch stream because there are no active targets.
                    // The online state is set to unknown because there is no active attempt
                    // at establishing a connection
                    this.onlineStateTracker.set("Unknown" /* Unknown */);
                }
                return [2 /*return*/];
            });
        });
    };
    RemoteStore.prototype.onWatchStreamChange = function (watchChange, snapshotVersion) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var e_6, lastRemoteSnapshotVersion, e_7;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        // Mark the client as online since we got a message from the server
                        this.onlineStateTracker.set("Online" /* Online */);
                        if (!(watchChange instanceof WatchTargetChange &&
                            watchChange.state === 2 /* Removed */ &&
                            watchChange.cause)) return [3 /*break*/, 6];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 5]);
                        return [4 /*yield*/, this.handleTargetError(watchChange)];
                    case 2:
                        _e.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        e_6 = _e.sent();
                        logDebug(LOG_TAG$7, 'Failed to remove targets %s: %s ', watchChange.targetIds.join(','), e_6);
                        return [4 /*yield*/, this.disableNetworkUntilRecovery(e_6)];
                    case 4:
                        _e.sent();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                    case 6:
                        if (watchChange instanceof DocumentWatchChange) {
                            this.watchChangeAggregator.handleDocumentChange(watchChange);
                        }
                        else if (watchChange instanceof ExistenceFilterChange) {
                            this.watchChangeAggregator.handleExistenceFilter(watchChange);
                        }
                        else {
                            this.watchChangeAggregator.handleTargetChange(watchChange);
                        }
                        if (!!snapshotVersion.isEqual(SnapshotVersion.min())) return [3 /*break*/, 13];
                        _e.label = 7;
                    case 7:
                        _e.trys.push([7, 11, , 13]);
                        return [4 /*yield*/, this.localStore.getLastRemoteSnapshotVersion()];
                    case 8:
                        lastRemoteSnapshotVersion = _e.sent();
                        if (!(snapshotVersion.compareTo(lastRemoteSnapshotVersion) >= 0)) return [3 /*break*/, 10];
                        // We have received a target change with a global snapshot if the snapshot
                        // version is not equal to SnapshotVersion.min().
                        return [4 /*yield*/, this.raiseWatchSnapshot(snapshotVersion)];
                    case 9:
                        // We have received a target change with a global snapshot if the snapshot
                        // version is not equal to SnapshotVersion.min().
                        _e.sent();
                        _e.label = 10;
                    case 10: return [3 /*break*/, 13];
                    case 11:
                        e_7 = _e.sent();
                        logDebug(LOG_TAG$7, 'Failed to raise snapshot:', e_7);
                        return [4 /*yield*/, this.disableNetworkUntilRecovery(e_7)];
                    case 12:
                        _e.sent();
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Recovery logic for IndexedDB errors that takes the network offline until
     * `op` succeeds. Retries are scheduled with backoff using
     * `enqueueRetryable()`. If `op()` is not provided, IndexedDB access is
     * validated via a generic operation.
     *
     * The returned Promise is resolved once the network is disabled and before
     * any retry attempt.
     */
    RemoteStore.prototype.disableNetworkUntilRecovery = function (e, op) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!isIndexedDbTransactionError(e)) return [3 /*break*/, 2];
                        this.offlineCauses.add(1 /* IndexedDbFailed */);
                        // Disable network and raise offline snapshots
                        return [4 /*yield*/, this.disableNetworkInternal()];
                    case 1:
                        // Disable network and raise offline snapshots
                        _e.sent();
                        this.onlineStateTracker.set("Offline" /* Offline */);
                        if (!op) {
                            // Use a simple read operation to determine if IndexedDB recovered.
                            // Ideally, we would expose a health check directly on SimpleDb, but
                            // RemoteStore only has access to persistence through LocalStore.
                            op = function () { return _this.localStore.getLastRemoteSnapshotVersion(); };
                        }
                        // Probe IndexedDB periodically and re-enable network
                        this.asyncQueue.enqueueRetryable(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                            return tslib.__generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        logDebug(LOG_TAG$7, 'Retrying IndexedDB access');
                                        return [4 /*yield*/, op()];
                                    case 1:
                                        _e.sent();
                                        this.offlineCauses.delete(1 /* IndexedDbFailed */);
                                        return [4 /*yield*/, this.enableNetworkInternal()];
                                    case 2:
                                        _e.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        return [3 /*break*/, 3];
                    case 2: throw e;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executes `op`. If `op` fails, takes the network offline until `op`
     * succeeds. Returns after the first attempt.
     */
    RemoteStore.prototype.executeWithRecovery = function (op) {
        var _this = this;
        return op().catch(function (e) { return _this.disableNetworkUntilRecovery(e, op); });
    };
    /**
     * Takes a batch of changes from the Datastore, repackages them as a
     * RemoteEvent, and passes that on to the listener, which is typically the
     * SyncEngine.
     */
    RemoteStore.prototype.raiseWatchSnapshot = function (snapshotVersion) {
        var _this = this;
        var remoteEvent = this.watchChangeAggregator.createRemoteEvent(snapshotVersion);
        // Update in-memory resume tokens. LocalStore will update the
        // persistent view of these when applying the completed RemoteEvent.
        remoteEvent.targetChanges.forEach(function (change, targetId) {
            if (change.resumeToken.approximateByteSize() > 0) {
                var targetData = _this.listenTargets.get(targetId);
                // A watched target might have been removed already.
                if (targetData) {
                    _this.listenTargets.set(targetId, targetData.withResumeToken(change.resumeToken, snapshotVersion));
                }
            }
        });
        // Re-establish listens for the targets that have been invalidated by
        // existence filter mismatches.
        remoteEvent.targetMismatches.forEach(function (targetId) {
            var targetData = _this.listenTargets.get(targetId);
            if (!targetData) {
                // A watched target might have been removed already.
                return;
            }
            // Clear the resume token for the target, since we're in a known mismatch
            // state.
            _this.listenTargets.set(targetId, targetData.withResumeToken(ByteString.EMPTY_BYTE_STRING, targetData.snapshotVersion));
            // Cause a hard reset by unwatching and rewatching immediately, but
            // deliberately don't send a resume token so that we get a full update.
            _this.sendUnwatchRequest(targetId);
            // Mark the target we send as being on behalf of an existence filter
            // mismatch, but don't actually retain that in listenTargets. This ensures
            // that we flag the first re-listen this way without impacting future
            // listens of this target (that might happen e.g. on reconnect).
            var requestTargetData = new TargetData(targetData.target, targetId, 1 /* ExistenceFilterMismatch */, targetData.sequenceNumber);
            _this.sendWatchRequest(requestTargetData);
        });
        // Finally raise remote event
        return this.syncEngine.applyRemoteEvent(remoteEvent);
    };
    /** Handles an error on a target */
    RemoteStore.prototype.handleTargetError = function (watchChange) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var error, _i, _e, targetId;
            return tslib.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        error = watchChange.cause;
                        _i = 0, _e = watchChange.targetIds;
                        _f.label = 1;
                    case 1:
                        if (!(_i < _e.length)) return [3 /*break*/, 4];
                        targetId = _e[_i];
                        if (!this.listenTargets.has(targetId)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.syncEngine.rejectListen(targetId, error)];
                    case 2:
                        _f.sent();
                        this.listenTargets.delete(targetId);
                        this.watchChangeAggregator.removeTarget(targetId);
                        _f.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Attempts to fill our write pipeline with writes from the LocalStore.
     *
     * Called internally to bootstrap or refill the write pipeline and by
     * SyncEngine whenever there are new mutations to process.
     *
     * Starts the write stream if necessary.
     */
    RemoteStore.prototype.fillWritePipeline = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var lastBatchIdRetrieved, batch, e_8;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        lastBatchIdRetrieved = this.writePipeline.length > 0
                            ? this.writePipeline[this.writePipeline.length - 1].batchId
                            : BATCHID_UNKNOWN;
                        _e.label = 1;
                    case 1:
                        if (!this.canAddToWritePipeline()) return [3 /*break*/, 7];
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 4, , 6]);
                        return [4 /*yield*/, this.localStore.nextMutationBatch(lastBatchIdRetrieved)];
                    case 3:
                        batch = _e.sent();
                        if (batch === null) {
                            if (this.writePipeline.length === 0) {
                                this.writeStream.markIdle();
                            }
                            return [3 /*break*/, 7];
                        }
                        else {
                            lastBatchIdRetrieved = batch.batchId;
                            this.addToWritePipeline(batch);
                        }
                        return [3 /*break*/, 6];
                    case 4:
                        e_8 = _e.sent();
                        return [4 /*yield*/, this.disableNetworkUntilRecovery(e_8)];
                    case 5:
                        _e.sent();
                        return [3 /*break*/, 6];
                    case 6: return [3 /*break*/, 1];
                    case 7:
                        if (this.shouldStartWriteStream()) {
                            this.startWriteStream();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Returns true if we can add to the write pipeline (i.e. the network is
     * enabled and the write pipeline is not full).
     */
    RemoteStore.prototype.canAddToWritePipeline = function () {
        return (this.canUseNetwork() && this.writePipeline.length < MAX_PENDING_WRITES);
    };
    // For testing
    RemoteStore.prototype.outstandingWrites = function () {
        return this.writePipeline.length;
    };
    /**
     * Queues additional writes to be sent to the write stream, sending them
     * immediately if the write stream is established.
     */
    RemoteStore.prototype.addToWritePipeline = function (batch) {
        this.writePipeline.push(batch);
        if (this.writeStream.isOpen() && this.writeStream.handshakeComplete) {
            this.writeStream.writeMutations(batch.mutations);
        }
    };
    RemoteStore.prototype.shouldStartWriteStream = function () {
        return (this.canUseNetwork() &&
            !this.writeStream.isStarted() &&
            this.writePipeline.length > 0);
    };
    RemoteStore.prototype.startWriteStream = function () {
        this.writeStream.start();
    };
    RemoteStore.prototype.onWriteStreamOpen = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                this.writeStream.writeHandshake();
                return [2 /*return*/];
            });
        });
    };
    RemoteStore.prototype.onWriteHandshakeComplete = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var _i, _e, batch;
            return tslib.__generator(this, function (_f) {
                // Send the write pipeline now that the stream is established.
                for (_i = 0, _e = this.writePipeline; _i < _e.length; _i++) {
                    batch = _e[_i];
                    this.writeStream.writeMutations(batch.mutations);
                }
                return [2 /*return*/];
            });
        });
    };
    RemoteStore.prototype.onMutationResult = function (commitVersion, results) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var batch, success;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        batch = this.writePipeline.shift();
                        success = MutationBatchResult.from(batch, commitVersion, results);
                        return [4 /*yield*/, this.executeWithRecovery(function () { return _this.syncEngine.applySuccessfulWrite(success); })];
                    case 1:
                        _e.sent();
                        // It's possible that with the completion of this mutation another
                        // slot has freed up.
                        return [4 /*yield*/, this.fillWritePipeline()];
                    case 2:
                        // It's possible that with the completion of this mutation another
                        // slot has freed up.
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RemoteStore.prototype.onWriteStreamClose = function (error) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!(error && this.writeStream.handshakeComplete)) return [3 /*break*/, 2];
                        // This error affects the actual write.
                        return [4 /*yield*/, this.handleWriteError(error)];
                    case 1:
                        // This error affects the actual write.
                        _e.sent();
                        _e.label = 2;
                    case 2:
                        // The write stream might have been started by refilling the write
                        // pipeline for failed writes
                        if (this.shouldStartWriteStream()) {
                            this.startWriteStream();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    RemoteStore.prototype.handleWriteError = function (error) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var batch_1;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!isPermanentWriteError(error.code)) return [3 /*break*/, 3];
                        batch_1 = this.writePipeline.shift();
                        // In this case it's also unlikely that the server itself is melting
                        // down -- this was just a bad request so inhibit backoff on the next
                        // restart.
                        this.writeStream.inhibitBackoff();
                        return [4 /*yield*/, this.executeWithRecovery(function () { return _this.syncEngine.rejectFailedWrite(batch_1.batchId, error); })];
                    case 1:
                        _e.sent();
                        // It's possible that with the completion of this mutation
                        // another slot has freed up.
                        return [4 /*yield*/, this.fillWritePipeline()];
                    case 2:
                        // It's possible that with the completion of this mutation
                        // another slot has freed up.
                        _e.sent();
                        _e.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    RemoteStore.prototype.restartNetwork = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.offlineCauses.add(4 /* ConnectivityChange */);
                        return [4 /*yield*/, this.disableNetworkInternal()];
                    case 1:
                        _e.sent();
                        this.onlineStateTracker.set("Unknown" /* Unknown */);
                        this.writeStream.inhibitBackoff();
                        this.watchStream.inhibitBackoff();
                        this.offlineCauses.delete(4 /* ConnectivityChange */);
                        return [4 /*yield*/, this.enableNetworkInternal()];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    RemoteStore.prototype.handleCredentialChange = function (user) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.asyncQueue.verifyOperationInProgress();
                        // Tear down and re-create our network streams. This will ensure we get a
                        // fresh auth token for the new user and re-fill the write pipeline with
                        // new mutations from the LocalStore (since mutations are per-user).
                        logDebug(LOG_TAG$7, 'RemoteStore received new credentials');
                        this.offlineCauses.add(3 /* CredentialChange */);
                        return [4 /*yield*/, this.disableNetworkInternal()];
                    case 1:
                        _e.sent();
                        this.onlineStateTracker.set("Unknown" /* Unknown */);
                        return [4 /*yield*/, this.syncEngine.handleCredentialChange(user)];
                    case 2:
                        _e.sent();
                        this.offlineCauses.delete(3 /* CredentialChange */);
                        return [4 /*yield*/, this.enableNetworkInternal()];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Toggles the network state when the client gains or loses its primary lease.
     */
    RemoteStore.prototype.applyPrimaryState = function (isPrimary) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (!isPrimary) return [3 /*break*/, 2];
                        this.offlineCauses.delete(2 /* IsSecondary */);
                        return [4 /*yield*/, this.enableNetworkInternal()];
                    case 1:
                        _e.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        if (!!isPrimary) return [3 /*break*/, 4];
                        this.offlineCauses.add(2 /* IsSecondary */);
                        return [4 /*yield*/, this.disableNetworkInternal()];
                    case 3:
                        _e.sent();
                        this.onlineStateTracker.set("Unknown" /* Unknown */);
                        _e.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return RemoteStore;
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
 * Holds the listeners and the last received ViewSnapshot for a query being
 * tracked by EventManager.
 */
var QueryListenersInfo = /** @class */ (function () {
    function QueryListenersInfo() {
        this.viewSnap = undefined;
        this.listeners = [];
    }
    return QueryListenersInfo;
}());
/**
 * EventManager is responsible for mapping queries to query event emitters.
 * It handles "fan-out". -- Identical queries will re-use the same watch on the
 * backend.
 */
var EventManager = /** @class */ (function () {
    function EventManager(syncEngine) {
        this.syncEngine = syncEngine;
        this.queries = new ObjectMap(function (q) { return canonifyQuery(q); }, queryEquals);
        this.onlineState = "Unknown" /* Unknown */;
        this.snapshotsInSyncListeners = new Set();
        this.syncEngine.subscribe(this);
    }
    EventManager.prototype.listen = function (listener) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var query, firstListen, queryInfo, _e, e_9, firestoreError, raisedEvent, raisedEvent_1;
            return tslib.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        query = listener.query;
                        firstListen = false;
                        queryInfo = this.queries.get(query);
                        if (!queryInfo) {
                            firstListen = true;
                            queryInfo = new QueryListenersInfo();
                        }
                        if (!firstListen) return [3 /*break*/, 4];
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        _e = queryInfo;
                        return [4 /*yield*/, this.syncEngine.listen(query)];
                    case 2:
                        _e.viewSnap = _f.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_9 = _f.sent();
                        firestoreError = wrapInUserErrorIfRecoverable(e_9, "Initialization of query '" + stringifyQuery(listener.query) + "' failed");
                        listener.onError(firestoreError);
                        return [2 /*return*/];
                    case 4:
                        this.queries.set(query, queryInfo);
                        queryInfo.listeners.push(listener);
                        raisedEvent = listener.applyOnlineStateChange(this.onlineState);
                        if (queryInfo.viewSnap) {
                            raisedEvent_1 = listener.onViewSnapshot(queryInfo.viewSnap);
                            if (raisedEvent_1) {
                                this.raiseSnapshotsInSyncEvent();
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    EventManager.prototype.unlisten = function (listener) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var query, lastListen, queryInfo, i;
            return tslib.__generator(this, function (_e) {
                query = listener.query;
                lastListen = false;
                queryInfo = this.queries.get(query);
                if (queryInfo) {
                    i = queryInfo.listeners.indexOf(listener);
                    if (i >= 0) {
                        queryInfo.listeners.splice(i, 1);
                        lastListen = queryInfo.listeners.length === 0;
                    }
                }
                if (lastListen) {
                    this.queries.delete(query);
                    return [2 /*return*/, this.syncEngine.unlisten(query)];
                }
                return [2 /*return*/];
            });
        });
    };
    EventManager.prototype.onWatchChange = function (viewSnaps) {
        var raisedEvent = false;
        for (var _i = 0, viewSnaps_1 = viewSnaps; _i < viewSnaps_1.length; _i++) {
            var viewSnap = viewSnaps_1[_i];
            var query = viewSnap.query;
            var queryInfo = this.queries.get(query);
            if (queryInfo) {
                for (var _e = 0, _f = queryInfo.listeners; _e < _f.length; _e++) {
                    var listener = _f[_e];
                    if (listener.onViewSnapshot(viewSnap)) {
                        raisedEvent = true;
                    }
                }
                queryInfo.viewSnap = viewSnap;
            }
        }
        if (raisedEvent) {
            this.raiseSnapshotsInSyncEvent();
        }
    };
    EventManager.prototype.onWatchError = function (query, error) {
        var queryInfo = this.queries.get(query);
        if (queryInfo) {
            for (var _i = 0, _e = queryInfo.listeners; _i < _e.length; _i++) {
                var listener = _e[_i];
                listener.onError(error);
            }
        }
        // Remove all listeners. NOTE: We don't need to call syncEngine.unlisten()
        // after an error.
        this.queries.delete(query);
    };
    EventManager.prototype.onOnlineStateChange = function (onlineState) {
        this.onlineState = onlineState;
        var raisedEvent = false;
        this.queries.forEach(function (_, queryInfo) {
            for (var _i = 0, _e = queryInfo.listeners; _i < _e.length; _i++) {
                var listener = _e[_i];
                // Run global snapshot listeners if a consistent snapshot has been emitted.
                if (listener.applyOnlineStateChange(onlineState)) {
                    raisedEvent = true;
                }
            }
        });
        if (raisedEvent) {
            this.raiseSnapshotsInSyncEvent();
        }
    };
    EventManager.prototype.addSnapshotsInSyncListener = function (observer) {
        this.snapshotsInSyncListeners.add(observer);
        // Immediately fire an initial event, indicating all existing listeners
        // are in-sync.
        observer.next();
    };
    EventManager.prototype.removeSnapshotsInSyncListener = function (observer) {
        this.snapshotsInSyncListeners.delete(observer);
    };
    // Call all global snapshot listeners that have been set.
    EventManager.prototype.raiseSnapshotsInSyncEvent = function () {
        this.snapshotsInSyncListeners.forEach(function (observer) {
            observer.next();
        });
    };
    return EventManager;
}());
/**
 * QueryListener takes a series of internal view snapshots and determines
 * when to raise the event.
 *
 * It uses an Observer to dispatch events.
 */
var QueryListener = /** @class */ (function () {
    function QueryListener(query, queryObserver, options) {
        this.query = query;
        this.queryObserver = queryObserver;
        /**
         * Initial snapshots (e.g. from cache) may not be propagated to the wrapped
         * observer. This flag is set to true once we've actually raised an event.
         */
        this.raisedInitialEvent = false;
        this.snap = null;
        this.onlineState = "Unknown" /* Unknown */;
        this.options = options || {};
    }
    /**
     * Applies the new ViewSnapshot to this listener, raising a user-facing event
     * if applicable (depending on what changed, whether the user has opted into
     * metadata-only changes, etc.). Returns true if a user-facing event was
     * indeed raised.
     */
    QueryListener.prototype.onViewSnapshot = function (snap) {
        if (!this.options.includeMetadataChanges) {
            // Remove the metadata only changes.
            var docChanges = [];
            for (var _i = 0, _e = snap.docChanges; _i < _e.length; _i++) {
                var docChange = _e[_i];
                if (docChange.type !== 3 /* Metadata */) {
                    docChanges.push(docChange);
                }
            }
            snap = new ViewSnapshot(snap.query, snap.docs, snap.oldDocs, docChanges, snap.mutatedKeys, snap.fromCache, snap.syncStateChanged, 
            /* excludesMetadataChanges= */ true);
        }
        var raisedEvent = false;
        if (!this.raisedInitialEvent) {
            if (this.shouldRaiseInitialEvent(snap, this.onlineState)) {
                this.raiseInitialEvent(snap);
                raisedEvent = true;
            }
        }
        else if (this.shouldRaiseEvent(snap)) {
            this.queryObserver.next(snap);
            raisedEvent = true;
        }
        this.snap = snap;
        return raisedEvent;
    };
    QueryListener.prototype.onError = function (error) {
        this.queryObserver.error(error);
    };
    /** Returns whether a snapshot was raised. */
    QueryListener.prototype.applyOnlineStateChange = function (onlineState) {
        this.onlineState = onlineState;
        var raisedEvent = false;
        if (this.snap &&
            !this.raisedInitialEvent &&
            this.shouldRaiseInitialEvent(this.snap, onlineState)) {
            this.raiseInitialEvent(this.snap);
            raisedEvent = true;
        }
        return raisedEvent;
    };
    QueryListener.prototype.shouldRaiseInitialEvent = function (snap, onlineState) {
        // Always raise the first event when we're synced
        if (!snap.fromCache) {
            return true;
        }
        // NOTE: We consider OnlineState.Unknown as online (it should become Offline
        // or Online if we wait long enough).
        var maybeOnline = onlineState !== "Offline" /* Offline */;
        // Don't raise the event if we're online, aren't synced yet (checked
        // above) and are waiting for a sync.
        if (this.options.waitForSyncWhenOnline && maybeOnline) {
            return false;
        }
        // Raise data from cache if we have any documents or we are offline
        return !snap.docs.isEmpty() || onlineState === "Offline" /* Offline */;
    };
    QueryListener.prototype.shouldRaiseEvent = function (snap) {
        // We don't need to handle includeDocumentMetadataChanges here because
        // the Metadata only changes have already been stripped out if needed.
        // At this point the only changes we will see are the ones we should
        // propagate.
        if (snap.docChanges.length > 0) {
            return true;
        }
        var hasPendingWritesChanged = this.snap && this.snap.hasPendingWrites !== snap.hasPendingWrites;
        if (snap.syncStateChanged || hasPendingWritesChanged) {
            return this.options.includeMetadataChanges === true;
        }
        // Generally we should have hit one of the cases above, but it's possible
        // to get here if there were only metadata docChanges and they got
        // stripped out.
        return false;
    };
    QueryListener.prototype.raiseInitialEvent = function (snap) {
        snap = ViewSnapshot.fromInitialDocuments(snap.query, snap.docs, snap.mutatedKeys, snap.fromCache);
        this.raisedInitialEvent = true;
        this.queryObserver.next(snap);
    };
    return QueryListener;
}());
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
 */
var IndexFreeQueryEngine = /** @class */ (function () {
    function IndexFreeQueryEngine() {
    }
    IndexFreeQueryEngine.prototype.setLocalDocumentsView = function (localDocuments) {
        this.localDocumentsView = localDocuments;
    };
    IndexFreeQueryEngine.prototype.getDocumentsMatchingQuery = function (transaction, query, lastLimboFreeSnapshotVersion, remoteKeys) {
        var _this = this;
        // Queries that match all documents don't benefit from using
        // IndexFreeQueries. It is more efficient to scan all documents in a
        // collection, rather than to perform individual lookups.
        if (query.matchesAllDocuments()) {
            return this.executeFullCollectionScan(transaction, query);
        }
        // Queries that have never seen a snapshot without limbo free documents
        // should also be run as a full collection scan.
        if (lastLimboFreeSnapshotVersion.isEqual(SnapshotVersion.min())) {
            return this.executeFullCollectionScan(transaction, query);
        }
        return this.localDocumentsView.getDocuments(transaction, remoteKeys).next(function (documents) {
            var previousResults = _this.applyQuery(query, documents);
            if ((query.hasLimitToFirst() || query.hasLimitToLast()) &&
                _this.needsRefill(query.limitType, previousResults, remoteKeys, lastLimboFreeSnapshotVersion)) {
                return _this.executeFullCollectionScan(transaction, query);
            }
            if (getLogLevel() <= logger.LogLevel.DEBUG) {
                logDebug('IndexFreeQueryEngine', 'Re-using previous result from %s to execute query: %s', lastLimboFreeSnapshotVersion.toString(), stringifyQuery(query));
            }
            // Retrieve all results for documents that were updated since the last
            // limbo-document free remote snapshot.
            return _this.localDocumentsView.getDocumentsMatchingQuery(transaction, query, lastLimboFreeSnapshotVersion).next(function (updatedResults) {
                // We merge `previousResults` into `updateResults`, since
                // `updateResults` is already a DocumentMap. If a document is
                // contained in both lists, then its contents are the same.
                previousResults.forEach(function (doc) {
                    updatedResults = updatedResults.insert(doc.key, doc);
                });
                return updatedResults;
            });
        });
    };
    /** Applies the query filter and sorting to the provided documents.  */
    IndexFreeQueryEngine.prototype.applyQuery = function (query, documents) {
        // Sort the documents and re-apply the query filter since previously
        // matching documents do not necessarily still match the query.
        var queryResults = new SortedSet(newQueryComparator(query));
        documents.forEach(function (_, maybeDoc) {
            if (maybeDoc instanceof Document && queryMatches(query, maybeDoc)) {
                queryResults = queryResults.add(maybeDoc);
            }
        });
        return queryResults;
    };
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
    IndexFreeQueryEngine.prototype.needsRefill = function (limitType, sortedPreviousResults, remoteKeys, limboFreeSnapshotVersion) {
        // The query needs to be refilled if a previously matching document no
        // longer matches.
        if (remoteKeys.size !== sortedPreviousResults.size) {
            return true;
        }
        // Limit queries are not eligible for index-free query execution if there is
        // a potential that an older document from cache now sorts before a document
        // that was previously part of the limit. This, however, can only happen if
        // the document at the edge of the limit goes out of limit.
        // If a document that is not the limit boundary sorts differently,
        // the boundary of the limit itself did not change and documents from cache
        // will continue to be "rejected" by this boundary. Therefore, we can ignore
        // any modifications that don't affect the last document.
        var docAtLimitEdge = limitType === "F" /* First */
            ? sortedPreviousResults.last()
            : sortedPreviousResults.first();
        if (!docAtLimitEdge) {
            // We don't need to refill the query if there were already no documents.
            return false;
        }
        return (docAtLimitEdge.hasPendingWrites ||
            docAtLimitEdge.version.compareTo(limboFreeSnapshotVersion) > 0);
    };
    IndexFreeQueryEngine.prototype.executeFullCollectionScan = function (transaction, query) {
        if (getLogLevel() <= logger.LogLevel.DEBUG) {
            logDebug('IndexFreeQueryEngine', 'Using full collection scan to execute query:', stringifyQuery(query));
        }
        return this.localDocumentsView.getDocumentsMatchingQuery(transaction, query, SnapshotVersion.min());
    };
    return IndexFreeQueryEngine;
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
var MemoryMutationQueue = /** @class */ (function () {
    function MemoryMutationQueue(indexManager, referenceDelegate) {
        this.indexManager = indexManager;
        this.referenceDelegate = referenceDelegate;
        /**
         * The set of all mutations that have been sent but not yet been applied to
         * the backend.
         */
        this.mutationQueue = [];
        /** Next value to use when assigning sequential IDs to each mutation batch. */
        this.nextBatchId = 1;
        /** An ordered mapping between documents and the mutations batch IDs. */
        this.batchesByDocumentKey = new SortedSet(DocReference.compareByKey);
    }
    MemoryMutationQueue.prototype.checkEmpty = function (transaction) {
        return PersistencePromise.resolve(this.mutationQueue.length === 0);
    };
    MemoryMutationQueue.prototype.addMutationBatch = function (transaction, localWriteTime, baseMutations, mutations) {
        var batchId = this.nextBatchId;
        this.nextBatchId++;
        if (this.mutationQueue.length > 0) {
            var prior = this.mutationQueue[this.mutationQueue.length - 1];
        }
        var batch = new MutationBatch(batchId, localWriteTime, baseMutations, mutations);
        this.mutationQueue.push(batch);
        // Track references by document key and index collection parents.
        for (var _i = 0, mutations_2 = mutations; _i < mutations_2.length; _i++) {
            var mutation = mutations_2[_i];
            this.batchesByDocumentKey = this.batchesByDocumentKey.add(new DocReference(mutation.key, batchId));
            this.indexManager.addToCollectionParentIndex(transaction, mutation.key.path.popLast());
        }
        return PersistencePromise.resolve(batch);
    };
    MemoryMutationQueue.prototype.lookupMutationBatch = function (transaction, batchId) {
        return PersistencePromise.resolve(this.findMutationBatch(batchId));
    };
    MemoryMutationQueue.prototype.getNextMutationBatchAfterBatchId = function (transaction, batchId) {
        var nextBatchId = batchId + 1;
        // The requested batchId may still be out of range so normalize it to the
        // start of the queue.
        var rawIndex = this.indexOfBatchId(nextBatchId);
        var index = rawIndex < 0 ? 0 : rawIndex;
        return PersistencePromise.resolve(this.mutationQueue.length > index ? this.mutationQueue[index] : null);
    };
    MemoryMutationQueue.prototype.getHighestUnacknowledgedBatchId = function () {
        return PersistencePromise.resolve(this.mutationQueue.length === 0 ? BATCHID_UNKNOWN : this.nextBatchId - 1);
    };
    MemoryMutationQueue.prototype.getAllMutationBatches = function (transaction) {
        return PersistencePromise.resolve(this.mutationQueue.slice());
    };
    MemoryMutationQueue.prototype.getAllMutationBatchesAffectingDocumentKey = function (transaction, documentKey) {
        var _this = this;
        var start = new DocReference(documentKey, 0);
        var end = new DocReference(documentKey, Number.POSITIVE_INFINITY);
        var result = [];
        this.batchesByDocumentKey.forEachInRange([start, end], function (ref) {
            var batch = _this.findMutationBatch(ref.targetOrBatchId);
            result.push(batch);
        });
        return PersistencePromise.resolve(result);
    };
    MemoryMutationQueue.prototype.getAllMutationBatchesAffectingDocumentKeys = function (transaction, documentKeys) {
        var _this = this;
        var uniqueBatchIDs = new SortedSet(primitiveComparator);
        documentKeys.forEach(function (documentKey) {
            var start = new DocReference(documentKey, 0);
            var end = new DocReference(documentKey, Number.POSITIVE_INFINITY);
            _this.batchesByDocumentKey.forEachInRange([start, end], function (ref) {
                uniqueBatchIDs = uniqueBatchIDs.add(ref.targetOrBatchId);
            });
        });
        return PersistencePromise.resolve(this.findMutationBatches(uniqueBatchIDs));
    };
    MemoryMutationQueue.prototype.getAllMutationBatchesAffectingQuery = function (transaction, query) {
        // Use the query path as a prefix for testing if a document matches the
        // query.
        var prefix = query.path;
        var immediateChildrenPathLength = prefix.length + 1;
        // Construct a document reference for actually scanning the index. Unlike
        // the prefix the document key in this reference must have an even number of
        // segments. The empty segment can be used a suffix of the query path
        // because it precedes all other segments in an ordered traversal.
        var startPath = prefix;
        if (!DocumentKey.isDocumentKey(startPath)) {
            startPath = startPath.child('');
        }
        var start = new DocReference(new DocumentKey(startPath), 0);
        // Find unique batchIDs referenced by all documents potentially matching the
        // query.
        var uniqueBatchIDs = new SortedSet(primitiveComparator);
        this.batchesByDocumentKey.forEachWhile(function (ref) {
            var rowKeyPath = ref.key.path;
            if (!prefix.isPrefixOf(rowKeyPath)) {
                return false;
            }
            else {
                // Rows with document keys more than one segment longer than the query
                // path can't be matches. For example, a query on 'rooms' can't match
                // the document /rooms/abc/messages/xyx.
                // TODO(mcg): we'll need a different scanner when we implement
                // ancestor queries.
                if (rowKeyPath.length === immediateChildrenPathLength) {
                    uniqueBatchIDs = uniqueBatchIDs.add(ref.targetOrBatchId);
                }
                return true;
            }
        }, start);
        return PersistencePromise.resolve(this.findMutationBatches(uniqueBatchIDs));
    };
    MemoryMutationQueue.prototype.findMutationBatches = function (batchIDs) {
        var _this = this;
        // Construct an array of matching batches, sorted by batchID to ensure that
        // multiple mutations affecting the same document key are applied in order.
        var result = [];
        batchIDs.forEach(function (batchId) {
            var batch = _this.findMutationBatch(batchId);
            if (batch !== null) {
                result.push(batch);
            }
        });
        return result;
    };
    MemoryMutationQueue.prototype.removeMutationBatch = function (transaction, batch) {
        var _this = this;
        // Find the position of the first batch for removal.
        var batchIndex = this.indexOfExistingBatchId(batch.batchId, 'removed');
        hardAssert(batchIndex === 0);
        this.mutationQueue.shift();
        var references = this.batchesByDocumentKey;
        return PersistencePromise.forEach(batch.mutations, function (mutation) {
            var ref = new DocReference(mutation.key, batch.batchId);
            references = references.delete(ref);
            return _this.referenceDelegate.markPotentiallyOrphaned(transaction, mutation.key);
        }).next(function () {
            _this.batchesByDocumentKey = references;
        });
    };
    MemoryMutationQueue.prototype.removeCachedMutationKeys = function (batchId) {
        // No-op since the memory mutation queue does not maintain a separate cache.
    };
    MemoryMutationQueue.prototype.containsKey = function (txn, key) {
        var ref = new DocReference(key, 0);
        var firstRef = this.batchesByDocumentKey.firstAfterOrEqual(ref);
        return PersistencePromise.resolve(key.isEqual(firstRef && firstRef.key));
    };
    MemoryMutationQueue.prototype.performConsistencyCheck = function (txn) {
        if (this.mutationQueue.length === 0)
            ;
        return PersistencePromise.resolve();
    };
    /**
     * Finds the index of the given batchId in the mutation queue and asserts that
     * the resulting index is within the bounds of the queue.
     *
     * @param batchId The batchId to search for
     * @param action A description of what the caller is doing, phrased in passive
     * form (e.g. "acknowledged" in a routine that acknowledges batches).
     */
    MemoryMutationQueue.prototype.indexOfExistingBatchId = function (batchId, action) {
        var index = this.indexOfBatchId(batchId);
        return index;
    };
    /**
     * Finds the index of the given batchId in the mutation queue. This operation
     * is O(1).
     *
     * @return The computed index of the batch with the given batchId, based on
     * the state of the queue. Note this index can be negative if the requested
     * batchId has already been remvoed from the queue or past the end of the
     * queue if the batchId is larger than the last added batch.
     */
    MemoryMutationQueue.prototype.indexOfBatchId = function (batchId) {
        if (this.mutationQueue.length === 0) {
            // As an index this is past the end of the queue
            return 0;
        }
        // Examine the front of the queue to figure out the difference between the
        // batchId and indexes in the array. Note that since the queue is ordered
        // by batchId, if the first batch has a larger batchId then the requested
        // batchId doesn't exist in the queue.
        var firstBatchId = this.mutationQueue[0].batchId;
        return batchId - firstBatchId;
    };
    /**
     * A version of lookupMutationBatch that doesn't return a promise, this makes
     * other functions that uses this code easier to read and more efficent.
     */
    MemoryMutationQueue.prototype.findMutationBatch = function (batchId) {
        var index = this.indexOfBatchId(batchId);
        if (index < 0 || index >= this.mutationQueue.length) {
            return null;
        }
        var batch = this.mutationQueue[index];
        return batch;
    };
    return MemoryMutationQueue;
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
function documentEntryMap() {
    return new SortedMap(DocumentKey.comparator);
}
var MemoryRemoteDocumentCache = /** @class */ (function () {
    /**
     * @param sizer Used to assess the size of a document. For eager GC, this is expected to just
     * return 0 to avoid unnecessarily doing the work of calculating the size.
     */
    function MemoryRemoteDocumentCache(indexManager, sizer) {
        this.indexManager = indexManager;
        this.sizer = sizer;
        /** Underlying cache of documents and their read times. */
        this.docs = documentEntryMap();
        /** Size of all cached documents. */
        this.size = 0;
    }
    /**
     * Adds the supplied entry to the cache and updates the cache size as appropriate.
     *
     * All calls of `addEntry`  are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */
    MemoryRemoteDocumentCache.prototype.addEntry = function (transaction, doc, readTime) {
        var key = doc.key;
        var entry = this.docs.get(key);
        var previousSize = entry ? entry.size : 0;
        var currentSize = this.sizer(doc);
        this.docs = this.docs.insert(key, {
            maybeDocument: doc,
            size: currentSize,
            readTime: readTime
        });
        this.size += currentSize - previousSize;
        return this.indexManager.addToCollectionParentIndex(transaction, key.path.popLast());
    };
    /**
     * Removes the specified entry from the cache and updates the cache size as appropriate.
     *
     * All calls of `removeEntry` are required to go through the RemoteDocumentChangeBuffer
     * returned by `newChangeBuffer()`.
     */
    MemoryRemoteDocumentCache.prototype.removeEntry = function (documentKey) {
        var entry = this.docs.get(documentKey);
        if (entry) {
            this.docs = this.docs.remove(documentKey);
            this.size -= entry.size;
        }
    };
    MemoryRemoteDocumentCache.prototype.getEntry = function (transaction, documentKey) {
        var entry = this.docs.get(documentKey);
        return PersistencePromise.resolve(entry ? entry.maybeDocument : null);
    };
    MemoryRemoteDocumentCache.prototype.getEntries = function (transaction, documentKeys) {
        var _this = this;
        var results = nullableMaybeDocumentMap();
        documentKeys.forEach(function (documentKey) {
            var entry = _this.docs.get(documentKey);
            results = results.insert(documentKey, entry ? entry.maybeDocument : null);
        });
        return PersistencePromise.resolve(results);
    };
    MemoryRemoteDocumentCache.prototype.getDocumentsMatchingQuery = function (transaction, query, sinceReadTime) {
        var results = documentMap();
        // Documents are ordered by key, so we can use a prefix scan to narrow down
        // the documents we need to match the query against.
        var prefix = new DocumentKey(query.path.child(''));
        var iterator = this.docs.getIteratorFrom(prefix);
        while (iterator.hasNext()) {
            var _e = iterator.getNext(), key = _e.key, _f = _e.value, maybeDocument = _f.maybeDocument, readTime = _f.readTime;
            if (!query.path.isPrefixOf(key.path)) {
                break;
            }
            if (readTime.compareTo(sinceReadTime) <= 0) {
                continue;
            }
            if (maybeDocument instanceof Document &&
                queryMatches(query, maybeDocument)) {
                results = results.insert(maybeDocument.key, maybeDocument);
            }
        }
        return PersistencePromise.resolve(results);
    };
    MemoryRemoteDocumentCache.prototype.forEachDocumentKey = function (transaction, f) {
        return PersistencePromise.forEach(this.docs, function (key) { return f(key); });
    };
    MemoryRemoteDocumentCache.prototype.newChangeBuffer = function (options) {
        // `trackRemovals` is ignores since the MemoryRemoteDocumentCache keeps
        // a separate changelog and does not need special handling for removals.
        return new MemoryRemoteDocumentCache.RemoteDocumentChangeBuffer(this);
    };
    MemoryRemoteDocumentCache.prototype.getSize = function (txn) {
        return PersistencePromise.resolve(this.size);
    };
    return MemoryRemoteDocumentCache;
}());
/**
 * Handles the details of adding and updating documents in the MemoryRemoteDocumentCache.
 */
MemoryRemoteDocumentCache.RemoteDocumentChangeBuffer = /** @class */ (function (_super) {
    tslib.__extends(RemoteDocumentChangeBuffer, _super);
    function RemoteDocumentChangeBuffer(documentCache) {
        var _this = _super.call(this) || this;
        _this.documentCache = documentCache;
        return _this;
    }
    RemoteDocumentChangeBuffer.prototype.applyChanges = function (transaction) {
        var _this = this;
        var promises = [];
        this.changes.forEach(function (key, doc) {
            if (doc) {
                promises.push(_this.documentCache.addEntry(transaction, doc, _this.readTime));
            }
            else {
                _this.documentCache.removeEntry(key);
            }
        });
        return PersistencePromise.waitFor(promises);
    };
    RemoteDocumentChangeBuffer.prototype.getFromCache = function (transaction, documentKey) {
        return this.documentCache.getEntry(transaction, documentKey);
    };
    RemoteDocumentChangeBuffer.prototype.getAllFromCache = function (transaction, documentKeys) {
        return this.documentCache.getEntries(transaction, documentKeys);
    };
    return RemoteDocumentChangeBuffer;
}(RemoteDocumentChangeBuffer));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MemoryTargetCache = /** @class */ (function () {
    function MemoryTargetCache(persistence) {
        this.persistence = persistence;
        /**
         * Maps a target to the data about that target
         */
        this.targets = new ObjectMap(function (t) { return canonifyTarget(t); }, targetEquals);
        /** The last received snapshot version. */
        this.lastRemoteSnapshotVersion = SnapshotVersion.min();
        /** The highest numbered target ID encountered. */
        this.highestTargetId = 0;
        /** The highest sequence number encountered. */
        this.highestSequenceNumber = 0;
        /**
         * A ordered bidirectional mapping between documents and the remote target
         * IDs.
         */
        this.references = new ReferenceSet();
        this.targetCount = 0;
        this.targetIdGenerator = TargetIdGenerator.forTargetCache();
    }
    MemoryTargetCache.prototype.forEachTarget = function (txn, f) {
        this.targets.forEach(function (_, targetData) { return f(targetData); });
        return PersistencePromise.resolve();
    };
    MemoryTargetCache.prototype.getLastRemoteSnapshotVersion = function (transaction) {
        return PersistencePromise.resolve(this.lastRemoteSnapshotVersion);
    };
    MemoryTargetCache.prototype.getHighestSequenceNumber = function (transaction) {
        return PersistencePromise.resolve(this.highestSequenceNumber);
    };
    MemoryTargetCache.prototype.allocateTargetId = function (transaction) {
        this.highestTargetId = this.targetIdGenerator.next();
        return PersistencePromise.resolve(this.highestTargetId);
    };
    MemoryTargetCache.prototype.setTargetsMetadata = function (transaction, highestListenSequenceNumber, lastRemoteSnapshotVersion) {
        if (lastRemoteSnapshotVersion) {
            this.lastRemoteSnapshotVersion = lastRemoteSnapshotVersion;
        }
        if (highestListenSequenceNumber > this.highestSequenceNumber) {
            this.highestSequenceNumber = highestListenSequenceNumber;
        }
        return PersistencePromise.resolve();
    };
    MemoryTargetCache.prototype.saveTargetData = function (targetData) {
        this.targets.set(targetData.target, targetData);
        var targetId = targetData.targetId;
        if (targetId > this.highestTargetId) {
            this.targetIdGenerator = new TargetIdGenerator(targetId);
            this.highestTargetId = targetId;
        }
        if (targetData.sequenceNumber > this.highestSequenceNumber) {
            this.highestSequenceNumber = targetData.sequenceNumber;
        }
    };
    MemoryTargetCache.prototype.addTargetData = function (transaction, targetData) {
        this.saveTargetData(targetData);
        this.targetCount += 1;
        return PersistencePromise.resolve();
    };
    MemoryTargetCache.prototype.updateTargetData = function (transaction, targetData) {
        this.saveTargetData(targetData);
        return PersistencePromise.resolve();
    };
    MemoryTargetCache.prototype.removeTargetData = function (transaction, targetData) {
        this.targets.delete(targetData.target);
        this.references.removeReferencesForId(targetData.targetId);
        this.targetCount -= 1;
        return PersistencePromise.resolve();
    };
    MemoryTargetCache.prototype.removeTargets = function (transaction, upperBound, activeTargetIds) {
        var _this = this;
        var count = 0;
        var removals = [];
        this.targets.forEach(function (key, targetData) {
            if (targetData.sequenceNumber <= upperBound &&
                activeTargetIds.get(targetData.targetId) === null) {
                _this.targets.delete(key);
                removals.push(_this.removeMatchingKeysForTargetId(transaction, targetData.targetId));
                count++;
            }
        });
        return PersistencePromise.waitFor(removals).next(function () { return count; });
    };
    MemoryTargetCache.prototype.getTargetCount = function (transaction) {
        return PersistencePromise.resolve(this.targetCount);
    };
    MemoryTargetCache.prototype.getTargetData = function (transaction, target) {
        var targetData = this.targets.get(target) || null;
        return PersistencePromise.resolve(targetData);
    };
    MemoryTargetCache.prototype.addMatchingKeys = function (txn, keys, targetId) {
        this.references.addReferences(keys, targetId);
        return PersistencePromise.resolve();
    };
    MemoryTargetCache.prototype.removeMatchingKeys = function (txn, keys, targetId) {
        this.references.removeReferences(keys, targetId);
        var referenceDelegate = this.persistence.referenceDelegate;
        var promises = [];
        if (referenceDelegate) {
            keys.forEach(function (key) {
                promises.push(referenceDelegate.markPotentiallyOrphaned(txn, key));
            });
        }
        return PersistencePromise.waitFor(promises);
    };
    MemoryTargetCache.prototype.removeMatchingKeysForTargetId = function (txn, targetId) {
        this.references.removeReferencesForId(targetId);
        return PersistencePromise.resolve();
    };
    MemoryTargetCache.prototype.getMatchingKeysForTargetId = function (txn, targetId) {
        var matchingKeys = this.references.referencesForId(targetId);
        return PersistencePromise.resolve(matchingKeys);
    };
    MemoryTargetCache.prototype.containsKey = function (txn, key) {
        return PersistencePromise.resolve(this.references.containsKey(key));
    };
    return MemoryTargetCache;
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
var LOG_TAG$8 = 'MemoryPersistence';
/**
 * A memory-backed instance of Persistence. Data is stored only in RAM and
 * not persisted across sessions.
 */
var MemoryPersistence = /** @class */ (function () {
    /**
     * The constructor accepts a factory for creating a reference delegate. This
     * allows both the delegate and this instance to have strong references to
     * each other without having nullable fields that would then need to be
     * checked or asserted on every access.
     */
    function MemoryPersistence(referenceDelegateFactory) {
        var _this = this;
        this.mutationQueues = {};
        this.listenSequence = new ListenSequence(0);
        this._started = false;
        this._started = true;
        this.referenceDelegate = referenceDelegateFactory(this);
        this.targetCache = new MemoryTargetCache(this);
        var sizer = function (doc) { return _this.referenceDelegate.documentSize(doc); };
        this.indexManager = new MemoryIndexManager();
        this.remoteDocumentCache = new MemoryRemoteDocumentCache(this.indexManager, sizer);
    }
    MemoryPersistence.prototype.start = function () {
        return Promise.resolve();
    };
    MemoryPersistence.prototype.shutdown = function () {
        // No durable state to ensure is closed on shutdown.
        this._started = false;
        return Promise.resolve();
    };
    Object.defineProperty(MemoryPersistence.prototype, "started", {
        get: function () {
            return this._started;
        },
        enumerable: false,
        configurable: true
    });
    MemoryPersistence.prototype.setDatabaseDeletedListener = function () {
        // No op.
    };
    MemoryPersistence.prototype.setNetworkEnabled = function () {
        // No op.
    };
    MemoryPersistence.prototype.getIndexManager = function () {
        return this.indexManager;
    };
    MemoryPersistence.prototype.getMutationQueue = function (user) {
        var queue = this.mutationQueues[user.toKey()];
        if (!queue) {
            queue = new MemoryMutationQueue(this.indexManager, this.referenceDelegate);
            this.mutationQueues[user.toKey()] = queue;
        }
        return queue;
    };
    MemoryPersistence.prototype.getTargetCache = function () {
        return this.targetCache;
    };
    MemoryPersistence.prototype.getRemoteDocumentCache = function () {
        return this.remoteDocumentCache;
    };
    MemoryPersistence.prototype.runTransaction = function (action, mode, transactionOperation) {
        var _this = this;
        logDebug(LOG_TAG$8, 'Starting transaction:', action);
        var txn = new MemoryTransaction(this.listenSequence.next());
        this.referenceDelegate.onTransactionStarted();
        return transactionOperation(txn)
            .next(function (result) {
            return _this.referenceDelegate
                .onTransactionCommitted(txn)
                .next(function () { return result; });
        })
            .toPromise()
            .then(function (result) {
            txn.raiseOnCommittedEvent();
            return result;
        });
    };
    MemoryPersistence.prototype.mutationQueuesContainKey = function (transaction, key) {
        return PersistencePromise.or(Object.values(this.mutationQueues).map(function (queue) { return function () { return queue.containsKey(transaction, key); }; }));
    };
    return MemoryPersistence;
}());
/**
 * Memory persistence is not actually transactional, but future implementations
 * may have transaction-scoped state.
 */
var MemoryTransaction = /** @class */ (function (_super) {
    tslib.__extends(MemoryTransaction, _super);
    function MemoryTransaction(currentSequenceNumber) {
        var _this = _super.call(this) || this;
        _this.currentSequenceNumber = currentSequenceNumber;
        return _this;
    }
    return MemoryTransaction;
}(PersistenceTransaction));
var MemoryEagerDelegate = /** @class */ (function () {
    function MemoryEagerDelegate(persistence) {
        this.persistence = persistence;
        /** Tracks all documents that are active in Query views. */
        this.localViewReferences = new ReferenceSet();
        /** The list of documents that are potentially GCed after each transaction. */
        this._orphanedDocuments = null;
    }
    MemoryEagerDelegate.factory = function (persistence) {
        return new MemoryEagerDelegate(persistence);
    };
    Object.defineProperty(MemoryEagerDelegate.prototype, "orphanedDocuments", {
        get: function () {
            if (!this._orphanedDocuments) {
                throw fail();
            }
            else {
                return this._orphanedDocuments;
            }
        },
        enumerable: false,
        configurable: true
    });
    MemoryEagerDelegate.prototype.addReference = function (txn, targetId, key) {
        this.localViewReferences.addReference(key, targetId);
        this.orphanedDocuments.delete(key);
        return PersistencePromise.resolve();
    };
    MemoryEagerDelegate.prototype.removeReference = function (txn, targetId, key) {
        this.localViewReferences.removeReference(key, targetId);
        this.orphanedDocuments.add(key);
        return PersistencePromise.resolve();
    };
    MemoryEagerDelegate.prototype.markPotentiallyOrphaned = function (txn, key) {
        this.orphanedDocuments.add(key);
        return PersistencePromise.resolve();
    };
    MemoryEagerDelegate.prototype.removeTarget = function (txn, targetData) {
        var _this = this;
        var orphaned = this.localViewReferences.removeReferencesForId(targetData.targetId);
        orphaned.forEach(function (key) { return _this.orphanedDocuments.add(key); });
        var cache = this.persistence.getTargetCache();
        return cache
            .getMatchingKeysForTargetId(txn, targetData.targetId)
            .next(function (keys) {
            keys.forEach(function (key) { return _this.orphanedDocuments.add(key); });
        })
            .next(function () { return cache.removeTargetData(txn, targetData); });
    };
    MemoryEagerDelegate.prototype.onTransactionStarted = function () {
        this._orphanedDocuments = new Set();
    };
    MemoryEagerDelegate.prototype.onTransactionCommitted = function (txn) {
        var _this = this;
        // Remove newly orphaned documents.
        var cache = this.persistence.getRemoteDocumentCache();
        var changeBuffer = cache.newChangeBuffer();
        return PersistencePromise.forEach(this.orphanedDocuments, function (key) {
            return _this.isReferenced(txn, key).next(function (isReferenced) {
                if (!isReferenced) {
                    changeBuffer.removeEntry(key);
                }
            });
        }).next(function () {
            _this._orphanedDocuments = null;
            return changeBuffer.apply(txn);
        });
    };
    MemoryEagerDelegate.prototype.updateLimboDocument = function (txn, key) {
        var _this = this;
        return this.isReferenced(txn, key).next(function (isReferenced) {
            if (isReferenced) {
                _this.orphanedDocuments.delete(key);
            }
            else {
                _this.orphanedDocuments.add(key);
            }
        });
    };
    MemoryEagerDelegate.prototype.documentSize = function (doc) {
        // For eager GC, we don't care about the document size, there are no size thresholds.
        return 0;
    };
    MemoryEagerDelegate.prototype.isReferenced = function (txn, key) {
        var _this = this;
        return PersistencePromise.or([
            function () { return PersistencePromise.resolve(_this.localViewReferences.containsKey(key)); },
            function () { return _this.persistence.getTargetCache().containsKey(txn, key); },
            function () { return _this.persistence.mutationQueuesContainKey(txn, key); }
        ]);
    };
    return MemoryEagerDelegate;
}());
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
/** Used by tests so we can match @grpc/proto-loader behavior. */
var protoLoaderOptions = {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: false
};
/**
 * Loads the protocol buffer definitions for Firestore.
 *
 * @returns The GrpcObject representing our protos.
 */
function loadProtos() {
    var root = path.resolve(__dirname, "src/protos");
    var firestoreProtoFile = path.join(root, 'google/firestore/v1/firestore.proto');
    var packageDefinition = protoLoader.loadSync(firestoreProtoFile, Object.assign(Object.assign({}, protoLoaderOptions), { includeDirs: [root] }));
    return grpcJs.loadPackageDefinition(packageDefinition);
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
 */
var StreamBridge = /** @class */ (function () {
    function StreamBridge(args) {
        this.sendFn = args.sendFn;
        this.closeFn = args.closeFn;
    }
    StreamBridge.prototype.onOpen = function (callback) {
        this.wrappedOnOpen = callback;
    };
    StreamBridge.prototype.onClose = function (callback) {
        this.wrappedOnClose = callback;
    };
    StreamBridge.prototype.onMessage = function (callback) {
        this.wrappedOnMessage = callback;
    };
    StreamBridge.prototype.close = function () {
        this.closeFn();
    };
    StreamBridge.prototype.send = function (msg) {
        this.sendFn(msg);
    };
    StreamBridge.prototype.callOnOpen = function () {
        this.wrappedOnOpen();
    };
    StreamBridge.prototype.callOnClose = function (err) {
        this.wrappedOnClose(err);
    };
    StreamBridge.prototype.callOnMessage = function (msg) {
        this.wrappedOnMessage(msg);
    };
    return StreamBridge;
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
/*
 * Utilities for dealing with node.js-style APIs. See nodePromise for more
 * details.
 */
/**
 * Creates a node-style callback that resolves or rejects a new Promise. The
 * callback is passed to the given action which can then use the callback as
 * a parameter to a node-style function.
 *
 * The intent is to directly bridge a node-style function (which takes a
 * callback) into a Promise without manually converting between the node-style
 * callback and the promise at each call.
 *
 * In effect it allows you to convert:
 *
 * @example
 * new Promise((resolve: (value?: fs.Stats) => void,
 *              reject: (error?: any) => void) => {
 *   fs.stat(path, (error?: any, stat?: fs.Stats) => {
 *     if (error) {
 *       reject(error);
 *     } else {
 *       resolve(stat);
 *     }
 *   });
 * });
 *
 * Into
 * @example
 * nodePromise((callback: NodeCallback<fs.Stats>) => {
 *   fs.stat(path, callback);
 * });
 *
 * @param action a function that takes a node-style callback as an argument and
 *     then uses that callback to invoke some node-style API.
 * @return a new Promise which will be rejected if the callback is given the
 *     first Error parameter or will resolve to the value given otherwise.
 */
function nodePromise(action) {
    return new Promise(function (resolve, reject) {
        action(function (error, value) {
            if (error) {
                reject(error);
            }
            else {
                resolve(value);
            }
        });
    });
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
var SDK_VERSION = firebase.SDK_VERSION;
var grpcVersion = package_json.version;
var LOG_TAG$9 = 'Connection';
// TODO(b/38203344): The SDK_VERSION is set independently from Firebase because
// we are doing out-of-band releases. Once we release as part of Firebase, we
// should use the Firebase version instead.
var X_GOOG_API_CLIENT_VALUE = "gl-node/" + process.versions.node + " fire/" + SDK_VERSION + " grpc/" + grpcVersion;
function createMetadata(databasePath, token) {
    hardAssert(token === null || token.type === 'OAuth');
    var metadata = new grpcJs.Metadata();
    if (token) {
        for (var header in token.authHeaders) {
            if (token.authHeaders.hasOwnProperty(header)) {
                metadata.set(header, token.authHeaders[header]);
            }
        }
    }
    metadata.set('x-goog-api-client', X_GOOG_API_CLIENT_VALUE);
    // This header is used to improve routing and project isolation by the
    // backend.
    metadata.set('google-cloud-resource-prefix', databasePath);
    return metadata;
}
/**
 * A Connection implemented by GRPC-Node.
 */
var GrpcConnection = /** @class */ (function () {
    function GrpcConnection(protos, databaseInfo) {
        this.databaseInfo = databaseInfo;
        // We cache stubs for the most-recently-used token.
        this.cachedStub = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.firestore = protos['google']['firestore']['v1'];
        this.databasePath = "projects/" + databaseInfo.databaseId.projectId + "/databases/" + databaseInfo.databaseId.database;
    }
    GrpcConnection.prototype.ensureActiveStub = function () {
        if (!this.cachedStub) {
            logDebug(LOG_TAG$9, 'Creating Firestore stub.');
            var credentials$1 = this.databaseInfo.ssl
                ? grpcJs.credentials.createSsl()
                : grpcJs.credentials.createInsecure();
            this.cachedStub = new this.firestore.Firestore(this.databaseInfo.host, credentials$1);
        }
        return this.cachedStub;
    };
    GrpcConnection.prototype.invokeRPC = function (rpcName, path, request, token) {
        var stub = this.ensureActiveStub();
        var metadata = createMetadata(this.databasePath, token);
        var jsonRequest = Object.assign({ database: this.databasePath }, request);
        return nodePromise(function (callback) {
            logDebug(LOG_TAG$9, "RPC '" + rpcName + "' invoked with request:", request);
            return stub[rpcName](jsonRequest, metadata, function (grpcError, value) {
                if (grpcError) {
                    logDebug(LOG_TAG$9, "RPC '" + rpcName + "' failed with error:", grpcError);
                    callback(new FirestoreError(mapCodeFromRpcCode(grpcError.code), grpcError.message));
                }
                else {
                    logDebug(LOG_TAG$9, "RPC '" + rpcName + "' completed with response:", value);
                    callback(undefined, value);
                }
            });
        });
    };
    GrpcConnection.prototype.invokeStreamingRPC = function (rpcName, path, request, token) {
        var results = [];
        var responseDeferred = new Deferred();
        logDebug(LOG_TAG$9, "RPC '" + rpcName + "' invoked (streaming) with request:", request);
        var stub = this.ensureActiveStub();
        var metadata = createMetadata(this.databasePath, token);
        var jsonRequest = Object.assign(Object.assign({}, request), { database: this.databasePath });
        var stream = stub[rpcName](jsonRequest, metadata);
        stream.on('data', function (response) {
            logDebug(LOG_TAG$9, "RPC " + rpcName + " received result:", response);
            results.push(response);
        });
        stream.on('end', function () {
            logDebug(LOG_TAG$9, "RPC '" + rpcName + "' completed.");
            responseDeferred.resolve(results);
        });
        stream.on('error', function (grpcError) {
            logDebug(LOG_TAG$9, "RPC '" + rpcName + "' failed with error:", grpcError);
            var code = mapCodeFromRpcCode(grpcError.code);
            responseDeferred.reject(new FirestoreError(code, grpcError.message));
        });
        return responseDeferred.promise;
    };
    // TODO(mikelehen): This "method" is a monster. Should be refactored.
    GrpcConnection.prototype.openStream = function (rpcName, token) {
        var stub = this.ensureActiveStub();
        var metadata = createMetadata(this.databasePath, token);
        var grpcStream = stub[rpcName](metadata);
        var closed = false;
        var close = function (err) {
            if (!closed) {
                closed = true;
                stream.callOnClose(err);
                grpcStream.end();
            }
        };
        var stream = new StreamBridge({
            sendFn: function (msg) {
                if (!closed) {
                    logDebug(LOG_TAG$9, 'GRPC stream sending:', msg);
                    try {
                        grpcStream.write(msg);
                    }
                    catch (e) {
                        // This probably means we didn't conform to the proto.  Make sure to
                        // log the message we sent.
                        logError('Failure sending:', msg);
                        logError('Error:', e);
                        throw e;
                    }
                }
                else {
                    logDebug(LOG_TAG$9, 'Not sending because gRPC stream is closed:', msg);
                }
            },
            closeFn: function () {
                logDebug(LOG_TAG$9, 'GRPC stream closed locally via close().');
                close();
            }
        });
        grpcStream.on('data', function (msg) {
            if (!closed) {
                logDebug(LOG_TAG$9, 'GRPC stream received:', msg);
                stream.callOnMessage(msg);
            }
        });
        grpcStream.on('end', function () {
            logDebug(LOG_TAG$9, 'GRPC stream ended.');
            close();
        });
        grpcStream.on('error', function (grpcError) {
            if (!closed) {
                logWarn(LOG_TAG$9, 'GRPC stream error. Code:', grpcError.code, 'Message:', grpcError.message);
                var code = mapCodeFromRpcCode(grpcError.code);
                close(new FirestoreError(code, grpcError.message));
            }
        });
        logDebug(LOG_TAG$9, 'Opening GRPC stream');
        // TODO(dimond): Since grpc has no explicit open status (or does it?) we
        // simulate an onOpen in the next loop after the stream had it's listeners
        // registered
        setTimeout(function () {
            stream.callOnOpen();
        }, 0);
        return stream;
    };
    return GrpcConnection;
}());
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
var NoopConnectivityMonitor = /** @class */ (function () {
    function NoopConnectivityMonitor() {
    }
    NoopConnectivityMonitor.prototype.addCallback = function (callback) {
        // No-op.
    };
    NoopConnectivityMonitor.prototype.shutdown = function () {
        // No-op.
    };
    return NoopConnectivityMonitor;
}());
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
/** Loads the GRPC stack */
function newConnection(databaseInfo) {
    var protos = loadProtos();
    return new GrpcConnection(protos, databaseInfo);
}
/** Return the Platform-specific connectivity monitor. */
function newConnectivityMonitor() {
    return new NoopConnectivityMonitor();
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
function newSerializer(databaseId) {
    return new JsonProtoSerializer(databaseId, /* useProto3Json= */ false);
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
var MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE = 'You are using the memory-only build of Firestore. Persistence support is ' +
    'only available via the @firebase/firestore bundle or the ' +
    'firebase-firestore.js build.';
/**
 * Provides all components needed for Firestore with in-memory persistence.
 * Uses EagerGC garbage collection.
 */
var MemoryOfflineComponentProvider = /** @class */ (function () {
    function MemoryOfflineComponentProvider() {
    }
    MemoryOfflineComponentProvider.prototype.initialize = function (cfg) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.sharedClientState = this.createSharedClientState(cfg);
                        this.persistence = this.createPersistence(cfg);
                        return [4 /*yield*/, this.persistence.start()];
                    case 1:
                        _e.sent();
                        this.gcScheduler = this.createGarbageCollectionScheduler(cfg);
                        this.localStore = this.createLocalStore(cfg);
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryOfflineComponentProvider.prototype.createGarbageCollectionScheduler = function (cfg) {
        return null;
    };
    MemoryOfflineComponentProvider.prototype.createLocalStore = function (cfg) {
        return newLocalStore(this.persistence, new IndexFreeQueryEngine(), cfg.initialUser);
    };
    MemoryOfflineComponentProvider.prototype.createPersistence = function (cfg) {
        if (cfg.persistenceSettings.durable) {
            throw new FirestoreError(Code.FAILED_PRECONDITION, MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE);
        }
        return new MemoryPersistence(MemoryEagerDelegate.factory);
    };
    MemoryOfflineComponentProvider.prototype.createSharedClientState = function (cfg) {
        return new MemorySharedClientState();
    };
    MemoryOfflineComponentProvider.prototype.terminate = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (this.gcScheduler) {
                            this.gcScheduler.stop();
                        }
                        return [4 /*yield*/, this.sharedClientState.shutdown()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, this.persistence.shutdown()];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    MemoryOfflineComponentProvider.prototype.clearPersistence = function (databaseId, persistenceKey) {
        throw new FirestoreError(Code.FAILED_PRECONDITION, MEMORY_ONLY_PERSISTENCE_ERROR_MESSAGE);
    };
    return MemoryOfflineComponentProvider;
}());
/**
 * Initializes and wires the components that are needed to interface with the
 * network.
 */
var OnlineComponentProvider = /** @class */ (function () {
    function OnlineComponentProvider() {
    }
    OnlineComponentProvider.prototype.initialize = function (offlineComponentProvider, cfg) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (this.localStore) {
                            // OnlineComponentProvider may get initialized multiple times if
                            // multi-tab persistence is used.
                            return [2 /*return*/];
                        }
                        this.localStore = offlineComponentProvider.localStore;
                        this.sharedClientState = offlineComponentProvider.sharedClientState;
                        this.datastore = this.createDatastore(cfg);
                        this.remoteStore = this.createRemoteStore(cfg);
                        this.syncEngine = this.createSyncEngine(cfg);
                        this.eventManager = this.createEventManager(cfg);
                        this.sharedClientState.onlineStateHandler = function (onlineState) { return _this.syncEngine.applyOnlineStateChange(onlineState, 1 /* SharedClientState */); };
                        this.remoteStore.syncEngine = this.syncEngine;
                        return [4 /*yield*/, this.remoteStore.start()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, this.remoteStore.applyPrimaryState(this.syncEngine.isPrimaryClient)];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    OnlineComponentProvider.prototype.createEventManager = function (cfg) {
        return new EventManager(this.syncEngine);
    };
    OnlineComponentProvider.prototype.createDatastore = function (cfg) {
        var serializer = newSerializer(cfg.databaseInfo.databaseId);
        var connection = newConnection(cfg.databaseInfo);
        return newDatastore(cfg.credentials, connection, serializer);
    };
    OnlineComponentProvider.prototype.createRemoteStore = function (cfg) {
        var _this = this;
        return new RemoteStore(this.localStore, this.datastore, cfg.asyncQueue, function (onlineState) { return _this.syncEngine.applyOnlineStateChange(onlineState, 0 /* RemoteStore */); }, newConnectivityMonitor());
    };
    OnlineComponentProvider.prototype.createSyncEngine = function (cfg) {
        return newSyncEngine(this.localStore, this.remoteStore, this.datastore, this.sharedClientState, cfg.initialUser, cfg.maxConcurrentLimboResolutions, !cfg.persistenceSettings.durable ||
            !cfg.persistenceSettings.synchronizeTabs);
    };
    OnlineComponentProvider.prototype.terminate = function () {
        return this.remoteStore.shutdown();
    };
    return OnlineComponentProvider;
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
/*
 * A wrapper implementation of Observer<T> that will dispatch events
 * asynchronously. To allow immediate silencing, a mute call is added which
 * causes events scheduled to no longer be raised.
 */
var AsyncObserver = /** @class */ (function () {
    function AsyncObserver(observer) {
        this.observer = observer;
        /**
         * When set to true, will not raise future events. Necessary to deal with
         * async detachment of listener.
         */
        this.muted = false;
    }
    AsyncObserver.prototype.next = function (value) {
        if (this.observer.next) {
            this.scheduleEvent(this.observer.next, value);
        }
    };
    AsyncObserver.prototype.error = function (error) {
        if (this.observer.error) {
            this.scheduleEvent(this.observer.error, error);
        }
        else {
            console.error('Uncaught Error in snapshot listener:', error);
        }
    };
    AsyncObserver.prototype.mute = function () {
        this.muted = true;
    };
    AsyncObserver.prototype.scheduleEvent = function (eventHandler, event) {
        var _this = this;
        if (!this.muted) {
            setTimeout(function () {
                if (!_this.muted) {
                    eventHandler(event);
                }
            }, 0);
        }
    };
    return AsyncObserver;
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
 * Internal transaction object responsible for accumulating the mutations to
 * perform and the base versions for any documents read.
 */
var Transaction = /** @class */ (function () {
    function Transaction(datastore) {
        this.datastore = datastore;
        // The version of each document that was read during this transaction.
        this.readVersions = new Map();
        this.mutations = [];
        this.committed = false;
        /**
         * A deferred usage error that occurred previously in this transaction that
         * will cause the transaction to fail once it actually commits.
         */
        this.lastWriteError = null;
        /**
         * Set of documents that have been written in the transaction.
         *
         * When there's more than one write to the same key in a transaction, any
         * writes after the first are handled differently.
         */
        this.writtenDocs = new Set();
    }
    Transaction.prototype.lookup = function (keys) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var docs;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.ensureCommitNotCalled();
                        if (this.mutations.length > 0) {
                            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Firestore transactions require all reads to be executed before all writes.');
                        }
                        return [4 /*yield*/, invokeBatchGetDocumentsRpc(this.datastore, keys)];
                    case 1:
                        docs = _e.sent();
                        docs.forEach(function (doc) {
                            if (doc instanceof NoDocument || doc instanceof Document) {
                                _this.recordVersion(doc);
                            }
                            else {
                                fail();
                            }
                        });
                        return [2 /*return*/, docs];
                }
            });
        });
    };
    Transaction.prototype.set = function (key, data) {
        this.write(data.toMutations(key, this.precondition(key)));
        this.writtenDocs.add(key);
    };
    Transaction.prototype.update = function (key, data) {
        try {
            this.write(data.toMutations(key, this.preconditionForUpdate(key)));
        }
        catch (e) {
            this.lastWriteError = e;
        }
        this.writtenDocs.add(key);
    };
    Transaction.prototype.delete = function (key) {
        this.write([new DeleteMutation(key, this.precondition(key))]);
        this.writtenDocs.add(key);
    };
    Transaction.prototype.commit = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var unwritten;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.ensureCommitNotCalled();
                        if (this.lastWriteError) {
                            throw this.lastWriteError;
                        }
                        unwritten = this.readVersions;
                        // For each mutation, note that the doc was written.
                        this.mutations.forEach(function (mutation) {
                            unwritten.delete(mutation.key.toString());
                        });
                        // For each document that was read but not written to, we want to perform
                        // a `verify` operation.
                        unwritten.forEach(function (_, path) {
                            var key = new DocumentKey(ResourcePath.fromString(path));
                            _this.mutations.push(new VerifyMutation(key, _this.precondition(key)));
                        });
                        return [4 /*yield*/, invokeCommitRpc(this.datastore, this.mutations)];
                    case 1:
                        _e.sent();
                        this.committed = true;
                        return [2 /*return*/];
                }
            });
        });
    };
    Transaction.prototype.recordVersion = function (doc) {
        var docVersion;
        if (doc instanceof Document) {
            docVersion = doc.version;
        }
        else if (doc instanceof NoDocument) {
            // For deleted docs, we must use baseVersion 0 when we overwrite them.
            docVersion = SnapshotVersion.min();
        }
        else {
            throw fail();
        }
        var existingVersion = this.readVersions.get(doc.key.toString());
        if (existingVersion) {
            if (!docVersion.isEqual(existingVersion)) {
                // This transaction will fail no matter what.
                throw new FirestoreError(Code.ABORTED, 'Document version changed between two reads.');
            }
        }
        else {
            this.readVersions.set(doc.key.toString(), docVersion);
        }
    };
    /**
     * Returns the version of this document when it was read in this transaction,
     * as a precondition, or no precondition if it was not read.
     */
    Transaction.prototype.precondition = function (key) {
        var version = this.readVersions.get(key.toString());
        if (!this.writtenDocs.has(key) && version) {
            return Precondition.updateTime(version);
        }
        else {
            return Precondition.none();
        }
    };
    /**
     * Returns the precondition for a document if the operation is an update.
     */
    Transaction.prototype.preconditionForUpdate = function (key) {
        var version = this.readVersions.get(key.toString());
        // The first time a document is written, we want to take into account the
        // read time and existence
        if (!this.writtenDocs.has(key) && version) {
            if (version.isEqual(SnapshotVersion.min())) {
                // The document doesn't exist, so fail the transaction.
                // This has to be validated locally because you can't send a
                // precondition that a document does not exist without changing the
                // semantics of the backend write to be an insert. This is the reverse
                // of what we want, since we want to assert that the document doesn't
                // exist but then send the update and have it fail. Since we can't
                // express that to the backend, we have to validate locally.
                // Note: this can change once we can send separate verify writes in the
                // transaction.
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Can't update a document that doesn't exist.");
            }
            // Document exists, base precondition on document update time.
            return Precondition.updateTime(version);
        }
        else {
            // Document was not read, so we just use the preconditions for a blind
            // update.
            return Precondition.exists(true);
        }
    };
    Transaction.prototype.write = function (mutations) {
        this.ensureCommitNotCalled();
        this.mutations = this.mutations.concat(mutations);
    };
    Transaction.prototype.ensureCommitNotCalled = function () {
    };
    return Transaction;
}());
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
var RETRY_COUNT = 5;
/**
 * TransactionRunner encapsulates the logic needed to run and retry transactions
 * with backoff.
 */
var TransactionRunner = /** @class */ (function () {
    function TransactionRunner(asyncQueue, datastore, updateFunction, deferred) {
        this.asyncQueue = asyncQueue;
        this.datastore = datastore;
        this.updateFunction = updateFunction;
        this.deferred = deferred;
        this.retries = RETRY_COUNT;
        this.backoff = new ExponentialBackoff(this.asyncQueue, "transaction_retry" /* TransactionRetry */);
    }
    /** Runs the transaction and sets the result on deferred. */
    TransactionRunner.prototype.run = function () {
        this.runWithBackOff();
    };
    TransactionRunner.prototype.runWithBackOff = function () {
        var _this = this;
        this.backoff.backoffAndRun(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
            var transaction, userPromise;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                transaction = new Transaction(this.datastore);
                userPromise = this.tryRunUpdateFunction(transaction);
                if (userPromise) {
                    userPromise
                        .then(function (result) {
                        _this.asyncQueue.enqueueAndForget(function () {
                            return transaction
                                .commit()
                                .then(function () {
                                _this.deferred.resolve(result);
                            })
                                .catch(function (commitError) {
                                _this.handleTransactionError(commitError);
                            });
                        });
                    })
                        .catch(function (userPromiseError) {
                        _this.handleTransactionError(userPromiseError);
                    });
                }
                return [2 /*return*/];
            });
        }); });
    };
    TransactionRunner.prototype.tryRunUpdateFunction = function (transaction) {
        try {
            var userPromise = this.updateFunction(transaction);
            if (isNullOrUndefined(userPromise) ||
                !userPromise.catch ||
                !userPromise.then) {
                this.deferred.reject(Error('Transaction callback must return a Promise'));
                return null;
            }
            return userPromise;
        }
        catch (error) {
            // Do not retry errors thrown by user provided updateFunction.
            this.deferred.reject(error);
            return null;
        }
    };
    TransactionRunner.prototype.handleTransactionError = function (error) {
        var _this = this;
        if (this.retries > 0 && this.isRetryableTransactionError(error)) {
            this.retries -= 1;
            this.asyncQueue.enqueueAndForget(function () {
                _this.runWithBackOff();
                return Promise.resolve();
            });
        }
        else {
            this.deferred.reject(error);
        }
    };
    TransactionRunner.prototype.isRetryableTransactionError = function (error) {
        if (error.name === 'FirebaseError') {
            // In transactions, the backend will fail outdated reads with FAILED_PRECONDITION and
            // non-matching document versions with ABORTED. These errors should be retried.
            var code = error.code;
            return (code === 'aborted' ||
                code === 'failed-precondition' ||
                !isPermanentError(code));
        }
        return false;
    };
    return TransactionRunner;
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
var LOG_TAG$a = 'FirestoreClient';
var MAX_CONCURRENT_LIMBO_RESOLUTIONS = 100;
/** DOMException error code constants. */
var DOM_EXCEPTION_INVALID_STATE = 11;
var DOM_EXCEPTION_ABORTED = 20;
var DOM_EXCEPTION_QUOTA_EXCEEDED = 22;
/**
 * FirestoreClient is a top-level class that constructs and owns all of the
 * pieces of the client SDK architecture. It is responsible for creating the
 * async queue that is shared by all of the other components in the system.
 */
var FirestoreClient = /** @class */ (function () {
    function FirestoreClient(credentials, 
    /**
     * Asynchronous queue responsible for all of our internal processing. When
     * we get incoming work from the user (via public API) or the network
     * (incoming GRPC messages), we should always schedule onto this queue.
     * This ensures all of our work is properly serialized (e.g. we don't
     * start processing a new operation while the previous one is waiting for
     * an async I/O to complete).
     */
    asyncQueue) {
        this.credentials = credentials;
        this.asyncQueue = asyncQueue;
        this.clientId = AutoId.newId();
        // We defer our initialization until we get the current user from
        // setChangeListener(). We block the async queue until we got the initial
        // user and the initialization is completed. This will prevent any scheduled
        // work from happening before initialization is completed.
        //
        // If initializationDone resolved then the FirestoreClient is in a usable
        // state.
        this.initializationDone = new Deferred();
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
     */
    FirestoreClient.prototype.start = function (databaseInfo, offlineComponentProvider, onlineComponentProvider, persistenceSettings) {
        var _this = this;
        this.verifyNotTerminated();
        this.databaseInfo = databaseInfo;
        // If usePersistence is true, certain classes of errors while starting are
        // recoverable but only by falling back to persistence disabled.
        //
        // If there's an error in the first case but not in recovery we cannot
        // reject the promise blocking the async queue because this will cause the
        // async queue to panic.
        var persistenceResult = new Deferred();
        var initialized = false;
        this.credentials.setChangeListener(function (user) {
            if (!initialized) {
                initialized = true;
                logDebug(LOG_TAG$a, 'Initializing. user=', user.uid);
                return _this.initializeComponents(offlineComponentProvider, onlineComponentProvider, persistenceSettings, user, persistenceResult).then(_this.initializationDone.resolve, _this.initializationDone.reject);
            }
            else {
                _this.asyncQueue.enqueueRetryable(function () { return _this.remoteStore.handleCredentialChange(user); });
            }
        });
        // Block the async queue until initialization is done
        this.asyncQueue.enqueueAndForget(function () { return _this.initializationDone.promise; });
        // Return only the result of enabling persistence. Note that this does not
        // need to await the completion of initializationDone because the result of
        // this method should not reflect any other kind of failure to start.
        return persistenceResult.promise;
    };
    /** Enables the network connection and requeues all pending operations. */
    FirestoreClient.prototype.enableNetwork = function () {
        var _this = this;
        this.verifyNotTerminated();
        return this.asyncQueue.enqueue(function () {
            _this.persistence.setNetworkEnabled(true);
            return _this.remoteStore.enableNetwork();
        });
    };
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
    FirestoreClient.prototype.initializeComponents = function (offlineComponentProvider, onlineComponentProvider, persistenceSettings, user, persistenceResult) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var componentConfiguration, error_4;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 3, , 4]);
                        componentConfiguration = {
                            asyncQueue: this.asyncQueue,
                            databaseInfo: this.databaseInfo,
                            clientId: this.clientId,
                            credentials: this.credentials,
                            initialUser: user,
                            maxConcurrentLimboResolutions: MAX_CONCURRENT_LIMBO_RESOLUTIONS,
                            persistenceSettings: persistenceSettings
                        };
                        return [4 /*yield*/, offlineComponentProvider.initialize(componentConfiguration)];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, onlineComponentProvider.initialize(offlineComponentProvider, componentConfiguration)];
                    case 2:
                        _e.sent();
                        this.persistence = offlineComponentProvider.persistence;
                        this.sharedClientState = offlineComponentProvider.sharedClientState;
                        this.localStore = offlineComponentProvider.localStore;
                        this.gcScheduler = offlineComponentProvider.gcScheduler;
                        this.datastore = onlineComponentProvider.datastore;
                        this.remoteStore = onlineComponentProvider.remoteStore;
                        this.syncEngine = onlineComponentProvider.syncEngine;
                        this.eventMgr = onlineComponentProvider.eventManager;
                        // When a user calls clearPersistence() in one client, all other clients
                        // need to be terminated to allow the delete to succeed.
                        this.persistence.setDatabaseDeletedListener(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                            return tslib.__generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0: return [4 /*yield*/, this.terminate()];
                                    case 1:
                                        _e.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        persistenceResult.resolve();
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _e.sent();
                        // Regardless of whether or not the retry succeeds, from an user
                        // perspective, offline persistence has failed.
                        persistenceResult.reject(error_4);
                        // An unknown failure on the first stage shuts everything down.
                        if (!this.canFallback(error_4)) {
                            throw error_4;
                        }
                        console.warn('Error enabling offline persistence. Falling back to' +
                            ' persistence disabled: ' +
                            error_4);
                        return [2 /*return*/, this.initializeComponents(new MemoryOfflineComponentProvider(), new OnlineComponentProvider(), { durable: false }, user, persistenceResult)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Decides whether the provided error allows us to gracefully disable
     * persistence (as opposed to crashing the client).
     */
    FirestoreClient.prototype.canFallback = function (error) {
        if (error.name === 'FirebaseError') {
            return (error.code === Code.FAILED_PRECONDITION ||
                error.code === Code.UNIMPLEMENTED);
        }
        else if (typeof DOMException !== 'undefined' &&
            error instanceof DOMException) {
            // There are a few known circumstances where we can open IndexedDb but
            // trying to read/write will fail (e.g. quota exceeded). For
            // well-understood cases, we attempt to detect these and then gracefully
            // fall back to memory persistence.
            // NOTE: Rather than continue to add to this list, we could decide to
            // always fall back, with the risk that we might accidentally hide errors
            // representing actual SDK bugs.
            return (
            // When the browser is out of quota we could get either quota exceeded
            // or an aborted error depending on whether the error happened during
            // schema migration.
            error.code === DOM_EXCEPTION_QUOTA_EXCEEDED ||
                error.code === DOM_EXCEPTION_ABORTED ||
                // Firefox Private Browsing mode disables IndexedDb and returns
                // INVALID_STATE for any usage.
                error.code === DOM_EXCEPTION_INVALID_STATE);
        }
        return true;
    };
    /**
     * Checks that the client has not been terminated. Ensures that other methods on
     * this class cannot be called after the client is terminated.
     */
    FirestoreClient.prototype.verifyNotTerminated = function () {
        if (this.asyncQueue.isShuttingDown) {
            throw new FirestoreError(Code.FAILED_PRECONDITION, 'The client has already been terminated.');
        }
    };
    /** Disables the network connection. Pending operations will not complete. */
    FirestoreClient.prototype.disableNetwork = function () {
        var _this = this;
        this.verifyNotTerminated();
        return this.asyncQueue.enqueue(function () {
            _this.persistence.setNetworkEnabled(false);
            return _this.remoteStore.disableNetwork();
        });
    };
    FirestoreClient.prototype.terminate = function () {
        var _this = this;
        this.asyncQueue.enterRestrictedMode();
        var deferred = new Deferred();
        this.asyncQueue.enqueueAndForgetEvenWhileRestricted(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
            var e_10, firestoreError;
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 4, , 5]);
                        // PORTING NOTE: LocalStore does not need an explicit shutdown on web.
                        if (this.gcScheduler) {
                            this.gcScheduler.stop();
                        }
                        return [4 /*yield*/, this.remoteStore.shutdown()];
                    case 1:
                        _e.sent();
                        return [4 /*yield*/, this.sharedClientState.shutdown()];
                    case 2:
                        _e.sent();
                        return [4 /*yield*/, this.persistence.shutdown()];
                    case 3:
                        _e.sent();
                        // `removeChangeListener` must be called after shutting down the
                        // RemoteStore as it will prevent the RemoteStore from retrieving
                        // auth tokens.
                        this.credentials.removeChangeListener();
                        deferred.resolve();
                        return [3 /*break*/, 5];
                    case 4:
                        e_10 = _e.sent();
                        firestoreError = wrapInUserErrorIfRecoverable(e_10, "Failed to shutdown persistence");
                        deferred.reject(firestoreError);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        }); });
        return deferred.promise;
    };
    /**
     * Returns a Promise that resolves when all writes that were pending at the time this
     * method was called received server acknowledgement. An acknowledgement can be either acceptance
     * or rejection.
     */
    FirestoreClient.prototype.waitForPendingWrites = function () {
        var _this = this;
        this.verifyNotTerminated();
        var deferred = new Deferred();
        this.asyncQueue.enqueueAndForget(function () {
            return _this.syncEngine.registerPendingWritesCallback(deferred);
        });
        return deferred.promise;
    };
    FirestoreClient.prototype.listen = function (query, options, observer) {
        var _this = this;
        this.verifyNotTerminated();
        var wrappedObserver = new AsyncObserver(observer);
        var listener = new QueryListener(query, wrappedObserver, options);
        this.asyncQueue.enqueueAndForget(function () { return _this.eventMgr.listen(listener); });
        return function () {
            wrappedObserver.mute();
            _this.asyncQueue.enqueueAndForget(function () { return _this.eventMgr.unlisten(listener); });
        };
    };
    FirestoreClient.prototype.getDocumentFromLocalCache = function (docKey) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.verifyNotTerminated();
                        return [4 /*yield*/, this.initializationDone.promise];
                    case 1:
                        _e.sent();
                        return [2 /*return*/, enqueueReadDocumentFromCache(this.asyncQueue, this.localStore, docKey)];
                }
            });
        });
    };
    FirestoreClient.prototype.getDocumentViaSnapshotListener = function (key, options) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.verifyNotTerminated();
                        return [4 /*yield*/, this.initializationDone.promise];
                    case 1:
                        _e.sent();
                        return [2 /*return*/, enqueueReadDocumentViaSnapshotListener(this.asyncQueue, this.eventMgr, key, options)];
                }
            });
        });
    };
    FirestoreClient.prototype.getDocumentsFromLocalCache = function (query) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.verifyNotTerminated();
                        return [4 /*yield*/, this.initializationDone.promise];
                    case 1:
                        _e.sent();
                        return [2 /*return*/, enqueueExecuteQueryFromCache(this.asyncQueue, this.localStore, query)];
                }
            });
        });
    };
    FirestoreClient.prototype.getDocumentsViaSnapshotListener = function (query, options) {
        return tslib.__awaiter(this, void 0, void 0, function () {
            return tslib.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        this.verifyNotTerminated();
                        return [4 /*yield*/, this.initializationDone.promise];
                    case 1:
                        _e.sent();
                        return [2 /*return*/, enqueueExecuteQueryViaSnapshotListener(this.asyncQueue, this.eventMgr, query, options)];
                }
            });
        });
    };
    FirestoreClient.prototype.write = function (mutations) {
        var _this = this;
        this.verifyNotTerminated();
        var deferred = new Deferred();
        this.asyncQueue.enqueueAndForget(function () { return _this.syncEngine.write(mutations, deferred); });
        return deferred.promise;
    };
    FirestoreClient.prototype.databaseId = function () {
        return this.databaseInfo.databaseId;
    };
    FirestoreClient.prototype.addSnapshotsInSyncListener = function (observer) {
        var _this = this;
        this.verifyNotTerminated();
        var wrappedObserver = new AsyncObserver(observer);
        this.asyncQueue.enqueueAndForget(function () { return tslib.__awaiter(_this, void 0, void 0, function () { return tslib.__generator(this, function (_e) {
            return [2 /*return*/, this.eventMgr.addSnapshotsInSyncListener(wrappedObserver)];
        }); }); });
        return function () {
            wrappedObserver.mute();
            _this.asyncQueue.enqueueAndForget(function () { return tslib.__awaiter(_this, void 0, void 0, function () { return tslib.__generator(this, function (_e) {
                return [2 /*return*/, this.eventMgr.removeSnapshotsInSyncListener(wrappedObserver)];
            }); }); });
        };
    };
    Object.defineProperty(FirestoreClient.prototype, "clientTerminated", {
        get: function () {
            // Technically, the asyncQueue is still running, but only accepting operations
            // related to termination or supposed to be run after termination. It is effectively
            // terminated to the eyes of users.
            return this.asyncQueue.isShuttingDown;
        },
        enumerable: false,
        configurable: true
    });
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
    FirestoreClient.prototype.transaction = function (updateFunction) {
        var _this = this;
        this.verifyNotTerminated();
        var deferred = new Deferred();
        this.asyncQueue.enqueueAndForget(function () {
            new TransactionRunner(_this.asyncQueue, _this.datastore, updateFunction, deferred).run();
            return Promise.resolve();
        });
        return deferred.promise;
    };
    return FirestoreClient;
}());
function enqueueListen(asyncQueue, eventManger, query, options, observer) {
    var wrappedObserver = new AsyncObserver(observer);
    var listener = new QueryListener(query, wrappedObserver, options);
    asyncQueue.enqueueAndForget(function () { return eventManger.listen(listener); });
    return function () {
        wrappedObserver.mute();
        asyncQueue.enqueueAndForget(function () { return eventManger.unlisten(listener); });
    };
}
function enqueueReadDocumentFromCache(asyncQueue, localStore, docKey) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        var deferred;
        var _this = this;
        return tslib.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    deferred = new Deferred();
                    return [4 /*yield*/, asyncQueue.enqueue(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                            var maybeDoc, e_11, firestoreError;
                            return tslib.__generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        _e.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, localStore.readDocument(docKey)];
                                    case 1:
                                        maybeDoc = _e.sent();
                                        if (maybeDoc instanceof Document) {
                                            deferred.resolve(maybeDoc);
                                        }
                                        else if (maybeDoc instanceof NoDocument) {
                                            deferred.resolve(null);
                                        }
                                        else {
                                            deferred.reject(new FirestoreError(Code.UNAVAILABLE, 'Failed to get document from cache. (However, this document may ' +
                                                "exist on the server. Run again without setting 'source' in " +
                                                'the GetOptions to attempt to retrieve the document from the ' +
                                                'server.)'));
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        e_11 = _e.sent();
                                        firestoreError = wrapInUserErrorIfRecoverable(e_11, "Failed to get document '" + docKey + " from cache");
                                        deferred.reject(firestoreError);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _e.sent();
                    return [2 /*return*/, deferred.promise];
            }
        });
    });
}
/**
 * Retrieves a latency-compensated document from the backend via a
 * SnapshotListener.
 */
function enqueueReadDocumentViaSnapshotListener(asyncQueue, eventManager, key, options) {
    var result = new Deferred();
    var unlisten = enqueueListen(asyncQueue, eventManager, newQueryForPath(key.path), {
        includeMetadataChanges: true,
        waitForSyncWhenOnline: true
    }, {
        next: function (snap) {
            // Remove query first before passing event to user to avoid
            // user actions affecting the now stale query.
            unlisten();
            var exists = snap.docs.has(key);
            if (!exists && snap.fromCache) {
                // TODO(dimond): If we're online and the document doesn't
                // exist then we resolve with a doc.exists set to false. If
                // we're offline however, we reject the Promise in this
                // case. Two options: 1) Cache the negative response from
                // the server so we can deliver that even when you're
                // offline 2) Actually reject the Promise in the online case
                // if the document doesn't exist.
                result.reject(new FirestoreError(Code.UNAVAILABLE, 'Failed to get document because the client is ' + 'offline.'));
            }
            else if (exists &&
                snap.fromCache &&
                options &&
                options.source === 'server') {
                result.reject(new FirestoreError(Code.UNAVAILABLE, 'Failed to get document from server. (However, this ' +
                    'document does exist in the local cache. Run again ' +
                    'without setting source to "server" to ' +
                    'retrieve the cached document.)'));
            }
            else {
                result.resolve(snap);
            }
        },
        error: function (e) { return result.reject(e); }
    });
    return result.promise;
}
function enqueueExecuteQueryFromCache(asyncQueue, localStore, query) {
    return tslib.__awaiter(this, void 0, void 0, function () {
        var deferred;
        var _this = this;
        return tslib.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    deferred = new Deferred();
                    return [4 /*yield*/, asyncQueue.enqueue(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                            var queryResult, view, viewDocChanges, viewChange, e_12, firestoreError;
                            return tslib.__generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        _e.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, localStore.executeQuery(query, 
                                            /* usePreviousResults= */ true)];
                                    case 1:
                                        queryResult = _e.sent();
                                        view = new View(query, queryResult.remoteKeys);
                                        viewDocChanges = view.computeDocChanges(queryResult.documents);
                                        viewChange = view.applyChanges(viewDocChanges, 
                                        /* updateLimboDocuments= */ false);
                                        deferred.resolve(viewChange.snapshot);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        e_12 = _e.sent();
                                        firestoreError = wrapInUserErrorIfRecoverable(e_12, "Failed to execute query '" + query + " against cache");
                                        deferred.reject(firestoreError);
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _e.sent();
                    return [2 /*return*/, deferred.promise];
            }
        });
    });
}
/**
 * Retrieves a latency-compensated query snapshot from the backend via a
 * SnapshotListener.
 */
function enqueueExecuteQueryViaSnapshotListener(asyncQueue, eventManager, query, options) {
    var result = new Deferred();
    var unlisten = enqueueListen(asyncQueue, eventManager, query, {
        includeMetadataChanges: true,
        waitForSyncWhenOnline: true
    }, {
        next: function (snapshot) {
            // Remove query first before passing event to user to avoid
            // user actions affecting the now stale query.
            unlisten();
            if (snapshot.fromCache && options && options.source === 'server') {
                result.reject(new FirestoreError(Code.UNAVAILABLE, 'Failed to get documents from server. (However, these ' +
                    'documents may exist in the local cache. Run again ' +
                    'without setting source to "server" to ' +
                    'retrieve the cached documents.)'));
            }
            else {
                result.resolve(snapshot);
            }
        },
        error: function (e) { return result.reject(e); }
    });
    return result.promise;
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
 */
function validateNoArgs(functionName, args) {
    if (args.length !== 0) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() does not support arguments, " +
            'but was called with ' +
            formatPlural(args.length, 'argument') +
            '.');
    }
}
/**
 * Validates the invocation of functionName has the exact number of arguments.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateExactNumberOfArgs('myFunction', arguments, 2);
 */
function validateExactNumberOfArgs(functionName, args, numberOfArgs) {
    if (args.length !== numberOfArgs) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires " +
            formatPlural(numberOfArgs, 'argument') +
            ', but was called with ' +
            formatPlural(args.length, 'argument') +
            '.');
    }
}
/**
 * Validates the invocation of functionName has at least the provided number of
 * arguments (but can have many more).
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateAtLeastNumberOfArgs('myFunction', arguments, 2);
 */
function validateAtLeastNumberOfArgs(functionName, args, minNumberOfArgs) {
    if (args.length < minNumberOfArgs) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires at least " +
            formatPlural(minNumberOfArgs, 'argument') +
            ', but was called with ' +
            formatPlural(args.length, 'argument') +
            '.');
    }
}
/**
 * Validates the invocation of functionName has number of arguments between
 * the values provided.
 *
 * Forward the magic "arguments" variable as second parameter on which the
 * parameter validation is performed:
 * validateBetweenNumberOfArgs('myFunction', arguments, 2, 3);
 */
function validateBetweenNumberOfArgs(functionName, args, minNumberOfArgs, maxNumberOfArgs) {
    if (args.length < minNumberOfArgs || args.length > maxNumberOfArgs) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires between " + minNumberOfArgs + " and " +
            (maxNumberOfArgs + " arguments, but was called with ") +
            formatPlural(args.length, 'argument') +
            '.');
    }
}
/**
 * Validates the provided argument is an array and has as least the expected
 * number of elements.
 */
function validateNamedArrayAtLeastNumberOfElements(functionName, value, name, minNumberOfElements) {
    if (!(value instanceof Array) || value.length < minNumberOfElements) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires its " + name + " argument to be an " +
            'array with at least ' +
            (formatPlural(minNumberOfElements, 'element') + "."));
    }
}
/**
 * Validates the provided positional argument has the native JavaScript type
 * using typeof checks.
 */
function validateArgType(functionName, type, position, argument) {
    validateType(functionName, type, ordinal(position) + " argument", argument);
}
/**
 * Validates the provided argument has the native JavaScript type using
 * typeof checks or is undefined.
 */
function validateOptionalArgType(functionName, type, position, argument) {
    if (argument !== undefined) {
        validateArgType(functionName, type, position, argument);
    }
}
/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks.
 */
function validateNamedType(functionName, type, optionName, argument) {
    validateType(functionName, type, optionName + " option", argument);
}
/**
 * Validates the provided named option has the native JavaScript type using
 * typeof checks or is undefined.
 */
function validateNamedOptionalType(functionName, type, optionName, argument) {
    if (argument !== undefined) {
        validateNamedType(functionName, type, optionName, argument);
    }
}
function validateArrayElements(functionName, optionName, typeDescription, argument, validator) {
    if (!(argument instanceof Array)) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires its " + optionName + " " +
            ("option to be an array, but it was: " + valueDescription(argument)));
    }
    for (var i = 0; i < argument.length; ++i) {
        if (!validator(argument[i])) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires all " + optionName + " " +
                ("elements to be " + typeDescription + ", but the value at index " + i + " ") +
                ("was: " + valueDescription(argument[i])));
        }
    }
}
function validateOptionalArrayElements(functionName, optionName, typeDescription, argument, validator) {
    if (argument !== undefined) {
        validateArrayElements(functionName, optionName, typeDescription, argument, validator);
    }
}
/**
 * Validates that the provided named option equals one of the expected values.
 */
function validateNamedPropertyEquals(functionName, inputName, optionName, input, expected) {
    var expectedDescription = [];
    for (var _i = 0, expected_1 = expected; _i < expected_1.length; _i++) {
        var val = expected_1[_i];
        if (val === input) {
            return;
        }
        expectedDescription.push(valueDescription(val));
    }
    var actualDescription = valueDescription(input);
    throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid value " + actualDescription + " provided to function " + functionName + "() for option " +
        ("\"" + optionName + "\". Acceptable values: " + expectedDescription.join(', ')));
}
/**
 * Validates that the provided named option equals one of the expected values or
 * is undefined.
 */
function validateNamedOptionalPropertyEquals(functionName, inputName, optionName, input, expected) {
    if (input !== undefined) {
        validateNamedPropertyEquals(functionName, inputName, optionName, input, expected);
    }
}
/**
 * Validates that the provided argument is a valid enum.
 *
 * @param functionName Function making the validation call.
 * @param enums Array containing all possible values for the enum.
 * @param position Position of the argument in `functionName`.
 * @param argument Argument to validate.
 * @return The value as T if the argument can be converted.
 */
function validateStringEnum(functionName, enums, position, argument) {
    if (!enums.some(function (element) { return element === argument; })) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid value " + valueDescription(argument) + " provided to function " +
            (functionName + "() for its " + ordinal(position) + " argument. Acceptable ") +
            ("values: " + enums.join(', ')));
    }
    return argument;
}
/** Helper to validate the type of a provided input. */
function validateType(functionName, type, inputName, input) {
    var valid = false;
    if (type === 'object') {
        valid = isPlainObject(input);
    }
    else if (type === 'non-empty string') {
        valid = typeof input === 'string' && input !== '';
    }
    else {
        valid = typeof input === type;
    }
    if (!valid) {
        var description = valueDescription(input);
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires its " + inputName + " " +
            ("to be of type " + type + ", but it was: " + description));
    }
}
/**
 * Returns true if it's a non-null object without a custom prototype
 * (i.e. excludes Array, Date, etc.).
 */
function isPlainObject(input) {
    return (typeof input === 'object' &&
        input !== null &&
        (Object.getPrototypeOf(input) === Object.prototype ||
            Object.getPrototypeOf(input) === null));
}
/** Returns a string describing the type / value of the provided input. */
function valueDescription(input) {
    if (input === undefined) {
        return 'undefined';
    }
    else if (input === null) {
        return 'null';
    }
    else if (typeof input === 'string') {
        if (input.length > 20) {
            input = input.substring(0, 20) + "...";
        }
        return JSON.stringify(input);
    }
    else if (typeof input === 'number' || typeof input === 'boolean') {
        return '' + input;
    }
    else if (typeof input === 'object') {
        if (input instanceof Array) {
            return 'an array';
        }
        else {
            var customObjectName = tryGetCustomObjectType(input);
            if (customObjectName) {
                return "a custom " + customObjectName + " object";
            }
            else {
                return 'an object';
            }
        }
    }
    else if (typeof input === 'function') {
        return 'a function';
    }
    else {
        return fail();
    }
}
/** Hacky method to try to get the constructor name for an object. */
function tryGetCustomObjectType(input) {
    if (input.constructor) {
        var funcNameRegex = /function\s+([^\s(]+)\s*\(/;
        var results = funcNameRegex.exec(input.constructor.toString());
        if (results && results.length > 1) {
            return results[1];
        }
    }
    return null;
}
/** Validates the provided argument is defined. */
function validateDefined(functionName, position, argument) {
    if (argument === undefined) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires a valid " + ordinal(position) + " " +
            "argument, but it was undefined.");
    }
}
/**
 * Validates the provided positional argument is an object, and its keys and
 * values match the expected keys and types provided in optionTypes.
 */
function validateOptionNames(functionName, options, optionNames) {
    forEach(options, function (key, _) {
        if (optionNames.indexOf(key) < 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Unknown option '" + key + "' passed to function " + functionName + "(). " +
                'Available options: ' +
                optionNames.join(', '));
        }
    });
}
/**
 * Helper method to throw an error that the provided argument did not pass
 * an instanceof check.
 */
function invalidClassError(functionName, type, position, argument) {
    var description = valueDescription(argument);
    return new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires its " + ordinal(position) + " " +
        ("argument to be a " + type + ", but it was: " + description));
}
function validatePositiveNumber(functionName, position, n) {
    if (n <= 0) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + functionName + "() requires its " + ordinal(position) + " argument to be a positive number, but it was: " + n + ".");
    }
}
/** Converts a number to its english word representation */
function ordinal(num) {
    switch (num) {
        case 1:
            return 'first';
        case 2:
            return 'second';
        case 3:
            return 'third';
        default:
            return num + 'th';
    }
}
/**
 * Formats the given word as plural conditionally given the preceding number.
 */
function formatPlural(num, str) {
    return num + " " + str + (num === 1 ? '' : 's');
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
 */
var BaseFieldPath = /** @class */ (function () {
    function BaseFieldPath(fieldNames) {
        validateNamedArrayAtLeastNumberOfElements('FieldPath', fieldNames, 'fieldNames', 1);
        for (var i = 0; i < fieldNames.length; ++i) {
            validateArgType('FieldPath', 'string', i, fieldNames[i]);
            if (fieldNames[i].length === 0) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid field name at argument $(i + 1). " +
                    'Field names must not be empty.');
            }
        }
        this._internalPath = new FieldPath(fieldNames);
    }
    return BaseFieldPath;
}());
/**
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */
var FieldPath$1 = /** @class */ (function (_super) {
    tslib.__extends(FieldPath$1, _super);
    /**
     * Creates a FieldPath from the provided field names. If more than one field
     * name is provided, the path will point to a nested field in a document.
     *
     * @param fieldNames A list of field names.
     */
    function FieldPath$1() {
        var fieldNames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            fieldNames[_i] = arguments[_i];
        }
        return _super.call(this, fieldNames) || this;
    }
    FieldPath$1.documentId = function () {
        /**
         * Internal Note: The backend doesn't technically support querying by
         * document ID. Instead it queries by the entire document name (full path
         * included), but in the cases we currently support documentId(), the net
         * effect is the same.
         */
        return new FieldPath$1(FieldPath.keyField().canonicalString());
    };
    FieldPath$1.prototype.isEqual = function (other) {
        if (!(other instanceof FieldPath$1)) {
            throw invalidClassError('isEqual', 'FieldPath', 1, other);
        }
        return this._internalPath.isEqual(other._internalPath);
    };
    return FieldPath$1;
}(BaseFieldPath));
/**
 * Matches any characters in a field path string that are reserved.
 */
var RESERVED = new RegExp('[~\\*/\\[\\]]');
/**
 * Parses a field path string into a FieldPath, treating dots as separators.
 */
function fromDotSeparatedString(path) {
    var found = path.search(RESERVED);
    if (found >= 0) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid field path (" + path + "). Paths must not contain " +
            "'~', '*', '/', '[', or ']'");
    }
    try {
        return new (FieldPath$1.bind.apply(FieldPath$1, tslib.__spreadArrays([void 0], path.split('.'))))();
    }
    catch (e) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid field path (" + path + "). Paths must not be empty, " +
            "begin with '.', end with '.', or contain '..'");
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
var OAuthToken = /** @class */ (function () {
    function OAuthToken(value, user) {
        this.user = user;
        this.type = 'OAuth';
        this.authHeaders = {};
        // Set the headers using Object Literal notation to avoid minification
        this.authHeaders['Authorization'] = "Bearer " + value;
    }
    return OAuthToken;
}());
/** A CredentialsProvider that always yields an empty token. */
var EmptyCredentialsProvider = /** @class */ (function () {
    function EmptyCredentialsProvider() {
        /**
         * Stores the listener registered with setChangeListener()
         * This isn't actually necessary since the UID never changes, but we use this
         * to verify the listen contract is adhered to in tests.
         */
        this.changeListener = null;
    }
    EmptyCredentialsProvider.prototype.getToken = function () {
        return Promise.resolve(null);
    };
    EmptyCredentialsProvider.prototype.invalidateToken = function () { };
    EmptyCredentialsProvider.prototype.setChangeListener = function (changeListener) {
        this.changeListener = changeListener;
        // Fire with initial user.
        changeListener(User.UNAUTHENTICATED);
    };
    EmptyCredentialsProvider.prototype.removeChangeListener = function () {
        this.changeListener = null;
    };
    return EmptyCredentialsProvider;
}());
var FirebaseCredentialsProvider = /** @class */ (function () {
    function FirebaseCredentialsProvider(authProvider) {
        var _this = this;
        /**
         * The auth token listener registered with FirebaseApp, retained here so we
         * can unregister it.
         */
        this.tokenListener = null;
        /** Tracks the current User. */
        this.currentUser = User.UNAUTHENTICATED;
        this.receivedInitialUser = false;
        /**
         * Counter used to detect if the token changed while a getToken request was
         * outstanding.
         */
        this.tokenCounter = 0;
        /** The listener registered with setChangeListener(). */
        this.changeListener = null;
        this.forceRefresh = false;
        this.tokenListener = function () {
            _this.tokenCounter++;
            _this.currentUser = _this.getUser();
            _this.receivedInitialUser = true;
            if (_this.changeListener) {
                _this.changeListener(_this.currentUser);
            }
        };
        this.tokenCounter = 0;
        this.auth = authProvider.getImmediate({ optional: true });
        if (this.auth) {
            this.auth.addAuthTokenListener(this.tokenListener);
        }
        else {
            // if auth is not available, invoke tokenListener once with null token
            this.tokenListener(null);
            authProvider.get().then(function (auth) {
                _this.auth = auth;
                if (_this.tokenListener) {
                    // tokenListener can be removed by removeChangeListener()
                    _this.auth.addAuthTokenListener(_this.tokenListener);
                }
            }, function () {
                /* this.authProvider.get() never rejects */
            });
        }
    }
    FirebaseCredentialsProvider.prototype.getToken = function () {
        var _this = this;
        // Take note of the current value of the tokenCounter so that this method
        // can fail (with an ABORTED error) if there is a token change while the
        // request is outstanding.
        var initialTokenCounter = this.tokenCounter;
        var forceRefresh = this.forceRefresh;
        this.forceRefresh = false;
        if (!this.auth) {
            return Promise.resolve(null);
        }
        return this.auth.getToken(forceRefresh).then(function (tokenData) {
            // Cancel the request since the token changed while the request was
            // outstanding so the response is potentially for a previous user (which
            // user, we can't be sure).
            if (_this.tokenCounter !== initialTokenCounter) {
                logDebug('FirebaseCredentialsProvider', 'getToken aborted due to token change.');
                return _this.getToken();
            }
            else {
                if (tokenData) {
                    hardAssert(typeof tokenData.accessToken === 'string');
                    return new OAuthToken(tokenData.accessToken, _this.currentUser);
                }
                else {
                    return null;
                }
            }
        });
    };
    FirebaseCredentialsProvider.prototype.invalidateToken = function () {
        this.forceRefresh = true;
    };
    FirebaseCredentialsProvider.prototype.setChangeListener = function (changeListener) {
        this.changeListener = changeListener;
        // Fire the initial event
        if (this.receivedInitialUser) {
            changeListener(this.currentUser);
        }
    };
    FirebaseCredentialsProvider.prototype.removeChangeListener = function () {
        if (this.auth) {
            this.auth.removeAuthTokenListener(this.tokenListener);
        }
        this.tokenListener = null;
        this.changeListener = null;
    };
    // Auth.getUid() can return null even with a user logged in. It is because
    // getUid() is synchronous, but the auth code populating Uid is asynchronous.
    // This method should only be called in the AuthTokenListener callback
    // to guarantee to get the actual user.
    FirebaseCredentialsProvider.prototype.getUser = function () {
        var currentUid = this.auth && this.auth.getUid();
        hardAssert(currentUid === null || typeof currentUid === 'string');
        return new User(currentUid);
    };
    return FirebaseCredentialsProvider;
}());
/*
 * FirstPartyToken provides a fresh token each time its value
 * is requested, because if the token is too old, requests will be rejected.
 * Technically this may no longer be necessary since the SDK should gracefully
 * recover from unauthenticated errors (see b/33147818 for context), but it's
 * safer to keep the implementation as-is.
 */
var FirstPartyToken = /** @class */ (function () {
    function FirstPartyToken(gapi, sessionIndex) {
        this.gapi = gapi;
        this.sessionIndex = sessionIndex;
        this.type = 'FirstParty';
        this.user = User.FIRST_PARTY;
    }
    Object.defineProperty(FirstPartyToken.prototype, "authHeaders", {
        get: function () {
            var headers = {
                'X-Goog-AuthUser': this.sessionIndex
            };
            var authHeader = this.gapi.auth.getAuthHeaderValueForFirstParty([]);
            if (authHeader) {
                headers['Authorization'] = authHeader;
            }
            return headers;
        },
        enumerable: false,
        configurable: true
    });
    return FirstPartyToken;
}());
/*
 * Provides user credentials required for the Firestore JavaScript SDK
 * to authenticate the user, using technique that is only available
 * to applications hosted by Google.
 */
var FirstPartyCredentialsProvider = /** @class */ (function () {
    function FirstPartyCredentialsProvider(gapi, sessionIndex) {
        this.gapi = gapi;
        this.sessionIndex = sessionIndex;
    }
    FirstPartyCredentialsProvider.prototype.getToken = function () {
        return Promise.resolve(new FirstPartyToken(this.gapi, this.sessionIndex));
    };
    FirstPartyCredentialsProvider.prototype.setChangeListener = function (changeListener) {
        // Fire with initial uid.
        changeListener(User.FIRST_PARTY);
    };
    FirstPartyCredentialsProvider.prototype.removeChangeListener = function () { };
    FirstPartyCredentialsProvider.prototype.invalidateToken = function () { };
    return FirstPartyCredentialsProvider;
}());
/**
 * Builds a CredentialsProvider depending on the type of
 * the credentials passed in.
 */
function makeCredentialsProvider(credentials) {
    if (!credentials) {
        return new EmptyCredentialsProvider();
    }
    switch (credentials.type) {
        case 'gapi':
            var client = credentials.client;
            // Make sure this really is a Gapi client.
            hardAssert(!!(typeof client === 'object' &&
                client !== null &&
                client['auth'] &&
                client['auth']['getAuthHeaderValueForFirstParty']));
            return new FirstPartyCredentialsProvider(client, credentials.sessionIndex || '0');
        case 'provider':
            return credentials.client;
        default:
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'makeCredentialsProvider failed due to invalid credential type');
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
function isPartialObserver(obj) {
    return implementsAnyMethods(obj, ['next', 'error', 'complete']);
}
/**
 * Returns true if obj is an object and contains at least one of the specified
 * methods.
 */
function implementsAnyMethods(obj, methods) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    var object = obj;
    for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
        var method = methods_1[_i];
        if (method in object && typeof object[method] === 'function') {
            return true;
        }
    }
    return false;
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
/** Helper function to assert Uint8Array is available at runtime. */
function assertUint8ArrayAvailable() {
    if (typeof Uint8Array === 'undefined') {
        throw new FirestoreError(Code.UNIMPLEMENTED, 'Uint8Arrays are not available in this environment.');
    }
}
/**
 * Immutable class holding a blob (binary data).
 * This class is directly exposed in the public API.
 *
 * Note that while you can't hide the constructor in JavaScript code, we are
 * using the hack above to make sure no-one outside this module can call it.
 */
var Blob = /** @class */ (function () {
    function Blob(byteString) {
        this._byteString = byteString;
    }
    Blob.fromBase64String = function (base64) {
        validateExactNumberOfArgs('Blob.fromBase64String', arguments, 1);
        validateArgType('Blob.fromBase64String', 'string', 1, base64);
        try {
            return new Blob(ByteString.fromBase64String(base64));
        }
        catch (e) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Failed to construct Blob from Base64 string: ' + e);
        }
    };
    Blob.fromUint8Array = function (array) {
        validateExactNumberOfArgs('Blob.fromUint8Array', arguments, 1);
        assertUint8ArrayAvailable();
        if (!(array instanceof Uint8Array)) {
            throw invalidClassError('Blob.fromUint8Array', 'Uint8Array', 1, array);
        }
        return new Blob(ByteString.fromUint8Array(array));
    };
    Blob.prototype.toBase64 = function () {
        validateExactNumberOfArgs('Blob.toBase64', arguments, 0);
        return this._byteString.toBase64();
    };
    Blob.prototype.toUint8Array = function () {
        validateExactNumberOfArgs('Blob.toUint8Array', arguments, 0);
        assertUint8ArrayAvailable();
        return this._byteString.toUint8Array();
    };
    Blob.prototype.toString = function () {
        return 'Blob(base64: ' + this.toBase64() + ')';
    };
    Blob.prototype.isEqual = function (other) {
        return this._byteString.isEqual(other._byteString);
    };
    return Blob;
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
 * An opaque base class for FieldValue sentinel objects in our public API that
 * is shared between the full, lite and legacy SDK.
 */
var SerializableFieldValue = /** @class */ (function () {
    function SerializableFieldValue() {
        /** A pointer to the implementing class. */
        this._delegate = this;
    }
    return SerializableFieldValue;
}());
var DeleteFieldValueImpl = /** @class */ (function (_super) {
    tslib.__extends(DeleteFieldValueImpl, _super);
    function DeleteFieldValueImpl(_methodName) {
        var _this = _super.call(this) || this;
        _this._methodName = _methodName;
        return _this;
    }
    DeleteFieldValueImpl.prototype._toFieldTransform = function (context) {
        if (context.dataSource === 2 /* MergeSet */) {
            // No transform to add for a delete, but we need to add it to our
            // fieldMask so it gets deleted.
            context.fieldMask.push(context.path);
        }
        else if (context.dataSource === 1 /* Update */) {
            throw context.createError(this._methodName + "() can only appear at the top level " +
                'of your update data');
        }
        else {
            // We shouldn't encounter delete sentinels for queries or non-merge set() calls.
            throw context.createError(this._methodName + "() cannot be used with set() unless you pass " +
                '{merge:true}');
        }
        return null;
    };
    DeleteFieldValueImpl.prototype.isEqual = function (other) {
        return other instanceof DeleteFieldValueImpl;
    };
    return DeleteFieldValueImpl;
}(SerializableFieldValue));
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
function createSentinelChildContext(fieldValue, context, arrayElement) {
    return new ParseContext({
        dataSource: 3 /* Argument */,
        targetDoc: context.settings.targetDoc,
        methodName: fieldValue._methodName,
        arrayElement: arrayElement
    }, context.databaseId, context.serializer, context.ignoreUndefinedProperties);
}
var ServerTimestampFieldValueImpl = /** @class */ (function (_super) {
    tslib.__extends(ServerTimestampFieldValueImpl, _super);
    function ServerTimestampFieldValueImpl(_methodName) {
        var _this = _super.call(this) || this;
        _this._methodName = _methodName;
        return _this;
    }
    ServerTimestampFieldValueImpl.prototype._toFieldTransform = function (context) {
        return new FieldTransform(context.path, new ServerTimestampTransform());
    };
    ServerTimestampFieldValueImpl.prototype.isEqual = function (other) {
        return other instanceof ServerTimestampFieldValueImpl;
    };
    return ServerTimestampFieldValueImpl;
}(SerializableFieldValue));
var ArrayUnionFieldValueImpl = /** @class */ (function (_super) {
    tslib.__extends(ArrayUnionFieldValueImpl, _super);
    function ArrayUnionFieldValueImpl(_methodName, _elements) {
        var _this = _super.call(this) || this;
        _this._methodName = _methodName;
        _this._elements = _elements;
        return _this;
    }
    ArrayUnionFieldValueImpl.prototype._toFieldTransform = function (context) {
        var parseContext = createSentinelChildContext(this, context, 
        /*array=*/ true);
        var parsedElements = this._elements.map(function (element) { return parseData(element, parseContext); });
        var arrayUnion = new ArrayUnionTransformOperation(parsedElements);
        return new FieldTransform(context.path, arrayUnion);
    };
    ArrayUnionFieldValueImpl.prototype.isEqual = function (other) {
        // TODO(mrschmidt): Implement isEquals
        return this === other;
    };
    return ArrayUnionFieldValueImpl;
}(SerializableFieldValue));
var ArrayRemoveFieldValueImpl = /** @class */ (function (_super) {
    tslib.__extends(ArrayRemoveFieldValueImpl, _super);
    function ArrayRemoveFieldValueImpl(_methodName, _elements) {
        var _this = _super.call(this) || this;
        _this._methodName = _methodName;
        _this._elements = _elements;
        return _this;
    }
    ArrayRemoveFieldValueImpl.prototype._toFieldTransform = function (context) {
        var parseContext = createSentinelChildContext(this, context, 
        /*array=*/ true);
        var parsedElements = this._elements.map(function (element) { return parseData(element, parseContext); });
        var arrayUnion = new ArrayRemoveTransformOperation(parsedElements);
        return new FieldTransform(context.path, arrayUnion);
    };
    ArrayRemoveFieldValueImpl.prototype.isEqual = function (other) {
        // TODO(mrschmidt): Implement isEquals
        return this === other;
    };
    return ArrayRemoveFieldValueImpl;
}(SerializableFieldValue));
var NumericIncrementFieldValueImpl = /** @class */ (function (_super) {
    tslib.__extends(NumericIncrementFieldValueImpl, _super);
    function NumericIncrementFieldValueImpl(_methodName, _operand) {
        var _this = _super.call(this) || this;
        _this._methodName = _methodName;
        _this._operand = _operand;
        return _this;
    }
    NumericIncrementFieldValueImpl.prototype._toFieldTransform = function (context) {
        var numericIncrement = new NumericIncrementTransformOperation(context.serializer, toNumber(context.serializer, this._operand));
        return new FieldTransform(context.path, numericIncrement);
    };
    NumericIncrementFieldValueImpl.prototype.isEqual = function (other) {
        // TODO(mrschmidt): Implement isEquals
        return this === other;
    };
    return NumericIncrementFieldValueImpl;
}(SerializableFieldValue));
/** The public FieldValue class of the lite API. */
var FieldValue = /** @class */ (function (_super) {
    tslib.__extends(FieldValue, _super);
    function FieldValue() {
        return _super.call(this) || this;
    }
    FieldValue.delete = function () {
        validateNoArgs('FieldValue.delete', arguments);
        return new FieldValueDelegate(new DeleteFieldValueImpl('FieldValue.delete'));
    };
    FieldValue.serverTimestamp = function () {
        validateNoArgs('FieldValue.serverTimestamp', arguments);
        return new FieldValueDelegate(new ServerTimestampFieldValueImpl('FieldValue.serverTimestamp'));
    };
    FieldValue.arrayUnion = function () {
        var elements = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            elements[_i] = arguments[_i];
        }
        validateAtLeastNumberOfArgs('FieldValue.arrayUnion', arguments, 1);
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
        return new FieldValueDelegate(new ArrayUnionFieldValueImpl('FieldValue.arrayUnion', elements));
    };
    FieldValue.arrayRemove = function () {
        var elements = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            elements[_i] = arguments[_i];
        }
        validateAtLeastNumberOfArgs('FieldValue.arrayRemove', arguments, 1);
        // NOTE: We don't actually parse the data until it's used in set() or
        // update() since we'd need the Firestore instance to do this.
        return new FieldValueDelegate(new ArrayRemoveFieldValueImpl('FieldValue.arrayRemove', elements));
    };
    FieldValue.increment = function (n) {
        validateArgType('FieldValue.increment', 'number', 1, n);
        validateExactNumberOfArgs('FieldValue.increment', arguments, 1);
        return new FieldValueDelegate(new NumericIncrementFieldValueImpl('FieldValue.increment', n));
    };
    return FieldValue;
}(SerializableFieldValue));
/**
 * A delegate class that allows the FieldValue implementations returned by
 * deleteField(), serverTimestamp(), arrayUnion(), arrayRemove() and
 * increment() to be an instance of the legacy FieldValue class declared above.
 *
 * We don't directly subclass `FieldValue` in the various field value
 * implementations as the base FieldValue class differs between the lite, full
 * and legacy SDK.
 */
var FieldValueDelegate = /** @class */ (function (_super) {
    tslib.__extends(FieldValueDelegate, _super);
    function FieldValueDelegate(_delegate) {
        var _this = _super.call(this) || this;
        _this._delegate = _delegate;
        _this._methodName = _delegate._methodName;
        return _this;
    }
    FieldValueDelegate.prototype._toFieldTransform = function (context) {
        return this._delegate._toFieldTransform(context);
    };
    FieldValueDelegate.prototype.isEqual = function (other) {
        if (!(other instanceof FieldValueDelegate)) {
            return false;
        }
        return this._delegate.isEqual(other._delegate);
    };
    return FieldValueDelegate;
}(FieldValue));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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
 */
var GeoPoint = /** @class */ (function () {
    function GeoPoint(latitude, longitude) {
        validateExactNumberOfArgs('GeoPoint', arguments, 2);
        validateArgType('GeoPoint', 'number', 1, latitude);
        validateArgType('GeoPoint', 'number', 2, longitude);
        if (!isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Latitude must be a number between -90 and 90, but was: ' + latitude);
        }
        if (!isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Longitude must be a number between -180 and 180, but was: ' + longitude);
        }
        this._lat = latitude;
        this._long = longitude;
    }
    Object.defineProperty(GeoPoint.prototype, "latitude", {
        /**
         * Returns the latitude of this geo point, a number between -90 and 90.
         */
        get: function () {
            return this._lat;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(GeoPoint.prototype, "longitude", {
        /**
         * Returns the longitude of this geo point, a number between -180 and 180.
         */
        get: function () {
            return this._long;
        },
        enumerable: false,
        configurable: true
    });
    GeoPoint.prototype.isEqual = function (other) {
        return this._lat === other._lat && this._long === other._long;
    };
    /**
     * Actually private to JS consumers of our API, so this function is prefixed
     * with an underscore.
     */
    GeoPoint.prototype._compareTo = function (other) {
        return (primitiveComparator(this._lat, other._lat) ||
            primitiveComparator(this._long, other._long));
    };
    return GeoPoint;
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
var RESERVED_FIELD_REGEX = /^__.*__$/;
/**
 * A reference to a document in a Firebase project.
 *
 * This class serves as a common base class for the public DocumentReferences
 * exposed in the lite, full and legacy SDK.
 */
var DocumentKeyReference = /** @class */ (function () {
    function DocumentKeyReference(_databaseId, _key, _converter) {
        this._databaseId = _databaseId;
        this._key = _key;
        this._converter = _converter;
    }
    return DocumentKeyReference;
}());
/** The result of parsing document data (e.g. for a setData call). */
var ParsedSetData = /** @class */ (function () {
    function ParsedSetData(data, fieldMask, fieldTransforms) {
        this.data = data;
        this.fieldMask = fieldMask;
        this.fieldTransforms = fieldTransforms;
    }
    ParsedSetData.prototype.toMutations = function (key, precondition) {
        var mutations = [];
        if (this.fieldMask !== null) {
            mutations.push(new PatchMutation(key, this.data, this.fieldMask, precondition));
        }
        else {
            mutations.push(new SetMutation(key, this.data, precondition));
        }
        if (this.fieldTransforms.length > 0) {
            mutations.push(new TransformMutation(key, this.fieldTransforms));
        }
        return mutations;
    };
    return ParsedSetData;
}());
/** The result of parsing "update" data (i.e. for an updateData call). */
var ParsedUpdateData = /** @class */ (function () {
    function ParsedUpdateData(data, fieldMask, fieldTransforms) {
        this.data = data;
        this.fieldMask = fieldMask;
        this.fieldTransforms = fieldTransforms;
    }
    ParsedUpdateData.prototype.toMutations = function (key, precondition) {
        var mutations = [
            new PatchMutation(key, this.data, this.fieldMask, precondition)
        ];
        if (this.fieldTransforms.length > 0) {
            mutations.push(new TransformMutation(key, this.fieldTransforms));
        }
        return mutations;
    };
    return ParsedUpdateData;
}());
function isWrite(dataSource) {
    switch (dataSource) {
        case 0 /* Set */: // fall through
        case 2 /* MergeSet */: // fall through
        case 1 /* Update */:
            return true;
        case 3 /* Argument */:
        case 4 /* ArrayArgument */:
            return false;
        default:
            throw fail();
    }
}
/** A "context" object passed around while parsing user data. */
var ParseContext = /** @class */ (function () {
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
    function ParseContext(settings, databaseId, serializer, ignoreUndefinedProperties, fieldTransforms, fieldMask) {
        this.settings = settings;
        this.databaseId = databaseId;
        this.serializer = serializer;
        this.ignoreUndefinedProperties = ignoreUndefinedProperties;
        // Minor hack: If fieldTransforms is undefined, we assume this is an
        // external call and we need to validate the entire path.
        if (fieldTransforms === undefined) {
            this.validatePath();
        }
        this.fieldTransforms = fieldTransforms || [];
        this.fieldMask = fieldMask || [];
    }
    Object.defineProperty(ParseContext.prototype, "path", {
        get: function () {
            return this.settings.path;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ParseContext.prototype, "dataSource", {
        get: function () {
            return this.settings.dataSource;
        },
        enumerable: false,
        configurable: true
    });
    /** Returns a new context with the specified settings overwritten. */
    ParseContext.prototype.contextWith = function (configuration) {
        return new ParseContext(Object.assign(Object.assign({}, this.settings), configuration), this.databaseId, this.serializer, this.ignoreUndefinedProperties, this.fieldTransforms, this.fieldMask);
    };
    ParseContext.prototype.childContextForField = function (field) {
        var _a;
        var childPath = (_a = this.path) === null || _a === void 0 ? void 0 : _a.child(field);
        var context = this.contextWith({ path: childPath, arrayElement: false });
        context.validatePathSegment(field);
        return context;
    };
    ParseContext.prototype.childContextForFieldPath = function (field) {
        var _a;
        var childPath = (_a = this.path) === null || _a === void 0 ? void 0 : _a.child(field);
        var context = this.contextWith({ path: childPath, arrayElement: false });
        context.validatePath();
        return context;
    };
    ParseContext.prototype.childContextForArray = function (index) {
        // TODO(b/34871131): We don't support array paths right now; so make path
        // undefined.
        return this.contextWith({ path: undefined, arrayElement: true });
    };
    ParseContext.prototype.createError = function (reason) {
        return createError(reason, this.settings.methodName, this.settings.hasConverter || false, this.path, this.settings.targetDoc);
    };
    /** Returns 'true' if 'fieldPath' was traversed when creating this context. */
    ParseContext.prototype.contains = function (fieldPath) {
        return (this.fieldMask.find(function (field) { return fieldPath.isPrefixOf(field); }) !== undefined ||
            this.fieldTransforms.find(function (transform) { return fieldPath.isPrefixOf(transform.field); }) !== undefined);
    };
    ParseContext.prototype.validatePath = function () {
        // TODO(b/34871131): Remove null check once we have proper paths for fields
        // within arrays.
        if (!this.path) {
            return;
        }
        for (var i = 0; i < this.path.length; i++) {
            this.validatePathSegment(this.path.get(i));
        }
    };
    ParseContext.prototype.validatePathSegment = function (segment) {
        if (segment.length === 0) {
            throw this.createError('Document fields must not be empty');
        }
        if (isWrite(this.dataSource) && RESERVED_FIELD_REGEX.test(segment)) {
            throw this.createError('Document fields cannot begin and end with "__"');
        }
    };
    return ParseContext;
}());
/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */
var UserDataReader = /** @class */ (function () {
    function UserDataReader(databaseId, ignoreUndefinedProperties, serializer) {
        this.databaseId = databaseId;
        this.ignoreUndefinedProperties = ignoreUndefinedProperties;
        this.serializer = serializer || newSerializer(databaseId);
    }
    /** Creates a new top-level parse context. */
    UserDataReader.prototype.createContext = function (dataSource, methodName, targetDoc, hasConverter) {
        if (hasConverter === void 0) { hasConverter = false; }
        return new ParseContext({
            dataSource: dataSource,
            methodName: methodName,
            targetDoc: targetDoc,
            path: FieldPath.emptyPath(),
            arrayElement: false,
            hasConverter: hasConverter
        }, this.databaseId, this.serializer, this.ignoreUndefinedProperties);
    };
    return UserDataReader;
}());
/** Parse document data from a set() call. */
function parseSetData(userDataReader, methodName, targetDoc, input, hasConverter, options) {
    if (options === void 0) { options = {}; }
    var context = userDataReader.createContext(options.merge || options.mergeFields
        ? 2 /* MergeSet */
        : 0 /* Set */, methodName, targetDoc, hasConverter);
    validatePlainObject('Data must be an object, but it was:', context, input);
    var updateData = parseObject(input, context);
    var fieldMask;
    var fieldTransforms;
    if (options.merge) {
        fieldMask = new FieldMask(context.fieldMask);
        fieldTransforms = context.fieldTransforms;
    }
    else if (options.mergeFields) {
        var validatedFieldPaths = [];
        for (var _i = 0, _e = options.mergeFields; _i < _e.length; _i++) {
            var stringOrFieldPath = _e[_i];
            var fieldPath = void 0;
            if (stringOrFieldPath instanceof BaseFieldPath) {
                fieldPath = stringOrFieldPath._internalPath;
            }
            else if (typeof stringOrFieldPath === 'string') {
                fieldPath = fieldPathFromDotSeparatedString(methodName, stringOrFieldPath, targetDoc);
            }
            else {
                throw fail();
            }
            if (!context.contains(fieldPath)) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Field '" + fieldPath + "' is specified in your field mask but missing from your input data.");
            }
            if (!fieldMaskContains(validatedFieldPaths, fieldPath)) {
                validatedFieldPaths.push(fieldPath);
            }
        }
        fieldMask = new FieldMask(validatedFieldPaths);
        fieldTransforms = context.fieldTransforms.filter(function (transform) { return fieldMask.covers(transform.field); });
    }
    else {
        fieldMask = null;
        fieldTransforms = context.fieldTransforms;
    }
    return new ParsedSetData(new ObjectValue(updateData), fieldMask, fieldTransforms);
}
/** Parse update data from an update() call. */
function parseUpdateData(userDataReader, methodName, targetDoc, input) {
    var context = userDataReader.createContext(1 /* Update */, methodName, targetDoc);
    validatePlainObject('Data must be an object, but it was:', context, input);
    var fieldMaskPaths = [];
    var updateData = new ObjectValueBuilder();
    forEach(input, function (key, value) {
        var path = fieldPathFromDotSeparatedString(methodName, key, targetDoc);
        var childContext = context.childContextForFieldPath(path);
        if (value instanceof SerializableFieldValue &&
            value._delegate instanceof DeleteFieldValueImpl) {
            // Add it to the field mask, but don't add anything to updateData.
            fieldMaskPaths.push(path);
        }
        else {
            var parsedValue = parseData(value, childContext);
            if (parsedValue != null) {
                fieldMaskPaths.push(path);
                updateData.set(path, parsedValue);
            }
        }
    });
    var mask = new FieldMask(fieldMaskPaths);
    return new ParsedUpdateData(updateData.build(), mask, context.fieldTransforms);
}
/** Parse update data from a list of field/value arguments. */
function parseUpdateVarargs(userDataReader, methodName, targetDoc, field, value, moreFieldsAndValues) {
    var context = userDataReader.createContext(1 /* Update */, methodName, targetDoc);
    var keys = [fieldPathFromArgument(methodName, field, targetDoc)];
    var values = [value];
    if (moreFieldsAndValues.length % 2 !== 0) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + methodName + "() needs to be called with an even number " +
            'of arguments that alternate between field names and values.');
    }
    for (var i = 0; i < moreFieldsAndValues.length; i += 2) {
        keys.push(fieldPathFromArgument(methodName, moreFieldsAndValues[i]));
        values.push(moreFieldsAndValues[i + 1]);
    }
    var fieldMaskPaths = [];
    var updateData = new ObjectValueBuilder();
    // We iterate in reverse order to pick the last value for a field if the
    // user specified the field multiple times.
    for (var i = keys.length - 1; i >= 0; --i) {
        if (!fieldMaskContains(fieldMaskPaths, keys[i])) {
            var path = keys[i];
            var value_1 = values[i];
            var childContext = context.childContextForFieldPath(path);
            if (value_1 instanceof SerializableFieldValue &&
                value_1._delegate instanceof DeleteFieldValueImpl) {
                // Add it to the field mask, but don't add anything to updateData.
                fieldMaskPaths.push(path);
            }
            else {
                var parsedValue = parseData(value_1, childContext);
                if (parsedValue != null) {
                    fieldMaskPaths.push(path);
                    updateData.set(path, parsedValue);
                }
            }
        }
    }
    var mask = new FieldMask(fieldMaskPaths);
    return new ParsedUpdateData(updateData.build(), mask, context.fieldTransforms);
}
/**
 * Parse a "query value" (e.g. value in a where filter or a value in a cursor
 * bound).
 *
 * @param allowArrays Whether the query value is an array that may directly
 * contain additional arrays (e.g. the operand of an `in` query).
 */
function parseQueryValue(userDataReader, methodName, input, allowArrays) {
    if (allowArrays === void 0) { allowArrays = false; }
    var context = userDataReader.createContext(allowArrays ? 4 /* ArrayArgument */ : 3 /* Argument */, methodName);
    var parsed = parseData(input, context);
    return parsed;
}
/**
 * Parses user data to Protobuf Values.
 *
 * @param input Data to be parsed.
 * @param context A context object representing the current path being parsed,
 * the source of the data being parsed, etc.
 * @return The parsed value, or null if the value was a FieldValue sentinel
 * that should not be included in the resulting parsed data.
 */
function parseData(input, context) {
    if (looksLikeJsonObject(input)) {
        validatePlainObject('Unsupported field value:', context, input);
        return parseObject(input, context);
    }
    else if (input instanceof SerializableFieldValue) {
        // FieldValues usually parse into transforms (except FieldValue.delete())
        // in which case we do not want to include this field in our parsed data
        // (as doing so will overwrite the field directly prior to the transform
        // trying to transform it). So we don't add this location to
        // context.fieldMask and we return null as our parsing result.
        parseSentinelFieldValue(input, context);
        return null;
    }
    else {
        // If context.path is null we are inside an array and we don't support
        // field mask paths more granular than the top-level array.
        if (context.path) {
            context.fieldMask.push(context.path);
        }
        if (input instanceof Array) {
            // TODO(b/34871131): Include the path containing the array in the error
            // message.
            // In the case of IN queries, the parsed data is an array (representing
            // the set of values to be included for the IN query) that may directly
            // contain additional arrays (each representing an individual field
            // value), so we disable this validation.
            if (context.settings.arrayElement &&
                context.dataSource !== 4 /* ArrayArgument */) {
                throw context.createError('Nested arrays are not supported');
            }
            return parseArray(input, context);
        }
        else {
            return parseScalarValue(input, context);
        }
    }
}
function parseObject(obj, context) {
    var fields = {};
    if (isEmpty(obj)) {
        // If we encounter an empty object, we explicitly add it to the update
        // mask to ensure that the server creates a map entry.
        if (context.path && context.path.length > 0) {
            context.fieldMask.push(context.path);
        }
    }
    else {
        forEach(obj, function (key, val) {
            var parsedValue = parseData(val, context.childContextForField(key));
            if (parsedValue != null) {
                fields[key] = parsedValue;
            }
        });
    }
    return { mapValue: { fields: fields } };
}
function parseArray(array, context) {
    var values = [];
    var entryIndex = 0;
    for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
        var entry = array_1[_i];
        var parsedEntry = parseData(entry, context.childContextForArray(entryIndex));
        if (parsedEntry == null) {
            // Just include nulls in the array for fields being replaced with a
            // sentinel.
            parsedEntry = { nullValue: 'NULL_VALUE' };
        }
        values.push(parsedEntry);
        entryIndex++;
    }
    return { arrayValue: { values: values } };
}
/**
 * "Parses" the provided FieldValueImpl, adding any necessary transforms to
 * context.fieldTransforms.
 */
function parseSentinelFieldValue(value, context) {
    // Sentinels are only supported with writes, and not within arrays.
    if (!isWrite(context.dataSource)) {
        throw context.createError(value._methodName + "() can only be used with update() and set()");
    }
    if (!context.path) {
        throw context.createError(value._methodName + "() is not currently supported inside arrays");
    }
    var fieldTransform = value._toFieldTransform(context);
    if (fieldTransform) {
        context.fieldTransforms.push(fieldTransform);
    }
}
/**
 * Helper to parse a scalar value (i.e. not an Object, Array, or FieldValue)
 *
 * @return The parsed value
 */
function parseScalarValue(value, context) {
    if (value === null) {
        return { nullValue: 'NULL_VALUE' };
    }
    else if (typeof value === 'number') {
        return toNumber(context.serializer, value);
    }
    else if (typeof value === 'boolean') {
        return { booleanValue: value };
    }
    else if (typeof value === 'string') {
        return { stringValue: value };
    }
    else if (value instanceof Date) {
        var timestamp = Timestamp.fromDate(value);
        return {
            timestampValue: toTimestamp(context.serializer, timestamp)
        };
    }
    else if (value instanceof Timestamp) {
        // Firestore backend truncates precision down to microseconds. To ensure
        // offline mode works the same with regards to truncation, perform the
        // truncation immediately without waiting for the backend to do that.
        var timestamp = new Timestamp(value.seconds, Math.floor(value.nanoseconds / 1000) * 1000);
        return {
            timestampValue: toTimestamp(context.serializer, timestamp)
        };
    }
    else if (value instanceof GeoPoint) {
        return {
            geoPointValue: {
                latitude: value.latitude,
                longitude: value.longitude
            }
        };
    }
    else if (value instanceof Blob) {
        return { bytesValue: toBytes(context.serializer, value) };
    }
    else if (value instanceof DocumentKeyReference) {
        var thisDb = context.databaseId;
        var otherDb = value._databaseId;
        if (!otherDb.isEqual(thisDb)) {
            throw context.createError('Document reference is for database ' +
                (otherDb.projectId + "/" + otherDb.database + " but should be ") +
                ("for database " + thisDb.projectId + "/" + thisDb.database));
        }
        return {
            referenceValue: toResourceName(value._databaseId || context.databaseId, value._key.path)
        };
    }
    else if (value === undefined && context.ignoreUndefinedProperties) {
        return null;
    }
    else {
        throw context.createError("Unsupported field value: " + valueDescription(value));
    }
}
/**
 * Checks whether an object looks like a JSON object that should be converted
 * into a struct. Normal class/prototype instances are considered to look like
 * JSON objects since they should be converted to a struct value. Arrays, Dates,
 * GeoPoints, etc. are not considered to look like JSON objects since they map
 * to specific FieldValue types other than ObjectValue.
 */
function looksLikeJsonObject(input) {
    return (typeof input === 'object' &&
        input !== null &&
        !(input instanceof Array) &&
        !(input instanceof Date) &&
        !(input instanceof Timestamp) &&
        !(input instanceof GeoPoint) &&
        !(input instanceof Blob) &&
        !(input instanceof DocumentKeyReference) &&
        !(input instanceof SerializableFieldValue));
}
function validatePlainObject(message, context, input) {
    if (!looksLikeJsonObject(input) || !isPlainObject(input)) {
        var description = valueDescription(input);
        if (description === 'an object') {
            // Massage the error if it was an object.
            throw context.createError(message + ' a custom object');
        }
        else {
            throw context.createError(message + ' ' + description);
        }
    }
}
/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */
function fieldPathFromArgument(methodName, path, targetDoc) {
    if (path instanceof BaseFieldPath) {
        return path._internalPath;
    }
    else if (typeof path === 'string') {
        return fieldPathFromDotSeparatedString(methodName, path);
    }
    else {
        var message = 'Field path arguments must be of type string or FieldPath.';
        throw createError(message, methodName, 
        /* hasConverter= */ false, 
        /* path= */ undefined, targetDoc);
    }
}
/**
 * Wraps fromDotSeparatedString with an error message about the method that
 * was thrown.
 * @param methodName The publicly visible method name
 * @param path The dot-separated string form of a field path which will be split
 * on dots.
 * @param targetDoc The document against which the field path will be evaluated.
 */
function fieldPathFromDotSeparatedString(methodName, path, targetDoc) {
    try {
        return fromDotSeparatedString(path)._internalPath;
    }
    catch (e) {
        var message = errorMessage(e);
        throw createError(message, methodName, 
        /* hasConverter= */ false, 
        /* path= */ undefined, targetDoc);
    }
}
function createError(reason, methodName, hasConverter, path, targetDoc) {
    var hasPath = path && !path.isEmpty();
    var hasDocument = targetDoc !== undefined;
    var message = "Function " + methodName + "() called with invalid data";
    if (hasConverter) {
        message += ' (via `toFirestore()`)';
    }
    message += '. ';
    var description = '';
    if (hasPath || hasDocument) {
        description += ' (found';
        if (hasPath) {
            description += " in field " + path;
        }
        if (hasDocument) {
            description += " in document " + targetDoc;
        }
        description += ')';
    }
    return new FirestoreError(Code.INVALID_ARGUMENT, message + reason + description);
}
/**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */
function errorMessage(error) {
    return error instanceof Error ? error.message : error.toString();
}
/** Checks `haystack` if FieldPath `needle` is present. Runs in O(n). */
function fieldMaskContains(haystack, needle) {
    return haystack.some(function (v) { return v.isEqual(needle); });
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
 */
var UserDataWriter = /** @class */ (function () {
    function UserDataWriter(databaseId, timestampsInSnapshots, serverTimestampBehavior, referenceFactory) {
        this.databaseId = databaseId;
        this.timestampsInSnapshots = timestampsInSnapshots;
        this.serverTimestampBehavior = serverTimestampBehavior;
        this.referenceFactory = referenceFactory;
    }
    UserDataWriter.prototype.convertValue = function (value) {
        switch (typeOrder(value)) {
            case 0 /* NullValue */:
                return null;
            case 1 /* BooleanValue */:
                return value.booleanValue;
            case 2 /* NumberValue */:
                return normalizeNumber(value.integerValue || value.doubleValue);
            case 3 /* TimestampValue */:
                return this.convertTimestamp(value.timestampValue);
            case 4 /* ServerTimestampValue */:
                return this.convertServerTimestamp(value);
            case 5 /* StringValue */:
                return value.stringValue;
            case 6 /* BlobValue */:
                return new Blob(normalizeByteString(value.bytesValue));
            case 7 /* RefValue */:
                return this.convertReference(value.referenceValue);
            case 8 /* GeoPointValue */:
                return this.convertGeoPoint(value.geoPointValue);
            case 9 /* ArrayValue */:
                return this.convertArray(value.arrayValue);
            case 10 /* ObjectValue */:
                return this.convertObject(value.mapValue);
            default:
                throw fail();
        }
    };
    UserDataWriter.prototype.convertObject = function (mapValue) {
        var _this = this;
        var result = {};
        forEach(mapValue.fields || {}, function (key, value) {
            result[key] = _this.convertValue(value);
        });
        return result;
    };
    UserDataWriter.prototype.convertGeoPoint = function (value) {
        return new GeoPoint(normalizeNumber(value.latitude), normalizeNumber(value.longitude));
    };
    UserDataWriter.prototype.convertArray = function (arrayValue) {
        var _this = this;
        return (arrayValue.values || []).map(function (value) { return _this.convertValue(value); });
    };
    UserDataWriter.prototype.convertServerTimestamp = function (value) {
        switch (this.serverTimestampBehavior) {
            case 'previous':
                var previousValue = getPreviousValue(value);
                if (previousValue == null) {
                    return null;
                }
                return this.convertValue(previousValue);
            case 'estimate':
                return this.convertTimestamp(getLocalWriteTime(value));
            default:
                return null;
        }
    };
    UserDataWriter.prototype.convertTimestamp = function (value) {
        var normalizedValue = normalizeTimestamp(value);
        var timestamp = new Timestamp(normalizedValue.seconds, normalizedValue.nanos);
        if (this.timestampsInSnapshots) {
            return timestamp;
        }
        else {
            return timestamp.toDate();
        }
    };
    UserDataWriter.prototype.convertReference = function (name) {
        var resourcePath = ResourcePath.fromString(name);
        hardAssert(isValidResourceName(resourcePath));
        var databaseId = new DatabaseId(resourcePath.get(1), resourcePath.get(3));
        var key = new DocumentKey(resourcePath.popFirst(5));
        if (!databaseId.isEqual(this.databaseId)) {
            // TODO(b/64130202): Somehow support foreign references.
            logError("Document " + key + " contains a document " +
                "reference within a different database (" +
                (databaseId.projectId + "/" + databaseId.database + ") which is not ") +
                "supported. It will be treated as a reference in the current " +
                ("database (" + this.databaseId.projectId + "/" + this.databaseId.database + ") ") +
                "instead.");
        }
        return this.referenceFactory(key);
    };
    return UserDataWriter;
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
// settings() defaults:
var DEFAULT_HOST = 'firestore.googleapis.com';
var DEFAULT_SSL = true;
var DEFAULT_TIMESTAMPS_IN_SNAPSHOTS = true;
var DEFAULT_FORCE_LONG_POLLING = false;
var DEFAULT_IGNORE_UNDEFINED_PROPERTIES = false;
/**
 * Constant used to indicate the LRU garbage collection should be disabled.
 * Set this value as the `cacheSizeBytes` on the settings passed to the
 * `Firestore` instance.
 */
var CACHE_SIZE_UNLIMITED = LruParams.COLLECTION_DISABLED;
// enablePersistence() defaults:
var DEFAULT_SYNCHRONIZE_TABS = false;
/**
 * A concrete type describing all the values that can be applied via a
 * user-supplied firestore.Settings object. This is a separate type so that
 * defaults can be supplied and the value can be checked for equality.
 */
var FirestoreSettings = /** @class */ (function () {
    function FirestoreSettings(settings) {
        var _a, _b, _c, _d;
        if (settings.host === undefined) {
            if (settings.ssl !== undefined) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Can't provide ssl option if host option is not set");
            }
            this.host = DEFAULT_HOST;
            this.ssl = DEFAULT_SSL;
        }
        else {
            validateNamedType('settings', 'non-empty string', 'host', settings.host);
            this.host = settings.host;
            validateNamedOptionalType('settings', 'boolean', 'ssl', settings.ssl);
            this.ssl = (_a = settings.ssl) !== null && _a !== void 0 ? _a : DEFAULT_SSL;
        }
        validateOptionNames('settings', settings, [
            'host',
            'ssl',
            'credentials',
            'timestampsInSnapshots',
            'cacheSizeBytes',
            'experimentalForceLongPolling',
            'ignoreUndefinedProperties'
        ]);
        validateNamedOptionalType('settings', 'object', 'credentials', settings.credentials);
        this.credentials = settings.credentials;
        validateNamedOptionalType('settings', 'boolean', 'timestampsInSnapshots', settings.timestampsInSnapshots);
        validateNamedOptionalType('settings', 'boolean', 'ignoreUndefinedProperties', settings.ignoreUndefinedProperties);
        // Nobody should set timestampsInSnapshots anymore, but the error depends on
        // whether they set it to true or false...
        if (settings.timestampsInSnapshots === true) {
            logError("The setting 'timestampsInSnapshots: true' is no longer required " +
                'and should be removed.');
        }
        else if (settings.timestampsInSnapshots === false) {
            logError("Support for 'timestampsInSnapshots: false' will be removed soon. " +
                'You must update your code to handle Timestamp objects.');
        }
        this.timestampsInSnapshots = (_b = settings.timestampsInSnapshots) !== null && _b !== void 0 ? _b : DEFAULT_TIMESTAMPS_IN_SNAPSHOTS;
        this.ignoreUndefinedProperties = (_c = settings.ignoreUndefinedProperties) !== null && _c !== void 0 ? _c : DEFAULT_IGNORE_UNDEFINED_PROPERTIES;
        validateNamedOptionalType('settings', 'number', 'cacheSizeBytes', settings.cacheSizeBytes);
        if (settings.cacheSizeBytes === undefined) {
            this.cacheSizeBytes = LruParams.DEFAULT_CACHE_SIZE_BYTES;
        }
        else {
            if (settings.cacheSizeBytes !== CACHE_SIZE_UNLIMITED &&
                settings.cacheSizeBytes < LruParams.MINIMUM_CACHE_SIZE_BYTES) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "cacheSizeBytes must be at least " + LruParams.MINIMUM_CACHE_SIZE_BYTES);
            }
            else {
                this.cacheSizeBytes = settings.cacheSizeBytes;
            }
        }
        validateNamedOptionalType('settings', 'boolean', 'experimentalForceLongPolling', settings.experimentalForceLongPolling);
        this.forceLongPolling = (_d = settings.experimentalForceLongPolling) !== null && _d !== void 0 ? _d : DEFAULT_FORCE_LONG_POLLING;
    }
    FirestoreSettings.prototype.isEqual = function (other) {
        return (this.host === other.host &&
            this.ssl === other.ssl &&
            this.timestampsInSnapshots === other.timestampsInSnapshots &&
            this.credentials === other.credentials &&
            this.cacheSizeBytes === other.cacheSizeBytes &&
            this.forceLongPolling === other.forceLongPolling &&
            this.ignoreUndefinedProperties === other.ignoreUndefinedProperties);
    };
    return FirestoreSettings;
}());
/**
 * The root reference to the database.
 */
var Firestore = /** @class */ (function () {
    // Note: We are using `MemoryComponentProvider` as a default
    // ComponentProvider to ensure backwards compatibility with the format
    // expected by the console build.
    function Firestore(databaseIdOrApp, authProvider, _offlineComponentProvider, _onlineComponentProvider) {
        var _this = this;
        if (_offlineComponentProvider === void 0) { _offlineComponentProvider = new MemoryOfflineComponentProvider(); }
        if (_onlineComponentProvider === void 0) { _onlineComponentProvider = new OnlineComponentProvider(); }
        this._offlineComponentProvider = _offlineComponentProvider;
        this._onlineComponentProvider = _onlineComponentProvider;
        this._firebaseApp = null;
        // Public for use in tests.
        // TODO(mikelehen): Use modularized initialization instead.
        this._queue = new AsyncQueue();
        this.INTERNAL = {
            delete: function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                return tslib.__generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            // The client must be initalized to ensure that all subsequent API usage
                            // throws an exception.
                            this.ensureClientConfigured();
                            return [4 /*yield*/, this._firestoreClient.terminate()];
                        case 1:
                            _e.sent();
                            return [2 /*return*/];
                    }
                });
            }); }
        };
        if (typeof databaseIdOrApp.options === 'object') {
            // This is very likely a Firebase app object
            // TODO(b/34177605): Can we somehow use instanceof?
            var app = databaseIdOrApp;
            this._firebaseApp = app;
            this._databaseId = Firestore.databaseIdFromApp(app);
            this._persistenceKey = app.name;
            this._credentials = new FirebaseCredentialsProvider(authProvider);
        }
        else {
            var external_1 = databaseIdOrApp;
            if (!external_1.projectId) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, 'Must provide projectId');
            }
            this._databaseId = new DatabaseId(external_1.projectId, external_1.database);
            // Use a default persistenceKey that lines up with FirebaseApp.
            this._persistenceKey = '[DEFAULT]';
            this._credentials = new EmptyCredentialsProvider();
        }
        this._settings = new FirestoreSettings({});
    }
    Object.defineProperty(Firestore.prototype, "_dataReader", {
        get: function () {
            if (!this._userDataReader) {
                // Lazy initialize UserDataReader once the settings are frozen
                this._userDataReader = new UserDataReader(this._databaseId, this._settings.ignoreUndefinedProperties);
            }
            return this._userDataReader;
        },
        enumerable: false,
        configurable: true
    });
    Firestore.prototype.settings = function (settingsLiteral) {
        validateExactNumberOfArgs('Firestore.settings', arguments, 1);
        validateArgType('Firestore.settings', 'object', 1, settingsLiteral);
        var newSettings = new FirestoreSettings(settingsLiteral);
        if (this._firestoreClient && !this._settings.isEqual(newSettings)) {
            throw new FirestoreError(Code.FAILED_PRECONDITION, 'Firestore has already been started and its settings can no longer ' +
                'be changed. You can only call settings() before calling any other ' +
                'methods on a Firestore object.');
        }
        this._settings = newSettings;
        if (newSettings.credentials !== undefined) {
            this._credentials = makeCredentialsProvider(newSettings.credentials);
        }
    };
    Firestore.prototype.enableNetwork = function () {
        this.ensureClientConfigured();
        return this._firestoreClient.enableNetwork();
    };
    Firestore.prototype.disableNetwork = function () {
        this.ensureClientConfigured();
        return this._firestoreClient.disableNetwork();
    };
    Firestore.prototype.enablePersistence = function (settings) {
        var _a, _b;
        if (this._firestoreClient) {
            throw new FirestoreError(Code.FAILED_PRECONDITION, 'Firestore has already been started and persistence can no longer ' +
                'be enabled. You can only call enablePersistence() before calling ' +
                'any other methods on a Firestore object.');
        }
        var synchronizeTabs = false;
        var experimentalForceOwningTab = false;
        if (settings) {
            if (settings.experimentalTabSynchronization !== undefined) {
                logError("The 'experimentalTabSynchronization' setting will be removed. Use 'synchronizeTabs' instead.");
            }
            synchronizeTabs = (_b = (_a = settings.synchronizeTabs) !== null && _a !== void 0 ? _a : settings.experimentalTabSynchronization) !== null && _b !== void 0 ? _b : DEFAULT_SYNCHRONIZE_TABS;
            experimentalForceOwningTab = settings.experimentalForceOwningTab
                ? settings.experimentalForceOwningTab
                : false;
            if (synchronizeTabs && experimentalForceOwningTab) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "The 'experimentalForceOwningTab' setting cannot be used with 'synchronizeTabs'.");
            }
        }
        return this.configureClient(this._offlineComponentProvider, this._onlineComponentProvider, {
            durable: true,
            cacheSizeBytes: this._settings.cacheSizeBytes,
            synchronizeTabs: synchronizeTabs,
            forceOwningTab: experimentalForceOwningTab
        });
    };
    Firestore.prototype.clearPersistence = function () {
        return tslib.__awaiter(this, void 0, void 0, function () {
            var deferred;
            var _this = this;
            return tslib.__generator(this, function (_e) {
                if (this._firestoreClient !== undefined &&
                    !this._firestoreClient.clientTerminated) {
                    throw new FirestoreError(Code.FAILED_PRECONDITION, 'Persistence can only be cleared before a Firestore instance is ' +
                        'initialized or after it is terminated.');
                }
                deferred = new Deferred();
                this._queue.enqueueAndForgetEvenWhileRestricted(function () { return tslib.__awaiter(_this, void 0, void 0, function () {
                    var e_13;
                    return tslib.__generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                _e.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, this._offlineComponentProvider.clearPersistence(this._databaseId, this._persistenceKey)];
                            case 1:
                                _e.sent();
                                deferred.resolve();
                                return [3 /*break*/, 3];
                            case 2:
                                e_13 = _e.sent();
                                deferred.reject(e_13);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); });
                return [2 /*return*/, deferred.promise];
            });
        });
    };
    Firestore.prototype.terminate = function () {
        this.app._removeServiceInstance('firestore');
        return this.INTERNAL.delete();
    };
    Object.defineProperty(Firestore.prototype, "_isTerminated", {
        get: function () {
            this.ensureClientConfigured();
            return this._firestoreClient.clientTerminated;
        },
        enumerable: false,
        configurable: true
    });
    Firestore.prototype.waitForPendingWrites = function () {
        this.ensureClientConfigured();
        return this._firestoreClient.waitForPendingWrites();
    };
    Firestore.prototype.onSnapshotsInSync = function (arg) {
        this.ensureClientConfigured();
        if (isPartialObserver(arg)) {
            return this._firestoreClient.addSnapshotsInSyncListener(arg);
        }
        else {
            validateArgType('Firestore.onSnapshotsInSync', 'function', 1, arg);
            var observer = {
                next: arg
            };
            return this._firestoreClient.addSnapshotsInSyncListener(observer);
        }
    };
    Firestore.prototype.ensureClientConfigured = function () {
        if (!this._firestoreClient) {
            // Kick off starting the client but don't actually wait for it.
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.configureClient(new MemoryOfflineComponentProvider(), new OnlineComponentProvider(), {
                durable: false
            });
        }
        return this._firestoreClient;
    };
    Firestore.prototype.makeDatabaseInfo = function () {
        return new DatabaseInfo(this._databaseId, this._persistenceKey, this._settings.host, this._settings.ssl, this._settings.forceLongPolling);
    };
    Firestore.prototype.configureClient = function (offlineComponentProvider, onlineComponentProvider, persistenceSettings) {
        var databaseInfo = this.makeDatabaseInfo();
        this._firestoreClient = new FirestoreClient(this._credentials, this._queue);
        return this._firestoreClient.start(databaseInfo, offlineComponentProvider, onlineComponentProvider, persistenceSettings);
    };
    Firestore.databaseIdFromApp = function (app) {
        if (!contains(app.options, 'projectId')) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, '"projectId" not provided in firebase.initializeApp.');
        }
        var projectId = app.options.projectId;
        if (!projectId || typeof projectId !== 'string') {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'projectId must be a string in FirebaseApp.options');
        }
        return new DatabaseId(projectId);
    };
    Object.defineProperty(Firestore.prototype, "app", {
        get: function () {
            if (!this._firebaseApp) {
                throw new FirestoreError(Code.FAILED_PRECONDITION, "Firestore was not initialized using the Firebase SDK. 'app' is " +
                    'not available');
            }
            return this._firebaseApp;
        },
        enumerable: false,
        configurable: true
    });
    Firestore.prototype.collection = function (pathString) {
        validateExactNumberOfArgs('Firestore.collection', arguments, 1);
        validateArgType('Firestore.collection', 'non-empty string', 1, pathString);
        this.ensureClientConfigured();
        return new CollectionReference(ResourcePath.fromString(pathString), this, 
        /* converter= */ null);
    };
    Firestore.prototype.doc = function (pathString) {
        validateExactNumberOfArgs('Firestore.doc', arguments, 1);
        validateArgType('Firestore.doc', 'non-empty string', 1, pathString);
        this.ensureClientConfigured();
        return DocumentReference.forPath(ResourcePath.fromString(pathString), this, 
        /* converter= */ null);
    };
    Firestore.prototype.collectionGroup = function (collectionId) {
        validateExactNumberOfArgs('Firestore.collectionGroup', arguments, 1);
        validateArgType('Firestore.collectionGroup', 'non-empty string', 1, collectionId);
        if (collectionId.indexOf('/') >= 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid collection ID '" + collectionId + "' passed to function " +
                "Firestore.collectionGroup(). Collection IDs must not contain '/'.");
        }
        this.ensureClientConfigured();
        return new Query(newQueryForCollectionGroup(collectionId), this, 
        /* converter= */ null);
    };
    Firestore.prototype.runTransaction = function (updateFunction) {
        var _this = this;
        validateExactNumberOfArgs('Firestore.runTransaction', arguments, 1);
        validateArgType('Firestore.runTransaction', 'function', 1, updateFunction);
        return this.ensureClientConfigured().transaction(function (transaction) {
            return updateFunction(new Transaction$1(_this, transaction));
        });
    };
    Firestore.prototype.batch = function () {
        this.ensureClientConfigured();
        return new WriteBatch(this);
    };
    Object.defineProperty(Firestore, "logLevel", {
        get: function () {
            switch (getLogLevel()) {
                case logger.LogLevel.DEBUG:
                    return 'debug';
                case logger.LogLevel.ERROR:
                    return 'error';
                case logger.LogLevel.SILENT:
                    return 'silent';
                case logger.LogLevel.WARN:
                    return 'warn';
                case logger.LogLevel.INFO:
                    return 'info';
                case logger.LogLevel.VERBOSE:
                    return 'verbose';
                default:
                    // The default log level is error
                    return 'error';
            }
        },
        enumerable: false,
        configurable: true
    });
    Firestore.setLogLevel = function (level) {
        validateExactNumberOfArgs('Firestore.setLogLevel', arguments, 1);
        validateStringEnum('setLogLevel', ['debug', 'error', 'silent', 'warn', 'info', 'verbose'], 1, level);
        setLogLevel(level);
    };
    // Note: this is not a property because the minifier can't work correctly with
    // the way TypeScript compiler outputs properties.
    Firestore.prototype._areTimestampsInSnapshotsEnabled = function () {
        return this._settings.timestampsInSnapshots;
    };
    return Firestore;
}());
/**
 * A reference to a transaction.
 */
var Transaction$1 = /** @class */ (function () {
    function Transaction$1(_firestore, _transaction) {
        this._firestore = _firestore;
        this._transaction = _transaction;
    }
    Transaction$1.prototype.get = function (documentRef) {
        var _this = this;
        validateExactNumberOfArgs('Transaction.get', arguments, 1);
        var ref = validateReference('Transaction.get', documentRef, this._firestore);
        return this._transaction
            .lookup([ref._key])
            .then(function (docs) {
            if (!docs || docs.length !== 1) {
                return fail();
            }
            var doc = docs[0];
            if (doc instanceof NoDocument) {
                return new DocumentSnapshot(_this._firestore, ref._key, null, 
                /* fromCache= */ false, 
                /* hasPendingWrites= */ false, ref._converter);
            }
            else if (doc instanceof Document) {
                return new DocumentSnapshot(_this._firestore, ref._key, doc, 
                /* fromCache= */ false, 
                /* hasPendingWrites= */ false, ref._converter);
            }
            else {
                throw fail();
            }
        });
    };
    Transaction$1.prototype.set = function (documentRef, value, options) {
        validateBetweenNumberOfArgs('Transaction.set', arguments, 2, 3);
        var ref = validateReference('Transaction.set', documentRef, this._firestore);
        options = validateSetOptions('Transaction.set', options);
        var convertedValue = applyFirestoreDataConverter(ref._converter, value, options);
        var parsed = parseSetData(this._firestore._dataReader, 'Transaction.set', ref._key, convertedValue, ref._converter !== null, options);
        this._transaction.set(ref._key, parsed);
        return this;
    };
    Transaction$1.prototype.update = function (documentRef, fieldOrUpdateData, value) {
        var moreFieldsAndValues = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            moreFieldsAndValues[_i - 3] = arguments[_i];
        }
        var ref;
        var parsed;
        if (typeof fieldOrUpdateData === 'string' ||
            fieldOrUpdateData instanceof FieldPath$1) {
            validateAtLeastNumberOfArgs('Transaction.update', arguments, 3);
            ref = validateReference('Transaction.update', documentRef, this._firestore);
            parsed = parseUpdateVarargs(this._firestore._dataReader, 'Transaction.update', ref._key, fieldOrUpdateData, value, moreFieldsAndValues);
        }
        else {
            validateExactNumberOfArgs('Transaction.update', arguments, 2);
            ref = validateReference('Transaction.update', documentRef, this._firestore);
            parsed = parseUpdateData(this._firestore._dataReader, 'Transaction.update', ref._key, fieldOrUpdateData);
        }
        this._transaction.update(ref._key, parsed);
        return this;
    };
    Transaction$1.prototype.delete = function (documentRef) {
        validateExactNumberOfArgs('Transaction.delete', arguments, 1);
        var ref = validateReference('Transaction.delete', documentRef, this._firestore);
        this._transaction.delete(ref._key);
        return this;
    };
    return Transaction$1;
}());
var WriteBatch = /** @class */ (function () {
    function WriteBatch(_firestore) {
        this._firestore = _firestore;
        this._mutations = [];
        this._committed = false;
    }
    WriteBatch.prototype.set = function (documentRef, value, options) {
        validateBetweenNumberOfArgs('WriteBatch.set', arguments, 2, 3);
        this.verifyNotCommitted();
        var ref = validateReference('WriteBatch.set', documentRef, this._firestore);
        options = validateSetOptions('WriteBatch.set', options);
        var convertedValue = applyFirestoreDataConverter(ref._converter, value, options);
        var parsed = parseSetData(this._firestore._dataReader, 'WriteBatch.set', ref._key, convertedValue, ref._converter !== null, options);
        this._mutations = this._mutations.concat(parsed.toMutations(ref._key, Precondition.none()));
        return this;
    };
    WriteBatch.prototype.update = function (documentRef, fieldOrUpdateData, value) {
        var moreFieldsAndValues = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            moreFieldsAndValues[_i - 3] = arguments[_i];
        }
        this.verifyNotCommitted();
        var ref;
        var parsed;
        if (typeof fieldOrUpdateData === 'string' ||
            fieldOrUpdateData instanceof FieldPath$1) {
            validateAtLeastNumberOfArgs('WriteBatch.update', arguments, 3);
            ref = validateReference('WriteBatch.update', documentRef, this._firestore);
            parsed = parseUpdateVarargs(this._firestore._dataReader, 'WriteBatch.update', ref._key, fieldOrUpdateData, value, moreFieldsAndValues);
        }
        else {
            validateExactNumberOfArgs('WriteBatch.update', arguments, 2);
            ref = validateReference('WriteBatch.update', documentRef, this._firestore);
            parsed = parseUpdateData(this._firestore._dataReader, 'WriteBatch.update', ref._key, fieldOrUpdateData);
        }
        this._mutations = this._mutations.concat(parsed.toMutations(ref._key, Precondition.exists(true)));
        return this;
    };
    WriteBatch.prototype.delete = function (documentRef) {
        validateExactNumberOfArgs('WriteBatch.delete', arguments, 1);
        this.verifyNotCommitted();
        var ref = validateReference('WriteBatch.delete', documentRef, this._firestore);
        this._mutations = this._mutations.concat(new DeleteMutation(ref._key, Precondition.none()));
        return this;
    };
    WriteBatch.prototype.commit = function () {
        this.verifyNotCommitted();
        this._committed = true;
        if (this._mutations.length > 0) {
            return this._firestore.ensureClientConfigured().write(this._mutations);
        }
        return Promise.resolve();
    };
    WriteBatch.prototype.verifyNotCommitted = function () {
        if (this._committed) {
            throw new FirestoreError(Code.FAILED_PRECONDITION, 'A write batch can no longer be used after commit() ' +
                'has been called.');
        }
    };
    return WriteBatch;
}());
/**
 * A reference to a particular document in a collection in the database.
 */
var DocumentReference = /** @class */ (function (_super) {
    tslib.__extends(DocumentReference, _super);
    function DocumentReference(_key, firestore, _converter) {
        var _this = _super.call(this, firestore._databaseId, _key, _converter) || this;
        _this._key = _key;
        _this.firestore = firestore;
        _this._converter = _converter;
        _this._firestoreClient = _this.firestore.ensureClientConfigured();
        return _this;
    }
    DocumentReference.forPath = function (path, firestore, converter) {
        if (path.length % 2 !== 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid document reference. Document ' +
                'references must have an even number of segments, but ' +
                (path.canonicalString() + " has " + path.length));
        }
        return new DocumentReference(new DocumentKey(path), firestore, converter);
    };
    Object.defineProperty(DocumentReference.prototype, "id", {
        get: function () {
            return this._key.path.lastSegment();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocumentReference.prototype, "parent", {
        get: function () {
            return new CollectionReference(this._key.path.popLast(), this.firestore, this._converter);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocumentReference.prototype, "path", {
        get: function () {
            return this._key.path.canonicalString();
        },
        enumerable: false,
        configurable: true
    });
    DocumentReference.prototype.collection = function (pathString) {
        validateExactNumberOfArgs('DocumentReference.collection', arguments, 1);
        validateArgType('DocumentReference.collection', 'non-empty string', 1, pathString);
        if (!pathString) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Must provide a non-empty collection name to collection()');
        }
        var path = ResourcePath.fromString(pathString);
        return new CollectionReference(this._key.path.child(path), this.firestore, 
        /* converter= */ null);
    };
    DocumentReference.prototype.isEqual = function (other) {
        if (!(other instanceof DocumentReference)) {
            throw invalidClassError('isEqual', 'DocumentReference', 1, other);
        }
        return (this.firestore === other.firestore &&
            this._key.isEqual(other._key) &&
            this._converter === other._converter);
    };
    DocumentReference.prototype.set = function (value, options) {
        validateBetweenNumberOfArgs('DocumentReference.set', arguments, 1, 2);
        options = validateSetOptions('DocumentReference.set', options);
        var convertedValue = applyFirestoreDataConverter(this._converter, value, options);
        var parsed = parseSetData(this.firestore._dataReader, 'DocumentReference.set', this._key, convertedValue, this._converter !== null, options);
        return this._firestoreClient.write(parsed.toMutations(this._key, Precondition.none()));
    };
    DocumentReference.prototype.update = function (fieldOrUpdateData, value) {
        var moreFieldsAndValues = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            moreFieldsAndValues[_i - 2] = arguments[_i];
        }
        var parsed;
        if (typeof fieldOrUpdateData === 'string' ||
            fieldOrUpdateData instanceof FieldPath$1) {
            validateAtLeastNumberOfArgs('DocumentReference.update', arguments, 2);
            parsed = parseUpdateVarargs(this.firestore._dataReader, 'DocumentReference.update', this._key, fieldOrUpdateData, value, moreFieldsAndValues);
        }
        else {
            validateExactNumberOfArgs('DocumentReference.update', arguments, 1);
            parsed = parseUpdateData(this.firestore._dataReader, 'DocumentReference.update', this._key, fieldOrUpdateData);
        }
        return this._firestoreClient.write(parsed.toMutations(this._key, Precondition.exists(true)));
    };
    DocumentReference.prototype.delete = function () {
        validateExactNumberOfArgs('DocumentReference.delete', arguments, 0);
        return this._firestoreClient.write([
            new DeleteMutation(this._key, Precondition.none())
        ]);
    };
    DocumentReference.prototype.onSnapshot = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _a, _b, _c;
        validateBetweenNumberOfArgs('DocumentReference.onSnapshot', arguments, 1, 4);
        var options = {
            includeMetadataChanges: false
        };
        var currArg = 0;
        if (typeof args[currArg] === 'object' &&
            !isPartialObserver(args[currArg])) {
            options = args[currArg];
            validateOptionNames('DocumentReference.onSnapshot', options, [
                'includeMetadataChanges'
            ]);
            validateNamedOptionalType('DocumentReference.onSnapshot', 'boolean', 'includeMetadataChanges', options.includeMetadataChanges);
            currArg++;
        }
        var internalOptions = {
            includeMetadataChanges: options.includeMetadataChanges
        };
        if (isPartialObserver(args[currArg])) {
            var userObserver = args[currArg];
            args[currArg] = (_a = userObserver.next) === null || _a === void 0 ? void 0 : _a.bind(userObserver);
            args[currArg + 1] = (_b = userObserver.error) === null || _b === void 0 ? void 0 : _b.bind(userObserver);
            args[currArg + 2] = (_c = userObserver.complete) === null || _c === void 0 ? void 0 : _c.bind(userObserver);
        }
        else {
            validateArgType('DocumentReference.onSnapshot', 'function', currArg, args[currArg]);
            validateOptionalArgType('DocumentReference.onSnapshot', 'function', currArg + 1, args[currArg + 1]);
            validateOptionalArgType('DocumentReference.onSnapshot', 'function', currArg + 2, args[currArg + 2]);
        }
        var observer = {
            next: function (snapshot) {
                if (args[currArg]) {
                    args[currArg](_this._convertToDocSnapshot(snapshot));
                }
            },
            error: args[currArg + 1],
            complete: args[currArg + 2]
        };
        return this._firestoreClient.listen(newQueryForPath(this._key.path), internalOptions, observer);
    };
    DocumentReference.prototype.get = function (options) {
        var _this = this;
        validateBetweenNumberOfArgs('DocumentReference.get', arguments, 0, 1);
        validateGetOptions('DocumentReference.get', options);
        var firestoreClient = this.firestore.ensureClientConfigured();
        if (options && options.source === 'cache') {
            return firestoreClient
                .getDocumentFromLocalCache(this._key)
                .then(function (doc) { return new DocumentSnapshot(_this.firestore, _this._key, doc, 
            /*fromCache=*/ true, doc instanceof Document ? doc.hasLocalMutations : false, _this._converter); });
        }
        else {
            return firestoreClient
                .getDocumentViaSnapshotListener(this._key, options)
                .then(function (snapshot) { return _this._convertToDocSnapshot(snapshot); });
        }
    };
    DocumentReference.prototype.withConverter = function (converter) {
        return new DocumentReference(this._key, this.firestore, converter);
    };
    /**
     * Converts a ViewSnapshot that contains the current document to a
     * DocumentSnapshot.
     */
    DocumentReference.prototype._convertToDocSnapshot = function (snapshot) {
        var doc = snapshot.docs.get(this._key);
        return new DocumentSnapshot(this.firestore, this._key, doc, snapshot.fromCache, snapshot.hasPendingWrites, this._converter);
    };
    return DocumentReference;
}(DocumentKeyReference));
var SnapshotMetadata = /** @class */ (function () {
    function SnapshotMetadata(hasPendingWrites, fromCache) {
        this.hasPendingWrites = hasPendingWrites;
        this.fromCache = fromCache;
    }
    SnapshotMetadata.prototype.isEqual = function (other) {
        return (this.hasPendingWrites === other.hasPendingWrites &&
            this.fromCache === other.fromCache);
    };
    return SnapshotMetadata;
}());
var DocumentSnapshot = /** @class */ (function () {
    function DocumentSnapshot(_firestore, _key, _document, _fromCache, _hasPendingWrites, _converter) {
        this._firestore = _firestore;
        this._key = _key;
        this._document = _document;
        this._fromCache = _fromCache;
        this._hasPendingWrites = _hasPendingWrites;
        this._converter = _converter;
    }
    DocumentSnapshot.prototype.data = function (options) {
        var _this = this;
        validateBetweenNumberOfArgs('DocumentSnapshot.data', arguments, 0, 1);
        options = validateSnapshotOptions('DocumentSnapshot.data', options);
        if (!this._document) {
            return undefined;
        }
        else {
            // We only want to use the converter and create a new DocumentSnapshot
            // if a converter has been provided.
            if (this._converter) {
                var snapshot = new QueryDocumentSnapshot(this._firestore, this._key, this._document, this._fromCache, this._hasPendingWrites, 
                /* converter= */ null);
                return this._converter.fromFirestore(snapshot, options);
            }
            else {
                var userDataWriter = new UserDataWriter(this._firestore._databaseId, this._firestore._areTimestampsInSnapshotsEnabled(), options.serverTimestamps || 'none', function (key) { return new DocumentReference(key, _this._firestore, /* converter= */ null); });
                return userDataWriter.convertValue(this._document.toProto());
            }
        }
    };
    DocumentSnapshot.prototype.get = function (fieldPath, options) {
        var _this = this;
        validateBetweenNumberOfArgs('DocumentSnapshot.get', arguments, 1, 2);
        options = validateSnapshotOptions('DocumentSnapshot.get', options);
        if (this._document) {
            var value = this._document
                .data()
                .field(fieldPathFromArgument('DocumentSnapshot.get', fieldPath, this._key));
            if (value !== null) {
                var userDataWriter = new UserDataWriter(this._firestore._databaseId, this._firestore._areTimestampsInSnapshotsEnabled(), options.serverTimestamps || 'none', function (key) { return new DocumentReference(key, _this._firestore, _this._converter); });
                return userDataWriter.convertValue(value);
            }
        }
        return undefined;
    };
    Object.defineProperty(DocumentSnapshot.prototype, "id", {
        get: function () {
            return this._key.path.lastSegment();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocumentSnapshot.prototype, "ref", {
        get: function () {
            return new DocumentReference(this._key, this._firestore, this._converter);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocumentSnapshot.prototype, "exists", {
        get: function () {
            return this._document !== null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocumentSnapshot.prototype, "metadata", {
        get: function () {
            return new SnapshotMetadata(this._hasPendingWrites, this._fromCache);
        },
        enumerable: false,
        configurable: true
    });
    DocumentSnapshot.prototype.isEqual = function (other) {
        if (!(other instanceof DocumentSnapshot)) {
            throw invalidClassError('isEqual', 'DocumentSnapshot', 1, other);
        }
        return (this._firestore === other._firestore &&
            this._fromCache === other._fromCache &&
            this._key.isEqual(other._key) &&
            (this._document === null
                ? other._document === null
                : this._document.isEqual(other._document)) &&
            this._converter === other._converter);
    };
    return DocumentSnapshot;
}());
var QueryDocumentSnapshot = /** @class */ (function (_super) {
    tslib.__extends(QueryDocumentSnapshot, _super);
    function QueryDocumentSnapshot() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    QueryDocumentSnapshot.prototype.data = function (options) {
        var data = _super.prototype.data.call(this, options);
        return data;
    };
    return QueryDocumentSnapshot;
}(DocumentSnapshot));
function newQueryFilter(query, methodName, dataReader, databaseId, fieldPath, op, value) {
    var fieldValue;
    if (fieldPath.isKeyField()) {
        if (op === "array-contains" /* ARRAY_CONTAINS */ || op === "array-contains-any" /* ARRAY_CONTAINS_ANY */) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid Query. You can't perform '" + op + "' " +
                'queries on FieldPath.documentId().');
        }
        else if (op === "in" /* IN */ || op === "not-in" /* NOT_IN */) {
            validateDisjunctiveFilterElements(value, op);
            var referenceList = [];
            for (var _i = 0, value_2 = value; _i < value_2.length; _i++) {
                var arrayValue = value_2[_i];
                referenceList.push(parseDocumentIdValue(databaseId, query, arrayValue));
            }
            fieldValue = { arrayValue: { values: referenceList } };
        }
        else {
            fieldValue = parseDocumentIdValue(databaseId, query, value);
        }
    }
    else {
        if (op === "in" /* IN */ ||
            op === "not-in" /* NOT_IN */ ||
            op === "array-contains-any" /* ARRAY_CONTAINS_ANY */) {
            validateDisjunctiveFilterElements(value, op);
        }
        fieldValue = parseQueryValue(dataReader, methodName, value, 
        /* allowArrays= */ op === "in" /* IN */ || op === "not-in" /* NOT_IN */);
    }
    var filter = FieldFilter.create(fieldPath, op, fieldValue);
    validateNewFilter(query, filter);
    return filter;
}
function newQueryOrderBy(query, fieldPath, direction) {
    if (query.startAt !== null) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. You must not call startAt() or startAfter() before ' +
            'calling orderBy().');
    }
    if (query.endAt !== null) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. You must not call endAt() or endBefore() before ' +
            'calling orderBy().');
    }
    var orderBy = new OrderBy(fieldPath, direction);
    validateNewOrderBy(query, orderBy);
    return orderBy;
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
function newQueryBoundFromDocument(query, databaseId, methodName, doc, before) {
    if (!doc) {
        throw new FirestoreError(Code.NOT_FOUND, "Can't use a DocumentSnapshot that doesn't exist for " +
            (methodName + "()."));
    }
    var components = [];
    // Because people expect to continue/end a query at the exact document
    // provided, we need to use the implicit sort order rather than the explicit
    // sort order, because it's guaranteed to contain the document key. That way
    // the position becomes unambiguous and the query continues/ends exactly at
    // the provided document. Without the key (by using the explicit sort
    // orders), multiple documents could match the position, yielding duplicate
    // results.
    for (var _i = 0, _e = queryOrderBy(query); _i < _e.length; _i++) {
        var orderBy = _e[_i];
        if (orderBy.field.isKeyField()) {
            components.push(refValue(databaseId, doc.key));
        }
        else {
            var value = doc.field(orderBy.field);
            if (isServerTimestamp(value)) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. You are trying to start or end a query using a ' +
                    'document for which the field "' +
                    orderBy.field +
                    '" is an uncommitted server timestamp. (Since the value of ' +
                    'this field is unknown, you cannot start/end a query with it.)');
            }
            else if (value !== null) {
                components.push(value);
            }
            else {
                var field = orderBy.field.canonicalString();
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. You are trying to start or end a query using a " +
                    ("document for which the field '" + field + "' (used as the ") +
                    "orderBy) does not exist.");
            }
        }
    }
    return new Bound(components, before);
}
/**
 * Converts a list of field values to a Bound for the given query.
 */
function newQueryBoundFromFields(query, databaseId, dataReader, methodName, values, before) {
    // Use explicit order by's because it has to match the query the user made
    var orderBy = query.explicitOrderBy;
    if (values.length > orderBy.length) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Too many arguments provided to " + methodName + "(). " +
            "The number of arguments must be less than or equal to the " +
            "number of orderBy() clauses");
    }
    var components = [];
    for (var i = 0; i < values.length; i++) {
        var rawValue = values[i];
        var orderByComponent = orderBy[i];
        if (orderByComponent.field.isKeyField()) {
            if (typeof rawValue !== 'string') {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. Expected a string for document ID in " +
                    (methodName + "(), but got a " + typeof rawValue));
            }
            if (!isCollectionGroupQuery(query) && rawValue.indexOf('/') !== -1) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. When querying a collection and ordering by FieldPath.documentId(), " +
                    ("the value passed to " + methodName + "() must be a plain document ID, but ") +
                    ("'" + rawValue + "' contains a slash."));
            }
            var path = query.path.child(ResourcePath.fromString(rawValue));
            if (!DocumentKey.isDocumentKey(path)) {
                throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. When querying a collection group and ordering by " +
                    ("FieldPath.documentId(), the value passed to " + methodName + "() must result in a ") +
                    ("valid document path, but '" + path + "' is not because it contains an odd number ") +
                    "of segments.");
            }
            var key = new DocumentKey(path);
            components.push(refValue(databaseId, key));
        }
        else {
            var wrapped = parseQueryValue(dataReader, methodName, rawValue);
            components.push(wrapped);
        }
    }
    return new Bound(components, before);
}
/**
 * Parses the given documentIdValue into a ReferenceValue, throwing
 * appropriate errors if the value is anything other than a DocumentReference
 * or String, or if the string is malformed.
 */
function parseDocumentIdValue(databaseId, query, documentIdValue) {
    if (typeof documentIdValue === 'string') {
        if (documentIdValue === '') {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. When querying with FieldPath.documentId(), you ' +
                'must provide a valid document ID, but it was an empty string.');
        }
        if (!isCollectionGroupQuery(query) && documentIdValue.indexOf('/') !== -1) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. When querying a collection by " +
                "FieldPath.documentId(), you must provide a plain document ID, but " +
                ("'" + documentIdValue + "' contains a '/' character."));
        }
        var path = query.path.child(ResourcePath.fromString(documentIdValue));
        if (!DocumentKey.isDocumentKey(path)) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. When querying a collection group by " +
                "FieldPath.documentId(), the value provided must result in a valid document path, " +
                ("but '" + path + "' is not because it has an odd number of segments (" + path.length + ")."));
        }
        return refValue(databaseId, new DocumentKey(path));
    }
    else if (documentIdValue instanceof DocumentKeyReference) {
        return refValue(databaseId, documentIdValue._key);
    }
    else {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. When querying with FieldPath.documentId(), you must provide a valid " +
            "string or a DocumentReference, but it was: " +
            (valueDescription(documentIdValue) + "."));
    }
}
/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */
function validateDisjunctiveFilterElements(value, operator) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid Query. A non-empty array is required for ' +
            ("'" + operator.toString() + "' filters."));
    }
    if (value.length > 10) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid Query. '" + operator.toString() + "' filters support a " +
            'maximum of 10 elements in the value array.');
    }
    if (operator === "in" /* IN */ || operator === "array-contains-any" /* ARRAY_CONTAINS_ANY */) {
        if (value.indexOf(null) >= 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid Query. '" + operator.toString() + "' filters cannot contain 'null' " +
                'in the value array.');
        }
        if (value.filter(function (element) { return Number.isNaN(element); }).length > 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid Query. '" + operator.toString() + "' filters cannot contain 'NaN' " +
                'in the value array.');
        }
    }
}
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
function conflictingOps(op) {
    switch (op) {
        case "!=" /* NOT_EQUAL */:
            return ["!=" /* NOT_EQUAL */, "not-in" /* NOT_IN */];
        case "array-contains" /* ARRAY_CONTAINS */:
            return [
                "array-contains" /* ARRAY_CONTAINS */,
                "array-contains-any" /* ARRAY_CONTAINS_ANY */,
                "not-in" /* NOT_IN */
            ];
        case "in" /* IN */:
            return ["array-contains-any" /* ARRAY_CONTAINS_ANY */, "in" /* IN */, "not-in" /* NOT_IN */];
        case "array-contains-any" /* ARRAY_CONTAINS_ANY */:
            return [
                "array-contains" /* ARRAY_CONTAINS */,
                "array-contains-any" /* ARRAY_CONTAINS_ANY */,
                "in" /* IN */,
                "not-in" /* NOT_IN */
            ];
        case "not-in" /* NOT_IN */:
            return [
                "array-contains" /* ARRAY_CONTAINS */,
                "array-contains-any" /* ARRAY_CONTAINS_ANY */,
                "in" /* IN */,
                "not-in" /* NOT_IN */,
                "!=" /* NOT_EQUAL */
            ];
        default:
            return [];
    }
}
function validateNewFilter(query, filter) {
    if (filter.isInequality()) {
        var existingField = query.getInequalityFilterField();
        if (existingField !== null && !existingField.isEqual(filter.field)) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. All where filters with an inequality' +
                ' (<, <=, >, or >=) must be on the same field. But you have' +
                (" inequality filters on '" + existingField.toString() + "'") +
                (" and '" + filter.field.toString() + "'"));
        }
        var firstOrderByField = query.getFirstOrderByField();
        if (firstOrderByField !== null) {
            validateOrderByAndInequalityMatch(query, filter.field, firstOrderByField);
        }
    }
    var conflictingOp = query.findFilterOperator(conflictingOps(filter.op));
    if (conflictingOp !== null) {
        // Special case when it's a duplicate op to give a slightly clearer error message.
        if (conflictingOp === filter.op) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid query. You cannot use more than one ' +
                ("'" + filter.op.toString() + "' filter."));
        }
        else {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. You cannot use '" + filter.op.toString() + "' filters " +
                ("with '" + conflictingOp.toString() + "' filters."));
        }
    }
}
function validateNewOrderBy(query, orderBy) {
    if (query.getFirstOrderByField() === null) {
        // This is the first order by. It must match any inequality.
        var inequalityField = query.getInequalityFilterField();
        if (inequalityField !== null) {
            validateOrderByAndInequalityMatch(query, inequalityField, orderBy.field);
        }
    }
}
function validateOrderByAndInequalityMatch(baseQuery, inequality, orderBy) {
    if (!orderBy.isEqual(inequality)) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid query. You have a where filter with an inequality " +
            ("(<, <=, >, or >=) on field '" + inequality.toString() + "' ") +
            ("and so you must also use '" + inequality.toString() + "' ") +
            "as your first orderBy(), but your first orderBy() " +
            ("is on field '" + orderBy.toString() + "' instead."));
    }
}
function validateHasExplicitOrderByForLimitToLast(query) {
    if (query.hasLimitToLast() && query.explicitOrderBy.length === 0) {
        throw new FirestoreError(Code.UNIMPLEMENTED, 'limitToLast() queries require specifying at least one orderBy() clause');
    }
}
var Query = /** @class */ (function () {
    function Query(_query, firestore, _converter) {
        this._query = _query;
        this.firestore = firestore;
        this._converter = _converter;
    }
    Query.prototype.where = function (field, opStr, value) {
        validateExactNumberOfArgs('Query.where', arguments, 3);
        validateDefined('Query.where', 3, value);
        // TODO(ne-queries): Add 'not-in' and '!=' to validation.
        var op;
        if (opStr === 'not-in' || opStr === '!=') {
            op = opStr;
        }
        else {
            // Enumerated from the WhereFilterOp type in index.d.ts.
            var whereFilterOpEnums = [
                "<" /* LESS_THAN */,
                "<=" /* LESS_THAN_OR_EQUAL */,
                "==" /* EQUAL */,
                ">=" /* GREATER_THAN_OR_EQUAL */,
                ">" /* GREATER_THAN */,
                "array-contains" /* ARRAY_CONTAINS */,
                "in" /* IN */,
                "array-contains-any" /* ARRAY_CONTAINS_ANY */
            ];
            op = validateStringEnum('Query.where', whereFilterOpEnums, 2, opStr);
        }
        var fieldPath = fieldPathFromArgument('Query.where', field);
        var filter = newQueryFilter(this._query, 'Query.where', this.firestore._dataReader, this.firestore._databaseId, fieldPath, op, value);
        return new Query(queryWithAddedFilter(this._query, filter), this.firestore, this._converter);
    };
    Query.prototype.orderBy = function (field, directionStr) {
        validateBetweenNumberOfArgs('Query.orderBy', arguments, 1, 2);
        validateOptionalArgType('Query.orderBy', 'non-empty string', 2, directionStr);
        var direction;
        if (directionStr === undefined || directionStr === 'asc') {
            direction = "asc" /* ASCENDING */;
        }
        else if (directionStr === 'desc') {
            direction = "desc" /* DESCENDING */;
        }
        else {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Function Query.orderBy() has unknown direction '" + directionStr + "', " +
                "expected 'asc' or 'desc'.");
        }
        var fieldPath = fieldPathFromArgument('Query.orderBy', field);
        var orderBy = newQueryOrderBy(this._query, fieldPath, direction);
        return new Query(queryWithAddedOrderBy(this._query, orderBy), this.firestore, this._converter);
    };
    Query.prototype.limit = function (n) {
        validateExactNumberOfArgs('Query.limit', arguments, 1);
        validateArgType('Query.limit', 'number', 1, n);
        validatePositiveNumber('Query.limit', 1, n);
        return new Query(queryWithLimit(this._query, n, "F" /* First */), this.firestore, this._converter);
    };
    Query.prototype.limitToLast = function (n) {
        validateExactNumberOfArgs('Query.limitToLast', arguments, 1);
        validateArgType('Query.limitToLast', 'number', 1, n);
        validatePositiveNumber('Query.limitToLast', 1, n);
        return new Query(queryWithLimit(this._query, n, "L" /* Last */), this.firestore, this._converter);
    };
    Query.prototype.startAt = function (docOrField) {
        var fields = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            fields[_i - 1] = arguments[_i];
        }
        validateAtLeastNumberOfArgs('Query.startAt', arguments, 1);
        var bound = this.boundFromDocOrFields('Query.startAt', docOrField, fields, 
        /*before=*/ true);
        return new Query(queryWithStartAt(this._query, bound), this.firestore, this._converter);
    };
    Query.prototype.startAfter = function (docOrField) {
        var fields = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            fields[_i - 1] = arguments[_i];
        }
        validateAtLeastNumberOfArgs('Query.startAfter', arguments, 1);
        var bound = this.boundFromDocOrFields('Query.startAfter', docOrField, fields, 
        /*before=*/ false);
        return new Query(queryWithStartAt(this._query, bound), this.firestore, this._converter);
    };
    Query.prototype.endBefore = function (docOrField) {
        var fields = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            fields[_i - 1] = arguments[_i];
        }
        validateAtLeastNumberOfArgs('Query.endBefore', arguments, 1);
        var bound = this.boundFromDocOrFields('Query.endBefore', docOrField, fields, 
        /*before=*/ true);
        return new Query(queryWithEndAt(this._query, bound), this.firestore, this._converter);
    };
    Query.prototype.endAt = function (docOrField) {
        var fields = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            fields[_i - 1] = arguments[_i];
        }
        validateAtLeastNumberOfArgs('Query.endAt', arguments, 1);
        var bound = this.boundFromDocOrFields('Query.endAt', docOrField, fields, 
        /*before=*/ false);
        return new Query(queryWithEndAt(this._query, bound), this.firestore, this._converter);
    };
    Query.prototype.isEqual = function (other) {
        if (!(other instanceof Query)) {
            throw invalidClassError('isEqual', 'Query', 1, other);
        }
        return (this.firestore === other.firestore &&
            queryEquals(this._query, other._query) &&
            this._converter === other._converter);
    };
    Query.prototype.withConverter = function (converter) {
        return new Query(this._query, this.firestore, converter);
    };
    /** Helper function to create a bound from a document or fields */
    Query.prototype.boundFromDocOrFields = function (methodName, docOrField, fields, before) {
        validateDefined(methodName, 1, docOrField);
        if (docOrField instanceof DocumentSnapshot) {
            validateExactNumberOfArgs(methodName, tslib.__spreadArrays([docOrField], fields), 1);
            return newQueryBoundFromDocument(this._query, this.firestore._databaseId, methodName, docOrField._document, before);
        }
        else {
            var allFields = [docOrField].concat(fields);
            return newQueryBoundFromFields(this._query, this.firestore._databaseId, this.firestore._dataReader, methodName, allFields, before);
        }
    };
    Query.prototype.onSnapshot = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _a, _b, _c;
        validateBetweenNumberOfArgs('Query.onSnapshot', arguments, 1, 4);
        var options = {};
        var currArg = 0;
        if (typeof args[currArg] === 'object' &&
            !isPartialObserver(args[currArg])) {
            options = args[currArg];
            validateOptionNames('Query.onSnapshot', options, [
                'includeMetadataChanges'
            ]);
            validateNamedOptionalType('Query.onSnapshot', 'boolean', 'includeMetadataChanges', options.includeMetadataChanges);
            currArg++;
        }
        if (isPartialObserver(args[currArg])) {
            var userObserver = args[currArg];
            args[currArg] = (_a = userObserver.next) === null || _a === void 0 ? void 0 : _a.bind(userObserver);
            args[currArg + 1] = (_b = userObserver.error) === null || _b === void 0 ? void 0 : _b.bind(userObserver);
            args[currArg + 2] = (_c = userObserver.complete) === null || _c === void 0 ? void 0 : _c.bind(userObserver);
        }
        else {
            validateArgType('Query.onSnapshot', 'function', currArg, args[currArg]);
            validateOptionalArgType('Query.onSnapshot', 'function', currArg + 1, args[currArg + 1]);
            validateOptionalArgType('Query.onSnapshot', 'function', currArg + 2, args[currArg + 2]);
        }
        var observer = {
            next: function (snapshot) {
                if (args[currArg]) {
                    args[currArg](new QuerySnapshot(_this.firestore, _this._query, snapshot, _this._converter));
                }
            },
            error: args[currArg + 1],
            complete: args[currArg + 2]
        };
        validateHasExplicitOrderByForLimitToLast(this._query);
        var firestoreClient = this.firestore.ensureClientConfigured();
        return firestoreClient.listen(this._query, options, observer);
    };
    Query.prototype.get = function (options) {
        var _this = this;
        validateBetweenNumberOfArgs('Query.get', arguments, 0, 1);
        validateGetOptions('Query.get', options);
        validateHasExplicitOrderByForLimitToLast(this._query);
        var firestoreClient = this.firestore.ensureClientConfigured();
        return (options && options.source === 'cache'
            ? firestoreClient.getDocumentsFromLocalCache(this._query)
            : firestoreClient.getDocumentsViaSnapshotListener(this._query, options)).then(function (snap) { return new QuerySnapshot(_this.firestore, _this._query, snap, _this._converter); });
    };
    return Query;
}());
var QuerySnapshot = /** @class */ (function () {
    function QuerySnapshot(_firestore, _originalQuery, _snapshot, _converter) {
        this._firestore = _firestore;
        this._originalQuery = _originalQuery;
        this._snapshot = _snapshot;
        this._converter = _converter;
        this._cachedChanges = null;
        this._cachedChangesIncludeMetadataChanges = null;
        this.metadata = new SnapshotMetadata(_snapshot.hasPendingWrites, _snapshot.fromCache);
    }
    Object.defineProperty(QuerySnapshot.prototype, "docs", {
        get: function () {
            var result = [];
            this.forEach(function (doc) { return result.push(doc); });
            return result;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(QuerySnapshot.prototype, "empty", {
        get: function () {
            return this._snapshot.docs.isEmpty();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(QuerySnapshot.prototype, "size", {
        get: function () {
            return this._snapshot.docs.size;
        },
        enumerable: false,
        configurable: true
    });
    QuerySnapshot.prototype.forEach = function (callback, thisArg) {
        var _this = this;
        validateBetweenNumberOfArgs('QuerySnapshot.forEach', arguments, 1, 2);
        validateArgType('QuerySnapshot.forEach', 'function', 1, callback);
        this._snapshot.docs.forEach(function (doc) {
            callback.call(thisArg, _this.convertToDocumentImpl(doc, _this.metadata.fromCache, _this._snapshot.mutatedKeys.has(doc.key)));
        });
    };
    Object.defineProperty(QuerySnapshot.prototype, "query", {
        get: function () {
            return new Query(this._originalQuery, this._firestore, this._converter);
        },
        enumerable: false,
        configurable: true
    });
    QuerySnapshot.prototype.docChanges = function (options) {
        if (options) {
            validateOptionNames('QuerySnapshot.docChanges', options, [
                'includeMetadataChanges'
            ]);
            validateNamedOptionalType('QuerySnapshot.docChanges', 'boolean', 'includeMetadataChanges', options.includeMetadataChanges);
        }
        var includeMetadataChanges = !!(options && options.includeMetadataChanges);
        if (includeMetadataChanges && this._snapshot.excludesMetadataChanges) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'To include metadata changes with your document changes, you must ' +
                'also pass { includeMetadataChanges:true } to onSnapshot().');
        }
        if (!this._cachedChanges ||
            this._cachedChangesIncludeMetadataChanges !== includeMetadataChanges) {
            this._cachedChanges = changesFromSnapshot(this._snapshot, includeMetadataChanges, this.convertToDocumentImpl.bind(this));
            this._cachedChangesIncludeMetadataChanges = includeMetadataChanges;
        }
        return this._cachedChanges;
    };
    /** Check the equality. The call can be very expensive. */
    QuerySnapshot.prototype.isEqual = function (other) {
        if (!(other instanceof QuerySnapshot)) {
            throw invalidClassError('isEqual', 'QuerySnapshot', 1, other);
        }
        return (this._firestore === other._firestore &&
            queryEquals(this._originalQuery, other._originalQuery) &&
            this._snapshot.isEqual(other._snapshot) &&
            this._converter === other._converter);
    };
    QuerySnapshot.prototype.convertToDocumentImpl = function (doc, fromCache, hasPendingWrites) {
        return new QueryDocumentSnapshot(this._firestore, doc.key, doc, fromCache, hasPendingWrites, this._converter);
    };
    return QuerySnapshot;
}());
var CollectionReference = /** @class */ (function (_super) {
    tslib.__extends(CollectionReference, _super);
    function CollectionReference(_path, firestore, _converter) {
        var _this = _super.call(this, newQueryForPath(_path), firestore, _converter) || this;
        _this._path = _path;
        if (_path.length % 2 !== 1) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, 'Invalid collection reference. Collection ' +
                'references must have an odd number of segments, but ' +
                (_path.canonicalString() + " has " + _path.length));
        }
        return _this;
    }
    Object.defineProperty(CollectionReference.prototype, "id", {
        get: function () {
            return this._query.path.lastSegment();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CollectionReference.prototype, "parent", {
        get: function () {
            var parentPath = this._query.path.popLast();
            if (parentPath.isEmpty()) {
                return null;
            }
            else {
                return new DocumentReference(new DocumentKey(parentPath), this.firestore, 
                /* converter= */ null);
            }
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CollectionReference.prototype, "path", {
        get: function () {
            return this._query.path.canonicalString();
        },
        enumerable: false,
        configurable: true
    });
    CollectionReference.prototype.doc = function (pathString) {
        validateBetweenNumberOfArgs('CollectionReference.doc', arguments, 0, 1);
        // We allow omission of 'pathString' but explicitly prohibit passing in both
        // 'undefined' and 'null'.
        if (arguments.length === 0) {
            pathString = AutoId.newId();
        }
        validateArgType('CollectionReference.doc', 'non-empty string', 1, pathString);
        var path = ResourcePath.fromString(pathString);
        return DocumentReference.forPath(this._query.path.child(path), this.firestore, this._converter);
    };
    CollectionReference.prototype.add = function (value) {
        validateExactNumberOfArgs('CollectionReference.add', arguments, 1);
        var convertedValue = this._converter
            ? this._converter.toFirestore(value)
            : value;
        validateArgType('CollectionReference.add', 'object', 1, convertedValue);
        var docRef = this.doc();
        return docRef.set(value).then(function () { return docRef; });
    };
    CollectionReference.prototype.withConverter = function (converter) {
        return new CollectionReference(this._path, this.firestore, converter);
    };
    return CollectionReference;
}(Query));
function validateSetOptions(methodName, options) {
    if (options === undefined) {
        return {
            merge: false
        };
    }
    validateOptionNames(methodName, options, ['merge', 'mergeFields']);
    validateNamedOptionalType(methodName, 'boolean', 'merge', options.merge);
    validateOptionalArrayElements(methodName, 'mergeFields', 'a string or a FieldPath', options.mergeFields, function (element) { return typeof element === 'string' || element instanceof FieldPath$1; });
    if (options.mergeFields !== undefined && options.merge !== undefined) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Invalid options passed to function " + methodName + "(): You cannot specify both \"merge\" " +
            "and \"mergeFields\".");
    }
    return options;
}
function validateSnapshotOptions(methodName, options) {
    if (options === undefined) {
        return {};
    }
    validateOptionNames(methodName, options, ['serverTimestamps']);
    validateNamedOptionalPropertyEquals(methodName, 'options', 'serverTimestamps', options.serverTimestamps, ['estimate', 'previous', 'none']);
    return options;
}
function validateGetOptions(methodName, options) {
    validateOptionalArgType(methodName, 'object', 1, options);
    if (options) {
        validateOptionNames(methodName, options, ['source']);
        validateNamedOptionalPropertyEquals(methodName, 'options', 'source', options.source, ['default', 'server', 'cache']);
    }
}
function validateReference(methodName, documentRef, firestore) {
    if (!(documentRef instanceof DocumentKeyReference)) {
        throw invalidClassError(methodName, 'DocumentReference', 1, documentRef);
    }
    else if (documentRef.firestore !== firestore) {
        throw new FirestoreError(Code.INVALID_ARGUMENT, 'Provided document reference is from a different Firestore instance.');
    }
    else {
        return documentRef;
    }
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
 */
function changesFromSnapshot(snapshot, includeMetadataChanges, converter) {
    if (snapshot.oldDocs.isEmpty()) {
        // Special case the first snapshot because index calculation is easy and
        // fast
        var lastDoc_1;
        var index_1 = 0;
        return snapshot.docChanges.map(function (change) {
            var doc = converter(change.doc, snapshot.fromCache, snapshot.mutatedKeys.has(change.doc.key));
            lastDoc_1 = change.doc;
            return {
                type: 'added',
                doc: doc,
                oldIndex: -1,
                newIndex: index_1++
            };
        });
    }
    else {
        // A DocumentSet that is updated incrementally as changes are applied to use
        // to lookup the index of a document.
        var indexTracker_1 = snapshot.oldDocs;
        return snapshot.docChanges
            .filter(function (change) { return includeMetadataChanges || change.type !== 3; } /* Metadata */)
            .map(function (change) {
            var doc = converter(change.doc, snapshot.fromCache, snapshot.mutatedKeys.has(change.doc.key));
            var oldIndex = -1;
            var newIndex = -1;
            if (change.type !== 0 /* Added */) {
                oldIndex = indexTracker_1.indexOf(change.doc.key);
                indexTracker_1 = indexTracker_1.delete(change.doc.key);
            }
            if (change.type !== 1 /* Removed */) {
                indexTracker_1 = indexTracker_1.add(change.doc);
                newIndex = indexTracker_1.indexOf(change.doc.key);
            }
            return { type: resultChangeType(change.type), doc: doc, oldIndex: oldIndex, newIndex: newIndex };
        });
    }
}
function resultChangeType(type) {
    switch (type) {
        case 0 /* Added */:
            return 'added';
        case 2 /* Modified */:
        case 3 /* Metadata */:
            return 'modified';
        case 1 /* Removed */:
            return 'removed';
        default:
            return fail();
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
 */
function applyFirestoreDataConverter(converter, value, options) {
    var convertedValue;
    if (converter) {
        if (options && (options.merge || options.mergeFields)) {
            // Cast to `any` in order to satisfy the union type constraint on
            // toFirestore().
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            convertedValue = converter.toFirestore(value, options);
        }
        else {
            convertedValue = converter.toFirestore(value);
        }
    }
    else {
        convertedValue = value;
    }
    return convertedValue;
}
function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
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
var firestoreNamespace = {
    Firestore: Firestore,
    GeoPoint: GeoPoint,
    Timestamp: Timestamp,
    Blob: Blob,
    Transaction: Transaction$1,
    WriteBatch: WriteBatch,
    DocumentReference: DocumentReference,
    DocumentSnapshot: DocumentSnapshot,
    Query: Query,
    QueryDocumentSnapshot: QueryDocumentSnapshot,
    QuerySnapshot: QuerySnapshot,
    CollectionReference: CollectionReference,
    FieldPath: FieldPath$1,
    FieldValue: FieldValue,
    setLogLevel: Firestore.setLogLevel,
    CACHE_SIZE_UNLIMITED: CACHE_SIZE_UNLIMITED
};
/**
 * Configures Firestore as part of the Firebase SDK by calling registerService.
 *
 * @param firebase The FirebaseNamespace to register Firestore with
 * @param firestoreFactory A factory function that returns a new Firestore
 *    instance.
 */
function configureForFirebase(firebase, firestoreFactory) {
    firebase.INTERNAL.registerComponent(new component.Component('firestore', function (container) {
        var app = container.getProvider('app').getImmediate();
        return firestoreFactory(app, container.getProvider('auth-internal'));
    }, "PUBLIC" /* PUBLIC */).setServiceProps(Object.assign({}, firestoreNamespace)));
}
var name = "@firebase/firestore";
var version$1 = "1.16.3";
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
 * Registers the memory-only Firestore build for Node with the components
 * framework.
 */
function registerFirestore(instance) {
    configureForFirebase(instance, function (app, auth) { return new Firestore(app, auth, new MemoryOfflineComponentProvider(), new OnlineComponentProvider()); });
    instance.registerVersion(name, version$1, 'node');
}
registerFirestore(firebase);

exports.registerFirestore = registerFirestore;
//# sourceMappingURL=index.memory.node.cjs.js.map
