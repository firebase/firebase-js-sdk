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

import { Path } from '../util/Path';
import { Index } from './indexes/Index';

/**
 * Node is an interface defining the common functionality for nodes in
 * a DataSnapshot.
 *
 * @interface
 */
export interface Node {
  /**
   * Whether this node is a leaf node.
   * @return {boolean} Whether this is a leaf node.
   */
  isLeafNode(): boolean;

  /**
   * Gets the priority of the node.
   * @return {!Node} The priority of the node.
   */
  getPriority(): Node;

  /**
   * Returns a duplicate node with the new priority.
   * @param {!Node} newPriorityNode New priority to set for the node.
   * @return {!Node} Node with new priority.
   */
  updatePriority(newPriorityNode: Node): Node;

  /**
   * Returns the specified immediate child, or null if it doesn't exist.
   * @param {string} childName The name of the child to retrieve.
   * @return {!Node} The retrieved child, or an empty node.
   */
  getImmediateChild(childName: string): Node;

  /**
   * Returns a child by path, or null if it doesn't exist.
   * @param {!Path} path The path of the child to retrieve.
   * @return {!Node} The retrieved child or an empty node.
   */
  getChild(path: Path): Node;

  /**
   * Returns the name of the child immediately prior to the specified childNode, or null.
   * @param {!string} childName The name of the child to find the predecessor of.
   * @param {!Node} childNode The node to find the predecessor of.
   * @param {!Index} index The index to use to determine the predecessor
   * @return {?string} The name of the predecessor child, or null if childNode is the first child.
   */
  getPredecessorChildName(
    childName: string,
    childNode: Node,
    index: Index
  ): string | null;

  /**
   * Returns a duplicate node, with the specified immediate child updated.
   * Any value in the node will be removed.
   * @param {string} childName The name of the child to update.
   * @param {!Node} newChildNode The new child node
   * @return {!Node} The updated node.
   */
  updateImmediateChild(childName: string, newChildNode: Node): Node;

  /**
   * Returns a duplicate node, with the specified child updated.  Any value will
   * be removed.
   * @param {!Path} path The path of the child to update.
   * @param {!Node} newChildNode The new child node, which may be an empty node
   * @return {!Node} The updated node.
   */
  updateChild(path: Path, newChildNode: Node): Node;

  /**
   * True if the immediate child specified exists
   * @param {!string} childName
   * @return {boolean}
   */
  hasChild(childName: string): boolean;

  /**
   * @return {boolean} True if this node has no value or children.
   */
  isEmpty(): boolean;

  /**
   * @return {number} The number of children of this node.
   */
  numChildren(): number;

  /**
   * Calls action for each child.
   * @param {!Index} index
   * @param {function(string, !Node)} action Action to be called for
   * each child.  It's passed the child name and the child node.
   * @return {*} The first truthy value return by action, or the last falsey one
   */
  forEachChild(index: Index, action: (a: string, b: Node) => void): unknown;

  /**
   * @param exportFormat True for export format (also wire protocol format).
   * @return Value of this node as JSON.
   */
  val(exportFormat?: boolean): unknown;

  /**
   * @return {string} hash representing the node contents.
   */
  hash(): string;

  /**
   * @param {!Node} other Another node
   * @return {!number} -1 for less than, 0 for equal, 1 for greater than other
   */
  compareTo(other: Node): number;

  /**
   * @param {!Node} other
   * @return {boolean} Whether or not this snapshot equals other
   */
  equals(other: Node): boolean;

  /**
   * @param {!Index} indexDefinition
   * @return {!Node} This node, with the specified index now available
   */
  withIndex(indexDefinition: Index): Node;

  /**
   * @param {!Index} indexDefinition
   * @return {boolean}
   */
  isIndexed(indexDefinition: Index): boolean;
}

/**
 *
 * @param {!string} name
 * @param {!Node} node
 * @constructor
 * @struct
 */
export class NamedNode {
  constructor(public name: string, public node: Node) {}

  /**
   *
   * @param {!string} name
   * @param {!Node} node
   * @return {NamedNode}
   */
  static Wrap(name: string, node: Node) {
    return new NamedNode(name, node);
  }
}
