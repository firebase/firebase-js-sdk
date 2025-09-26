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

import { expect, use } from 'chai';
import { spy, stub } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {
  FunctionResponse,
  LiveResponseType,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation
} from '../types';
import { LiveSession } from './live-session';
import { WebSocketHandler } from '../websocket';
import { AIError } from '../errors';
import { logger } from '../logger';

use(sinonChai);
use(chaiAsPromised);

class MockWebSocketHandler implements WebSocketHandler {
  connect = stub().resolves();
  send = spy();
  close = stub().resolves();

  private messageQueue: unknown[] = [];
  private streamClosed = false;
  private listenerPromiseResolver: (() => void) | null = null;

  async *listen(): AsyncGenerator<unknown> {
    while (!this.streamClosed) {
      if (this.messageQueue.length > 0) {
        yield this.messageQueue.shift();
      } else {
        // Wait until a new message is pushed or the stream is ended.
        await new Promise<void>(resolve => {
          this.listenerPromiseResolver = resolve;
        });
      }
    }
  }

  simulateServerMessage(message: object): void {
    this.messageQueue.push(message);
    if (this.listenerPromiseResolver) {
      // listener is waiting for our message
      this.listenerPromiseResolver();
      this.listenerPromiseResolver = null;
    }
  }

  endStream(): void {
    this.streamClosed = true;
    if (this.listenerPromiseResolver) {
      this.listenerPromiseResolver();
      this.listenerPromiseResolver = null;
    }
  }
}

describe('LiveSession', () => {
  let mockHandler: MockWebSocketHandler;
  let session: LiveSession;
  let serverMessagesGenerator: AsyncGenerator<unknown>;

  beforeEach(() => {
    mockHandler = new MockWebSocketHandler();
    serverMessagesGenerator = mockHandler.listen();
    session = new LiveSession(mockHandler, serverMessagesGenerator);
  });

  describe('send()', () => {
    it('should format and send a valid text message', async () => {
      await session.send('Hello there');
      expect(mockHandler.send).to.have.been.calledOnce;
      const sentData = JSON.parse(mockHandler.send.getCall(0).args[0]);
      expect(sentData).to.deep.equal({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: 'Hello there' }] }],
          turnComplete: true
        }
      });
    });

    it('should format and send a message with an array of Parts', async () => {
      const parts = [
        { text: 'Part 1' },
        { inlineData: { mimeType: 'image/png', data: 'base64==' } }
      ];
      await session.send(parts);
      expect(mockHandler.send).to.have.been.calledOnce;
      const sentData = JSON.parse(mockHandler.send.getCall(0).args[0]);
      expect(sentData.clientContent.turns[0].parts).to.deep.equal(parts);
    });
  });

  describe('sendMediaChunks()', () => {
    it('should send a correctly formatted realtimeInput message', async () => {
      const chunks = [{ data: 'base64', mimeType: 'audio/webm' }];
      await session.sendMediaChunks(chunks);
      expect(mockHandler.send).to.have.been.calledOnce;
      const sentData = JSON.parse(mockHandler.send.getCall(0).args[0]);
      expect(sentData).to.deep.equal({
        realtimeInput: { mediaChunks: chunks }
      });
    });
  });

  describe('sendMediaStream()', () => {
    it('should send multiple chunks from a stream', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({ data: 'chunk1', mimeType: 'audio/webm' });
          controller.enqueue({ data: 'chunk2', mimeType: 'audio/webm' });
          controller.close();
        }
      });

      await session.sendMediaStream(stream);

      expect(mockHandler.send).to.have.been.calledTwice;
      const firstCall = JSON.parse(mockHandler.send.getCall(0).args[0]);
      const secondCall = JSON.parse(mockHandler.send.getCall(1).args[0]);
      expect(firstCall.realtimeInput.mediaChunks[0].data).to.equal('chunk1');
      expect(secondCall.realtimeInput.mediaChunks[0].data).to.equal('chunk2');
    });

    it('should re-throw an AIError if the stream reader throws', async () => {
      const errorStream = new ReadableStream({
        pull(controller) {
          controller.error(new Error('Stream failed!'));
        }
      });
      await expect(session.sendMediaStream(errorStream)).to.be.rejectedWith(
        AIError,
        /Stream failed!/
      );
    });
  });

  describe('sendFunctionResponses()', () => {
    it('should send all function responses', async () => {
      const functionResponses: FunctionResponse[] = [
        {
          id: 'function-call-1',
          name: 'function-name',
          response: {
            result: 'foo'
          }
        },
        {
          id: 'function-call-2',
          name: 'function-name-2',
          response: {
            result: 'bar'
          }
        }
      ];
      await session.sendFunctionResponses(functionResponses);
      expect(mockHandler.send).to.have.been.calledOnce;
      const sentData = JSON.parse(mockHandler.send.getCall(0).args[0]);
      expect(sentData).to.deep.equal({
        toolResponse: {
          functionResponses
        }
      });
    });
  });

  describe('receive()', () => {
    it('should correctly parse and transform all server message types', async () => {
      const receivePromise = (async () => {
        const responses = [];
        for await (const response of session.receive()) {
          responses.push(response);
        }
        return responses;
      })();

      mockHandler.simulateServerMessage({
        serverContent: { modelTurn: { parts: [{ text: 'response 1' }] } }
      });
      mockHandler.simulateServerMessage({
        toolCall: { functionCalls: [{ name: 'test_func' }] }
      });
      mockHandler.simulateServerMessage({
        toolCallCancellation: { functionIds: ['123'] }
      });
      mockHandler.simulateServerMessage({
        serverContent: { turnComplete: true }
      });
      await new Promise<void>(r => setTimeout(() => r(), 10)); // Wait for the listener to process messages
      mockHandler.endStream();

      const responses = await receivePromise;
      expect(responses).to.have.lengthOf(4);
      expect(responses[0]).to.deep.equal({
        type: LiveResponseType.SERVER_CONTENT,
        modelTurn: { parts: [{ text: 'response 1' }] }
      } as LiveServerContent);
      expect(responses[1]).to.deep.equal({
        type: LiveResponseType.TOOL_CALL,
        functionCalls: [{ name: 'test_func' }]
      } as LiveServerToolCall);
      expect(responses[2]).to.deep.equal({
        type: LiveResponseType.TOOL_CALL_CANCELLATION,
        functionIds: ['123']
      } as LiveServerToolCallCancellation);
    });

    it('should log a warning and skip messages that are not objects', async () => {
      const loggerStub = stub(logger, 'warn');
      const receivePromise = (async () => {
        const responses = [];
        for await (const response of session.receive()) {
          responses.push(response);
        }
        return responses;
      })();

      mockHandler.simulateServerMessage(null as any);
      mockHandler.simulateServerMessage('not an object' as any);
      await new Promise<void>(r => setTimeout(() => r(), 10)); // Wait for the listener to process messages
      mockHandler.endStream();

      const responses = await receivePromise;
      expect(responses).to.be.empty;
      expect(loggerStub).to.have.been.calledTwice;
      expect(loggerStub).to.have.been.calledWithMatch(
        /Received an invalid message/
      );

      loggerStub.restore();
    });

    it('should log a warning and skip objects of unknown type', async () => {
      const loggerStub = stub(logger, 'warn');
      const receivePromise = (async () => {
        const responses = [];
        for await (const response of session.receive()) {
          responses.push(response);
        }
        return responses;
      })();

      mockHandler.simulateServerMessage({ unknownType: { data: 'test' } });
      await new Promise<void>(r => setTimeout(() => r(), 10)); // Wait for the listener to process messages
      mockHandler.endStream();

      const responses = await receivePromise;
      expect(responses).to.be.empty;
      expect(loggerStub).to.have.been.calledOnce;
      expect(loggerStub).to.have.been.calledWithMatch(
        /Received an unknown message type/
      );

      loggerStub.restore();
    });
  });

  describe('close()', () => {
    it('should call the handler, set the isClosed flag, and be idempotent', async () => {
      expect(session.isClosed).to.be.false;
      await session.close();
      expect(mockHandler.close).to.have.been.calledOnce;
      expect(session.isClosed).to.be.true;

      // Call again to test idempotency
      await session.close();
      expect(mockHandler.close).to.have.been.calledOnce; // Should not be called again
    });

    it('should terminate an active receive() loop', async () => {
      const received: unknown[] = [];
      const receivePromise = (async () => {
        for await (const msg of session.receive()) {
          received.push(msg);
        }
      })();

      mockHandler.simulateServerMessage({
        serverContent: { modelTurn: { parts: [{ text: 'one' }] } }
      });
      // Allow the first message to be processed
      await new Promise(r => setTimeout(r, 10));
      expect(received).to.have.lengthOf(1);

      await session.close();
      mockHandler.endStream(); // End the mock stream

      await receivePromise; // This should now resolve

      // No more messages should have been processed
      expect(received).to.have.lengthOf(1);
    });

    it('methods should throw after session is closed', async () => {
      await session.close();
      await expect(session.send('test')).to.be.rejectedWith(AIError, /closed/);
      await expect(session.sendMediaChunks([])).to.be.rejectedWith(
        AIError,
        /closed/
      );
      const generator = session.receive();
      await expect(generator.next()).to.be.rejectedWith(AIError, /closed/);
    });
  });
});
