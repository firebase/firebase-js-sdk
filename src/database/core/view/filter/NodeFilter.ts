/**
 * NodeFilter is used to update nodes and complete children of nodes while applying queries on the fly and keeping
 * track of any child changes. This class does not track value changes as value changes depend on more
 * than just the node itself. Different kind of queries require different kind of implementations of this interface.
 * @interface
 */
export const NodeFilter = function() { };

/**
 * Update a single complete child in the snap. If the child equals the old child in the snap, this is a no-op.
 * The method expects an indexed snap.
 *
 * @param {!fb.core.snap.Node} snap
 * @param {string} key
 * @param {!fb.core.snap.Node} newChild
 * @param {!fb.core.util.Path} affectedPath
 * @param {!fb.core.view.CompleteChildSource} source
 * @param {?fb.core.view.ChildChangeAccumulator} optChangeAccumulator
 * @return {!fb.core.snap.Node}
 */
NodeFilter.prototype.updateChild = function(snap, key, newChild, affectedPath, source,
                                                                optChangeAccumulator) {};

/**
 * Update a node in full and output any resulting change from this complete update.
 *
 * @param {!fb.core.snap.Node} oldSnap
 * @param {!fb.core.snap.Node} newSnap
 * @param {?fb.core.view.ChildChangeAccumulator} optChangeAccumulator
 * @return {!fb.core.snap.Node}
 */
NodeFilter.prototype.updateFullNode = function(oldSnap, newSnap, optChangeAccumulator) { };

/**
 * Update the priority of the root node
 *
 * @param {!fb.core.snap.Node} oldSnap
 * @param {!fb.core.snap.Node} newPriority
 * @return {!fb.core.snap.Node}
 */
NodeFilter.prototype.updatePriority = function(oldSnap, newPriority) { };

/**
 * Returns true if children might be filtered due to query criteria
 *
 * @return {boolean}
 */
NodeFilter.prototype.filtersNodes = function() { };

/**
 * Returns the index filter that this filter uses to get a NodeFilter that doesn't filter any children.
 * @return {!NodeFilter}
 */
NodeFilter.prototype.getIndexedFilter = function() { };

/**
 * Returns the index that this filter uses
 * @return {!fb.core.snap.Index}
 */
NodeFilter.prototype.getIndex = function() { };
