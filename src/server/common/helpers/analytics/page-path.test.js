import { analyticsPagePath } from '#server/common/helpers/analytics/page-path.js'
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
  it.for([
    ['/', '/'],
    ['/cookies', '/cookies'],
    ['/organisations/{organisationId}', '/organisations/:organisationId'],
    [
      '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/submit',
      '/organisations/:organisationId/registrations/:registrationId/summary-logs/:summaryLogId/submit'
    ]
  ])('should name the step behind %s', ([route, expected]) => {
    expect(analyticsPagePath(requestOn(route))).toBe(expected)
  })

  it('should keep an optional parameter recognisable', () => {
    expect(analyticsPagePath(requestOn('/reports/{reportId?}'))).toBe(
      '/reports/:reportId'
    )
  })

  it('should keep a multi-segment parameter recognisable', () => {
    expect(analyticsPagePath(requestOn('/public/{param*}'))).toBe(
      '/public/:param'
    )
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
