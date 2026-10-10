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

import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import { stubTimeouts, TimerMap } from '../../../test/helpers/timeout_stub';
import {
  _EXPIRATION_TIME_MS,
  _SOLVE_TIME_MS,
  _WIDGET_ID_START,
  MockReCaptcha,
  MockWidget,
  Widget
} from './recaptcha_mock';
import { MockInstance } from 'vitest';
describe('platform_browser/recaptcha/recaptcha_mock', () => {
  let container: HTMLElement;
  let auth: TestAuth;

  beforeEach(async () => {
    container = document.createElement('div');
    auth = await testAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MockRecaptcha', () => {
    let rc: MockReCaptcha;
    let widget: Widget;

    beforeEach(async () => {
      rc = new MockReCaptcha(auth);
      widget = {
        getResponse: vi.fn(),
        delete: vi.fn(),
        execute: vi.fn()
      };
    });

    describe('#reset', () => {
      it('resets the default widget if no id provided', () => {
        rc._widgets.set(_WIDGET_ID_START, widget);
        rc.reset();
        expect(widget.delete).toHaveBeenCalled();
        expect(rc._widgets.size).toBe(0);
      });

      it('resets and removes the widgetId only if passed in', () => {
        const widget2 = {
          getResponse: vi.fn(),
          delete: vi.fn(),
          execute: vi.fn()
        };
        rc._widgets.set(_WIDGET_ID_START, widget);
        rc._widgets.set(_WIDGET_ID_START + 1, widget2);

        rc.reset(_WIDGET_ID_START + 1);
        expect(widget2.delete).toHaveBeenCalled();
        expect(widget.delete).not.toHaveBeenCalled();
        expect(rc._widgets.get(_WIDGET_ID_START)).toBe(widget);
        expect(rc._widgets.size).toBe(1);
      });
    });

    describe('#render', () => {
      // These tests all use invisible recaptcha to prevent the mock widget
      // from setting timers
      const params = { size: 'invisible' };

      it('adds a mock widget object to the set and returns the id', () => {
        const id = rc.render(container, params);
        expect(id).toBe(_WIDGET_ID_START);
        expect(rc._widgets.get(_WIDGET_ID_START)).toBeDefined();
      });

      it('sequentially creates new widgets', () => {
        rc.render(container, params);
        rc.render(container, params);
        expect(rc._widgets.get(_WIDGET_ID_START)).toBeDefined();
        expect(rc._widgets.get(_WIDGET_ID_START + 1)).toBeDefined();
      });
    });

    describe('#getResponse', () => {
      it('returns the result from the widget if available', () => {
        (widget.getResponse as MockInstance).mockReturnValue('widget-result');
        rc._widgets.set(_WIDGET_ID_START, widget);
        expect(rc.getResponse()).toBe('widget-result');
      });

      it('returns the empty string if the widget does not exist', () => {
        expect(rc.getResponse()).toBe('');
      });
    });

    describe('#execute', () => {
      it('calls execute on the underlying widget', async () => {
        rc._widgets.set(_WIDGET_ID_START, widget);
        await rc.execute();
        expect(widget.execute).toHaveBeenCalled();
      });

      it('returns the empty string', async () => {
        expect(await rc.execute()).toBe('');
      });
    });
  });

  describe('MockWidget', () => {
    describe('#constructor', () => {
      it('errors if a bad container is passed in', () => {
        vi.spyOn(document, 'getElementById').mockReturnValue(null);
        expect(() => new MockWidget('foo', 'app-name', {})).toThrow(
          FirebaseError,
          'Firebase: Error (auth/argument-error).'
        );
      });

      it('attaches an event listener if invisible', () => {
        vi.spyOn(container, 'addEventListener');
        void new MockWidget(container, 'app-name', { size: 'invisible' });
        expect(container.addEventListener).toHaveBeenCalled();
      });
    });

    describe('#execute', () => {
      // Stub out a bunch of stuff on setTimer
      let pendingTimers: TimerMap;
      let callbacks: { [key: string]: MockInstance };
      let widget: MockWidget;
      let timeoutStub: MockInstance;

      beforeEach(() => {
        callbacks = {
          'callback': vi.fn(),
          'expired-callback': vi.fn()
        };
        pendingTimers = stubTimeouts();
        timeoutStub = window.setTimeout as unknown as MockInstance;
        widget = new MockWidget(container, auth.name, callbacks);
      });

      it('keeps re-executing with new tokens if expiring', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        pendingTimers[_EXPIRATION_TIME_MS]();
        pendingTimers[_SOLVE_TIME_MS]();
        pendingTimers[_EXPIRATION_TIME_MS]();

        expect(callbacks['callback']).toHaveBeenCalledTimes(2);
        expect(callbacks['callback'].mock.calls[0][0]).not.toBe(
          callbacks['callback'].mock.calls[1][0]
        );
      });

      it('posts callback with a random alphanumeric code', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        const arg: string = callbacks['callback'].mock.calls[0][0];
        expect(typeof arg).toBe('string');
        expect(arg.length).toBe(50);
      });

      it('expired callback does execute if just solve trips', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        expect(callbacks['callback']).toHaveBeenCalled();
        expect(callbacks['expired-callback']).not.toHaveBeenCalled();
      });

      it('expired callback executes if just expiration timer trips', () => {
        pendingTimers[_SOLVE_TIME_MS]();
        pendingTimers[_EXPIRATION_TIME_MS]();
        expect(callbacks['callback']).toHaveBeenCalled();
        expect(callbacks['expired-callback']).toHaveBeenCalled();
      });

      it('throws an error if the widget is deleted', () => {
        widget.delete();
        expect(() => widget.execute()).toThrow(Error);
      });

      it('returns immediately if timer is already in flight', () => {
        expect(timeoutStub.mock.calls.length).toBe(1);
        widget.execute();
        expect(timeoutStub.mock.calls.length).toBe(1);
      });
    });

    describe('#delete', () => {
      let widget: MockWidget;
      beforeEach(() => {
        widget = new MockWidget(container, auth.name, {});
      });

      it('throws if already deleted', () => {
        widget.delete();
        expect(() => widget.delete()).toThrow(Error);
      });

      it('clears any timeouts that are set', () => {
        const spy = vi.spyOn(window, 'clearTimeout');
        widget.delete();
        expect(spy).toHaveBeenCalled();
      });

      it('removes the event listener from the container', () => {
        const spy = vi.spyOn(container, 'removeEventListener');
        widget.delete();
        expect(spy).toHaveBeenCalled();
      });
    });
  });
});
