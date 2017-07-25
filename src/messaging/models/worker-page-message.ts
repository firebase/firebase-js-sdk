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
'use strict';

// These fields are strings to prevent closure from thinking goog.getMsg
// should be used to initialise the values
const PARAMS = {
  TYPE_OF_MSG: 'firebase-messaging-msg-type',
  DATA: 'firebase-messaging-msg-data'
};

// This value isn't using the TYPE_OF_MSG short hand as closure
// expects the variable to be defined via goog.getMsg
const msgType = {
  PUSH_MSG_RECEIVED: 'push-msg-received',
  NOTIFICATION_CLICKED: 'notification-clicked'
};

const createNewMsg = (msgType, msgData) => {
  const message = {
    [PARAMS.TYPE_OF_MSG]: msgType,
    [PARAMS.DATA]: msgData
  };
  return message;
};

export default {
  PARAMS,
  TYPES_OF_MSG: msgType,
  createNewMsg
};
