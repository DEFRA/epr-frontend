import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import * as fetchOrganisationModule from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import * as fetchWasteBalancesModule from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { asOrganisation } from '#server/common/test-helpers/organisation-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import { getAllByRole, getByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

import fixtureData from '../../../../../fixtures/organisation/organisationData.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
)
vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))

const ORGANISATION_URL = '/organisations/6507f1f77bcf86cd79943901'

const operatorAuth = buildMockAuth({ linkedOrganisationId: 'org-123' })

const regulatorAuth = buildMockAuth({
  provider: OIDC_ENTRA_ID,
  ...sessionIdentity(IDENTITIES.regulator)
})

/**
 * @param {ServerFixtures['server']} server
 * @param {ReturnType<typeof buildMockAuth>} auth
 */
const renderOrganisationPage = async (server, auth) => {
  const { result } = await server.inject({
    method: 'GET',
    url: ORGANISATION_URL,
    auth
  })

  return new JSDOM(asHtml(result)).window.document.body
}

/**
 * The header renders the service name as a link to the service's own home, so
 * the link is both what the header calls the service and where it sends the
 * user.
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 */
const serviceLink = (body) =>
  getByRole(
    getByRole(body, 'region', { name: 'Service information' }),
    'link',
    {
      name: /packaging waste/i
    }
  )

/**
 * @param {InstanceType<DOMWindow['HTMLElement']>} body
 * @returns {string[]}
 */
const navigationLabels = (body) =>
  getAllByRole(getByRole(body, 'navigation', { name: 'Menu' }), 'listitem').map(
    (item) => item.textContent.trim()
  )

describe('the chrome around an organisation page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchOrganisationModule.fetchOrganisationById).mockResolvedValue(
      asOrganisation(fixtureData)
    )
    vi.mocked(fetchWasteBalancesModule.fetchWasteBalances).mockResolvedValue({})
  })

  describe('for a regulator', () => {
    it('calls the service by a name that says they read it', async ({
      server
    }) => {
      const body = await renderOrganisationPage(server, regulatorAuth)

      expect(serviceLink(body)).toHaveTextContent(
        'Check reprocessed or exported packaging waste'
      )
    })

    it('links the service name to the regulator home', async ({ server }) => {
      const body = await renderOrganisationPage(server, regulatorAuth)

      expect(serviceLink(body)).toHaveAttribute('href', '/regulators/home')
    })

    it('offers their own home, the organisations they browse, and the way out, and nothing else', async ({
      server
    }) => {
      const body = await renderOrganisationPage(server, regulatorAuth)

      expect(navigationLabels(body)).toStrictEqual([
        'Home',
        'All organisations',
        'Sign out'
      ])
    })

    it('marks no tab current while they read one organisation', async ({
      server
    }) => {
      const body = await renderOrganisationPage(server, regulatorAuth)

      expect(
        getByRole(body, 'link', { name: 'All organisations' })
      ).not.toHaveAttribute('aria-current')
    })

    it('sends the home link to the regulator home, not to the organisation being read', async ({
      server
    }) => {
      const body = await renderOrganisationPage(server, regulatorAuth)

      expect(getByRole(body, 'link', { name: 'Home' })).toHaveAttribute(
        'href',
        '/regulators/home'
      )
    })

    it('names the page after the regulator service', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: ORGANISATION_URL,
        auth: regulatorAuth
      })

      expect(new JSDOM(asHtml(result)).window.document.title).toMatch(
        /\| Check reprocessed or exported packaging waste$/
      )
    })
  })

  describe('for the operator whose organisation it is', () => {
    it('calls the service by the name that says they record into it', async ({
      server
    }) => {
      const body = await renderOrganisationPage(server, operatorAuth)

      expect(serviceLink(body)).toHaveTextContent(
        'Record reprocessed or exported packaging waste'
      )
    })

    it('links the service name to the start page', async ({ server }) => {
      const body = await renderOrganisationPage(server, operatorAuth)

      expect(serviceLink(body)).toHaveAttribute('href', '/start')
    })

    it('offers their own organisation, their account and the way out', async ({
      server
    }) => {
      const body = await renderOrganisationPage(server, operatorAuth)

      expect(navigationLabels(body)).toStrictEqual([
        'Home',
        'Manage account',
        'Sign out'
      ])
    })

    it('sends the home link to their own organisation', async ({ server }) => {
      const body = await renderOrganisationPage(server, operatorAuth)

      expect(getByRole(body, 'link', { name: 'Home' })).toHaveAttribute(
        'href',
        '/organisations/org-123'
      )
    })

    it('names the page after the operator service', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: ORGANISATION_URL,
        auth: operatorAuth
      })

      expect(new JSDOM(asHtml(result)).window.document.title).toMatch(
        /\| Record reprocessed or exported packaging waste$/
      )
    })
  })
})

/**
 * @import { DOMWindow } from 'jsdom'
 * @import { ServerFixtures } from '#vite/fixtures/server.js'
 */
