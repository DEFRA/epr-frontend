import { load } from 'cheerio'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createServer } from '#server/index.js'

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

        expect($('html').attr('lang')).toBe(expectedLang)
        expect($('h1').first().text()).toBe('Sites')
      }
    )
  })

  describe('url rewriting', () => {
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

        expect(response.request.path).toBe(expectedPath)
      }
    )
  })

  describe('response variety handling', () => {
    it.each([
      {
        type: 'view',
        variety: 'view',
        path: '/test-view',
        content: '<html><body>Test View</body></html>',
        contentType: 'text/html',
        expectedContext: {
          pageTitle: 'Test Page',
          localise: expect.any(Function),
          langPrefix: ''
        }
      },
      {
        type: 'api',
        variety: 'api',
        path: '/test-not-view',
        content: JSON.stringify({ message: 'Not a view response' }),
        contentType: 'application/json',
        expectedContext: {
          pageTitle: 'Test Page'
        }
      }
    ])(
      'should handle $type responses correctly',
      async ({ variety, path, content, contentType, expectedContext }) => {
        server.route({
          method: 'GET',
          path,
          handler: async (request, h) => {
            request.i18n = { language: 'en' }
            request.t = () => 'translated'

            const bufferContent = Buffer.from(content)
            const response = h
              .response(bufferContent)
              .type(contentType)
              .header('content-type', `${contentType}; charset=utf-8`)

            response.variety = variety
            response.source = bufferContent
            response.source.context = {
              pageTitle: 'Test Page'
            }

            return response
          }
        })

        const response = await server.inject({
          method: 'GET',
          url: path
        })

        expect(response.statusCode).toBe(200)
        expect(response.request.response.variety).toBe(variety)
        expect(response.request.response.source.context).toMatchObject(
          expectedContext
        )
      }
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
