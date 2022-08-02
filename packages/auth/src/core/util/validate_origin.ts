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

import { _getProjectConfig } from '../../api/project_config/get_project_config';
import { AuthInternal } from '../../model/auth';
import { AuthErrorCode } from '../errors';
import { _fail } from './assert';
import { _getCurrentUrl } from './location';

const IP_ADDRESS_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const HTTP_REGEX = /^https?/;

export async function _validateOrigin(auth: AuthInternal): Promise<void> {
  // Skip origin validation if we are in an emulated environment
  if (auth.config.emulator) {
    return;
  }

  const { authorizedDomains } = await _getProjectConfig(auth);

  for (const domain of authorizedDomains) {
    try {
      if (matchDomain(domain)) {
        return;
      }
    } catch {
      // Do nothing if there's a URL error; just continue searching
    }
  }

  // In the old SDK, this error also provides helpful messages.
  _fail(auth, AuthErrorCode.INVALID_ORIGIN);
}

function matchDomain(expected: string): boolean {
  const currentUrl = _getCurrentUrl();
  const { protocol, hostname } = new URL(currentUrl);
  if (expected.startsWith('chrome-extension://')) {
    const ceUrl = new URL(expected);

    if (ceUrl.hostname === '' && hostname === '') {
      // For some reason we're not parsing chrome URLs properly
      return (
        protocol === 'chrome-extension:' &&
        expected.replace('chrome-extension://', '') ===
          currentUrl.replace('chrome-extension://', '')
      );
    }

    return protocol === 'chrome-extension:' && ceUrl.hostname === hostname;
  }

  if (!HTTP_REGEX.test(protocol)) {
    return false;
  }

  if (IP_ADDRESS_REGEX.test(expected)) {
    // The domain has to be exactly equal to the pattern, as an IP domain will
    // only contain the IP, no extra character.
    return hostname === expected;
  }

  // Dots in pattern should be escaped.
  const escapedDomainPattern = expected.replace(/\./g, '\\.');
  // Non ip address domains.
  // domain.com = *.domain.com OR domain.com
  const re = new RegExp(
    '^(.+\\.' + escapedDomainPattern + '|' + escapedDomainPattern + ')$',
    'i'
  );
  return re.test(hostname);
}
