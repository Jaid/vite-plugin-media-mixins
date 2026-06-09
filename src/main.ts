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
   * easing curve for interpolation functions
   * @default 'sine'
   */
  easing?: 'linear' | 'sine'
  /**
   * where to put the window of interpolation when the viewport changes
   * `'center'`: half before and half after the breakpoint
   * `'large'`: all the interpolation sits on the large side, so the animation is finished at the exact moment of reaching the breakpoint while the viewport shrinks
   * `'small'`: all the interpolation sits on the small side, so the animation is finished at the exact moment of reaching the breakpoint while the viewport grows
   * @default 'large'
   */
  easingSide?: 'center' | 'large' | 'small'
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
  const easing = options?.easing ?? 'sine'
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
  const tNarrow = `(($normalSensitivityRadius * ${wideWidthString} + ${wideWidthString}) - 100vw) / ($normalSensitivityRadius * 2 * ${wideWidthString})`
  const tWide = `(100vw - (${wideWidthString} - $normalSensitivityRadius * ${wideWidthString})) / ($normalSensitivityRadius * 2 * ${wideWidthString})`
  const tSquat = `(($normalSensitivityRadius * ${tallHeightString} + ${tallHeightString}) - 100vh) / ($normalSensitivityRadius * 2 * ${tallHeightString})`
  const tTall = `(100vh - (${tallHeightString} - $normalSensitivityRadius * ${tallHeightString})) / ($normalSensitivityRadius * 2 * ${tallHeightString})`
  const ease = (t: string) => {
    if (easing === 'sine') {
      return `((1 - cos(3.14 * clamp(0, ${t}, 1))) / 2)`
    }
    return t
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
        '@if math.is-unitless($from) {',
        '  $from: $from * 1px;',
        '}',
        '@if math.is-unitless($to) {',
        '  $to: $to * 1px;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if math.compatible($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        `@return clamp($lowerSection, $from + $scaler * ${ease(tNarrow)}, $upperSection);`,
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
        '@if math.is-unitless($from) {',
        '  $from: $from * 1px;',
        '}',
        '@if math.is-unitless($to) {',
        '  $to: $to * 1px;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if math.compatible($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        `@return clamp($lowerSection, $from + $scaler * ${ease(tWide)}, $upperSection);`,
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
        '@if math.is-unitless($from) {',
        '  $from: $from * 1px;',
        '}',
        '@if math.is-unitless($to) {',
        '  $to: $to * 1px;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if math.compatible($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        `@return clamp($lowerSection, $from + $scaler * ${ease(tSquat)}, $upperSection);`,
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
        '@if math.is-unitless($from) {',
        '  $from: $from * 1px;',
        '}',
        '@if math.is-unitless($to) {',
        '  $to: $to * 1px;',
        '}',
        '$lowerSection: min($from, $to);',
        '$upperSection: max($from, $to);',
        '$scaler: calc($to - $from);',
        '@if math.compatible($from, $to) {',
        '  $lowerSection: min($from, $to);',
        '  $upperSection: max($from, $to);',
        '}',
        '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
        `@return clamp($lowerSection, $from + $scaler * ${ease(tTall)}, $upperSection);`,
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
        const header = flavor === 'sass' ? "@use 'sass:math'" : '@use "sass:math";'
        update(config, `css.preprocessorOptions.${flavor}.additionalData`, content => {
          const combined = flattenString.paragraphs(header, content, mixinCode, functionCode)
          return `${combined}\n`
        })
      }
    },
  }
  return plugin
}

export default mediaMixinsPlugin
