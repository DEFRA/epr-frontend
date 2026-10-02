import { analyticsPagePath } from '#server/common/analytics/page-path.js'
import { describe, expect, it } from 'vitest'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * @param {string} [path]
 */
const requestOn = (path) =>
  /** @type {HapiRequest} */ (path ? { route: { path } } : {})

describe(analyticsPagePath, () => {
  it.each([
    ['an optional parameter', '/reports/{reportId?}', '/reports/:reportId'],
    ['a multi-segment parameter', '/public/{param*}', '/public/:param'],
    ['a counted multi-segment parameter', '/public/{param*2}', '/public/:param']
  ])('should keep %s recognisable', (_, path, expected) => {
    expect(analyticsPagePath(requestOn(path))).toBe(expected)
  })

  it('should fall back to the root when a route carries no path', () => {
    const request = /** @type {HapiRequest} */ ({
      route: {}
    })

    expect(analyticsPagePath(request)).toBe('/')
  })

  it('should fall back to the root when a request carries no route', () => {
    expect(analyticsPagePath(requestOn())).toBe('/')
  })

  it('should fall back to the root when there is no request at all', () => {
    expect(analyticsPagePath(null)).toBe('/')
  })
})
