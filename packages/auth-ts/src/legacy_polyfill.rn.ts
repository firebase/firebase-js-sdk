import {browserSessionPersistence} from './core/persistence/browser_session';
import {indexedDBLocalPersistence} from './core/persistence/indexed_db';
import {browserLocalPersistence} from './core/persistence/browser_local';
import {createPolyfill, firebaseApp} from './create_polyfill';
import {reactNativeLocalPersistence} from './core/persistence/react_local';

firebaseApp.auth = createPolyfill({
  persistence: [
    reactNativeLocalPersistence,
    indexedDBLocalPersistence
  ]
});
