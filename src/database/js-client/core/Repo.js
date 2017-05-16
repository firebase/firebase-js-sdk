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
goog.provide('fb.core.Repo');
goog.require('fb.api.DataSnapshot');
goog.require('fb.api.Database');
goog.require('fb.core.AuthTokenProvider');
goog.require('fb.core.PersistentConnection');
goog.require('fb.core.ReadonlyRestClient');
goog.require('fb.core.SnapshotHolder');
goog.require('fb.core.SparseSnapshotTree');
goog.require('fb.core.SyncTree');
goog.require('fb.core.stats.StatsCollection');
goog.require('fb.core.stats.StatsListener');
goog.require('fb.core.stats.StatsManager');
goog.require('fb.core.stats.StatsReporter');
goog.require('fb.core.util');
goog.require('fb.core.util.ServerValues');
goog.require('fb.core.util.Tree');
goog.require('fb.core.view.EventQueue');
goog.require('fb.util.json');
goog.require('fb.util.jwt');
goog.require('goog.string');


var INTERRUPT_REASON = 'repo_interrupt';


/**
 * A connection to a single data repository.
 */
fb.core.Repo = goog.defineClass(null, {
  /**
   * @param {!fb.core.RepoInfo} repoInfo
   * @param {boolean} forceRestClient
   * @param {!firebase.app.App} app
   */
  constructor: function(repoInfo, forceRestClient, app) {
    /** @type {!firebase.app.App} */
    this.app = app;

    /** @type {!fb.core.AuthTokenProvider} */
    var authTokenProvider = new fb.core.AuthTokenProvider(app);

    this.repoInfo_ = repoInfo;
    this.stats_ = fb.core.stats.StatsManager.getCollection(repoInfo);
    /** @type {fb.core.stats.StatsListener} */
    this.statsListener_ = null;
    this.eventQueue_ = new fb.core.view.EventQueue();
    this.nextWriteId_ = 1;

    /**
     * TODO: This should be @private but it's used by test_access.js and internal.js
     * @type {?fb.core.PersistentConnection}
     */
    this.persistentConnection_ = null;

    /**
     * @private {!fb.core.ServerActions}
     */
    this.server_;

    if (forceRestClient || fb.core.util.beingCrawled()) {
      this.server_ = new fb.core.ReadonlyRestClient(this.repoInfo_,
        goog.bind(this.onDataUpdate_, this),
        authTokenProvider);

      // Minor hack: Fire onConnect immediately, since there's no actual connection.
      setTimeout(goog.bind(this.onConnectStatus_, this, true), 0);
    } else {
      var authOverride = app.options['databaseAuthVariableOverride'];
      // Validate authOverride
      if (goog.typeOf(authOverride) !== 'undefined' && authOverride !== null) {
        if (goog.typeOf(authOverride) !== 'object') {
          throw new Error('Only objects are supported for option databaseAuthVariableOverride');
        }
        try {
          fb.util.json.stringify(authOverride);
        } catch (e) {
          throw new Error('Invalid authOverride provided: ' + e);
        }
      }

      this.persistentConnection_ = new fb.core.PersistentConnection(this.repoInfo_,
        goog.bind(this.onDataUpdate_, this),
        goog.bind(this.onConnectStatus_, this),
        goog.bind(this.onServerInfoUpdate_, this),
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
    this.statsReporter_ = fb.core.stats.StatsManager.getOrCreateReporter(repoInfo,
      goog.bind(function() { return new fb.core.stats.StatsReporter(this.stats_, this.server_); }, this));

    this.transactions_init_();

    // Used for .info.
    this.infoData_ = new fb.core.SnapshotHolder();
    this.infoSyncTree_ = new fb.core.SyncTree({
      startListening: function(query, tag, currentHashFn, onComplete) {
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
      stopListening: goog.nullFunction
    });
    this.updateInfo_('connected', false);

    // A list of data pieces and paths to be set when this client disconnects.
    this.onDisconnect_ = new fb.core.SparseSnapshotTree();

    /** @type {!fb.api.Database} */
    this.database = new fb.api.Database(this);

    this.dataUpdateCount = 0;

    this.interceptServerDataCallback_ = null;

    this.serverSyncTree_ = new fb.core.SyncTree({
      startListening: function(query, tag, currentHashFn, onComplete) {
        self.server_.listen(query, currentHashFn, tag, function(status, data) {
          var events = onComplete(status, data);
          self.eventQueue_.raiseEventsForChangedPath(query.path, events);
        });
        // No synchronous events for network-backed sync trees
        return [];
      },
      stopListening: function(query, tag) {
        self.server_.unlisten(query, tag);
      }
    });
  },

  /**
   * @return {string}  The URL corresponding to the root of this Firebase.
   */
  toString: function() {
    return (this.repoInfo_.secure ? 'https://' : 'http://') + this.repoInfo_.host;
  },

  /**
   * @return {!string} The namespace represented by the repo.
   */
  name: function() {
    return this.repoInfo_.namespace;
  },

  /**
   * @return {!number} The time in milliseconds, taking the server offset into account if we have one.
   */
  serverTime: function() {
    var offsetNode = this.infoData_.getNode(new fb.core.util.Path('.info/serverTimeOffset'));
    var offset = /** @type {number} */ (offsetNode.val()) || 0;
    return new Date().getTime() + offset;
  },

  /**
   * Generate ServerValues using some variables from the repo object.
   * @return {!Object}
   */
  generateServerValues: function() {
    return fb.core.util.ServerValues.generateWithValues({
      'timestamp': this.serverTime()
    });
  },

  /**
   * Called by realtime when we get new messages from the server.
   *
   * @private
   * @param {string} pathString
   * @param {*} data
   * @param {boolean} isMerge
   * @param {?number} tag
   */
  onDataUpdate_: function(pathString, data, isMerge, tag) {
    // For testing.
    this.dataUpdateCount++;
    var path = new fb.core.util.Path(pathString);
    data = this.interceptServerDataCallback_ ? this.interceptServerDataCallback_(pathString, data) : data;
    var events = [];
    if (tag) {
      if (isMerge) {
        var taggedChildren = goog.object.map(/**@type {!Object.<string, *>} */ (data), function(raw) {
          return fb.core.snap.NodeFromJSON(raw);
        });
        events = this.serverSyncTree_.applyTaggedQueryMerge(path, taggedChildren, tag);
      } else {
        var taggedSnap = fb.core.snap.NodeFromJSON(data);
        events = this.serverSyncTree_.applyTaggedQueryOverwrite(path, taggedSnap, tag);
      }
    } else if (isMerge) {
      var changedChildren = goog.object.map(/**@type {!Object.<string, *>} */ (data), function(raw) {
        return fb.core.snap.NodeFromJSON(raw);
      });
      events = this.serverSyncTree_.applyServerMerge(path, changedChildren);
    } else {
      var snap = fb.core.snap.NodeFromJSON(data);
      events = this.serverSyncTree_.applyServerOverwrite(path, snap);
    }
    var affectedPath = path;
    if (events.length > 0) {
      // Since we have a listener outstanding for each transaction, receiving any events
      // is a proxy for some change having occurred.
      affectedPath = this.rerunTransactions_(path);
    }
    this.eventQueue_.raiseEventsForChangedPath(affectedPath, events);
  },

  /**
   * @param {?function(!string, *):*} callback
   * @private
   */
  interceptServerData_: function(callback) {
    this.interceptServerDataCallback_ = callback;
  },

  /**
   * @param {!boolean} connectStatus
   * @private
   */
  onConnectStatus_: function(connectStatus) {
    this.updateInfo_('connected', connectStatus);
    if (connectStatus === false) {
      this.runOnDisconnectEvents_();
    }
  },

  /**
   * @param {!Object} updates
   * @private
   */
  onServerInfoUpdate_: function(updates) {
    var self = this;
    fb.core.util.each(updates, function(value, key) {
      self.updateInfo_(key, value);
    });
  },

  /**
   *
   * @param {!string} pathString
   * @param {*} value
   * @private
   */
  updateInfo_: function(pathString, value) {
    var path = new fb.core.util.Path('/.info/' + pathString);
    var newNode = fb.core.snap.NodeFromJSON(value);
    this.infoData_.updateSnapshot(path, newNode);
    var events = this.infoSyncTree_.applyServerOverwrite(path, newNode);
    this.eventQueue_.raiseEventsForChangedPath(path, events);
  },

  /**
   * @return {!number}
   * @private
   */
  getNextWriteId_: function() {
    return this.nextWriteId_++;
  },

  /**
   * @param {!fb.core.util.Path} path
   * @param {*} newVal
   * @param {number|string|null} newPriority
   * @param {?function(?Error, *=)} onComplete
   */
  setWithPriority: function(path, newVal, newPriority, onComplete) {
    this.log_('set', {path: path.toString(), value: newVal, priority: newPriority});

    // TODO: Optimize this behavior to either (a) store flag to skip resolving where possible and / or
    // (b) store unresolved paths on JSON parse
    var serverValues = this.generateServerValues();
    var newNodeUnresolved = fb.core.snap.NodeFromJSON(newVal, newPriority);
    var newNode = fb.core.util.ServerValues.resolveDeferredValueSnapshot(newNodeUnresolved, serverValues);

    var writeId = this.getNextWriteId_();
    var events = this.serverSyncTree_.applyUserOverwrite(path, newNode, writeId, true);
    this.eventQueue_.queueEvents(events);
    var self = this;
    this.server_.put(path.toString(), newNodeUnresolved.val(/*export=*/true), function(status, errorReason) {
      var success = status === 'ok';
      if (!success) {
        fb.core.util.warn('set at ' + path + ' failed: ' + status);
      }

      var clearEvents = self.serverSyncTree_.ackUserWrite(writeId, !success);
      self.eventQueue_.raiseEventsForChangedPath(path, clearEvents);
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
    var affectedPath = this.abortTransactions_(path);
    this.rerunTransactions_(affectedPath);
    // We queued the events above, so just flush the queue here
    this.eventQueue_.raiseEventsForChangedPath(affectedPath, []);
  },

  /**
   * @param {!fb.core.util.Path} path
   * @param {!Object} childrenToMerge
   * @param {?function(?Error, *=)} onComplete
   */
  update: function(path, childrenToMerge, onComplete) {
    this.log_('update', {path: path.toString(), value: childrenToMerge});

    // Start with our existing data and merge each child into it.
    var empty = true;
    var serverValues = this.generateServerValues();
    var changedChildren = {};
    goog.object.forEach(childrenToMerge, function(changedValue, changedKey) {
      empty = false;
      var newNodeUnresolved = fb.core.snap.NodeFromJSON(changedValue);
      changedChildren[changedKey] =
        fb.core.util.ServerValues.resolveDeferredValueSnapshot(newNodeUnresolved, serverValues);
    });

    if (!empty) {
      var writeId = this.getNextWriteId_();
      var events = this.serverSyncTree_.applyUserMerge(path, changedChildren, writeId);
      this.eventQueue_.queueEvents(events);
      var self = this;
      this.server_.merge(path.toString(), childrenToMerge, function(status, errorReason) {
        var success = status === 'ok';
        if (!success) {
          fb.core.util.warn('update at ' + path + ' failed: ' + status);
        }

        var clearEvents = self.serverSyncTree_.ackUserWrite(writeId, !success);
        var affectedPath = path;
        if (clearEvents.length > 0) {
          affectedPath = self.rerunTransactions_(path);
        }
        self.eventQueue_.raiseEventsForChangedPath(affectedPath, clearEvents);
        self.callOnCompleteCallback(onComplete, status, errorReason);
      });

      goog.object.forEach(childrenToMerge, function(changedValue, changedPath) {
        var affectedPath = self.abortTransactions_(path.child(changedPath));
        self.rerunTransactions_(affectedPath);
      });

      // We queued the events above, so just flush the queue here
      this.eventQueue_.raiseEventsForChangedPath(path, []);
    } else {
      fb.core.util.log('update() called with empty data.  Don\'t do anything.');
      this.callOnCompleteCallback(onComplete, 'ok');
    }
  },

  /**
   * Applies all of the changes stored up in the onDisconnect_ tree.
   * @private
   */
  runOnDisconnectEvents_: function() {
    this.log_('onDisconnectEvents');
    var self = this;

    var serverValues = this.generateServerValues();
    var resolvedOnDisconnectTree = fb.core.util.ServerValues.resolveDeferredValueTree(this.onDisconnect_, serverValues);
    var events = [];

    resolvedOnDisconnectTree.forEachTree(fb.core.util.Path.Empty, function(path, snap) {
      events = events.concat(self.serverSyncTree_.applyServerOverwrite(path, snap));
      var affectedPath = self.abortTransactions_(path);
      self.rerunTransactions_(affectedPath);
    });

    this.onDisconnect_ = new fb.core.SparseSnapshotTree();
    this.eventQueue_.raiseEventsForChangedPath(fb.core.util.Path.Empty, events);
  },

  /**
   * @param {!fb.core.util.Path} path
   * @param {?function(?Error)} onComplete
   */
  onDisconnectCancel: function(path, onComplete) {
    var self = this;
    this.server_.onDisconnectCancel(path.toString(), function(status, errorReason) {
      if (status === 'ok') {
        self.onDisconnect_.forget(path);
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  },

  onDisconnectSet: function(path, value, onComplete) {
    var self = this;
    var newNode = fb.core.snap.NodeFromJSON(value);
    this.server_.onDisconnectPut(path.toString(), newNode.val(/*export=*/true), function(status, errorReason) {
      if (status === 'ok') {
        self.onDisconnect_.remember(path, newNode);
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  },

  onDisconnectSetWithPriority: function(path, value, priority, onComplete) {
    var self = this;
    var newNode = fb.core.snap.NodeFromJSON(value, priority);
    this.server_.onDisconnectPut(path.toString(), newNode.val(/*export=*/true), function(status, errorReason) {
      if (status === 'ok') {
        self.onDisconnect_.remember(path, newNode);
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  },

  onDisconnectUpdate: function(path, childrenToMerge, onComplete) {
    var empty = true;
    for (var childName in childrenToMerge) {
      empty = false;
    }
    if (empty) {
      fb.core.util.log('onDisconnect().update() called with empty data.  Don\'t do anything.');
      this.callOnCompleteCallback(onComplete, 'ok');
      return;
    }

    var self = this;
    this.server_.onDisconnectMerge(path.toString(), childrenToMerge, function(status, errorReason) {
      if (status === 'ok') {
        for (var childName in childrenToMerge) {
          var newChildNode = fb.core.snap.NodeFromJSON(childrenToMerge[childName]);
          self.onDisconnect_.remember(path.child(childName), newChildNode);
        }
      }
      self.callOnCompleteCallback(onComplete, status, errorReason);
    });
  },

  /**
   * @param {!fb.api.Query} query
   * @param {!fb.core.view.EventRegistration} eventRegistration
   */
  addEventCallbackForQuery: function(query, eventRegistration) {
    var events;
    if (query.path.getFront() === '.info') {
      events = this.infoSyncTree_.addEventRegistration(query, eventRegistration);
    } else {
      events = this.serverSyncTree_.addEventRegistration(query, eventRegistration);
    }
    this.eventQueue_.raiseEventsAtPath(query.path, events);
  },

  /**
   * @param {!fb.api.Query} query
   * @param {?fb.core.view.EventRegistration} eventRegistration
   */
  removeEventCallbackForQuery: function(query, eventRegistration) {
    // These are guaranteed not to raise events, since we're not passing in a cancelError. However, we can future-proof
    // a little bit by handling the return values anyways.
    var events;
    if (query.path.getFront() === '.info') {
      events = this.infoSyncTree_.removeEventRegistration(query, eventRegistration);
    } else {
      events = this.serverSyncTree_.removeEventRegistration(query, eventRegistration);
    }
    this.eventQueue_.raiseEventsAtPath(query.path, events);
  },

  interrupt: function() {
    if (this.persistentConnection_) {
      this.persistentConnection_.interrupt(INTERRUPT_REASON);
    }
  },

  resume: function() {
    if (this.persistentConnection_) {
      this.persistentConnection_.resume(INTERRUPT_REASON);
    }
  },

  stats: function(showDelta) {
    if (typeof console === 'undefined')
      return;

    var stats;
    if (showDelta) {
      if (!this.statsListener_)
        this.statsListener_ = new fb.core.stats.StatsListener(this.stats_);
      stats = this.statsListener_.get();
    } else {
      stats = this.stats_.get();
    }

    var longestName = goog.array.reduce(
        goog.object.getKeys(stats),
        function(previousValue, currentValue, index, array) {
          return Math.max(currentValue.length, previousValue);
        },
        0);

    for (var stat in stats) {
      var value = stats[stat];
      // pad stat names to be the same length (plus 2 extra spaces).
      for (var i = stat.length; i < longestName + 2; i++)
        stat += ' ';
      console.log(stat + value);
    }
  },

  statsIncrementCounter: function(metric) {
    this.stats_.incrementCounter(metric);
    this.statsReporter_.includeStat(metric);
  },

  /**
   * @param {...*} var_args
   * @private
   */
  log_: function(var_args) {
    var prefix = '';
    if (this.persistentConnection_) {
      prefix = this.persistentConnection_.id + ':';
    }
    fb.core.util.log(prefix, arguments);
  },

  /**
   * @param {?function(?Error, *=)} callback
   * @param {!string} status
   * @param {?string=} errorReason
   */
  callOnCompleteCallback: function(callback, status, errorReason) {
    if (callback) {
      fb.core.util.exceptionGuard(function() {
        if (status == 'ok') {
          callback(null);
        } else {
          var code = (status || 'error').toUpperCase();
          var message = code;
          if (errorReason)
            message += ': ' + errorReason;

          var error = new Error(message);
          error.code = code;
          callback(error);
        }
      });
    }
  }
}); // end fb.core.Repo


// TODO: This code is largely the same as .setWithPriority.  Refactor?

/* TODO: Enable onDisconnect().setPriority(priority, callback)
fb.core.Repo.prototype.onDisconnectSetPriority = function(path, priority, onComplete) {
  var self = this;
  this.server_.onDisconnectPut(path.toString() + '/.priority', priority, function(status) {
    self.callOnCompleteCallback(onComplete, status);
  });
};*/
