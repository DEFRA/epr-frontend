/**
 * Where a note's back and return links go, and what they read.
 *
 * A note is reachable from its own list, from the summary on the accreditation
 * page and from a waste balance ledger row, so the page that opened it says so
 * in a `from` parameter and the note sends the reader back there.
 *
 * The parameter is read off the address, so it selects a destination rather
 * than supplying one: anything but a known value falls back to the note list,
 * and no part of it reaches the path. The destinations are held in a `Map`
 * rather than an object so an inherited key cannot be looked up as one.
 */
export const RETURN_TO_ACCREDITATION = 'accreditation'
export const RETURN_TO_LEDGER = 'ledger'

/** @type {Map<unknown, { suffix: string, textKey: string }>} */
const DESTINATIONS = new Map([
  [
    RETURN_TO_ACCREDITATION,
    { suffix: '', textKey: 'prns:view:returnLinkAccreditation' }
  ],
  [
    RETURN_TO_LEDGER,
    { suffix: '/waste-balance-ledger', textKey: 'prns:view:returnLinkLedger' }
  ]
])

const NOTE_LIST = {
  suffix: '/packaging-recycling-notes',
  textKey: 'prns:view:returnLink'
}

/**
 * @param {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string,
 *   from?: unknown
 * }} params
 * @returns {{ path: string, textKey: string }}
 */
export const noteReturn = ({
  organisationId,
  registrationId,
  accreditationId,
  from
}) => {
  const accreditationPath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`
  const { suffix, textKey } = DESTINATIONS.get(from) ?? NOTE_LIST

  return { path: `${accreditationPath}${suffix}`, textKey }
}
