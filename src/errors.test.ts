import { describe, it, expect } from 'vitest'
import {
  CredatError,
  AgentError,
  DelegationError,
  HandshakeError,
  ErrorCodes,
} from './errors'

describe('Error classes', () => {
  it('AgentError has correct name and code', () => {
    const err = new AgentError(ErrorCodes.AGENT_CREATION_FAILED, 'test')
    expect(err.name).toBe('AgentError')
    expect(err.code).toBe('AGENT_CREATION_FAILED')
  })

  it('DelegationError has correct name and code', () => {
    const err = new DelegationError(ErrorCodes.DELEGATION_INVALID, 'test')
    expect(err.name).toBe('DelegationError')
    expect(err.code).toBe('DELEGATION_INVALID')
  })

  it('HandshakeError has correct name and code', () => {
    const err = new HandshakeError(ErrorCodes.HANDSHAKE_INVALID_NONCE, 'test')
    expect(err.name).toBe('HandshakeError')
    expect(err.code).toBe('HANDSHAKE_INVALID_NONCE')
  })
})

describe('ErrorCodes', () => {
  it('contains all agent error codes', () => {
    expect(ErrorCodes.AGENT_CREATION_FAILED).toBe('AGENT_CREATION_FAILED')
    expect(ErrorCodes.AGENT_NOT_FOUND).toBe('AGENT_NOT_FOUND')
    expect(ErrorCodes.AGENT_KEY_INVALID).toBe('AGENT_KEY_INVALID')
  })

  it('contains all delegation error codes', () => {
    expect(ErrorCodes.DELEGATION_INVALID).toBe('DELEGATION_INVALID')
    expect(ErrorCodes.DELEGATION_EXPIRED).toBe('DELEGATION_EXPIRED')
    expect(ErrorCodes.DELEGATION_REVOKED).toBe('DELEGATION_REVOKED')
    expect(ErrorCodes.DELEGATION_SIGNATURE_INVALID).toBe('DELEGATION_SIGNATURE_INVALID')
    expect(ErrorCodes.DELEGATION_SCOPE_INVALID).toBe('DELEGATION_SCOPE_INVALID')
  })

  it('contains all handshake error codes', () => {
    expect(ErrorCodes.HANDSHAKE_INVALID_NONCE).toBe('HANDSHAKE_INVALID_NONCE')
    expect(ErrorCodes.HANDSHAKE_EXPIRED).toBe('HANDSHAKE_EXPIRED')
    expect(ErrorCodes.HANDSHAKE_VERIFICATION_FAILED).toBe('HANDSHAKE_VERIFICATION_FAILED')
  })
})
