import async from 'async'
import redis from './redis'
import { weightedRandom } from './math'

const startTermsKey = '__startterms__'

export default function getStore (prefix, order) {
  function termKey (term) {
    return `${prefix}:${order}:${term.tag}:${term.normal}:terms`
  }

  function contextKey (term) {
    return `${prefix}:${order}:${term.tag}:${term.text}:chain`
  }

  function contextLessKey (term) {
    return `${prefix}:${order}:${term.normal}:chain`
  }

  function scanKey (term) {
    return `${prefix}:${order}:*${term.normal}*:terms`
  }

  function startKey () {
    return `${prefix}:${order}:${startTermsKey}`
  }

  function storeState (state, nextStates, opts, callback) {
    const fns = []

    if (opts.isStartTerm) {
      fns.push(async.apply(redis.sadd.bind(redis), startKey(), JSON.stringify(state)))
    }

    fns.push(async.apply(redis.set.bind(redis), termKey(state), JSON.stringify(state)))

    if (nextStates && nextStates.length) {
      fns.push(async.apply(redis.zincrby.bind(redis), contextKey(state), 1, JSON.stringify(nextStates)))
      fns.push(async.apply(redis.zincrby.bind(redis), contextLessKey(state), 1, JSON.stringify(nextStates)))
    }

    async.series(fns, callback)
  }

  function getStartTerm (callback) {
    redis.srandmember(startKey(), (err, result) => {
      if (err) return callback(err)
      callback(null, JSON.parse(result))
    })
  }

  function hasContext (term) {
    return term.tag && term.tag !== '?'
  }

  function weightedRandomFromSet (key, callback) {
    redis.zrevrange([key, 0, 50, 'WITHSCORES'], (err, results) => {
      if (err) return callback(err)
      const collated = collateRangeResults(results)
      const weightedResult = weightedRandom(collated)
      callback(null, weightedResult ? JSON.parse(weightedResult.states) : null)
    })
  }

  function nextStates (term, callback) {
    const key = hasContext(term) ? contextKey(term) : contextLessKey(term)
    weightedRandomFromSet(key, callback)
  }

  function collateRangeResults (results) {
    return results.reduce((collected, item, index) => {
      if (index % 2 === 0) {
        collected.push({ states: item })
      } else {
        collected[collected.length - 1].score = parseInt(item, 10)
      }
      return collected
    }, [])
  }

  function scanForFirstMatch (key, cursor, callback) {
    redis.scan([cursor, 'MATCH', key], (err, result) => {
      if (err) return callback(err)
      const [nextCursor, matches] = result
      if (matches.length > 0) {
        return callback(null, matches[0])
      }
      if (nextCursor === '0') {
        return callback()
      }
      scanForFirstMatch(key, nextCursor, callback)
    })
  }

  function fuzzyMatch (term, callback) {
    const key = scanKey(term)
    scanForFirstMatch(key, 0, (err, result) => {
      if (err) return callback(err)
      if (result) {
        redis.get(result, (err, termText) => {
          if (err) return callback(err)
          callback(null, JSON.parse(termText))
        })
      } else {
        callback()
      }
    })
  }

  return {
    storeState: storeState,
    getStartTerm: getStartTerm,
    nextStates: nextStates,
    fuzzyMatch: fuzzyMatch
  }
}
