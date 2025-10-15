export const getDisplayName = ({ firstName, lastName }) =>
  [firstName, lastName].filter(Boolean).join(' ')
