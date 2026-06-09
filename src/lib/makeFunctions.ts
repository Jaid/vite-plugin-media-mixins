import flattenString from 'flatten-string'

export type FunctionDef = {
  expression: string
  parameters?: Array<string> | string
}

const makeFunction = (name: string, {parameters, expression}: FunctionDef, flavor: 'sass' | 'scss') => {
  let params = ''
  if (parameters) {
    params = flattenString.list(parameters)
  }
  if (flavor === 'sass') {
    return `@function ${name}(${params})\n  @return ${expression}`
  }
  return `@function ${name}(${params}) {\n  @return ${expression};\n}`
}

export default (functions: Record<string, FunctionDef>, flavor: 'sass' | 'scss' = 'scss') => {
  const items = Object.entries(functions).map(([name, def]) => makeFunction(name, def, flavor))
  return flattenString.paragraphs(items)
}
