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

import { getValues, safeGet } from '@firebase/util';
import { Change } from './Change';
import { assert, assertionError } from '@firebase/util';

/**
 * @constructor
 */
export class ChildChangeAccumulator {
  private changeMap_: { [k: string]: Change } = {};

  /**
   * @param {!Change} change
   */
  trackChildChange(change: Change) {
    const type = change.type;
    const childKey /** @type {!string} */ = change.childName;
    assert(
      type == Change.CHILD_ADDED ||
        type == Change.CHILD_CHANGED ||
        type == Change.CHILD_REMOVED,
      'Only child changes supported for tracking'
    );
    assert(
      childKey !== '.priority',
      'Only non-priority child changes can be tracked.'
    );
    const oldChange = safeGet(this.changeMap_, childKey) as Change;
    if (oldChange) {
      const oldType = oldChange.type;
      if (type == Change.CHILD_ADDED && oldType == Change.CHILD_REMOVED) {
        this.changeMap_[childKey] = Change.childChangedChange(
          childKey,
          change.snapshotNode,
          oldChange.snapshotNode
        );
      } else if (
        type == Change.CHILD_REMOVED &&
        oldType == Change.CHILD_ADDED
      ) {
        delete this.changeMap_[childKey];
      } else if (
        type == Change.CHILD_REMOVED &&
        oldType == Change.CHILD_CHANGED
      ) {
        this.changeMap_[childKey] = Change.childRemovedChange(
          childKey,
          oldChange.oldSnap
        );
      } else if (
        type == Change.CHILD_CHANGED &&
        oldType == Change.CHILD_ADDED
      ) {
        this.changeMap_[childKey] = Change.childAddedChange(
          childKey,
          change.snapshotNode
        );
      } else if (
        type == Change.CHILD_CHANGED &&
        oldType == Change.CHILD_CHANGED
      ) {
        this.changeMap_[childKey] = Change.childChangedChange(
          childKey,
          change.snapshotNode,
          oldChange.oldSnap
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
      this.changeMap_[childKey] = change;
    }
  }

  /**
   * @return {!Array.<!Change>}
   */
  getChanges(): Change[] {
    return getValues(this.changeMap_);
  }
}
