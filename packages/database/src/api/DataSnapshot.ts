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
import { Reference } from './Reference';
import { DataSnapshot as ExpDataSnapshot } from '../exp/DataSnapshot';

// TODO(databaseexp): Import Compat from @firebase/util
export interface Compat<T> {
  readonly _delegate: T;
}

/**
 * Class representing a firebase data snapshot.  It wraps a SnapshotNode and
 * surfaces the public methods (val, forEach, etc.) we want to expose.
 */
export class DataSnapshot implements Compat<ExpDataSnapshot> {
  constructor(readonly _delegate: ExpDataSnapshot) {}

  /**
   * Retrieves the snapshot contents as JSON.  Returns null if the snapshot is
   * empty.
   *
   * @return JSON representation of the DataSnapshot contents, or null if empty.
   */
  val(): unknown {
    validateArgCount('DataSnapshot.val', 0, 0, arguments.length);
    return this._delegate.val();
  }

  /**
   * Returns the snapshot contents as JSON, including priorities of node.  Suitable for exporting
   * the entire node contents.
   * @return JSON representation of the DataSnapshot contents, or null if empty.
   */
  exportVal(): unknown {
    validateArgCount('DataSnapshot.exportVal', 0, 0, arguments.length);
    return this._delegate.exportVal();
  }

  // Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
  // for end-users
  toJSON(): unknown {
    // Optional spacer argument is unnecessary because we're depending on recursion rather than stringifying the content
    validateArgCount('DataSnapshot.toJSON', 0, 1, arguments.length);
    return this._delegate.toJSON();
  }

  /**
   * Returns whether the snapshot contains a non-null value.
   *
   * @return Whether the snapshot contains a non-null value, or is empty.
   */
  exists(): boolean {
    validateArgCount('DataSnapshot.exists', 0, 0, arguments.length);
    return this._delegate.exists();
  }

  /**
   * Returns a DataSnapshot of the specified child node's contents.
   *
   * @param childPathString Path to a child.
   * @return DataSnapshot for child node.
   */
  child(childPathString: string): DataSnapshot {
    validateArgCount('DataSnapshot.child', 0, 1, arguments.length);
    // Ensure the childPath is a string (can be a number)
    childPathString = String(childPathString);
    validatePathString('DataSnapshot.child', 1, childPathString, false);
    return new DataSnapshot(this._delegate.child(childPathString));
  }

  /**
   * Returns whether the snapshot contains a child at the specified path.
   *
   * @param childPathString Path to a child.
   * @return Whether the child exists.
   */
  hasChild(childPathString: string): boolean {
    validateArgCount('DataSnapshot.hasChild', 1, 1, arguments.length);
    validatePathString('DataSnapshot.hasChild', 1, childPathString, false);
    return this._delegate.hasChild(childPathString);
  }

  /**
   * Returns the priority of the object, or null if no priority was set.
   *
   * @return The priority.
   */
  getPriority(): string | number | null {
    validateArgCount('DataSnapshot.getPriority', 0, 0, arguments.length);
    return this._delegate.priority;
  }

  /**
   * Iterates through child nodes and calls the specified action for each one.
   *
   * @param action Callback function to be called
   * for each child.
   * @return True if forEach was canceled by action returning true for
   * one of the child nodes.
   */
  forEach(action: (snapshot: DataSnapshot) => boolean | void): boolean {
    validateArgCount('DataSnapshot.forEach', 1, 1, arguments.length);
    validateCallback('DataSnapshot.forEach', 1, action, false);
    return this._delegate.forEach(expDataSnapshot =>
      action(new DataSnapshot(expDataSnapshot))
    );
  }

  /**
   * Returns whether this DataSnapshot has children.
   * @return True if the DataSnapshot contains 1 or more child nodes.
   */
  hasChildren(): boolean {
    validateArgCount('DataSnapshot.hasChildren', 0, 0, arguments.length);
    return this._delegate.hasChildren();
  }

  get key() {
    return this._delegate.key;
  }

  /**
   * Returns the number of children for this DataSnapshot.
   * @return The number of children that this DataSnapshot contains.
   */
  numChildren(): number {
    validateArgCount('DataSnapshot.numChildren', 0, 0, arguments.length);
    return this._delegate.size;
  }

  /**
   * @return The Firebase reference for the location this snapshot's data came
   * from.
   */
  getRef(): Reference {
    validateArgCount('DataSnapshot.ref', 0, 0, arguments.length);
    return new Reference(this._delegate.ref._repo, this._delegate.ref._path);
  }

  get ref() {
    return this.getRef();
  }
}
