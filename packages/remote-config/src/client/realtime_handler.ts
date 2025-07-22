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

import { ConfigUpdateObserver } from "../public_types";
const MAX_HTTP_RETRIES = 8;

export class RealtimeHandler{
    constructor () 
    { }
    
    private observers: Set<ConfigUpdateObserver> = new Set<ConfigUpdateObserver>();
    
    /**
    * Adds an observer to the realtime updates.
    * @param observer The observer to add.
    */
    public addObserver(observer: ConfigUpdateObserver) {
        this.observers.add(observer);
<<<<<<< HEAD
        his.beginRealtime();
=======
        this.begineRealtime();
>>>>>>> 0e1e4c98f94a55cb8a96ba07f2ec5c8059266e67
    }
    /**
     * Removes an observer from the realtime updates.
     * @param observer The observer to remove.
     */
    public removeObserver(observer: ConfigUpdateObserver): void {
        if (this.observers.has(observer)) {
<<<<<<< HEAD
            this.observers.delete(observer);
=======
            return this.observers.delete(observer);
>>>>>>> 0e1e4c98f94a55cb8a96ba07f2ec5c8059266e67
        }
    }

    private beginRealtime(): void {
        if (this.observers.size > 0) {
            this.makeRealtimeHttpConnection(0);
        }
    }

    private makeRealtimeHttpConnection(retryMilliseconds: number): void {

    }

}
