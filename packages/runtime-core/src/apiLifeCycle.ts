import { currentInstance, setCurrentInstance, unsetCurrentInstance } from "./component"

export const enum LifeCycles {
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
}

function createHook(type) {
  // 将当前实例存到了此钩子上
  return (hook, target = currentInstance) => {
    if (target) {
      // 看当前钩子是否存放，发布订阅
      const hooks = target[type] || (target[type] = [])
      //让currentInstance存到函数里
      const wrapHook = () => {
        // 在钩子执行前，对实例进行校正处理
        setCurrentInstance(target)
        hook.call(target)
        unsetCurrentInstance()
      }
      // 在执行函数内部保证实例是正确的
      hooks.push(wrapHook) // setup执行完毕后就会将instance清空
    }
  }
}

export const onBeforeMount = createHook(LifeCycles.BEFORE_MOUNT)
export const onMounted = createHook(LifeCycles.MOUNTED)
export const onBeforeUpdate = createHook(LifeCycles.BEFORE_UPDATE)
export const onUpdated = createHook(LifeCycles.UPDATED)

export function invokeArray(fns) {
  for (let i = 0; i < fns.length; i++) {
    fns[i]()
  }
}
