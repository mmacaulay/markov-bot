import async from 'async'
import redis from './redis'
import { weightedRandom } from './math'

const startTermsKey = '__startterms__'

function buildKey (term) {
  return `${term.tag}:${term.text}:chain`
}

export default function getStore () {
  function storeState (state, nextState, opts, callback) {
    const fns = []

    if (opts.isStartTerm) {
      fns.push(async.apply(redis.sadd.bind(redis), startTermsKey, JSON.stringify(state)))
    }

    const key = buildKey(state)
    if (nextState) {
      fns.push(async.apply(redis.zincrby.bind(redis), key, 1, JSON.stringify(nextState)))
    }

    async.series(fns, callback)
  }

  function getStartTerm (callback) {
    redis.srandmember(startTermsKey, (err, result) => {
      if (err) return callback(err)
      callback(null, JSON.parse(result))
    })
  }

  function nextState (term, callback) {
    const key = buildKey(term)
    redis.zrevrange([key, 0, 50, 'WITHSCORES'], (err, results) => {
      if (err) return callback(err)
      const collated = collateRangeResults(results)
      const weightedResult = weightedRandom(collated)
      callback(null, weightedResult ? JSON.parse(weightedResult.term) : null)
    })
  }

  function collateRangeResults (results) {
    return results.reduce((collected, item, index) => {
      if (index % 2 === 0) {
        collected.push({ term: item })
      } else {
        collected[collected.length - 1].score = parseInt(item, 10)
      }
      return collected
    }, [])
  }

  return {
    storeState: storeState,
    getStartTerm: getStartTerm,
    nextState: nextState
  }
}
