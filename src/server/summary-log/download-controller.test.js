/** @import { HapiServer } from '#server/common/hapi-types.js'; */
import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRedirectFromBackend } from '#server/common/helpers/fetch-redirect-from-backend.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(import('#server/common/helpers/fetch-redirect-from-backend.js'))

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const summaryLogId = 'log-001'
const path = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/download`

const signedUrl =
  'https://re-ex-summary-logs.s3.eu-west-2.amazonaws.com/uploads/f.xlsx'
const disposition =
  'attachment; filename="R26ER5000000002PA-2026-09-08-091530.xlsx"'

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {{
 *   contentDisposition?: string | null,
 *   contentType?: string | null,
 *   ok?: boolean,
 *   status?: number
 * }} [file]
 */
const storageAnswers = ({
  contentDisposition = disposition,
  contentType = 'application/vnd.ms-excel',
  ok = true,
  status = 200
} = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      arrayBuffer: async () => new TextEncoder().encode('xlsx-bytes').buffer,
      headers: {
        get: (name) =>
          name === 'content-disposition'
            ? contentDisposition
            : name === 'content-type'
              ? contentType
              : null
      }
    })
  )

/**
 * @param {HapiServer} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const visit = (server, auth) =>
  server.inject({ method: 'GET', url: path, auth })

describe('the summary log download', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.mocked(fetchRedirectFromBackend).mockResolvedValue(signedUrl)
    storageAnswers()
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('serves the file a regulator asked for', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.rawPayload.toString()).toBe('xlsx-bytes')
  })

  // The backend signs the URL with the operator's own filename, so composing a
  // header here would throw that name away.
  it('passes the storage disposition through untouched', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('still serves the file where storage named no disposition', async ({
    server
  }) => {
    storageAnswers({ contentDisposition: null })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['content-disposition']).toBeUndefined()
  })

  it('takes the content type from storage', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain(
      'application/vnd.ms-excel'
    )
  })

  it('falls back to a generic content type where storage named none', async ({
    server
  }) => {
    storageAnswers({ contentType: null })

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain(
      'application/octet-stream'
    )
  })

  it('asks the backend for the file, carrying the session token', async ({
    server
  }) => {
    await visit(server, regulator)

    expect(fetchRedirectFromBackend).toHaveBeenCalledWith(
      `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/file`,
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
    expect(fetchRedirectFromBackend).not.toHaveBeenCalled()
  })

  it('does not exist for a regulator while the surface is off', async ({
    server
  }) => {
    config.set('featureFlags.regulatorAccess', false)
    const response = await visit(server, regulator)
    config.set('featureFlags.regulatorAccess', true)

    expect(response.statusCode).toBe(statusCodes.notFound)
  })

  // Without this the backend could point the server at anything it liked.
  it('refuses a redirect away from storage, and fetches nothing', async ({
    server
  }) => {
    vi.mocked(fetchRedirectFromBackend).mockResolvedValue(
      'https://evil.example.com/steal'
    )

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.badGateway)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fails rather than serving an empty file where storage refused', async ({
    server
  }) => {
    storageAnswers({ ok: false, status: 403 })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.badGateway)
  })
})
