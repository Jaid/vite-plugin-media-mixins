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
   * width (in percent) of the interpolation zone for `toNarrow`/`toWide` (centered on `wideWidth`)
   * @default 20
   */
  sensitivityRadius?: number
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
  const sensitivityRadius = options?.sensitivityRadius ?? 20
  const defaultTheme = options?.defaultTheme ?? 'dark'
  const squareCategory = options?.squareCategory ?? 'portrait'
  const flavors = options?.flavors ?? ['scss', 'sass']
  const wideWidthString = `${wideWidth}px`
  const tallHeightString = `${tallHeight}px`
  const defaultMixins: StringDict = {
    narrow: `screen and not (min-width: ${wideWidthString})`,
    wide: `screen and (min-width: ${wideWidthString})`,
    squat: `screen and not (min-height: ${tallHeightString})`,
    tall: `screen and (min-height: ${tallHeightString})`,
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
  const defaultFunctions: Record<string, FunctionDef> = {
    toNarrow: {
      parameters: ['$from: 0', '$to: 1', `$sensitivityRadius: ${sensitivityRadius}`],
      body: [
        '@if $from == null and $to == null {',
        '  $from: 0;',
        '  $to: 1;',
        '}',
        '@if $to == null {',
        '  $to: 0;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if comparable($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        '$sensitivityDiameter: $sensitivityRadius * 2;',
        `@return clamp($lowerSection, $from + $scaler * (($normalSensitivityRadius * ${wideWidthString} + ${wideWidthString}) - 100vw) / $sensitivityDiameter, $upperSection);`,
      ],
    },
    toWide: {
      parameters: ['$from: 0', '$to: 1', `$sensitivityRadius: ${sensitivityRadius}`],
      body: [
        '@if $from == null and $to == null {',
        '  $from: 0;',
        '  $to: 1;',
        '}',
        '@if $to == null {',
        '  $to: 0;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if comparable($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        '$sensitivityDiameter: $sensitivityRadius * 2;',
        `@return clamp($lowerSection, $from + $scaler * (100vw - (${wideWidthString} - $normalSensitivityRadius * ${wideWidthString})) / $sensitivityDiameter, $upperSection);`,
      ],
    },
    toSquat: {
      parameters: ['$from: 0', '$to: 1', `$sensitivityRadius: ${sensitivityRadius}`],
      body: [
        '@if $from == null and $to == null {',
        '  $from: 0;',
        '  $to: 1;',
        '}',
        '@if $to == null {',
        '  $to: 0;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if comparable($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        '$sensitivityDiameter: $sensitivityRadius * 2;',
        `@return clamp($lowerSection, $from + $scaler * (($normalSensitivityRadius * ${tallHeightString} + ${tallHeightString}) - 100vh) / $sensitivityDiameter, $upperSection);`,
      ],
    },
    toTall: {
      parameters: ['$from: 0', '$to: 1', `$sensitivityRadius: ${sensitivityRadius}`],
      body: [
        '@if $from == null and $to == null {',
        '  $from: 0;',
        '  $to: 1;',
        '}',
        '@if $to == null {',
        '  $to: 0;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if comparable($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        '$sensitivityDiameter: $sensitivityRadius * 2;',
        `@return clamp($lowerSection, $from + $scaler * (100vh - (${tallHeightString} - $normalSensitivityRadius * ${tallHeightString})) / $sensitivityDiameter, $upperSection);`,
      ],
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
