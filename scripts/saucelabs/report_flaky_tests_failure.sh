#!/bin/bash
# Copyright 2018 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Sends out an email to author of the last commit with summary of the
# flaky test result.

TRAVIS_BUILD_URL=https://travis-ci.org/$TRAVIS_REPO_SLUG/builds/$TRAVIS_BUILD_ID
COMMITTER_EMAIL="$(git log -1 $TRAVIS_COMMIT --pretty="%cE")"
AUTHOR_NAME="$(git log -1 $TRAVIS_COMMIT --pretty="%aN")"

SUBJECT="[firebase-js-sdk] Browser Test Failed"

cat > email.body << EOL
Hey $AUTHOR_NAME, 

Seems like you have pushed a commit:

$(git log -1 $TRAVIS_COMMIT)

However, there are some flaky tests that have failed:

$(sed -n "/SUMMARY/,$ p" $1)

See full build logs at: $TRAVIS_BUILD_URL.
EOL

mail -s "$SUBJECT" -c yifany@google.com -- $COMMITTER_EMAIL < email.body
