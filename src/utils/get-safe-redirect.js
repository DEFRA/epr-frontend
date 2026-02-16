const SAFE_REDIRECT_FALLBACK = '/'
const SAFE_REDIRECT_ORIGIN = 'http://localhost'

const hasUnsafeRedirectCharacters = (value) => {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f || character === '\\') {
      return true
    }
  }

  return false
}

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
    hasUnsafeRedirectCharacters(candidate)
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
