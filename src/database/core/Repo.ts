import { 
  generateWithValues,
  resolveDeferredValueSnapshot,
  resolveDeferredValueTree
} from "./util/ServerValues";
import { nodeFromJSON } from "./snap/nodeFromJSON";
import { Path } from "./util/Path";
import { SparseSnapshotTree } from "./SparseSnapshotTree";
import { SyncTree } from "./SyncTree";
import { SnapshotHolder } from "./SnapshotHolder";
import { stringify } from "../../utils/json";
import { beingCrawled, each, exceptionGuard, warn, log } from "./util/util";
import { map, forEach } from "../../utils/obj";
import { AuthTokenProvider } from "./AuthTokenProvider";
import { StatsManager } from "./stats/StatsManager";
import { StatsReporter } from "./stats/StatsReporter";
import { StatsListener } from "./stats/StatsListener";
import { EventQueue } from "./view/EventQueue";
import { PersistentConnection } from "./PersistentConnection";
import { ReadonlyRestClient } from "./ReadonlyRestClient";
import { FirebaseApp } from "../../app/firebase_app";
import { RepoInfo } from "./RepoInfo";

var INTERRUPT_REASON = 'repo_interrupt';

/**
 * A connection to a single data repository.
 */
export class Repo {
  repoInfo_;
  stats_;
  statsListener_;
  eventQueue_;
  nextWriteId_;
  persistentConnection_ : PersistentConnection | null;
  server_;
  statsReporter_;
  transactions_init_;
  infoData_;
  infoSyncTree_;
  onDisconnect_;
  abortTransactions_;
  rerunTransactions_;

  /** @type {!Database} */
  database;
  dataUpdateCount;
  interceptServerDataCallback_;
  serverSyncTree_;
  
  /**
   * @param {!RepoInfo} repoInfo
   * @param {boolean} forceRestClient
   * @param {!FirebaseApp} app
   */
  constructor(repoInfo: RepoInfo, forceRestClient: boolean, public app: FirebaseApp) {
    /** @type {!AuthTokenProvider} */
    var authTokenProvider = new AuthTokenProvider(app);

    this.repoInfo_ = repoInfo;
    this.stats_ = StatsManager.getCollection(repoInfo);
    /** @type {StatsListener} */
    this.statsListener_ = null;
    this.eventQueue_ = new EventQueue();
    this.nextWriteId_ = 1;

    /**
     * TODO: This should be @private but it's used by test_access.js and internal.js
     * @type {?PersistentConnection}
     */
    this.persistentConnection_ = null;

    /**
     * @private {!ServerActions}
     */
    this.server_;

    if (forceRestClient || beingCrawled()) {
      this.server_ = new ReadonlyRestClient(this.repoInfo_,
        this.onDataUpdate_.bind(this),
        authTokenProvider);

      // Minor hack: Fire onConnect immediately, since there's no actual connection.
      setTimeout(this.onConnectStatus_.bind(this, true), 0);
    } else {
      var authOverride = app.options['databaseAuthVariableOverride'];
      // Validate authOverride
      if (typeof authOverride !== 'undefined' && authOverride !== null) {
        if (authOverride !== 'object') {
          throw new Error('Only objects are supported for option databaseAuthVariableOverride');
        }
        try {
          stringify(authOverride);
        } catch (e) {
          throw new Error('Invalid authOverride provided: ' + e);
        }
      }

      this.persistentConnection_ = new PersistentConnection(this.repoInfo_,
        this.onDataUpdate_.bind(this),
        this.onConnectStatus_.bind(this),
        this.onServerInfoUpdate_.bind(this),
        authTokenProvider,
        authOverride);

      this.server_ = this.persistentConnection_;
    }
    var self = this;
    authTokenProvider.addTokenChangeListener(function(token) {
      self.server_.refreshAuthToken(token);
    });

    // In the case of multiple Repos for the same repoInfo (i.e. there are multiple Firebase.Contexts being used),
    // we only want to create one StatsReporter.  As such, we'll report stats over the first Repo created.
    this.statsReporter_ = StatsManager.getOrCreateReporter(repoInfo,
      function() { return new StatsReporter(this.stats_, this.server_); }.bind(this));

    this.transactions_init_();

    // Used for .info.
    this.infoData_ = new SnapshotHolder();
    this.infoSyncTree_ = new SyncTree({
      startListening(query, tag, currentHashFn, onComplete) {
        var infoEvents = [];
        var node = self.infoData_.getNode(query.path);
        // This is possibly a hack, but we have different semantics for .info endpoints. We don't raise null events
        // on initial data...
        if (!node.isEmpty()) {
          infoEvents = self.infoSyncTree_.applyServerOverwrite(query.path, node);
          setTimeout(function() {
            onComplete('ok');
          }, 0);
        }
        return infoEvents;
      },
      stopListening: () => {}
    });
    this.updateInfo_('connected', false);

    // A list of data pieces and paths to be set when this client disconnects.
    this.onDisconnect_ = new SparseSnapshotTree();

    this.dataUpdateCount = 0;

    this.interceptServerDataCallback_ = null;

    this.serverSyncTree_ = new SyncTree({
      startListening(query, tag, currentHashFn, onComplete) {
        self.server_.listen(query, currentHashFn, tag, function(status, data) {
          var events = onComplete(status, data);
          self.eventQueue_.raiseEventsForChangedPath(query.path, events);
        });
        // No synchronous events for network-backed sync trees
        return [];
      },
      stopListening(query, tag) {
        self.server_.unlisten(query, tag);
      }
    });
  }

  /**
   * @return {string}  The URL corresponding to the root of this Firebase.
   */
  toString() {
    return (this.repoInfo_.secure ? 'https://' : 'http://') + this.repoInfo_.host;
  }

  /**
   * @return {!string} The namespace represented by the repo.
   */
  name() {
    return this.repoInfo_.namespace;
  }

  /**
   * @return {!number} The time in milliseconds, taking the server offset into account if we have one.
   */
  serverTime() {
    var offsetNode = this.infoData_.getNode(new Path('.info/serverTimeOffset'));
    var offset = /** @type {number} */ (offsetNode.val()) || 0;
    return new Date().getTime() + offset;
  }

  /**
   * Generate ServerValues using some variables from the repo object.
   * @return {!Object}
   */
  generateServerValues() {
    return generateWithValues({
      'timestamp': this.serverTime()
    });
  }

  /**
   * Called by realtime when we get new messages from the server.
   *
   * @private
   * @param {string} pathString
   * @param {*} data
   * @param {boolean} isMerge
   * @param {?number} tag
   */
  onDataUpdate_(pathString, data, isMerge, tag) {
    // For testing.
    this.dataUpdateCount++;
    var path = new Path(pathString);
    data = this.interceptServerDataCallback_ ? this.interceptServerDataCallback_(pathString, data) : data;
    var events = [];
    if (tag) {
      if (isMerge) {
        var taggedChildren = map(/**@type {!Object.<string, *>} */ (data), function(raw) {
          return nodeFromJSON(raw);
        });
        events = this.serverSyncTree_.applyTaggedQueryMerge(path, taggedChildren, tag);
      } else {
        var taggedSnap = nodeFromJSON(data);
        events = this.serverSyncTree_.applyTaggedQueryOverwrite(path, taggedSnap, tag);
      }
    } else if (isMerge) {
      var changedChildren = map(/**@type {!Object.<string, *>} */ (data), function(raw) {
        return nodeFromJSON(raw);
      });
      events = this.serverSyncTree_.applyServerMerge(path, changedChildren);
    } else {
      var snap = nodeFromJSON(data);
      events = this.serverSyncTree_.applyServerOverwrite(path, snap);
    }
    var affectedPath = path;
    if (events.length > 0) {
      // Since we have a listener outstanding for each transaction, receiving any events
      // is a proxy for some change having occurred.
      affectedPath = this.rerunTransactions_(path);
    }
    this.eventQueue_.raiseEventsForChangedPath(affectedPath, events);
  }

  /**
   * @param {?function(!string, *):*} callback
   * @private
   */
  interceptServerData_(callback) {
    this.interceptServerDataCallback_ = callback;
  }

  /**
   * @param {!boolean} connectStatus
   * @private
   */
  onConnectStatus_(connectStatus) {
    this.updateInfo_('connected', connectStatus);
    if (connectStatus === false) {
      this.runOnDisconnectEvents_();
    }
  }

  /**
   * @param {!Object} updates
   * @private
   */
  onServerInfoUpdate_(updates) {
    var self = this;
    each(updates, function(value, key) {
      self.updateInfo_(key, value);
    });
  }

  /**
   *
   * @param {!string} pathString
   * @param {*} value
   * @private
   */
  updateInfo_(pathString, value) {
    var path = new Path('/.info/' + pathString);
    var newNode = nodeFromJSON(value);
    this.infoData_.updateSnapshot(path, newNode);
    var events = this.infoSyncTree_.applyServerOverwrite(path, newNode);
    this.eventQueue_.raiseEventsForChangedPath(path, events);
  }

  /**
   * @return {!number}
   * @private
   */
  getNextWriteId_() {
    return this.nextWriteId_++;
  }

  /**
   * @param {!Path} path
   * @param {*} newVal
   * @param {number|string|null} newPriority
   * @param {?function(?Error, *=)} onComplete
   */
  setWithPriority(path, newVal, newPriority, onComplete) {
    this.log_('set', {path: path.toString(), value: newVal, priority: newPriority});

    // TODO: Optimize this behavior to either (a) store flag to skip resolving where possible and / or
    // (b) store unresolved paths on JSON parse
    var serverValues = this.generateServerValues();
    var newNodeUnresolved = nodeFromJSON(newVal, newPriority);
    var newNode = resolveDeferredValueSnapshot(newNodeUnresolved, serverValues);

    var writeId = this.getNextWriteId_();
    var events = this.serverSyncTree_.applyUserOverwrite(path, newNode, writeId, true);
    this.eventQueue_.queueEvents(events);
    var self = this;
    this.server_.put(path.toString(), newNodeUnresolved.val(/*export=*/true), function(status, errorReason) {
      var success = status === 'ok';
      if (!success) {
        warn('set at ' + path + ' failed: ' + status);
      }

      var clearEvents = self.serverSyncTree_.ackUserWrite(writeId, !success);
      self.eventQueue_.raiseEventsForChangedPath(path, clearEvents);
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
    var affectedPath = this.abortTransactions_(path);
    this.rerunTransactions_(affectedPath);
    // We queued the events above, so just flush the queue here
    this.eventQueue_.raiseEventsForChangedPath(affectedPath, []);
  }

  /**
   * @param {!Path} path
   * @param {!Object} childrenToMerge
   * @param {?function(?Error, *=)} onComplete
   */
  update(path, childrenToMerge, onComplete) {
    this.log_('update', {path: path.toString(), value: childrenToMerge});

    // Start with our existing data and merge each child into it.
    var empty = true;
    var serverValues = this.generateServerValues();
    var changedChildren = {};
    forEach(childrenToMerge, function(changedValue, changedKey) {
      empty = false;
      var newNodeUnresolved = nodeFromJSON(changedValue);
      changedChildren[changedKey] =
        resolveDeferredValueSnapshot(newNodeUnresolved, serverValues);
    });

    if (!empty) {
      var writeId = this.getNextWriteId_();
      var events = this.serverSyncTree_.applyUserMerge(path, changedChildren, writeId);
      this.eventQueue_.queueEvents(events);
      var self = this;
      this.server_.merge(path.toString(), childrenToMerge, function(status, errorReason) {
        var success = status === 'ok';
        if (!success) {
          warn('update at ' + path + ' failed: ' + status);
        }

        var clearEvents = self.serverSyncTree_.ackUserWrite(writeId, !success);
        var affectedPath = path;
        if (clearEvents.length > 0) {
          affectedPath = self.rerunTransactions_(path);
        }
        self.eventQueue_.raiseEventsForChangedPath(affectedPath, clearEvents);
        self.callOnCompleteCallback(onComplete, status, errorReason);
      });

      forEach(childrenToMerge, function(changedValue, changedPath) {
        var affectedPath = self.abortTransactions_(path.child(changedPath));
        self.rerunTransactions_(affectedPath);
      });

      // We queued the events above, so just flush the queue here
      this.eventQueue_.raiseEventsForChangedPath(path, []);
    } else {
      log('update() called with empty data.  Don\'t do anything.');
      this.callOnCompleteCallback(onComplete, 'ok');
    }
  }

  /**
   * Applies all of the changes stored up in the onDisconnect_ tree.
   * @private
   */
  runOnDisconnectEvents_() {
    this.log_('onDisconnectEvents');
    var self = this;

    var serverValues = this.generateServerValues();
    var resolvedOnDisconnectTree = resolveDeferredValueTree(this.onDisconnect_, serverValues);
    var events = [];

    resolvedOnDisconnectTree.forEachTree(Path.Empty, function(path, snap) {
      events = events.concat(self.serverSyncTree_.applyServerOverwrite(path, snap));
      var affectedPath = self.abortTransactions_(path);
      self.rerunTransactions_(affectedPath);
    });

    this.onDisconnect_ = new SparseSnapshotTree();
    this.eventQueue_.raiseEventsForChangedPath(Path.Empty, events);
  }

  /**
   * @param {!Path} path
   * @param {?function(?Error)} onComplete
   */
  onDisconnectCancel(path, onComplete) {
    var self = this;
    this.server_.onDisconnectCancel(path.toString(), function(status, errorReason) {
      if (status === 'ok') {
        self.onDisconnect_.forget(path);
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  }

  onDisconnectSet(path, value, onComplete) {
    var self = this;
    var newNode = nodeFromJSON(value);
    this.server_.onDisconnectPut(path.toString(), newNode.val(/*export=*/true), function(status, errorReason) {
      if (status === 'ok') {
        self.onDisconnect_.remember(path, newNode);
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  }

  onDisconnectSetWithPriority(path, value, priority, onComplete) {
    var self = this;
    var newNode = nodeFromJSON(value, priority);
    this.server_.onDisconnectPut(path.toString(), newNode.val(/*export=*/true), function(status, errorReason) {
      if (status === 'ok') {
        self.onDisconnect_.remember(path, newNode);
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  }

  onDisconnectUpdate(path, childrenToMerge, onComplete) {
    var empty = true;
    for (var childName in childrenToMerge) {
      empty = false;
    }
    if (empty) {
      log('onDisconnect().update() called with empty data.  Don\'t do anything.');
      this.callOnCompleteCallback(onComplete, 'ok');
      return;
    }

    var self = this;
    this.server_.onDisconnectMerge(path.toString(), childrenToMerge, function(status, errorReason) {
      if (status === 'ok') {
        for (var childName in childrenToMerge) {
          var newChildNode = nodeFromJSON(childrenToMerge[childName]);
          self.onDisconnect_.remember(path.child(childName), newChildNode);
        }
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  }

  /**
   * @param {!Query} query
   * @param {!EventRegistration} eventRegistration
   */
  addEventCallbackForQuery(query, eventRegistration) {
    var events;
    if (query.path.getFront() === '.info') {
      events = this.infoSyncTree_.addEventRegistration(query, eventRegistration);
    } else {
      events = this.serverSyncTree_.addEventRegistration(query, eventRegistration);
    }
    this.eventQueue_.raiseEventsAtPath(query.path, events);
  }

  /**
   * @param {!Query} query
   * @param {?EventRegistration} eventRegistration
   */
  removeEventCallbackForQuery(query, eventRegistration) {
    // These are guaranteed not to raise events, since we're not passing in a cancelError. However, we can future-proof
    // a little bit by handling the return values anyways.
    var events;
    if (query.path.getFront() === '.info') {
      events = this.infoSyncTree_.removeEventRegistration(query, eventRegistration);
    } else {
      events = this.serverSyncTree_.removeEventRegistration(query, eventRegistration);
    }
    this.eventQueue_.raiseEventsAtPath(query.path, events);
  }

  interrupt() {
    if (this.persistentConnection_) {
      this.persistentConnection_.interrupt(INTERRUPT_REASON);
    }
  }

  resume() {
    if (this.persistentConnection_) {
      this.persistentConnection_.resume(INTERRUPT_REASON);
    }
  }

  stats(showDelta) {
    if (typeof console === 'undefined')
      return;

    var stats;
    if (showDelta) {
      if (!this.statsListener_)
        this.statsListener_ = new StatsListener(this.stats_);
      stats = this.statsListener_.get();
    } else {
      stats = this.stats_.get();
    }

    var longestName = Object.keys(stats).reduce(
        function(previousValue, currentValue, index, array) {
          return Math.max(currentValue.length, previousValue);
        }, 0);

    for (var stat in stats) {
      var value = stats[stat];
      // pad stat names to be the same length (plus 2 extra spaces).
      for (var i = stat.length; i < longestName + 2; i++)
        stat += ' ';
      console.log(stat + value);
    }
  }

  statsIncrementCounter(metric) {
    this.stats_.incrementCounter(metric);
    this.statsReporter_.includeStat(metric);
  }

  /**
   * @param {...*} var_args
   * @private
   */
  log_(...var_args) {
    var prefix = '';
    if (this.persistentConnection_) {
      prefix = this.persistentConnection_.id + ':';
    }
    log(prefix, arguments);
  }

  /**
   * @param {?function(?Error, *=)} callback
   * @param {!string} status
   * @param {?string=} errorReason
   */
  callOnCompleteCallback(callback, status, errorReason?) {
    if (callback) {
      exceptionGuard(function() {
        if (status == 'ok') {
          callback(null);
        } else {
          var code = (status || 'error').toUpperCase();
          var message = code;
          if (errorReason)
            message += ': ' + errorReason;

          var error = new Error(message);
          (error as any).code = code;
          callback(error);
        }
      });
    }
  }
}; // end Repo
