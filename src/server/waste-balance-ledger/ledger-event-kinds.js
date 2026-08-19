/**
 * The event kinds a waste balance ledger holds. The backend writes these
 * strings on every ledger event, so each spelling here is that contract and
 * nothing decides one locally.
 */
export const LEDGER_EVENT_KIND = Object.freeze({
  prnAccepted: 'prn-accepted',
  prnCancelledAfterIssue: 'prn-cancelled-after-issue',
  prnCreated: 'prn-created',
  prnCreationCancelled: 'prn-creation-cancelled',
  prnIssued: 'prn-issued',
  prnRejected: 'prn-rejected',
  summaryLogSubmitted: 'summary-log-submitted'
})

/**
 * The identity the backfill writes as its actor. It is a machine, so the page
 * names the system rather than inventing a person.
 */
export const SYSTEM_ACTOR_ID = 'system'
