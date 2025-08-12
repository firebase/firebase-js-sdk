// /**
//  * @license
//  * Copyright 2025 Google LLC
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *   http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

// import { ConfigUpdate, ConfigUpdateObserver, FetchResponse, FirebaseRemoteConfigObject } from '../public_types';
// import { ERROR_FACTORY, ErrorCode } from "../errors";
// import { RestClient } from './rest_client';
// import { Storage } from '../storage/storage';
// import { FirebaseError } from '@firebase/util';
// import { FetchRequest, RemoteConfigAbortSignal } from './remote_config_fetch_client';

// const TEMPLATE_VERSION_KEY = 'latestTemplateVersionNumber';
// const REALTIME_DISABLED_KEY = 'featureDisabled';
// const MAXIMUM_FETCH_ATTEMPTS = 3;

// export class ConfigAutoFetch {
//  private readonly decoder = new TextDecoder('utf-8');

//  constructor(
//   private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
//   private readonly restClient: RestClient,
//   private readonly observers: Set<ConfigUpdateObserver>,
//   private readonly storage: Storage,
//   private readonly retryCallback: ConfigUpdateObserver
//  ) { }

//   private executeAllListenerCallbacks(configUpdate: ConfigUpdate): void {
//     this.observers.forEach(observer => observer.next(configUpdate));
//   }

//   private getChangedParams( newConfig: FirebaseRemoteConfigObject, oldConfig: FirebaseRemoteConfigObject ): Set<string> {
//     const changed = new Set<string>();
//     const newKeys = new Set(Object.keys(newConfig || {}));
//     const oldKeys = new Set(Object.keys(oldConfig || {}));

//     for (const key of newKeys) {
//       if (!oldKeys.has(key)) {
//         changed.add(key);
//         continue;
//       }
//       if (JSON.stringify((newConfig as any)[key]) !== JSON.stringify((oldConfig as any)[key])) {
//         changed.add(key);
//         continue;
//       }
//   }

//   for (const key of oldKeys) {
//     if (!newKeys.has(key)) {
//       changed.add(key);
//     }
//   }

//   return changed;
//   }

//   private fetchResponseIsUpToDate(fetchResponse: FetchResponse, lastKnownVersion: number): boolean {
//     if (fetchResponse.config != null) {
//       return fetchResponse.templateVersionNumber >= lastKnownVersion;
//     }
//     return false;
//   }

//   private async fetchLatestConfig(remainingAttempts: number, targetVersion: number): Promise<void> {
//     const remainingAttemptsAfterFetch = remainingAttempts - 1;
//     const currentAttempt = MAXIMUM_FETCH_ATTEMPTS - remainingAttemptsAfterFetch;
//     //type fetchtype=FetchType.REALTIME
//     try {
//         const fetchRequest: FetchRequest = {
//         cacheMaxAgeMillis: 0,
//         signal: new RemoteConfigAbortSignal(),
//         //fetchType: 'REALTIME',
//         //fetchAttempt: currentAttempt
//       };

//       const fetchResponse: FetchResponse = await this.restClient.fetch(fetchRequest);
//       const activatedConfigs = await this.storage.getActiveConfig();

//       if (!this.fetchResponseIsUpToDate(fetchResponse, targetVersion)) {
//         console.log("Fetched template version is the same as SDK's current version." + " Retrying fetch.");
//         await this.autoFetch(remainingAttemptsAfterFetch, targetVersion);
//         return;
//       }

//       if (fetchResponse.config == null) {
//         console.log("The fetch succeeded, but the backend had no updates.");
//         return;
//       }

//       if (activatedConfigs == null) {
//         //what to do over here?
//       }

//       const updatedKeys = this.getChangedParams(fetchResponse.config, activatedConfigs);

//       if (updatedKeys.size === 0) {
//         console.log("Config was fetched, but no params changed.");
//         return;
//       }

//       const configUpdate: ConfigUpdate = {
//           getUpdatedKeys(): Set<string> {
//            return new Set(updatedKeys);
//         }
//       };

//       this.executeAllListenerCallbacks(configUpdate);

//     } catch (e: unknown) {
//       const errorMessage = e instanceof Error ? e.message : String(e);
//       const error = ERROR_FACTORY.create(
//         ErrorCode.CONFIG_UPDATE_NOT_FETCHED,
//         { originalErrorMessage: `Failed to auto-fetch config update: ${errorMessage}` }
//       );
//       this.retryCallback.error?.(error);
//     }
//   }

//  private getRandomInt(max: number): number {
//   return Math.floor(Math.random() * max);
//  }

//  private async autoFetch(remainingAttempts: number, targetVersion: number): Promise<void> {
//     if (remainingAttempts === 0) {
//       const error = ERROR_FACTORY.create(
//         ErrorCode.CONFIG_UPDATE_NOT_FETCHED,
//         { originalErrorMessage: 'Unable to fetch the latest version of the template.' }
//       );
//       this.retryCallback.error?.(error);
//       return;
//     }

//     const timeTillFetch = this.getRandomInt(4);
//     setTimeout(async () => {
//      await this.fetchLatestConfig(remainingAttempts, targetVersion);
//     }, timeTillFetch);
//   }

//  private parseAndValidateConfigUpdateMessage(message: string): string {
//     const left = message.indexOf('{');
//     const right = message.indexOf('}', left);

//     if (left < 0 || right < 0) {
//         return "";
//     }
//     return left >= right ? "" : message.substring(left, right + 1);
//  }

//  private isEventListenersEmpty(): boolean {
//     return this.observers.size === 0;
//  }

//  private propagateError = (e: FirebaseError) => this.observers.forEach(o => o.error?.(e));

//  private async handleNotifications(): Promise<void> {
//     let partialConfigUpdateMessage: string;
//     let currentConfigUpdateMessage = "";

//     try {
//       while (true) {
//         const { done, value } = await this.reader.read();
//         if (done) {
//           break;
//         }

//         partialConfigUpdateMessage = this.decoder.decode(value, { stream: true });
//         currentConfigUpdateMessage += partialConfigUpdateMessage;

//         if (partialConfigUpdateMessage.includes('}')) {
//             currentConfigUpdateMessage = this.parseAndValidateConfigUpdateMessage(currentConfigUpdateMessage);

//          if (currentConfigUpdateMessage.length === 0) {
//            continue;
//          }
//          try {
//             const jsonObject = JSON.parse(currentConfigUpdateMessage);

//             if (REALTIME_DISABLED_KEY in jsonObject) {
//                 const errorMessage = "The server is temporarily unavailable. Try again in a few minutes.";
//                 const error = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_UNAVAILABLE, { originalErrorMessage: errorMessage });
//                 this.retryCallback.error?.(error);
//                 break;
//             }

//             if (this.isEventListenersEmpty()) {
//                 break;
//             }

//             if (TEMPLATE_VERSION_KEY in jsonObject) {
//                 const oldTemplateVersion = await this.storage.getLastKnownTemplateVersion();
//                 let targetTemplateVersion = Number(jsonObject[TEMPLATE_VERSION_KEY]);

//               if (targetTemplateVersion > oldTemplateVersion) {
//                 //await this.storage.setLastKnownTemplateVersion(targetVersion);
//                await this.autoFetch(MAXIMUM_FETCH_ATTEMPTS, targetTemplateVersion);
//               }
//             }
//          } catch (e: any) {
//             console.error("Realtime: Unable to parse config update message.", e);
//                 this.propagateError(ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_MESSAGE_INVALID, {
//                 originalErrorMessage: e.message
//              }));
//           }
//          currentConfigUpdateMessage = "";
//         }
//       }
//     } catch (e: unknown) {
//           if (e instanceof Error) {
//             if (e.name !== 'AbortError') {
//                 const firebaseError = ERROR_FACTORY.create(ErrorCode.CONFIG_UPDATE_STREAM_ERROR, {
//                     originalErrorMessage: `Error reading real-time stream: ${e.message}`
//                 });
//                 this.retryCallback.error?.(firebaseError);
//             }
//         }
//      }
//   }

//   public async listenForNotifications(): Promise<void> {
//     if (!this.reader) {
//       return;
//     }
//     await this.handleNotifications();
//   }

// }
