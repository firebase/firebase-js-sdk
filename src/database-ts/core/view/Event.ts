import { stringify } from "../../../utils/json";

/**
 * Encapsulates the data needed to raise an event
 * @interface
 */
export const Event = function() {};


/**
 * @return {!fb.core.util.Path}
 */
Event.prototype.getPath = () => {};


/**
 * @return {!string}
 */
Event.prototype.getEventType = () => {};


/**
 * @return {!function()}
 */
Event.prototype.getEventRunner = () => {};


/**
 * @return {!string}
 */
Event.prototype.toString = () => {};



/**
 * Encapsulates the data needed to raise an event
 * @param {!string} eventType One of: value, child_added, child_changed, child_moved, child_removed
 * @param {!EventRegistration} eventRegistration The function to call to with the event data. User provided
 * @param {!fb.api.DataSnapshot} snapshot The data backing the event
 * @param {?string=} opt_prevName Optional, the name of the previous child for child_* events.
 * @constructor
 * @implements {Event}
 */
export const DataEvent = function(eventType, eventRegistration, snapshot, opt_prevName?) {
  this.eventRegistration = eventRegistration;
  this.snapshot = snapshot;
  this.prevName = opt_prevName;
  this.eventType = eventType;
};


/**
 * @inheritDoc
 */
DataEvent.prototype.getPath = function() {
  var ref = this.snapshot.getRef();
  if (this.eventType === 'value') {
    return ref.path;
  } else {
    return ref.getParent().path;
  }
};


/**
 * @inheritDoc
 */
DataEvent.prototype.getEventType = function() {
  return this.eventType;
};


/**
 * @inheritDoc
 */
DataEvent.prototype.getEventRunner = function() {
  return this.eventRegistration.getEventRunner(this);
};


/**
 * @inheritDoc
 */
DataEvent.prototype.toString = function() {
  return this.getPath().toString() + ':' + this.eventType + ':' +
      stringify(this.snapshot.exportVal());
};



/**
 * @param {EventRegistration} eventRegistration
 * @param {Error} error
 * @param {!fb.core.util.Path} path
 * @constructor
 * @implements {Event}
 */
export const CancelEvent = function(eventRegistration, error, path) {
  this.eventRegistration = eventRegistration;
  this.error = error;
  this.path = path;
};


/**
 * @inheritDoc
 */
CancelEvent.prototype.getPath = function() {
  return this.path;
};


/**
 * @inheritDoc
 */
CancelEvent.prototype.getEventType = function() {
  return 'cancel';
};


/**
 * @inheritDoc
 */
CancelEvent.prototype.getEventRunner = function() {
  return this.eventRegistration.getEventRunner(this);
};


/**
 * @inheritDoc
 */
CancelEvent.prototype.toString = function() {
  return this.path.toString() + ':cancel';
};
