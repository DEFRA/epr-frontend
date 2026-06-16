import { vi } from 'vitest'

/**
 * Create a mock logger with every `TypedLogger` method as a `vi` mock. Use in
 * place of partial `{ warn: vi.fn() }` literals: the result satisfies the full
 * `TypedLogger` shape at call sites while keeping mock types for assertions.
 */
export const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn()
})
