import { describe, expect, it } from 'vitest'

import {
  RETURN_TO_ACCREDITATION,
  RETURN_TO_REGISTERED_ONLY,
  reportReturnPath
} from './report-return-path.js'

const context = {
  organisationId: 'org-1',
  registrationId: 'reg-1',
  year: 2026,
  accreditationId: 'acc-1'
}

describe(reportReturnPath, () => {
  it('returns to the report list when no page named itself', () => {
    expect(reportReturnPath(context)).toBe(
      '/organisations/org-1/registrations/reg-1/reports'
    )
  })

  it('returns to the accreditation the report was opened from', () => {
    expect(
      reportReturnPath({ ...context, from: RETURN_TO_ACCREDITATION })
    ).toBe('/organisations/org-1/registrations/reg-1/accreditations/acc-1')
  })

  it('returns to the report list when the registration has no accreditation', () => {
    expect(
      reportReturnPath({
        ...context,
        accreditationId: undefined,
        from: RETURN_TO_ACCREDITATION
      })
    ).toBe('/organisations/org-1/registrations/reg-1/reports')
  })

  it('returns to the registered-only period the report belongs to', () => {
    expect(
      reportReturnPath({ ...context, from: RETURN_TO_REGISTERED_ONLY })
    ).toBe(
      '/organisations/org-1/registrations/reg-1/registered-only-periods/2026'
    )
  })

  it('reads an unknown destination as the report list rather than a path', () => {
    expect(reportReturnPath({ ...context, from: '../../elsewhere' })).toBe(
      '/organisations/org-1/registrations/reg-1/reports'
    )
  })
})
