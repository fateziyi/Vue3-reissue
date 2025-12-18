import { isFunction } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { trackRefValue, triggerRefValue } from "./ref";

class ComputedRefImpl {
  public _value
  public effect
  public dep
  constructor(getter, public setter) {
    //需要创建一个effect来管理当前计算属性的dirty属性
    this.effect = new ReactiveEffect(() => getter(this._value), () => {
      // 计算属性依赖的值变化了，我们应该触发渲染effect的重新执行
      triggerRefValue(this) // 依赖的属性变化后需要触发重新渲染，还需要将dirty变成true
    })
  }
  get value() {
    if (this.effect.dirty) { // 默认取值一定是脏的，但是执行一次run后就不脏了
      this._value = this.effect.run()
      trackRefValue(this)
      // 如果当前在effect中访问了计算属性，计算属性是可以收集这个effect的
    }
    return this._value
  }
  set value(v) {
    // 这是ref的setter
    this.setter(v)
  }
}

export function computed(getterOrOptions) {
  let onlyGetter = isFunction(getterOrOptions)
  let getter
  let setter
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => { }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  return new ComputedRefImpl(getter, setter) // 计算属性ref
}