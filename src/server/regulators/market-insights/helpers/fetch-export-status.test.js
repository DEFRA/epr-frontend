import { config } from '#config/config.js'
import { test } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { fetchExportStatus } from './fetch-export-status.js'

/** @import { ExportStatus } from './fetch-export-status.js' */

const backendUrl = config.get('eprBackendUrl')
const exportUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/export`
const backendToken = 'test-backend-token'

const aPeriod = { year: 2026, cadence: 'monthly', period: 8 }

/** @type {ExportStatus} */
const ready = {
  status: 'ready',
  downloadUrl: 'https://re-ex.s3.eu-west-2.amazonaws.com/market-insights.zip',
  expiresAt: '2026-09-18T10:00:00.000Z'
}

describe(fetchExportStatus, () => {
  test('returns the state the backend answers with', async ({ msw }) => {
    msw.use(http.get(exportUrl, () => HttpResponse.json(ready)))

    await expect(
      fetchExportStatus({ ...aPeriod, backendToken })
    ).resolves.toStrictEqual(ready)
  })

  test('asks for the reporting period it was given', async ({ msw }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(exportUrl, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(ready)
      })
    )

    await fetchExportStatus({
      year: 2025,
      cadence: 'monthly',
      period: 3,
      backendToken
    })

    expect(/** @type {URL} */ (captured).pathname).toBe(
      '/v1/market-insights/2025/monthly/3/export'
    )
  })

  // A finished export is never reused, so naming no build starts a new one.
  test('names no build where none was given, which asks for a fresh one', async ({
    msw
  }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(exportUrl, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(ready)
      })
    )

    await fetchExportStatus({ ...aPeriod, backendToken })

    expect(/** @type {URL} */ (captured).search).toBe('')
  })

  test('names the build it was given, so the backend answers about that one', async ({
    msw
  }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(exportUrl, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(ready)
      })
    )

    await fetchExportStatus({
      ...aPeriod,
      buildToken: 'build-7',
      backendToken
    })

    expect(/** @type {URL} */ (captured).searchParams.get('build')).toBe(
      'build-7'
    )
  })

  test('encodes a period that would otherwise change the address', async ({
    msw
  }) => {
    /** @type {URL | undefined} */
    let captured

    msw.use(
      http.get(`${backendUrl}/v1/market-insights/*`, ({ request }) => {
        captured = new URL(request.url)
        return HttpResponse.json(ready)
      })
    )

    await fetchExportStatus({
      year: 2026,
      cadence: '../../me',
      period: 8,
      backendToken
    })

    expect(/** @type {URL} */ (captured).pathname).toBe(
      '/v1/market-insights/2026/..%2F..%2Fme/8/export'
    )
  })

  test('authorises the call with the session backend token', async ({
    msw
  }) => {
    /** @type {Request | undefined} */
    let captured

    msw.use(
      http.get(exportUrl, ({ request }) => {
        captured = request
        return HttpResponse.json(ready)
      })
    )

    await fetchExportStatus({ ...aPeriod, backendToken })

    expect(/** @type {Request} */ (captured).headers.get('authorization')).toBe(
      'Bearer test-backend-token'
    )
  })
})
