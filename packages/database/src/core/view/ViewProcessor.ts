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

import { Operation, OperationType } from '../operation/Operation';
import { assert, assertionError } from '@firebase/util';
import { ChildChangeAccumulator } from './ChildChangeAccumulator';
import { Change } from './Change';
import { ChildrenNode } from '../snap/ChildrenNode';
import { KEY_INDEX } from '../snap/indexes/KeyIndex';
import { ImmutableTree } from '../util/ImmutableTree';
import { Path } from '../util/Path';
import {
  WriteTreeCompleteChildSource,
  NO_COMPLETE_CHILD_SOURCE,
  CompleteChildSource
} from './CompleteChildSource';
import { ViewCache } from './ViewCache';
import { NodeFilter } from './filter/NodeFilter';
import { WriteTreeRef } from '../WriteTree';
import { Overwrite } from '../operation/Overwrite';
import { Merge } from '../operation/Merge';
import { AckUserWrite } from '../operation/AckUserWrite';
import { Node } from '../snap/Node';

/**
 * @constructor
 * @struct
 */
export class ProcessorResult {
  /**
   * @param {!ViewCache} viewCache
   * @param {!Array.<!Change>} changes
   */
  constructor(
    public readonly viewCache: ViewCache,
    public readonly changes: Change[]
  ) {}
}

/**
 * @constructor
 */
export class ViewProcessor {
  /**
   * @param {!NodeFilter} filter_
   */
  constructor(private readonly filter_: NodeFilter) {}

  /**
   * @param {!ViewCache} viewCache
   */
  assertIndexed(viewCache: ViewCache) {
    assert(
      viewCache.getEventCache().getNode().isIndexed(this.filter_.getIndex()),
      'Event snap not indexed'
    );
    assert(
      viewCache.getServerCache().getNode().isIndexed(this.filter_.getIndex()),
      'Server snap not indexed'
    );
  }

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!Operation} operation
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} completeCache
   * @return {!ProcessorResult}
   */
  applyOperation(
    oldViewCache: ViewCache,
    operation: Operation,
    writesCache: WriteTreeRef,
    completeCache: Node | null
  ): ProcessorResult {
    const accumulator = new ChildChangeAccumulator();
    let newViewCache, filterServerNode;
    if (operation.type === OperationType.OVERWRITE) {
      const overwrite = operation as Overwrite;
      if (overwrite.source.fromUser) {
        newViewCache = this.applyUserOverwrite_(
          oldViewCache,
          overwrite.path,
          overwrite.snap,
          writesCache,
          completeCache,
          accumulator
        );
      } else {
        assert(overwrite.source.fromServer, 'Unknown source.');
        // We filter the node if it's a tagged update or the node has been previously filtered  and the
        // update is not at the root in which case it is ok (and necessary) to mark the node unfiltered
        // again
        filterServerNode =
          overwrite.source.tagged ||
          (oldViewCache.getServerCache().isFiltered() &&
            !overwrite.path.isEmpty());
        newViewCache = this.applyServerOverwrite_(
          oldViewCache,
          overwrite.path,
          overwrite.snap,
          writesCache,
          completeCache,
          filterServerNode,
          accumulator
        );
      }
    } else if (operation.type === OperationType.MERGE) {
      const merge = operation as Merge;
      if (merge.source.fromUser) {
        newViewCache = this.applyUserMerge_(
          oldViewCache,
          merge.path,
          merge.children,
          writesCache,
          completeCache,
          accumulator
        );
      } else {
        assert(merge.source.fromServer, 'Unknown source.');
        // We filter the node if it's a tagged update or the node has been previously filtered
        filterServerNode =
          merge.source.tagged || oldViewCache.getServerCache().isFiltered();
        newViewCache = this.applyServerMerge_(
          oldViewCache,
          merge.path,
          merge.children,
          writesCache,
          completeCache,
          filterServerNode,
          accumulator
        );
      }
    } else if (operation.type === OperationType.ACK_USER_WRITE) {
      const ackUserWrite = operation as AckUserWrite;
      if (!ackUserWrite.revert) {
        newViewCache = this.ackUserWrite_(
          oldViewCache,
          ackUserWrite.path,
          ackUserWrite.affectedTree,
          writesCache,
          completeCache,
          accumulator
        );
      } else {
        newViewCache = this.revertUserWrite_(
          oldViewCache,
          ackUserWrite.path,
          writesCache,
          completeCache,
          accumulator
        );
      }
    } else if (operation.type === OperationType.LISTEN_COMPLETE) {
      newViewCache = this.listenComplete_(
        oldViewCache,
        operation.path,
        writesCache,
        accumulator
      );
    } else {
      throw assertionError('Unknown operation type: ' + operation.type);
    }
    const changes = accumulator.getChanges();
    ViewProcessor.maybeAddValueEvent_(oldViewCache, newViewCache, changes);
    return new ProcessorResult(newViewCache, changes);
  }

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!ViewCache} newViewCache
   * @param {!Array.<!Change>} accumulator
   * @private
   */
  private static maybeAddValueEvent_(
    oldViewCache: ViewCache,
    newViewCache: ViewCache,
    accumulator: Change[]
  ) {
    const eventSnap = newViewCache.getEventCache();
    if (eventSnap.isFullyInitialized()) {
      const isLeafOrEmpty =
        eventSnap.getNode().isLeafNode() || eventSnap.getNode().isEmpty();
      const oldCompleteSnap = oldViewCache.getCompleteEventSnap();
      if (
        accumulator.length > 0 ||
        !oldViewCache.getEventCache().isFullyInitialized() ||
        (isLeafOrEmpty &&
          !eventSnap.getNode().equals /** @type {!Node} */(oldCompleteSnap)) ||
        !eventSnap.getNode().getPriority().equals(oldCompleteSnap.getPriority())
      ) {
        accumulator.push(
          Change.valueChange(
            /** @type {!Node} */ newViewCache.getCompleteEventSnap()
          )
        );
      }
    }
  }

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} changePath
   * @param {!WriteTreeRef} writesCache
   * @param {!CompleteChildSource} source
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  private generateEventCacheAfterServerEvent_(
    viewCache: ViewCache,
    changePath: Path,
    writesCache: WriteTreeRef,
    source: CompleteChildSource,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldEventSnap = viewCache.getEventCache();
    if (writesCache.shadowingWrite(changePath) != null) {
      // we have a shadowing write, ignore changes
      return viewCache;
    } else {
      let newEventCache, serverNode;
      if (changePath.isEmpty()) {
        // TODO: figure out how this plays with "sliding ack windows"
        assert(
          viewCache.getServerCache().isFullyInitialized(),
          'If change path is empty, we must have complete server data'
        );
        if (viewCache.getServerCache().isFiltered()) {
          // We need to special case this, because we need to only apply writes to complete children, or
          // we might end up raising events for incomplete children. If the server data is filtered deep
          // writes cannot be guaranteed to be complete
          const serverCache = viewCache.getCompleteServerSnap();
          const completeChildren =
            serverCache instanceof ChildrenNode
              ? serverCache
              : ChildrenNode.EMPTY_NODE;
          const completeEventChildren = writesCache.calcCompleteEventChildren(
            completeChildren
          );
          newEventCache = this.filter_.updateFullNode(
            viewCache.getEventCache().getNode(),
            completeEventChildren,
            accumulator
          );
        } else {
          const completeNode = writesCache.calcCompleteEventCache(
            viewCache.getCompleteServerSnap()
          );
          newEventCache = this.filter_.updateFullNode(
            viewCache.getEventCache().getNode(),
            completeNode,
            accumulator
          );
        }
      } else {
        const childKey = changePath.getFront();
        if (childKey == '.priority') {
          assert(
            changePath.getLength() == 1,
            "Can't have a priority with additional path components"
          );
          const oldEventNode = oldEventSnap.getNode();
          serverNode = viewCache.getServerCache().getNode();
          // we might have overwrites for this priority
          const updatedPriority = writesCache.calcEventCacheAfterServerOverwrite(
            changePath,
            oldEventNode,
            serverNode
          );
          if (updatedPriority != null) {
            newEventCache = this.filter_.updatePriority(
              oldEventNode,
              updatedPriority
            );
          } else {
            // priority didn't change, keep old node
            newEventCache = oldEventSnap.getNode();
          }
        } else {
          const childChangePath = changePath.popFront();
          // update child
          let newEventChild;
          if (oldEventSnap.isCompleteForChild(childKey)) {
            serverNode = viewCache.getServerCache().getNode();
            const eventChildUpdate = writesCache.calcEventCacheAfterServerOverwrite(
              changePath,
              oldEventSnap.getNode(),
              serverNode
            );
            if (eventChildUpdate != null) {
              newEventChild = oldEventSnap
                .getNode()
                .getImmediateChild(childKey)
                .updateChild(childChangePath, eventChildUpdate);
            } else {
              // Nothing changed, just keep the old child
              newEventChild = oldEventSnap
                .getNode()
                .getImmediateChild(childKey);
            }
          } else {
            newEventChild = writesCache.calcCompleteChild(
              childKey,
              viewCache.getServerCache()
            );
          }
          if (newEventChild != null) {
            newEventCache = this.filter_.updateChild(
              oldEventSnap.getNode(),
              childKey,
              newEventChild,
              childChangePath,
              source,
              accumulator
            );
          } else {
            // no complete child available or no change
            newEventCache = oldEventSnap.getNode();
          }
        }
      }
      return viewCache.updateEventSnap(
        newEventCache,
        oldEventSnap.isFullyInitialized() || changePath.isEmpty(),
        this.filter_.filtersNodes()
      );
    }
  }

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!Path} changePath
   * @param {!Node} changedSnap
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} completeCache
   * @param {boolean} filterServerNode
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  applyServerOverwrite_(
    oldViewCache: ViewCache,
    changePath: Path,
    changedSnap: Node,
    writesCache: WriteTreeRef,
    completeCache: Node | null,
    filterServerNode: boolean,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldServerSnap = oldViewCache.getServerCache();
    let newServerCache;
    const serverFilter = filterServerNode
      ? this.filter_
      : this.filter_.getIndexedFilter();
    if (changePath.isEmpty()) {
      newServerCache = serverFilter.updateFullNode(
        oldServerSnap.getNode(),
        changedSnap,
        null
      );
    } else if (serverFilter.filtersNodes() && !oldServerSnap.isFiltered()) {
      // we want to filter the server node, but we didn't filter the server node yet, so simulate a full update
      const newServerNode = oldServerSnap
        .getNode()
        .updateChild(changePath, changedSnap);
      newServerCache = serverFilter.updateFullNode(
        oldServerSnap.getNode(),
        newServerNode,
        null
      );
    } else {
      const childKey = changePath.getFront();
      if (
        !oldServerSnap.isCompleteForPath(changePath) &&
        changePath.getLength() > 1
      ) {
        // We don't update incomplete nodes with updates intended for other listeners
        return oldViewCache;
      }
      const childChangePath = changePath.popFront();
      const childNode = oldServerSnap.getNode().getImmediateChild(childKey);
      const newChildNode = childNode.updateChild(childChangePath, changedSnap);
      if (childKey == '.priority') {
        newServerCache = serverFilter.updatePriority(
          oldServerSnap.getNode(),
          newChildNode
        );
      } else {
        newServerCache = serverFilter.updateChild(
          oldServerSnap.getNode(),
          childKey,
          newChildNode,
          childChangePath,
          NO_COMPLETE_CHILD_SOURCE,
          null
        );
      }
    }
    const newViewCache = oldViewCache.updateServerSnap(
      newServerCache,
      oldServerSnap.isFullyInitialized() || changePath.isEmpty(),
      serverFilter.filtersNodes()
    );
    const source = new WriteTreeCompleteChildSource(
      writesCache,
      newViewCache,
      completeCache
    );
    return this.generateEventCacheAfterServerEvent_(
      newViewCache,
      changePath,
      writesCache,
      source,
      accumulator
    );
  }

  /**
   * @param {!ViewCache} oldViewCache
   * @param {!Path} changePath
   * @param {!Node} changedSnap
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} completeCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  applyUserOverwrite_(
    oldViewCache: ViewCache,
    changePath: Path,
    changedSnap: Node,
    writesCache: WriteTreeRef,
    completeCache: Node | null,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldEventSnap = oldViewCache.getEventCache();
    let newViewCache, newEventCache;
    const source = new WriteTreeCompleteChildSource(
      writesCache,
      oldViewCache,
      completeCache
    );
    if (changePath.isEmpty()) {
      newEventCache = this.filter_.updateFullNode(
        oldViewCache.getEventCache().getNode(),
        changedSnap,
        accumulator
      );
      newViewCache = oldViewCache.updateEventSnap(
        newEventCache,
        true,
        this.filter_.filtersNodes()
      );
    } else {
      const childKey = changePath.getFront();
      if (childKey === '.priority') {
        newEventCache = this.filter_.updatePriority(
          oldViewCache.getEventCache().getNode(),
          changedSnap
        );
        newViewCache = oldViewCache.updateEventSnap(
          newEventCache,
          oldEventSnap.isFullyInitialized(),
          oldEventSnap.isFiltered()
        );
      } else {
        const childChangePath = changePath.popFront();
        const oldChild = oldEventSnap.getNode().getImmediateChild(childKey);
        let newChild;
        if (childChangePath.isEmpty()) {
          // Child overwrite, we can replace the child
          newChild = changedSnap;
        } else {
          const childNode = source.getCompleteChild(childKey);
          if (childNode != null) {
            if (
              childChangePath.getBack() === '.priority' &&
              childNode.getChild(childChangePath.parent()).isEmpty()
            ) {
              // This is a priority update on an empty node. If this node exists on the server, the
              // server will send down the priority in the update, so ignore for now
              newChild = childNode;
            } else {
              newChild = childNode.updateChild(childChangePath, changedSnap);
            }
          } else {
            // There is no complete child node available
            newChild = ChildrenNode.EMPTY_NODE;
          }
        }
        if (!oldChild.equals(newChild)) {
          const newEventSnap = this.filter_.updateChild(
            oldEventSnap.getNode(),
            childKey,
            newChild,
            childChangePath,
            source,
            accumulator
          );
          newViewCache = oldViewCache.updateEventSnap(
            newEventSnap,
            oldEventSnap.isFullyInitialized(),
            this.filter_.filtersNodes()
          );
        } else {
          newViewCache = oldViewCache;
        }
      }
    }
    return newViewCache;
  }

  /**
   * @param {!ViewCache} viewCache
   * @param {string} childKey
   * @return {boolean}
   * @private
   */
  private static cacheHasChild_(
    viewCache: ViewCache,
    childKey: string
  ): boolean {
    return viewCache.getEventCache().isCompleteForChild(childKey);
  }

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {ImmutableTree.<!Node>} changedChildren
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} serverCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  private applyUserMerge_(
    viewCache: ViewCache,
    path: Path,
    changedChildren: ImmutableTree<Node>,
    writesCache: WriteTreeRef,
    serverCache: Node | null,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    // HACK: In the case of a limit query, there may be some changes that bump things out of the
    // window leaving room for new items.  It's important we process these changes first, so we
    // iterate the changes twice, first processing any that affect items currently in view.
    // TODO: I consider an item "in view" if cacheHasChild is true, which checks both the server
    // and event snap.  I'm not sure if this will result in edge cases when a child is in one but
    // not the other.
    let curViewCache = viewCache;
    changedChildren.foreach((relativePath, childNode) => {
      const writePath = path.child(relativePath);
      if (ViewProcessor.cacheHasChild_(viewCache, writePath.getFront())) {
        curViewCache = this.applyUserOverwrite_(
          curViewCache,
          writePath,
          childNode,
          writesCache,
          serverCache,
          accumulator
        );
      }
    });

    changedChildren.foreach((relativePath, childNode) => {
      const writePath = path.child(relativePath);
      if (!ViewProcessor.cacheHasChild_(viewCache, writePath.getFront())) {
        curViewCache = this.applyUserOverwrite_(
          curViewCache,
          writePath,
          childNode,
          writesCache,
          serverCache,
          accumulator
        );
      }
    });

    return curViewCache;
  }

  /**
   * @param {!Node} node
   * @param {ImmutableTree.<!Node>} merge
   * @return {!Node}
   * @private
   */
  private applyMerge_(node: Node, merge: ImmutableTree<Node>): Node {
    merge.foreach(function(relativePath, childNode) {
      node = node.updateChild(relativePath, childNode);
    });
    return node;
  }

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {!ImmutableTree.<!Node>} changedChildren
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} serverCache
   * @param {boolean} filterServerNode
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  private applyServerMerge_(
    viewCache: ViewCache,
    path: Path,
    changedChildren: ImmutableTree<Node>,
    writesCache: WriteTreeRef,
    serverCache: Node | null,
    filterServerNode: boolean,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    // If we don't have a cache yet, this merge was intended for a previously listen in the same location. Ignore it and
    // wait for the complete data update coming soon.
    if (
      viewCache.getServerCache().getNode().isEmpty() &&
      !viewCache.getServerCache().isFullyInitialized()
    ) {
      return viewCache;
    }

    // HACK: In the case of a limit query, there may be some changes that bump things out of the
    // window leaving room for new items.  It's important we process these changes first, so we
    // iterate the changes twice, first processing any that affect items currently in view.
    // TODO: I consider an item "in view" if cacheHasChild is true, which checks both the server
    // and event snap.  I'm not sure if this will result in edge cases when a child is in one but
    // not the other.
    let curViewCache = viewCache;
    let viewMergeTree;
    if (path.isEmpty()) {
      viewMergeTree = changedChildren;
    } else {
      viewMergeTree = ImmutableTree.Empty.setTree(path, changedChildren);
    }
    const serverNode = viewCache.getServerCache().getNode();
    viewMergeTree.children.inorderTraversal((childKey, childTree) => {
      if (serverNode.hasChild(childKey)) {
        const serverChild = viewCache
          .getServerCache()
          .getNode()
          .getImmediateChild(childKey);
        const newChild = this.applyMerge_(serverChild, childTree);
        curViewCache = this.applyServerOverwrite_(
          curViewCache,
          new Path(childKey),
          newChild,
          writesCache,
          serverCache,
          filterServerNode,
          accumulator
        );
      }
    });
    viewMergeTree.children.inorderTraversal((childKey, childMergeTree) => {
      const isUnknownDeepMerge =
        !viewCache.getServerCache().isCompleteForChild(childKey) &&
        childMergeTree.value == null;
      if (!serverNode.hasChild(childKey) && !isUnknownDeepMerge) {
        const serverChild = viewCache
          .getServerCache()
          .getNode()
          .getImmediateChild(childKey);
        const newChild = this.applyMerge_(serverChild, childMergeTree);
        curViewCache = this.applyServerOverwrite_(
          curViewCache,
          new Path(childKey),
          newChild,
          writesCache,
          serverCache,
          filterServerNode,
          accumulator
        );
      }
    });

    return curViewCache;
  }

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} ackPath
   * @param {!ImmutableTree<!boolean>} affectedTree
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} completeCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  private ackUserWrite_(
    viewCache: ViewCache,
    ackPath: Path,
    affectedTree: ImmutableTree<boolean>,
    writesCache: WriteTreeRef,
    completeCache: Node | null,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    if (writesCache.shadowingWrite(ackPath) != null) {
      return viewCache;
    }

    // Only filter server node if it is currently filtered
    const filterServerNode = viewCache.getServerCache().isFiltered();

    // Essentially we'll just get our existing server cache for the affected paths and re-apply it as a server update
    // now that it won't be shadowed.
    const serverCache = viewCache.getServerCache();
    if (affectedTree.value != null) {
      // This is an overwrite.
      if (
        (ackPath.isEmpty() && serverCache.isFullyInitialized()) ||
        serverCache.isCompleteForPath(ackPath)
      ) {
        return this.applyServerOverwrite_(
          viewCache,
          ackPath,
          serverCache.getNode().getChild(ackPath),
          writesCache,
          completeCache,
          filterServerNode,
          accumulator
        );
      } else if (ackPath.isEmpty()) {
        // This is a goofy edge case where we are acking data at this location but don't have full data.  We
        // should just re-apply whatever we have in our cache as a merge.
        let changedChildren = ImmutableTree.Empty;
        serverCache.getNode().forEachChild(KEY_INDEX, function(name, node) {
          changedChildren = changedChildren.set(new Path(name), node);
        });
        return this.applyServerMerge_(
          viewCache,
          ackPath,
          changedChildren,
          writesCache,
          completeCache,
          filterServerNode,
          accumulator
        );
      } else {
        return viewCache;
      }
    } else {
      // This is a merge.
      let changedChildren = ImmutableTree.Empty;
      affectedTree.foreach(function(mergePath, value) {
        const serverCachePath = ackPath.child(mergePath);
        if (serverCache.isCompleteForPath(serverCachePath)) {
          changedChildren = changedChildren.set(
            mergePath,
            serverCache.getNode().getChild(serverCachePath)
          );
        }
      });
      return this.applyServerMerge_(
        viewCache,
        ackPath,
        changedChildren,
        writesCache,
        completeCache,
        filterServerNode,
        accumulator
      );
    }
  }

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {!WriteTreeRef} writesCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  private listenComplete_(
    viewCache: ViewCache,
    path: Path,
    writesCache: WriteTreeRef,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldServerNode = viewCache.getServerCache();
    const newViewCache = viewCache.updateServerSnap(
      oldServerNode.getNode(),
      oldServerNode.isFullyInitialized() || path.isEmpty(),
      oldServerNode.isFiltered()
    );
    return this.generateEventCacheAfterServerEvent_(
      newViewCache,
      path,
      writesCache,
      NO_COMPLETE_CHILD_SOURCE,
      accumulator
    );
  }

  /**
   * @param {!ViewCache} viewCache
   * @param {!Path} path
   * @param {!WriteTreeRef} writesCache
   * @param {?Node} completeServerCache
   * @param {!ChildChangeAccumulator} accumulator
   * @return {!ViewCache}
   * @private
   */
  private revertUserWrite_(
    viewCache: ViewCache,
    path: Path,
    writesCache: WriteTreeRef,
    completeServerCache: Node | null,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    let complete;
    if (writesCache.shadowingWrite(path) != null) {
      return viewCache;
    } else {
      const source = new WriteTreeCompleteChildSource(
        writesCache,
        viewCache,
        completeServerCache
      );
      const oldEventCache = viewCache.getEventCache().getNode();
      let newEventCache;
      if (path.isEmpty() || path.getFront() === '.priority') {
        let newNode;
        if (viewCache.getServerCache().isFullyInitialized()) {
          newNode = writesCache.calcCompleteEventCache(
            viewCache.getCompleteServerSnap()
          );
        } else {
          const serverChildren = viewCache.getServerCache().getNode();
          assert(
            serverChildren instanceof ChildrenNode,
            'serverChildren would be complete if leaf node'
          );
          newNode = writesCache.calcCompleteEventChildren(
            serverChildren as ChildrenNode
          );
        }
        newNode = newNode as Node;
        newEventCache = this.filter_.updateFullNode(
          oldEventCache,
          newNode,
          accumulator
        );
      } else {
        const childKey = path.getFront();
        let newChild = writesCache.calcCompleteChild(
          childKey,
          viewCache.getServerCache()
        );
        if (
          newChild == null &&
          viewCache.getServerCache().isCompleteForChild(childKey)
        ) {
          newChild = oldEventCache.getImmediateChild(childKey);
        }
        if (newChild != null) {
          newEventCache = this.filter_.updateChild(
            oldEventCache,
            childKey,
            newChild,
            path.popFront(),
            source,
            accumulator
          );
        } else if (viewCache.getEventCache().getNode().hasChild(childKey)) {
          // No complete child available, delete the existing one, if any
          newEventCache = this.filter_.updateChild(
            oldEventCache,
            childKey,
            ChildrenNode.EMPTY_NODE,
            path.popFront(),
            source,
            accumulator
          );
        } else {
          newEventCache = oldEventCache;
        }
        if (
          newEventCache.isEmpty() &&
          viewCache.getServerCache().isFullyInitialized()
        ) {
          // We might have reverted all child writes. Maybe the old event was a leaf node
          complete = writesCache.calcCompleteEventCache(
            viewCache.getCompleteServerSnap()
          );
          if (complete.isLeafNode()) {
            newEventCache = this.filter_.updateFullNode(
              newEventCache,
              complete,
              accumulator
            );
          }
        }
      }
      complete =
        viewCache.getServerCache().isFullyInitialized() ||
        writesCache.shadowingWrite(Path.Empty) != null;
      return viewCache.updateEventSnap(
        newEventCache,
        complete,
        this.filter_.filtersNodes()
      );
    }
  }
}
