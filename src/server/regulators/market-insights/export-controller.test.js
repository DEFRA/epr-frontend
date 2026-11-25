import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { serveDownload } from '#server/common/test-helpers/serve-download.js'
import {
  operator,
  regulator,
  regulatorWithoutMarketScope
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { toYear } from '#server/common/helpers/year.js'
import { paths } from '#server/paths.js'
import { it } from '#vite/fixtures/server.js'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

import { yearPath } from './helpers/year-path.js'

/**
 * @import { SetupServer } from 'msw/node'
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const disposition =
  'attachment; filename="market-insights-2026-monthly-3-2026-04-10-090000.zip"'

const zip = 'zip-bytes'

/**
 * @param {SetupServer} msw
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
    contentType = 'application/zip',
    status = statusCodes.ok
  } = {}
) =>
  serveDownload(
    msw,
    'http://epr-backend.test/v1/market-insights/2026/monthly/3/export.zip',
    { body: zip, contentDisposition, contentType, status }
  )

/**
 * @param {HapiServer} server
 * @param {typeof regulator} auth
 * @param {string} [url]
 */
const visit = (
  server,
  auth,
  url = yearPath(paths.regulators.marketInsightsExport, toYear(2026))
) => server.inject({ method: 'GET', url, auth })

describe('the market insights export', () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-10T09:00:00.000Z'))
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    vi.useRealTimers()
    config.set('featureFlags.regulatorAccess', false)
  })

  it('serves the zip the backend built', async ({ server, msw }) => {
    backendStreams(msw)

    const response = await visit(server, regulator)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.rawPayload.toString()).toBe(zip)
  })

  it('asks for the reporting period the pages show', async ({
    server,
    msw
  }) => {
    const requests = backendStreams(msw)

    await visit(server, regulator)

    expect(requests).toStrictEqual([
      'http://epr-backend.test/v1/market-insights/2026/monthly/3/export.zip'
    ])
  })

  it('has no zip for a year not offered, and asks the backend for nothing', async ({
    server,
    msw
  }) => {
    const requests = backendStreams(msw)

    const response = await visit(
      server,
      regulator,
      yearPath(paths.regulators.marketInsightsExport, toYear(2025))
    )

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(requests).toStrictEqual([])
  })

  it('names the file as the backend named it', async ({ server, msw }) => {
    backendStreams(msw)

    const response = await visit(server, regulator)

    expect(response.headers['content-disposition']).toBe(disposition)
  })

  it('still serves the zip where the backend named no file', async ({
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

    expect(response.headers['content-type']).toContain('application/zip')
  })

  it('calls it a zip where the backend named no type', async ({
    server,
    msw
  }) => {
    backendStreams(msw, { contentType: null })

    const response = await visit(server, regulator)

    expect(response.headers['content-type']).toContain('application/zip')
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

  it.for([
    { description: 'an operator', auth: operator },
    {
      description: 'a session the backend granted no market data scope',
      auth: regulatorWithoutMarketScope
    }
  ])(
    'is refused $description, and asks the backend for nothing',
    async ({ auth }, { server, msw }) => {
      const requests = backendStreams(msw)

      const response = await visit(server, auth)

      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(requests).toStrictEqual([])
    }
  )
})
