import { describe, it, expect } from 'vitest'
import { generateKeyPair } from './keys'
import { sign, verifySignature } from './sign'

describe('sign and verify', () => {
  it('signs and verifies with ES256', () => {
    const kp = generateKeyPair('ES256')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp.privateKey, 'ES256')
    expect(signature).toBeInstanceOf(Uint8Array)
    expect(verifySignature(payload, signature, kp.publicKey, 'ES256')).toBe(true)
  })

  it('signs and verifies with EdDSA', () => {
    const kp = generateKeyPair('EdDSA')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp.privateKey, 'EdDSA')
    expect(verifySignature(payload, signature, kp.publicKey, 'EdDSA')).toBe(true)
  })

  it('rejects tampered payload', () => {
    const kp = generateKeyPair('ES256')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp.privateKey, 'ES256')
    const tampered = new TextEncoder().encode('hello tampered')
    expect(verifySignature(tampered, signature, kp.publicKey, 'ES256')).toBe(false)
  })

  it('rejects wrong public key', () => {
    const kp1 = generateKeyPair('ES256')
    const kp2 = generateKeyPair('ES256')
    const payload = new TextEncoder().encode('hello eidas')
    const signature = sign(payload, kp1.privateKey, 'ES256')
    expect(verifySignature(payload, signature, kp2.publicKey, 'ES256')).toBe(false)
  })
})
