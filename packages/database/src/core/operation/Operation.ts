/**
 * @license
 * Copyright 2017 Google LLC
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

import { assert } from '@firebase/util';
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
  constructor(
    public fromUser: boolean,
    public fromServer: boolean,
    public queryId: string | null,
    public tagged: boolean
  ) {
    assert(!tagged || fromServer, 'Tagged queries must be from server.');
  }
  /**
   * @const
   * @type {!OperationSource}
   */
  static User = new OperationSource(
    /*fromUser=*/ true,
    false,
    null,
    /*tagged=*/ false
  );

  /**
   * @const
   * @type {!OperationSource}
   */
  static Server = new OperationSource(
    false,
    /*fromServer=*/ true,
    null,
    /*tagged=*/ false
  );

  /**
   * @param {string} queryId
   * @return {!OperationSource}
   */
  static forServerTaggedQuery = function (queryId: string): OperationSource {
    return new OperationSource(
      false,
      /*fromServer=*/ true,
      queryId,
      /*tagged=*/ true
    );
  };
}
