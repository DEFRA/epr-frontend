import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

import { backend, path } from './backend-client.js'

/**
 * @import { SetupServerApi } from 'msw/node'
 */

/**
 * @typedef {ReturnType<typeof backend>} Backend
 */

vi.mock(import('@defra/hapi-tracing'), () => ({
  withTraceId: vi.fn((headerName, headers = {}) => {
    headers[headerName] = 'mock-trace-id-1'
    return headers
  }),
  tracing: {
    plugin: {}
  }
}))

const backendUrl = config.get('eprBackendUrl')

/**
 * @param {SetupServerApi} msw
 * @param {'get' | 'post'} method
 */
const recordRequests = (msw, method) => {
  /** @type {{ authorization: string | null, body: string, contentType: string | null, traceId: string | null }[]} */
  const requests = []

  msw.use(
    http[method](`${backendUrl}/v1/thing`, async ({ request }) => {
      requests.push({
        authorization: request.headers.get('authorization'),
        body: await request.text(),
        contentType: request.headers.get('content-type'),
        traceId: request.headers.get('x-cdp-request-id')
      })
      return new HttpResponse(null, { status: 204 })
    })
  )

  return requests
}

describe('backend-client', () => {
  describe(backend, () => {
    describe('requests', () => {
      it.for([
        {
          description: 'get with no body or content-type',
          method: /** @type {const} */ ('get'),
          call: (/** @type {Backend} */ api) => api.get('/v1/thing'),
          body: '',
          contentType: null
        },
        {
          description: 'post the body as json with a json content-type',
          method: /** @type {const} */ ('post'),
          call: (/** @type {Backend} */ api) =>
            api.post('/v1/thing', { name: 'a thing' }),
          body: '{"name":"a thing"}',
          contentType: 'application/json'
        },
        {
          description: 'post no body or content-type when none is given',
          method: /** @type {const} */ ('post'),
          call: (/** @type {Backend} */ api) => api.post('/v1/thing'),
          body: '',
          contentType: null
        }
      ])(
        'should $description, carrying the token and the trace id',
        async ({ method, call, body, contentType }, { msw }) => {
          const requests = recordRequests(msw, method)

          await call(backend('a-token'))

          expect(requests).toStrictEqual([
            {
              authorization: 'Bearer a-token',
              body,
              contentType,
              traceId: 'mock-trace-id-1'
            }
          ])
        }
      )
    })

    describe('responses', () => {
      it.for([
        {
          description: 'the json body',
          response: () => HttpResponse.json({ id: 'thing-1' }),
          expected: { id: 'thing-1' }
        },
        {
          description: 'undefined when there is no json body',
          response: () => new HttpResponse(null, { status: 204 }),
          expected: undefined
        }
      ])(
        'should resolve to $description',
        async ({ response, expected }, { msw }) => {
          msw.use(http.get(`${backendUrl}/v1/thing`, response))

          await expect(
            backend('a-token').get('/v1/thing')
          ).resolves.toStrictEqual(expected)
        }
      )

      it.for([
        {
          description: 'its json body',
          response: () =>
            HttpResponse.json({ code: 'thing_stale' }, { status: 409 }),
          expected: { statusCode: 409, payload: { code: 'thing_stale' } }
        },
        {
          description: 'no body',
          response: () => new HttpResponse(null, { status: 503 }),
          expected: { statusCode: 503 }
        }
      ])(
        'should reject with the backend status and $description',
        async ({ response, expected }, { msw }) => {
          msw.use(http.get(`${backendUrl}/v1/thing`, response))

          await expect(
            backend('a-token').get('/v1/thing')
          ).rejects.toMatchObject({ isBoom: true, output: expected })
        }
      )

      it('should reject as an internal fetch failure when the backend is unreachable', async ({
        msw
      }) => {
        msw.use(http.get(`${backendUrl}/v1/thing`, () => HttpResponse.error()))

        await expect(backend('a-token').get('/v1/thing')).rejects.toMatchObject(
          {
            isBoom: true,
            output: { statusCode: 500 },
            code: 'external_fetch_failed',
            message:
              'Failed to fetch from url: http://epr-backend.test/v1/thing',
            event: {
              action: 'external_fetch',
              reason: 'type=TypeError code=unknown'
            }
          }
        )
      })
    })
  })

  describe(path, () => {
    it('should encode each interpolated value and leave the literal parts alone', () => {
      const organisationId = 'org/1'
      const year = 2026

      expect(path`/v1/organisations/${organisationId}/reports/${year}`).toBe(
        '/v1/organisations/org%2F1/reports/2026'
      )
    })
  })
})
