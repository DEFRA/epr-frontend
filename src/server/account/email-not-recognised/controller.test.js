import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { load } from 'cheerio'
import { describe, expect } from 'vitest'

const mockAuth = {
  strategy: 'session',
  credentials: {
    profile: {
      id: 'user-123',
      email: 'test@example.com'
    },
    idToken: 'mock-id-token'
  }
}

describe('#emailNotRecognisedController', () => {
  it('should render email-not-recognised page with correct content', async ({
    server
  }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/email-not-recognised',
      auth: mockAuth
    })

    const $ = load(result)

    expect($('title').text().trim()).toStrictEqual(
      expect.stringMatching(/^We do not recognise your email address \|/)
    )
    expect($('h1.govuk-heading-xl').text().trim()).toBe(
      'We do not recognise your email address'
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  it('should display all required content sections', async ({ server }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/email-not-recognised',
      auth: mockAuth
    })

    const $ = load(result)

    // Check for main content paragraphs
    const paragraphs = $('p.govuk-body')

    expect(paragraphs.length).toBeGreaterThanOrEqual(3)

    // Check for bullet list
    expect($('ul.govuk-list--bullet')).toHaveLength(1)
    expect($('ul.govuk-list--bullet li')).toHaveLength(3)
  })

  it('should display correct list item content and contact link', async ({
    server
  }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/email-not-recognised',
      auth: mockAuth
    })

    const $ = load(result)

    // Check that list items contain expected text
    const firstItem = $('ul.govuk-list--bullet li').eq(0).text().trim()
    const secondItem = $('ul.govuk-list--bullet li').eq(1).text().trim()

    expect(firstItem).toContain("check that you've signed in")
    expect(secondItem).toContain('ask someone who was named')

    // Check for contact link in the third list item
    const thirdItem = $('ul.govuk-list--bullet li').eq(2)
    const link = thirdItem.find('a.govuk-link')

    expect(link).toHaveLength(1)
    expect(link.text()).toMatch(/contact your regulator/)
    expect(link.attr('href')).toBe(
      'https://www.gov.uk/guidance/packaging-waste-apply-for-registration-and-accreditation-as-a-reprocessor-or-exporter#get-helpand-give-feedback'
    )
  })

  it('should display page regardless of auth state', async ({ server }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/email-not-recognised'
    })

    expect(statusCode).toBe(statusCodes.ok)
  })
})
