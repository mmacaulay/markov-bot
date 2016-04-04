import async from 'async'
import _ from 'lodash'
import { describe, it, beforeEach } from 'mocha'
import { assert } from 'chai'
import redis from '../../../src/redis'

import db from '../../../src/db/redis'

describe('db/redis', () => {
  let store

  const terms = [{
    text: 'This',
    normal: 'this',
    tag: 'Determiner'
  }, {
    text: 'is',
    normal: 'is',
    tag: 'Noun'
  }, {
    text: 'fantastic',
    normal: 'fantastic',
    tag: 'Adjective'
  }]

  beforeEach((done) => {
    store = db('all', 1)
    redis.flushdb(done)
  })

  describe('storeState', () => {
    it('stores a set of start terms', (done) => {
      async.series([
        async.apply(store.storeState, terms[0], null, { isStartTerm: true }),
        async.apply(store.storeState, terms[1], null, { isStartTerm: false }),
        async.apply(store.storeState, terms[2], null, { isStartTerm: true })
      ], (err) => {
        if (err) return done(err)
        redis.smembers('all:1:__startterms__', (err, results) => {
          if (err) return done(err)
          const terms = _.chain(results)
            .map(JSON.parse)
            .sortBy('text')
            .map('text')
            .value()
          assert.deepEqual(terms, ['This', 'fantastic'])
          done()
        })
      })
    })

    it('stores the normalized term', (done) => {
      store.storeState(terms[0], null, {}, (err) => {
        if (err) return done(err)
        redis.get('all:1:Determiner:this:terms', (err, response) => {
          if (err) return done(err)
          const term = JSON.parse(response)
          assert.equal(term.text, 'This')
          assert.equal(term.normal, 'this')
          assert.equal(term.tag, 'Determiner')
          done()
        })
      })
    })

    it('stores the next states in a sorted set with and without POS tag', (done) => {
      store.storeState(terms[0], terms.slice(1, 3), {}, (err) => {
        if (err) return done(err)
        async.each(['all:1:Determiner:This:chain', 'all:1:This:chain'], (key, cb) => {
          redis.zrevrange(['all:1:Determiner:This:chain', 0, 5, 'WITHSCORES'], (err, response) => {
            if (err) return cb(err)
            const chains = JSON.parse(response[0])
            assert.deepEqual(chains, [
              { text: 'is', normal: 'is', tag: 'Noun' },
              { text: 'fantastic', normal: 'fantastic', tag: 'Adjective' }
            ])
            assert.equal(response[1], '1')
            cb()
          })
        }, done)
      })
    })
  })

  describe('getStartTerm', () => {
    it('retrieves a random start term', (done) => {
      async.series([
        async.apply(store.storeState, terms[0], null, { isStartTerm: true }),
        async.apply(store.storeState, terms[1], null, { isStartTerm: false }),
        async.apply(store.storeState, terms[2], null, { isStartTerm: true })
      ], (err) => {
        if (err) return done(err)
        async.timesSeries(100, (n, next) => {
          store.getStartTerm((err, term) => {
            if (err) return next(err)
            assert.isTrue(term.text === 'This' || term.text === 'fantastic')
            next()
          })
        }, done)
      })
    })
  })

  describe('nextStates', () => {
    it('retrieves a random chain value for a term', (done) => {
      store.storeState(terms[0], terms.slice(1, 3), {}, (err) => {
        if (err) return done(err)
        async.timesSeries(100, (n, next) => {
          store.nextStates(terms[0], (err, states) => {
            if (err) return next(err)
            assert.isTrue(states[0].text === 'is' || states[0].text === 'fantastic')
            next()
          })
        }, done)
      })
    })

    it('returns an empty array if there is no chain', (done) => {
      store.storeState(terms[0], [], {}, (err) => {
        if (err) return done(err)
        store.nextStates(terms[0], (err, states) => {
          if (err) return done(err)
          assert.deepEqual(states, [])
          done()
        })
      })
    })

    it('returns an empty array if the term is not found', (done) => {
      store.storeState(terms[0], [], {}, (err) => {
        if (err) return done(err)
        store.nextStates(terms[1], (err, states) => {
          if (err) return done(err)
          assert.deepEqual(states, [])
          done()
        })
      })
    })
  })
  describe('fuzzyMatch', () => {
    it('searches for a term by text value', (done) => {
      async.series([
        async.apply(store.storeState, terms[0], null, {}),
        async.apply(store.storeState, terms[1], null, {}),
        async.apply(store.storeState, terms[2], null, {}),
        ...['This', 'is', 'fantastic!'].map((text) => {
          return function (cb) {
            store.fuzzyMatch({ text: text }, (err, term) => {
              if (err) return cb(err)
              switch (text) {
                case 'this':
                  assert.equal(term.text, 'This', "didn't match 'This'")
                  break
                case 'IS':
                  assert.equal(term.text, 'is', "didn't match 'is'")
                  break
                case 'fAntASTIC!':
                  assert.equal(term.text, 'fantastic', "didn't match 'fantastic'")
                  break
              }
              cb()
            })
          }
        })
      ], done)
    })
  })
})
