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

import { assert } from '@firebase/util';

import { ChildrenNode } from '../../snap/ChildrenNode';
import { Index } from '../../snap/indexes/Index';
import { NamedNode, Node } from '../../snap/Node';
import { Path } from '../../util/Path';
import {
  changeChildAdded,
  changeChildChanged,
  changeChildRemoved
} from '../Change';
import { ChildChangeAccumulator } from '../ChildChangeAccumulator';
import { CompleteChildSource } from '../CompleteChildSource';
import { QueryParams } from '../QueryParams';

import { IndexedFilter } from './IndexedFilter';
import { NodeFilter } from './NodeFilter';
import { RangedFilter } from './RangedFilter';

/**
 * Applies a limit and a range to a node and uses RangedFilter to do the heavy lifting where possible
 */
export class LimitedFilter implements NodeFilter {
  private readonly rangedFilter_: RangedFilter;

  private readonly index_: Index;

  private readonly limit_: number;

  private readonly reverse_: boolean;

  private readonly startIsInclusive_: boolean;

  private readonly endIsInclusive_: boolean;

  constructor(params: QueryParams) {
    this.rangedFilter_ = new RangedFilter(params);
    this.index_ = params.getIndex();
    this.limit_ = params.getLimit();
    this.reverse_ = !params.isViewFromLeft();
    this.startIsInclusive_ = !params.startAfterSet_;
    this.endIsInclusive_ = !params.endBeforeSet_;
  }
  updateChild(
    snap: Node,
    key: string,
    newChild: Node,
    affectedPath: Path,
    source: CompleteChildSource,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node {
    if (!this.rangedFilter_.matches(new NamedNode(key, newChild))) {
      newChild = ChildrenNode.EMPTY_NODE;
    }
    if (snap.getImmediateChild(key).equals(newChild)) {
      // No change
      return snap;
    } else if (snap.numChildren() < this.limit_) {
      return this.rangedFilter_
        .getIndexedFilter()
        .updateChild(
          snap,
          key,
          newChild,
          affectedPath,
          source,
          optChangeAccumulator
        );
    } else {
      return this.fullLimitUpdateChild_(
        snap,
        key,
        newChild,
        source,
        optChangeAccumulator
      );
    }
  }
  updateFullNode(
    oldSnap: Node,
    newSnap: Node,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node {
    let filtered;
    if (newSnap.isLeafNode() || newSnap.isEmpty()) {
      // Make sure we have a children node with the correct index, not a leaf node;
      filtered = ChildrenNode.EMPTY_NODE.withIndex(this.index_);
    } else {
      if (
        this.limit_ * 2 < newSnap.numChildren() &&
        newSnap.isIndexed(this.index_)
      ) {
        // Easier to build up a snapshot, since what we're given has more than twice the elements we want
        filtered = ChildrenNode.EMPTY_NODE.withIndex(this.index_);
        // anchor to the startPost, endPost, or last element as appropriate
        let iterator;
        if (this.reverse_) {
          iterator = (newSnap as ChildrenNode).getReverseIteratorFrom(
            this.rangedFilter_.getEndPost(),
            this.index_
          );
        } else {
          iterator = (newSnap as ChildrenNode).getIteratorFrom(
            this.rangedFilter_.getStartPost(),
            this.index_
          );
        }
        let count = 0;
        while (iterator.hasNext() && count < this.limit_) {
          const next = iterator.getNext();
          if (!this.withinDirectionalStart(next)) {
            // if we have not reached the start, skip to the next element
            continue;
          } else if (!this.withinDirectionalEnd(next)) {
            // if we have reached the end, stop adding elements
            break;
          } else {
            filtered = filtered.updateImmediateChild(next.name, next.node);
            count++;
          }
        }
      } else {
        // The snap contains less than twice the limit. Faster to delete from the snap than build up a new one
        filtered = newSnap.withIndex(this.index_);
        // Don't support priorities on queries
        filtered = filtered.updatePriority(
          ChildrenNode.EMPTY_NODE
        ) as ChildrenNode;

        let iterator;
        if (this.reverse_) {
          iterator = filtered.getReverseIterator(this.index_);
        } else {
          iterator = filtered.getIterator(this.index_);
        }

        let count = 0;
        while (iterator.hasNext()) {
          const next = iterator.getNext();
          const inRange =
            count < this.limit_ &&
            this.withinDirectionalStart(next) &&
            this.withinDirectionalEnd(next);
          if (inRange) {
            count++;
          } else {
            filtered = filtered.updateImmediateChild(
              next.name,
              ChildrenNode.EMPTY_NODE
            );
          }
        }
      }
    }
    return this.rangedFilter_
      .getIndexedFilter()
      .updateFullNode(oldSnap, filtered, optChangeAccumulator);
  }
  updatePriority(oldSnap: Node, newPriority: Node): Node {
    // Don't support priorities on queries
    return oldSnap;
  }
  filtersNodes(): boolean {
    return true;
  }
  getIndexedFilter(): IndexedFilter {
    return this.rangedFilter_.getIndexedFilter();
  }
  getIndex(): Index {
    return this.index_;
  }

  private fullLimitUpdateChild_(
    snap: Node,
    childKey: string,
    childSnap: Node,
    source: CompleteChildSource,
    changeAccumulator: ChildChangeAccumulator | null
  ): Node {
    // TODO: rename all cache stuff etc to general snap terminology
    let cmp;
    if (this.reverse_) {
      const indexCmp = this.index_.getCompare();
      cmp = (a: NamedNode, b: NamedNode) => indexCmp(b, a);
    } else {
      cmp = this.index_.getCompare();
    }
    const oldEventCache = snap as ChildrenNode;
    assert(oldEventCache.numChildren() === this.limit_, '');
    const newChildNamedNode = new NamedNode(childKey, childSnap);
    const windowBoundary = this.reverse_
      ? oldEventCache.getFirstChild(this.index_)
      : (oldEventCache.getLastChild(this.index_) as NamedNode);
    const inRange = this.rangedFilter_.matches(newChildNamedNode);
    if (oldEventCache.hasChild(childKey)) {
      const oldChildSnap = oldEventCache.getImmediateChild(childKey);
      let nextChild = source.getChildAfterChild(
        this.index_,
        windowBoundary,
        this.reverse_
      );
      while (
        nextChild != null &&
        (nextChild.name === childKey || oldEventCache.hasChild(nextChild.name))
      ) {
        // There is a weird edge case where a node is updated as part of a merge in the write tree, but hasn't
        // been applied to the limited filter yet. Ignore this next child which will be updated later in
        // the limited filter...
        nextChild = source.getChildAfterChild(
          this.index_,
          nextChild,
          this.reverse_
        );
      }
      const compareNext =
        nextChild == null ? 1 : cmp(nextChild, newChildNamedNode);
      const remainsInWindow =
        inRange && !childSnap.isEmpty() && compareNext >= 0;
      if (remainsInWindow) {
        if (changeAccumulator != null) {
          changeAccumulator.trackChildChange(
            changeChildChanged(childKey, childSnap, oldChildSnap)
          );
        }
        return oldEventCache.updateImmediateChild(childKey, childSnap);
      } else {
        if (changeAccumulator != null) {
          changeAccumulator.trackChildChange(
            changeChildRemoved(childKey, oldChildSnap)
          );
        }
        const newEventCache = oldEventCache.updateImmediateChild(
          childKey,
          ChildrenNode.EMPTY_NODE
        );
        const nextChildInRange =
          nextChild != null && this.rangedFilter_.matches(nextChild);
        if (nextChildInRange) {
          if (changeAccumulator != null) {
            changeAccumulator.trackChildChange(
              changeChildAdded(nextChild.name, nextChild.node)
            );
          }
          return newEventCache.updateImmediateChild(
            nextChild.name,
            nextChild.node
          );
        } else {
          return newEventCache;
        }
      }
    } else if (childSnap.isEmpty()) {
      // we're deleting a node, but it was not in the window, so ignore it
      return snap;
    } else if (inRange) {
      if (cmp(windowBoundary, newChildNamedNode) >= 0) {
        if (changeAccumulator != null) {
          changeAccumulator.trackChildChange(
            changeChildRemoved(windowBoundary.name, windowBoundary.node)
          );
          changeAccumulator.trackChildChange(
            changeChildAdded(childKey, childSnap)
          );
        }
        return oldEventCache
          .updateImmediateChild(childKey, childSnap)
          .updateImmediateChild(windowBoundary.name, ChildrenNode.EMPTY_NODE);
      } else {
        return snap;
      }
    } else {
      return snap;
    }
  }

  private withinDirectionalStart = (node: NamedNode) =>
    this.reverse_ ? this.withinEndPost(node) : this.withinStartPost(node);

  private withinDirectionalEnd = (node: NamedNode) =>
    this.reverse_ ? this.withinStartPost(node) : this.withinEndPost(node);

  private withinStartPost = (node: NamedNode) => {
    const compareRes = this.index_.compare(
      this.rangedFilter_.getStartPost(),
      node
    );
    return this.startIsInclusive_ ? compareRes <= 0 : compareRes < 0;
  };

  private withinEndPost = (node: NamedNode) => {
    const compareRes = this.index_.compare(
      node,
      this.rangedFilter_.getEndPost()
    );
    return this.endIsInclusive_ ? compareRes <= 0 : compareRes < 0;
  };
}
