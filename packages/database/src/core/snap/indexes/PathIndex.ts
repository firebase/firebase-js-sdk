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

import { Path, pathGetFront, pathIsEmpty, pathSlice } from '../../util/Path';
import { MAX_NAME, nameCompare } from '../../util/util';
import { ChildrenNode, MAX_NODE } from '../ChildrenNode';
import { NamedNode, Node } from '../Node';
import { nodeFromJSON } from '../nodeFromJSON';

import { Index } from './Index';

export class PathIndex extends Index {
  constructor(private indexPath_: Path) {
    super();

    assert(
      !pathIsEmpty(indexPath_) && pathGetFront(indexPath_) !== '.priority',
      "Can't create PathIndex with empty path or .priority key"
    );
  }

  protected extractChild(snap: Node): Node {
    return snap.getChild(this.indexPath_);
  }
  isDefinedOn(node: Node): boolean {
    return !node.getChild(this.indexPath_).isEmpty();
  }
  compare(a: NamedNode, b: NamedNode): number {
    const aChild = this.extractChild(a.node);
    const bChild = this.extractChild(b.node);
    const indexCmp = aChild.compareTo(bChild);
    if (indexCmp === 0) {
      return nameCompare(a.name, b.name);
    } else {
      return indexCmp;
    }
  }
  makePost(indexValue: object, name: string): NamedNode {
    const valueNode = nodeFromJSON(indexValue);
    const node = ChildrenNode.EMPTY_NODE.updateChild(
      this.indexPath_,
      valueNode
    );
    return new NamedNode(name, node);
  }
  maxPost(): NamedNode {
    const node = ChildrenNode.EMPTY_NODE.updateChild(this.indexPath_, MAX_NODE);
    return new NamedNode(MAX_NAME, node);
  }
  toString(): string {
    return pathSlice(this.indexPath_, 0).join('/');
  }
}
