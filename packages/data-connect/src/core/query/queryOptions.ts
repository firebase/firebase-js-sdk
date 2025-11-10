export type QueryFetchPolicy = typeof PreferCache | typeof CacheOnly | typeof ServerOnly;

export const PreferCache = 'preferCache';
export const CacheOnly = 'cacheOnly';
export const ServerOnly = 'serverOnly';

export interface ExecuteQueryOptions {
  fetchPolicy: QueryFetchPolicy;
}