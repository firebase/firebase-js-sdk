/**
 * Node is an interface defining the common functionality for nodes in
 * a DataSnapshot.
 *
 * @interface
 */
export const Node = function() { };


/**
 * Whether this node is a leaf node.
 * @return {boolean} Whether this is a leaf node.
 */
Node.prototype.isLeafNode;


/**
 * Gets the priority of the node.
 * @return {!Node} The priority of the node.
 */
Node.prototype.getPriority;


/**
 * Returns a duplicate node with the new priority.
 * @param {!Node} newPriorityNode New priority to set for the node.
 * @return {!Node} Node with new priority.
 */
Node.prototype.updatePriority;


/**
 * Returns the specified immediate child, or null if it doesn't exist.
 * @param {string} childName The name of the child to retrieve.
 * @return {!Node} The retrieved child, or an empty node.
 */
Node.prototype.getImmediateChild;


/**
 * Returns a child by path, or null if it doesn't exist.
 * @param {!fb.core.util.Path} path The path of the child to retrieve.
 * @return {!Node} The retrieved child or an empty node.
 */
Node.prototype.getChild;


/**
 * Returns the name of the child immediately prior to the specified childNode, or null.
 * @param {!string} childName The name of the child to find the predecessor of.
 * @param {!Node} childNode The node to find the predecessor of.
 * @param {!fb.core.snap.Index} index The index to use to determine the predecessor
 * @return {?string} The name of the predecessor child, or null if childNode is the first child.
 */
Node.prototype.getPredecessorChildName;

/**
 * Returns a duplicate node, with the specified immediate child updated.
 * Any value in the node will be removed.
 * @param {string} childName The name of the child to update.
 * @param {!Node} newChildNode The new child node
 * @return {!Node} The updated node.
 */
Node.prototype.updateImmediateChild;


/**
 * Returns a duplicate node, with the specified child updated.  Any value will
 * be removed.
 * @param {!fb.core.util.Path} path The path of the child to update.
 * @param {!Node} newChildNode The new child node, which may be an empty node
 * @return {!Node} The updated node.
 */
Node.prototype.updateChild;

/**
 * True if the immediate child specified exists
 * @param {!string} childName
 * @return {boolean}
 */
Node.prototype.hasChild;

/**
 * @return {boolean} True if this node has no value or children.
 */
Node.prototype.isEmpty;


/**
 * @return {number} The number of children of this node.
 */
Node.prototype.numChildren;


/**
 * Calls action for each child.
 * @param {!fb.core.snap.Index} index
 * @param {function(string, !Node)} action Action to be called for
 * each child.  It's passed the child name and the child node.
 * @return {*} The first truthy value return by action, or the last falsey one
 */
Node.prototype.forEachChild;


/**
 * @param {boolean=} opt_exportFormat True for export format (also wire protocol format).
 * @return {*} Value of this node as JSON.
 */
Node.prototype.val;


/**
 * @return {string} hash representing the node contents.
 */
Node.prototype.hash;

/**
 * @param {!Node} other Another node
 * @return {!number} -1 for less than, 0 for equal, 1 for greater than other
 */
Node.prototype.compareTo;

/**
 * @param {!Node} other
 * @return {boolean} Whether or not this snapshot equals other
 */
Node.prototype.equals;

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {!Node} This node, with the specified index now available
 */
Node.prototype.withIndex;

/**
 * @param {!fb.core.snap.Index} indexDefinition
 * @return {boolean}
 */
Node.prototype.isIndexed;

/**
 *
 * @param {!string} name
 * @param {!Node} node
 * @constructor
 * @struct
 */
export class NamedNode {
  name;
  node;

  /**
   *
   * @param {!string} name
   * @param {!Node} node
   * @return {NamedNode}
   */
  static Wrap(name: string, node: Node) {
    return new NamedNode(name, node);
  }
  
  constructor(name, node) {
    this.name = name;
    this.node = node;
  }
}

