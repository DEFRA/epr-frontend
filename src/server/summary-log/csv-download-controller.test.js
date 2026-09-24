/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { Readable } from 'node:stream'

import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchStreamFromBackend } from '#server/common/helpers/fetch-stream-from-backend.js'
import { upstreamStatus } from '#server/common/helpers/logging/cdp-boom.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(import('#server/common/helpers/fetch-stream-from-backend.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const fileId = 'file-001'
const path = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/files/${fileId}/download.csv`

const backendPath = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/files/${fileId}/records.csv`

const disposition =
  'attachment; filename="R26ER5000000002PA-2026-09-08-091530.csv"'

const csv = 'Row Id,Material\nrow-1,Paper\n'

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {{
 *   contentDisposition?: string | null,
 *   contentType?: string | null
 * }} [stream]
 */
const backendStreams = ({
  contentDisposition = disposition,
  contentType = 'text/csv; charset=utf-8'
} = {}) =>
  vi.mocked(fetchStreamFromBackend).mockResolvedValue({
    body: Readable.from([Buffer.from(csv)], { objectMode: false }),
    contentDisposition,
    contentType
  })

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const visit = (server, auth) =>
  server.inject({ method: 'GET', url: path, auth })

describe('the summary log CSV download', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
    config.set('featureFlags.wasteRecordsDownload', true)
  })

  beforeEach(() => {
    backendStreams()
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
    config.set('featureFlags.wasteRecordsDownload', false)
  })

  it('serves the records a regulator asked for', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.rawPayload.toString()).toBe(csv)
  })

  it('names the file as the backend named it', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('still serves the records where the backend named no file', async ({
    server
  }) => {
    backendStreams({ contentDisposition: null })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['content-disposition']).toBeUndefined()
  })

  it('takes the content type from the backend', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain('text/csv')
  })

  it('serves it as CSV where the backend named no type', async ({ server }) => {
    backendStreams({ contentType: null })

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain('text/csv')
  })

  it('asks the backend for the records, carrying the session token', async ({
    server
  }) => {
    await visit(server, regulator)

    expect(fetchStreamFromBackend).toHaveBeenCalledWith(
      backendPath,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer ')
        })
      })
    )
  })

  it('does not exist for an operator', async ({ server }) => {
    const response = await visit(server, operator)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(fetchStreamFromBackend).not.toHaveBeenCalled()
  })

  it('does not exist for a regulator while the surface is off', async ({
    server
  }) => {
    config.set('featureFlags.regulatorAccess', false)
    const response = await visit(server, regulator)
    config.set('featureFlags.regulatorAccess', true)

    expect(response.statusCode).toBe(statusCodes.notFound)
  })

  it('does not exist while the records download is dark', async ({
    server
  }) => {
    config.set('featureFlags.wasteRecordsDownload', false)
    const response = await visit(server, regulator)
    config.set('featureFlags.wasteRecordsDownload', true)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(fetchStreamFromBackend).not.toHaveBeenCalled()
  })

  // A refusal reaching the caller as 502 says the gateway broke, which sends
  // whoever reads the logs after the wrong thing.
  it('reports a backend refusal as that status, not as a gateway fault', async ({
    server
  }) => {
    vi.mocked(fetchStreamFromBackend).mockRejectedValue(
      upstreamStatus('Backend refused', 404, errorCodes.externalFetchFailed, {
        event: { action: 'external_fetch', reason: 'backend_responded_404' }
      })
    )

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.notFound)
  })
})
