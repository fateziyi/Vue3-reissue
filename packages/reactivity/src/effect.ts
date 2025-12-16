export function effect(fn, options?) {
  // 创建一个响应式effect，数据变化后可以重新执行
  // 创建一个effect，只要依赖的属性变化了就要执行回调
  const _effect = new ReactiveEffect(fn, () => {
    // sheduler
    _effect.run()
  })
  _effect.run()
  return _effect
}

export let activeEffect
class ReactiveEffect {
  active = true // 创建的effect是响应式的
  // fn:用户编写的函数
  // 如果fn中依赖的数据发生变化后，需要重新调用scheduler -> run()
  constructor(public fn, public scheduler) {

  }
  run() {
    // 让fn执行
    if (!this.active) {
      return this.fn() // 不是激活的，执行后，不用做额外处理
    }
    let lastEffect = activeEffect
    try {
      activeEffect = this // 把当前的effect赋值给activeEffect
      return this.fn() // 依赖收集 -> state.name, state.age
    } finally {
      activeEffect = lastEffect
    }
  }
  stop() {
    if (this.active) {
      this.active = false
    }
  }
}