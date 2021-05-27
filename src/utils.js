const createAsyncQueue = () => {
  const queue = []
  return async (f) => {
    while (queue.length > 0) {
      try {
        // we can keep waiting for queue[0]
        // because the original caller will shift the queue
        await queue[0]
      } catch (err) {
        // do nothing (someone else is handling this)
      }
    }

    const promise = f()

    queue.push(promise)

    let result, error

    try {
      result = await promise
    } catch (e) {
      error = e
    }

    queue.shift()

    if (error) {
      throw error
    }

    return result
  }
}

module.exports = {
  dateFromTimestamp: timestamp => (new Date(timestamp)).toLocaleString('en').replace(',', ''),
  createAsyncQueue
}
