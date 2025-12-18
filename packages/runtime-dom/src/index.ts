

import { nodeOps } from "./nodeOps"
import patchProp from "./patchProp"

// 将节点操作和属性操作合并在一起
const rendererOptions = Object.assign({ patchProp }, nodeOps)

export { rendererOptions }
export * from "@vue/reactivity"
function createRenderer() { }

// createRenderer(rendererOptions).render()