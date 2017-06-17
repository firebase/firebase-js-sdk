import { assert } from "../../../utils/assert";
import { Path } from '../util/Path';

/**
 *
 * @enum
 */
export enum OperationType {
  OVERWRITE,
  MERGE,
  ACK_USER_WRITE,
  LISTEN_COMPLETE
}

/**
 * @interface
 */
export interface Operation {
  /**
   * @type {!OperationSource}
   */
  source: OperationSource;

  /**
   * @type {!OperationType}
   */
  type: OperationType;

  /**
   * @type {!Path}
   */
  path: Path;

  /**
   * @param {string} childName
   * @return {?Operation}
   */
  operationForChild(childName: string): Operation | null;
}

/**
 * @param {boolean} fromUser
 * @param {boolean} fromServer
 * @param {?string} queryId
 * @param {boolean} tagged
 * @constructor
 */
export class OperationSource {
  constructor(public fromUser: boolean,
              public fromServer: boolean,
              public queryId: string | null,
              public tagged: boolean) {
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