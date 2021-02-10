{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Credential interface

<b>Signature:</b>

```typescript
export interface Credential 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [getAccessToken()](./firebase-admin_.credential.md#credentialgetaccesstoken_method) | Returns a Google OAuth2 access token object used to authenticate with Firebase services.<!-- -->This object contains the following properties: \* <code>access_token</code> (<code>string</code>): The actual Google OAuth2 access token. \* <code>expires_in</code> (<code>number</code>): The number of seconds from when the token was issued that it expires. A Google OAuth2 access token object. |

## Credential.getAccessToken() method

Returns a Google OAuth2 access token object used to authenticate with Firebase services.

This object contains the following properties: \* `access_token` (`string`<!-- -->): The actual Google OAuth2 access token. \* `expires_in` (`number`<!-- -->): The number of seconds from when the token was issued that it expires.

 A Google OAuth2 access token object.

<b>Signature:</b>

```typescript
getAccessToken(): Promise<GoogleOAuthAccessToken>;
```
<b>Returns:</b>

Promise&lt;[GoogleOAuthAccessToken](./firebase-admin_.googleoauthaccesstoken.md#googleoauthaccesstoken_interface)<!-- -->&gt;

{% endblock body %}
