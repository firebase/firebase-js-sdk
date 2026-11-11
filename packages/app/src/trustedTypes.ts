/**
 * @license
 * Copyright 2026 Google LLC
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

import { logger } from './logger';

/**
 * Name of the Trusted Types policy that Firebase SDKs use to load external
 * scripts. Apps that restrict policy names with the `trusted-types` CSP
 * directive must allow this name.
 *
 * @internal
 */
export const _TRUSTED_TYPES_POLICY_NAME = 'firebase-js-sdk-policy';

/**
 * External scripts that Firebase SDKs are allowed to load. A script URL is
 * allowed if it is one of these URLs, optionally followed by a query string.
 *
 * - Analytics: Google tag (gtag.js)
 * - Auth: Google API loader (gapi), reCAPTCHA v2 and reCAPTCHA Enterprise
 * - App Check: reCAPTCHA v3 and reCAPTCHA Enterprise
 */
const ALLOWED_SCRIPT_URLS = [
  'https://www.googletagmanager.com/gtag/js',
  'https://apis.google.com/js/api.js',
  'https://www.google.com/recaptcha/api.js',
  'https://www.google.com/recaptcha/enterprise.js'
];

type ScriptURLPolicy = Pick<TrustedTypePolicy, 'createScriptURL'>;

// `undefined` means the policy has not been created yet. `null` means Trusted
// Types are unavailable or the policy could not be created.
let trustedTypesPolicy: ScriptURLPolicy | null | undefined;

// True if the browser supports Trusted Types but the policy could not be
// created, usually because the page's CSP does not allow the policy name.
let trustedTypesPolicyBlocked = false;

/**
 * Returns `url` if it is one of the allowed external scripts, and throws
 * otherwise. Used as the `createScriptURL` implementation of the Trusted Types
 * policy.
 *
 * @internal
 */
export function _createTrustedScriptURL(url: string): string {
  const allowed = ALLOWED_SCRIPT_URLS.some(
    allowedUrl =>
      url.startsWith(allowedUrl) &&
      // Only allow a query string after the allowed URL, so that e.g.
      // "https://apis.google.com/js/api.js.evil.com" is rejected.
      (url.length === allowedUrl.length ||
        url.charAt(allowedUrl.length) === '?')
  );
  if (!allowed) {
    throw new TypeError(
      `Firebase: Refusing to load untrusted script URL: ${url}`
    );
  }
  return url;
}

/**
 * Lazily creates the Trusted Types policy. The policy is only created the first
 * time a script is loaded, so that pages that load more than one copy of
 * `@firebase/app` (for example the compat and modular CDN builds) only run
 * into a policy name collision if more than one copy loads a script.
 */
function getTrustedTypesPolicy(): ScriptURLPolicy | null {
  if (trustedTypesPolicy === undefined) {
    trustedTypesPolicy = null;
    const trustedTypes =
      typeof window !== 'undefined' ? window.trustedTypes : undefined;
    if (trustedTypes?.createPolicy) {
      try {
        trustedTypesPolicy = trustedTypes.createPolicy(
          _TRUSTED_TYPES_POLICY_NAME,
          { createScriptURL: _createTrustedScriptURL }
        );
      } catch {
        // The page's CSP does not allow this policy name, or a policy with
        // this name already exists. Fall back to assigning a plain string,
        // which still works unless the page also requires Trusted Types for
        // scripts. If it does, _setTrustedScriptSrc logs an error explaining
        // how to allow the policy.
        trustedTypesPolicyBlocked = true;
      }
    }
  }
  return trustedTypesPolicy;
}

/**
 * Sets the `src` of a script element through the Firebase Trusted Types policy
 * when Trusted Types are supported, so that Firebase SDKs can load external
 * scripts on pages that enforce Trusted Types.
 *
 * Throws if `url` is not an allowed Firebase script URL (when Trusted Types are
 * supported), or if the browser rejects the assignment.
 *
 * @param script - The script element to update.
 * @param url - The script URL. Must be an allowed Firebase script URL.
 *
 * @internal
 */
export function _setTrustedScriptSrc(
  script: HTMLScriptElement,
  url: string
): void {
  const policy = getTrustedTypesPolicy();
  if (policy) {
    // HTMLScriptElement.src is typed as a string, but accepts a
    // TrustedScriptURL.
    (script.src as string | TrustedScriptURL) = policy.createScriptURL(url);
    return;
  }
  try {
    script.src = url;
  } catch (e) {
    if (trustedTypesPolicyBlocked) {
      // The browser rejected the plain string because the page requires
      // Trusted Types, and the page's CSP did not allow our policy.
      logger.error(
        `Unable to load ${url} because this page requires Trusted Types ` +
          `for scripts but does not allow the "${_TRUSTED_TYPES_POLICY_NAME}" ` +
          `Trusted Types policy. To fix this, add ` +
          `"${_TRUSTED_TYPES_POLICY_NAME}" to the trusted-types directive ` +
          `of the page's Content-Security-Policy.`
      );
    }
    throw e;
  }
}

/**
 * Resets the cached Trusted Types policy. Only for use in tests.
 *
 * @internal
 */
export function _resetTrustedTypesPolicyForTesting(): void {
  trustedTypesPolicy = undefined;
  trustedTypesPolicyBlocked = false;
}
