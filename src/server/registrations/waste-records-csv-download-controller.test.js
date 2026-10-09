/**
 * @import { SetupServerApi } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { serveDownload } from '#server/common/test-helpers/serve-download.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, describe, expect } from 'vitest'

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const path = `/organisations/${organisationId}/registrations/${registrationId}/waste-records/download.csv`

const backendPath = `/v1/organisations/${organisationId}/registrations/${registrationId}/waste-records/export.csv`

const disposition =
  'attachment; filename="R26ER5000000002PA-waste-records-2026-09-08.csv"'

const csv = 'Row Id,Material\nrow-1,Paper\n'

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {SetupServerApi} msw
 * @param {{
 *   contentDisposition?: string | null,
 *   contentType?: string | null,
 *   status?: number
 * }} [answer]
 */
const backendStreams = (
  msw,
  {
    contentDisposition = disposition,
    contentType = 'text/csv; charset=utf-8',
    status = statusCodes.ok
  } = {}
) =>
  serveDownload(msw, `${config.get('eprBackendUrl')}${backendPath}`, {
    body: csv,
    contentDisposition,
    contentType,
    status
  })

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const visit = (server, auth) =>
  server.inject({ method: 'GET', url: path, auth })

describe('the waste records CSV download', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.wasteRecordsDownload', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
    config.set('featureFlags.wasteRecordsDownload', false)
  })

  it('serves the records a regulator asked for', async ({ server, msw }) => {
    backendStreams(msw)

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.rawPayload.toString()).toBe(csv)
  })

  it('names the file as the backend named it', async ({ server, msw }) => {
    backendStreams(msw)

    const response = await visit(server, regulator)

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('still serves the records where the backend named no file', async ({
    server,
    msw
  }) => {
    backendStreams(msw, { contentDisposition: null })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['content-disposition']).toBeUndefined()
  })

  it('takes the content type from the backend', async ({ server, msw }) => {
    backendStreams(msw)

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain('text/csv')
  })

  it('serves it as CSV where the backend named no type', async ({
    server,
    msw
  }) => {
    backendStreams(msw, { contentType: null })

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain('text/csv')
  })

  it('asks the backend for the export, carrying the session token', async ({
    server,
    msw
  }) => {
    const requests = backendStreams(msw)

    await visit(server, regulator)

    expect(requests).toStrictEqual([
      {
        authorization: expect.stringMatching(/^Bearer .+/),
        url: 'http://epr-backend.test/v1/organisations/6507f1f77bcf86cd79943901/registrations/reg-001/waste-records/export.csv'
      }
    ])
  })

  it('does not exist for an operator', async ({ server, msw }) => {
    const requests = backendStreams(msw)

    const response = await visit(server, operator)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(requests).toStrictEqual([])
  })

  it('does not exist for a regulator while the surface is off', async ({
    server,
    msw
  }) => {
    backendStreams(msw)

    config.set('featureFlags.regulatorAccess', false)
    const response = await visit(server, regulator)
    config.set('featureFlags.regulatorAccess', true)

    expect(response.statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist while the records download is dark', async ({
    server,
    msw
  }) => {
    const requests = backendStreams(msw)

    config.set('featureFlags.wasteRecordsDownload', false)
    const response = await visit(server, regulator)
    config.set('featureFlags.wasteRecordsDownload', true)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(requests).toStrictEqual([])
  })

  // A refusal reaching the caller as 502 says the gateway broke, which sends
  // whoever reads the logs after the wrong thing.
  it('reports a backend refusal as that status, not as a gateway fault', async ({
    server,
    msw
  }) => {
    backendStreams(msw, { status: statusCodes.notFound })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.notFound)
  })
})
