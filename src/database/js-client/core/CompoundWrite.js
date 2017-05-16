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
goog.provide('fb.core.CompoundWrite');
goog.require('fb.core.snap.Node');
goog.require('fb.core.util');
goog.require('fb.core.util.ImmutableTree');

/**
 * This class holds a collection of writes that can be applied to nodes in unison. It abstracts away the logic with
 * dealing with priority writes and multiple nested writes. At any given path there is only allowed to be one write
 * modifying that path. Any write to an existing path or shadowing an existing path will modify that existing write
 * to reflect the write added.
 *
 * @constructor
 * @param {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>} writeTree
 */
fb.core.CompoundWrite = function(writeTree) {
  /**
   * @type {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>}
   * @private
   */
  this.writeTree_ = writeTree;
};

/**
 * @type {!fb.core.CompoundWrite}
 */
fb.core.CompoundWrite.Empty = new fb.core.CompoundWrite(
    /** @type {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>} */ (new fb.core.util.ImmutableTree(null))
);

/**
 * @param {!fb.core.util.Path} path
 * @param {!fb.core.snap.Node} node
 * @return {!fb.core.CompoundWrite}
 */
fb.core.CompoundWrite.prototype.addWrite = function(path, node) {
  if (path.isEmpty()) {
    return new fb.core.CompoundWrite(new fb.core.util.ImmutableTree(node));
  } else {
    var rootmost = this.writeTree_.findRootMostValueAndPath(path);
    if (rootmost != null) {
      var rootMostPath = rootmost.path, value = rootmost.value;
      var relativePath = fb.core.util.Path.relativePath(rootMostPath, path);
      value = value.updateChild(relativePath, node);
      return new fb.core.CompoundWrite(this.writeTree_.set(rootMostPath, value));
    } else {
      var subtree = new fb.core.util.ImmutableTree(node);
      var newWriteTree = this.writeTree_.setTree(path, subtree);
      return new fb.core.CompoundWrite(newWriteTree);
    }
  }
};

/**
 * @param {!fb.core.util.Path} path
 * @param {!Object.<string, !fb.core.snap.Node>} updates
 * @return {!fb.core.CompoundWrite}
 */
fb.core.CompoundWrite.prototype.addWrites = function(path, updates) {
  var newWrite = this;
  fb.util.obj.foreach(updates, function(childKey, node) {
    newWrite = newWrite.addWrite(path.child(childKey), node);
  });
  return newWrite;
};

/**
 * Will remove a write at the given path and deeper paths. This will <em>not</em> modify a write at a higher
 * location, which must be removed by calling this method with that path.
 *
 * @param {!fb.core.util.Path} path The path at which a write and all deeper writes should be removed
 * @return {!fb.core.CompoundWrite} The new CompoundWrite with the removed path
 */
fb.core.CompoundWrite.prototype.removeWrite = function(path) {
  if (path.isEmpty()) {
    return fb.core.CompoundWrite.Empty;
  } else {
    var newWriteTree = this.writeTree_.setTree(path, fb.core.util.ImmutableTree.Empty);
    return new fb.core.CompoundWrite(newWriteTree);
  }
};

/**
 * Returns whether this CompoundWrite will fully overwrite a node at a given location and can therefore be
 * considered "complete".
 *
 * @param {!fb.core.util.Path} path The path to check for
 * @return {boolean} Whether there is a complete write at that path
 */
fb.core.CompoundWrite.prototype.hasCompleteWrite = function(path) {
  return this.getCompleteNode(path) != null;
};

/**
 * Returns a node for a path if and only if the node is a "complete" overwrite at that path. This will not aggregate
 * writes from deeper paths, but will return child nodes from a more shallow path.
 *
 * @param {!fb.core.util.Path} path The path to get a complete write
 * @return {?fb.core.snap.Node} The node if complete at that path, or null otherwise.
 */
fb.core.CompoundWrite.prototype.getCompleteNode = function(path) {
  var rootmost = this.writeTree_.findRootMostValueAndPath(path);
  if (rootmost != null) {
    return this.writeTree_.get(rootmost.path).getChild(
        fb.core.util.Path.relativePath(rootmost.path, path));
  } else {
    return null;
  }
};

/**
 * Returns all children that are guaranteed to be a complete overwrite.
 *
 * @return {!Array.<fb.core.snap.NamedNode>} A list of all complete children.
 */
fb.core.CompoundWrite.prototype.getCompleteChildren = function() {
  var children = [];
  var node = this.writeTree_.value;
  if (node != null) {
    // If it's a leaf node, it has no children; so nothing to do.
    if (!node.isLeafNode()) {
      node = /** @type {!fb.core.snap.ChildrenNode} */ (node);
      node.forEachChild(fb.core.snap.PriorityIndex, function(childName, childNode) {
        children.push(new fb.core.snap.NamedNode(childName, childNode));
      });
    }
  } else {
    this.writeTree_.children.inorderTraversal(function(childName, childTree) {
      if (childTree.value != null) {
        children.push(new fb.core.snap.NamedNode(childName, childTree.value));
      }
    });
  }
  return children;
};

/**
 * @param {!fb.core.util.Path} path
 * @return {!fb.core.CompoundWrite}
 */
fb.core.CompoundWrite.prototype.childCompoundWrite = function(path) {
  if (path.isEmpty()) {
    return this;
  } else {
    var shadowingNode = this.getCompleteNode(path);
    if (shadowingNode != null) {
      return new fb.core.CompoundWrite(new fb.core.util.ImmutableTree(shadowingNode));
    } else {
      return new fb.core.CompoundWrite(this.writeTree_.subtree(path));
    }
  }
};

/**
 * Returns true if this CompoundWrite is empty and therefore does not modify any nodes.
 * @return {boolean} Whether this CompoundWrite is empty
 */
fb.core.CompoundWrite.prototype.isEmpty = function() {
  return this.writeTree_.isEmpty();
};

/**
 * Applies this CompoundWrite to a node. The node is returned with all writes from this CompoundWrite applied to the
 * node
 * @param {!fb.core.snap.Node} node The node to apply this CompoundWrite to
 * @return {!fb.core.snap.Node} The node with all writes applied
 */
fb.core.CompoundWrite.prototype.apply = function(node) {
  return fb.core.CompoundWrite.applySubtreeWrite_(fb.core.util.Path.Empty, this.writeTree_, node);
};

/**
 * @param {!fb.core.util.Path} relativePath
 * @param {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>} writeTree
 * @param {!fb.core.snap.Node} node
 * @return {!fb.core.snap.Node}
 * @private
 */
fb.core.CompoundWrite.applySubtreeWrite_ = function(relativePath, writeTree, node) {
  if (writeTree.value != null) {
    // Since there a write is always a leaf, we're done here
    return node.updateChild(relativePath, writeTree.value);
  } else {
    var priorityWrite = null;
    writeTree.children.inorderTraversal(function(childKey, childTree) {
      if (childKey === '.priority') {
        // Apply priorities at the end so we don't update priorities for either empty nodes or forget
        // to apply priorities to empty nodes that are later filled
        fb.core.util.assert(childTree.value !== null, 'Priority writes must always be leaf nodes');
        priorityWrite = childTree.value;
      } else {
        node = fb.core.CompoundWrite.applySubtreeWrite_(relativePath.child(childKey), childTree, node);
      }
    });
    // If there was a priority write, we only apply it if the node is not empty
    if (!node.getChild(relativePath).isEmpty() && priorityWrite !== null) {
      node = node.updateChild(relativePath.child('.priority'),
          /** @type {!fb.core.snap.Node} */ (priorityWrite));
    }
    return node;
  }
};
