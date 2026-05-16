import type {Plugin} from 'vite'

import {update} from 'es-toolkit/compat'
import flattenString from 'flatten-string'

import makeMixins from '#src/lib/makeMixins.ts'

function titlePlugin() {
  const mixins = {
    narrow: 'screen and (max-width: 599px)',
    squat: 'screen and (max-height: 599px)',
    static: '(prefers-reduced-motion: reduce)',
    light: '(prefers-color-scheme: light)',
  }
  const plugin: Plugin = {
    name: 'media-mixins',
    config(config) {
      update(config, 'css.preprocessorOptions.scss.additionalData', content => {
        return flattenString.paragraphs(content, makeMixins(mixins))
      })
      update(config, 'css.preprocessorOptions.sass.additionalData', content => {
        return flattenString.paragraphs(content, makeMixins(mixins, 'sass'))
      })
    },
  }
  return plugin
}

export const makeTitlePlugin = titlePlugin

export default makeTitlePlugin()
