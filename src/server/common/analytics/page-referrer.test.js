import { analyticsPageReferrer } from '#server/common/analytics/page-referrer.js'
import { describe, expect, it } from 'vitest'

/**
 * @import { HapiRequest } from '#server/common/hapi-types.js'
 */

describe(analyticsPageReferrer, () => {
  it('should leave the referrer untouched when there is no request at all', () => {
    expect(analyticsPageReferrer(null)).toBeNull()
  })

  it('should leave the referrer untouched when a request carries no headers', () => {
    const request = /** @type {HapiRequest} */ ({})

    expect(analyticsPageReferrer(request)).toBeNull()
  })
})
