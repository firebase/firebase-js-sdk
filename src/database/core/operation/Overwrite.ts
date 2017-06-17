import { Operation, OperationSource, OperationType } from './Operation';
import { Path } from "../util/Path";
import { Node } from '../snap/Node';

/**
 * @param {!OperationSource} source
 * @param {!Path} path
 * @param {!Node} snap
 * @constructor
 * @implements {Operation}
 */
export class Overwrite implements Operation {
  /** @inheritDoc */
  type = OperationType.OVERWRITE;

  constructor(public source: OperationSource,
              public path: Path,
              public snap: Node) {
  }

  operationForChild(childName: string): Overwrite {
    if (this.path.isEmpty()) {
      return new Overwrite(this.source, Path.Empty,
          this.snap.getImmediateChild(childName));
    } else {
      return new Overwrite(this.source, this.path.popFront(), this.snap);
    }
  }
}