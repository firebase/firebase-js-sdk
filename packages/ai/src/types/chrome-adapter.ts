import { CountTokensRequest, GenerateContentRequest } from "./requests";

/**
 * Defines an inference "backend" that uses Chrome's on-device model,
 * and encapsulates logic for detecting when on-device is possible.
 * 
 * @public
 */
export interface ChromeAdapter {
 isAvailable(request: GenerateContentRequest): Promise<boolean>;
 countTokens(_request: CountTokensRequest): Promise<Response>
 generateContent(request: GenerateContentRequest): Promise<Response>
 generateContentStream(
     request: GenerateContentRequest
   ): Promise<Response>
}