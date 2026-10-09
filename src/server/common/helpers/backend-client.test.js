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
const token = 'a-backend-token'

/**
 * @param {Request} request
 */
const sentHeaders = (request) => ({
  accept: request.headers.get('accept'),
  authorization: request.headers.get('authorization'),
  contentType: request.headers.get('content-type'),
  traceId: request.headers.get('x-cdp-request-id')
})

describe('backend-client', () => {
  describe(backend, () => {
    describe('requests', () => {
      /**
       * @param {SetupServerApi} msw
       * @param {'get' | 'post' | 'put' | 'patch' | 'delete'} method
       */
      const recordRequests = (msw, method) => {
        /** @type {{ headers: ReturnType<typeof sentHeaders>, body: string }[]} */
        const requests = []

        msw.use(
          http[method](`${backendUrl}/v1/thing`, async ({ request }) => {
            requests.push({
              headers: sentHeaders(request),
              body: await request.text()
            })
            return new HttpResponse(null, { status: 204 })
          })
        )

        return requests
      }

      const headersWithoutBody = {
        accept: 'application/json',
        authorization: 'Bearer a-backend-token',
        contentType: null,
        traceId: 'mock-trace-id-1'
      }

      it.for(/** @type {const} */ (['get', 'delete']))(
        'should %s with the token, accept json and the trace id, and no body or content-type',
        async (method, { msw }) => {
          const requests = recordRequests(msw, method)

          await backend(token)[method]('/v1/thing')

          expect(requests).toStrictEqual([
            { headers: headersWithoutBody, body: '' }
          ])
        }
      )

      it.for(/** @type {const} */ (['post', 'put', 'patch']))(
        'should %s the body as json with a json content-type',
        async (method, { msw }) => {
          const requests = recordRequests(msw, method)

          await backend(token)[method]('/v1/thing', { name: 'a thing' })

          expect(requests).toStrictEqual([
            {
              headers: {
                ...headersWithoutBody,
                contentType: 'application/json'
              },
              body: JSON.stringify({ name: 'a thing' })
            }
          ])
        }
      )

      it('should post without a body or content-type when none is given', async ({
        msw
      }) => {
        const requests = recordRequests(msw, 'post')

        await backend(token).post('/v1/thing')

        expect(requests).toStrictEqual([
          { headers: headersWithoutBody, body: '' }
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

        const result = await backend(token).get('/v1/thing')

        expect(result).toStrictEqual({ id: 'thing-1' })
      })

      it('should resolve to undefined when there is no json body', async ({
        msw
      }) => {
        msw.use(
          http.delete(
            `${backendUrl}/v1/thing`,
            () => new HttpResponse(null, { status: 204 })
          )
        )

        const result = await backend(token).delete('/v1/thing')

        expect(result).toBeUndefined()
      })

      it('should reject with the backend status and json body', async ({
        msw
      }) => {
        msw.use(
          http.get(`${backendUrl}/v1/thing`, () =>
            HttpResponse.json({ code: 'thing_stale' }, { status: 409 })
          )
        )

        await expect(backend(token).get('/v1/thing')).rejects.toMatchObject({
          isBoom: true,
          output: { statusCode: 409, payload: { code: 'thing_stale' } }
        })
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

        await expect(backend(token).get('/v1/thing')).rejects.toMatchObject({
          isBoom: true,
          output: { statusCode: 503 }
        })
      })

      it('should reject as an internal fetch failure carrying the cause when the backend is unreachable', async ({
        msw
      }) => {
        msw.use(http.get(`${backendUrl}/v1/thing`, () => HttpResponse.error()))

        await expect(backend(token).get('/v1/thing')).rejects.toMatchObject({
          isBoom: true,
          output: { statusCode: 500 },
          code: 'external_fetch_failed',
          message: 'Failed to fetch from url: http://epr-backend.test/v1/thing',
          event: {
            action: 'external_fetch',
            reason: 'type=TypeError code=unknown'
          },
          cause: expect.any(TypeError)
        })
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
