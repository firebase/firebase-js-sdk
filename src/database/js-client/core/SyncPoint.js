/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
goog.provide('fb.core.SyncPoint');
goog.require('fb.core.util');
goog.require('fb.core.util.ImmutableTree');
goog.require('fb.core.view.ViewCache');
goog.require('fb.core.view.EventRegistration');
goog.require('fb.core.view.View');
goog.require('goog.array');

/**
 * SyncPoint represents a single location in a SyncTree with 1 or more event registrations, meaning we need to
 * maintain 1 or more Views at this location to cache server data and raise appropriate events for server changes
 * and user writes (set, transaction, update).
 *
 * It's responsible for:
 *  - Maintaining the set of 1 or more views necessary at this location (a SyncPoint with 0 views should be removed).
 *  - Proxying user / server operations to the views as appropriate (i.e. applyServerOverwrite,
 *    applyUserOverwrite, etc.)
 *
 * @constructor
 */
fb.core.SyncPoint = function() {
  /**
   * The Views being tracked at this location in the tree, stored as a map where the key is a
   * queryId and the value is the View for that query.
   *
   * NOTE: This list will be quite small (usually 1, but perhaps 2 or 3; any more is an odd use case).
   *
   * @type {!Object.<!string, !fb.core.view.View>}
   * @private
   */
  this.views_ = { };
};

/**
 * @return {boolean}
 */
fb.core.SyncPoint.prototype.isEmpty = function() {
  return goog.object.isEmpty(this.views_);
};

/**
 *
 * @param {!fb.core.Operation} operation
 * @param {!fb.core.WriteTreeRef} writesCache
 * @param {?fb.core.snap.Node} optCompleteServerCache
 * @return {!Array.<!fb.core.view.Event>}
 */
fb.core.SyncPoint.prototype.applyOperation = function(operation, writesCache, optCompleteServerCache) {
  var queryId = operation.source.queryId;
  if (queryId !== null) {
    var view = fb.util.obj.get(this.views_, queryId);
    fb.core.util.assert(view != null, 'SyncTree gave us an op for an invalid query.');
    return view.applyOperation(operation, writesCache, optCompleteServerCache);
  } else {
    var events = [];

    goog.object.forEach(this.views_, function(view) {
      events = events.concat(view.applyOperation(operation, writesCache, optCompleteServerCache));
    });

    return events;
  }
};

/**
 * Add an event callback for the specified query.
 *
 * @param {!fb.api.Query} query
 * @param {!fb.core.view.EventRegistration} eventRegistration
 * @param {!fb.core.WriteTreeRef} writesCache
 * @param {?fb.core.snap.Node} serverCache Complete server cache, if we have it.
 * @param {boolean} serverCacheComplete
 * @return {!Array.<!fb.core.view.Event>} Events to raise.
 */
fb.core.SyncPoint.prototype.addEventRegistration = function(query, eventRegistration, writesCache, serverCache,
                                                   serverCacheComplete) {
  var queryId = query.queryIdentifier();
  var view = fb.util.obj.get(this.views_, queryId);
  if (!view) {
    // TODO: make writesCache take flag for complete server node
    var eventCache = writesCache.calcCompleteEventCache(serverCacheComplete ? serverCache : null);
    var eventCacheComplete = false;
    if (eventCache) {
      eventCacheComplete = true;
    } else if (serverCache instanceof fb.core.snap.ChildrenNode) {
      eventCache = writesCache.calcCompleteEventChildren(serverCache);
      eventCacheComplete = false;
    } else {
      eventCache = fb.core.snap.EMPTY_NODE;
      eventCacheComplete = false;
    }
    var viewCache = new fb.core.view.ViewCache(
        new fb.core.view.CacheNode(/** @type {!fb.core.snap.Node} */ (eventCache), eventCacheComplete, false),
        new fb.core.view.CacheNode(/** @type {!fb.core.snap.Node} */ (serverCache), serverCacheComplete, false)
    );
    view = new fb.core.view.View(query, viewCache);
    this.views_[queryId] = view;
  }

  // This is guaranteed to exist now, we just created anything that was missing
  view.addEventRegistration(eventRegistration);
  return view.getInitialEvents(eventRegistration);
};

/**
 * Remove event callback(s).  Return cancelEvents if a cancelError is specified.
 *
 * If query is the default query, we'll check all views for the specified eventRegistration.
 * If eventRegistration is null, we'll remove all callbacks for the specified view(s).
 *
 * @param {!fb.api.Query} query
 * @param {?fb.core.view.EventRegistration} eventRegistration If null, remove all callbacks.
 * @param {Error=} cancelError If a cancelError is provided, appropriate cancel events will be returned.
 * @return {{removed:!Array.<!fb.api.Query>, events:!Array.<!fb.core.view.Event>}} removed queries and any cancel events
 */
fb.core.SyncPoint.prototype.removeEventRegistration = function(query, eventRegistration, cancelError) {
  var queryId = query.queryIdentifier();
  var removed = [];
  var cancelEvents = [];
  var hadCompleteView = this.hasCompleteView();
  if (queryId === 'default') {
    // When you do ref.off(...), we search all views for the registration to remove.
    var self = this;
    goog.object.forEach(this.views_, function(view, viewQueryId) {
      cancelEvents = cancelEvents.concat(view.removeEventRegistration(eventRegistration, cancelError));
      if (view.isEmpty()) {
        delete self.views_[viewQueryId];

        // We'll deal with complete views later.
        if (!view.getQuery().getQueryParams().loadsAllData()) {
          removed.push(view.getQuery());
        }
      }
    });
  } else {
    // remove the callback from the specific view.
    var view = fb.util.obj.get(this.views_, queryId);
    if (view) {
      cancelEvents = cancelEvents.concat(view.removeEventRegistration(eventRegistration, cancelError));
      if (view.isEmpty()) {
        delete this.views_[queryId];

        // We'll deal with complete views later.
        if (!view.getQuery().getQueryParams().loadsAllData()) {
          removed.push(view.getQuery());
        }
      }
    }
  }

  if (hadCompleteView && !this.hasCompleteView()) {
    // We removed our last complete view.
    removed.push(new Firebase(query.repo, query.path));
  }

  return {removed: removed, events: cancelEvents};
};

/**
 * @return {!Array.<!fb.core.view.View>}
 */
fb.core.SyncPoint.prototype.getQueryViews = function() {
  return goog.array.filter(goog.object.getValues(this.views_), function(view) {
    return !view.getQuery().getQueryParams().loadsAllData();
  });
};

/**
 *
 * @param {!fb.core.util.Path} path The path to the desired complete snapshot
 * @return {?fb.core.snap.Node} A complete cache, if it exists
 */
fb.core.SyncPoint.prototype.getCompleteServerCache = function(path) {
  var serverCache = null;
  goog.object.forEach(this.views_, function(view) {
    serverCache = serverCache || view.getCompleteServerCache(path);
  });
  return serverCache;
};

/**
 * @param {!fb.api.Query} query
 * @return {?fb.core.view.View}
 */
fb.core.SyncPoint.prototype.viewForQuery = function(query) {
  var params = query.getQueryParams();
  if (params.loadsAllData()) {
    return this.getCompleteView();
  } else {
    var queryId = query.queryIdentifier();
    return fb.util.obj.get(this.views_, queryId);
  }
};

/**
 * @param {!fb.api.Query} query
 * @return {boolean}
 */
fb.core.SyncPoint.prototype.viewExistsForQuery = function(query) {
  return this.viewForQuery(query) != null;
};

/**
 * @return {boolean}
 */
fb.core.SyncPoint.prototype.hasCompleteView = function() {
  return this.getCompleteView() != null;
};

/**
 * @return {?fb.core.view.View}
 */
fb.core.SyncPoint.prototype.getCompleteView = function() {
  var completeView = goog.object.findValue(this.views_, function(view) {
    return view.getQuery().getQueryParams().loadsAllData();
  });
  return completeView || null;
};
