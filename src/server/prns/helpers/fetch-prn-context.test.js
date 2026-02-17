import { describe, expect, it } from 'vitest'

import { buildPrnBasePath, getSafePathSegment } from './fetch-prn-context.js'

describe('#buildPrnBasePath', () => {
  it('returns expected route for valid path segments', () => {
    const result = buildPrnBasePath({
      organisationId: 'org-123',
      registrationId: 'reg_456',
      accreditationId: 'acc.789~test'
    })

    expect(result).toBe(
      '/organisations/org-123/registrations/reg_456/accreditations/acc.789~test/packaging-recycling-notes'
    )
  })

  it.each([
    { organisationId: '', registrationId: 'reg-1', accreditationId: 'acc-1' },
    {
      organisationId: 'org-1',
      registrationId: '../reg-1',
      accreditationId: 'acc-1'
    },
    {
      organisationId: 'org-1',
      registrationId: 'reg-1',
      accreditationId: 'acc-1/unsafe'
    },
    {
      organisationId: 'org-1',
      registrationId: 'reg-1',
      accreditationId: 'acc-1\\unsafe'
    }
  ])('throws for invalid path segment set %#', (params) => {
    expect(() => buildPrnBasePath(params)).toThrowError('Invalid')
  })
})

describe('#getSafePathSegment', () => {
  it('returns value for safe path segments', () => {
    expect(getSafePathSegment('org-123', 'organisationId')).toBe('org-123')
    expect(getSafePathSegment('reg_456', 'registrationId')).toBe('reg_456')
    expect(getSafePathSegment('acc.789~test', 'accreditationId')).toBe(
      'acc.789~test'
    )
  })

  it.each([
    ['', 'organisationId'],
    ['../path', 'registrationId'],
    ['path/with/slash', 'accreditationId'],
    ['path\\with\\backslash', 'prnId'],
    ['path with spaces', 'organisationId']
  ])('throws for invalid segment: %s', (value, fieldName) => {
    expect(() => getSafePathSegment(value, fieldName)).toThrowError('Invalid')
  })
})
