/** @import { RegistrationView } from './organisation-view.js' */

/**
 * The site a registration reprocesses at. An exporter has none.
 * @param {RegistrationView} registration
 * @returns {string | null}
 */
export const siteNameOf = (registration) => {
  if (registration.wasteProcessingType === 'exporter') {
    return null
  }

  const { address } = registration.site

  return 'line1' in address ? address.line1 : address.fullAddress
}
