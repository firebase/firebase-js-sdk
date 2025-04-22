/**
 * @license
 * Copyright 2025 Google LLC
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

import { vertexAIMocksLookup, googleAIMocksLookup } from './mocks-lookup';

const mockSetMaps: Record<BackendName, Record<string, string>> = {
  'vertexAI': vertexAIMocksLookup,
  'googleAI': googleAIMocksLookup
};

/**
 * Mock native Response.body
 * Streams contents of json file in 20 character chunks
 */
export function getChunkedStream(
  input: string,
  chunkLength = 20
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let currentChunkStart = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      while (currentChunkStart < input.length) {
        const substring = input.slice(
          currentChunkStart,
          currentChunkStart + chunkLength
        );
        currentChunkStart += chunkLength;
        const chunk = encoder.encode(substring);
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });

  return stream;
}

export function getMockResponseStreaming(
  backendName: BackendName,
  filename: string,
  chunkLength: number = 20
): Partial<Response> {
  const mocksMap = mockSetMaps[backendName];
  if (!(filename in mocksMap)) {
    throw Error(`${backendName} mock response file '${filename}' not found.`);
  }
  const fullText = mocksMap[filename];

  return {
    body: getChunkedStream(fullText, chunkLength)
  };
}

export function getMockResponse(
  backendName: BackendName,
  filename: string
): Partial<Response> {
  const mocksLookup = mockSetMaps[backendName];
  if (!(filename in mocksLookup)) {
    throw Error(`${backendName} mock response file '${filename}' not found.`);
  }
  const fullText = mocksLookup[filename];

  return {
    ok: true,
    json: () => Promise.resolve(JSON.parse(fullText))
  };
}
