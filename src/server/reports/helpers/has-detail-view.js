import { isReprocessorRegistration } from '#server/common/helpers/prns/registration-helpers.js'

/**
 * Whether the detail page is available for this registration.
 * Currently only registered-only reprocessors have a detail view.
 * @param {object} registration
 * @param {object | undefined} accreditation
 * @returns {boolean}
 */
export function hasDetailView(registration, accreditation) {
  return isReprocessorRegistration(registration) && !accreditation
}
