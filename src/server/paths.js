export const paths = Object.freeze({
  auth: Object.freeze({
    defraId: Object.freeze({
      callback: '/auth/callback',
      login: '/login',
      organisation: '/auth/organisation'
    }),
    entraId: Object.freeze({
      callback: '/auth/callback/entra',
      login: '/regulators/login'
    }),
    postLogoutRedirect: '/auth/logout'
  }),
  loggedOut: '/logged-out',
  logout: '/logout',
  regulators: Object.freeze({
    home: '/regulators/home',
    notAuthorised: '/regulators/not-authorised'
  }),
  start: '/start'
})
