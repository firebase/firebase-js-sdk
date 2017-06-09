import { EMPTY_NODE } from "./snap/snap";

/**
 * Mutable object which basically just stores a reference to the "latest" immutable snapshot.
 *
 * @constructor
 */
export class SnapshotHolder {
  private rootNode = EMPTY_NODE;
  getNode(path) {
    return this.rootNode.getChild(path);
  }
  updateSnapshot(path, newSnapshotNode) {
    this.rootNode = this.rootNode.updateChild(path, newSnapshotNode);
  }
  toString() {
    return this.rootNode.toString();
  }
}
