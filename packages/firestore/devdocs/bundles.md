# Firestore Data Bundles

This document provides an overview of Firestore data bundles, how they are processed, and how they are used within the SDK.

## What is a Bundle?

A Firestore data bundle is a serialized, read-only collection of documents and named query results. Bundles are created on a server using the Firebase Admin SDK and can be efficiently distributed to clients.

While bundles can be used for several purposes, their primary design motivation is to optimize Server-Side Rendering (SSR) workflows. In an SSR setup, a server pre-renders a page with data from Firestore. This data can be packaged into a bundle and sent to the client along with the HTML. The client-side SDK can then load this bundle and "hydrate" a real-time query with the pre-existing data, avoiding the need to re-fetch the same documents from the backend. This results in a significant performance improvement and cost savings.

## Primary Use Case: Server-Side Rendering (SSR) Hydration

The main workflow for bundles is as follows:

1.  **Server-Side:** A server fetches data from Firestore to render a page.
2.  **Bundling:** The server packages the fetched documents and the corresponding query into a bundle.
3.  **Transmission:** The bundle is embedded in the HTML page sent to the client.
4.  **Client-Side:** The client-side JavaScript calls `loadBundle()` to load the data from the bundle into the SDK's local cache.
5.  **Hydration:** The client then attaches a real-time listener to the same query that was bundled. The SDK finds the query results in the local cache and immediately fires the listener with the initial data, avoiding a costly roundtrip to the backend.

## Other Benefits and Use Cases

Beyond SSR hydration, bundles offer several other advantages:

*   **Enhanced Offline Experience:** Bundles can be shipped with an application's initial assets, allowing users to have a more complete offline experience from the first launch, reducing the need to sync every document individually.
*   **Efficient Data Distribution:** They provide an efficient way to deliver curated or static datasets to clients in a single package. For instance, an application could bundle a list of popular items or configuration data.

## The Loading Process

When an application provides a bundle to the SDK, a loading process is initiated. The SDK reads the bundle, which is a stream of documents and queries, and saves each item into its local cache. This process is asynchronous, allowing the application to continue running while the data is being loaded in the background.

To give developers visibility into this process, the SDK provides progress updates, including the number of documents and bytes loaded so far. Once all the data has been successfully loaded into the cache, the SDK signals that the process is complete.

## Error Handling

The bundle loading process is designed to be robust. If an error is encountered at any point—for example, if the bundle data is malformed or there is an issue writing to the local cache—the entire operation is aborted. The SDK ensures that the application is notified of the failure, allowing developers to catch the error and implement appropriate fallback or recovery logic.

## Interacting with Bundled Data

Once a bundle has been loaded, the data it contains is available for querying. If the bundle included named queries, you can use the `getNamedQuery()` method to retrieve a `Query` object, which can then be executed.

When a named query is executed, the Firestore SDK will first attempt to fulfill the query from the local cache. If the results for the named query are available in the cache (because they were loaded from a bundle), they will be returned immediately, without a server roundtrip.
