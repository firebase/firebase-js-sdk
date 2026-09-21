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
  Content,
  CountTokensRequest,
  FunctionResponse,
  GenerateContentRequest,
  Part,
  UnknownPart,
  AIErrorCode
} from '../types';
import { TemplateRequestInternal } from '../public-types';
import { AIError } from '../errors';
import { assignPartType } from './response-helpers';

export function formatSystemInstruction(
  input?: string | Part | Content
): Content | undefined {
  // null or undefined
  if (input == null) {
    return undefined;
  } else if (typeof input === 'string') {
    return {
      role: 'system',
      parts: [{ type: 'text', text: input }]
    } as Content;
  } else if (
    (input as Part).type === 'text' ||
    ('text' in (input as object) &&
      typeof (input as { text?: unknown }).text === 'string')
  ) {
    const part = assignPartType(input as Part);
    return { role: 'system', parts: [part] };
  } else if ((input as Content).parts) {
    const parts = (input as Content).parts.map(p => assignPartType(p));
    if (!(input as Content).role) {
      return { role: 'system', parts };
    } else {
      return { ...(input as Content), parts };
    }
  }
}

export function formatNewContent(
  request: string | Array<string | Part>
): Content {
  let newParts: Part[] = [];
  if (typeof request === 'string') {
    newParts = [{ type: 'text', text: request }];
  } else {
    for (const partOrString of request) {
      if (typeof partOrString === 'string') {
        newParts.push({ type: 'text', text: partOrString });
      } else {
        newParts.push(assignPartType(partOrString));
      }
    }
  }
  return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}

/**
 * Validates the parts of a message to ensure that FunctionResponseParts
 * are not mixed with other part types in a single request.
 * All parts are now assigned the 'user' role to comply with 3.6+ model requirements.
 * @private
 * @param parts Array of parts to pass to the model
 * @returns A single Content item formatted for the model
 */
function assignRoleToPartsAndValidateSendMessageRequest(
  parts: Part[]
): Content {
  const content: Content = { role: 'user', parts: [] };
  let hasUserContent = false;
  let hasFunctionContent = false;
  for (const part of parts) {
    if (part.type === 'functionResponse' || 'functionResponse' in part) {
      hasFunctionContent = true;
    } else {
      hasUserContent = true;
    }
    content.parts.push(part);
  }

  if (hasUserContent && hasFunctionContent) {
    throw new AIError(
      AIErrorCode.INVALID_CONTENT,
      'Within a single message, FunctionResponse cannot be mixed with other type of Part in the request for sending chat message.'
    );
  }

  if (!hasUserContent && !hasFunctionContent) {
    throw new AIError(
      AIErrorCode.INVALID_CONTENT,
      'No Content is provided for sending chat message.'
    );
  }

  return content;
}

export function formatGenerateContentInput(
  params: GenerateContentRequest | string | Array<string | Part>
): GenerateContentRequest {
  let formattedRequest: GenerateContentRequest;
  if ((params as GenerateContentRequest).contents) {
    const request = params as GenerateContentRequest;
    formattedRequest = {
      ...request,
      contents: request.contents.map(content => ({
        ...content,
        parts: content.parts ? content.parts.map(assignPartType) : []
      }))
    };
  } else {
    // Array or string
    const content = formatNewContent(params as string | Array<string | Part>);
    formattedRequest = { contents: [content] };
  }
  if ((params as GenerateContentRequest).systemInstruction) {
    formattedRequest.systemInstruction = formatSystemInstruction(
      (params as GenerateContentRequest).systemInstruction
    );
  }
  return formattedRequest;
}

/**
 * Cleans a `FunctionResponse` object for wire transmission by stripping `type` from all nested parts if present.
 *
 * @internal
 */
export function cleanFunctionResponseForWire(
  fnResponse: FunctionResponse
): FunctionResponse {
  if (fnResponse.parts && Array.isArray(fnResponse.parts)) {
    return {
      ...fnResponse,
      parts: fnResponse.parts.map(stripPartType) as Part[]
    };
  }
  return fnResponse;
}

/**
 * Strips client-side `type` discriminator from a Part, returning an untagged wire part.
 * Creates a new part object so in-memory instances (e.g. in chat history) are not mutated.
 *
 * @internal
 */
export function stripPartType(part: Part | UnknownPart): UnknownPart {
  let wirePart: UnknownPart;
  if ('type' in part) {
    const { type: _type, ...rest } = part;
    wirePart = rest;
  } else {
    wirePart = part;
  }
  if (wirePart.functionResponse) {
    wirePart = {
      ...wirePart,
      functionResponse: cleanFunctionResponseForWire(wirePart.functionResponse)
    };
  }
  return wirePart;
}

/**
 * Cleans a `Content` object for wire transmission by stripping `type` from all its parts.
 *
 * @internal
 */
export function cleanContentForWire(content: Content): Content {
  if (!content.parts) {
    return content;
  }
  return {
    ...content,
    parts: content.parts.map(stripPartType) as Part[]
  };
}

/**
 * Cleans a systemInstruction parameter for wire transmission by stripping `type` from its parts if present.
 *
 * @internal
 */
export function cleanSystemInstructionForWire(
  systemInstruction?: string | Part | Content
): string | Part | Content | undefined {
  if (systemInstruction == null || typeof systemInstruction === 'string') {
    return systemInstruction;
  }
  if ('parts' in systemInstruction && Array.isArray(systemInstruction.parts)) {
    return cleanContentForWire(systemInstruction as Content);
  }
  return stripPartType(systemInstruction as Part) as Part;
}

/**
 * Traverses 2-3 layers down (contents -> parts -> nested parts) to strip `type` discriminators
 * from all parts in a GenerateContentRequest before sending over the wire.
 *
 * @internal
 */
export function cleanGenerateContentRequestForWire(
  request: GenerateContentRequest
): GenerateContentRequest {
  const cleaned: GenerateContentRequest = { ...request };
  if (cleaned.contents) {
    cleaned.contents = cleaned.contents.map(cleanContentForWire);
  }
  if (cleaned.systemInstruction) {
    cleaned.systemInstruction = cleanSystemInstructionForWire(
      cleaned.systemInstruction
    );
  }
  return cleaned;
}

/**
 * Cleans a CountTokensRequest for wire transmission by stripping `type` from all its parts.
 *
 * @internal
 */
export function cleanCountTokensRequestForWire(
  request: CountTokensRequest
): CountTokensRequest {
  const cleaned: CountTokensRequest = { ...request };
  if (cleaned.contents) {
    cleaned.contents = cleaned.contents.map(cleanContentForWire);
  }
  if (cleaned.systemInstruction) {
    cleaned.systemInstruction = cleanSystemInstructionForWire(
      cleaned.systemInstruction
    );
  }
  return cleaned;
}

/**
 * Cleans a TemplateRequestInternal for wire transmission by stripping `type` from all history parts.
 *
 * @internal
 */
export function cleanTemplateRequestForWire(
  request: TemplateRequestInternal
): TemplateRequestInternal {
  const cleaned: TemplateRequestInternal = { ...request };
  if (cleaned.history && Array.isArray(cleaned.history)) {
    cleaned.history = cleaned.history.map(cleanContentForWire);
  }
  return cleaned;
}
