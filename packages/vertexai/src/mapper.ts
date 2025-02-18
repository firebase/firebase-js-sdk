import { CitationMetadata, GenerateContentCandidate, GenerateContentResponse } from "./types";
import { DeveloperAPI } from "./types/developerAPI";

/**
 * Maps a `GenerateContentResponse` from the Developer API to the format of the 
 * `GenerateContentResponse` that we get from VertexAI that is exposed in the public API.
 * 
 * @internal
 * 
 * @param developerAPIResponse The `GenerateContentResponse` from the Developer API.
 * @returns A `GenerateContentResponse` that conforms to the public API's format.
 */
export function mapGenerateContentResponse(developerAPIResponse: DeveloperAPI.GenerateContentResponse): GenerateContentResponse {
  let candidates: GenerateContentCandidate[] | undefined = developerAPIResponse.candidates ? [] : undefined;
  if (candidates) {
    developerAPIResponse.candidates?.forEach(candidate => {
      let citationMetadata: CitationMetadata | undefined
      if (candidate.citationMetadata) {
        citationMetadata = {
          citations: candidate.citationMetadata.citationSources
        }
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
      candidates.push(mappedCandidate);
    });
  }

  const generateContentResponse = {
    candidates,
    promptFeedback: developerAPIResponse.promptFeedback,
    usageMetadata: developerAPIResponse.usageMetadata
  }
  return generateContentResponse;
}