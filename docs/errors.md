# Error Handling

> Back to [README](../README.md)

Every error has a machine-readable code and a human-readable message. Error codes are typed — the compiler enforces that only valid codes are used.

## Verification Errors

Verification functions (`verifyPresentation`, `verifyDelegation`) return a result object instead of throwing:

```typescript
import { ErrorCodes } from 'credat'

const result = await verifyPresentation(presentation, options)

if (!result.valid) {
  for (const error of result.errors) {
    switch (error.code) {
      case ErrorCodes.HANDSHAKE_EXPIRED:
        // Challenge too old (default: 5 minutes)
        break
      case ErrorCodes.HANDSHAKE_INVALID_NONCE:
        // Nonce mismatch — replay attack?
        break
      case ErrorCodes.HANDSHAKE_VERIFICATION_FAILED:
        // Bad signature or presenter DID mismatch
        break
      case ErrorCodes.DELEGATION_EXPIRED:
        // Delegation VC past its validUntil
        break
      case ErrorCodes.DELEGATION_NOT_YET_VALID:
        // Delegation VC before its validFrom
        break
      case ErrorCodes.DELEGATION_SIGNATURE_INVALID:
        // VC signature doesn't match owner's key
        break
    }
  }
}
```

## Error Classes

Creation functions throw on invalid input using specific error classes:

| Class | Domain |
|-------|--------|
| `CredatError` | Base class for all errors |
| `AgentError` | Agent creation, loading, key issues |
| `DelegationError` | Delegation issuance and validation |
| `HandshakeError` | Challenge, presentation, verification |
| `CredentialError` | SD-JWT VC format and signature |
| `DIDError` | DID resolution and method support |

## Error Codes

| Code | Description |
|------|-------------|
| `DID_NOT_FOUND` | DID cannot be resolved |
| `DID_METHOD_UNSUPPORTED` | Only `key` and `web` supported |
| `DID_RESOLUTION_FAILED` | Network/timeout during resolution |
| `CREDENTIAL_INVALID_FORMAT` | Malformed SD-JWT VC |
| `CREDENTIAL_EXPIRED` | VC past expiration |
| `CREDENTIAL_SIGNATURE_INVALID` | Signature verification failed |
| `STATUS_LIST_INVALID` | Malformed revocation list |
| `AGENT_CREATION_FAILED` | Failed to create/persist agent |
| `AGENT_NOT_FOUND` | Agent not in storage |
| `AGENT_KEY_INVALID` | Bad key material |
| `DELEGATION_INVALID` | Generic delegation error |
| `DELEGATION_EXPIRED` | VC past validUntil |
| `DELEGATION_NOT_YET_VALID` | VC before validFrom |
| `DELEGATION_REVOKED` | VC on status list |
| `DELEGATION_SIGNATURE_INVALID` | Owner key doesn't match |
| `DELEGATION_SCOPE_INVALID` | Scopes not allowed/empty |
| `HANDSHAKE_INVALID_NONCE` | Nonce mismatch |
| `HANDSHAKE_EXPIRED` | Challenge too old |
| `HANDSHAKE_VERIFICATION_FAILED` | Signature or DID mismatch |
