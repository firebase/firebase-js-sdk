import { CacheNode } from './CacheNode';
import { NamedNode, Node } from '../snap/Node';
import { Index } from '../snap/indexes/Index';
import { WriteTreeRef } from '../WriteTree';
import { ViewCache } from './ViewCache';

/**
 * Since updates to filtered nodes might require nodes to be pulled in from "outside" the node, this interface
 * can help to get complete children that can be pulled in.
 * A class implementing this interface takes potentially multiple sources (e.g. user writes, server data from
 * other views etc.) to try it's best to get a complete child that might be useful in pulling into the view.
 *
 * @interface
 */
export interface CompleteChildSource {
  /**
   * @param {!string} childKey
   * @return {?Node}
   */
  getCompleteChild(childKey: string): Node | null;

  /**
   * @param {!Index} index
   * @param {!NamedNode} child
   * @param {boolean} reverse
   * @return {?NamedNode}
   */
  getChildAfterChild(index: Index, child: NamedNode, reverse: boolean): NamedNode | null;
}


/**
 * An implementation of CompleteChildSource that never returns any additional children
 *
 * @private
 * @constructor
 * @implements CompleteChildSource
 */
export class NoCompleteChildSource_ implements CompleteChildSource {

  /**
   * @inheritDoc
   */
  getCompleteChild() {
    return null;
  }

  /**
   * @inheritDoc
   */
  getChildAfterChild() {
    return null;
  }
}


/**
 * Singleton instance.
 * @const
 * @type {!CompleteChildSource}
 */
export const NO_COMPLETE_CHILD_SOURCE = new NoCompleteChildSource_();


/**
 * An implementation of CompleteChildSource that uses a WriteTree in addition to any other server data or
 * old event caches available to calculate complete children.
 *
 *
 * @implements CompleteChildSource
 */
export class WriteTreeCompleteChildSource implements CompleteChildSource {
  /**
   * @param {!WriteTreeRef} writes_
   * @param {!ViewCache} viewCache_
   * @param {?Node} optCompleteServerCache_
   */
  constructor(private writes_: WriteTreeRef,
              private viewCache_: ViewCache,
              private optCompleteServerCache_: Node | null = null) {
  }

  /**
   * @inheritDoc
   */
  getCompleteChild(childKey) {
    const node = this.viewCache_.getEventCache();
    if (node.isCompleteForChild(childKey)) {
      return node.getNode().getImmediateChild(childKey);
    } else {
      const serverNode = this.optCompleteServerCache_ != null ?
        new CacheNode(this.optCompleteServerCache_, true, false) : this.viewCache_.getServerCache();
      return this.writes_.calcCompleteChild(childKey, serverNode);
    }
  }

  /**
   * @inheritDoc
   */
  getChildAfterChild(index, child, reverse) {
    const completeServerData = this.optCompleteServerCache_ != null ? this.optCompleteServerCache_ :
      this.viewCache_.getCompleteServerSnap();
    const nodes = this.writes_.calcIndexedSlice(completeServerData, child, 1, reverse, index);
    if (nodes.length === 0) {
      return null;
    } else {
      return nodes[0];
    }
  }
}
