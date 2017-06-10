import { ChildrenNode } from "../snap/ChildrenNode";
import { CacheNode } from "./CacheNode";

/**
 * Stores the data we have cached for a view.
 *
 * serverSnap is the cached server data, eventSnap is the cached event data (server data plus any local writes).
 *
 * @param {!CacheNode} eventCache
 * @param {!CacheNode} serverCache
 * @constructor
 */
export class ViewCache {
  /**
   * @const
   * @type {!CacheNode}
   * @private
   */
  private eventCache_;

  /**
   * @const
   * @type {!CacheNode}
   * @private
   */
  private serverCache_;
  constructor(eventCache, serverCache) {
    /**
     * @const
     * @type {!CacheNode}
     * @private
     */
    this.eventCache_ = eventCache;

    /**
     * @const
     * @type {!CacheNode}
     * @private
     */
    this.serverCache_ = serverCache;
  };
  /**
   * @const
   * @type {ViewCache}
   */
  static Empty = new ViewCache(
      new CacheNode(ChildrenNode.EMPTY_NODE, /*fullyInitialized=*/false, /*filtered=*/false),
      new CacheNode(ChildrenNode.EMPTY_NODE, /*fullyInitialized=*/false, /*filtered=*/false)
  );

  /**
   * @param {!fb.core.snap.Node} eventSnap
   * @param {boolean} complete
   * @param {boolean} filtered
   * @return {!ViewCache}
   */
  updateEventSnap(eventSnap, complete, filtered) {
    return new ViewCache(new CacheNode(eventSnap, complete, filtered), this.serverCache_);
  };

  /**
   * @param {!fb.core.snap.Node} serverSnap
   * @param {boolean} complete
   * @param {boolean} filtered
   * @return {!ViewCache}
   */
  updateServerSnap(serverSnap, complete, filtered) {
    return new ViewCache(this.eventCache_, new CacheNode(serverSnap, complete, filtered));
  };

  /**
   * @return {!CacheNode}
   */
  getEventCache() {
    return this.eventCache_;
  };

  /**
   * @return {?fb.core.snap.Node}
   */
  getCompleteEventSnap() {
    return (this.eventCache_.isFullyInitialized()) ? this.eventCache_.getNode() : null;
  };

  /**
   * @return {!CacheNode}
   */
  getServerCache() {
    return this.serverCache_;
  };

  /**
   * @return {?fb.core.snap.Node}
   */
  getCompleteServerSnap() {
    return this.serverCache_.isFullyInitialized() ? this.serverCache_.getNode() : null;
  };
}

