/**
 * @license
 * Copyright 2017 Google LLC
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
import {
  stringify,
  map,
  isEmpty,
  assert,
  contains,
  safeGet
} from '@firebase/util';
import {
  beingCrawled,
  each,
  exceptionGuard,
  warn,
  log,
  LUIDGenerator
} from './util/util';

import { AuthTokenProvider } from './AuthTokenProvider';
import { StatsManager } from './stats/StatsManager';
import { StatsReporter } from './stats/StatsReporter';
import { StatsListener } from './stats/StatsListener';
import { EventQueue } from './view/EventQueue';
import { PersistentConnection } from './PersistentConnection';
import { ReadonlyRestClient } from './ReadonlyRestClient';
import { RepoInfo } from './RepoInfo';
import { Database } from '../api/Database';
import { DataSnapshot } from '../api/DataSnapshot';
import { ServerActions } from './ServerActions';
import { Query } from '../api/Query';
import { EventRegistration } from './view/EventRegistration';
import { StatsCollection } from './stats/StatsCollection';
import { Event } from './view/Event';
import { Node } from './snap/Node';
import { Indexable } from './util/misc';
import { Tree } from './util/Tree';
import { isValidPriority, validateFirebaseData } from './util/validation';
import { ChildrenNode } from './snap/ChildrenNode';
import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { Reference } from '../api/Reference';
import { FirebaseAppLike } from './RepoManager';

const INTERRUPT_REASON = 'repo_interrupt';

/**
 * If a transaction does not succeed after 25 retries, we abort it. Among other
 * things this ensure that if there's ever a bug causing a mismatch between
 * client / server hashes for some data, we won't retry indefinitely.
 */
const MAX_TRANSACTION_RETRIES = 25;

export enum TransactionStatus {
  // We've run the transaction and updated transactionResultData_ with the result, but it isn't currently sent to the
  // server. A transaction will go from RUN -> SENT -> RUN if it comes back from the server as rejected due to
  // mismatched hash.
  RUN,

  // We've run the transaction and sent it to the server and it's currently outstanding (hasn't come back as accepted
  // or rejected yet).
  SENT,

  // Temporary state used to mark completed transactions (whether successful or aborted).  The transaction will be
  // removed when we get a chance to prune completed ones.
  COMPLETED,

  // Used when an already-sent transaction needs to be aborted (e.g. due to a conflicting set() call that was made).
  // If it comes back as unsuccessful, we'll abort it.
  SENT_NEEDS_ABORT,

  // Temporary state used to mark transactions that need to be aborted.
  NEEDS_ABORT
}

interface Transaction {
  path: Path;
  update: (a: unknown) => unknown;
  onComplete: (a: Error | null, b: boolean, c: DataSnapshot | null) => void;
  status: TransactionStatus;
  order: number;
  applyLocally: boolean;
  retryCount: number;
  unwatcher: () => void;
  abortReason: string | null;
  currentWriteId: number;
  currentInputSnapshot: Node | null;
  currentOutputSnapshotRaw: Node | null;
  currentOutputSnapshotResolved: Node | null;
}

/**
 * A connection to a single data repository.
 */
export class Repo {
  /** Key for uniquely identifying this repo, used in RepoManager */
  readonly key: string;

  dataUpdateCount = 0;
  private infoSyncTree_: SyncTree;
  private serverSyncTree_: SyncTree;

  private stats_: StatsCollection;
  private statsListener_: StatsListener | null = null;
  private eventQueue_ = new EventQueue();
  private nextWriteId_ = 1;
  private server_: ServerActions;
  private statsReporter_: StatsReporter;
  private infoData_: SnapshotHolder;
  private interceptServerDataCallback_:
    | ((a: string, b: unknown) => void)
    | null = null;
  private __database: Database;

  /** A list of data pieces and paths to be set when this client disconnects. */
  private onDisconnect_ = new SparseSnapshotTree();

  /** Stores queues of outstanding transactions for Firebase locations. */
  private transactionQueueTree_ = new Tree<Transaction[]>();

  // TODO: This should be @private but it's used by test_access.js and internal.js
  persistentConnection_: PersistentConnection | null = null;

  constructor(
    public repoInfo_: RepoInfo,
    private forceRestClient_: boolean,
    public app: FirebaseAppLike,
    public authTokenProvider_: AuthTokenProvider
  ) {
    // This key is intentionally not updated if RepoInfo is later changed or replaced
    this.key = this.repoInfo_.toURLString();
  }

  start(): void {
    this.stats_ = StatsManager.getCollection(this.repoInfo_);

    if (this.forceRestClient_ || beingCrawled()) {
      this.server_ = new ReadonlyRestClient(
        this.repoInfo_,
        this.onDataUpdate_.bind(this),
        this.authTokenProvider_
      );

      // Minor hack: Fire onConnect immediately, since there's no actual connection.
      setTimeout(this.onConnectStatus_.bind(this, true), 0);
    } else {
      const authOverride = this.app.options['databaseAuthVariableOverride'];
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
        this.app.options.appId,
        this.onDataUpdate_.bind(this),
        this.onConnectStatus_.bind(this),
        this.onServerInfoUpdate_.bind(this),
        this.authTokenProvider_,
        authOverride
      );

      this.server_ = this.persistentConnection_;
    }

    this.authTokenProvider_.addTokenChangeListener(token => {
      this.server_.refreshAuthToken(token);
    });

    // In the case of multiple Repos for the same repoInfo (i.e. there are multiple Firebase.Contexts being used),
    // we only want to create one StatsReporter.  As such, we'll report stats over the first Repo created.
    this.statsReporter_ = StatsManager.getOrCreateReporter(
      this.repoInfo_,
      () => new StatsReporter(this.stats_, this.server_)
    );

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
  generateServerValues(): Indexable {
    return generateWithValues({
      timestamp: this.serverTime()
    });
  }

  /**
   * Called by realtime when we get new messages from the server.
   */
  private onDataUpdate_(
    pathString: string,
    data: unknown,
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
        const taggedChildren = map(
          data as { [k: string]: unknown },
          (raw: unknown) => nodeFromJSON(raw)
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
      const changedChildren = map(
        data as { [k: string]: unknown },
        (raw: unknown) => nodeFromJSON(raw)
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
  interceptServerData_(callback: ((a: string, b: unknown) => unknown) | null) {
    this.interceptServerDataCallback_ = callback;
  }

  private onConnectStatus_(connectStatus: boolean) {
    this.updateInfo_('connected', connectStatus);
    if (connectStatus === false) {
      this.runOnDisconnectEvents_();
    }
  }

  private onServerInfoUpdate_(updates: object) {
    each(updates, (key: string, value: unknown) => {
      this.updateInfo_(key, value);
    });
  }

  private updateInfo_(pathString: string, value: unknown) {
    const path = new Path('/.info/' + pathString);
    const newNode = nodeFromJSON(value);
    this.infoData_.updateSnapshot(path, newNode);
    const events = this.infoSyncTree_.applyServerOverwrite(path, newNode);
    this.eventQueue_.raiseEventsForChangedPath(path, events);
  }

  private getNextWriteId_(): number {
    return this.nextWriteId_++;
  }

  /**
   * The purpose of `getValue` is to return the latest known value
   * satisfying `query`.
   *
   * This method will first check for in-memory cached values
   * belonging to active listeners. If they are found, such values
   * are considered to be the most up-to-date.
   *
   * If the client is not connected, this method will try to
   * establish a connection and request the value for `query`. If
   * the client is not able to retrieve the query result, it reports
   * an error.
   *
   * @param query - The query to surface a value for.
   */
  getValue(query: Query): Promise<DataSnapshot> {
    // Only active queries are cached. There is no persisted cache.
    const cached = this.serverSyncTree_.calcCompleteEventCache(query.path);
    if (!cached.isEmpty()) {
      return Promise.resolve(
        new DataSnapshot(
          cached,
          query.getRef(),
          query.getQueryParams().getIndex()
        )
      );
    }
    return this.server_.get(query).then(
      payload => {
        const node = nodeFromJSON(payload as string);
        const events = this.serverSyncTree_.applyServerOverwrite(
          query.path,
          node
        );
        this.eventQueue_.raiseEventsAtPath(query.path, events);
        return Promise.resolve(
          new DataSnapshot(
            node,
            query.getRef(),
            query.getQueryParams().getIndex()
          )
        );
      },
      err => {
        this.log_('get for query ' + stringify(query) + ' failed: ' + err);
        return Promise.reject(new Error(err as string));
      }
    );
  }

  setWithPriority(
    path: Path,
    newVal: unknown,
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
    const existing = this.serverSyncTree_.calcCompleteEventCache(path);
    const newNode = resolveDeferredValueSnapshot(
      newNodeUnresolved,
      existing,
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
    childrenToMerge: { [k: string]: unknown },
    onComplete: ((status: Error | null, errorReason?: string) => void) | null
  ) {
    this.log_('update', { path: path.toString(), value: childrenToMerge });

    // Start with our existing data and merge each child into it.
    let empty = true;
    const serverValues = this.generateServerValues();
    const changedChildren: { [k: string]: Node } = {};
    each(childrenToMerge, (changedKey: string, changedValue: unknown) => {
      empty = false;
      changedChildren[changedKey] = resolveDeferredValueTree(
        path.child(changedKey),
        nodeFromJSON(changedValue),
        this.serverSyncTree_,
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
    const resolvedOnDisconnectTree = new SparseSnapshotTree();
    this.onDisconnect_.forEachTree(Path.Empty, (path, node) => {
      const resolved = resolveDeferredValueTree(
        path,
        node,
        this.serverSyncTree_,
        serverValues
      );
      resolvedOnDisconnectTree.remember(path, resolved);
    });
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
    value: unknown,
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
    value: unknown,
    priority: unknown,
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
    childrenToMerge: { [k: string]: unknown },
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
          each(childrenToMerge, (childName: string, childNode: unknown) => {
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
    if (typeof console === 'undefined') {
      return;
    }

    let stats: { [k: string]: unknown };
    if (showDelta) {
      if (!this.statsListener_) {
        this.statsListener_ = new StatsListener(this.stats_);
      }
      stats = this.statsListener_.get();
    } else {
      stats = this.stats_.get();
    }

    const longestName = Object.keys(stats).reduce(
      (previousValue, currentValue) =>
        Math.max(currentValue.length, previousValue),
      0
    );

    each(stats, (stat: string, value: unknown) => {
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

  private log_(...varArgs: unknown[]) {
    let prefix = '';
    if (this.persistentConnection_) {
      prefix = this.persistentConnection_.id + ':';
    }
    log(prefix, ...varArgs);
  }

  callOnCompleteCallback(
    callback: ((status: Error | null, errorReason?: string) => void) | null,
    status: string,
    errorReason?: string | null
  ) {
    if (callback) {
      exceptionGuard(() => {
        if (status === 'ok') {
          callback(null);
        } else {
          const code = (status || 'error').toUpperCase();
          let message = code;
          if (errorReason) {
            message += ': ' + errorReason;
          }

          const error = new Error(message);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error as any).code = code;
          callback(error);
        }
      });
    }
  }

  get database(): Database {
    return this.__database || (this.__database = new Database(this));
  }

  /**
   * Creates a new transaction, adds it to the transactions we're tracking, and
   * sends it to the server if possible.
   *
   * @param path Path at which to do transaction.
   * @param transactionUpdate Update callback.
   * @param onComplete Completion callback.
   * @param applyLocally Whether or not to make intermediate results visible
   */
  startTransaction(
    path: Path,
    transactionUpdate: (a: unknown) => unknown,
    onComplete: ((a: Error, b: boolean, c: DataSnapshot) => void) | null,
    applyLocally: boolean
  ) {
    this.log_('transaction on ' + path);

    // Add a watch to make sure we get server updates.
    const valueCallback = function () {};
    const watchRef = new Reference(this, path);
    watchRef.on('value', valueCallback);
    const unwatcher = function () {
      watchRef.off('value', valueCallback);
    };

    // Initialize transaction.
    const transaction: Transaction = {
      path,
      update: transactionUpdate,
      onComplete,
      // One of TransactionStatus enums.
      status: null,
      // Used when combining transactions at different locations to figure out
      // which one goes first.
      order: LUIDGenerator(),
      // Whether to raise local events for this transaction.
      applyLocally,
      // Count of how many times we've retried the transaction.
      retryCount: 0,
      // Function to call to clean up our .on() listener.
      unwatcher,
      // Stores why a transaction was aborted.
      abortReason: null,
      currentWriteId: null,
      currentInputSnapshot: null,
      currentOutputSnapshotRaw: null,
      currentOutputSnapshotResolved: null
    };

    // Run transaction initially.
    const currentState = this.getLatestState_(path);
    transaction.currentInputSnapshot = currentState;
    const newVal = transaction.update(currentState.val());
    if (newVal === undefined) {
      // Abort transaction.
      transaction.unwatcher();
      transaction.currentOutputSnapshotRaw = null;
      transaction.currentOutputSnapshotResolved = null;
      if (transaction.onComplete) {
        // We just set the input snapshot, so this cast should be safe
        const snapshot = new DataSnapshot(
          transaction.currentInputSnapshot,
          new Reference(this, transaction.path),
          PRIORITY_INDEX
        );
        transaction.onComplete(null, false, snapshot);
      }
    } else {
      validateFirebaseData(
        'transaction failed: Data returned ',
        newVal,
        transaction.path
      );

      // Mark as run and add to our queue.
      transaction.status = TransactionStatus.RUN;
      const queueNode = this.transactionQueueTree_.subTree(path);
      const nodeQueue = queueNode.getValue() || [];
      nodeQueue.push(transaction);

      queueNode.setValue(nodeQueue);

      // Update visibleData and raise events
      // Note: We intentionally raise events after updating all of our
      // transaction state, since the user could start new transactions from the
      // event callbacks.
      let priorityForNode;
      if (
        typeof newVal === 'object' &&
        newVal !== null &&
        contains(newVal, '.priority')
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        priorityForNode = safeGet(newVal as any, '.priority');
        assert(
          isValidPriority(priorityForNode),
          'Invalid priority returned by transaction. ' +
            'Priority must be a valid string, finite number, server value, or null.'
        );
      } else {
        const currentNode =
          this.serverSyncTree_.calcCompleteEventCache(path) ||
          ChildrenNode.EMPTY_NODE;
        priorityForNode = currentNode.getPriority().val();
      }

      const serverValues = this.generateServerValues();
      const newNodeUnresolved = nodeFromJSON(newVal, priorityForNode);
      const newNode = resolveDeferredValueSnapshot(
        newNodeUnresolved,
        currentState,
        serverValues
      );
      transaction.currentOutputSnapshotRaw = newNodeUnresolved;
      transaction.currentOutputSnapshotResolved = newNode;
      transaction.currentWriteId = this.getNextWriteId_();

      const events = this.serverSyncTree_.applyUserOverwrite(
        path,
        newNode,
        transaction.currentWriteId,
        transaction.applyLocally
      );
      this.eventQueue_.raiseEventsForChangedPath(path, events);

      this.sendReadyTransactions_();
    }
  }

  /**
   * @param excludeSets A specific set to exclude
   */
  private getLatestState_(path: Path, excludeSets?: number[]): Node {
    return (
      this.serverSyncTree_.calcCompleteEventCache(path, excludeSets) ||
      ChildrenNode.EMPTY_NODE
    );
  }

  /**
   * Sends any already-run transactions that aren't waiting for outstanding
   * transactions to complete.
   *
   * Externally it's called with no arguments, but it calls itself recursively
   * with a particular transactionQueueTree node to recurse through the tree.
   *
   * @param node transactionQueueTree node to start at.
   */
  private sendReadyTransactions_(
    node: Tree<Transaction[]> = this.transactionQueueTree_
  ) {
    // Before recursing, make sure any completed transactions are removed.
    if (!node) {
      this.pruneCompletedTransactionsBelowNode_(node);
    }

    if (node.getValue() !== null) {
      const queue = this.buildTransactionQueue_(node);
      assert(queue.length > 0, 'Sending zero length transaction queue');

      const allRun = queue.every(
        (transaction: Transaction) =>
          transaction.status === TransactionStatus.RUN
      );

      // If they're all run (and not sent), we can send them.  Else, we must wait.
      if (allRun) {
        this.sendTransactionQueue_(node.path(), queue);
      }
    } else if (node.hasChildren()) {
      node.forEachChild(childNode => {
        this.sendReadyTransactions_(childNode);
      });
    }
  }

  /**
   * Given a list of run transactions, send them to the server and then handle
   * the result (success or failure).
   *
   * @param path The location of the queue.
   * @param queue Queue of transactions under the specified location.
   */
  private sendTransactionQueue_(path: Path, queue: Transaction[]) {
    // Mark transactions as sent and increment retry count!
    const setsToIgnore = queue.map(txn => {
      return txn.currentWriteId;
    });
    const latestState = this.getLatestState_(path, setsToIgnore);
    let snapToSend = latestState;
    const latestHash = latestState.hash();
    for (let i = 0; i < queue.length; i++) {
      const txn = queue[i];
      assert(
        txn.status === TransactionStatus.RUN,
        'tryToSendTransactionQueue_: items in queue should all be run.'
      );
      txn.status = TransactionStatus.SENT;
      txn.retryCount++;
      const relativePath = Path.relativePath(path, txn.path);
      // If we've gotten to this point, the output snapshot must be defined.
      snapToSend = snapToSend.updateChild(
        relativePath /** @type {!Node} */,
        txn.currentOutputSnapshotRaw
      );
    }

    const dataToSend = snapToSend.val(true);
    const pathToSend = path;

    // Send the put.
    this.server_.put(
      pathToSend.toString(),
      dataToSend,
      (status: string) => {
        this.log_('transaction put response', {
          path: pathToSend.toString(),
          status
        });

        let events: Event[] = [];
        if (status === 'ok') {
          // Queue up the callbacks and fire them after cleaning up all of our
          // transaction state, since the callback could trigger more
          // transactions or sets.
          const callbacks = [];
          for (let i = 0; i < queue.length; i++) {
            queue[i].status = TransactionStatus.COMPLETED;
            events = events.concat(
              this.serverSyncTree_.ackUserWrite(queue[i].currentWriteId)
            );
            if (queue[i].onComplete) {
              // We never unset the output snapshot, and given that this
              // transaction is complete, it should be set
              const node = queue[i].currentOutputSnapshotResolved as Node;
              const ref = new Reference(this, queue[i].path);
              const snapshot = new DataSnapshot(node, ref, PRIORITY_INDEX);
              callbacks.push(
                queue[i].onComplete.bind(null, null, true, snapshot)
              );
            }
            queue[i].unwatcher();
          }

          // Now remove the completed transactions.
          this.pruneCompletedTransactionsBelowNode_(
            this.transactionQueueTree_.subTree(path)
          );
          // There may be pending transactions that we can now send.
          this.sendReadyTransactions_();

          this.eventQueue_.raiseEventsForChangedPath(path, events);

          // Finally, trigger onComplete callbacks.
          for (let i = 0; i < callbacks.length; i++) {
            exceptionGuard(callbacks[i]);
          }
        } else {
          // transactions are no longer sent.  Update their status appropriately.
          if (status === 'datastale') {
            for (let i = 0; i < queue.length; i++) {
              if (queue[i].status === TransactionStatus.SENT_NEEDS_ABORT) {
                queue[i].status = TransactionStatus.NEEDS_ABORT;
              } else {
                queue[i].status = TransactionStatus.RUN;
              }
            }
          } else {
            warn(
              'transaction at ' + pathToSend.toString() + ' failed: ' + status
            );
            for (let i = 0; i < queue.length; i++) {
              queue[i].status = TransactionStatus.NEEDS_ABORT;
              queue[i].abortReason = status;
            }
          }

          this.rerunTransactions_(path);
        }
      },
      latestHash
    );
  }

  /**
   * Finds all transactions dependent on the data at changedPath and reruns them.
   *
   * Should be called any time cached data changes.
   *
   * Return the highest path that was affected by rerunning transactions. This
   * is the path at which events need to be raised for.
   *
   * @param changedPath The path in mergedData that changed.
   * @return The rootmost path that was affected by rerunning transactions.
   */
  private rerunTransactions_(changedPath: Path): Path {
    const rootMostTransactionNode = this.getAncestorTransactionNode_(
      changedPath
    );
    const path = rootMostTransactionNode.path();

    const queue = this.buildTransactionQueue_(rootMostTransactionNode);
    this.rerunTransactionQueue_(queue, path);

    return path;
  }

  /**
   * Does all the work of rerunning transactions (as well as cleans up aborted
   * transactions and whatnot).
   *
   * @param queue The queue of transactions to run.
   * @param path The path the queue is for.
   */
  private rerunTransactionQueue_(queue: Transaction[], path: Path) {
    if (queue.length === 0) {
      return; // Nothing to do!
    }

    // Queue up the callbacks and fire them after cleaning up all of our
    // transaction state, since the callback could trigger more transactions or
    // sets.
    const callbacks = [];
    let events: Event[] = [];
    // Ignore all of the sets we're going to re-run.
    const txnsToRerun = queue.filter(q => {
      return q.status === TransactionStatus.RUN;
    });
    const setsToIgnore = txnsToRerun.map(q => {
      return q.currentWriteId;
    });
    for (let i = 0; i < queue.length; i++) {
      const transaction = queue[i];
      const relativePath = Path.relativePath(path, transaction.path);
      let abortTransaction = false,
        abortReason;
      assert(
        relativePath !== null,
        'rerunTransactionsUnderNode_: relativePath should not be null.'
      );

      if (transaction.status === TransactionStatus.NEEDS_ABORT) {
        abortTransaction = true;
        abortReason = transaction.abortReason;
        events = events.concat(
          this.serverSyncTree_.ackUserWrite(transaction.currentWriteId, true)
        );
      } else if (transaction.status === TransactionStatus.RUN) {
        if (transaction.retryCount >= MAX_TRANSACTION_RETRIES) {
          abortTransaction = true;
          abortReason = 'maxretry';
          events = events.concat(
            this.serverSyncTree_.ackUserWrite(transaction.currentWriteId, true)
          );
        } else {
          // This code reruns a transaction
          const currentNode = this.getLatestState_(
            transaction.path,
            setsToIgnore
          );
          transaction.currentInputSnapshot = currentNode;
          const newData = queue[i].update(currentNode.val());
          if (newData !== undefined) {
            validateFirebaseData(
              'transaction failed: Data returned ',
              newData,
              transaction.path
            );
            let newDataNode = nodeFromJSON(newData);
            const hasExplicitPriority =
              typeof newData === 'object' &&
              newData != null &&
              contains(newData, '.priority');
            if (!hasExplicitPriority) {
              // Keep the old priority if there wasn't a priority explicitly specified.
              newDataNode = newDataNode.updatePriority(
                currentNode.getPriority()
              );
            }

            const oldWriteId = transaction.currentWriteId;
            const serverValues = this.generateServerValues();
            const newNodeResolved = resolveDeferredValueSnapshot(
              newDataNode,
              currentNode,
              serverValues
            );

            transaction.currentOutputSnapshotRaw = newDataNode;
            transaction.currentOutputSnapshotResolved = newNodeResolved;
            transaction.currentWriteId = this.getNextWriteId_();
            // Mutates setsToIgnore in place
            setsToIgnore.splice(setsToIgnore.indexOf(oldWriteId), 1);
            events = events.concat(
              this.serverSyncTree_.applyUserOverwrite(
                transaction.path,
                newNodeResolved,
                transaction.currentWriteId,
                transaction.applyLocally
              )
            );
            events = events.concat(
              this.serverSyncTree_.ackUserWrite(oldWriteId, true)
            );
          } else {
            abortTransaction = true;
            abortReason = 'nodata';
            events = events.concat(
              this.serverSyncTree_.ackUserWrite(
                transaction.currentWriteId,
                true
              )
            );
          }
        }
      }
      this.eventQueue_.raiseEventsForChangedPath(path, events);
      events = [];
      if (abortTransaction) {
        // Abort.
        queue[i].status = TransactionStatus.COMPLETED;

        // Removing a listener can trigger pruning which can muck with
        // mergedData/visibleData (as it prunes data). So defer the unwatcher
        // until we're done.
        (function (unwatcher) {
          setTimeout(unwatcher, Math.floor(0));
        })(queue[i].unwatcher);

        if (queue[i].onComplete) {
          if (abortReason === 'nodata') {
            const ref = new Reference(this, queue[i].path);
            // We set this field immediately, so it's safe to cast to an actual snapshot
            const lastInput /** @type {!Node} */ =
              queue[i].currentInputSnapshot;
            const snapshot = new DataSnapshot(lastInput, ref, PRIORITY_INDEX);
            callbacks.push(
              queue[i].onComplete.bind(null, null, false, snapshot)
            );
          } else {
            callbacks.push(
              queue[i].onComplete.bind(
                null,
                new Error(abortReason),
                false,
                null
              )
            );
          }
        }
      }
    }

    // Clean up completed transactions.
    this.pruneCompletedTransactionsBelowNode_(this.transactionQueueTree_);

    // Now fire callbacks, now that we're in a good, known state.
    for (let i = 0; i < callbacks.length; i++) {
      exceptionGuard(callbacks[i]);
    }

    // Try to send the transaction result to the server.
    this.sendReadyTransactions_();
  }

  /**
   * Returns the rootmost ancestor node of the specified path that has a pending
   * transaction on it, or just returns the node for the given path if there are
   * no pending transactions on any ancestor.
   *
   * @param path The location to start at.
   * @return The rootmost node with a transaction.
   */
  private getAncestorTransactionNode_(path: Path): Tree<Transaction[]> {
    let front;

    // Start at the root and walk deeper into the tree towards path until we
    // find a node with pending transactions.
    let transactionNode = this.transactionQueueTree_;
    front = path.getFront();
    while (front !== null && transactionNode.getValue() === null) {
      transactionNode = transactionNode.subTree(front);
      path = path.popFront();
      front = path.getFront();
    }

    return transactionNode;
  }

  /**
   * Builds the queue of all transactions at or below the specified
   * transactionNode.
   *
   * @param transactionNode
   * @return The generated queue.
   */
  private buildTransactionQueue_(
    transactionNode: Tree<Transaction[]>
  ): Transaction[] {
    // Walk any child transaction queues and aggregate them into a single queue.
    const transactionQueue: Transaction[] = [];
    this.aggregateTransactionQueuesForNode_(transactionNode, transactionQueue);

    // Sort them by the order the transactions were created.
    transactionQueue.sort((a, b) => {
      return a.order - b.order;
    });

    return transactionQueue;
  }

  private aggregateTransactionQueuesForNode_(
    node: Tree<Transaction[]>,
    queue: Transaction[]
  ) {
    const nodeQueue = node.getValue();
    if (nodeQueue !== null) {
      for (let i = 0; i < nodeQueue.length; i++) {
        queue.push(nodeQueue[i]);
      }
    }

    node.forEachChild(child => {
      this.aggregateTransactionQueuesForNode_(child, queue);
    });
  }

  /**
   * Remove COMPLETED transactions at or below this node in the transactionQueueTree_.
   */
  private pruneCompletedTransactionsBelowNode_(node: Tree<Transaction[]>) {
    const queue = node.getValue();
    if (queue) {
      let to = 0;
      for (let from = 0; from < queue.length; from++) {
        if (queue[from].status !== TransactionStatus.COMPLETED) {
          queue[to] = queue[from];
          to++;
        }
      }
      queue.length = to;
      node.setValue(queue.length > 0 ? queue : null);
    }

    node.forEachChild(childNode => {
      this.pruneCompletedTransactionsBelowNode_(childNode);
    });
  }

  /**
   * Aborts all transactions on ancestors or descendants of the specified path.
   * Called when doing a set() or update() since we consider them incompatible
   * with transactions.
   *
   * @param path Path for which we want to abort related transactions.
   */
  private abortTransactions_(path: Path): Path {
    const affectedPath = this.getAncestorTransactionNode_(path).path();

    const transactionNode = this.transactionQueueTree_.subTree(path);

    transactionNode.forEachAncestor((node: Tree<Transaction[]>) => {
      this.abortTransactionsOnNode_(node);
    });

    this.abortTransactionsOnNode_(transactionNode);

    transactionNode.forEachDescendant((node: Tree<Transaction[]>) => {
      this.abortTransactionsOnNode_(node);
    });

    return affectedPath;
  }

  /**
   * Abort transactions stored in this transaction queue node.
   *
   * @param node Node to abort transactions for.
   */
  private abortTransactionsOnNode_(node: Tree<Transaction[]>) {
    const queue = node.getValue();
    if (queue !== null) {
      // Queue up the callbacks and fire them after cleaning up all of our
      // transaction state, since the callback could trigger more transactions
      // or sets.
      const callbacks = [];

      // Go through queue.  Any already-sent transactions must be marked for
      // abort, while the unsent ones can be immediately aborted and removed.
      let events: Event[] = [];
      let lastSent = -1;
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].status === TransactionStatus.SENT_NEEDS_ABORT) {
          // Already marked.  No action needed.
        } else if (queue[i].status === TransactionStatus.SENT) {
          assert(
            lastSent === i - 1,
            'All SENT items should be at beginning of queue.'
          );
          lastSent = i;
          // Mark transaction for abort when it comes back.
          queue[i].status = TransactionStatus.SENT_NEEDS_ABORT;
          queue[i].abortReason = 'set';
        } else {
          assert(
            queue[i].status === TransactionStatus.RUN,
            'Unexpected transaction status in abort'
          );
          // We can abort it immediately.
          queue[i].unwatcher();
          events = events.concat(
            this.serverSyncTree_.ackUserWrite(queue[i].currentWriteId, true)
          );
          if (queue[i].onComplete) {
            const snapshot: DataSnapshot | null = null;
            callbacks.push(
              queue[i].onComplete.bind(null, new Error('set'), false, snapshot)
            );
          }
        }
      }
      if (lastSent === -1) {
        // We're not waiting for any sent transactions.  We can clear the queue.
        node.setValue(null);
      } else {
        // Remove the transactions we aborted.
        queue.length = lastSent + 1;
      }

      // Now fire the callbacks.
      this.eventQueue_.raiseEventsForChangedPath(node.path(), events);
      for (let i = 0; i < callbacks.length; i++) {
        exceptionGuard(callbacks[i]);
      }
    }
  }
}
