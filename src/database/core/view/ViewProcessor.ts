import { OperationType } from "../operation/Operation";
import { assert, assertionError } from "../../../utils/assert";
import { ChildChangeAccumulator } from "./ChildChangeAccumulator";
import { Change } from "./Change";
import { ChildrenNode } from "../snap/ChildrenNode";
import { KEY_INDEX } from "../snap/indexes/KeyIndex";
import { ImmutableTree } from "../util/ImmutableTree";
import { Path } from "../util/Path";
import { WriteTreeCompleteChildSource, NO_COMPLETE_CHILD_SOURCE } from "./CompleteChildSource";

/**
 * @param {!ViewCache} viewCache
 * @param {!Array.<!Change>} changes
 * @constructor
 * @struct
 */
export class ProcessorResult {
  /**
   * @const
   * @type {!ViewCache}
   */
  viewCache;

  /**
   * @const
   * @type {!Array.<!Change>}
   */
  changes;

  constructor(viewCache, changes) {
    this.viewCache = viewCache;
    this.changes = changes;
  };
}

/**
 * @param {!NodeFilter} filter
 * @constructor
 */
export class ViewProcessor {
  /**
   * @type {!NodeFilter}
   * @private
   * @const
   */
  private filter_;
  constructor(filter) {
    this.filter_ = filter;
  };

  /**
   * @param {!ViewCache} viewCache
   */
  assertIndexed(viewCache) {
    assert(viewCache.getEventCache().getNode().isIndexed(this.filter_.getIndex()), 'Event snap not indexed');
    assert(viewCache.getServerCache().getNode().isIndexed(this.filter_.getIndex()),
        'Server snap not indexed');
  };

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!fb.core.Operation} operation
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} optCompleteCache
   * @return {!ProcessorResult}
   */
  applyOperation(oldViewCache, operation, writesCache, optCompleteCache) {
    var accumulator = new ChildChangeAccumulator();
    var newViewCache, filterServerNode;
    if (operation.type === OperationType.OVERWRITE) {
      var overwrite = /** @type {!fb.core.operation.Overwrite} */ (operation);
      if (overwrite.source.fromUser) {
        newViewCache = this.applyUserOverwrite_(oldViewCache, overwrite.path, overwrite.snap,
            writesCache, optCompleteCache, accumulator);
      } else {
        assert(overwrite.source.fromServer, 'Unknown source.');
        // We filter the node if it's a tagged update or the node has been previously filtered  and the
        // update is not at the root in which case it is ok (and necessary) to mark the node unfiltered
        // again
        filterServerNode = overwrite.source.tagged ||
            (oldViewCache.getServerCache().isFiltered() && !overwrite.path.isEmpty());
        newViewCache = this.applyServerOverwrite_(oldViewCache, overwrite.path, overwrite.snap, writesCache,
            optCompleteCache, filterServerNode, accumulator);
      }
    } else if (operation.type === OperationType.MERGE) {
      var merge = /** @type {!fb.core.operation.Merge} */ (operation);
      if (merge.source.fromUser) {
        newViewCache = this.applyUserMerge_(oldViewCache, merge.path, merge.children, writesCache,
            optCompleteCache, accumulator);
      } else {
        assert(merge.source.fromServer, 'Unknown source.');
        // We filter the node if it's a tagged update or the node has been previously filtered
        filterServerNode = merge.source.tagged || oldViewCache.getServerCache().isFiltered();
        newViewCache = this.applyServerMerge_(oldViewCache, merge.path, merge.children, writesCache, optCompleteCache,
            filterServerNode, accumulator);
      }
    } else if (operation.type === OperationType.ACK_USER_WRITE) {
      var ackUserWrite = /** @type {!fb.core.operation.AckUserWrite} */ (operation);
      if (!ackUserWrite.revert) {
        newViewCache = this.ackUserWrite_(oldViewCache, ackUserWrite.path, ackUserWrite.affectedTree, writesCache,
            optCompleteCache, accumulator);
      } else {
        newViewCache = this.revertUserWrite_(oldViewCache, ackUserWrite.path, writesCache, optCompleteCache, accumulator);
      }
    } else if (operation.type === OperationType.LISTEN_COMPLETE) {
      newViewCache = this.listenComplete_(oldViewCache, operation.path, writesCache, optCompleteCache, accumulator);
    } else {
      throw assertionError('Unknown operation type: ' + operation.type);
    }
    var changes = accumulator.getChanges();
    this.maybeAddValueEvent_(oldViewCache, newViewCache, changes);
    return new ProcessorResult(newViewCache, changes);
  };

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!ViewCache} newViewCache
   * @param {!Array.<!Change>} accumulator
   * @private
   */
  maybeAddValueEvent_(oldViewCache, newViewCache, accumulator) {
    var eventSnap = newViewCache.getEventCache();
    if (eventSnap.isFullyInitialized()) {
      var isLeafOrEmpty = eventSnap.getNode().isLeafNode() || eventSnap.getNode().isEmpty();
      var oldCompleteSnap = oldViewCache.getCompleteEventSnap();
      if (accumulator.length > 0 ||
          !oldViewCache.getEventCache().isFullyInitialized() ||
          (isLeafOrEmpty && !eventSnap.getNode().equals(/** @type {!fb.core.snap.Node} */ (oldCompleteSnap))) ||
          !eventSnap.getNode().getPriority().equals(oldCompleteSnap.getPriority())) {
        accumulator.push(Change.valueChange(
            /** @type {!fb.core.snap.Node} */ (newViewCache.getCompleteEventSnap())));
      }
    }
  };

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} changePath
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {!fb.core.view.CompleteChildSource} source
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  generateEventCacheAfterServerEvent_(viewCache, changePath, writesCache, source, accumulator) {
    var oldEventSnap = viewCache.getEventCache();
    if (writesCache.shadowingWrite(changePath) != null) {
      // we have a shadowing write, ignore changes
      return viewCache;
    } else {
      var newEventCache, serverNode;
      if (changePath.isEmpty()) {
        // TODO: figure out how this plays with "sliding ack windows"
        assert(viewCache.getServerCache().isFullyInitialized(),
            'If change path is empty, we must have complete server data');
        if (viewCache.getServerCache().isFiltered()) {
          // We need to special case this, because we need to only apply writes to complete children, or
          // we might end up raising events for incomplete children. If the server data is filtered deep
          // writes cannot be guaranteed to be complete
          var serverCache = viewCache.getCompleteServerSnap();
          var completeChildren = (serverCache instanceof ChildrenNode) ? serverCache :
              ChildrenNode.EMPTY_NODE;
          var completeEventChildren = writesCache.calcCompleteEventChildren(completeChildren);
          newEventCache = this.filter_.updateFullNode(viewCache.getEventCache().getNode(), completeEventChildren,
              accumulator);
        } else {
          var completeNode = /** @type {!fb.core.snap.Node} */
              (writesCache.calcCompleteEventCache(viewCache.getCompleteServerSnap()));
          newEventCache = this.filter_.updateFullNode(viewCache.getEventCache().getNode(), completeNode, accumulator);
        }
      } else {
        var childKey = changePath.getFront();
        if (childKey == '.priority') {
          assert(changePath.getLength() == 1, "Can't have a priority with additional path components");
          var oldEventNode = oldEventSnap.getNode();
          serverNode = viewCache.getServerCache().getNode();
          // we might have overwrites for this priority
          var updatedPriority = writesCache.calcEventCacheAfterServerOverwrite(changePath, oldEventNode, serverNode);
          if (updatedPriority != null) {
            newEventCache = this.filter_.updatePriority(oldEventNode, updatedPriority);
          } else {
            // priority didn't change, keep old node
            newEventCache = oldEventSnap.getNode();
          }
        } else {
          var childChangePath = changePath.popFront();
          // update child
          var newEventChild;
          if (oldEventSnap.isCompleteForChild(childKey)) {
            serverNode = viewCache.getServerCache().getNode();
            var eventChildUpdate = writesCache.calcEventCacheAfterServerOverwrite(changePath, oldEventSnap.getNode(),
                serverNode);
            if (eventChildUpdate != null) {
              newEventChild = oldEventSnap.getNode().getImmediateChild(childKey).updateChild(childChangePath,
                  eventChildUpdate);
            } else {
              // Nothing changed, just keep the old child
              newEventChild = oldEventSnap.getNode().getImmediateChild(childKey);
            }
          } else {
            newEventChild = writesCache.calcCompleteChild(childKey, viewCache.getServerCache());
          }
          if (newEventChild != null) {
            newEventCache = this.filter_.updateChild(oldEventSnap.getNode(), childKey, newEventChild, childChangePath,
                source, accumulator);
          } else {
            // no complete child available or no change
            newEventCache = oldEventSnap.getNode();
          }
        }
      }
      return viewCache.updateEventSnap(newEventCache, oldEventSnap.isFullyInitialized() || changePath.isEmpty(),
          this.filter_.filtersNodes());
    }
  };

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!Path} changePath
   * @param {!fb.core.snap.Node} changedSnap
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} optCompleteCache
   * @param {boolean} filterServerNode
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  applyServerOverwrite_(oldViewCache, changePath, changedSnap,
                                                                        writesCache, optCompleteCache, filterServerNode,
                                                                        accumulator) {
    var oldServerSnap = oldViewCache.getServerCache();
    var newServerCache;
    var serverFilter = filterServerNode ? this.filter_ : this.filter_.getIndexedFilter();
    if (changePath.isEmpty()) {
      newServerCache = serverFilter.updateFullNode(oldServerSnap.getNode(), changedSnap, null);
    } else if (serverFilter.filtersNodes() && !oldServerSnap.isFiltered()) {
      // we want to filter the server node, but we didn't filter the server node yet, so simulate a full update
      var newServerNode = oldServerSnap.getNode().updateChild(changePath, changedSnap);
      newServerCache = serverFilter.updateFullNode(oldServerSnap.getNode(), newServerNode, null);
    } else {
      var childKey = changePath.getFront();
      if (!oldServerSnap.isCompleteForPath(changePath) && changePath.getLength() > 1) {
        // We don't update incomplete nodes with updates intended for other listeners
        return oldViewCache;
      }
      var childChangePath = changePath.popFront();
      var childNode = oldServerSnap.getNode().getImmediateChild(childKey);
      var newChildNode = childNode.updateChild(childChangePath, changedSnap);
      if (childKey == '.priority') {
        newServerCache = serverFilter.updatePriority(oldServerSnap.getNode(), newChildNode);
      } else {
        newServerCache = serverFilter.updateChild(oldServerSnap.getNode(), childKey, newChildNode, childChangePath,
            NO_COMPLETE_CHILD_SOURCE, null);
      }
    }
    var newViewCache = oldViewCache.updateServerSnap(newServerCache,
        oldServerSnap.isFullyInitialized() || changePath.isEmpty(), serverFilter.filtersNodes());
    var source = new WriteTreeCompleteChildSource(writesCache, newViewCache, optCompleteCache);
    return this.generateEventCacheAfterServerEvent_(newViewCache, changePath, writesCache, source, accumulator);
  };

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!Path} changePath
   * @param {!fb.core.snap.Node} changedSnap
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} optCompleteCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  applyUserOverwrite_(oldViewCache, changePath, changedSnap, writesCache,
                                                                      optCompleteCache, accumulator) {
    var oldEventSnap = oldViewCache.getEventCache();
    var newViewCache, newEventCache;
    var source = new WriteTreeCompleteChildSource(writesCache, oldViewCache, optCompleteCache);
    if (changePath.isEmpty()) {
      newEventCache = this.filter_.updateFullNode(oldViewCache.getEventCache().getNode(), changedSnap, accumulator);
      newViewCache = oldViewCache.updateEventSnap(newEventCache, true, this.filter_.filtersNodes());
    } else {
      var childKey = changePath.getFront();
      if (childKey === '.priority') {
        newEventCache = this.filter_.updatePriority(oldViewCache.getEventCache().getNode(), changedSnap);
        newViewCache = oldViewCache.updateEventSnap(newEventCache, oldEventSnap.isFullyInitialized(),
            oldEventSnap.isFiltered());
      } else {
        var childChangePath = changePath.popFront();
        var oldChild = oldEventSnap.getNode().getImmediateChild(childKey);
        var newChild;
        if (childChangePath.isEmpty()) {
          // Child overwrite, we can replace the child
          newChild = changedSnap;
        } else {
          var childNode = source.getCompleteChild(childKey);
          if (childNode != null) {
            if (childChangePath.getBack() === '.priority' &&
                childNode.getChild(/** @type {!Path} */ (childChangePath.parent())).isEmpty()) {
              // This is a priority update on an empty node. If this node exists on the server, the
              // server will send down the priority in the update, so ignore for now
              newChild = childNode;
            } else {
              newChild = childNode.updateChild(childChangePath, changedSnap);
            }
          } else {
            // There is no complete child node available
            newChild = ChildrenNode.EMPTY_NODE;
          }
        }
        if (!oldChild.equals(newChild)) {
          var newEventSnap = this.filter_.updateChild(oldEventSnap.getNode(), childKey, newChild, childChangePath,
              source, accumulator);
          newViewCache = oldViewCache.updateEventSnap(newEventSnap, oldEventSnap.isFullyInitialized(),
              this.filter_.filtersNodes());
        } else {
          newViewCache = oldViewCache;
        }
      }
    }
    return newViewCache;
  };

  /**
   * @param {!ViewCache} viewCache
   * @param {string} childKey
   * @return {boolean}
   * @private
   */
  static cacheHasChild_(viewCache, childKey) {
    return viewCache.getEventCache().isCompleteForChild(childKey);
  };

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {ImmutableTree.<!fb.core.snap.Node>} changedChildren
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} serverCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  applyUserMerge_(viewCache, path, changedChildren, writesCache,
                                                                  serverCache, accumulator) {
    // HACK: In the case of a limit query, there may be some changes that bump things out of the
    // window leaving room for new items.  It's important we process these changes first, so we
    // iterate the changes twice, first processing any that affect items currently in view.
    // TODO: I consider an item "in view" if cacheHasChild is true, which checks both the server
    // and event snap.  I'm not sure if this will result in edge cases when a child is in one but
    // not the other.
    var self = this;
    var curViewCache = viewCache;
    changedChildren.foreach(function(relativePath, childNode) {
      var writePath = path.child(relativePath);
      if (ViewProcessor.cacheHasChild_(viewCache, writePath.getFront())) {
        curViewCache = self.applyUserOverwrite_(curViewCache, writePath, childNode, writesCache,
            serverCache, accumulator);
      }
    });

    changedChildren.foreach(function(relativePath, childNode) {
      var writePath = path.child(relativePath);
      if (!ViewProcessor.cacheHasChild_(viewCache, writePath.getFront())) {
        curViewCache = self.applyUserOverwrite_(curViewCache, writePath, childNode, writesCache,
            serverCache, accumulator);
      }
    });

    return curViewCache;
  };

  /**
   * @param {!fb.core.snap.Node} node
   * @param {ImmutableTree.<!fb.core.snap.Node>} merge
   * @return {!fb.core.snap.Node}
   * @private
   */
  applyMerge_(node, merge) {
    merge.foreach(function(relativePath, childNode) {
      node = node.updateChild(relativePath, childNode);
    });
    return node;
  };

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {!ImmutableTree.<!fb.core.snap.Node>} changedChildren
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} serverCache
   * @param {boolean} filterServerNode
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  applyServerMerge_(viewCache, path, changedChildren, writesCache, serverCache, filterServerNode, accumulator) {
    // If we don't have a cache yet, this merge was intended for a previously listen in the same location. Ignore it and
    // wait for the complete data update coming soon.
    if (viewCache.getServerCache().getNode().isEmpty() && !viewCache.getServerCache().isFullyInitialized()) {
      return viewCache;
    }

    // HACK: In the case of a limit query, there may be some changes that bump things out of the
    // window leaving room for new items.  It's important we process these changes first, so we
    // iterate the changes twice, first processing any that affect items currently in view.
    // TODO: I consider an item "in view" if cacheHasChild is true, which checks both the server
    // and event snap.  I'm not sure if this will result in edge cases when a child is in one but
    // not the other.
    var curViewCache = viewCache;
    var viewMergeTree;
    if (path.isEmpty()) {
      viewMergeTree = changedChildren;
    } else {
      viewMergeTree = ImmutableTree.Empty.setTree(path, changedChildren);
    }
    var serverNode = viewCache.getServerCache().getNode();
    var self = this;
    viewMergeTree.children.inorderTraversal(function(childKey, childTree) {
      if (serverNode.hasChild(childKey)) {
        var serverChild = viewCache.getServerCache().getNode().getImmediateChild(childKey);
        var newChild = self.applyMerge_(serverChild, childTree);
        curViewCache = self.applyServerOverwrite_(curViewCache, new Path(childKey), newChild,
            writesCache, serverCache, filterServerNode, accumulator);
      }
    });
    viewMergeTree.children.inorderTraversal(function(childKey, childMergeTree) {
      var isUnknownDeepMerge = !viewCache.getServerCache().isCompleteForChild(childKey) && childMergeTree.value == null;
      if (!serverNode.hasChild(childKey) && !isUnknownDeepMerge) {
        var serverChild = viewCache.getServerCache().getNode().getImmediateChild(childKey);
        var newChild = self.applyMerge_(serverChild, childMergeTree);
        curViewCache = self.applyServerOverwrite_(curViewCache, new Path(childKey), newChild, writesCache,
            serverCache, filterServerNode, accumulator);
      }
    });

    return curViewCache;
  };

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} ackPath
   * @param {!ImmutableTree<!boolean>} affectedTree
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} optCompleteCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  ackUserWrite_(viewCache, ackPath, affectedTree, writesCache,
                                                                optCompleteCache, accumulator) {
    if (writesCache.shadowingWrite(ackPath) != null) {
      return viewCache;
    }

    // Only filter server node if it is currently filtered
    var filterServerNode = viewCache.getServerCache().isFiltered();

    // Essentially we'll just get our existing server cache for the affected paths and re-apply it as a server update
    // now that it won't be shadowed.
    var serverCache = viewCache.getServerCache();
    if (affectedTree.value != null) {
      // This is an overwrite.
      if ((ackPath.isEmpty() && serverCache.isFullyInitialized()) || serverCache.isCompleteForPath(ackPath)) {
        return this.applyServerOverwrite_(viewCache, ackPath, serverCache.getNode().getChild(ackPath),
            writesCache, optCompleteCache, filterServerNode, accumulator);
      } else if (ackPath.isEmpty()) {
        // This is a goofy edge case where we are acking data at this location but don't have full data.  We
        // should just re-apply whatever we have in our cache as a merge.
        var changedChildren = /** @type {ImmutableTree<!fb.core.snap.Node>} */
            (ImmutableTree.Empty);
        serverCache.getNode().forEachChild(KEY_INDEX, function(name, node) {
          changedChildren = changedChildren.set(new Path(name), node);
        });
        return this.applyServerMerge_(viewCache, ackPath, changedChildren, writesCache, optCompleteCache,
            filterServerNode, accumulator);
      } else {
        return viewCache;
      }
    } else {
      // This is a merge.
      var changedChildren = /** @type {ImmutableTree<!fb.core.snap.Node>} */
          (ImmutableTree.Empty);
      affectedTree.foreach(function(mergePath, value) {
        var serverCachePath = ackPath.child(mergePath);
        if (serverCache.isCompleteForPath(serverCachePath)) {
          changedChildren = changedChildren.set(mergePath, serverCache.getNode().getChild(serverCachePath));
        }
      });
      return this.applyServerMerge_(viewCache, ackPath, changedChildren, writesCache, optCompleteCache,
          filterServerNode, accumulator);
    }
  };

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} optCompleteServerCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  revertUserWrite_(viewCache, path, writesCache, optCompleteServerCache,
                                                                  accumulator) {
    var complete;
    if (writesCache.shadowingWrite(path) != null) {
      return viewCache;
    } else {
      var source = new WriteTreeCompleteChildSource(writesCache, viewCache, optCompleteServerCache);
      var oldEventCache = viewCache.getEventCache().getNode();
      var newEventCache;
      if (path.isEmpty() || path.getFront() === '.priority') {
        var newNode;
        if (viewCache.getServerCache().isFullyInitialized()) {
          newNode = writesCache.calcCompleteEventCache(viewCache.getCompleteServerSnap());
        } else {
          var serverChildren = viewCache.getServerCache().getNode();
          assert(serverChildren instanceof ChildrenNode,
              'serverChildren would be complete if leaf node');
          newNode = writesCache.calcCompleteEventChildren(/** @type {!ChildrenNode} */ (serverChildren));
        }
        newNode = /** @type {!fb.core.snap.Node} newNode */ (newNode);
        newEventCache = this.filter_.updateFullNode(oldEventCache, newNode, accumulator);
      } else {
        var childKey = path.getFront();
        var newChild = writesCache.calcCompleteChild(childKey, viewCache.getServerCache());
        if (newChild == null && viewCache.getServerCache().isCompleteForChild(childKey)) {
          newChild = oldEventCache.getImmediateChild(childKey);
        }
        if (newChild != null) {
          newEventCache = this.filter_.updateChild(oldEventCache, childKey, newChild, path.popFront(), source,
              accumulator);
        } else if (viewCache.getEventCache().getNode().hasChild(childKey)) {
          // No complete child available, delete the existing one, if any
          newEventCache = this.filter_.updateChild(oldEventCache, childKey, ChildrenNode.EMPTY_NODE, path.popFront(),
              source, accumulator);
        } else {
          newEventCache = oldEventCache;
        }
        if (newEventCache.isEmpty() && viewCache.getServerCache().isFullyInitialized()) {
          // We might have reverted all child writes. Maybe the old event was a leaf node
          complete = writesCache.calcCompleteEventCache(viewCache.getCompleteServerSnap());
          if (complete.isLeafNode()) {
            newEventCache = this.filter_.updateFullNode(newEventCache, complete, accumulator);
          }
        }
      }
      complete = viewCache.getServerCache().isFullyInitialized() ||
          writesCache.shadowingWrite(Path.Empty) != null;
      return viewCache.updateEventSnap(newEventCache, complete, this.filter_.filtersNodes());
    }
  };

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {!fb.core.WriteTreeRef} writesCache
   * @param {?fb.core.snap.Node} serverCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  listenComplete_(viewCache, path, writesCache, serverCache,
      accumulator) {
    var oldServerNode = viewCache.getServerCache();
    var newViewCache = viewCache.updateServerSnap(oldServerNode.getNode(),
        oldServerNode.isFullyInitialized() || path.isEmpty(), oldServerNode.isFiltered());
    return this.generateEventCacheAfterServerEvent_(newViewCache, path, writesCache,
        NO_COMPLETE_CHILD_SOURCE, accumulator);
  };
}

