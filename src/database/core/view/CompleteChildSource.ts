import { CacheNode } from "./CacheNode";

/**
 * Since updates to filtered nodes might require nodes to be pulled in from "outside" the node, this interface
 * can help to get complete children that can be pulled in.
 * A class implementing this interface takes potentially multiple sources (e.g. user writes, server data from
 * other views etc.) to try it's best to get a complete child that might be useful in pulling into the view.
 *
 * @interface
 */
export const CompleteChildSource = function() { };

/**
 * @param {!string} childKey
 * @return {?fb.core.snap.Node}
 */
CompleteChildSource.prototype.getCompleteChild = function(childKey) { };

/**
 * @param {!fb.core.snap.Index} index
 * @param {!fb.core.snap.NamedNode} child
 * @param {boolean} reverse
 * @return {?fb.core.snap.NamedNode}
 */
CompleteChildSource.prototype.getChildAfterChild = function(index, child, reverse) { };


/**
 * An implementation of CompleteChildSource that never returns any additional children
 *
 * @private
 * @constructor
 * @implements CompleteChildSource
 */
const NoCompleteChildSource_ = function() {
};

/**
 * @inheritDoc
 */
NoCompleteChildSource_.prototype.getCompleteChild = function() {
  return null;
};

/**
 * @inheritDoc
 */
NoCompleteChildSource_.prototype.getChildAfterChild = function() {
  return null;
};

/**
 * Singleton instance.
 * @const
 * @type {!CompleteChildSource}
 */
export const NO_COMPLETE_CHILD_SOURCE = new NoCompleteChildSource_();


/**
 * An implementation of CompleteChildSource that uses a WriteTree in addition to any other server data or
 * old event caches available to calculate complete children.
 *
 * @param {!fb.core.WriteTreeRef} writes
 * @param {!fb.core.view.ViewCache} viewCache
 * @param {?fb.core.snap.Node} optCompleteServerCache
 *
 * @constructor
 * @implements CompleteChildSource
 */
export const WriteTreeCompleteChildSource = function(writes, viewCache, optCompleteServerCache) {
  /**
   * @type {!fb.core.WriteTreeRef}
   * @private
   */
  this.writes_ = writes;

  /**
   * @type {!fb.core.view.ViewCache}
   * @private
   */
  this.viewCache_ = viewCache;

  /**
   * @type {?fb.core.snap.Node}
   * @private
   */
  this.optCompleteServerCache_ = optCompleteServerCache;
};

/**
 * @inheritDoc
 */
WriteTreeCompleteChildSource.prototype.getCompleteChild = function(childKey) {
  var node = this.viewCache_.getEventCache();
  if (node.isCompleteForChild(childKey)) {
    return node.getNode().getImmediateChild(childKey);
  } else {
    var serverNode = this.optCompleteServerCache_ != null ?
        new CacheNode(this.optCompleteServerCache_, true, false) : this.viewCache_.getServerCache();
    return this.writes_.calcCompleteChild(childKey, serverNode);
  }
};

/**
 * @inheritDoc
 */
WriteTreeCompleteChildSource.prototype.getChildAfterChild = function(index, child, reverse) {
  var completeServerData = this.optCompleteServerCache_ != null ? this.optCompleteServerCache_ :
      this.viewCache_.getCompleteServerSnap();
  var nodes = this.writes_.calcIndexedSlice(completeServerData, child, 1, reverse, index);
  if (nodes.length === 0) {
    return null;
  } else {
    return nodes[0];
  }
};
