import { DECEMBER_WASTE_CONTROL } from './december-waste-control.js'

/**
 * The tonnage-insufficiency message key. In pool mode the operator chose a
 * pot themselves, so the refusal names that pot rather than repeating the
 * generic message - the backend's 409 carries no pool discriminator by
 * design (ADR-0049), so the frontend picks the wording from what it
 * submitted.
 * @param {string} decemberWasteControlMode
 * @param {boolean} [isDecemberWaste]
 * @returns {string}
 */
export function resolveInsufficientBalanceMessageKey(
  decemberWasteControlMode,
  isDecemberWaste
) {
  if (decemberWasteControlMode !== DECEMBER_WASTE_CONTROL.selectPool) {
    return 'prns:insufficientBalanceError'
  }

  return isDecemberWaste
    ? 'prns:errors:insufficientDecemberBalance'
    : 'prns:errors:insufficientNonDecemberBalance'
}
