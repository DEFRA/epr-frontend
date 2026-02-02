import { describe, it, expect } from 'vitest'
import { fetchPrn } from './fetch-prn.js'

describe('#fetchPrn', () => {
  it('returns dummy PRN data with correct prnNumber', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'ER2625468U')

    expect(result.prnNumber).toBe('ER2625468U')
  })

  it('returns dummy PRN data with expected fields', async () => {
    const result = await fetchPrn('org-123', 'acc-456', 'ER2625468U')

    expect(result).toStrictEqual({
      prnNumber: 'ER2625468U',
      issuedToOrganisation: 'Acme Packaging Solutions Ltd',
      issuedByOrganisation: 'John Smith Ltd',
      issuedDate: '',
      issuerNotes:
        'retrieved from /v1/organisations/org-123/accreditations/acc-456/prns/ER2625468U',
      tonnageValue: 150,
      isDecemberWaste: 'No',
      authorisedBy: '',
      position: ''
    })
  })

  it('includes API path in issuerNotes', async () => {
    const result = await fetchPrn('org-999', 'acc-888', 'ER1111111A')

    expect(result.issuerNotes).toBe(
      'retrieved from /v1/organisations/org-999/accreditations/acc-888/prns/ER1111111A'
    )
  })
})
