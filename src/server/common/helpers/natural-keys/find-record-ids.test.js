import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'

import { findRecordIds } from './find-record-ids.js'

const backendUrl = config.get('eprBackendUrl')

const organisationId = '6507f1f77bcf86cd79943901'
const registrationId = 'reg-1'
const accreditationId = 'acc-1'

const registration = {
  id: registrationId,
  registrationNumber: 'R25SR500030912PA',
  accreditationId,
  material: 'glass'
}

const organisation = {
  id: organisationId,
  orgId: 500118,
  registrations: [registration],
  accreditations: [
    {
      id: accreditationId,
      accreditationNumber: 'A26ER5001180114GL',
      validFrom: '2026-01-01'
    }
  ]
}

const keys = {
  organisationNumber: '500118',
  registrationNumber: 'R25SR500030912PA',
  year: '2026'
}

const organisationHeld = () =>
  http.get(`${backendUrl}/v1/organisations/${organisationId}`, () =>
    HttpResponse.json(organisation)
  )

const found = {
  organisationId,
  registrationId,
  accreditationId,
  registration
}

const unresolved = expect.objectContaining({
  output: expect.objectContaining({ statusCode: statusCodes.notFound }),
  code: errorCodes.recordKeyUnresolved
})

describe('findRecordIds for an operator', () => {
  const operator = buildMockAuth({
    linkedOrganisationId: organisationId
  }).credentials

  it('returns the ids and registration for their own organisation', async ({
    msw
  }) => {
    msw.use(organisationHeld())

    await expect(findRecordIds(keys, operator)).resolves.toStrictEqual(found)
  })

  it("is a 404 for another organisation's number", async ({ msw }) => {
    msw.use(organisationHeld())

    await expect(
      findRecordIds({ ...keys, organisationNumber: '500999' }, operator)
    ).rejects.toThrow(unresolved)
  })

  it('is a 404 for an unknown registration number', async ({ msw }) => {
    msw.use(organisationHeld())

    await expect(
      findRecordIds({ ...keys, registrationNumber: 'R99XX' }, operator)
    ).rejects.toThrow(unresolved)
  })

  it("is a 404 for a year that isn't the accreditation's", async ({ msw }) => {
    msw.use(organisationHeld())

    await expect(
      findRecordIds({ ...keys, year: '2025' }, operator)
    ).rejects.toThrow(unresolved)
  })

  it('lets a backend error through', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/${organisationId}`,
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

describe('findRecordIds for a regulator', () => {
  const regulator = buildMockAuth({
    ...sessionIdentity(IDENTITIES.regulator)
  }).credentials

  beforeAll(() => {
    config.set('featureFlags.regulatorAccess', true)
  })

  afterAll(() => {
    config.set('featureFlags.regulatorAccess', false)
  })

  it('returns the ids and registration through search', async ({ msw }) => {
    msw.use(
      http.get(`${backendUrl}/v1/organisations`, () =>
        HttpResponse.json({
          items: [{ id: organisationId, orgId: 500118 }],
          page: 1,
          pageSize: 1
        })
      ),
      organisationHeld()
    )

    await expect(findRecordIds(keys, regulator)).resolves.toStrictEqual(found)
  })
})
