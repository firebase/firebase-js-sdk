Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# FirebaseAuthProvider class
<b>Signature:</b>

```typescript
export declare class FirebaseAuthProvider implements AuthTokenProvider 
```
<b>Implements:</b> [AuthTokenProvider](./data-connect.authtokenprovider.md#authtokenprovider_interface)

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(\_appName, \_options, \_authProvider)](./data-connect.firebaseauthprovider.md#firebaseauthproviderconstructor) |  | Constructs a new instance of the <code>FirebaseAuthProvider</code> class |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [addTokenChangeListener(listener)](./data-connect.firebaseauthprovider.md#firebaseauthprovideraddtokenchangelistener) |  |  |
|  [getToken(forceRefresh)](./data-connect.firebaseauthprovider.md#firebaseauthprovidergettoken) |  |  |
|  [removeTokenChangeListener(listener)](./data-connect.firebaseauthprovider.md#firebaseauthproviderremovetokenchangelistener) |  |  |

## FirebaseAuthProvider.(constructor)

Constructs a new instance of the `FirebaseAuthProvider` class

<b>Signature:</b>

```typescript
constructor(_appName: string, _options: FirebaseOptions, _authProvider: Provider<FirebaseAuthInternalName>);
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  \_appName | string |  |
|  \_options | [FirebaseOptions](./app.firebaseoptions.md#firebaseoptions_interface) |  |
|  \_authProvider | Provider&lt;FirebaseAuthInternalName&gt; |  |

## FirebaseAuthProvider.addTokenChangeListener()

<b>Signature:</b>

```typescript
addTokenChangeListener(listener: AuthTokenListener): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  listener | [AuthTokenListener](./data-connect.md#authtokenlistener) |  |

<b>Returns:</b>

void

## FirebaseAuthProvider.getToken()

<b>Signature:</b>

```typescript
getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  forceRefresh | boolean |  |

<b>Returns:</b>

Promise&lt;FirebaseAuthTokenData \| null&gt;

## FirebaseAuthProvider.removeTokenChangeListener()

<b>Signature:</b>

```typescript
removeTokenChangeListener(listener: (token: string | null) => void): void;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  listener | (token: string \| null) =&gt; void |  |

<b>Returns:</b>

void
