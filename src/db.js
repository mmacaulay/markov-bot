import async from 'async'
import redis from './redis'

const startWordsKey = '__startwords__'

export default function getStore () {
  function storeState (state, nextState, opts, callback) {
    const fns = []

    if (opts.isStartWord) {
      fns.push(async.apply(redis.sadd.bind(redis), startWordsKey, state.text))
    }

    if (nextState) {
      fns.push(async.apply(redis.zincrby.bind(redis), state.text + ':chain', 1, nextState.text))
    }

    async.series(fns, callback)
  }

  return {
    storeState: storeState
  }
}
