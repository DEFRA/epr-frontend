const recoveryCodes = {
  aluminium: 'R4',
  fibre: 'R3',
  paper: 'R3',
  plastic: 'R3',
  steel: 'R4',
  wood: 'R3',
  glass: 'R5'
}

/**
 * Get the recovery process code for a given material
 * @param {string} material
 * @returns {string}
 */
export function getRecoveryCode(material) {
  return recoveryCodes[material] ?? ''
}
