import { DataConnectTransportClass } from '.';

export interface DataConnectStreamResponse<Data> {
  requestId: string;
  data: Data;
  dataEtag: string; // TODO: actually a hash
  errors: Error[];
  cancelled: boolean;
}

/**
 * Base interface for stream request payloads sent over the stream to the server.
 */
interface StreamRequest {
  name: string; // connectorResourcePath
  requestId: string;
  authToken?: string; // TODO: type
  appCheckToken?: string; // TODO: type
  dataEtag?: string; // TODO: type
}

/**
 * Fields for an execute request payload.
 * @internal
 */
interface ExecuteRequestKind<Variables> {
  operationName: string;
  variables?: Variables;
}

/**
 * Fields for a resume request payload.
 * @internal
 */
interface ResumeRequestKind {}

/**
 * Fields for a cancel request payload.
 * @internal
 */
interface CancelRequestKind {}

/**
 * Payload for an auth token authentication stream request.
 * @internal
 */
interface AuthStreamRequest extends StreamRequest {
  authToken: string; // TODO: type
}

/**
 * Payload for an app check token authentication stream request.
 * @internal
 */
interface AppCheckStreamRequest extends StreamRequest {
  appCheckToken: string; // TODO: type
}

/**
 * Payload for an auth and appcheck token authentication stream request.
 * @internal
 */
interface AuthAppCheckStreamRequest extends StreamRequest {
  authToken: string; // TODO: type
  appCheckToken: string; // TODO: type
}

/**
 * Payload for an authentication stream request.
 * Requires providing an auth token, or app check token, or both.
 * @internal
 */
export type AuthenticationStreamRequest =
  | AuthStreamRequest
  | AppCheckStreamRequest
  | AuthAppCheckStreamRequest;

/**
 * Fields for a subscribe request payload.
 * @internal
 */
export interface SubscribeStreamRequest<Variables> extends StreamRequest {
  subscribe: ExecuteRequestKind<Variables>;
  execute?: never;
  resume?: never;
  cancel?: never;
}

/**
 * Fields for an execute request payload.
 * @internal
 */
export interface ExecuteStreamRequest<Variables> extends StreamRequest {
  execute: ExecuteRequestKind<Variables>;
  subscribe?: never;
  resume?: never;
  cancel?: never;
}

/**
 * Fields for a cancel request payload.
 * @internal
 */
export interface ResumeStreamRequest extends StreamRequest {
  resume?: ResumeRequestKind;
  subscribe?: never;
  execute?: never;
  cancel?: never;
}

/**
 * Fields for a cancel (unsubscribe) request payload.
 * @internal
 */
export interface CancelStreamRequest extends StreamRequest {
  cancel: CancelRequestKind;
  subscribe?: never;
  execute?: never;
  resume?: never;
}

/**
 * Shape of the request body to be sent over the stream to the server.
 * @internal
 */
export type DataConnectStreamRequest<Variables> =
  | ExecuteStreamRequest<Variables>
  | SubscribeStreamRequest<Variables>
  | ResumeStreamRequest
  | CancelStreamRequest
  | AuthenticationStreamRequest;

export abstract class DataConnectStreamTransportClass extends DataConnectTransportClass {
  /**
   * Open a new stream connection. Errors if the connection fails.
   */
  abstract openConnection(): void;

  /**
   * Closes the current stream connection if one exists.
   */
  abstract closeConnection(): void;

  /**
   * Send a message over the stream.
   * Automatically ensures the connection is open before sending.
   * @param requestBody The body of the message to be sent.
   * @throws DataConnectError if sending fails.
   */
  protected abstract _sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): void;

  /**
   * Internal helper to send a message over the connection to execute a one-off query or mutation.
   * @param body The execution payload.
   */
  protected _sendExecuteMessage<Variables>(
    body: ExecuteStreamRequest<Variables>
  ): void {
    this._sendMessage(body);
  }

  /**
   * Internal helper to send a message over the connection to subscribe to a query.
   * @param subscribeRequestBody The subscription payload.
   */
  protected _sendSubscribeMessage<Variables>(
    subscribeRequestBody: SubscribeStreamRequest<Variables>
  ): void {
    this._sendMessage(subscribeRequestBody);
  }

  /**
   * Internal helper to send a message over the connection to subscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  protected _sendCancelMessage(cancelStreamRequest: CancelStreamRequest): void {
    this._sendMessage(cancelStreamRequest);
  }

  /**
   * Internal helper to send a message over the connection to subscribe to a query.
   * @param cancelStreamRequest The cancel/unsubscription payload.
   */
  protected _sendAuthenticationMessaage(
    authenticationMessage: AuthenticationStreamRequest
  ): void {
    this._sendMessage(authenticationMessage);
  }
}
