import { describe, expect, it, vi } from 'vitest'
import { warnOnMissingRegistrations } from './warn-on-missing-registrations.js'

describe('#warnOnMissingRegistrations', () => {
  it('logs a warning for each organisation with no registrations', () => {
    const logger = { warn: vi.fn() }
    const organisations = [
      {
        id: 'org-1',
        name: 'Has Registrations',
        registrations: [{ type: 'LARGE_PRODUCER' }]
      },
      { id: 'org-2', name: 'Empty Registrations', registrations: [] },
      { id: 'org-3', name: 'No Registrations' }
    ]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(
      { organisationId: 'org-2', organisationName: 'Empty Registrations' },
      'Waste organisation has no registrations — display name will fall back to tradingName preference'
    )
    expect(logger.warn).toHaveBeenCalledWith(
      { organisationId: 'org-3', organisationName: 'No Registrations' },
      'Waste organisation has no registrations — display name will fall back to tradingName preference'
    )
  })

  it('does not log when all organisations have registrations', () => {
    const logger = { warn: vi.fn() }
    const organisations = [
      {
        id: 'org-1',
        name: 'Producer',
        registrations: [{ type: 'LARGE_PRODUCER' }]
      },
      {
        id: 'org-2',
        name: 'Scheme',
        registrations: [{ type: 'COMPLIANCE_SCHEME' }]
      }
    ]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).not.toHaveBeenCalled()
  })
})
