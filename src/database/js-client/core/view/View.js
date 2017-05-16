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
goog.provide('fb.core.view.View');
goog.require('fb.core.view.EventGenerator');
goog.require('fb.core.view.ViewCache');
goog.require('fb.core.view.ViewProcessor');
goog.require('fb.core.util');

/**
 * A view represents a specific location and query that has 1 or more event registrations.
 *
 * It does several things:
 *  - Maintains the list of event registrations for this location/query.
 *  - Maintains a cache of the data visible for this location/query.
 *  - Applies new operations (via applyOperation), updates the cache, and based on the event
 *    registrations returns the set of events to be raised.
 *
 * @param {!fb.api.Query} query
 * @param {!fb.core.view.ViewCache} initialViewCache
 * @constructor
 */
fb.core.view.View = function(query, initialViewCache) {
  /**
   * @type {!fb.api.Query}
   * @private
   */
  this.query_ = query;
  var params = query.getQueryParams();

  var indexFilter = new fb.core.view.filter.IndexedFilter(params.getIndex());
  var filter = params.getNodeFilter();

  /**
   * @type {fb.core.view.ViewProcessor}
   * @private
   */
  this.processor_ = new fb.core.view.ViewProcessor(filter);

  var initialServerCache = initialViewCache.getServerCache();
  var initialEventCache = initialViewCache.getEventCache();

  // Don't filter server node with other filter than index, wait for tagged listen
  var serverSnap = indexFilter.updateFullNode(fb.core.snap.EMPTY_NODE, initialServerCache.getNode(), null);
  var eventSnap = filter.updateFullNode(fb.core.snap.EMPTY_NODE, initialEventCache.getNode(), null);
  var newServerCache = new fb.core.view.CacheNode(serverSnap, initialServerCache.isFullyInitialized(),
      indexFilter.filtersNodes());
  var newEventCache = new fb.core.view.CacheNode(eventSnap, initialEventCache.isFullyInitialized(),
      filter.filtersNodes());

  /**
   * @type {!fb.core.view.ViewCache}
   * @private
   */
  this.viewCache_ = new fb.core.view.ViewCache(newEventCache, newServerCache);

  /**
   * @type {!Array.<!fb.core.view.EventRegistration>}
   * @private
   */
  this.eventRegistrations_ = [];

  /**
   * @type {!fb.core.view.EventGenerator}
   * @private
   */
  this.eventGenerator_ = new fb.core.view.EventGenerator(query);
};

/**
 * @return {!fb.api.Query}
 */
fb.core.view.View.prototype.getQuery = function() {
  return this.query_;
};

/**
 * @return {?fb.core.snap.Node}
 */
fb.core.view.View.prototype.getServerCache = function() {
  return this.viewCache_.getServerCache().getNode();
};

/**
 * @param {!fb.core.util.Path} path
 * @return {?fb.core.snap.Node}
 */
fb.core.view.View.prototype.getCompleteServerCache = function(path) {
  var cache = this.viewCache_.getCompleteServerSnap();
  if (cache) {
    // If this isn't a "loadsAllData" view, then cache isn't actually a complete cache and
    // we need to see if it contains the child we're interested in.
    if (this.query_.getQueryParams().loadsAllData() ||
        (!path.isEmpty() && !cache.getImmediateChild(path.getFront()).isEmpty())) {
      return cache.getChild(path);
    }
  }
  return null;
};

/**
 * @return {boolean}
 */
fb.core.view.View.prototype.isEmpty = function() {
  return this.eventRegistrations_.length === 0;
};

/**
 * @param {!fb.core.view.EventRegistration} eventRegistration
 */
fb.core.view.View.prototype.addEventRegistration = function(eventRegistration) {
  this.eventRegistrations_.push(eventRegistration);
};

/**
 * @param {?fb.core.view.EventRegistration} eventRegistration If null, remove all callbacks.
 * @param {Error=} cancelError If a cancelError is provided, appropriate cancel events will be returned.
 * @return {!Array.<!fb.core.view.Event>} Cancel events, if cancelError was provided.
 */
fb.core.view.View.prototype.removeEventRegistration = function(eventRegistration, cancelError) {
  var cancelEvents = [];
  if (cancelError) {
    fb.core.util.assert(eventRegistration == null, 'A cancel should cancel all event registrations.');
    var path = this.query_.path;
    goog.array.forEach(this.eventRegistrations_, function(registration) {
      cancelError = /** @type {!Error} */ (cancelError);
      var maybeEvent = registration.createCancelEvent(cancelError, path);
      if (maybeEvent) {
        cancelEvents.push(maybeEvent);
      }
    });
  }

  if (eventRegistration) {
    var remaining = [];
    for (var i = 0; i < this.eventRegistrations_.length; ++i) {
      var existing = this.eventRegistrations_[i];
      if (!existing.matches(eventRegistration)) {
        remaining.push(existing);
      } else if (eventRegistration.hasAnyCallback()) {
        // We're removing just this one
        remaining = remaining.concat(this.eventRegistrations_.slice(i + 1));
        break;
      }
    }
    this.eventRegistrations_ = remaining;
  } else {
    this.eventRegistrations_ = [];
  }
  return cancelEvents;
};

/**
 * Applies the given Operation, updates our cache, and returns the appropriate events.
 *
 * @param {!fb.core.Operation} operation
 * @param {!fb.core.WriteTreeRef} writesCache
 * @param {?fb.core.snap.Node} optCompleteServerCache
 * @return {!Array.<!fb.core.view.Event>}
 */
fb.core.view.View.prototype.applyOperation = function(operation, writesCache, optCompleteServerCache) {
  if (operation.type === fb.core.OperationType.MERGE &&
      operation.source.queryId !== null) {

    fb.core.util.assert(this.viewCache_.getCompleteServerSnap(),
        'We should always have a full cache before handling merges');
    fb.core.util.assert(this.viewCache_.getCompleteEventSnap(),
        'Missing event cache, even though we have a server cache');
  }

  var oldViewCache = this.viewCache_;
  var result = this.processor_.applyOperation(oldViewCache, operation, writesCache, optCompleteServerCache);
  this.processor_.assertIndexed(result.viewCache);

  fb.core.util.assert(result.viewCache.getServerCache().isFullyInitialized() ||
      !oldViewCache.getServerCache().isFullyInitialized(),
      'Once a server snap is complete, it should never go back');

  this.viewCache_ = result.viewCache;

  return this.generateEventsForChanges_(result.changes, result.viewCache.getEventCache().getNode(), null);
};

/**
 * @param {!fb.core.view.EventRegistration} registration
 * @return {!Array.<!fb.core.view.Event>}
 */
fb.core.view.View.prototype.getInitialEvents = function(registration) {
  var eventSnap = this.viewCache_.getEventCache();
  var initialChanges = [];
  if (!eventSnap.getNode().isLeafNode()) {
    var eventNode = /** @type {!fb.core.snap.ChildrenNode} */ (eventSnap.getNode());
    eventNode.forEachChild(fb.core.snap.PriorityIndex, function(key, childNode) {
      initialChanges.push(fb.core.view.Change.childAddedChange(key, childNode));
    });
  }
  if (eventSnap.isFullyInitialized()) {
    initialChanges.push(fb.core.view.Change.valueChange(eventSnap.getNode()));
  }
  return this.generateEventsForChanges_(initialChanges, eventSnap.getNode(), registration);
};

/**
 * @private
 * @param {!Array.<!fb.core.view.Change>} changes
 * @param {!fb.core.snap.Node} eventCache
 * @param {fb.core.view.EventRegistration=} opt_eventRegistration
 * @return {!Array.<!fb.core.view.Event>}
 */
fb.core.view.View.prototype.generateEventsForChanges_ = function(changes, eventCache, opt_eventRegistration) {
  var registrations = opt_eventRegistration ? [opt_eventRegistration] : this.eventRegistrations_;
  return this.eventGenerator_.generateEventsForChanges(changes, eventCache, registrations);
};
