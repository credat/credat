import { describe, it, expect } from 'vitest'
import { VeraceError, CredentialError, DIDError, ErrorCodes } from './errors'

describe('VeraceError', () => {
  it('creates error with code and message', () => {
    const err = new VeraceError('TEST_CODE', 'test message')
    expect(err.code).toBe('TEST_CODE')
    expect(err.message).toBe('test message')
    expect(err.name).toBe('VeraceError')
    expect(err).toBeInstanceOf(Error)
  })

  it('includes human-readable message when provided', () => {
    const err = new VeraceError('TEST', 'technical msg', 'Human-friendly explanation')
    expect(err.humanMessage).toBe('Human-friendly explanation')
  })
})

describe('CredentialError', () => {
  it('is a VeraceError', () => {
    const err = new CredentialError(ErrorCodes.EXPIRED, 'credential expired')
    expect(err).toBeInstanceOf(VeraceError)
    expect(err.name).toBe('CredentialError')
  })
})

describe('DIDError', () => {
  it('is a VeraceError', () => {
    const err = new DIDError(ErrorCodes.DID_NOT_FOUND, 'not found')
    expect(err).toBeInstanceOf(VeraceError)
    expect(err.name).toBe('DIDError')
  })
})
