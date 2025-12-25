export enum PatchFlags {
  TEXT = 1, // 文本节点
  CLASS = 1 << 1, // 类名
  STYLE = 1 << 2, // 样式
  PROPS = 1 << 3, // 属性
  FULL_PROPS = 1 << 4, // 全量属性
  NEED_HYDRATION = 1 << 5, // 需要水合
  STABLE_FRAGMENT = 1 << 6, // 稳定的Fragment
  KEYED_FRAGMENT = 1 << 7, // 有key的Fragment
  UNKEYED_FRAGMENT = 1 << 8, // 无key的Fragment
  NEED_PATCH = 1 << 9, // 需要patch
  DYNAMIC_SLOTS = 1 << 10, // 动态插槽
  DEV_ROOT_FRAGMENT = 1 << 11, // 开发环境下的根Fragment
  HOISTED = -1, // 静态节点
  BAIL = -2, //  Bail hydration
}