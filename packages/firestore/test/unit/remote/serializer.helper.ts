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

import { expect } from 'chai';

import { Blob } from '../../../src/api/blob';
import { DocumentReference } from '../../../src/api/database';
import { FieldValue } from '../../../src/api/field_value';
import { GeoPoint } from '../../../src/api/geo_point';
import { Timestamp } from '../../../src/api/timestamp';
import { DatabaseId } from '../../../src/core/database_info';
import {
  ArrayContainsAnyFilter,
  ArrayContainsFilter,
  Direction,
  FieldFilter,
  InFilter,
  KeyFieldFilter,
  Operator,
  OrderBy,
  Query
} from '../../../src/core/query';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { Target } from '../../../src/core/target';
import { TargetData, TargetPurpose } from '../../../src/local/target_data';
import {
  DeleteMutation,
  FieldMask,
  Mutation,
  Precondition,
  SetMutation,
  VerifyMutation
} from '../../../src/model/mutation';
import { DOCUMENT_KEY_NAME, FieldPath } from '../../../src/model/path';
import * as api from '../../../src/protos/firestore_proto_api';
import { JsonProtoSerializer } from '../../../src/remote/serializer';
import {
  DocumentWatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import { ByteString } from '../../../src/util/byte_string';
import { Code, FirestoreError } from '../../../src/util/error';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  bound,
  byteStringFromString,
  deletedDoc,
  deleteMutation,
  doc,
  field,
  filter,
  key,
  orderBy,
  patchMutation,
  path,
  ref,
  setMutation,
  testUserDataReader,
  testUserDataWriter,
  transformMutation,
  version,
  wrap,
  wrapObject
} from '../../util/helpers';

const userDataWriter = testUserDataWriter();
const protobufJsonReader = testUserDataReader(/* useProto3Json= */ true);
const protoJsReader = testUserDataReader(/* useProto3Json= */ false);

/**
 * Runs the serializer test with an optional ProtobufJS verification step
 * (only provided in Node).
 *
 * These tests are initialized in 'serializer.browser.test.ts' and
 * 'serializer.node.test.ts'.
 */
export function serializerTest(
  protobufJsVerifier: (jsonValue: api.Value) => void = () => {}
): void {
  describe('Serializer', () => {
    const partition = new DatabaseId('p', 'd');
    const s = new JsonProtoSerializer(partition, { useProto3Json: false });

    /**
     * Wraps the given target in TargetData. This is useful because the APIs we're
     * testing accept TargetData, but for the most part we're just testing
     * variations on Target.
     */
    function wrapTargetData(target: Target): TargetData {
      return new TargetData(target, 1, TargetPurpose.Listen, 2);
    }

    describe('converts value', () => {
      addEqualityMatcher();

      /**
       * Verifies full round-trip of encoding/decoding fieldValue objects:
       *
       * 1. Encoding: FieldValue => JSON proto => protobufJS proto
       * 2. Decoding: protobufJS proto => JSON proto => FieldValue
       */
      function verifyFieldValueRoundTrip(opts: {
        /** The FieldValue to test. */
        value: unknown;
        /** The expected one_of field to be used (e.g. 'nullValue') */
        valueType: string;
        /** The expected JSON value for the field (e.g. 'NULL_VALUE') */
        jsonValue: unknown;
        /** The expected ProtoJS value. */
        protoJsValue?: unknown;
        /**
         * If true, uses the proto3Json serializer (and skips the round-trip
         * through protobufJs).
         */
        useProto3Json?: boolean;
      }): void {
        let { value, valueType, jsonValue, protoJsValue } = opts;
        protoJsValue = protoJsValue ?? jsonValue;

        // Convert value to JSON and verify.
        const actualJsonProto = protobufJsonReader.parseQueryValue(
          'verifyFieldValueRoundTrip',
          value
        );
        expect(actualJsonProto).to.deep.equal({ [valueType]: jsonValue });
        const actualReturnFieldValue = userDataWriter.convertValue(
          actualJsonProto
        );

        if (
          actualReturnFieldValue instanceof DocumentReference &&
          value instanceof DocumentReference
        ) {
          expect(actualReturnFieldValue.isEqual(value)).to.be.true;
        } else {
          expect(actualReturnFieldValue).to.deep.equal(value);
        }

        // Convert value to ProtoJs and verify.
        const actualProtoJsProto = protoJsReader.parseQueryValue(
          'verifyFieldValueRoundTrip',
          value
        );
        expect(actualProtoJsProto).to.deep.equal({ [valueType]: protoJsValue });
        const actualProtoJsReturnFieldValue = userDataWriter.convertValue(
          actualProtoJsProto
        );
        expect(actualProtoJsReturnFieldValue).to.deep.equal(value);

        // If we're using protobufJs JSON (not Proto3Json), then round-trip through protobufjs.
        if (!opts.useProto3Json && protobufJsVerifier) {
          protobufJsVerifier(actualProtoJsProto);
        }
      }

      it('converts NullValue', () => {
        verifyFieldValueRoundTrip({
          value: null,
          valueType: 'nullValue',
          jsonValue: 'NULL_VALUE'
        });
      });

      it('converts BooleanValue', () => {
        const examples = [true, false];
        for (const example of examples) {
          verifyFieldValueRoundTrip({
            value: example,
            valueType: 'booleanValue',
            jsonValue: example
          });
        }
      });

      it('converts IntegerValue', () => {
        const examples = [
          Number.MIN_SAFE_INTEGER,
          -100,
          -1,
          0,
          1,
          100,
          Number.MAX_SAFE_INTEGER
        ];
        for (const example of examples) {
          verifyFieldValueRoundTrip({
            value: example,
            valueType: 'integerValue',
            jsonValue: '' + example
          });
        }
      });

      it('converts DoubleValue', () => {
        const examples = [
          Number.MIN_VALUE,
          -10.1,
          -1.1,
          0.1,
          1.1,
          10.1,
          Number.MAX_VALUE
        ];
        for (const example of examples) {
          verifyFieldValueRoundTrip({
            value: example,
            valueType: 'doubleValue',
            jsonValue: example
          });
        }
      });

      it('converts NaN', () => {
        verifyFieldValueRoundTrip({
          value: NaN,
          valueType: 'doubleValue',
          jsonValue: 'NaN',
          protoJsValue: NaN
        });
      });

      it('converts Infinity', () => {
        verifyFieldValueRoundTrip({
          value: Number.POSITIVE_INFINITY,
          valueType: 'doubleValue',
          jsonValue: 'Infinity',
          protoJsValue: Number.POSITIVE_INFINITY
        });

        verifyFieldValueRoundTrip({
          value: Number.NEGATIVE_INFINITY,
          valueType: 'doubleValue',
          jsonValue: '-Infinity',
          protoJsValue: Number.NEGATIVE_INFINITY
        });
      });

      it('converts StringValue', () => {
        const examples = [
          '',
          'a',
          'abc def',
          'æ',
          '\u0000\ud7ff\ue000\uffff',
          '(╯°□°）╯︵ ┻━┻'
        ];
        for (const example of examples) {
          verifyFieldValueRoundTrip({
            value: example,
            valueType: 'stringValue',
            jsonValue: example
          });
        }
      });

      it('converts TimestampValue from proto', () => {
        const examples = [
          new Date(Date.UTC(2016, 0, 2, 10, 20, 50, 850)),
          new Date(Date.UTC(2016, 5, 17, 10, 50, 15, 0))
        ];

        const expectedJson = [
          '2016-01-02T10:20:50.850000000Z',
          '2016-06-17T10:50:15.000000000Z'
        ];

        const expectedProtoJs = [
          { seconds: '1451730050', nanos: 850000000 },
          { seconds: '1466160615', nanos: 0 }
        ];

        for (let i = 0; i < examples.length; i++) {
          verifyFieldValueRoundTrip({
            value: examples[i],
            valueType: 'timestampValue',
            jsonValue: expectedJson[i],
            protoJsValue: expectedProtoJs[i]
          });
        }
      });

      it('converts TimestampValue from string', () => {
        expect(
          userDataWriter.convertValue({
            timestampValue: '2017-03-07T07:42:58.916123456Z'
          })
        ).to.deep.equal(new Timestamp(1488872578, 916123456).toDate());

        expect(
          userDataWriter.convertValue({
            timestampValue: '2017-03-07T07:42:58.916123Z'
          })
        ).to.deep.equal(new Timestamp(1488872578, 916123000).toDate());

        expect(
          userDataWriter.convertValue({
            timestampValue: '2017-03-07T07:42:58.916Z'
          })
        ).to.deep.equal(new Timestamp(1488872578, 916000000).toDate());

        expect(
          userDataWriter.convertValue({
            timestampValue: '2017-03-07T07:42:58Z'
          })
        ).to.deep.equal(new Timestamp(1488872578, 0).toDate());
      });

      it('converts TimestampValue to string (useProto3Json=true)', () => {
        expect(
          protobufJsonReader.parseQueryValue(
            'timestampConversion',
            new Timestamp(1488872578, 916123000)
          )
        ).to.deep.equal({ timestampValue: '2017-03-07T07:42:58.916123000Z' });

        expect(
          protobufJsonReader.parseQueryValue(
            'timestampConversion',
            new Timestamp(1488872578, 916000000)
          )
        ).to.deep.equal({ timestampValue: '2017-03-07T07:42:58.916000000Z' });

        expect(
          protobufJsonReader.parseQueryValue(
            'timestampConversion',
            new Timestamp(1488872578, 916000)
          )
        ).to.deep.equal({ timestampValue: '2017-03-07T07:42:58.000916000Z' });

        expect(
          protobufJsonReader.parseQueryValue(
            'timestampConversion',
            new Timestamp(1488872578, 0)
          )
        ).to.deep.equal({ timestampValue: '2017-03-07T07:42:58.000000000Z' });
      });

      it('converts GeoPointValue', () => {
        const example = new GeoPoint(1.23, 4.56);
        const expected = {
          latitude: 1.23,
          longitude: 4.56
        };

        verifyFieldValueRoundTrip({
          value: example,
          valueType: 'geoPointValue',
          jsonValue: expected
        });
      });

      it('converts BlobValue', () => {
        const bytes = new Uint8Array([0, 1, 2, 3, 4, 5]);

        verifyFieldValueRoundTrip({
          value: Blob.fromUint8Array(bytes),
          valueType: 'bytesValue',
          jsonValue: 'AAECAwQF',
          protoJsValue: bytes
        });
      });

      it('converts ArrayValue', () => {
        const value = [true, 'foo'];
        const jsonValue = {
          values: [{ booleanValue: true }, { stringValue: 'foo' }]
        };
        verifyFieldValueRoundTrip({
          value,
          valueType: 'arrayValue',
          jsonValue
        });
      });

      it('converts empty ArrayValue', () => {
        verifyFieldValueRoundTrip({
          value: [],
          valueType: 'arrayValue',
          jsonValue: { values: [] }
        });
      });

      it('converts empty ObjectValue', () => {
        verifyFieldValueRoundTrip({
          value: {},
          valueType: 'mapValue',
          jsonValue: { fields: {} }
        });
      });

      it('converts nested ObjectValues', () => {
        const original = {
          b: true,
          d: Number.MAX_VALUE,
          i: 1,
          n: null,
          a: [1, 'foo', { b: false }],
          o: {
            a: 100,
            b: 'bar',
            o: {
              c: 3
            }
          },
          s: 'foo'
        };
        const objValue = wrap(original);
        expect(userDataWriter.convertValue(objValue)).to.deep.equal(original);

        const expectedJson: api.Value = {
          mapValue: {
            fields: {
              b: { booleanValue: true },
              d: { doubleValue: Number.MAX_VALUE },
              i: { integerValue: '1' },
              n: { nullValue: 'NULL_VALUE' },
              a: {
                arrayValue: {
                  values: [
                    { integerValue: '1' },
                    { stringValue: 'foo' },
                    {
                      mapValue: {
                        fields: {
                          b: { booleanValue: false }
                        }
                      }
                    }
                  ]
                }
              },
              o: {
                mapValue: {
                  fields: {
                    a: { integerValue: '100' },
                    b: { stringValue: 'bar' },
                    o: {
                      mapValue: {
                        fields: {
                          c: { integerValue: '3' }
                        }
                      }
                    }
                  }
                }
              },
              s: { stringValue: 'foo' }
            }
          }
        };

        verifyFieldValueRoundTrip({
          value: original,
          valueType: 'mapValue',
          jsonValue: expectedJson.mapValue
        });
      });

      it('converts RefValue', () => {
        verifyFieldValueRoundTrip({
          value: ref('docs/1'),
          valueType: 'referenceValue',
          jsonValue:
            'projects/test-project/databases/(default)/documents/docs/1'
        });
      });
    });

    describe('toKey', () => {
      it('converts an empty key', () => {
        const obj = s.toName(key(''));
        expect(obj).to.deep.equal('projects/p/databases/d/documents');
      });

      it('converts a regular key', () => {
        const actual = s.toName(key('docs/1'));
        expect(actual).to.deep.equal('projects/p/databases/d/documents/docs/1');
      });

      it('converts a long key', () => {
        const actual = s.toName(
          key('users/' + Number.MAX_SAFE_INTEGER + '/profiles/primary')
        );
        expect(actual).to.deep.equal(
          'projects/p/databases/d/documents/users/' +
            Number.MAX_SAFE_INTEGER.toString() +
            '/profiles/primary'
        );
      });
    });

    describe('fromKey', () => {
      addEqualityMatcher();

      it('converts an empty key', () => {
        const expected = key('');
        const actual = s.fromName(s.toName(expected));
        expect(actual).to.deep.equal(expected);
      });

      it('converts a regular key', () => {
        const expected = key('docs/1/part/2');
        const actual = s.fromName(s.toName(expected));
        expect(actual).to.deep.equal(expected);
      });

      it('converts default-value containing key', () => {
        const expected = key('docs/1');
        const actual = s.fromName(s.toName(expected));
        expect(actual).to.deep.equal(expected);
      });
    });

    describe('toDocumentMask', () => {
      addEqualityMatcher();

      //TODO(b/34988481): Implement correct escaping
      // eslint-disable-next-line no-restricted-properties
      it.skip('converts a weird path', () => {
        const expected: api.DocumentMask = {
          fieldPaths: ['foo.`bar.baz\\qux`']
        };
        const mask = new FieldMask([
          FieldPath.fromServerFormat('foo.bar\\.baz\\\\qux')
        ]);
        const actual = s.toDocumentMask(mask);
        expect(actual).to.deep.equal(expected);
      });
    });

    describe('fromDocumentMask', () => {
      addEqualityMatcher();

      // TODO(b/34988481): Implement correct escaping
      // eslint-disable-next-line no-restricted-properties
      it.skip('converts a weird path', () => {
        const expected = new FieldMask([
          FieldPath.fromServerFormat('foo.bar\\.baz\\\\qux')
        ]);
        const proto: api.DocumentMask = { fieldPaths: ['foo.`bar.baz\\qux`'] };
        const actual = s.fromDocumentMask(proto);
        expect(actual).to.deep.equal(expected);
      });
    });

    describe('toMutation', () => {
      it('converts DeleteMutation', () => {
        const mutation = new DeleteMutation(key('docs/1'), Precondition.none());
        const result = s.toMutation(mutation);
        expect(result).to.deep.equal({
          delete: 'projects/p/databases/d/documents/docs/1'
        });
      });
    });

    describe('toMutation / fromMutation', () => {
      addEqualityMatcher();

      function verifyMutation(mutation: Mutation, proto: unknown): void {
        const serialized = s.toMutation(mutation);
        expect(serialized).to.deep.equal(proto);
        expect(s.fromMutation(serialized)).to.deep.equal(mutation);
      }

      it('SetMutation', () => {
        const mutation = setMutation('foo/bar', { a: 'b', num: 1 });
        const proto = {
          update: s.toMutationDocument(mutation.key, mutation.value)
        };
        verifyMutation(mutation, proto);
      });

      it('PatchMutation', () => {
        const mutation = patchMutation('bar/baz', {
          a: 'b',
          num: 1,
          'some.deep.thing': 2
        });
        const proto = {
          update: s.toMutationDocument(mutation.key, mutation.data),
          updateMask: s.toDocumentMask(mutation.fieldMask),
          currentDocument: { exists: true }
        };
        verifyMutation(mutation, proto);
      });

      it('PatchMutation without precondition', () => {
        const mutation = patchMutation(
          'bar/baz',
          { a: 'b', num: 1, 'some.deep.thing': 2 },
          Precondition.none()
        );
        const proto = {
          update: s.toMutationDocument(mutation.key, mutation.data),
          updateMask: s.toDocumentMask(mutation.fieldMask)
        };
        verifyMutation(mutation, proto);
      });

      it('DeleteMutation', () => {
        const mutation = deleteMutation('baz/quux');
        const proto = { delete: s.toName(mutation.key) };
        verifyMutation(mutation, proto);
      });

      it('TransformMutation (ServerTimestamp transform)', () => {
        const mutation = transformMutation('baz/quux', {
          a: FieldValue.serverTimestamp(),
          'bar.baz': FieldValue.serverTimestamp()
        });
        const proto = {
          transform: {
            document: s.toName(mutation.key),
            fieldTransforms: [
              { fieldPath: 'a', setToServerValue: 'REQUEST_TIME' },
              { fieldPath: 'bar.baz', setToServerValue: 'REQUEST_TIME' }
            ]
          },
          currentDocument: { exists: true }
        };
        verifyMutation(mutation, proto);
      });

      it('TransformMutation (Numeric Add transform)', () => {
        const mutation = transformMutation('baz/quux', {
          integer: FieldValue.increment(42),
          double: FieldValue.increment(13.37)
        });
        const proto = {
          transform: {
            document: s.toName(mutation.key),
            fieldTransforms: [
              { fieldPath: 'integer', increment: { integerValue: '42' } },
              { fieldPath: 'double', increment: { doubleValue: 13.37 } }
            ]
          },
          currentDocument: { exists: true }
        };
        verifyMutation(mutation, proto);
      });

      it('TransformMutation (Array transforms)', () => {
        const mutation = transformMutation('docs/1', {
          a: FieldValue.arrayUnion('a', 2),
          'bar.baz': FieldValue.arrayRemove({ x: 1 })
        });
        const proto: api.Write = {
          transform: {
            document: s.toName(mutation.key),
            fieldTransforms: [
              {
                fieldPath: 'a',
                appendMissingElements: {
                  values: [wrap('a'), wrap(2)]
                }
              },
              {
                fieldPath: 'bar.baz',
                removeAllFromArray: { values: [wrap({ x: 1 })] }
              }
            ]
          },
          currentDocument: { exists: true }
        };
        verifyMutation(mutation, proto);
      });

      it('SetMutation with precondition', () => {
        const mutation = new SetMutation(
          key('foo/bar'),
          wrapObject({ a: 'b', num: 1 }),
          Precondition.updateTime(version(4))
        );
        const proto = {
          update: s.toMutationDocument(mutation.key, mutation.value),
          currentDocument: {
            updateTime: { seconds: '0', nanos: 4000 }
          }
        };
        verifyMutation(mutation, proto);
      });

      it('VerifyMutation', () => {
        const mutation = new VerifyMutation(
          key('foo/bar'),
          Precondition.updateTime(version(4))
        );
        const proto = {
          verify: s.toName(mutation.key),
          currentDocument: {
            updateTime: { seconds: '0', nanos: 4000 }
          }
        };
        verifyMutation(mutation, proto);
      });
    });

    it('toDocument() / fromDocument', () => {
      const d = doc('foo/bar', 42, { a: 5, b: 'b' });
      const proto = {
        name: s.toName(d.key),
        fields: d.toProto().mapValue.fields,
        updateTime: s.toVersion(d.version)
      };
      const serialized = s.toDocument(d);
      expect(serialized).to.deep.equal(proto);
      expect(s.fromDocument(serialized).isEqual(d)).to.equal(true);
    });

    describe('to/from FieldFilter', () => {
      addEqualityMatcher();

      it('makes dotted-property names', () => {
        const path = new FieldPath(['item', 'part', 'top']);
        const input = FieldFilter.create(path, Operator.EQUAL, wrap('food'));
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'item.part.top' },
            op: 'EQUAL',
            value: { stringValue: 'food' }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(FieldFilter);
      });

      it('converts LessThan', () => {
        const input = filter('field', '<', 42);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'field' },
            op: 'LESS_THAN',
            value: { integerValue: '42' }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(FieldFilter);
      });

      it('converts LessThanOrEqual', () => {
        const input = filter('field', '<=', 'food');
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'field' },
            op: 'LESS_THAN_OR_EQUAL',
            value: { stringValue: 'food' }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(FieldFilter);
      });

      it('converts GreaterThan', () => {
        const input = filter('field', '>', false);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'field' },
            op: 'GREATER_THAN',
            value: { booleanValue: false }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(FieldFilter);
      });

      it('converts GreaterThanOrEqual', () => {
        const input = filter('field', '>=', 1e100);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'field' },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { doubleValue: 1e100 }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(FieldFilter);
      });

      it('converts key field', () => {
        const input = filter(DOCUMENT_KEY_NAME, '==', ref('coll/doc'));
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: '__name__' },
            op: 'EQUAL',
            value: {
              referenceValue:
                'projects/test-project/databases/(default)/documents/coll/doc'
            }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(KeyFieldFilter);
      });

      it('converts array-contains', () => {
        const input = filter('field', 'array-contains', 42);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'field' },
            op: 'ARRAY_CONTAINS',
            value: { integerValue: '42' }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(ArrayContainsFilter);
      });

      it('converts IN', () => {
        const input = filter('field', 'in', [42]);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'field' },
            op: 'IN',
            value: {
              arrayValue: {
                values: [
                  {
                    integerValue: '42'
                  }
                ]
              }
            }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(InFilter);
      });

      it('converts array-contains-any', () => {
        const input = filter('field', 'array-contains-any', [42]);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          fieldFilter: {
            field: { fieldPath: 'field' },
            op: 'ARRAY_CONTAINS_ANY',
            value: {
              arrayValue: {
                values: [
                  {
                    integerValue: '42'
                  }
                ]
              }
            }
          }
        });
        const roundtripped = s.fromFieldFilter(actual);
        expect(roundtripped).to.deep.equal(input);
        expect(roundtripped).to.be.instanceof(ArrayContainsAnyFilter);
      });
    });

    describe('to/from UnaryFilter', () => {
      addEqualityMatcher();

      it('converts null', () => {
        const input = filter('field', '==', null);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          unaryFilter: {
            field: { fieldPath: 'field' },
            op: 'IS_NULL'
          }
        });
        expect(s.fromUnaryFilter(actual)).to.deep.equal(input);
      });

      it('converts Nan', () => {
        const input = filter('field', '==', NaN);
        const actual = s.toUnaryOrFieldFilter(input);
        expect(actual).to.deep.equal({
          unaryFilter: {
            field: { fieldPath: 'field' },
            op: 'IS_NAN'
          }
        });
        expect(s.fromUnaryFilter(actual)).to.deep.equal(input);
      });
    });

    it('encodes listen request labels', () => {
      const target = Query.atPath(path('collection/key')).toTarget();
      let targetData = new TargetData(target, 2, TargetPurpose.Listen, 3);

      let result = s.toListenRequestLabels(targetData);
      expect(result).to.be.null;

      targetData = new TargetData(target, 2, TargetPurpose.LimboResolution, 3);
      result = s.toListenRequestLabels(targetData);
      expect(result).to.deep.equal({ 'goog-listen-tags': 'limbo-document' });

      targetData = new TargetData(
        target,
        2,
        TargetPurpose.ExistenceFilterMismatch,
        3
      );
      result = s.toListenRequestLabels(targetData);
      expect(result).to.deep.equal({
        'goog-listen-tags': 'existence-filter-mismatch'
      });
    });

    describe('toTarget', () => {
      addEqualityMatcher();

      it('converts first-level key queries', () => {
        const q = Query.atPath(path('docs/1')).toTarget();
        const result = s.toTarget(wrapTargetData(q));
        expect(result).to.deep.equal({
          documents: { documents: ['projects/p/databases/d/documents/docs/1'] },
          targetId: 1
        });
        expect(s.fromDocumentsTarget(s.toDocumentsTarget(q))).to.deep.equal(q);
      });

      it('converts first-level ancestor queries', () => {
        const q = Query.atPath(path('messages')).toTarget();
        const result = s.toTarget(wrapTargetData(q));
        expect(result).to.deep.equal({
          query: {
            parent: 'projects/p/databases/d/documents',
            structuredQuery: {
              from: [{ collectionId: 'messages' }],
              orderBy: [
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ]
            }
          },
          targetId: 1
        });
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts nested ancestor queries', () => {
        const q = Query.atPath(
          path('rooms/1/messages/10/attachments')
        ).toTarget();
        const result = s.toTarget(wrapTargetData(q));
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents/rooms/1/messages/10',
            structuredQuery: {
              from: [{ collectionId: 'attachments' }],
              orderBy: [
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ]
            }
          },
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts single filters at first-level collections', () => {
        const q = Query.atPath(path('docs'))
          .addFilter(filter('prop', '<', 42))
          .toTarget();
        const result = s.toTarget(wrapTargetData(q));
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents',
            structuredQuery: {
              from: [{ collectionId: 'docs' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'prop' },
                  op: 'LESS_THAN',
                  value: { integerValue: '42' }
                }
              },
              orderBy: [
                {
                  field: { fieldPath: 'prop' },
                  direction: 'ASCENDING'
                },
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ]
            }
          },
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts multiple filters at first-level collections', () => {
        const q = Query.atPath(path('docs'))
          .addFilter(filter('prop', '<', 42))
          .addFilter(filter('name', '==', 'dimond'))
          .addFilter(filter('nan', '==', NaN))
          .addFilter(filter('null', '==', null))
          .addFilter(filter('tags', 'array-contains', 'pending'))
          .toTarget();
        const result = s.toTarget(wrapTargetData(q));
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents',
            structuredQuery: {
              from: [{ collectionId: 'docs' }],
              where: {
                compositeFilter: {
                  op: 'AND',
                  filters: [
                    {
                      fieldFilter: {
                        field: { fieldPath: 'prop' },
                        op: 'LESS_THAN',
                        value: { integerValue: '42' }
                      }
                    },
                    {
                      fieldFilter: {
                        field: { fieldPath: 'name' },
                        op: 'EQUAL',
                        value: { stringValue: 'dimond' }
                      }
                    },
                    {
                      unaryFilter: {
                        field: { fieldPath: 'nan' },
                        op: 'IS_NAN'
                      }
                    },
                    {
                      unaryFilter: {
                        field: { fieldPath: 'null' },
                        op: 'IS_NULL'
                      }
                    },
                    {
                      fieldFilter: {
                        field: { fieldPath: 'tags' },
                        op: 'ARRAY_CONTAINS',
                        value: { stringValue: 'pending' }
                      }
                    }
                  ]
                }
              },
              orderBy: [
                {
                  field: { fieldPath: 'prop' },
                  direction: 'ASCENDING'
                },
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ]
            }
          },
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts single filters on deeper collections', () => {
        const q = Query.atPath(path('rooms/1/messages/10/attachments'))
          .addFilter(filter('prop', '<', 42))
          .toTarget();
        const result = s.toTarget(wrapTargetData(q));
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents/rooms/1/messages/10',
            structuredQuery: {
              from: [{ collectionId: 'attachments' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'prop' },
                  op: 'LESS_THAN',
                  value: { integerValue: '42' }
                }
              },
              orderBy: [
                {
                  field: { fieldPath: 'prop' },
                  direction: 'ASCENDING'
                },
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ]
            }
          },
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts order bys', () => {
        const q = Query.atPath(path('docs'))
          .addOrderBy(orderBy('prop', 'asc'))
          .toTarget();
        const result = s.toTarget(wrapTargetData(q));
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents',
            structuredQuery: {
              from: [{ collectionId: 'docs' }],
              orderBy: [
                {
                  field: { fieldPath: 'prop' },
                  direction: 'ASCENDING'
                },
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ]
            }
          },
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts limits', () => {
        const q = Query.atPath(path('docs'))
          .withLimitToFirst(26)
          .toTarget();
        const result = s.toTarget(wrapTargetData(q));
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents',
            structuredQuery: {
              from: [{ collectionId: 'docs' }],
              orderBy: [
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ],
              limit: { value: 26 }
            }
          },
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts startAt/endAt', () => {
        const q = Query.atPath(path('docs'))
          .withStartAt(
            bound(
              [[DOCUMENT_KEY_NAME, ref('foo/bar'), 'asc']],
              /*before=*/ true
            )
          )
          .withEndAt(
            bound(
              [[DOCUMENT_KEY_NAME, ref('foo/bar'), 'asc']],
              /*before=*/ false
            )
          )
          .toTarget();
        const result = s.toTarget(wrapTargetData(q));
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents',
            structuredQuery: {
              from: [{ collectionId: 'docs' }],
              orderBy: [
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ],
              startAt: {
                values: [
                  {
                    referenceValue:
                      'projects/test-project/databases/(default)/documents/foo/bar'
                  }
                ],
                before: true
              },
              endAt: {
                values: [
                  {
                    referenceValue:
                      'projects/test-project/databases/(default)/documents/foo/bar'
                  }
                ],
                before: false
              }
            }
          },
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
        expect(s.fromQueryTarget(s.toQueryTarget(q))).to.deep.equal(q);
      });

      it('converts resume tokens', () => {
        const q = Query.atPath(path('docs')).toTarget();
        const result = s.toTarget(
          new TargetData(
            q,
            1,
            TargetPurpose.Listen,
            4,
            SnapshotVersion.min(),
            SnapshotVersion.min(),
            ByteString.fromUint8Array(new Uint8Array([1, 2, 3]))
          )
        );
        const expected = {
          query: {
            parent: 'projects/p/databases/d/documents',
            structuredQuery: {
              from: [{ collectionId: 'docs' }],
              orderBy: [
                {
                  field: { fieldPath: DOCUMENT_KEY_NAME },
                  direction: 'ASCENDING'
                }
              ]
            }
          },
          resumeToken: new Uint8Array([1, 2, 3]),
          targetId: 1
        };
        expect(result).to.deep.equal(expected);
      });
    });

    describe('to/from OperatorName', () => {
      addEqualityMatcher();

      it('contains all Operators', () => {
        const allOperators = [
          Operator.LESS_THAN,
          Operator.LESS_THAN_OR_EQUAL,
          Operator.EQUAL,
          Operator.GREATER_THAN,
          Operator.GREATER_THAN_OR_EQUAL,
          Operator.ARRAY_CONTAINS,
          Operator.IN,
          Operator.ARRAY_CONTAINS_ANY
        ];

        for (const op of allOperators) {
          expect(s.fromOperatorName(s.toOperatorName(op))).to.deep.equal(op);
        }
      });
    });

    describe('to/from Direction', () => {
      addEqualityMatcher();

      it('contains all Directions', () => {
        const allDirections = [Direction.ASCENDING, Direction.DESCENDING];

        for (const dir of allDirections) {
          expect(s.fromDirection(s.toDirection(dir))).to.deep.equal(dir);
        }
      });
    });

    describe('to/from PropertyOrder', () => {
      it('renders ascending', () => {
        const orderBy = new OrderBy(field('a.b'), Direction.ASCENDING);
        const actual = s.toPropertyOrder(orderBy);
        const expected = {
          field: { fieldPath: 'a.b' },
          direction: 'ASCENDING'
        };
        expect(actual).to.deep.equal(expected);
        expect(s.fromPropertyOrder(actual)).to.deep.equal(orderBy);
      });

      it('renders descending', () => {
        const orderBy = new OrderBy(field('a.b.c'), Direction.DESCENDING);
        const actual = s.toPropertyOrder(orderBy);
        const expected = {
          field: { fieldPath: 'a.b.c' },
          direction: 'DESCENDING'
        };
        expect(actual).to.deep.equal(expected);
        expect(s.fromPropertyOrder(actual)).to.deep.equal(orderBy);
      });
    });

    describe('fromWatchChange', () => {
      addEqualityMatcher();

      // TODO(dimond): existence filter

      // TODO(dimond): RPC status cause
      it('converts target change with added', () => {
        const expected = new WatchTargetChange(WatchTargetChangeState.Added, [
          1,
          4
        ]);
        const actual = s.fromWatchChange({
          targetChange: { targetChangeType: 'ADD', targetIds: [1, 4] }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts target change with removed', () => {
        const expected = new WatchTargetChange(
          WatchTargetChangeState.Removed,
          [1, 4],
          byteStringFromString('token'),
          new FirestoreError(Code.CANCELLED, 'message')
        );
        const actual = s.fromWatchChange({
          targetChange: {
            targetChangeType: 'REMOVE',
            targetIds: [1, 4],
            resumeToken: s.toBytes(byteStringFromString('token')),
            cause: { code: 1, message: 'message' }
          }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts target change with no_change', () => {
        const expected = new WatchTargetChange(
          WatchTargetChangeState.NoChange,
          [1, 4]
        );
        const actual = s.fromWatchChange({
          targetChange: {
            targetChangeType: 'NO_CHANGE',
            targetIds: [1, 4]
          }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts target change with no_change (omitted in JSON)', () => {
        const expected = new WatchTargetChange(
          WatchTargetChangeState.NoChange,
          [1, 4]
        );
        const actual = s.fromWatchChange({
          targetChange: {
            targetIds: [1, 4]
          }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts target change with snapshot version', () => {
        const expected = new WatchTargetChange(
          WatchTargetChangeState.Removed,
          [1, 4],
          byteStringFromString('resume'),
          new FirestoreError(Code.CANCELLED, 'message')
        );
        const actual = s.fromWatchChange({
          targetChange: {
            targetChangeType: 'REMOVE',
            targetIds: [1, 4],
            resumeToken: s.toBytes(byteStringFromString('resume')),
            cause: { code: 1, message: 'message' }
          }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts document change with target ids', () => {
        const expected = new DocumentWatchChange(
          [1, 2],
          [],
          key('coll/1'),
          doc('coll/1', 5, { foo: 'bar' })
        );
        const actual = s.fromWatchChange({
          documentChange: {
            document: {
              name: s.toName(key('coll/1')),
              fields: wrap({ foo: 'bar' }).mapValue!.fields,
              updateTime: s.toVersion(version(5))
            },
            targetIds: [1, 2]
          }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts document change with removed target ids', () => {
        const expected = new DocumentWatchChange(
          [2],
          [1],
          key('coll/1'),
          doc('coll/1', 5, { foo: 'bar' })
        );
        const actual = s.fromWatchChange({
          documentChange: {
            document: {
              name: s.toName(key('coll/1')),
              fields: wrap({ foo: 'bar' }).mapValue!.fields,
              updateTime: s.toVersion(version(5))
            },
            targetIds: [2],
            removedTargetIds: [1]
          }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts document change with deletions', () => {
        const expected = new DocumentWatchChange(
          [],
          [1, 2],
          key('coll/1'),
          deletedDoc('coll/1', 5)
        );
        const actual = s.fromWatchChange({
          documentDelete: {
            document: s.toName(key('coll/1')),
            readTime: s.toVersion(version(5)),
            removedTargetIds: [1, 2]
          }
        });
        expect(actual).to.deep.equal(expected);
      });

      it('converts document removes', () => {
        const expected = new DocumentWatchChange(
          [],
          [1, 2],
          key('coll/1'),
          null
        );
        const actual = s.fromWatchChange({
          documentRemove: {
            document: s.toName(key('coll/1')),
            removedTargetIds: [1, 2]
          }
        });
        expect(actual).to.deep.equal(expected);
      });
    });
  });
}
