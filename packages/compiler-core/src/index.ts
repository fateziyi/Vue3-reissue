// 编译分三步 1、需要将模板转化成ast语法树；2、转化 生成codegennode；3、转化成render函数
// 将模板转化成ast语法树
import { NodeTypes } from './ast'
import { parse } from './parser'
import { CREATE_ELEMENT_BLOCK, CREATE_ELEMENT_VNODE, helperNameMap, OPEN_BLOCK, TO_DISPLAY_STRING } from './runtimeHelpers'
import { transform } from './transform'

function createCodegenContext(ast) {
  const context = {
    code: '',
    level: 0,
    helper(name) {
      return '_' + helperNameMap[name]
    },
    push(code) {
      context.code += code
    },
    indent() {
      newLine(++context.level)
    },
    dedent(noNewLine = false) {
      if (noNewLine) {
        --context.level
      } else {
        newLine(--context.level)
      }
    },
    newLine() {
      newLine(context.level)
    }
  }
  function newLine(n) {
    context.push('\n' + `  `.repeat(n))
  }
  return context
}

function genFunctionPreamble(ast, context) {
  const { push, newLine } = context
  if (ast.helpers.length > 0) {
    push(`const {${ast.helpers.map((item) => `${helperNameMap[item]}:${context.helper[item]}`)}} = Vue`)
    newLine()
  }
  push(`return function render(_ctx) {`)
}

function genText(node, context) {
  context.push(JSON.stringify(node.content))
}

function genInterpolation(node, context) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

function genExpression(node, context) {
  context.push(node.content)
}

function genVNodeCall(node, context) {
  const { push, helper, indent } = context
  const { tag, props, children, isBlock } = node
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(),`)
  }
  const h = isBlock ? helper(CREATE_ELEMENT_BLOCK) : helper(CREATE_ELEMENT_VNODE)
  push(`${helper(h)}(`)
  if (node.isBlock) {
    push(`)`)
  }
  indent()
  push(`)`)
}

function genNode(node, context) {
  const { push, helper, newLine, indent, dedent } = context
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context)
      break
  }
}

function generate(ast) {
  const context = createCodegenContext(ast)
  const { push, indent, dedent } = context
  indent()
  push(`return `)
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context)
  } else {
    push("null")
  }
  dedent()
  push(`}`)

  genFunctionPreamble(ast, context)
  return context.code
}

export function compile(template) {
  const ast = parse(template)
  transform(ast)
  return generate(ast)
}

export { parse }
