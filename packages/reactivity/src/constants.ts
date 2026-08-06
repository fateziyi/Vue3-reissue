export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive' // 唯一的名字
}

export enum DirtyLevels {
  NotDirty = 0,
  QueryingDirty = 1,
  MaybeDirty = 3,
  Dirty = 4,
}
