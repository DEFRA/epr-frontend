import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchStreamFromBackend } from './fetch-stream-from-backend.js'

const path =
  '/v1/organisations/org-1/registrations/reg-1/summary-logs/files/file-1/records.csv'
const options = { headers: { Authorization: 'Bearer token-1' } }

const disposition = 'attachment; filename="R26-2026-09-11-091530.csv"'

/**
 * A body as `fetch` hands one over: a Web ReadableStream, not a Node one.
 * @param {string} text
 * @returns {ReadableStream}
 */
const webStreamOf = (text) =>
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    }
  })

/**
 * @param {{
 *   body?: ReadableStream | null,
 *   contentDisposition?: string | null,
 *   contentType?: string | null,
 *   status?: number
 * }} [response]
 */
const backendAnswers = ({
  body = webStreamOf('a,b\n1,2\n'),
  contentDisposition = disposition,
  contentType = 'text/csv; charset=utf-8',
  status = 200
} = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      body,
      headers: {
        get: (/** @type {string} */ name) =>
          name === 'content-type'
            ? contentType
            : name === 'content-disposition'
              ? contentDisposition
              : null
      }
    })
  )

describe(fetchStreamFromBackend, () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  // Hapi understands Node Readables; handed the Web stream `fetch` returns it
  // serialises the object and the browser receives `{}` instead of the CSV.
  it('answers with the body as a Node stream', async () => {
    backendAnswers()

    const { body } = await fetchStreamFromBackend(path, options)

    const chunks = []
    for await (const chunk of body) {
      chunks.push(chunk)
    }

    expect(Buffer.concat(chunks).toString()).toBe('a,b\n1,2\n')
  })

  it('answers with the content type and disposition the backend set', async () => {
    backendAnswers()

    await expect(fetchStreamFromBackend(path, options)).resolves.toMatchObject({
      contentType: 'text/csv; charset=utf-8',
      contentDisposition: disposition
    })
  })

  it('answers with nulls where the backend named neither', async () => {
    backendAnswers({ contentDisposition: null, contentType: null })

    await expect(fetchStreamFromBackend(path, options)).resolves.toMatchObject({
      contentType: null,
      contentDisposition: null
    })
  })

  it('sends the caller-supplied headers on to the backend', async () => {
    backendAnswers()

    await fetchStreamFromBackend(path, options)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(path),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-1' })
      })
    )
  })

  // A refusal reaching the caller as 502 says the gateway broke, which sends
  // whoever reads the logs after the wrong thing.
  it.each([404, 403])(
    'answers %s with that status rather than a gateway fault',
    async (status) => {
      backendAnswers({ status, body: null })

      await expect(fetchStreamFromBackend(path, options)).rejects.toMatchObject(
        {
          isBoom: true,
          output: { statusCode: status },
          code: 'external_fetch_failed',
          event: { reason: `backend_responded_${status}` }
        }
      )
    }
  )

  it('fails with a 502 where the backend answered with no body', async () => {
    backendAnswers({ body: null })

    await expect(fetchStreamFromBackend(path, options)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 502 },
      code: 'external_fetch_failed',
      event: { reason: 'missing_body' }
    })
  })

  it('fails with a 500 where the fetch itself threw', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))

    await expect(fetchStreamFromBackend(path, options)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      code: 'external_fetch_failed',
      event: { reason: 'type=Error code=unknown' }
    })
  })

  it('lets an existing Boom through untouched', async () => {
    const boom = Object.assign(new Error('already boom'), {
      isBoom: true,
      output: { statusCode: 418 }
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        throw boom
      })
    )

    await expect(fetchStreamFromBackend(path, options)).rejects.toBe(boom)
  })
})
