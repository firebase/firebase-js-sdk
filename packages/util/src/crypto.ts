import type { KeyObject } from "crypto";

export function importJwk(jwk: {
    [key: string]: string;
    kid: string;
}): Promise<CryptoKey | KeyObject> {
    // @ts-ignore
    return crypto.subtle.importKey(
        'jwk',
        jwk,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['verify']
      );
}

export function verifyJWTSignature(
    content: string,
    publicKey: CryptoKey | KeyObject,
    signature: string
): Promise<boolean> {
    return crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        publicKey as CryptoKey,
        base64ToUint8Array(signature),
        stringToUint8Array(content)
      );
}

function base64decode(base64Contents: string): string {
  base64Contents = base64Contents
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/\s/g, '');
  return atob(base64Contents);
}

function base64ToUint8Array(base64Contents: string): Uint8Array {
  return new Uint8Array(
    base64decode(base64Contents)
      .split('')
      .map(c => c.charCodeAt(0))
  );
}

function stringToUint8Array(contents: string): Uint8Array {
  const encoded = btoa(unescape(encodeURIComponent(contents)));
  return base64ToUint8Array(encoded);
}
