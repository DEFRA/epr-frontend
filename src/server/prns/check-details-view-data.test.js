import { describe, expect, it, vi } from 'vitest'
import { buildCheckDetailsViewData } from './check-details-view-data.js'

const createMockRequest = () => ({
  t: vi.fn((key) => {
    const translations = {
      'prns:checkDetails:prns:pageTitle': 'Check before creating PRN',
      'prns:checkDetails:perns:pageTitle': 'Check before creating PERN',
      'prns:checkDetails:prns:leadParagraph':
        'Check the following information is correct before creating this PRN.',
      'prns:checkDetails:perns:leadParagraph':
        'Check the following information is correct before creating this PERN.',
      'prns:checkDetails:insetText':
        'Any information not shown here will be automatically populated when the PRN is issued.',
      'prns:checkDetails:prns:detailsHeading': 'PRN details',
      'prns:checkDetails:perns:detailsHeading': 'PERN details',
      'prns:checkDetails:recipient':
        'Packaging waste producer or compliance scheme',
      'prns:checkDetails:tonnage': 'Tonnage',
      'prns:checkDetails:tonnageInWords': 'Tonnage in words',
      'prns:checkDetails:processToBeUsed': 'Process to be used',
      'prns:checkDetails:decemberWaste': 'December waste',
      'prns:checkDetails:issuedDate': 'Issued date',
      'prns:checkDetails:issuedBy': 'Issued by',
      'prns:checkDetails:authorisedBy': 'Authorised by',
      'prns:checkDetails:position': 'Position',
      'prns:checkDetails:issuerNotes': 'Issuer notes',
      'prns:checkDetails:notProvided': 'Not provided',
      'prns:checkDetails:accreditationDetailsHeading': 'Accreditation details',
      'prns:checkDetails:material': 'Material',
      'prns:checkDetails:accreditationNumber': 'Accreditation number',
      'prns:checkDetails:accreditationAddress': 'Accreditation address',
      'prns:checkDetails:prns:createButton': 'Create PRN',
      'prns:checkDetails:perns:createButton': 'Create PERN',
      'prns:checkDetails:cancelButton': 'Cancel without saving'
    }
    return translations[key] || key
  })
})

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor-input'
}

const exporterRegistration = {
  id: 'reg-002',
  wasteProcessingType: 'exporter'
}

const mockAccreditation = {
  material: 'Plastic',
  accreditationNumber: '090925',
  address: 'South Road, Liverpool, L22 3DH'
}

describe('#buildCheckDetailsViewData', () => {
  describe('for reprocessor (PRN)', () => {
    it('should return page title and heading with PRN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.pageTitle).toBe('Check before creating PRN')
      expect(result.heading).toBe('Check before creating PRN')
    })

    it('should return lead paragraph with PRN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.leadParagraph).toBe(
        'Check the following information is correct before creating this PRN.'
      )
    })

    it('should return PRN details heading', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.prnDetailsHeading).toBe('PRN details')
    })
  })

  describe('for exporter (PERN)', () => {
    it('should return page title and heading with PERN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: exporterRegistration,
        accreditation: mockAccreditation
      })

      expect(result.pageTitle).toBe('Check before creating PERN')
      expect(result.heading).toBe('Check before creating PERN')
    })

    it('should return lead paragraph with PERN text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: exporterRegistration,
        accreditation: mockAccreditation
      })

      expect(result.leadParagraph).toBe(
        'Check the following information is correct before creating this PERN.'
      )
    })

    it('should return PERN details heading', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: exporterRegistration,
        accreditation: mockAccreditation
      })

      expect(result.prnDetailsHeading).toBe('PERN details')
    })
  })

  describe('common fields', () => {
    it('should return inset text', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.insetText).toBe(
        'Any information not shown here will be automatically populated when the PRN is issued.'
      )
    })

    it('should return accreditation details heading', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.accreditationDetailsHeading).toBe('Accreditation details')
    })
  })

  describe('prn details summary list', () => {
    it('should return 10 rows with correct keys for first 5 fields', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.prnDetails).toHaveLength(10)
      expect(result.prnDetails[0].key.text).toBe(
        'Packaging waste producer or compliance scheme'
      )
      expect(result.prnDetails[1].key.text).toBe('Tonnage')
      expect(result.prnDetails[2].key.text).toBe('Tonnage in words')
      expect(result.prnDetails[3].key.text).toBe('Process to be used')
    })

    it('should return correct keys for remaining fields', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.prnDetails[4].key.text).toBe('December waste')
      expect(result.prnDetails[5].key.text).toBe('Issued date')
      expect(result.prnDetails[6].key.text).toBe('Issued by')
      expect(result.prnDetails[7].key.text).toBe('Authorised by')
      expect(result.prnDetails[8].key.text).toBe('Position')
    })

    it('should return correct key for issuer notes', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.prnDetails[9].key.text).toBe('Issuer notes')
    })

    it('should have width class on all keys', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      result.prnDetails.forEach((row) => {
        expect(row.key.classes).toBe('govuk-!-width-one-half')
      })
    })

    it('should show issuer notes value when provided', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: { issuerNotes: 'Test notes' }
      })

      expect(result.prnDetails[9].value.text).toBe('Test notes')
    })

    it('should show "Not provided" for issuer notes when empty', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: {}
      })

      expect(result.prnDetails[9].value.text).toBe('Not provided')
    })

    it('should populate recipient and tonnage from prnData', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        prnData: {
          issuedToOrganisation: 'Test Company Ltd',
          tonnageValue: 100
        }
      })

      expect(result.prnDetails[0].value.text).toBe('Test Company Ltd')
      expect(result.prnDetails[1].value.text).toBe(100)
    })

    it('should derive tonnageInWords from tonnageValue', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        prnData: { tonnageValue: 150 }
      })

      expect(result.prnDetails[2].value.text).toBe('One hundred and fifty')
    })

    it('should return empty string for tonnageInWords when tonnageValue is missing', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        prnData: {}
      })

      expect(result.prnDetails[2].value.text).toBe('')
    })

    it('should derive processToBeUsed from accreditation material', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        prnData: {}
      })

      expect(result.prnDetails[3].value.text).toBe('R3')
    })

    it('should populate decemberWaste from prnData', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        prnData: {
          decemberWaste: 'Yes'
        }
      })

      expect(result.prnDetails[4].value.text).toBe('Yes')
    })

    it('should populate issuedDate, issuedBy and authorisedBy from prnData', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: {
          issuedDate: '15 March 2026',
          issuedBy: 'Alice Brown',
          authorisedBy: 'Bob Green'
        }
      })

      expect(result.prnDetails[5].value.text).toBe('15 March 2026')
      expect(result.prnDetails[6].value.text).toBe('Alice Brown')
      expect(result.prnDetails[7].value.text).toBe('Bob Green')
    })

    it('should populate position from prnData', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: {
          position: 'Site Manager'
        }
      })

      expect(result.prnDetails[8].value.text).toBe('Site Manager')
    })

    it('should default to empty strings when prnData fields are missing', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: {}
      })

      expect(result.prnDetails[0].value.text).toBe('')
      expect(result.prnDetails[1].value.text).toBe('')
      expect(result.prnDetails[2].value.text).toBe('')
      expect(result.prnDetails[4].value.text).toBe('')
    })

    it('should default remaining fields to empty strings when prnData fields are missing', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation,
        organisationId: 'org-123',
        registrationId: 'reg-001',
        prnData: {}
      })

      expect(result.prnDetails[5].value.text).toBe('')
      expect(result.prnDetails[6].value.text).toBe('')
      expect(result.prnDetails[7].value.text).toBe('')
      expect(result.prnDetails[8].value.text).toBe('')
    })
  })

  describe('accreditation details summary list', () => {
    it('should return 3 rows with correct keys', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.accreditationDetails).toHaveLength(3)
      expect(result.accreditationDetails[0].key.text).toBe('Material')
      expect(result.accreditationDetails[1].key.text).toBe(
        'Accreditation number'
      )
      expect(result.accreditationDetails[2].key.text).toBe(
        'Accreditation address'
      )
    })

    it('should have width class on all keys', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      result.accreditationDetails.forEach((row) => {
        expect(row.key.classes).toBe('govuk-!-width-one-half')
      })
    })

    it('should populate values from accreditation data', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: mockAccreditation
      })

      expect(result.accreditationDetails[0].value.text).toBe('Plastic')
      expect(result.accreditationDetails[1].value.text).toBe('090925')
      expect(result.accreditationDetails[2].value.text).toBe(
        'South Road, Liverpool, L22 3DH'
      )
    })

    it('should handle missing accreditation gracefully', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: undefined
      })

      expect(result.accreditationDetails[0].value.text).toBe('')
      expect(result.accreditationDetails[1].value.text).toBe('')
      expect(result.accreditationDetails[2].value.text).toBe('')
    })

    it('should handle partial accreditation data', () => {
      const result = buildCheckDetailsViewData(createMockRequest(), {
        registration: reprocessorRegistration,
        accreditation: { material: 'Glass' }
      })

      expect(result.accreditationDetails[0].value.text).toBe('Glass')
      expect(result.accreditationDetails[1].value.text).toBe('')
      expect(result.accreditationDetails[2].value.text).toBe('')
    })
  })

  describe('noteType detection', () => {
    it.for([
      { type: 'exporter', expected: true },
      { type: 'reprocessor-input', expected: false },
      { type: 'reprocessor-output', expected: false }
    ])(
      'should detect PERN=$expected for wasteProcessingType=$type',
      ({ type, expected }) => {
        const result = buildCheckDetailsViewData(createMockRequest(), {
          registration: {
            ...reprocessorRegistration,
            wasteProcessingType: type
          },
          accreditation: mockAccreditation,
          organisationId: 'org-123',
          registrationId: 'reg-001'
        })

        const isPern = result.pageTitle.includes('PERN')

        expect(isPern).toBe(expected)
      }
    )
  })
})
