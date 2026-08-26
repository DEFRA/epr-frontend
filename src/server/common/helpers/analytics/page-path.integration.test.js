import { asHapiRequest } from '#server/common/hapi-types.js'
import { analyticsPagePath } from '#server/common/helpers/analytics/page-path.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const organisationId = '68e68d9c78f83083f0f17a76'

/**
 * Asks the running server, rather than a hand-built object, what a request
 * carries. The whole approach rests on Hapi reporting the pattern a request
 * matched rather than the address it arrived at, and that is its behaviour to
 * change, not ours.
 * @param {HapiServer} server
 * @param {string} url
 */
const stepReportedFor = async (server, url) => {
  const { request } = await server.inject({ method: 'GET', url })

  return analyticsPagePath(asHapiRequest(request))
}

describe('#analyticsPagePath against the running server', () => {
  it('should drop the identifiers an address actually carried', async ({
    server
  }) => {
    const step = await stepReportedFor(
      server,
      `/organisations/${organisationId}`
    )

    expect(step).toBe('/organisations/:organisationId')
    expect(step).not.toContain(organisationId)
  })

  it.for([
    ['/start', '/start'],
    ['/cookies', '/cookies'],
    ['/contact', '/contact']
  ])('should report %s as itself', async ([url, expected], { server }) => {
    await expect(stepReportedFor(server, url)).resolves.toBe(expected)
  })

  it('should report a welsh page as the same step as its english one', async ({
    server
  }) => {
    await expect(stepReportedFor(server, '/cy/cookies')).resolves.toBe(
      '/cookies'
    )
  })

  it('should gather every unmatched address into one step', async ({
    server
  }) => {
    await expect(stepReportedFor(server, '/nope-does-not-exist')).resolves.toBe(
      '/:p'
    )
  })
})
