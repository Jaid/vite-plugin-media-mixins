const makeMixin = (name: string, value: string, flavor: 'sass' | 'scss') => {
  if (flavor === 'sass') {
    return `@mixin ${name}\n  @media ${value}\n    @content`
  }
  return `@mixin ${name} {\n  @media ${value} {\n    @content;\n  }\n}`
}

export default (mixins: Record<string, string>, flavor: 'sass' | 'scss' = 'scss') => {
  return Object.entries(mixins).map(([name, value]) => makeMixin(name, value, flavor)).join('\n')
}
