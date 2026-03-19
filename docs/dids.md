# DID Operations

> Back to [README](../README.md)

Credat supports two DID methods: `did:web` (domain-based, HTTPS-resolvable) and `did:key` (self-contained, no network needed).

## did:web

```typescript
import { createDidWeb, resolveDidWeb } from '@credat/sdk'

// Simple domain
const did = createDidWeb('example.com')
// → did:web:example.com

// With path
const agentDid = createDidWeb('example.com', 'agents/assistant')
// → did:web:example.com:agents:assistant

// Resolve (fetches DID Document via HTTPS)
const result = await resolveDidWeb('did:web:example.com')
console.log(result.didDocument)
```

## did:key

```typescript
import { createDidKey, resolveDidKey, generateKeyPair } from '@credat/sdk'

const kp = generateKeyPair('ES256')
const did = createDidKey(kp.publicKey, 'ES256')
// → did:key:zDnae...

// Resolve (self-contained, no network)
const result = resolveDidKey(did)
console.log(result.didDocument)
```

## Universal Resolver

```typescript
import { resolveDID } from '@credat/sdk'

// Automatically routes to the correct method-specific resolver
const result = await resolveDID('did:web:example.com')
const result2 = await resolveDID('did:key:zDnae...')
```
