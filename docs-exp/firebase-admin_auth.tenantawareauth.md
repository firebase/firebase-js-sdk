{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## TenantAwareAuth class

The tenant aware Auth class.

<b>Signature:</b>

```typescript
export declare class TenantAwareAuth extends BaseAuth 
```
<b>Extends:</b> [BaseAuth](./firebase-admin_.baseauth.md#baseauth_class)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [tenantId](./firebase-admin_auth.tenantawareauth.md#tenantawareauthtenantid_property) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [createSessionCookie(idToken, sessionCookieOptions)](./firebase-admin_auth.tenantawareauth.md#tenantawareauthcreatesessioncookie_method) |  | Creates a new Firebase session cookie with the specified options that can be used for session management (set as a server side session cookie with custom cookie policy). The session cookie JWT will have the same payload claims as the provided ID token. |
|  [verifyIdToken(idToken, checkRevoked)](./firebase-admin_auth.tenantawareauth.md#tenantawareauthverifyidtoken_method) |  | Verifies a JWT auth token. Returns a Promise with the tokens claims. Rejects the promise if the token could not be verified. If checkRevoked is set to true, verifies if the session corresponding to the ID token was revoked. If the corresponding user's session was invalidated, an auth/id-token-revoked error is thrown. If not specified the check is not applied. |
|  [verifySessionCookie(sessionCookie, checkRevoked)](./firebase-admin_auth.tenantawareauth.md#tenantawareauthverifysessioncookie_method) |  | Verifies a Firebase session cookie. Returns a Promise with the tokens claims. Rejects the promise if the token could not be verified. If checkRevoked is set to true, verifies if the session corresponding to the session cookie was revoked. If the corresponding user's session was invalidated, an auth/session-cookie-revoked error is thrown. If not specified the check is not performed. |

## TenantAwareAuth.tenantId property

<b>Signature:</b>

```typescript
readonly tenantId: string;
```

## TenantAwareAuth.createSessionCookie() method

Creates a new Firebase session cookie with the specified options that can be used for session management (set as a server side session cookie with custom cookie policy). The session cookie JWT will have the same payload claims as the provided ID token.

<b>Signature:</b>

```typescript
createSessionCookie(idToken: string, sessionCookieOptions: SessionCookieOptions): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  idToken | string | The Firebase ID token to exchange for a session cookie. |
|  sessionCookieOptions | [SessionCookieOptions](./firebase-admin_.sessioncookieoptions.md#sessioncookieoptions_interface) | The session cookie options which includes custom session duration. {<!-- -->Promise<string>} A promise that resolves on success with the created session cookie. |

<b>Returns:</b>

Promise&lt;string&gt;

## TenantAwareAuth.verifyIdToken() method

Verifies a JWT auth token. Returns a Promise with the tokens claims. Rejects the promise if the token could not be verified. If checkRevoked is set to true, verifies if the session corresponding to the ID token was revoked. If the corresponding user's session was invalidated, an auth/id-token-revoked error is thrown. If not specified the check is not applied.

<b>Signature:</b>

```typescript
verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  idToken | string | The JWT to verify. |
|  checkRevoked | boolean | Whether to check if the ID token is revoked.  {<!-- -->Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful verification. |

<b>Returns:</b>

Promise&lt;[DecodedIdToken](./firebase-admin_.decodedidtoken.md#decodedidtoken_interface)<!-- -->&gt;

## TenantAwareAuth.verifySessionCookie() method

Verifies a Firebase session cookie. Returns a Promise with the tokens claims. Rejects the promise if the token could not be verified. If checkRevoked is set to true, verifies if the session corresponding to the session cookie was revoked. If the corresponding user's session was invalidated, an auth/session-cookie-revoked error is thrown. If not specified the check is not performed.

<b>Signature:</b>

```typescript
verifySessionCookie(sessionCookie: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  sessionCookie | string | The session cookie to verify. |
|  checkRevoked | boolean | Whether to check if the session cookie is revoked.  {<!-- -->Promise<DecodedIdToken>} A Promise that will be fulfilled after a successful verification. |

<b>Returns:</b>

Promise&lt;[DecodedIdToken](./firebase-admin_.decodedidtoken.md#decodedidtoken_interface)<!-- -->&gt;

{% endblock body %}
