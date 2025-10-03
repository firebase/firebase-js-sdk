#!/bin/bash
cd packages/firebase
yarn build
npm pkg
cp packages/firebase/firebase-12.3.0.tgz