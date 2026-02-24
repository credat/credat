# Credat — Project Guidelines

## What This Is

Trust layer for AI agents. Agents get identities (DIDs), owners delegate scoped permissions (Verifiable Credentials), services verify trust via a challenge/response handshake.

**Not** an eIDAS 2.0 SDK (pivoted away Feb 2026). Don't reference mDoc, OpenID4VCI/VP, EU trust lists, or `createClient()`.

## Architecture

```
src/
├── agent/          # createAgent, loadAgent — agent identity lifecycle
├── credentials/
│   ├── formats/    # SD-JWT VC + Status List — all credential formats live here
│   └── utils.ts    # Internal JWT encode/decode helpers
├── crypto/         # Key generation, signing, JWK conversion (ES256 + EdDSA)
├── delegation/     # delegate() issues VCs, verifyDelegation() validates them
├── did/
│   └── methods/    # did:web, did:key — each method has its own barrel
├── handshake/      # Challenge → Presentation → Verification protocol
├── scopes/         # hasScope, hasAnyScope, hasAllScopes, getAllScopes
├── storage/        # StorageAdapter interface, MemoryStorage, SqliteStorage
├── errors.ts       # Error classes, ErrorCodes constant, ErrorCode type
├── types.ts        # All shared TypeScript interfaces
└── index.ts        # Public API surface (everything exported from here)
```

## Key Design Decisions

- **Single package** — no monorepo, split only when boundaries are proven
- **Transport agnostic** — Credat handles trust primitives, users bring transport
- **Scopes are strings** — enforcement is the app's job, Credat stores and verifies
- **DID hosting not our problem** — create and resolve only
- **SD-JWT VC for all credentials** — delegation VCs use selective disclosure for scopes
- **Key ID convention** — always `#key-0` everywhere (DID docs, JWT headers)
- **Algorithms** — ES256 (P-256) and EdDSA (Ed25519) only, no ES256K
- **DID methods** — `"key" | "web"` only, no `"jwk"`

## Type System Conventions

These conventions exist to prevent wrong code:

- **`ErrorCode` type** — `VerificationError.code` and error class constructors use it, not `string`. The compiler enforces that all error codes come from `ErrorCodes`.
- **`KeyPair` type** — `AgentIdentity.keyPair` and `DelegateOptions.ownerKeyPair` use the `KeyPair` type from `crypto/keys.ts`. Don't inline `{ algorithm, publicKey, privateKey }`.
- **`DelegationResult` is a discriminated union** — when `valid: true`, `agent`/`owner`/`scopes` are guaranteed. When `valid: false`, they're optional. Always check `result.valid` before accessing fields.
- **`DelegationCredential.token`** — the SD-JWT string is called `token`, not `raw`.
- **Grouped optionals** — `statusList?: { url: string; index: number }` not separate `statusListUrl`/`statusListIndex`. Both-or-neither is enforced by the type.
- **No redundant fields** — `AgentIdentity` has `keyPair.algorithm`, not a top-level `algorithm`.

## Coding Conventions

- **Biome** for linting and formatting (`npm run lint:fix`)
- **Vitest** for testing (`npm test`)
- **tsup** for building (ESM + CJS + .d.ts)
- Named exports only, no default exports
- `ErrorCodes.X` in all error construction and test assertions — never string literals
- `Algorithm` type is `"ES256" | "EdDSA"` — use it instead of `string`
- No non-null assertions (`!`) — use `?? defaultValue` or throw
- No identity maps — if `"ES256"` maps to `"ES256"`, just use the value directly
- Imports: biome auto-sorts, let it

## Sign/Verify Safety

`sign()` in `crypto/sign.ts` delegates to `p256.sign()` (ES256) and `ed25519.sign()` (EdDSA). Both handle hashing internally. **Never pre-hash** the payload before calling `sign()` — that double-hashes and produces invalid signatures.

## Testing Requirements

- Every new function needs tests
- Crypto: test sign/verify roundtrip, wrong-key rejection, tamper detection
- Delegation: test valid, expired, not-yet-valid, wrong key, scope extraction
- Handshake: test full flow, expired challenge, nonce mismatch, DID mismatch
- Run `npm test` before every commit

## Error Handling

- Use specific error classes: `AgentError`, `DelegationError`, `HandshakeError`, etc.
- Always use `ErrorCodes.X` — never hardcode error strings
- Verification functions return `{ valid: false, errors: [...] }` — they don't throw
- Creation functions throw on invalid input — fail fast
- `inferAlgorithm` in `handshake/verify.ts` throws `HandshakeError` — not a plain `Error`

## What NOT to Do

- Don't add eIDAS-specific features (mDoc, OpenID4, EU trust lists)
- Don't add `createClient()` facade — the current functional API is intentional
- Don't add AI features (schema gen, error explainer) — removed in pivot
- Don't use `any` — use `unknown` with type guards
- Don't add ES256K or did:jwk support
- Don't change the kid convention from `#key-0`
- Don't use non-null assertions (`!`)
- Don't add dead options (like `checkRevocation` that does nothing)

## Naming Conventions

- `selectDisclosures()` — filters SD-JWT disclosures (selective disclosure)
- `presentCredentials()` — creates a handshake presentation (different concept)
- These are intentionally different names for different operations

## Dependencies

Only 2 runtime deps (intentional — minimal surface):
- `@noble/curves` — P-256, Ed25519 crypto
- `@noble/hashes` — SHA-256, random bytes

Optional peer dep:
- `better-sqlite3` — for `SqliteStorage` (imported via `credat/sqlite`)
