import { BAILING_WIRE_FACTOR, YES } from './reference-data.js'

const TWO_DP = 100

/**
 * Rounds a number to two decimal places.
 * @param {number} value
 * @returns {number}
 */
export const roundToTwoDecimalPlaces = (value) =>
  Math.round((value + Number.EPSILON) * TWO_DP) / TWO_DP

/**
 * Net weight derived from the gross, tare and pallet weights.
 *
 * The spreadsheet asked the user to enter this and validated the arithmetic;
 * the form computes it instead, so the value is correct by construction.
 *
 * @param {{ grossWeight: number, tareWeight: number, palletWeight: number }} weights
 * @returns {number}
 */
export const calculateNetWeight = ({ grossWeight, tareWeight, palletWeight }) =>
  roundToTwoDecimalPlaces(grossWeight - tareWeight - palletWeight)

/**
 * Tonnage received for recycling, derived from the net weight, the weight of
 * non-target materials, the bailing wire protocol and the recyclable
 * proportion. Mirrors the backend tonnage-received formula.
 *
 * @param {object} input
 * @param {number} input.netWeight
 * @param {number} input.nonTargetWeight
 * @param {string} input.bailingWireProtocol - "Yes" or "No"
 * @param {number} input.recyclablePercentage - 0-100
 * @returns {number}
 */
export const calculateTonnageForRecycling = ({
  netWeight,
  nonTargetWeight,
  bailingWireProtocol,
  recyclablePercentage
}) => {
  const baseWeight = netWeight - nonTargetWeight
  const adjustedWeight =
    bailingWireProtocol === YES ? baseWeight * BAILING_WIRE_FACTOR : baseWeight
  const proportion = recyclablePercentage / 100

  return roundToTwoDecimalPlaces(adjustedWeight * proportion)
}
