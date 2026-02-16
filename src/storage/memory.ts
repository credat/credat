import type { StorageAdapter } from './types'

export class MemoryStorage implements StorageAdapter {
  private store = new Map<string, Map<string, unknown>>()

  private getCollection(collection: string): Map<string, unknown> {
    let col = this.store.get(collection)
    if (!col) {
      col = new Map()
      this.store.set(collection, col)
    }
    return col
  }

  async get<T>(collection: string, key: string): Promise<T | null> {
    const col = this.getCollection(collection)
    const value = col.get(key)
    return (value as T) ?? null
  }

  async set<T>(collection: string, key: string, value: T): Promise<void> {
    this.getCollection(collection).set(key, value)
  }

  async delete(collection: string, key: string): Promise<boolean> {
    return this.getCollection(collection).delete(key)
  }

  async list<T>(collection: string): Promise<Array<{ key: string; value: T }>> {
    const col = this.getCollection(collection)
    return Array.from(col.entries()).map(([key, value]) => ({ key, value: value as T }))
  }

  async clear(collection?: string): Promise<void> {
    if (collection) {
      this.store.delete(collection)
    } else {
      this.store.clear()
    }
  }
}
