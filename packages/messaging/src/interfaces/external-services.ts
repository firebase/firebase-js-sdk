import { FirebaseApp } from '@firebase/app-types';
import { FirebaseInstallations } from '@firebase/installations-types';
import { FirebaseAnalyticsInternal } from '@firebase/analytics-interop-types';
import { Provider } from '@firebase/component';

export interface FirebaseInternalServices {
    app: FirebaseApp,
    installations: FirebaseInstallations,
    analyticsProvider: Provider<FirebaseAnalyticsInternal>
}