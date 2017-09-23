/**
 * Bring in closure-library dependencies
 */

goog.provide('firebase.webchannel.wrapper');
// goog.net.WebChannelTransport
goog.require('goog.net.createWebChannelTransport');
goog.require('goog.labs.net.webChannel.WebChannelBaseTransport')

/**
 * TODO: The current issue is that Closure is minifying the inputs to the createWebChannel function
 * we need to figure out how to make it no do that.
 */
goog.labs.net.webChannel.WebChannelBaseTransport.prototype['createWebChannel'] = goog.labs.net.webChannel.WebChannelBaseTransport.prototype.createWebChannel;
goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype['send'] = goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype.send;
goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype['open'] = goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype.open;
goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype['close'] = goog.labs.net.webChannel.WebChannelBaseTransport.Channel.prototype.close;



// goog.net.ErrorCode
goog.require('goog.net.ErrorCode');
goog.net.ErrorCode['NO_ERROR'] = goog.net.ErrorCode.NO_ERROR;
goog.net.ErrorCode['TIMEOUT'] = goog.net.ErrorCode.TIMEOUT;
goog.net.ErrorCode['HTTP_ERROR'] = goog.net.ErrorCode.HTTP_ERROR;

// goog.net.ErrorType
goog.require('goog.net.EventType');
goog.net.EventType['COMPLETE'] = goog.net.EventType.COMPLETE

// goog.net.WebChannel
goog.require('goog.net.WebChannel');
goog.require('goog.events.EventTarget');
goog.net.WebChannel['EventType'] = goog.net.WebChannel.EventType;
goog.net.WebChannel.EventType['OPEN'] = goog.net.WebChannel.EventType.OPEN;
goog.net.WebChannel.EventType['CLOSE'] = goog.net.WebChannel.EventType.CLOSE;
goog.net.WebChannel.EventType['ERROR'] = goog.net.WebChannel.EventType.ERROR;
goog.net.WebChannel.EventType['MESSAGE'] = goog.net.WebChannel.EventType.MESSAGE;
goog.events.EventTarget.prototype['listen'] = goog.events.EventTarget.prototype.listen;

// goog.net.XhrIoPool
goog.require('goog.net.XhrIoPool');
goog.net.XhrIoPool.prototype['getObject'] = goog.net.XhrIoPool.prototype.getObject;
goog.net.XhrIoPool.prototype['releaseObject'] = goog.net.XhrIoPool.prototype.releaseObject;

module['exports'] = {
  'createWebChannelTransport': goog.net.createWebChannelTransport,
  'ErrorCode': goog.net.ErrorCode,
  'EventType': goog.net.EventType,
  'WebChannel': goog.net.WebChannel,
  'XhrIoPool': goog.net.XhrIoPool
};
