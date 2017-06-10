import { CONSTANTS } from "../../../utils/constants";

/**
 * Returns navigator.userAgent string or '' if it's not defined.
 * @return {string} user agent string
 */
export const getUA = function() {
  if (typeof navigator !== 'undefined' &&
      typeof navigator['userAgent'] === 'string') {
    return navigator['userAgent'];
  } else {
    return '';
  }
};

/**
 * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
 *
 * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap in the Ripple emulator) nor
 * Cordova `onDeviceReady`, which would normally wait for a callback.
 *
 * @return {boolean} isMobileCordova
 */
export const isMobileCordova = function() {
  return typeof window !== 'undefined' &&
         !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
         /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA());
};


/**
 * Detect React Native.
 *
 * @return {boolean} True if ReactNative environment is detected.
 */
export const isReactNative = function() {
  return typeof navigator === 'object' && navigator['product'] === 'ReactNative';
};


/**
 * Detect Node.js.
 *
 * @return {boolean} True if Node.js environment is detected.
 */
export const isNodeSdk = function() {
  return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
};
