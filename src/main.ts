import type {StringDict} from 'more-types'
import type {Plugin} from 'vite'

import {update} from 'es-toolkit/compat'
import flattenString from 'flatten-string'

import makeMixins from '#src/lib/makeMixins.ts'

type Options = {
  additionalMixins?: StringDict
  /**
   * @default 'dark'
   */
  defaultTheme?: 'dark' | 'light'
  /**
   * @default ['scss', 'sass']
   */
  flavors?: Array<'sass' | 'scss'>
  mixins?: StringDict
  /**
   * what category to snap to when the aspect ratio is exactly 1:1
   * @default 'portrait'
   */
  squareCategory?: 'landscape' | 'portrait'
  /**
   * minimum amount of pixels that enables “tall” and disables “squat”
   * @default 600
   */
  tallHeight?: number
  /**
   * minimum amount of pixels that enables “wide” and disables “narrow”
   * @default 600
   */
  wideWidth?: number
}

const mediaMixinsPlugin = (options?: Options) => {
  const wideWidth = options?.wideWidth ?? 600
  const tallHeight = options?.tallHeight ?? 600
  const defaultTheme = options?.defaultTheme ?? 'dark'
  const squareCategory = options?.squareCategory ?? 'portrait'
  const flavors = options?.flavors ?? ['scss', 'sass']
  const defaultMixins: StringDict = {
    narrow: `screen and not (min-width: ${wideWidth}px)`,
    wide: `screen and (min-width: ${wideWidth}px)`,
    squat: `screen and not (min-height: ${tallHeight}px)`,
    tall: `screen and (min-height: ${tallHeight}px)`,
    static: '(prefers-reduced-motion: reduce)',
    hover: '(hover: hover)',
    aboveSrgb: '(color-gamut: p3) or (color-gamut: rec2020)',
  }
  defaultMixins.hoverless = `not (${defaultMixins.hover})`
  defaultMixins.motion = `not (${defaultMixins.static})`
  defaultMixins.srgb = `not (${defaultMixins.aboveSrgb})`
  if (defaultTheme === 'light') {
    defaultMixins.light = '(prefers-color-scheme: light)'
    defaultMixins.dark = `not (${defaultMixins.light})`
  } else {
    defaultMixins.dark = '(prefers-color-scheme: dark)'
    defaultMixins.light = `not (${defaultMixins.dark})`
  }
  if (squareCategory === 'portrait') {
    defaultMixins.portrait = '(max-aspect-ratio: 1)'
    defaultMixins.landscape = `not (${defaultMixins.portrait})`
  } else {
    defaultMixins.landscape = '(min-aspect-ratio: 1)'
    defaultMixins.portrait = `not (${defaultMixins.landscape})`
  }
  const mixins = {
    ...options?.mixins || defaultMixins,
    ...options?.additionalMixins,
  }
  const plugin: Plugin = {
    name: 'media-mixins',
    config(config) {
      for (const flavor of flavors) {
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
