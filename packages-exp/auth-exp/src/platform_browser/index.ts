import { FirebaseApp, getApp, _getProvider } from '@firebase/app-exp';

import { initializeAuth } from '..';
import { registerAuth } from '../core/auth/register';
import { ClientPlatform } from '../core/util/version';
import { browserLocalPersistence } from './persistence/local_storage';
import { browserSessionPersistence } from './persistence/session_storage';
import { indexedDBLocalPersistence } from './persistence/indexed_db';
import { browserPopupRedirectResolver } from './popup_redirect';
import { Auth } from '../model/public_types';

/**
 * Returns the Auth instance associated with the provided {@link @firebase/app#FirebaseApp}.
 * If no instance exists, initializes an Auth instance with platform-specific default dependencies.
 *
 * @param app - The Firebase App.
 *
 * @public
 */
 export function getAuth(app: FirebaseApp = getApp()): Auth {
  const provider = _getProvider(app, 'auth-exp');

  if (provider.isInitialized()) {
    return provider.getImmediate();
  }

  return initializeAuth(app, {
    popupRedirectResolver: browserPopupRedirectResolver,
    persistence: [
      indexedDBLocalPersistence,
      browserLocalPersistence,
      browserSessionPersistence
    ]
  });
}

registerAuth(ClientPlatform.BROWSER);
