import { statusCodes } from '#server/common/constants/status-codes.js'
import { getByRole, within } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { describe, expect } from 'vitest'
import { it } from '#vite/fixtures/server.js'

describe('#phaseBanner', () => {
  describe('when viewing any page', () => {
    it('should render the Beta phase banner inside the page header', async ({
      server
    }) => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const { body } = new JSDOM(result).window.document
      const header = getByRole(body, 'banner')

      expect(within(header).getByText('Beta')).toBeDefined()
    })

    it('should render the feedback link inside the phase banner', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const { body } = new JSDOM(result).window.document
      const header = getByRole(body, 'banner')
      const feedbackLink = within(header).getByRole('link', {
        name: /give your feedback by email/i
      })

      expect(feedbackLink.getAttribute('href')).toBe(
        'mailto:eprcustomerservice@defra.gov.uk'
      )
    })
  })
})
