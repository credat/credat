# Storage

> Back to [README](../README.md)

Agents can be persisted and loaded later using pluggable storage adapters.

## In-Memory (default)

```typescript
import { createAgent, loadAgent, MemoryStorage } from 'credat'

const storage = new MemoryStorage()

// Create and persist
const agent = await createAgent({ domain: 'example.com', storage })

// Load later
const loaded = await loadAgent({ did: agent.did, storage })
```

## SQLite (persistent)

For persistence across restarts, use SQLite (optional peer dependency):

```bash
npm install better-sqlite3
```

```typescript
import { SqliteStorage } from 'credat/sqlite'

const storage = new SqliteStorage('./agents.db')
const agent = await createAgent({ domain: 'example.com', storage })
```

## Custom Storage

Implement the `StorageAdapter` interface for any backend:

```typescript
import type { StorageAdapter } from 'credat'

class MyStorage implements StorageAdapter {
  async get<T>(collection: string, key: string): Promise<T | null> { /* ... */ }
  async set<T>(collection: string, key: string, value: T): Promise<void> { /* ... */ }
  async delete(collection: string, key: string): Promise<boolean> { /* ... */ }
  async list<T>(collection: string): Promise<Array<{ key: string; value: T }>> { /* ... */ }
  async clear(collection?: string): Promise<void> { /* ... */ }
}
```
