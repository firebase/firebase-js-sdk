/**
 * @license
 * Copyright 2019 Google Inc.
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

import { FirebaseApp } from '@firebase/app-types';
import { FirebaseAuthTokenData } from '@firebase/app-types/private';

import { TokenProvider } from './AuthTokenProvider';
import { log, warn } from './util/util';

class EmulatorAuthToken implements FirebaseAuthTokenData {
    constructor(public accessToken: string) {};
}

export class EmulatorAuthTokenProvider implements TokenProvider {
    constructor(private app_: FirebaseApp) {}

    getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData> {
        return new Promise(() => new EmulatorAuthToken("owner"));
    }

    addTokenChangeListener(listener: (token: string | null) => void) {}

    removeTokenChangeListener(listener: (token: string | null) => void)  {}

    notifyForInvalidToken() {
        let errorMessage =
            'Database emulator unexpectedly rejected fake "owner" credentials.';
        warn(errorMessage);
    }
}
