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

import { safeGet, assert, assertionError } from '@firebase/util';

import { Path } from './util/Path';
import { CompoundWrite } from './CompoundWrite';
import { PRIORITY_INDEX } from './snap/indexes/PriorityIndex';
import { ChildrenNode } from './snap/ChildrenNode';
import { NamedNode, Node } from './snap/Node';
import { CacheNode } from './view/CacheNode';
import { Index } from './snap/indexes/Index';
import { each } from './util/util';

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
 * WriteTree tracks all pending user-initiated writes and has methods to calculate the result of merging them
 * with underlying server data (to create "event cache" data).  Pending writes are added with addOverwrite()
 * and addMerge(), and removed with removeWrite().
 *
 * @constructor
 */
export class WriteTree {
  /**
   * A tree tracking the result of applying all visible writes.  This does not include transactions with
   * applyLocally=false or writes that are completely shadowed by other writes.
   *
   * @type {!CompoundWrite}
   * @private
   */
  private visibleWrites_: CompoundWrite = CompoundWrite.Empty;

  /**
   * A list of all pending writes, regardless of visibility and shadowed-ness.  Used to calculate arbitrary
   * sets of the changed data, such as hidden writes (from transactions) or changes with certain writes excluded (also
   * used by transactions).
   *
   * @type {!Array.<!WriteRecord>}
   * @private
   */
  private allWrites_: WriteRecord[] = [];

  private lastWriteId_ = -1;

  /**
   * Create a new WriteTreeRef for the given path. For use with a new sync point at the given path.
   *
   * @param {!Path} path
   * @return {!WriteTreeRef}
   */
  childWrites(path: Path): WriteTreeRef {
    return new WriteTreeRef(path, this);
  }

  /**
   * Record a new overwrite from user code.
   *
   * @param {!Path} path
   * @param {!Node} snap
   * @param {!number} writeId
   * @param {boolean=} visible This is set to false by some transactions. It should be excluded from event caches
   */
  addOverwrite(path: Path, snap: Node, writeId: number, visible?: boolean) {
    assert(
      writeId > this.lastWriteId_,
      'Stacking an older write on top of newer ones'
    );
    if (visible === undefined) {
      visible = true;
    }
    this.allWrites_.push({
      path,
      snap,
      writeId,
      visible
    });

    if (visible) {
      this.visibleWrites_ = this.visibleWrites_.addWrite(path, snap);
    }
    this.lastWriteId_ = writeId;
  }

  /**
   * Record a new merge from user code.
   *
   * @param {!Path} path
   * @param {!Object.<string, !Node>} changedChildren
   * @param {!number} writeId
   */
  addMerge(
    path: Path,
    changedChildren: { [k: string]: Node },
    writeId: number
  ) {
    assert(
      writeId > this.lastWriteId_,
      'Stacking an older merge on top of newer ones'
    );
    this.allWrites_.push({
      path,
      children: changedChildren,
      writeId,
      visible: true
    });

    this.visibleWrites_ = this.visibleWrites_.addWrites(path, changedChildren);
    this.lastWriteId_ = writeId;
  }

  /**
   * @param {!number} writeId
   * @return {?WriteRecord}
   */
  getWrite(writeId: number): WriteRecord | null {
    for (let i = 0; i < this.allWrites_.length; i++) {
      const record = this.allWrites_[i];
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
   * @param {!number} writeId
   * @return {boolean} true if the write may have been visible (meaning we'll need to reevaluate / raise
   * events as a result).
   */
  removeWrite(writeId: number): boolean {
    // Note: disabling this check. It could be a transaction that preempted another transaction, and thus was applied
    // out of order.
    //const validClear = revert || this.allWrites_.length === 0 || writeId <= this.allWrites_[0].writeId;
    //assert(validClear, "Either we don't have this write, or it's the first one in the queue");

    const idx = this.allWrites_.findIndex(s => {
      return s.writeId === writeId;
    });
    assert(idx >= 0, 'removeWrite called with nonexistent writeId.');
    const writeToRemove = this.allWrites_[idx];
    this.allWrites_.splice(idx, 1);

    let removedWriteWasVisible = writeToRemove.visible;
    let removedWriteOverlapsWithOtherWrites = false;

    let i = this.allWrites_.length - 1;

    while (removedWriteWasVisible && i >= 0) {
      const currentWrite = this.allWrites_[i];
      if (currentWrite.visible) {
        if (
          i >= idx &&
          this.recordContainsPath_(currentWrite, writeToRemove.path)
        ) {
          // The removed write was completely shadowed by a subsequent write.
          removedWriteWasVisible = false;
        } else if (writeToRemove.path.contains(currentWrite.path)) {
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
      this.resetTree_();
      return true;
    } else {
      // There's no shadowing.  We can safely just remove the write(s) from visibleWrites.
      if (writeToRemove.snap) {
        this.visibleWrites_ = this.visibleWrites_.removeWrite(
          writeToRemove.path
        );
      } else {
        const children = writeToRemove.children;
        each(children, (childName: string) => {
          this.visibleWrites_ = this.visibleWrites_.removeWrite(
            writeToRemove.path.child(childName)
          );
        });
      }
      return true;
    }
  }

  /**
   * Return a complete snapshot for the given path if there's visible write data at that path, else null.
   * No server data is considered.
   *
   * @param {!Path} path
   * @return {?Node}
   */
  getCompleteWriteData(path: Path): Node | null {
    return this.visibleWrites_.getCompleteNode(path);
  }

  /**
   * Given optional, underlying server data, and an optional set of constraints (exclude some sets, include hidden
   * writes), attempt to calculate a complete snapshot for the given path
   *
   * @param {!Path} treePath
   * @param {?Node} completeServerCache
   * @param {Array.<number>=} writeIdsToExclude An optional set to be excluded
   * @param {boolean=} includeHiddenWrites Defaults to false, whether or not to layer on writes with visible set to false
   * @return {?Node}
   */
  calcCompleteEventCache(
    treePath: Path,
    completeServerCache: Node | null,
    writeIdsToExclude?: number[],
    includeHiddenWrites?: boolean
  ): Node | null {
    if (!writeIdsToExclude && !includeHiddenWrites) {
      const shadowingNode = this.visibleWrites_.getCompleteNode(treePath);
      if (shadowingNode != null) {
        return shadowingNode;
      } else {
        const subMerge = this.visibleWrites_.childCompoundWrite(treePath);
        if (subMerge.isEmpty()) {
          return completeServerCache;
        } else if (
          completeServerCache == null &&
          !subMerge.hasCompleteWrite(Path.Empty)
        ) {
          // We wouldn't have a complete snapshot, since there's no underlying data and no complete shadow
          return null;
        } else {
          const layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
          return subMerge.apply(layeredCache);
        }
      }
    } else {
      const merge = this.visibleWrites_.childCompoundWrite(treePath);
      if (!includeHiddenWrites && merge.isEmpty()) {
        return completeServerCache;
      } else {
        // If the server cache is null, and we don't have a complete cache, we need to return null
        if (
          !includeHiddenWrites &&
          completeServerCache == null &&
          !merge.hasCompleteWrite(Path.Empty)
        ) {
          return null;
        } else {
          const filter = function (write: WriteRecord) {
            return (
              (write.visible || includeHiddenWrites) &&
              (!writeIdsToExclude ||
                !~writeIdsToExclude.indexOf(write.writeId)) &&
              (write.path.contains(treePath) || treePath.contains(write.path))
            );
          };
          const mergeAtPath = WriteTree.layerTree_(
            this.allWrites_,
            filter,
            treePath
          );
          const layeredCache = completeServerCache || ChildrenNode.EMPTY_NODE;
          return mergeAtPath.apply(layeredCache);
        }
      }
    }
  }

  /**
   * With optional, underlying server data, attempt to return a children node of children that we have complete data for.
   * Used when creating new views, to pre-fill their complete event children snapshot.
   *
   * @param {!Path} treePath
   * @param {?ChildrenNode} completeServerChildren
   * @return {!ChildrenNode}
   */
  calcCompleteEventChildren(
    treePath: Path,
    completeServerChildren: ChildrenNode | null
  ) {
    let completeChildren = ChildrenNode.EMPTY_NODE as Node;
    const topLevelSet = this.visibleWrites_.getCompleteNode(treePath);
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
      const merge = this.visibleWrites_.childCompoundWrite(treePath);
      completeServerChildren.forEachChild(
        PRIORITY_INDEX,
        (childName, childNode) => {
          const node = merge
            .childCompoundWrite(new Path(childName))
            .apply(childNode);
          completeChildren = completeChildren.updateImmediateChild(
            childName,
            node
          );
        }
      );
      // Add any complete children we have from the set
      merge.getCompleteChildren().forEach(namedNode => {
        completeChildren = completeChildren.updateImmediateChild(
          namedNode.name,
          namedNode.node
        );
      });
      return completeChildren;
    } else {
      // We don't have anything to layer on top of. Layer on any children we have
      // Note that we can return an empty snap if we have a defined delete
      const merge = this.visibleWrites_.childCompoundWrite(treePath);
      merge.getCompleteChildren().forEach(namedNode => {
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
   *
   * @param {!Path} treePath
   * @param {!Path} childPath
   * @param {?Node} existingEventSnap
   * @param {?Node} existingServerSnap
   * @return {?Node}
   */
  calcEventCacheAfterServerOverwrite(
    treePath: Path,
    childPath: Path,
    existingEventSnap: Node | null,
    existingServerSnap: Node | null
  ): Node | null {
    assert(
      existingEventSnap || existingServerSnap,
      'Either existingEventSnap or existingServerSnap must exist'
    );
    const path = treePath.child(childPath);
    if (this.visibleWrites_.hasCompleteWrite(path)) {
      // At this point we can probably guarantee that we're in case 2, meaning no events
      // May need to check visibility while doing the findRootMostValueAndPath call
      return null;
    } else {
      // No complete shadowing. We're either partially shadowing or not shadowing at all.
      const childMerge = this.visibleWrites_.childCompoundWrite(path);
      if (childMerge.isEmpty()) {
        // We're not shadowing at all. Case 1
        return existingServerSnap.getChild(childPath);
      } else {
        // This could be more efficient if the serverNode + updates doesn't change the eventSnap
        // However this is tricky to find out, since user updates don't necessary change the server
        // snap, e.g. priority updates on empty nodes, or deep deletes. Another special case is if the server
        // adds nodes, but doesn't change any existing writes. It is therefore not enough to
        // only check if the updates change the serverNode.
        // Maybe check if the merge tree contains these special cases and only do a full overwrite in that case?
        return childMerge.apply(existingServerSnap.getChild(childPath));
      }
    }
  }

  /**
   * Returns a complete child for a given server snap after applying all user writes or null if there is no
   * complete child for this ChildKey.
   *
   * @param {!Path} treePath
   * @param {!string} childKey
   * @param {!CacheNode} existingServerSnap
   * @return {?Node}
   */
  calcCompleteChild(
    treePath: Path,
    childKey: string,
    existingServerSnap: CacheNode
  ): Node | null {
    const path = treePath.child(childKey);
    const shadowingNode = this.visibleWrites_.getCompleteNode(path);
    if (shadowingNode != null) {
      return shadowingNode;
    } else {
      if (existingServerSnap.isCompleteForChild(childKey)) {
        const childMerge = this.visibleWrites_.childCompoundWrite(path);
        return childMerge.apply(
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
  shadowingWrite(path: Path): Node | null {
    return this.visibleWrites_.getCompleteNode(path);
  }

  /**
   * This method is used when processing child remove events on a query. If we can, we pull in children that were outside
   * the window, but may now be in the window.
   */
  calcIndexedSlice(
    treePath: Path,
    completeServerData: Node | null,
    startPost: NamedNode,
    count: number,
    reverse: boolean,
    index: Index
  ): NamedNode[] {
    let toIterate: Node;
    const merge = this.visibleWrites_.childCompoundWrite(treePath);
    const shadowingNode = merge.getCompleteNode(Path.Empty);
    if (shadowingNode != null) {
      toIterate = shadowingNode;
    } else if (completeServerData != null) {
      toIterate = merge.apply(completeServerData);
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

  private recordContainsPath_(writeRecord: WriteRecord, path: Path): boolean {
    if (writeRecord.snap) {
      return writeRecord.path.contains(path);
    } else {
      for (const childName in writeRecord.children) {
        if (
          writeRecord.children.hasOwnProperty(childName) &&
          writeRecord.path.child(childName).contains(path)
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
  private resetTree_() {
    this.visibleWrites_ = WriteTree.layerTree_(
      this.allWrites_,
      WriteTree.DefaultFilter_,
      Path.Empty
    );
    if (this.allWrites_.length > 0) {
      this.lastWriteId_ = this.allWrites_[this.allWrites_.length - 1].writeId;
    } else {
      this.lastWriteId_ = -1;
    }
  }

  /**
   * The default filter used when constructing the tree. Keep everything that's visible.
   */
  private static DefaultFilter_(write: WriteRecord) {
    return write.visible;
  }

  /**
   * Static method. Given an array of WriteRecords, a filter for which ones to include, and a path, construct the tree of
   * event data at that path.
   */
  private static layerTree_(
    writes: WriteRecord[],
    filter: (w: WriteRecord) => boolean,
    treeRoot: Path
  ): CompoundWrite {
    let compoundWrite = CompoundWrite.Empty;
    for (let i = 0; i < writes.length; ++i) {
      const write = writes[i];
      // Theory, a later set will either:
      // a) abort a relevant transaction, so no need to worry about excluding it from calculating that transaction
      // b) not be relevant to a transaction (separate branch), so again will not affect the data for that transaction
      if (filter(write)) {
        const writePath = write.path;
        let relativePath;
        if (write.snap) {
          if (treeRoot.contains(writePath)) {
            relativePath = Path.relativePath(treeRoot, writePath);
            compoundWrite = compoundWrite.addWrite(relativePath, write.snap);
          } else if (writePath.contains(treeRoot)) {
            relativePath = Path.relativePath(writePath, treeRoot);
            compoundWrite = compoundWrite.addWrite(
              Path.Empty,
              write.snap.getChild(relativePath)
            );
          } else {
            // There is no overlap between root path and write path, ignore write
          }
        } else if (write.children) {
          if (treeRoot.contains(writePath)) {
            relativePath = Path.relativePath(treeRoot, writePath);
            compoundWrite = compoundWrite.addWrites(
              relativePath,
              write.children
            );
          } else if (writePath.contains(treeRoot)) {
            relativePath = Path.relativePath(writePath, treeRoot);
            if (relativePath.isEmpty()) {
              compoundWrite = compoundWrite.addWrites(
                Path.Empty,
                write.children
              );
            } else {
              const child = safeGet(write.children, relativePath.getFront());
              if (child) {
                // There exists a child in this node that matches the root path
                const deepNode = child.getChild(relativePath.popFront());
                compoundWrite = compoundWrite.addWrite(Path.Empty, deepNode);
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
}

/**
 * A WriteTreeRef wraps a WriteTree and a path, for convenient access to a particular subtree.  All of the methods
 * just proxy to the underlying WriteTree.
 *
 * @constructor
 */
export class WriteTreeRef {
  /**
   * The path to this particular write tree ref. Used for calling methods on writeTree_ while exposing a simpler
   * interface to callers.
   *
   * @type {!Path}
   * @private
   * @const
   */
  private readonly treePath_: Path;

  /**
   * * A reference to the actual tree of write data. All methods are pass-through to the tree, but with the appropriate
   * path prefixed.
   *
   * This lets us make cheap references to points in the tree for sync points without having to copy and maintain all of
   * the data.
   *
   * @type {!WriteTree}
   * @private
   * @const
   */
  private readonly writeTree_: WriteTree;

  /**
   * @param {!Path} path
   * @param {!WriteTree} writeTree
   */
  constructor(path: Path, writeTree: WriteTree) {
    this.treePath_ = path;
    this.writeTree_ = writeTree;
  }

  /**
   * If possible, returns a complete event cache, using the underlying server data if possible. In addition, can be used
   * to get a cache that includes hidden writes, and excludes arbitrary writes. Note that customizing the returned node
   * can lead to a more expensive calculation.
   *
   * @param {?Node} completeServerCache
   * @param {Array.<number>=} writeIdsToExclude Optional writes to exclude.
   * @param {boolean=} includeHiddenWrites Defaults to false, whether or not to layer on writes with visible set to false
   * @return {?Node}
   */
  calcCompleteEventCache(
    completeServerCache: Node | null,
    writeIdsToExclude?: number[],
    includeHiddenWrites?: boolean
  ): Node | null {
    return this.writeTree_.calcCompleteEventCache(
      this.treePath_,
      completeServerCache,
      writeIdsToExclude,
      includeHiddenWrites
    );
  }

  /**
   * If possible, returns a children node containing all of the complete children we have data for. The returned data is a
   * mix of the given server data and write data.
   *
   * @param {?ChildrenNode} completeServerChildren
   * @return {!ChildrenNode}
   */
  calcCompleteEventChildren(
    completeServerChildren: ChildrenNode | null
  ): ChildrenNode {
    return this.writeTree_.calcCompleteEventChildren(
      this.treePath_,
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
   * @param {!Path} path
   * @param {?Node} existingEventSnap
   * @param {?Node} existingServerSnap
   * @return {?Node}
   */
  calcEventCacheAfterServerOverwrite(
    path: Path,
    existingEventSnap: Node | null,
    existingServerSnap: Node | null
  ): Node | null {
    return this.writeTree_.calcEventCacheAfterServerOverwrite(
      this.treePath_,
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
   * @param {!Path} path
   * @return {?Node}
   */
  shadowingWrite(path: Path): Node | null {
    return this.writeTree_.shadowingWrite(this.treePath_.child(path));
  }

  /**
   * This method is used when processing child remove events on a query. If we can, we pull in children that were outside
   * the window, but may now be in the window
   *
   * @param {?Node} completeServerData
   * @param {!NamedNode} startPost
   * @param {!number} count
   * @param {boolean} reverse
   * @param {!Index} index
   * @return {!Array.<!NamedNode>}
   */
  calcIndexedSlice(
    completeServerData: Node | null,
    startPost: NamedNode,
    count: number,
    reverse: boolean,
    index: Index
  ): NamedNode[] {
    return this.writeTree_.calcIndexedSlice(
      this.treePath_,
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
   *
   * @param {!string} childKey
   * @param {!CacheNode} existingServerCache
   * @return {?Node}
   */
  calcCompleteChild(
    childKey: string,
    existingServerCache: CacheNode
  ): Node | null {
    return this.writeTree_.calcCompleteChild(
      this.treePath_,
      childKey,
      existingServerCache
    );
  }

  /**
   * Return a WriteTreeRef for a child.
   *
   * @param {string} childName
   * @return {!WriteTreeRef}
   */
  child(childName: string): WriteTreeRef {
    return new WriteTreeRef(this.treePath_.child(childName), this.writeTree_);
  }
}
