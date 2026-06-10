import type {UserConfig} from 'vite'

import {compileString} from 'sass'

import mediaMixinsPlugin from '#src/main.ts'

const plugin = mediaMixinsPlugin()
const config: UserConfig = {}
;(plugin.config as (config: UserConfig) => void)(config)
for (const flavor of ['sass', 'scss'] as const) {
  const data = config.css?.preprocessorOptions?.[flavor]?.additionalData
  if (typeof data === 'string') {
    await Bun.write(`temp/render/preview.${flavor}`, data)
    console.log(`Written temp/render/preview.${flavor} (${Buffer.byteLength(data)} bytes)`)
  }
}
const sassData = config.css?.preprocessorOptions?.sass?.additionalData
if (typeof sassData === 'string') {
  const userSass = `div
  opacity: toNarrow()
  padding: toNarrow(2.5rem)
  margin: toWide(1rem, 2rem)
  flex: toSquat(1)
  gap: toTall(4em, 150px, 50)
  scale: toTall(0, 2)
`
  const compiled = compileString(`${sassData}\n\n${userSass}`, {syntax: 'indented'})
  await Bun.write('temp/render/preview.css', compiled.css)
  console.log(`Written temp/render/preview.css (${Buffer.byteLength(compiled.css)} bytes)`)
}
