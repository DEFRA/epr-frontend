const recoveryCodes = {
  Aluminium: 'R4',
  'Paper and Board': 'R3',
  'Fibre-based Composite': 'R3',
  Plastic: 'R3',
  Steel: 'R4',
  Wood: 'R3',
  Glass: 'R5'
}

/**
 * Get the recovery process code for a given material
 * @param {string} material
 * @returns {string}
 */
export function getRecoveryCode(material) {
  return recoveryCodes[material] ?? ''
}
