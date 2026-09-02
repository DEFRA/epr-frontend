import { asHapiRequest } from '#server/common/hapi-types.js'
import { analyticsPageReferrer } from '#server/common/analytics/page-referrer.js'
import { it } from '#vite/fixtures/server.js'
import { describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

const authority = 'localhost:3000'
const organisationId = '68e68d9c78f83083f0f17a76'
const registrationId = '68e6912278f83083f0f17a7b'

/**
 * Asks the running server what the page before this one was, since the whole
 * approach rests on Hapi resolving an arbitrary address back to the pattern it
 * would have matched.
 * @param {HapiServer} server
 * @param {string} referer
 */
const referrerReportedFor = async (server, referer) => {
  const { request } = await server.inject({
    authority,
    method: 'GET',
    url: '/start',
    headers: { referer }
  })

  return analyticsPageReferrer(asHapiRequest(request))
}

describe('#analyticsPageReferrer against the running server', () => {
  it.for([
    [
      `http://${authority}/organisations/${organisationId}`,
      '/organisations/:organisationId'
    ],
    [
      `http://${authority}/organisations/${organisationId}/registrations/${registrationId}`,
      '/organisations/:organisationId/registrations/:registrationId'
    ],
    [`http://${authority}/cookies?some=query`, '/cookies']
  ])(
    'should report the step behind %s, carrying no identifier',
    async ([referer, expected], { server }) => {
      await expect(referrerReportedFor(server, referer)).resolves.toBe(expected)
    }
  )

  it.for([
    [`http://${authority}/cy/cookies`, '/cookies'],
    [`http://${authority}/cy`, '/']
  ])(
    'should report the welsh page %s as the same step as its english one',
    async ([referer, expected], { server }) => {
      await expect(referrerReportedFor(server, referer)).resolves.toBe(expected)
    }
  )

  it('should gather every unmatched address into one step', async ({
    server
  }) => {
    await expect(
      referrerReportedFor(server, `http://${authority}/nope-does-not-exist`)
    ).resolves.toBe('/:p')
  })

  it('should keep a cross-origin referrer, which is how the visitor arrived', async ({
    server
  }) => {
    await expect(
      referrerReportedFor(server, 'https://www.gov.uk/guidance/packaging-waste')
    ).resolves.toBeNull()
  })

  it('should report nothing when the visitor arrived from nowhere', async ({
    server
  }) => {
    const { request } = await server.inject({
      authority,
      method: 'GET',
      url: '/start'
    })

    expect(analyticsPageReferrer(asHapiRequest(request))).toBeNull()
  })
})
