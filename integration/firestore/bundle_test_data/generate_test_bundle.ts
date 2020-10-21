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

/**
 * The main function for this script.
 * @param {array} args The command line arguments.
 */
import * as firestore from '@firebase/firestore-types';
import { TestBundleBuilder } from '@firebase/firestore/test/unit/util/bundle_data';
import { DatabaseId } from '@firebase/firestore/src/core/database_info';
import { key } from '@firebase/firestore/test/util/helpers';
import { collectionReference } from '@firebase/firestore/test/util/api_helpers';
import {
  EMULATOR_PROJECT_ID,
  ALT_PROJECT_ID
} from '@firebase/firestore/test/integration/util/emulator_settings';
const PROJECT_CONFIG = require('../../../../config/project.json');

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

const PROJECT_IDS = [
  ALT_PROJECT_ID,
  EMULATOR_PROJECT_ID,
  PROJECT_CONFIG.projectId
];

function main(args: string[]) {
  // If arguments are given, assume they are project IDs used to generate bundles,
  // otherwise generate using default project ids used by integration tests.
  let projectIds = PROJECT_IDS;
  if (args.length >= 3) {
    projectIds = args.slice(2);
  }
  const result: { [k: string]: string } = {};
  for (const projecId of projectIds) {
    result[projecId] = bundleWithTestDocsAndQueries(
      projecId
    ).build('test-bundle', { seconds: 1001, nanos: 9999 });
  }
  console.log(JSON.stringify(result));
  process.exit();
}

main(process.argv);
