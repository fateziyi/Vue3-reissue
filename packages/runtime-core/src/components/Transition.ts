import { h } from "../h"

function nextFrame(fn) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}
export function resolveTransitionProps(props) {
  const { name = "v",
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave,
  } = props
  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el)
      el.classList.add(enterFromClass)
      el.classList.add(enterActiveClass)
    },
    onEnter(el, done) {
      const resolve = () => {
        el.classList.remove(enterToClass)
        el.classList.remove(enterActiveClass)
        done && done()
      }
      onEnter && onEnter(el, resolve)

      nextFrame(() => { // 保证产生动画
        el.classList.remove(enterFromClass)
        el.classList.add(enterToClass)
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    },
    onLeave(el, done) {
      const resolve = () => {
        el.classList.remove(leaveToClass)
        el.classList.remove(leaveActiveClass)
        done && done()
      }
      onLeave && onLeave(el, resolve)
      el.classList.add(leaveFromClass)
      document.body.offsetHeight // 触发重绘
      el.classList.add(leaveActiveClass)
      nextFrame(() => {
        el.classList.remove(leaveFromClass)
        el.classList.add(leaveToClass)
        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    },
  }
}
export function Transition(props, { slots }) {
  return h(BaseTransitionImple, resolveTransitionProps(props), slots)
}

const BaseTransitionImple = {
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function,
  },
  setup(props, { slots }) {
    return () => {
      const vnode = slots.default && slots.default()
      if (!vnode) return
      // 渲染前（离开）和渲染后（进入）
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        enter: props.onEnter,
        leave: props.onLeave
      }
      return vnode
    }
  }
}