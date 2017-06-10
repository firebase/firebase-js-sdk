/**
 * @constructor
 * @struct
 * @param {!string} type The event type
 * @param {!fb.core.snap.Node} snapshotNode The data
 * @param {string=} opt_childName The name for this child, if it's a child event
 * @param {fb.core.snap.Node=} opt_oldSnap Used for intermediate processing of child changed events
 * @param {string=} opt_prevName The name for the previous child, if applicable
 */
export class Change {
  childName;
  oldSnap;
  prevName;
  snapshotNode;
  type;

  constructor(type, snapshotNode, opt_childName?, opt_oldSnap?, opt_prevName?) {
    this.type = type;
    this.snapshotNode = snapshotNode;
    this.childName = opt_childName;
    this.oldSnap = opt_oldSnap;
    this.prevName = opt_prevName;
  };
  /**
   * @param {!fb.core.snap.Node} snapshot
   * @return {!Change}
   */
  static valueChange(snapshot) {
    return new Change(Change.VALUE, snapshot);
  };


  /**
   * @param {string} childKey
   * @param {!fb.core.snap.Node} snapshot
   * @return {!Change}
   */
  static childAddedChange(childKey, snapshot) {
    return new Change(Change.CHILD_ADDED, snapshot, childKey);
  };


  /**
   * @param {string} childKey
   * @param {!fb.core.snap.Node} snapshot
   * @return {!Change}
   */
  static childRemovedChange(childKey, snapshot) {
    return new Change(Change.CHILD_REMOVED, snapshot, childKey);
  };


  /**
   * @param {string} childKey
   * @param {!fb.core.snap.Node} newSnapshot
   * @param {!fb.core.snap.Node} oldSnapshot
   * @return {!Change}
   */
  static childChangedChange(childKey, newSnapshot, oldSnapshot) {
    return new Change(Change.CHILD_CHANGED, newSnapshot, childKey, oldSnapshot);
  };


  /**
   * @param {string} childKey
   * @param {!fb.core.snap.Node} snapshot
   * @return {!Change}
   */
  static childMovedChange(childKey, snapshot) {
    return new Change(Change.CHILD_MOVED, snapshot, childKey);
  };


  /**
   * @param {string} prevName
   * @return {!Change}
   */
  changeWithPrevName(prevName) {
    return new Change(this.type, this.snapshotNode, this.childName, this.oldSnap, prevName);
  };


  //event types
  /** Event type for a child added */
  static CHILD_ADDED = 'child_added';


  /** Event type for a child removed */
  static CHILD_REMOVED = 'child_removed';


  /** Event type for a child changed */
  static CHILD_CHANGED = 'child_changed';


  /** Event type for a child moved */
  static CHILD_MOVED = 'child_moved';


  /** Event type for a value change */
  static VALUE = 'value';
}

