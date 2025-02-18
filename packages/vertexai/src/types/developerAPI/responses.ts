import { Content } from "../content";
import { FinishReason } from "../enums";
import { Citation, GroundingMetadata, PromptFeedback, SafetyRating, UsageMetadata } from "../responses";

export namespace DeveloperAPI {
  export interface GenerateContentResponse {
    candidates?: GenerateContentCandidate[];
    promptFeedback?: PromptFeedback;
    usageMetadata?: UsageMetadata;
  }

  export interface GenerateContentCandidate {
    index: number;
    content: Content;
    finishReason?: FinishReason;
    finishMessage?: string;
    safetyRatings?: SafetyRating[];
    citationMetadata?: DeveloperAPI.CitationMetadata;
    groundingMetadata?: GroundingMetadata;
  }

  export interface CitationMetadata {
    citationSources: Citation[]; // Maps to `citations`
  }
}