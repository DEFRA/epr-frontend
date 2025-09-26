import { buildNavigation } from '~/src/config/nunjucks/context/build-navigation.js'

/**
 * @param {Partial<Request>} [options]
 */
function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/non-existent-path' }))
    ).toEqual([
      {
        active: false,
        href: '/',
        text: 'Your sites'
      }
    ])
  })

  test('Should provide expected highlighted navigation details', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
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
