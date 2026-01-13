/* eslint-disable n/no-unpublished-import */
import { test } from 'vitest'
import { setupServer } from 'msw/node'
import { createOidcHandlers } from '../../src/server/common/test-helpers/mock-oidc.js'

export const it = test.extend({
  msw: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const server = setupServer(...createOidcHandlers('http://defra-id.auth'))
      server.listen({ onUnhandledRequest: 'warn' })

      await use(server)

      server.resetHandlers()
      server.close()
    },
    { auto: true }
  ],
  server: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const { createServer } = await import('#server/index.js')
      const server = await createServer()
      await server.initialize()

      await use(server)

      await server.stop()
    },
    { scope: 'file' }
  ]
})
