# Limbo Resolution & Consistency

This document details how the Firestore Client SDKs ensure the local cache remains consistent with the server after connectivity interruptions, specifically focusing on **Limbo Resolution**, **Resume Tokens**, and **Existence Filters**.

## The Problem: Offline Drift

When a client is online and listening to a query, the backend sends specific `Change` events (Added, Modified, Removed). The SDK keeps the local cache in sync by applying these deltas.

However, when a client goes offline or disconnects:
1.  **Drift Occurs**: Documents may be deleted or modified on the server such that they no longer match the query.
2.  **Missing Negatives**: Upon reconnecting, the backend sends updates for documents that *changed*. However, if a document was deleted while the client was offline, the backend (using a Resume Token) might not send a specific "Delete" event because it doesn't track exactly which documents every offline client currently holds in their specific local cache.

This creates a state where the local cache has "stale" documents that the server no longer considers part of the result set.

## Mechanism 1: Resume Tokens (The Happy Path)

To minimize bandwidth, the SDK and Backend use **Resume Tokens**.
*   **Token**: An opaque binary blob (encoding a timestamp) received in every `ListenResponse`.
*   **Resume**: When the SDK reconnects, it sends the last token it received.
*   **Delta**: The backend sends only documents that have changed *since* that timestamp.
*   **Gap**: This mechanism handles *adds* and *updates* perfectly. It struggles with *removes* if the server history is compacted or complex.

## Mechanism 2: Existence Filters

To detect inconsistency caused by the "Missing Negatives" problem, the backend includes an **Existence Filter** in the `ListenResponse`.

*   **The Count**: An Existence Filter is essentially a count of how many documents the server believes match the query.
*   **The Check**: The SDK compares this count with the number of documents in its local cache for that specific target.
*   **Mismatch**: If `LocalCount > ServerCount`, the SDK knows it is holding onto stale data. This triggers **Limbo Resolution**.

## Mechanism 3: Bloom Filters (The Solution)

Historically, upon detecting a mismatch, the SDK would drop the Resume Token and re-download the entire query result. This was expensive. The modern approach uses **Bloom Filters**.

1.  **Construction**: The backend constructs a Bloom Filter containing the IDs of all documents currently matching the query.
2.  **Transmission**: This filter is sent to the client (probabilistic, highly compressed).
3.  **Local Check**: The SDK checks every local document key against this Bloom Filter.
    *   **If NOT in filter**: The document is definitely gone from the server result set.
    *   **If IN filter**: The document *probably* exists (Bloom filters have false positives).

## Limbo Resolution State Machine

Documents that exist locally but failed the Bloom Filter check (or triggered a false positive check) enter **Limbo**.

1.  **Limbo State**: The document is present in the local cache, but the View cannot confirm if it is valid. We cannot simply delete it immediately because it might match *another* active query, or it might be a false positive from the Bloom Filter.
2.  **Resolution Request**: The SDK spins up a dedicated, ephemeral `Watch` listener (effectively a `GetDocument` lookup) specifically for the key in Limbo.
3.  **Outcome**:
    *   **Found**: The server confirms the document exists and sends the latest version. The SDK updates the cache.
    *   **Not Found**: The server returns "Not Found". The SDK deletes the document from the local cache (and removes it from the Query View).

This process ensures that the client converges to a consistent state without re-downloading the entire result set, optimizing bandwidth usage.