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

import { expect, use } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {
  _generateCallbackName,
  _loadJS,
  _setExternalJSProvider
} from './load_js';
import { _createError } from '../core/util/assert';
import { AuthErrorCode } from '../core/errors';

use(sinonChai);

describe('platform-browser/load_js', () => {
  afterEach(() => sinon.restore());

  describe('_generateCallbackName', () => {
    it('generates a callback with a prefix and a number', () => {
      expect(_generateCallbackName('foo')).to.match(/__foo\d+/);
    });
  });

  describe('_loadJS', () => {
    it('sets the appropriate properties', () => {
      _setExternalJSProvider({
        loadJS(url: string): Promise<Event> {
          return new Promise((resolve, reject) => {
            const el = document.createElement('script');
            el.setAttribute('src', url);
            el.onload = resolve;
            el.onerror = e => {
              const error = _createError(AuthErrorCode.INTERNAL_ERROR);
              error.customData = e as unknown as Record<string, unknown>;
              reject(error);
            };
            el.type = 'text/javascript';
            el.charset = 'UTF-8';
          });
        }
      });
      const el = document.createElement('script');
      sinon.stub(el); // Prevent actually setting the src attribute
      sinon.stub(document, 'createElement').returns(el);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      _loadJS('http://localhost/url');
      expect(el.setAttribute).to.have.been.calledWith(
        'src',
        'http://localhost/url'
      );
      expect(el.type).to.eq('text/javascript');
      expect(el.charset).to.eq('UTF-8');
    });
  });
});
