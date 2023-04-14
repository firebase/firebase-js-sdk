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

import {
  FirebaseApp,
  initializeApp,
  _addOrOverwriteComponent,
  _registerComponent
} from '@firebase/app';
import {
  GreCAPTCHA,
  GreCAPTCHATopLevel,
  RECAPTCHA_ENTERPRISE_URL,
  RECAPTCHA_URL
} from '../src/recaptcha';
import {
  Provider,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import { AppCheckService } from '../src/factory';
import { AppCheck, CustomProvider } from '../src';
import { HeartbeatService } from '@firebase/app/dist/app/src/types';

export const FAKE_SITE_KEY = 'fake-site-key';

const fakeConfig = {
  apiKey: 'apiKey',
  projectId: 'projectId',
  authDomain: 'authDomain',
  messagingSenderId: 'messagingSenderId',
  databaseURL: 'databaseUrl',
  storageBucket: 'storageBucket',
  appId: '1:777777777777:web:d93b5ca1475efe57'
};

export function getFakeApp(overrides: Record<string, any> = {}): FirebaseApp {
  return {
    name: 'appName',
    options: fakeConfig,
    automaticDataCollectionEnabled: true,
    ...overrides
  };
}

export function getFakeAppCheck(app: FirebaseApp): AppCheck {
  return {
    app,
    heartbeatServiceProvider: getFakeHeartbeatServiceProvider()
  } as AppCheck;
}

export function getFullApp(): FirebaseApp {
  const app = initializeApp(fakeConfig);
  _addOrOverwriteComponent(
    app,
    //@ts-ignore
    new Component(
      'heartbeat',
      () => {
        return {
          triggerHeartbeat: () => {}
        } as any;
      },
      ComponentType.PUBLIC
    )
  );
  _registerComponent(
    new Component(
      'app-check',
      () => {
        return {} as AppCheckService;
      },
      ComponentType.PUBLIC
    )
  );
  return app;
}

export function getFakeCustomTokenProvider(): CustomProvider {
  return new CustomProvider({
    getToken: () =>
      Promise.resolve({
        token: 'fake-custom-app-check-token',
        expireTimeMillis: 1
      })
  });
}

export function getFakeHeartbeatServiceProvider(
  fakeLogString: string = 'a/1.2.3 b/2.3.4'
): Provider<'heartbeat'> {
  const container = new ComponentContainer('test');
  container.addComponent(
    new Component(
      'heartbeat',
      () =>
        ({
          getHeartbeatsHeader: () => Promise.resolve(fakeLogString)
        } as HeartbeatService),
      ComponentType.PRIVATE
    )
  );

  return container.getProvider('heartbeat');
}

export function getFakeGreCAPTCHA(
  isTopLevel: boolean = true
): GreCAPTCHATopLevel | GreCAPTCHA {
  const greCaptchaTopLevel: GreCAPTCHA = {
    ready: callback => callback(),
    render: (_container, _parameters) => 'fake_widget_1',
    execute: (_siteKey, _options) => Promise.resolve('fake_recaptcha_token')
  };
  if (isTopLevel) {
    (greCaptchaTopLevel as GreCAPTCHATopLevel).enterprise =
      getFakeGreCAPTCHA(false);
  }
  return greCaptchaTopLevel;
}

/**
 * Returns all script tags in DOM matching our reCAPTCHA url pattern.
 * Tests in other files may have inserted multiple reCAPTCHA scripts, because they don't
 * care about it.
 */
export function findgreCAPTCHAScriptsOnPage(): HTMLScriptElement[] {
  const scriptTags = window.document.getElementsByTagName('script');
  const tags = [];
  for (const tag of Object.values(scriptTags)) {
    if (
      tag.src &&
      (tag.src.includes(RECAPTCHA_URL) ||
        tag.src.includes(RECAPTCHA_ENTERPRISE_URL))
    ) {
      tags.push(tag);
    }
  }
  return tags;
}

export function removegreCAPTCHAScriptsOnPage(): void {
  const tags = findgreCAPTCHAScriptsOnPage();

  for (const tag of tags) {
    tag.remove();
  }

  if (self.grecaptcha) {
    self.grecaptcha = undefined;
  }
}
