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

import { assert } from '@firebase/util';
import { Change } from '../Change';
import { ChildrenNode } from '../../snap/ChildrenNode';
import { PRIORITY_INDEX } from '../../snap/indexes/PriorityIndex';
import { NodeFilter } from './NodeFilter';
import { Index } from '../../snap/indexes/Index';
import { Path } from '../../util/Path';
import { CompleteChildSource } from '../CompleteChildSource';
import { ChildChangeAccumulator } from '../ChildChangeAccumulator';
import { Node } from '../../snap/Node';

/**
 * Doesn't really filter nodes but applies an index to the node and keeps track of any changes
 *
 * @constructor
 * @implements {NodeFilter}
 * @param {!Index} index
 */
export class IndexedFilter implements NodeFilter {
  constructor(private readonly index_: Index) {}

  updateChild(
    snap: Node,
    key: string,
    newChild: Node,
    affectedPath: Path,
    source: CompleteChildSource,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node {
    assert(
      snap.isIndexed(this.index_),
      'A node must be indexed if only a child is updated'
    );
    const oldChild = snap.getImmediateChild(key);
    // Check if anything actually changed.
    if (
      oldChild.getChild(affectedPath).equals(newChild.getChild(affectedPath))
    ) {
      // There's an edge case where a child can enter or leave the view because affectedPath was set to null.
      // In this case, affectedPath will appear null in both the old and new snapshots.  So we need
      // to avoid treating these cases as "nothing changed."
      if (oldChild.isEmpty() == newChild.isEmpty()) {
        // Nothing changed.

        // This assert should be valid, but it's expensive (can dominate perf testing) so don't actually do it.
        //assert(oldChild.equals(newChild), 'Old and new snapshots should be equal.');
        return snap;
      }
    }

    if (optChangeAccumulator != null) {
      if (newChild.isEmpty()) {
        if (snap.hasChild(key)) {
          optChangeAccumulator.trackChildChange(
            Change.childRemovedChange(key, oldChild)
          );
        } else {
          assert(
            snap.isLeafNode(),
            'A child remove without an old child only makes sense on a leaf node'
          );
        }
      } else if (oldChild.isEmpty()) {
        optChangeAccumulator.trackChildChange(
          Change.childAddedChange(key, newChild)
        );
      } else {
        optChangeAccumulator.trackChildChange(
          Change.childChangedChange(key, newChild, oldChild)
        );
      }
    }
    if (snap.isLeafNode() && newChild.isEmpty()) {
      return snap;
    } else {
      // Make sure the node is indexed
      return snap.updateImmediateChild(key, newChild).withIndex(this.index_);
    }
  }

  /**
   * @inheritDoc
   */
  updateFullNode(
    oldSnap: Node,
    newSnap: Node,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node {
    if (optChangeAccumulator != null) {
      if (!oldSnap.isLeafNode()) {
        oldSnap.forEachChild(PRIORITY_INDEX, function(key, childNode) {
          if (!newSnap.hasChild(key)) {
            optChangeAccumulator.trackChildChange(
              Change.childRemovedChange(key, childNode)
            );
          }
        });
      }
      if (!newSnap.isLeafNode()) {
        newSnap.forEachChild(PRIORITY_INDEX, function(key, childNode) {
          if (oldSnap.hasChild(key)) {
            const oldChild = oldSnap.getImmediateChild(key);
            if (!oldChild.equals(childNode)) {
              optChangeAccumulator.trackChildChange(
                Change.childChangedChange(key, childNode, oldChild)
              );
            }
          } else {
            optChangeAccumulator.trackChildChange(
              Change.childAddedChange(key, childNode)
            );
          }
        });
      }
    }
    return newSnap.withIndex(this.index_);
  }

  /**
   * @inheritDoc
   */
  updatePriority(oldSnap: Node, newPriority: Node): Node {
    if (oldSnap.isEmpty()) {
      return ChildrenNode.EMPTY_NODE;
    } else {
      return oldSnap.updatePriority(newPriority);
    }
  }

  /**
   * @inheritDoc
   */
  filtersNodes(): boolean {
    return false;
  }

  /**
   * @inheritDoc
   */
  getIndexedFilter(): IndexedFilter {
    return this;
  }

  /**
   * @inheritDoc
   */
  getIndex(): Index {
    return this.index_;
  }
}
