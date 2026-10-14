import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'
import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

describe('server fixture', () => {
  const backendUrl = `${config.get('eprBackendUrl')}/v1/canary`

  it('should pass a test whose request has an msw handler', async ({ msw }) => {
    msw.use(http.get(backendUrl, () => new HttpResponse(null, { status: 204 })))

    const response = await fetch(backendUrl)

    expect(response.status).toBe(204)
  })

  it.fails(
    'should fail a test whose request has no msw handler, even when the rejection is handled',
    async () => {
      await expect(fetch(backendUrl)).rejects.toThrow('fetch failed')
    }
  )
})
