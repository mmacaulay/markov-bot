import { describe, it, beforeEach } from 'mocha'
import { assert } from 'chai'
import _ from 'lodash'
import learn from '../../src/learn'
import { speak } from '../../src/speak'
import redis from '../../src/redis'

describe('speak', () => {
  const text = "You know what a turtle is? I've never seen a turtle... But I understand what you mean."

  beforeEach(redis.flushdb.bind(redis))
  beforeEach((cb) => {
    learn(text, cb)
  })

  it('starts with a start term', (done) => {
    const possibleStartTerms = ['You', "I've"]
    speak((err, result) => {
      if (err) return done(err)
      assert.isTrue(_.some(possibleStartTerms, (term) => {
        return result.indexOf(term) === 0
      }))
      done()
    })
  })

  it('assembles sentences by following chained states', (done) => {
    const possibleSentences = [
      "I've never seen a turtle... But I understand what you mean.",
      'You know what a turtle is?'
    ]
    speak((err, result) => {
      if (err) return done(err)
      assert.isTrue(_.some(possibleSentences, (sentence) => {
        return result === sentence
      }), result)
      done()
    })
  })
})
