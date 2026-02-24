import { describe, expect, it } from 'vitest'
import { mapToSelectOptions } from './map-to-select-options.js'

describe('#mapToSelectOptions', () => {
  it('should sort options alphabetically by display text', () => {
    const unsortedOrganisations = [
      {
        id: 'zebra-id',
        name: 'Zebra Corp',
        tradingName: null,
        address: {
          addressLine1: '1 Zoo Lane',
          town: 'London',
          postcode: 'Z1 1ZZ'
        }
      },
      {
        id: 'alpha-id',
        name: 'Alpha Ltd',
        tradingName: null,
        address: {
          addressLine1: '1 First St',
          town: 'Bristol',
          postcode: 'A1 1AA'
        }
      },
      {
        id: 'middle-id',
        name: 'Middle Inc',
        tradingName: null,
        address: {
          addressLine1: '1 Mid Road',
          town: 'Leeds',
          postcode: 'M1 1MM'
        }
      }
    ]

    const result = mapToSelectOptions(unsortedOrganisations)

    expect(result).toStrictEqual([
      { value: 'alpha-id', text: 'Alpha Ltd, 1 First St, Bristol, A1 1AA' },
      { value: 'middle-id', text: 'Middle Inc, 1 Mid Road, Leeds, M1 1MM' },
      { value: 'zebra-id', text: 'Zebra Corp, 1 Zoo Lane, London, Z1 1ZZ' }
    ])
  })

  it('should use tradingName for compliance schemes', () => {
    const organisations = [
      {
        id: 'org-1',
        name: 'Legal Name Ltd',
        tradingName: 'Trading As Name',
        address: {
          addressLine1: '1 High St',
          town: 'London',
          postcode: 'W1 1AA'
        },
        registrationType: 'COMPLIANCE_SCHEME'
      }
    ]

    const result = mapToSelectOptions(organisations)

    expect(result[0].text).toBe('Trading As Name, 1 High St, London, W1 1AA')
  })

  it('should use name for large producers even when tradingName is set', () => {
    const organisations = [
      {
        id: 'org-1',
        name: 'Legal Producer Ltd',
        tradingName: 'Producer Trading Name',
        address: {
          addressLine1: '1 High St',
          town: 'London',
          postcode: 'W1 1AA'
        },
        registrationType: 'LARGE_PRODUCER'
      }
    ]

    const result = mapToSelectOptions(organisations)

    expect(result[0].text).toBe('Legal Producer Ltd, 1 High St, London, W1 1AA')
  })

  it('should filter out empty address fields', () => {
    const organisations = [
      {
        id: 'org-1',
        name: 'Test Org',
        tradingName: null,
        address: {
          addressLine1: '1 High St',
          addressLine2: null,
          town: 'London',
          county: '',
          postcode: 'W1 1AA',
          country: undefined
        }
      }
    ]

    const result = mapToSelectOptions(organisations)

    expect(result[0].text).toBe('Test Org, 1 High St, London, W1 1AA')
  })

  it('should return empty array for empty input', () => {
    const result = mapToSelectOptions([])

    expect(result).toStrictEqual([])
  })
})
