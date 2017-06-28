import { assert } from "../../../utils/assert";
import { Path } from "../util/Path";
import { Operation, OperationSource, OperationType } from './Operation';
import { ImmutableTree } from '../util/ImmutableTree';

export class AckUserWrite implements Operation {
  /** @inheritDoc */
  type = OperationType.ACK_USER_WRITE;

  /** @inheritDoc */
  source = OperationSource.User;

  /**
   *
   * @param {!Path} path
   * @param {!ImmutableTree<!boolean>} affectedTree A tree containing true for each affected path. Affected paths can't overlap.
   * @param {!boolean} revert
   */
  constructor(/**@inheritDoc */ public path: Path,
              /**@inheritDoc */ public affectedTree: ImmutableTree,
              /**@inheritDoc */ public revert: boolean) {

  }

  /**
   * @inheritDoc
   */
  operationForChild(childName: string): AckUserWrite {
    if (!this.path.isEmpty()) {
      assert(this.path.getFront() === childName, 'operationForChild called for unrelated child.');
      return new AckUserWrite(this.path.popFront(), this.affectedTree, this.revert);
    } else if (this.affectedTree.value != null) {
      assert(this.affectedTree.children.isEmpty(),
        'affectedTree should not have overlapping affected paths.');
      // All child locations are affected as well; just return same operation.
      return this;
    } else {
      const childTree = this.affectedTree.subtree(new Path(childName));
      return new AckUserWrite(Path.Empty, childTree, this.revert);
    }
  }
}