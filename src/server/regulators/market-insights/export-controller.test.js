import { Readable } from 'node:stream'

import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchStreamFromBackend } from '#server/common/helpers/fetch-stream-from-backend.js'
import { upstreamStatus } from '#server/common/helpers/logging/cdp-boom.js'
import {
  operator,
  regulator,
  regulatorWithoutMarketScope
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { paths } from '#server/paths.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import { reportingPeriodNow } from './helpers/reporting-period.js'

/** @import { HapiServer } from '#server/common/hapi-types.js' */

vi.mock(import('#server/common/helpers/fetch-stream-from-backend.js'))

const disposition =
  'attachment; filename="market-insights-2026-monthly-8-2026-09-18-090000.zip"'

const zip = 'zip-bytes'

/**
 * @param {{
 *   contentDisposition?: string | null,
 *   contentType?: string | null
 * }} [stream]
 */
const backendStreams = ({
  contentDisposition = disposition,
  contentType = 'application/zip'
} = {}) =>
  vi.mocked(fetchStreamFromBackend).mockResolvedValue({
    body: Readable.from([Buffer.from(zip)], { objectMode: false }),
    contentDisposition,
    contentType
  })

/**
 * @param {HapiServer} server
 * @param {typeof regulator} auth
 */
const visit = (server, auth) =>
  server.inject({
    method: 'GET',
    url: paths.regulators.marketInsightsExport,
    auth
  })

describe('the market insights export', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  beforeEach(() => {
    backendStreams()
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('serves the zip the backend built', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.rawPayload.toString()).toBe(zip)
  })

  it('asks for the reporting period the pages show, carrying the session token', async ({
    server
  }) => {
    await visit(server, regulator)

    const { year, month } = reportingPeriodNow()

    expect(fetchStreamFromBackend).toHaveBeenCalledWith(
      `/v1/market-insights/${year}/monthly/${month}/export.zip`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer ')
        })
      })
    )
  })

  it('names the file as the backend named it', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('still serves the zip where the backend named no file', async ({
    server
  }) => {
    backendStreams({ contentDisposition: null })

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['content-disposition']).toBeUndefined()
  })

  it('takes the content type from the backend', async ({ server }) => {
    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain('application/zip')
  })

  it('calls it a zip where the backend named no type', async ({ server }) => {
    backendStreams({ contentType: null })

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain('application/zip')
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

  it('is refused an operator, and asks the backend for nothing', async ({
    server
  }) => {
    const response = await visit(server, operator)

    expect(response.statusCode).toBe(statusCodes.forbidden)
    expect(fetchStreamFromBackend).not.toHaveBeenCalled()
  })

  it('is refused a session the backend granted no market data scope', async ({
    server
  }) => {
    const response = await visit(server, regulatorWithoutMarketScope)

    expect(response.statusCode).toBe(statusCodes.forbidden)
    expect(fetchStreamFromBackend).not.toHaveBeenCalled()
  })
})
