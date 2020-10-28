/**
 * @license
 * Copyright 2020 Google LLC.
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
import * as sinonChai from 'sinon-chai';

import { FirebaseError } from '@firebase/util';
import * as utils from '@firebase/util';

import { _open, AuthPopup } from './popup';

use(sinonChai);

describe('platform_browser/util/popup', () => {
  let windowOpenStub: sinon.SinonStub;
  let popupStub: sinon.SinonStubbedInstance<Window>;

  function setUA(ua: string): void {
    sinon.stub(utils, 'getUA').returns(ua);
  }

  function windowTarget(): string {
    return windowOpenStub.firstCall.args[1];
  }

  function windowURL(): string {
    return windowOpenStub.firstCall.args[0];
  }

  function windowOptions(): string {
    return windowOpenStub.firstCall.args[2];
  }

  beforeEach(() => {
    windowOpenStub = sinon.stub(window, 'open');
    popupStub = sinon.stub(({
      focus: () => {},
      close: () => {}
    } as unknown) as Window);
    windowOpenStub.returns(popupStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('sets target to name param if not chrome UA', () => {
    setUA('notchrome');
    _open('appName', 'url', 'name');
    expect(windowTarget()).to.eq('name');
  });

  it('sets target to _blank if on chrome IOS', () => {
    setUA('crios/');
    _open('appName', 'url', 'name');
    expect(windowTarget()).to.eq('_blank');
  });

  it('sets the firefox url to a default if not provided', () => {
    setUA('firefox/');
    _open('appName');
    expect(windowURL()).to.eq('http://localhost');
  });

  it('sets the firefox url to the value provided', () => {
    setUA('firefox/');
    _open('appName', 'url');
    expect(windowURL()).to.eq('url');
  });

  it('sets non-firefox url to empty if not provided', () => {
    setUA('not-ff/');
    _open('appName');
    expect(windowURL()).to.eq('');
  });

  it('sets non-firefox url to url if not provided', () => {
    setUA('not-ff/');
    _open('appName', 'url');
    expect(windowURL()).to.eq('url');
  });

  it('sets scrollbars to yes in popup', () => {
    setUA('firefox/');
    _open('appName');
    expect(windowOptions()).to.include('scrollbars=yes');
  });

  it('errors if the popup is blocked', () => {
    setUA('');
    windowOpenStub.returns(undefined);
    expect(() => _open('appName')).to.throw(
      FirebaseError,
      'auth/popup-blocked'
    );
  });

  it('builds the proper options string', () => {
    const screen = window.screen;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (window as any).sreen = {
      availHeight: 1000,
      availWidth: 2000
    };

    setUA('');
    _open('appName');
    const options = windowOptions()
      .split(',')
      .filter(s => !!s)
      .map(prop => prop.split('='))
      .reduce<Record<string, string>>((accum, [prop, val]) => {
        accum[prop] = val;
        return accum;
      }, {});

    expect(options).to.eql({
      location: 'yes',
      resizable: 'yes',
      statusbar: 'yes',
      toolbar: 'no',
      width: '500',
      height: '600',
      top: '0',
      left: '0'
    });

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (window as any).screen = screen;
  });

  it('calls focus on the new popup', () => {
    setUA('');
    _open('appName');
    expect(popupStub.focus).to.have.been.called;
  });

  it('does not fail if window.focus errors', () => {
    popupStub.focus.throws(new Error('lol no'));
    setUA('');
    expect(() => _open('appName')).not.to.throw(Error);
  });

  context('resulting popup object', () => {
    let authPopup: AuthPopup;
    beforeEach(() => {
      setUA('');
      authPopup = _open('appName');
    });

    it('has a window object', () => {
      expect(authPopup.window).to.eq(popupStub);
    });

    it('calls through to the popup close', () => {
      authPopup.close();
      expect(popupStub.close).to.have.been.called;
    });

    it('close() does not error if underlying call errors', () => {
      popupStub.close.throws(new Error('not this time'));
      expect(() => authPopup.close()).not.to.throw(Error);
    });
  });
});
