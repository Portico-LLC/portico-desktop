/**
 * All Vault cryptography lives in this one file — nothing outside it should
 * touch `crypto.subtle` or raw key material directly. That keeps the crypto
 * surface auditable in a single place.
 *
 * Design (see the plan doc for the full rationale):
 * - RSA-OAEP-4096/SHA-256 keypair per principal, used only to wrap/unwrap small
 *   AES keys (never to encrypt bulk data directly).
 * - AES-256-GCM for everything symmetric: wrapping a principal's private key at
 *   rest, and encrypting vault item contents.
 * - Argon2id (via the `hash-wasm` WASM library — the Web Crypto API has no
 *   Argon2, only PBKDF2) stretches the vault passphrase / recovery key into an
 *   AES key-encryption-key (KEK). Native Web Crypto has no Argon2 primitive.
 * - The server only ever sees: public keys, and ciphertext+iv blobs it cannot
 *   decrypt. Every function below runs entirely in the browser.
 */
import { argon2id } from 'hash-wasm';

// Interactive (login-time) Argon2id parameters — deliberately conservative
// enough to resist brute-forcing while staying under ~1s on typical hardware.
// Tuned parameters are stored per-identity (`kdfParams`) so they can be
// strengthened later without breaking existing identities.
const DEFAULT_ARGON2_PARAMS = {
  iterations: 3,
  parallelism: 1,
  memorySize: 65536, // 64 MiB, in KiB
  hashLength: 32, // 256-bit AES key
} as const;

const RSA_OAEP_PARAMS = { name: 'RSA-OAEP', modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
const AES_GCM_LENGTH = 256;

export interface WrappedBlob {
  ciphertext: string;
  iv: string;
}

export interface VaultIdentitySetup {
  publicKey: string;
  encryptedPrivateKey: string;
  encryptedPrivateKeyIv: string;
  kdfSalt: string;
  kdfParams: Record<string, unknown>;
  recoveryEncryptedPrivateKey: string;
  recoveryEncryptedPrivateKeyIv: string;
  recoveryKdfSalt: string;
}

// ---------------- encoding helpers ----------------

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// TS's DOM lib types Web Crypto APIs as taking `BufferSource` (an ArrayBuffer-backed
// view), while `Uint8Array` values here are inferred as the wider `Uint8Array<ArrayBufferLike>`
// (which also covers SharedArrayBuffer) — a type-level mismatch only, not a runtime one,
// since every buffer here is always a plain ArrayBuffer. This cast is the boundary for it.
function bs(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** A one-time recovery code, formatted as readable hyphenated groups (like a license key). */
export function generateRecoveryKey(): string {
  const hex = bytesToHex(randomBytes(20)); // 160 bits, 40 hex chars
  return hex.toUpperCase().match(/.{1,4}/g)!.join('-');
}

// ---------------- KDF ----------------

async function deriveKek(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyBytes = await argon2id({
    password: secret,
    salt,
    ...DEFAULT_ARGON2_PARAMS,
    outputType: 'binary',
  });
  return crypto.subtle.importKey('raw', bs(keyBytes), { name: 'AES-GCM' }, false, ['wrapKey', 'unwrapKey']);
}

// ---------------- keypair ----------------

export async function generateKeypair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(RSA_OAEP_PARAMS, true, ['wrapKey', 'unwrapKey']) as Promise<CryptoKeyPair>;
}

async function exportPublicKey(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', key);
  return bufToBase64(spki);
}

async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', bs(base64ToBuf(b64)), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['wrapKey']);
}

async function wrapPrivateKey(privateKey: CryptoKey, kek: CryptoKey): Promise<WrappedBlob> {
  const iv = randomBytes(12);
  const wrapped = await crypto.subtle.wrapKey('pkcs8', privateKey, kek, { name: 'AES-GCM', iv: bs(iv) });
  return { ciphertext: bufToBase64(wrapped), iv: bufToBase64(iv) };
}

async function unwrapPrivateKey(blob: WrappedBlob, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'pkcs8',
    bs(base64ToBuf(blob.ciphertext)),
    kek,
    { name: 'AES-GCM', iv: bs(base64ToBuf(blob.iv)) },
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['unwrapKey'],
  );
}

/**
 * One-time setup: generates a fresh keypair, a recovery key, and wraps the
 * private key twice (once under the passphrase, once under the recovery key).
 * The returned `recoveryKey` must be shown to the user exactly once — it is
 * never sent to or stored by the server anywhere, in any form.
 */
export async function setupVaultIdentity(
  passphrase: string,
): Promise<{ setup: VaultIdentitySetup; recoveryKey: string; privateKey: CryptoKey; publicKey: CryptoKey }> {
  const keypair = await generateKeypair();
  const publicKeyB64 = await exportPublicKey(keypair.publicKey);

  const kdfSalt = randomBytes(16);
  const passphraseKek = await deriveKek(passphrase, kdfSalt);
  const passphraseWrapped = await wrapPrivateKey(keypair.privateKey, passphraseKek);

  const recoveryKey = generateRecoveryKey();
  const recoveryKdfSalt = randomBytes(16);
  const recoveryKek = await deriveKek(recoveryKey, recoveryKdfSalt);
  const recoveryWrapped = await wrapPrivateKey(keypair.privateKey, recoveryKek);

  return {
    setup: {
      publicKey: publicKeyB64,
      encryptedPrivateKey: passphraseWrapped.ciphertext,
      encryptedPrivateKeyIv: passphraseWrapped.iv,
      kdfSalt: bufToBase64(kdfSalt),
      kdfParams: DEFAULT_ARGON2_PARAMS,
      recoveryEncryptedPrivateKey: recoveryWrapped.ciphertext,
      recoveryEncryptedPrivateKeyIv: recoveryWrapped.iv,
      recoveryKdfSalt: bufToBase64(recoveryKdfSalt),
    },
    recoveryKey,
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
  };
}

export interface StoredVaultIdentity {
  encryptedPrivateKey: string;
  encryptedPrivateKeyIv: string;
  kdfSalt: string;
  recoveryEncryptedPrivateKey: string;
  recoveryEncryptedPrivateKeyIv: string;
  recoveryKdfSalt: string;
}

/** Throws if the passphrase is wrong (AES-GCM authentication fails on unwrap). */
export async function unlockWithPassphrase(identity: StoredVaultIdentity, passphrase: string): Promise<CryptoKey> {
  const kek = await deriveKek(passphrase, base64ToBuf(identity.kdfSalt));
  return unwrapPrivateKey(
    { ciphertext: identity.encryptedPrivateKey, iv: identity.encryptedPrivateKeyIv },
    kek,
  );
}

/** Throws if the recovery key is wrong. */
export async function unlockWithRecoveryKey(identity: StoredVaultIdentity, recoveryKey: string): Promise<CryptoKey> {
  const kek = await deriveKek(recoveryKey, base64ToBuf(identity.recoveryKdfSalt));
  return unwrapPrivateKey(
    { ciphertext: identity.recoveryEncryptedPrivateKey, iv: identity.recoveryEncryptedPrivateKeyIv },
    kek,
  );
}

// ---------------- vault key wrapping (sharing) ----------------

export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: AES_GCM_LENGTH }, true, ['encrypt', 'decrypt']);
}

/** Wraps a vault key for a specific recipient using their public key (base64 SPKI). */
export async function wrapVaultKeyForRecipient(vaultKey: CryptoKey, recipientPublicKeyB64: string): Promise<string> {
  const recipientPublicKey = await importPublicKey(recipientPublicKeyB64);
  const wrapped = await crypto.subtle.wrapKey('raw', vaultKey, recipientPublicKey, { name: 'RSA-OAEP' });
  return bufToBase64(wrapped);
}

/** Unwraps a vault key using the caller's own already-unlocked private key. */
export async function unwrapVaultKey(wrappedB64: string, privateKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    bs(base64ToBuf(wrappedB64)),
    privateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: AES_GCM_LENGTH },
    true,
    ['encrypt', 'decrypt'],
  );
}

// ---------------- item content ----------------

export async function encryptJson(vaultKey: CryptoKey, data: unknown): Promise<WrappedBlob> {
  const iv = randomBytes(12);
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bs(iv) }, vaultKey, bytes);
  return { ciphertext: bufToBase64(ciphertext), iv: bufToBase64(iv) };
}

export async function decryptJson<T>(blob: WrappedBlob, vaultKey: CryptoKey): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bs(base64ToBuf(blob.iv)) },
    vaultKey,
    bs(base64ToBuf(blob.ciphertext)),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
