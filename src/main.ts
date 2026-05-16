import type {Plugin} from 'vite'

import {update} from 'es-toolkit/compat'
import flattenString from 'flatten-string'

import makeMixins from '#src/lib/makeMixins.ts'

export default function mediaMixinsPlugin() {
  const mixins = {
    narrow: 'screen and (max-width: 599px)',
    squat: 'screen and (max-height: 599px)',
    static: '(prefers-reduced-motion: reduce)',
    light: '(prefers-color-scheme: light)',
  }
  const plugin: Plugin = {
    name: 'media-mixins',
    config(config) {
      for (const flavor of ['scss', 'sass'] as const) {
        update(config, `css.preprocessorOptions.${flavor}.additionalData`, content => {
          const newContent = flattenString.paragraphs(content, makeMixins(mixins, flavor))
          return `${newContent}\n\n`
        })
      }
    },
  }
  return plugin
}
