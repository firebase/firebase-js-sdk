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

import { ActionCodeSettings, Auth } from '../../model/public_types';

import { GetOobCodeRequest } from '../../api/authentication/email_and_password';
import { AuthErrorCode } from '../errors';
import { _assert } from '../util/assert';

export function _setActionCodeSettingsOnRequest(
  auth: Auth,
  request: GetOobCodeRequest,
  actionCodeSettings: ActionCodeSettings
): void {
  _assert(
    actionCodeSettings.url?.length > 0,
    auth,
    AuthErrorCode.INVALID_CONTINUE_URI
  );
  _assert(
    typeof actionCodeSettings.dynamicLinkDomain === 'undefined' ||
      actionCodeSettings.dynamicLinkDomain.length > 0,
    auth,
    AuthErrorCode.INVALID_DYNAMIC_LINK_DOMAIN
  );

  request.continueUrl = actionCodeSettings.url;
  request.dynamicLinkDomain = actionCodeSettings.dynamicLinkDomain;
  request.canHandleCodeInApp = actionCodeSettings.handleCodeInApp;

  if (actionCodeSettings.iOS) {
    _assert(
      actionCodeSettings.iOS.bundleId.length > 0,
      auth,
      AuthErrorCode.MISSING_IOS_BUNDLE_ID
    );
    request.iOSBundleId = actionCodeSettings.iOS.bundleId;
  }

  if (actionCodeSettings.android) {
    _assert(
      actionCodeSettings.android.packageName.length > 0,
      auth,
      AuthErrorCode.MISSING_ANDROID_PACKAGE_NAME
    );
    request.androidInstallApp = actionCodeSettings.android.installApp;
    request.androidMinimumVersionCode =
      actionCodeSettings.android.minimumVersion;
    request.androidPackageName = actionCodeSettings.android.packageName;
  }
}
