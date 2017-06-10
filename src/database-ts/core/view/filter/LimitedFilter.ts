import { RangedFilter } from "./RangedFilter";
import { ChildrenNode } from "../../snap/ChildrenNode";
import { NamedNode } from "../../snap/Node";
import { assert } from "../../../../utils/assert";
import { Change } from "../Change";
/**
 * Applies a limit and a range to a node and uses RangedFilter to do the heavy lifting where possible
 *
 * @constructor
 * @implements {NodeFilter}
 * @param {!QueryParams} params
 */
export class LimitedFilter {
  /**
   * @const
   * @type {RangedFilter}
   * @private
   */
  private rangedFilter_;

  /**
   * @const
   * @type {!Index}
   * @private
   */
  private index_;

  /**
   * @const
   * @type {number}
   * @private
   */
  private limit_;

  /**
   * @const
   * @type {boolean}
   * @private
   */
  private reverse_;

  constructor(params) {
    /**
     * @const
     * @type {RangedFilter}
     * @private
     */
    this.rangedFilter_ = new RangedFilter(params);

    /**
     * @const
     * @type {!Index}
     * @private
     */
    this.index_ = params.getIndex();

    /**
     * @const
     * @type {number}
     * @private
     */
    this.limit_ = params.getLimit();

    /**
     * @const
     * @type {boolean}
     * @private
     */
    this.reverse_ = !params.isViewFromLeft();
  };
  /**
   * @inheritDoc
   */
  updateChild(snap, key, newChild, affectedPath, source, optChangeAccumulator) {
    if (!this.rangedFilter_.matches(new NamedNode(key, newChild))) {
      newChild = ChildrenNode.EMPTY_NODE;
    }
    if (snap.getImmediateChild(key).equals(newChild)) {
      // No change
      return snap;
    } else if (snap.numChildren() < this.limit_) {
      return this.rangedFilter_.getIndexedFilter().updateChild(snap, key, newChild, affectedPath, source,
          optChangeAccumulator);
    } else {
      return this.fullLimitUpdateChild_(snap, key, newChild, source, optChangeAccumulator);
    }
  };

  /**
   * @inheritDoc
   */
  updateFullNode(oldSnap, newSnap, optChangeAccumulator) {
    var filtered;
    if (newSnap.isLeafNode() || newSnap.isEmpty()) {
      // Make sure we have a children node with the correct index, not a leaf node;
      filtered = ChildrenNode.EMPTY_NODE.withIndex(this.index_);
    } else {
      if (this.limit_ * 2 < newSnap.numChildren() && newSnap.isIndexed(this.index_)) {
        // Easier to build up a snapshot, since what we're given has more than twice the elements we want
        filtered = ChildrenNode.EMPTY_NODE.withIndex(this.index_);
        // anchor to the startPost, endPost, or last element as appropriate
        var iterator;
        newSnap = /** @type {!ChildrenNode} */ (newSnap);
        if (this.reverse_) {
          iterator = newSnap.getReverseIteratorFrom(this.rangedFilter_.getEndPost(), this.index_);
        } else {
          iterator = newSnap.getIteratorFrom(this.rangedFilter_.getStartPost(), this.index_);
        }
        var count = 0;
        while (iterator.hasNext() && count < this.limit_) {
          var next = iterator.getNext();
          var inRange;
          if (this.reverse_) {
            inRange = this.index_.compare(this.rangedFilter_.getStartPost(), next) <= 0;
          } else {
            inRange = this.index_.compare(next, this.rangedFilter_.getEndPost()) <= 0;
          }
          if (inRange) {
            filtered = filtered.updateImmediateChild(next.name, next.node);
            count++;
          } else {
            // if we have reached the end post, we cannot keep adding elemments
            break;
          }
        }
      } else {
        // The snap contains less than twice the limit. Faster to delete from the snap than build up a new one
        filtered = newSnap.withIndex(this.index_);
        // Don't support priorities on queries
        filtered = /** @type {!ChildrenNode} */ (filtered.updatePriority(ChildrenNode.EMPTY_NODE));
        var startPost;
        var endPost;
        var cmp;
        if (this.reverse_) {
          iterator = filtered.getReverseIterator(this.index_);
          startPost = this.rangedFilter_.getEndPost();
          endPost = this.rangedFilter_.getStartPost();
          var indexCompare = this.index_.getCompare();
          cmp = function(a, b) { return indexCompare(b, a); };
        } else {
          iterator = filtered.getIterator(this.index_);
          startPost = this.rangedFilter_.getStartPost();
          endPost = this.rangedFilter_.getEndPost();
          cmp = this.index_.getCompare();
        }

        count = 0;
        var foundStartPost = false;
        while (iterator.hasNext()) {
          next = iterator.getNext();
          if (!foundStartPost && cmp(startPost, next) <= 0) {
            // start adding
            foundStartPost = true;
          }
          inRange = foundStartPost && count < this.limit_ && cmp(next, endPost) <= 0;
          if (inRange) {
            count++;
          } else {
            filtered = filtered.updateImmediateChild(next.name, ChildrenNode.EMPTY_NODE);
          }
        }
      }
    }
    return this.rangedFilter_.getIndexedFilter().updateFullNode(oldSnap, filtered, optChangeAccumulator);
  };

  /**
   * @inheritDoc
   */
  updatePriority(oldSnap, newPriority) {
    // Don't support priorities on queries
    return oldSnap;
  };

  /**
   * @inheritDoc
   */
  filtersNodes() {
    return true;
  };

  /**
   * @inheritDoc
   */
  getIndexedFilter() {
    return this.rangedFilter_.getIndexedFilter();
  };

  /**
   * @inheritDoc
   */
  getIndex() {
    return this.index_;
  };

  /**
   * @param {!Node} snap
   * @param {string} childKey
   * @param {!Node} childSnap
   * @param {!CompleteChildSource} source
   * @param {?ChildChangeAccumulator} optChangeAccumulator
   * @return {!Node}
   * @private
   */
  fullLimitUpdateChild_(snap, childKey, childSnap, source, optChangeAccumulator) {
    // TODO: rename all cache stuff etc to general snap terminology
    var Change = Change;
    var cmp;
    if (this.reverse_) {
      var indexCmp = this.index_.getCompare();
      cmp = function(a, b) { return indexCmp(b, a); };
    } else {
      cmp = this.index_.getCompare();
    }
    var oldEventCache = /** @type {!ChildrenNode} */ (snap);
    assert(oldEventCache.numChildren() == this.limit_, '');
    var newChildNamedNode = new NamedNode(childKey, childSnap);
    var windowBoundary = /** @type {!NamedNode} */
        (this.reverse_ ? oldEventCache.getFirstChild(this.index_) :
            oldEventCache.getLastChild(this.index_));
    var inRange = this.rangedFilter_.matches(newChildNamedNode);
    if (oldEventCache.hasChild(childKey)) {
      var oldChildSnap = oldEventCache.getImmediateChild(childKey);
      var nextChild = source.getChildAfterChild(this.index_, windowBoundary, this.reverse_);
      while (nextChild != null && (nextChild.name == childKey || oldEventCache.hasChild(nextChild.name))) {
        // There is a weird edge case where a node is updated as part of a merge in the write tree, but hasn't
        // been applied to the limited filter yet. Ignore this next child which will be updated later in
        // the limited filter...
        nextChild = source.getChildAfterChild(this.index_, nextChild, this.reverse_);
      }
      var compareNext = nextChild == null ? 1 : cmp(nextChild, newChildNamedNode);
      var remainsInWindow = inRange && !childSnap.isEmpty() && compareNext >= 0;
      if (remainsInWindow) {
        if (optChangeAccumulator != null) {
          optChangeAccumulator.trackChildChange(Change.childChangedChange(childKey, childSnap, oldChildSnap));
        }
        return oldEventCache.updateImmediateChild(childKey, childSnap);
      } else {
        if (optChangeAccumulator != null) {
          optChangeAccumulator.trackChildChange(Change.childRemovedChange(childKey, oldChildSnap));
        }
        var newEventCache = oldEventCache.updateImmediateChild(childKey, ChildrenNode.EMPTY_NODE);
        var nextChildInRange = nextChild != null && this.rangedFilter_.matches(nextChild);
        if (nextChildInRange) {
          if (optChangeAccumulator != null) {
            optChangeAccumulator.trackChildChange(Change.childAddedChange(nextChild.name, nextChild.node));
          }
          return newEventCache.updateImmediateChild(nextChild.name, nextChild.node);
        } else {
          return newEventCache;
        }
      }
    } else if (childSnap.isEmpty()) {
      // we're deleting a node, but it was not in the window, so ignore it
      return snap;
    } else if (inRange) {
      if (cmp(windowBoundary, newChildNamedNode) >= 0) {
        if (optChangeAccumulator != null) {
          optChangeAccumulator.trackChildChange(Change.childRemovedChange(windowBoundary.name, windowBoundary.node));
          optChangeAccumulator.trackChildChange(Change.childAddedChange(childKey, childSnap));
        }
        return oldEventCache.updateImmediateChild(childKey, childSnap).updateImmediateChild(windowBoundary.name,
          ChildrenNode.EMPTY_NODE);
      } else {
        return snap;
      }
    } else {
      return snap;
    }
  };
}
