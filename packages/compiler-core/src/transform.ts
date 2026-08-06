import {
  createObjectExpression,
  createSimpleExpression,
  createVnodeCall,
  NodeTypes,
} from './ast'
import { FRAGMENT, TO_DISPLAY_STRING } from './runtimeHelpers'

export type NodeTransform = (node: any, context: any) => void | (() => void)

function transformExpression(node) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content.content = `_ctx.${node.content.content}`
  }
}

function isText(node) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
}

function transformText(node) {
  if (node.type !== NodeTypes.ELEMENT && node.type !== NodeTypes.ROOT) return
  return () => {
    const children = node.children
    let container
    for (let index = 0; index < children.length; index++) {
      const child = children[index]
      if (!isText(child)) continue
      for (let nextIndex = index + 1; nextIndex < children.length; nextIndex++) {
        const next = children[nextIndex]
        if (!isText(next)) break
        if (!container) {
          container = children[index] = {
            type: NodeTypes.COMPOUND_EXPRESSION,
            children: [child],
          }
        }
        container.children.push(' + ', next)
        children.splice(nextIndex, 1)
        nextIndex--
      }
      container = undefined
    }
  }
}

function transformElement(node, context) {
  if (node.type !== NodeTypes.ELEMENT) return
  return () => {
    const properties = node.props.map((prop) => ({
      name: prop.name,
      value: createSimpleExpression(prop.value?.content ?? true, true),
    }))
    const props = properties.length ? createObjectExpression(properties) : null
    const children =
      node.children.length === 0
        ? null
        : node.children.length === 1
          ? node.children[0]
          : node.children
    node.codegenNode = createVnodeCall(
      context,
      createSimpleExpression(node.tag, true),
      props,
      children
    )
  }
}

function createTransformContext(root, options: { nodeTransforms?: NodeTransform[] }) {
  const context: any = {
    root,
    currentNode: root,
    parent: null,
    childIndex: 0,
    nodeTransforms: [transformExpression, transformElement, transformText, ...(options.nodeTransforms || [])],
    helpers: new Map(),
    helper(name) {
      context.helpers.set(name, (context.helpers.get(name) || 0) + 1)
      return name
    },
    replaceNode(node) {
      context.parent.children[context.childIndex] = node
      context.currentNode = node
    },
    removeNode() {
      context.parent.children.splice(context.childIndex, 1)
      context.currentNode = null
    },
  }
  return context
}

function traverseChildren(parent, context) {
  for (let index = 0; index < parent.children.length; index++) {
    context.parent = parent
    context.childIndex = index
    traverseNode(parent.children[index], context)
    if (!context.currentNode) index--
  }
}

function traverseNode(node, context) {
  context.currentNode = node
  const exits: Array<() => void> = []
  for (const transform of context.nodeTransforms) {
    const onExit = transform(context.currentNode, context)
    if (onExit) exits.push(onExit)
    if (!context.currentNode) return
  }

  node = context.currentNode
  if (node.type === NodeTypes.INTERPOLATION) {
    context.helper(TO_DISPLAY_STRING)
  } else if (node.type === NodeTypes.ROOT || node.type === NodeTypes.ELEMENT) {
    traverseChildren(node, context)
  }

  let index = exits.length
  while (index--) exits[index]()
  context.currentNode = node
}

function createRootCodegenNode(ast, context) {
  const { children } = ast
  if (children.length === 1) {
    const child = children[0]
    ast.codegenNode = child.codegenNode || child
  } else if (children.length > 1) {
    ast.codegenNode = createVnodeCall(context, FRAGMENT, null, children)
  }
}

export function transform(ast, options: { nodeTransforms?: NodeTransform[] } = {}) {
  const context = createTransformContext(ast, options)
  traverseNode(ast, context)
  createRootCodegenNode(ast, context)
  ast.helpers = [...context.helpers.keys()]
  return ast
}
