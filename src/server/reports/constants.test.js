import { describe, expect, it } from 'vitest'

import {
  IS_CLOSED_PERIOD_ADJUSTMENT_STATUS,
  SUBMISSION_STATUS
} from './constants.js'

describe('#reports constants', () => {
  describe('#IS_CLOSED_PERIOD_ADJUSTMENT_STATUS', () => {
    it('classifies every submission status', () => {
      const classified = Object.keys(IS_CLOSED_PERIOD_ADJUSTMENT_STATUS).sort()
      const statuses = Object.values(SUBMISSION_STATUS).sort()

      expect(classified).toStrictEqual(statuses)
    })

    it('gates only requires_resubmission behind the flag', () => {
      const gated = Object.entries(IS_CLOSED_PERIOD_ADJUSTMENT_STATUS)
        .filter(([, isGated]) => isGated)
        .map(([status]) => status)

      expect(gated).toStrictEqual([SUBMISSION_STATUS.REQUIRES_RESUBMISSION])
    })
  })
})
