import { describe, expect, test } from 'bun:test'
import { checkPublicKeyFormat } from './validation'

describe('checkPublicKeyFormat', () => {
  test('accepts a 44-byte SubjectPublicKeyInfo key with the correct DER header', () => {
    expect(
      checkPublicKeyFormat(
        'MCowBQYDK2VwAyEAzGudN/bPWasgxMAgQ8S3k7qiWpMfsX/ELls5pZaDRbs='
      )
    ).toBe('valid')
  })

  test('rejects a 32-byte raw key (old, wrong format)', () => {
    expect(checkPublicKeyFormat('IDjzLCT0kf6lq+1sXVxOOGWy5JdyKiZX2pm2cxkAKvA=')).toBe(
      'invalid'
    )
  })

  test('rejects obvious garbage', () => {
    expect(checkPublicKeyFormat('123123124123123')).toBe('invalid')
  })

  test('returns empty for blank input', () => {
    expect(checkPublicKeyFormat('')).toBe('empty')
    expect(checkPublicKeyFormat('   ')).toBe('empty')
  })
})
