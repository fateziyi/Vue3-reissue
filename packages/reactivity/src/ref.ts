import { activeEffect, trackEffects, triggerEffects } from "./effect"
import { toReactive } from "./reactive"
import { createDep } from "./reactiveEffect"

export function ref(value) {
  return createRef(value)
}

function createRef(value) {
  return new RefImpl(value)
}

class RefImpl {
  public __v_isRef = true // 增加ref标识
  public _value // 用来保存ref的值
  public dep // 收集对应的effect
  constructor(public rawValue) {
    this._value = toReactive(rawValue)
  }
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue // 更新值
      this._value = newValue // 更新值
      triggerRefValue(this)
    }
  }
}

export function trackRefValue(ref) {
  if (activeEffect) { // 如果有effect，则进行依赖收集
    trackEffects(
      activeEffect,
      (ref.dep = ref.dep || createDep(() => ref.dep = undefined, 'undefined'))
    )
  }
}

export function triggerRefValue(ref) {
  let dep = ref.dep
  if (dep) {
    triggerEffects(dep) // 触发依赖更新
  }
}

class ObjectRefImpl {
  public __v_isRef = true // 增加ref标识

  constructor(public _object, public _key) {
  }
  get value() {
    return this._object[this._key]
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
}

export function toRef(object, key) {
  return new ObjectRefImpl(object, key)
}

export function toRefs(object) {
  const result = {}
  for (const key in object) { // 遍历对象调用toRef
    result[key] = toRef(object, key)
  }
  return result
}

export function proxyRefs(objectWithRef) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      let r = Reflect.get(target, key, receiver)
      return r.__v_isRef ? r.value : r // 如果是ref则返回ref.value
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      if (oldValue.__v_isRef) { // 如果是ref则设置ref.value
        oldValue.value = value
        return true
      } else { // 否则直接设置
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
}

export function isRef(value) {
  return value && value.__v_isRef
}
