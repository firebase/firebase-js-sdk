/**
 * @license
 * Copyright 2020 Google LLC
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

import { child, Reference } from './Reference';
import { Node } from '../core/snap/Node';
import { Index } from '../core/snap/indexes';
import { Path } from '../core/util/Path';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { ChildrenNode } from '../core/snap/ChildrenNode';

export class DataSnapshot {
  /**
   * @param _node A SnapshotNode to wrap.
   * @param ref The ref of the location this snapshot came from.
   * @param _index The iteration order for this snapshot
   */
  constructor(
    readonly _node: Node,
    readonly ref: Reference,
    readonly _index: Index
  ) {}

  get priority(): string | number | null {
    // typecast here because we never return deferred values or internal priorities (MAX_PRIORITY)
    return this._node.getPriority().val() as string | number | null;
  }

  get key(): string | null {
    return this.ref.key;
  }

  get size(): number {
    return this._node.numChildren();
  }

  child(path: string): DataSnapshot {
    const childPath = new Path(path);
    const childRef = child(this.ref, path);
    return new DataSnapshot(
      this._node.getChild(childPath),
      childRef,
      PRIORITY_INDEX
    );
  }

  exists(): boolean {
    return !this._node.isEmpty();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportVal(): any {
    return this._node.val(true);
  }

  forEach(action: (child: DataSnapshot) => boolean | void): boolean {
    if (this._node.isLeafNode()) {
      return false;
    }

    const childrenNode = this._node as ChildrenNode;
    // Sanitize the return value to a boolean. ChildrenNode.forEachChild has a weird return type...
    return !!childrenNode.forEachChild(this._index, (key, node) => {
      return action(
        new DataSnapshot(node, child(this.ref, key), PRIORITY_INDEX)
      );
    });
  }

  hasChild(path: string): boolean {
    const childPath = new Path(path);
    return !this._node.getChild(childPath).isEmpty();
  }

  hasChildren(): boolean {
    if (this._node.isLeafNode()) {
      return false;
    } else {
      return !this._node.isEmpty();
    }
  }

  toJSON(): object | null {
    return this.exportVal();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  val(): any {
    return this._node.val();
  }
}
