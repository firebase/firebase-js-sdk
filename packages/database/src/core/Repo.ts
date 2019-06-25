/**
 * @license
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

import {
  generateWithValues,
  resolveDeferredValueSnapshot,
  resolveDeferredValueTree
} from './util/ServerValues';
import { nodeFromJSON } from './snap/nodeFromJSON';
import { Path } from './util/Path';
import { SparseSnapshotTree } from './SparseSnapshotTree';
import { SyncTree } from './SyncTree';
import { SnapshotHolder } from './SnapshotHolder';
import { stringify } from '@firebase/util';
import { beingCrawled, each, exceptionGuard, warn, log } from './util/util';
import { map, isEmpty } from '@firebase/util';
import { AuthTokenProvider } from './AuthTokenProvider';
import { StatsManager } from './stats/StatsManager';
import { StatsReporter } from './stats/StatsReporter';
import { StatsListener } from './stats/StatsListener';
import { EventQueue } from './view/EventQueue';
import { PersistentConnection } from './PersistentConnection';
import { ReadonlyRestClient } from './ReadonlyRestClient';
import { FirebaseApp } from '@firebase/app-types';
import { RepoInfo } from './RepoInfo';
import { Database } from '../api/Database';
import { ServerActions } from './ServerActions';
import { Query } from '../api/Query';
import { EventRegistration } from './view/EventRegistration';
import { StatsCollection } from './stats/StatsCollection';
import { Event } from './view/Event';
import { Node } from './snap/Node';

const INTERRUPT_REASON = 'repo_interrupt';

/**
 * A connection to a single data repository.
 */
export class Repo {
  dataUpdateCount = 0;
  private infoSyncTree_: SyncTree;
  private serverSyncTree_: SyncTree;

  private stats_: StatsCollection;
  private statsListener_: StatsListener | null = null;
  private eventQueue_ = new EventQueue();
  private nextWriteId_ = 1;
  private server_: ServerActions;
  private statsReporter_: StatsReporter;
  private transactions_init_: () => void;
  private infoData_: SnapshotHolder;
  private abortTransactions_: (path: Path) => Path;
  private rerunTransactions_: (changedPath: Path) => Path;
  private interceptServerDataCallback_:
    | ((a: string, b: any) => void)
    | null = null;
  private __database: Database;

  /** A list of data pieces and paths to be set when this client disconnects. */
  private onDisconnect_ = new SparseSnapshotTree();

  // TODO: This should be @private but it's used by test_access.js and internal.js
  persistentConnection_: PersistentConnection | null = null;

  constructor(
    public repoInfo_: RepoInfo,
    forceRestClient: boolean,
    public app: FirebaseApp
  ) {
    const authTokenProvider = new AuthTokenProvider(app);

    this.stats_ = StatsManager.getCollection(repoInfo_);

    if (forceRestClient || beingCrawled()) {
      this.server_ = new ReadonlyRestClient(
        this.repoInfo_,
        this.onDataUpdate_.bind(this),
        authTokenProvider
      );

      // Minor hack: Fire onConnect immediately, since there's no actual connection.
      setTimeout(this.onConnectStatus_.bind(this, true), 0);
    } else {
      const authOverride = app.options['databaseAuthVariableOverride'];
      // Validate authOverride
      if (typeof authOverride !== 'undefined' && authOverride !== null) {
        if (typeof authOverride !== 'object') {
          throw new Error(
            'Only objects are supported for option databaseAuthVariableOverride'
          );
        }
        try {
          stringify(authOverride);
        } catch (e) {
          throw new Error('Invalid authOverride provided: ' + e);
        }
      }

      this.persistentConnection_ = new PersistentConnection(
        this.repoInfo_,
        this.onDataUpdate_.bind(this),
        this.onConnectStatus_.bind(this),
        this.onServerInfoUpdate_.bind(this),
        authTokenProvider,
        authOverride
      );

      this.server_ = this.persistentConnection_;
    }

    authTokenProvider.addTokenChangeListener(token => {
      this.server_.refreshAuthToken(token);
    });

    // In the case of multiple Repos for the same repoInfo (i.e. there are multiple Firebase.Contexts being used),
    // we only want to create one StatsReporter.  As such, we'll report stats over the first Repo created.
    this.statsReporter_ = StatsManager.getOrCreateReporter(
      repoInfo_,
      () => new StatsReporter(this.stats_, this.server_)
    );

    this.transactions_init_();

    // Used for .info.
    this.infoData_ = new SnapshotHolder();
    this.infoSyncTree_ = new SyncTree({
      startListening: (query, tag, currentHashFn, onComplete) => {
        let infoEvents: Event[] = [];
        const node = this.infoData_.getNode(query.path);
        // This is possibly a hack, but we have different semantics for .info endpoints. We don't raise null events
        // on initial data...
        if (!node.isEmpty()) {
          infoEvents = this.infoSyncTree_.applyServerOverwrite(
            query.path,
            node
          );
          setTimeout(() => {
            onComplete('ok');
          }, 0);
        }
        return infoEvents;
      },
      stopListening: () => {}
    });
    this.updateInfo_('connected', false);

    this.serverSyncTree_ = new SyncTree({
      startListening: (query, tag, currentHashFn, onComplete) => {
        this.server_.listen(query, currentHashFn, tag, (status, data) => {
          const events = onComplete(status, data);
          this.eventQueue_.raiseEventsForChangedPath(query.path, events);
        });
        // No synchronous events for network-backed sync trees
        return [];
      },
      stopListening: (query, tag) => {
        this.server_.unlisten(query, tag);
      }
    });
  }

  /**
   * @return The URL corresponding to the root of this Firebase.
   */
  toString(): string {
    return (
      (this.repoInfo_.secure ? 'https://' : 'http://') + this.repoInfo_.host
    );
  }

  /**
   * @return The namespace represented by the repo.
   */
  name(): string {
    return this.repoInfo_.namespace;
  }

  /**
   * @return The time in milliseconds, taking the server offset into account if we have one.
   */
  serverTime(): number {
    const offsetNode = this.infoData_.getNode(
      new Path('.info/serverTimeOffset')
    );
    const offset = (offsetNode.val() as number) || 0;
    return new Date().getTime() + offset;
  }

  /**
   * Generate ServerValues using some variables from the repo object.
   */
  generateServerValues(): Object {
    return generateWithValues({
      timestamp: this.serverTime()
    });
  }

  /**
   * Called by realtime when we get new messages from the server.
   */
  private onDataUpdate_(
    pathString: string,
    data: any,
    isMerge: boolean,
    tag: number | null
  ) {
    // For testing.
    this.dataUpdateCount++;
    const path = new Path(pathString);
    data = this.interceptServerDataCallback_
      ? this.interceptServerDataCallback_(pathString, data)
      : data;
    let events = [];
    if (tag) {
      if (isMerge) {
        const taggedChildren = map(data as { [k: string]: any }, (raw: any) =>
          nodeFromJSON(raw)
        );
        events = this.serverSyncTree_.applyTaggedQueryMerge(
          path,
          taggedChildren,
          tag
        );
      } else {
        const taggedSnap = nodeFromJSON(data);
        events = this.serverSyncTree_.applyTaggedQueryOverwrite(
          path,
          taggedSnap,
          tag
        );
      }
    } else if (isMerge) {
      const changedChildren = map(data as { [k: string]: any }, (raw: any) =>
        nodeFromJSON(raw)
      );
      events = this.serverSyncTree_.applyServerMerge(path, changedChildren);
    } else {
      const snap = nodeFromJSON(data);
      events = this.serverSyncTree_.applyServerOverwrite(path, snap);
    }
    let affectedPath = path;
    if (events.length > 0) {
      // Since we have a listener outstanding for each transaction, receiving any events
      // is a proxy for some change having occurred.
      affectedPath = this.rerunTransactions_(path);
    }
    this.eventQueue_.raiseEventsForChangedPath(affectedPath, events);
  }

  // TODO: This should be @private but it's used by test_access.js and internal.js
  interceptServerData_(callback: ((a: string, b: any) => any) | null) {
    this.interceptServerDataCallback_ = callback;
  }

  private onConnectStatus_(connectStatus: boolean) {
    this.updateInfo_('connected', connectStatus);
    if (connectStatus === false) {
      this.runOnDisconnectEvents_();
    }
  }

  private onServerInfoUpdate_(updates: Object) {
    each(updates, (value: any, key: string) => {
      this.updateInfo_(key, value);
    });
  }

  private updateInfo_(pathString: string, value: any) {
    const path = new Path('/.info/' + pathString);
    const newNode = nodeFromJSON(value);
    this.infoData_.updateSnapshot(path, newNode);
    const events = this.infoSyncTree_.applyServerOverwrite(path, newNode);
    this.eventQueue_.raiseEventsForChangedPath(path, events);
  }

  private getNextWriteId_(): number {
    return this.nextWriteId_++;
  }

  setWithPriority(
    path: Path,
    newVal: any,
    newPriority: number | string | null,
    onComplete: ((status: Error | null, errorReason?: string) => void) | null
  ) {
    this.log_('set', {
      path: path.toString(),
      value: newVal,
      priority: newPriority
    });

    // TODO: Optimize this behavior to either (a) store flag to skip resolving where possible and / or
    // (b) store unresolved paths on JSON parse
    const serverValues = this.generateServerValues();
    const newNodeUnresolved = nodeFromJSON(newVal, newPriority);
    const newNode = resolveDeferredValueSnapshot(
      newNodeUnresolved,
      serverValues
    );

    const writeId = this.getNextWriteId_();
    const events = this.serverSyncTree_.applyUserOverwrite(
      path,
      newNode,
      writeId,
      true
    );
    this.eventQueue_.queueEvents(events);
    this.server_.put(
      path.toString(),
      newNodeUnresolved.val(/*export=*/ true),
      (status, errorReason) => {
        const success = status === 'ok';
        if (!success) {
          warn('set at ' + path + ' failed: ' + status);
        }

        const clearEvents = this.serverSyncTree_.ackUserWrite(
          writeId,
          !success
        );
        this.eventQueue_.raiseEventsForChangedPath(path, clearEvents);
        this.callOnCompleteCallback(onComplete, status, errorReason);
      }
    );
    const affectedPath = this.abortTransactions_(path);
    this.rerunTransactions_(affectedPath);
    // We queued the events above, so just flush the queue here
    this.eventQueue_.raiseEventsForChangedPath(affectedPath, []);
  }

  update(
    path: Path,
    childrenToMerge: { [k: string]: any },
    onComplete: ((status: Error | null, errorReason?: string) => void) | null
  ) {
    this.log_('update', { path: path.toString(), value: childrenToMerge });

    // Start with our existing data and merge each child into it.
    let empty = true;
    const serverValues = this.generateServerValues();
    const changedChildren: { [k: string]: Node } = {};
    each(childrenToMerge, (changedKey: string, changedValue: any) => {
      empty = false;
      const newNodeUnresolved = nodeFromJSON(changedValue);
      changedChildren[changedKey] = resolveDeferredValueSnapshot(
        newNodeUnresolved,
        serverValues
      );
    });

    if (!empty) {
      const writeId = this.getNextWriteId_();
      const events = this.serverSyncTree_.applyUserMerge(
        path,
        changedChildren,
        writeId
      );
      this.eventQueue_.queueEvents(events);
      this.server_.merge(
        path.toString(),
        childrenToMerge,
        (status, errorReason) => {
          const success = status === 'ok';
          if (!success) {
            warn('update at ' + path + ' failed: ' + status);
          }

          const clearEvents = this.serverSyncTree_.ackUserWrite(
            writeId,
            !success
          );
          const affectedPath =
            clearEvents.length > 0 ? this.rerunTransactions_(path) : path;
          this.eventQueue_.raiseEventsForChangedPath(affectedPath, clearEvents);
          this.callOnCompleteCallback(onComplete, status, errorReason);
        }
      );

      each(childrenToMerge, (changedPath: string) => {
        const affectedPath = this.abortTransactions_(path.child(changedPath));
        this.rerunTransactions_(affectedPath);
      });

      // We queued the events above, so just flush the queue here
      this.eventQueue_.raiseEventsForChangedPath(path, []);
    } else {
      log("update() called with empty data.  Don't do anything.");
      this.callOnCompleteCallback(onComplete, 'ok');
    }
  }

  /**
   * Applies all of the changes stored up in the onDisconnect_ tree.
   */
  private runOnDisconnectEvents_() {
    this.log_('onDisconnectEvents');

    const serverValues = this.generateServerValues();
    const resolvedOnDisconnectTree = resolveDeferredValueTree(
      this.onDisconnect_,
      serverValues
    );
    let events: Event[] = [];

    resolvedOnDisconnectTree.forEachTree(Path.Empty, (path, snap) => {
      events = events.concat(
        this.serverSyncTree_.applyServerOverwrite(path, snap)
      );
      const affectedPath = this.abortTransactions_(path);
      this.rerunTransactions_(affectedPath);
    });

    this.onDisconnect_ = new SparseSnapshotTree();
    this.eventQueue_.raiseEventsForChangedPath(Path.Empty, events);
  }

  onDisconnectCancel(
    path: Path,
    onComplete: ((status: Error | null, errorReason?: string) => void) | null
  ) {
    this.server_.onDisconnectCancel(path.toString(), (status, errorReason) => {
      if (status === 'ok') {
        this.onDisconnect_.forget(path);
      }
      this.callOnCompleteCallback(onComplete, status, errorReason);
    });
  }

  onDisconnectSet(
    path: Path,
    value: any,
    onComplete: ((status: Error | null, errorReason?: string) => void) | null
  ) {
    const newNode = nodeFromJSON(value);
    this.server_.onDisconnectPut(
      path.toString(),
      newNode.val(/*export=*/ true),
      (status, errorReason) => {
        if (status === 'ok') {
          this.onDisconnect_.remember(path, newNode);
        }
        this.callOnCompleteCallback(onComplete, status, errorReason);
      }
    );
  }

  onDisconnectSetWithPriority(
    path: Path,
    value: any,
    priority: any,
    onComplete: ((status: Error | null, errorReason?: string) => void) | null
  ) {
    const newNode = nodeFromJSON(value, priority);
    this.server_.onDisconnectPut(
      path.toString(),
      newNode.val(/*export=*/ true),
      (status, errorReason) => {
        if (status === 'ok') {
          this.onDisconnect_.remember(path, newNode);
        }
        this.callOnCompleteCallback(onComplete, status, errorReason);
      }
    );
  }

  onDisconnectUpdate(
    path: Path,
    childrenToMerge: { [k: string]: any },
    onComplete: ((status: Error | null, errorReason?: string) => void) | null
  ) {
    if (isEmpty(childrenToMerge)) {
      log(
        "onDisconnect().update() called with empty data.  Don't do anything."
      );
      this.callOnCompleteCallback(onComplete, 'ok');
      return;
    }

    this.server_.onDisconnectMerge(
      path.toString(),
      childrenToMerge,
      (status, errorReason) => {
        if (status === 'ok') {
          each(childrenToMerge, (childName: string, childNode: any) => {
            const newChildNode = nodeFromJSON(childNode);
            this.onDisconnect_.remember(path.child(childName), newChildNode);
          });
        }
        this.callOnCompleteCallback(onComplete, status, errorReason);
      }
    );
  }

  addEventCallbackForQuery(query: Query, eventRegistration: EventRegistration) {
    let events;
    if (query.path.getFront() === '.info') {
      events = this.infoSyncTree_.addEventRegistration(
        query,
        eventRegistration
      );
    } else {
      events = this.serverSyncTree_.addEventRegistration(
        query,
        eventRegistration
      );
    }
    this.eventQueue_.raiseEventsAtPath(query.path, events);
  }

  removeEventCallbackForQuery(
    query: Query,
    eventRegistration: EventRegistration
  ) {
    // These are guaranteed not to raise events, since we're not passing in a cancelError. However, we can future-proof
    // a little bit by handling the return values anyways.
    let events;
    if (query.path.getFront() === '.info') {
      events = this.infoSyncTree_.removeEventRegistration(
        query,
        eventRegistration
      );
    } else {
      events = this.serverSyncTree_.removeEventRegistration(
        query,
        eventRegistration
      );
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

  stats(showDelta: boolean = false) {
    if (typeof console === 'undefined') return;

    let stats: { [k: string]: any };
    if (showDelta) {
      if (!this.statsListener_)
        this.statsListener_ = new StatsListener(this.stats_);
      stats = this.statsListener_.get();
    } else {
      stats = this.stats_.get();
    }

    const longestName = Object.keys(stats).reduce(
      (previousValue, currentValue) =>
        Math.max(currentValue.length, previousValue),
      0
    );

    each(stats, (stat: string, value: any) => {
      let paddedStat = stat;
      // pad stat names to be the same length (plus 2 extra spaces).
      for (let i = stat.length; i < longestName + 2; i++) {
        paddedStat += ' ';
      }
      console.log(paddedStat + value);
    });
  }

  statsIncrementCounter(metric: string) {
    this.stats_.incrementCounter(metric);
    this.statsReporter_.includeStat(metric);
  }

  private log_(...var_args: any[]) {
    let prefix = '';
    if (this.persistentConnection_) {
      prefix = this.persistentConnection_.id + ':';
    }
    log(prefix, ...var_args);
  }

  callOnCompleteCallback(
    callback: ((status: Error | null, errorReason?: string) => void) | null,
    status: string,
    errorReason?: string | null
  ) {
    if (callback) {
      exceptionGuard(function() {
        if (status == 'ok') {
          callback(null);
        } else {
          const code = (status || 'error').toUpperCase();
          let message = code;
          if (errorReason) message += ': ' + errorReason;

          const error = new Error(message);
          (error as any).code = code;
          callback(error);
        }
      });
    }
  }

  get database(): Database {
    return this.__database || (this.__database = new Database(this));
  }
}
