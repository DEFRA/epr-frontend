import { describe, expect, it, vi } from 'vitest'
import { controller } from './controller.js'

describe('organisation controller', () => {
  it('should require defra-id authentication', () => {
    expect(controller.options.auth).toBe('defra-id')
  })

  it('should redirect to safe referrer from flash', async () => {
    const mockRequest = {
      yar: {
        flash: vi.fn().mockReturnValue(['/dashboard'])
      },
      localiseUrl: vi.fn()
    }
    const mockH = {
      redirect: vi.fn()
    }

    await controller.handler(mockRequest, mockH)

    expect(mockRequest.yar.flash).toHaveBeenCalledWith('referrer')
    expect(mockH.redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('should redirect to home when no referrer in flash', async () => {
    const mockRequest = {
      yar: {
        flash: vi.fn().mockReturnValue(undefined)
      },
      localiseUrl: vi.fn()
    }
    const mockH = {
      redirect: vi.fn()
    }

    await controller.handler(mockRequest, mockH)

    expect(mockRequest.yar.flash).toHaveBeenCalledWith('referrer')
    expect(mockH.redirect).toHaveBeenCalledWith('/')
  })

  it('should sanitize unsafe redirect URLs', async () => {
    const mockRequest = {
      yar: {
        flash: vi.fn().mockReturnValue(['https://evil.com'])
      },
      localiseUrl: vi.fn()
    }
    const mockH = {
      redirect: vi.fn()
    }

    await controller.handler(mockRequest, mockH)

    expect(mockH.redirect).toHaveBeenCalledWith('/')
  })
})
