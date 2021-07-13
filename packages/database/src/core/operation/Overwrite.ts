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
import { newEmptyPath, Path, pathIsEmpty, pathPopFront } from '../util/Path';

import { Operation, OperationSource, OperationType } from './Operation';

export class Overwrite implements Operation {
  /** @inheritDoc */
  type = OperationType.OVERWRITE;

  constructor(
    public source: OperationSource,
    public path: Path,
    public snap: Node
  ) {}

  operationForChild(childName: string): Overwrite {
    if (pathIsEmpty(this.path)) {
      return new Overwrite(
        this.source,
        newEmptyPath(),
        this.snap.getImmediateChild(childName)
      );
    } else {
      return new Overwrite(this.source, pathPopFront(this.path), this.snap);
    }
  }
}
