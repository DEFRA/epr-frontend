const getSafeRedirect = (redirect) =>
  !redirect?.startsWith('/') || redirect.startsWith('//') ? '/' : redirect

export { getSafeRedirect }
