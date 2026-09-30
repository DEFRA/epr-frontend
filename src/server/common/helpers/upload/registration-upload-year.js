/**
 * @import { Registration } from '#domain/organisations/registration.js'
 */

/**
 * The year a fresh summary log upload for this registration targets: the UTC
 * year of the registration's own `validFrom`. Which accreditation, if any,
 * the upload belongs to isn't decided here — the backend resolves that from
 * the file itself when it validates.
 *
 * A registration reaches this helper only once it's eligible for upload,
 * which requires it to be approved and therefore to carry a `validFrom` —
 * a missing one here is a contract violation, not a normal path.
 * @param {Registration} registration
 * @returns {number}
 */
export const registrationUploadYear = (registration) => {
  if (!registration.validFrom) {
    throw new Error('Expected validFrom on a registration eligible for upload')
  }

  return new Date(registration.validFrom).getUTCFullYear()
}
