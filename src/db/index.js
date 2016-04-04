import config from 'config'
import async from 'async'

import es from './elasticsearch'
import redis from './redis'

module.exports = function getStore (prefix, order) {
  const esStore = es(prefix, order)
  const redisStore = redis(prefix, order)
  let store
  if (config.db === 'elasticsearch') {
    store = esStore
  } else {
    store = redisStore
  }

  if (config.dual_learning_mode) {
    store.storeState = function storeState (state, nextStates, opts, callback) {
      async.series([
        async.apply(esStore.storeState, state, nextStates, opts),
        async.apply(redisStore.storeState, state, nextStates, opts)
      ], callback)
    }
  }

  return store
}
