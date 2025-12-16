# Build Process

This document provides a detailed explanation of the Firestore JavaScript SDK testing strategy, tech stack, and patterns and practices.

# Tech Stack
- karma, mocha, chai

# Strategy
- Firebase emulator for local development
- Integration testing with the backend

## Component Testing
*   **Query Engine Tests**: We rely on specific spec tests to ensure the Query Engine picks the correct strategy (e.g., verifying that it uses an Index when available rather than scanning).
*   **Integration Tests**: Use the Firebase Emulator to verify that "Limbo Resolution" correctly fetches documents when the local cache drifts from the server state.


# Patterns and Practices


# Spec Tests