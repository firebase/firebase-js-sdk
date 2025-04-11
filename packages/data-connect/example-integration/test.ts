import { listMovies } from './dataconnect-generated/js/default-connector';
import * as json from './firebase-js-config.json';
import { initializeApp } from 'firebase/app';

initializeApp(json);
listMovies();

