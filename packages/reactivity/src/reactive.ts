import { isObject } from "@vue/shared";
import { mutableHandlers } from "./baseHandler";
import { ReactiveFlags } from "./constants";

// 用于记录代理后的结果，可以复用
const reactiveMap = new WeakMap()

function createReactiveObject(target) {
  // 统一判断响应式对象是否是对象
  if (!isObject(target)) {
    return target
  }
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  // 取缓存，如果有直接返回
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  let proxy = new Proxy(target, mutableHandlers)
  // 根据对象缓存代理后的结果
  reactiveMap.set(target, proxy)
  return proxy
}

export function reactive(target) {
  return createReactiveObject(target)
}

export function toReactive(value) {
  return isObject(value) ? reactive(value) : value
}

export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}
