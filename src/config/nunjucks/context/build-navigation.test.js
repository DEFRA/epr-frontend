import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { languages } from '#server/common/constants/languages.js'
import { localiseUrl } from '#server/common/helpers/i18n/localiseUrl.js'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

/**
 * @param {Partial<Request>} [options]
 */
function mockRequest(options) {
  return {
    t: vi.fn((key) => {
      const translations = {
        'common:navigation:yourSites': 'Your sites',
        'common:navigation:switchOrganisation': 'Switch organisation',
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
    authed: { displayName: 'Test User' },
    unauthed: {}
  }

  it('should show that navigation is now dependant on the request', () => {
    expect(buildNavigation(null)).toStrictEqual([])
  })

  describe('your sites', () => {
    it('should provide expected navigation details', () => {
      const [yourSites] = buildNavigation(
        mockRequest({ path: '/non-existent-path' }),
        users.authed
      )

      expect(yourSites).toStrictEqual({
        active: false,
        href: '/account',
        text: 'Your sites'
      })
    })

    it('should not include link when user is not authenticated', () => {
      const request = mockRequest({ path: '/' })

      const [yourSites] = buildNavigation(request, users.unauthed)

      expect(yourSites).toBeUndefined()
    })

    it('should provide expected highlighted navigation details', () => {
      const [yourSites] = buildNavigation(
        mockRequest({ path: '/account' }),
        users.authed
      )

      expect(yourSites).toStrictEqual({
        active: true,
        href: '/account',
        text: 'Your sites'
      })
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        path: '/cy',
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const [yourSites] = buildNavigation(request, users.authed)

      expect(yourSites.href).toBe('/cy/account')
    })
  })

  describe('switch organisation', () => {
    it('should include switch organisation link when user is authenticated', () => {
      const request = mockRequest({ path: '/' })

      const [, switchOrg] = buildNavigation(request, users.authed)

      expect(switchOrg).toStrictEqual({
        href: '/auth/organisation',
        text: 'Switch organisation'
      })
    })

    it('should not include switch organisation link when user is not authenticated', () => {
      const request = mockRequest({ path: '/' })

      const [, switchOrg] = buildNavigation(request, users.unauthed)

      expect(switchOrg).toBeUndefined()
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        path: '/cy',
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const [, switchOrg] = buildNavigation(request, users.authed)

      expect(switchOrg.href).toBe('/cy/auth/organisation')
    })
  })

  describe('sign out', () => {
    it('should include sign out link when user is authenticated', () => {
      const request = mockRequest({ path: '/' })

      const [, , signout] = buildNavigation(request, users.authed)

      expect(signout).toStrictEqual({
        href: '/logout',
        text: 'Sign out'
      })
    })

    it('should not include sign out link when user is not authenticated', () => {
      const request = mockRequest({ path: '/' })

      const [, , signout] = buildNavigation(request, users.unauthed)

      expect(signout).toBeUndefined()
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        path: '/cy',
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const [, , signout] = buildNavigation(request, users.authed)

      expect(signout.href).toBe('/cy/logout')
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Server } from '@hapi/hapi'
 */
