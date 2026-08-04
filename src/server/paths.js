export const paths = Object.freeze({
  auth: Object.freeze({
    defraId: Object.freeze({
      callback: '/auth/callback',
      login: '/login',
      logout: '/auth/logout',
      organisation: '/auth/organisation'
    }),
    entraId: Object.freeze({
      callback: '/auth/callback/entra',
      login: '/regulators/login'
    })
  }),
  loggedOut: '/logged-out',
  start: '/start'
})
