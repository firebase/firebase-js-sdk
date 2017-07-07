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

import { assert } from "../../../../utils/assert";
import { nameCompare, MAX_NAME } from "../../util/util";
import { Index } from "./Index";
import { ChildrenNode, MAX_NODE } from "../ChildrenNode";
import { NamedNode } from "../Node";
import { nodeFromJSON } from "../nodeFromJSON";

/**
 * @param {!Path} indexPath
 * @constructor
 * @extends {Index}
 */
export class PathIndex extends Index {
  indexPath_;

  constructor(indexPath) {
    super();

    assert(!indexPath.isEmpty() && indexPath.getFront() !== '.priority',
        'Can\'t create PathIndex with empty path or .priority key');
    /**
     *
     * @type {!Path}
     * @private
     */
    this.indexPath_ = indexPath;
  };
  /**
   * @param {!Node} snap
   * @return {!Node}
   * @protected
   */
  extractChild(snap) {
    return snap.getChild(this.indexPath_);
  };


  /**
   * @inheritDoc
   */
  isDefinedOn(node) {
    return !node.getChild(this.indexPath_).isEmpty();
  };


  /**
   * @inheritDoc
   */
  compare(a, b) {
    var aChild = this.extractChild(a.node);
    var bChild = this.extractChild(b.node);
    var indexCmp = aChild.compareTo(bChild);
    if (indexCmp === 0) {
      return nameCompare(a.name, b.name);
    } else {
      return indexCmp;
    }
  };


  /**
   * @inheritDoc
   */
  makePost(indexValue, name) {
    var valueNode = nodeFromJSON(indexValue);
    var node = ChildrenNode.EMPTY_NODE.updateChild(this.indexPath_, valueNode);
    return new NamedNode(name, node);
  };


  /**
   * @inheritDoc
   */
  maxPost() {
    var node = ChildrenNode.EMPTY_NODE.updateChild(this.indexPath_, MAX_NODE);
    return new NamedNode(MAX_NAME, node);
  };


  /**
   * @inheritDoc
   */
  toString() {
    return this.indexPath_.slice().join('/');
  };
}