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

import { SDK_VERSION } from '@firebase/app-exp';
import { expect } from 'chai';
import { ClientPlatform, _getClientVersion } from './version';
import { isNode } from '@firebase/util';

describe('core/util/_getClientVersion', () => {
  if (isNode()) {
    context('node', () => {
      it('should set the correct version', () => {
        expect(_getClientVersion(ClientPlatform.NODE)).to.eq(
          `Node/JsCore/${SDK_VERSION}/FirebaseCore-web`
        );
      });
    });
  } else {
    context('browser', () => {
      it('should set the correct version', () => {
        expect(_getClientVersion(ClientPlatform.BROWSER)).to.eq(
          `Chrome/JsCore/${SDK_VERSION}/FirebaseCore-web`
        );
      });
    });

    context('worker', () => {
      it('should set the correct version', () => {
        expect(_getClientVersion(ClientPlatform.WORKER)).to.eq(
          `Chrome-Worker/JsCore/${SDK_VERSION}/FirebaseCore-web`
        );
      });
    });

    context('React Native', () => {
      it('should set the correct version', () => {
        expect(_getClientVersion(ClientPlatform.REACT_NATIVE)).to.eq(
          `ReactNative/JsCore/${SDK_VERSION}/FirebaseCore-web`
        );
      });
    });
  }
});
