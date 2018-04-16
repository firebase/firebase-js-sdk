import '@firebase/polyfill';
import firebase from '@firebase/app';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import Storage from 'dom-storage';
import { XMLHttpRequest } from 'xmlhttprequest';

const _firebase = firebase as _FirebaseNamespace;

_firebase.INTERNAL.extendNamespace({
  INTERNAL: {
    node: {
      localStorage: new Storage(null, { strict: true }),
      sessionStorage: new Storage(null, { strict: true }),
      XMLHttpRequest
    }
  }
});

export default firebase;
