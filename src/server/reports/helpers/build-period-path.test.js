import { describe, expect, it } from 'vitest'

import { CADENCE } from '../constants.js'
import { buildPeriodPath } from './build-period-path.js'

/** @import { ReportingPeriod } from './fetch-reporting-periods.js' */

/**
 * @param {Partial<ReportingPeriod>} [overrides]
 * @returns {ReportingPeriod}
 */
const aPeriod = (overrides) =>
  /** @type {ReportingPeriod} */ (
    /** @type {unknown} */ ({
      year: 2026,
      period: 8,
      submissionNumber: 1,
      ...overrides
    })
  )

describe(buildPeriodPath, () => {
  it('addresses a monthly period by its month and submission', () => {
    expect(
      buildPeriodPath({
        organisationId: 'org-1',
        registrationId: 'reg-2',
        period: aPeriod(),
        cadence: CADENCE.MONTHLY
      })
    ).toBe(
      '/organisations/org-1/registrations/reg-2/reports/2026/monthly/8/submissions/1'
    )
  })

  it('addresses a quarterly period by its quarter and submission', () => {
    expect(
      buildPeriodPath({
        organisationId: 'org-1',
        registrationId: 'reg-2',
        period: aPeriod({ period: 3, submissionNumber: 2 }),
        cadence: CADENCE.QUARTERLY
      })
    ).toBe(
      '/organisations/org-1/registrations/reg-2/reports/2026/quarterly/3/submissions/2'
    )
  })
})
