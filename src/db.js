import async from 'async'
import redis from './redis'
import { weightedRandom } from './math'

const startTermsKey = '__startterms__'

export default function getStore (order) {
  const prefix = order || 1

  function chainKey (term) {
    return `${prefix}:${term.tag}:${term.text}:chain`
  }

  function startKey () {
    return `${prefix}:${startTermsKey}`
  }

  function storeState (state, nextStates, opts, callback) {
    const fns = []

    if (opts.isStartTerm) {
      fns.push(async.apply(redis.sadd.bind(redis), startKey(), JSON.stringify(state)))
    }

    const key = chainKey(state)
    if (nextStates) {
      fns.push(async.apply(redis.zincrby.bind(redis), key, 1, JSON.stringify(nextStates)))
    }

    async.series(fns, callback)
  }

  function getStartTerm (callback) {
    redis.srandmember(startKey(), (err, result) => {
      if (err) return callback(err)
      callback(null, JSON.parse(result))
    })
  }

  function nextStates (term, callback) {
    const key = chainKey(term)
    redis.zrevrange([key, 0, 50, 'WITHSCORES'], (err, results) => {
      if (err) return callback(err)
      const collated = collateRangeResults(results)
      const weightedResult = weightedRandom(collated)
      callback(null, weightedResult ? JSON.parse(weightedResult.states) : null)
    })
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

  return {
    storeState: storeState,
    getStartTerm: getStartTerm,
    nextStates: nextStates
  }
}
