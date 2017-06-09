import { assert } from "../../../utils/libs/assert";
import { contains, forEach } from "../../../utils/libs/object";

var USE_HINZE = true;

/**
 * Constructs a snapshot node representing the passed JSON and returns it.
 * @param {*} json JSON to create a node for.
 * @param {?string|?number=} opt_priority Optional priority to use.  This will be ignored if the
 * passed JSON contains a .priority property.
 * @return {!Node}
 */
export function NodeFromJSON(json, priority?) {
  if (json === null) {
    return EMPTY_NODE;
  }

  var priority = null;
  if (typeof json === 'object' && '.priority' in json) {
    priority = json['.priority'];
  } else if (typeof priority !== 'undefined') {
    priority = priority;
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
    return new LeafNode(jsonLeaf, NodeFromJSON(priority));
  }

  if (!(json instanceof Array) && USE_HINZE) {
    var children = [];
    var childrenHavePriority = false;
    var hinzeJsonObj = /** @type {!Object} */ (json);
    forEach(hinzeJsonObj, function(key, child) {
      if (typeof key !== 'string' || key.substring(0, 1) !== '.') { // Ignore metadata nodes
        var childNode = NodeFromJSON(hinzeJsonObj[key]);
        if (!childNode.isEmpty()) {
          childrenHavePriority = childrenHavePriority || !childNode.getPriority().isEmpty();
          children.push(new NamedNode(key, childNode));
        }
      }
    });

    if (children.length == 0) {
      return EMPTY_NODE;
    }

    var childSet = /**@type {!SortedMap.<string, !Node>} */ (buildChildSet(
      children, NAME_ONLY_COMPARATOR, function(namedNode) { return namedNode.name; },
      NAME_COMPARATOR
    ));
    if (childrenHavePriority) {
      var sortedChildSet = buildChildSet(children, PriorityIndex.getCompare());
      return new ChildrenNode(childSet, NodeFromJSON(priority),
        new IndexMap({'.priority': sortedChildSet}, {'.priority': PriorityIndex}));
    } else {
      return new ChildrenNode(childSet, NodeFromJSON(priority),
          IndexMap.Default);
    }
  } else {
    var node = EMPTY_NODE;
    var jsonObj = /** @type {!Object} */ (json);
    forEach(jsonObj, function(childData, key) {
      if (contains(jsonObj, key)) {
        if (key.substring(0, 1) !== '.') { // ignore metadata nodes.
          var childNode = NodeFromJSON(childData);
          if (childNode.isLeafNode() || !childNode.isEmpty())
            node = node.updateImmediateChild(key, childNode);
        }
      }
    });

    return node.updatePriority(NodeFromJSON(priority));
  }
};

var LOG_2 = Math.log(2);

/**
 * @param {number} length
 * @constructor
 */
export class Base12Num {
  private bits;
  private current;
  public count;
  constructor(length) {
    var logBase2 = function(num) {
      return parseInt(Math.log(num) / LOG_2, 10);
    };
    var bitMask = function(bits) {
      return parseInt(Array(bits + 1).join('1'), 2);
    };
    this.count = logBase2(length + 1);
    this.current = this.count - 1;
    var mask = bitMask(this.count);
    this.bits = (length + 1) & mask;
  }
  nextBitIsOne() {
    //noinspection JSBitwiseOperatorUsage
    var result = !(this.bits & (0x1 << this.current));
    this.current--;
    return result;
  }
}

/**
 * Takes a list of child nodes and constructs a SortedSet using the given comparison
 * function
 *
 * Uses the algorithm described in the paper linked here:
 * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.46.1458
 *
 * @template K, V
 * @param {Array.<!NamedNode>} childList Unsorted list of children
 * @param {function(!NamedNode, !NamedNode):number} cmp The comparison method to be used
 * @param {(function(NamedNode):K)=} keyFn An optional function to extract K from a node wrapper, if K's
 *                                                        type is not NamedNode
 * @param {(function(K, K):number)=} mapSortFn An optional override for comparator used by the generated sorted map
 * @return {SortedMap.<K, V>}
 */
export function buildChildSet(childList, cmp, keyFn, mapSortFn) {
  childList.sort(cmp);

  var buildBalancedTree = function(low, high) {
    var length = high - low;
    if (length == 0) {
      return null;
    } else if (length == 1) {
      var namedNode = childList[low];
      var key = keyFn ? keyFn(namedNode) : namedNode;
      return new fb.LLRBNode(key, namedNode.node, fb.LLRBNode.BLACK, null, null);
    } else {
      var middle = parseInt(length / 2, 10) + low;
      var left = buildBalancedTree(low, middle);
      var right = buildBalancedTree(middle + 1, high);
      namedNode = childList[middle];
      key = keyFn ? keyFn(namedNode) : namedNode;
      return new fb.LLRBNode(key, namedNode.node, fb.LLRBNode.BLACK, left, right);
    }
  };

  var buildFrom12Array = function(base12) {
    var node = null;
    var root = null;
    var index = childList.length;

    var buildPennant = function(chunkSize, color) {
      var low = index - chunkSize;
      var high = index;
      index -= chunkSize;
      var childTree = buildBalancedTree(low + 1, high);
      var namedNode = childList[low];
      var key = keyFn ? keyFn(namedNode) : namedNode;
      attachPennant(new fb.LLRBNode(key, namedNode.node, color, null, childTree));
    };

    var attachPennant = function(pennant) {
      if (node) {
        node.left = pennant;
        node = pennant;
      } else {
        root = pennant;
        node = pennant;
      }
    };

    for (var i = 0; i < base12.count; ++i) {
      var isOne = base12.nextBitIsOne();
      // The number of nodes taken in each slice is 2^(arr.length - (i + 1))
      var chunkSize = Math.pow(2, base12.count - (i + 1));
      if (isOne) {
        buildPennant(chunkSize, fb.LLRBNode.BLACK);
      } else {
        // current == 2
        buildPennant(chunkSize, fb.LLRBNode.BLACK);
        buildPennant(chunkSize, fb.LLRBNode.RED);
      }
    }
    return root;
  };

  var base12 = new Base12Num(childList.length);
  var root = buildFrom12Array(base12);

  if (root !== null) {
    return new SortedMap(mapSortFn || cmp, root);
  } else {
    return new SortedMap(mapSortFn || cmp);
  }
};

/**
 * @param {(!string|!number)} priority
 * @return {!string}
 */
export function priorityHashText(priority) {
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
export function validatePriorityNode(priorityNode) {
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

/**
 * Constant EMPTY_NODE used whenever somebody needs an empty node.
 * @const
 */
export const EMPTY_NODE = new ChildrenNode(
    new SortedMap(NAME_COMPARATOR),
    null,
    IndexMap.Default
);

/**
 * @constructor
 * @extends {ChildrenNode}
 * @private
 */
MAX_NODE_ = function() {
  ChildrenNode.call(this,
      new SortedMap(NAME_COMPARATOR),
      EMPTY_NODE,
      IndexMap.Default);
};
goog.inherits(MAX_NODE_, ChildrenNode);

/**
 * @inheritDoc
 */
MAX_NODE_.prototype.compareTo = function(other) {
  if (other === this) {
    return 0;
  } else {
    return 1;
  }
};

/**
 * @inheritDoc
 */
MAX_NODE_.prototype.equals = function(other) {
  // Not that we every compare it, but MAX_NODE_ is only ever equal to itself
  return other === this;
};

/**
 * @inheritDoc
 */
MAX_NODE_.prototype.getPriority = function() {
  return this;
};

/**
 * @inheritDoc
 */
MAX_NODE_.prototype.getImmediateChild = function(childName) {
  return EMPTY_NODE;
};

/**
 * @inheritDoc
 */
MAX_NODE_.prototype.isEmpty = function() {
  return false;
};

/**
 * Marker that will sort higher than any other snapshot.
 * @type {!MAX_NODE_}
 * @const
 */
MAX_NODE = new MAX_NODE_();
NamedNode.MIN = new NamedNode(MIN_NAME, EMPTY_NODE);
NamedNode.MAX = new NamedNode(MAX_NAME, MAX_NODE);
