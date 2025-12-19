# Firestore JavaScript SDK Maintainer's Guide

This document outlines the prerequisite knowledge for new maintainers of the Firestore JavaScript SDK.

## Prerequisite Knowledge

Before contributing to this codebase, you should have a strong understanding of the following technologies and concepts:

### Core Technologies

*   **TypeScript:** The entire codebase is written in TypeScript. A deep understanding of TypeScript, including its type system, generics, and modules, is essential.
*   **JavaScript (ES6+):** As a JavaScript SDK, a strong grasp of modern JavaScript features is required.
*   **Node.js:** The SDK is isomorphic and runs in the Node.js environment. Familiarity with Node.js concepts, such as its module system and event loop, is important.
*   **Browser Runtime Environment:** The SDK is also used in web browsers. A good understanding of the different browser execution contexts (e.g. main window, web/service workers) and subsystems (e.g. persistence like IndexedDB and Local Storage, networking) is necessary.

### Build and Test Tooling

*   **Yarn:** We use Yarn for package management. You should be familiar with basic Yarn commands.
*   **Rollup.js:** Our build process uses Rollup.js to bundle the code. Understanding Rollup's configuration and plugin system will be helpful.
*   **Karma, Mocha, and Chai:** These are our testing frameworks. You should be comfortable writing and running tests using this stack.



### Domain Knowledge

*   **[Google Cloud Firestore](https://firebase.google.com/docs/firestore):** A general understanding of Firestore's data model (documents, collections, subcollections), query language, and security rules is fundamental.
*   **Databases:** A general understanding of databases, including key-value stores and relational databases, is helpful for understanding Firestore's design and trade-offs.
*   **Modern Web Application Architecture:** Familiarity with modern web application architecture and also server-side rendering (SSR), is beneficial for understanding how the SDK is used in practice.
*   **[Firebase](https://firebase.google.com/docs):** Familiarity with the Firebase platform is required, especially Firebase Auth and Firebase Functions.
*   **Protocol Buffers / gRPC:** The main SDK uses Protocol Buffers over gRPC to communicate with the Firestore backend. A basic understanding of these technologies is helpful.
*   **Firestore REST API:** The lite SDK uses the Firestore REST API. Familiarity with the REST API is useful when working on the lite version of the SDK.
