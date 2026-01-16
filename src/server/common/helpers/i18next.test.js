import { statusCodes } from '#server/common/constants/status-codes.js'
import { getLocaliseUrl } from '#server/common/helpers/i18next.js'
import { load } from 'cheerio'
import { describe, expect, it as vitestIt } from 'vitest'
import { it } from '#vite/fixtures/server.js'

describe('#i18nPlugin - integration', () => {
  describe('language detection and html lang attribute', () => {
    it.for([
      {
        url: '/start',
        expectedLang: 'en',
        description: 'english',
        heading: 'Record reprocessed or exported packaging waste'
      },
      {
        url: '/cy/start',
        expectedLang: 'cy',
        description: 'welsh',
        // TODO placeholder welsh translation as only en.json files exist
        heading: 'Record reprocessed or exported packaging waste'
      }
    ])(
      'should set lang="$expectedLang" for $description pages ($url)',
      async ({ url, expectedLang, heading }, { server }) => {
        const response = await server.inject({
          method: 'GET',
          url
        })

        expect(response.statusCode).toBe(statusCodes.ok)

        const $ = load(response.result)

        expect($('html').attr('lang')).toBe(expectedLang)
        expect($('h1').first().text()).toBe(heading)
      }
    )
  })

  describe('url rewriting', () => {
    it.for([
      { originalUrl: '/cy', expectedPath: '/' },
      { originalUrl: '/cy/', expectedPath: '/' },
      { originalUrl: '/cy/some/deep/path', expectedPath: '/some/deep/path' }
    ])(
      'should rewrite $originalUrl to $expectedPath',
      async ({ originalUrl, expectedPath }, { server }) => {
        const response = await server.inject({
          method: 'GET',
          url: originalUrl
        })

        expect(response.request.path).toBe(expectedPath)
      }
    )
  })

  describe('response variety handling', () => {
    it.for([
      {
        type: 'view',
        variety: 'view',
        path: '/test-view',
        content: '<html><body>Test View</body></html>',
        contentType: 'text/html',
        expectedContext: {
          pageTitle: 'Test Page'
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
      async (
        { variety, path, content, contentType, expectedContext },
        { server }
      ) => {
        server.route({
          method: 'GET',
          path,
          options: { auth: false },
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

  describe('localiseUrl edge cases', () => {
    it('should handle language with region code via Accept-Language header', async ({
      server
    }) => {
      const response = await server.inject({
        method: 'GET',
        url: '/start',
        headers: {
          'Accept-Language': 'en-GB,en;q=0.9'
        }
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.request.localiseUrl).toBeDefined()
      // Should normalize en-GB to en and use English prefix
      expect(response.request.localiseUrl('/test')).toBe('/test')
    })

    it('should handle Welsh with region code', async ({ server }) => {
      const response = await server.inject({
        method: 'GET',
        url: '/cy/start',
        headers: {
          'Accept-Language': 'cy-GB,cy;q=0.9'
        }
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.request.localiseUrl).toBeDefined()
      // Should normalize cy-GB to cy and use Welsh prefix
      expect(response.request.localiseUrl('/test')).toBe('/cy/test')
    })
  })
})

describe('#getLocaliseUrl', () => {
  vitestIt('should handle language with region code (en-GB)', () => {
    const localiseUrl = getLocaliseUrl('en-GB')

    expect(localiseUrl('/test')).toBe('/test')
  })

  vitestIt('should handle language with region code (cy-GB)', () => {
    const localiseUrl = getLocaliseUrl('cy-GB')

    expect(localiseUrl('/test')).toBe('/cy/test')
  })

  vitestIt('should handle unsupported language and default to en', () => {
    const localiseUrl = getLocaliseUrl('fr')

    expect(localiseUrl('/test')).toBe('/test')
  })

  vitestIt('should handle simple language codes', () => {
    expect(getLocaliseUrl('en')('/test')).toBe('/test')
    expect(getLocaliseUrl('cy')('/test')).toBe('/cy/test')
  })
})
