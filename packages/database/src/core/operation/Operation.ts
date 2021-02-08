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
  source: OperationSource;

  type: OperationType;

  path: Path;

  operationForChild(childName: string): Operation | null;
}

export class OperationSource {
  constructor(
    public fromUser: boolean,
    public fromServer: boolean,
    public queryId: string | null,
    public tagged: boolean
  ) {
    assert(!tagged || fromServer, 'Tagged queries must be from server.');
  }

  static User = new OperationSource(
    /*fromUser=*/ true,
    false,
    null,
    /*tagged=*/ false
  );

  static Server = new OperationSource(
    false,
    /*fromServer=*/ true,
    null,
    /*tagged=*/ false
  );

  static forServerTaggedQuery = function (queryId: string): OperationSource {
    return new OperationSource(
      false,
      /*fromServer=*/ true,
      queryId,
      /*tagged=*/ true
    );
  };
}
