import {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  InferenceMode
} from '../types';

/**
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device is possible.
 */
export class ChromeAdapter {
  constructor(
    private aiProvider?: AI,
    private mode?: InferenceMode,
    private onDeviceParams?: AILanguageModelCreateOptionsWithSystemPrompt
  ) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isAvailable(request: GenerateContentRequest): Promise<boolean> {
    return false;
  }
  async generateContentOnDevice(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request: GenerateContentRequest
  ): Promise<EnhancedGenerateContentResponse> {
    return {
      text: () => '',
      functionCalls: () => undefined
    };
  }
}
