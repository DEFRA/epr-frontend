import hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { pino } from 'pino'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'
import { getRequiredRegistrationWithAccreditation } from './get-required-registration-with-accreditation.js'

vi.mock(import('./fetch-registration-and-accreditation.js'))

/**
 * Captures every line pino emits to a single in-memory buffer so we can
 * inspect both the explicit `logger.warn(...)` call and any auto-log
 * hapi-pino emits in response to the thrown boom.
 */
const captureLogs = () => {
  /** @type {Array<Record<string, unknown>>} */
  const lines = []
  const stream = {
    write: (chunk) => {
      lines.push(JSON.parse(chunk))
    }
  }
  const instance = pino({ level: 'trace' }, stream)
  return { instance, lines }
}

describe('getRequiredRegistrationWithAccreditation - hapi log lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits exactly one log entry containing the not-accredited message — hapi-pino does not duplicate the boom message in its request-completion log', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: { id: 'reg-001' },
      accreditation: undefined
    })

    const { instance, lines } = captureLogs()
    const server = hapi.server()

    await server.register({
      plugin: hapiPino,
      options: { instance, logRequestStart: true }
    })

    server.route({
      method: 'GET',
      path: '/check',
      handler: (request) =>
        getRequiredRegistrationWithAccreditation({
          organisationId: 'org-123',
          registrationId: 'reg-001',
          idToken: 'token',
          logger: request.logger,
          accreditationId: 'acc-001'
        })
    })

    const response = await server.inject({ method: 'GET', url: '/check' })
    await server.stop()

    /* eslint-disable vitest/max-expects -- log-shape assertions split for clarity */
    expect(response.statusCode).toBe(404)

    const messageHits = lines.filter(
      (line) =>
        typeof line.message === 'string' &&
        line.message.includes('Not accredited for this registration')
    )

    expect(messageHits).toHaveLength(1)
    expect(messageHits[0]).toStrictEqual(
      expect.objectContaining({
        level: 40,
        message: 'Not accredited for this registration',
        event: {
          action: 'check_accreditation',
          reason: 'registrationId=reg-001'
        }
      })
    )

    const responseHit = lines.find(
      (line) =>
        typeof line.msg === 'string' && line.msg.startsWith('[response]')
    )
    expect(responseHit).toStrictEqual(
      expect.objectContaining({
        level: 30,
        res: expect.objectContaining({ statusCode: 404 })
      })
    )
    expect(responseHit?.message).toBeUndefined()
    expect(responseHit?.event).toBeUndefined()
    /* eslint-enable vitest/max-expects */
  })
})
