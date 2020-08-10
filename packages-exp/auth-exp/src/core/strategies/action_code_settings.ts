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

import { ActionCodeSettings } from '@firebase/auth-types-exp';

import { GetOobCodeRequest } from '../../api/authentication/email_and_password';
import { assertTypes, opt } from '../util/assert';

export function setActionCodeSettingsOnRequest(
  request: GetOobCodeRequest,
  actionCodeSettings: ActionCodeSettings
): void {
  assertTypes([actionCodeSettings], ACTION_CODE_SETTINGS_TYPE);
  request.continueUrl = actionCodeSettings.url;
  request.dynamicLinkDomain = actionCodeSettings.dynamicLinkDomain;
  request.canHandleCodeInApp = actionCodeSettings.handleCodeInApp;

  if (actionCodeSettings.iOS) {
    request.iosBundleId = actionCodeSettings.iOS.bundleId;
  }

  if (actionCodeSettings.android) {
    request.androidInstallApp = actionCodeSettings.android.installApp;
    request.androidMinimumVersionCode =
      actionCodeSettings.android.minimumVersion;
    request.androidPackageName = actionCodeSettings.android.packageName;
  }
}

const ACTION_CODE_SETTINGS_TYPE = {
  android: opt({
    installApp: opt('boolean'),
    minimumVersion: opt('string'),
    packageName: 'string'
  }),
  handleCodeInApp: opt('boolean'),
  iOS: opt({
    bundleId: 'string'
  }),
  url: 'string',
  dynamicLinkDomain: opt('string')
};
