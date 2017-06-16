import { OperationType } from "./Operation";
import { Overwrite } from "./Overwrite";
import { Path } from "../util/Path";
import { assert } from "../../../utils/assert";

/**
 * @param {!fb.core.OperationSource} source
 * @param {!Path} path
 * @param {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>} children
 * @constructor
 * @implements {fb.core.Operation}
 */
export const Merge = function(source, path, children) {
  /** @inheritDoc */
  this.type = OperationType.MERGE;

  /** @inheritDoc */
  this.source = source;

  /** @inheritDoc */
  this.path = path;

  /**
   * @type {!fb.core.util.ImmutableTree.<!fb.core.snap.Node>}
   */
  this.children = children;
};

/**
 * @inheritDoc
 */
Merge.prototype.operationForChild = function(childName) {
  if (this.path.isEmpty()) {
    var childTree = this.children.subtree(new Path(childName));
    if (childTree.isEmpty()) {
      // This child is unaffected
      return null;
    } else if (childTree.value) {
      // We have a snapshot for the child in question.  This becomes an overwrite of the child.
      return new Overwrite(this.source, Path.Empty, childTree.value);
    } else {
      // This is a merge at a deeper level
      return new Merge(this.source, Path.Empty, childTree);
    }
  } else {
    assert(this.path.getFront() === childName,
                        'Can\'t get a merge for a child not on the path of the operation');
    return new Merge(this.source, this.path.popFront(), this.children);
  }
};

/**
 * @inheritDoc
 */
Merge.prototype.toString = function() {
  return 'Operation(' + this.path + ': ' + this.source.toString() + ' merge: ' + this.children.toString() + ')';
};