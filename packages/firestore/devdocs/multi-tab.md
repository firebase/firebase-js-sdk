# This document outlines how the Firestore JS SDK works across multiple tabs in the browser.

> **Note**: This documentation is currently under construction.

Reminder to self on what to include:
 - This feature is only relevant in the JS SDK. The mobile SDKs do not have a concept of tabs therefore do not need to coordinate.
 - End users might have multiple tabs open to the same website which puts contention on IndexedDB and the backend.