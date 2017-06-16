import { assert } from "../../../utils/assert";

/**
 *
 * @enum
 */
export const OperationType = {
  OVERWRITE: 0,
  MERGE: 1,
  ACK_USER_WRITE: 2,
  LISTEN_COMPLETE: 3
};

/**
 * @interface
 */
export const Operation = function() { };

/**
 * @type {!OperationSource}
 */
Operation.prototype.source;

/**
 * @type {!OperationType}
 */
Operation.prototype.type;

/**
 * @type {!Path}
 */
Operation.prototype.path;

/**
 * @param {string} childName
 * @return {?Operation}
 */
Operation.prototype.operationForChild = () => {};


/**
 * @param {boolean} fromUser
 * @param {boolean} fromServer
 * @param {?string} queryId
 * @param {boolean} tagged
 * @constructor
 */
export class OperationSource {
  fromUser;
  fromServer;
  queryId;
  tagged;
  
  constructor(fromUser, fromServer, queryId, tagged) {
    this.fromUser = fromUser;
    this.fromServer = fromServer;
    this.queryId = queryId;
    this.tagged = tagged;
    assert(!tagged || fromServer, 'Tagged queries must be from server.');
  }
  /**
   * @const
   * @type {!OperationSource}
   */
  static User = new OperationSource(/*fromUser=*/true, false, null, /*tagged=*/false);

  /**
   * @const
   * @type {!OperationSource}
   */
  static Server = new OperationSource(false, /*fromServer=*/true, null, /*tagged=*/false);

  /**
   * @param {string} queryId
   * @return {!OperationSource}
   */
  static forServerTaggedQuery = function(queryId) {
    return new OperationSource(false, /*fromServer=*/true, queryId, /*tagged=*/true);
  };
}