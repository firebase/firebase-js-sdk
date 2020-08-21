import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDDoNfR79y6dHVOskl1muwOxu_iQru2W1g",
  authDomain: "fireeats-97d5e.firebaseapp.com",
  databaseURL: "https://fireeats-97d5e.firebaseio.com",
  projectId: "fireeats-97d5e",
  storageBucket: "fireeats-97d5e.appspot.com",
  messagingSenderId: "752235126292",
  appId: "1:752235126292:web:3692e4c69e8e5b500c9101"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(app);

async function main() {
  const doc = db.doc('firestore-loadlock-demo/doc');
  await doc.set({foo:'bar'});
  const snap = await doc.get();
  console.log(snap.data());
  console.log(db.clearPersistence);

  console.log(db.loadBundle);
  db.loadBundle('testing');
}

main();
