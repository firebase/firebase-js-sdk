import { browserSessionPersistence } from './core/persistence/browser_session';
import { indexedDBLocalPersistence } from './core/persistence/indexed_db';
import { browserLocalPersistence } from './core/persistence/browser_local';
import { createPolyfill, firebaseApp } from './create_polyfill';

firebaseApp.auth = createPolyfill({
  // TODO: The legacy SDK migrates localStorage -> indexedDB
  persistence: [
    browserSessionPersistence,
    indexedDBLocalPersistence,
    browserLocalPersistence
  ]
});
