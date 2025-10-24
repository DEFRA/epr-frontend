import { load } from 'cheerio'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { createServer } from '~/src/server/index.js'

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
    it('should handle both view and non-view responses correctly', async () => {
      // Add test routes
      server.route([
        {
          method: 'GET',
          path: '/test-view',
          handler: (request, h) => {
            return h.view('home/index', { testData: 'view-test' })
          }
        },
        {
          method: 'GET',
          path: '/test-json',
          handler: (request, h) => {
            return h.response({ testData: 'json-test' })
          }
        }
      ])

      // Test view response
      const viewResponse = await server.inject({
        method: 'GET',
        url: '/test-view'
      })

      expect(viewResponse.statusCode).toBe(statusCodes.ok)
      expect(viewResponse.request.response.variety).toBe('view')
      expect(viewResponse.request.response.source.context).toMatchObject({
        testData: 'view-test',
        localise: expect.any(Function),
        langPrefix: '',
        language: 'en',
        htmlLang: 'en'
      })

      // Test non-view response
      const jsonResponse = await server.inject({
        method: 'GET',
        url: '/test-json'
      })

      expect(jsonResponse.statusCode).toBe(statusCodes.ok)
      expect(jsonResponse.request.response.variety).not.toBe('view')
      expect(jsonResponse.result).toEqual({ testData: 'json-test' })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
