import { firebase } from "@firebase/app";

/**
 * Assert `firebase.apps` is an array of Firebase apps
 * 
 * i.e. We should be able to access the public members
 * of the App from inside of an individual app.
 */
firebase.apps.forEach(app => {
  const _name: string = app.name;
  const _options: Object = app.options;
  const _delete: Promise<any> = app.delete();
});

/**
 * Assert the SDK_VERSION is a string by passing it to
 * regex.test
 */
const regex = /\d\.\d\.\d/;
regex.test(firebase.SDK_VERSION);

/**
 * Assert we can init w/ a partially empty config
 * object
 */
firebase.initializeApp({
  apiKey: '1234567890'
});

/**
 * Assert we can init w/ full config object
 */
firebase.initializeApp({
  apiKey: '1234567890',
  authDomain: '1234567890',
  databaseURL: '1234567890',
  projectId: '1234567890',
  storageBucket: '1234567890',
  messagingSenderId: '1234567890'
});

/**
 * Assert we can pass an optional name
 */
firebase.initializeApp({
  apiKey: '1234567890',
  authDomain: '1234567890',
  databaseURL: '1234567890',
  projectId: '1234567890',
  storageBucket: '1234567890',
  messagingSenderId: '1234567890'
}, 'Dummy Name');

/**
 * Assert we get an instance of a FirebaseApp from `firebase.app()`
 */
const app = firebase.app();

/**
 * Assert the `name` and `options` properties exist
 */
const _name: string = app.name;
const _options: Object = app.options;

/**
 * Assert the `delete` method exists and returns a `Promise`
 */
const _delete: Promise<void> = app.delete();

/**
 * Assert the `Promise` ctor mounted at `firebase.Promise` can
 * be used to create new Promises.
 */

 const promise: Promise<any> = new firebase.Promise((resolve, reject) => {
   resolve({});
   reject({});
 })
 .then()
 .catch();
