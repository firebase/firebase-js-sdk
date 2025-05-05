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

function getOrCreate(id: string): { created: boolean; element: HTMLElement } {
  let parentDiv = document.getElementById(id);
  let created = false;
  if (!parentDiv) {
    parentDiv = document.createElement('div');
    parentDiv.setAttribute('id', id);
    created = true;
  }
  return { created, element: parentDiv };
}

interface EmulatorStatuses {
  [name: string]: boolean;
}
const emulatorStatus: EmulatorStatuses = {};

export interface EmulatorStatus {
  isRunningEmulator: boolean;
}

function createPopover() {
  const popover = document.createElement('div');
  popover.setAttribute('id', 'firebase__popover');
  popover.innerText = "I'm a popover!";
  popover.style.padding = '1em';
  popover.style.display = 'none';
  popover.style.position = 'absolute';
  popover.style.top = '50px';
  return popover;
}

function createFirebaseEl() {
  const firebaseIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  firebaseIcon.setAttribute('width', '25');
  firebaseIcon.setAttribute('height', '25');
  firebaseIcon.setAttribute('viewBox', '0 0 600 600');
  firebaseIcon.setAttribute('fill', 'none');

  firebaseIcon.setAttribute('xlmns', 'http://www.w3.org/2000/svg');
  firebaseIcon.innerHTML =
    '<path d="M518.293 327.327V327.152C518.29 327.087 518.29 327.021 518.293 326.955C513.042 292.744 499.418 261.23 481.346 232.883C479.073 229.299 476.709 225.776 474.292 222.275C473.12 220.578 471.93 218.896 470.723 217.229C447.484 184.98 374.082 97.3028 335.522 51.5891C320.935 34.2901 311.335 23 311.335 23C306.986 26.4856 302.735 30.0822 298.582 33.79L298.438 33.9188C268.366 62.0273 243.429 95.1671 224.749 131.848L224.689 131.961C221.092 139.034 217.733 146.232 214.611 153.557C207.388 170.525 201.518 188.038 197.054 205.931C194.347 216.746 192.154 227.751 190.477 238.945C181.248 237.435 171.926 236.559 162.578 236.323C160.809 236.278 159.041 236.255 157.273 236.255C141.997 236.244 126.767 237.947 111.87 241.332C102.752 256.057 95.4109 271.812 90.0022 288.266C82.691 310.534 78.9771 333.826 79.0001 357.264C79.0001 464.392 155.334 553.706 256.581 573.747C270.78 576.56 285.221 577.974 299.696 577.968C302.553 577.968 305.394 577.907 308.228 577.809C315.669 577.516 323.006 576.869 330.24 575.869C347.097 573.532 363.625 569.245 379.493 563.094C383.721 561.457 387.883 559.689 391.98 557.79C467.753 522.851 520.392 446.199 520.392 357.264C520.363 347.249 519.662 337.248 518.293 327.327ZM228.462 525.692C206.732 516.512 186.992 503.2 170.337 486.495C153.636 469.84 140.327 450.103 131.147 428.377C121.624 405.87 116.743 381.673 116.796 357.234C116.742 332.793 121.623 308.593 131.147 286.083C132.662 282.466 134.302 278.915 136.065 275.43C143.07 274.551 150.123 274.111 157.182 274.111C167.114 274.11 177.025 274.988 186.802 276.733C186.59 281.666 186.484 286.644 186.484 291.637C186.35 384.538 222.981 473.718 288.376 539.703C267.751 538.489 247.486 533.75 228.462 525.692ZM309.539 507.06C305.104 502.347 300.838 497.512 296.741 492.557C277.101 468.917 261.052 442.512 249.11 414.192C232.7 375.411 224.285 333.717 224.37 291.607C224.37 290.46 224.37 289.316 224.37 288.175C243.143 296.502 260.212 308.232 274.714 322.773C297.198 345.136 312.765 373.502 319.556 404.478C322.124 416.25 323.414 428.263 323.405 440.311C323.476 463.278 318.772 486.008 309.592 507.06H309.539ZM482.612 363.561C481.454 397.93 470.608 431.273 451.325 459.747C435.654 482.871 414.924 502.124 390.707 516.046L390.464 515.933C384.1 519.579 377.521 522.838 370.763 525.692C362.345 529.254 353.67 532.175 344.811 534.429C343.235 534.833 341.654 535.212 340.068 535.565C339.212 535.762 338.363 535.952 337.507 536.126C337.84 535.52 338.166 534.891 338.484 534.27C338.977 533.323 339.462 532.375 339.932 531.421C345.716 519.852 350.375 507.753 353.843 495.292C358.821 477.405 361.337 458.923 361.322 440.357C361.329 426.85 360.002 413.375 357.359 400.129C343.319 329.918 293.263 272.725 227.28 248.583C230.32 226.251 235.774 204.316 243.548 183.161C245.291 178.428 247.148 173.727 249.118 169.06C252.088 162.028 255.301 155.133 258.756 148.374C258.777 148.34 258.794 148.305 258.809 148.268C260.226 145.32 261.688 142.418 263.204 139.524C275.098 116.875 290.091 95.9959 307.751 77.4882L308.046 77.8445C323.701 96.4088 344.652 121.384 365.52 146.548C376.196 159.429 386.85 172.363 396.761 184.525C415.348 207.34 431.321 227.435 439.952 239.369C441.187 241.082 442.392 242.787 443.574 244.514C455.97 262.51 465.548 280.704 472.041 298.7C476.17 310.046 479.147 321.779 480.93 333.722V333.873C482.388 343.698 482.956 353.634 482.627 363.561H482.612Z" fill="#1F1F1F"/>';
  return firebaseIcon;
}
export function updateStatus(name: string, isRunningEmulator: boolean) {
  if (emulatorStatus[name] === isRunningEmulator) {
    // No rerendering required
    return;
  }
  emulatorStatus[name] = isRunningEmulator;

  function setDarkMode(el: HTMLElement) {
    el.setAttribute(
      'style',
      'position: fixed; bottom: 0px; border: solid 1px; width: 100%; border-radius: 10px; padding: .5em; text-align: center; background: black; color: white;'
    );
  }
  function setLightMode(el: HTMLElement) {
    el.setAttribute(
      'style',
      'position: fixed; bottom: 0px; border: solid 1px; width: 100%; border-radius: 10px; padding: .5em; text-align: center; background: #e9f1fe; color: black;'
    );
  }
  function setupDom() {
    const parentDivId = `__firebase_status`;

    let { element: parentDiv, created } = getOrCreate(parentDivId);

    if (created) {
      parentDiv.classList.add('firebase-emulator-warning');
      document.body.appendChild(parentDiv);
    }
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', event => {
        event.matches ? setDarkMode(parentDiv) : setLightMode(parentDiv);
      });

    const paragraph = document.createElement('p');
    const anchor = document.createElement('a');
    if (isRunningEmulator) {
      paragraph.innerHTML = 'Running in local emulator';
      const firstDashIdx = window.location.host.indexOf('-');
      const emulatorHostPort = '4000';
      anchor.href = `${emulatorHostPort}-${window.location.host.substring(
        firstDashIdx
      )}`;
    } else {
      paragraph.innerHTML = 'Emulator disconnected';
      anchor.innerHTML = 'Learn more';
    }
    const banner = getOrCreate('firebase__banner');
    if (banner.created) {
      // update styles
      const bannerEl = banner.element;
      bannerEl.style.display = 'flex';
      bannerEl.style.background = '#7faaf0';
      bannerEl.style.position = 'absolute';
      bannerEl.style.bottom = '0';
      const popOver = createPopover();
      // TODO(mtewani): Light vs dark mode
      const firebaseIcon = createFirebaseEl();
      const firebaseText = document.createElement('span');
      firebaseText.setAttribute('style', 'align-content: center');
      firebaseText.innerText = 'Firebase: ';
      const statusEl = document.createElement('span');
      updateStatusCount(statusEl);
      bannerEl.appendChild(firebaseIcon);
      bannerEl.appendChild(firebaseText);
      bannerEl.appendChild(popOver);
      bannerEl.appendChild(statusEl);
      banner.element.onclick = () => {
        const popover = document.getElementById('firebase__popover');
        if (popover) {
          if (popover?.style.display === 'none') {
            popover.style.display = 'flex';
          } else {
            popover.style.display = 'none';
          }
        }
      };
      document.body.appendChild(banner.element);
    }
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', setupDom);
    } else {
      setupDom();
    }
  }
}

function updateStatusCount(element: HTMLElement) {
  const products = Object.keys(emulatorStatus);
  let prodCount = 0;
  let localCount = 0;
  for(let product in products) {
    if(emulatorStatus[product]) {
      localCount++;
    } else {
      prodCount++;
    }
  }
  element.innerText = `Prod (${prodCount}) Local (${localCount})`;
}
