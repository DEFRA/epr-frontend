export default {
  '**/*.{js,json,md}': 'prettier --write',
  '{src,scripts}/**/*.js': ['npm run lint:fix'],
  'src/**/*.scss': ['stylelint --fix'],
  '*': () => 'gitleaks protect --staged --no-banner --verbose'
}
