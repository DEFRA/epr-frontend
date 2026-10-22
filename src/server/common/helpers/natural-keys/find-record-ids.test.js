import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { findRecordIds } from './find-record-ids.js'

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-1'

const organisation = {
  id: organisationId,
  orgId: 500118,
  registrations: [
    {
      id: registrationId,
      registrationNumber: toRegistrationNumber('R25SR500030912PA'),
      accreditationId: 'acc-1',
      material: 'glass'
    }
  ],
  accreditations: []
}

const keys = {
  organisationNumber: toOrganisationNumber('500118'),
  registrationNumber: toRegistrationNumber('R25SR500030912PA')
}

const organisationUrl = `${backendUrl}/v1/organisations/${organisationId}`

const organisationHeld = () =>
  http.get(organisationUrl, () => HttpResponse.json(organisation))

const unresolved = expect.objectContaining({
  output: expect.objectContaining({ statusCode: statusCodes.notFound }),
  code: errorCodes.recordKeyUnresolved
})

describe(findRecordIds, () => {
  const operator = buildMockAuth({
    linkedOrganisationId: organisationId
  }).credentials

  it('returns the ids and material for the linked organisation', async ({
    msw
  }) => {
    msw.use(organisationHeld())

    await expect(findRecordIds(keys, operator)).resolves.toStrictEqual({
      organisationId,
      registrationId,
      material: 'glass'
    })
  })

  // The msw fixture fails any request it has no handler for, so this also
  // proves no backend request was made.
  it('is a 404 without a linked organisation', async () => {
    await expect(
      findRecordIds(keys, buildMockAuth().credentials)
    ).rejects.toThrow(unresolved)
  })

  it("is a 404 when the linked organisation's number differs from the URL's", async ({
    msw
  }) => {
    msw.use(organisationHeld())

    await expect(
      findRecordIds(
        { ...keys, organisationNumber: toOrganisationNumber('500999') },
        operator
      )
    ).rejects.toThrow(unresolved)
  })

  it('is a 404 for an unknown registration number', async ({ msw }) => {
    msw.use(organisationHeld())

    await expect(
      findRecordIds(
        { ...keys, registrationNumber: toRegistrationNumber('R99XX') },
        operator
      )
    ).rejects.toThrow(unresolved)
  })

  it('lets a backend error through', async ({ msw }) => {
    msw.use(
      http.get(
        organisationUrl,
        () =>
          new HttpResponse(null, { status: statusCodes.internalServerError })
      )
    )

    await expect(findRecordIds(keys, operator)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({
          statusCode: statusCodes.internalServerError
        })
      })
    )
  })
})
