/**
 * @license
 * Copyright 2020 Google LLC
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

import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../src/remote/watch_change';
import * as api from '../../src/protos/firestore_proto_api';
import { Document, NoDocument } from '../../src/model/document';
import { mapRpcCodeFromCode } from '../../src/remote/rpc_error';
import { fail } from '../../src/util/assert';
import {
  JsonProtoSerializer,
  toBytes,
  toName,
  toVersion
} from '../../src/remote/serializer';
import { TEST_DATABASE_ID } from '../unit/local/persistence_test_helpers';

const serializer = new JsonProtoSerializer(TEST_DATABASE_ID, {
  useProto3Json: true
});

export function encodeWatchChange(
  watchChange: WatchChange
): api.ListenResponse {
  if (watchChange instanceof ExistenceFilterChange) {
    return {
      filter: {
        count: watchChange.existenceFilter.count,
        targetId: watchChange.targetId
      }
    };
  }
  if (watchChange instanceof DocumentWatchChange) {
    if (watchChange.newDoc instanceof Document) {
      const doc = watchChange.newDoc;
      return {
        documentChange: {
          document: {
            name: toName(serializer, doc.key),
            fields: doc.toProto().mapValue.fields,
            updateTime: toVersion(serializer, doc.version)
          },
          targetIds: watchChange.updatedTargetIds,
          removedTargetIds: watchChange.removedTargetIds
        }
      };
    } else if (watchChange.newDoc instanceof NoDocument) {
      const doc = watchChange.newDoc;
      return {
        documentDelete: {
          document: toName(serializer, doc.key),
          readTime: toVersion(serializer, doc.version),
          removedTargetIds: watchChange.removedTargetIds
        }
      };
    } else if (watchChange.newDoc === null) {
      return {
        documentRemove: {
          document: toName(serializer, watchChange.key),
          removedTargetIds: watchChange.removedTargetIds
        }
      };
    }
  }
  if (watchChange instanceof WatchTargetChange) {
    let cause: api.Status | undefined = undefined;
    if (watchChange.cause) {
      cause = {
        code: mapRpcCodeFromCode(watchChange.cause.code),
        message: watchChange.cause.message
      };
    }
    return {
      targetChange: {
        targetChangeType: encodeTargetChangeTargetChangeType(watchChange.state),
        targetIds: watchChange.targetIds,
        resumeToken: toBytes(serializer, watchChange.resumeToken),
        cause
      }
    };
  }
  return fail('Unrecognized watch change: ' + JSON.stringify(watchChange));
}

function encodeTargetChangeTargetChangeType(
  state: WatchTargetChangeState
): api.TargetChangeTargetChangeType {
  switch (state) {
    case WatchTargetChangeState.Added:
      return 'ADD';
    case WatchTargetChangeState.Current:
      return 'CURRENT';
    case WatchTargetChangeState.NoChange:
      return 'NO_CHANGE';
    case WatchTargetChangeState.Removed:
      return 'REMOVE';
    case WatchTargetChangeState.Reset:
      return 'RESET';
    default:
      return fail('Unknown WatchTargetChangeState: ' + state);
  }
}
