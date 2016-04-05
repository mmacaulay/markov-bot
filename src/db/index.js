import config from 'config'

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

  return store
}
