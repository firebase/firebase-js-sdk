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

import {
  AIErrorCode,
  GenerativeContentBlob,
  _LiveClientContent,
  _LiveClientRealtimeInput,
  LiveResponseType,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part
} from '../public-types';
import { formatNewContent } from '../requests/request-helpers';
import { AIError } from '../errors';
import { WebSocketHandler } from '../platform/websocket';
import { logger } from '../logger';

/**
 * Represents an active, real-time, bidirectional conversation with the model.
 *
 * Do not call this constructor directly. Instead, call {@link LiveGenerativeModel.connect}.
 *
 * @beta
 */
export class LiveSession {
  /**
   * Indicates whether this Live session is closed.
   *
   * @beta
   */
  isClosed = false;

  /**
   * @internal
   */
  constructor(
    private webSocketHandler: WebSocketHandler,
    private serverMessages: AsyncGenerator<unknown>
  ) {}

  /**
   * Sends content to the server.
   *
   * @param request - The message to send to the model.
   * @param turnComplete - Indicates if the turn is complete. Defaults to false.
   * @throws If this session has been closed.
   *
   * @beta
   */
  async send(
    request: string | Array<string | Part>,
    turnComplete = true
  ): Promise<void> {
    if (this.isClosed) {
      throw new AIError(
        AIErrorCode.REQUEST_ERROR,
        'This LiveSession has been closed and cannot be used.'
      );
    }

    const newContent = formatNewContent(request);

    const message: _LiveClientContent = {
      clientContent: {
        turns: [newContent],
        turnComplete
      }
    };
    this.webSocketHandler.send(JSON.stringify(message));
  }

  /**
   * Sends realtime input to the server.
   *
   * @param mediaChunks - The media chunks to send.
   * @throws If this session has been closed.
   *
   * @beta
   */
  async sendMediaChunks(mediaChunks: GenerativeContentBlob[]): Promise<void> {
    if (this.isClosed) {
      throw new AIError(
        AIErrorCode.REQUEST_ERROR,
        'This LiveSession has been closed and cannot be used.'
      );
    }

    // The backend does not support sending more than one mediaChunk in one message.
    // Work around this limitation by sending mediaChunks in separate messages.
    mediaChunks.forEach(mediaChunk => {
      const message: _LiveClientRealtimeInput = {
        realtimeInput: { mediaChunks: [mediaChunk] }
      };
      this.webSocketHandler.send(JSON.stringify(message));
    });
  }

  /**
   * Sends a stream of {@link GenerativeContentBlob}.
   *
   * @param mediaChunkStream - The stream of {@link GenerativeContentBlob} to send.
   * @throws If this session has been closed.
   *
   * @beta
   */
  async sendMediaStream(
    mediaChunkStream: ReadableStream<GenerativeContentBlob>
  ): Promise<void> {
    if (this.isClosed) {
      throw new AIError(
        AIErrorCode.REQUEST_ERROR,
        'This LiveSession has been closed and cannot be used.'
      );
    }

    const reader = mediaChunkStream.getReader();
    while (true) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          break;
        } else if (!value) {
          throw new Error('Missing chunk in reader, but reader is not done.');
        }

        await this.sendMediaChunks([value]);
      } catch (e) {
        // Re-throw any errors that occur during stream consumption or sending.
        const message =
          e instanceof Error ? e.message : 'Error processing media stream.';
        throw new AIError(AIErrorCode.REQUEST_ERROR, message);
      }
    }
  }

  /**
   * Yields messages received from the server.
   * This can only be used by one consumer at a time.
   *
   * @returns An `AsyncGenerator` that yields server messages as they arrive.
   * @throws If the session is already closed, or if we receive a response that we don't support.
   *
   * @beta
   */
  async *receive(): AsyncGenerator<
    LiveServerContent | LiveServerToolCall | LiveServerToolCallCancellation
  > {
    if (this.isClosed) {
      throw new AIError(
        AIErrorCode.SESSION_CLOSED,
        'Cannot read from a Live session that is closed. Try starting a new Live session.'
      );
    }
    for await (const message of this.serverMessages) {
      if (message && typeof message === 'object') {
        if (LiveResponseType.SERVER_CONTENT in message) {
          yield {
            type: 'serverContent',
            ...(message as { serverContent: object }).serverContent
          } as LiveServerContent;
        } else if (LiveResponseType.TOOL_CALL in message) {
          yield {
            type: 'toolCall',
            ...(message as { toolCall: object }).toolCall
          } as LiveServerToolCall;
        } else if (LiveResponseType.TOOL_CALL_CANCELLATION in message) {
          yield {
            type: 'toolCallCancellation',
            ...(message as { toolCallCancellation: object })
              .toolCallCancellation
          } as LiveServerToolCallCancellation;
        } else {
          logger.warn(
            `Received an unknown message type from the server: ${JSON.stringify(
              message
            )}`
          );
        }
      } else {
        logger.warn(
          `Received an invalid message from the server: ${JSON.stringify(
            message
          )}`
        );
      }
    }
  }

  /**
   * Closes this session.
   * All methods on this session will throw an error once this resolves.
   *
   * @beta
   */
  async close(): Promise<void> {
    if (!this.isClosed) {
      this.isClosed = true;
      await this.webSocketHandler.close(1000, 'Client closed session.');
    }
  }
}
