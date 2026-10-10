import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

import { backend, path } from './backend-client.js'

/**
 * @import { SetupServerApi } from 'msw/node'
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
      it('should get with the token and the trace id, and no body or content-type', async ({
        msw
      }) => {
        const requests = recordRequests(msw, 'get')

        await backend('a-token').get('/v1/thing')

        expect(requests).toStrictEqual([
          {
            authorization: 'Bearer a-token',
            body: '',
            contentType: null,
            traceId: 'mock-trace-id-1'
          }
        ])
      })

      it('should post the body as json with a json content-type', async ({
        msw
      }) => {
        const requests = recordRequests(msw, 'post')

        await backend('a-token').post('/v1/thing', { name: 'a thing' })

        expect(requests).toStrictEqual([
          {
            authorization: 'Bearer a-token',
            body: '{"name":"a thing"}',
            contentType: 'application/json',
            traceId: 'mock-trace-id-1'
          }
        ])
      })

      it('should post without a body or content-type when none is given', async ({
        msw
      }) => {
        const requests = recordRequests(msw, 'post')

        await backend('a-token').post('/v1/thing')

        expect(requests).toStrictEqual([
          {
            authorization: 'Bearer a-token',
            body: '',
            contentType: null,
            traceId: 'mock-trace-id-1'
          }
        ])
      })
    })

    describe('responses', () => {
      it('should resolve to the json body', async ({ msw }) => {
        msw.use(
          http.get(`${backendUrl}/v1/thing`, () =>
            HttpResponse.json({ id: 'thing-1' })
          )
        )

        await expect(
          backend('a-token').get('/v1/thing')
        ).resolves.toStrictEqual({ id: 'thing-1' })
      })

      it('should resolve to undefined when there is no json body', async ({
        msw
      }) => {
        msw.use(
          http.post(
            `${backendUrl}/v1/thing`,
            () => new HttpResponse(null, { status: 204 })
          )
        )

        await expect(
          backend('a-token').post('/v1/thing')
        ).resolves.toBeUndefined()
      })

      it('should reject with the backend status and json body', async ({
        msw
      }) => {
        msw.use(
          http.get(`${backendUrl}/v1/thing`, () =>
            HttpResponse.json({ code: 'thing_stale' }, { status: 409 })
          )
        )

        await expect(backend('a-token').get('/v1/thing')).rejects.toMatchObject(
          {
            isBoom: true,
            output: { statusCode: 409, payload: { code: 'thing_stale' } }
          }
        )
      })

      it('should reject with the backend status when the error has no body', async ({
        msw
      }) => {
        msw.use(
          http.get(
            `${backendUrl}/v1/thing`,
            () => new HttpResponse(null, { status: 503 })
          )
        )

        await expect(backend('a-token').get('/v1/thing')).rejects.toMatchObject(
          { isBoom: true, output: { statusCode: 503 } }
        )
      })

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
