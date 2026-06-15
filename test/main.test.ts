import type {UserConfig} from 'vite'

import {expect, test} from 'bun:test'

const {default: vitePluginMediaMixins} = await import('#src/main.ts')
const resolveAdditionalData = async (additionalData: unknown, filename: string) => {
  expect(additionalData).toBeFunction()
  const result = await (additionalData as (source: string, filename: string) => Promise<{content: string} | string> | {content: string} | string)('', filename)
  return typeof result === 'string' ? result : result.content
}
const getScssAdditionalData = (config: UserConfig) => resolveAdditionalData(config.css?.preprocessorOptions?.scss?.additionalData, 'test.scss')
const getSassAdditionalData = (config: UserConfig) => resolveAdditionalData(config.css?.preprocessorOptions?.sass?.additionalData, 'test.sass')
test('plugin has correct name', () => {
  const plugin = vitePluginMediaMixins()
  expect(plugin.name).toBe('media-mixins')
  expect(plugin.config).toBeFunction()
})
test('generates scss mixins and body-based functions with defaults', async () => {
  const plugin = vitePluginMediaMixins({flavors: ['scss']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = await getScssAdditionalData(config)
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
test('generates sass mixins and body-based functions', async () => {
  const plugin = vitePluginMediaMixins({flavors: ['sass']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = await getSassAdditionalData(config)
  expect(additionalData).toBeString()
  expect(additionalData).toContain('@mixin narrow')
  expect(additionalData).toContain('@function toNarrow($from: null, $to: null, $sensitivityRadius: 20)\n')
  expect(additionalData).toContain('@if $from == null and $to == null')
  expect(additionalData).toContain('$normalSensitivityRadius * 600px')
})
test('respects custom wideWidth and sensitivityRadius', async () => {
  const plugin = vitePluginMediaMixins({
    wideWidth: 800,
    sensitivityRadius: 40,
    flavors: ['scss'],
  })
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = await getScssAdditionalData(config)
  expect(additionalData).toContain('screen and not (min-width: 800px)')
  expect(additionalData).toContain('$normalSensitivityRadius * 800px')
  expect(additionalData).toContain('$sensitivityRadius: 40')
})
test('generates sine easing by default (cos wrapping)', async () => {
  const plugin = vitePluginMediaMixins({flavors: ['scss']})
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = await getScssAdditionalData(config)
  // t is wrapped in (1 - cos(#{pi} * ...)) * 0.5
  expect(additionalData).toContain('(1 - cos(#{pi} *')
  expect(additionalData).toContain('* 0.5)')
})
test('generates linear easing when configured', async () => {
  const plugin = vitePluginMediaMixins({
    flavors: ['scss'],
    easing: 'linear',
  })
  const config: UserConfig = {}
  ;(plugin.config as (config: UserConfig) => void)(config)
  const additionalData = await getScssAdditionalData(config)
  // t is bare, not wrapped in (1 - cos(#{pi} * ...)) / 2
  expect(additionalData).not.toContain('(1 - cos(')
  expect(additionalData).toContain('$normalSensitivityRadius * 600px')
})
