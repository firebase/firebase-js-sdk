import { Node, NamedNode } from "../Node";
import { MIN_NAME, MAX_NAME } from "../../util/util";

/**
 *
 * @constructor
 */
export abstract class Index {
  /**
   * @param {!NamedNode} a
   * @param {!NamedNode} b
   * @return {number}
   */
  abstract compare(a: NamedNode, b: NamedNode): number;

  /**
   * @param {!Node} node
   * @return {boolean}
   */
  abstract isDefinedOn(node: Node): boolean;


  /**
   * @return {function(!NamedNode, !NamedNode):number} A standalone comparison function for
   * this index
   */
  getCompare() {
    return this.compare.bind(this);
  };
  /**
   * Given a before and after value for a node, determine if the indexed value has changed. Even if they are different,
   * it's possible that the changes are isolated to parts of the snapshot that are not indexed.
   *
   * @param {!Node} oldNode
   * @param {!Node} newNode
   * @return {boolean} True if the portion of the snapshot being indexed changed between oldNode and newNode
   */
  indexedValueChanged(oldNode, newNode) {
    var oldWrapped = new NamedNode(MIN_NAME, oldNode);
    var newWrapped = new NamedNode(MIN_NAME, newNode);
    return this.compare(oldWrapped, newWrapped) !== 0;
  };


  /**
   * @return {!NamedNode} a node wrapper that will sort equal to or less than
   * any other node wrapper, using this index
   */
  minPost() {
    return (NamedNode as any).MIN;
  };


  /**
   * @return {!NamedNode} a node wrapper that will sort greater than or equal to
   * any other node wrapper, using this index
   */
  abstract maxPost(): NamedNode;


  /**
   * @param {*} indexValue
   * @param {string} name
   * @return {!NamedNode}
   */
  abstract makePost(indexValue: object, name: string): NamedNode;


  /**
   * @return {!string} String representation for inclusion in a query spec
   */
  abstract toString(): string;
};
