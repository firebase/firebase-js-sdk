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

import { assert, assertionError, safeGet } from '@firebase/util';

import {
  CompoundWrite,
  compoundWriteAddWrite,
  compoundWriteAddWrites,
  compoundWriteApply,
  compoundWriteChildCompoundWrite,
  compoundWriteGetCompleteChildren,
  compoundWriteGetCompleteNode,
  compoundWriteHasCompleteWrite,
  compoundWriteIsEmpty,
  compoundWriteRemoveWrite
} from './CompoundWrite';
import { ChildrenNode } from './snap/ChildrenNode';
import { Index } from './snap/indexes/Index';
import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { NamedNode, Node } from './snap/Node';
import {
  newEmptyPath,
  newRelativePath,
  Path,
  pathChild,
  pathContains,
  pathGetFront,
  pathIsEmpty,
  pathPopFront
} from './util/Path';
import { each } from './util/util';
import { CacheNode } from './view/CacheNode';

/**
 * Defines a single user-initiated write operation. May be the result of a set(), transaction(), or update() call. In
 * the case of a set() or transaction, snap wil be non-null.  In the case of an update(), children will be non-null.
 */
export interface WriteRecord {
  writeId: number;
  path: Path;
  snap?: Node | null;
  children?: { [k: string]: Node } | null;
  visible: boolean;
}

/**
 * Create a new WriteTreeRef for the given path. For use with a new sync point at the given path.
 *
 */
export function writeTreeChildWrites(
  writeTree: WriteTree,
  path: Path
): WriteTreeRef {
  return newWriteTreeRef(path, writeTree);
}

/**
 * Record a new overwrite from user code.
 *
 * @param visible - This is set to false by some transactions. It should be excluded from event caches
 */
export function writeTreeAddOverwrite(
  writeTree: WriteTree,
  path: Path,
  snap: Node,
  writeId: number,
  visible?: boolean
) {
  assert(
    writeId > writeTree.lastWriteId,
    'Stacking an older write on top of newer ones'
  );
  if (visible === undefined) {
    visible = true;
  }
  writeTree.allWrites.push({
    path,
    snap,
    writeId,
    visible
  });

  if (visible) {
    writeTree.visibleWrites = compoundWriteAddWrite(
      writeTree.visibleWrites,
      path,
      snap
    );
  }
  writeTree.lastWriteId = writeId;
}

/**
 * Record a new merge from user code.
 */
export function writeTreeAddMerge(
  writeTree: WriteTree,
  path: Path,
  changedChildren: { [k: string]: Node },
  writeId: number
) {
  assert(
    writeId > writeTree.lastWriteId,
    'Stacking an older merge on top of newer ones'
  );
  writeTree.allWrites.push({
    path,
    children: changedChildren,
    writeId,
    visible: true
  });

  writeTree.visibleWrites = compoundWriteAddWrites(
    writeTree.visibleWrites,
    path,
    changedChildren
  );
  writeTree.lastWriteId = writeId;
}

export function writeTreeGetWrite(
  writeTree: WriteTree,
  writeId: number
): WriteRecord | null {
  for (let i = 0; i < writeTree.allWrites.length; i++) {
    const record = writeTree.allWrites[i];
    if (record.writeId === writeId) {
      return record;
    }
  }
  return null;
}

/**
 * Remove a write (either an overwrite or merge) that has been successfully acknowledge by the server. Recalculates
 * the tree if necessary.  We return true if it may have been visible, meaning views need to reevaluate.
 *
 * @returns true if the write may have been visible (meaning we'll need to reevaluate / raise
 * events as a result).
 */
export function writeTreeRemoveWrite(
  writeTree: WriteTree,
  writeId: number
): boolean {
  // Note: disabling this check. It could be a transaction that preempted another transaction, and thus was applied
  // out of order.
  //const validClear = revert || this.allWrites_.length === 0 || writeId <= this.allWrites_[0].writeId;
  //assert(validClear, "Either we don't have this write, or it's the first one in the queue");

  const idx = writeTree.allWrites.findIndex(s => {
    return s.writeId === writeId;
  });
  assert(idx >= 0, 'removeWrite called with nonexistent writeId.');
  const writeToRemove = writeTree.allWrites[idx];
  writeTree.allWrites.splice(idx, 1);

  let removedWriteWasVisible = writeToRemove.visible;
  let removedWriteOverlapsWithOtherWrites = false;

  let i = writeTree.allWrites.length - 1;

  while (removedWriteWasVisible && i >= 0) {
    const currentWrite = writeTree.allWrites[i];
    if (currentWrite.visible) {
      if (
        i >= idx &&
        writeTreeRecordContainsPath_(currentWrite, writeToRemove.path)
      ) {
        // The removed write was completely shadowed by a subsequent write.
        removedWriteWasVisible = false;
      } else if (pathContains(writeToRemove.path, currentWrite.path)) {
        // Either we're covering some writes or they're covering part of us (depending on which came first).
        removedWriteOverlapsWithOtherWrites = true;
      }
    }
    i--;
  }

  if (!removedWriteWasVisible) {
    return false;
  } else if (removedWriteOverlapsWithOtherWrites) {
    // There's some shadowing going on. Just rebuild the visible writes from scratch.
    writeTreeResetTree_(writeTree);
    return true;
  } else {
    // There's no shadowing.  We can safely just remove the write(s) from visibleWrites.
    if (writeToRemove.snap) {
      writeTree.visibleWrites = compoundWriteRemoveWrite(
        writeTree.visibleWrites,
        writeToRemove.path
      );
    } else {
      const children = writeToRemove.children;
      each(children, (childName: string) => {
        writeTree.visibleWrites = compoundWriteRemoveWrite(
          writeTree.visibleWrites,
          pathChild(writeToRemove.path, childName)
        );
      });
    }
    return true;
  }
}

function writeTreeRecordContainsPath_(
  writeRecord: WriteRecord,
  path: Path
): boolean {
  if (writeRecord.snap) {
    return pathContains(writeRecord.path, path);
  } else {
    for (const childName in writeRecord.children) {
      if (
        writeRecord.children.hasOwnProperty(childName) &&
        pathContains(pathChild(writeRecord.path, childName), path)
      ) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Re-layer the writes and merges into a tree so we can efficiently calculate event snapshots
 */
function writeTreeResetTree_(writeTree: WriteTree) {
  writeTree.visibleWrites = writeTreeLayerTree_(
    writeTree.allWrites,
    writeTreeDefaultFilter_,
    newEmptyPath()
  );
  if (writeTree.allWrites.length > 0) {
    writeTree.lastWriteId =
      writeTree.allWrites[writeTree.allWrites.length - 1].writeId;
  } else {
    writeTree.lastWriteId = -1;
  }
}

/**
 * The default filter used when constructing the tree. Keep everything that's visible.
 */
function writeTreeDefaultFilter_(write: WriteRecord) {
  return write.visible;
}

/**
 * Static method. Given an array of WriteRecords, a filter for which ones to include, and a path, construct the tree of
 * event data at that path.
 */
function writeTreeLayerTree_(
  writes: WriteRecord[],
  filter: (w: WriteRecord) => boolean,
  treeRoot: Path
): CompoundWrite {
  let compoundWrite = CompoundWrite.empty();
  for (let i = 0; i < writes.length; ++i) {
    const write = writes[i];
    // Theory, a later set will either:
    // a) abort a relevant transaction, so no need to worry about excluding it from calculating that transaction
    // b) not be relevant to a transaction (separate branch), so again will not affect the data for that transaction
    if (filter(write)) {
      const writePath = write.path;
      let relativePath: Path;
      if (write.snap) {
        if (pathContains(treeRoot, writePath)) {
          relativePath = newRelativePath(treeRoot, writePath);
          compoundWrite = compoundWriteAddWrite(
            compoundWrite,
            relativePath,
            write.snap
          );
        } else if (pathContains(writePath, treeRoot)) {
          relativePath = newRelativePath(writePath, treeRoot);
          compoundWrite = compoundWriteAddWrite(
            compoundWrite,
            newEmptyPath(),
            write.snap.getChild(relativePath)
          );
        } else {
          // There is no overlap between root path and write path, ignore write
        }
      } else if (write.children) {
        if (pathContains(treeRoot, writePath)) {
          relativePath = newRelativePath(treeRoot, writePath);
          compoundWrite = compoundWriteAddWrites(
            compoundWrite,
            relativePath,
            write.children
          );
        } else if (pathContains(writePath, treeRoot)) {
          relativePath = newRelativePath(writePath, treeRoot);
          if (pathIsEmpty(relativePath)) {
            compoundWrite = compoundWriteAddWrites(
              compoundWrite,
              newEmptyPath(),
              write.children
            );
          } else {
            const child = safeGet(write.children, pathGetFront(relativePath));
            if (child) {
              // There exists a child in this node that matches the root path
              const deepNode = child.getChild(pathPopFront(relativePath));
              compoundWrite = compoundWriteAddWrite(
                compoundWrite,
                newEmptyPath(),
                deepNode
              );
            }
          }
        } else {
          // There is no overlap between root path and write path, ignore write
        }
      } else {
        throw assertionError('WriteRecord should have .snap or .children');
      }
    }
  }
  return compoundWrite;
}

/**
 * Return a complete snapshot for the given path if there's visible write data at that path, else null.
 * No server data is considered.
 *
 */
export function writeTreeGetCompleteWriteData(
  writeTree: WriteTree,
  path: Path
): Node | null {
  return compoundWriteGetCompleteNode(writeTree.visibleWrites, path);
}

/**
 * Given optional, underlying server data, and an optional set of constraints (exclude some sets, include hidden
 * writes), attempt to calculate a complete snapshot for the given path
 *
 * @param writeIdsToExclude - An optional set to be excluded
 * @param includeHiddenWrites - Defaults to false, whether or not to layer on writes with visible set to false
 */
export function writeTreeCalcCompleteEventCache(
  writeTree: WriteTree,
  treePath: Path,
  completeServerCache: Node | null,
  writeIdsToExclude?: number[],
  includeHiddenWrites?: boolean
): Node | null {
  if (!writeIdsToExclude && !includeHiddenWrites) {
    const shadowingNode = compoundWriteGetCompleteNode(
      writeTree.visibleWrites,
      treePath
    );
    if (shadowingNode != null) {
      return shadowingNode;
    } else {
      const subMerge = compoundWriteChildCompoundWrite(
        writeTree.visibleWrites,
        treePath
      );
      if (compoundWriteIsEmpty(subMerge)) {
        return completeServerCache;
      } else if (
        completeServerCache == null &&
        !compoundWriteHasCompleteWrite(subMerge, newEmptyPath())
      ) {
        // We wouldn't have a complete snapshot, since there's no underlying data and no complete shadow
        return null;
      } else {
        const layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
        return compoundWriteApply(subMerge, layeredCache);
      }
    }
  } else {
    const merge = compoundWriteChildCompoundWrite(
      writeTree.visibleWrites,
      treePath
    );
    if (!includeHiddenWrites && compoundWriteIsEmpty(merge)) {
      return completeServerCache;
    } else {
      // If the server cache is null, and we don't have a complete cache, we need to return null
      if (
        !includeHiddenWrites &&
        completeServerCache == null &&
        !compoundWriteHasCompleteWrite(merge, newEmptyPath())
      ) {
        return null;
      } else {
        const filter = function (write: WriteRecord) {
          return (
            (write.visible || includeHiddenWrites) &&
            (!writeIdsToExclude ||
              !~writeIdsToExclude.indexOf(write.writeId)) &&
            (pathContains(write.path, treePath) ||
              pathContains(treePath, write.path))
          );
        };
        const mergeAtPath = writeTreeLayerTree_(
          writeTree.allWrites,
          filter,
          treePath
        );
        const layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
        return compoundWriteApply(mergeAtPath, layeredCache);
      }
    }
  }
}

/**
 * With optional, underlying server data, attempt to return a children node of children that we have complete data for.
 * Used when creating new views, to pre-fill their complete event children snapshot.
 */
export function writeTreeCalcCompleteEventChildren(
  writeTree: WriteTree,
  treePath: Path,
  completeServerChildren: ChildrenNode | null
) {
  let completeChildren = ChildrenNode.EMPTY_NODE as Node;
  const topLevelSet = compoundWriteGetCompleteNode(
    writeTree.visibleWrites,
    treePath
  );
  if (topLevelSet) {
    if (!topLevelSet.isLeafNode()) {
      // we're shadowing everything. Return the children.
      topLevelSet.forEachChild(PRIORITY_INDEX, (childName, childSnap) => {
        completeChildren = completeChildren.updateImmediateChild(
          childName,
          childSnap
        );
      });
    }
    return completeChildren;
  } else if (completeServerChildren) {
    // Layer any children we have on top of this
    // We know we don't have a top-level set, so just enumerate existing children
    const merge = compoundWriteChildCompoundWrite(
      writeTree.visibleWrites,
      treePath
    );
    completeServerChildren.forEachChild(
      PRIORITY_INDEX,
      (childName, childNode) => {
        const node = compoundWriteApply(
          compoundWriteChildCompoundWrite(merge, new Path(childName)),
          childNode
        );
        completeChildren = completeChildren.updateImmediateChild(
          childName,
          node
        );
      }
    );
    // Add any complete children we have from the set
    compoundWriteGetCompleteChildren(merge).forEach(namedNode => {
      completeChildren = completeChildren.updateImmediateChild(
        namedNode.name,
        namedNode.node
      );
    });
    return completeChildren;
  } else {
    // We don't have anything to layer on top of. Layer on any children we have
    // Note that we can return an empty snap if we have a defined delete
    const merge = compoundWriteChildCompoundWrite(
      writeTree.visibleWrites,
      treePath
    );
    compoundWriteGetCompleteChildren(merge).forEach(namedNode => {
      completeChildren = completeChildren.updateImmediateChild(
        namedNode.name,
        namedNode.node
      );
    });
    return completeChildren;
  }
}

/**
 * Given that the underlying server data has updated, determine what, if anything, needs to be
 * applied to the event cache.
 *
 * Possibilities:
 *
 * 1. No writes are shadowing. Events should be raised, the snap to be applied comes from the server data
 *
 * 2. Some write is completely shadowing. No events to be raised
 *
 * 3. Is partially shadowed. Events
 *
 * Either existingEventSnap or existingServerSnap must exist
 */
export function writeTreeCalcEventCacheAfterServerOverwrite(
  writeTree: WriteTree,
  treePath: Path,
  childPath: Path,
  existingEventSnap: Node | null,
  existingServerSnap: Node | null
): Node | null {
  assert(
    existingEventSnap || existingServerSnap,
    'Either existingEventSnap or existingServerSnap must exist'
  );
  const path = pathChild(treePath, childPath);
  if (compoundWriteHasCompleteWrite(writeTree.visibleWrites, path)) {
    // At this point we can probably guarantee that we're in case 2, meaning no events
    // May need to check visibility while doing the findRootMostValueAndPath call
    return null;
  } else {
    // No complete shadowing. We're either partially shadowing or not shadowing at all.
    const childMerge = compoundWriteChildCompoundWrite(
      writeTree.visibleWrites,
      path
    );
    if (compoundWriteIsEmpty(childMerge)) {
      // We're not shadowing at all. Case 1
      return existingServerSnap.getChild(childPath);
    } else {
      // This could be more efficient if the serverNode + updates doesn't change the eventSnap
      // However this is tricky to find out, since user updates don't necessary change the server
      // snap, e.g. priority updates on empty nodes, or deep deletes. Another special case is if the server
      // adds nodes, but doesn't change any existing writes. It is therefore not enough to
      // only check if the updates change the serverNode.
      // Maybe check if the merge tree contains these special cases and only do a full overwrite in that case?
      return compoundWriteApply(
        childMerge,
        existingServerSnap.getChild(childPath)
      );
    }
  }
}

/**
 * Returns a complete child for a given server snap after applying all user writes or null if there is no
 * complete child for this ChildKey.
 */
export function writeTreeCalcCompleteChild(
  writeTree: WriteTree,
  treePath: Path,
  childKey: string,
  existingServerSnap: CacheNode
): Node | null {
  const path = pathChild(treePath, childKey);
  const shadowingNode = compoundWriteGetCompleteNode(
    writeTree.visibleWrites,
    path
  );
  if (shadowingNode != null) {
    return shadowingNode;
  } else {
    if (existingServerSnap.isCompleteForChild(childKey)) {
      const childMerge = compoundWriteChildCompoundWrite(
        writeTree.visibleWrites,
        path
      );
      return compoundWriteApply(
        childMerge,
        existingServerSnap.getNode().getImmediateChild(childKey)
      );
    } else {
      return null;
    }
  }
}

/**
 * Returns a node if there is a complete overwrite for this path. More specifically, if there is a write at
 * a higher path, this will return the child of that write relative to the write and this path.
 * Returns null if there is no write at this path.
 */
export function writeTreeShadowingWrite(
  writeTree: WriteTree,
  path: Path
): Node | null {
  return compoundWriteGetCompleteNode(writeTree.visibleWrites, path);
}

/**
 * This method is used when processing child remove events on a query. If we can, we pull in children that were outside
 * the window, but may now be in the window.
 */
export function writeTreeCalcIndexedSlice(
  writeTree: WriteTree,
  treePath: Path,
  completeServerData: Node | null,
  startPost: NamedNode,
  count: number,
  reverse: boolean,
  index: Index
): NamedNode[] {
  let toIterate: Node;
  const merge = compoundWriteChildCompoundWrite(
    writeTree.visibleWrites,
    treePath
  );
  const shadowingNode = compoundWriteGetCompleteNode(merge, newEmptyPath());
  if (shadowingNode != null) {
    toIterate = shadowingNode;
  } else if (completeServerData != null) {
    toIterate = compoundWriteApply(merge, completeServerData);
  } else {
    // no children to iterate on
    return [];
  }
  toIterate = toIterate.withIndex(index);
  if (!toIterate.isEmpty() && !toIterate.isLeafNode()) {
    const nodes = [];
    const cmp = index.getCompare();
    const iter = reverse
      ? (toIterate as ChildrenNode).getReverseIteratorFrom(startPost, index)
      : (toIterate as ChildrenNode).getIteratorFrom(startPost, index);
    let next = iter.getNext();
    while (next && nodes.length < count) {
      if (cmp(next, startPost) !== 0) {
        nodes.push(next);
      }
      next = iter.getNext();
    }
    return nodes;
  } else {
    return [];
  }
}

export function newWriteTree(): WriteTree {
  return {
    visibleWrites: CompoundWrite.empty(),
    allWrites: [],
    lastWriteId: -1
  };
}

/**
 * WriteTree tracks all pending user-initiated writes and has methods to calculate the result of merging them
 * with underlying server data (to create "event cache" data).  Pending writes are added with addOverwrite()
 * and addMerge(), and removed with removeWrite().
 */
export interface WriteTree {
  /**
   * A tree tracking the result of applying all visible writes.  This does not include transactions with
   * applyLocally=false or writes that are completely shadowed by other writes.
   */
  visibleWrites: CompoundWrite;

  /**
   * A list of all pending writes, regardless of visibility and shadowed-ness.  Used to calculate arbitrary
   * sets of the changed data, such as hidden writes (from transactions) or changes with certain writes excluded (also
   * used by transactions).
   */
  allWrites: WriteRecord[];

  lastWriteId: number;
}

/**
 * If possible, returns a complete event cache, using the underlying server data if possible. In addition, can be used
 * to get a cache that includes hidden writes, and excludes arbitrary writes. Note that customizing the returned node
 * can lead to a more expensive calculation.
 *
 * @param writeIdsToExclude - Optional writes to exclude.
 * @param includeHiddenWrites - Defaults to false, whether or not to layer on writes with visible set to false
 */
export function writeTreeRefCalcCompleteEventCache(
  writeTreeRef: WriteTreeRef,
  completeServerCache: Node | null,
  writeIdsToExclude?: number[],
  includeHiddenWrites?: boolean
): Node | null {
  return writeTreeCalcCompleteEventCache(
    writeTreeRef.writeTree,
    writeTreeRef.treePath,
    completeServerCache,
    writeIdsToExclude,
    includeHiddenWrites
  );
}

/**
 * If possible, returns a children node containing all of the complete children we have data for. The returned data is a
 * mix of the given server data and write data.
 *
 */
export function writeTreeRefCalcCompleteEventChildren(
  writeTreeRef: WriteTreeRef,
  completeServerChildren: ChildrenNode | null
): ChildrenNode {
  return writeTreeCalcCompleteEventChildren(
    writeTreeRef.writeTree,
    writeTreeRef.treePath,
    completeServerChildren
  ) as ChildrenNode;
}

/**
 * Given that either the underlying server data has updated or the outstanding writes have updated, determine what,
 * if anything, needs to be applied to the event cache.
 *
 * Possibilities:
 *
 * 1. No writes are shadowing. Events should be raised, the snap to be applied comes from the server data
 *
 * 2. Some write is completely shadowing. No events to be raised
 *
 * 3. Is partially shadowed. Events should be raised
 *
 * Either existingEventSnap or existingServerSnap must exist, this is validated via an assert
 *
 *
 */
export function writeTreeRefCalcEventCacheAfterServerOverwrite(
  writeTreeRef: WriteTreeRef,
  path: Path,
  existingEventSnap: Node | null,
  existingServerSnap: Node | null
): Node | null {
  return writeTreeCalcEventCacheAfterServerOverwrite(
    writeTreeRef.writeTree,
    writeTreeRef.treePath,
    path,
    existingEventSnap,
    existingServerSnap
  );
}

/**
 * Returns a node if there is a complete overwrite for this path. More specifically, if there is a write at
 * a higher path, this will return the child of that write relative to the write and this path.
 * Returns null if there is no write at this path.
 *
 */
export function writeTreeRefShadowingWrite(
  writeTreeRef: WriteTreeRef,
  path: Path
): Node | null {
  return writeTreeShadowingWrite(
    writeTreeRef.writeTree,
    pathChild(writeTreeRef.treePath, path)
  );
}

/**
 * This method is used when processing child remove events on a query. If we can, we pull in children that were outside
 * the window, but may now be in the window
 */
export function writeTreeRefCalcIndexedSlice(
  writeTreeRef: WriteTreeRef,
  completeServerData: Node | null,
  startPost: NamedNode,
  count: number,
  reverse: boolean,
  index: Index
): NamedNode[] {
  return writeTreeCalcIndexedSlice(
    writeTreeRef.writeTree,
    writeTreeRef.treePath,
    completeServerData,
    startPost,
    count,
    reverse,
    index
  );
}

/**
 * Returns a complete child for a given server snap after applying all user writes or null if there is no
 * complete child for this ChildKey.
 */
export function writeTreeRefCalcCompleteChild(
  writeTreeRef: WriteTreeRef,
  childKey: string,
  existingServerCache: CacheNode
): Node | null {
  return writeTreeCalcCompleteChild(
    writeTreeRef.writeTree,
    writeTreeRef.treePath,
    childKey,
    existingServerCache
  );
}

/**
 * Return a WriteTreeRef for a child.
 */
export function writeTreeRefChild(
  writeTreeRef: WriteTreeRef,
  childName: string
): WriteTreeRef {
  return newWriteTreeRef(
    pathChild(writeTreeRef.treePath, childName),
    writeTreeRef.writeTree
  );
}

export function newWriteTreeRef(
  path: Path,
  writeTree: WriteTree
): WriteTreeRef {
  return {
    treePath: path,
    writeTree
  };
}

/**
 * A WriteTreeRef wraps a WriteTree and a path, for convenient access to a particular subtree.  All of the methods
 * just proxy to the underlying WriteTree.
 *
 */
export interface WriteTreeRef {
  /**
   * The path to this particular write tree ref. Used for calling methods on writeTree_ while exposing a simpler
   * interface to callers.
   */
  readonly treePath: Path;

  /**
   * * A reference to the actual tree of write data. All methods are pass-through to the tree, but with the appropriate
   * path prefixed.
   *
   * This lets us make cheap references to points in the tree for sync points without having to copy and maintain all of
   * the data.
   */
  readonly writeTree: WriteTree;
}
