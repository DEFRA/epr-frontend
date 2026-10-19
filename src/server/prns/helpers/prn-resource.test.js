import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { describe, expect, it } from 'vitest'
import { prnsPath, toPackagingRecyclingNote } from './prn-resource.js'

describe(prnsPath, () => {
  it('addresses the accreditation PRN collection by natural keys', () => {
    expect(
      prnsPath({
        organisationNumber: '500123',
        registrationNumber: 'R26EN0000000001PL',
        year: '2026'
      })
    ).toBe(
      '/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes'
    )
  })
})

describe(toPackagingRecyclingNote, () => {
  it('reads a draft with no number, notes or issue as null', () => {
    expect(toPackagingRecyclingNote(buildPrnResource())).toStrictEqual({
      id: 'prn-789',
      prnNumber: null,
      issuedToOrganisation: { id: 'producer-1', name: 'Acme Packaging Ltd' },
      tonnage: 100,
      material: 'plastic',
      status: 'draft',
      createdAt: '2026-01-15T10:00:00.000Z',
      notes: null,
      isDecemberWaste: false,
      wasteProcessingType: 'reprocessor',
      processToBeUsed: 'R3',
      accreditationYear: 2026,
      issuedAt: null,
      issuedBy: null
    })
  })

  it('reads an issued PRN with its number, notes and issuer', () => {
    const note = toPackagingRecyclingNote(
      buildPrnResource({
        status: { current: 'awaiting_acceptance', timeline: [] },
        prnNumber: 'ER2625001A',
        notes: 'Some notes',
        issued: {
          at: '2026-01-16T14:30:00.000Z',
          by: { name: 'John Smith' }
        }
      })
    )

    expect(note).toMatchObject({
      status: 'awaiting_acceptance',
      prnNumber: 'ER2625001A',
      notes: 'Some notes',
      issuedAt: '2026-01-16T14:30:00.000Z',
      issuedBy: { name: 'John Smith' }
    })
  })
})
