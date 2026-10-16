import { ANALYTICS_CONSENT_COOKIE } from '#server/common/analytics/consent.js'
import {
  containerId,
  measurementId,
  switchAnalyticsOff,
  switchAnalyticsOn
} from '#server/common/test-helpers/analytics-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { it } from '#vite/fixtures/server.js'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, describe, expect } from 'vitest'

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 */

/**
 * @param {HapiServer} server
 * @param {string} [consent]
 */
const getHead = async (server, consent) => {
  const { result } = await server.inject({
    method: 'GET',
    url: '/start',
    headers: consent ? { cookie: `${ANALYTICS_CONSENT_COOKIE}=${consent}` } : {}
  })

  return new JSDOM(asHtml(result)).window.document.head
}

/**
 * @param {Awaited<ReturnType<typeof getHead>>} head
 */
const tagOf = (head) => head.querySelector('script[src*="analytics"]')

describe('#analyticsTag', () => {
  describe('when analytics is disabled', () => {
    it('should not load the tag even for a visitor who consented', async ({
      server
    }) => {
      const head = await getHead(server, 'accepted')

      expect(tagOf(head)).toBeNull()
    })
  })

  describe('when analytics is enabled', () => {
    beforeAll(switchAnalyticsOn)

    afterAll(switchAnalyticsOff)

    it.for(['rejected', undefined])(
      'should not load the tag having answered %s',
      async (consent, { server }) => {
        const head = await getHead(server, consent)

        expect(tagOf(head)).toBeNull()
      }
    )

    it('should load the tag once consent is given', async ({ server }) => {
      const head = await getHead(server, 'accepted')

      expect(tagOf(head)).not.toBeNull()
    })

    it.for([
      ['measurement', measurementId],
      ['container', containerId]
    ])(
      'should publish the %s id for the tag to read',
      async ([kind, id], { server }) => {
        const head = await getHead(server, 'accepted')
        const meta = head.querySelector(`meta[name="analytics-${kind}-id"]`)

        expect(meta?.getAttribute('content')).toBe(id)
      }
    )

    it.for(['measurement', 'container'])(
      'should not publish the %s id before consent',
      async (kind, { server }) => {
        const head = await getHead(server)

        expect(
          head.querySelector(`meta[name="analytics-${kind}-id"]`)
        ).toBeNull()
      }
    )
  })
})
