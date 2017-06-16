import { Node } from '../../snap/Node';
import { Path } from '../../util/Path';
import { CompleteChildSource } from '../CompleteChildSource';
import { ChildChangeAccumulator } from '../ChildChangeAccumulator';
import { Index } from '../../snap/indexes/Index';

/**
 * NodeFilter is used to update nodes and complete children of nodes while applying queries on the fly and keeping
 * track of any child changes. This class does not track value changes as value changes depend on more
 * than just the node itself. Different kind of queries require different kind of implementations of this interface.
 * @interface
 */
export interface NodeFilter {

  /**
   * Update a single complete child in the snap. If the child equals the old child in the snap, this is a no-op.
   * The method expects an indexed snap.
   *
   * @param {!fb.core.snap.Node} snap
   * @param {string} key
   * @param {!fb.core.snap.Node} newChild
   * @param {!fb.core.util.Path} affectedPath
   * @param {!fb.core.view.CompleteChildSource} source
   * @param {?fb.core.view.ChildChangeAccumulator} optChangeAccumulator
   * @return {!fb.core.snap.Node}
   */
  updateChild(snap: Node, key: string, newChild: Node, affectedPath: Path,
              source: CompleteChildSource,
              optChangeAccumulator: ChildChangeAccumulator | null): Node;

  /**
   * Update a node in full and output any resulting change from this complete update.
   *
   * @param {!fb.core.snap.Node} oldSnap
   * @param {!fb.core.snap.Node} newSnap
   * @param {?fb.core.view.ChildChangeAccumulator} optChangeAccumulator
   * @return {!fb.core.snap.Node}
   */
  updateFullNode(oldSnap: Node, newSnap: Node,
                 optChangeAccumulator: ChildChangeAccumulator | null): Node;

  /**
   * Update the priority of the root node
   *
   * @param {!fb.core.snap.Node} oldSnap
   * @param {!fb.core.snap.Node} newPriority
   * @return {!fb.core.snap.Node}
   */
  updatePriority(oldSnap: Node, newPriority: Node): Node;

  /**
   * Returns true if children might be filtered due to query criteria
   *
   * @return {boolean}
   */
  filtersNodes(): boolean;

  /**
   * Returns the index filter that this filter uses to get a NodeFilter that doesn't filter any children.
   * @return {!NodeFilter}
   */
  getIndexedFilter(): NodeFilter;

  /**
   * Returns the index that this filter uses
   * @return {!fb.core.snap.Index}
   */
  getIndex(): Index;
}
