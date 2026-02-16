import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveDidEbsi } from './ebsi'

describe('resolveDidEbsi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves a valid did:ebsi via EBSI API', async () => {
    const mockDocument = {
      id: 'did:ebsi:z123abc',
      verificationMethod: [{
        id: 'did:ebsi:z123abc#key-1',
        type: 'JsonWebKey2020',
        controller: 'did:ebsi:z123abc',
        publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'test', y: 'test' },
      }],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument),
    }) as any

    const result = await resolveDidEbsi('did:ebsi:z123abc')
    expect(result.didDocument).toEqual(mockDocument)
  })

  it('calls the correct EBSI API endpoint', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'did:ebsi:z123abc' }),
    }) as any

    await resolveDidEbsi('did:ebsi:z123abc')
    expect(fetch).toHaveBeenCalledWith(
      'https://api-pilot.ebsi.eu/did-registry/v5/identifiers/did%3Aebsi%3Az123abc'
    )
  })

  it('returns error for unregistered DID', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any

    const result = await resolveDidEbsi('did:ebsi:zunknown')
    expect(result.didDocument).toBeNull()
    expect(result.didResolutionMetadata.error).toBeDefined()
  })
})
