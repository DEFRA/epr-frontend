import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { asGetRequiredRegistrationResult } from '#server/common/test-helpers/organisation-fixtures.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import {
  asIssuedToOrganisation,
  asPackagingRecyclingNote
} from '#server/common/test-helpers/prn-fixtures.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByText,
  queryByRole,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)
vi.mock(import('./helpers/fetch-packaging-recycling-note.js'))

const { getRequiredRegistrationWithAccreditation } =
  await import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
const { fetchPackagingRecyclingNote } =
  await import('./helpers/fetch-packaging-recycling-note.js')

const mockCredentials = buildMockAuth().credentials

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const fixtureReprocessor = asGetRequiredRegistrationResult({
  organisationData: {
    id: 'org-123',
    companyDetails: { name: 'Reprocessor Organisation' }
  },
  registration: {
    id: 'reg-456',
    wasteProcessingType: 'reprocessor-input',
    material: 'plastic',
    nation: 'england',
    site: { address: { line1: 'Reprocessing Site' } },
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
})

const fixtureExporter = asGetRequiredRegistrationResult({
  organisationData: {
    id: 'org-123',
    companyDetails: { name: 'Exporter Organisation' }
  },
  registration: {
    id: 'reg-456',
    wasteProcessingType: 'exporter',
    material: 'plastic',
    nation: 'england',
    site: null,
    accreditationId: 'acc-001'
  },
  accreditation: { id: 'acc-001', status: 'approved' }
})

const mockIssuedPrn = asPackagingRecyclingNote({
  id: 'prn-789',
  prnNumber: 'ER2612345A',
  issuedToOrganisation: { id: 'producer-1', name: 'ComplyPak Ltd' },
  tonnage: 100,
  material: 'plastic',
  status: 'awaiting_acceptance'
})

const mockIssuedPern = asPackagingRecyclingNote({
  id: 'pern-123',
  prnNumber: 'EX2654321B',
  issuedToOrganisation: { id: 'exporter-1', name: 'Export Corp' },
  tonnage: 50,
  material: 'plastic',
  status: 'awaiting_acceptance'
})

const organisationId = 'org-123'
const registrationId = 'reg-456'
const accreditationId = 'acc-001'
const prnId = 'prn-789'
const issuedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/issued`
const viewUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${prnId}/view`
const listUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes`

describe('#issuedController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
      fixtureReprocessor
    )
    vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockIssuedPrn)
  })

  describe('request handling', () => {
    describe('success page (after issuing PRN)', () => {
      it('displays success page with PRN issued heading and recipient', async ({
        server
      }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        expect(statusCode).toBe(statusCodes.ok)

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PRN issued to/i)).toBeDefined()
        expect(getByText(main, /ComplyPak Ltd/i)).toBeDefined()
      })

      it('displays special characters in organisation name without HTML entity encoding', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          asPackagingRecyclingNote({
            ...mockIssuedPrn,
            issuedToOrganisation: {
              id: 'producer-1',
              name: "Mackie's Limited"
            }
          })
        )

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Mackie's Limited/)).toBeDefined()
        expect(body.innerHTML).not.toContain('&#39;')
      })

      it('displays tradingName in heading when organisation has no registrationType', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          asPackagingRecyclingNote({
            ...mockIssuedPrn,
            issuedToOrganisation: {
              id: 'producer-1',
              name: 'Legal Name Ltd',
              tradingName: 'Trading Name Ltd'
            }
          })
        )

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Trading Name Ltd/i)).toBeDefined()
        expect(body.innerHTML).not.toContain('>Legal Name Ltd<')
      })

      it('displays legal name for large producers with registrationType', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockIssuedPrn,
          issuedToOrganisation: asIssuedToOrganisation({
            id: 'producer-1',
            name: 'Legal Name Ltd',
            tradingName: 'Trading Name Ltd',
            registrationType: 'LARGE_PRODUCER'
          })
        })

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Legal Name Ltd/i)).toBeDefined()
        expect(body.innerHTML).not.toContain('>Trading Name Ltd<')
      })

      it('displays tradingName for compliance schemes with registrationType', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue({
          ...mockIssuedPrn,
          issuedToOrganisation: asIssuedToOrganisation({
            id: 'scheme-1',
            name: 'Scheme Legal Ltd',
            tradingName: 'Scheme Trading Name',
            registrationType: 'COMPLIANCE_SCHEME'
          })
        })

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /Scheme Trading Name/i)).toBeDefined()
        expect(body.innerHTML).not.toContain('>Scheme Legal Ltd<')
      })

      it('displays PRN number', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PRN number:/i)).toBeDefined()
        expect(getByText(main, /ER2612345A/)).toBeDefined()
      })

      it('displays waste balance updated message', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(
          getByText(main, /Your waste balance has been updated/i)
        ).toBeDefined()
      })

      it('displays View PRN button linking to certificate page in new tab', async ({
        server
      }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const viewButton = getByRole(main, 'button', {
          name: 'View PRN (opens in a new tab)'
        })
        expect(viewButton).toBeDefined()
        expect(viewButton.getAttribute('href')).toBe(viewUrl)
        expect(viewButton.getAttribute('target')).toBe('_blank')
        expect(viewButton.classList.contains('govuk-button--secondary')).toBe(
          true
        )
      })

      it('displays Issue another PRN link', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const issueAnotherLink = getByRole(main, 'link', {
          name: /Issue another PRN/i
        })
        expect(issueAnotherLink).toBeDefined()
        expect(issueAnotherLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays Manage PRNs link', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const managePrnsLink = getByRole(main, 'link', {
          name: /Manage PRNs/i
        })
        expect(managePrnsLink).toBeDefined()
        expect(managePrnsLink.getAttribute('href')).toBe(listUrl)
      })

      it('displays Return to home link', async ({ server }) => {
        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const returnHomeLink = getByRole(main, 'link', {
          name: /Return to home/i
        })
        expect(returnHomeLink).toBeDefined()
        expect(returnHomeLink.getAttribute('href')).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}`
        )
      })

      describe('satisfaction survey', () => {
        const surveyUrl = 'https://survey.example/prn'
        const surveyText =
          'What do you think of this service? (opens in a new tab)'

        const liveSurvey = () => {
          config.set('satisfactionSurvey.isEnabled', true)
          config.set('satisfactionSurvey.prnUrl', surveyUrl)
        }

        afterEach(() => {
          config.reset('satisfactionSurvey.isEnabled')
          config.reset('satisfactionSurvey.prnUrl')
        })

        const getMain = async (server, auth = mockAuth) => {
          const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
            auth
          })

          const { result } = await server.inject({
            method: 'GET',
            url: issuedUrl,
            auth,
            headers: { cookie: csrfCookie }
          })
          const { body } = new JSDOM(result).window.document

          return getByRole(body, 'main')
        }

        it('says nothing about what happens next while the surveys are switched off', async ({
          server
        }) => {
          const main = await getMain(server)

          expect(queryByText(main, surveyText)).toBeNull()
          expect(
            queryByRole(main, 'heading', { name: 'What happens next' })
          ).toBeNull()
        })

        it('asks what the user thinks after managing notes, before sending them home', async ({
          server
        }) => {
          liveSurvey()

          const main = await getMain(server)

          expect(
            queryByRole(main, 'heading', { name: 'What happens next' })
          ).not.toBeNull()
          expect(
            getAllByRole(main, 'link').map((link) => link.textContent?.trim())
          ).toStrictEqual([
            'Issue another PRN',
            'Manage PRNs',
            surveyText,
            'Return to home'
          ])
        })

        it('still asks a user who cannot issue notes', async ({ server }) => {
          liveSurvey()

          const main = await getMain(
            server,
            buildMockAuth(sessionIdentity(IDENTITIES.operatorWithoutWrite))
          )

          expect(
            getAllByRole(main, 'link').map((link) => link.textContent?.trim())
          ).toStrictEqual(['Manage PRNs', surveyText, 'Return to home'])
        })

        it('sends the user to the notes survey, not one from another journey', async ({
          server
        }) => {
          liveSurvey()

          const main = await getMain(server)

          expect(
            getByRole(main, 'link', { name: surveyText }).getAttribute('href')
          ).toBe(surveyUrl)
        })
      })

      it('redirects to view page if PRN not in awaiting_acceptance status', async ({
        server
      }) => {
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(
          asPackagingRecyclingNote({
            ...mockIssuedPrn,
            status: 'awaiting_authorisation'
          })
        )

        const { cookie: csrfCookie } = await getCsrfToken(server, issuedUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: issuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(viewUrl)
      })
    })

    describe('exporter (pern)', () => {
      const pernId = 'pern-123'
      const pernIssuedUrl = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}/packaging-recycling-notes/${pernId}/issued`

      it('displays PERN text for exporter wasteProcessingType', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockIssuedPern)

        const { cookie: csrfCookie } = await getCsrfToken(
          server,
          pernIssuedUrl,
          {
            auth: mockAuth
          }
        )

        const { result } = await server.inject({
          method: 'GET',
          url: pernIssuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        expect(getByText(main, /PERN issued to/i)).toBeDefined()
        expect(getByText(main, /Export Corp/i)).toBeDefined()
      })

      it('displays View PERN button with opens in a new tab text for exporter', async ({
        server
      }) => {
        vi.mocked(getRequiredRegistrationWithAccreditation).mockResolvedValue(
          fixtureExporter
        )
        vi.mocked(fetchPackagingRecyclingNote).mockResolvedValue(mockIssuedPern)

        const { cookie: csrfCookie } = await getCsrfToken(
          server,
          pernIssuedUrl,
          {
            auth: mockAuth
          }
        )

        const { result } = await server.inject({
          method: 'GET',
          url: pernIssuedUrl,
          auth: mockAuth,
          headers: { cookie: csrfCookie }
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document
        const main = getByRole(body, 'main')

        const viewButton = getByRole(main, 'button', {
          name: 'View PERN (opens in a new tab)'
        })
        expect(viewButton).toBeDefined()
        expect(viewButton.getAttribute('target')).toBe('_blank')
      })
    })
  })
})
