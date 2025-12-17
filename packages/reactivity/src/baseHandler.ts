import { reactive } from "./reactive"
import { track, trigger } from "./reactiveEffect";
import { isObject } from "@vue/shared";

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive' // 唯一的名字
}

// proxy 需要搭配 reflect 使用
export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    // 当取值的时候，应该让响应式属性和effect映射起来
    // 依赖收集
    track(target, key) // 收集这个对象上的这个属性，和effect关联在一起
    let res = Reflect.get(target, key, receiver)
    if (isObject(res)) { // 当取的值也是对象的时候，我需要对这个对象再进行代理，即递归代理
      return reactive(res)
    }
    return res
  },

  set(target, key, value, receiver) {
    // 找到属性，让对应的effect重新执行
    let oldValue = target[key]
    let result = Reflect.set(target, key, value, receiver)
    if (oldValue !== value) {
      // 需要触发页面更新
      trigger(target, key, value, oldValue)
    }
    // 触发更新
    return result
  }
}