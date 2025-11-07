import bell from '@hapi/bell'
import jwt from '@hapi/jwt'
import fetch from 'node-fetch'

import { config } from '#config/config.js'
import { getDisplayName } from './display.js'

const getOidcConfiguration = async (oidcConfigurationUrl) => {
  const res = await fetch(oidcConfigurationUrl)
  if (!res.ok) {
    throw new Error(`OIDC config fetch failed: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

/**
 * Defra ID OIDC authentication plugin
 * Configures `@hapi/bell` for OAuth2/OIDC flow with Defra ID
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const defraId = {
  plugin: {
    name: 'defra-id',
    register: async (server) => {
      const oidcConfigurationUrl = config.get('defraId.oidcConfigurationUrl')
      const serviceId = config.get('defraId.serviceId')
      const clientId = config.get('defraId.clientId')
      const clientSecret = config.get('defraId.clientSecret')
      const authCallbackUrl = config.get('appBaseUrl') + '/auth/callback'

      await server.register(bell)

      // Fetch OIDC configuration from discovery endpoint
      const oidcConf = await getOidcConfiguration(oidcConfigurationUrl)

      // Configure bell authentication strategy
      server.auth.strategy('defra-id', 'bell', {
        location: (request) => {
          // Store referrer for redirect after login
          if (request.info.referrer) {
            request.yar.flash('referrer', request.info.referrer)
          }

          return authCallbackUrl
        },
        provider: {
          name: 'defra-id',
          protocol: 'oauth2',
          useParamsAuth: true,
          auth: oidcConf.authorization_endpoint,
          token: oidcConf.token_endpoint,
          scope: ['openid', 'offline_access'],
          profile: async function (credentials, params) {
            server.logger.info('auth: Defra ID profile received')

            // Decode JWT and extract user profile
            const payload = jwt.token.decode(credentials.token).decoded.payload
            const userId = payload.sub
            const displayName = getDisplayName(payload)
            const logoutUrl = oidcConf.end_session_endpoint
            const relationships =
              payload.relationships?.map((relationship) => {
                const [relationshipId, organisationId, organisationName] =
                  relationship.split(':')

                return {
                  id: relationshipId,
                  orgId: organisationId,
                  orgName: organisationName?.trim(),
                  isCurrent: payload.currentRelationshipId === relationshipId
                }
              }) ?? []
            const currentRelationship =
              relationships?.find(({ isCurrent }) => isCurrent) ?? null

            server.app.defraId = {
              currentRelationship,
              logoutUrl,
              relationships,
              user: {
                id: userId,
                name: displayName
              }
            }

            credentials.profile = {
              id: userId,
              correlationId: payload.correlationId,
              sessionId: payload.sessionId,
              contactId: payload.contactId,
              serviceId: payload.serviceId,
              firstName: payload.firstName,
              lastName: payload.lastName,
              displayName,
              email: payload.email,
              uniqueReference: payload.uniqueReference,
              loa: payload.loa,
              aal: payload.aal,
              enrolmentCount: payload.enrolmentCount,
              enrolmentRequestCount: payload.enrolmentRequestCount,
              currentRelationshipId: payload.currentRelationshipId,
              relationships: payload.relationships,
              roles: payload.roles,
              idToken: params.id_token,
              tokenUrl: oidcConf.token_endpoint,
              logoutUrl
            }
          }
        },
        password: config.get('session.cookie.password'),
        clientId,
        clientSecret,
        cookie: 'bell-defra-id',
        isSecure: config.get('session.cookie.secure'),
        providerParams: {
          serviceId
        }
      })
    }
  }
}

export { defraId }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
