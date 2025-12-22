const queue = [] // 缓存当前要执行的队列
let isFlushing = false
const resolvePromise = Promise.resolve()

// 如果同时在一个组件中更新多个状态，job肯定是同一个
// 同时开启一个异步任务
export function queueJob(job) {
  if (!queue.includes(job)) { // 避免重复入队列
    queue.push(job) // 让任务入队列
  }
  if (!isFlushing) {
    isFlushing = true
    resolvePromise.then(() => {
      isFlushing = false
      const copy = queue.slice(0) // 先拷贝，再执行
      queue.length = 0
      copy.forEach(job => job())
      copy.length = 0
    })
  }
}