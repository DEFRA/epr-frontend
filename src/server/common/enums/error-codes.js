/**
 * Error codes attached to enriched Boom errors via cdp-boom factories. Wire
 * values are lowercase snake_case for parity with backend and CDP indexing.
 */
export const errorCodes = {
  accreditationIdMismatch: 'accreditation_id_mismatch',
  externalFetchFailed: 'external_fetch_failed',
  invalidPrnField: 'invalid_prn_field',
  notAccredited: 'not_accredited',
  prnCancelFailed: 'prn_cancel_failed',
  prnConfirmFailed: 'prn_confirm_failed',
  prnCreateFailed: 'prn_create_failed',
  prnDataMissing: 'prn_data_missing',
  prnDeleteFailed: 'prn_delete_failed',
  prnDiscardFailed: 'prn_discard_failed',
  registrationNotFound: 'registration_not_found',
  unknownMaterial: 'unknown_material'
}
