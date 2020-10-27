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
 * Helper to generate Firestore Bundle files for integration testing.
 */

import * as yargs from 'yargs';
import * as firestore from '@firebase/firestore-types';

import { TestBundleBuilder } from '../test/unit/util/bundle_data';
import { DatabaseId } from '../src/core/database_info';
import { key } from '../test/util/helpers';
import { collectionReference } from '../test/util/api_helpers';
import {ALT_EMULATOR_PROJECT_ID, DEFAULT_EMULATOR_PROJECT_ID} from '../test/integration/util/emulator_settings';
const PROJECT_CONFIG = require('../../../config/project.json');

/**
 * Returns a bundle builder for the given projectId. The builder will build with the
 * same documents and queries, but with the given projectId.
 */
function bundleWithTestDocsAndQueries(projectId: string): TestBundleBuilder {
  const testDocs: { [key: string]: firestore.DocumentData } = {
    a: { k: { stringValue: 'a' }, bar: { integerValue: 1 } },
    b: { k: { stringValue: 'b' }, bar: { integerValue: 2 } }
  };

  const docA = key('coll-1/a');
  const docB = key('coll-1/b');
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

  builder.addDocumentMetadata(docA, { seconds: 1000, nanos: 9999 }, true);
  builder.addDocument(
    docA,
    { seconds: 1, nanos: 9 },
    { seconds: 1, nanos: 9 },
    testDocs.a
  );
  builder.addDocumentMetadata(docB, { seconds: 1000, nanos: 9999 }, true);
  builder.addDocument(
    docB,
    { seconds: 1, nanos: 9 },
    { seconds: 1, nanos: 9 },
    testDocs.b
  );

  return builder;
}

const PROJECT_IDS = [
  ALT_EMULATOR_PROJECT_ID,
  DEFAULT_EMULATOR_PROJECT_ID,
  PROJECT_CONFIG.projectId
];

const argv = yargs.options({
  projectIds: {
    array: true,
    type: 'string',
    demandOption: false,
    desc: 'Project IDs to use to generate testing bundle files. ' +
          'A set of default project IDs will be used if not specified.'
  },
}).argv;

function generate(ids: string[] | undefined):void {
  // If ids are given, assume they are project IDs used to generate bundles,
  // otherwise generate using default project ids used by integration tests.
  const projectIds = ids ?? PROJECT_IDS;

  const result: { [k: string]: string } = {};
  for (const projecId of projectIds) {
    result[projecId] = bundleWithTestDocsAndQueries(
      projecId
    ).build('test-bundle', { seconds: 1001, nanos: 9999 });
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result));
  process.exit();
}

generate(argv.projectIds);
