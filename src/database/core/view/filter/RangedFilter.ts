import { IndexedFilter } from "./IndexedFilter";
import { PRIORITY_INDEX } from "../../../core/snap/indexes/PriorityIndex";
import { NamedNode } from "../../../core/snap/Node";
import { ChildrenNode } from "../../../core/snap/ChildrenNode";
/**
 * Filters nodes by range and uses an IndexFilter to track any changes after filtering the node
 *
 * @constructor
 * @implements {NodeFilter}
 * @param {!fb.core.view.QueryParams} params
 */
export class RangedFilter {
  /**
   * @type {!IndexedFilter}
   * @const
   * @private
   */
  private indexedFilter_: IndexedFilter;

  /**
   * @const
   * @type {!Index}
   * @private
   */
  private index_;

  /**
   * @const
   * @type {!NamedNode}
   * @private
   */
  private startPost_;

  /**
   * @const
   * @type {!NamedNode}
   * @private
   */
  private endPost_;

  constructor(params) {
    this.indexedFilter_ = new IndexedFilter(params.getIndex());
    this.index_ = params.getIndex();
    this.startPost_ = this.getStartPost_(params);
    this.endPost_ = this.getEndPost_(params);
  };

  /**
   * @return {!NamedNode}
   */
  getStartPost() {
    return this.startPost_;
  };

  /**
   * @return {!NamedNode}
   */
  getEndPost() {
    return this.endPost_;
  };

  /**
   * @param {!NamedNode} node
   * @return {boolean}
   */
  matches(node) {
    return (this.index_.compare(this.getStartPost(), node) <= 0 && this.index_.compare(node, this.getEndPost()) <= 0);
  };

  /**
   * @inheritDoc
   */
  updateChild(snap, key, newChild, affectedPath, source, optChangeAccumulator) {
    if (!this.matches(new NamedNode(key, newChild))) {
      newChild = ChildrenNode.EMPTY_NODE;
    }
    return this.indexedFilter_.updateChild(snap, key, newChild, affectedPath, source, optChangeAccumulator);
  };

  /**
   * @inheritDoc
   */
  updateFullNode(oldSnap, newSnap, optChangeAccumulator) {
    if (newSnap.isLeafNode()) {
      // Make sure we have a children node with the correct index, not a leaf node;
      newSnap = ChildrenNode.EMPTY_NODE;
    }
    var filtered = newSnap.withIndex(this.index_);
    // Don't support priorities on queries
    filtered = filtered.updatePriority(ChildrenNode.EMPTY_NODE);
    var self = this;
    newSnap.forEachChild(PRIORITY_INDEX, function(key, childNode) {
      if (!self.matches(new NamedNode(key, childNode))) {
        filtered = filtered.updateImmediateChild(key, ChildrenNode.EMPTY_NODE);
      }
    });
    return this.indexedFilter_.updateFullNode(oldSnap, filtered, optChangeAccumulator);
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
    return this.indexedFilter_;
  };

  /**
   * @inheritDoc
   */
  getIndex() {
    return this.index_;
  };

  /**
   * @param {!fb.core.view.QueryParams} params
   * @return {!NamedNode}
   * @private
   */
  getStartPost_(params) {
    if (params.hasStart()) {
      var startName = params.getIndexStartName();
      return params.getIndex().makePost(params.getIndexStartValue(), startName);
    } else {
      return params.getIndex().minPost();
    }
  };

  /**
   * @param {!fb.core.view.QueryParams} params
   * @return {!NamedNode}
   * @private
   */
  getEndPost_(params) {
    if (params.hasEnd()) {
      var endName = params.getIndexEndName();
      return params.getIndex().makePost(params.getIndexEndValue(), endName);
    } else {
      return params.getIndex().maxPost();
    }
  };
}
