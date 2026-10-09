import { http, HttpResponse } from 'msw'

import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { serveDownload } from '#server/common/test-helpers/serve-download.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { SetupServerApi } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-001'
const fileId = 'file-001'
const path = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/files/${fileId}/download`

const disposition =
  'attachment; filename="R26ER5000000002PA-2026-09-08-091530.xlsx"'

const storageUrl =
  'https://re-ex-summary-logs.s3.eu-west-2.amazonaws.com/uploads/f.xlsx'
const signedUrl = `${storageUrl}?response-content-disposition=${encodeURIComponent(disposition)}`

const operator = buildMockAuth()

const regulator = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  profile: { id: 'entra-user-1', email: 'ines.harlow@example.gov.uk' },
  ...sessionIdentity(IDENTITIES.regulator)
})

const backendPath = `/v1/organisations/${organisationId}/registrations/${registrationId}/summary-logs/files/${fileId}`

/**
 * @param {SetupServerApi} msw
 * @param {string} location
 */
const backendRedirectsTo = (msw, location) => {
  /** @type {(string | null)[]} */
  const authorizations = []

  msw.use(
    http.get(`${config.get('eprBackendUrl')}${backendPath}`, ({ request }) => {
      authorizations.push(request.headers.get('authorization'))
      return new HttpResponse(null, { status: 302, headers: { location } })
    })
  )

  return authorizations
}

/**
 * @param {SetupServerApi} msw
 * @param {{
 *   contentDisposition?: string | null,
 *   contentType?: string | null,
 *   status?: number
 * }} [file]
 */
const storageAnswers = (
  msw,
  {
    contentDisposition = disposition,
    contentType = 'application/vnd.ms-excel',
    status = statusCodes.ok
  } = {}
) =>
  serveDownload(msw, storageUrl, {
    body: 'xlsx-bytes',
    contentDisposition,
    contentType,
    status
  })

/**
 * @param {SetupServerApi} msw
 * @param {{ location?: string, file?: Parameters<typeof storageAnswers>[1] }} [answers]
 */
const theFileIsStored = (msw, { location = signedUrl, file } = {}) => ({
  backend: backendRedirectsTo(msw, location),
  storage: storageAnswers(msw, file)
})

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

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('serves the file a regulator asked for', async ({ server, msw }) => {
    theFileIsStored(msw)

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.rawPayload.toString()).toBe('xlsx-bytes')
  })

  // Storage need not honour the override the backend signed, and the emulator
  // the journey tests run against does not.
  it('names the file as the signed URL says, whatever storage answered', async ({
    server,
    msw
  }) => {
    theFileIsStored(msw, { file: { contentDisposition: null } })

    const response = await visit(server, regulator)

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('falls back to the storage disposition where the URL named none', async ({
    server,
    msw
  }) => {
    theFileIsStored(msw, { location: storageUrl })

    const response = await visit(server, regulator)

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('still serves the file where neither named one', async ({
    server,
    msw
  }) => {
    theFileIsStored(msw, {
      location: storageUrl,
      file: { contentDisposition: null }
    })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['content-disposition']).toBeUndefined()
  })

  it('takes the content type from storage', async ({ server, msw }) => {
    theFileIsStored(msw)

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain(
      'application/vnd.ms-excel'
    )
  })

  it('falls back to a generic content type where storage named none', async ({
    server,
    msw
  }) => {
    theFileIsStored(msw, { file: { contentType: null } })

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain(
      'application/octet-stream'
    )
  })

  it('asks the backend for the file, carrying the session token', async ({
    server,
    msw
  }) => {
    const { backend } = theFileIsStored(msw)

    await visit(server, regulator)

    expect(backend).toStrictEqual([expect.stringMatching(/^Bearer .+/)])
  })

  it('does not exist for an operator', async ({ server, msw }) => {
    const { backend } = theFileIsStored(msw)

    const response = await visit(server, operator)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(backend).toStrictEqual([])
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
    server,
    msw
  }) => {
    const evilUrl = 'https://evil.example.com/steal'
    backendRedirectsTo(msw, evilUrl)
    const fetched = serveDownload(msw, evilUrl)

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.badGateway)
    expect(fetched).toStrictEqual([])
  })

  it('fails rather than serving an empty file where storage refused', async ({
    server,
    msw
  }) => {
    theFileIsStored(msw, { file: { status: statusCodes.forbidden } })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.badGateway)
  })
})
