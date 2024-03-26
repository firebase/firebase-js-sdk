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
  FinishReason,
  FunctionCall,
  GenerateContentCandidate,
  GenerateContentResponse
} from '../types';
import { ERROR_FACTORY, VertexError } from '../errors';

/**
 * Adds convenience helper methods to a response object, including stream
 * chunks (as long as each chunk is a complete GenerateContentResponse JSON).
 */
export function addHelpers(
  response: GenerateContentResponse
): EnhancedGenerateContentResponse {
  (response as EnhancedGenerateContentResponse).text = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(
          `This response had ${response.candidates.length} ` +
            `candidates. Returning text from the first candidate only. ` +
            `Access response.candidates directly to use the other candidates.`
        );
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw ERROR_FACTORY.create(VertexError.RESPONSE_ERROR, {
          message: `${formatBlockErrorMessage(response)}`,
          response
        });
      }
      return getText(response);
    } else if (response.promptFeedback) {
      throw ERROR_FACTORY.create(VertexError.RESPONSE_ERROR, {
        message: `Text not available. ${formatBlockErrorMessage(response)}`,
        response
      });
    }
    return '';
  };
  (response as EnhancedGenerateContentResponse).functionCall = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        console.warn(
          `This response had ${response.candidates.length} ` +
            `candidates. Returning function call from the first candidate only. ` +
            `Access response.candidates directly to use the other candidates.`
        );
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw ERROR_FACTORY.create(VertexError.RESPONSE_ERROR, {
          message: `${formatBlockErrorMessage(response)}`,
          response
        });
      }
      return getFunctionCall(response);
    } else if (response.promptFeedback) {
      throw ERROR_FACTORY.create(VertexError.RESPONSE_ERROR, {
        message: `Function call not available. ${formatBlockErrorMessage(
          response
        )}`,
        response
      });
    }
    return undefined;
  };
  return response as EnhancedGenerateContentResponse;
}

/**
 * Returns text of first candidate.
 */
export function getText(response: GenerateContentResponse): string {
  if (response.candidates?.[0].content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts
      .map(({ text }) => text)
      .join('');
  } else {
    return '';
  }
}

/**
 * Returns {@link FunctionCall} associated with first candidate.
 */
export function getFunctionCall(
  response: GenerateContentResponse
): FunctionCall | undefined {
  return response.candidates?.[0].content?.parts?.[0]?.functionCall;
}

const badFinishReasons = [FinishReason.RECITATION, FinishReason.SAFETY];

function hadBadFinishReason(candidate: GenerateContentCandidate): boolean {
  return (
    !!candidate.finishReason &&
    badFinishReasons.includes(candidate.finishReason)
  );
}

export function formatBlockErrorMessage(
  response: GenerateContentResponse
): string {
  let message = '';
  if (
    (!response.candidates || response.candidates.length === 0) &&
    response.promptFeedback
  ) {
    message += 'Response was blocked';
    if (response.promptFeedback?.blockReason) {
      message += ` due to ${response.promptFeedback.blockReason}`;
    }
    if (response.promptFeedback?.blockReasonMessage) {
      message += `: ${response.promptFeedback.blockReasonMessage}`;
    }
  } else if (response.candidates?.[0]) {
    const firstCandidate = response.candidates[0];
    if (hadBadFinishReason(firstCandidate)) {
      message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
      if (firstCandidate.finishMessage) {
        message += `: ${firstCandidate.finishMessage}`;
      }
    }
  }
  return message;
}
