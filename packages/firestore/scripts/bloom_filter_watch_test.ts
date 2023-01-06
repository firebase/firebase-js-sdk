/**
 * @license
 * Copyright 2022 Google LLC
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
// yarn build:scripts && node scripts/bloom_filter_watch_test.js

import { newConnection } from '../src/platform/connection';
import { DatabaseId, DatabaseInfo } from '../src/core/database_info';

// Import the following modules despite not using them. This forces them to get
// transpiled by tsc. Without these imports they do not get transpiled because
// they are imported dynamically, causing in MODULE_NOT_FOUND errors at runtime.
import * as node_connection from '../src/platform/node/connection';
import * as node_format_json from '../src/platform/node/format_json';

const databaseInfo = new DatabaseInfo(
  new DatabaseId("dconeybe-testing"),
  /*appId=*/"",
  /*persistenceKey=*/"[DEFAULT]",
  /*host=*/"firestore.googleapis.com",
  /*ssl=*/true,
  /*forceLongPolling=*/false,
  /*autoDetectLongPolling=*/false,
  /*useFetchStreams=*/true
);

async function run() {
  const connection = newConnection(databaseInfo);
  const stream = connection.openStream("Listen", null, null);

  stream.onOpen(() => {
    console.log("zzyzx onOpen()");
  });
  stream.onClose(err => {
    console.log(`zzyzx onClose()`);
    if (err) {
      console.log(err);
    }
  });
  stream.onMessage(msg => {
    console.log("onMessage() ", msg);
  });

  const target = {
    "database": "projects/dconeybe-testing/databases/(default)",
    "addTarget": {
      "documents": {
        "documents": [
          "projects/dconeybe-testing/databases/(default)/documents/v9web-demo-IxnK1mZsEWU3KKe5V3dL/doc1"
        ]
      },
      "targetId": 2
    }
  };

  stream.send(target);
}

run();
