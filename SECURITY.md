# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x (alpha) | Yes |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities privately using [GitHub's security advisory feature](https://github.com/credat/credat/security/advisories/new).

Alternatively, email **security@credat.io** with:

- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential impact assessment

## Response Timeline

- **Acknowledgment**: within 48 hours
- **Initial assessment**: within 5 business days
- **Fix for critical issues**: within 14 days

## Scope

Credat is a trust and identity layer for AI agents. The following areas are especially security-sensitive:

- Cryptographic operations (signing, verification)
- Key management and generation
- Credential issuance and verification
- DID resolution
- Delegation chain validation
- Handshake protocol

## Disclosure Policy

We follow coordinated disclosure. We will credit reporters (unless anonymity is requested) once a fix is released.
