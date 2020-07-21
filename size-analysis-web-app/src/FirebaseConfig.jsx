import firebase from '@firebase/app';
import 'firebase/functions';
export const firebaseConfig = {
  apiKey: "AIzaSyCtglORaF_Dd5BWPFqewtb9zTxJF7ZaIHw",
  authDomain: "web-app-modular-size-analysis.firebaseapp.com",
  databaseURL: "https://web-app-modular-size-analysis.firebaseio.com",
  projectId: "web-app-modular-size-analysis",
  storageBucket: "web-app-modular-size-analysis.appspot.com",
  messagingSenderId: "106892363430",
  appId: "1:106892363430:web:7285676f8b5291343a5667",
  measurementId: "G-RE3DMC6WLC"
};

const fire = firebase.initializeApp(firebaseConfig);