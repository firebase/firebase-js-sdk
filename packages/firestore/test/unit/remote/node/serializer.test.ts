/**
 * Copyright 2017 Google Inc.
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
import * as Long from 'long';

import * as api from '../../../../src/protos/firestore_proto_api';
import { Blob } from '../../../../src/api/blob';
import { GeoPoint } from '../../../../src/api/geo_point';
import { Timestamp } from '../../../../src/api/timestamp';
import { DatabaseId } from '../../../../src/core/database_info';
import {
  Direction,
  OrderBy,
  Query,
  RelationFilter,
  RelationOp
} from '../../../../src/core/query';
import { SnapshotVersion } from '../../../../src/core/snapshot_version';
import { QueryData, QueryPurpose } from '../../../../src/local/query_data';
import * as fieldValue from '../../../../src/model/field_value';
import {
  DeleteMutation,
  FieldMask,
  Mutation,
  Precondition,
  SetMutation
} from '../../../../src/model/mutation';
import { DOCUMENT_KEY_NAME, FieldPath } from '../../../../src/model/path';
import { JsonProtoSerializer } from '../../../../src/remote/serializer';
import {
  DocumentWatchChange,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../../src/remote/watch_change';
import { Code, FirestoreError } from '../../../../src/util/error';
import { AnyJs } from '../../../../src/util/misc';
import * as obj from '../../../../src/util/obj';
import * as types from '../../../../src/util/types';
import { addEqualityMatcher } from '../../../util/equality_matcher';
import {
  bound,
  dbId,
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
  transformMutation,
  version,
  wrap,
  wrapObject
} from '../../../util/helpers';
import { loadProtos } from '../../../../src/platform_node/load_protos';

describe('Serializer', () => {
  const partition = new DatabaseId('p', 'd');
  const s = new JsonProtoSerializer(partition, { useProto3Json: false });
  const emptyResumeToken = new Uint8Array(0);
  const protos = loadProtos();
  const ds = protos['google']['firestore']['v1beta1'];

  /**
   * Wraps the given query in QueryData. This is useful because the APIs we're
   * testing accept QueryData, but for the most part we're just testing
   * variations on Query.
   */
  function wrapQueryData(query: Query): QueryData {
    return new QueryData(
      query,
      1,
      QueryPurpose.Listen,
      SnapshotVersion.MIN,
      emptyResumeToken
    );
  }

  describe('toValue', () => {
    /**
     * Verifies that the given object can be parsed as a datastore Value proto.
     */
    function expectValue(obj: AnyJs, tag: string): Chai.Assertion {
      const proto = new ds.Value(obj);
      expect(proto.value_type).to.equal(tag);
      return expect(proto[tag]);
    }

    it('converts NullValue', () => {
      const obj = s.toValue(fieldValue.NullValue.INSTANCE);
      expect(obj).to.deep.equal({ nullValue: 'NULL_VALUE' });
      // protobuf.js generates it differently.
      expectValue(obj, 'nullValue').to.equal(0);
    });

    it('converts BooleanValue', () => {
      const examples = [true, false];
      for (const example of examples) {
        const obj = s.toValue(fieldValue.BooleanValue.of(example));
        expect(obj).to.deep.equal({ booleanValue: example });
        expectValue(obj, 'booleanValue').to.equal(example);
      }
    });

    it('converts IntegerValue', () => {
      const examples = [
        types.MIN_SAFE_INTEGER,
        -100,
        -1,
        0,
        1,
        100,
        types.MAX_SAFE_INTEGER
      ];
      for (const example of examples) {
        const obj = s.toValue(new fieldValue.IntegerValue(example));
        expect(obj).to.deep.equal({ integerValue: '' + example });

        const longVal = Long.fromString(example.toString(), false);
        expectValue(obj, 'integerValue').to.deep.equal(
          longVal,
          'for integer ' + example
        );
      }
    });

    it('converts DoubleValue', () => {
      const examples = [
        Number.MIN_VALUE,
        -10.0,
        -1.0,
        0.0,
        1.0,
        10.0,
        Number.MAX_VALUE,
        NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY
      ];
      for (const example of examples) {
        const obj = s.toValue(new fieldValue.DoubleValue(example));

        expect(obj).to.deep.equal({ doubleValue: example });
        expectValue(obj, 'doubleValue').to.deep.equal(
          example,
          'for double ' + example
        );
      }
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
        const obj = s.toValue(new fieldValue.StringValue(example));
        expect(obj).to.deep.equal({ stringValue: example });

        expectValue(obj, 'stringValue').to.deep.equal(
          example,
          'for string ' + example
        );
      }
    });

    it('converts TimestampValue', () => {
      const examples = [
        new Date(Date.UTC(2016, 0, 2, 10, 20, 50, 850)),
        new Date(Date.UTC(2016, 5, 17, 10, 50, 15, 0))
      ];

      const expectedJson = [
        { seconds: 1451730050, nanos: 850000000 },
        { seconds: 1466160615, nanos: 0 }
      ];

      for (let i = 0; i < examples.length; i++) {
        const example = examples[i];
        const obj = s.toValue(
          new fieldValue.TimestampValue(Timestamp.fromDate(example))
        );
        const expected = { timestampValue: expectedJson[i] };
        expect(obj).to.deep.equal(expected);
        expectValue(obj, 'timestampValue').to.deep.equal(
          new protos['google']['protobuf'].Timestamp(expectedJson[i]),
          'for date ' + example
        );
      }
    });

    it('converts GeoPointValue', () => {
      const example = new GeoPoint(1.23, 4.56);

      const expected = {
        geoPointValue: {
          latitude: 1.23,
          longitude: 4.56
        }
      };

      const obj = s.toValue(new fieldValue.GeoPointValue(example));
      expect(obj).to.deep.equal(expected);
      expectValue(obj, 'geoPointValue').to.deep.equal(
        new protos['google']['type'].LatLng(1.23, 4.56)
      );
    });

    it('converts BlobValue to Uint8Array', () => {
      const bytes = [0, 1, 2, 3, 4, 5];
      const example = Blob.fromUint8Array(new Uint8Array(bytes));

      const expected = {
        bytesValue: new Uint8Array(bytes)
      };

      const obj = s.toValue(new fieldValue.BlobValue(example));
      expect(obj).to.deep.equal(expected);
    });

    it('converts BlobValue to Base64 string', () => {
      const base64 = 'AAECAwQF';
      const bytes = [0, 1, 2, 3, 4, 5];
      const example = Blob.fromUint8Array(new Uint8Array(bytes));

      const expected = { bytesValue: base64 };

      const serializer = new JsonProtoSerializer(partition, {
        useProto3Json: true
      });
      const obj = serializer.toValue(new fieldValue.BlobValue(example));
      expect(obj).to.deep.equal(expected);
    });

    it('converts ArrayValue', () => {
      const data = [true, 'foo'];
      const obj = s.toValue(wrap(data));
      expect(obj).to.deep.equal({
        arrayValue: { values: [{ booleanValue: true }, { stringValue: 'foo' }] }
      });
    });

    it('converts empty ArrayValue', () => {
      const obj = s.toValue(wrap([]));
      expect(obj).to.deep.equal({ arrayValue: { values: [] } });
    });

    it('converts ObjectValue.EMPTY', () => {
      const obj = s.toValue(fieldValue.ObjectValue.EMPTY);
      expect(obj).to.deep.equal({ mapValue: { fields: {} } });

      expectValue(obj, 'mapValue').to.deep.equal(new ds.MapValue());
    });

    it('converts nested ObjectValues', () => {
      // clang-format off
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
      const objValue = wrapObject(original);
      expect(objValue.value()).to.deep.equal(original);

      const expectedJson = {
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
      const obj = s.toValue(objValue);
      expect(obj).to.deep.equal(expectedJson);

      // Compare the raw object representation rather than the Message because
      // occasionally Jasmine will hang trying to generate the string form in
      // the event of an inequality.
      expect(new ds.Value(obj).toRaw(true, true)).to.deep.equal(
        new ds.Value(expectedJson).toRaw(true, true)
      );
      // clang-format on
    });
  });

  describe('fromValue', () => {
    addEqualityMatcher();

    it('converts NullValue', () => {
      const proto: api.Value = { nullValue: 'NULL_VALUE' };
      expect(new ds.Value(proto).value_type).to.equal('nullValue');
      expect(s.fromValue(proto)).to.equal(fieldValue.NullValue.INSTANCE);
    });

    it('converts BooleanValue', () => {
      const examples = [true, false];
      for (const example of examples) {
        const proto = { booleanValue: example };
        expect(new ds.Value(proto).value_type).to.equal('booleanValue');
        expect(s.fromValue(proto)).to.deep.equal(
          fieldValue.BooleanValue.of(example)
        );
      }
    });

    it('converts IntegerValue', () => {
      const examples = [
        types.MIN_SAFE_INTEGER,
        -100,
        -1,
        0,
        1,
        100,
        types.MAX_SAFE_INTEGER
      ];
      for (const example of examples) {
        const proto: api.Value = { integerValue: '' + example };
        expect(new ds.Value(proto).value_type).to.equal('integerValue');
        expect(s.fromValue(proto)).to.deep.equal(
          new fieldValue.IntegerValue(example)
        );
      }
    });

    it('converts DoubleValue', () => {
      const examples = [
        Number.MIN_VALUE,
        -10.0,
        -1.0,
        0.0,
        1.0,
        10.0,
        Number.MAX_VALUE,
        NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY
      ];
      for (const example of examples) {
        const proto = { doubleValue: example };
        expect(new ds.Value(proto).value_type).to.equal('doubleValue');
        expect(s.fromValue(proto)).to.deep.equal(
          new fieldValue.DoubleValue(example)
        );
      }
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
        const proto = { stringValue: example };
        expect(new ds.Value(proto).value_type).to.equal('stringValue');
        expect(s.fromValue(proto)).to.deep.equal(
          new fieldValue.StringValue(example)
        );
      }
    });

    it('converts ArrayValue', () => {
      const proto = {
        arrayValue: { values: [{ booleanValue: true }, { stringValue: 'foo' }] }
      };
      expect(new ds.Value(proto).value_type).to.equal('arrayValue');
      expect(s.fromValue(proto)).to.deep.equal(
        new fieldValue.ArrayValue([
          fieldValue.BooleanValue.TRUE,
          new fieldValue.StringValue('foo')
        ])
      );
    });

    it('converts empty ArrayValue', () => {
      const proto = { arrayValue: {} };
      expect(new ds.Value(proto).value_type).to.equal('arrayValue');
      expect(s.fromValue(proto)).to.deep.equal(new fieldValue.ArrayValue([]));
    });

    it('converts ObjectValue.EMPTY', () => {
      const proto = { mapValue: { fields: {} } };
      expect(new ds.Value(proto).mapValue).to.deep.equal(new ds.MapValue());
      expect(s.fromValue(proto)).to.deep.equal(fieldValue.ObjectValue.EMPTY);
    });

    it('converts TimestampValue from proto', () => {
      const examples = [
        { seconds: '1451730050', nanos: 850000000 },
        { seconds: '1466160615', nanos: 0 }
      ];
      const expectedValues = [
        new Date(Date.UTC(2016, 0, 2, 10, 20, 50, 850)),
        new Date(Date.UTC(2016, 5, 17, 10, 50, 15, 0))
      ];

      for (let i = 0; i < examples.length; i++) {
        const example = examples[i];
        const date = expectedValues[i];
        // We have to trick it into thinking the timestampValue is a string,
        // because the proto interface definition isn't comprehensive.
        // tslint:disable-next-line:no-any
        const proto: api.Value = { timestampValue: example as any };
        expect(new ds.Value(proto).value_type).to.equal('timestampValue');
        expect(s.fromValue(proto)).to.deep.equal(
          new fieldValue.TimestampValue(Timestamp.fromDate(date))
        );
      }
    });

    it('converts TimestampValue from string', () => {
      expect(
        s.fromValue({ timestampValue: '2017-03-07T07:42:58.916123456Z' })
      ).to.deep.equal(
        new fieldValue.TimestampValue(new Timestamp(1488872578, 916123456))
      );

      expect(
        s.fromValue({ timestampValue: '2017-03-07T07:42:58.916123Z' })
      ).to.deep.equal(
        new fieldValue.TimestampValue(new Timestamp(1488872578, 916123000))
      );

      expect(
        s.fromValue({ timestampValue: '2017-03-07T07:42:58.916Z' })
      ).to.deep.equal(
        new fieldValue.TimestampValue(new Timestamp(1488872578, 916000000))
      );

      expect(
        s.fromValue({ timestampValue: '2017-03-07T07:42:58Z' })
      ).to.deep.equal(
        new fieldValue.TimestampValue(new Timestamp(1488872578, 0))
      );
    });

    it('converts GeoPointValue', () => {
      const proto = {
        geoPointValue: {
          latitude: 1.23,
          longitude: 4.56
        }
      };

      expect(s.fromValue(proto)).to.deep.equal(
        new fieldValue.GeoPointValue(new GeoPoint(1.23, 4.56))
      );
    });

    it('converts BlobValue from Uint8Array', () => {
      const bytes = [0, 1, 2, 3, 4, 5];
      const proto = {
        // The types say it's a string, but it's actually a Uint8Array in Node
        // tslint:disable-next-line:no-any
        bytesValue: new Uint8Array(bytes) as any
      };
      const blob = Blob.fromUint8Array(new Uint8Array(bytes));
      expect(s.fromValue(proto)).to.deep.equal(new fieldValue.BlobValue(blob));
    });

    it('converts BlobValue from string', () => {
      const base64 = 'AAECAwQF';
      const bytes = [0, 1, 2, 3, 4, 5];
      const proto = { bytesValue: base64 };
      const blob = Blob.fromUint8Array(new Uint8Array(bytes));
      const serializer = new JsonProtoSerializer(partition, {
        useProto3Json: true
      });
      expect(serializer.fromValue(proto)).to.deep.equal(
        new fieldValue.BlobValue(blob)
      );
    });

    it('converts RefValue', () => {
      const example = 'projects/project1/databases/database1/documents/docs/1';

      const expected = new fieldValue.RefValue(
        dbId('project1', 'database1'),
        key('docs/1')
      );

      const obj = s.fromValue({ referenceValue: example });
      expect(obj).to.deep.equal(expected);
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
        key('users/' + types.MAX_SAFE_INTEGER + '/profiles/primary')
      );
      expect(actual).to.deep.equal(
        'projects/p/databases/d/documents/users/' +
          types.MAX_SAFE_INTEGER.toString() +
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

    // TODO(b/34988481): Implement correct escaping.
    xit('converts a weird path', () => {
      const expected: api.DocumentMask = { fieldPaths: ['foo.`bar.baz\\qux`'] };
      const mask = new FieldMask([
        FieldPath.fromServerFormat('foo.bar\\.baz\\\\qux')
      ]);
      const actual = s.toDocumentMask(mask);
      expect(actual).to.deep.equal(expected);
    });
  });

  describe('fromDocumentMask', () => {
    addEqualityMatcher();

    // TODO(b/34988481): Implement correct escaping.
    xit('converts a weird path', () => {
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
      const mutation = new DeleteMutation(key('docs/1'), Precondition.NONE);
      const result = s.toMutation(mutation);
      expect(result).to.deep.equal({
        delete: 'projects/p/databases/d/documents/docs/1'
      });
    });
  });

  describe('toMutation / fromMutation', () => {
    addEqualityMatcher();

    function verifyMutation(mutation: Mutation, proto: AnyJs) {
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
        Precondition.NONE
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

    it('TransformMutation', () => {
      const mutation = transformMutation('baz/quux', ['a', 'bar.baz']);
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

    it('SetMutation with precondition', () => {
      const mutation = new SetMutation(
        key('foo/bar'),
        wrapObject({ a: 'b', num: 1 }),
        Precondition.updateTime(version(4))
      );
      const proto = {
        update: s.toMutationDocument(mutation.key, mutation.value),
        currentDocument: {
          updateTime: { seconds: 0, nanos: 4000 }
        }
      };
      verifyMutation(mutation, proto);
    });
  });

  it('toDocument() / fromDocument', () => {
    const d = doc('foo/bar', 42, { a: 5, b: 'b' });
    const proto = {
      name: s.toName(d.key),
      fields: s.toFields(d.data),
      updateTime: s.toVersion(d.version)
    };
    const serialized = s.toDocument(d);
    expect(serialized).to.deep.equal(proto);
    expect(s.fromDocument(serialized).isEqual(d)).to.equal(true);
  });

  describe('to/from RelationFilter', () => {
    addEqualityMatcher();

    it('makes dotted-property names', () => {
      const path = new FieldPath(['item', 'part', 'top']);
      const input = new RelationFilter(path, RelationOp.EQUAL, wrap('food'));
      const actual = s.toRelationFilter(input);
      expect(actual).to.deep.equal({
        fieldFilter: {
          field: { fieldPath: 'item.part.top' },
          op: 'EQUAL',
          value: { stringValue: 'food' }
        }
      });
      expect(s.fromRelationFilter(actual)).to.deep.equal(input);
    });

    it('converts LessThan', () => {
      const input = filter('field', '<', 42);
      const actual = s.toRelationFilter(input);
      expect(actual).to.deep.equal({
        fieldFilter: {
          field: { fieldPath: 'field' },
          op: 'LESS_THAN',
          value: { integerValue: '42' }
        }
      });
      expect(s.fromRelationFilter(actual)).to.deep.equal(input);
    });

    it('converts LessThanOrEqual', () => {
      const input = filter('field', '<=', 'food');
      const actual = s.toRelationFilter(input);
      expect(actual).to.deep.equal({
        fieldFilter: {
          field: { fieldPath: 'field' },
          op: 'LESS_THAN_OR_EQUAL',
          value: { stringValue: 'food' }
        }
      });
      expect(s.fromRelationFilter(actual)).to.deep.equal(input);
    });

    it('converts GreaterThan', () => {
      const input = filter('field', '>', false);
      const actual = s.toRelationFilter(input);
      expect(actual).to.deep.equal({
        fieldFilter: {
          field: { fieldPath: 'field' },
          op: 'GREATER_THAN',
          value: { booleanValue: false }
        }
      });
      expect(s.fromRelationFilter(actual)).to.deep.equal(input);
    });

    it('converts GreaterThanOrEqual', () => {
      const input = filter('field', '>=', 1e100);
      const actual = s.toRelationFilter(input);
      expect(actual).to.deep.equal({
        fieldFilter: {
          field: { fieldPath: 'field' },
          op: 'GREATER_THAN_OR_EQUAL',
          value: { doubleValue: 1e100 }
        }
      });
      expect(s.fromRelationFilter(actual)).to.deep.equal(input);
    });
  });

  describe('to/from UnaryFilter', () => {
    addEqualityMatcher();

    it('converts null', () => {
      const input = filter('field', '==', null);
      const actual = s.toUnaryFilter(input);
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
      const actual = s.toUnaryFilter(input);
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
    const query = Query.atPath(path('collection/key'));
    let queryData = new QueryData(query, 2, QueryPurpose.Listen);

    let result = s.toListenRequestLabels(queryData);
    expect(result).to.be.null;

    queryData = new QueryData(query, 2, QueryPurpose.LimboResolution);
    result = s.toListenRequestLabels(queryData);
    expect(result).to.deep.equal({ 'goog-listen-tags': 'limbo-document' });

    queryData = new QueryData(query, 2, QueryPurpose.ExistenceFilterMismatch);
    result = s.toListenRequestLabels(queryData);
    expect(result).to.deep.equal({
      'goog-listen-tags': 'existence-filter-mismatch'
    });
  });

  describe('toTarget', () => {
    addEqualityMatcher();

    it('converts first-level key queries', () => {
      const q = Query.atPath(path('docs/1'));
      const result = s.toTarget(wrapQueryData(q));
      expect(result).to.deep.equal({
        documents: { documents: ['projects/p/databases/d/documents/docs/1'] },
        targetId: 1
      });
      expect(s.fromDocumentsTarget(s.toDocumentsTarget(q))).to.deep.equal(q);
    });

    it('converts first-level ancestor queries', () => {
      const q = Query.atPath(path('messages'));
      const result = s.toTarget(wrapQueryData(q));
      expect(result).to.deep.equal({
        query: {
          parent: 'projects/p/databases/d',
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
      const q = Query.atPath(path('rooms/1/messages/10/attachments'));
      const result = s.toTarget(wrapQueryData(q));
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
      const q = Query.atPath(path('docs')).addFilter(filter('prop', '<', 42));
      const result = s.toTarget(wrapQueryData(q));
      const expected = {
        query: {
          parent: 'projects/p/databases/d',
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
        .addFilter(filter('null', '==', null));
      const result = s.toTarget(wrapQueryData(q));
      const expected = {
        query: {
          parent: 'projects/p/databases/d',
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
      const q = Query.atPath(path('rooms/1/messages/10/attachments')).addFilter(
        filter('prop', '<', 42)
      );
      const result = s.toTarget(wrapQueryData(q));
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
      const q = Query.atPath(path('docs')).addOrderBy(orderBy('prop', 'asc'));
      const result = s.toTarget(wrapQueryData(q));
      const expected = {
        query: {
          parent: 'projects/p/databases/d',
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
      const q = Query.atPath(path('docs')).withLimit(26);
      const result = s.toTarget(wrapQueryData(q));
      const expected = {
        query: {
          parent: 'projects/p/databases/d',
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
            [[DOCUMENT_KEY_NAME, ref('p/d', 'foo/bar'), 'asc']],
            /*before=*/ true
          )
        )
        .withEndAt(
          bound(
            [[DOCUMENT_KEY_NAME, ref('p/d', 'foo/bar'), 'asc']],
            /*before=*/ false
          )
        );
      const result = s.toTarget(wrapQueryData(q));
      const expected = {
        query: {
          parent: 'projects/p/databases/d',
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
                { referenceValue: 'projects/p/databases/d/documents/foo/bar' }
              ],
              before: true
            },
            endAt: {
              values: [
                { referenceValue: 'projects/p/databases/d/documents/foo/bar' }
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
      const q = Query.atPath(path('docs'));
      const result = s.toTarget(
        new QueryData(
          q,
          1,
          QueryPurpose.Listen,
          SnapshotVersion.MIN,
          new Uint8Array([1, 2, 3])
        )
      );
      const expected = {
        query: {
          parent: 'projects/p/databases/d',
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

    it('contains all RelationOps', () => {
      // tslint:disable-next-line:no-any giant hack
      obj.forEach(RelationOp as any, (name, op) => {
        if (op instanceof RelationOp) {
          expect(s.toOperatorName(op), 'for name').to.exist;
          expect(s.fromOperatorName(s.toOperatorName(op))).to.deep.equal(op);
        }
      });
    });
  });

  describe('to/from Direction', () => {
    addEqualityMatcher();

    it('contains all Directions', () => {
      // tslint:disable-next-line:no-any giant hack
      obj.forEach(Direction as any, (name, dir) => {
        if (dir instanceof Direction) {
          expect(s.toDirection(dir), 'for ' + name).to.exist;
          expect(s.fromDirection(s.toDirection(dir))).to.deep.equal(dir);
        }
      });
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
        'token',
        new FirestoreError(Code.CANCELLED, 'message')
      );
      const actual = s.fromWatchChange({
        targetChange: {
          targetChangeType: 'REMOVE',
          targetIds: [1, 4],
          resumeToken: 'token',
          cause: { code: 1, message: 'message' }
        }
      });
      expect(actual).to.deep.equal(expected);
    });

    it('converts target change with no_change', () => {
      const expected = new WatchTargetChange(WatchTargetChangeState.NoChange, [
        1,
        4
      ]);
      const actual = s.fromWatchChange({
        targetChange: {
          targetChangeType: 'NO_CHANGE',
          targetIds: [1, 4]
        }
      });
      expect(actual).to.deep.equal(expected);
    });

    it('converts target change with no_change (omitted in JSON)', () => {
      const expected = new WatchTargetChange(WatchTargetChangeState.NoChange, [
        1,
        4
      ]);
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
        'resume',
        new FirestoreError(Code.CANCELLED, 'message')
      );
      const actual = s.fromWatchChange({
        targetChange: {
          targetChangeType: 'REMOVE',
          targetIds: [1, 4],
          resumeToken: 'resume',
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
            fields: s.toFields(wrapObject({ foo: 'bar' })),
            updateTime: s.toVersion(SnapshotVersion.fromMicroseconds(5))
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
            fields: s.toFields(wrapObject({ foo: 'bar' })),
            updateTime: s.toVersion(SnapshotVersion.fromMicroseconds(5))
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
          readTime: s.toVersion(SnapshotVersion.fromMicroseconds(5)),
          removedTargetIds: [1, 2]
        }
      });
      expect(actual).to.deep.equal(expected);
    });

    it('converts document removes', () => {
      const expected = new DocumentWatchChange([], [1, 2], key('coll/1'), null);
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
