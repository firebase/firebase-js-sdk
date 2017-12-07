const config = {
  apiKey: 'AIzaSyAXe2HhleSP0eGM9sFPidWIBx7eHWlV4HM',
  authDomain: 'fcm-sdk-testing-no-vapid-key.firebaseapp.com',
  databaseURL: 'https://fcm-sdk-testing-no-vapid-key.firebaseio.com',
  projectId: 'fcm-sdk-testing-no-vapid-key',
  storageBucket: '',
  messagingSenderId: '660737059320'
};

if (this['window']) {
  window.firebaseConfig = config;
} else if (this['module']) {
  module.exports = config;
} else {
  self.firebaseConfig = config;
}
