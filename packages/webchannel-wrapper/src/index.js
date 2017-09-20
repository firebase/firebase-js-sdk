/**
 * Bring in closure-library dependencies
 */

goog.provide('firebase.webchannel.wrapper');

goog.require('goog.net.createWebChannelTransport');
goog.require('goog.net.ErrorCode');
goog.require('goog.net.EventType');
goog.require('goog.net.WebChannel');
goog.require('goog.net.XhrIoPool');

const namespacesToExport = {
  createWebChannelTransport: goog.net.createWebChannelTransport,
  ErrorCode: goog.net.ErrorCode,
  EventType: goog.net.EventType,
  WebChannel: goog.net.WebChannel,
  XhrIoPool: goog.net.XhrIoPool,
};