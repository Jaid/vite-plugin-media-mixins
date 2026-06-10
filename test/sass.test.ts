import type {FunctionDef} from '#src/lib/makeFunctions.ts'
import type {StringDict} from 'more-types'

import {expect, test} from 'bun:test'

import {transform} from 'lightningcss'
import {compileString} from 'sass'

import makeFunctions from '#src/lib/makeFunctions.ts'
import makeMixins from '#src/lib/makeMediaMixins.ts'

type Variant = 'sass' | 'scss'

const wideWidth = 600
const tallHeight = 600
const transitionZone = 20
const narrowEnd = wideWidth - transitionZone / 2
const wideStart = wideWidth + transitionZone / 2
const squatEnd = tallHeight - transitionZone / 2
const tallStart = tallHeight + transitionZone / 2
const mixins: StringDict = {
  narrow: `screen and not (min-width: ${wideWidth}px)`,
  wide: `screen and (min-width: ${wideWidth}px)`,
  squat: `screen and not (min-height: ${tallHeight}px)`,
  tall: `screen and (min-height: ${tallHeight}px)`,
}
const ratioNarrow = `clamp(0, calc(${wideStart}px - 100vw) / ${transitionZone}, 1)`
const ratioWide = `clamp(0, calc(100vw - ${narrowEnd}px) / ${transitionZone}, 1)`
const ratioSquat = `clamp(0, calc(${tallStart}px - 100vh) / ${transitionZone}, 1)`
const ratioTall = `clamp(0, calc(100vh - ${squatEnd}px) / ${transitionZone}, 1)`
const functions: Record<string, FunctionDef> = {
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
const compileAndCheck = (variant: Variant) => {
  const syntax = variant === 'sass' ? 'indented' : 'scss'
  const prelude = `${makeMixins(mixins, variant)}

${makeFunctions(functions, variant)}`
  let userCode: string
  if (variant === 'sass') {
    userCode = `.foo
  +narrow
    color: red
  +wide
    color: blue
  width: toNarrow()
  margin: toWide(10px, 20px)
  padding: toSquat()
  height: toTall(1em, 2em)`
  } else {
    userCode = `.foo {
  @include narrow {
    color: red;
  }
  @include wide {
    color: blue;
  }
  width: toNarrow();
  margin: toWide(10px, 20px);
  padding: toSquat();
  height: toTall(1em, 2em);
}`
  }
  const result = compileString(`${prelude}

${userCode}`, {syntax})
  expect(result.css).toBeString()
  expect(result.css).not.toBeEmpty()
  return result.css
}
const validateWithLightningcss = (css: string) => {
  const result = transform({
    filename: 'test.css',
    code: Buffer.from(css),
    minify: false,
  })
  expect(result.code).toBeInstanceOf(Buffer)
  return result.code.toString()
}
test('scss compiles and produces valid CSS', () => {
  const css = compileAndCheck('scss')
  // Verify mixin expansion
  expect(css).toContain('@media screen and not (min-width: 600px)')
  expect(css).toContain('@media screen and (min-width: 600px)')
  // Verify function calls expanded (Sass strips redundant calc() inside clamp)
  expect(css).toContain('calc(0 + (1 - 0) * clamp(0, (610px - 100vw) / 20, 1))')
  expect(css).toContain('calc(10px + (20px - 10px) * clamp(0, (100vw - 590px) / 20, 1))')
  expect(css).toContain('calc(0 + (1 - 0) * clamp(0, (610px - 100vh) / 20, 1))')
  expect(css).toContain('calc(1em + (2em - 1em) * clamp(0, (100vh - 590px) / 20, 1))')
  // Validate with lightningcss (should not throw)
  const validated = validateWithLightningcss(css)
  expect(validated).toContain('clamp(0,')
})
test('sass (indented) compiles and produces valid CSS', () => {
  const css = compileAndCheck('sass')
  expect(css).toContain('@media screen and not (min-width: 600px)')
  expect(css).toContain('@media screen and (min-width: 600px)')
  expect(css).toContain('calc(0 + (1 - 0) * clamp(0, (610px - 100vw) / 20, 1))')
  const validated = validateWithLightningcss(css)
  expect(validated).toContain('clamp(0,')
})
test('lightningcss parses and validates clamp expressions', () => {
  const result = transform({
    filename: 'test.css',
    code: Buffer.from('.foo { width: clamp(0, calc(610px - 100vw) / 20, 1); }'),
    minify: false,
  })
  expect(result.code.toString()).toContain('clamp(0, 30.5px - 5vw, 1)')
})
test('toNarrow without args returns the raw ratio (0 at wide, 1 at narrow)', () => {
  const result = compileString(`
@function toNarrow($from: 0, $to: 1) {
  @return calc(#{$from} + (#{$to} - #{$from}) * clamp(0, calc(610px - 100vw) / 20, 1));
}

.foo {
  width: toNarrow();
}
  `.trim(), {syntax: 'scss'})
  // Sass simplifies calc() inside clamp() but the expression is correct
  expect(result.css).toContain('calc(0 + (1 - 0) * clamp(0, (610px - 100vw) / 20, 1))')
})
test('toNarrow with two args interpolates between them', () => {
  const result = compileString(`
@function toNarrow($from: 0, $to: 1) {
  @return calc(#{$from} + (#{$to} - #{$from}) * clamp(0, calc(610px - 100vw) / 20, 1));
}

.foo {
  width: toNarrow(5px, 15px);
}
  `.trim(), {syntax: 'scss'})
  expect(result.css).toContain('calc(5px + (15px - 5px) * clamp(0, (610px - 100vw) / 20, 1))')
})
