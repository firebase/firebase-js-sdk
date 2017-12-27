import * as firebase from 'firebase';

/**
 * Verifying the namespace types are properly exposed from the `firebase`
 * package
 */
let app: firebase.app.App;
let database: firebase.database.Database;
let firestore: firebase.firestore.Firestore;
let messaging: firebase.messaging.Messaging;
let storage: firebase.storage.Storage;
