import { mapValues } from 'lodash-es'

import { fetchJsonFromBackend } from '#server/common/helpers/fetch-json-from-backend.js'

/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */
/** @import { OrganisationView, StatusTimeline } from './organisation-view.js' */

/**
 * A registration or accreditation in either shape the backend serves.
 * @typedef {{
 *   status: string | { current: string, timeline: StatusTimeline },
 *   statusTimeline?: StatusTimeline
 * }} ServedStatus
 */

/**
 * Nests a flat `status` and `statusTimeline`. Remove once the backend serves only the nested shape.
 * @param {ServedStatus} view
 */
const nestStatus = ({ status, statusTimeline, ...rest }) => ({
  ...rest,
  status:
    typeof status === 'string'
      ? { current: status, timeline: statusTimeline }
      : status
})

/**
 * @param {{ registrations: Record<string, ServedStatus & { accreditations: Record<string, ServedStatus> }> }} organisation
 * @returns {OrganisationView}
 */
const nestStatuses = (organisation) =>
  /** @type {OrganisationView} */ ({
    ...organisation,
    registrations: mapValues(organisation.registrations, (registration) => ({
      ...nestStatus(registration),
      accreditations: mapValues(registration.accreditations, nestStatus)
    }))
  })

/**
 * Fetches the organisation by number, as it stood in `year` when one is given
 * @param {OrganisationNumber} organisationNumber
 * @param {string} backendToken - Bearer token for the backend
 * @param {{ year?: Year }} [options]
 * @returns {Promise<OrganisationView>}
 */
async function fetchOrganisation(
  organisationNumber,
  backendToken,
  { year } = {}
) {
  const query = year ? `?year=${year}` : ''
  const path = `/organisations/${organisationNumber}${query}`

  const organisation = await fetchJsonFromBackend(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${backendToken}`
    }
  })

  return nestStatuses(/** @type {any} */ (organisation))
}

export { fetchOrganisation }
