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
  _generateCallbackName,
  _loadJS,
  _setExternalJSProvider
} from './load_js';
import { _loadJSInBrowser } from './load_js_browser';

const GAPI_URL = 'https://apis.google.com/js/api.js';

describe('platform-browser/load_js', () => {
  beforeEach(() => {
    _setExternalJSProvider({
      loadJS: _loadJSInBrowser,
      gapiScript: GAPI_URL,
      recaptchaV2Script: 'https://www.google.com/recaptcha/api.js',
      recaptchaEnterpriseScript:
        'https://www.google.com/recaptcha/enterprise.js?render='
    });
  });

  afterEach(() => vi.restoreAllMocks());

  describe('_generateCallbackName', () => {
    it('generates a callback with a prefix and a number', () => {
      expect(_generateCallbackName('foo')).toMatch(/__foo\d+/);
    });
  });

  describe('_loadJS', () => {
    it('sets the appropriate properties', () => {
      const el = document.createElement('script');
      vi.spyOn(document, 'createElement').mockReturnValue(el);
      vi.spyOn(document.head, 'appendChild').mockImplementation(node => node);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      _loadJS(`${GAPI_URL}?onload=cb`);
      expect(el.src).toBe(`${GAPI_URL}?onload=cb`);
      expect(el.type).toBe('text/javascript');
      expect(el.charset).toBe('UTF-8');
      expect(document.head.appendChild).toHaveBeenCalledWith(el);
    });

    it('does not use setAttribute to set the script src', () => {
      const el = document.createElement('script');
      vi.spyOn(el, 'setAttribute');
      vi.spyOn(document, 'createElement').mockReturnValue(el);
      vi.spyOn(document.head, 'appendChild').mockImplementation(node => node);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      _loadJS(GAPI_URL);
      expect(el.setAttribute).not.toHaveBeenCalled();
    });

    it('rejects untrusted script URLs', async () => {
      vi.spyOn(document.head, 'appendChild').mockImplementation(node => node);

      await expect(_loadJS('https://evil.example/script.js')).rejects.toThrow(
        'Refusing to load untrusted script URL'
      );
      expect(document.head.appendChild).not.toHaveBeenCalled();
    });
  });
});
