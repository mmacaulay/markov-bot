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
          id: terms[0].text
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
            id: terms[0].text
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
            id: terms[0].text
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
            id: terms[0].text
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
          id: terms[0].text
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
            id: terms[0].text
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
          id: terms[0].text
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
})
