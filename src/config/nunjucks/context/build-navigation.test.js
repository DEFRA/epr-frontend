import { config } from '#config/config.js'
import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { languages } from '#server/common/constants/languages.js'
import { localiseUrl } from '#server/common/helpers/i18n/localiseUrl.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

/**
 * @param {Partial<Request>} [options]
 */
function mockRequest(options) {
  return {
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
  const users = {
    authedWithLinkedOrg: {
      displayName: 'Test User',
      linkedOrganisationId: 'org-123'
    },
    authedWithoutLinkedOrg: {
      displayName: 'Test User'
    },
    unauthed: null
  }

  beforeEach(() => {
    config.set('defraId.manageAccountUrl', 'https://defraid.example.com/manage')
  })

  afterEach(() => {
    config.reset('defraId.manageAccountUrl')
  })

  it('should show that navigation is now dependant on the request', () => {
    expect(buildNavigation(null)).toStrictEqual([])
  })

  describe('home', () => {
    it('should provide home link when user has linked organisation', () => {
      const [home] = buildNavigation(mockRequest(), users.authedWithLinkedOrg)

      expect(home).toStrictEqual({
        href: '/organisations/org-123',
        text: 'Home'
      })
    })

    it('should not include home link when user has no linked organisation', () => {
      const navigation = buildNavigation(
        mockRequest(),
        users.authedWithoutLinkedOrg
      )

      expect(navigation).not.toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Home' })])
      )
    })

    it('should not include home link when user is not authenticated', () => {
      const navigation = buildNavigation(mockRequest(), users.unauthed)

      expect(navigation).toStrictEqual([])
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const [home] = buildNavigation(request, users.authedWithLinkedOrg)

      expect(home.href).toBe('/cy/organisations/org-123')
    })
  })

  describe('manage account', () => {
    it('should include manage account link when config URL is set', () => {
      const navigation = buildNavigation(
        mockRequest(),
        users.authedWithLinkedOrg
      )
      const manageAccount = navigation.find(
        (item) => item.text === 'Manage account'
      )

      expect(manageAccount).toStrictEqual({
        href: 'https://defraid.example.com/manage',
        text: 'Manage account'
      })
    })

    it('should not include manage account link when config URL is not set', () => {
      config.reset('defraId.manageAccountUrl')

      const navigation = buildNavigation(
        mockRequest(),
        users.authedWithLinkedOrg
      )

      expect(navigation).not.toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Manage account' })
        ])
      )
    })

    it('should not include manage account link when user is not authenticated', () => {
      const navigation = buildNavigation(mockRequest(), users.unauthed)

      expect(navigation).toStrictEqual([])
    })
  })

  describe('sign out', () => {
    it('should include sign out link when user is authenticated', () => {
      const navigation = buildNavigation(
        mockRequest(),
        users.authedWithLinkedOrg
      )
      const signOut = navigation.find((item) => item.text === 'Sign out')

      expect(signOut).toStrictEqual({
        href: '/logout',
        text: 'Sign out'
      })
    })

    it('should not include sign out link when user is not authenticated', () => {
      const navigation = buildNavigation(mockRequest(), users.unauthed)

      expect(navigation).toStrictEqual([])
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const navigation = buildNavigation(request, users.authedWithLinkedOrg)
      const signOut = navigation.find((item) => item.text === 'Sign out')

      expect(signOut.href).toBe('/cy/logout')
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Server } from '@hapi/hapi'
 */
