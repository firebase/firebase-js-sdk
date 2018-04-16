import '@firebase/polyfill';
import firebase from '@firebase/app';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { AsyncStorage } from 'react-native';

const _firebase = firebase as _FirebaseNamespace;

_firebase.INTERNAL.extendNamespace({
  INTERNAL: {
    reactNative: {
      AsyncStorage
    }
  }
});

export default firebase;
