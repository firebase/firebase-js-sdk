/**
 * @license
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
import { buildChildSet } from './childSet';
import { contains, map, safeGet } from '@firebase/util';
import { NamedNode, Node } from './Node';
import { PRIORITY_INDEX } from './indexes/PriorityIndex';
import { KEY_INDEX } from './indexes/KeyIndex';
import { SortedMap } from '../util/SortedMap';
import { Index } from './indexes/Index';

let _defaultIndexMap: IndexMap;

const fallbackObject = {};

export class IndexMap {
  /**
   * The default IndexMap for nodes without a priority
   */
  static get Default(): IndexMap {
    assert(
      fallbackObject && PRIORITY_INDEX,
      'ChildrenNode.ts has not been loaded'
    );
    _defaultIndexMap =
      _defaultIndexMap ||
      new IndexMap(
        { '.priority': fallbackObject },
        { '.priority': PRIORITY_INDEX }
      );
    return _defaultIndexMap;
  }

  constructor(
    private indexes_: {
      [k: string]: SortedMap<NamedNode, Node> | /*FallbackType*/ object;
    },
    private indexSet_: { [k: string]: Index }
  ) {}

  get(indexKey: string): SortedMap<NamedNode, Node> | null {
    const sortedMap = safeGet(this.indexes_, indexKey);
    if (!sortedMap) throw new Error('No index defined for ' + indexKey);

    if (sortedMap instanceof SortedMap) {
      return sortedMap;
    } else {
      // The index exists, but it falls back to just name comparison. Return null so that the calling code uses the
      // regular child map
      return null;
    }
  }

  hasIndex(indexDefinition: Index): boolean {
    return contains(this.indexSet_, indexDefinition.toString());
  }

  addIndex(
    indexDefinition: Index,
    existingChildren: SortedMap<string, Node>
  ): IndexMap {
    assert(
      indexDefinition !== KEY_INDEX,
      "KeyIndex always exists and isn't meant to be added to the IndexMap."
    );
    const childList = [];
    let sawIndexedValue = false;
    const iter = existingChildren.getIterator(NamedNode.Wrap);
    let next = iter.getNext();
    while (next) {
      sawIndexedValue =
        sawIndexedValue || indexDefinition.isDefinedOn(next.node);
      childList.push(next);
      next = iter.getNext();
    }
    let newIndex;
    if (sawIndexedValue) {
      newIndex = buildChildSet(childList, indexDefinition.getCompare());
    } else {
      newIndex = fallbackObject;
    }
    const indexName = indexDefinition.toString();
    const newIndexSet = { ...this.indexSet_ };
    newIndexSet[indexName] = indexDefinition;
    const newIndexes = { ...this.indexes_ };
    newIndexes[indexName] = newIndex;
    return new IndexMap(newIndexes, newIndexSet);
  }

  /**
   * Ensure that this node is properly tracked in any indexes that we're maintaining
   */
  addToIndexes(
    namedNode: NamedNode,
    existingChildren: SortedMap<string, Node>
  ): IndexMap {
    const newIndexes = map(
      this.indexes_,
      (indexedChildren: SortedMap<NamedNode, Node>, indexName: string) => {
        const index = safeGet(this.indexSet_, indexName);
        assert(index, 'Missing index implementation for ' + indexName);
        if (indexedChildren === fallbackObject) {
          // Check to see if we need to index everything
          if (index.isDefinedOn(namedNode.node)) {
            // We need to build this index
            const childList = [];
            const iter = existingChildren.getIterator(NamedNode.Wrap);
            let next = iter.getNext();
            while (next) {
              if (next.name != namedNode.name) {
                childList.push(next);
              }
              next = iter.getNext();
            }
            childList.push(namedNode);
            return buildChildSet(childList, index.getCompare());
          } else {
            // No change, this remains a fallback
            return fallbackObject;
          }
        } else {
          const existingSnap = existingChildren.get(namedNode.name);
          let newChildren = indexedChildren;
          if (existingSnap) {
            newChildren = newChildren.remove(
              new NamedNode(namedNode.name, existingSnap)
            );
          }
          return newChildren.insert(namedNode, namedNode.node);
        }
      }
    );
    return new IndexMap(newIndexes, this.indexSet_);
  }

  /**
   * Create a new IndexMap instance with the given value removed
   */
  removeFromIndexes(
    namedNode: NamedNode,
    existingChildren: SortedMap<string, Node>
  ): IndexMap {
    const newIndexes = map(this.indexes_, function(
      indexedChildren: SortedMap<NamedNode, Node>
    ) {
      if (indexedChildren === fallbackObject) {
        // This is the fallback. Just return it, nothing to do in this case
        return indexedChildren;
      } else {
        const existingSnap = existingChildren.get(namedNode.name);
        if (existingSnap) {
          return indexedChildren.remove(
            new NamedNode(namedNode.name, existingSnap)
          );
        } else {
          // No record of this child
          return indexedChildren;
        }
      }
    });
    return new IndexMap(newIndexes, this.indexSet_);
  }
}
