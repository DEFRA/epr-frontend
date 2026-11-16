import { statusCodes } from '#server/common/constants/status-codes.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { describe, expect } from 'vitest'

const organisationNumber = '500123'
const errorUrl = `/organisations/${organisationNumber}/2025/error`

const mockAuth = buildMockAuth()

describe('#errorController', () => {
  it('displays Something has gone wrong heading', async ({ server }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: errorUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.ok)

    const dom = new JSDOM(result)
    const { body } = dom.window.document
    const main = getByRole(body, 'main')

    expect(getByText(main, /Something has gone wrong/i)).toBeDefined()
  })

  it('links home to the year the failed action was in', async ({ server }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: errorUrl,
      auth: mockAuth
    })

    const dom = new JSDOM(result)
    const { body } = dom.window.document
    const main = getByRole(body, 'main')
    const homeLink = getByText(main, /home page/i)

    expect(homeLink.closest('a').getAttribute('href')).toBe(
      `/organisations/${organisationNumber}/2025`
    )
  })

  it('keeps the year on the header home link', async ({ server }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: errorUrl,
      auth: buildMockAuth({
        linkedOrganisationNumber: toOrganisationNumber(organisationNumber)
      })
    })

    const { body } = new JSDOM(result).window.document
    const header = getByRole(body, 'banner')

    expect(
      getByRole(header, 'link', { name: 'Home' }).getAttribute('href')
    ).toBe(`/organisations/${organisationNumber}/2025`)
  })

  it('displays contact details with mailto link', async ({ server }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: errorUrl,
      auth: mockAuth
    })

    const dom = new JSDOM(result)
    const { body } = dom.window.document
    const main = getByRole(body, 'main')

    const emailLink = main.querySelector(
      'a[href="mailto:eprcustomerservice@defra.gov.uk"]'
    )
    expect(emailLink).not.toBeNull()
    expect(getByText(main, /0300 060 0002/i)).toBeDefined()
  })

  it('displays explanation of possible causes', async ({ server }) => {
    const { result } = await server.inject({
      method: 'GET',
      url: errorUrl,
      auth: mockAuth
    })

    const dom = new JSDOM(result)
    const { body } = dom.window.document
    const main = getByRole(body, 'main')

    expect(getByText(main, /someone else from your business/i)).toBeDefined()
  })
})
