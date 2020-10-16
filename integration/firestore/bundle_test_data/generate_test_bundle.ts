/**
 * The main function for this script.
 * @param {array} args The command line arguments.
 */
import * as firestore from '@firebase/firestore-types';
import { TestBundleBuilder } from '@firebase/firestore/test/unit/util/bundle_data';
import { DatabaseId } from '@firebase/firestore/src/core/database_info';
import { key } from '@firebase/firestore/test/util/helpers';
import { collectionReference } from '@firebase/firestore/test/util/api_helpers';

/**
 * Returns a bundle builder for the given projectId. The builder will build with the
 * same documents and queries, but with the given projectId.
 */
function bundleWithTestDocsAndQueries(projectId: string): TestBundleBuilder {
  const testDocs: { [key: string]: firestore.DocumentData } = {
    a: { k: { stringValue: 'a' }, bar: { integerValue: 1 } },
    b: { k: { stringValue: 'b' }, bar: { integerValue: 2 } }
  };

  const a = key('coll-1/a');
  const b = key('coll-1/b');
  const builder = new TestBundleBuilder(new DatabaseId(projectId));

  builder.addNamedQuery(
    'limit',
    { seconds: 1000, nanos: 9999 },
    (collectionReference('coll-1')
      .orderBy('bar', 'desc')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .limit(1) as any)._query
  );
  builder.addNamedQuery(
    'limit-to-last',
    { seconds: 1000, nanos: 9999 },
    (collectionReference('coll-1')
      .orderBy('bar', 'desc')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .limitToLast(1) as any)._query
  );

  builder.addDocumentMetadata(a, { seconds: 1000, nanos: 9999 }, true);
  builder.addDocument(
    a,
    { seconds: 1, nanos: 9 },
    { seconds: 1, nanos: 9 },
    testDocs.a
  );
  builder.addDocumentMetadata(b, { seconds: 1000, nanos: 9999 }, true);
  builder.addDocument(
    b,
    { seconds: 1, nanos: 9 },
    { seconds: 1, nanos: 9 },
    testDocs.b
  );

  return builder;
}

function main(args: string[]) {
  if (args.length < 3) {
    console.log(
      `Usage: node generate_test_bundle.js <project-id-1> <project-id-2> ...`
    );
  }
  const result: { [k: string]: string } = {};
  for (const projecId of args.slice(2)) {
    result[projecId] = bundleWithTestDocsAndQueries(
      projecId
    ).build('test-bundle', { seconds: 1001, nanos: 9999 });
  }
  console.log(JSON.stringify(result));
  process.exit();
}

main(process.argv);
