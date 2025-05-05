/**
 * @license
 * Copyright 2021 Google LLC
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

import { base64urlEncodeWithoutPadding } from './crypt';

// Firebase Auth tokens contain snake_case claims following the JWT standard / convention.
/* eslint-disable camelcase */

export type FirebaseSignInProvider =
  | 'custom'
  | 'email'
  | 'password'
  | 'phone'
  | 'anonymous'
  | 'google.com'
  | 'facebook.com'
  | 'github.com'
  | 'twitter.com'
  | 'microsoft.com'
  | 'apple.com';

interface FirebaseIdToken {
  // Always set to https://securetoken.google.com/PROJECT_ID
  iss: string;

  // Always set to PROJECT_ID
  aud: string;

  // The user's unique ID
  sub: string;

  // The token issue time, in seconds since epoch
  iat: number;

  // The token expiry time, normally 'iat' + 3600
  exp: number;

  // The user's unique ID. Must be equal to 'sub'
  user_id: string;

  // The time the user authenticated, normally 'iat'
  auth_time: number;

  // The sign in provider, only set when the provider is 'anonymous'
  provider_id?: 'anonymous';

  // The user's primary email
  email?: string;

  // The user's email verification status
  email_verified?: boolean;

  // The user's primary phone number
  phone_number?: string;

  // The user's display name
  name?: string;

  // The user's profile photo URL
  picture?: string;

  // Information on all identities linked to this user
  firebase: {
    // The primary sign-in provider
    sign_in_provider: FirebaseSignInProvider;

    // A map of providers to the user's list of unique identifiers from
    // each provider
    identities?: { [provider in FirebaseSignInProvider]?: string[] };
  };

  // Custom claims set by the developer
  [claim: string]: unknown;

  uid?: never; // Try to catch a common mistake of "uid" (should be "sub" instead).
}

export type EmulatorMockTokenOptions = ({ user_id: string } | { sub: string }) &
  Partial<FirebaseIdToken>;

export function createMockUserToken(
  token: EmulatorMockTokenOptions,
  projectId?: string
): string {
  if (token.uid) {
    throw new Error(
      'The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.'
    );
  }
  // Unsecured JWTs use "none" as the algorithm.
  const header = {
    alg: 'none',
    type: 'JWT'
  };

  const project = projectId || 'demo-project';
  const iat = token.iat || 0;
  const sub = token.sub || token.user_id;
  if (!sub) {
    throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");
  }

  const payload: FirebaseIdToken = {
    // Set all required fields to decent defaults
    iss: `https://securetoken.google.com/${project}`,
    aud: project,
    iat,
    exp: iat + 3600,
    auth_time: iat,
    sub,
    user_id: sub,
    firebase: {
      sign_in_provider: 'custom',
      identities: {}
    },

    // Override with user options
    ...token
  };

  // Unsecured JWTs use the empty string as a signature.
  const signature = '';
  return [
    base64urlEncodeWithoutPadding(JSON.stringify(header)),
    base64urlEncodeWithoutPadding(JSON.stringify(payload)),
    signature
  ].join('.');
}

interface EmulatorStatuses {
  [name: string]: boolean;
}
const emulatorStatus: EmulatorStatuses = {};

// Checks whether any products are running on an emulator
function areRunningEmulator(): boolean {
  let runningEmulator = false;
  for (const key of Object.keys(emulatorStatus)) {
    if (emulatorStatus[key]) {
      runningEmulator = true;
    }
  }
  return runningEmulator;
}

function getOrCreateEl(id: string): { created: boolean; element: HTMLElement } {
  let parentDiv = document.getElementById(id);
  let created = false;
  if (!parentDiv) {
    parentDiv = document.createElement('div');
    parentDiv.setAttribute('id', id);
    created = true;
  }
  return { created, element: parentDiv };
}

/**
 * Updates Emulator Banner. Primarily used for Firebase Studio
 * @param name
 * @param isRunningEmulator
 * @public
 */
export function updateEmulatorBanner(
  name: string,
  isRunningEmulator: boolean
): void {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    emulatorStatus[name] === isRunningEmulator
  ) {
    return;
  }

  emulatorStatus[name] = isRunningEmulator;
  const bannerId = '__firebase__banner';
  if (!areRunningEmulator()) {
    tearDown();
    return;
  }

  function tearDown(): void {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(bannerId);
      if (element) {
        element.remove();
      }
    }
  }

  function setupDom(): void {
    const banner = getOrCreateEl(bannerId);
    const firebaseText: HTMLSpanElement =
      document.getElementById('__firebase__text') ||
      document.createElement('span');
    if (banner.created) {
      // update styles
      const bannerEl = banner.element;
      bannerEl.style.display = 'flex';
      bannerEl.style.background = '#7faaf0';
      bannerEl.style.position = 'absolute';
      bannerEl.style.bottom = '5px';
      bannerEl.style.left = '5px';
      bannerEl.style.padding = '.5em';
      bannerEl.style.borderRadius = '5px';
      bannerEl.style.alignContent = 'center';
      const closeBtn = document.createElement('span');
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.paddingLeft = '5px';
      closeBtn.innerHTML = ' &times;';
      closeBtn.onclick = () => {
        tearDown();
      };
      bannerEl.appendChild(firebaseText);
      bannerEl.appendChild(closeBtn);
      document.body.appendChild(banner.element);
    }
    firebaseText.setAttribute('id', '__firebase__text');
    firebaseText.innerText = 'Running in this workspace';
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupDom);
  } else {
    setupDom();
  }
}
