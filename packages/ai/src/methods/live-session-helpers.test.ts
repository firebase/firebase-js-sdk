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

import { describe, expect, it, vi, MockInstance } from 'vitest';
import { startAudioConversation } from './live-session-helpers';
import {
  FunctionResponse,
  LiveServerContent,
  LiveServerToolCall
} from '../types';
import { logger } from '../logger';
import { isNode } from '@firebase/util';

// A mock message generator to simulate receiving messages from the server.
class MockMessageGenerator {
  private resolvers: Array<(result: IteratorResult<any>) => void> = [];
  isDone = false;

  next(): Promise<IteratorResult<any>> {
    return new Promise(resolve => this.resolvers.push(resolve));
  }

  simulateMessage(message: any): void {
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver({ value: message, done: false });
    }
  }

  endStream(): void {
    if (this.isDone) {
      return;
    }
    this.isDone = true;
    this.resolvers.forEach(resolve =>
      resolve({ value: undefined, done: true })
    );
    this.resolvers = [];
  }
}

// A mock LiveSession to intercept calls to the server.
class MockLiveSession {
  isClosed = false;
  inConversation = false;
  send = vi.fn();
  sendAudioRealtime = vi.fn();
  sendFunctionResponses = vi.fn();
  messageGenerator = new MockMessageGenerator();
  receive = (): MockMessageGenerator => this.messageGenerator;
}

// Stubs and mocks for Web APIs used by the helpers.
let mockAudioContext: any;
let mockMediaStream: any;
let getUserMediaStub: any;
let mockWorkletNode: any;
let mockSourceNode: any;
let mockAudioBufferSource: any;

function setupGlobalMocks(): void {
  // Mock AudioWorkletNode
  mockWorkletNode = {
    port: {
      postMessage: vi.fn(),
      onmessage: null
    },
    connect: vi.fn(),
    disconnect: vi.fn()
  } as any;
  (globalThis as any).AudioWorkletNode = vi.fn(
    class {
      constructor() {
        return mockWorkletNode;
      }
    }
  );

  // Mock AudioContext
  mockAudioBufferSource = {
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
    buffer: { duration: 0.5 } // Mock duration for scheduling
  };
  mockSourceNode = {
    connect: vi.fn(),
    disconnect: vi.fn()
  } as any;
  mockAudioContext = {
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createBuffer: vi.fn().mockReturnValue({
      getChannelData: vi.fn().mockReturnValue(new Float32Array(1))
    } as any),
    createBufferSource: vi.fn().mockReturnValue(mockAudioBufferSource),
    createMediaStreamSource: vi.fn().mockReturnValue(mockSourceNode),
    audioWorklet: {
      addModule: vi.fn().mockResolvedValue(undefined)
    },
    state: 'suspended' as AudioContextState,
    currentTime: 0
  } as any;
  /* eslint-disable-next-line prefer-arrow-callback */
  (globalThis as any).AudioContext = vi.fn().mockImplementation(function () {
    return mockAudioContext;
  });

  // Mock other globals
  vi.spyOn(URL, 'createObjectURL').mockReturnValue(
    'blob:http://localhost/fake-url'
  );

  // Mock getUserMedia
  mockMediaStream = {
    getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() } as any])
  } as any;
  getUserMediaStub = vi.fn().mockResolvedValue(mockMediaStream);
  if (typeof navigator === 'undefined') {
    (globalThis as any).navigator = {
      mediaDevices: { getUserMedia: getUserMediaStub }
    };
  } else {
    if (!navigator.mediaDevices) {
      (navigator as any).mediaDevices = {};
    }
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
      getUserMediaStub
    );
  }
}

describe.skipIf(isNode())('Audio Conversation Helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    setupGlobalMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('startAudioConversation', () => {
    let liveSession: MockLiveSession;
    beforeEach(() => {
      liveSession = new MockLiveSession();
    });

    it('should throw if the session is closed.', async () => {
      liveSession.isClosed = true;
      await expect(startAudioConversation(liveSession as any)).rejects.toThrow(
        /on a closed LiveSession/
      );
    });

    it('should throw if a conversation is in progress.', async () => {
      liveSession.inConversation = true;
      await expect(startAudioConversation(liveSession as any)).rejects.toThrow(
        /is already in progress/
      );
    });

    it('should throw if APIs are not supported.', async () => {
      (globalThis as any).AudioWorkletNode = undefined; // Simulate lack of support
      await expect(startAudioConversation(liveSession as any)).rejects.toThrow(
        /not supported in this environment/
      );
    });

    it('should throw if microphone permissions are denied.', async () => {
      getUserMediaStub.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );
      await expect(startAudioConversation(liveSession as any)).rejects.toThrow(
        /Permission denied/
      );
    });

    it('should return a controller with a stop method on success.', async () => {
      const controller = await startAudioConversation(liveSession as any);
      expect(typeof controller.stop).toBe('function');
      // Ensure it doesn't throw during cleanup
      await expect(controller.stop()).resolves.toBeUndefined();
    });
  });

  describe('AudioConversationRunner', () => {
    let liveSession: MockLiveSession;
    let warnStub: MockInstance;

    beforeEach(() => {
      liveSession = new MockLiveSession();
      warnStub = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnStub.mockRestore();
    });

    it('should send processed audio chunks received from the worklet.', async () => {
      const controller = await startAudioConversation(liveSession as any);
      expect(typeof mockWorkletNode.port.onmessage).toBe('function');

      // Simulate the worklet sending a message
      const fakeAudioData = new Int16Array(128);
      mockWorkletNode.port.onmessage!({ data: fakeAudioData } as MessageEvent);

      await vi.advanceTimersByTimeAsync(1);

      expect(liveSession.sendAudioRealtime).toHaveBeenCalledTimes(1);
      const sentChunk = liveSession.sendAudioRealtime.mock.calls[0][0];
      expect(sentChunk.mimeType).toBe('audio/pcm');
      expect(typeof sentChunk.data).toBe('string');
      await controller.stop();
    });

    it('should queue and play audio from a serverContent message.', async () => {
      const controller = await startAudioConversation(liveSession as any);
      const serverMessage: LiveServerContent = {
        type: 'serverContent',
        modelTurn: {
          role: 'model',
          parts: [
            { inlineData: { mimeType: 'audio/pcm', data: '1111222233334444' } }
          ] // base64 for dummy data
        }
      };

      liveSession.messageGenerator.simulateMessage(serverMessage);
      await vi.advanceTimersByTimeAsync(1); // allow message processing

      expect(mockAudioContext.createBuffer).toHaveBeenCalledTimes(1);
      expect(mockAudioBufferSource.start).toHaveBeenCalledTimes(1);
      await controller.stop();
    });

    it('should call function handler and send result on toolCall message.', async () => {
      const functionResponse: FunctionResponse = {
        id: '1',
        name: 'get_weather',
        response: { temp: '72F' }
      };
      const handlerStub = vi.fn().mockResolvedValue(functionResponse);
      const controller = await startAudioConversation(liveSession as any, {
        functionCallingHandler: handlerStub
      });

      const toolCallMessage: LiveServerToolCall = {
        type: 'toolCall',
        functionCalls: [
          { id: '1', name: 'get_weather', args: { location: 'LA' } }
        ]
      };

      liveSession.messageGenerator.simulateMessage(toolCallMessage);
      await vi.advanceTimersByTimeAsync(1);

      expect(handlerStub).toHaveBeenCalledTimes(1);
      expect(handlerStub).toHaveBeenCalledWith(toolCallMessage.functionCalls);
      expect(liveSession.sendFunctionResponses).toHaveBeenCalledTimes(1);
      expect(liveSession.sendFunctionResponses).toHaveBeenCalledWith([
        functionResponse
      ]);
      await controller.stop();
    });

    it('should clear queue and stop sources on an interruption message.', async () => {
      const controller = await startAudioConversation(liveSession as any);

      // 1. Enqueue some audio that is "playing"
      const playingMessage: LiveServerContent = {
        type: 'serverContent',
        modelTurn: {
          parts: [
            { inlineData: { mimeType: 'audio/pcm', data: '1111222233334444' } }
          ],
          role: 'model'
        }
      };
      liveSession.messageGenerator.simulateMessage(playingMessage);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockAudioBufferSource.start).toHaveBeenCalledTimes(1);

      // 2. Enqueue another chunk that is now scheduled
      liveSession.messageGenerator.simulateMessage(playingMessage);
      await vi.advanceTimersByTimeAsync(1);
      expect(mockAudioBufferSource.start).toHaveBeenCalledTimes(2);

      // 3. Send interruption message
      const interruptionMessage: LiveServerContent = {
        type: 'serverContent',
        interrupted: true
      };
      liveSession.messageGenerator.simulateMessage(interruptionMessage);
      await vi.advanceTimersByTimeAsync(1);

      // Assert that all scheduled sources were stopped.
      expect(mockAudioBufferSource.stop).toHaveBeenCalledTimes(2);

      // 4. Send new audio post-interruption
      const newMessage: LiveServerContent = {
        type: 'serverContent',
        modelTurn: {
          parts: [
            { inlineData: { mimeType: 'audio/pcm', data: '1111222233334444' } }
          ],
          role: 'model'
        }
      };
      liveSession.messageGenerator.simulateMessage(newMessage);
      await vi.advanceTimersByTimeAsync(1);

      // Assert a new source was created and started (total of 3 starts)
      expect(mockAudioBufferSource.start).toHaveBeenCalledTimes(3);

      await controller.stop();
    });

    it('should warn if no function handler is provided for a toolCall message.', async () => {
      const controller = await startAudioConversation(liveSession as any);
      liveSession.messageGenerator.simulateMessage({
        type: 'toolCall',
        functionCalls: [{ name: 'test' }]
      });
      await vi.advanceTimersByTimeAsync(1);

      expect(warnStub).toHaveBeenCalledWith(
        expect.stringMatching(/functionCallingHandler is undefined/)
      );
      await controller.stop();
    });

    it('stop() should call cleanup and release all resources.', async () => {
      const controller = await startAudioConversation(liveSession as any);

      // Need to spy on the internal runner's cleanup method. This is a bit tricky.
      // We can't do it directly. Instead, we'll just check the mock results.
      await controller.stop();

      expect(mockWorkletNode.disconnect).toHaveBeenCalledTimes(1);
      expect(mockSourceNode.disconnect).toHaveBeenCalledTimes(1);
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalledTimes(1);
      expect(mockAudioContext.close).toHaveBeenCalledTimes(1);
      expect(liveSession.inConversation).toBe(false);
    });
  });
});
