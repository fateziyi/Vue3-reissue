import assert from 'node:assert/strict'
import test from 'node:test'

import { createVnode } from '../packages/runtime-core/src/createVnode'
import { createRenderer } from '../packages/runtime-core/src/renderer'
import { nextTick, queueJob } from '../packages/runtime-core/src/scheduler'
import getSequence from '../packages/runtime-core/src/seq'

test('scheduler batches duplicate jobs, sorts by id, and drains appended jobs', async () => {
  const calls: number[] = []
  const child = Object.assign(() => calls.push(2), { id: 2 })
  const appended = Object.assign(() => calls.push(3), { id: 3 })
  const parent = Object.assign(
    () => {
      calls.push(1)
      queueJob(appended)
    },
    { id: 1 }
  )

  queueJob(child)
  queueJob(parent)
  queueJob(child)
  await nextTick()
  assert.deepEqual(calls, [1, 2, 3])
})

test('LIS ignores zero placeholders and returns source indexes', () => {
  assert.deepEqual(getSequence([2, 0, 3, 1, 5, 4]), [0, 2, 5])
})

test('keyed diff reuses the LIS and only moves out-of-order nodes', () => {
  const operations: string[] = []
  const root: any = { type: 'root', children: [] }
  const renderer = createRenderer({
    createElement: (type) => ({ type, children: [], props: {}, parent: null }),
    createText: (text) => ({ type: 'text', text, parent: null }),
    setText: (node, text) => (node.text = text),
    setElementText: (node, text) => {
      node.text = text
      node.children = []
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => {
      const siblings = node.parent?.children || []
      return siblings[siblings.indexOf(node) + 1] || null
    },
    patchProp: (node, key, _previous, next) => (node.props[key] = next),
    insert: (node, parent, anchor = null) => {
      const previousIndex = parent.children.indexOf(node)
      if (previousIndex >= 0) {
        parent.children.splice(previousIndex, 1)
        operations.push(`move:${node.props.key}`)
      }
      const anchorIndex = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(anchorIndex < 0 ? parent.children.length : anchorIndex, 0, node)
      node.parent = parent
    },
    remove: (node) => {
      const index = node.parent.children.indexOf(node)
      if (index >= 0) node.parent.children.splice(index, 1)
    },
  })
  const item = (key: string) => createVnode('p', { key }, key)

  renderer.render(createVnode('div', null, ['a', 'b', 'c', 'd'].map(item)), root)
  operations.length = 0
  renderer.render(createVnode('div', null, ['a', 'c', 'b', 'e', 'd'].map(item)), root)

  const keys = root.children[0].children.map((node) => node.props.key)
  assert.deepEqual(keys, ['a', 'c', 'b', 'e', 'd'])
  assert.equal(operations.length, 1)
})
