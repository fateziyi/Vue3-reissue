import { DirtyLevels } from "./constants"

export function effect(fn, options?) {
  // 创建一个响应式effect，数据变化后可以重新执行
  // 创建一个effect，只要依赖的属性变化了就要执行回调
  const _effect = new ReactiveEffect(fn, () => {
    // sheduler
    _effect.run()
  })
  _effect.run()
  if (options) {
    Object.assign(_effect, options) // 用用户传递的覆盖掉内置的
  }
  const runner = _effect.run.bind(_effect) // 绑定this，后续可以直接调用runner()
  runner.effect = _effect // 可以在run方法上获取到effect的引用
  return runner // 外界可以自己让其重新run
}

export let activeEffect

function preCleanEffect(effect) {
  effect._depsLength = 0
  effect._trackId++ // 每次执行id都是+1，如果当前同一个effect执行，id就是相同的
}

function postCleanEffect(effect) {
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanDepEffect(effect.deps[i], effect) // 删除映射表中对应的effect
    }
    effect.deps.length = effect._depsLength // 更新依赖列表的长度
  }
}

export class ReactiveEffect {
  _trackId = 0 // 用于记录当前effect执行了几次
  _depsLength = 0
  _running = 0
  _dirtyLevel = DirtyLevels.Dirty
  deps = []

  public active = true // 创建的effect是响应式的
  // fn:用户编写的函数
  // 如果fn中依赖的数据发生变化后，需要重新调用scheduler -> run()
  constructor(public fn, public scheduler) { }

  public get dirty() {
    return this._dirtyLevel === DirtyLevels.Dirty
  }

  public set dirty(v) {
    this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty
  }
  run() {
    this._dirtyLevel = DirtyLevels.NotDirty // 每次运行后，此值就不脏了，effect变为noDirty
    // 让fn执行
    if (!this.active) {
      return this.fn() // 不是激活的，执行后，不用做额外处理
    }
    let lastEffect = activeEffect
    try {
      activeEffect = this // 把当前的effect赋值给activeEffect
      // effect重新执行前，需要将上一次的依赖清空
      preCleanEffect(this)
      this._running++
      return this.fn() // 依赖收集 -> state.name, state.age
    } finally {
      this._running--
      postCleanEffect(this)
      activeEffect = lastEffect
    }
  }
  stop() {
    if (this.active) {
      this.active = false
      preCleanEffect(this)
      postCleanEffect(this)
    }
  }
}

// 双向记忆
// 1. _trackId 用于记录执行次数，防止一个属性在当前effect中多次依赖收集，只收集一次
// 2. 拿到上一次依赖的最后一个和这次的比较

function cleanDepEffect(dep, effect) {
  dep.delete(effect)
  if (dep.size === 0) {
    dep.cleanup() // 如果map为空，则删除这个属性
  }
}
export function trackEffects(effect, dep) { // 一个个收集
  // 需要重新收集依赖，将不需要的移除掉
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId) // 更新id
    let oldDep = effect.deps[effect._depsLength]
    // 如果没有存过
    if (oldDep !== dep) {
      if (oldDep) {
        // 删除掉老的
        cleanDepEffect(oldDep, effect)
      }
      // 换成新的
      effect.deps[effect._depsLength++] = dep // 永远按照本次最新的来存放
    } else {
      effect._depsLength++
    }
  }
}

export function triggerEffects(dep) {
  for (const effect of dep.keys()) {
    // 当前这个值是不脏的，但是触发更新需要将值变为脏值
    if (effect._dirtyLevel < DirtyLevels.Dirty) {
      effect._dirtyLevel = DirtyLevels.Dirty
    }
    if (!effect._running) { // 如果不是正在执行，那么才会执行
      if (effect.scheduler) {
        effect.scheduler() // -> effect.run()
      }
    }
  }
}