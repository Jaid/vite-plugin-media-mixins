import type {UserConfig} from 'vite'

import {expect, test} from 'bun:test'

const {default: vitePluginMediaMixins} = await import('#src/main.ts')
const getScssAdditionalData = (config: UserConfig) => config.css?.preprocessorOptions?.scss?.additionalData as string | undefined
const getSassAdditionalData = (config: UserConfig) => config.css?.preprocessorOptions?.sass?.additionalData as string | undefined
test('plugin has correct name', () => {
  const plugin = vitePluginMediaMixins()
  expect(plugin.name).toBe('media-mixins')
  expect(plugin.config).toBeFunction()
})
test('generates scss mixins and parameterized functions with default wideWidth=600, transitionZone=20', () => {
  const plugin = vitePluginMediaMixins({flavors: ['scss']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getScssAdditionalData(config)
  expect(additionalData).toBeString()
  expect(additionalData).toContain('@mixin narrow')
  expect(additionalData).toContain('@mixin wide')
  expect(additionalData).toContain('@function toNarrow($from: 0, $to: 1) {')
  expect(additionalData).toContain('@function toWide($from: 0, $to: 1) {')
  expect(additionalData).toContain('clamp(0, calc(610px - 100vw) / 20, 1)')
  expect(additionalData).toContain('clamp(0, calc(100vw - 590px) / 20, 1)')
  expect(additionalData).toContain('calc(#{$from} + (#{$to} - #{$from}) *')
})
test('generates sass mixins and parameterized functions', () => {
  const plugin = vitePluginMediaMixins({flavors: ['sass']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getSassAdditionalData(config)
  expect(additionalData).toBeString()
  expect(additionalData).toContain('@mixin narrow')
  expect(additionalData).toContain('@function toNarrow($from: 0, $to: 1)\n')
  expect(additionalData).toContain('clamp(0, calc(610px - 100vw) / 20, 1)')
  expect(additionalData).toContain('@return calc(#{$from} + (#{$to} - #{$from}) *')
})
test('respects custom wideWidth and transitionZone', () => {
  const plugin = vitePluginMediaMixins({
    wideWidth: 800,
    transitionZone: 40,
    flavors: ['scss'],
  })
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getScssAdditionalData(config)
  expect(additionalData).toContain('clamp(0, calc(820px - 100vw) / 40, 1)')
  expect(additionalData).toContain('clamp(0, calc(100vw - 780px) / 40, 1)')
})
