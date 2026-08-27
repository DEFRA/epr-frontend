import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, vi } from 'vitest'

const measurementId = 'G-TESTONLY01'
const consented = { cookie: 'analyticsConsent=accepted' }

/**
 * The content security policy is built once, when the plugin module is first
 * imported, while consent and the tag are decided per request. A test that only
 * flips config at runtime therefore proves nothing about the policy the browser
 * actually receives. Booting a server with the environment already set is the
 * only way to see both halves as a deployed instance would.
 * @param {Record<string, string>} env
 */
const serverStartedWith = async (env) => {
  Object.entries(env).forEach(([name, value]) => vi.stubEnv(name, value))
  vi.resetModules()

  const { createServer } = await import('#server/index.js')
  const server = await createServer()
  await server.initialize()

  return server
}

/**
 * @param {string} header
 * @param {string} directive
 */
const sourcesFor = (header, directive) =>
  header.split(';').find((part) => part.startsWith(`${directive} `)) ?? ''

describe('#analytics switched on end to end', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  describe('when every switch is lined up', () => {
    it('should permit the very origins the page then loads', async () => {
      const server = await serverStartedWith({
        ANALYTICS_ENABLED: 'true',
        ANALYTICS_MEASUREMENT_ID: measurementId
      })

      const { headers, result } = await server.inject({
        method: 'GET',
        url: '/start',
        headers: consented
      })
      await server.stop()

      const policy = String(headers['content-security-policy'])
      const { document } = new JSDOM(asHtml(result)).window
      const tag = document.querySelector('head script[src]')

      expect(sourcesFor(policy, 'script-src')).toContain(
        'https://www.googletagmanager.com'
      )
      expect(sourcesFor(policy, 'connect-src')).toContain(
        'https://*.google-analytics.com'
      )
      expect(tag?.getAttribute('src')).toContain('analytics')
      expect(
        document
          .querySelector('meta[name="analytics-measurement-id"]')
          ?.getAttribute('content')
      ).toBe(measurementId)
      expect(
        document
          .querySelector('meta[name="analytics-page-path"]')
          ?.getAttribute('content')
      ).toBe('/start')
    })
  })

  describe('when a switch is out of line', () => {
    it.for([
      ['the flag is off', { ANALYTICS_ENABLED: 'false' }],
      [
        'no measurement id is configured',
        { ANALYTICS_ENABLED: 'true', ANALYTICS_MEASUREMENT_ID: '' }
      ]
    ])('should record nothing when %s', async ([, env]) => {
      const server = await serverStartedWith(
        /** @type {Record<string, string>} */ (env)
      )

      const { headers, result } = await server.inject({
        method: 'GET',
        url: '/start',
        headers: consented
      })
      await server.stop()

      const policy = String(headers['content-security-policy'])
      const { document } = new JSDOM(asHtml(result)).window

      expect(policy).not.toContain('googletagmanager')
      expect(
        document.querySelector('meta[name="analytics-measurement-id"]')
      ).toBeNull()
    })
  })
})
