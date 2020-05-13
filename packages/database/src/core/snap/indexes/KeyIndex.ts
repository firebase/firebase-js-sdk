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

import { Index } from './Index';
import { Node, NamedNode } from '../Node';
import { nameCompare, MAX_NAME } from '../../util/util';
import { assert, assertionError } from '@firebase/util';
import { ChildrenNode } from '../ChildrenNode';

let __EMPTY_NODE: ChildrenNode;

export class KeyIndex extends Index {
  static get __EMPTY_NODE() {
    return __EMPTY_NODE;
  }

  static set __EMPTY_NODE(val) {
    __EMPTY_NODE = val;
  }

  /**
   * @inheritDoc
   */
  compare(a: NamedNode, b: NamedNode): number {
    return nameCompare(a.name, b.name);
  }

  /**
   * @inheritDoc
   */
  isDefinedOn(node: Node): boolean {
    // We could probably return true here (since every node has a key), but it's never called
    // so just leaving unimplemented for now.
    throw assertionError('KeyIndex.isDefinedOn not expected to be called.');
  }

  /**
   * @inheritDoc
   */
  indexedValueChanged(oldNode: Node, newNode: Node): boolean {
    return false; // The key for a node never changes.
  }

  /**
   * @inheritDoc
   */
  minPost() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (NamedNode as any).MIN;
  }

  /**
   * @inheritDoc
   */
  maxPost(): NamedNode {
    // TODO: This should really be created once and cached in a static property, but
    // NamedNode isn't defined yet, so I can't use it in a static.  Bleh.
    return new NamedNode(MAX_NAME, __EMPTY_NODE);
  }

  /**
   * @param {*} indexValue
   * @param {string} name
   * @return {!NamedNode}
   */
  makePost(indexValue: string, name: string): NamedNode {
    assert(
      typeof indexValue === 'string',
      'KeyIndex indexValue must always be a string.'
    );
    // We just use empty node, but it'll never be compared, since our comparator only looks at name.
    return new NamedNode(indexValue, __EMPTY_NODE);
  }

  /**
   * @return {!string} String representation for inclusion in a query spec
   */
  toString(): string {
    return '.key';
  }
}

export const KEY_INDEX = new KeyIndex();
