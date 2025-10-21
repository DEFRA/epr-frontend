import { load } from 'cheerio'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { createServer } from '~/src/server/index.js'

/**
 * i18n plugin integration tests
 *
 * These tests verify the i18n plugin integration with a real Hapi server.
 * Tests cover:
 * 1. Language detection from URL path (/cy prefix for Welsh)
 * 2. URL rewriting (stripping /cy prefix)
 * 3. Translation context injection into views
 * 4. HTML lang attribute setting
 */
describe('#i18nPlugin - integration', () => {
  /** @type {Server} */
  let server

  beforeEach(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('language detection and html lang attribute', () => {
    it('should default to english for root path', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/'
      })

      expect(response.statusCode).toBe(statusCodes.ok)

      // Verify we got HTML content (not a redirect)
      expect(response.headers['content-type']).toContain('text/html')

      // Parse HTML
      const $ = load(response.result)

      // Should have English language attribute
      expect($('html').attr('lang')).toBe('en')
    })

    it('should set welsh language for /cy path', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/cy'
      })

      expect(response.statusCode).toBe(statusCodes.ok)

      const $ = load(response.result)

      expect($('h1').first().text()).toBe('Sites')
      // Verify Welsh language is set
      expect($('html').attr('lang')).toBe('cy')
    })

    it.each([
      { url: '/', expectedLang: 'en', description: 'english' },
      { url: '/cy', expectedLang: 'cy', description: 'welsh' }
    ])(
      'should set lang="$expectedLang" for $description pages ($url)',
      async ({ url, expectedLang }) => {
        const response = await server.inject({
          method: 'GET',
          url
        })

        expect(response.statusCode).toBe(statusCodes.ok)

        const $ = load(response.result)

        // Verify correct language attribute
        expect($('html').attr('lang')).toBe(expectedLang)
      }
    )
  })

  describe('url rewriting', () => {
    it('should strip /cy prefix and route correctly', async () => {
      // Request to /cy/health should route to /health
      const response = await server.inject({
        method: 'GET',
        url: '/cy/health'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      // Verify the URL was rewritten from /cy/health to /health
      expect(response.request.path).toBe('/health')
      // Health endpoint returns JSON
      expect(response.result).toStrictEqual({ message: 'success' })
    })

    it('should handle /cy root by routing to /', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/cy'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      // Verify the URL was rewritten from /cy to /
      expect(response.request.path).toBe('/')

      // Should render home page
      const $ = load(response.result)
      const heading = $('h1').first().text()

      // The actual heading in the template is "Sites"
      expect(heading).toBe('Sites')

      // Verify the page rendered successfully (URL rewriting worked)
      expect($('html')).toHaveLength(1)
    })

    it.each([
      { originalUrl: '/cy', expectedPath: '/' },
      { originalUrl: '/cy/', expectedPath: '/' },
      { originalUrl: '/cy/health', expectedPath: '/health' },
      { originalUrl: '/cy/some/deep/path', expectedPath: '/some/deep/path' }
    ])(
      'should rewrite $originalUrl to $expectedPath',
      async ({ originalUrl, expectedPath }) => {
        const response = await server.inject({
          method: 'GET',
          url: originalUrl
        })

        // Verify the URL was rewritten correctly
        expect(response.request.path).toBe(expectedPath)
      }
    )
  })

  describe('translation context injection', () => {
    it('should make translation function available in view context', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/'
      })

      expect(response.statusCode).toBe(statusCodes.ok)

      const $ = load(response.result)

      // The page renders successfully, which means t function was available
      // (If t wasn't available, Nunjucks would error on any {{ t('key') }} calls)
      expect($('h1').first().text()).toBe('Sites')
      expect($('html')).toHaveLength(1)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
