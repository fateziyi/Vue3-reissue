import { ShapeFlags } from "@vue/shared"
import { isSameVnode, Text, Fragment, createVnode } from "./createVnode"
import getSequence from "./seq"
import { isRef, ReactiveEffect } from "@vue/reactivity"
import { queueJob } from "./scheduler"
import { createComponentInstance, setupComponent } from "./component"
import { invokeArray } from "./apiLifeCycle"
import { isKeepAlive } from "./components/KeepAlive"

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

  const normalize = (children) => {
    for (let i = 0; i < children.length; i++) {
      if (typeof children[i] === 'string' || typeof children[i] === 'number') {
        children[i] = createVnode(Text, null, String(children[i]))
      }
    }
    return children
  }

  const mountChildren = (children, container, parentComponent) => {
    normalize(children)
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container, parentComponent)
    }
  }
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, props, children, shapeFlag, transition } = vnode
    let el = (vnode.el = hostCreateElement(type))
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent)
    }
    if (transition) {
      transition.beforeEnter(el)
    }
    hostInsert(el, container, anchor)
    if (transition) {
      transition.enter(el)
    }
  }

  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      // 初始化操作
      mountElement(n2, container, anchor, parentComponent)
    } else {
      // 对比更新操作
      patchElement(n1, n2, container, parentComponent)
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

  const unmountChildren = (children, parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i]
      unmount(child, parentComponent)
    }
  }

  // 全量diff（递归diff）
  const patchKeyedChildren = (c1, c2, el, parentComponent) => { // 比较两个儿子的差异，来更新el
    // 先从头比对，再从尾比对，减少比对范围，如果有多余直接新增即可 
    let i = 0 // 开始比对的索引 
    let e1 = c1.length - 1 // 旧的最后一个索引
    let e2 = c2.length - 1 // 新的最后一个索引

    while (i <= e1 && i <= e2) { // 有任何一方循环结束就要终止比较
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVnode(n1, n2)) {
        // 相同节点，递归对比更新
        patch(n1, n2, el)
      } else {
        break
      }
      i++
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVnode(n1, n2)) {
        // 相同节点，递归对比更新
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }
    // 特殊情况的处理
    if (i > e1) { // 新的多
      if (i <= e2) { // 有插入的部分
        let nextPos = e2 + 1 // 检查下一个元素是否存在
        let anchor = c2[nextPos]?.el
        while (i <= e2) {
          patch(null, c2[i], el, anchor) // 创建新的DOM元素
          i++
        }
      }
    } else if (i > e2) {
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i], parentComponent)
          i++
        }
      }
    } else {
      let s1 = i
      let s2 = i
      const keyToNewIndexMap = new Map() // 做一个映射表用于快速查找，看老的是否在新的里面还有，没有就删除，有的话就更新
      // 插入元素过程中可能新的元素多，需要创建
      let toBePatched = e2 - s2 + 1 // 需要倒序插入的个数
      let newIndexToOldIndexMap = new Array(toBePatched).fill(0)
      // 根据最长递增子序列求出对应的索引结果
      // 根据新的节点，找到对应老的位置
      for (let i = s2; i <= e2; i++) {
        const vnode = c2[i]
        keyToNewIndexMap.set(vnode.key, i)
      }
      for (let i = s1; i <= e1; i++) {
        const vnode = c1[i]
        const newIndex = keyToNewIndexMap.get(vnode.key)
        if (newIndex === undefined) {
          // 说明老的节点在新的节点中没有，需要删除
          unmount(vnode, parentComponent)
        } else {
          // 说明老的节点在新的节点中还有，需要更新
          // i可能有0的情况
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          patch(vnode, c2[newIndex], el)
        }
      }
      let increasingSeq = getSequence(newIndexToOldIndexMap)
      let j = increasingSeq.length - 1 // 索引
      // 调整顺序
      for (let i = toBePatched - 1; i >= 0; i--) {
        let newIndex = s2 + i // 下一个元素作为参照物进行插入
        let anchor = c2[newIndex + 1]?.el
        let vnode = c2[newIndex]
        if (!vnode.el) { // 新增的元素
          // 新增的元素，需要插入到参照物的前面
          patch(null, vnode, el, anchor) // 创建h插入
        } else {
          if (i == increasingSeq[j]) {
            j-- // diff算法的优化
          } else {
            // 说明是移动操作，需要移动到参照物的前面
            hostInsert(vnode.el, el, anchor) // 倒序插入
          }
        }
      }
    }
  }
  const patchChildren = (n1, n2, el, parentComponent) => {
    // text array null
    const c1 = n1.children
    const c2 = normalize(n2.children)
    const prevShapeFlag = n1.shapeFlag
    const newShapeFlag = n2.shapeFlag

    if (newShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 1. 新的为text，旧的为array，移除旧的children
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1, parentComponent)
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
          patchKeyedChildren(c1, c2, el, parentComponent)
        } else {
          // 老的是array，新的不是，移除老的子节点
          unmountChildren(c1, parentComponent)
        }
      } else {
        // 老的是文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }
        if (newShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 老的是文本，新的是数组
          mountChildren(c2, el, parentComponent)
        }
      }
    }
  }

  const patchElement = (n1, n2, container, parentComponent) => {
    let el = (n2.el = n1.el) // 对DOM元素的复用

    let oldProps = n1.props || {}
    let newProps = n2.props || {}
    // hostPatchprops只针对某一个属性来处理
    patchProps(oldProps, newProps, el)
    patchChildren(n1, n2, el, parentComponent)
  }

  const processText = (n1, n2, container) => {
    if (n1 == null) {
      // 1. 虚拟节点要关联真实节点
      // 2. 将节点插入到页面中
      hostInsert(n2.el = hostCreateText(n2.children), container)
    } else {
      const el = (n2.el = n1.el)
      // 1. 判断文本内容是否相同
      if (n1.children !== n2.children) {
        // 2. 如果内容不同，则更新内容
        hostSetText(el, n2.children)
      }
    }
  }

  const processFragment = (n1, n2, container, parentComponent) => {
    if (n1 == null) {
      mountChildren(n2.children, container, parentComponent)
    } else {
      patchChildren(n1, n2, container, parentComponent)
    }
  }

  const updateComponentPreRender = (instance, next) => {
    instance.next = null
    instance.vnode = next
    updateProps(instance, instance.props, next.props || {})
    // 组件更新的时候，需要更新插槽
    Object.assign(instance.slots, next.children)
  }

  function renderComponent(instance) {
    const { render, vnode, proxy, props, attrs, slots } = instance
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      return render.call(proxy, proxy)
    } else {
      return vnode.type(attrs, { slots }) // 函数式组件
    }
  }

  function setupRenderEffect(instance, container, anchor, parentComponent) {
    const componentUpdateFn = () => {
      // 要区分是第一次还是之后渲染
      const { bm, m } = instance
      if (!instance.isMounted) {
        if (bm) {
          invokeArray(bm)
        }

        const subTree = renderComponent(instance)
        patch(null, subTree, container, anchor, instance)
        instance.isMounted = true
        instance.subTree = subTree

        if (m) {
          invokeArray(m)
        }
      } else {
        // 基于状态的组件更新
        const { next, bu, u } = instance
        if (next) {
          // 更新属性和插槽
          updateComponentPreRender(instance, next)
        }
        if (bu) {
          invokeArray(bu)
        }

        const subTree = renderComponent(instance)
        patch(instance.subTree, subTree, container, anchor, instance)
        instance.subTree = subTree

        if (u) {
          invokeArray(u)
        }
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update))
    const update = (instance.update = () => effect.run())
    update()
  }

  const mountComponent = (vnode, container, anchor, parentComponent) => {
    const instance = (vnode.component = createComponentInstance(vnode, parentComponent))
    if (isKeepAlive(vnode)) {
      instance.ctx.renderer = {
        createElement: hostCreateElement, // 内部需要创建一个div来缓存DOM
        move(vnode, container, anchor) { // 需要把之前渲染的DOM放在容器中
          hostInsert(vnode.component.subTree.el, container, anchor)
        },
        unmount, // 如果组件切换需要将现在容器中的元素卸载
      }
    }
    setupComponent(instance) // 给实例赋值属性
    // 组件可以基于自己的状态重新渲染
    // 根据propsOptions区分出props和attrs
    setupRenderEffect(instance, container, anchor, parentComponent) // 创建一个effect，用于组件更新
  }

  const hasPropsChange = (prevProps, nextProps) => {
    let nKeys = Object.keys(nextProps)
    let pKeys = Object.keys(prevProps)
    if (nKeys.length !== pKeys.length) {
      return true
    }
    for (let i = 0; i < nKeys.length; i++) {
      const key = nKeys[i]
      if (nextProps[key] !== prevProps[key]) {
        return true
      }
    }
    return false
  }

  const updateProps = (instance, prevProps, nextProps) => {
    if (hasPropsChange(prevProps, nextProps)) { // 属性是否有变化
      for (let key in nextProps) { // 新的属性覆盖旧的属性
        instance.props[key] = nextProps[key]
      }
      for (let key in instance.props) { // 旧的属性有，新的没有，则删除
        if (!(key in nextProps)) {
          delete instance.props[key]
        }
      }
    }
  }

  const shouldUpdateComponent = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1
    const { props: nextProps, children: nextChildren } = n2
    if (prevChildren || nextChildren) { // 1. 新老子节点都存在
      return true
    }
    if (prevProps === nextProps) return false
    return hasPropsChange(prevProps, nextProps) // 如果属性不一致，则更新
  }

  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component) // 复用组件实例
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2 // 如果调用update有next属性，说明是属性更新或插槽更新
      instance.update() // 统一更新逻辑
    }
  }

  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      // 1. 虚拟节点要关联真实节点
      // 2. 将节点插入到页面中
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        // 缓存组件，不进行挂载
        parentComponent.ctx.activate(n2, container, anchor)
      } else {
        mountComponent(n2, container, anchor, parentComponent)
      }
    } else {
      // 组件更新
      updateComponent(n1, n2)
    }
  }

  // 渲染和更新都走这里
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 === n2) { // 两次渲染同一个元素，直接跳过
      return
    }

    if (n1 && !isSameVnode(n1, n2)) {
      // 不是相同的节点，需要卸载旧节点，挂载新节点
      unmount(n1, parentComponent)
      n1 = null // 执行后续n2的初始化
    }
    const { type, shapeFlag, ref } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) { // 元素
          processElement(n1, n2, container, anchor, parentComponent)
        } else if (shapeFlag & ShapeFlags.TELEPORT) { // 传送门
          type.process(n1, n2, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            move(vnode, container, achor) {
              // 可以将组件或者DOM元素移动到指定的位置
              hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el, container, achor)
            }
          })
        } else if (shapeFlag & ShapeFlags.COMPONENT) { // 组件
          processComponent(n1, n2, container, anchor, parentComponent)
        }
    }
    if (ref !== null) {
      setRef(ref, n2)
    }
  }

  function setRef(rawRef, vnode) {
    let value = vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? vnode.component.expose || vnode.component.proxy
      : vnode.el
    if (isRef(rawRef)) {
      rawRef.value = value
    }
  }

  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, transition, el } = vnode
    const performRemove = () => hostRemove(vnode.el)
    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      // 缓存组件，不进行卸载
      parentComponent.ctx.deactivate(vnode)
    } else if (vnode.type === Fragment) {
      unmountChildren(vnode.children, parentComponent)
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
      unmount(vnode.component.subTree, parentComponent)
    } else if (shapeFlag & ShapeFlags.TELEPORT) {
      vnode.target.remove(vnode, unmountChildren)
    } else {
      if (transition) {
        transition.leave(el, performRemove)
      } else {
        performRemove()
      }
    }
  }

  // 多次调用render会进行虚拟节点的比较，再进行更新
  const render = (vnode, container) => {
    if (vnode == null) {
      // 移除当前容器中的DOM元素
      if (container._vnode) {
        unmount(container._vnode, null)
      }
    } else {
      // 将虚拟节点变成真实节点进行渲染
      patch(container._vnode || null, vnode, container)
      container._vnode = vnode
    }
  }
  return { render }
}