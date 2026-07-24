import firebase from '@firebase/app';
import 'firebase/functions';
export const firebaseConfig = {
  apiKey: "AIzaSyCEcME7qRy5IdImugwLzhCthCJseaAg1Vw",
  authDomain: "fir-sdk-size-analysis.firebaseapp.com",
  databaseURL: "https://fir-sdk-size-analysis.firebaseio.com",
  projectId: "fir-sdk-size-analysis",
  storageBucket: "fir-sdk-size-analysis.appspot.com",
  messagingSenderId: "737695495424",
  appId: "1:737695495424:web:de885c9f4edf7e2b912fe5"
};
const fire = firebase.initializeApp(firebaseConfig);