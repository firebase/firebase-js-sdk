import { GetOobCodeRequest } from '../api/authentication';

export interface ActionCodeSettings {
  android?: {
    installApp?: boolean;
    minimumVersion?: string;
    packageName: string;
  };
  handleCodeInApp?: boolean;
  iOS?: {
    bundleId: string;
    appStoreId: string;
  };
  url: string;
  dynamicLinkDomain?: string;
}

export function setActionCodeSettingsOnRequest(
  request: GetOobCodeRequest,
  actionCodeSettings: ActionCodeSettings
): void {
  request.continueUrl = actionCodeSettings.url;
  request.dynamicLinkDomain = actionCodeSettings.dynamicLinkDomain;
  request.canHandleCodeInApp = actionCodeSettings.handleCodeInApp;

  if (actionCodeSettings.iOS) {
    request.iosBundleId = actionCodeSettings.iOS.bundleId;
    request.iosAppStoreId = actionCodeSettings.iOS.appStoreId;
  }

  if (actionCodeSettings.android) {
    request.androidInstallApp = actionCodeSettings.android.installApp;
    request.androidMinimumVersionCode =
      actionCodeSettings.android.minimumVersion;
    request.androidPackageName = actionCodeSettings.android.packageName;
  }
}
