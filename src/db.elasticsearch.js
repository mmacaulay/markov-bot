import { createClient } from './elasticsearch'
import { weightedRandom } from './math'

const esClient = createClient()

export default function getStore (prefix, order) {
  const index = `${prefix}-${order}`

  function termKey (term) {
    // ES 2.0+ doesn't allow '.' in field names
    return `${term.tag}☃${term.text}`.replace('.', '_')
  }

  function chainKey (terms) {
    return terms.map((term) => {
      return termKey(term)
    }).join('❄')
  }

  function storeState (state, nextStates, opts, callback) {
    esClient.get({
      index: index,
      type: 'term',
      id: termKey(state),
      ignore: [404]
    }, (err, response) => {
      if (err) return callback(err)
      if (response.found) {
        updateTerm(response._source, nextStates, opts, callback)
      } else {
        createTerm(state, nextStates, opts, callback)
      }
    })
  }

  function createTerm (state, nextStates, opts, callback) {
    esClient.create({
      index: index,
      type: 'term',
      id: termKey(state),
      body: Object.assign({}, state, {
        startScore: opts.isStartTerm ? 1 : 0,
        endScore: opts.isEndTerm ? 1 : 0,
        overallScore: 1,
        chain: updateChain({}, nextStates)
      })
    }, callback)
  }

  function updateTerm (state, nextStates, opts, callback) {
    esClient.update({
      index: index,
      type: 'term',
      id: termKey(state),
      body: {
        doc: {
          startScore: opts.isStartTerm ? state.startScore + 1 : state.startScore,
          endScore: opts.isEndTerm ? state.endScore + 1 : state.endScore,
          overallScore: state.overallScore + 1,
          chain: updateChain(state.chain, nextStates)
        }
      }
    }, callback)
  }

  function updateChain (chain, nextStates) {
    if (!nextStates || !nextStates.length) return chain
    const key = chainKey(nextStates)
    if (chain[key]) {
      chain[key].score += 1
    } else {
      chain[key] = { states: nextStates, score: 1 }
    }
    return chain
  }

  function getStartTerm (callback) {
    esClient.search({
      index: index,
      type: 'term',
      size: 1,
      body: {
        query: {
          function_score: {
            query: {
              range: {
                startScore: {
                  gte: 1
                }
              }
            },
            functions: [
              {
                field_value_factor: {
                  field: 'startScore'
                }
              },
              {
                random_score: {}
              }
            ]
          }
        }
      }
    }, function (err, response) {
      if (err) return callback(err)
      const hit = response.hits.hits[0]
      const term = hit ? hit._source : null
      callback(null, term)
    })
  }

  function nextStates (searchTerm, callback) {
    esClient.get({
      index: index,
      type: 'term',
      id: termKey(searchTerm),
      size: 1,
      ignore: [404]
    }, (err, response) => {
      if (err) return callback(err)
      if (!response.found) return callback(null, [])

      const term = response._source
      const chains = Object.keys(term.chain).map((key) => {
        return term.chain[key]
      })
      const chain = weightedRandom(chains)
      callback(null, chain ? chain.states : [])
    })
  }

  function fuzzyMatch (term, callback) {
    esClient.search({
      index: index,
      type: 'term',
      size: 1,
      body: {
        query: {
          function_score: {
            query: {
              match: { text: term.text }
            },
            random_score: {}
          }
        }
      }
    }, (err, response) => {
      if (err) return callback(err)
      if (!response.hits.total) return callback()
      callback(null, response.hits.hits[0]._source)
    })
  }

  return {
    storeState: storeState,
    getStartTerm: getStartTerm,
    nextStates: nextStates,
    fuzzyMatch: fuzzyMatch
  }
}
