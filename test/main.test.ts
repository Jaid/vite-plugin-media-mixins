import {expect, test} from 'bun:test'

const {default: vitePluginMediaMixins} = await import('#src/main.ts')

test('should run', () => {
  const result = vitePluginMediaMixins()
  expect(result).toBe('vite-plugin-media-mixins') // TODO Test actual functionality
})
