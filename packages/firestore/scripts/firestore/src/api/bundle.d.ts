/**
 * @license
 * Copyright 2020 Google LLC
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
import * as firestore from '@firebase/firestore-types';
import { FirestoreError } from '../util/error';
export declare class LoadBundleTask implements firestore.LoadBundleTask, PromiseLike<firestore.LoadBundleTaskProgress> {
    private _progressObserver;
    private _taskCompletionResolver;
    private _lastProgress;
    onProgress(next?: (progress: firestore.LoadBundleTaskProgress) => unknown, error?: (err: Error) => unknown, complete?: () => void): void;
    catch<R>(onRejected: (a: Error) => R | PromiseLike<R>): Promise<R | firestore.LoadBundleTaskProgress>;
    then<T, R>(onFulfilled?: (a: firestore.LoadBundleTaskProgress) => T | PromiseLike<T>, onRejected?: (a: Error) => R | PromiseLike<R>): Promise<T | R>;
    /**
     * Notifies all observers that bundle loading has completed, with a provided
     * `LoadBundleTaskProgress` object.
     */
    _completeWith(progress: firestore.LoadBundleTaskProgress): void;
    /**
     * Notifies all observers that bundle loading has failed, with a provided
     * `Error` as the reason.
     */
    _failWith(error: FirestoreError): void;
    /**
     * Notifies a progress update of loading a bundle.
     * @param progress The new progress.
     */
    _updateProgress(progress: firestore.LoadBundleTaskProgress): void;
}
