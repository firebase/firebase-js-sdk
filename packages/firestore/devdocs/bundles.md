# Firestore Data Bundles

This document provides a deep dive into the concept of Firestore data bundles, how they are processed, and how they are used within the SDK.

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

The process of loading a bundle into the Firestore SDK is initiated by the `loadBundle()` method. This method returns a `LoadBundleTask`, which allows the developer to track the progress of the loading operation.

Here's a step-by-step walkthrough of what happens when `loadBundle()` is called:

1.  **`loadBundle()` called:** The developer calls `loadBundle()` with the bundle data (as a `ReadableStream` or `ArrayBuffer`).
2.  **`LoadBundleTask` created:** A `LoadBundleTask` is created and returned to the developer. This task acts as a `Promise` and also provides progress updates.
3.  **`BundleLoader` initiated:** Internally, a `BundleLoader` is created to process the bundle.
4.  **Bundle processing:** The `BundleLoader` reads the bundle element by element. The bundle is a sequence of JSON objects, each representing a metadata element, a named query, or a document.
5.  **Data caching:** As the `BundleLoader` processes the bundle, it saves the data to the local store:
    *   **Bundle Metadata:** The bundle's metadata is saved to the `BundleCache`. This is used to track which bundles have been loaded.
    *   **Named Queries:** Named queries are saved to the `BundleCache`.
    *   **Documents:** Documents are saved to the `RemoteDocumentCache`.
6.  **Progress updates:** The `LoadBundleTask` is updated with progress information (e.g., bytes loaded, documents loaded) as the `BundleLoader` processes the bundle.
7.  **Completion:** Once the `BundleLoader` has finished processing the bundle, the `LoadBundleTask` is marked as complete.

## Error Handling

Errors can occur during the bundle loading process for a variety of reasons, such as a malformed bundle or a storage issue.

When an error occurs, the `LoadBundleTask` is put into an `'Error'` state. The error is surfaced to the developer in two ways:

*   **Promise rejection:** The `LoadBundleTask`'s promise is rejected with a `FirestoreError`.
*   **`onProgress` observer:** If an `error` callback is provided to the `onProgress` method, it will be called with the `FirestoreError`.

## Interacting with Bundled Data

Once a bundle has been loaded, the data it contains is available for querying. If the bundle included named queries, you can use the `getNamedQuery()` method to retrieve a `Query` object, which can then be executed.

When a named query is executed, the Firestore SDK will first attempt to fulfill the query from the local cache. If the results for the named query are available in the cache (because they were loaded from a bundle), they will be returned immediately, without a server roundtrip.
