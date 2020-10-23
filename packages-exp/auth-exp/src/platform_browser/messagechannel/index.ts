/**
 * @license
 * Copyright 2019 Google LLC
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

import { PromiseSettledResult } from './promise';

export const enum TimeoutDuration {
  ACK = 50,
  COMPLETION = 3000,
  // Used when a handler is confirmed to be available on the other side.
  LONG_ACK = 800
}

/**
 * Enumeration of possible response types from the Receiver.
 */
export const enum Status {
  ACK = 'ack',
  DONE = 'done'
}

export const enum MessageError {
  CONNECTION_CLOSED = 'connection_closed',
  CONNECTION_UNAVAILABLE = 'connection_unavailable',
  INVALID_RESPONSE = 'invalid_response',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown_error',
  UNSUPPORTED_EVENT = 'unsupported_event'
}

/**
 * Enumeration of possible events sent by the Sender.
 */
export const enum EventType {
  KEY_CHANGED = 'keyChanged',
  PING = 'ping'
}

/**
 * Response to a {@link EventType.KEY_CHANGED} event.
 */
export interface KeyChangedResponse {
  keyProcessed: boolean;
}

/**
 * Response to a {@link EventType.PING} event.
 */
export type PingResponse = EventType[];

export type ReceiverResponse = KeyChangedResponse | PingResponse;

interface MessageEvent {
  eventType: EventType;
  eventId: string;
}

/**
 * Request for a {@link EventType.KEY_CHANGED} event.
 */
export interface KeyChangedRequest {
  key: string;
}

/**
 * Request for a {@link EventType.PING} event.
 */
export interface PingRequest {}

/** Data sent by Sender */
export type SenderRequest = KeyChangedRequest | PingRequest;

/** Receiver handler to process events sent by the Sender */
export type ReceiverHandler<
  T extends ReceiverResponse,
  S extends SenderRequest
> = (origin: string, data: S) => T | Promise<T>;

/** Full message sent by Sender  */
export interface SenderMessageEvent<T extends SenderRequest>
  extends MessageEvent {
  data: T;
}

export type ReceiverMessageResponse<T extends ReceiverResponse> = Array<
  PromiseSettledResult<T>
> | null;

/** Full message sent by Receiver */
export interface ReceiverMessageEvent<T extends ReceiverResponse>
  extends MessageEvent {
  status: Status;
  response: ReceiverMessageResponse<T>;
}
