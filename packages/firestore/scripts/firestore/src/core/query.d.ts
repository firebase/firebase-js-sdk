/**
 * @license
 * Copyright 2017 Google LLC
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
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { Document } from '../model/document';
import { FieldPath, ResourcePath } from '../model/path';
import { Target } from './target';
export declare const enum LimitType {
    First = "F",
    Last = "L"
}
/**
 * The Query interface defines all external properties of a query.
 *
 * QueryImpl implements this interface to provide memoization for `queryOrderBy`
 * and `queryToTarget`.
 */
export interface Query {
    readonly path: ResourcePath;
    readonly collectionGroup: string | null;
    readonly explicitOrderBy: OrderBy[];
    readonly filters: Filter[];
    readonly limit: number | null;
    readonly limitType: LimitType;
    readonly startAt: Bound | null;
    readonly endAt: Bound | null;
}
/**
 * Query encapsulates all the query attributes we support in the SDK. It can
 * be run against the LocalStore, as well as be converted to a `Target` to
 * query the RemoteStore results.
 *
 * Visible for testing.
 */
export declare class QueryImpl implements Query {
    readonly path: ResourcePath;
    readonly collectionGroup: string | null;
    readonly explicitOrderBy: OrderBy[];
    readonly filters: Filter[];
    readonly limit: number | null;
    readonly limitType: LimitType;
    readonly startAt: Bound | null;
    readonly endAt: Bound | null;
    memoizedOrderBy: OrderBy[] | null;
    memoizedTarget: Target | null;
    /**
     * Initializes a Query with a path and optional additional query constraints.
     * Path must currently be empty if this is a collection group query.
     */
    constructor(path: ResourcePath, collectionGroup?: string | null, explicitOrderBy?: OrderBy[], filters?: Filter[], limit?: number | null, limitType?: LimitType, startAt?: Bound | null, endAt?: Bound | null);
}
/** Creates a new Query instance with the options provided. */
export declare function newQuery(path: ResourcePath, collectionGroup: string | null, explicitOrderBy: OrderBy[], filters: Filter[], limit: number | null, limitType: LimitType, startAt: Bound | null, endAt: Bound | null): Query;
/** Creates a new Query for a query that matches all documents at `path` */
export declare function newQueryForPath(path: ResourcePath): Query;
/**
 * Helper to convert a collection group query into a collection query at a
 * specific path. This is used when executing collection group queries, since
 * we have to split the query into a set of collection queries at multiple
 * paths.
 */
export declare function asCollectionQueryAtPath(query: Query, path: ResourcePath): Query;
/**
 * Returns true if this query does not specify any query constraints that
 * could remove results.
 */
export declare function matchesAllDocuments(query: Query): boolean;
export declare function hasLimitToFirst(query: Query): boolean;
export declare function hasLimitToLast(query: Query): boolean;
export declare function getFirstOrderByField(query: Query): FieldPath | null;
export declare function getInequalityFilterField(query: Query): FieldPath | null;
/**
 * Checks if any of the provided Operators are included in the query and
 * returns the first one that is, or null if none are.
 */
export declare function findFilterOperator(query: Query, operators: Operator[]): Operator | null;
/**
 * Creates a new Query for a collection group query that matches all documents
 * within the provided collection group.
 */
export declare function newQueryForCollectionGroup(collectionId: string): Query;
/**
 * Returns whether the query matches a single document by path (rather than a
 * collection).
 */
export declare function isDocumentQuery(query: Query): boolean;
/**
 * Returns whether the query matches a collection group rather than a specific
 * collection.
 */
export declare function isCollectionGroupQuery(query: Query): boolean;
/**
 * Returns the implicit order by constraint that is used to execute the Query,
 * which can be different from the order by constraints the user provided (e.g.
 * the SDK and backend always orders by `__name__`).
 */
export declare function queryOrderBy(query: Query): OrderBy[];
/**
 * Converts this `Query` instance to it's corresponding `Target` representation.
 */
export declare function queryToTarget(query: Query): Target;
export declare function queryWithAddedFilter(query: Query, filter: Filter): Query;
export declare function queryWithAddedOrderBy(query: Query, orderBy: OrderBy): Query;
export declare function queryWithLimit(query: Query, limit: number, limitType: LimitType): Query;
export declare function queryWithStartAt(query: Query, bound: Bound): Query;
export declare function queryWithEndAt(query: Query, bound: Bound): Query;
export declare function queryEquals(left: Query, right: Query): boolean;
export declare function canonifyQuery(query: Query): string;
export declare function stringifyQuery(query: Query): string;
/** Returns whether `doc` matches the constraints of `query`. */
export declare function queryMatches(query: Query, doc: Document): boolean;
/**
 * Returns a new comparator function that can be used to compare two documents
 * based on the Query's ordering constraint.
 */
export declare function newQueryComparator(query: Query): (d1: Document, d2: Document) => number;
export declare abstract class Filter {
    abstract matches(doc: Document): boolean;
}
export declare const enum Operator {
    LESS_THAN = "<",
    LESS_THAN_OR_EQUAL = "<=",
    EQUAL = "==",
    NOT_EQUAL = "!=",
    GREATER_THAN = ">",
    GREATER_THAN_OR_EQUAL = ">=",
    ARRAY_CONTAINS = "array-contains",
    IN = "in",
    NOT_IN = "not-in",
    ARRAY_CONTAINS_ANY = "array-contains-any"
}
export declare class FieldFilter extends Filter {
    field: FieldPath;
    op: Operator;
    value: ProtoValue;
    protected constructor(field: FieldPath, op: Operator, value: ProtoValue);
    /**
     * Creates a filter based on the provided arguments.
     */
    static create(field: FieldPath, op: Operator, value: ProtoValue): FieldFilter;
    private static createKeyFieldInFilter;
    matches(doc: Document): boolean;
    protected matchesComparison(comparison: number): boolean;
    isInequality(): boolean;
}
export declare function canonifyFilter(filter: Filter): string;
export declare function filterEquals(f1: Filter, f2: Filter): boolean;
/** Returns a debug description for `filter`. */
export declare function stringifyFilter(filter: Filter): string;
/** Filter that matches on key fields (i.e. '__name__'). */
export declare class KeyFieldFilter extends FieldFilter {
    private readonly key;
    constructor(field: FieldPath, op: Operator, value: ProtoValue);
    matches(doc: Document): boolean;
}
/** Filter that matches on key fields within an array. */
export declare class KeyFieldInFilter extends FieldFilter {
    private readonly keys;
    constructor(field: FieldPath, value: ProtoValue);
    matches(doc: Document): boolean;
}
/** Filter that matches on key fields not present within an array. */
export declare class KeyFieldNotInFilter extends FieldFilter {
    private readonly keys;
    constructor(field: FieldPath, value: ProtoValue);
    matches(doc: Document): boolean;
}
/** A Filter that implements the array-contains operator. */
export declare class ArrayContainsFilter extends FieldFilter {
    constructor(field: FieldPath, value: ProtoValue);
    matches(doc: Document): boolean;
}
/** A Filter that implements the IN operator. */
export declare class InFilter extends FieldFilter {
    constructor(field: FieldPath, value: ProtoValue);
    matches(doc: Document): boolean;
}
/** A Filter that implements the not-in operator. */
export declare class NotInFilter extends FieldFilter {
    constructor(field: FieldPath, value: ProtoValue);
    matches(doc: Document): boolean;
}
/** A Filter that implements the array-contains-any operator. */
export declare class ArrayContainsAnyFilter extends FieldFilter {
    constructor(field: FieldPath, value: ProtoValue);
    matches(doc: Document): boolean;
}
/**
 * The direction of sorting in an order by.
 */
export declare const enum Direction {
    ASCENDING = "asc",
    DESCENDING = "desc"
}
/**
 * Represents a bound of a query.
 *
 * The bound is specified with the given components representing a position and
 * whether it's just before or just after the position (relative to whatever the
 * query order is).
 *
 * The position represents a logical index position for a query. It's a prefix
 * of values for the (potentially implicit) order by clauses of a query.
 *
 * Bound provides a function to determine whether a document comes before or
 * after a bound. This is influenced by whether the position is just before or
 * just after the provided values.
 */
export declare class Bound {
    readonly position: ProtoValue[];
    readonly before: boolean;
    constructor(position: ProtoValue[], before: boolean);
}
export declare function canonifyBound(bound: Bound): string;
/**
 * Returns true if a document sorts before a bound using the provided sort
 * order.
 */
export declare function sortsBeforeDocument(bound: Bound, orderBy: OrderBy[], doc: Document): boolean;
export declare function boundEquals(left: Bound | null, right: Bound | null): boolean;
/**
 * An ordering on a field, in some Direction. Direction defaults to ASCENDING.
 */
export declare class OrderBy {
    readonly field: FieldPath;
    readonly dir: Direction;
    constructor(field: FieldPath, dir?: Direction);
}
export declare function compareDocs(orderBy: OrderBy, d1: Document, d2: Document): number;
export declare function canonifyOrderBy(orderBy: OrderBy): string;
export declare function stringifyOrderBy(orderBy: OrderBy): string;
export declare function orderByEquals(left: OrderBy, right: OrderBy): boolean;
