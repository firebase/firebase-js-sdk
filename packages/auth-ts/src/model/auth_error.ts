export interface AuthError {
    readonly code: string;
    readonly message: string;
    readonly email?: string;
    readonly phoneNumber?: string;
    readonly credentialProviderId?: string;
    readonly tenantId?: string;
}