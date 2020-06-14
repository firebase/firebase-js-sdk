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
import { expect } from 'chai';
import {
  BundleReader,
  SizedBundleElement
} from '../../../src/util/bundle_reader';
import { BundleElement } from '../../../src/protos/firestore_bundle_proto';
import { PlatformSupport } from '../../../src/platform/platform';

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
  const data = new TextEncoder().encode(content);
  return PlatformSupport.getPlatform().toByteStreamReader(data, bytesPerRead);
}

function lengthPrefixedString(o: {}): string {
  const str = JSON.stringify(o);
  const l = new TextEncoder().encode(str).byteLength;
  return `${l}${str}`;
}

// Testing readableStreamFromString() is working as expected.
describe('byteStreamReaderFromString()', () => {
  it('returns a reader stepping readable stream', async () => {
    const encoder = new TextEncoder();
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
    return new BundleReader(byteStreamReaderFromString(s, bytesPerRead));
  }

  const encoder = new TextEncoder();
  // Setting up test data.
  const meta: BundleElement = {
    metadata: {
      id: 'test-bundle',
      createTime: { seconds: 1577836805, nanos: 6 },
      version: 1,
      totalDocuments: 1,
      totalBytes: 416
    }
  };
  const metaString = lengthPrefixedString(meta);

  const doc1Meta: BundleElement = {
    documentMetadata: {
      name:
        'projects/test-project/databases/(default)/documents/collectionId/doc1',
      readTime: { seconds: 5, nanos: 6 },
      exists: true
    }
  };
  const doc1MetaString = lengthPrefixedString(doc1Meta);
  const doc1: BundleElement = {
    document: {
      name:
        'projects/test-project/databases/(default)/documents/collectionId/doc1',
      createTime: { seconds: 1, nanos: 2000000 },
      updateTime: { seconds: 3, nanos: 4000 },
      fields: { foo: { stringValue: 'value' }, bar: { integerValue: -42 } }
    }
  };
  const doc1String = lengthPrefixedString(doc1);

  const doc2Meta: BundleElement = {
    documentMetadata: {
      name:
        'projects/test-project/databases/(default)/documents/collectionId/doc2',
      readTime: { seconds: 5, nanos: 6 },
      exists: true
    }
  };
  const doc2MetaString = lengthPrefixedString(doc2Meta);
  const doc2: BundleElement = {
    document: {
      name:
        'projects/test-project/databases/(default)/documents/collectionId/doc2',
      createTime: { seconds: 1, nanos: 2000000 },
      updateTime: { seconds: 3, nanos: 4000 },
      fields: { foo: { stringValue: 'value1' }, bar: { integerValue: 42 } }
    }
  };
  const doc2String = lengthPrefixedString(doc2);

  const noDocMeta: BundleElement = {
    documentMetadata: {
      name:
        'projects/test-project/databases/(default)/documents/collectionId/nodoc',
      readTime: { seconds: 5, nanos: 6 },
      exists: false
    }
  };
  const noDocMetaString = lengthPrefixedString(noDocMeta);

  const limitQuery: BundleElement = {
    namedQuery: {
      name: 'limitQuery',
      bundledQuery: {
        parent: 'projects/fireeats-97d5e/databases/(default)/documents',
        structuredQuery: {
          from: [{ collectionId: 'node_3.7.5_7Li7XoCjutvNxwD0tpo9' }],
          orderBy: [{ field: { fieldPath: 'sort' }, direction: 'DESCENDING' }],
          limit: { 'value': 1 }
        },
        limitType: 'FIRST'
      },
      readTime: { 'seconds': 1590011379, 'nanos': 191164000 }
    }
  };
  const limitQueryString = lengthPrefixedString(limitQuery);
  const limitToLastQuery: BundleElement = {
    namedQuery: {
      name: 'limitToLastQuery',
      bundledQuery: {
        parent: 'projects/fireeats-97d5e/databases/(default)/documents',
        structuredQuery: {
          from: [{ collectionId: 'node_3.7.5_7Li7XoCjutvNxwD0tpo9' }],
          orderBy: [{ field: { fieldPath: 'sort' }, direction: 'ASCENDING' }],
          limit: { 'value': 1 }
        },
        limitType: 'LAST'
      },
      readTime: { 'seconds': 1590011379, 'nanos': 543063000 }
    }
  };
  const limitToLastQueryString = lengthPrefixedString(limitToLastQuery);

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
