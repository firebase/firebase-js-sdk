import firebase from '@firebase/app';
import 'firebase/functions';
export const firebaseConfig = {
  apiKey: "AIzaSyBEiEtQp-eIzG00a1EH_VdDK9jOJAx5huE",
  authDomain: "fir-size-analysis.firebaseapp.com",
  databaseURL: "https://fir-size-analysis.firebaseio.com",
  projectId: "fir-size-analysis",
  storageBucket: "fir-size-analysis.appspot.com",
  messagingSenderId: "145514503728",
  appId: "1:145514503728:web:f2cc9c3fa1ea1f42c4d7f5",
  measurementId: "G-7R46YT0MK4"
};
const fire = firebase.initializeApp(firebaseConfig);