import { WASTE_PROCESSING_TYPE } from '#domain/organisations/model.js'

/** @import { RegistrationView } from './organisation-view.js' */

/**
 * The site a registration reprocesses at. An exporter has none.
 * @param {RegistrationView} registration
 * @returns {string | null}
 */
export const siteNameOf = (registration) => {
  if (registration.wasteProcessingType === WASTE_PROCESSING_TYPE.EXPORTER) {
    return null
  }

  const { address } = registration.site

  return 'line1' in address ? address.line1 : address.fullAddress
}
