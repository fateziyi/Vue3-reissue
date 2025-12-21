export default function getSequence(arr) {
  const result = [0]
  const p = result.slice(0) // 用于存放索引
  let start
  let end
  let middle
  const len = arr.length

  for (let i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      // 拿出结果集对应的最后一项，和我当前的这一项来做比对
      let resultLastIndex = result[result.length - 1]
      if (arr[resultLastIndex] < arrI) {
        p[i] = resultLastIndex // 正常放入的时候，前一个节点的索引就是result中的最后一个
        result.push(i)
        continue
      }
    }
    start = 0
    end = result.length - 1
    while (start < end) {
      middle = (start + end) / 2 | 0
      if (arr[result[middle]] < arrI) {
        start = middle + 1
      } else {
        end = middle
      }
    }
    if (arrI < arr[result[start]]) {
      p[i] = result[start - 1] // 找到节点的前一个节点
      result[start] = i
    }
  }
  // 需要创造前驱节点，进行倒序追溯，因为最后一项肯定不会错
  let l = result.length
  let last = result[l - 1]
  while (l-- > 0) {
    result[l] = last
    last = p[last] // 在数组中找到最后一个
  }
  return result
}