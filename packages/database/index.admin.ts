import { CONSTANTS } from '@firebase/util';
import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Database } from './src/api/Database';
import { DataSnapshot } from './src/api/DataSnapshot';
import { Query } from './src/api/Query';
import { Reference } from './src/api/Reference';
import { enableLogging } from './src/core/util/util';
import { RepoManager } from './src/core/RepoManager';
import * as INTERNAL from './src/api/internal';
import * as TEST_ACCESS from './src/api/test_access';
import './src/nodePatches';
import { setSDKVersion } from './src/core/version';

/**
 * A one off register function which returns a database based on the app and
 * passed database URL.
 *
 * @param app A valid FirebaseApp-like object
 * @param url A valid Firebase databaseURL
 */

const ServerValue = Database.ServerValue;

export function initStandalone(
  app: FirebaseApp,
  url: string,
  version: string
) {
  /**
   * This should allow the firebase-admin package to provide a custom version
   * to the backend
   */
  CONSTANTS.NODE_ADMIN = true;
  setSDKVersion(version);

  return {
    instance: RepoManager.getInstance().databaseFromApp(app, url),
    namespace: {
      Reference,
      Query,
      Database,
      DataSnapshot,
      enableLogging,
      INTERNAL,
      ServerValue,
      TEST_ACCESS
    }
  };
}