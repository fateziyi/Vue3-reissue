import { currentInstance } from "./component"

export function provide(key, value) {
  if (!currentInstance) return
  const parentProvides = currentInstance.parent?.provides
  let provides = currentInstance.provides
  if (parentProvides === provides) {
    provides = currentInstance.provides = Object.create(provides)
  }
  provides[key] = value
}

export function inject(key, defaultValue) {
  if (!currentInstance) return
  const provides = currentInstance.parent?.provides
  if (provides && key in provides) {
    return provides[key]
  } else {
    return defaultValue
  }
}