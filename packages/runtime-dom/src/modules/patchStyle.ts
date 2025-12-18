export default function patchStyle(el, prevValue, nextValue) {
  let style = el.style
  for (let key in nextValue) { // 添加新的样式
    style[key] = nextValue[key]
  }
  if (prevValue) {
    for (let key in prevValue) { // 删除老的样式
      if (nextValue[key] == null) {
        style[key] = null
      }
    }
  }
}
