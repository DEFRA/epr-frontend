import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { backendSummaryLogStatuses } from '../common/constants/statuses.js'
import { buildLoadsViewModel } from './controller.js'

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'preprocessing'
    })
  })
)

vi.mock(
  import('#server/common/helpers/summary-log/submit-summary-log.js'),
  () => ({
    submitSummaryLog: vi.fn()
  })
)

const enablesClientSidePolling = () =>
  expect.stringContaining('meta http-equiv="refresh"')

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs`
  const summaryLogBaseUrl = `${baseUrl}/${summaryLogId}`
  const url = summaryLogBaseUrl
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should provide expected response', async () => {
    const { result, statusCode } = await server.inject({ method: 'GET', url })

    expect(fetchSummaryLogStatus).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId
    )
    expect(result).toStrictEqual(expect.stringContaining('Summary log |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  describe('processing states', () => {
    test('status: preprocessing - should show processing message and poll', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.preprocessing
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being uploaded')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'Your summary log is being uploaded and automatically validated'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open and do not refresh it')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validating - should show processing message and poll', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validating
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being uploaded')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: submitting - should show submitting message and poll', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.submitting
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being submitted')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Your summary log is being submitted')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open and do not refresh it')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('terminal states', () => {
    const expectCheckPageContent = (result) => {
      expect(result).toStrictEqual(
        expect.stringContaining('Check before you submit')
      )
      expect(result).toStrictEqual(expect.stringContaining('Compliance'))
      expect(result).toStrictEqual(expect.stringContaining('Declaration'))
      expect(result).toStrictEqual(
        expect.stringContaining('Confirm and submit')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Re-upload summary log')
      )
    }

    test('status: validated - should show check page and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining(
          'action="/organisations/123/registrations/456/summary-logs/789/submit"'
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('method="POST"'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    test('status: validated with new loads - should show new loads heading', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: {
            valid: {
              count: 7,
              rowIds: [1092, 1093, 1094, 1095, 1096, 1097, 1098]
            },
            invalid: { count: 2, rowIds: [1099, 1100] }
          },
          unchanged: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          adjusted: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should show total new loads (valid + invalid) in heading
      expect(result).toStrictEqual(
        expect.stringContaining('There are 9 new loads')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '7 new loads will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '2 new loads will not be added to your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with no new loads - should show no new loads heading', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          unchanged: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          adjusted: {
            valid: { count: 3, rowIds: [1096, 1099, 1100] },
            invalid: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are no new loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with adjusted loads - should show adjusted loads section', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          unchanged: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          adjusted: {
            valid: { count: 3, rowIds: [1096, 1099, 1100] },
            invalid: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are 3 adjusted loads')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'All adjustments will be reflected in your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with row IDs - should display row IDs in bullet list', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: {
            valid: { count: 3, rowIds: [1092, 1093, 1094] },
            invalid: { count: 0, rowIds: [] }
          },
          unchanged: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          adjusted: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Row IDs should be in bullet list
      expect(result).toStrictEqual(expect.stringContaining('<li>1092</li>'))
      expect(result).toStrictEqual(expect.stringContaining('<li>1093</li>'))
      expect(result).toStrictEqual(expect.stringContaining('<li>1094</li>'))
      expect(result).toStrictEqual(
        expect.stringContaining('found in the &#39;Row ID&#39; column')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with singular load - should use singular form', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: {
            valid: { count: 1, rowIds: [1092] },
            invalid: { count: 0, rowIds: [] }
          },
          unchanged: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          adjusted: {
            valid: { count: 1, rowIds: [1093] },
            invalid: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There is 1 new load')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('There is 1 adjusted load')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated without adjusted loads - should not show adjusted section', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.validated,
        loads: {
          added: {
            valid: { count: 5, rowIds: [1092, 1093, 1094, 1095, 1096] },
            invalid: { count: 0, rowIds: [] }
          },
          unchanged: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          },
          adjusted: {
            valid: { count: 0, rowIds: [] },
            invalid: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should not show adjusted loads section when count is 0
      expect(result).not.toStrictEqual(
        expect.stringContaining('adjusted loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: submitted - should show success page and stop polling', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.submitted,
        accreditationNumber: '493021'
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log submitted')
      )
      expect(result).toStrictEqual(expect.stringContaining('493021'))
      expect(result).toStrictEqual(expect.stringContaining('Return to home'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    test('status: submitted with freshData from POST - should use freshData and not call backend', async () => {
      // Integration test: POST submit sets freshData, GET uses it
      const submitUrl = `${url}/submit`

      // Mock the backend submit call for the POST
      submitSummaryLog.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.submitted,
        accreditationNumber: '999888'
      })

      // Make POST request to set up freshData in session
      const postResponse = await server.inject({
        method: 'POST',
        url: submitUrl
      })

      // Verify POST redirected
      expect(postResponse.statusCode).toBe(statusCodes.found)

      // Get session cookie from POST response
      const sessionCookie = postResponse.headers['set-cookie']

      // Make GET request with the session cookie
      // The GET handler should use freshData from session (not call fetchSummaryLogStatus)
      const initialCallCount = fetchSummaryLogStatus.mock.calls.length

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        headers: {
          cookie: Array.isArray(sessionCookie)
            ? sessionCookie[0]
            : sessionCookie
        }
      })

      // Verify fetchSummaryLogStatus was NOT called (freshData was used instead)
      expect(fetchSummaryLogStatus.mock.calls).toHaveLength(initialCallCount)

      // Verify success page with accreditation number from freshData
      expect(result).toStrictEqual(
        expect.stringContaining('Summary log submitted')
      )
      expect(result).toStrictEqual(expect.stringContaining('999888'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: rejected - should redirect to upload page with error in session', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.rejected
      })

      const { headers, statusCode } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe(`${baseUrl}/upload`)
    })

    test('status: invalid with validation failures - should show validation failures page', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.invalid,
        validation: {
          failures: [{ code: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      // Check new heading
      expect(result).toContain('Your summary log cannot be uploaded')
      // Check new description
      expect(result).toContain(
        'We have found the following issues with the file you selected'
      )
      expect(result).toContain(
        'You will need to correct these issues before uploading your summary log'
      )
      // Check issue message
      expect(result).toContain('Registration number is incorrect')
      // Check upload section
      expect(result).toContain('Upload updated XLSX file')
      expect(result).toContain('Continue')
      // Check cancel button
      expect(result).toContain('Cancel and return to dashboard')
      // Should not be polling
      expect(result).not.toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: invalid with multiple validation failures - should show all failures', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.invalid,
        validation: {
          failures: [{ code: 'MATERIAL_REQUIRED' }, { code: 'HEADER_REQUIRED' }]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Material type is missing')
      expect(result).toContain('The column headings in the file you selected')
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: invalid with unknown failure code - should show fallback message', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.invalid,
        validation: {
          failures: [{ code: 'SOME_UNKNOWN_CODE' }]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('An unexpected validation error occurred')
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: invalid with empty validation failures - should show generic validation error', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.invalid,
        validation: {
          failures: []
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('An unexpected validation error occurred')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: invalid without validation object - should show generic validation error', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: backendSummaryLogStatuses.invalid
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('An unexpected validation error occurred')
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('unexpected status handling', () => {
    test('unexpected status - should show error page', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: 'some_unknown_status'
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Error checking status')
      expect(result).toContain('Unable to check upload status')
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('error handling', () => {
    test('should show 404 error page when summary log not found', async () => {
      fetchSummaryLogStatus.mockRejectedValueOnce(Boom.notFound())

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(expect.stringContaining('Page not found'))
      expect(statusCode).toBe(statusCodes.notFound)
    })

    test('should show 500 error page when backend fetch fails', async () => {
      fetchSummaryLogStatus.mockRejectedValueOnce(
        Boom.internal('Failed to fetch')
      )

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('Something went wrong')
      )
      expect(statusCode).toBe(statusCodes.internalServerError)
    })
  })
})

describe('#buildLoadsViewModel', () => {
  test('returns empty arrays and zero counts when loads is undefined', () => {
    const result = buildLoadsViewModel(undefined)

    expect(result).toStrictEqual({
      added: {
        valid: [],
        invalid: [],
        validCount: 0,
        invalidCount: 0,
        total: 0
      },
      adjusted: {
        valid: [],
        invalid: [],
        validCount: 0,
        invalidCount: 0,
        total: 0
      }
    })
  })

  test('returns empty arrays and zero counts when loads is null', () => {
    const result = buildLoadsViewModel(null)

    expect(result).toStrictEqual({
      added: {
        valid: [],
        invalid: [],
        validCount: 0,
        invalidCount: 0,
        total: 0
      },
      adjusted: {
        valid: [],
        invalid: [],
        validCount: 0,
        invalidCount: 0,
        total: 0
      }
    })
  })

  test('returns empty arrays and zero counts when loads has empty structure', () => {
    const result = buildLoadsViewModel({
      added: {
        valid: { count: 0, rowIds: [] },
        invalid: { count: 0, rowIds: [] }
      },
      unchanged: {
        valid: { count: 0, rowIds: [] },
        invalid: { count: 0, rowIds: [] }
      },
      adjusted: {
        valid: { count: 0, rowIds: [] },
        invalid: { count: 0, rowIds: [] }
      }
    })

    expect(result).toStrictEqual({
      added: {
        valid: [],
        invalid: [],
        validCount: 0,
        invalidCount: 0,
        total: 0
      },
      adjusted: {
        valid: [],
        invalid: [],
        validCount: 0,
        invalidCount: 0,
        total: 0
      }
    })
  })

  test('uses count from backend (rowIds may be truncated)', () => {
    const result = buildLoadsViewModel({
      added: {
        valid: { count: 150, rowIds: [1001, 1002, 1003] },
        invalid: { count: 50, rowIds: [1004, 1005] }
      },
      unchanged: {
        valid: { count: 0, rowIds: [] },
        invalid: { count: 0, rowIds: [] }
      },
      adjusted: {
        valid: { count: 0, rowIds: [] },
        invalid: { count: 0, rowIds: [] }
      }
    })

    // rowIds contain truncated data, but counts come from count field
    expect(result.added).toStrictEqual({
      valid: [1001, 1002, 1003],
      invalid: [1004, 1005],
      validCount: 150,
      invalidCount: 50,
      total: 200
    })
  })

  test('uses count for adjusted loads', () => {
    const result = buildLoadsViewModel({
      added: {
        valid: { count: 0, rowIds: [] },
        invalid: { count: 0, rowIds: [] }
      },
      unchanged: {
        valid: { count: 0, rowIds: [] },
        invalid: { count: 0, rowIds: [] }
      },
      adjusted: {
        valid: { count: 120, rowIds: [2001, 2002] },
        invalid: { count: 30, rowIds: [2003] }
      }
    })

    expect(result.adjusted).toStrictEqual({
      valid: [2001, 2002],
      invalid: [2003],
      validCount: 120,
      invalidCount: 30,
      total: 150
    })
  })

  test('handles partial loads data gracefully', () => {
    const result = buildLoadsViewModel({
      added: {
        valid: { count: 1, rowIds: [1001] }
        // missing invalid
      }
      // missing unchanged, adjusted
    })

    expect(result).toStrictEqual({
      added: {
        valid: [1001],
        invalid: [],
        validCount: 1,
        invalidCount: 0,
        total: 1
      },
      adjusted: {
        valid: [],
        invalid: [],
        validCount: 0,
        invalidCount: 0,
        total: 0
      }
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
