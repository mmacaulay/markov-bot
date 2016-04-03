import async from 'async'
import { describe, it, beforeEach } from 'mocha'
import { assert } from 'chai'

import { createClient } from '../../src/elasticsearch'
import db from '../../src/db.elasticsearch'

describe('db.elasticsearch', () => {
  const esClient = createClient()
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
    esClient.indices.delete({
      index: '_all'
    }, done)
  })

  describe('storeState', () => {
    it('stores terms', (done) => {
      store.storeState(terms[0], terms.slice(1, 2), {}, (err) => {
        if (err) return done(err)
        esClient.get({
          index: 'all-1',
          type: 'term',
          id: `${terms[0].tag}☃${terms[0].text}`
        }, (err, response) => {
          if (err) return done(err)
          assert.isTrue(response.found)
          assert.equal(response._source.text, terms[0].text)
          assert.equal(response._source.normal, terms[0].normal)
          assert.equal(response._source.tag, terms[0].tag)
          done()
        })
      })
    })

    it('tracks a start score for terms', (done) => {
      async.timesSeries(3, (n, next) => {
        store.storeState(terms[0], terms.slice(1, 2), { isStartTerm: true }, (err) => {
          if (err) return next(err)
          esClient.get({
            index: 'all-1',
            type: 'term',
            id: `${terms[0].tag}☃${terms[0].text}`
          }, (err, response) => {
            if (err) return next(err)
            assert.isTrue(response.found)
            assert.equal(response._source.startScore, n + 1)
            next()
          })
        })
      }, done)
    })

    it('tracks an end score for terms', (done) => {
      async.timesSeries(3, (n, next) => {
        store.storeState(terms[0], terms.slice(1, 2), { isEndTerm: true }, (err) => {
          if (err) return next(err)
          esClient.get({
            index: 'all-1',
            type: 'term',
            id: `${terms[0].tag}☃${terms[0].text}`
          }, (err, response) => {
            if (err) return next(err)
            assert.isTrue(response.found)
            assert.equal(response._source.endScore, n + 1)
            next()
          })
        })
      }, done)
    })

    it('tracks an overall score for terms', (done) => {
      async.timesSeries(3, (n, next) => {
        store.storeState(terms[0], terms.slice(1, 2), {}, (err) => {
          if (err) return next(err)
          esClient.get({
            index: 'all-1',
            type: 'term',
            id: `${terms[0].tag}☃${terms[0].text}`
          }, (err, response) => {
            if (err) return next(err)
            assert.isTrue(response.found)
            assert.equal(response._source.overallScore, n + 1)
            next()
          })
        })
      }, done)
    })

    it('creates chains for each next state', (done) => {
      store.storeState(terms[0], terms.slice(1, 2), {}, (err) => {
        if (err) return done(err)
        esClient.get({
          index: 'all-1',
          type: 'term',
          id: `${terms[0].tag}☃${terms[0].text}`
        }, (err, response) => {
          if (err) return done(err)
          assert.isTrue(response.found)
          const chain = response._source.chain
          assert.deepEqual(chain, {
            'Noun☃is': {
              score: 1,
              states: [{
                text: 'is',
                normal: 'is',
                tag: 'Noun'
              }]
            }
          })
          done()
        })
      })
    })

    it('updates scores of chains for each next state', (done) => {
      async.timesSeries(2, (n, next) => {
        store.storeState(terms[0], terms.slice(1, 2), {}, (err) => {
          if (err) return next(err)
          esClient.get({
            index: 'all-1',
            type: 'term',
            id: `${terms[0].tag}☃${terms[0].text}`
          }, (err, response) => {
            if (err) return next(err)
            assert.isTrue(response.found)
            const chain = response._source.chain
            assert.deepEqual(chain, {
              'Noun☃is': {
                score: n + 1,
                states: [{
                  text: 'is',
                  normal: 'is',
                  tag: 'Noun'
                }]
              }
            })
            next()
          })
        })
      }, done)
    })

    it('creates chains for higher order chains', (done) => {
      store = db('all', 2)
      store.storeState(terms[0], terms.slice(1, 3), {}, (err) => {
        if (err) return done(err)
        esClient.get({
          index: 'all-2',
          type: 'term',
          id: `${terms[0].tag}☃${terms[0].text}`
        }, (err, response) => {
          if (err) return done(err)
          assert.isTrue(response.found)
          const chain = response._source.chain
          assert.deepEqual(chain, {
            'Noun☃is❄Adjective☃fantastic': {
              score: 1,
              states: [{
                text: 'is',
                normal: 'is',
                tag: 'Noun'
              }, {
                text: 'fantastic',
                normal: 'fantastic',
                tag: 'Adjective'
              }]
            }
          })
          done()
        })
      })
    })

    it("replaces all instance of '.' with '_' in order to satisfy ES 2.0+ field requirements", (done) => {
      const term = {
        text: 'turtle...',
        normal: 'turtle',
        tag: 'Noun'
      }
      store.storeState(term, [], {}, (err) => {
        if (err) return done(err)
        esClient.get({
          index: 'all-1',
          type: 'term',
          id: 'Noun☃turtle___'
        }, (err, response) => {
          if (err) return done(err)
          assert.isTrue(response.found)
          assert.equal(response._source.text, 'turtle...')
          assert.equal(response._source.normal, 'turtle')
          assert.equal(response._source.tag, 'Noun')
          done()
        })
      })
    })
  })

  describe('getStartTerm', () => {
    it('fetches a random start term with a start score of at least 1', (done) => {
      async.series([
        async.apply(store.storeState, terms[0], null, { isStartTerm: true }),
        async.apply(store.storeState, terms[1], null, { isStartTerm: false }),
        async.apply(store.storeState, terms[2], null, { isStartTerm: true }),
        async.apply(esClient.indices.flush.bind(esClient), { index: 'all-1' }),
        function (cb) {
          async.times(100, (n, next) => {
            store.getStartTerm((err, term) => {
              if (err) return next(err)
              assert.isTrue(term.text === 'This' || term.text === 'fantastic')
              next()
            })
          }, cb)
        }
      ], done)
    })
  })

  describe('nextStates', () => {
    it('looks up a term and selects a random chain value from that term', (done) => {
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
        async.apply(esClient.indices.flush.bind(esClient), { index: 'all-1' }),
        ...['this', 'IS', 'fAntASTIC!'].map((text) => {
          return function (cb) {
            store.fuzzyMatch({ text: text }, (err, term) => {
              if (err) return cb(err)
              switch (text) {
                case 'this':
                  assert.equal(term.text, 'This')
                  break
                case 'IS':
                  assert.equal(term.text, 'is')
                  break
                case 'fAntASTIC!':
                  assert.equal(term.text, 'fantastic')
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
