import { assert } from '../../utils/assert';
import { errorForServerCode } from "./util/util";
import { AckUserWrite } from "./operation/AckUserWrite";
import { ChildrenNode } from "./snap/ChildrenNode";
import { forEach } from "../../utils/obj";
import { ImmutableTree } from "./util/ImmutableTree";
import { ListenComplete } from "./operation/ListenComplete";
import { Merge } from "./operation/Merge";
import { OperationSource } from "./operation/Operation";
import { Overwrite } from "./operation/Overwrite";
import { Path } from "./util/Path";
import { SyncPoint } from "./SyncPoint";
import { WriteTree } from "./WriteTree";
import { Query } from "../api/Query";

/**
 * @typedef {{
 *   startListening: function(
 *     !Query,
 *     ?number,
 *     function():string,
 *     function(!string, *):!Array.<!Event>
 *   ):!Array.<!Event>,
 *
 *   stopListening: function(!Query, ?number)
 * }}
 */

/**
 * SyncTree is the central class for managing event callback registration, data caching, views
 * (query processing), and event generation.  There are typically two SyncTree instances for
 * each Repo, one for the normal Firebase data, and one for the .info data.
 *
 * It has a number of responsibilities, including:
 *  - Tracking all user event callbacks (registered via addEventRegistration() and removeEventRegistration()).
 *  - Applying and caching data changes for user set(), transaction(), and update() calls
 *    (applyUserOverwrite(), applyUserMerge()).
 *  - Applying and caching data changes for server data changes (applyServerOverwrite(),
 *    applyServerMerge()).
 *  - Generating user-facing events for server and user changes (all of the apply* methods
 *    return the set of events that need to be raised as a result).
 *  - Maintaining the appropriate set of server listens to ensure we are always subscribed
 *    to the correct set of paths and queries to satisfy the current set of user event
 *    callbacks (listens are started/stopped using the provided listenProvider).
 *
 * NOTE: Although SyncTree tracks event callbacks and calculates events to raise, the actual
 * events are returned to the caller rather than raised synchronously.
 *
 * @constructor
 * @param {!ListenProvider} listenProvider Used by SyncTree to start / stop listening
 *   to server data.
 */
export class SyncTree {
  /**
   * Tree of SyncPoints.  There's a SyncPoint at any location that has 1 or more views.
   * @type {!ImmutableTree.<!SyncPoint>}
   * @private
   */
  syncPointTree_;

  /**
   * A tree of all pending user writes (user-initiated set()'s, transaction()'s, update()'s, etc.).
   * @type {!WriteTree}
   * @private
   */
  pendingWriteTree_;
  tagToQueryMap_;
  queryToTagMap_;
  listenProvider_;

  constructor(listenProvider) {
    this.syncPointTree_ = ImmutableTree.Empty;
    this.pendingWriteTree_ = new WriteTree();
    this.tagToQueryMap_ = {};
    this.queryToTagMap_ = {};
    this.listenProvider_ = listenProvider;
  };

  /**
   * Apply the data changes for a user-generated set() or transaction() call.
   *
   * @param {!Path} path
   * @param {!Node} newData
   * @param {number} writeId
   * @param {boolean=} visible
   * @return {!Array.<!Event>} Events to raise.
   */
  applyUserOverwrite(path, newData, writeId, visible) {
    // Record pending write.
    this.pendingWriteTree_.addOverwrite(path, newData, writeId, visible);

    if (!visible) {
      return [];
    } else {
      return this.applyOperationToSyncPoints_(
          new Overwrite(OperationSource.User, path, newData));
    }
  };

  /**
   * Apply the data from a user-generated update() call
   *
   * @param {!Path} path
   * @param {!Object.<string, !Node>} changedChildren
   * @param {!number} writeId
   * @return {!Array.<!Event>} Events to raise.
   */
  applyUserMerge(path, changedChildren, writeId) {
    // Record pending merge.
    this.pendingWriteTree_.addMerge(path, changedChildren, writeId);

    var changeTree = ImmutableTree.fromObject(changedChildren);

    return this.applyOperationToSyncPoints_(
        new Merge(OperationSource.User, path, changeTree));
  };

  /**
   * Acknowledge a pending user write that was previously registered with applyUserOverwrite() or applyUserMerge().
   *
   * @param {!number} writeId
   * @param {boolean=} revert True if the given write failed and needs to be reverted
   * @return {!Array.<!Event>} Events to raise.
   */
  ackUserWrite(writeId, revert) {
    revert = revert || false;

    var write = this.pendingWriteTree_.getWrite(writeId);
    var needToReevaluate = this.pendingWriteTree_.removeWrite(writeId);
    if (!needToReevaluate) {
      return [];
    } else {
      var affectedTree = ImmutableTree.Empty;
      if (write.snap != null) { // overwrite
        affectedTree = affectedTree.set(Path.Empty, true);
      } else {
        forEach(write.children, function(pathString, node) {
          affectedTree = affectedTree.set(new Path(pathString), node);
        });
      }
      return this.applyOperationToSyncPoints_(new AckUserWrite(write.path, affectedTree, revert));
    }
  };

  /**
   * Apply new server data for the specified path..
   *
   * @param {!Path} path
   * @param {!Node} newData
   * @return {!Array.<!Event>} Events to raise.
   */
  applyServerOverwrite(path, newData) {
    return this.applyOperationToSyncPoints_(
        new Overwrite(OperationSource.Server, path, newData));
  };

  /**
   * Apply new server data to be merged in at the specified path.
   *
   * @param {!Path} path
   * @param {!Object.<string, !Node>} changedChildren
   * @return {!Array.<!Event>} Events to raise.
   */
  applyServerMerge(path, changedChildren) {
    var changeTree = ImmutableTree.fromObject(changedChildren);

    return this.applyOperationToSyncPoints_(
        new Merge(OperationSource.Server, path, changeTree));
  };

  /**
   * Apply a listen complete for a query
   *
   * @param {!Path} path
   * @return {!Array.<!Event>} Events to raise.
   */
  applyListenComplete(path) {
    return this.applyOperationToSyncPoints_(
        new ListenComplete(OperationSource.Server, path));
  };

  /**
   * Apply new server data for the specified tagged query.
   *
   * @param {!Path} path
   * @param {!Node} snap
   * @param {!number} tag
   * @return {!Array.<!Event>} Events to raise.
   */
  applyTaggedQueryOverwrite(path, snap, tag) {
    var queryKey = this.queryKeyForTag_(tag);
    if (queryKey != null) {
      var r = this.parseQueryKey_(queryKey);
      var queryPath = r.path, queryId = r.queryId;
      var relativePath = Path.relativePath(queryPath, path);
      var op = new Overwrite(OperationSource.forServerTaggedQuery(queryId),
          relativePath, snap);
      return this.applyTaggedOperation_(queryPath, queryId, op);
    } else {
      // Query must have been removed already
      return [];
    }
  };

  /**
   * Apply server data to be merged in for the specified tagged query.
   *
   * @param {!Path} path
   * @param {!Object.<string, !Node>} changedChildren
   * @param {!number} tag
   * @return {!Array.<!Event>} Events to raise.
   */
  applyTaggedQueryMerge(path, changedChildren, tag) {
    var queryKey = this.queryKeyForTag_(tag);
    if (queryKey) {
      var r = this.parseQueryKey_(queryKey);
      var queryPath = r.path, queryId = r.queryId;
      var relativePath = Path.relativePath(queryPath, path);
      var changeTree = ImmutableTree.fromObject(changedChildren);
      var op = new Merge(OperationSource.forServerTaggedQuery(queryId),
          relativePath, changeTree);
      return this.applyTaggedOperation_(queryPath, queryId, op);
    } else {
      // We've already removed the query. No big deal, ignore the update
      return [];
    }
  };

  /**
   * Apply a listen complete for a tagged query
   *
   * @param {!Path} path
   * @param {!number} tag
   * @return {!Array.<!Event>} Events to raise.
   */
  applyTaggedListenComplete(path, tag) {
    var queryKey = this.queryKeyForTag_(tag);
    if (queryKey) {
      var r = this.parseQueryKey_(queryKey);
      var queryPath = r.path, queryId = r.queryId;
      var relativePath = Path.relativePath(queryPath, path);
      var op = new ListenComplete(OperationSource.forServerTaggedQuery(queryId),
          relativePath);
      return this.applyTaggedOperation_(queryPath, queryId, op);
    } else {
      // We've already removed the query. No big deal, ignore the update
      return [];
    }
  };

  /**
   * Add an event callback for the specified query.
   *
   * @param {!Query} query
   * @param {!EventRegistration} eventRegistration
   * @return {!Array.<!Event>} Events to raise.
   */
  addEventRegistration(query, eventRegistration) {
    var path = query.path;

    var serverCache = null;
    var foundAncestorDefaultView = false;
    // Any covering writes will necessarily be at the root, so really all we need to find is the server cache.
    // Consider optimizing this once there's a better understanding of what actual behavior will be.
    this.syncPointTree_.foreachOnPath(path, function(pathToSyncPoint, sp) {
      var relativePath = Path.relativePath(pathToSyncPoint, path);
      serverCache = serverCache || sp.getCompleteServerCache(relativePath);
      foundAncestorDefaultView = foundAncestorDefaultView || sp.hasCompleteView();
    });
    var syncPoint = this.syncPointTree_.get(path);
    if (!syncPoint) {
      syncPoint = new SyncPoint();
      this.syncPointTree_ = this.syncPointTree_.set(path, syncPoint);
    } else {
      foundAncestorDefaultView = foundAncestorDefaultView || syncPoint.hasCompleteView();
      serverCache = serverCache || syncPoint.getCompleteServerCache(Path.Empty);
    }

    var serverCacheComplete;
    if (serverCache != null) {
      serverCacheComplete = true;
    } else {
      serverCacheComplete = false;
      serverCache = ChildrenNode.EMPTY_NODE;
      var subtree = this.syncPointTree_.subtree(path);
      subtree.foreachChild(function(childName, childSyncPoint) {
        var completeCache = childSyncPoint.getCompleteServerCache(Path.Empty);
        if (completeCache) {
          serverCache = serverCache.updateImmediateChild(childName, completeCache);
        }
      });
    }

    var viewAlreadyExists = syncPoint.viewExistsForQuery(query);
    if (!viewAlreadyExists && !query.getQueryParams().loadsAllData()) {
      // We need to track a tag for this query
      var queryKey = this.makeQueryKey_(query);
      assert(!(queryKey in this.queryToTagMap_),
        'View does not exist, but we have a tag');
      var tag = SyncTree.getNextQueryTag_();
      this.queryToTagMap_[queryKey] = tag;
      // Coerce to string to avoid sparse arrays.
      this.tagToQueryMap_['_' + tag] = queryKey;
    }
    var writesCache = this.pendingWriteTree_.childWrites(path);
    var events = syncPoint.addEventRegistration(query, eventRegistration, writesCache, serverCache, serverCacheComplete);
    if (!viewAlreadyExists && !foundAncestorDefaultView) {
      var view = /** @type !View */ (syncPoint.viewForQuery(query));
      events = events.concat(this.setupListener_(query, view));
    }
    return events;
  };

  /**
   * Remove event callback(s).
   *
   * If query is the default query, we'll check all queries for the specified eventRegistration.
   * If eventRegistration is null, we'll remove all callbacks for the specified query/queries.
   *
   * @param {!Query} query
   * @param {?EventRegistration} eventRegistration If null, all callbacks are removed.
   * @param {Error=} cancelError If a cancelError is provided, appropriate cancel events will be returned.
   * @return {!Array.<!Event>} Cancel events, if cancelError was provided.
   */
  removeEventRegistration(query, eventRegistration, cancelError?) {
    // Find the syncPoint first. Then deal with whether or not it has matching listeners
    var path = query.path;
    var maybeSyncPoint = this.syncPointTree_.get(path);
    var cancelEvents = [];
    // A removal on a default query affects all queries at that location. A removal on an indexed query, even one without
    // other query constraints, does *not* affect all queries at that location. So this check must be for 'default', and
    // not loadsAllData().
    if (maybeSyncPoint && (query.queryIdentifier() === 'default' || maybeSyncPoint.viewExistsForQuery(query))) {
      /**
       * @type {{removed: !Array.<!Query>, events: !Array.<!Event>}}
       */
      var removedAndEvents = maybeSyncPoint.removeEventRegistration(query, eventRegistration, cancelError);
      if (maybeSyncPoint.isEmpty()) {
        this.syncPointTree_ = this.syncPointTree_.remove(path);
      }
      var removed = removedAndEvents.removed;
      cancelEvents = removedAndEvents.events;
      // We may have just removed one of many listeners and can short-circuit this whole process
      // We may also not have removed a default listener, in which case all of the descendant listeners should already be
      // properly set up.
      //
      // Since indexed queries can shadow if they don't have other query constraints, check for loadsAllData(), instead of
      // queryId === 'default'
      var removingDefault = -1 !== removed.findIndex(function(query) {
        return query.getQueryParams().loadsAllData();
      });
      var covered = this.syncPointTree_.findOnPath(path, function(relativePath, parentSyncPoint) {
        return parentSyncPoint.hasCompleteView();
      });

      if (removingDefault && !covered) {
        var subtree = this.syncPointTree_.subtree(path);
        // There are potentially child listeners. Determine what if any listens we need to send before executing the
        // removal
        if (!subtree.isEmpty()) {
          // We need to fold over our subtree and collect the listeners to send
          var newViews = this.collectDistinctViewsForSubTree_(subtree);

          // Ok, we've collected all the listens we need. Set them up.
          for (var i = 0; i < newViews.length; ++i) {
            var view = newViews[i], newQuery = view.getQuery();
            var listener = this.createListenerForView_(view);
            this.listenProvider_.startListening(this.queryForListening_(newQuery), this.tagForQuery_(newQuery),
                listener.hashFn, listener.onComplete);
          }
        } else {
          // There's nothing below us, so nothing we need to start listening on
        }
      }
      // If we removed anything and we're not covered by a higher up listen, we need to stop listening on this query
      // The above block has us covered in terms of making sure we're set up on listens lower in the tree.
      // Also, note that if we have a cancelError, it's already been removed at the provider level.
      if (!covered && removed.length > 0 && !cancelError) {
        // If we removed a default, then we weren't listening on any of the other queries here. Just cancel the one
        // default. Otherwise, we need to iterate through and cancel each individual query
        if (removingDefault) {
          // We don't tag default listeners
          var defaultTag = null;
          this.listenProvider_.stopListening(this.queryForListening_(query), defaultTag);
        } else {
          var self = this;
          removed.forEach(function(queryToRemove) {
            var queryIdToRemove = queryToRemove.queryIdentifier();
            var tagToRemove = self.queryToTagMap_[self.makeQueryKey_(queryToRemove)];
            self.listenProvider_.stopListening(self.queryForListening_(queryToRemove), tagToRemove);
          });
        }
      }
      // Now, clear all of the tags we're tracking for the removed listens
      this.removeTags_(removed);
    } else {
      // No-op, this listener must've been already removed
    }
    return cancelEvents;
  };

  /**
   * Returns a complete cache, if we have one, of the data at a particular path. The location must have a listener above
   * it, but as this is only used by transaction code, that should always be the case anyways.
   *
   * Note: this method will *include* hidden writes from transaction with applyLocally set to false.
   * @param {!Path} path The path to the data we want
   * @param {Array.<number>=} writeIdsToExclude A specific set to be excluded
   * @return {?Node}
   */
  calcCompleteEventCache(path, writeIdsToExclude) {
    var includeHiddenSets = true;
    var writeTree = this.pendingWriteTree_;
    var serverCache = this.syncPointTree_.findOnPath(path, function(pathSoFar, syncPoint) {
      var relativePath = Path.relativePath(pathSoFar, path);
      var serverCache = syncPoint.getCompleteServerCache(relativePath);
      if (serverCache) {
        return serverCache;
      }
    });
    return writeTree.calcCompleteEventCache(path, serverCache, writeIdsToExclude, includeHiddenSets);
  };

  /**
   * This collapses multiple unfiltered views into a single view, since we only need a single
   * listener for them.
   *
   * @param {!ImmutableTree.<!SyncPoint>} subtree
   * @return {!Array.<!View>}
   * @private
   */
  collectDistinctViewsForSubTree_(subtree) {
    return subtree.fold(function(relativePath, maybeChildSyncPoint, childMap) {
      if (maybeChildSyncPoint && maybeChildSyncPoint.hasCompleteView()) {
        var completeView = maybeChildSyncPoint.getCompleteView();
        return [completeView];
      } else {
        // No complete view here, flatten any deeper listens into an array
        var views = [];
        if (maybeChildSyncPoint) {
          views = maybeChildSyncPoint.getQueryViews();
        }
        forEach(childMap, function(key, childViews) {
          views = views.concat(childViews);
        });
        return views;
      }
    });
  };

  /**
   * @param {!Array.<!Query>} queries
   * @private
   */
  removeTags_(queries) {
    for (var j = 0; j < queries.length; ++j) {
      var removedQuery = queries[j];
      if (!removedQuery.getQueryParams().loadsAllData()) {
        // We should have a tag for this
        var removedQueryKey = this.makeQueryKey_(removedQuery);
        var removedQueryTag = this.queryToTagMap_[removedQueryKey];
        delete this.queryToTagMap_[removedQueryKey];
        delete this.tagToQueryMap_['_' + removedQueryTag];
      }
    }
  };


  /**
   * Normalizes a query to a query we send the server for listening
   * @param {!Query} query
   * @return {!Query} The normalized query
   * @private
   */
  queryForListening_(query: Query) {
    if (query.getQueryParams().loadsAllData() && !query.getQueryParams().isDefault()) {
      // We treat queries that load all data as default queries
      // Cast is necessary because ref() technically returns Firebase which is actually fb.api.Firebase which inherits
      // from Query
      return /** @type {!Query} */(query.getRef());
    } else {
      return query;
    }
  };


  /**
   * For a given new listen, manage the de-duplication of outstanding subscriptions.
   *
   * @param {!Query} query
   * @param {!View} view
   * @return {!Array.<!Event>} This method can return events to support synchronous data sources
   * @private
   */
  setupListener_(query, view) {
    var path = query.path;
    var tag = this.tagForQuery_(query);
    var listener = this.createListenerForView_(view);

    var events = this.listenProvider_.startListening(this.queryForListening_(query), tag, listener.hashFn,
        listener.onComplete);

    var subtree = this.syncPointTree_.subtree(path);
    // The root of this subtree has our query. We're here because we definitely need to send a listen for that, but we
    // may need to shadow other listens as well.
    if (tag) {
      assert(!subtree.value.hasCompleteView(), "If we're adding a query, it shouldn't be shadowed");
    } else {
      // Shadow everything at or below this location, this is a default listener.
      var queriesToStop = subtree.fold(function(relativePath, maybeChildSyncPoint, childMap) {
        if (!relativePath.isEmpty() && maybeChildSyncPoint && maybeChildSyncPoint.hasCompleteView()) {
          return [maybeChildSyncPoint.getCompleteView().getQuery()];
        } else {
          // No default listener here, flatten any deeper queries into an array
          var queries = [];
          if (maybeChildSyncPoint) {
            queries = queries.concat(
                maybeChildSyncPoint.getQueryViews().map(function(view) {
                  return view.getQuery();
                })
            );
          }
          forEach(childMap, function(key, childQueries) {
            queries = queries.concat(childQueries);
          });
          return queries;
        }
      });
      for (var i = 0; i < queriesToStop.length; ++i) {
        var queryToStop = queriesToStop[i];
        this.listenProvider_.stopListening(this.queryForListening_(queryToStop), this.tagForQuery_(queryToStop));
      }
    }
    return events;
  };

  /**
   *
   * @param {!View} view
   * @return {{hashFn: function(), onComplete: function(!string, *)}}
   * @private
   */
  createListenerForView_(view) {
    var self = this;
    var query = view.getQuery();
    var tag = this.tagForQuery_(query);

    return {
      hashFn: function() {
        var cache = view.getServerCache() || ChildrenNode.EMPTY_NODE;
        return cache.hash();
      },
      onComplete: function(status, data) {
        if (status === 'ok') {
          if (tag) {
            return self.applyTaggedListenComplete(query.path, tag);
          } else {
            return self.applyListenComplete(query.path);
          }
        } else {
          // If a listen failed, kill all of the listeners here, not just the one that triggered the error.
          // Note that this may need to be scoped to just this listener if we change permissions on filtered children
          var error = errorForServerCode(status, query);
          return self.removeEventRegistration(query, /*eventRegistration*/null, error);
        }
      }
    };
  };

  /**
   * Given a query, computes a "queryKey" suitable for use in our queryToTagMap_.
   * @private
   * @param {!Query} query
   * @return {string}
   */
  makeQueryKey_(query) {
    return query.path.toString() + '$' + query.queryIdentifier();
  };

  /**
   * Given a queryKey (created by makeQueryKey), parse it back into a path and queryId.
   * @private
   * @param {!string} queryKey
   * @return {{queryId: !string, path: !Path}}
   */
  parseQueryKey_(queryKey) {
    var splitIndex = queryKey.indexOf('$');
    assert(splitIndex !== -1 && splitIndex < queryKey.length - 1, 'Bad queryKey.');
    return {
      queryId: queryKey.substr(splitIndex + 1),
      path: new Path(queryKey.substr(0, splitIndex))
    };
  };

  /**
   * Return the query associated with the given tag, if we have one
   * @param {!number} tag
   * @return {?string}
   * @private
   */
  queryKeyForTag_(tag) {
    return this.tagToQueryMap_['_' + tag];
  };

  /**
   * Return the tag associated with the given query.
   * @param {!Query} query
   * @return {?number}
   * @private
   */
  tagForQuery_(query) {
    var queryKey = this.makeQueryKey_(query);
    return this.queryToTagMap_[queryKey];
  };

  /**
   * Static tracker for next query tag.
   * @type {number}
   * @private
   */
  static nextQueryTag_ = 1;

  /**
   * Static accessor for query tags.
   * @return {number}
   * @private
   */
  static getNextQueryTag_ = function() {
    return SyncTree.nextQueryTag_++;
  };

  /**
   * A helper method to apply tagged operations
   *
   * @param {!Path} queryPath
   * @param {!string} queryId
   * @param {!Operation} operation
   * @return {!Array.<!Event>}
   * @private
   */
  applyTaggedOperation_(queryPath, queryId, operation) {
      var syncPoint = this.syncPointTree_.get(queryPath);
      assert(syncPoint, "Missing sync point for query tag that we're tracking");
      var writesCache = this.pendingWriteTree_.childWrites(queryPath);
      return syncPoint.applyOperation(operation, writesCache, /*serverCache=*/null);
  }

  /**
   * A helper method that visits all descendant and ancestor SyncPoints, applying the operation.
   *
   * NOTES:
   * - Descendant SyncPoints will be visited first (since we raise events depth-first).

  * - We call applyOperation() on each SyncPoint passing three things:
  *   1. A version of the Operation that has been made relative to the SyncPoint location.
  *   2. A WriteTreeRef of any writes we have cached at the SyncPoint location.
  *   3. A snapshot Node with cached server data, if we have it.

  * - We concatenate all of the events returned by each SyncPoint and return the result.
  *
  * @param {!Operation} operation
  * @return {!Array.<!Event>}
  * @private
  */
  applyOperationToSyncPoints_(operation) {
    return this.applyOperationHelper_(operation, this.syncPointTree_, /*serverCache=*/ null,
        this.pendingWriteTree_.childWrites(Path.Empty));

  };

  /**
   * Recursive helper for applyOperationToSyncPoints_
   *
   * @private
   * @param {!Operation} operation
   * @param {ImmutableTree.<!SyncPoint>} syncPointTree
   * @param {?Node} serverCache
   * @param {!WriteTreeRef} writesCache
   * @return {!Array.<!Event>}
   */
  applyOperationHelper_(operation, syncPointTree, serverCache, writesCache) {

    if (operation.path.isEmpty()) {
      return this.applyOperationDescendantsHelper_(operation, syncPointTree, serverCache, writesCache);
    } else {
      var syncPoint = syncPointTree.get(Path.Empty);

      // If we don't have cached server data, see if we can get it from this SyncPoint.
      if (serverCache == null && syncPoint != null) {
        serverCache = syncPoint.getCompleteServerCache(Path.Empty);
      }

      var events = [];
      var childName = operation.path.getFront();
      var childOperation = operation.operationForChild(childName);
      var childTree = syncPointTree.children.get(childName);
      if (childTree && childOperation) {
        var childServerCache = serverCache ? serverCache.getImmediateChild(childName) : null;
        var childWritesCache = writesCache.child(childName);
        events = events.concat(
            this.applyOperationHelper_(childOperation, childTree, childServerCache, childWritesCache));
      }

      if (syncPoint) {
        events = events.concat(syncPoint.applyOperation(operation, writesCache, serverCache));
      }

      return events;
    }
  };

  /**
   * Recursive helper for applyOperationToSyncPoints_
   *
   * @private
   * @param {!Operation} operation
   * @param {ImmutableTree.<!SyncPoint>} syncPointTree
   * @param {?Node} serverCache
   * @param {!WriteTreeRef} writesCache
   * @return {!Array.<!Event>}
   */
  applyOperationDescendantsHelper_(operation, syncPointTree,
                                                                        serverCache, writesCache) {
    var syncPoint = syncPointTree.get(Path.Empty);

    // If we don't have cached server data, see if we can get it from this SyncPoint.
    if (serverCache == null && syncPoint != null) {
      serverCache = syncPoint.getCompleteServerCache(Path.Empty);
    }

    var events = [];
    var self = this;
    syncPointTree.children.inorderTraversal(function(childName, childTree) {
      var childServerCache = serverCache ? serverCache.getImmediateChild(childName) : null;
      var childWritesCache = writesCache.child(childName);
      var childOperation = operation.operationForChild(childName);
      if (childOperation) {
        events = events.concat(
            self.applyOperationDescendantsHelper_(childOperation, childTree, childServerCache, childWritesCache));
      }
    });

    if (syncPoint) {
      events = events.concat(syncPoint.applyOperation(operation, writesCache, serverCache));
    }

    return events;
  };
}
