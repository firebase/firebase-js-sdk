/**
 * @license
 * Copyright 2023 Google LLC
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

// To execute this script run the following command in the parent directory:
// yarn build:scripts && node scripts/build/firestore/scripts/bloom_filter_watch_test/main.js

import { parseArgs } from './arg_parser';
import { runTest } from './run_test';

import {setLogLevel,} from '../../src';
import { newTestFirestore } from "../../test/util/api_helpers";

// Import the following modules despite not using them. This forces them to get
// transpiled by tsc. Without these imports they do not get transpiled because
// they are imported dynamically, causing in MODULE_NOT_FOUND errors at runtime.
import * as node_dom from '../../src/platform/node/dom';
import * as node_base64 from '../../src/platform/node/base64';
import * as node_connection from '../../src/platform/node/connection';
import * as node_format_json from '../../src/platform/node/format_json';
import * as node_random_bytes from '../../src/platform/node/random_bytes';

async function main(): Promise<void> {
  const parsedArgs = parseArgs();

  if (parsedArgs.debugLoggingEnabled) {
    setLogLevel("debug");
  }

  const db = newTestFirestore(parsedArgs.projectId);
  db._setSettings({
    host: parsedArgs.host,
    ssl: parsedArgs.ssl
  });

  await runTest({
      db,
      projectId: parsedArgs.projectId,
      host: {
        hostName: parsedArgs.host,
        ssl: parsedArgs.ssl
      },
      documentCreateCount: parsedArgs.documentCreateCount,
      documentDeleteCount: parsedArgs.documentDeleteCount,
      collectionId: parsedArgs.collectionId,
      log: console.log
    }
  );
}

main();
