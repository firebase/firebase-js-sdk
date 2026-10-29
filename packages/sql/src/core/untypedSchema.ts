/**
 * @license
 * Copyright 2026 Google LLC
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

export interface UntypedClientOptions {
  PostgrestVersion: '13';
}

export interface UntypedRelationship {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}

// Express `unknown` as `NonNullable<unknown> | null | undefined` so `@supabase/postgrest-js`'s
// `JsonPathToType` (`ContainsNull<T> ? JsonPathToType<Exclude<T, null>, Path> : ...`) strips
// `null` in one step instead of tail-recursing infinitely on `Exclude<unknown, null> = unknown`.
type UntypedRowValue = NonNullable<unknown> | null | undefined;

export interface UntypedTable {
  Row: Record<string, UntypedRowValue>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: UntypedRelationship[];
}

export interface UntypedFunction {
  Args: Record<string, unknown>;
  Returns: unknown;
}

export interface UntypedSchema {
  Tables: Record<string, UntypedTable>;
  Views: Record<string, UntypedTable>;
  Functions: Record<string, UntypedFunction>;
}

export interface UntypedDatabase {
  [schema: string]: UntypedSchema;
}
