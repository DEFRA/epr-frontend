/**
 * What a registration holds on a date, as `regAccStatusByDate` serves it.
 * @typedef {typeof REG_ACC_STATUS[keyof typeof REG_ACC_STATUS]} RegAccStatus
 */
export const REG_ACC_STATUS = Object.freeze({
  REGISTERED_ONLY: 'registeredOnly',
  ACCREDITED: 'accredited',
  CANCELLED: 'cancelled'
})
