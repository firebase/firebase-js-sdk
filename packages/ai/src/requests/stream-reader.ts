/**
 * @license
 * Copyright 2024 Google LLC
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

import {
  EnhancedGenerateContentResponse,
  GenerateContentCandidate,
  GenerateContentResponse,
  GenerateContentStreamResult,
  Part,
  AIErrorCode
} from '../types';
import { AIError } from '../errors';
import { createEnhancedContentResponse } from './response-helpers';
import * as GoogleAIMapper from '../googleai-mappers';
import { GoogleAIGenerateContentResponse } from '../types/googleai';
import { ApiSettings } from '../types/internal';
import {
  BackendType,
  InferenceSource,
  URLContextMetadata
} from '../public-types';

const responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;

/**
 * Process a response.body stream from the backend and return an
 * iterator that provides one complete GenerateContentResponse at a time
 * and a promise that resolves with a single aggregated
 * GenerateContentResponse.
 *
 * @param response - Response from a fetch call
 */
export async function processStream(
  response: Response,
  apiSettings: ApiSettings,
  inferenceSource?: InferenceSource
): Promise<
  GenerateContentStreamResult & { firstValue?: GenerateContentResponse }
> {
  const inputStream = response.body!.pipeThrough(
    new TextDecoderStream('utf8', { fatal: true })
  );

  const responseStream =
    getResponseStream<GenerateContentResponse>(inputStream);

  // We split the stream so the user can iterate over partial results (stream1)
  // while we aggregate the full result for history/final response (stream2).
  const [stream1, stream2] = responseStream.tee();
  const { response: internalResponse, firstValue } =
    await processStreamInternal(stream2, apiSettings, inferenceSource);
  return {
    stream: generateResponseSequence(stream1, apiSettings, inferenceSource),
    response: internalResponse,
    firstValue
  };
}

async function processStreamInternal(
  stream: ReadableStream<GenerateContentResponse>,
  apiSettings: ApiSettings,
  inferenceSource?: InferenceSource
): Promise<{
  firstValue?: GenerateContentResponse;
  response: Promise<EnhancedGenerateContentResponse>;
}> {
  const [streamForPeek, streamForAggregation] = stream.tee();
  const reader = streamForPeek.getReader();
  const { value } = await reader.read();
  return {
    firstValue: value,
    response: getResponsePromise(
      streamForAggregation,
      apiSettings,
      inferenceSource
    )
  };
}

async function getResponsePromise(
  stream: ReadableStream<GenerateContentResponse>,
  apiSettings: ApiSettings,
  inferenceSource?: InferenceSource
): Promise<EnhancedGenerateContentResponse> {
  const allResponses: GenerateContentResponse[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      let generateContentResponse = aggregateResponses(allResponses);
      if (apiSettings.backend.backendType === BackendType.GOOGLE_AI) {
        generateContentResponse = GoogleAIMapper.mapGenerateContentResponse(
          generateContentResponse as GoogleAIGenerateContentResponse
        );
      }
      return createEnhancedContentResponse(
        generateContentResponse,
        inferenceSource
      );
    }
    allResponses.push(value);
  }
}

async function* generateResponseSequence(
  stream: ReadableStream<GenerateContentResponse>,
  apiSettings: ApiSettings,
  inferenceSource?: InferenceSource
): AsyncGenerator<EnhancedGenerateContentResponse> {
  const reader = stream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    let enhancedResponse: EnhancedGenerateContentResponse;
    if (apiSettings.backend.backendType === BackendType.GOOGLE_AI) {
      enhancedResponse = createEnhancedContentResponse(
        GoogleAIMapper.mapGenerateContentResponse(
          value as GoogleAIGenerateContentResponse
        ),
        inferenceSource
      );
    } else {
      enhancedResponse = createEnhancedContentResponse(value, inferenceSource);
    }

    const firstCandidate = enhancedResponse.candidates?.[0];
    if (
      !firstCandidate?.content?.parts &&
      !firstCandidate?.finishReason &&
      !firstCandidate?.citationMetadata &&
      !firstCandidate?.urlContextMetadata
    ) {
      continue;
    }

    yield enhancedResponse;
  }
}

/**
 * Reads a raw string stream, buffers incomplete chunks, and yields parsed JSON objects.
 */
export function getResponseStream<T>(
  inputStream: ReadableStream<string>
): ReadableStream<T> {
  const reader = inputStream.getReader();
  const stream = new ReadableStream<T>({
    start(controller) {
      let currentText = '';
      return pump();
      function pump(): Promise<(() => Promise<void>) | undefined> {
        return reader.read().then(({ value, done }) => {
          if (done) {
            if (currentText.trim()) {
              controller.error(
                new AIError(AIErrorCode.PARSE_FAILED, 'Failed to parse stream')
              );
              return;
            }
            controller.close();
            return;
          }

          currentText += value;
          // SSE events may span chunk boundaries, so we buffer until we match
          // the full "data: {json}\n\n" pattern.
          let match = currentText.match(responseLineRE);
          let parsedResponse: T;
          while (match) {
            try {
              parsedResponse = JSON.parse(match[1]);
            } catch (e) {
              controller.error(
                new AIError(
                  AIErrorCode.PARSE_FAILED,
                  `Error parsing JSON response: "${match[1]}`
                )
              );
              return;
            }
            controller.enqueue(parsedResponse);
            currentText = currentText.substring(match[0].length);
            match = currentText.match(responseLineRE);
          }
          return pump();
        });
      }
    }
  });
  return stream;
}

/**
 * Aggregates an array of `GenerateContentResponse`s into a single
 * GenerateContentResponse.
 */
export function aggregateResponses(
  responses: GenerateContentResponse[]
): GenerateContentResponse {
  const lastResponse = responses[responses.length - 1];
  const aggregatedResponse: GenerateContentResponse = {
    promptFeedback: lastResponse?.promptFeedback
  };
  for (const response of responses) {
    if (response.candidates) {
      for (const candidate of response.candidates) {
        // Use 0 if index is undefined (protobuf default value omission).
        const i = candidate.index || 0;
        if (!aggregatedResponse.candidates) {
          aggregatedResponse.candidates = [];
        }
        if (!aggregatedResponse.candidates[i]) {
          aggregatedResponse.candidates[i] = {
            index: candidate.index
          } as GenerateContentCandidate;
        }

        // Overwrite with the latest metadata
        aggregatedResponse.candidates[i].citationMetadata =
          candidate.citationMetadata;
        aggregatedResponse.candidates[i].finishReason = candidate.finishReason;
        aggregatedResponse.candidates[i].finishMessage =
          candidate.finishMessage;
        aggregatedResponse.candidates[i].safetyRatings =
          candidate.safetyRatings;
        aggregatedResponse.candidates[i].groundingMetadata =
          candidate.groundingMetadata;

        // The urlContextMetadata object is defined in the first chunk of the response stream.
        // In all subsequent chunks, the urlContextMetadata object will be undefined. We need to
        // make sure that we don't overwrite the first value urlContextMetadata object with undefined.
        // FIXME: What happens if we receive a second, valid urlContextMetadata object?
        const urlContextMetadata = candidate.urlContextMetadata as unknown;
        if (
          typeof urlContextMetadata === 'object' &&
          urlContextMetadata !== null &&
          Object.keys(urlContextMetadata).length > 0
        ) {
          aggregatedResponse.candidates[i].urlContextMetadata =
            urlContextMetadata as URLContextMetadata;
        }

        if (candidate.content) {
          if (!candidate.content.parts) {
            continue;
          }
          if (!aggregatedResponse.candidates[i].content) {
            aggregatedResponse.candidates[i].content = {
              role: candidate.content.role || 'user',
              parts: []
            };
          }
          for (const part of candidate.content.parts) {
            const newPart: Part = { ...part };
            // The backend can send empty text parts. If these are sent back
            // (e.g. in chat history), the backend will respond with an error.
            // To prevent this, ignore empty text parts.
            if (part.text === '') {
              continue;
            }
            if (Object.keys(newPart).length > 0) {
              aggregatedResponse.candidates[i].content.parts.push(
                newPart as Part
              );
            }
          }
        }
      }
    }
  }
  return aggregatedResponse;
}
