import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import type { StorageAdapter } from '../storage'
import type { KeyManager, StoredKey } from './types'
import type { Algorithm } from '../crypto'
import { generateKeyPair, sign as cryptoSign } from '../crypto'
import { CredatError, ErrorCodes } from '../errors'

interface StoredKeyInternal {
  id: string
  algorithm: Algorithm
  privateKey: string // hex-encoded for storage
  publicKey: string // hex-encoded for storage
  createdAt: string
}

const KEYS_COLLECTION = 'keys'

export class LocalKeyManager implements KeyManager {
  constructor(private storage: StorageAdapter) {}

  async createKey(id: string, algorithm: Algorithm): Promise<StoredKey> {
    const kp = generateKeyPair(algorithm)
    const now = new Date()

    const stored: StoredKeyInternal = {
      id,
      algorithm,
      privateKey: bytesToHex(kp.privateKey),
      publicKey: bytesToHex(kp.publicKey),
      createdAt: now.toISOString(),
    }

    await this.storage.set(KEYS_COLLECTION, id, stored)

    return {
      id,
      algorithm,
      publicKey: kp.publicKey,
      createdAt: now,
    }
  }

  async getKey(id: string): Promise<StoredKey | null> {
    const stored = await this.storage.get<StoredKeyInternal>(KEYS_COLLECTION, id)
    if (!stored) return null

    return {
      id: stored.id,
      algorithm: stored.algorithm,
      publicKey: hexToBytes(stored.publicKey),
      createdAt: new Date(stored.createdAt),
    }
  }

  async sign(keyId: string, payload: Uint8Array): Promise<Uint8Array> {
    const stored = await this.storage.get<StoredKeyInternal>(KEYS_COLLECTION, keyId)
    if (!stored) {
      throw new CredatError(ErrorCodes.DID_NOT_FOUND, `Key not found: ${keyId}`)
    }

    const privateKey = hexToBytes(stored.privateKey)
    return cryptoSign(payload, privateKey, stored.algorithm)
  }

  async listKeys(): Promise<StoredKey[]> {
    const items = await this.storage.list<StoredKeyInternal>(KEYS_COLLECTION)
    return items.map(({ value }) => ({
      id: value.id,
      algorithm: value.algorithm,
      publicKey: hexToBytes(value.publicKey),
      createdAt: new Date(value.createdAt),
    }))
  }

  async deleteKey(id: string): Promise<boolean> {
    return this.storage.delete(KEYS_COLLECTION, id)
  }
}
