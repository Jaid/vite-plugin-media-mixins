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
test('generates scss mixins and body-based functions with defaults', () => {
  const plugin = vitePluginMediaMixins({flavors: ['scss']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getScssAdditionalData(config)
  expect(additionalData).toBeString()
  expect(additionalData).toContain('@mixin narrow')
  expect(additionalData).toContain('@mixin wide')
  expect(additionalData).toContain('@function toNarrow($from: null, $to: null, $sensitivityRadius: 20) {')
  expect(additionalData).toContain('@function toWide($from: null, $to: null, $sensitivityRadius: 20) {')
  expect(additionalData).toContain('@if $from == null and $to == null')
  expect(additionalData).toContain('@if $to == null')
  expect(additionalData).toContain('$normalSensitivityRadius * 600px')
  expect(additionalData).toContain('100vw')
  expect(additionalData).toContain('100vh')
})
test('generates sass mixins and body-based functions', () => {
  const plugin = vitePluginMediaMixins({flavors: ['sass']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getSassAdditionalData(config)
  expect(additionalData).toBeString()
  expect(additionalData).toContain('@mixin narrow')
  expect(additionalData).toContain('@function toNarrow($from: null, $to: null, $sensitivityRadius: 20)\n')
  expect(additionalData).toContain('@if $from == null and $to == null')
  expect(additionalData).toContain('$normalSensitivityRadius * 600px')
})
test('respects custom wideWidth and sensitivityRadius', () => {
  const plugin = vitePluginMediaMixins({
    wideWidth: 800,
    sensitivityRadius: 40,
    flavors: ['scss'],
  })
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getScssAdditionalData(config)
  expect(additionalData).toContain('screen and not (min-width: 800px)')
  expect(additionalData).toContain('$normalSensitivityRadius * 800px')
  expect(additionalData).toContain('$sensitivityRadius: 40')
})
test('generates sine easing by default (cos wrapping)', () => {
  const plugin = vitePluginMediaMixins({flavors: ['scss']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getScssAdditionalData(config)
  // t is wrapped in (1 - cos(3.14 * ...)) / 2
  expect(additionalData).toContain('(1 - cos(3.14 *')
  expect(additionalData).toContain('/ 2)')
})
test('generates linear easing when configured', () => {
  const plugin = vitePluginMediaMixins({
    flavors: ['scss'],
    easing: 'linear',
  })
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = getScssAdditionalData(config)
  // t is bare, not wrapped in (1 - cos(3.14 * ...)) / 2
  expect(additionalData).not.toContain('(1 - cos(')
  expect(additionalData).toContain('$normalSensitivityRadius * 600px')
})
