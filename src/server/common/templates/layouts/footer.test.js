import { statusCodes } from '#server/common/constants/status-codes.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('#footer', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('when viewing any page', () => {
    it('should render the footer', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      expect(statusCode).toBe(statusCodes.ok)

      const $ = load(result)
      const footer = $('footer.govuk-footer')

      expect(footer).toHaveLength(1)
    })

    it('should render the Get help section with heading', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const heading = $('.govuk-footer__meta h2.govuk-heading-s')

      expect(heading.text()).toBe('Get help')
    })

    it('should render the customer service email as a mailto link', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const emailLink = $(
        '.govuk-footer a[href="mailto:eprcustomerservice@defra.gov.uk"]'
      )

      expect(emailLink).toHaveLength(1)
      expect(emailLink.text()).toBe('eprcustomerservice@defra.gov.uk')
    })

    it('should render the phone number', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const footerText = $('.govuk-footer__meta').text()

      expect(footerText).toContain('0300 060 0002')
    })

    it('should render the opening hours', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const footerText = $('.govuk-footer__meta').text()

      expect(footerText).toContain('Monday to Friday, 8am to 4:30pm')
    })

    it('should render the Contact link pointing to /contact', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const contactLink = $('.govuk-footer__inline-list a').filter(
        (_, el) => $(el).text().trim() === 'Contact'
      )

      expect(contactLink).toHaveLength(1)
      expect(contactLink.attr('href')).toBe('/contact')
    })

    it('should render the Privacy link pointing to GOV.UK privacy policy', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const privacyLink = $('.govuk-footer__inline-list a').filter(
        (_, el) => $(el).text().trim() === 'Privacy'
      )

      expect(privacyLink).toHaveLength(1)
      expect(privacyLink.attr('href')).toBe(
        'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-privacy-policy'
      )
    })

    it('should render the Cookies link pointing to /cookies', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const cookiesLink = $('.govuk-footer__inline-list a').filter(
        (_, el) => $(el).text().trim() === 'Cookies'
      )

      expect(cookiesLink).toHaveLength(1)
      expect(cookiesLink.attr('href')).toBe('/cookies')
    })

    it('should render the Accessibility statement link pointing to GOV.UK', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const accessibilityLink = $('.govuk-footer__inline-list a').filter(
        (_, el) => $(el).text().trim() === 'Accessibility statement'
      )

      expect(accessibilityLink).toHaveLength(1)
      expect(accessibilityLink.attr('href')).toBe(
        'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-accessibility-statement'
      )
    })

    it('should render the OGL license link', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const oglLink = $(
        'a[href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"]'
      )

      expect(oglLink).toHaveLength(1)
      expect(oglLink.text()).toBe('Open Government Licence v3.0')
    })

    it('should render the Crown copyright link', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)
      const crownCopyrightLink = $(
        'a[href="https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/"]'
      )

      expect(crownCopyrightLink).toHaveLength(1)
      expect(crownCopyrightLink.text()).toContain('Crown copyright')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
