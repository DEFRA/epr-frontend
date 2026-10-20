import { describe, it, expect } from 'vitest'

import {
  buildAccreditationView,
  buildRegistrationView
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { CADENCE } from '../constants.js'
import { getInProgressActionPath } from './get-in-progress-action-path.js'

const exporter = buildRegistrationView()
const reprocessor = buildRegistrationView({
  wasteProcessingType: 'reprocessor'
})
const accreditation = buildAccreditationView()

describe('#getInProgressActionPath', () => {
  it.each([
    {
      scenario: 'accredited-exporter-monthly',
      registration: exporter,
      accreditation,
      cadence: CADENCE.MONTHLY,
      expected: '/prn-summary'
    },
    {
      scenario: 'accredited-exporter-quarterly',
      registration: exporter,
      accreditation,
      cadence: CADENCE.QUARTERLY,
      expected: '/supporting-information'
    },
    {
      scenario: 'registered-only-exporter-monthly',
      registration: exporter,
      accreditation: undefined,
      cadence: CADENCE.MONTHLY,
      expected: '/tonnes-not-exported'
    },
    {
      scenario: 'registered-only-exporter-quarterly',
      registration: exporter,
      accreditation: undefined,
      cadence: CADENCE.QUARTERLY,
      expected: '/tonnes-not-exported'
    },
    {
      scenario: 'reprocessor-without-accreditation',
      registration: reprocessor,
      accreditation: undefined,
      cadence: CADENCE.MONTHLY,
      expected: '/tonnes-recycled'
    },
    {
      scenario: 'reprocessor-with-accreditation',
      registration: reprocessor,
      accreditation,
      cadence: CADENCE.QUARTERLY,
      expected: '/tonnes-recycled'
    }
  ])(
    'returns $expected for $scenario',
    ({ registration, accreditation, cadence, expected }) => {
      expect(
        getInProgressActionPath(registration, accreditation, cadence)
      ).toBe(expected)
    }
  )
})
