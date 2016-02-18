import async from 'async'
import redis from './redis'

const startTermsKey = '__startterms__'

export default function getStore () {
  function storeState (state, nextState, opts, callback) {
    const fns = []

    if (opts.isStartTerm) {
      fns.push(async.apply(redis.sadd.bind(redis), startTermsKey, state.text))
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
