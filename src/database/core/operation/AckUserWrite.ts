import { assert } from "../../../utils/assert";
import { Path } from "../util/Path";
import { OperationSource, OperationType } from "./Operation";

/**
 *
 * @param {!Path} path
 * @param {!ImmutableTree<!boolean>} affectedTree
 * @param {!boolean} revert
 * @constructor
 * @implements {fb.core.Operation}
 */
export const AckUserWrite = function(path, affectedTree, revert) {
  /** @inheritDoc */
  this.type = OperationType.ACK_USER_WRITE;

  /** @inheritDoc */
  this.source = OperationSource.User;

  /** @inheritDoc */
  this.path = path;

  /**
   * A tree containing true for each affected path.  Affected paths can't overlap.
   * @type {!util.ImmutableTree.<!boolean>}
   */
  this.affectedTree = affectedTree;

  /**
   * @type {boolean}
   */
  this.revert = revert;
};

/**
 * @inheritDoc
 */
AckUserWrite.prototype.operationForChild = function(childName) {
  if (!this.path.isEmpty()) {
    assert(this.path.getFront() === childName, 'operationForChild called for unrelated child.');
    return new AckUserWrite(this.path.popFront(), this.affectedTree, this.revert);
  } else if (this.affectedTree.value != null) {
    assert(this.affectedTree.children.isEmpty(),
        'affectedTree should not have overlapping affected paths.');
    // All child locations are affected as well; just return same operation.
    return this;
  } else {
    var childTree = this.affectedTree.subtree(new Path(childName));
    return new AckUserWrite(Path.Empty, childTree, this.revert);
  }
};