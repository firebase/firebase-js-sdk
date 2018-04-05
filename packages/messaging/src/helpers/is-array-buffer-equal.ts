export function isArrayBufferEqual(
  a: ArrayBuffer | undefined | null,
  b: ArrayBuffer | undefined | null
): boolean {
  if (a == null || b == null) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const viewA = new DataView(a);
  const viewB = new DataView(b);

  for (let i = 0; i < a.byteLength; i++) {
    if (viewA.getUint8(i) !== viewB.getUint8(i)) {
      return false;
    }
  }

  return true;
}
