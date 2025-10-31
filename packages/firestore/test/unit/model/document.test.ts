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

import {
  BsonBinaryData,
  BsonObjectId,
  BsonTimestamp,
  Decimal128Value,
  Int32Value,
  MaxKey,
  MinKey,
  RegexValue
} from '../../../src';
import {
  doc,
  expectEqual,
  expectNotEqual,
  field,
  wrap
} from '../../util/helpers';

describe('Document', () => {
  it('can be constructed', () => {
    const data = {
      desc: 'Discuss all the project related stuff',
      owner: 'Jonny'
    };
    const document = doc('rooms/Eros', 1, data);

    const value = document.data;
    expect(value.value).to.deep.equal(
      wrap({
        desc: 'Discuss all the project related stuff',
        owner: 'Jonny'
      })
    );
    expect(value).not.to.equal(data);
    expect(document.hasLocalMutations).to.equal(false);
  });

  it('can be constructed with bson types', () => {
    const data = {
      objectId: new BsonObjectId('foo'),
      binary: new BsonBinaryData(1, new Uint8Array([1, 2, 3])),
      timestamp: new BsonTimestamp(1, 2),
      min: MinKey.instance(),
      max: MaxKey.instance(),
      regex: new RegexValue('a', 'b'),
      int32: new Int32Value(1),
      decimal128: new Decimal128Value('1.2e3')
    };
    const document = doc('rooms/Eros', 1, data);

    const value = document.data;
    expect(value.value).to.deep.equal(
      wrap({
        objectId: new BsonObjectId('foo'),
        binary: new BsonBinaryData(1, new Uint8Array([1, 2, 3])),
        timestamp: new BsonTimestamp(1, 2),
        min: MinKey.instance(),
        max: MaxKey.instance(),
        regex: new RegexValue('a', 'b'),
        int32: new Int32Value(1),
        decimal128: new Decimal128Value('1.2e3')
      })
    );
    expect(value).not.to.equal(data);
    expect(document.hasLocalMutations).to.equal(false);
  });

  it('returns fields correctly', () => {
    const data = {
      desc: 'Discuss all the project related stuff',
      owner: { name: 'Jonny', title: 'scallywag' }
    };
    const document = doc('rooms/Eros', 1, data).setHasLocalMutations();

    expect(document.data.field(field('desc'))).to.deep.equal(
      wrap('Discuss all the project related stuff')
    );
    expect(document.data.field(field('owner.title'))).to.deep.equal(
      wrap('scallywag')
    );
    expect(document.hasLocalMutations).to.equal(true);
  });

  it('equals to other same documents', () => {
    expect(doc('a/b', 0, {}).isEqual(null)).to.equal(false);

    expectEqual(doc('a/b', 3, { foo: 'bar' }), doc('a/b', 3, { foo: 'bar' }));
    expectEqual(doc('a/b', 1, { foo: NaN }), doc('a/b', 1, { foo: NaN }));

    expectNotEqual(
      doc('a/b', 1, { foo: 'bar' }),
      doc('a/0', 1, { foo: 'bar' })
    );
    expectNotEqual(
      doc('a/b', 1, { foo: 'bar' }),
      doc('a/b', 2, { foo: 'bar' })
    );
    expectNotEqual(doc('a/b', 1, { foo: 'bar' }), doc('a/b', 1, { foo: 100 }));
    expectNotEqual(
      doc('a/b', 1, { foo: 'bar' }).setHasLocalMutations(),
      doc('a/b', 1, { foo: 'bar' })
    );
  });
});
