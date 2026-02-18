import { describe, expect, it, vi } from 'vitest'
import { warnOnMissingRegistrations } from './warn-on-missing-registrations.js'

const currentYear = new Date().getFullYear()

describe('#warnOnMissingRegistrations', () => {
  it('does not warn when all organisations have current-year producer registrations', () => {
    const logger = { warn: vi.fn() }
    const organisations = [
      {
        id: 'org-1',
        name: 'Producer',
        registrations: [
          { type: 'LARGE_PRODUCER', registrationYear: currentYear }
        ]
      },
      {
        id: 'org-2',
        name: 'Scheme',
        registrations: [
          { type: 'COMPLIANCE_SCHEME', registrationYear: currentYear }
        ]
      }
    ]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('warns when an organisation has no registrations at all', () => {
    const logger = { warn: vi.fn() }
    const organisations = [{ id: 'org-1', name: 'No Regs' }]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      { organisationId: 'org-1', organisationName: 'No Regs' },
      expect.stringContaining('no current-year registration')
    )
  })

  it('warns when an organisation has empty registrations', () => {
    const logger = { warn: vi.fn() }
    const organisations = [
      { id: 'org-1', name: 'Empty Regs', registrations: [] }
    ]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('warns when registrations exist but none for the current year', () => {
    const logger = { warn: vi.fn() }
    const organisations = [
      {
        id: 'org-1',
        name: 'Old Reg',
        registrations: [
          { type: 'LARGE_PRODUCER', registrationYear: currentYear - 1 }
        ]
      }
    ]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      { organisationId: 'org-1', organisationName: 'Old Reg' },
      expect.stringContaining('no current-year registration')
    )
  })

  it('warns when current-year registrations exist but none are producer types', () => {
    const logger = { warn: vi.fn() }
    const organisations = [
      {
        id: 'org-1',
        name: 'Reprocessor Only',
        registrations: [{ type: 'REPROCESSOR', registrationYear: currentYear }]
      }
    ]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      { organisationId: 'org-1', organisationName: 'Reprocessor Only' },
      expect.stringContaining('no current-year registration')
    )
  })

  it('warns on each problematic organisation independently', () => {
    const logger = { warn: vi.fn() }
    const organisations = [
      {
        id: 'org-ok',
        name: 'Good',
        registrations: [
          { type: 'LARGE_PRODUCER', registrationYear: currentYear }
        ]
      },
      { id: 'org-bad-1', name: 'Missing', registrations: [] },
      {
        id: 'org-bad-2',
        name: 'Wrong Year',
        registrations: [
          { type: 'LARGE_PRODUCER', registrationYear: currentYear - 1 }
        ]
      }
    ]

    warnOnMissingRegistrations(organisations, logger)

    expect(logger.warn).toHaveBeenCalledTimes(2)
  })
})
