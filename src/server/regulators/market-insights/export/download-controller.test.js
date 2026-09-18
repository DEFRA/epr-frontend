import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  operator,
  regulator,
  regulatorWithoutMarketScope
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/** @import { ExportStatus } from '../helpers/fetch-export-status.js' */

const backendUrl = config.get('eprBackendUrl')
const exportUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/export`
const download =
  '/regulators/market-insights/exports/2026/monthly/8/download?build=build-7'

const disposition =
  'attachment; filename="market-insights-2026-monthly-8-2026-09-18-090000.zip"'

const storageUrl =
  'https://re-ex-market-insights.s3.eu-west-2.amazonaws.com/exports/e.zip'
const signedUrl = `${storageUrl}?response-content-disposition=${encodeURIComponent(disposition)}`

const elsewhere = 'https://evil.example.com/steal'

/** @param {ExportStatus} state */
const backendSays = (state) =>
  http.get(exportUrl, () => HttpResponse.json(state))

/** The export the backend finished, signed to be served under its own name. */
const ready = backendSays({
  status: 'ready',
  downloadUrl: signedUrl,
  expiresAt: '2026-09-18T10:00:00.000Z'
})

/**
 * @param {string} url
 * @param {{
 *   contentDisposition?: string,
 *   contentType?: string | null,
 *   status?: number
 * }} [answer]
 */
const storageServes = (
  url,
  { contentDisposition, contentType = 'application/zip', status = 200 } = {}
) =>
  http.get(
    url,
    () =>
      new HttpResponse(new TextEncoder().encode('zip-bytes'), {
        status,
        headers: {
          ...(contentType ? { 'content-type': contentType } : {}),
          ...(contentDisposition
            ? { 'content-disposition': contentDisposition }
            : {})
        }
      })
  )

describe('downloading the market insights export', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('serves the zip the backend built', async ({ msw, server }) => {
    msw.use(ready, storageServes(storageUrl))

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.rawPayload.toString()).toBe('zip-bytes')
    expect(response.headers['content-type']).toContain('application/zip')
  })

  // An address naming no build would start a new one and have no file to serve.
  it('asks the backend about the build the page was watching', async ({
    msw,
    server
  }) => {
    /** @type {URL | undefined} */
    let asked

    msw.use(
      http.get(exportUrl, ({ request }) => {
        asked = new URL(request.url)
        return HttpResponse.json({ status: 'ready', downloadUrl: signedUrl })
      }),
      storageServes(storageUrl)
    )

    await server.inject({ method: 'GET', url: download, auth: regulator })

    expect(/** @type {URL} */ (asked).searchParams.get('build')).toBe('build-7')
  })

  it('calls it a zip where storage named no type', async ({ msw, server }) => {
    msw.use(ready, storageServes(storageUrl, { contentType: null }))

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.headers['content-type']).toContain('application/zip')
  })

  // Storage need not honour the override the backend signed, and the emulator
  // the journey tests run against does not.
  it('names the file as the signed URL says, whatever storage answered', async ({
    msw,
    server
  }) => {
    msw.use(ready, storageServes(storageUrl))

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('falls back to the storage name where the URL named none', async ({
    msw,
    server
  }) => {
    msw.use(
      backendSays({ status: 'ready', downloadUrl: storageUrl }),
      storageServes(storageUrl, { contentDisposition: disposition })
    )

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('still serves the zip where neither named one', async ({
    msw,
    server
  }) => {
    msw.use(
      backendSays({ status: 'ready', downloadUrl: storageUrl }),
      storageServes(storageUrl)
    )

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['content-disposition']).toBeUndefined()
  })

  // Without this the backend could point the server at anything it liked.
  it('refuses an address outside storage, and fetches nothing', async ({
    msw,
    server
  }) => {
    let fetched = false

    msw.use(
      backendSays({ status: 'ready', downloadUrl: elsewhere }),
      http.get(elsewhere, () => {
        fetched = true
        return HttpResponse.text('secrets')
      })
    )

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.badGateway)
    expect(fetched).toBe(false)
  })

  it('fails rather than serving an empty file where storage refused', async ({
    msw,
    server
  }) => {
    msw.use(ready, storageServes(storageUrl, { status: statusCodes.forbidden }))

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.badGateway)
  })

  it('is not there while the export is still being built', async ({
    msw,
    server
  }) => {
    msw.use(backendSays({ status: 'building' }))

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.notFound)
  })

  it('is not there where the backend called it ready but named no file', async ({
    msw,
    server
  }) => {
    msw.use(backendSays({ status: 'ready' }))

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.notFound)
  })

  it('is not there where the export failed', async ({ msw, server }) => {
    msw.use(
      backendSays({
        status: 'failed',
        failureReason: 'Storage was unreachable'
      })
    )

    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulator
    })

    expect(response.statusCode).toBe(statusCodes.notFound)
  })

  it('is refused an operator', async ({ server }) => {
    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: operator
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })

  it('is refused a session the backend granted no market data scope', async ({
    server
  }) => {
    const response = await server.inject({
      method: 'GET',
      url: download,
      auth: regulatorWithoutMarketScope
    })

    expect(response.statusCode).toBe(statusCodes.forbidden)
  })
})
