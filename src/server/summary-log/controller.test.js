import Boom from '@hapi/boom'

import { statusCodes } from '#server/common/constants/status-codes.js'
import { validationFailureCodes } from '#server/common/constants/validation-codes.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { summaryLogStatuses } from '../common/constants/statuses.js'
import { buildLoadsViewModel, getSectionNumber } from './controller.js'

const mockUploadUrl = 'https://storage.example.com/upload?signature=abc123'

vi.mock(
  import('#server/common/helpers/upload/fetch-summary-log-status.js'),
  () => ({
    fetchSummaryLogStatus: vi.fn().mockResolvedValue({
      status: 'preprocessing'
    })
  })
)

vi.mock(
  import('#server/common/helpers/upload/initiate-summary-log-upload.js'),
  () => ({
    initiateSummaryLogUpload: vi.fn().mockResolvedValue({
      uploadUrl: 'https://storage.example.com/upload?signature=abc123',
      uploadId: 'new-upload-id-123'
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
      summaryLogId,
      { uploadId: undefined }
    )
    expect(result).toStrictEqual(expect.stringContaining('Summary log |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  describe('processing states', () => {
    test('status: preprocessing - should show processing message and poll', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.preprocessing
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
        status: summaryLogStatuses.validating
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
        status: summaryLogStatuses.submitting
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
        status: summaryLogStatuses.validated
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

    test('status: validated with REPROCESSOR_INPUT - should show section 1 in explanation text', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT',
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('section 1 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with REPROCESSOR_OUTPUT - should show section 3 in explanation text', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_OUTPUT',
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('section 3 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with EXPORTER - should show section 1 in explanation text', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'EXPORTER',
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toStrictEqual(
        expect.stringContaining('section 1 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with new loads - should show new loads heading', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: {
              count: 7,
              rowIds: [1092, 1093, 1094, 1095, 1096, 1097, 1098]
            },
            excluded: { count: 2, rowIds: [1099, 1100] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should show total new loads (included + excluded) in heading
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
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 3, rowIds: [1096, 1099, 1100] },
            excluded: { count: 0, rowIds: [] }
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
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 3, rowIds: [1096, 1099, 1100] },
            excluded: { count: 0, rowIds: [] }
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
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 3, rowIds: [1092, 1093, 1094] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
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
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 1, rowIds: [1092] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 1, rowIds: [1093] },
            excluded: { count: 0, rowIds: [] }
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

    test('status: validated with 100+ excluded loads - should show supplementary guidance instead of row IDs', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 5, rowIds: [1001, 1002, 1003, 1004, 1005] },
            excluded: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => 2000 + i)
            }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should show supplementary guidance message instead of row IDs
      expect(result).toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('supplementary guidance')
      )
      // Should NOT show "Show X loads" link
      expect(result).not.toStrictEqual(
        expect.stringContaining('Show 100 loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with 99 excluded loads - should show Show loads link with row IDs', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: {
              count: 99,
              rowIds: Array.from({ length: 99 }, (_, i) => 2000 + i)
            }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should show "Show X loads" when 99 or fewer
      expect(result).toStrictEqual(expect.stringContaining('Show 99 loads'))
      // Should NOT show supplementary guidance
      expect(result).not.toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with 100+ adjusted excluded loads - should show supplementary guidance', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 2, rowIds: [3001, 3002] },
            excluded: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => 4000 + i)
            }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should show supplementary guidance for adjusted excluded loads
      expect(result).toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated with 99 adjusted excluded loads - should show Show loads link', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: {
              count: 99,
              rowIds: Array.from({ length: 99 }, (_, i) => 4000 + i)
            }
          }
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expectCheckPageContent(result)

      // Should show "Show X loads" for adjusted excluded loads
      expect(result).toStrictEqual(expect.stringContaining('Show 99 loads'))
      // Should NOT show supplementary guidance
      expect(result).not.toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validated without adjusted loads - should not show adjusted section', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 5, rowIds: [1092, 1093, 1094, 1095, 1096] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
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
        status: summaryLogStatuses.submitted,
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
        status: summaryLogStatuses.submitted,
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

    test('status: rejected with validation failure code - should show validation failures page', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ code: validationFailureCodes.FILE_VIRUS_DETECTED }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('contains a virus and cannot be uploaded')
    })

    test('status: rejected - should initiate upload with pre-signed URL', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ code: validationFailureCodes.FILE_VIRUS_DETECTED }]
        }
      })

      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`
      })
    })

    test('status: rejected without validation - should show validation failures page with generic error', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('An unexpected validation error occurred')
    })

    test('status: invalid with validation failures - should show validation failures page with correct content', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.REGISTRATION_MISMATCH }]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'We&#39;ve found the following issue with the file you selected'
      )
      expect(result).toContain('Registration number is incorrect')
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    test('status: invalid with validation failures - should show re-upload form and cancel button', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.REGISTRATION_MISMATCH }]
        }
      })

      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Upload updated XLSX file')
      expect(result).toContain('Continue')
      expect(result).toContain('Cancel and return to dashboard')
      expect(result).toContain(
        `href="/organisations/${organisationId}/registrations/${registrationId}"`
      )
    })

    test('status: invalid - should initiate upload with pre-signed URL', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: validationFailureCodes.REGISTRATION_MISMATCH }]
        }
      })

      const { result } = await server.inject({ method: 'GET', url })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`
      })
    })

    test('status: invalid with multiple validation failures - should show all failures', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.SEQUENTIAL_ROW_REMOVED },
            { code: validationFailureCodes.HEADER_REQUIRED }
          ]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Rows have been removed since your summary log was last submitted'
      )
      expect(result).toContain('The column headings in the file you selected')
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: invalid with unknown failure code - should show fallback message', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ code: 'SOME_UNKNOWN_CODE' }]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('An unexpected validation error occurred')
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: invalid with data entry failures - should show single deduplicated message', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.VALUE_OUT_OF_RANGE },
            { code: validationFailureCodes.INVALID_TYPE },
            { code: validationFailureCodes.VALUE_OUT_OF_RANGE }
          ]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      // All data entry codes should map to single DATA_ENTRY_INVALID message
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )

      // Should only appear once (deduplicated)
      const matches = result.match(
        /The selected file contains data that&#39;s been entered incorrectly/g
      )

      expect(matches).toHaveLength(1)
    })

    test('status: invalid with mixed failures - should show data entry message and other failures', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { code: validationFailureCodes.VALUE_OUT_OF_RANGE },
            { code: validationFailureCodes.REGISTRATION_MISMATCH },
            { code: validationFailureCodes.INVALID_TYPE }
          ]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(statusCode).toBe(statusCodes.ok)
      // Should show both the data entry message and the registration mismatch
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )
      expect(result).toContain('Registration number is incorrect')
    })

    test('status: invalid with empty validation failures - should show generic validation error', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
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
        status: summaryLogStatuses.invalid
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('An unexpected validation error occurred')
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validation_failed - should show validation failures page with re-upload option', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed,
        validation: {
          failures: [{ code: 'PROCESSING_FAILED' }]
        }
      })

      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('status: validation_failed - should initiate upload for re-upload', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed
      })

      await server.inject({ method: 'GET', url })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`
      })
    })

    test('status: validation_failed - should update session with new uploadId for re-upload', async () => {
      fetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed
      })

      // Make request with existing session containing old uploadId
      const response = await server.inject({
        method: 'GET',
        url,
        headers: {
          cookie: 'session=existing-session'
        }
      })

      // Verify the response sets a session cookie (session was updated)
      const setCookieHeader = response.headers['set-cookie']
      expect(setCookieHeader).toBeDefined()
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
        included: [],
        excluded: [],
        includedCount: 0,
        excludedCount: 0,
        total: 0
      },
      adjusted: {
        included: [],
        excluded: [],
        includedCount: 0,
        excludedCount: 0,
        total: 0
      }
    })
  })

  test('returns empty arrays and zero counts when loads is null', () => {
    const result = buildLoadsViewModel(null)

    expect(result).toStrictEqual({
      added: {
        included: [],
        excluded: [],
        includedCount: 0,
        excludedCount: 0,
        total: 0
      },
      adjusted: {
        included: [],
        excluded: [],
        includedCount: 0,
        excludedCount: 0,
        total: 0
      }
    })
  })

  test('returns empty arrays and zero counts when loads has empty structure', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      }
    })

    expect(result).toStrictEqual({
      added: {
        included: [],
        excluded: [],
        includedCount: 0,
        excludedCount: 0,
        total: 0
      },
      adjusted: {
        included: [],
        excluded: [],
        includedCount: 0,
        excludedCount: 0,
        total: 0
      }
    })
  })

  test('uses count from backend (rowIds may be truncated)', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 150, rowIds: [1001, 1002, 1003] },
        excluded: { count: 50, rowIds: [1004, 1005] }
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      }
    })

    // rowIds contain truncated data, but counts come from count field
    expect(result.added).toStrictEqual({
      included: [1001, 1002, 1003],
      excluded: [1004, 1005],
      includedCount: 150,
      excludedCount: 50,
      total: 200
    })
  })

  test('uses count for adjusted loads', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      },
      adjusted: {
        included: { count: 120, rowIds: [2001, 2002] },
        excluded: { count: 30, rowIds: [2003] }
      }
    })

    expect(result.adjusted).toStrictEqual({
      included: [2001, 2002],
      excluded: [2003],
      includedCount: 120,
      excludedCount: 30,
      total: 150
    })
  })

  test('handles partial loads data gracefully', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 1, rowIds: [1001] }
        // missing excluded
      }
      // missing adjusted
    })

    expect(result).toStrictEqual({
      added: {
        included: [1001],
        excluded: [],
        includedCount: 1,
        excludedCount: 0,
        total: 1
      },
      adjusted: {
        included: [],
        excluded: [],
        includedCount: 0,
        excludedCount: 0,
        total: 0
      }
    })
  })

  test('calculates total from included + excluded counts', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 8, rowIds: [1001, 1002, 1003] },
        excluded: { count: 7, rowIds: [1004, 1005] }
      },
      adjusted: {
        included: { count: 4, rowIds: [2001, 2002, 2003, 2004] },
        excluded: { count: 3, rowIds: [2005, 2006, 2007] }
      }
    })

    expect(result.added.total).toBe(15)
    expect(result.adjusted.total).toBe(7)
  })
})

describe('#getSectionNumber', () => {
  test('returns section 1 for REPROCESSOR_INPUT', () => {
    expect(getSectionNumber('REPROCESSOR_INPUT')).toBe(1)
  })

  test('returns section 3 for REPROCESSOR_OUTPUT', () => {
    expect(getSectionNumber('REPROCESSOR_OUTPUT')).toBe(3)
  })

  test('returns section 1 for EXPORTER', () => {
    expect(getSectionNumber('EXPORTER')).toBe(1)
  })

  test('returns section 1 for undefined processingType', () => {
    expect(getSectionNumber(undefined)).toBe(1)
  })

  test('returns section 1 for unknown processingType', () => {
    expect(getSectionNumber('UNKNOWN_TYPE')).toBe(1)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
