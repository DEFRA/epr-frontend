import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { submitSummaryLog } from '#server/common/helpers/summary-log/submit-summary-log.js'
import { fetchSummaryLogStatus } from '#server/common/helpers/upload/fetch-summary-log-status.js'
import { initiateSummaryLogUpload } from '#server/common/helpers/upload/initiate-summary-log-upload.js'
import { fetchWasteBalances } from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { extractCookieValues } from '#server/common/test-helpers/cookie-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import {
  getAllByRole,
  getAllByText,
  getByRole,
  getByTestId,
  getByText,
  queryByText
} from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { summaryLogStatuses } from '../common/constants/statuses.js'
import {
  buildLoadsByWasteRecordTypeViewModel,
  buildLoadsViewModel,
  getWasteRecordSectionNumber
} from './controller.js'

/**
 * @import { ProcessingType } from '#domain/summary-logs/meta-fields.js'
 * @import { RawLoadsByWasteRecordType } from './types.js'
 */

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

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js'),
  () => ({
    fetchRegistrationAndAccreditation: vi.fn().mockResolvedValue({
      organisationData: undefined,
      registration: undefined,
      accreditation: undefined
    })
  })
)

vi.mock(
  import('#server/common/helpers/waste-balance/fetch-waste-balances.js'),
  () => ({
    fetchWasteBalances: vi.fn()
  })
)

const mockFetchSummaryLogStatus = vi.mocked(fetchSummaryLogStatus, {
  partial: true,
  deep: true
})
const mockInitiateSummaryLogUpload = vi.mocked(initiateSummaryLogUpload, {
  partial: true,
  deep: true
})
const mockSubmitSummaryLog = vi.mocked(submitSummaryLog, {
  partial: true,
  deep: true
})
const mockFetchRegistrationAndAccreditation = vi.mocked(
  fetchRegistrationAndAccreditation,
  { partial: true, deep: true }
)
const mockFetchWasteBalances = vi.mocked(fetchWasteBalances, {
  partial: true,
  deep: true
})

const mockAuth = buildMockAuth({ idToken: 'test-id-token' })

const enablesClientSidePolling = () =>
  expect.stringContaining('meta http-equiv="refresh"')

describe('#summaryLogUploadProgressController', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs`
  const summaryLogBaseUrl = `${baseUrl}/${summaryLogId}`
  const url = summaryLogBaseUrl

  beforeEach(() => {
    mockFetchSummaryLogStatus.mockReset().mockResolvedValue({
      status: 'preprocessing'
    })

    mockInitiateSummaryLogUpload.mockReset().mockResolvedValue({
      uploadUrl: mockUploadUrl,
      uploadId: 'new-upload-id-123'
    })

    mockSubmitSummaryLog.mockReset()
  })

  it('should provide expected response', async ({ server }) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(fetchSummaryLogStatus).toHaveBeenCalledWith(
      organisationId,
      registrationId,
      summaryLogId,
      { idToken: 'test-id-token' }
    )
    expect(result).toStrictEqual(expect.stringContaining('Summary log |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  describe('processing states', () => {
    it('status: preprocessing - should show processing message and poll', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.preprocessing
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const pageBody = getByTestId(body, 'app-page-body')

      /* eslint-disable vitest/max-expects */
      expect(
        getByRole(pageBody, 'heading', {
          level: 1,
          name: 'Your file is being checked'
        })
      ).toBeDefined()
      const paragraphs = getAllByRole(pageBody, 'paragraph')
      expect(paragraphs[0].textContent?.trim()).toBe(
        'Your summary log is being checked for:'
      )
      expect(
        getAllByRole(pageBody, 'listitem').map((li) => li.textContent?.trim())
      ).toStrictEqual([
        'errors',
        'new data',
        'changes to previously uploaded data'
      ])
      expect(paragraphs[1].textContent?.trim()).toBe(
        'This may take a few minutes.'
      )
      expect(paragraphs[2].textContent?.trim()).toBe(
        'Keep this page open and do not refresh it.'
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
      /* eslint-enable vitest/max-expects */
    })

    it('status: validating - should show processing message and poll', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validating
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Your file is being checked')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submitting - should show submitting message and poll', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitting
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Your waste records are being updated')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('This may take a few minutes.')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('Keep this page open and do not refresh it.')
      )
      expect(result).toStrictEqual(enablesClientSidePolling())
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('terminal states', () => {
    const expectCheckPageContent = (result) => {
      expect(result).toStrictEqual(
        expect.stringContaining('Check before confirming upload')
      )
      expect(result).toStrictEqual(expect.stringContaining('Confirm upload'))
      expect(result).toStrictEqual(
        expect.stringContaining('upload an updated summary log')
      )
    }

    it('status: validated - should show check page and stop polling', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining(
          'action="/organisations/123/registrations/456/summary-logs/789/submit"'
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('method="POST"'))
      expect(result).toStrictEqual(
        expect.stringContaining('data-prevent-double-click="true"')
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: validated - should show return to home link to organisation home', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('return to home'))
      expect(result).toStrictEqual(
        expect.stringContaining(`href="/organisations/${organisationId}"`)
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated - should show warning inset text with both links', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('govuk-inset-text'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          'This data will not be saved until you confirm upload'
        )
      )

      expect(result).toStrictEqual(
        expect.stringContaining('upload an updated summary log')
      )
      expect(result).toStrictEqual(expect.stringContaining('return to home'))

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with REPROCESSOR_INPUT - should show section 1 in explanation text', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT',
        loads: {
          added: {
            included: {
              count: 5,
              rowIds: ['1001', '1002', '1003', '1004', '1005']
            },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('section 1 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with REPROCESSOR_OUTPUT - should show section 3 in explanation text', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_OUTPUT',
        loads: {
          added: {
            included: {
              count: 5,
              rowIds: ['1001', '1002', '1003', '1004', '1005']
            },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('section 3 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with EXPORTER - should show section 1 in explanation text', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'EXPORTER',
        loads: {
          added: {
            included: {
              count: 5,
              rowIds: ['1001', '1002', '1003', '1004', '1005']
            },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('section 1 of your summary log')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with new loads - should show new loads heading', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: {
              count: 7,
              rowIds: ['1092', '1093', '1094', '1095', '1096', '1097', '1098']
            },
            excluded: { count: 2, rowIds: ['1099', '1100'] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('New loads'))
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

    it('status: validated with no new loads - should show no new loads heading', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 3, rowIds: ['1096', '1099', '1100'] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are no new loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with adjusted loads - should show adjusted loads section', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        processingType: 'REPROCESSOR_INPUT',
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 3, rowIds: ['1096', '1099', '1100'] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Adjusted loads'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          'These loads have had data added, removed, or changed in section 1 of your summary log since it was last submitted.'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '3 adjusted loads will be reflected in your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with new included loads - should NOT display row IDs', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 3, rowIds: ['1092', '1093', '1094'] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).not.toStrictEqual(expect.stringContaining('<li>1092</li>'))
      expect(result).not.toStrictEqual(expect.stringContaining('<li>1093</li>'))
      expect(result).not.toStrictEqual(expect.stringContaining('<li>1094</li>'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '3 new loads will be added to your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with singular load - should use singular form', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 1, rowIds: ['1092'] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 1, rowIds: ['1093'] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('New loads'))
      expect(result).toStrictEqual(expect.stringContaining('Adjusted loads'))
      expect(result).toStrictEqual(
        expect.stringContaining(
          '1 new load will be added to your waste balance'
        )
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          '1 adjusted load will be reflected in your waste balance'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 100+ excluded loads - should show supplementary guidance instead of row IDs', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: {
              count: 5,
              rowIds: ['1001', '1002', '1003', '1004', '1005']
            },
            excluded: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => String(2000 + i))
            }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )
      expect(result).toStrictEqual(
        expect.stringContaining('supplementary guidance')
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('Show 100 loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 99 excluded loads - should show Show loads link with row IDs', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: {
              count: 99,
              rowIds: Array.from({ length: 99 }, (_, i) => String(2000 + i))
            }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Show 99 loads'))
      expect(result).not.toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 100+ adjusted excluded loads - should show supplementary guidance', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 2, rowIds: ['3001', '3002'] },
            excluded: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => String(4000 + i))
            }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 99 adjusted excluded loads - should show Show loads link', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
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
              rowIds: Array.from({ length: 99 }, (_, i) => String(4000 + i))
            }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Show 99 loads'))
      expect(result).not.toStrictEqual(
        expect.stringContaining('100 or more loads are missing data')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with adjusted included loads - should show Show loads link', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: {
              count: 5,
              rowIds: ['3001', '3002', '3003', '3004', '3005']
            },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(expect.stringContaining('Show 5 loads'))

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated with 100+ adjusted included loads - should NOT show missing data message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: {
              count: 100,
              rowIds: Array.from({ length: 100 }, (_, i) => String(3000 + i))
            },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).not.toStrictEqual(
        expect.stringContaining('loads are missing data')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'As there are 100 or more adjusted loads, we are not able to list them all here'
        )
      )
      expect(result).not.toStrictEqual(
        expect.stringContaining('Show 100 loads')
      )

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validated without adjusted loads - should show no adjusted loads message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validated,
        loads: {
          added: {
            included: {
              count: 5,
              rowIds: ['1092', '1093', '1094', '1095', '1096']
            },
            excluded: { count: 0, rowIds: [] }
          },
          adjusted: {
            included: { count: 0, rowIds: [] },
            excluded: { count: 0, rowIds: [] }
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expectCheckPageContent(result)

      expect(result).toStrictEqual(
        expect.stringContaining('There are no adjusted loads')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submitted - should show success page and stop polling', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted,
        accreditationNumber: 'ACC-2025-001'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log uploaded')
      )
      expect(result).toStrictEqual(
        expect.stringContaining(
          'You can upload an updated summary log whenever you need to provide new data.'
        )
      )
      expect(result).toStrictEqual(expect.stringContaining('Return to home'))

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: submitted - should link to organisation root', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining(`href="/organisations/${organisationId}"`)
      )
    })

    describe('waste balance', () => {
      it('status: validated - should not fetch waste balance data', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.validated,
          loads: {
            added: {
              included: { count: 0, rowIds: [] },
              excluded: { count: 0, rowIds: [] }
            },
            adjusted: {
              included: { count: 0, rowIds: [] },
              excluded: { count: 0, rowIds: [] }
            }
          }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(fetchRegistrationAndAccreditation).not.toHaveBeenCalled()
        expect(fetchWasteBalances).not.toHaveBeenCalled()
      })

      it('status: submitted - should fetch waste balance data', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        mockFetchWasteBalances.mockResolvedValueOnce({
          [accreditationId]: {
            amount: 1000,
            availableAmount: 1234.56
          }
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(fetchRegistrationAndAccreditation).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          'test-id-token'
        )
        expect(fetchWasteBalances).toHaveBeenCalledWith(
          organisationId,
          [accreditationId],
          'test-id-token'
        )
      })

      it.for([
        { label: 'a balance', availableAmount: 1234.56, expected: '1,234.56' },
        { label: 'a zero balance', availableAmount: 0, expected: '0.00' }
      ])(
        'status: submitted - should display $label in the confirmation panel',
        async ({ availableAmount, expected }, { server }) => {
          const accreditationId = 'accreditation-id-456'

          mockFetchSummaryLogStatus.mockResolvedValueOnce({
            status: summaryLogStatuses.submitted,
            accreditationNumber: 'ACC-2025-001'
          })

          mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
            organisationData: { id: organisationId },
            registration: { id: registrationId, accreditationId },
            accreditation: {
              id: accreditationId,
              accreditationNumber: 'ACC-2025-001'
            }
          })

          mockFetchWasteBalances.mockResolvedValueOnce({
            [accreditationId]: {
              amount: 1000,
              availableAmount
            }
          })

          const { result } = await server.inject({
            method: 'GET',
            url,
            auth: mockAuth
          })

          const { body } = new JSDOM(result).window.document
          const panelBody = body.querySelector(
            '.govuk-panel--confirmation .govuk-panel__body'
          )

          expect(panelBody).not.toBeNull()
          expect(panelBody?.textContent).toContain('Your updated waste balance')
          expect(panelBody?.textContent).toContain(expected)
          expect(panelBody?.textContent).toContain('tonnes')
        }
      )

      it('status: submitted - should not display waste balance section when balance unavailable', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId },
          accreditation: undefined
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document

        expect(statusCode).toBe(statusCodes.ok)
        expect(body.querySelector('.govuk-panel--confirmation')).not.toBeNull()
        expect(body.querySelector('.govuk-panel__body')).toBeNull()
        expect(result).not.toContain('Your updated waste balance')
      })

      it('status: submitted - should not display waste balance when balance not found', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        mockFetchWasteBalances.mockResolvedValueOnce({})

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toContain('Your updated waste balance')
      })

      it('status: submitted - should handle waste balance fetch failure gracefully', async ({
        server
      }) => {
        const accreditationId = 'accreditation-id-456'
        const fetchError = new Error('Waste balance service unavailable')

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockResolvedValueOnce({
          organisationData: { id: organisationId },
          registration: { id: registrationId, accreditationId },
          accreditation: {
            id: accreditationId,
            accreditationNumber: 'ACC-2025-001'
          }
        })

        mockFetchWasteBalances.mockRejectedValueOnce(fetchError)

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('Summary log uploaded')
        expect(result).not.toContain('Your updated waste balance')

        expect(server.loggerMocks.error).toHaveBeenCalledWith({
          message: 'Failed to fetch waste balance data',
          err: fetchError
        })
      })

      it('status: submitted - should propagate 404 when registration not found', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.submitted,
          accreditationNumber: 'ACC-2025-001'
        })

        mockFetchRegistrationAndAccreditation.mockRejectedValueOnce(
          Boom.notFound('Registration not found')
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })
    })

    it('status: submitted with freshData from POST - should use freshData and not call backend', async ({
      server
    }) => {
      const submitUrl = `${url}/submit`

      mockSubmitSummaryLog.mockResolvedValueOnce({
        status: summaryLogStatuses.submitted,
        accreditationNumber: 'ACC-2025-002'
      })

      const { cookie, crumb } = await getCsrfToken(server, url, {
        auth: mockAuth
      })

      const postResponse = await server.inject({
        method: 'POST',
        url: submitUrl,
        headers: { cookie },
        payload: { crumb },
        auth: mockAuth
      })

      expect(postResponse.statusCode).toBe(statusCodes.found)

      const cookieHeader = extractCookieValues(
        postResponse.headers['set-cookie']
      ).join('; ')

      const initialCallCount = mockFetchSummaryLogStatus.mock.calls.length

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        headers: {
          cookie: cookieHeader
        },
        auth: mockAuth
      })

      expect(fetchSummaryLogStatus).toHaveBeenCalledTimes(initialCallCount)

      expect(result).toStrictEqual(
        expect.stringContaining('Summary log uploaded')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: rejected with validation failure code - should show validation failures page', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ errorCode: 'FILE_VIRUS_DETECTED' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('The selected file contains a virus')
    })

    // Codes that resolve via the direct-key fallback to their own
    // `failure.<code>` copy. Without that copy they would silently render the
    // technical-error defaultValue, so each case asserts the tailored message
    // AND the absence of the fallback.
    const technicalErrorCopy =
      'Sorry, there is a problem with the service - try again later'

    it.for([
      {
        errorCode: 'FILE_EMPTY',
        status: summaryLogStatuses.rejected,
        copy: 'The selected file is empty'
      },
      {
        errorCode: 'FILE_TOO_LARGE',
        status: summaryLogStatuses.rejected,
        copy: 'The selected file must be smaller than 100MB'
      },
      {
        errorCode: 'FILE_WRONG_TYPE',
        status: summaryLogStatuses.rejected,
        copy: 'The selected file must be a .XLSX'
      },
      {
        errorCode: 'PROCESSING_TYPE_DATA_INVALID',
        status: summaryLogStatuses.invalid,
        copy: 'There is a problem with your registration - please contact support'
      },
      {
        errorCode: 'TEMPLATE_VERSION_REQUIRED',
        status: summaryLogStatuses.invalid,
        copy: 'The template version could not be determined'
      },
      {
        errorCode: 'TEMPLATE_VERSION_INVALID',
        status: summaryLogStatuses.invalid,
        copy: 'The template version is not recognised'
      }
    ])(
      'status: $status with $errorCode - should render its tailored failure copy, not the technical-error fallback',
      async ({ errorCode, status, copy }, { server }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status,
          validation: { failures: [{ errorCode }] }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document

        expect(statusCode).toBe(statusCodes.ok)
        expect(getByText(body, copy)).toBeDefined()
        expect(queryByText(body, technicalErrorCopy)).toBeNull()
      }
    )

    it('status: rejected - should initiate upload with pre-signed URL', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected,
        validation: {
          failures: [{ errorCode: 'FILE_VIRUS_DETECTED' }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: rejected without validation - should show validation failures page with technical error', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.rejected
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with validation failures - should show validation failures page with correct content', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'We&#39;ve found the following issue with the file you selected'
      )
      expect(result).toContain(
        'Registration number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })

    it('status: invalid with validation failures - should show re-upload form and cancel button', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Upload updated XLSX file')
      expect(result).toContain('Continue')
      expect(result).toContain('Cancel and return to home')
      expect(result).toContain(
        `href="/organisations/${organisationId}/registrations/${registrationId}"`
      )
    })

    it('status: invalid - should render back link to registration dashboard', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('govuk-back-link')
      expect(result).toContain(
        `href="/organisations/${organisationId}/registrations/${registrationId}"`
      )
    })

    it('status: invalid - should initiate upload with pre-signed URL', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'REGISTRATION_MISMATCH' }]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(`action="${mockUploadUrl}"`)
      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: invalid with SEQUENTIAL_ROW_REMOVED alongside another failure - should render both the composite block and the other failure message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'SEQUENTIAL_ROW_REMOVED',
              location: { sheet: 'Received' }
            },
            { errorCode: 'HEADER_REQUIRED' }
          ]
        }
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain(
        'Since your summary log was last submitted, rows have been removed from:'
      )
      expect(result).toContain(
        'The columns in the file you selected have been changed'
      )
    })

    it.for([
      {
        label: 'one sheet',
        failures: [
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          }
        ],
        expectedBullets: ['Exported (sections 1, 2 and 3)']
      },
      {
        label: 'multiple sheets listed once each',
        failures: [
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          },
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Sent on (sections 4 and 5)' }
          }
        ],
        expectedBullets: [
          'Exported (sections 1, 2 and 3)',
          'Sent on (sections 4 and 5)'
        ]
      },
      {
        label: 'duplicate sheet deduped to one bullet',
        failures: [
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          },
          {
            errorCode: 'SEQUENTIAL_ROW_REMOVED',
            location: { sheet: 'Exported (sections 1, 2 and 3)' }
          }
        ],
        expectedBullets: ['Exported (sections 1, 2 and 3)']
      },
      {
        label: 'missing sheet falls back to Unknown',
        failures: [{ errorCode: 'SEQUENTIAL_ROW_REMOVED' }],
        expectedBullets: ['Unknown']
      }
    ])(
      'status: invalid with SEQUENTIAL_ROW_REMOVED ($label) - should list affected sheets as bullets with preamble and closing',
      async ({ failures, expectedBullets }, { server }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.invalid,
          validation: { failures }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const bullets = getAllByRole(
          getByTestId(body, 'app-page-body'),
          'listitem'
        ).map((li) => li.textContent?.trim())

        expect(statusCode).toBe(statusCodes.ok)
        expect(bullets).toStrictEqual(expectedBullets)
        expect(
          getAllByText(
            body,
            'Since your summary log was last submitted, rows have been removed from:'
          )
        ).toHaveLength(1)
        expect(
          getByText(
            body,
            'The rows must be re-added before you can submit your file.'
          )
        ).toBeDefined()
        expect(
          getByText(
            body,
            /We've found the following issue with the file you selected/
          )
        ).toBeDefined()
      }
    )

    it('status: invalid with unknown failure code - should show technical error message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'SOME_UNKNOWN_CODE' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: invalid with data entry failures - should show single deduplicated message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'VALUE_OUT_OF_RANGE' },
            { errorCode: 'INVALID_TYPE' },
            { errorCode: 'VALUE_OUT_OF_RANGE' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(statusCode).toBe(statusCodes.ok)
      expect(
        getByText(body, 'Your summary log cannot be uploaded')
      ).toBeDefined()
      expect(
        getAllByText(
          body,
          "The selected file contains data that's been entered incorrectly - check that the data you've entered matches the examples provided in the summary log"
        )
      ).toHaveLength(1)
    })

    it('status: invalid with mixed failures - should show data entry message and other failures', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'VALUE_OUT_OF_RANGE' },
            { errorCode: 'REGISTRATION_MISMATCH' },
            { errorCode: 'INVALID_TYPE' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )
      expect(result).toContain(
        'Registration number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with material failure - should show material invalid message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'MATERIAL_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Material on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with accreditation failure - should show accreditation invalid message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'ACCREDITATION_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Accreditation number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with processing type failure - should show template incorrect message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'PROCESSING_TYPE_MISMATCH' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with SPREADSHEET_MALFORMED_MARKERS failure - should show malformed template message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'SPREADSHEET_MALFORMED_MARKERS' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with SPREADSHEET_INVALID_ERROR failure - should show malformed template message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: 'SPREADSHEET_INVALID_ERROR' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The summary log template you&#39;re uploading is incorrect'
      )
    })

    it('status: invalid with multiple spreadsheet failures - should show single deduplicated message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'SPREADSHEET_MALFORMED_MARKERS' },
            { errorCode: 'SPREADSHEET_INVALID_ERROR' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(statusCode).toBe(statusCodes.ok)
      // Should only appear once (deduplicated)
      expect(
        getAllByText(
          body,
          "The summary log template you're uploading is incorrect - make sure you download the correct template for your registration or accreditation"
        )
      ).toHaveLength(1)
    })

    it.for([
      'FILE_UPLOAD_FAILED',
      'FILE_DOWNLOAD_FAILED',
      'FILE_REJECTED',
      'VALIDATION_SYSTEM_ERROR',
      'UNKNOWN'
    ])('%s - should show technical error message', async (code, { server }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [{ errorCode: code }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with multiple technical errors - should show single deduplicated message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            { errorCode: 'FILE_UPLOAD_FAILED' },
            { errorCode: 'FILE_DOWNLOAD_FAILED' },
            { errorCode: 'VALIDATION_SYSTEM_ERROR' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(statusCode).toBe(statusCodes.ok)
      expect(
        getAllByText(
          body,
          'Sorry, there is a problem with the service - try again later'
        )
      ).toHaveLength(1)
    })

    it('status: invalid with NET_WEIGHT_CALCULATION_MISMATCH errorCode - should show calculated field mismatch message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'NET_WEIGHT_CALCULATION_MISMATCH',
              location: { header: 'NET_WEIGHT' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values within the automatically calculated fields that differ from the correctly calculated values'
      )
    })

    it('status: invalid with weight numeric errorCode - should show weight format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_NUMBER',
              location: { header: 'GROSS_WEIGHT' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains tonnage and weight values with formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with date errorCode on date header - should show date format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_VALID_DATE',
              location: { header: 'DATE_LOAD_LEFT_SITE' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains date formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with yes/no errorCode on yes/no header - should show yes/no format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_YES_OR_NO',
              location: { header: 'BAILING_WIRE_PROTOCOL' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains answers to Yes / No questions with formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with dropdown errorCode on dropdown header - should show dropdown format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_VALID_RECYCLABLE_PROPORTION_METHOD',
              location: {
                header: 'HOW_DID_YOU_CALCULATE_RECYCLABLE_PROPORTION'
              }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values in some fields that have not been selected from within the drop-down provided'
      )
    })

    it('status: invalid with MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS errorCode on free-text header - should show free-text message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_CONTAIN_ONLY_PERMITTED_CHARACTERS',
              location: { header: 'CONTAINER_NUMBER' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains unacceptable content within the fields that accept free text'
      )
    })

    it('status: invalid with ID errorCode on ID header - should show ID format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_3_DIGIT_ID',
              location: { header: 'OSR_ID' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values in ID fields with formats that do not match the 3 digit format of the examples provided in the summary log'
      )
    })

    it('status: invalid with percentage errorCode on percentage header - should show percentage format message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_AT_LEAST_ZERO',
              location: { header: 'RECYCLABLE_PROPORTION_PERCENTAGE' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains percentage values with formats that do not match the examples provided in the summary log'
      )
    })

    it('status: invalid with known errorCode but unrecognised header - should show safety net fallback', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_VALID_DATE',
              location: { header: 'SOME_DATE_FIELD' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains data that&#39;s been entered incorrectly'
      )
    })

    it('status: invalid with completely unrecognised errorCode - should show technical error as fallback', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'SOMETHING_TOTALLY_UNKNOWN',
              location: { header: 'WHATEVER' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with unknown errorCode alongside real failures - should strip technical error', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'MUST_BE_A_NUMBER',
              location: { header: 'GROSS_WEIGHT' }
            },
            {
              errorCode: 'SOMETHING_TOTALLY_UNKNOWN',
              location: { header: 'WHATEVER' }
            }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains tonnage and weight values with formats that do not match the examples provided in the summary log'
      )
      expect(result).not.toContain(
        'Sorry, there is a problem with the service - try again later'
      )
    })

    it('status: invalid with mixed errorCode failures - should show correct deduplicated messages', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: [
            {
              errorCode: 'NET_WEIGHT_CALCULATION_MISMATCH',
              location: { header: 'NET_WEIGHT' }
            },
            {
              errorCode: 'MUST_BE_A_NUMBER',
              location: { header: 'GROSS_WEIGHT' }
            },
            { errorCode: 'REGISTRATION_MISMATCH' }
          ]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        'The selected file contains values within the automatically calculated fields that differ from the correctly calculated values'
      )
      expect(result).toContain(
        'The selected file contains tonnage and weight values with formats that do not match the examples provided in the summary log'
      )
      expect(result).toContain(
        'Registration number on summary log&#39;s &#39;Cover&#39; tab is missing or incorrect'
      )
    })

    it('status: invalid with empty validation failures - should show technical error message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid,
        validation: {
          failures: []
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: invalid without validation object - should show technical error message', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.invalid
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain(
        'Sorry, there is a problem with the service - try again later'
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validation_failed - should show validation failures page with re-upload option', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed,
        validation: {
          failures: [{ errorCode: 'PROCESSING_FAILED' }]
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: validation_failed - should initiate upload for re-upload', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.validationFailed
      })

      await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    it('status: submission_failed - should show validation failures page with re-upload option', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submissionFailed
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Your summary log cannot be uploaded')
      expect(result).toContain('Upload updated XLSX file')
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('status: submission_failed - should initiate upload for re-upload', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.submissionFailed
      })

      await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(initiateSummaryLogUpload).toHaveBeenCalledWith({
        organisationId,
        registrationId,
        redirectUrl: `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/{summaryLogId}`,
        idToken: 'test-id-token'
      })
    })

    describe('status: superseded', () => {
      it('should show superseded page with link to organisation', async ({
        server
      }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('This summary log has been replaced')
        expect(result).toContain(
          'A newer summary log has been uploaded. This upload is no longer being processed.'
        )
        expect(result).toContain(`href="/organisations/${organisationId}"`)
        expect(result).toContain('Return to home')
      })

      it('should not enable client-side polling', async ({ server }) => {
        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(result).not.toStrictEqual(enablesClientSidePolling())
      })

      it('should not initiate upload', async ({ server }) => {
        const initialCallCount = mockInitiateSummaryLogUpload.mock.calls.length

        mockFetchSummaryLogStatus.mockResolvedValueOnce({
          status: summaryLogStatuses.superseded
        })

        await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        expect(initiateSummaryLogUpload).toHaveBeenCalledTimes(initialCallCount)
      })
    })

    it('status: superseded - should not enable client-side polling', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: summaryLogStatuses.superseded
      })

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).not.toStrictEqual(enablesClientSidePolling())
    })
  })

  describe('unexpected status handling', () => {
    it('unexpected status - should show error page', async ({ server }) => {
      mockFetchSummaryLogStatus.mockResolvedValueOnce({
        status: 'some_unknown_status'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toContain('Error checking status')
      expect(result).toContain('Unable to check upload status')
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('error handling', () => {
    it('should show 404 error page when summary log not found', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockRejectedValueOnce(Boom.notFound())

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(expect.stringContaining('Page not found'))
      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should show 500 error page when backend fetch fails', async ({
      server
    }) => {
      mockFetchSummaryLogStatus.mockRejectedValueOnce(
        Boom.internal('Failed to fetch')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Something went wrong')
      )
      expect(statusCode).toBe(statusCodes.internalServerError)
    })
  })

  describe('session validation', () => {
    it('should redirect to logged-out when not authenticated', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })
})

describe('#buildLoadsViewModel', () => {
  const noRows = { count: 0, rowIds: [] }

  test('returns no rows when loads is undefined', () => {
    const result = buildLoadsViewModel(undefined)

    expect(result).toStrictEqual({
      added: {
        included: noRows,
        excluded: noRows,
        total: 0
      },
      adjusted: {
        included: noRows,
        excluded: noRows,
        total: 0
      }
    })
  })

  test('returns no rows when loads is null', () => {
    const result = buildLoadsViewModel(null)

    expect(result).toStrictEqual({
      added: {
        included: noRows,
        excluded: noRows,
        total: 0
      },
      adjusted: {
        included: noRows,
        excluded: noRows,
        total: 0
      }
    })
  })

  test('returns empty structure when loads has empty structure', () => {
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
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] },
        total: 0
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] },
        total: 0
      }
    })
  })

  test('preserves count and rowIds from backend', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 150, rowIds: ['1001', '1002', '1003'] },
        excluded: { count: 50, rowIds: ['1004', '1005'] }
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      }
    })

    expect(result.added).toStrictEqual({
      included: { count: 150, rowIds: ['1001', '1002', '1003'] },
      excluded: { count: 50, rowIds: ['1004', '1005'] },
      total: 200
    })
  })

  test('preserves count and rowIds for adjusted loads', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      },
      adjusted: {
        included: { count: 120, rowIds: ['2001', '2002'] },
        excluded: { count: 30, rowIds: ['2003'] }
      }
    })

    expect(result.adjusted).toStrictEqual({
      included: { count: 120, rowIds: ['2001', '2002'] },
      excluded: { count: 30, rowIds: ['2003'] },
      total: 150
    })
  })

  test('handles partial loads data gracefully', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 1, rowIds: ['1001'] }
        // missing excluded
      }
      // missing adjusted
    })

    expect(result).toStrictEqual({
      added: {
        included: { count: 1, rowIds: ['1001'] },
        excluded: noRows,
        total: 1
      },
      adjusted: {
        included: noRows,
        excluded: noRows,
        total: 0
      }
    })
  })

  test('uses included and excluded counts, ignoring valid', () => {
    const result = buildLoadsViewModel({
      added: {
        valid: { count: 10, rowIds: [] },
        included: { count: 8, rowIds: ['1001', '1002', '1003'] },
        excluded: { count: 2, rowIds: ['1004', '1005'] }
      },
      adjusted: {
        included: { count: 0, rowIds: [] },
        excluded: { count: 0, rowIds: [] }
      }
    })

    expect(result.added).toStrictEqual({
      included: { count: 8, rowIds: ['1001', '1002', '1003'] },
      excluded: { count: 2, rowIds: ['1004', '1005'] },
      total: 10
    })
  })

  test('calculates total from included + excluded counts', () => {
    const result = buildLoadsViewModel({
      added: {
        included: { count: 8, rowIds: ['1001', '1002', '1003'] },
        excluded: { count: 7, rowIds: ['1004', '1005'] }
      },
      adjusted: {
        included: { count: 4, rowIds: ['2001', '2002', '2003', '2004'] },
        excluded: { count: 3, rowIds: ['2005', '2006', '2007'] }
      }
    })

    expect(result.added.total).toBe(15)
    expect(result.adjusted.total).toBe(7)
  })
})

describe('#getWasteRecordSectionNumber', () => {
  test('returns section 1 for REPROCESSOR_INPUT', () => {
    expect(getWasteRecordSectionNumber('REPROCESSOR_INPUT')).toBe(1)
  })

  test('returns section 3 for REPROCESSOR_OUTPUT', () => {
    expect(getWasteRecordSectionNumber('REPROCESSOR_OUTPUT')).toBe(3)
  })

  test('returns section 1 for EXPORTER', () => {
    expect(getWasteRecordSectionNumber('EXPORTER')).toBe(1)
  })

  test('returns undefined for undefined processingType', () => {
    expect(getWasteRecordSectionNumber(undefined)).toBeUndefined()
  })

  test('returns undefined for unknown processingType', () => {
    expect(
      getWasteRecordSectionNumber(
        /** @type {ProcessingType} */ ('UNKNOWN_TYPE')
      )
    ).toBeUndefined()
  })
})

describe('#buildLoadsByWasteRecordTypeViewModel', () => {
  /** @type {RawLoadsByWasteRecordType} */
  const mockLoadsByWasteRecordType = [
    {
      wasteRecordType: 'sentOn',
      sheetName: 'Sent on',
      added: {
        valid: { count: 2, rowIds: ['005', '006'] }
      },
      adjusted: {
        valid: { count: 0, rowIds: [] }
      },
      unchanged: {
        valid: { count: 0, rowIds: [] }
      }
    },
    {
      wasteRecordType: 'received',
      sheetName: 'Received',
      added: {
        valid: { count: 3, rowIds: ['001', '002', '003'] }
      },
      adjusted: {
        valid: { count: 1, rowIds: ['004'] }
      },
      unchanged: {
        valid: { count: 0, rowIds: [] }
      }
    }
  ]

  it('should map each entry to a view model with correct headingKey, sectionReference, added and adjusted totals', () => {
    const sectionRefs = {
      'summary-log:registeredOnly.sectionReference.reprocessor.received': '1',
      'summary-log:registeredOnly.sectionReference.reprocessor.sentOn': '2'
    }
    const localise = (key) => sectionRefs[key] ?? key
    const result = buildLoadsByWasteRecordTypeViewModel(
      mockLoadsByWasteRecordType,
      'REPROCESSOR_REGISTERED_ONLY',
      localise
    )

    expect(result).toStrictEqual([
      {
        headingKey: 'registeredOnly.sectionHeading.received',
        sectionReference: '1',
        added: { count: 3, rowIds: ['001', '002', '003'] },
        adjusted: { count: 1, rowIds: ['004'] }
      },
      {
        headingKey: 'registeredOnly.sectionHeading.sentOn',
        sectionReference: '2',
        added: { count: 2, rowIds: ['005', '006'] },
        adjusted: { count: 0, rowIds: [] }
      }
    ])
  })
})

describe('registered-only check view', () => {
  const organisationId = '123'
  const registrationId = '456'
  const summaryLogId = '789'
  const url = `/organisations/${organisationId}/registrations/${registrationId}/summary-logs/${summaryLogId}`

  /** @type {RawLoadsByWasteRecordType} */
  const mockLoadsByWasteRecordType = [
    {
      wasteRecordType: 'received',
      sheetName: 'Received',
      added: {
        valid: { count: 3, rowIds: ['001', '002', '003'] }
      },
      adjusted: {
        valid: { count: 1, rowIds: ['004'] }
      },
      unchanged: {
        valid: { count: 0, rowIds: [] }
      }
    },
    {
      wasteRecordType: 'exported',
      sheetName: 'Exported',
      added: {
        valid: { count: 2, rowIds: ['005', '006'] }
      },
      adjusted: {
        valid: { count: 0, rowIds: [] }
      },
      unchanged: {
        valid: { count: 0, rowIds: [] }
      }
    }
  ]

  /* eslint-disable vitest/max-expects -- single request, asserting all parts of the rendered page */
  it('status: validated with registered-only processing type and loadsByWasteRecordType - should render check-registered-only view with sections and counts', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER_REGISTERED_ONLY',
      loadsByWasteRecordType: mockLoadsByWasteRecordType
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    const dom = new JSDOM(result)
    const { body, title } = dom.window.document

    expect(title).toMatch(/^Summary log \|/)
    expect(statusCode).toBe(statusCodes.ok)

    const main = getByRole(body, 'main')
    const heading = getByRole(main, 'heading', { level: 1 })

    expect(heading.textContent).toContain('Check before confirming upload')
    expect(
      getByText(main, 'Check the following before confirming the upload.')
    ).toBeDefined()

    expect(getByRole(main, 'heading', { name: 'Loads received' })).toBeDefined()
    expect(getByRole(main, 'heading', { name: 'Loads exported' })).toBeDefined()

    expect(
      getByRole(main, 'heading', { name: '3 new loads have been added' })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'These are new loads that have been added to section 1 of your summary log.'
      )
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', { name: '1 existing load has been adjusted' })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'These are loads in section 1 of your summary log that have been changed since it was last uploaded.'
      )
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', { name: '2 new loads have been added' })
    ).toBeDefined()
    expect(getByText(main, 'Show 1 load')).toBeDefined()
  })
  /* eslint-enable vitest/max-expects */

  it('status: validated with registered-only processing type and zero counts - should show no-activity headings and descriptions', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'REPROCESSOR_REGISTERED_ONLY',
      loadsByWasteRecordType: [
        {
          wasteRecordType: 'received',
          sheetName: 'Received',
          added: {
            valid: { count: 0, rowIds: [] }
          },
          adjusted: {
            valid: { count: 0, rowIds: [] }
          },
          unchanged: {
            valid: { count: 0, rowIds: [] }
          }
        }
      ]
    })

    const { result } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    const dom = new JSDOM(result)
    const { body } = dom.window.document
    const main = getByRole(body, 'main')

    expect(
      getByRole(main, 'heading', { name: 'No new loads have been added' })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'No new loads have been added to section 1 of your summary log.'
      )
    ).toBeDefined()
    expect(
      getByRole(main, 'heading', {
        name: 'No existing loads have been adjusted'
      })
    ).toBeDefined()
    expect(
      getByText(
        main,
        'No loads in section 1 of your summary log have been changed since it was last uploaded.'
      )
    ).toBeDefined()
    expect(queryByText(main, /Show \d+ load/)).toBeNull()
  })

  it('status: validated with EXPORTER_REGISTERED_ONLY - should use correct section references per waste record type', async ({
    server
  }) => {
    const emptyCategory = {
      valid: { count: 0, rowIds: [] }
    }

    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER_REGISTERED_ONLY',
      loadsByWasteRecordType: [
        {
          wasteRecordType: 'received',
          sheetName: 'Received',
          added: emptyCategory,
          adjusted: emptyCategory,
          unchanged: emptyCategory
        },
        {
          wasteRecordType: 'exported',
          sheetName: 'Exported',
          added: emptyCategory,
          adjusted: emptyCategory,
          unchanged: emptyCategory
        },
        {
          wasteRecordType: 'sentOn',
          sheetName: 'Sent on',
          added: emptyCategory,
          adjusted: emptyCategory,
          unchanged: emptyCategory
        }
      ]
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    const dom = new JSDOM(result)
    const { body } = dom.window.document
    const main = getByRole(body, 'main')

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      getByText(
        main,
        'No new loads have been added to section 1 of your summary log.'
      )
    ).toBeDefined()
    expect(
      getByText(
        main,
        'No new loads have been added to section 2 and 3 of your summary log.'
      )
    ).toBeDefined()
    expect(
      getByText(
        main,
        'No new loads have been added to section 4 of your summary log.'
      )
    ).toBeDefined()
  })

  it('status: validated with registered-only processing type but missing loadsByWasteRecordType - should surface an error rather than silently render an empty page', async ({
    server
  }) => {
    mockFetchSummaryLogStatus.mockResolvedValueOnce({
      status: summaryLogStatuses.validated,
      processingType: 'EXPORTER_REGISTERED_ONLY'
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toStrictEqual(
      expect.stringContaining('Something went wrong')
    )
  })
})
