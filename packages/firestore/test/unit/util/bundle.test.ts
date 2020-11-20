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
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {
  BundleReader,
  SizedBundleElement
} from '../../../src/util/bundle_reader';
import { toByteStreamReader } from '../../../src/platform/byte_stream_reader';
import {
  doc1String,
  doc1MetaString,
  doc1Meta,
  noDocMetaString,
  noDocMeta,
  doc2MetaString,
  doc2Meta,
  limitQueryString,
  limitQuery,
  limitToLastQuery,
  limitToLastQueryString,
  meta,
  metaString,
  doc2String,
  doc1,
  doc2
} from './bundle_data';
import { newTextEncoder } from '../../../src/platform/serializer';
import { JSON_SERIALIZER } from '../local/persistence_test_helpers';

use(chaiAsPromised);

const encoder = newTextEncoder();

/**
 * Create a `ReadableStream` from a string.
 *
  * @param content: Bundle in string.
  * @param bytesPerRead: How many bytes to read from the underlying buffer from
 * each read through the stream.
 */
export function byteStreamReaderFromString(
  content: string,
  bytesPerRead: number
): ReadableStreamReader<Uint8Array> {
  const data = encoder.encode(content);
  return toByteStreamReader(data, bytesPerRead);
}

// Testing readableStreamFromString() is working as expected.
describe('byteStreamReaderFromString()', () => {
  it('returns a reader stepping readable stream', async () => {
    const r = byteStreamReaderFromString('0123456789', 4);

    let result = await r.read();
    expect(result.value).to.deep.equal(encoder.encode('0123'));
    expect(result.done).to.be.false;

    result = await r.read();
    expect(result.value).to.deep.equal(encoder.encode('4567'));
    expect(result.done).to.be.false;

    result = await r.read();
    expect(result.value).to.deep.equal(encoder.encode('89'));
    expect(result.done).to.be.false;

    result = await r.read();
    expect(result.value).to.be.undefined;
    expect(result.done).to.be.true;
  });
});

describe('Bundle ', () => {
  genericBundleReadingTests(1);
  genericBundleReadingTests(4);
  genericBundleReadingTests(64);
  genericBundleReadingTests(1024);
});

function genericBundleReadingTests(bytesPerRead: number): void {
  function bundleFromString(s: string): BundleReader {
    return new BundleReader(
      byteStreamReaderFromString(s, bytesPerRead),
      JSON_SERIALIZER
    );
  }

  async function getAllElements(
    bundle: BundleReader
  ): Promise<SizedBundleElement[]> {
    const result: SizedBundleElement[] = [];
    while (true) {
      const sizedElement = await bundle.nextElement();
      if (sizedElement === null) {
        break;
      }
      if (!sizedElement.isBundleMetadata()) {
        result.push(sizedElement);
      }
    }

    return Promise.resolve(result);
  }

  function verifySizedElement(
    element: SizedBundleElement,
    payload: unknown,
    payloadString: string
  ): void {
    expect(element.payload).to.deep.equal(payload);
    expect(element.byteLength).to.equal(
      encoder.encode(payloadString).byteLength
    );
  }

  async function generateBundleAndParse(
    bundleString: string,
    bytesPerRead: number,
    validMeta = false
  ): Promise<void> {
    const bundle = bundleFromString(bundleString);

    if (!validMeta) {
      await expect(await bundle.getMetadata()).should.be.rejected;
    } else {
      expect(await bundle.getMetadata()).to.deep.equal(meta.metadata);
    }

    await getAllElements(bundle);
  }

  it('reads with query and doc with bytesPerRead ' + bytesPerRead, async () => {
    const bundle = bundleFromString(
      metaString +
        limitQueryString +
        limitToLastQueryString +
        doc1MetaString +
        doc1String
    );

    expect(await bundle.getMetadata()).to.deep.equal(meta.metadata);

    const actual = await getAllElements(bundle);
    expect(actual.length).to.equal(4);
    verifySizedElement(actual[0], limitQuery, limitQueryString);
    verifySizedElement(actual[1], limitToLastQuery, limitToLastQueryString);
    verifySizedElement(actual[2], doc1Meta, doc1MetaString);
    verifySizedElement(actual[3], doc1, doc1String);
  });

  it(
    'reads with unexpected orders with bytesPerRead ' + bytesPerRead,
    async () => {
      const bundle = bundleFromString(
        metaString +
          doc1MetaString +
          doc1String +
          limitQueryString +
          doc2MetaString +
          doc2String
      );

      const actual = await getAllElements(bundle);
      expect(actual.length).to.equal(5);
      verifySizedElement(actual[0], doc1Meta, doc1MetaString);
      verifySizedElement(actual[1], doc1, doc1String);
      verifySizedElement(actual[2], limitQuery, limitQueryString);
      verifySizedElement(actual[3], doc2Meta, doc2MetaString);
      verifySizedElement(actual[4], doc2, doc2String);

      // Reading metadata after other elements should also work.
      expect(await bundle.getMetadata()).to.deep.equal(meta.metadata);
    }
  );

  it(
    'reads without named query with bytesPerRead ' + bytesPerRead,
    async () => {
      const bundle = bundleFromString(metaString + doc1MetaString + doc1String);

      expect(await bundle.getMetadata()).to.deep.equal(meta.metadata);

      const actual = await getAllElements(bundle);
      expect(actual.length).to.equal(2);
      verifySizedElement(actual[0], doc1Meta, doc1MetaString);
      verifySizedElement(actual[1], doc1, doc1String);
    }
  );

  it('reads with deleted doc with bytesPerRead ' + bytesPerRead, async () => {
    const bundle = bundleFromString(
      metaString + noDocMetaString + doc1MetaString + doc1String
    );

    expect(await bundle.getMetadata()).to.deep.equal(meta.metadata);

    const actual = await getAllElements(bundle);
    expect(actual.length).to.equal(3);
    verifySizedElement(actual[0], noDocMeta, noDocMetaString);
    verifySizedElement(actual[1], doc1Meta, doc1MetaString);
    verifySizedElement(actual[2], doc1, doc1String);
  });

  it(
    'reads without documents or query with bytesPerRead ' + bytesPerRead,
    async () => {
      const bundle = bundleFromString(metaString);

      expect(await bundle.getMetadata()).to.deep.equal(meta.metadata);

      const actual = await getAllElements(bundle);
      expect(actual.length).to.equal(0);
    }
  );

  it(
    'throws with ill-formatted bundle with bytesPerRead ' + bytesPerRead,
    async () => {
      await expect(
        generateBundleAndParse('metadata: "no length prefix"', bytesPerRead)
      ).to.be.rejectedWith(
        'Reached the end of bundle when a length string is expected.'
      );

      await expect(
        generateBundleAndParse('{metadata: "no length prefix"}', bytesPerRead)
      ).to.be.rejectedWith('Unexpected end of JSON input');

      await expect(
        generateBundleAndParse(
          metaString + 'invalid-string',
          bytesPerRead,
          true
        )
      ).to.be.rejectedWith(
        'Reached the end of bundle when a length string is expected.'
      );

      await expect(
        generateBundleAndParse('1' + metaString, bytesPerRead)
      ).to.be.rejectedWith('Reached the end of bundle when more is expected.');

      // First element is not BundleMetadata.
      await expect(
        generateBundleAndParse(doc1MetaString + doc1String, bytesPerRead)
      ).to.be.rejectedWith('The first element of the bundle is not a metadata');
    }
  );
}
