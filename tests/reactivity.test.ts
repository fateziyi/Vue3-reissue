import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computed,
  effect,
  reactive,
  watch,
} from '../packages/reactivity/src/index'

test('computed caches its value until a dependency changes', () => {
  const state = reactive({ count: 1 })
  let getterCalls = 0
  const doubled = computed(() => {
    getterCalls++
    return state.count * 2
  })

  assert.equal(doubled.value, 2)
  assert.equal(doubled.value, 2)
  assert.equal(getterCalls, 1)

  state.count = 2
  assert.equal(getterCalls, 1)
  assert.equal(doubled.value, 4)
  assert.equal(getterCalls, 2)
})

test('MaybeDirty skips downstream effects when computed output is unchanged', () => {
  const state = reactive({ count: 0 })
  let computedCalls = 0
  let effectCalls = 0
  const parity = computed(() => {
    computedCalls++
    return state.count % 2
  })

  effect(() => {
    effectCalls++
    return parity.value
  })

  state.count = 2
  assert.equal(computedCalls, 2)
  assert.equal(effectCalls, 1)

  state.count = 3
  assert.equal(computedCalls, 3)
  assert.equal(effectCalls, 2)
})

test('watch traverses cyclic reactive objects and runs cleanup on stop', () => {
  const raw: { count: number; self?: unknown } = { count: 0 }
  raw.self = raw
  const state = reactive(raw)
  let callbacks = 0
  let cleanups = 0
  const stop = watch(state, (_value, _oldValue, onCleanup) => {
    callbacks++
    onCleanup(() => cleanups++)
  })

  state.count++
  assert.equal(callbacks, 1)
  stop()
  assert.equal(cleanups, 1)
})
