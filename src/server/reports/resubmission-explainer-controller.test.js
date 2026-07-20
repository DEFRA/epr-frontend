import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect } from 'vitest'

const CLOSED_PERIOD_FLAG = 'featureFlags.closedPeriodAdjustments'

const mockAuth = buildMockAuth()

const organisationId = 'org-123'
const registrationId = 'reg-001'
const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`
const periodPath = `${reportsUrl}/2026/monthly/2/submissions/2`
const explainerUrl = `${periodPath}/resubmission-explainer`

describe('#resubmissionExplainerController', () => {
  beforeEach(() => {
    config.set(CLOSED_PERIOD_FLAG, true)
  })

  afterEach(() => {
    config.reset(CLOSED_PERIOD_FLAG)
  })

  describe('when the flag is on and it is a resubmission', () => {
    it('should return 200', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render the create-draft caption', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('.govuk-caption-xl').textContent).toContain(
        'Create draft report'
      )
    })

    it('should render the period-specific heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Why your February, 2026 report needs to be resubmitted'
      )
    })

    it('should render a quarterly period label in the heading', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: `${reportsUrl}/2026/quarterly/1/submissions/2/resubmission-explainer`,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('h1').textContent).toContain(
        'Why your Quarter 1, 2026 report needs to be resubmitted'
      )
    })

    it('should render the three explanatory paragraphs', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.textContent).toContain(
        'Your summary log data for this period has been changed since the report was submitted to your regulator.'
      )
      expect(body.textContent).toContain(
        'You need to create a new draft report that an approved person will need to submit in order to remain compliant with the regulations.'
      )
      expect(body.textContent).toContain(
        'Your old February, 2026 report can still be viewed from the reports page until the new report replaces it after submission.'
      )
    })

    it('should render a Continue button linking to the period path', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const button = getByText(body, 'Continue')

      expect(button.closest('a').getAttribute('href')).toBe(periodPath)
    })

    it('should render a Cancel and return to home link to the reports page', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const link = getByText(body, 'Cancel and return to home')

      expect(link.getAttribute('href')).toBe(reportsUrl)
    })

    it('should render a back link to the reports page', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(body.querySelector('.govuk-back-link').getAttribute('href')).toBe(
        reportsUrl
      )
    })
  })

  describe('guards', () => {
    it('should return 404 when the closed-period flag is off', async ({
      server
    }) => {
      config.set(CLOSED_PERIOD_FLAG, false)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: explainerUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 404 for a first submission (not a resubmission)', async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `${reportsUrl}/2026/monthly/2/submissions/1/resubmission-explainer`,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
