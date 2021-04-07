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

import { assert } from '@firebase/util';

import { ImmutableTree } from '../util/ImmutableTree';
import {
  newEmptyPath,
  Path,
  pathGetFront,
  pathIsEmpty,
  pathPopFront
} from '../util/Path';

import { newOperationSourceUser, Operation, OperationType } from './Operation';

export class AckUserWrite implements Operation {
  /** @inheritDoc */
  type = OperationType.ACK_USER_WRITE;

  /** @inheritDoc */
  source = newOperationSourceUser();

  /**
   * @param affectedTree - A tree containing true for each affected path. Affected paths can't overlap.
   */
  constructor(
    /** @inheritDoc */ public path: Path,
    /** @inheritDoc */ public affectedTree: ImmutableTree<boolean>,
    /** @inheritDoc */ public revert: boolean
  ) {}
  operationForChild(childName: string): AckUserWrite {
    if (!pathIsEmpty(this.path)) {
      assert(
        pathGetFront(this.path) === childName,
        'operationForChild called for unrelated child.'
      );
      return new AckUserWrite(
        pathPopFront(this.path),
        this.affectedTree,
        this.revert
      );
    } else if (this.affectedTree.value != null) {
      assert(
        this.affectedTree.children.isEmpty(),
        'affectedTree should not have overlapping affected paths.'
      );
      // All child locations are affected as well; just return same operation.
      return this;
    } else {
      const childTree = this.affectedTree.subtree(new Path(childName));
      return new AckUserWrite(newEmptyPath(), childTree, this.revert);
    }
  }
}
