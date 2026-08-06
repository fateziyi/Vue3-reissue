// 返回最长严格递增子序列在原数组中的索引；0 表示新节点，没有旧节点可复用。
export default function getSequence(arr: number[]) {
  const predecessors = arr.slice()
  const result: number[] = []

  for (let i = 0; i < arr.length; i++) {
    const value = arr[i]
    if (value === 0) continue

    const lastIndex = result[result.length - 1]
    if (lastIndex === undefined || arr[lastIndex] < value) {
      predecessors[i] = lastIndex ?? -1
      result.push(i)
      continue
    }

    let low = 0
    let high = result.length - 1
    while (low < high) {
      const middle = (low + high) >> 1
      if (arr[result[middle]] < value) low = middle + 1
      else high = middle
    }

    if (value < arr[result[low]]) {
      predecessors[i] = low > 0 ? result[low - 1] : -1
      result[low] = i
    }
  }

  let cursor = result.length
  let last = result[cursor - 1]
  while (cursor-- > 0) {
    result[cursor] = last
    last = predecessors[last]
  }
  return result
}
