export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive' // 唯一的名字
}

export enum DirtyLevels {
  Dirty = 4, // 脏值，意味着取值要运行计算属性
  NotDirty = 0 // 不脏，就用上一次的返回结果
}