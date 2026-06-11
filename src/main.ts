import type {FunctionDef} from '#src/lib/makeFunctions.ts'
import type {MixinDef} from '#src/lib/makeMediaMixins.ts'
import type {Dict, StringDict} from 'more-types'
import type {Arrayable} from 'type-fest'
import type {Plugin} from 'vite'

import {update} from 'es-toolkit/compat'
import flattenString from 'flatten-string'

import makeFunctions from '#src/lib/makeFunctions.ts'
import makeMediaMixins from '#src/lib/makeMediaMixins.ts'

type Options = {
  additionalMixins?: StringDict
  /**
   * @default 'data-dark'
   */
  darkAttribute: string
  /**
   * @default 'dark'
   */
  darkClass: string
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
  /**
   * @default 'data-light'
   */
  lightAttribute: string
  /**
   * @default 'light'
   */
  lightClass: string
  mixins?: StringDict
  /**
   * @default ':root'
   */
  rootElement: string
  /**
   * what the expressions of the `light`/`dark` mixins should be based on
   * `media`: use the prefers-color-scheme media feature
   * `dom`: `html[data-light]` and `html[data-dark]` selectors
   * Both can be provided simultaneously, with the order determining precedence
   * @default ['attribute', 'media']
   */
  schemeSource: Arrayable<'attribute' | 'class' | 'media'>
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
  const easingSide = options?.easingSide ?? 'large'
  const flavors = options?.flavors ?? ['scss', 'sass']
  const schemeSources: Array<'attribute' | 'class' | 'media'> = ([] as Array<'attribute' | 'class' | 'media'>).concat(options?.schemeSource ?? ['attribute', 'media'])
  const rootElement = options?.rootElement ?? ':root'
  const lightAttribute = options?.lightAttribute ?? 'data-light'
  const darkAttribute = options?.darkAttribute ?? 'data-dark'
  const lightClass = options?.lightClass ?? 'light'
  const darkClass = options?.darkClass ?? 'dark'
  const wideWidthString = `${wideWidth}px`
  const tallHeightString = `${tallHeight}px`
  const defaultMixins: Dict<MixinDef> = {
    narrow: `screen and not (min-width: ${wideWidthString})`,
    wide: `screen and (min-width: ${wideWidthString})`,
    squat: `screen and not (min-height: ${tallHeightString})`,
    tall: `screen and (min-height: ${tallHeightString})`,
    static: '(prefers-reduced-motion: reduce)',
    hover: '(hover: hover)',
    aboveSrgb: '(color-gamut: p3) or (color-gamut: rec2020)',
  }
  defaultMixins.hoverless = `not (${defaultMixins.hover as string})`
  defaultMixins.motion = `not (${defaultMixins.static as string})`
  defaultMixins.srgb = `not (${defaultMixins.aboveSrgb as string})`
  const lightMedia = defaultTheme === 'light' ? '(prefers-color-scheme: light)' : 'not (prefers-color-scheme: dark)'
  const darkMedia = defaultTheme === 'dark' ? '(prefers-color-scheme: dark)' : 'not (prefers-color-scheme: light)'
  if (schemeSources.length === 1 && schemeSources[0] === 'media') {
    defaultMixins.light = lightMedia
    defaultMixins.dark = darkMedia
  } else {
    const buildBody = (theme: 'dark' | 'light', mediaQuery: string, sources: Array<'attribute' | 'class' | 'media'>) => {
      const lines: Array<string> = []
      for (const source of sources) {
        if (source === 'attribute') {
          const attribute = theme === 'light' ? lightAttribute : darkAttribute
          lines.push(`${rootElement}[${attribute}] & {`, '  @content;', '}')
        } else if (source === 'class') {
          const className = theme === 'light' ? lightClass : darkClass
          lines.push(`${rootElement}.${className} & {`, '  @content;', '}')
        } else {
          lines.push(`@media ${mediaQuery} {`, '  @content;', '}')
        }
      }
      return lines
    }
    defaultMixins.light = {
      body: buildBody('light', lightMedia, schemeSources),
    }
    defaultMixins.dark = {
      body: buildBody('dark', darkMedia, schemeSources),
    }
  }
  if (squareCategory === 'portrait') {
    defaultMixins.portrait = '(max-aspect-ratio: 1)'
    defaultMixins.landscape = `not (${defaultMixins.portrait})`
  } else {
    defaultMixins.landscape = '(min-aspect-ratio: 1)'
    defaultMixins.portrait = `not (${defaultMixins.landscape})`
  }
  let tweeningNarrow: string
  let tweeningWide: string
  let tweeningSquat: string
  let tweeningTall: string
  if (easingSide === 'center') {
    tweeningNarrow = `(($normalSensitivityRadius * ${wideWidthString} + ${wideWidthString}) - 100vw) / ($normalSensitivityRadius * 2 * ${wideWidthString})`
    tweeningWide = `(100vw - (${wideWidthString} - $normalSensitivityRadius * ${wideWidthString})) / ($normalSensitivityRadius * 2 * ${wideWidthString})`
    tweeningSquat = `(($normalSensitivityRadius * ${tallHeightString} + ${tallHeightString}) - 100vh) / ($normalSensitivityRadius * 2 * ${tallHeightString})`
    tweeningTall = `(100vh - (${tallHeightString} - $normalSensitivityRadius * ${tallHeightString})) / ($normalSensitivityRadius * 2 * ${tallHeightString})`
  } else if (easingSide === 'large') {
    tweeningNarrow = `(($normalSensitivityRadius * ${wideWidthString} + ${wideWidthString}) - 100vw) / ($normalSensitivityRadius * ${wideWidthString})`
    tweeningWide = `(100vw - ${wideWidthString}) / ($normalSensitivityRadius * ${wideWidthString})`
    tweeningSquat = `(($normalSensitivityRadius * ${tallHeightString} + ${tallHeightString}) - 100vh) / ($normalSensitivityRadius * ${tallHeightString})`
    tweeningTall = `(100vh - ${tallHeightString}) / ($normalSensitivityRadius * ${tallHeightString})`
  } else {
    tweeningNarrow = `(${wideWidthString} - 100vw) / ($normalSensitivityRadius * ${wideWidthString})`
    tweeningWide = `(100vw - (${wideWidthString} - $normalSensitivityRadius * ${wideWidthString})) / ($normalSensitivityRadius * ${wideWidthString})`
    tweeningSquat = `(${tallHeightString} - 100vh) / ($normalSensitivityRadius * ${tallHeightString})`
    tweeningTall = `(100vh - (${tallHeightString} - $normalSensitivityRadius * ${tallHeightString})) / ($normalSensitivityRadius * ${tallHeightString})`
  }
  const ease = (tweeningPosition: string) => {
    if (easing === 'sine') {
      return `((1 - cos(#{pi} * clamp(0, ${tweeningPosition}, 1))) * 0.5)`
    }
    return tweeningPosition
  }
  const prepareFunction = (tweeningSegment: string) => {
    const easedSegment = ease(tweeningSegment)
    return [
      '@if $from == null and $to == null {',
      '  $from: 0;',
      '  $to: 1;',
      '}',
      '@if $to == null {',
      '  $to: $from * 0;',
      '}',
      '$lowerSection: min($from, $to);',
      '$upperSection: max($from, $to);',
      '$scaler: calc($to - $from);',
      '$normalSensitivityRadius: $sensitivityRadius * 0.01;',
      `@return clamp($lowerSection, $from + $scaler * ${easedSegment}, $upperSection);`,
    ]
  }
  const defaultFunctions: Record<string, FunctionDef> = {
    toNarrow: {
      parameters: ['$from: null', '$to: null', `$sensitivityRadius: ${sensitivityRadius}`],
      body: prepareFunction(tweeningNarrow),
    },
    toWide: {
      parameters: ['$from: null', '$to: null', `$sensitivityRadius: ${sensitivityRadius}`],
      body: prepareFunction(tweeningWide),
    },
    toSquat: {
      parameters: ['$from: null', '$to: null', `$sensitivityRadius: ${sensitivityRadius}`],
      body: prepareFunction(tweeningSquat),
    },
    toTall: {
      parameters: ['$from: null', '$to: null', `$sensitivityRadius: ${sensitivityRadius}`],
      body: prepareFunction(tweeningTall),
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
        const mixinCode = makeMediaMixins(mixins, flavor)
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
