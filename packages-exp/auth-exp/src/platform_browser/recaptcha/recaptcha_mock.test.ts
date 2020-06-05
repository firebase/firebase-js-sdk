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
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { FirebaseError } from '@firebase/util';

import { testAuth } from '../../../test/mock_auth';
import { stubTimeouts, TimerMap } from '../../../test/timeout_stub';
import { Auth } from '../../model/auth';
import {
  _EXPIRATION_TIME_MS,
  _SOLVE_TIME_MS,
  _WIDGET_ID_START,
  MockReCaptcha,
  MockWidget,
  Widget
} from './recaptcha_mock';

use(sinonChai);
use(chaiAsPromised);

describe('platform-browser/recaptcha/recaptcha_mock', () => {
  let container: HTMLElement;
  let auth: Auth;

  beforeEach(async () => {
    container = document.createElement('div');
    auth = await testAuth();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('MockRecaptcha', () => {
    let rc: MockReCaptcha;
    let widget: Widget;

    beforeEach(async () => {
      rc = new MockReCaptcha(auth);
      widget = {
        getResponse: sinon.stub(),
        delete: sinon.stub(),
        execute: sinon.stub()
      };
    });

    context('#reset', () => {
      it('resets the default widget if no id provided', () => {
        rc._widgets.set(_WIDGET_ID_START, widget);
        rc.reset();
        expect(widget.delete).to.have.been.called;
        expect(rc._widgets).to.be.empty;
      });

      it('resets and removes the widgetId only if passed in', () => {
        const widget2 = {
          getResponse: sinon.stub(),
          delete: sinon.stub(),
          execute: sinon.stub()
        };
        rc._widgets.set(_WIDGET_ID_START, widget);
        rc._widgets.set(_WIDGET_ID_START + 1, widget2);

        rc.reset(_WIDGET_ID_START + 1);
        expect(widget2.delete).to.have.been.called;
        expect(widget.delete).not.to.have.been.called;
        expect(rc._widgets.get(_WIDGET_ID_START)).to.eq(widget);
        expect(rc._widgets.size).to.eq(1);
      });
    });

    context('#render', () => {
      // These tests all use invisible recaptcha to prevent the mock widget
      // from setting timers
      const params = { size: 'invisible' };

      it('adds a mock widget object to the set and returns the id', () => {
        const id = rc.render(container, params);
        expect(id).to.eq(_WIDGET_ID_START);
        expect(rc._widgets.get(_WIDGET_ID_START)).to.not.be.undefined;
      });

      it('sequentially creates new widgets', () => {
        rc.render(container, params);
        rc.render(container, params);
        expect(rc._widgets.get(_WIDGET_ID_START)).to.not.be.undefined;
        expect(rc._widgets.get(_WIDGET_ID_START + 1)).to.not.be.undefined;
      });
    });

    context('#getResponse', () => {
      it('returns the result from the widget if available', () => {
        (widget.getResponse as sinon.SinonStub).returns('widget-result');
        rc._widgets.set(_WIDGET_ID_START, widget);
        expect(rc.getResponse()).to.eq('widget-result');
      });

      it('returns the empty string if the widget does not exist', () => {
        expect(rc.getResponse()).to.eq('');
      });
    });

    context('#execute', () => {
      it('calls execute on the underlying widget', async () => {
        rc._widgets.set(_WIDGET_ID_START, widget);
        await rc.execute();
        expect(widget.execute).to.have.been.called;
      });

      it('returns the empty string', async () => {
        expect(await rc.execute()).to.eq('');
      });
    });
  });

  describe('MockWidget', () => {
    context('#constructor', () => {
      it('errors if a bad container is passed in', () => {
        sinon.stub(document, 'getElementById').returns(null);
        expect(() => new MockWidget('foo', 'app-name', {})).to.throw(
          FirebaseError,
          'Firebase: Error (auth/argument-error).'
        );
      });

      it('attaches an event listener if invisible', () => {
        sinon.spy(container, 'addEventListener');
        void new MockWidget(container, 'app-name', { size: 'invisible' });
        expect(container.addEventListener).to.have.been.called;
      });
    });

    context('#execute', () => {
      // Stub out a bunch of stuff on setTimer
      let pendingTimers: TimerMap;
      let callbacks: { [key: string]: sinon.SinonSpy };
      let widget: MockWidget;
      let timeoutStub: sinon.SinonStub;

      beforeEach(() => {
        callbacks = {
          'callback': sinon.spy(),
          'expired-callback': sinon.spy()
        };
        pendingTimers = stubTimeouts();
        timeoutStub = (window.setTimeout as unknown) as sinon.SinonStub;
        widget = new MockWidget(container, auth.name, callbacks);
      });

      it('keeps re-executing with new tokens if expiring', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        pendingTimers[_EXPIRATION_TIME_MS]();
        pendingTimers[_SOLVE_TIME_MS]();
        pendingTimers[_EXPIRATION_TIME_MS]();

        expect(callbacks['callback']).to.have.been.calledTwice;
        expect(callbacks['callback'].getCall(0).args[0]).not.to.eq(
          callbacks['callback'].getCall(1).args[0]
        );
      });

      it('posts callback with a random alphanumeric code', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        const arg: string = callbacks['callback'].getCall(0).args[0];
        expect(arg).to.be.a('string');
        expect(arg.length).to.equal(50);
      });

      it('expired callback does execute if just solve trips', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        expect(callbacks['callback']).to.have.been.called;
        expect(callbacks['expired-callback']).not.to.have.been.called;
      });

      it('expired callback executes if just expiration timer trips', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        pendingTimers[_EXPIRATION_TIME_MS]();
        expect(callbacks['callback']).to.have.been.called;
        expect(callbacks['expired-callback']).to.have.been.called;
      });

      it('throws an error if the widget is deleted', () => {
        widget.delete();
        expect(() => widget.execute()).to.throw(Error);
      });

      it('returns immediately if timer is already in flight', () => {
        expect(timeoutStub.getCalls().length).to.eq(1);
        widget.execute();
        expect(timeoutStub.getCalls().length).to.eq(1);
      });
    });

    context('#delete', () => {
      let widget: MockWidget;
      beforeEach(() => {
        widget = new MockWidget(container, auth.name, {});
      });

      it('throws if already deleted', () => {
        widget.delete();
        expect(() => widget.delete()).to.throw(Error);
      });

      it('clears any timeouts that are set', () => {
        const spy = sinon.spy(window, 'clearTimeout');
        widget.delete();
        expect(spy).to.have.been.called;
      });

      it('removes the event listener from the container', () => {
        const spy = sinon.spy(container, 'removeEventListener');
        widget.delete();
        expect(spy).to.have.been.called;
      });
    });
  });
});
