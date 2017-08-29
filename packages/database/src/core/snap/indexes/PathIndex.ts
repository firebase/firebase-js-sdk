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
import { nameCompare, MAX_NAME } from '../../util/util';
import { Index } from './Index';
import { ChildrenNode, MAX_NODE } from '../ChildrenNode';
import { NamedNode, Node } from '../Node';
import { nodeFromJSON } from '../nodeFromJSON';
import { Path } from '../../util/Path';

/**
 * @param {!Path} indexPath
 * @constructor
 * @extends {Index}
 */
export class PathIndex extends Index {
  constructor(private indexPath_: Path) {
    super();

    assert(
      !indexPath_.isEmpty() && indexPath_.getFront() !== '.priority',
      "Can't create PathIndex with empty path or .priority key"
    );
  }

  /**
   * @param {!Node} snap
   * @return {!Node}
   * @protected
   */
  protected extractChild(snap: Node): Node {
    return snap.getChild(this.indexPath_);
  }

  /**
   * @inheritDoc
   */
  isDefinedOn(node: Node): boolean {
    return !node.getChild(this.indexPath_).isEmpty();
  }

  /**
   * @inheritDoc
   */
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

  /**
   * @inheritDoc
   */
  makePost(indexValue: object, name: string): NamedNode {
    const valueNode = nodeFromJSON(indexValue);
    const node = ChildrenNode.EMPTY_NODE.updateChild(
      this.indexPath_,
      valueNode
    );
    return new NamedNode(name, node);
  }

  /**
   * @inheritDoc
   */
  maxPost(): NamedNode {
    const node = ChildrenNode.EMPTY_NODE.updateChild(this.indexPath_, MAX_NODE);
    return new NamedNode(MAX_NAME, node);
  }

  /**
   * @inheritDoc
   */
  toString(): string {
    return this.indexPath_.slice().join('/');
  }
}
