import { describe, it, beforeEach } from 'mocha'
import { assert } from 'chai'
import _ from 'lodash'
import async from 'async'
import learn from '../../src/learn'
import { speak, speakAbout } from '../../src/speak'
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

  it('can specify an order', (done) => {
    const pangrams = ['The quick brown fox jumps over the lazy dog.',
    'The five boxing wizards jump quickly.',
    'Pack my box with five dozen liquor jugs.']
    const orderText = pangrams.join(' ')

    const possibleSentences1 = [
      pangrams[0],
      pangrams[1],
      pangrams[2],
      'The five dozen liquor jugs.'
    ]
    const possibleSentences2 = [
      pangrams[0],
      pangrams[1],
      pangrams[2]
    ]
    const fns = [
      async.apply(redis.flushdb.bind(redis)),
      async.apply(learn, orderText, { orders: [1, 2] }),
      function (cb) {
        async.times(100, function (n, next) {
          speak({ order: 1 }, (err, result) => {
            if (err) return cb(err)
            assert.isTrue(_.some(possibleSentences1, (sentence) => {
              return result === sentence
            }), result)
            next()
          })
        }, cb)
      },
      function (cb) {
        async.times(100, function (n, next) {
          speak({ order: 2 }, (err, result) => {
            if (err) return cb(err)
            assert.isTrue(_.some(possibleSentences2, (sentence) => {
              return result === sentence
            }), result)
            next()
          })
        }, cb)
      }
    ]

    async.series(fns, done)
  })

  it('can specify a namespace', (done) => {
    const ns1Text = 'The quick brown fox jumps over the lazy dog.'
    const ns2Text = 'The five boxing wizards jump quickly.'
    const fns = [
      async.apply(redis.flushdb.bind(redis)),
      async.apply(learn, ns1Text, { namespaces: ['ns1'] }),
      async.apply(learn, ns2Text, { namespaces: ['ns2'] }),
      function (cb) {
        speak({ namespace: 'ns1' }, (err, result) => {
          if (err) return cb(err)
          assert.equal(result, ns1Text)
          cb()
        })
      },
      function (cb) {
        speak({ namespace: 'ns2' }, (err, result) => {
          if (err) return cb(err)
          assert.equal(result, ns2Text)
          cb()
        })
      }
    ]
    async.series(fns, done)
  })
})

describe('speakAbout', () => {
  const text = `The cow jumped over the moon.
  This cow thinks it's a dog.
  The quick brown fox jumps over the lazy dog.`

  beforeEach(redis.flushdb.bind(redis))
  beforeEach((cb) => {
    learn(text, { orders: [1, 2, 3] }, cb)
  })

  it('creates a sentence containing a specific word', (done) => {
    const possibleSentences = [
      'The cow jumped over the moon.',
      "This cow thinks it's a dog.",
      "The cow thinks it's a dog.",
      'This cow jumped over the moon.',
      'The cow jumped over the lazy dog.',
      'This cow jumped over the lazy dog.'
    ]
    async.times(100, (n, next) => {
      speakAbout('cow', (err, result) => {
        if (err) return next(err)
        assert.isTrue(_.some(possibleSentences, (sentence) => {
          return result === sentence
        }), result)
        next()
      })
    }, done)
  })
  it('returns null if it is unable to find the specified word', (done) => {
    speakAbout('cat', (err, result) => {
      if (err) return done(err)
      assert.isNull(result)
      done()
    })
  })
  it('uses basic wildcards to attempt to find a match', (done) => {
    const possibleSentences = [
      "This cow thinks it's a dog.",
      "The cow thinks it's a dog."
    ]
    async.times(100, (n, next) => {
      speakAbout('ink', (err, result) => {
        if (err) return done(err)
        assert.isTrue(_.some(possibleSentences, (sentence) => {
          return result === sentence
        }), result)
        next()
      })
    }, done)
  })
  it('uses word stems to attempt to find a match', (done) => {
    const possibleSentences = [
      "This cow thinks it's a dog.",
      "The cow thinks it's a dog."
    ]
    async.times(100, (n, next) => {
      speakAbout('thinking', (err, result) => {
        if (err) return done(err)
        assert.isTrue(_.some(possibleSentences, (sentence) => {
          return result === sentence
        }), result)
        next()
      })
    }, done)
  })
  it('can specify an order', (done) => {
    const possibleSentences = [
      'The cow jumped over the moon.',
      "This cow thinks it's a dog.",
      'This cow jumped over the moon.',
      "The cow thinks it's a dog."
    ]
    async.times(100, (n, next) => {
      speakAbout('cow', { order: 3 }, (err, result) => {
        if (err) return next(err)
        assert.isTrue(_.some(possibleSentences, (sentence) => {
          return result === sentence
        }), result)
        next()
      })
    }, done)
  })
  it('can specify a namespace', (done) => {
    const ns1Text = 'The quick brown fox jumps over the lazy dog.'
    const ns2Text = 'The cow jumped over the moon.'
    const fns = [
      async.apply(redis.flushdb.bind(redis)),
      async.apply(learn, ns1Text, { namespaces: ['ns1'] }),
      async.apply(learn, ns2Text, { namespaces: ['ns2'] }),
      function (cb) {
        async.times(100, (n, next) => {
          speakAbout('fox', { namespace: 'ns1' }, (err, result) => {
            if (err) return next(err)
            assert.equal(result, ns1Text)
            next()
          })
        }, cb)
      },
      function (cb) {
        async.times(100, (n, next) => {
          speakAbout('cow', { namespace: 'ns2' }, (err, result) => {
            if (err) return next(err)
            assert.equal(result, ns2Text)
            next()
          })
        }, cb)
      }
    ]
    async.series(fns, done)
  })
})
