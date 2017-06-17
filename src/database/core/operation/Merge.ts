import { Operation, OperationSource, OperationType } from './Operation';
import { Overwrite } from "./Overwrite";
import { Path } from "../util/Path";
import { assert } from "../../../utils/assert";
import { ImmutableTree } from '../util/ImmutableTree';

/**
 * @param {!OperationSource} source
 * @param {!Path} path
 * @param {!ImmutableTree.<!Node>} children
 * @constructor
 * @implements {Operation}
 */
export class Merge implements Operation {
  /** @inheritDoc */
  type = OperationType.MERGE;

  constructor(/**@inheritDoc */ public source: OperationSource,
              /**@inheritDoc */ public path: Path,
              /**@inheritDoc */ public children: ImmutableTree) {
  }

  /**
   * @inheritDoc
   */
  operationForChild(childName: string): Operation {
    if (this.path.isEmpty()) {
      const childTree = this.children.subtree(new Path(childName));
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
  }

  /**
   * @inheritDoc
   */
  toString(): string {
    return 'Operation(' + this.path + ': ' + this.source.toString() + ' merge: ' + this.children.toString() + ')';
  }
}