import { activeEffect } from "./effect";

export function track(target, key) {
  // activeEffect 有这个属性，说明这个key实在effect中访问的，没有说明在effect外访问的，不用进行收集
  if (activeEffect) {
    console.log(key, activeEffect);

  }
}