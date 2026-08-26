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

  it('should drop the identifiers the request actually carried', () => {
    const organisationId = '68e68d9c78f83083f0f17a76'
    const registrationId = '68e6912278f83083f0f17a7b'
    const summaryLogId = '68e69a4578f83083f0f17a8c'
    const request = /** @type {HapiRequest} */ ({
      route: {
        path: '/organisations/{organisationId}/registrations/{registrationId}/summary-logs/{summaryLogId}/submit'
      },
      url: new URL(
        `https://example.test/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}/submit`
      )
    })

    const reported = analyticsPagePath(request)

    expect(reported).toBe(
      '/organisations/:organisationId/registrations/:registrationId/summary-logs/:summaryLogId/submit'
    )
    expect(reported).not.toContain(organisationId)
    expect(reported).not.toContain(registrationId)
    expect(reported).not.toContain(summaryLogId)
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
