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
import { BsonBinaryData } from '../../../src/lite-api/bson_binary_data';
import { BsonObjectId } from '../../../src/lite-api/bson_object_Id';
import { BsonTimestamp } from '../../../src/lite-api/bson_timestamp';
import { Decimal128Value } from '../../../src/lite-api/decimal128_value';
import { Int32Value } from '../../../src/lite-api/int32_value';
import { RegexValue } from '../../../src/lite-api/regex_value';
import { Timestamp } from '../../../src/lite-api/timestamp';
import {
  parseBsonBinaryData,
  parseInt32Value,
  parseMaxKey,
  parseMinKey,
  parseBsonObjectId,
  parseRegexValue,
  parseBsonTimestamp,
  parseDecimal128Value
} from '../../../src/lite-api/user_data_reader';
import { IndexKind } from '../../../src/model/field_index';
import type { Value } from '../../../src/protos/firestore_proto_api';
import {
  JsonProtoSerializer,
  toTimestamp
} from '../../../src/remote/serializer';
import {
  JSON_SERIALIZER,
  TEST_DATABASE_ID
} from '../local/persistence_test_helpers';

import { compare } from './ordered_code_writer.test';

describe('Firestore Index Value Writer', () => {
  function compareIndexEncodedValues(
    value1: Value,
    value2: Value,
    direction: IndexKind
  ): number {
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

    return compare(encoder1.encodedBytes(), encoder2.encodedBytes());
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
      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value4, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value5, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.DESCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.DESCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value4, IndexKind.DESCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value5, IndexKind.DESCENDING)
      ).to.equal(0);
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
      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value4, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.DESCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.DESCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value4, IndexKind.DESCENDING)
      ).to.equal(0);
    });

    it('can compare timestamps with  different formats', () => {
      const value1 = { timestampValue: '2016-01-02T10:20:50Z' };
      const value2 = { timestampValue: '2016-01-02T10:20:50.000001Z' };
      const value3 = {
        timestampValue: { seconds: 1451730050, nanos: 999999999 }
      };
      const value4 = {
        timestampValue: toTimestamp(
          JSON_SERIALIZER,
          new Timestamp(1451730050, 1)
        )
      };
      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value1, value4, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value4, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value3, value4, IndexKind.ASCENDING)
      ).to.equal(1);

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.DESCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.DESCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value4, IndexKind.DESCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.DESCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value2, value4, IndexKind.DESCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value3, value4, IndexKind.DESCENDING)
      ).to.equal(-1);
    });

    it('sorts vector as a different type from array and map, with unique rules', () => {
      const vector1 = {
        mapValue: {
          fields: {
            '__type__': { stringValue: '__vector__' },
            'value': {
              arrayValue: { values: [{ doubleValue: 100 }] }
            }
          }
        }
      };
      const vector2 = {
        mapValue: {
          fields: {
            '__type__': { stringValue: '__vector__' },
            'value': {
              arrayValue: { values: [{ doubleValue: 1 }, { doubleValue: 2 }] }
            }
          }
        }
      };
      const vector3 = {
        mapValue: {
          fields: {
            '__type__': { stringValue: '__vector__' },
            'value': {
              arrayValue: { values: [{ doubleValue: 1 }, { doubleValue: 3 }] }
            }
          }
        }
      };
      const map1 = {
        mapValue: {
          fields: {
            'value': {
              arrayValue: { values: [{ doubleValue: 1 }, { doubleValue: 2 }] }
            }
          }
        }
      };
      const array1 = {
        arrayValue: { values: [{ doubleValue: 1 }, { doubleValue: 2 }] }
      };

      // Array sorts before vector
      expect(
        compareIndexEncodedValues(array1, vector1, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(array1, vector1, IndexKind.DESCENDING)
      ).to.equal(1);

      // Vector sorts before map
      expect(
        compareIndexEncodedValues(vector3, map1, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(vector3, map1, IndexKind.DESCENDING)
      ).to.equal(1);

      // Shorter vectors sort before longer vectors
      expect(
        compareIndexEncodedValues(vector1, vector2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(vector1, vector2, IndexKind.DESCENDING)
      ).to.equal(1);

      // Vectors of the same length sort by value
      expect(
        compareIndexEncodedValues(vector2, vector3, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(vector2, vector3, IndexKind.DESCENDING)
      ).to.equal(1);
    });
  });

  describe('can gracefully handle BSON types', () => {
    it('can compare BSON ObjectIds', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__oid__': { stringValue: '507f191e810c19729de860ea' }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__oid__': { stringValue: '507f191e810c19729de860eb' }
          }
        }
      };
      const value3 = parseBsonObjectId(
        new BsonObjectId('507f191e810c19729de860ea')
      );

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value3, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value3, value1, IndexKind.ASCENDING)
      ).to.equal(0);
    });

    it('can compare BSON Timestamps', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__request_timestamp__': {
              mapValue: {
                fields: {
                  seconds: { integerValue: 1 },
                  increment: { integerValue: 2 }
                }
              }
            }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__request_timestamp__': {
              mapValue: {
                fields: {
                  seconds: { integerValue: 1 },
                  increment: { integerValue: 3 }
                }
              }
            }
          }
        }
      };
      const value3 = parseBsonTimestamp(new BsonTimestamp(1, 2));
      const value4 = parseBsonTimestamp(new BsonTimestamp(2, 1));

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value3, value1, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value3, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(1);

      expect(
        compareIndexEncodedValues(value4, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value2, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value3, IndexKind.ASCENDING)
      ).to.equal(1);
    });

    it('can compare BSON Binary', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__binary__': {
              bytesValue: 'AQECAw==' // 1, 1, 2, 3
            }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__binary__': {
              bytesValue: 'AQECBA==' // 1, 1, 2, 4
            }
          }
        }
      };

      const serializer = new JsonProtoSerializer(
        TEST_DATABASE_ID,
        /* useProto3Json= */ false
      );
      const value3 = parseBsonBinaryData(
        serializer,
        new BsonBinaryData(1, new Uint8Array([1, 2, 3]))
      );

      const jsonSerializer = new JsonProtoSerializer(
        TEST_DATABASE_ID,
        /* useProto3Json= */ true
      );

      const value4 = parseBsonBinaryData(
        jsonSerializer,
        new BsonBinaryData(1, new Uint8Array([1, 2, 3]))
      );

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value3, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value3, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value4, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value4, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value1, IndexKind.ASCENDING)
      ).to.equal(0);
    });

    it('can compare BSON Regex', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__regex__': {
              mapValue: {
                fields: {
                  'pattern': { stringValue: '^foo' },
                  'options': { stringValue: 'i' }
                }
              }
            }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__regex__': {
              mapValue: {
                fields: {
                  'pattern': { stringValue: '^foo' },
                  'options': { stringValue: 'm' }
                }
              }
            }
          }
        }
      };
      const value3 = parseRegexValue(new RegexValue('^foo', 'i'));
      const value4 = parseRegexValue(new RegexValue('^zoo', 'i'));

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value3, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value3, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value4, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value2, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value3, IndexKind.ASCENDING)
      ).to.equal(1);
    });

    it('can compare BSON Int32', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__int__': { integerValue: 1 }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__int__': { integerValue: 2 }
          }
        }
      };
      const value3 = parseInt32Value(new Int32Value(1));
      const value4 = parseInt32Value(new Int32Value(2));

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value3, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value3, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value4, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value2, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value4, value3, IndexKind.ASCENDING)
      ).to.equal(1);
    });

    it('can compare BSON Decimal128', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__decimal128__': { stringValue: '-1.2e3' }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__decimal128__': { stringValue: '1.2e3' }
          }
        }
      };
      const value3 = parseDecimal128Value(new Decimal128Value('-1.2e3'));
      const value4 = parseDecimal128Value(new Decimal128Value('1.2e3'));

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value3, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value3, value1, IndexKind.ASCENDING)
      ).to.equal(0);

      expect(
        compareIndexEncodedValues(value4, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value2, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value4, value3, IndexKind.ASCENDING)
      ).to.equal(1);
    });

    it('can compare BSON Decimal128 special cases', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__decimal128__': { stringValue: 'NaN' }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__decimal128__': { stringValue: '-Infinity' }
          }
        }
      };
      const value3 = parseDecimal128Value(new Decimal128Value('NaN'));
      const value4 = parseDecimal128Value(new Decimal128Value('Infinity'));

      // order should be: NaNs are equal, and less than -Infinity
      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value2, value1, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value4, IndexKind.ASCENDING)
      ).to.equal(-1);

      expect(
        compareIndexEncodedValues(value2, value2, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value2, value3, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value2, value4, IndexKind.ASCENDING)
      ).to.equal(-1);

      expect(
        compareIndexEncodedValues(value3, value4, IndexKind.ASCENDING)
      ).to.equal(-1);
      expect(
        compareIndexEncodedValues(value4, value3, IndexKind.ASCENDING)
      ).to.equal(1);
      expect(
        compareIndexEncodedValues(value4, value4, IndexKind.ASCENDING)
      ).to.equal(0);
    });

    it('can compare BSON MinKey', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__min__': {
              nullValue: 'NULL_VALUE' as const
            }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__min__': {
              nullValue: 'NULL_VALUE' as const
            }
          }
        }
      };
      const value3 = parseMinKey();

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.DESCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);
    });

    it('can compare BSON MaxKey', () => {
      const value1 = {
        mapValue: {
          fields: {
            '__max__': {
              nullValue: 'NULL_VALUE' as const
            }
          }
        }
      };
      const value2 = {
        mapValue: {
          fields: {
            '__max__': {
              nullValue: 'NULL_VALUE' as const
            }
          }
        }
      };
      const value3 = parseMaxKey();

      expect(
        compareIndexEncodedValues(value1, value2, IndexKind.ASCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value3, IndexKind.DESCENDING)
      ).to.equal(0);
      expect(
        compareIndexEncodedValues(value1, value1, IndexKind.ASCENDING)
      ).to.equal(0);
    });
  });
});
