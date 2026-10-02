import { analyticsPageReferrer } from '#server/common/analytics/page-referrer.js'
import { describe, expect, it } from 'vitest'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

/**
 * @param {Record<string, unknown>} headers
 * @returns {HapiRequest}
 */
const requestCarrying = (headers) =>
  /** @type {HapiRequest} */ (/** @type {unknown} */ ({ headers }))

describe(analyticsPageReferrer, () => {
  it('should leave the referrer untouched when there is no request at all', () => {
    expect(analyticsPageReferrer(null)).toBeNull()
  })

  it('should leave the referrer untouched when a request carries no headers', () => {
    const request = /** @type {HapiRequest} */ ({})

    expect(analyticsPageReferrer(request)).toBeNull()
  })

  it.each([
    ['the header is empty', ''],
    ['the header is not a string', { referer: 'nested' }]
  ])('should leave the referrer untouched when %s', (_, referer) => {
    expect(analyticsPageReferrer(requestCarrying({ referer }))).toBeNull()
  })
})
