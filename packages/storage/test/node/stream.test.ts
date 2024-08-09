/**
 * @license
 * Copyright 2021 Google LLC
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
import { createApp, createStorage } from '../integration/integration.test';
import { FirebaseApp, deleteApp } from '@firebase/app';
import { getStream, ref, uploadBytes } from '../../src/index.node';
import * as types from '../../src/public-types';
import { ReadableStream } from 'stream/web';

// See: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader
async function readData(readableStream: ReadableStream): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader: ReadableStreamDefaultReader = readableStream.getReader();
    const result: any[] = [];
    reader
      .read()
      .then(function processBytes({ done, value }): any {
        if (done) {
          resolve(new Uint8Array(result));
          return;
        }

        result.push(...value);
        return reader.read().then(processBytes);
      })
      .catch(err => {
        console.error(err);
        reject(err);
        return;
      });
  });
}

describe('Firebase Storage > getStream', () => {
  let app: FirebaseApp;
  let storage: types.FirebaseStorage;

  beforeEach(async () => {
    app = await createApp();
    storage = createStorage(app);
  });

  afterEach(async () => {
    await deleteApp(app);
  });

  it('can get stream', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    await uploadBytes(reference, new Uint8Array([0, 1, 3, 128, 255]));
    const stream = getStream(reference);
    const data = await readData(stream);
    expect(data).to.deep.equal(new Uint8Array([0, 1, 3, 128, 255]));
  });

  it('can get first n bytes of stream', async () => {
    const reference = ref(storage, 'public/exp-bytes');
    await uploadBytes(reference, new Uint8Array([0, 1, 3]));
    const stream = getStream(reference, 2);
    const data = await readData(stream);
    expect(data).to.deep.equal(new Uint8Array([0, 1]));
  });

  it('getStream() throws for missing file', async () => {
    const reference = ref(storage, 'public/exp-bytes-missing');
    const stream = getStream(reference);
    try {
      await readData(stream);
      expect.fail();
    } catch (e) {
      expect((e as Error)?.message).to.satisfy((v: string) =>
        v.match(/Object 'public\/exp-bytes-missing' does not exist/)
      );
    }
  });
});
