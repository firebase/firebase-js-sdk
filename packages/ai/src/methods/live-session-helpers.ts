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

import { AIError } from '../errors';
import { logger } from '../logger';
import {
  AIErrorCode,
  FunctionCall,
  FunctionResponse,
  GenerativeContentBlob,
  LiveServerContent
} from '../types';
import { LiveSession } from './live-session';
import { Deferred } from '@firebase/util';

const SERVER_INPUT_SAMPLE_RATE = 16_000;
const SERVER_OUTPUT_SAMPLE_RATE = 24_000;
const VIDEO_FRAME_RATE = 1; // Backend requires 1 FPS.

const AUDIO_PROCESSOR_NAME = 'audio-processor';

/**
 * The JS for an `AudioWorkletProcessor`.
 * This processor is responsible for taking raw audio from the microphone,
 * converting it to the required 16-bit 16kHz PCM, and posting it back to the main thread.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor
 *
 * It is defined as a string here so that it can be converted into a `Blob`
 * and loaded at runtime.
 */
const audioProcessorWorkletString = `
  class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super();
      this.targetSampleRate = options.processorOptions.targetSampleRate;
      // 'sampleRate' is a global variable available inside the AudioWorkletGlobalScope,
      // representing the native sample rate of the AudioContext.
      this.inputSampleRate = sampleRate;
    }

    /**
     * This method is called by the browser's audio engine for each block of audio data.
     * Input is a single input, with a single channel (input[0][0]).
     */
    process(inputs) {
      const input = inputs[0];
      if (input && input.length > 0 && input[0].length > 0) {
        const pcmData = input[0]; // Float32Array of raw audio samples.
        
        // Simple linear interpolation for resampling.
        const resampled = new Float32Array(Math.round(pcmData.length * this.targetSampleRate / this.inputSampleRate));
        const ratio = pcmData.length / resampled.length;
        for (let i = 0; i < resampled.length; i++) {
          resampled[i] = pcmData[Math.floor(i * ratio)];
        }

        // Convert Float32 (-1, 1) samples to Int16 (-32768, 32767)
        const resampledInt16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          const sample = Math.max(-1, Math.min(1, resampled[i]));
          if (sample < 0) {
            resampledInt16[i] = sample * 32768;
          } else {
            resampledInt16[i] = sample * 32767;
          }
        }
        
        this.port.postMessage(resampledInt16);
      }
      // Return true to keep the processor alive and processing the next audio block.
      return true;
    }
  }

  // Register the processor with a name that can be used to instantiate it from the main thread.
  registerProcessor('${AUDIO_PROCESSOR_NAME}', AudioProcessor);
`;

/**
 * A controller for managing an active audio conversation.
 *
 * @beta
 */
export interface AudioConversationController {
  /**
   * Stops the audio conversation, closes the microphone connection, and
   * cleans up resources. Returns a promise that resolves when cleanup is complete.
   */
  stop: () => Promise<void>;
}

/**
 * Options for {@link startAudioConversation}.
 *
 * @beta
 */
export interface StartAudioConversationOptions {
  /**
   * An async handler that is called when the model requests a function to be executed.
   * The handler should perform the function call and return the result as a `Part`,
   * which will then be sent back to the model.
   */
  functionCallingHandler?: (
    functionCalls: FunctionCall[]
  ) => Promise<FunctionResponse>;
}

/**
 * Dependencies needed by the {@link AudioConversationRunner}.
 *
 * @internal
 */
interface RunnerDependencies {
  audioContext: AudioContext;
  mediaStream: MediaStream;
  sourceNode: MediaStreamAudioSourceNode;
  workletNode: AudioWorkletNode;
}

/**
 * Encapsulates the core logic of an audio conversation.
 *
 * @internal
 */
export class AudioConversationRunner {
  /** A flag to indicate if the conversation has been stopped. */
  private isStopped = false;
  /** A deferred that contains a promise that is resolved when stop() is called, to unblock the receive loop. */
  private readonly stopDeferred = new Deferred<void>();
  /** A promise that tracks the lifecycle of the main `runReceiveLoop`. */
  private readonly receiveLoopPromise: Promise<void>;

  /** A FIFO queue of 24kHz, 16-bit PCM audio chunks received from the server. */
  private readonly playbackQueue: ArrayBuffer[] = [];
  /** Tracks scheduled audio sources. Used to cancel scheduled audio when the model is interrupted. */
  private scheduledSources: AudioBufferSourceNode[] = [];
  /** A high-precision timeline pointer for scheduling gapless audio playback. */
  private nextStartTime = 0;
  /** A mutex to prevent the playback processing loop from running multiple times concurrently. */
  private isPlaybackLoopRunning = false;

  constructor(
    private readonly liveSession: LiveSession,
    private readonly options: StartAudioConversationOptions,
    private readonly deps: RunnerDependencies
  ) {
    this.liveSession.inConversation = true;
    // For backward compatibility.
    this.liveSession.inConversation = true;

    // Start listening for messages from the server.
    this.receiveLoopPromise = this.runReceiveLoop().finally(() =>
      this.cleanup()
    );

    // Set up the handler for receiving processed audio data from the worklet.
    // Message data has been resampled to 16kHz 16-bit PCM.
    this.deps.workletNode.port.onmessage = event => {
      if (this.isStopped) {
        return;
      }

      const pcm16 = event.data as Int16Array;
      const base64 = btoa(
        String.fromCharCode.apply(
          null,
          Array.from(new Uint8Array(pcm16.buffer))
        )
      );

      const chunk: GenerativeContentBlob = {
        mimeType: 'audio/pcm',
        data: base64
      };
      void this.liveSession.sendAudioRealtime(chunk);
    };
  }

  /**
   * Stops the conversation and unblocks the main receive loop.
   */
  async stop(): Promise<void> {
    if (this.isStopped) {
      return;
    }
    this.isStopped = true;
    this.stopDeferred.resolve(); // Unblock the receive loop
    await this.receiveLoopPromise; // Wait for the loop and cleanup to finish
  }

  /**
   * Cleans up all audio resources (nodes, stream tracks, context) and marks the
   * session as no longer in a conversation.
   */
  private cleanup(): void {
    this.interruptPlayback(); // Ensure all audio is stopped on final cleanup.
    this.deps.workletNode.port.onmessage = null;
    this.deps.workletNode.disconnect();
    this.deps.sourceNode.disconnect();
    this.deps.mediaStream.getTracks().forEach(track => track.stop());
    if (this.deps.audioContext.state !== 'closed') {
      void this.deps.audioContext.close();
    }
    this.liveSession.inConversation = false;
    this.liveSession.inConversation = false;
  }

  /**
   * Adds audio data to the queue and ensures the playback loop is running.
   */
  private enqueueAndPlay(audioData: ArrayBuffer): void {
    this.playbackQueue.push(audioData);
    // Will no-op if it's already running.
    void this.processPlaybackQueue();
  }

  /**
   * Stops all current and pending audio playback and clears the queue. This is
   * called when the server indicates the model's speech was interrupted with
   * `LiveServerContent.modelTurn.interrupted`.
   */
  private interruptPlayback(): void {
    // Stop all sources that have been scheduled. The onended event will fire for each,
    // which will clean up the scheduledSources array.
    [...this.scheduledSources].forEach(source => source.stop(0));

    // Clear the internal buffer of unprocessed audio chunks.
    this.playbackQueue.length = 0;

    // Reset the playback clock to start fresh.
    this.nextStartTime = this.deps.audioContext.currentTime;
  }

  /**
   * Processes the playback queue in a loop, scheduling each chunk in a gapless sequence.
   */
  private async processPlaybackQueue(): Promise<void> {
    if (this.isPlaybackLoopRunning) {
      return;
    }
    this.isPlaybackLoopRunning = true;

    while (this.playbackQueue.length > 0 && !this.isStopped) {
      const pcmRawBuffer = this.playbackQueue.shift()!;
      try {
        const pcm16 = new Int16Array(pcmRawBuffer);
        const frameCount = pcm16.length;

        const audioBuffer = this.deps.audioContext.createBuffer(
          1,
          frameCount,
          SERVER_OUTPUT_SAMPLE_RATE
        );

        // Convert 16-bit PCM to 32-bit PCM, required by the Web Audio API.
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = pcm16[i] / 32768; // Normalize to Float32 range [-1.0, 1.0]
        }

        const source = this.deps.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.deps.audioContext.destination);

        // Track the source and set up a handler to remove it from tracking when it finishes.
        this.scheduledSources.push(source);
        source.onended = () => {
          this.scheduledSources = this.scheduledSources.filter(
            s => s !== source
          );
        };

        // To prevent gaps, schedule the next chunk to start either now (if we're catching up)
        // or exactly when the previous chunk is scheduled to end.
        this.nextStartTime = Math.max(
          this.deps.audioContext.currentTime,
          this.nextStartTime
        );
        source.start(this.nextStartTime);

        // Update the schedule for the *next* chunk.
        this.nextStartTime += audioBuffer.duration;
      } catch (e) {
        logger.error('Error playing audio:', e);
      }
    }

    this.isPlaybackLoopRunning = false;
  }

  /**
   * The main loop that listens for and processes messages from the server.
   */
  private async runReceiveLoop(): Promise<void> {
    const messageGenerator = this.liveSession.receive();
    while (!this.isStopped) {
      const result = await Promise.race([
        messageGenerator.next(),
        this.stopDeferred.promise
      ]);

      if (this.isStopped || !result || result.done) {
        break;
      }

      const message = result.value;
      if (message.type === 'serverContent') {
        const serverContent = message as LiveServerContent;
        if (serverContent.interrupted) {
          this.interruptPlayback();
        }

        const audioPart = serverContent.modelTurn?.parts.find(part =>
          part.inlineData?.mimeType.startsWith('audio/')
        );
        if (audioPart?.inlineData) {
          const audioData = Uint8Array.from(
            atob(audioPart.inlineData.data),
            c => c.charCodeAt(0)
          ).buffer;
          this.enqueueAndPlay(audioData);
        }
      } else if (message.type === 'toolCall') {
        if (!this.options.functionCallingHandler) {
          logger.warn(
            'Received tool call message, but StartAudioConversationOptions.functionCallingHandler is undefined. Ignoring tool call.'
          );
        } else {
          try {
            const functionResponse = await this.options.functionCallingHandler(
              message.functionCalls
            );
            if (!this.isStopped) {
              void this.liveSession.sendFunctionResponses([functionResponse]);
            }
          } catch (e) {
            throw new AIError(
              AIErrorCode.ERROR,
              `Function calling handler failed: ${(e as Error).message}`
            );
          }
        }
      }
    }
  }
}

/**
 * Starts a real-time, bidirectional audio conversation with the model. This helper function manages
 * the complexities of microphone access, audio recording, playback, and interruptions.
 *
 * @remarks Important: This function must be called in response to a user gesture
 * (for example, a button click) to comply with {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices#autoplay_policy | browser autoplay policies}.
 *
 * @example
 * ```javascript
 * const liveSession = await model.connect();
 * let conversationController;
 *
 * // This function must be called from within a click handler.
 * async function startConversation() {
 *   try {
 *     conversationController = await startAudioConversation(liveSession);
 *   } catch (e) {
 *     // Handle AI-specific errors
 *     if (e instanceof AIError) {
 *       console.error("AI Error:", e.message);
 *     }
 *     // Handle microphone permission and hardware errors
 *     else if (e instanceof DOMException) {
 *       console.error("Microphone Error:", e.message);
 *     }
 *     // Handle other unexpected errors
 *     else {
 *       console.error("An unexpected error occurred:", e);
 *     }
 *   }
 * }
 *
 * // Later, to stop the conversation:
 * // if (conversationController) {
 * //   await conversationController.stop();
 * // }
 * ```
 *
 * @param liveSession - An active {@link LiveSession} instance.
 * @param options - Configuration options for the audio conversation.
 * @returns A `Promise` that resolves with an {@link AudioConversationController}.
 * @throws `AIError` if the environment does not support required Web APIs (`UNSUPPORTED`), if a conversation is already active (`REQUEST_ERROR`), the session is closed (`SESSION_CLOSED`), or if an unexpected initialization error occurs (`ERROR`).
 * @throws `DOMException` Thrown by `navigator.mediaDevices.getUserMedia()` if issues occur with microphone access, such as permissions being denied (`NotAllowedError`) or no compatible hardware being found (`NotFoundError`). See the {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions | MDN documentation} for a full list of exceptions.
 *
 * @beta
 */
export async function startAudioConversation(
  liveSession: LiveSession,
  options: StartAudioConversationOptions = {}
): Promise<AudioConversationController> {
  if (liveSession.isClosed) {
    throw new AIError(
      AIErrorCode.SESSION_CLOSED,
      'Cannot start audio conversation on a closed LiveSession.'
    );
  }

  if (liveSession.inConversation) {
    throw new AIError(
      AIErrorCode.REQUEST_ERROR,
      'An audio conversation is already in progress for this session.'
    );
  }

  // Check for necessary Web API support.
  if (
    typeof AudioWorkletNode === 'undefined' ||
    typeof AudioContext === 'undefined' ||
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices
  ) {
    throw new AIError(
      AIErrorCode.UNSUPPORTED,
      'Audio conversation is not supported in this environment. It requires the Web Audio API and AudioWorklet support.'
    );
  }

  let audioContext: AudioContext | undefined;
  try {
    // 1. Set up the audio context. This must be in response to a user gesture.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices#autoplay_policy
    audioContext = new AudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // 2. Prompt for microphone access and get the media stream.
    // This can throw a variety of permission or hardware-related errors.
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    // 3. Load the AudioWorklet processor.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
    const workletBlob = new Blob([audioProcessorWorkletString], {
      type: 'application/javascript'
    });
    const workletURL = URL.createObjectURL(workletBlob);
    await audioContext.audioWorklet.addModule(workletURL);

    // 4. Create the audio graph: Microphone -> Source Node -> Worklet Node
    const sourceNode = audioContext.createMediaStreamSource(mediaStream);
    const workletNode = new AudioWorkletNode(
      audioContext,
      AUDIO_PROCESSOR_NAME,
      {
        processorOptions: { targetSampleRate: SERVER_INPUT_SAMPLE_RATE }
      }
    );
    sourceNode.connect(workletNode);

    // 5. Instantiate and return the runner which manages the conversation.
    const runner = new AudioConversationRunner(liveSession, options, {
      audioContext,
      mediaStream,
      sourceNode,
      workletNode
    });

    return { stop: () => runner.stop() };
  } catch (e) {
    // Ensure the audio context is closed on any setup error.
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close();
    }

    // Re-throw specific, known error types directly. The user may want to handle `DOMException`
    // errors differently (for example, if permission to access audio device was denied).
    if (e instanceof AIError || e instanceof DOMException) {
      throw e;
    }

    // Wrap any other unexpected errors in a standard AIError.
    throw new AIError(
      AIErrorCode.ERROR,
      `Failed to initialize audio recording: ${(e as Error).message}`
    );
  }
}

/**
 * A controller for managing an active video recording session.
 *
 * @beta
 */
export interface VideoRecordingController {
  /**
   * Stops the video recording, closes the media connection, and
   * cleans up resources. Returns a promise that resolves when cleanup is complete.
   */
  stop: () => Promise<void>;
}

/**
 * Options for `startVideoRecording`.
 *
 * @beta
 */
export interface StartVideoRecordingOptions {
  /**
   * Specifies the source of the video stream. Can be either the user's camera or their screen (screen, window, or a tab). Is `'camera'` by default.
   */
  videoSource?: 'camera' | 'screen';
}

/**
 * Encapsulates the core logic of a video recording session, managing the
 * capture loop and resource cleanup.
 * @internal
 */
class VideoRecordingRunner {
  private isStopped = false;
  private readonly mediaStream: MediaStream;
  private readonly videoElement: HTMLVideoElement;
  private readonly canvasElement: HTMLCanvasElement;
  private readonly intervalId: number;

  constructor(
    private readonly liveSession: LiveSession,
    mediaStream: MediaStream,
    videoElement: HTMLVideoElement
  ) {
    this.mediaStream = mediaStream;
    this.videoElement = videoElement;
    this.liveSession.inVideoRecording = true;

    this.canvasElement = document.createElement('canvas');

    // Start a loop to capture and send a frame every second (1 FPS),
    // adhering to the backend's requirement.
    this.intervalId = setInterval(() => {
      this.captureAndSendFrame();
    }, 1000 / VIDEO_FRAME_RATE) as unknown as number; // The Node setInterval returns a Timeout, but we're using the browser API which returns number.
  }

  /**
   * Captures a single frame from the video stream, encodes it as a JPEG,
   * and sends it to the LiveSession.
   */
  private captureAndSendFrame(): void {
    if (this.isStopped) {
      return;
    }
    // readyState < 2 means the video is not yet ready to play or has not loaded metadata.
    // videoWidth === 0 is another check to ensure dimensions are available.
    if (
      this.videoElement.readyState < 2 ||
      this.videoElement.videoWidth === 0
    ) {
      return;
    }
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    const context = this.canvasElement.getContext('2d');
    if (!context) {
      // This should realistically never happen in a supported browser environment.
      logger.error(
        'Could not get 2D context from canvas to capture video frame.'
      );
      return;
    }
    context.drawImage(this.videoElement, 0, 0);

    // Convert the canvas content to a base64 JPEG. The '0.8' is a quality setting,
    // balancing file size and image quality.
    const dataUrl = this.canvasElement.toDataURL('image/jpeg', 0.8);
    // The data URL includes a prefix like "data:image/jpeg;base64," which must be removed.
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
      logger.warn('Failed to extract base64 data from captured video frame.');
      return;
    }
    const blob: GenerativeContentBlob = {
      mimeType: 'image/jpeg',
      data: base64Data
    };
    // Send the frame to the server. We use 'void' as this is a fire-and-forget
    // operation within the loop. Errors at the session level should be handled by the user.
    void this.liveSession.sendVideoRealtime(blob);
  }

  /**
   * Stops the video capture loop and cleans up all associated resources.
   */
  async stop(): Promise<void> {
    if (this.isStopped) {
      return;
    }
    this.isStopped = true;
    clearInterval(this.intervalId);

    // Stop all tracks on the media stream (e.g., camera light turns off, screen sharing UI disappears).
    this.mediaStream.getTracks().forEach(track => track.stop());

    // Clean up in-memory video element to release resources.
    this.videoElement.srcObject = null;

    // Reset the session flag to allow a new recording to start on the same session.
    this.liveSession.inVideoRecording = false;
  }
}

/**
 * Starts a real-time, unidirectional video stream to the model. This helper function manages
 * the complexities of video source access, frame capture, and encoding.
 *
 * @remarks
 * Important: This function must be called in response to a user gesture
 * (e.g., a button click) to comply with browser security policies for
 * accessing camera or screen content. The backend requires video frames to be
 * sent at 1 FPS as individual JPEGs. This helper enforces that constraint.
 *
 * @example
 * ```javascript
 * const liveSession = await model.connect();
 * let videoController;
 *
 * // This function must be called from within a click handler.
 * async function startRecording() {
 *   try {
 *     videoController = await startVideoRecording(liveSession, {
 *       videoSource: 'screen' // or 'camera'
 *     });
 *   } catch (e) {
 *     // Handle AI-specific errors, DOMExceptions for permissions, etc.
 *     console.error("Failed to start video recording:", e);
 *   }
 * }
 *
 * // To stop the recording later:
 * // if (videoController) {
 * //   await videoController.stop();
 * // }
 * ```
 *
 * @param liveSession - An active {@link LiveSession} instance.
 * @param options - Configuration options for the video recording.
 * @returns A `Promise` that resolves with a `VideoRecordingController`.
 * @throws `AIError` if the environment is unsupported, a recording is active, or the session is closed.
 * @throws `DOMException` if issues occur with media access (e.g., permissions denied).
 *
 * @beta
 */
export async function startVideoRecording(
  liveSession: LiveSession,
  options: StartVideoRecordingOptions = {}
): Promise<VideoRecordingController> {
  if (liveSession.isClosed) {
    throw new AIError(
      AIErrorCode.SESSION_CLOSED,
      'Cannot start video recording on a closed LiveSession.'
    );
  }

  if (liveSession.inVideoRecording) {
    throw new AIError(
      AIErrorCode.REQUEST_ERROR,
      'A video recording is already in progress for this session.'
    );
  }

  // Check for necessary browser API support.
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof document === 'undefined' // Used for creating in-memory elements
  ) {
    throw new AIError(
      AIErrorCode.UNSUPPORTED,
      'Video recording is not supported in this environment. It requires a browser with MediaDevices and DOM support.'
    );
  }

  let mediaStream: MediaStream | undefined;
  try {
    const videoSource = options.videoSource ?? 'camera';

    // The browser will prompt the user for permission and to select a source.
    // This can throw DOMExceptions for permission denial, hardware issues, etc.
    if (videoSource === 'camera') {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } else {
      mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
    }

    // Create and configure the video element in memory.
    const videoElement = document.createElement('video');
    videoElement.srcObject = mediaStream;
    videoElement.muted = true;

    // Await the play() promise. This is required to handle potential
    // playback errors and to satisfy browser autoplay policies, although
    // the user gesture requirement for this function should prevent most issues.
    await videoElement.play();

    // All async setup is successful; now create the runner to manage the loop.
    const runner = new VideoRecordingRunner(
      liveSession,
      mediaStream,
      videoElement
    );
    return { stop: () => runner.stop() };
  } catch (e) {
    // If we successfully acquired a media stream but a subsequent step failed
    // (e.g., videoElement.play()), we must clean up the stream.
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    // Re-throw specific, known error types that the user might want to handle differently,
    // such as permission errors from `getUserMedia`.
    if (e instanceof AIError || e instanceof DOMException) {
      throw e;
    }

    // Wrap any other unexpected errors in a standard AIError for consistency.
    throw new AIError(
      AIErrorCode.ERROR,
      `Failed to initialize video recording: ${(e as Error).message}`
    );
  }
}
