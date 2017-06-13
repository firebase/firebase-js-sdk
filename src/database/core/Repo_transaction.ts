import { assert } from "../../utils/assert";
import { Reference } from "../api/Reference";
import { DataSnapshot } from "../api/DataSnapshot";
import { Path } from "./util/Path";
import { Tree } from "./util/Tree";
import { PriorityIndex } from "./snap/IndexFactory";
import { 
  LUIDGenerator,
  warn,
  exceptionGuard,
} from "./util/util";
import { resolveDeferredValueSnapshot } from "./util/ServerValues";
import { isValidPriority, validateFirebaseData } from "./util/validation";
import { contains } from "../../utils/obj";
import { nodeFromJSON } from "./snap/nodeFromJSON";
import { ChildrenNode } from "./snap/ChildrenNode";
import { Repo } from "./Repo";

// TODO: This is pretty messy.  Ideally, a lot of this would move into FirebaseData, or a transaction-specific
// component used by FirebaseData, but it has ties to user callbacks (transaction update and onComplete) as well
// as the realtime connection (to send transactions to the server).  So that all needs to be decoupled first.
// For now it's part of Repo, but in its own file.

/**
 * @enum {number}
 */
export const TransactionStatus = {
  // We've run the transaction and updated transactionResultData_ with the result, but it isn't currently sent to the
  // server. A transaction will go from RUN -> SENT -> RUN if it comes back from the server as rejected due to
  // mismatched hash.
  RUN: 1,

  // We've run the transaction and sent it to the server and it's currently outstanding (hasn't come back as accepted
  // or rejected yet).
  SENT: 2,

  // Temporary state used to mark completed transactions (whether successful or aborted).  The transaction will be
  // removed when we get a chance to prune completed ones.
  COMPLETED: 3,

  // Used when an already-sent transaction needs to be aborted (e.g. due to a conflicting set() call that was made).
  // If it comes back as unsuccessful, we'll abort it.
  SENT_NEEDS_ABORT: 4,

  // Temporary state used to mark transactions that need to be aborted.
  NEEDS_ABORT: 5
};

/**
 * If a transaction does not succeed after 25 retries, we abort it.  Among other things this ensure that if there's
 * ever a bug causing a mismatch between client / server hashes for some data, we won't retry indefinitely.
 * @type {number}
 * @const
 * @private
 */
(Repo as any).MAX_TRANSACTION_RETRIES_ = 25;

/**
 * @typedef {{
 *   path: !Path,
 *   update: function(*):*,
 *   onComplete: ?function(?Error, boolean, ?DataSnapshot),
 *   status: ?TransactionStatus,
 *   order: !number,
 *   applyLocally: boolean,
 *   retryCount: !number,
 *   unwatcher: function(),
 *   abortReason: ?string,
 *   currentWriteId: !number,
 *   currentHash: ?string,
 *   currentInputSnapshot: ?Node,
 *   currentOutputSnapshotRaw: ?Node,
 *   currentOutputSnapshotResolved: ?Node
 * }}
 */

/**
 * Setup the transaction data structures
 * @private
 */
(Repo.prototype as any).transactions_init_ = function() {
  /**
   * Stores queues of outstanding transactions for Firebase locations.
   *
   * @type {!Tree.<Array.<!Transaction>>}
   * @private
   */
  this.transactionQueueTree_ = new Tree();
};

declare module './Repo' {
  interface Repo {
    startTransaction(path: Path, transactionUpdate, onComplete, applyLocally): void
  }
}

/**
 * Creates a new transaction, adds it to the transactions we're tracking, and sends it to the server if possible.
 *
 * @param {!Path} path Path at which to do transaction.
 * @param {function(*):*} transactionUpdate Update callback.
 * @param {?function(?Error, boolean, ?DataSnapshot)} onComplete Completion callback.
 * @param {boolean} applyLocally Whether or not to make intermediate results visible
 */
(Repo.prototype as any).startTransaction = function(path, transactionUpdate, onComplete, applyLocally) {
  this.log_('transaction on ' + path);

  // Add a watch to make sure we get server updates.
  var valueCallback = function() { };
  var watchRef = new Reference(this, path);
  watchRef.on('value', valueCallback);
  var unwatcher = function() { watchRef.off('value', valueCallback); };

  // Initialize transaction.
  var transaction = /** @type {Transaction} */ ({
    path: path,
    update: transactionUpdate,
    onComplete: onComplete,

    // One of TransactionStatus enums.
    status: null,

    // Used when combining transactions at different locations to figure out which one goes first.
    order: LUIDGenerator(),

    // Whether to raise local events for this transaction.
    applyLocally: applyLocally,

    // Count of how many times we've retried the transaction.
    retryCount: 0,

    // Function to call to clean up our .on() listener.
    unwatcher: unwatcher,

    // Stores why a transaction was aborted.
    abortReason: null,

    currentWriteId: null,

    currentInputSnapshot: null,

    currentOutputSnapshotRaw: null,

    currentOutputSnapshotResolved: null
  });


  // Run transaction initially.
  var currentState = this.getLatestState_(path);
  transaction.currentInputSnapshot = currentState;
  var newVal = transaction.update(currentState.val());
  if (newVal === undefined) {
    // Abort transaction.
    transaction.unwatcher();
    transaction.currentOutputSnapshotRaw = null;
    transaction.currentOutputSnapshotResolved = null;
    if (transaction.onComplete) {
      // We just set the input snapshot, so this cast should be safe
      var snapshot = new DataSnapshot(/** @type {!Node} */ (transaction.currentInputSnapshot),
        new Reference(this, transaction.path), PriorityIndex);
      transaction.onComplete(/*error=*/null, /*committed=*/false, snapshot);
    }
  } else {
    validateFirebaseData('transaction failed: Data returned ', newVal, transaction.path);

    // Mark as run and add to our queue.
    transaction.status = TransactionStatus.RUN;
    var queueNode = this.transactionQueueTree_.subTree(path);
    var nodeQueue = queueNode.getValue() || [];
    nodeQueue.push(transaction);

    queueNode.setValue(nodeQueue);

    // Update visibleData and raise events
    // Note: We intentionally raise events after updating all of our transaction state, since the user could
    // start new transactions from the event callbacks.
    var priorityForNode;
    if (typeof newVal === 'object' && newVal !== null && contains(newVal, '.priority')) {
      priorityForNode = newVal['.priority'];
      assert(isValidPriority(priorityForNode), 'Invalid priority returned by transaction. ' +
        'Priority must be a valid string, finite number, server value, or null.');
    } else {
      var currentNode = this.serverSyncTree_.calcCompleteEventCache(path) || ChildrenNode.EMPTY_NODE;
      priorityForNode = currentNode.getPriority().val();
    }
    priorityForNode = /** @type {null|number|string} */ (priorityForNode);

    var serverValues = this.generateServerValues();
    var newNodeUnresolved = nodeFromJSON(newVal, priorityForNode);
    var newNode = resolveDeferredValueSnapshot(newNodeUnresolved, serverValues);
    transaction.currentOutputSnapshotRaw = newNodeUnresolved;
    transaction.currentOutputSnapshotResolved = newNode;
    transaction.currentWriteId = this.getNextWriteId_();

    var events = this.serverSyncTree_.applyUserOverwrite(path, newNode, transaction.currentWriteId,
      transaction.applyLocally);
    this.eventQueue_.raiseEventsForChangedPath(path, events);

    this.sendReadyTransactions_();
  }
};

/**
 * @param {!Path} path
 * @param {Array.<number>=} excludeSets A specific set to exclude
 * @return {Node}
 * @private
 */
(Repo.prototype as any).getLatestState_ = function(path, excludeSets) {
  return this.serverSyncTree_.calcCompleteEventCache(path, excludeSets) || ChildrenNode.EMPTY_NODE;
};


/**
 * Sends any already-run transactions that aren't waiting for outstanding transactions to
 * complete.
 *
 * Externally it's called with no arguments, but it calls itself recursively with a particular
 * transactionQueueTree node to recurse through the tree.
 *
 * @param {Tree.<Array.<Transaction>>=} opt_node  transactionQueueTree node to start at.
 * @private
 */
(Repo.prototype as any).sendReadyTransactions_ = function(opt_node) {
  var node = /** @type {!Tree.<Array.<!Transaction>>} */ (opt_node || this.transactionQueueTree_);

  // Before recursing, make sure any completed transactions are removed.
  if (!opt_node) {
    this.pruneCompletedTransactionsBelowNode_(node);
  }

  if (node.getValue() !== null) {
    var queue = this.buildTransactionQueue_(node);
    assert(queue.length > 0, 'Sending zero length transaction queue');

    var allRun = queue.every(function(transaction) {
      return transaction.status === TransactionStatus.RUN;
    });

    // If they're all run (and not sent), we can send them.  Else, we must wait.
    if (allRun) {
      this.sendTransactionQueue_(node.path(), queue);
    }
  } else if (node.hasChildren()) {
    var self = this;
    node.forEachChild(function(childNode) {
      self.sendReadyTransactions_(childNode);
    });
  }
};


/**
 * Given a list of run transactions, send them to the server and then handle the result (success or failure).
 *
 * @param {!Path} path The location of the queue.
 * @param {!Array.<Transaction>} queue Queue of transactions under the specified location.
 * @private
 */
(Repo.prototype as any).sendTransactionQueue_ = function(path, queue) {
  // Mark transactions as sent and increment retry count!
  var setsToIgnore = queue.map(function(txn) { return txn.currentWriteId; });
  var latestState = this.getLatestState_(path, setsToIgnore);
  var snapToSend = latestState;
  var latestHash = latestState.hash();
  for (var i = 0; i < queue.length; i++) {
    var txn = queue[i];
    assert(txn.status === TransactionStatus.RUN,
      'tryToSendTransactionQueue_: items in queue should all be run.');
    txn.status = TransactionStatus.SENT;
    txn.retryCount++;
    var relativePath = Path.relativePath(path, txn.path);
    // If we've gotten to this point, the output snapshot must be defined.
    snapToSend = snapToSend.updateChild(relativePath, /**@type {!Node} */ (txn.currentOutputSnapshotRaw));
  }

  var dataToSend = snapToSend.val(true);
  var pathToSend = path;

  // Send the put.
  var self = this;
  this.server_.put(pathToSend.toString(), dataToSend, function(status) {
    self.log_('transaction put response', {path: pathToSend.toString(), status: status});

    var events = [];
    if (status === 'ok') {
      // Queue up the callbacks and fire them after cleaning up all of our transaction state, since
      // the callback could trigger more transactions or sets.
      var callbacks = [];
      for (i = 0; i < queue.length; i++) {
        queue[i].status = TransactionStatus.COMPLETED;
        events = events.concat(self.serverSyncTree_.ackUserWrite(queue[i].currentWriteId));
        if (queue[i].onComplete) {
          // We never unset the output snapshot, and given that this transaction is complete, it should be set
          var node = /** @type {!Node} */ (queue[i].currentOutputSnapshotResolved);
          var ref = new Reference(self, queue[i].path);
          var snapshot = new DataSnapshot(node, ref, PriorityIndex);
          callbacks.push(queue[i].onComplete.bind(null, null, true, snapshot));
        }
        queue[i].unwatcher();
      }

      // Now remove the completed transactions.
      self.pruneCompletedTransactionsBelowNode_(self.transactionQueueTree_.subTree(path));
      // There may be pending transactions that we can now send.
      self.sendReadyTransactions_();

      self.eventQueue_.raiseEventsForChangedPath(path, events);

      // Finally, trigger onComplete callbacks.
      for (i = 0; i < callbacks.length; i++) {
        exceptionGuard(callbacks[i]);
      }
    } else {
      // transactions are no longer sent.  Update their status appropriately.
      if (status === 'datastale') {
        for (i = 0; i < queue.length; i++) {
          if (queue[i].status === TransactionStatus.SENT_NEEDS_ABORT)
            queue[i].status = TransactionStatus.NEEDS_ABORT;
          else
            queue[i].status = TransactionStatus.RUN;
        }
      } else {
        warn('transaction at ' + pathToSend.toString() + ' failed: ' + status);
        for (i = 0; i < queue.length; i++) {
          queue[i].status = TransactionStatus.NEEDS_ABORT;
          queue[i].abortReason = status;
        }
      }

      self.rerunTransactions_(path);
    }
  }, latestHash);
};

/**
 * Finds all transactions dependent on the data at changedPath and reruns them.
 *
 * Should be called any time cached data changes.
 *
 * Return the highest path that was affected by rerunning transactions.  This is the path at which events need to
 * be raised for.
 *
 * @param {!Path} changedPath The path in mergedData that changed.
 * @return {!Path} The rootmost path that was affected by rerunning transactions.
 * @private
 */
(Repo.prototype as any).rerunTransactions_ = function(changedPath) {
  var rootMostTransactionNode = this.getAncestorTransactionNode_(changedPath);
  var path = rootMostTransactionNode.path();

  var queue = this.buildTransactionQueue_(rootMostTransactionNode);
  this.rerunTransactionQueue_(queue, path);

  return path;
};


/**
 * Does all the work of rerunning transactions (as well as cleans up aborted transactions and whatnot).
 *
 * @param {Array.<Transaction>} queue The queue of transactions to run.
 * @param {!Path} path The path the queue is for.
 * @private
 */
(Repo.prototype as any).rerunTransactionQueue_ = function(queue, path) {
  if (queue.length === 0) {
    return; // Nothing to do!
  }

  // Queue up the callbacks and fire them after cleaning up all of our transaction state, since
  // the callback could trigger more transactions or sets.
  var callbacks = [];
  var events = [];
  // Ignore all of the sets we're going to re-run.
  var txnsToRerun = queue.filter(function(q) { return q.status === TransactionStatus.RUN; });
  var setsToIgnore = txnsToRerun.map(function(q) { return q.currentWriteId; });
  for (var i = 0; i < queue.length; i++) {
    var transaction = queue[i];
    var relativePath = Path.relativePath(path, transaction.path);
    var abortTransaction = false, abortReason;
    assert(relativePath !== null, 'rerunTransactionsUnderNode_: relativePath should not be null.');

    if (transaction.status === TransactionStatus.NEEDS_ABORT) {
      abortTransaction = true;
      abortReason = transaction.abortReason;
      events = events.concat(this.serverSyncTree_.ackUserWrite(transaction.currentWriteId, true));
    } else if (transaction.status === TransactionStatus.RUN) {
      if (transaction.retryCount >= (Repo as any).MAX_TRANSACTION_RETRIES_) {
        abortTransaction = true;
        abortReason = 'maxretry';
        events = events.concat(this.serverSyncTree_.ackUserWrite(transaction.currentWriteId, true));
      } else {
        // This code reruns a transaction
        var currentNode = this.getLatestState_(transaction.path, setsToIgnore);
        transaction.currentInputSnapshot = currentNode;
        var newData = queue[i].update(currentNode.val());
        if (newData !== undefined) {
          validateFirebaseData('transaction failed: Data returned ', newData, transaction.path);
          var newDataNode = nodeFromJSON(newData);
          var hasExplicitPriority = (typeof newData === 'object' && newData != null &&
            contains(newData, '.priority'));
          if (!hasExplicitPriority) {
            // Keep the old priority if there wasn't a priority explicitly specified.
            newDataNode = newDataNode.updatePriority(currentNode.getPriority());
          }

          var oldWriteId = transaction.currentWriteId;
          var serverValues = this.generateServerValues();
          var newNodeResolved = resolveDeferredValueSnapshot(newDataNode, serverValues);

          transaction.currentOutputSnapshotRaw = newDataNode;
          transaction.currentOutputSnapshotResolved = newNodeResolved;
          transaction.currentWriteId = this.getNextWriteId_();
          // Mutates setsToIgnore in place
          setsToIgnore.splice(setsToIgnore.indexOf(oldWriteId));
          events = events.concat(
            this.serverSyncTree_.applyUserOverwrite(transaction.path, newNodeResolved, transaction.currentWriteId,
              transaction.applyLocally)
          );
          events = events.concat(this.serverSyncTree_.ackUserWrite(oldWriteId, true));
        } else {
          abortTransaction = true;
          abortReason = 'nodata';
          events = events.concat(this.serverSyncTree_.ackUserWrite(transaction.currentWriteId, true));
        }
      }
    }
    this.eventQueue_.raiseEventsForChangedPath(path, events);
    events = [];
    if (abortTransaction) {
      // Abort.
      queue[i].status = TransactionStatus.COMPLETED;

      // Removing a listener can trigger pruning which can muck with mergedData/visibleData (as it prunes data).
      // So defer the unwatcher until we're done.
      (function(unwatcher) {
        setTimeout(unwatcher, Math.floor(0));
      })(queue[i].unwatcher);

      if (queue[i].onComplete) {
        if (abortReason === 'nodata') {
          var ref = new Reference(this, queue[i].path);
          // We set this field immediately, so it's safe to cast to an actual snapshot
          var lastInput = /** @type {!Node} */ (queue[i].currentInputSnapshot);
          var snapshot = new DataSnapshot(lastInput, ref, PriorityIndex);
          callbacks.push(queue[i].onComplete.bind(null, null, false, snapshot));
        } else {
          callbacks.push(queue[i].onComplete.bind(null, new Error(abortReason), false, null));
        }
      }
    }
  }

  // Clean up completed transactions.
  this.pruneCompletedTransactionsBelowNode_(this.transactionQueueTree_);

  // Now fire callbacks, now that we're in a good, known state.
  for (i = 0; i < callbacks.length; i++) {
    exceptionGuard(callbacks[i]);
  }

  // Try to send the transaction result to the server.
  this.sendReadyTransactions_();
};


/**
 * Returns the rootmost ancestor node of the specified path that has a pending transaction on it, or just returns
 * the node for the given path if there are no pending transactions on any ancestor.
 *
 * @param {!Path} path The location to start at.
 * @return {!Tree.<Array.<!Transaction>>} The rootmost node with a transaction.
 * @private
 */
(Repo.prototype as any).getAncestorTransactionNode_ = function(path) {
  var front;

  // Start at the root and walk deeper into the tree towards path until we find a node with pending transactions.
  var transactionNode = this.transactionQueueTree_;
  while ((front = path.getFront()) !== null && transactionNode.getValue() === null) {
    transactionNode = transactionNode.subTree(front);
    path = path.popFront();
  }

  return transactionNode;
};


/**
 * Builds the queue of all transactions at or below the specified transactionNode.
 *
 * @param {!Tree.<Array.<Transaction>>} transactionNode
 * @return {Array.<Transaction>} The generated queue.
 * @private
 */
(Repo.prototype as any).buildTransactionQueue_ = function(transactionNode) {
  // Walk any child transaction queues and aggregate them into a single queue.
  var transactionQueue = [];
  this.aggregateTransactionQueuesForNode_(transactionNode, transactionQueue);

  // Sort them by the order the transactions were created.
  transactionQueue.sort(function(a, b) { return a.order - b.order; });

  return transactionQueue;
};

/**
 * @param {!Tree.<Array.<Transaction>>} node
 * @param {Array.<Transaction>} queue
 * @private
 */
(Repo.prototype as any).aggregateTransactionQueuesForNode_ = function(node, queue) {
  var nodeQueue = node.getValue();
  if (nodeQueue !== null) {
    for (var i = 0; i < nodeQueue.length; i++) {
      queue.push(nodeQueue[i]);
    }
  }

  var self = this;
  node.forEachChild(function(child) {
    self.aggregateTransactionQueuesForNode_(child, queue);
  });
};


/**
 * Remove COMPLETED transactions at or below this node in the transactionQueueTree_.
 *
 * @param {!Tree.<Array.<!Transaction>>} node
 * @private
 */
(Repo.prototype as any).pruneCompletedTransactionsBelowNode_ = function(node) {
  var queue = node.getValue();
  if (queue) {
    var to = 0;
    for (var from = 0; from < queue.length; from++) {
      if (queue[from].status !== TransactionStatus.COMPLETED) {
        queue[to] = queue[from];
        to++;
      }
    }
    queue.length = to;
    node.setValue(queue.length > 0 ? queue : null);
  }

  var self = this;
  node.forEachChild(function(childNode) {
    self.pruneCompletedTransactionsBelowNode_(childNode);
  });
};


/**
 * Aborts all transactions on ancestors or descendants of the specified path.  Called when doing a set() or update()
 * since we consider them incompatible with transactions.
 *
 * @param {!Path} path Path for which we want to abort related transactions.
 * @return {!Path}
 * @private
 */
(Repo.prototype as any).abortTransactions_ = function(path) {
  var affectedPath = this.getAncestorTransactionNode_(path).path();

  var transactionNode = this.transactionQueueTree_.subTree(path);
  var self = this;

  transactionNode.forEachAncestor(function(node) {
    self.abortTransactionsOnNode_(node);
  });

  this.abortTransactionsOnNode_(transactionNode);

  transactionNode.forEachDescendant(function(node) {
    self.abortTransactionsOnNode_(node);
  });

  return affectedPath;
};


/**
 * Abort transactions stored in this transaction queue node.
 *
 * @param {!Tree.<Array.<Transaction>>} node Node to abort transactions for.
 * @private
 */
(Repo.prototype as any).abortTransactionsOnNode_ = function(node) {
  var queue = node.getValue();
  if (queue !== null) {

    // Queue up the callbacks and fire them after cleaning up all of our transaction state, since
    // the callback could trigger more transactions or sets.
    var callbacks = [];

    // Go through queue.  Any already-sent transactions must be marked for abort, while the unsent ones
    // can be immediately aborted and removed.
    var events = [];
    var lastSent = -1;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].status === TransactionStatus.SENT_NEEDS_ABORT) {
        // Already marked.  No action needed.
      } else if (queue[i].status === TransactionStatus.SENT) {
        assert(lastSent === i - 1, 'All SENT items should be at beginning of queue.');
        lastSent = i;
        // Mark transaction for abort when it comes back.
        queue[i].status = TransactionStatus.SENT_NEEDS_ABORT;
        queue[i].abortReason = 'set';
      } else {
        assert(queue[i].status === TransactionStatus.RUN,
          'Unexpected transaction status in abort');
        // We can abort it immediately.
        queue[i].unwatcher();
        events = events.concat(this.serverSyncTree_.ackUserWrite(queue[i].currentWriteId, true));
        if (queue[i].onComplete) {
          var snapshot = null;
          callbacks.push(queue[i].onComplete.bind(null, new Error('set'), false, snapshot));
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
    for (i = 0; i < callbacks.length; i++) {
      exceptionGuard(callbacks[i]);
    }
  }
};
