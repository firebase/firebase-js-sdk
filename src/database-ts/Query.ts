/**
* Copyright 2017 Google Inc.
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

import { Repo } from "./core/Repo";
import { Path } from "./core/Path";
import { QueryParams } from "./utils/classes/QueryParams";
import { 
  validateArgCount,
  validateFirebaseDataArg,
  validateKey
} from "../utils/libs/validation";

export class Query {
  constructor(public repo: Repo, public path: Path, private queryParams: QueryParams, private orderByCalled: boolean) {}
  endAt(value, name?) {
    validateArgCount('Query.endAt', 0, 2, arguments.length);
    validateFirebaseDataArg('Query.endAt', 1, value, this.path, true);
    validateKey('Query.endAt', 2, name, true);

    var newParams = this.queryParams.endAt(value, name);
    this.validateLimit(newParams);
    this.validateQueryEndpoints(newParams);
    if (this.queryParams.hasEnd()) {
      throw new Error('Query.endAt: Ending point was already set (by another call to endAt or ' +
          'equalTo).');
    }

    return new Query(this.repo, this.path, newParams, this.orderByCalled);
  }
  equalTo() {}
  private getCancelAndContextArgs() {}
  getQueryParams() {}
  getRef() {}
  isEqual() {}
  limitToFirst() {}
  limitToLast() {}
  off() {}
  on() {}
  once() {}
  onChildEvent() {}
  onValueEvent() {}
  orderByChild() {}
  orderByKey() {}
  orderByPriority() {}
  orderByValue() {}
  queryIdentifier() {}
  queryObject() {}
  startAt() {}
  toJSON() {}
  toString() {}
  private validateLimit(params) {}
  private validateNoPreviousOrderByCall() {}
  private validateQueryEndpoints(params) {}
}