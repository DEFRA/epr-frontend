import hapi from '@hapi/hapi'
import hapiPino from 'hapi-pino'
import { pino } from 'pino'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { boomErrorLogger } from '#server/plugins/boom-error-logger.js'

import { fetchRegistrationAndAccreditation } from './fetch-registration-and-accreditation.js'
import { getRequiredRegistrationWithAccreditation } from './get-required-registration-with-accreditation.js'

vi.mock(import('./fetch-registration-and-accreditation.js'))

/**
 * Captures every line pino emits to a single in-memory buffer so we can
 * inspect the plugin-emitted log alongside the auto-logs hapi-pino emits
 * for request lifecycle events.
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

describe('getRequiredRegistrationWithAccreditation - boom-error-logger integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('the not-accredited boom is logged exactly once via the plugin (no warn-then-throw duplication)', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      organisationData: { id: 'org-123' },
      registration: { id: 'reg-001' },
      accreditation: undefined
    })

    const { instance, lines } = captureLogs()
    const server = hapi.server()

    await server.register([
      { plugin: hapiPino, options: { instance, logRequestStart: true } },
      boomErrorLogger
    ])

    server.route({
      method: 'GET',
      path: '/check',
      handler: () =>
        getRequiredRegistrationWithAccreditation({
          organisationId: 'org-123',
          registrationId: 'reg-001',
          idToken: 'token',
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
        error: expect.objectContaining({
          code: 'not_accredited',
          message: 'Not accredited for this registration',
          type: 'Not Found'
        }),
        event: {
          category: 'http',
          action: 'check_accreditation',
          kind: 'event',
          outcome: 'failure',
          reason: 'registrationId=reg-001'
        },
        http: { response: { status_code: 404 } }
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
