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

import { IndexedFilter } from './IndexedFilter';
import { PRIORITY_INDEX } from '../../snap/indexes/PriorityIndex';
import { NamedNode, Node } from '../../../core/snap/Node';
import { ChildrenNode } from '../../snap/ChildrenNode';
import { NodeFilter } from './NodeFilter';
import { QueryParams } from '../QueryParams';
import { Index } from '../../snap/indexes/Index';
import { Path } from '../../util/Path';
import { CompleteChildSource } from '../CompleteChildSource';
import { ChildChangeAccumulator } from '../ChildChangeAccumulator';

/**
 * Filters nodes by range and uses an IndexFilter to track any changes after filtering the node
 *
 * @constructor
 * @implements {NodeFilter}
 */
export class RangedFilter implements NodeFilter {
  /**
   * @type {!IndexedFilter}
   * @const
   * @private
   */
  private indexedFilter_: IndexedFilter;

  /**
   * @const
   * @type {!Index}
   * @private
   */
  private index_: Index;

  /**
   * @const
   * @type {!NamedNode}
   * @private
   */
  private startPost_: NamedNode;

  /**
   * @const
   * @type {!NamedNode}
   * @private
   */
  private endPost_: NamedNode;

  /**
   * @param {!QueryParams} params
   */
  constructor(params: QueryParams) {
    this.indexedFilter_ = new IndexedFilter(params.getIndex());
    this.index_ = params.getIndex();
    this.startPost_ = RangedFilter.getStartPost_(params);
    this.endPost_ = RangedFilter.getEndPost_(params);
  }

  /**
   * @return {!NamedNode}
   */
  getStartPost(): NamedNode {
    return this.startPost_;
  }

  /**
   * @return {!NamedNode}
   */
  getEndPost(): NamedNode {
    return this.endPost_;
  }

  /**
   * @param {!NamedNode} node
   * @return {boolean}
   */
  matches(node: NamedNode): boolean {
    return (
      this.index_.compare(this.getStartPost(), node) <= 0 &&
      this.index_.compare(node, this.getEndPost()) <= 0
    );
  }

  /**
   * @inheritDoc
   */
  updateChild(
    snap: Node,
    key: string,
    newChild: Node,
    affectedPath: Path,
    source: CompleteChildSource,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node {
    if (!this.matches(new NamedNode(key, newChild))) {
      newChild = ChildrenNode.EMPTY_NODE;
    }
    return this.indexedFilter_.updateChild(
      snap,
      key,
      newChild,
      affectedPath,
      source,
      optChangeAccumulator
    );
  }

  /**
   * @inheritDoc
   */
  updateFullNode(
    oldSnap: Node,
    newSnap: Node,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node {
    if (newSnap.isLeafNode()) {
      // Make sure we have a children node with the correct index, not a leaf node;
      newSnap = ChildrenNode.EMPTY_NODE;
    }
    let filtered = newSnap.withIndex(this.index_);
    // Don't support priorities on queries
    filtered = filtered.updatePriority(ChildrenNode.EMPTY_NODE);
    const self = this;
    newSnap.forEachChild(PRIORITY_INDEX, (key, childNode) => {
      if (!self.matches(new NamedNode(key, childNode))) {
        filtered = filtered.updateImmediateChild(key, ChildrenNode.EMPTY_NODE);
      }
    });
    return this.indexedFilter_.updateFullNode(
      oldSnap,
      filtered,
      optChangeAccumulator
    );
  }

  /**
   * @inheritDoc
   */
  updatePriority(oldSnap: Node, newPriority: Node): Node {
    // Don't support priorities on queries
    return oldSnap;
  }

  /**
   * @inheritDoc
   */
  filtersNodes(): boolean {
    return true;
  }

  /**
   * @inheritDoc
   */
  getIndexedFilter(): IndexedFilter {
    return this.indexedFilter_;
  }

  /**
   * @inheritDoc
   */
  getIndex(): Index {
    return this.index_;
  }

  /**
   * @param {!QueryParams} params
   * @return {!NamedNode}
   * @private
   */
  private static getStartPost_(params: QueryParams): NamedNode {
    if (params.hasStart()) {
      const startName = params.getIndexStartName();
      return params.getIndex().makePost(params.getIndexStartValue(), startName);
    } else {
      return params.getIndex().minPost();
    }
  }

  /**
   * @param {!QueryParams} params
   * @return {!NamedNode}
   * @private
   */
  private static getEndPost_(params: QueryParams): NamedNode {
    if (params.hasEnd()) {
      const endName = params.getIndexEndName();
      return params.getIndex().makePost(params.getIndexEndValue(), endName);
    } else {
      return params.getIndex().maxPost();
    }
  }
}
