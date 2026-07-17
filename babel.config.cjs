/** @import { TransformOptions } from '@babel/core' */

/**
 * @type {TransformOptions}
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
