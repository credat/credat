# Scopes & Constraints

> Back to [README](../README.md)

## Scopes

Scopes are strings — Credat doesn't prescribe a format. Use whatever makes sense for your domain:

```typescript
// Coarse
scopes: ['read', 'write']

// Fine-grained
scopes: ['email:read', 'calendar:write', 'travel:book']

// Hierarchical
scopes: ['org:acme:project:alpha:deploy']
```

## Constraints

Constraints are open-ended — Credat stores them, your app enforces them:

```typescript
constraints: {
  maxTransactionValue: 5000,      // dollars, tokens, whatever
  allowedDomains: ['api.example.com'],
  rateLimit: 100,                 // requests per hour
  // add any field you need
}
```

After verification, check constraints in your app:

```typescript
if (result.valid && result.constraints?.maxTransactionValue) {
  if (txAmount > result.constraints.maxTransactionValue) {
    throw new Error('Transaction exceeds agent limit')
  }
}
```

You can also use the `validateConstraints` helper:

```typescript
import { validateConstraints } from 'credat'

const violations = validateConstraints(result, {
  transactionValue: 6000,
  domain: 'untrusted.example.com',
})
// Returns an array of ConstraintViolation objects
```
