const functions = require('firebase-functions');

exports.callTest = functions.https.onCall((data, context) => {
    return({ word: 'hellooo' });
});
