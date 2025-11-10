export async function generateSHA256HashBrowser(input: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
}