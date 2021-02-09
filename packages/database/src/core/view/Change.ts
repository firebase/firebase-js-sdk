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

import { Node } from '../snap/Node';

/** Event type for a child added */
export const CHANGE_TYPE_CHILD_ADDED = 'child_added';

/** Event type for a child removed */
export const CHANGE_TYPE_CHILD_REMOVED = 'child_removed';

/** Event type for a child changed */
export const CHANGE_TYPE_CHILD_CHANGED = 'child_changed';

/** Event type for a child moved */
export const CHANGE_TYPE_CHILD_MOVED = 'child_moved';

/** Event type for a value change */
export const CHANGE_TYPE_VALUE = 'value';

/**
 * @param type The event type
 * @param snapshotNode The data
 * @param childName The name for this child, if it's a child event
 * @param oldSnap Used for intermediate processing of child changed events
 * @param prevName The name for the previous child, if applicable
 */
export class Change {
  constructor(
    public type: string,
    public snapshotNode: Node,
    public childName?: string,
    public oldSnap?: Node,
    public prevName?: string | null
  ) {}
}

export function changeValue(snapshot: Node): Change {
  return new Change(CHANGE_TYPE_VALUE, snapshot);
}

export function changeChildAdded(childKey: string, snapshot: Node): Change {
  return new Change(CHANGE_TYPE_CHILD_ADDED, snapshot, childKey);
}

export function changeChildRemoved(childKey: string, snapshot: Node): Change {
  return new Change(CHANGE_TYPE_CHILD_REMOVED, snapshot, childKey);
}

export function changeChildChanged(
  childKey: string,
  newSnapshot: Node,
  oldSnapshot: Node
): Change {
  return new Change(
    CHANGE_TYPE_CHILD_CHANGED,
    newSnapshot,
    childKey,
    oldSnapshot
  );
}

export function changeChildMoved(childKey: string, snapshot: Node): Change {
  return new Change(CHANGE_TYPE_CHILD_MOVED, snapshot, childKey);
}
