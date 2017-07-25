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

import { Node } from '../../snap/Node';
import { Path } from '../../util/Path';
import { CompleteChildSource } from '../CompleteChildSource';
import { ChildChangeAccumulator } from '../ChildChangeAccumulator';
import { Index } from '../../snap/indexes/Index';

/**
 * NodeFilter is used to update nodes and complete children of nodes while applying queries on the fly and keeping
 * track of any child changes. This class does not track value changes as value changes depend on more
 * than just the node itself. Different kind of queries require different kind of implementations of this interface.
 * @interface
 */
export interface NodeFilter {
  /**
   * Update a single complete child in the snap. If the child equals the old child in the snap, this is a no-op.
   * The method expects an indexed snap.
   *
   * @param {!Node} snap
   * @param {string} key
   * @param {!Node} newChild
   * @param {!Path} affectedPath
   * @param {!CompleteChildSource} source
   * @param {?ChildChangeAccumulator} optChangeAccumulator
   * @return {!Node}
   */
  updateChild(
    snap: Node,
    key: string,
    newChild: Node,
    affectedPath: Path,
    source: CompleteChildSource,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node;

  /**
   * Update a node in full and output any resulting change from this complete update.
   *
   * @param {!Node} oldSnap
   * @param {!Node} newSnap
   * @param {?ChildChangeAccumulator} optChangeAccumulator
   * @return {!Node}
   */
  updateFullNode(
    oldSnap: Node,
    newSnap: Node,
    optChangeAccumulator: ChildChangeAccumulator | null
  ): Node;

  /**
   * Update the priority of the root node
   *
   * @param {!Node} oldSnap
   * @param {!Node} newPriority
   * @return {!Node}
   */
  updatePriority(oldSnap: Node, newPriority: Node): Node;

  /**
   * Returns true if children might be filtered due to query criteria
   *
   * @return {boolean}
   */
  filtersNodes(): boolean;

  /**
   * Returns the index filter that this filter uses to get a NodeFilter that doesn't filter any children.
   * @return {!NodeFilter}
   */
  getIndexedFilter(): NodeFilter;

  /**
   * Returns the index that this filter uses
   * @return {!Index}
   */
  getIndex(): Index;
}
