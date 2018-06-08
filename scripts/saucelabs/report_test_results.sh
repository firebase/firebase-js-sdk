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

# Sends out an email in case of browser test failures, with summary of
# the test result.

sleep 10 # Wait for log file to be accessible via below url.

TRAVIS_LOG_URL=https://api.travis-ci.org/v3/job/$TRAVIS_JOB_ID/log.txt
TRAVIS_BUILD_URL=https://travis-ci.org/$TRAVIS_REPO_SLUG/builds/$TRAVIS_BUILD_ID

BASE_BRANCH=origin/master

JS_CORE_EMAIL="jscore-team@google.com"

LAST_COMMITTER_NAME=$(git log -1 $TRAVIS_COMMIT --pretty="%cN")
LAST_COMMITTER_EMAIL=$(git log -1 $TRAVIS_COMMIT --pretty="%cE")
ALL_AUTHORS_EMAIL_IN_BRANCH=($(git log $BASE_BRANCH..$TRAVIS_BRANCH --pretty="%aE" | sort -u))

SUBJECT="[firebase/firebase-js-sdk] SauceLabs Browsers Test Failed"
HEADER="Content-Type: text/html"

function greetings_for_cron_job() {
cat << EOF
Hello team,

Continuous SauceLabs browsers test failed at [$(date)].
Testing on branch [$TRAVIS_BRANCH] at:

$(git log -1 --color=always $TRAVIS_COMMIT)
EOF
}

function greetings_for_push_build() {
cat << EOF
Hello $LAST_COMMITTER_NAME,

SauceLabs browsers test failed in push build for branch [$TRAVIS_BRANCH]:

$(git log --color=always $BASE_BRANCH..$TRAVIS_BRANCH)
EOF
}

email_body=$(mktemp)
if [[ "$TRAVIS_EVENT_TYPE" == "cron" ]]; then
  greetings_for_cron_job > ${email_body}
else
  greetings_for_push_build > ${email_body}
fi

echo -e "\n\n========== See full build logs at: $TRAVIS_BUILD_URL. ==========\n\n" >> ${email_body}

curl $TRAVIS_LOG_URL \
  | sed -nE '/Executed [[:digit:]]+ of [[:digit:]]+.*(SUCCESS|FAILED)/,/The command "[^"]*" exited with 1\./ p' >> ${email_body}

# Convert from ANSI color to HTML.
email_body_html=$(mktemp)
aha < ${email_body} > ${email_body_html}

if [[ "$TRAVIS_EVENT_TYPE" == "cron" ]]; then
  to="$JS_CORE_EMAIL"
else
  to="$LAST_COMMITTER_EMAIL"
  cc="$(printf -- " -c %s" "${ALL_AUTHORS_EMAIL_IN_BRANCH[@]}")"
fi
cc="${cc} -c yifany@google.com"

mail -a "$HEADER" -s "$SUBJECT" ${cc} -- ${to} < ${email_body_html}

