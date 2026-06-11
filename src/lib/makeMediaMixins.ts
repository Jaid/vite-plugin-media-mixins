import flattenString from 'flatten-string'

export type MixinDef = {
  body: Array<string>
} | string

const makeMixin = (name: string, value: MixinDef, flavor: 'sass' | 'scss') => {
  if (typeof value === 'object') {
    if (flavor === 'sass') {
      const body = value.body.map(line => {
        const trimmed = line.trimEnd()
        if (trimmed === '}') {
          return ''
        }
        if (trimmed.endsWith('{')) {
          let result = trimmed.slice(0, -1).trimEnd()
          if (result.startsWith('}')) {
            result = result.slice(1).trimStart()
          }
          return result
        }
        if (trimmed.endsWith(';')) {
          return trimmed.slice(0, -1).trimEnd()
        }
        return trimmed
      }).filter(line => line !== '').map(line => `  ${line}`).join('\n')
      return `@mixin ${name}\n${body}`
    }
    const body = flattenString.lines(value.body.map(line => `  ${line}`))
    return `@mixin ${name} {\n${body}\n}`
  }
  if (flavor === 'sass') {
    return `@mixin ${name}\n  @media ${value}\n    @content`
  }
  return `@mixin ${name} {\n  @media ${value} {\n    @content;\n  }\n}`
}

export default (mixins: Record<string, MixinDef>, flavor: 'sass' | 'scss' = 'scss') => {
  const items = Object.entries(mixins).map(([name, value]) => makeMixin(name, value, flavor))
  return flattenString.paragraphs(items)
}
