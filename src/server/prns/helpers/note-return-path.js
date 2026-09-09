/**
 * Where a note's back and return links go. A note is reachable from more than
 * one page, so the page that opened it says so in a `from` parameter and the
 * note sends the reader back there.
 *
 * The parameter is read off the address, so it selects a destination rather
 * than supplying one: anything but the one known value falls back to the note
 * list, and no part of it reaches the path.
 */
export const RETURN_TO_ACCREDITATION = 'accreditation'

/**
 * `from` arrives off the query string, so it is typed as the unknown it is.
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   from?: unknown
 * }} params
 * @returns {string}
 */
export const noteReturnPath = ({
  organisationId,
  registrationId,
  accreditationId,
  from
}) => {
  const accreditationPath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`

  return from === RETURN_TO_ACCREDITATION
    ? accreditationPath
    : `${accreditationPath}/packaging-recycling-notes`
}
