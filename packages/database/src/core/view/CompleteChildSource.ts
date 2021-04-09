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

import { Index } from '../snap/indexes/Index';
import { NamedNode, Node } from '../snap/Node';
import {
  WriteTreeRef,
  writeTreeRefCalcCompleteChild,
  writeTreeRefCalcIndexedSlice
} from '../WriteTree';

import { CacheNode } from './CacheNode';
import { ViewCache, viewCacheGetCompleteServerSnap } from './ViewCache';

/**
 * Since updates to filtered nodes might require nodes to be pulled in from "outside" the node, this interface
 * can help to get complete children that can be pulled in.
 * A class implementing this interface takes potentially multiple sources (e.g. user writes, server data from
 * other views etc.) to try it's best to get a complete child that might be useful in pulling into the view.
 *
 * @interface
 */
export interface CompleteChildSource {
  getCompleteChild(childKey: string): Node | null;

  getChildAfterChild(
    index: Index,
    child: NamedNode,
    reverse: boolean
  ): NamedNode | null;
}

/**
 * An implementation of CompleteChildSource that never returns any additional children
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export class NoCompleteChildSource_ implements CompleteChildSource {
  getCompleteChild(childKey?: string): Node | null {
    return null;
  }
  getChildAfterChild(
    index?: Index,
    child?: NamedNode,
    reverse?: boolean
  ): NamedNode | null {
    return null;
  }
}

/**
 * Singleton instance.
 */
export const NO_COMPLETE_CHILD_SOURCE = new NoCompleteChildSource_();

/**
 * An implementation of CompleteChildSource that uses a WriteTree in addition to any other server data or
 * old event caches available to calculate complete children.
 */
export class WriteTreeCompleteChildSource implements CompleteChildSource {
  constructor(
    private writes_: WriteTreeRef,
    private viewCache_: ViewCache,
    private optCompleteServerCache_: Node | null = null
  ) {}
  getCompleteChild(childKey: string): Node | null {
    const node = this.viewCache_.eventCache;
    if (node.isCompleteForChild(childKey)) {
      return node.getNode().getImmediateChild(childKey);
    } else {
      const serverNode =
        this.optCompleteServerCache_ != null
          ? new CacheNode(this.optCompleteServerCache_, true, false)
          : this.viewCache_.serverCache;
      return writeTreeRefCalcCompleteChild(this.writes_, childKey, serverNode);
    }
  }
  getChildAfterChild(
    index: Index,
    child: NamedNode,
    reverse: boolean
  ): NamedNode | null {
    const completeServerData =
      this.optCompleteServerCache_ != null
        ? this.optCompleteServerCache_
        : viewCacheGetCompleteServerSnap(this.viewCache_);
    const nodes = writeTreeRefCalcIndexedSlice(
      this.writes_,
      completeServerData,
      child,
      1,
      reverse,
      index
    );
    if (nodes.length === 0) {
      return null;
    } else {
      return nodes[0];
    }
  }
}
