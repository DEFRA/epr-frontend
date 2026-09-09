import { CADENCE } from '../constants.js'

/**
 * @import { CadenceValue } from '../constants.js'
 */

/**
 * Where the report view's back link goes.
 *
 * An operator reads a report from their own list. A regulator reads it from
 * whichever page lists periods of that cadence: monthly ones sit on the
 * accreditation, quarterly ones on the registered-only year. Both are answered
 * by the reader and the report rather than by the address, so a link shared
 * between the two reads correctly for whoever opens it.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   year: number | string,
 *   cadence: CadenceValue,
 *   isRegulator: boolean,
 *   accreditationId?: string
 * }} params
 * @returns {string} unlocalised path
 */
export const reportReturnPath = ({
  organisationId,
  registrationId,
  year,
  cadence,
  isRegulator,
  accreditationId
}) => {
  const registrationPath = `/organisations/${organisationId}/registrations/${registrationId}`

  if (!isRegulator) {
    return `${registrationPath}/reports`
  }

  if (cadence === CADENCE.QUARTERLY) {
    return `${registrationPath}/registered-only-periods/${year}`
  }

  return accreditationId
    ? `${registrationPath}/accreditations/${accreditationId}`
    : registrationPath
}
