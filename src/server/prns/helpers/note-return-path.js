/**
 * Where a note's back and return links go, and what they read.
 *
 * Both pages that name themselves in `from` are the regulator's, so an
 * operator is sent to their own list whatever the address says. That is what
 * a link shared from a regulator to an operator needs: the ledger is behind a
 * scope the operator does not hold.
 *
 * The parameter selects a destination rather than supplying one: anything but
 * a known value falls back to the note list, and no part of it reaches the
 * path. The destinations are held in a `Map` rather than an object so an
 * inherited key cannot be looked up as one.
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
 *   isRegulator: boolean,
 *   from?: unknown
 * }} params
 * @returns {{ path: string, textKey: string }}
 */
export const noteReturn = ({
  organisationId,
  registrationId,
  accreditationId,
  isRegulator,
  from
}) => {
  const accreditationPath = `/organisations/${organisationId}/registrations/${registrationId}/accreditations/${accreditationId}`
  const { suffix, textKey } =
    (isRegulator ? DESTINATIONS.get(from) : undefined) ?? NOTE_LIST

  return { path: `${accreditationPath}${suffix}`, textKey }
}
