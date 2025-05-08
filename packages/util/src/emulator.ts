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
import { isCloudWorkstation } from './url';

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

interface EmulatorStatusMap {
  [name: string]: boolean;
}
const emulatorStatus: EmulatorStatusMap = {};

interface EmulatorSummary {
  prod: string[];
  emulator: string[];
}

// Checks whether any products are running on an emulator
function getEmulatorSummary(): EmulatorSummary {
  const summary: EmulatorSummary = {
    prod: [],
    emulator: []
  };
  for (const key of Object.keys(emulatorStatus)) {
    if (emulatorStatus[key]) {
      summary.emulator.push(key);
    } else {
      summary.prod.push(key);
    }
  }
  return summary;
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

let previouslyDismissed = false;
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
    !isCloudWorkstation(window.location.host) ||
    emulatorStatus[name] === isRunningEmulator ||
    emulatorStatus[name] || // If already set to use emulator, can't go back to prod.
    previouslyDismissed
  ) {
    return;
  }

  emulatorStatus[name] = isRunningEmulator;

  function prefixedId(id: string): string {
    return `__firebase__banner__${id}`;
  }
  const bannerId = '__firebase__banner';
  const summary = getEmulatorSummary();
  const showError = summary.prod.length > 0;

  function tearDown(): void {
    const element = document.getElementById(bannerId);
    if (element) {
      element.remove();
    }
  }

  function setupBannerStyles(bannerEl: HTMLElement): void {
    bannerEl.style.display = 'flex';
    bannerEl.style.background = '#7faaf0';
    bannerEl.style.position = 'absolute';
    bannerEl.style.bottom = '5px';
    bannerEl.style.left = '5px';
    bannerEl.style.padding = '.5em';
    bannerEl.style.borderRadius = '5px';
    bannerEl.style.alignContent = 'center';
  }

  function setupIconStyles(prependIcon: SVGElement, iconId: string): void {
    prependIcon.setAttribute('width', '24');
    prependIcon.setAttribute('id', iconId);
    prependIcon.setAttribute('height', '24');
    prependIcon.setAttribute('viewBox', '0 0 24 24');
    prependIcon.setAttribute('fill', 'none');
    prependIcon.style.marginLeft = '-6px';
  }

  function setupCloseBtn(): HTMLSpanElement {
    const closeBtn = document.createElement('span');
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.paddingLeft = '5px';
    closeBtn.innerHTML = ' &times;';
    closeBtn.onclick = () => {
      previouslyDismissed = true;
      tearDown();
    };
    return closeBtn;
  }

  function setupLinkStyles(
    learnMoreLink: HTMLAnchorElement,
    learnMoreId: string
  ): void {
    learnMoreLink.setAttribute('id', learnMoreId);
    learnMoreLink.innerText = 'Learn more';
    learnMoreLink.href =
      'http://firebase.google.com/docs/studio/deploy-app#emulator ';
    learnMoreLink.setAttribute('target', '__blank');
    learnMoreLink.style.paddingLeft = '5px';
  }

  function setupOpenExternal(svgElement: SVGElement, id: string): void {
    svgElement.setAttribute('viewBox', '0 0 16 16');
    svgElement.setAttribute('fill', 'none');
    svgElement.setAttribute('id', id);
    svgElement.style.width = '16px';
    svgElement.style.marginLeft = '4px';
    svgElement.innerHTML = `<path fill-rule="evenodd" clip-rule="evenodd" d="M12.6667 12.6667H3.33333V3.33333H8V2H3.33333C2.59333 2 2 2.6 2 3.33333V12.6667C2 13.4 2.59333 14 3.33333 14H12.6667C13.4 14 14 13.4 14 12.6667V8H12.6667V12.6667ZM9.33333 2V3.33333H11.7267L5.17333 9.88667L6.11333 10.8267L12.6667 4.27333V6.66667H14V2H9.33333Z" fill="#212121"/>`;
  }

  function setupDom(): void {
    const banner = getOrCreateEl(bannerId);
    const firebaseTextId = prefixedId('text');
    const firebaseText: HTMLSpanElement =
      document.getElementById(firebaseTextId) || document.createElement('span');
    const learnMoreId = prefixedId('learnmore');
    const learnMoreLink: HTMLAnchorElement =
      (document.getElementById(learnMoreId) as HTMLAnchorElement) ||
      document.createElement('a');
    const prependIconId = prefixedId('preprendIcon');
    const prependIcon: SVGElement =
      (document.getElementById(
        prependIconId
      ) as HTMLOrSVGElement as SVGElement) ||
      document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const openExternalIconId = prefixedId('openexternal');
    const openExternalIcon: SVGElement =
      (document.getElementById(
        openExternalIconId
      ) as HTMLOrSVGElement as SVGElement) ||
      document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (banner.created) {
      // update styles
      const bannerEl = banner.element;
      setupBannerStyles(bannerEl);
      setupLinkStyles(learnMoreLink, learnMoreId);
      setupOpenExternal(openExternalIcon, openExternalIconId);
      const closeBtn = setupCloseBtn();
      setupIconStyles(prependIcon, prependIconId);
      bannerEl.append(
        prependIcon,
        firebaseText,
        learnMoreLink,
        openExternalIcon,
        closeBtn
      );
      document.body.appendChild(bannerEl);
    }

    if (showError) {
      firebaseText.innerText = `Not using emulated backend.`;
      prependIcon.innerHTML = `<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`;
    } else {
      prependIcon.innerHTML = `<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`;
      firebaseText.innerText = 'Using emulated backend';
    }
    firebaseText.setAttribute('id', firebaseTextId);
  }
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupDom);
  } else {
    setupDom();
  }
}
