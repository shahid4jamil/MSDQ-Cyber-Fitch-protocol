// Client-Side Provably Fair Cryptographic Verification Engine

export async function computeSha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyCrashRoundClient(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  expectedHashCommitment?: string
): Promise<{
  computedHash: string;
  crashMultiplier: number;
  hashMatches: boolean;
}> {
  const payload = `${serverSeed}:${clientSeed}:${nonce}`;
  const computedHash = await computeSha256(payload);

  // 52-bit provably fair derivation
  const h = parseInt(computedHash.slice(0, 13), 16);
  const e = Math.pow(2, 52);

  let crashMultiplier = 1.0;
  if (h % 33 !== 0) {
    const raw = Math.floor((100 * e - h) / (e - h)) / 100;
    crashMultiplier = parseFloat(Math.max(1.01, Math.min(250.0, raw)).toFixed(2));
  }

  const hashMatches = expectedHashCommitment
    ? computedHash.toLowerCase() === expectedHashCommitment.toLowerCase()
    : true;

  return {
    computedHash,
    crashMultiplier,
    hashMatches,
  };
}
