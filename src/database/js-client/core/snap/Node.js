/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
goog.provide('fb.core.snap.Node');
goog.provide('fb.core.snap.NamedNode');

/**
 * Node is an interface defining the common functionality for nodes in
 * a DataSnapshot.
 *
 * @interface
 */
fb.core.snap.Node = function() { };


/**
 * Whether this node is a leaf node.
 * @return {boolean} Whether this is a leaf node.
 */
fb.core.snap.Node.prototype.isLeafNode;


/**
 * Gets the priority of the node.
 * @return {!fb.core.snap.Node} The priority of the node.
 */
fb.core.snap.Node.prototype.getPriority;


/**
 * Returns a duplicate node with the new priority.
 * @param {!fb.core.snap.Node} newPriorityNode New priority to set for the node.
 * @return {!fb.core.snap.Node} Node with new priority.
 */
fb.core.snap.Node.prototype.updatePriority;


/**
 * Returns the specified immediate child, or null if it doesn't exist.
 * @param {string} childName The name of the child to retrieve.
 * @return {!fb.core.snap.Node} The retrieved child, or an empty node.
 */
fb.core.snap.Node.prototype.getImmediateChild;


/**
 * Returns a child by path, or null if it doesn't exist.
 * @param {!fb.core.util.Path} path The path of the child to retrieve.
 * @return {!fb.core.snap.Node} The retrieved child or an empty node.
 */
fb.core.snap.Node.prototype.getChild;


/**
 * Returns the name of the child immediately prior to the specified childNode, or null.
 * @param {!string} childName The name of the child to find the predecessor of.
 * @param {!fb.core.snap.Node} childNode The node to find the predecessor of.
 * @param {!fb.core.snap.Index} index The index to use to determine the predecessor
 * @return {?string} The name of the predecessor child, or null if childNode is the first child.
 */
fb.core.snap.Node.prototype.getPredecessorChildName;

/**
 * Returns a duplicate node, with the specified immediate child updated.
 * Any value in the node will be removed.
 * @param {string} childName The name of the child to update.
 * @param {!fb.core.snap.Node} newChildNode The new child node
 * @return {!fb.core.snap.Node} The updated node.
 */
fb.core.snap.Node.prototype.updateImmediateChild;


/**
 * Returns a duplicate node, with the specified child updated.  Any value will
 * be removed.
 * @param {!fb.core.util.Path} path The path of the child to update.
 * @param {!fb.core.snap.Node} newChildNode The new child node, which may be an empty node
 * @return {!fb.core.snap.Node} The updated node.
 */
fb.core.snap.Node.prototype.updateChild;

/**
 * True if the immediate child specified exists
 * @param {!string} childName
 * @return {boolean}
 */
fb.core.snap.Node.prototype.hasChild;

/**
 * @return {boolean} True if this node has no value or children.
 */
fb.core.snap.Node.prototype.isEmpty;


/**
 * @return {number} The number of children of this node.
 */
fb.core.snap.Node.prototype.numChildren;


/**
 * Calls action for each child.
 * @param {!fb.core.snap.Index} index
 * @param {function(string, !fb.core.snap.Node)} action Action to be called for
 * each child.  It's passed the child name and the child node.
 * @return {*} The first truthy value return by action, or the last falsey one
 */
fb.core.snap.Node.prototype.forEachChild;


/**
 * @param {boolean=} opt_exportFormat True for export format (also wire protocol format).
 * @return {*} Value of this node as JSON.
 */
fb.core.snap.Node.prototype.val;


/**
 * @return {string} hash representing the node contents.
 */
fb.core.snap.Node.prototype.hash;

/**
 * @param {!fb.core.snap.Node} other Another node
 * @return {!number} -1 for less than, 0 for equal, 1 for greater than other
 */
fb.core.snap.Node.prototype.compareTo;

/**
 * @param {!fb.core.snap.Node} other
 * @return {boolean} Whether or not this snapshot equals other
 */
fb.core.snap.Node.prototype.equals;

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {!fb.core.snap.Node} This node, with the specified index now available
 */
fb.core.snap.Node.prototype.withIndex;

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {boolean}
 */
fb.core.snap.Node.prototype.isIndexed;

/**
 *
 * @param {!string} name
 * @param {!fb.core.snap.Node} node
 * @constructor
 * @struct
 */
fb.core.snap.NamedNode = function(name, node) {
  this.name = name;
  this.node = node;
};

/**
 *
 * @param {!string} name
 * @param {!fb.core.snap.Node} node
 * @return {fb.core.snap.NamedNode}
 */
fb.core.snap.NamedNode.Wrap = function(name, node) {
  return new fb.core.snap.NamedNode(name, node);
};
