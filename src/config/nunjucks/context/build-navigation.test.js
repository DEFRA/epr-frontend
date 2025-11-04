import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { languages } from '#server/common/constants/languages.js'
import { localiseUrl } from '#server/common/helpers/i18n/localiseUrl.js'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/common/helpers/auth/get-user-session.js'))

/**
 * @param {Partial<Request>} [options]
 */
function mockRequest(options) {
  return {
    t: vi.fn((key) => {
      const translations = {
        'common:navigation:yourSites': 'Your sites',
        'common:navigation:signOut': 'Sign out'
      }
      return translations[key] || key
    }),
    localiseUrl: vi.fn((path) => path),
    ...options
  }
}

describe('#buildNavigation', () => {
  it('should show that navigation is now dependant on the request', () => {
    expect(buildNavigation(null)).toStrictEqual([])
  })

  describe('your sites', () => {
    it('should provide expected navigation details', () => {
      expect(
        buildNavigation(mockRequest({ path: '/non-existent-path' }))
      ).toStrictEqual([
        {
          active: false,
          href: '/',
          text: 'Your sites'
        }
      ])
    })

    it('should provide expected highlighted navigation details', () => {
      expect(buildNavigation(mockRequest({ path: '/' }))).toStrictEqual([
        {
          active: true,
          href: '/',
          text: 'Your sites'
        }
      ])
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        path: '/cy',
        localiseUrl: localiseUrl(languages.WELSH)
      })
      const authedUser = { displayName: 'Test User' }

      const [yourSites] = buildNavigation(request, authedUser)

      expect(yourSites.href).toBe('/cy/')
    })
  })

  describe('sign out', () => {
    it('should include sign out link when user is authenticated', () => {
      const request = mockRequest({ path: '/' })
      const authedUser = { displayName: 'Test User' }

      expect(buildNavigation(request, authedUser)).toStrictEqual([
        {
          active: true,
          href: '/',
          text: 'Your sites'
        },
        {
          href: '/logout',
          text: 'Sign out'
        }
      ])
    })

    it('should not include sign out link when user is not authenticated', () => {
      const request = mockRequest({ path: '/' })
      const authedUser = {}

      expect(buildNavigation(request, authedUser)).toStrictEqual([
        {
          active: true,
          href: '/',
          text: 'Your sites'
        }
      ])
    })

    it('should localise logout url correctly', () => {
      const request = mockRequest({
        path: '/cy',
        localiseUrl: localiseUrl(languages.WELSH)
      })
      const authedUser = { displayName: 'Test User' }

      const nav = buildNavigation(request, authedUser)

      expect(nav[1].href).toBe('/cy/logout')
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Server } from '@hapi/hapi'
 */
