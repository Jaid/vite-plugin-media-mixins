import type {UserConfig} from 'vite'

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
