# API Reference

> Back to [README](../README.md)

All internal modules are exported for full control. Import from `'credat'` for the public API.

## Agent Identity

```typescript
import { createAgent, loadAgent } from '@credat/sdk'
```

## Delegation

```typescript
import { delegate, verifyDelegation } from '@credat/sdk'
```

## Handshake Protocol

```typescript
import { createChallenge, presentCredentials, verifyPresentation } from '@credat/sdk'
```

## Scope Helpers

```typescript
import { hasScope, hasAnyScope, hasAllScopes, getAllScopes, validateConstraints } from '@credat/sdk'
```

## Crypto Primitives

```typescript
import {
  generateKeyPair,
  sign,
  verifySignature,
  publicKeyToJwk,
  jwkToPublicKey,
  base64urlToUint8Array,
  uint8ArrayToBase64url,
} from '@credat/sdk'
```

## SD-JWT VC (Credential Format)

```typescript
import {
  createSdJwtVc,
  verifySdJwtVc,
  selectDisclosures,
} from '@credat/sdk'
```

## Status List (Revocation)

```typescript
import {
  createStatusList,
  createStatusListCredential,
  verifyStatusListCredential,
  setRevocationStatus,
  isRevoked,
  encodeStatusList,
  decodeStatusList,
  saveStatusList,
  loadStatusList,
  deleteStatusList,
  listStatusLists,
} from '@credat/sdk'
```

## DID Operations

```typescript
import {
  createDidKey,
  resolveDidKey,
  createDidWeb,
  resolveDidWeb,
  didWebToUrl,
  resolveDID,
} from '@credat/sdk'
```

## Storage

```typescript
import { MemoryStorage } from '@credat/sdk'
import { SqliteStorage } from '@credat/sdk/sqlite' // optional peer dep
```

## Errors

```typescript
import {
  CredatError,
  AgentError,
  DelegationError,
  HandshakeError,
  CredentialError,
  DIDError,
  ErrorCodes,
} from '@credat/sdk'
```

## Types

All types are exported for use in your application:

```typescript
import type {
  AgentIdentity,
  AgentConfig,
  KeyPair,
  Algorithm,
  DelegateOptions,
  DelegationCredential,
  DelegationClaims,
  DelegationConstraints,
  DelegationResult,
  ChallengeMessage,
  PresentationMessage,
  DIDDocument,
  DIDMethod,
  DIDResolutionResult,
  VerificationError,
  ErrorCode,
  StorageAdapter,
  // ... and more
} from '@credat/sdk'
```
