import { describe, expect, test } from 'vitest'
import { buildNavigation } from '~/src/config/nunjucks/context/build-navigation.js'

/**
 * @param {Partial<Request>} [options]
 */
function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('should provide expected navigation details', () => {
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

  test('should provide expected highlighted navigation details', () => {
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
 */
