import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe('#emailNotRecognisedController', () => {
  describe('auth disabled', () => {
    /** @type {Server} */
    let server

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    it('should render email-not-recognised page when auth is disabled', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: {
          idToken: 'mock-id-token'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/email-not-recognised'
      })

      const $ = load(result)

      expect($('title').text().trim()).toStrictEqual(
        expect.stringMatching(/^We do not recognise your email address \|/)
      )
      expect($('h1').text().trim()).toBe(
        'We do not recognise your email address'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('when auth is enabled', () => {
    /** @type {Server} */
    let server
    const mockOidcServer = createMockOidcServer('http://defra-id.auth')

    beforeAll(async () => {
      mockOidcServer.listen()
      config.load({
        defraId: {
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          oidcConfigurationUrl:
            'http://defra-id.auth/.well-known/openid-configuration',
          serviceId: 'test-service-id'
        }
      })

      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      config.reset('defraId.clientId')
      config.reset('defraId.clientSecret')
      config.reset('defraId.oidcConfigurationUrl')
      config.reset('defraId.serviceId')
      mockOidcServer.close()
      await server.stop({ timeout: 0 })
    })

    it('should render email-not-recognised page with correct content', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: {
          idToken: 'mock-id-token'
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/email-not-recognised'
      })

      const $ = load(result)

      expect($('title').text().trim()).toStrictEqual(
        expect.stringMatching(/^We do not recognise your email address \|/)
      )
      expect($('h1.govuk-heading-xl').text().trim()).toBe(
        'We do not recognise your email address'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should display all required content sections', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: {
          idToken: 'mock-id-token'
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/email-not-recognised'
      })

      const $ = load(result)

      // Check for main content paragraphs
      const paragraphs = $('p.govuk-body')

      expect(paragraphs.length).toBeGreaterThanOrEqual(3)

      // Check for bullet list
      expect($('ul.govuk-list--bullet')).toHaveLength(1)
      expect($('ul.govuk-list--bullet li')).toHaveLength(3)
    })

    it('should display correct list item content and contact link', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: {
          idToken: 'mock-id-token'
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/email-not-recognised'
      })

      const $ = load(result)

      // Check that list items contain expected text
      const firstItem = $('ul.govuk-list--bullet li').eq(0).text().trim()
      const secondItem = $('ul.govuk-list--bullet li').eq(1).text().trim()

      expect(firstItem).toContain("check that you've signed in")
      expect(secondItem).toContain('ask someone who was named')

      // Check for contact link in the third list item
      const thirdItem = $('ul.govuk-list--bullet li').eq(2)
      const link = thirdItem.find('a.govuk-link')

      expect(link).toHaveLength(1)
      expect(link.text()).toBe('contact your regulator')
      expect(link.attr('href')).toBe('#')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
