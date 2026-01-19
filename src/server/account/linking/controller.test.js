import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { beforeEach, it } from '#vite/fixtures/server.js'
import {
  getAllByRole,
  getByRole,
  getByText,
  within
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

const mockCredentials = {
  profile: {
    id: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

describe('#accountLinkingController', () => {
  describe('csrf protection', () => {
    it('should reject POST request without CSRF token', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/account/linking',
        auth: mockAuth,
        payload: {
          organisationId: 'org-1'
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    it('should reject POST request with invalid CSRF token', async ({
      server
    }) => {
      const { cookie } = await getCsrfToken(server, '/account/linking', {
        auth: mockAuth
      })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/account/linking',
        auth: mockAuth,
        headers: { cookie },
        payload: {
          crumb: 'invalid-token',
          organisationId: 'org-1'
        }
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('get /account/linking', () => {
    const backendUrl = 'http://test-backend'

    beforeAll(() => {
      config.set('eprBackendUrl', backendUrl)
    })

    beforeEach(() => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-id-token' }
      })
    })

    afterAll(() => {
      config.reset('eprBackendUrl')
    })

    describe('when user has no unlinked organisations', () => {
      beforeEach(({ msw }) => {
        msw.use(
          http.get(`${backendUrl}/v1/me/organisations`, () => {
            return HttpResponse.json({
              organisations: {
                current: {
                  id: 'defra-org-123',
                  name: 'My Defra Organisation',
                  relationshipId: 'rel-456'
                },
                linked: null,
                unlinked: []
              }
            })
          })
        )
      })

      it('should redirect to email-not-recognised page', async ({ server }) => {
        const { statusCode, headers } = await server.inject({
          method: 'GET',
          url: '/account/linking',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe('/email-not-recognised')
      })
    })

    describe('when user has unlinked organisations', () => {
      beforeEach(({ msw }) => {
        msw.use(
          http.get(`${backendUrl}/v1/me/organisations`, () => {
            return HttpResponse.json({
              organisations: {
                current: {
                  id: 'defra-org-123',
                  name: 'My Defra Organisation',
                  relationshipId: 'rel-456'
                },
                linked: null,
                unlinked: [
                  { id: 'org-1', name: 'First Company', orgId: 'FC111111' },
                  { id: 'org-2', name: 'Second Company', orgId: 'SC222222' },
                  { id: 'org-3', name: 'Third Company', orgId: 'TC333333' }
                ]
              }
            })
          })
        )
      })

      it('should render page with correct title, heading and submit button', async ({
        server
      }) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/account/linking',
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body, title } = dom.window.document

        expect(title).toMatch(/^Registration Linking \|/)
        expect(statusCode).toBe(statusCodes.ok)

        const main = getByRole(body, 'main')
        const heading = getByRole(main, 'heading', { level: 1 })

        expect(heading.textContent).toContain('My Defra Organisation')

        const submitButton = getByRole(main, 'button', { name: /Confirm/i })

        expect(submitButton).toBeDefined()
      })

      it('should render radio button for each organisation sorted alphabetically', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: '/account/linking',
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const main = getByRole(body, 'main')

        expect(
          getByRole(main, 'group', {
            name: 'Select the registration to link to My Defra Organisation'
          })
        ).toBeDefined()

        const radios = getAllByRole(main, 'radio')

        expect(radios).toHaveLength(3)
        expect(radios[0].labels[0].textContent).toContain(
          'First Company (ID: FC111111)'
        )
        expect(radios[1].labels[0].textContent).toContain(
          'Second Company (ID: SC222222)'
        )
        expect(radios[2].labels[0].textContent).toContain(
          'Third Company (ID: TC333333)'
        )
      })

      it('should render troubleshooting panel with organisation list', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: '/account/linking',
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const main = getByRole(body, 'main')
        const details = main.querySelector('details')

        /* eslint-disable vitest/max-expects */

        expect(
          getByText(details, 'Problems linking a registration?')
        ).toBeDefined()

        const detailsContent = within(details)

        expect(
          detailsContent.getByRole('heading', {
            level: 2,
            name: 'If the relevant registration is missing'
          })
        ).toBeDefined()
        expect(
          detailsContent.getByRole('heading', {
            level: 2,
            name: 'If you have any other problems'
          })
        ).toBeDefined()

        const emailLink = detailsContent.getByRole('link')

        expect(emailLink.getAttribute('href')).toBe(
          'mailto:eprcustomerservice@defra.gov.uk'
        )

        const list = detailsContent.getByRole('list')
        const listItems = within(list).getAllByRole('listitem')

        expect(listItems[0].textContent).toBe('First Company - org-1')
        expect(listItems[1].textContent).toBe('Second Company - org-2')
        expect(listItems[2].textContent).toBe('Third Company - org-3')

        /* eslint-enable vitest/max-expects */
      })
    })
  })
})
