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
  GenerateContentResponse,
  ImagenGCSImage,
  ImagenInlineImage,
  AIErrorCode,
  InlineDataPart
} from '../types';
import { AIError } from '../errors';
import { logger } from '../logger';
import { ImagenResponseInternal } from '../types/internal';

/**
 * Creates an EnhancedGenerateContentResponse object that has helper functions and
 * other modifications that improve usability.
 */
export function createEnhancedContentResponse(
  response: GenerateContentResponse
): EnhancedGenerateContentResponse {
  /**
   * The Vertex AI backend omits default values.
   * This causes the `index` property to be omitted from the first candidate in the
   * response, since it has index 0, and 0 is a default value.
   * See: https://github.com/firebase/firebase-js-sdk/issues/8566
   */
  if (response.candidates && !response.candidates[0].hasOwnProperty('index')) {
    response.candidates[0].index = 0;
  }

  const responseWithHelpers = addHelpers(response);
  return responseWithHelpers;
}

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
        logger.warn(
          `This response had ${response.candidates.length} ` +
            `candidates. Returning text from the first candidate only. ` +
            `Access response.candidates directly to use the other candidates.`
        );
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new AIError(
          AIErrorCode.RESPONSE_ERROR,
          `Response error: ${formatBlockErrorMessage(
            response
          )}. Response body stored in error.response`,
          {
            response
          }
        );
      }
      return getText(response);
    } else if (response.promptFeedback) {
      throw new AIError(
        AIErrorCode.RESPONSE_ERROR,
        `Text not available. ${formatBlockErrorMessage(response)}`,
        {
          response
        }
      );
    }
    return '';
  };
  (response as EnhancedGenerateContentResponse).inlineDataParts = ():
    | InlineDataPart[]
    | undefined => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        logger.warn(
          `This response had ${response.candidates.length} ` +
            `candidates. Returning data from the first candidate only. ` +
            `Access response.candidates directly to use the other candidates.`
        );
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new AIError(
          AIErrorCode.RESPONSE_ERROR,
          `Response error: ${formatBlockErrorMessage(
            response
          )}. Response body stored in error.response`,
          {
            response
          }
        );
      }
      return getInlineDataParts(response);
    } else if (response.promptFeedback) {
      throw new AIError(
        AIErrorCode.RESPONSE_ERROR,
        `Data not available. ${formatBlockErrorMessage(response)}`,
        {
          response
        }
      );
    }
    return undefined;
  };
  (response as EnhancedGenerateContentResponse).functionCalls = () => {
    if (response.candidates && response.candidates.length > 0) {
      if (response.candidates.length > 1) {
        logger.warn(
          `This response had ${response.candidates.length} ` +
            `candidates. Returning function calls from the first candidate only. ` +
            `Access response.candidates directly to use the other candidates.`
        );
      }
      if (hadBadFinishReason(response.candidates[0])) {
        throw new AIError(
          AIErrorCode.RESPONSE_ERROR,
          `Response error: ${formatBlockErrorMessage(
            response
          )}. Response body stored in error.response`,
          {
            response
          }
        );
      }
      return getFunctionCalls(response);
    } else if (response.promptFeedback) {
      throw new AIError(
        AIErrorCode.RESPONSE_ERROR,
        `Function call not available. ${formatBlockErrorMessage(response)}`,
        {
          response
        }
      );
    }
    return undefined;
  };
  return response as EnhancedGenerateContentResponse;
}

/**
 * Returns all text found in all parts of first candidate.
 */
export function getText(response: GenerateContentResponse): string {
  const textStrings = [];
  if (response.candidates?.[0].content?.parts) {
    for (const part of response.candidates?.[0].content?.parts) {
      if (part.text) {
        textStrings.push(part.text);
      }
    }
  }
  if (textStrings.length > 0) {
    return textStrings.join('');
  } else {
    return '';
  }
}

/**
 * Returns {@link FunctionCall}s associated with first candidate.
 */
export function getFunctionCalls(
  response: GenerateContentResponse
): FunctionCall[] | undefined {
  const functionCalls: FunctionCall[] = [];
  if (response.candidates?.[0].content?.parts) {
    for (const part of response.candidates?.[0].content?.parts) {
      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }
  }
  if (functionCalls.length > 0) {
    return functionCalls;
  } else {
    return undefined;
  }
}

/**
 * Returns {@link InlineDataPart}s in the first candidate if present.
 *
 * @internal
 */
export function getInlineDataParts(
  response: GenerateContentResponse
): InlineDataPart[] | undefined {
  const data: InlineDataPart[] = [];

  if (response.candidates?.[0].content?.parts) {
    for (const part of response.candidates?.[0].content?.parts) {
      if (part.inlineData) {
        data.push(part);
      }
    }
  }

  if (data.length > 0) {
    return data;
  } else {
    return undefined;
  }
}

const badFinishReasons = [FinishReason.RECITATION, FinishReason.SAFETY];

function hadBadFinishReason(candidate: GenerateContentCandidate): boolean {
  return (
    !!candidate.finishReason &&
    badFinishReasons.some(reason => reason === candidate.finishReason)
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

/**
 * Convert a generic successful fetch response body to an Imagen response object
 * that can be returned to the user. This converts the REST APIs response format to our
 * APIs representation of a response.
 *
 * @internal
 */
export async function handlePredictResponse<
  T extends ImagenInlineImage | ImagenGCSImage
>(response: Response): Promise<{ images: T[]; filteredReason?: string }> {
  const responseJson: ImagenResponseInternal = await response.json();

  const images: T[] = [];
  let filteredReason: string | undefined = undefined;

  // The backend should always send a non-empty array of predictions if the response was successful.
  if (!responseJson.predictions || responseJson.predictions?.length === 0) {
    throw new AIError(
      AIErrorCode.RESPONSE_ERROR,
      'No predictions or filtered reason received from Vertex AI. Please report this issue with the full error details at https://github.com/firebase/firebase-js-sdk/issues.'
    );
  }

  for (const prediction of responseJson.predictions) {
    if (prediction.raiFilteredReason) {
      filteredReason = prediction.raiFilteredReason;
    } else if (prediction.mimeType && prediction.bytesBase64Encoded) {
      images.push({
        mimeType: prediction.mimeType,
        bytesBase64Encoded: prediction.bytesBase64Encoded
      } as T);
    } else if (prediction.mimeType && prediction.gcsUri) {
      images.push({
        mimeType: prediction.mimeType,
        gcsURI: prediction.gcsUri
      } as T);
    } else {
      throw new AIError(
        AIErrorCode.RESPONSE_ERROR,
        `Predictions array in response has missing properties. Response: ${JSON.stringify(
          responseJson
        )}`
      );
    }
  }

  return { images, filteredReason };
}
