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

// goog.net.XhrIoPool
goog.require('goog.net.XhrIoPool');
goog.net.XhrIoPool.prototype['getObject'] =
  goog.net.XhrIoPool.prototype.getObject;
goog.net.XhrIoPool.prototype['releaseObject'] =
  goog.net.XhrIoPool.prototype.releaseObject;

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
goog.net.XhrIo.prototype['getResponseText'] =
  goog.net.XhrIo.prototype.getResponseText;
goog.net.XhrIo.prototype['send'] = goog.net.XhrIo.prototype.send;

module['exports'] = {
  createWebChannelTransport: goog.net.createWebChannelTransport,
  ErrorCode: goog.net.ErrorCode,
  EventType: goog.net.EventType,
  WebChannel: goog.net.WebChannel,
  XhrIoPool: goog.net.XhrIoPool
};
