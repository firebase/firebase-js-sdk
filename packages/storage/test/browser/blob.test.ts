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

import { assert, expect } from 'chai';
import * as sinon from 'sinon';
// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseApp, deleteApp } from '@firebase/app';

import { FbsBlob } from '../../src/implementation/blob';
import * as type from '../../src/implementation/type';
import * as testShared from '../unit/testshared';
import { createApp, createStorage } from '../integration/integration.test';
import { getBlob, ref, uploadBytes } from '../../src';
import * as types from '../../src/public-types';

describe('Firebase Storage > Blob', () => {
  let app: FirebaseApp;
  let storage: types.FirebaseStorage;

  beforeEach(async () => {
    app = await createApp();
    storage = createStorage(app);
  });

  afterEach(async () => {
    await deleteApp(app);
  });

  let stubs: sinon.SinonStub[] = [];
  before(() => {
    const definedStub = sinon.stub(type, 'isNativeBlobDefined');
    definedStub.returns(false);
    stubs.push(definedStub);

    const blobStub = sinon.stub(window, 'Blob');
    blobStub.throws(Error("I don't exist"));
    stubs.push(blobStub);
  });
  after(() => {
    stubs.forEach(stub => {
      stub.restore();
    });
    stubs = [];
  });

  it('Slicing works', () => {
    const blob = new FbsBlob(new Uint8Array([1, 2, 3, 4, 5, 6, 7]));
    const sliced = blob.slice(1, 5)!;
    testShared.assertUint8ArrayEquals(
      sliced.uploadData() as Uint8Array,
      new Uint8Array([2, 3, 4, 5])
    );
  });

  it('Blobs are merged with strings correctly', () => {
    const blob = new FbsBlob(new Uint8Array([1, 2, 3, 4]));
    const merged = FbsBlob.getBlob('what', blob, '\ud83d\ude0a ')!;
    testShared.assertUint8ArrayEquals(
      merged.uploadData() as Uint8Array,
      new Uint8Array([
        0x77, 0x68, 0x61, 0x74, 0x1, 0x2, 0x3, 0x4, 0xf0, 0x9f, 0x98, 0x8a, 0x20
      ])
    );
  });

  it('Respects windowed views of ArrayBuffers when merging', () => {
    const buf = new ArrayBuffer(100);
    const arr1 = new Uint8Array(buf, 0, 10);
    const arr2 = new Uint8Array(buf, 10, 10);

    const blob1 = new FbsBlob(arr1, true);
    const blob2 = new FbsBlob(arr2, true);

    const concatenated = FbsBlob.getBlob(blob1, blob2)!;

    assert.equal(20, concatenated!.size());
  });

  it('can get blob', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    await uploadBytes(reference, new Uint8Array([0, 1, 3, 128, 255]));
    const blob = await getBlob(reference);
    const bytes = await blob.arrayBuffer();
    expect(new Uint8Array(bytes)).to.deep.equal(
      new Uint8Array([0, 1, 3, 128, 255])
    );
  });

  it('can get the first n-bytes of a blob', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    await uploadBytes(reference, new Uint8Array([0, 1, 5]));
    const blob = await getBlob(reference, 2);
    const bytes = await blob.arrayBuffer();
    expect(new Uint8Array(bytes)).to.deep.equal(new Uint8Array([0, 1]));
  });

  it('getBlob() throws for missing file', async () => {
    const reference = ref(storage, 'public/exp-bytes-missing');
    try {
      await getBlob(reference);
      expect.fail();
    } catch (e) {
      expect(e.message).to.satisfy((v: string) =>
        v.match(/Object 'public\/exp-bytes-missing' does not exist/)
      );
    }
  });
});
