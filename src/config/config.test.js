import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('config', () => {
  describe('defra id', () => {
    beforeEach(() => {
      vi.resetModules()

      delete process.env.DEFRA_ID_AUDIENCE
      delete process.env.DEFRA_ID_CLIENT_ID
      delete process.env.DEFRA_ID_CLIENT_SECRET
      delete process.env.DEFRA_ID_CLIENT_ID_PUBLIC
      delete process.env.DEFRA_ID_CLIENT_SECRET_PUBLIC
    })

    describe('client-id/client-secret', () => {
      it.each([
        {
          clientId: 'client-id',
          clientSecret: 'client-secret',
          publicClientId: 'public-client-id',
          publicClientSecret: 'public-client-secret',
          expected: {
            clientId: 'client-id',
            clientSecret: 'client-secret'
          }
        },
        {
          audience: 'public',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          publicClientId: 'public-client-id',
          publicClientSecret: 'public-client-secret',
          expected: {
            clientId: 'public-client-id',
            clientSecret: 'public-client-secret'
          }
        },
        {
          audience: 'internal',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          publicClientId: 'public-client-id',
          publicClientSecret: 'public-client-secret',
          expected: {
            clientId: 'client-id',
            clientSecret: 'client-secret'
          }
        }
      ])(
        'should get the correct details for audience: $audience',
        async ({
          audience,
          clientId,
          clientSecret,
          publicClientId,
          publicClientSecret,
          expected
        }) => {
          // eslint-disable-next-line vitest/no-conditional-in-test
          if (audience) {
            process.env.DEFRA_ID_AUDIENCE = audience
          } else {
            delete process.env.DEFRA_ID_AUDIENCE
          }
          process.env.DEFRA_ID_CLIENT_ID = clientId
          process.env.DEFRA_ID_CLIENT_SECRET = clientSecret
          process.env.DEFRA_ID_CLIENT_ID_PUBLIC = publicClientId
          process.env.DEFRA_ID_CLIENT_SECRET_PUBLIC = publicClientSecret

          const { config } = await import('./config.js')

          expect(config.get('defraId.clientId')).toStrictEqual(
            expected.clientId
          )
          expect(config.get('defraId.clientSecret')).toStrictEqual(
            expected.clientSecret
          )
        }
      )
    })
  })
})
