import { statusCodes } from '#server/common/constants/status-codes.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('#contactController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('when navigating to /contact', () => {
    it('should return 200 status code', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/contact'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render the contact page with correct title', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/contact'
      })

      const $ = load(result)

      expect($('title').text().trim()).toStrictEqual(
        expect.stringMatching(/^Contact \|/)
      )
    })

    it('should render the page heading', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/contact'
      })

      const $ = load(result)

      expect($('h1').text()).toBe('Contact')
    })

    it('should render the subheading', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/contact'
      })

      const $ = load(result)

      expect($('.govuk-body-l').text()).toBe(
        'For questions about your summary log, registration or accreditation'
      )
    })

    it('should render all regulator sections', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/contact'
      })

      const $ = load(result)
      const headings = $('h2.govuk-heading-s')
        .map((_, el) => $(el).text())
        .get()

      expect(headings).toContain('Environment Agency')
      expect(headings).toContain('Natural Resources Wales')
      expect(headings).toContain('Scottish Environment Protection Agency')
      expect(headings).toContain('Northern Ireland Environment Agency')
      expect(headings).toContain('For help with this digital service')
    })

    it('should render mailto links for all email addresses', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/contact'
      })

      const $ = load(result)
      const mailtoLinks = $('a[href^="mailto:"]')
        .map((_, el) => $(el).attr('href'))
        .get()

      expect(mailtoLinks).toContain(
        'mailto:packaging@environment-agency.gov.uk'
      )
      expect(mailtoLinks).toContain(
        'mailto:packaging@naturalresourceswales.gov.uk'
      )
      expect(mailtoLinks).toContain(
        'mailto:producer.responsibility@sepa.org.uk'
      )
      expect(mailtoLinks).toContain('mailto:repackaging@daera-ni.gov.uk')
      expect(mailtoLinks).toContain('mailto:eprcustomerservice@defra.gov.uk')
    })

    it('should render call charges links', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/contact'
      })

      const $ = load(result)
      const callChargesLinks = $('a[href="https://www.gov.uk/call-charges"]')

      expect(callChargesLinks).toHaveLength(2)
      expect(callChargesLinks.first().text()).toBe(
        'Find information on call charges'
      )
    })
  })

  describe('when navigating to /cy/contact (Welsh)', () => {
    it('should return 200 status code', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/cy/contact'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
