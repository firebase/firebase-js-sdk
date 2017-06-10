import { assert } from '../../../utils/assert';
import { 
  doubleToIEEE754String,
} from "../util/util";
import { ChildrenNode, MAX_NODE } from "./ChildrenNode";
import { contains } from "../../../utils/obj";
import { NamedNode } from "./Node";

/**
 * @param {(!string|!number)} priority
 * @return {!string}
 */
export const priorityHashText = function(priority) {
  if (typeof priority === 'number')
    return 'number:' + doubleToIEEE754String(priority);
  else
    return 'string:' + priority;
};

/**
 * Validates that a priority snapshot Node is valid.
 *
 * @param {!Node} priorityNode
 */
export const validatePriorityNode = function(priorityNode) {
  if (priorityNode.isLeafNode()) {
    var val = priorityNode.val();
    assert(typeof val === 'string' || typeof val === 'number' ||
            (typeof val === 'object' && contains(val, '.sv')),
        'Priority must be a string or number.');
  } else {
    assert(priorityNode === MAX_NODE || priorityNode.isEmpty(),
        'priority of unexpected type.');
  }
  // Don't call getPriority() on MAX_NODE to avoid hitting assertion.
  assert(priorityNode === MAX_NODE || priorityNode.getPriority().isEmpty(),
      "Priority nodes can't have a priority of their own.");
};
