export default function patchClass(el, value) {
  if (value == null) { // 移除class
    el.removeAttribute('class')
  } else { // 设置class
    el.className = value
  }
}