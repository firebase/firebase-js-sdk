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

import { Operation, OperationSource, OperationType } from './Operation';
import { Overwrite } from './Overwrite';
import { Path } from '../util/Path';
import { assert } from '@firebase/util';
import { ImmutableTree } from '../util/ImmutableTree';
import { Node } from '../snap/Node';

/**
 * @param {!OperationSource} source
 * @param {!Path} path
 * @param {!ImmutableTree.<!Node>} children
 * @constructor
 * @implements {Operation}
 */
export class Merge implements Operation {
  /** @inheritDoc */
  type = OperationType.MERGE;

  constructor(
    /**@inheritDoc */ public source: OperationSource,
    /**@inheritDoc */ public path: Path,
    /**@inheritDoc */ public children: ImmutableTree<Node>
  ) {}

  /**
   * @inheritDoc
   */
  operationForChild(childName: string): Operation {
    if (this.path.isEmpty()) {
      const childTree = this.children.subtree(new Path(childName));
      if (childTree.isEmpty()) {
        // This child is unaffected
        return null;
      } else if (childTree.value) {
        // We have a snapshot for the child in question.  This becomes an overwrite of the child.
        return new Overwrite(this.source, Path.Empty, childTree.value);
      } else {
        // This is a merge at a deeper level
        return new Merge(this.source, Path.Empty, childTree);
      }
    } else {
      assert(
        this.path.getFront() === childName,
        "Can't get a merge for a child not on the path of the operation"
      );
      return new Merge(this.source, this.path.popFront(), this.children);
    }
  }

  /**
   * @inheritDoc
   */
  toString(): string {
    return (
      'Operation(' +
      this.path +
      ': ' +
      this.source.toString() +
      ' merge: ' +
      this.children.toString() +
      ')'
    );
  }
}
