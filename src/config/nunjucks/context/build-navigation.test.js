import { config } from '#config/config.js'
import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { languages } from '#server/common/constants/languages.js'
import { localiseUrl } from '#server/common/helpers/i18n/localiseUrl.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * @param {Partial<Request>} [options]
 */
function mockRequest(options) {
  return {
    auth: { credentials: null },
    t: vi.fn((key) => {
      const translations = {
        'common:navigation:home': 'Home',
        'common:navigation:manageAccount': 'Manage account',
        'common:navigation:signOut': 'Sign out'
      }
      return translations[key] || key
    }),
    localiseUrl: vi.fn((path) => path),
    ...options
  }
}

describe('#buildNavigation', () => {
  const credentials = {
    authedWithLinkedOrg: {
      displayName: 'Test User',
      linkedOrganisationId: 'org-123'
    },
    authedWithoutLinkedOrg: {
      displayName: 'Test User'
    }
  }

  beforeEach(() => {
    config.set('defraId.manageAccountUrl', 'https://defraid.example.com/manage')
  })

  afterEach(() => {
    config.reset('defraId.manageAccountUrl')
  })

  it('should return empty array when request is null', () => {
    expect(buildNavigation(null)).toStrictEqual([])
  })

  it('should return empty array when credentials are null', () => {
    expect(buildNavigation(mockRequest())).toStrictEqual([])
  })

  describe('home', () => {
    it('should provide home link when user has linked organisation', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg }
      })
      const [home] = buildNavigation(request)

      expect(home).toStrictEqual({
        href: '/organisations/org-123',
        text: 'Home'
      })
    })

    it('should not include home link when user has no linked organisation', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithoutLinkedOrg }
      })
      const navigation = buildNavigation(request)

      expect(navigation).not.toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Home' })])
      )
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg },
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const [home] = buildNavigation(request)

      expect(home.href).toBe('/cy/organisations/org-123')
    })
  })

  describe('manage account', () => {
    it('should include manage account link when config URL is set', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg }
      })
      const navigation = buildNavigation(request)
      const manageAccount = navigation.find(
        (item) => item.text === 'Manage account'
      )

      expect(manageAccount).toStrictEqual({
        href: 'https://defraid.example.com/manage',
        text: 'Manage account'
      })
    })
  })

  describe('sign out', () => {
    it('should include sign out link when user is authenticated', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg }
      })
      const navigation = buildNavigation(request)
      const signOut = navigation.find((item) => item.text === 'Sign out')

      expect(signOut).toStrictEqual({
        href: '/logout',
        text: 'Sign out'
      })
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg },
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const navigation = buildNavigation(request)
      const signOut = navigation.find((item) => item.text === 'Sign out')

      expect(signOut.href).toBe('/cy/logout')
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Server } from '@hapi/hapi'
 */
