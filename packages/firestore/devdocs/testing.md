# Build Process

This document provides a detailed explanation of the Firestore JavaScript SDK testing strategy, tech stack, and patterns and practices.

# Tech Stack
- karma, mocha, chai

# Testing Strategy

The Firestore JS SDK employs a three-tiered testing strategy to ensure reliability, correctness, and cross-platform consistency.

## 1. Unit Tests
*   **Scope**: Individual classes and functions.
*   **Location**: Co-located with source files (e.g., `src/core/query.test.ts`).
*   **Purpose**: Validating low-level logic, util functions, and individual component behavior in isolation.

## 2. Spec Tests (The Core Logic)
*   **Scope**: The interaction between the Sync Engine, Local Store, and Event Manager.
*   **Location**: `src/core/test/spec_test.ts` and `src/specs/*.ts`.
*   **Purpose**: Validating the complex state machine of Firestore without the flakiness of a real network. These tests mock the network layer to simulate specific protocol events (e.g., Watch stream updates, write handshakes).
*   **Cross-Platform**: These tests are exported as JSON and run by the Android and iOS SDKs to ensure consistent behavior across all platforms.
*   **Deep Dive**: See **[Spec Tests](./spec-tests.md)** for details on how to write and debug these.

## 3. Integration Tests
*   **Scope**: End-to-End verification against a real Firestore backend (prod or emulator).
*   **Location**: `test/integration/`.
*   **Purpose**: Verifying that the client protocol actually matches what the real backend server expects.
*   **Behavior**: These tests create real writes and listeners. They are slower and subject to network timing, but essential for catching protocol drifts.

## Running Tests

### Unit & Spec Tests
Run via Karma.
```bash
yarn test
```

### Integration Tests
Requires the Firebase Emulator Suite running.
```bash
# Start emulators
yarn emulators:start

# In another terminal, run integration tests
yarn test:integration
```

