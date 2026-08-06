import { NodeTypes } from './ast'
import { parse } from './parser'
import {
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  FRAGMENT,
  helperNameMap,
  OPEN_BLOCK,
  TO_DISPLAY_STRING,
} from './runtimeHelpers'
import { transform, type NodeTransform } from './transform'

function createCodegenContext() {
  const context = {
    code: '',
    level: 0,
    helper(name) {
      return `_${helperNameMap[name]}`
    },
    push(code) {
      context.code += code
    },
    newline() {
      context.code += `\n${'  '.repeat(context.level)}`
    },
    indent() {
      context.level++
      context.newline()
    },
    deindent() {
      context.level--
      context.newline()
    },
  }
  return context
}

function genFunctionPreamble(ast, context) {
  if (!ast.helpers.length) return
  const aliases = ast.helpers
    .map((helper) => `${helperNameMap[helper]}: ${context.helper(helper)}`)
    .join(', ')
  context.push(`const { ${aliases} } = Vue`)
  context.newline()
}

function genNodeList(nodes, context) {
  context.push('[')
  for (let index = 0; index < nodes.length; index++) {
    if (index) context.push(', ')
    genNode(nodes[index], context)
  }
  context.push(']')
}

function genCompoundExpression(node, context) {
  for (const child of node.children) {
    if (typeof child === 'string') context.push(child)
    else genNode(child, context)
  }
}

function genObjectExpression(node, context) {
  context.push('{ ')
  for (let index = 0; index < node.properties.length; index++) {
    const property = node.properties[index]
    if (index) context.push(', ')
    context.push(`${JSON.stringify(property.name)}: `)
    genNode(property.value, context)
  }
  context.push(' }')
}

function genVNodeCall(node, context) {
  const helper = node.isBlock ? CREATE_ELEMENT_BLOCK : CREATE_ELEMENT_VNODE
  if (node.isBlock) context.push(`(${context.helper(OPEN_BLOCK)}(), `)
  context.push(`${context.helper(helper)}(`)
  if (node.tag === FRAGMENT) context.push(context.helper(FRAGMENT))
  else genNode(node.tag, context)
  context.push(', ')
  genNode(node.props, context)
  context.push(', ')
  genNode(node.children, context)
  context.push(')')
  if (node.isBlock) context.push(')')
}

function genNode(node, context) {
  if (node == null) {
    context.push('null')
    return
  }
  if (Array.isArray(node)) {
    genNodeList(node, context)
    return
  }
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    context.push(JSON.stringify(node))
    return
  }

  switch (node.type) {
    case NodeTypes.ELEMENT:
      genNode(node.codegenNode, context)
      break
    case NodeTypes.TEXT:
      context.push(JSON.stringify(node.content))
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      context.push(node.isStatic ? JSON.stringify(node.content) : node.content)
      break
    case NodeTypes.INTERPOLATION:
      context.push(`${context.helper(TO_DISPLAY_STRING)}(`)
      genNode(node.content, context)
      context.push(')')
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
    default:
      context.push('null')
  }
}

export function generate(ast) {
  const context = createCodegenContext()
  genFunctionPreamble(ast, context)
  context.push('return function render(_ctx) {')
  context.indent()
  context.push('return ')
  genNode(ast.codegenNode, context)
  context.deindent()
  context.push('}')
  return context.code
}

export function compile(
  template: string,
  options: { nodeTransforms?: NodeTransform[] } = {}
) {
  const ast = parse(template)
  transform(ast, options)
  return generate(ast)
}

export { parse, transform }
export * from './ast'
export * from './runtimeHelpers'
