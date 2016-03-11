import async from 'async'
import { describe, it, beforeEach } from 'mocha'
import { assert } from 'chai'
import learn from '../../src/learn'
import redis from '../../src/redis'
import _ from 'lodash'
import { assertHasChains } from './helper'

describe('learn', () => {
  const text = "You know what a turtle is? I've never seen a turtle... But I understand what you mean."

  beforeEach(redis.flushdb.bind(redis))
  beforeEach((cb) => {
    learn(text, cb)
  })

  it('tracks a list of start terms', (done) => {
    redis.smembers('all:1:__startterms__', (err, results) => {
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
      key: 'all:1:Person:You:chain',
      terms: ['know'],
      score: '1'
    }, {
      key: 'all:1:Noun:know:chain',
      terms: ['what a'],
      score: '1'
    }, {
      key: 'all:1:Determiner:what a:chain',
      terms: ['turtle'],
      score: '1'
    }, {
      key: 'all:1:Noun:turtle:chain',
      terms: ['is?'],
      score: '1'
    }]

    assertHasChains(chains, done)
  })

  it('stores chains without context', (done) => {
    const chains = [{
      key: 'all:1:You:chain',
      terms: ['know'],
      score: '1'
    }, {
      key: 'all:1:know:chain',
      terms: ['what a'],
      score: '1'
    }, {
      key: 'all:1:what a:chain',
      terms: ['turtle'],
      score: '1'
    }, {
      key: 'all:1:turtle:chain',
      terms: ['is?'],
      score: '1'
    }]

    assertHasChains(chains, done)
  })

  it('uses higher order markov chains', (done) => {
    const chains = [{
      key: 'all:1:Person:You:chain',
      terms: ['know'],
      score: '1'
    }, {
      key: 'all:2:Person:You:chain',
      terms: ['know', 'what a'],
      score: '1'
    }, {
      key: 'all:1:Noun:know:chain',
      terms: ['what a'],
      score: '1'
    }, {
      key: 'all:2:Noun:know:chain',
      terms: ['what a', 'turtle'],
      score: '1'
    }]

    const fns = [
      async.apply(redis.flushdb.bind(redis)),
      async.apply(learn, text, { orders: [1, 2] }),
      async.apply(assertHasChains, chains)
    ]
    async.series(fns, done)
  })

  it('stores chains under multiple namespaces', (done) => {
    const chains = [{
      key: 'all:1:Person:You:chain',
      terms: ['know'],
      score: '1'
    }, {
      key: 'bob:1:Person:You:chain',
      terms: ['know'],
      score: '1'
    }, {
      key: 'apples:1:Person:You:chain',
      terms: ['know'],
      score: '1'
    }, {
      key: 'all:1:Noun:know:chain',
      terms: ['what a'],
      score: '1'
    }, {
      key: 'bob:1:Noun:know:chain',
      terms: ['what a'],
      score: '1'
    }, {
      key: 'apples:1:Noun:know:chain',
      terms: ['what a'],
      score: '1'
    }]

    const fns = [
      async.apply(redis.flushdb.bind(redis)),
      async.apply(learn, text, { namespaces: ['bob', 'apples'] }),
      async.apply(assertHasChains, chains)
    ]
    async.series(fns, done)
  })

  it('stores reverse chains', (done) => {
    const chains = [{
      key: 'reverse:all:1:Copula:is?:chain',
      terms: ['turtle'],
      score: '1'
    }, {
      key: 'reverse:all:1:Noun:turtle:chain',
      terms: ['what a'],
      score: '1'
    }, {
      key: 'reverse:all:1:Determiner:what a:chain',
      terms: ['know'],
      score: '1'
    }, {
      key: 'reverse:all:1:Noun:know:chain',
      terms: ['You'],
      score: '1'
    }]

    assertHasChains(chains, done)
  })
})
