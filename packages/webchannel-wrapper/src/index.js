/**
 * @license
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

/**
 * Bring in closure-library dependencies
 */

goog.provide('firebase.webchannel.wrapper');

// goog.net.WebChannelTransport
goog.require('goog.net.createWebChannelTransport');
goog.require('goog.labs.net.webChannel.WebChannelBaseTransport');
/**
 * NOTE: The `createWebChannel` function takes an options object as a second param
 * whose properties are typically mangled. We override these in externs/overrides.js
 * Without those externs, this does not function properly.
 */
goog.labs.net.webChannel.WebChannelBaseTransport.prototype['createWebChannel'] =
  goog.labs.net.webChannel.WebChannelBaseTransport.prototype.createWebChannel;
goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype['send'] =
  goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype.send;
goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype['open'] =
  goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype.open;
goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype['close'] =
  goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype.close;

// goog.net.ErrorCode
goog.require('goog.net.ErrorCode');
goog.net.ErrorCode['NO_ERROR'] = goog.net.ErrorCode.NO_ERROR;
goog.net.ErrorCode['TIMEOUT'] = goog.net.ErrorCode.TIMEOUT;
goog.net.ErrorCode['HTTP_ERROR'] = goog.net.ErrorCode.HTTP_ERROR;

// goog.net.ErrorType
goog.require('goog.net.EventType');
goog.net.EventType['COMPLETE'] = goog.net.EventType.COMPLETE;

// goog.net.WebChannel
goog.require('goog.net.WebChannel');
goog.require('goog.events.EventTarget');
goog.net.WebChannel['EventType'] = goog.net.WebChannel.EventType;
goog.net.WebChannel.EventType['OPEN'] = goog.net.WebChannel.EventType.OPEN;
goog.net.WebChannel.EventType['CLOSE'] = goog.net.WebChannel.EventType.CLOSE;
goog.net.WebChannel.EventType['ERROR'] = goog.net.WebChannel.EventType.ERROR;
goog.net.WebChannel.EventType['MESSAGE'] =
  goog.net.WebChannel.EventType.MESSAGE;
goog.events.EventTarget.prototype['listen'] =
  goog.events.EventTarget.prototype.listen;

// goog.net.XhrIo
goog.require('goog.net.XhrIo');
goog.net.XhrIo.prototype['listenOnce'] = goog.net.XhrIo.prototype.listenOnce;
goog.net.XhrIo.prototype['getLastError'] =
  goog.net.XhrIo.prototype.getLastError;
goog.net.XhrIo.prototype['getLastErrorCode'] =
  goog.net.XhrIo.prototype.getLastErrorCode;
goog.net.XhrIo.prototype['getStatus'] = goog.net.XhrIo.prototype.getStatus;
goog.net.XhrIo.prototype['getStatusText'] =
  goog.net.XhrIo.prototype.getStatusText;
goog.net.XhrIo.prototype['getResponseJson'] =
  goog.net.XhrIo.prototype.getResponseJson;
goog.net.XhrIo.prototype['getResponseText'] =
  goog.net.XhrIo.prototype.getResponseText;
goog.net.XhrIo.prototype['send'] = goog.net.XhrIo.prototype.send;

/**
 * This ignore statement is required as closure will minify these properties
 * if done in the typical prettier format
 */
// prettier-ignore
module['exports'] = {
  'createWebChannelTransport': goog.net.createWebChannelTransport,
  'ErrorCode': goog.net.ErrorCode,
  'EventType': goog.net.EventType,
  'WebChannel': goog.net.WebChannel,
  'XhrIo': goog.net.XhrIo
};
