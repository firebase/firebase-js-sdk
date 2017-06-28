import { Path } from "../util/Path";
import { Operation, OperationSource, OperationType } from './Operation';

/**
 * @param {!OperationSource} source
 * @param {!Path} path
 * @constructor
 * @implements {Operation}
 */
export class ListenComplete implements Operation {
  /** @inheritDoc */
  type = OperationType.LISTEN_COMPLETE;

  constructor(public source: OperationSource, public path: Path) {
  }

  operationForChild(childName: string): ListenComplete {
    if (this.path.isEmpty()) {
      return new ListenComplete(this.source, Path.Empty);
    } else {
      return new ListenComplete(this.source, this.path.popFront());
    }
  }
}
