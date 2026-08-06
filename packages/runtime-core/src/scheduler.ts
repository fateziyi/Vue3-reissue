export interface SchedulerJob {
  (): void
  id?: number
}

const queue: SchedulerJob[] = []
const resolvedPromise = Promise.resolve()
let flushIndex = 0
let isFlushing = false
let isFlushPending = false
let currentFlushPromise: Promise<void> | null = null

const getId = (job: SchedulerJob) => job.id ?? Number.POSITIVE_INFINITY

function queueFlush() {
  if (isFlushing || isFlushPending) return
  isFlushPending = true
  currentFlushPromise = resolvedPromise.then(flushJobs)
}

function flushJobs() {
  isFlushPending = false
  isFlushing = true
  queue.sort((a, b) => getId(a) - getId(b))

  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      queue[flushIndex]?.()
    }
  } finally {
    flushIndex = 0
    queue.length = 0
    isFlushing = false
    currentFlushPromise = null
  }
}

export function queueJob(job: SchedulerJob) {
  const searchFrom = isFlushing ? flushIndex + 1 : flushIndex
  if (!queue.includes(job, searchFrom)) queue.push(job)
  queueFlush()
}

export function nextTick<T = void>(fn?: () => T) {
  const promise = currentFlushPromise || resolvedPromise
  return fn ? promise.then(fn) : promise
}
