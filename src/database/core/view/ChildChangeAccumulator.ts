import { getValues } from '../../../utils/obj';
import { Change } from "./Change";
import { assert, assertionError } from "../../../utils/assert";

/**
 * @constructor
 */
export class ChildChangeAccumulator {
  changeMap_ = {};
  /**
   * @param {!Change} change
   */
  trackChildChange(change) {
    var type = change.type;
    var childKey = /** @type {!string} */ (change.childName);
    assert(type == Change.CHILD_ADDED ||
        type == Change.CHILD_CHANGED ||
        type == Change.CHILD_REMOVED, 'Only child changes supported for tracking');
    assert(childKey !== '.priority', 'Only non-priority child changes can be tracked.');
    var oldChange = this.changeMap_[childKey];
    if (oldChange) {
      var oldType = oldChange.type;
      if (type == Change.CHILD_ADDED && oldType == Change.CHILD_REMOVED) {
        this.changeMap_[childKey] = Change.childChangedChange(childKey, change.snapshotNode, oldChange.snapshotNode);
      } else if (type == Change.CHILD_REMOVED && oldType == Change.CHILD_ADDED) {
        delete this.changeMap_[childKey];
      } else if (type == Change.CHILD_REMOVED && oldType == Change.CHILD_CHANGED) {
        this.changeMap_[childKey] = Change.childRemovedChange(childKey,
            /** @type {!fb.core.snap.Node} */ (oldChange.oldSnap));
      } else if (type == Change.CHILD_CHANGED && oldType == Change.CHILD_ADDED) {
        this.changeMap_[childKey] = Change.childAddedChange(childKey, change.snapshotNode);
      } else if (type == Change.CHILD_CHANGED && oldType == Change.CHILD_CHANGED) {
        this.changeMap_[childKey] = Change.childChangedChange(childKey, change.snapshotNode,
            /** @type {!fb.core.snap.Node} */ (oldChange.oldSnap));
      } else {
        throw assertionError('Illegal combination of changes: ' + change + ' occurred after ' + oldChange);
      }
    } else {
      this.changeMap_[childKey] = change;
    }
  };


  /**
   * @return {!Array.<!Change>}
   */
  getChanges() {
    return getValues(this.changeMap_);
  };
}


