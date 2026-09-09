/**
 * Where the report view's back link goes.
 *
 * A submitted report is reachable from the operator's report list, from a
 * regulator's accreditation page and from a registered-only period, so the
 * page that opened it names itself in a `from` parameter. The parameter
 * selects a destination rather than supplying one — no part of it reaches the
 * path — and an accreditation the registration does not have falls back to
 * the report list.
 */
export const RETURN_TO_ACCREDITATION = 'accreditation'
export const RETURN_TO_REGISTERED_ONLY = 'registered-only'

/**
 * @param {{ from?: unknown, accreditationId?: string, year: number | string }} params
 * @returns {string}
 */
const suffix = ({ from, accreditationId, year }) => {
  if (from === RETURN_TO_ACCREDITATION && accreditationId) {
    return `/accreditations/${accreditationId}`
  }

  if (from === RETURN_TO_REGISTERED_ONLY) {
    return `/registered-only-periods/${year}`
  }

  return '/reports'
}

/**
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   year: number | string,
 *   from?: unknown,
 *   accreditationId?: string
 * }} params
 * @returns {string} unlocalised path
 */
export const reportReturnPath = ({
  organisationId,
  registrationId,
  year,
  from,
  accreditationId
}) =>
  `/organisations/${organisationId}/registrations/${registrationId}${suffix({ from, accreditationId, year })}`
