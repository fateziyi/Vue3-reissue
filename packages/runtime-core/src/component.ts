import { reactive } from "@vue/reactivity"
import { hasOwn, isFunction } from "@vue/shared"

export function createComponentInstance(vnode) {
  const instance = {
    data: null, // 组件的状态
    vnode, // 虚拟节点
    subTree: null, // 组件的子树
    isMounted: false, // 组件是否挂载
    update: null, // 组件的更新函数
    props: {}, // 组件的props
    attrs: {}, // 组件的attrs
    propsOptions: vnode.type.props, // 用户声明的那些属性是组件的属性
    component: null, // 组件的实例
    proxy: null // 组件的代理对象
  }
  return instance
}

// 初始化属性
const initProps = (instance, rawProps) => {
  const props = {}
  const attrs = {}
  const propsOptions = instance.propsOptions || {} // 组件中定义的
  if (rawProps) {
    for (let key in rawProps) { // 用所有的来分裂
      const value = rawProps[key]
      if (key in propsOptions) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }
  instance.props = reactive(props)
  instance.attrs = attrs
}

const publicProperty = {
  $attrs: (instance) => instance.attrs,
}

const handler = {
  get(target, key) {
    const { data, props } = target
    if (data && hasOwn(data, key)) {
      return data[key]
    } else if (props && hasOwn(props, key)) {
      return props[key]
    }
    const getter = publicProperty[key]
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { data, props } = target
    if (data && hasOwn(data, key)) {
      data[key] = value
    } else if (props && hasOwn(props, key)) {
      console.log("props are readonly");
      return false
    }
    return true
  }
}

export function setupComponent(instance) {
  const { vnode } = instance
  // 赋值属性
  initProps(instance, vnode.props)
  // 赋值代理对象
  instance.proxy = new Proxy(instance, handler)
  const { data = () => { }, render } = vnode.type
  if (!isFunction(data)) {
    console.warn("data must be a function");
  } else {
    // data中可以拿到props
    instance.data = reactive(data.call(instance.proxy))
  }
  instance.render = render
}
