import { Index } from './Index';
import { nameCompare, MAX_NAME } from "../../util/util";
import { NamedNode } from "../Node";
import { LeafNode } from "../LeafNode";
import { MAX_NODE } from "../ChildrenNode";
import { nodeFromJSON } from "../nodeFromJSON";

/**
 * @constructor
 * @extends {Index}
 * @private
 */
export class PriorityIndex extends Index {
  constructor() {
    super();
  }

  /**
   * @inheritDoc
   */
  compare(a, b) {
    var aPriority = a.node.getPriority();
    var bPriority = b.node.getPriority();
    var indexCmp = aPriority.compareTo(bPriority);
    if (indexCmp === 0) {
      return nameCompare(a.name, b.name);
    } else {
      return indexCmp;
    }
  };


  /**
   * @inheritDoc
   */
  isDefinedOn(node) {
    return !node.getPriority().isEmpty();
  };


  /**
   * @inheritDoc
   */
  indexedValueChanged(oldNode, newNode) {
    return !oldNode.getPriority().equals(newNode.getPriority());
  };


  /**
   * @inheritDoc
   */
  minPost() {
    return (NamedNode as any).MIN;
  };


  /**
   * @inheritDoc
   */
  maxPost() {
    return new NamedNode(MAX_NAME, new LeafNode('[PRIORITY-POST]', MAX_NODE));
  };


  /**
   * @param {*} indexValue
   * @param {string} name
   * @return {!NamedNode}
   */
  makePost(indexValue, name) {
    var priorityNode = nodeFromJSON(indexValue);
    return new NamedNode(name, new LeafNode('[PRIORITY-POST]', priorityNode));
  };


  /**
   * @return {!string} String representation for inclusion in a query spec
   */
  toString() {
    return '.priority';
  };
};