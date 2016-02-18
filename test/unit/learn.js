import async from 'async'
import mocha from 'mocha'
import { assert } from 'chai'
import learn from '../../src/learn'
import redis from '../../src/redis'

const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach

describe('learn', () => {
  const text = "You know what a turtle is? I've never seen a turtle... But I understand what you mean."

  beforeEach(redis.flushdb.bind(redis))
  beforeEach((cb) => {
    learn(text, cb)
  })

  it('tracks a list of start words', (done) => {
    redis.smembers('__startwords__', (err, results) => {
      if (err) return done(err)
      const words = results
      words.sort()
      assert.deepEqual(results, ["I've", 'You'])
      done()
    })
  })

  it('creates a chain of terms from a corpus of text', (done) => {
    const chains = [{
      key: 'You',
      value: 'know',
      score: '1'
    }, {
      key: 'know',
      value: 'what a',
      score: '1'
    }, {
      key: 'what a',
      value: 'turtle',
      score: '1'
    }, {
      key: 'turtle',
      value: 'is?',
      score: '1'
    }]

    const fns = chains.map((chain) => {
      return (cb) => {
        redis.zscan([`${chain.key}:chain`, 0], (err, result) => {
          if (err) return cb(err)
          assert.deepEqual(result[1], [chain.value, chain.score])
          cb()
        })
      }
    })

    async.series(fns, done)
  })
})
