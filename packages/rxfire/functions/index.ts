/**
 * 
 * Copyright 2018 Google Inc.
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

import { functions } from 'firebase/app';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export function httpsCallable<T = any, R = any>(
  functions: functions.Functions,
  name: string
) {
  const callable = functions.httpsCallable(name);
  return (data: T) => {
    return from(callable(data)).pipe(map(r => r.data as R));
  };
}
