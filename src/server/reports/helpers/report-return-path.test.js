import { describe, expect, it } from 'vitest'

import { CADENCE } from '../constants.js'
import { reportReturnPath } from './report-return-path.js'

const context = {
  organisationId: 'org-1',
  registrationId: 'reg-1',
  year: 2026,
  cadence: CADENCE.MONTHLY,
  isRegulator: true,
  accreditationId: 'acc-1'
}

describe(reportReturnPath, () => {
  it('sends an operator to their own report list', () => {
    expect(reportReturnPath({ ...context, isRegulator: false })).toBe(
      '/organisations/org-1/registrations/reg-1/reports'
    )
  })

  it('sends an operator to their own list whatever the cadence', () => {
    expect(
      reportReturnPath({
        ...context,
        isRegulator: false,
        cadence: CADENCE.QUARTERLY
      })
    ).toBe('/organisations/org-1/registrations/reg-1/reports')
  })

  it('sends a regulator reading a monthly report to the accreditation', () => {
    expect(reportReturnPath(context)).toBe(
      '/organisations/org-1/registrations/reg-1/accreditations/acc-1'
    )
  })

  it('sends a regulator reading a quarterly report to the registered-only year', () => {
    expect(reportReturnPath({ ...context, cadence: CADENCE.QUARTERLY })).toBe(
      '/organisations/org-1/registrations/reg-1/registered-only-periods/2026'
    )
  })

  it('sends a regulator to the registration where there is no accreditation to return to', () => {
    expect(reportReturnPath({ ...context, accreditationId: undefined })).toBe(
      '/organisations/org-1/registrations/reg-1'
    )
  })
})
