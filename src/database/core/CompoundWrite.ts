import { ImmutableTree } from "./util/ImmutableTree";
import { Path } from "./util/Path";
import { forEach } from "../../utils/obj";
import { NamedNode } from "./snap/Node";
import { PriorityIndex } from "./snap/IndexFactory";
import { assert } from "../../utils/assert";

/**
 * This class holds a collection of writes that can be applied to nodes in unison. It abstracts away the logic with
 * dealing with priority writes and multiple nested writes. At any given path there is only allowed to be one write
 * modifying that path. Any write to an existing path or shadowing an existing path will modify that existing write
 * to reflect the write added.
 *
 * @constructor
 * @param {!ImmutableTree.<!Node>} writeTree
 */
export class CompoundWrite {
  writeTree_;
  constructor(writeTree) {
    /**
     * @type {!ImmutableTree.<!Node>}
     * @private
     */
    this.writeTree_ = writeTree;
  };
  /**
   * @type {!CompoundWrite}
   */
  static Empty = new CompoundWrite(
      /** @type {!ImmutableTree.<!Node>} */ (new ImmutableTree(null))
  );
  /**
   * @param {!Path} path
   * @param {!Node} node
   * @return {!CompoundWrite}
   */
  addWrite(path, node) {
    if (path.isEmpty()) {
      return new CompoundWrite(new ImmutableTree(node));
    } else {
      var rootmost = this.writeTree_.findRootMostValueAndPath(path);
      if (rootmost != null) {
        var rootMostPath = rootmost.path, value = rootmost.value;
        var relativePath = Path.relativePath(rootMostPath, path);
        value = value.updateChild(relativePath, node);
        return new CompoundWrite(this.writeTree_.set(rootMostPath, value));
      } else {
        var subtree = new ImmutableTree(node);
        var newWriteTree = this.writeTree_.setTree(path, subtree);
        return new CompoundWrite(newWriteTree);
      }
    }
  };

  /**
   * @param {!Path} path
   * @param {!Object.<string, !Node>} updates
   * @return {!CompoundWrite}
   */
  addWrites(path, updates) {
    var newWrite = <any>this;
    forEach(updates, function(childKey, node) {
      newWrite = newWrite.addWrite(path.child(childKey), node);
    });
    return newWrite;
  };

  /**
   * Will remove a write at the given path and deeper paths. This will <em>not</em> modify a write at a higher
   * location, which must be removed by calling this method with that path.
   *
   * @param {!Path} path The path at which a write and all deeper writes should be removed
   * @return {!CompoundWrite} The new CompoundWrite with the removed path
   */
  removeWrite(path) {
    if (path.isEmpty()) {
      return CompoundWrite.Empty;
    } else {
      var newWriteTree = this.writeTree_.setTree(path, ImmutableTree.Empty);
      return new CompoundWrite(newWriteTree);
    }
  };

  /**
   * Returns whether this CompoundWrite will fully overwrite a node at a given location and can therefore be
   * considered "complete".
   *
   * @param {!Path} path The path to check for
   * @return {boolean} Whether there is a complete write at that path
   */
  hasCompleteWrite(path) {
    return this.getCompleteNode(path) != null;
  };

  /**
   * Returns a node for a path if and only if the node is a "complete" overwrite at that path. This will not aggregate
   * writes from deeper paths, but will return child nodes from a more shallow path.
   *
   * @param {!Path} path The path to get a complete write
   * @return {?Node} The node if complete at that path, or null otherwise.
   */
  getCompleteNode(path) {
    var rootmost = this.writeTree_.findRootMostValueAndPath(path);
    if (rootmost != null) {
      return this.writeTree_.get(rootmost.path).getChild(
          Path.relativePath(rootmost.path, path));
    } else {
      return null;
    }
  };

  /**
   * Returns all children that are guaranteed to be a complete overwrite.
   *
   * @return {!Array.<NamedNode>} A list of all complete children.
   */
  getCompleteChildren() {
    var children = [];
    var node = this.writeTree_.value;
    if (node != null) {
      // If it's a leaf node, it has no children; so nothing to do.
      if (!node.isLeafNode()) {
        node = /** @type {!ChildrenNode} */ (node);
        node.forEachChild(PriorityIndex, function(childName, childNode) {
          children.push(new NamedNode(childName, childNode));
        });
      }
    } else {
      this.writeTree_.children.inorderTraversal(function(childName, childTree) {
        if (childTree.value != null) {
          children.push(new NamedNode(childName, childTree.value));
        }
      });
    }
    return children;
  };

  /**
   * @param {!Path} path
   * @return {!CompoundWrite}
   */
  childCompoundWrite(path) {
    if (path.isEmpty()) {
      return this;
    } else {
      var shadowingNode = this.getCompleteNode(path);
      if (shadowingNode != null) {
        return new CompoundWrite(new ImmutableTree(shadowingNode));
      } else {
        return new CompoundWrite(this.writeTree_.subtree(path));
      }
    }
  };

  /**
   * Returns true if this CompoundWrite is empty and therefore does not modify any nodes.
   * @return {boolean} Whether this CompoundWrite is empty
   */
  isEmpty() {
    return this.writeTree_.isEmpty();
  };

  /**
   * Applies this CompoundWrite to a node. The node is returned with all writes from this CompoundWrite applied to the
   * node
   * @param {!Node} node The node to apply this CompoundWrite to
   * @return {!Node} The node with all writes applied
   */
  apply(node) {
    return CompoundWrite.applySubtreeWrite_(Path.Empty, this.writeTree_, node);
  };

  /**
   * @param {!Path} relativePath
   * @param {!ImmutableTree.<!Node>} writeTree
   * @param {!Node} node
   * @return {!Node}
   * @private
   */
  static applySubtreeWrite_ = function(relativePath, writeTree, node) {
    if (writeTree.value != null) {
      // Since there a write is always a leaf, we're done here
      return node.updateChild(relativePath, writeTree.value);
    } else {
      var priorityWrite = null;
      writeTree.children.inorderTraversal(function(childKey, childTree) {
        if (childKey === '.priority') {
          // Apply priorities at the end so we don't update priorities for either empty nodes or forget
          // to apply priorities to empty nodes that are later filled
          assert(childTree.value !== null, 'Priority writes must always be leaf nodes');
          priorityWrite = childTree.value;
        } else {
          node = CompoundWrite.applySubtreeWrite_(relativePath.child(childKey), childTree, node);
        }
      });
      // If there was a priority write, we only apply it if the node is not empty
      if (!node.getChild(relativePath).isEmpty() && priorityWrite !== null) {
        node = node.updateChild(relativePath.child('.priority'),
            /** @type {!Node} */ (priorityWrite));
      }
      return node;
    }
  };
}

