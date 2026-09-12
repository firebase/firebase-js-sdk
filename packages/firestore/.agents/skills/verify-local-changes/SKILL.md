---
name: Verify Local Changes
description: Verifies local Firebase JS SDK changes.
---

# Verify Local Changes (JS SDK)

This skill documents how to verify local code changes for the Firebase JavaScript SDK.

## Prerequisites

Ensure you have Node.js (v20.12.2) and Yarn (1.x) installed and are in the `firebase-js-sdk` directory.

---

## Step 0: Install Dependencies

```bash
yarn
```

---

## Step 1: Format the Code

```bash
yarn format
```

---

## Step 2: Build the SDK

```bash
yarn build
```

---

## Step 3: Unit Testing

Run tests for the entire SDK:

```bash
yarn test
```

Or run tests specifically for Firestore:

```bash
cd packages/firestore
yarn test
```

---

## Step 4: Integration Testing

Integration tests require a Firebase project. Run the setup first if not done:

```bash
yarn test:setup --projectId=<your_project_id>
yarn test
```

---

> [!TIP]
> Use `yarn dev` in a package directory to start a watcher during development.
