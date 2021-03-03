import * as path from 'path';
import * as express from 'express';
import { Server } from 'http';

const PORT_NUMBER = '4100';

const INTEGRATION_TEST_ASSETS = express.static(
  path.join(
    // process.env.PWD == packages-exp/auth-exp
    process.env.PWD!,
    'test/integration/webdriver/static'
  )
);

/** Simple express server for serving up the static files for testing */
class AuthTestServer {
  private app = express();
  private server: Server|null = null;

  constructor() {
    this.app.use([INTEGRATION_TEST_ASSETS]);
  }
  
  get address(): string|null {
    return this.server ? `http://localhost:${PORT_NUMBER}` : null;
  }

  async start(): Promise<void> {
    if (this.server) {
      return;
    }

    return new Promise(resolve => {
      this.server = this.app.listen(PORT_NUMBER, resolve);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

export const authTestServer = new AuthTestServer();