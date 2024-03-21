import { createPublicKey, KeyObject, createVerify } from "crypto";

export function importJwk(jwk: {
    [key: string]: string;
    kid: string;
}): Promise<KeyObject> {
    return Promise.resolve(createPublicKey({ key: jwk, format: 'jwk' }));
}

export function verifyJWTSignature(
    content: string,
    publicKey: KeyObject,
    signature: string
): Promise<boolean> {
    return Promise.resolve(
        createVerify('RSA-SHA256')
            .end(content)
            .verify(publicKey, signature, 'base64url')
    );
}
