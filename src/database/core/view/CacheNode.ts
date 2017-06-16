/**
 * A cache node only stores complete children. Additionally it holds a flag whether the node can be considered fully
 * initialized in the sense that we know at one point in time this represented a valid state of the world, e.g.
 * initialized with data from the server, or a complete overwrite by the client. The filtered flag also tracks
 * whether a node potentially had children removed due to a filter.
 *
 * @param {!fb.core.snap.Node} node
 * @param {boolean} fullyInitialized
 * @param {boolean} filtered
 * @constructor
 */
export const CacheNode = function(node, fullyInitialized, filtered) {
  /**
   * @type {!fb.core.snap.Node}
   * @private
   */
  this.node_ = node;

  /**
   * @type {boolean}
   * @private
   */
  this.fullyInitialized_ = fullyInitialized;

  /**
   * @type {boolean}
   * @private
   */
  this.filtered_ = filtered;
};

/**
 * Returns whether this node was fully initialized with either server data or a complete overwrite by the client
 * @return {boolean}
 */
CacheNode.prototype.isFullyInitialized = function() {
  return this.fullyInitialized_;
};

/**
 * Returns whether this node is potentially missing children due to a filter applied to the node
 * @return {boolean}
 */
CacheNode.prototype.isFiltered = function() {
  return this.filtered_;
};

/**
 * @param {!fb.core.util.Path} path
 * @return {boolean}
 */
CacheNode.prototype.isCompleteForPath = function(path) {
  if (path.isEmpty()) {
    return this.isFullyInitialized() && !this.filtered_;
  } else {
    var childKey = path.getFront();
    return this.isCompleteForChild(childKey);
  }
};

/**
 * @param {!string} key
 * @return {boolean}
 */
CacheNode.prototype.isCompleteForChild = function(key) {
  return (this.isFullyInitialized() && !this.filtered_) || this.node_.hasChild(key);
};

/**
 * @return {!fb.core.snap.Node}
 */
CacheNode.prototype.getNode = function() {
  return this.node_;
};
