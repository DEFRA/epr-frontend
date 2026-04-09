import Boom from '@hapi/boom'

import { CADENCE } from '../constants.js'

/**
 * Validates that the URL cadence matches the expected cadence for the
 * registration type. Accredited registrations must use monthly cadence;
 * registered-only registrations must use quarterly.
 * @param {string} cadence - The cadence from the URL params
 * @param {object | undefined} accreditation - The accreditation object (if any)
 */
export function validateCadenceForRegistration(cadence, accreditation) {
  const expectedCadence = accreditation ? CADENCE.MONTHLY : CADENCE.QUARTERLY

  if (cadence !== expectedCadence) {
    throw Boom.notFound()
  }
}
