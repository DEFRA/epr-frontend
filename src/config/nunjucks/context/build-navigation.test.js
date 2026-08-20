import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { config } from '#config/config.js'
import { buildNavigation } from '#config/nunjucks/context/build-navigation.js'
import { SESSION_STRATEGY } from '#server/auth/helpers/session-cookie.js'
import { OIDC_DEFRA_ID } from '#server/auth/plugins/defra-id.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { REGULATOR_ROLE } from '#server/auth/roles.js'
import { languages } from '#server/common/constants/languages.js'
import { localiseUrl } from '#server/common/helpers/i18n/localiseUrl.js'
import { mockHapiRequest } from '#server/common/test-helpers/request-fixtures.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * @param {{
 *   auth?: { credentials: Record<string, unknown> | null, strategy?: string },
 *   localiseUrl?: (url: string) => string
 * }} [options]
 */
function mockRequest(options) {
  return mockHapiRequest({
    t: vi.fn((key) => {
      const translations = {
        'common:navigation:home': 'Home',
        'common:navigation:manageAccount': 'Manage account',
        'common:navigation:signOut': 'Sign out'
      }
      return translations[key] || key
    }),
    localiseUrl: vi.fn((path) => path),
    ...options,
    auth: { credentials: null, strategy: SESSION_STRATEGY, ...options?.auth }
  })
}

describe('#buildNavigation', () => {
  const credentials = {
    authedWithLinkedOrg: {
      displayName: 'Test User',
      linkedOrganisationId: 'org-123',
      provider: OIDC_DEFRA_ID,
      role: 'operator'
    },
    authedWithoutLinkedOrg: {
      displayName: 'Test User',
      provider: OIDC_DEFRA_ID,
      role: 'operator'
    },
    regulator: {
      displayName: 'Test Regulator',
      provider: OIDC_ENTRA_ID,
      role: REGULATOR_ROLE
    }
  }

  beforeEach(() => {
    config.set('defraId.manageAccountUrl', 'https://defraid.example.com/manage')
  })

  afterEach(() => {
    config.reset('defraId.manageAccountUrl')
  })

  it('should return empty array when request is null', () => {
    expect(buildNavigation(null)).toStrictEqual([])
  })

  it('should return empty array when credentials are null', () => {
    expect(buildNavigation(mockRequest())).toStrictEqual([])
  })

  it('should return empty array when the request holds no session', () => {
    const request = mockRequest({
      auth: { credentials: credentials.regulator, strategy: OIDC_ENTRA_ID }
    })

    expect(buildNavigation(request)).toStrictEqual([])
  })

  describe('a regulator', () => {
    it('is offered their own home and the sign out link, and nothing else', () => {
      const request = mockRequest({
        auth: { credentials: credentials.regulator, strategy: SESSION_STRATEGY }
      })

      expect(buildNavigation(request)).toStrictEqual([
        { href: '/regulators/home', text: 'Home' },
        { href: '/logout', text: 'Sign out' }
      ])
    })

    it('is offered their own home even while reading an organisation that has one', () => {
      const request = mockRequest({
        auth: {
          credentials: {
            ...credentials.regulator,
            linkedOrganisationId: 'org-123'
          },
          strategy: SESSION_STRATEGY
        }
      })
      const [home] = buildNavigation(request)

      expect(home).toStrictEqual({ href: '/regulators/home', text: 'Home' })
    })

    it('localises their home link', () => {
      const request = mockRequest({
        auth: {
          credentials: credentials.regulator,
          strategy: SESSION_STRATEGY
        },
        localiseUrl: localiseUrl(languages.WELSH)
      })
      const [home] = buildNavigation(request)

      expect(home.href).toBe('/cy/regulators/home')
    })

    it("is chosen by the role, so a session holding a regulator's scopes alone keeps the operator shell", () => {
      const request = mockRequest({
        auth: {
          credentials: {
            ...credentials.authedWithLinkedOrg,
            role: 'operator',
            scope: [...IDENTITIES.regulator.scopes]
          },
          strategy: SESSION_STRATEGY
        }
      })
      const [home] = buildNavigation(request)

      expect(home).toStrictEqual({
        href: '/organisations/org-123',
        text: 'Home'
      })
    })
  })

  describe('home', () => {
    it('should provide home link when user has linked organisation', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg }
      })
      const [home] = buildNavigation(request)

      expect(home).toStrictEqual({
        href: '/organisations/org-123',
        text: 'Home'
      })
    })

    it('should not include home link when user has no linked organisation', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithoutLinkedOrg }
      })
      const navigation = buildNavigation(request)

      expect(navigation).not.toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ text: 'Home' })])
      )
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg },
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const [home] = buildNavigation(request)

      expect(home.href).toBe('/cy/organisations/org-123')
    })
  })

  describe('manage account', () => {
    it('should include manage account link when config URL is set', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg }
      })
      const navigation = buildNavigation(request)
      const manageAccount = navigation.find(
        (item) => item.text === 'Manage account'
      )

      expect(manageAccount).toStrictEqual({
        href: 'https://defraid.example.com/manage',
        text: 'Manage account'
      })
    })
  })

  describe('sign out', () => {
    it('should include sign out link when user is authenticated', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg }
      })
      const navigation = buildNavigation(request)
      const signOut = navigation.find((item) => item.text === 'Sign out')

      expect(signOut).toStrictEqual({
        href: '/logout',
        text: 'Sign out'
      })
    })

    it('should localise url correctly', () => {
      const request = mockRequest({
        auth: { credentials: credentials.authedWithLinkedOrg },
        localiseUrl: localiseUrl(languages.WELSH)
      })

      const navigation = buildNavigation(request)
      const signOut = navigation.find((item) => item.text === 'Sign out')

      expect(/** @type {NonNullable<typeof signOut>} */ (signOut).href).toBe(
        '/cy/logout'
      )
    })
  })
})

/**
 * @import { Request } from '@hapi/hapi'
 * @import { Server } from '@hapi/hapi'
 */
