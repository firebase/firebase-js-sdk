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

import * as yargs from 'yargs';

export interface ParsedArgs {
  projectId: string;
  host: string;
  ssl: boolean;
  collectionId: string | null;
  documentCreateCount: number | null;
  documentDeleteCount: number | null;
  iterationCount: number | null;
  debugLoggingEnabled: boolean;
}

export function parseArgs(): ParsedArgs {
  const parsedArgs = yargs
    .strict()
    .config()
    .options({
      projectId: {
        demandOption: true,
        type: "string",
        describe: "The Firebase project ID to use."
      },
      host: {
        type: "string",
        default: "firestore.googleapis.com",
        describe: "The Firestore server to which to connect."
      },
      ssl: {
        type: "boolean",
        default: true,
        describe: "Whether to use SSL when connecting to the Firestore server."
      },
      collection: {
        type: "string",
        describe: "The ID of the Firestore collection to use; " +
          "an auto-generated ID will be used if not specified."
      },
      creates: {
        type: "number",
        describe: "The number of Firestore documents to create."
      },
      deletes: {
        type: "number",
        describe: "The number of documents to delete."
      },
      iterations: {
        type: "number",
        describe: "The number of iterations to run."
      },
      debug: {
        type: "boolean",
        default: false,
        describe: "Enable Firestore debug logging."
      }
    })
    .help()
    .parseSync();

  return {
    projectId: parsedArgs.projectId,
    host: parsedArgs.host,
    ssl: parsedArgs.ssl,
    collectionId: parsedArgs.collection ?? null,
    documentCreateCount: parsedArgs.creates ?? null,
    documentDeleteCount: parsedArgs.deletes ?? null,
    iterationCount: parsedArgs.iterations ?? null,
    debugLoggingEnabled: parsedArgs.debug
  };
}
