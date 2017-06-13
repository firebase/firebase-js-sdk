import { assert } from "../../../utils/assert";
import { buildChildSet } from "./childSet";
import { contains, clone, map } from "../../../utils/obj";
import { NamedNode } from "./Node";
import { PRIORITY_INDEX } from "./indexes/PriorityIndex";
import { KEY_INDEX } from "./indexes/KeyIndex";
import { Fallback } from "./indexes/Index";

/**
 *
 * @param {Object.<string, FallbackType|SortedMap.<NamedNode, Node>>} indexes
 * @param {Object.<string, Index>} indexSet
 * @constructor
 */
export class IndexMap {
  indexes_;
  indexSet_;

  /**
   * The default IndexMap for nodes without a priority
   * @type {!IndexMap}
   * @const
   */
  static Default = new IndexMap(Fallback, PRIORITY_INDEX);

  constructor(indexes, indexSet) {
    this.indexes_ = indexes;
    this.indexSet_ = indexSet;
  }
  /**
   *
   * @param {!string} indexKey
   * @return {?SortedMap.<NamedNode, Node>}
   */
  get(indexKey) {
    var sortedMap = this.indexes_[indexKey];
    if (!sortedMap) throw new Error('No index defined for ' + indexKey);

    if (sortedMap === Fallback) {
      // The index exists, but it falls back to just name comparison. Return null so that the calling code uses the
      // regular child map
      return null;
    } else {
      return sortedMap;
    }
  };

  /**
   * @param {!Index} indexDefinition
   * @return {boolean}
   */
  hasIndex(indexDefinition) {
    return contains(this.indexSet_, indexDefinition.toString());
  };

  /**
   * @param {!Index} indexDefinition
   * @param {!SortedMap.<string, !Node>} existingChildren
   * @return {!IndexMap}
   */
  addIndex(indexDefinition, existingChildren) {
    assert(indexDefinition !== KEY_INDEX,
        "KeyIndex always exists and isn't meant to be added to the IndexMap.");
    var childList = [];
    var sawIndexedValue = false;
    var iter = existingChildren.getIterator(NamedNode.Wrap);
    var next = iter.getNext();
    while (next) {
      sawIndexedValue = sawIndexedValue || indexDefinition.isDefinedOn(next.node);
      childList.push(next);
      next = iter.getNext();
    }
    var newIndex;
    if (sawIndexedValue) {
      newIndex = buildChildSet(childList, indexDefinition.getCompare());
    } else {
      newIndex = Fallback;
    }
    var indexName = indexDefinition.toString();
    var newIndexSet = clone(this.indexSet_);
    newIndexSet[indexName] = indexDefinition;
    var newIndexes = clone(this.indexes_);
    newIndexes[indexName] = newIndex;
    return new IndexMap(newIndexes, newIndexSet);
  };


  /**
   * Ensure that this node is properly tracked in any indexes that we're maintaining
   * @param {!NamedNode} namedNode
   * @param {!SortedMap.<string, !Node>} existingChildren
   * @return {!IndexMap}
   */
  addToIndexes(namedNode, existingChildren) {
    var self = this;
    var newIndexes = map(this.indexes_, function(indexedChildren, indexName) {
      var index = self.indexSet_[indexName];
      assert(index, 'Missing index implementation for ' + indexName);
      if (indexedChildren === Fallback) {
        // Check to see if we need to index everything
        if (index.isDefinedOn(namedNode.node)) {
          // We need to build this index
          var childList = [];
          var iter = existingChildren.getIterator(NamedNode.Wrap);
          var next = iter.getNext();
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
          return Fallback;
        }
      } else {
        var existingSnap = existingChildren.get(namedNode.name);
        var newChildren = indexedChildren;
        if (existingSnap) {
          newChildren = newChildren.remove(new NamedNode(namedNode.name, existingSnap));
        }
        return newChildren.insert(namedNode, namedNode.node);
      }
    });
    return new IndexMap(newIndexes, this.indexSet_);
  };

  /**
   * Create a new IndexMap instance with the given value removed
   * @param {!NamedNode} namedNode
   * @param {!SortedMap.<string, !Node>} existingChildren
   * @return {!IndexMap}
   */
  removeFromIndexes(namedNode, existingChildren) {
    var newIndexes = map(this.indexes_, function(indexedChildren) {
      if (indexedChildren === Fallback) {
        // This is the fallback. Just return it, nothing to do in this case
        return indexedChildren;
      } else {
        var existingSnap = existingChildren.get(namedNode.name);
        if (existingSnap) {
          return indexedChildren.remove(new NamedNode(namedNode.name, existingSnap));
        } else {
          // No record of this child
          return indexedChildren;
        }
      }
    });
    return new IndexMap(newIndexes, this.indexSet_);
  };
}
