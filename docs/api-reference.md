# API Reference

> Back to [README](../README.md)

All internal modules are exported for full control. Import from `'credat'` for the public API.

## Agent Identity

```typescript
import { createAgent, loadAgent } from 'credat'
```

## Delegation

```typescript
import { delegate, verifyDelegation } from 'credat'
```

## Handshake Protocol

```typescript
import { createChallenge, presentCredentials, verifyPresentation } from 'credat'
```

## Scope Helpers

```typescript
import { hasScope, hasAnyScope, hasAllScopes, getAllScopes, validateConstraints } from 'credat'
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
} from 'credat'
```

## SD-JWT VC (Credential Format)

```typescript
import {
  createSdJwtVc,
  verifySdJwtVc,
  selectDisclosures,
} from 'credat'
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
} from 'credat'
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
} from 'credat'
```

## Storage

```typescript
import { MemoryStorage } from 'credat'
import { SqliteStorage } from 'credat/sqlite' // optional peer dep
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
} from 'credat'
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
} from 'credat'
```
