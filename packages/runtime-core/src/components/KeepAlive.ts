import { ShapeFlags } from "@vue/shared"
import { onMounted, onUpdated } from "../apiLifeCycle"
import { getCurrentInstance } from "../component"

export const KeepAlive = {
  __isKeepAlive: true,
  props: {
    max: Number
  },
  setup(props, { slots }) {
    const { max } = props
    const keys = new Set() // 记录那些组件缓存过
    const cache = new Map() // 缓存表
    let pendingCacheKey = null
    const instance = getCurrentInstance()
    const cacheSubTree = () => {
      // 缓存组件的虚拟节点，里面有组件的DOM元素
      cache.set(pendingCacheKey, instance.subTree) // 缓存组件的虚拟节点，里面有组件的DOM元素
    }
    const { move, createElement, unmount: _unmount } = instance.ctx.renderer
    function reset(vnode) {
      let shapeFlag = vnode.shapeFlag
      if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
      }
      if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      }
      vnode.shapeFlag = shapeFlag
    }
    function unmount(vnode) {
      reset(vnode)
      _unmount(vnode)
    }
    function pruneCacheEntry(key) {
      keys.delete(key)
      const cached = cache.get(key)
      cache.delete(key)
      // 还原vnode上的标识，否则无法走移除逻辑
      unmount(cached)
    }
    // 激活时执行
    instance.ctx.activate = function (vnode, container, anchor) {
      move(vnode, container, anchor)
    }
    // 卸载时执行
    const storageContent = createElement('div')
    instance.ctx.deactivate = function (vnode) {
      move(vnode, storageContent, null) // 将DOM元素临时移动到这个div中，但是没有被销毁
    }

    onMounted(cacheSubTree)
    onUpdated(cacheSubTree)
    return () => {
      const vnode = slots.default()
      const comp = vnode.type
      const key = vnode.key == null ? comp : vnode.key
      const cachedVNode = cache.get(key)
      pendingCacheKey = key
      if (cachedVNode) {
        vnode.component = cachedVNode.component // 直接复用组件
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        keys.delete(key)
        keys.add(key) // 刷新缓存
      } else {
        keys.add(key)
        if (max && keys.size > max) {
          // 超过最大缓存数，删除第一个缓存的组件
          pruneCacheEntry(keys.values().next().value)
        }
      }
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE // 不需要真的卸载的组件，只是缓存起来
      return vnode // 等待组件加载完毕后再去缓存
    }
  }
}

export const isKeepAlive = (value) => value.type.__isKeepAlive
