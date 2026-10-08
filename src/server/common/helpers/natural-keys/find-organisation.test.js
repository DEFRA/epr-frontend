import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

import {
  findOrganisationById,
  findOrganisationByNumber
} from './find-organisation.js'

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const organisation = { id: organisationId, orgId: 500118 }
const organisationUrl = `${backendUrl}/v1/organisations/${organisationId}`

const organisationHeld = () =>
  http.get(organisationUrl, () => HttpResponse.json(organisation))

/**
 * @param {number} status
 */
const organisationRefused = (status) =>
  http.get(organisationUrl, () => new HttpResponse(null, { status }))

describe(findOrganisationById, () => {
  it('returns the organisation', async ({ msw }) => {
    msw.use(organisationHeld())

    await expect(
      findOrganisationById(organisationId, 'token')
    ).resolves.toStrictEqual(organisation)
  })

  it.for([statusCodes.forbidden, statusCodes.notFound])(
    'finds nothing when the backend answers %i',
    async (status, { msw }) => {
      msw.use(organisationRefused(status))

      await expect(
        findOrganisationById(organisationId, 'token')
      ).resolves.toBeNull()
    }
  )

  it('throws when the backend fails', async ({ msw }) => {
    msw.use(organisationRefused(statusCodes.internalServerError))

    await expect(findOrganisationById(organisationId, 'token')).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: statusCodes.internalServerError
        })
      })
    )
  })
})

describe('findOrganisationByNumber for an operator', () => {
  const operator = buildMockAuth({
    linkedOrganisationId: organisationId
  }).credentials

  it('returns their own organisation', async ({ msw }) => {
    msw.use(organisationHeld())

    await expect(
      findOrganisationByNumber('500118', operator)
    ).resolves.toStrictEqual(organisation)
  })

  // The msw fixture fails any request it has no handler for, so this also
  // proves no organisation search was made.
  it('finds nothing by another organisation number', async ({ msw }) => {
    msw.use(organisationHeld())

    await expect(
      findOrganisationByNumber('500999', operator)
    ).resolves.toBeNull()
  })

  it('finds nothing when their own organisation is refused', async ({
    msw
  }) => {
    msw.use(organisationRefused(statusCodes.forbidden))

    await expect(
      findOrganisationByNumber('500118', operator)
    ).resolves.toBeNull()
  })

  it('finds nothing without a linked organisation', async () => {
    await expect(
      findOrganisationByNumber('500118', buildMockAuth().credentials)
    ).resolves.toBeNull()
  })
})

describe('findOrganisationByNumber for a regulator', () => {
  const regulator = buildMockAuth({
    ...sessionIdentity(IDENTITIES.regulator)
  }).credentials

  const searchUrl = `${backendUrl}/v1/organisations`

  /**
   * @param {object[]} items
   */
  const searchFinds = (items) =>
    http.get(searchUrl, ({ request }) => {
      const query = new URL(request.url).searchParams

      return query.get('orgId') === '500118' &&
        query.get('page') === '1' &&
        query.get('pageSize') === '1'
        ? HttpResponse.json({ items, page: 1, pageSize: 1 })
        : new HttpResponse(null, { status: statusCodes.badRequest })
    })

  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('finds the organisation by its number', async ({ msw }) => {
    msw.use(
      searchFinds([{ id: organisationId, orgId: 500118 }]),
      organisationHeld()
    )

    await expect(
      findOrganisationByNumber('500118', regulator)
    ).resolves.toStrictEqual(organisation)
  })

  it('finds nothing when no organisation has the number', async ({ msw }) => {
    msw.use(searchFinds([]))

    await expect(
      findOrganisationByNumber('500118', regulator)
    ).resolves.toBeNull()
  })

  it('finds nothing when the search is refused', async ({ msw }) => {
    msw.use(
      http.get(
        searchUrl,
        () => new HttpResponse(null, { status: statusCodes.forbidden })
      )
    )

    await expect(
      findOrganisationByNumber('500118', regulator)
    ).resolves.toBeNull()
  })

  it('throws when the search fails', async ({ msw }) => {
    msw.use(
      http.get(
        searchUrl,
        () =>
          new HttpResponse(null, { status: statusCodes.internalServerError })
      )
    )

    await expect(findOrganisationByNumber('500118', regulator)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: statusCodes.internalServerError
        })
      })
    )
  })
})
