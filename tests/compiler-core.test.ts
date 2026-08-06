import assert from 'node:assert/strict'
import test from 'node:test'

import { compile, NodeTypes, parse } from '../packages/compiler-core/src/index'
import {
  createElementVNode,
  Fragment,
  toDisplayString,
} from '../packages/runtime-core/src/createVnode'

const runtime = { createElementVNode, Fragment, toDisplayString }

test('recursive descent parser keeps nested children, attributes, and interpolation', () => {
  const ast: any = parse('<div id="app">hello {{ name }}<span>!</span></div>')
  const element = ast.children[0]
  assert.equal(element.tag, 'div')
  assert.equal(element.props[0].name, 'id')
  assert.equal(element.children.length, 3)
  assert.equal(element.children[1].type, NodeTypes.INTERPOLATION)
  assert.equal(element.children[2].children[0].content, '!')
})

test('compiler generates an executable render function', () => {
  const code = compile('<div id="app">hello {{ name }}<span>!</span></div>')
  const render = new Function('Vue', code)(runtime)
  const vnode = render({ name: 'Ada' })

  assert.equal(vnode.type, 'div')
  assert.equal(vnode.props.id, 'app')
  assert.equal(vnode.children[0], 'hello Ada')
  assert.equal(vnode.children[1].type, 'span')
})

test('transform accepts custom node plugins', () => {
  const code = compile('<p>hello</p>', {
    nodeTransforms: [
      (node) => {
        if (node.type === NodeTypes.TEXT) node.content = node.content.toUpperCase()
      },
    ],
  })
  const render = new Function('Vue', code)(runtime)
  assert.equal(render({}).children, 'HELLO')
})

test('parser reports missing end tags instead of silently producing a broken AST', () => {
  assert.throws(() => parse('<div><span></div>'), /Missing end tag/)
})
