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

import { validateArgCount, validateCallback } from '@firebase/util';
import { validatePathString } from '../core/util/validation';
import { Path } from '../core/util/Path';
import { PRIORITY_INDEX } from '../core/snap/indexes/PriorityIndex';
import { Node } from '../core/snap/Node';
import { Reference } from './Reference';
import { Index } from '../core/snap/indexes/Index';
import { ChildrenNode } from '../core/snap/ChildrenNode';

/**
 * Class representing a firebase data snapshot.  It wraps a SnapshotNode and
 * surfaces the public methods (val, forEach, etc.) we want to expose.
 */
export class DataSnapshot {
  /**
   * @param {!Node} node_ A SnapshotNode to wrap.
   * @param {!Reference} ref_ The ref of the location this snapshot came from.
   * @param {!Index} index_ The iteration order for this snapshot
   */
  constructor(
    private readonly node_: Node,
    private readonly ref_: Reference,
    private readonly index_: Index
  ) {}

  /**
   * Retrieves the snapshot contents as JSON.  Returns null if the snapshot is
   * empty.
   *
   * @return {*} JSON representation of the DataSnapshot contents, or null if empty.
   */
  val(): unknown {
    validateArgCount('DataSnapshot.val', 0, 0, arguments.length);
    return this.node_.val();
  }

  /**
   * Returns the snapshot contents as JSON, including priorities of node.  Suitable for exporting
   * the entire node contents.
   * @return {*} JSON representation of the DataSnapshot contents, or null if empty.
   */
  exportVal(): unknown {
    validateArgCount('DataSnapshot.exportVal', 0, 0, arguments.length);
    return this.node_.val(true);
  }

  // Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
  // for end-users
  toJSON(): unknown {
    // Optional spacer argument is unnecessary because we're depending on recursion rather than stringifying the content
    validateArgCount('DataSnapshot.toJSON', 0, 1, arguments.length);
    return this.exportVal();
  }

  /**
   * Returns whether the snapshot contains a non-null value.
   *
   * @return {boolean} Whether the snapshot contains a non-null value, or is empty.
   */
  exists(): boolean {
    validateArgCount('DataSnapshot.exists', 0, 0, arguments.length);
    return !this.node_.isEmpty();
  }

  /**
   * Returns a DataSnapshot of the specified child node's contents.
   *
   * @param {!string} childPathString Path to a child.
   * @return {!DataSnapshot} DataSnapshot for child node.
   */
  child(childPathString: string): DataSnapshot {
    validateArgCount('DataSnapshot.child', 0, 1, arguments.length);
    // Ensure the childPath is a string (can be a number)
    childPathString = String(childPathString);
    validatePathString('DataSnapshot.child', 1, childPathString, false);

    const childPath = new Path(childPathString);
    const childRef = this.ref_.child(childPath);
    return new DataSnapshot(
      this.node_.getChild(childPath),
      childRef,
      PRIORITY_INDEX
    );
  }

  /**
   * Returns whether the snapshot contains a child at the specified path.
   *
   * @param {!string} childPathString Path to a child.
   * @return {boolean} Whether the child exists.
   */
  hasChild(childPathString: string): boolean {
    validateArgCount('DataSnapshot.hasChild', 1, 1, arguments.length);
    validatePathString('DataSnapshot.hasChild', 1, childPathString, false);

    const childPath = new Path(childPathString);
    return !this.node_.getChild(childPath).isEmpty();
  }

  /**
   * Returns the priority of the object, or null if no priority was set.
   *
   * @return {string|number|null} The priority.
   */
  getPriority(): string | number | null {
    validateArgCount('DataSnapshot.getPriority', 0, 0, arguments.length);

    // typecast here because we never return deferred values or internal priorities (MAX_PRIORITY)
    return this.node_.getPriority().val() as string | number | null;
  }

  /**
   * Iterates through child nodes and calls the specified action for each one.
   *
   * @param {function(!DataSnapshot)} action Callback function to be called
   * for each child.
   * @return {boolean} True if forEach was canceled by action returning true for
   * one of the child nodes.
   */
  forEach(action: (d: DataSnapshot) => boolean | void): boolean {
    validateArgCount('DataSnapshot.forEach', 1, 1, arguments.length);
    validateCallback('DataSnapshot.forEach', 1, action, false);

    if (this.node_.isLeafNode()) {
      return false;
    }

    const childrenNode = this.node_ as ChildrenNode;
    // Sanitize the return value to a boolean. ChildrenNode.forEachChild has a weird return type...
    return !!childrenNode.forEachChild(this.index_, (key, node) => {
      return action(
        new DataSnapshot(node, this.ref_.child(key), PRIORITY_INDEX)
      );
    });
  }

  /**
   * Returns whether this DataSnapshot has children.
   * @return {boolean} True if the DataSnapshot contains 1 or more child nodes.
   */
  hasChildren(): boolean {
    validateArgCount('DataSnapshot.hasChildren', 0, 0, arguments.length);

    if (this.node_.isLeafNode()) {
      return false;
    } else {
      return !this.node_.isEmpty();
    }
  }

  get key() {
    return this.ref_.getKey();
  }

  /**
   * Returns the number of children for this DataSnapshot.
   * @return {number} The number of children that this DataSnapshot contains.
   */
  numChildren(): number {
    validateArgCount('DataSnapshot.numChildren', 0, 0, arguments.length);

    return this.node_.numChildren();
  }

  /**
   * @return {Reference} The Firebase reference for the location this snapshot's data came from.
   */
  getRef(): Reference {
    validateArgCount('DataSnapshot.ref', 0, 0, arguments.length);

    return this.ref_;
  }

  get ref() {
    return this.getRef();
  }
}
