import type {Dict} from 'more-types'
import type {Plugin} from 'vite'

import {update} from 'es-toolkit/compat'
import flattenString from 'flatten-string'

import makeMixins from '#src/lib/makeMixins.ts'

type Options = {
  additionalMixins?: Dict<string>
  mixins?: Dict<string>
}

const mediaMixinsPlugin = (options?: Options) => {
  const defaultMixins = {
    narrow: 'screen and (max-width: 599px)',
    squat: 'screen and (max-height: 599px)',
    static: '(prefers-reduced-motion: reduce)',
    motion: 'not (prefers-reduced-motion: reduce)',
    light: '(prefers-color-scheme: light)',
    dark: '(prefers-color-scheme: dark)',
  }
  const mixins = {
    ...options?.mixins || defaultMixins,
    ...options?.additionalMixins,
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

export default mediaMixinsPlugin
