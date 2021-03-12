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

import { Operation, OperationType } from '../operation/Operation';
import { assert, assertionError } from '@firebase/util';
import { ChildChangeAccumulator } from './ChildChangeAccumulator';
import { Change, changeValue } from './Change';
import { ChildrenNode } from '../snap/ChildrenNode';
import { KEY_INDEX } from '../snap/indexes/KeyIndex';
import { ImmutableTree } from '../util/ImmutableTree';
import {
  newEmptyPath,
  Path,
  pathChild,
  pathGetBack,
  pathGetFront,
  pathGetLength,
  pathIsEmpty,
  pathParent,
  pathPopFront
} from '../util/Path';
import {
  CompleteChildSource,
  NO_COMPLETE_CHILD_SOURCE,
  WriteTreeCompleteChildSource
} from './CompleteChildSource';
import {
  ViewCache,
  viewCacheGetCompleteEventSnap,
  viewCacheGetCompleteServerSnap,
  viewCacheUpdateEventSnap,
  viewCacheUpdateServerSnap
} from './ViewCache';
import { NodeFilter } from './filter/NodeFilter';
import { WriteTreeRef } from '../WriteTree';
import { Overwrite } from '../operation/Overwrite';
import { Merge } from '../operation/Merge';
import { AckUserWrite } from '../operation/AckUserWrite';
import { Node } from '../snap/Node';

export class ProcessorResult {
  constructor(
    public readonly viewCache: ViewCache,
    public readonly changes: Change[]
  ) {}
}

/**
 */
export class ViewProcessor {
  constructor(private readonly filter_: NodeFilter) {}

  assertIndexed(viewCache: ViewCache) {
    assert(
      viewCache.eventCache.getNode().isIndexed(this.filter_.getIndex()),
      'Event snap not indexed'
    );
    assert(
      viewCache.serverCache.getNode().isIndexed(this.filter_.getIndex()),
      'Server snap not indexed'
    );
  }

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
          (oldViewCache.serverCache.isFiltered() &&
            !pathIsEmpty(overwrite.path));
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
          merge.source.tagged || oldViewCache.serverCache.isFiltered();
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

  private static maybeAddValueEvent_(
    oldViewCache: ViewCache,
    newViewCache: ViewCache,
    accumulator: Change[]
  ) {
    const eventSnap = newViewCache.eventCache;
    if (eventSnap.isFullyInitialized()) {
      const isLeafOrEmpty =
        eventSnap.getNode().isLeafNode() || eventSnap.getNode().isEmpty();
      const oldCompleteSnap = viewCacheGetCompleteEventSnap(oldViewCache);
      if (
        accumulator.length > 0 ||
        !oldViewCache.eventCache.isFullyInitialized() ||
        (isLeafOrEmpty && !eventSnap.getNode().equals(oldCompleteSnap)) ||
        !eventSnap.getNode().getPriority().equals(oldCompleteSnap.getPriority())
      ) {
        accumulator.push(
          changeValue(viewCacheGetCompleteEventSnap(newViewCache))
        );
      }
    }
  }

  private generateEventCacheAfterServerEvent_(
    viewCache: ViewCache,
    changePath: Path,
    writesCache: WriteTreeRef,
    source: CompleteChildSource,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldEventSnap = viewCache.eventCache;
    if (writesCache.shadowingWrite(changePath) != null) {
      // we have a shadowing write, ignore changes
      return viewCache;
    } else {
      let newEventCache, serverNode;
      if (pathIsEmpty(changePath)) {
        // TODO: figure out how this plays with "sliding ack windows"
        assert(
          viewCache.serverCache.isFullyInitialized(),
          'If change path is empty, we must have complete server data'
        );
        if (viewCache.serverCache.isFiltered()) {
          // We need to special case this, because we need to only apply writes to complete children, or
          // we might end up raising events for incomplete children. If the server data is filtered deep
          // writes cannot be guaranteed to be complete
          const serverCache = viewCacheGetCompleteServerSnap(viewCache);
          const completeChildren =
            serverCache instanceof ChildrenNode
              ? serverCache
              : ChildrenNode.EMPTY_NODE;
          const completeEventChildren = writesCache.calcCompleteEventChildren(
            completeChildren
          );
          newEventCache = this.filter_.updateFullNode(
            viewCache.eventCache.getNode(),
            completeEventChildren,
            accumulator
          );
        } else {
          const completeNode = writesCache.calcCompleteEventCache(
            viewCacheGetCompleteServerSnap(viewCache)
          );
          newEventCache = this.filter_.updateFullNode(
            viewCache.eventCache.getNode(),
            completeNode,
            accumulator
          );
        }
      } else {
        const childKey = pathGetFront(changePath);
        if (childKey === '.priority') {
          assert(
            pathGetLength(changePath) === 1,
            "Can't have a priority with additional path components"
          );
          const oldEventNode = oldEventSnap.getNode();
          serverNode = viewCache.serverCache.getNode();
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
          const childChangePath = pathPopFront(changePath);
          // update child
          let newEventChild;
          if (oldEventSnap.isCompleteForChild(childKey)) {
            serverNode = viewCache.serverCache.getNode();
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
              viewCache.serverCache
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
      return viewCacheUpdateEventSnap(
        viewCache,
        newEventCache,
        oldEventSnap.isFullyInitialized() || pathIsEmpty(changePath),
        this.filter_.filtersNodes()
      );
    }
  }

  applyServerOverwrite_(
    oldViewCache: ViewCache,
    changePath: Path,
    changedSnap: Node,
    writesCache: WriteTreeRef,
    completeCache: Node | null,
    filterServerNode: boolean,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldServerSnap = oldViewCache.serverCache;
    let newServerCache;
    const serverFilter = filterServerNode
      ? this.filter_
      : this.filter_.getIndexedFilter();
    if (pathIsEmpty(changePath)) {
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
      const childKey = pathGetFront(changePath);
      if (
        !oldServerSnap.isCompleteForPath(changePath) &&
        pathGetLength(changePath) > 1
      ) {
        // We don't update incomplete nodes with updates intended for other listeners
        return oldViewCache;
      }
      const childChangePath = pathPopFront(changePath);
      const childNode = oldServerSnap.getNode().getImmediateChild(childKey);
      const newChildNode = childNode.updateChild(childChangePath, changedSnap);
      if (childKey === '.priority') {
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
    const newViewCache = viewCacheUpdateServerSnap(
      oldViewCache,
      newServerCache,
      oldServerSnap.isFullyInitialized() || pathIsEmpty(changePath),
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

  applyUserOverwrite_(
    oldViewCache: ViewCache,
    changePath: Path,
    changedSnap: Node,
    writesCache: WriteTreeRef,
    completeCache: Node | null,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldEventSnap = oldViewCache.eventCache;
    let newViewCache, newEventCache;
    const source = new WriteTreeCompleteChildSource(
      writesCache,
      oldViewCache,
      completeCache
    );
    if (pathIsEmpty(changePath)) {
      newEventCache = this.filter_.updateFullNode(
        oldViewCache.eventCache.getNode(),
        changedSnap,
        accumulator
      );
      newViewCache = viewCacheUpdateEventSnap(
        oldViewCache,
        newEventCache,
        true,
        this.filter_.filtersNodes()
      );
    } else {
      const childKey = pathGetFront(changePath);
      if (childKey === '.priority') {
        newEventCache = this.filter_.updatePriority(
          oldViewCache.eventCache.getNode(),
          changedSnap
        );
        newViewCache = viewCacheUpdateEventSnap(
          oldViewCache,
          newEventCache,
          oldEventSnap.isFullyInitialized(),
          oldEventSnap.isFiltered()
        );
      } else {
        const childChangePath = pathPopFront(changePath);
        const oldChild = oldEventSnap.getNode().getImmediateChild(childKey);
        let newChild;
        if (pathIsEmpty(childChangePath)) {
          // Child overwrite, we can replace the child
          newChild = changedSnap;
        } else {
          const childNode = source.getCompleteChild(childKey);
          if (childNode != null) {
            if (
              pathGetBack(childChangePath) === '.priority' &&
              childNode.getChild(pathParent(childChangePath)).isEmpty()
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
          newViewCache = viewCacheUpdateEventSnap(
            oldViewCache,
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

  private static cacheHasChild_(
    viewCache: ViewCache,
    childKey: string
  ): boolean {
    return viewCache.eventCache.isCompleteForChild(childKey);
  }

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
      const writePath = pathChild(path, relativePath);
      if (ViewProcessor.cacheHasChild_(viewCache, pathGetFront(writePath))) {
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
      const writePath = pathChild(path, relativePath);
      if (!ViewProcessor.cacheHasChild_(viewCache, pathGetFront(writePath))) {
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

  private applyMerge_(node: Node, merge: ImmutableTree<Node>): Node {
    merge.foreach((relativePath, childNode) => {
      node = node.updateChild(relativePath, childNode);
    });
    return node;
  }

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
      viewCache.serverCache.getNode().isEmpty() &&
      !viewCache.serverCache.isFullyInitialized()
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
    if (pathIsEmpty(path)) {
      viewMergeTree = changedChildren;
    } else {
      viewMergeTree = new ImmutableTree<Node>(null).setTree(
        path,
        changedChildren
      );
    }
    const serverNode = viewCache.serverCache.getNode();
    viewMergeTree.children.inorderTraversal((childKey, childTree) => {
      if (serverNode.hasChild(childKey)) {
        const serverChild = viewCache.serverCache
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
        !viewCache.serverCache.isCompleteForChild(childKey) &&
        childMergeTree.value === undefined;
      if (!serverNode.hasChild(childKey) && !isUnknownDeepMerge) {
        const serverChild = viewCache.serverCache
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
    const filterServerNode = viewCache.serverCache.isFiltered();

    // Essentially we'll just get our existing server cache for the affected paths and re-apply it as a server update
    // now that it won't be shadowed.
    const serverCache = viewCache.serverCache;
    if (affectedTree.value != null) {
      // This is an overwrite.
      if (
        (pathIsEmpty(ackPath) && serverCache.isFullyInitialized()) ||
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
      } else if (pathIsEmpty(ackPath)) {
        // This is a goofy edge case where we are acking data at this location but don't have full data.  We
        // should just re-apply whatever we have in our cache as a merge.
        let changedChildren = new ImmutableTree<Node>(null);
        serverCache.getNode().forEachChild(KEY_INDEX, (name, node) => {
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
      let changedChildren = new ImmutableTree<Node>(null);
      affectedTree.foreach((mergePath, value) => {
        const serverCachePath = pathChild(ackPath, mergePath);
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

  private listenComplete_(
    viewCache: ViewCache,
    path: Path,
    writesCache: WriteTreeRef,
    accumulator: ChildChangeAccumulator
  ): ViewCache {
    const oldServerNode = viewCache.serverCache;
    const newViewCache = viewCacheUpdateServerSnap(
      viewCache,
      oldServerNode.getNode(),
      oldServerNode.isFullyInitialized() || pathIsEmpty(path),
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
      const oldEventCache = viewCache.eventCache.getNode();
      let newEventCache;
      if (pathIsEmpty(path) || pathGetFront(path) === '.priority') {
        let newNode;
        if (viewCache.serverCache.isFullyInitialized()) {
          newNode = writesCache.calcCompleteEventCache(
            viewCacheGetCompleteServerSnap(viewCache)
          );
        } else {
          const serverChildren = viewCache.serverCache.getNode();
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
        const childKey = pathGetFront(path);
        let newChild = writesCache.calcCompleteChild(
          childKey,
          viewCache.serverCache
        );
        if (
          newChild == null &&
          viewCache.serverCache.isCompleteForChild(childKey)
        ) {
          newChild = oldEventCache.getImmediateChild(childKey);
        }
        if (newChild != null) {
          newEventCache = this.filter_.updateChild(
            oldEventCache,
            childKey,
            newChild,
            pathPopFront(path),
            source,
            accumulator
          );
        } else if (viewCache.eventCache.getNode().hasChild(childKey)) {
          // No complete child available, delete the existing one, if any
          newEventCache = this.filter_.updateChild(
            oldEventCache,
            childKey,
            ChildrenNode.EMPTY_NODE,
            pathPopFront(path),
            source,
            accumulator
          );
        } else {
          newEventCache = oldEventCache;
        }
        if (
          newEventCache.isEmpty() &&
          viewCache.serverCache.isFullyInitialized()
        ) {
          // We might have reverted all child writes. Maybe the old event was a leaf node
          complete = writesCache.calcCompleteEventCache(
            viewCacheGetCompleteServerSnap(viewCache)
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
        viewCache.serverCache.isFullyInitialized() ||
        writesCache.shadowingWrite(newEmptyPath()) != null;
      return viewCacheUpdateEventSnap(
        viewCache,
        newEventCache,
        complete,
        this.filter_.filtersNodes()
      );
    }
  }
}
