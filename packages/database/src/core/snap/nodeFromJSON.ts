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

import { ChildrenNode } from './ChildrenNode';
import { LeafNode } from './LeafNode';
import { NamedNode, Node } from './Node';
import { forEach, contains } from '@firebase/util';
import { assert } from '@firebase/util';
import { buildChildSet } from './childSet';
import { NAME_COMPARATOR, NAME_ONLY_COMPARATOR } from './comparators';
import { IndexMap } from './IndexMap';
import { PRIORITY_INDEX, setNodeFromJSON } from './indexes/PriorityIndex';
import { SortedMap } from '../util/SortedMap';

const USE_HINZE = true;

/**
 * Constructs a snapshot node representing the passed JSON and returns it.
 * @param {*} json JSON to create a node for.
 * @param {?string|?number=} priority Optional priority to use.  This will be ignored if the
 * passed JSON contains a .priority property.
 * @return {!Node}
 */
export function nodeFromJSON(
  json: any | null,
  priority: string | number | null = null
): Node {
  if (json === null) {
    return ChildrenNode.EMPTY_NODE;
  }

  if (typeof json === 'object' && '.priority' in json) {
    priority = json['.priority'];
  }

  assert(
    priority === null ||
      typeof priority === 'string' ||
      typeof priority === 'number' ||
      (typeof priority === 'object' && '.sv' in (priority as object)),
    'Invalid priority type found: ' + typeof priority
  );

  if (typeof json === 'object' && '.value' in json && json['.value'] !== null) {
    json = json['.value'];
  }

  // Valid leaf nodes include non-objects or server-value wrapper objects
  if (typeof json !== 'object' || '.sv' in json) {
    const jsonLeaf = json as string | number | boolean | object;
    return new LeafNode(jsonLeaf, nodeFromJSON(priority));
  }

  if (!(json instanceof Array) && USE_HINZE) {
    const children: NamedNode[] = [];
    let childrenHavePriority = false;
    const hinzeJsonObj: { [k: string]: any } = json as object;
    forEach(hinzeJsonObj, (key: string, child: any) => {
      if (typeof key !== 'string' || key.substring(0, 1) !== '.') {
        // Ignore metadata nodes
        const childNode = nodeFromJSON(hinzeJsonObj[key]);
        if (!childNode.isEmpty()) {
          childrenHavePriority =
            childrenHavePriority || !childNode.getPriority().isEmpty();
          children.push(new NamedNode(key, childNode));
        }
      }
    });

    if (children.length == 0) {
      return ChildrenNode.EMPTY_NODE;
    }

    const childSet = buildChildSet(
      children,
      NAME_ONLY_COMPARATOR,
      namedNode => namedNode.name,
      NAME_COMPARATOR
    ) as SortedMap<string, Node>;
    if (childrenHavePriority) {
      const sortedChildSet = buildChildSet(
        children,
        PRIORITY_INDEX.getCompare()
      );
      return new ChildrenNode(
        childSet,
        nodeFromJSON(priority),
        new IndexMap(
          { '.priority': sortedChildSet },
          { '.priority': PRIORITY_INDEX }
        )
      );
    } else {
      return new ChildrenNode(
        childSet,
        nodeFromJSON(priority),
        IndexMap.Default
      );
    }
  } else {
    let node: Node = ChildrenNode.EMPTY_NODE;
    const jsonObj = json as object;
    forEach(jsonObj, (key: string, childData: any) => {
      if (contains(jsonObj, key)) {
        if (key.substring(0, 1) !== '.') {
          // ignore metadata nodes.
          const childNode = nodeFromJSON(childData);
          if (childNode.isLeafNode() || !childNode.isEmpty())
            node = node.updateImmediateChild(key, childNode);
        }
      }
    });

    return node.updatePriority(nodeFromJSON(priority));
  }
}

setNodeFromJSON(nodeFromJSON);
