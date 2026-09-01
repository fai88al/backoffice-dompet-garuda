export type PublicKeyFormatCheck = 'empty' | 'valid' | 'invalid'

const ED25519_PUBLIC_KEY_BYTES = 32

/**
 * Advisory-only check: does this look like a Base64-encoded Ed25519 public key
 * (decodes as valid Base64 and is exactly 32 bytes)? Not used to block submission —
 * the backend is the source of truth for validation.
 */
export function checkPublicKeyFormat(value: string): PublicKeyFormatCheck {
  const trimmed = value.trim()
  if (!trimmed) return 'empty'

  try {
    const decoded = atob(trimmed)
    return decoded.length === ED25519_PUBLIC_KEY_BYTES ? 'valid' : 'invalid'
  } catch {
    return 'invalid'
  }
}
