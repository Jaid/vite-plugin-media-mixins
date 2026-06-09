import type {Arrayable, RequireExactlyOne} from 'type-fest'

import flattenString from 'flatten-string'

export type FunctionDef = RequireExactlyOne<{
  body: Array<string>
  expression: string
  parameters?: Arrayable<string>
}, 'body' | 'expression'>

const makeFunction = (name: string, def: FunctionDef, flavor: 'sass' | 'scss') => {
  let params = ''
  if (def.parameters) {
    params = flattenString.list(def.parameters)
  }
  if (def.expression) {
    if (flavor === 'sass') {
      return `@function ${name}(${params})\n  @return ${def.expression.replace(/;$/, '')}`
    }
    return `@function ${name}(${params}) {\n  @return ${def.expression};\n}`
  }
  if (flavor === 'sass') {
    const body = def.body!.map(line => {
      const trimmed = line.trimEnd()
      if (trimmed === '}') {
        return ''
      }
      if (trimmed.endsWith('{')) {
        return trimmed.slice(0, -1).trimEnd()
      }
      if (trimmed.endsWith(';')) {
        return trimmed.slice(0, -1).trimEnd()
      }
      return trimmed
    }).filter(line => line !== '').map(line => `  ${line}`).join('\n')
    return `@function ${name}(${params})\n${body}`
  }
  const body = flattenString.lines(def.body!.map(line => `  ${line}`))
  return `@function ${name}(${params}) {\n${body}\n}`
}

export default (functions: Record<string, FunctionDef>, flavor: 'sass' | 'scss' = 'scss') => {
  const items = Object.entries(functions).map(([name, def]) => makeFunction(name, def, flavor))
  return flattenString.paragraphs(items)
}
