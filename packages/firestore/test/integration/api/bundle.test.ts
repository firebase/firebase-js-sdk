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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';

import { EventsAccumulator } from '../util/events_accumulator';
import * as firebaseExport from '../util/firebase_export';
import {
  apiDescribe,
  toDataArray,
  withAlternateTestDb,
  withTestDb
} from '../util/helpers';

const Blob = firebaseExport.Blob;
const GeoPoint = firebaseExport.GeoPoint;
const Timestamp = firebaseExport.Timestamp;

export const encoder = new TextEncoder();

function verifySuccessProgress(p: firestore.LoadBundleTaskProgress): void {
  expect(p.taskState).to.equal('Success');
  expect(p.bytesLoaded).to.be.equal(p.totalBytes);
  expect(p.documentsLoaded).to.equal(p.totalDocuments);
}

function verifyInProgress(
  p: firestore.LoadBundleTaskProgress,
  expectedDocuments: number
): void {
  expect(p.taskState).to.equal('Running');
  expect(p.bytesLoaded <= p.totalBytes).to.be.true;
  expect(p.documentsLoaded <= p.totalDocuments).to.be.true;
  expect(p.documentsLoaded).to.equal(expectedDocuments);
}

/**
 * Returns a valid bundle string from replacing project id in `BUNDLE_TEMPLATE` with the given
 * db project id (also recalculate length prefixes).
 */
function bundleString(
  db: firestore.FirebaseFirestore,
  template: string[]
): string {
  const projectId: string = db.app.options.projectId;

  // Extract elements from BUNDLE_TEMPLATE and replace the project ID.
  const elements = template.map(e => e.replace(/\{0\}/g, projectId));

  // Recalculating length prefixes for elements that are not BundleMetadata.
  let bundleContent = '';
  for (const element of elements.slice(1)) {
    const length = encoder.encode(element).byteLength;
    bundleContent += `${length}${element}`;
  }

  // Update BundleMetadata with new totalBytes.
  const totalBytes = encoder.encode(bundleContent).byteLength.toString();
  const metadata = JSON.parse(elements[0]);
  metadata.metadata.totalBytes = totalBytes;
  const metadataContent = JSON.stringify(metadata);
  const metadataLength = encoder.encode(metadataContent).byteLength;
  return `${metadataLength}${metadataContent}${bundleContent}`;
}

apiDescribe('Bundles', (persistence: boolean) => {
  // This template is generated from bundleWithTestDocsAndQueries in '../util/internal_helpsers.ts',
  // and manually copied here.
  const BUNDLE_TEMPLATE = [
    '{"metadata":{"id":"test-bundle","createTime":{"seconds":1001,"nanos":9999},"version":1,"totalDocuments":2,"totalBytes":"1503"}}',
    '{"namedQuery":{"name":"limit","readTime":{"seconds":"1000","nanos":9999},"bundledQuery":{"parent":"projects/{0}/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"coll-1"}],"orderBy":[{"field":{"fieldPath":"bar"},"direction":"DESCENDING"},{"field":{"fieldPath":"__name__"},"direction":"DESCENDING"}],"limit":{"value":1}},"limitType":"FIRST"}}}',
    '{"namedQuery":{"name":"limit-to-last","readTime":{"seconds":1000,"nanos":9999},"bundledQuery":{"parent":"projects/{0}/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"coll-1"}],"orderBy":[{"field":{"fieldPath":"bar"},"direction":"DESCENDING"},{"field":{"fieldPath":"__name__"},"direction":"DESCENDING"}],"limit":{"value":1}},"limitType":"LAST"}}}',
    '{"documentMetadata":{"name":"projects/{0}/databases/(default)/documents/coll-1/a","readTime":{"seconds":"1000","nanos":9999},"exists":true}}',
    '{"document":{"name":"projects/{0}/databases/(default)/documents/coll-1/a","createTime":{"seconds":1,"nanos":9},"updateTime":{"seconds":"1","nanos":9},"fields":{"k":{"stringValue":"a"},"bar":{"integerValue":1}}}}',
    '{"documentMetadata":{"name":"projects/{0}/databases/(default)/documents/coll-1/b","readTime":{"seconds":1000,"nanos":9999},"exists":true}}',
    '{"document":{"name":"projects/{0}/databases/(default)/documents/coll-1/b","createTime":{"seconds":"1","nanos":9},"updateTime":{"seconds":1,"nanos":9},"fields":{"k":{"stringValue":"b"},"bar":{"integerValue":2}}}}'
  ];

  function verifySnapEqualsTestDocs(snap: firestore.QuerySnapshot): void {
    expect(toDataArray(snap)).to.deep.equal([
      { k: 'a', bar: 1 },
      { k: 'b', bar: 2 }
    ]);
  }

  it('load with documents only with on progress and promise interface', () => {
    return withTestDb(persistence, async db => {
      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      let completeCalled = false;
      const task: firestore.LoadBundleTask = db.loadBundle(
        bundleString(db, BUNDLE_TEMPLATE)
      );
      task.onProgress(
        progress => {
          progressEvents.push(progress);
        },
        undefined,
        () => {
          completeCalled = true;
        }
      );
      await task;
      let fulfillProgress: firestore.LoadBundleTaskProgress;
      await task.then(progress => {
        fulfillProgress = progress;
      });

      expect(completeCalled).to.be.true;
      expect(progressEvents.length).to.equal(4);
      verifyInProgress(progressEvents[0], 0);
      verifyInProgress(progressEvents[1], 1);
      verifyInProgress(progressEvents[2], 2);
      verifySuccessProgress(progressEvents[3]);
      expect(fulfillProgress!).to.deep.equal(progressEvents[3]);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      let snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualsTestDocs(snap);

      snap = await (await db.namedQuery('limit'))!.get({
        source: 'cache'
      });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'b', bar: 2 }]);

      snap = await (await db.namedQuery('limit-to-last'))!.get({
        source: 'cache'
      });
      expect(toDataArray(snap)).to.deep.equal([{ k: 'a', bar: 1 }]);
    });
  });

  it('load with documents and queries with promise interface', () => {
    return withTestDb(persistence, async db => {
      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
        bundleString(db, BUNDLE_TEMPLATE)
      );

      verifySuccessProgress(fulfillProgress!);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      const snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualsTestDocs(snap);
    });
  });

  it('load for a second time skips', () => {
    return withTestDb(persistence, async db => {
      await db.loadBundle(bundleString(db, BUNDLE_TEMPLATE));

      let completeCalled = false;
      const progressEvents: firestore.LoadBundleTaskProgress[] = [];
      const task: firestore.LoadBundleTask = db.loadBundle(
        encoder.encode(bundleString(db, BUNDLE_TEMPLATE))
      );
      task.onProgress(
        progress => {
          progressEvents.push(progress);
        },
        error => {},
        () => {
          completeCalled = true;
        }
      );
      await task;

      expect(completeCalled).to.be.true;
      // No loading actually happened in the second `loadBundle` call only the
      // success progress is recorded.
      expect(progressEvents.length).to.equal(1);
      verifySuccessProgress(progressEvents[0]);

      // Read from cache. These documents do not exist in backend, so they can
      // only be read from cache.
      const snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualsTestDocs(snap);
    });
  });

  it('load with documents already pulled from backend', () => {
    return withTestDb(persistence, async db => {
      await db.doc('coll-1/a').set({ k: 'a', bar: 0 });
      await db.doc('coll-1/b').set({ k: 'b', bar: 0 });

      const accumulator = new EventsAccumulator<firestore.QuerySnapshot>();
      db.collection('coll-1').onSnapshot(accumulator.storeEvent);
      await accumulator.awaitEvent();

      const progress = await db.loadBundle(
        // Testing passing in non-string bundles.
        encoder.encode(bundleString(db, BUNDLE_TEMPLATE))
      );

      verifySuccessProgress(progress);
      // The test bundle is holding ancient documents, so no events are
      // generated as a result. The case where a bundle has newer doc than
      // cache can only be tested in spec tests.
      await accumulator.assertNoAdditionalEvents();

      let snap = await (await db.namedQuery('limit'))!.get();
      expect(toDataArray(snap)).to.deep.equal([{ k: 'b', bar: 0 }]);

      snap = await (await db.namedQuery('limit-to-last'))!.get();
      expect(toDataArray(snap)).to.deep.equal([{ k: 'a', bar: 0 }]);
    });
  });

  it('loaded documents should not be GC-ed right away', () => {
    return withTestDb(persistence, async db => {
      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
        bundleString(db, BUNDLE_TEMPLATE)
      );

      verifySuccessProgress(fulfillProgress!);

      // Read a different collection, this will trigger GC.
      let snap = await db.collection('coll-other').get();
      expect(snap.empty).to.be.true;

      // Read the loaded documents, expecting document in cache. With memory
      // GC, the documents would get GC-ed if we did not hold the document keys
      // in a "umbrella" target. See local_store.ts for details.
      snap = await db.collection('coll-1').get({ source: 'cache' });
      verifySnapEqualsTestDocs(snap);
    });
  });

  it('load with documents from other projects fails', () => {
    return withTestDb(persistence, async db => {
      return withAlternateTestDb(persistence, async otherDb => {
        await expect(
          otherDb.loadBundle(bundleString(db, BUNDLE_TEMPLATE))
        ).to.be.rejectedWith('Tried to deserialize key from different project');

        // Verify otherDb still functions, despite loaded a problematic bundle.
        const finalProgress = await otherDb.loadBundle(
          bundleString(otherDb, BUNDLE_TEMPLATE)
        );
        verifySuccessProgress(finalProgress);

        // Read from cache. These documents do not exist in backend, so they can
        // only be read from cache.
        const snap = await otherDb
          .collection('coll-1')
          .get({ source: 'cache' });
        verifySnapEqualsTestDocs(snap);
      });
    });
  });
});

// TODO(b/178418242): Move this to `api_internal` and generate testing bundle programmatically
// instead of having hard coded bundle strings.
apiDescribe('Bundles conformance', (persistence: boolean) => {
  const CONFORMANCE_DOC = {
    stringValue: 'a',
    trueValue: true,
    falseValue: false,
    integerValue: 10,
    largeIntegerValue: 1234567890000,
    doubleValue: 0.1,
    infinityValue: Infinity,
    negativeInfinityValue: -Infinity,
    objectValue: { foo: 'bar', '😀': '😜' },
    emptyObject: {},
    dateValue: new Timestamp(479978400, 123000000),
    zeroDateValue: new Timestamp(0, 0),
    arrayValue: ['foo', 42, 'bar'],
    emptyArray: [],
    nilValue: null,
    geoPointValue: new GeoPoint(50.1430847, -122.947778),
    zeroGeoPointValue: new GeoPoint(0, 0),
    bytesValue: Blob.fromUint8Array(new Uint8Array([0x01, 0x02]))
  };

  // This is built by Node(protobuf.js) from above document with some mixing of int64 numbers
  // represented as both number and string, and one additional field of `pathValue: db.doc('col1/ref1')`.
  const BUNDLES_PROTOBUFJS_CONFORMANCE_TEMPLATE = [
    '{"metadata":{"id":"test-bundle","createTime":{"seconds":"1611502887","nanos":707859000},"version":1,"totalDocuments":1,"totalBytes":"1405"}}',
    '{"documentMetadata":{"name":"projects/{0}/databases/(default)/documents/bundles/conformance-doc","readTime":{"seconds":"1611502887","nanos":707859000},"exists":true}}',
    '{"document":{"name":"projects/{0}/databases/(default)/documents/bundles/conformance-doc","fields":{"largeIntegerValue":{"integerValue":"1234567890000"},"bytesValue":{"bytesValue":"AQI="},"trueValue":{"booleanValue":true},"integerValue":{"integerValue":"10"},"zeroDateValue":{"timestampValue":{"seconds":"0","nanos":0}},"doubleValue":{"doubleValue":0.1},"geoPointValue":{"geoPointValue":{"latitude":50.1430847,"longitude":-122.947778}},"objectValue":{"mapValue":{"fields":{"😀":{"stringValue":"😜"},"foo":{"stringValue":"bar"}}}},"zeroGeoPointValue":{"geoPointValue":{"latitude":0,"longitude":0}},"emptyArray":{"arrayValue":{}},"nilValue":{"nullValue":"NULL_VALUE"},"emptyObject":{"mapValue":{}},"infinityValue":{"doubleValue":"Infinity"},"dateValue":{"timestampValue":{"seconds":"479978400","nanos":123000000}},"falseValue":{"booleanValue":false},"pathValue":{"referenceValue":"projects/{0}/databases/(default)/documents/col1/ref1"},"stringValue":{"stringValue":"a"},"negativeInfinityValue":{"doubleValue":"-Infinity"},"arrayValue":{"arrayValue":{"values":[{"stringValue":"foo"},{"integerValue":"42"},{"stringValue":"bar"}]}}},"createTime":{"seconds":"1611502887"},"updateTime":{"seconds":"1611502887"}}}'
  ];

  // This is built by Java(proto3 json formatter) with above document and one additional field of `pathValue: db.doc('col1/ref1')`.
  const BUNDLES_PROTOB3_CONFORMANCE_TEMPLATE = [
    `{
  "metadata": {
    "id": "test-bundle",
    "createTime": "2021-01-24T20:03:40.608348Z",
    "version": 1,
    "totalDocuments": 1,
    "totalBytes": "2164"
  }
}`,
    `{
  "documentMetadata": {
    "name": "projects/{0}/databases/(default)/documents/bundles/conformance-doc",
    "readTime": "2021-01-24T20:03:40.608348Z",
    "exists": true
  }
}`,
    `{
  "document": {
    "name": "projects/{0}/databases/(default)/documents/bundles/conformance-doc",
    "fields": {
      "integerValue": {
        "integerValue": "10"
      },
      "pathValue": {
        "referenceValue": "projects/{0}/databases/(default)/documents/col1/ref1"
      },
      "geoPointValue": {
        "geoPointValue": {
          "latitude": 50.1430847,
          "longitude": -122.947778
        }
      },
      "falseValue": {
        "booleanValue": false
      },
      "emptyObject": {
        "mapValue": {
        }
      },
      "doubleValue": {
        "doubleValue": 0.1
      },
      "emptyArray": {
        "arrayValue": {
        }
      },
      "zeroGeoPointValue": {
        "geoPointValue": {
        }
      },
      "stringValue": {
        "stringValue": "a"
      },
      "trueValue": {
        "booleanValue": true
      },
      "nilValue": {
        "nullValue": null
      },
      "dateValue": {
        "timestampValue": "1985-03-18T07:20:00.123Z"
      },
      "arrayValue": {
        "arrayValue": {
          "values": [{
            "stringValue": "foo"
          }, {
            "integerValue": "42"
          }, {
            "stringValue": "bar"
          }]
        }
      },
      "bytesValue": {
        "bytesValue": "AQI="
      },
      "objectValue": {
        "mapValue": {
          "fields": {
            "foo": {
              "stringValue": "bar"
            },
            "😀": {
              "stringValue": "😜"
            }
          }
        }
      },
      "infinityValue": {
        "doubleValue": "Infinity"
      },
      "zeroDateValue": {
        "timestampValue": "1970-01-01T00:00:00Z"
      },
      "negativeInfinityValue": {
        "doubleValue": "-Infinity"
      },
      "largeIntegerValue": {
        "integerValue": "1234567890000"
      }
    },
    "createTime": "2021-01-24T15:41:27.634116Z",
    "updateTime": "2021-01-24T15:41:27.634116Z"
  }
}`
  ];

  it('loads bundle built by protobuf.js as expected', () => {
    return withTestDb(persistence, async db => {
      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
        bundleString(db, BUNDLES_PROTOBUFJS_CONFORMANCE_TEMPLATE)
      );

      verifySuccessProgress(fulfillProgress!);

      const snap = (
        await db.doc('bundles/conformance-doc').get({ source: 'cache' })
      ).data()!;

      expect(snap.pathValue.path).to.equal(db.doc('col1/ref1').path);
      delete snap.pathValue;
      expect(snap).to.deep.equal(CONFORMANCE_DOC);
    });
  });

  it('loads bundle built by proto3 json output as expected', () => {
    return withTestDb(persistence, async db => {
      const fulfillProgress: firestore.LoadBundleTaskProgress = await db.loadBundle(
        bundleString(db, BUNDLES_PROTOB3_CONFORMANCE_TEMPLATE)
      );

      verifySuccessProgress(fulfillProgress!);

      const snap = (
        await db.doc('bundles/conformance-doc').get({ source: 'cache' })
      ).data()!;

      expect(snap.pathValue.path).to.equal(db.doc('col1/ref1').path);
      delete snap.pathValue;
      expect(snap).to.deep.equal(CONFORMANCE_DOC);
    });
  });
});
