import { isFunction } from '@vue/shared'
import { DirtyLevels } from './constants'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

class ComputedRefImpl<T> {
  public readonly __v_isRef = true
  public _value!: T
  public dep
  public effect: ReactiveEffect<T>

  constructor(getter: (oldValue: T | undefined) => T, public setter: (value: T) => void) {
    this.effect = new ReactiveEffect(() => getter(this._value), () => {
      // 依赖变化时先向下游传播“可能脏”。下游真正取值时再比较新旧值，
      // 只有 computed 结果变化才升级为 Dirty。
      triggerRefValue(this, DirtyLevels.MaybeDirty)
    })
  }

  get value() {
    if (this.effect.dirty) {
      const oldValue = this._value
      const newValue = this.effect.run()
      this._value = newValue
      if (!Object.is(oldValue, newValue)) {
        triggerRefValue(this, DirtyLevels.Dirty)
      }
    }
    trackRefValue(this)
    return this._value
  }

  set value(v: T) {
    this.setter(v)
  }
}

export function computed<T>(
  getterOrOptions:
    | ((oldValue?: T) => T)
    | { get: (oldValue?: T) => T; set: (value: T) => void }
) {
  const onlyGetter = isFunction(getterOrOptions)
  let getter: (oldValue?: T) => T
  let setter: (value: T) => void
  if (onlyGetter) {
    getter = getterOrOptions as (oldValue?: T) => T
    setter = () => {
      console.warn('Write operation failed: computed value is readonly')
    }
  } else {
    const options = getterOrOptions as {
      get: (oldValue?: T) => T
      set: (value: T) => void
    }
    getter = options.get
    setter = options.set
  }
  return new ComputedRefImpl(getter, setter)
}
