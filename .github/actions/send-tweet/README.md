# Send Tweet GitHub Action

This is a minimalistic GitHub Action for posting Firebase release announcements
to Twitter. Simply specify the Twitter API keys along with the Tweet status to
be posted.

## Inputs

### `status`

**Required** Text of the Tweet to send.

### `consumer-key`

**Required** Consumer API key from Twitter.

### `consumer-secret`

**Required** Consumer API secret key from Twitter.

### `access-token`

**Required** Twitter application access token.

### `access-token-secret`

**Required** Twitter application access token secret.

## Example usage

```
- name: Send Tweet
  uses: firebase/firebase-admin-node/.github/actions/send-tweet
  with:
    status: >
      v1.2.3 of @Firebase Admin Node.js SDK is available.
      Release notes at https://firebase.google.com.
    consumer-key: ${{ secrets.TWITTER_CONSUMER_KEY }}
    consumer-secret: ${{ secrets.TWITTER_CONSUMER_SECRET }}
    access-token: ${{ secrets.TWITTER_ACCESS_TOKEN }}
    access-token-secret: ${{ secrets.TWITTER_ACCESS_TOKEN_SECRET }}
```

## Implementation

This Action uses the `twitter` NPM package to send Tweets.

When making a code change remember to run `npm run pack` to rebuild the
`dist/index.js` file which is the executable of this Action.
