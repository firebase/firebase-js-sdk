import { assert } from "../../../../utils/assert";
import { Change } from "../Change";
import { ChildrenNode } from "../../snap/ChildrenNode";
import { PriorityIndex } from "../../snap/IndexFactory";

/**
 * Doesn't really filter nodes but applies an index to the node and keeps track of any changes
 *
 * @constructor
 * @implements {filter.NodeFilter}
 * @param {!fb.core.snap.Index} index
 */
export class IndexedFilter {
  /**
   * @type {!fb.core.snap.Index}
   * @const
   * @private
   */
  private index_;
  constructor(index) {
    this.index_ = index;
  }

  updateChild(snap, key, newChild, affectedPath, source, optChangeAccumulator) {
    assert(snap.isIndexed(this.index_), 'A node must be indexed if only a child is updated');
    var oldChild = snap.getImmediateChild(key);
    // Check if anything actually changed.
    if (oldChild.getChild(affectedPath).equals(newChild.getChild(affectedPath))) {
      // There's an edge case where a child can enter or leave the view because affectedPath was set to null.
      // In this case, affectedPath will appear null in both the old and new snapshots.  So we need
      // to avoid treating these cases as "nothing changed."
      if (oldChild.isEmpty() == newChild.isEmpty()) {
        // Nothing changed.

        // This assert should be valid, but it's expensive (can dominate perf testing) so don't actually do it.
        //assert(oldChild.equals(newChild), 'Old and new snapshots should be equal.');
        return snap;
      }
    }

    if (optChangeAccumulator != null) {
      if (newChild.isEmpty()) {
        if (snap.hasChild(key)) {
          optChangeAccumulator.trackChildChange(Change.childRemovedChange(key, oldChild));
        } else {
          assert(snap.isLeafNode(), 'A child remove without an old child only makes sense on a leaf node');
        }
      } else if (oldChild.isEmpty()) {
        optChangeAccumulator.trackChildChange(Change.childAddedChange(key, newChild));
      } else {
        optChangeAccumulator.trackChildChange(Change.childChangedChange(key, newChild, oldChild));
      }
    }
    if (snap.isLeafNode() && newChild.isEmpty()) {
      return snap;
    } else {
      // Make sure the node is indexed
      return snap.updateImmediateChild(key, newChild).withIndex(this.index_);
    }
  };

  /**
   * @inheritDoc
   */
  updateFullNode(oldSnap, newSnap, optChangeAccumulator) {
    if (optChangeAccumulator != null) {
      if (!oldSnap.isLeafNode()) {
        oldSnap.forEachChild(PriorityIndex, function(key, childNode) {
          if (!newSnap.hasChild(key)) {
            optChangeAccumulator.trackChildChange(Change.childRemovedChange(key, childNode));
          }
        });
      }
      if (!newSnap.isLeafNode()) {
        newSnap.forEachChild(PriorityIndex, function(key, childNode) {
          if (oldSnap.hasChild(key)) {
            var oldChild = oldSnap.getImmediateChild(key);
            if (!oldChild.equals(childNode)) {
              optChangeAccumulator.trackChildChange(Change.childChangedChange(key, childNode, oldChild));
            }
          } else {
            optChangeAccumulator.trackChildChange(Change.childAddedChange(key, childNode));
          }
        });
      }
    }
    return newSnap.withIndex(this.index_);
  };

  /**
   * @inheritDoc
   */
  updatePriority(oldSnap, newPriority) {
    if (oldSnap.isEmpty()) {
      return ChildrenNode.EMPTY_NODE;
    } else {
      return oldSnap.updatePriority(newPriority);
    }
  };

  /**
   * @inheritDoc
   */
  filtersNodes() {
    return false;
  };

  /**
   * @inheritDoc
   */
  getIndexedFilter() {
    return this;
  };

  /**
   * @inheritDoc
   */
  getIndex() {
    return this.index_;
  };
}
