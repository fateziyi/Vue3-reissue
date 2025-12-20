import { nodeOps } from "./nodeOps"
import patchProp from "./patchProp"
import { createRenderer } from "@vue/runtime-core"

// 将节点操作和属性操作合并在一起
const rendererOptions = Object.assign({ patchProp }, nodeOps)

export { rendererOptions }
export * from "@vue/runtime-core"

// render方法采用DOMAPI来进行渲染
export const render = (vnode, container) => createRenderer(rendererOptions).render(vnode, container)