import firebase from 'firebase/app';
import '@firebase/firestore';

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

  (db as any).loadBundle(
    '136{"metadata":{"id":"test-bundle","createTime":{"seconds":1598032960,"nanos":299528000},"version":1,"totalDocuments":1,"totalBytes":1419}}358{"namedQuery":{"name":"limitQuery","bundledQuery":{"parent":"projects/fireeats-97d5e/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"node_4.2.0_uPypnKxZaMqgDXCwhJSe"}],"orderBy":[{"field":{"fieldPath":"sort"},"direction":"DESCENDING"}],"limit":{"value":1}},"limitType":"FIRST"},"readTime":{"seconds":1598032960,"nanos":215513000}}}362{"namedQuery":{"name":"limitToLastQuery","bundledQuery":{"parent":"projects/fireeats-97d5e/databases/(default)/documents","structuredQuery":{"from":[{"collectionId":"node_4.2.0_uPypnKxZaMqgDXCwhJSe"}],"orderBy":[{"field":{"fieldPath":"sort"},"direction":"ASCENDING"}],"limit":{"value":1}},"limitType":"LAST"},"readTime":{"seconds":1598032960,"nanos":299528000}}}232{"documentMetadata":{"name":"projects/fireeats-97d5e/databases/(default)/documents/node_4.2.0_uPypnKxZaMqgDXCwhJSe/doc4","readTime":{"seconds":1598032960,"nanos":299528000},"exists":true,"queries":["limitQuery","limitToLastQuery"]}}455{"document":{"name":"projects/fireeats-97d5e/databases/(default)/documents/node_4.2.0_uPypnKxZaMqgDXCwhJSe/doc4","createTime":{"_seconds":1598032960,"_nanoseconds":105293000},"updateTime":{"_seconds":1598032960,"_nanoseconds":105293000},"fields":{"sort":{"integerValue":"4","valueType":"integerValue"},"name":{"stringValue":"4","valueType":"stringValue"},"value":{"timestampValue":{"seconds":"1598032960","nanos":66000000},"valueType":"timestampValue"}}}}'
  ).onProgress(p => console.log(JSON.stringify(p)));

  const querySnap = await  db.collection('node_4.2.0_uPypnKxZaMqgDXCwhJSe').get({source: 'cache'});
  console.log(`${JSON.stringify(querySnap.docs.map(d => d.data()))}`);
}

main();
