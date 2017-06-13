import { ChildrenNode } from "./ChildrenNode";
import { LeafNode } from "./LeafNode";
import { NamedNode } from "./Node";
import { forEach, contains } from "../../../utils/obj";
import { assert } from "../../../utils/assert";
import { buildChildSet } from "./childSet";
import { NAME_COMPARATOR, NAME_ONLY_COMPARATOR } from "./comparators";
import { IndexMap } from "./IndexMap";
import { PRIORITY_INDEX } from "./indexes/PriorityIndex";

const USE_HINZE = true;

/**
 * Constructs a snapshot node representing the passed JSON and returns it.
 * @param {*} json JSON to create a node for.
 * @param {?string|?number=} opt_priority Optional priority to use.  This will be ignored if the
 * passed JSON contains a .priority property.
 * @return {!Node}
 */
export const nodeFromJSON = function(json, opt_priority?) {
  if (json === null) {
    return ChildrenNode.EMPTY_NODE;
  }

  var priority = null;
  if (typeof json === 'object' && '.priority' in json) {
    priority = json['.priority'];
  } else if (typeof opt_priority !== 'undefined') {
    priority = opt_priority;
  }
  assert(
      priority === null ||
      typeof priority === 'string' ||
      typeof priority === 'number' ||
      (typeof priority === 'object' && '.sv' in priority),
    'Invalid priority type found: ' + (typeof priority)
  );

  if (typeof json === 'object' && '.value' in json && json['.value'] !== null) {
    json = json['.value'];
  }

  // Valid leaf nodes include non-objects or server-value wrapper objects
  if (typeof json !== 'object' || '.sv' in json) {
    var jsonLeaf = /** @type {!(string|number|boolean|Object)} */ (json);
    return new LeafNode(jsonLeaf, nodeFromJSON(priority));
  }

  if (!(json instanceof Array) && USE_HINZE) {
    var children = [];
    var childrenHavePriority = false;
    var hinzeJsonObj = /** @type {!Object} */ (json);
    forEach(hinzeJsonObj, function(key, child) {
      if (typeof key !== 'string' || key.substring(0, 1) !== '.') { // Ignore metadata nodes
        var childNode = nodeFromJSON(hinzeJsonObj[key]);
        if (!childNode.isEmpty()) {
          childrenHavePriority = childrenHavePriority || !childNode.getPriority().isEmpty();
          children.push(new NamedNode(key, childNode));
        }
      }
    });

    if (children.length == 0) {
      return ChildrenNode.EMPTY_NODE;
    }

    var childSet = /**@type {!SortedMap.<string, !Node>} */ (buildChildSet(
      children, NAME_ONLY_COMPARATOR, function(namedNode) { return namedNode.name; },
      NAME_COMPARATOR
    ));
    if (childrenHavePriority) {
      var sortedChildSet = buildChildSet(children, PRIORITY_INDEX.getCompare());
      return new ChildrenNode(childSet, nodeFromJSON(priority),
        new IndexMap({'.priority': sortedChildSet}, {'.priority': PRIORITY_INDEX}));
    } else {
      return new ChildrenNode(childSet, nodeFromJSON(priority),
          IndexMap.Default);
    }
  } else {
    var node = ChildrenNode.EMPTY_NODE;
    var jsonObj = /** @type {!Object} */ (json);
    forEach(jsonObj, function(childData, key) {
      if (contains(jsonObj, key)) {
        if (key.substring(0, 1) !== '.') { // ignore metadata nodes.
          var childNode = nodeFromJSON(childData);
          if (childNode.isLeafNode() || !childNode.isEmpty())
            node = node.updateImmediateChild(key, childNode);
        }
      }
    });

    return node.updatePriority(nodeFromJSON(priority));
  }
};