/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
goog.provide('fb.core.view.CancelEvent');
goog.provide('fb.core.view.DataEvent');
goog.provide('fb.core.view.Event');

goog.require('fb.util.json');



/**
 * Encapsulates the data needed to raise an event
 * @interface
 */
fb.core.view.Event = function() {};


/**
 * @return {!fb.core.util.Path}
 */
fb.core.view.Event.prototype.getPath = goog.abstractMethod;


/**
 * @return {!string}
 */
fb.core.view.Event.prototype.getEventType = goog.abstractMethod;


/**
 * @return {!function()}
 */
fb.core.view.Event.prototype.getEventRunner = goog.abstractMethod;


/**
 * @return {!string}
 */
fb.core.view.Event.prototype.toString = goog.abstractMethod;



/**
 * Encapsulates the data needed to raise an event
 * @param {!string} eventType One of: value, child_added, child_changed, child_moved, child_removed
 * @param {!fb.core.view.EventRegistration} eventRegistration The function to call to with the event data. User provided
 * @param {!fb.api.DataSnapshot} snapshot The data backing the event
 * @param {?string=} opt_prevName Optional, the name of the previous child for child_* events.
 * @constructor
 * @implements {fb.core.view.Event}
 */
fb.core.view.DataEvent = function(eventType, eventRegistration, snapshot, opt_prevName) {
  this.eventRegistration = eventRegistration;
  this.snapshot = snapshot;
  this.prevName = opt_prevName;
  this.eventType = eventType;
};


/**
 * @inheritDoc
 */
fb.core.view.DataEvent.prototype.getPath = function() {
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
fb.core.view.DataEvent.prototype.getEventType = function() {
  return this.eventType;
};


/**
 * @inheritDoc
 */
fb.core.view.DataEvent.prototype.getEventRunner = function() {
  return this.eventRegistration.getEventRunner(this);
};


/**
 * @inheritDoc
 */
fb.core.view.DataEvent.prototype.toString = function() {
  return this.getPath().toString() + ':' + this.eventType + ':' +
      fb.util.json.stringify(this.snapshot.exportVal());
};



/**
 * @param {fb.core.view.EventRegistration} eventRegistration
 * @param {Error} error
 * @param {!fb.core.util.Path} path
 * @constructor
 * @implements {fb.core.view.Event}
 */
fb.core.view.CancelEvent = function(eventRegistration, error, path) {
  this.eventRegistration = eventRegistration;
  this.error = error;
  this.path = path;
};


/**
 * @inheritDoc
 */
fb.core.view.CancelEvent.prototype.getPath = function() {
  return this.path;
};


/**
 * @inheritDoc
 */
fb.core.view.CancelEvent.prototype.getEventType = function() {
  return 'cancel';
};


/**
 * @inheritDoc
 */
fb.core.view.CancelEvent.prototype.getEventRunner = function() {
  return this.eventRegistration.getEventRunner(this);
};


/**
 * @inheritDoc
 */
fb.core.view.CancelEvent.prototype.toString = function() {
  return this.path.toString() + ':cancel';
};
