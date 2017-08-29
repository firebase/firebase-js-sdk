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

import { assert } from '@firebase/util';
import { Path } from '../util/Path';
import { Operation, OperationSource, OperationType } from './Operation';
import { ImmutableTree } from '../util/ImmutableTree';

export class AckUserWrite implements Operation {
  /** @inheritDoc */
  type = OperationType.ACK_USER_WRITE;

  /** @inheritDoc */
  source = OperationSource.User;

  /**
   *
   * @param {!Path} path
   * @param {!ImmutableTree<!boolean>} affectedTree A tree containing true for each affected path. Affected paths can't overlap.
   * @param {!boolean} revert
   */
  constructor(
    /**@inheritDoc */ public path: Path,
    /**@inheritDoc */ public affectedTree: ImmutableTree<boolean>,
    /**@inheritDoc */ public revert: boolean
  ) {}

  /**
   * @inheritDoc
   */
  operationForChild(childName: string): AckUserWrite {
    if (!this.path.isEmpty()) {
      assert(
        this.path.getFront() === childName,
        'operationForChild called for unrelated child.'
      );
      return new AckUserWrite(
        this.path.popFront(),
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
      return new AckUserWrite(Path.Empty, childTree, this.revert);
    }
  }
}
