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

import { assert, assertionError } from '@firebase/util';

import {
  Change,
  ChangeType,
  changeChildAdded,
  changeChildChanged,
  changeChildRemoved
} from './Change';

export class ChildChangeAccumulator {
  private readonly changeMap: Map<string, Change> = new Map();

  trackChildChange(change: Change) {
    const type = change.type;
    const childKey = change.childName!;
    assert(
      type === ChangeType.CHILD_ADDED ||
        type === ChangeType.CHILD_CHANGED ||
        type === ChangeType.CHILD_REMOVED,
      'Only child changes supported for tracking'
    );
    assert(
      childKey !== '.priority',
      'Only non-priority child changes can be tracked.'
    );
    const oldChange = this.changeMap.get(childKey);
    if (oldChange) {
      const oldType = oldChange.type;
      if (
        type === ChangeType.CHILD_ADDED &&
        oldType === ChangeType.CHILD_REMOVED
      ) {
        this.changeMap.set(
          childKey,
          changeChildChanged(
            childKey,
            change.snapshotNode,
            oldChange.snapshotNode
          )
        );
      } else if (
        type === ChangeType.CHILD_REMOVED &&
        oldType === ChangeType.CHILD_ADDED
      ) {
        this.changeMap.delete(childKey);
      } else if (
        type === ChangeType.CHILD_REMOVED &&
        oldType === ChangeType.CHILD_CHANGED
      ) {
        this.changeMap.set(
          childKey,
          changeChildRemoved(childKey, oldChange.oldSnap)
        );
      } else if (
        type === ChangeType.CHILD_CHANGED &&
        oldType === ChangeType.CHILD_ADDED
      ) {
        this.changeMap.set(
          childKey,
          changeChildAdded(childKey, change.snapshotNode)
        );
      } else if (
        type === ChangeType.CHILD_CHANGED &&
        oldType === ChangeType.CHILD_CHANGED
      ) {
        this.changeMap.set(
          childKey,
          changeChildChanged(childKey, change.snapshotNode, oldChange.oldSnap)
        );
      } else {
        throw assertionError(
          'Illegal combination of changes: ' +
            change +
            ' occurred after ' +
            oldChange
        );
      }
    } else {
      this.changeMap.set(childKey, change);
    }
  }

  getChanges(): Change[] {
    return Array.from(this.changeMap.values());
  }
}
