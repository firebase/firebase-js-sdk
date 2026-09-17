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

import { expect, vi } from 'vitest';
import {
  FunctionResponse,
  LiveResponseType,
  LiveServerContent,
  LiveServerGoingAwayNotice,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  LiveSessionResumptionUpdate
} from '../types';
import { LiveSession } from './live-session';
import { WebSocketHandler } from '../websocket';
import { logger } from '../logger';
import { GoogleAIBackend } from '../backend';

const fakeApiSettings = {
  apiKey: 'MY_KEY',
  project: 'my-project',
  appId: 'id',
  location: 'here',
  backend: new GoogleAIBackend()
};

class MockWebSocketHandler implements WebSocketHandler {
  connect = vi.fn().mockResolvedValue(undefined);
  send = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);

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

  beforeEach(async () => {
    mockHandler = new MockWebSocketHandler();
    session = new LiveSession(
      { setup: { model: 'my-model' } },
      fakeApiSettings,
      {},
      mockHandler
    );
    mockHandler.simulateServerMessage({
      setupComplete: true
    });
    await session.connectionPromise;
    mockHandler.send.mockClear();
  });

  describe('send()', () => {
    it('should format and send a valid text message', async () => {
      await session.send('Hello there');
      expect(mockHandler.send).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(mockHandler.send.mock.calls[0][0]);
      expect(sentData).toEqual({
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
      expect(mockHandler.send).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(mockHandler.send.mock.calls[0][0]);
      expect(sentData.clientContent.turns[0].parts).toEqual(parts);
    });
  });

  describe('sendTextRealtime()', () => {
    it('should send a correctly formatted realtimeInput message', async () => {
      const text = 'foo';
      await session.sendTextRealtime(text);
      expect(mockHandler.send).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(mockHandler.send.mock.calls[0][0]);
      expect(sentData).toEqual({
        realtimeInput: { text }
      });
    });
  });

  describe('sendAudioRealtime()', () => {
    it('should send a correctly formatted realtimeInput message', async () => {
      const blob = { data: 'abcdef', mimeType: 'audio/pcm' };
      await session.sendAudioRealtime(blob);
      expect(mockHandler.send).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(mockHandler.send.mock.calls[0][0]);
      expect(sentData).toEqual({
        realtimeInput: { audio: blob }
      });
    });
  });

  describe('sendVideoRealtime()', () => {
    it('should send a correctly formatted realtimeInput message', async () => {
      const blob = { data: 'abcdef', mimeType: 'image/jpeg' };
      await session.sendVideoRealtime(blob);
      expect(mockHandler.send).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(mockHandler.send.mock.calls[0][0]);
      expect(sentData).toEqual({
        realtimeInput: { video: blob }
      });
    });
  });

  describe('sendMediaChunks()', () => {
    it('should send a correctly formatted realtimeInput message', async () => {
      const chunks = [{ data: 'base64', mimeType: 'audio/webm' }];
      await session.sendMediaChunks(chunks);
      expect(mockHandler.send).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(mockHandler.send.mock.calls[0][0]);
      expect(sentData).toEqual({
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

      expect(mockHandler.send).toHaveBeenCalledTimes(2);
      const firstCall = JSON.parse(mockHandler.send.mock.calls[0][0]);
      const secondCall = JSON.parse(mockHandler.send.mock.calls[1][0]);
      expect(firstCall.realtimeInput.mediaChunks[0].data).toBe('chunk1');
      expect(secondCall.realtimeInput.mediaChunks[0].data).toBe('chunk2');
    });

    it('should re-throw an AIError if the stream reader throws', async () => {
      const errorStream = new ReadableStream({
        pull(controller) {
          controller.error(new Error('Stream failed!'));
        }
      });
      await expect(session.sendMediaStream(errorStream)).rejects.toThrow(
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
      expect(mockHandler.send).toHaveBeenCalledTimes(1);
      const sentData = JSON.parse(mockHandler.send.mock.calls[0][0]);
      expect(sentData).toEqual({
        toolResponse: {
          functionResponses
        }
      });
    });
  });

  describe('resumeSession()', () => {
    it('should close existing session and start a new one using handle.send', async () => {
      expect(session.isClosed).toBe(false);

      mockHandler.simulateServerMessage({
        setupComplete: true
      });
      await session.resumeSession({ handle: 'testHandle' });

      expect(mockHandler.close).toHaveBeenCalledTimes(1);
      expect(mockHandler.send).toHaveBeenCalledWith(
        expect.stringContaining('testHandle')
      );
      expect(session.isClosed).toBe(false);
    });

    it('should throw if sessionResumption is not provided', async () => {
      const basicSession = new LiveSession(
        { setup: { model: 'my-model' } },
        fakeApiSettings,
        undefined,
        mockHandler
      );
      await expect(basicSession.resumeSession()).rejects.toThrow(
        /Cannot resume session/
      );
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
        goAway: { timeLeft: '30s' }
      });
      mockHandler.simulateServerMessage({
        sessionResumptionUpdate: {
          newHandle: 'test',
          resumable: true,
          lastConsumedClientMessageIndex: 5
        }
      });
      mockHandler.simulateServerMessage({
        serverContent: { turnComplete: true }
      });

      await new Promise<void>(r => setTimeout(() => r(), 10)); // Wait for the listener to process messages
      mockHandler.endStream();

      const responses = await receivePromise;
      expect(responses).toHaveLength(6);
      expect(responses[0]).toEqual({
        type: LiveResponseType.SERVER_CONTENT,
        modelTurn: { parts: [{ text: 'response 1' }] }
      } as LiveServerContent);
      expect(responses[1]).toEqual({
        type: LiveResponseType.TOOL_CALL,
        functionCalls: [{ name: 'test_func' }]
      } as LiveServerToolCall);
      expect(responses[2]).toEqual({
        type: LiveResponseType.TOOL_CALL_CANCELLATION,
        functionIds: ['123']
      } as LiveServerToolCallCancellation);
      expect(responses[3]).toEqual({
        type: LiveResponseType.GOING_AWAY_NOTICE,
        timeLeft: 30
      } as LiveServerGoingAwayNotice);
      expect(responses[4]).toEqual({
        type: LiveResponseType.SESSION_RESUMPTION_UPDATE,
        newHandle: 'test',
        resumable: true,
        lastConsumedClientMessageIndex: 5
      } as LiveSessionResumptionUpdate);
      expect(responses[5]).toEqual({
        type: LiveResponseType.SERVER_CONTENT,
        turnComplete: true
      } as LiveServerContent);
    });

    it('should correctly parse high precision duration in LiveServerGoingAwayNotice', async () => {
      const receivePromise = (async () => {
        const responses = [];
        for await (const response of session.receive()) {
          responses.push(response);
        }
        return responses;
      })();

      mockHandler.simulateServerMessage({
        goAway: { timeLeft: '3.000000001s' }
      });
      await new Promise<void>(r => setTimeout(() => r(), 10));
      mockHandler.endStream();

      const responses = await receivePromise;
      expect(responses).toHaveLength(1);
      expect(responses[0]).toEqual({
        type: LiveResponseType.GOING_AWAY_NOTICE,
        timeLeft: 3.000000001
      } as LiveServerGoingAwayNotice);
    });

    it('should default timeLeft to 0 if format is invalid', async () => {
      const receivePromise = (async () => {
        const responses = [];
        for await (const response of session.receive()) {
          responses.push(response);
        }
        return responses;
      })();

      mockHandler.simulateServerMessage({
        goAway: { timeLeft: 'invalid' }
      });
      await new Promise<void>(r => setTimeout(() => r(), 10));
      mockHandler.endStream();

      const responses = await receivePromise;
      expect(responses).toHaveLength(1);
      expect(responses[0]).toEqual({
        type: LiveResponseType.GOING_AWAY_NOTICE,
        timeLeft: 0
      } as LiveServerGoingAwayNotice);
    });

    it('should log a warning and skip messages that are not objects', async () => {
      const loggerStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
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
      expect(responses).toHaveLength(0);
      expect(loggerStub).toHaveBeenCalledTimes(2);
      expect(loggerStub).toHaveBeenCalledWith(
        expect.stringMatching(/Received an invalid message/)
      );

      loggerStub.mockRestore();
    });

    it('should log a warning and skip objects of unknown type', async () => {
      const loggerStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
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
      expect(responses).toHaveLength(0);
      expect(loggerStub).toHaveBeenCalledTimes(1);
      expect(loggerStub).toHaveBeenCalledWith(
        expect.stringMatching(/Received an unknown message type/)
      );

      loggerStub.mockRestore();
    });
  });

  describe('close()', () => {
    it('should call the handler, set the isClosed flag, and be idempotent', async () => {
      expect(session.isClosed).toBe(false);
      await session.close();
      expect(mockHandler.close).toHaveBeenCalledTimes(1);
      expect(session.isClosed).toBe(true);

      // Call again to test idempotency
      await session.close();
      expect(mockHandler.close).toHaveBeenCalledTimes(1); // Should not be called again
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
      expect(received).toHaveLength(1);

      await session.close();
      mockHandler.endStream(); // End the mock stream

      await receivePromise; // This should now resolve

      // No more messages should have been processed
      expect(received).toHaveLength(1);
    });

    it('methods should throw after session is closed', async () => {
      await session.close();
      await expect(session.send('test')).rejects.toThrow(/closed/);
      await expect(session.sendMediaChunks([])).rejects.toThrow(/closed/);
      const generator = session.receive();
      await expect(generator.next()).rejects.toThrow(/closed/);
    });
  });
});
