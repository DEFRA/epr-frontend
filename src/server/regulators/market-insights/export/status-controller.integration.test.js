import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import {
  operator,
  regulator,
  regulatorWithoutMarketScope
} from '#server/common/test-helpers/market-insights-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/** @import { ExportStatus } from '../helpers/fetch-export-status.js' */

const backendUrl = config.get('eprBackendUrl')
const exportUrl = `${backendUrl}/v1/market-insights/:year/:cadence/:period/export`
const exportPage = '/regulators/market-insights/exports/2026/monthly/8'
const watching = `${exportPage}?build=build-7`

const storageUrl = 'https://re-ex.s3.eu-west-2.amazonaws.com/e.zip'

/** @param {ExportStatus} state */
const backendSays = (state) =>
  http.get(exportUrl, () => HttpResponse.json(state))

const building = backendSays({ status: 'building', buildToken: 'build-7' })

const isReady = backendSays({
  status: 'ready',
  downloadUrl: storageUrl,
  expiresAt: '2026-09-18T10:00:00.000Z'
})

const hasFailed = backendSays({
  status: 'failed',
  failureReason: 'The figures could not be read'
})

/**
 * The whole page, because the refresh that does the waiting lives in the head
 * rather than in the body.
 * @param {unknown} result
 */
const pageOf = (result) => new JSDOM(asHtml(result)).window.document

/**
 * What the browser is told to do next, or null where it is told nothing - which
 * is how a page that has stopped waiting reads.
 * @param {ReturnType<typeof pageOf>} page
 * @returns {string | null}
 */
const refreshOf = (page) =>
  page.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content') ??
  null

describe('the market insights export page', () => {
  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  describe('arriving with no build named', () => {
    it('asks the backend for the period in its own address, naming no build, which starts one', async ({
      msw,
      server
    }) => {
      /** @type {URL | undefined} */
      let asked

      msw.use(
        http.get(exportUrl, ({ request }) => {
          asked = new URL(request.url)
          return HttpResponse.json({
            status: 'building',
            buildToken: 'build-7'
          })
        })
      )

      await server.inject({ method: 'GET', url: exportPage, auth: regulator })

      expect(/** @type {URL} */ (asked).pathname).toBe(
        '/v1/market-insights/2026/monthly/8/export'
      )
      expect(/** @type {URL} */ (asked).search).toBe('')
    })

    // Without the token every refresh would start another build and never see
    // one finish.
    it('refreshes onto the build the backend just started', async ({
      msw,
      server
    }) => {
      msw.use(building)

      const { result } = await server.inject({
        method: 'GET',
        url: exportPage,
        auth: regulator
      })

      expect(refreshOf(pageOf(result))).toBe(`3; url=${watching}`)
    })
  })

  describe('while the build it is watching runs', () => {
    it('asks the backend about that build rather than starting another', async ({
      msw,
      server
    }) => {
      /** @type {URL | undefined} */
      let asked

      msw.use(
        http.get(exportUrl, ({ request }) => {
          asked = new URL(request.url)
          return HttpResponse.json({
            status: 'building',
            buildToken: 'build-7'
          })
        })
      )

      await server.inject({ method: 'GET', url: watching, auth: regulator })

      expect(/** @type {URL} */ (asked).searchParams.get('build')).toBe(
        'build-7'
      )
    })

    it('keeps refreshing, without any script', async ({ msw, server }) => {
      msw.use(building)

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(refreshOf(pageOf(result))).toBe(`3; url=${watching}`)
    })

    // The backend answers a token the period has moved on from with the build
    // that took over, so the poller follows whatever it was last told.
    it('follows the build that took over from the one it was watching', async ({
      msw,
      server
    }) => {
      msw.use(backendSays({ status: 'building', buildToken: 'build-9' }))

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(refreshOf(pageOf(result))).toBe(
        `3; url=${exportPage}?build=build-9`
      )
    })

    it('offers nothing to download yet', async ({ msw, server }) => {
      msw.use(building)

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(
        queryByRole(pageOf(result).body, 'button', {
          name: 'Download the figures (ZIP)'
        })
      ).toBeNull()
    })
  })

  describe('once the build is ready', () => {
    it('stops refreshing', async ({ msw, server }) => {
      msw.use(isReady)

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(refreshOf(pageOf(result))).toBeNull()
    })

    it('offers that build through this service, not through storage', async ({
      msw,
      server
    }) => {
      msw.use(isReady)

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(
        getByRole(pageOf(result).body, 'button', {
          name: 'Download the figures (ZIP)'
        }).getAttribute('href')
      ).toBe(`${exportPage}/download?build=build-7`)
    })
  })

  describe('where the build failed', () => {
    it('stops refreshing rather than waiting for something that will not come', async ({
      msw,
      server
    }) => {
      msw.use(hasFailed)

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(refreshOf(pageOf(result))).toBeNull()
    })

    it('says why', async ({ msw, server }) => {
      msw.use(hasFailed)

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(pageOf(result).body.textContent).toContain(
        'Reason: The figures could not be read'
      )
    })

    // Naming no build is what asks for a new one, so the retry must drop it.
    it('offers to ask again at an address naming no build', async ({
      msw,
      server
    }) => {
      msw.use(hasFailed)

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(
        getByRole(pageOf(result).body, 'button', {
          name: 'Ask for the figures again'
        }).getAttribute('href')
      ).toBe(exportPage)
    })
  })

  // A state this page does not know would otherwise refresh for ever.
  describe('where the backend answers with a state this page does not know', () => {
    it('stops refreshing', async ({ msw, server }) => {
      msw.use(backendSays({ status: 'abandoned' }))

      const { result } = await server.inject({
        method: 'GET',
        url: watching,
        auth: regulator
      })

      expect(refreshOf(pageOf(result))).toBeNull()
    })
  })

  it('is refused an operator', async ({ server }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: exportPage,
      auth: operator
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  it('is refused a session the backend granted no market data scope', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: exportPage,
      auth: regulatorWithoutMarketScope
    })

    expect(statusCode).toBe(statusCodes.forbidden)
  })
})
