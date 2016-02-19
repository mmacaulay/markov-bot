import async from 'async'
import { describe, it, beforeEach } from 'mocha'
import { assert } from 'chai'
import learn from '../../src/learn'
import redis from '../../src/redis'
import _ from 'lodash'

describe('learn', () => {
  const text = "You know what a turtle is? I've never seen a turtle... But I understand what you mean."

  beforeEach(redis.flushdb.bind(redis))
  beforeEach((cb) => {
    learn(text, cb)
  })

  it('tracks a list of start terms', (done) => {
    redis.smembers('__startterms__', (err, results) => {
      if (err) return done(err)
      const terms = _.chain(results)
        .map(JSON.parse)
        .sortBy('text')
        .map('text')
        .value()
      assert.deepEqual(terms, ["I've", 'You'])
      done()
    })
  })

  it('creates a chain of terms from a corpus of text', (done) => {
    const chains = [{
      key: 'You',
      text: 'know',
      score: '1'
    }, {
      key: 'know',
      text: 'what a',
      score: '1'
    }, {
      key: 'what a',
      text: 'turtle',
      score: '1'
    }, {
      key: 'turtle',
      text: 'is?',
      score: '1'
    }]

    const fns = chains.map((chain) => {
      return (cb) => {
        redis.zscan([`${chain.key}:chain`, 0], (err, result) => {
          if (err) return cb(err)
          assert.equal(result[1][1], chain.score)

          const value = JSON.parse(result[1][0])
          assert.equal(value.text, chain.text)
          cb()
        })
      }
    })

    async.parallel(fns, done)
  })
})
