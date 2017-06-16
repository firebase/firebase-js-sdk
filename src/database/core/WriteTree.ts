import { findKey, forEach } from "../../utils/obj";
import { assert, assertionError } from "../../utils/assert";
import { Path } from "./util/Path";
import { CompoundWrite } from "./CompoundWrite";
import { PRIORITY_INDEX } from "./snap/indexes/PriorityIndex";
import { ChildrenNode } from "./snap/ChildrenNode";

/**
 * Defines a single user-initiated write operation. May be the result of a set(), transaction(), or update() call. In
 * the case of a set() or transaction, snap wil be non-null.  In the case of an update(), children will be non-null.
 *
 * @typedef {{
 *   writeId: number,
 *   path: !Path,
 *   snap: ?Node,
 *   children: ?Object.<string, !Node>,
 *   visible: boolean
 * }}
 */

/**
 * WriteTree tracks all pending user-initiated writes and has methods to calculate the result of merging them
 * with underlying server data (to create "event cache" data).  Pending writes are added with addOverwrite()
 * and addMerge(), and removed with removeWrite().
 *
 * @constructor
 */
export class WriteTree {
  /**
   * A tree tracking the result of applying all visible writes.  This does not include transactions with
   * applyLocally=false or writes that are completely shadowed by other writes.
   *
   * @type {!CompoundWrite}
   * @private
   */
  visibleWrites_;

  /**
   * A list of all pending writes, regardless of visibility and shadowed-ness.  Used to calculate arbitrary
   * sets of the changed data, such as hidden writes (from transactions) or changes with certain writes excluded (also
   * used by transactions).
   *
   * @type {!Array.<!WriteRecord>}
   * @private
   */
  allWrites_;
  lastWriteId_;

  constructor() {
    this.visibleWrites_ = CompoundWrite.Empty;
    this.allWrites_ = [];
    this.lastWriteId_ = -1;
  };
  /**
   * Create a new WriteTreeRef for the given path. For use with a new sync point at the given path.
   *
   * @param {!Path} path
   * @return {!WriteTreeRef}
   */
  childWrites(path) {
    return new WriteTreeRef(path, this);
  };

  /**
   * Record a new overwrite from user code.
   *
   * @param {!Path} path
   * @param {!Node} snap
   * @param {!number} writeId
   * @param {boolean=} visible This is set to false by some transactions. It should be excluded from event caches
   */
  addOverwrite(path, snap, writeId, visible) {
    assert(writeId > this.lastWriteId_, 'Stacking an older write on top of newer ones');
    if (visible === undefined) {
      visible = true;
    }
    this.allWrites_.push({path: path, snap: snap, writeId: writeId, visible: visible});

    if (visible) {
      this.visibleWrites_ = this.visibleWrites_.addWrite(path, snap);
    }
    this.lastWriteId_ = writeId;
  };

  /**
   * Record a new merge from user code.
   *
   * @param {!Path} path
   * @param {!Object.<string, !Node>} changedChildren
   * @param {!number} writeId
   */
  addMerge(path, changedChildren, writeId) {
    assert(writeId > this.lastWriteId_, 'Stacking an older merge on top of newer ones');
    this.allWrites_.push({path: path, children: changedChildren, writeId: writeId, visible: true});

    this.visibleWrites_ = this.visibleWrites_.addWrites(path, changedChildren);
    this.lastWriteId_ = writeId;
  };


  /**
   * @param {!number} writeId
   * @return {?WriteRecord}
   */
  getWrite(writeId) {
    for (var i = 0; i < this.allWrites_.length; i++) {
      var record = this.allWrites_[i];
      if (record.writeId === writeId) {
        return record;
      }
    }
    return null;
  };


  /**
   * Remove a write (either an overwrite or merge) that has been successfully acknowledge by the server. Recalculates
   * the tree if necessary.  We return true if it may have been visible, meaning views need to reevaluate.
   *
   * @param {!number} writeId
   * @return {boolean} true if the write may have been visible (meaning we'll need to reevaluate / raise
   * events as a result).
   */
  removeWrite(writeId) {
    // Note: disabling this check. It could be a transaction that preempted another transaction, and thus was applied
    // out of order.
    //var validClear = revert || this.allWrites_.length === 0 || writeId <= this.allWrites_[0].writeId;
    //assert(validClear, "Either we don't have this write, or it's the first one in the queue");

    var idx = this.allWrites_.findIndex(function(s) { return s.writeId === writeId; });
    assert(idx >= 0, 'removeWrite called with nonexistent writeId.');
    var writeToRemove = this.allWrites_[idx];
    this.allWrites_.splice(idx, 1);

    var removedWriteWasVisible = writeToRemove.visible;
    var removedWriteOverlapsWithOtherWrites = false;

    var i = this.allWrites_.length - 1;

    while (removedWriteWasVisible && i >= 0) {
      var currentWrite = this.allWrites_[i];
      if (currentWrite.visible) {
        if (i >= idx && this.recordContainsPath_(currentWrite, writeToRemove.path)) {
          // The removed write was completely shadowed by a subsequent write.
          removedWriteWasVisible = false;
        } else if (writeToRemove.path.contains(currentWrite.path)) {
          // Either we're covering some writes or they're covering part of us (depending on which came first).
          removedWriteOverlapsWithOtherWrites = true;
        }
      }
      i--;
    }

    if (!removedWriteWasVisible) {
      return false;
    } else if (removedWriteOverlapsWithOtherWrites) {
      // There's some shadowing going on. Just rebuild the visible writes from scratch.
      this.resetTree_();
      return true;
    } else {
      // There's no shadowing.  We can safely just remove the write(s) from visibleWrites.
      if (writeToRemove.snap) {
        this.visibleWrites_ = this.visibleWrites_.removeWrite(writeToRemove.path);
      } else {
        var children = writeToRemove.children;
        var self = this;
        forEach(children, function(childSnap, childName) {
          self.visibleWrites_ = self.visibleWrites_.removeWrite(writeToRemove.path.child(childName));
        });
      }
      return true;
    }
  };

  /**
   * Return a complete snapshot for the given path if there's visible write data at that path, else null.
   * No server data is considered.
   *
   * @param {!Path} path
   * @return {?Node}
   */
  getCompleteWriteData(path) {
    return this.visibleWrites_.getCompleteNode(path);
  };

  /**
   * Given optional, underlying server data, and an optional set of constraints (exclude some sets, include hidden
   * writes), attempt to calculate a complete snapshot for the given path
   *
   * @param {!Path} treePath
   * @param {?Node} completeServerCache
   * @param {Array.<number>=} writeIdsToExclude An optional set to be excluded
   * @param {boolean=} includeHiddenWrites Defaults to false, whether or not to layer on writes with visible set to false
   * @return {?Node}
   */
  calcCompleteEventCache(treePath, completeServerCache, writeIdsToExclude,
                                                            includeHiddenWrites) {
    if (!writeIdsToExclude && !includeHiddenWrites) {
      var shadowingNode = this.visibleWrites_.getCompleteNode(treePath);
      if (shadowingNode != null) {
        return shadowingNode;
      } else {
        var subMerge = this.visibleWrites_.childCompoundWrite(treePath);
        if (subMerge.isEmpty()) {
          return completeServerCache;
        } else if (completeServerCache == null && !subMerge.hasCompleteWrite(Path.Empty)) {
          // We wouldn't have a complete snapshot, since there's no underlying data and no complete shadow
          return null;
        } else {
          var layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
          return subMerge.apply(layeredCache);
        }
      }
    } else {
      var merge = this.visibleWrites_.childCompoundWrite(treePath);
      if (!includeHiddenWrites && merge.isEmpty()) {
        return completeServerCache;
      } else {
        // If the server cache is null, and we don't have a complete cache, we need to return null
        if (!includeHiddenWrites && completeServerCache == null && !merge.hasCompleteWrite(Path.Empty)) {
          return null;
        } else {
          var filter = function(write) {
            return (write.visible || includeHiddenWrites) &&
                (!writeIdsToExclude || !~writeIdsToExclude.indexOf(write.writeId)) &&
                (write.path.contains(treePath) || treePath.contains(write.path));
          };
          var mergeAtPath = WriteTree.layerTree_(this.allWrites_, filter, treePath);
          layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
          return mergeAtPath.apply(layeredCache);
        }
      }
    }
  };

  /**
   * With optional, underlying server data, attempt to return a children node of children that we have complete data for.
   * Used when creating new views, to pre-fill their complete event children snapshot.
   *
   * @param {!Path} treePath
   * @param {?ChildrenNode} completeServerChildren
   * @return {!ChildrenNode}
   */
  calcCompleteEventChildren(treePath, completeServerChildren) {
    var completeChildren = ChildrenNode.EMPTY_NODE;
    var topLevelSet = this.visibleWrites_.getCompleteNode(treePath);
    if (topLevelSet) {
      if (!topLevelSet.isLeafNode()) {
        // we're shadowing everything. Return the children.
        topLevelSet.forEachChild(PRIORITY_INDEX, function(childName, childSnap) {
          completeChildren = completeChildren.updateImmediateChild(childName, childSnap);
        });
      }
      return completeChildren;
    } else if (completeServerChildren) {
      // Layer any children we have on top of this
      // We know we don't have a top-level set, so just enumerate existing children
      var merge = this.visibleWrites_.childCompoundWrite(treePath);
      completeServerChildren.forEachChild(PRIORITY_INDEX, function(childName, childNode) {
        var node = merge.childCompoundWrite(new Path(childName)).apply(childNode);
        completeChildren = completeChildren.updateImmediateChild(childName, node);
      });
      // Add any complete children we have from the set
      merge.getCompleteChildren().forEach(function(namedNode) {
        completeChildren = completeChildren.updateImmediateChild(namedNode.name, namedNode.node);
      });
      return completeChildren;
    } else {
      // We don't have anything to layer on top of. Layer on any children we have
      // Note that we can return an empty snap if we have a defined delete
      merge = this.visibleWrites_.childCompoundWrite(treePath);
      merge.getCompleteChildren().forEach(function(namedNode) {
        completeChildren = completeChildren.updateImmediateChild(namedNode.name, namedNode.node);
      });
      return completeChildren;
    }
  };

  /**
   * Given that the underlying server data has updated, determine what, if anything, needs to be
   * applied to the event cache.
   *
   * Possibilities:
   *
   * 1. No writes are shadowing. Events should be raised, the snap to be applied comes from the server data
   *
   * 2. Some write is completely shadowing. No events to be raised
   *
   * 3. Is partially shadowed. Events
   *
   * Either existingEventSnap or existingServerSnap must exist
   *
   * @param {!Path} treePath
   * @param {!Path} childPath
   * @param {?Node} existingEventSnap
   * @param {?Node} existingServerSnap
   * @return {?Node}
   */
  calcEventCacheAfterServerOverwrite(treePath, childPath, existingEventSnap,
                                                                      existingServerSnap) {
    assert(existingEventSnap || existingServerSnap,
      'Either existingEventSnap or existingServerSnap must exist');
    var path = treePath.child(childPath);
    if (this.visibleWrites_.hasCompleteWrite(path)) {
      // At this point we can probably guarantee that we're in case 2, meaning no events
      // May need to check visibility while doing the findRootMostValueAndPath call
      return null;
    } else {
      // No complete shadowing. We're either partially shadowing or not shadowing at all.
      var childMerge = this.visibleWrites_.childCompoundWrite(path);
      if (childMerge.isEmpty()) {
        // We're not shadowing at all. Case 1
        return existingServerSnap.getChild(childPath);
      } else {
        // This could be more efficient if the serverNode + updates doesn't change the eventSnap
        // However this is tricky to find out, since user updates don't necessary change the server
        // snap, e.g. priority updates on empty nodes, or deep deletes. Another special case is if the server
        // adds nodes, but doesn't change any existing writes. It is therefore not enough to
        // only check if the updates change the serverNode.
        // Maybe check if the merge tree contains these special cases and only do a full overwrite in that case?
        return childMerge.apply(existingServerSnap.getChild(childPath));
      }
    }
  };

  /**
   * Returns a complete child for a given server snap after applying all user writes or null if there is no
   * complete child for this ChildKey.
   *
   * @param {!Path} treePath
   * @param {!string} childKey
   * @param {!CacheNode} existingServerSnap
   * @return {?Node}
   */
  calcCompleteChild(treePath, childKey, existingServerSnap) {
    var path = treePath.child(childKey);
    var shadowingNode = this.visibleWrites_.getCompleteNode(path);
    if (shadowingNode != null) {
      return shadowingNode;
    } else {
      if (existingServerSnap.isCompleteForChild(childKey)) {
        var childMerge = this.visibleWrites_.childCompoundWrite(path);
        return childMerge.apply(existingServerSnap.getNode().getImmediateChild(childKey));
      } else {
        return null;
      }
    }
  };

  /**
   * Returns a node if there is a complete overwrite for this path. More specifically, if there is a write at
   * a higher path, this will return the child of that write relative to the write and this path.
   * Returns null if there is no write at this path.
   *
   * @param {!Path} path
   * @return {?Node}
   */
  shadowingWrite(path) {
    return this.visibleWrites_.getCompleteNode(path);
  };

  /**
   * This method is used when processing child remove events on a query. If we can, we pull in children that were outside
   * the window, but may now be in the window.
   *
   * @param {!Path} treePath
   * @param {?Node} completeServerData
   * @param {!NamedNode} startPost
   * @param {!number} count
   * @param {boolean} reverse
   * @param {!Index} index
   * @return {!Array.<!NamedNode>}
   */
  calcIndexedSlice(treePath, completeServerData, startPost, count, reverse,
                                                          index) {
    var toIterate;
    var merge = this.visibleWrites_.childCompoundWrite(treePath);
    var shadowingNode = merge.getCompleteNode(Path.Empty);
    if (shadowingNode != null) {
      toIterate = shadowingNode;
    } else if (completeServerData != null) {
      toIterate = merge.apply(completeServerData);
    } else {
      // no children to iterate on
      return [];
    }
    toIterate = toIterate.withIndex(index);
    if (!toIterate.isEmpty() && !toIterate.isLeafNode()) {
      var nodes = [];
      var cmp = index.getCompare();
      var iter = reverse ? toIterate.getReverseIteratorFrom(startPost, index) :
          toIterate.getIteratorFrom(startPost, index);
      var next = iter.getNext();
      while (next && nodes.length < count) {
        if (cmp(next, startPost) !== 0) {
          nodes.push(next);
        }
        next = iter.getNext();
      }
      return nodes;
    } else {
      return [];
    }
  };

  /**
   * @param {!WriteRecord} writeRecord
   * @param {!Path} path
   * @return {boolean}
   * @private
   */
  recordContainsPath_(writeRecord, path) {
    if (writeRecord.snap) {
      return writeRecord.path.contains(path);
    } else {
      // findKey can return undefined, so use !! to coerce to boolean
      return !!findKey(writeRecord.children, function(childSnap, childName) {
        return writeRecord.path.child(childName).contains(path);
      });
    }
  };

  /**
   * Re-layer the writes and merges into a tree so we can efficiently calculate event snapshots
   * @private
   */
  resetTree_() {
    this.visibleWrites_ = WriteTree.layerTree_(this.allWrites_, WriteTree.DefaultFilter_,
        Path.Empty);
    if (this.allWrites_.length > 0) {
      this.lastWriteId_ = this.allWrites_[this.allWrites_.length - 1].writeId;
    } else {
      this.lastWriteId_ = -1;
    }
  };

  /**
   * The default filter used when constructing the tree. Keep everything that's visible.
   *
   * @param {!WriteRecord} write
   * @return {boolean}
   * @private
   * @const
   */
  static DefaultFilter_ = function(write) { return write.visible; };

  /**
   * Static method. Given an array of WriteRecords, a filter for which ones to include, and a path, construct the tree of
   * event data at that path.
   *
   * @param {!Array.<!WriteRecord>} writes
   * @param {!function(!WriteRecord):boolean} filter
   * @param {!Path} treeRoot
   * @return {!CompoundWrite}
   * @private
   */
  static layerTree_ = function(writes, filter, treeRoot) {
    var compoundWrite = CompoundWrite.Empty;
    for (var i = 0; i < writes.length; ++i) {
      var write = writes[i];
      // Theory, a later set will either:
      // a) abort a relevant transaction, so no need to worry about excluding it from calculating that transaction
      // b) not be relevant to a transaction (separate branch), so again will not affect the data for that transaction
      if (filter(write)) {
        var writePath = write.path;
        var relativePath;
        if (write.snap) {
          if (treeRoot.contains(writePath)) {
            relativePath = Path.relativePath(treeRoot, writePath);
            compoundWrite = compoundWrite.addWrite(relativePath, write.snap);
          } else if (writePath.contains(treeRoot)) {
            relativePath = Path.relativePath(writePath, treeRoot);
            compoundWrite = compoundWrite.addWrite(Path.Empty, write.snap.getChild(relativePath));
          } else {
            // There is no overlap between root path and write path, ignore write
          }
        } else if (write.children) {
          if (treeRoot.contains(writePath)) {
            relativePath = Path.relativePath(treeRoot, writePath);
            compoundWrite = compoundWrite.addWrites(relativePath, write.children);
          } else if (writePath.contains(treeRoot)) {
            relativePath = Path.relativePath(writePath, treeRoot);
            if (relativePath.isEmpty()) {
              compoundWrite = compoundWrite.addWrites(Path.Empty, write.children);
            } else {
              var child = write.children[relativePath.getFront()];
              if (child) {
                // There exists a child in this node that matches the root path
                var deepNode = child.getChild(relativePath.popFront());
                compoundWrite = compoundWrite.addWrite(Path.Empty, deepNode);
              }
            }
          } else {
            // There is no overlap between root path and write path, ignore write
          }
        } else {
          throw assertionError('WriteRecord should have .snap or .children');
        }
      }
    }
    return compoundWrite;
  };
}

/**
 * A WriteTreeRef wraps a WriteTree and a path, for convenient access to a particular subtree.  All of the methods
 * just proxy to the underlying WriteTree.
 *
 * @param {!Path} path
 * @param {!WriteTree} writeTree
 * @constructor
 */
export class WriteTreeRef {
  /**
   * The path to this particular write tree ref. Used for calling methods on writeTree_ while exposing a simpler
   * interface to callers.
   *
   * @type {!Path}
   * @private
   * @const
   */
  treePath_;

  /**
   * * A reference to the actual tree of write data. All methods are pass-through to the tree, but with the appropriate
   * path prefixed.
   *
   * This lets us make cheap references to points in the tree for sync points without having to copy and maintain all of
   * the data.
   *
   * @type {!WriteTree}
   * @private
   * @const
   */
  writeTree_;

  constructor(path, writeTree) {
    this.treePath_ = path;
    this.writeTree_ = writeTree;
  };
  /**
   * If possible, returns a complete event cache, using the underlying server data if possible. In addition, can be used
   * to get a cache that includes hidden writes, and excludes arbitrary writes. Note that customizing the returned node
   * can lead to a more expensive calculation.
   *
   * @param {?Node} completeServerCache
   * @param {Array.<number>=} writeIdsToExclude Optional writes to exclude.
   * @param {boolean=} includeHiddenWrites Defaults to false, whether or not to layer on writes with visible set to false
   * @return {?Node}
   */
  calcCompleteEventCache(completeServerCache, writeIdsToExclude,
                                                          includeHiddenWrites) {
    return this.writeTree_.calcCompleteEventCache(this.treePath_, completeServerCache, writeIdsToExclude,
        includeHiddenWrites);
  };

  /**
   * If possible, returns a children node containing all of the complete children we have data for. The returned data is a
   * mix of the given server data and write data.
   *
   * @param {?ChildrenNode} completeServerChildren
   * @return {!ChildrenNode}
   */
  calcCompleteEventChildren(completeServerChildren) {
    return this.writeTree_.calcCompleteEventChildren(this.treePath_, completeServerChildren);
  };

  /**
   * Given that either the underlying server data has updated or the outstanding writes have updated, determine what,
   * if anything, needs to be applied to the event cache.
   *
   * Possibilities:
   *
   * 1. No writes are shadowing. Events should be raised, the snap to be applied comes from the server data
   *
   * 2. Some write is completely shadowing. No events to be raised
   *
   * 3. Is partially shadowed. Events should be raised
   *
   * Either existingEventSnap or existingServerSnap must exist, this is validated via an assert
   *
   * @param {!Path} path
   * @param {?Node} existingEventSnap
   * @param {?Node} existingServerSnap
   * @return {?Node}
   */
  calcEventCacheAfterServerOverwrite(path, existingEventSnap, existingServerSnap) {
    return this.writeTree_.calcEventCacheAfterServerOverwrite(this.treePath_, path, existingEventSnap, existingServerSnap);
  };

  /**
   * Returns a node if there is a complete overwrite for this path. More specifically, if there is a write at
   * a higher path, this will return the child of that write relative to the write and this path.
   * Returns null if there is no write at this path.
   *
   * @param {!Path} path
   * @return {?Node}
   */
  shadowingWrite(path) {
    return this.writeTree_.shadowingWrite(this.treePath_.child(path));
  };

  /**
   * This method is used when processing child remove events on a query. If we can, we pull in children that were outside
   * the window, but may now be in the window
   *
   * @param {?Node} completeServerData
   * @param {!NamedNode} startPost
   * @param {!number} count
   * @param {boolean} reverse
   * @param {!Index} index
   * @return {!Array.<!NamedNode>}
   */
  calcIndexedSlice(completeServerData, startPost, count, reverse, index) {
    return this.writeTree_.calcIndexedSlice(this.treePath_, completeServerData, startPost, count, reverse, index);
  };

  /**
   * Returns a complete child for a given server snap after applying all user writes or null if there is no
   * complete child for this ChildKey.
   *
   * @param {!string} childKey
   * @param {!CacheNode} existingServerCache
   * @return {?Node}
   */
  calcCompleteChild(childKey, existingServerCache) {
    return this.writeTree_.calcCompleteChild(this.treePath_, childKey, existingServerCache);
  };

  /**
   * Return a WriteTreeRef for a child.
   *
   * @param {string} childName
   * @return {!WriteTreeRef}
   */
  child(childName) {
    return new WriteTreeRef(this.treePath_.child(childName), this.writeTree_);
  };
}
