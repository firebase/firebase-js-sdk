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
import sinon, { SinonFakeTimers, SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { AIError } from '../errors';
import { startAudioConversation } from './live-session-helpers';
import { LiveServerContent, LiveServerToolCall, Part } from '../types';
import { logger } from '../logger';
import { isNode } from '@firebase/util';

use(sinonChai);
use(chaiAsPromised);

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
  send = sinon.stub();
  sendMediaChunks = sinon.stub();
  messageGenerator = new MockMessageGenerator();
  receive = (): MockMessageGenerator => this.messageGenerator;
}

// Stubs and mocks for Web APIs used by the helpers.
let mockAudioContext: SinonStubbedInstance<AudioContext>;
let mockMediaStream: SinonStubbedInstance<MediaStream>;
let getUserMediaStub: SinonStub;
let mockWorkletNode: SinonStubbedInstance<AudioWorkletNode>;
let mockSourceNode: SinonStubbedInstance<MediaStreamAudioSourceNode>;
let mockAudioBufferSource: any;

function setupGlobalMocks(): void {
  // Mock AudioWorkletNode
  mockWorkletNode = {
    port: {
      postMessage: sinon.stub(),
      onmessage: null
    },
    connect: sinon.stub(),
    disconnect: sinon.stub()
  } as any;
  sinon.stub(global, 'AudioWorkletNode').returns(mockWorkletNode);

  // Mock AudioContext
  mockAudioBufferSource = {
    connect: sinon.stub(),
    start: sinon.stub(),
    stop: sinon.stub(),
    onended: null,
    buffer: { duration: 0.5 } // Mock duration for scheduling
  };
  mockSourceNode = {
    connect: sinon.stub(),
    disconnect: sinon.stub()
  } as any;
  mockAudioContext = {
    resume: sinon.stub().resolves(),
    close: sinon.stub().resolves(),
    createBuffer: sinon.stub().returns({
      getChannelData: sinon.stub().returns(new Float32Array(1))
    } as any),
    createBufferSource: sinon.stub().returns(mockAudioBufferSource),
    createMediaStreamSource: sinon.stub().returns(mockSourceNode),
    audioWorklet: {
      addModule: sinon.stub().resolves()
    },
    state: 'suspended' as AudioContextState,
    currentTime: 0
  } as any;
  sinon.stub(global, 'AudioContext').returns(mockAudioContext);

  // Mock other globals
  sinon.stub(global, 'Blob').returns({} as Blob);
  sinon.stub(URL, 'createObjectURL').returns('blob:http://localhost/fake-url');

  // Mock getUserMedia
  mockMediaStream = {
    getTracks: sinon.stub().returns([{ stop: sinon.stub() } as any])
  } as any;
  getUserMediaStub = sinon.stub().resolves(mockMediaStream);
  if (typeof navigator === 'undefined') {
    (global as any).navigator = {
      mediaDevices: { getUserMedia: getUserMediaStub }
    };
  } else {
    if (!navigator.mediaDevices) {
      (navigator as any).mediaDevices = {};
    }
    sinon
      .stub(navigator.mediaDevices, 'getUserMedia')
      .callsFake(getUserMediaStub);
  }
}

describe('Audio Conversation Helpers', () => {
  let clock: SinonFakeTimers;

  if (isNode()) {
    return;
  }

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    setupGlobalMocks();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('startAudioConversation', () => {
    let liveSession: MockLiveSession;
    beforeEach(() => {
      liveSession = new MockLiveSession();
    });

    it('should throw if the session is closed.', async () => {
      liveSession.isClosed = true;
      await expect(
        startAudioConversation(liveSession as any)
      ).to.be.rejectedWith(AIError, /on a closed LiveSession/);
    });

    it('should throw if a conversation is in progress.', async () => {
      liveSession.inConversation = true;
      await expect(
        startAudioConversation(liveSession as any)
      ).to.be.rejectedWith(AIError, /is already in progress/);
    });

    it('should throw if APIs are not supported.', async () => {
      (global as any).AudioWorkletNode = undefined; // Simulate lack of support
      await expect(
        startAudioConversation(liveSession as any)
      ).to.be.rejectedWith(AIError, /not supported in this environment/);
    });

    it('should throw if microphone permissions are denied.', async () => {
      getUserMediaStub.rejects(
        new DOMException('Permission denied', 'NotAllowedError')
      );
      await expect(
        startAudioConversation(liveSession as any)
      ).to.be.rejectedWith(DOMException, /Permission denied/);
    });

    it('should return a controller with a stop method on success.', async () => {
      const controller = await startAudioConversation(liveSession as any);
      expect(controller).to.have.property('stop').that.is.a('function');
      // Ensure it doesn't throw during cleanup
      await expect(controller.stop()).to.be.fulfilled;
    });
  });

  describe('AudioConversationRunner', () => {
    let liveSession: MockLiveSession;
    let warnStub: SinonStub;

    beforeEach(() => {
      liveSession = new MockLiveSession();
      warnStub = sinon.stub(logger, 'warn');
    });

    afterEach(() => {
      warnStub.restore();
    });

    it('should send processed audio chunks received from the worklet.', async () => {
      const controller = await startAudioConversation(liveSession as any);
      expect(mockWorkletNode.port.onmessage).to.be.a('function');

      // Simulate the worklet sending a message
      const fakeAudioData = new Int16Array(128);
      mockWorkletNode.port.onmessage!({ data: fakeAudioData } as MessageEvent);

      await clock.tickAsync(1);

      expect(liveSession.sendMediaChunks).to.have.been.calledOnce;
      const [sentChunk] = liveSession.sendMediaChunks.getCall(0).args[0];
      expect(sentChunk.mimeType).to.equal('audio/pcm');
      expect(sentChunk.data).to.be.a('string');
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
      await clock.tickAsync(1); // allow message processing

      expect(mockAudioContext.createBuffer).to.have.been.calledOnce;
      expect(mockAudioBufferSource.start).to.have.been.calledOnce;
      await controller.stop();
    });

    it('should call function handler and send result on toolCall message.', async () => {
      const handlerStub = sinon.stub().resolves({
        functionResponse: { name: 'get_weather', response: { temp: '72F' } }
      } as Part);
      const controller = await startAudioConversation(liveSession as any, {
        functionCallingHandler: handlerStub
      });

      const toolCallMessage: LiveServerToolCall = {
        type: 'toolCall',
        functionCalls: [{ name: 'get_weather', args: { location: 'LA' } }]
      };

      liveSession.messageGenerator.simulateMessage(toolCallMessage);
      await clock.tickAsync(1);

      expect(handlerStub).to.have.been.calledOnceWith(
        toolCallMessage.functionCalls
      );
      expect(liveSession.send).to.have.been.calledOnceWith([
        { functionResponse: { name: 'get_weather', response: { temp: '72F' } } }
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
      await clock.tickAsync(1);
      expect(mockAudioBufferSource.start).to.have.been.calledOnce;

      // 2. Enqueue another chunk that is now scheduled
      liveSession.messageGenerator.simulateMessage(playingMessage);
      await clock.tickAsync(1);
      expect(mockAudioBufferSource.start).to.have.been.calledTwice;

      // 3. Send interruption message
      const interruptionMessage: LiveServerContent = {
        type: 'serverContent',
        interrupted: true
      };
      liveSession.messageGenerator.simulateMessage(interruptionMessage);
      await clock.tickAsync(1);

      // Assert that all scheduled sources were stopped.
      expect(mockAudioBufferSource.stop).to.have.been.calledTwice;

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
      await clock.tickAsync(1);

      // Assert a new source was created and started (total of 3 starts)
      expect(mockAudioBufferSource.start).to.have.been.calledThrice;

      await controller.stop();
    });

    it('should warn if no function handler is provided for a toolCall message.', async () => {
      const controller = await startAudioConversation(liveSession as any);
      liveSession.messageGenerator.simulateMessage({
        type: 'toolCall',
        functionCalls: [{ name: 'test' }]
      });
      await clock.tickAsync(1);

      expect(warnStub).to.have.been.calledWithMatch(
        /functionCallingHandler is undefined/
      );
      await controller.stop();
    });

    it('stop() should call cleanup and release all resources.', async () => {
      const controller = await startAudioConversation(liveSession as any);

      // Need to spy on the internal runner's cleanup method. This is a bit tricky.
      // We can't do it directly. Instead, we'll just check the mock results.
      await controller.stop();

      expect(mockWorkletNode.disconnect).to.have.been.calledOnce;
      expect(mockSourceNode.disconnect).to.have.been.calledOnce;
      expect(mockMediaStream.getTracks()[0].stop).to.have.been.calledOnce;
      expect(mockAudioContext.close).to.have.been.calledOnce;
      expect(liveSession.inConversation).to.be.false;
    });
  });
});
