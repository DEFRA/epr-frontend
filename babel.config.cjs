/**
 * @type {import('@babel/core').TransformOptions}
 */
module.exports = {
  browserslistEnv: 'node',
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false
      }
    ]
  ]
}
