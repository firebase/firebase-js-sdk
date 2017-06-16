import { Path } from "../util/Path";
import { OperationType } from "./Operation";

/**
 * @param {!fb.core.OperationSource} source
 * @param {!Path} path
 * @constructor
 * @implements {fb.core.Operation}
 */
export class ListenComplete {
  type;
  source;
  path;
  
  constructor(source, path) {
    /** @inheritDoc */
    this.type = OperationType.LISTEN_COMPLETE;

    /** @inheritDoc */
    this.source = source;

    /** @inheritDoc */
    this.path = path;
  }
  operationForChild(childName) {
    if (this.path.isEmpty()) {
      return new ListenComplete(this.source, Path.Empty);
    } else {
      return new ListenComplete(this.source, this.path.popFront());
    }
  }
}
