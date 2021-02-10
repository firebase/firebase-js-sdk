{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## BaseAuth class

Base Auth class. Mainly used for user management APIs.

<b>Signature:</b>

```typescript
export declare class BaseAuth 
```

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [createCustomToken(uid, developerClaims)](./firebase-admin_.baseauth.md#baseauthcreatecustomtoken_method) |  | Creates a new custom token that can be sent back to a client to use with signInWithCustomToken(). |
|  [createProviderConfig(config)](./firebase-admin_.baseauth.md#baseauthcreateproviderconfig_method) |  | Returns a promise that resolves with the newly created AuthProviderConfig when the new provider configuration is created. |
|  [createSessionCookie(idToken, sessionCookieOptions)](./firebase-admin_.baseauth.md#baseauthcreatesessioncookie_method) |  | Creates a new Firebase session cookie with the specified options that can be used for session management (set as a server side session cookie with custom cookie policy). The session cookie JWT will have the same payload claims as the provided ID token. |
|  [createUser(properties)](./firebase-admin_.baseauth.md#baseauthcreateuser_method) |  | Creates a new user with the properties provided. |
|  [deleteProviderConfig(providerId)](./firebase-admin_.baseauth.md#baseauthdeleteproviderconfig_method) |  | Deletes the provider configuration corresponding to the provider ID passed. |
|  [deleteUser(uid)](./firebase-admin_.baseauth.md#baseauthdeleteuser_method) |  | Deletes the user identified by the provided user id and returns a promise that is fulfilled when the user is found and successfully deleted. |
|  [deleteUsers(uids)](./firebase-admin_.baseauth.md#baseauthdeleteusers_method) |  |  |
|  [generateEmailVerificationLink(email, actionCodeSettings)](./firebase-admin_.baseauth.md#baseauthgenerateemailverificationlink_method) |  | Generates the out of band email action link for email verification flows for the email specified using the action code settings provided. Returns a promise that resolves with the generated link. |
|  [generatePasswordResetLink(email, actionCodeSettings)](./firebase-admin_.baseauth.md#baseauthgeneratepasswordresetlink_method) |  | Generates the out of band email action link for password reset flows for the email specified using the action code settings provided. Returns a promise that resolves with the generated link. |
|  [generateSignInWithEmailLink(email, actionCodeSettings)](./firebase-admin_.baseauth.md#baseauthgeneratesigninwithemaillink_method) |  | Generates the out of band email action link for email link sign-in flows for the email specified using the action code settings provided. Returns a promise that resolves with the generated link. |
|  [getProviderConfig(providerId)](./firebase-admin_.baseauth.md#baseauthgetproviderconfig_method) |  | Looks up an Auth provider configuration by ID. Returns a promise that resolves with the provider configuration corresponding to the provider ID specified. |
|  [getUser(uid)](./firebase-admin_.baseauth.md#baseauthgetuser_method) |  | Looks up the user identified by the provided user id and returns a promise that is fulfilled with a user record for the given user if that user is found. |
|  [getUserByEmail(email)](./firebase-admin_.baseauth.md#baseauthgetuserbyemail_method) |  | Looks up the user identified by the provided email and returns a promise that is fulfilled with a user record for the given user if that user is found. |
|  [getUserByPhoneNumber(phoneNumber)](./firebase-admin_.baseauth.md#baseauthgetuserbyphonenumber_method) |  | Looks up the user identified by the provided phone number and returns a promise that is fulfilled with a user record for the given user if that user is found. |
|  [getUsers(identifiers)](./firebase-admin_.baseauth.md#baseauthgetusers_method) |  | Gets the user data corresponding to the specified identifiers.<!-- -->There are no ordering guarantees; in particular, the nth entry in the result list is not guaranteed to correspond to the nth entry in the input parameters list.<!-- -->Only a maximum of 100 identifiers may be supplied. If more than 100 identifiers are supplied, this method will immediately throw a FirebaseAuthError. |
|  [importUsers(users, options)](./firebase-admin_.baseauth.md#baseauthimportusers_method) |  | Imports the list of users provided to Firebase Auth. This is useful when migrating from an external authentication system without having to use the Firebase CLI SDK. At most, 1000 users are allowed to be imported one at a time. When importing a list of password users, UserImportOptions are required to be specified. |
|  [listProviderConfigs(options)](./firebase-admin_.baseauth.md#baseauthlistproviderconfigs_method) |  | Returns the list of existing provider configuation matching the filter provided. At most, 100 provider configs are allowed to be imported at a time. |
|  [listUsers(maxResults, pageToken)](./firebase-admin_.baseauth.md#baseauthlistusers_method) |  | Exports a batch of user accounts. Batch size is determined by the maxResults argument. Starting point of the batch is determined by the pageToken argument. |
|  [revokeRefreshTokens(uid)](./firebase-admin_.baseauth.md#baseauthrevokerefreshtokens_method) |  | Revokes all refresh tokens for the specified user identified by the provided UID. In addition to revoking all refresh tokens for a user, all ID tokens issued before revocation will also be revoked on the Auth backend. Any request with an ID token generated before revocation will be rejected with a token expired error. |
|  [setCustomUserClaims(uid, customUserClaims)](./firebase-admin_.baseauth.md#baseauthsetcustomuserclaims_method) |  | Sets additional developer claims on an existing user identified by the provided UID. |
|  [updateProviderConfig(providerId, updatedConfig)](./firebase-admin_.baseauth.md#baseauthupdateproviderconfig_method) |  | Returns a promise that resolves with the updated AuthProviderConfig when the provider configuration corresponding to the provider ID specified is updated with the specified configuration. |
|  [updateUser(uid, properties)](./firebase-admin_.baseauth.md#baseauthupdateuser_method) |  | Updates an existing user with the properties provided. |
|  [verifyIdToken(idToken, checkRevoked)](./firebase-admin_.baseauth.md#baseauthverifyidtoken_method) |  | Verifies a JWT auth token. Returns a Promise with the tokens claims. Rejects the promise if the token could not be verified. If checkRevoked is set to true, verifies if the session corresponding to the ID token was revoked. If the corresponding user's session was invalidated, an auth/id-token-revoked error is thrown. If not specified the check is not applied. |
|  [verifySessionCookie(sessionCookie, checkRevoked)](./firebase-admin_.baseauth.md#baseauthverifysessioncookie_method) |  | Verifies a Firebase session cookie. Returns a Promise with the tokens claims. Rejects the promise if the token could not be verified. If checkRevoked is set to true, verifies if the session corresponding to the session cookie was revoked. If the corresponding user's session was invalidated, an auth/session-cookie-revoked error is thrown. If not specified the check is not performed. |

## BaseAuth.createCustomToken() method

Creates a new custom token that can be sent back to a client to use with signInWithCustomToken().

<b>Signature:</b>

```typescript
createCustomToken(uid: string, developerClaims?: object): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uid | string | The uid to use as the JWT subject. |
|  developerClaims | object | Optional additional claims to include in the JWT payload. {<!-- -->Promise<string>} A JWT for the provided payload. |

<b>Returns:</b>

Promise&lt;string&gt;

## BaseAuth.createProviderConfig() method

Returns a promise that resolves with the newly created AuthProviderConfig when the new provider configuration is created.

<b>Signature:</b>

```typescript
createProviderConfig(config: AuthProviderConfig): Promise<AuthProviderConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  config | [AuthProviderConfig](./firebase-admin_.authproviderconfig.md#authproviderconfig_interface) | The provider configuration to create.  {<!-- -->Promise<AuthProviderConfig>} A promise that resolves with the created provider configuration. |

<b>Returns:</b>

Promise&lt;[AuthProviderConfig](./firebase-admin_.authproviderconfig.md#authproviderconfig_interface)<!-- -->&gt;

## BaseAuth.createSessionCookie() method

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

## BaseAuth.createUser() method

Creates a new user with the properties provided.

<b>Signature:</b>

```typescript
createUser(properties: CreateRequest): Promise<UserRecord>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  properties | [CreateRequest](./firebase-admin_.createrequest.md#createrequest_interface) | The properties to set on the new user record to be created.  {<!-- -->Promise<UserRecord>} A promise that resolves with the newly created user record. |

<b>Returns:</b>

Promise&lt;[UserRecord](./firebase-admin_.userrecord.md#userrecord_class)<!-- -->&gt;

## BaseAuth.deleteProviderConfig() method

Deletes the provider configuration corresponding to the provider ID passed.

<b>Signature:</b>

```typescript
deleteProviderConfig(providerId: string): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  providerId | string | The provider ID corresponding to the provider config to delete.  {<!-- -->Promise<void>} A promise that resolves on completion. |

<b>Returns:</b>

Promise&lt;void&gt;

## BaseAuth.deleteUser() method

Deletes the user identified by the provided user id and returns a promise that is fulfilled when the user is found and successfully deleted.

<b>Signature:</b>

```typescript
deleteUser(uid: string): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uid | string | The uid of the user to delete.  {<!-- -->Promise<void>} A promise that resolves when the user is successfully deleted. |

<b>Returns:</b>

Promise&lt;void&gt;

## BaseAuth.deleteUsers() method

<b>Signature:</b>

```typescript
deleteUsers(uids: string[]): Promise<DeleteUsersResult>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uids | string\[\] |  |

<b>Returns:</b>

Promise&lt;[DeleteUsersResult](./firebase-admin_.deleteusersresult.md#deleteusersresult_interface)<!-- -->&gt;

## BaseAuth.generateEmailVerificationLink() method

Generates the out of band email action link for email verification flows for the email specified using the action code settings provided. Returns a promise that resolves with the generated link.

<b>Signature:</b>

```typescript
generateEmailVerificationLink(email: string, actionCodeSettings?: ActionCodeSettings): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  email | string | The email of the user to be verified. |
|  actionCodeSettings | [ActionCodeSettings](./firebase-admin_.actioncodesettings.md#actioncodesettings_interface) | The optional action code setings which defines whether the link is to be handled by a mobile app and the additional state information to be passed in the deep link, etc.  {<!-- -->Promise<string>} A promise that resolves with the email verification link. |

<b>Returns:</b>

Promise&lt;string&gt;

## BaseAuth.generatePasswordResetLink() method

Generates the out of band email action link for password reset flows for the email specified using the action code settings provided. Returns a promise that resolves with the generated link.

<b>Signature:</b>

```typescript
generatePasswordResetLink(email: string, actionCodeSettings?: ActionCodeSettings): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  email | string | The email of the user whose password is to be reset. |
|  actionCodeSettings | [ActionCodeSettings](./firebase-admin_.actioncodesettings.md#actioncodesettings_interface) | The optional action code setings which defines whether the link is to be handled by a mobile app and the additional state information to be passed in the deep link, etc.  {<!-- -->Promise<string>} A promise that resolves with the password reset link. |

<b>Returns:</b>

Promise&lt;string&gt;

## BaseAuth.generateSignInWithEmailLink() method

Generates the out of band email action link for email link sign-in flows for the email specified using the action code settings provided. Returns a promise that resolves with the generated link.

<b>Signature:</b>

```typescript
generateSignInWithEmailLink(email: string, actionCodeSettings: ActionCodeSettings): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  email | string | The email of the user signing in. |
|  actionCodeSettings | [ActionCodeSettings](./firebase-admin_.actioncodesettings.md#actioncodesettings_interface) | The required action code setings which defines whether the link is to be handled by a mobile app and the additional state information to be passed in the deep link, etc.  {<!-- -->Promise<string>} A promise that resolves with the email sign-in link. |

<b>Returns:</b>

Promise&lt;string&gt;

## BaseAuth.getProviderConfig() method

Looks up an Auth provider configuration by ID. Returns a promise that resolves with the provider configuration corresponding to the provider ID specified.

<b>Signature:</b>

```typescript
getProviderConfig(providerId: string): Promise<AuthProviderConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  providerId | string | The provider ID corresponding to the provider config to return.  {<!-- -->Promise<AuthProviderConfig>} |

<b>Returns:</b>

Promise&lt;[AuthProviderConfig](./firebase-admin_.authproviderconfig.md#authproviderconfig_interface)<!-- -->&gt;

## BaseAuth.getUser() method

Looks up the user identified by the provided user id and returns a promise that is fulfilled with a user record for the given user if that user is found.

<b>Signature:</b>

```typescript
getUser(uid: string): Promise<UserRecord>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uid | string | The uid of the user to look up.  {<!-- -->Promise<UserRecord>} A promise that resolves with the corresponding user record. |

<b>Returns:</b>

Promise&lt;[UserRecord](./firebase-admin_.userrecord.md#userrecord_class)<!-- -->&gt;

## BaseAuth.getUserByEmail() method

Looks up the user identified by the provided email and returns a promise that is fulfilled with a user record for the given user if that user is found.

<b>Signature:</b>

```typescript
getUserByEmail(email: string): Promise<UserRecord>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  email | string | The email of the user to look up.  {<!-- -->Promise<UserRecord>} A promise that resolves with the corresponding user record. |

<b>Returns:</b>

Promise&lt;[UserRecord](./firebase-admin_.userrecord.md#userrecord_class)<!-- -->&gt;

## BaseAuth.getUserByPhoneNumber() method

Looks up the user identified by the provided phone number and returns a promise that is fulfilled with a user record for the given user if that user is found.

<b>Signature:</b>

```typescript
getUserByPhoneNumber(phoneNumber: string): Promise<UserRecord>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  phoneNumber | string | The phone number of the user to look up.  {<!-- -->Promise<UserRecord>} A promise that resolves with the corresponding user record. |

<b>Returns:</b>

Promise&lt;[UserRecord](./firebase-admin_.userrecord.md#userrecord_class)<!-- -->&gt;

## BaseAuth.getUsers() method

Gets the user data corresponding to the specified identifiers.

There are no ordering guarantees; in particular, the nth entry in the result list is not guaranteed to correspond to the nth entry in the input parameters list.

Only a maximum of 100 identifiers may be supplied. If more than 100 identifiers are supplied, this method will immediately throw a FirebaseAuthError.

<b>Signature:</b>

```typescript
getUsers(identifiers: UserIdentifier[]): Promise<GetUsersResult>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  identifiers | [UserIdentifier](./firebase-admin_.md#useridentifier_type)<!-- -->\[\] | The identifiers used to indicate which user records should be returned. Must have &lt;<!-- -->= 100 entries.  {<!-- -->Promise<GetUsersResult>} A promise that resolves to the corresponding user records. |

<b>Returns:</b>

Promise&lt;[GetUsersResult](./firebase-admin_.getusersresult.md#getusersresult_interface)<!-- -->&gt;

## Exceptions

FirebaseAuthError If any of the identifiers are invalid or if more than 100 identifiers are specified.

## BaseAuth.importUsers() method

Imports the list of users provided to Firebase Auth. This is useful when migrating from an external authentication system without having to use the Firebase CLI SDK. At most, 1000 users are allowed to be imported one at a time. When importing a list of password users, UserImportOptions are required to be specified.

<b>Signature:</b>

```typescript
importUsers(users: UserImportRecord[], options?: UserImportOptions): Promise<UserImportResult>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  users | [UserImportRecord](./firebase-admin_.userimportrecord.md#userimportrecord_interface)<!-- -->\[\] | The list of user records to import to Firebase Auth. |
|  options | [UserImportOptions](./firebase-admin_.userimportoptions.md#userimportoptions_interface) | The user import options, required when the users provided include password credentials.  {<!-- -->Promise<UserImportResult>} A promise that resolves when the operation completes with the result of the import. This includes the number of successful imports, the number of failed uploads and their corresponding errors. |

<b>Returns:</b>

Promise&lt;[UserImportResult](./firebase-admin_.userimportresult.md#userimportresult_interface)<!-- -->&gt;

## BaseAuth.listProviderConfigs() method

Returns the list of existing provider configuation matching the filter provided. At most, 100 provider configs are allowed to be imported at a time.

<b>Signature:</b>

```typescript
listProviderConfigs(options: AuthProviderConfigFilter): Promise<ListProviderConfigResults>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [AuthProviderConfigFilter](./firebase-admin_.authproviderconfigfilter.md#authproviderconfigfilter_interface) | The provider config filter to apply.  {<!-- -->Promise<ListProviderConfigResults>} A promise that resolves with the list of provider configs meeting the filter requirements. |

<b>Returns:</b>

Promise&lt;[ListProviderConfigResults](./firebase-admin_.listproviderconfigresults.md#listproviderconfigresults_interface)<!-- -->&gt;

## BaseAuth.listUsers() method

Exports a batch of user accounts. Batch size is determined by the maxResults argument. Starting point of the batch is determined by the pageToken argument.

<b>Signature:</b>

```typescript
listUsers(maxResults?: number, pageToken?: string): Promise<ListUsersResult>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  maxResults | number | The page size, 1000 if undefined. This is also the maximum allowed limit. |
|  pageToken | string | The next page token. If not specified, returns users starting without any offset.  {<!-- -->Promise<!-- -->&lt;<!-- -->{<!-- -->users: UserRecord\[\], pageToken?: string<!-- -->}<!-- -->&gt;<!-- -->} A promise that resolves with the current batch of downloaded users and the next page token. For the last page, an empty list of users and no page token are returned. |

<b>Returns:</b>

Promise&lt;[ListUsersResult](./firebase-admin_.listusersresult.md#listusersresult_interface)<!-- -->&gt;

## BaseAuth.revokeRefreshTokens() method

Revokes all refresh tokens for the specified user identified by the provided UID. In addition to revoking all refresh tokens for a user, all ID tokens issued before revocation will also be revoked on the Auth backend. Any request with an ID token generated before revocation will be rejected with a token expired error.

<b>Signature:</b>

```typescript
revokeRefreshTokens(uid: string): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uid | string | The user whose tokens are to be revoked.  {<!-- -->Promise<void>} A promise that resolves when the operation completes successfully. |

<b>Returns:</b>

Promise&lt;void&gt;

## BaseAuth.setCustomUserClaims() method

Sets additional developer claims on an existing user identified by the provided UID.

<b>Signature:</b>

```typescript
setCustomUserClaims(uid: string, customUserClaims: object | null): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uid | string | The user to edit. |
|  customUserClaims | object \| null | The developer claims to set.  {<!-- -->Promise<void>} A promise that resolves when the operation completes successfully. |

<b>Returns:</b>

Promise&lt;void&gt;

## BaseAuth.updateProviderConfig() method

Returns a promise that resolves with the updated AuthProviderConfig when the provider configuration corresponding to the provider ID specified is updated with the specified configuration.

<b>Signature:</b>

```typescript
updateProviderConfig(providerId: string, updatedConfig: UpdateAuthProviderRequest): Promise<AuthProviderConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  providerId | string | The provider ID corresponding to the provider config to update. |
|  updatedConfig | [UpdateAuthProviderRequest](./firebase-admin_.md#updateauthproviderrequest_type) | The updated configuration.  {<!-- -->Promise<AuthProviderConfig>} A promise that resolves with the updated provider configuration. |

<b>Returns:</b>

Promise&lt;[AuthProviderConfig](./firebase-admin_.authproviderconfig.md#authproviderconfig_interface)<!-- -->&gt;

## BaseAuth.updateUser() method

Updates an existing user with the properties provided.

<b>Signature:</b>

```typescript
updateUser(uid: string, properties: UpdateRequest): Promise<UserRecord>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  uid | string | The uid identifier of the user to update. |
|  properties | [UpdateRequest](./firebase-admin_.updaterequest.md#updaterequest_interface) | The properties to update on the existing user.  {<!-- -->Promise<UserRecord>} A promise that resolves with the modified user record. |

<b>Returns:</b>

Promise&lt;[UserRecord](./firebase-admin_.userrecord.md#userrecord_class)<!-- -->&gt;

## BaseAuth.verifyIdToken() method

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

## BaseAuth.verifySessionCookie() method

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
