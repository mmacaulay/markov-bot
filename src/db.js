import async from 'async'
import redis from './redis'

const startTermsKey = '__startterms__'

export default function getStore () {
  function storeState (state, nextState, opts, callback) {
    const fns = []

    if (opts.isStartTerm) {
      fns.push(async.apply(redis.sadd.bind(redis), startTermsKey, JSON.stringify(state)))
    }

    if (nextState) {
      fns.push(async.apply(redis.zincrby.bind(redis), state.text + ':chain', 1, JSON.stringify(nextState)))
    }

    async.series(fns, callback)
  }

  function getStartTerm (callback) {
    redis.srandmember(startTermsKey, callback)
  }

  return {
    storeState: storeState,
    getStartTerm: getStartTerm
  }
}
