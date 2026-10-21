/**
 * @typedef {'ids' | 'naturalKeys'} KeyForm
 * @typedef {'organisation' | 'registration' | 'accreditation'} KeyedRecord
 * @typedef {{ index: number, record: KeyedRecord }} KeyedSegment
 */

/**
 * Each parameter that addresses a record, with the literal it must follow.
 * @type {Record<string, { literal: string, record: KeyedRecord }>}
 */
const KEYED_PARAMS = {
  '{organisationNumber}': { literal: 'organisations', record: 'organisation' },
  '{registrationNumber}': { literal: 'registrations', record: 'registration' },
  '{year}': { literal: 'accreditations', record: 'accreditation' }
}

const ID = /^[0-9a-f]{24}$/

/** @type {Record<KeyedRecord, RegExp>} */
const NATURAL_KEY = {
  organisation: /^\d+$/,
  registration: /^R\d{2}[A-Z0-9]+$/,
  accreditation: /^\d{4}$/
}

/**
 * The segments a route addresses its records by, or `null` when it names none.
 * Every page route is addressed by natural keys.
 * @param {string} routePath - `request.route.path`
 * @returns {KeyedSegment[] | null}
 */
export const routeKeySegments = (routePath) => {
  const parts = routePath.split('/')

  // `previous` is the segment before `part`, so the first segment is skipped
  const segments = parts.slice(1).flatMap((part, previous) => {
    const param = KEYED_PARAMS[part]

    return param?.literal === parts[previous]
      ? [{ index: previous + 1, record: param.record }]
      : []
  })

  return segments.length > 0 ? segments : null
}

/**
 * @param {string} value
 * @param {KeyedRecord} record
 * @returns {KeyForm | null}
 */
const keyFormOf = (value, record) => {
  if (ID.test(value)) {
    return 'ids'
  }

  return NATURAL_KEY[record].test(value) ? 'naturalKeys' : null
}

/**
 * The key form of a URL's values, or `null` unless every one is that form.
 * @param {string[]} pathSegments - `request.path.split('/')`
 * @param {KeyedSegment[]} segments
 * @returns {KeyForm | null}
 */
export const urlKeyForm = (pathSegments, segments) => {
  const forms = new Set(
    segments.map(({ index, record }) => keyFormOf(pathSegments[index], record))
  )

  return forms.size === 1 ? [...forms][0] : null
}
