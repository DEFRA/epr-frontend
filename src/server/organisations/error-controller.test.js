import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { describe, expect } from 'vitest'

const organisationId = 'org-123'
const errorUrl = `/organisations/${organisationId}/error`

const mockAuth = {
  strategy: 'session',
  credentials: {
    profile: { id: 'user-123', email: 'test@example.com' },
    idToken: 'mock-id-token'
  }
}

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

  it('displays home page link with correct URL', async ({ server }) => {
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
      `/organisations/${organisationId}`
    )
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
