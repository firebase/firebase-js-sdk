import * as api from "./firestore_proto_api";

interface Timestamp {
  /** Timestamp seconds */
  seconds?: number | null;

  /** Timestamp nanos */
  nanos?: number | null;
}

export interface BundleMetadata {
  /** BundleMetadata name */
  name?: string | null;

  /** BundleMetadata createTime */
  createTime?: Timestamp | null;
}

export interface NamedBundleQuery {
  /** NamedBundleQuery name */
  name?: string | null;

  /** NamedBundleQuery queryTarget */
  queryTarget?: api.QueryTarget | null;

  /** NamedBundleQuery readTime */
  readTime?: Timestamp | null;
}

/** Properties of a BundledDocumentMetadata. */
export interface BundledDocumentMetadata {
  /** BundledDocumentMetadata documentKey */
  documentKey?: string | null;

  /** BundledDocumentMetadata readTime */
  readTime?: Timestamp | null;
}
