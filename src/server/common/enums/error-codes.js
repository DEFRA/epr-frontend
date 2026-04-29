/**
 * Error codes attached to enriched Boom errors via cdp-boom factories. Wire
 * values are lowercase snake_case for parity with backend and CDP indexing.
 */
export const errorCodes = {
  externalFetchFailed: 'external_fetch_failed',
  registrationNotFound: 'registration_not_found',
  notAccredited: 'not_accredited',
  accreditationIdMismatch: 'accreditation_id_mismatch',
  unknownMaterial: 'unknown_material',
  invalidPrnField: 'invalid_prn_field',
  prnConfirmFailed: 'prn_confirm_failed',
  prnCancelFailed: 'prn_cancel_failed',
  prnCreateFailed: 'prn_create_failed',
  prnDeleteFailed: 'prn_delete_failed',
  prnDiscardFailed: 'prn_discard_failed',
  prnDataMissing: 'prn_data_missing'
}
