import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { describe, expect } from 'vitest'

const mockAuth = buildMockAuth()

describe('logged out controller', () => {
  describe('when navigating to /logged-out', () => {
    it('should return 200 status', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render page with correct title', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      const $ = load(asHtml(result))

      expect($('title').text()).toContain('Signed out')
    })

    it('should render page with correct heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      const $ = load(asHtml(result))

      expect($('h1').text()).toBe('You have signed out')
    })

    it('should render sign in again button linking to login', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      const $ = load(asHtml(result))
      const button = $('.govuk-button')

      expect(button.text().trim()).toBe('Sign in again')
      expect(button.attr('href')).toBe('/login')
    })

    it('should redirect to home page if user not logged out', async ({
      server
    }) => {
      const { headers, statusCode } = await server.inject({
        method: 'GET',
        url: '/logged-out',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/')
    })
  })
})
