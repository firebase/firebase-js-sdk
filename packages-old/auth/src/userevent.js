/**
 * @license
 * Copyright 2019 Google Inc.
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

 /**
 * @fileoverview Defines fireauth.UserEvent and fireauth.UserEventType.
 */

goog.provide('fireauth.UserEvent');
goog.provide('fireauth.UserEventType');

goog.require('goog.events');
goog.require('goog.events.Event');


/**
 * User custom event.
 * @param {string} type The event type.
 * @param {?Object=} properties The optional properties to set to the custom
 *     event using same keys as object provided.
 * @constructor
 * @extends {goog.events.Event}
 */
fireauth.UserEvent = function(type, properties) {
  goog.events.Event.call(this, type);
  // If optional properties provided.
  // Add each property to custom event.
  for (var key in properties) {
    this[key] = properties[key];
  }
};
goog.inherits(fireauth.UserEvent, goog.events.Event);


/**
 * Events dispatched by the user.
 * @enum {string}
 */
fireauth.UserEventType = {
  /** Dispatched when token is changed due to Auth event. */
  TOKEN_CHANGED: 'tokenChanged',

  /** Dispatched when user is deleted. */
  USER_DELETED: 'userDeleted',

  /**
   * Dispatched when user session is invalidated. This could happen when the
   * following errors occur: user-disabled or user-token-expired.
   */
  USER_INVALIDATED: 'userInvalidated',

  /** Dispatched when the user is reloaded. */
  USER_RELOADED: 'userReloaded'
};
