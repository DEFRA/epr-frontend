const SAFE_REDIRECT_FALLBACK = '/'
const SAFE_REDIRECT_ORIGIN = 'http://localhost'
const UNSAFE_REDIRECT_CHARACTERS = /[\u0000-\u001F\u007F\\]/

const getSafeRedirect = (redirect) => {
  if (typeof redirect !== 'string') {
    return SAFE_REDIRECT_FALLBACK
  }

  const candidate = redirect.trim()

  if (
    candidate.length === 0 ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('://') ||
    UNSAFE_REDIRECT_CHARACTERS.test(candidate)
  ) {
    return SAFE_REDIRECT_FALLBACK
  }

  try {
    const parsedUrl = new URL(candidate, SAFE_REDIRECT_ORIGIN)

    if (
      parsedUrl.origin !== SAFE_REDIRECT_ORIGIN ||
      !parsedUrl.pathname.startsWith('/') ||
      parsedUrl.pathname.startsWith('//')
    ) {
      return SAFE_REDIRECT_FALLBACK
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
  } catch {
    return SAFE_REDIRECT_FALLBACK
  }
}

export { getSafeRedirect }
