import {
  initializeFirestore,
  memoryPersistence,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot, onSnapshotsInSync,
} from "./";

const firestore = getFirestore(app);
initializeFirestore(firestore, { persistence: memoryPersistence});

const docRef = firestore.doc('collection/doc');
const unsubscribe1 = onSnapshot(docRef, (snapshot:DocumentSnapshot) => {
  //
});

const collRef = firestore.collection('collection');
const unsubscribe2 = onSnapshot(collRef, (snapshot:QuerySnapshot)=> {
  //
});

const unsubscribe3 = onSnapshotsInSync(firestore, () => {
  //
});
