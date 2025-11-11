/**
 * Compute SHA256 hash of a string using Web Crypto API
 * This must produce the same hash as the backend InsightService.computeHash()
 */
export async function computeHash(text: string): Promise<string> {
  // Encode the text as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Compute SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
