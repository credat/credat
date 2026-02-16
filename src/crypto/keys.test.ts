import { describe, it, expect } from 'vitest'
import { generateKeyPair, publicKeyToJwk, jwkToPublicKey } from './keys'

describe('generateKeyPair', () => {
  it('generates ES256 (P-256) key pair', () => {
    const kp = generateKeyPair('ES256')
    expect(kp.algorithm).toBe('ES256')
    expect(kp.privateKey).toBeInstanceOf(Uint8Array)
    expect(kp.publicKey).toBeInstanceOf(Uint8Array)
    expect(kp.privateKey.length).toBe(32)
    expect(kp.publicKey.length).toBe(33) // compressed
  })

  it('generates EdDSA (Ed25519) key pair', () => {
    const kp = generateKeyPair('EdDSA')
    expect(kp.algorithm).toBe('EdDSA')
    expect(kp.privateKey.length).toBe(32)
    expect(kp.publicKey.length).toBe(32)
  })

  it('generates unique keys each time', () => {
    const kp1 = generateKeyPair('ES256')
    const kp2 = generateKeyPair('ES256')
    expect(kp1.privateKey).not.toEqual(kp2.privateKey)
  })
})

describe('publicKeyToJwk', () => {
  it('converts P-256 public key to JWK', () => {
    const kp = generateKeyPair('ES256')
    const jwk = publicKeyToJwk(kp.publicKey, 'ES256')
    expect(jwk.kty).toBe('EC')
    expect(jwk.crv).toBe('P-256')
    expect(jwk.x).toBeDefined()
    expect(jwk.y).toBeDefined()
    expect(jwk.d).toBeUndefined() // No private key
  })

  it('converts Ed25519 public key to JWK', () => {
    const kp = generateKeyPair('EdDSA')
    const jwk = publicKeyToJwk(kp.publicKey, 'EdDSA')
    expect(jwk.kty).toBe('OKP')
    expect(jwk.crv).toBe('Ed25519')
    expect(jwk.x).toBeDefined()
  })

  it('round-trips through JWK', () => {
    const kp = generateKeyPair('ES256')
    const jwk = publicKeyToJwk(kp.publicKey, 'ES256')
    const restored = jwkToPublicKey(jwk)
    expect(restored).toEqual(kp.publicKey)
  })
})
