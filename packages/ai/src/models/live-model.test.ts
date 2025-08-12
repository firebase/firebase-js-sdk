/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { use, expect } from 'chai';
import sinon, { stub } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { AI } from '../public-types';
import { LiveSession } from '../methods/live-session';
import { WebSocketHandler } from '../platform/websocket';
import { GoogleAIBackend } from '../backend';
import { LiveGenerativeModel } from './live-model';
import { AIError } from '../errors';

use(sinonChai);
use(chaiAsPromised);

// A controllable mock for the WebSocketHandler interface
class MockWebSocketHandler implements WebSocketHandler {
  connect = stub().resolves();
  send = stub();
  close = stub().resolves();

  private serverMessages: unknown[] = [];
  private generatorController: {
    resolve: () => void;
    promise: Promise<void>;
  } | null = null;

  async *listen(): AsyncGenerator<unknown> {
    while (true) {
      if (this.serverMessages.length > 0) {
        yield this.serverMessages.shift();
      } else {
        const promise = new Promise<void>(resolve => {
          this.generatorController = { resolve, promise: null! };
        });
        await promise;
      }
    }
  }

  // Test method to simulate a message from the server
  simulateServerMessage(message: object): void {
    this.serverMessages.push(message);
    if (this.generatorController) {
      this.generatorController.resolve();
      this.generatorController = null;
    }
  }
}

const fakeAI: AI = {
  app: {
    name: 'DEFAULT',
    automaticDataCollectionEnabled: true,
    options: {
      apiKey: 'key',
      projectId: 'my-project',
      appId: 'my-appid'
    }
  },
  backend: new GoogleAIBackend(),
  location: 'us-central1'
};

describe('LiveGenerativeModel', () => {
  let mockHandler: MockWebSocketHandler;

  beforeEach(() => {
    mockHandler = new MockWebSocketHandler();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('connect() should call handler.connect and send setup message', async () => {
    const model = new LiveGenerativeModel(
      fakeAI,
      { model: 'my-model' },
      mockHandler
    );
    const connectPromise = model.connect();

    // Ensure connect was called before simulating server response
    expect(mockHandler.connect).to.have.been.calledOnce;

    // Wait for the setup message to be sent
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockHandler.send).to.have.been.calledOnce;
    const setupMessage = JSON.parse(mockHandler.send.getCall(0).args[0]);
    expect(setupMessage.setup.model).to.include('my-model');

    // Simulate successful handshake and resolve the promise
    mockHandler.simulateServerMessage({ setupComplete: true });
    const session = await connectPromise;
    expect(session).to.be.an.instanceOf(LiveSession);
    await session.close();
  });

  it('connect() should throw if handshake fails', async () => {
    const model = new LiveGenerativeModel(
      fakeAI,
      { model: 'my-model' },
      mockHandler
    );
    const connectPromise = model.connect();

    // Wait for setup message
    await new Promise(resolve => setTimeout(resolve, 0));

    // Simulate a failed handshake
    mockHandler.simulateServerMessage({ error: 'handshake failed' });
    await expect(connectPromise).to.be.rejectedWith(
      AIError,
      /Server connection handshake failed/
    );
  });

  it('connect() should pass through connection errors', async () => {
    mockHandler.connect.rejects(new Error('Connection refused'));
    const model = new LiveGenerativeModel(
      fakeAI,
      { model: 'my-model' },
      mockHandler
    );
    await expect(model.connect()).to.be.rejectedWith('Connection refused');
  });

  it('connect() should pass through setup parameters correctly', async () => {
    const model = new LiveGenerativeModel(
      fakeAI,
      {
        model: 'gemini-pro',
        generationConfig: { temperature: 0.8 },
        systemInstruction: { role: 'system', parts: [{ text: 'Be a pirate' }] }
      },
      mockHandler
    );
    const connectPromise = model.connect();
    await new Promise(resolve => setTimeout(resolve, 0)); // Allow async operations

    const sentData = JSON.parse(mockHandler.send.getCall(0).args[0]);
    expect(sentData.setup.generationConfig).to.deep.equal({ temperature: 0.8 });
    expect(sentData.setup.systemInstruction.parts[0].text).to.equal(
      'Be a pirate'
    );
    mockHandler.simulateServerMessage({ setupComplete: true });
    await connectPromise;
  });
});
