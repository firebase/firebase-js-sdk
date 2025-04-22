import { Tool, GenerationConfig, Citation, FinishReason, GroundingMetadata, PromptFeedback, SafetyRating, UsageMetadata } from '../public-types';
import { Content, Part } from './content';

/**
 * @internal
 */
export interface GoogleAICountTokensRequest {
  generateContentRequest: {
    model: string; // 'models/model-name'
    contents: Content[];
    systemInstruction?: string | Part | Content;
    tools?: Tool[];
    generationConfig?: GenerationConfig;
  };
}

/**
 * @internal
 */
export interface GoogleAIGenerateContentResponse {
  candidates?: GoogleAIGenerateContentCandidate[];
  promptFeedback?: PromptFeedback;
  usageMetadata?: UsageMetadata;
}

/**
 * @internal
 */
export interface GoogleAIGenerateContentCandidate {
  index: number;
  content: Content;
  finishReason?: FinishReason;
  finishMessage?: string;
  safetyRatings?: SafetyRating[];
  citationMetadata?: GoogleAICitationMetadata;
  groundingMetadata?: GroundingMetadata;
}

/**
 * @internal
 */
export interface GoogleAICitationMetadata {
  citationSources: Citation[]; // Maps to `citations`
}