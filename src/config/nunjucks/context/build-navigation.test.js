import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
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
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Server } from '@hapi/hapi'
 */
