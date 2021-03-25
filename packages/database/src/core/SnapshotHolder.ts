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

import { ChildrenNode } from './snap/ChildrenNode';
import { Node } from './snap/Node';
import { Path } from './util/Path';

/**
 * Mutable object which basically just stores a reference to the "latest" immutable snapshot.
 */
export class SnapshotHolder {
  private rootNode_: Node = ChildrenNode.EMPTY_NODE;

  getNode(path: Path): Node {
    return this.rootNode_.getChild(path);
  }

  updateSnapshot(path: Path, newSnapshotNode: Node) {
    this.rootNode_ = this.rootNode_.updateChild(path, newSnapshotNode);
  }
}
