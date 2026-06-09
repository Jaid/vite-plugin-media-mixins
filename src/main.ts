import type {FunctionDef} from '#src/lib/makeFunctions.ts'
import type {StringDict} from 'more-types'
import type {Plugin} from 'vite'

import {update} from 'es-toolkit/compat'
import flattenString from 'flatten-string'

import makeFunctions from '#src/lib/makeFunctions.ts'
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
   * width of the interpolation zone for `toNarrow`/`toWide` (centered on `wideWidth`)
   * @default 20
   */
  transitionZone?: number
  /**
   * minimum amount of pixels that enables “wide” and disables “narrow”
   * @default 600
   */
  wideWidth?: number
}

const mediaMixinsPlugin = (options?: Options) => {
  const wideWidth = options?.wideWidth ?? 600
  const tallHeight = options?.tallHeight ?? 600
  const transitionZone = options?.transitionZone ?? 20
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
  const narrowEnd = wideWidth - transitionZone / 2
  const wideStart = wideWidth + transitionZone / 2
  const squatEnd = tallHeight - transitionZone / 2
  const tallStart = tallHeight + transitionZone / 2
  const ratioNarrow = `clamp(0, calc(${wideStart}px - 100vw) / ${transitionZone}, 1)`
  const ratioWide = `clamp(0, calc(100vw - ${narrowEnd}px) / ${transitionZone}, 1)`
  const ratioSquat = `clamp(0, calc(${tallStart}px - 100vh) / ${transitionZone}, 1)`
  const ratioTall = `clamp(0, calc(100vh - ${squatEnd}px) / ${transitionZone}, 1)`
  const defaultFunctions: Record<string, FunctionDef> = {
    toNarrow: {
      parameters: ['$from: 0', '$to: 1'],
      expression: `calc(#{$from} + (#{$to} - #{$from}) * ${ratioNarrow})`,
    },
    toWide: {
      parameters: ['$from: 0', '$to: 1'],
      expression: `calc(#{$from} + (#{$to} - #{$from}) * ${ratioWide})`,
    },
    toSquat: {
      parameters: ['$from: 0', '$to: 1'],
      expression: `calc(#{$from} + (#{$to} - #{$from}) * ${ratioSquat})`,
    },
    toTall: {
      parameters: ['$from: 0', '$to: 1'],
      expression: `calc(#{$from} + (#{$to} - #{$from}) * ${ratioTall})`,
    },
  }
  const mixins = {
    ...options?.mixins || defaultMixins,
    ...options?.additionalMixins,
  }
  const plugin: Plugin = {
    name: 'media-mixins',
    config(config) {
      for (const flavor of flavors) {
        const mixinCode = makeMixins(mixins, flavor)
        const functionCode = makeFunctions(defaultFunctions, flavor)
        const newContent = flattenString.paragraphs([mixinCode, functionCode])
        update(config, `css.preprocessorOptions.${flavor}.additionalData`, content => {
          const combined = flattenString.paragraphs(content, newContent)
          return `${combined}\n\n`
        })
      }
    },
  }
  return plugin
}

export default mediaMixinsPlugin
