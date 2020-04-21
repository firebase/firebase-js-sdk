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

import { AuthErrorCode, AUTH_ERROR_FACTORY } from './errors';
import { Operation } from '../model/action_code_info';
import { Auth } from '../model/auth';

/**
 * Enums for fields in URL query string.
 * @enum {string}
 */
enum QueryField {
  API_KEY = 'apiKey',
  CODE = 'oobCode',
  CONTINUE_URL = 'continueUrl',
  LANGUAGE_CODE = 'languageCode',
  MODE = 'mode',
  TENANT_ID = 'tenantId'
}

/**
 * Map from mode string in action code URL to Action Code Info operation.
 */
const MODE_TO_OPERATION_MAP: { [key: string]: Operation } = {
  'recoverEmail': Operation.RECOVER_EMAIL,
  'resetPassword': Operation.PASSWORD_RESET,
  'signIn': Operation.EMAIL_SIGNIN,
  'verifyEmail': Operation.VERIFY_EMAIL,
  'verifyAndChangeEmail': Operation.VERIFY_AND_CHANGE_EMAIL,
  'revertSecondFactorAddition': Operation.REVERT_SECOND_FACTOR_ADDITION
};

/**
 * Maps the mode string in action code URL to Action Code Info operation.
 */
function parseMode(mode: string | null): Operation | null {
  return mode ? MODE_TO_OPERATION_MAP[mode] || null : null;
}

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

export class ActionCodeURL {
  readonly apiKey: string;
  readonly code: string;
  readonly continueUrl: string | null;
  readonly languageCode: string | null;
  readonly operation: Operation;
  readonly tenantId: string | null;

  constructor(auth: Auth, actionLink: string) {
    const uri = new URL(actionLink);
    const apiKey = uri.searchParams.get(QueryField.API_KEY);
    const code = uri.searchParams.get(QueryField.CODE);
    const operation = parseMode(uri.searchParams.get(QueryField.MODE));
    // Validate API key, code and mode.
    if (!apiKey || !code || !operation) {
      throw AUTH_ERROR_FACTORY.create(AuthErrorCode.ARGUMENT_ERROR, {
        appName: auth.name
      });
    }
    this.apiKey = apiKey;
    this.operation = operation;
    this.code = code;
    this.continueUrl = uri.searchParams.get(QueryField.CONTINUE_URL);
    this.languageCode = uri.searchParams.get(QueryField.LANGUAGE_CODE);
    this.tenantId = uri.searchParams.get(QueryField.TENANT_ID);
  }

  static _fromLink(auth: Auth, link: string): ActionCodeURL | null {
    const actionLink = parseDeepLink(link);
    try {
      return new ActionCodeURL(auth, actionLink);
    } catch {
      return null;
    }
  }
}
