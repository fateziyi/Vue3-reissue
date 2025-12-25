// 编译分三步 1、需要将模板转化成ast语法树；2、转化 生成codegennode；3、转化成render函数
// 将模板转化成ast语法树

import { NodeTypes } from "./ast"


function createParserContext(template) {
  return {
    originalSource: template,
    source: template,
    line: 1,
    column: 1,
    offset: 0,
  }
}

function isEnd(context) {
  const c = context.source
  if (c.startsWith('</')) { // 如果是闭合标签，也要停止循环
    return true
  }
  return !c
}

function advancePosition(context, content, endIndex) {
  let linesCount = 0
  let lastNewLinePos = -1
  for (let i = 0; i < endIndex; i++) {
    if (content.charCodeAt(i) === 10) {
      linesCount++
      lastNewLinePos = i
    }
  }
  context.offset += endIndex
  context.line += linesCount
  context.column = lastNewLinePos === -1
    ? context.column + endIndex
    : endIndex - lastNewLinePos
}

function advanceBy(context, endIndex) {
  let c = context.source
  advancePosition(context, c, endIndex)
  context.source = c.slice(endIndex)
}

function getCursor(context) {
  return {
    line: context.line,
    column: context.column,
    offset: context.offset
  }
}

function getSelection(context, start) {
  const end = getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}

function parseTextData(context, endIndex) {
  const content = context.source.slice(0, endIndex)
  advanceBy(context, endIndex)
  return content
}

function parseText(context) {
  let tokens = ['<', '{{'] // 找当前离得最近的词法
  let endIndex = context.source.length
  for (let i = 0; i < tokens.length; i++) {
    const index = context.source.indexOf(tokens[i], 1)
    if (index !== -1 && index < endIndex) {
      endIndex = index
    }
  }
  let content = parseTextData(context, endIndex)
  return { type: NodeTypes.TEXT, content }
}

function advanceSpaces(context) {
  let match = /^[ \t\r\n]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}

function parseTag(context) {
  const start = getCursor(context)
  const match = /^<\/?([a-z][^\t\r\n/>]*)/.exec(context.source)
  const tag = match[1]
  advanceBy(context, match[0].length) // 删除匹配到的内容
  advanceSpaces(context)
  const isSelfClosing = context.source.startsWith('/>')
  advanceBy(context, isSelfClosing ? 2 : 1)
  return {
    type: NodeTypes.ELEMENT,
    tag,
    isSelfClosing,
    loc: getSelection(context, start),
  }
}

function parseElement(context) {
  const ele = parseTag(context)
  const children = parseChildren(context) // 递归解析子元素
  if (context.source.startsWith('</')) {
    parseTag(context)
  }
  (ele as any).children = [];
  (ele as any).loc = getSelection(context, ele.loc.start)
  return ele
}

function parseChildren(context) {
  const nodes = [] as any
  while (!isEnd(context)) {
    const c = context.source // 解析的内容  
    let node
    if (c.startsWith('{{')) { // 插值
      node = '表达式'
    } else if (c[0] === '<') { // 标签
      node = parseElement(context)
    } else { // 文本
      node = parseText(context)
    }

    // 状态机
    nodes.push(node)
  }
  return nodes
}

function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
  }
}

export function parse(template) {
  const context = createParserContext(template)
  return createRoot(parseChildren(context))
}