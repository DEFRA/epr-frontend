import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

// TODO adding a comment to see the type-check summary output

const mockStartServer = vi.fn()
const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()
const mockCreateLogger = vi.fn()

vi.mock(import('./server/common/helpers/start-server.js'), () => ({
  startServer: mockStartServer
}))

vi.mock(import('./server/common/helpers/logging/logger.js'), () => ({
  createLogger: mockCreateLogger
}))

describe('#index', () => {
  let originalExitCode

  beforeAll(() => {
    mockCreateLogger.mockReturnValue({
      info: mockLoggerInfo,
      error: mockLoggerError
    })
    mockStartServer.mockResolvedValue()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    originalExitCode = process.exitCode
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  describe('when module is loaded', () => {
    test('should call startServer', async () => {
      await import('./index.js')

      expect(mockStartServer).toHaveBeenCalledWith()
    })
  })

  describe('when unhandledRejection occurs', () => {
    const mockError = new Error('Test unhandled rejection')

    beforeEach(async () => {
      await import('./index.js')

      process.emit('unhandledRejection', mockError)
    })

    test('should create logger', () => {
      expect(mockCreateLogger).toHaveBeenCalledWith()
    })

    test('should log error with message', () => {
      expect(mockLoggerError).toHaveBeenCalledWith({
        message: 'Unhandled rejection',
        err: mockError
      })
    })

    test('should not log separate info message', () => {
      expect(mockLoggerInfo).not.toHaveBeenCalled()
    })

    test('should set process exitCode to 1', () => {
      expect(process.exitCode).toBe(1)
    })
  })

  describe('when unhandledRejection occurs with a non-Error reason', () => {
    beforeEach(async () => {
      await import('./index.js')

      process.emit('unhandledRejection', 'plain string rejection')
    })

    test('should wrap the reason in an Error before logging', () => {
      expect(mockLoggerError).toHaveBeenCalledWith({
        message: 'Unhandled rejection',
        err: expect.any(Error)
      })

      const [{ err }] = mockLoggerError.mock.calls[0]

      expect(err.message).toBe('plain string rejection')
    })

    test('should set process exitCode to 1', () => {
      expect(process.exitCode).toBe(1)
    })
  })
})
