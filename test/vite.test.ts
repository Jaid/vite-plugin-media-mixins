import type {UserConfig} from 'vite'

import {expect, test} from 'bun:test'
import {randomUUID} from 'node:crypto'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import fsExtra from 'fs-extra'
import {build} from 'vite'

const {default: vitePluginMediaMixins} = await import('#src/main.ts')
const createTempDir = async () => {
  const dir = join(tmpdir(), `vite-plugin-media-mixins-test-${randomUUID()}`)
  await fsExtra.mkdir(dir, {recursive: true})
  return dir
}
const writeFiles = async (dir: string, scssContent: string, variant: 'sass' | 'scss' = 'scss') => {
  const ext = variant === 'sass' ? 'sass' : 'scss'
  await Bun.write(join(dir, 'index.html'), `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <script type="module" src="./main.js"></script>
</body>
</html>`)
  await Bun.write(join(dir, 'main.js'), `import './style.${ext}'; console.log("hello");`)
  await Bun.write(join(dir, `style.${ext}`), scssContent)
}

type BuildAndReadOptions = {
  pluginOptions?: Parameters<typeof vitePluginMediaMixins>[0]
  scssContent?: string
  variant?: 'sass' | 'scss'
}

const buildAndReadCss = async (options: BuildAndReadOptions = {}) => {
  const {pluginOptions, scssContent, variant = 'scss'} = options
  const dir = await createTempDir()
  const defaultContent = variant === 'sass' ? `body
  +narrow
    font-size: 14px
  +wide
    font-size: 18px
  width: toNarrow()
  margin: toWide(10px, 20px)
  height: toSquat()
  padding: toTall(1em, 2em)` : `body {
  @include narrow {
    font-size: 14px;
  }
  @include wide {
    font-size: 18px;
  }
  width: toNarrow();
  margin: toWide(10px, 20px);
  height: toSquat();
  padding: toTall(1em, 2em);
}`
  try {
    await writeFiles(dir, scssContent ?? defaultContent, variant)
    await build({
      root: dir,
      configFile: false,
      plugins: [
        vitePluginMediaMixins({
          flavors: [variant],
          ...pluginOptions,
        }),
      ],
      build: {
        cssMinify: false,
        outDir: 'dist',
      },
      logLevel: 'silent',
    })
    const outDir = join(dir, 'dist')
    // Find the CSS asset file
    const assetsDir = join(outDir, 'assets')
    let css = ''
    try {
      const assets = await fsExtra.readdir(assetsDir)
      for (const asset of assets) {
        if (asset.endsWith('.css')) {
          css = await fsExtra.readFile(join(assetsDir, asset), 'utf8')
          break
        }
      }
    } catch {
      // No assets dir, maybe CSS is elsewhere
      const entries = await fsExtra.readdir(outDir, {recursive: true}) as Array<string>
      for (const entry of entries) {
        if (entry.endsWith('.css')) {
          css = await fsExtra.readFile(join(outDir, entry), 'utf8')
          break
        }
      }
    }
    return {
      css,
      dir,
    }
  } finally {
    await fsExtra.remove(dir)
  }
}
const resolveAdditionalData = async (additionalData: unknown, filename: string) => {
  expect(additionalData).toBeFunction()
  const result = await (additionalData as (source: string, filename: string) => Promise<{content: string} | string> | {content: string} | string)('', filename)
  return typeof result === 'string' ? result : result.content
}
test('build generates CSS with default mixins and functions (scss)', async () => {
  const {css} = await buildAndReadCss()
  // Mixins expanded to @media
  expect(css).toContain('@media screen and not (min-width: 600px)')
  expect(css).toContain('@media screen and (min-width: 600px)')
  // Functions produce clamp-based outputs (Sass simplifies calc inside clamp)
  expect(css).toContain('clamp(0,')
  expect(css).toContain('100vw')
  expect(css).toContain('100vh')
  // toWide with custom args
  expect(css).toContain('10px + 10px')
  // toTall with em units
  expect(css).toContain('1em + 1em')
})
test('build generates CSS with sass (indented) syntax', async () => {
  const {css} = await buildAndReadCss({variant: 'sass'})
  expect(css).toContain('@media screen and not (min-width: 600px)')
  expect(css).toContain('@media screen and (min-width: 600px)')
  expect(css).toContain('clamp(0,')
})
test('build respects custom wideWidth and tallHeight', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      wideWidth: 800,
      tallHeight: 900,
    },
  })
  expect(css).toContain('@media screen and not (min-width: 800px)')
  expect(css).toContain('@media screen and (min-width: 800px)')
  // tallHeight (900) appears in toSquat/toTall clamp expressions
  // easingSide='large', sensitivityRadius=20 → normalSensitivityRadius=0.2
  // toSquat: ((0.2 * 900 + 900) - 100vh) / (0.2 * 900) = (1080px - 100vh) / 180px
  // toTall: (100vh - 900) / (0.2 * 900) = (100vh - 900px) / 180px
  expect(css).toContain('1080px')
  expect(css).toContain('900px')
  expect(css).toContain('100vh')
  // wideWidth (800) appears in toNarrow/toWide clamp expressions
  // toNarrow: ((0.2 * 800 + 800) - 100vw) / (0.2 * 800) = (960px - 100vw) / 160px
  // toWide: (100vw - 800) / (0.2 * 800) = (100vw - 800px) / 160px
  expect(css).toContain('960px')
  expect(css).toContain('800px')
})
test('build respects sensitivityRadius', async () => {
  const {css} = await buildAndReadCss({pluginOptions: {sensitivityRadius: 40}})
  // easingSide='large' → denominator = normalSensitivityRadius * wideWidth = 0.4 * 600 = 240px
  expect(css).toContain('/ 240px,')
})
test('build generates dark/light mixins correctly for light default theme', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      defaultTheme: 'light',
      schemeSource: ['media'],
    },
    scssContent: `body {
  @include light {
    color: black;
  }
  @include dark {
    color: white;
  }
}`,
  })
  expect(css).toContain('@media (prefers-color-scheme: light)')
  expect(css).toContain('@media not (prefers-color-scheme: light)')
})
test('build generates dark/light mixins correctly for dark default theme', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      defaultTheme: 'dark',
      schemeSource: ['media'],
    },
    scssContent: `body {
  @include light {
    color: black;
  }
  @include dark {
    color: white;
  }
}`,
  })
  expect(css).toContain('@media (prefers-color-scheme: dark)')
  expect(css).toContain('@media not (prefers-color-scheme: dark)')
})
test('build generates light/dark mixins with attribute and media (default)', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {defaultTheme: 'dark'},
    scssContent: `body {
  @include light {
    color: black;
  }
  @include dark {
    color: white;
  }
}`,
  })
  // Attribute selectors
  expect(css).toContain(':root[data-light]')
  expect(css).toContain(':root[data-dark]')
  // Media queries
  expect(css).toContain('@media (prefers-color-scheme: dark)')
  expect(css).toContain('@media not (prefers-color-scheme: dark)')
})
test('build generates light/dark mixins with attribute only', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      defaultTheme: 'dark',
      schemeSource: ['attribute'],
    },
    scssContent: `body {
  @include light {
    color: black;
  }
  @include dark {
    color: white;
  }
}`,
  })
  expect(css).toContain(':root[data-light]')
  expect(css).toContain(':root[data-dark]')
  // No media queries for color scheme
  expect(css).not.toContain('@media (prefers-color-scheme')
  expect(css).not.toContain('@media not (prefers-color-scheme')
})
test('build generates light/dark mixins with class only', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      defaultTheme: 'dark',
      schemeSource: ['class'],
    },
    scssContent: `body {
  @include light {
    color: black;
  }
  @include dark {
    color: white;
  }
}`,
  })
  expect(css).toContain(':root.light')
  expect(css).toContain(':root.dark')
  // No attribute selectors or media queries
  expect(css).not.toContain('html[data-')
  expect(css).not.toContain('@media (prefers-color-scheme')
  expect(css).not.toContain('@media not (prefers-color-scheme')
})
test('build generates landscape/portrait mixins correctly for portrait square category', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {squareCategory: 'portrait'},
    scssContent: `body {
  @include portrait {
    width: 100%;
  }
  @include landscape {
    width: 50%;
  }
}`,
  })
  expect(css).toContain('@media (max-aspect-ratio: 1)')
  expect(css).toContain('@media not ((max-aspect-ratio: 1))')
})
test('build generates landscape/portrait mixins correctly for landscape square category', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {squareCategory: 'landscape'},
    scssContent: `body {
  @include portrait {
    width: 100%;
  }
  @include landscape {
    width: 50%;
  }
}`,
  })
  expect(css).toContain('@media (min-aspect-ratio: 1)')
  expect(css).toContain('@media not ((min-aspect-ratio: 1))')
})
test('build includes negation mixins (hoverless, motion, srgb)', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `body {
  @include hoverless {
    cursor: default;
  }
  @include motion {
    transition: all 0.3s;
  }
  @include srgb {
    color: #333;
  }
}`,
  })
  expect(css).toContain('@media not ((hover: hover))')
  expect(css).toContain('@media not ((prefers-reduced-motion: reduce))')
  expect(css).toContain('@media not ((color-gamut: p3) or (color-gamut: rec2020))')
})
test('build works with custom additionalMixins', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      additionalMixins: {
        huge: 'screen and (min-width: 1920px)',
        tiny: 'screen and (max-width: 400px)',
      },
    },
    scssContent: `body {
  @include huge {
    font-size: 24px;
  }
  @include tiny {
    font-size: 12px;
  }
}`,
  })
  expect(css).toContain('@media screen and (min-width: 1920px)')
  expect(css).toContain('@media screen and (max-width: 400px)')
})
test('custom mixins override default mixins', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      mixins: {
        narrow: 'screen and (max-width: 500px)',
        wide: 'screen and (min-width: 501px)',
      },
    },
    scssContent: `body {
  @include narrow {
    font-size: 14px;
  }
  @include wide {
    font-size: 18px;
  }
}`,
  })
  expect(css).toContain('@media screen and (max-width: 500px)')
  expect(css).toContain('@media screen and (min-width: 501px)')
  expect(css).not.toContain('@media screen and not (min-width:')
})
test('toNarrow without args returns the raw ratio', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `body {
  width: toNarrow();
}`,
  })
  // Should produce something like: width: clamp(0, ...)
  expect(css).toContain('clamp(0,')
})
test('toNarrow with two args interpolates between them', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `body {
  width: toNarrow(5px, 15px);
}`,
  })
  expect(css).toContain('5px + 10px')
  expect(css).toContain('clamp(5px,')
})
test('toWide with explicit sensitivityRadius param', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {sensitivityRadius: 40},
    scssContent: `body {
  margin: toWide(0px, 100px, 50);
}`,
  })
  // sensitivityRadius: 50 → normalSensitivityRadius=0.5, easingSide='large' → denominator = 0.5 * 600 = 300px
  expect(css).toContain('/ 300px,')
})
test('build uses sine easing by default (cos in output)', async () => {
  const {css} = await buildAndReadCss()
  expect(css).toContain('cos(')
})
test('build uses sine easing when configured', async () => {
  const {css} = await buildAndReadCss({pluginOptions: {easing: 'sine'}})
  // Should contain cos(pi * ...) * 0.5 pattern (Sass uses CSS math keyword pi)
  expect(css).toContain('cos(')
})
test('all static utility mixins expand correctly', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `body {
  @include static {
    transition: none;
  }
  @include hover {
    cursor: pointer;
  }
  @include aboveSrgb {
    color: color(display-p3 1 0 0);
  }
}`,
  })
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  expect(css).toContain('@media (hover: hover)')
  expect(css).toContain('@media (color-gamut: p3) or (color-gamut: rec2020)')
})
test('toSquat and toTall functions produce output with 100vh', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `body {
  height: toSquat();
  min-height: toTall(100px, 300px);
}`,
  })
  expect(css).toContain('100vh')
  expect(css).toContain('clamp(0,')
  expect(css).toContain('100px + 200px')
})
test('build succeeds with empty SCSS file', async () => {
  const {css} = await buildAndReadCss({
    scssContent: '',
  })
  // Build should succeed, CSS output should exist (even if empty)
  expect(typeof css).toBe('string')
})
test('build succeeds with @use in SCSS source', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `@use "sass:color";

body {
  color: color.adjust(red, $lightness: 10%);
  @include wide {
    font-size: 18px;
  }
}`,
  })
  expect(css).toContain('#ff3333')
  expect(css).toContain('@media screen and (min-width: 600px)')
})
test('build succeeds with @use in indented Sass source', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `@use 'sass:color'

body
  color: color.adjust(red, $lightness: 10%)
  +wide
    font-size: 18px`,
    variant: 'sass',
  })
  expect(css).toContain('#ff3333')
  expect(css).toContain('@media screen and (min-width: 600px)')
})
test('build succeeds when SCSS source already uses sass:math', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `@use "sass:math";

body {
  width: math.div(10px, 2);
  @include wide {
    font-size: 18px;
  }
}`,
  })
  expect(css).toContain('width: 5px')
  expect(css).toContain('@media screen and (min-width: 600px)')
})
test('build succeeds when indented Sass source already uses sass:math', async () => {
  const {css} = await buildAndReadCss({
    scssContent: `@use 'sass:math'

body
  width: math.div(10px, 2)
  +wide
    font-size: 18px`,
    variant: 'sass',
  })
  expect(css).toContain('width: 5px')
  expect(css).toContain('@media screen and (min-width: 600px)')
})
test('plugin name is correct', () => {
  const plugin = vitePluginMediaMixins()
  expect(plugin.name).toBe('media-mixins')
  expect(plugin.config).toBeFunction()
})
test('config hook sets additionalData for multiple flavors', async () => {
  const config: UserConfig = {}
  const plugin = vitePluginMediaMixins({flavors: ['scss', 'sass']})
  ;(plugin.config as (config: UserConfig) => void)(config)
  const scssAdditionalData = await resolveAdditionalData(config.css?.preprocessorOptions?.scss?.additionalData, 'test.scss')
  const sassAdditionalData = await resolveAdditionalData(config.css?.preprocessorOptions?.sass?.additionalData, 'test.sass')
  expect(scssAdditionalData).toContain('@mixin narrow')
  expect(sassAdditionalData).toContain('@mixin narrow')
})
test('build supports non-media mixins with body array', async () => {
  const {css} = await buildAndReadCss({
    pluginOptions: {
      mixins: {
        reset: {
          body: [
            '& {',
            '  margin: 0;',
            '  padding: 0;',
            '  box-sizing: border-box;',
            '}',
          ],
        },
      },
      flavors: ['scss'],
    },
    scssContent: `.foo {
  @include reset;
  color: red;
}`,
  })
  expect(css).toContain('margin: 0')
  expect(css).toContain('padding: 0')
  expect(css).toContain('box-sizing: border-box')
  expect(css).toContain('color: red')
})
