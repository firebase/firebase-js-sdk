import { LLRBNode } from "../util/SortedMap";
import { SortedMap } from "../util/SortedMap";

const LOG_2 = Math.log(2);

/**
 * @param {number} length
 * @constructor
 */
class Base12Num {
  count;
  current_;
  bits_;
  
  constructor(length) {
    var logBase2 = function(num) {
      return parseInt((Math.log(num) / LOG_2 as any), 10);
    };
    var bitMask = function(bits) {
      return parseInt(Array(bits + 1).join('1'), 2);
    };
    this.count = logBase2(length + 1);
    this.current_ = this.count - 1;
    var mask = bitMask(this.count);
    this.bits_ = (length + 1) & mask;
  }

  /**
   * @return {boolean}
   */
  nextBitIsOne() {
    //noinspection JSBitwiseOperatorUsage
    var result = !(this.bits_ & (0x1 << this.current_));
    this.current_--;
    return result;
  };
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
export const buildChildSet = function(childList, cmp, keyFn?, mapSortFn?) {
  childList.sort(cmp);

  var buildBalancedTree = function(low, high) {
    var length = high - low;
    if (length == 0) {
      return null;
    } else if (length == 1) {
      var namedNode = childList[low];
      var key = keyFn ? keyFn(namedNode) : namedNode;
      return new LLRBNode(key, namedNode.node, LLRBNode.BLACK, null, null);
    } else {
      var middle = parseInt((length / 2 as any), 10) + low;
      var left = buildBalancedTree(low, middle);
      var right = buildBalancedTree(middle + 1, high);
      namedNode = childList[middle];
      key = keyFn ? keyFn(namedNode) : namedNode;
      return new LLRBNode(key, namedNode.node, LLRBNode.BLACK, left, right);
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
      attachPennant(new LLRBNode(key, namedNode.node, color, null, childTree));
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
        buildPennant(chunkSize, LLRBNode.BLACK);
      } else {
        // current == 2
        buildPennant(chunkSize, LLRBNode.BLACK);
        buildPennant(chunkSize, LLRBNode.RED);
      }
    }
    return root;
  };

  var base12 = new Base12Num(childList.length);
  var root = buildFrom12Array(base12);

  return new SortedMap(mapSortFn || cmp, root);
};