/**
 * Shims @types/dom-chromium-ai
 * TODO: replace with @types/dom-chromium-ai once we can use es2020.intl.
 */
interface AILanguageModelCreateOptions {
  topK?: number;
  temperature?: number;
}

export interface AILanguageModelCreateOptionsWithSystemPrompt
  extends AILanguageModelCreateOptions {
  systemPrompt?: string;
  initialPrompts?: AILanguageModelPrompt[];
}

type AILanguageModelPromptRole = 'user' | 'assistant';

interface AILanguageModelPrompt {
  role: AILanguageModelPromptRole;
  content: string;
}
