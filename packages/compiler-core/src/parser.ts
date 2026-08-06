import { NodeTypes } from './ast'

function createParserContext(template: string) {
  return {
    originalSource: template,
    source: template,
    line: 1,
    column: 1,
    offset: 0,
  }
}

function getCursor(context) {
  return {
    line: context.line,
    column: context.column,
    offset: context.offset,
  }
}

function getSelection(context, start) {
  const end = getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  }
}

function advanceBy(context, length: number) {
  const source = context.source
  let lineCount = 0
  let lastNewLine = -1
  for (let index = 0; index < length; index++) {
    if (source.charCodeAt(index) === 10) {
      lineCount++
      lastNewLine = index
    }
  }
  context.offset += length
  context.line += lineCount
  context.column = lastNewLine < 0 ? context.column + length : length - lastNewLine
  context.source = source.slice(length)
}

function advanceSpaces(context) {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) advanceBy(context, match[0].length)
}

function parseTextData(context, length: number) {
  const content = context.source.slice(0, length)
  advanceBy(context, length)
  return content
}

function parseText(context) {
  const start = getCursor(context)
  let endIndex = context.source.length
  for (const token of ['<', '{{']) {
    const index = context.source.indexOf(token)
    if (index >= 0 && index < endIndex) endIndex = index
  }
  if (endIndex === 0) endIndex = 1
  const content = parseTextData(context, endIndex)
  return { type: NodeTypes.TEXT, content, loc: getSelection(context, start) }
}

function parseInterpolation(context) {
  const start = getCursor(context)
  advanceBy(context, 2)
  const closeIndex = context.source.indexOf('}}')
  if (closeIndex < 0) throw new Error('Interpolation is missing closing delimiter "}}"')
  const rawContent = parseTextData(context, closeIndex)
  const content = rawContent.trim()
  advanceBy(context, 2)
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
    loc: getSelection(context, start),
  }
}

function parseAttributeValue(context) {
  const quote = context.source[0]
  if (quote === '"' || quote === "'") {
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    if (endIndex < 0) throw new Error('Attribute value is missing a closing quote')
    const content = parseTextData(context, endIndex)
    advanceBy(context, 1)
    return content
  }
  const match = /^[^\t\r\n\f >]+/.exec(context.source)
  if (!match) return ''
  advanceBy(context, match[0].length)
  return match[0]
}

function parseAttribute(context) {
  const start = getCursor(context)
  const match = /^[^\t\r\n\f />=]+/.exec(context.source)
  if (!match) throw new Error(`Invalid attribute near: ${context.source.slice(0, 10)}`)
  const name = match[0]
  advanceBy(context, name.length)
  advanceSpaces(context)

  let value: string | null = null
  if (context.source.startsWith('=')) {
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
  }

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value:
      value == null
        ? null
        : { type: NodeTypes.TEXT, content: value },
    loc: getSelection(context, start),
  }
}

function parseTag(context, type: 'start' | 'end') {
  const start = getCursor(context)
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  if (!match) throw new Error(`Invalid tag near: ${context.source.slice(0, 10)}`)
  const tag = match[1]
  advanceBy(context, match[0].length)
  advanceSpaces(context)

  const props: any[] = []
  if (type === 'start') {
    while (context.source.length && !context.source.startsWith('>') && !context.source.startsWith('/>')) {
      props.push(parseAttribute(context))
      advanceSpaces(context)
    }
  }

  const isSelfClosing = context.source.startsWith('/>')
  advanceBy(context, isSelfClosing ? 2 : 1)
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children: [],
    isSelfClosing,
    loc: getSelection(context, start),
  }
}

function startsWithEndTagOpen(source: string, tag: string) {
  return (
    source.startsWith('</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}

function isEnd(context, ancestors: any[]) {
  if (!context.source) return true
  const parent = ancestors[ancestors.length - 1]
  return Boolean(parent && startsWithEndTagOpen(context.source, parent.tag))
}

function parseElement(context, ancestors: any[]) {
  const element = parseTag(context, 'start')
  if (element.isSelfClosing) return element

  ancestors.push(element)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  if (!startsWithEndTagOpen(context.source, element.tag)) {
    throw new Error(`Missing end tag for <${element.tag}>`)
  }
  parseTag(context, 'end')
  element.loc = getSelection(context, element.loc.start)
  return element
}

function parseChildren(context, ancestors: any[]) {
  const nodes: any[] = []
  while (!isEnd(context, ancestors)) {
    const source = context.source
    let node
    if (source.startsWith('{{')) {
      node = parseInterpolation(context)
    } else if (/^<[a-z]/i.test(source)) {
      node = parseElement(context, ancestors)
    } else {
      node = parseText(context)
    }
    nodes.push(node)
  }

  return nodes.filter((node) => {
    if (node.type !== NodeTypes.TEXT) return true
    node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')
    return /[^\t\r\n\f ]/.test(node.content)
  })
}

function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
    codegenNode: null,
  }
}

export function parse(template: string) {
  const context = createParserContext(template)
  return createRoot(parseChildren(context, []))
}
