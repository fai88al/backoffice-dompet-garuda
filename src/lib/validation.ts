export type PublicKeyFormatCheck = 'empty' | 'valid' | 'invalid'

// Keys are stored as Base64(X.509 SubjectPublicKeyInfo DER): a fixed 12-byte
// ASN.1 header followed by the 32-byte raw Ed25519 key — 44 bytes total, never
// 32 bytes alone. The header is byte-aligned at the start of the Base64 string,
// so checking these 16 leading characters is equivalent to decoding and
// comparing the first 12 raw bytes.
const ED25519_SPKI_DER_BASE64_HEADER = 'MCowBQYDK2VwAyEA'
const ED25519_SPKI_DER_BYTES = 44

/**
 * Advisory-only check: does this look like a Base64-encoded Ed25519
 * SubjectPublicKeyInfo (44 bytes, fixed DER header + 32-byte raw key)?
 * Not used to block submission — the backend is the source of truth.
 */
export function checkPublicKeyFormat(value: string): PublicKeyFormatCheck {
  const trimmed = value.trim()
  if (!trimmed) return 'empty'

  try {
    const decoded = atob(trimmed)
    const isValid =
      decoded.length === ED25519_SPKI_DER_BYTES &&
      trimmed.startsWith(ED25519_SPKI_DER_BASE64_HEADER)
    return isValid ? 'valid' : 'invalid'
  } catch {
    return 'invalid'
  }
}
