import { ClientRequest, IncomingMessage } from 'http';

const https = require('https');

async function logChangesets() {
  if (!process.env.GITHUB_EVENT_PATH) return;

  const prPayload = require(process.env.GITHUB_EVENT_PATH);

  if (prPayload.title !== 'Version Packages') return;

  const matches = prPayload.body.match(/## firebase@([\d\.]+)/);
  const version = matches[1];
  
  const data = JSON.stringify({
    version,
    pr: prPayload.number
  });

  const options = {
    hostname: 'us-central1-feature-tracker-8ca2b.cloudfunctions.net',
    path: '/logChangesetPR',
    port: 443,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req: ClientRequest = https.request(options, (res: IncomingMessage) => {
      res.on('data', d => {
        process.stdout.write(d);
      });
      res.on('end', resolve);
    });
  
    req.on('error', error => reject(error));
  
    req.write(data);
    req.end();
  });
}

logChangesets();