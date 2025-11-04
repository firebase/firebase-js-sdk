# Firestore JavaScript SDK Overview

This document is the starting point for navigating the Firestore JavaScript SDK codebase and its documentation. It provides a high-level overview of the SDK, its architecture, how it is built, tested, and the developer workflow.

All contributors are expected to be familiar with the [prerequisites](./prerequisites.md) before working in this codebase.

## Project Goals

The Firestore JavaScript SDK is one of the official client-side library for interacting with [Google Cloud Firestore](https://firebase.google.com/docs/firestore). It is designed to be used in a variety of JavaScript environments, including web browsers (primary and common) and Node.js (secondary and rare). It is important to distinguish this SDK from the [Google Cloud Firestore server-side SDK for Node.js](https://github.com/googleapis/nodejs-firestore). While this SDK can run in Node.js, it is primarily designed for client-side use. The server-side SDK is intended for trusted environments and offers different capabilities. However, the two SDKs are designed to harmonize where helpful (e.g. data models) to facilitate easier full-stack application development.

The primary goals of this SDK are:

*   Provide a simple and intuitive API for reading and writing data to Firestore.
*   Support real-time data synchronization with streaming queries.
*   Enable offline data access and query caching.
*   Offer a lightweight version for applications that do not require advanced features.
*   Maintain API and architectural symmetry with the [Firestore Android SDK](https://github.com/firebase/firebase-android-sdk) and [Firestore iOS SDK](https://github.com/firebase/firebase-ios-sdk). This consistency simplifies maintenance and makes it easier to port features between platforms. The public API is intentionally consistent across platforms, even if it means being less idiomatic, to allow developers to more easily port their application code.

## Artifacts

The Firestore JavaScript SDK is divided into two main packages:

*   `@firebase/firestore`: The main, full-featured SDK that provides streaming and offline support.
*   `@firebase/firestore/lite`: A much lighter-weight (AKA "lite") version of the SDK for applications that do not require streaming or offline support.

For a detailed explanation of the architecture, components, and data flow, please see the [Architecture documentation](./architecture.md). Related, for a deailed overview of the source code layout, please see [Code layout](./code-layout.md).


## Build

TODO: Add critical information about the build process including optimizations for code size, etc.

For information on how the artifacts are built, please see the [Build documentation](./build.md) file.

## Testing

TODO: Add critical information about the tests harness, organization, spec tests, etc.

For information on how the tests are setup and organized [Testing documentation](./testing.md) file.

## Developer Workflow

TODO: Add list of common commands here.

For information on the developer workflow, including how to build, test, and format the code, please see the [CONTRIBUTING.md](../CONTRIBUTING.md) file.
