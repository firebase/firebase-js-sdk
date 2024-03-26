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

import { Content, POSSIBLE_ROLES, Part, Role } from '../types';
import { ERROR_FACTORY, VertexError } from '../errors';

// https://ai.google.dev/api/rest/v1beta/Content#part

const VALID_PART_FIELDS: Array<keyof Part> = [
  'text',
  'inlineData',
  'functionCall',
  'functionResponse'
];

const VALID_PARTS_PER_ROLE: { [key in Role]: Array<keyof Part> } = {
  user: ['text', 'inlineData'],
  function: ['functionResponse'],
  model: ['text', 'functionCall']
};

const VALID_PREVIOUS_CONTENT_ROLES: { [key in Role]: Role[] } = {
  user: ['model'],
  function: ['model'],
  model: ['user', 'function']
};

export function validateChatHistory(history: Content[]): void {
  let prevContent: Content | null = null;
  for (const currContent of history) {
    const { role, parts } = currContent;
    if (!prevContent && role !== 'user') {
      throw ERROR_FACTORY.create(VertexError.INVALID_CONTENT, {
        message: `First content should be with role 'user', got ${role}`
      });
    }
    if (!POSSIBLE_ROLES.includes(role)) {
      throw ERROR_FACTORY.create(VertexError.INVALID_CONTENT, {
        message: `Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(
          POSSIBLE_ROLES
        )}`
      });
    }

    if (!Array.isArray(parts)) {
      throw ERROR_FACTORY.create(VertexError.INVALID_CONTENT, {
        message: "Content should have 'parts' property with an array of Parts"
      });
    }

    if (parts.length === 0) {
      throw ERROR_FACTORY.create(VertexError.INVALID_CONTENT, {
        message: 'Each Content should have at least one part'
      });
    }

    const countFields: Record<keyof Part, number> = {
      text: 0,
      inlineData: 0,
      functionCall: 0,
      functionResponse: 0
    };

    for (const part of parts) {
      for (const key of VALID_PART_FIELDS) {
        if (key in part) {
          countFields[key] += 1;
        }
      }
    }
    const validParts = VALID_PARTS_PER_ROLE[role];
    for (const key of VALID_PART_FIELDS) {
      if (!validParts.includes(key) && countFields[key] > 0) {
        throw ERROR_FACTORY.create(VertexError.INVALID_CONTENT, {
          message: `Content with role '${role}' can't contain '${key}' part`
        });
      }
    }

    if (prevContent) {
      const validPreviousContentRoles = VALID_PREVIOUS_CONTENT_ROLES[role];
      if (!validPreviousContentRoles.includes(prevContent.role)) {
        throw ERROR_FACTORY.create(VertexError.INVALID_CONTENT, {
          message: `Content with role '${role}' can't follow '${
            prevContent.role
          }'. Valid previous roles: ${JSON.stringify(
            VALID_PREVIOUS_CONTENT_ROLES
          )}`
        });
      }
    }
    prevContent = currContent;
  }
}
