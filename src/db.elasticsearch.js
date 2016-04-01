import { createClient } from './elasticsearch'

const esClient = createClient()
const randomSeed = new Date().getTime()

export default function getStore (prefix, order) {
  const index = `${prefix}-${order}`

  function chainKey (term) {
    return `${term.tag}☃${term.text}`
  }

  function storeState (state, nextStates, opts, callback) {
    esClient.get({
      index: index,
      type: 'term',
      id: state.text,
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
      id: state.text,
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
      id: state.text,
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
    return nextStates.reduce((chain, nextState) => {
      const key = chainKey(nextState)
      if (chain[key]) {
        chain[key].score += 1
      } else {
        chain[key] = Object.assign({}, nextState, { score: 1 })
      }
      return chain
    }, chain)
  }

  function getStartTerm (callback) {
    esClient.search({
      index: index,
      body: {
        query: {
          
        }
      }
    })
  }
  function nextStates (term, callback) {
  }
  function fuzzyMatch (term, callback) {
  }
  return {
    storeState: storeState,
    getStartTerm: getStartTerm,
    nextStates: nextStates,
    fuzzyMatch: fuzzyMatch
  }
}
