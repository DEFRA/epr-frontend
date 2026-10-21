import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { findOrganisationById } from './find-organisation.js'

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

  it.for([statusCodes.unauthorized, statusCodes.internalServerError])(
    'throws when the backend answers %i',
    async (status, { msw }) => {
      msw.use(organisationRefused(status))

      await expect(
        findOrganisationById(organisationId, 'token')
      ).rejects.toThrow(
        expect.objectContaining({
          output: expect.objectContaining({ statusCode: status })
        })
      )
    }
  )
})
