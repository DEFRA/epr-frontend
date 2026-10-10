import Joi from 'joi'
import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, vi } from 'vitest'

import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

import { backend, path, strictly } from './backend-client.js'

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
 * @param {'get' | 'post' | 'put' | 'patch' | 'delete'} method
 */
const recordRequests = (msw, method) => {
  /**
   * @type {{
   *   accept: string | null,
   *   authorization: string | null,
   *   body: string,
   *   contentType: string | null,
   *   traceId: string | null
   * }[]}
   */
  const requests = []

  msw.use(
    http[method](`${backendUrl}/v1/thing`, async ({ request }) => {
      requests.push({
        accept: request.headers.get('accept'),
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
        },
        {
          description: 'put the body as json with a json content-type',
          method: /** @type {const} */ ('put'),
          call: (/** @type {Backend} */ api) =>
            api.put('/v1/thing', { name: 'a thing' }),
          body: '{"name":"a thing"}',
          contentType: 'application/json'
        },
        {
          description: 'patch the body as json with a json content-type',
          method: /** @type {const} */ ('patch'),
          call: (/** @type {Backend} */ api) =>
            api.patch('/v1/thing', { name: 'a thing' }),
          body: '{"name":"a thing"}',
          contentType: 'application/json'
        },
        {
          description: 'delete with no body or content-type',
          method: /** @type {const} */ ('delete'),
          call: (/** @type {Backend} */ api) => api.delete('/v1/thing'),
          body: '',
          contentType: null
        }
      ])(
        'should $description, carrying the token, the trace id and asking for json',
        async ({ method, call, body, contentType }, { msw }) => {
          const requests = recordRequests(msw, method)

          await call(backend('a-token'))

          expect(requests).toStrictEqual([
            {
              accept: 'application/json',
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

      it('should reject as an internal fetch failure carrying the cause when the backend is unreachable', async ({
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
            },
            cause: expect.any(TypeError)
          }
        )
      })
    })

    describe('options', () => {
      class Mapped extends Error {}

      /** @type {(error: unknown) => never} */
      const mapToMapped = (error) => {
        throw new Mapped('mapped', { cause: error })
      }

      it('should resolve to what parse makes of the body', async ({ msw }) => {
        msw.use(
          http.get(`${backendUrl}/v1/thing`, () =>
            HttpResponse.json({ id: 'thing-1' })
          )
        )

        const result = await backend('a-token').get('/v1/thing', {
          parse: (payload) => ({ parsed: payload })
        })

        expect(result).toStrictEqual({ parsed: { id: 'thing-1' } })
      })

      it('should parse the body a write answers with', async ({ msw }) => {
        msw.use(
          http.post(`${backendUrl}/v1/thing`, () =>
            HttpResponse.json({ id: 'thing-1' }, { status: 201 })
          )
        )

        const result = await backend('a-token').post(
          '/v1/thing',
          { name: 'a thing' },
          { parse: (payload) => ({ parsed: payload }) }
        )

        expect(result).toStrictEqual({ parsed: { id: 'thing-1' } })
      })

      it('should reject with what onError maps the failure to', async ({
        msw
      }) => {
        msw.use(
          http.get(
            `${backendUrl}/v1/thing`,
            () => new HttpResponse(null, { status: 404 })
          )
        )

        await expect(
          backend('a-token').get('/v1/thing', { onError: mapToMapped })
        ).rejects.toBeInstanceOf(Mapped)
      })

      it('should reject with what the client onError maps the failure to', async ({
        msw
      }) => {
        msw.use(
          http.delete(
            `${backendUrl}/v1/thing`,
            () => new HttpResponse(null, { status: 404 })
          )
        )

        await expect(
          backend('a-token', { onError: mapToMapped }).delete('/v1/thing')
        ).rejects.toBeInstanceOf(Mapped)
      })

      it('should prefer the call onError over the client onError', async ({
        msw
      }) => {
        class Other extends Error {}
        msw.use(
          http.get(
            `${backendUrl}/v1/thing`,
            () => new HttpResponse(null, { status: 404 })
          )
        )

        await expect(
          backend('a-token', { onError: mapToMapped }).get('/v1/thing', {
            onError: () => {
              throw new Other()
            }
          })
        ).rejects.toBeInstanceOf(Other)
      })

      it('should type each call by its parse, its caller, or as void for writes', () => {
        const api = backend('a-token')

        /** @returns {Promise<{ id: string }>} */
        const fetchThing = () => api.get('/v1/thing')

        expectTypeOf(() =>
          api.get('/v1/thing', { parse: () => ({ count: 1 }) })
        ).returns.resolves.toEqualTypeOf({ count: 1 })
        expectTypeOf(fetchThing).returns.resolves.toEqualTypeOf({ id: '' })
        expectTypeOf(() => api.get('/v1/thing')).returns.resolves.toBeUnknown()
        expectTypeOf(() =>
          api.post('/v1/thing', {})
        ).returns.resolves.toBeVoid()
        expectTypeOf(() => api.delete('/v1/thing')).returns.resolves.toBeVoid()
      })

      it('should map a parse failure through onError', async ({ msw }) => {
        msw.use(http.get(`${backendUrl}/v1/thing`, () => HttpResponse.json({})))

        await expect(
          backend('a-token').get('/v1/thing', {
            parse: () => {
              throw new Error('unparseable')
            },
            onError: mapToMapped
          })
        ).rejects.toBeInstanceOf(Mapped)
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

  describe(strictly, () => {
    /** @type {Joi.ObjectSchema<{ id: string, count: number }>} */
    const thingSchema = Joi.object({
      id: Joi.string().required(),
      count: Joi.number().required()
    })

    it('should resolve to the validated value, typed by the schema', async ({
      msw
    }) => {
      msw.use(
        http.get(`${backendUrl}/v1/thing`, () =>
          HttpResponse.json({ id: 'thing-1', count: 2 })
        )
      )

      const fetchThing = () =>
        backend('a-token').get('/v1/thing', { parse: strictly(thingSchema) })

      await expect(fetchThing()).resolves.toStrictEqual({
        id: 'thing-1',
        count: 2
      })
      expectTypeOf(fetchThing).returns.resolves.toEqualTypeOf({
        id: '',
        count: 0
      })
    })

    it('should reject as a bad gateway naming the url and every failing field', async ({
      msw
    }) => {
      msw.use(
        http.get(`${backendUrl}/v1/thing`, () => HttpResponse.json({ id: 1 }))
      )

      await expect(
        backend('a-token').get('/v1/thing', { parse: strictly(thingSchema) })
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 502 },
        code: 'backend_response_invalid',
        message: 'Invalid response from url: http://epr-backend.test/v1/thing',
        event: {
          action: 'parse_backend_response',
          reason: 'id: "id" must be a string; count: "count" is required'
        }
      })
    })
  })
})
