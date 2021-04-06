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

import { Node } from '../snap/Node';
import { ImmutableTree } from '../util/ImmutableTree';
import {
  newEmptyPath,
  Path,
  pathGetFront,
  pathIsEmpty,
  pathPopFront
} from '../util/Path';

import { Operation, OperationSource, OperationType } from './Operation';
import { Overwrite } from './Overwrite';

export class Merge implements Operation {
  /** @inheritDoc */
  type = OperationType.MERGE;

  constructor(
    /** @inheritDoc */ public source: OperationSource,
    /** @inheritDoc */ public path: Path,
    /** @inheritDoc */ public children: ImmutableTree<Node>
  ) {}
  operationForChild(childName: string): Operation {
    if (pathIsEmpty(this.path)) {
      const childTree = this.children.subtree(new Path(childName));
      if (childTree.isEmpty()) {
        // This child is unaffected
        return null;
      } else if (childTree.value) {
        // We have a snapshot for the child in question.  This becomes an overwrite of the child.
        return new Overwrite(this.source, newEmptyPath(), childTree.value);
      } else {
        // This is a merge at a deeper level
        return new Merge(this.source, newEmptyPath(), childTree);
      }
    } else {
      assert(
        pathGetFront(this.path) === childName,
        "Can't get a merge for a child not on the path of the operation"
      );
      return new Merge(this.source, pathPopFront(this.path), this.children);
    }
  }
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
