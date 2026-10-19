import { mapValues } from 'lodash-es'

import { backend, path } from '#server/common/helpers/backend-client.js'

/** @import { OrganisationNumber } from '#server/common/helpers/organisation-number.js' */
/** @import { Year } from '#server/common/helpers/year.js' */
/** @import { OrganisationView, Status, StatusTimeline } from './organisation-view.js' */

/**
 * A registration or accreditation in either shape the backend serves.
 * @typedef {{ status: string, statusTimeline: StatusTimeline } | { status: Status<string> }} ServedStatus
 */

/**
 * @typedef {{
 *   registrations: Record<string, ServedStatus & { accreditations: Record<string, ServedStatus> }>
 * }} ServedOrganisation
 */

/**
 * Nests a flat `status` and `statusTimeline`. Remove once the backend serves only the nested shape.
 * @param {ServedStatus} view
 */
const nestStatus = (view) => {
  if (!('statusTimeline' in view)) {
    return view
  }

  const { status, statusTimeline, ...rest } = view
  return { ...rest, status: { current: status, timeline: statusTimeline } }
}

/**
 * @param {ServedOrganisation} organisation
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
const fetchOrganisation = async (
  organisationNumber,
  backendToken,
  { year } = {}
) => {
  /** @type {ServedOrganisation} */
  const organisation = await backend(backendToken).get(
    path`/organisations/${organisationNumber}`,
    { query: { year } }
  )

  return nestStatuses(organisation)
}

export { fetchOrganisation }
