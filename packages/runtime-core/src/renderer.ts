import { ShapeFlags } from "@vue/shared"
import { isSameVnode } from "./createVnode"

export function createRenderer(rendererOptions) {
  // core中不关心如何渲染
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = rendererOptions

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container)
    }
  }
  const mountElement = (vnode, container) => {
    const { type, props, children, shapeFlag } = vnode
    let el = (vnode.el = hostCreateElement(type))
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }
    hostInsert(el, container)
  }

  const processElement = (n1, n2, container) => {
    if (n1 === null) {
      // 初始化操作
      mountElement(n2, container)
    } else {
      // 对比更新操作
      patchElement(n1, n2, container)
    }
  }

  const patchProps = (oldProps, newProps, el) => {
    for (let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }
    for (let key in oldProps) {
      if (!(key in newProps)) { // 以前多的现在没有了，需要删掉
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i]
      unmount(child)
    }
  }

  const patchChildren = (n1, n2, el) => {
    // text array null
    const c1 = n1.children
    const c2 = n2.children
    const prevShapeFlag = n1.shapeFlag
    const newShapeFlag = n2.shapeFlag

    if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 1. 新的为text，旧的为array，移除旧的children
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1)
      }
      // 新老都是文本，内容不相同替换
      if (c1 !== c2) {
        hostSetElementText(el, c2)
      }
    } else {
      // 2. 老的为array，新的也为array，全量diff算法
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 全量diff算法，两个数组的比对
        } else {
          // 老的是array，新的不是，移除老的子节点
          unmountChildren(c1)
        }
      } else {
        // 老的是文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }
        if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 老的是文本，新的是数组
          mountChildren(c2, el)
        }
      }
    }
  }

  const patchElement = (n1, n2, container) => {
    let el = (n2.el = n1.el) // 对DOM元素的复用

    let oldProps = n1.props || {}
    let newProps = n2.props || {}
    // hostPatchprops只针对某一个属性来处理
    patchProps(oldProps, newProps, el)
    patchChildren(n1, n2, el)
  }

  // 渲染和更新都走这里
  const patch = (n1, n2, container) => {
    if (n1 === n2) { // 两次渲染同一个元素，直接跳过
      return
    }

    if (n1 && !isSameVnode(n1, n2)) {
      // 不是相同的节点，需要卸载旧节点，挂载新节点
      unmount(n1)
      n1 = null // 执行后续n2的初始化
    }
    processElement(n1, n2, container) // 对元素处理
  }

  const unmount = (vnode) => hostRemove(vnode.el)

  // 多次调用render会进行虚拟节点的比较，再进行更新
  const render = (vnode, container) => {
    if (vnode == null) {
      // 移除当前容器中的DOM元素
      if (container._vnode) {
        unmount(container._vnode)
      }
    }
    // 将虚拟节点变成真实节点进行渲染
    patch(container._vnode || null, vnode, container)
    container._vnode = vnode
  }
  return { render }
}