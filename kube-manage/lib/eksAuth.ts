export interface EksCredentials {
  clusterName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

const TOKEN_PREFIX = 'k8s-aws-v1.';

// ── Pure-JS SHA-256 ──────────────────────────────────────────────────────────

function rotr32(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const msgLen = data.length;
  const padLen = msgLen % 64 < 56 ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(data);
  padded[msgLen] = 0x80;
  const dv = new DataView(padded.buffer);
  const bitLen = msgLen * 8;
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32), false);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);
  for (let i = 0; i < padded.length; i += 64) {
    const chunk = new DataView(padded.buffer, i, 64);
    for (let j = 0; j < 16; j++) w[j] = chunk.getUint32(j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr32(w[j - 15], 7) ^ rotr32(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr32(w[j - 2], 17) ^ rotr32(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[j] + w[j]) | 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => ov.setUint32(i * 4, v, false));
  return out;
}

function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const k = key.length > 64 ? sha256(key) : key;
  const kp = new Uint8Array(64);
  kp.set(k);
  const inner = new Uint8Array(64 + data.length);
  const outer = new Uint8Array(96);
  for (let i = 0; i < 64; i++) { inner[i] = kp[i] ^ 0x36; outer[i] = kp[i] ^ 0x5c; }
  inner.set(data, 64);
  outer.set(sha256(inner), 64);
  return sha256(outer);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function strBytes(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64url(str: string): string {
  let out = '';
  for (let i = 0; i < str.length; i += 3) {
    const b0 = str.charCodeAt(i) & 0xff;
    const b1 = i + 1 < str.length ? str.charCodeAt(i + 1) & 0xff : 0;
    const b2 = i + 2 < str.length ? str.charCodeAt(i + 2) & 0xff : 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < str.length ? B64_CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] : '';
    out += i + 2 < str.length ? B64_CHARS[b2 & 0x3f] : '';
  }
  return out;
}

function deriveSigningKey(secretKey: string, dateStr: string, region: string, service: string): Uint8Array {
  const kDate    = hmacSha256(strBytes('AWS4' + secretKey), strBytes(dateStr));
  const kRegion  = hmacSha256(kDate,    strBytes(region));
  const kService = hmacSha256(kRegion,  strBytes(service));
  return             hmacSha256(kService, strBytes('aws4_request'));
}

// ── Self-test ────────────────────────────────────────────────────────────────

// Validates SHA-256 against FIPS 180-4 test vector: SHA-256("")
function assertSha256(): void {
  const result = toHex(sha256(new Uint8Array(0)));
  const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  if (result !== expected) {
    throw new Error(`[eksAuth] SHA-256 self-test FAILED.\n  got:      ${result}\n  expected: ${expected}`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates an EKS bearer token equivalent to `aws eks get-token`.
 * Uses a pure-JS SigV4 presigned STS GetCallerIdentity URL.
 */
export async function generateEksToken(creds: EksCredentials): Promise<string> {
  assertSha256();

  const now = new Date();
  const dateStr     = now.toISOString().slice(0, 10).replace(/-/g, '');
  const datetimeStr = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const region       = creds.region;
  const service      = 'sts';
  const stsHost      = `sts.${region}.amazonaws.com`;
  const credential   = `${creds.accessKeyId}/${dateStr}/${region}/${service}/aws4_request`;
  const signedHeaders = 'host;x-k8s-aws-id';

  const queryParams: Record<string, string> = {
    Action: 'GetCallerIdentity',
    Version: '2011-06-15',
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': datetimeStr,
    'X-Amz-Expires': '60',
    'X-Amz-SignedHeaders': signedHeaders,
  };
  if (creds.sessionToken) queryParams['X-Amz-Security-Token'] = creds.sessionToken;

  const sortedQueryString = Object.keys(queryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalHeaders  = `host:${stsHost}\nx-k8s-aws-id:${creds.clusterName}\n`;
  // SHA-256("") — matches what `aws eks get-token` produces; STS rejects UNSIGNED-PAYLOAD
  const emptyBodyHash     = toHex(sha256(new Uint8Array(0)));
  const canonicalRequest  = ['GET', '/', sortedQueryString, canonicalHeaders, signedHeaders, emptyBodyHash].join('\n');

  const credentialScope  = `${dateStr}/${region}/${service}/aws4_request`;
  const hashedCanonical  = toHex(sha256(strBytes(canonicalRequest)));
  const stringToSign     = ['AWS4-HMAC-SHA256', datetimeStr, credentialScope, hashedCanonical].join('\n');

  const signingKey = deriveSigningKey(creds.secretAccessKey, dateStr, region, service);
  const signature  = toHex(hmacSha256(signingKey, strBytes(stringToSign)));

  const presignedUrl = `https://${stsHost}/?${sortedQueryString}&X-Amz-Signature=${signature}`;

  if (__DEV__) {
    console.log('[EKS] presigned URL:', presignedUrl);
  }

  return TOKEN_PREFIX + base64url(presignedUrl);
}
