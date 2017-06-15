import { CacheNode } from "./view/CacheNode";
import { ChildrenNode } from "./snap/ChildrenNode";
import { assert } from "../../utils/assert";
import { isEmpty, forEach, findValue, safeGet } from "../../utils/obj";
import { ViewCache } from "./view/ViewCache";
import { View } from "./view/View";

let __referenceConstructor;

/**
 * SyncPoint represents a single location in a SyncTree with 1 or more event registrations, meaning we need to
 * maintain 1 or more Views at this location to cache server data and raise appropriate events for server changes
 * and user writes (set, transaction, update).
 *
 * It's responsible for:
 *  - Maintaining the set of 1 or more views necessary at this location (a SyncPoint with 0 views should be removed).
 *  - Proxying user / server operations to the views as appropriate (i.e. applyServerOverwrite,
 *    applyUserOverwrite, etc.)
 */
export class SyncPoint {
  static set __referenceConstructor(val) {
    assert(!__referenceConstructor, '__referenceConstructor has already been defined');    
    __referenceConstructor = val;
  }
  static get __referenceConstructor() {
    assert(__referenceConstructor, 'Reference.ts has not been loaded');
    return __referenceConstructor;
  }

  views_: object;
  constructor() {
    /**
     * The Views being tracked at this location in the tree, stored as a map where the key is a
     * queryId and the value is the View for that query.
     *
     * NOTE: This list will be quite small (usually 1, but perhaps 2 or 3; any more is an odd use case).
     *
     * @type {!Object.<!string, !View>}
     * @private
     */
    this.views_ = { };
  };
  /**
   * @return {boolean}
   */
  isEmpty() {
    return isEmpty(this.views_);
  };

  /**
   *
   * @param {!Operation} operation
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} optCompleteServerCache
   * @return {!Array.<!Event>}
   */
  applyOperation(operation, writesCache, optCompleteServerCache) {
    var queryId = operation.source.queryId;
    if (queryId !== null) {
      var view = safeGet(this.views_, queryId);
      assert(view != null, 'SyncTree gave us an op for an invalid query.');
      return view.applyOperation(operation, writesCache, optCompleteServerCache);
    } else {
      var events = [];

      forEach(this.views_, function(key, view) {
        events = events.concat(view.applyOperation(operation, writesCache, optCompleteServerCache));
      });

      return events;
    }
  };

  /**
   * Add an event callback for the specified query.
   *
   * @param {!Query} query
   * @param {!EventRegistration} eventRegistration
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} serverCache Complete server cache, if we have it.
   * @param {boolean} serverCacheComplete
   * @return {!Array.<!Event>} Events to raise.
   */
  addEventRegistration(query, eventRegistration, writesCache, serverCache, serverCacheComplete) {
    var queryId = query.queryIdentifier();
    var view = safeGet(this.views_, queryId);
    if (!view) {
      // TODO: make writesCache take flag for complete server node
      var eventCache = writesCache.calcCompleteEventCache(serverCacheComplete ? serverCache : null);
      var eventCacheComplete = false;
      if (eventCache) {
        eventCacheComplete = true;
      } else if (serverCache instanceof ChildrenNode) {
        eventCache = writesCache.calcCompleteEventChildren(serverCache);
        eventCacheComplete = false;
      } else {
        eventCache = ChildrenNode.EMPTY_NODE;
        eventCacheComplete = false;
      }
      var viewCache = new ViewCache(
          new CacheNode(/** @type {!Node} */ (eventCache), eventCacheComplete, false),
          new CacheNode(/** @type {!Node} */ (serverCache), serverCacheComplete, false)
      );
      view = new View(query, viewCache);
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
   * @param {!Query} query
   * @param {?EventRegistration} eventRegistration If null, remove all callbacks.
   * @param {Error=} cancelError If a cancelError is provided, appropriate cancel events will be returned.
   * @return {{removed:!Array.<!Query>, events:!Array.<!Event>}} removed queries and any cancel events
   */
  removeEventRegistration(query, eventRegistration, cancelError) {
    var queryId = query.queryIdentifier();
    var removed = [];
    var cancelEvents = [];
    var hadCompleteView = this.hasCompleteView();
    if (queryId === 'default') {
      // When you do ref.off(...), we search all views for the registration to remove.
      var self = this;
      forEach(this.views_, function(viewQueryId, view) {
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
      var view = safeGet(this.views_, queryId);
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
      removed.push(new SyncPoint.__referenceConstructor(query.repo, query.path));
    }

    return {removed: removed, events: cancelEvents};
  };

  /**
   * @return {!Array.<!View>}
   */
  getQueryViews() {
    const values = Object.keys(this.views_)
      .map(key => this.views_[key]);
    return values.filter(function(view) {
      return !view.getQuery().getQueryParams().loadsAllData();
    });
  };

  /**
   *
   * @param {!Path} path The path to the desired complete snapshot
   * @return {?Node} A complete cache, if it exists
   */
  getCompleteServerCache(path) {
    var serverCache = null;
    forEach(this.views_, (key, view) => {
      serverCache = serverCache || view.getCompleteServerCache(path);
    });
    return serverCache;
  };

  /**
   * @param {!Query} query
   * @return {?View}
   */
  viewForQuery(query) {
    var params = query.getQueryParams();
    if (params.loadsAllData()) {
      return this.getCompleteView();
    } else {
      var queryId = query.queryIdentifier();
      return safeGet(this.views_, queryId);
    }
  };

  /**
   * @param {!Query} query
   * @return {boolean}
   */
  viewExistsForQuery(query) {
    return this.viewForQuery(query) != null;
  };

  /**
   * @return {boolean}
   */
  hasCompleteView() {
    return this.getCompleteView() != null;
  };

  /**
   * @return {?View}
   */
  getCompleteView() {
    var completeView = findValue(this.views_, function(view) {
      return view.getQuery().getQueryParams().loadsAllData();
    });
    return completeView || null;
  };
}
