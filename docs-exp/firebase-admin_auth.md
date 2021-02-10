{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## firebase-admin/auth

## Classes

|  Class | Description |
|  --- | --- |
|  [Auth](./firebase-admin_auth.auth.md#auth_class) | Auth service bound to the provided app. An Auth instance can have multiple tenants. |
|  [BaseAuth](./firebase-admin_auth.baseauth.md#baseauth_class) | Base Auth class. Mainly used for user management APIs. |
|  [MultiFactorInfo](./firebase-admin_auth.multifactorinfo.md#multifactorinfo_class) | Abstract class representing a multi-factor info interface. |
|  [MultiFactorSettings](./firebase-admin_auth.multifactorsettings.md#multifactorsettings_class) | Class representing multi-factor related properties of a user. |
|  [PhoneMultiFactorInfo](./firebase-admin_auth.phonemultifactorinfo.md#phonemultifactorinfo_class) | Class representing a phone MultiFactorInfo object. |
|  [Tenant](./firebase-admin_auth.tenant.md#tenant_class) | Tenant class that defines a Firebase Auth tenant. |
|  [TenantAwareAuth](./firebase-admin_auth.tenantawareauth.md#tenantawareauth_class) | The tenant aware Auth class. |
|  [TenantManager](./firebase-admin_auth.tenantmanager.md#tenantmanager_class) | Data structure used to help manage tenant related operations. This includes: - The ability to create, update, list, get and delete tenants for the underlying project. - Getting a TenantAwareAuth instance for running Auth related operations (user mgmt, provider config mgmt, etc) in the context of a specified tenant. |
|  [UserInfo](./firebase-admin_auth.userinfo.md#userinfo_class) | User info class that provides provider user information for different Firebase providers like google.com, facebook.com, password, etc. |
|  [UserMetadata](./firebase-admin_auth.usermetadata.md#usermetadata_class) | User metadata class that provides metadata information like user account creation and last sign in time. |
|  [UserRecord](./firebase-admin_auth.userrecord.md#userrecord_class) | User record class that defines the Firebase user object populated from the Firebase Auth getAccountInfo response. |

## Functions

|  Function | Description |
|  --- | --- |
|  [auth(app)](./firebase-admin_auth.md#auth_function) | Gets the  service for the default app or a given app.<code>admin.auth()</code> can be called with no arguments to access the default app's  service or as <code>admin.auth(app)</code> to access the  service associated with a specific app. |
|  [getAuth(app)](./firebase-admin_auth.md#getauth_function) |  |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ActionCodeSettings](./firebase-admin_auth.actioncodesettings.md#actioncodesettings_interface) | This is the interface that defines the required continue/state URL with optional Android and iOS bundle identifiers. |
|  [App](./firebase-admin_auth.app.md#app_interface) |  |
|  [AppOptions](./firebase-admin_auth.appoptions.md#appoptions_interface) | Available options to pass to \[<code>initializeApp()</code>\](admin\#.initializeApp). |
|  [AuthProviderConfig](./firebase-admin_auth.authproviderconfig.md#authproviderconfig_interface) | The base Auth provider configuration interface. |
|  [AuthProviderConfigFilter](./firebase-admin_auth.authproviderconfigfilter.md#authproviderconfigfilter_interface) | The filter interface used for listing provider configurations. This is used when specifying how to list configured identity providers via . |
|  [CreateMultiFactorInfoRequest](./firebase-admin_auth.createmultifactorinforequest.md#createmultifactorinforequest_interface) | Interface representing base properties of a user enrolled second factor for a <code>CreateRequest</code>. |
|  [CreatePhoneMultiFactorInfoRequest](./firebase-admin_auth.createphonemultifactorinforequest.md#createphonemultifactorinforequest_interface) | Interface representing a phone specific user enrolled second factor for a <code>CreateRequest</code>. |
|  [CreateRequest](./firebase-admin_auth.createrequest.md#createrequest_interface) | Interface representing the properties to set on a new user record to be created. |
|  [Credential](./firebase-admin_auth.credential.md#credential_interface) |  |
|  [DecodedIdToken](./firebase-admin_auth.decodedidtoken.md#decodedidtoken_interface) | Interface representing a decoded Firebase ID token, returned from the  method.<!-- -->Firebase ID tokens are OpenID Connect spec-compliant JSON Web Tokens (JWTs). See the \[ID Token section of the OpenID Connect spec\](http://openid.net/specs/openid-connect-core-1\_0.html\#IDToken) for more information about the specific properties below. |
|  [DeleteUsersResult](./firebase-admin_auth.deleteusersresult.md#deleteusersresult_interface) | Represents the result of the  API. |
|  [EmailIdentifier](./firebase-admin_auth.emailidentifier.md#emailidentifier_interface) | Used for looking up an account by email.<!-- -->See auth.getUsers() |
|  [EmailSignInProviderConfig](./firebase-admin_auth.emailsigninproviderconfig.md#emailsigninproviderconfig_interface) | The email sign in configuration. |
|  [FirebaseArrayIndexError](./firebase-admin_auth.firebasearrayindexerror.md#firebasearrayindexerror_interface) | Composite type which includes both a <code>FirebaseError</code> object and an index which can be used to get the errored item. |
|  [FirebaseError](./firebase-admin_auth.firebaseerror.md#firebaseerror_interface) | <code>FirebaseError</code> is a subclass of the standard JavaScript <code>Error</code> object. In addition to a message string and stack trace, it contains a string code. |
|  [GetUsersResult](./firebase-admin_auth.getusersresult.md#getusersresult_interface) | Represents the result of the  API. |
|  [GoogleOAuthAccessToken](./firebase-admin_auth.googleoauthaccesstoken.md#googleoauthaccesstoken_interface) | Interface for Google OAuth 2.0 access tokens. |
|  [ListProviderConfigResults](./firebase-admin_auth.listproviderconfigresults.md#listproviderconfigresults_interface) | The response interface for listing provider configs. This is only available when listing all identity providers' configurations via . |
|  [ListTenantsResult](./firebase-admin_auth.listtenantsresult.md#listtenantsresult_interface) | Interface representing the object returned from a  operation. Contains the list of tenants for the current batch and the next page token if available. |
|  [ListUsersResult](./firebase-admin_auth.listusersresult.md#listusersresult_interface) | Interface representing the object returned from a  operation. Contains the list of users for the current batch and the next page token if available. |
|  [MultiFactorConfig](./firebase-admin_auth.multifactorconfig.md#multifactorconfig_interface) |  |
|  [MultiFactorCreateSettings](./firebase-admin_auth.multifactorcreatesettings.md#multifactorcreatesettings_interface) | The multi-factor related user settings for create operations. |
|  [MultiFactorUpdateSettings](./firebase-admin_auth.multifactorupdatesettings.md#multifactorupdatesettings_interface) | The multi-factor related user settings for update operations. |
|  [OIDCAuthProviderConfig](./firebase-admin_auth.oidcauthproviderconfig.md#oidcauthproviderconfig_interface) | The \[OIDC\](https://openid.net/specs/openid-connect-core-1\_0-final.html) Auth provider configuration interface. An OIDC provider can be created via . |
|  [OIDCUpdateAuthProviderRequest](./firebase-admin_auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequest_interface) | The request interface for updating an OIDC Auth provider. This is used when updating an OIDC provider's configuration via . |
|  [PhoneIdentifier](./firebase-admin_auth.phoneidentifier.md#phoneidentifier_interface) | Used for looking up an account by phone number.<!-- -->See auth.getUsers() |
|  [ProviderIdentifier](./firebase-admin_auth.provideridentifier.md#provideridentifier_interface) | Used for looking up an account by federated provider.<!-- -->See auth.getUsers() |
|  [SAMLAuthProviderConfig](./firebase-admin_auth.samlauthproviderconfig.md#samlauthproviderconfig_interface) | The \[SAML\](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) Auth provider configuration interface. A SAML provider can be created via . |
|  [SAMLUpdateAuthProviderRequest](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequest_interface) | The request interface for updating a SAML Auth provider. This is used when updating a SAML provider's configuration via . |
|  [SessionCookieOptions](./firebase-admin_auth.sessioncookieoptions.md#sessioncookieoptions_interface) | Interface representing the session cookie options needed for the  method. |
|  [UidIdentifier](./firebase-admin_auth.uididentifier.md#uididentifier_interface) | Used for looking up an account by uid.<!-- -->See auth.getUsers() |
|  [UpdateMultiFactorInfoRequest](./firebase-admin_auth.updatemultifactorinforequest.md#updatemultifactorinforequest_interface) | Interface representing common properties of a user enrolled second factor for an <code>UpdateRequest</code>. |
|  [UpdatePhoneMultiFactorInfoRequest](./firebase-admin_auth.updatephonemultifactorinforequest.md#updatephonemultifactorinforequest_interface) | Interface representing a phone specific user enrolled second factor for an <code>UpdateRequest</code>. |
|  [UpdateRequest](./firebase-admin_auth.updaterequest.md#updaterequest_interface) | Interface representing the properties to update on the provided user. |
|  [UpdateTenantRequest](./firebase-admin_auth.updatetenantrequest.md#updatetenantrequest_interface) | Interface representing the properties to update on the provided tenant. |
|  [UserImportOptions](./firebase-admin_auth.userimportoptions.md#userimportoptions_interface) | Interface representing the user import options needed for  method. This is used to provide the password hashing algorithm information. |
|  [UserImportRecord](./firebase-admin_auth.userimportrecord.md#userimportrecord_interface) | Interface representing a user to import to Firebase Auth via the  method. |
|  [UserImportResult](./firebase-admin_auth.userimportresult.md#userimportresult_interface) | Interface representing the response from the  method for batch importing users to Firebase Auth. |
|  [UserMetadataRequest](./firebase-admin_auth.usermetadatarequest.md#usermetadatarequest_interface) | User metadata to include when importing a user. |
|  [UserProviderRequest](./firebase-admin_auth.userproviderrequest.md#userproviderrequest_interface) | User provider data to include when importing a user. |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [auth](./firebase-admin_auth.md#auth_namespace) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [AuthFactorType](./firebase-admin_auth.md#authfactortype_type) | Identifies a second factor type. |
|  [CreateTenantRequest](./firebase-admin_auth.md#createtenantrequest_type) | Interface representing the properties to set on a new tenant. |
|  [HashAlgorithmType](./firebase-admin_auth.md#hashalgorithmtype_type) |  |
|  [MultiFactorConfigState](./firebase-admin_auth.md#multifactorconfigstate_type) | Identifies a multi-factor configuration state. |
|  [UpdateAuthProviderRequest](./firebase-admin_auth.md#updateauthproviderrequest_type) |  |
|  [UserIdentifier](./firebase-admin_auth.md#useridentifier_type) | Identifies a user to be looked up. |

## auth() function

Gets the  service for the default app or a given app.

`admin.auth()` can be called with no arguments to access the default app's  service or as `admin.auth(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function auth(app?: App): auth.Auth;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

[auth.Auth](./firebase-admin_.md#authauth_type)

## Example 1


```javascript
// Get the Auth service for the default app
var defaultAuth = admin.auth();

```

## Example 2


```javascript
// Get the Auth service for a given app
var otherAuth = admin.auth(otherApp);

```

## getAuth() function

<b>Signature:</b>

```typescript
export declare function getAuth(app?: App): Auth;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

[Auth](./firebase-admin_.auth.md#auth_class)

## AuthFactorType type

Identifies a second factor type.

<b>Signature:</b>

```typescript
export declare type AuthFactorType = 'phone';
```

## CreateTenantRequest type

Interface representing the properties to set on a new tenant.

<b>Signature:</b>

```typescript
export declare type CreateTenantRequest = UpdateTenantRequest;
```

## HashAlgorithmType type

<b>Signature:</b>

```typescript
export declare type HashAlgorithmType = 'SCRYPT' | 'STANDARD_SCRYPT' | 'HMAC_SHA512' | 'HMAC_SHA256' | 'HMAC_SHA1' | 'HMAC_MD5' | 'MD5' | 'PBKDF_SHA1' | 'BCRYPT' | 'PBKDF2_SHA256' | 'SHA512' | 'SHA256' | 'SHA1';
```

## MultiFactorConfigState type

Identifies a multi-factor configuration state.

<b>Signature:</b>

```typescript
export declare type MultiFactorConfigState = 'ENABLED' | 'DISABLED';
```

## UpdateAuthProviderRequest type

<b>Signature:</b>

```typescript
export declare type UpdateAuthProviderRequest = SAMLUpdateAuthProviderRequest | OIDCUpdateAuthProviderRequest;
```

## UserIdentifier type

Identifies a user to be looked up.

<b>Signature:</b>

```typescript
export declare type UserIdentifier = UidIdentifier | EmailIdentifier | PhoneIdentifier | ProviderIdentifier;
```
{% endblock body %}
