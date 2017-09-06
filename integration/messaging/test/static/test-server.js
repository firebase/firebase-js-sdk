const express = require('express');
const path = require('path');

const PORT_NUMBER = 3000;

class MessagingTestServer {
  constructor() {
    this._app = express();
    this._app.use('/', express.static(__dirname));
    this._app.use('/node_modules', express.static(path.join(__dirname, '..', '..', 'node_modules')));
    this._app.use('/', express.static(path.join(__dirname, 'shared-files')));

    this._server = null;
  }

  get serverAddress() {
    if (!this._server) {
      return null;
    }

    return `http://localhost:${PORT_NUMBER}`
  }

  start() {
    if (this._server) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this._server = this._app.listen(PORT_NUMBER, function () {
        resolve();
      });
    });
  }

  // Sometimes the server doesn't trigger the callback due to
  // currently open sockets. So call `closethis._server
  stop() {
    if (!this._server) {
      return Promise.resolve();;
    }

    this._server.close();

    return Promise.resolve();
  }
}
module.exports = new MessagingTestServer();
