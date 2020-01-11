export interface AuthCredential {
    readonly providerId: string;
    readonly signInMethod: string;
    toJSON(): object;
}

export interface OAuthCredential extends AuthCredential {
    readonly idToken?: string;
    readonly accessToken?: string;
    readonly secret?: string;
    toJSON(): object;
}