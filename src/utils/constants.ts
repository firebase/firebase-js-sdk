/**
 * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
 */

export const CONSTANTS = {
  /**
   * @define {boolean} Whether this is the client Node.js SDK.
   */
  NODE_CLIENT: false,
  /**
   * @define {boolean} Whether this is the Admin Node.js SDK.
   */
  NODE_ADMIN: false,

  /**
   * Firebase SDK Version
   */
  SDK_VERSION: '${JSCORE_VERSION}'
}