/**
 * @license
 * Copyright 2020 Google LLC
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

import { ActionCodeOperation } from '../model/public_types';
import { AuthErrorCode } from './errors';
import { _assert } from './util/assert';

/**
 * Enums for fields in URL query string.
 *
 * @enum {string}
 */
const enum QueryField {
  API_KEY = 'apiKey',
  CODE = 'oobCode',
  CONTINUE_URL = 'continueUrl',
  LANGUAGE_CODE = 'languageCode',
  MODE = 'mode',
  TENANT_ID = 'tenantId'
}

/**
 * Maps the mode string in action code URL to Action Code Info operation.
 *
 * @param mode
 */
function parseMode(mode: string | null): ActionCodeOperation | null {
  switch (mode) {
    case 'recoverEmail':
      return ActionCodeOperation.RECOVER_EMAIL;
    case 'resetPassword':
      return ActionCodeOperation.PASSWORD_RESET;
    case 'signIn':
      return ActionCodeOperation.EMAIL_SIGNIN;
    case 'verifyEmail':
      return ActionCodeOperation.VERIFY_EMAIL;
    case 'verifyAndChangeEmail':
      return ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL;
    case 'revertSecondFactorAddition':
      return ActionCodeOperation.REVERT_SECOND_FACTOR_ADDITION;
    default:
      return null;
  }
}

/**
 * Helper to parse FDL links
 *
 * @param url
 */
function parseDeepLink(url: string): string {
  const uri = new URL(url);
  const link = uri.searchParams.get('link');
  // Double link case (automatic redirect).
  const doubleDeepLink = link ? new URL(link).searchParams.get('link') : null;
  // iOS custom scheme links.
  const iOSDeepLink = uri.searchParams.get('deep_link_id');
  const iOSDoubleDeepLink = iOSDeepLink
    ? new URL(iOSDeepLink).searchParams.get('link')
    : null;
  return iOSDoubleDeepLink || iOSDeepLink || doubleDeepLink || link || url;
}

/**
 * A utility class to parse email action URLs such as password reset, email verification,
 * email link sign in, etc.
 *
 * @public
 */
export class ActionCodeURL {
  /**
   * The API key of the email action link.
   */
  readonly apiKey: string;
  /**
   * The action code of the email action link.
   */
  readonly code: string;
  /**
   * The continue URL of the email action link. Null if not provided.
   */
  readonly continueUrl: string | null;
  /**
   * The language code of the email action link. Null if not provided.
   */
  readonly languageCode: string | null;
  /**
   * The action performed by the email action link. It returns from one of the types from
   * {@link ActionCodeInfo}
   */
  readonly operation: ActionCodeOperation;
  /**
   * The tenant ID of the email action link. Null if the email action is from the parent project.
   */
  readonly tenantId: string | null;

  /**
   * @param actionLink - The link from which to extract the URL.
   * @returns The ActionCodeURL object, or null if the link is invalid.
   *
   * @internal
   */
  constructor(actionLink: string) {
    const uri = new URL(actionLink);
    const apiKey = uri.searchParams.get(QueryField.API_KEY);
    const code = uri.searchParams.get(QueryField.CODE);
    const operation = parseMode(uri.searchParams.get(QueryField.MODE));
    // Validate API key, code and mode.
    _assert(apiKey && code && operation, AuthErrorCode.ARGUMENT_ERROR);
    this.apiKey = apiKey;
    this.operation = operation;
    this.code = code;
    this.continueUrl = uri.searchParams.get(QueryField.CONTINUE_URL);
    this.languageCode = uri.searchParams.get(QueryField.LANGUAGE_CODE);
    this.tenantId = uri.searchParams.get(QueryField.TENANT_ID);
  }

  /**
   * Parses the email action link string and returns an {@link ActionCodeURL} if the link is valid,
   * otherwise returns null.
   *
   * @param link  - The email action link string.
   * @returns The ActionCodeURL object, or null if the link is invalid.
   *
   * @public
   */
  static parseLink(link: string): ActionCodeURL | null {
    const actionLink = parseDeepLink(link);
    try {
      return new ActionCodeURL(actionLink);
    } catch {
      return null;
    }
  }
}

/**
 * {@inheritDoc @firebase/auth-types#ActionCodeURL.parseLink}
 *
 * @public
 */
export function parseActionCodeURL(link: string): ActionCodeURL | null {
  return ActionCodeURL.parseLink(link);
}
