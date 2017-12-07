const config = {
  apiKey: 'AIzaSyCaSnFca0oG_b-t-s_p9wRdr9o9aSPmolE',
  authDomain: 'fcm-sdk-testing-vapid-key.firebaseapp.com',
  databaseURL: 'https://fcm-sdk-testing-vapid-key.firebaseio.com',
  projectId: 'fcm-sdk-testing-vapid-key',
  storageBucket: '',
  messagingSenderId: '650229866790'
};

if (this['window']) {
  window.firebaseConfig = config;
} else if (this['module']) {
  module.exports = config;
} else {
  self.firebaseConfig = config;
}
