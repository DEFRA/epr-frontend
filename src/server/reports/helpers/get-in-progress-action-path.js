import {
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from '../constants.js'

/**
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { CadenceValue } from '../constants.js'
 */

/**
 * Gets the report-flow action path an in-progress report should target.
 * The destination varies by registration type, accreditation and cadence.
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
 * @param {Accreditation | undefined} accreditation
 * @param {CadenceValue} cadence
 * @returns {string}
 */
export const getInProgressActionPath = (
  registration,
  accreditation,
  cadence
) => {
  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)
  const hasAccreditation = !!accreditation

  if (hasAccreditation && isExporter && cadence === CADENCE.MONTHLY) {
    return '/prn-summary'
  }
  if (isReprocessor) {
    return '/tonnes-recycled'
  }
  if (!hasAccreditation && isExporter) {
    return '/tonnes-not-exported'
  }
  return '/supporting-information'
}
