{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## auth-types package

## Classes

|  Class | Description |
|  --- | --- |
|  [ActionCodeURL](./auth-types.actioncodeurl.md#actioncodeurl_class) | A utility class to parse email action URLs such as password reset, email verification, email link sign in, etc. |
|  [AuthCredential](./auth-types.authcredential.md#authcredential_class) | Interface that represents the credentials returned by an [AuthProvider](./auth-types.authprovider.md#authprovider_interface)<!-- -->. |
|  [EmailAuthProvider](./auth-types.emailauthprovider.md#emailauthprovider_class) | Provider for generating [EmailAuthCredential](./auth.emailauthcredential.md#emailauthcredential_class)<!-- -->. |
|  [OAuthCredential](./auth-types.oauthcredential.md#oauthcredential_class) | Interface that represents the OAuth credentials returned by an [OAuthProvider](./auth.oauthprovider.md#oauthprovider_class)<!-- -->. |
|  [PhoneAuthCredential](./auth-types.phoneauthcredential.md#phoneauthcredential_class) | Interface that represents the credentials returned by a [PhoneAuthProvider](./auth.phoneauthprovider.md#phoneauthprovider_class)<!-- -->. |
|  [PhoneAuthProvider](./auth-types.phoneauthprovider.md#phoneauthprovider_class) | Provider for generating an [PhoneAuthCredential](./auth.phoneauthcredential.md#phoneauthcredential_class)<!-- -->. |
|  [PhoneMultiFactorGenerator](./auth-types.phonemultifactorgenerator.md#phonemultifactorgenerator_class) | Provider for generating a [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface)<!-- -->. |
|  [RecaptchaVerifier](./auth-types.recaptchaverifier.md#recaptchaverifier_class) | An [reCAPTCHA](https://www.google.com/recaptcha/)<!-- -->-based application verifier. |

## Enumerations

|  Enumeration | Description |
|  --- | --- |
|  [ActionCodeOperation](./auth-types.md#actioncodeoperation_enum) | An enumeration of the possible email action types. |
|  [FactorId](./auth-types.md#factorid_enum) | An enum of factors that may be used for multifactor authentication. |
|  [OperationType](./auth-types.md#operationtype_enum) | Enumeration of supported operation types. |
|  [ProviderId](./auth-types.md#providerid_enum) | Enumeration of supported providers. |
|  [SignInMethod](./auth-types.md#signinmethod_enum) | Enumeration of supported sign-in methods. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ActionCodeInfo](./auth-types.actioncodeinfo.md#actioncodeinfo_interface) | A response from [checkActionCode()](./auth.md#checkactioncode_function)<!-- -->. |
|  [ActionCodeSettings](./auth-types.actioncodesettings.md#actioncodesettings_interface) | An interface that defines the required continue/state URL with optional Android and iOS bundle identifiers. |
|  [AdditionalUserInfo](./auth-types.additionaluserinfo.md#additionaluserinfo_interface) | A structure containing additional user information from a federated identity provider. |
|  [ApplicationVerifier](./auth-types.applicationverifier.md#applicationverifier_interface) | A verifier for domain verification and abuse prevention. |
|  [Auth](./auth-types.auth.md#auth_interface) | Interface representing Firebase Auth service. |
|  [AuthError](./auth-types.autherror.md#autherror_interface) | Interface for an Auth error. |
|  [AuthErrorMap](./auth-types.autherrormap.md#autherrormap_interface) | A mapping of error codes to error messages.<!-- -->While error messages are useful for debugging (providing verbose textual context around what went wrong), these strings take up a lot of space in the compiled code. When deploying code in production, using  will save you roughly 10k compressed/gzipped over . You can select the error map during initialization:
```javascript
initializeAuth(app, {errorMap: debugErrorMap})

```
When initializing Auth,  is default. |
|  [AuthProvider](./auth-types.authprovider.md#authprovider_interface) | Interface that represents an auth provider, used to facilitate creating [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->. |
|  [AuthSettings](./auth-types.authsettings.md#authsettings_interface) | Interface representing an Auth instance's settings. |
|  [Config](./auth-types.config.md#config_interface) | Interface representing the Auth config. |
|  [ConfirmationResult](./auth-types.confirmationresult.md#confirmationresult_interface) | A result from a phone number sign-in, link, or reauthenticate call. |
|  [IdTokenResult](./auth-types.idtokenresult.md#idtokenresult_interface) | Interface representing ID token result obtained from [User.getIdTokenResult()](./auth-types.user.md#usergetidtokenresult_method)<!-- -->. |
|  [MultiFactorAssertion](./auth-types.multifactorassertion.md#multifactorassertion_interface) | The base class for asserting ownership of a second factor. |
|  [MultiFactorError](./auth-types.multifactorerror.md#multifactorerror_interface) | The error thrown when the user needs to provide a second factor to sign in successfully. |
|  [MultiFactorInfo](./auth-types.multifactorinfo.md#multifactorinfo_interface) | A structure containing the information of a second factor entity. |
|  [MultiFactorResolver](./auth-types.multifactorresolver.md#multifactorresolver_interface) | The class used to facilitate recovery from [MultiFactorError](./auth-types.multifactorerror.md#multifactorerror_interface) when a user needs to provide a second factor to sign in. |
|  [MultiFactorSession](./auth-types.multifactorsession.md#multifactorsession_interface) | An interface defining the multi-factor session object used for enrolling a second factor on a user or helping sign in an enrolled user with a second factor. |
|  [MultiFactorUser](./auth-types.multifactoruser.md#multifactoruser_interface) | An interface that defines the multi-factor related properties and operations pertaining to a [User](./auth-types.user.md#user_interface)<!-- -->. |
|  [ParsedToken](./auth-types.parsedtoken.md#parsedtoken_interface) | Interface representing a parsed ID token. |
|  [Persistence](./auth-types.persistence.md#persistence_interface) | An interface covering the possible persistence mechanism types. |
|  [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface) | The class for asserting ownership of a phone second factor. Provided by [PhoneMultiFactorGenerator.assertion()](./auth-types.phonemultifactorgenerator.md#phonemultifactorgeneratorassertion_method)<!-- -->. |
|  [PhoneMultiFactorEnrollInfoOptions](./auth-types.phonemultifactorenrollinfooptions.md#phonemultifactorenrollinfooptions_interface) | Options used for enrolling a second factor. |
|  [PhoneMultiFactorSignInInfoOptions](./auth-types.phonemultifactorsignininfooptions.md#phonemultifactorsignininfooptions_interface) | Options used for signing-in with a second factor. |
|  [PhoneSingleFactorInfoOptions](./auth-types.phonesinglefactorinfooptions.md#phonesinglefactorinfooptions_interface) | Options used for single-factor sign-in. |
|  [PopupRedirectResolver](./auth-types.popupredirectresolver.md#popupredirectresolver_interface) | A resolver used for handling DOM specific operations like [signInWithPopup()](./auth.md#signinwithpopup_function) or [signInWithRedirect()](./auth.md#signinwithredirect_function)<!-- -->. |
|  [ReactNativeAsyncStorage](./auth-types.reactnativeasyncstorage.md#reactnativeasyncstorage_interface) | Interface for a supplied AsyncStorage. |
|  [User](./auth-types.user.md#user_interface) | A user account. |
|  [UserCredential](./auth-types.usercredential.md#usercredential_interface) | A structure containing a [User](./auth-types.user.md#user_interface)<!-- -->, an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->, the [OperationType](./auth-types.md#operationtype_enum)<!-- -->, and any additional user information that was returned from the identity provider. |
|  [UserInfo](./auth-types.userinfo.md#userinfo_interface) | User profile information, visible only to the Firebase project's apps. |
|  [UserMetadata](./auth-types.usermetadata.md#usermetadata_interface) | Interface representing a user's metadata. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [NextOrObserver](./auth-types.md#nextorobserver_type) | Type definition for an event callback. |
|  [PhoneInfoOptions](./auth-types.md#phoneinfooptions_type) | The information required to verify the ownership of a phone number. |
|  [UserProfile](./auth-types.md#userprofile_type) | User profile used in [AdditionalUserInfo](./auth-types.additionaluserinfo.md#additionaluserinfo_interface)<!-- -->. |

## NextOrObserver type

Type definition for an event callback.

<b>Signature:</b>

```typescript
export type NextOrObserver<T> = NextFn<T | null> | Observer<T | null>;
```

## PhoneInfoOptions type

The information required to verify the ownership of a phone number.

<b>Signature:</b>

```typescript
export type PhoneInfoOptions =
  | PhoneSingleFactorInfoOptions
  | PhoneMultiFactorEnrollInfoOptions
  | PhoneMultiFactorSignInInfoOptions;
```

## Remarks

The information that's required depends on whether you are doing single-factor sign-in, multi-factor enrollment or multi-factor sign-in.

## UserProfile type

User profile used in [AdditionalUserInfo](./auth-types.additionaluserinfo.md#additionaluserinfo_interface)<!-- -->.

<b>Signature:</b>

```typescript
export type UserProfile = Record<string, unknown>;
```

## ActionCodeOperation enum

An enumeration of the possible email action types.

<b>Signature:</b>

```typescript
export const enum ActionCodeOperation 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  EMAIL\_SIGNIN | <code>'EMAIL_SIGNIN'</code> | The email link sign-in action. |
|  PASSWORD\_RESET | <code>'PASSWORD_RESET'</code> | The password reset action. |
|  RECOVER\_EMAIL | <code>'RECOVER_EMAIL'</code> | The email revocation action. |
|  REVERT\_SECOND\_FACTOR\_ADDITION | <code>'REVERT_SECOND_FACTOR_ADDITION'</code> | The revert second factor addition email action. |
|  VERIFY\_AND\_CHANGE\_EMAIL | <code>'VERIFY_AND_CHANGE_EMAIL'</code> | The revert second factor addition email action. |
|  VERIFY\_EMAIL | <code>'VERIFY_EMAIL'</code> | The email verification action. |

## FactorId enum

An enum of factors that may be used for multifactor authentication.

<b>Signature:</b>

```typescript
export const enum FactorId 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  PHONE | <code>'phone'</code> | Phone as second factor |

## OperationType enum

Enumeration of supported operation types.

<b>Signature:</b>

```typescript
export const enum OperationType 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  LINK | <code>'link'</code> | Operation involving linking an additional provider to an already signed-in user. |
|  REAUTHENTICATE | <code>'reauthenticate'</code> | Operation involving using a provider to reauthenticate an already signed-in user. |
|  SIGN\_IN | <code>'signIn'</code> | Operation involving signing in a user. |

## ProviderId enum

Enumeration of supported providers.

<b>Signature:</b>

```typescript
export const enum ProviderId 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  ANONYMOUS | <code>'anonymous'</code> |  |
|  CUSTOM | <code>'custom'</code> |  |
|  FACEBOOK | <code>'facebook.com'</code> |  |
|  FIREBASE | <code>'firebase'</code> |  |
|  GITHUB | <code>'github.com'</code> |  |
|  GOOGLE | <code>'google.com'</code> |  |
|  PASSWORD | <code>'password'</code> |  |
|  PHONE | <code>'phone'</code> |  |
|  TWITTER | <code>'twitter.com'</code> |  |

## SignInMethod enum

Enumeration of supported sign-in methods.

<b>Signature:</b>

```typescript
export const enum SignInMethod 
```

## Enumeration Members

|  Member | Value | Description |
|  --- | --- | --- |
|  ANONYMOUS | <code>'anonymous'</code> |  |
|  EMAIL\_LINK | <code>'emailLink'</code> |  |
|  EMAIL\_PASSWORD | <code>'password'</code> |  |
|  FACEBOOK | <code>'facebook.com'</code> |  |
|  GITHUB | <code>'github.com'</code> |  |
|  GOOGLE | <code>'google.com'</code> |  |
|  PHONE | <code>'phone'</code> |  |
|  TWITTER | <code>'twitter.com'</code> |  |

{% endblock body %}
