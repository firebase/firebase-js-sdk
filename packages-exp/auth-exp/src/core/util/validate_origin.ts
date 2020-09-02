import { _getProjectConfig } from '../../api/project_config/get_project_config';
import { Auth } from '../../model/auth';
import { AuthErrorCode } from '../errors';
import { fail } from './assert';
import { _getCurrentUrl } from './location';

const IP_ADDRESS_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const HTTP_REGEX = /^https?/;

export async function _validateOrigin(auth: Auth): Promise<void> {
  const {authorizedDomains} = await _getProjectConfig(auth);

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
  fail(AuthErrorCode.INVALID_ORIGIN, {appName: auth.name});
}

function matchDomain(expected: string): boolean {
  const currentUrl = _getCurrentUrl();
  const {protocol, hostname} = new URL(currentUrl);
  if (expected.startsWith('chrome-extension://')) {
    const ceUrl = new URL(expected);
    
    if (ceUrl.hostname === '' && hostname === '') {
      // For some reason we're not parsing chrome URLs properly
      return protocol === 'chrome-extension:' &&
          expected.replace('chrome-extension://', '') ===
          currentUrl.replace('chrome-extension://', '');
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
      'i');
  return re.test(hostname);
}