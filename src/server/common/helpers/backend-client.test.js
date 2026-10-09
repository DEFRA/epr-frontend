import Joi from 'joi'
import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, vi } from 'vitest'

import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

import { backend, path, strictly } from './backend-client.js'

/**
 * @import { Readable } from 'node:stream'
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

        const result = await backend(token).get('/v1/thing', {
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

        const result = await backend(token).post(
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
          backend(token).get('/v1/thing', { onError: mapToMapped })
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
          backend(token, { onError: mapToMapped }).delete('/v1/thing')
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
          backend(token, { onError: mapToMapped }).get('/v1/thing', {
            onError: () => {
              throw new Other()
            }
          })
        ).rejects.toBeInstanceOf(Other)
      })

      it('should type each call by its parse, its caller, or as void for writes', () => {
        const api = backend(token)

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
          backend(token).get('/v1/thing', {
            parse: () => {
              throw new Error('unparseable')
            },
            onError: mapToMapped
          })
        ).rejects.toBeInstanceOf(Mapped)
      })
    })

    describe('redirect', () => {
      it('should resolve to where the backend redirects without following it', async ({
        msw
      }) => {
        msw.use(
          http.get(
            `${backendUrl}/v1/file`,
            () =>
              new HttpResponse(null, {
                status: 302,
                headers: { location: 'https://storage/signed' }
              })
          )
        )

        await expect(backend(token).redirect('/v1/file')).resolves.toBe(
          'https://storage/signed'
        )
      })

      it.for([404, 403])(
        'should reject a %s as that status rather than a gateway fault',
        async (status, { msw }) => {
          msw.use(
            http.get(
              `${backendUrl}/v1/file`,
              () => new HttpResponse(null, { status })
            )
          )

          await expect(
            backend(token).redirect('/v1/file')
          ).rejects.toMatchObject({
            output: { statusCode: status },
            code: 'external_fetch_failed',
            event: {
              action: 'external_redirect',
              reason: `backend_responded_${status}`
            }
          })
        }
      )

      it('should reject as a bad gateway an answer that names no location', async ({
        msw
      }) => {
        msw.use(
          http.get(
            `${backendUrl}/v1/file`,
            () => new HttpResponse(null, { status: 200 })
          )
        )

        await expect(backend(token).redirect('/v1/file')).rejects.toMatchObject(
          {
            output: { statusCode: 502 },
            code: 'external_redirect_invalid',
            event: {
              action: 'external_redirect',
              reason: 'missing_location_header'
            }
          }
        )
      })
    })

    describe('stream', () => {
      /**
       * @param {Readable} body
       */
      const read = async (body) =>
        Buffer.concat(await body.toArray()).toString()

      it('should resolve to the body as a node stream with the type and name the backend gave it', async ({
        msw
      }) => {
        msw.use(
          http.get(
            `${backendUrl}/v1/export.csv`,
            () =>
              new HttpResponse('a,b\n1,2\n', {
                headers: {
                  'content-type': 'text/csv',
                  'content-disposition': 'attachment; filename="export.csv"'
                }
              })
          )
        )

        const { body, contentType, contentDisposition } =
          await backend(token).stream('/v1/export.csv')

        expect({
          body: await read(body),
          contentType,
          contentDisposition
        }).toStrictEqual({
          body: 'a,b\n1,2\n',
          contentType: 'text/csv',
          contentDisposition: 'attachment; filename="export.csv"'
        })
      })

      it('should resolve to nulls where the backend named no type or name', async ({
        msw
      }) => {
        msw.use(
          http.get(
            `${backendUrl}/v1/export.csv`,
            () => new HttpResponse(new Blob(['a']))
          )
        )

        const { contentType, contentDisposition } =
          await backend(token).stream('/v1/export.csv')

        expect({ contentType, contentDisposition }).toStrictEqual({
          contentType: null,
          contentDisposition: null
        })
      })

      it('should reject as a bad gateway an answer with no body', async ({
        msw
      }) => {
        msw.use(
          http.get(
            `${backendUrl}/v1/export.csv`,
            () => new HttpResponse(null, { status: 200 })
          )
        )

        await expect(
          backend(token).stream('/v1/export.csv')
        ).rejects.toMatchObject({
          output: { statusCode: 502 },
          code: 'external_fetch_failed',
          event: { action: 'external_fetch', reason: 'missing_body' }
        })
      })

      it('should not ask for json', async ({ msw }) => {
        /** @type {(string | null)[]} */
        const accepted = []
        msw.use(
          http.get(`${backendUrl}/v1/export.csv`, ({ request }) => {
            accepted.push(request.headers.get('accept'))
            return new HttpResponse('a')
          })
        )

        await backend(token).stream('/v1/export.csv')

        expect(accepted).not.toContain('application/json')
      })

      it.for([404, 403])(
        'should reject a %s as that status rather than a gateway fault',
        async (status, { msw }) => {
          msw.use(
            http.get(
              `${backendUrl}/v1/export.csv`,
              () => new HttpResponse(null, { status })
            )
          )

          await expect(
            backend(token).stream('/v1/export.csv')
          ).rejects.toMatchObject({
            output: { statusCode: status },
            code: 'external_fetch_failed',
            event: {
              action: 'external_fetch',
              reason: `backend_responded_${status}`
            }
          })
        }
      )
    })

    it.for(/** @type {const} */ (['redirect', 'stream']))(
      'should %s through the client onError',
      async (method, { msw }) => {
        class Mapped extends Error {}
        msw.use(
          http.get(
            `${backendUrl}/v1/file`,
            () => new HttpResponse(null, { status: 404 })
          )
        )

        await expect(
          backend(token, {
            onError: () => {
              throw new Mapped()
            }
          })[method]('/v1/file')
        ).rejects.toBeInstanceOf(Mapped)
      }
    )
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
        backend(token).get('/v1/thing', { parse: strictly(thingSchema) })

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
        backend(token).get('/v1/thing', { parse: strictly(thingSchema) })
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
