import { describe, expect } from 'vitest'
import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'

describe('server fixture', () => {
  it.fails(
    'should fail a test whose backend request has no msw handler',
    async () => {
      const response = await fetch(
        `${config.get('eprBackendUrl')}/v1/unmocked`
      ).catch(() => null)

      expect(response).toBeNull()
    }
  )
})
