/**
 * @license
 * Copyright 2020 Google LLC.
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

interface LoadCallback {
  (): void;
}
interface LoadOptions {
  callback?: LoadCallback;
  timeout?: number;
  ontimeout?: LoadCallback;
}

export interface GapiMessage {
  type: string;
}

interface IframesFilter {
  (iframe: GapiIframe): boolean;
}
interface MessageHandler<T extends GapiMessage> {
  (message: T): unknown | Promise<void>;
}
interface SendCallback {
  (): void;
}
interface Callback {
  (iframe: GapiIframe): void;
}

export interface GapiContext {
  open(
    options: Record<string, unknown>,
    callback?: Callback
  ): Promise<GapiIframe>;
}

export interface GapiIframe {
  register<T extends GapiMessage>(
    message: string,
    handler: MessageHandler<T>,
    filter?: IframesFilter
  ): void;
  send<T extends GapiMessage, U extends GapiMessage>(
    type: string,
    data: T,
    callback?: MessageHandler<U>,
    filter?: IframesFilter
  ): void;
  ping(callback: SendCallback, data?: unknown): Promise<unknown[]>;
  restyle(
    style: Record<string, string | boolean>,
    callback?: SendCallback
  ): Promise<unknown[]>;
}

export interface Gapi {
  load(
    features: 'gapi.iframes',
    options?: LoadOptions | LoadCallback
  ): void;

  iframes?: {
    CROSS_ORIGIN_IFRAMES_FILTER: IframesFilter;
    getContext(): GapiContext;
    Iframe?: GapiIframe;
  };
}
