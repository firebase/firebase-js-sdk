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

import { GenAIError } from './errors';
import { logger } from './logger';
import {
  CitationMetadata,
  CountTokensRequest,
  GenerateContentCandidate,
  GenerateContentRequest,
  GenerateContentResponse,
  HarmSeverity,
  InlineDataPart,
  PromptFeedback,
  SafetyRating,
  GenAIErrorCode
} from './types';
import {
  GoogleAIGenerateContentResponse,
  GoogleAIGenerateContentCandidate,
  GoogleAICountTokensRequest
} from './types/googleAI';

/**
 * This SDK supports both Vertex AI and Google AI APIs.
 * The public API prioritizes the Vertex AI API.
 * We avoid having two sets of types by translating requests and responses between the two API formats.
 * We want to avoid two sets of types so that developers can switch between Vertex AI and Google AI
 * with minimal changes to their code.
 *
 * In here are functions that map requests and responses between the two API formats.
 * VertexAI requests defined by the user are mapped to Google AI requests before they're sent.
 * Google AI responses are mapped to VertexAI responses so they can be returned to the user.
 */

/**
 * Maps a Vertex AI {@link GenerateContentRequest} to a format that can be sent to Google AI.
 *
 * @param generateContentRequest The {@link GenerateContentRequest} to map.
 * @returns A {@link GenerateContentResponse} that conforms to the Google AI format.
 *
 * @throws If the request contains properties that are unsupported by Google AI.
 */
export function mapGenerateContentRequest(
  generateContentRequest: GenerateContentRequest
): GenerateContentRequest {
  generateContentRequest.safetySettings?.forEach(safetySetting => {
    if (safetySetting.method) {
      throw new GenAIError(
        GenAIErrorCode.UNSUPPORTED,
        'SafetySetting.method is not supported in the Google AI. Please remove this property.'
      );
    }
  });

  if (generateContentRequest.generationConfig?.topK) {
    logger.warn(
      'topK in GenerationConfig has been rounded to the nearest integer.'
    );
    generateContentRequest.generationConfig.topK = Math.round(
      generateContentRequest.generationConfig.topK
    );
  }

  return generateContentRequest;
}

/**
 * Maps a {@link GenerateContentResponse} from Google AI to the format of the
 * {@link GenerateContentResponse} that we get from VertexAI that is exposed in the public API.
 *
 * @param googleAIResponse The {@link GenerateContentResponse} from Google AI.
 * @returns A {@link GenerateContentResponse} that conforms to the public API's format.
 */
export function mapGenerateContentResponse(
  googleAIResponse: GoogleAIGenerateContentResponse
): GenerateContentResponse {
  const generateContentResponse = {
    candidates: googleAIResponse.candidates
      ? mapGenerateContentCandidates(googleAIResponse.candidates)
      : undefined,
    prompt: googleAIResponse.promptFeedback
      ? mapPromptFeedback(googleAIResponse.promptFeedback)
      : undefined,
    usageMetadata: googleAIResponse.usageMetadata
  };

  return generateContentResponse;
}

/**
 * Maps a Vertex AI {@link CountTokensRequest} to a format that can be sent to Google AI.
 *
 * @param countTokensRequest The {@link CountTokensRequest} to map.
 * @returns A {@link CountTokensRequest} that conforms to the Google AI format.
 */
export function mapCountTokensRequest(
  countTokensRequest: CountTokensRequest,
): GoogleAICountTokensRequest {
  const mappedCountTokensRequest: GoogleAICountTokensRequest = {
    generateContentRequest: {
      // model,
      contents: countTokensRequest.contents,
      systemInstruction: countTokensRequest.systemInstruction,
      tools: countTokensRequest.tools,
      generationConfig: countTokensRequest.generationConfig
    }
  };

  return mappedCountTokensRequest;
}

export function mapGenerateContentCandidates(
  candidates: GoogleAIGenerateContentCandidate[]
): GenerateContentCandidate[] {
  const mappedCandidates: GenerateContentCandidate[] = [];
  if (mappedCandidates) {
    candidates.forEach(candidate => {
      // Map citationSources to citations.
      let citationMetadata: CitationMetadata | undefined;
      if (candidate.citationMetadata) {
        citationMetadata = {
          citations: candidate.citationMetadata.citationSources
        };
      }

      // Assign missing candidate SafetyRatings properties to their defaults.
      if (candidate.safetyRatings) {
        logger.warn(
          "Candidate safety rating properties 'severity', 'severityScore', and 'probabilityScore' are not included in responses from Google AI. Properties have been assigned to default values."
        );
        candidate.safetyRatings.forEach(safetyRating => {
          safetyRating.severity = HarmSeverity.HARM_SEVERITY_UNSUPPORTED;
          safetyRating.probabilityScore = 0;
          safetyRating.severityScore = 0;
        });
      }

      // videoMetadata is not supported.
      // Throw early since developers may send a long video as input and only expect to pay
      // for inference on a small portion of the video.
      if (
        candidate.content?.parts.some(
          part => (part as InlineDataPart)?.videoMetadata
        )
      ) {
        throw new GenAIError(
          GenAIErrorCode.UNSUPPORTED,
          'Part.videoMetadata is not supported in Google AI. Please remove this property.'
        );
      }

      const mappedCandidate = {
        index: candidate.index,
        content: candidate.content,
        finishReason: candidate.finishReason,
        finishMessage: candidate.finishMessage,
        safetyRatings: candidate.safetyRatings,
        citationMetadata,
        groundingMetadata: candidate.groundingMetadata
      };
      mappedCandidates.push(mappedCandidate);
    });
  }

  return mappedCandidates;
}

export function mapPromptFeedback(
  promptFeedback: PromptFeedback
): PromptFeedback {
  // Assign missing PromptFeedback SafetyRatings properties to their defaults.
  const mappedSafetyRatings: SafetyRating[] = [];
  promptFeedback.safetyRatings.forEach(safetyRating => {
    mappedSafetyRatings.push({
      category: safetyRating.category,
      probability: safetyRating.probability,
      severity: HarmSeverity.HARM_SEVERITY_UNSUPPORTED,
      probabilityScore: 0,
      severityScore: 0,
      blocked: safetyRating.blocked
    });
  });
  logger.warn(
    "PromptFeedback safety ratings' properties severity, severityScore, and probabilityScore are not included in responses from Google AI. Properties have been assigned to default values."
  );

  const mappedPromptFeedback: PromptFeedback = {
    blockReason: promptFeedback.blockReason,
    safetyRatings: mappedSafetyRatings,
    blockReasonMessage: promptFeedback.blockReasonMessage
  };
  return mappedPromptFeedback;
}
