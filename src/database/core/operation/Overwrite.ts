import { OperationType } from "./Operation";
import { Path } from "../util/Path";

/**
 * @param {!OperationSource} source
 * @param {!Path} path
 * @param {!Node} snap
 * @constructor
 * @implements {Operation}
 */
export class Overwrite {
  /** @inheritDoc */
  type;

  /** @inheritDoc */
  source;

  /** @inheritDoc */
  path;
  /**
   * @type {!Node}
   */
  snap;
  
  constructor(source, path, snap) {
    this.type = OperationType.OVERWRITE;
    this.source = source;
    this.path = path;
    this.snap = snap;
  }
  operationForChild(childName) {
    if (this.path.isEmpty()) {
      return new Overwrite(this.source, Path.Empty,
          this.snap.getImmediateChild(childName));
    } else {
      return new Overwrite(this.source, this.path.popFront(), this.snap);
    }
  }
}