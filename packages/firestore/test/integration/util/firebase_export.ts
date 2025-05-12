/**
 * @license
 * Copyright 2017 Google LLC
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

// Imports firebase via the raw sources and re-exports it. The
// "<repo-root>/integration/firestore" test suite replaces this file with a
// reference to the minified sources. If you change any exports in this file,
// you need to also adjust "integration/firestore/firebase_export.ts".

import { FirebaseApp, initializeApp } from '@firebase/app';

import { Firestore, initializeFirestore, setLogLevel } from '../../../src';
import { PrivateSettings } from '../../../src/lite-api/settings';
import { logDebug } from '../../../src/util/log';

// TODO(dimond): Right now we create a new app and Firestore instance for
// every test and never clean them up. We may need to revisit.
let appCount = 0;

const originalFetch = globalThis.fetch;

/**
 * A class that acts as a spy for a ReadableStream.
 * It logs the content of the input stream as it's read and then pipes it through.
 */
class ReadableStreamSpy<Uint8Array> {
  private inputReadableStream: ReadableStream<Uint8Array>;
  private spyTransformStream: TransformStream<Uint8Array, Uint8Array>;
  private spiedReadableStream: ReadableStream<Uint8Array>;

  private readonly decoder = new TextDecoder();

  /**
   * Creates an instance of ReadableStreamSpy.
   * @param inputReadableStream The ReadableStream to spy on.
   */
  constructor(inputReadableStream: ReadableStream<Uint8Array>) {
    if (!(inputReadableStream instanceof ReadableStream)) {
      throw new Error('Input must be a ReadableStream.');
    }

    this.inputReadableStream = inputReadableStream;

    // Create a TransformStream that logs data
    this.spyTransformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform: (
        chunk: Uint8Array,
        controller: TransformStreamDefaultController<Uint8Array>
      ) => {
        // @ts-ignore
        logDebug(this.decoder.decode(chunk));

        controller.enqueue(chunk); // Pass the chunk along
      },
      flush: (controller: TransformStreamDefaultController<Uint8Array>) => {
        // Any cleanup or final actions if needed
      }
    });

    // Pipe the input stream through the spy transform stream
    this.spiedReadableStream = this.inputReadableStream.pipeThrough(
      this.spyTransformStream
    );
  }

  /**
   * Gets the spied-on ReadableStream.
   * You should read from this stream to observe the logged chunks.
   * @returns The ReadableStream with spy functionality.
   */
  get readableStream(): ReadableStream<Uint8Array> {
    return this.spiedReadableStream;
  }
}

globalThis.fetch = async function (requestOrUrl, options) {
  // @ts-ignore
  const url =
    typeof requestOrUrl === 'string' ? requestOrUrl : requestOrUrl.url;

  logDebug(`FETCH FOR ${url}`);

  if (
    url.startsWith(
      'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel'
    )
  ) {
    const response = await originalFetch(requestOrUrl, options);

    if (response.body) {
      const spy = new ReadableStreamSpy(response.body);

      return Promise.resolve(
        new Response(spy.readableStream, {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        })
      );
    }

    return Promise.resolve(response);
  }

  return originalFetch(requestOrUrl, options);
};

// enable contextual debug logging
setLogLevel('error', 200);

export function newTestApp(projectId: string, appName?: string): FirebaseApp {
  if (appName === undefined) {
    appName = 'test-app-' + appCount++;
  }
  return initializeApp(
    {
      apiKey: 'fake-api-key',
      projectId
    },
    appName
  );
}

export function newTestFirestore(
  app: FirebaseApp,
  settings?: PrivateSettings,
  dbName?: string
): Firestore {
  return initializeFirestore(app, settings || {}, dbName);
}

export * from '../../../src';
export { PrivateSettings };
