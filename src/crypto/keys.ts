import { p256 } from '@noble/curves/nist.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { randomBytes, bytesToHex } from '@noble/hashes/utils.js'
import type { JsonWebKey } from '../types'

export type Algorithm = 'ES256' | 'EdDSA'

export interface KeyPair {
  algorithm: Algorithm
  privateKey: Uint8Array
  publicKey: Uint8Array
}

export function generateKeyPair(algorithm: Algorithm): KeyPair {
  const privateKey = randomBytes(32)

  if (algorithm === 'ES256') {
    const publicKey = p256.getPublicKey(privateKey, true) // compressed
    return { algorithm, privateKey, publicKey }
  }

  if (algorithm === 'EdDSA') {
    const publicKey = ed25519.getPublicKey(privateKey)
    return { algorithm, privateKey, publicKey }
  }

  throw new Error(`Unsupported algorithm: ${algorithm}`)
}

export function publicKeyToJwk(publicKey: Uint8Array, algorithm: Algorithm): JsonWebKey {
  if (algorithm === 'ES256') {
    // Decompress P-256 public key to get x, y coordinates
    const point = p256.Point.fromHex(bytesToHex(publicKey))
    const uncompressed = point.toBytes(false) // 65 bytes: 0x04 || x || y
    const x = uncompressed.slice(1, 33)
    const y = uncompressed.slice(33, 65)

    return {
      kty: 'EC',
      crv: 'P-256',
      x: uint8ArrayToBase64url(x),
      y: uint8ArrayToBase64url(y),
    }
  }

  if (algorithm === 'EdDSA') {
    return {
      kty: 'OKP',
      crv: 'Ed25519',
      x: uint8ArrayToBase64url(publicKey),
    }
  }

  throw new Error(`Unsupported algorithm: ${algorithm}`)
}

export function jwkToPublicKey(jwk: JsonWebKey): Uint8Array {
  if (jwk.kty === 'EC' && jwk.crv === 'P-256') {
    const x = base64urlToUint8Array(jwk.x!)
    const y = base64urlToUint8Array(jwk.y!)
    // Reconstruct uncompressed, then compress
    const uncompressed = new Uint8Array(65)
    uncompressed[0] = 0x04
    uncompressed.set(x, 1)
    uncompressed.set(y, 33)
    const point = p256.Point.fromHex(bytesToHex(uncompressed))
    return point.toBytes(true) // compressed
  }

  if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519') {
    return base64urlToUint8Array(jwk.x!)
  }

  throw new Error(`Unsupported JWK: kty=${jwk.kty}, crv=${jwk.crv}`)
}

// Base64url helpers
export function uint8ArrayToBase64url(bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  return new Uint8Array(Buffer.from(base64, 'base64'))
}
