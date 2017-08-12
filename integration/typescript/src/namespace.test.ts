import * as firebase from 'firebase';
import * as namespaceDefinition from './namespaceDefinition.json';
import * as validateNamespace from './validator';

firebase.initializeApp({
  apiKey: 'test-api-key',
  authDomain: 'test-project-name.firebaseapp.com',
  databaseURL: 'https://test-project-name.firebaseio.com',
  projectId: 'test-project-name',
  storageBucket: 'test-project-name.appspot.com',
  messagingSenderId: '012345678910'
});

describe('Firebase Namespace Validation', function() {
  validateNamespace(namespaceDefinition, firebase);
});
