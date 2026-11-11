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

import {
  _TRUSTED_TYPES_POLICY_NAME,
  _createTrustedScriptURL,
  _resetTrustedTypesPolicyForTesting,
  _setTrustedScriptSrc
} from './trustedTypes';
import { logger } from './logger';

const GAPI_URL = 'https://apis.google.com/js/api.js';

describe('Trusted Types', () => {
  beforeEach(() => {
    _resetTrustedTypesPolicyForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    _resetTrustedTypesPolicyForTesting();
  });

  describe('_createTrustedScriptURL', () => {
    it('allows the known script URLs, with or without a query string', () => {
      for (const url of [
        'https://www.googletagmanager.com/gtag/js?l=dataLayer&id=G-123',
        GAPI_URL,
        `${GAPI_URL}?onload=cb`,
        'https://www.google.com/recaptcha/api.js?render=explicit&hl=en',
        'https://www.google.com/recaptcha/enterprise.js?render=siteKey'
      ]) {
        expect(_createTrustedScriptURL(url)).toBe(url);
      }
    });

    it('rejects other URLs', () => {
      for (const url of [
        'https://evil.example/script.js',
        `${GAPI_URL}.evil.example`,
        `${GAPI_URL}x`,
        `${GAPI_URL}/../evil.js`,
        'http://apis.google.com/js/api.js',
        'https://apis.google.com/js/other.js'
      ]) {
        expect(() => _createTrustedScriptURL(url)).toThrow(
          'Refusing to load untrusted script URL'
        );
      }
    });
  });

  describe('_setTrustedScriptSrc', () => {
    it('sets the script src', () => {
      const script = document.createElement('script');
      _setTrustedScriptSrc(script, `${GAPI_URL}?onload=cb`);
      expect(script.src).toBe(`${GAPI_URL}?onload=cb`);
    });

    it('does not use setAttribute', () => {
      const script = document.createElement('script');
      vi.spyOn(script, 'setAttribute');
      _setTrustedScriptSrc(script, GAPI_URL);
      expect(script.setAttribute).not.toHaveBeenCalled();
    });

    it('passes the URL through the Firebase policy, created only once', () => {
      const createScriptURL = vi.fn((url: string) => ({
        toString: () => url
      }));
      const createPolicy = vi.fn().mockReturnValue({ createScriptURL });
      vi.stubGlobal('trustedTypes', { createPolicy });

      const script = document.createElement('script');
      _setTrustedScriptSrc(script, `${GAPI_URL}?onload=cb`);
      _setTrustedScriptSrc(document.createElement('script'), GAPI_URL);

      expect(createPolicy).toHaveBeenCalledTimes(1);
      expect(createPolicy).toHaveBeenCalledWith(_TRUSTED_TYPES_POLICY_NAME, {
        createScriptURL: _createTrustedScriptURL
      });
      expect(createScriptURL).toHaveBeenCalledWith(`${GAPI_URL}?onload=cb`);
      expect(script.src).toBe(`${GAPI_URL}?onload=cb`);
    });

    it('throws if the policy rejects the URL', () => {
      vi.stubGlobal('trustedTypes', {
        createPolicy: (
          _name: string,
          options: { createScriptURL: (url: string) => string }
        ) => options
      });
      const script = document.createElement('script');
      expect(() =>
        _setTrustedScriptSrc(script, 'https://evil.example/script.js')
      ).toThrow('Refusing to load untrusted script URL');
      expect(script.src).toBe('');
    });

    it('throws for untrusted URLs when Trusted Types are unavailable', () => {
      vi.stubGlobal('trustedTypes', undefined);
      const script = document.createElement('script');
      expect(() =>
        _setTrustedScriptSrc(script, 'https://evil.example/script.js')
      ).toThrow('Refusing to load untrusted script URL');
      expect(script.src).toBe('');
    });

    it('throws for untrusted URLs without logging when the policy cannot be created', () => {
      vi.stubGlobal('trustedTypes', {
        createPolicy: () => {
          throw new TypeError('Policy not allowed by CSP');
        }
      });
      const loggerError = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {});
      const script = document.createElement('script');
      expect(() =>
        _setTrustedScriptSrc(script, 'https://evil.example/script.js')
      ).toThrow('Refusing to load untrusted script URL');
      expect(script.src).toBe('');
      expect(loggerError).not.toHaveBeenCalled();
    });

    it('falls back to a plain string if the policy cannot be created', () => {
      vi.stubGlobal('trustedTypes', {
        createPolicy: () => {
          throw new TypeError('Policy not allowed by CSP');
        }
      });
      const script = document.createElement('script');
      _setTrustedScriptSrc(script, GAPI_URL);
      expect(script.src).toBe(GAPI_URL);
    });

    it('logs the policy name to allow if Trusted Types block the script', () => {
      vi.stubGlobal('trustedTypes', {
        createPolicy: () => {
          throw new TypeError('Policy not allowed by CSP');
        }
      });
      const script = document.createElement('script');
      const blockedError = new TypeError(
        'This document requires TrustedScriptURL'
      );
      Object.defineProperty(script, 'src', {
        set: () => {
          throw blockedError;
        }
      });
      const loggerError = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {});

      expect(() => _setTrustedScriptSrc(script, GAPI_URL)).toThrow(
        blockedError
      );
      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          `add "${_TRUSTED_TYPES_POLICY_NAME}" to the trusted-types directive`
        )
      );
    });

    it('does not log if setting src fails for another reason', () => {
      vi.stubGlobal('trustedTypes', undefined);
      const script = document.createElement('script');
      Object.defineProperty(script, 'src', {
        set: () => {
          throw new TypeError('Some other failure');
        }
      });
      const loggerError = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => {});

      expect(() => _setTrustedScriptSrc(script, GAPI_URL)).toThrow(
        'Some other failure'
      );
      expect(loggerError).not.toHaveBeenCalled();
    });
  });
});
