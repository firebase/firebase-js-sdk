import firebase from '@firebase/app';
import 'firebase/functions';
export const firebaseConfig = {
  apiKey: "AIzaSyAHVFTx8JcgKAIY22_tdXwwZHbi-txE03M",
  authDomain: "web-app-size-analysis.firebaseapp.com",
  databaseURL: "https://web-app-size-analysis.firebaseio.com",
  projectId: "web-app-size-analysis",
  storageBucket: "web-app-size-analysis.appspot.com",
  messagingSenderId: "151230240052",
  appId: "1:151230240052:web:d48ef603ef709809934161",
  measurementId: "G-MFTZDGSG8M"
};
const fire = firebase.initializeApp(firebaseConfig);