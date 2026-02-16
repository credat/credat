import { describe, it, expect, vi, beforeEach } from 'vitest'
import { didWebToUrl, resolveDidWeb, createDidWeb } from './web'

describe('didWebToUrl', () => {
  it('converts did:web:example.com to https://example.com/.well-known/did.json', () => {
    expect(didWebToUrl('did:web:example.com')).toBe('https://example.com/.well-known/did.json')
  })

  it('converts did:web:example.com:path to https://example.com/path/did.json', () => {
    expect(didWebToUrl('did:web:example.com:user:123')).toBe('https://example.com/user/123/did.json')
  })

  it('handles port-encoded colons', () => {
    expect(didWebToUrl('did:web:example.com%3A8443')).toBe('https://example.com:8443/.well-known/did.json')
  })
})

describe('createDidWeb', () => {
  it('creates did:web from domain', () => {
    const did = createDidWeb('example.com')
    expect(did).toBe('did:web:example.com')
  })

  it('creates did:web with path', () => {
    const did = createDidWeb('example.com', 'users/123')
    expect(did).toBe('did:web:example.com:users:123')
  })
})

describe('resolveDidWeb', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves a valid did:web by fetching the URL', async () => {
    const mockDocument = {
      id: 'did:web:example.com',
      verificationMethod: [{
        id: 'did:web:example.com#key-1',
        type: 'JsonWebKey2020',
        controller: 'did:web:example.com',
        publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' },
      }],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument),
    }) as any

    const result = await resolveDidWeb('did:web:example.com')
    expect(result.didDocument).toEqual(mockDocument)
    expect(fetch).toHaveBeenCalledWith('https://example.com/.well-known/did.json')
  })

  it('returns error for HTTP failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any

    const result = await resolveDidWeb('did:web:notfound.com')
    expect(result.didDocument).toBeNull()
    expect(result.didResolutionMetadata.error).toBe('notFound')
  })
})
