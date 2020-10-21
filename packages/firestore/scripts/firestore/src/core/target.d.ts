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
import { ResourcePath } from '../model/path';
import { Bound, OrderBy, Filter } from './query';
/**
 * A Target represents the WatchTarget representation of a Query, which is used
 * by the LocalStore and the RemoteStore to keep track of and to execute
 * backend queries. While a Query can represent multiple Targets, each Targets
 * maps to a single WatchTarget in RemoteStore and a single TargetData entry
 * in persistence.
 */
export interface Target {
    readonly path: ResourcePath;
    readonly collectionGroup: string | null;
    readonly orderBy: OrderBy[];
    readonly filters: Filter[];
    readonly limit: number | null;
    readonly startAt: Bound | null;
    readonly endAt: Bound | null;
}
export declare class TargetImpl implements Target {
    readonly path: ResourcePath;
    readonly collectionGroup: string | null;
    readonly orderBy: OrderBy[];
    readonly filters: Filter[];
    readonly limit: number | null;
    readonly startAt: Bound | null;
    readonly endAt: Bound | null;
    memoizedCanonicalId: string | null;
    constructor(path: ResourcePath, collectionGroup?: string | null, orderBy?: OrderBy[], filters?: Filter[], limit?: number | null, startAt?: Bound | null, endAt?: Bound | null);
}
/**
 * Initializes a Target with a path and optional additional query constraints.
 * Path must currently be empty if this is a collection group query.
 *
 * NOTE: you should always construct `Target` from `Query.toTarget` instead of
 * using this factory method, because `Query` provides an implicit `orderBy`
 * property.
 */
export declare function newTarget(path: ResourcePath, collectionGroup?: string | null, orderBy?: OrderBy[], filters?: Filter[], limit?: number | null, startAt?: Bound | null, endAt?: Bound | null): Target;
export declare function canonifyTarget(target: Target): string;
export declare function stringifyTarget(target: Target): string;
export declare function targetEquals(left: Target, right: Target): boolean;
export declare function isDocumentTarget(target: Target): boolean;
