/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0x00 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0x00
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from 'chai';

import { FirestoreIndexValueWriter } from '../../../src/index/firestore_index_value_writer';
import { IndexByteEncoder } from '../../../src/index/index_byte_encoder';
import { Timestamp } from '../../../src/lite-api/timestamp';
import { IndexKind } from '../../../src/model/field_index';
import type { Value } from '../../../src/protos/firestore_proto_api';
import { toTimestamp } from '../../../src/remote/serializer';
import { JSON_SERIALIZER } from '../local/persistence_test_helpers';

describe('Firestore Index Value Writer', () => {
  function compareIndexValues(
    value1: Value,
    value2: Value,
    direction: IndexKind
  ): void {
    const encoder1 = new IndexByteEncoder();
    const encoder2 = new IndexByteEncoder();
    FirestoreIndexValueWriter.INSTANCE.writeIndexValue(
      value1,
      encoder1.forKind(direction)
    );

    FirestoreIndexValueWriter.INSTANCE.writeIndexValue(
      value2,
      encoder2.forKind(direction)
    );
    expect(encoder1.encodedBytes()).to.deep.equal(encoder2.encodedBytes());
  }

  describe('can gracefully handle different format of timestamp', () => {
    it('can handle different format of timestamp', () => {
      const value1 = { timestampValue: '2016-01-02T10:20:50.850Z' };
      const value2 = { timestampValue: '2016-01-02T10:20:50.850000Z' };
      const value3 = { timestampValue: '2016-01-02T10:20:50.850000000Z' };
      const value4 = {
        timestampValue: { seconds: 1451730050, nanos: 850000000 }
      };
      const value5 = {
        timestampValue: toTimestamp(
          JSON_SERIALIZER,
          new Timestamp(1451730050, 850000000)
        )
      };
      compareIndexValues(value1, value2, IndexKind.ASCENDING);
      compareIndexValues(value1, value3, IndexKind.ASCENDING);
      compareIndexValues(value1, value4, IndexKind.ASCENDING);
      compareIndexValues(value1, value5, IndexKind.ASCENDING);

      compareIndexValues(value1, value2, IndexKind.DESCENDING);
      compareIndexValues(value1, value3, IndexKind.DESCENDING);
      compareIndexValues(value1, value4, IndexKind.DESCENDING);
      compareIndexValues(value1, value5, IndexKind.DESCENDING);
    });

    it('can handle timestamps with 0 nanoseconds', () => {
      const value1 = { timestampValue: '2016-01-02T10:20:50Z' };
      const value2 = { timestampValue: '2016-01-02T10:20:50.000000000Z' };
      const value3 = { timestampValue: { seconds: 1451730050, nanos: 0 } };
      const value4 = {
        timestampValue: toTimestamp(
          JSON_SERIALIZER,
          new Timestamp(1451730050, 0)
        )
      };
      compareIndexValues(value1, value2, IndexKind.ASCENDING);
      compareIndexValues(value1, value3, IndexKind.ASCENDING);
      compareIndexValues(value1, value4, IndexKind.ASCENDING);

      compareIndexValues(value1, value2, IndexKind.DESCENDING);
      compareIndexValues(value1, value3, IndexKind.DESCENDING);
      compareIndexValues(value1, value4, IndexKind.DESCENDING);
    });
  });
});
