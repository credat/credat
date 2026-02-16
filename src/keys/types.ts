import type { Algorithm } from '../crypto'

export interface KeyManager {
  createKey(id: string, algorithm: Algorithm): Promise<StoredKey>
  getKey(id: string): Promise<StoredKey | null>
  sign(keyId: string, payload: Uint8Array): Promise<Uint8Array>
  listKeys(): Promise<StoredKey[]>
  deleteKey(id: string): Promise<boolean>
}

export interface StoredKey {
  id: string
  algorithm: Algorithm
  publicKey: Uint8Array
  createdAt: Date
}
