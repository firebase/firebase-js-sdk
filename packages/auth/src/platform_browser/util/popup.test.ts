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

import { FirebaseError } from '@firebase/util';
import * as utils from '@firebase/util';

import { _open, AuthPopup } from './popup';
import { AuthInternal } from '../../model/auth';
import { testAuth } from '../../../test/helpers/mock_auth';
import { MockInstance } from 'vitest';

vi.mock('@firebase/util', { spy: true });

describe('platform_browser/util/popup', () => {
  let windowOpenStub: MockInstance;
  let auth: AuthInternal;
  let popupStub: { focus: MockInstance; close: MockInstance } & Window;

  function setUA(ua: string): void {
    vi.spyOn(utils, 'getUA').mockReturnValue(ua);
  }

  function windowTarget(): string {
    return windowOpenStub.mock.calls[0][1];
  }

  function windowURL(): string {
    return windowOpenStub.mock.calls[0][0];
  }

  function windowOptions(): string {
    return windowOpenStub.mock.calls[0][2];
  }

  beforeEach(async () => {
    windowOpenStub = vi.spyOn(window, 'open');
    popupStub = {
      focus: vi.fn(),
      close: vi.fn()
    } as unknown as { focus: MockInstance; close: MockInstance } & Window;
    windowOpenStub.mockReturnValue(popupStub);
    auth = await testAuth();
  });

  afterEach(() => {
    sinon.restore();
    vi.restoreAllMocks();
  });

  it('sets target to name param if not chrome UA', () => {
    setUA('notchrome');
    _open(auth, 'url', 'name');
    expect(windowTarget()).toBe('name');
  });

  it('sets target to _blank if on chrome IOS', () => {
    setUA('crios/');
    _open(auth, 'url', 'name');
    expect(windowTarget()).toBe('_blank');
  });

  it('sets the firefox url to a default if not provided', () => {
    setUA('firefox/');
    _open(auth);
    expect(windowURL()).toBe('http://localhost');
  });

  it('sets the firefox url to the value provided', () => {
    setUA('firefox/');
    _open(auth, 'url');
    expect(windowURL()).toBe('url');
  });

  it('sets non-firefox url to empty if not provided', () => {
    setUA('not-ff/');
    _open(auth);
    expect(windowURL()).toBe('');
  });

  it('sets non-firefox url to url if not provided', () => {
    setUA('not-ff/');
    _open(auth, 'url');
    expect(windowURL()).toBe('url');
  });

  it('sets scrollbars to yes in popup', () => {
    setUA('firefox/');
    _open(auth);
    expect(windowOptions()).toContain('scrollbars=yes');
  });

  it('centers the popup in the screen', () => {
    vi.spyOn(window.screen, 'availHeight', 'get').mockReturnValue(1000);
    vi.spyOn(window.screen, 'availWidth', 'get').mockReturnValue(1000);
    _open(auth);
    expect(windowOptions()).toContain('top=200');
    expect(windowOptions()).toContain('left=250');
  });

  it('errors if the popup is blocked', () => {
    setUA('');
    windowOpenStub.mockReturnValue(undefined);
    expect(() => _open(auth)).toThrow(FirebaseError, 'auth/popup-blocked');
  });

  it('builds the proper options string', () => {
    vi.spyOn(window.screen, 'availHeight', 'get').mockReturnValue(1000);
    vi.spyOn(window.screen, 'availWidth', 'get').mockReturnValue(2000);

    setUA('');
    _open(auth);
    const options = windowOptions()
      .split(',')
      .filter(s => !!s)
      .map(prop => prop.split('='))
      .reduce<Record<string, string>>((accum, [prop, val]) => {
        accum[prop] = val;
        return accum;
      }, {});

    expect(options).toEqual({
      location: 'yes',
      resizable: 'yes',
      statusbar: 'yes',
      toolbar: 'no',
      width: '500',
      height: '600',
      top: '200',
      left: '750'
    });

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (window as any).screen = screen;
  });

  it('calls focus on the new popup', () => {
    setUA('');
    _open(auth);
    expect(popupStub.focus).toHaveBeenCalled();
  });

  it('does not fail if window.focus errors', () => {
    popupStub.focus.mockImplementation(() => {
      throw new Error('lol no');
    });
    setUA('');
    expect(() => _open(auth)).not.toThrow(Error);
  });

  describe('resulting popup object', () => {
    let authPopup: AuthPopup;
    beforeEach(() => {
      setUA('');
      authPopup = _open(auth);
    });

    it('has a window object', () => {
      expect(authPopup.window).toBe(popupStub);
    });

    it('calls through to the popup close', () => {
      authPopup.close();
      expect(popupStub.close).toHaveBeenCalled();
    });

    it('close() does not error if underlying call errors', () => {
      popupStub.close.mockImplementation(() => {
        throw new Error('not this time');
      });
      expect(() => authPopup.close()).not.toThrow(Error);
    });
  });
});
