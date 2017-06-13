import { Index } from "./Index";
import { Node, NamedNode } from "../Node";
import { nameCompare, MAX_NAME } from "../../util/util";
import { assert, assertionError } from "../../../../utils/assert";
import { ChildrenNode } from "../ChildrenNode";

export class KeyIndex extends Index {
  constructor() {
    super();
  }
  /**
   * @inheritDoc
   */
  compare(a, b) {
    return nameCompare(a.name, b.name);
  };


  /**
   * @inheritDoc
   */
  isDefinedOn(node: Node): boolean {
    // We could probably return true here (since every node has a key), but it's never called
    // so just leaving unimplemented for now.
    throw assertionError('KeyIndex.isDefinedOn not expected to be called.');
  };


  /**
   * @inheritDoc
   */
  indexedValueChanged(oldNode, newNode) {
    return false; // The key for a node never changes.
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
    // TODO: This should really be created once and cached in a static property, but
    // NamedNode isn't defined yet, so I can't use it in a static.  Bleh.
    return new NamedNode(MAX_NAME, ChildrenNode.EMPTY_NODE);
  };


  /**
   * @param {*} indexValue
   * @param {string} name
   * @return {!NamedNode}
   */
  makePost(indexValue, name) {
    assert(typeof indexValue === 'string', 'KeyIndex indexValue must always be a string.');
    // We just use empty node, but it'll never be compared, since our comparator only looks at name.
    return new NamedNode(/** @type {!string} */ (indexValue), ChildrenNode.EMPTY_NODE);
  };


  /**
   * @return {!string} String representation for inclusion in a query spec
   */
  toString() {
    return '.key';
  };
};

export const KEY_INDEX = new KeyIndex();