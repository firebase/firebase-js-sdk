const fetch = require('node-fetch');

module.exports = async (endpoint, apiBody) => {
  const response = await fetch(`${endpoint}/fcm/send`, {
    method: 'POST',
    body: JSON.stringify(apiBody),
    headers: {
      Authorization: 'key=AIzaSyCqJkOa5awRsZ-1EyuAwU4loC3YXDBouIo',
      'Content-Type': 'application/json'
    }
  });

  // FCM will return HTML if there is an error so we can't parse
  // the response as JSON, instead have to read as text, then parse
  // then handle the possible error.
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw new Error(`Unexpected response: '${responseText}'`);
  }
};
