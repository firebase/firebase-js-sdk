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

import { ChildrenNode } from '../snap/ChildrenNode';
import { CacheNode } from './CacheNode';
import { Node } from '../snap/Node';

/**
 * Stores the data we have cached for a view.
 *
 * serverSnap is the cached server data, eventSnap is the cached event data (server data plus any local writes).
 *
 * @constructor
 */
export class ViewCache {
  /**
   *
   * @param {!CacheNode} eventCache_
   * @param {!CacheNode} serverCache_
   */
  constructor(
    private readonly eventCache_: CacheNode,
    private readonly serverCache_: CacheNode
  ) {}

  /**
   * @const
   * @type {ViewCache}
   */
  static Empty = new ViewCache(
    new CacheNode(
      ChildrenNode.EMPTY_NODE,
      /*fullyInitialized=*/ false,
      /*filtered=*/ false
    ),
    new CacheNode(
      ChildrenNode.EMPTY_NODE,
      /*fullyInitialized=*/ false,
      /*filtered=*/ false
    )
  );

  /**
   * @param {!Node} eventSnap
   * @param {boolean} complete
   * @param {boolean} filtered
   * @return {!ViewCache}
   */
  updateEventSnap(
    eventSnap: Node,
    complete: boolean,
    filtered: boolean
  ): ViewCache {
    return new ViewCache(
      new CacheNode(eventSnap, complete, filtered),
      this.serverCache_
    );
  }

  /**
   * @param {!Node} serverSnap
   * @param {boolean} complete
   * @param {boolean} filtered
   * @return {!ViewCache}
   */
  updateServerSnap(
    serverSnap: Node,
    complete: boolean,
    filtered: boolean
  ): ViewCache {
    return new ViewCache(
      this.eventCache_,
      new CacheNode(serverSnap, complete, filtered)
    );
  }

  /**
   * @return {!CacheNode}
   */
  getEventCache(): CacheNode {
    return this.eventCache_;
  }

  /**
   * @return {?Node}
   */
  getCompleteEventSnap(): Node | null {
    return this.eventCache_.isFullyInitialized()
      ? this.eventCache_.getNode()
      : null;
  }

  /**
   * @return {!CacheNode}
   */
  getServerCache(): CacheNode {
    return this.serverCache_;
  }

  /**
   * @return {?Node}
   */
  getCompleteServerSnap(): Node | null {
    return this.serverCache_.isFullyInitialized()
      ? this.serverCache_.getNode()
      : null;
  }
}
