import { Index } from "./Index";
import { NamedNode } from "../Node";
import { nameCompare } from "../../util/util";
import { nodeFromJSON } from "../nodeFromJSON";

/**
 * @constructor
 * @extends {Index}
 * @private
 */
export class ValueIndex extends Index {
  constructor() {
    super();
  }

  /**
   * @inheritDoc
   */
  compare(a, b) {
    var indexCmp = a.node.compareTo(b.node);
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
    return true;
  };

  /**
   * @inheritDoc
   */
  indexedValueChanged(oldNode, newNode) {
    return !oldNode.equals(newNode);
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
    return (NamedNode as any).MAX;
  };

  /**
   * @param {*} indexValue
   * @param {string} name
   * @return {!NamedNode}
   */
  makePost(indexValue, name) {
    var valueNode = nodeFromJSON(indexValue);
    return new NamedNode(name, valueNode);
  };

  /**
   * @return {!string} String representation for inclusion in a query spec
   */
  toString() {
    return '.value';
  };
};