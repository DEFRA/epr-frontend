/**
 * What a registration holds on a date, as `standingByDate` serves it.
 * @typedef {typeof STANDING[keyof typeof STANDING]} Standing
 */
export const STANDING = Object.freeze({
  REGISTERED_ONLY: 'registeredOnly',
  ACCREDITED: 'accredited',
  CANCELLED: 'cancelled'
})
