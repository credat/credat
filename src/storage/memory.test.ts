import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage } from './memory'

describe('MemoryStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('stores and retrieves a value', async () => {
    await storage.set('creds', 'id-1', { type: 'KYC', name: 'Alice' })
    const result = await storage.get('creds', 'id-1')
    expect(result).toEqual({ type: 'KYC', name: 'Alice' })
  })

  it('returns null for missing key', async () => {
    const result = await storage.get('creds', 'nonexistent')
    expect(result).toBeNull()
  })

  it('deletes a value', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    const deleted = await storage.delete('creds', 'id-1')
    expect(deleted).toBe(true)
    expect(await storage.get('creds', 'id-1')).toBeNull()
  })

  it('returns false when deleting nonexistent key', async () => {
    const deleted = await storage.delete('creds', 'nonexistent')
    expect(deleted).toBe(false)
  })

  it('lists all items in a collection', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('creds', 'id-2', { name: 'Bob' })
    const items = await storage.list('creds')
    expect(items).toHaveLength(2)
  })

  it('isolates collections', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('keys', 'key-1', { algo: 'ES256' })
    expect(await storage.list('creds')).toHaveLength(1)
    expect(await storage.list('keys')).toHaveLength(1)
  })

  it('clears a specific collection', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('keys', 'key-1', { algo: 'ES256' })
    await storage.clear('creds')
    expect(await storage.list('creds')).toHaveLength(0)
    expect(await storage.list('keys')).toHaveLength(1)
  })

  it('clears all collections', async () => {
    await storage.set('creds', 'id-1', { name: 'Alice' })
    await storage.set('keys', 'key-1', { algo: 'ES256' })
    await storage.clear()
    expect(await storage.list('creds')).toHaveLength(0)
    expect(await storage.list('keys')).toHaveLength(0)
  })
})
