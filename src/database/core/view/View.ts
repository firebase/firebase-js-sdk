import { IndexedFilter } from "./filter/IndexedFilter";
import { ViewProcessor } from "./ViewProcessor";
import { ChildrenNode } from "../snap/ChildrenNode";
import { CacheNode } from "./CacheNode";
import { ViewCache } from "./ViewCache";
import { EventGenerator } from "./EventGenerator";
import { assert } from "../../../utils/assert";
import { OperationType } from "../operation/Operation";
import { Change } from "./Change";
import { PriorityIndex } from "../snap/IndexFactory";

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
 * @param {!ViewCache} initialViewCache
 * @constructor
 */
export const View = function(query, initialViewCache) {
  /**
   * @type {!fb.api.Query}
   * @private
   */
  this.query_ = query;
  var params = query.getQueryParams();

  var indexFilter = new IndexedFilter(params.getIndex());
  var filter = params.getNodeFilter();

  /**
   * @type {ViewProcessor}
   * @private
   */
  this.processor_ = new ViewProcessor(filter);

  var initialServerCache = initialViewCache.getServerCache();
  var initialEventCache = initialViewCache.getEventCache();

  // Don't filter server node with other filter than index, wait for tagged listen
  var serverSnap = indexFilter.updateFullNode(ChildrenNode.EMPTY_NODE, initialServerCache.getNode(), null);
  var eventSnap = filter.updateFullNode(ChildrenNode.EMPTY_NODE, initialEventCache.getNode(), null);
  var newServerCache = new CacheNode(serverSnap, initialServerCache.isFullyInitialized(),
      indexFilter.filtersNodes());
  var newEventCache = new CacheNode(eventSnap, initialEventCache.isFullyInitialized(),
      filter.filtersNodes());

  /**
   * @type {!ViewCache}
   * @private
   */
  this.viewCache_ = new ViewCache(newEventCache, newServerCache);

  /**
   * @type {!Array.<!fb.core.view.EventRegistration>}
   * @private
   */
  this.eventRegistrations_ = [];

  /**
   * @type {!EventGenerator}
   * @private
   */
  this.eventGenerator_ = new EventGenerator(query);
};

/**
 * @return {!fb.api.Query}
 */
View.prototype.getQuery = function() {
  return this.query_;
};

/**
 * @return {?fb.core.snap.Node}
 */
View.prototype.getServerCache = function() {
  return this.viewCache_.getServerCache().getNode();
};

/**
 * @param {!Path} path
 * @return {?fb.core.snap.Node}
 */
View.prototype.getCompleteServerCache = function(path) {
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
View.prototype.isEmpty = function() {
  return this.eventRegistrations_.length === 0;
};

/**
 * @param {!fb.core.view.EventRegistration} eventRegistration
 */
View.prototype.addEventRegistration = function(eventRegistration) {
  this.eventRegistrations_.push(eventRegistration);
};

/**
 * @param {?fb.core.view.EventRegistration} eventRegistration If null, remove all callbacks.
 * @param {Error=} cancelError If a cancelError is provided, appropriate cancel events will be returned.
 * @return {!Array.<!fb.core.view.Event>} Cancel events, if cancelError was provided.
 */
View.prototype.removeEventRegistration = function(eventRegistration, cancelError) {
  var cancelEvents = [];
  if (cancelError) {
    assert(eventRegistration == null, 'A cancel should cancel all event registrations.');
    var path = this.query_.path;
    this.eventRegistrations_.forEach(function(registration) {
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
View.prototype.applyOperation = function(operation, writesCache, optCompleteServerCache) {
  if (operation.type === OperationType.MERGE &&
      operation.source.queryId !== null) {

    assert(this.viewCache_.getCompleteServerSnap(),
        'We should always have a full cache before handling merges');
    assert(this.viewCache_.getCompleteEventSnap(),
        'Missing event cache, even though we have a server cache');
  }

  var oldViewCache = this.viewCache_;
  var result = this.processor_.applyOperation(oldViewCache, operation, writesCache, optCompleteServerCache);
  this.processor_.assertIndexed(result.viewCache);

  assert(result.viewCache.getServerCache().isFullyInitialized() ||
      !oldViewCache.getServerCache().isFullyInitialized(),
      'Once a server snap is complete, it should never go back');

  this.viewCache_ = result.viewCache;

  return this.generateEventsForChanges_(result.changes, result.viewCache.getEventCache().getNode(), null);
};

/**
 * @param {!fb.core.view.EventRegistration} registration
 * @return {!Array.<!fb.core.view.Event>}
 */
View.prototype.getInitialEvents = function(registration) {
  var eventSnap = this.viewCache_.getEventCache();
  var initialChanges = [];
  if (!eventSnap.getNode().isLeafNode()) {
    var eventNode = /** @type {!fb.core.snap.ChildrenNode} */ (eventSnap.getNode());
    eventNode.forEachChild(PriorityIndex, function(key, childNode) {
      initialChanges.push(Change.childAddedChange(key, childNode));
    });
  }
  if (eventSnap.isFullyInitialized()) {
    initialChanges.push(Change.valueChange(eventSnap.getNode()));
  }
  return this.generateEventsForChanges_(initialChanges, eventSnap.getNode(), registration);
};

/**
 * @private
 * @param {!Array.<!Change>} changes
 * @param {!fb.core.snap.Node} eventCache
 * @param {fb.core.view.EventRegistration=} opt_eventRegistration
 * @return {!Array.<!fb.core.view.Event>}
 */
View.prototype.generateEventsForChanges_ = function(changes, eventCache, opt_eventRegistration) {
  var registrations = opt_eventRegistration ? [opt_eventRegistration] : this.eventRegistrations_;
  return this.eventGenerator_.generateEventsForChanges(changes, eventCache, registrations);
};
